<?php
/**
 * eBay API統合システム設定ファイル
 */

if (!defined('SECURE_ACCESS')) die('Direct access not allowed');

return [
    'tool_name' => 'ebay_api_integration',
    'display_name' => 'eBay API統合システム',
    'description' => 'Hook統合による完全eBay APIシステム - リアルタイムデータ取得・PostgreSQL保存',
    'version' => '1.0',
    'n3_compliant' => true,
    'ajax_separated' => true,
    'hook_integrated' => true,
    'capabilities' => [
        'real_time_api_fetch',
        'differential_update', 
        'adjustable_limits',
        'hook_security_integration',
        'postgresql_storage'
    ],
    'required_hooks' => [
        'ebay_api_postgresql_integration_hook.py',
        'security_core_hook.py',
        'error_prevention_hook.py'
    ],
    'database' => [
        'type' => 'postgresql',
        'table' => 'ebay_inventory',
        'host' => 'localhost',
        'port' => 5432,
        'database' => 'nagano3_db'
    ],
    'api_limits' => [
        'min_fetch' => 10,
        'max_fetch' => 200,
        'default_fetch' => 50
    ],
    'security' => [
        'csrf_protection' => true,
        'rate_limiting' => true,
        'input_validation' => true,
        'hook_security' => true
    ]
];
?>
