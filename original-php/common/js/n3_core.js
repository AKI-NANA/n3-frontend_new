/**
 * NAGANO-3 Core JavaScript
 * Phase 1最終完了版対応
 */

console.log('✅ NAGANO-3 Core JavaScript loaded');

// 基本的なユーティリティ関数
window.N3 = {
    version: '2.0',
    
    // DOM要素取得
    $: function(selector) {
        return document.querySelector(selector);
    },
    
    // 全要素取得
    $$: function(selector) {
        return document.querySelectorAll(selector);
    },
    
    // 要素表示/非表示
    show: function(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) element.style.display = 'block';
    },
    
    hide: function(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) element.style.display = 'none';
    },
    
    // Ajax簡易ラッパー
    ajax: function(url, options = {}) {
        return fetch(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: options.body ? JSON.stringify(options.body) : null
        }).then(response => response.json());
    },
    
    // ローディング表示
    showLoading: function(message = '読み込み中...') {
        const loading = document.createElement('div');
        loading.id = 'n3-loading';
        loading.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 99999;">
                <div style="background: white; padding: 2rem; border-radius: 8px; text-align: center;">
                    <div style="margin-bottom: 1rem;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #3b82f6;"></i>
                    </div>
                    <div>${message}</div>
                </div>
            </div>
        `;
        document.body.appendChild(loading);
    },
    
    hideLoading: function() {
        const loading = this.$('#n3-loading');
        if (loading) {
            loading.remove();
        }
    }
};

// グローバルアクセス用
window.n3 = window.N3;