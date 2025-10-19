<?php
/**
 * バリデーション設定 - SaaS企業レベル
 * Netflix/Slack方式のアクション管理システム
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access denied');
}

return [
    // グローバルアクション（全ページで利用可能）
    'global_actions' => [
        'health_check',
        'toggle-theme',
        'toggle-notifications',
        'get_system_status'
    ],
    
    // ページ別権限設定（Netflix方式）
    'page_permissions' => [
        'kicho_content' => [
            'all_actions_allowed' => true,  // KICHO内の全アクション許可
            'rate_limit' => 100,
            'csrf_required' => true,
            'auth_required' => false  // 開発環境用
        ],
        
        'zaiko_content' => [
            'all_actions_allowed' => true,
            'rate_limit' => 100,
            'csrf_required' => true,
            'auth_required' => false
        ],
        
        'dashboard' => [
            'allowed_actions' => [
                'get_dashboard_stats',
                'refresh_widgets',
                'update_preferences'
            ],
            'rate_limit' => 50,
            'csrf_required' => true
        ]
    ],
    
    // セキュリティ設定（Slack方式）
    'security' => [
        'default_rate_limit' => 60,
        'max_request_size' => '10MB',
        'allowed_origins' => ['localhost', '127.0.0.1'],
        'csrf_exceptions' => ['health_check']  // 開発用例外
    ],
    
    // 開発環境設定
    'development' => [
        'debug_mode' => true,
        'detailed_errors' => true,
        'bypass_rate_limit' => true,
        'log_all_requests' => false
    ]
];
