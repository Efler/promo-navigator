from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.bundle_product import BundleProduct
    from app.models.product_item import ProductItem
    from app.models.promocode_product import PromocodeProduct
    from app.models.seller import Seller


class Product(TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("seller_id", "vendor_code", name="uq_products_seller_vendor_code"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    seller_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("sellers.id", ondelete="CASCADE"),
        index=True,
    )
    nm_id: Mapped[int | None] = mapped_column(BigInteger, unique=True)
    imt_id: Mapped[int | None] = mapped_column(BigInteger)
    vendor_code: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(255))
    brand: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    subject_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    subject_name: Mapped[str | None] = mapped_column(String(255))
    parent_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    parent_name: Mapped[str | None] = mapped_column(String(255))
    kiz_marked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    main_photo_url: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    seller: Mapped["Seller"] = relationship(back_populates="products")
    items: Mapped[list["ProductItem"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductItem.id",
    )
    promocode_links: Mapped[list["PromocodeProduct"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
    )
    bundle_links: Mapped[list["BundleProduct"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
    )
