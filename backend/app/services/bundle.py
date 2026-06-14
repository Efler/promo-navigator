from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.bundle import Bundle
from app.models.bundle_product import BundleProduct
from app.models.product import Product
from app.models.seller import Seller
from app.repositories.bundle import add_bundle, list_bundles_for_seller
from app.repositories.product import list_products_for_seller_by_ids
from app.schemas.bundle import (
    BundleCreate,
    BundleListItem,
    BundleProductSummary,
    BundleRead,
    BundleStatus,
)

_BUSINESS_TIMEZONE = ZoneInfo("Europe/Moscow")


def _current_business_date() -> date:
    return datetime.now(_BUSINESS_TIMEZONE).date()


def _resolve_bundle_status(bundle: Bundle) -> BundleStatus:
    today = _current_business_date()
    if bundle.ends_on < today:
        return "expired"
    if bundle.starts_on > today:
        return "planned"
    return "active"


def _format_money(value: Decimal | None) -> str:
    if value is None:
        return "0 ₽"
    return f"{int(value):,}".replace(",", " ") + " ₽"


def _build_benefit_label(bundle: Bundle) -> str:
    if bundle.benefit_type == "gift_item":
        return f"Купить {bundle.buy_quantity} шт., получить {bundle.gift_quantity} шт. в подарок"
    if bundle.benefit_type == "order_discount":
        return f"Купить от {bundle.buy_quantity} шт. и получить скидку {bundle.order_discount_percent}%"
    if bundle.benefit_type == "fixed_price":
        return f"Купить {bundle.buy_quantity} шт. по цене {_format_money(bundle.fixed_price)}"
    if bundle.benefit_type == "step_discount":
        return (
            f"Скидка {bundle.step_discount_percent}% с {bundle.step_start_position}-го товара "
            f"при покупке от {bundle.buy_quantity} шт."
        )
    return f"Скидка {bundle.pair_discount_percent}% при покупке пары товаров"


def _build_product_summaries(bundle: Bundle) -> list[BundleProductSummary]:
    return [
        BundleProductSummary(
            id=link.product_id,
            title=link.product.title if link.product else f"Товар #{link.product_id}",
            role=link.role,
        )
        for link in sorted(bundle.product_links, key=lambda link: (link.role, link.product_id))
    ]


def _build_bundle_read(bundle: Bundle) -> BundleRead:
    product_summaries = _build_product_summaries(bundle)
    return BundleRead(
        id=bundle.id,
        seller_id=bundle.seller_id,
        title=bundle.title,
        starts_on=bundle.starts_on,
        ends_on=bundle.ends_on,
        benefit_type=bundle.benefit_type,
        benefit_label=_build_benefit_label(bundle),
        audience_type=bundle.audience_type,
        product_scope=bundle.product_scope,
        buy_quantity=bundle.buy_quantity,
        gift_quantity=bundle.gift_quantity,
        order_discount_percent=bundle.order_discount_percent,
        fixed_price=bundle.fixed_price,
        step_start_position=bundle.step_start_position,
        step_discount_percent=bundle.step_discount_percent,
        pair_discount_percent=bundle.pair_discount_percent,
        selected_product_ids=[product.id for product in product_summaries if product.role == "eligible"],
        products=product_summaries,
        status=_resolve_bundle_status(bundle),
        created_at=bundle.created_at,
        updated_at=bundle.updated_at,
    )


def _build_bundle_list_item(bundle: Bundle) -> BundleListItem:
    bundle_read = _build_bundle_read(bundle)
    return BundleListItem(
        id=bundle_read.id,
        title=bundle_read.title,
        starts_on=bundle_read.starts_on,
        ends_on=bundle_read.ends_on,
        benefit_type=bundle_read.benefit_type,
        benefit_label=bundle_read.benefit_label,
        audience_type=bundle_read.audience_type,
        product_scope=bundle_read.product_scope,
        selected_product_ids=bundle_read.selected_product_ids,
        products=bundle_read.products,
        status=bundle_read.status,
        created_at=bundle_read.created_at,
    )


def validate_bundle_dates(payload: BundleCreate) -> None:
    today = _current_business_date()
    tomorrow = date.fromordinal(today.toordinal() + 1)

    if payload.starts_on < tomorrow:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bundle start date must not be earlier than the next day.",
        )


def _load_selected_products(db: Session, *, seller_id: int, product_ids: list[int]) -> list[Product]:
    products = list_products_for_seller_by_ids(db, seller_id=seller_id, product_ids=product_ids)
    if len(products) != len(product_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more selected products are unavailable for this seller.",
        )

    products_by_id = {product.id: product for product in products}
    return [products_by_id[product_id] for product_id in product_ids]


def list_seller_bundles(db: Session, *, seller: Seller) -> list[BundleListItem]:
    return [_build_bundle_list_item(bundle) for bundle in list_bundles_for_seller(db, seller.id)]


def create_bundle(
    db: Session,
    *,
    seller: Seller,
    payload: BundleCreate,
) -> BundleRead:
    validate_bundle_dates(payload)

    product_links: list[BundleProduct] = []
    if payload.product_scope == "selected":
        selected_products = _load_selected_products(
            db,
            seller_id=seller.id,
            product_ids=payload.selected_product_ids,
        )
        product_links = [BundleProduct(product_id=product.id, role="eligible") for product in selected_products]
    elif payload.product_scope == "pair":
        pair_product_ids = [payload.pair_product_x_id, payload.pair_product_y_id]
        if not all(pair_product_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both pair products are required.",
            )
        pair_products = _load_selected_products(
            db,
            seller_id=seller.id,
            product_ids=[int(product_id) for product_id in pair_product_ids],
        )
        product_links = [
            BundleProduct(product_id=pair_products[0].id, role="pair_x"),
            BundleProduct(product_id=pair_products[1].id, role="pair_y"),
        ]

    bundle = Bundle(
        seller_id=seller.id,
        title=payload.title,
        starts_on=payload.starts_on,
        ends_on=payload.ends_on,
        benefit_type=payload.benefit_type,
        audience_type=payload.audience_type,
        product_scope=payload.product_scope,
        buy_quantity=payload.buy_quantity,
        gift_quantity=payload.gift_quantity,
        order_discount_percent=payload.order_discount_percent,
        fixed_price=Decimal(payload.fixed_price) if payload.fixed_price is not None else None,
        step_start_position=payload.step_start_position,
        step_discount_percent=payload.step_discount_percent,
        pair_discount_percent=payload.pair_discount_percent,
        product_links=product_links,
    )

    add_bundle(db, bundle)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bundle conflicts with an existing record.",
        ) from exc

    db.refresh(bundle)
    return _build_bundle_read(bundle)
