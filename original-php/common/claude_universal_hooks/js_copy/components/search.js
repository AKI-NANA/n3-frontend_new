
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
 * 📁 common/js/components/search.js - 検索システム（仮実装版）
 * 
 * 🎯 目的: 検索機能の実装
 * ✅ 404エラー解消用の仮実装
 * ✅ 基本機能のみ提供
 */

console.log("🔗 search.js ロード開始（仮実装版）");

// ===== NAGANO3名前空間確認・初期化 =====
if (typeof window.NAGANO3 === 'undefined') {
    window.NAGANO3 = {};
}

// ===== 検索システム =====
window.NAGANO3.search = {
    initialized: false,
    searchInput: null,
    resultsContainer: null,
    currentQuery: '',
    
    // 検索システム初期化
    init: function() {
        if (this.initialized) {
            console.log("⚠️ 検索システムは既に初期化済み");
            return;
        }
        
        console.log("🚀 検索システム初期化開始");
        
        // 検索入力フィールドを設定
        this.initSearchInput();
        
        // 検索結果コンテナを作成
        this.createResultsContainer();
        
        this.initialized = true;
        console.log("✅ 検索システム初期化完了");
    },
    
    // 検索入力フィールドの設定
    initSearchInput: function() {
        // 複数のセレクターで検索入力を検索
        const selectors = [
            '[data-search-action="perform"]',
            '.search__input',
            '#search-input',
            'input[placeholder*="検索"]',
            'input[placeholder*="search"]'
        ];
        
        for (const selector of selectors) {
            this.searchInput = document.querySelector(selector);
            if (this.searchInput) {
                console.log(`🔍 検索入力フィールド発見: ${selector}`);
                break;
            }
        }
        
        if (!this.searchInput) {
            console.warn("⚠️ 検索入力フィールドが見つかりません");
            return;
        }
        
        // イベントリスナー設定
        this.setupEventListeners();
    },
    
    // イベントリスナーの設定
    setupEventListeners: function() {
        if (!this.searchInput) return;
        
        let searchTimeout;
        
        // 入力時の検索（遅延実行）
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    this.performSearch(query);
                }, 300);
            } else {
                this.clearResults();
            }
        });
        
        // Enterキー押下時の検索
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                if (query.length >= 1) {
                    this.performSearch(query);
                }
            }
        });
        
        // フォーカス時の結果表示
        this.searchInput.addEventListener('focus', () => {
            if (this.currentQuery && this.resultsContainer) {
                this.resultsContainer.style.display = 'block';
            }
        });
        
        console.log("🔗 検索イベントリスナー設定完了");
    },
    
    // 検索結果コンテナの作成
    createResultsContainer: function() {
        this.resultsContainer = document.getElementById('search-results');
        
        if (!this.resultsContainer) {
            this.resultsContainer = document.createElement('div');
            this.resultsContainer.id = 'search-results';
            this.resultsContainer.style.cssText = `
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                max-height: 400px;
                overflow-y: auto;
                display: none;
            `;
            
            // 検索入力の親要素に結果コンテナを追加
            if (this.searchInput && this.searchInput.parentNode) {
                const wrapper = this.searchInput.parentNode;
                wrapper.style.position = 'relative';
                wrapper.appendChild(this.resultsContainer);
            } else {
                document.body.appendChild(this.resultsContainer);
            }
        }
        
        // 外部クリック時に結果を非表示
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#search-results') && 
                !e.target.closest('.search__input') &&
                !e.target.closest('[data-search-action="perform"]')) {
                this.hideResults();
            }
        });
        
        console.log("📋 検索結果コンテナ作成完了");
    },
    
    // 検索実行
    performSearch: async function(query) {
        console.log(`🔍 検索実行: "${query}"`);
        this.currentQuery = query;
        
        // ローディング表示
        this.showLoading();
        
        try {
            // NAGANO3 AJAX システムを使用（利用可能な場合）
            if (window.NAGANO3.ajax) {
                const result = await window.NAGANO3.ajax.call('search', {
                    query: query,
                    types: ['orders', 'customers', 'products', 'pages']
                });
                
                this.displayResults(result);
            } else {
                // フォールバック: 仮の検索結果
                setTimeout(() => {
                    this.displayMockResults(query);
                }, 500);
            }
            
        } catch (error) {
            console.error("❌ 検索エラー:", error);
            this.displayError('検索中にエラーが発生しました');
        }
    },
    
    // ローディング表示
    showLoading: function() {
        if (!this.resultsContainer) return;
        
        this.resultsContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666;">
                <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #e2e8f0; border-top: 2px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <span style="margin-left: 10px;">検索中...</span>
            </div>
        `;
        
        this.resultsContainer.style.display = 'block';
    },
    
    // 検索結果表示
    displayResults: function(results) {
        if (!this.resultsContainer) return;
        
        if (!results || results.length === 0) {
            this.displayNoResults();
            return;
        }
        
        let html = '<div style="padding: 10px 0;">';
        
        results.forEach(result => {
            html += `
                <div style="padding: 10px 15px; border-bottom: 1px solid #f1f5f9; cursor: pointer;" 
                     onclick="window.location.href='${result.url || '#'}'">
                    <div style="font-weight: 600; color: #1e293b; margin-bottom: 5px;">
                        ${result.title || result.name || '無題'}
                    </div>
                    <div style="font-size: 12px; color: #64748b;">
                        ${result.description || result.type || '説明なし'}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        this.resultsContainer.innerHTML = html;
        this.resultsContainer.style.display = 'block';
    },
    
    // 仮の検索結果表示（デモ用）
    displayMockResults: function(query) {
        const mockResults = [
            {
                title: `"${query}" に関連する注文`,
                description: '注文管理システム',
                url: '/juchu'
            },
            {
                title: `"${query}" に関連する商品`,
                description: '商品管理システム',
                url: '/shohin'
            },
            {
                title: `"${query}" に関連する在庫`,
                description: '在庫管理システム',
                url: '/zaiko'
            }
        ];
        
        this.displayResults(mockResults);
    },
    
    // 結果なし表示
    displayNoResults: function() {
        if (!this.resultsContainer) return;
        
        this.resultsContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #64748b;">
                <div style="margin-bottom: 10px;">📭</div>
                <div>検索結果が見つかりませんでした</div>
                <div style="font-size: 12px; margin-top: 5px;">
                    別のキーワードで検索してみてください
                </div>
            </div>
        `;
        
        this.resultsContainer.style.display = 'block';
    },
    
    // エラー表示
    displayError: function(message) {
        if (!this.resultsContainer) return;
        
        this.resultsContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ef4444;">
                <div style="margin-bottom: 10px;">❌</div>
                <div>${message}</div>
            </div>
        `;
        
        this.resultsContainer.style.display = 'block';
    },
    
    // 結果をクリア
    clearResults: function() {
        if (this.resultsContainer) {
            this.resultsContainer.innerHTML = '';
            this.resultsContainer.style.display = 'none';
        }
        this.currentQuery = '';
    },
    
    // 結果を非表示
    hideResults: function() {
        if (this.resultsContainer) {
            this.resultsContainer.style.display = 'none';
        }
    }
};

// ===== グローバル関数として公開 =====
window.performSearch = function(query) {
    if (!window.NAGANO3.search.initialized) {
        window.NAGANO3.search.init();
    }
    return window.NAGANO3.search.performSearch(query);
};

// ===== DOM準備完了時の自動初期化 =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.NAGANO3.search.init();
    });
} else {
    setTimeout(() => {
        window.NAGANO3.search.init();
    }, 100);
}

// ===== 分割ファイル読み込み完了通知 =====
if (window.NAGANO3 && window.NAGANO3.splitFiles) {
    window.NAGANO3.splitFiles.markLoaded('search.js');
}

console.log("✅ search.js ロード完了（仮実装版）");