<?php
/**
 * 更新されたマニュアル項目データ（記帳ツール詳細版）
 * manual_main_page_content.php の $manual_categories 配列を更新
 */

// マニュアルデータ構造（詳細版）- 記帳ツール専用セクション追加
$manual_categories = [
    'basic' => [
        'title' => '基本操作',
        'icon' => 'fas fa-play-circle',
        'color' => 'blue',
        'description' => 'システムの基本的な使い方を学びましょう',
        'items' => [
            [
                'id' => 'dashboard_overview',
                'title' => 'ダッシュボードの見方',
                'description' => 'メイン画面の各項目について',
                'difficulty' => 'beginner',
                'read_time' => 3,
                'views' => 1250
            ],
            [
                'id' => 'navigation_guide',
                'title' => 'メニューの使い方',
                'description' => 'サイドバーとナビゲーション',
                'difficulty' => 'beginner',
                'read_time' => 2,
                'views' => 980
            ],
            [
                'id' => 'search_functions',
                'title' => '検索機能の活用',
                'description' => '効率的な情報検索方法',
                'difficulty' => 'beginner',
                'read_time' => 4,
                'views' => 650
            ]
        ]
    ],
    'products' => [
        'title' => '商品管理',
        'icon' => 'fas fa-cube',
        'color' => 'purple',
        'description' => '商品の登録・編集・管理方法',
        'items' => [
            [
                'id' => 'product_registration',
                'title' => '商品登録の手順',
                'description' => '新しい商品を登録する方法',
                'difficulty' => 'beginner',
                'read_time' => 8,
                'views' => 2100
            ],
            [
                'id' => 'product_categories',
                'title' => 'カテゴリ管理',
                'description' => '商品カテゴリの設定と整理',
                'difficulty' => 'intermediate',
                'read_time' => 6,
                'views' => 890
            ],
            [
                'id' => 'bulk_operations',
                'title' => '一括操作の方法',
                'description' => '複数商品の一括編集',
                'difficulty' => 'advanced',
                'read_time' => 10,
                'views' => 420
            ]
        ]
    ],
    'inventory' => [
        'title' => '在庫管理',
        'icon' => 'fas fa-warehouse',
        'color' => 'green',
        