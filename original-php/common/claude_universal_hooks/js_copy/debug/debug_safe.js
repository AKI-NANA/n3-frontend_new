
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
 * NAGANO-3 デバッグシステム 衝突回避JavaScript（正しい修正版）
 * common/js/debug_safe.js
 * 
 * 🎯 設計方針: 各PHPファイルが個別にAjax処理を持つ
 * 🛡️ 衝突回避: NAGANO3_DEBUG_SAFE 名前空間
 * 📡 通信先: debug_dashboard.phpの場合は同じページに送信
 */

"use strict";

// ===== 衝突回避ネームスペース =====
(function() {
    'use strict';
    
    // 既存の名前空間と衝突しないよう確認
    if (window.NAGANO3_DEBUG_SAFE) {
        console.warn('⚠️ NAGANO3_DEBUG_SAFE 既に存在 - 重複読み込み防止');
        return;
    }
    
    // デバッグシステム専用ネームスペース
    window.NAGANO3_DEBUG_SAFE = {
        version: '3.1.1-correct-fix',
        initialized: false,
        scanData: null,
        
        // ===== 初期化 =====
        init: function() {
            if (this.initialized) {
                console.log('✅ NAGANO3_DEBUG_SAFE 既に初期化済み');
                return;
            }
            
            console.log('🚀 NAGANO3_DEBUG_SAFE 初期化開始（正しい修正版）');
            
            // 現在ページの確認
            this.detectCurrentPage();
            
            // イベントリスナー設定
            this.setupEventListeners();
            
            // リンクハンドラー設定
            this.setupLinkHandlers();
            
            this.initialized = true;
            console.log('✅ NAGANO3_DEBUG_SAFE 初期化完了');
        },
        
        // ===== 現在ページ検出 =====
        detectCurrentPage: function() {
            const urlParams = new URLSearchParams(window.location.search);
            const currentPage = urlParams.get('page');
            
            this.currentPage = currentPage;
            this.isDebugDashboard = (currentPage === 'debug_dashboard');
            
            console.log('📍 現在ページ:', currentPage);
            console.log('🎯 デバッグダッシュボードページ:', this.isDebugDashboard);
            
            // 適切なエンドポイント設定
            if (this.isDebugDashboard) {
                this.ajaxEndpoint = window.location.href; // 同じページに送信
                console.log('📡 Ajax送信先: 同じページ（debug_dashboard.php内のAjax処理）');
            } else {
                this.ajaxEndpoint = '?page=debug_dashboard'; // debug_dashboardページに送信
                console.log('📡 Ajax送信先: debug_dashboardページ');
            }
        },
        
        // ===== 完全スキャン実行 =====
        performCompleteScan: async function() {
            console.log('🔍 4コア完全スキャン開始（正しい修正版）');
            
            try {
                // 選択されたコアを取得
                const selectedCores = this.getSelectedCores();
                
                if (selectedCores.length === 0) {
                    this.showNotification('スキャン対象のコアを選択してください', 'warning');
                    return;
                }
                
                // ローディング表示
                this.showLoading('スキャン実行中...');
                
                // Ajax通信でスキャン実行
                const response = await this.sendAjaxRequest('complete_scan', {
                    selected_cores: selectedCores
                });
                
                if (response.success) {
                    // スキャン結果を保存
                    this.scanData = response.data;
                    
                    // 結果表示
                    this.displayScanResults(response.data);
                    
                    // 統計更新
                    this.updateStatistics(response.data.statistics);
                    
                    // ログ追加
                    this.addLogEntry(`✅ スキャン完了: ${response.data.statistics.total_modules}モジュール検出`);
                    
                    this.showNotification('4コアスキャンが完了しました', 'success');
                } else {
                    throw new Error(response.message || 'スキャンエラー');
                }
                
            } catch (error) {
                console.error('❌ スキャンエラー:', error);
                this.addLogEntry(`❌ スキャンエラー: ${error.message}`);
                this.showNotification('スキャン中にエラーが発生しました', 'error');
            } finally {
                this.hideLoading();
            }
        },
        
        // ===== スキャンデータクリア =====
        clearScanData: async function() {
            console.log('🧹 スキャンデータクリア開始（正しい修正版）');
            
            try {
                // サーバー側クリア
                const response = await this.sendAjaxRequest('clear_scan_data');
                
                if (response.success) {
                    // ローカルデータクリア
                    this.scanData = null;
                    
                    // 表示エリアクリア
                    this.clearDisplayAreas();
                    
                    // 統計リセット
                    this.resetStatistics();
                    
                    // ログ追加
                    this.addLogEntry('🧹 スキャンデータをクリアしました');
                    
                    this.showNotification('スキャンデータがクリアされました', 'info');
                } else {
                    throw new Error(response.message || 'クリアエラー');
                }
                
            } catch (error) {
                console.error('❌ クリアエラー:', error);
                this.showNotification('クリア中にエラーが発生しました', 'error');
            }
        },
        
        // ===== 選択コア取得 =====
        getSelectedCores: function() {
            const selected = [];
            document.querySelectorAll('.core-checkbox input[type="checkbox"]:checked').forEach(cb => {
                selected.push(cb.value);
            });
            return selected;
        },
        
        // ===== Ajax通信（修正版・各PHP個別対応） =====
        sendAjaxRequest: async function(action, data = {}) {
            // フォームデータ準備
            const formData = new FormData();
            formData.append('debug_action', action);
            
            // データを追加
            Object.keys(data).forEach(key => {
                if (Array.isArray(data[key])) {
                    data[key].forEach((value, index) => {
                        formData.append(`${key}[]`, value);
                    });
                } else {
                    formData.append(key, data[key]);
                }
            });
            
            // ✅ 正しいエンドポイント決定（NAGANO3設計方針準拠）
            let endpoint = this.ajaxEndpoint;
            
            // デバッグ情報
            console.log('📡 Ajax送信情報:');
            console.log('  - Action:', action);
            console.log('  - Endpoint:', endpoint);
            console.log('  - Current Page:', this.currentPage);
            console.log('  - Is Debug Dashboard:', this.isDebugDashboard);
            console.log('  - Data:', data);
            
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                console.log('📡 Response status:', response.status);
                console.log('📡 Response URL:', response.url);
                
                if (response.status === 403) {
                    throw new Error(`HTTP Error: 403 - エンドポイント: ${endpoint}`);
                }
                
                if (response.status === 404) {
                    throw new Error(`HTTP Error: 404 - エンドポイント: ${endpoint}`);
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status} - エンドポイント: ${endpoint}`);
                }
                
                const result = await response.json();
                console.log('✅ Ajax成功:', result);
                
                // 処理されたファイルの確認
                if (result.data?.processed_by) {
                    console.log('🎯 処理ファイル:', result.data.processed_by);
                }
                
                return result;
                
            } catch (error) {
                console.error('❌ Ajax通信失敗:', error);
                console.error('🔗 失敗エンドポイント:', endpoint);
                throw error;
            }
        },
        
        // ===== スキャン結果表示 =====
        displayScanResults: function(scanData) {
            // ディレクトリマップ表示
            this.displayDirectoryMap(scanData.directory_map);
            
            // モジュール一覧表示
            this.displayModuleList(scanData.complete_module_list);
        },
        
        // ===== ディレクトリマップ表示 =====
        displayDirectoryMap: function(directoryMap) {
            const container = document.getElementById('directory-map-container');
            if (!container) return;
            
            let html = '<div class="directory-tree">';
            
            const renderTree = (items, level = 0) => {
                items.forEach(item => {
                    const indent = '　'.repeat(level);
                    const statusClass = `status-${item.status}`;
                    const iconColor = item.color ? `style="color: ${item.color}"` : '';
                    
                    html += `
                        <div class="tree-item ${statusClass}">
                            ${indent}<i class="${item.icon || 'fas fa-folder'}" ${iconColor}></i>
                            <span class="tree-name">${item.name}</span>
                        </div>
                    `;
                    
                    if (item.children && item.children.length > 0) {
                        renderTree(item.children, level + 1);
                    }
                });
            };
            
            renderTree(directoryMap);
            html += '</div>';
            
            container.innerHTML = html;
        },
        
        // ===== モジュール一覧表示 =====
        displayModuleList: function(moduleList) {
            const container = document.getElementById('modules-complete-list');
            if (!container) return;
            
            let html = '<div class="module-list">';
            
            moduleList.forEach(module => {
                const statusIcon = this.getStatusIcon(module.status);
                const statusClass = `module-${module.status}`;
                
                html += `
                    <div class="module-item ${statusClass}">
                        <div class="module-header">
                            <div class="module-title">
                                ${statusIcon} <strong>${module.name}</strong>
                                <span class="module-id">(${module.id})</span>
                            </div>
                            <div class="module-core">${module.core}</div>
                        </div>
                        <div class="module-links">
                `;
                
                // リンク表示
                module.links.forEach(link => {
                    const linkClass = link.status_class || '';
                    const target = link.target || '_self';
                    
                    html += `
                        <a href="${link.url}" 
                           target="${target}" 
                           class="module-link ${linkClass}"
                           data-module-link="true"
                           data-link-type="${link.type}"
                           title="${link.description}">
                            <i class="${link.icon}"></i> ${link.label}
                        </a>
                    `;
                });
                
                html += `
                        </div>
                        <div class="module-description">${module.core} / ${module.relative_path}</div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
        },
        
        // ===== ステータスアイコン取得 =====
        getStatusIcon: function(status) {
            const icons = {
                'complete': '✅',
                'partial': '🔧',
                'missing': '⚠️'
            };
            return icons[status] || '❓';
        },
        
        // ===== 統計更新 =====
        updateStatistics: function(stats) {
            Object.keys(stats).forEach(key => {
                const element = document.getElementById(key.replace('_', '-'));
                if (element) {
                    element.textContent = stats[key];
                }
            });
        },
        
        // ===== 統計リセット =====
        resetStatistics: function() {
            ['scanned-cores', 'total-directories', 'total-modules', 'existing-modules', 'missing-modules', 'total-links'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = '0';
                }
            });
        },
        
        // ===== 表示エリアクリア =====
        clearDisplayAreas: function() {
            const areas = [
                { id: 'directory-map-container', icon: 'fas fa-search', text: '4コアスキャンを実行してディレクトリ構造を表示' },
                { id: 'modules-complete-list', icon: 'fas fa-cubes', text: '4コアスキャンを実行して全モジュールを表示' }
            ];
            
            areas.forEach(area => {
                const element = document.getElementById(area.id);
                if (element) {
                    element.innerHTML = `
                        <div class="empty-state">
                            <i class="${area.icon}"></i>
                            <p>${area.text}</p>
                        </div>
                    `;
                }
            });
        },
        
        // ===== ログ追加 =====
        addLogEntry: function(message) {
            const logContainer = document.getElementById('scan-log');
            if (!logContainer) return;
            
            const timestamp = new Date().toLocaleTimeString('ja-JP');
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry log-entry--info';
            logEntry.innerHTML = `
                <span class="log-timestamp">[${timestamp}]</span>
                ${message}
            `;
            
            logContainer.appendChild(logEntry);
            logContainer.scrollTop = logContainer.scrollHeight;
        },
        
        // ===== イベントリスナー設定 =====
        setupEventListeners: function() {
            // コア選択変更
            document.addEventListener('change', (e) => {
                if (e.target.matches('.core-checkbox input[type="checkbox"]')) {
                    const selectedCount = this.getSelectedCores().length;
                    console.log(`📊 選択コア数: ${selectedCount}`);
                }
            });
        },
        
        // ===== リンクハンドラー設定 =====
        setupLinkHandlers: function() {
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a[data-module-link]');
                if (!link) return;
                
                const linkType = link.dataset.linkType;
                
                if (linkType === 'debug') {
                    // デバッグリンクは新しいタブで開く
                    e.preventDefault();
                    window.open(link.href, '_blank', 'width=1200,height=800,scrollbars=yes');
                    this.addLogEntry(`🔧 デバッグページを新しいタブで開きました: ${link.href}`);
                } else {
                    // その他は同じタブ（メイン部分切り替え）
                    this.addLogEntry(`🔗 ページ切り替え: ${link.href}`);
                }
            });
        },
        
        // ===== ユーティリティ関数 =====
        showLoading: function(message = '処理中...') {
            console.log(`⏳ ${message}`);
        },
        
        hideLoading: function() {
            console.log('✅ ローディング終了');
        },
        
        showNotification: function(message, type = 'info') {
            console.log(`📢 [${type.toUpperCase()}] ${message}`);
            // 実際の通知システムと連携する場合はここを拡張
        },
        
        // ===== グローバル関数エイリアス =====
        setupGlobalAliases: function() {
            // グローバル関数として公開（既存システムとの互換性）
            window.performCompleteScan = () => this.performCompleteScan();
            window.clearScanData = () => this.clearScanData();
            window.selectAllCores = () => {
                document.querySelectorAll('.core-checkbox input[type="checkbox"]').forEach(cb => cb.checked = true);
                this.addLogEntry('✅ 全コアを選択しました');
            };
            window.selectNoCores = () => {
                document.querySelectorAll('.core-checkbox input[type="checkbox"]').forEach(cb => cb.checked = false);
                this.addLogEntry('❌ 全コア選択を解除しました');
            };
            window.openInNewTab = () => {
                window.open(window.location.href, '_blank');
                this.addLogEntry('🔗 新しいタブでデバッグダッシュボードを開きました');
            };
        }
    };
    
    // DOMContentLoaded時に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.NAGANO3_DEBUG_SAFE.init();
            window.NAGANO3_DEBUG_SAFE.setupGlobalAliases();
        });
    } else {
        // 既にDOMが読み込まれている場合
        window.NAGANO3_DEBUG_SAFE.init();
        window.NAGANO3_DEBUG_SAFE.setupGlobalAliases();
    }
    
    console.log('🛡️ NAGANO3_DEBUG_SAFE スクリプト読み込み完了（正しい修正版）');
    
})();