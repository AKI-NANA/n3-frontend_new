<?php
/**
 * ヘッダーテンプレート - <head>タグ含む共通ヘッダー部分
 * 既存style.cssのBEM準拠クラス名を維持
 */
?>
<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $page_title ?? 'NAGANO-3 統合管理システム'; ?> | Emverze SaaS</title>

    <!-- セキュリティヘッダー -->
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self';">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="X-XSS-Protection" content="1; mode=block">

    <!-- 外部ライブラリ -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">

    <!-- 既存CSSファイル（BEM準拠クラス名維持） -->
    <link href="/style.css" rel="stylesheet">

    <!-- 認証済みユーザー情報をJavaScriptに渡す -->
    <?php if (isset($GLOBALS['current_user'])): ?>
    <script>
        window.authUser = {
            id: <?php echo $GLOBALS['current_user']['id']; ?>,
            username: '<?php echo htmlspecialchars($GLOBALS['current_user']['username']); ?>',
            name: '<?php echo htmlspecialchars($GLOBALS['current_user']['name']); ?>',
            role: '<?php echo htmlspecialchars($GLOBALS['current_user']['role']); ?>'
        };
    </script>
    <?php endif; ?>

    <!-- CSRF対策トークン -->
    <meta name="csrf-token" content="<?php echo $_SESSION['csrf_token'] ?? ''; ?>">
</head>
<body data-system-ready="false">

<!-- ヘッダー（既存BEMクラス名維持） -->
<header class="header" id="mainHeader">
    <div class="header-left">
        <a href="/?page=dashboard" class="logo">
            <div class="logo__icon">N3</div>
            <div class="logo__text">
                <h1>NAGANO-3</h1>
            </div>
        </a>
    </div>

    <!-- 検索機能（BEM準拠） -->
    <div class="header__search" id="headerSearchContainer">
        <i class="fas fa-search search__icon"></i>
        <input type="text" class="search__input" 
               placeholder="注文番号、顧客ID、商品名で検索..." id="globalSearchInput">
    </div>

    <!-- 世界時計（BEM準拠・間隔統一版） -->
    <div class="world-clock">
        <div class="clock__item">
            <div class="clock__label">西海岸</div>
            <div class="clock__time">
                <div class="clock__time-main" id="westCoastTime">01:07</div>
                <div class="clock__time-sub" id="westCoastDate">06/03</div>
            </div>
        </div>
        <div class="clock__item">
            <div class="clock__label">東海岸</div>
            <div class="clock__time">
                <div class="clock__time-main" id="eastCoastTime">04:07</div>
                <div class="clock__time-sub" id="eastCoastDate">06/03</div>
            </div>
        </div>
        <div class="clock__item">
            <div class="clock__label">ドイツ</div>
            <div class="clock__time">
                <div class="clock__time-main" id="germanyTime">15:41</div>
                <div class="clock__time-sub" id="germanyDate">06/03</div>
            </div>
        </div>
        <div class="clock__item clock__item--japan">
            <div class="clock__label">日本</div>
            <div class="clock__time">
                <div class="clock__time-main" id="japanTime">22:41</div>
                <div class="clock__date" id="japanDate">06/03(火)</div>
            </div>
        </div>
    </div>

    <!-- 為替表示（BEM準拠） -->
    <div class="exchange-rates">
        <div class="rate__item rate__item--usd">
            <div class="rate__value" id="usdRate">¥149.2</div>
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
            <div class="rate__value" id="eurRate">¥162.8</div>
            <div class="rate__label">EUR</div>
        </div>
        <div class="rate__item">
            <div class="rate__value" id="gbpRate">¥189.5</div>
            <div class="rate__label">GBP</div>
        </div>
    </div>

    <!-- ヘッダーアクション（BEM準拠） -->
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
            <div class="user__avatar"><?php echo strtoupper(substr($GLOBALS['current_user']['name'] ?? 'N', 0, 1)); ?></div>
            <div class="user__info-text"><?php echo htmlspecialchars($GLOBALS['current_user']['name'] ?? 'NAGANO-3 User'); ?></div>
        </div>
    </div>

    <!-- モバイル用メニューボタン -->
    <button class="mobile-menu__toggle" id="mobileMenuToggle">
        <i class="fas fa-bars menu-icon"></i>
        <i class="fas fa-times close-icon"></i>
    </button>
</header>