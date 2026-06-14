from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.bundle import Bundle
    from app.models.product import Product


class BundleProduct(Base):
    __tablename__ = "bundle_products"
    __table_args__ = (
        CheckConstraint("role in ('eligible', 'pair_x', 'pair_y')", name="chk_bundle_products_role"),
    )

    bundle_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("bundles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    product_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("products.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(16), default="eligible", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    bundle: Mapped["Bundle"] = relationship(back_populates="product_links")
    product: Mapped["Product"] = relationship(back_populates="bundle_links")
