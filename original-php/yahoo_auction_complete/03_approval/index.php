<?php
/**
 * 承認システム フロントエンド（PHP版）
 * HTML+JS → PHP API 統合版
 */

require_once 'api/JWTAuth.php';
require_once 'api/UnifiedLogger.php';

// 簡易認証チェック（本番では適切な認証システムを使用）
session_start();
$isAuthenticated = isset($_SESSION['user_id']) || isset($_GET['dev_mode']);

if (!$isAuthenticated && !isset($_GET['dev_mode'])) {
    // 開発用の簡易ログイン
    if (isset($_POST['login'])) {
        $_SESSION['user_id'] = 'admin';
        $_SESSION['user_permissions'] = ['admin', 'approval_manage'];
        header('Location: ' . $_SERVER['PHP_SELF']);
        exit;
    }
    
    // ログインフォーム
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

$logger = getLogger('approval_frontend');
$logger->info('Approval frontend accessed', [
    'user_id' => $_SESSION['user_id'] ?? 'anonymous',
    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
]);
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo→eBay 商品承認システム（PHP API版）</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        /* ===== CSS変数定義 ===== */
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

        /* ===== ベーススタイル ===== */
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

        /* ===== ヘッダー ===== */
        .header {
            background: linear-gradient(135deg, var(--primary-color), var(--info-color));
            padding: var(--space-xl);
            border-radius: var(--radius-lg);
            margin-bottom: var(--space-xl);
            text-align: center;
            position: relative;
        }

        .header h1 {
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

        /* ===== 統計表示 ===== */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: var(--space-md);
            margin-bottom: var(--space-xl);
        }

        .stat-card {
            background: var(--bg-secondary);
            padding: var(--space-lg);
            border-radius: var(--radius-lg);
            text-align: center;
            border: 1px solid var(--border-color);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--primary-color), var(--info-color));
        }

        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: var(--space-xs);
        }

        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .btn {
            padding: var(--space-sm) var(--space-md);
            border: none;
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 600;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: var(--space-xs);
            min-height: 36px;
            text-decoration: none;
        }

        .btn-primary { background: var(--primary-color); color: white; }
        .btn-success { background: var(--success-color); color: white; }
        .btn-danger { background: var(--danger-color); color: white; }
        .btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); }

        .btn:hover:not(:disabled) {
            transform: translateY(-1px);
            filter: brightness(110%);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        /* ===== フィルター ===== */
        .filters {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-bottom: var(--space-lg);
        }

        .filter-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-md);
            align-items: end;
        }

        .filter-group {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
        }

        .filter-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        select, input[type="text"], input[type="number"] {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: var(--space-sm);
            border-radius: var(--radius-sm);
            font-size: 0.875rem;
            transition: border-color 0.2s ease;
        }

        select:focus, input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        /* ===== 商品グリッド ===== */
        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: var(--space-lg);
            margin-bottom: var(--space-xl);
        }

        .product-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            overflow: hidden;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .product-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border-color: var(--primary-color);
        }

        .product-card.selected {
            border-color: var(--success-color);
            box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }

        .product-image-container {
            position: relative;
            height: 250px;
            overflow: hidden;
            background: var(--bg-tertiary);
        }

        .product-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }

        .product-card:hover .product-image {
            transform: scale(1.05);
        }

        .product-checkbox {
            position: absolute;
            top: var(--space-md);
            left: var(--space-md);
            width: 24px;
            height: 24px;
            accent-color: var(--success-color);
            z-index: 10;
            border-radius: var(--radius-sm);
        }

        .ai-badge {
            position: absolute;
            top: var(--space-md);
            right: var(--space-md);
            background: linear-gradient(45deg, #8b5cf6, #06b6d4);
            color: white;
            padding: 4px 8px;
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .product-info {
            padding: var(--space-lg);
        }

        .product-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: var(--space-md);
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            min-height: 2.8rem;
        }

        .product-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--space-sm);
            margin-bottom: var(--space-md);
            font-size: 0.875rem;
        }

        .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-xs) 0;
        }

        .detail-label {
            color: var(--text-secondary);
            font-size: 0.75rem;
        }

        .detail-value {
            font-weight: 600;
            color: var(--text-primary);
        }

        .price-value {
            color: var(--success-color);
            font-size: 1.1rem;
            font-weight: 700;
        }

        .status-badges {
            display: flex;
            gap: var(--space-xs);
            flex-wrap: wrap;
            margin-top: var(--space-md);
        }

        .badge {
            padding: var(--space-xs) var(--space-sm);
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .badge-pending { background: rgba(245, 158, 11, 0.2); color: var(--warning-color); }
        .badge-approved { background: rgba(16, 185, 129, 0.2); color: var(--success-color); }
        .badge-rejected { background: rgba(239, 68, 68, 0.2); color: var(--danger-color); }
        .badge-ai { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }

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

        .error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid var(--danger-color);
            color: var(--danger-color);
            padding: var(--space-lg);
            border-radius: var(--radius-lg);
            text-align: center;
            margin: var(--space-lg) 0;
        }

        .empty-state {
            text-align: center;
            padding: var(--space-xl);
            color: var(--text-secondary);
        }

        .empty-state i {
            font-size: 3rem;
            margin-bottom: var(--space-md);
        }

        /* ===== コントロールバー ===== */
        .control-bar {
            position: sticky;
            top: 0;
            z-index: 100;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: var(--space-md);
            margin-bottom: var(--space-lg);
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .control-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: var(--space-md);
        }

        .selection-info {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        .action-buttons {
            display: flex;
            gap: var(--space-sm);
            flex-wrap: wrap;
        }

        /* ===== レスポンシブデザイン ===== */
        @media (max-width: 768px) {
            .container {
                padding: var(--space-md);
            }
            
            .products-grid {
                grid-template-columns: 1fr;
            }
            
            .control-content {
                flex-direction: column;
                align-items: stretch;
            }
            
            .action-buttons {
                justify-content: center;
            }

            .filter-row {
                grid-template-columns: 1fr;
            }
        }

        /* ===== アニメーション効果 ===== */
        .fade-in {
            animation: fadeIn 0.5s ease-in-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* ===== トースト通知 ===== */
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

        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <div class="version-badge">PHP API v2.0</div>
            <h1><i class="fas fa-check-circle"></i> Yahoo→eBay 商品承認システム</h1>
            <p>統合ワークフローエンジン対応版 - 高品質な商品データで効率的な承認管理</p>
        </div>

        <!-- 統計表示 -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="stat-pending">-</div>
                <div class="stat-label">承認待ち</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-approved">-</div>
                <div class="stat-label">承認済み</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-rejected">-</div>
                <div class="stat-label">否認済み</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-ai-recommended">-</div>
                <div class="stat-label">AI推奨</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="stat-overdue">-</div>
                <div class="stat-label">期限超過</div>
            </div>
        </div>

        <!-- コントロールバー -->
        <div class="control-bar">
            <div class="control-content">
                <div class="selection-info">
                    <span id="selection-count">0件選択中</span>
                    <span>|</span>
                    <span id="total-count">全0件</span>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-secondary" onclick="selectAll()">
                        <i class="fas fa-check-square"></i> 全選択
                    </button>
                    <button class="btn btn-secondary" onclick="clearSelection()">
                        <i class="fas fa-times"></i> 選択解除
                    </button>
                    <button class="btn btn-success" onclick="approveSelected()" id="approve-btn" disabled>
                        <i class="fas fa-check"></i> 一括承認
                    </button>
                    <button class="btn btn-danger" onclick="rejectSelected()" id="reject-btn" disabled>
                        <i class="fas fa-times"></i> 一括否認
                    </button>
                    <button class="btn btn-primary" onclick="exportCSV()">
                        <i class="fas fa-download"></i> CSV出力
                    </button>
                    <button class="btn btn-secondary" onclick="refreshData()">
                        <i class="fas fa-refresh"></i> 再読み込み
                    </button>
                </div>
            </div>
        </div>

        <!-- フィルター -->
        <div class="filters">
            <div class="filter-row">
                <div class="filter-group">
                    <label class="filter-label">状態</label>
                    <select id="status-filter" onchange="applyFilters()">
                        <option value="">すべて</option>
                        <option value="pending" selected>承認待ち</option>
                        <option value="approved">承認済み</option>
                        <option value="rejected">否認済み</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label class="filter-label">AI判定</label>
                    <select id="ai-filter" onchange="applyFilters()">
                        <option value="">すべて</option>
                        <option value="ai-approved">AI推奨</option>
                        <option value="ai-pending">AI保留</option>
                        <option value="ai-rejected">AI非推奨</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label class="filter-label">最低価格</label>
                    <input type="number" id="min-price-filter" placeholder="0" onchange="applyFilters()">
                </div>
                <div class="filter-group">
                    <label class="filter-label">最高価格</label>
                    <input type="number" id="max-price-filter" placeholder="999999" onchange="applyFilters()">
                </div>
                <div class="filter-group">
                    <label class="filter-label">検索</label>
                    <input type="text" id="search-filter" placeholder="商品名で検索..." oninput="applyFilters()">
                </div>
                <div class="filter-group">
                    <label class="filter-label">期限超過のみ</label>
                    <select id="overdue-filter" onchange="applyFilters()">
                        <option value="">すべて</option>
                        <option value="1">期限超過のみ</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- 商品グリッド -->
        <div id="products-container">
            <div class="loading">
                <i class="fas fa-spinner"></i>
                <p>PHP APIから商品データを読み込み中...</p>
            </div>
        </div>
    </div>

    <script>
        // グローバル変数
        let allProducts = [];
        let selectedProducts = new Set();
        let currentPage = 1;
        let totalPages = 1;

        // APIベースURL
        const API_BASE = 'approval.php';

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            loadProducts();
            setupKeyboardShortcuts();
            
            // 統計データを5秒ごとに更新
            setInterval(updateStats, 5000);
            
            // 最初の統計取得
            updateStats();
        });

        // 商品データ読み込み（PHP API版）
        async function loadProducts() {
            try {
                const filters = getCurrentFilters();
                const queryParams = new URLSearchParams({
                    action: 'get_approval_queue',
                    page: currentPage,
                    limit: 20,
                    ...filters
                });

                const response = await fetch(`${API_BASE}?${queryParams}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.success) {
                    allProducts = data.data || [];
                    totalPages = data.pagination?.pages || 1;
                    renderProducts();
                    updatePagination();
                    console.log('商品データ読み込み完了:', allProducts.length, '件');
                } else {
                    showError(data.message || '商品データの読み込みに失敗しました');
                }
            } catch (error) {
                console.error('商品読み込みエラー:', error);
                showError('サーバーとの通信に失敗しました: ' + error.message);
            }
        }

        // 統計データ更新
        async function updateStats() {
            try {
                const response = await fetch(`${API_BASE}?action=get_statistics`);
                const data = await response.json();
                
                if (data.success) {
                    const stats = data.data;
                    document.getElementById('stat-pending').textContent = stats.pending || 0;
                    document.getElementById('stat-approved').textContent = stats.approved || 0;
                    document.getElementById('stat-rejected').textContent = stats.rejected || 0;
                    document.getElementById('stat-ai-recommended').textContent = stats.ai_recommended || 0;
                    document.getElementById('stat-overdue').textContent = stats.overdue_count || 0;
                }
            } catch (error) {
                console.error('統計取得エラー:', error);
            }
        }

        // 商品表示
        function renderProducts() {
            const container = document.getElementById('products-container');
            
            if (allProducts.length === 0) {
                container.innerHTML = `
                    <div class="empty-state fade-in">
                        <i class="fas fa-inbox"></i>
                        <h3>商品が見つかりません</h3>
                        <p>フィルター条件を変更するか、新しいデータを取得してください</p>
                        <button class="btn btn-primary" onclick="refreshData()">
                            <i class="fas fa-refresh"></i> 再読み込み
                        </button>
                    </div>
                `;
                return;
            }

            const productsHTML = allProducts.map(product => {
                // 画像処理
                let imageUrl = 'https://via.placeholder.com/350x250?text=画像なし';
                if (product.all_images && Array.isArray(product.all_images) && product.all_images.length > 0) {
                    imageUrl = product.all_images[0];
                } else if (product.image_url) {
                    imageUrl = product.image_url;
                }

                // AI推奨判定
                const isAiRecommended = (product.ai_confidence_score || 0) >= 80;
                
                // 期限状況
                const deadlineStatus = product.deadline_status || 'normal';
                const deadlineBadge = getDeadlineBadge(deadlineStatus, product.seconds_to_deadline);

                return `
                    <div class="product-card fade-in ${selectedProducts.has(product.id) ? 'selected' : ''}" 
                         data-product-id="${product.id}" onclick="toggleProductSelection(${product.id})">
                        <input type="checkbox" class="product-checkbox" 
                               ${selectedProducts.has(product.id) ? 'checked' : ''} 
                               onclick="event.stopPropagation(); toggleProductSelection(${product.id})">
                        
                        ${isAiRecommended ? '<div class="ai-badge">AI推奨</div>' : ''}
                        ${deadlineBadge}
                        
                        <div class="product-image-container">
                            <img src="${imageUrl}" 
                                 alt="${product.title || '商品画像'}" 
                                 class="product-image" 
                                 loading="lazy"
                                 onerror="this.src='https://via.placeholder.com/350x250?text=画像なし'">
                        </div>
                        
                        <div class="product-info">
                            <h3 class="product-title">${product.title || 'タイトル不明'}</h3>
                            
                            <div class="product-details">
                                <div class="detail-item">
                                    <span class="detail-label">価格:</span>
                                    <span class="detail-value price-value">¥${Number(product.current_price || product.price_jpy || 0).toLocaleString()}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">入札:</span>
                                    <span class="detail-value">${product.bids || 0}件</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">残り:</span>
                                    <span class="detail-value">${product.time_left || '不明'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">AI信頼度:</span>
                                    <span class="detail-value">${product.ai_confidence_score || 0}%</span>
                                </div>
                            </div>
                            
                            <div class="status-badges">
                                <span class="badge badge-${product.status || 'pending'}">${getStatusLabel(product.status)}</span>
                                ${isAiRecommended ? '<span class="badge badge-ai">AI推奨</span>' : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `<div class="products-grid">${productsHTML}</div>`;
            updateSelectionUI();
        }

        // 商品選択切り替え
        function toggleProductSelection(productId) {
            if (selectedProducts.has(productId)) {
                selectedProducts.delete(productId);
            } else {
                selectedProducts.add(productId);
            }
            updateSelectionUI();
            
            // 選択状態をUIに反映
            const card = document.querySelector(`[data-product-id="${productId}"]`);
            const checkbox = card.querySelector('.product-checkbox');
            if (selectedProducts.has(productId)) {
                card.classList.add('selected');
                checkbox.checked = true;
            } else {
                card.classList.remove('selected');
                checkbox.checked = false;
            }
        }

        // 全選択
        function selectAll() {
            selectedProducts.clear();
            allProducts.forEach(product => selectedProducts.add(product.id));
            renderProducts();
        }

        // 選択解除
        function clearSelection() {
            selectedProducts.clear();
            renderProducts();
        }

        // 一括承認
        async function approveSelected() {
            if (selectedProducts.size === 0) return;
            
            const notes = prompt('承認コメント（省略可）:') || '';
            
            if (!confirm(`選択した${selectedProducts.size}件の商品を承認しますか？`)) return;
            
            try {
                const response = await fetch(API_BASE, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'approve_products',
                        product_ids: Array.from(selectedProducts),
                        reviewer_notes: notes
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    showToast(`${data.approved_count}件の商品を承認しました`, 'success');
                    selectedProducts.clear();
                    await refreshData();
                } else {
                    showToast(data.message || '承認処理に失敗しました', 'error');
                }
            } catch (error) {
                showToast('承認処理中にエラーが発生しました', 'error');
            }
        }

        // 一括否認
        async function rejectSelected() {
            if (selectedProducts.size === 0) return;
            
            const reason = prompt('否認理由を入力してください:');
            if (reason === null || reason.trim() === '') return;
            
            if (!confirm(`選択した${selectedProducts.size}件の商品を否認しますか？`)) return;
            
            try {
                const response = await fetch(API_BASE, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'reject_products',
                        product_ids: Array.from(selectedProducts),
                        reason: reason
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    showToast(`${data.rejected_count}件の商品を否認しました`, 'success');
                    selectedProducts.clear();
                    await refreshData();
                } else {
                    showToast(data.message || '否認処理に失敗しました', 'error');
                }
            } catch (error) {
                showToast('否認処理中にエラーが発生しました', 'error');
            }
        }

        // フィルター適用
        function applyFilters() {
            currentPage = 1; // フィルター変更時は最初のページに戻る
            loadProducts();
        }

        // 現在のフィルター取得
        function getCurrentFilters() {
            return {
                status: document.getElementById('status-filter').value,
                ai_filter: document.getElementById('ai-filter').value,
                min_price: document.getElementById('min-price-filter').value,
                max_price: document.getElementById('max-price-filter').value,
                search: document.getElementById('search-filter').value,
                overdue_only: document.getElementById('overdue-filter').value
            };
        }

        // CSV出力
        async function exportCSV() {
            try {
                const filters = getCurrentFilters();
                const queryParams = new URLSearchParams({
                    action: 'export_csv',
                    ...filters
                });

                // CSV出力用のリンクを作成
                const link = document.createElement('a');
                link.href = `${API_BASE}?${queryParams}`;
                link.download = `approval_queue_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
                
                showToast('CSVファイルのダウンロードを開始しました', 'success');
            } catch (error) {
                showToast('CSV出力に失敗しました', 'error');
            }
        }

        // データ再読み込み
        function refreshData() {
            selectedProducts.clear();
            loadProducts();
            updateStats();
        }

        // ヘルパー関数
        function getStatusLabel(status) {
            const labels = {
                'pending': '承認待ち',
                'approved': '承認済み',
                'rejected': '否認済み'
            };
            return labels[status] || status;
        }

        function getDeadlineBadge(status, secondsToDeadline) {
            if (status === 'overdue') {
                return '<div class="deadline-badge deadline-overdue">期限超過</div>';
            } else if (status === 'urgent') {
                return '<div class="deadline-badge deadline-urgent">緊急</div>';
            } else if (status === 'soon') {
                return '<div class="deadline-badge deadline-soon">期限間近</div>';
            }
            return '';
        }

        // UI更新
        function updateSelectionUI() {
            document.getElementById('selection-count').textContent = `${selectedProducts.size}件選択中`;
            document.getElementById('total-count').textContent = `全${allProducts.length}件`;
            
            const hasSelection = selectedProducts.size > 0;
            document.getElementById('approve-btn').disabled = !hasSelection;
            document.getElementById('reject-btn').disabled = !hasSelection;
        }

        function updatePagination() {
            // ページネーション機能は必要に応じて実装
        }

        // キーボードショートカット
        function setupKeyboardShortcuts() {
            document.addEventListener('keydown', function(event) {
                if (event.ctrlKey && event.key === 'a') {
                    event.preventDefault();
                    selectAll();
                } else if (event.key === 'Enter' && selectedProducts.size > 0) {
                    event.preventDefault();
                    approveSelected();
                } else if (event.key === 'r' && selectedProducts.size > 0) {
                    event.preventDefault();
                    rejectSelected();
                } else if (event.key === 'Escape') {
                    clearSelection();
                } else if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
                    event.preventDefault();
                    refreshData();
                }
            });
        }

        // トースト通知表示
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

        // エラー表示
        function showError(message) {
            const container = document.getElementById('products-container');
            container.innerHTML = `
                <div class="error fade-in">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>エラーが発生しました</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="refreshData()">
                        <i class="fas fa-refresh"></i> 再読み込み
                    </button>
                </div>
            `;
        }
    </script>
</body>
</html>
