
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
 * 🔧 KICHO UI削除機能修正パッチ【即効適用版】
 * 
 * 問題: delete-ui-element がバックエンドに送信されるが、フロントエンドで削除されない
 * 解決: フロントエンド処理を優先し、UI削除系アクションはAjax送信をスキップ
 * 
 * 使用方法: kicho_content.phpに以下を追加
 * <script src="path/to/kicho_ui_deletion_patch.js"></script>
 */

(function() {
    'use strict';
    
    console.log('🔧 KICHO UI削除機能修正パッチ適用開始');
    
    // フロントエンドのみで処理するアクション定義
    const FRONTEND_ONLY_ACTIONS = [
        'delete-ui-element',
        'delete-all-items', 
        'restore-all-items',
        'calculate-totals'
    ];
    
    // 削除済み要素のバックアップ
    window.deletedItemsBackup = window.deletedItemsBackup || [];
    
    // UI削除処理関数群
    const UIDeleteHandlers = {
        
        // 個別要素削除
        'delete-ui-element': function(target) {
            const targetId = target.getAttribute('data-target');
            
            if (!targetId) {
                console.error('❌ data-target属性が必要です');
                showKichoNotification('error', 'data-target属性が必要です');
                return false;
            }
            
            const element = document.getElementById(targetId);
            if (!element) {
                console.error(`❌ 要素が見つかりません: ${targetId}`);
                showKichoNotification('error', `要素が見つかりません: ${targetId}`);
                return false;
            }
            
            console.log(`🗑️ UI要素削除実行: ${targetId}`);
            
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
            element.style.height = element.offsetHeight + 'px';
            
            setTimeout(() => {
                element.style.height = '0';
                element.style.margin = '0';
                element.style.padding = '0';
            }, 150);
            
            setTimeout(() => {
                element.remove();
                console.log(`✅ UI要素削除完了: ${targetId}`);
                showKichoNotification('success', `要素 ${targetId} を削除しました`);
            }, 300);
            
            return true;
        },
        
        // 全項目削除
        'delete-all-items': function(target) {
            const items = document.querySelectorAll('.deletable-item');
            
            if (items.length === 0) {
                console.log('ℹ️ 削除対象のアイテムがありません');
                showKichoNotification('info', '削除対象のアイテムがありません');
                return false;
            }
            
            console.log(`🗑️ 全項目削除実行: ${items.length}個`);
            
            items.forEach((item, index) => {
                setTimeout(() => {
                    if (item.id) {
                        // 擬似的なターゲット作成
                        const fakeTarget = {
                            getAttribute: (attr) => attr === 'data-target' ? item.id : null
                        };
                        UIDeleteHandlers['delete-ui-element'](fakeTarget);
                    }
                }, index * 200);
            });
            
            showKichoNotification('success', `${items.length}個のアイテムを削除しました`);
            return true;
        },
        
        // 全項目復元
        'restore-all-items': function(target) {
            if (window.deletedItemsBackup.length === 0) {
                console.log('ℹ️ 復元対象のアイテムがありません');
                showKichoNotification('info', '復元対象のアイテムがありません');
                return false;
            }
            
            console.log(`🔄 全項目復元実行: ${window.deletedItemsBackup.length}個`);
            
            window.deletedItemsBackup.forEach((backup, index) => {
                setTimeout(() => {
                    if (backup.parentNode && !document.getElementById(backup.id)) {
                        // 正確な位置に復元
                        if (backup.nextSibling && backup.nextSibling.parentNode) {
                            backup.nextSibling.parentNode.insertBefore(
                                createElementFromHTML(backup.html), 
                                backup.nextSibling
                            );
                        } else if (backup.parentNode) {
                            backup.parentNode.appendChild(createElementFromHTML(backup.html));
                        }
                        
                        console.log(`✅ UI要素復元完了: ${backup.id}`);
                    }
                }, index * 100);
            });
            
            // バックアップクリア
            const restoredCount = window.deletedItemsBackup.length;
            window.deletedItemsBackup = [];
            
            showKichoNotification('success', `${restoredCount}個の要素を復元しました`);
            return true;
        },
        
        // 合計計算（フロントエンドのみ）
        'calculate-totals': function(target) {
            console.log('🧮 合計計算実行');
            
            // 数値入力フィールドを検索
            const numberFields = document.querySelectorAll(
                'input[type="number"], [data-field="debit"], [data-field="credit"], .amount-field'
            );
            
            let total = 0;
            let count = 0;
            
            numberFields.forEach(field => {
                const value = parseFloat(field.value) || 0;
                if (value !== 0) {
                    total += value;
                    count++;
                }
            });
            
            console.log(`📊 合計計算結果: ${total} (${count}個のフィールド)`);
            
            // 結果表示
            updateOrCreateTotalDisplay(total, count);
            
            showKichoNotification('success', 
                `合計計算完了: ${total.toLocaleString()}円 (${count}項目)`);
            
            return true;
        }
    };
    
    // HTML文字列から要素を作成するヘルパー関数
    function createElementFromHTML(htmlString) {
        const div = document.createElement('div');
        div.innerHTML = htmlString.trim();
        return div.firstChild;
    }
    
    // 合計表示の更新/作成
    function updateOrCreateTotalDisplay(total, count) {
        let totalDisplay = document.getElementById('calculated-total');
        
        if (!totalDisplay) {
            totalDisplay = document.createElement('div');
            totalDisplay.id = 'calculated-total';
            totalDisplay.style.cssText = `
                padding: 15px; 
                margin: 15px 0; 
                background: linear-gradient(45deg, #e8f5e8, #f0fff0); 
                border: 2px solid #a5d6a7; 
                border-radius: 8px; 
                font-weight: bold; 
                text-align: center; 
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                animation: slideInDown 0.3s ease-out;
            `;
            
            // コンテナを検索して追加
            const containers = [
                '.kicho-dynamic-container',
                '.ui-deletion-ai-test-panel', 
                '.kicho-dynamic-test-panel',
                '.test-section',
                'main',
                'body'
            ];
            
            let container = null;
            for (const selector of containers) {
                container = document.querySelector(selector);
                if (container) break;
            }
            
            if (container) {
                container.appendChild(totalDisplay);
            }
        }
        
        totalDisplay.innerHTML = `
            🧮 <strong>計算結果</strong><br>
            💰 合計: <span style="color: #2e7d32; font-size: 1.2em;">${total.toLocaleString()}円</span><br>
            📝 対象: ${count}個のフィールド<br>
            🕒 更新時刻: ${new Date().toLocaleTimeString()}
        `;
        
        // アニメーション効果
        totalDisplay.style.transform = 'scale(1.05)';
        setTimeout(() => {
            totalDisplay.style.transform = 'scale(1)';
        }, 200);
    }
    
    // KICHO通知システム（既存システムに合わせる）
    function showKichoNotification(type, message) {
        // 既存のNAGANO3_KICHO.showNotificationがあれば使用
        if (window.NAGANO3_KICHO && window.NAGANO3_KICHO.showNotification) {
            window.NAGANO3_KICHO.showNotification(type, message);
            return;
        }
        
        // フォールバック通知システム
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease-out;
        `;
        
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // 優先イベントハンドラー（最高優先度で処理）
    function installPriorityEventHandler() {
        document.addEventListener('click', function(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.getAttribute('data-action');
            
            // フロントエンドのみのアクションの場合
            if (FRONTEND_ONLY_ACTIONS.includes(action)) {
                e.preventDefault();
                e.stopImmediatePropagation(); // 他のハンドラーの実行を停止
                
                console.log(`🎯 フロントエンド専用処理: ${action}`);
                
                // 対応するハンドラー実行
                const handler = UIDeleteHandlers[action];
                if (handler) {
                    const success = handler(target);
                    if (!success) {
                        console.error(`❌ フロントエンド処理失敗: ${action}`);
                    }
                } else {
                    console.error(`❌ ハンドラーが見つかりません: ${action}`);
                }
                
                return false; // イベント伝播を完全に停止
            }
        }, true); // キャプチャフェーズで処理（最優先）
    }
    
    // CSS追加（アニメーション用）
    function injectAnimationCSS() {
        if (document.getElementById('ui-deletion-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'ui-deletion-animations';
        style.textContent = `
            @keyframes slideInDown {
                0% { transform: translateY(-20px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes slideInRight {
                0% { transform: translateX(100%); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
            
            .deletable-item {
                transition: all 0.3s ease;
                overflow: hidden;
            }
            
            .deletable-item.deleting {
                opacity: 0;
                transform: translateX(-100%);
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // 初期化実行
    function initialize() {
        console.log('🔧 UI削除機能修正パッチ初期化開始');
        
        // CSS注入
        injectAnimationCSS();
        
        // 優先イベントハンドラー設置
        installPriorityEventHandler();
        
        console.log('✅ UI削除機能修正パッチ適用完了');
        console.log('📋 フロントエンド専用アクション:', FRONTEND_ONLY_ACTIONS);
        
        // テスト用デバッグ情報
        console.log('🔍 現在のページ内削除対象要素:', 
            document.querySelectorAll('.deletable-item').length + '個');
    }
    
    // DOM読み込み完了後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // グローバル参照用
    window.KICHO_UI_DELETION_PATCH = {
        version: '1.0.0',
        handlers: UIDeleteHandlers,
        frontendOnlyActions: FRONTEND_ONLY_ACTIONS
    };
    
})();

console.log('📦 KICHO UI削除機能修正パッチ読み込み完了');
