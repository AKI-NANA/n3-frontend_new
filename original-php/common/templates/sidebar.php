<?php
/**
 * NAGANO-3 サイドバーテンプレート（本番完成版）
 * 第二階層メニューDOM移動による確実表示
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

function isCurrentPage($page_name) {
    $request_page = $_GET['page'] ?? 'dashboard';
    return $request_page === $page_name;
}

function isActiveSubmenu($pages) {
    if (!is_array($pages)) {
        return false;
    }
    $request_page = $_GET['page'] ?? 'dashboard';
    return in_array($request_page, $pages, true);
}

$current_page_display = $_GET['page'] ?? 'dashboard';
?>

<!-- 左上固定小型制御タブ -->
<div id="sidebarControlTab" class="sidebar-control-tab">
    <i class="fas fa-compress-alt" id="tabIcon"></i>
</div>

<!-- サイドバー -->
<aside class="sidebar">
    <style>
        :root {
            --sidebar-expanded: 220px;
            --sidebar-collapsed: 60px;
            --header-height: 80px;
            --sidebar-bg: #2c3e50;
            --sidebar-hover: rgba(52, 152, 219, 0.3);
            --text-white: rgba(255, 255, 255, 0.9);
            --text-white-dim: rgba(255, 255, 255, 0.7);
            --item-height: 54px;
            --submenu-bg: #34495e;
        }

        /* 左上制御タブ */
        .sidebar-control-tab {
            position: fixed;
            top: calc(var(--header-height) + 10px);
            left: 10px;
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #3498db, #2980b9);
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(52, 152, 219, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            user-select: none;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .sidebar-control-tab:hover {
            background: linear-gradient(135deg, #2980b9, #3498db);
            transform: scale(1.05);
        }

        .sidebar-control-tab i {
            font-size: 14px;
            color: white;
        }

        /* サイドバー本体 */
        .unified-sidebar {
            position: fixed;
            top: var(--header-height);
            left: 0;
            width: var(--sidebar-expanded);
            height: calc(100vh - var(--header-height));
            background: var(--sidebar-bg);
            box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
            z-index: 2000;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            transition: width 0.3s ease;
        }

        /* 狭める状態 */
        body.sidebar-collapsed .unified-sidebar {
            width: var(--sidebar-collapsed);
        }

        body.sidebar-collapsed .unified-sidebar .unified-sidebar-text,
        body.sidebar-collapsed .unified-sidebar .unified-arrow {
            opacity: 0;
            visibility: hidden;
            display: none;
        }

        body.sidebar-collapsed .unified-sidebar .unified-submenu-label,
        body.sidebar-collapsed .unified-sidebar .unified-sidebar-link {
            justify-content: center;
            padding: 15px 5px;
        }

        body.sidebar-collapsed .unified-sidebar .unified-sidebar-icon {
            margin-right: 0;
            font-size: 18px;
        }

        /* 閉じる状態 */
        body.sidebar-hidden .unified-sidebar {
            width: 0;
            transform: translateX(-100%);
        }

        /* サイドバー内容 */
        .unified-sidebar-list {
            list-style: none;
            margin: 0;
            padding: 0;
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
        }

        .unified-sidebar-item {
            position: relative;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .unified-submenu-label {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            color: var(--text-white-dim);
            cursor: pointer;
            min-height: var(--item-height);
            user-select: none;
            transition: all 0.2s ease;
        }

        .unified-submenu-label:hover {
            background: var(--sidebar-hover);
            color: var(--text-white);
        }

        .unified-sidebar-link {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            color: var(--text-white-dim);
            text-decoration: none;
            min-height: var(--item-height);
            transition: all 0.2s ease;
        }

        .unified-sidebar-link:hover {
            background: var(--sidebar-hover);
            color: var(--text-white);
        }

        .unified-sidebar-icon {
            margin-right: 12px;
            font-size: 16px;
            width: 20px;
            text-align: center;
            transition: all 0.2s ease;
        }

        .unified-sidebar-text {
            flex: 1;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .unified-arrow {
            margin-left: auto;
            font-size: 12px;
            opacity: 0.6;
            transition: all 0.2s ease;
        }

        .unified-sidebar-item:hover .unified-arrow {
            transform: rotate(90deg);
            opacity: 1;
        }

        /* 第二階層メニュー（body直下配置版） */
        .unified-submenu {
            position: fixed !important;
            left: var(--sidebar-expanded) !important;
            background: var(--submenu-bg) !important;
            width: 280px !important;
            border-radius: 0 12px 12px 0 !important;
            box-shadow: 4px 0 25px rgba(0,0,0,0.4) !important;
            z-index: 999999999 !important;
            
            /* サイズ制限 */
            max-height: 400px !important;
            min-height: 50px !important;
            overflow-y: auto !important;
            overflow-x: visible !important;
            
            /* 内部構造 */
            padding: 8px 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            
            /* ボーダー */
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            
            /* 初期状態は非表示 */
            opacity: 0 !important;
            visibility: hidden !important;
            transform: translateX(-20px) scale(0.95) !important;
            transition: all 0.25s ease !important;
            pointer-events: none !important;
        }

        /* 表示状態 */
        .unified-submenu.show {
            opacity: 1 !important;
            visibility: visible !important;
            transform: translateX(0) scale(1) !important;
            pointer-events: auto !important;
        }

        /* サイドバー狭い状態での調整 */
        body.sidebar-collapsed .unified-submenu {
            left: var(--sidebar-collapsed) !important;
            width: 250px !important;
        }

        body.sidebar-hidden .unified-submenu {
            display: none !important;
        }

        /* 第二階層リンク */
        .unified-submenu-link {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            min-height: 44px !important;
            padding: 12px 16px !important;
            margin: 0 !important;
            color: rgba(255, 255, 255, 0.85) !important;
            text-decoration: none !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            line-height: 1.3 !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
            transition: all 0.2s ease !important;
            box-sizing: border-box !important;
        }

        .unified-submenu-link:last-child {
            border-bottom: none !important;
            border-radius: 0 0 12px 0 !important;
        }

        .unified-submenu-link:hover {
            background: rgba(52, 152, 219, 0.25) !important;
            color: rgba(255, 255, 255, 1) !important;
            padding-left: 20px !important;
        }

        /* アイコン */
        .unified-submenu-link i {
            flex-shrink: 0 !important;
            width: 16px !important;
            margin-right: 8px !important;
            font-size: 12px !important;
            text-align: center !important;
            opacity: 0.7 !important;
            color: currentColor !important;
        }

        .unified-submenu-link:hover i {
            opacity: 1 !important;
            color: #3498db !important;
        }

        /* テキスト */
        .unified-submenu-link span:first-of-type {
            flex: 1 !important;
            display: block !important;
            font-size: 13px !important;
            white-space: normal !important;
            word-wrap: break-word !important;
            overflow: visible !important;
            opacity: 1 !important;
            visibility: visible !important;
        }

        /* ステータスバッジ */
        .status-badge {
            flex-shrink: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: 18px !important;
            min-width: 24px !important;
            padding: 2px 6px !important;
            border-radius: 9px !important;
            font-size: 9px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            line-height: 1 !important;
            white-space: nowrap !important;
            margin-left: 8px !important;
        }

        /* バッジカラー */
        .status-ready { background: #10b981 !important; color: white !important; }
        .status-new { background: #3b82f6 !important; color: white !important; }
        .status-pending { background: #f59e0b !important; color: white !important; }

        /* スクロールバー */
        .unified-submenu::-webkit-scrollbar {
            width: 4px;
        }

        .unified-submenu::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 2px;
        }

        .unified-submenu::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
        }

        .unified-submenu::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }
    </style>

    <nav class="unified-sidebar" id="unifiedSidebar">
        <ul class="unified-sidebar-list">
            <!-- ダッシュボード -->
            <li class="unified-sidebar-item">
                <a href="index.php?page=dashboard" class="unified-sidebar-link <?= isCurrentPage('dashboard') ? 'active' : '' ?>">
                    <i class="unified-sidebar-icon fas fa-home"></i>
                    <span class="unified-sidebar-text">ダッシュボード</span>
                </a>
            </li>

            <!-- 商品管理 -->
            <li class="unified-sidebar-item" data-submenu="products" data-top="135">
                <div class="unified-submenu-label">
                    <i class="unified-sidebar-icon fas fa-cube"></i>
                    <span class="unified-sidebar-text">商品管理</span>
                    <i class="unified-arrow fas fa-chevron-right"></i>
                </div>
            </li>

            <!-- 在庫管理 -->
            <li class="unified-sidebar-item" data-submenu="inventory" data-top="189">
                <div class="unified-submenu-label">
                    <i class="unified-sidebar-icon fas fa-warehouse"></i>
                    <span class="unified-sidebar-text">在庫管理</span>
                    <i class="unified-arrow fas fa-chevron-right"></i>
                </div>
            </li>

            <!-- 受注管理 -->
            <li class="unified-sidebar-item" data-submenu="orders" data-top="243">
                <div class="unified-submenu-label">
                    <i class="unified-sidebar-icon fas fa-shopping-cart"></i>
                    <span class="unified-sidebar-text">受注管理</span>
                    <i class="unified-arrow fas fa-chevron-right"></i>
                </div>
            </li>

            <!-- AI制御システム -->
            <li class="unified-sidebar-item" data-submenu="ai" data-top="297">
                <div class="unified-submenu-label">
                    <i class="unified-sidebar-icon fas fa-robot"></i>
                    <span class="unified-sidebar-text">AI制御システム</span>
                    <i class="unified-arrow fas fa-chevron-right"></i>
                </div>
            </li>

            <!-- 記帳・会計 -->
            <li class="unified-sidebar-item" data-submenu="accounting" data-top="351">
                <div class="unified-submenu-label">
                    <i class="unified-sidebar-icon fas fa-calculator"></i>
                    <span class="unified-sidebar-text">記帳・会計</span>
                    <i class="unified-arrow fas fa-chevron-right"></i>
                </div>
            </li>

            <!-- システム管理 -->
            <li class="unified-sidebar-item" data-submenu="system" data-top="405">
                <div class="unified-submenu-label">
                    <i class="unified-sidebar-icon fas fa-cogs"></i>
                    <span class="unified-sidebar-text">システム管理</span>
                    <i class="unified-arrow fas fa-chevron-right"></i>
                </div>
            </li>

            <!-- 外部連携 -->
            <li class="unified-sidebar-item" data-submenu="external" data-top="459">
                <div class="unified-submenu-label">
                    <i class="unified-sidebar-icon fas fa-external-link-alt"></i>
                    <span class="unified-sidebar-text">外部連携</span>
                    <i class="unified-arrow fas fa-chevron-right"></i>
                </div>
            </li>

            <!-- その他 -->
            <li class="unified-sidebar-item" data-submenu="others" data-top="513">
                <div class="unified-submenu-label">
                    <i class="unified-sidebar-icon fas fa-tools"></i>
                    <span class="unified-sidebar-text">その他</span>
                    <i class="unified-arrow fas fa-chevron-right"></i>
                </div>
            </li>
        </ul>
    </nav>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎯 NAGANO-3 完成版サイドバー初期化開始');
            
            // 🔧 ベースURLを動的に検出（相対パス問題解決）
            const currentPath = window.location.pathname;
            const baseUrl = 'index.php'; // 固定パスに変更
            
            // サブメニューデータ（修正版）
            const submenus = {
                products: [
                    { text: '商品一覧', link: `${baseUrl}?page=shohin_content`, icon: 'fas fa-list', status: 'ready' },
                    { text: '商品登録', link: `${baseUrl}?page=shohin_add`, icon: 'fas fa-plus', status: 'ready' },
                    { text: 'Amazon商品登録', link: `${baseUrl}?page=asin_upload_content`, icon: 'fab fa-amazon', status: 'pending' },
                    { text: 'カテゴリ管理', link: `${baseUrl}?page=shohin_category`, icon: 'fas fa-tags', status: 'pending' }
                ],
                inventory: [
                    { text: '在庫一覧', link: `${baseUrl}?page=zaiko_content`, icon: 'fas fa-boxes', status: 'ready' },
                    { text: 'N3 Advanced Inventory', link: `${baseUrl}?page=inventory`, icon: 'fas fa-database', status: 'new' },
                    { text: 'マルチモール在庫', link: `${baseUrl}?page=multi_mall_inventory`, icon: 'fas fa-store', status: 'new' },
                    { text: '棚卸システム', link: `${baseUrl}?page=tanaoroshi`, icon: 'fas fa-clipboard-check', status: 'ready' },
                    { text: 'PostgreSQL統合棚卸し', link: `${baseUrl}?page=tanaoroshi_inline_complete`, icon: 'fas fa-database', status: 'new' }
                ],
                orders: [
                    { text: '受注一覧', link: `${baseUrl}?page=juchu_kanri_content`, icon: 'fas fa-list-alt', status: 'ready' },
                    { text: 'eBay在庫管理', link: `${baseUrl}?page=ebay_inventory`, icon: 'fab fa-ebay', status: 'ready' },
                    { text: 'eBay管理システム', link: `${baseUrl}?page=ebay_kanri`, icon: 'fas fa-shopping-cart', status: 'new' },
                    { text: 'eBayデータビューア', link: `${baseUrl}?page=ebay_test_viewer`, icon: 'fas fa-database', status: 'new' }
                ],
                ai: [
                    { text: '商品承認システム', link: `${baseUrl}?page=approval_system`, icon: 'fas fa-check-circle', status: 'new' },
                    { text: 'eBay AI統合システム', link: `${baseUrl}?page=ebay_ai_system`, icon: 'fas fa-brain', status: 'ready' },
                    { text: 'AI ダッシュボード', link: `${baseUrl}?page=ai_control_deck`, icon: 'fas fa-tachometer-alt', status: 'pending' },
                    { text: '予測分析', link: `${baseUrl}?page=ai_predictor_content`, icon: 'fas fa-crystal-ball', status: 'pending' }
                ],
                accounting: [
                    { text: '記帳メイン', link: `${baseUrl}?page=kicho_content`, icon: 'fas fa-book', status: 'ready' },
                    { text: 'eBay売上記帳', link: `${baseUrl}?page=ebay_kicho_content`, icon: 'fab fa-ebay', status: 'pending' },
                    { text: '会計管理', link: `${baseUrl}?page=kaikei_kanri`, icon: 'fas fa-chart-pie', status: 'pending' }
                ],
                system: [
                    { text: 'APIキー管理', link: `${baseUrl}?page=apikey_content`, icon: 'fas fa-key', status: 'ready' },
                    { text: 'Universal Data Hub', link: `${baseUrl}?page=universal_data_hub`, icon: 'fas fa-database', status: 'new' },
                    { text: 'eBayデータ管理', link: `${baseUrl}?page=ebay_database_manager`, icon: 'fas fa-database', status: 'new' },
                    { text: '動的モジュールリスト', link: '/modules/dynamic_sidebar/dynamic_modules_list.php', icon: 'fas fa-search', status: 'new', target: '_blank' },
                    { text: '統合デバッグ', link: `${baseUrl}?page=debug_dashboard`, icon: 'fas fa-search', status: 'ready' },
                    { text: 'システムテスト', link: `${baseUrl}?page=test_tool`, icon: 'fas fa-vial', status: 'ready' }
                ],
                external: [
                    { text: 'Yahoo Auction Tool (独立表示)', link: '/modules/yahoo_auction_complete/yahoo_auction_tool_standalone.php', icon: 'fas fa-gavel', status: 'new', target: '_blank' },
                    { text: 'メインツール', link: `${baseUrl}?page=yahoo_auction_main_tool`, icon: 'fas fa-rocket', status: 'new' },
                    { text: 'ダッシュボード', link: `${baseUrl}?page=yahoo_auction_dashboard`, icon: 'fas fa-chart-line', status: 'new' },
                    { text: '商品承認', link: `${baseUrl}?page=yahoo_auction_approval`, icon: 'fas fa-check-circle', status: 'new' },
                    { text: '出品管理', link: `${baseUrl}?page=yahoo_auction_listing`, icon: 'fas fa-store', status: 'new' },
                    { text: 'データベース構造ガイド', link: '/modules/database_monitor/database_guide.html', icon: 'fas fa-graduation-cap', status: 'new', target: '_blank' },
                    { text: '完全DB構造解析', link: '/modules/database_monitor/complete_database_analysis.html', icon: 'fas fa-microscope', status: 'new', target: '_blank' },
                    { text: '動的データベースビューア', link: '/modules/database_monitor/dynamic_database_viewer.html', icon: 'fas fa-database', status: 'new', target: '_blank' },
                    { text: 'APIテスト', link: `${baseUrl}?page=api_test`, icon: 'fas fa-plug', status: 'pending' },
                    { text: 'データインポート', link: `${baseUrl}?page=data_import`, icon: 'fas fa-download', status: 'pending' },
                    { text: 'バッチ処理', link: `${baseUrl}?page=batch_process`, icon: 'fas fa-tasks', status: 'pending' }
                ],
                others: [
                    { text: '統合Webツール', link: `${baseUrl}?page=complete_web_tool`, icon: 'fas fa-tools', status: 'ready' },
                    { text: 'maru9商品データ修正', link: `${baseUrl}?page=maru9_tool`, icon: 'fas fa-shopping-cart', status: 'ready' },
                    { text: 'Ollama AI管理', link: `${baseUrl}?page=ollama_manager`, icon: 'fas fa-robot', status: 'new' },
                    { text: '自動振り分けシステム', link: `${baseUrl}?page=auto_sort_system`, icon: 'fas fa-sort', status: 'new' }
                ]
            };
            
            // バッジ作成関数
            function createBadge(status) {
                const badgeMap = { 'ready': '✓', 'new': 'NEW', 'pending': '開発中' };
                const text = badgeMap[status] || status;
                return `<span class="status-badge status-${status}">${text}</span>`;
            }
            
            // 🔥 第二階層メニューをbodyに直接作成・移動
            Object.keys(submenus).forEach(submenuKey => {
                const submenuData = submenus[submenuKey];
                const menuItem = document.querySelector(`[data-submenu="${submenuKey}"]`);
                
                if (!menuItem || !submenuData) return;
                
                // body直下に第二階層メニュー作成
                const panel = document.createElement('div');
                panel.className = 'unified-submenu';
                panel.id = `submenu-${submenuKey}`;
                panel.style.top = `${menuItem.getAttribute('data-top')}px`;
                
                const links = submenuData.map(item => `
                    <a href="${item.link}" class="unified-submenu-link" ${
                        item.target === '_blank' ? 'target="_blank" rel="noopener noreferrer"' : ''
                    }>
                        <i class="${item.icon}"></i>
                        <span>${item.text}</span>
                        ${createBadge(item.status)}
                    </a>
                `).join('');
                
                panel.innerHTML = links;
                document.body.appendChild(panel);
                
                console.log(`✅ ${submenuKey}メニュー作成完了（body直下・${submenuData.length}項目）`);
            });
            
            // 3段階制御システム
            let currentState = 'expanded';
            const states = ['expanded', 'collapsed', 'hidden'];
            const stateIcons = ['fas fa-compress-alt', 'fas fa-times', 'fas fa-expand-alt'];
            
            const controlTab = document.getElementById('sidebarControlTab');
            const tabIcon = document.getElementById('tabIcon');
            
            function forceUpdateMainContentLayout(state) {
                const contentSelectors = [
                    '.content', '.main-content', 'main', '#mainContent', 'main.main-content',
                    '.container', '.wrapper', '[class*="content"]'
                ];
                
                const allContentElements = [];
                contentSelectors.forEach(selector => {
                    try {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(el => {
                            if (!allContentElements.includes(el)) {
                                allContentElements.push(el);
                            }
                        });
                    } catch(e) {}
                });
                
                allContentElements.forEach((element) => {
                    if (state === 'expanded') {
                        element.style.setProperty('margin-left', '220px', 'important');
                        element.style.setProperty('width', 'auto', 'important');
                        element.style.setProperty('max-width', 'calc(100vw - 220px)', 'important');
                    } else if (state === 'collapsed') {
                        element.style.setProperty('margin-left', '60px', 'important');
                        element.style.setProperty('width', 'auto', 'important');
                        element.style.setProperty('max-width', 'calc(100vw - 60px)', 'important');
                    } else if (state === 'hidden') {
                        element.style.setProperty('margin-left', '0px', 'important');
                        element.style.setProperty('width', 'auto', 'important');
                        element.style.setProperty('max-width', '100vw', 'important');
                    }
                });
            }
            
            function updateSidebarState(state) {
                document.body.className = document.body.className.replace(/sidebar-(expanded|collapsed|hidden)/g, '');
                document.body.classList.add(`sidebar-${state}`);
                
                forceUpdateMainContentLayout(state);
                
                const currentIndex = states.indexOf(state);
                const nextIndex = (currentIndex + 1) % states.length;
                tabIcon.className = stateIcons[nextIndex];
                
                currentState = state;
                localStorage.setItem('sidebar_state', state);
            }
            
            // タブクリック
            controlTab.addEventListener('click', function() {
                const currentIndex = states.indexOf(currentState);
                const nextIndex = (currentIndex + 1) % states.length;
                const nextState = states[nextIndex];
                updateSidebarState(nextState);
            });
            
            // ホバーイベント（body直下要素対応）
            const menuItems = document.querySelectorAll('.unified-sidebar-item[data-submenu]');
            
            menuItems.forEach(item => {
                const submenuKey = item.getAttribute('data-submenu');
                const panel = document.getElementById(`submenu-${submenuKey}`);
                
                if (!panel) return;
                
                let hoverTimeout;
                
                item.addEventListener('mouseenter', () => {
                    clearTimeout(hoverTimeout);
                    document.querySelectorAll('.unified-submenu').forEach(p => p.classList.remove('show'));
                    panel.classList.add('show');
                    console.log(`🔼 ${submenuKey}メニュー表示`);
                });
                
                item.addEventListener('mouseleave', () => {
                    hoverTimeout = setTimeout(() => {
                        if (!panel.matches(':hover')) {
                            panel.classList.remove('show');
                            console.log(`🔽 ${submenuKey}メニュー非表示`);
                        }
                    }, 150);
                });
                
                panel.addEventListener('mouseenter', () => {
                    clearTimeout(hoverTimeout);
                    panel.classList.add('show');
                });
                
                panel.addEventListener('mouseleave', () => {
                    panel.classList.remove('show');
                    console.log(`🔽 ${submenuKey}メニュー非表示（パネル離脱）`);
                });
            });
            
            const savedState = localStorage.getItem('sidebar_state') || 'expanded';
            updateSidebarState(savedState);
            
            console.log('🎉 完成版サイドバー初期化完了 - DOM直下配置による確実表示');
        });
    </script>
</aside>