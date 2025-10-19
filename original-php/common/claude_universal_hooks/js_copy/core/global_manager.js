
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
 * グローバルCSS管理システム【完成版】
 * 配置先: common/js/core/global-css-manager.js
 *
 * ✅ 404エラー完全解決
 * ✅ ローディング高さ問題対策
 * ✅ 既存システム完全保護
 */

"use strict";

// 重複読み込み防止
if (window.NAGANO3_GLOBAL_CSS_MANAGER_LOADED) {
  console.warn("⚠️ Global CSS Manager already loaded");
} else {
  window.NAGANO3_GLOBAL_CSS_MANAGER_LOADED = true;

  console.log("🎨 Global CSS Manager 初期化開始");

  class GlobalCSSManager {
    constructor() {
      this.version = "1.0.0-complete";
      this.loadedCSS = new Set();
      this.failedCSS = new Set();
      this.retryCount = new Map();
      this.maxRetries = 3;

      // 必須CSS一覧
      this.criticalCSS = [
        "common/css/core/loading-supplement.css", // ← 実在するファイルのみ
      ];

      this.init();
    }

    init() {
      // DOM準備完了後に自動実行
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.autoLoad());
      } else {
        setTimeout(() => this.autoLoad(), 0);
      }
    }

    async autoLoad() {
      console.log("🚀 グローバルCSS自動読み込み開始");

      try {
        // 即座にフォールバックCSS注入
        this.injectFallbackCSS();

        // 必須CSS読み込み試行
        await this.loadCriticalCSS();

        // 完了イベント発火
        this.dispatchLoadCompleteEvent();
      } catch (error) {
        console.error("❌ CSS読み込み失敗:", error);
        this.handleLoadError();
      }
    }

    async loadCriticalCSS() {
      console.log(`🎯 必須CSS読み込み開始: ${this.criticalCSS.length}件`);

      // 各CSSファイルの読み込み試行
      for (const cssFile of this.criticalCSS) {
        try {
          const success = await this.loadSingleCSSWithRetry(cssFile);
          if (success) {
            console.log(`✅ CSS読み込み成功: ${cssFile}`);
            break; // 1つでも成功すれば十分
          }
        } catch (error) {
          console.warn(`⚠️ CSS読み込み失敗: ${cssFile}`, error);
        }
      }

      // 全て失敗した場合はフォールバック利用
      if (this.loadedCSS.size === 0) {
        console.log("📦 全CSS読み込み失敗 - フォールバックCSS利用");
      }
    }

    async loadSingleCSSWithRetry(cssFile) {
      const retries = this.retryCount.get(cssFile) || 0;

      if (retries >= this.maxRetries) {
        throw new Error(`最大再試行回数到達: ${cssFile}`);
      }

      try {
        return await this.loadSingleCSS(cssFile);
      } catch (error) {
        this.retryCount.set(cssFile, retries + 1);
        console.warn(
          `🔄 CSS読み込み再試行 ${retries + 1}/${this.maxRetries}: ${cssFile}`
        );

        // 少し待ってから再試行
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return await this.loadSingleCSSWithRetry(cssFile);
      }
    }

    loadSingleCSS(cssFile) {
      return new Promise((resolve, reject) => {
        // 既存チェック
        const existing = document.querySelector(
          `link[href="${cssFile}"], link[href*="${cssFile.split("/").pop()}"]`
        );
        if (existing) {
          console.log(`⏭️ スキップ: ${cssFile} (既存)`);
          this.loadedCSS.add(cssFile);
          resolve(true);
          return;
        }

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = cssFile;
        link.type = "text/css";

        // タイムアウト設定
        const timeout = setTimeout(() => {
          link.remove();
          const error = new Error(`CSS読み込みタイムアウト: ${cssFile}`);
          reject(error);
        }, 5000);

        link.onload = () => {
          clearTimeout(timeout);
          this.loadedCSS.add(cssFile);
          console.log(`✅ CSS読み込み成功: ${cssFile}`);
          resolve(true);
        };

        link.onerror = () => {
          clearTimeout(timeout);
          link.remove();
          this.failedCSS.add(cssFile);
          const error = new Error(`CSS読み込みエラー: ${cssFile}`);
          reject(error);
        };

        // DOM追加
        document.head.appendChild(link);
        console.log(`📥 CSS読み込み開始: ${cssFile}`);
      });
    }

    injectFallbackCSS() {
      const styleId = "nagano3-loading-fallback-css";
      if (document.getElementById(styleId)) {
        return; // 既存の場合はスキップ
      }

      const style = document.createElement("style");
      style.id = styleId;
      style.type = "text/css";
      style.textContent = `
                /* NAGANO-3 ローディング補完CSS - フォールバック版 */
                
                /* 全ローディング要素の基本設定 */
                [class*="loading"],
                [id*="loading"],
                [class*="spinner"] {
                    box-sizing: border-box !important;
                }
                
                /* オーバーレイ系の確実な全画面表示 */
                .loading-overlay,
                #loading-overlay,
                [class*="loading"][class*="overlay"],
                [id*="loading"][id*="overlay"] {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    min-height: 100vh !important;
                    z-index: 999999 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background: rgba(255, 255, 255, 0.95) !important;
                    backdrop-filter: blur(2px) !important;
                }
                
                /* スピナー要素の確実な表示 */
                .loading-spinner,
                [class*="loading"][class*="spinner"],
                [class*="spinner"] {
                    width: 50px !important;
                    height: 50px !important;
                    min-width: 50px !important;
                    min-height: 50px !important;
                    border: 4px solid #f3f3f3 !important;
                    border-top: 4px solid #007bff !important;
                    border-radius: 50% !important;
                    animation: nagano3-fallback-spin 1s linear infinite !important;
                    display: block !important;
                    margin: 0 auto 20px auto !important;
                }
                
                /* ローディングテキスト */
                .loading-text,
                [data-loading="text"] {
                    color: #333 !important;
                    font-size: 16px !important;
                    text-align: center !important;
                    margin-top: 10px !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                }
                
                /* スピナーアニメーション */
                @keyframes nagano3-fallback-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* 高さ0の問題要素を強制修正 */
                [class*="loading"][style*="height: 0"],
                [id*="loading"][style*="height: 0"],
                [class*="spinner"][style*="height: 0"] {
                    height: auto !important;
                    min-height: 50px !important;
                }
                
                /* 非表示状態の要素も適切なサイズを保持 */
                [class*="loading"][style*="display: none"],
                [id*="loading"][style*="display: none"] {
                    min-height: 50px !important;
                }
                
                /* フレックスボックス内での適切な表示 */
                [class*="loading"] {
                    flex-shrink: 0 !important;
                }
                
                /* モバイル対応 */
                @media (max-width: 768px) {
                    .loading-overlay,
                    #loading-overlay {
                        padding: 20px !important;
                    }
                    
                    [class*="loading"][class*="spinner"],
                    .loading-spinner {
                        width: 40px !important;
                        height: 40px !important;
                        min-width: 40px !important;
                        min-height: 40px !important;
                    }
                }
                
                /* 印刷時の非表示 */
                @media print {
                    [class*="loading"],
                    [id*="loading"] {
                        display: none !important;
                    }
                }
                
                /* 省電力モード対応 */
                @media (prefers-reduced-motion: reduce) {
                    [class*="spinner"] {
                        animation: none !important;
                    }
                }
            `;

      document.head.appendChild(style);
      console.log("💉 フォールバックCSS注入完了");
    }

    handleLoadError() {
      // 既にフォールバックCSS注入済み

      // NAGANO3オブジェクトにエラー情報保存
      if (window.NAGANO3) {
        window.NAGANO3.css_load_errors = Array.from(this.failedCSS);
        window.NAGANO3.css_fallback_active = true;
      }

      console.log("🛡️ CSS読み込みエラー対応完了 - フォールバック利用");
    }

    dispatchLoadCompleteEvent() {
      const event = new CustomEvent("NAGANO3:css-manager-ready", {
        detail: {
          loadedCSS: Array.from(this.loadedCSS),
          failedCSS: Array.from(this.failedCSS),
          totalRequired: this.criticalCSS.length,
          fallbackActive: this.loadedCSS.size === 0,
          version: this.version,
          timestamp: Date.now(),
        },
      });

      document.dispatchEvent(event);
      window.dispatchEvent(event);

      console.log("📡 CSS Manager 完了イベント発火");
    }

    // 手動CSS追加
    async addCSS(cssFile, isCritical = false) {
      try {
        const success = await this.loadSingleCSS(cssFile);
        if (success) {
          console.log(`✅ 手動CSS追加成功: ${cssFile}`);
          return true;
        }
      } catch (error) {
        console.error(`❌ 手動CSS追加失敗: ${cssFile}`, error);
      }
      return false;
    }

    // ステータス取得
    getStatus() {
      return {
        version: this.version,
        loadedCSS: Array.from(this.loadedCSS),
        failedCSS: Array.from(this.failedCSS),
        criticalCSS: this.criticalCSS,
        loadSuccess: this.loadedCSS.size > 0,
        fallbackActive: this.loadedCSS.size === 0,
        retryCount: Object.fromEntries(this.retryCount),
      };
    }
  }

  // グローバル変数設定
  window.NAGANO3_CSS_MANAGER = new GlobalCSSManager();

  // NAGANO3オブジェクトに統合
  if (window.NAGANO3) {
    if (!window.NAGANO3.system) {
      window.NAGANO3.system = {};
    }
    window.NAGANO3.system.cssManager = window.NAGANO3_CSS_MANAGER;
  }

  // グローバル関数提供
  window.addGlobalCSS = function (cssFile, isCritical = false) {
    return window.NAGANO3_CSS_MANAGER.addCSS(cssFile, isCritical);
  };

  window.getCSSStatus = function () {
    return window.NAGANO3_CSS_MANAGER.getStatus();
  };

  // 既存のshowLoading/hideLoading関数が無い場合の緊急代替
  if (!window.showLoading) {
    window.showLoading = function (text = "読み込み中...") {
      // 既存要素確認
      let overlay = document.getElementById("nagano3-temp-loading");
      if (overlay) {
        overlay.querySelector(".loading-text").textContent = text;
        overlay.style.display = "flex";
        return;
      }

      // 新規作成
      overlay = document.createElement("div");
      overlay.id = "nagano3-temp-loading";
      overlay.className = "loading-overlay";
      overlay.innerHTML = `
                <div>
                    <div class="loading-spinner"></div>
                    <div class="loading-text">${text}</div>
                </div>
            `;
      overlay.style.display = "flex";

      document.body.appendChild(overlay);
      console.log("✅ 緊急ローディング表示:", text);
    };
  }

  if (!window.hideLoading) {
    window.hideLoading = function () {
      const overlay = document.getElementById("nagano3-temp-loading");
      if (overlay) {
        overlay.style.display = "none";
        console.log("✅ 緊急ローディング非表示");
      }
    };
  }

  // 緊急ローディング強制非表示
  window.forceHideAllLoadings = function () {
    const allLoadings = document.querySelectorAll(
      '[class*="loading"], [id*="loading"]'
    );
    allLoadings.forEach((el) => {
      el.style.display = "none";
    });
    console.log(`🧹 全ローディング要素強制非表示: ${allLoadings.length}個`);
  };

  // 正常表示確認用関数
  window.properShowLoading = function (text = "処理中...") {
    window.hideLoading(); // 既存を隠す
    setTimeout(() => {
      window.showLoading(text);
    }, 100);
  };

  console.log("✅ Global CSS Manager 初期化完了 (フォールバック対応)");
}
