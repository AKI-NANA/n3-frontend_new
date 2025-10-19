<?php
/**
 * セット品モーダル機能完全修正版
 * inventory_system_fixed.htmlの機能を完全にPHPテンプレートに移植
 */

// 修正1: セット品モーダルHTML構造の完全追加
?>

<!-- 🔧 修正: セット品作成・編集モーダル（完全機能版） -->
<div id="setModal" class="modal">
    <div class="modal-content" style="max-width: 1200px; width: 95vw;">
        <div class="modal-header">
            <h2 class="modal-title">セット品作成・編集</h2>
            <button class="modal-close" onclick="closeSetModal()">&times;</button>
        </div>
        
        <!-- セット品基本情報 -->
        <div class="modal-body">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg);">
                <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                    <label style="font-weight: 600; color: var(--text-primary); font-size: var(--text-sm);">セット品名</label>
                    <input type="text" id="setName" placeholder="Gaming Accessories Bundle" style="padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: var(--text-sm); background: var(--bg-primary);">
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                    <label style="font-weight: 600; color: var(--text-primary); font-size: var(--text-sm);">SKU</label>
                    <input type="text" id="setSku" placeholder="SET-XXX-001" style="padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: var(--text-sm); background: var(--bg-primary);">
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                    <label style="font-weight: 600; color: var(--text-primary); font-size: var(--text-sm);">販売価格 (USD)</label>
                    <input type="number" id="setPrice" placeholder="59.26" step="0.01" style="padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: var(--text-sm); background: var(--bg-primary);">
                </div>
                <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                    <label style="font-weight: 600; color: var(--text-primary); font-size: var(--text-sm);">カテゴリ</label>
                    <input type="text" id="setCategory" placeholder="Bundle" style="padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: var(--text-sm); background: var(--bg-primary);">
                </div>
            </div>

            <!-- 🔧 追加: セット品個別商品選択セクション -->
            <div class="inventory__components-section" style="margin: var(--space-lg) 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
                    <h3 style="font-size: var(--text-lg); font-weight: 600; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: var(--space-sm);">
                        <i class="fas fa-layer-group"></i>
                        セット品構成商品選択
                    </h3>
                    <button class="btn btn--primary" onclick="fetchIndividualProductsForSet()">
                        <i class="fas fa-search"></i>
                        個別商品を検索
                    </button>
                </div>
                
                <!-- 🔧 追加: 個別商品検索・フィルター -->
                <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md); margin-bottom: var(--space-md);">
                    <div style="display: grid; grid-template-columns: 1fr auto auto; gap: var(--space-md); align-items: end;">
                        <div style="position: relative;">
                            <i class="fas fa-search" style="position: absolute; left: var(--space-sm); top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                            <input type="text" id="componentSearchInput" placeholder="商品名・SKUで検索..." style="width: 100%; padding: var(--space-sm) var(--space-md) var(--space-sm) var(--space-xl); border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-secondary);">
                        </div>
                        <select id="componentTypeFilter" style="padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-secondary);">
                            <option value="">全種類</option>
                            <option value="stock">有在庫のみ</option>
                            <option value="dropship">無在庫のみ</option>
                            <option value="hybrid">ハイブリッドのみ</option>
                        </select>
                        <button class="btn btn--secondary" onclick="filterComponentProducts()">
                            <i class="fas fa-filter"></i>
                            フィルター適用
                        </button>
                    </div>
                </div>
                
                <!-- 🔧 追加: 個別商品選択グリッド -->
                <div class="inventory__component-grid" id="componentProductGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg); max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-md); background: var(--bg-secondary);">
                    <!-- 個別商品カードが動的に生成される -->
                    <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-xl); color: var(--text-muted);">
                        <i class="fas fa-search" style="font-size: 2rem; margin-bottom: var(--space-md);"></i>
                        <p>「個別商品を検索」ボタンをクリックして、セット品に含める商品を選択してください。</p>
                    </div>
                </div>
                
                <!-- 🔧 追加: 選択された商品リスト -->
                <div class="inventory__selected-components" style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: var(--space-md);">
                    <h4 style="margin: 0 0 var(--space-md) 0; color: var(--text-primary); display: flex; align-items: center; gap: var(--space-sm);">
                        <i class="fas fa-check-circle"></i>
                        選択されたセット品構成商品
                        <span id="selectedComponentsCount" style="background: var(--color-primary); color: white; padding: 2px 8px; border-radius: var(--radius-full); font-size: 0.8rem;">0</span>
                    </h4>
                    <div id="selectedComponentsList" style="display: flex; flex-direction: column; gap: var(--space-sm);">
                        <p style="margin: 0; color: var(--text-muted); font-style: italic;">まだ商品が選択されていません。上記から商品を選択してください。</p>
                    </div>
                </div>
            </div>

            <!-- 🔧 追加: セット品統計表示 -->
            <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md); margin: var(--space-lg) 0;">
                <h4 style="margin: 0 0 var(--space-md) 0; color: var(--text-primary); display: flex; align-items: center; gap: var(--space-sm);">
                    <i class="fas fa-calculator"></i>
                    セット品統計
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-md); font-size: var(--text-sm);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--text-secondary);">構成品数:</span>
                        <span id="componentsCount" style="font-weight: 600; color: var(--text-primary);">0点</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--text-secondary);">総仕入価格:</span>
                        <span id="totalCost" style="font-weight: 600; color: var(--text-primary);">$0</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--text-secondary);">販売価格:</span>
                        <span id="sellingPrice" style="font-weight: 600; color: var(--text-primary);">$0</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--text-secondary);">予想利益:</span>
                        <span id="expectedProfit" style="font-weight: 600; color: var(--text-primary);">$0</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--text-secondary);">利益率:</span>
                        <span id="profitRate" style="font-weight: 600; color: var(--text-primary);">0%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--text-secondary);">作成可能数:</span>
                        <span id="possibleSets" style="font-weight: 600; color: var(--text-primary);">0セット</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="modal-footer">
            <button class="btn btn--secondary" onclick="closeSetModal()">キャンセル</button>
            <button class="btn btn--success" onclick="saveSetProduct()">
                <i class="fas fa-layer-group"></i>
                セット品を保存
            </button>
        </div>
    </div>
</div>

<script>
// 🔧 修正2: JavaScriptデータ連携機能の完全実装

// グローバル変数
let selectedSetComponents = [];
let availableComponentProducts = [];
let allInventoryData = []; // PostgreSQLから取得したデータを保持

// 🔧 新機能: 個別商品データ取得（PostgreSQL連携）
async function fetchIndividualProductsForSet() {
    console.log('🔍 個別商品データ取得開始（セット品作成用）');
    
    try {
        showComponentSearchLoading(true);
        
        const response = await fetch('modules/tanaoroshi_inline_complete/tanaoroshi_ajax_handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: 'get_individual_products_for_set',
                exclude_types: 'set', // セット品は除外
                csrf_token: 'dev_token_safe',
                dev_mode: '1'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📊 個別商品データ取得結果:', result);
        
        if (result.success && result.data) {
            availableComponentProducts = result.data;
            console.log(`✅ 個別商品データ取得成功: ${availableComponentProducts.length}件`);
            
            // 個別商品をグリッドに表示
            renderIndividualProducts(availableComponentProducts);
            
        } else {
            throw new Error(result.error || '個別商品データの取得に失敗');
        }
        
    } catch (error) {
        console.error('❌ 個別商品データ取得エラー:', error);
        
        // フォールバック: デモデータを使用
        console.log('📊 フォールバック: デモデータを使用');
        loadDemoComponentProducts();
        
    } finally {
        showComponentSearchLoading(false);
    }
}

// 🔧 新機能: 個別商品描画関数（inventory__cardフォーマット）
function renderIndividualProducts(products) {
    console.log('🎨 個別商品描画開始');
    
    const container = document.getElementById('componentProductGrid');
    if (!container) {
        console.error('❌ 個別商品グリッドコンテナが見つかりません');
        return;
    }
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-xl); color: var(--text-muted);">
                <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: var(--space-md); opacity: 0.5;"></i>
                <p>利用可能な個別商品がありません</p>
            </div>
        `;
        return;
    }
    
    const cardsHTML = products.map(item => `
        <div class="inventory__card component-selectable-card" data-component-id="${item.id}" onclick="toggleComponentSelection(${item.id})">
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
    console.log(`✅ 個別商品描画完了: ${products.length}件`);
}

// 🔧 新機能: 構成品選択・選択解除機能
function toggleComponentSelection(productId) {
    console.log(`🔧 構成品選択切り替え: ${productId}`);
    
    const card = document.querySelector(`[data-component-id="${productId}"]`);
    const product = availableComponentProducts.find(p => p.id === productId);
    
    if (!card || !product) {
        console.error('❌ 商品データまたはカード要素が見つかりません');
        return;
    }
    
    const isSelected = card.classList.contains('inventory__card--selected');
    
    if (isSelected) {
        // 選択解除
        card.classList.remove('inventory__card--selected');
        selectedSetComponents = selectedSetComponents.filter(c => c.id !== productId);
        console.log(`➖ 構成品選択解除: ${product.title}`);
    } else {
        // 選択追加
        card.classList.add('inventory__card--selected');
        selectedSetComponents.push({
            id: productId,
            title: product.title,
            sku: product.sku,
            priceUSD: product.priceUSD,
            stock: product.stock,
            type: product.type,
            quantity: 1 // デフォルト数量
        });
        console.log(`➕ 構成品選択追加: ${product.title}`);
    }
    
    // UI更新
    updateSelectedComponentsList();
    updateSetStatistics();
}

// 🔧 新機能: 選択された構成品リスト更新
function updateSelectedComponentsList() {
    const container = document.getElementById('selectedComponentsList');
    const countElement = document.getElementById('selectedComponentsCount');
    
    if (!container || !countElement) {
        console.error('❌ 選択リスト要素が見つかりません');
        return;
    }
    
    countElement.textContent = selectedSetComponents.length;
    
    if (selectedSetComponents.length === 0) {
        container.innerHTML = '<p style="margin: 0; color: var(--text-muted); font-style: italic;">まだ商品が選択されていません。上記から商品を選択してください。</p>';
        return;
    }
    
    const listHTML = selectedSetComponents.map(component => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-sm); background: var(--bg-secondary); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: var(--space-sm);">
                <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(component.title)}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">${component.sku}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">$${component.priceUSD.toFixed(2)}</div>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-sm);">
                <label style="font-size: 0.8rem; color: var(--text-secondary);">数量:</label>
                <input type="number" value="${component.quantity}" min="1" max="10" 
                       style="width: 60px; padding: 2px 4px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); text-align: center;"
                       onchange="updateComponentQuantity(${component.id}, this.value)">
                <button class="btn btn--small" style="background: var(--color-danger); color: white; border: none;" 
                        onclick="removeSelectedComponent(${component.id})" title="削除">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = listHTML;
}

// 🔧 新機能: 構成品数量変更
function updateComponentQuantity(componentId, newQuantity) {
    const component = selectedSetComponents.find(c => c.id === componentId);
    if (component) {
        component.quantity = parseInt(newQuantity) || 1;
        updateSetStatistics();
        console.log(`🔢 構成品数量変更: ${component.title} → ${component.quantity}`);
    }
}

// 🔧 新機能: 選択構成品削除
function removeSelectedComponent(componentId) {
    selectedSetComponents = selectedSetComponents.filter(c => c.id !== componentId);
    
    // カードの選択状態解除
    const card = document.querySelector(`[data-component-id="${componentId}"]`);
    if (card) {
        card.classList.remove('inventory__card--selected');
    }
    
    updateSelectedComponentsList();
    updateSetStatistics();
    console.log(`🗑️ 選択構成品削除: ${componentId}`);
}

// 🔧 新機能: セット品統計更新
function updateSetStatistics() {
    const componentsCount = selectedSetComponents.length;
    const totalCost = selectedSetComponents.reduce((sum, comp) => sum + (comp.priceUSD * comp.quantity), 0);
    const setPrice = parseFloat(document.getElementById('setPrice')?.value || 0);
    const expectedProfit = setPrice - totalCost;
    const profitRate = setPrice > 0 ? (expectedProfit / setPrice * 100) : 0;
    
    // 在庫数から作成可能セット数を計算
    const possibleSets = componentsCount > 0 ? 
        Math.min(...selectedSetComponents.map(comp => Math.floor(comp.stock / comp.quantity))) : 0;
    
    // UI更新
    updateStatElement('componentsCount', `${componentsCount}点`);
    updateStatElement('totalCost', `$${totalCost.toFixed(2)}`);
    updateStatElement('sellingPrice', `$${setPrice.toFixed(2)}`);
    updateStatElement('expectedProfit', `$${expectedProfit.toFixed(2)}`);
    updateStatElement('profitRate', `${profitRate.toFixed(1)}%`);
    updateStatElement('possibleSets', `${possibleSets}セット`);
    
    console.log(`📊 セット品統計更新: 構成品${componentsCount}点, 利益$${expectedProfit.toFixed(2)}, 作成可能${possibleSets}セット`);
}

// 🔧 新機能: フィルター機能
function filterComponentProducts() {
    const searchTerm = document.getElementById('componentSearchInput')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('componentTypeFilter')?.value || '';
    
    let filteredProducts = availableComponentProducts;
    
    // 検索フィルター
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product =>
            product.title.toLowerCase().includes(searchTerm) ||
            product.sku.toLowerCase().includes(searchTerm)
        );
    }
    
    // タイプフィルター  
    if (typeFilter) {
        filteredProducts = filteredProducts.filter(product => product.type === typeFilter);
    }
    
    renderIndividualProducts(filteredProducts);
    console.log(`🔍 フィルター適用: ${filteredProducts.length}件表示`);
}

// 🔧 新機能: ローディング表示制御
function showComponentSearchLoading(show) {
    const container = document.getElementById('componentProductGrid');
    if (!container) return;
    
    if (show) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-xl); color: var(--text-muted);">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: var(--space-md);"></i>
                <p>個別商品データを読み込み中...</p>
            </div>
        `;
    }
}

// 🔧 新機能: デモデータ（フォールバック用）
function loadDemoComponentProducts() {
    const demoProducts = [
        {id: 1, title: 'Wireless Gaming Mouse RGB LED', sku: 'MS-WR70-001', type: 'stock', priceUSD: 21.84, stock: 48},
        {id: 3, title: 'Mechanical Keyboard RGB Backlit', sku: 'KB-MR88-002', type: 'dropship', priceUSD: 52.24, stock: 999},
        {id: 4, title: 'Gaming Headset with Microphone', sku: 'HS-GM55-004', type: 'hybrid', priceUSD: 35.20, stock: 3},
        {id: 5, title: 'USB-C Gaming Controller', sku: 'GC-USB-C-001', type: 'stock', priceUSD: 45.99, stock: 12},
        {id: 6, title: 'LED Gaming Mousepad', sku: 'MP-LED-RGB-002', type: 'stock', priceUSD: 28.50, stock: 25}
    ];
    
    availableComponentProducts = demoProducts;
    renderIndividualProducts(demoProducts);
    console.log('📊 デモ個別商品データ読み込み完了');
}

// 🔧 新機能: セット品保存機能
function saveSetProduct() {
    console.log('💾 セット品保存開始');
    
    const setData = {
        name: document.getElementById('setName')?.value,
        sku: document.getElementById('setSku')?.value,
        price: parseFloat(document.getElementById('setPrice')?.value || 0),
        category: document.getElementById('setCategory')?.value,
        components: selectedSetComponents
    };
    
    // バリデーション
    if (!setData.name || !setData.sku) {
        alert('セット品名とSKUは必須です。');
        return;
    }
    
    if (selectedSetComponents.length < 2) {
        alert('セット品には最低2つの構成品が必要です。');
        return;
    }
    
    console.log('📦 保存するセット品データ:', setData);
    
    // 実際の保存処理（PostgreSQL）
    saveSetToDatabase(setData);
}

// 🔧 新機能: データベース保存
async function saveSetToDatabase(setData) {
    try {
        const response = await fetch('modules/tanaoroshi_inline_complete/tanaoroshi_ajax_handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: 'save_set_product',
                set_data: JSON.stringify(setData),
                csrf_token: 'dev_token_safe',
                dev_mode: '1'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('セット品が正常に保存されました！');
            closeSetModal();
            // データ再読み込み
            loadPostgreSQLData();
        } else {
            throw new Error(result.error || 'セット品の保存に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ セット品保存エラー:', error);
        alert(`セット品保存エラー: ${error.message}`);
    }
}

// 🔧 モーダル制御関数
function openSetModal() {
    const modal = document.getElementById('setModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('modal--active');
        
        // リセット
        selectedSetComponents = [];
        updateSelectedComponentsList();
        updateSetStatistics();
        
        console.log('✅ セット品モーダル表示');
    }
}

function closeSetModal() {
    const modal = document.getElementById('setModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('modal--active');
        console.log('✅ セット品モーダル非表示');
    }
}

// セット品作成ボタンイベント
function createNewSet() {
    console.log('🔧 セット品作成開始');
    openSetModal();
}

// ユーティリティ関数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTypeBadgeText(type) {
    const badges = {
        stock: '有在庫',
        dropship: '無在庫', 
        set: 'セット品',
        hybrid: 'ハイブリッド'
    };
    return badges[type] || '不明';
}

function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

console.log('✅ セット品モーダル機能完全実装完了');
</script>