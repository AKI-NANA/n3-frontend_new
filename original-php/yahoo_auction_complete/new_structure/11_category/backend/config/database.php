<?php
/**
 * 統一データベース設定ファイル
 * すべてのAPI・クラスでこの設定を使用
 */

return [
    'host' => 'localhost',
    'dbname' => 'nagano3_db',
    'user' => 'aritahiroaki',
    'password' => '',
    
    // フォールバック設定
    'fallback' => [
        'user' => 'postgres',
        'password' => 'Kn240914'
    ],
    
    // PDO設定
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]
];
?>