begin;

-- Test bundles seed.
-- Depends on:
--   001_seed_sellers_products.sql
--
-- Includes several bundles for:
--   - seller_roman
--   - seller_alina
--
-- Seed is designed to be re-runnable:
--   - seeded bundles are replaced by seller/title
--   - bundle product mappings are recreated on each run

delete from bundles b
using sellers s
where s.id = b.seller_id
  and (
    (
      s.username = 'seller_roman'
      and b.title in (
        'Домашний набор с подарком',
        'Три товара для рабочего стола',
        'Кружка + свеча со скидкой'
      )
    )
    or
    (
      s.username = 'seller_alina'
      and b.title in (
        'Худи и шоппер комплектом',
        'Готовый городской набор'
      )
    )
  );

insert into bundles (
    seller_id,
    title,
    starts_on,
    ends_on,
    benefit_type,
    audience_type,
    product_scope,
    buy_quantity,
    gift_quantity,
    order_discount_percent,
    fixed_price,
    step_start_position,
    step_discount_percent,
    pair_discount_percent
)
values
    (
        (select id from sellers where username = 'seller_roman'),
        'Домашний набор с подарком',
        current_date + 1,
        current_date + 21,
        'gift_item',
        'all',
        'selected',
        2,
        1,
        null,
        null,
        null,
        null,
        null
    ),
    (
        (select id from sellers where username = 'seller_roman'),
        'Три товара для рабочего стола',
        current_date + 3,
        current_date + 24,
        'step_discount',
        'bought_last_half_year',
        'all',
        3,
        null,
        null,
        null,
        2,
        20,
        null
    ),
    (
        (select id from sellers where username = 'seller_roman'),
        'Кружка + свеча со скидкой',
        current_date + 2,
        current_date + 18,
        'pair_discount',
        'not_bought_last_half_year',
        'pair',
        null,
        null,
        null,
        null,
        null,
        null,
        15
    ),
    (
        (select id from sellers where username = 'seller_alina'),
        'Худи и шоппер комплектом',
        current_date + 1,
        current_date + 16,
        'pair_discount',
        'all',
        'pair',
        null,
        null,
        null,
        null,
        null,
        null,
        18
    ),
    (
        (select id from sellers where username = 'seller_alina'),
        'Готовый городской набор',
        current_date + 5,
        current_date + 25,
        'fixed_price',
        'bought_last_half_year',
        'selected',
        2,
        null,
        null,
        3990.00,
        null,
        null,
        null
    );

insert into bundle_products (bundle_id, product_id, role)
values
    (
        (
            select b.id
            from bundles b
            join sellers s on s.id = b.seller_id
            where s.username = 'seller_roman'
              and b.title = 'Домашний набор с подарком'
        ),
        (
            select p.id
            from products p
            join sellers s on s.id = p.seller_id
            where s.username = 'seller_roman'
              and p.vendor_code = 'ROM-MUG-002'
        ),
        'eligible'
    ),
    (
        (
            select b.id
            from bundles b
            join sellers s on s.id = b.seller_id
            where s.username = 'seller_roman'
              and b.title = 'Домашний набор с подарком'
        ),
        (
            select p.id
            from products p
            join sellers s on s.id = p.seller_id
            where s.username = 'seller_roman'
              and p.vendor_code = 'ROM-BOTTLE-003'
        ),
        'eligible'
    ),
    (
        (
            select b.id
            from bundles b
            join sellers s on s.id = b.seller_id
            where s.username = 'seller_roman'
              and b.title = 'Домашний набор с подарком'
        ),
        (
            select p.id
            from products p
            join sellers s on s.id = p.seller_id
            where s.username = 'seller_roman'
              and p.vendor_code = 'ROM-CANDLE-006'
        ),
        'eligible'
    ),
    (
        (
            select b.id
            from bundles b
            join sellers s on s.id = b.seller_id
            where s.username = 'seller_roman'
              and b.title = 'Кружка + свеча со скидкой'
        ),
        (
            select p.id
            from products p
            join sellers s on s.id = p.seller_id
            where s.username = 'seller_roman'
              and p.vendor_code = 'ROM-MUG-002'
        ),
        'pair_x'
    ),
    (
        (
            select b.id
            from bundles b
            join sellers s on s.id = b.seller_id
            where s.username = 'seller_roman'
              and b.title = 'Кружка + свеча со скидкой'
        ),
        (
            select p.id
            from products p
            join sellers s on s.id = p.seller_id
            where s.username = 'seller_roman'
              and p.vendor_code = 'ROM-CANDLE-006'
        ),
        'pair_y'
    ),
    (
        (
            select b.id
            from bundles b
            join sellers s on s.id = b.seller_id
            where s.username = 'seller_alina'
              and b.title = 'Худи и шоппер комплектом'
        ),
        (
            select p.id
            from products p
            join sellers s on s.id = p.seller_id
            where s.username = 'seller_alina'
              and p.vendor_code = 'ALI-HOODIE-001'
        ),
        'pair_x'
    ),
    (
        (
            select b.id
            from bundles b
            join sellers s on s.id = b.seller_id
            where s.username = 'seller_alina'
              and b.title = 'Худи и шоппер комплектом'
        ),
        (
            select p.id
            from products p
            join sellers s on s.id = p.seller_id
            where s.username = 'seller_alina'
              and p.vendor_code = 'ALI-BAG-002'
        ),
        'pair_y'
    ),
    (
        (
            select b.id
            from bundles b
            join sellers s on s.id = b.seller_id
            where s.username = 'seller_alina'
              and b.title = 'Готовый городской набор'
        ),
        (
            select p.id
            from products p
            join sellers s on s.id = p.seller_id
            where s.username = 'seller_alina'
              and p.vendor_code = 'ALI-HOODIE-001'
        ),
        'eligible'
    ),
    (
        (
            select b.id
            from bundles b
            join sellers s on s.id = b.seller_id
            where s.username = 'seller_alina'
              and b.title = 'Готовый городской набор'
        ),
        (
            select p.id
            from products p
            join sellers s on s.id = p.seller_id
            where s.username = 'seller_alina'
              and p.vendor_code = 'ALI-BAG-002'
        ),
        'eligible'
    );

commit;
