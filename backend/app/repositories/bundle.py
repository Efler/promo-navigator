from __future__ import annotations

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.models.bundle import Bundle
from app.models.bundle_product import BundleProduct


def add_bundle(db: Session, bundle: Bundle) -> Bundle:
    db.add(bundle)
    return bundle


def list_bundles_for_seller(db: Session, seller_id: int) -> list[Bundle]:
    statement: Select[tuple[Bundle]] = (
        select(Bundle)
        .where(Bundle.seller_id == seller_id)
        .options(selectinload(Bundle.product_links).selectinload(BundleProduct.product))
        .order_by(Bundle.created_at.desc(), Bundle.id.desc())
    )
    return list(db.execute(statement).scalars().all())
