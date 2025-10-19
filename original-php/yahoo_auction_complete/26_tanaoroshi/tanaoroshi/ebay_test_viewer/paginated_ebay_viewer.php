<?php
/**
 * ページネーション対応eBayビューアー
 * 25,000件の大量データも快適表示 + 差分検知システム統合
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

$csrf_token = isset($_SESSION['csrf_token']) ? $_SESSION['csrf_token'] : bin2hex(random_bytes(32));
$_SESSION['csrf_token'] = $csrf_token;
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBayデータビューアー - ページネーション対応版</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc; color: #1e293b; line-height: 1.6;
        }
        
        .container {
            max-width: 1400px; margin: 0 auto; padding: 2rem;
        }
        
        .header {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem;
            text-align: center; box-shadow: 0 10px 25px rgba(30, 41, 59, 0.2);
        }
        
        .header h1 {
            font-size: 2rem; margin-bottom: 0.5rem; display: flex;
            align-items: center; justify-content: center; gap: 1rem;
        }
        
        .controls-bar {
            background: white; border-radius: 8px; padding: 1.5rem;
            margin-bottom: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            display: grid; grid-template-columns: 1fr auto auto; gap: 1rem;
            align-items: center;
        }
        
        .search-section {
            display: flex; gap: 0.75rem; align-items: center;
        }
        
        .search-input {
            flex: 1; padding: 0.75rem; border: 1px solid #d1d5db;
            border-radius: 6px; font-size: 0.875rem;
        }
        
        .filter-select {
            padding: 0.75rem; border: 1px solid #d1d5db;
            border-radius: 6px; font-size: 0.875rem; min-width: 120px;
        }
        
        .btn {
            padding: 0.75rem 1.5rem; border: none; border-radius: 6px;
            font-size: 0.875rem; font-weight: 500; cursor: pointer;
            display: inline-flex; align-items: center; gap: 0.5rem;
            transition: all 0.2s ease;
        }
        
        .btn-primary {
            background: #3b82f6; color: white;
        }
        
        .btn-primary:hover {
            background: #2563eb; transform: translateY(-1px);
        }
        
        .btn-secondary {
            background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;
        }
        
        .btn-secondary:hover {
            background: #e2e8f0;
        }
        
        .btn-success {
            background: #059669; color: white;
        }
        
        .btn-success:hover {
            background: #047857; transform: translateY(-1px);
        }
        
        .btn-warning {
            background: #d97706; color: white;
        }
        
        .btn-warning:hover {
            background: #b45309; transform: translateY(-1px);
        }
        
        .data-stats {
            background: white; border-radius: 8px; padding: 1rem;
            margin-bottom: 1rem; display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem; font-size: 0.875rem;
        }
        
        .stat-item {
            text-align: center; padding: 0.75rem;
            background: #f8fafc; border-radius: 6px;
        }
        
        .stat-value {
            font-size: 1.25rem; font-weight: 700; color: #059669;
        }
        
        .stat-label {
            color: #64748b; font-size: 0.75rem; margin-top: 0.25rem;
        }
        
        .data-table-container {
            background: white; border-radius: 8px; overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .data-table {
            width: 100%; border-collapse: collapse; font-size: 0.875rem;
        }
        
        .data-table th {
            background: #f8fafc; padding: 1rem; text-align: left;
            font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;
            position: sticky; top: 0; z-index: 10;
        }
        
        .data-table td {
            padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6;
        }
        
        .data-table tr:hover {
            background: #f9fafb;
        }
        
        .status-badge {
            padding: 0.25rem 0.75rem; border-radius: 12px;
            font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
        }
        
        .status-active {
            background: #dcfce7; color: #166534;
        }
        
        .status-ended {
            background: #fef3cd; color: #92400e;
        }
        
        .price-display {
            font-weight: 600; color: #059669;
        }
        
        .pagination-container {
            background: white; border-radius: 8px; padding: 1.5rem;
            margin-top: 1rem; display: flex; justify-content: space-between;
            align-items: center; flex-wrap: wrap; gap: 1rem;
        }
        
        .pagination {
            display: flex; gap: 0.5rem; align-items: center;
        }
        
        .page-btn {
            width: 36px; height: 36px; border: 1px solid #d1d5db;
            background: white; border-radius: 6px; display: flex;
            align-items: center; justify-content: center; cursor: pointer;
            transition: all 0.2s ease; font-size: 0.875rem;
        }
        
        .page-btn:hover {
            background: #f3f4f6; border-color: #9ca3af;
        }
        
        .page-btn.active {
            background: #3b82f6; color: white; border-color: #3b82f6;
        }
        
        .page-btn:disabled {
            opacity: 0.5; cursor: not-allowed;
        }
        
        .page-info {
            color: #64748b; font-size: 0.875rem;
        }
        
        .loading-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255, 255, 255, 0.9); display: flex;
            align-items: center; justify-content: center; z-index: 1000;
        }
        
        .loading-content {
            text-align: center; padding: 2rem;
            background: white; border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .spinner {
            width: 3rem; height: 3rem; border: 3px solid #e5e7eb;
            border-top: 3px solid #3b82f6; border-radius: 50%;
            animation: spin 1s linear infinite; margin: 0 auto 1rem;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .action-buttons {
            display: flex; gap: 0.5rem;
        }
        
        .action-btn {
            width: 32px; height: 32px; border: none; border-radius: 4px;
            cursor: pointer; display: flex; align-items: center;
            justify-content: center; transition: all 0.2s ease;
            font-size: 0.875rem;
        }
        
        .action-btn-detail {
            background: #dbeafe; color: #1d4ed8;
        }
        
        .action-btn-detail:hover {
            background: #bfdbfe; transform: scale(1.1);
        }
        
        .action-btn-ebay {
            background: #fef3cd; color: #d97706;
        }
        
        .action-btn-ebay:hover {
            background: #fed7aa; transform: scale(1.1);
        }
        
        .action-btn-stop {
            background: #fecaca; color: #dc2626;
        }
        
        .action-btn-stop:hover {
            background: #f87171; transform: scale(1.1);
        }
        
        .missing-data-indicator {
            display: inline-flex; align-items: center; gap: 0.25rem;
            padding: 0.125rem 0.5rem; border-radius: 4px;
            font-size: 0.75rem; font-weight: 500;
        }
        
        .missing-data-low {
            background: #dcfce7; color: #166534;
        }
        
        .missing-data-medium {
            background: #fef3cd; color: #92400e;
        }
        
        .missing-data-high {
            background: #fecaca; color: #991b1b;
        }
        
        .diff-sync-bar {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;
            display: flex; justify-content: space-between; align-items: center;
        }
        
        .diff-sync-info {
            display: flex; align-items: center; gap: 0.75rem;
        }
        
        .diff-sync-actions {
            display: flex; gap: 0.75rem;
        }
        
        @media (max-width: 768px) {
            .controls-bar {
                grid-template-columns: 1fr; gap: 1rem;
            }
            
            .data-stats {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .pagination-container {
                flex-direction: column; text-align: center;
            }
            
            .data-table-container {
                overflow-x: auto;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                <i class="fas fa-database"></i>
                eBayデータビューアー
                <span style="font-size: 0.6em; opacity: 0.8;">ページネーション対応版</span>
            </h1>
            <p>25,000件の大量データも快適表示 + 差分検知・自動修正機能</p>
        </div>
        
        <!-- 差分検知・同期バー -->
        <div id="diff-sync-bar" class="diff-sync-bar" style="display: none;">
            <div class="diff-sync-info">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <div style="font-weight: 600;">不足データを検知しました</div>
                    <div style="font-size: 0.875rem; opacity: 0.9;" id="missing-data-count">件の商品で詳細データが不足しています</div>
                </div>
            </div>
            <div class="diff-sync-actions">
                <button class="btn btn-secondary" onclick="analyzeMissingData()">
                    <i class="fas fa-search"></i> 詳細分析
                </button>
                <button class="btn btn-success" onclick="startDifferentialSync()">
                    <i class="fas fa-sync"></i> 差分同期開始
                </button>
            </div>
        </div>
        
        <!-- コントロールバー -->
        <div class="controls-bar">
            <div class="search-section">
                <input type="text" id="search-input" class="search-input" placeholder="商品名・SKU・商品IDで検索...">
                <select id="status-filter" class="filter-select">
                    <option value="">全ステータス</option>
                    <option value="Active">Active</option>
                    <option value="Ended">Ended</option>
                    <option value="Scheduled">Scheduled</option>
                </select>
                <button class="btn btn-primary" onclick="performSearch()">
                    <i class="fas fa-search"></i> 検索
                </button>
            </div>
            <div>
                <button class="btn btn-secondary" onclick="refreshData()">
                    <i class="fas fa-sync"></i> データ更新
                </button>
            </div>
            <div>
                <button class="btn btn-warning" onclick="runDataCompletenessCheck()">
                    <i class="fas fa-shield-alt"></i> 差分検知実行
                </button>
            </div>
        </div>
        
        <!-- 統計情報 -->
        <div class="data-stats" id="data-stats">
            <!-- 動的生成 -->
        </div>
        
        <!-- データテーブル -->
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">
                            <input type="checkbox" id="master-checkbox" onchange="toggleAllCheckboxes()">
                        </th>
                        <th style="width: 120px;">商品ID</th>
                        <th>タイトル</th>
                        <th style="width: 80px;">画像</th>
                        <th style="width: 100px;">価格</th>
                        <th style="width: 80px;">数量</th>
                        <th style="width: 80px;">状態</th>
                        <th style="width: 100px;">完全性</th>
                        <th style="width: 150px;">操作</th>
                    </tr>
                </thead>
                <tbody id="data-table-body">
                    <!-- 動的生成 -->
                </tbody>
            </table>
        </div>
        
        <!-- ページネーション -->
        <div class="pagination-container">
            <div class="page-info" id="page-info">
                <!-- 動的生成 -->
            </div>
            <div class="pagination" id="pagination">
                <!-- 動的生成 -->
            </div>
            <div>
                <select id="per-page-select" class="filter-select" onchange="changePerPage()">
                    <option value="25">25件表示</option>
                    <option value="50" selected>50件表示</option>
                    <option value="100">100件表示</option>
                </select>
            </div>
        </div>
    </div>
    
    <!-- ローディングオーバーレイ -->
    <div id="loading-overlay" class="loading-overlay" style="display: none;">
        <div class="loading-content">
            <div class="spinner"></div>
            <div id="loading-text">データを読み込んでいます...</div>
        </div>
    </div>
    
    <script>
        // グローバル変数
        window.CSRF_TOKEN = "<?= $csrf_token ?>";
        
        let currentPage = 1;
        let perPage = 50;
        let currentSearch = '';
        let currentStatusFilter = '';
        let totalItems = 0;
        let totalPages = 0;
        let currentData = [];
        let missingDataItems = [];
        
        // ページ読み込み時初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ ページネーション対応eBayビューアー初期化開始');
            loadData();
            
            // 検索入力のエンターキー対応
            document.getElementById('search-input').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
        });
        
        // データ読み込み
        async function loadData() {
            showLoading('データを読み込んでいます...');
            
            try {
                const params = new URLSearchParams({
                    page: currentPage,
                    per_page: perPage,
                    search: currentSearch,
                    status: currentStatusFilter,
                    sort: 'updated_at',
                    order: 'DESC'
                });
                
                const response = await fetch(`paginated_data_api.php?${params}`, {
                    headers: {
                        'X-CSRF-Token': window.CSRF_TOKEN
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    currentData = result.data;
                    totalItems = result.pagination.total_items;
                    totalPages = result.pagination.total_pages;
                    
                    // 統計情報更新
                    updateStats(result.statistics);
                    
                    // テーブル更新
                    updateTable(result.data);
                    
                    // ページネーション更新
                    updatePagination(result.pagination);
                    
                    // 差分検知実行
                    checkDataCompleteness(result.data);
                    
                    console.log(`✅ データ読み込み完了: ${result.data.length}件`);
                } else {
                    throw new Error(result.error || 'データ読み込みエラー');
                }
                
            } catch (error) {
                console.error('❌ データ読み込みエラー:', error);
                showError('データ読み込みに失敗しました: ' + error.message);
            } finally {
                hideLoading();
            }
        }
        
        // 統計情報更新
        function updateStats(stats) {
            const statsContainer = document.getElementById('data-stats');
            
            statsContainer.innerHTML = `
                <div class="stat-item">
                    <div class="stat-value">${stats.total_items}</div>
                    <div class="stat-label">総アイテム数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.active_items}</div>
                    <div class="stat-label">アクティブ</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.items_with_images}</div>
                    <div class="stat-label">画像あり</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">$${stats.average_price}</div>
                    <div class="stat-label">平均価格</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.image_coverage}%</div>
                    <div class="stat-label">画像カバー率</div>
                </div>
            `;
        }
        
        // テーブル更新
        function updateTable(data) {
            const tbody = document.getElementById('data-table-body');
            
            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align: center; padding: 2rem; color: #64748b;">
                            <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                            検索結果がありません
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = data.map((item, index) => {
                const completenessScore = calculateCompleteness(item);
                const missingDataClass = completenessScore >= 90 ? 'missing-data-low' : 
                                       completenessScore >= 70 ? 'missing-data-medium' : 'missing-data-high';
                
                // 画像URL処理
                let imageHtml = '<span style="color: #9ca3af; font-size: 0.75rem;">画像なし</span>';
                if (item.picture_urls && Array.isArray(item.picture_urls) && item.picture_urls.length > 0) {
                    const firstImage = item.picture_urls[0];
                    imageHtml = `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <img src="${firstImage}" 
                                 style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                                 title="${item.picture_urls.length}枚の画像">
                            <span style="display: none; color: #9ca3af; font-size: 0.75rem;">画像エラー</span>
                            <span style="font-size: 0.75rem; color: #64748b;">${item.picture_urls.length}枚</span>
                        </div>
                    `;
                } else if (item.gallery_url) {
                    imageHtml = `
                        <img src="${item.gallery_url}" 
                             style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                             title="ギャラリー画像">
                        <span style="display: none; color: #9ca3af; font-size: 0.75rem;">画像なし</span>
                    `;
                }
                
                return `
                    <tr>
                        <td>
                            <input type="checkbox" class="item-checkbox" value="${index}" onchange="updateMasterCheckbox()">
                        </td>
                        <td>
                            <div style="font-family: monospace; font-size: 0.8rem;">${item.ebay_item_id || '-'}</div>
                        </td>
                        <td>
                            <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                                 title="${item.title || 'タイトル未設定'}">
                                ${item.title || 'タイトル未設定'}
                            </div>
                            ${item.sku ? `<div style="font-size: 0.75rem; color: #64748b;">SKU: ${item.sku}</div>` : ''}
                        </td>
                        <td>${imageHtml}</td>
                        <td>
                            <div class="price-display">
                                ${item.current_price_value ? `${parseFloat(item.current_price_value).toFixed(2)}` : '-'}
                            </div>
                        </td>
                        <td>
                            <div>${item.quantity || 0}個</div>
                            ${item.quantity_sold ? `<div style="font-size: 0.75rem; color: #64748b;">売上: ${item.quantity_sold}</div>` : ''}
                        </td>
                        <td>
                            <span class="status-badge ${item.listing_status === 'Active' ? 'status-active' : 'status-ended'}">
                                ${item.listing_status || 'Unknown'}
                            </span>
                        </td>
                        <td>
                            <div class="missing-data-indicator ${missingDataClass}">
                                <i class="fas ${completenessScore >= 90 ? 'fa-check' : completenessScore >= 70 ? 'fa-exclamation' : 'fa-times'}"></i>
                                ${completenessScore}%
                            </div>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="action-btn action-btn-detail" onclick="showProductDetail(${index})" title="詳細表示">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="action-btn action-btn-ebay" onclick="openEbayPage('${item.ebay_item_id}')" title="eBayで見る">
                                    <i class="fab fa-ebay"></i>
                                </button>
                                <button class="action-btn action-btn-stop" onclick="stopListing(${index})" title="出品停止">
                                    <i class="fas fa-stop"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        // データ完全性計算
        function calculateCompleteness(item) {
            let score = 0;
            const checks = [
                item.ebay_item_id, // 10点
                item.title, // 15点
                item.description && item.description.length > 50, // 20点
                item.current_price_value > 0, // 10点
                item.sku, // 10点
                item.picture_urls && item.picture_urls.length > 0, // 15点
                item.item_specifics && Object.keys(item.item_specifics).length > 0, // 10点
                item.category_name, // 5点
                item.condition_display_name, // 5点
            ];
            
            const weights = [10, 15, 20, 10, 10, 15, 10, 5, 5];
            
            checks.forEach((check, index) => {
                if (check) score += weights[index];
            });
            
            return Math.min(100, score);
        }
        
        // 差分検知実行
        function checkDataCompleteness(data) {
            missingDataItems = data.filter(item => calculateCompleteness(item) < 90);
            
            if (missingDataItems.length > 0) {
                document.getElementById('diff-sync-bar').style.display = 'flex';
                document.getElementById('missing-data-count').textContent = 
                    `${missingDataItems.length}件の商品で詳細データが不足しています`;
            } else {
                document.getElementById('diff-sync-bar').style.display = 'none';
            }
        }
        
        // ページネーション更新
        function updatePagination(pagination) {
            const paginationContainer = document.getElementById('pagination');
            const pageInfo = document.getElementById('page-info');
            
            // ページ情報更新
            pageInfo.innerHTML = `
                ${pagination.start_item} - ${pagination.end_item} 件目 
                (全 ${pagination.total_items} 件中)
            `;
            
            // ページネーション生成
            let paginationHtml = '';
            
            // 前へボタン
            paginationHtml += `
                <button class="page-btn" ${!pagination.has_prev ? 'disabled' : ''} onclick="goToPage(${pagination.prev_page || 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
            
            // ページ番号
            const startPage = Math.max(1, pagination.current_page - 2);
            const endPage = Math.min(pagination.total_pages, pagination.current_page + 2);
            
            if (startPage > 1) {
                paginationHtml += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
                if (startPage > 2) {
                    paginationHtml += `<span style="padding: 0 0.5rem;">...</span>`;
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                paginationHtml += `
                    <button class="page-btn ${i === pagination.current_page ? 'active' : ''}" onclick="goToPage(${i})">
                        ${i}
                    </button>
                `;
            }
            
            if (endPage < pagination.total_pages) {
                if (endPage < pagination.total_pages - 1) {
                    paginationHtml += `<span style="padding: 0 0.5rem;">...</span>`;
                }
                paginationHtml += `<button class="page-btn" onclick="goToPage(${pagination.total_pages})">${pagination.total_pages}</button>`;
            }
            
            // 次へボタン
            paginationHtml += `
                <button class="page-btn" ${!pagination.has_next ? 'disabled' : ''} onclick="goToPage(${pagination.next_page || pagination.total_pages})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
            
            paginationContainer.innerHTML = paginationHtml;
        }
        
        // ページ移動
        function goToPage(page) {
            if (page < 1 || page > totalPages || page === currentPage) return;
            
            currentPage = page;
            loadData();
        }
        
        // 表示件数変更
        function changePerPage() {
            perPage = parseInt(document.getElementById('per-page-select').value);
            currentPage = 1;
            loadData();
        }
        
        // 検索実行
        function performSearch() {
            currentSearch = document.getElementById('search-input').value.trim();
            currentStatusFilter = document.getElementById('status-filter').value;
            currentPage = 1;
            loadData();
        }
        
        // データ更新
        function refreshData() {
            loadData();
        }
        
        // 差分検知実行（実際のAPI連携版）
        function runDataCompletenessCheck() {
            showLoading('データ完全性をチェックしています...');
            
            // 実際の差分検知API呼び出し
            fetch('differential_sync_api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRF-Token': window.CSRF_TOKEN
                },
                body: 'action=detect_missing_data'
            })
            .then(response => response.json())
            .then(result => {
                hideLoading();
                
                if (result.success) {
                    const analysis = result.analysis;
                    
                    // ローカルの差分検知結果も更新
                    missingDataItems = currentData.filter(item => calculateCompleteness(item) < 90);
                    checkDataCompleteness(currentData);
                    
                    if (analysis.incomplete_count > 0) {
                        const detailMessage = `データ完全性分析結果：\n\n` +
                            `📊 検証商品数: ${analysis.total_checked}件\n` +
                            `❌ 不完全商品: ${analysis.incomplete_count}件\n` +
                            `📝 商品説明不足: ${analysis.missing_description}件\n` +
                            `🏷️ SKU不足: ${analysis.missing_sku}件\n` +
                            `🖼️ 画像不足: ${analysis.missing_images}件\n` +
                            `⚙️ 商品仕様不足: ${analysis.missing_specifics}件\n\n` +
                            `平均完全性: ${analysis.average_completeness}%\n\n` +
                            `差分同期を実行して不足データを取得しますか？`;
                        
                        if (confirm(detailMessage)) {
                            startDifferentialSync();
                        }
                    } else {
                        alert(`✅ データ品質チェック完了！\n\n全 ${analysis.total_checked}件の商品データが完全です。\n平均完全性: ${analysis.average_completeness}%`);
                    }
                } else {
                    alert(`差分検知エラー：\n${result.error}`);
                }
            })
            .catch(error => {
                hideLoading();
                alert(`通信エラー：\n${error.message}`);
                console.error('差分検知APIエラー:', error);
            });
        }
        
        // 差分同期開始（実際のAPIとの連携版）
        function startDifferentialSync() {
            if (!confirm(`${missingDataItems.length}件の商品の不足データを取得しますか？\n\n商品説明・SKU・画像・仕様情報をeBay APIから補完します。`)) {
                return;
            }
            
            showLoading('差分同期を実行しています...');
            
            // 実際の差分同期API呼び出し
            fetch('differential_sync_api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRF-Token': window.CSRF_TOKEN
                },
                body: 'action=start_differential_sync'
            })
            .then(response => response.json())
            .then(result => {
                hideLoading();
                
                if (result.success && result.sync_started) {
                    // 同期開始成功 - 進行状況監視開始
                    monitorDifferentialSyncProgress(result.sync_id, result.items_to_sync);
                } else {
                    alert(`差分同期開始エラー：\n${result.error || '不明なエラーが発生しました'}`);
                }
            })
            .catch(error => {
                hideLoading();
                alert(`通信エラー：\n${error.message}`);
                console.error('差分同期APIエラー:', error);
            });
        }
        
        // 差分同期進行状況監視
        function monitorDifferentialSyncProgress(syncId, totalItems) {
            const progressModal = showProgressModal();
            let processedCount = 0;
            
            const progressInterval = setInterval(() => {
                fetch('differential_sync_api.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRF-Token': window.CSRF_TOKEN
                    },
                    body: `action=get_sync_progress&sync_id=${encodeURIComponent(syncId)}`
                })
                .then(response => response.json())
                .then(progressResult => {
                    if (progressResult.success) {
                        const progress = progressResult.progress;
                        processedCount = progress.processed_items;
                        
                        // 進行状況UI更新
                        updateProgressModal(progressModal, {
                            processed: progress.processed_items,
                            total: progress.total_items,
                            percentage: progress.completion_rate,
                            phase: progress.current_phase,
                            failed: progress.failed_items || 0
                        });
                        
                        if (progress.status === 'completed') {
                            clearInterval(progressInterval);
                            closeProgressModal(progressModal);
                            
                            // 完了通知
                            alert(`差分同期完了！\n\n処理結果：\n・補完商品数：${progress.processed_items}件\n・失敗：${progress.failed_items || 0}件\n・成功率：${Math.round((progress.processed_items - (progress.failed_items || 0)) / progress.processed_items * 100)}%`);
                            
                            // データ再読み込み
                            loadData();
                        } else if (progress.status === 'failed') {
                            clearInterval(progressInterval);
                            closeProgressModal(progressModal);
                            alert('差分同期が失敗しました。ログを確認してください。');
                        }
                    }
                })
                .catch(error => {
                    console.warn('進行状況取得エラー:', error);
                });
            }, 2000); // 2秒間隔でチェック
            
            // 5分でタイムアウト
            setTimeout(() => {
                if (progressInterval) {
                    clearInterval(progressInterval);
                    closeProgressModal(progressModal);
                    alert('進行状況の監視がタイムアウトしました。\nバックグラウンドで処理が継続されている可能性があります。');
                }
            }, 300000);
        }
        
        // 不足データ分析
        function analyzeMissingData() {
            const analysisResults = missingDataItems.map(item => {
                const completeness = calculateCompleteness(item);
                const missing = [];
                
                if (!item.description || item.description.length <= 50) missing.push('商品説明');
                if (!item.sku) missing.push('SKU');
                if (!item.picture_urls || item.picture_urls.length === 0) missing.push('商品画像');
                if (!item.item_specifics || Object.keys(item.item_specifics).length === 0) missing.push('商品仕様');
                
                return {
                    id: item.ebay_item_id,
                    title: item.title?.substring(0, 30) + '...',
                    completeness: completeness,
                    missing: missing.join(', ')
                };
            }).slice(0, 10); // 最初の10件のみ表示
            
            const analysisText = analysisResults.map(item => 
                `${item.id}: ${item.title}\n  完全性: ${item.completeness}% | 不足: ${item.missing}`
            ).join('\n\n');
            
            alert('不足データ分析結果（上位10件）:\n\n' + analysisText);
        }
        
        // 商品詳細表示
        function showProductDetail(index) {
            const item = currentData[index];
            if (!item) return;
            
            // 詳細モーダルを作成
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.8); display: flex;
                align-items: center; justify-content: center; z-index: 10000;
            `;
            
            // 画像ギャラリー
            let imageGallery = '';
            if (item.picture_urls && Array.isArray(item.picture_urls) && item.picture_urls.length > 0) {
                imageGallery = `
                    <div style="margin-bottom: 1rem;">
                        <h4>商品画像 (${item.picture_urls.length}枚)</h4>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; max-height: 200px; overflow-y: auto;">
                            ${item.picture_urls.map(url => `
                                <img src="${url}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; cursor: pointer;" 
                                     onclick="window.open('${url}', '_blank')" 
                                     onerror="this.style.display='none'">
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            // 商品仕様
            let specifications = '';
            if (item.item_specifics && typeof item.item_specifics === 'object') {
                specifications = `
                    <div style="margin-bottom: 1rem;">
                        <h4>商品仕様</h4>
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 6px; max-height: 150px; overflow-y: auto;">
                            ${Object.entries(item.item_specifics).map(([key, value]) => `
                                <div style="display: flex; margin-bottom: 0.5rem;">
                                    <span style="font-weight: 600; min-width: 100px;">${key}:</span>
                                    <span>${value}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            // 商品説明
            let description = '';
            if (item.description && item.description.length > 0) {
                const truncatedDesc = item.description.length > 300 ? 
                    item.description.substring(0, 300) + '...' : item.description;
                description = `
                    <div style="margin-bottom: 1rem;">
                        <h4>商品説明</h4>
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 6px; max-height: 150px; overflow-y: auto; font-size: 0.875rem;">
                            ${truncatedDesc}
                        </div>
                    </div>
                `;
            }
            
            modal.innerHTML = `
                <div style="
                    background: white; border-radius: 12px; padding: 2rem;
                    max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3 style="margin: 0; color: #1e293b;">商品詳細</h3>
                        <button onclick="this.closest('[style*="position: fixed"]').remove()" 
                                style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b;">&times;</button>
                    </div>
                    
                    ${imageGallery}
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                        <div><strong>商品ID:</strong> ${item.ebay_item_id}</div>
                        <div><strong>SKU:</strong> ${item.sku || '-'}</div>
                        <div><strong>価格:</strong> ${item.current_price_value || '-'}</div>
                        <div><strong>数量:</strong> ${item.quantity || 0}個</div>
                        <div><strong>売上数:</strong> ${item.quantity_sold || 0}個</div>
                        <div><strong>ステータス:</strong> ${item.listing_status || '-'}</div>
                        <div><strong>コンディション:</strong> ${item.condition_display_name || '-'}</div>
                        <div><strong>カテゴリ:</strong> ${item.category_name || '-'}</div>
                        <div><strong>完全性スコア:</strong> ${calculateCompleteness(item)}%</div>
                        <div><strong>更新日:</strong> ${item.updated_at ? new Date(item.updated_at).toLocaleString('ja-JP') : '-'}</div>
                    </div>
                    
                    ${specifications}
                    ${description}
                    
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button onclick="window.open('${item.view_item_url || `https://www.ebay.com/itm/${item.ebay_item_id}`}', '_blank')" 
                                style="padding: 0.75rem 1.5rem; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            eBayで見る
                        </button>
                        <button onclick="this.closest('[style*="position: fixed"]').remove()" 
                                style="padding: 0.75rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            閉じる
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
        
        // eBayページを開く
        function openEbayPage(itemId) {
            if (itemId) {
                window.open(`https://www.ebay.com/itm/${itemId}`, '_blank');
            }
        }
        
        // 出品停止
        function stopListing(index) {
            const item = currentData[index];
            if (!item) return;
            
            if (confirm(`商品「${item.title?.substring(0, 50)}...」の出品を停止しますか？`)) {
                alert('出品停止機能は開発中です。');
            }
        }
        
        // チェックボックス管理
        function toggleAllCheckboxes() {
            const masterCheckbox = document.getElementById('master-checkbox');
            const itemCheckboxes = document.querySelectorAll('.item-checkbox');
            
            itemCheckboxes.forEach(checkbox => {
                checkbox.checked = masterCheckbox.checked;
            });
        }
        
        function updateMasterCheckbox() {
            const masterCheckbox = document.getElementById('master-checkbox');
            const itemCheckboxes = document.querySelectorAll('.item-checkbox');
            const checkedItems = document.querySelectorAll('.item-checkbox:checked');
            
            if (checkedItems.length === 0) {
                masterCheckbox.checked = false;
                masterCheckbox.indeterminate = false;
            } else if (checkedItems.length === itemCheckboxes.length) {
                masterCheckbox.checked = true;
                masterCheckbox.indeterminate = false;
            } else {
                masterCheckbox.checked = false;
                masterCheckbox.indeterminate = true;
            }
        }
        
        // UI制御
        function showLoading(text = 'Loading...') {
            document.getElementById('loading-text').textContent = text;
            document.getElementById('loading-overlay').style.display = 'flex';
        }
        
        function hideLoading() {
            document.getElementById('loading-overlay').style.display = 'none';
        }
        
        function showError(message) {
            alert('エラー: ' + message);
        }
        
        // 進行状況モーダル表示
        function showProgressModal() {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.8); display: flex;
                align-items: center; justify-content: center; z-index: 10000;
            `;
            
            modal.innerHTML = `
                <div style="
                    background: white; border-radius: 12px; padding: 2rem;
                    max-width: 500px; width: 90%; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                ">
                    <h3 style="margin-bottom: 1rem; text-align: center; color: #1e293b;">
                        <i class="fas fa-sync fa-spin" style="margin-right: 0.5rem;"></i>
                        差分同期実行中
                    </h3>
                    <div style="margin-bottom: 1rem; background: #f8fafc; border-radius: 8px; overflow: hidden;">
                        <div id="progress-bar" style="
                            height: 8px; background: #3b82f6; width: 0%;
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                    <div id="progress-info" style="text-align: center; font-size: 0.875rem; color: #64748b; margin-bottom: 1rem;">
                        0 / 0 件処理中 (0%)
                    </div>
                    <div id="progress-phase" style="text-align: center; font-size: 0.75rem; color: #94a3b8;">
                        初期化中...
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            return modal;
        }
        
        // 進行状況モーダル更新
        function updateProgressModal(modal, progress) {
            const progressBar = modal.querySelector('#progress-bar');
            const progressInfo = modal.querySelector('#progress-info');
            const progressPhase = modal.querySelector('#progress-phase');
            
            progressBar.style.width = progress.percentage + '%';
            progressInfo.textContent = `${progress.processed} / ${progress.total} 件処理中 (${progress.percentage}%)`;
            
            const phaseNames = {
                'initializing': '初期化中...',
                'processing_descriptions': '商品説明を取得中...',
                'processing_images': '画像情報を取得中...',
                'finalizing': '最終処理中...',
                'completed': '完了'
            };
            
            progressPhase.textContent = phaseNames[progress.phase] || '処理中...';
            
            if (progress.failed > 0) {
                progressPhase.textContent += ` (失敗: ${progress.failed}件)`;
            }
        }
        
        // 進行状況モーダル閉じる
        function closeProgressModal(modal) {
            if (modal && modal.parentNode) {
                modal.style.opacity = '0';
                setTimeout(() => {
                    modal.remove();
                }, 300);
            }
        }
        
        console.log('✅ ページネーション対応eBayビューアー初期化完了');
    </script>
</body>
</html>