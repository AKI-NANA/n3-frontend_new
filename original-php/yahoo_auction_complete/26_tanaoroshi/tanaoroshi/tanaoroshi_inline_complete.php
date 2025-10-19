<?php
if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

// XSS対策関数
function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
?>

<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo safe_output('棚卸しシステム - 完全インライン版'); ?></title>
    
    <!-- 外部リソース -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    
    <!-- 外部CSSファイル読み込み（修正版） -->
    <link rel="stylesheet" href="common/css/pages/tanaoroshi_inline_complete.css">
    
    <style>
    /* ===== NAGANO-3統一CSS変数 ===== */
    :root {
        --space-xs: 0.25rem;
        --space-sm: 0.5rem;
        --space-md: 1rem;
        --space-lg: 1.5rem;
        --space-xl: 2rem;
        --space-2xl: 3rem;
        
        --color-primary: #3b82f6;
        --color-secondary: #6366f1;
        --color-success: #10b981;
        --color-warning: #f59e0b;
        --color-danger: #ef4444;
        --color-info: #06b6d4;
        
        --bg-primary: #f8fafc;
        --bg-secondary: #ffffff;
        --bg-tertiary: #f1f5f9;
        --bg-hover: #e2e8f0;
        --bg-active: #cbd5e1;
        
        --text-primary: #1e293b;
        --text-secondary: #475569;
        --text-tertiary: #64748b;
        --text-muted: #94a3b8;
        --text-white: #ffffff;
        
        --border-color: #e2e8f0;
        --border-light: #f1f5f9;
        --border-dark: #cbd5e1;
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        
        --radius-sm: 0.25rem;
        --radius-md: 0.375rem;
        --radius-lg: 0.5rem;
        --radius-xl: 0.75rem;
        --radius-full: 9999px;
        --transition-fast: all 0.15s ease-in-out;
        --transition-normal: all 0.2s ease-in-out;
        
        --text-xs: 0.75rem;
        --text-sm: 0.875rem;
        --text-base: 1rem;
        --text-lg: 1.125rem;
        --text-xl: 1.25rem;
        --text-2xl: 1.5rem;
        
        /* 棚卸し専用カラー */
        --inventory-stock: #059669;
        --inventory-dropship: #7c3aed;
        --inventory-set: #dc6803;
        --inventory-hybrid: #0e7490;
        --inventory-out: #dc2626;
        --inventory-used: #8b5cf6;

        /* Excel基盤カラー */
        --excel-primary: #dc2626;
        --excel-primary-rgb: 220, 38, 38;
        --excel-secondary: #f59e0b;
        --excel-success: #10b981;
        --excel-warning: #f59e0b;
        --excel-danger: #dc2626;
        --excel-info: #06b6d4;
    }
    
    /* ===== 軽量インラインCSS（外部ファイル補完用） ===== */
    /* 外部CSSファイルを優先使用、最小限の補完のみ */
    
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: var(--bg-primary);
        color: var(--text-primary);
        line-height: 1.5;
        margin: 0;
        padding: 0;
        overflow-x: hidden;
        height: 100vh;
    }
    
    .content {
        padding: 0;
        margin: 0;
        width: 100vw;
        min-height: 100vh;
        overflow-x: hidden;
        background: var(--bg-primary);
    }
    
    /* ボタン */
    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-sm);
        padding: var(--space-sm) var(--space-md);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: var(--text-sm);
        font-weight: 500;
        text-decoration: none;
        cursor: pointer;
        transition: var(--transition-fast);
        white-space: nowrap;
        font-family: inherit;
    }
    
    .btn:hover {
        background: var(--bg-hover);
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
    }
    
    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }
    
    .btn--small { padding: var(--space-xs) var(--space-sm); font-size: var(--text-xs); }
    .btn--primary { background: var(--color-primary); color: var(--text-white); border-color: var(--color-primary); }
    .btn--success { background: var(--color-success); color: var(--text-white); border-color: var(--color-success); }
    .btn--warning { background: var(--color-warning); color: var(--text-white); border-color: var(--color-warning); }
    .btn--danger { background: var(--color-danger); color: var(--text-white); border-color: var(--color-danger); }
    .btn--secondary { background: transparent; color: var(--color-primary); border: 1px solid var(--color-primary); }
    .btn--info { background: var(--color-info); color: var(--text-white); border-color: var(--color-info); }
    
    /* ヘッダー */
    .inventory__header {
        background: var(--bg-secondary);
        border-radius: 0;
        padding: var(--space-md);
        margin: 0;
        box-shadow: var(--shadow-sm);
        border: none;
        border-bottom: 1px solid var(--border-color);
        position: sticky;
        top: 0;
        z-index: 100;
    }
    
    .inventory__header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-lg);
        flex-wrap: wrap;
        gap: var(--space-md);
    }
    
    .inventory__title {
        font-size: var(--text-xl);
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
        display: flex;
        align-items: center;
        gap: var(--space-md);
    }
    
    .inventory__title-icon { color: var(--color-primary); font-size: var(--text-xl); }
    
    .inventory__exchange-rate {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-sm) var(--space-md);
        background: var(--bg-tertiary);
        border-radius: var(--radius-md);
        border: 1px solid var(--border-color);
    }
    
    .inventory__exchange-icon { color: var(--color-warning); }
    .inventory__exchange-text { font-size: var(--text-sm); color: var(--text-secondary); }
    .inventory__exchange-value { font-weight: 700; color: var(--text-primary); }
    
    .inventory__stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: var(--space-sm);
    }
    
    .inventory__stat {
        text-align: center;
        padding: var(--space-sm);
        background: var(--bg-tertiary);
        border-radius: var(--radius-md);
        border: 1px solid var(--border-light);
    }
    
    .inventory__stat-number {
        display: block;
        font-size: var(--text-lg);
        font-weight: 700;
        color: var(--text-primary);
    }
    
    .inventory__stat-label {
        font-size: var(--text-xs);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.02em;
    }
    
    /* フィルターバー */
    .inventory__filter-bar {
        background: var(--bg-secondary);
        border-radius: 0;
        padding: var(--space-md);
        margin: 0;
        box-shadow: var(--shadow-sm);
        border: none;
        border-bottom: 1px solid var(--border-color);
        position: sticky;
        top: 0;
        z-index: 99;
    }
    
    .inventory__filter-title {
        font-size: var(--text-lg);
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 var(--space-md) 0;
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }
    
    .inventory__filter-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-md);
        margin-bottom: var(--space-md);
    }
    
    .inventory__filter-group {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
    }
    
    .inventory__filter-label {
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--text-secondary);
    }
    
    .inventory__filter-select {
        padding: var(--space-sm);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        background: var(--bg-primary);
        font-size: var(--text-sm);
        transition: var(--transition-fast);
    }
    
    .inventory__filter-select:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
    
    .inventory__filter-actions {
        display: flex;
        gap: var(--space-md);
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
    }
    
    .inventory__filter-left, .inventory__filter-right {
        display: flex;
        gap: var(--space-sm);
        align-items: center;
    }
    
    .inventory__search-box {
        position: relative;
        min-width: 250px;
    }
    
    .inventory__search-input {
        width: 100%;
        padding: var(--space-sm) var(--space-md) var(--space-sm) var(--space-xl);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        background: var(--bg-primary);
        font-size: var(--text-sm);
        transition: var(--transition-fast);
    }
    
    .inventory__search-input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
    
    .inventory__search-icon {
        position: absolute;
        left: var(--space-md);
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
    }
    
    /* ビュー切り替え */
    .inventory__view-controls {
        background: var(--bg-secondary);
        border-radius: 0;
        padding: var(--space-md);
        margin: 0;
        box-shadow: var(--shadow-sm);
        border: none;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--space-md);
        position: sticky;
        top: 0;
        z-index: 98;
    }
    
    .inventory__view-toggle {
        display: flex;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        overflow: hidden;
        background: var(--bg-primary);
    }
    
    .inventory__view-btn {
        padding: var(--space-sm) var(--space-md);
        border: none;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        transition: var(--transition-fast);
        font-size: var(--text-sm);
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }
    
    .inventory__view-btn--active {
        background: var(--color-primary);
        color: var(--text-white);
    }
    
    .inventory__view-btn:hover:not(.inventory__view-btn--active) {
        background: var(--bg-hover);
        color: var(--text-primary);
    }
    
    .inventory__actions {
        display: flex;
        gap: var(--space-sm);
        align-items: center;
        flex-wrap: wrap;
    }
    
    /* CSVインポート */
    .inventory__import {
        background: var(--bg-secondary);
        border-radius: 0;
        padding: var(--space-md);
        margin: 0;
        box-shadow: var(--shadow-sm);
        border: none;
        border-bottom: 1px solid var(--border-color);
        text-align: center;
        transition: var(--transition-fast);
        cursor: pointer;
    }
    
    .inventory__import:hover {
        border-color: var(--color-primary);
        background: rgba(59, 130, 246, 0.02);
    }
    
    .inventory__import-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-md);
    }
    
    .inventory__import-icon {
        font-size: var(--text-lg);
        color: var(--color-primary);
    }
    
    .inventory__import-text {
        font-size: var(--text-sm);
        color: var(--text-secondary);
        font-weight: 500;
    }
    
    .inventory__import-input { display: none; }
    
    /* カードビュー */
    .inventory__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: var(--space-xs);
        padding: var(--space-sm);
        background: var(--bg-primary);
        min-height: calc(100vh - 400px);
    }
    
    .inventory__card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        overflow: hidden;
        cursor: pointer;
        transition: var(--transition-normal);
        position: relative;
        display: flex;
        flex-direction: column;
        box-shadow: var(--shadow-sm);
        height: 170px;
    }
    
    .inventory__card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: var(--color-info);
    }
    
    .inventory__card--selected {
        border-color: var(--excel-primary);
        background: rgba(var(--excel-primary-rgb), 0.05);
        box-shadow: 0 0 0 3px rgba(var(--excel-primary-rgb), 0.3);
        transform: translateY(-2px);
    }
    
    .inventory__card--selected::after {
        content: '✓';
        position: absolute;
        top: 8px;
        right: 8px;
        background: var(--excel-primary);
        color: white;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: 700;
        z-index: 10;
        box-shadow: var(--shadow-md);
    }
    
    .inventory__card-image {
        position: relative;
        height: 100px;
        background: var(--bg-tertiary);
        overflow: hidden;
        flex-shrink: 0;
    }
    
    .inventory__card-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        transition: var(--transition-normal);
    }
    
    .inventory__card:hover .inventory__card-img { transform: scale(1.05); }
    
    .inventory__card-badges {
        position: absolute;
        top: 8px;
        left: 8px;
        right: 40px;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        z-index: 5;
        pointer-events: none;
    }
    
    .inventory__badge {
        padding: 2px 6px;
        border-radius: var(--radius-sm);
        font-size: 0.6rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        box-shadow: var(--shadow-sm);
        color: var(--text-white);
    }
    
    .inventory__badge--stock { background: var(--inventory-stock); }
    .inventory__badge--dropship { background: var(--inventory-dropship); }
    .inventory__badge--set { background: var(--inventory-set); }
    .inventory__badge--hybrid { background: var(--inventory-hybrid); }
    
    .inventory__channel-badges {
        display: flex;
        gap: 2px;
        margin-top: 4px;
    }
    
    .inventory__channel-badge {
        padding: 2px 4px;
        border-radius: 2px;
        font-size: 0.5rem;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.9);
        color: var(--text-primary);
        box-shadow: var(--shadow-sm);
    }
    
    .inventory__channel-badge--ebay { background: #0064d2; color: white; }
    .inventory__channel-badge--mercari { background: #d63384; color: white; }
    .inventory__channel-badge--shopify { background: #96bf48; color: white; }
    
    .inventory__card-info {
        padding: 3px 6px 6px 6px;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        justify-content: space-between;
        min-height: 0;
    }
    
    .inventory__card-title {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.1;
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        height: 1.4rem;
        margin-bottom: 2px;
    }
    
    .inventory__card-price {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--space-xs);
        margin: 2px 0 4px 0;
    }
    
    .inventory__card-price-main {
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1;
    }
    
    .inventory__card-price-sub {
        font-size: 0.65rem;
        color: var(--text-muted);
        line-height: 1;
    }
    
    .inventory__card-meta {
        display: none; /* 小さいカードでは非表示 */
    }
    
    .inventory__meta-item {
        display: flex;
        justify-content: space-between;
        color: var(--text-secondary);
    }
    
    .inventory__meta-value {
        font-weight: 600;
        color: var(--text-primary);
    }
    
    .inventory__card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: auto;
        padding-top: 4px;
        padding-bottom: 4px;
        font-size: 0.6rem;
        min-height: 20px;
    }
    
    .inventory__card-sku {
        font-size: 0.55rem;
        color: var(--text-muted);
        font-family: monospace;
        background: var(--bg-tertiary);
        padding: 1px 3px;
        border-radius: var(--radius-sm);
        max-width: 65px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1;
    }
    
    .inventory__stock-edit {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
    }
    
    .inventory__stock-input {
        width: 50px;
        height: 24px;
        padding: 2px 4px;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        font-size: 0.7rem;
        text-align: center;
        background: var(--bg-primary);
    }
    
    .inventory__stock-input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
    
    /* Excelテーブル */
    .excel-grid {
        background: var(--bg-secondary);
        border: none;
        border-radius: 0;
        overflow: hidden;
        box-shadow: var(--shadow-md);
        margin: 0;
        min-height: calc(100vh - 400px);
    }
    
    .excel-toolbar {
        background: var(--bg-tertiary);
        border-bottom: 1px solid var(--border-color);
        padding: var(--space-sm) var(--space-md);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-md);
        min-height: 40px;
        flex-wrap: wrap;
    }
    
    .excel-toolbar__left, .excel-toolbar__right {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        flex-wrap: wrap;
    }
    
    .excel-btn {
        padding: var(--space-xs) var(--space-sm);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: var(--transition-fast);
        height: 28px;
        display: inline-flex;
        align-items: center;
        gap: var(--space-xs);
        white-space: nowrap;
    }
    
    .excel-btn:hover {
        background: var(--bg-hover);
        border-color: var(--excel-primary);
    }
    
    .excel-btn--primary { background: var(--excel-primary); border-color: var(--excel-primary); color: var(--text-white); }
    .excel-btn--warning { background: var(--color-warning); border-color: var(--color-warning); color: var(--text-white); }
    .excel-btn--small { padding: 2px var(--space-xs); font-size: 0.7rem; height: 24px; }
    
    /* スクロール問題修正 */
    .inventory__header,
    .inventory__filter-bar,
    .inventory__view-controls,
    .inventory__import {
        -webkit-transform: translateZ(0);
        transform: translateZ(0);
        will-change: auto;
        backface-visibility: hidden;
    }
    
    /* iOS Safari スクロール修正 */
    body, html {
        -webkit-overflow-scrolling: touch;
        overflow-scrolling: touch;
    }
    
    /* スクロール時の余白除去 */
    .content {
        -webkit-transform: translateZ(0);
        transform: translateZ(0);
    }
    
    /* ===== モーダル ===== */
    .inventory__modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: var(--transition-normal);
    }
    
    .inventory__modal--active {
        display: flex !important;
        opacity: 1 !important;
        visibility: visible !important;
    }
    
    .inventory__modal-content {
        background: var(--bg-secondary);
        border-radius: var(--radius-lg);
        padding: var(--space-xl);
        max-width: 800px;
        width: 90vw;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: var(--shadow-xl);
        transition: var(--transition-normal);
        position: relative;
        margin: auto;
        transform: scale(0.9);
    }
    
    .inventory__modal--active .inventory__modal-content {
        transform: scale(1) !important;
    }
    
    .inventory__modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-lg);
        padding-bottom: var(--space-md);
        border-bottom: 2px solid var(--border-color);
    }
    
    .inventory__modal-title {
        font-size: var(--text-xl);
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
    }
    
    .inventory__modal-close {
        background: none;
        border: none;
        font-size: var(--text-xl);
        color: var(--text-muted);
        cursor: pointer;
        padding: var(--space-sm);
        border-radius: var(--radius-md);
        transition: var(--transition-fast);
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .inventory__modal-close:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
    }
    
    /* ===== フォーム要素 ===== */
    .inventory__form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-md);
        margin-bottom: var(--space-lg);
    }
    
    .inventory__form-group {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
    }
    
    .inventory__form-label {
        font-weight: 600;
        color: var(--text-primary);
        font-size: var(--text-sm);
    }
    
    .inventory__form-input,
    .inventory__form-select {
        padding: var(--space-sm);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        background: var(--bg-primary);
        transition: var(--transition-fast);
    }
    
    .inventory__form-input:focus,
    .inventory__form-select:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
    
    .inventory__form-actions {
        display: flex;
        gap: var(--space-md);
        justify-content: flex-end;
        margin-top: var(--space-lg);
    }
    
    /* ===== 商品タイプ選択 ===== */
    .inventory__product-type-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: var(--space-sm);
        margin: var(--space-lg) 0;
    }
    
    .inventory__product-type-option {
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    .inventory__product-type-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-md);
        border: 2px solid var(--border-color);
        border-radius: var(--radius-lg);
        background: var(--bg-secondary);
        transition: var(--transition-fast);
        text-align: center;
    }
    
    .inventory__product-type-option:hover .inventory__product-type-card {
        border-color: var(--color-primary);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }
    
    .inventory__product-type-option--active .inventory__product-type-card {
        border-color: var(--color-primary);
        background: rgba(59, 130, 246, 0.1);
        box-shadow: var(--shadow-md);
    }
    
    .inventory__product-type-card i {
        font-size: var(--text-lg);
        color: var(--text-secondary);
    }
    
    .inventory__product-type-option--active .inventory__product-type-card i {
        color: var(--color-primary);
    }
    
    .inventory__product-type-card span {
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--text-primary);
    }
    
    /* ===== 画像アップロード ===== */
    .inventory__image-upload {
        border: 2px dashed var(--border-color);
        border-radius: var(--radius-md);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: var(--transition-fast);
        background: var(--bg-tertiary);
        position: relative;
        overflow: hidden;
    }
    
    .inventory__image-upload:hover,
    .inventory__image-upload--dragover {
        border-color: var(--color-primary);
        background: rgba(59, 130, 246, 0.05);
    }
    
    .inventory__image-upload-icon {
        font-size: 1.5rem;
        color: var(--text-muted);
        margin-bottom: var(--space-sm);
    }
    
    .inventory__image-upload-text {
        font-size: var(--text-xs);
        color: var(--text-secondary);
        text-align: center;
        line-height: 1.3;
    }
    
    .inventory__image-preview {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: var(--radius-md);
    }
    
    .inventory__image-remove {
        position: absolute;
        top: var(--space-xs);
        right: var(--space-xs);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 0.8rem;
        opacity: 0;
        transition: var(--transition-fast);
    }
    
    .inventory__image-upload:hover .inventory__image-remove {
        opacity: 1;
    }
    @media (max-width: 1200px) {
        .inventory__grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
        .inventory__card-image { height: 160px; }
    }
    
    @media (max-width: 768px) {
        .content { padding: var(--space-md); }
        .inventory__header-top { flex-direction: column; align-items: stretch; }
        .inventory__filter-grid { grid-template-columns: 1fr; }
        .inventory__filter-actions { flex-direction: column; align-items: stretch; }
        .inventory__view-controls { flex-direction: column; align-items: stretch; }
        .inventory__grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-sm); }
        .inventory__card-image { height: 140px; }
        .inventory__actions { flex-wrap: wrap; width: 100%; }
        .inventory__form-grid { grid-template-columns: 1fr; }
        .inventory__product-type-grid { grid-template-columns: repeat(2, 1fr); }
    }
    
    @media (max-width: 480px) {
        .inventory__stats { grid-template-columns: repeat(3, 1fr); }
        .inventory__grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
        .inventory__card-image { height: 120px; }
        .inventory__product-type-grid { grid-template-columns: repeat(2, 1fr); }
    }
    </style>
</head>
<body>
    <!-- ヘッダー -->
    <header class="inventory__header">
        <div class="inventory__header-top">
            <h1 class="inventory__title">
                <i class="fas fa-warehouse inventory__title-icon"></i>
                <?php echo safe_output('棚卸しシステム'); ?>
            </h1>
            
            <div class="inventory__exchange-rate">
                <i class="fas fa-exchange-alt inventory__exchange-icon"></i>
                <span class="inventory__exchange-text">USD/JPY:</span>
                <span class="inventory__exchange-value" id="exchange-rate">¥150.25</span>
            </div>
        </div>
        
        <div class="inventory__stats">
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-products">1,284</span>
                <span class="inventory__stat-label"><?php echo safe_output('総商品数'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="stock-products">912</span>
                <span class="inventory__stat-label"><?php echo safe_output('有在庫'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="dropship-products">203</span>
                <span class="inventory__stat-label"><?php echo safe_output('無在庫'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="set-products">169</span>
                <span class="inventory__stat-label"><?php echo safe_output('セット品'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="hybrid-products">45</span>
                <span class="inventory__stat-label"><?php echo safe_output('ハイブリッド'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-value">$102.5K</span>
                <span class="inventory__stat-label"><?php echo safe_output('総在庫価値'); ?></span>
            </div>
        </div>
    </header>

        <!-- フィルターバー -->
        <div class="inventory__filter-bar">
            <h2 class="inventory__filter-title">
                <i class="fas fa-filter"></i>
                <?php echo safe_output('フィルター設定'); ?>
            </h2>
            
            <div class="inventory__filter-grid">
                <div class="inventory__filter-group">
                    <label class="inventory__filter-label"><?php echo safe_output('商品種類'); ?></label>
                    <select class="inventory__filter-select" id="filter-type">
                        <option value=""><?php echo safe_output('すべて'); ?></option>
                        <option value="stock"><?php echo safe_output('有在庫'); ?></option>
                        <option value="dropship"><?php echo safe_output('無在庫'); ?></option>
                        <option value="set"><?php echo safe_output('セット品'); ?></option>
                        <option value="hybrid"><?php echo safe_output('ハイブリッド'); ?></option>
                    </select>
                </div>
                
                <div class="inventory__filter-group">
                    <label class="inventory__filter-label"><?php echo safe_output('出品モール'); ?></label>
                    <select class="inventory__filter-select" id="filter-channel">
                        <option value=""><?php echo safe_output('すべて'); ?></option>
                        <option value="ebay">eBay</option>
                        <option value="shopify">Shopify</option>
                        <option value="mercari"><?php echo safe_output('メルカリ'); ?></option>
                    </select>
                </div>
                
                <div class="inventory__filter-group">
                    <label class="inventory__filter-label"><?php echo safe_output('在庫状況'); ?></label>
                    <select class="inventory__filter-select" id="filter-stock-status">
                        <option value=""><?php echo safe_output('すべて'); ?></option>
                        <option value="sufficient"><?php echo safe_output('十分'); ?></option>
                        <option value="warning"><?php echo safe_output('注意'); ?></option>
                        <option value="low"><?php echo safe_output('少量'); ?></option>
                        <option value="out"><?php echo safe_output('在庫切れ'); ?></option>
                    </select>
                </div>
                
                <div class="inventory__filter-group">
                    <label class="inventory__filter-label"><?php echo safe_output('価格範囲 (USD)'); ?></label>
                    <select class="inventory__filter-select" id="filter-price-range">
                        <option value=""><?php echo safe_output('すべて'); ?></option>
                        <option value="0-25">$0 - $25</option>
                        <option value="25-50">$25 - $50</option>
                        <option value="50-100">$50 - $100</option>
                        <option value="100+">$100+</option>
                    </select>
                </div>
            </div>
            
            <div class="inventory__filter-actions">
                <div class="inventory__filter-left">
                    <button class="btn btn--secondary" onclick="resetFilters()">
                        <i class="fas fa-undo"></i>
                        <?php echo safe_output('リセット'); ?>
                    </button>
                    <button class="btn btn--info" onclick="applyFilters()">
                        <i class="fas fa-search"></i>
                        <?php echo safe_output('適用'); ?>
                    </button>
                </div>
                
                <div class="inventory__filter-right">
                    <div class="inventory__search-box">
                        <i class="fas fa-search inventory__search-icon"></i>
                        <input type="text" class="inventory__search-input" id="search-input" 
                               placeholder="<?php echo safe_output('商品名・SKU・カテゴリで検索...'); ?>">
                    </div>
                </div>
            </div>
        </div>

        <!-- ビュー切り替えコントロール -->
        <div class="inventory__view-controls">
            <div class="inventory__view-toggle">
                <button class="inventory__view-btn inventory__view-btn--active" id="card-view-btn">
                    <i class="fas fa-th-large"></i>
                    <?php echo safe_output('カードビュー'); ?>
                </button>
                <button class="inventory__view-btn" id="list-view-btn">
                    <i class="fas fa-table"></i>
                    <?php echo safe_output('Excelビュー'); ?>
                </button>
            </div>
            
            <div class="inventory__actions">
                <button class="btn btn--success" id="add-product-btn">
                    <i class="fas fa-plus"></i>
                    <?php echo safe_output('新規商品登録'); ?>
                </button>
                
                <button class="btn btn--warning" id="create-set-btn" disabled>
                    <i class="fas fa-layer-group"></i>
                    <span id="set-btn-text"><?php echo safe_output('新規セット品作成'); ?></span>
                </button>
                
                <button class="btn btn--secondary" onclick="exportData()">
                    <i class="fas fa-download"></i>
                    <?php echo safe_output('エクスポート'); ?>
                </button>
            </div>
        </div>

        <!-- CSVインポート -->
        <div class="inventory__import" id="csv-import-area">
            <input type="file" class="inventory__import-input" id="csv-import" accept=".csv">
            <div class="inventory__import-content">
                <i class="fas fa-cloud-upload-alt inventory__import-icon"></i>
                <span class="inventory__import-text"><?php echo safe_output('CSVファイルをインポート (eBay、メルカリ、Shopify、テンプレート対応)'); ?></span>
            </div>
        </div>

        <!-- カードビュー -->
        <div class="inventory__grid" id="card-view">
            <!-- データはJavaScriptで動的に生成 -->
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary); grid-column: 1 / -1;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>実データを読み込み中...</p>
            </div>
        </div>

        <!-- Excel風リストビュー -->
        <div class="excel-grid" id="list-view" style="display: none;">
            <div class="excel-toolbar">
                <div class="excel-toolbar__left">
                    <button class="excel-btn excel-btn--primary">
                        <i class="fas fa-plus"></i>
                        <?php echo safe_output('新規商品登録'); ?>
                    </button>
                    <button class="excel-btn">
                        <i class="fas fa-trash"></i>
                        <?php echo safe_output('選択削除'); ?>
                    </button>
                    <button class="excel-btn excel-btn--warning">
                        <i class="fas fa-layer-group"></i>
                        <?php echo safe_output('セット品作成'); ?>
                    </button>
                </div>
                
                <div class="excel-toolbar__right">
                    <button class="excel-btn" onclick="exportData()">
                        <i class="fas fa-download"></i>
                        <?php echo safe_output('エクスポート'); ?>
                    </button>
                </div>
            </div>

            <div class="excel-table-wrapper">
                <table class="excel-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;"><input type="checkbox" id="select-all-checkbox"></th>
                            <th style="width: 60px;"><?php echo safe_output('画像'); ?></th>
                            <th style="width: 200px;"><?php echo safe_output('商品名'); ?></th>
                            <th style="width: 120px;">SKU</th>
                            <th style="width: 80px;"><?php echo safe_output('種類'); ?></th>
                            <th style="width: 80px;"><?php echo safe_output('状態'); ?></th>
                            <th style="width: 80px;"><?php echo safe_output('価格(USD)'); ?></th>
                            <th style="width: 60px;"><?php echo safe_output('在庫'); ?></th>
                            <th style="width: 80px;"><?php echo safe_output('仕入価格'); ?></th>
                            <th style="width: 80px;"><?php echo safe_output('利益'); ?></th>
                            <th style="width: 80px;"><?php echo safe_output('モール'); ?></th>
                            <th style="width: 100px;"><?php echo safe_output('カテゴリ'); ?></th>
                            <th style="width: 100px;"><?php echo safe_output('操作'); ?></th>
                        </tr>
                    </thead>
                    <tbody id="products-table-body">
                        <!-- データはJavaScriptで動的に生成 -->
                    </tbody>
                </table>
            </div>

            <div class="excel-pagination">
                <div class="excel-pagination__info">
                    <span id="table-info"><?php echo safe_output('読み込み中...'); ?></span>
                </div>
                <div class="excel-pagination__controls">
                    <button class="excel-btn excel-btn--small" id="prev-page" disabled>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span id="page-info">1 / 1</span>
                    <button class="excel-btn excel-btn--small" id="next-page" disabled>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- 新規商品登録モーダル -->
        <div class="inventory__modal" id="add-product-modal">
            <div class="inventory__modal-content">
                <div class="inventory__modal-header">
                    <h2 class="inventory__modal-title">新規商品登録</h2>
                    <button class="inventory__modal-close" id="add-product-modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- 商品タイプ選択 -->
                <div style="margin-bottom: var(--space-lg);">
                    <h3 style="margin-bottom: var(--space-md);">
                        <i class="fas fa-tag"></i>
                        商品タイプ
                    </h3>
                    <div class="inventory__product-type-grid">
                        <label class="inventory__product-type-option inventory__product-type-option--active" data-type="stock">
                            <input type="radio" name="product-type" value="stock" checked style="display: none;">
                            <div class="inventory__product-type-card">
                                <i class="fas fa-warehouse"></i>
                                <span>有在庫</span>
                            </div>
                        </label>
                        <label class="inventory__product-type-option" data-type="dropship">
                            <input type="radio" name="product-type" value="dropship" style="display: none;">
                            <div class="inventory__product-type-card">
                                <i class="fas fa-truck"></i>
                                <span>無在庫</span>
                            </div>
                        </label>
                        <label class="inventory__product-type-option" data-type="set">
                            <input type="radio" name="product-type" value="set" style="display: none;">
                            <div class="inventory__product-type-card">
                                <i class="fas fa-layer-group"></i>
                                <span>セット品</span>
                            </div>
                        </label>
                        <label class="inventory__product-type-option" data-type="hybrid">
                            <input type="radio" name="product-type" value="hybrid" style="display: none;">
                            <div class="inventory__product-type-card">
                                <i class="fas fa-sync-alt"></i>
                                <span>ハイブリッド</span>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- 商品画像 -->
                <div style="margin-bottom: var(--space-lg);">
                    <h3 style="margin-bottom: var(--space-md);">
                        <i class="fas fa-image"></i>
                        商品画像
                    </h3>
                    <div class="inventory__image-upload" onclick="document.getElementById('new-product-image').click();" style="width: 250px; height: 180px;">
                        <input type="file" id="new-product-image" style="display: none;" accept="image/*">
                        <i class="fas fa-camera inventory__image-upload-icon" id="new-product-upload-icon"></i>
                        <div class="inventory__image-upload-text" id="new-product-upload-text">
                            商品画像を<br>アップロード
                        </div>
                        <button class="inventory__image-remove" id="new-product-image-remove" style="display: none;" onclick="event.stopPropagation(); removeNewProductImage()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <!-- 基本情報 -->
                <div class="inventory__form-grid">
                    <div class="inventory__form-group">
                        <label class="inventory__form-label">商品名 <span style="color: var(--color-danger);">*</span></label>
                        <input type="text" class="inventory__form-input" id="new-product-name" placeholder="商品名を入力">
                    </div>
                    <div class="inventory__form-group">
                        <label class="inventory__form-label">SKU <span style="color: var(--color-danger);">*</span></label>
                        <input type="text" class="inventory__form-input" id="new-product-sku" placeholder="SKU-XXX-001">
                    </div>
                    <div class="inventory__form-group">
                        <label class="inventory__form-label">販売価格 (USD)</label>
                        <input type="number" class="inventory__form-input" id="new-product-price" placeholder="0" min="0" step="0.01">
                    </div>
                    <div class="inventory__form-group">
                        <label class="inventory__form-label">仕入価格 (USD)</label>
                        <input type="number" class="inventory__form-input" id="new-product-cost" placeholder="0" min="0" step="0.01">
                    </div>
                    <div class="inventory__form-group" id="stock-field">
                        <label class="inventory__form-label">在庫数</label>
                        <input type="number" class="inventory__form-input" id="new-product-stock" placeholder="0" min="0">
                    </div>
                    <div class="inventory__form-group">
                        <label class="inventory__form-label">状態</label>
                        <select class="inventory__form-input" id="new-product-condition">
                            <option value="new">新品</option>
                            <option value="used">中古</option>
                            <option value="refurbished">整備済み</option>
                        </select>
                    </div>
                    <div class="inventory__form-group">
                        <label class="inventory__form-label">カテゴリ</label>
                        <input type="text" class="inventory__form-input" id="new-product-category" placeholder="Electronics">
                    </div>
                    <div class="inventory__form-group" id="supplier-field" style="display: none;">
                        <label class="inventory__form-label">仕入先</label>
                        <input type="text" class="inventory__form-input" id="new-product-supplier" placeholder="AliExpress, Amazon, etc.">
                    </div>
                </div>

                <!-- 商品説明 -->
                <div class="inventory__form-group" style="margin: var(--space-lg) 0;">
                    <label class="inventory__form-label">商品説明</label>
                    <textarea class="inventory__form-input" id="new-product-description" placeholder="商品の詳細な説明を入力してください..." style="min-height: 80px; resize: vertical;"></textarea>
                </div>

                <!-- セット品作成通知 -->
                <div id="set-creation-notice" style="display: none; background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md); margin: var(--space-lg) 0;">
                    <p style="margin: 0; color: var(--text-secondary); font-size: var(--text-sm);">
                        <i class="fas fa-info-circle"></i>
                        セット品を選択しています。基本情報を保存後、構成品管理画面に移ります。
                    </p>
                </div>
                
                <div class="inventory__form-actions">
                    <button class="btn btn--secondary" id="add-product-modal-cancel">キャンセル</button>
                    <button class="btn btn--success" id="save-new-product-btn">
                        <i class="fas fa-save"></i>
                        <span id="save-product-btn-text">商品を保存</span>
                    </button>
                </div>
            </div>
        </div>

    <!-- JavaScript（インライン完全版） -->
    <script>
    // グローバル変数
    let selectedProducts = [];
    let exchangeRate = 150.25;
    
    // 構文エラー防止用初期化
    if (typeof window.inventorySystem === 'undefined') {
        window.inventorySystem = {};
    }

    // 初期化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 棚卸しシステム（軽量化版）初期化開始');
        setupEventListeners();
        
        // セット品通知
        if (type === 'set') {
            setNotice.style.display = 'block';
            saveBtnText.textContent = 'セット品を作成';
        } else {
            setNotice.style.display = 'none';
            saveBtnText.textContent = '商品を保存';
        }
    }
    
    // 画像アップロード処理
    function handleNewProductImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('🖼️ 画像アップロード:', file.name);
        
        // 画像プレビュー表示
        const reader = new FileReader();
        reader.onload = function(e) {
            const uploadArea = document.querySelector('.inventory__image-upload');
            const uploadIcon = document.getElementById('new-product-upload-icon');
            const uploadText = document.getElementById('new-product-upload-text');
            const removeBtn = document.getElementById('new-product-image-remove');
            
            // 既存の内容を隠す
            uploadIcon.style.display = 'none';
            uploadText.style.display = 'none';
            
            // プレビュー画像を表示
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'inventory__image-preview';
            img.id = 'new-product-preview-img';
            
            // 既存のプレビューがあれば削除
            const existingPreview = document.getElementById('new-product-preview-img');
            if (existingPreview) {
                existingPreview.remove();
            }
            
            uploadArea.appendChild(img);
            
            // 削除ボタンを表示
            removeBtn.style.display = 'flex';
        };
        
        reader.readAsDataURL(file);
    }
    
    // 画像削除
    function removeNewProductImage() {
        const uploadIcon = document.getElementById('new-product-upload-icon');
        const uploadText = document.getElementById('new-product-upload-text');
        const removeBtn = document.getElementById('new-product-image-remove');
        const previewImg = document.getElementById('new-product-preview-img');
        const fileInput = document.getElementById('new-product-image');
        
        // プレビュー画像削除
        if (previewImg) {
            previewImg.remove();
        }
        
        // 元の状態に戻す
        uploadIcon.style.display = 'block';
        uploadText.style.display = 'block';
        removeBtn.style.display = 'none';
        
        // ファイル入力クリア
        if (fileInput) {
            fileInput.value = '';
        }
    }
    
    // 新規商品保存
    function saveNewProduct() {
        console.log('💾 新規商品保存開始');
        
        // フォームデータ取得
        const formData = {
            name: document.getElementById('new-product-name').value.trim(),
            sku: document.getElementById('new-product-sku').value.trim(),
            price: parseFloat(document.getElementById('new-product-price').value) || 0,
            cost: parseFloat(document.getElementById('new-product-cost').value) || 0,
            stock: parseInt(document.getElementById('new-product-stock').value) || 0,
            condition: document.getElementById('new-product-condition').value,
            category: document.getElementById('new-product-category').value.trim(),
            description: document.getElementById('new-product-description').value.trim(),
            type: document.querySelector('input[name="product-type"]:checked').value
        };
        
        // バリデーション
        if (!formData.name) {
            alert('商品名を入力してください。');
            return;
        }
        
        if (!formData.sku) {
            alert('SKUを入力してください。');
            return;
        }
        
        console.log('📋 保存データ:', formData);
        
        // 実際の保存処理（サーバーへの送信）は今後実装
        alert(`商品「${formData.name}」を保存しました。\n\nSKU: ${formData.sku}\nタイプ: ${formData.type}\n価格: ${formData.price}`);
        
        // モーダルを閉じる
        hideAddProductModal();
    }
    
    // 画像アップロード処理
    function handleNewProductImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('🖼️ 画像アップロード:', file.name);
        
        // 画像プレビュー表示
        const reader = new FileReader();
        reader.onload = function(e) {
            const uploadArea = document.querySelector('.inventory__image-upload');
            const uploadIcon = document.getElementById('new-product-upload-icon');
            const uploadText = document.getElementById('new-product-upload-text');
            const removeBtn = document.getElementById('new-product-image-remove');
            
            // 既存の内容を隠す
            uploadIcon.style.display = 'none';
            uploadText.style.display = 'none';
            
            // プレビュー画像を表示
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'inventory__image-preview';
            img.id = 'new-product-preview-img';
            
            // 既存のプレビューがあれば削除
            const existingPreview = document.getElementById('new-product-preview-img');
            if (existingPreview) {
                existingPreview.remove();
            }
            
            uploadArea.appendChild(img);
            
            // 削除ボタンを表示
            removeBtn.style.display = 'flex';
        };
        
        reader.readAsDataURL(file);
    }
    
    // 画像削除
    function removeNewProductImage() {
        const uploadIcon = document.getElementById('new-product-upload-icon');
        const uploadText = document.getElementById('new-product-upload-text');
        const removeBtn = document.getElementById('new-product-image-remove');
        const previewImg = document.getElementById('new-product-preview-img');
        const fileInput = document.getElementById('new-product-image');
        
        // プレビュー画像削除
        if (previewImg) {
            previewImg.remove();
        }
        
        // 元の状態に戻す
        uploadIcon.style.display = 'block';
        uploadText.style.display = 'block';
        removeBtn.style.display = 'none';
        
        // ファイル入力クリア
        if (fileInput) {
            fileInput.value = '';
        }
    }
    
    // N3統合APIテストを実行
    setTimeout(() => {
        testAPIConnection();
    }, 1000);
    
    console.log('✅ 初期化完了');
});
    
    // API接続テスト (N3準拠版)
    async function testAPIConnection() {
        console.log('🔧 N3統合API接続テスト開始');
        
        try {
            // N3準拠でindex.php経由のヘルスチェック
            const result = await window.executeAjax('tanaoroshi_health_check', {
                page: 'tanaoroshi_inline_complete'
            });
            
            console.log('✅ N3経由ヘルスチェック成功:', result);
            
            
            // ヘルスチェック成功なら実データ読み込み実行
            setTimeout(() => {
                loadInventoryDataViaIndex();
            }, 500); // 0.5秒後に実行
            
        } catch (error) {
            console.error('❌ APIテストエラー:', error);
            // ネットワークエラー時はフォールバックデータ
            loadFallbackData();
        }
    }
    
    // フォールバックデータ表示
    function loadFallbackData() {
        console.log('🔄 フォールバックデータ表示開始');
        
        const fallbackData = [
            {
                id: 1,
                name: 'iPhone 15 Pro Max 256GB - Collector\'s Item',
                sku: 'DEMO300000000',
                type: 'stock',
                condition: 'new',
                priceUSD: 278.72,
                costUSD: 195.10,
                stock: 0,
                category: 'Electronics',
                channels: ['ebay'],
                image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=200&fit=crop',
                listing_status: '売切れ',
                watchers_count: 36,
                views_count: 380
            },
            {
                id: 2,
                name: 'Samsung Galaxy S24 Ultra - Excellent Condition',
                sku: 'DEMO300000002',
                type: 'hybrid',
                condition: 'new',
                priceUSD: 1412.94,
                costUSD: 989.06,
                stock: 3,
                category: 'Electronics',
                channels: ['ebay'],
                image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=300&h=200&fit=crop',
                listing_status: 'アクティブ',
                watchers_count: 10,
                views_count: 1434
            },
            {
                id: 3,
                name: 'MacBook Pro M3 16-inch - Vintage',
                sku: 'DEMO300000011',
                type: 'stock',
                condition: 'used',
                priceUSD: 685.44,
                costUSD: 480.81,
                stock: 4,
                category: 'Electronics',
                channels: ['ebay'],
                image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=300&h=200&fit=crop',
                listing_status: 'アクティブ',
                watchers_count: 111,
                views_count: 464
            },
            {
                id: 4,
                name: 'Nintendo Switch OLED - Like New',
                sku: 'DEMO300000035',
                type: 'dropship',
                condition: 'used',
                priceUSD: 278.58,
                costUSD: 194.99,
                stock: 0,
                category: 'Electronics',
                channels: ['ebay'],
                image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=300&h=200&fit=crop',
                listing_status: 'アクティブ',
                watchers_count: 68,
                views_count: 1234
            },
            {
                id: 5,
                name: 'AirPods Pro 2 - Excellent Condition',
                sku: 'DEMO300000023',
                type: 'stock',
                condition: 'used',
                priceUSD: 267.53,
                costUSD: 187.27,
                stock: 4,
                category: 'Electronics',
                channels: ['ebay'],
                image: 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=300&h=200&fit=crop',
                listing_status: 'アクティブ',
                watchers_count: 52,
                views_count: 1564
            },
            {
                id: 6,
                name: 'Sony WH-1000XM5 - Limited Edition',
                sku: 'DEMO300000021',
                type: 'hybrid',
                condition: 'new',
                priceUSD: 210.74,
                costUSD: 147.52,
                stock: 0,
                category: 'Electronics',
                channels: ['ebay'],
                image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&h=200&fit=crop',
                listing_status: '終了',
                watchers_count: 13,
                views_count: 1192
            },
            {
                id: 7,
                name: 'Apple Watch Series 9 - Like New',
                sku: 'DEMO300000040',
                type: 'stock',
                condition: 'used',
                priceUSD: 335.94,
                costUSD: 235.16,
                stock: 2,
                category: 'Electronics',
                channels: ['ebay'],
                image: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=300&h=200&fit=crop',
                listing_status: 'アクティブ',
                watchers_count: 69,
                views_count: 1497
            },
            {
                id: 8,
                name: 'Designer Leather Handbag - Like New',
                sku: 'DEMO300000050',
                type: 'set',
                condition: 'used',
                priceUSD: 1392.09,
                costUSD: 974.46,
                stock: 0,
                category: 'Fashion',
                channels: ['ebay'],
                image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop',
                listing_status: '売切れ',
                watchers_count: 53,
                views_count: 473
            }
        ];
        
        console.log('📋 フォールバックデータ表示:', fallbackData.length, '件');
        updateProductCards(fallbackData);
        updateStatistics(fallbackData);
        
        // ユーザーに通知
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-warning);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: var(--shadow-md);
            z-index: 1000;
            font-size: 0.9rem;
            max-width: 300px;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <strong>デモデータ表示中</strong><br>
                    サーバーの実データが読み込めないため、<br>
                    デモデータを表示しています。
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 10秒後に通知を消す
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100px)';
                notification.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 10000);
    }

    // イベントリスナー設定
    function setupEventListeners() {
        // ビュー切り替え
        const cardViewBtn = document.getElementById('card-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        
        if (cardViewBtn) cardViewBtn.addEventListener('click', () => switchView('grid'));
        if (listViewBtn) listViewBtn.addEventListener('click', () => switchView('list'));
        
        // カード選択
        const cards = document.querySelectorAll('.inventory__card');
        cards.forEach(card => {
            card.addEventListener('click', function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                selectCard(this);
            });
        });
        
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

        // CSVインポート
        const csvImportArea = document.getElementById('csv-import-area');
        const csvImportInput = document.getElementById('csv-import');
        
        if (csvImportArea && csvImportInput) {
            csvImportArea.addEventListener('click', () => csvImportInput.click());
            csvImportInput.addEventListener('change', handleCSVImport);
        }
        
        // 新規商品登録ボタン
        const addProductBtn = document.getElementById('add-product-btn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', showAddProductModal);
        }
        
        // 新規商品登録モーダル関連
        const addProductModalClose = document.getElementById('add-product-modal-close');
        const addProductModalCancel = document.getElementById('add-product-modal-cancel');
        const saveNewProductBtn = document.getElementById('save-new-product-btn');
        
        if (addProductModalClose) {
            addProductModalClose.addEventListener('click', hideAddProductModal);
        }
        if (addProductModalCancel) {
            addProductModalCancel.addEventListener('click', hideAddProductModal);
        }
        if (saveNewProductBtn) {
            saveNewProductBtn.addEventListener('click', saveNewProduct);
        }
        
        // 商品タイプ選択
        const productTypeOptions = document.querySelectorAll('.inventory__product-type-option');
        productTypeOptions.forEach(option => {
            option.addEventListener('click', function() {
                // 他のオプションの選択を解除
                productTypeOptions.forEach(opt => opt.classList.remove('inventory__product-type-option--active'));
                // 現在のオプションを選択
                this.classList.add('inventory__product-type-option--active');
                // ラジオボタンも更新
                this.querySelector('input[type="radio"]').checked = true;
                
                // UIの更新
                updateProductTypeUI(this.dataset.type);
            });
        });
        
        // 画像アップロード
        const newProductImage = document.getElementById('new-product-image');
        if (newProductImage) {
            newProductImage.addEventListener('change', handleNewProductImageUpload);
        }
        
        // モーダル背景クリックで閉じる機能を追加
        document.addEventListener('click', function(event) {
            const modal = document.getElementById('add-product-modal');
            if (modal && modal.classList.contains('inventory__modal--active') && event.target === modal) {
                hideAddProductModal();
            }
        });
        
        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                const modal = document.getElementById('add-product-modal');
                if (modal && modal.classList.contains('inventory__modal--active')) {
                    hideAddProductModal();
                }
            }
        });
    }

    // ビュー切り替え
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
            console.log('✅ カードビューに切り替え完了');
        } else {
            cardView.style.display = 'none';
            listView.style.display = 'block';
            listViewBtn.classList.add('inventory__view-btn--active');
            console.log('✅ リストビューに切り替え完了');
        }
    }

    // カード選択
    function selectCard(card) {
        const productId = parseInt(card.dataset.id);
        
        card.classList.toggle('inventory__card--selected');
        
        if (card.classList.contains('inventory__card--selected')) {
            if (!selectedProducts.includes(productId)) {
                selectedProducts.push(productId);
            }
        } else {
            selectedProducts = selectedProducts.filter(id => id !== productId);
        }
        
        updateSelectionUI();
        console.log('📦 選択中の商品:', selectedProducts);
    }

    // 選択UI更新
    function updateSelectionUI() {
        const createSetBtn = document.getElementById('create-set-btn');
        const setBtnText = document.getElementById('set-btn-text');
        
        if (createSetBtn && setBtnText) {
            if (selectedProducts.length >= 2) {
                createSetBtn.disabled = false;
                setBtnText.textContent = `セット品作成 (${selectedProducts.length}点選択)`;
                createSetBtn.classList.add('btn--warning');
            } else {
                createSetBtn.disabled = true;
                setBtnText.textContent = '新規セット品作成';
                createSetBtn.classList.remove('btn--warning');
            }
        }
    }

    // セット品作成処理
    function handleSetCreation() {
        if (selectedProducts.length < 2) {
            alert('セット品を作成するには2つ以上の商品を選択してください。');
            return;
        }
        
        console.log('🎯 セット品作成開始:', selectedProducts);
        alert(`${selectedProducts.length}点の商品でセット品を作成します。`);
    }

    // 検索処理
    function handleSearch(event) {
        const query = event.target.value.toLowerCase();
        console.log('🔍 検索:', query);
        
        const cards = document.querySelectorAll('.inventory__card');
        cards.forEach(card => {
            const title = card.querySelector('.inventory__card-title')?.textContent.toLowerCase() || '';
            const sku = card.querySelector('.inventory__card-sku')?.textContent.toLowerCase() || '';
            
            if (title.includes(query) || sku.includes(query)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // フィルター適用
    function applyFilters() {
        console.log('🎯 フィルター適用');
        
        const typeFilter = document.getElementById('filter-type')?.value || '';
        const channelFilter = document.getElementById('filter-channel')?.value || '';
        
        const cards = document.querySelectorAll('.inventory__card');
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
            
            // モールフィルター
            if (channelFilter) {
                const channelBadges = card.querySelectorAll('.inventory__channel-badge');
                const hasChannel = Array.from(channelBadges).some(badge => 
                    badge.classList.contains(`inventory__channel-badge--${channelFilter}`)
                );
                if (!hasChannel) show = false;
            }
            
            card.style.display = show ? 'flex' : 'none';
        });
    }

    // フィルターリセット
    function resetFilters() {
        console.log('🔄 フィルターリセット');
        const filterSelects = document.querySelectorAll('.inventory__filter-select');
        filterSelects.forEach(select => select.value = '');
        
        const cards = document.querySelectorAll('.inventory__card');
        cards.forEach(card => card.style.display = 'flex');
        
        // 検索もリセット
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
    }

    // CSVインポート処理
    function handleCSVImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('📁 CSVファイル選択:', file.name);
        alert(`CSVファイル「${file.name}」のインポート機能は開発中です。`);
        
        // ファイル入力をリセット
        event.target.value = '';
    }

    // エクスポート処理
    function exportData() {
        console.log('📥 データエクスポート開始');
        alert('エクスポート機能は開発中です。');
    }

    // 商品詳細表示
    function showProductDetail(productId) {
        console.log('👁️ 商品詳細表示:', productId);
        alert(`商品ID ${productId} の詳細を表示します。`);
    }

    // 商品削除
    function deleteProduct(productId) {
        if (confirm('この商品を削除しますか？')) {
            console.log('🗑️ 商品削除:', productId);
            alert(`商品ID ${productId} を削除しました。`);
        }
    }

    // N3経由データ読み込み
    async function loadInventoryDataViaIndex() {
        console.log('📂 N3統合在庫データ読み込み開始');
        
        try {
            showLoading();
            
            // N3準拠でindex.php経由
            const result = await window.executeAjax('tanaoroshi_get_inventory', {
                page: 'tanaoroshi_inline_complete',
                filters: {},
                use_hook_integration: false
            });
            
            console.log('🔍 N3レスポンス詳細:', {
                success: result.success,
                dataCount: result.data ? result.data.length : 0,
                message: result.message
            });
            
            if (result.success && result.data && Array.isArray(result.data)) {
                if (result.data.length > 0) {
                    console.log('✅ N3経由データ取得成功:', result.data.length, '件');
                    updateProductCards(result.data);
                    updateStatistics(result.data);
                    
                    // 成功通知
                    showSuccessNotification(`✅ データ読み込み完了: ${result.data.length}件`);
                } else {
                    console.log('⚠️ データが空です。フォールバックデータを表示します。');
                    loadFallbackData();
                }
            } else {
                console.error('❌ N3データ取得エラー:', result.error || result.message);
                console.log('⚠️ フォールバックデータを表示します。');
                loadFallbackData();
            }
            
        } catch (error) {
            console.error('❌ N3統合エラー:', error.name, error.message);
            console.error('❌ エラー詳細:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // エラー通知
            showErrorNotification('❌ N3統合エラー: ' + error.message);
            
            // エラー時はフォールバックデータ表示
            loadFallbackData();
            
        } finally {
            hideLoading();
        }
    }
    
    // レガシー関数（フォールバック用）
    async function loadInventoryData() {
        console.log('⚠️ レガシー関数呼び出し - N3統合版にリダイレクト');
        return await loadInventoryDataViaIndex();
    }
    
    // 商品カード更新
    function updateProductCards(products) {
        const cardContainer = document.getElementById('card-view');
        if (!cardContainer) return;
        
        cardContainer.innerHTML = products.map(product => createProductCard(product)).join('');
        
        // カードイベントリスナー再設定
        const cards = cardContainer.querySelectorAll('.inventory__card');
        cards.forEach(card => {
            card.addEventListener('click', function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                selectCard(this);
            });
        });
        
        // Excelビューも更新
        updateProductTable(products);
    }
    
    // Excelビューテーブル更新
    function updateProductTable(products) {
        const tableBody = document.getElementById('products-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = products.map(product => createProductTableRow(product)).join('');
        
        // テーブル情報更新
        const tableInfo = document.getElementById('table-info');
        if (tableInfo) {
            tableInfo.textContent = `合計 ${products.length} 件の商品`;
        }
        
        // チェックボックスイベント再設定
        const checkboxes = tableBody.querySelectorAll('.product-checkbox');
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
    }
    
    // 商品テーブル行作成
    function createProductTableRow(product) {
        const typeOptions = {
            'stock': '有在庫',
            'dropship': '無在庫',
            'set': 'セット品',
            'hybrid': 'ハイブリッド'
        };
        
        const conditionText = product.condition === 'new' ? '新品' : '中古';
        
        const channelBadges = product.channels.map(channel => {
            const channelConfig = {
                'ebay': { bg: '#0064d2', text: 'E' },
                'shopify': { bg: '#96bf48', text: 'S' },
                'mercari': { bg: '#d63384', text: 'M' }
            };
            const config = channelConfig[channel] || { bg: '#666', text: '?' };
            return `<span style="padding: 1px 3px; background: ${config.bg}; color: white; border-radius: 2px; font-size: 0.6rem; margin-right: 2px;">${config.text}</span>`;
        }).join('');
        
        const profit = (product.priceUSD - product.costUSD).toFixed(2);
        
        return `
            <tr data-id="${product.id}">
                <td><input type="checkbox" class="excel-checkbox product-checkbox" data-id="${product.id}" /></td>
                <td>
                    ${product.image ? 
                        `<img src="${product.image}" alt="商品画像" style="width: 40px; height: 32px; object-fit: cover; border-radius: 4px;" onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\"fas fa-image\" style=\"color: var(--text-muted); font-size: 1rem;\"></i>'">` :
                        `<div style="width: 40px; height: 32px; background: var(--bg-tertiary); border-radius: 4px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-image" style="color: var(--text-muted);"></i></div>`
                    }
                </td>
                <td><input type="text" class="excel-cell" value="${product.name}" style="width: 100%; border: none; background: transparent; font-size: 0.75rem;" /></td>
                <td><input type="text" class="excel-cell" value="${product.sku}" style="width: 100%; border: none; background: transparent; font-size: 0.75rem;" /></td>
                <td>
                    <select class="excel-select" style="width: 100%; border: none; background: transparent; font-size: 0.75rem;">
                        ${Object.entries(typeOptions).map(([value, text]) => 
                            `<option value="${value}" ${product.type === value ? 'selected' : ''}>${text}</option>`
                        ).join('')}
                    </select>
                </td>
                <td style="text-align: center; font-size: 0.75rem;">${conditionText}</td>
                <td><input type="number" class="excel-cell" value="${product.priceUSD.toFixed(2)}" style="width: 100%; border: none; background: transparent; font-size: 0.75rem; text-align: right;" step="0.01" /></td>
                <td><input type="number" class="excel-cell" value="${product.stock}" style="width: 100%; border: none; background: transparent; font-size: 0.75rem; text-align: center;" min="0" onchange="updateStock(${product.id}, this.value)" /></td>
                <td style="text-align: right; font-size: 0.75rem;">${product.costUSD.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 600; color: var(--color-success); font-size: 0.75rem;">${profit}</td>
                <td>
                    <div style="display: flex; gap: 2px;">
                        ${channelBadges}
                    </div>
                </td>
                <td style="font-size: 0.75rem;">${product.category}</td>
                <td>
                    <div style="display: flex; gap: 2px;">
                        <button class="excel-btn excel-btn--small" onclick="showProductDetail(${product.id})" title="詳細">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="excel-btn excel-btn--small" onclick="deleteProduct(${product.id})" title="削除" style="color: var(--color-danger);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // 商品選択状態切り替え
    function toggleProductSelection(productId, selected) {
        if (selected) {
            if (!selectedProducts.includes(productId)) {
                selectedProducts.push(productId);
            }
        } else {
            selectedProducts = selectedProducts.filter(id => id !== productId);
        }
        
        // カードビューの選択状態も更新
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
    
    // 商品カード作成
    function createProductCard(product) {
        // デバッグ: 高解像度画像情報をログ出力
        console.log('🖼️ 高品質画像デバッグ:', product.name, 'URL:', product.image, 'カテゴリ:', product.subcategory || product.category);
        
        const badgeClass = `inventory__badge--${product.type}`;
        const badgeText = {
            'stock': '有在庫',
            'dropship': '無在庫', 
            'set': 'セット品',
            'hybrid': 'ハイブリッド'
        }[product.type] || '不明';
        
        const channelBadges = product.channels.map(channel => {
            const channelConfig = {
                'ebay': { class: 'ebay', text: 'E' },
                'shopify': { class: 'shopify', text: 'S' },
                'mercari': { class: 'mercari', text: 'M' }
            };
            const config = channelConfig[channel] || { class: 'unknown', text: '?' };
            return `<span class="inventory__channel-badge inventory__channel-badge--${config.class}">${config.text}</span>`;
        }).join('');
        
        const priceJPY = Math.round(product.priceUSD * exchangeRate);
        const profit = product.priceUSD - product.costUSD;
        
        // 画像表示部分を改善
        let imageHtml;
        if (product.image && product.image.trim() && product.image !== '') {
            imageHtml = `
                <img src="${product.image}" 
                     alt="${product.name}" 
                     class="inventory__card-img" 
                     onload="console.log('✅ 画像読み込み成功:', '${product.name}');"
                     onerror="console.error('❌ 画像エラー:', '${product.image}'); this.style.display='none'; this.parentNode.innerHTML='<div style=\"display: flex; align-items: center; justify-content: center; height: 100%; background: var(--bg-tertiary); color: var(--text-muted); flex-direction: column;\"><i class=\"fas fa-image\" style=\"font-size: 1.8rem; margin-bottom: 4px;\"></i><span style=\"font-size: 0.6rem;\">画像エラー</span></div>';"`>
            `;
        } else {
            imageHtml = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: var(--bg-tertiary); color: var(--text-muted); flex-direction: column;">
                    <i class="fas fa-image" style="font-size: 1.8rem; margin-bottom: 4px;"></i>
                    <span style="font-size: 0.6rem;">画像なし</span>
                </div>
            `;
        }
        
        return `
            <div class="inventory__card" data-id="${product.id}">
                <div class="inventory__card-image">
                    ${imageHtml}
                    <div class="inventory__card-badges">
                        <span class="inventory__badge ${badgeClass}">${badgeText}</span>
                        <div class="inventory__channel-badges">
                            ${channelBadges}
                        </div>
                    </div>
                </div>
                <div class="inventory__card-info">
                    <h3 class="inventory__card-title" title="${product.name}">${product.name}</h3>
                    <div class="inventory__card-price">
                        <div class="inventory__card-price-main">${product.priceUSD.toFixed(2)}</div>
                        <div class="inventory__card-price-sub">¥${priceJPY.toLocaleString()}</div>
                    </div>
                    <div class="inventory__card-footer">
                        <span class="inventory__card-sku" title="${product.sku}">${product.sku}</span>
                        ${product.type === 'stock' || product.type === 'hybrid' ?
                            `<span style="color: var(--color-success); font-size: 0.55rem; font-weight: 600;">在庫:${product.stock}</span>` :
                            `<span style="color: var(--color-info); font-size: 0.55rem;">${product.listing_status}</span>`
                        }
                    </div>
                </div>
            </div>
        `;
    }
    
    // 統計情報更新
    function updateStatistics(products) {
        const stats = {
            total: products.length,
            stock: products.filter(p => p.type === 'stock').length,
            dropship: products.filter(p => p.type === 'dropship').length,
            set: products.filter(p => p.type === 'set').length,
            hybrid: products.filter(p => p.type === 'hybrid').length,
            totalValue: products.reduce((sum, p) => sum + p.priceUSD, 0)
        };
        
        document.getElementById('total-products').textContent = stats.total.toLocaleString();
        document.getElementById('stock-products').textContent = stats.stock.toLocaleString();
        document.getElementById('dropship-products').textContent = stats.dropship.toLocaleString();
        document.getElementById('set-products').textContent = stats.set.toLocaleString();
        document.getElementById('hybrid-products').textContent = stats.hybrid.toLocaleString();
        document.getElementById('total-value').textContent = `${(stats.totalValue / 1000).toFixed(1)}K`;
        
        console.log('📈 統計情報更新完了:', stats);
    }
    
    // ローディング表示
    function showLoading() {
        const cardContainer = document.getElementById('card-view');
        if (cardContainer) {
            cardContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i><p>データを読み込み中...</p></div>';
        }
    }
    
    function hideLoading() {
        // ローディングは updateProductCards で除去される
    }
    
    // 在庫数更新関数
    function updateStock(productId, newStock) {
        console.log(`📦 在庫更新: 商品ID ${productId}, 新在庫数: ${newStock}`);
        // 実際にはサーバーへのAjaxリクエストが必要
        alert(`商品ID ${productId} の在庫を ${newStock} に更新しました。`);
    }
    
    // 成功通知表示
    function showSuccessNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-success);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: var(--shadow-md);
            z-index: 1000;
            font-size: 0.9rem;
            max-width: 350px;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-check-circle"></i>
                <div>${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 5秒後に消す
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100px)';
                notification.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // エラー通知表示
    function showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-danger);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: var(--shadow-md);
            z-index: 1000;
            font-size: 0.9rem;
            max-width: 350px;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-exclamation-triangle"></i>
                <div>${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 8秒後に消す
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100px)';
                notification.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 8000);
    }
    
    <!-- 外部JavaScriptファイル読み込み（N3統合完全版） -->
    <script src="common/js/pages/tanaoroshi_inline_complete.js"></script>
    
    console.log('📜 棚卸しシステム JavaScript（N3統合完全版）読み込み完了');
    </script>
</body>
</html>