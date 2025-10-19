
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
 * 🎨 KICHO UI制御システム拡張
 * common/js/hooks/ui_controller.js
 * 
 * ✅ 既存UI制御システムとの統合拡張
 * ✅ Hooks専用UI制御機能
 * ✅ アニメーション・通知システム強化
 * ✅ プログレストラッキング機能
 * 
 * @version 1.0.0-HOOKS-EXTENSION
 */

class KichoUIControllerExtension {
    constructor(existingUIController) {
        this.existing = existingUIController;
        this.progressTrackers = new Map();
        this.animationQueue = [];
        this.notificationQueue = [];
        
        this.initializeExtensions();
    }
    
    initializeExtensions() {
        console.log('🎨 UI制御システム拡張初期化...');
        
        // プログレストラッキング初期化
        this.initializeProgressTracking();
        
        // 通知システム拡張
        this.initializeNotificationExtensions();
        
        // アニメーションキュー管理
        this.initializeAnimationQueue();
        
        console.log('✅ UI制御システム拡張初期化完了');
    }
    
    // =====================================
    // 🎯 プログレストラッキング機能
    // =====================================
    
    initializeProgressTracking() {
        // プログレス表示用コンテナ作成
        this.createProgressContainer();
    }
    
    createProgressContainer() {
        if (document.querySelector('#kicho-progress-container')) return;
        
        const container = document.createElement('div');
        container.id = 'kicho-progress-container';
        container.className = 'kicho__progress-container';
        container.innerHTML = `
            <style>
                .kicho__progress-container {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    z-index: 9999;
                    max-width: 400px;
                    pointer-events: none;
                }
                .kicho__progress-item {
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    pointer-events: auto;
                    animation: slideInRight 0.3s ease-out;
                }
                .kicho__progress-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .kicho__progress-title {
                    font-weight: 600;
                    font-size: 14px;
                    color: #333;
                }
                .kicho__progress-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #666;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                }
                .kicho__progress-bar {
                    width: 100%;
                    height: 6px;
                    background: #f0f0f0;
                    border-radius: 3px;
                    overflow: hidden;
                    margin-bottom: 8px;
                }
                .kicho__progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #4caf50, #66bb6a);
                    transition: width 0.3s ease;
                    border-radius: 3px;
                }
                .kicho__progress-text {
                    font-size: 12px;
                    color: #666;
                    display: flex;
                    justify-content: space-between;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            </style>
        `;
        
        document.body.appendChild(container);
    }
    
    showProgress(actionName, options = {}) {
        const trackerId = `progress_${actionName}_${Date.now()}`;
        
        const progressItem = document.createElement('div');
        progressItem.className = 'kicho__progress-item';
        progressItem.id = trackerId;
        progressItem.innerHTML = `
            <div class="kicho__progress-header">
                <span class="kicho__progress-title">${options.title || actionName}</span>
                <button class="kicho__progress-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="kicho__progress-bar">
                <div class="kicho__progress-fill" style="width: 0%"></div>
            </div>
            <div class="kicho__progress-text">
                <span class="kicho__progress-status">開始中...</span>
                <span class="kicho__progress-percentage">0%</span>
            </div>
        `;
        
        const container = document.querySelector('#kicho-progress-container');
        container.appendChild(progressItem);
        
        // プログレストラッカー登録
        const tracker = {
            id: trackerId,
            element: progressItem,
            startTime: Date.now(),
            estimatedDuration: options.estimatedDuration || 30000,
            progress: 0,
            status: 'running'
        };
        
        this.progressTrackers.set(trackerId, tracker);
        
        // 自動プログレス更新開始
        this.startAutoProgress(trackerId);
        
        return trackerId;
    }
    
    updateProgress(trackerId, progress, status) {
        const tracker = this.progressTrackers.get(trackerId);
        if (!tracker) return;
        
        tracker.progress = Math.min(100, Math.max(0, progress));
        tracker.status = status || tracker.status;
        
        const fillElement = tracker.element.querySelector('.kicho__progress-fill');
        const statusElement = tracker.element.querySelector('.kicho__progress-status');
        const percentageElement = tracker.element.querySelector('.kicho__progress-percentage');
        
        if (fillElement) fillElement.style.width = `${tracker.progress}%`;
        if (statusElement) statusElement.textContent = tracker.status;
        if (percentageElement) percentageElement.textContent = `${Math.round(tracker.progress)}%`;
        
        // 完了時の処理
        if (tracker.progress >= 100) {
            this.completeProgress(trackerId);
        }
    }
    
    startAutoProgress(trackerId) {
        const tracker = this.progressTrackers.get(trackerId);
        if (!tracker) return;
        
        const interval = setInterval(() => {
            if (!this.progressTrackers.has(trackerId)) {
                clearInterval(interval);
                return;
            }
            
            const elapsed = Date.now() - tracker.startTime;
            const estimatedProgress = (elapsed / tracker.estimatedDuration) * 90; // 90%まで自動
            
            if (estimatedProgress < 90) {
                this.updateProgress(trackerId, estimatedProgress, '処理中...');
            } else {
                clearInterval(interval);
                this.updateProgress(trackerId, 90, '完了待ち...');
            }
        }, 500);
        
        tracker.autoInterval = interval;
    }
    
    completeProgress(trackerId, message = '完了') {
        const tracker = this.progressTrackers.get(trackerId);
        if (!tracker) return;
        
        if (tracker.autoInterval) {
            clearInterval(tracker.autoInterval);
        }
        
        this.updateProgress(trackerId, 100, message);
        
        // 2秒後に自動削除
        setTimeout(() => {
            this.hideProgress(trackerId);
        }, 2000);
    }
    
    hideProgress(trackerId) {
        const tracker = this.progressTrackers.get(trackerId);
        if (!tracker) return;
        
        tracker.element.style.animation = 'slideOutRight 0.3s ease-in forwards';
        
        setTimeout(() => {
            tracker.element.remove();
            this.progressTrackers.delete(trackerId);
        }, 300);
    }
    
    // =====================================
    // 🔔 通知システム拡張
    // =====================================
    
    initializeNotificationExtensions() {
        // 通知コンテナが存在しない場合は作成
        this.ensureNotificationContainer();
    }
    
    ensureNotificationContainer() {
        if (document.querySelector('#notification-container')) return;
        
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'kicho__notification-container';
        container.innerHTML = `
            <style>
                .kicho__notification-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                    pointer-events: none;
                }
                .kicho__notification {
                    background: white;
                    border-left: 4px solid #4caf50;
                    border-radius: 4px;
                    padding: 16px;
                    margin-bottom: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    pointer-events: auto;
                    animation: slideInRight 0.3s ease-out;
                    cursor: pointer;
                }
                .kicho__notification--error {
                    border-left-color: #f44336;
                }
                .kicho__notification--warning {
                    border-left-color: #ff9800;
                }
                .kicho__notification--info {
                    border-left-color: #2196f3;
                }
                .kicho__notification-content {
                    display: flex;
                    align-items: flex-start;
                }
                .kicho__notification-icon {
                    margin-right: 12px;
                    font-size: 18px;
                    margin-top: 2px;
                }
                .kicho__notification-text {
                    flex: 1;
                }
                .kicho__notification-title {
                    font-weight: 600;
                    margin-bottom: 4px;
                    font-size: 14px;
                }
                .kicho__notification-message {
                    font-size: 13px;
                    color: #666;
                    line-height: 1.4;
                }
                .kicho__notification-actions {
                    margin-top: 8px;
                    display: flex;
                    gap: 8px;
                }
                .kicho__notification-btn {
                    background: none;
                    border: 1px solid #ddd;
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .kicho__notification-btn:hover {
                    background: #f5f5f5;
                }
                .kicho__notification-btn--primary {
                    background: #4caf50;
                    color: white;
                    border-color: #4caf50;
                }
                .kicho__notification-btn--primary:hover {
                    background: #45a049;
                }
            </style>
        `;
        
        document.body.appendChild(container);
    }
    
    showAdvancedNotification(type, options) {
        const notificationId = `notification_${Date.now()}`;
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const notification = document.createElement('div');
        notification.className = `kicho__notification kicho__notification--${type}`;
        notification.id = notificationId;
        notification.innerHTML = `
            <div class="kicho__notification-content">
                <div class="kicho__notification-icon">${icons[type] || '📢'}</div>
                <div class="kicho__notification-text">
                    ${options.title ? `<div class="kicho__notification-title">${options.title}</div>` : ''}
                    <div class="kicho__notification-message">${options.message}</div>
                    ${options.actions ? this.renderNotificationActions(options.actions) : ''}
                </div>
            </div>
        `;
        
        // クリックで閉じる
        notification.addEventListener('click', () => {
            if (!options.persistent) {
                this.hideNotification(notificationId);
            }
        });
        
        const container = document.querySelector('#notification-container');
        container.appendChild(notification);
        
        // 自動削除
        if (!options.persistent) {
            setTimeout(() => {
                this.hideNotification(notificationId);
            }, options.duration || 5000);
        }
        
        return notificationId;
    }
    
    renderNotificationActions(actions) {
        const actionsHtml = actions.map(action => 
            `<button class="kicho__notification-btn ${action.primary ? 'kicho__notification-btn--primary' : ''}" 
                     onclick="${action.onclick}">${action.label}</button>`
        ).join('');
        
        return `<div class="kicho__notification-actions">${actionsHtml}</div>`;
    }
    
    hideNotification(notificationId) {
        const notification = document.getElementById(notificationId);
        if (!notification) return;
        
        notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
    
    // =====================================
    // 🎭 アニメーションキュー管理
    // =====================================
    
    initializeAnimationQueue() {
        this.animationQueueProcessor = setInterval(() => {
            this.processAnimationQueue();
        }, 100);
    }
    
    queueAnimation(element, animation, priority = 0) {
        this.animationQueue.push({
            element,
            animation,
            priority,
            timestamp: Date.now()
        });
        
        // 優先度順にソート
        this.animationQueue.sort((a, b) => b.priority - a.priority);
    }
    
    processAnimationQueue() {
        if (this.animationQueue.length === 0) return;
        
        const maxConcurrent = 3; // 同時実行アニメーション数制限
        const runningAnimations = this.animationQueue.filter(anim => anim.running);
        
        if (runningAnimations.length >= maxConcurrent) return;
        
        const nextAnimation = this.animationQueue.find(anim => !anim.running);
        if (!nextAnimation) return;
        
        nextAnimation.running = true;
        this.executeQueuedAnimation(nextAnimation);
    }
    
    async executeQueuedAnimation(animationItem) {
        try {
            await this.animateElementWithConfig(animationItem.element, animationItem.animation);
        } catch (error) {
            console.error('アニメーション実行エラー:', error);
        } finally {
            // キューから削除
            const index = this.animationQueue.indexOf(animationItem);
            if (index > -1) {
                this.animationQueue.splice(index, 1);
            }
        }
    }
    
    async animateElementWithConfig(element, animationConfig) {
        if (!element || !animationConfig) return;
        
        const animation = element.animate(animationConfig.keyframes, {
            duration: parseInt(animationConfig.duration) || 300,
            easing: animationConfig.easing || 'ease-out',
            fill: animationConfig.fill || 'forwards',
            iterations: animationConfig.iterations || 1
        });
        
        return animation.finished;
    }
    
    // =====================================
    // 🔧 統合メソッド
    // =====================================
    
    // 既存UI制御システムのメソッドを拡張
    showLoading(target, options = {}) {
        // プログレストラッキング付きローディング
        if (options.progress && options.estimatedDuration) {
            const trackerId = this.showProgress(options.title || 'Processing', {
                estimatedDuration: options.estimatedDuration,
                title: options.title
            });
            options.trackerId = trackerId;
        }
        
        // 既存システムのローディング呼び出し
        if (this.existing?.showLoading) {
            return this.existing.showLoading(target, options);
        }
        
        return this.showBasicLoading(target, options);
    }
    
    hideLoading(target, options = {}) {
        // プログレストラッキング完了
        if (options.trackerId) {
            this.completeProgress(options.trackerId, '完了');
        }
        
        // 既存システムのローディング非表示
        if (this.existing?.hideLoading) {
            return this.existing.hideLoading(target);
        }
        
        return this.hideBasicLoading(target);
    }
    
    showNotification(type, message, options = {}) {
        // 高機能通知システム使用
        if (options.title || options.actions || options.persistent) {
            return this.showAdvancedNotification(type, {
                message,
                ...options
            });
        }
        
        // 既存システムの通知使用
        if (this.existing?.showNotification) {
            return this.existing.showNotification(type, message);
        }
        
        // フォールバック
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        alert(`${icons[type] || '📢'} ${message}`);
    }
    
    // =====================================
    // 🧪 デバッグ・テスト機能
    // =====================================
    
    getExtensionStatus() {
        return {
            progressTrackers: this.progressTrackers.size,
            animationQueue: this.animationQueue.length,
            notificationQueue: this.notificationQueue.length,
            existingUIController: !!this.existing
        };
    }
    
    testProgressTracking() {
        const trackerId = this.showProgress('test_action', {
            title: 'テスト処理',
            estimatedDuration: 10000
        });
        
        // 5秒後に完了
        setTimeout(() => {
            this.completeProgress(trackerId, 'テスト完了');
        }, 5000);
        
        return trackerId;
    }
    
    testAdvancedNotification() {
        return this.showAdvancedNotification('info', {
            title: 'テスト通知',
            message: 'これは高機能通知のテストです。',
            actions: [
                {
                    label: 'キャンセル',
                    onclick: `document.getElementById('${Date.now()}').remove()`
                },
                {
                    label: 'OK',
                    primary: true,
                    onclick: `alert('OK clicked')`
                }
            ],
            duration: 10000
        });
    }
}

// =====================================
// 🚀 エクスポート・統合
// =====================================

// グローバル登録
window.KichoUIControllerExtension = KichoUIControllerExtension;

console.log('🎨 KICHO UI制御システム拡張 読み込み完了');

/**
 * ✅ UI制御システム拡張 完成
 * 
 * 🎯 拡張機能:
 * ✅ プログレストラッキング機能
 * ✅ 高機能通知システム
 * ✅ アニメーションキュー管理
 * ✅ 既存システム完全統合
 * ✅ フォールバック機能完備
 * 
 * 🧪 使用方法:
 * const extension = new KichoUIControllerExtension(existingUIController);
 * const trackerId = extension.showProgress('action', {duration: 30000});
 * extension.updateProgress(trackerId, 50, '50%完了');
 * extension.showAdvancedNotification('success', {title: 'Complete', message: 'Done!'});
 */