
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
 * 🔧 NAGANO-3 Core Configuration
 * common/js/core/config.js
 * 
 * ✅ 404エラー解消用設定ファイル
 * ✅ bootstrap.jsとの統合対応
 * 
 * @version 1.0.0-error-fix
 */

"use strict";

// 重複読み込み防止
if (window.NAGANO3_CONFIG_LOADED) {
    console.log('⚠️ config.js は既に読み込み済みです');
} else {
    window.NAGANO3_CONFIG_LOADED = true;

    // NAGANO3名前空間確保
    if (typeof window.NAGANO3 === 'undefined') {
        window.NAGANO3 = {};
    }

    // 基本設定（bootstrap.jsと統合）
    if (!window.NAGANO3.config) {
        window.NAGANO3.config = {
            // システム情報
            version: '4.0.1-config-integrated',
            environment: 'development',
            debug: true,
            
            // ページ設定
            current_page: 'dashboard',
            csrf_token: '',
            user_theme: 'light',
            user_name: 'NAGANO-3 User',
            user_role: 'standard',
            sidebar_state: 'expanded',
            
            // UI設定
            themes: ["light", "dark", "gentle", "vivid", "ocean"],
            animation_speed: 300,
            notification_duration: 5000,
            
            // Ajax設定
            ajax_timeout: 30000,
            ajax_retry_attempts: 3,
            ajax_endpoint: window.location.pathname,
            
            // モジュール設定
            page_modules: {
                'dashboard': [],
                'kicho_content': ['kicho'],
                'apikey_content': ['apikey'],
                'shohin_content': ['shohin'],
                'zaiko_content': ['zaiko'],
                'juchu_kanri_content': ['juchu_kanri']
            },
            
            // パフォーマンス設定
            cache_enabled: true,
            lazy_loading: true,
            prefetch_enabled: false,
            
            // セキュリティ設定
            csrf_validation: true,
            session_timeout: 3600,
            max_file_size: 10485760, // 10MB
            
            // API設定
            api_endpoints: {
                base: window.location.origin,
                ajax: window.location.pathname,
                upload: '/upload/',
                download: '/download/'
            }
        };
    }

    // 設定統合関数
    window.NAGANO3.extendConfig = function(additionalConfig) {
        if (typeof additionalConfig === 'object') {
            Object.assign(window.NAGANO3.config, additionalConfig);
            console.log('🔧 NAGANO3設定が拡張されました');
        }
    };

    // 設定取得関数
    window.NAGANO3.getConfig = function(key, defaultValue = null) {
        const keys = key.split('.');
        let value = window.NAGANO3.config;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    };

    // 設定更新関数
    window.NAGANO3.setConfig = function(key, value) {
        const keys = key.split('.');
        let target = window.NAGANO3.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in target) || typeof target[k] !== 'object') {
                target[k] = {};
            }
            target = target[k];
        }
        
        target[keys[keys.length - 1]] = value;
        console.log(`🔧 設定更新: ${key} = ${value}`);
    };

    // 環境別設定の自動調整
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.NAGANO3.config.environment = 'development';
        window.NAGANO3.config.debug = true;
    } else {
        window.NAGANO3.config.environment = 'production';
        window.NAGANO3.config.debug = false;
    }

    // 分割ファイルシステムとの統合
    if (window.NAGANO3.splitFiles) {
        window.NAGANO3.splitFiles.markLoaded('config.js');
    }

    console.log('✅ NAGANO-3 Core Configuration 読み込み完了');
    console.log('🔧 Environment:', window.NAGANO3.config.environment);
    console.log('🎯 Current Page:', window.NAGANO3.config.current_page);
}