
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
 * 🎯 Kicho記帳ツール UI可視化更新システム
 * common/js/pages/kicho_ui_visual.js
 * 
 * 目的: UIの変化を目視で確認できるようにする
 * - リアルタイム統計更新
 * - 取得データの即座表示
 * - 削除操作の視覚的フィードバック
 * - MF取得の進行状況表示
 */

// =====================================
// 🎯 UI可視化更新マネージャー
// =====================================

class KichoUIVisualManager {
    constructor() {
        this.ajaxUrl = './kicho_ajax_handler_postgresql.php';
        this.isAutoRefreshEnabled = false;
        this.refreshInterval = null;
        this.notificationQueue = [];
        
        this.init();
    }
    
    init() {
        this.bindEventHandlers();
        this.initializeNotificationSystem();
        this.loadInitialData();
        this.startPeriodicUpdate();
        
        console.log('🎯 Kicho UI可視化システム初期化完了');
    }
    
    // =====================================
    // 🔄 イベントハンドラー設定
    // =====================================
    
    bindEventHandlers() {
        // data-action属性を持つ全ボタンにイベントリスナー追加
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (button) {
                e.preventDefault();
                const action = button.getAttribute('data-action');
                this.handleAction(action, button);
            }
        });
        
        // 削除ボタン専用ハンドラー
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="delete-data-item"]')) {
                const button = e.target.closest('[data-action="delete-data-item"]');
                const itemId = button.getAttribute('data-item-id');
                this.handleDeleteItem(itemId, button);
            }
        });
        
        // チェックボックス選択変更
        document.addEventListener('change', (e) => {
            if (e.target.matches('[data-checkbox="data-item"]')) {
                this.updateSelectedCount();
            }
        });
    }
    
    // =====================================
    // 🎬 アクション処理システム
    // =====================================
    
    async handleAction(action, button) {
        const originalText = button.innerHTML;
        
        try {
            // ボタン状態を「処理中」に変更
            this.setButtonLoading(button, true);
            
            // アクション別処理
            switch (action) {
                case 'execute-mf-import':
                    await this.executeMFImport(button);
                    break;
                case 'refresh-all':
                    await this.refreshAllData(button);
                    break;
                case 'execute-integrated-ai-learning':
                    await this.executeAILearning(button);
                    break;
                case 'toggle-auto-refresh':
                    await this.toggleAutoRefresh(button);
                    break;
                case 'refresh-statistics':
                    await this.refreshStatistics(button);
                    break;
                default:
                    await this.handleGenericAction(action, button);
            }
            
        } catch (error) {
            console.error(`アクションエラー [${action}]:`, error);
            this.showNotification(`エラー: ${error.message}`, 'error');
        } finally {
            // ボタン状態を元に戻す
            this.setButtonLoading(button, false);
            button.innerHTML = originalText;
        }
    }
    
    // =====================================
    // 🔄 具体的アクション実装
    // =====================================
    
    async executeMFImport(button) {
        this.showNotification('MFクラウドからデータを取得中...', 'info');
        
        const response = await this.makeAjaxRequest('execute-mf-import', {});
        
        if (response.success) {
            // 成功通知
            this.showNotification(
                `✅ ${response.message} (${response.imported_count}件)`,
                'success'
            );
            
            // UI即座更新
            this.updateStatistics(response.statistics);
            this.addNewImportData({
                id: 'mf-' + response.session_id,
                type: 'mf',
                name: response.file_name,
                count: response.imported_count,
                details: `取得日: ${response.timestamp} | 記帳処理用`,
                timestamp: response.timestamp
            });
            
            // 視覚的効果
            this.highlightNewData('mf');
            
        } else {
            this.showNotification(`❌ ${response.message}`, 'error');
        }
    }
    
    async refreshAllData(button) {
        this.showNotification('全データを更新中...', 'info');
        
        const response = await this.makeAjaxRequest('refresh-all', {});
        
        if (response.success) {
            // 統計データ更新
            this.updateStatistics(response.statistics);
            
            // インポートデータ更新
            this.updateImportDataList(response.import_data);
            
            // 更新時刻表示
            this.updateLastUpdateTime(response.timestamp);
            
            this.showNotification('✅ 全データ更新完了', 'success');
        } else {
            this.showNotification('❌ データ更新に失敗しました', 'error');
        }
    }
    
    async executeAILearning(button) {
        const textInput = document.getElementById('aiTextInput');
        const learningText = textInput ? textInput.value : 'デフォルト学習テキスト';
        
        this.showNotification('AI学習を実行中...', 'info');
        
        const response = await this.makeAjaxRequest('execute-integrated-ai-learning', {
            learning_text: learningText
        });
        
        if (response.success) {
            this.showNotification(
                `🤖 ${response.message}`,
                'success'
            );
            
            // 統計更新
            this.updateStatistics(response.statistics);
            
            // AI学習履歴に追加
            this.addAILearningHistory({
                datetime: response.timestamp,
                status: 'completed',
                generated_rules: response.generated_rules
            });
            
        } else {
            this.showNotification(`❌ AI学習エラー: ${response.message}`, 'error');
        }
    }
    
    async toggleAutoRefresh(button) {
        const response = await this.makeAjaxRequest('toggle-auto-refresh', {});
        
        if (response.success) {
            this.isAutoRefreshEnabled = response.auto_refresh_enabled;
            
            // ボタンテキスト更新
            const icon = button.querySelector('i');
            const text = button.querySelector('span:not(.icon)') || button.lastChild;
            
            if (this.isAutoRefreshEnabled) {
                icon.className = 'fas fa-pause';
                if (text) text.textContent = '自動更新停止';
                button.classList.add('active');
                this.startAutoRefresh();
            } else {
                icon.className = 'fas fa-play';
                if (text) text.textContent = '自動更新開始';
                button.classList.remove('active');
                this.stopAutoRefresh();
            }
            
            this.showNotification(response.message, 'success');
        }
    }
    
    async refreshStatistics(button) {
        const response = await this.makeAjaxRequest('refresh-statistics', {});
        
        if (response.success) {
            this.updateStatistics(response.statistics);
            this.showNotification('📊 統計データを更新しました', 'success');
        }
    }
    
    async handleGenericAction(action, button) {
        // その他のアクション汎用処理
        const response = await this.makeAjaxRequest(action, {});
        
        if (response.success) {
            this.showNotification(`✅ ${response.message || 'アクション実行完了'}`, 'success');
        } else {
            this.showNotification(`❌ ${response.message || 'アクション実行失敗'}`, 'error');
        }
    }
    
    // =====================================
    // 🗑️ 削除処理
    // =====================================
    
    async handleDeleteItem(itemId, button) {
        if (!confirm('このデータを削除しますか？')) {
            return;
        }
        
        const originalText = button.innerHTML;
        this.setButtonLoading(button, true);
        
        try {
            const response = await this.makeAjaxRequest('delete-data-item', {
                item_id: itemId
            });
            
            if (response.success) {
                // DOM要素を視覚的効果付きで削除
                const dataItem = button.closest('.kicho__data-item');
                if (dataItem) {
                    dataItem.style.transition = 'all 0.3s ease';
                    dataItem.style.opacity = '0';
                    dataItem.style.transform = 'translateX(-20px)';
                    
                    setTimeout(() => {
                        dataItem.remove();
                    }, 300);
                }
                
                // 統計データ更新
                this.updateStatistics(response.statistics);
                
                // カウンター更新
                this.updateDataCounters();
                
                this.showNotification('🗑️ データを削除しました', 'success');
                
            } else {
                this.showNotification(`❌ ${response.message}`, 'error');
            }
            
        } catch (error) {
            this.showNotification(`削除エラー: ${error.message}`, 'error');
        } finally {
            this.setButtonLoading(button, false);
            button.innerHTML = originalText;
        }
    }
    
    // =====================================
    // 📊 UI更新メソッド
    // =====================================
    
    updateStatistics(stats) {
        // メイン統計カード更新
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
                // アニメーション効果付きで値更新
                element.style.transition = 'all 0.3s ease';
                element.style.transform = 'scale(1.1)';
                element.textContent = value;
                
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 150);
            }
        });
        
        // データソース表示更新
        const dataSource = document.querySelector('[data-stat="data_source"]');
        if (dataSource) {
            dataSource.textContent = (stats.data_source || 'unknown').toUpperCase();
        }
    }
    
    addNewImportData(data) {
        const importList = document.getElementById('importedDataList');
        if (!importList) return;
        
        // 新しいデータ項目のHTML生成
        const iconClass = data.type === 'mf' ? 'fa-cloud icon--mf' : 
                         (data.type === 'csv' ? 'fa-file-csv icon--csv' : 'fa-brain icon--ai');
        
        const newItem = document.createElement('div');
        newItem.className = 'kicho__data-item';
        newItem.setAttribute('data-source', data.type);
        newItem.setAttribute('data-item-id', data.id);
        newItem.style.opacity = '0';
        newItem.style.transform = 'translateY(-20px)';
        
        newItem.innerHTML = `
            <input type="checkbox" class="kicho__data-checkbox" data-checkbox="data-item">
            <div class="kicho__data-info">
                <div class="kicho__data-title">
                    <i class="fas ${iconClass}"></i>
                    <span class="kicho__data-name">${data.name}</span>
                    ${data.count ? `<span class="kicho__data-count">(${data.count}件)</span>` : ''}
                </div>
                <div class="kicho__data-details">${data.details}</div>
            </div>
            <button class="kicho__btn kicho__btn--small kicho__btn--danger" data-action="delete-data-item" data-item-id="${data.id}">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        // リストの先頭に追加
        importList.insertBefore(newItem, importList.firstChild);
        
        // アニメーション効果
        setTimeout(() => {
            newItem.style.transition = 'all 0.3s ease';
            newItem.style.opacity = '1';
            newItem.style.transform = 'translateY(0)';
        }, 50);
        
        // 新着ハイライト
        newItem.style.backgroundColor = '#e0f2fe';
        setTimeout(() => {
            newItem.style.backgroundColor = '';
        }, 2000);
    }
    
    updateImportDataList(importData) {
        const importList = document.getElementById('importedDataList');
        if (!importList || !importData) return;
        
        importList.innerHTML = '';
        
        importData.forEach(item => {
            const type = item.source_type === 'mf_cloud' ? 'mf' : 
                        (item.source_type === 'csv_upload' ? 'csv' : 'text');
            
            this.addNewImportData({
                id: type + '-' + item.id,
                type: type,
                name: item.file_name || '取引データ',
                count: item.record_count,
                details: (item.description || '取得日: ' + item.created_at) + ' | 状態: ' + item.status
            });
        });
    }
    
    addAILearningHistory(session) {
        const sessionList = document.getElementById('aiSessionList');
        if (!sessionList) return;
        
        const newSession = document.createElement('div');
        newSession.className = 'kicho__session-item';
        newSession.innerHTML = `
            <span class="kicho__session-datetime">${session.datetime}</span>
            <span class="kicho__session-status--success">完了</span>
            ${session.generated_rules ? `<span class="kicho__session-rules">(${session.generated_rules}個ルール生成)</span>` : ''}
        `;
        
        sessionList.insertBefore(newSession, sessionList.firstChild);
        
        // 新着ハイライト
        newSession.style.backgroundColor = '#f0f9ff';
        setTimeout(() => {
            newSession.style.backgroundColor = '';
        }, 2000);
    }
    
    updateSelectedCount() {
        const checkboxes = document.querySelectorAll('[data-checkbox="data-item"]:checked');
        const countElement = document.getElementById('selectedDataCount');
        if (countElement) {
            countElement.textContent = checkboxes.length;
        }
    }
    
    updateDataCounters() {
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
    }
    
    updateLastUpdateTime(timestamp) {
        const timeElement = document.getElementById('lastUpdateTime');
        if (timeElement) {
            timeElement.textContent = timestamp;
        }
    }
    
    highlightNewData(type) {
        const newItems = document.querySelectorAll(`[data-source="${type}"]`);
        newItems.forEach(item => {
            item.style.border = '2px solid #10b981';
            setTimeout(() => {
                item.style.border = '';
            }, 3000);
        });
    }
    
    // =====================================
    // 🔔 通知システム
    // =====================================
    
    initializeNotificationSystem() {
        // 通知コンテナーが存在しない場合は作成
        if (!document.getElementById('kicho-notifications')) {
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
        }
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('kicho-notifications');
        if (!container) return;
        
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
        
        // アニメーション
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 50);
        
        // 自動削除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);
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
    
    // =====================================
    // 🔄 ボタン状態管理
    // =====================================
    
    setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.classList.add('loading');
            
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-spinner fa-spin';
            }
        } else {
            button.disabled = false;
            button.classList.remove('loading');
        }
    }
    
    // =====================================
    // 🌐 Ajax通信システム
    // =====================================
    
    async makeAjaxRequest(action, data = {}) {
        const formData = new FormData();
        formData.append('action', action);
        
        // CSRFトークン追加
        const csrfToken = document.querySelector('meta[name="csrf-token"]');
        if (csrfToken) {
            formData.append('csrf_token', csrfToken.getAttribute('content'));
        }
        
        // データ追加
        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, value);
        });
        
        try {
            const response = await fetch(this.ajaxUrl, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('Ajax Request Error:', error);
            throw error;
        }
    }
    
    // =====================================
    // 🔄 自動更新システム
    // =====================================
    
    async loadInitialData() {
        try {
            const response = await this.makeAjaxRequest('refresh-all', {});
            if (response.success) {
                this.updateStatistics(response.statistics);
                this.updateImportDataList(response.import_data);
            }
        } catch (error) {
            console.error('初期データ読み込みエラー:', error);
        }
    }
    
    startPeriodicUpdate() {
        // 5分ごとに統計データを更新
        setInterval(async () => {
            try {
                const response = await this.makeAjaxRequest('refresh-statistics', {});
                if (response.success) {
                    this.updateStatistics(response.statistics);
                }
            } catch (error) {
                console.error('定期更新エラー:', error);
            }
        }, 300000); // 5分
    }
    
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(async () => {
            try {
                const response = await this.makeAjaxRequest('refresh-statistics', {});
                if (response.success) {
                    this.updateStatistics(response.statistics);
                }
            } catch (error) {
                console.error('自動更新エラー:', error);
            }
        }, 30000); // 30秒
    }
    
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// =====================================
// 🚀 初期化・グローバル設定
// =====================================

// DOMロード完了時に初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Kicho UI可視化システム開始');
    
    // グローバルインスタンス作成
    window.KichoUIManager = new KichoUIVisualManager();
    
    // デバッグ用グローバル関数
    window.refreshKichoData = function() {
        window.KichoUIManager.refreshAllData({ innerHTML: '更新中...' });
    };
    
    window.testMFImport = function() {
        window.KichoUIManager.executeMFImport({ innerHTML: 'テスト中...' });
    };
    
    console.log('✅ Kicho UI可視化システム初期化完了');
});

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', function() {
    if (window.KichoUIManager) {
        window.KichoUIManager.stopAutoRefresh();
    }
});
