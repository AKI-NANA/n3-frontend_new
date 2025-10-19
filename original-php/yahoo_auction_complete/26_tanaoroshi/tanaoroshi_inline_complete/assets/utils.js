// === N3準拠 棚卸しシステム ユーティリティ関数 ===
// ファイル: utils.js
// 作成日: 2025-08-17
// 目的: 汎用的なヘルパー関数の集約、特定機能に依存しない共通処理

/**
 * 商品タイプに対応するバッジテキストを取得
 * @param {string} type - 商品タイプ
 * @returns {string} バッジ表示用テキスト
 */
function getTypeBadgeText(type) {
    const badges = {
        stock: '有在庫',
        dropship: '無在庫', 
        set: 'セット品',
        hybrid: 'ハイブリッド'
    };
    return badges[type] || '不明';
}

/**
 * HTMLエスケープ処理（XSS防止）
 * @param {string} text - エスケープ対象文字列
 * @returns {string} エスケープ済み文字列
 */
function escapeHtml(text) {
    try {
        if (!text || typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    } catch (error) {
        console.warn('⚠️ N3警告: HTML エスケープ失敗:', error);
        return String(text || '');
    }
}

/**
 * 成功メッセージ表示
 * @param {string} message - 表示メッセージ
 */
function showSuccessMessage(message) {
    showToastN3(message, 'success');
}

/**
 * エラーメッセージ表示
 * @param {string} message - 表示メッセージ
 */
function showErrorMessage(message) {
    showToastN3(message, 'error');
}

/**
 * 情報メッセージ表示
 * @param {string} message - 表示メッセージ
 */
function showInfoMessage(message) {
    showToastN3(message, 'info');
}

/**
 * N3準拠 トースト通知表示
 * @param {string} message - 表示メッセージ
 * @param {string} type - 通知タイプ (success, error, info)
 */
function showToastN3(message, type = 'info') {
    try {
        const toast = document.createElement('div');
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };
        
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 15px 20px;
            background: ${colors[type]}; color: white; border-radius: 8px;
            z-index: 10000; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideInN3 0.3s ease-out; max-width: 400px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px; line-height: 1.4;
        `;
        
        // アイコン付きメッセージ
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">${icons[type]}</span>
                <span>[N3] ${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // 自動削除
        setTimeout(() => {
            toast.style.animation = 'slideOutN3 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 4000);
        
    } catch (error) {
        console.error('❌ N3エラー: トースト表示失敗:', error);
        // フォールバック: ブラウザ標準のalert
        alert(`[N3 ${type.toUpperCase()}] ${message}`);
    }
}

/**
 * ローディング表示制御
 * @param {boolean} show - 表示/非表示
 * @param {string} message - ローディングメッセージ
 */
function showLoadingN3(show, message = 'N3準拠 データ処理中...') {
    let loadingElement = document.getElementById('loading-overlay-n3');
    
    if (show) {
        if (!loadingElement) {
            loadingElement = document.createElement('div');
            loadingElement.id = 'loading-overlay-n3';
            loadingElement.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.6); display: flex;
                align-items: center; justify-content: center;
                z-index: 9999; color: white; font-size: 1.2rem;
                backdrop-filter: blur(4px); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;
            loadingElement.innerHTML = `
                <div style="text-align: center; background: rgba(255, 255, 255, 0.1); padding: 2rem; border-radius: 12px; backdrop-filter: blur(8px);">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <div>${message}</div>
                </div>
            `;
            document.body.appendChild(loadingElement);
        }
        loadingElement.style.display = 'flex';
    } else {
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
}

/**
 * 数値フォーマット（通貨表示用）
 * @param {number} value - フォーマット対象の数値
 * @param {string} currency - 通貨記号
 * @param {number} decimals - 小数点以下桁数
 * @returns {string} フォーマット済み文字列
 */
function formatCurrency(value, currency = '$', decimals = 2) {
    try {
        if (typeof value !== 'number' || isNaN(value)) {
            return `${currency}0.${'0'.repeat(decimals)}`;
        }
        return `${currency}${value.toFixed(decimals)}`;
    } catch (error) {
        console.warn('⚠️ N3警告: 通貨フォーマット失敗:', error);
        return `${currency}0.00`;
    }
}

/**
 * 数値フォーマット（千の位区切り）
 * @param {number} value - フォーマット対象の数値
 * @returns {string} フォーマット済み文字列
 */
function formatNumber(value) {
    try {
        if (typeof value !== 'number' || isNaN(value)) {
            return '0';
        }
        return value.toLocaleString();
    } catch (error) {
        console.warn('⚠️ N3警告: 数値フォーマット失敗:', error);
        return String(value || 0);
    }
}

/**
 * 日付フォーマット（日本語形式）
 * @param {Date|string} date - フォーマット対象の日付
 * @returns {string} フォーマット済み日付文字列
 */
function formatDateJP(date) {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        if (!(dateObj instanceof Date) || isNaN(dateObj)) {
            return new Date().toLocaleString('ja-JP');
        }
        return dateObj.toLocaleString('ja-JP');
    } catch (error) {
        console.warn('⚠️ N3警告: 日付フォーマット失敗:', error);
        return new Date().toLocaleString('ja-JP');
    }
}

/**
 * 配列の安全な操作（null/undefined対応）
 * @param {any} data - 配列として扱いたいデータ
 * @returns {Array} 安全な配列
 */
function ensureArray(data) {
    try {
        if (Array.isArray(data)) {
            return data;
        }
        if (data === null || data === undefined) {
            return [];
        }
        return [data];
    } catch (error) {
        console.warn('⚠️ N3警告: 配列変換失敗:', error);
        return [];
    }
}

/**
 * オブジェクトの安全な値取得
 * @param {Object} obj - オブジェクト
 * @param {string} path - プロパティパス (例: 'user.profile.name')
 * @param {any} defaultValue - デフォルト値
 * @returns {any} 取得した値またはデフォルト値
 */
function safeGet(obj, path, defaultValue = null) {
    try {
        if (!obj || typeof obj !== 'object') {
            return defaultValue;
        }
        
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current === null || current === undefined || !(key in current)) {
                return defaultValue;
            }
            current = current[key];
        }
        
        return current;
    } catch (error) {
        console.warn('⚠️ N3警告: 安全な値取得失敗:', error);
        return defaultValue;
    }
}

/**
 * 文字列の切り詰め（省略記号付き）
 * @param {string} text - 対象文字列
 * @param {number} maxLength - 最大長
 * @returns {string} 切り詰め済み文字列
 */
function truncateText(text, maxLength = 50) {
    try {
        if (!text || typeof text !== 'string') {
            return '';
        }
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + '...';
    } catch (error) {
        console.warn('⚠️ N3警告: 文字列切り詰め失敗:', error);
        return String(text || '');
    }
}

/**
 * データ検証（商品データ用）
 * @param {Object} item - 検証対象の商品データ
 * @returns {boolean} 有効性
 */
function validateProductData(item) {
    try {
        if (!item || typeof item !== 'object') {
            return false;
        }
        
        // 必須フィールドのチェック
        const requiredFields = ['id', 'title'];
        for (const field of requiredFields) {
            if (!(field in item) || item[field] === null || item[field] === undefined) {
                return false;
            }
        }
        
        // データ型チェック
        if (typeof item.id !== 'number' && typeof item.id !== 'string') {
            return false;
        }
        if (typeof item.title !== 'string' || item.title.trim() === '') {
            return false;
        }
        
        // オプションフィールドの型チェック
        if ('priceUSD' in item && typeof item.priceUSD !== 'number') {
            return false;
        }
        if ('stock' in item && typeof item.stock !== 'number') {
            return false;
        }
        
        return true;
    } catch (error) {
        console.warn('⚠️ N3警告: 商品データ検証失敗:', error);
        return false;
    }
}

/**
 * デバウンス関数（連続実行防止）
 * @param {Function} func - 実行する関数
 * @param {number} delay - 遅延時間（ms）
 * @returns {Function} デバウンス済み関数
 */
function debounce(func, delay = 300) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * スロットル関数（実行頻度制限）
 * @param {Function} func - 実行する関数
 * @param {number} limit - 制限時間（ms）
 * @returns {Function} スロットル済み関数
 */
function throttle(func, limit = 100) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// === CSS アニメーション定義 ===
function initializeUtilsCSS() {
    if (!document.getElementById('utils-css-n3')) {
        const style = document.createElement('style');
        style.id = 'utils-css-n3';
        style.textContent = `
            @keyframes slideInN3 {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutN3 {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            @keyframes fadeInN3 {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes fadeOutN3 {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.95); }
            }
        `;
        document.head.appendChild(style);
    }
}

// === 初期化 ===
document.addEventListener('DOMContentLoaded', function() {
    initializeUtilsCSS();
    console.log('✅ N3準拠 ユーティリティ関数 初期化完了');
});

// === モジュールエクスポート風の公開 ===
window.N3Utils = {
    getTypeBadgeText,
    escapeHtml,
    showSuccessMessage,
    showErrorMessage,
    showInfoMessage,
    showToastN3,
    showLoadingN3,
    formatCurrency,
    formatNumber,
    formatDateJP,
    ensureArray,
    safeGet,
    truncateText,
    validateProductData,
    debounce,
    throttle
};

console.log('📦 N3準拠 utils.js 読み込み完了 - ユーティリティ関数群利用可能');