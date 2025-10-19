
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
 * NAGANO-3 テーマシステム（最終強化版）
 * ファイル: common/js/core/theme.js
 * 
 * 🎯 重複宣言完全防止・Supreme Guardian連携
 * ✅ 高度なテーマ機能・アニメーション・ユーザー設定保存
 */

"use strict";

console.log('🎨 テーマシステム読み込み開始');

// ===== Supreme Guardian連携重複防止 =====
const THEME_REGISTRY_RESULT = window.NAGANO3_SUPREME_GUARDIAN?.registry.safeRegisterFile('theme.js');

if (!THEME_REGISTRY_RESULT?.success) {
    console.warn('⚠️ テーマシステムファイル重複読み込み防止:', THEME_REGISTRY_RESULT?.reason);
} else {
    // ===== ThemeManagerクラス定義（Supreme Guardian連携） =====
    const ThemeManagerRegisterResult = window.safeDefineClass('ThemeManager', class ThemeManager {
        constructor(options = {}) {
            this.id = 'theme-manager-' + Date.now();
            this.themes = ['light', 'dark', 'auto', 'gentle', 'high-contrast'];
            this.currentTheme = 'auto';
            this.effectiveTheme = null;
            this.isTransitioning = false;
            
            // 設定
            this.config = {
                animationDuration: 300,
                storageKey: 'nagano3-theme',
                autoSave: true,
                enableTransitions: true,
                enableSystemSync: true,
                enableColorSchemePreference: true,
                ...options
            };
            
            // テーマ情報定義
            this.themeInfo = {
                light: {
                    name: 'ライト',
                    description: '明るいテーマ',
                    icon: '☀️',
                    colorScheme: 'light',
                    colors: {
                        primary: '#007cba',
                        background: '#ffffff',
                        surface: '#f8f9fa',
                        text: '#212529',
                        border: '#dee2e6'
                    }
                },
                dark: {
                    name: 'ダーク',
                    description: '暗いテーマ',
                    icon: '🌙',
                    colorScheme: 'dark',
                    colors: {
                        primary: '#4dabf7',
                        background: '#121212',
                        surface: '#1e1e1e',
                        text: '#ffffff',
                        border: '#333333'
                    }
                },
                auto: {
                    name: '自動',
                    description: 'システム設定に従う',
                    icon: '🔄',
                    colorScheme: 'light dark',
                    colors: null // 動的に設定
                },
                gentle: {
                    name: 'ジェントル',
                    description: '目に優しいテーマ',
                    icon: '🌸',
                    colorScheme: 'light',
                    colors: {
                        primary: '#6b73ff',
                        background: '#fdfbf7',
                        surface: '#f5f1eb',
                        text: '#4a4a4a',
                        border: '#e8e2d8'
                    }
                },
                'high-contrast': {
                    name: 'ハイコントラスト',
                    description: 'アクセシビリティ重視',
                    icon: '🔳',
                    colorScheme: 'light',
                    colors: {
                        primary: '#0000ff',
                        background: '#ffffff',
                        surface: '#ffffff',
                        text: '#000000',
                        border: '#000000'
                    }
                }
            };
            
            // メディアクエリ監視
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.contrastQuery = window.matchMedia('(prefers-contrast: high)');
            this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            
            // イベント管理
            this.eventListeners = new Map();
            
            this.init();
        }
        
        /**
         * 初期化
         */
        init() {
            try {
                this.loadStoredTheme();
                this.setupSystemThemeListeners();
                this.injectStyles();
                this.setupCustomProperties();
                
                // 初期テーマ適用
                this.applyTheme(this.currentTheme, { animate: false, notify: false });
                
                console.log('🎨 ThemeManager初期化完了:', this.id);
            } catch (error) {
                console.error('❌ ThemeManager初期化失敗:', error);
                throw error;
            }
        }
        
        /**
         * テーマ設定
         */
        setTheme(theme, options = {}) {
            if (!this.isValidTheme(theme)) {
                console.warn(`⚠️ 無効なテーマ: ${theme}`);
                return false;
            }
            
            if (this.isTransitioning && !options.force) {
                console.warn('⚠️ テーマ変更中です。しばらく待ってからお試しください。');
                return false;
            }
            
            try {
                const previousTheme = this.currentTheme;
                this.currentTheme = theme;
                
                // テーマ適用
                const result = this.applyTheme(theme, options);
                
                if (result.success) {
                    // 保存
                    if (this.config.autoSave && options.save !== false) {
                        this.saveTheme();
                    }
                    
                    // 通知
                    if (options.notify !== false && window.showNotification) {
                        const themeInfo = this.themeInfo[theme];
                        window.showNotification(
                            `テーマを「${themeInfo.name}」に変更しました`,
                            'info',
                            2000
                        );
                    }
                    
                    // イベント発火
                    this.dispatchThemeChange(previousTheme, theme, this.effectiveTheme);
                    
                    console.log(`🎨 テーマ変更成功: ${previousTheme} → ${theme} (実効: ${this.effectiveTheme})`);
                    return true;
                } else {
                    // ロールバック
                    this.currentTheme = previousTheme;
                    throw new Error(result.error || 'テーマ適用失敗');
                }
                
            } catch (error) {
                console.error(`❌ テーマ設定エラー: ${theme}`, error);
                
                // Supreme Guardianエラーハンドラー連携
                if (window.NAGANO3_SUPREME_GUARDIAN?.errorHandler) {
                    window.NAGANO3_SUPREME_GUARDIAN.errorHandler.handle(error, 'theme_set');
                }
                
                return false;
            }
        }
        
        /**
         * テーマ切り替え（順次）
         */
        toggle() {
            const currentIndex = this.themes.indexOf(this.currentTheme);
            const nextIndex = (currentIndex + 1) % this.themes.length;
            const nextTheme = this.themes[nextIndex];
            
            return this.setTheme(nextTheme);
        }
        
        /**
         * テーマ適用実行
         */
        applyTheme(theme, options = {}) {
            try {
                this.isTransitioning = true;
                
                // 実効テーマ決定
                const effectiveTheme = this.resolveEffectiveTheme(theme);
                this.effectiveTheme = effectiveTheme;
                
                // DOM要素取得
                const body = document.body;
                const html = document.documentElement;
                
                // アニメーション設定
                if (options.animate !== false && this.config.enableTransitions && !this.motionQuery.matches) {
                    this.addTransitionEffect();
                }
                
                // 既存テーマクラス削除
                this.themes.forEach(t => {
                    body.classList.remove(`theme-${t}`, `nagano3-theme-${t}`);
                    html.classList.remove(`theme-${t}`, `nagano3-theme-${t}`);
                });
                
                // 新しいテーマクラス追加
                body.classList.add(`theme-${effectiveTheme}`, `nagano3-theme-${effectiveTheme}`);
                html.classList.add(`theme-${effectiveTheme}`, `nagano3-theme-${effectiveTheme}`);
                
                // data属性設定
                body.setAttribute('data-theme', theme);
                body.setAttribute('data-effective-theme', effectiveTheme);
                html.setAttribute('data-theme', theme);
                html.setAttribute('data-effective-theme', effectiveTheme);
                
                // CSS カスタムプロパティ設定
                this.setCSSVariables(effectiveTheme);
                
                // カラースキーム設定
                this.setColorScheme(effectiveTheme);
                
                // アクセシビリティ対応
                this.applyAccessibilitySettings(effectiveTheme);
                
                // メタテーマカラー更新（モバイル対応）
                this.updateMetaThemeColor(effectiveTheme);
                
                setTimeout(() => {
                    this.isTransitioning = false;
                }, this.config.animationDuration);
                
                return { success: true, effectiveTheme };
                
            } catch (error) {
                this.isTransitioning = false;
                return { success: false, error: error.message };
            }
        }
        
        /**
         * 実効テーマ解決
         */
        resolveEffectiveTheme(theme) {
            if (theme === 'auto') {
                if (this.config.enableSystemSync) {
                    return this.detectSystemTheme();
                } else {
                    return 'light'; // フォールバック
                }
            }
            
            // ハイコントラストモード自動検出
            if (this.contrastQuery.matches && theme !== 'high-contrast') {
                console.log('🎨 ハイコントラストモード検出 - 自動切り替え');
                return 'high-contrast';
            }
            
            return theme;
        }
        
        /**
         * システムテーマ検出
         */
        detectSystemTheme() {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
            return 'light';
        }
        
        /**
         * CSS変数設定
         */
        setCSSVariables(theme) {
            const root = document.documentElement;
            const themeInfo = this.themeInfo[theme];
            
            if (!themeInfo || !themeInfo.colors) {
                console.warn(`⚠️ テーマ "${theme}" の色情報が見つかりません`);
                return;
            }
            
            // 基本色設定
            Object.entries(themeInfo.colors).forEach(([property, value]) => {
                root.style.setProperty(`--color-${property}`, value);
            });
            
            // 動的色計算
            this.setDynamicColors(theme, themeInfo.colors);
            
            // テーマ固有変数
            root.style.setProperty('--theme-name', `"${themeInfo.name}"`);
            root.style.setProperty('--theme-icon', `"${themeInfo.icon}"`);
            root.style.setProperty('--animation-duration', `${this.config.animationDuration}ms`);
        }
        
        /**
         * 動的色計算
         */
        setDynamicColors(theme, colors) {
            const root = document.documentElement;
            
            // 透明度バリエーション
            const alphaVariants = [0.1, 0.2, 0.3, 0.5, 0.7, 0.8, 0.9];
            Object.entries(colors).forEach(([property, value]) => {
                alphaVariants.forEach(alpha => {
                    const rgbValue = this.hexToRgb(value);
                    if (rgbValue) {
                        root.style.setProperty(
                            `--color-${property}-${Math.round(alpha * 100)}`,
                            `rgba(${rgbValue.r}, ${rgbValue.g}, ${rgbValue.b}, ${alpha})`
                        );
                    }
                });
            });
            
            // コントラスト色
            Object.entries(colors).forEach(([property, value]) => {
                const contrast = this.getContrastColor(value);
                root.style.setProperty(`--color-${property}-contrast`, contrast);
            });
        }
        
        /**
         * Hex色をRGBに変換
         */
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }
        
        /**
         * コントラスト色取得
         */
        getContrastColor(hex) {
            const rgb = this.hexToRgb(hex);
            if (!rgb) return '#000000';
            
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            return brightness > 128 ? '#000000' : '#ffffff';
        }
        
        /**
         * カラースキーム設定
         */
        setColorScheme(theme) {
            const themeInfo = this.themeInfo[theme];
            if (themeInfo && themeInfo.colorScheme) {
                document.documentElement.style.colorScheme = themeInfo.colorScheme;
            }
        }
        
        /**
         * アクセシビリティ設定適用
         */
        applyAccessibilitySettings(theme) {
            const root = document.documentElement;
            
            // ハイコントラストモード
            if (theme === 'high-contrast') {
                root.style.setProperty('--focus-ring-width', '3px');
                root.style.setProperty('--focus-ring-color', '#0000ff');
                root.style.setProperty('--focus-ring-offset', '2px');
            } else {
                root.style.setProperty('--focus-ring-width', '2px');
                root.style.setProperty('--focus-ring-color', 'var(--color-primary)');
                root.style.setProperty('--focus-ring-offset', '1px');
            }
            
            // 動き軽減設定
            if (this.motionQuery.matches) {
                root.style.setProperty('--animation-duration', '0ms');
                root.style.setProperty('--transition-duration', '0ms');
            }
        }
        
        /**
         * メタテーマカラー更新
         */
        updateMetaThemeColor(theme) {
            const themeInfo = this.themeInfo[theme];
            if (!themeInfo || !themeInfo.colors) return;
            
            let metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (!metaThemeColor) {
                metaThemeColor = document.createElement('meta');
                metaThemeColor.name = 'theme-color';
                document.head.appendChild(metaThemeColor);
            }
            
            metaThemeColor.content = themeInfo.colors.background || '#ffffff';
        }
        
        /**
         * トランジション効果追加
         */
        addTransitionEffect() {
            const body = document.body;
            
            body.classList.add('nagano3-theme-transitioning');
            
            setTimeout(() => {
                body.classList.remove('nagano3-theme-transitioning');
            }, this.config.animationDuration);
        }
        
        /**
         * システムテーマ監視設定
         */
        setupSystemThemeListeners() {
            // カラースキーム変更監視
            this.mediaQuery.addEventListener('change', (e) => {
                if (this.currentTheme === 'auto' && this.config.enableSystemSync) {
                    console.log('🎨 システムテーマ変更検出:', e.matches ? 'dark' : 'light');
                    this.applyTheme('auto', { notify: false });
                }
            });
            
            // コントラスト設定変更監視
            this.contrastQuery.addEventListener('change', (e) => {
                if (e.matches && this.currentTheme !== 'high-contrast') {
                    console.log('🎨 ハイコントラストモード有効化検出');
                    this.setTheme('high-contrast', { notify: true });
                }
            });
            
            // 動き軽減設定変更監視
            this.motionQuery.addEventListener('change', (e) => {
                console.log('🎨 動き軽減設定変更検出:', e.matches);
                this.config.enableTransitions = !e.matches;
                
                const root = document.documentElement;
                if (e.matches) {
                    root.style.setProperty('--animation-duration', '0ms');
                    root.style.setProperty('--transition-duration', '0ms');
                } else {
                    root.style.setProperty('--animation-duration', `${this.config.animationDuration}ms`);
                    root.style.setProperty('--transition-duration', `${this.config.animationDuration}ms`);
                }
            });
        }
        
        /**
         * スタイル注入
         */
        injectStyles() {
            const styleId = 'nagano3-theme-styles';
            if (document.querySelector(`#${styleId}`)) return;
            
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* テーマトランジション */
                .nagano3-theme-transitioning,
                .nagano3-theme-transitioning * {
                    transition: 
                        background-color var(--animation-duration, ${this.config.animationDuration}ms) ease,
                        color var(--animation-duration, ${this.config.animationDuration}ms) ease,
                        border-color var(--animation-duration, ${this.config.animationDuration}ms) ease,
                        box-shadow var(--animation-duration, ${this.config.animationDuration}ms) ease !important;
                }
                
                /* 基本テーマクラス */
                .nagano3-theme-light {
                    color-scheme: light;
                }
                
                .nagano3-theme-dark {
                    color-scheme: dark;
                }
                
                .nagano3-theme-auto {
                    color-scheme: light dark;
                }
                
                .nagano3-theme-gentle {
                    color-scheme: light;
                    font-smoothing: antialiased;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }
                
                .nagano3-theme-high-contrast {
                    color-scheme: light;
                    font-weight: bold;
                }
                
                /* スクロールバー */
                .nagano3-theme-dark ::-webkit-scrollbar {
                    background-color: var(--color-surface, #1e1e1e);
                }
                
                .nagano3-theme-dark ::-webkit-scrollbar-thumb {
                    background-color: var(--color-border, #333333);
                }
                
                .nagano3-theme-dark ::-webkit-scrollbar-thumb:hover {
                    background-color: var(--color-text-50, rgba(255,255,255,0.5));
                }
                
                /* フォーカスリング */
                .nagano3-theme-high-contrast *:focus {
                    outline: var(--focus-ring-width, 3px) solid var(--focus-ring-color, #0000ff) !important;
                    outline-offset: var(--focus-ring-offset, 2px) !important;
                }
                
                /* 動き軽減対応 */
                @media (prefers-reduced-motion: reduce) {
                    .nagano3-theme-transitioning,
                    .nagano3-theme-transitioning * {
                        transition: none !important;
                        animation: none !important;
                    }
                }
                
                /* ハイコントラスト対応 */
                @media (prefers-contrast: high) {
                    * {
                        border-color: currentColor !important;
                    }
                }
            `;
            
            document.head.appendChild(style);
        }
        
        /**
         * カスタムプロパティ初期設定
         */
        setupCustomProperties() {
            const root = document.documentElement;
            
            // アニメーション関連
            root.style.setProperty('--animation-duration', `${this.config.animationDuration}ms`);
            root.style.setProperty('--transition-duration', `${this.config.animationDuration}ms`);
            
            // テーマシステム情報
            root.style.setProperty('--theme-system-version', '"5.0.0"');
            root.style.setProperty('--theme-count', this.themes.length.toString());
        }
        
        /**
         * テーマ保存
         */
        saveTheme() {
            if (!this.config.autoSave) return;
            
            try {
                const themeData = {
                    theme: this.currentTheme,
                    timestamp: Date.now(),
                    version: '5.0.0'
                };
                
                localStorage.setItem(this.config.storageKey, JSON.stringify(themeData));
                console.log(`💾 テーマ保存: ${this.currentTheme}`);
            } catch (error) {
                console.warn('⚠️ テーマ保存失敗:', error);
            }
        }
        
        /**
         * テーマ読み込み
         */
        loadStoredTheme() {
            try {
                const stored = localStorage.getItem(this.config.storageKey);
                if (!stored) return;
                
                const themeData = JSON.parse(stored);
                
                if (this.isValidTheme(themeData.theme)) {
                    this.currentTheme = themeData.theme;
                    console.log(`📂 テーマ読み込み: ${this.currentTheme}`);
                } else {
                    console.warn('⚠️ 保存されたテーマが無効:', themeData.theme);
                }
            } catch (error) {
                console.warn('⚠️ テーマ読み込み失敗:', error);
            }
        }
        
        /**
         * テーマ変更イベント発火
         */
        dispatchThemeChange(previousTheme, newTheme, effectiveTheme) {
            const events = [
                new CustomEvent('themechange', {
                    detail: { previousTheme, newTheme, effectiveTheme, timestamp: Date.now() }
                }),
                new CustomEvent('nagano3:theme-change', {
                    detail: { 
                        previous: previousTheme, 
                        current: newTheme, 
                        effective: effectiveTheme,
                        manager: this,
                        timestamp: Date.now()
                    }
                })
            ];
            
            events.forEach(event => {
                document.dispatchEvent(event);
                window.dispatchEvent(event);
            });
            
            console.log(`📡 テーマ変更イベント発火: ${previousTheme} → ${newTheme}`);
        }
        
        /**
         * テーマ有効性チェック
         */
        isValidTheme(theme) {
            return this.themes.includes(theme);
        }
        
        /**
         * 利用可能テーマ一覧取得
         */
        getAvailableThemes() {
            return this.themes.map(theme => ({
                id: theme,
                ...this.themeInfo[theme],
                current: theme === this.currentTheme,
                effective: theme === this.effectiveTheme
            }));
        }
        
        /**
         * 現在のテーマ情報取得
         */
        getCurrentThemeInfo() {
            return {
                id: this.currentTheme,
                effective: this.effectiveTheme,
                ...this.themeInfo[this.currentTheme],
                isTransitioning: this.isTransitioning
            };
        }
        
        /**
         * デバッグ情報取得
         */
        getDebugInfo() {
            return {
                id: this.id,
                currentTheme: this.currentTheme,
                effectiveTheme: this.effectiveTheme,
                isTransitioning: this.isTransitioning,
                availableThemes: this.themes,
                systemTheme: this.detectSystemTheme(),
                preferences: {
                    colorScheme: this.mediaQuery.matches ? 'dark' : 'light',
                    contrast: this.contrastQuery.matches ? 'high' : 'normal',
                    motion: this.motionQuery.matches ? 'reduce' : 'normal'
                },
                config: { ...this.config }
            };
        }
    }, 'theme.js');

    if (!ThemeManagerRegisterResult.success) {
        console.warn('⚠️ ThemeManagerクラス重複防止:', ThemeManagerRegisterResult.reason);
    }

    // ===== テーマシステム初期化（Supreme Guardian連携） =====
    function initializeTheme() {
        try {
            console.log('🎨 テーマシステム初期化開始');
            
            // 既存インスタンスチェック
            if (window.NAGANO3?.theme) {
                console.log('⚠️ テーマシステムは既に初期化済みです');
                return window.NAGANO3.theme;
            }
            
            // インスタンス作成
            const themeManager = new ThemeManager({
                enableSystemSync: true,
                enableTransitions: true,
                animationDuration: 300
            });
            
            // NAGANO3に登録
            window.safeDefineNamespace('NAGANO3.theme', themeManager, 'theme');
            
            // グローバル関数登録（後方互換性・上書き許可）
            window.safeDefineFunction('toggleTheme', function() {
                return themeManager.toggle();
            }, 'theme', { allowOverwrite: true });
            
            window.safeDefineFunction('setTheme', function(theme, options) {
                return themeManager.setTheme(theme, options);
            }, 'theme', { allowOverwrite: true });
            
            window.safeDefineFunction('getTheme', function() {
                return themeManager.currentTheme;
            }, 'theme', { allowOverwrite: true });
            
            window.safeDefineFunction('getEffectiveTheme', function() {
                return themeManager.effectiveTheme;
            }, 'theme', { allowOverwrite: true });
            
            window.safeDefineFunction('getThemeInfo', function() {
                return themeManager.getCurrentThemeInfo();
            }, 'theme', { allowOverwrite: true });
            
            // Supreme Guardian初期化キューに登録
            if (window.NAGANO3_SUPREME_GUARDIAN?.initializer) {
                window.NAGANO3_SUPREME_GUARDIAN.initializer.register(
                    'theme',
                    async () => {
                        console.log('✅ テーマシステム初期化完了');
                        console.log('🎨 現在のテーマ:', themeManager.getCurrentThemeInfo());
                        
                        // 初期化完了通知（遅延）
                        setTimeout(() => {
                            if (window.showNotification) {
                                const info = themeManager.getCurrentThemeInfo();
                                window.showNotification(
                                    `テーマシステム準備完了（${info.name}）`,
                                    'success',
                                    2000
                                );
                            }
                        }, 1500);
                    },
                    { priority: 2, required: true, dependencies: ['notifications'] }
                );
            }
            
            console.log('🎨 テーマシステム登録完了');
            return themeManager;
            
        } catch (error) {
            console.error('❌ テーマシステム初期化失敗:', error);
            
            // Supreme Guardianエラーハンドラー連携
            if (window.NAGANO3_SUPREME_GUARDIAN?.errorHandler) {
                window.NAGANO3_SUPREME_GUARDIAN.errorHandler.handle(error, 'theme_init');
            }
            
            // 最小限のフォールバック
            window.safeDefineFunction('toggleTheme', function() {
                const body = document.body;
                const isDark = body.classList.contains('theme-dark') || body.classList.contains('nagano3-theme-dark');
                
                if (isDark) {
                    body.classList.remove('theme-dark', 'nagano3-theme-dark');
                    body.classList.add('theme-light', 'nagano3-theme-light');
                    body.setAttribute('data-theme', 'light');
                    document.documentElement.style.colorScheme = 'light';
                } else {
                    body.classList.remove('theme-light', 'nagano3-theme-light');
                    body.classList.add('theme-dark', 'nagano3-theme-dark');
                    body.setAttribute('data-theme', 'dark');
                    document.documentElement.style.colorScheme = 'dark';
                }
                
                console.log(`🎨 テーマ切り替え（フォールバック）: ${isDark ? 'light' : 'dark'}`);
                return !isDark;
            }, 'theme-fallback', { allowOverwrite: true });
            
            // その他のフォールバック関数
            const fallbackFunctions = {
                setTheme: (theme) => {
                    const body = document.body;
                    ['light', 'dark', 'auto', 'gentle', 'high-contrast'].forEach(t => {
                        body.classList.remove(`theme-${t}`, `nagano3-theme-${t}`);
                    });
                    body.classList.add(`theme-${theme}`, `nagano3-theme-${theme}`);
                    body.setAttribute('data-theme', theme);
                    console.log(`🎨 テーマ設定（フォールバック）: ${theme}`);
                },
                getTheme: () => document.body.getAttribute('data-theme') || 'light',
                getEffectiveTheme: () => document.body.getAttribute('data-effective-theme') || document.body.getAttribute('data-theme') || 'light',
                getThemeInfo: () => ({ 
                    id: document.body.getAttribute('data-theme') || 'light', 
                    name: document.body.getAttribute('data-theme') || 'light',
                    fallback: true
                })
            };
            
            Object.entries(fallbackFunctions).forEach(([name, func]) => {
                window.safeDefineFunction(name, func, 'theme-fallback', { allowOverwrite: true });
            });
            
            throw error;
        }
    }

    // ===== 初期化実行（DOM準備後またはSupreme Guardian準備後） =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTheme);
    } else {
        // DOM準備済みの場合
        if (window.NAGANO3_SUPREME_GUARDIAN) {
            initializeTheme();
        } else {
            // Supreme Guardian待機
            const waitForGuardian = () => {
                if (window.NAGANO3_SUPREME_GUARDIAN) {
                    initializeTheme();
                } else {
                    setTimeout(waitForGuardian, 100);
                }
            };
            waitForGuardian();
        }
    }

    // ===== デバッグ機能（開発環境用） =====
    if (window.NAGANO3_SUPREME_GUARDIAN?.debug?.enabled) {
        window.safeDefineNamespace('NAGANO3_THEME_DEBUG', {
            info: () => window.NAGANO3?.theme?.getDebugInfo() || 'テーマシステム未初期化',
            toggle: () => window.NAGANO3?.theme?.toggle() || false,
            setLight: () => window.NAGANO3?.theme?.setTheme('light') || false,
            setDark: () => window.NAGANO3?.theme?.setTheme('dark') || false,
            setAuto: () => window.NAGANO3?.theme?.setTheme('auto') || false,
            setGentle: () => window.NAGANO3?.theme?.setTheme('gentle') || false,
            setHighContrast: () => window.NAGANO3?.theme?.setTheme('high-contrast') || false,
            test: () => {
                const manager = window.NAGANO3?.theme;
                if (manager) {
                    const themes = ['light', 'dark', 'gentle', 'high-contrast'];
                    themes.forEach((theme, index) => {
                        setTimeout(() => {
                            manager.setTheme(theme, { notify: true });
                        }, index * 2000);
                    });
                } else {
                    console.warn('テーマシステムが利用できません');
                }
            }
        }, 'theme-debug');
    }

    console.log('🎨 NAGANO-3 theme.js 読み込み完了（Supreme Guardian連携版）');
}

console.log('🎨 テーマシステムファイル処理完了');