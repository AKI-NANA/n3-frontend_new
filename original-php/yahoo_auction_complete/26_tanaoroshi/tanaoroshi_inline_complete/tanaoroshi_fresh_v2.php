<?php
/**
 * 🎯 棚卸しシステム 完全新規レイアウト版 v2.0
 * カード分割問題根本解決 + Ajax エラー修正版
 */
?>

<!-- 新規専用CSS読み込み -->
<link rel="stylesheet" href="modules/tanaoroshi_inline_complete/assets/tanaoroshi_fresh_layout.css">

<!-- ローディングオーバーレイ -->
<div id="loadingOverlay" class="loading-overlay" style="display: none;">
    <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">データを読み込み中...</div>
    </div>
</div>

<!-- エラー表示エリア -->
<div id="errorContainer" style="display: none;"></div>

<!-- メインコンテナ -->
<div class="tanaoroshi-container">
    
    <!-- ヘッダー -->
    <header class="tanaoroshi-header">
        <h1 class="tanaoroshi-title">
            <i class="fas fa-clipboard-check"></i>
            棚卸システム v2.0
        </h1>
        <p class="tanaoroshi-subtitle">
            新規レイアウト・カード分割問題完全解決版 | ebay_inventory テーブル対応
        </p>
    </header>
    
    <!-- 統計情報 -->
    <section class="stats-grid">
        <div class="stat-card">
            <div class="stat-number" id="totalItems">0</div>
            <div class="stat-label">総商品数</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" id="activeItems">0</div>
            <div class="stat-label">アクティブ商品</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" id="totalValue">$0</div>
            <div class="stat-label">総価値</div>
        </div>
        <div class="stat-card">
            <div class="stat-number" id="averagePrice">$0</div>
            <div class="stat-label">平均価格</div>
        </div>
    </section>
    
    <!-- 検索・フィルターエリア -->
    <section class="search-filter-area">
        <div class="search-controls">
            <input type="text" 
                   id="searchInput" 
                   class="search-input" 
                   placeholder="商品名またはSKUで検索...">
            
            <select id="categoryFilter" class="filter-select">
                <option value="">すべてのカテゴリ</option>
                <option value="electronics">エレクトロニクス</option>
                <option value="hobby">ホビー</option>
                <option value="sports">スポーツ</option>
                <option value="collectibles">コレクタブル</option>
                <option value="fashion">ファッション</option>
            </select>
            
            <select id="conditionFilter" class="filter-select">
                <option value="">すべての状態</option>
                <option value="new">新品</option>
                <option value="used">中古</option>
            </select>
            
            <button class="action-button" onclick="window.TanaoroshiSystem.fetchData()">
                <i class="fas fa-refresh"></i>
                再読み込み
            </button>
        </div>
    </section>
    
    <!-- 商品グリッド -->
    <section class="products-grid-container">
        <header class="products-grid-header">
            <i class="fas fa-boxes"></i>
            商品一覧 - 新規レイアウト設計
        </header>
        
        <!-- 🎯 新設計グリッド（カード分割完全防止） -->
        <div id="productsGrid" class="products-grid">
            <!-- 商品カードはJavaScriptで動的生成 -->
            <div class="empty-state">
                <div class="empty-state-icon">⏳</div>
                <div class="empty-state-text">データを読み込み中...</div>
                <div class="empty-state-subtext">しばらくお待ちください</div>
            </div>
        </div>
    </section>
    
    <!-- デバッグ情報（開発時のみ） -->
    <div class="debug-grid">
        <div>レイアウト: v2.0 新規設計</div>
        <div>Ajax: 修正版</div>
        <div>DB: ebay_inventory</div>
    </div>
    
</div>

<!-- 新規JavaScript読み込み -->
<script src="modules/tanaoroshi_inline_complete/assets/tanaoroshi_fresh_layout.js"></script>

<!-- デバッグ切り替え（開発時のみ） -->
<script>
// 開発環境判定
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

if (isDevelopment) {
    document.body.classList.add('debug-active');
    console.log('🔧 開発モード: デバッグ情報を表示');
    
    // デバッグ用ショートカット
    window.debugTanaoroshi = {
        showFallback: () => window.TanaoroshiSystem.showFallback(),
        fetchData: () => window.TanaoroshiSystem.fetchData(),
        currentData: () => window.TanaoroshiSystem.currentData,
        version: '2.0-fresh-layout'
    };
    
    console.log('🎯 デバッグ用関数:', window.debugTanaoroshi);
}
</script>

<style>
/* 🎯 ページ専用の追加修正CSS */
.main-content {
    padding: 0 !important;
    margin: 0 !important;
    max-width: 100% !important;
    background: #f8f9fa !important;
}

.tanaoroshi-container {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 20px !important;
    box-sizing: border-box !important;
}

/* 他のCSSとの競合防止 */
.tanaoroshi-container * {
    box-sizing: border-box;
}

/* フォントAwesomeアイコンの確実な表示 */
.fas, .fab {
    font-family: "Font Awesome 6 Free", "Font Awesome 6 Brands" !important;
    font-weight: 900 !important;
}
</style>
