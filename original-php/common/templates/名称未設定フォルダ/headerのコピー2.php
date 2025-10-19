<?php
/**
 * NAGANO-3 ヘッダーテンプレート（「ソースから復元」完全版）
 */

// escape関数定義
if (!function_exists('escape')) {
    function escape($value) {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }
}
?>
    <!-- ヘッダー（完全版） -->
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
                id="globalSearchInput"
            />
        </div>

        <!-- 世界時計 -->
        <div class="world-clock">
            <div class="clock__item">
                <div class="clock__label">西海岸</div>
                <div class="clock__time">
                    <div class="clock__time-main" id="westCoastTime">--:--</div>
                    <div class="clock__time-sub" id="westCoastDate">--/--</div>
                </div>
            </div>
            <div class="clock__item">
                <div class="clock__label">東海岸</div>
                <div class="clock__time">
                    <div class="clock__time-main" id="eastCoastTime">--:--</div>
                    <div class="clock__time-sub" id="eastCoastDate">--/--</div>
                </div>
            </div>
            <div class="clock__item">
                <div class="clock__label">ドイツ</div>
                <div class="clock__time">
                    <div class="clock__time-main" id="germanyTime">--:--</div>
                    <div class="clock__time-sub" id="germanyDate">--/--</div>
                </div>
            </div>
            <div class="clock__item clock__item--japan">
                <div class="clock__label">日本</div>
                <div class="clock__time">
                    <div class="clock__time-main" id="japanTime">--:--</div>
                    <div class="clock__date" id="japanDate">--/--</div>
                </div>
            </div>
        </div>

        <!-- 為替表示 -->
        <div class="exchange-rates">
            <div class="rate__item rate__item--usd">
                <div class="rate__value" id="usdRate">¥154.32</div>
                <div class="rate__label">USD</div>
            </div>
            <div class="rate__item">
                <div class="rate__value" id="cadRate">¥110.3</div>
                <div class="rate__label">CAD</div>
            </div>
            <div class="rate__item">
                <div class="rate__value" id="audRate">¥98.7</div>
                <div class="rate__label">AUD</div>
            </div>
            <div class="rate__item">
                <div class="rate__value" id="eurRate">¥167.45</div>
                <div class="rate__label">EUR</div>
            </div>
            <div class="rate__item">
                <div class="rate__value" id="gbpRate">¥189.5</div>
                <div class="rate__label">GBP</div>
            </div>
        </div>

        <!-- ヘッダーアクション -->
        <div class="header__actions">
            <!-- 通知アイコンシステム -->
            <div class="notification__container" id="notificationContainer">
                <div class="notification__icon notification__icon--system" id="systemNotificationIcon">
                    <i class="fas fa-server"></i>
                    <div class="notification__badge" data-type="system">0</div>
                </div>
                <div class="notification__icon notification__icon--chatwork" id="chatworkNotificationIcon">
                    <i class="fas fa-comments"></i>
                    <div class="notification__badge" data-type="chatwork">3</div>
                </div>
                <div class="notification__icon notification__icon--inquiry" id="inquiryNotificationIcon">
                    <i class="fas fa-envelope"></i>
                    <div class="notification__badge" data-type="inquiry">5</div>
                </div>
                <div class="notification__icon notification__icon--purchase" id="purchaseNotificationIcon">
                    <i class="fas fa-cart-plus"></i>
                    <div class="notification__badge" data-type="purchase">12</div>
                </div>
                <div class="notification__icon notification__icon--shipping" id="shippingNotificationIcon">
                    <i class="fas fa-truck"></i>
                    <div class="notification__badge" data-type="shipping">8</div>
                </div>
                <div class="notification__icon notification__icon--ai" id="aiNotificationIcon">
                    <i class="fas fa-robot"></i>
                    <div class="notification__badge" data-type="ai">0</div>
                </div>
            </div>

            <!-- テーマ切り替え -->
            <div class="theme-switcher" id="themeSwitcher" data-tooltip="ダークモードに切り替え">
                <i class="fas fa-palette"></i>
            </div>

            <!-- ユーザーランキング -->
            <div class="user-ranking" id="userRanking" data-tooltip="ユーザーランキング">
                <i class="fas fa-trophy"></i>
            </div>

            <!-- マニュアル -->
            <div class="manual-btn" id="manualBtn" data-tooltip="マニュアル・ヘルプ">
                <i class="fas fa-question-circle"></i>
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