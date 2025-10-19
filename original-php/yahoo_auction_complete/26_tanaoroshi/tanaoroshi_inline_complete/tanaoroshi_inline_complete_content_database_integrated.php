<?php
/**
 * 棚卸しシステム - データベース初期化・インポート機能統合版
 * 修正日: 2025-08-16
 * 新機能: データベースクリア、eBayデータインポート、SKUベース在庫タイプ自動判定
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
?>

<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo safe_output('棚卸しシステム - データベース管理機能統合版'); ?></title>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
    /* === CSS変数定義 === */
    :root {
        --bg-primary: #f8fafc;
        --bg-secondary: #ffffff;
        --bg-tertiary: #f1f5f9;
        --text-primary: #1e293b;
        --text-secondary: #475569;
        --text-muted: #64748b;
        --border-color: #e2e8f0;
        --border-light: #f1f5f9;
        --radius-lg: 0.75rem;
        --radius-md: 0.5rem;
        --radius-sm: 0.25rem;
        --space-xs: 0.5rem;
        --space-sm: 0.75rem;
        --space-md: 1rem;
        --space-lg: 1.5rem;
        --color-success: #059669;
        --color-warning: #dc6803;
        --color-danger: #dc2626;
        --color-info: #0e7490;
        --color-primary: #3b82f6;
        --color-purple: #7c3aed;
        --color-ebay: #0064d2;
    }

    /* === ベースレイアウト === */
    body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        background: var(--bg-primary);
        color: var(--text-primary);
        line-height: 1.6;
    }

    /* === ヘッダー === */
    .inventory__header {
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border-color);
        padding: var(--space-lg);
    }

    .inventory__header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-md);
    }

    .inventory__title {
        font-size: 1.875rem;
        font-weight: 700;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        margin: 0;
    }

    .inventory__title-icon {
        color: var(--color-info);
    }

    .inventory__exchange-rate {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--bg-tertiary);
        padding: 0.5rem 1rem;
        border-radius: var(--radius-md);
    }

    .inventory__stats {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: var(--space-md);
    }

    .inventory__stat {
        text-align: center;
        background: var(--bg-tertiary);
        padding: var(--space-md);
        border-radius: var(--radius-md);
    }

    .inventory__stat-number {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
    }

    .inventory__stat-label {
        font-size: 0.875rem;
        color: var(--text-muted);
    }

    /* === データベース管理セクション === */
    .database-management {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: var(--space-lg);
        margin-bottom: var(--space-lg);
    }

    .database-management__title {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: var(--space-md);
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }

    .database-management__buttons {
        display: flex;
        gap: var(--space-md);
        flex-wrap: wrap;
    }

    /* === ボタンスタイル === */
    .btn {
        display: inline-flex;
        align-items: center;
        gap: var(--space-xs);
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
    }

    .btn--primary { background: var(--color-primary); color: white; }
    .btn--secondary { 
        background: var(--bg-tertiary); 
        color: var(--text-secondary); 
        border: 1px solid var(--border-color);
    }
    .btn--success { background: var(--color-success); color: white; }
    .btn--warning { background: var(--color-warning); color: white; }
    .btn--danger { background: var(--color-danger); color: white; }
    .btn--info { background: var(--color-info); color: white; }
    .btn--import { background: var(--color-purple); color: white; }

    .btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }

    .btn--loading {
        opacity: 0.7;
        cursor: not-allowed;
        pointer-events: none;
    }

    .btn--loading .fas {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    /* === カードビュー === */
    .inventory__main-content {
        position: relative;
        min-height: auto;
        width: 100%;
    }

    .inventory__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: var(--space-md);
        padding: var(--space-lg);
        background: var(--bg-primary);
    }

    .inventory__card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        position: relative;
        display: flex;
        flex-direction: column;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        height: 280px;
    }

    .inventory__card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
    }

    .inventory__card-image {
        position: relative;
        height: 150px;
        background: var(--bg-tertiary);
        overflow: hidden;
        flex-shrink: 0;
    }

    .inventory__card-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .inventory__card-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        background: var(--bg-tertiary);
        color: var(--text-muted);
        flex-direction: column;
        gap: 0.5rem;
        font-size: 0.875rem;
    }

    .inventory__badge {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        padding: 0.25rem 0.5rem;
        border-radius: var(--radius-sm);
        font-size: 0.7rem;
        font-weight: 600;
        color: white;
    }

    .inventory__badge--stock { background: var(--color-success); }
    .inventory__badge--dropship { background: var(--color-info); }
    .inventory__badge--set { background: var(--color-purple); }
    .inventory__badge--hybrid { background: var(--color-warning); }

    .inventory__card-info {
        padding: var(--space-sm);
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .inventory__card-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.25;
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        height: 2.5rem;
    }

    .inventory__card-price {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .inventory__card-price-main {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-primary);
    }

    .inventory__card-price-sub {
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .inventory__card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: auto;
        padding-top: 0.5rem;
        border-top: 1px solid var(--border-light);
        font-size: 0.75rem;
    }

    .inventory__card-sku {
        font-family: monospace;
        background: var(--bg-tertiary);
        padding: 0.125rem 0.25rem;
        border-radius: var(--radius-sm);
        color: var(--text-muted);
    }

    .inventory__card-stock {
        font-weight: 600;
        color: var(--text-secondary);
    }

    /* === 統計エンプティ状態 === */
    .inventory__empty-state {
        text-align: center;
        padding: 3rem 2rem;
        color: var(--text-muted);
        grid-column: 1 / -1;
    }

    .inventory__empty-state-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }

    .inventory__empty-state-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: var(--text-secondary);
    }

    .inventory__empty-state-description {
        margin-bottom: 1.5rem;
    }

    /* === 通知トースト === */
    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-md);
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .toast--show {
        transform: translateX(0);
    }

    .toast--success {
        background: var(--color-success);
    }

    .toast--error {
        background: var(--color-danger);
    }

    .toast--info {
        background: var(--color-info);
    }

    .toast--warning {
        background: var(--color-warning);
    }

    /* === レスポンシブ === */
    @media (max-width: 768px) {
        .inventory__stats { 
            grid-template-columns: repeat(3, 1fr); 
        }
        
        .inventory__grid { 
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: var(--space-sm); 
        }
        
        .database-management__buttons {
            flex-direction: column;
        }
        
        .btn {
            width: 100%;
            justify-content: center;
        }
    }

    @media (max-width: 480px) {
        .inventory__stats { 
            grid-template-columns: repeat(2, 1fr); 
        }
        
        .inventory__grid { 
            grid-template-columns: 1fr;
            padding: var(--space-md);
        }
    }
    </style>
</head>
<body>
    <!-- ヘッダー -->
    <header class="inventory__header">
        <div class="inventory__header-top">
            <h1 class="inventory__title">
                <i class="fas fa-warehouse inventory__title-icon"></i>
                <?php echo safe_output('棚卸しシステム - データベース管理統合版'); ?>
            </h1>
            
            <div class="inventory__exchange-rate">
                <i class="fas fa-exchange-alt inventory__exchange-icon"></i>
                <span class="inventory__exchange-text">USD/JPY:</span>
                <span class="inventory__exchange-value" id="exchange-rate">¥150.25</span>
            </div>
        </div>
        
        <div class="inventory__stats">
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('総商品数'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="stock-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('有在庫'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="dropship-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('無在庫'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="set-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('セット品'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="hybrid-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('ハイブリッド'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-value">$0</span>
                <span class="inventory__stat-label"><?php echo safe_output('総在庫価値'); ?></span>
            </div>
        </div>
    </header>

    <!-- データベース管理セクション -->
    <div class="database-management">
        <h2 class="database-management__title">
            <i class="fas fa-database"></i>
            データベース管理・eBayデータ連携
        </h2>
        
        <div class="database-management__buttons">
            <button class="btn btn--danger" id="clearDbBtn" onclick="clearDatabase()">
                <i class="fas fa-trash-alt"></i>
                データベースをクリア
            </button>
            
            <button class="btn btn--import" id="importDataBtn" onclick="importEbayData()">
                <i class="fas fa-download"></i>
                eBayデータをインポート
            </button>
            
            <button class="btn btn--info" onclick="checkDatabaseStatus()">
                <i class="fas fa-info-circle"></i>
                データベース状態確認
            </button>
            
            <button class="btn btn--success" onclick="loadCurrentInventory()">
                <i class="fas fa-refresh"></i>
                データ再読み込み
            </button>
            
            <button class="btn btn--primary" onclick="openAddProductModal()">
                <i class="fas fa-plus"></i>
                新規商品登録
            </button>
        </div>
    </div>

    <!-- メインコンテンツ -->
    <div class="inventory__main-content">
        <div class="inventory__grid" id="inventory-grid">
            <!-- 初期ローディング状態 -->
            <div class="inventory__empty-state">
                <i class="fas fa-spinner fa-spin inventory__empty-state-icon"></i>
                <div class="inventory__empty-state-title">データを読み込み中...</div>
                <div class="inventory__empty-state-description">
                    PostgreSQLデータベースから商品情報を取得しています
                </div>
            </div>
        </div>
    </div>

    <!-- 新規商品登録モーダル -->
    <?php echo file_get_contents(__DIR__ . '/../../' . '統一デザイン新規商品登録モーダル.html'); ?>

    <!-- JavaScript -->
    <script>
    // === グローバル変数 ===
    let allInventoryData = [];
    let filteredData = [];
    let exchangeRate = 150.25;
    let isLoading = false;

    // === 初期化 ===
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 棚卸しシステム初期化開始（データベース管理統合版）');
        initializeSystem();
    });

    function initializeSystem() {
        console.log('📊 システム初期化');
        
        // 初期データ読み込み
        loadCurrentInventory();
        
        // 統計初期化
        updateStatistics();
        
        console.log('✅ システム初期化完了');
    }

    // === データベース初期化機能 ===
    async function clearDatabase() {
        console.log('🗑️ データベースクリア処理開始');
        
        const confirmResult = confirm(
            '⚠️ 警告: データベースの全データを削除します。\n\n' +
            'この操作は取り消せません。\n' +
            '本当に実行しますか？'
        );
        
        if (!confirmResult) {
            console.log('❌ データベースクリア処理がキャンセルされました');
            return;
        }
        
        const doubleConfirm = confirm(
            '🚨 最終確認:\n\n' +
            '・全商品データが削除されます\n' +
            '・セット品データも削除されます\n' +
            '・この操作は元に戻せません\n\n' +
            '本当に削除を実行しますか？'
        );
        
        if (!doubleConfirm) {
            console.log('❌ データベースクリア処理が最終確認でキャンセルされました');
            return;
        }
        
        try {
            const clearBtn = document.getElementById('clearDbBtn');
            
            clearBtn.classList.add('btn--loading');
            clearBtn.disabled = true;
            clearBtn.innerHTML = '<i class="fas fa-spinner"></i> 削除中...';
            
            const response = await fetch('api/clear_database.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('📊 データベースクリア結果:', result);
            
            if (result.success) {
                showToast(`✅ データベースクリア完了: ${result.total_deleted}件削除`, 'success');
                
                allInventoryData = [];
                filteredData = [];
                
                renderInventoryCards();
                updateStatistics();
                
                console.log('✅ データベースクリア処理完了');
            } else {
                throw new Error(result.error || 'データベースクリアに失敗しました');
            }
            
        } catch (error) {
            console.error('❌ データベースクリアエラー:', error);
            showToast(`❌ エラー: ${error.message}`, 'error');
        } finally {
            const clearBtn = document.getElementById('clearDbBtn');
            clearBtn.classList.remove('btn--loading');
            clearBtn.disabled = false;
            clearBtn.innerHTML = '<i class="fas fa-trash-alt"></i> データベースをクリア';
        }
    }

    // === eBayデータインポート機能 ===
    async function importEbayData() {
        console.log('📥 eBayデータインポート処理開始');
        
        try {
            const importBtn = document.getElementById('importDataBtn');
            
            importBtn.classList.add('btn--loading');
            importBtn.disabled = true;
            importBtn.innerHTML = '<i class="fas fa-spinner"></i> インポート中...';
            
            showToast('eBayデータをインポート中...', 'info');
            
            const response = await fetch('api/import_data.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('📊 eBayインポート結果:', result);
            
            if (result.success) {
                const importCount = result.import_results.imported_count;
                const stockCount = result.type_breakdown.stock_products;
                const dropshipCount = result.type_breakdown.dropship_products;
                
                showToast(
                    `✅ インポート完了: ${importCount}件 (有在庫:${stockCount}件, 無在庫:${dropshipCount}件)`, 
                    'success'
                );
                
                await loadCurrentInventory();
                
                console.log('✅ eBayデータインポート処理完了');
            } else {
                throw new Error(result.error || 'データインポートに失敗しました');
            }
            
        } catch (error) {
            console.error('❌ eBayデータインポートエラー:', error);
            showToast(`❌ インポートエラー: ${error.message}`, 'error');
        } finally {
            const importBtn = document.getElementById('importDataBtn');
            importBtn.classList.remove('btn--loading');
            importBtn.disabled = false;
            importBtn.innerHTML = '<i class="fas fa-download"></i> eBayデータをインポート';
        }
    }

    // === データベース状態確認機能 ===
    async function checkDatabaseStatus() {
        console.log('🔍 データベース状態確認開始');
        
        try {
            showToast('データベース状態を確認中...', 'info');
            
            const response = await fetch('tanaoroshi_ajax_handler.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    action: 'database_status',
                    dev_mode: '1'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('📊 データベース状態:', result);
            
            let statusMessage = '📊 データベース状態確認結果:\n\n';
            
            if (result.success) {
                statusMessage += `✅ 接続状況: 正常\n`;
                statusMessage += `📦 総商品数: ${allInventoryData.length}件\n`;
                statusMessage += `🏬 有在庫商品: ${allInventoryData.filter(i => i.type === 'stock').length}件\n`;
                statusMessage += `🚚 無在庫商品: ${allInventoryData.filter(i => i.type === 'dropship').length}件\n`;
                statusMessage += `⏰ 確認日時: ${new Date().toLocaleString('ja-JP')}`;
            } else {
                statusMessage += `❌ エラー: ${result.error}\n`;
                statusMessage += `⏰ 確認日時: ${new Date().toLocaleString('ja-JP')}`;
            }
            
            alert(statusMessage);
            showToast('データベース状態確認完了', 'success');
            
        } catch (error) {
            console.error('❌ データベース状態確認エラー:', error);
            showToast(`❌ 状態確認エラー: ${error.message}`, 'error');
        }
    }

    // === 現在のデータ再読み込み機能 ===
    async function loadCurrentInventory() {
        console.log('🔄 現在のデータ再読み込み開始');
        
        try {
            showLoadingState();
            
            const response = await fetch('tanaoroshi_ajax_handler.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    action: 'get_inventory',
                    limit: '100',
                    dev_mode: '1'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('📊 データ読み込み結果:', result);
            
            if (result.success && result.data) {
                allInventoryData = result.data.map(item => ({
                    id: item.id || item.item_id,
                    title: item.title || item.name || 'タイトル不明',
                    sku: item.sku || `SKU-${item.id}`,
                    type: determineStockType(item),
                    priceUSD: parseFloat(item.price_usd || item.priceUSD || item.price || item.current_price || 0),
                    stock: parseInt(item.stock_quantity || item.stock || item.quantity || 0),
                    image: item.gallery_url || item.image || null,
                    condition: item.condition_name || item.condition || 'used',
                    category: item.category || 'その他'
                }));
                
                filteredData = [...allInventoryData];
                
                renderInventoryCards();
                updateStatistics();
                
                showToast(`✅ データ読み込み完了: ${allInventoryData.length}件`, 'success');
                console.log('✅ データ再読み込み完了');
                
            } else {
                throw new Error(result.error || 'データ取得に失敗');
            }
            
        } catch (error) {
            console.error('❌ データ読み込みエラー:', error);
            showToast(`❌ 読み込みエラー: ${error.message}`, 'error');
            
            // エラー時はエンプティ状態を表示
            showEmptyState();
        }
    }

    // === 在庫タイプ自動判定関数（SKUベース） ===
    function determineStockType(item) {
        const sku = item.sku || '';
        
        if (sku.toLowerCase().includes('stock')) {
            return 'stock';
        }
        
        if (item.type && ['stock', 'dropship', 'set', 'hybrid'].includes(item.type)) {
            return item.type;
        }
        
        return 'dropship';
    }

    // === カード表示関数 ===
    function renderInventoryCards() {
        console.log('🎨 カード表示開始');
        
        const container = document.getElementById('inventory-grid');
        if (!container) {
            console.error('❌ インベントリグリッドが見つかりません');
            return;
        }
        
        if (!filteredData || filteredData.length === 0) {
            showEmptyState();
            return;
        }
        
        const cardsHTML = filteredData.map(item => `
            <div class="inventory__card" onclick="showItemDetails(${item.id})">
                <div class="inventory__card-image">
                    ${item.image ? 
                        `<img src="${item.image}" alt="${escapeHtml(item.title)}" class="inventory__card-img">` :
                        `<div class="inventory__card-placeholder">
                            <i class="fas fa-image"></i>
                            <span>商品画像</span>
                        </div>`
                    }
                    <div class="inventory__badge inventory__badge--${item.type}">
                        ${getTypeBadgeText(item.type)}
                    </div>
                </div>
                
                <div class="inventory__card-info">
                    <h3 class="inventory__card-title">${escapeHtml(item.title)}</h3>
                    
                    <div class="inventory__card-price">
                        <div class="inventory__card-price-main">$${item.priceUSD.toFixed(2)}</div>
                        <div class="inventory__card-price-sub">¥${Math.round(item.priceUSD * exchangeRate).toLocaleString()}</div>
                    </div>
                    
                    <div class="inventory__card-footer">
                        <span class="inventory__card-sku">${item.sku}</span>
                        <span class="inventory__card-stock">在庫: ${item.stock}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = cardsHTML;
        
        console.log(`✅ カード表示完了: ${filteredData.length}件表示`);
    }

    // === エンプティ状態表示 ===
    function showEmptyState() {
        const container = document.getElementById('inventory-grid');
        if (container) {
            container.innerHTML = `
                <div class="inventory__empty-state">
                    <i class="fas fa-box-open inventory__empty-state-icon"></i>
                    <div class="inventory__empty-state-title">商品データがありません</div>
                    <div class="inventory__empty-state-description">
                        eBayデータをインポートするか、新規商品を登録してください
                    </div>
                    <button class="btn btn--import" onclick="importEbayData()" style="margin-top: 1rem;">
                        <i class="fas fa-download"></i>
                        eBayデータをインポート
                    </button>
                </div>
            `;
        }
    }

    // === ローディング状態表示 ===
    function showLoadingState() {
        const container = document.getElementById('inventory-grid');
        if (container) {
            container.innerHTML = `
                <div class="inventory__empty-state">
                    <i class="fas fa-spinner fa-spin inventory__empty-state-icon"></i>
                    <div class="inventory__empty-state-title">データを読み込み中...</div>
                    <div class="inventory__empty-state-description">
                        PostgreSQLデータベースから商品情報を取得しています
                    </div>
                </div>
            `;
        }
    }

    // === 統計更新 ===
    function updateStatistics() {
        const totalProducts = allInventoryData.length;
        const stockProducts = allInventoryData.filter(item => item.type === 'stock').length;
        const dropshipProducts = allInventoryData.filter(item => item.type === 'dropship').length;
        const setProducts = allInventoryData.filter(item => item.type === 'set').length;
        const hybridProducts = allInventoryData.filter(item => item.type === 'hybrid').length;
        
        const totalValue = allInventoryData.reduce((sum, item) => 
            sum + (item.priceUSD * item.stock), 0);
        
        updateStatElement('total-products', totalProducts);
        updateStatElement('stock-products', stockProducts);
        updateStatElement('dropship-products', dropshipProducts);
        updateStatElement('set-products', setProducts);
        updateStatElement('hybrid-products', hybridProducts);
        updateStatElement('total-value', `$${(totalValue / 1000).toFixed(1)}K`);
    }

    function updateStatElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    // === トースト通知表示関数 ===
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('toast--show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('toast--show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    // === ユーティリティ関数 ===
    function getTypeBadgeText(type) {
        const typeMap = {
            'stock': '有在庫',
            'dropship': '無在庫',
            'set': 'セット品',
            'hybrid': 'ハイブリッド'
        };
        return typeMap[type] || '不明';
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // === モーダル関数（新規商品登録用） ===
    function openAddProductModal() {
        console.log('🆕 新規商品登録モーダル表示');
        
        // モーダルが存在するかチェック
        const modal = document.getElementById('addProductModal');
        if (!modal) {
            console.error('❌ 新規商品登録モーダルが見つかりません');
            showToast('新規商品登録機能を準備中です', 'info');
            return;
        }
        
        modal.style.display = 'flex';
        modal.classList.add('modal--active');
    }

    function showItemDetails(itemId) {
        const item = allInventoryData.find(i => i.id === itemId);
        if (!item) return;
        
        alert(`商品詳細:\n\n` +
              `商品名: ${item.title}\n` +
              `SKU: ${item.sku}\n` +
              `種類: ${getTypeBadgeText(item.type)}\n` +
              `価格: $${item.priceUSD.toFixed(2)}\n` +
              `在庫: ${item.stock}\n` +
              `カテゴリ: ${item.category}`);
    }

    console.log('✅ 棚卸しシステム（データベース管理統合版）初期化完了');
    </script>
</body>
</html>