
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
 * 🎯 Kicho記帳ツール 削除機能特化修正システム
 * common/js/pages/kicho_delete_fix.js
 * 
 * 目的: 削除ボタンが確実に動作するようにする
 */

// =====================================
// 🗑️ 削除機能専用ハンドラー
// =====================================

class KichoDeleteManager {
    constructor() {
        this.ajaxUrl = 'modules/kicho/kicho_ajax_handler_postgresql.php';
        this.init();
    }
    
    init() {
        // 削除ボタン専用の強制イベントハンドラー
        this.bindDeleteHandlers();
        console.log('🗑️ Kicho削除機能初期化完了');
    }
    
    bindDeleteHandlers() {
        // 既存のイベントリスナーを上書き
        document.addEventListener('click', (e) => {
            // 削除ボタンの確実な特定
            if (e.target.closest('.kicho__btn--danger[data-action="delete-data-item"]')) {
                e.preventDefault();
                e.stopPropagation();
                
                const button = e.target.closest('.kicho__btn--danger[data-action="delete-data-item"]');
                const itemId = button.getAttribute('data-item-id');
                
                console.log(`🗑️ 削除ボタンクリック検出: ${itemId}`);
                this.handleDelete(itemId, button);
            }
        }, true); // useCapture=true で優先的にキャッチ
        
        // 追加の削除ハンドラー（フォールバック）
        setInterval(() => {
            this.attachDeleteHandlers();
        }, 1000);
    }
    
    attachDeleteHandlers() {
        // 動的に追加された削除ボタンにもハンドラーを付与
        const deleteButtons = document.querySelectorAll('.kicho__btn--danger[data-action="delete-data-item"]');
        
        deleteButtons.forEach(button => {
            if (!button.hasAttribute('data-delete-handler')) {
                button.setAttribute('data-delete-handler', 'true');
                
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const itemId = button.getAttribute('data-item-id');
                    console.log(`🗑️ 直接削除ハンドラー: ${itemId}`);
                    this.handleDelete(itemId, button);
                });
            }
        });
    }
    
    async handleDelete(itemId, button) {
        if (!itemId) {
            this.showNotification('削除対象が指定されていません', 'error');
            return;
        }
        
        // 確認ダイアログ
        if (!confirm(`データ「${itemId}」を削除しますか？`)) {
            return;
        }
        
        console.log(`🗑️ 削除処理開始: ${itemId}`);
        
        // ボタン状態変更
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 削除中...';
        button.disabled = true;
        
        try {
            const formData = new FormData();
            formData.append('action', 'delete-data-item');
            formData.append('item_id', itemId);
            
            const response = await fetch(this.ajaxUrl, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ 削除成功: ${itemId}`);
                
                // DOM要素を視覚的効果付きで削除
                const dataItem = button.closest('.kicho__data-item');
                if (dataItem) {
                    dataItem.style.transition = 'all 0.3s ease';
                    dataItem.style.opacity = '0';
                    dataItem.style.transform = 'translateX(-20px)';
                    dataItem.style.backgroundColor = '#ffebee';
                    
                    setTimeout(() => {
                        dataItem.remove();
                        console.log(`🗑️ DOM要素削除完了: ${itemId}`);
                    }, 300);
                }
                
                // 統計データ更新
                if (result.statistics) {
                    this.updateStatistics(result.statistics);
                }
                
                // カウンター更新
                this.updateDataCounters();
                
                this.showNotification('🗑️ データを削除しました', 'success');
                
            } else {
                console.error(`❌ 削除失敗: ${result.message}`);
                this.showNotification(`削除失敗: ${result.message}`, 'error');
            }
            
        } catch (error) {
            console.error(`❌ 削除エラー: ${error.message}`);
            this.showNotification(`削除エラー: ${error.message}`, 'error');
        } finally {
            // ボタン状態復元
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }
    
    updateStatistics(stats) {
        // 統計カード更新
        const statElements = {
            'pending-count': stats.pending_count,
            'confirmed-rules': stats.confirmed_rules,
            'automation-rate': stats.automation_rate + '%',
            'error-count': stats.error_count,
            'monthly-count': stats.monthly_count?.toLocaleString() || '0'
        };
        
        Object.entries(statElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.style.transition = 'all 0.3s ease';
                element.style.transform = 'scale(1.1)';
                element.textContent = value;
                
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 150);
            }
        });
    }
    
    updateDataCounters() {
        // データカウンター更新
        const counters = {
            'mfDataCount': document.querySelectorAll('[data-source="mf"]').length,
            'csvDataCount': document.querySelectorAll('[data-source="csv"]').length,
            'textDataCount': document.querySelectorAll('[data-source="text"]').length
        };
        
        Object.entries(counters).forEach(([id, count]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = count;
            }
        });
        
        // 選択中カウンターもリセット
        const selectedCount = document.querySelectorAll('[data-checkbox="data-item"]:checked').length;
        const selectedElement = document.getElementById('selectedDataCount');
        if (selectedElement) {
            selectedElement.textContent = selectedCount;
        }
    }
    
    showNotification(message, type = 'info') {
        // 通知システム
        const container = document.getElementById('kicho-notifications') || this.createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `kicho-notification kicho-notification--${type}`;
        notification.style.cssText = `
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-size: 14px;
            line-height: 1.4;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; margin-left: auto; cursor: pointer;">×</button>
            </div>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 50);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);
    }
    
    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'kicho-notifications';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
        return container;
    }
    
    getNotificationColor(type) {
        const colors = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };
        return colors[type] || colors.info;
    }
    
    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }
}

// =====================================
// 🚀 初期化
// =====================================

// DOMロード完了時に初期化
document.addEventListener('DOMContentLoaded', function() {
    // 少し遅延させて他のスクリプトとの競合を回避
    setTimeout(() => {
        console.log('🗑️ Kicho削除機能専用システム開始');
        window.KichoDeleteManager = new KichoDeleteManager();
        console.log('✅ Kicho削除機能初期化完了');
    }, 500);
});

// デバッグ用グローバル関数
window.testDelete = function(itemId) {
    if (window.KichoDeleteManager) {
        const button = document.querySelector(`[data-item-id="${itemId}"]`);
        if (button) {
            window.KichoDeleteManager.handleDelete(itemId, button);
        } else {
            console.error('削除ボタンが見つかりません:', itemId);
        }
    }
};
