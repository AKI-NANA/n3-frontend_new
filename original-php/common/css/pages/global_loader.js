
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
 * 全ページ対応 CSSローダーシステム
 * common/js/global-css-loader.js
 * 
 * どのページでも自動的にローディングCSSを読み込み
 */

"use strict";

// 重複読み込み防止
if (!window.NAGANO3_GLOBAL_CSS_LOADED) {
    window.NAGANO3_GLOBAL_CSS_LOADED = true;
    
    console.log('🌐 Global CSS Loader 開始');

    /**
     * 全ページ対応CSSローダークラス
     */
    class GlobalCSSLoader {
        constructor() {
            this.requiredCSS = [
                // ローディング関連CSS（最優先）
                'common/css/core/loading-supplement.css',
                
                // その他の共通CSS（必要に応じて追加）
                // 'common/css/core/global-fixes.css',
                // 'common/css/core/responsive.css'
            ];
            
            this.loadedCSS = new Set();
            this.init();
        }
        
        /**
         * 初期化・自動読み込み
         */
        init() {
            console.log('🚀 グローバルCSS自動読み込み開始');
            
            // DOM準備後に実行
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.loadAllCSS());
            } else {
                this.loadAllCSS();
            }
        }
        
        /**
         * 全CSSファイル読み込み
         */
        async loadAllCSS() {
            console.log(`📦 ${this.requiredCSS.length}個のCSSファイル読み込み開始`);
            
            const loadPromises = this.requiredCSS.map(cssFile => this.loadCSS(cssFile));
            
            try {
                const results = await Promise.allSettled(loadPromises);
                
                const successful = results.filter(r => r.status === 'fulfilled').length;
                const failed = results.filter(r => r.status === 'rejected').length;
                
                console.log(`✅ CSS読み込み完了: 成功${successful}件, 失敗${failed}件`);
                
                // 失敗したファイルの詳細
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        console.warn(`❌ ${this.requiredCSS[index]}: ${result.reason}`);
                    }
                });
                
                // 読み込み完了イベント
                this.dispatchLoadCompleteEvent();
                
            } catch (error) {
                console.error('❌ CSS読み込み重大エラー:', error);
            }
        }
        
        /**
         * 個別CSS読み込み
         */
        loadCSS(cssFile) {
            return new Promise((resolve, reject) => {
                // 既に読み込み済みかチェック
                if (this.loadedCSS.has(cssFile)) {
                    console.log(`⏭️ スキップ（既読み込み）: ${cssFile}`);
                    resolve(cssFile);
                    return;
                }
                
                // 既存のlink要素をチェック
                const existingLink = document.querySelector(`link[href="${cssFile}"]`);
                if (existingLink) {
                    console.log(`⏭️ スキップ（既存在）: ${cssFile}`);
                    this.loadedCSS.add(cssFile);
                    resolve(cssFile);
                    return;
                }
                
                // 新しいlink要素を作成
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = cssFile;
                
                // 読み込み成功時
                link.onload = () => {
                    this.loadedCSS.add(cssFile);
                    console.log(`✅ CSS読み込み成功: ${cssFile}`);
                    resolve(cssFile);
                };
                
                // 読み込み失敗時
                link.onerror = () => {
                    const error = `CSS読み込み失敗: ${cssFile}`;
                    console.error(`❌ ${error}`);
                    reject(new Error(error));
                };
                
                // タイムアウト設定（10秒）
                const timeout = setTimeout(() => {
                    const error = `CSS読み込みタイムアウト: ${cssFile}`;
                    console.error(`⏰ ${error}`);
                    reject(new Error(error));
                }, 10000);
                
                link.onload = () => {
                    clearTimeout(timeout);
                    this.loadedCSS.add(cssFile);
                    console.log(`✅ CSS読み込み成功: ${cssFile}`);
                    resolve(cssFile);
                };
                
                // DOMに追加
                document.head.appendChild(link);
                console.log(`📥 CSS読み込み開始: ${cssFile}`);
            });
        }
        
        /**
         * CSS追加（動的）
         */
        addCSS(cssFile) {
            if (!this.requiredCSS.includes(cssFile)) {
                this.requiredCSS.push(cssFile);
            }
            return this.loadCSS(cssFile);
        }
        
        /**
         * 読み込み完了イベント発火
         */
        dispatchLoadCompleteEvent() {
            const event = new CustomEvent('nagano3:css-loaded', {
                detail: {
                    loadedFiles: Array.from(this.loadedCSS),
                    totalFiles: this.requiredCSS.length,
                    timestamp: Date.now()
                }
            });
            
            document.dispatchEvent(event);
            window.dispatchEvent(event);
            
            console.log('📡 CSS読み込み完了イベント発火');
        }
        
        /**
         * 読み込み状況確認
         */
        getStatus() {
            return {
                requiredFiles: this.requiredCSS.length,
                loadedFiles: this.loadedCSS.size,
                loadedList: Array.from(this.loadedCSS),
                missing: this.requiredCSS.filter(file => !this.loadedCSS.has(file))
            };
        }
        
        /**
         * 不足CSS補完
         */
        async supplementMissingCSS() {
            const status = this.getStatus();
            
            if (status.missing.length > 0) {
                console.log(`🔄 不足CSS補完: ${status.missing.length}件`);
                
                const loadPromises = status.missing.map(file => this.loadCSS(file));
                await Promise.allSettled(loadPromises);
                
                console.log('✅ CSS補完完了');
            } else {
                console.log('✅ 全CSS読み込み済み');
            }
        }
    }

    // グローバルインスタンス作成
    window.NAGANO3_CSS_LOADER = new GlobalCSSLoader();

    // NAGANO3名前空間への登録
    if (window.NAGANO3) {
        if (!window.NAGANO3.system) {
            window.NAGANO3.system = {};
        }
        window.NAGANO3.system.cssLoader = window.NAGANO3_CSS_LOADER;
    }

    // ヘルパー関数
    window.loadGlobalCSS = function(cssFile) {
        return window.NAGANO3_CSS_LOADER.addCSS(cssFile);
    };

    window.checkCSSStatus = function() {
        return window.NAGANO3_CSS_LOADER.getStatus();
    };

    window.supplementCSS = function() {
        return window.NAGANO3_CSS_LOADER.supplementMissingCSS();
    };

    console.log('✅ Global CSS Loader 初期化完了');

    // 使用例をコンソールに表示
    console.log(`
🌐 Global CSS Loader 使用例:
============================

// CSS読み込み状況確認
checkCSSStatus();

// 不足CSS補完
await supplementCSS();

// 新しいCSS追加
await loadGlobalCSS('common/css/custom.css');

// 読み込み完了イベント監視
document.addEventListener('nagano3:css-loaded', function(e) {
    console.log('CSS読み込み完了:', e.detail);
});
    `);
}
