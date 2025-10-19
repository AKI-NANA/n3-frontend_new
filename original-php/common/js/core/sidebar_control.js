/**
 * 📁 common/js/core/sidebar_control.js - サイドバー制御システム（修正版）
 * 
 * 🎯 目的: サイドバーの状態管理とCSS変数連動
 * ✅ 100%幅基準での左マージン制御
 * ✅ !important不要のシンプル制御
 */

console.log("🔗 sidebar_control.js ロード開始（修正版）");

// ===== NAGANO3名前空間初期化 =====
if (typeof window.NAGANO3 === 'undefined') {
    window.NAGANO3 = {};
}

// ===== サイドバー制御システム（修正版） =====
window.NAGANO3.SidebarControl = {
    initialized: false,
    currentState: 'expanded', // 'expanded', 'collapsed', 'hidden'
    
    // 状態定義
    states: {
        expanded: {
            marginLeft: '220px',
            sidebarWidth: '220px',
            bodyClass: ''
        },
        collapsed: {
            marginLeft: '60px',
            sidebarWidth: '60px',
            bodyClass: 'sidebar-collapsed'
        },
        hidden: {
            marginLeft: '0px',
            sidebarWidth: '0px',
            bodyClass: 'sidebar-hidden'
        }
    },
    
    // 初期化
    init: function() {
        if (this.initialized) {
            console.log("⚠️ SidebarControl は既に初期化済み");
            return;
        }
        
        console.log("🚀 SidebarControl 初期化開始");
        
        // 初期状態の検出
        this.detectInitialState();
        
        // トグルボタンの設定
        this.setupToggleButtons();
        
        // キーボードショートカット設定
        this.setupKeyboardShortcuts();
        
        this.initialized = true;
        console.log("✅ SidebarControl 初期化完了");
    },
    
    // 初期状態の検出
    detectInitialState: function() {
        const body = document.body;
        
        if (body.classList.contains('sidebar-hidden')) {
            this.currentState = 'hidden';
        } else if (body.classList.contains('sidebar-collapsed')) {
            this.currentState = 'collapsed';
        } else {
            this.currentState = 'expanded';
        }
        
        console.log(`📍 初期サイドバー状態: ${this.currentState}`);
        this.applyState(this.currentState, false); // アニメーションなしで適用
    },
    
    // トグルボタンの設定
    setupToggleButtons: function() {
        // 各種トグルボタンを検索
        const toggleSelectors = [
            '.sidebar-toggle',
            '.unified-toggle-button',
            '[data-action="toggle-sidebar"]',
            '.toggle-sidebar'
        ];
        
        toggleSelectors.forEach(selector => {
            const buttons = document.querySelectorAll(selector);
            buttons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggle();
                });
            });
        });
        
        console.log("🔘 サイドバートグルボタン設定完了");
    },
    
    // キーボードショートカット設定
    setupKeyboardShortcuts: function() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+S でサイドバートグル
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.toggle();
            }
        });
        
        console.log("⌨️ キーボードショートカット設定完了（Ctrl+Shift+S）");
    },
    
    // サイドバートグル（expanded ↔ collapsed）
    toggle: function() {
        console.log(`🔄 サイドバートグル実行（現在: ${this.currentState}）`);
        
        if (this.currentState === 'expanded') {
            this.setState('collapsed');
        } else if (this.currentState === 'collapsed') {
            this.setState('expanded');
        } else {
            // hidden状態からはexpandedに戻す
            this.setState('expanded');
        }
    },
    
    // 状態設定
    setState: function(newState, animated = true) {
        if (!this.states[newState]) {
            console.error(`❌ 無効な状態: ${newState}`);
            return;
        }
        
        console.log(`🎯 サイドバー状態変更: ${this.currentState} → ${newState}`);
        
        this.currentState = newState;
        this.applyState(newState, animated);
        
        // カスタムイベント発火
        this.dispatchStateChangeEvent(newState);
    },
    
    // 状態適用
    applyState: function(state, animated = true) {
        const stateConfig = this.states[state];
        const body = document.body;
        const sidebar = document.querySelector('.sidebar, .unified-sidebar');
        
        // bodyクラスの更新
        Object.values(this.states).forEach(config => {
            if (config.bodyClass) {
                body.classList.remove(config.bodyClass);
            }
        });
        
        if (stateConfig.bodyClass) {
            body.classList.add(stateConfig.bodyClass);
        }
        
        // CSS変数の更新
        this.updateCSSVariables(stateConfig);
        
        // サイドバー要素の更新
        if (sidebar) {
            this.updateSidebarElement(sidebar, state, animated);
        }
        
        console.log(`✅ 状態適用完了: ${state} (margin-left: ${stateConfig.marginLeft})`);
    },
    
    // CSS変数の更新
    updateCSSVariables: function(stateConfig) {
        const root = document.documentElement;
        
        // メイン変数の更新
        root.style.setProperty('--content-margin-left', stateConfig.marginLeft);
        
        // デバッグ用（開発時のみ）
        if (window.location.search.includes('debug=css')) {
            console.log(`🎨 CSS変数更新: --content-margin-left = ${stateConfig.marginLeft}`);
        }
    },
    
    // サイドバー要素の更新
    updateSidebarElement: function(sidebar, state, animated) {
        // アニメーション制御
        if (!animated) {
            sidebar.style.transition = 'none';
        }
        
        // クラスの更新
        sidebar.classList.remove('sidebar--collapsed', 'unified-sidebar--collapsed');
        sidebar.classList.remove('sidebar--hidden', 'unified-sidebar--hidden');
        
        if (state === 'collapsed') {
            sidebar.classList.add('sidebar--collapsed', 'unified-sidebar--collapsed');
        } else if (state === 'hidden') {
            sidebar.classList.add('sidebar--hidden', 'unified-sidebar--hidden');
        }
        
        // アニメーション復元
        if (!animated) {
            setTimeout(() => {
                sidebar.style.transition = '';
            }, 50);
        }
    },
    
    // 状態変更イベント発火
    dispatchStateChangeEvent: function(newState) {
        const event = new CustomEvent('nagano3:sidebarStateChanged', {
            detail: { 
                state: newState,
                marginLeft: this.states[newState].marginLeft,
                timestamp: new Date().toISOString()
            }
        });
        
        document.dispatchEvent(event);
        console.log(`📡 イベント発火: nagano3:sidebarStateChanged (${newState})`);
    },
    
    // 現在の状態取得
    getState: function() {
        return {
            current: this.currentState,
            marginLeft: this.states[this.currentState].marginLeft,
            states: Object.keys(this.states)
        };
    },
    
    // 状態リセット
    reset: function() {
        console.log("🔄 サイドバー状態リセット");
        this.setState('expanded', false);
    },
    
    // デバッグ情報表示
    showDebugInfo: function() {
        const info = {
            initialized: this.initialized,
            currentState: this.currentState,
            marginLeft: this.states[this.currentState].marginLeft,
            bodyClasses: Array.from(document.body.classList),
            cssVariable: getComputedStyle(document.documentElement).getPropertyValue('--content-margin-left').trim()
        };
        
        console.table(info);
        return info;
    }
};

// ===== グローバル関数として公開 =====
window.toggleSidebar = function() {
    return window.NAGANO3.SidebarControl.toggle();
};

window.setSidebarState = function(state) {
    return window.NAGANO3.SidebarControl.setState(state);
};

// ===== DOM準備完了時の自動初期化 =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.NAGANO3.SidebarControl.init();
    });
} else {
    // 既にDOMが読み込まれている場合
    setTimeout(() => {
        window.NAGANO3.SidebarControl.init();
    }, 100);
}

// ===== 開発者向けヘルパー =====
if (window.location.search.includes('debug=sidebar')) {
    // デバッグモード：グローバルに公開
    window.SidebarControl = window.NAGANO3.SidebarControl;
    
    // デバッグ用のコンソールメッセージ
    console.log(`
🔧 サイドバーデバッグモード有効
使用方法:
- SidebarControl.showDebugInfo() : デバッグ情報表示
- SidebarControl.setState('collapsed') : 状態変更
- SidebarControl.toggle() : トグル
- toggleSidebar() : グローバル関数
`);
}

console.log("✅ sidebar_control.js ロード完了（修正版）");
