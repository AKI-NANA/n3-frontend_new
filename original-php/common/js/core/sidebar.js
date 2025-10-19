
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
 * 📁 common/js/core/sidebar.js - サイドバー制御システム（仮実装版）
 * 
 * 🎯 目的: サイドバーの表示・非表示制御
 * ✅ 404エラー解消用の仮実装
 * ✅ 基本機能のみ提供
 */

console.log("🔗 sidebar.js ロード開始（仮実装版）");

// ===== NAGANO3名前空間確認・初期化 =====
if (typeof window.NAGANO3 === 'undefined') {
    window.NAGANO3 = {};
}

// ===== サイドバー制御システム =====
window.NAGANO3.sidebar = {
    initialized: false,
    isCollapsed: false,
    
    // サイドバー初期化
    init: function() {
        if (this.initialized) {
            console.log("⚠️ サイドバーは既に初期化済み");
            return;
        }
        
        console.log("🚀 サイドバー初期化開始");
        
        // トグルボタンの設定
        this.initToggleButton();
        
        // サイドバーの初期状態設定
        this.setInitialState();
        
        this.initialized = true;
        console.log("✅ サイドバー初期化完了");
    },
    
    // トグルボタンの設定
    initToggleButton: function() {
        const toggleButton = document.querySelector('.sidebar-toggle, [data-action="toggle-sidebar"]');
        if (toggleButton) {
            toggleButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
            console.log("🔘 サイドバートグルボタン設定完了");
        }
    },
    
    // サイドバーの表示/非表示切り替え
    toggle: function() {
        console.log("🔄 サイドバートグル実行");
        
        const sidebar = document.querySelector('.sidebar, .unified-sidebar');
        const body = document.body;
        
        if (!sidebar) {
            console.warn("⚠️ サイドバー要素が見つかりません");
            return;
        }
        
        this.isCollapsed = !this.isCollapsed;
        
        if (this.isCollapsed) {
            sidebar.classList.add('sidebar--collapsed');
            body.classList.add('sidebar-collapsed');
            console.log("📱 サイドバー折りたたみ");
        } else {
            sidebar.classList.remove('sidebar--collapsed');
            body.classList.remove('sidebar-collapsed');
            console.log("📱 サイドバー展開");
        }
        
        // CSS変数の更新
        this.updateCSSVariables();
        
        // カスタムイベント発火
        const event = new CustomEvent('nagano3:sidebarToggled', {
            detail: { collapsed: this.isCollapsed }
        });
        document.dispatchEvent(event);
    },
    
    // CSS変数の更新
    updateCSSVariables: function() {
        const root = document.documentElement;
        
        if (this.isCollapsed) {
            root.style.setProperty('--content-margin-left', '60px');
            root.style.setProperty('--content-width', 'calc(100vw - 60px)');
        } else {
            root.style.setProperty('--content-margin-left', '220px');
            root.style.setProperty('--content-width', 'calc(100vw - 220px)');
        }
    },
    
    // 初期状態の設定
    setInitialState: function() {
        const sidebar = document.querySelector('.sidebar, .unified-sidebar');
        if (sidebar && sidebar.classList.contains('sidebar--collapsed')) {
            this.isCollapsed = true;
            document.body.classList.add('sidebar-collapsed');
        }
        
        this.updateCSSVariables();
    },
    
    // サイドバーを展開
    expand: function() {
        if (this.isCollapsed) {
            this.toggle();
        }
    },
    
    // サイドバーを折りたたみ
    collapse: function() {
        if (!this.isCollapsed) {
            this.toggle();
        }
    }
};

// ===== グローバル関数として公開 =====
window.toggleSidebar = function() {
    return window.NAGANO3.sidebar.toggle();
};

// ===== DOM準備完了時の自動初期化 =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.NAGANO3.sidebar.init();
    });
} else {
    setTimeout(() => {
        window.NAGANO3.sidebar.init();
    }, 100);
}

// ===== 分割ファイル読み込み完了通知 =====
if (window.NAGANO3 && window.NAGANO3.splitFiles) {
    window.NAGANO3.splitFiles.markLoaded('sidebar.js');
}

console.log("✅ sidebar.js ロード完了（仮実装版）");