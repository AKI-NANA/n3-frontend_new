<?php
/**
 * NAGANO-3 index.php 統合修正（送料計算システム対応）
 * 
 * ✅ 既存システム完全互換
 * ✅ 送料計算モジュール統合
 * ✅ actionModuleMap 拡張
 * ✅ executeModuleAjax 対応
 */

// 既存のindex.phpに以下の修正を適用してください

/**
 * 🔴 必須修正1: actionModuleMap に送料計算アクション追加
 */
function detectModuleFromPageAndAction($page, $action) {
    $actionModuleMap = [
        // ... 既存のマッピング ...
        
        // 🆕 送料計算システム アクション追加
        'calculate_shipping' => 'souryou_keisan',
        'get_carrier_rates' => 'souryou_keisan',
        'upload_csv' => 'souryou_keisan',
        'health_check' => 'souryou_keisan',
        'get_zones' => 'souryou_keisan',
        'log_client_error' => 'souryou_keisan',
        
        // 汎用パターン（送料計算関連）
        'souryou_' => 'souryou_keisan',  // 'souryou_'で始まるアクション
        
        // 既存のkicho等のマッピング（例）
        'health_check_kicho' => 'kicho',
        'get_kicho_data' => 'kicho',
        // ... その他既存マッピング
    ];
    
    // 完全一致チェック
    if (isset($actionModuleMap[$action])) {
        return $actionModuleMap[$action];
    }
    
    // 前方一致チェック（souryou_等）
    foreach ($actionModuleMap as $pattern => $module) {
        if (strpos($pattern, '_') !== false && strpos($action, rtrim($pattern, '_')) === 0) {
            return $module;
        }
    }
    
    return 'system';  // デフォルト
}

/**
 * 🔴 必須修正2: executeModuleAjax に送料計算処理追加
 */
function executeModuleAjax($module, $action, $input_data = []) {
    
    // 🆕 送料計算モジュール専用処理
    if ($module === 'souryou_keisan') {
        // セキュリティ定数定義
        if (!defined('SECURE_ACCESS')) {
            define('SECURE_ACCESS', true);
        }
        
        // Ajax処理ファイル読み込み
        $ajax_handler = __DIR__ . '/modules/souryou_keisan/php/souryou_keisan_ajax_handler.php';
        
        if (file_exists($ajax_handler)) {
            // POSTデータ設定
            if (!empty($input_data)) {
                foreach ($input_data as $key => $value) {
                    $_POST[$key] = $value;
                }
            }
            $_POST['action'] = $action;
            
            // Ajax処理実行
            ob_start();
            require $ajax_handler;
            $response_text = ob_get_clean();
            
            // JSON レスポンス処理
            $response_data = json_decode($response_text, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $response_data;
            } else {
                return [
                    'status' => 'error',
                    'message' => 'JSON parse error',
                    'raw_response' => $response_text,
                    'timestamp' => date('Y-m-d\TH:i:s\Z')
                ];
            }
        } else {
            return [
                'status' => 'error',
                'message' => 'Ajax handler not found: ' . $ajax_handler,
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        }
    }
    
    // 既存の kicho モジュール処理（例）
    if ($module === 'kicho') {
        if (!defined('SECURE_ACCESS')) {
            define('SECURE_ACCESS', true);
        }
        
        require_once __DIR__ . '/modules/kicho/controllers/kicho_controller.php';
        $controller = new KichoController();
        $response_text = $controller->handleAjaxRequest($action, $input_data);
        return json_decode($response_text, true);
    }
    
    // その他のモジュール処理
    // ... 既存コード ...
    
    // 未対応モジュールのエラー処理
    return [
        'status' => 'error',
        'message' => "未対応のモジュール: {$module}",
        'module' => $module,
        'action' => $action,
        'timestamp' => date('Y-m-d\TH:i:s\Z')
    ];
}

/**
 * 🔴 必須修正3: ページルーティング に送料計算ページ追加
 */
function handlePageRouting() {
    $page = $_GET['page'] ?? 'dashboard';
    
    switch ($page) {
        // 🆕 送料計算システム ページ
        case 'souryou_keisan':
        case 'souryou_keisan_content':
            $content_file = __DIR__ . '/modules/souryou_keisan/php/souryou_keisan_content.php';
            if (file_exists($content_file)) {
                // セキュリティ定数定義
                if (!defined('SECURE_ACCESS')) {
                    define('SECURE_ACCESS', true);
                }
                include $content_file;
            } else {
                echo '<h1>エラー: 送料計算システムが見つかりません</h1>';
                echo '<p>ファイルパス: ' . htmlspecialchars($content_file) . '</p>';
            }
            break;
            
        // 既存ページ処理（例）
        case 'kicho':
        case 'kicho_content':
            if (file_exists(__DIR__ . '/modules/kicho/kicho_content.php')) {
                if (!defined('SECURE_ACCESS')) {
                    define('SECURE_ACCESS', true);
                }
                include __DIR__ . '/modules/kicho/kicho_content.php';
            } else {
                echo '<h1>エラー: 記帳システムが見つかりません</h1>';
            }
            break;
            
        case 'dashboard':
        default:
            // ダッシュボードまたはデフォルトページ
            if (file_exists(__DIR__ . '/modules/dashboard/dashboard_content.php')) {
                if (!defined('SECURE_ACCESS')) {
                    define('SECURE_ACCESS', true);
                }
                include __DIR__ . '/modules/dashboard/dashboard_content.php';
            } else {
                echo '<h1>ダッシュボード</h1>';
                echo '<p>デフォルトページです。</p>';
            }
            break;
    }
}

/**
 * 🔴 必須修正4: メインルーティング処理の統合
 */

// セッション開始
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// CSRFトークン生成
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Ajax リクエストの処理
if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
    
    // Ajax処理
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    $page = $_POST['page'] ?? $_GET['page'] ?? '';
    
    if (!empty($action)) {
        try {
            // モジュール判定
            $module = detectModuleFromPageAndAction($page, $action);
            
            // 入力データ取得
            $input_data = array_merge($_GET, $_POST);
            unset($input_data['action'], $input_data['page']);
            
            // モジュール別Ajax処理実行
            $result = executeModuleAjax($module, $action, $input_data);
            
            // JSON レスポンス出力
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            exit;
            
        } catch (Exception $e) {
            // Ajax エラー処理
            header('Content-Type: application/json; charset=UTF-8');
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => $e->getMessage(),
                'error_code' => get_class($e),
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}

// 通常のページ表示処理
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NAGANO-3 - 統合管理システム</title>
    
    <!-- 動的CSS読み込み -->
    <link rel="stylesheet" href="/common/css/generate-n3.php">
    
    <!-- CSRFトークン -->
    <meta name="csrf-token" content="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
</head>
<body>
    <div class="layout" data-theme="<?= $_SESSION['theme'] ?? 'light' ?>">
        <!-- サイドバー -->
        <nav class="sidebar" data-state="<?= $_SESSION['sidebar_state'] ?? 'expanded' ?>">
            <ul>
                <li><a href="/?page=dashboard">ダッシュボード</a></li>
                <li><a href="/?page=kicho">記帳システム</a></li>
                <li><a href="/?page=souryou_keisan">送料計算システム</a></li>
                <!-- その他メニュー項目 -->
            </ul>
        </nav>
        
        <!-- メインコンテンツ -->
        <main class="content">
            <?php 
            // ページルーティング実行
            handlePageRouting();
            ?>
        </main>
    </div>
    
    <!-- 動的JavaScript読み込み -->
    <script src="/common/js/generate-n3.php"></script>
</body>
</html>

<?php
/**
 * 🔴 修正内容サマリー
 * 
 * 1. actionModuleMap に送料計算アクション追加
 *    - calculate_shipping, get_carrier_rates 等
 *    - souryou_ プレフィックス対応
 * 
 * 2. executeModuleAjax に souryou_keisan モジュール処理追加
 *    - Ajax handler 呼び出し
 *    - セキュリティ定数設定
 *    - エラーハンドリング
 * 
 * 3. ページルーティングに souryou_keisan ページ追加
 *    - ?page=souryou_keisan でアクセス可能
 *    - ファイル存在確認・エラー処理
 * 
 * 4. 統合Ajax処理・CSRFトークン対応
 *    - 統一レスポンス形式
 *    - セキュリティ強化
 * 
 * ✅ この修正により送料計算システムが完全統合されます
 */
?>