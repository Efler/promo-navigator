from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, Date, ForeignKey, Integer, Numeric, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.bundle_product import BundleProduct
    from app.models.seller import Seller


class Bundle(TimestampMixin, Base):
    __tablename__ = "bundles"
    __table_args__ = (
        CheckConstraint("length(btrim(title)) > 0", name="chk_bundles_title_not_blank"),
        CheckConstraint("ends_on >= starts_on", name="chk_bundles_dates_order"),
        CheckConstraint(
            "benefit_type in ('gift_item', 'order_discount', 'fixed_price', 'step_discount', 'pair_discount')",
            name="chk_bundles_benefit_type",
        ),
        CheckConstraint(
            "audience_type in ('all', 'bought_last_half_year', 'not_bought_last_half_year')",
            name="chk_bundles_audience_type",
        ),
        CheckConstraint(
            "product_scope in ('all', 'selected', 'pair')",
            name="chk_bundles_product_scope",
        ),
        CheckConstraint(
            "("
            "(benefit_type = 'pair_discount' and product_scope = 'pair')"
            " or "
            "(benefit_type <> 'pair_discount' and product_scope in ('all', 'selected'))"
            ")",
            name="chk_bundles_product_scope_matches_benefit",
        ),
        CheckConstraint(
            "("
            "(benefit_type = 'gift_item' and buy_quantity >= 1 and gift_quantity >= 1 "
            "and order_discount_percent is null and fixed_price is null "
            "and step_start_position is null and step_discount_percent is null "
            "and pair_discount_percent is null)"
            " or "
            "(benefit_type = 'order_discount' and buy_quantity >= 1 "
            "and order_discount_percent between 1 and 99 and gift_quantity is null "
            "and fixed_price is null and step_start_position is null "
            "and step_discount_percent is null and pair_discount_percent is null)"
            " or "
            "(benefit_type = 'fixed_price' and buy_quantity >= 1 and fixed_price > 0 "
            "and gift_quantity is null and order_discount_percent is null "
            "and step_start_position is null and step_discount_percent is null "
            "and pair_discount_percent is null)"
            " or "
            "(benefit_type = 'step_discount' and buy_quantity >= 2 "
            "and step_start_position between 2 and buy_quantity "
            "and step_discount_percent between 1 and 99 and gift_quantity is null "
            "and order_discount_percent is null and fixed_price is null "
            "and pair_discount_percent is null)"
            " or "
            "(benefit_type = 'pair_discount' and pair_discount_percent between 1 and 99 "
            "and buy_quantity is null and gift_quantity is null "
            "and order_discount_percent is null and fixed_price is null "
            "and step_start_position is null and step_discount_percent is null)"
            ")",
            name="chk_bundles_benefit_params",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    seller_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("sellers.id", ondelete="CASCADE"),
        index=True,
    )
    title: Mapped[str] = mapped_column(String(60))
    starts_on: Mapped[date] = mapped_column(Date, index=True)
    ends_on: Mapped[date] = mapped_column(Date, index=True)
    benefit_type: Mapped[str] = mapped_column(String(32), index=True)
    audience_type: Mapped[str] = mapped_column(String(40), index=True)
    product_scope: Mapped[str] = mapped_column(String(16), index=True)
    buy_quantity: Mapped[int | None] = mapped_column(Integer)
    gift_quantity: Mapped[int | None] = mapped_column(Integer)
    order_discount_percent: Mapped[int | None] = mapped_column(SmallInteger)
    fixed_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    step_start_position: Mapped[int | None] = mapped_column(Integer)
    step_discount_percent: Mapped[int | None] = mapped_column(SmallInteger)
    pair_discount_percent: Mapped[int | None] = mapped_column(SmallInteger)

    seller: Mapped["Seller"] = relationship(back_populates="bundles")
    product_links: Mapped[list["BundleProduct"]] = relationship(
        back_populates="bundle",
        cascade="all, delete-orphan",
    )
