<?php
/**
 * 📁 common/templates/header.php - 完全インラインJS除去版
 * 
 * ✅ 全てのJavaScriptを外部ファイルに移動
 * ✅ onclick属性をdata-action属性に変更
 * ✅ 元のデザイン・機能は完全保持
 * ✅ NAGANO3統合システム対応
 */

// 現在時刻取得
$current_time = date('H:i');
$current_date = date('m/d');
?>

<!-- ヘッダー（完全JS除去版） -->
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
            data-search-action="perform"
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
                <div class="clock__time-main" id="clock-tokyo"><?php echo $current_time; ?></div>
                <div class="clock__time-sub" id="date-tokyo"><?php echo $current_date; ?></div>
            </div>
        </div>
    </div>

    <!-- 為替レート -->
    <div class="exchange-rates">
        <div class="rate__item rate__item--usd">
            <span class="rate__label">USD/JPY:</span>
            <span class="rate__value" id="rate-usdjpy">154.32</span>
        </div>
        <div class="rate__item">
            <span class="rate__label">EUR/JPY:</span>
            <span class="rate__value" id="rate-eurjpy">167.45</span>
        </div>
    </div>

    <!-- ヘッダー右側アクション -->
    <div class="header__actions">
        
        <!-- 通知アイコン -->
        <div class="notification__container">
            <button class="notification__icon" data-action="toggle-notifications" data-tooltip="通知">
                <i class="fas fa-bell"></i>
                <span class="notification__badge" id="notification-count">3</span>
            </button>
        </div>
        
        <!-- テーマ切り替え -->
        <div class="theme-switcher" data-action="toggle-theme" data-tooltip="テーマ切り替え">
            <i class="fas fa-palette"></i>
        </div>

        <!-- ユーザーランキング -->
        <div class="user-ranking" data-action="show-user-ranking" data-tooltip="ユーザーランキング">
            <i class="fas fa-trophy"></i>
        </div>

        <!-- マニュアルボタン -->
        <div class="manual-btn" data-action="open-manual" data-tooltip="マニュアル">
            <i class="fas fa-book"></i>
        </div>

        <!-- ユーザー情報 -->
        <div class="user__info" data-action="toggle-user-menu">
            <div class="user__avatar">N</div>
            <div class="user__info-text">NAGANO-3 User</div>
        </div>
    </div>

    <!-- モバイル用メニューボタン -->
    <button class="mobile-menu__toggle" data-action="toggle-mobile-menu">
        <i class="fas fa-bars menu-icon"></i>
        <i class="fas fa-times close-icon" style="display: none;"></i>
    </button>

</header>

<!-- ✅ JavaScript外部ファイル読み込み（NAGANO3統合システム経由） -->
<!-- main.jsが全ての外部JSファイルを自動読み込み -->
<!-- header.jsは common/js/core/header.js に配置済み -->