<?php if (!defined('SECURE_ACCESS')) die('Direct access not allowed'); 

// POST処理を最初に処理（get_complete_data アクション対応）
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'get_complete_data') {
    require_once 'modules/ebay_test_viewer/complete_data_display_api.php';
    exit;
}

// CSRF Token生成
if (!isset($_SESSION)) {
    session_start();
}
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>

<!-- 完全eBayデータ表示ビューアー -->
<div class="complete-ebay-viewer">
    <div class="viewer-header">
        <h1>📊 eBay 完全データ表示ビューアー</h1>
        <p>全ての取得データを統合表示 - 実際のeBay APIデータ + データベース統合データ</p>
        <div class="viewer-controls">
            <button class="btn btn-primary" onclick="refreshCompleteData()">
                <i class="fas fa-sync-alt"></i> データ更新
            </button>
            <button class="btn btn-info" onclick="showDataSources()">
                <i class="fas fa-database"></i> データソース
            </button>
        </div>
    </div>
    
    <div id="status" class="status-display">完全データ取得中...</div>
    <div id="statsDisplay" class="stats-container"></div>
    <div id="dataDisplay" class="data-container"></div>
</div>

<style>
.complete-ebay-viewer {
    padding: 2rem;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 1400px;
    margin: 0 auto;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    min-height: 100vh;
}

.viewer-header {
    background: white;
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
    text-align: center;
}

.viewer-header h1 {
    margin: 0 0 1rem 0;
    color: #2d3748;
    font-size: 2.5rem;
    font-weight: 700;
}

.viewer-header p {
    color: #718096;
    font-size: 1.1rem;
    margin-bottom: 2rem;
}

.viewer-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
}

.btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.btn-info {
    background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
    color: white;
}

.btn-info:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(116, 185, 255, 0.4);
}

.status-display {
    background: white;
    padding: 1rem 2rem;
    border-radius: 10px;
    margin-bottom: 2rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: #4a5568;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}

.stats-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.stats-card {
    background: white;
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    border-left: 5px solid #667eea;
}

.stats-card h3 {
    margin: 0 0 1rem 0;
    color: #2d3748;
    font-size: 1.3rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e2e8f0;
}

.stat-label {
    color: #718096;
    font-size: 0.9rem;
}

.stat-value {
    color: #2d3748;
    font-weight: 600;
    font-size: 1.1rem;
}

.data-container {
    display: grid;
    gap: 2rem;
}

.data-item {
    background: white;
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    transition: transform 0.3s ease;
}

.data-item:hover {
    transform: translateY(-5px);
}

.data-item-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.data-item-title {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0;
}

.data-source-badge {
    background: rgba(255,255,255,0.2);
    color: white;
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
}

.data-content {
    padding: 2rem;
}

.data-sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
}

.data-section {
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    padding: 1.5rem;
    background: #f7fafc;
}

.data-section h4 {
    margin: 0 0 1rem 0;
    color: #2d3748;
    font-size: 1.1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.data-field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e2e8f0;
}

.data-field:last-child {
    border-bottom: none;
}

.field-label {
    color: #718096;
    font-size: 0.9rem;
    font-weight: 500;
}

.field-value {
    color: #2d3748;
    font-weight: 600;
    text-align: right;
    max-width: 60%;
    overflow-wrap: break-word;
}

.field-value.price {
    color: #10b981;
    font-size: 1.1rem;
}

.field-value.active {
    color: #10b981;
}

.field-value.inactive {
    color: #ef4444;
}

.field-value.null {
    color: #9ca3af;
    font-style: italic;
}

.image-preview {
    max-width: 150px;
    max-height: 100px;
    border-radius: 8px;
    border: 2px solid #e2e8f0;
    object-fit: cover;
}

.html-preview {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 1rem;
    font-size: 0.85rem;
    max-height: 150px;
    overflow-y: auto;
}

.comparison-highlight {
    background: #fef3c7;
    border: 2px solid #f59e0b;
}

.real-data-highlight {
    background: #d1fae5;
    border: 2px solid #10b981;
}

@media (max-width: 768px) {
    .complete-ebay-viewer {
        padding: 1rem;
    }
    
    .viewer-header h1 {
        font-size: 2rem;
    }
    
    .data-sections {
        grid-template-columns: 1fr;
    }
    
    .viewer-controls {
        flex-direction: column;
    }
}
</style>

<script>
// CSRF Token設定
window.CSRF_TOKEN = 'test123';

console.log('🔍 完全eBayデータビューアー初期化');

async function refreshCompleteData() {
    const statusEl = document.getElementById('status');
    const statsEl = document.getElementById('statsDisplay');
    const displayEl = document.getElementById('dataDisplay');
    
    try {
        statusEl.textContent = '完全データ取得中...全テーブル統合処理中';
        statsEl.innerHTML = '';
        displayEl.innerHTML = '';
        
        console.log('API呼び出し開始: get_complete_data');
        
        const response = await fetch(window.location.pathname, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'action=get_complete_data&csrf_token=' + encodeURIComponent(window.CSRF_TOKEN)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📊 完全データ取得結果:', result);
        
        if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
            statusEl.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> 完全データ ${result.data.length}件取得成功（全テーブル統合）`;
            
            displayStats(result, statsEl);
            displayCompleteData(result.data, displayEl);
        } else {
            console.log('🔍 レスポンス構造デバッグ:', result);
            throw new Error(result.error || '完全データ取得失敗');
        }
        
    } catch (error) {
        console.error('❌ エラー:', error);
        statusEl.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> エラー: ${error.message}`;
        displayEl.innerHTML = `<div style="color: #ef4444; padding: 2rem; text-align: center; background: #fef2f2; border-radius: 10px;">完全データ取得失敗: ${error.message}</div>`;
    }
}

function displayStats(result, container) {
    const ebayStats = result.ebay_inventory_stats || {};
    const listingStats = result.ebay_listings_stats || {};
    
    container.innerHTML = `
        <div class="stats-card real-data-highlight">
            <h3><i class="fas fa-api"></i> 実際のeBay APIデータ (ebay_inventory)</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">総アイテム数</span>
                    <span class="stat-value">${ebayStats.total_ebay_inventory || 0}件</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">24時間以内の更新</span>
                    <span class="stat-value">${ebayStats.recent_updates || 0}件</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">ユニークアイテム</span>
                    <span class="stat-value">${ebayStats.unique_items || 0}件</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">平均価格</span>
                    <span class="stat-value price">$${parseFloat(ebayStats.avg_price || 0).toFixed(2)}</span>
                </div>
            </div>
        </div>
        
        <div class="stats-card">
            <h3><i class="fas fa-database"></i> 統合データ (ebay_listings)</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">総リスティング</span>
                    <span class="stat-value">${listingStats.total_listings || 0}件</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">eBay ID付き</span>
                    <span class="stat-value">${listingStats.with_ebay_id || 0}件</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">HTML説明付き</span>
                    <span class="stat-value">${listingStats.with_html_desc || 0}件</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">画像URL付き</span>
                    <span class="stat-value">${listingStats.with_images || 0}件</span>
                </div>
            </div>
        </div>
        
        <div class="stats-card comparison-highlight">
            <h3><i class="fas fa-chart-line"></i> データ統計</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">取得データ件数</span>
                    <span class="stat-value">${result.count}件</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">データソース数</span>
                    <span class="stat-value">${result.data_sources ? Object.keys(result.data_sources).length : 0}個</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">更新日時</span>
                    <span class="stat-value">${result.timestamp || 'N/A'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">最終eBay更新</span>
                    <span class="stat-value">${ebayStats.last_update ? new Date(ebayStats.last_update).toLocaleString('ja-JP') : 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
}

function displayCompleteData(data, container) {
    container.innerHTML = '';
    
    if (!data || !Array.isArray(data)) {
        container.innerHTML = '<div>データがありません</div>';
        return;
    }
    
    data.slice(0, 10).forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'data-item';
        
        if (item.real_ebay_item_id) {
            div.classList.add('real-data-highlight');
        }
        
        const productName = item.product_name || item.real_ebay_title || item.integrated_title || 'N/A';
        const dataSource = item.data_source || 'Product Data';
        
        div.innerHTML = `
            <div class="data-item-header">
                <div>
                    <h3 class="data-item-title">${index + 1}. ${escapeHtml(productName)}</h3>
                    <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">SKU: ${item.master_sku || 'N/A'} | Status: ${item.ebay_integration_status || 'Unknown'}</p>
                </div>
                <div class="data-source-badge">${dataSource}</div>
            </div>
            
            <div class="data-content">
                <div class="data-sections">
                    ${generateBasicProductSection(item)}
                    ${generateRealEbaySection(item)}
                    ${generateIntegratedEbaySection(item)}
                </div>
            </div>
        `;
        
        container.appendChild(div);
    });
}

function generateBasicProductSection(item) {
    return `
        <div class="data-section">
            <h4><i class="fas fa-box"></i> 基本商品情報</h4>
            <div class="data-field">
                <span class="field-label">商品ID</span>
                <span class="field-value">${item.product_id || 'N/A'}</span>
            </div>
            <div class="data-field">
                <span class="field-label">SKU</span>
                <span class="field-value">${item.master_sku || 'N/A'}</span>
            </div>
            <div class="data-field">
                <span class="field-label">商品名</span>
                <span class="field-value">${escapeHtml(item.product_name || 'N/A')}</span>
            </div>
            <div class="data-field">
                <span class="field-label">基本価格</span>
                <span class="field-value price">$${formatPrice(item.base_price_usd)}</span>
            </div>
            <div class="data-field">
                <span class="field-label">商品タイプ</span>
                <span class="field-value">${item.product_type || 'N/A'}</span>
            </div>
        </div>
    `;
}

function generateRealEbaySection(item) {
    if (!item.real_ebay_item_id) {
        return `
            <div class="data-section">
                <h4><i class="fas fa-times-circle"></i> 実際のeBayデータ</h4>
                <p style="color: #9ca3af; font-style: italic;">実際のeBay APIデータなし</p>
            </div>
        `;
    }
    
    return `
        <div class="data-section real-data-highlight">
            <h4><i class="fas fa-check-circle"></i> 実際のeBay APIデータ</h4>
            <div class="data-field">
                <span class="field-label">eBayアイテムID</span>
                <span class="field-value">${item.real_ebay_item_id}</span>
            </div>
            <div class="data-field">
                <span class="field-label">タイトル</span>
                <span class="field-value">${escapeHtml(item.real_ebay_title || 'N/A')}</span>
            </div>
            <div class="data-field">
                <span class="field-label">価格</span>
                <span class="field-value price">$${formatPrice(item.real_ebay_price)}</span>
            </div>
            <div class="data-field">
                <span class="field-label">ウォッチ数</span>
                <span class="field-value">${item.real_watchers || 0}</span>
            </div>
            <div class="data-field">
                <span class="field-label">閲覧数</span>
                <span class="field-value">${item.real_views || 0}</span>
            </div>
        </div>
    `;
}

function generateIntegratedEbaySection(item) {
    return `
        <div class="data-section">
            <h4><i class="fas fa-database"></i> 統合eBayデータ</h4>
            <div class="data-field">
                <span class="field-label">統合eBay ID</span>
                <span class="field-value">${item.integrated_ebay_id || 'N/A'}</span>
            </div>
            <div class="data-field">
                <span class="field-label">統合価格</span>
                <span class="field-value price">$${formatPrice(item.integrated_price)}</span>
            </div>
            <div class="data-field">
                <span class="field-label">販売者</span>
                <span class="field-value">${item.seller_username || 'N/A'}</span>
            </div>
        </div>
    `;
}

function formatPrice(price) {
    if (!price || price === 'N/A') return '0.00';
    return parseFloat(price).toFixed(2);
}

function escapeHtml(text) {
    if (!text) return 'N/A';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showDataSources() {
    alert(`📊 データソース詳細

🔹 products: 基本商品情報 (nagano3_db.products)
🔹 inventory: 在庫情報 (nagano3_db.inventory)  
🔹 product_images: 商品画像 (nagano3_db.product_images)
🔹 ebay_inventory: 実際のeBay APIデータ (nagano3_db.ebay_inventory)
🔹 ebay_listings: 統合eBayデータ (nagano3_db.ebay_listings)

✅ 全テーブルのデータを統合表示しています。`);
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', function() {
    refreshCompleteData();
});

console.log('✅ 完全eBayデータビューアー初期化完了');
</script>
