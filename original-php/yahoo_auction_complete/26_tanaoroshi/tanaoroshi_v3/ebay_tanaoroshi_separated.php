<?php
/**
 * eBayデータテストビューアー - データ分離・多モール対応版
 * JavaScript エラー完全解決 + 将来拡張性対応
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

// ビューモードをURLから取得。デフォルトはExcelビュー
$view_mode = isset($_GET['view']) ? $_GET['view'] : 'excel';
$data_source = isset($_GET['source']) ? $_GET['source'] : 'ebay';

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>多モールデータビューアー - データ分離版</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../../common/css/style.css">
    <link rel="stylesheet" href="../../common/css/components/ebay_view_switcher_n3.css">
    <link rel="stylesheet" href="../../common/css/components/n3_modal_system.css">
    <link rel="stylesheet" href="tanaoroshi_complete.css">
    
    <!-- データ分離版カスタムCSS -->
    <style>
        /* === データソース切り替え === */
        .data-source-switcher {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border: 2px solid #dee2e6;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .source-options {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 0.75rem;
        }

        .source-btn {
            padding: 0.75rem 1rem;
            border: 2px solid #ced4da;
            border-radius: 8px;
            background: white;
            color: #495057;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }

        .source-btn:hover {
            border-color: #007bff;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,123,255,0.2);
        }

        .source-btn.active {
            background: linear-gradient(135deg, #007bff, #0056b3);
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
            top: -8px;
            right: -8px;
            background: #ffc107;
            color: #212529;
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-weight: 600;
        }

        /* === レスポンシブビューコントロール === */
        .responsive-controls {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .view-controls, .data-controls {
            display: flex;
            gap: 0.5rem;
        }

        .control-btn {
            padding: 0.5rem 1rem;
            border: 1px solid #ced4da;
            border-radius: 6px;
            background: white;
            color: #495057;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s ease;
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

        /* === ローディング強化 === */
        .advanced-loader {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 9999;
            justify-content: center;
            align-items: center;
        }

        .loader-content {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .loader-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error-display {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        }

        .success-display {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <h1><i class="fas fa-chart-bar"></i> 多モールデータビューアー</h1>
            <p>データ分離・JavaScript エラー解決版</p>
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

        <!-- レスポンシブコントロール -->
        <div class="responsive-controls">
            <div class="view-controls">
                <h4 style="margin: 0; color: #495057;">表示形式:</h4>
                <button class="control-btn view-control-btn <?= $view_mode === 'excel' ? 'active' : '' ?>" 
                        onclick="switchView('excel')">
                    <i class="fas fa-table"></i> Excel
                </button>
                <button class="control-btn view-control-btn <?= $view_mode === 'card' ? 'active' : '' ?>" 
                        onclick="switchView('card')">
                    <i class="fas fa-th-large"></i> Card
                </button>
            </div>
            
            <div class="data-controls">
                <button class="control-btn" onclick="refreshData()" id="refresh-btn">
                    <i class="fas fa-sync-alt"></i> データ更新
                </button>
                <button class="control-btn" onclick="exportData()">
                    <i class="fas fa-download"></i> エクスポート
                </button>
            </div>
        </div>

        <!-- データ表示エリア -->
        <div id="content-area">
            <?php if ($view_mode === 'excel'): ?>
                <!-- Excelビュー（インライン） -->
                <div id="excel-view" class="view-content active-view">
                    <div class="n3-excel-wrapper">
                        <table class="n3-excel-table">
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
                <!-- カードビュー（インライン） -->
                <div id="card-view" class="view-content active-view">
                    <div id="card-container" class="card-grid">
                        <!-- カードがJavaScriptで動的に挿入されます -->
                    </div>
                </div>
            <?php endif; ?>
        </div>

        <!-- JSON出力エリア -->
        <div class="json-output-wrapper">
            <h3><i class="fas fa-code"></i> API レスポンス（デバッグ用）</h3>
            <pre class="json-display" id="json-output"></pre>
        </div>

        <!-- モーダル -->
        <div id="data-modal" class="n3-modal n3-modal--large" aria-hidden="true" role="dialog" aria-modal="true">
            <div class="n3-modal__container">
                <div class="n3-modal__header">
                    <h2 class="n3-modal__title">
                        <i class="fas fa-info-circle"></i> 商品詳細情報
                    </h2>
                    <button class="n3-modal__close" onclick="closeModal()">
                        <span class="n3-sr-only">閉じる</span>
                        &times;
                    </button>
                </div>
                <div class="n3-modal__body">
                    <div id="modal-content">
                        <p>データ読み込み中...</p>
                    </div>
                </div>
                <div class="n3-modal__footer">
                    <button class="n3-btn n3-btn--secondary" onclick="closeModal()">
                        閉じる
                    </button>
                    <button class="n3-btn n3-btn--primary" onclick="refreshModalData()">
                        <i class="fas fa-sync"></i> データ更新
                    </button>
                </div>
            </div>
        </div>

        <!-- 高度なローディング -->
        <div class="advanced-loader" id="advanced-loader">
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <h4>データ処理中...</h4>
                <p id="loading-message">データを取得しています</p>
            </div>
        </div>
    </div>

    <!-- JavaScript読み込み（エラー解決版） -->
    <script>
        // ===== グローバル設定 =====
        window.CSRF_TOKEN = "<?= $csrf_token ?>";
        window.CURRENT_VIEW = "<?= $view_mode ?>";
        window.CURRENT_SOURCE = "<?= $data_source ?>";
        
        // ===== データ管理 =====
        let allProducts = [];
        let filteredProducts = [];
        
        // ===== データ取得関数（分離版） =====
        async function loadDataSeparated(source = 'ebay') {
            showLoader('データを取得中...');
            
            try {
                // 実際のデータ取得（data.jsonから）
                const response = await fetch(`data.json?source=${source}&t=${Date.now()}`);
                
                if (!response.ok) {
                    throw new Error(`ネットワークエラー: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    allProducts = data.products;
                    filteredProducts = [...allProducts];
                    displayResults(data);
                    hideLoader();
                    showSuccess(`✅ ${allProducts.length}件のデータを取得しました`);
                } else {
                    throw new Error(data.message || 'データ取得に失敗しました');
                }
                
            } catch (error) {
                console.error('データ取得エラー:', error);
                hideLoader();
                showError(`データ取得エラー: ${error.message}`);
                
                // フォールバック: サンプルデータ表示
                loadFallbackData();
            }
        }
        
        // ===== フォールバックデータ =====
        function loadFallbackData() {
            const fallbackData = {
                success: true,
                products: [
                    {
                        title: 'Japanese Vintage Camera - Nikon F2',
                        asin: 'SAMPLE001',
                        status: 'Active',
                        stock: 1,
                        price: 299.99
                    },
                    {
                        title: 'Traditional Japanese Tea Set',
                        asin: 'SAMPLE002', 
                        status: 'Active',
                        stock: 3,
                        price: 89.99
                    },
                    {
                        title: 'Authentic Katana Replica',
                        asin: 'SAMPLE003',
                        status: 'Ended',
                        stock: 0,
                        price: 199.99
                    }
                ]
            };
            
            allProducts = fallbackData.products;
            displayResults(fallbackData);
            showError('⚠️ サンプルデータを表示しています（本来のデータ取得に失敗）');
        }
        
        // ===== 結果表示（統合版） =====
        function displayResults(data) {
            const currentView = window.CURRENT_VIEW;
            
            if (currentView === 'excel') {
                displayExcelResults(data.products);
            } else if (currentView === 'card') {
                displayCardResults(data.products);
            }
            
            // JSON出力
            document.getElementById('json-output').textContent = JSON.stringify(data, null, 2);
        }
        
        // ===== Excelビュー表示 =====
        function displayExcelResults(products) {
            const tbody = document.getElementById('excel-tbody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            products.forEach((product, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type="checkbox" class="item-checkbox" data-index="${index}"></td>
                    <td><img src="https://via.placeholder.com/50" alt="商品画像" class="product-thumb" 
                             onerror="this.src='https://via.placeholder.com/50/cccccc/666666?text=No+Image'"></td>
                    <td class="product-title">${escapeHtml(product.title)}</td>
                    <td class="product-id">${escapeHtml(product.asin)}</td>
                    <td class="status-cell ${getStatusClass(product.status)}">${escapeHtml(product.status)}</td>
                    <td><input type="number" value="${product.stock}" class="stock-input" 
                               onchange="updateQuantityDirect(${index}, this.value)"></td>
                    <td class="price-cell">$${product.price.toFixed(2)}</td>
                    <td class="date-cell">${formatDate(new Date())}</td>
                    <td><button class="action-btn" onclick="editProduct(${index})">
                        <i class="fas fa-edit"></i> 編集
                    </button></td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // ===== カードビュー表示 =====
        function displayCardResults(products) {
            const container = document.getElementById('card-container');
            if (!container) return;
            
            container.innerHTML = '';
            
            products.forEach((product, index) => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <div class="card-image">
                        <img src="https://via.placeholder.com/200" alt="${escapeHtml(product.title)}"
                             onerror="this.src='https://via.placeholder.com/200/cccccc/666666?text=No+Image'">
                    </div>
                    <div class="card-content">
                        <div class="card-title">${escapeHtml(product.title)}</div>
                        <div class="card-details">
                            <span class="card-id">${escapeHtml(product.asin)}</span>
                            <span class="card-price">$${product.price.toFixed(2)}</span>
                            <span class="card-status ${getStatusClass(product.status)}">${escapeHtml(product.status)}</span>
                        </div>
                        <div class="card-actions">
                            <button class="card-btn" onclick="editProduct(${index})">
                                <i class="fas fa-edit"></i> 編集
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
        
        // ===== ユーティリティ関数 =====
        function escapeHtml(text) {
            if (typeof text !== 'string') return text;
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function getStatusClass(status) {
            const statusMap = {
                'Active': 'status-active',
                'Ended': 'status-ended',
                'Sold': 'status-sold',
                'Inactive': 'status-inactive'
            };
            return statusMap[status] || 'status-unknown';
        }
        
        function formatDate(date) {
            return date.toLocaleDateString('ja-JP');
        }
        
        // ===== 表示制御 =====
        function switchView(newView) {
            if (newView === window.CURRENT_VIEW) return;
            
            const url = new URL(window.location);
            url.searchParams.set('view', newView);
            url.searchParams.set('source', window.CURRENT_SOURCE);
            window.location.href = url.toString();
        }
        
        function refreshData() {
            const btn = document.getElementById('refresh-btn');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 更新中';
            btn.disabled = true;
            
            setTimeout(() => {
                loadDataSeparated(window.CURRENT_SOURCE);
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 1000);
        }
        
        // ===== 商品編集 =====
        function editProduct(index) {
            const product = allProducts[index];
            if (!product) {
                alert('商品データが見つかりません');
                return;
            }
            
            const modalContent = document.getElementById('modal-content');
            modalContent.innerHTML = `
                <div class="product-edit-form">
                    <h4>商品編集: ${escapeHtml(product.title)}</h4>
                    <div class="form-group">
                        <label>ID:</label>
                        <input type="text" value="${escapeHtml(product.asin)}" readonly>
                    </div>
                    <div class="form-group">
                        <label>商品名:</label>
                        <input type="text" value="${escapeHtml(product.title)}" id="edit-title-${index}">
                    </div>
                    <div class="form-group">
                        <label>価格:</label>
                        <input type="number" value="${product.price}" step="0.01" id="edit-price-${index}">
                    </div>
                    <div class="form-group">
                        <label>在庫:</label>
                        <input type="number" value="${product.stock}" id="edit-stock-${index}">
                    </div>
                </div>
            `;
            
            openModal();
        }
        
        function updateQuantityDirect(index, newValue) {
            if (allProducts[index]) {
                allProducts[index].stock = parseInt(newValue) || 0;
                console.log(`商品 ${index} の在庫を ${newValue} に更新`);
                showSuccess(`在庫を${newValue}に更新しました`);
            }
        }
        
        // ===== モーダル制御 =====
        function openModal() {
            document.getElementById('data-modal').style.display = 'flex';
        }
        
        function closeModal() {
            document.getElementById('data-modal').style.display = 'none';
        }
        
        function refreshModalData() {
            showSuccess('データ更新機能は実装予定です');
        }
        
        // ===== UI フィードバック =====
        function showLoader(message = 'データ処理中...') {
            const loader = document.getElementById('advanced-loader');
            const messageEl = document.getElementById('loading-message');
            messageEl.textContent = message;
            loader.style.display = 'flex';
        }
        
        function hideLoader() {
            document.getElementById('advanced-loader').style.display = 'none';
        }
        
        function showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-display';
            errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
            
            document.getElementById('content-area').prepend(errorDiv);
            
            setTimeout(() => errorDiv.remove(), 10000);
        }
        
        function showSuccess(message) {
            const successDiv = document.createElement('div');
            successDiv.className = 'success-display';
            successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
            
            document.getElementById('content-area').prepend(successDiv);
            
            setTimeout(() => successDiv.remove(), 5000);
        }
        
        function exportData() {
            const dataStr = JSON.stringify(allProducts, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${window.CURRENT_SOURCE}_data_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            showSuccess('データをエクスポートしました');
        }
        
        // ===== 初期化 =====
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ 多モールデータビューアー - データ分離版 初期化完了');
            console.log('Current View:', window.CURRENT_VIEW);
            console.log('Current Source:', window.CURRENT_SOURCE);
            
            // 初期データ読み込み
            loadDataSeparated(window.CURRENT_SOURCE);
            
            // モーダル外クリックで閉じる
            document.getElementById('data-modal').addEventListener('click', function(e) {
                if (e.target === this) {
                    closeModal();
                }
            });
        });
    </script>
</body>
</html>