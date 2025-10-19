
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
 * 📁 common/js/components/theme.js - テーマシステム（仮実装版）
 * 
 * 🎯 目的: テーマの切り替え・管理
 * ✅ 404エラー解消用の仮実装
 * ✅ 基本機能のみ提供
 */

console.log("🔗 theme.js ロード開始（仮実装版）");

// ===== NAGANO3名前空間確認・初期化 =====
if (typeof window.NAGANO3 === 'undefined') {
    window.NAGANO3 = {};
}

// ===== テーマシステム =====
window.NAGANO3.theme = {
    initialized: false,
    currentTheme: 'light',
    themes: ['light', 'dark', 'gentle'],
    
    // テーマシステム初期化
    init: function() {
        if (this.initialized) {
            console.log("⚠️ テーマシステムは既に初期化済み");
            return;
        }
        
        console.log("🚀 テーマシステム初期化開始");
        
        // 保存されたテーマを読み込み
        this.loadSavedTheme();
        
        // テーマ切り替えボタンの設定
        this.initThemeButtons();
        
        this.initialized = true;
        console.log("✅ テーマシステム初期化完了");
    },
    
    // 保存されたテーマを読み込み
    loadSavedTheme: function() {
        try {
            const savedTheme = localStorage.getItem('nagano3-theme');
            if (savedTheme && this.themes.includes(savedTheme)) {
                this.currentTheme = savedTheme;
            }
        } catch (error) {
            console.warn("⚠️ ローカルストレージ読み込みエラー:", error);
        }
        
        this.applyTheme(this.currentTheme);
    },
    
    // テーマ切り替えボタンの設定
    initThemeButtons: function() {
        const themeButtons = document.querySelectorAll('[data-action="toggle-theme"], .theme-switcher');
        themeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        });
        
        if (themeButtons.length > 0) {
            console.log(`🔘 テーマボタン設定完了: ${themeButtons.length}個`);
        }
    },
    
    // テーマ適用
    applyTheme: function(theme) {
        if (!this.themes.includes(theme)) {
            console.warn(`⚠️ 未知のテーマ: ${theme}`);
            return;
        }
        
        console.log(`🎨 テーマ適用: ${theme}`);
        
        // data-theme属性を設定
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        
        // クラスベースの切り替えも対応
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${theme}`);
        
        // ローカルストレージに保存
        try {
            localStorage.setItem('nagano3-theme', theme);
        } catch (error) {
            console.warn("⚠️ ローカルストレージ保存エラー:", error);
        }
        
        this.currentTheme = theme;
        
        // カスタムイベント発火
        const event = new CustomEvent('nagano3:themeChanged', {
            detail: { theme: theme }
        });
        document.dispatchEvent(event);
        
        // テーマアイコンの更新
        this.updateThemeIcons();
        
        console.log(`✅ テーマ適用完了: ${theme}`);
    },
    
    // テーマ切り替え（次のテーマ）
    toggle: function() {
        const currentIndex = this.themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % this.themes.length;
        const nextTheme = this.themes[nextIndex];
        
        console.log(`🔄 テーマ切り替え: ${this.currentTheme} → ${nextTheme}`);
        this.applyTheme(nextTheme);
        
        // 通知表示（通知システムがあれば）
        if (window.NAGANO3.notifications && window.NAGANO3.notifications.initialized) {
            window.NAGANO3.notifications.info(`テーマを${nextTheme}に変更しました`, 2000);
        }
        
        return nextTheme;
    },
    
    // 特定のテーマに設定
    setTheme: function(theme) {
        if (this.themes.includes(theme)) {
            this.applyTheme(theme);
        } else {
            console.error(`❌ 無効なテーマ: ${theme}`);
        }
    },
    
    // テーマアイコンの更新
    updateThemeIcons: function() {
        const themeButtons = document.querySelectorAll('[data-action="toggle-theme"], .theme-switcher');
        
        // テーマに応じてアイコンを変更
        const icons = {
            light: '☀️',
            dark: '🌙',
            gentle: '🌿'
        };
        
        const icon = icons[this.currentTheme] || '🎨';
        
        themeButtons.forEach(button => {
            // アイコンを更新
            if (button.innerHTML.length <= 3) { // 絵文字の場合
                button.innerHTML = icon;
            }
            
            // タイトル更新
            button.title = `現在のテーマ: ${this.currentTheme}`;
        });
    },
    
    // 現在のテーマを取得
    getCurrentTheme: function() {
        return this.currentTheme;
    },
    
    // 利用可能なテーマ一覧を取得
    getAvailableThemes: function() {
        return [...this.themes];
    },
    
    // テーマをライトに設定
    setLight: function() {
        this.setTheme('light');
    },
    
    // テーマをダークに設定
    setDark: function() {
        this.setTheme('dark');
    },
    
    // テーマを目に優しいモードに設定
    setGentle: function() {
        this.setTheme('gentle');
    }
};

// ===== グローバル関数として公開 =====
window.toggleTheme = function() {
    if (!window.NAGANO3.theme.initialized) {
        window.NAGANO3.theme.init();
    }
    return window.NAGANO3.theme.toggle();
};

window.setTheme = function(theme) {
    if (!window.NAGANO3.theme.initialized) {
        window.NAGANO3.theme.init();
    }
    window.NAGANO3.theme.setTheme(theme);
};

// ===== DOM準備完了時の自動初期化 =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.NAGANO3.theme.init();
    });
} else {
    setTimeout(() => {
        window.NAGANO3.theme.init();
    }, 100);
}

// ===== 分割ファイル読み込み完了通知 =====
if (window.NAGANO3 && window.NAGANO3.splitFiles) {
    window.NAGANO3.splitFiles.markLoaded('theme.js');
}

console.log("✅ theme.js ロード完了（仮実装版）");