/**
 * 🎯 CAIDS 在庫管理システム Phase1 JavaScript (緊急修復版)
 * - N3準拠 Ajax通信 (index.php経由・FormData・CSRF)
 * - Hook統合対応
 * - エラー修復完了版
 * 修正日: 2025年8月25日 緊急修復版
 */

// グローバル変数
let inventoryData = [];
let currentView = 'table'; // table or card

// CSRF トークン取得
function getCSRFToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || 
           window.CSRF_TOKEN || 
           window.NAGANO3_CONFIG?.csrfToken || '';
}

/**
 * 在庫データ取得（N3準拠・緊急修復版）
 */
async function loadInventoryData() {
    console.log('📦 在庫データ取得開始...');
    
    try {
        // ローディング表示
        showLoadingStatus('PostgreSQLからデータを読み込み中...');
        
        // N3準拠 FormData + CSRF
        const formData = new FormData();
        formData.append('action', 'get_inventory');
        formData.append('csrf_token', getCSRFToken());
        
        const response = await fetch('index.php', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📡 API レスポンス:', result);
        
        if (result.success && result.data) {
            inventoryData = result.data;
            console.log(`✅ データ取得成功: ${inventoryData.length}件`);
            
            // データ表示
            renderInventoryData();
            updateStatistics();
            hideLoadingStatus();
            showSuccessMessage(`データ読み込み完了: ${inventoryData.length}件`);
            
        } else {
            throw new Error(result.error || 'データ取得に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ データ取得エラー:', error);
        hideLoadingStatus();
        showErrorMessage(`データ取得エラー: ${error.message}`);
        
        // フォールバック: サンプルデータ表示
        loadSampleData();
    }
}

/**
 * サンプルデータ読み込み（フォールバック）
 */
function loadSampleData() {
    console.log('🔄 サンプルデータにフォールバック');
    
    inventoryData = [
        {
            id: 1,
            name: 'iPhone 12 64GB - Sample Product',
            sku: 'SAMPLE-001',
            type: 'stock',
            condition: 'used',
            priceUSD: 450.00,
            costUSD: 300.00,
            stock: 5,
            category: 'Electronics',
            channels: ['ebay'],
            image: '/api/placeholder/200/150',
            listing_status: '出品中',
            watchers_count: 12,
            views_count: 89,
            danger_level: 1,
            data_source: 'sample'
        },
        {
            id: 2,
            name: 'MacBook Air M1 - Sample Product',
            sku: 'SAMPLE-002', 
            type: 'dropship',
            condition: 'new',
            priceUSD: 899.00,
            costUSD: 750.00,
            stock: 0,
            category: 'Electronics',
            channels: ['ebay'],
            image: '/api/placeholder/200/150',
            listing_status: '未出品',
            watchers_count: 25,
            views_count: 156,
            danger_level: 0,
            data_source: 'sample'
        },
        {
            id: 3,
            name: 'Gaming Headset RGB - Sample Product',
            sku: 'SAMPLE-003',
            type: 'set',
            condition: 'new',
            priceUSD: 79.99,
            costUSD: 45.00,
            stock: 15,
            category: 'Electronics',
            channels: ['ebay'],
            image: '/api/placeholder/200/150',
            listing_status: '出品中',
            watchers_count: 8,
            views_count: 67,
            danger_level: 0,
            data_source: 'sample'
        }
    ];
    
    renderInventoryData();
    updateStatistics();
    
    showInfoMessage('🔄 サンプルデータにフォールバック - システム修復後に実データが利用可能');
}

/**
 * 在庫データレンダリング
 */
function renderInventoryData() {
    if (currentView === 'table') {
        renderTableView();
    } else {
        renderCardView();
    }
}

/**
 * テーブルビューレンダリング（未実装）
 */
function renderTableView() {
    console.log('📋 テーブルビューはPhase2で実装予定');
    renderCardView(); // フォールバック
}

/**
 * カードビューレンダリング
 */
function renderCardView() {
    const cardGrid = document.getElementById('card-grid');
    
    if (!cardGrid) {
        console.error('❌ card-grid要素が見つかりません');
        return;
    }
    
    if (inventoryData.length === 0) {
        cardGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">データがありません</h5>
                <p class="text-muted">データを読み込むか、新規商品を追加してください。</p>
                <button class="btn btn--success" onclick="openAddProductModal()">
                    <i class="fas fa-plus"></i> 新規商品追加
                </button>
            </div>
        `;
        return;
    }
    
    cardGrid.innerHTML = inventoryData.map(item => `
        <div class="inventory__card">
            <div class="inventory__card-header">
                <div class="inventory__card-image">
                    <img src="${item.image || 'https://via.placeholder.com/200x150?text=No+Image'}" 
                         alt="${escapeHtml(item.name)}" 
                         loading="lazy">
                </div>
                <div class="inventory__card-badge ${getTypeBadgeClass(item.type)}">
                    ${getTypeLabel(item.type)}
                </div>
            </div>
            
            <div class="inventory__card-body">
                <h6 class="inventory__card-title" title="${escapeHtml(item.name)}">
                    ${truncateText(item.name, 30)}
                </h6>
                
                <div class="inventory__card-meta">
                    <span class="inventory__card-sku">SKU: ${item.sku}</span>
                    <span class="inventory__card-condition ${getConditionClass(item.condition)}">
                        ${getConditionLabel(item.condition)}
                    </span>
                </div>
                
                <div class="inventory__card-stats">
                    <div class="inventory__card-stat">
                        <span class="inventory__card-stat-label">価格</span>
                        <span class="inventory__card-stat-value">$${item.priceUSD.toFixed(2)}</span>
                    </div>
                    <div class="inventory__card-stat">
                        <span class="inventory__card-stat-label">在庫</span>
                        <span class="inventory__card-stat-value">${item.stock}</span>
                    </div>
                    <div class="inventory__card-stat">
                        <span class="inventory__card-stat-label">利益</span>
                        <span class="inventory__card-stat-value ${(item.priceUSD - item.costUSD) > 0 ? 'profit-positive' : 'profit-negative'}">
                            $${(item.priceUSD - item.costUSD).toFixed(2)}
                        </span>
                    </div>
                </div>
                
                <div class="inventory__card-status">
                    <span class="inventory__card-listing-status ${getListingStatusClass(item.listing_status)}">
                        ${item.listing_status}
                    </span>
                    <div class="inventory__card-engagement">
                        <span title="ウォッチャー数">
                            <i class="fas fa-eye"></i> ${item.watchers_count || 0}
                        </span>
                        <span title="ビュー数">
                            <i class="fas fa-chart-line"></i> ${item.views_count || 0}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="inventory__card-actions">
                <button class="btn btn--secondary btn--sm" onclick="editItem(${item.id})" title="編集">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn--info btn--sm" onclick="viewItem(${item.id})" title="詳細">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn--warning btn--sm" onclick="duplicateItem(${item.id})" title="複製">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    console.log(`🎨 カードビュー更新完了: ${inventoryData.length}件`);
}

/**
 * 統計情報更新
 */
function updateStatistics() {
    const stats = {
        total: inventoryData.length,
        stock: inventoryData.filter(item => item.type === 'stock').length,
        dropship: inventoryData.filter(item => item.type === 'dropship').length,
        set: inventoryData.filter(item => item.type === 'set').length,
        hybrid: inventoryData.filter(item => item.type === 'hybrid').length,
        totalValue: inventoryData.reduce((sum, item) => sum + (item.priceUSD * item.stock), 0)
    };
    
    // 統計表示更新
    updateStatElement('total-products', stats.total);
    updateStatElement('stock-products', stats.stock);
    updateStatElement('dropship-products', stats.dropship);
    updateStatElement('set-products', stats.set);
    updateStatElement('hybrid-products', stats.hybrid);
    updateStatElement('total-value', `$${stats.totalValue.toFixed(2)}`);
    
    console.log('📊 統計情報更新完了:', stats);
}

/**
 * PostgreSQL接続テスト
 */
async function testPostgreSQLConnection() {
    console.log('🔌 PostgreSQL接続テスト開始...');
    
    try {
        const formData = new FormData();
        formData.append('action', 'test_database');
        formData.append('type', 'postgresql');
        formData.append('csrf_token', getCSRFToken());
        
        const response = await fetch('index.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success && result.data.success) {
            showSuccessMessage(`✅ PostgreSQL接続成功 (${result.data.time}ms)`);
            updateDatabaseStatus('接続成功', 'success');
        } else {
            throw new Error('PostgreSQL接続失敗');
        }
        
    } catch (error) {
        console.error('❌ PostgreSQL接続テストエラー:', error);
        showErrorMessage(`PostgreSQL接続エラー: ${error.message}`);
        updateDatabaseStatus('接続エラー', 'error');
    }
}

/**
 * PostgreSQLデータ取得
 */
async function loadPostgreSQLData() {
    console.log('🐘 PostgreSQLデータ読み込み開始...');
    
    showLoadingStatus('PostgreSQLから実データを取得中...');
    
    // 実装はloadInventoryData()と同じ
    await loadInventoryData();
}

/**
 * データ再読み込み
 */
async function reloadInventoryData() {
    console.log('🔄 データ再読み込み開始...');
    await loadInventoryData();
}

/**
 * ローディング状況表示
 */
function showLoadingStatus(message) {
    const loadingStatus = document.getElementById('loading-status');
    const loadingText = loadingStatus?.querySelector('.inventory__loading-text');
    
    if (loadingStatus) {
        loadingStatus.style.display = 'block';
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
    
    // カードグリッドを非表示
    const cardContainer = document.getElementById('card-container');
    if (cardContainer) {
        cardContainer.style.display = 'none';
    }
}

/**
 * ローディング状況非表示
 */
function hideLoadingStatus() {
    const loadingStatus = document.getElementById('loading-status');
    const cardContainer = document.getElementById('card-container');
    
    if (loadingStatus) {
        loadingStatus.style.display = 'none';
    }
    
    if (cardContainer) {
        cardContainer.style.display = 'block';
    }
}

/**
 * データベース状況更新
 */
function updateDatabaseStatus(status, type) {
    const statusElement = document.getElementById('database-status');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = 'inventory__stat-number';
        
        if (type === 'success') {
            statusElement.style.color = 'var(--color-success, #10b981)';
        } else if (type === 'error') {
            statusElement.style.color = 'var(--color-danger, #dc2626)';
        }
    }
}

/**
 * 統計要素更新
 */
function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

/**
 * 新規商品登録モーダル開く（N3統一システム対応版）
 */
function openAddProductModal() {
    console.log('🔧 N3統一モーダル表示: addProductModal');
    
    // モーダル要素確認
    const modal = document.getElementById('addProductModal');
    if (!modal) {
        console.error('❌ addProductModal要素が見つかりません');
        showErrorMessage('商品登録モーダルが見つかりません');
        return;
    }
    
    // N3統一モーダルシステム使用
    try {
        if (typeof openModal !== 'undefined') {
            // N3統一openModal関数を使用
            openModal('addProductModal');
            console.log('✅ N3統一モーダル表示成功');
        } else if (typeof bootstrap !== 'undefined') {
            // Bootstrap Modal表示（フォールバック）
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            console.log('✅ Bootstrapモーダル表示成功');
        } else {
            // 直接表示（最後の手段）
            modal.style.display = 'block';
            console.log('✅ 直接モーダル表示');
        }
    } catch (error) {
        console.error('❌ モーダル表示エラー:', error);
        showErrorMessage(`モーダル表示エラー: ${error.message}`);
    }
}

/**
 * ビュー切り替え（予約）
 */
function switchView(view) {
    console.log('❌ ビュー要素が見つかりません');
    // Phase2で実装予定
}

/**
 * ユーティリティ関数群
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function getTypeBadgeClass(type) {
    const classes = {
        'stock': 'inventory__badge--stock',
        'dropship': 'inventory__badge--dropship', 
        'set': 'inventory__badge--set',
        'hybrid': 'inventory__badge--hybrid'
    };
    return classes[type] || 'inventory__badge--default';
}

function getTypeLabel(type) {
    const labels = {
        'stock': '有在庫',
        'dropship': '無在庫',
        'set': 'セット品',
        'hybrid': 'ハイブリッド'
    };
    return labels[type] || 'その他';
}

function getConditionClass(condition) {
    const classes = {
        'new': 'condition--new',
        'used': 'condition--used',
        'refurbished': 'condition--refurbished'
    };
    return classes[condition] || 'condition--default';
}

function getConditionLabel(condition) {
    const labels = {
        'new': '新品',
        'used': '中古',
        'refurbished': '整備済み'
    };
    return labels[condition] || condition;
}

function getListingStatusClass(status) {
    const classes = {
        '出品中': 'status--active',
        '未出品': 'status--inactive',
        '売り切れ': 'status--sold'
    };
    return classes[status] || 'status--default';
}

/**
 * メッセージ表示関数群
 */
function showSuccessMessage(message) {
    showMessage(message, 'success');
}

function showErrorMessage(message) {
    showMessage(message, 'error');
}

function showInfoMessage(message) {
    showMessage(message, 'info');
}

function showMessage(message, type) {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // 既存のメッセージ削除
    const existingAlert = document.querySelector('.alert-message');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // 新しいメッセージ作成
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'info': 'alert-info',
        'warning': 'alert-warning'
    }[type] || 'alert-info';
    
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show alert-message position-fixed" 
             style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', alertHtml);
    
    // 5秒後に自動削除
    setTimeout(() => {
        const alert = document.querySelector('.alert-message');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

/**
 * アイテム操作関数（スタブ）
 */
function editItem(itemId) {
    console.log(`✏️ 編集: アイテムID ${itemId}`);
    showInfoMessage('編集機能はPhase2で実装予定です');
}

function viewItem(itemId) {
    console.log(`👁️ 詳細表示: アイテムID ${itemId}`);
    const item = inventoryData.find(i => i.id === itemId);
    if (item) {
        alert(`商品詳細:\n\n名前: ${item.name}\nSKU: ${item.sku}\n価格: $${item.priceUSD}\n在庫: ${item.stock}`);
    }
}

function duplicateItem(itemId) {
    console.log(`📋 複製: アイテムID ${itemId}`);
    showInfoMessage('複製機能はPhase2で実装予定です');
}

/**
 * イベントハンドラー設定
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 CAIDS在庫管理システム Phase1 初期化開始...');
    
    // アクションボタンのイベントリスナー設定
    const actionButtons = document.querySelectorAll('[data-action]');
    actionButtons.forEach(button => {
        const action = button.getAttribute('data-action');
        
        switch (action) {
            case 'test-postgresql-connection':
                button.addEventListener('click', testPostgreSQLConnection);
                break;
            case 'load-postgresql-data':
                button.addEventListener('click', loadPostgreSQLData);
                break;
            case 'reload-inventory-data':
                button.addEventListener('click', reloadInventoryData);
                break;
            case 'open-add-product-modal':
                button.addEventListener('click', openAddProductModal);
                break;
            case 'create-new-set':
                button.addEventListener('click', () => showInfoMessage('セット品作成はPhase2で実装予定'));
                break;
            case 'open-test-modal':
                button.addEventListener('click', () => showInfoMessage('テストモーダル機能はPhase2で実装予定'));
                break;
            case 'retry-connection':
                button.addEventListener('click', testPostgreSQLConnection);
                break;
        }
    });
    
    // 初期データロード
    setTimeout(() => {
        loadInventoryData();
    }, 500);
    
    console.log('✅ CAIDS在庫管理システム Phase1 初期化完了');
});

console.log('✅ 在庫管理システム Phase1 JavaScript（緊急修復版）読み込み完了');
