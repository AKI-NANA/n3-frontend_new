
// CAIDS timeout_management Hook
// CAIDS timeout_management Hook - 基本実装
console.log('✅ timeout_management Hook loaded');

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
 * NAGANO-3 統合デバッグダッシュボード（最終強化版）
 * ファイル: common/js/modules/debug_dashboard.js
 * 
 * 🎯 重複宣言完全防止・Supreme Guardian連携
 * ✅ 高度なデバッグ機能・システム監視・パフォーマンス分析
 */

"use strict";

console.log('🔍 デバッグダッシュボード読み込み開始');

// ===== Supreme Guardian連携重複防止 =====
const DEBUG_REGISTRY_RESULT = window.NAGANO3_SUPREME_GUARDIAN?.registry.safeRegisterFile('debug_dashboard.js');

if (!DEBUG_REGISTRY_RESULT?.success) {
    console.warn('⚠️ デバッグダッシュボードファイル重複読み込み防止:', DEBUG_REGISTRY_RESULT?.reason);
} else {
    // ===== デバッグダッシュボードシステム（Supreme Guardian連携） =====
    const debugDashboardSystem = {
        version: '5.0.0-ultimate',
        initialized: false,
        
        // 設定
        config: {
            ajaxTimeout: 30000,
            logMaxEntries: 100,
            autoRefreshInterval: 30000,
            enablePerformanceMonitoring: true,
            enableMemoryMonitoring: true,
            enableNetworkMonitoring: true,
            debug: window.NAGANO3_SUPREME_GUARDIAN?.debug?.enabled || false
        },
        
        // 状態管理
        state: {
            scanning: false,
            selectedCores: [],
            scanResults: null,
            logEntries: [],
            statistics: {},
            performanceMetrics: {
                pageLoadTime: 0,
                domContentLoadedTime: 0,
                ajaxRequests: [],
                memoryUsage: [],
                errorCount: 0
            },
            realTimeData: {
                cpu: 0,
                memory: 0,
                network: 0,
                errors: 0
            }
        },
        
        // モニタリングシステム
        monitoring: {
            observers: new Map(),
            intervals: new Map(),
            
            /**
             * パフォーマンス監視開始
             */
            startPerformanceMonitoring() {
                if (!debugDashboardSystem.config.enablePerformanceMonitoring) return;
                
                // ページロード時間計測
                if (window.performance && window.performance.timing) {
                    const timing = window.performance.timing;
                    debugDashboardSystem.state.performanceMetrics.pageLoadTime = 
                        timing.loadEventEnd - timing.navigationStart;
                    debugDashboardSystem.state.performanceMetrics.domContentLoadedTime = 
                        timing.domContentLoaded - timing.navigationStart;
                }
                
                // Navigation API監視
                if ('PerformanceObserver' in window) {
                    const perfObserver = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            this.processPerfEntry(entry);
                        }
                    });
                    
                    perfObserver.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
                    this.observers.set('performance', perfObserver);
                }
                
                // メモリ監視
                if (window.performance.memory) {
                    this.startMemoryMonitoring();
                }
                
                console.log('📊 パフォーマンス監視開始');
            },
            
            /**
             * メモリ監視開始
             */
            startMemoryMonitoring() {
                const memoryInterval = setInterval(() => {
                    if (window.performance.memory) {
                        const memory = {
                            used: window.performance.memory.usedJSHeapSize,
                            total: window.performance.memory.totalJSHeapSize,
                            limit: window.performance.memory.jsHeapSizeLimit,
                            timestamp: Date.now()
                        };
                        
                        debugDashboardSystem.state.performanceMetrics.memoryUsage.push(memory);
                        
                        // 最新100件のみ保持
                        if (debugDashboardSystem.state.performanceMetrics.memoryUsage.length > 100) {
                            debugDashboardSystem.state.performanceMetrics.memoryUsage = 
                                debugDashboardSystem.state.performanceMetrics.memoryUsage.slice(-100);
                        }
                        
                        // リアルタイムデータ更新
                        debugDashboardSystem.state.realTimeData.memory = 
                            Math.round((memory.used / memory.total) * 100);
                    }
                }, 5000);
                
                this.intervals.set('memory', memoryInterval);
            },
            
            /**
             * ネットワーク監視開始
             */
            startNetworkMonitoring() {
                if (!debugDashboardSystem.config.enableNetworkMonitoring) return;
                
                // Fetch APIの監視
                const originalFetch = window.fetch;
                window.fetch = async function(...args) {
                    const startTime = performance.now();
                    
                    try {
                        const response = await originalFetch.apply(this, args);
                        const endTime = performance.now();
                        
                        debugDashboardSystem.state.performanceMetrics.ajaxRequests.push({
                            url: args[0],
                            method: args[1]?.method || 'GET',
                            status: response.status,
                            duration: endTime - startTime,
                            timestamp: Date.now(),
                            success: response.ok
                        });
                        
                        return response;
                    } catch (error) {
                        const endTime = performance.now();
                        
                        debugDashboardSystem.state.performanceMetrics.ajaxRequests.push({
                            url: args[0],
                            method: args[1]?.method || 'GET',
                            status: 0,
                            duration: endTime - startTime,
                            timestamp: Date.now(),
                            success: false,
                            error: error.message
                        });
                        
                        throw error;
                    }
                };
                
                console.log('🌐 ネットワーク監視開始');
            },
            
            /**
             * パフォーマンスエントリ処理
             */
            processPerfEntry(entry) {
                switch (entry.entryType) {
                    case 'navigation':
                        debugDashboardSystem.state.performanceMetrics.pageLoadTime = entry.loadEventEnd;
                        debugDashboardSystem.state.performanceMetrics.domContentLoadedTime = entry.domContentLoadedEventEnd;
                        break;
                        
                    case 'resource':
                        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
                            debugDashboardSystem.state.performanceMetrics.ajaxRequests.push({
                                url: entry.name,
                                duration: entry.duration,
                                size: entry.transferSize,
                                timestamp: Date.now()
                            });
                        }
                        break;
                }
            },
            
            /**
             * 監視停止
             */
            stopMonitoring() {
                this.observers.forEach(observer => observer.disconnect());
                this.intervals.forEach(interval => clearInterval(interval));
                this.observers.clear();
                this.intervals.clear();
                
                console.log('📊 監視停止');
            }
        },
        
        /**
         * システム初期化
         */
        init() {
            if (this.initialized) {
                console.warn('⚠️ デバッグダッシュボードは既に初期化済みです');
                return;
            }
            
            try {
                // グローバル設定取得
                this.config = { ...this.config, ...(window.NAGANO3_DEBUG_CONFIG || {}) };
                
                // イベントリスナー設定
                this.setupEventListeners();
                
                // 初期選択状態設定
                this.initializeCoreSelection();
                
                // UI初期化
                this.initializeUI();
                
                // 監視システム開始
                this.monitoring.startPerformanceMonitoring();
                this.monitoring.startNetworkMonitoring();
                
                // 自動更新設定
                this.setupAutoRefresh();
                
                this.initialized = true;
                console.log('🔍 デバッグダッシュボード初期化完了');
                
            } catch (error) {
                console.error('❌ デバッグダッシュボード初期化失敗:', error);
                
                // Supreme Guardianエラーハンドラー連携
                if (window.NAGANO3_SUPREME_GUARDIAN?.errorHandler) {
                    window.NAGANO3_SUPREME_GUARDIAN.errorHandler.handle(error, 'debug_dashboard_init');
                }
                
                throw error;
            }
        },
        
        /**
         * イベントリスナー設定
         */
        setupEventListeners() {
            // コアチェックボックス
            const checkboxes = document.querySelectorAll('.core-checkbox input');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    this.updateCoreSelection();
                    this.updateScanButton();
                });
            });
            
            // スキャンボタン
            const scanButton = document.getElementById('scan-button');
            if (scanButton) {
                scanButton.addEventListener('click', () => {
                    this.executeSystemScan();
                });
            }
            
            // エクスポートボタン
            const exportButton = document.getElementById('export-button');
            if (exportButton) {
                exportButton.addEventListener('click', () => {
                    this.exportDebugData();
                });
            }
            
            // リフレッシュボタン
            const refreshButton = document.getElementById('refresh-button');
            if (refreshButton) {
                refreshButton.addEventListener('click', () => {
                    this.refreshDashboard();
                });
            }
            
            // ページ離脱時の警告（スキャン中の場合）
            window.addEventListener('beforeunload', (e) => {
                if (this.state.scanning) {
                    e.preventDefault();
                    e.returnValue = 'システムスキャンが実行中です。本当にページを離れますか？';
                    return e.returnValue;
                }
            });
            
            console.log('🎮 イベントリスナー設定完了');
        },
        
        /**
         * コア選択初期化
         */
        initializeCoreSelection() {
            // デフォルトで全コアを選択
            const checkboxes = document.querySelectorAll('.core-checkbox input');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
                this.state.selectedCores.push(checkbox.value);
            });
            
            this.updateScanButton();
        },
        
        /**
         * UI初期化
         */
        initializeUI() {
            // リアルタイム統計表示
            this.updateRealtimeStats();
            
            // パフォーマンスメトリクス表示
            this.displayPerformanceMetrics();
            
            // システム情報表示
            this.displaySystemInfo();
        },
        
        /**
         * コア選択更新
         */
        updateCoreSelection() {
            this.state.selectedCores = [];
            const checkboxes = document.querySelectorAll('.core-checkbox input:checked');
            checkboxes.forEach(checkbox => {
                this.state.selectedCores.push(checkbox.value);
            });
            
            console.log('📋 選択コア更新:', this.state.selectedCores);
        },
        
        /**
         * スキャンボタン状態更新
         */
        updateScanButton() {
            const scanButton = document.getElementById('scan-button');
            if (!scanButton) return;
            
            const hasSelection = this.state.selectedCores.length > 0;
            scanButton.disabled = !hasSelection || this.state.scanning;
            
            if (this.state.scanning) {
                scanButton.textContent = 'スキャン中...';
                scanButton.classList.add('scanning');
            } else {
                scanButton.textContent = `選択コアをスキャン (${this.state.selectedCores.length}件)`;
                scanButton.classList.remove('scanning');
            }
        },
        
        /**
         * システムスキャン実行
         */
        async executeSystemScan() {
            if (this.state.scanning) {
                console.warn('⚠️ 既にスキャン実行中です');
                return;
            }
            
            if (this.state.selectedCores.length === 0) {
                if (window.showNotification) {
                    window.showNotification('スキャンするコアを選択してください', 'warning', 3000);
                }
                return;
            }
            
            this.state.scanning = true;
            this.updateScanButton();
            
            try {
                console.log('🔍 システムスキャン開始:', this.state.selectedCores);
                
                if (window.showNotification) {
                    window.showNotification('システムスキャンを開始しました', 'info', 2000);
                }
                
                // プログレス表示
                this.showScanProgress(0);
                
                const scanData = {
                    cores: this.state.selectedCores,
                    includeFiles: true,
                    includeModules: true,
                    includeStatistics: true,
                    timestamp: Date.now()
                };
                
                const result = await this.ajaxRequest('system_scan', scanData);
                
                if (result.success) {
                    this.state.scanResults = result.data;
                    this.displayScanResults(result.data);
                    this.log('システムスキャン完了', 'success');
                    
                    if (window.showNotification) {
                        window.showNotification('システムスキャンが完了しました', 'success', 3000);
                    }
                } else {
                    throw new Error(result.message || 'スキャン失敗');
                }
                
            } catch (error) {
                console.error('❌ システムスキャンエラー:', error);
                this.log(`スキャンエラー: ${error.message}`, 'error');
                
                if (window.showNotification) {
                    window.showNotification(`スキャンエラー: ${error.message}`, 'error', 5000);
                }
                
                // Supreme Guardianエラーハンドラー連携
                if (window.NAGANO3_SUPREME_GUARDIAN?.errorHandler) {
                    window.NAGANO3_SUPREME_GUARDIAN.errorHandler.handle(error, 'debug_scan');
                }
                
            } finally {
                this.state.scanning = false;
                this.updateScanButton();
                this.hideScanProgress();
            }
        },
        
        /**
         * Ajax通信
         */
        async ajaxRequest(action, data = {}) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.ajaxTimeout);
            
            try {
                const formData = new FormData();
                formData.append('debug_action', action);
                
                // データ追加
                Object.entries(data).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        value.forEach((item, index) => {
                            formData.append(`${key}[${index}]`, item);
                        });
                    } else {
                        formData.append(key, value);
                    }
                });
                
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const text = await response.text();
                
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error('JSONパースエラー:', text.substring(0, 500));
                    throw new Error('サーバーから無効なJSONレスポンスを受信しました');
                }
                
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    throw new Error('リクエストがタイムアウトしました');
                }
                
                throw error;
            }
        },
        
        /**
         * スキャンプログレス表示
         */
        showScanProgress(percent) {
            let progressContainer = document.getElementById('scan-progress');
            if (!progressContainer) {
                progressContainer = document.createElement('div');
                progressContainer.id = 'scan-progress';
                progressContainer.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                    z-index: 999999;
                    min-width: 300px;
                    text-align: center;
                `;
                
                progressContainer.innerHTML = `
                    <div style="margin-bottom: 1rem;">
                        <strong>システムスキャン実行中...</strong>
                    </div>
                    <div style="background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                        <div id="scan-progress-bar" style="
                            height: 20px;
                            background: linear-gradient(90deg, var(--color-primary, #007cba), var(--color-primary-70, rgba(0, 124, 186, 0.7)));
                            width: 0%;
                            transition: width 0.3s ease;
                            border-radius: 10px;
                        "></div>
                    </div>
                    <div id="scan-progress-text" style="margin-top: 0.5rem; font-size: 0.875rem; color: #666;">
                        0%
                    </div>
                `;
                
                document.body.appendChild(progressContainer);
            }
            
            const progressBar = document.getElementById('scan-progress-bar');
            const progressText = document.getElementById('scan-progress-text');
            
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (progressText) progressText.textContent = `${Math.round(percent)}%`;
        },
        
        /**
         * スキャンプログレス非表示
         */
        hideScanProgress() {
            const progressContainer = document.getElementById('scan-progress');
            if (progressContainer) {
                progressContainer.remove();
            }
        },
        
        /**
         * スキャン結果表示
         */
        displayScanResults(data) {
            if (data.directory_map) {
                this.displayDirectoryMap(data.directory_map);
            }
            
            if (data.complete_module_list) {
                this.displayCompleteModuleList(data.complete_module_list);
            }
            
            if (data.statistics) {
                this.updateStatistics(data.statistics);
            }
            
            this.log(`スキャン結果表示完了: ${Object.keys(data).length}項目`, 'info');
        },
        
        /**
         * ディレクトリマップ表示
         */
        displayDirectoryMap(directoryMap) {
            const container = document.getElementById('directory-map-container');
            if (!container || !directoryMap || directoryMap.length === 0) return;
            
            let mapHTML = '<div class="directory-map">';
            mapHTML += this.renderDirectoryTree(directoryMap);
            mapHTML += '</div>';
            
            container.innerHTML = mapHTML;
            console.log('📁 ディレクトリマップ表示完了');
        },
        
        /**
         * ディレクトリツリー描画
         */
        renderDirectoryTree(items, level = 0) {
            let html = '';
            
            items.forEach((item, index) => {
                const indent = '│   '.repeat(level);
                const isLast = index === items.length - 1;
                const connector = level === 0 ? '' : (isLast ? '└── ' : '├── ');
                
                html += `<div class="directory-item level-${level}">`;
                html += `<span class="directory-indent">${indent}${connector}</span>`;
                
                if (item.type === 'directory') {
                    html += `<span class="directory-folder">📁 ${item.name}</span>`;
                    if (item.children && item.children.length > 0) {
                        html += this.renderDirectoryTree(item.children, level + 1);
                    }
                } else {
                    const icon = this.getFileIcon(item.name);
                    html += `<span class="directory-file">${icon} ${item.name}</span>`;
                    if (item.size) {
                        html += ` <span class="file-size">(${this.formatFileSize(item.size)})</span>`;
                    }
                }
                
                html += '</div>';
            });
            
            return html;
        },
        
        /**
         * ファイルアイコン取得
         */
        getFileIcon(filename) {
            const extension = filename.split('.').pop()?.toLowerCase();
            const iconMap = {
                'js': '📜',
                'css': '🎨',
                'html': '📄',
                'php': '🐘',
                'json': '📋',
                'md': '📝',
                'txt': '📃',
                'jpg': '🖼️',
                'png': '🖼️',
                'gif': '🖼️',
                'pdf': '📕',
                'zip': '📦'
            };
            
            return iconMap[extension] || '📄';
        },
        
        /**
         * ファイルサイズフォーマット
         */
        formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        },
        
        /**
         * モジュール一覧表示
         */
        displayCompleteModuleList(moduleList) {
            const container = document.getElementById('module-list-container');
            if (!container || !moduleList) return;
            
            let html = '<div class="module-list">';
            
            Object.entries(moduleList).forEach(([coreName, modules]) => {
                html += `<div class="module-core">`;
                html += `<h3 class="module-core-title">${coreName}</h3>`;
                html += `<div class="module-items">`;
                
                modules.forEach(module => {
                    const statusClass = module.status === 'active' ? 'active' : 'inactive';
                    html += `
                        <div class="module-item ${statusClass}">
                            <div class="module-name">${module.name}</div>
                            <div class="module-status">${module.status}</div>
                            ${module.version ? `<div class="module-version">v${module.version}</div>` : ''}
                        </div>
                    `;
                });
                
                html += `</div></div>`;
            });
            
            html += '</div>';
            container.innerHTML = html;
            
            console.log('📦 モジュール一覧表示完了');
        },
        
        /**
         * 統計更新
         */
        updateStatistics(statistics) {
            this.state.statistics = { ...this.state.statistics, ...statistics };
            
            // 統計表示更新
            Object.entries(statistics).forEach(([key, value]) => {
                const element = document.getElementById(`stat-${key}`);
                if (element) {
                    element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
                }
            });
        },
        
        /**
         * リアルタイム統計更新
         */
        updateRealtimeStats() {
            // Supreme Guardian統計
            if (window.NAGANO3_SUPREME_GUARDIAN) {
                const guardian = window.NAGANO3_SUPREME_GUARDIAN;
                
                this.state.realTimeData = {
                    ...this.state.realTimeData,
                    loadedFiles: guardian.registry?.files?.size || 0,
                    registeredClasses: guardian.registry?.classes?.size || 0,
                    activeErrors: guardian.errorHandler?.errors?.length || 0,
                    cacheSize: guardian.loader?.loadHistory?.size || 0
                };
            }
            
            // メモリ使用量
            if (window.performance?.memory) {
                const memory = window.performance.memory;
                this.state.realTimeData.memory = Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);
            }
            
            // 画面表示更新
            this.displayRealtimeStats();
        },
        
        /**
         * リアルタイム統計表示
         */
        displayRealtimeStats() {
            const data = this.state.realTimeData;
            
            const stats = [
                { id: 'realtime-memory', value: `${data.memory}%`, label: 'メモリ使用率' },
                { id: 'realtime-files', value: data.loadedFiles, label: '読み込みファイル数' },
                { id: 'realtime-classes', value: data.registeredClasses, label: '登録クラス数' },
                { id: 'realtime-errors', value: data.activeErrors, label: 'エラー数' }
            ];
            
            stats.forEach(stat => {
                const element = document.getElementById(stat.id);
                if (element) {
                    element.textContent = stat.value;
                }
            });
        },
        
        /**
         * パフォーマンスメトリクス表示
         */
        displayPerformanceMetrics() {
            const metrics = this.state.performanceMetrics;
            
            // ページロード時間
            const loadTimeElement = document.getElementById('page-load-time');
            if (loadTimeElement && metrics.pageLoadTime) {
                loadTimeElement.textContent = `${Math.round(metrics.pageLoadTime)}ms`;
            }
            
            // DOM準備時間
            const domTimeElement = document.getElementById('dom-ready-time');
            if (domTimeElement && metrics.domContentLoadedTime) {
                domTimeElement.textContent = `${Math.round(metrics.domContentLoadedTime)}ms`;
            }
            
            // Ajax要求数
            const ajaxCountElement = document.getElementById('ajax-request-count');
            if (ajaxCountElement) {
                ajaxCountElement.textContent = metrics.ajaxRequests.length.toLocaleString();
            }
        },
        
        /**
         * システム情報表示
         */
        displaySystemInfo() {
            const systemInfo = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                hardwareConcurrency: navigator.hardwareConcurrency,
                maxTouchPoints: navigator.maxTouchPoints,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                screen: `${screen.width}x${screen.height}`,
                colorDepth: screen.colorDepth,
                pixelRatio: window.devicePixelRatio
            };
            
            const container = document.getElementById('system-info-container');
            if (container) {
                let html = '<div class="system-info-grid">';
                
                Object.entries(systemInfo).forEach(([key, value]) => {
                    html += `
                        <div class="system-info-item">
                            <div class="system-info-label">${this.formatSystemInfoLabel(key)}</div>
                            <div class="system-info-value">${value}</div>
                        </div>
                    `;
                });
                
                html += '</div>';
                container.innerHTML = html;
            }
        },
        
        /**
         * システム情報ラベルフォーマット
         */
        formatSystemInfoLabel(key) {
            const labelMap = {
                userAgent: 'ユーザーエージェント',
                platform: 'プラットフォーム',
                language: '言語',
                cookieEnabled: 'Cookie有効',
                onLine: 'オンライン状態',
                hardwareConcurrency: 'CPU論理コア数',
                maxTouchPoints: 'タッチポイント最大数',
                viewport: 'ビューポート',
                screen: 'スクリーン解像度',
                colorDepth: '色深度',
                pixelRatio: 'ピクセル比'
            };
            
            return labelMap[key] || key;
        },
        
        /**
         * 自動更新設定
         */
        setupAutoRefresh() {
            if (this.config.autoRefreshInterval > 0) {
                setInterval(() => {
                    this.updateRealtimeStats();
                    this.displayPerformanceMetrics();
                }, this.config.autoRefreshInterval);
                
                console.log(`🔄 自動更新設定完了 (${this.config.autoRefreshInterval}ms間隔)`);
            }
        },
        
        /**
         * ダッシュボードリフレッシュ
         */
        async refreshDashboard() {
            try {
                if (window.showNotification) {
                    window.showNotification('ダッシュボードを更新中...', 'info', 1000);
                }
                
                this.updateRealtimeStats();
                this.displayPerformanceMetrics();
                this.displaySystemInfo();
                
                // 最新統計データ取得
                const result = await this.ajaxRequest('get_latest_stats');
                if (result.success) {
                    this.updateStatistics(result.data);
                }
                
                if (window.showNotification) {
                    window.showNotification('ダッシュボード更新完了', 'success', 2000);
                }
                
            } catch (error) {
                console.error('❌ ダッシュボードリフレッシュエラー:', error);
                if (window.showNotification) {
                    window.showNotification('ダッシュボード更新に失敗しました', 'error', 3000);
                }
            }
        },
        
        /**
         * デバッグデータエクスポート
         */
        exportDebugData() {
            try {
                const exportData = {
                    timestamp: new Date().toISOString(),
                    version: this.version,
                    systemInfo: this.getSystemInfo(),
                    performanceMetrics: this.state.performanceMetrics,
                    scanResults: this.state.scanResults,
                    logEntries: this.state.logEntries,
                    realtimeData: this.state.realTimeData,
                    guardianInfo: window.NAGANO3_SUPREME_GUARDIAN?.debug?.getSystemInfo()
                };
                
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                    type: 'application/json' 
                });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `nagano3-debug-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                if (window.showNotification) {
                    window.showNotification('デバッグデータをエクスポートしました', 'success', 3000);
                }
                
            } catch (error) {
                console.error('❌ エクスポートエラー:', error);
                if (window.showNotification) {
                    window.showNotification('エクスポートに失敗しました', 'error', 3000);
                }
            }
        },
        
        /**
         * ログエントリ追加
         */
        log(message, level = 'info') {
            const logEntry = {
                timestamp: new Date().toISOString(),
                level: level,
                message: message
            };
            
            this.state.logEntries.push(logEntry);
            
            // 最大エントリ数制限
            if (this.state.logEntries.length > this.config.logMaxEntries) {
                this.state.logEntries = this.state.logEntries.slice(-this.config.logMaxEntries);
            }
            
            // ログ表示更新
            this.updateLogDisplay();
            
            console.log(`📋 [${level.toUpperCase()}] ${message}`);
        },
        
        /**
         * ログ表示更新
         */
        updateLogDisplay() {
            const logContainer = document.getElementById('log-container');
            if (!logContainer) return;
            
            const recentLogs = this.state.logEntries.slice(-10);
            
            let html = '<div class="log-entries">';
            recentLogs.forEach(entry => {
                html += `
                    <div class="log-entry log-${entry.level}">
                        <span class="log-timestamp">${new Date(entry.timestamp).toLocaleTimeString()}</span>
                        <span class="log-level">[${entry.level.toUpperCase()}]</span>
                        <span class="log-message">${entry.message}</span>
                    </div>
                `;
            });
            html += '</div>';
            
            logContainer.innerHTML = html;
            
            // 最新ログにスクロール
            logContainer.scrollTop = logContainer.scrollHeight;
        },
        
        /**
         * システム情報取得
         */
        getSystemInfo() {
            return {
                navigator: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    cookieEnabled: navigator.cookieEnabled,
                    onLine: navigator.onLine
                },
                screen: {
                    width: screen.width,
                    height: screen.height,
                    colorDepth: screen.colorDepth,
                    pixelRatio: window.devicePixelRatio
                },
                window: {
                    innerWidth: window.innerWidth,
                    innerHeight: window.innerHeight,
                    location: window.location.href
                },
                performance: window.performance?.memory ? {
                    usedJSHeapSize: window.performance.memory.usedJSHeapSize,
                    totalJSHeapSize: window.performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
                } : null
            };
        },
        
        /**
         * デバッグ情報取得
         */
        getDebugInfo() {
            return {
                version: this.version,
                initialized: this.initialized,
                config: this.config,
                state: {
                    scanning: this.state.scanning,
                    selectedCores: this.state.selectedCores,
                    logEntries: this.state.logEntries.length,
                    scanResults: !!this.state.scanResults
                },
                monitoring: {
                    observers: this.monitoring.observers.size,
                    intervals: this.monitoring.intervals.size,
                    performanceEntries: this.state.performanceMetrics.ajaxRequests.length
                }
            };
        }
    };

    // ===== NAGANO3名前空間に登録（Supreme Guardian連携） =====
    window.safeDefineNamespace('NAGANO3.debugDashboard', debugDashboardSystem, 'debug_dashboard');

    // ===== グローバル関数登録（後方互換性・上書き許可） =====
    const globalFunctions = {
        // システムスキャン
        executeSystemScan: () => debugDashboardSystem.executeSystemScan(),
        
        // ダッシュボード操作
        refreshDebugDashboard: () => debugDashboardSystem.refreshDashboard(),
        exportDebugData: () => debugDashboardSystem.exportDebugData(),
        
        // 統計更新
        updateDebugStats: () => debugDashboardSystem.updateRealtimeStats(),
        
        // ログ操作
        addDebugLog: (message, level) => debugDashboardSystem.log(message, level),
        clearDebugLogs: () => {
            debugDashboardSystem.state.logEntries = [];
            debugDashboardSystem.updateLogDisplay();
        },
        
        // 監視制御
        startPerformanceMonitoring: () => debugDashboardSystem.monitoring.startPerformanceMonitoring(),
        stopPerformanceMonitoring: () => debugDashboardSystem.monitoring.stopMonitoring(),
        
        // システム情報
        getDebugSystemInfo: () => debugDashboardSystem.getSystemInfo(),
        getDebugPerformanceMetrics: () => debugDashboardSystem.state.performanceMetrics
    };

    Object.entries(globalFunctions).forEach(([name, func]) => {
        window.safeDefineFunction(name, func, 'debug_dashboard', { allowOverwrite: true });
    });

    // ===== Supreme Guardian初期化キューに登録 =====
    if (window.NAGANO3_SUPREME_GUARDIAN?.initializer) {
        window.NAGANO3_SUPREME_GUARDIAN.initializer.register(
            'debug_dashboard',
            async () => {
                // ページタイプチェック
                const pageType = window.NAGANO3_SUPREME_GUARDIAN.initializer.detectPageType();
                if (pageType === 'debug') {
                    debugDashboardSystem.init();
                    console.log('✅ デバッグダッシュボード初期化完了（自動検出）');
                }
            },
            { priority: 6, required: false, dependencies: ['notifications'] }
        );
    } else {
        // フォールバック初期化
        const initializeDebug = () => {
            const isDebugPage = window.location.href.includes('debug') || 
                              document.body.classList.contains('debug-page') ||
                              document.body.dataset.page === 'debug';
            
            if (isDebugPage) {
                debugDashboardSystem.init();
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initializeDebug, 500);
            });
        } else {
            setTimeout(initializeDebug, 500);
        }
    }

    // ===== イベントリスナー（nagano3:ready） =====
    document.addEventListener('nagano3:ready', function(e) {
        if (e.detail.page === 'debug') {
            console.log('🚀 デバッグダッシュボード自動初期化開始（nagano3:ready）');
            if (!debugDashboardSystem.initialized) {
                debugDashboardSystem.init();
            }
        }
    });

    // ===== デバッグ機能（開発環境用） =====
    if (window.NAGANO3_SUPREME_GUARDIAN?.debug?.enabled) {
        window.safeDefineNamespace('NAGANO3_DEBUG_DASHBOARD_DEBUG', {
            info: () => debugDashboardSystem.getDebugInfo(),
            forceRefresh: () => debugDashboardSystem.refreshDashboard(),
            clearCache: () => {
                debugDashboardSystem.state.scanResults = null;
                debugDashboardSystem.state.logEntries = [];
                console.log('🗑️ デバッグダッシュボードキャッシュクリア完了');
            },
            simulatePerformanceIssue: () => {
                // パフォーマンス問題をシミュレート
                const startTime = performance.now();
                for (let i = 0; i < 1000000; i++) {
                    Math.random();
                }
                const endTime = performance.now();
                debugDashboardSystem.log(`パフォーマンステスト完了: ${endTime - startTime}ms`, 'warning');
            },
            testAjax: async () => {
                console.log('🧪 Ajax通信テスト開始');
                return await debugDashboardSystem.ajaxRequest('test_connection', {});
            },
            simulateError: () => {
                const error = new Error('テスト用エラー - デバッグダッシュボードエラーハンドリング確認');
                debugDashboardSystem.log(error.message, 'error');
                throw error;
            },
            generateTestData: () => {
                // テストデータ生成
                for (let i = 0; i < 10; i++) {
                    debugDashboardSystem.log(`テストログエントリ ${i + 1}`, ['info', 'warning', 'error'][Math.floor(Math.random() * 3)]);
                }
                console.log('📝 テストログデータ生成完了');
            },
            exportTestReport: () => {
                // テストレポート生成
                const testReport = {
                    timestamp: new Date().toISOString(),
                    guardianInfo: window.NAGANO3_SUPREME_GUARDIAN?.debug?.getSystemInfo(),
                    dashboardInfo: debugDashboardSystem.getDebugInfo(),
                    performanceMetrics: debugDashboardSystem.state.performanceMetrics,
                    testResults: {
                        initializationTime: Date.now() - (window.NAGANO3_SUPREME_GUARDIAN?.startTime || Date.now()),
                        memoryUsage: window.performance?.memory?.usedJSHeapSize || 0,
                        loadedFiles: window.NAGANO3_SUPREME_GUARDIAN?.registry?.files?.size || 0
                    }
                };
                
                console.log('📊 テストレポート:', testReport);
                return testReport;
            }
        }, 'debug-dashboard-debug');
    }

    console.log('🔍 NAGANO-3 debug_dashboard.js 読み込み完了（Supreme Guardian連携版）');
}

console.log('🔍 デバッグダッシュボードファイル処理完了');