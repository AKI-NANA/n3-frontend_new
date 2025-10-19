<?php
/**
 * 楽天市場 スクレイピング設定
 * 
 * 作成日: 2025-09-25
 * 用途: 楽天市場固有の設定
 */

return [
    'platform_name' => '楽天市場',
    'platform_id' => 'rakuten',
    'base_url' => 'https://item.rakuten.co.jp',
    'request_delay' => 1000, // ミリ秒
    'timeout' => 30,
    'max_retries' => 3,
    'user_agents' => [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
    ],
    'selectors' => [
        'title' => 'h1',
        'price' => '.price, .item-price',
        'shop_name' => '.shop-name',
        'rating' => '.rating'
    ]
];
