<?php
/**
 * TCGプラットフォーム統一設定ファイル
 * 
 * 11サイトの設定を一元管理
 * Yahoo Auction統合システムの設計思想を継承
 * 
 * @version 1.0.0
 * @created 2025-09-26
 */

return [
    // ============================================
    // 優先度高: MTG専門サイト
    // ============================================
    
    'singlestar' => [
        'name' => 'シングルスター',
        'platform_id' => 'singlestar',
        'base_url' => 'https://www.singlestar.jp',
        'category' => 'MTG',
        'priority' => 'high',
        'request_delay' => 2000,
        'timeout' => 30,
        'max_retries' => 3,
        'url_patterns' => [
            '/^https?:\/\/(?:www\.)?singlestar\.jp\/product/',
            '/^https?:\/\/(?:www\.)?singlestar\.jp\/item/'
        ],
        'user_agents' => [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        ],
        'selectors' => [
            'title' => ['h1.product-name', '.item-title', 'h1.title'],
            'price' => ['.product-price', '.price', '.item-price'],
            'stock' => ['.stock-status', '.availability', '.in-stock'],
            'image' => ['.product-image img', '.item-image img', 'img.main-image'],
            'condition' => ['.card-condition', '.item-condition', '.condition'],
            'rarity' => ['.card-rarity', '.rarity', '.rare'],
            'set_name' => ['.set-name', '.expansion', '.card-set'],
            'card_number' => ['.card-number', '.collector-number', '.number']
        ]
    ],
    
    'hareruya_mtg' => [
        'name' => '晴れる屋MTG',
        'platform_id' => 'hareruya_mtg',
        'base_url' => 'https://www.hareruyamtg.com',
        'category' => 'MTG',
        'priority' => 'high',
        'request_delay' => 2000,
        'timeout' => 30,
        'max_retries' => 3,
        'url_patterns' => [
            '/^https?:\/\/(?:www\.)?hareruyamtg\.com\/(?:ja|en)\/products/'
        ],
        'selectors' => [
            'title' => ['h1.product-name', '.card-name', 'h1.item-title'],
            'price' => ['.product-price', '.price-tag', '.current-price'],
            'stock' => ['.stock-info', '.availability', '.in-stock-badge'],
            'image' => ['.product-image img', '.card-image img'],
            'condition' => ['.condition-label', '.card-condition'],
            'rarity' => ['.rarity-symbol', '.card-rarity'],
            'set_name' => ['.set-name', '.expansion-name'],
            'card_number' => ['.card-number', '.collector-number']
        ]
    ],
    
    // ============================================
    // 優先度高: ポケモンカード専門サイト
    // ============================================
    
    'hareruya2' => [
        'name' => '晴れる屋2',
        'platform_id' => 'hareruya2',
        'base_url' => 'https://www.hareruya2.com',
        'category' => 'Pokemon',
        'priority' => 'high',
        'request_delay' => 2000,
        'timeout' => 30,
        'max_retries' => 3,
        'url_patterns' => [
            '/^https?:\/\/(?:www\.)?hareruya2\.com\/product/'
        ],
        'selectors' => [
            'title' => ['h1.product-title', '.card-name', 'h1.item-name'],
            'price' => ['.price', '.product-price', '.card-price'],
            'stock' => ['.stock-status', '.availability'],
            'image' => ['.product-image img', '.card-img'],
            'condition' => ['.condition', '.grade'],
            'rarity' => ['.rarity', '.rare-symbol'],
            'pokemon_specific' => [
                'hp' => ['.pokemon-hp', '.hp-value'],
                'type' => ['.pokemon-type', '.type-icon'],
                'regulation' => ['.regulation-mark', '.regulation']
            ]
        ]
    ],
    
    'fullahead' => [
        'name' => 'フルアヘッド',
        'platform_id' => 'fullahead',
        'base_url' => 'https://pokemon-card-fullahead.com',
        'category' => 'Pokemon',
        'priority' => 'high',
        'request_delay' => 1500,
        'timeout' => 30,
        'max_retries' => 3,
        'url_patterns' => [
            '/^https?:\/\/pokemon-card-fullahead\.com\/product/'
        ],
        'selectors' => [
            'title' => ['h1.product-name', '.card-title'],
            'price' => ['.price', '.product-price'],
            'stock' => ['.stock', '.availability'],
            'image' => ['.product-image img', 'img.card-image'],
            'condition' => ['.condition', '.card-condition'],
            'rarity' => ['.rarity', '.rare-mark'],
            'pokemon_specific' => [
                'hp' => ['.hp', '.pokemon-hp'],
                'type' => ['.type', '.pokemon-type'],
                'regulation' => ['.regulation', '.reg-mark']
            ]
        ]
    ],
    
    'cardrush' => [
        'name' => 'カードラッシュ',
        'platform_id' => 'cardrush',
        'base_url' => 'https://www.cardrush-pokemon.jp',
        'category' => 'Pokemon',
        'priority' => 'high',
        'request_delay' => 2000,
        'timeout' => 30,
        'max_retries' => 3,
        'url_patterns' => [
            '/^https?:\/\/(?:www\.)?cardrush-pokemon\.jp\/product/'
        ],
        'selectors' => [
            'title' => ['h1.product-title', '.item-name'],
            'price' => ['.price', '.item-price'],
            'stock' => ['.stock-info', '.stock'],
            'image' => ['.product-img img', 'img.item-image'],
            'condition' => ['.condition-tag', '.grade'],
            'rarity' => ['.rarity', '.rare']
        ]
    ],
    
    // ============================================
    // 優先度高: 総合TCGサイト
    // ============================================
    
    'yuyu_tei' => [
        'name' => '遊々亭',
        'platform_id' => 'yuyu_tei',
        'base_url' => 'https://yuyu-tei.jp',
        'category' => 'Multi_TCG',
        'priority' => 'high',
        'request_delay' => 2000,
        'timeout' => 30,
        'max_retries' => 3,
        'url_patterns' => [
            '/^https?:\/\/yuyu-tei\.jp\/game_/',
            '/^https?:\/\/yuyu-tei\.jp\/sell/',
            '/^https?:\/\/yuyu-tei\.jp\/top\/poc/',  // ポケモン
            '/^https?:\/\/yuyu-tei\.jp\/top\/ygo/',  // 遊戯王
            '/^https?:\/\/yuyu-tei\.jp\/top\/mtg/'   // MTG
        ],
        'selectors' => [
            'title' => ['h3.card-name', '.item-title', 'h1.product-name'],
            'price' => ['.sale-price', '.price', '.item-price'],
            'stock' => ['.stock', '.in-stock', '.availability'],
            'image' => ['.card-image img', '.product-image img'],
            'condition' => ['.condition', '.grade'],
            'rarity' => ['.rarity', '.rare-mark']
        ]
    ],
    
    // ============================================
    // 優先度中: 総合サイト
    // ============================================
    
    'hareruya3' => [
        'name' => '晴れる屋3',
        'platform_id' => 'hareruya3',
        'base_url' => 'https://www.hareruya3.com',
        'category' => 'Multi_TCG',
        'priority' => 'medium',
        'request_delay' => 2000,
        'timeout' => 30,
        'max_retries' => 3,
        'url_patterns' => [
            '/^https?:\/\/(?:www\.)?hareruya3\.com\/product/'
        ],
        'selectors' => [
            'title' => ['h1.product-name', '.item-title'],
            'price' => ['.price', '.product-price'],
            'stock' => ['.stock-status', '.availability'],
            'image' => ['.product-image img'],
            'condition' => ['.condition'],
            'rarity' => ['.rarity']
        ]
    ],
    
    'furu1' => [
        'name' => '駿河屋',
        'platform_id' => 'furu1',
        'base_url' => 'https://www.furu1.online',
        'category' => 'Multi_TCG',
        'priority' => 'medium',
        'request_delay' => 2000,
        'timeout' => 30,
        'max_retries' => 3,
        'url_patterns' => [
            '/^https?:\/\/(?:www\.)?furu1\.online\/category\/toreca\/pokemoncard/'
        ],
        'selectors' => [
            'title' => ['.item_title', 'h1.title', '.product-name'],
            'price' => ['.price', '.item-price', '.buy_price'],
            'stock' => ['.stock', '.zaiko', '.availability'],
            'image' => ['.item_img img', '.product-image img'],
            'condition' => ['.condition', '.status'],
            'rarity' => ['.rarity']
        ]
    ],
    
    'pokeca_net' => [
        'name' => 'ポケカネット',
        'platform_id' => 'pokeca_net',
        'base_url' => 'https://www.pokeca.net',
        'category' => 'Pokemon',
        'priority' => 'medium',
        'request_delay' => 1500,
        'timeout' => 30,
        'max_retries' => 3,
        'url_patterns' => [
            '/^https?:\/\/(?:www\.)?pokeca\.net\/product/'
        ],
        'selectors' => [
            'title' => ['h1.product-name', '.card-name'],
            'price' => ['.price', '.product-price'],
            'stock' => ['.stock', '.in-stock'],
            'image' => ['.product-image img'],
            'condition' => ['.condition'],
            'rarity' => ['.rarity']
        ]
    ],
    
    'dorasuta' => [
        'name' => 'ドラスタ',
        'platform_id' => 'dorasuta',
        'base_url' => 'https://dorasuta.jp',
        'category' => 'Multi_TCG',
        'priority' => 'medium',
        'request_delay' => 2000,
        'timeout' => 30,
        'max_retries' => 3,
        'url_patterns' => [
            '/^https?:\/\/dorasuta\.jp\/pokemon-card/'
        ],
        'selectors' => [
            'title' => ['h1.item-name', '.product-title'],
            'price' => ['.price', '.item-price'],
            'stock' => ['.stock-info', '.availability'],
            'image' => ['.item-image img'],
            'condition' => ['.condition'],
            'rarity' => ['.rarity']
        ]
    ],
    
    // ============================================
    // 優先度低: 特殊サイト
    // ============================================
    
    'snkrdunk' => [
        'name' => 'SNKRDUNK',
        'platform_id' => 'snkrdunk',
        'base_url' => 'https://snkrdunk.com',
        'category' => 'Pokemon',
        'priority' => 'low',
        'request_delay' => 2000,
        'timeout' => 30,
        'max_retries' => 3,
        'url_patterns' => [
            '/^https?:\/\/snkrdunk\.com\/brands\/pokemon/'
        ],
        'selectors' => [
            'title' => ['h1.product-name', '.item-title'],
            'price' => ['.price', '.current-price'],
            'stock' => ['.stock', '.availability'],
            'image' => ['.product-image img'],
            'condition' => ['.condition'],
            'rarity' => ['.rarity']
        ]
    ]
];
