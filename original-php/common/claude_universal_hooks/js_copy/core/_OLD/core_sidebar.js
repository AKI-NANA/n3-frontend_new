
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
 * 📁 common/js/core/sidebar.js - サイドバー制御
 * 
 * 🎯 目的: サイドバーの表示・制御管理
 * ✅ Bootstrap分離対応
 * ✅ CSS変数連携
 * ✅ レスポンシブ対応
 */

console.log("📱 core/sidebar.js ロード");

// ===== NAGANO3.core.sidebar 名前空間 =====
window.NAGANO3 = window.NAGANO3 || { core: {} };
window.NAGANO3.core = window.NAGANO3.core || {};

window.NAGANO3.core.sidebar = {
    initialized: false,
    collapsed: false,
    
    init: function() {
        if (this.initialized) return;
        
        // 初期状態取得
        const sidebar = document.querySelector('.sidebar, .unified-sidebar');
        if (sidebar) {
            this.collapsed = sidebar.classList.contains('sidebar--collapsed') ||
                           document.body.classList.contains('sidebar-collapsed');
        }
        
        // トグルボタン設定
        this.setupToggleButtons();
        
        // CSS変数初期設定
        this.updateCSSVariables();
        
        // レスポンシブ対応
        this.setupResponsive();
        
        this.initialized = true;
        
        if (window.NAGANO3.config?.debug) {
            console.log("✅ サイドバー初期化完了");
        }
    },
    
    // トグルボタン設定
    setupToggleButtons: function() {
        // data-action="toggle-sidebar" ボタン
        const toggleButtons = document.querySelectorAll('[data-action="toggle-sidebar"], .sidebar-toggle');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        });
        
        if (toggleButtons.length > 0 && window.NAGANO3.config?.debug) {
            console.log(`🔘 サイドバートグルボタン設定: ${toggleButtons.length}個`);
        }
    },
    
    // レスポンシブ対応
    setupResponsive: function() {
        // モバイル時の自動折りたたみ
        const checkMobile = () => {
            if (window.innerWidth <= 768) {
                if (!this.collapsed) {
                    this.collapse();
                }
            }
        };
        
        window.addEventListener('resize', checkMobile);
        checkMobile(); // 初回実行
    },
    
    // サイドバートグル
    toggle: function() {
        if (this.collapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    },
    
    // サイドバー展開
    expand: function() {
        const sidebar = document.querySelector('.sidebar, .unified-sidebar');
        const body = document.body;
        
        if (sidebar) {
            sidebar.classList.remove('sidebar--collapsed');
        }
        
        if (body) {
            body.classList.remove('sidebar-collapsed');
        }
        
        this.collapsed = false;
        this.updateCSSVariables();
        this.dispatchEvent('expanded');
        
        if (window.NAGANO3.config?.debug) {
            console.log("📱 サイドバー展開");
        }
    },
    
    // サイドバー折りたたみ
    collapse: function() {
        const sidebar = document.querySelector('.sidebar, .unified-sidebar');
        const body = document.body;
        
        if (sidebar) {
            sidebar.classList.add('sidebar--collapsed');
        }
        
        if (body) {
            body.classList.add('sidebar-collapsed');
        }
        
        this.collapsed = true;
        this.updateCSSVariables();
        this.dispatchEvent('collapsed');
        
        if (window.NAGANO3.config?.debug) {
            console.log("📱 サイドバー折りたたみ");
        }
    },
    
    // CSS変数更新
    updateCSSVariables: function() {
        const root = document.documentElement;
        
        if (this.collapsed) {
            root.style.setProperty('--content-margin-left', '60px');
            root.style.setProperty('--content-width', 'calc(100vw - 60px)');
            root.style.setProperty('--sidebar-width', '60px');
        } else {
            root.style.setProperty('--content-margin-left', '220px');
            root.style.setProperty('--content-width', 'calc(100vw - 220px)');
            root.style.setProperty('--sidebar-width', '220px');
        }
    },
    
    // イベント発火
    dispatchEvent: function(type) {
        const event = new CustomEvent(`nagano3:sidebar:${type}`, {
            detail: { 
                collapsed: this.collapsed,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    },
    
    // 状態取得
    getState: function() {
        return {
            collapsed: this.collapsed,
            initialized: this.initialized
        };
    }
};

// ===== グローバル関数として公開 =====
window.toggleSidebar = function() {
    if (!window.NAGANO3.core.sidebar.initialized) {
        window.NAGANO3.core.sidebar.init();
    }
    window.NAGANO3.core.sidebar.toggle();
};

// ===== 自動初期化 =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.NAGANO3.core.sidebar.init();
    });
} else {
    setTimeout(() => {
        window.NAGANO3.core.sidebar.init();
    }, 50);
}

console.log("✅ core/sidebar.js ロード完了");