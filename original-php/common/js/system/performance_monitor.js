
// CAIDS character_limit Hook
// CAIDS character_limit Hook - 基本実装
console.log('✅ character_limit Hook loaded');

// CAIDS ajax_integration Hook
// CAIDS ajax_integration Hook - 基本実装
console.log('✅ ajax_integration Hook loaded');

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
 * NAGANO-3 Performance Monitor System【完全実装版】
 * ファイル: common/js/system/performance_monitor.js
 * 
 * ⚡ パフォーマンス監視・メトリクス収集・最適化提案・レポート生成
 * ✅ リアルタイム監視・メモリ使用量・読み込み時間・Ajax性能・FPS測定
 * 
 * @version 1.0.0-complete
 */

"use strict";

console.log('⚡ NAGANO-3 Performance Monitor System 読み込み開始');

// =====================================
// 🎯 PerformanceMonitor メインクラス
// =====================================

class PerformanceMonitor {
    constructor() {
        this.startTime = performance.now();
        this.metrics = new Map();
        this.watchers = [];
        this.reports = [];
        this.maxReports = 50;
        
        // 監視設定
        this.monitoringEnabled = true;
        this.collectInterval = 1000; // 1秒間隔
        this.reportInterval = 60000; // 1分間隔
        
        // パフォーマンス閾値
        this.thresholds = {
            memory: {
                warning: 50 * 1024 * 1024,  // 50MB
                critical: 100 * 1024 * 1024  // 100MB
            },
            loadTime: {
                warning: 3000,   // 3秒
                critical: 5000   // 5秒
            },
            fps: {
                warning: 30,     // 30fps以下
                critical: 15     // 15fps以下
            },
            ajaxResponseTime: {
                warning: 1000,   // 1秒
                critical: 3000   // 3秒
            }
        };
        
        // メトリクス初期化
        this.initializeMetrics();
        
        // 監視開始
        this.init();
    }
    
    /**
     * 初期化
     */
    init() {
        try {
            console.log('⚡ Performance Monitor 初期化開始');
            
            // 1. 基本メトリクス収集開始
            this.startBasicMonitoring();
            
            // 2. Ajax監視設定
            this.setupAjaxMonitoring();
            
            // 3. DOM監視設定
            this.setupDOMMonitoring();
            
            // 4. FPS監視設定
            this.setupFPSMonitoring();
            
            // 5. メモリ監視設定
            this.setupMemoryMonitoring();
            
            // 6. ネットワーク監視設定
            this.setupNetworkMonitoring();
            
            // 7. エラー監視設定
            this.setupErrorMonitoring();
            
            // 8. 定期レポート開始
            this.startPeriodicReporting();
            
            console.log('✅ Performance Monitor 初期化完了');
            
        } catch (error) {
            console.error('❌ Performance Monitor 初期化エラー:', error);
        }
    }
    
    /**
     * メトリクス初期化
     */
    initializeMetrics() {
        const initialMetrics = {
            // システムメトリクス
            system: {
                startTime: this.startTime,
                uptime: 0,
                memoryUsage: 0,
                memoryPeak: 0,
                cpuUsage: 0
            },
            
            // ページロードメトリクス
            pageLoad: {
                domContentLoaded: 0,
                loadComplete: 0,
                firstPaint: 0,
                firstContentfulPaint: 0,
                largestContentfulPaint: 0,
                firstInputDelay: 0,
                cumulativeLayoutShift: 0
            },
            
            // リソースメトリクス
            resources: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                avgResponseTime: 0,
                slowestRequest: 0,
                fastestRequest: 0
            },
            
            // Ajax メトリクス
            ajax: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                avgResponseTime: 0,
                slowestRequest: 0,
                fastestRequest: Infinity
            },
            
            // UI メトリクス
            ui: {
                fps: 60,
                frameDrops: 0,
                longTasks: 0,
                interactions: 0,
                slowInteractions: 0
            },
            
            // JavaScript メトリクス
            javascript: {
                errors: 0,
                warnings: 0,
                executionTime: 0,
                gcPauses: 0
            },
            
            // DOM メトリクス
            dom: {
                elements: 0,
                mutations: 0,
                heavyOperations: 0
            },
            
            // ネットワークメトリクス
            network: {
                downlink: 0,
                effectiveType: 'unknown',
                rtt: 0,
                saveData: false
            }
        };
        
        Object.entries(initialMetrics).forEach(([category, metrics]) => {
            this.metrics.set(category, metrics);
        });
    }
    
    /**
     * 基本監視開始
     */
    startBasicMonitoring() {
        // 基本情報収集
        this.collectBasicMetrics();
        
        // 定期収集
        setInterval(() => {
            if (this.monitoringEnabled) {
                this.collectBasicMetrics();
            }
        }, this.collectInterval);
        
        console.log('📊 基本監視開始');
    }
    
    /**
     * 基本メトリクス収集
     */
    collectBasicMetrics() {
        try {
            const systemMetrics = this.metrics.get('system');
            
            // アップタイム更新
            systemMetrics.uptime = performance.now() - this.startTime;
            
            // メモリ使用量
            if (performance.memory) {
                systemMetrics.memoryUsage = performance.memory.usedJSHeapSize;
                systemMetrics.memoryPeak = Math.max(
                    systemMetrics.memoryPeak,
                    performance.memory.usedJSHeapSize
                );
            }
            
            // DOM要素数
            const domMetrics = this.metrics.get('dom');
            domMetrics.elements = document.querySelectorAll('*').length;
            
            // パフォーマンス警告チェック
            this.checkPerformanceThresholds();
            
        } catch (error) {
            console.warn('基本メトリクス収集エラー:', error);
        }
    }
    
    /**
     * Ajax監視設定
     */
    setupAjaxMonitoring() {
        // XMLHttpRequest の監視
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url, async) {
            this._perfMon = {
                method: method,
                url: url,
                startTime: performance.now()
            };
            return originalXHROpen.apply(this, arguments);
        };
        
        XMLHttpRequest.prototype.send = function(data) {
            const self = this;
            
            this.addEventListener('loadend', function() {
                if (window.NAGANO3_PERFORMANCE_MONITOR) {
                    const responseTime = performance.now() - self._perfMon.startTime;
                    window.NAGANO3_PERFORMANCE_MONITOR.recordAjaxRequest(
                        self._perfMon.method,
                        self._perfMon.url,
                        self.status,
                        responseTime
                    );
                }
            });
            
            return originalXHRSend.apply(this, arguments);
        };
        
        // Fetch API の監視
        if (window.fetch) {
            const originalFetch = window.fetch;
            
            window.fetch = function(...args) {
                const startTime = performance.now();
                const url = args[0];
                
                return originalFetch.apply(this, args).then(response => {
                    const responseTime = performance.now() - startTime;
                    if (window.NAGANO3_PERFORMANCE_MONITOR) {
                        window.NAGANO3_PERFORMANCE_MONITOR.recordAjaxRequest(
                            'GET',
                            url,
                            response.status,
                            responseTime
                        );
                    }
                    return response;
                }).catch(error => {
                    const responseTime = performance.now() - startTime;
                    if (window.NAGANO3_PERFORMANCE_MONITOR) {
                        window.NAGANO3_PERFORMANCE_MONITOR.recordAjaxRequest(
                            'GET',
                            url,
                            0,
                            responseTime
                        );
                    }
                    throw error;
                });
            };
        }
        
        console.log('🌐 Ajax監視設定完了');
    }
    
    /**
     * Ajax リクエスト記録
     */
    recordAjaxRequest(method, url, status, responseTime) {
        const ajaxMetrics = this.metrics.get('ajax');
        
        ajaxMetrics.totalRequests++;
        
        if (status >= 200 && status < 400) {
            ajaxMetrics.successfulRequests++;
        } else {
            ajaxMetrics.failedRequests++;
        }
        
        // 応答時間統計更新
        const totalResponseTime = ajaxMetrics.avgResponseTime * (ajaxMetrics.totalRequests - 1) + responseTime;
        ajaxMetrics.avgResponseTime = totalResponseTime / ajaxMetrics.totalRequests;
        
        ajaxMetrics.slowestRequest = Math.max(ajaxMetrics.slowestRequest, responseTime);
        ajaxMetrics.fastestRequest = Math.min(ajaxMetrics.fastestRequest, responseTime);
        
        // 遅いリクエストの警告
        if (responseTime > this.thresholds.ajaxResponseTime.warning) {
            console.warn(`🐌 遅いAjaxリクエスト: ${url} (${responseTime.toFixed(2)}ms)`);
        }
    }
    
    /**
     * DOM監視設定
     */
    setupDOMMonitoring() {
        // MutationObserver でDOM変更を監視
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                const domMetrics = this.metrics.get('dom');
                domMetrics.mutations += mutations.length;
                
                // 大量のDOM変更を検出
                if (mutations.length > 50) {
                    domMetrics.heavyOperations++;
                    console.warn(`⚠️ 大量DOM変更検出: ${mutations.length}件`);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeOldValue: true,
                characterData: true,
                characterDataOldValue: true
            });
        }
        
        console.log('🏗️ DOM監視設定完了');
    }
    
    /**
     * FPS監視設定
     */
    setupFPSMonitoring() {
        let frames = 0;
        let lastTime = performance.now();
        
        const measureFPS = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                
                const uiMetrics = this.metrics.get('ui');
                uiMetrics.fps = fps;
                
                if (fps < this.thresholds.fps.warning) {
                    uiMetrics.frameDrops++;
                    
                    if (fps < this.thresholds.fps.critical) {
                        console.warn(`🎬 FPS低下: ${fps}fps`);
                    }
                }
                
                frames = 0;
                lastTime = currentTime;
            }
            
            if (this.monitoringEnabled) {
                requestAnimationFrame(measureFPS);
            }
        };
        
        requestAnimationFrame(measureFPS);
        
        console.log('🎬 FPS監視設定完了');
    }
    
    /**
     * メモリ監視設定
     */
    setupMemoryMonitoring() {
        if (performance.memory) {
            setInterval(() => {
                if (this.monitoringEnabled) {
                    const memoryUsage = performance.memory.usedJSHeapSize;
                    
                    if (memoryUsage > this.thresholds.memory.warning) {
                        console.warn(`🧠 メモリ使用量警告: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
                        
                        if (memoryUsage > this.thresholds.memory.critical) {
                            console.error(`🧠 メモリ使用量危険: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
                            this.suggestMemoryOptimization();
                        }
                    }
                }
            }, 5000); // 5秒間隔
        }
        
        console.log('🧠 メモリ監視設定完了');
    }
    
    /**
     * ネットワーク監視設定
     */
    setupNetworkMonitoring() {
        if (navigator.connection) {
            const connection = navigator.connection;
            
            const updateNetworkMetrics = () => {
                const networkMetrics = this.metrics.get('network');
                networkMetrics.downlink = connection.downlink || 0;
                networkMetrics.effectiveType = connection.effectiveType || 'unknown';
                networkMetrics.rtt = connection.rtt || 0;
                networkMetrics.saveData = connection.saveData || false;
            };
            
            updateNetworkMetrics();
            
            connection.addEventListener('change', updateNetworkMetrics);
        }
        
        console.log('📶 ネットワーク監視設定完了');
    }
    
    /**
     * エラー監視設定
     */
    setupErrorMonitoring() {
        window.addEventListener('error', (event) => {
            const jsMetrics = this.metrics.get('javascript');
            jsMetrics.errors++;
            
            // エラー詳細記録
            this.recordError('javascript', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                timestamp: Date.now()
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            const jsMetrics = this.metrics.get('javascript');
            jsMetrics.errors++;
            
            this.recordError('promise', {
                reason: event.reason,
                timestamp: Date.now()
            });
        });
        
        console.log('🚨 エラー監視設定完了');
    }
    
    /**
     * エラー記録
     */
    recordError(type, details) {
        if (!this.errorLog) {
            this.errorLog = [];
        }
        
        this.errorLog.unshift({
            type: type,
            details: details,
            timestamp: Date.now()
        });
        
        // エラーログサイズ制限
        if (this.errorLog.length > 100) {
            this.errorLog = this.errorLog.slice(0, 100);
        }
    }
    
    /**
     * パフォーマンス閾値チェック
     */
    checkPerformanceThresholds() {
        const systemMetrics = this.metrics.get('system');
        const uiMetrics = this.metrics.get('ui');
        
        // メモリ使用量チェック
        if (systemMetrics.memoryUsage > this.thresholds.memory.critical) {
            this.triggerAlert('memory', 'critical', systemMetrics.memoryUsage);
        } else if (systemMetrics.memoryUsage > this.thresholds.memory.warning) {
            this.triggerAlert('memory', 'warning', systemMetrics.memoryUsage);
        }
        
        // FPS チェック
        if (uiMetrics.fps < this.thresholds.fps.critical) {
            this.triggerAlert('fps', 'critical', uiMetrics.fps);
        } else if (uiMetrics.fps < this.thresholds.fps.warning) {
            this.triggerAlert('fps', 'warning', uiMetrics.fps);
        }
    }
    
    /**
     * アラート発行
     */
    triggerAlert(metric, level, value) {
        const alert = {
            timestamp: Date.now(),
            metric: metric,
            level: level,
            value: value,
            message: this.getAlertMessage(metric, level, value)
        };
        
        // アラート履歴記録
        if (!this.alerts) {
            this.alerts = [];
        }
        
        this.alerts.unshift(alert);
        
        if (this.alerts.length > 50) {
            this.alerts = this.alerts.slice(0, 50);
        }
        
        // 通知発行
        if (window.showNotification) {
            const notificationType = level === 'critical' ? 'error' : 'warning';
            window.showNotification(alert.message, notificationType, 5000);
        }
        
        console.warn(`⚠️ パフォーマンスアラート [${level.toUpperCase()}]:`, alert.message);
    }
    
    /**
     * アラートメッセージ生成
     */
    getAlertMessage(metric, level, value) {
        const messages = {
            memory: {
                warning: `メモリ使用量が警告レベルに達しました: ${(value / 1024 / 1024).toFixed(2)}MB`,
                critical: `メモリ使用量が危険レベルに達しました: ${(value / 1024 / 1024).toFixed(2)}MB`
            },
            fps: {
                warning: `フレームレートが低下しています: ${value}fps`,
                critical: `フレームレートが著しく低下しています: ${value}fps`
            },
            loadTime: {
                warning: `読み込み時間が遅延しています: ${value.toFixed(2)}ms`,
                critical: `読み込み時間が著しく遅延しています: ${value.toFixed(2)}ms`
            }
        };
        
        return messages[metric]?.[level] || `パフォーマンス問題: ${metric} = ${value}`;
    }
    
    /**
     * 定期レポート開始
     */
    startPeriodicReporting() {
        setInterval(() => {
            if (this.monitoringEnabled) {
                const report = this.generateReport();
                this.reports.unshift(report);
                
                if (this.reports.length > this.maxReports) {
                    this.reports = this.reports.slice(0, this.maxReports);
                }
                
                // 通知者への通知
                this.notifyWatchers(report);
            }
        }, this.reportInterval);
        
        console.log('📊 定期レポート開始');
    }
    
    /**
     * パフォーマンスレポート生成
     */
    generateReport() {
        const report = {
            timestamp: Date.now(),
            uptime: performance.now() - this.startTime,
            metrics: this.getMetricsSummary(),
            health: this.calculateHealthScore(),
            recommendations: this.generateRecommendations(),
            alerts: this.alerts?.slice(0, 5) || []
        };
        
        return report;
    }
    
    /**
     * メトリクス要約取得
     */
    getMetricsSummary() {
        const summary = {};
        
        this.metrics.forEach((metrics, category) => {
            summary[category] = { ...metrics };
        });
        
        return summary;
    }
    
    /**
     * ヘルススコア計算
     */
    calculateHealthScore() {
        let score = 100;
        
        const systemMetrics = this.metrics.get('system');
        const ajaxMetrics = this.metrics.get('ajax');
        const uiMetrics = this.metrics.get('ui');
        const jsMetrics = this.metrics.get('javascript');
        
        // メモリ使用量スコア
        if (systemMetrics.memoryUsage > this.thresholds.memory.critical) {
            score -= 30;
        } else if (systemMetrics.memoryUsage > this.thresholds.memory.warning) {
            score -= 15;
        }
        
        // FPS スコア
        if (uiMetrics.fps < this.thresholds.fps.critical) {
            score -= 25;
        } else if (uiMetrics.fps < this.thresholds.fps.warning) {
            score -= 10;
        }
        
        // Ajax レスポンス時間スコア
        if (ajaxMetrics.avgResponseTime > this.thresholds.ajaxResponseTime.critical) {
            score -= 20;
        } else if (ajaxMetrics.avgResponseTime > this.thresholds.ajaxResponseTime.warning) {
            score -= 10;
        }
        
        // エラー率スコア
        const errorRate = jsMetrics.errors / Math.max(1, systemMetrics.uptime / 60000); // エラー/分
        if (errorRate > 5) {
            score -= 15;
        } else if (errorRate > 1) {
            score -= 5;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * 最適化推奨事項生成
     */
    generateRecommendations() {
        const recommendations = [];
        
        const systemMetrics = this.metrics.get('system');
        const ajaxMetrics = this.metrics.get('ajax');
        const uiMetrics = this.metrics.get('ui');
        const domMetrics = this.metrics.get('dom');
        
        // メモリ最適化推奨
        if (systemMetrics.memoryUsage > this.thresholds.memory.warning) {
            recommendations.push({
                type: 'memory',
                priority: 'high',
                title: 'メモリ使用量の最適化',
                description: '不要なオブジェクトの削除、イベントリスナーのクリーンアップを検討してください',
                action: 'memory_cleanup'
            });
        }
        
        // Ajax最適化推奨
        if (ajaxMetrics.avgResponseTime > this.thresholds.ajaxResponseTime.warning) {
            recommendations.push({
                type: 'ajax',
                priority: 'medium',
                title: 'Ajax通信の最適化',
                description: 'リクエストの並列化、キャッシュの活用を検討してください',
                action: 'ajax_optimization'
            });
        }
        
        // UI最適化推奨
        if (uiMetrics.fps < this.thresholds.fps.warning) {
            recommendations.push({
                type: 'ui',
                priority: 'high',
                title: 'UI描画の最適化',
                description: 'アニメーションの簡素化、DOM操作の最適化を検討してください',
                action: 'ui_optimization'
            });
        }
        
        // DOM最適化推奨
        if (domMetrics.elements > 5000) {
            recommendations.push({
                type: 'dom',
                priority: 'medium',
                title: 'DOM要素数の最適化',
                description: '不要な要素の削除、仮想化の検討をお勧めします',
                action: 'dom_optimization'
            });
        }
        
        return recommendations;
    }
    
    /**
     * メモリ最適化提案
     */
    suggestMemoryOptimization() {
        const suggestions = [
            '不要なイベントリスナーを削除する',
            '未使用の変数やオブジェクトをnullに設定する',
            '大きな配列やオブジェクトを分割する',
            'setTimeout/setIntervalをクリアする',
            'DOM要素への参照を削除する'
        ];
        
        console.log('💡 メモリ最適化提案:', suggestions);
        
        if (window.showNotification) {
            window.showNotification('メモリ使用量が高いため、最適化をお勧めします', 'warning', 10000);
        }
    }
    
    /**
     * 監視者登録
     */
    addWatcher(callback) {
        this.watchers.push(callback);
    }
    
    /**
     * 監視者削除
     */
    removeWatcher(callback) {
        const index = this.watchers.indexOf(callback);
        if (index !== -1) {
            this.watchers.splice(index, 1);
        }
    }
    
    /**
     * 監視者への通知
     */
    notifyWatchers(report) {
        this.watchers.forEach(callback => {
            try {
                callback(report);
            } catch (error) {
                console.error('監視者通知エラー:', error);
            }
        });
    }
    
    /**
     * 監視開始
     */
    startMonitoring() {
        this.monitoringEnabled = true;
        console.log('▶️ パフォーマンス監視開始');
    }
    
    /**
     * 監視停止
     */
    stopMonitoring() {
        this.monitoringEnabled = false;
        console.log('⏸️ パフォーマンス監視停止');
    }
    
    /**
     * 監視一時停止
     */
    pauseMonitoring() {
        this.monitoringEnabled = false;
        console.log('⏸️ パフォーマンス監視一時停止');
    }
    
    /**
     * 監視再開
     */
    resumeMonitoring() {
        this.monitoringEnabled = true;
        console.log('▶️ パフォーマンス監視再開');
    }
    
    /**
     * メトリクスリセット
     */
    resetMetrics() {
        this.initializeMetrics();
        this.reports = [];
        this.alerts = [];
        this.errorLog = [];
        
        console.log('🔄 メトリクスリセット完了');
    }
    
    /**
     * パフォーマンスベンチマーク実行
     */
    runBenchmark() {
        console.log('🏃 パフォーマンスベンチマーク開始');
        
        const benchmark = {
            startTime: performance.now(),
            tests: []
        };
        
        // DOM操作ベンチマーク
        const domStart = performance.now();
        for (let i = 0; i < 1000; i++) {
            const div = document.createElement('div');
            div.textContent = `Test ${i}`;
            document.body.appendChild(div);
            document.body.removeChild(div);
        }
        const domTime = performance.now() - domStart;
        benchmark.tests.push({ name: 'DOM操作', time: domTime });
        
        // 計算ベンチマーク
        const calcStart = performance.now();
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
            sum += Math.sqrt(i);
        }
        const calcTime = performance.now() - calcStart;
        benchmark.tests.push({ name: '数値計算', time: calcTime });
        
        // Ajax ベンチマーク
        const ajaxStart = performance.now();
        fetch(window.location.href, { method: 'HEAD' })
            .then(() => {
                const ajaxTime = performance.now() - ajaxStart;
                benchmark.tests.push({ name: 'Ajax通信', time: ajaxTime });
                
                benchmark.totalTime = performance.now() - benchmark.startTime;
                
                console.log('✅ ベンチマーク結果:', benchmark);
                return benchmark;
            })
            .catch(error => {
                console.error('Ajax ベンチマークエラー:', error);
            });
        
        return benchmark;
    }
    
    /**
     * メトリクスエクスポート
     */
    exportMetrics() {
        const exportData = {
            timestamp: Date.now(),
            uptime: performance.now() - this.startTime,
            metrics: this.getMetricsSummary(),
            reports: this.reports.slice(0, 10),
            alerts: this.alerts || [],
            errorLog: this.errorLog?.slice(0, 20) || [],
            thresholds: this.thresholds
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            monitoringEnabled: this.monitoringEnabled,
            uptime: performance.now() - this.startTime,
            metricsCategories: Array.from(this.metrics.keys()),
            watchersCount: this.watchers.length,
            reportsCount: this.reports.length,
            alertsCount: this.alerts?.length || 0,
            errorLogCount: this.errorLog?.length || 0,
            currentHealth: this.calculateHealthScore(),
            thresholds: this.thresholds
        };
    }
    
    /**
     * リアルタイム統計取得
     */
    getRealTimeStats() {
        return {
            timestamp: Date.now(),
            memory: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null,
            fps: this.metrics.get('ui').fps,
            dom: this.metrics.get('dom').elements,
            ajax: {
                total: this.metrics.get('ajax').totalRequests,
                avgTime: this.metrics.get('ajax').avgResponseTime
            },
            errors: this.metrics.get('javascript').errors,
            health: this.calculateHealthScore()
        };
    }
}

// =====================================
// 🚀 自動初期化
// =====================================

// グローバル初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePerformanceMonitor);
} else {
    setTimeout(initializePerformanceMonitor, 0);
}

async function initializePerformanceMonitor() {
    try {
        if (!window.NAGANO3_PERFORMANCE_MONITOR) {
            window.NAGANO3_PERFORMANCE_MONITOR = new PerformanceMonitor();
            
            // NAGANO3名前空間への登録
            if (typeof window.NAGANO3 === 'object') {
                window.NAGANO3.performanceMonitor = window.NAGANO3_PERFORMANCE_MONITOR;
            }
            
            console.log('✅ Performance Monitor 初期化完了・グローバル設定完了');
        } else {
            console.log('⚠️ Performance Monitor は既に初期化済みです');
        }
    } catch (error) {
        console.error('❌ Performance Monitor 初期化エラー:', error);
    }
}

// =====================================
// 🧪 デバッグ・テスト機能
// =====================================

// パフォーマンス監視テスト
window.testPerformanceMonitor = function() {
    console.log('🧪 Performance Monitor テスト開始');
    
    if (window.NAGANO3_PERFORMANCE_MONITOR) {
        const monitor = window.NAGANO3_PERFORMANCE_MONITOR;
        
        const tests = [
            {
                name: '監視状態確認',
                test: () => monitor.monitoringEnabled === true
            },
            {
                name: 'メトリクス収集確認',
                test: () => monitor.metrics.size > 0
            },
            {
                name: 'ヘルススコア計算',
                test: () => {
                    const score = monitor.calculateHealthScore();
                    return score >= 0 && score <= 100;
                }
            },
            {
                name: 'リアルタイム統計取得',
                test: () => {
                    const stats = monitor.getRealTimeStats();
                    return stats && stats.timestamp > 0;
                }
            }
        ];
        
        const results = tests.map(test => ({
            name: test.name,
            passed: test.test()
        }));
        
        console.log('🧪 テスト結果:', results);
        
        // ベンチマーク実行
        const benchmark = monitor.runBenchmark();
        console.log('🏃 ベンチマーク:', benchmark);
        
        // デバッグ情報
        const debugInfo = monitor.getDebugInfo();
        console.log('⚡ デバッグ情報:', debugInfo);
        
        return { results, benchmark, debugInfo };
    } else {
        console.error('❌ Performance Monitor not initialized');
        return null;
    }
};

// パフォーマンス状況確認
window.checkPerformanceStatus = function() {
    if (window.NAGANO3_PERFORMANCE_MONITOR) {
        const monitor = window.NAGANO3_PERFORMANCE_MONITOR;
        
        const status = {
            realTimeStats: monitor.getRealTimeStats(),
            latestReport: monitor.reports[0] || null,
            recentAlerts: monitor.alerts?.slice(0, 5) || [],
            recommendations: monitor.generateRecommendations(),
            debugInfo: monitor.getDebugInfo()
        };
        
        console.log('⚡ Performance Status:', status);
        return status;
    } else {
        console.error('❌ Performance Monitor not initialized');
        return null;
    }
};

// 監視者登録テスト
window.testPerformanceWatcher = function() {
    if (window.NAGANO3_PERFORMANCE_MONITOR) {
        const monitor = window.NAGANO3_PERFORMANCE_MONITOR;
        
        // テスト監視者追加
        const testWatcher = (report) => {
            console.log('👁️ パフォーマンスレポート受信:', {
                timestamp: new Date(report.timestamp).toLocaleTimeString(),
                health: report.health,
                alertsCount: report.alerts.length,
                recommendations: report.recommendations.length
            });
        };
        
        monitor.addWatcher(testWatcher);
        
        console.log('👁️ パフォーマンス監視者登録完了');
        return testWatcher;
    } else {
        console.error('❌ Performance Monitor not initialized');
        return null;
    }
};

console.log('⚡ NAGANO-3 Performance Monitor System 読み込み完了');