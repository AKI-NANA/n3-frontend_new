/* 棚卸しシステム - PostgreSQL eBay API統合JavaScript（続き） */

        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(140px, 1fr))';
    }
}

// イベントリスナー設定
function setupEventListeners() {
    // 検索フィールド
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 300));
    }
    
    // フィルター選択
    const filterType = document.getElementById('filter-type');
    if (filterType) {
        filterType.addEventListener('change', applyFilters);
    }
    
    // ウィンドウリサイズ
    window.addEventListener('resize', debounce(adjustGridLayout, 200));
}

// Debounce関数（検索の最適化）
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 棚卸しシステム（PostgreSQL eBay API統合版）初期化開始');
    
    // イベントリスナー設定
    setupEventListeners();
    
    // 初期化シーケンス
    setTimeout(async () => {
        // 1. データベース状態確認
        await checkDatabaseStatus();
        
        // 2. データロード試行
        await loadPostgreSQLEbayData();
        
    }, 1000);
    
    console.log('✅ 初期化完了 - PostgreSQL eBay API統合準備完了');
});

// グローバル関数として公開
window.loadPostgreSQLEbayData = loadPostgreSQLEbayData;
window.syncEbayData = syncEbayData;
window.checkDatabaseStatus = checkDatabaseStatus;
window.resetFilters = resetFilters;
window.applyFilters = applyFilters;

console.log('📜 棚卸しシステム PostgreSQL eBay API統合版 読み込み完了');