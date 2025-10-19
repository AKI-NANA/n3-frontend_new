<?php
/**
 * Yahoo Auction Tool - 設定ファイル
 */

define('YAHOO_TOOL_VERSION', '4.0.0');
define('YAHOO_TOOL_DATABASE', 'nagano3_db');

// 初期フィルター設定
$default_filters = [
    'prohibited_keywords' => [
        '偽物', '偽造', 'コピー', '海賊版', 'レプリカ',
        '著作権侵害', '商標侵害', '違法', '薬品', '医薬品'
    ],
    'vero_brands' => [
        'Louis Vuitton', 'Gucci', 'Hermes', 'Chanel', 'Prada',
        'Nike', 'Adidas', 'Supreme', 'Rolex'
    ]
];

// デフォルト送料設定
$default_shipping_rates = [
    ['carrier' => 'fedex', 'weight_from' => 0, 'weight_to' => 1.0, 'size_category' => 'small', 'base_cost_usd' => 15.99],
    ['carrier' => 'fedex', 'weight_from' => 1.0, 'weight_to' => 5.0, 'size_category' => 'medium', 'base_cost_usd' => 28.99],
    ['carrier' => 'fedex', 'weight_from' => 5.0, 'weight_to' => 10.0, 'size_category' => 'large', 'base_cost_usd' => 45.99]
];
?>