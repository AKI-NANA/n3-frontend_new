<?php if (!defined('SECURE_ACCESS')) die('Direct access not allowed'); 

// 🔧 CSRF Token生成
if (!isset($_SESSION)) {
    session_start();
}
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>

<!-- 🎯 完全データ表示テスト - 全項目表示版 -->
<div class="ebay-complete-viewer">
    <h1>📊 eBay 完全データ表示テスト（全項目版）</h1>
    <div id="status">データベース全項目取得中...</div>
    <div id="dataDisplay"></div>
</div>

<style>
.ebay-complete-viewer {
    padding: 2rem;
    font-family: Arial, sans-serif;
    max-width: 1200px;
    margin: 0 auto;
}

#dataDisplay {
    margin-top: 2rem;
}

.data-item {
    border: 2px solid #e5e5e5;
    padding: 1.5rem;
    margin: 2rem 0;
    border-radius: 12px;
    background: linear-gradient(135deg, #f8f9fa, #ffffff);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.data-item h3 {
    margin: 0 0 1rem 0;
    color: #2563eb;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 0.5rem;
}

.data-section {
    margin: 1rem 0;
    padding: 1rem;
    background: rgba(243, 244, 246, 0.5);
    border-radius: 8px;
    border-left: 4px solid #10b981;
}

.data-section h4 {
    margin: 0 0 0.75rem 0;
    color: #059669;
    font-size: 1rem;
}

.data-section div {
    margin: 0.5rem 0;
    padding: 0.25rem 0;
    border-bottom: 1px dotted #d1d5db;
    font-size: 0.9rem;
}

.data-section div:last-child {
    border-bottom: none;
}

.data-section strong {
    color: #374151;
    display: inline-block;
    width: 150px;
    font-weight: 600;
}

.debug-section {
    border-left-color: #f59e0b;
    background: rgba(254, 243, 199, 0.3);
}

.debug-section h4 {
    color: #d97706;
}

.data-price {
    color: #10b981;
    font-size: 1.4rem;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
}

pre {
    font-size: 0.7rem !important;
    background: #f3f4f6 !important;
    padding: 0.5rem !important;
    border-radius: 4px !important;
    max-height: 300px !important;
    overflow-y: auto !important;
    border: 1px solid #d1d5db !important;
}

.status-active {
    color: #059669;
    font-weight: bold;
}

.status-inactive {
    color: #dc2626;
    font-weight: bold;
}
</style>

<script>
// 🔧 CSRF Token設定
window.CSRF_TOKEN = '<?php echo $_SESSION['csrf_token']; ?>';

console.log('📊 完全データ表示テスト開始');
console.log('🔧 CSRF Token設定:', window.CSRF_TOKEN);

async function fetchRealData() {
    const statusEl = document.getElementById('status');
    const displayEl = document.getElementById('dataDisplay');
    
    try {
        statusEl.textContent = 'PostgreSQL接続中...全項目取得準備';
        
        const response = await fetch(window.location.pathname, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'action=get_real_data&csrf_token=' + encodeURIComponent(window.CSRF_TOKEN)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📊 完全データ取得結果:', result);
        
        if (result.success && result.data && result.data.data && Array.isArray(result.data.data) && result.data.data.length > 0) {
            statusEl.textContent = `✅ 完全データ ${result.data.data.length}件取得成功（全項目表示）`;
            displayCompleteData(result.data.data, displayEl);
        } else if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
            statusEl.textContent = `✅ 完全データ ${result.data.length}件取得成功（全項目表示）`;
            displayCompleteData(result.data, displayEl);
        } else {
            console.log('🔍 レスポンス構造デバッグ:', result);
            throw new Error('完全データ取得失敗 - 構造を確認してください');
        }
        
    } catch (error) {
        console.error('❌ エラー:', error);
        statusEl.textContent = `❌ エラー: ${error.message}`;
        displayEl.innerHTML = `<div style="color: red; padding: 2rem; background: #fee; border-radius: 8px;">完全データ取得失敗: ${error.message}</div>`;
    }
}

function displayCompleteData(data, container) {
    container.innerHTML = '';
    
    data.slice(0, 5).forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'data-item';
        
        // 📊 全項目表示用HTMLテンプレート
        let fullDataHtml = `<h3>📋 商品${index + 1}: ${escapeHtml(item.product_name || item.title || item.master_sku || 'N/A')}</h3>`;
        
        // 基本情報セクション
        fullDataHtml += `<div class="data-section"><h4>🏷️ 基本情報</h4>`;
        fullDataHtml += `<div><strong>ID:</strong> ${item.id || 'N/A'}</div>`;
        fullDataHtml += `<div><strong>SKU:</strong> ${escapeHtml(item.master_sku || 'N/A')}</div>`;
        fullDataHtml += `<div><strong>商品名:</strong> ${escapeHtml(item.product_name || item.title || 'N/A')}</div>`;
        
        // 価格情報
        const priceValue = item.base_price_usd || item.price_usd || 0;
        const safePrice = typeof priceValue === 'number' ? priceValue : parseFloat(priceValue) || 0;
        fullDataHtml += `<div><strong>💰 価格:</strong> <span class="data-price">$${safePrice.toFixed(2)}</span></div>`;
        fullDataHtml += `</div>`;
        
        // 詳細情報セクション
        fullDataHtml += `<div class="data-section"><h4>📋 詳細情報</h4>`;
        fullDataHtml += `<div><strong>説明:</strong> ${escapeHtml((item.description || '').substring(0, 200))}${item.description && item.description.length > 200 ? '...' : ''}</div>`;
        fullDataHtml += `<div><strong>種類:</strong> ${item.product_type || 'N/A'}</div>`;
        fullDataHtml += `<div><strong>カテゴリ:</strong> ${item.category_name || 'N/A'}</div>`;
        fullDataHtml += `<div><strong>ブランド:</strong> ${item.brand || 'N/A'}</div>`;
        fullDataHtml += `<div><strong>モデル:</strong> ${item.model || 'N/A'}</div>`;
        fullDataHtml += `<div><strong>状態:</strong> ${item.condition_type || 'N/A'}</div>`;
        fullDataHtml += `</div>`;
        
        // 物理情報セクション
        fullDataHtml += `<div class="data-section"><h4>📦 物理情報</h4>`;
        fullDataHtml += `<div><strong>重量:</strong> ${item.weight_kg || 'N/A'} kg</div>`;
        fullDataHtml += `<div><strong>寸法:</strong> ${item.dimensions_cm || 'N/A'}</div>`;
        fullDataHtml += `<div><strong>原産国:</strong> ${item.origin_country || 'N/A'}</div>`;
        fullDataHtml += `<div><strong>タグ:</strong> ${item.tags || 'N/A'}</div>`;
        fullDataHtml += `</div>`;
        
        // 在庫情報セクション（ある場合）
        if (item.quantity_available !== undefined || item.quantity !== undefined || item.minimum_stock_level !== undefined) {
            fullDataHtml += `<div class="data-section"><h4>📦 在庫情報</h4>`;
            const quantity = item.quantity_available || item.quantity || 0;
            fullDataHtml += `<div><strong>在庫数:</strong> ${quantity}</div>`;
            fullDataHtml += `<div><strong>最小在庫:</strong> ${item.minimum_stock_level || 'N/A'}</div>`;
            fullDataHtml += `<div><strong>最大在庫:</strong> ${item.maximum_stock_level || 'N/A'}</div>`;
            fullDataHtml += `<div><strong>発注点:</strong> ${item.reorder_point || 'N/A'}</div>`;
            fullDataHtml += `<div><strong>倉庫位置:</strong> ${item.warehouse_location || 'N/A'}</div>`;
            fullDataHtml += `<div><strong>最終棚卸:</strong> ${item.last_stock_check || 'N/A'}</div>`;
            fullDataHtml += `</div>`;
        }
        
        // SEO情報セクション
        if (item.seo_title || item.seo_description || item.meta_keywords) {
            fullDataHtml += `<div class="data-section"><h4>🔍 SEO情報</h4>`;
            fullDataHtml += `<div><strong>SEOタイトル:</strong> ${escapeHtml(item.seo_title || 'N/A')}</div>`;
            fullDataHtml += `<div><strong>SEO説明:</strong> ${escapeHtml(item.seo_description || 'N/A')}</div>`;
            fullDataHtml += `<div><strong>メタキーワード:</strong> ${escapeHtml(item.meta_keywords || 'N/A')}</div>`;
            fullDataHtml += `</div>`;
        }
        
        // 管理情報セクション
        fullDataHtml += `<div class="data-section"><h4>🔧 管理情報</h4>`;
        fullDataHtml += `<div><strong>アクティブ:</strong> <span class="${item.is_active ? 'status-active' : 'status-inactive'}">${item.is_active ? '✅ 有効' : '❌ 無効'}</span></div>`;
        fullDataHtml += `<div><strong>おすすめ:</strong> ${item.is_featured ? '✅ あり' : '❌ なし'}</div>`;
        fullDataHtml += `<div><strong>内部メモ:</strong> ${escapeHtml(item.internal_notes || 'N/A')}</div>`;
        fullDataHtml += `<div><strong>仕入先参照:</strong> ${escapeHtml(item.supplier_reference || 'N/A')}</div>`;
        fullDataHtml += `<div><strong>更新者:</strong> ${item.last_updated_by || 'N/A'}</div>`;
        fullDataHtml += `<div><strong>作成日:</strong> ${item.created_at || 'N/A'}</div>`;
        fullDataHtml += `<div><strong>更新日:</strong> ${item.updated_at || 'N/A'}</div>`;
        fullDataHtml += `<div><strong>データソース:</strong> ${item.source || 'N/A'}</div>`;
        fullDataHtml += `</div>`;
        
        // 全フィールドRAWデータ（デバッグ用）
        fullDataHtml += `<div class="data-section debug-section"><h4>🐛 全フィールドRAWデータ（デバッグ用）</h4>`;
        fullDataHtml += `<div><strong>フィールド数:</strong> ${Object.keys(item).length}個</div>`;
        fullDataHtml += `<pre>${JSON.stringify(item, null, 2)}</pre>`;
        fullDataHtml += `</div>`;
        
        div.innerHTML = fullDataHtml;
        container.appendChild(div);
    });
    
    // 📊 統計情報追加
    const statsDiv = document.createElement('div');
    statsDiv.className = 'data-item';
    statsDiv.innerHTML = `
        <h3>📊 データ統計情報</h3>
        <div class="data-section">
            <h4>📈 取得統計</h4>
            <div><strong>総取得件数:</strong> ${data.length}件</div>
            <div><strong>表示件数:</strong> ${Math.min(data.length, 5)}件</div>
            <div><strong>平均フィールド数:</strong> ${data.length > 0 ? Math.round(data.reduce((sum, item) => sum + Object.keys(item).length, 0) / data.length) : 0}個/商品</div>
            <div><strong>データベース:</strong> PostgreSQL nagano3_db</div>
            <div><strong>テーブル:</strong> products (+ inventory JOIN)</div>
            <div><strong>取得日時:</strong> ${new Date().toLocaleString('ja-JP')}</div>
        </div>
    `;
    container.appendChild(statsDiv);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', function() {
    fetchRealData();
});
</script>

<script>
console.log('✅ 完全データ表示システム準備完了');
console.log('🎯 目標: データベースの全項目を表示する');
</script>
