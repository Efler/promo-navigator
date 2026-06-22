from __future__ import annotations

import json
import logging
import re
from copy import deepcopy
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal
from statistics import median
from threading import BoundedSemaphore
from typing import Any
from zoneinfo import ZoneInfo

import httpx
from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.product import Product
from app.models.product_item import ProductItem
from app.models.promotion import Promotion
from app.models.seller import Seller
from app.repositories.recommendation import (
    RecommendationSourceData,
    load_recommendation_source_data,
)
from app.schemas.recommendation import (
    MechanicRecommendationResponse,
    OllamaRecommendationOutput,
    RecommendationMechanicCode,
)
from app.services.recommendation_prompt import (
    RECOMMENDATION_RESPONSE_SCHEMA,
    RECOMMENDATION_SYSTEM_PROMPT,
)

logger = logging.getLogger(__name__)

_BUSINESS_TIMEZONE = ZoneInfo("Europe/Moscow")
_OLLAMA_REQUEST_SEMAPHORE = BoundedSemaphore(value=1)
_TECHNICAL_MESSAGE_PATTERN = re.compile(
    r"\b(need|state|ready|true|false|eligibility|json|backend)\b",
    flags=re.IGNORECASE,
)
_SELLER_GOAL_MARKERS = (
    "продаж",
    "продав",
    "продви",
    "товар",
    "покупател",
    "покупк",
    "клиент",
    "аудитори",
    "привлеч",
    "вернуть",
    "лояльн",
    "скид",
    "промокод",
    "акци",
    "охват",
    "показ",
    "видим",
    "узнаваем",
    "поиск",
    "рекомендац",
    "остат",
    "склад",
    "оборач",
    "чек",
    "заказ",
    "комплект",
    "набор",
    "подар",
    "сопутств",
    "ассортимент",
    "выруч",
    "спрос",
    "реализац",
    "конверси",
    "маркетплейс",
    "карточк",
    "позици",
    "бренд",
    "promo",
    "sale",
    "discount",
    "bundle",
    "buyer",
    "stock",
)

_CLARIFICATION_MESSAGE = (
    "Запрос сформулирован недостаточно явно. Опишите цель продвижения: "
    "например, рост охвата, возврат покупателей, распродажу остатков "
    "или увеличение среднего чека."
)

_RECOMMENDATION_FALLBACKS: dict[str, str] = {
    "promotions": (
        "Акции подойдут для расширения охвата и дополнительной видимости "
        "товаров в предложениях маркетплейса."
    ),
    "promocodes": (
        "Промокоды подойдут для адресного предложения и гибкой настройки "
        "скидки для выбранной аудитории."
    ),
    "bundles": (
        "Комплекты подойдут для совместной продажи товаров и стимулирования "
        "покупки нескольких позиций."
    ),
}


class OllamaProtocolError(RuntimeError):
    """Ollama returned a response that does not satisfy the v1 contract."""


def _has_explicit_seller_goal(seller_need: str) -> bool:
    normalized = seller_need.casefold().replace("ё", "е")
    return any(marker in normalized for marker in _SELLER_GOAL_MARKERS)


@dataclass(frozen=True)
class ProductFacts:
    product: Product
    active_items: list[ProductItem]
    stock_qty: int
    effective_prices: list[Decimal]
    bad_turnover: bool

    @property
    def in_stock(self) -> bool:
        return bool(self.active_items) and self.stock_qty > 0


def _current_business_date() -> date:
    return datetime.now(_BUSINESS_TIMEZONE).date()


def _generated_at() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _effective_price(item: ProductItem) -> Decimal:
    if item.club_discounted_price is not None:
        return item.club_discounted_price
    if item.discounted_price is not None:
        return item.discounted_price
    return item.price


def _rounded(value: Decimal | float | int | None, digits: int = 2) -> float | None:
    if value is None:
        return None
    return round(float(value), digits)


def _share(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0.0
    return round(numerator / denominator, 4)


def _median(values: list[int] | list[Decimal]) -> float | None:
    if not values:
        return None
    return _rounded(median(values))


def _build_product_facts(products: list[Product]) -> list[ProductFacts]:
    facts: list[ProductFacts] = []
    for product in products:
        if not product.is_active:
            continue
        active_items = [item for item in product.items if item.is_active]
        facts.append(
            ProductFacts(
                product=product,
                active_items=active_items,
                stock_qty=sum(item.stock_qty for item in active_items),
                effective_prices=[_effective_price(item) for item in active_items],
                bad_turnover=any(item.is_bad_turnover for item in active_items),
            )
        )
    return facts


def _build_inventory(
    products: list[Product],
    product_facts: list[ProductFacts],
) -> dict[str, Any]:
    active_items = [
        item
        for facts in product_facts
        for item in facts.active_items
    ]
    product_stocks = [facts.stock_qty for facts in product_facts]
    return {
        "products": {
            "total": len(products),
            "active": len(product_facts),
            "inactive": len(products) - len(product_facts),
            "in_stock": sum(facts.in_stock for facts in product_facts),
            "out_of_stock": sum(not facts.in_stock for facts in product_facts),
        },
        "items": {
            "active": len(active_items),
            "bad_turnover": sum(item.is_bad_turnover for item in active_items),
        },
        "stock": {
            "total": sum(product_stocks),
            "min": min(product_stocks) if product_stocks else None,
            "median": _median(product_stocks),
            "max": max(product_stocks) if product_stocks else None,
        },
        "multi_item_products": sum(
            len(facts.active_items) > 1 for facts in product_facts
        ),
        "editable_size_price_products": sum(
            any(item.editable_size_price for item in facts.active_items)
            for facts in product_facts
        ),
        "kiz_products": sum(facts.product.kiz_marked for facts in product_facts),
        "bad_turnover_products": sum(
            facts.bad_turnover for facts in product_facts
        ),
    }


def _build_pricing(product_facts: list[ProductFacts]) -> dict[str, Any]:
    active_items = [
        item
        for facts in product_facts
        for item in facts.active_items
    ]
    effective_prices = [_effective_price(item) for item in active_items]
    base_prices = [item.price for item in active_items]
    discounted_count = sum(
        _effective_price(item) < item.price for item in active_items
    )
    full_price_count = len(active_items) - discounted_count

    return {
        "effective": {
            "min": _rounded(min(effective_prices)) if effective_prices else None,
            "median": _median(effective_prices),
            "max": _rounded(max(effective_prices)) if effective_prices else None,
            "avg": (
                _rounded(sum(effective_prices) / len(effective_prices))
                if effective_prices
                else None
            ),
        },
        "base_avg": (
            _rounded(sum(base_prices) / len(base_prices))
            if base_prices
            else None
        ),
        "discount": {
            "avg": (
                round(
                    sum(item.discount_percent for item in active_items)
                    / len(active_items),
                    1,
                )
                if active_items
                else None
            ),
            "max": (
                max(item.discount_percent for item in active_items)
                if active_items
                else None
            ),
        },
        "club_discount": {
            "avg": (
                round(
                    sum(item.club_discount_percent for item in active_items)
                    / len(active_items),
                    1,
                )
                if active_items
                else None
            ),
            "max": (
                max(item.club_discount_percent for item in active_items)
                if active_items
                else None
            ),
        },
        "discounted": {
            "count": discounted_count,
            "share": _share(discounted_count, len(active_items)),
        },
        "full_price": {
            "count": full_price_count,
            "share": _share(full_price_count, len(active_items)),
        },
    }


def _build_category_summaries(
    product_facts: list[ProductFacts],
) -> list[dict[str, Any]]:
    groups: dict[int, list[ProductFacts]] = {}
    names: dict[int, str] = {}
    for facts in product_facts:
        parent_id = facts.product.parent_id
        if parent_id is None:
            continue
        groups.setdefault(parent_id, []).append(facts)
        names[parent_id] = facts.product.parent_name or f"Категория {parent_id}"

    summaries: list[dict[str, Any]] = []
    for parent_id, group in groups.items():
        prices = [
            price
            for facts in group
            for price in facts.effective_prices
        ]
        summaries.append(
            {
                "name": names[parent_id],
                "products": len(group),
                "in_stock": sum(facts.in_stock for facts in group),
                "stock": sum(facts.stock_qty for facts in group),
                "median_price": _median(prices),
                "bad_turnover": sum(facts.bad_turnover for facts in group),
            }
        )

    return sorted(
        summaries,
        key=lambda summary: (
            -summary["products"],
            -summary["stock"],
            summary["name"],
        ),
    )[:3]


def _build_subject_summaries(
    product_facts: list[ProductFacts],
) -> list[dict[str, Any]]:
    groups: dict[int, list[ProductFacts]] = {}
    names: dict[int, str] = {}
    for facts in product_facts:
        subject_id = facts.product.subject_id
        if subject_id is None:
            continue
        groups.setdefault(subject_id, []).append(facts)
        names[subject_id] = facts.product.subject_name or f"Тип {subject_id}"

    summaries = [
        {
            "name": names[subject_id],
            "products": len(group),
            "stock": sum(facts.stock_qty for facts in group),
        }
        for subject_id, group in groups.items()
    ]
    return sorted(
        summaries,
        key=lambda summary: (
            -summary["products"],
            -summary["stock"],
            summary["name"],
        ),
    )[:3]


def _select_product_examples(
    product_facts: list[ProductFacts],
) -> list[ProductFacts]:
    candidates = sorted(
        (facts for facts in product_facts if facts.in_stock),
        key=lambda facts: (
            not facts.bad_turnover,
            -facts.stock_qty,
            facts.product.id,
        ),
    )
    selected: list[ProductFacts] = []
    selected_ids: set[int] = set()
    seen_categories: set[int | None] = set()

    for facts in candidates:
        category = facts.product.parent_id
        if category in seen_categories:
            continue
        selected.append(facts)
        selected_ids.add(facts.product.id)
        seen_categories.add(category)
        if len(selected) == 3:
            return selected

    for facts in candidates:
        if facts.product.id in selected_ids:
            continue
        selected.append(facts)
        if len(selected) == 3:
            break

    return selected


def _build_assortment(product_facts: list[ProductFacts]) -> dict[str, Any]:
    parent_ids = {
        facts.product.parent_id
        for facts in product_facts
        if facts.product.parent_id is not None
    }
    subject_ids = {
        facts.product.subject_id
        for facts in product_facts
        if facts.product.subject_id is not None
    }
    brands = {
        facts.product.brand
        for facts in product_facts
        if facts.product.brand
    }

    examples = []
    for facts in _select_product_examples(product_facts):
        prices = facts.effective_prices
        examples.append(
            {
                "title": facts.product.title,
                "category": facts.product.parent_name,
                "subject": facts.product.subject_name,
                "brand": facts.product.brand,
                "items": len(facts.active_items),
                "stock": facts.stock_qty,
                "price_min": _rounded(min(prices)) if prices else None,
                "price_max": _rounded(max(prices)) if prices else None,
                "bad_turnover": facts.bad_turnover,
                "kiz": facts.product.kiz_marked,
            }
        )

    return {
        "category_count": len(parent_ids),
        "subject_count": len(subject_ids),
        "brand_count": len(brands),
        "categories": _build_category_summaries(product_facts),
        "subjects": _build_subject_summaries(product_facts),
        "products": examples,
    }


def _promocode_status(starts_on: date, ends_on: date, today: date) -> str:
    if ends_on < today:
        return "expired"
    if starts_on > today:
        return "scheduled"
    return "active"


def _bundle_status(starts_on: date, ends_on: date, today: date) -> str:
    if ends_on < today:
        return "expired"
    if starts_on > today:
        return "planned"
    return "active"


def _participation_status(
    starts_on: date,
    ends_on: date,
    today: date,
) -> str:
    if ends_on < today:
        return "completed"
    if starts_on > today:
        return "scheduled"
    return "active"


def _build_usage(
    source: RecommendationSourceData,
    *,
    active_product_ids: set[int],
    today: date,
) -> dict[str, Any]:
    promocode_counts = {"scheduled": 0, "active": 0, "expired": 0}
    active_promocode_products: set[int] = set()
    for promocode in source.promocodes:
        resolved_status = _promocode_status(
            promocode.starts_on,
            promocode.ends_on,
            today,
        )
        promocode_counts[resolved_status] += 1
        if resolved_status != "active":
            continue
        if promocode.product_scope == "all":
            active_promocode_products.update(active_product_ids)
        else:
            active_promocode_products.update(
                link.product_id
                for link in promocode.product_links
                if link.product_id in active_product_ids
            )

    bundle_counts = {"planned": 0, "active": 0, "expired": 0}
    active_bundle_products: set[int] = set()
    for bundle in source.bundles:
        resolved_status = _bundle_status(
            bundle.starts_on,
            bundle.ends_on,
            today,
        )
        bundle_counts[resolved_status] += 1
        if resolved_status != "active":
            continue
        if bundle.product_scope == "all":
            active_bundle_products.update(active_product_ids)
        else:
            active_bundle_products.update(
                link.product_id
                for link in bundle.product_links
                if link.product_id in active_product_ids
            )

    participation_counts = {"scheduled": 0, "active": 0, "completed": 0}
    active_promotion_products: set[int] = set()
    for participation in source.participations:
        promotion = participation.promotion
        resolved_status = _participation_status(
            promotion.starts_on,
            promotion.ends_on,
            today,
        )
        participation_counts[resolved_status] += 1
        if resolved_status == "active":
            active_promotion_products.update(
                link.product_id
                for link in participation.product_links
                if link.product_id in active_product_ids
            )

    overlap_products = sum(
        sum(
            product_id in product_set
            for product_set in (
                active_promocode_products,
                active_bundle_products,
                active_promotion_products,
            )
        )
        >= 2
        for product_id in active_product_ids
    )

    return {
        "promocodes": {
            **promocode_counts,
            "covered_products": len(active_promocode_products),
            "total": len(source.promocodes),
        },
        "bundles": {
            **bundle_counts,
            "covered_products": len(active_bundle_products),
            "total": len(source.bundles),
        },
        "promotions": {
            **participation_counts,
            "covered_products": len(active_promotion_products),
            "total": len(source.participations),
        },
        "overlap_products": overlap_products,
    }


def _promotion_status(promotion: Promotion, today: date) -> str:
    if promotion.ends_on < today:
        return "closed"
    if promotion.starts_on > today:
        return "upcoming"
    if (promotion.ends_on - today).days <= 3:
        return "ending_soon"
    return "active"


def _build_promotion_market(
    source: RecommendationSourceData,
    *,
    product_facts: list[ProductFacts],
    today: date,
) -> dict[str, Any]:
    joined_promotion_ids = {
        participation.promotion_id for participation in source.participations
    }
    opportunities: list[dict[str, Any]] = []

    for promotion in source.promotions:
        if not promotion.is_published or promotion.ends_on < today:
            continue

        eligible_parent_ids = {
            category.parent_id for category in promotion.categories
        }
        eligible_category_names = [
            category.parent_name
            for category in sorted(
                promotion.categories,
                key=lambda category: category.parent_id,
            )
        ]
        eligible_products = [
            facts
            for facts in product_facts
            if facts.active_items
            and facts.stock_qty >= promotion.minimum_stock_qty
            and (
                promotion.category_scope == "all"
                or facts.product.parent_id in eligible_parent_ids
            )
        ]
        join_open = (
            today <= promotion.join_deadline
            and today <= promotion.ends_on
        )
        requirements_met = len(eligible_products) >= promotion.minimum_products
        already_joined = promotion.id in joined_promotion_ids
        opportunities.append(
            {
                "title": promotion.title,
                "status": _promotion_status(promotion, today),
                "join_open": join_open,
                "start_days": (promotion.starts_on - today).days,
                "deadline_days": (promotion.join_deadline - today).days,
                "min_discount": promotion.minimum_discount_percent,
                "min_stock": promotion.minimum_stock_qty,
                "min_products": promotion.minimum_products,
                "eligible_products": len(eligible_products),
                "requirements_met": requirements_met,
                "already_joined": already_joined,
                "categories": (
                    eligible_category_names[:3]
                    if promotion.category_scope == "selected"
                    else None
                ),
                "category_count": (
                    len(eligible_category_names)
                    if promotion.category_scope == "selected"
                    else None
                ),
                "benefits": [
                    benefit.description
                    for benefit in sorted(
                        promotion.benefits,
                        key=lambda benefit: benefit.position,
                    )[:2]
                ],
                "_sort": (
                    not join_open,
                    not requirements_met,
                    already_joined,
                    promotion.join_deadline,
                    promotion.id,
                ),
            }
        )

    joinable = sum(opportunity["join_open"] for opportunity in opportunities)
    inventory_eligible = sum(
        opportunity["join_open"] and opportunity["requirements_met"]
        for opportunity in opportunities
    )
    already_joined = sum(
        opportunity["join_open"] and opportunity["already_joined"]
        for opportunity in opportunities
    )
    ordered = sorted(opportunities, key=lambda opportunity: opportunity["_sort"])
    best = []
    if ordered:
        opportunity = dict(ordered[0])
        opportunity.pop("_sort")
        best.append(opportunity)

    return {
        "joinable": joinable,
        "eligible": inventory_eligible,
        "already_joined": already_joined,
        "opportunities": best,
    }


def build_seller_recommendation_state(
    db: Session,
    *,
    seller_id: int,
) -> dict[str, Any]:
    source = load_recommendation_source_data(db, seller_id=seller_id)
    today = _current_business_date()
    product_facts = _build_product_facts(source.products)
    active_product_ids = {
        facts.product.id for facts in product_facts
    }
    active_items = [
        item
        for facts in product_facts
        for item in facts.active_items
    ]
    categories_with_two_in_stock: dict[int, int] = {}
    for facts in product_facts:
        if not facts.in_stock or facts.product.parent_id is None:
            continue
        categories_with_two_in_stock[facts.product.parent_id] = (
            categories_with_two_in_stock.get(facts.product.parent_id, 0) + 1
        )

    in_stock_parent_ids = {
        facts.product.parent_id
        for facts in product_facts
        if facts.in_stock and facts.product.parent_id is not None
    }

    return {
        "at": _generated_at(),
        "date": today.isoformat(),
        "currencies": sorted(
            {item.currency_code for item in active_items}
        ),
        "inventory": _build_inventory(source.products, product_facts),
        "pricing": _build_pricing(product_facts),
        "assortment": _build_assortment(product_facts),
        "usage": _build_usage(
            source,
            active_product_ids=active_product_ids,
            today=today,
        ),
        "ready": {
            "promocode": any(facts.in_stock for facts in product_facts),
            "bundle": sum(facts.in_stock for facts in product_facts) >= 2,
            "same_category_groups": sum(
                count >= 2 for count in categories_with_two_in_stock.values()
            ),
            "cross_category": len(in_stock_parent_ids) >= 2,
            "bad_turnover_products": sum(
                facts.in_stock and facts.bad_turnover
                for facts in product_facts
            ),
        },
        "market": _build_promotion_market(
            source,
            product_facts=product_facts,
            today=today,
        ),
    }


def _serialize_user_message(
    *,
    seller_need: str,
    state: dict[str, Any],
) -> str:
    compact_state = deepcopy(state)

    def serialize() -> str:
        return json.dumps(
            {"need": seller_need, "state": compact_state},
            ensure_ascii=False,
            separators=(",", ":"),
        )

    content = serialize()
    trim_paths = (
        ("assortment", "products"),
        ("assortment", "subjects"),
        ("assortment", "categories"),
    )
    while len(content) > settings.OLLAMA_USER_MESSAGE_MAX_CHARS:
        trimmed = False
        for parent_key, list_key in trim_paths:
            values = compact_state[parent_key][list_key]
            if values:
                values.pop()
                trimmed = True
                content = serialize()
                break
        if not trimmed:
            break

    if len(content) > settings.OLLAMA_USER_MESSAGE_MAX_CHARS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Seller context is too large for mechanic recommendation.",
        )
    return content


def build_ollama_payload(
    *,
    seller_need: str,
    state: dict[str, Any],
) -> dict[str, Any]:
    return {
        "model": settings.OLLAMA_MODEL,
        "stream": False,
        "think": False,
        "keep_alive": settings.OLLAMA_KEEP_ALIVE,
        "messages": [
            {
                "role": "system",
                "content": RECOMMENDATION_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": _serialize_user_message(
                    seller_need=seller_need,
                    state=state,
                ),
            },
        ],
        "format": RECOMMENDATION_RESPONSE_SCHEMA,
        "options": {
            "num_ctx": settings.OLLAMA_NUM_CTX,
            "num_predict": settings.OLLAMA_NUM_PREDICT,
            "temperature": settings.OLLAMA_TEMPERATURE,
            "seed": settings.OLLAMA_SEED,
        },
    }


def _request_ollama_output(
    payload: dict[str, Any],
) -> OllamaRecommendationOutput:
    timeout = httpx.Timeout(
        settings.OLLAMA_READ_TIMEOUT_SECONDS,
        connect=settings.OLLAMA_CONNECT_TIMEOUT_SECONDS,
        read=settings.OLLAMA_READ_TIMEOUT_SECONDS,
        write=settings.OLLAMA_CONNECT_TIMEOUT_SECONDS,
        pool=settings.OLLAMA_QUEUE_WAIT_TIMEOUT_SECONDS,
    )
    request_body = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")

    try:
        with httpx.Client(timeout=timeout, trust_env=False) as client:
            response = client.post(
                f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat",
                content=request_body,
                headers={"Content-Type": "application/json; charset=utf-8"},
            )
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Mechanic recommendation timed out.",
        ) from exc
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "Ollama returned HTTP %s.",
            exc.response.status_code,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Mechanic recommendation service returned an error.",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Mechanic recommendation service is unavailable.",
        ) from exc

    try:
        response_data = response.json()
    except ValueError as exc:
        raise OllamaProtocolError("Ollama response is not JSON.") from exc

    if not isinstance(response_data, dict):
        raise OllamaProtocolError("Ollama response root is not an object.")
    if response_data.get("done") is not True:
        raise OllamaProtocolError("Ollama response is incomplete.")
    if response_data.get("done_reason") not in {None, "stop"}:
        raise OllamaProtocolError("Ollama response ended unexpectedly.")

    message = response_data.get("message")
    if not isinstance(message, dict) or not isinstance(message.get("content"), str):
        raise OllamaProtocolError("Ollama response has no message content.")

    try:
        output = OllamaRecommendationOutput.model_validate_json(
            message["content"]
        )
    except ValidationError as exc:
        raise OllamaProtocolError(
            "Ollama structured output is invalid."
        ) from exc

    valid_pair = (
        output.result_type == "recommendation"
        and output.mechanic_code in {"promotions", "promocodes", "bundles"}
    ) or (
        output.result_type == "clarification_required"
        and output.mechanic_code == "none"
    )
    if not valid_pair:
        raise OllamaProtocolError(
            "Ollama result type and mechanic code are inconsistent."
        )
    return output


def _is_valid_recommendation_message(
    message: str,
    mechanic_code: RecommendationMechanicCode,
) -> bool:
    normalized = message.strip()
    expected_prefixes = {
        "promotions": "Акции подойдут",
        "promocodes": "Промокоды подойдут",
        "bundles": "Комплекты подойдут",
    }
    expected_prefix = expected_prefixes.get(mechanic_code)
    return bool(
        expected_prefix
        and 20 <= len(normalized) <= 240
        and normalized.startswith(expected_prefix)
        and normalized.endswith((".", "!", "?"))
        and not _TECHNICAL_MESSAGE_PATTERN.search(normalized)
        and "```" not in normalized
        and "<" not in normalized
        and ">" not in normalized
    )


def _build_api_response(
    output: OllamaRecommendationOutput,
) -> MechanicRecommendationResponse:
    if output.result_type == "clarification_required":
        return MechanicRecommendationResponse(
            result_type="clarification_required",
            mechanic_code="none",
            message=_CLARIFICATION_MESSAGE,
        )

    if _is_valid_recommendation_message(
        output.message,
        output.mechanic_code,
    ):
        message = output.message.strip()
    else:
        message = _RECOMMENDATION_FALLBACKS[output.mechanic_code]

    return MechanicRecommendationResponse(
        result_type="recommendation",
        mechanic_code=output.mechanic_code,
        message=message,
    )


def recommend_mechanic(
    db: Session,
    *,
    seller: Seller,
    seller_need: str,
) -> MechanicRecommendationResponse:
    if not _has_explicit_seller_goal(seller_need):
        return MechanicRecommendationResponse(
            result_type="clarification_required",
            mechanic_code="none",
            message=_CLARIFICATION_MESSAGE,
        )

    state = build_seller_recommendation_state(db, seller_id=seller.id)
    payload = build_ollama_payload(
        seller_need=seller_need,
        state=state,
    )

    acquired = _OLLAMA_REQUEST_SEMAPHORE.acquire(
        timeout=settings.OLLAMA_QUEUE_WAIT_TIMEOUT_SECONDS
    )
    if not acquired:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Mechanic recommendation service is busy.",
        )

    try:
        last_error: OllamaProtocolError | None = None
        for attempt in range(2):
            try:
                output = _request_ollama_output(payload)
                return _build_api_response(output)
            except OllamaProtocolError as exc:
                last_error = exc
                logger.warning(
                    "Invalid Ollama response on attempt %s: %s",
                    attempt + 1,
                    exc,
                )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Mechanic recommendation service returned an invalid response.",
        ) from last_error
    finally:
        _OLLAMA_REQUEST_SEMAPHORE.release()
