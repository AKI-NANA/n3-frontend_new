
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
 * KICHO記帳ツール専用 シンプルUI制御クラス
 * 
 * 目的: hooksシステムでの最低限のUI制御のみ
 * - 削除アニメーション
 * - ローディング表示
 * - 成功・エラーメッセージ
 * - データ更新
 */

class KichoUIController {
    constructor(config) {
        this.config = config || {};
        this.init();
    }
    
    init() {
        console.log('🎨 KICHO UI Controller 初期化');
        
        // 最低限のCSS注入
        this.injectMinimalCSS();
        
        // トースト表示用コンテナ作成
        this.createToastContainer();
    }
    
    injectMinimalCSS() {
        if (document.getElementById('kicho-minimal-css')) return;
        
        const style = document.createElement('style');
        style.id = 'kicho-minimal-css';
        style.textContent = `
            /* KICHO hooks用 最小限CSS */
            .kicho-loading {
                opacity: 0.6;
                pointer-events: none;
                position: relative;
            }
            
            .kicho-loading::after {
                content: "⟳";
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 16px;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
            }
            
            .kicho-delete-fade {
                transition: opacity 0.3s ease;
                opacity: 0.3;
                background-color: #ffebee !important;
            }
            
            .kicho-toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
            }
            
            .kicho-toast {
                background: white;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                margin-bottom: 8px;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 250px;
                border-left: 4px solid;
                animation: slideIn 0.3s ease-out;
            }
            
            .kicho-toast.success { border-left-color: #4CAF50; }
            .kicho-toast.error { border-left-color: #f44336; }
            .kicho-toast.warning { border-left-color: #ff9800; }
            .kicho-toast.info { border-left-color: #2196F3; }
            
            @keyframes slideIn {
                0% { transform: translateX(100%); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    createToastContainer() {
        if (document.getElementById('kicho-toast-container')) return;
        
        const container = document.createElement('div');
        container.id = 'kicho-toast-container';
        container.className = 'kicho-toast-container';
        document.body.appendChild(container);
    }
    
    // ローディング表示
    showLoading(element) {
        if (!element) return;
        
        element.classList.add('kicho-loading');
        element.disabled = true;
        
        console.log('🔄 ローディング開始');
    }
    
    // ローディング非表示
    hideLoading(element) {
        if (!element) return;
        
        element.classList.remove('kicho-loading');
        element.disabled = false;
        
        console.log('✅ ローディング終了');
    }
    
    // 削除アニメーション（対象要素を徐々に非表示）
    startDeleteAnimation(element) {
        if (!element) return;
        
        element.classList.add('kicho-delete-fade');
        
        // 0.5秒後に要素を削除
        setTimeout(() => {
            const row = element.closest('tr, .data-row, .item, [data-item-id]');
            if (row) {
                row.remove();
                console.log('🗑️ 要素削除完了');
            }
        }, 500);
    }
    
    // 成功・エラーメッセージ表示
    showMessage(type, message) {
        const toast = document.createElement('div');
        toast.className = `kicho-toast ${type}`;
        
        const icon = this.getIcon(type);
        toast.innerHTML = `
            <span>${icon}</span>
            <span>${message}</span>
        `;
        
        const container = document.getElementById('kicho-toast-container');
        container.appendChild(toast);
        
        // 3秒後に自動削除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
        
        console.log(`💬 メッセージ表示: ${type} - ${message}`);
    }
    
    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }
    
    // データ更新（統計数値など）
    updateData(updates) {
        if (!updates || typeof updates !== 'object') return;
        
        Object.entries(updates).forEach(([key, value]) => {
            // ID、クラス、data-stat属性で要素を検索
            const selectors = [`#${key}`, `.${key}`, `[data-stat="${key}"]`];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                        element.value = value;
                    } else {
                        element.textContent = value;
                    }
                });
            }
        });
        
        console.log('📊 データ更新完了:', updates);
    }
    
    // リスト更新（HTML置換）
    updateList(selector, html) {
        const element = document.querySelector(selector);
        if (element && html) {
            element.innerHTML = html;
            console.log(`📝 リスト更新: ${selector}`);
        }
    }
    
    // フォームクリア
    clearForm(selector) {
        const form = document.querySelector(selector);
        if (form) {
            if (form.tagName === 'FORM') {
                form.reset();
            } else {
                // 個別入力フィールドクリア
                const inputs = form.querySelectorAll('input, textarea, select');
                inputs.forEach(input => {
                    if (input.type === 'checkbox' || input.type === 'radio') {
                        input.checked = false;
                    } else {
                        input.value = '';
                    }
                });
            }
            console.log(`🗑️ フォームクリア: ${selector}`);
        }
    }
    
    // 単一フィールドクリア
    clearInput(selector) {
        const input = document.querySelector(selector);
        if (input) {
            input.value = '';
            console.log(`🗑️ 入力クリア: ${selector}`);
        }
    }
    
    // 選択状態の切り替え
    toggleSelection(element, isSelected) {
        if (!element) return;
        
        if (isSelected) {
            element.classList.add('kicho-selected');
        } else {
            element.classList.remove('kicho-selected');
        }
    }
    
    // ページリロード（Ajax更新）
    refreshPage() {
        // 実際にはページリロードではなく、統計データなどの再読み込み
        console.log('🔄 ページ内容更新中...');
        
        // get_statisticsアクションを実行
        if (window.KICHO_HOOKS_ENGINE) {
            window.KICHO_HOOKS_ENGINE.executeAction('get_statistics', null, {});
        }
    }
}

// グローバル参照用
window.KichoUIController = KichoUIController;