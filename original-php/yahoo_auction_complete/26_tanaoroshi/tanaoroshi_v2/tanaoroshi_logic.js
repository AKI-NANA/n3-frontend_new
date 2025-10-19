/**
 * 棚卸システムロジック - 既存機能完全保持
 * HTMLテンプレート分離版
 */

// グローバル変数（既存システムとの互換性確保）
window.currentProductData = [];
window.tanaoroshiSystemReady = false;

/**
 * 棚卸システム v2 初期化
 */
window.initTanaoroshiV2 = function() {
    console.log('🚀 棚卸システム v2 初期化開始');
    
    // 既存機能の確認
    checkExistingFeatures();
    
    // テンプレートの準備確認
    checkTemplateSystem();
    
    // データローダーの初期化
    initDataLoader();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    window.tanaoroshiSystemReady = true;
    console.log('✅ 棚卸システム v2 初期化完了');
};

/**
 * 既存機能の動作確認
 */
function checkExistingFeatures() {
    const features = {
        'N3Modal': typeof window.N3Modal !== 'undefined',
        'EbayViewSwitcher': typeof window.EbayViewSwitcher !== 'undefined',
        'EbayEnhancedExcel': typeof window.EbayEnhancedExcel !== 'undefined',
        'TemplateLoader': typeof window.TemplateLoader !== 'undefined'
    };
    
    Object.keys(features).forEach(feature => {
        if (features[feature]) {
            console.log(`✅ ${feature} が利用可能です`);
        } else {
            console.warn(`⚠️ ${feature} が見つかりません`);
        }
    });
}

/**
* テンプレートシステム確認
*/
function checkTemplateSystem() {
if (typeof window.TemplateLoader !== 'undefined') {
window.TemplateLoader.setDebugMode(true);
window.TemplateLoader.setTemplatePath('modules/tanaoroshi_v2/templates/');
console.log('📋 テンプレートローダー設定完了');
}
}

/**
 * データローダー初期化
 */
function initDataLoader() {
    // 既存のローディング表示を活用
    showLoading('棚卸データ初期化中...');
    
    // 初期データ構造を準備
    window.currentProductData = [];
    
    hideLoading();
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
    // 既存のボタンイベントを維持
    setupExistingButtonEvents();
    
    // 新しいテンプレートベースのイベントを追加
    setupTemplateEvents();
}

/**
 * 既存ボタンイベント設定
 */
function setupExistingButtonEvents() {
    // モーダルテストボタン（既存機能活用）
    if (typeof window.testModal === 'undefined') {
        window.testModal = function() {
            if (typeof window.N3Modal !== 'undefined') {
                window.N3Modal.setContent("test-modal", {
                    body: `
                        <div class="n3-alert n3-alert--success">
                            <strong>棚卸システム v2 が正常に動作しています！</strong>
                        </div>
                        <p>このモーダルはテンプレート分離版で動作しています。</p>
                        <ul>
                            <li>HTML完全分離</li>
                            <li>既存CSS/JS活用</li>
                            <li>機能完全保持</li>
                            <li>テンプレートキャッシュ</li>
                        </ul>
                    `
                });
                window.N3Modal.open("test-modal");
            } else {
                alert('N3Modal が利用できません');
            }
        };
    }
    
    // アラートテスト（既存機能活用）
    if (typeof window.testAlert === 'undefined') {
        window.testAlert = function() {
            if (typeof window.N3Modal !== 'undefined') {
                window.N3Modal.alert({
                    title: "成功",
                    message: "棚卸システム v2 のアラート機能が正常に動作しています。",
                    type: "success"
                });
            } else {
                alert('アラート機能: 棚卸システム v2 が正常に動作しています');
            }
        };
    }
    
    // 確認テスト（既存機能活用）
    if (typeof window.testConfirm === 'undefined') {
        window.testConfirm = function() {
            if (typeof window.N3Modal !== 'undefined') {
                window.N3Modal.confirm({
                    title: "テスト確認",
                    message: "棚卸システム v2 の確認機能が正常に動作しています。実行しますか？"
                }).then(function(result) {
                    if (result) {
                        window.N3Modal.alert({ message: "実行されました！", type: "success" });
                    } else {
                        window.N3Modal.alert({ message: "キャンセルされました", type: "info" });
                    }
                });
            } else {
                const result = confirm('棚卸システム v2 の確認機能が正常に動作しています。実行しますか？');
                alert(result ? '実行されました！' : 'キャンセルされました');
            }
        };
    }
}

/**
 * テンプレートベースのイベント設定
 */
function setupTemplateEvents() {
    // 棚卸データ読み込み
    window.loadTanaoroshiData = async function() {
        console.log('📦 棚卸データ読み込み開始');
        showLoading('棚卸データを読み込み中...');
        
        try {
            // 模擬棚卸データを生成（実際のAPIに置き換え可能）
            const mockData = generateMockTanaoroshiData();
            window.currentProductData = mockData;
            
            // テンプレートを使用してデータ表示
            await renderTanaoroshiData(mockData);
            
            // 統計情報更新
            updateStatistics(mockData);
            
            hideLoading();
            showContent();
            
            // 成功メッセージ
            if (typeof window.N3Modal !== 'undefined') {
                window.N3Modal.alert({
                    title: "読み込み完了",
                    message: `${mockData.length}件の棚卸データを読み込みました。`,
                    type: "success"
                });
            }
            
        } catch (error) {
            console.error('❌ 棚卸データ読み込みエラー:', error);
            hideLoading();
            
            if (typeof window.N3Modal !== 'undefined') {
                window.N3Modal.alert({
                    title: "エラー",
                    message: "棚卸データの読み込みに失敗しました: " + error.message,
                    type: "error"
                });
            } else {
                alert('棚卸データの読み込みに失敗しました: ' + error.message);
            }
        }
    };
    
    // データ更新
    window.refreshData = function() {
        console.log('🔄 データ更新');
        window.loadTanaoroshiData();
    };
    
    // 同期ダッシュボード（既存機能活用）
    if (typeof window.openSyncDashboard === 'undefined') {
        window.openSyncDashboard = function() {
            window.open(
                "modules/ebay_edit_test/ebay_sync_dashboard.html",
                "_blank",
                "width=1200,height=800,scrollbars=yes,resizable=yes"
            );
        };
    }
}

/**
 * 模擬棚卸データ生成
 */
function generateMockTanaoroshiData() {
    const mockItems = [];
    const categories = ['電子機器', '衣類', '書籍', '食品', '日用品'];
    const statuses = ['在庫あり', '在庫僅少', '欠品', '要発注'];
    
    for (let i = 1; i <= 50; i++) {
        mockItems.push({
            id: i,
            sku: `TANA-${String(i).padStart(4, '0')}`,
            name: `商品名 ${i}`,
            category: categories[Math.floor(Math.random() * categories.length)],
            current_stock: Math.floor(Math.random() * 100),
            minimum_stock: Math.floor(Math.random() * 20) + 5,
            price: (Math.random() * 5000 + 100).toFixed(2),
            last_updated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            location: `棚${Math.floor(Math.random() * 10) + 1}-${Math.floor(Math.random() * 5) + 1}`,
            supplier: `仕入先${Math.floor(Math.random() * 5) + 1}`,
            image: `https://placehold.co/150x150?text=商品${i}`
        });
    }
    
    return mockItems;
}

/**
 * 棚卸データをテンプレートでレンダリング
 */
async function renderTanaoroshiData(data) {
    if (typeof window.TemplateLoader !== 'undefined') {
        try {
            // データ表示エリアにテンプレートを適用
            await window.TemplateLoader.renderTo('data-display-area', 'inventory_table', {
                items: data,
                total_items: data.length,
                current_time: new Date().toLocaleString('ja-JP')
            });
            
            // 一括操作パネルも表示
            await window.TemplateLoader.renderTo('bulk-operations-panel', 'bulk_operations', {
                show_panel: data.length > 0
            });
            
            // 表示切り替えコントロール
            if (typeof window.EbayViewSwitcher !== 'undefined') {
                document.getElementById('view-switcher-container').innerHTML = 
                    '<div id="view-switcher-n3"></div>';
                window.EbayViewSwitcher.init();
            }
            
        } catch (error) {
            console.error('❌ テンプレートレンダリングエラー:', error);
            // フォールバック: 基本的なHTMLで表示
            renderBasicTable(data);
        }
    } else {
        // テンプレートローダーがない場合のフォールバック
        renderBasicTable(data);
    }
}

/**
 * 基本テーブル表示（フォールバック）
 */
function renderBasicTable(data) {
    const html = `
        <div class="diagnostic-card">
            <h3><i class="fas fa-table"></i> 棚卸データ一覧 (${data.length}件)</h3>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="master-checkbox" onchange="toggleAllCheckboxes()"></th>
                            <th>SKU</th>
                            <th>商品名</th>
                            <th>カテゴリ</th>
                            <th>在庫数</th>
                            <th>最小在庫</th>
                            <th>価格</th>
                            <th>ステータス</th>
                            <th>場所</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((item, index) => `
                            <tr data-index="${index}">
                                <td><input type="checkbox" class="item-checkbox" value="${index}" onchange="updateMasterCheckbox()"></td>
                                <td>${item.sku}</td>
                                <td>${item.name}</td>
                                <td>${item.category}</td>
                                <td>${item.current_stock}</td>
                                <td>${item.minimum_stock}</td>
                                <td>¥${item.price}</td>
                                <td><span class="status ${item.status === '欠品' ? 'status--error' : 'status--ok'}">${item.status}</span></td>
                                <td>${item.location}</td>
                                <td>
                                    <button onclick="showProductDetail(${index})" class="n3-btn n3-btn--small n3-btn--info">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('data-display-area').innerHTML = html;
}

/**
 * 統計情報更新
 */
function updateStatistics(data) {
    if (!data || data.length === 0) return;
    
    const stats = {
        total: data.length,
        in_stock: data.filter(item => item.status === '在庫あり').length,
        low_stock: data.filter(item => item.status === '在庫僅少').length,
        out_of_stock: data.filter(item => item.status === '欠品').length,
        total_value: data.reduce((sum, item) => sum + parseFloat(item.price || 0), 0)
    };
    
    // 在庫サマリー更新
    const inventorySummary = document.getElementById('inventory-summary');
    if (inventorySummary) {
        inventorySummary.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="summary-label">総商品数</span>
                    <span class="summary-value">${stats.total}件</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">在庫あり</span>
                    <span class="summary-value summary-value--success">${stats.in_stock}件</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">在庫僅少</span>
                    <span class="summary-value summary-value--warning">${stats.low_stock}件</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">欠品</span>
                    <span class="summary-value summary-value--error">${stats.out_of_stock}件</span>
                </div>
            </div>
        `;
    }
    
    // 統計情報サマリー更新
    const statisticsSummary = document.getElementById('statistics-summary');
    if (statisticsSummary) {
        statisticsSummary.innerHTML = `
            <div class="stats-display">
                <div class="stat-item">
                    <span class="stat-value">¥${stats.total_value.toLocaleString()}</span>
                    <span class="stat-label">総在庫価値</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${Math.round((stats.in_stock / stats.total) * 100)}%</span>
                    <span class="stat-label">在庫充足率</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${Math.round((stats.out_of_stock / stats.total) * 100)}%</span>
                    <span class="stat-label">欠品率</span>
                </div>
            </div>
        `;
    }
}

/**
 * ローディング表示（既存システム活用）
 */
function showLoading(message = 'データ読み込み中...') {
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    
    if (loading) {
        loading.style.display = 'block';
        const loadingText = loading.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
    
    if (content) {
        content.style.display = 'none';
    }
}

/**
 * ローディング非表示
 */
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

/**
 * コンテンツ表示
 */
function showContent() {
    const content = document.getElementById('content');
    if (content) {
        content.style.display = 'block';
    }
}

// 既存関数との互換性確保
if (typeof window.toggleAllCheckboxes === 'undefined') {
    window.toggleAllCheckboxes = function() {
        const masterCheckbox = document.getElementById("master-checkbox");
        const itemCheckboxes = document.querySelectorAll(".item-checkbox");
        
        if (masterCheckbox && itemCheckboxes) {
            itemCheckboxes.forEach(function(checkbox) {
                checkbox.checked = masterCheckbox.checked;
            });
        }
    };
}

if (typeof window.updateMasterCheckbox === 'undefined') {
    window.updateMasterCheckbox = function() {
        const masterCheckbox = document.getElementById("master-checkbox");
        const itemCheckboxes = document.querySelectorAll(".item-checkbox");
        const checkedItems = document.querySelectorAll(".item-checkbox:checked");
        
        if (masterCheckbox && itemCheckboxes) {
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
    };
}

if (typeof window.showProductDetail === 'undefined') {
    window.showProductDetail = function(index) {
        const product = window.currentProductData[index];
        if (!product) {
            if (typeof window.N3Modal !== 'undefined') {
                window.N3Modal.alert({
                    title: "エラー",
                    message: "商品データが見つかりません",
                    type: "error"
                });
            } else {
                alert('商品データが見つかりません');
            }
            return;
        }
        
        const detailHtml = `
            <div class="product-detail-container">
                <h3>${product.name}</h3>
                <div class="product-detail-grid">
                    <div class="detail-item">
                        <label>SKU:</label>
                        <span>${product.sku}</span>
                    </div>
                    <div class="detail-item">
                        <label>カテゴリ:</label>
                        <span>${product.category}</span>
                    </div>
                    <div class="detail-item">
                        <label>現在在庫:</label>
                        <span>${product.current_stock}個</span>
                    </div>
                    <div class="detail-item">
                        <label>最小在庫:</label>
                        <span>${product.minimum_stock}個</span>
                    </div>
                    <div class="detail-item">
                        <label>価格:</label>
                        <span>¥${product.price}</span>
                    </div>
                    <div class="detail-item">
                        <label>ステータス:</label>
                        <span class="status">${product.status}</span>
                    </div>
                    <div class="detail-item">
                        <label>保管場所:</label>
                        <span>${product.location}</span>
                    </div>
                    <div class="detail-item">
                        <label>仕入先:</label>
                        <span>${product.supplier}</span>
                    </div>
                    <div class="detail-item">
                        <label>最終更新:</label>
                        <span>${product.last_updated}</span>
                    </div>
                </div>
            </div>
        `;
        
        if (typeof window.N3Modal !== 'undefined') {
            window.N3Modal.setContent("product-detail-modal", {
                body: detailHtml
            });
            window.N3Modal.open("product-detail-modal");
        } else {
            // フォールバック: 新しいウィンドウで表示
            const newWindow = window.open('', '_blank', 'width=600,height=400');
            newWindow.document.write(`
                <html>
                <head><title>商品詳細 - ${product.name}</title></head>
                <body>${detailHtml}</body>
                </html>
            `);
        }
    };
}

console.log('📦 棚卸システムロジック 初期化完了');
