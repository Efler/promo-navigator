from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

BundleBenefitType = Literal[
    "gift_item",
    "order_discount",
    "fixed_price",
    "step_discount",
    "pair_discount",
]
BundleAudienceType = Literal[
    "all",
    "bought_last_half_year",
    "not_bought_last_half_year",
]
BundleProductScope = Literal["all", "selected", "pair"]
BundleProductRole = Literal["eligible", "pair_x", "pair_y"]
BundleStatus = Literal["active", "expired", "planned"]


class BundleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=60)
    starts_on: date
    ends_on: date
    benefit_type: BundleBenefitType
    audience_type: BundleAudienceType
    product_scope: BundleProductScope
    selected_product_ids: list[int] = Field(default_factory=list)
    buy_quantity: int | None = Field(default=None, ge=1)
    gift_quantity: int | None = Field(default=None, ge=1)
    order_discount_percent: int | None = Field(default=None, ge=1, le=99)
    fixed_price: int | None = Field(default=None, ge=1)
    step_start_position: int | None = Field(default=None, ge=2)
    step_discount_percent: int | None = Field(default=None, ge=1, le=99)
    pair_discount_percent: int | None = Field(default=None, ge=1, le=99)
    pair_product_x_id: int | None = Field(default=None, ge=1)
    pair_product_y_id: int | None = Field(default=None, ge=1)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Title must not be blank.")
        return normalized

    @model_validator(mode="after")
    def validate_payload(self) -> "BundleCreate":
        if self.ends_on < self.starts_on:
            raise ValueError("End date must not be earlier than start date.")

        self.selected_product_ids = list(dict.fromkeys(self.selected_product_ids))

        if self.benefit_type == "pair_discount":
            if self.product_scope != "pair":
                raise ValueError("Pair discount bundles must use pair product scope.")
            if self.selected_product_ids:
                raise ValueError("Selected product ids are not allowed for pair discount bundles.")
            if self.pair_product_x_id is None or self.pair_product_y_id is None:
                raise ValueError("Both pair products are required.")
            if self.pair_product_x_id == self.pair_product_y_id:
                raise ValueError("Pair products must be different.")
            if self.pair_discount_percent is None:
                raise ValueError("Pair discount percent is required.")

            self.buy_quantity = None
            self.gift_quantity = None
            self.order_discount_percent = None
            self.fixed_price = None
            self.step_start_position = None
            self.step_discount_percent = None
            return self

        if self.product_scope == "pair":
            raise ValueError("Pair product scope is allowed only for pair discount bundles.")

        if self.product_scope == "all" and self.selected_product_ids:
            raise ValueError("Selected product ids are not allowed when product scope is all.")

        if self.product_scope == "selected" and not self.selected_product_ids:
            raise ValueError("At least one product must be selected.")

        self.pair_product_x_id = None
        self.pair_product_y_id = None
        self.pair_discount_percent = None

        if self.benefit_type == "gift_item":
            if self.buy_quantity is None or self.gift_quantity is None:
                raise ValueError("Buy and gift quantities are required for gift bundles.")
            self.order_discount_percent = None
            self.fixed_price = None
            self.step_start_position = None
            self.step_discount_percent = None
            return self

        if self.benefit_type == "order_discount":
            if self.buy_quantity is None or self.order_discount_percent is None:
                raise ValueError("Buy quantity and discount percent are required for order discount bundles.")
            self.gift_quantity = None
            self.fixed_price = None
            self.step_start_position = None
            self.step_discount_percent = None
            return self

        if self.benefit_type == "fixed_price":
            if self.buy_quantity is None or self.fixed_price is None:
                raise ValueError("Buy quantity and fixed price are required for fixed price bundles.")
            self.gift_quantity = None
            self.order_discount_percent = None
            self.step_start_position = None
            self.step_discount_percent = None
            return self

        if self.buy_quantity is None or self.step_start_position is None or self.step_discount_percent is None:
            raise ValueError("Buy quantity, step start position and discount percent are required for step discount.")

        if self.buy_quantity < 2:
            raise ValueError("Step discount bundles require at least 2 products.")

        if self.step_start_position > self.buy_quantity:
            raise ValueError("Step start position must not be greater than buy quantity.")

        self.gift_quantity = None
        self.order_discount_percent = None
        self.fixed_price = None
        return self


class BundleProductSummary(BaseModel):
    id: int
    title: str
    role: BundleProductRole


class BundleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    seller_id: int
    title: str
    starts_on: date
    ends_on: date
    benefit_type: BundleBenefitType
    benefit_label: str
    audience_type: BundleAudienceType
    product_scope: BundleProductScope
    buy_quantity: int | None
    gift_quantity: int | None
    order_discount_percent: int | None
    fixed_price: Decimal | None
    step_start_position: int | None
    step_discount_percent: int | None
    pair_discount_percent: int | None
    selected_product_ids: list[int]
    products: list[BundleProductSummary]
    status: BundleStatus
    created_at: datetime
    updated_at: datetime


class BundleCreateResponse(BaseModel):
    message: str
    bundle: BundleRead


class BundleListItem(BaseModel):
    id: int
    title: str
    starts_on: date
    ends_on: date
    benefit_type: BundleBenefitType
    benefit_label: str
    audience_type: BundleAudienceType
    product_scope: BundleProductScope
    selected_product_ids: list[int]
    products: list[BundleProductSummary]
    status: BundleStatus
    created_at: datetime
