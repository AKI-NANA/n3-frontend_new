<?php
/**
 * NAGANO-3 動的JavaScript生成器（送料計算対応）
 * common/js/generate-n3.php
 * 
 * ✅ 送料計算システム統合
 * ✅ CSRF対応・Ajax統合
 * ✅ エラーハンドリング完備
 */

header('Content-Type: application/javascript; charset=UTF-8');
header('Cache-Control: no-cache, must-revalidate');

// セッション管理
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 設定値取得（フォールバック付き）
try {
    $user_id = $_SESSION['user_id'] ?? 'guest';
    $user_role = $_SESSION['user_role'] ?? 'standard';
    $csrf_token = $_SESSION['csrf_token'] ?? '';
    $theme = $_SESSION['theme'] ?? 'light';
    $sidebar_state = $_SESSION['sidebar_state'] ?? 'expanded';
} catch (Exception $e) {
    // フォールバック値
    $user_id = 'guest';
    $user_role = 'standard';
    $csrf_token = '';
    $theme = 'light';
    $sidebar_state = 'expanded';
}
?>

/**
 * NAGANO-3 動的JavaScript生成器 - 送料計算システム対応
 * Generated: <?= date('Y-m-d H:i:s') ?>
 */

// グローバル設定
window.NAGANO3_CONFIG = {
    user_id: '<?= $user_id ?>',
    user_role: '<?= $user_role ?>',
    csrf_token: '<?= $csrf_token ?>',
    theme: '<?= $theme ?>',
    sidebar_state: '<?= $sidebar_state ?>',
    api_base: window.location.origin,
    version: '3.0.0'
};

// NAGANO3名前空間
window.NAGANO3 = window.NAGANO3 || {};

// 統合Ajax管理クラス
class NAGANO3_Ajax {
    constructor() {
        this.baseUrl = window.location.href;
        this.retryCount = 3;
        this.timeout = 10000;
    }
    
    async request(action, data = {}) {
        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                console.log(`📡 Ajax attempt ${attempt}/${this.retryCount}: ${action}`);
                
                const response = await this.performRequest(action, data);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (result.status === 'error') {
                    throw new Error(result.message || 'Unknown server error');
                }
                
                console.log(`✅ Ajax success: ${action}`, result);
                return result;
                
            } catch (error) {
                console.warn(`⚠️ Ajax attempt ${attempt} failed:`, error.message);
                
                if (attempt === this.retryCount) {
                    this.showNotification(`通信エラー: ${error.message}`, 'error');
                    throw error;
                }
                
                // 指数バックオフ
                await this.delay(1000 * Math.pow(2, attempt - 1));
            }
        }
    }
    
    async performRequest(action, data) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const formData = new FormData();
            formData.append('action', action);
            formData.append('csrf_token', window.NAGANO3_CONFIG.csrf_token);
            
            for (const [key, value] of Object.entries(data)) {
                formData.append(key, value);
            }
            
            return await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `nagano3-notification nagano3-notification--${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            font-size: 14px;
            max-width: 350px;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 統合状態管理クラス
class NAGANO3_StateManager {
    static updateSidebar(state) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.setAttribute('data-state', state);
            window.NAGANO3_CONFIG.sidebar_state = state;
            
            // サーバー同期（非同期）
            if (window.NAGANO3.ajax) {
                window.NAGANO3.ajax.request('update_sidebar_state', {
                    sidebar_state: state
                }).catch(error => {
                    console.error('Sidebar state sync failed:', error);
                });
            }
        }
    }
    
    static updateTheme(theme) {
        const layout = document.querySelector('.layout');
        if (layout) {
            layout.setAttribute('data-theme', theme);
            window.NAGANO3_CONFIG.theme = theme;
            
            // CSS再読み込み
            this.reloadDynamicCSS();
            
            // サーバー同期（非同期）
            if (window.NAGANO3.ajax) {
                window.NAGANO3.ajax.request('update_theme', {
                    theme: theme
                }).catch(error => {
                    console.error('Theme sync failed:', error);
                });
            }
        }
    }
    
    static reloadDynamicCSS() {
        const existingLink = document.querySelector('link[href*="generate-n3.php"]');
        if (existingLink) {
            const newLink = existingLink.cloneNode();
            newLink.href = existingLink.href + '?t=' + Date.now();
            existingLink.parentNode.replaceChild(newLink, existingLink);
        }
    }
    
    static init() {
        // 初期状態設定
        const sidebar = document.querySelector('.sidebar');
        const layout = document.querySelector('.layout');
        
        if (sidebar && window.NAGANO3_CONFIG.sidebar_state) {
            sidebar.setAttribute('data-state', window.NAGANO3_CONFIG.sidebar_state);
        }
        
        if (layout && window.NAGANO3_CONFIG.theme) {
            layout.setAttribute('data-theme', window.NAGANO3_CONFIG.theme);
        }
        
        // 権限別要素表示制御
        this.applyRoleBasedVisibility();
    }
    
    static applyRoleBasedVisibility() {
        const adminElements = document.querySelectorAll('.admin-only');
        const userElements = document.querySelectorAll('.user-only');
        
        if (window.NAGANO3_CONFIG.user_role === 'admin') {
            adminElements.forEach(el => el.style.display = 'block');
            userElements.forEach(el => el.style.display = 'none');
        } else {
            adminElements.forEach(el => el.style.display = 'none');
            userElements.forEach(el => el.style.display = 'block');
        }
    }
}

// 送料計算専用クラス
class SouryouKeisanSystem {
    constructor() {
        this.form = null;
        this.resultContainer = null;
        this.calculateBtn = null;
        this.isCalculating = false;
    }
    
    init() {
        this.form = document.getElementById('shippingCalculatorForm');
        this.resultContainer = document.getElementById('calculationResults');
        this.calculateBtn = document.getElementById('calculateShippingBtn');
        
        if (this.form && this.calculateBtn) {
            this.setupEventListeners();
            console.log('✅ 送料計算システム初期化完了');
        } else {
            console.warn('⚠️ 送料計算システムの必要な要素が見つかりません');
        }
    }
    
    setupEventListeners() {
        // 計算ボタン
        this.calculateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.calculateShipping();
        });
        
        // フォーム自動保存
        const inputs = this.form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.saveFormData();
            });
        });
        
        // フォームデータ復元
        this.loadFormData();
    }
    
    async calculateShipping() {
        if (this.isCalculating) return;
        
        try {
            this.isCalculating = true;
            this.showCalculating();
            
            const formData = this.getFormData();
            
            // バリデーション
            const validation = this.validateFormData(formData);
            if (!validation.valid) {
                throw new Error(validation.message);
            }
            
            // Ajax 送料計算実行
            const result = await window.NAGANO3.ajax.request('calculate_shipping', formData);
            
            if (result.status === 'success') {
                this.displayResults(result.data);
                window.NAGANO3.ajax.showNotification('送料計算が完了しました', 'success');
            } else {
                throw new Error(result.message || '計算に失敗しました');
            }
            
        } catch (error) {
            console.error('送料計算エラー:', error);
            window.NAGANO3.ajax.showNotification(`計算エラー: ${error.message}`, 'error');
        } finally {
            this.isCalculating = false;
            this.hideCalculating();
        }
    }
    
    getFormData() {
        return {
            weight: parseFloat(this.form.querySelector('[name="weight"]')?.value || 0),
            length: parseFloat(this.form.querySelector('[name="length"]')?.value || 0),
            width: parseFloat(this.form.querySelector('[name="width"]')?.value || 0),
            height: parseFloat(this.form.querySelector('[name="height"]')?.value || 0),
            destination_zone: this.form.querySelector('[name="destination_zone"]')?.value || 'zone5a',
            marketplace: this.form.querySelector('[name="marketplace"]')?.value || 'shopify'
        };
    }
    
    validateFormData(data) {
        if (data.weight <= 0) {
            return { valid: false, message: '重量は0より大きい値を入力してください' };
        }
        if (data.length <= 0 || data.width <= 0 || data.height <= 0) {
            return { valid: false, message: '寸法は0より大きい値を入力してください' };
        }
        return { valid: true };
    }
    
    displayResults(data) {
        if (!this.resultContainer) return;
        
        const correctedWeight = data.corrected_weight;
        const options = data.shipping_options || [];
        const recommended = data.recommended;
        
        let html = `
            <div style="margin-bottom: 1.5rem;">
                <h3>計算結果サマリー</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 1rem 0;">
                    <div style="background: #f8fafc; padding: 1rem; border-radius: 6px; text-align: center;">
                        <div style="font-size: 0.875rem; color: #6b7280;">補正重量</div>
                        <div style="font-size: 1.25rem; font-weight: 600; color: #10b981;">${correctedWeight}g</div>
                    </div>
                    <div style="background: #f8fafc; padding: 1rem; border-radius: 6px; text-align: center;">
                        <div style="font-size: 0.875rem; color: #6b7280;">配送オプション</div>
                        <div style="font-size: 1.25rem; font-weight: 600; color: #10b981;">${options.length}件</div>
                    </div>
                    <div style="background: #f8fafc; padding: 1rem; border-radius: 6px; text-align: center;">
                        <div style="font-size: 0.875rem; color: #6b7280;">配送先</div>
                        <div style="font-size: 1.25rem; font-weight: 600; color: #10b981;">${data.input.destination_zone}</div>
                    </div>
                </div>
            </div>
        `;
        
        if (options.length > 0) {
            html += `
                <h3>配送オプション比較（料金順）</h3>
                <div style="display: grid; gap: 1rem;">
            `;
            
            options.forEach((option, index) => {
                const isRecommended = recommended && option.carrier_code === recommended.carrier_code;
                html += `
                    <div style="background: ${isRecommended ? '#f0fdf4' : '#ffffff'}; border: 1px solid ${isRecommended ? '#10b981' : '#e5e7eb'}; border-radius: 6px; padding: 1rem; position: relative;">
                        ${isRecommended ? '<div style="position: absolute; top: -8px; right: 10px; background: #10b981; color: white; padding: 2px 8px; font-size: 0.75rem; border-radius: 4px;">推奨</div>' : ''}
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 1rem; align-items: center;">
                            <div>
                                <div style="font-weight: 600; font-size: 1rem;">${option.carrier_name}</div>
                                <div style="font-size: 0.875rem; color: #6b7280;">${option.carrier_code}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 1.25rem; font-weight: 600; color: #10b981;">$${option.total_cost}</div>
                                <div style="font-size: 0.75rem; color: #6b7280;">基本 ${option.base_cost}</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-weight: 600;">${option.delivery_days}</div>
                                <div style="font-size: 0.75rem; color: #6b7280;">配送日数</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                                    ${option.tracking ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">追跡</span>' : ''}
                                    ${option.insurance ? '<span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">保険</span>' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        } else {
            html += '<p style="color: #6b7280;">利用可能な配送オプションがありません。</p>';
        }
        
        this.resultContainer.innerHTML = html;
        this.resultContainer.style.display = 'block';
        
        // 結果エリアにスムーズスクロール
        this.resultContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    showCalculating() {
        const btnText = document.getElementById('btnText');
        const btnLoader = document.getElementById('btnLoader');
        
        if (btnText && btnLoader) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline';
        }
        
        if (this.calculateBtn) {
            this.calculateBtn.disabled = true;
        }
    }
    
    hideCalculating() {
        const btnText = document.getElementById('btnText');
        const btnLoader = document.getElementById('btnLoader');
        
        if (btnText && btnLoader) {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
        
        if (this.calculateBtn) {
            this.calculateBtn.disabled = false;
        }
    }
    
    saveFormData() {
        try {
            const formData = this.getFormData();
            localStorage.setItem('souryou_keisan_form', JSON.stringify(formData));
        } catch (error) {
            console.warn('フォームデータ保存に失敗:', error);
        }
    }
    
    loadFormData() {
        try {
            const saved = localStorage.getItem('souryou_keisan_form');
            if (saved) {
                const data = JSON.parse(saved);
                Object.keys(data).forEach(key => {
                    const input = this.form.querySelector(`[name="${key}"]`);
                    if (input && data[key]) {
                        input.value = data[key];
                    }
                });
            }
        } catch (error) {
            console.warn('フォームデータ読み込みに失敗:', error);
        }
    }
}

// エラーハンドリング強化
class NAGANO3_ErrorHandler {
    static init() {
        // グローバルエラーハンドラー
        window.addEventListener('error', function(event) {
            console.error('🚨 JavaScript エラー:', event.error);
            
            if (window.NAGANO3 && window.NAGANO3.ajax) {
                window.NAGANO3.ajax.showNotification('システムエラーが発生しました', 'error');
            }
        });
        
        // Promise拒否ハンドラー
        window.addEventListener('unhandledrejection', function(event) {
            console.error('🚨 Promise拒否:', event.reason);
            
            if (window.NAGANO3 && window.NAGANO3.ajax) {
                window.NAGANO3.ajax.showNotification('通信エラーが発生しました', 'warning');
            }
        });
    }
    
    static logError(context, error) {
        const errorInfo = {
            context: context,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            url: window.location.href
        };
        
        console.error('NAGANO3 Error Log:', errorInfo);
        
        // 重要なエラーの場合はサーバーに送信
        if (window.NAGANO3 && window.NAGANO3.ajax) {
            window.NAGANO3.ajax.request('log_client_error', {
                error_info: JSON.stringify(errorInfo)
            }).catch(err => {
                console.warn('エラーログ送信失敗:', err);
            });
        }
    }
}

// グローバル登録
window.NAGANO3.ajax = new NAGANO3_Ajax();
window.NAGANO3.state = NAGANO3_StateManager;
window.NAGANO3.souryouKeisan = new SouryouKeisanSystem();
window.NAGANO3.errorHandler = NAGANO3_ErrorHandler;

// CSS アニメーション追加
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .nagano3-notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif;
    }
`;
document.head.appendChild(style);

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 NAGANO-3 JavaScript システム初期化開始');
    
    // 基本システム初期化
    NAGANO3_StateManager.init();
    NAGANO3_ErrorHandler.init();
    
    // 送料計算ページの場合のみ初期化
    if (document.getElementById('shippingCalculatorForm')) {
        window.NAGANO3.souryouKeisan.init();
    }
    
    console.log('✅ NAGANO-3 JavaScript システム初期化完了');
});

// 後方互換性のためのグローバル関数
function updateSidebarState(state) {
    NAGANO3_StateManager.updateSidebar(state);
}

function updateTheme(theme) {
    NAGANO3_StateManager.updateTheme(theme);
}

function executeShippingCalculation() {
    if (window.NAGANO3.souryouKeisan) {
        window.NAGANO3.souryouKeisan.calculateShipping();
    } else {
        console.error('❌ 送料計算システムが初期化されていません');
    }
}

// デバッグ用グローバル関数
window.NAGANO3_DEBUG = {
    testCalculation: () => {
        if (window.NAGANO3.souryouKeisan) {
            window.NAGANO3.souryouKeisan.calculateShipping();
        }
    },
    
    testNotification: (message = 'テスト通知', type = 'info') => {
        if (window.NAGANO3.ajax) {
            window.NAGANO3.ajax.showNotification(message, type);
        }
    },
    
    getConfig: () => {
        return window.NAGANO3_CONFIG;
    },
    
    healthCheck: async () => {
        try {
            const result = await window.NAGANO3.ajax.request('health_check');
            console.log('Health Check Result:', result);
            return result;
        } catch (error) {
            console.error('Health Check Failed:', error);
            return error;
        }
    }
};

console.log('📋 NAGANO-3 動的JavaScript生成完了 - 送料計算システム対応版');