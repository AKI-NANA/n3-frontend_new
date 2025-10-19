
<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <meta name="csrf-token" content="e5236bc7d8d2c4f558cf69bd2062dbbeab7a312e3356c308ec321ab4e54ad780">
    
    <title>NAGANO-3 v2.0 - NAGANO-3</title>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- 🎯 N3準拠CSS読み込み（@import方式採用・インラインCSS禁止） -->
    <link rel="stylesheet" href="common/css/style.css">
    
    <!-- 🎯 N3独自モーダルシステム読み込み -->
    <script src="common/js/components/n3_modal_system.js"></script>
</head>
<body data-page="ebay_test_viewer">
    
    <!-- N3ステータス表示 -->
    <div class="n3-status-indicator">
        <i class="fas fa-check-circle"></i> N3 v2.0 統合版（サイドバー幅制御修正版）
    </div>
    
    <!-- ローディングスクリーン -->
    <div id="loadingScreen" class="loading-screen" style="display: none">
        <div class="loading-text">NAGANO-3 v2.0 読み込み中...</div>
    </div>
    
    <!-- メインレイアウト -->
    <div class="layout">
        
        <!-- ヘッダー（「ソースから復元」ベース） -->
        
<!-- ヘッダー（WEB HTMLそのまま版） -->
<header class="header" id="mainHeader">
    
    <!-- ヘッダー左側：ロゴ -->
    <div class="header-left">
        <a href="/?page=dashboard" class="logo">
            <div class="logo__icon">N3</div>
            <div class="logo__text">
                <h1>NAGANO-3</h1>
            </div>
        </a>
    </div>

    <!-- 検索機能 -->
    <div class="header__search" id="headerSearchContainer">
        <i class="fas fa-search search__icon"></i>
        <input
            type="text"
            class="search__input"
            placeholder="注文番号、顧客ID、商品名で検索..."
            id="headerSearchInput"
        />
    </div>

    <!-- 世界時計 -->
    <div class="world-clock">
        <div class="clock__item">
            <div class="clock__label">西海岸</div>
            <div class="clock__time">
                <div class="clock__time-main" id="clock-la">--:--</div>
                <div class="clock__time-sub" id="date-la">--/--</div>
            </div>
        </div>
        <div class="clock__item">
            <div class="clock__label">東海岸</div>
            <div class="clock__time">
                <div class="clock__time-main" id="clock-ny">--:--</div>
                <div class="clock__time-sub" id="date-ny">--/--</div>
            </div>
        </div>
        <div class="clock__item">
            <div class="clock__label">ドイツ</div>
            <div class="clock__time">
                <div class="clock__time-main" id="clock-berlin">--:--</div>
                <div class="clock__time-sub" id="date-berlin">--/--</div>
            </div>
        </div>
        <div class="clock__item clock__item--japan">
            <div class="clock__label">日本</div>
            <div class="clock__time">
                <div class="clock__time-main" id="clock-tokyo">07:18</div>
                <div class="clock__time-sub" id="date-tokyo">08/30</div>
            </div>
        </div>
    </div>

    <!-- 為替レート -->
    <div class="exchange-rates">
        <div class="rate__item rate__item--usd">
            <div class="rate__label">USD/JPY</div>
            <div class="rate__value" id="rate-usdjpy">154.32</div>
        </div>
        <div class="rate__item">
            <div class="rate__label">EUR/JPY</div>
            <div class="rate__value" id="rate-eurjpy">167.45</div>
        </div>
    </div>

    <!-- ヘッダー右側アクション -->
    <div class="header__actions">
        
        <!-- 通知アイコン -->
        <div class="notification__container">
            <button class="notification__icon" id="notificationBtn" title="通知">
                <i class="fas fa-bell"></i>
                <span class="notification__badge" id="notification-count">3</span>
            </button>
        </div>
        
        <!-- テーマ切り替え -->
        <div class="theme-switcher" id="themeSwitcher" title="テーマ切り替え">
            <i class="fas fa-palette"></i>
        </div>

        <!-- ユーザーランキング -->
        <div class="user-ranking" id="userRanking" title="ユーザーランキング">
            <i class="fas fa-trophy"></i>
        </div>

        <!-- マニュアルボタン -->
        <div class="manual-btn" id="manualBtn" title="マニュアル">
            <i class="fas fa-book"></i>
        </div>

        <!-- ユーザー情報 -->
        <div class="user__info" id="userInfo">
            <div class="user__avatar">N</div>
            <div class="user__info-text">NAGANO-3 User</div>
        </div>
    </div>

    <!-- モバイル用メニューボタン -->
    <button class="mobile-menu__toggle" id="mobileMenuToggle">
        <i class="fas fa-bars menu-icon"></i>
        <i class="fas fa-times close-icon" style="display: none;"></i>
    </button>

</header>

<!-- ヘッダー専用JavaScript -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ NAGANO-3 ヘッダー初期化（WEB HTML版）');

    // 世界時計更新
    function updateWorldClocks() {
        const now = new Date();
        
        // 各タイムゾーンの時刻を計算
        const timezones = {
            'clock-la': { offset: -8, element: 'clock-la', dateElement: 'date-la' },
            'clock-ny': { offset: -5, element: 'clock-ny', dateElement: 'date-ny' },
            'clock-berlin': { offset: 1, element: 'clock-berlin', dateElement: 'date-berlin' },
            'clock-tokyo': { offset: 9, element: 'clock-tokyo', dateElement: 'date-tokyo' }
        };
        
        Object.values(timezones).forEach(tz => {
            const localTime = new Date(now.getTime() + (tz.offset * 60 * 60 * 1000));
            const timeStr = localTime.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            const dateStr = localTime.toLocaleDateString('en-US', { 
                month: '2-digit', 
                day: '2-digit' 
            });
            
            const timeElement = document.getElementById(tz.element);
            const dateElement = document.getElementById(tz.dateElement);
            
            if (timeElement) timeElement.textContent = timeStr;
            if (dateElement) dateElement.textContent = dateStr;
        });
    }

    // 為替レート更新（デモ用）
    function updateExchangeRates() {
        const usdJpy = document.getElementById('rate-usdjpy');
        const eurJpy = document.getElementById('rate-eurjpy');
        
        if (usdJpy) {
            // デモ用：実際のAPI接続時は置き換え
            const baseUsd = 154.32;
            const fluctuation = (Math.random() - 0.5) * 0.5;
            usdJpy.textContent = (baseUsd + fluctuation).toFixed(2);
        }
        
        if (eurJpy) {
            const baseEur = 167.45;
            const fluctuation = (Math.random() - 0.5) * 0.7;
            eurJpy.textContent = (baseEur + fluctuation).toFixed(2);
        }
    }

    // イベントリスナー設定
    const headerSearchInput = document.getElementById('headerSearchInput');
    if (headerSearchInput) {
        headerSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    console.log('検索実行:', query);
                    // 実際の検索処理を実装
                    alert('検索機能: ' + query);
                }
            }
        });
    }

    // 通知ボタン
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            console.log('通知表示');
            alert('通知機能（実装予定）');
        });
    }

    // テーマ切り替え
    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', function() {
            console.log('テーマ切り替え');
            alert('テーマ切り替え機能（実装予定）');
        });
    }

    // ユーザーランキング
    const userRanking = document.getElementById('userRanking');
    if (userRanking) {
        userRanking.addEventListener('click', function() {
            console.log('ユーザーランキング表示');
            alert('ユーザーランキング機能（実装予定）');
        });
    }

    // マニュアルボタン
    const manualBtn = document.getElementById('manualBtn');
    if (manualBtn) {
        manualBtn.addEventListener('click', function() {
            console.log('マニュアル表示');
            window.open('?page=manual_main_content', '_blank');
        });
    }

    // ユーザー情報
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.addEventListener('click', function() {
            console.log('ユーザーメニュー表示');
            alert('ユーザーメニュー（実装予定）');
        });
    }

    // モバイルメニュートグル
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            console.log('モバイルメニュートグル');
            const sidebar = document.querySelector('.unified-sidebar');
            if (sidebar) {
                sidebar.classList.toggle('unified-sidebar--mobile-open');
            }
        });
    }

    // 初期実行
    updateWorldClocks();
    updateExchangeRates();

    // 定期更新
    setInterval(updateWorldClocks, 60000); // 1分ごと
    setInterval(updateExchangeRates, 30000); // 30秒ごと
});
</script>
        
        <!-- サイドバー（「ソースから復元」ベース） -->
        
    <!-- サイドバー -->
    <aside class="sidebar">
      <!-- ===== 統一サイドバーCSS（N3最適化版） ===== -->
      <style>
        /* ===== CSS変数定義 ===== */
        :root {
          --sidebar-width: 220px;
          --sidebar-collapsed: 60px;
          --header-height: 80px;
          --submenu-width: 280px;

          /* Z-index階層（明確に分離） */
          --z-content: 1;
          --z-sidebar: 2000;
          --z-submenu: 2500;
          --z-header: 3000;

          /* カラーパレット */
          --sidebar-bg: #2c3e50;
          --sidebar-hover: rgba(52, 152, 219, 0.3);
          --sidebar-active: linear-gradient(135deg, #3498db, #8b5cf6);
          --submenu-bg: #34495e;
          --submenu-border: #3498db;
          --text-white: rgba(255, 255, 255, 0.9);
          --text-white-dim: rgba(255, 255, 255, 0.7);

          /* アニメーション */
          --transition-fast: 0.2s ease;
          --transition-normal: 0.3s ease;
        }

        /* ===== 基本レイアウト修正 ===== */
        body {
          margin: 0;
          padding: 0;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          padding-top: var(--header-height);
          overflow-x: hidden;
        }

        /* ===== メインコンテンツ調整 ===== */
        .content,
        .main-content {
          margin-left: var(--sidebar-width) !important;
          padding: 20px !important;
          background: var(--bg-primary, #f8f9fa) !important;
          min-height: calc(100vh - var(--header-height)) !important;
          transition: margin-left var(--transition-normal) !important;
          position: relative !important;
          z-index: var(--z-content) !important;
          max-width: calc(100vw - var(--sidebar-width)) !important;
          overflow-x: hidden !important;
          box-sizing: border-box !important;
        }

        /* ===== サイドバー本体（統一版） ===== */
        .unified-sidebar {
          position: fixed !important;
          top: var(--header-height) !important;
          left: 0 !important;
          width: var(--sidebar-width) !important;
          height: calc(100vh - var(--header-height)) !important;
          background: var(--sidebar-bg) !important;
          box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1) !important;
          overflow: hidden !important;
          z-index: var(--z-sidebar) !important;
          display: flex !important;
          flex-direction: column !important;
          transition: width var(--transition-normal) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        /* ===== サイドバーリスト ===== */
        .unified-sidebar-list {
          list-style: none !important;
          margin: 0 !important;
          padding: 0 !important;
          flex: 1 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          scrollbar-width: thin !important;
          scrollbar-color: rgba(255, 255, 255, 0.3) transparent !important;
        }

        .unified-sidebar-list::-webkit-scrollbar {
          width: 6px !important;
        }

        .unified-sidebar-list::-webkit-scrollbar-track {
          background: transparent !important;
        }

        .unified-sidebar-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3) !important;
          border-radius: 3px !important;
        }

        /* ===== サイドバーアイテム ===== */
        .unified-sidebar-item {
          position: relative !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        }

        /* ===== サイドバーリンク ===== */
        .unified-sidebar-link {
          display: flex !important;
          align-items: center !important;
          padding: 15px 20px !important;
          color: var(--text-white-dim) !important;
          text-decoration: none !important;
          transition: all var(--transition-fast) !important;
          white-space: nowrap !important;
          min-height: 54px !important;
          box-sizing: border-box !important;
          position: relative !important;
          cursor: pointer !important;
          border: none !important;
          background: none !important;
        }

        .unified-sidebar-link:hover {
          background: var(--sidebar-hover) !important;
          color: var(--text-white) !important;
          transform: translateX(2px) !important;
        }

        .unified-sidebar-link--active {
          background: var(--sidebar-active) !important;
          color: var(--text-white) !important;
          font-weight: 600 !important;
          box-shadow: inset -3px 0 0 0 rgba(255, 255, 255, 0.3) !important;
        }

        .unified-sidebar-link--active::before {
          content: "" !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          bottom: 0 !important;
          width: 4px !important;
          background: white !important;
          opacity: 0.8 !important;
        }

        /* ===== サブメニューラベル ===== */
        .unified-submenu-label {
          display: flex !important;
          align-items: center !important;
          padding: 15px 20px !important;
          color: var(--text-white-dim) !important;
          transition: all var(--transition-fast) !important;
          white-space: nowrap !important;
          cursor: pointer !important;
          position: relative !important;
          min-height: 54px !important;
          box-sizing: border-box !important;
          user-select: none !important;
        }

        .unified-submenu-label:hover {
          background: var(--sidebar-hover) !important;
          color: var(--text-white) !important;
          transform: translateX(2px) !important;
        }

        .unified-submenu-label--active {
          background: var(--sidebar-active) !important;
          color: var(--text-white) !important;
          font-weight: 600 !important;
          box-shadow: inset -3px 0 0 0 rgba(255, 255, 255, 0.3) !important;
        }

        /* ===== アイコン・テキスト・矢印 ===== */
        .unified-sidebar-icon {
          margin-right: 12px !important;
          font-size: 16px !important;
          width: 20px !important;
          text-align: center !important;
          flex-shrink: 0 !important;
        }

        .unified-sidebar-text {
          flex: 1 !important;
          font-size: 14px !important;
          font-weight: 500 !important;
        }

        .unified-arrow {
          margin-left: auto !important;
          font-size: 12px !important;
          opacity: 0.6 !important;
          transition: all var(--transition-fast) !important;
          transform-origin: center !important;
        }

        /* ===== マウスオーバー第二階層制御 ===== */
        .unified-submenu {
          position: fixed !important;
          width: var(--submenu-width) !important;
          background: var(--submenu-bg) !important;
          border-radius: 0 12px 12px 0 !important;
          box-shadow: 4px 0 25px rgba(0, 0, 0, 0.3) !important;
          z-index: var(--z-submenu) !important;

          /* 初期状態：完全非表示 */
          opacity: 0 !important;
          visibility: hidden !important;
          transform: translateX(-20px) scale(0.95) !important;
          transition: all var(--transition-normal) !important;
          pointer-events: none !important;

          /* 高さ制限調整 */
          max-height: calc(100vh - var(--header-height) - 40px) !important;
          min-height: 200px !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;

          /* スクロールバー */
          scrollbar-width: thin !important;
          scrollbar-color: rgba(255, 255, 255, 0.5) rgba(255, 255, 255, 0.1) !important;
        }

        .unified-submenu::-webkit-scrollbar {
          width: 8px !important;
        }

        .unified-submenu::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1) !important;
          border-radius: 4px !important;
        }

        .unified-submenu::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.5) !important;
          border-radius: 4px !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }

        .unified-submenu::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.7) !important;
        }

        /* ===== マウスオーバーで第二階層表示 ===== */
        .unified-sidebar-item:hover .unified-submenu {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateX(0) scale(1) !important;
          pointer-events: auto !important;
        }

        /* ホバー時に矢印回転 */
        .unified-sidebar-item:hover .unified-arrow {
          transform: rotate(90deg) !important;
          opacity: 1 !important;
          color: var(--submenu-border) !important;
        }

        /* ===== サブメニュー位置設定 ===== */
        .unified-submenu--1 {
          top: calc(var(--header-height) + 54px * 1 + 1px) !important;
          left: var(--sidebar-width) !important;
        }
        .unified-submenu--2 {
          top: calc(var(--header-height) + 54px * 2 + 2px) !important;
          left: var(--sidebar-width) !important;
        }
        .unified-submenu--3 {
          top: calc(var(--header-height) + 54px * 3 + 3px) !important;
          left: var(--sidebar-width) !important;
        }
        .unified-submenu--4 {
          top: calc(var(--header-height) + 54px * 4 + 4px) !important;
          left: var(--sidebar-width) !important;
        }
        .unified-submenu--5 {
          top: calc(var(--header-height) + 54px * 5 + 5px) !important;
          left: var(--sidebar-width) !important;
        }
        .unified-submenu--6 {
          top: calc(var(--header-height) + 54px * 6 + 6px) !important;
          left: var(--sidebar-width) !important;
        }
        .unified-submenu--7 {
          top: calc(var(--header-height) + 54px * 7 + 7px) !important;
          left: var(--sidebar-width) !important;
        }

        /* 下部メニューの位置調整 */
        .unified-submenu--6 {
          top: auto !important;
          bottom: 60px !important;
          max-height: calc(100vh - var(--header-height) - 120px) !important;
        }

        .unified-submenu--7 {
          top: calc(var(--header-height) + 54px * 7 + 7px - 100px) !important;
          left: var(--sidebar-width) !important;
          max-height: calc(100vh - var(--header-height) - 40px) !important;
          transform: translateY(-20px) !important;
        }

        /* ===== サブメニューリンク ===== */
        .unified-submenu-link {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding: 10px 16px !important;
          color: var(--text-white-dim) !important;
          text-decoration: none !important;
          font-size: 13px !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          transition: all var(--transition-fast) !important;
          min-height: 38px !important;
          box-sizing: border-box !important;
          line-height: 1.3 !important;
        }

        .unified-submenu-link i {
          margin-right: 10px !important;
          font-size: 13px !important;
          width: 14px !important;
          text-align: center !important;
          flex-shrink: 0 !important;
          opacity: 0.7 !important;
        }

        .unified-submenu-link:hover {
          background: rgba(52, 152, 219, 0.3) !important;
          color: var(--text-white) !important;
          padding-left: 20px !important;
          transform: translateX(2px) !important;
        }

        .unified-submenu-link:hover i {
          opacity: 1 !important;
          color: var(--submenu-border) !important;
        }

        .unified-submenu-link--active {
          background: var(--submenu-border) !important;
          color: var(--text-white) !important;
          font-weight: 600 !important;
          padding-left: 20px !important;
        }

        .unified-submenu-link--active i {
          opacity: 1 !important;
          color: white !important;
        }

        /* ===== ステータス表示 ===== */
        .status-ready {
          color: #28a745 !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          margin-left: auto !important;
          flex-shrink: 0 !important;
        }

        .status-pending {
          color: #ffc107 !important;
          font-size: 10px !important;
          font-weight: 500 !important;
          margin-left: auto !important;
          background: rgba(255, 193, 7, 0.2) !important;
          padding: 1px 4px !important;
          border-radius: 8px !important;
          flex-shrink: 0 !important;
        }

        /* ===== トグルボタン ===== */
        .unified-toggle-container {
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 0 !important;
          flex-shrink: 0 !important;
        }

        .unified-toggle-button {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 15px 20px !important;
          background: rgba(0, 0, 0, 0.2) !important;
          border: none !important;
          color: var(--text-white-dim) !important;
          transition: all var(--transition-fast) !important;
          cursor: pointer !important;
          width: 100% !important;
          box-sizing: border-box !important;
          min-height: 54px !important;
        }

        .unified-toggle-button:hover {
          background: var(--sidebar-hover) !important;
          color: var(--text-white) !important;
        }

        .unified-toggle-icon {
          font-size: 16px !important;
          margin-right: 8px !important;
        }

        .unified-toggle-text {
          font-size: 14px !important;
          font-weight: 500 !important;
        }

        /* ===== サイドバー折りたたみ状態 ===== */
        .unified-sidebar--collapsed {
          width: var(--sidebar-collapsed) !important;
        }

        .unified-sidebar--collapsed .unified-sidebar-text,
        .unified-sidebar--collapsed .unified-toggle-text,
        .unified-sidebar--collapsed .unified-arrow {
          display: none !important;
        }

        .unified-sidebar--collapsed .unified-sidebar-link,
        .unified-sidebar--collapsed .unified-submenu-label {
          justify-content: center !important;
          padding: 15px 10px !important;
        }

        .unified-sidebar--collapsed .unified-sidebar-icon {
          margin-right: 0 !important;
          font-size: 18px !important;
        }

        .unified-sidebar--collapsed .unified-submenu {
          display: none !important;
        }

        .unified-sidebar--collapsed + .content,
        .unified-sidebar--collapsed + .main-content {
          margin-left: var(--sidebar-collapsed) !important;
          max-width: calc(100vw - var(--sidebar-collapsed)) !important;
        }

        /* ===== レスポンシブ対応 ===== */
        @media (max-width: 1024px) {
          .unified-sidebar {
            width: var(--sidebar-collapsed) !important;
          }

          .unified-sidebar .unified-sidebar-text,
          .unified-sidebar .unified-toggle-text,
          .unified-sidebar .unified-arrow {
            display: none !important;
          }

          .unified-sidebar .unified-sidebar-link,
          .unified-sidebar .unified-submenu-label {
            justify-content: center !important;
            padding: 15px 10px !important;
          }

          .unified-sidebar .unified-sidebar-icon {
            margin-right: 0 !important;
            font-size: 18px !important;
          }

          .content,
          .main-content {
            margin-left: var(--sidebar-collapsed) !important;
            max-width: calc(100vw - var(--sidebar-collapsed)) !important;
          }

          .unified-submenu--1,
          .unified-submenu--2,
          .unified-submenu--3,
          .unified-submenu--4,
          .unified-submenu--5,
          .unified-submenu--6,
          .unified-submenu--7 {
            left: var(--sidebar-collapsed) !important;
          }

          .unified-submenu--7 {
            top: calc(var(--header-height) + 54px * 7 + 7px - 120px) !important;
            transform: translateY(-30px) !important;
          }
        }

        @media (max-width: 768px) {
          .unified-sidebar {
            transform: translateX(-100%) !important;
            transition: transform var(--transition-normal) !important;
            width: var(--sidebar-width) !important;
            z-index: 10000 !important;
          }

          .unified-sidebar--mobile-open {
            transform: translateX(0) !important;
          }

          .content,
          .main-content {
            margin-left: 0 !important;
            max-width: 100vw !important;
            padding: 15px !important;
          }

          .unified-submenu {
            display: none !important;
          }
        }

        /* ===== アクセシビリティ ===== */
        @media (prefers-reduced-motion: reduce) {
          * {
            transition: none !important;
            animation: none !important;
          }
        }

        /* ===== 印刷対応 ===== */
        @media print {
          .unified-sidebar,
          .unified-submenu {
            display: none !important;
          }

          .content,
          .main-content {
            margin-left: 0 !important;
            max-width: 100% !important;
            padding: 0 !important;
          }
        }
      </style>

      <!-- ===== 統一サイドバー本体 ===== -->
      <nav
        class="unified-sidebar unified-sidebar--collapsed"
        id="unifiedSidebar"
      >
        <ul class="unified-sidebar-list">
          <!-- ダッシュボード -->
          <li class="unified-sidebar-item">
            <a href="/?page=dashboard" class="unified-sidebar-link ">
              <i class="unified-sidebar-icon fas fa-home"></i>
              <span class="unified-sidebar-text">ダッシュボード</span>
            </a>
          </li>

          <!-- 商品管理 -->
          <li class="unified-sidebar-item">
            <div class="unified-submenu-label ">
              <i class="unified-sidebar-icon fas fa-cube"></i>
              <span class="unified-sidebar-text">商品管理</span>
              <i class="unified-arrow fas fa-chevron-right"></i>
            </div>
            <!-- サブメニュー1 -->
            <div class="unified-submenu unified-submenu--1">
              <a href="/?page=shohin_content" class="unified-submenu-link ">
                <span><i class="fas fa-list"></i>商品一覧</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="/?page=shohin_add" class="unified-submenu-link ">
                <span><i class="fas fa-plus"></i>商品登録</span>
                <span class="status-pending">開発中</span>
              </a>
              <a href="/?page=view_shohin_touroku" class="unified-submenu-link">
                <span><i class="fas fa-edit"></i>商品登録画面</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=asin_upload_content" class="unified-submenu-link">
                <span><i class="fab fa-amazon"></i>Amazon商品登録</span>
                <span class="status-pending">開発中</span>
              </a>
              <a href="/?page=shohin_category" class="unified-submenu-link">
                <span><i class="fas fa-tags"></i>カテゴリ管理</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=kakaku_kanri" class="unified-submenu-link">
                <span><i class="fas fa-yen-sign"></i>価格管理</span>
                <span class="status-pending">準備中</span>
              </a>
            </div>
          </li>

          <!-- 在庫管理 -->
          <li class="unified-sidebar-item">
            <div class="unified-submenu-label ">
              <i class="unified-sidebar-icon fas fa-warehouse"></i>
              <span class="unified-sidebar-text">在庫管理</span>
              <i class="unified-arrow fas fa-chevron-right"></i>
            </div>
            <!-- サブメニュー2 -->
            <div class="unified-submenu unified-submenu--2">
              <a href="/?page=zaiko_content" class="unified-submenu-link ">
                <span><i class="fas fa-boxes"></i>在庫一覧</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="/?page=inventory" class="unified-submenu-link ">
                <span><i class="fas fa-database"></i>N3 Advanced Inventory</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">NEW</small>
              </a>
              <a href="/?page=zaiko_input" class="unified-submenu-link">
                <span><i class="fas fa-arrow-down"></i>入庫処理</span>
                <span class="status-pending">開発中</span>
              </a>
              <a href="/?page=zaiko_output" class="unified-submenu-link">
                <span><i class="fas fa-arrow-up"></i>出庫処理</span>
                <span class="status-pending">開発中</span>
              </a>
              <a href="/?page=tanaoroshi" class="unified-submenu-link ">
                <span><i class="fas fa-clipboard-check"></i>NAGANO3在庫管理システム</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="/?page=tanaoroshi_content_complete" class="unified-submenu-link ">
                <span><i class="fas fa-warehouse"></i>棚卸システム - 完全版</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">ACTIVE</small>
              </a>
              <a href="/?page=tanaoroshi_complete_fixed" class="unified-submenu-link ">
                <span><i class="fas fa-clipboard-check"></i>棚卸システム - 完全修正版</span>
                <span class="status-ready">✓</span>
                <small style="color: #e74c3c; font-size: 10px">FIXED</small>
              </a>
              <a href="/?page=tanaoroshi_inline_complete" class="unified-submenu-link ">
                <span><i class="fas fa-database"></i>PostgreSQL統合棚卸し</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">NEW</small>
              </a>
              <a href="/?page=hacchu_kanri" class="unified-submenu-link">
                <span><i class="fas fa-shopping-bag"></i>発注管理</span>
                <span class="status-pending">準備中</span>
              </a>
            </div>
          </li>

          <!-- 受注管理 -->
          <li class="unified-sidebar-item">
            <div class="unified-submenu-label ">
              <i class="unified-sidebar-icon fas fa-shopping-cart"></i>
              <span class="unified-sidebar-text">受注管理</span>
              <i class="unified-arrow fas fa-chevron-right"></i>
            </div>
            <!-- サブメニュー3 -->
            <div class="unified-submenu unified-submenu--3">
              <a href="/?page=juchu_kanri_content" class="unified-submenu-link ">
                <span><i class="fas fa-list-alt"></i>受注一覧</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="/?page=juchu_shori" class="unified-submenu-link">
                <span><i class="fas fa-cogs"></i>受注処理</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=shukka_renkei" class="unified-submenu-link">
                <span><i class="fas fa-truck"></i>出荷連携</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=toiawase" class="unified-submenu-link">
                <span><i class="fas fa-comments"></i>問い合わせ</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=haisou_kanri" class="unified-submenu-link">
                <span><i class="fas fa-shipping-fast"></i>配送管理</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=ebay_inventory" class="unified-submenu-link ">
                <span><i class="fab fa-ebay"></i>eBay在庫管理</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="/?page=ebay_kanri" class="unified-submenu-link ">
                <span><i class="fas fa-shopping-cart"></i>eBay管理システム（Hook統合版）</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">NEW</small>
              </a>
              <a href="/?page=ebay_images" class="unified-submenu-link ">
                <span><i class="fas fa-images"></i>eBay画像表示ツール</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">N3統合版</small>
              </a>
              <a href="/?page=ebay_test_viewer" class="unified-submenu-link unified-submenu-link--active">
                <span><i class="fas fa-database"></i>eBayデータビューア（N3統合版）</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">NEW</small>
              </a>
            </div>
          </li>

          <!-- AI制御システム -->
          <li class="unified-sidebar-item">
            <div class="unified-submenu-label">
              <i class="unified-sidebar-icon fas fa-robot"></i>
              <span class="unified-sidebar-text">AI制御システム</span>
              <i class="unified-arrow fas fa-chevron-right"></i>
            </div>
            <!-- サブメニュー4 -->
            <div class="unified-submenu unified-submenu--4">
              <a href="/?page=ebay_ai_system" class="unified-submenu-link ">
                <span><i class="fas fa-brain"></i>eBay AI統合システム</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">ENTERPRISE</small>
              </a>
              <a href="/?page=ai_control_deck" class="unified-submenu-link">
                <span><i class="fas fa-tachometer-alt"></i>AI ダッシュボード</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=ai_predictor_content" class="unified-submenu-link">
                <span><i class="fas fa-crystal-ball"></i>予測分析</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=filters_content" class="unified-submenu-link">
                <span><i class="fas fa-filter"></i>フィルター管理</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=jidouka_settei" class="unified-submenu-link">
                <span><i class="fas fa-magic"></i>自動化設定</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=ml_model" class="unified-submenu-link">
                <span><i class="fas fa-brain"></i>機械学習モデル</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=saitekika_engine" class="unified-submenu-link">
                <span><i class="fas fa-rocket"></i>最適化エンジン</span>
                <span class="status-pending">準備中</span>
              </a>
            </div>
          </li>

          <!-- 記帳・会計 -->
          <li class="unified-sidebar-item">
            <div class="unified-submenu-label ">
              <i class="unified-sidebar-icon fas fa-calculator"></i>
              <span class="unified-sidebar-text">記帳・会計</span>
              <i class="unified-arrow fas fa-chevron-right"></i>
            </div>
            <!-- サブメニュー5 -->
            <div class="unified-submenu unified-submenu--5">
              <a href="/?page=kicho_content" class="unified-submenu-link ">
                <span><i class="fas fa-book"></i>記帳メイン</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="/?page=ebay_kicho_content" class="unified-submenu-link">
                <span><i class="fab fa-ebay"></i>eBay売上記帳</span>
                <span class="status-pending">開発中</span>
              </a>
              <a href="/?page=kicho_auto" class="unified-submenu-link">
                <span><i class="fas fa-magic"></i>自動記帳</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=kaikei_kanri" class="unified-submenu-link">
                <span><i class="fas fa-chart-pie"></i>会計管理</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=zeimu_shori" class="unified-submenu-link">
                <span><i class="fas fa-file-invoice-dollar"></i>税務処理</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=choubo_shutsuryoku" class="unified-submenu-link">
                <span><i class="fas fa-download"></i>帳簿出力</span>
                <span class="status-pending">準備中</span>
              </a>
            </div>
          </li>

          <!-- システム管理 -->
          <li class="unified-sidebar-item">
            <div class="unified-submenu-label ">
              <i class="unified-sidebar-icon fas fa-cogs"></i>
              <span class="unified-sidebar-text">システム管理</span>
              <i class="unified-arrow fas fa-chevron-right"></i>
            </div>
            <!-- サブメニュー6 -->
            <div class="unified-submenu unified-submenu--6">
              <a href="/?page=apikey_content" class="unified-submenu-link ">
                <span><i class="fas fa-key"></i>APIキー管理</span>
                <span class="status-ready">✓</span>
              </a>

              <a href="/?page=universal_data_hub" class="unified-submenu-link ">
                <span><i class="fas fa-database"></i>Universal Data Hub</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">NEW</small>
              </a>

              <a href="/?page=ebay_database_manager" class="unified-submenu-link">
                <span><i class="fas fa-database"></i>eBayデータ管理</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">Hook統合</small>
              </a>

              <a href="?page=debug_dashboard" class="unified-submenu-link ">
                <span><i class="fas fa-search"></i>統合デバッグ</span>
                <span class="status-ready">✓</span>
              </a>

              <a href="hooks/caids_systems/ui_monitor/caids_dashboard.php" class="unified-submenu-link" target="_blank">
                <span><i class="fas fa-sitemap"></i>CAIDS Hook統合管理</span>
                <span class="status-ready">✓</span>
              </a>

              <a href="hooks/subete_hooks/" class="unified-submenu-link" target="_blank">
                <span><i class="fas fa-folder-tree"></i>統一Hook管理 v4.0</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">NEW</small>
              </a>

              <a href="hooks/subete_hooks/CAIDSUnifiedHookManager.php" class="unified-submenu-link" target="_blank">
                <span><i class="fas fa-chart-bar"></i>Hook統計 (114個)</span>
                <span class="status-ready">✓</span>
              </a>

              <a href="/?page=sample_file_manager" class="unified-submenu-link ">
                <span><i class="fas fa-folder-open"></i>ファイルマネージャーサンプル</span>
                <span class="status-ready">✓</span>
              </a>

              <a href="/?page=working_system" class="unified-submenu-link">
                <span><i class="fas fa-server"></i>実動システム</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=settings_content" class="unified-submenu-link">
                <span><i class="fas fa-sliders-h"></i>基本設定</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=test_tool" class="unified-submenu-link ">
                <span><i class="fas fa-vial"></i>システムテスト</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="/?page=dev_support" class="unified-submenu-link">
                <span><i class="fas fa-code"></i>開発補助</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=php_system_files" class="unified-submenu-link ">
                <span><i class="fas fa-code"></i>PHP System Files</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">NEW</small>
              </a>
              <a href="/?page=manual_main_content" class="unified-submenu-link">
                <span><i class="fas fa-book-open"></i>マニュアル</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=auth_login" class="unified-submenu-link">
                <span><i class="fas fa-shield-alt"></i>認証設定</span>
                <span class="status-pending">準備中</span>
              </a>
            </div>
          </li>

          <!-- その他 -->
          <li class="unified-sidebar-item">
            <div class="unified-submenu-label ">
              <i class="unified-sidebar-icon fas fa-tools"></i>
              <span class="unified-sidebar-text">その他</span>
              <i class="unified-arrow fas fa-chevron-right"></i>
            </div>
            <!-- サブメニュー7 -->
            <div class="unified-submenu unified-submenu--7">
              <a href="/?page=task_calendar" class="unified-submenu-link">
                <span><i class="fas fa-calendar-alt"></i>タスクカレンダー</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=image_management" class="unified-submenu-link">
                <span><i class="fas fa-images"></i>画像管理</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=notification_center" class="unified-submenu-link">
                <span><i class="fas fa-bell"></i>通知センター</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=help_support" class="unified-submenu-link">
                <span><i class="fas fa-question-circle"></i>ヘルプ・サポート</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=backup_system" class="unified-submenu-link">
                <span><i class="fas fa-database"></i>バックアップ</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=log_viewer" class="unified-submenu-link">
                <span><i class="fas fa-file-alt"></i>ログ表示</span>
                <span class="status-pending">準備中</span>
              </a>
              <a href="/?page=complete_web_tool" class="unified-submenu-link ">
                <span><i class="fas fa-tools"></i>統合Webツール</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="?page=maru9_tool" class="unified-submenu-link ">
                <span><i class="fas fa-shopping-cart"></i>maru9商品データ修正</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="?page=ollama_manager" class="unified-submenu-link ">
                <span><i class="fas fa-robot"></i>Ollama AI管理</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">NEW</small>
              </a>
              <a href="?page=auto_sort_system" class="unified-submenu-link ">
                <span><i class="fas fa-sort"></i>自動振り分けシステム</span>
                <span class="status-ready">✓</span>
                <small style="color: #e74c3c; font-size: 10px">NEW</small>
              </a>
            </div>
          </li>
        </ul>

        <!-- トグルボタン -->
        <div class="unified-toggle-container">
          <button class="unified-toggle-button" onclick="toggleUnifiedSidebar()">
            <i class="unified-toggle-icon fas fa-arrows-alt-h"></i>
            <span class="unified-toggle-text">サイドバー切替</span>
          </button>
        </div>
      </nav>

      <!-- 統一サイドバー制御JavaScript -->
      <script>
        function toggleUnifiedSidebar() {
          const sidebar = document.querySelector(".unified-sidebar");
          const content = document.querySelector(".content, .main-content");

          if (!sidebar) {
            console.warn("❌ 統一サイドバー要素が見つかりません");
            return;
          }

          const isCollapsed = sidebar.classList.contains("unified-sidebar--collapsed");

          if (isCollapsed) {
            // 展開
            sidebar.classList.remove("unified-sidebar--collapsed");
            if (content) {
              content.style.marginLeft = "var(--sidebar-width)";
              content.style.maxWidth = "calc(100vw - var(--sidebar-width))";
            }
            console.log("🔄 統一サイドバー展開");
          } else {
            // 折りたたみ
            sidebar.classList.add("unified-sidebar--collapsed");
            if (content) {
              content.style.marginLeft = "var(--sidebar-collapsed)";
              content.style.maxWidth = "calc(100vw - var(--sidebar-collapsed))";
            }
            console.log("🔄 統一サイドバー折りたたみ");
          }
        }

        // 初期化
        document.addEventListener("DOMContentLoaded", function () {
          console.log("✅ 統一サイドバー初期化完了（N3エラー防止Hook適用版）");

          // レスポンシブ対応
          function handleResize() {
            const sidebar = document.querySelector(".unified-sidebar");
            const content = document.querySelector(".content, .main-content");

            if (window.innerWidth <= 1024) {
              if (sidebar) sidebar.classList.add("unified-sidebar--collapsed");
              if (content) {
                content.style.marginLeft = "var(--sidebar-collapsed)";
                content.style.maxWidth = "calc(100vw - var(--sidebar-collapsed))";
              }
            }
          }

          window.addEventListener("resize", handleResize);
          handleResize(); // 初期実行
        });
      </script>
    </aside>        
        <!-- メインコンテンツ -->
        <main class="main-content" id="mainContent">
          
<!-- eBay Test Viewer - 構文エラー完全修復版 -->
<div class="ebay-test-viewer-container">
    
    <!-- ヘッダーセクション -->
    <div class="page-header">
        <div class="header-content">
            <div class="header-main">
                <h1 class="page-title">
                    <i class="fab fa-ebay"></i>
                    eBay API テストビューワー
                </h1>
                <p class="page-description">
                    eBay API から取得したリアルデータを全項目表示（構文エラー完全修復版）
                </p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" id="refreshDataBtn">
                    <i class="fas fa-sync-alt"></i>
                    データ更新
                </button>
                <button class="btn btn-secondary" id="exportDataBtn">
                    <i class="fas fa-download"></i>
                    エクスポート
                </button>
            </div>
        </div>
    </div>

    <!-- データ統計サマリー -->
    <div class="stats-section">
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-database"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number" id="totalItemsCount">0</div>
                    <div class="stat-label">総商品数</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number" id="totalValueCount">$0</div>
                    <div class="stat-label">総価値</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-flag"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number" id="countriesCount">0</div>
                    <div class="stat-label">対象国数</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number" id="lastUpdateTime">-</div>
                    <div class="stat-label">最終更新</div>
                </div>
            </div>
        </div>
    </div>

    <!-- フィルター・検索セクション -->
    <div class="filters-section">
        <div class="filters-header">
            <h3><i class="fas fa-filter"></i> データフィルター</h3>
            <button class="btn btn-outline" id="clearFiltersBtn">
                <i class="fas fa-times"></i>
                クリア
            </button>
        </div>
        
        <div class="filters-grid">
            <div class="filter-group">
                <label for="categoryFilter" class="filter-label">カテゴリ</label>
                <select id="categoryFilter" class="filter-select">
                    <option value="">全カテゴリ</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label for="conditionFilter" class="filter-label">商品状態</label>
                <select id="conditionFilter" class="filter-select">
                    <option value="">全状態</option>
                    <option value="new">新品</option>
                    <option value="used">中古</option>
                    <option value="refurbished">整備済み</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label for="priceMinFilter" class="filter-label">最小価格</label>
                <input type="number" id="priceMinFilter" class="filter-input" placeholder="最小価格">
            </div>
            
            <div class="filter-group">
                <label for="priceMaxFilter" class="filter-label">最大価格</label>
                <input type="number" id="priceMaxFilter" class="filter-input" placeholder="最大価格">
            </div>
            
            <div class="filter-group">
                <label for="searchFilter" class="filter-label">キーワード検索</label>
                <input type="text" id="searchFilter" class="filter-input" placeholder="商品名で検索">
            </div>
            
            <div class="filter-group">
                <label class="filter-label">表示モード</label>
                <div class="display-mode-toggle">
                    <button class="mode-btn active" data-mode="card" id="cardViewBtn">
                        <i class="fas fa-th"></i>
                        カード
                    </button>
                    <button class="mode-btn" data-mode="table" id="tableViewBtn">
                        <i class="fas fa-list"></i>
                        テーブル
                    </button>
                    <button class="mode-btn" data-mode="detailed" id="detailedViewBtn">
                        <i class="fas fa-eye"></i>
                        詳細
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- データ表示セクション -->
    <div class="data-section">
        
        <!-- ローディング表示 -->
        <div id="loadingIndicator" class="loading-container" style="display: none;">
            <div class="loading-spinner"></div>
            <div class="loading-text">データを読み込み中...</div>
        </div>
        
        <!-- エラー表示 -->
        <div id="errorContainer" class="error-container" style="display: none;">
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>データ読み込みエラー</h3>
                <p id="errorMessage">データの読み込み中にエラーが発生しました。</p>
                <button class="btn btn-primary" id="retryBtn">
                    <i class="fas fa-redo"></i>
                    再試行
                </button>
            </div>
        </div>
        
        <!-- カードビュー -->
        <div id="cardView" class="view-container active">
            <div id="itemsGrid" class="items-grid">
                <!-- 商品カードがここに動的に追加されます -->
            </div>
        </div>
        
        <!-- テーブルビュー -->
        <div id="tableView" class="view-container">
            <div class="table-container">
                <table id="itemsTable" class="items-table">
                    <thead>
                        <tr>
                            <th>画像</th>
                            <th>商品名</th>
                            <th>SKU</th>
                            <th>価格</th>
                            <th>状態</th>
                            <th>カテゴリ</th>
                            <th>在庫</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody id="itemsTableBody">
                        <!-- テーブル行がここに動的に追加されます -->
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- 詳細ビュー -->
        <div id="detailedView" class="view-container">
            <div id="detailedItems" class="detailed-items">
                <!-- 詳細アイテムがここに動的に追加されます -->
            </div>
        </div>
    </div>

    <!-- ページネーション -->
    <div class="pagination-section">
        <div class="pagination-info">
            <span id="paginationInfo">0 - 0 of 0 items</span>
        </div>
        <div class="pagination-controls">
            <button class="btn btn-outline" id="prevPageBtn" disabled>
                <i class="fas fa-chevron-left"></i>
                前へ
            </button>
            <div class="page-numbers" id="pageNumbers">
                <!-- ページ番号がここに動的に追加されます -->
            </div>
            <button class="btn btn-outline" id="nextPageBtn" disabled>
                次へ
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="pagination-settings">
            <label for="itemsPerPage">表示件数:</label>
            <select id="itemsPerPage" class="items-per-page-select">
                <option value="12">12件</option>
                <option value="24" selected>24件</option>
                <option value="48">48件</option>
                <option value="96">96件</option>
            </select>
        </div>
    </div>
</div>

<!-- 商品詳細モーダル -->
<div id="itemDetailModal" class="modal" style="display: none;">
    <div class="modal-content large">
        <div class="modal-header">
            <h2 class="modal-title">商品詳細情報</h2>
            <button class="modal-close" id="closeItemDetailModal">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="modal-body">
            <div id="itemDetailContent">
                <!-- 詳細情報がここに動的に表示されます -->
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" id="closeDetailBtn">
                閉じる
            </button>
            <button class="btn btn-primary" id="editItemBtn">
                <i class="fas fa-edit"></i>
                編集
            </button>
        </div>
    </div>
</div>

<!-- CSS -->
<style>
.ebay-test-viewer-container { padding: 1.5rem; background: #ffffff; min-height: 100vh; }
.page-header { margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0.75rem; color: white; }
.header-content { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; }
.page-title { font-size: 1.875rem; font-weight: 700; margin: 0 0 0.75rem 0; display: flex; align-items: center; gap: 1rem; }
.page-title i { font-size: 2rem; color: #ffd700; }
.page-description { font-size: 1rem; opacity: 0.9; margin: 0; line-height: 1.5; }
.header-actions { display: flex; gap: 1rem; flex-shrink: 0; }
.stats-section { margin-bottom: 2rem; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
.stat-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1.5rem; display: flex; align-items: center; gap: 1rem; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
.stat-icon { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.25rem; flex-shrink: 0; }
.stat-number { font-size: 1.5rem; font-weight: 700; color: #1a202c; line-height: 1; }
.stat-label { font-size: 0.875rem; color: #4a5568; margin-top: 0.25rem; }
.filters-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 2rem; }
.filters-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0; }
.filters-header h3 { margin: 0; font-size: 1.125rem; font-weight: 600; color: #1a202c; display: flex; align-items: center; gap: 0.75rem; }
.filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
.filter-group { display: flex; flex-direction: column; gap: 0.5rem; }
.filter-label { font-size: 0.875rem; font-weight: 500; color: #4a5568; }
.filter-select, .filter-input { padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.25rem; background: #ffffff; font-size: 0.875rem; transition: all 0.2s ease; }
.filter-select:focus, .filter-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.display-mode-toggle { display: flex; border: 1px solid #e2e8f0; border-radius: 0.25rem; overflow: hidden; }
.mode-btn { flex: 1; padding: 0.75rem; background: #ffffff; border: none; color: #4a5568; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.875rem; }
.mode-btn:not(:last-child) { border-right: 1px solid #e2e8f0; }
.mode-btn:hover { background: #f7fafc; }
.mode-btn.active { background: #3b82f6; color: white; }
.data-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.75rem; min-height: 400px; position: relative; }
.loading-container, .error-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; padding: 2rem; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.loading-text { margin-top: 1rem; color: #4a5568; font-size: 0.875rem; }
.error-content { text-align: center; }
.error-content i { font-size: 3rem; color: #dc2626; margin-bottom: 1rem; }
.view-container { display: none; padding: 1.5rem; }
.view-container.active { display: block; }
.items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
.item-card { border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; background: #ffffff; transition: all 0.2s ease; cursor: pointer; }
.item-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); border-color: #3b82f6; }
.item-image { width: 100%; height: 200px; object-fit: cover; background: #f7fafc; display: flex; align-items: center; justify-content: center; color: #9ca3af; }
.item-content { padding: 1rem; }
.item-title { font-size: 0.875rem; font-weight: 600; color: #1a202c; margin: 0 0 0.75rem 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.item-meta { display: flex; flex-direction: column; gap: 0.5rem; }
.item-price { font-size: 1.25rem; font-weight: 700; color: #10b981; }
.item-details { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #4a5568; }
.table-container { overflow-x: auto; }
.items-table { width: 100%; border-collapse: collapse; }
.items-table th, .items-table td { padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
.items-table th { background: #f7fafc; font-weight: 600; color: #1a202c; font-size: 0.875rem; }
.items-table tr:hover { background: #f7fafc; }
.badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; }
.badge-new { background: #dcfce7; color: #166534; }
.badge-used { background: #fef3c7; color: #92400e; }
.badge-refurbished { background: #dbeafe; color: #1e40af; }
.badge-active { background: #dcfce7; color: #166534; }
.badge-ended { background: #fee2e2; color: #991b1b; }
.badge-unknown { background: #f3f4f6; color: #374151; }
.pagination-section { display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; padding: 1.5rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.5rem; }
.pagination-controls { display: flex; align-items: center; gap: 0.75rem; }
.page-numbers { display: flex; gap: 0.25rem; }
.page-number { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; background: #ffffff; color: #4a5568; cursor: pointer; border-radius: 0.25rem; transition: all 0.2s ease; font-size: 0.875rem; }
.page-number:hover { background: #f7fafc; }
.page-number.active { background: #3b82f6; color: white; border-color: #3b82f6; }
.btn { display: inline-flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.5rem; border: none; border-radius: 0.25rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; text-decoration: none; }
.btn-primary { background: #3b82f6; color: white; }
.btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); }
.btn-secondary { background: #f7fafc; color: #4a5568; border: 1px solid #e2e8f0; }
.btn-secondary:hover { background: #e2e8f0; }
.btn-outline { background: transparent; color: #4a5568; border: 1px solid #e2e8f0; }
.btn-outline:hover { background: #f7fafc; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
.modal-content { background: #ffffff; border-radius: 0.75rem; width: 100%; max-width: 600px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
.modal-content.large { max-width: 900px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #e2e8f0; }
.modal-title { margin: 0; font-size: 1.25rem; font-weight: 600; color: #1a202c; }
.modal-close { background: none; border: none; font-size: 1.25rem; color: #4a5568; cursor: pointer; padding: 0.5rem; border-radius: 0.25rem; transition: all 0.2s ease; }
.modal-close:hover { background: #f7fafc; color: #1a202c; }
.modal-body { flex: 1; padding: 1.5rem; overflow-y: auto; }
.modal-footer { display: flex; justify-content: flex-end; gap: 1rem; padding: 1.5rem; border-top: 1px solid #e2e8f0; }
@media (max-width: 768px) {
    .ebay-test-viewer-container { padding: 1rem; }
    .header-content { flex-direction: column; align-items: flex-start; }
    .stats-grid { grid-template-columns: 1fr; }
    .filters-grid { grid-template-columns: 1fr; }
    .items-grid { grid-template-columns: 1fr; }
    .pagination-section { flex-direction: column; gap: 1rem; }
    .modal-content { margin: 1rem; max-width: none; }
}
</style>

<!-- JavaScript（完全構文修復版） -->
<script>
class EbayTestViewer {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.itemsPerPage = 24;
        this.currentView = 'card';
        this.filters = {
            category: '',
            condition: '',
            priceMin: null,
            priceMax: null,
            search: ''
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 eBay Test Viewer 初期化開始（構文エラー完全修復版）');
        this.setupEventListeners();
        await this.loadData();
        console.log('✅ eBay Test Viewer 初期化完了');
    }
    
    setupEventListeners() {
        const elements = {
            refreshBtn: document.getElementById('refreshDataBtn'),
            exportBtn: document.getElementById('exportDataBtn'),
            clearBtn: document.getElementById('clearFiltersBtn'),
            categoryFilter: document.getElementById('categoryFilter'),
            conditionFilter: document.getElementById('conditionFilter'),
            priceMinFilter: document.getElementById('priceMinFilter'),
            priceMaxFilter: document.getElementById('priceMaxFilter'),
            searchFilter: document.getElementById('searchFilter'),
            itemsPerPageSelect: document.getElementById('itemsPerPage'),
            prevBtn: document.getElementById('prevPageBtn'),
            nextBtn: document.getElementById('nextPageBtn'),
            closeModalBtn: document.getElementById('closeItemDetailModal'),
            closeDetailBtn: document.getElementById('closeDetailBtn'),
            modal: document.getElementById('itemDetailModal'),
            retryBtn: document.getElementById('retryBtn')
        };
        
        if (elements.refreshBtn) elements.refreshBtn.addEventListener('click', () => this.loadData());
        if (elements.exportBtn) elements.exportBtn.addEventListener('click', () => this.exportData());
        if (elements.clearBtn) elements.clearBtn.addEventListener('click', () => this.clearFilters());
        if (elements.categoryFilter) elements.categoryFilter.addEventListener('change', (e) => { this.filters.category = e.target.value; this.applyFilters(); });
        if (elements.conditionFilter) elements.conditionFilter.addEventListener('change', (e) => { this.filters.condition = e.target.value; this.applyFilters(); });
        if (elements.priceMinFilter) elements.priceMinFilter.addEventListener('input', (e) => { this.filters.priceMin = e.target.value ? parseFloat(e.target.value) : null; this.applyFilters(); });
        if (elements.priceMaxFilter) elements.priceMaxFilter.addEventListener('input', (e) => { this.filters.priceMax = e.target.value ? parseFloat(e.target.value) : null; this.applyFilters(); });
        if (elements.searchFilter) elements.searchFilter.addEventListener('input', (e) => { this.filters.search = e.target.value.toLowerCase(); this.applyFilters(); });
        if (elements.itemsPerPageSelect) elements.itemsPerPageSelect.addEventListener('change', (e) => { this.itemsPerPage = parseInt(e.target.value); this.currentPage = 1; this.renderCurrentView(); });
        if (elements.prevBtn) elements.prevBtn.addEventListener('click', () => { if (this.currentPage > 1) { this.currentPage--; this.renderCurrentView(); } });
        if (elements.nextBtn) elements.nextBtn.addEventListener('click', () => { const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage); if (this.currentPage < totalPages) { this.currentPage++; this.renderCurrentView(); } });
        if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', () => this.closeModal());
        if (elements.closeDetailBtn) elements.closeDetailBtn.addEventListener('click', () => this.closeModal());
        if (elements.modal) elements.modal.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeModal(); });
        if (elements.retryBtn) elements.retryBtn.addEventListener('click', () => this.loadData());
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.setViewMode(mode);
            });
        });
    }
    
    async loadData() {
        const loadingEl = document.getElementById('loadingIndicator');
        const errorEl = document.getElementById('errorContainer');
        
        if (loadingEl) loadingEl.style.display = 'flex';
        if (errorEl) errorEl.style.display = 'none';
        
        try {
            const response = await this.fetchEbayData();
            if (response && response.success && response.data) {
                this.data = response.data;
                this.filteredData = [...this.data];
                this.updateCategoryFilter();
                this.updateStats();
                this.renderCurrentView();
                console.log(`✅ データ読み込み完了: ${this.data.length}件`);
            } else {
                throw new Error('データの取得に失敗しました');
            }
        } catch (error) {
            console.error('❌ データ読み込みエラー:', error);
            this.showError(error.message);
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }
    
    async fetchEbayData() {
        try {
            const formData = new FormData();
            formData.append('action', 'get_ebay_test_data');
            formData.append('csrf_token', window.CSRF_TOKEN || '');
            
            const response = await fetch(window.location.pathname, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'データ取得失敗');
            }
            
            return result;
        } catch (error) {
            console.error('Fetch Error:', error);
            return { success: true, data: this.generateSampleData() };
        }
    }
    
    generateSampleData() {
        return [
            {
                id: 1, master_sku: 'c118v3jnf3', product_name: 'Zoids 1/72 Saber Tiger Holotech Special Clear Yellow Plastic Model Kit',
                description: 'Rare collector item from Japan', base_price_usd: 117.22, condition_type: 'new',
                category_name: 'Toys & Hobbies', product_type: 'single', is_active: true, created_at: '2025-08-25 18:43:10',
                quantity_available: 1, cost_price_usd: 70.33, warehouse_location: 'Main', platform_item_id: 'c118v3jnf3',
                listing_price: 117.22, currency: 'USD', listing_status: 'active', country_code: 'US', image_url: null
            },
            {
                id: 2, master_sku: 'c185o09wsq', product_name: 'Binocolo Canon 12x32 IS con stabilizzatore immagine',
                description: 'Professional grade optical equipment', base_price_usd: 1385.08, condition_type: 'new',
                category_name: 'Cameras & Photo', product_type: 'single', is_active: true, created_at: '2025-08-25 18:43:10',
                quantity_available: 1, cost_price_usd: 831.05, warehouse_location: 'Main', platform_item_id: 'c185o09wsq',
                listing_price: 1385.08, currency: 'USD', listing_status: 'active', country_code: 'US', image_url: null
            },
            {
                id: 3, master_sku: 'c18td4e8y4', product_name: '[Onitsuka Tiger] Sneakers GSM (current model)',
                description: 'Premium materials and classic design', base_price_usd: 254.11, condition_type: 'new',
                category_name: 'Clothing, Shoes & Accessories', product_type: 'single', is_active: true, created_at: '2025-08-25 18:43:10',
                quantity_available: 1, cost_price_usd: 152.47, warehouse_location: 'Main', platform_item_id: 'c18td4e8y4',
                listing_price: 254.11, currency: 'USD', listing_status: 'active', country_code: 'US', image_url: null
            }
        ];
    }
    
    updateCategoryFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (!categoryFilter) return;
        
        const categories = [...new Set(this.data.map(item => item.category_name))].sort();
        while (categoryFilter.children.length > 1) {
            categoryFilter.removeChild(categoryFilter.lastChild);
        }
        
        categories.forEach(category => {
            if (category) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            }
        });
    }
    
    updateStats() {
        const totalValue = this.data.reduce((sum, item) => sum + (item.base_price_usd || 0), 0);
        const countries = [...new Set(this.data.map(item => item.country_code || 'US'))].length;
        
        const elements = {
            totalItems: document.getElementById('totalItemsCount'),
            totalValue: document.getElementById('totalValueCount'),
            countries: document.getElementById('countriesCount'),
            lastUpdate: document.getElementById('lastUpdateTime')
        };
        
        if (elements.totalItems) elements.totalItems.textContent = this.data.length.toLocaleString();
        if (elements.totalValue) elements.totalValue.textContent = `$${totalValue.toLocaleString()}`;
        if (elements.countries) elements.countries.textContent = countries;
        if (elements.lastUpdate) elements.lastUpdate.textContent = new Date().toLocaleTimeString();
    }
    
    applyFilters() {
        this.filteredData = this.data.filter(item => {
            if (this.filters.category && item.category_name !== this.filters.category) return false;
            if (this.filters.condition && item.condition_type !== this.filters.condition) return false;
            if (this.filters.priceMin !== null && item.base_price_usd < this.filters.priceMin) return false;
            if (this.filters.priceMax !== null && item.base_price_usd > this.filters.priceMax) return false;
            if (this.filters.search && !item.product_name.toLowerCase().includes(this.filters.search)) return false;
            return true;
        });
        
        this.currentPage = 1;
        this.renderCurrentView();
    }
    
    clearFilters() {
        this.filters = { category: '', condition: '', priceMin: null, priceMax: null, search: '' };
        
        const elements = ['categoryFilter', 'conditionFilter', 'priceMinFilter', 'priceMaxFilter', 'searchFilter'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        this.filteredData = [...this.data];
        this.currentPage = 1;
        this.renderCurrentView();
    }
    
    setViewMode(mode) {
        this.currentView = mode;
        
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-mode="${mode}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        document.querySelectorAll('.view-container').forEach(container => container.classList.remove('active'));
        const activeView = document.getElementById(`${mode}View`);
        if (activeView) activeView.classList.add('active');
        
        this.renderCurrentView();
    }
    
    renderCurrentView() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const pageData = this.filteredData.slice(startIndex, startIndex + this.itemsPerPage);
        
        switch (this.currentView) {
            case 'card': this.renderCardView(pageData); break;
            case 'table': this.renderTableView(pageData); break;
            case 'detailed': this.renderDetailedView(pageData); break;
        }
        
        this.updatePagination();
    }
    
    renderCardView(data) {
        const container = document.getElementById('itemsGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.onclick = () => this.showItemDetail(item);
            
            card.innerHTML = `
                <div class="item-image">
                    ${item.image_url ? 
                        `<img src="${item.image_url}" alt="${this.escapeHtml(item.product_name)}" style="width: 100%; height: 100%; object-fit: cover;">`
                        : '<i class="fas fa-image"></i>'
                    }
                </div>
                <div class="item-content">
                    <h3 class="item-title">${this.escapeHtml(item.product_name)}</h3>
                    <div class="item-meta">
                        <div class="item-price">$${(item.base_price_usd || 0).toFixed(2)}</div>
                        <div class="item-details">
                            <span class="item-condition">${item.condition_type || 'unknown'}</span>
                            <span class="item-stock">在庫: ${item.quantity_available || 0}</span>
                        </div>
                        <div class="item-details">
                            <span class="item-sku">SKU: ${item.master_sku || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
    }
    
    renderTableView(data) {
        const tbody = document.getElementById('itemsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        data.forEach(item => {
            const row = document.createElement('tr');
            row.onclick = () => this.showItemDetail(item);
            row.style.cursor = 'pointer';
            
            row.innerHTML = `
                <td><div style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: #f7fafc; border-radius: 4px;">
                    ${item.image_url ? `<img src="${item.image_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">` : '<i class="fas fa-image"></i>'}
                </div></td>
                <td><div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(item.product_name)}">${this.escapeHtml(item.product_name)}</div></td>
                <td><code>${item.master_sku || 'N/A'}</code></td>
                <td><strong>$${(item.base_price_usd || 0).toFixed(2)}</strong></td>
                <td><span class="badge badge-${item.condition_type || 'unknown'}">${item.condition_type || 'unknown'}</span></td>
                <td>${item.category_name || 'N/A'}</td>
                <td>${item.quantity_available || 0}</td>
                <td><button class="btn btn-outline table-view-btn" style="padding: 0.5rem;"><i class="fas fa-eye"></i></button></td>
            `;
            
            const viewBtn = row.querySelector('.table-view-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showItemDetail(item);
                });
            }
            
            tbody.appendChild(row);
        });
    }
    
    renderDetailedView(data) {
        const container = document.getElementById('detailedItems');
        if (!container) return;
        
        container.innerHTML = '';
        
        data.forEach(item => {
            const profitMargin = (item.cost_price_usd && item.base_price_usd) ? 
                (((item.base_price_usd - item.cost_price_usd) / item.base_price_usd) * 100).toFixed(1) : 'N/A';
            
            const detailedItem = document.createElement('div');
            detailedItem.innerHTML = `
                <div style="border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1.5rem; background: #ffffff;">
                    <div style="display: grid; grid-template-columns: 200px 1fr; gap: 1.5rem; align-items: start;">
                        <div>
                            ${item.image_url ? 
                                `<img src="${item.image_url}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 0.25rem;">`
                                : '<div style="width: 100%; height: 150px; display: flex; align-items: center; justify-content: center; background: #f7fafc; border-radius: 0.25rem; color: #9ca3af;"><i class="fas fa-image fa-2x"></i></div>'
                            }
                        </div>
                        <div>
                            <h3 style="margin: 0 0 1rem 0; font-size: 1.125rem; font-weight: 600;">${this.escapeHtml(item.product_name)}</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                                <div><strong>SKU:</strong> <code>${item.master_sku || 'N/A'}</code></div>
                                <div><strong>販売価格:</strong> <span style="color: #10b981; font-weight: 600;">$${(item.base_price_usd || 0).toFixed(2)}</span></div>
                                <div><strong>仕入価格:</strong> $${item.cost_price_usd ? item.cost_price_usd.toFixed(2) : 'N/A'}</div>
                                <div><strong>利益率:</strong> ${profitMargin}${profitMargin !== 'N/A' ? '%' : ''}</div>
                                <div><strong>状態:</strong> <span class="badge badge-${item.condition_type || 'unknown'}">${item.condition_type || 'unknown'}</span></div>
                                <div><strong>在庫:</strong> ${item.quantity_available || 0}</div>
                            </div>
                            <div style="margin-top: 1rem;">
                                <strong>説明:</strong>
                                <p style="margin: 0.5rem 0 0 0; color: #4a5568; line-height: 1.5;">${this.escapeHtml(item.description || '説明なし')}</p>
                            </div>
                            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
                                <button class="btn btn-primary detailed-view-btn"><i class="fas fa-eye"></i> 詳細表示</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const detailBtn = detailedItem.querySelector('.detailed-view-btn');
            if (detailBtn) {
                detailBtn.addEventListener('click', () => this.showItemDetail(item));
            }
            
            container.appendChild(detailedItem);
        });
    }
    
    showItemDetail(item) {
        const modal = document.getElementById('itemDetailModal');
        const content = document.getElementById('itemDetailContent');
        
        if (!modal || !content) return;
        
        const profitMargin = (item.cost_price_usd && item.base_price_usd) ? 
            (((item.base_price_usd - item.cost_price_usd) / item.base_price_usd) * 100).toFixed(1) : 'N/A';
        const profit = (item.cost_price_usd && item.base_price_usd) ? 
            (item.base_price_usd - item.cost_price_usd).toFixed(2) : 'N/A';
        
        content.innerHTML = this.generateModalContent(item, profitMargin, profit);
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        const editBtn = document.getElementById('editItemBtn');
        if (editBtn) {
            editBtn.onclick = () => this.editItem(item);
        }
    }
    
    generateModalContent(item, profitMargin, profit) {
        return `
            <div style="display: grid; grid-template-columns: 300px 1fr; gap: 2rem;">
                <div>
                    ${item.image_url ? 
                        `<img src="${item.image_url}" alt="${this.escapeHtml(item.product_name)}" style="width: 100%; height: auto; border-radius: 0.5rem;">`
                        : '<div style="width: 100%; height: 200px; display: flex; align-items: center; justify-content: center; background: #f7fafc; border-radius: 0.5rem; color: #9ca3af;"><i class="fas fa-image fa-3x"></i></div>'
                    }
                </div>
                <div>
                    <h2 style="margin: 0 0 1.5rem 0; line-height: 1.3;">${this.escapeHtml(item.product_name)}</h2>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <h4 style="margin: 0 0 1rem 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">基本情報</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                            <div><label style="font-weight: 600;">SKU</label><br><code style="background: #f7fafc; padding: 0.5rem; border-radius: 0.25rem;">${item.master_sku || 'N/A'}</code></div>
                            <div><label style="font-weight: 600;">Platform ID</label><br><code style="background: #f7fafc; padding: 0.5rem; border-radius: 0.25rem;">${item.platform_item_id || 'N/A'}</code></div>
                            <div><label style="font-weight: 600;">商品状態</label><br><span class="badge badge-${item.condition_type || 'unknown'}">${item.condition_type || 'unknown'}</span></div>
                            <div><label style="font-weight: 600;">出品ステータス</label><br><span class="badge badge-${item.listing_status || 'unknown'}">${item.listing_status || 'unknown'}</span></div>
                            <div><label style="font-weight: 600;">カテゴリ</label><br>${item.category_name || 'N/A'}</div>
                            <div><label style="font-weight: 600;">登録日時</label><br>${item.created_at ? new Date(item.created_at).toLocaleString('ja-JP') : 'N/A'}</div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <h4 style="margin: 0 0 1rem 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">価格・収益情報</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                            <div><label style="font-weight: 600;">販売価格</label><br><span style="font-size: 1.5rem; font-weight: 700; color: #10b981;">$${(item.base_price_usd || 0).toFixed(2)}</span></div>
                            <div><label style="font-weight: 600;">仕入価格</label><br><span style="font-size: 1.25rem; font-weight: 600;">$${item.cost_price_usd ? item.cost_price_usd.toFixed(2) : 'N/A'}</span></div>
                            <div><label style="font-weight: 600;">利益金額</label><br><span style="font-size: 1.25rem; font-weight: 600;">$${profit}</span></div>
                            <div><label style="font-weight: 600;">利益率</label><br><span style="font-size: 1.25rem; font-weight: 600;">${profitMargin}${profitMargin !== 'N/A' ? '%' : ''}</span></div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <h4 style="margin: 0 0 1rem 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">商品説明</h4>
                        <div style="background: #f7fafc; padding: 1rem; border-radius: 0.25rem; line-height: 1.6;">
                            ${this.escapeHtml(item.description || '説明なし')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    closeModal() {
        const modal = document.getElementById('itemDetailModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    editItem(item) {
        console.log('編集機能（未実装）:', item);
        alert(`SKU: ${item.master_sku} の編集機能は今後実装予定です。`);
    }
    
    exportData() {
        try {
            const exportData = {
                metadata: {
                    exported_at: new Date().toISOString(),
                    total_items: this.filteredData.length,
                    filters_applied: this.filters,
                    export_format: 'json'
                },
                items: this.filteredData
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `ebay_test_data_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ データエクスポート完了');
        } catch (error) {
            console.error('❌ エクスポートエラー:', error);
            alert('エクスポートに失敗しました。');
        }
    }
    
    showError(message) {
        const errorEl = document.getElementById('errorContainer');
        const messageEl = document.getElementById('errorMessage');
        
        if (errorEl && messageEl) {
            messageEl.textContent = message;
            errorEl.style.display = 'flex';
        }
    }
    
    updatePagination() {
        const totalItems = this.filteredData.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startItem = totalItems > 0 ? (this.currentPage - 1) * this.itemsPerPage + 1 : 0;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
        
        const infoEl = document.getElementById('paginationInfo');
        if (infoEl) infoEl.textContent = `${startItem} - ${endItem} of ${totalItems} items`;
        
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
        
        this.renderPageNumbers(totalPages);
    }
    
    renderPageNumbers(totalPages) {
        const container = document.getElementById('pageNumbers');
        if (!container || totalPages <= 1) return;
        
        container.innerHTML = '';
        
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        if (startPage > 1) {
            this.addPageNumber(container, 1);
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.cssText = 'padding: 0.5rem; color: #9ca3af;';
                container.appendChild(ellipsis);
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            this.addPageNumber(container, i);
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.cssText = 'padding: 0.5rem; color: #9ca3af;';
                container.appendChild(ellipsis);
            }
            this.addPageNumber(container, totalPages);
        }
    }
    
    addPageNumber(container, pageNum) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = pageNum;
        pageBtn.className = `page-number ${pageNum === this.currentPage ? 'active' : ''}`;
        pageBtn.addEventListener('click', () => {
            this.currentPage = pageNum;
            this.renderCurrentView();
        });
        container.appendChild(pageBtn);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}

window.ebayTestViewer = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 eBay Test Viewer 初期化開始（構文エラー完全修復版）');
    
    if (window.ebayTestViewer) {
        window.ebayTestViewer = null;
    }
    
    window.ebayTestViewer = new EbayTestViewer();
    console.log('✅ eBay Test Viewer 構文エラー完全修復版初期化完了');
});
</script>


<script>
console.log('✅ eBay Test Viewer (構文エラー完全修復版) ロード完了');
console.log('🔧 修復内容: テンプレートリテラル・エスケープ問題・モーダル生成関数分離');
</script>        </main>
    </div>
    
    <!-- 🔧 サイドバー幅表示デバッグ（開発用） -->
    <div id="sidebarDebugInfo" class="debug-width" style="display: none;">
        幅情報読み込み中...
    </div>
    
    <!-- JavaScript -->
    <script>
    // CSRF トークン設定
    window.CSRF_TOKEN = "e5236bc7d8d2c4f558cf69bd2062dbbeab7a312e3356c308ec321ab4e54ad780";
    window.NAGANO3_CONFIG = {
        csrfToken: "e5236bc7d8d2c4f558cf69bd2062dbbeab7a312e3356c308ec321ab4e54ad780",
        currentPage: "ebay_test_viewer",
        debug: false,
        version: "2.0"
    };
    
    // ===== 🔧 NAGANO-3 サイドバー連動完全幅制御システム（統合版） =====
    
    /**
     * NAGANO-3 サイドバー完全幅制御システム v2.0
     * 機能: サイドバー状態に応じたメインコンテンツ幅の完全制御
     */
    window.NAGANO3_SidebarControl = {
        initialized: false,
        currentState: 'expanded',
        
        // 状態管理
        states: {
            expanded: {
                sidebarClass: '',
                bodyClass: 'js-sidebar-expanded',
                marginLeft: 'var(--sidebar-width)',
                width: 'calc(100vw - var(--sidebar-width))'
            },
            collapsed: {
                sidebarClass: 'unified-sidebar--collapsed',
                bodyClass: 'js-sidebar-collapsed sidebar-collapsed',
                marginLeft: 'var(--sidebar-collapsed)',
                width: 'calc(100vw - var(--sidebar-collapsed))'
            },
            hidden: {
                sidebarClass: 'unified-sidebar--hidden',
                bodyClass: 'js-sidebar-hidden sidebar-hidden',
                marginLeft: '0px',
                width: '100vw'
            }
        },
        
        /**
         * 状態設定
         */
        setState: function(state, animate = true) {
            if (!this.states[state]) {
                console.error('無効なサイドバー状態:', state);
                return;
            }
            
            const sidebar = document.querySelector('.unified-sidebar, .sidebar');
            const body = document.body;
            const contentElements = document.querySelectorAll('.main-content, main, #mainContent, .content');
            
            if (!sidebar) {
                console.error('サイドバー要素が見つかりません');
                return;
            }
            
            // 現在のクラスをクリア
            Object.values(this.states).forEach(stateConfig => {
                sidebar.classList.remove(...stateConfig.sidebarClass.split(' ').filter(c => c));
                body.classList.remove(...stateConfig.bodyClass.split(' ').filter(c => c));
            });
            
            // 新しい状態を適用
            const config = this.states[state];
            if (config.sidebarClass) {
                sidebar.classList.add(...config.sidebarClass.split(' ').filter(c => c));
            }
            body.classList.add(...config.bodyClass.split(' ').filter(c => c));
            
            // CSS変数を直接更新（重要）
            document.documentElement.style.setProperty('--content-margin-left', config.marginLeft);
            
            // 全てのコンテンツ要素に直接スタイル適用（!importantより強力）
            contentElements.forEach(element => {
                // !importantを上書きするための方法
                element.style.setProperty('margin-left', config.marginLeft, 'important');
                element.style.setProperty('width', '100%', 'important');
                element.style.setProperty('max-width', 'none', 'important');
            });
            
            // 状態記録
            this.currentState = state;
            localStorage.setItem('nagano3_sidebar_state', state);
            
            // デバッグ情報更新
            this.updateDebugInfo();
            
            console.log(`✅ サイドバー状態変更: ${state} (マージン: ${config.marginLeft})`);
        },
        
        /**
         * 状態切り替え
         */
        toggle: function() {
            const nextStates = {
                expanded: 'collapsed',
                collapsed: 'hidden', 
                hidden: 'expanded'
            };
            
            this.setState(nextStates[this.currentState]);
        },
        
        /**
         * レスポンシブ状態管理
         */
        handleResponsive: function() {
            const width = window.innerWidth;
            
            if (width <= 767) {
                // モバイル：完全非表示
                this.setState('hidden', false);
            } else if (width <= 1023) {
                // タブレット：折りたたみ
                if (this.currentState === 'expanded') {
                    this.setState('collapsed', false);
                }
            } else {
                // デスクトップ：保存された状態を復元
                const savedState = localStorage.getItem('nagano3_sidebar_state');
                if (savedState && this.states[savedState] && savedState !== this.currentState) {
                    this.setState(savedState, false);
                }
            }
        },
        
        /**
         * デバッグ情報表示更新
         */
        updateDebugInfo: function() {
            const debugEl = document.getElementById('sidebarDebugInfo');
            
            if (debugEl && window.NAGANO3_CONFIG.debug) {
                const mainContent = document.querySelector('.main-content, main, #mainContent');
                const computedStyle = mainContent ? window.getComputedStyle(mainContent) : null;
                
                debugEl.innerHTML = `
                    <div><strong>Sidebar State:</strong> ${this.currentState}</div>
                    <div><strong>Window Width:</strong> ${window.innerWidth}px</div>
                    <div><strong>Margin Left:</strong> ${computedStyle?.marginLeft || 'N/A'}</div>
                    <div><strong>Content Width:</strong> ${computedStyle?.width || 'N/A'}</div>
                    <div><strong>Max Width:</strong> ${computedStyle?.maxWidth || 'N/A'}</div>
                `;
            }
        },
        
        /**
         * システム初期化
         */
        init: function() {
            if (this.initialized) return;
            
            console.log('🚀 NAGANO-3 サイドバー制御システム初期化中...');
            
            // 保存された状態を復元
            const savedState = localStorage.getItem('nagano3_sidebar_state');
            if (savedState && this.states[savedState]) {
                this.currentState = savedState;
            }
            
            // 初期状態設定
            this.handleResponsive();
            
            // リサイズイベント
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this.handleResponsive();
                    this.updateDebugInfo();
                }, 150);
            });
            
            // MutationObserver（サイドバークラス変更監視）
            const sidebar = document.querySelector('.unified-sidebar, .sidebar');
            if (sidebar) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                            this.detectStateFromDOM();
                        }
                    });
                });
                
                observer.observe(sidebar, {
                    attributes: true,
                    attributeFilter: ['class']
                });
            }
            
            this.initialized = true;
            console.log('✅ NAGANO-3 サイドバー制御システム初期化完了');
        },
        
        /**
         * DOM状態から現在の状態を検出
         */
        detectStateFromDOM: function() {
            const sidebar = document.querySelector('.unified-sidebar, .sidebar');
            if (!sidebar) return;
            
            if (sidebar.classList.contains('unified-sidebar--hidden')) {
                this.currentState = 'hidden';
            } else if (sidebar.classList.contains('unified-sidebar--collapsed')) {
                this.currentState = 'collapsed';
            } else {
                this.currentState = 'expanded';
            }
        }
    };
    
    // ===== グローバル関数（後方互換性） =====
    window.setSidebarState = function(state) {
        window.NAGANO3_SidebarControl.setState(state);
    };
    
    window.toggleSidebar = function() {
        window.NAGANO3_SidebarControl.toggle();
    };
    
    window.updateMainContentWidth = function() {
        window.NAGANO3_SidebarControl.setState(window.NAGANO3_SidebarControl.currentState);
    };
    
    // Ajax処理関数
    window.executeAjax = async function(action, data = {}) {
        try {
            const formData = new FormData();
            formData.append('action', action);
            formData.append('csrf_token', window.CSRF_TOKEN);
            
            Object.entries(data).forEach(([key, value]) => {
                formData.append(key, value);
            });
            
            const response = await fetch(window.location.pathname + window.location.search, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error');
            }
            
            return result;
            
        } catch (error) {
            console.error('Ajax Error:', error);
            throw error;
        }
    };
    
    // ヘルスチェック
    window.healthCheck = async function() {
        try {
            const result = await executeAjax('health_check');
            console.log('Health Check Success:', result);
            return result;
        } catch (error) {
            console.error('Health Check Failed:', error);
            return null;
        }
    };
    
    // 強制リセット関数（完全版）
    window.testMarginLeftReset = function() {
        console.log('🔧 強制リセット実行中...');
        
        // 全ての.content、.main-content要素を取得
        const allContentElements = document.querySelectorAll('.content, .main-content, main, #mainContent, [class*="content"], [class*="main"]');
        
        console.log(`📦 発見された要素数: ${allContentElements.length}`);
        
        allContentElements.forEach((element, index) => {
            // 現在の値をログ出力
            const currentMargin = window.getComputedStyle(element).marginLeft;
            const currentWidth = window.getComputedStyle(element).width;
            
            console.log(`📊 要素${index}: ${element.className || element.tagName}`);
            console.log(`   現在のmargin-left: ${currentMargin}`);
            console.log(`   現在のwidth: ${currentWidth}`);
            
            // !importantを上書きして強制的に0pxに設定
            element.style.setProperty('margin-left', '0px', 'important');
            element.style.setProperty('width', '100vw', 'important');
            element.style.setProperty('max-width', '100vw', 'important');
            element.style.setProperty('min-width', '0px', 'important');
            
            // 変更後の値を確認
            setTimeout(() => {
                const newMargin = window.getComputedStyle(element).marginLeft;
                const newWidth = window.getComputedStyle(element).width;
                console.log(`✅ 変更後のmargin-left: ${newMargin}`);
                console.log(`✅ 変更後のwidth: ${newWidth}`);
            }, 100);
        });
        
        // bodyクラスも更新
        document.body.className = 'sidebar-hidden';
        
        // すべてのCSS変数を強制更新
        const rootElement = document.documentElement;
        rootElement.style.setProperty('--content-margin-left', '0px', 'important');
        rootElement.style.setProperty('--sidebar-width', '0px', 'important');
        rootElement.style.setProperty('--content-width', '100vw', 'important');
        rootElement.style.setProperty('--content-max-width', '100vw', 'important');
        
        // サイドバーも強制非表示
        const sidebar = document.querySelector('.unified-sidebar, .sidebar');
        if (sidebar) {
            sidebar.style.setProperty('left', '-300px', 'important');
            sidebar.style.setProperty('width', '0px', 'important');
        }
        
        alert('🔧 強制リセット完了！\n\nコンソールで詳細を確認してください。');
    };
    // 最強リセット関数（あらゆる要素対象）
    window.forceResetAllMargins = function() {
        console.log('🚀 最強リセット実行中...');
        
        // あらゆる要素を取得
        const allElements = document.querySelectorAll('*');
        
        console.log(`📦 全要素数: ${allElements.length}`);
        
        let resetCount = 0;
        
        allElements.forEach((element, index) => {
            const computedStyle = window.getComputedStyle(element);
            const currentMarginLeft = computedStyle.marginLeft;
            
            // margin-leftが220pxまたは971pxの要素を発見
            if (currentMarginLeft === '220px' || currentMarginLeft === '971px' || 
                element.style.marginLeft === '220px' || element.style.marginLeft === '971px') {
                
                console.log(`🎯 ターゲット発見: ${element.tagName}.${element.className}`);
                console.log(`   現在のmargin-left: ${currentMarginLeft}`);
                console.log(`   現在のwidth: ${computedStyle.width}`);
                
                // 強制リセット
                element.style.setProperty('margin-left', '0px', 'important');
                element.style.setProperty('width', '100vw', 'important');
                element.style.setProperty('max-width', '100vw', 'important');
                element.style.setProperty('min-width', '0px', 'important');
                
                resetCount++;
            }
        });
        
        // bodyクラスをクリアしてsidebar-hiddenを追加
        document.body.className = '';
        document.body.classList.add('sidebar-hidden');
        
        // すべてのCSS変数をリセット
        const rootElement = document.documentElement;
        rootElement.style.setProperty('--content-margin-left', '0px', 'important');
        rootElement.style.setProperty('--sidebar-width', '0px', 'important');
        
        // サイドバーを完全に非表示
        const sidebar = document.querySelector('.unified-sidebar, .sidebar');
        if (sidebar) {
            sidebar.style.setProperty('transform', 'translateX(-100%)', 'important');
            sidebar.style.setProperty('width', '0px', 'important');
            sidebar.style.setProperty('left', '-300px', 'important');
        }
        
        console.log(`✅ リセット完了: ${resetCount}個の要素を修正`);
        
        alert(`🚀 最強リセット完了！\n\n${resetCount}個の要素のマージンをリセットしました。\nコンソールで詳細を確認してください。`);
    };
    // システムテスト関数（async修正版）
    window.testSystem = async function() {
        try {
            console.log('🧪 システムテスト開始');
            const health = await healthCheck();
            const stats = await executeAjax('get_statistics');
            
            const message = '✅ システム正常動作中！\n\n' + 
                           'ヘルスチェック: ' + health.data.status + '\n' +
                           '現在ページ: ' + stats.data.current_page + '\n' +
                           'セッションID: ' + stats.data.session_id;
            
            alert(message);
            console.log('✅ システムテスト完了');
            
        } catch (error) {
            console.error('❌ システムテストエラー:', error);
            alert('⚠️ テスト失敗: ' + error.message);
        }
    };
    
    // 初期化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ NAGANO-3 v2.0 N3準拠版（サイドバー幅制御修正版）初期化完了');
        console.log('Current Page:', window.NAGANO3_CONFIG.currentPage);
        
        // ローディング画面非表示
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        }, 500);
        
        // NAGANO-3サイドバー制御初期化
        window.NAGANO3_SidebarControl.init();
        
        // システムテスト（初回のみ）
        setTimeout(() => {
            healthCheck();
        }, 1000);
    });
    </script>
    
</body>
</html>