/**
 * eBayテストビューアー N3準拠 JavaScript
 * PHPから完全分離・Ajax専用通信
 */

class EbayViewerN3 {
    constructor() {
        this.csrfToken = '';
        this.currentData = [];
        this.init();
    }
    
    init() {
        // CSRF Token取得
        const tokenInput = document.getElementById('csrfToken');
        this.csrfToken = tokenInput ? tokenInput.value : '';
        
        console.log('✅ eBayViewer N3準拠版 初期化完了');
        
        // イベントリスナー設定
        this.setupEventListeners();
        
        // 初期データ読み込み
        this.loadData();
    }
    
    setupEventListeners() {
        // リフレッシュボタン
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadData());
        }
        
        // サンプルデータ作成ボタン
        const createSampleBtn = document.getElementById('createSampleBtn');
        if (createSampleBtn) {
            createSampleBtn.addEventListener('click', () => this.createSampleData());
        }
        
        // モーダルテストボタン
        const modalTestBtn = document.getElementById('modalTestBtn');
        if (modalTestBtn) {
            modalTestBtn.addEventListener('click', () => this.testModal());
        }
    }
    
    async loadData() {
        this.showLoading(true);
        
        try {
            const formData = new FormData();
            formData.append('action', 'load_diagnostic_data');
            formData.append('csrf_token', this.csrfToken);
            
            const response = await fetch('modules/ebay_test_viewer/ajax_handler.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentData = result.data;
                this.displayData(result.data);
                console.log('✅ データ読み込み成功');
            } else {
                this.showError('データ読み込みエラー: ' + result.error);
            }
            
        } catch (error) {
            console.error('Ajax通信エラー:', error);
            this.showError('通信エラーが発生しました: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    async createSampleData() {
        if (!confirm('サンプルデータを作成しますか？')) return;
        
        this.showLoading(true);
        
        try {
            const formData = new FormData();
            formData.append('action', 'create_sample_data');
            formData.append('csrf_token', this.csrfToken);
            
            const response = await fetch('modules/ebay_test_viewer/ajax_handler.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('成功: ' + result.message);
                this.loadData(); // データ再読み込み
            } else {
                alert('エラー: ' + result.error);
            }
            
        } catch (error) {
            console.error('サンプルデータ作成エラー:', error);
            alert('エラーが発生しました: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    displayData(data) {
        this.displayDatabaseSummary(data);
        this.displayEbaySummary(data);
        this.displayStats(data);
        this.displayDataTable(data);
        this.displayJsonOutput(data);
    }
    
    displayDatabaseSummary(data) {
        const container = document.getElementById('databaseSummary');
        if (!container) return;
        
        container.innerHTML = `
            <div class="alert alert-success">
                <strong>接続成功</strong><br>
                総商品数: ${data.database_stats?.total_items || 0}件<br>
                平均完全性: ${data.database_stats?.avg_completeness || 0}%<br>
                利用可能フィールド: ${data.available_fields || 0}項目
            </div>
        `;
    }
    
    displayEbaySummary(data) {
        const container = document.getElementById('ebaySummary');
        if (!container) return;
        
        const isListed = (data.ebay_listing_count || 0) > 0;
        container.innerHTML = `
            <div class="alert ${isListed ? 'alert-success' : 'alert-warning'}">
                <strong>${isListed ? 'eBay出品済み' : 'eBay未出品'}</strong><br>
                出品数: ${data.ebay_listing_count || 0}件
            </div>
        `;
    }
    
    displayStats(data) {
        const container = document.getElementById('statsArea');
        if (!container) return;
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${data.database_stats?.total_items || 0}</div>
                    <div class="stat-label">総商品数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.available_fields || 0}</div>
                    <div class="stat-label">取得可能項目</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.database_stats?.avg_completeness || 0}%</div>
                    <div class="stat-label">データ完全性</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.database_tables?.length || 0}</div>
                    <div class="stat-label">テーブル数</div>
                </div>
            </div>
        `;
    }
    
    displayDataTable(data) {
        const container = document.getElementById('dataTableArea');
        if (!container || !data.sample_data || data.sample_data.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">表示データがありません</div>';
            return;
        }
        
        const sampleData = data.sample_data;
        const displayColumns = ['ebay_item_id', 'title', 'current_price_value', 'condition_display_name', 'quantity', 'listing_status'];
        
        let tableHtml = `
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
        `;
        
        displayColumns.forEach(key => {
            const field = data.field_details?.[key];
            const displayName = field?.display_name || key;
            tableHtml += `<th>${this.escapeHtml(displayName)}</th>`;
        });
        tableHtml += '<th>操作</th></tr></thead><tbody>';
        
        sampleData.forEach((item, index) => {
            tableHtml += '<tr>';
            
            displayColumns.forEach(key => {
                let value = item[key] || '-';
                
                if (key === 'current_price_value' && value !== '-') {
                    value = `$${parseFloat(value).toFixed(2)}`;
                } else if (key === 'title' && value !== '-') {
                    value = String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '');
                } else if (key === 'listing_status') {
                    const statusClass = value === 'Active' ? 'success' : 'warning';
                    value = `<span class="status-badge status-${statusClass}">${this.escapeHtml(value)}</span>`;
                }
                
                tableHtml += `<td>${typeof value === 'string' && key !== 'listing_status' ? this.escapeHtml(value) : value}</td>`;
            });
            
            tableHtml += `
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn--detail" onclick="EbayViewer.showDetail(${index})" title="詳細表示">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn action-btn--ebay" onclick="EbayViewer.openEbayLink('${item.ebay_item_id || ''}', '${item.view_item_url || ''}')" title="eBayで見る">
                            <i class="fab fa-ebay"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tableHtml += '</tr>';
        });
        
        tableHtml += '</tbody></table></div>';
        container.innerHTML = tableHtml;
    }
    
    displayJsonOutput(data) {
        const container = document.getElementById('jsonOutput');
        if (container) {
            container.textContent = JSON.stringify(data, null, 2);
        }
    }
    
    showDetail(index) {
        const item = this.currentData.sample_data?.[index];
        if (!item) {
            alert('商品データが見つかりません');
            return;
        }
        
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        
        if (modalTitle) {
            modalTitle.innerHTML = `<i class="fas fa-eye"></i> 商品詳細: ${this.escapeHtml(item.title || 'ID: ' + (item.ebay_item_id || 'N/A'))}`;
        }
        
        if (modalContent) {
            modalContent.innerHTML = this.generateDetailContent(item);
        }
        
        this.openModal();
    }
    
    generateDetailContent(item) {
        return `
            <div class="product-detail">
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>eBay商品ID:</label>
                        <span>${this.escapeHtml(item.ebay_item_id || '-')}</span>
                    </div>
                    <div class="detail-item">
                        <label>タイトル:</label>
                        <span>${this.escapeHtml(item.title || '-')}</span>
                    </div>
                    <div class="detail-item">
                        <label>価格:</label>
                        <span>$${parseFloat(item.current_price_value || 0).toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <label>コンディション:</label>
                        <span>${this.escapeHtml(item.condition_display_name || '-')}</span>
                    </div>
                    <div class="detail-item">
                        <label>数量:</label>
                        <span>${item.quantity || 0}個</span>
                    </div>
                    <div class="detail-item">
                        <label>ステータス:</label>
                        <span>${this.escapeHtml(item.listing_status || '-')}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    openEbayLink(itemId, viewUrl) {
        if (!itemId && !viewUrl) {
            alert('eBayリンク情報が見つかりません');
            return;
        }
        
        let ebayUrl = viewUrl;
        if (!ebayUrl && itemId) {
            ebayUrl = `https://www.ebay.com/itm/${itemId}`;
        }
        
        if (ebayUrl) {
            window.open(ebayUrl, '_blank', 'noopener,noreferrer');
            alert('eBayページを新しいタブで開きました');
        } else {
            alert('有効なeBayURLが見つかりません');
        }
    }
    
    testModal() {
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-test-tube"></i> モーダルテスト';
        }
        
        if (modalContent) {
            modalContent.innerHTML = `
                <div class="alert alert-success">
                    <strong>N3準拠モーダルシステムが正常に動作しています！</strong>
                </div>
                <p>このモーダルはN3制約に準拠したシステムで動作しています：</p>
                <ul>
                    <li>PHP/JavaScript完全分離</li>
                    <li>Ajax専用通信</li>
                    <li>セキュリティ対策適用済み</li>
                    <li>CDN不要の軽量設計</li>
                </ul>
                <p>現在時刻: ${new Date().toLocaleString('ja-JP')}</p>
            `;
        }
        
        this.openModal();
    }
    
    openModal() {
        const modal = document.getElementById('productDetailModal');
        if (modal) {
            modal.setAttribute('aria-hidden', 'false');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // ESCキーで閉じる
            document.addEventListener('keydown', this.handleModalKeydown.bind(this));
        }
    }
    
    closeModal() {
        const modal = document.getElementById('productDetailModal');
        if (modal) {
            modal.setAttribute('aria-hidden', 'true');
            modal.style.display = 'none';
            document.body.style.overflow = '';
            
            // イベントリスナー解除
            document.removeEventListener('keydown', this.handleModalKeydown.bind(this));
        }
    }
    
    handleModalKeydown(event) {
        if (event.key === 'Escape') {
            this.closeModal();
        }
    }
    
    showLoading(show) {
        const loadingArea = document.getElementById('loadingArea');
        const contentArea = document.getElementById('contentArea');
        
        if (loadingArea) {
            loadingArea.style.display = show ? 'block' : 'none';
        }
        if (contentArea) {
            contentArea.style.display = show ? 'none' : 'block';
        }
    }
    
    showError(message) {
        const contentArea = document.getElementById('contentArea');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="alert alert-error">
                    <strong>エラー</strong><br>
                    ${this.escapeHtml(message)}
                </div>
            `;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// グローバルインスタンス
window.EbayViewer = null;

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 eBayViewer N3準拠版 開始');
    window.EbayViewer = new EbayViewerN3();
});

// グローバル関数（後方互換性）
window.showProductDetail = function(index) {
    if (window.EbayViewer) {
        window.EbayViewer.showDetail(index);
    }
};

console.log('✅ eBayViewer N3準拠 JavaScript 読み込み完了');
