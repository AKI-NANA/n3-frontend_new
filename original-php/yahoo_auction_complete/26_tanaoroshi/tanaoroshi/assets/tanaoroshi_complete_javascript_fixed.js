/**
 * 棚卸しシステム - 完全統合版JavaScript
 * Excelビュー データ駆動型描画対応
 * 開発指示書: Excelビューのデータ同期と動的生成
 */

// グローバル変数
let filteredData = []; // フィルター済みデータ（カードビューとExcelビュー共有）
let allInventoryData = []; // 全在庫データ
let selectedProducts = []; // 選択中の商品
let exchangeRate = 150.25; // USD/JPY レート

/**
 * 🎯 1. Excelテーブル行のHTMLテンプレート化
 * filteredDataを使って動的にHTML行を生成
 */
function renderExcelTable() {
    const tableBody = document.getElementById('products-table-body');
    if (!tableBody) {
        console.error('❌ products-table-body要素が見つかりません');
        return;
    }

    console.log('🔄 Excelテーブル描画開始:', filteredData.length, '件');

    // filteredData を使って動的にHTML行を生成
    const tableRows = filteredData.map(item => {
        return `
            <tr data-id="${item.id}">
                <td><input type="checkbox" class="excel-checkbox product-checkbox" data-id="${item.id}"></td>
                <td><img src="${item.imageUrl || item.image || 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=50&h=40&fit=crop'}" alt="商品画像" style="width: 40px; height: 32px; object-fit: cover; border-radius: 4px;" onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\\"fas fa-image\\" style=\\"color: var(--text-muted);\\"></i>'"></td>
                <td><input type="text" class="excel-cell" value="${item.title || item.name || ''}" /></td>
                <td><input type="text" class="excel-cell" value="${item.sku || ''}" /></td>
                <td>
                    <select class="excel-select">
                        <option value="stock" ${item.type === 'stock' ? 'selected' : ''}>有在庫</option>
                        <option value="dropship" ${item.type === 'dropship' ? 'selected' : ''}>無在庫</option>
                        <option value="set" ${item.type === 'set' ? 'selected' : ''}>セット品</option>
                        <option value="hybrid" ${item.type === 'hybrid' ? 'selected' : ''}>ハイブリッド</option>
                    </select>
                </td>
                <td>
                    <select class="excel-select">
                        <option value="new" ${item.condition === 'new' ? 'selected' : ''}>新品</option>
                        <option value="used" ${item.condition === 'used' ? 'selected' : ''}>中古</option>
                    </select>
                </td>
                <td><input type="number" class="excel-cell" value="${item.priceUSD || item.price || ''}" style="text-align: right;" step="0.01"></td>
                <td><input type="number" class="excel-cell" value="${item.stock || item.quantity || ''}" style="text-align: center;"></td>
                <td><input type="number" class="excel-cell" value="${item.costUSD || item.cost || ''}" style="text-align: right;" step="0.01"></td>
                <td style="text-align: center; font-weight: 600; color: var(--color-success);">${item.profitUSD !== undefined ? '$' + item.profitUSD.toFixed(2) : (item.priceUSD && item.costUSD ? '$' + (item.priceUSD - item.costUSD).toFixed(2) : '')}</td>
                <td>
                    <div style="display: flex; gap: 2px;">
                        ${(item.channels || []).map(channel => `<span style="padding: 1px 3px; background: #0064d2; color: white; border-radius: 2px; font-size: 0.6rem;">${channel}</span>`).join('')}
                    </div>
                </td>
                <td><input type="text" class="excel-cell" value="${item.category || ''}" /></td>
                <td>
                    <div style="display: flex; gap: 2px;">
                        <button class="excel-btn excel-btn--small" onclick="showProductDetail(${item.id})" title="詳細"><i class="fas fa-eye"></i></button>
                        <button class="excel-btn excel-btn--small" onclick="deleteProduct(${item.id})" title="削除" style="color: var(--color-danger);"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // tbodyの中身を新しい行に置き換える
    tableBody.innerHTML = tableRows;

    // テーブル情報更新
    updateTableInfo();

    // イベントリスナー再設定
    setupTableEventListeners();

    console.log('✅ Excelテーブル描画完了:', filteredData.length, '行生成');
}

/**
 * 🎯 2. データフローの確認と統一
 * フィルターや検索の後にExcelテーブルも更新
 */
function renderInventoryData() {
    console.log('🔄 統合描画開始 - カードビュー + Excelビュー同期');

    // カードビュー更新
    renderCardView();

    // Excelビュー更新
    renderExcelTable();

    // 統計情報更新
    updateStatistics(filteredData);

    console.log('✅ 統合描画完了 - 両ビューが同期されました');
}

/**
 * フィルター適用（統合版）
 */
function applyFilters() {
    console.log('🎯 フィルター適用開始');

    const filters = {
        type: document.getElementById('filter-type')?.value || '',
        channel: document.getElementById('filter-channel')?.value || '',
        stockStatus: document.getElementById('filter-stock-status')?.value || '',
        priceRange: document.getElementById('filter-price-range')?.value || ''
    };

    console.log('🔍 適用フィルター:', filters);

    // 全データからフィルター適用
    filteredData = allInventoryData.filter(item => {
        // 商品種類フィルター
        if (filters.type && item.type !== filters.type) {
            return false;
        }

        // 出品モールフィルター
        if (filters.channel && (!item.channels || !item.channels.includes(filters.channel))) {
            return false;
        }

        // 在庫状況フィルター
        if (filters.stockStatus) {
            const stock = parseInt(item.stock || item.quantity || 0);
            switch (filters.stockStatus) {
                case 'sufficient':
                    if (stock < 10) return false;
                    break;
                case 'warning':
                    if (stock < 5 || stock >= 10) return false;
                    break;
                case 'low':
                    if (stock < 1 || stock >= 5) return false;
                    break;
                case 'out':
                    if (stock > 0) return false;
                    break;
            }
        }

        // 価格範囲フィルター
        if (filters.priceRange) {
            const price = parseFloat(item.priceUSD || item.price || 0);
            switch (filters.priceRange) {
                case '0-25':
                    if (price < 0 || price > 25) return false;
                    break;
                case '25-50':
                    if (price < 25 || price > 50) return false;
                    break;
                case '50-100':
                    if (price < 50 || price > 100) return false;
                    break;
                case '100+':
                    if (price < 100) return false;
                    break;
            }
        }

        return true;
    });

    console.log(`📊 フィルター結果: ${allInventoryData.length}件 → ${filteredData.length}件`);

    // 統合描画実行
    renderInventoryData();
}

/**
 * 検索実行（統合版）
 */
function performSearch(searchQuery) {
    console.log('🔍 検索実行:', searchQuery);

    if (!searchQuery.trim()) {
        // 検索クエリが空の場合は全データを表示
        filteredData = [...allInventoryData];
    } else {
        const query = searchQuery.toLowerCase();
        filteredData = allInventoryData.filter(item => {
            const name = (item.title || item.name || '').toLowerCase();
            const sku = (item.sku || '').toLowerCase();
            const category = (item.category || '').toLowerCase();

            return name.includes(query) || sku.includes(query) || category.includes(query);
        });
    }

    console.log(`🔍 検索結果: ${allInventoryData.length}件 → ${filteredData.length}件`);

    // 統合描画実行
    renderInventoryData();
}

/**
 * カードビュー描画
 */
function renderCardView() {
    const cardContainer = document.getElementById('card-view');
    if (!cardContainer) return;

    console.log('🔄 カードビュー描画:', filteredData.length, '件');

    if (filteredData.length === 0) {
        cardContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary); grid-column: 1 / -1;">
                <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>フィルター条件に一致する商品がありません</p>
            </div>
        `;
        return;
    }

    cardContainer.innerHTML = filteredData.map(item => createProductCard(item)).join('');

    // カードイベントリスナー再設定
    setupCardEventListeners();
}

/**
 * 商品カード作成
 */
function createProductCard(product) {
    const badgeClass = `inventory__badge--${product.type}`;
    const badgeText = {
        'stock': '有在庫',
        'dropship': '無在庫',
        'set': 'セット品',
        'hybrid': 'ハイブリッド'
    }[product.type] || '不明';

    const channelBadges = (product.channels || []).map(channel => {
        const channelConfig = {
            'ebay': { class: 'ebay', text: 'E' },
            'shopify': { class: 'shopify', text: 'S' },
            'mercari': { class: 'mercari', text: 'M' }
        };
        const config = channelConfig[channel] || { class: 'unknown', text: '?' };
        return `<span class="inventory__channel-badge inventory__channel-badge--${config.class}">${config.text}</span>`;
    }).join('');

    const priceUSD = parseFloat(product.priceUSD || product.price || 0);
    const priceJPY = Math.round(priceUSD * exchangeRate);

    return `
        <div class="inventory__card" data-id="${product.id}">
            <div class="inventory__card-image">
                <img src="${product.imageUrl || product.image || 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=300&h=200&fit=crop'}" alt="${product.title || product.name}" class="inventory__card-img" onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=\\"display: flex; align-items: center; justify-content: center; height: 100%; background: var(--bg-tertiary); color: var(--text-muted);\\"><i class=\\"fas fa-image\\" style=\\"font-size: 1.8rem;\\"></i></div>'">
                <div class="inventory__card-badges">
                    <span class="inventory__badge ${badgeClass}">${badgeText}</span>
                    <div class="inventory__channel-badges">
                        ${channelBadges}
                    </div>
                </div>
            </div>
            <div class="inventory__card-info">
                <h3 class="inventory__card-title" title="${product.title || product.name}">${product.title || product.name}</h3>
                <div class="inventory__card-price">
                    <div class="inventory__card-price-main">$${priceUSD.toFixed(2)}</div>
                    <div class="inventory__card-price-sub">¥${priceJPY.toLocaleString()}</div>
                </div>
                <div class="inventory__card-footer">
                    <span class="inventory__card-sku" title="${product.sku}">${product.sku}</span>
                    <span style="color: var(--color-success); font-size: 0.55rem;">在庫:${product.stock || product.quantity || 0}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * テーブル情報更新
 */
function updateTableInfo() {
    const tableInfo = document.getElementById('table-info');
    if (tableInfo) {
        const totalItems = allInventoryData.length;
        const filteredItems = filteredData.length;
        
        if (filteredItems === totalItems) {
            tableInfo.textContent = `商品: 1-${filteredItems} / ${totalItems}件表示`;
        } else {
            tableInfo.textContent = `商品: 1-${filteredItems} / ${totalItems}件中 ${filteredItems}件を表示（フィルター適用中）`;
        }
    }
}

/**
 * 統計情報更新
 */
function updateStatistics(data) {
    const stats = {
        total: data.length,
        stock: data.filter(p => p.type === 'stock').length,
        dropship: data.filter(p => p.type === 'dropship').length,
        set: data.filter(p => p.type === 'set').length,
        hybrid: data.filter(p => p.type === 'hybrid').length,
        totalValue: data.reduce((sum, p) => sum + parseFloat(p.priceUSD || p.price || 0), 0)
    };

    const elements = {
        'total-products': stats.total.toLocaleString(),
        'stock-products': stats.stock.toLocaleString(),
        'dropship-products': stats.dropship.toLocaleString(),
        'set-products': stats.set.toLocaleString(),
        'hybrid-products': stats.hybrid.toLocaleString(),
        'total-value': `$${(stats.totalValue / 1000).toFixed(1)}K`
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });

    console.log('📊 統計情報更新:', stats);
}

/**
 * イベントリスナー設定
 */
function setupTableEventListeners() {
    // チェックボックスイベント
    const checkboxes = document.querySelectorAll('.product-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const productId = parseInt(this.dataset.id);
            toggleProductSelection(productId, this.checked);
        });
    });

    // 全選択チェックボックス
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                const productId = parseInt(cb.dataset.id);
                toggleProductSelection(productId, this.checked);
            });
        });
    }

    // 在庫数変更イベント
    const stockInputs = document.querySelectorAll('input[type="number"]');
    stockInputs.forEach(input => {
        input.addEventListener('change', function() {
            const row = this.closest('tr');
            if (row) {
                const productId = parseInt(row.dataset.id);
                updateProductStock(productId, this.value);
            }
        });
    });
}

function setupCardEventListeners() {
    const cards = document.querySelectorAll('.inventory__card');
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            selectCard(this);
        });
    });
}

/**
 * 商品選択状態管理
 */
function toggleProductSelection(productId, selected) {
    if (selected) {
        if (!selectedProducts.includes(productId)) {
            selectedProducts.push(productId);
        }
    } else {
        selectedProducts = selectedProducts.filter(id => id !== productId);
    }

    // 対応するカードの選択状態も同期
    const card = document.querySelector(`#card-view .inventory__card[data-id="${productId}"]`);
    if (card) {
        if (selected) {
            card.classList.add('inventory__card--selected');
        } else {
            card.classList.remove('inventory__card--selected');
        }
    }

    updateSelectionUI();
    console.log('📋 選択中の商品:', selectedProducts);
}

function selectCard(card) {
    const productId = parseInt(card.dataset.id);
    card.classList.toggle('inventory__card--selected');

    const isSelected = card.classList.contains('inventory__card--selected');
    
    if (isSelected) {
        if (!selectedProducts.includes(productId)) {
            selectedProducts.push(productId);
        }
    } else {
        selectedProducts = selectedProducts.filter(id => id !== productId);
    }

    // 対応するテーブル行のチェックボックスも同期
    const checkbox = document.querySelector(`#list-view .product-checkbox[data-id="${productId}"]`);
    if (checkbox) {
        checkbox.checked = isSelected;
    }

    updateSelectionUI();
}

/**
 * 選択UI更新
 */
function updateSelectionUI() {
    const createSetBtn = document.getElementById('create-set-btn');
    const setBtnText = document.getElementById('set-btn-text');
    
    if (createSetBtn && setBtnText) {
        if (selectedProducts.length >= 2) {
            createSetBtn.disabled = false;
            setBtnText.textContent = `セット品作成 (${selectedProducts.length}点選択)`;
            createSetBtn.classList.add('btn--warning');
            createSetBtn.classList.remove('btn--secondary');
        } else {
            createSetBtn.disabled = false; // 新規作成は常に可能
            setBtnText.textContent = '新規セット品作成';
            createSetBtn.classList.remove('btn--warning');
            createSetBtn.classList.add('btn--secondary');
        }
    }
}

/**
 * 在庫数更新
 */
function updateProductStock(productId, newStock) {
    console.log(`📦 在庫更新: 商品ID ${productId}, 新在庫数: ${newStock}`);
    
    // データ配列内の値も更新
    const productIndex = filteredData.findIndex(p => p.id === productId);
    if (productIndex !== -1) {
        filteredData[productIndex].stock = parseInt(newStock);
        filteredData[productIndex].quantity = parseInt(newStock);
    }

    const allDataIndex = allInventoryData.findIndex(p => p.id === productId);
    if (allDataIndex !== -1) {
        allInventoryData[allDataIndex].stock = parseInt(newStock);
        allInventoryData[allDataIndex].quantity = parseInt(newStock);
    }

    // カードビューの在庫表示も更新
    const card = document.querySelector(`#card-view .inventory__card[data-id="${productId}"]`);
    if (card) {
        const stockElement = card.querySelector('.inventory__card-footer span:last-child');
        if (stockElement) {
            stockElement.textContent = `在庫:${newStock}`;
        }
    }

    console.log('✅ 在庫データ同期完了');
}

/**
 * ビュー切り替え（データ同期強化版）
 */
function switchView(view) {
    console.log(`🔄 ビュー切り替え: ${view}`);
    
    const cardView = document.getElementById('card-view');
    const listView = document.getElementById('list-view');
    const cardViewBtn = document.getElementById('card-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    
    if (!cardView || !listView || !cardViewBtn || !listViewBtn) {
        console.error('ビュー要素が見つかりません');
        return;
    }
    
    cardViewBtn.classList.remove('inventory__view-btn--active');
    listViewBtn.classList.remove('inventory__view-btn--active');
    
    if (view === 'grid') {
        cardView.style.display = 'grid';
        listView.style.display = 'none';
        cardViewBtn.classList.add('inventory__view-btn--active');
        
        // カードビューに切り替え時にデータ同期
        renderCardView();
        console.log('✅ カードビューに切り替え完了（データ同期済み）');
    } else {
        cardView.style.display = 'none';
        listView.style.display = 'block';
        listViewBtn.classList.add('inventory__view-btn--active');
        
        // Excelビューに切り替え時にデータ同期
        renderExcelTable();
        console.log('✅ Excelビューに切り替え完了（データ同期済み）');
    }
}

/**
 * データ初期化（サンプルデータ含む）
 */
function initializeInventoryData(data = null) {
    console.log('🚀 在庫データ初期化開始');
    
    // データが提供されていない場合はサンプルデータを使用
    if (!data || data.length === 0) {
        data = generateSampleData();
        console.log('📋 サンプルデータを使用します:', data.length, '件');
    }
    
    allInventoryData = data;
    filteredData = [...data]; // 初期状態では全データを表示

    // 初回描画
    renderInventoryData();
    
    console.log('✅ データ初期化完了:', allInventoryData.length, '件');
}

/**
 * サンプルデータ生成
 */
function generateSampleData() {
    return [
        {
            id: 1,
            title: "Wireless Gaming Mouse RGB LED 7 Buttons",
            sku: "MS-WR70-001",
            type: "stock",
            condition: "new",
            priceUSD: 21.84,
            costUSD: 12.33,
            stock: 48,
            category: "Electronics",
            channels: ["ebay", "shopify"],
            imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=200&fit=crop"
        },
        {
            id: 2,
            title: "Gaming PC Accessories Bundle (3 Items)",
            sku: "SET-PC01-003",
            type: "set",
            condition: "new",
            priceUSD: 59.26,
            costUSD: 37.96,
            stock: 15,
            category: "Bundle",
            channels: ["ebay"],
            imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&h=200&fit=crop"
        },
        {
            id: 3,
            title: "Mechanical Keyboard RGB Backlit",
            sku: "KB-MR88-002",
            type: "dropship",
            condition: "new",
            priceUSD: 52.24,
            costUSD: 34.67,
            stock: 0,
            category: "Electronics",
            channels: ["mercari"],
            imageUrl: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=300&h=200&fit=crop"
        },
        {
            id: 4,
            title: "Gaming Headset with Microphone",
            sku: "HS-GM55-004",
            type: "hybrid",
            condition: "new",
            priceUSD: 35.20,
            costUSD: 22.62,
            stock: 3,
            category: "Electronics",
            channels: ["ebay", "shopify", "mercari"],
            imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300&h=200&fit=crop"
        },
        {
            id: 5,
            title: "iPhone 15 Pro Max - Premium Case",
            sku: "CASE-IP15-001",
            type: "stock",
            condition: "new",
            priceUSD: 28.99,
            costUSD: 15.45,
            stock: 120,
            category: "Accessories",
            channels: ["ebay", "shopify"],
            imageUrl: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=200&fit=crop"
        },
        {
            id: 6,
            title: "Smart Watch Fitness Tracker",
            sku: "SW-FIT-002",
            type: "hybrid",
            condition: "new",
            priceUSD: 67.80,
            costUSD: 42.15,
            stock: 8,
            category: "Wearables",
            channels: ["ebay", "mercari"],
            imageUrl: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=300&h=200&fit=crop"
        }
    ];
}

/**
 * イベントハンドラー
 */
function handleSearch(event) {
    const searchQuery = event.target.value;
    performSearch(searchQuery);
}

function resetFilters() {
    console.log('🔄 フィルターリセット');
    
    // フィルター選択をリセット
    const filterSelects = document.querySelectorAll('.inventory__filter-select');
    filterSelects.forEach(select => select.value = '');
    
    // 検索もリセット
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    // 全データを表示
    filteredData = [...allInventoryData];
    renderInventoryData();
    
    console.log('✅ フィルターリセット完了');
}

// その他の既存関数（セット品作成、商品詳細表示など）
function handleSetCreation() {
    if (selectedProducts.length >= 2) {
        console.log('🎯 選択商品からセット品作成:', selectedProducts);
        alert(`${selectedProducts.length}点の商品でセット品を作成します。`);
    } else {
        console.log('🎯 新規セット品作成');
        alert('新規セット品作成機能は開発中です。');
    }
}

function showProductDetail(productId) {
    console.log('👁️ 商品詳細表示:', productId);
    const product = filteredData.find(p => p.id === productId);
    if (product) {
        alert(`商品詳細:\n名前: ${product.title}\nSKU: ${product.sku}\n価格: $${product.priceUSD}\n在庫: ${product.stock}`);
    }
}

function deleteProduct(productId) {
    if (confirm('この商品を削除しますか？')) {
        console.log('🗑️ 商品削除:', productId);
        
        // データから削除
        allInventoryData = allInventoryData.filter(p => p.id !== productId);
        filteredData = filteredData.filter(p => p.id !== productId);
        
        // 再描画
        renderInventoryData();
        
        console.log('✅ 商品削除完了');
    }
}

function exportData() {
    console.log('📥 データエクスポート');
    alert('エクスポート機能は開発中です。');
}

// イベントリスナー設定（DOMContentLoaded）
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 棚卸しシステム初期化開始（完全統合版）');
    
    // ビュー切り替えボタン
    const cardViewBtn = document.getElementById('card-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    
    if (cardViewBtn) cardViewBtn.addEventListener('click', () => switchView('grid'));
    if (listViewBtn) listViewBtn.addEventListener('click', () => switchView('list'));
    
    // セット品作成ボタン
    const createSetBtn = document.getElementById('create-set-btn');
    if (createSetBtn) createSetBtn.addEventListener('click', handleSetCreation);
    
    // 検索
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', handleSearch);
    
    // フィルター
    const filterSelects = document.querySelectorAll('.inventory__filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', applyFilters);
    });
    
    // データ初期化
    initializeInventoryData();
    
    console.log('✅ 棚卸しシステム初期化完了（Excelビュー データ駆動型対応）');
});

// グローバル関数として公開
if (typeof window !== 'undefined') {
    window.renderExcelTable = renderExcelTable;
    window.renderInventoryData = renderInventoryData;
    window.applyFilters = applyFilters;
    window.resetFilters = resetFilters;
    window.handleSearch = handleSearch;
    window.switchView = switchView;
    window.initializeInventoryData = initializeInventoryData;
    window.showProductDetail = showProductDetail;
    window.deleteProduct = deleteProduct;
    window.exportData = exportData;
    window.handleSetCreation = handleSetCreation;
}
