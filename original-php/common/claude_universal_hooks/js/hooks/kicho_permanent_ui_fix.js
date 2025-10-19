
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
 * 🔧 KICHO UI削除機能 永続化修正パッチ
 * 
 * 成功確認済み - コンソールテストで完全動作確認
 * 実際のmodules/kicho/kicho_content.phpで使用
 */

(function() {
    'use strict';
    
    console.log("🔧 KICHO UI削除機能修正パッチ読み込み開始");
    
    // DOM読み込み完了後に実行
    function initializeUIFix() {
        // NAGANO3_KICHOシステムの初期化を待つ
        if (typeof window.NAGANO3_KICHO === 'undefined' || !window.NAGANO3_KICHO.ajaxManager) {
            setTimeout(initializeUIFix, 100);
            return;
        }
        
        console.log("🎯 KICHO UIシステム検出 - 修正パッチ適用開始");
        
        // 1. 既存のajaxManager処理を保存
        const originalExecuteAction = window.NAGANO3_KICHO.ajaxManager.executeAction;
        
        // 2. フロントエンド専用アクション定義
        window.FRONTEND_ONLY_ACTIONS = [
            'delete-ui-element',
            'delete-all-items', 
            'restore-all-items'
        ];
        
        // 3. バックアップ配列初期化
        window.deletedItemsBackup = window.deletedItemsBackup || [];
        
        // 4. 即座削除関数
        window.immediateDelete = function(targetId) {
            console.log(`🗑️ UI要素削除実行: ${targetId}`);
            
            const element = document.getElementById(targetId);
            if (!element) {
                console.error(`❌ 要素が見つかりません: ${targetId}`);
                return false;
            }
            
            // バックアップ作成
            window.deletedItemsBackup.push({
                id: targetId,
                html: element.outerHTML,
                parentNode: element.parentNode,
                nextSibling: element.nextSibling
            });
            
            // アニメーション付き削除
            element.style.transition = 'all 0.3s ease';
            element.style.opacity = '0';
            element.style.transform = 'translateX(-100%)';
            
            setTimeout(() => {
                element.remove();
                console.log(`✅ UI要素削除完了: ${targetId}`);
                
                // 成功通知
                if (window.NAGANO3_KICHO?.uiController?.showNotification) {
                    window.NAGANO3_KICHO.uiController.showNotification('success', `要素 ${targetId} を削除しました`);
                }
            }, 300);
            
            return true;
        };
        
        // 5. 即座復元関数
        window.immediateRestore = function() {
            console.log(`🔄 UI要素復元実行: ${window.deletedItemsBackup.length}個`);
            
            window.deletedItemsBackup.forEach(backup => {
                if (!document.getElementById(backup.id)) {
                    const div = document.createElement('div');
                    div.innerHTML = backup.html;
                    const element = div.firstChild;
                    
                    if (backup.nextSibling && backup.nextSibling.parentNode) {
                        backup.nextSibling.parentNode.insertBefore(element, backup.nextSibling);
                    } else if (backup.parentNode) {
                        backup.parentNode.appendChild(element);
                    }
                    
                    console.log(`✅ UI要素復元完了: ${backup.id}`);
                }
            });
            
            const restoredCount = window.deletedItemsBackup.length;
            window.deletedItemsBackup = [];
            
            if (window.NAGANO3_KICHO?.uiController?.showNotification) {
                window.NAGANO3_KICHO.uiController.showNotification('success', `${restoredCount}個の要素を復元しました`);
            }
        };
        
        // 6. 全削除関数
        window.immediateDeleteAll = function() {
            const items = document.querySelectorAll('.deletable-item');
            console.log(`🗑️ 全UI要素削除実行: ${items.length}個`);
            
            items.forEach((item, index) => {
                setTimeout(() => {
                    if (item.id) {
                        window.immediateDelete(item.id);
                    }
                }, index * 200);
            });
        };
        
        // 7. ajaxManagerの処理を上書き
        window.NAGANO3_KICHO.ajaxManager.executeAction = function(action, data = {}) {
            console.log(`🎯 アクション処理: ${action}`);
            
            // フロントエンド専用処理の場合
            if (window.FRONTEND_ONLY_ACTIONS.includes(action)) {
                console.log(`🖥️ フロントエンド専用処理実行: ${action}`);
                
                if (action === 'delete-ui-element') {
                    const targetId = data.target || 
                                   document.querySelector('[data-action="delete-ui-element"]')?.getAttribute('data-target');
                    if (targetId) {
                        return Promise.resolve(window.immediateDelete(targetId));
                    }
                } else if (action === 'delete-all-items') {
                    return Promise.resolve(window.immediateDeleteAll());
                } else if (action === 'restore-all-items') {
                    return Promise.resolve(window.immediateRestore());
                }
                
                return Promise.resolve(true);
            } else {
                // 通常のAjax処理（既存機能）
                console.log(`🌐 Ajax処理実行: ${action}`);
                return originalExecuteAction.call(this, action, data);
            }
        };
        
        console.log("✅ KICHO UI削除機能修正パッチ適用完了");
        console.log("📋 対応アクション:", window.FRONTEND_ONLY_ACTIONS);
        
        // テスト用関数をグローバルに設定
        window.testUIDelete = function(targetId = 'deletable-item-1') {
            return window.immediateDelete(targetId);
        };
        
        window.testUIRestore = function() {
            return window.immediateRestore();
        };
        
        // 適用完了イベント発行
        window.dispatchEvent(new CustomEvent('kichoUIFixApplied', {
            detail: { version: '1.0.0', timestamp: new Date().toISOString() }
        }));
    }
    
    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUIFix);
    } else {
        initializeUIFix();
    }
    
})();

console.log("📦 KICHO UI削除機能修正パッチ読み込み完了");
