## Tooling Guidance

- Use the `context7` MCP server when writing or designing code to verify up-to-date documentation for relevant tools and technologies. Use it only when current tool functionality or behavior is important to the task.
- Use the `postgres` (postgres-mcp) MCP server when you need to work with database, get information from database or change data in database.  Be sure to ask permission to execute important/critical commands and changes. Read-only safe operations can be done without permission requests.

## Execution rules

- If you have trouble running commands within the native Windows sandbox, run the commands/work outside the sandbox. Be sure to ask permission to execute important/critical commands and changes.


# Promo Navigator Manifest

### Project overview
Promo Navigator is a training fullstack web application that simulates a promo-management addon for a marketplace seller.
The application allows a seller to log in and use promotion mechanics to improve sales on the marketplace side.
Initial promotion domains are:
- `promocodes`
- `bundles`
- `promotions`

Business rules for these mechanics will be designed iteratively in later phases.
At the current stage, the priority is to preserve a clean architecture, stable stack, and extensible project structure.

### Core architecture
The project must be implemented as a monorepo with separated frontend and backend parts.
The root structure should follow this shape:
- `frontend/` for the React application
- `backend/` for the FastAPI application
- `infra/` for deployment/runtime-related configuration when needed

The backend should be a modular monolith, not microservices.
The frontend should be an SPA with a small public area and a seller-only private area.
Do not introduce SSR, Next.js, BFF, Kafka, or microservice decomposition in the initial versions unless explicitly requested later.

### Backend stack
Preferred backend stack:
- `Python 3.12`
- `FastAPI`
- `Pydantic v2`
- `pydantic-settings`
- `SQLAlchemy 2.0 ORM`
- `psycopg` v3
- `Alembic`
- `PyJWT`
- `pwdlib`

Backend conventions:
- Use REST API under `/api/v1`
- Keep ORM models and API schemas separate
- Use synchronous SQLAlchemy on early stages
- Organize code into clear layers such as `api`, `core`, `db`, `models`, `schemas`, `services`, `repositories`, `modules`
- Business domains should be isolated in `modules`

Expected backend modules:
- `auth`
- `sellers`
- `products`
- `promocodes`
- `bundles`
- `promotions`

### Frontend stack
Preferred frontend stack:
- `React`
- `TypeScript`
- `Vite`
- `React Router`
- `TanStack Query`
- `Mantine`

Preferred Mantine packages:
- `@mantine/core`
- `@mantine/form`
- `@mantine/notifications`
- `@mantine/modals`

Frontend conventions:
- Use a clean SPA structure without overengineering
- Prefer folders such as `app`, `pages`, `features`, `shared/api`, `shared/ui`
- Use `Mantine AppShell` for the private application area
- Use a lightweight typed wrapper over `fetch` instead of `axios`
- Build a UI that is clean, modern, and functional: forms, tables, filters, modals, action panels

### Auth and user context
Authentication is required from the early stages.
This project does not need a full marketplace seller cabinet.
However, the application must support login of a specific seller so all actions are performed in seller context.

Auth principles:
- Login is internal to Promo Navigator
- No external OAuth providers in the first versions
- Access and refresh token flows are implemented with JWT in `httpOnly` cookies
- Refresh sessions are persisted in PostgreSQL and used for refresh-token rotation and revocation
- Tokens should be stored in `httpOnly` cookies, not in `localStorage`
- All domain data and actions should be seller-scoped
- In deploy/VPS environments, backend API access may additionally be protected by a pre-shared admin key barrier before normal seller authentication

Current auth/API directions:
- `/auth/register`
- `/auth/login`
- `/auth/refresh`
- `/auth/me`
- `/auth/logout`
- `/sellers/me`
- `/products`
- `/products/{product_id}`
- `/promocodes`
- `/promocodes/code-availability`
- `/bundles`
- `/promotions`
- `/promotions/participations`
- `/promotions/{promotion_slug}`
- `/promotions/{promotion_slug}/participations`
- `/recommendations/mechanic`

Current backend API protection directions:
- Seller auth remains the domain-level authentication model for application behavior
- A separate deploy-time `API_ADMIN_KEY` may guard direct backend access to `/api/v1/*`, `/docs`, `/redoc`, and `/swagger`
- Frontend UI may use a separate internal proxy path such as `/ui-api/v1` that maps to backend API routes without requiring the browser to set `X-Admin-Key` manually
- Script/manual clients may pass the pre-shared key in the `X-Admin-Key` header
- There is no browser unlock page in the current simplified model: protected backend paths require a manually supplied header
- The admin-key layer is an outer access gate and is not a replacement for seller JWT/cookie auth

Current promocodes flow:
- seller-scoped promocode creation is implemented
- seller-scoped promocode list is implemented
- manual promocode codes can be pre-checked for availability
- promocode read views currently cover list/table output only
- promocode editing, deletion, and detailed usage analytics are not implemented yet

Current bundles flow:
- seller-scoped bundle creation is implemented
- seller-scoped bundle list is implemented
- bundle constructor supports `gift_item`, `order_discount`, `fixed_price`, `step_discount`, and `pair_discount`
- bundle product scope supports all products, selected products, and pair-specific product roles
- bundle read views currently cover list/table output only
- bundle editing, deletion, and detailed usage analytics are not implemented yet

Current promotions flow:
- marketplace promotion catalog schema is implemented
- promotion metadata includes periods, join deadlines, product requirements, UI card tone, and up to two benefits
- promotion category eligibility can target all categories or selected parent categories
- seller participation stores the additional discount, price-change confirmation, and selected seller products
- published promotion catalog and promotion detail APIs are implemented
- seller-scoped participation list and participation creation APIs are implemented
- participation creation validates join availability, minimum discount, minimum product count, product ownership, active state, active stock, and eligible parent categories
- promotion and participation statuses are calculated from the promotion period in the Europe/Moscow business timezone
- the promotions frontend reads catalog and participation data from the backend and persists new participations through the API
- promotion participation editing, cancellation, and price-application side effects are not implemented yet

Current mechanic recommendation flow:
- authenticated sellers can request a recommendation through `POST /api/v1/recommendations/mechanic`
- the backend builds a compact seller-scoped state from products, item prices and stock, existing mechanics, participations, and published promotion opportunities
- before building seller state, the backend requires an explicit seller sales/promotion goal and returns `clarification_required` for obvious personal or off-domain requests
- every Ollama call is one-shot and contains only the system prompt and the current request/state payload
- Ollama structured output is validated before it is returned to the client
- `clarification_required` always uses a stable backend-owned Russian message
- invalid or truncated recommendation descriptions are replaced with mechanic-specific safe text
- the overview frontend calls the recommendation endpoint and shows an animated long-running loading state
- recommendation request, loading, error, and result state live at the private-layout level and survive navigation between `/app` pages
- `VITE_LLM_RECOMMENDATIONS_ENABLED` switches between backend/Ollama recommendations and the previous local keyword-based selection
- after an API failure, the UI offers retry and explicit fallback to the local selector

### Auto-choice LLM recommendation context

The auto-choice feature recommends exactly one of the three top-level mechanics:
`promotions`, `promocodes`, or `bundles`.

Every recommendation is a one-shot inference. The backend must build a new payload
from the current seller state and the current seller request. Previous requests,
previous model responses, conversation identifiers, and Ollama `context` values
must never be reused.

The backend builds a compact seller-scoped aggregate, not raw database rows.
The fields below describe the source facts and their semantics. The exact v1 wire
names, nesting, caps, and inference payload are defined by
`docs/llm-recommendation-contract-ru.md` and the current backend implementation.

#### Request metadata

- `generated_at`: timestamp when the context was calculated.
- `business_date`: current date in the `Europe/Moscow` business timezone.
- `currency_codes`: distinct currencies found in active product items; normally
  `["RUB"]`.
- `seller_need`: the current free-text request entered by the seller.

Do not send seller username, display name, email, `seller_sid`, authentication data,
refresh sessions, or other personal/security identifiers to the LLM.

#### Inventory summary

Calculate these fields only from products owned by the authenticated seller:

- `products_total`: all product cards.
- `products_active`: active product cards.
- `products_inactive`: inactive product cards.
- `products_in_stock`: active product cards with at least one active item and total
  active stock greater than zero.
- `products_out_of_stock`: active product cards whose active-item stock is zero.
- `active_items_total`: active item/size rows belonging to active products.
- `total_stock_qty`: sum of `stock_qty` across active items of active products.
- `product_stock_min`, `product_stock_median`, `product_stock_max`: distribution of
  total active stock aggregated to product-card level.
- `products_with_multiple_items`: active product cards with more than one active
  item/size row.
- `products_with_editable_size_price`: active products having at least one active
  item with `editable_size_price = true`.
- `products_kiz_marked`: active products with `kiz_marked = true`.
- `products_bad_turnover`: active products having at least one active item with
  `is_bad_turnover = true`.
- `bad_turnover_items`: active item rows with `is_bad_turnover = true`.

`is_bad_turnover` is only a stored boolean flag. It must not be described as a
specific sales decline, turnover rate, or time-period metric.

#### Price and discount summary

For an active item, define `effective_price` as:
`club_discounted_price`, otherwise `discounted_price`, otherwise `price`.

The context may contain:

- `effective_price_min`, `effective_price_median`, `effective_price_max`,
  `effective_price_avg`.
- `base_price_avg`.
- `discount_percent_avg` and `discount_percent_max`.
- `club_discount_percent_avg` and `club_discount_percent_max`.
- `discounted_items_count` and `discounted_items_share`.
- `full_price_items_count` and `full_price_items_share`.

All statistics are calculated across active items of active products. Null prices
must use the fallback order above. The current discount is not the seller's margin
and does not prove that an additional discount is economically safe.

#### Assortment structure

- `parent_category_count`: distinct non-null `parent_id` values among active
  products.
- `subject_count`: distinct non-null `subject_id` values among active products.
- `brand_count`: distinct non-null brands among active products.
- `top_parent_categories`: at most three category summaries ordered by active
  product count and then total stock. Each entry may contain:
  - `parent_name`;
  - `active_product_count`;
  - `in_stock_product_count`;
  - `total_stock_qty`;
  - `median_effective_price`;
  - `bad_turnover_product_count`.
- `top_subjects`: at most three subject summaries with `subject_name`,
  `active_product_count`, and `total_stock_qty`.

To help the model recognize plausible complementary products for bundles, the
payload may also include `product_examples`, capped at three deterministic entries.
Each entry may contain only:

- `title`;
- `parent_name`;
- `subject_name`;
- `brand`;
- `active_item_count`;
- `total_stock_qty`;
- `effective_price_min`;
- `effective_price_max`;
- `is_bad_turnover`;
- `kiz_marked`.

Prefer bad-turnover products first, then in-stock products with the highest stock,
while preserving category diversity. Do not send product IDs, `nm_id`, `imt_id`,
vendor codes, barcodes, descriptions, photo URLs, or every product row.

#### Current mechanic usage

Statuses must be calculated from `business_date`, not copied from UI labels:

- promocode status:
  - `scheduled` when `starts_on > business_date`;
  - `active` when `starts_on <= business_date <= ends_on`;
  - `expired` when `ends_on < business_date`.
- bundle status: `planned`, `active`, or `expired` using the same date rules.
- promotion participation status: `scheduled`, `active`, or `completed` from the
  related promotion period.

Include:

- `promocodes_by_status`: counts of scheduled, active, and expired promocodes.
- `bundles_by_status`: counts of planned, active, and expired bundles.
- `promotion_participations_by_status`: counts of scheduled, active, and completed
  participations.
- `active_promocode_product_count`: distinct seller products currently covered by
  active promocodes; an `all` scope covers every active product.
- `active_bundle_product_count`: distinct seller products currently covered by
  active bundles; an `all` scope covers every active product.
- `active_promotion_product_count`: distinct products in active promotion
  participations.
- `current_mechanic_product_overlap_count`: products simultaneously covered by two
  or more current mechanics.
- `historical_promocode_count`, `historical_bundle_count`, and
  `historical_promotion_participation_count`.
- detailed historical breakdowns by discount mode, audience type, and bundle
  benefit type are intentionally omitted from the compact LLM wire payload.

These fields describe configuration history and current load only. The schema does
not contain campaign performance, so past use must not be interpreted as past
success.

#### Mechanic readiness

Provide explicit derived readiness signals instead of asking the model to infer
database constraints:

- `promocode_ready`: true when at least one active in-stock product exists.
- `bundle_ready`: true when at least two distinct active in-stock products exist.
- `bundle_same_category_groups`: number of parent categories containing at least
  two active in-stock products.
- `bundle_cross_category_possible`: true when active in-stock products exist in at
  least two parent categories.
- `bad_turnover_products_available_for_promo`: count of active, in-stock products
  marked `is_bad_turnover`.

`bundle_ready` means that a bundle can technically be configured. It does not prove
that the products are complementary; product examples and the seller's stated need
provide that semantic signal.

#### Marketplace promotion opportunities

Marketplace promotion availability is a strong signal for recommending
`promotions`. For every published promotion whose period has not ended, calculate
seller-specific eligibility from current inventory:

- product is owned by the seller;
- product and at least one item are active;
- total active product stock meets `minimum_stock_qty`;
- product parent category is allowed when `category_scope = selected`.

The aggregate should include:

- `joinable_promotions_count`: published promotions still accepting participation.
- `inventory_eligible_promotions_count`: joinable promotions where the number of
  eligible seller products meets `minimum_products`.
- `already_joined_open_promotions_count`.
- `promotion_opportunities`: at most one best candidate, preferring joinable,
  inventory-eligible, not-yet-joined, and earliest-deadline promotions. Each entry
  may contain:
  - `title`;
  - `status`;
  - `days_until_start`;
  - `days_until_join_deadline`;
  - `minimum_discount_percent`;
  - `minimum_stock_qty`;
  - `minimum_products`;
  - `eligible_product_count`;
  - `inventory_requirements_met`;
  - `already_joined`;
  - `eligible_parent_names`, or `null` for all categories;
  - up to two promotion benefits.

Do not claim that a seller can safely afford `minimum_discount_percent`; the
database has no cost, margin, or profitability data.

#### Data currently unavailable

The current schema cannot provide:

- orders, sold quantities, revenue, GMV, average order value, or sales dynamics;
- views, clicks, conversion, search position, advertising traffic, or add-to-cart
  metrics;
- product cost, margin, profit, logistics cost, or a safe discount ceiling;
- actual promocode redemptions or campaign-attributed sales;
- customer counts, repeat-purchase behavior, customer segments, or audience sizes;
- real bundle attach rate or frequently-bought-together statistics;
- seasonality, geography, returns, ratings, reviews, or competitor prices.

The prompt and model explanation must not invent these metrics. If they become
important for recommendation quality, they require new persisted data or an
external analytics source in a later feature phase.

#### Payload size and decision rules

- Keep the serialized recommendation context comfortably inside the configured
  Ollama context window; target no more than roughly 1,200 input tokens for seller
  state before system instructions and the seller request.
- Prefer counts, ratios, medians, booleans, and capped summaries over raw rows.
- Use stable machine-readable field names and JSON, not a prose database dump.
- Calculate all derived fields in backend code or SQL; do not make the LLM perform
  joins, status calculations, eligibility checks, or arithmetic.
- The model recommends only the top-level mechanic. It does not choose exact
  products, discounts, dates, audiences, bundle benefit types, or a concrete
  promotion unless a later feature explicitly expands the contract.
- The final response must contain the selected mechanic and a short explanation
  grounded only in the seller request and supplied context.
- For `clarification_required`, the LLM returns an empty message and backend supplies
  the stable localized clarification text. Recommendation messages are validated
  for length and sentence completion; backend uses a safe mechanic-specific
  fallback when the model explanation is truncated.
- The canonical Ollama request payload, system prompt, compact wire aliases,
  structured response schema, inference options, and backend validation rules are
  defined in `docs/llm-recommendation-contract-ru.md`. The implemented integration
  must remain aligned with that v1 contract.
- For `qwen3:1.7b`, the canonical wire caps are 3 categories, 3 subjects,
  3 product examples, and 1 promotion opportunity.

### Database and data principles
PostgreSQL is mandatory for the project.
All seller, product, and promotion-related data should be stored in PostgreSQL.
Database schema should be designed incrementally, feature by feature.
Do not overdesign the schema before the corresponding business flow is clarified.

Current database baseline:
- `sellers`
- `products`
- `product_items`
- `promocodes`
- `promocode_products`
- `bundles`
- `bundle_products`
- `promotions`
- `promotion_benefits`
- `promotion_categories`
- `promotion_participations`
- `promotion_participation_products`
- `refresh_sessions`

Database principles:
- Use migrations via `Alembic`
- Prefer explicit relational modeling
- Keep the schema understandable and evolvable
- Optimize for correctness and extensibility first, not premature complexity

### Docker and runtime
All core components should be runnable in Docker both locally and in production-oriented setups.
Use Docker Compose v2.
Main services for early stages:
- `frontend`
- `backend`
- `postgres`
- `ollama`

Additional rules:
- `pgadmin` is a development/operations helper and is currently present in both local and deploy compose files
- Production-critical images should use pinned tags; production PostgreSQL currently uses `postgres:16-alpine`
- The local development compose still uses floating PostgreSQL and pgAdmin tags and should not be treated as a production image policy
- In local development, frontend may proxy a dedicated UI-facing prefix such as `/ui-api` to backend API routes
- In the current deploy setup, `nginx` in the frontend container is the external entrypoint and terminates HTTPS
- The production `/ui-api/` nginx proxy uses extended timeouts for long-running recommendation requests
- Sensitive backend-facing paths such as `/api`, `/ui-api`, `/docs`, `/redoc`, `/swagger`, and `/pgadmin` should require HTTPS in production
- Current deploy environment variables include `API_ADMIN_PROTECTION_ENABLED`, `API_ADMIN_KEY`, `FRONTEND_INTERNAL_API_KEY`, `VITE_LLM_RECOMMENDATIONS_ENABLED`, and the `OLLAMA_*` runtime settings

### Delivery strategy
The project should be implemented incrementally in small, explicit steps.
Do not try to build the whole product in one pass.
Each next step should preserve architectural consistency with this manifest.

Current implementation status:
1. Repository skeleton and base folders
2. Backend app bootstrap and config
3. Frontend app bootstrap and layout
4. Dockerized local runtime
5. Auth foundation
6. Sellers and products foundation
7. Promocode creation flow
8. Promocode list/read flow
9. Bundle schema and seed data
10. Bundle creation flow
11. Bundle list/read flow
12. Marketplace promotion catalog and calendar
13. Seller promotion participation flow
14. One-shot Ollama mechanic recommendation backend flow
15. Frontend mechanic recommendation integration with loading and fallback

The first fifteen steps are already in place at a baseline level.
The next implementation focus is deeper read/update flows and gradual expansion of promotion lifecycle management on top of the existing seller/product/auth foundation.

### Quality and scope rules
At the current stage:
- Backend testing is allowed and encouraged when needed
- Frontend testing is not a priority yet
- Infra testing is not a priority yet

Important scope constraints:
- No premature event-driven architecture
- No premature background platform unless clearly needed
- No Redux by default
- No heavy enterprise abstractions without a concrete use case
- Prefer clarity over theoretical scalability

### Agent guidance
When working in this repository:
- Preserve the modular monolith approach
- Preserve the selected stack unless the user explicitly changes it
- Keep seller-scoped domain design in mind
- Treat this project as a fullstack application with shared architectural direction across frontend, backend, and infrastructure
- Prefer incremental implementation and avoid speculative complexity
- Keep promocode creation seller-scoped and consistent with the frontend constructor flow


# Promo Navigator Database Schema

## Tables

- `sellers`
- `products`
- `product_items`
- `promocodes`
- `promocode_products`
- `bundles`
- `bundle_products`
- `promotions`
- `promotion_benefits`
- `promotion_categories`
- `promotion_participations`
- `promotion_participation_products`
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

### `promotions`

Marketplace-owned promotion catalog entries with periods, seller-entry requirements, publishing state, and UI presentation metadata.

### `promotion_benefits`

Ordered promotion benefit descriptions. Each promotion can expose at most two benefits.

### `promotion_categories`

Allowed parent categories for promotions whose category scope is limited to selected categories.

### `promotion_participations`

Seller participation settings for a marketplace promotion, including the confirmed additional discount.

### `promotion_participation_products`

Seller-owned products selected for a concrete promotion participation.

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


create table promotions (
    id bigserial primary key,
    slug varchar(64) not null,
    title varchar(120) not null,
    short_description varchar(500) not null,
    starts_on date not null,
    ends_on date not null,
    join_deadline date not null,
    minimum_discount_percent smallint not null,
    minimum_stock_qty integer not null default 0,
    minimum_products integer not null default 1,
    category_scope varchar(16) not null default 'all',
    card_tone varchar(16) not null default 'brand',
    is_featured boolean not null default false,
    is_published boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint uq_promotions_slug unique (slug),
    constraint chk_promotions_slug_format check (
        slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
    constraint chk_promotions_title_not_blank check (length(btrim(title)) > 0),
    constraint chk_promotions_description_not_blank check (
        length(btrim(short_description)) > 0
    ),
    constraint chk_promotions_dates_order check (ends_on >= starts_on),
    constraint chk_promotions_join_deadline check (join_deadline <= ends_on),
    constraint chk_promotions_discount_range check (
        minimum_discount_percent between 1 and 99
    ),
    constraint chk_promotions_stock_non_negative check (minimum_stock_qty >= 0),
    constraint chk_promotions_minimum_products_positive check (minimum_products >= 1),
    constraint chk_promotions_category_scope check (
        category_scope in ('all', 'selected')
    ),
    constraint chk_promotions_card_tone check (
        card_tone in ('brand', 'teal', 'orange', 'blue', 'grape')
    )
);

create index ix_promotions_catalog_period
    on promotions (starts_on, ends_on)
    where is_published = true;
create index ix_promotions_join_deadline_published
    on promotions (join_deadline)
    where is_published = true;


create table promotion_benefits (
    promotion_id bigint not null,
    position smallint not null,
    description varchar(255) not null,
    created_at timestamptz not null default now(),

    constraint pk_promotion_benefits primary key (promotion_id, position),
    constraint fk_promotion_benefits_promotion_id
        foreign key (promotion_id)
        references promotions(id)
        on delete cascade,
    constraint chk_promotion_benefits_position check (position between 1 and 2),
    constraint chk_promotion_benefits_description_not_blank check (
        length(btrim(description)) > 0
    )
);


create table promotion_categories (
    promotion_id bigint not null,
    parent_id bigint not null,
    parent_name varchar(255) not null,
    created_at timestamptz not null default now(),

    constraint pk_promotion_categories primary key (promotion_id, parent_id),
    constraint fk_promotion_categories_promotion_id
        foreign key (promotion_id)
        references promotions(id)
        on delete cascade,
    constraint chk_promotion_categories_parent_id_positive check (parent_id > 0),
    constraint chk_promotion_categories_name_not_blank check (
        length(btrim(parent_name)) > 0
    )
);

create index ix_promotion_categories_parent_id
    on promotion_categories (parent_id);


create table promotion_participations (
    id bigserial primary key,
    promotion_id bigint not null,
    seller_id bigint not null,
    additional_discount_percent smallint not null,
    price_change_confirmed_at timestamptz not null,
    joined_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint fk_promotion_participations_promotion_id
        foreign key (promotion_id)
        references promotions(id)
        on delete restrict,
    constraint fk_promotion_participations_seller_id
        foreign key (seller_id)
        references sellers(id)
        on delete cascade,
    constraint uq_promotion_participations_seller_promotion
        unique (seller_id, promotion_id),
    constraint chk_promotion_participations_discount_range check (
        additional_discount_percent between 1 and 99
    )
);

create index ix_promotion_participations_promotion_id
    on promotion_participations (promotion_id);


create table promotion_participation_products (
    participation_id bigint not null,
    product_id bigint not null,
    created_at timestamptz not null default now(),

    constraint pk_promotion_participation_products
        primary key (participation_id, product_id),
    constraint fk_promotion_participation_products_participation_id
        foreign key (participation_id)
        references promotion_participations(id)
        on delete cascade,
    constraint fk_promotion_participation_products_product_id
        foreign key (product_id)
        references products(id)
        on delete no action
);

create index ix_promotion_participation_products_product_id
    on promotion_participation_products (product_id);


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
| `id` | `bigserial` | Internal seller identifier in Promo Navigator. |
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

### `promotions`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `bigserial` | Internal marketplace promotion identifier. |
| `slug` | `varchar(64)` | Stable unique promotion identifier used in API routes and frontend URLs. |
| `title` | `varchar(120)` | Promotion title displayed to sellers. |
| `short_description` | `varchar(500)` | Short catalog-card and join-page description. |
| `starts_on` | `date` | Promotion start date. |
| `ends_on` | `date` | Promotion end date. |
| `join_deadline` | `date` | Last date when sellers can join the promotion. |
| `minimum_discount_percent` | `smallint` | Minimum additional discount required from a seller. |
| `minimum_stock_qty` | `integer` | Minimum active stock required for every selected product. |
| `minimum_products` | `integer` | Minimum number of products required for participation. |
| `category_scope` | `varchar(16)` | Whether all parent categories or only selected categories are eligible. |
| `card_tone` | `varchar(16)` | Controlled Mantine color token used for promotion-card presentation. |
| `is_featured` | `boolean` | Whether the promotion receives emphasized card styling. |
| `is_published` | `boolean` | Whether the promotion is visible in the seller catalog. |
| `created_at` | `timestamptz` | Row creation timestamp. |
| `updated_at` | `timestamptz` | Row update timestamp. |

### `promotion_benefits`

| Field | Type | Meaning |
| --- | --- | --- |
| `promotion_id` | `bigint` | Parent promotion. References `promotions.id`. |
| `position` | `smallint` | Display position, limited to values 1 and 2. |
| `description` | `varchar(255)` | Seller-facing benefit description. |
| `created_at` | `timestamptz` | Row creation timestamp. |

### `promotion_categories`

| Field | Type | Meaning |
| --- | --- | --- |
| `promotion_id` | `bigint` | Parent promotion. References `promotions.id`. |
| `parent_id` | `bigint` | Eligible product parent-category identifier matching `products.parent_id`. |
| `parent_name` | `varchar(255)` | Category name stored for display and readable administration. |
| `created_at` | `timestamptz` | Row creation timestamp. |

### `promotion_participations`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `bigserial` | Internal seller-participation identifier. |
| `promotion_id` | `bigint` | Marketplace promotion. References `promotions.id`. |
| `seller_id` | `bigint` | Participating seller. References `sellers.id`. |
| `additional_discount_percent` | `smallint` | Additional discount applied to the current product price. |
| `price_change_confirmed_at` | `timestamptz` | Moment when the seller confirmed promotional price changes. |
| `joined_at` | `timestamptz` | Moment when the seller joined the promotion. |
| `created_at` | `timestamptz` | Row creation timestamp. |
| `updated_at` | `timestamptz` | Row update timestamp. |

### `promotion_participation_products`

| Field | Type | Meaning |
| --- | --- | --- |
| `participation_id` | `bigint` | Seller participation. References `promotion_participations.id`. |
| `product_id` | `bigint` | Selected seller product. References `products.id`. |
| `created_at` | `timestamptz` | When the product was attached to the participation. |

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
- One `promotion` -> up to two `promotion_benefits`
- One `promotion` -> many `promotion_categories`
- One `promotion` -> many `promotion_participations`
- One `seller` -> many `promotion_participations`
- One `promotion_participation` -> many `promotion_participation_products`
- One `product` -> many `promotion_participation_products`
- One `seller` -> many `refresh_sessions`

## Implementation Notes

- `updated_at` should be maintained by the application or SQLAlchemy layer.
- `promocode_products` should stay empty when `promocodes.product_scope = 'all'`.
- `promocode_products` should contain at least one row when `promocodes.product_scope = 'selected'`.
- `bundle_products` should stay empty when `bundles.product_scope = 'all'`.
- `bundle_products` should contain at least one row with `role = 'eligible'` when `bundles.product_scope = 'selected'`.
- `bundle_products` should contain exactly one `pair_x` row and exactly one `pair_y` row when `bundles.product_scope = 'pair'`.
- Bundle product ownership should be validated in application logic so selected products belong to the bundle seller.
- `promotion_benefits` should contain one or two sequential rows with positions starting from 1.
- `promotion_categories` should stay empty when `promotions.category_scope = 'all'`.
- `promotion_categories` should contain at least one row when `promotions.category_scope = 'selected'`.
- Promotion status (`upcoming`, `active`, `ending_soon`, `closed`) should be derived from `starts_on` and `ends_on`.
- Participation status (`scheduled`, `active`, `completed`) should be derived from the linked promotion period.
- Promotion joining should validate publication state, join deadline, minimum additional discount, minimum product count, product ownership, active stock, and eligible parent categories in application logic.
- Every product selected for a participation must belong to the participation seller.
- The additional promotion discount is applied to the current item price and should be calculated per active `product_item`.
- Promocode validation for "start date is not earlier than tomorrow and not later than three months from creation" should be enforced in application logic.
- Bundle validation for "start date is not earlier than tomorrow" should be enforced in application logic.
- `refresh_token_hash` should be compared by hashing the incoming refresh token value, not by storing raw token text.
- Access tokens can stay short-lived JWTs in `httpOnly` cookies.

## Reference Sources

- [WB API: General / seller information / token](https://dev.wildberries.ru/en/docs/openapi/api-information)
- [WB API: Product Management](https://dev.wildberries.ru/en/docs/openapi/work-with-products)
