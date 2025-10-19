<?php
/**
 * 出品システム フロントエンド（PHP版）
 * HTML+JS → PHP API 統合版
 */

require_once __DIR__ . '/../03_approval/api/JWTAuth.php';
require_once __DIR__ . '/../03_approval/api/UnifiedLogger.php';

// 簡易認証チェック
session_start();
$isAuthenticated = isset($_SESSION['user_id']) || isset($_GET['dev_mode']);

if (!$isAuthenticated && !isset($_GET['dev_mode'])) {
    if (isset($_POST['login'])) {
        $_SESSION['user_id'] = 'admin';
        $_SESSION['user_permissions'] = ['admin', 'listing_manage'];
        header('Location: ' . $_SERVER['PHP_SELF']);
        exit;
    }
    
    echo '<!DOCTYPE html>
    <html><head><title>Login Required</title></head>
    <body style="font-family: Arial; padding: 50px; text-align: center;">
        <h2>認証が必要です</h2>
        <form method="post">
            <button type="submit" name="login" style="padding: 10px 20px; font-size: 16px;">
                開発用ログイン
            </button>
        </form>
        <p><small>本番環境では適切な認証システムを使用してください</small></p>
    </body></html>';
    exit;
}

$logger = getLogger('listing_frontend');
$logger->info('Listing frontend accessed', [
    'user_id' => $_SESSION['user_id'] ?? 'anonymous',
    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
]);
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>統合出品管理システム（PHP API版）</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        /* CSS変数定義 */
        :root {
            --primary-color: #2563eb;
            --primary-hover: #1d4ed8;
            --secondary-color: #64748b;
            --success-color: #10b981;
            --danger-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #06b6d4;
            
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-tertiary: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #cbd5e1;
            --border-color: #475569;
            
            --space-xs: 0.25rem;
            --space-sm: 0.5rem;
            --space-md: 1rem;
            --space-lg: 1.5rem;
            --space-xl: 2rem;
            --radius-sm: 0.375rem;
            --radius-md: 0.5rem;
            --radius-lg: 0.75rem;
            --radius-xl: 1rem;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container {
            max-width: 1600px;
            margin: 0 auto;
            padding: var(--space-lg);
        }

        /* ヘッダー */
        .main-header {
            background: linear-gradient(135deg, var(--primary-color), var(--info-color));
            padding: var(--space-xl);
            border-radius: var(--radius-lg);
            margin-bottom: var(--space-xl);
            text-align: center;
            position: relative;
        }

        .main-header h1 {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: var(--space-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-md);
        }

        .version-badge {
            position: absolute;
            top: 10px;
            right: 20px;
            background: rgba(255,255,255,0.2);
            padding: 4px 12px;
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            font-weight: 600;
        }

        /* ステップインジケーター */
        .steps-indicator {
            display: flex;
            justify-content: center;
            margin-bottom: var(--space-xl);
            gap: var(--space-md);
        }

        .step {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-md);
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            border: 2px solid var(--border-color);
            transition: all 0.3s ease;
            cursor: pointer;
            min-width: 200px;
        }

        .step.active {
            border-color: var(--success-color);
            background: rgba(16, 185, 129, 0.1);
        }

        .step-number {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--bg-tertiary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
        }

        .step.active .step-number {
            background: var(--success-color);
            color: white;
        }

        .step-title {
            font-weight: 600;
        }

        /* コンテンツセクション */
        .content-section {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-xl);
            margin-bottom: var(--space-lg);
            border: 1px solid var(--border-color);
            display: none;
        }

        .content-section.active {
            display: block;
        }

        .section-header {
            margin-bottom: var(--space-xl);
            text-align: center;
        }

        .section-header h2 {
            font-size: 1.5rem;
            margin-bottom: var(--space-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-md);
        }

        /* アクションカード */
        .action-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: var(--space-lg);
            margin-bottom: var(--space-xl);
        }

        .card {
            background: var(--bg-tertiary);
            border-radius: var(--radius-lg);
            padding: var(--space-xl);
            text-align: center;
            transition: all 0.3s ease;
            border: 1px solid var(--border-color);
        }

        .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            border-color: var(--primary-color);
        }

        .card-icon {
            font-size: 3rem;
            margin-bottom: var(--space-lg);
            color: var(--primary-color);
        }

        .card h3 {
            margin-bottom: var(--space-md);
            font-size: 1.25rem;
        }

        .card p {
            margin-bottom: var(--space-lg);
            color: var(--text-secondary);
        }

        /* ボタン */
        .btn {
            padding: var(--space-sm) var(--space-md);
            border: none;
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 600;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: var(--space-xs);
            text-decoration: none;
            min-height: 36px;
        }

        .btn-primary { background: var(--primary-color); color: white; }
        .btn-success { background: var(--success-color); color: white; }
        .btn-danger { background: var(--danger-color); color: white; }
        .btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); }
        .btn-large { padding: var(--space-md) var(--space-xl); font-size: 1rem; }

        .btn:hover:not(:disabled) {
            transform: translateY(-1px);
            filter: brightness(110%);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        /* アップロードエリア */
        .upload-area {
            margin-bottom: var(--space-xl);
        }

        .upload-zone {
            border: 2px dashed var(--border-color);
            border-radius: var(--radius-lg);
            padding: var(--space-xl);
            text-align: center;
            background: var(--bg-tertiary);
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .upload-zone:hover {
            border-color: var(--primary-color);
            background: rgba(37, 99, 235, 0.05);
        }

        .upload-zone.dragover {
            border-color: var(--success-color);
            background: rgba(16, 185, 129, 0.1);
        }

        .upload-icon {
            font-size: 3rem;
            margin-bottom: var(--space-lg);
            color: var(--primary-color);
        }

        /* 結果表示 */
        .upload-result {
            display: none;
            background: var(--bg-tertiary);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-top: var(--space-lg);
        }

        .result-summary {
            display: flex;
            justify-content: space-around;
            gap: var(--space-lg);
        }

        .summary-item {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-md);
            border-radius: var(--radius-md);
        }

        .summary-item.success {
            background: rgba(16, 185, 129, 0.1);
            color: var(--success-color);
        }

        .summary-item.error {
            background: rgba(239, 68, 68, 0.1);
            color: var(--danger-color);
        }

        .summary-item.warning {
            background: rgba(245, 158, 11, 0.1);
            color: var(--warning-color);
        }

        .count {
            font-size: 1.5rem;
            font-weight: 700;
            margin-left: var(--space-sm);
        }

        /* 統計カード */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-md);
            margin-bottom: var(--space-xl);
        }

        .stat-card {
            background: var(--bg-tertiary);
            padding: var(--space-lg);
            border-radius: var(--radius-lg);
            text-align: center;
            border: 1px solid var(--border-color);
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: var(--space-xs);
        }

        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        /* 設定グループ */
        .settings-group {
            background: var(--bg-tertiary);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-bottom: var(--space-lg);
        }

        .settings-group h3 {
            margin-bottom: var(--space-lg);
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        /* マーケットプレイス選択 */
        .marketplace-selection {
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
        }

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            padding: var(--space-md);
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .checkbox-label:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .checkmark {
            width: 20px;
            height: 20px;
            border: 2px solid var(--border-color);
            border-radius: 4px;
            position: relative;
        }

        input[type="checkbox"]:checked + .checkmark {
            background: var(--success-color);
            border-color: var(--success-color);
        }

        input[type="checkbox"]:checked + .checkmark::after {
            content: '✓';
            position: absolute;
            color: white;
            font-size: 14px;
            top: -2px;
            left: 2px;
        }

        .marketplace-name {
            font-weight: 600;
            flex-grow: 1;
        }

        .marketplace-status {
            padding: 2px 8px;
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            font-weight: 600;
        }

        .marketplace-status.active {
            background: rgba(16, 185, 129, 0.2);
            color: var(--success-color);
        }

        .marketplace-status.pending {
            background: rgba(245, 158, 11, 0.2);
            color: var(--warning-color);
        }

        /* 実行エリア */
        .execution-area {
            text-align: center;
            margin-top: var(--space-xl);
        }

        /* フォーム */
        .form-group {
            margin-bottom: var(--space-lg);
        }

        .form-group label {
            display: block;
            margin-bottom: var(--space-sm);
            font-weight: 600;
            color: var(--text-secondary);
        }

        input, select, textarea {
            width: 100%;
            padding: var(--space-sm);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            background: var(--bg-primary);
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        /* 切り替えボタン */
        .section-toggle {
            display: flex;
            justify-content: center;
            gap: var(--space-sm);
            margin-bottom: var(--space-xl);
        }

        /* レスポンシブデザイン */
        @media (max-width: 768px) {
            .container {
                padding: var(--space-md);
            }
            
            .steps-indicator {
                flex-direction: column;
            }
            
            .action-cards {
                grid-template-columns: 1fr;
            }
            
            .result-summary {
                flex-direction: column;
            }
        }

        /* ローディング */
        .loading {
            text-align: center;
            padding: var(--space-xl);
            color: var(--text-secondary);
        }

        .loading i {
            animation: spin 1s linear infinite;
            font-size: 2rem;
            margin-bottom: var(--space-md);
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* トースト通知 */
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: var(--space-md);
            border-radius: var(--radius-md);
            z-index: 1000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .toast.error {
            background: var(--danger-color);
        }

        .toast.warning {
            background: var(--warning-color);
        }

        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        /* スイッチ */
        .switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
        }

        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--border-color);
            transition: .4s;
            border-radius: 34px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 26px;
            width: 26px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        input:checked + .slider {
            background-color: var(--success-color);
        }

        input:checked + .slider:before {
            transform: translateX(26px);
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <header class="main-header">
            <div class="version-badge">PHP API v2.0</div>
            <h1><i class="fas fa-store"></i> 統合出品管理システム</h1>
            <p class="subtitle">CSV編集・一括出品・自動スケジューリング - PHP API統合版</p>
        </header>

        <!-- セクション切り替えボタン -->
        <div class="section-toggle">
            <button class="btn btn-primary" onclick="showAllSections()">全セクション表示</button>
            <button class="btn btn-secondary" onclick="showNormalView()">通常表示</button>
            <button class="btn btn-secondary" onclick="loadListingStats()">統計更新</button>
        </div>

        <!-- 統計表示 -->
        <div class="stats-grid" id="statsGrid">
            <div class="stat-card">
                <div class="stat-value" id="stat-pending">-</div>
                <div class="stat-label">出品待ち</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-processing">-</div>
                <div class="stat-label">処理中</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-listed">-</div>
                <div class="stat-label">出品済み</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-failed">-</div>
                <div class="stat-label">失敗</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-scheduled">-</div>
                <div class="stat-label">予約済み</div>
            </div>
        </div>

        <!-- ステップインジケーター -->
        <div class="steps-indicator">
            <div class="step active" data-step="1" onclick="showSection('data-preparation')">
                <div class="step-number">1</div>
                <div class="step-title">データ準備</div>
            </div>
            <div class="step" data-step="2" onclick="showSection('csv-editing')">
                <div class="step-number">2</div>
                <div class="step-title">CSV編集</div>
            </div>
            <div class="step" data-step="3" onclick="showSection('error-handling')">
                <div class="step-number">3</div>
                <div class="step-title">検証・修正</div>
            </div>
            <div class="step" data-step="4" onclick="showSection('listing-execution')">
                <div class="step-number">4</div>
                <div class="step-title">出品実行</div>
            </div>
        </div>

        <!-- セクション1: データ準備 -->
        <section id="data-preparation" class="content-section active">
            <div class="section-header">
                <h2><i class="fas fa-database"></i> データ準備</h2>
                <p>CSVテンプレート生成または承認済みデータのダウンロード</p>
            </div>

            <div class="action-cards">
                <div class="card">
                    <div class="card-icon">
                        <i class="fas fa-file-csv"></i>
                    </div>
                    <h3>CSVテンプレート生成</h3>
                    <p>eBay出品用の標準テンプレートを生成します</p>
                    <button class="btn btn-primary" onclick="generateCSVTemplate()">
                        <i class="fas fa-download"></i> テンプレート生成
                    </button>
                </div>

                <div class="card">
                    <div class="card-icon">
                        <i class="fas fa-cloud-download-alt"></i>
                    </div>
                    <h3>承認済みデータダウンロード</h3>
                    <p>03_approvalで承認された商品データをCSV形式でダウンロード</p>
                    <button class="btn btn-success" onclick="downloadApprovedData()">
                        <i class="fas fa-download"></i> データダウンロード
                    </button>
                </div>
            </div>
        </section>

        <!-- セクション2: CSV編集・アップロード -->
        <section id="csv-editing" class="content-section">
            <div class="section-header">
                <h2><i class="fas fa-upload"></i> CSV編集・アップロード</h2>
                <p>編集済みCSVファイルをアップロードして検証</p>
            </div>

            <div class="upload-area">
                <div class="upload-zone" id="csvUploadZone">
                    <div class="upload-icon">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <p class="upload-text">CSVファイルをドラッグ&ドロップ</p>
                    <p class="upload-subtext">または</p>
                    <button class="btn btn-primary" onclick="document.getElementById('csvFileInput').click()">
                        ファイルを選択
                    </button>
                    <input type="file" id="csvFileInput" accept=".csv" style="display: none;">
                </div>
            </div>

            <!-- アップロード結果表示 -->
            <div id="uploadResult" class="upload-result">
                <div class="result-summary">
                    <div class="summary-item success">
                        <i class="fas fa-check-circle"></i>
                        <span class="label">有効データ</span>
                        <span class="count" id="validCount">0</span>
                    </div>
                    <div class="summary-item error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span class="label">エラー</span>
                        <span class="count" id="errorCount">0</span>
                    </div>
                    <div class="summary-item warning">
                        <i class="fas fa-exclamation-circle"></i>
                        <span class="label">警告</span>
                        <span class="count" id="warningCount">0</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- セクション3: エラー表示・個別編集 -->
        <section id="error-handling" class="content-section">
            <div class="section-header">
                <h2><i class="fas fa-exclamation-triangle"></i> データ検証・エラー修正</h2>
                <p>検証エラーのある商品を確認・修正</p>
            </div>

            <div id="errorList" class="error-list">
                <!-- エラーリストは動的に生成 -->
                <div class="loading" id="errorListLoading" style="display: none;">
                    <i class="fas fa-spinner"></i>
                    <p>エラーリストを読み込み中...</p>
                </div>
            </div>
        </section>

        <!-- セクション4: 出品設定・実行 -->
        <section id="listing-execution" class="content-section">
            <div class="section-header">
                <h2><i class="fas fa-rocket"></i> 出品実行</h2>
                <p>販路選択・設定確認後、一括出品を実行</p>
            </div>

            <div class="settings-group">
                <h3><i class="fas fa-store"></i> 販路選択</h3>
                <div class="marketplace-selection">
                    <label class="checkbox-label">
                        <input type="checkbox" id="ebayMarketplace" value="ebay" checked>
                        <span class="checkmark"></span>
                        <span class="marketplace-name">eBay</span>
                        <span class="marketplace-status active">利用可能</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="yahooMarketplace" value="yahoo" disabled>
                        <span class="checkmark"></span>
                        <span class="marketplace-name">Yahoo オークション</span>
                        <span class="marketplace-status pending">開発中</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="mercariMarketplace" value="mercari" disabled>
                        <span class="checkmark"></span>
                        <span class="marketplace-name">メルカリ</span>
                        <span class="marketplace-status pending">開発中</span>
                    </label>
                </div>
            </div>

            <div class="settings-group">
                <h3><i class="fas fa-cogs"></i> 出品設定</h3>
                <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md);">
                    <label class="switch">
                        <input type="checkbox" id="testMode" checked>
                        <span class="slider"></span>
                    </label>
                    <span>テストモード（Sandbox使用）</span>
                </div>
                <p style="color: var(--text-secondary); font-size: 0.875rem;">
                    テストモードでは実際の出品は行われず、模擬的な処理のみ実行されます。
                </p>
            </div>

            <div class="execution-area">
                <button id="startListingBtn" class="btn btn-large btn-primary" onclick="startListing()">
                    <i class="fas fa-play"></i> 一括出品開始
                </button>
                <p style="margin-top: var(--space-md); color: var(--text-secondary); font-size: 0.875rem;">
                    承認済みの商品が自動的に出品キューに追加されます
                </p>
            </div>
        </section>
    </div>

    <script>
        // グローバル変数
        const API_BASE = 'api/listing.php';
        let currentUploadId = null;

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            loadListingStats();
            setupFileUpload();
            
            // 統計を5秒ごとに更新
            setInterval(loadListingStats, 5000);
        });

        // 統計データ読み込み
        async function loadListingStats() {
            try {
                const response = await fetch(`${API_BASE}?action=get_listing_stats`);
                const data = await response.json();
                
                if (data.success) {
                    const stats = data.data;
                    document.getElementById('stat-pending').textContent = stats.pending_count || 0;
                    document.getElementById('stat-processing').textContent = stats.processing_count || 0;
                    document.getElementById('stat-listed').textContent = stats.listed_count || 0;
                    document.getElementById('stat-failed').textContent = stats.failed_count || 0;
                    document.getElementById('stat-scheduled').textContent = stats.scheduled_count || 0;
                }
            } catch (error) {
                console.error('統計取得エラー:', error);
            }
        }

        // CSVテンプレート生成
        async function generateCSVTemplate() {
            try {
                const response = await fetch(`${API_BASE}?action=get_csv_template`);
                const data = await response.json();
                
                if (data.success) {
                    // CSVテンプレートダウンロード処理
                    const csvContent = "title,description,price,category_id,condition_id,images,quantity,duration\n" +
                        "Sample Product Title,Product description here,29.99,9355,1000,https://example.com/image.jpg,1,7\n" +
                        "Another Product,Another description,19.99,9355,1000,https://example.com/image2.jpg,1,7";
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'ebay_listing_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    showToast('CSVテンプレートをダウンロードしました', 'success');
                } else {
                    showToast('テンプレート生成に失敗しました', 'error');
                }
            } catch (error) {
                showToast('テンプレート生成中にエラーが発生しました', 'error');
            }
        }

        // 承認済みデータダウンロード
        async function downloadApprovedData() {
            try {
                const response = await fetch(`${API_BASE}?action=download_yahoo_data`);
                const data = await response.json();
                
                if (data.success) {
                    // 実際の実装では承認済みデータをCSV形式で生成
                    showToast('承認済みデータのダウンロードを開始します', 'success');
                } else {
                    showToast('データダウンロードに失敗しました', 'error');
                }
            } catch (error) {
                showToast('ダウンロード中にエラーが発生しました', 'error');
            }
        }

        // ファイルアップロード設定
        function setupFileUpload() {
            const uploadZone = document.getElementById('csvUploadZone');
            const fileInput = document.getElementById('csvFileInput');

            // ドラッグ&ドロップ
            uploadZone.addEventListener('dragover', function(e) {
                e.preventDefault();
                uploadZone.classList.add('dragover');
            });

            uploadZone.addEventListener('dragleave', function() {
                uploadZone.classList.remove('dragover');
            });

            uploadZone.addEventListener('drop', function(e) {
                e.preventDefault();
                uploadZone.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handleFileUpload(files[0]);
                }
            });

            // ファイル選択
            fileInput.addEventListener('change', function() {
                if (this.files.length > 0) {
                    handleFileUpload(this.files[0]);
                }
            });
        }

        // ファイルアップロード処理
        async function handleFileUpload(file) {
            if (!file.name.toLowerCase().endsWith('.csv')) {
                showToast('CSVファイルのみアップロード可能です', 'error');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                showToast('ファイルサイズが10MBを超えています', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('csv_file', file);

            try {
                showToast('ファイルをアップロード中...', 'info');

                const response = await fetch(`${API_BASE}?action=upload_csv`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (data.success) {
                    currentUploadId = data.upload_id;
                    showToast(`ファイルアップロード完了: ${data.filename}`, 'success');
                    
                    // 検証結果を待つ
                    checkValidationProgress();
                } else {
                    showToast(data.message || 'アップロードに失敗しました', 'error');
                }
            } catch (error) {
                showToast('アップロード中にエラーが発生しました', 'error');
            }
        }

        // 検証進捗確認
        async function checkValidationProgress() {
            if (!currentUploadId) return;

            try {
                const response = await fetch(`${API_BASE}?action=validate_csv&upload_id=${currentUploadId}`);
                const data = await response.json();
                
                if (data.success) {
                    updateUploadResults(data.data);
                    
                    if (data.data.status === 'processing') {
                        // まだ処理中の場合、2秒後に再確認
                        setTimeout(checkValidationProgress, 2000);
                    }
                }
            } catch (error) {
                console.error('検証進捗確認エラー:', error);
            }
        }

        // アップロード結果更新
        function updateUploadResults(validationData) {
            const resultDiv = document.getElementById('uploadResult');
            const validCount = document.getElementById('validCount');
            const errorCount = document.getElementById('errorCount');
            const warningCount = document.getElementById('warningCount');

            validCount.textContent = validationData.valid_rows || 0;
            errorCount.textContent = validationData.error_rows || 0;
            warningCount.textContent = validationData.warning_rows || 0;

            resultDiv.style.display = 'block';

            if (validationData.status === 'completed') {
                if (validationData.error_rows > 0) {
                    showToast(`検証完了: ${validationData.error_rows}件のエラーがあります`, 'warning');
                } else {
                    showToast(`検証完了: 全${validationData.valid_rows}件が有効です`, 'success');
                }
            }
        }

        // 一括出品開始
        async function startListing() {
            const testMode = document.getElementById('testMode').checked;
            const ebayEnabled = document.getElementById('ebayMarketplace').checked;

            if (!ebayEnabled) {
                showToast('出品先を選択してください', 'warning');
                return;
            }

            if (!confirm(`${testMode ? 'テストモード' : '本番モード'}で出品を開始しますか？`)) {
                return;
            }

            try {
                showToast('出品処理を開始しています...', 'info');

                const response = await fetch(API_BASE, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'start_listing',
                        listing_ids: [], // 空の場合は全ての準備完了アイテム
                        test_mode: testMode
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    showToast(`出品処理を開始しました: ${data.processed_count}件`, 'success');
                    loadListingStats(); // 統計更新
                } else {
                    showToast(data.message || '出品開始に失敗しました', 'error');
                }
            } catch (error) {
                showToast('出品処理中にエラーが発生しました', 'error');
            }
        }

        // セクション表示制御
        function showSection(sectionId) {
            // 全セクション非表示
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            // 指定セクション表示
            document.getElementById(sectionId).classList.add('active');
            
            // ステップ状態更新
            document.querySelectorAll('.step').forEach(step => {
                step.classList.remove('active');
            });
            
            const stepMap = {
                'data-preparation': 1,
                'csv-editing': 2,
                'error-handling': 3,
                'listing-execution': 4
            };
            
            const stepNumber = stepMap[sectionId];
            if (stepNumber) {
                document.querySelector(`.step[data-step="${stepNumber}"]`).classList.add('active');
            }
        }

        // 全セクション表示
        function showAllSections() {
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.add('active');
            });
            
            document.querySelectorAll('.step').forEach(step => {
                step.classList.add('active');
            });
        }

        // 通常表示
        function showNormalView() {
            showSection('data-preparation');
        }

        // トースト通知
        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i> ${message}`;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    </script>
</body>
</html>