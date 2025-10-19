
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
 * NAGANO-3 ローディング制御システム【永続修正版】
 * common/js/ui/loading-control.js
 * 
 * 🔧 修正内容:
 * ✅ 高さ問題の根本解決
 * ✅ フルスクリーン表示の確実性
 * ✅ 既存システムとの完全互換性
 * ✅ 常時表示問題の防止
 * 
 * @version 2.0.0-permanent-fix
 */

"use strict";

// 重複読み込み防止
if (window.NAGANO3_LOADING_CONTROL_LOADED) {
    console.warn('⚠️ Loading Control already loaded');
} else {
    window.NAGANO3_LOADING_CONTROL_LOADED = true;
    
    console.log('🔄 Loading Control System 永続修正版 初期化開始');

    /**
     * 永続修正版ローディングシステム
     */
    class PermanentLoadingSystem {
        constructor() {
            this.activeLoaders = new Map();
            this.uniqueIdCounter = 0;
            this.defaultConfig = {
                zIndex: 999999,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                spinnerColor: '#007bff',
                minHeight: '100vh',
                position: 'fixed'
            };
            
            this.initializeSystem();
        }
        
        /**
         * システム初期化
         */
        initializeSystem() {
            this.injectPermanentStyles();
            this.fixExistingElements();
            this.setupGlobalFunctions();
            this.addAutoCleanup();
        }
        
        /**
         * 永続修正CSSスタイル注入
         */
        injectPermanentStyles() {
            const styleId = 'nagano3-loading-permanent-styles';
            if (document.getElementById(styleId)) return;
            
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* 🔧 NAGANO-3 ローディング永続修正CSS */
                
                /* フルスクリーンオーバーレイの確実な設定 */
                .nagano3-loading-overlay,
                .loading-overlay,
                #loading-overlay,
                [data-loading="overlay"] {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    min-height: 100vh !important;
                    max-height: 100vh !important;
                    background: rgba(255, 255, 255, 0.95) !important;
                    z-index: 999999 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    flex-direction: column !important;
                    backdrop-filter: blur(2px) !important;
                    -webkit-backdrop-filter: blur(2px) !important;
                    box-sizing: border-box !important;
                }
                
                /* スピナーの確実な表示設定 */
                .nagano3-loading-spinner,
                .loading-spinner,
                [data-loading="spinner"] {
                    width: 60px !important;
                    height: 60px !important;
                    min-width: 60px !important;
                    min-height: 60px !important;
                    border: 5px solid #e3e3e3 !important;
                    border-top: 5px solid #007bff !important;
                    border-radius: 50% !important;
                    animation: nagano3-spinner-rotate 1s linear infinite !important;
                    display: block !important;
                    margin: 0 auto 20px auto !important;
                    box-sizing: border-box !important;
                }
                
                /* 小さなスピナー */
                .nagano3-loading-spinner.small {
                    width: 30px !important;
                    height: 30px !important;
                    min-width: 30px !important;
                    min-height: 30px !important;
                    border-width: 3px !important;
                    margin-bottom: 10px !important;
                }
                
                /* 大きなスピナー */
                .nagano3-loading-spinner.large {
                    width: 80px !important;
                    height: 80px !important;
                    min-width: 80px !important;
                    min-height: 80px !important;
                    border-width: 6px !important;
                    margin-bottom: 25px !important;
                }
                
                /* ローディングテキスト */
                .nagano3-loading-text,
                [data-loading="text"] {
                    color: #333 !important;
                    font-size: 16px !important;
                    font-weight: 500 !important;
                    text-align: center !important;
                    margin: 10px 0 !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    line-height: 1.4 !important;
                }
                
                /* プログレスバー */
                .nagano3-loading-progress {
                    width: 250px !important;
                    height: 6px !important;
                    background: #e9ecef !important;
                    border-radius: 3px !important;
                    overflow: hidden !important;
                    margin-top: 20px !important;
                }
                
                .nagano3-loading-progress-bar {
                    height: 100% !important;
                    background: linear-gradient(90deg, #007bff, #28a745) !important;
                    width: 0% !important;
                    transition: width 0.3s ease !important;
                    animation: nagano3-progress-animation 2s ease-in-out infinite !important;
                }
                
                /* インラインローディング */
                .nagano3-loading-inline {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                }
                
                .nagano3-loading-inline .nagano3-loading-spinner {
                    width: 16px !important;
                    height: 16px !important;
                    min-width: 16px !important;
                    min-height: 16px !important;
                    border-width: 2px !important;
                    margin: 0 !important;
                }
                
                /* ボタンローディング */
                .nagano3-btn-loading {
                    position: relative !important;
                    pointer-events: none !important;
                    opacity: 0.7 !important;
                }
                
                .nagano3-btn-loading::after {
                    content: '' !important;
                    position: absolute !important;
                    top: 50% !important;
                    left: 50% !important;
                    width: 16px !important;
                    height: 16px !important;
                    margin: -8px 0 0 -8px !important;
                    border: 2px solid transparent !important;
                    border-top: 2px solid currentColor !important;
                    border-radius: 50% !important;
                    animation: nagano3-spinner-rotate 1s linear infinite !important;
                }
                
                /* フェードアニメーション */
                .nagano3-loading-fade-in {
                    animation: nagano3-fadeIn 0.3s ease !important;
                }
                
                .nagano3-loading-fade-out {
                    animation: nagano3-fadeOut 0.3s ease !important;
                }
                
                /* 既存システム互換性 */
                .loading-overlay:not(.nagano3-loading-overlay),
                #loading-overlay:not(.nagano3-loading-overlay) {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    min-height: 100vh !important;
                    z-index: 999998 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                
                /* 問題要素の強制修正 */
                [class*="loading"][style*="height: 0"],
                [id*="loading"][style*="height: 0"],
                [class*="spinner"][style*="height: 0"] {
                    height: auto !important;
                    min-height: 50px !important;
                }
                
                /* キーフレームアニメーション */
                @keyframes nagano3-spinner-rotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes nagano3-progress-animation {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }
                
                @keyframes nagano3-fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                
                @keyframes nagano3-fadeOut {
                    from { opacity: 1; transform: scale(1); }
                    to { opacity: 0; transform: scale(0.9); }
                }
                
                /* レスポンシブ対応 */
                @media (max-width: 768px) {
                    .nagano3-loading-overlay {
                        padding: 20px !important;
                    }
                    
                    .nagano3-loading-spinner {
                        width: 50px !important;
                        height: 50px !important;
                        min-width: 50px !important;
                        min-height: 50px !important;
                    }
                    
                    .nagano3-loading-text {
                        font-size: 14px !important;
                    }
                    
                    .nagano3-loading-progress {
                        width: 80vw !important;
                        max-width: 300px !important;
                    }
                }
                
                /* ダークモード対応 */
                @media (prefers-color-scheme: dark) {
                    .nagano3-loading-overlay {
                        background: rgba(0, 0, 0, 0.9) !important;
                    }
                    
                    .nagano3-loading-text {
                        color: #fff !important;
                    }
                    
                    .nagano3-loading-spinner {
                        border-color: #444 !important;
                        border-top-color: #007bff !important;
                    }
                }
                
                /* 印刷時は非表示 */
                @media print {
                    .nagano3-loading-overlay,
                    .loading-overlay,
                    #loading-overlay {
                        display: none !important;
                    }
                }
                
                /* 省電力モード対応 */
                @media (prefers-reduced-motion: reduce) {
                    .nagano3-loading-spinner {
                        animation: none !important;
                    }
                    
                    .nagano3-loading-progress-bar {
                        animation: none !important;
                    }
                }
            `;
            
            document.head.appendChild(style);
            console.log('📱 永続修正CSS注入完了');
        }
        
        /**
         * 既存問題要素の修正
         */
        fixExistingElements() {
            const problemElements = document.querySelectorAll('[class*="loading"], [id*="loading"], [class*="spinner"]');
            
            problemElements.forEach((el, index) => {
                const styles = window.getComputedStyle(el);
                
                // 高さ0の要素を修正
                if (el.offsetHeight === 0 || styles.height === '0px') {
                    if (el.className.includes('overlay') || el.id.includes('overlay')) {
                        el.classList.add('nagano3-loading-overlay');
                    } else if (el.className.includes('spinner') || el.id.includes('spinner')) {
                        el.classList.add('nagano3-loading-spinner');
                    }
                }
                
                // データ属性追加（管理用）
                el.setAttribute('data-nagano3-loading', 'fixed');
            });
            
            console.log(`🔧 ${problemElements.length}個の既存要素を修正`);
        }
        
        /**
         * フルスクリーンローディング表示
         */
        showFullscreen(options = {}) {
            const config = { ...this.defaultConfig, ...options };
            const loaderId = config.id || `nagano3-loader-${++this.uniqueIdCounter}`;
            
            // 既存のローダーを削除
            this.hide(loaderId);
            
            const overlay = document.createElement('div');
            overlay.id = loaderId;
            overlay.className = 'nagano3-loading-overlay nagano3-loading-fade-in';
            overlay.setAttribute('data-loading', 'overlay');
            
            const spinner = document.createElement('div');
            spinner.className = `nagano3-loading-spinner ${config.size || ''}`;
            spinner.setAttribute('data-loading', 'spinner');
            
            const text = document.createElement('div');
            text.className = 'nagano3-loading-text';
            text.setAttribute('data-loading', 'text');
            text.textContent = config.text || '読み込み中...';
            
            overlay.appendChild(spinner);
            overlay.appendChild(text);
            
            // プログレスバー（オプション）
            if (config.showProgress) {
                const progress = document.createElement('div');
                progress.className = 'nagano3-loading-progress';
                
                const progressBar = document.createElement('div');
                progressBar.className = 'nagano3-loading-progress-bar';
                
                progress.appendChild(progressBar);
                overlay.appendChild(progress);
            }
            
            document.body.appendChild(overlay);
            this.activeLoaders.set(loaderId, overlay);
            
            // 自動削除（オプション）
            if (config.autoHide) {
                setTimeout(() => this.hide(loaderId), config.autoHide);
            }
            
            console.log(`🔄 フルスクリーンローディング表示: ${loaderId}`);
            return loaderId;
        }
        
        /**
         * ローディング非表示
         */
        hide(loaderId) {
            const loader = this.activeLoaders.get(loaderId);
            
            if (!loader) {
                console.warn(`⚠️ ローディング非表示: ${loaderId} が見つかりません`);
                return false;
            }
            
            loader.classList.add('nagano3-loading-fade-out');
            setTimeout(() => {
                if (loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
                this.activeLoaders.delete(loaderId);
            }, 300);
            
            console.log(`✅ ローディング非表示完了: ${loaderId}`);
            return true;
        }
        
        /**
         * 全ローディング非表示
         */
        hideAll() {
            const loaderIds = Array.from(this.activeLoaders.keys());
            loaderIds.forEach(id => this.hide(id));
            
            // 問題のある要素も強制非表示
            const allLoadings = document.querySelectorAll('[class*="loading"], [id*="loading"], [class*="spinner"]');
            allLoadings.forEach(el => {
                if (el.offsetHeight > 0 && window.getComputedStyle(el).display !== 'none') {
                    el.style.display = 'none';
                }
            });
            
            console.log(`✅ 全ローディング非表示完了: ${loaderIds.length + allLoadings.length}個`);
        }
        
        /**
         * 既存システム互換関数
         */
        showLoading(text = '読み込み中...') {
            return this.showFullscreen({ text: text, id: 'legacy-loader' });
        }
        
        hideLoading() {
            return this.hide('legacy-loader');
        }
        
        /**
         * グローバル関数設定
         */
        setupGlobalFunctions() {
            // 既存関数の安全な拡張
            const originalShowLoading = window.showLoading;
            window.showLoading = (text) => {
                console.log('📞 showLoading 呼び出し:', text);
                return this.showLoading(text);
            };
            
            const originalHideLoading = window.hideLoading;
            window.hideLoading = () => {
                console.log('📞 hideLoading 呼び出し');
                return this.hideLoading();
            };
            
            // 新しいAPI
            window.showFullscreenLoading = (options) => this.showFullscreen(options);
            window.hideLoadingById = (id) => this.hide(id);
            window.hideAllLoading = () => this.hideAll();
            window.forceHideAllLoadings = () => this.hideAll();
            
            console.log('🔧 グローバル関数設定完了');
        }
        
        /**
         * 自動クリーンアップ設定
         */
        addAutoCleanup() {
            // ページ離脱時のクリーンアップ
            window.addEventListener('beforeunload', () => {
                this.hideAll();
            });
            
            // 定期的な問題要素チェック（5分間隔）
            setInterval(() => {
                this.fixExistingElements();
            }, 300000);
            
            console.log('🔄 自動クリーンアップ設定完了');
        }
        
        /**
         * デバッグ情報取得
         */
        getDebugInfo() {
            return {
                activeLoaders: this.activeLoaders.size,
                loaderIds: Array.from(this.activeLoaders.keys()),
                config: this.defaultConfig,
                version: '2.0.0-permanent-fix'
            };
        }
    }

    // グローバルインスタンス作成
    window.NAGANO3_LOADING_SYSTEM = new PermanentLoadingSystem();

    // NAGANO3名前空間への登録
    if (window.NAGANO3) {
        if (!window.NAGANO3.ui) {
            window.NAGANO3.ui = {};
        }
        window.NAGANO3.ui.loading = window.NAGANO3_LOADING_SYSTEM;
    }

    console.log('✅ Loading Control System 永続修正版 初期化完了');
}

// 使用例をコンソールに出力
console.log(`
🔄 ローディングコントロール永続修正版 使用例:
========================================

// 基本的な使用方法
showLoading('データを読み込んでいます...');
hideLoading();

// 新しいAPI
const loaderId = showFullscreenLoading({
    text: 'ファイルをアップロード中...',
    size: 'large',
    showProgress: true,
    autoHide: 5000
});

// 強制非表示
forceHideAllLoadings();

// デバッグ情報
console.log(NAGANO3_LOADING_SYSTEM.getDebugInfo());
`);