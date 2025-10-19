<?php
/**
 * N3準拠 Ajax Routing Configuration
 * PostgreSQL eBay統合版対応
 */

return [
    'tanaoroshi_inline_complete' => [
        'handler' => 'modules/tanaoroshi/tanaoroshi_ajax_handler.php',
        'actions' => ['get_inventory', 'health_check', 'search_inventory', 'add_item', 'update_item', 'full_sync', 'sync_single_item', 'get_system_status']
    ],
    'tanaoroshi_postgresql_ebay' => [
        'handler' => 'modules/tanaoroshi/tanaoroshi_ajax_handler_postgresql_ebay.php',
        'actions' => ['get_inventory', 'sync_ebay_data', 'database_status', 'health_check']
    ],
    'maru9_tool' => [
        'handler' => 'modules/maru9_tool/maru9_ajax_handler.php',
        'actions' => ['process_csv', 'get_status', 'health_check']
    ],
    'ebay_inventory' => [
        'handler' => 'modules/ebay_inventory/ebay_ajax_handler.php',
        'actions' => ['get_inventory', 'sync_data', 'health_check']
    ],
    'ebay_api_integration' => [
        'handler' => 'modules/ebay_api_integration/ajax_handler.php',
        'actions' => ['fetch_ebay_data', 'get_integration_status', 'test_connection', 'get_inventory_stats']
    ]
];
?>