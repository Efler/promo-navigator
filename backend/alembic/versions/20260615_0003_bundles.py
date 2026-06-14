"""add bundles and bundle_products tables

Revision ID: 20260615_0003
Revises: 20260504_0002
Create Date: 2026-06-15 12:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260615_0003"
down_revision = "20260504_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bundles",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("seller_id", sa.BigInteger(), nullable=False),
        sa.Column("title", sa.String(length=60), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("benefit_type", sa.String(length=32), nullable=False),
        sa.Column("audience_type", sa.String(length=40), nullable=False),
        sa.Column("product_scope", sa.String(length=16), nullable=False),
        sa.Column("buy_quantity", sa.Integer(), nullable=True),
        sa.Column("gift_quantity", sa.Integer(), nullable=True),
        sa.Column("order_discount_percent", sa.SmallInteger(), nullable=True),
        sa.Column("fixed_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("step_start_position", sa.Integer(), nullable=True),
        sa.Column("step_discount_percent", sa.SmallInteger(), nullable=True),
        sa.Column("pair_discount_percent", sa.SmallInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["seller_id"],
            ["sellers.id"],
            name="fk_bundles_seller_id",
            ondelete="CASCADE",
        ),
        sa.CheckConstraint("length(btrim(title)) > 0", name="chk_bundles_title_not_blank"),
        sa.CheckConstraint("ends_on >= starts_on", name="chk_bundles_dates_order"),
        sa.CheckConstraint(
            "benefit_type in ("
            "'gift_item', "
            "'order_discount', "
            "'fixed_price', "
            "'step_discount', "
            "'pair_discount'"
            ")",
            name="chk_bundles_benefit_type",
        ),
        sa.CheckConstraint(
            "audience_type in ('all', 'bought_last_half_year', 'not_bought_last_half_year')",
            name="chk_bundles_audience_type",
        ),
        sa.CheckConstraint(
            "product_scope in ('all', 'selected', 'pair')",
            name="chk_bundles_product_scope",
        ),
        sa.CheckConstraint(
            "((benefit_type = 'pair_discount' and product_scope = 'pair') "
            "or (benefit_type <> 'pair_discount' and product_scope in ('all', 'selected')))",
            name="chk_bundles_product_scope_matches_benefit",
        ),
        sa.CheckConstraint(
            "("
            "("
            "benefit_type = 'gift_item' "
            "and buy_quantity >= 1 "
            "and gift_quantity >= 1 "
            "and order_discount_percent is null "
            "and fixed_price is null "
            "and step_start_position is null "
            "and step_discount_percent is null "
            "and pair_discount_percent is null"
            ") or ("
            "benefit_type = 'order_discount' "
            "and buy_quantity >= 1 "
            "and order_discount_percent between 1 and 99 "
            "and gift_quantity is null "
            "and fixed_price is null "
            "and step_start_position is null "
            "and step_discount_percent is null "
            "and pair_discount_percent is null"
            ") or ("
            "benefit_type = 'fixed_price' "
            "and buy_quantity >= 1 "
            "and fixed_price > 0 "
            "and gift_quantity is null "
            "and order_discount_percent is null "
            "and step_start_position is null "
            "and step_discount_percent is null "
            "and pair_discount_percent is null"
            ") or ("
            "benefit_type = 'step_discount' "
            "and buy_quantity >= 2 "
            "and step_start_position between 2 and buy_quantity "
            "and step_discount_percent between 1 and 99 "
            "and gift_quantity is null "
            "and order_discount_percent is null "
            "and fixed_price is null "
            "and pair_discount_percent is null"
            ") or ("
            "benefit_type = 'pair_discount' "
            "and pair_discount_percent between 1 and 99 "
            "and buy_quantity is null "
            "and gift_quantity is null "
            "and order_discount_percent is null "
            "and fixed_price is null "
            "and step_start_position is null "
            "and step_discount_percent is null"
            ")"
            ")",
            name="chk_bundles_benefit_params",
        ),
    )
    op.create_index("ix_bundles_seller_id", "bundles", ["seller_id"], unique=False)
    op.create_index("ix_bundles_starts_on", "bundles", ["starts_on"], unique=False)
    op.create_index("ix_bundles_ends_on", "bundles", ["ends_on"], unique=False)
    op.create_index("ix_bundles_benefit_type", "bundles", ["benefit_type"], unique=False)
    op.create_index("ix_bundles_audience_type", "bundles", ["audience_type"], unique=False)
    op.create_index("ix_bundles_product_scope", "bundles", ["product_scope"], unique=False)

    op.create_table(
        "bundle_products",
        sa.Column("bundle_id", sa.BigInteger(), nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["bundle_id"],
            ["bundles.id"],
            name="fk_bundle_products_bundle_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name="fk_bundle_products_product_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("bundle_id", "product_id", name="pk_bundle_products"),
        sa.CheckConstraint("role in ('eligible', 'pair_x', 'pair_y')", name="chk_bundle_products_role"),
    )
    op.create_index("ix_bundle_products_product_id", "bundle_products", ["product_id"], unique=False)
    op.create_index("ix_bundle_products_role", "bundle_products", ["role"], unique=False)
    op.create_index(
        "uq_bundle_products_pair_x",
        "bundle_products",
        ["bundle_id"],
        unique=True,
        postgresql_where=sa.text("role = 'pair_x'"),
    )
    op.create_index(
        "uq_bundle_products_pair_y",
        "bundle_products",
        ["bundle_id"],
        unique=True,
        postgresql_where=sa.text("role = 'pair_y'"),
    )


def downgrade() -> None:
    op.drop_index("uq_bundle_products_pair_y", table_name="bundle_products", postgresql_where=sa.text("role = 'pair_y'"))
    op.drop_index("uq_bundle_products_pair_x", table_name="bundle_products", postgresql_where=sa.text("role = 'pair_x'"))
    op.drop_index("ix_bundle_products_role", table_name="bundle_products")
    op.drop_index("ix_bundle_products_product_id", table_name="bundle_products")
    op.drop_table("bundle_products")

    op.drop_index("ix_bundles_product_scope", table_name="bundles")
    op.drop_index("ix_bundles_audience_type", table_name="bundles")
    op.drop_index("ix_bundles_benefit_type", table_name="bundles")
    op.drop_index("ix_bundles_ends_on", table_name="bundles")
    op.drop_index("ix_bundles_starts_on", table_name="bundles")
    op.drop_index("ix_bundles_seller_id", table_name="bundles")
    op.drop_table("bundles")
