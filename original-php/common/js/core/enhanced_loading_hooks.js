
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
 * 🔸⏳ 必須Hooks進捗表示機能拡張版
 * 既存のローディング機能を進捗表示・キャンセル機能付きに拡張
 * 
 * ✅ 進捗パーセンテージ表示
 * ✅ キャンセル機能
 * ✅ 複数処理の並列管理
 * ✅ 詳細状況メッセージ
 * ✅ 予想残り時間表示
 */

"use strict";

// 既存システムとの互換性を保持
window.CAIDS = window.CAIDS || {};
window.NAGANO3 = window.NAGANO3 || {};

/**
 * 拡張ローディングマネージャー
 */
class EnhancedLoadingManager {
    constructor() {
        this.version = "2.0.0";
        this.activeProcesses = new Map();
        this.processCounter = 0;
        this.loadingContainer = null;
        this.progressContainer = null;
        this.cancelCallbacks = new Map();
        
        console.log("⏳ Enhanced Loading Manager 初期化完了");
        this.initializeUI();
    }
    
    /**
     * UI初期化
     */
    initializeUI() {
        // 既存のローディング要素を確認
        let existingLoader = document.getElementById('global-loading');
        
        if (existingLoader) {
            // 既存のローダーを拡張
            this.loadingContainer = existingLoader;
            this.enhanceExistingLoader();
        } else {
            // 新しいローダーを作成
            this.createNewLoader();
        }
        
        // スタイルを注入
        this.injectStyles();
    }
    
    /**
     * 既存ローダーの拡張
     */
    enhanceExistingLoader() {
        // 進捗表示コンテナを追加
        if (!this.loadingContainer.querySelector('.progress-container')) {
            const progressHTML = `
                <div class="progress-container" style="margin-top: 15px;">
                    <div class="progress-bar-container">
                        <div class="progress-bar" id="loading-progress-bar"></div>
                        <div class="progress-text" id="loading-progress-text">0%</div>
                    </div>
                    <div class="progress-details" id="loading-progress-details"></div>
                    <div class="progress-actions" id="loading-progress-actions"></div>
                </div>
            `;
            
            const loadingMessage = this.loadingContainer.querySelector('.loading-message');
            if (loadingMessage) {
                loadingMessage.insertAdjacentHTML('afterend', progressHTML);
            } else {
                this.loadingContainer.insertAdjacentHTML('beforeend', progressHTML);
            }
        }
        
        this.progressContainer = this.loadingContainer.querySelector('.progress-container');
    }
    
    /**
     * 新しいローダーの作成
     */
    createNewLoader() {
        this.loadingContainer = document.createElement('div');
        this.loadingContainer.id = 'enhanced-global-loading';
        this.loadingContainer.innerHTML = `
            <div class="loading-overlay">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-message" id="enhanced-loading-message">処理中...</div>
                    <div class="progress-container">
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="loading-progress-bar"></div>
                            <div class="progress-text" id="loading-progress-text">0%</div>
                        </div>
                        <div class="progress-details" id="loading-progress-details"></div>
                        <div class="progress-actions" id="loading-progress-actions"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.loadingContainer.style.display = 'none';
        document.body.appendChild(this.loadingContainer);
        this.progressContainer = this.loadingContainer.querySelector('.progress-container');
    }
    
    /**
     * スタイル注入
     */
    injectStyles() {
        if (document.getElementById('enhanced-loading-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'enhanced-loading-styles';
        style.textContent = `
            /* 拡張ローディングスタイル */
            #enhanced-global-loading {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10001;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(3px);
            }
            
            .loading-overlay {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
            }
            
            .loading-content {
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                text-align: center;
                min-width: 320px;
                max-width: 480px;
            }
            
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .progress-container {
                margin-top: 20px;
            }
            
            .progress-bar-container {
                position: relative;
                background: #f0f0f0;
                border-radius: 10px;
                height: 20px;
                margin-bottom: 10px;
                overflow: hidden;
            }
            
            .progress-bar {
                background: linear-gradient(90deg, #3498db, #2980b9);
                height: 100%;
                transition: width 0.3s ease;
                border-radius: 10px;
                width: 0%;
                position: relative;
            }
            
            .progress-bar::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                right: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                animation: shimmer 1.5s infinite;
            }
            
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            
            .progress-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 12px;
                font-weight: bold;
                color: #333;
                text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
            }
            
            .progress-details {
                font-size: 13px;
                color: #666;
                margin-bottom: 10px;
                min-height: 18px;
            }
            
            .progress-actions {
                margin-top: 15px;
            }
            
            .cancel-button {
                background: #e74c3c;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                transition: background 0.2s;
            }
            
            .cancel-button:hover {
                background: #c0392b;
            }
            
            .cancel-button:disabled {
                background: #bdc3c7;
                cursor: not-allowed;
            }
            
            /* 既存ローダーの拡張 */
            #global-loading .progress-container {
                display: none;
            }
            
            #global-loading.enhanced .progress-container {
                display: block;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * 進捗付きローディング開始
     * @param {string} message - 表示メッセージ
     * @param {Object} options - オプション
     */
    showLoadingWithProgress(message = '処理中...', options = {}) {
        const processId = ++this.processCounter;
        
        const processData = {
            id: processId,
            message: message,
            progress: 0,
            startTime: Date.now(),
            estimatedTotal: options.estimatedDuration || null,
            details: '',
            cancellable: options.cancellable || false,
            onCancel: options.onCancel || null,
            stages: options.stages || []
        };
        
        this.activeProcesses.set(processId, processData);
        
        // キャンセルコールバックを保存
        if (processData.onCancel) {
            this.cancelCallbacks.set(processId, processData.onCancel);
        }
        
        this.updateDisplay();
        this.showLoader();
        
        console.log(`⏳ 進捗ローディング開始 [${processId}]: ${message}`);
        return processId;
    }
    
    /**
     * 進捗更新
     * @param {number} processId - プロセスID
     * @param {number} progress - 進捗(0-100)
     * @param {string} details - 詳細メッセージ
     */
    updateProgress(processId, progress, details = '') {
        const processData = this.activeProcesses.get(processId);
        if (!processData) {
            console.warn(`⚠️ 不明なプロセスID: ${processId}`);
            return;
        }
        
        processData.progress = Math.min(100, Math.max(0, progress));
        processData.details = details;
        
        this.updateDisplay();
        
        console.log(`📊 進捗更新 [${processId}]: ${progress}% - ${details}`);
    }
    
    /**
     * ローディング完了
     * @param {number} processId - プロセスID
     */
    hideLoading(processId) {
        if (this.activeProcesses.has(processId)) {
            this.activeProcesses.delete(processId);
            this.cancelCallbacks.delete(processId);
            
            console.log(`✅ ローディング完了 [${processId}]`);
        }
        
        // アクティブなプロセスがなくなったらローダーを非表示
        if (this.activeProcesses.size === 0) {
            this.hideLoader();
        } else {
            this.updateDisplay();
        }
    }
    
    /**
     * 表示更新
     */
    updateDisplay() {
        if (this.activeProcesses.size === 0) return;
        
        // 最新のプロセスを表示対象にする
        const latestProcess = Array.from(this.activeProcesses.values()).pop();
        
        // メッセージ更新
        const messageElement = this.loadingContainer.querySelector('.loading-message') || 
                              this.loadingContainer.querySelector('#enhanced-loading-message');
        if (messageElement) {
            messageElement.textContent = latestProcess.message;
        }
        
        // 進捗バー更新
        const progressBar = document.getElementById('loading-progress-bar');
        const progressText = document.getElementById('loading-progress-text');
        const progressDetails = document.getElementById('loading-progress-details');
        const progressActions = document.getElementById('loading-progress-actions');
        
        if (progressBar) {
            progressBar.style.width = `${latestProcess.progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(latestProcess.progress)}%`;
        }
        
        if (progressDetails) {
            let detailsText = latestProcess.details;
            
            // 予想残り時間を計算
            if (latestProcess.estimatedTotal && latestProcess.progress > 0) {
                const elapsed = Date.now() - latestProcess.startTime;
                const estimated = (elapsed / latestProcess.progress) * 100;
                const remaining = Math.max(0, estimated - elapsed);
                
                if (remaining > 1000) {
                    const seconds = Math.round(remaining / 1000);
                    detailsText += ` (残り約${seconds}秒)`;
                }
            }
            
            progressDetails.textContent = detailsText;
        }
        
        // キャンセルボタン
        if (progressActions) {
            if (latestProcess.cancellable) {
                progressActions.innerHTML = `
                    <button class="cancel-button" onclick="CAIDS.loadingManager.cancelProcess(${latestProcess.id})">
                        キャンセル
                    </button>
                `;
            } else {
                progressActions.innerHTML = '';
            }
        }
        
        // 既存ローダーの場合、拡張モードを有効化
        if (this.loadingContainer.id === 'global-loading') {
            this.loadingContainer.classList.add('enhanced');
        }
    }
    
    /**
     * プロセスキャンセル
     */
    cancelProcess(processId) {
        const processData = this.activeProcesses.get(processId);
        if (!processData) return;
        
        console.log(`🚫 プロセスキャンセル [${processId}]: ${processData.message}`);
        
        // キャンセルコールバック実行
        const cancelCallback = this.cancelCallbacks.get(processId);
        if (cancelCallback && typeof cancelCallback === 'function') {
            try {
                cancelCallback(processId);
            } catch (error) {
                console.error('❌ キャンセルコールバックエラー:', error);
            }
        }
        
        this.hideLoading(processId);
    }
    
    /**
     * すべてのプロセスをキャンセル
     */
    cancelAllProcesses() {
        const processIds = Array.from(this.activeProcesses.keys());
        processIds.forEach(id => this.cancelProcess(id));
        
        console.log(`🚫 全プロセスキャンセル: ${processIds.length}件`);
    }
    
    /**
     * ローダー表示
     */
    showLoader() {
        if (this.loadingContainer) {
            this.loadingContainer.style.display = 'block';
        }
    }
    
    /**
     * ローダー非表示
     */
    hideLoader() {
        if (this.loadingContainer) {
            this.loadingContainer.style.display = 'none';
            
            // 拡張モードを解除
            if (this.loadingContainer.id === 'global-loading') {
                this.loadingContainer.classList.remove('enhanced');
            }
        }
    }
    
    /**
     * 従来のshowLoading互換性メソッド
     */
    showLoading(message = '処理中...') {
        return this.showLoadingWithProgress(message);
    }
    
    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            version: this.version,
            activeProcesses: this.activeProcesses.size,
            processes: Array.from(this.activeProcesses.values()),
            loadingContainerExists: !!this.loadingContainer,
            progressContainerExists: !!this.progressContainer
        };
    }
}

/**
 * 拡張フィードバックシステム
 */
class EnhancedFeedbackSystem {
    constructor() {
        this.version = "2.0.0";
        this.notifications = new Map();
        this.notificationCounter = 0;
        
        console.log("💬 Enhanced Feedback System 初期化完了");
        this.initializeContainer();
    }
    
    /**
     * 通知コンテナ初期化
     */
    initializeContainer() {
        if (document.getElementById('enhanced-feedback-container')) return;
        
        const container = document.createElement('div');
        container.id = 'enhanced-feedback-container';
        container.innerHTML = `
            <div class="feedback-notifications" id="feedback-notifications"></div>
        `;
        
        document.body.appendChild(container);
        this.injectFeedbackStyles();
    }
    
    /**
     * フィードバック用スタイル注入
     */
    injectFeedbackStyles() {
        if (document.getElementById('enhanced-feedback-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'enhanced-feedback-styles';
        style.textContent = `
            #enhanced-feedback-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            }
            
            .feedback-notifications {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .notification {
                background: white;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                max-width: 350px;
                pointer-events: auto;
                transform: translateX(100%);
                animation: slideIn 0.3s ease forwards;
                position: relative;
                border-left: 4px solid #3498db;
            }
            
            .notification.success {
                border-left-color: #27ae60;
            }
            
            .notification.warning {
                border-left-color: #f39c12;
            }
            
            .notification.error {
                border-left-color: #e74c3c;
            }
            
            .notification.info {
                border-left-color: #3498db;
            }
            
            @keyframes slideIn {
                to { transform: translateX(0); }
            }
            
            @keyframes slideOut {
                to { transform: translateX(100%); }
            }
            
            .notification.removing {
                animation: slideOut 0.3s ease forwards;
            }
            
            .notification-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            
            .notification-icon {
                font-size: 20px;
                line-height: 1;
                margin-top: 2px;
            }
            
            .notification-body {
                flex: 1;
            }
            
            .notification-title {
                font-weight: bold;
                margin-bottom: 4px;
                font-size: 14px;
            }
            
            .notification-message {
                font-size: 13px;
                color: #666;
                line-height: 1.4;
            }
            
            .notification-actions {
                margin-top: 12px;
                display: flex;
                gap: 8px;
            }
            
            .notification-action {
                background: #3498db;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .notification-action:hover {
                background: #2980b9;
            }
            
            .notification-action.secondary {
                background: #95a5a6;
            }
            
            .notification-action.secondary:hover {
                background: #7f8c8d;
            }
            
            .notification-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #bdc3c7;
                line-height: 1;
                padding: 4px;
            }
            
            .notification-close:hover {
                color: #7f8c8d;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * アクション付きメッセージ表示
     */
    showSuccessWithActions(message, actions = []) {
        return this.showNotificationWithActions(message, 'success', actions);
    }
    
    showWarningWithActions(message, actions = []) {
        return this.showNotificationWithActions(message, 'warning', actions);
    }
    
    showErrorWithActions(message, actions = []) {
        return this.showNotificationWithActions(message, 'error', actions);
    }
    
    showInfoWithActions(message, actions = []) {
        return this.showNotificationWithActions(message, 'info', actions);
    }
    
    /**
     * アクション付き通知表示
     */
    showNotificationWithActions(message, type = 'info', actions = [], options = {}) {
        const notificationId = ++this.notificationCounter;
        
        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };
        
        const titles = {
            success: '成功',
            warning: '警告',
            error: 'エラー',
            info: '情報'
        };
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.dataset.id = notificationId;
        
        let actionsHTML = '';
        if (actions.length > 0) {
            actionsHTML = `
                <div class="notification-actions">
                    ${actions.map((action, index) => `
                        <button class="notification-action ${action.style || ''}" 
                                onclick="CAIDS.feedbackSystem.executeAction(${notificationId}, ${index})">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            `;
        }
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icons[type]}</div>
                <div class="notification-body">
                    <div class="notification-title">${options.title || titles[type]}</div>
                    <div class="notification-message">${message}</div>
                    ${actionsHTML}
                </div>
            </div>
            <button class="notification-close" onclick="CAIDS.feedbackSystem.hideNotification(${notificationId})">×</button>
        `;
        
        // 通知データを保存
        this.notifications.set(notificationId, {
            id: notificationId,
            element: notification,
            actions: actions,
            autoHide: options.autoHide !== false,
            duration: options.duration || 5000
        });
        
        // コンテナに追加
        const container = document.getElementById('feedback-notifications');
        container.appendChild(notification);
        
        // 自動非表示
        if (this.notifications.get(notificationId).autoHide) {
            setTimeout(() => {
                this.hideNotification(notificationId);
            }, this.notifications.get(notificationId).duration);
        }
        
        console.log(`💬 通知表示 [${notificationId}]: ${type} - ${message}`);
        return notificationId;
    }
    
    /**
     * アクション実行
     */
    executeAction(notificationId, actionIndex) {
        const notificationData = this.notifications.get(notificationId);
        if (!notificationData) return;
        
        const action = notificationData.actions[actionIndex];
        if (!action || typeof action.callback !== 'function') return;
        
        try {
            action.callback();
            console.log(`🔗 アクション実行 [${notificationId}]: ${action.label}`);
            
            // アクション実行後に通知を非表示（設定による）
            if (action.hideAfterAction !== false) {
                this.hideNotification(notificationId);
            }
        } catch (error) {
            console.error('❌ アクション実行エラー:', error);
        }
    }
    
    /**
     * 通知非表示
     */
    hideNotification(notificationId) {
        const notificationData = this.notifications.get(notificationId);
        if (!notificationData) return;
        
        notificationData.element.classList.add('removing');
        
        setTimeout(() => {
            if (notificationData.element.parentNode) {
                notificationData.element.parentNode.removeChild(notificationData.element);
            }
            this.notifications.delete(notificationId);
        }, 300);
        
        console.log(`💬 通知非表示 [${notificationId}]`);
    }
    
    /**
     * 従来の互換性メソッド
     */
    showSuccess(message) {
        return this.showNotificationWithActions(message, 'success');
    }
    
    showWarning(message) {
        return this.showNotificationWithActions(message, 'warning');
    }
    
    showError(message) {
        return this.showNotificationWithActions(message, 'error');
    }
    
    showInfo(message) {
        return this.showNotificationWithActions(message, 'info');
    }
}

/**
 * CAIDSシステムへの統合
 */
function initializeEnhancedHooks() {
    console.log("🔸 必須Hooks拡張機能初期化開始");
    
    try {
        // 拡張ローディングマネージャー初期化
        CAIDS.loadingManager = new EnhancedLoadingManager();
        
        // 拡張フィードバックシステム初期化
        CAIDS.feedbackSystem = new EnhancedFeedbackSystem();
        
        // 従来の互換性を保持
        CAIDS.showLoading = (message, options) => CAIDS.loadingManager.showLoadingWithProgress(message, options);
        CAIDS.hideLoading = (processId) => CAIDS.loadingManager.hideLoading(processId);
        CAIDS.updateProgress = (processId, progress, details) => CAIDS.loadingManager.updateProgress(processId, progress, details);
        
        CAIDS.showSuccess = (message, actions) => CAIDS.feedbackSystem.showSuccessWithActions(message, actions);
        CAIDS.showWarning = (message, actions) => CAIDS.feedbackSystem.showWarningWithActions(message, actions);
        CAIDS.showError = (message, actions) => CAIDS.feedbackSystem.showErrorWithActions(message, actions);
        CAIDS.showInfo = (message, actions) => CAIDS.feedbackSystem.showInfoWithActions(message, actions);
        
        // NAGANO3との互換性
        if (window.NAGANO3) {
            NAGANO3.loadingManager = CAIDS.loadingManager;
            NAGANO3.feedbackSystem = CAIDS.feedbackSystem;
        }
        
        console.log("✅ 必須Hooks拡張機能初期化完了");
        console.log("🔍 デバッグ情報:", {
            loading: CAIDS.loadingManager.getDebugInfo(),
            feedback: CAIDS.feedbackSystem.version
        });
        
    } catch (error) {
        console.error("❌ 必須Hooks拡張機能初期化失敗:", error);
    }
}

// 初期化実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnhancedHooks);
} else {
    setTimeout(initializeEnhancedHooks, 0);
}

// デバッグ用グローバル関数
if (typeof window !== 'undefined') {
    window.CAIDS_ENHANCED_DEBUG = {
        loadingInfo: () => CAIDS.loadingManager?.getDebugInfo(),
        showTestProgress: () => {
            const processId = CAIDS.loadingManager.showLoadingWithProgress('テスト処理', {
                cancellable: true,
                onCancel: (id) => console.log(`テストプロセス ${id} がキャンセルされました`)
            });
            
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                CAIDS.loadingManager.updateProgress(processId, progress, `ステップ ${progress/10}/10`);
                
                if (progress >= 100) {
                    clearInterval(interval);
                    CAIDS.loadingManager.hideLoading(processId);
                }
            }, 500);
        },
        showTestActions: () => {
            CAIDS.feedbackSystem.showSuccessWithActions('操作が完了しました', [
                {
                    label: '元に戻す',
                    callback: () => alert('元に戻しました'),
                    style: 'secondary'
                },
                {
                    label: '詳細を見る',
                    callback: () => alert('詳細情報を表示'),
                    style: ''
                }
            ]);
        }
    };
}

console.log("🔸⏳ 必須Hooks進捗表示機能拡張版 読み込み完了");