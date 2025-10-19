
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
 * 📁 common/js/core/header.js - ヘッダー制御
 * 
 * 🎯 目的: ヘッダー機能の統合管理
 * ✅ Bootstrap分離対応
 * ✅ 世界時計・為替レート
 * ✅ アクションボタン制御
 */

console.log("🌐 core/header.js ロード");

// ===== NAGANO3.core.header 名前空間 =====
window.NAGANO3 = window.NAGANO3 || { core: {} };
window.NAGANO3.core = window.NAGANO3.core || {};

window.NAGANO3.core.header = {
    initialized: false,
    timers: {},
    state: {
        notificationsPanelOpen: false,
        userMenuOpen: false
    },
    
    init: function() {
        if (this.initialized) return;
        
        // アクションボタン設定
        this.setupActionButtons();
        
        // 世界時計開始
        this.startWorldClock();
        
        // 為替レート開始
        this.startExchangeRates();
        
        // 外部クリック処理
        this.setupOutsideClick();
        
        this.initialized = true;
        
        if (window.NAGANO3.config?.debug) {
            console.log("✅ ヘッダー初期化完了");
        }
    },
    
    // アクションボタン設定
    setupActionButtons: function() {
        const actionButtons = document.querySelectorAll('[data-action]');
        
        actionButtons.forEach(button => {
            const action = button.getAttribute('data-action');
            
            // 既存リスナー削除
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleAction(action, e.target);
            });
        });
        
        if (actionButtons.length > 0 && window.NAGANO3.config?.debug) {
            console.log(`🔘 アクションボタン設定: ${actionButtons.length}個`);
        }
    },
    
    // アクション処理
    handleAction: function(action, element) {
        if (window.NAGANO3.config?.debug) {
            console.log(`🔘 アクション実行: ${action}`);
        }
        
        switch (action) {
            case 'toggle-notifications':
                this.toggleNotifications();
                break;
            case 'toggle-theme':
                this.toggleTheme();
                break;
            case 'show-user-ranking':
                window.location.href = '/ranking';
                break;
            case 'open-manual':
                window.open('/help', '_blank');
                break;
            case 'toggle-user-menu':
                this.toggleUserMenu();
                break;
            case 'toggle-mobile-menu':
                this.toggleMobileMenu();
                break;
            case 'toggle-sidebar':
                if (typeof window.toggleSidebar === 'function') {
                    window.toggleSidebar();
                }
                break;
            default:
                console.log(`❓ 未定義アクション: ${action}`);
        }
    },
    
    // 通知トグル
    toggleNotifications: function() {
        this.closeUserMenu(); // 他のメニューを閉じる
        
        this.state.notificationsPanelOpen = !this.state.notificationsPanelOpen;
        
        let panel = document.getElementById('notifications-panel');
        
        if (!panel) {
            panel = this.createNotificationPanel();
        }
        
        if (this.state.notificationsPanelOpen) {
            panel.style.display = 'block';
            setTimeout(() => {
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
            }, 10);
        } else {
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(-8px)';
            setTimeout(() => {
                panel.style.display = 'none';
            }, 200);
        }
    },
    
    // 通知パネル作成
    createNotificationPanel: function() {
        const panel = document.createElement('div');
        panel.id = 'notifications-panel';
        panel.style.cssText = `
            position: fixed;
            top: calc(var(--header-height, 80px) + 4px);
            right: 20px;
            width: 320px;
            max-height: 400px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg, 8px);
            box-shadow: var(--shadow-xl);
            z-index: 3200;
            padding: var(--space-md, 16px);
            overflow-y: auto;
            opacity: 0;
            transform: translateY(-8px);
            transition: all 0.2s ease;
            display: none;
        `;
        
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600;">通知</h3>
                <button onclick="this.closest('#notifications-panel').remove()" style="
                    background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-secondary);
                ">×</button>
            </div>
            <p style="margin: 0; color: var(--text-secondary); text-align: center; padding: 20px 0;">
                新しい通知はありません
            </p>
        `;
        
        document.body.appendChild(panel);
        return panel;
    },
    
    // ユーザーメニュートグル
    toggleUserMenu: function() {
        this.closeNotifications(); // 他のメニューを閉じる
        
        this.state.userMenuOpen = !this.state.userMenuOpen;
        
        let menu = document.getElementById('user-menu-dropdown');
        
        if (!menu) {
            menu = this.createUserMenu();
        }
        
        if (this.state.userMenuOpen) {
            menu.style.display = 'block';
            setTimeout(() => {
                menu.style.opacity = '1';
                menu.style.transform = 'translateY(0)';
            }, 10);
        } else {
            menu.style.opacity = '0';
            menu.style.transform = 'translateY(-8px)';
            setTimeout(() => {
                menu.style.display = 'none';
            }, 200);
        }
    },
    
    // ユーザーメニュー作成
    createUserMenu: function() {
        const menu = document.createElement('div');
        menu.id = 'user-menu-dropdown';
        menu.style.cssText = `
            position: fixed;
            top: calc(var(--header-height, 80px) + 4px);
            right: 20px;
            width: 220px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg, 8px);
            box-shadow: var(--shadow-xl);
            z-index: 3300;
            padding: 8px 0;
            opacity: 0;
            transform: translateY(-8px);
            transition: all 0.2s ease;
            display: none;
        `;
        
        menu.innerHTML = `
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-light); font-weight: 600;">
                NAGANO-3 User
            </div>
            <a href="/profile" style="display: block; padding: 8px 16px; text-decoration: none; color: var(--text-secondary); border-left: 3px solid transparent;">プロフィール</a>
            <a href="/settings" style="display: block; padding: 8px 16px; text-decoration: none; color: var(--text-secondary); border-left: 3px solid transparent;">設定</a>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid var(--border-light);">
            <a href="/logout" style="display: block; padding: 8px 16px; text-decoration: none; color: var(--color-danger); border-left: 3px solid transparent;">ログアウト</a>
        `;
        
        // ホバーエフェクト
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('mouseenter', function() {
                this.style.background = 'var(--bg-hover)';
                this.style.borderLeftColor = 'var(--color-primary)';
            });
            link.addEventListener('mouseleave', function() {
                this.style.background = '';
                this.style.borderLeftColor = 'transparent';
            });
        });
        
        document.body.appendChild(menu);
        return menu;
    },
    
    // テーマ切り替え
    toggleTheme: function() {
        if (typeof window.toggleTheme === 'function') {
            window.toggleTheme();
        } else {
            document.body.classList.toggle('dark-theme');
        }
    },
    
    // モバイルメニュートグル
    toggleMobileMenu: function() {
        const header = document.getElementById('mainHeader');
        if (header) {
            header.classList.toggle('mobile-menu-active');
        }
    },
    
    // メニュー閉じる
    closeNotifications: function() {
        if (this.state.notificationsPanelOpen) {
            this.state.notificationsPanelOpen = false;
            const panel = document.getElementById('notifications-panel');
            if (panel) {
                panel.style.display = 'none';
            }
        }
    },
    
    closeUserMenu: function() {
        if (this.state.userMenuOpen) {
            this.state.userMenuOpen = false;
            const menu = document.getElementById('user-menu-dropdown');
            if (menu) {
                menu.style.display = 'none';
            }
        }
    },
    
    // 外部クリック処理
    setupOutsideClick: function() {
        document.addEventListener('click', (e) => {
            // 通知パネル外クリック
            if (!e.target.closest('#notifications-panel') && 
                !e.target.closest('[data-action="toggle-notifications"]')) {
                this.closeNotifications();
            }
            
            // ユーザーメニュー外クリック
            if (!e.target.closest('#user-menu-dropdown') && 
                !e.target.closest('[data-action="toggle-user-menu"]')) {
                this.closeUserMenu();
            }
        });
    },
    
    // 世界時計開始
    startWorldClock: function() {
        const updateClock = () => {
            const now = new Date();
            
            // 日本時間
            const tokyo = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
            const tokyoTime = tokyo.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
            
            const clockElement = document.getElementById('clock-tokyo');
            if (clockElement) {
                clockElement.textContent = tokyoTime;
            }
        };
        
        updateClock();
        this.timers.clock = setInterval(updateClock, 1000);
    },
    
    // 為替レート開始
    startExchangeRates: function() {
        const updateRates = () => {
            // 模擬データ（実際はAPI連携）
            const rates = {
                'USD/JPY': (154 + Math.random() * 2).toFixed(2),
                'EUR/JPY': (167 + Math.random() * 3).toFixed(2)
            };
            
            const usdElement = document.getElementById('rate-usdjpy');
            const eurElement = document.getElementById('rate-eurjpy');
            
            if (usdElement) usdElement.textContent = rates['USD/JPY'];
            if (eurElement) eurElement.textContent = rates['EUR/JPY'];
        };
        
        updateRates();
        this.timers.exchange = setInterval(updateRates, 300000); // 5分間隔
    },
    
    // クリーンアップ
    destroy: function() {
        Object.values(this.timers).forEach(timer => {
            if (timer) clearInterval(timer);
        });
        this.timers = {};
        this.initialized = false;
    }
};

// ===== 自動初期化 =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.NAGANO3.core.header.init();
    });
} else {
    setTimeout(() => {
        window.NAGANO3.core.header.init();
    }, 50);
}

console.log("✅ core/header.js ロード完了");