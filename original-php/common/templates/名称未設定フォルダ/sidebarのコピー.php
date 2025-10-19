<?php
/**
 * NAGANO-3 サイドバーテンプレート（N3エラー防止Hook適用版）
 * - 完全独立型関数定義
 * - 変数スコープ競合完全回避
 * - N3準拠構造
 */

// N3セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

/**
 * 現在のページ判定（完全独立型）
 * @param string $page_name チェック対象ページ名
 * @return bool 現在のページかどうか
 */
function isCurrentPage($page_name) {
    $request_page = $_GET['page'] ?? 'dashboard';
    return $request_page === $page_name;
}

/**
 * アクティブサブメニュー判定（完全独立型）
 * @param array $pages チェック対象ページ配列
 * @return bool いずれかのページがアクティブかどうか
 */
function isActiveSubmenu($pages) {
    if (!is_array($pages)) {
        return false;
    }
    
    $request_page = $_GET['page'] ?? 'dashboard';
    return in_array($request_page, $pages, true);
}

// 現在のページ取得（テンプレート用）
$current_page_display = $_GET['page'] ?? 'dashboard';
?>

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
            <a href="/?page=dashboard" class="unified-sidebar-link <?= isCurrentPage('dashboard') ? 'unified-sidebar-link--active' : '' ?>">
              <i class="unified-sidebar-icon fas fa-home"></i>
              <span class="unified-sidebar-text">ダッシュボード</span>
            </a>
          </li>

          <!-- 商品管理 -->
          <li class="unified-sidebar-item">
            <div class="unified-submenu-label <?= isActiveSubmenu(['shohin_content', 'shohin_add', 'view_shohin_touroku']) ? 'unified-submenu-label--active' : '' ?>">
              <i class="unified-sidebar-icon fas fa-cube"></i>
              <span class="unified-sidebar-text">商品管理</span>
              <i class="unified-arrow fas fa-chevron-right"></i>
            </div>
            <!-- サブメニュー1 -->
            <div class="unified-submenu unified-submenu--1">
              <a href="/?page=shohin_content" class="unified-submenu-link <?= isCurrentPage('shohin_content') ? 'unified-submenu-link--active' : '' ?>">
                <span><i class="fas fa-list"></i>商品一覧</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="/?page=shohin_add" class="unified-submenu-link <?= isCurrentPage('shohin_add') ? 'unified-submenu-link--active' : '' ?>">
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
            <div class="unified-submenu-label <?= isActiveSubmenu(['zaiko_content', 'tanaoroshi', 'tanaoroshi_content_complete', 'tanaoroshi_complete_fixed', 'tanaoroshi_inline_complete']) ? 'unified-submenu-label--active' : '' ?>">
              <i class="unified-sidebar-icon fas fa-warehouse"></i>
              <span class="unified-sidebar-text">在庫管理</span>
              <i class="unified-arrow fas fa-chevron-right"></i>
            </div>
            <!-- サブメニュー2 -->
            <div class="unified-submenu unified-submenu--2">
              <a href="/?page=zaiko_content" class="unified-submenu-link <?= isCurrentPage('zaiko_content') ? 'unified-submenu-link--active' : '' ?>">
                <span><i class="fas fa-boxes"></i>在庫一覧</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="/?page=zaiko_input" class="unified-submenu-link">
                <span><i class="fas fa-arrow-down"></i>入庫処理</span>
                <span class="status-pending">開発中</span>
              </a>
              <a href="/?page=zaiko_output" class="unified-submenu-link">
                <span><i class="fas fa-arrow-up"></i>出庫処理</span>
                <span class="status-pending">開発中</span>
              </a>
              <a href="/?page=tanaoroshi" class="unified-submenu-link <?= isCurrentPage('tanaoroshi') ? 'unified-submenu-link--active' : '' ?>">
                <span><i class="fas fa-clipboard-check"></i>NAGANO3在庫管理システム</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="/?page=tanaoroshi_content_complete" class="unified-submenu-link <?= isCurrentPage('tanaoroshi_content_complete') ? 'unified-submenu-link--active' : '' ?>">
                <span><i class="fas fa-warehouse"></i>棚卸システム - 完全版</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">ACTIVE</small>
              </a>
              <a href="/?page=tanaoroshi_complete_fixed" class="unified-submenu-link <?= isCurrentPage('tanaoroshi_complete_fixed') ? 'unified-submenu-link--active' : '' ?>">
                <span><i class="fas fa-clipboard-check"></i>棚卸システム - 完全修正版</span>
                <span class="status-ready">✓</span>
                <small style="color: #e74c3c; font-size: 10px">FIXED</small>
              </a>
              <a href="/?page=tanaoroshi_inline_complete" class="unified-submenu-link <?= isCurrentPage('tanaoroshi_inline_complete') ? 'unified-submenu-link--active' : '' ?>">
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
            <div class="unified-submenu-label <?= isActiveSubmenu(['juchu_kanri_content', 'ebay_inventory']) ? 'unified-submenu-label--active' : '' ?>">
              <i class="unified-sidebar-icon fas fa-shopping-cart"></i>
              <span class="unified-sidebar-text">受注管理</span>
              <i class="unified-arrow fas fa-chevron-right"></i>
            </div>
            <!-- サブメニュー3 -->
            <div class="unified-submenu unified-submenu--3">
              <a href="/?page=juchu_kanri_content" class="unified-submenu-link <?= isCurrentPage('juchu_kanri_content') ? 'unified-submenu-link--active' : '' ?>">
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
              <a href="/?page=ebay_inventory" class="unified-submenu-link <?= isCurrentPage('ebay_inventory') ? 'unified-submenu-link--active' : '' ?>">
                <span><i class="fab fa-ebay"></i>eBay在庫管理</span>
                <span class="status-ready">✓</span>
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
            <div class="unified-submenu-label <?= isActiveSubmenu(['kicho_content']) ? 'unified-submenu-label--active' : '' ?>">
              <i class="unified-sidebar-icon fas fa-calculator"></i>
              <span class="unified-sidebar-text">記帳・会計</span>
              <i class="unified-arrow fas fa-chevron-right"></i>
            </div>
            <!-- サブメニュー5 -->
            <div class="unified-submenu unified-submenu--5">
              <a href="/?page=kicho_content" class="unified-submenu-link <?= isCurrentPage('kicho_content') ? 'unified-submenu-link--active' : '' ?>">
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
            <div class="unified-submenu-label <?= isActiveSubmenu(['apikey_content', 'debug_dashboard', 'test_tool', 'sample_file_manager']) ? 'unified-submenu-label--active' : '' ?>">
              <i class="unified-sidebar-icon fas fa-cogs"></i>
              <span class="unified-sidebar-text">システム管理</span>
              <i class="unified-arrow fas fa-chevron-right"></i>
            </div>
            <!-- サブメニュー6 -->
            <div class="unified-submenu unified-submenu--6">
              <a href="/?page=apikey_content" class="unified-submenu-link <?= isCurrentPage('apikey_content') ? 'unified-submenu-link--active' : '' ?>">
                <span><i class="fas fa-key"></i>APIキー管理</span>
                <span class="status-ready">✓</span>
              </a>

              <a href="/?page=ebay_database_manager" class="unified-submenu-link">
                <span><i class="fas fa-database"></i>eBayデータ管理</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">Hook統合</small>
              </a>

              <a href="?page=debug_dashboard" class="unified-submenu-link <?= isCurrentPage('debug_dashboard') ? 'unified-submenu-link--active' : '' ?>">
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

              <a href="/?page=sample_file_manager" class="unified-submenu-link <?= isCurrentPage('sample_file_manager') ? 'unified-submenu-link--active' : '' ?>">
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
              <a href="/?page=test_tool" class="unified-submenu-link <?= isCurrentPage('test_tool') ? 'unified-submenu-link--active' : '' ?>">
                <span><i class="fas fa-vial"></i>システムテスト</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="/?page=dev_support" class="unified-submenu-link">
                <span><i class="fas fa-code"></i>開発補助</span>
                <span class="status-pending">準備中</span>
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
            <div class="unified-submenu-label <?= isActiveSubmenu(['complete_web_tool', 'maru9_tool', 'ollama_manager', 'auto_sort_system']) ? 'unified-submenu-label--active' : '' ?>">
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
              <a href="/?page=complete_web_tool" class="unified-submenu-link <?= isCurrentPage('complete_web_tool') ? 'unified-submenu-link--active' : '' ?>">
                <span><i class="fas fa-tools"></i>統合Webツール</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="?page=maru9_tool" class="unified-submenu-link <?= isCurrentPage('maru9_tool') ? 'unified-submenu-link--active' : '' ?>">
                <span><i class="fas fa-shopping-cart"></i>maru9商品データ修正</span>
                <span class="status-ready">✓</span>
              </a>
              <a href="?page=ollama_manager" class="unified-submenu-link <?= isCurrentPage('ollama_manager') ? 'unified-submenu-link--active' : '' ?>">
                <span><i class="fas fa-robot"></i>Ollama AI管理</span>
                <span class="status-ready">✓</span>
                <small style="color: #28a745; font-size: 10px">NEW</small>
              </a>
              <a href="?page=auto_sort_system" class="unified-submenu-link <?= isCurrentPage('auto_sort_system') ? 'unified-submenu-link--active' : '' ?>">
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