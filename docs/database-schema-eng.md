# Promo Constructor Database Schema

## Tables

- `sellers`
- `products`
- `product_items`
- `promocodes`
- `promocode_products`
- `bundles`
- `bundle_products`
- `refresh_sessions`

## Entity Overview

### `sellers`

Seller account and ownership context.

### `products`

Product card owned by a seller.

### `product_items`

Concrete item rows inside a product card. Stores size/item-level data: size, barcode, price, discount, stock, and related flags.

### `promocodes`

Seller-owned promocode campaign configuration.

### `promocode_products`

Product selection mapping for promocodes when the scope is limited to selected products.

### `bundles`

Seller-owned bundle campaign configuration for multi-product mechanics.

### `bundle_products`

Product selection mapping for bundles, including regular eligible products and pair-specific product roles.

### `refresh_sessions`

Persisted refresh-token sessions for authentication.

## Final DDL

```sql
create table sellers (
    id bigserial primary key,
    username varchar(255) not null,
    password_hash varchar(255) not null,
    display_name varchar(255) not null,
    email varchar(255),
    seller_sid uuid,
    is_active boolean not null default true,
    last_login_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint uq_sellers_username unique (username),
    constraint uq_sellers_email unique (email),
    constraint uq_sellers_seller_sid unique (seller_sid)
);

create index ix_sellers_is_active on sellers (is_active);


create table products (
    id bigserial primary key,
    seller_id bigint not null,
    nm_id bigint,
    imt_id bigint,
    vendor_code varchar(100) not null,
    title varchar(255) not null,
    brand varchar(255),
    description text,
    subject_id bigint,
    subject_name varchar(255),
    parent_id bigint,
    parent_name varchar(255),
    kiz_marked boolean not null default false,
    main_photo_url text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint fk_products_seller_id
        foreign key (seller_id)
        references sellers(id)
        on delete cascade,
    constraint uq_products_seller_vendor_code unique (seller_id, vendor_code),
    constraint uq_products_nm_id unique (nm_id)
);

create index ix_products_seller_id on products (seller_id);
create index ix_products_subject_id on products (subject_id);
create index ix_products_parent_id on products (parent_id);
create index ix_products_is_active on products (is_active);


create table product_items (
    id bigserial primary key,
    product_id bigint not null,
    size_id bigint,
    tech_size_name varchar(100) not null default 'ONE SIZE',
    barcode varchar(64),
    price numeric(12, 2) not null,
    discounted_price numeric(12, 2),
    club_discounted_price numeric(12, 2),
    currency_code char(3) not null default 'RUB',
    discount_percent smallint not null default 0,
    club_discount_percent smallint not null default 0,
    editable_size_price boolean not null default false,
    is_bad_turnover boolean not null default false,
    stock_qty integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint fk_product_items_product_id
        foreign key (product_id)
        references products(id)
        on delete cascade,
    constraint uq_product_items_product_size_name unique (product_id, tech_size_name),
    constraint uq_product_items_product_size_id unique (product_id, size_id),
    constraint uq_product_items_barcode unique (barcode),
    constraint chk_product_items_price_non_negative check (price >= 0),
    constraint chk_product_items_discounted_price_non_negative check (
        discounted_price is null or discounted_price >= 0
    ),
    constraint chk_product_items_club_discounted_price_non_negative check (
        club_discounted_price is null or club_discounted_price >= 0
    ),
    constraint chk_product_items_stock_qty_non_negative check (stock_qty >= 0),
    constraint chk_product_items_discount_percent_range check (
        discount_percent between 0 and 100
    ),
    constraint chk_product_items_club_discount_percent_range check (
        club_discount_percent between 0 and 100
    )
);

create index ix_product_items_product_id on product_items (product_id);
create index ix_product_items_size_id on product_items (size_id);
create index ix_product_items_is_active on product_items (is_active);


create table promocodes (
    id bigserial primary key,
    seller_id bigint not null,
    title varchar(50) not null,
    starts_on date not null,
    ends_on date not null,
    discount_mode varchar(16) not null,
    discount_value integer not null,
    promo_type varchar(40) not null,
    audience_type varchar(40) not null,
    product_scope varchar(16) not null,
    code varchar(15) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint fk_promocodes_seller_id
        foreign key (seller_id)
        references sellers(id)
        on delete cascade,
    constraint uq_promocodes_code unique (code),
    constraint chk_promocodes_title_not_blank check (length(btrim(title)) > 0),
    constraint chk_promocodes_dates_order check (ends_on >= starts_on),
    constraint chk_promocodes_duration_max_31_days check (ends_on <= starts_on + 30),
    constraint chk_promocodes_discount_mode check (
        discount_mode in ('percent', 'amount')
    ),
    constraint chk_promocodes_discount_value_positive check (discount_value > 0),
    constraint chk_promocodes_discount_percent_range check (
        (discount_mode = 'percent' and discount_value between 1 and 99)
        or
        (discount_mode = 'amount' and discount_value >= 1)
    ),
    constraint chk_promocodes_promo_type check (
        promo_type in (
            'single_buyer_single_order',
            'all_buyers_once',
            'all_buyers_limited'
        )
    ),
    constraint chk_promocodes_audience_type check (
        audience_type in (
            'all',
            'bought_last_half_year',
            'not_bought_last_half_year'
        )
    ),
    constraint chk_promocodes_product_scope check (
        product_scope in ('all', 'selected')
    ),
    constraint chk_promocodes_code_format check (
        code ~ '^[A-Za-z0-9]{4,15}$'
    )
);

create index ix_promocodes_seller_id on promocodes (seller_id);
create index ix_promocodes_starts_on on promocodes (starts_on);
create index ix_promocodes_ends_on on promocodes (ends_on);
create index ix_promocodes_promo_type on promocodes (promo_type);
create index ix_promocodes_audience_type on promocodes (audience_type);


create table promocode_products (
    promocode_id bigint not null,
    product_id bigint not null,
    created_at timestamptz not null default now(),

    constraint pk_promocode_products
        primary key (promocode_id, product_id),
    constraint fk_promocode_products_promocode_id
        foreign key (promocode_id)
        references promocodes(id)
        on delete cascade,
    constraint fk_promocode_products_product_id
        foreign key (product_id)
        references products(id)
        on delete cascade
);

create index ix_promocode_products_product_id on promocode_products (product_id);


create table bundles (
    id bigserial primary key,
    seller_id bigint not null,
    title varchar(60) not null,
    starts_on date not null,
    ends_on date not null,
    benefit_type varchar(32) not null,
    audience_type varchar(40) not null,
    product_scope varchar(16) not null,
    buy_quantity integer,
    gift_quantity integer,
    order_discount_percent smallint,
    fixed_price numeric(12, 2),
    step_start_position integer,
    step_discount_percent smallint,
    pair_discount_percent smallint,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint fk_bundles_seller_id
        foreign key (seller_id)
        references sellers(id)
        on delete cascade,
    constraint chk_bundles_title_not_blank check (length(btrim(title)) > 0),
    constraint chk_bundles_dates_order check (ends_on >= starts_on),
    constraint chk_bundles_benefit_type check (
        benefit_type in (
            'gift_item',
            'order_discount',
            'fixed_price',
            'step_discount',
            'pair_discount'
        )
    ),
    constraint chk_bundles_audience_type check (
        audience_type in (
            'all',
            'bought_last_half_year',
            'not_bought_last_half_year'
        )
    ),
    constraint chk_bundles_product_scope check (
        product_scope in ('all', 'selected', 'pair')
    ),
    constraint chk_bundles_product_scope_matches_benefit check (
        (benefit_type = 'pair_discount' and product_scope = 'pair')
        or
        (benefit_type <> 'pair_discount' and product_scope in ('all', 'selected'))
    ),
    constraint chk_bundles_benefit_params check (
        (
            benefit_type = 'gift_item'
            and buy_quantity >= 1
            and gift_quantity >= 1
            and order_discount_percent is null
            and fixed_price is null
            and step_start_position is null
            and step_discount_percent is null
            and pair_discount_percent is null
        )
        or
        (
            benefit_type = 'order_discount'
            and buy_quantity >= 1
            and order_discount_percent between 1 and 99
            and gift_quantity is null
            and fixed_price is null
            and step_start_position is null
            and step_discount_percent is null
            and pair_discount_percent is null
        )
        or
        (
            benefit_type = 'fixed_price'
            and buy_quantity >= 1
            and fixed_price > 0
            and gift_quantity is null
            and order_discount_percent is null
            and step_start_position is null
            and step_discount_percent is null
            and pair_discount_percent is null
        )
        or
        (
            benefit_type = 'step_discount'
            and buy_quantity >= 2
            and step_start_position between 2 and buy_quantity
            and step_discount_percent between 1 and 99
            and gift_quantity is null
            and order_discount_percent is null
            and fixed_price is null
            and pair_discount_percent is null
        )
        or
        (
            benefit_type = 'pair_discount'
            and pair_discount_percent between 1 and 99
            and buy_quantity is null
            and gift_quantity is null
            and order_discount_percent is null
            and fixed_price is null
            and step_start_position is null
            and step_discount_percent is null
        )
    )
);

create index ix_bundles_seller_id on bundles (seller_id);
create index ix_bundles_starts_on on bundles (starts_on);
create index ix_bundles_ends_on on bundles (ends_on);
create index ix_bundles_benefit_type on bundles (benefit_type);
create index ix_bundles_audience_type on bundles (audience_type);
create index ix_bundles_product_scope on bundles (product_scope);


create table bundle_products (
    bundle_id bigint not null,
    product_id bigint not null,
    role varchar(16) not null,
    created_at timestamptz not null default now(),

    constraint pk_bundle_products
        primary key (bundle_id, product_id),
    constraint fk_bundle_products_bundle_id
        foreign key (bundle_id)
        references bundles(id)
        on delete cascade,
    constraint fk_bundle_products_product_id
        foreign key (product_id)
        references products(id)
        on delete cascade,
    constraint chk_bundle_products_role check (
        role in ('eligible', 'pair_x', 'pair_y')
    )
);

create index ix_bundle_products_product_id on bundle_products (product_id);
create index ix_bundle_products_role on bundle_products (role);
create unique index uq_bundle_products_pair_x
    on bundle_products (bundle_id)
    where role = 'pair_x';
create unique index uq_bundle_products_pair_y
    on bundle_products (bundle_id)
    where role = 'pair_y';


create table refresh_sessions (
    id uuid primary key,
    seller_id bigint not null,
    refresh_token_hash varchar(255) not null,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    last_used_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint fk_refresh_sessions_seller_id
        foreign key (seller_id)
        references sellers(id)
        on delete cascade,
    constraint uq_refresh_sessions_refresh_token_hash unique (refresh_token_hash),
    constraint chk_refresh_sessions_expires_after_created check (expires_at >= created_at)
);

create index ix_refresh_sessions_seller_id on refresh_sessions (seller_id);
create index ix_refresh_sessions_expires_at on refresh_sessions (expires_at);
create index ix_refresh_sessions_revoked_at on refresh_sessions (revoked_at);
```

## Table and Field Manifest

### `sellers`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `bigserial` | Internal seller identifier in Promo Constructor. |
| `username` | `varchar(255)` | Login used for authentication. Must be unique. |
| `password_hash` | `varchar(255)` | Hashed password. Raw password is never stored. |
| `display_name` | `varchar(255)` | Human-readable seller name for UI and API responses. |
| `email` | `varchar(255)` | Optional seller email. |
| `seller_sid` | `uuid` | Optional seller account identifier in the WB-like domain. Useful as an external/business seller reference. |
| `is_active` | `boolean` | Whether the seller account is active. |
| `last_login_at` | `timestamptz` | Time of the last successful login. |
| `created_at` | `timestamptz` | Row creation timestamp. |
| `updated_at` | `timestamptz` | Row update timestamp. |

### `products`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `bigserial` | Internal product identifier. |
| `seller_id` | `bigint` | Owner seller. References `sellers.id`. |
| `nm_id` | `bigint` | Product card/article identifier. |
| `imt_id` | `bigint` | Group/model identifier for the product card. |
| `vendor_code` | `varchar(100)` | Seller article code. Unique within one seller. |
| `title` | `varchar(255)` | Product title. |
| `brand` | `varchar(255)` | Product brand. |
| `description` | `text` | Product description. |
| `subject_id` | `bigint` | Subject identifier. |
| `subject_name` | `varchar(255)` | Subject name, for example a product type. |
| `parent_id` | `bigint` | Parent category identifier. |
| `parent_name` | `varchar(255)` | Parent category name. |
| `kiz_marked` | `boolean` | Whether the product is marked / requires KIZ-like handling. |
| `main_photo_url` | `text` | Main product image URL. |
| `is_active` | `boolean` | Whether the product is active in the application. |
| `created_at` | `timestamptz` | Row creation timestamp. |
| `updated_at` | `timestamptz` | Row update timestamp. |

### `product_items`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `bigserial` | Internal item-row identifier. |
| `product_id` | `bigint` | Parent product. References `products.id`. |
| `size_id` | `bigint` | Size/item identifier at the item level. |
| `tech_size_name` | `varchar(100)` | Technical size label, for example `42`, `M`, or `ONE SIZE`. |
| `barcode` | `varchar(64)` | Barcode of the concrete item row. |
| `price` | `numeric(12,2)` | Base price for this item. |
| `discounted_price` | `numeric(12,2)` | Price after the regular discount. |
| `club_discounted_price` | `numeric(12,2)` | Price after an additional club discount. |
| `currency_code` | `char(3)` | Currency code, usually `RUB`. |
| `discount_percent` | `smallint` | Regular discount percent. |
| `club_discount_percent` | `smallint` | Extra club discount percent. |
| `editable_size_price` | `boolean` | Whether price is managed per item/size separately. |
| `is_bad_turnover` | `boolean` | Flag for weak turnover / problematic item dynamics. |
| `stock_qty` | `integer` | Available stock quantity for this item row. |
| `is_active` | `boolean` | Whether this item row is active. |
| `created_at` | `timestamptz` | Row creation timestamp. |
| `updated_at` | `timestamptz` | Row update timestamp. |

### `promocodes`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `bigserial` | Internal promocode identifier. |
| `seller_id` | `bigint` | Owner seller. References `sellers.id`. |
| `title` | `varchar(50)` | Internal promocode title visible only to the seller. |
| `starts_on` | `date` | Promocode start date. |
| `ends_on` | `date` | Promocode end date. |
| `discount_mode` | `varchar(16)` | Discount mode: percent or fixed amount. |
| `discount_value` | `integer` | Discount value according to the selected mode. |
| `promo_type` | `varchar(40)` | Promocode usage type selected in the constructor UI. |
| `audience_type` | `varchar(40)` | Audience segment selected in the constructor UI. |
| `product_scope` | `varchar(16)` | Whether the promocode applies to all products or selected products only. |
| `code` | `varchar(15)` | Final promocode string, either generated or entered manually. Globally unique. |
| `created_at` | `timestamptz` | Row creation timestamp. |
| `updated_at` | `timestamptz` | Row update timestamp. |

### `promocode_products`

| Field | Type | Meaning |
| --- | --- | --- |
| `promocode_id` | `bigint` | Linked promocode. References `promocodes.id`. |
| `product_id` | `bigint` | Linked product. References `products.id`. |
| `created_at` | `timestamptz` | When this product was linked to the promocode. |

### `bundles`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `bigserial` | Internal bundle identifier. |
| `seller_id` | `bigint` | Owner seller. References `sellers.id`. |
| `title` | `varchar(60)` | Internal bundle title visible to the seller. |
| `starts_on` | `date` | Bundle start date. |
| `ends_on` | `date` | Bundle end date. |
| `benefit_type` | `varchar(32)` | Benefit mechanic selected in the constructor UI. |
| `audience_type` | `varchar(40)` | Audience segment selected in the constructor UI. |
| `product_scope` | `varchar(16)` | Product selection mode: all products, selected products, or a fixed pair. |
| `buy_quantity` | `integer` | Required item quantity for quantity-based bundle mechanics. |
| `gift_quantity` | `integer` | Gift item quantity for the gift mechanic. |
| `order_discount_percent` | `smallint` | Percent discount for the full bundle amount. |
| `fixed_price` | `numeric(12,2)` | Fixed final bundle price. |
| `step_start_position` | `integer` | Item position from which step discount starts. |
| `step_discount_percent` | `smallint` | Percent discount for discounted item positions in the step mechanic. |
| `pair_discount_percent` | `smallint` | Percent discount for the fixed product pair mechanic. |
| `created_at` | `timestamptz` | Row creation timestamp. |
| `updated_at` | `timestamptz` | Row update timestamp. |

### `bundle_products`

| Field | Type | Meaning |
| --- | --- | --- |
| `bundle_id` | `bigint` | Linked bundle. References `bundles.id`. |
| `product_id` | `bigint` | Linked product. References `products.id`. |
| `role` | `varchar(16)` | Product role in the bundle: eligible, pair_x, or pair_y. |
| `created_at` | `timestamptz` | When this product was linked to the bundle. |

### `refresh_sessions`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `uuid` | Session identifier. Can also be embedded into token claims if needed later. |
| `seller_id` | `bigint` | Seller who owns the refresh session. References `sellers.id`. |
| `refresh_token_hash` | `varchar(255)` | Hash of the refresh token stored in the cookie. The raw token should not be stored. |
| `expires_at` | `timestamptz` | Refresh-token expiration moment. |
| `revoked_at` | `timestamptz` | When the session was revoked. `NULL` means active. |
| `last_used_at` | `timestamptz` | Last successful refresh usage time. |
| `created_at` | `timestamptz` | Row creation timestamp. |
| `updated_at` | `timestamptz` | Row update timestamp. |

## Relationships

- One `seller` -> many `products`
- One `product` -> many `product_items`
- One `seller` -> many `promocodes`
- One `promocode` -> many `promocode_products`
- One `product` -> many `promocode_products`
- One `seller` -> many `bundles`
- One `bundle` -> many `bundle_products`
- One `product` -> many `bundle_products`
- One `seller` -> many `refresh_sessions`

## Implementation Notes

- `updated_at` should be maintained by the application or SQLAlchemy layer.
- `promocode_products` should stay empty when `promocodes.product_scope = 'all'`.
- `promocode_products` should contain at least one row when `promocodes.product_scope = 'selected'`.
- `bundle_products` should stay empty when `bundles.product_scope = 'all'`.
- `bundle_products` should contain at least one row with `role = 'eligible'` when `bundles.product_scope = 'selected'`.
- `bundle_products` should contain exactly one `pair_x` row and exactly one `pair_y` row when `bundles.product_scope = 'pair'`.
- Bundle product ownership should be validated in application logic so selected products belong to the bundle seller.
- Validation for "start date is not earlier than tomorrow and not later than three months from creation" should be enforced in application logic.
- `refresh_token_hash` should be compared by hashing the incoming refresh token value, not by storing raw token text.
- Access tokens can stay short-lived JWTs in `httpOnly` cookies.
