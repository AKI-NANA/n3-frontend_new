<?php
/**
 * NAGANO-3 ヘッダーテンプレート（WEB HTMLそのまま適用版）
 * - 元のWEB構造を完全保持
 * - N3準拠セキュリティ適用
 * - レスポンシブ対応
 */

// N3セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

// 現在時刻取得
$current_time = date('H:i');
$current_date = date('m/d');
?>

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
                <div class="clock__time-main" id="clock-tokyo"><?php echo $current_time; ?></div>
                <div class="clock__time-sub" id="date-tokyo"><?php echo $current_date; ?></div>
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
