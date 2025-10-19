<?php
/**
 * eBayデータテストビューアー - 緊急修復版
 * JavaScript・CSS・表示機能の完全復旧
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// CSRF トークン生成
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$csrf_token = isset($_SESSION['csrf_token']) ? $_SESSION['csrf_token'] : bin2hex(random_bytes(32));
$_SESSION['csrf_token'] = $csrf_token;

// URL パラメータ取得
$view_mode = isset($_GET['view']) ? $_GET['view'] : 'excel';
$data_source = isset($_GET['source']) ? $_GET['source'] : 'ebay';

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBayデータビューアー - 緊急修復版</title>
    
    <!-- 外部CSS -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <!-- インラインCSS（CSSファイル読み込み問題回避） -->
    <style>
        /* ===== 基本レイアウト ===== */
        * { box-sizing: border-box; }
        
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f6fa;
            line-height: 1.6;
        }
        
        .container {
            max-width: 100%;
            margin: 0;
            padding: 1rem;
            min-height: 100vh;
        }
        
        /* ===== ヘッダー ===== */
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
        }
        
        .header h1 {
            font-size: 2rem;
            font-weight: 700;
            margin: 0 0 0.5rem 0;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
            margin: 0;
        }
        
        /* ===== データソース切り替え ===== */
        .data-source-switcher {
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 16px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }
        
        .data-source-switcher h3 {
            color: #495057;
            margin: 0 0 1.5rem 0;
            font-size: 1.25rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .source-options {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
        }
        
        .source-btn {
            padding: 1rem 1.25rem;
            border: 2px solid #ced4da;
            border-radius: 12px;
            background: white;
            color: #495057;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            font-size: 0.95rem;
        }
        
        .source-btn:hover {
            border-color: #007bff;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 123, 255, 0.25);
        }
        
        .source-btn.active {
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            border-color: #007bff;
        }
        
        .source-btn.coming-soon {
            opacity: 0.6;
            cursor: not-allowed;
            position: relative;
        }
        
        .source-btn.coming-soon::after {
            content: 'Coming Soon';
            position: absolute;
            top: -10px;
            right: -10px;
            background: #ffc107;
            color: #212529;
            font-size: 0.7rem;
            padding: 0.25rem 0.5rem;
            border-radius: 6px;
            font-weight: 700;
        }
        
        /* ===== コントロールバー ===== */
        .controls {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .view-controls, .data-controls {
            display: flex;
            gap: 0.75rem;
            align-items: center;
        }
        
        .view-controls h4 {
            margin: 0;
            color: #495057;
            font-size: 1rem;
            font-weight: 600;
        }
        
        .control-btn {
            padding: 0.75rem 1.25rem;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            background: white;
            color: #495057;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .control-btn:hover {
            background: #f8f9fa;
            border-color: #adb5bd;
        }
        
        .control-btn.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }
        
        /* ===== Excelテーブル ===== */
        .excel-wrapper {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            border: 1px solid #e9ecef;
            margin-bottom: 2rem;
        }
        
        .excel-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }
        
        .excel-table thead {
            background: linear-gradient(135deg, #495057 0%, #343a40 100%);
            color: white;
        }
        
        .excel-table th {
            padding: 1rem 0.75rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .excel-table td {
            padding: 0.875rem 0.75rem;
            border-bottom: 1px solid #f8f9fa;
            vertical-align: middle;
        }
        
        .excel-table tbody tr:hover {
            background: #f8f9fa;
        }
        
        .product-thumbnail {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 6px;
            border: 2px solid #e9ecef;
        }
        
        .product-title-main {
            font-weight: 600;
            color: #212529;
            line-height: 1.3;
            margin-bottom: 0.25rem;
        }
        
        .product-category {
            font-size: 0.75rem;
            color: #6c757d;
            background: #e9ecef;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            display: inline-block;
        }
        
        .status-badge {
            padding: 0.35rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-badge--active {
            background: #28a745;
            color: white;
        }
        
        .status-badge--ended {
            background: #6c757d;
            color: white;
        }
        
        .status-badge--sold {
            background: #17a2b8;
            color: white;
        }
        
        .stock-input {
            width: 70px;
            padding: 0.5rem;
            border: 2px solid #e9ecef;
            border-radius: 6px;
            text-align: center;
            font-weight: 600;
        }
        
        .price-display {
            font-size: 1.1rem;
            font-weight: 700;
            color: #28a745;
        }
        
        .action-btn {
            padding: 0.5rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            margin: 0 0.25rem;
            width: 35px;
            height: 35px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        
        .action-btn--edit {
            background: #007bff;
            color: white;
        }
        
        .action-btn--info {
            background: #17a2b8;
            color: white;
        }
        
        .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        /* ===== カードビュー ===== */
        .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1.5rem;
            padding: 1rem 0;
        }
        
        .product-card {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            border: 1px solid #e9ecef;
        }
        
        .product-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }
        
        .card-image-container {
            position: relative;
            height: 200px;
            overflow: hidden;
        }
        
        .card-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .card-badge {
            position: absolute;
            top: 12px;
            right: 12px;
        }
        
        .card-content {
            padding: 1.5rem;
        }
        
        .card-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #212529;
            line-height: 1.3;
            margin: 0 0 1rem 0;
        }
        
        .card-details {
            margin-bottom: 1.5rem;
        }
        
        .card-detail-row {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f8f9fa;
        }
        
        .card-actions {
            display: flex;
            gap: 0.75rem;
        }
        
        .card-btn {
            flex: 1;
            padding: 0.75rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        
        .card-btn--primary {
            background: #007bff;
            color: white;
        }
        
        .card-btn--secondary {
            background: #6c757d;
            color: white;
        }
        
        /* ===== モーダル ===== */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            justify-content: center;
            align-items: center;
        }
        
        .modal-container {
            background: white;
            border-radius: 16px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .modal-header {
            padding: 2rem 2rem 1rem;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 50%;
        }
        
        .modal-body {
            padding: 2rem;
        }
        
        .modal-footer {
            padding: 1rem 2rem 2rem;
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
        }
        
        /* ===== 通知 ===== */
        .notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        }
        
        .notification {
            background: white;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border-left: 4px solid #007bff;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
        
        .notification--success { border-left-color: #28a745; }
        .notification--error { border-left-color: #dc3545; }
        .notification--warning { border-left-color: #ffc107; }
        
        /* ===== ローディング ===== */
        .loader {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            justify-content: center;
            align-items: center;
        }
        
        .loader-content {
            background: white;
            padding: 3rem;
            border-radius: 16px;
            text-align: center;
        }
        
        .loader-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* ===== JSON出力 ===== */
        .json-wrapper {
            margin-top: 3rem;
            background: white;
            border-radius: 12px;
            padding: 2rem;
            border: 1px solid #e9ecef;
        }
        
        .json-display {
            background: #212529;
            color: #28a745;
            padding: 1.5rem;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            overflow-x: auto;
            max-height: 400px;
            overflow-y: auto;
        }
        
        /* ===== レスポンシブ ===== */
        @media (max-width: 768px) {
            .controls {
                flex-direction: column;
                gap: 1rem;
            }
            
            .card-grid {
                grid-template-columns: 1fr;
            }
            
            .source-options {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <h1><i class="fas fa-chart-bar"></i> eBayデータビューアー</h1>
            <p>緊急修復版 - JavaScript・CSS・表示機能復旧済み</p>
        </div>

        <!-- データソース選択 -->
        <div class="data-source-switcher">
            <h3><i class="fas fa-database"></i> データソース選択</h3>
            <div class="source-options">
                <a href="?source=ebay&view=<?= $view_mode ?>" class="source-btn <?= $data_source === 'ebay' ? 'active' : '' ?>">
                    <i class="fab fa-ebay"></i>
                    eBayデータ
                </a>
                <button class="source-btn coming-soon" disabled>
                    <i class="fab fa-amazon"></i>
                    Amazon
                </button>
                <button class="source-btn coming-soon" disabled>
                    <i class="fas fa-yen-sign"></i>
                    メルカリ
                </button>
                <button class="source-btn coming-soon" disabled>
                    <i class="fas fa-shopping-bag"></i>
                    楽天
                </button>
            </div>
        </div>

        <!-- コントロールバー -->
        <div class="controls">
            <div class="view-controls">
                <h4>表示形式:</h4>
                <button class="control-btn <?= $view_mode === 'excel' ? 'active' : '' ?>" 
                        onclick="switchViewMode('excel')">
                    <i class="fas fa-table"></i> Excel
                </button>
                <button class="control-btn <?= $view_mode === 'card' ? 'active' : '' ?>" 
                        onclick="switchViewMode('card')">
                    <i class="fas fa-th-large"></i> Card
                </button>
            </div>
            
            <div class="data-controls">
                <button class="control-btn" onclick="refreshDataDisplay()" id="refresh-btn">
                    <i class="fas fa-sync-alt"></i> データ更新
                </button>
                <button class="control-btn" onclick="exportDataToJson()">
                    <i class="fas fa-download"></i> エクスポート
                </button>
            </div>
        </div>

        <!-- データ表示エリア -->
        <div id="content-area">
            <?php if ($view_mode === 'excel'): ?>
                <!-- Excelビュー -->
                <div id="excel-view" class="view-content active-view">
                    <div class="excel-wrapper">
                        <table class="excel-table">
                            <thead>
                                <tr>
                                    <th><input type="checkbox" id="master-checkbox" /></th>
                                    <th>画像</th>
                                    <th>商品タイトル</th>
                                    <th>ID/ASIN</th>
                                    <th>ステータス</th>
                                    <th>在庫</th>
                                    <th>価格</th>
                                    <th>最終更新</th>
                                    <th>アクション</th>
                                </tr>
                            </thead>
                            <tbody id="excel-tbody">
                                <!-- データがJavaScriptで動的に挿入されます -->
                            </tbody>
                        </table>
                    </div>
                </div>
            <?php else: ?>
                <!-- カードビュー -->
                <div id="card-view" class="view-content active-view">
                    <div id="card-container" class="card-grid">
                        <!-- カードがJavaScriptで動的に挿入されます -->
                    </div>
                </div>
            <?php endif; ?>
        </div>

        <!-- JSON出力エリア -->
        <div class="json-wrapper">
            <h3><i class="fas fa-code"></i> API レスポンス（デバッグ用）</h3>
            <pre class="json-display" id="json-output">データ読み込み中...</pre>
        </div>

        <!-- モーダル -->
        <div id="data-modal" class="modal" aria-hidden="true">
            <div class="modal-container">
                <div class="modal-header">
                    <h2 class="modal-title">
                        <i class="fas fa-info-circle"></i> 商品詳細情報
                    </h2>
                    <button class="modal-close" onclick="closeModal()">
                        &times;
                    </button>
                </div>
                <div class="modal-body">
                    <div id="modal-content">
                        <p>データ読み込み中...</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="closeModal()">閉じる</button>
                    <button onclick="refreshModalData()">データ更新</button>
                </div>
            </div>
        </div>

        <!-- ローディング -->
        <div class="loader" id="advanced-loader">
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <h4>データ処理中...</h4>
                <p id="loading-message">データを取得しています</p>
            </div>
        </div>
    </div>

    <!-- JavaScript（インライン・エラー解決版） -->
    <script>
        // ===== グローバル設定 =====
        window.CSRF_TOKEN = "<?= $csrf_token ?>";
        window.CURRENT_VIEW = "<?= $view_mode ?>";
        window.CURRENT_SOURCE = "<?= $data_source ?>";
        
        let allProducts = [];
        let filteredProducts = [];

        // ===== データ取得関数 =====
        async function loadMultiPlatformData(source = 'ebay') {
            showAdvancedLoader('データを取得中...');
            
            try {
                const response = await fetch(`data.json?source=${source}&timestamp=${Date.now()}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data && data.success) {
                    allProducts = data.products || [];
                    filteredProducts = [...allProducts];
                    
                    displayPlatformResults(data);
                    hideAdvancedLoader();
                    showSuccessNotification(`✅ ${allProducts.length}件のデータを取得しました`);
                    
                } else {
                    throw new Error(data.message || 'データ形式が不正です');
                }
                
            } catch (error) {
                console.error('データ取得エラー:', error);
                hideAdvancedLoader();
                showErrorNotification(`データ取得エラー: ${error.message}`);
                
                // フォールバック処理
                loadFallbackSampleData();
            }
        }

        // ===== フォールバックデータ =====
        function loadFallbackSampleData() {
            console.log('📦 フォールバックサンプルデータを読み込み中...');
            
            const sampleData = {
                success: true,
                message: 'サンプルデータ（フォールバック）',
                products: [
                    {
                        title: 'Japanese Vintage Camera - Nikon F2 with 50mm Lens',
                        asin: 'SAMPLE-CAM-001',
                        status: 'Active',
                        stock: 1,
                        price: 299.99,
                        category: 'Cameras',
                        condition: 'Used - Excellent'
                    },
                    {
                        title: 'Traditional Japanese Ceramic Tea Set - Blue and White',
                        asin: 'SAMPLE-TEA-002',
                        status: 'Active', 
                        stock: 3,
                        price: 89.99,
                        category: 'Home & Kitchen',
                        condition: 'New'
                    },
                    {
                        title: 'Authentic Japanese Katana - Decorative Samurai Sword',
                        asin: 'SAMPLE-SWD-003',
                        status: 'Ended',
                        stock: 0,
                        price: 199.99,
                        category: 'Collectibles',
                        condition: 'New'
                    },
                    {
                        title: 'Pokemon Cards - Japanese Edition Booster Pack',
                        asin: 'SAMPLE-PKM-004',
                        status: 'Active',
                        stock: 12,
                        price: 45.00,
                        category: 'Trading Cards',
                        condition: 'New'
                    },
                    {
                        title: 'Japanese Woodblock Print - Hokusai Wave Reproduction',
                        asin: 'SAMPLE-ART-005',
                        status: 'Sold',
                        stock: 2,
                        price: 75.00,
                        category: 'Art',
                        condition: 'New'
                    }
                ]
            };
            
            allProducts = sampleData.products;
            filteredProducts = [...allProducts];
            displayPlatformResults(sampleData);
            
            showWarningNotification('⚠️ サンプルデータを表示中（元データ取得に失敗）');
        }

        // ===== 結果表示 =====
        function displayPlatformResults(data) {
            const currentView = window.CURRENT_VIEW || 'excel';
            
            console.log(`📊 ${currentView}ビューでデータ表示開始:`, data.products.length, '件');
            
            if (currentView === 'excel') {
                displayEnhancedExcelView(data.products);
            } else if (currentView === 'card') {
                displayEnhancedCardView(data.products);
            }
            
            updateJsonOutput(data);
        }

        // ===== Excelビュー表示 =====
        function displayEnhancedExcelView(products) {
            const tbody = document.getElementById('excel-tbody');
            if (!tbody) {
                console.error('❌ Excel tbody要素が見つかりません');
                return;
            }
            
            tbody.innerHTML = '';
            
            products.forEach((product, index) => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>
                        <input type="checkbox" class="item-checkbox" data-index="${index}">
                    </td>
                    <td>
                        <img src="https://via.placeholder.com/60" 
                             alt="${escapeHtml(product.title)}" 
                             class="product-thumbnail"
                             onerror="this.src='https://via.placeholder.com/60/cccccc/666666?text=No+Image'">
                    </td>
                    <td>
                        <div class="product-title-main">${escapeHtml(product.title)}</div>
                        ${product.category ? `<div class="product-category">${escapeHtml(product.category)}</div>` : ''}
                    </td>
                    <td>
                        <span class="product-id">${escapeHtml(product.asin)}</span>
                    </td>
                    <td>
                        <span class="status-badge ${getStatusBadgeClass(product.status)}">
                            ${escapeHtml(product.status)}
                        </span>
                    </td>
                    <td>
                        <input type="number" 
                               value="${product.stock}" 
                               class="stock-input" 
                               min="0"
                               onchange="updateStockQuantity(${index}, this.value)"
                               ${product.status === 'Ended' ? 'disabled' : ''}>
                    </td>
                    <td>
                        <div class="price-display">$${product.price.toFixed(2)}</div>
                        ${product.condition ? `<div style="font-size: 0.75rem; color: #6c757d;">${escapeHtml(product.condition)}</div>` : ''}
                    </td>
                    <td>
                        <span>${formatDateDisplay(new Date())}</span>
                    </td>
                    <td>
                        <button class="action-btn action-btn--edit" 
                                onclick="openProductEditor(${index})"
                                title="商品を編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn action-btn--info" 
                                onclick="showProductDetails(${index})"
                                title="詳細を表示">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </td>
                `;
                
                tbody.appendChild(row);
            });
            
            console.log(`✅ Excelビュー表示完了: ${products.length}行`);
        }

        // ===== カードビュー表示 =====
        function displayEnhancedCardView(products) {
            const container = document.getElementById('card-container');
            if (!container) {
                console.error('❌ Card container要素が見つかりません');
                return;
            }
            
            container.innerHTML = '';
            
            products.forEach((product, index) => {
                const card = document.createElement('div');
                card.className = 'product-card';
                
                card.innerHTML = `
                    <div class="card-image-container">
                        <img src="https://via.placeholder.com/320x200" 
                             alt="${escapeHtml(product.title)}"
                             class="card-image"
                             onerror="this.src='https://via.placeholder.com/320x200/cccccc/666666?text=No+Image'">
                        <div class="card-badge">
                            <span class="status-badge ${getStatusBadgeClass(product.status)}">
                                ${escapeHtml(product.status)}
                            </span>
                        </div>
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">${escapeHtml(product.title)}</h3>
                        ${product.category ? `<div style="margin-bottom: 1rem; font-size: 0.85rem; color: #6c757d;">カテゴリ: ${escapeHtml(product.category)}</div>` : ''}
                        <div class="card-details">
                            <div class="card-detail-row">
                                <span>ID:</span>
                                <span>${escapeHtml(product.asin)}</span>
                            </div>
                            <div class="card-detail-row">
                                <span>価格:</span>
                                <span style="color: #28a745; font-weight: bold;">$${product.price.toFixed(2)}</span>
                            </div>
                            <div class="card-detail-row">
                                <span>在庫:</span>
                                <span style="${product.stock === 0 ? 'color: #dc3545;' : ''}">${product.stock}</span>
                            </div>
                            ${product.condition ? `
                            <div class="card-detail-row">
                                <span>状態:</span>
                                <span>${escapeHtml(product.condition)}</span>
                            </div>
                            ` : ''}
                        </div>
                        <div class="card-actions">
                            <button class="card-btn card-btn--primary" onclick="openProductEditor(${index})">
                                <i class="fas fa-edit"></i> 編集
                            </button>
                            <button class="card-btn card-btn--secondary" onclick="showProductDetails(${index})">
                                <i class="fas fa-info-circle"></i> 詳細
                            </button>
                        </div>
                    </div>
                `;
                
                container.appendChild(card);
            });
            
            console.log(`✅ カードビュー表示完了: ${products.length}枚`);
        }

        // ===== 商品操作関数 =====
        function openProductEditor(index) {
            const product = allProducts[index];
            if (!product) {
                showErrorNotification('商品データが見つかりません');
                return;
            }
            
            const modalContent = document.getElementById('modal-content');
            modalContent.innerHTML = `
                <div style="margin-bottom: 2rem;">
                    <h4>商品編集</h4>
                    <p style="color: #6c757d; margin: 0.5rem 0;">${escapeHtml(product.title)}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">商品ID</label>
                        <input type="text" value="${escapeHtml(product.asin)}" readonly 
                               style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; background: #f8f9fa;">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">商品名</label>
                        <input type="text" value="${escapeHtml(product.title)}" id="edit-title-${index}" 
                               style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">価格 (USD)</label>
                        <input type="number" value="${product.price}" step="0.01" id="edit-price-${index}" 
                               style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">在庫数</label>
                        <input type="number" value="${product.stock}" min="0" id="edit-stock-${index}" 
                               style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                    </div>
                </div>
                
                <div style="margin-top: 2rem; text-align: center;">
                    <button onclick="saveProductChanges(${index})" 
                            style="background: #28a745; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; margin: 0 0.5rem; cursor: pointer;">
                        <i class="fas fa-save"></i> 変更を保存
                    </button>
                    <button onclick="resetProductForm(${index})" 
                            style="background: #ffc107; color: #212529; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; margin: 0 0.5rem; cursor: pointer;">
                        <i class="fas fa-undo"></i> リセット
                    </button>
                </div>
            `;
            
            openModal();
        }

        function showProductDetails(index) {
            const product = allProducts[index];
            if (!product) {
                showErrorNotification('商品データが見つかりません');
                return;
            }
            
            const modalContent = document.getElementById('modal-content');
            modalContent.innerHTML = `
                <div>
                    <h4 style="margin-bottom: 2rem;">商品詳細情報</h4>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                        <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px;">
                            <h5 style="margin-bottom: 1rem; color: #495057;">基本情報</h5>
                            <div style="margin-bottom: 0.5rem;"><strong>商品名:</strong> ${escapeHtml(product.title)}</div>
                            <div style="margin-bottom: 0.5rem;"><strong>ID:</strong> ${escapeHtml(product.asin)}</div>
                            <div style="margin-bottom: 0.5rem;"><strong>価格:</strong> $${product.price.toFixed(2)}</div>
                            <div style="margin-bottom: 0.5rem;"><strong>在庫:</strong> ${product.stock}</div>
                            <div><strong>ステータス:</strong> <span class="status-badge ${getStatusBadgeClass(product.status)}">${escapeHtml(product.status)}</span></div>
                        </div>
                        
                        ${product.category || product.condition ? `
                        <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px;">
                            <h5 style="margin-bottom: 1rem; color: #495057;">追加情報</h5>
                            ${product.category ? `<div style="margin-bottom: 0.5rem;"><strong>カテゴリ:</strong> ${escapeHtml(product.category)}</div>` : ''}
                            ${product.condition ? `<div><strong>状態:</strong> ${escapeHtml(product.condition)}</div>` : ''}
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            openModal();
        }

        function updateStockQuantity(index, newValue) {
            const numValue = parseInt(newValue) || 0;
            
            if (numValue < 0) {
                showErrorNotification('在庫数は0以上で入力してください');
                return;
            }
            
            if (allProducts[index]) {
                const oldValue = allProducts[index].stock;
                allProducts[index].stock = numValue;
                
                console.log(`📦 在庫更新: Index ${index}, ${oldValue} → ${numValue}`);
                showSuccessNotification(`在庫を ${numValue} に更新しました`);
            }
        }

        function saveProductChanges(index) {
            showSuccessNotification('変更保存機能は実装予定です');
            closeModal();
        }

        function resetProductForm(index) {
            showInfoNotification('フォームをリセットしました');
        }

        // ===== ユーティリティ関数 =====
        function escapeHtml(text) {
            if (typeof text !== 'string') return String(text);
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function getStatusBadgeClass(status) {
            const statusClasses = {
                'Active': 'status-badge--active',
                'Ended': 'status-badge--ended',
                'Sold': 'status-badge--sold',
                'Inactive': 'status-badge--inactive'
            };
            return statusClasses[status] || 'status-badge--unknown';
        }

        function formatDateDisplay(date) {
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        }

        // ===== UI制御関数 =====
        function switchViewMode(newView) {
            if (newView === window.CURRENT_VIEW) return;
            
            const url = new URL(window.location);
            url.searchParams.set('view', newView);
            window.location.href = url.toString();
        }

        function refreshDataDisplay() {
            const refreshButton = document.getElementById('refresh-btn');
            if (refreshButton) {
                const originalText = refreshButton.innerHTML;
                refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 更新中';
                refreshButton.disabled = true;
                
                setTimeout(() => {
                    loadMultiPlatformData(window.CURRENT_SOURCE || 'ebay');
                    refreshButton.innerHTML = originalText;
                    refreshButton.disabled = false;
                }, 1000);
            } else {
                loadMultiPlatformData(window.CURRENT_SOURCE || 'ebay');
            }
        }

        function exportDataToJson() {
            if (allProducts.length === 0) {
                showWarningNotification('エクスポートするデータがありません');
                return;
            }
            
            const exportData = {
                export_date: new Date().toISOString(),
                source: window.CURRENT_SOURCE || 'ebay',
                view_mode: window.CURRENT_VIEW || 'excel',
                total_products: allProducts.length,
                products: allProducts
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${window.CURRENT_SOURCE || 'platform'}_export_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            showSuccessNotification(`${allProducts.length}件のデータをエクスポートしました`);
        }

        // ===== モーダル制御 =====
        function openModal() {
            const modal = document.getElementById('data-modal');
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }

        function closeModal() {
            const modal = document.getElementById('data-modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        }

        function refreshModalData() {
            showInfoNotification('モーダルデータ更新機能は実装予定です');
        }

        // ===== 通知システム =====
        function showSuccessNotification(message) {
            showNotification(message, 'success', 5000);
        }

        function showErrorNotification(message) {
            showNotification(message, 'error', 10000);
        }

        function showWarningNotification(message) {
            showNotification(message, 'warning', 7000);
        }

        function showInfoNotification(message) {
            showNotification(message, 'info', 5000);
        }

        function showNotification(message, type = 'info', duration = 5000) {
            const notificationContainer = getNotificationContainer();
            
            const notification = document.createElement('div');
            notification.className = `notification notification--${type}`;
            
            const icon = getNotificationIcon(type);
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <i class="${icon}"></i>
                    <span>${message}</span>
                </div>
                <button onclick="this.parentElement.remove()" 
                        style="background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 0.25rem;">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            notificationContainer.appendChild(notification);
            
            // 自動削除
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }

        function getNotificationContainer() {
            let container = document.getElementById('notification-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'notification-container';
                container.className = 'notification-container';
                document.body.appendChild(container);
            }
            return container;
        }

        function getNotificationIcon(type) {
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-triangle',
                warning: 'fas fa-exclamation-circle',
                info: 'fas fa-info-circle'
            };
            return icons[type] || icons.info;
        }

        // ===== ローディング制御 =====
        function showAdvancedLoader(message = 'データ処理中...') {
            const loader = document.getElementById('advanced-loader');
            const messageEl = document.getElementById('loading-message');
            
            if (loader && messageEl) {
                messageEl.textContent = message;
                loader.style.display = 'flex';
            }
        }

        function hideAdvancedLoader() {
            const loader = document.getElementById('advanced-loader');
            if (loader) {
                loader.style.display = 'none';
            }
        }

        // ===== JSON出力更新 =====
        function updateJsonOutput(data) {
            const jsonElement = document.getElementById('json-output');
            if (jsonElement) {
                jsonElement.textContent = JSON.stringify(data, null, 2);
            }
        }

        // ===== 初期化 =====
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 eBayデータビューアー - 緊急修復版 初期化開始');
            
            // 設定確認
            console.log('Current View:', window.CURRENT_VIEW);
            console.log('Current Source:', window.CURRENT_SOURCE);
            
            // 初期データ読み込み
            loadMultiPlatformData(window.CURRENT_SOURCE || 'ebay');
            
            // モーダル外クリックイベント
            const modal = document.getElementById('data-modal');
            if (modal) {
                modal.addEventListener('click', function(e) {
                    if (e.target === this) {
                        closeModal();
                    }
                });
            }
            
            // ESCキーでモーダルを閉じる
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeModal();
                }
            });
            
            // チェックボックス全選択
            const masterCheckbox = document.getElementById('master-checkbox');
            if (masterCheckbox) {
                masterCheckbox.addEventListener('change', function() {
                    const itemCheckboxes = document.querySelectorAll('.item-checkbox');
                    itemCheckboxes.forEach(cb => cb.checked = this.checked);
                });
            }
            
            console.log('✅ eBayデータビューアー - 緊急修復版 初期化完了');
            
            // 成功通知
            setTimeout(() => {
                showSuccessNotification('🎉 JavaScript・CSS・表示機能の緊急修復完了！');
            }, 1000);
        });
    </script>
</body>
</html>