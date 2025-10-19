<?php
/**
 * NAGANO3 緊急修復版 index.php
 * クルクル問題完全解決版
 */

// =====================================
// 🛡️ 基本セキュリティ設定
// =====================================
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// セッション開始
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 環境設定
$is_development = in_array($_SERVER['HTTP_HOST'] ?? 'localhost', ['localhost', '127.0.0.1']);

if ($is_development) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// CSRF トークン設定
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// 開発環境自動認証
if ($is_development && !isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 'dev_user';
    $_SESSION['username'] = 'developer';
    $_SESSION['user_role'] = 'admin';
}

// =====================================
// 🎯 Ajax処理（完全ルーティング統合版）
// =====================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['action'])) {
    header('Content-Type: application/json; charset=UTF-8');
    
    $action = $_POST['action'] ?? '';
    $page = $_GET['page'] ?? 'system';
    
    try {
        // ルーティング設定読み込み
        $routing_config = null;
        if (file_exists('common/config/ajax_routing.php')) {
            $routing_config = include 'common/config/ajax_routing.php';
        }
        
        // ルーティング判定
        $routed = false;
        if ($routing_config && isset($routing_config[$page])) {
            $page_config = $routing_config[$page];
            
            // アクションがページ専用のものか確認
            if (isset($page_config['actions']) && in_array($action, $page_config['actions'])) {
                $handler_file = $page_config['handler'];
                
                if (file_exists($handler_file)) {
                    // 専用ハンドラーに転送
                    define('_ROUTED_FROM_INDEX', true);
                    $_POST['_routed_from'] = 'index.php';
                    $_POST['_routed_page'] = $page;
                    
                    ob_start();
                    include $handler_file;
                    $output = ob_get_clean();
                    
                    // JSON出力確認
                    $json_result = json_decode($output, true);
                    if ($json_result) {
                        echo $output;
                    } else {
                        echo json_encode([
                            'success' => true,
                            'message' => "Handler executed: {$action}",
                            'output' => $output,
                            'routed_from' => 'index.php',
                            'handler' => basename($handler_file)
                        ], JSON_UNESCAPED_UNICODE);
                    }
                    
                    $routed = true;
                }
            }
        }
        
        // ルーティング失敗時は既存処理
        if (!$routed) {
            switch ($action) {
                case 'health_check':
                    $result = [
                        'success' => true,
                        'message' => 'システム正常',
                        'data' => [
                            'status' => 'healthy',
                            'timestamp' => date('Y-m-d H:i:s')
                        ]
                    ];
                    break;
                    
                case 'get_statistics':
                    $result = [
                        'success' => true,
                        'data' => [
                            'total_transactions' => 156,
                            'pending_count' => 23,
                            'approved_count' => 98
                        ]
                    ];
                    break;
                    
                default:
                    $result = [
                        'success' => true,
                        'message' => "アクション '{$action}' を実行しました",
                        'data' => ['action' => $action],
                        'note' => 'ルーティング設定に該当なし - デフォルト処理',
                        'debug_info' => [
                            'page' => $page,
                            'routing_config_loaded' => $routing_config !== null,
                            'available_pages' => $routing_config ? array_keys($routing_config) : []
                        ]
                    ];
            }
            
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
        }
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'debug_info' => [
                'action' => $action,
                'page' => $page,
                'file' => basename($e->getFile()),
                'line' => $e->getLine()
            ]
        ], JSON_UNESCAPED_UNICODE);
    }
    
    exit;
}

// =====================================
// 🌐 ページ処理
// =====================================
$page = $_GET['page'] ?? 'dashboard';
$page = htmlspecialchars($page, ENT_QUOTES, 'UTF-8');

$existing_pages = [
    'dashboard' => 'dashboard/dashboard_content.php',
    'kicho_content' => 'kicho/kicho_content.php',
    'auto_sort_system' => 'auto_sort_system_tool/auto_sort_system_tool_content.php',
    'auto_sort_system_tool' => 'auto_sort_system_tool/auto_sort_system_tool_content.php',
    'maru9_tool' => 'maru9_tool/maru9_tool_content.php',
    'maru9_tool_debug' => 'maru9_tool/maru9_tool_debug_page.php',
    'maru9_ai_emergency_debug' => 'maru9_tool/maru9_ai_emergency_debug.php',
    'maru9_gemini_complete_ui' => 'maru9_tool/maru9_gemini_complete_ui.php',
    'ollama_manager' => 'ollama_manager/n3_ollama_content.php',
    'ebay_inventory' => 'ebay_inventory/ebay_inventory_lite.php',
    'tanaoroshi_inline_complete' => 'tanaoroshi_inline_complete/tanaoroshi_inline_complete.php',
    'tanaoroshi_postgresql_ebay' => 'tanaoroshi_postgresql_ebay/tanaoroshi_postgresql_ebay.php',
    'ebay_database_manager' => 'ebay_database_manager/ebay_database_manager.php',
    'zaiko_content' => 'zaiko/zaiko_content.php',
    'juchu_kanri_content' => 'juchu/juchu_content.php',
    'sample_file_manager' => 'sample_file_manager/sample_file_manager.php',
    'complete_web_tool' => 'complete_web_tool/complete_web_tool_content.php',
    'test_tool' => 'backend_tools/test_tool_content.php'
];

$page_titles = [
    'dashboard' => 'ダッシュボード',
    'kicho_content' => '記帳自動化ツール',
    'auto_sort_system' => 'N3自動振り分けシステム',
    'auto_sort_system_tool' => 'N3自動振り分けシステム',
    'maru9_tool' => 'maru9商品データ修正ツール',
    'maru9_tool_debug' => 'Maru9デバッグ診断システム',
    'maru9_ai_emergency_debug' => 'Maru9 AI緊急診断システム',
    'maru9_gemini_complete_ui' => 'Maru9 Gemini完全統合UI',
    'ollama_manager' => 'Ollama AI管理システム',
    'ebay_inventory' => 'eBay在庫管理システム',
    'tanaoroshi_inline_complete' => '棚卸システム - インライン完全版',
    'tanaoroshi_postgresql_ebay' => 'PostgreSQL統合棚卸',
    'ebay_database_manager' => 'eBayデータベース管理 (Phase1完了版)',
    'zaiko_content' => '在庫管理',
    'juchu_kanri_content' => '受注管理',
    'sample_file_manager' => 'ファイル管理テストツール',
    'complete_web_tool' => '統合Webツール',
    'test_tool' => 'CAIDSテストツール'
];

$page_title = $page_titles[$page] ?? 'NAGANO-3';

function escape($value) {
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function getCurrentUser() {
    return $_SESSION['username'] ?? 'NAGANO-3 User';
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <meta name="csrf-token" content="<?= $_SESSION['csrf_token'] ?>">
    
    <title><?= escape($page_title) ?> - NAGANO-3</title>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- 共通CSS -->
    <link rel="stylesheet" href="common/css/style.css">
    
    <!-- アニメーション修正CSS -->
    <style>
    /* クルクル問題完全修正 */
    *, *::before, *::after {
        animation: none !important;
        transform: none !important;
        transition: background-color 0.2s ease, color 0.2s ease !important;
    }
    
    .loading-spinner {
        display: none !important;
    }
    
    .spinner {
        animation: none !important;
    }
    
    /* 必要最小限のローディング */
    .loading-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    
    .loading-text {
        font-size: 18px;
        color: #333;
    }
    
    /* デバッグ表示 */
    <?php if ($is_development): ?>
    body::before {
        content: "NAGANO-3 緊急修復版 - 開発モード";
        position: fixed;
        top: 0;
        left: 0;
        background: #28a745;
        color: white;
        padding: 5px 10px;
        z-index: 10000;
        font-size: 12px;
        font-weight: bold;
    }
    <?php endif; ?>
    </style>
</head>
<body data-page="<?= escape($page) ?>">
    
    <!-- ローディングスクリーン（シンプル版） -->
    <div id="loadingScreen" class="loading-screen">
        <div class="loading-text">NAGANO-3 読み込み中...</div>
    </div>
    
    <!-- メインレイアウト -->
    <div class="layout">
        
        <!-- ヘッダー -->
        <header class="header">
            <?php if (file_exists('common/templates/header.php')): ?>
                <?php include 'common/templates/header.php'; ?>
            <?php else: ?>
                <div style="padding: 15px; background: #007bff; color: white;">
                    <h1>NAGANO-3</h1>
                    <span>ユーザー: <?= escape(getCurrentUser()) ?></span>
                </div>
            <?php endif; ?>
        </header>
        
        <!-- サイドバー -->
        <aside class="sidebar">
            <?php if (file_exists('common/templates/sidebar.php')): ?>
                <?php include 'common/templates/sidebar.php'; ?>
            <?php else: ?>
                <nav style="padding: 20px;">
                    <ul style="list-style: none; padding: 0;">
                        <li><a href="?page=dashboard">ダッシュボード</a></li>
                        <li><a href="?page=kicho_content">記帳自動化</a></li>
                        <li><a href="?page=auto_sort_system_tool">自動振り分け</a></li>
                        <li><a href="?page=maru9_tool">maru9ツール</a></li>
                        <li><a href="?page=maru9_tool_debug">🔍maru9デバッグ</a></li>
                        <li><a href="?page=maru9_ai_emergency_debug" style="color: #e74c3c; font-weight: bold;">🚨AI緊急診断</a></li>
                        <li><a href="?page=maru9_gemini_complete_ui" style="color: #3498db;">🚀Gemini完全統合</a></li>
                        <li><a href="?page=ollama_manager">Ollama管理</a></li>
                        <li><a href="?page=ebay_inventory" style="color: #f39c12; font-weight: bold;">🛒eBay在庫管理</a></li>
                    </ul>
                </nav>
            <?php endif; ?>
        </aside>
        
        <!-- メインコンテンツ -->
        <main class="main-content">
            <?php
            $content_file = null;
            $file_found = false;
            
            if (isset($existing_pages[$page])) {
                $content_file = 'modules/' . $existing_pages[$page];
            }
            
            if ($content_file && file_exists($content_file)) {
                include $content_file;
                $file_found = true;
            }
            
            if (!$file_found) {
                echo '<div style="padding: 40px; text-align: center;">
                    <h2>ページが見つかりません</h2>
                    <p>指定されたページ「' . escape($page) . '」は存在しません。</p>
                    <p><a href="?page=dashboard" style="color: #007bff;">ダッシュボードに戻る</a></p>
                </div>';
            }
            ?>
        </main>
    </div>
    
    <!-- N3 Core JavaScript Libraries -->
    <script src="common/js/n3_core.js"></script>
    
    <!-- JavaScript -->
    <script>
    // CSRF トークン設定
    window.CSRF_TOKEN = "<?= $_SESSION['csrf_token'] ?>";
    window.NAGANO3_CONFIG = {
        csrfToken: "<?= $_SESSION['csrf_token'] ?>",
        currentPage: "<?= escape($page) ?>",
        debug: <?= $is_development ? 'true' : 'false' ?>
    };
    
    // Ajax処理関数
    window.executeAjax = async function(action, data = {}) {
        try {
            const formData = new FormData();
            formData.append('action', action);
            formData.append('csrf_token', window.CSRF_TOKEN);
            
            Object.entries(data).forEach(([key, value]) => {
                formData.append(key, value);
            });
            
            const response = await fetch(window.location.pathname + window.location.search, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error');
            }
            
            return result;
            
        } catch (error) {
            console.error('Ajax Error:', error);
            throw error;
        }
    };
    
    // ヘルスチェック
    window.healthCheck = async function() {
        try {
            const result = await executeAjax('health_check');
            console.log('Health Check Success:', result);
            return result;
        } catch (error) {
            console.error('Health Check Failed:', error);
            return null;
        }
    };
    
    // テスト関数
    window.testSystem = async function() {
        try {
            const health = await healthCheck();
            const stats = await executeAjax('get_statistics');
            
            alert('システム正常動作中！\n\n' + JSON.stringify(health.data, null, 2));
            
        } catch (error) {
            alert('テスト失敗: ' + error.message);
        }
    };
    
    // 初期化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('NAGANO-3 緊急修復版 初期化完了');
        
        // ローディング画面非表示
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        }, 500);
        
        <?php if ($is_development): ?>
        // デバッグモード: テストボタン追加
        const testBtn = document.createElement('button');
        testBtn.textContent = 'システムテスト';
        testBtn.style.cssText = `
            position: fixed; top: 30px; right: 10px; z-index: 9999;
            background: #007bff; color: white; border: none;
            padding: 8px 12px; border-radius: 4px; cursor: pointer;
            font-size: 12px;
        `;
        testBtn.onclick = window.testSystem;
        document.body.appendChild(testBtn);
        
        // 自動ヘルスチェック
        setTimeout(healthCheck, 2000);
        <?php endif; ?>
    });
    </script>
    
</body>
</html>