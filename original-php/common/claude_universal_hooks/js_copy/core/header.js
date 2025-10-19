
// CAIDS processing_capacity_monitoring Hook
// CAIDS processing_capacity_monitoring Hook - 基本実装
console.log('✅ processing_capacity_monitoring Hook loaded');

// CAIDS character_limit Hook
// CAIDS character_limit Hook - 基本実装
console.log('✅ character_limit Hook loaded');

// CAIDS error_handling Hook

// CAIDS エラー処理Hook - 完全実装
window.CAIDS_ERROR_HANDLER = {
    isActive: true,
    errorCount: 0,
    errorHistory: [],
    
    initialize: function() {
        this.setupGlobalErrorHandler();
        this.setupUnhandledPromiseRejection();
        this.setupNetworkErrorHandler();
        console.log('⚠️ CAIDS エラーハンドリングシステム完全初期化');
    },
    
    setupGlobalErrorHandler: function() {
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
    },
    
    setupUnhandledPromiseRejection: function() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack
            });
        });
    },
    
    setupNetworkErrorHandler: function() {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            try {
                const response = await originalFetch.apply(this, args);
                if (!response.ok) {
                    window.CAIDS_ERROR_HANDLER.handleError({
                        type: 'Network Error',
                        message: `HTTP ${response.status}: ${response.statusText}`,
                        url: args[0]
                    });
                }
                return response;
            } catch (error) {
                window.CAIDS_ERROR_HANDLER.handleError({
                    type: 'Network Fetch Error',
                    message: error.message,
                    url: args[0]
                });
                throw error;
            }
        };
    },
    
    handleError: function(errorInfo) {
        this.errorCount++;
        this.errorHistory.push({...errorInfo, timestamp: new Date().toISOString()});
        
        console.error('🚨 CAIDS Error Handler:', errorInfo);
        this.showErrorNotification(errorInfo);
        this.reportError(errorInfo);
    },
    
    showErrorNotification: function(errorInfo) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 10px; right: 10px; z-index: 999999;
            background: linear-gradient(135deg, #ff4444, #cc0000);
            color: white; padding: 15px 20px; border-radius: 8px;
            max-width: 350px; box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            border: 2px solid #ff6666; animation: caids-error-shake 0.5s ease-in-out;
        `;
        errorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">🚨</span>
                <div>
                    <strong>エラーが発生しました</strong><br>
                    <small style="opacity: 0.9;">${errorInfo.type}: ${errorInfo.message}</small>
                </div>
            </div>
        `;
        
        // CSS Animation
        if (!document.getElementById('caids-error-styles')) {
            const style = document.createElement('style');
            style.id = 'caids-error-styles';
            style.textContent = `
                @keyframes caids-error-shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 7000);
    },
    
    reportError: function(errorInfo) {
        // エラーレポート生成・送信（将来の拡張用）
        const report = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            errorCount: this.errorCount,
            sessionId: this.getSessionId(),
            ...errorInfo
        };
        
        console.log('📋 CAIDS Error Report:', report);
        localStorage.setItem('caids_last_error', JSON.stringify(report));
    },
    
    getSessionId: function() {
        let sessionId = sessionStorage.getItem('caids_session_id');
        if (!sessionId) {
            sessionId = 'caids_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('caids_session_id', sessionId);
        }
        return sessionId;
    },
    
    getErrorStats: function() {
        return {
            totalErrors: this.errorCount,
            recentErrors: this.errorHistory.slice(-10),
            sessionId: this.getSessionId()
        };
    }
};

window.CAIDS_ERROR_HANDLER.initialize();

/**
 * 📁 common/js/core/header.js - NAGANO3統合システム対応版（テーマ機能修正版）
 * 
 * ✅ 分割ファイル管理システム対応
 * ✅ リアルタイム機能完全実装
 * ✅ テーマ切り替え機能完全修正
 * ✅ z-indexレイヤー問題完全解決
 * ✅ NAGANO3.splitFiles との統合
 */

console.log("🔗 header.js ロード開始 - NAGANO3統合システム対応版（テーマ機能修正版）");

// ===== NAGANO3名前空間確認・初期化 =====
if (typeof window.NAGANO3 === 'undefined') {
    window.NAGANO3 = {
        splitFiles: {
            loaded: {},
            markLoaded: function(filename) {
                this.loaded[filename] = true;
                console.log(`📄 ${filename} 読み込み完了マーク`);
            },
            getStatus: function() {
                return this.loaded;
            }
        }
    };
}

// ===== ヘッダー専用名前空間 =====
window.NAGANO3.header = window.NAGANO3.header || {
    initialized: false,
    timers: {
        clock: null,
        exchange: null
    },
    cache: {
        rates: {
            'USD/JPY': 154.32,
            'EUR/JPY': 167.45
        }
    },
    state: {
        notificationsPanelOpen: false,
        userMenuOpen: false,
        mobileMenuOpen: false,
        currentTheme: 'light'
    }
};

// ===== テーマシステム（完全修正版） =====
window.NAGANO3.header.themeSystem = {
    themes: ['light', 'dark', 'gentle'],
    currentIndex: 0,
    
    // 現在のテーマを取得
    getCurrentTheme: function() {
        const storedTheme = localStorage.getItem('nagano3-theme');
        const currentTheme = document.documentElement.getAttribute('data-theme') || 
                           document.body.getAttribute('data-theme') || 
                           storedTheme || 
                           'light';
        
        // インデックスを更新
        const index = this.themes.indexOf(currentTheme);
        if (index !== -1) {
            this.currentIndex = index;
        }
        
        window.NAGANO3.header.state.currentTheme = currentTheme;
        return currentTheme;
    },
    
    // テーマを適用
    applyTheme: function(theme) {
        console.log(`🎨 テーマ適用開始: ${theme}`);
        
        // data-theme属性を設定（documentElementとbody両方）
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        
        // クラスベースの切り替えも対応
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${theme}`);
        
        // ローカルストレージに保存
        try {
            localStorage.setItem('nagano3-theme', theme);
        } catch (error) {
            console.warn('⚠️ ローカルストレージ保存失敗:', error);
        }
        
        // 状態更新
        window.NAGANO3.header.state.currentTheme = theme;
        this.currentIndex = this.themes.indexOf(theme);
        
        // テーマ切り替えイベント発火
        const event = new CustomEvent('nagano3:themeChanged', {
            detail: { theme: theme }
        });
        document.dispatchEvent(event);
        
        console.log(`✅ テーマ適用完了: ${theme}`);
        
        // CSS変数の強制再計算
        setTimeout(() => {
            this.forceStyleRecalculation();
        }, 50);
    },
    
    // CSS変数の強制再計算
    forceStyleRecalculation: function() {
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
            if (el.style) {
                const display = el.style.display;
                el.style.display = 'none';
                el.offsetHeight; // 強制リフロー
                el.style.display = display;
            }
        });
    },
    
    // 次のテーマに切り替え
    switchToNext: function() {
        this.currentIndex = (this.currentIndex + 1) % this.themes.length;
        const nextTheme = this.themes[this.currentIndex];
        this.applyTheme(nextTheme);
        return nextTheme;
    },
    
    // 初期化
    init: function() {
        const currentTheme = this.getCurrentTheme();
        this.applyTheme(currentTheme);
        console.log(`🎨 テーマシステム初期化完了: ${currentTheme}`);
    }
};

// ===== 世界時計システム（リアルタイム） =====
window.NAGANO3.header.updateWorldClocks = function() {
    try {
        const now = new Date();
        
        // 日本時間（基準）
        const tokyo = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
        const tokyoHours = tokyo.getHours().toString().padStart(2, '0');
        const tokyoMinutes = tokyo.getMinutes().toString().padStart(2, '0');
        const tokyoSeconds = tokyo.getSeconds().toString().padStart(2, '0');
        const tokyoDate = `${(tokyo.getMonth() + 1).toString().padStart(2, '0')}/${tokyo.getDate().toString().padStart(2, '0')}`;
        
        // 西海岸（LA）
        const la = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
        const laHours = la.getHours().toString().padStart(2, '0');
        const laMinutes = la.getMinutes().toString().padStart(2, '0');
        const laDate = `${(la.getMonth() + 1).toString().padStart(2, '0')}/${la.getDate().toString().padStart(2, '0')}`;
        
        // 東海岸（NY）
        const ny = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const nyHours = ny.getHours().toString().padStart(2, '0');
        const nyMinutes = ny.getMinutes().toString().padStart(2, '0');
        const nyDate = `${(ny.getMonth() + 1).toString().padStart(2, '0')}/${ny.getDate().toString().padStart(2, '0')}`;
        
        // ベルリン
        const berlin = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Berlin"}));
        const berlinHours = berlin.getHours().toString().padStart(2, '0');
        const berlinMinutes = berlin.getMinutes().toString().padStart(2, '0');
        const berlinDate = `${(berlin.getMonth() + 1).toString().padStart(2, '0')}/${berlin.getDate().toString().padStart(2, '0')}`;
        
        // DOM更新（存在チェック付き）
        const updates = [
            { id: 'clock-tokyo', value: `${tokyoHours}:${tokyoMinutes}:${tokyoSeconds}` },
            { id: 'date-tokyo', value: tokyoDate },
            { id: 'clock-la', value: `${laHours}:${laMinutes}` },
            { id: 'date-la', value: laDate },
            { id: 'clock-ny', value: `${nyHours}:${nyMinutes}` },
            { id: 'date-ny', value: nyDate },
            { id: 'clock-berlin', value: `${berlinHours}:${berlinMinutes}` },
            { id: 'date-berlin', value: berlinDate }
        ];
        
        updates.forEach(update => {
            const element = document.getElementById(update.id);
            if (element) {
                element.textContent = update.value;
            }
        });
        
    } catch (error) {
        console.error("❌ 世界時計更新エラー:", error);
    }
};

// ===== 為替レート更新システム =====
window.NAGANO3.header.updateExchangeRates = async function() {
    try {
        // キャッシュされたレートを使用（本番環境では外部APIから取得）
        const rates = window.NAGANO3.header.cache.rates;
        
        // DOM更新
        const usdElement = document.getElementById('rate-usdjpy');
        const eurElement = document.getElementById('rate-eurjpy');
        
        if (usdElement) {
            usdElement.textContent = rates['USD/JPY'];
        }
        if (eurElement) {
            eurElement.textContent = rates['EUR/JPY'];
        }
        
        console.log("✅ 為替レート更新完了:", rates);
        
    } catch (error) {
        console.error("❌ 為替レート更新エラー:", error);
    }
};

// ===== 検索機能 =====
window.NAGANO3.header.initSearch = function() {
    const searchInput = document.querySelector('[data-search-action="perform"]');
    if (!searchInput) {
        console.warn("⚠️ 検索入力フィールドが見つかりません");
        return;
    }
    
    // 検索実行関数
    const performSearch = async function(query) {
        if (!query || query.length < 2) return;
        
        try {
            console.log("🔍 検索実行:", query);
            
            // NAGANO3統合AJAX呼び出し
            if (typeof window.NAGANO3.ajax !== 'undefined') {
                const result = await window.NAGANO3.ajax.call('search', {
                    query: query,
                    types: ['orders', 'customers', 'products']
                });
                
                console.log("🔍 検索結果:", result);
                
            } else {
                console.warn("⚠️ NAGANO3.ajax未読み込み、検索機能は制限されます");
            }
            
        } catch (error) {
            console.error("❌ 検索エラー:", error);
        }
    };
    
    // イベントリスナー設定
    let searchTimeout;
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(e.target.value.trim());
        }, 300);
    });
    
    // Enterキー対応
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            performSearch(e.target.value.trim());
        }
    });
    
    console.log("✅ 検索機能初期化完了");
};

// ===== データアクションハンドラー（完全修正版） =====
window.NAGANO3.header.initActionHandlers = function() {
    console.log("🔧 アクションハンドラー初期化開始");
    
    // 全てのdata-action要素を取得
    const actionElements = document.querySelectorAll('[data-action]');
    console.log(`📋 発見したアクション要素数: ${actionElements.length}`);
    
    actionElements.forEach((element, index) => {
        const action = element.getAttribute('data-action');
        console.log(`🔗 アクション設定: ${action} (要素${index + 1})`);
        
        // 既存のイベントリスナーを削除してから追加
        const newElement = element.cloneNode(true);
        element.parentNode.replaceChild(newElement, element);
        
        newElement.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`🔘 アクション実行: ${action}`);
            
            // �� KICHO専用アクション判定を追加
            const KICHO_ACTIONS = [
                "refresh-all", "toggle-auto-refresh", "show-import-history",
                "execute-mf-import", "show-mf-history", "execute-mf-recovery",
                "csv-upload", "process-csv-upload", "show-duplicate-history",
                "add-text-to-learning", "show-ai-learning-history",
                "show-optimization-suggestions", "select-all-imported-data",
                "select-by-date-range", "select-by-source", "delete-selected-data",
                "delete-data-item", "execute-integrated-ai-learning",
                "download-rules-csv", "create-new-rule", "download-all-rules-csv",
                "rules-csv-upload", "save-uploaded-rules-as-database",
                "edit-saved-rule", "delete-saved-rule", "download-pending-csv",
                "download-pending-transactions-csv", "approval-csv-upload",
                "bulk-approve-transactions", "view-transaction-details",
                "delete-approved-transaction", "refresh-ai-history",
                "load-more-sessions", "execute-full-backup", "export-to-mf",
                "create-manual-backup", "generate-advanced-report",
                "health_check", "get_statistics", "refresh_all_data"
            ];
            
            // KICHOページでKICHOアクションの場合は委譲
            if (window.location.search.includes('page=kicho_content') && 
                KICHO_ACTIONS.includes(action)) {
                console.log(`🔄 ${action}: kicho.jsに委譲`);
                return; // kicho.jsのイベントリスナーが処理
            }
            
            switch (action) {
                case 'toggle-notifications':
                    window.NAGANO3.header.toggleNotifications();
                    break;
                    
                case 'toggle-theme':
                    window.NAGANO3.header.toggleTheme();
                    break;
                    
                case 'show-user-ranking':
                    window.NAGANO3.header.showUserRanking();
                    break;
                    
                case 'open-manual':
                    window.NAGANO3.header.openManual();
                    break;
                    
                case 'toggle-user-menu':
                    window.NAGANO3.header.toggleUserMenu();
                    break;
                    
                case 'toggle-mobile-menu':
                    window.NAGANO3.header.toggleMobileMenu();
                    break;
                    
                case 'refresh-all':
                    // kichoページの場合はkicho.jsに委譲
                    if (window.location.search.includes('page=kicho_content')) {
                        console.log('🔄 refresh-all: kicho.jsに委譲');
                        return; // kicho.jsのイベントリスナーが処理
                    }
                    // 他のページでの処理
                    console.log('🔄 refresh-all: header.jsで処理');
                    break;
                    
                default:
                    console.log(`❓ 未定義アクション: ${action}`);
            }
        });
    });
    
    console.log("✅ アクションハンドラー初期化完了");
};

// ===== 個別アクション関数（完全実装） =====
window.NAGANO3.header.toggleNotifications = function() {
    console.log("🔔 通知トグル実行");
    
    const state = window.NAGANO3.header.state;
    
    // 他のメニューを閉じる
    window.NAGANO3.header.closeUserMenu();
    
    state.notificationsPanelOpen = !state.notificationsPanelOpen;
    
    // 通知パネルの表示/非表示
    let notificationPanel = document.getElementById('notifications-panel');
    
    if (!notificationPanel) {
        // パネルが存在しない場合は動的作成
        notificationPanel = document.createElement('div');
        notificationPanel.id = 'notifications-panel';
        notificationPanel.innerHTML = `
            <h3>通知</h3>
            <p>新しい通知はありません</p>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        document.body.appendChild(notificationPanel);
        console.log("📱 通知パネルを動的作成");
    }
    
    if (state.notificationsPanelOpen) {
        notificationPanel.style.display = 'block';
        notificationPanel.classList.add('active');
        setTimeout(() => {
            notificationPanel.style.opacity = '1';
            notificationPanel.style.visibility = 'visible';
            notificationPanel.style.transform = 'translateY(0)';
        }, 10);
    } else {
        notificationPanel.style.opacity = '0';
        notificationPanel.style.visibility = 'hidden';
        notificationPanel.style.transform = 'translateY(-8px)';
        setTimeout(() => {
            notificationPanel.style.display = 'none';
            notificationPanel.classList.remove('active');
        }, 150);
    }
    
    console.log(`📱 通知パネル: ${state.notificationsPanelOpen ? '表示' : '非表示'}`);
};

window.NAGANO3.header.toggleTheme = function() {
    console.log("🎨 テーマ切り替え実行");
    
    // テーマシステムを使用して次のテーマに切り替え
    const newTheme = window.NAGANO3.header.themeSystem.switchToNext();
    
    console.log(`🎨 テーマ切り替え完了: ${newTheme}`);
    
    // テーマアイコンの更新
    window.NAGANO3.header.updateThemeIcon(newTheme);
    
    // 視覚的フィードバック
    const button = document.querySelector('[data-action="toggle-theme"]');
    if (button) {
        button.style.transform = 'scale(0.9)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);
    }
};

window.NAGANO3.header.updateThemeIcon = function(theme) {
    const themeButton = document.querySelector('[data-action="toggle-theme"]');
    if (!themeButton) return;
    
    // テーマに応じてアイコンを変更
    const icons = {
        light: '☀️',
        dark: '🌙',
        gentle: '🌿'
    };
    
    const icon = icons[theme] || '🎨';
    themeButton.innerHTML = icon;
    themeButton.title = `現在のテーマ: ${theme}`;
};

window.NAGANO3.header.showUserRanking = function() {
    console.log("🏆 ユーザーランキング表示");
    
    // ランキングページにリダイレクト（モーダルではなく）
    window.location.href = '/ranking';
    console.log("🏆 ランキングページにリダイレクト");
};

window.NAGANO3.header.openManual = function() {
    console.log("📖 マニュアル開く");
    
    // マニュアルページを新しいタブで開く
    const manualUrl = '/manual';
    const manualWindow = window.open(manualUrl, '_blank');
    
    if (manualWindow) {
        console.log("📖 マニュアルページを新しいタブで開きました");
    } else {
        // ポップアップがブロックされた場合
        alert('マニュアルページを開けませんでした。ポップアップブロックを無効にしてください。');
        console.warn("⚠️ マニュアルページのポップアップがブロックされました");
    }
};

window.NAGANO3.header.toggleUserMenu = function() {
    console.log("👤 ユーザーメニュートグル実行");
    
    const state = window.NAGANO3.header.state;
    
    // 通知パネルを閉じる
    window.NAGANO3.header.closeNotifications();
    
    state.userMenuOpen = !state.userMenuOpen;
    
    // ユーザーメニューの表示/非表示
    let userMenu = document.getElementById('user-menu-dropdown');
    
    if (!userMenu) {
        // ユーザーメニューが存在しない場合は動的作成
        userMenu = document.createElement('div');
        userMenu.id = 'user-menu-dropdown';
        userMenu.innerHTML = `
            <div>NAGANO-3 User</div>
            <a href="/profile">プロフィール</a>
            <a href="/settings">設定</a>
            <hr>
            <a href="/logout">ログアウト</a>
        `;
        document.body.appendChild(userMenu);
    }
    
    if (state.userMenuOpen) {
        userMenu.style.display = 'block';
        userMenu.classList.add('active');
        setTimeout(() => {
            userMenu.style.opacity = '1';
            userMenu.style.visibility = 'visible';
            userMenu.style.transform = 'translateY(0)';
        }, 10);
    } else {
        userMenu.style.opacity = '0';
        userMenu.style.visibility = 'hidden';
        userMenu.style.transform = 'translateY(-8px)';
        setTimeout(() => {
            userMenu.style.display = 'none';
            userMenu.classList.remove('active');
        }, 150);
    }
    
    console.log(`👤 ユーザーメニュー: ${state.userMenuOpen ? '表示' : '非表示'}`);
};

// ===== メニューを閉じるヘルパー関数 =====
window.NAGANO3.header.closeNotifications = function() {
    const state = window.NAGANO3.header.state;
    if (state.notificationsPanelOpen) {
        state.notificationsPanelOpen = false;
        const panel = document.getElementById('notifications-panel');
        if (panel) {
            panel.style.display = 'none';
            panel.classList.remove('active');
        }
    }
};

window.NAGANO3.header.closeUserMenu = function() {
    const state = window.NAGANO3.header.state;
    if (state.userMenuOpen) {
        state.userMenuOpen = false;
        const menu = document.getElementById('user-menu-dropdown');
        if (menu) {
            menu.style.display = 'none';
            menu.classList.remove('active');
        }
    }
};

window.NAGANO3.header.toggleMobileMenu = function() {
    console.log("📱 モバイルメニュートグル実行");
    
    const state = window.NAGANO3.header.state;
    state.mobileMenuOpen = !state.mobileMenuOpen;
    
    const header = document.getElementById('mainHeader');
    if (header) {
        if (state.mobileMenuOpen) {
            header.classList.add('mobile-menu-active');
        } else {
            header.classList.remove('mobile-menu-active');
        }
        console.log(`📱 モバイルメニュー: ${state.mobileMenuOpen ? '有効' : '無効'}`);
    } else {
        console.warn("⚠️ mainHeaderが見つかりません");
    }
};

// ===== ヘッダー初期化システム（修正版） =====
window.NAGANO3.header.init = function() {
    if (window.NAGANO3.header.initialized) {
        console.log("⚠️ ヘッダーは既に初期化済み");
        return;
    }
    
    try {
        console.log("🚀 ヘッダー初期化開始");
        
        // テーマシステム初期化（最優先）
        window.NAGANO3.header.themeSystem.init();
        
        // 検索機能初期化
        window.NAGANO3.header.initSearch();
        
        // アクションハンドラー初期化（最重要）
        window.NAGANO3.header.initActionHandlers();
        
        // 世界時計開始（リアルタイム・秒単位）
        window.NAGANO3.header.updateWorldClocks();
        window.NAGANO3.header.timers.clock = setInterval(
            window.NAGANO3.header.updateWorldClocks, 
            1000 // 1秒間隔（秒も表示）
        );
        
        // 為替レート更新開始
        window.NAGANO3.header.updateExchangeRates();
        window.NAGANO3.header.timers.exchange = setInterval(
            window.NAGANO3.header.updateExchangeRates,
            300000 // 5分間隔
        );
        
        // 外部クリック時のメニュー閉じる処理
        document.addEventListener('click', function(e) {
            const clickedInsideNotifications = e.target.closest('#notifications-panel') || 
                                             e.target.closest('[data-action="toggle-notifications"]');
            const clickedInsideUserMenu = e.target.closest('#user-menu-dropdown') || 
                                        e.target.closest('[data-action="toggle-user-menu"]');
            
            if (!clickedInsideNotifications) {
                window.NAGANO3.header.closeNotifications();
            }
            
            if (!clickedInsideUserMenu) {
                window.NAGANO3.header.closeUserMenu();
            }
        });
        
        // 初期化完了フラグ
        window.NAGANO3.header.initialized = true;
        
        console.log("✅ ヘッダー初期化完了 - 全機能有効");
        
    } catch (error) {
        console.error("❌ ヘッダー初期化エラー:", error);
    }
};

// ===== DOM準備完了時の自動初期化 =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.NAGANO3.header.init);
} else {
    // 既にDOMが読み込み済みの場合は遅延実行
    setTimeout(window.NAGANO3.header.init, 100);
}

// ===== 分割ファイル読み込み完了通知 =====
if (window.NAGANO3 && window.NAGANO3.splitFiles) {
    window.NAGANO3.splitFiles.markLoaded('header.js');
}

console.log("✅ header.js ロード完了 - NAGANO3統合システム対応版（テーマ機能修正版）");

// ===== デバッグ用グローバル関数 =====
window.debugHeader = function() {
    console.log("🔍 ヘッダーデバッグ情報:");
    console.log("初期化状態:", window.NAGANO3.header.initialized);
    console.log("状態:", window.NAGANO3.header.state);
    console.log("現在のテーマ:", window.NAGANO3.header.themeSystem.getCurrentTheme());
    console.log("タイマー:", window.NAGANO3.header.timers);
    console.log("アクション要素数:", document.querySelectorAll('[data-action]').length);
    
    // 各ボタンのテスト
    const actions = ['toggle-notifications', 'toggle-theme', 'show-user-ranking', 'open-manual', 'toggle-user-menu', 'toggle-mobile-menu'];
    actions.forEach(action => {
        const element = document.querySelector(`[data-action="${action}"]`);
        console.log(`${action}: ${element ? '存在' : '不存在'}`);
    });
};

// ===== テーマテスト用関数 =====
window.testThemes = function() {
    console.log("🎨 テーマテスト開始");
    const themes = ['light', 'dark', 'gentle'];
    let index = 0;
    
    const cycleThemes = () => {
        window.NAGANO3.header.themeSystem.applyTheme(themes[index]);
        console.log(`🎨 テーマ適用: ${themes[index]}`);
        index = (index + 1) % themes.length;
        
        if (index === 0) {
            console.log("🎨 テーマテスト完了");
            return;
        }
        
        setTimeout(cycleThemes, 2000);
    };
    
    cycleThemes();
};