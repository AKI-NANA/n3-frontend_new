
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
 * NAGANO-3 eBay受注管理システム - リアルタイム通信フロントエンドマネージャー
 * 
 * @version 3.0.0
 * @date 2025-06-11
 * @description WebSocket通信とリアルタイムUI更新システム
 */

class N3RealTimeManager {
    constructor() {
        this.websocket = null;
        this.reconnectInterval = 5000;
        this.maxReconnectAttempts = 10;
        this.reconnectAttempts = 0;
        this.clientId = null;
        this.isConnected = false;
        this.subscriptions = new Map();
        this.messageQueue = [];
        this.heartbeatInterval = null;
        
        // UI更新マネージャー
        this.uiManager = new N3UIUpdateManager();
        
        // 通知マネージャー
        this.notificationManager = new N3NotificationManager();
        
        // データキャッシュ
        this.dataCache = new Map();
        
        console.log('🚀 N3 リアルタイムマネージャー初期化');
        this.init();
    }
    
    init() {
        // WebSocket接続
        this.connect();
        
        // ページ離脱時の処理
        window.addEventListener('beforeunload', () => {
            this.disconnect();
        });
        
        // ネットワーク状態監視
        window.addEventListener('online', () => {
            console.log('🌐 ネットワーク復旧');
            this.connect();
        });
        
        window.addEventListener('offline', () => {
            console.log('📶 ネットワーク切断');
            this.notificationManager.showOfflineNotification();
        });
        
        // 可視性変更監視（タブ切り替え）
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.handleTabVisible();
            } else {
                this.handleTabHidden();
            }
        });
    }
    
    connect() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            return;
        }
        
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.N3_CONFIG?.websocket_host || 'localhost:8765';
        const wsUrl = `${wsProtocol}//${wsHost}`;
        
        console.log(`🔌 WebSocket接続開始: ${wsUrl}`);
        
        try {
            this.websocket = new WebSocket(wsUrl);
            this.setupWebSocketHandlers();
        } catch (error) {
            console.error('❌ WebSocket接続エラー:', error);
            this.scheduleReconnect();
        }
    }
    
    setupWebSocketHandlers() {
        this.websocket.onopen = (event) => {
            console.log('✅ WebSocket接続成功');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            this.processMessageQueue();
            this.notificationManager.showConnectionStatus(true);
        };
        
        this.websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('❌ メッセージ解析エラー:', error);
            }
        };
        
        this.websocket.onclose = (event) => {
            console.log('🔌 WebSocket接続終了:', event.code);
            this.isConnected = false;
            this.stopHeartbeat();
            this.notificationManager.showConnectionStatus(false);
            
            if (event.code !== 1000) { // 正常終了以外
                this.scheduleReconnect();
            }
        };
        
        this.websocket.onerror = (error) => {
            console.error('❌ WebSocket エラー:', error);
            this.notificationManager.showErrorNotification('接続エラーが発生しました');
        };
    }
    
    handleMessage(data) {
        console.log('📨 受信メッセージ:', data.type);
        
        switch (data.type) {
            case 'connection_established':
                this.handleConnectionEstablished(data);
                break;
            
            case 'orders_updated':
                this.handleOrdersUpdated(data);
                break;
            
            case 'stock_alerts':
                this.handleStockAlerts(data);
                break;
            
            case 'low_stock_alert':
                this.handleLowStockAlert(data);
                break;
            
            case 'price_alert':
                this.handlePriceAlert(data);
                break;
            
            case 'delivery_completed':
                this.handleDeliveryCompleted(data);
                break;
            
            case 'ai_recommendations':
                this.handleAIRecommendations(data);
                break;
            
            case 'health_status':
                this.handleHealthStatus(data);
                break;
            
            case 'initial_orders':
                this.handleInitialOrders(data);
                break;
            
            case 'pong':
                this.handlePong(data);
                break;
            
            default:
                console.warn('⚠️ 未知のメッセージタイプ:', data.type);
        }
        
        // サブスクリプション処理
        this.processSubscriptions(data);
    }
    
    handleConnectionEstablished(data) {
        this.clientId = data.client_id;
        console.log(`✅ クライアントID取得: ${this.clientId}`);
        
        // 同期ステータス表示
        this.uiManager.updateSyncStatus(data.sync_status);
        
        // サブスクリプション登録
        this.registerDefaultSubscriptions();
    }
    
    handleOrdersUpdated(data) {
        console.log(`📦 受注更新: ${data.count}件`);
        
        // データキャッシュ更新
        this.dataCache.set('recent_orders', data.data);
        
        // UI更新
        this.uiManager.updateOrdersList(data.data);
        
        // 新規受注通知
        if (data.data.length > 0) {
            this.notificationManager.showNewOrdersNotification(data.count);
            
            // 音声通知（設定に応じて）
            if (window.N3_CONFIG?.sound_notifications) {
                this.playNotificationSound('new_order');
            }
        }
        
        // 高利益受注のハイライト
        this.highlightHighProfitOrders(data.data);
    }
    
    handleStockAlerts(data) {
        console.log('📊 在庫アラート受信');
        
        // 在庫アラート表示
        this.uiManager.updateStockAlerts(data.data);
        
        // 緊急在庫アラート通知
        const criticalStock = data.data.filter(item => item.quantity === 0);
        if (criticalStock.length > 0) {
            this.notificationManager.showCriticalStockAlert(criticalStock);
        }
    }
    
    handleLowStockAlert(data) {
        console.log('⚠️ 低在庫アラート');
        
        // 低在庫バッジ表示
        this.uiManager.showLowStockBadge(data.data.length);
        
        // 自動仕入れ推奨表示
        this.uiManager.showAutoReorderSuggestions(data.data);
        
        // デスクトップ通知
        this.notificationManager.showDesktopNotification(
            '低在庫アラート',
            `${data.data.length}商品の在庫が不足しています`
        );
    }
    
    handlePriceAlert(data) {
        console.log('💰 価格変動アラート');
        
        // 価格変動表示
        this.uiManager.updatePriceAlerts(data.data);
        
        // 仕入れタイミング通知
        const buyOpportunities = data.data.filter(p => p.change_rate < -15);
        if (buyOpportunities.length > 0) {
            this.notificationManager.showBuyOpportunityAlert(buyOpportunities);
        }
    }
    
    handleDeliveryCompleted(data) {
        console.log('🚚 配送完了通知');
        
        // 配送完了UI更新
        this.uiManager.updateDeliveryStatus(data.data);
        
        // 完了通知表示
        this.notificationManager.showDeliveryCompletedNotification(data.data.length);
    }
    
    handleAIRecommendations(data) {
        console.log('🤖 AI推奨データ受信');
        
        // AI推奨表示
        this.uiManager.updateAIRecommendations(data.data);
        
        // 高確度推奨のハイライト
        const highConfidenceRecs = data.data.filter(rec => rec.confidence_score > 85);
        if (highConfidenceRecs.length > 0) {
            this.uiManager.highlightHighConfidenceRecommendations(highConfidenceRecs);
        }
    }
    
    handleHealthStatus(data) {
        // システムヘルス表示更新
        this.uiManager.updateHealthStatus(data.data);
        
        // 問題がある場合の警告表示
        if (data.data.status !== 'healthy') {
            this.notificationManager.showSystemHealthWarning(data.data);
        }
    }
    
    handleInitialOrders(data) {
        console.log('📋 初期データ読み込み完了');
        
        // 初期受注データ表示
        this.uiManager.loadInitialOrders(data.data);
        
        // ローディング状態解除
        this.uiManager.hideLoadingIndicator();
    }
    
    handlePong(data) {
        // ハートビート応答処理
        console.log('💓 ハートビート確認');
    }
    
    // ========== 送信メソッド ==========
    
    sendMessage(message) {
        if (this.isConnected && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        } else {
            // キューに追加
            this.messageQueue.push(message);
            console.log('📤 メッセージをキューに追加:', message.type);
        }
    }
    
    requestSync(syncType) {
        this.sendMessage({
            type: 'sync_request',
            sync_type: syncType,
            timestamp: new Date().toISOString()
        });
    }
    
    subscribe(eventType, callback) {
        if (!this.subscriptions.has(eventType)) {
            this.subscriptions.set(eventType, new Set());
        }
        this.subscriptions.get(eventType).add(callback);
        
        // サーバーにサブスクリプション通知
        this.sendMessage({
            type: 'subscription',
            event_type: eventType,
            action: 'subscribe'
        });
    }
    
    unsubscribe(eventType, callback) {
        if (this.subscriptions.has(eventType)) {
            this.subscriptions.get(eventType).delete(callback);
            
            if (this.subscriptions.get(eventType).size === 0) {
                this.subscriptions.delete(eventType);
                
                // サーバーにサブスクリプション解除通知
                this.sendMessage({
                    type: 'subscription',
                    event_type: eventType,
                    action: 'unsubscribe'
                });
            }
        }
    }
    
    updateOrderStatus(orderId, newStatus) {
        this.sendMessage({
            type: 'order_status_update',
            order_id: orderId,
            new_status: newStatus,
            timestamp: new Date().toISOString()
        });
    }
    
    // ========== 接続管理 ==========
    
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ 最大再接続試行回数に達しました');
            this.notificationManager.showMaxReconnectError();
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`🔄 ${delay}ms後に再接続試行 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }
    
    disconnect() {
        if (this.websocket) {
            this.websocket.close(1000, 'Normal closure');
            this.websocket = null;
        }
        this.stopHeartbeat();
    }
    
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.sendMessage({
                    type: 'ping',
                    timestamp: new Date().toISOString()
                });
            }
        }, 30000); // 30秒間隔
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.sendMessage(message);
        }
    }
    
    processSubscriptions(data) {
        if (this.subscriptions.has(data.type)) {
            this.subscriptions.get(data.type).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('❌ サブスクリプションコールバックエラー:', error);
                }
            });
        }
    }
    
    registerDefaultSubscriptions() {
        // デフォルトサブスクリプション登録
        this.subscribe('orders_updated', (data) => {
            console.log('📦 受注更新サブスクリプション処理');
        });
        
        this.subscribe('stock_alerts', (data) => {
            console.log('📊 在庫アラートサブスクリプション処理');
        });
    }
    
    // ========== ユーティリティ ==========
    
    handleTabVisible() {
        // タブが表示された時の処理
        if (!this.isConnected) {
            this.connect();
        }
        
        // 最新データ要求
        this.requestSync('all');
    }
    
    handleTabHidden() {
        // タブが非表示になった時の処理
        // 接続は維持するが、頻度を下げる
    }
    
    highlightHighProfitOrders(orders) {
        const highProfitOrders = orders.filter(order => {
            const profitRate = parseFloat(order.profit_rate || 0);
            return profitRate > 25; // 25%以上
        });
        
        if (highProfitOrders.length > 0) {
            this.uiManager.highlightHighProfitOrders(highProfitOrders);
        }
    }
    
    playNotificationSound(soundType) {
        const soundMap = {
            'new_order': '/assets/sounds/new_order.mp3',
            'alert': '/assets/sounds/alert.mp3',
            'success': '/assets/sounds/success.mp3'
        };
        
        const audio = new Audio(soundMap[soundType]);
        audio.volume = 0.3;
        audio.play().catch(e => console.log('🔇 音声再生無効'));
    }
}

/**
 * UI更新マネージャー
 */
class N3UIUpdateManager {
    constructor() {
        this.orderTable = document.querySelector('.juchu-kanri__order-table tbody');
        this.stockAlertsContainer = document.querySelector('.stock-alerts-container');
        this.syncStatusIndicator = document.querySelector('.sync-status-indicator');
        this.aiRecommendationsContainer = document.querySelector('.ai-recommendations-container');
    }
    
    updateOrdersList(orders) {
        if (!this.orderTable) return;
        
        // 新規受注のみ追加（重複回避）
        orders.forEach(order => {
            const existingRow = document.querySelector(`[data-order-id="${order.order_id}"]`);
            if (!existingRow) {
                this.addOrderRow(order);
            }
        });
        
        // テーブル再ソート
        this.sortOrderTable();
    }
    
    addOrderRow(order) {
        const row = document.createElement('tr');
        row.className = 'juchu-kanri__order-row';
        row.setAttribute('data-order-id', order.order_id);
        
        // 高利益受注のハイライト
        const profitRate = parseFloat(order.profit_rate || 0);
        if (profitRate > 25) {
            row.classList.add('juchu-kanri__order-row--high-profit');
        }
        
        row.innerHTML = `
            <td class="juchu-kanri__order-cell">${order.order_id}</td>
            <td class="juchu-kanri__order-cell">${order.item_title}</td>
            <td class="juchu-kanri__order-cell">¥${order.sale_price?.toLocaleString()}</td>
            <td class="juchu-kanri__order-cell">
                <span class="juchu-kanri__profit-rate ${profitRate > 20 ? 'high' : ''}">${profitRate.toFixed(1)}%</span>
            </td>
            <td class="juchu-kanri__order-cell">
                <span class="juchu-kanri__status-badge juchu-kanri__status-badge--${order.status}">${order.status}</span>
            </td>
            <td class="juchu-kanri__order-cell">${new Date(order.created_at).toLocaleDateString('ja-JP')}</td>
        `;
        
        // アニメーション付きで追加
        row.style.opacity = '0';
        row.style.transform = 'translateY(-10px)';
        this.orderTable.insertBefore(row, this.orderTable.firstChild);
        
        // フェードインアニメーション
        requestAnimationFrame(() => {
            row.style.transition = 'all 0.3s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        });
    }
    
    updateStockAlerts(alerts) {
        if (!this.stockAlertsContainer) return;
        
        this.stockAlertsContainer.innerHTML = '';
        
        alerts.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = `stock-alert stock-alert--${alert.severity}`;
            alertElement.innerHTML = `
                <div class="stock-alert__icon">⚠️</div>
                <div class="stock-alert__content">
                    <div class="stock-alert__title">${alert.sku}</div>
                    <div class="stock-alert__message">在庫: ${alert.quantity}個</div>
                </div>
                <div class="stock-alert__actions">
                    <button class="btn btn--sm btn--primary" onclick="window.shiireKanriManager.showReorderDialog('${alert.sku}')">
                        仕入れ
                    </button>
                </div>
            `;
            
            this.stockAlertsContainer.appendChild(alertElement);
        });
    }
    
    updateSyncStatus(syncStatus) {
        if (!this.syncStatusIndicator) return;
        
        const statusText = Object.values(syncStatus).every(s => s.status === 'ready') 
            ? '同期完了' 
            : '同期中...';
        
        const statusClass = Object.values(syncStatus).some(s => s.status === 'error')
            ? 'sync-status--error'
            : Object.values(syncStatus).some(s => s.status === 'syncing')
                ? 'sync-status--syncing'
                : 'sync-status--ready';
        
        this.syncStatusIndicator.className = `sync-status-indicator ${statusClass}`;
        this.syncStatusIndicator.textContent = statusText;
    }
    
    updateAIRecommendations(recommendations) {
        if (!this.aiRecommendationsContainer) return;
        
        this.aiRecommendationsContainer.innerHTML = '';
        
        recommendations.slice(0, 5).forEach(rec => {
            const recElement = document.createElement('div');
            recElement.className = 'ai-recommendation';
            recElement.innerHTML = `
                <div class="ai-recommendation__header">
                    <span class="ai-recommendation__title">${rec.product_title}</span>
                    <span class="ai-recommendation__confidence">${rec.confidence_score}%</span>
                </div>
                <div class="ai-recommendation__body">
                    <div class="ai-recommendation__profit">予想利益率: ${rec.predicted_profit_rate}%</div>
                    <div class="ai-recommendation__action">${rec.recommended_action}</div>
                </div>
            `;
            
            if (rec.confidence_score > 85) {
                recElement.classList.add('ai-recommendation--high-confidence');
            }
            
            this.aiRecommendationsContainer.appendChild(recElement);
        });
    }
    
    showLowStockBadge(count) {
        const badge = document.querySelector('.low-stock-badge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }
    }
    
    highlightHighProfitOrders(orders) {
        orders.forEach(order => {
            const row = document.querySelector(`[data-order-id="${order.order_id}"]`);
            if (row) {
                row.classList.add('juchu-kanri__order-row--high-profit-pulse');
                setTimeout(() => {
                    row.classList.remove('juchu-kanri__order-row--high-profit-pulse');
                }, 2000);
            }
        });
    }
    
    sortOrderTable() {
        if (!this.orderTable) return;
        
        const rows = Array.from(this.orderTable.querySelectorAll('tr'));
        rows.sort((a, b) => {
            const aTime = new Date(a.querySelector('.juchu-kanri__order-cell:last-child').textContent);
            const bTime = new Date(b.querySelector('.juchu-kanri__order-cell:last-child').textContent);
            return bTime - aTime; // 新しい順
        });
        
        rows.forEach(row => this.orderTable.appendChild(row));
    }
    
    loadInitialOrders(orders) {
        if (!this.orderTable) return;
        
        this.orderTable.innerHTML = '';
        orders.forEach(order => this.addOrderRow(order));
    }
    
    hideLoadingIndicator() {
        const loadingElement = document.querySelector('.loading-indicator');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
    
    updateHealthStatus(healthData) {
        const healthIndicator = document.querySelector('.health-status-indicator');
        if (healthIndicator) {
            healthIndicator.className = `health-status-indicator health-status--${healthData.status}`;
            healthIndicator.title = `システム状態: ${healthData.status}`;
        }
    }
    
    updateDeliveryStatus(deliveredOrders) {
        deliveredOrders.forEach(order => {
            const row = document.querySelector(`[data-order-id="${order.order_id}"]`);
            if (row) {
                const statusCell = row.querySelector('.juchu-kanri__status-badge');
                if (statusCell) {
                    statusCell.className = 'juchu-kanri__status-badge juchu-kanri__status-badge--delivered';
                    statusCell.textContent = '配送完了';
                }
            }
        });
    }
    
    updatePriceAlerts(priceData) {
        const priceAlertsContainer = document.querySelector('.price-alerts-container');
        if (!priceAlertsContainer) return;
        
        priceAlertsContainer.innerHTML = '';
        
        priceData.forEach(price => {
            const alertElement = document.createElement('div');
            alertElement.className = `price-alert ${price.change_rate < 0 ? 'price-alert--down' : 'price-alert--up'}`;
            alertElement.innerHTML = `
                <div class="price-alert__product">${price.product_name}</div>
                <div class="price-alert__change">${price.change_rate > 0 ? '+' : ''}${price.change_rate.toFixed(1)}%</div>
                <div class="price-alert__recommendation">${price.recommendation}</div>
            `;
            
            priceAlertsContainer.appendChild(alertElement);
        });
    }
    
    showAutoReorderSuggestions(lowStockItems) {
        const suggestionsContainer = document.querySelector('.auto-reorder-suggestions');
        if (!suggestionsContainer) return;
        
        lowStockItems.forEach(item => {
            if (item.auto_reorder_eligible) {
                const suggestion = document.createElement('div');
                suggestion.className = 'auto-reorder-suggestion';
                suggestion.innerHTML = `
                    <div class="auto-reorder-suggestion__content">
                        <strong>${item.sku}</strong> - 自動仕入れ推奨
                        <small>予想利益率: ${item.predicted_profit_rate}%</small>
                    </div>
                    <button class="btn btn--sm btn--success" onclick="window.shiireKanriManager.executeAutoReorder('${item.sku}')">
                        実行
                    </button>
                `;
                
                suggestionsContainer.appendChild(suggestion);
            }
        });
    }
    
    highlightHighConfidenceRecommendations(recommendations) {
        recommendations.forEach(rec => {
            setTimeout(() => {
                const element = document.querySelector(`[data-recommendation-id="${rec.id}"]`);
                if (element) {
                    element.classList.add('ai-recommendation--highlight');
                    setTimeout(() => {
                        element.classList.remove('ai-recommendation--highlight');
                    }, 3000);
                }
            }, Math.random() * 1000); // ランダムな遅延でアニメーション
        });
    }
}

/**
 * 通知マネージャー
 */
class N3NotificationManager {
    constructor() {
        this.notificationContainer = this.createNotificationContainer();
        this.desktopNotificationEnabled = this.checkDesktopNotificationPermission();
    }
    
    createNotificationContainer() {
        let container = document.querySelector('.n3-notifications');
        if (!container) {
            container = document.createElement('div');
            container.className = 'n3-notifications';
            document.body.appendChild(container);
        }
        return container;
    }
    
    checkDesktopNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                return true;
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    return permission === 'granted';
                });
            }
        }
        return false;
    }
    
    showNotification(type, title, message, duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `n3-notification n3-notification--${type}`;
        notification.innerHTML = `
            <div class="n3-notification__icon">${this.getNotificationIcon(type)}</div>
            <div class="n3-notification__content">
                <div class="n3-notification__title">${title}</div>
                <div class="n3-notification__message">${message}</div>
            </div>
            <button class="n3-notification__close">&times;</button>
        `;
        
        // 閉じるボタンイベント
        notification.querySelector('.n3-notification__close').addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        this.notificationContainer.appendChild(notification);
        
        // アニメーション
        requestAnimationFrame(() => {
            notification.classList.add('n3-notification--show');
        });
        
        // 自動削除
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }
        
        return notification;
    }
    
    removeNotification(notification) {
        notification.classList.remove('n3-notification--show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    getNotificationIcon(type) {
        const icons = {
            'success': '✅',
            'warning': '⚠️',
            'error': '❌',
            'info': 'ℹ️',
            'order': '📦',
            'stock': '📊',
            'price': '💰',
            'delivery': '🚚'
        };
        return icons[type] || 'ℹ️';
    }
    
    showConnectionStatus(isConnected) {
        const statusElement = document.querySelector('.connection-status');
        if (statusElement) {
            statusElement.className = `connection-status connection-status--${isConnected ? 'connected' : 'disconnected'}`;
            statusElement.textContent = isConnected ? '接続中' : '切断';
        }
        
        if (!isConnected) {
            this.showNotification('warning', '接続切断', 'サーバーとの接続が切断されました。再接続を試行中...', 3000);
        }
    }
    
    showNewOrdersNotification(count) {
        this.showNotification('order', '新規受注', `${count}件の新しい注文があります`, 4000);
    }
    
    showCriticalStockAlert(criticalItems) {
        this.showNotification(
            'warning', 
            '在庫切れ警告', 
            `${criticalItems.length}商品の在庫が切れています`, 
            8000
        );
    }
    
    showBuyOpportunityAlert(opportunities) {
        this.showNotification(
            'price', 
            '仕入れ機会', 
            `${opportunities.length}商品で価格下落を検出しました`, 
            6000
        );
    }
    
    showDeliveryCompletedNotification(count) {
        this.showNotification('delivery', '配送完了', `${count}件の配送が完了しました`, 4000);
    }
    
    showSystemHealthWarning(healthData) {
        this.showNotification(
            'error', 
            'システム警告', 
            `システム状態: ${healthData.status}`, 
            10000
        );
    }
    
    showOfflineNotification() {
        this.showNotification('warning', 'オフライン', 'ネットワーク接続を確認してください', 0);
    }
    
    showMaxReconnectError() {
        this.showNotification(
            'error', 
            '接続エラー', 
            '最大再接続試行回数に達しました。ページを再読み込みしてください。', 
            0
        );
    }
    
    showErrorNotification(message) {
        this.showNotification('error', 'エラー', message, 5000);
    }
    
    showDesktopNotification(title, message) {
        if (this.desktopNotificationEnabled && document.hidden) {
            new Notification(title, {
                body: message,
                icon: '/favicon.ico',
                tag: 'nagano3-notification'
            });
        }
    }
}

// グローバルインスタンス作成
window.n3RealTimeManager = new N3RealTimeManager();

// 他のマネージャーからアクセス可能にする
window.N3RealTime = {
    subscribe: (eventType, callback) => window.n3RealTimeManager.subscribe(eventType, callback),
    unsubscribe: (eventType, callback) => window.n3RealTimeManager.unsubscribe(eventType, callback),
    sendMessage: (message) => window.n3RealTimeManager.sendMessage(message),
    requestSync: (syncType) => window.n3RealTimeManager.requestSync(syncType),
    updateOrderStatus: (orderId, status) => window.n3RealTimeManager.updateOrderStatus(orderId, status)
};

console.log('🎯 N3 リアルタイム通信システム初期化完了');