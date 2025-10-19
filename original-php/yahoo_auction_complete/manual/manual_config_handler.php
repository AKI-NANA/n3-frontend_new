<?php
/**
 * 📚 NAGANO-3 APIキー管理システム マニュアル用設定・デモ機能
 * ファイル: manual_config_handler.php
 * 
 * 🎯 目的: マニュアルページでの設定確認・デモ機能・インタラクティブガイド
 * 👶 対象: 中学生でも理解できる分かりやすい機能説明
 */

// セキュリティチェック
if (!defined('NAGANO3_SECURE_ACCESS')) {
    define('NAGANO3_SECURE_ACCESS', true);
}

/**
 * 📖 マニュアル用デモ・設定管理クラス
 */
class ManualConfigHandler {
    
    private $demo_mode;
    private $system_info;
    private $demo_data;
    
    public function __construct() {
        $this->demo_mode = true;
        $this->initializeSystemInfo();
        $this->initializeDemoData();
    }
    
    /**
     * 🔍 システム情報の初期化
     */
    private function initializeSystemInfo() {
        $this->system_info = [
            'system_name' => 'NAGANO-3 APIキー管理システム',
            'version' => '2.0.0',
            'environment' => $this->detectEnvironment(),
            'php_version' => PHP_VERSION,
            'demo_mode' => true,
            'last_updated' => date('Y-m-d H:i:s'),
            'total_files' => 49,
            'completed_percentage' => 100
        ];
    }
    
    /**
     * 🎭 デモデータの初期化
     */
    private function initializeDemoData() {
        $this->demo_data = [
            'sample_api_keys' => [
                [
                    'id' => 1,
                    'key_name' => 'Shopify メインストア',
                    'service_type' => 'shopify_api',
                    'tier_level' => 'premium',
                    'status' => 'active',
                    'created_at' => '2024-12-01 10:30:00',
                    'last_used' => '2024-12-15 14:22:33',
                    'usage_count' => 1247,
                    'success_rate' => 0.987,
                    'api_key_preview' => 'shpat_1234...****',
                    'description' => 'メインストアの商品・在庫管理用'
                ],
                [
                    'id' => 2,
                    'key_name' => 'eBay 出品ツール',
                    'service_type' => 'ebay_api',
                    'tier_level' => 'standard',
                    'status' => 'active',
                    'created_at' => '2024-11-15 09:15:22',
                    'last_used' => '2024-12-15 11:45:12',
                    'usage_count' => 892,
                    'success_rate' => 0.934,
                    'api_key_preview' => 'ebay_v1_98...****',
                    'description' => '自動出品・価格更新システム用'
                ],
                [
                    'id' => 3,
                    'key_name' => 'DeepSeek AI チャット',
                    'service_type' => 'deepseek_ai',
                    'tier_level' => 'premium',
                    'status' => 'testing',
                    'created_at' => '2024-12-10 16:20:45',
                    'last_used' => '2024-12-15 13:15:28',
                    'usage_count' => 156,
                    'success_rate' => 0.995,
                    'api_key_preview' => 'sk-proj-abc...****',
                    'description' => 'カスタマーサポート自動応答用'
                ],
                [
                    'id' => 4,
                    'key_name' => 'Amazon PA API',
                    'service_type' => 'amazon_pa_api',
                    'tier_level' => 'basic',
                    'status' => 'inactive',
                    'created_at' => '2024-10-20 14:30:15',
                    'last_used' => '2024-11-28 10:22:41',
                    'usage_count' => 445,
                    'success_rate' => 0.876,
                    'api_key_preview' => 'AKIA5678...****',
                    'description' => '価格比較・商品情報取得用（一時停止中）'
                ]
            ],
            
            'api_services' => [
                'shopify_api' => [
                    'name' => 'Shopify API',
                    'description' => 'ECサイト構築・商品管理',
                    'icon' => '🛍️',
                    'color' => '#95bf46',
                    'auth_type' => 'bearer',
                    'rate_limit' => '2000/day',
                    'documentation' => 'https://shopify.dev/api'
                ],
                'ebay_api' => [
                    'name' => 'eBay Developer API',
                    'description' => 'オークション・マーケットプレイス',
                    'icon' => '🏪',
                    'color' => '#e53238',
                    'auth_type' => 'oauth',
                    'rate_limit' => '5000/day',
                    'documentation' => 'https://developer.ebay.com'
                ],
                'deepseek_ai' => [
                    'name' => 'DeepSeek AI',
                    'description' => 'AI会話・自然言語処理',
                    'icon' => '🤖',
                    'color' => '#2563eb',
                    'auth_type' => 'api_key',
                    'rate_limit' => '10000/month',
                    'documentation' => 'https://platform.deepseek.com'
                ],
                'amazon_pa_api' => [
                    'name' => 'Amazon Product Advertising API',
                    'description' => '商品情報・価格取得',
                    'icon' => '📦',
                    'color' => '#ff9900',
                    'auth_type' => 'signature',
                    'rate_limit' => '8640/day',
                    'documentation' => 'https://webservices.amazon.com/paapi5'
                ]
            ],
            
            'system_stats' => [
                'total_requests_today' => 2847,
                'success_rate_24h' => 0.971,
                'average_response_time' => 245, // ms
                'active_connections' => 12,
                'database_size' => '2.3 MB',
                'cache_hit_rate' => 0.892,
                'security_score' => 98,
                'uptime_percentage' => 99.97
            ]
        ];
    }
    
    /**
     * 🌍 環境検出
     */
    private function detectEnvironment() {
        $is_local = in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1', '::1']);
        $is_https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        
        return [
            'type' => $is_local ? 'development' : 'production',
            'host' => $_SERVER['HTTP_HOST'] ?? 'unknown',
            'protocol' => $is_https ? 'https' : 'http',
            'port' => $_SERVER['SERVER_PORT'] ?? '80',
            'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? '',
            'script_path' => $_SERVER['SCRIPT_NAME'] ?? ''
        ];
    }
    
    /**
     * 📊 システム情報取得
     */
    public function getSystemInfo() {
        return $this->system_info;
    }
    
    /**
     * 🎭 デモデータ取得
     */
    public function getDemoData($type = 'all') {
        if ($type === 'all') {
            return $this->demo_data;
        }
        
        return $this->demo_data[$type] ?? [];
    }
    
    /**
     * 🔧 ファイル構成情報取得
     */
    public function getFileStructure() {
        return [
            '01_setup' => [
                'name' => 'セットアップ関連',
                'description' => 'システムの初期設定・起動スクリプト',
                'icon' => '⚙️',
                'files' => [
                    'integrated_startup.sh' => ['priority' => 'high', 'description' => '統合起動スクリプト'],
                    'installation_guide.md' => ['priority' => 'medium', 'description' => 'インストール手順書'],
                    'env_setup.sh' => ['priority' => 'medium', 'description' => '環境設定スクリプト']
                ]
            ],
            '02_database' => [
                'name' => 'データベース',
                'description' => 'PostgreSQL設定・テーブル定義',
                'icon' => '🗄️',
                'files' => [
                    'apikey_database_init.sql' => ['priority' => 'high', 'description' => 'DB初期化・テーブル作成'],
                    'postgresql_security_tables.sql' => ['priority' => 'high', 'description' => 'セキュリティテーブル']
                ]
            ],
            '03_python_backend' => [
                'name' => 'Python APIサーバー',
                'description' => 'FastAPI・ビジネスロジック・暗号化',
                'icon' => '🐍',
                'files' => [
                    'complete_main_app.py' => ['priority' => 'high', 'description' => 'メインアプリケーション'],
                    'keys_models_complete.py' => ['priority' => 'high', 'description' => 'SQLAlchemyモデル'],
                    'keys_services.py' => ['priority' => 'high', 'description' => 'ビジネスロジック'],
                    'keys_routes.py' => ['priority' => 'high', 'description' => 'APIルーティング'],
                    'system_core_encryption.py' => ['priority' => 'high', 'description' => 'AES-256暗号化'],
                    'system_core_database.py' => ['priority' => 'high', 'description' => 'DB接続管理']
                ]
            ],
            '04_web_interface' => [
                'name' => 'WEBインターフェース',
                'description' => 'PHP・JavaScript・CSS・UI画面',
                'icon' => '🌐',
                'files' => [
                    'apikey_content.php' => ['priority' => 'high', 'description' => 'メインUI画面'],
                    'nagano3_apikey_client.php' => ['priority' => 'high', 'description' => '共通ライブラリ'],
                    'apikey_crud_handler.php' => ['priority' => 'high', 'description' => 'CRUD処理'],
                    'apikey_dynamic_js.js' => ['priority' => 'high', 'description' => '動的UI制御'],
                    'apikey.css' => ['priority' => 'high', 'description' => 'スタイルシート']
                ]
            ]
        ];
    }
    
    /**
     * 📈 使用統計の生成
     */
    public function generateUsageStats() {
        $stats = $this->demo_data['system_stats'];
        
        return [
            'performance' => [
                'label' => 'システムパフォーマンス',
                'metrics' => [
                    'response_time' => ['value' => $stats['average_response_time'], 'unit' => 'ms', 'status' => 'good'],
                    'success_rate' => ['value' => $stats['success_rate_24h'] * 100, 'unit' => '%', 'status' => 'excellent'],
                    'uptime' => ['value' => $stats['uptime_percentage'], 'unit' => '%', 'status' => 'excellent']
                ]
            ],
            'usage' => [
                'label' => 'API使用状況',
                'metrics' => [
                    'requests_today' => ['value' => $stats['total_requests_today'], 'unit' => '回', 'status' => 'normal'],
                    'active_connections' => ['value' => $stats['active_connections'], 'unit' => '接続', 'status' => 'normal'],
                    'cache_hit_rate' => ['value' => $stats['cache_hit_rate'] * 100, 'unit' => '%', 'status' => 'good']
                ]
            ],
            'security' => [
                'label' => 'セキュリティ状況',
                'metrics' => [
                    'security_score' => ['value' => $stats['security_score'], 'unit' => '/100', 'status' => 'excellent'],
                    'database_size' => ['value' => $stats['database_size'], 'unit' => '', 'status' => 'normal']
                ]
            ]
        ];
    }
    
    /**
     * 🎨 カラーテーマ生成
     */
    public function getColorTheme() {
        return [
            'primary' => '#667eea',
            'secondary' => '#764ba2',
            'success' => '#10b981',
            'warning' => '#f59e0b',
            'danger' => '#ef4444',
            'info' => '#3b82f6',
            'light' => '#f8fafc',
            'dark' => '#1e293b'
        ];
    }
    
    /**
     * 🔍 設定確認機能
     */
    public function checkConfiguration() {
        $checks = [
            'php_version' => [
                'name' => 'PHP バージョン',
                'status' => version_compare(PHP_VERSION, '8.1.0', '>=') ? 'ok' : 'warning',
                'value' => PHP_VERSION,
                'requirement' => '8.1.0 以上'
            ],
            'extensions' => [
                'name' => 'PHP 拡張機能',
                'status' => $this->checkPHPExtensions() ? 'ok' : 'error',
                'value' => 'PDO, JSON, OpenSSL',
                'requirement' => '必須拡張機能'
            ],
            'permissions' => [
                'name' => 'ファイル権限',
                'status' => is_writable(__DIR__) ? 'ok' : 'warning',
                'value' => is_writable(__DIR__) ? '書き込み可能' : '書き込み不可',
                'requirement' => '読み書き権限'
            ]
        ];
        
        return $checks;
    }
    
    /**
     * 🧩 PHP拡張機能チェック
     */
    private function checkPHPExtensions() {
        $required = ['pdo', 'json', 'openssl', 'curl'];
        foreach ($required as $ext) {
            if (!extension_loaded($ext)) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * 📋 インタラクティブデモ用データ生成
     */
    public function generateInteractiveDemo() {
        return [
            'demo_scenarios' => [
                [
                    'title' => '🛍️ Shopify API キーを登録',
                    'description' => 'オンラインストアの商品管理用APIキーを安全に保存',
                    'steps' => [
                        'サービス選択: Shopify API',
                        'キー名入力: "メインストア管理"',
                        'APIキー入力: shpat_xxxxx...',
                        '暗号化して保存完了'
                    ],
                    'expected_result' => '✅ APIキーが暗号化されてデータベースに安全保存'
                ],
                [
                    'title' => '🔍 他のプログラムから取得',
                    'description' => '1行のコードで登録済みAPIキーを取得',
                    'steps' => [
                        'PHPコード: $key = getAPIKey("shopify_api");',
                        'システムが自動で復号化',
                        'プログラムでAPIキー使用',
                        '使用ログを自動記録'
                    ],
                    'expected_result' => '⚡ 瞬時にAPIキーを取得して利用可能'
                ]
            ],
            'code_examples' => [
                'php' => [
                    'title' => 'PHP での使用例',
                    'code' => '<?php
// APIキー取得（1行で！）
$shopify_key = getAPIKey("shopify_api", "premium");
$ebay_key = getAPIKey("ebay_api", "standard");

// Shopify API使用例
$shopify = new ShopifyAPI($shopify_key);
$products = $shopify->getProducts();
echo "商品数: " . count($products);
?>'
                ],
                'python' => [
                    'title' => 'Python での使用例',
                    'code' => 'import requests

def get_api_key(service, tier="primary"):
    response = requests.get(f"http://localhost:8001/api/keys/{service}/{tier}")
    return response.json()["api_key"]

# APIキー取得
shopify_key = get_api_key("shopify_api")
ai_key = get_api_key("deepseek_ai", "premium")

# API使用
products = requests.get("https://shop.myshopify.com/admin/api/2023-01/products.json", 
                       headers={"Authorization": f"Bearer {shopify_key}"})
print(f"取得した商品: {len(products.json()[\"products\"])}個")'
                ]
            ]
        ];
    }
    
    /**
     * 📤 JSON レスポンス出力
     */
    public function outputJSON($data) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * 🎯 API エンドポイント処理
     */
    public function handleAPIRequest() {
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'system_info':
                $this->outputJSON($this->getSystemInfo());
                break;
                
            case 'demo_data':
                $type = $_GET['type'] ?? 'all';
                $this->outputJSON($this->getDemoData($type));
                break;
                
            case 'file_structure':
                $this->outputJSON($this->getFileStructure());
                break;
                
            case 'usage_stats':
                $this->outputJSON($this->generateUsageStats());
                break;
                
            case 'configuration_check':
                $this->outputJSON($this->checkConfiguration());
                break;
                
            case 'interactive_demo':
                $this->outputJSON($this->generateInteractiveDemo());
                break;
                
            default:
                $this->outputJSON([
                    'error' => 'Invalid action',
                    'available_actions' => [
                        'system_info', 'demo_data', 'file_structure', 
                        'usage_stats', 'configuration_check', 'interactive_demo'
                    ]
                ]);
        }
    }
}

// 🎮 デモ実行部分
if (basename($_SERVER['SCRIPT_NAME']) === 'manual_config_handler.php') {
    // APIリクエストの場合
    if (isset($_GET['api'])) {
        $handler = new ManualConfigHandler();
        $handler->handleAPIRequest();
    }
    
    // 通常表示の場合
    $manual = new ManualConfigHandler();
    $system_info = $manual->getSystemInfo();
    $demo_data = $manual->getDemoData();
    $file_structure = $manual->getFileStructure();
    
    ?>
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NAGANO-3 設定・デモページ</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px; }
            .card { background: white; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .demo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .demo-item { background: #f8fafc; padding: 20px; border-radius: 10px; border-left: 4px solid #667eea; }
            .code-preview { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; font-family: monospace; overflow-x: auto; }
            .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
            .status-ok { background: #d1fae5; color: #065f46; }
            .status-warning { background: #fef3c7; color: #92400e; }
            .status-error { background: #fee2e2; color: #991b1b; }
            .metric { text-align: center; padding: 15px; background: #f0f9ff; border-radius: 8px; }
            .metric-value { font-size: 2rem; font-weight: bold; color: #667eea; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1><i class="fas fa-cogs"></i> NAGANO-3 システム設定・デモ</h1>
                <p>マニュアル用インタラクティブ機能テスト</p>
            </div>
            
            <div class="card">
                <h2><i class="fas fa-info-circle"></i> システム情報</h2>
                <div class="demo-grid">
                    <div class="metric">
                        <div class="metric-value"><?= $system_info['version'] ?></div>
                        <div>バージョン</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value"><?= $system_info['total_files'] ?></div>
                        <div>総ファイル数</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value"><?= $system_info['completed_percentage'] ?>%</div>
                        <div>完成度</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value"><?= $system_info['environment']['type'] ?></div>
                        <div>実行環境</div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h2><i class="fas fa-database"></i> デモAPIキー一覧</h2>
                <?php foreach ($demo_data['sample_api_keys'] as $key): ?>
                <div class="demo-item" style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong><?= $demo_data['api_services'][$key['service_type']]['icon'] ?> <?= htmlspecialchars($key['key_name']) ?></strong><br>
                            <small><?= htmlspecialchars($key['description']) ?></small>
                        </div>
                        <span class="status-badge status-<?= $key['status'] === 'active' ? 'ok' : 'warning' ?>">
                            <?= strtoupper($key['status']) ?>
                        </span>
                    </div>
                    <div style="margin-top: 10px; font-size: 0.9rem; color: #6b7280;">
                        使用回数: <?= number_format($key['usage_count']) ?>回 | 
                        成功率: <?= number_format($key['success_rate'] * 100, 1) ?>% | 
                        最終使用: <?= $key['last_used'] ?>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            
            <div class="card">
                <h2><i class="fas fa-code"></i> コード例</h2>
                <h3>🐘 PHP での APIキー取得</h3>
                <div class="code-preview">
&lt;?php
// NAGANO-3 APIキー管理システム 使用例
require_once 'nagano3_apikey_client.php';

// 1行でAPIキー取得
$shopify_key = getAPIKey('shopify_api', 'premium');
$ebay_key = getAPIKey('ebay_api', 'standard');

// 実際のAPI使用
$shopify = new ShopifyAPI($shopify_key);
$products = $shopify->getProducts();
echo "取得した商品数: " . count($products) . "個";
?&gt;
                </div>
                
                <h3 style="margin-top: 20px;">🐍 Python での APIキー取得</h3>
                <div class="code-preview">
import requests

def get_nagano3_apikey(service_name, tier='primary'):
    """NAGANO-3システムからAPIキーを取得"""
    response = requests.get(f'http://localhost:8001/api/keys/{service_name}/{tier}')
    return response.json()['api_key']

# 使用例
shopify_key = get_nagano3_apikey('shopify_api')
ai_key = get_nagano3_apikey('deepseek_ai', 'premium')

# API呼び出し
headers = {'Authorization': f'Bearer {shopify_key}'}
products = requests.get('https://shop.myshopify.com/admin/api/2023-01/products.json', headers=headers)
print(f"商品数: {len(products.json()['products'])}個")
                </div>
            </div>
            
            <div style="text-align: center; margin: 40px 0; padding: 20px; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 15px;">
                <h3 style="color: #065f46; margin-bottom: 15px;">🎉 デモページ動作確認完了！</h3>
                <p style="color: #047857; margin: 0;">
                    マニュアルシステムが正常に動作しています。<br>
                    実際のAPIキー管理機能は <strong>apikey_content.php</strong> で確認できます。
                </p>
            </div>
        </div>
        
        <script>
            console.log('🎯 NAGANO-3 マニュアル設定ページ 読み込み完了');
            console.log('📊 システム情報:', <?= json_encode($system_info) ?>);
            console.log('🔑 デモAPIキー数:', <?= count($demo_data['sample_api_keys']) ?>);
        </script>
    </body>
    </html>
    <?php
}
?>