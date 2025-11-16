<?php
/**
 * 08_wisdom_core モジュール設定
 * 開発ナレッジ事典 (Wisdom Core)
 */

return [
    'module_name' => '08_wisdom_core',
    'module_title' => '開発ナレッジ事典 (Wisdom Core)',
    'version' => '1.0.0',
    'description' => 'AI協調型コードベース理解システム',
    
    'database' => [
        'table' => 'code_map',
        'history_table' => 'code_map_history',
        'primary_key' => 'id'
    ],
    
    'scan' => [
        'base_path' => '/Users/aritahiroaki/n3-frontend_new',
        'target_extensions' => ['.php', '.js', '.jsx', '.css', '.md', '.sql', '.json'],
        'exclude_dirs' => ['node_modules', '.next', '.git', 'vendor', 'dist', 'build'],
        'exclude_files' => ['.DS_Store', 'package-lock.json'],
        'max_file_size' => 1048576, // 1MB
    ],
    
    'categories' => [
        'dashboard' => 'ダッシュボード',
        'scraping' => 'データ収集',
        'editing' => 'データ編集',
        'approval' => '承認管理',
        'listing' => '出品管理',
        'api' => 'APIエンドポイント',
        'class' => 'ロジッククラス',
        'config' => '設定ファイル',
        'ui' => 'UIコンポーネント',
        'database' => 'データベース',
        'shared' => '共有ライブラリ',
        'unknown' => '未分類'
    ],
    
    'features' => [
        'auto_scan' => true,
        'diff_detection' => true,
        'export_json' => true,
        'search' => true,
        'copy_for_ai' => true,
        'syntax_highlight' => true
    ],
    
    'ui' => [
        'items_per_page' => 50,
        'tree_max_depth' => 5,
        'preview_lines' => 20
    ]
];
?>
