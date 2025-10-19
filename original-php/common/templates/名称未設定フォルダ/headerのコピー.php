<?php
/**
 * NAGANO-3統合管理システム - ヘッダーテンプレート
 * 元HTML: 02_index.html の完全移植版
 * 世界時計・為替レート・通知システム・グローバル検索を含む
 */

// セキュリティ: CSRFトークンの設定
$csrf_token = $_SESSION['csrf_token'] ?? '';
$page_title = $page_title ?? 'NAGANO-3 統合管理システム | Emverze SaaS';
$current_user = $GLOBALS['current_user'] ?? ['name' => 'NAGANO-3 User', 'avatar' => 'N'];
?>

<!-- ヘッダー（BEM準拠・完全版） -->
<header class="header" id="mainHeader">
  <div class="header-left">
    <a href="/" class="logo">
      <div class="logo__icon">N3</div>
      <div class="logo__text">
        <h1>NAGANO-3</h1>
      </div>
    </a>
  </div>

  <!-- 検索機能（BEM準拠） -->
  <div class="header__search" id="headerSearchContainer">
    <i class="fas fa-search search__icon"></i>
    <input
      type="text"
      class="search__input"
      placeholder="注文番号、顧客ID、商品名で検索..."
      id="globalSearchInput"
      data-csrf="<?php echo htmlspecialchars($csrf_token, ENT_QUOTES, 'UTF-8'); ?>"
    />
  </div>

  <!-- 世界時計（BEM準拠・間隔統一版・JavaScript動的更新） -->
  <div class="world-clock">
    <div class="clock__item">
      <div class="clock__label">西海岸</div>
      <div class="clock__time">
        <div class="clock__time-main" id="westCoastTime">01:07</div>
        <div class="clock__time-sub" id="westCoastDate">05/30</div>
      </div>
    </div>
    <div class="clock__item">
      <div class="clock__label">東海岸</div>
      <div class="clock__time">
        <div class="clock__time-main" id="eastCoastTime">04:07</div>
        <div class="clock__time-sub" id="eastCoastDate">05/30</div>
      </div>
    </div>
    <div class="clock__item">
      <div class="clock__label">ドイツ</div>
      <div class="clock__time">
        <div class="clock__time-main" id="germanyTime">15:41</div>
        <div class="clock__time-sub" id="germanyDate">05/30</div>
      </div>
    </div>
    <div class="clock__item clock__item--japan">
      <div class="clock__label">日本</div>
      <div class="clock__time">
        <div class="clock__time-main" id="japanTime">22:41</div>
        <div class="clock__date" id="japanDate">05/30(金)</div>
      </div>
    </div>
  </div>

  <!-- 為替表示（BEM準拠・JavaScript動的更新） -->
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
    <!-- 通知アイコンシステム（BEM準拠・現在の静的値維持） -->
    <div class="notification__container" id="notificationContainer">
      <div
        class="notification__icon notification__icon--system"
        id="systemNotificationIcon"
      >
        <i class="fas fa-server"></i>
        <div class="notification__badge" data-type="system">0</div>
      </div>

      <div
        class="notification__icon notification__icon--chatwork"
        id="chatworkNotificationIcon"
      >
        <i class="fas fa-comments"></i>
        <div class="notification__badge" data-type="chatwork">3</div>
      </div>

      <div
        class="notification__icon notification__icon--inquiry"
        id="inquiryNotificationIcon"
      >
        <i class="fas fa-envelope"></i>
        <div class="notification__badge" data-type="inquiry">5</div>
      </div>

      <div
        class="notification__icon notification__icon--purchase"
        id="purchaseNotificationIcon"
      >
        <i class="fas fa-cart-plus"></i>
        <div class="notification__badge" data-type="purchase">12</div>
      </div>

      <div
        class="notification__icon notification__icon--shipping"
        id="shippingNotificationIcon"
      >
        <i class="fas fa-truck"></i>
        <div class="notification__badge" data-type="shipping">8</div>
      </div>

      <div
        class="notification__icon notification__icon--ai"
        id="aiNotificationIcon"
      >
        <i class="fas fa-robot"></i>
        <div class="notification__badge" data-type="ai">0</div>
      </div>
    </div>

    <!-- テーマ切り替え（BEM準拠） -->
    <div
      class="theme-switcher"
      id="themeSwitcher"
      data-tooltip="ダークモードに切り替え"
    >
      <i class="fas fa-palette"></i>
    </div>

    <!-- ユーザーランキング（BEM準拠） -->
    <div
      class="user-ranking"
      id="userRanking"
      data-tooltip="ユーザーランキング"
    >
      <i class="fas fa-trophy"></i>
    </div>

    <!-- マニュアル（BEM準拠） -->
    <div
      class="manual-btn"
      id="manualBtn"
      data-tooltip="マニュアル・ヘルプ"
    >
      <i class="fas fa-question-circle"></i>
    </div>

    <!-- ユーザー情報（BEM準拠・PHP変数使用） -->
    <div class="user__info" id="userInfo">
      <div class="user__avatar"><?php echo htmlspecialchars(substr($current_user['name'], 0, 1), ENT_QUOTES, 'UTF-8'); ?></div>
      <div class="user__info-text"><?php echo htmlspecialchars($current_user['name'], ENT_QUOTES, 'UTF-8'); ?></div>
    </div>
  </div>

  <!-- モバイル用メニューボタン（BEM準拠） -->
  <button class="mobile-menu__toggle" id="mobileMenuToggle">
    <i class="fas fa-bars menu-icon"></i>
    <i class="fas fa-times close-icon"></i>
  </button>
</header>

<!-- CSRFトークンをJavaScript用にグローバル設定 -->
<meta name="csrf-token" content="<?php echo htmlspecialchars($csrf_token, ENT_QUOTES, 'UTF-8'); ?>">