<?php
/**
 * 07_editing モジュール設定
 * Yahoo Auction統合システム
 */

return [
    'module_name' => '07_editing',
    'module_title' => '商品データ編集システム',
    'version' => '2.0.0',
    'description' => 'Yahoo Auctionスクレイピングデータの編集・管理システム',
    
    'database' => [
        'table' => 'yahoo_scraped_products',
        'primary_key' => 'id',
        'item_id_field' => 'source_item_id'
    ],
    
    'pagination' => [
        'default_limit' => 20,
        'max_limit' => 100
    ],
    
    'features' => [
        'bulk_edit' => true,
        'bulk_delete' => true,
        'csv_export' => true,
        'image_preview' => true,
        'search_filter' => true,
        'price_calculation' => true
    ],
    
    'validation' => [
        'title_max_length' => 255,
        'price_min' => 0,
        'price_max' => 99999999,
        'description_max_length' => 5000
    ],
    
    'ui' => [
        'items_per_page_options' => [10, 20, 50, 100],
        'table_columns' => [
            'select', 'image', 'item_id', 'title', 'price', 
            'category', 'condition', 'platform', 'status', 'date', 'actions'
        ]
    ]
];
?>