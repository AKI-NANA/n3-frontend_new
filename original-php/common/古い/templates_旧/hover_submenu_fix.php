<?php
/**
 * ✅ 既存sidebar.phpに追加するCSS - マウスオーバー第二階層制御
 * 
 * 🎯 これまでの仕様：
 * - マウスカーソルを乗せると第二階層が表示される
 * - JavaScript不要のCSS制御
 * - 既存のHTML構造は変更なし
 */

$current_page = $current_page ?? 'dashboard';
?>

<!-- ✅ マウスオーバー第二階層制御CSS（sidebar.phpに追加） -->
<style>
/* ===== 横スクロール解決 ===== */
.sidebar {
    overflow-x: hidden !important;
    width: 250px !important;
}

body {
    overflow-x: hidden !important;
}

.content {
    max-width: calc(100vw - 250px) !important;
    overflow-x: hidden !important;
}

/* ===== 🎯 マウスオーバー第二階層制御（これまでの仕様通り） ===== */

/* サブメニュー初期状態（非表示） */
.navigation__submenu {
    display: none; /* 初期状態で完全非表示 */
    background: #f8f9fa;
    border-left: 3px solid #007bff;
    margin-left: 16px;
    margin-right: 8px;
    padding: 8px 0;
    border-radius: 0 4px 4px 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    position: relative;
    z-index: 1001;
    animation: slideDown 0.3s ease;
}

/* ✅ マウスオーバー時に第二階層表示（これまでの仕様） */
.navigation__item--has-submenu:hover .navigation__submenu {
    display: block !important; /* マウスオーバーで表示 */
}

/* サブメニューアロー */
.navigation__item--has-submenu > .navigation__link::after {
    content: '\f107'; /* FontAwesome 下向き矢印 */
    font-family: 'Font Awesome 6 Free';
    font-weight: 900;
    margin-left: auto;
    font-size: 12px;
    color: #666;
    transition: transform 0.3s ease;
}

/* ホバー時にアロー回転 */
.navigation__item--has-submenu:hover > .navigation__link::after {
    transform: rotate(180deg);
}

/* サブメニューリンクスタイル */
.navigation__submenu-link {
    display: block;
    padding: 8px 16px;
    color: #666;
    text-decoration: none;
    font-size: 13px;
    transition: all 0.2s ease;
    border-bottom: 1px solid rgba(0,0,0,0.05);
}

.navigation__submenu-link:last-child {
    border-bottom: none;
}

.navigation__submenu-link:hover {
    background: #e9ecef;
    color: #007bff;
    padding-left: 24px;
    transform: translateX(4px);
}

.navigation__submenu-link.active {
    background: #007bff;
    color: white;
}

/* アイコン付きサブメニュー */
.navigation__submenu-link i {
    margin-right: 8px;
    width: 14px;
    text-align: center;
}

/* アニメーション */
@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* ===== サイドバー折りたたみ時の調整 ===== */
.sidebar--collapsed .navigation__submenu {
    display: none !important; /* 折りたたみ時は非表示 */
}

.sidebar--collapsed .navigation__text {
    display: none;
}

.sidebar--collapsed .navigation__icon {
    margin-right: 0;
    text-align: center;
    width: 100%;
}

.sidebar--collapsed + .content {
    margin-left: 60px !important;
    max-width: calc(100vw - 60px) !important;
}

/* ===== レスポンシブ対応 ===== */
@media (max-width: 768px) {
    .sidebar {
        transform: translateX(-100%);
        width: 250px !important;
    }
    
    .sidebar.sidebar--mobile-open {
        transform: translateX(0);
    }
    
    .content {
        margin-left: 0 !important;
        max-width: 100vw !important;
        padding: 16px;
    }
}
</style>

<aside class="sidebar" id="mainSidebar">
    
    <!-- サイドバーコンテンツ -->
    <div class="sidebar__content">
        
        <!-- ナビゲーションメニュー -->
        <nav class="navigation">
            
            <!-- 全メニュー -->
            <ul class="navigation__menu">
                
                <!-- ダッシュボード -->
                <li class="navigation__item">
                    <a href="/?page=dashboard" 
                       class="navigation__link <?php echo ($current_page === 'dashboard') ? 'navigation__link--active' : ''; ?>">
                        <i class="navigation__icon fas fa-tachometer-alt"></i>
                        <span class="navigation__text">ダッシュボード</span>
                    </a>
                </li>

                <!-- ✅ 商品管理（マウスオーバーで第二階層表示） -->
                <li class="navigation__item navigation__item--has-submenu">
                    <a href="#" class="navigation__link">
                        <i class="navigation__icon fas fa-cube"></i>
                        <span class="navigation__text">商品管理</span>
                    </a>
                    <div class="navigation__submenu">
                        <a href="/?page=shohin_content" class="navigation__submenu-link">商品一覧</a>
                        <a href="/?page=shohin_add" class="navigation__submenu-link">商品登録</a>
                        <a href="/?page=view_shohin_touroku" class="navigation__submenu-link">商品登録画面</a>
                        <a href="/?page=asin_upload_content" class="navigation__submenu-link">Amazon商品登録</a>
                        <a href="/?page=shohin_category" class="navigation__submenu-link">カテゴリ管理</a>
                    </div>
                </li>

                <!-- ✅ 在庫管理（マウスオーバーで第二階層表示） -->
                <li class="navigation__item navigation__item--has-submenu">
                    <a href="#" class="navigation__link">
                        <i class="navigation__icon fas fa-warehouse"></i>
                        <span class="navigation__text">在庫管理</span>
                    </a>
                    <div class="navigation__submenu">
                        <a href="/?page=zaiko_content" class="navigation__submenu-link">在庫管理</a>
                        <a href="/?page=zaiko_ichiran" class="navigation__submenu-link">在庫一覧</a>
                        <a href="/?page=zaiko_input" class="navigation__submenu-link">入庫管理</a>
                        <a href="/?page=zaiko_output" class="navigation__submenu-link">出庫管理</a>
                    </div>
                </li>

                <!-- ✅ 受注管理（マウスオーバーで第二階層表示） -->
                <li class="navigation__item navigation__item--has-submenu">
                    <a href="#" class="navigation__link">
                        <i class="navigation__icon fas fa-shopping-cart"></i>
                        <span class="navigation__text">受注管理</span>
                    </a>
                    <div class="navigation__submenu">
                        <a href="/?page=juchu_kanri_content" class="navigation__submenu-link">受注管理</a>
                        <a href="/?page=shiire_kanri" class="navigation__submenu-link">仕入管理</a>
                        <a href="/?page=ebay_api" class="navigation__submenu-link">eBay API</a>
                    </div>
                </li>

                <!-- ✅ 売上・利益集計（マウスオーバーで第二階層表示） -->
                <li class="navigation__item navigation__item--has-submenu">
                    <a href="#" class="navigation__link">
                        <i class="navigation__icon fas fa-chart-line"></i>
                        <span class="navigation__text">売上・利益集計</span>
                    </a>
                    <div class="navigation__submenu">
                        <a href="/?page=sales_report" class="navigation__submenu-link">売上レポート</a>
                        <a href="/?page=profit_analysis" class="navigation__submenu-link">利益分析</a>
                        <a href="/?page=period_comparison" class="navigation__submenu-link">期間比較</a>
                    </div>
                </li>

                <!-- ✅ 出荷管理（マウスオーバーで第二階層表示） -->
                <li class="navigation__item navigation__item--has-submenu">
                    <a href="#" class="navigation__link">
                        <i class="navigation__icon fas fa-shipping-fast"></i>
                        <span class="navigation__text">出荷管理</span>
                    </a>
                    <div class="navigation__submenu">
                        <a href="/?page=shipping_queue" class="navigation__submenu-link">出荷待ち</a>
                        <a href="/?page=shipping_status" class="navigation__submenu-link">配送状況</a>
                        <a href="/?page=tracking_number" class="navigation__submenu-link">追跡番号</a>
                    </div>
                </li>

                <!-- ✅ AI制御デッキ（マウスオーバーで第二階層表示） -->
                <li class="navigation__item navigation__item--has-submenu">
                    <a href="#" class="navigation__link">
                        <i class="navigation__icon fas fa-robot"></i>
                        <span class="navigation__text">AI制御デッキ</span>
                    </a>
                    <div class="navigation__submenu">
                        <a href="/?page=ai_control_deck" class="navigation__submenu-link">AI制御ダッシュボード</a>
                        <a href="/?page=ai_predictor_content" class="navigation__submenu-link">AI予測機能</a>
                        <a href="/?page=filters_content" class="navigation__submenu-link">フィルター管理</a>
                        <a href="/?page=system_automation" class="navigation__submenu-link">システム自動化</a>
                    </div>
                </li>

                <!-- ✅ 会計・記帳（マウスオーバーで第二階層表示） -->
                <li class="navigation__item navigation__item--has-submenu">
                    <a href="#" class="navigation__link">
                        <i class="navigation__icon fas fa-calculator"></i>
                        <span class="navigation__text">会計・記帳</span>
                    </a>
                    <div class="navigation__submenu">
                        <a href="/?page=kicho_content" class="navigation__submenu-link">記帳メイン</a>
                        <a href="/?page=ebay_kicho_content" class="navigation__submenu-link">eBay売上記帳</a>
                        <a href="/?page=kicho_auto" class="navigation__submenu-link">自動記帳</a>
                        <a href="/?page=accounting" class="navigation__submenu-link">会計管理</a>
                    </div>
                </li>

                <!-- ✅ API・キー管理（マウスオーバーで第二階層表示） -->
                <li class="navigation__item navigation__item--has-submenu">
                    <a href="#" class="navigation__link">
                        <i class="navigation__icon fas fa-key"></i>
                        <span class="navigation__text">API・キー管理</span>
                    </a>
                    <div class="navigation__submenu">
                        <a href="/?page=apikey_content" class="navigation__submenu-link">APIキー管理</a>
                        <a href="/?page=working_system" class="navigation__submenu-link">実動システム</a>
                        <a href="/?page=nagano3_db_config" class="navigation__submenu-link">DB設定</a>
                        <a href="/?page=unbreakable_core" class="navigation__submenu-link">核システム</a>
                    </div>
                </li>

                <!-- ✅ 設定・構成管理（マウスオーバーで第二階層表示） -->
                <li class="navigation__item navigation__item--has-submenu">
                    <a href="#" class="navigation__link">
                        <i class="navigation__icon fas fa-cog"></i>
                        <span class="navigation__text">設定・構成管理</span>
                    </a>
                    <div class="navigation__submenu">
                        <a href="/?page=settings_content" class="navigation__submenu-link">基本設定</a>
                        <a href="/?page=settings_controller" class="navigation__submenu-link">設定コントローラー</a>
                    </div>
                </li>

                <!-- ✅ マニュアル（マウスオーバーで第二階層表示） -->
                <li class="navigation__item navigation__item--has-submenu">
                    <a href="#" class="navigation__link">
                        <i class="navigation__icon fas fa-book"></i>
                        <span class="navigation__text">マニュアル</span>
                    </a>
                    <div class="navigation__submenu">
                        <a href="/?page=manual_main_content" class="navigation__submenu-link">メインマニュアル</a>
                        <a href="/?page=manual_kicho" class="navigation__submenu-link">基礎マニュアル</a>
                        <a href="/?page=manual_zaiko" class="navigation__submenu-link">在庫マニュアル</a>
                        <a href="/?page=manual_shohin" class="navigation__submenu-link">商品マニュアル</a>
                    </div>
                </li>

                <!-- ✅ 認証・セキュリティ（マウスオーバーで第二階層表示） -->
                <li class="navigation__item navigation__item--has-submenu">
                    <a href="#" class="navigation__link">
                        <i class="navigation__icon fas fa-shield-alt"></i>
                        <span class="navigation__text">認証・セキュリティ</span>
                    </a>
                    <div class="navigation__submenu">
                        <a href="/?page=auth_login" class="navigation__submenu-link">ログイン処理</a>
                        <a href="/?page=auth_logout" class="navigation__submenu-link">ログアウト処理</a>
                        <a href="/?page=auth_session" class="navigation__submenu-link">セッション保護</a>
                    </div>
                </li>

                <!-- ✅ 統合管理（マウスオーバーで第二階層表示） -->
                <li class="navigation__item navigation__item--has-submenu">
                    <a href="#" class="navigation__link">
                        <i class="navigation__icon fas fa-project-diagram"></i>
                        <span class="navigation__text">統合管理</span>
                    </a>
                    <div class="navigation__submenu">
                        <a href="/?page=nagano3_organized" class="navigation__submenu-link">統合コントローラー</a>
                        <a href="/?page=common_library" class="navigation__submenu-link">共通ライブラリ</a>
                        <a href="/?page=dynamic_ui" class="navigation__submenu-link">動的UI統合</a>
                    </div>
                </li>

                <!-- ✅ バックエンドツール（マウスオーバーで第二階層表示）- 新規追加 -->
                <li class="navigation__item navigation__item--has-submenu">
                    <a href="#" class="navigation__link">
                        <i class="navigation__icon fas fa-tools"></i>
                        <span class="navigation__text">バックエンドツール</span>
                    </a>
                    <div class="navigation__submenu">
                        <a href="/?page=test_tool" class="navigation__submenu-link">
                            <i class="fas fa-vial"></i> システムテスト
                        </a>
                        <a href="/?page=dev_support" class="navigation__submenu-link">
                            <i class="fas fa-code"></i> 開発補助
                        </a>
                        <a href="/?page=quality_control" class="navigation__submenu-link">
                            <i class="fas fa-check-circle"></i> 品質管理
                        </a>
                        <a href="/?page=performance_monitor" class="navigation__submenu-link">
                            <i class="fas fa-chart-area"></i> 性能監視
                        </a>
                    </div>
                </li>

                <!-- タスクカレンダー -->
                <li class="navigation__item">
                    <a href="/?page=task_calendar" class="navigation__link">
                        <i class="navigation__icon fas fa-calendar-alt"></i>
                        <span class="navigation__text">タスクカレンダー</span>
                    </a>
                </li>

                <!-- 画像管理 -->
                <li class="navigation__item">
                    <a href="/?page=image_management" class="navigation__link">
                        <i class="navigation__icon fas fa-images"></i>
                        <span class="navigation__text">画像管理</span>
                    </a>
                </li>

                <!-- ✅ トグルボタン（既存のインラインJS維持） -->
                <li class="navigation__item navigation__item--toggle">
                    <button class="navigation__link navigation__link--toggle" onclick="
const s=document.querySelector('.sidebar');
const c=document.querySelector('.content,.main-content');
if(s.classList.contains('sidebar--collapsed')){
  s.classList.remove('sidebar--collapsed');
  c.style.marginLeft='250px';
  console.log('サイドバー展開');
}else{
  s.classList.add('sidebar--collapsed');
  c.style.marginLeft='60px';
  console.log('サイドバー折りたたみ');
}
" title="サイドバー切り替え">
                        <i class="navigation__icon fas fa-bars"></i>
                        <span class="navigation__text">メニュー切替</span>
                    </button>
                </li>
                
            </ul>
        </nav>
        
    </div>
</aside>