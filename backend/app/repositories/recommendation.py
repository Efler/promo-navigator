from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.bundle import Bundle
from app.models.product import Product
from app.models.promocode import Promocode
from app.models.promotion import Promotion
from app.models.promotion_participation import PromotionParticipation
from app.repositories.bundle import list_bundles_for_seller
from app.repositories.product import list_products_for_seller
from app.repositories.promocode import list_promocodes_for_seller
from app.repositories.promotion import (
    list_participations_for_seller,
    list_published_promotions,
)


@dataclass(frozen=True)
class RecommendationSourceData:
    products: list[Product]
    promocodes: list[Promocode]
    bundles: list[Bundle]
    promotions: list[Promotion]
    participations: list[PromotionParticipation]


def load_recommendation_source_data(
    db: Session,
    *,
    seller_id: int,
) -> RecommendationSourceData:
    return RecommendationSourceData(
        products=list_products_for_seller(db, seller_id),
        promocodes=list_promocodes_for_seller(db, seller_id),
        bundles=list_bundles_for_seller(db, seller_id),
        promotions=list_published_promotions(db),
        participations=list_participations_for_seller(db, seller_id),
    )
