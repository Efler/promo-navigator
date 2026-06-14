# Схема Базы Данных Promo Constructor

## Таблицы

- `sellers`
- `products`
- `product_items`
- `promocodes`
- `promocode_products`
- `bundles`
- `bundle_products`
- `refresh_sessions`

## Обзор Сущностей

### `sellers`

Аккаунт селлера и контекст владения данными.

### `products`

Карточка товара, принадлежащая селлеру.

### `product_items`

Конкретные товарные позиции внутри карточки товара. Хранит данные уровня размера или item-позиции: размер, штрихкод, цену, скидку, остаток и связанные флаги.

### `promocodes`

Конфигурация промокода, принадлежащая селлеру.

### `promocode_products`

Связка промокода с товарами, если промокод действует не на весь ассортимент, а только на выбранные товары.

### `bundles`

Конфигурация комплекта, принадлежащая селлеру.

### `bundle_products`

Связка комплекта с товарами, включая обычные выбранные товары и роли товаров для парных комплектов.

### `refresh_sessions`

Постоянно хранимые refresh-сессии для аутентификации.

## Финальный DDL

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

## Манифест Таблиц И Полей

### `sellers`

| Поле | Тип | Смысл |
| --- | --- | --- |
| `id` | `bigserial` | Внутренний идентификатор селлера в Promo Constructor. |
| `username` | `varchar(255)` | Логин для аутентификации. Должен быть уникальным. |
| `password_hash` | `varchar(255)` | Хеш пароля. Сам пароль в базе не хранится. |
| `display_name` | `varchar(255)` | Человекочитаемое имя селлера для UI и API-ответов. |
| `email` | `varchar(255)` | Необязательный email селлера. |
| `seller_sid` | `uuid` | Необязательный идентификатор seller-аккаунта в WB-like домене. Полезен как внешний или бизнес-идентификатор селлера. |
| `is_active` | `boolean` | Активен ли seller-аккаунт. |
| `last_login_at` | `timestamptz` | Время последнего успешного входа. |
| `created_at` | `timestamptz` | Время создания записи. |
| `updated_at` | `timestamptz` | Время последнего обновления записи. |

### `products`

| Поле | Тип | Смысл |
| --- | --- | --- |
| `id` | `bigserial` | Внутренний идентификатор товара. |
| `seller_id` | `bigint` | Владелец товара. Ссылка на `sellers.id`. |
| `nm_id` | `bigint` | Идентификатор карточки товара или артикул товара. |
| `imt_id` | `bigint` | Идентификатор группы или модели карточки товара. |
| `vendor_code` | `varchar(100)` | Артикул продавца. Уникален в рамках одного селлера. |
| `title` | `varchar(255)` | Название товара. |
| `brand` | `varchar(255)` | Бренд товара. |
| `description` | `text` | Описание товара. |
| `subject_id` | `bigint` | Идентификатор предмета. |
| `subject_name` | `varchar(255)` | Название предмета, например тип товара. |
| `parent_id` | `bigint` | Идентификатор родительской категории. |
| `parent_name` | `varchar(255)` | Название родительской категории. |
| `kiz_marked` | `boolean` | Требуется ли для товара маркировка или KIZ-like обработка. |
| `main_photo_url` | `text` | Ссылка на главное изображение товара. |
| `is_active` | `boolean` | Активен ли товар в приложении. |
| `created_at` | `timestamptz` | Время создания записи. |
| `updated_at` | `timestamptz` | Время последнего обновления записи. |

### `product_items`

| Поле | Тип | Смысл |
| --- | --- | --- |
| `id` | `bigserial` | Внутренний идентификатор item-строки. |
| `product_id` | `bigint` | Родительский товар. Ссылка на `products.id`. |
| `size_id` | `bigint` | Идентификатор размера или item-позиции на уровне конкретной строки. |
| `tech_size_name` | `varchar(100)` | Техническое название размера, например `42`, `M` или `ONE SIZE`. |
| `barcode` | `varchar(64)` | Штрихкод конкретной товарной позиции. |
| `price` | `numeric(12,2)` | Базовая цена для этой позиции. |
| `discounted_price` | `numeric(12,2)` | Цена после обычной скидки. |
| `club_discounted_price` | `numeric(12,2)` | Цена после дополнительной клубной скидки. |
| `currency_code` | `char(3)` | Код валюты, обычно `RUB`. |
| `discount_percent` | `smallint` | Процент обычной скидки. |
| `club_discount_percent` | `smallint` | Процент дополнительной клубной скидки. |
| `editable_size_price` | `boolean` | Можно ли управлять ценой отдельно на уровне конкретного item/размера. |
| `is_bad_turnover` | `boolean` | Флаг слабой оборачиваемости или проблемной динамики этой позиции. |
| `stock_qty` | `integer` | Доступный остаток по этой товарной позиции. |
| `is_active` | `boolean` | Активна ли эта item-строка. |
| `created_at` | `timestamptz` | Время создания записи. |
| `updated_at` | `timestamptz` | Время последнего обновления записи. |

### `promocodes`

| Поле | Тип | Смысл |
| --- | --- | --- |
| `id` | `bigserial` | Внутренний идентификатор промокода. |
| `seller_id` | `bigint` | Владелец промокода. Ссылка на `sellers.id`. |
| `title` | `varchar(50)` | Внутреннее название промокода, видимое только продавцу. |
| `starts_on` | `date` | Дата начала действия промокода. |
| `ends_on` | `date` | Дата окончания действия промокода. |
| `discount_mode` | `varchar(16)` | Режим скидки: проценты или фиксированная сумма. |
| `discount_value` | `integer` | Значение скидки в выбранном режиме. |
| `promo_type` | `varchar(40)` | Тип использования промокода, выбранный в UI-конструкторе. |
| `audience_type` | `varchar(40)` | Сегмент аудитории, выбранный в UI-конструкторе. |
| `product_scope` | `varchar(16)` | Действует ли промокод на все товары или только на выбранные. |
| `code` | `varchar(15)` | Финальная строка промокода, сгенерированная или введенная вручную. Глобально уникальна. |
| `created_at` | `timestamptz` | Время создания записи. |
| `updated_at` | `timestamptz` | Время последнего обновления записи. |

### `promocode_products`

| Поле | Тип | Смысл |
| --- | --- | --- |
| `promocode_id` | `bigint` | Привязанный промокод. Ссылка на `promocodes.id`. |
| `product_id` | `bigint` | Привязанный товар. Ссылка на `products.id`. |
| `created_at` | `timestamptz` | Когда товар был привязан к промокоду. |

### `bundles`

| Поле | Тип | Смысл |
| --- | --- | --- |
| `id` | `bigserial` | Внутренний идентификатор комплекта. |
| `seller_id` | `bigint` | Владелец комплекта. Ссылка на `sellers.id`. |
| `title` | `varchar(60)` | Внутреннее название комплекта, видимое продавцу. |
| `starts_on` | `date` | Дата начала действия комплекта. |
| `ends_on` | `date` | Дата окончания действия комплекта. |
| `benefit_type` | `varchar(32)` | Тип выгоды, выбранный в UI-конструкторе. |
| `audience_type` | `varchar(40)` | Сегмент аудитории, выбранный в UI-конструкторе. |
| `product_scope` | `varchar(16)` | Режим выбора товаров: весь ассортимент, выбранные товары или фиксированная пара. |
| `buy_quantity` | `integer` | Количество товаров для механик, завязанных на количество. |
| `gift_quantity` | `integer` | Количество подарочных товаров для механики подарка. |
| `order_discount_percent` | `smallint` | Процент скидки на итоговую сумму комплекта. |
| `fixed_price` | `numeric(12,2)` | Фиксированная итоговая цена комплекта. |
| `step_start_position` | `integer` | Позиция товара, начиная с которой действует ступенчатая скидка. |
| `step_discount_percent` | `smallint` | Процент скидки для товаров, попавших под ступенчатую скидку. |
| `pair_discount_percent` | `smallint` | Процент скидки для механики фиксированной пары товаров. |
| `created_at` | `timestamptz` | Время создания записи. |
| `updated_at` | `timestamptz` | Время последнего обновления записи. |

### `bundle_products`

| Поле | Тип | Смысл |
| --- | --- | --- |
| `bundle_id` | `bigint` | Привязанный комплект. Ссылка на `bundles.id`. |
| `product_id` | `bigint` | Привязанный товар. Ссылка на `products.id`. |
| `role` | `varchar(16)` | Роль товара в комплекте: eligible, pair_x или pair_y. |
| `created_at` | `timestamptz` | Когда товар был привязан к комплекту. |

### `refresh_sessions`

| Поле | Тип | Смысл |
| --- | --- | --- |
| `id` | `uuid` | Идентификатор сессии. При необходимости позже его можно вкладывать в claims токена. |
| `seller_id` | `bigint` | Селлер, которому принадлежит refresh-сессия. Ссылка на `sellers.id`. |
| `refresh_token_hash` | `varchar(255)` | Хеш refresh-токена, который хранится в cookie. Сам токен в открытом виде хранить нельзя. |
| `expires_at` | `timestamptz` | Момент истечения refresh-токена. |
| `revoked_at` | `timestamptz` | Когда сессия была отозвана. `NULL` означает, что сессия активна. |
| `last_used_at` | `timestamptz` | Время последнего успешного использования refresh-токена. |
| `created_at` | `timestamptz` | Время создания записи. |
| `updated_at` | `timestamptz` | Время последнего обновления записи. |

## Связи

- Один `seller` -> много `products`
- Один `product` -> много `product_items`
- Один `seller` -> много `promocodes`
- Один `promocode` -> много `promocode_products`
- Один `product` -> много `promocode_products`
- Один `seller` -> много `bundles`
- Один `bundle` -> много `bundle_products`
- Один `product` -> много `bundle_products`
- Один `seller` -> много `refresh_sessions`

## Примечания К Реализации

- `updated_at` должен поддерживаться на уровне приложения или слоя SQLAlchemy.
- `promocode_products` должна оставаться пустой, когда `promocodes.product_scope = 'all'`.
- `promocode_products` должна содержать хотя бы одну строку, когда `promocodes.product_scope = 'selected'`.
- `bundle_products` должна оставаться пустой, когда `bundles.product_scope = 'all'`.
- `bundle_products` должна содержать хотя бы одну строку с `role = 'eligible'`, когда `bundles.product_scope = 'selected'`.
- `bundle_products` должна содержать ровно одну строку `pair_x` и ровно одну строку `pair_y`, когда `bundles.product_scope = 'pair'`.
- Принадлежность выбранных товаров тому же селлеру, что и комплект, должна проверяться в прикладной логике.
- Валидация правил "дата старта не раньше завтрашнего дня и не позже трех месяцев от момента создания" должна выполняться в прикладной логике.
- `refresh_token_hash` нужно сравнивать через хеширование входящего refresh-токена, а не хранить сырой текст токена.
- Access tokens могут оставаться короткоживущими JWT в `httpOnly` cookies.
