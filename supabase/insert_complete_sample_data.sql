-- ================================================
-- 完全なサンプルデータ投入（全フィールド入り）
-- ================================================

-- 既存のサンプルデータをクリア（オプション）
-- DELETE FROM products WHERE data_source = 'sample';

-- 完全なサンプルデータを5件追加
INSERT INTO products (
    sku,
    title,
    english_title,
    item_id,
    brand,
    manufacturer,
    condition,
    stock_quantity,
    acquired_price_jpy,
    price_jpy,
    price_usd,
    ddp_price_usd,
    ddu_price_usd,
    weight_g,
    length_cm,
    width_cm,
    height_cm,
    category_name,
    image_urls,
    image_count,
    html_applied,
    ready_to_list,
    data_source,
    tool_processed,
    created_at,
    updated_at
) VALUES
-- サンプル1: ポケモンカード（完全版）
(
    'PKM-PIKA-VMAX-001',
    'ポケモンカード ピカチュウ V-MAX',
    'Pokemon Card Pikachu V-MAX PSA 10',
    'PKM-001',
    'Pokemon Company',
    'Pokemon',
    'Used',
    1,
    12000,
    12000,
    80.00,
    89.99,
    84.99,
    50,
    10.0,
    7.0,
    0.3,
    'Trading Cards > Pokemon',
    ARRAY['https://placehold.co/400x400/4CAF50/ffffff?text=Pikachu+VMAX'],
    1,
    false,
    false,
    'sample',
    '{"category": false, "shipping": false, "profit": false, "html": false, "mirror": false}'::jsonb,
    NOW() - INTERVAL '5 days',
    NOW()
),

-- サンプル2: Nintendo Switch（ツール計算済み）
(
    'NSW-OLED-WHT-001',
    'Nintendo Switch 有機ELモデル ホワイト',
    'Nintendo Switch OLED Model White Console',
    'NSW-001',
    'Nintendo',
    'Nintendo',
    'New',
    3,
    38000,
    38000,
    253.33,
    279.99,
    269.99,
    800,
    24.0,
    18.0,
    6.0,
    'Video Games > Consoles > Nintendo Switch',
    ARRAY['https://placehold.co/400x400/E91E63/ffffff?text=Switch+OLED'],
    1,
    true,
    true,
    'sample',
    '{"category": true, "shipping": true, "profit": true, "html": true, "mirror": true}'::jsonb,
    NOW() - INTERVAL '3 days',
    NOW()
),

-- サンプル3: 遊戯王カード（一部処理済み）
(
    'YGO-BEWD-INIT-001',
    '遊戯王カード ブルーアイズホワイトドラゴン 初期版',
    'Yu-Gi-Oh! Blue-Eyes White Dragon 1st Edition',
    'YGO-001',
    'Konami',
    'Konami',
    'Used',
    1,
    150000,
    150000,
    1000.00,
    1199.99,
    1149.99,
    20,
    8.5,
    6.0,
    0.2,
    'Trading Cards > Yu-Gi-Oh',
    ARRAY['https://placehold.co/400x400/2196F3/ffffff?text=Blue+Eyes'],
    1,
    true,
    false,
    'sample',
    '{"category": true, "shipping": true, "profit": true, "html": true, "mirror": false}'::jsonb,
    NOW() - INTERVAL '2 days',
    NOW()
),

-- サンプル4: ワンピースフィギュア（未処理）
(
    'OP-LUFFY-G5-001',
    'ワンピース フィギュア ルフィ ギア5',
    'One Piece Figure Luffy Gear 5',
    'OP-001',
    'Bandai',
    'Bandai',
    'New',
    2,
    8500,
    8500,
    56.67,
    69.99,
    64.99,
    350,
    25.0,
    18.0,
    12.0,
    'Collectibles > Anime > One Piece',
    ARRAY['https://placehold.co/400x400/FF5722/ffffff?text=Luffy+G5'],
    1,
    false,
    false,
    'sample',
    '{"category": false, "shipping": false, "profit": false, "html": false, "mirror": false}'::jsonb,
    NOW() - INTERVAL '1 day',
    NOW()
),

-- サンプル5: 鬼滅の刃全巻セット（処理中）
(
    'KNY-MANGA-SET-001',
    '鬼滅の刃 全巻セット 1-23巻',
    'Demon Slayer Kimetsu no Yaiba Complete Set Vol 1-23',
    'KNY-001',
    'Shueisha',
    'Shueisha',
    'Used',
    1,
    15000,
    15000,
    100.00,
    119.99,
    114.99,
    2500,
    30.0,
    22.0,
    18.0,
    'Books > Manga > Demon Slayer',
    ARRAY['https://placehold.co/400x400/9C27B0/ffffff?text=Demon+Slayer'],
    1,
    false,
    false,
    'sample',
    '{"category": true, "shipping": false, "profit": false, "html": false, "mirror": false}'::jsonb,
    NOW(),
    NOW()
)
ON CONFLICT (sku) DO UPDATE SET
    english_title = EXCLUDED.english_title,
    price_jpy = EXCLUDED.price_jpy,
    price_usd = EXCLUDED.price_usd,
    ddp_price_usd = EXCLUDED.ddp_price_usd,
    ddu_price_usd = EXCLUDED.ddu_price_usd,
    data_source = EXCLUDED.data_source,
    tool_processed = EXCLUDED.tool_processed,
    updated_at = NOW();

-- 結果確認
SELECT 
    sku,
    title,
    english_title,
    price_usd,
    data_source,
    tool_processed->>'html' as html_done,
    tool_processed->>'profit' as profit_done,
    html_applied,
    ready_to_list
FROM products
WHERE data_source = 'sample'
ORDER BY created_at DESC;

-- 統計
SELECT 
    '✅ 完全なサンプルデータ投入完了' as status,
    COUNT(*) as total_samples,
    SUM(CASE WHEN html_applied THEN 1 ELSE 0 END) as with_html,
    SUM(CASE WHEN ready_to_list THEN 1 ELSE 0 END) as ready_to_list
FROM products
WHERE data_source = 'sample';
