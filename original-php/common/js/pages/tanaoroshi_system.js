/**
 * NAGANO-3棚卸しシステム外部JavaScript
 * NAGANO-3 v2.0 Hooks完全準拠版
 * 
 * 【重要】このファイルは既存デザインを一切変更しません
 * - HTML構造: 完全保持
 * - CSS: 1文字も変更なし  
 * - 機能: 100%維持
 * - 外部化のみ実行
 */

console.log('🚀 NAGANO-3棚卸しシステム - Hooks準拠版読み込み開始');

// ===== グローバル変数（完全保持） =====
window.TanaoroshiSystem = {
    selectedProducts: [],
    exchangeRate: 150.25,
    currentView: 'grid',
    filters: {
        type: '',
        channel: '',
        stockStatus: '',
        priceRange: ''
    },
    searchQuery: ''
};

// ===== NAGANO-3 Hooks統合システム =====
const TanaoroshiHooks = {
    // Hook適用関数
    apply: function(hookName, data = {}) {
        try {
            // N3 Hooks利用可能時
            if (typeof N3 !== 'undefined' && N3.hooks && N3.hooks.apply) {
                return N3.hooks.apply(hookName, data);
            }
            
            // フォールバック: 直接実行
            return this.fallback(hookName, data);
        } catch (error) {
            console.warn(`Hook適用エラー: ${hookName}`, error);
            return this.fallback(hookName, data);
        }
    },
    
    // フォールバック実行
    fallback: function(hookName, data) {
        const handlers = {
            'tanaoroshi_init': () => ({ success: true, initialized: true }),
            'view_switch': (data) => this.handleViewSwitch(data),
            'filter_apply': (data) => this.handleFilterApply(data),
            'card_select': (data) => this.handleCardSelect(data),
            'search_execute': (data) => this.handleSearch(data)
        };
        
        if (handlers[hookName]) {
            return handlers[hookName](data);
        }
        
        return { success: false, error: `Unknown hook: ${hookName}` };
    },
    
    // ビュー切り替えハンドラー
    handleViewSwitch: function(data) {
        const { viewType } = data;
        const cardView = document.getElementById('card-view');
        const listView = document.getElementById('list-view');
        const cardBtn = document.getElementById('card-view-btn');
        const listBtn = document.getElementById('list-view-btn');
        
        if (!cardView || !listView || !cardBtn || !listBtn) {
            return { success: false, error: 'View elements not found' };
        }
        
        // ボタン状態更新（既存ロジック完全保持）
        cardBtn.classList.toggle('inventory__view-btn--active', viewType === 'grid');
        listBtn.classList.toggle('inventory__view-btn--active', viewType === 'list');
        
        // ビュー表示切り替え（既存ロジック完全保持）
        if (viewType === 'grid') {
            cardView.style.display = 'grid';
            listView.style.display = 'none';
        } else {
            cardView.style.display = 'none';
            listView.style.display = 'block';
        }
        
        window.TanaoroshiSystem.currentView = viewType;
        
        return { success: true, view: viewType };
    },
    
    // フィルター適用ハンドラー
    handleFilterApply: function(data) {
        console.log('🎯 Hook経由フィルター適用開始');
        
        // フィルター値取得（既存ロジック完全保持）
        const typeFilter = document.getElementById('filter-type')?.value || '';
        const channelFilter = document.getElementById('filter-channel')?.value || '';
        const stockFilter = document.getElementById('filter-stock-status')?.value || '';
        const priceFilter = document.getElementById('filter-price-range')?.value || '';
        
        // フィルター状態更新
        window.TanaoroshiSystem.filters = {
            type: typeFilter,
            channel: channelFilter,
            stockStatus: stockFilter,
            priceRange: priceFilter
        };
        
        // カードフィルタリング実行（既存ロジック完全保持）
        const cards = document.querySelectorAll('.inventory__card');
        let visibleCount = 0;
        
        cards.forEach(card => {
            let show = true;
            
            // 種類フィルター
            if (typeFilter) {
                const badges = card.querySelectorAll('.inventory__badge');
                const hasType = Array.from(badges).some(badge => 
                    badge.classList.contains(`inventory__badge--${typeFilter}`)
                );
                if (!hasType) show = false;
            }
            
            card.style.display = show ? 'flex' : 'none';
            if (show) visibleCount++;
        });
        
        console.log(`✅ Hook経由フィルター適用完了: ${visibleCount}件表示`);
        
        // 統計更新
        this.updateFilteredStats(visibleCount);
        
        return { success: true, visibleCount: visibleCount };
    },
    
    // カード選択ハンドラー
    handleCardSelect: function(data) {
        const { cardElement } = data;
        
        cardElement.classList.toggle('inventory__card--selected');
        
        const productId = cardElement.dataset.id;
        const selected = cardElement.classList.contains('inventory__card--selected');
        
        if (selected) {
            if (!window.TanaoroshiSystem.selectedProducts.includes(productId)) {
                window.TanaoroshiSystem.selectedProducts.push(productId);
            }
        } else {
            const index = window.TanaoroshiSystem.selectedProducts.indexOf(productId);
            if (index > -1) {
                window.TanaoroshiSystem.selectedProducts.splice(index, 1);
            }
        }
        
        console.log('Hook経由カード選択:', productId, selected);
        
        return { success: true, productId: productId, selected: selected };
    },
    
    // 検索ハンドラー
    handleSearch: function(data) {
        const { query } = data;
        const queryLower = query.toLowerCase();
        
        window.TanaoroshiSystem.searchQuery = queryLower;
        
        console.log('🔍 Hook経由検索実行:', queryLower);
        
        const cards = document.querySelectorAll('.inventory__card');
        cards.forEach(card => {
            const title = card.querySelector('.inventory__card-title')?.textContent.toLowerCase() || '';
            const sku = card.querySelector('.inventory__card-sku')?.textContent.toLowerCase() || '';
            
            const matches = title.includes(queryLower) || sku.includes(queryLower);
            card.style.display = matches ? 'flex' : 'none';
        });
        
        return { success: true, query: queryLower };
    },
    
    // 統計更新（ユーティリティ）
    updateFilteredStats: function(visibleCount) {
        const totalEl = document.getElementById('total-products');
        if (totalEl) {
            totalEl.textContent = visibleCount.toLocaleString();
        }
    }
};

// ===== 元の関数群（完全保持・Hook統合） =====

// フィルター機能（Hook経由）
function applyFilters() {
    return TanaoroshiHooks.apply('filter_apply', {});
}

function resetFilters() {
    console.log('🔄 フィルターリセット');
    
    // フィルター要素リセット（既存ロジック完全保持）
    const selects = document.querySelectorAll('.inventory__filter-select');
    selects.forEach(select => select.value = '');
    
    // 検索ボックスリセット
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    // 全カード表示
    const cards = document.querySelectorAll('.inventory__card');
    cards.forEach(card => card.style.display = 'flex');
    
    // フィルター状態リセット
    window.TanaoroshiSystem.filters = { type: '', channel: '', stockStatus: '', priceRange: '' };
    window.TanaoroshiSystem.searchQuery = '';
    
    console.log('✅ フィルターリセット完了');
}

// PostgreSQLデータ取得（完全保持）
async function loadPostgreSQLData() {
    console.log('📊 PostgreSQLデータ取得開始');
    
    try {
        // データベース状態更新
        updateDatabaseStatus('connecting', 'PostgreSQL接続中...');
        
        // N3 Ajax経由でデータ取得（既存ロジック完全保持）
        if (typeof window.executeAjax === 'function') {
            const result = await window.executeAjax('ebay_inventory_get_data', {
                limit: 50,
                with_images: true,
                source: 'postgresql'
            });
            
            if (result.success && result.data) {
                console.log('✅ PostgreSQLデータ取得成功:', result.data.length, '件');
                
                // カード更新
                updateProductCards(result.data);
                updateDatabaseStatus('connected', `PostgreSQL接続成功 - ${result.data.length}件取得`);
                
            } else {
                throw new Error(result.error || 'データ取得失敗');
            }
        } else {
            throw new Error('executeAjax関数が利用できません');
        }
        
    } catch (error) {
        console.error('❌ PostgreSQLデータ取得エラー:', error);
        updateDatabaseStatus('disconnected', 'PostgreSQL接続エラー: ' + error.message);
        
        // フォールバック: デモデータ維持
        console.log('📋 デモデータで継続');
    }
}

// eBay同期実行（完全保持）
async function syncEbayData() {
    console.log('🔄 eBay同期実行開始');
    
    try {
        updateDatabaseStatus('connecting', 'eBay API同期実行中...');
        
        // 実際のeBay同期処理（将来実装）
        await new Promise(resolve => setTimeout(resolve, 2000)); // デモ用待機
        
        // PostgreSQLデータ再取得
        await loadPostgreSQLData();
        
        console.log('✅ eBay同期完了');
        
    } catch (error) {
        console.error('❌ eBay同期エラー:', error);
        updateDatabaseStatus('disconnected', 'eBay同期エラー: ' + error.message);
    }
}

// ユーティリティ関数群（完全保持）
function updateDatabaseStatus(status, message) {
    const statusEl = document.getElementById('database-status');
    const textEl = document.getElementById('database-status-text');
    
    if (statusEl && textEl) {
        statusEl.className = `database-status database-status--${status}`;
        textEl.textContent = message;
    }
}

function updateFilteredStats(visibleCount) {
    const totalEl = document.getElementById('total-products');
    if (totalEl) {
        totalEl.textContent = visibleCount.toLocaleString();
    }
}

function updateProductCards(data) {
    // 将来実装: 実際のデータでカード更新
    console.log('🎨 商品カード更新:', data.length, '件');
}

// 検索機能（Hook統合）
function handleSearch(event) {
    const query = event.target.value;
    return TanaoroshiHooks.apply('search_execute', { query: query });
}

// ビュー切り替え（Hook統合）
function switchView(viewType) {
    console.log('🔄 Hook経由ビュー切り替え:', viewType);
    return TanaoroshiHooks.apply('view_switch', { viewType: viewType });
}

// ===== イベントリスナー設定（完全保持） =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM読み込み完了 - NAGANO-3 Hooks準拠版初期化開始');
    
    // システム初期化Hook
    TanaoroshiHooks.apply('tanaoroshi_init', {
        system: window.TanaoroshiSystem,
        mode: 'hooks_enabled'
    });
    
    // カードクリック選択機能（Hook統合）
    const cards = document.querySelectorAll('.inventory__card');
    cards.forEach(card => {
        card.addEventListener('click', function(event) {
            // 入力要素のクリックは除外（既存ロジック保持）
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON') {
                return;
            }
            
            // Hook経由でカード選択実行
            TanaoroshiHooks.apply('card_select', { cardElement: this });
        });
    });
    
    // 検索ボックス（Hook統合）
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // フィルター（Hook統合）
    const filterSelects = document.querySelectorAll('.inventory__filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', applyFilters);
    });
    
    // ビュー切り替えボタン（Hook統合）
    const cardViewBtn = document.getElementById('card-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    
    if (cardViewBtn) {
        cardViewBtn.addEventListener('click', () => switchView('grid'));
    }
    if (listViewBtn) {
        listViewBtn.addEventListener('click', () => switchView('list'));
    }
    
    // 初期状態設定（完全保持）
    updateDatabaseStatus('disconnected', 'PostgreSQL接続待機中...');
    
    console.log('✅ カード数:', cards.length, '枚');
    console.log('✅ グリッドレイアウト:', getComputedStyle(document.getElementById('card-view')).gridTemplateColumns);
    console.log('✅ NAGANO-3棚卸しシステム初期化完了');
    
    // 3秒後に自動でPostgreSQLデータ取得開始（完全保持）
    setTimeout(() => {
        console.log('🚀 自動PostgreSQLデータ取得開始');
        loadPostgreSQLData();
    }, 3000);
});

// ===== グローバル関数として公開（完全保持） =====
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.loadPostgreSQLData = loadPostgreSQLData;
window.syncEbayData = syncEbayData;
window.switchView = switchView;
window.TanaoroshiHooks = TanaoroshiHooks;

console.log('✅ NAGANO-3棚卸しシステム外部JavaScript読み込み完了');