<?php
/**
 * eBayマネージャー設定ファイル v2.0 (Hook統合版)
 * N3準拠モジュール設定
 */

if (!defined('SECURE_ACCESS')) die('Direct access not allowed');

return [
    'module_name' => 'ebay_manager',
    'display_name' => 'eBayデータベース管理',
    'version' => '2.0',
    'description' => 'eBayデータベース管理システム（Hook統合版）',
    
    // Hook統合設定
    'hook_integration' => [
        'security_core' => true,
        'error_prevention' => true,
        'code_quality_monitor' => true,
        'n3_mandatory_template' => true,
        'data_storage_integration' => true
    ],
    
    // N3準拠設定
    'n3_compliant' => true,
    'ajax_separated' => true,
    'csrf_protected' => true,
    
    // データベース設定
    'database' => [
        'type' => 'postgresql',
        'table' => 'ebay_inventory',
        'required_tables' => ['ebay_inventory']
    ],
    
    // API設定
    'api_endpoints' => [
        'fetch_data' => 'api/fetch_real_ebay_data.php',
        'check_status' => 'api/check_database_status.php'
    ],
    
    // セキュリティ設定
    'security' => [
        'csrf_protection' => true,
        'input_validation' => true,
        'proc_open_secure' => true,
        'hook_integrated' => true
    ],
    
    // 品質監視設定
    'quality_monitoring' => [
        'enabled' => true,
        'real_time' => true,
        'hook_integrated' => true
    ]
];
?>
