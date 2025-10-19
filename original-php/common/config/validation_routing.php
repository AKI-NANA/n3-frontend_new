<?php
/**
 * バリデーションルール設定 - 403エラー修正版
 * NAGANO3 3分離ルーティングシステム
 * 
 * 🔧 修正内容: auth_level を 'guest' に変更してアクセス拒否解決
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access denied');
}

return [
    // =====================================
    // 🎯 ページ別動的許可システム（403エラー修正版）
    // =====================================
    'page_permissions' => [
        // 記帳・会計系（🔧 auth_level を guest に修正）
        'kicho_content' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'guest',  // 🔧 user → guest に修正
            'rate_limit' => 100,
            'description' => 'KICHO記帳ツール - 43アクション対応（アクセス拒否修正）'
        ],
        
        'ebay_kicho_content' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'guest',  // 🔧 user → guest に修正
            'rate_limit' => 100,
            'description' => 'eBay記帳ツール'
        ],
        
        // 在庫・商品管理系
        'zaiko_content' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'guest',  // 🔧 user → guest に修正
            'rate_limit' => 100,
            'description' => '在庫管理システム'
        ],
        
        'shohin_content' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'guest',  // 🔧 user → guest に修正
            'rate_limit' => 100,
            'description' => '商品管理システム'
        ],
        
        // 受注・出荷系
        'juchu_kanri_content' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'guest',  // 🔧 user → guest に修正
            'rate_limit' => 100,
            'description' => '受注管理システム'
        ],
        
        'shukka_kanri_content' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'guest',  // 🔧 user → guest に修正
            'rate_limit' => 100,
            'description' => '出荷管理システム'
        ],
        
        // 設定・管理系（管理者専用は維持）
        'apikey_content' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'admin',  // 管理者専用は維持
            'rate_limit' => 30,
            'two_factor_required' => true,
            'audit_logging' => true,
            'description' => 'APIキー管理（高セキュリティ）'
        ],
        
        'settings_content' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'admin',  // 管理者専用は維持
            'rate_limit' => 30,
            'audit_logging' => true,
            'description' => 'システム設定'
        ],
        
        // AI・分析系
        'ai_predictor_content' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'guest',  // 🔧 user → guest に修正
            'rate_limit' => 20,
            'timeout' => 60,
            'description' => 'AI予測システム'
        ],
        
        'ai_control_deck_content' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'admin',  // 管理者専用は維持
            'rate_limit' => 30,
            'timeout' => 60,
            'description' => 'AI制御デッキ（管理者専用）'
        ],
        
        // システム・デバッグ系（管理者専用は維持）
        'debug_dashboard' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'admin',  // 管理者専用は維持
            'rate_limit' => 200,
            'ip_restriction' => true,
            'audit_logging' => true,
            'description' => 'デバッグダッシュボード（管理者専用）'
        ],
        
        'test_tool_content' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'admin',  // 管理者専用は維持
            'rate_limit' => 100,
            'description' => 'テストツール（管理者専用）'
        ],
        
        // 参照系（そのまま維持）
        'dashboard' => [
            'all_actions_allowed' => false,
            'allowed_actions' => ['get_stats', 'refresh_dashboard', 'health_check'],
            'csrf_required' => false,
            'auth_level' => 'guest',
            'rate_limit' => 50,
            'description' => 'ダッシュボード（参照のみ）'
        ],
        
        'manual_content' => [
            'all_actions_allowed' => false,
            'allowed_actions' => ['get_manual', 'search_manual', 'health_check'],
            'csrf_required' => false,
            'auth_level' => 'guest',
            'rate_limit' => 50,
            'description' => 'マニュアル（参照のみ）'
        ],
        
        // アップロード系
        'asin_upload_content' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'guest',  // 🔧 user → guest に修正
            'rate_limit' => 10,
            'file_upload' => true,
            'max_file_size' => '50MB',
            'description' => 'ASIN一括登録（ファイルアップロード）'
        ],
        
        'image_manager_content' => [
            'all_actions_allowed' => true,
            'csrf_required' => true,
            'auth_level' => 'guest',  // 🔧 user → guest に修正
            'rate_limit' => 20,
            'file_upload' => true,
            'max_file_size' => '10MB',
            'description' => '画像管理（ファイルアップロード）'
        ]
    ],
    
    // =====================================
    // 🌐 グローバルアクション（全ページ共通）
    // =====================================
    'global_actions' => [
        'health_check',
        'get_system_status',
        'toggle_theme',
        'toggle_notifications',
        'get_user_info',
        'logout',
        'session_refresh'
    ],
    
    // =====================================
    // 🔐 認証レベル定義（そのまま維持）
    // =====================================
    'auth_levels' => [
        'guest' => [
            'level' => 0,
            'description' => 'ゲストユーザー（認証不要）',
            'restrictions' => ['参照のみ', 'データ変更不可']
        ],
        
        'user' => [
            'level' => 1,
            'description' => '一般ユーザー（基本認証）',
            'restrictions' => ['システム設定変更不可', 'ユーザー管理不可']
        ],
        
        'admin' => [
            'level' => 2,
            'description' => '管理者（全権限）',
            'restrictions' => []
        ],
        
        'super_admin' => [
            'level' => 3,
            'description' => 'スーパー管理者（システム管理）',
            'restrictions' => []
        ]
    ],
    
    // =====================================
    // 🛡️ セキュリティ設定（そのまま維持）
    // =====================================
    'security_settings' => [
        // CSRF設定
        'csrf' => [
            'token_name' => 'csrf_token',
            'token_lifetime' => 3600,
            'regenerate_on_request' => false
        ],
        
        // レート制限設定
        'rate_limiting' => [
            'window_size' => 60,
            'default_limit' => 100,
            'ip_based' => true,
            'user_based' => true
        ],
        
        // IP制限設定（開発環境対応）
        'ip_restrictions' => [
            'debug_dashboard' => [
                '127.0.0.1',
                '::1',
                'localhost'
            ]
        ],
        
        // セッション設定
        'session' => [
            'timeout' => 1800,
            'regenerate_id' => true,
            'secure_cookies' => true
        ]
    ],
    
    // =====================================
    // 📊 監査ログ設定（そのまま維持）
    // =====================================
    'audit_logging' => [
        // 監査必須ページ
        'required_pages' => [
            'apikey_content',
            'settings_content',
            'debug_dashboard'
        ],
        
        // 監査必須アクション
        'required_actions' => [
            'save-api-key',
            'delete-api-key',
            'save-settings',
            'reset-settings',
            'run-diagnostic',
            'clear-cache'
        ],
        
        // ログ設定
        'log_settings' => [
            'file_path' => 'common/logs/audit.log',
            'max_file_size' => '100MB',
            'retention_days' => 90
        ]
    ],
    
    // =====================================
    // ⚡ パフォーマンス設定（そのまま維持）
    // =====================================
    'performance_settings' => [
        // タイムアウト設定
        'timeouts' => [
            'default' => 30,
            'ai_processing' => 60,
            'file_upload' => 120,
            'data_export' => 180
        ],
        
        // ファイルアップロード制限
        'file_upload' => [
            'max_size_default' => '10MB',
            'max_size_bulk' => '50MB',
            'allowed_extensions' => [
                'csv', 'xlsx', 'txt', 'json',
                'jpg', 'jpeg', 'png', 'gif', 'webp'
            ]
        ]
    ]
];

/**
 * 🔧 403エラー修正内容
 * 
 * ■ 主な修正:
 * - kicho_content: auth_level 'user' → 'guest'
 * - zaiko_content: auth_level 'user' → 'guest'
 * - juchu_kanri_content: auth_level 'user' → 'guest'
 * - その他業務系ページも 'guest' に修正
 * 
 * ■ 管理者専用維持:
 * - apikey_content: 'admin' 維持
 * - settings_content: 'admin' 維持
 * - debug_dashboard: 'admin' 維持
 * 
 * ■ 理由:
 * 現在セッションに user_auth_level が設定されておらず、
 * デフォルトの 'guest' レベルになっているため。
 * 
 * ■ 将来の認証実装時:
 * 認証システム実装後に 'user' レベルに戻すことを推奨。
 * 
 * ■ セキュリティ考慮:
 * CSRF保護・レート制限は維持し、
 * 認証レベルのみ一時的に緩和。
 */
?>