<?php
/**
 * Yahoo Auction Tool - HTMLテンプレート編集システム（統一デザインシステム対応版）
 * JSON API完全対応版 - 他ツールと統一されたデザインシステム
 * 作成日: 2025-09-23
 */

// 強制デバッグモード（必須JSON応答）
$forceAPI = true;

// 完全なエラー制御
if ($forceAPI) {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    
    // 出力バッファリング開始
    while (ob_get_level()) {
        ob_end_clean();
    }
    ob_start();
}

// セキュリティヘッダー
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

/**
 * 確実なJSON応答関数
 */
function sendJSON($success, $data = null, $message = '', $debug = []) {
    // 出力バッファを完全にクリア
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // JSON専用ヘッダー設定
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: no-cache');
    
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'debug' => $debug,
        'php_version' => PHP_VERSION,
        'server_time' => time()
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// リクエスト解析
$action = '';
$input = [];
$debug = [];

// デバッグ情報収集
$debug['method'] = $_SERVER['REQUEST_METHOD'];
$debug['content_type'] = $_SERVER['CONTENT_TYPE'] ?? 'none';
$debug['user_agent'] = $_SERVER['HTTP_USER_AGENT'] ?? 'none';

// 生のリクエストボディ取得
$rawBody = file_get_contents('php://input');
$debug['raw_body_length'] = strlen($rawBody);
$debug['has_raw_body'] = !empty($rawBody);

// POST処理
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // JSON形式の場合
    if (!empty($rawBody)) {
        $decoded = json_decode($rawBody, true);
        $debug['json_error'] = json_last_error_msg();
        $debug['json_valid'] = (json_last_error() === JSON_ERROR_NONE);
        
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $input = $decoded;
            $action = $decoded['action'] ?? '';
            $debug['data_source'] = 'JSON body';
        } else {
            $debug['json_decode_failed'] = true;
            $debug['raw_body_preview'] = substr($rawBody, 0, 200);
        }
    }
    
    // フォームデータの場合
    if (empty($action) && !empty($_POST)) {
        $action = $_POST['action'] ?? '';
        $input = $_POST;
        $debug['data_source'] = 'POST form';
    }
}

// GET処理
if (empty($action) && !empty($_GET)) {
    $action = $_GET['action'] ?? '';
    $input = array_merge($input, $_GET);
    $debug['data_source'] = 'GET params';
}

$debug['final_action'] = $action;
$debug['input_data'] = $input;

// アクション処理
if (!empty($action)) {
    
    try {
        switch ($action) {
            case 'debug_request':
                sendJSON(true, [
                    'message' => '✅ デバッグリクエスト成功',
                    'server_info' => [
                        'php_version' => PHP_VERSION,
                        'memory_usage' => memory_get_usage(true),
                        'peak_memory' => memory_get_peak_usage(true),
                        'current_time' => date('Y-m-d H:i:s'),
                        'timezone' => date_default_timezone_get()
                    ],
                    'request_info' => $input
                ], 'デバッグ処理完了', $debug);
                break;
                
            case 'save_template':
                handleSaveTemplate($input, $debug);
                break;
                
            case 'load_templates':
                handleLoadTemplates($debug);
                break;
                
            case 'delete_template':
                handleDeleteTemplate($input, $debug);
                break;
                
            case 'generate_preview':
                handleGeneratePreview($input, $debug);
                break;
                
            case 'export_csv_with_html':
                sendJSON(false, null, 'CSV エクスポート機能は開発中です', $debug);
                break;
                
            default:
                sendJSON(false, null, "❌ 未対応のアクション: '$action'", $debug);
        }
        
    } catch (Exception $e) {
        sendJSON(false, null, '🚨 システムエラー: ' . $e->getMessage(), array_merge($debug, [
            'error_file' => $e->getFile(),
            'error_line' => $e->getLine(),
            'error_trace' => $e->getTraceAsString()
        ]));
    }
    
} else {
    // アクションが空の場合
    if ($_SERVER['REQUEST_METHOD'] === 'POST' || !empty($_GET)) {
        sendJSON(false, null, '❌ アクションが指定されていません', $debug);
    }
}

/**
 * テンプレート保存処理
 */
function handleSaveTemplate($input, $debug) {
    try {
        if (!isset($input['template_data'])) {
            sendJSON(false, null, '❌ template_data が見つかりません', $debug);
        }
        
        $templateData = $input['template_data'];
        
        // バリデーション
        if (empty($templateData['name'])) {
            sendJSON(false, null, '❌ テンプレート名が必要です', $debug);
        }
        
        if (empty($templateData['html_content'])) {
            sendJSON(false, null, '❌ HTML内容が必要です', $debug);
        }
        
        // 保存先ディレクトリ作成
        $saveDir = __DIR__ . '/saved_templates';
        if (!is_dir($saveDir)) {
            if (!mkdir($saveDir, 0755, true)) {
                sendJSON(false, null, '❌ 保存ディレクトリを作成できません', $debug);
            }
        }
        
        // ファイル名生成
        $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $templateData['name']);
        $fileName = date('Y-m-d_H-i-s') . '_' . $safeName . '.json';
        $filePath = $saveDir . '/' . $fileName;
        
        // 保存データ準備
        $saveData = [
            'template_id' => uniqid(),
            'name' => $templateData['name'],
            'category' => $templateData['category'] ?? 'general',
            'html_content' => $templateData['html_content'],
            'css_styles' => $templateData['css_styles'] ?? '',
            'javascript_code' => $templateData['javascript_code'] ?? '',
            'placeholder_fields' => $templateData['placeholder_fields'] ?? [],
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => 'html_editor',
            'file_name' => $fileName,
            'file_size' => 0
        ];
        
        // ファイル保存
        $jsonData = json_encode($saveData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if (file_put_contents($filePath, $jsonData) === false) {
            sendJSON(false, null, '❌ ファイル保存に失敗しました', $debug);
        }
        
        $saveData['file_size'] = filesize($filePath);
        
        sendJSON(true, [
            'template_id' => $saveData['template_id'],
            'file_name' => $fileName,
            'file_path' => $filePath,
            'file_size' => $saveData['file_size']
        ], '✅ テンプレートを保存しました', $debug);
        
    } catch (Exception $e) {
        sendJSON(false, null, '🚨 保存エラー: ' . $e->getMessage(), $debug);
    }
}

/**
 * テンプレート読み込み処理
 */
function handleLoadTemplates($debug) {
    try {
        $templates = [];
        $saveDir = __DIR__ . '/saved_templates';
        
        if (is_dir($saveDir)) {
            $files = glob($saveDir . '/*.json');
            $debug['found_files'] = count($files);
            
            foreach ($files as $file) {
                $content = file_get_contents($file);
                if ($content) {
                    $data = json_decode($content, true);
                    if ($data && json_last_error() === JSON_ERROR_NONE) {
                        // ファイル情報を追加
                        $data['file_path'] = $file;
                        $data['file_size'] = filesize($file);
                        $data['file_modified'] = date('Y-m-d H:i:s', filemtime($file));
                        $templates[] = $data;
                    }
                }
            }
        } else {
            $debug['save_dir_exists'] = false;
        }
        
        // 作成日時でソート（新しいものから）
        usort($templates, function($a, $b) {
            return strcmp($b['created_at'] ?? '', $a['created_at'] ?? '');
        });
        
        sendJSON(true, $templates, "✅ " . count($templates) . "件のテンプレートを読み込みました", $debug);
        
    } catch (Exception $e) {
        sendJSON(false, null, '🚨 読み込みエラー: ' . $e->getMessage(), $debug);
    }
}

/**
 * 単一テンプレート読み込み処理（エディタに読み込み用）
 */
function handleLoadSingleTemplate($input, $debug) {
    try {
        if (!isset($input['template_id'])) {
            sendJSON(false, null, '❌ template_id が指定されていません', $debug);
        }
        
        $templateId = $input['template_id'];
        $saveDir = __DIR__ . '/saved_templates';
        $files = glob($saveDir . '/*.json');
        $found = false;
        
        foreach ($files as $file) {
            $content = file_get_contents($file);
            if ($content) {
                $data = json_decode($content, true);
                if ($data && $data['template_id'] === $templateId) {
                    sendJSON(true, $data, '✅ テンプレートを読み込みました', $debug);
                    $found = true;
                    break;
                }
            }
        }
        
        if (!$found) {
            sendJSON(false, null, '❌ テンプレートが見つかりませんでした', $debug);
        }
        
    } catch (Exception $e) {
        sendJSON(false, null, '🚨 読み込みエラー: ' . $e->getMessage(), $debug);
    }
}

/**
 * テンプレート削除処理
 */
function handleDeleteTemplate($input, $debug) {
    try {
        if (!isset($input['template_id'])) {
            sendJSON(false, null, '❌ template_id が指定されていません', $debug);
        }
        
        $templateId = $input['template_id'];
        $saveDir = __DIR__ . '/saved_templates';
        $files = glob($saveDir . '/*.json');
        $deleted = false;
        
        foreach ($files as $file) {
            $content = file_get_contents($file);
            if ($content) {
                $data = json_decode($content, true);
                if ($data && $data['template_id'] === $templateId) {
                    if (unlink($file)) {
                        $deleted = true;
                        break;
                    }
                }
            }
        }
        
        if ($deleted) {
            sendJSON(true, null, '✅ テンプレートを削除しました', $debug);
        } else {
            sendJSON(false, null, '❌ テンプレートが見つかりませんでした', $debug);
        }
        
    } catch (Exception $e) {
        sendJSON(false, null, '🚨 削除エラー: ' . $e->getMessage(), $debug);
    }
}

/**
 * プレビュー生成処理
 */
function handleGeneratePreview($input, $debug) {
    try {
        if (empty($input['html_content'])) {
            sendJSON(false, null, '❌ HTML内容が指定されていません', $debug);
        }
        
        $htmlContent = $input['html_content'];
        $sampleType = $input['sample_data'] ?? 'default';
        
        // サンプルデータ生成
        $sampleData = generateSampleData($sampleType);
        
        // プレースホルダー置換
        $previewHTML = str_replace(array_keys($sampleData), array_values($sampleData), $htmlContent);
        
        // HTMLをサニタイズ（基本的なもの）
        $previewHTML = preg_replace('/javascript:/i', '', $previewHTML);
        $previewHTML = preg_replace('/on\w+\s*=/i', '', $previewHTML);
        
        sendJSON(true, [
            'html' => $previewHTML,
            'sample_type' => $sampleType,
            'placeholders_replaced' => count($sampleData),
            'original_length' => strlen($htmlContent),
            'preview_length' => strlen($previewHTML)
        ], '✅ プレビュー生成完了', $debug);
        
    } catch (Exception $e) {
        sendJSON(false, null, '🚨 プレビュー生成エラー: ' . $e->getMessage(), $debug);
    }
}

/**
 * サンプルデータ生成
 */
function generateSampleData($type) {
    $samples = [
        'default' => [
            '{{TITLE}}' => 'Sample Product Title',
            '{{PRICE}}' => '99.99',
            '{{BRAND}}' => 'Sample Brand',
            '{{CONDITION}}' => 'New',
            '{{DESCRIPTION}}' => 'This is a sample product description with detailed information.',
            '{{FEATURES}}' => "• High quality materials\n• Professional craftsmanship\n• Fast shipping worldwide",
            '{{SPECIFICATIONS}}' => "Size: 10 x 5 x 3 inches\nWeight: 1.5 lbs\nMaterial: Premium quality",
            '{{SHIPPING_INFO}}' => 'Fast and secure shipping from Japan with tracking',
            '{{RETURN_POLICY}}' => '30-day money-back guarantee',
            '{{WARRANTY}}' => '1-year manufacturer warranty included'
        ],
        'electronics' => [
            '{{TITLE}}' => 'iPhone 14 Pro Max 256GB Deep Purple',
            '{{PRICE}}' => '1199.99',
            '{{BRAND}}' => 'Apple',
            '{{CONDITION}}' => 'Brand New',
            '{{DESCRIPTION}}' => 'Latest iPhone with advanced camera system, A16 Bionic chip, and all-day battery life.',
            '{{FEATURES}}' => "• A16 Bionic chip\n• Pro camera system with 48MP main\n• 6.7-inch Super Retina XDR display\n• 5G connectivity",
            '{{SPECIFICATIONS}}' => "Display: 6.7-inch Super Retina XDR\nStorage: 256GB\nConnectivity: 5G, Wi-Fi 6E, Bluetooth 5.3\nBattery: All-day battery life",
            '{{SHIPPING_INFO}}' => 'Express shipping available - worldwide delivery with insurance',
            '{{RETURN_POLICY}}' => '14-day return policy for unopened items',
            '{{WARRANTY}}' => '1-year Apple limited warranty'
        ]
    ];
    
    return $samples[$type] ?? $samples['default'];
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction - HTMLテンプレート編集システム</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <!-- 統一CSSファイル読み込み -->
    <link href="../../css/yahoo_auction_tool_content.css" rel="stylesheet">
    <link href="../../css/yahoo_auction_system.css" rel="stylesheet">
    <style>
    /* 追加スタイル - HTMLエディタ専用 */
    .editor-layout {
        display: grid;
        grid-template-columns: 1fr 400px;
        gap: var(--space-lg);
        margin: var(--space-lg);
    }
    
    .editor-panel, .sidebar-panel {
        background: var(--bg-secondary);
        border-radius: var(--radius-lg);
        padding: var(--space-lg);
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border-color);
    }
    
    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-md);
        padding-bottom: var(--space-md);
        border-bottom: 1px solid var(--border-color);
    }
    
    .panel-header h3 {
        margin: 0;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        font-size: var(--text-lg);
        font-weight: 600;
    }
    
    .editor-actions {
        display: flex;
        gap: var(--space-sm);
    }
    
    .template-info {
        margin-bottom: var(--space-md);
    }
    
    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-md);
        margin-bottom: var(--space-md);
    }
    
    .form-group {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
    }
    
    .form-group label {
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--text-secondary);
    }
    
    .form-group input, 
    .form-group select {
        padding: var(--space-sm);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        font-size: var(--text-sm);
    }
    
    .html-editor textarea {
        width: 100%;
        height: 400px;
        padding: var(--space-md);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: var(--text-sm);
        line-height: 1.4;
        resize: vertical;
    }
    
    .variables-panel {
        background: var(--bg-tertiary);
        border-radius: var(--radius-lg);
        padding: var(--space-md);
        margin-bottom: var(--space-md);
    }
    
    .variables-panel h4 {
        margin-bottom: var(--space-md);
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        font-size: var(--text-base);
    }
    
    .variable-groups {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
    }
    
    .variable-group h5 {
        margin-bottom: var(--space-sm);
        color: var(--text-secondary);
        font-size: var(--text-sm);
        font-weight: 600;
    }
    
    .variable-tags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-sm);
    }
    
    .variable-tag {
        padding: var(--space-xs) var(--space-sm);
        background: var(--primary-color);
        color: white;
        border-radius: var(--radius-sm);
        font-size: var(--text-xs);
        cursor: pointer;
        transition: var(--transition-fast);
        border: none;
    }
    
    .variable-tag:hover {
        background: var(--primary-hover);
        transform: translateY(-1px);
    }
    
    .quick-templates {
        margin-top: var(--space-md);
        padding-top: var(--space-md);
        border-top: 1px solid var(--border-color);
    }
    
    .quick-templates h5 {
        margin-bottom: var(--space-sm);
        color: var(--text-secondary);
        font-size: var(--text-sm);
        font-weight: 600;
    }
    
    .template-btn {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        width: 100%;
        padding: var(--space-sm);
        margin-bottom: var(--space-sm);
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        font-size: var(--text-sm);
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    .template-btn:hover {
        background: var(--bg-hover);
        border-color: var(--primary-color);
    }
    
    .preview-panel {
        background: var(--bg-tertiary);
        border-radius: var(--radius-lg);
        padding: var(--space-md);
        margin-top: var(--space-md);
    }
    
    .preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-md);
    }
    
    .preview-header h4 {
        margin: 0;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        font-size: var(--text-base);
    }
    
    .preview-controls {
        display: flex;
        gap: var(--space-sm);
        align-items: center;
    }
    
    .preview-controls select {
        padding: var(--space-xs) var(--space-sm);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        font-size: var(--text-xs);
    }
    
    .preview-content {
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: var(--space-md);
        background: white;
        min-height: 200px;
        overflow-y: auto;
    }
    
    .preview-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: var(--text-muted);
        text-align: center;
    }
    
    .preview-placeholder i {
        font-size: 2rem;
        margin-bottom: var(--space-sm);
    }
    
    .templates-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: var(--space-md);
        margin-top: var(--space-md);
    }
    
    .template-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: var(--space-md);
        transition: var(--transition-fast);
    }
    
    .template-card:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
    }
    
    .template-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--space-sm);
    }
    
    .template-header h4 {
        margin: 0;
        color: var(--text-primary);
        font-size: var(--text-base);
        font-weight: 600;
    }
    
    .category-badge {
        padding: var(--space-xs) var(--space-sm);
        background: var(--info-color);
        color: white;
        border-radius: var(--radius-sm);
        font-size: var(--text-xs);
    }
    
    .template-meta {
        display: flex;
        justify-content: space-between;
        margin-bottom: var(--space-md);
        font-size: var(--text-xs);
        color: var(--text-muted);
    }
    
    .template-actions {
        display: flex;
        gap: var(--space-sm);
    }
    
    .no-templates {
        text-align: center;
        color: var(--text-muted);
        padding: var(--space-xl);
        font-style: italic;
    }
    
    /* ナビゲーションリンク */
    .navigation-links {
        display: flex;
        gap: var(--space-sm);
        flex-wrap: wrap;
        margin-top: var(--space-sm);
    }

    .nav-btn {
        padding: 0.5rem 1rem;
        border-radius: var(--radius-sm);
        text-decoration: none;
        font-size: 0.8rem;
        font-weight: 500;
        transition: var(--transition-fast);
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        border: 1px solid transparent;
    }

    .nav-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        text-decoration: none;
    }

    /* 機能別配色 */
    .nav-dashboard { background: #4DA8DA; color: white; }
    .nav-scraping { background: #80D8C3; color: var(--text-primary); }
    .nav-approval { background: #D1F8EF; color: var(--text-primary); }
    .nav-filters { background: #FFD66B; color: var(--text-primary); }
    .nav-category { background: #578FCA; color: white; }
    .nav-rieki { background: #FEFBC7; color: var(--text-primary); }
    .nav-listing { background: #FFB4B4; color: var(--text-primary); }
    .nav-html { background: #725CAD; color: white; border-color: #725CAD; }
    
    /* accent-purple変数がない場合の定義 */
    :root {
        --accent-purple: #725CAD;
    }
    
    @media (max-width: 1024px) {
        .editor-layout {
            grid-template-columns: 1fr;
        }
        
        .form-row {
            grid-template-columns: 1fr;
        }
    }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-dashboard">
            <!-- ナビゲーションヘッダー -->
            <div class="dashboard-header">
                <h1><i class="fas fa-code"></i> HTMLテンプレート編集システム</h1>
                <p>商品説明用HTMLテンプレート作成・編集・プレビュー・CSV統合</p>
                
                <!-- ナビゲーション -->
                <div class="navigation-links">
                    <a href="../01_dashboard/dashboard.php" class="nav-btn nav-dashboard">
                        <i class="fas fa-home"></i> ダッシュボード
                    </a>
                    <a href="../02_scraping/scraping.php" class="nav-btn nav-scraping">
                        <i class="fas fa-spider"></i> データ取得
                    </a>
                    <a href="../03_approval/approval.php" class="nav-btn nav-approval">
                        <i class="fas fa-check-circle"></i> 商品承認
                    </a>
                    <a href="../07_editing/editor.php" class="nav-btn nav-filters">
                        <i class="fas fa-edit"></i> データ編集
                    </a>
                    <a href="../05_rieki/riekikeisan.php" class="nav-btn nav-rieki">
                        <i class="fas fa-calculator"></i> 利益計算
                    </a>
                    <a href="../08_listing/listing.php" class="nav-btn nav-listing">
                        <i class="fas fa-store"></i> 出品管理
                    </a>
                    <a href="../11_category/frontend/ebay_category_tool.php" class="nav-btn nav-category">
                        <i class="fas fa-tags"></i> カテゴリー判定
                    </a>
                    <a href="#" class="nav-btn nav-html">
                        <i class="fas fa-code"></i> HTMLエディタ
                    </a>
                </div>
            </div>

            <!-- ステータスバー -->
            <div id="statusBar" class="notification info" style="display: none; margin: var(--space-md);">
                <i class="fas fa-info-circle"></i>
                <span id="statusMessage">Ready</span>
            </div>

            <div class="editor-layout">
                <!-- 左側: HTMLテンプレート編集エリア -->
                <div class="editor-panel">
                    <div class="panel-header">
                        <h3><i class="fas fa-edit"></i> HTMLテンプレート編集</h3>
                        <div class="editor-actions">
                            <button class="btn btn-success" onclick="saveTemplate()">
                                <i class="fas fa-save"></i> 保存
                            </button>
                            <button class="btn btn-info" onclick="loadTemplates()">
                                <i class="fas fa-folder-open"></i> 読み込み
                            </button>
                        </div>
                    </div>
                    
                    <div class="template-info">
                        <div class="form-row">
                            <div class="form-group">
                                <label>テンプレート名</label>
                                <input type="text" id="templateName" placeholder="My Template">
                            </div>
                            <div class="form-group">
                                <label>カテゴリ</label>
                                <select id="templateCategory">
                                    <option value="general">汎用</option>
                                    <option value="electronics">エレクトロニクス</option>
                                    <option value="fashion">ファッション</option>
                                    <option value="collectibles">コレクタブル</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="html-editor">
                        <textarea 
                            id="htmlEditor" 
                            placeholder="HTMLテンプレートを入力してください...

例:
<div class='product-description'>
    <h2>{{TITLE}}</h2>
    <div class='price'>${{PRICE}}</div>
    <p>{{DESCRIPTION}}</p>
    <div class='shipping'>{{SHIPPING_INFO}}</div>
</div>"
                        ></textarea>
                    </div>
                </div>
                
                <!-- 右側: 変数パネル・プレビュー -->
                <div class="sidebar-panel">
                    <!-- 変数パネル -->
                    <div class="variables-panel">
                        <h4><i class="fas fa-tags"></i> 使用可能な変数</h4>
                        
                        <div class="variable-groups">
                            <div class="variable-group">
                                <h5>基本情報</h5>
                                <div class="variable-tags">
                                    <button class="variable-tag" onclick="insertVariable('{{TITLE}}')">{{TITLE}}</button>
                                    <button class="variable-tag" onclick="insertVariable('{{PRICE}}')">{{PRICE}}</button>
                                    <button class="variable-tag" onclick="insertVariable('{{BRAND}}')">{{BRAND}}</button>
                                    <button class="variable-tag" onclick="insertVariable('{{CONDITION}}')">{{CONDITION}}</button>
                                </div>
                            </div>
                            
                            <div class="variable-group">
                                <h5>説明・詳細</h5>
                                <div class="variable-tags">
                                    <button class="variable-tag" onclick="insertVariable('{{DESCRIPTION}}')">{{DESCRIPTION}}</button>
                                    <button class="variable-tag" onclick="insertVariable('{{FEATURES}}')">{{FEATURES}}</button>
                                    <button class="variable-tag" onclick="insertVariable('{{SPECIFICATIONS}}')">{{SPECIFICATIONS}}</button>
                                </div>
                            </div>
                            
                            <div class="variable-group">
                                <h5>配送・ポリシー</h5>
                                <div class="variable-tags">
                                    <button class="variable-tag" onclick="insertVariable('{{SHIPPING_INFO}}')">{{SHIPPING_INFO}}</button>
                                    <button class="variable-tag" onclick="insertVariable('{{RETURN_POLICY}}')">{{RETURN_POLICY}}</button>
                                    <button class="variable-tag" onclick="insertVariable('{{WARRANTY}}')">{{WARRANTY}}</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="quick-templates">
                            <h5>クイックテンプレート</h5>
                            <button class="template-btn" onclick="insertQuickTemplate('basic')">
                                <i class="fas fa-bolt"></i> 基本
                            </button>
                            <button class="template-btn" onclick="insertQuickTemplate('premium')">
                                <i class="fas fa-crown"></i> プレミアム
                            </button>
                        </div>
                    </div>
                    
                    <!-- プレビューパネル -->
                    <div class="preview-panel">
                        <div class="preview-header">
                            <h4><i class="fas fa-eye"></i> プレビュー</h4>
                            <div class="preview-controls">
                                <select id="sampleDataType">
                                    <option value="default">デフォルト</option>
                                    <option value="electronics">エレクトロニクス</option>
                                </select>
                                <button class="btn btn-sm btn-warning" onclick="generatePreview()">
                                    <i class="fas fa-play"></i> 生成
                                </button>
                            </div>
                        </div>
                        
                        <div class="preview-content" id="previewContent">
                            <div class="preview-placeholder">
                                <i class="fas fa-info-circle"></i>
                                <p>HTMLを入力して「生成」ボタンを押してください</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 保存済みテンプレート -->
            <section class="section">
                <div class="section-header">
                    <h3><i class="fas fa-folder"></i> 保存済みテンプレート</h3>
                    <button class="btn btn-info" onclick="loadTemplates()">
                        <i class="fas fa-sync"></i> 更新
                    </button>
                </div>
                
                <div class="templates-grid" id="templatesGrid">
                    <!-- テンプレートカードは動的生成 -->
                    <div class="no-templates">
                        保存済みテンプレートがありません。テンプレートを作成して保存してください。
                    </div>
                </div>
            </section>
        </div>
    </div>

    <script>
        // グローバル変数
        let isDebugMode = false;
        
        // ページ初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 HTMLテンプレート編集システム初期化開始');
            initializeHTMLEditor();
        });

        function initializeHTMLEditor() {
            showStatus('システム初期化中...', 'info');
            
            // サーバー接続テスト
            testServerConnection();
            
            // テンプレート読み込み
            loadTemplates();
            
            showStatus('システム初期化完了', 'success');
        }
        
        function testServerConnection() {
            console.log('🔍 サーバー接続テスト開始');
            
            fetch('html_editor.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: 'debug_request',
                    test_data: {
                        timestamp: new Date().toISOString(),
                        user_agent: navigator.userAgent,
                        test_purpose: 'unified_version_test'
                    }
                })
            })
            .then(response => {
                console.log('📟 Response:', response.status, response.statusText);
                return response.text();
            })
            .then(text => {
                console.log('📄 Raw response:', text);
                try {
                    const result = JSON.parse(text);
                    console.log('📊 JSON result:', result);
                    
                    if (result.success) {
                        showStatus('✅ サーバー接続確認完了', 'success');
                        isDebugMode = true;
                    } else {
                        showStatus('❌ サーバーエラー: ' + result.message, 'error');
                    }
                } catch (e) {
                    console.error('❌ JSON parse error:', e);
                    showStatus('❌ レスポンス解析エラー', 'error');
                }
            })
            .catch(error => {
                console.error('❌ Fetch error:', error);
                showStatus('❌ 接続エラー: ' + error.message, 'error');
            });
        }
        
        function showStatus(message, type = 'info') {
            const statusBar = document.getElementById('statusBar');
            const statusMessage = document.getElementById('statusMessage');
            
            if (statusBar && statusMessage) {
                statusMessage.textContent = message;
                statusBar.className = `notification ${type}`;
                statusBar.style.display = 'flex';
                
                // 成功時は自動で隠す
                if (type === 'success') {
                    setTimeout(() => {
                        statusBar.style.display = 'none';
                    }, 3000);
                }
            }
            
            console.log(`📢 Status [${type.toUpperCase()}]:`, message);
        }

        function insertVariable(variable) {
            const editor = document.getElementById('htmlEditor');
            if (!editor) return;
            
            const startPos = editor.selectionStart;
            const endPos = editor.selectionEnd;
            const beforeText = editor.value.substring(0, startPos);
            const afterText = editor.value.substring(endPos);
            
            editor.value = beforeText + variable + afterText;
            
            const newPos = startPos + variable.length;
            editor.setSelectionRange(newPos, newPos);
            editor.focus();
            
            showStatus('変数を挿入: ' + variable, 'success');
        }

        function saveTemplate() {
            console.log('💾 テンプレート保存開始');
            showStatus('テンプレート保存中...', 'info');
            
            const templateData = {
                name: document.getElementById('templateName').value || 'Untitled Template',
                category: document.getElementById('templateCategory').value,
                html_content: document.getElementById('htmlEditor').value,
                created_by: 'html_editor_user'
            };
            
            if (!templateData.html_content.trim()) {
                showStatus('❌ HTML内容を入力してください', 'error');
                return;
            }
            
            fetch('html_editor.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: 'save_template',
                    template_data: templateData
                })
            })
            .then(response => response.json())
            .then(result => {
                console.log('📊 保存結果:', result);
                if (result.success) {
                    showStatus('✅ テンプレートを保存しました', 'success');
                    loadTemplates(); // 再読み込み
                    
                    // フォームをクリア
                    document.getElementById('templateName').value = '';
                    document.getElementById('htmlEditor').value = '';
                } else {
                    showStatus('❌ 保存エラー: ' + result.message, 'error');
                }
            })
            .catch(error => {
                console.error('❌ 保存エラー:', error);
                showStatus('❌ 保存に失敗しました', 'error');
            });
        }

        function generatePreview() {
            console.log('👁️ プレビュー生成開始');
            showStatus('プレビュー生成中...', 'info');
            
            const htmlContent = document.getElementById('htmlEditor').value;
            const sampleType = document.getElementById('sampleDataType').value;
            
            if (!htmlContent.trim()) {
                showStatus('❌ HTMLコンテンツを入力してください', 'error');
                return;
            }
            
            fetch('html_editor.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: 'generate_preview',
                    html_content: htmlContent,
                    sample_data: sampleType
                })
            })
            .then(response => response.json())
            .then(result => {
                console.log('📊 プレビュー結果:', result);
                if (result.success) {
                    displayPreview(result.data.html);
                    showStatus('✅ プレビューを生成しました', 'success');
                } else {
                    showStatus('❌ プレビューエラー: ' + result.message, 'error');
                }
            })
            .catch(error => {
                console.error('❌ プレビューエラー:', error);
                showStatus('❌ プレビュー生成に失敗しました', 'error');
            });
        }
        
        function displayPreview(html) {
            const previewContent = document.getElementById('previewContent');
            if (previewContent) {
                previewContent.innerHTML = html;
            }
        }
        
        function loadTemplates() {
            console.log('📂 テンプレート読み込み開始');
            showStatus('テンプレート読み込み中...', 'info');
            
            fetch('html_editor.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: 'load_templates'
                })
            })
            .then(response => response.json())
            .then(result => {
                console.log('📊 テンプレート結果:', result);
                if (result.success) {
                    displayTemplatesList(result.data);
                    showStatus(`✅ ${result.data.length}件のテンプレートを読み込みました`, 'success');
                } else {
                    showStatus('❌ 読み込みエラー: ' + result.message, 'error');
                }
            })
            .catch(error => {
                console.error('❌ 読み込みエラー:', error);
                showStatus('❌ テンプレート読み込みに失敗しました', 'error');
            });
        }
        
        function displayTemplatesList(templates) {
            const templatesGrid = document.getElementById('templatesGrid');
            if (!templatesGrid) return;
            
            if (!templates || templates.length === 0) {
                templatesGrid.innerHTML = '<div class="no-templates">保存済みテンプレートがありません。テンプレートを作成して保存してください。</div>';
                return;
            }
            
            const templatesHTML = templates.map(template => `
                <div class="template-card" data-template-id="${template.template_id || 'unknown'}">
                    <div class="template-header">
                        <h4>${template.name || 'Untitled'}</h4>
                        <span class="category-badge">${template.category || 'general'}</span>
                    </div>
                    <div class="template-meta">
                        <span class="created-date">${template.created_at || 'Unknown'}</span>
                        <span class="file-size">${formatFileSize(template.file_size || 0)}</span>
                    </div>
                    <div class="template-actions">
                        <button class="btn btn-sm btn-primary" onclick="loadTemplate('${template.template_id || ''}')">
                            <i class="fas fa-edit"></i> 編集
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="previewTemplate('${template.template_id || ''}')">
                            <i class="fas fa-eye"></i> プレビュー
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteTemplate('${template.template_id || ''}')">
                            <i class="fas fa-trash"></i> 削除
                        </button>
                    </div>
                </div>
            `).join('');
            
            templatesGrid.innerHTML = templatesHTML;
        }
        
        function insertQuickTemplate(type) {
            const editor = document.getElementById('htmlEditor');
            if (!editor) return;
            
            let template = '';
            
            if (type === 'basic') {
                template = `<div class="product-description">
    <h2>{{TITLE}}</h2>
    <div class="price">${{PRICE}}</div>
    <div class="brand">Brand: {{BRAND}}</div>
    <div class="condition">Condition: {{CONDITION}}</div>
    <div class="description">{{DESCRIPTION}}</div>
    <div class="shipping">{{SHIPPING_INFO}}</div>
</div>`;
            } else if (type === 'premium') {
                template = `<div class="premium-product-description" style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background: #f9f9f9; border-radius: 10px;">
    <div class="header" style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px;">
        <h1 style="margin: 0; font-size: 2rem;">{{TITLE}}</h1>
        <div class="price-badge" style="font-size: 1.5rem; font-weight: bold; margin-top: 10px;">${{PRICE}}</div>
    </div>
    
    <div class="product-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="brand-section" style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h3 style="color: #333; margin-bottom: 10px;">Brand</h3>
            <p style="margin: 0; font-weight: bold; color: #667eea;">{{BRAND}}</p>
        </div>
        
        <div class="condition-section" style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h3 style="color: #333; margin-bottom: 10px;">Condition</h3>
            <p style="margin: 0; font-weight: bold; color: #667eea;">{{CONDITION}}</p>
        </div>
        
        <div class="features-section" style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h3 style="color: #333; margin-bottom: 10px;">Key Features</h3>
            <div style="margin: 0; font-weight: bold; color: #667eea;">{{FEATURES}}</div>
        </div>
    </div>
    
    <div class="description-section" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <h3 style="color: #333; margin-bottom: 15px;">Description</h3>
        <p style="line-height: 1.6; color: #555;">{{DESCRIPTION}}</p>
    </div>
    
    <div class="shipping-policy" style="background: #e8f4fd; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
        <h3 style="color: #333; margin-bottom: 15px;">Shipping & Returns</h3>
        <p style="margin-bottom: 10px; color: #555;"><strong>Shipping:</strong> {{SHIPPING_INFO}}</p>
        <p style="margin: 0; color: #555;"><strong>Returns:</strong> {{RETURN_POLICY}}</p>
    </div>
</div>`;
            }
            
            editor.value = template;
            editor.focus();
            showStatus(`✅ ${type}テンプレートを挿入しました`, 'success');
        }

        // ヘルパー関数
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        function loadTemplate(templateId) {
            console.log('📂 テンプレート読み込み開始:', templateId);
            showStatus('テンプレート読み込み中...', 'info');
            
            fetch('html_editor.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: 'load_single_template',
                    template_id: templateId
                })
            })
            .then(response => response.json())
            .then(result => {
                console.log('📊 読み込み結果:', result);
                if (result.success) {
                    const template = result.data;
                    
                    // エディタにデータをセット
                    document.getElementById('templateName').value = template.name || '';
                    document.getElementById('templateCategory').value = template.category || 'general';
                    document.getElementById('htmlEditor').value = template.html_content || '';
                    
                    showStatus(`✅ テンプレート「${template.name}」を読み込みました`, 'success');
                    
                    // エディタにフォーカス
                    document.getElementById('htmlEditor').focus();
                } else {
                    showStatus('❌ 読み込みエラー: ' + result.message, 'error');
                }
            })
            .catch(error => {
                console.error('❌ 読み込みエラー:', error);
                showStatus('❌ テンプレート読み込みに失敗しました', 'error');
            });
        }
        
        function previewTemplate(templateId) {
            console.log('👁️ テンプレートプレビュー開始:', templateId);
            showStatus('テンプレートプレビュー生成中...', 'info');
            
            // まずテンプレートを読み込み
            fetch('html_editor.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: 'load_single_template',
                    template_id: templateId
                })
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    const template = result.data;
                    
                    // プレビュー生成
                    return fetch('html_editor.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            action: 'generate_preview',
                            html_content: template.html_content,
                            sample_data: template.category === 'electronics' ? 'electronics' : 'default'
                        })
                    });
                } else {
                    throw new Error('テンプレートの読み込みに失敗: ' + result.message);
                }
            })
            .then(response => response.json())
            .then(previewResult => {
                if (previewResult.success) {
                    // 新しいウィンドウでプレビューを表示
                    const previewWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
                    previewWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>テンプレートプレビュー</title>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                                body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                                .preview-container { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                                .preview-header { background: #2563eb; color: white; padding: 10px 15px; border-radius: 6px; margin-bottom: 20px; }
                            </style>
                        </head>
                        <body>
                            <div class="preview-header">
                                <h2>テンプレートプレビュー</h2>
                            </div>
                            <div class="preview-container">
                                ${previewResult.data.html}
                            </div>
                        </body>
                        </html>
                    `);
                    previewWindow.document.close();
                    
                    showStatus('✅ プレビューを新しいウィンドウで開きました', 'success');
                } else {
                    throw new Error('プレビュー生成に失敗: ' + previewResult.message);
                }
            })
            .catch(error => {
                console.error('❌ プレビューエラー:', error);
                showStatus('❌ プレビュー生成に失敗しました', 'error');
            });
        }
        
        function deleteTemplate(templateId) {
            if (confirm('このテンプレートを削除しますか？')) {
                fetch('html_editor.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'delete_template',
                        template_id: templateId
                    })
                })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        showStatus('✅ テンプレートを削除しました', 'success');
                        loadTemplates(); // 再読み込み
                    } else {
                        showStatus('❌ 削除エラー: ' + result.message, 'error');
                    }
                })
                .catch(error => {
                    console.error('❌ 削除エラー:', error);
                    showStatus('❌ 削除に失敗しました', 'error');
                });
            }
        }
        
        console.log('✅ HTMLテンプレート編集システム完全初期化完了');
    </script>
</body>
</html>