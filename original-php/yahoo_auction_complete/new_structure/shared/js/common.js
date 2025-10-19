/**
 * 共通JavaScript機能
 * Yahoo Auction統合システム - shared 基盤
 */

// 共通ユーティリティ関数
window.CommonUtils = {
    
    /**
     * 通知表示
     */
    showNotification: function(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = this.getNotificationIcon(type);
        notification.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;
        
        // 既存の通知を削除
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }
        
        // 新しい通知を挿入
        const container = document.querySelector('.container');
        container.insertBefore(notification, container.firstChild);
        
        // 自動削除
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }
        
        return notification;
    },
    
    /**
     * 通知アイコン取得
     */
    getNotificationIcon: function(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    },
    
    /**
     * ローディング表示
     */
    showLoading: function(element, message = 'Loading...') {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (element) {
            element.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    ${message}
                </div>
            `;
        }
    },
    
    /**
     * 数値フォーマット（3桁区切り）
     */
    formatNumber: function(num) {
        if (num === null || num === undefined || isNaN(num)) {
            return '0';
        }
        return parseInt(num).toLocaleString();
    },
    
    /**
     * 日付フォーマット
     */
    formatDate: function(dateString, format = 'YYYY-MM-DD HH:mm') {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes);
    },
    
    /**
     * テキスト切り詰め
     */
    truncateText: function(text, maxLength = 50) {
        if (!text || text.length <= maxLength) {
            return text || '';
        }
        return text.substring(0, maxLength) + '...';
    },
    
    /**
     * HTMLエスケープ
     */
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * URLパラメータ取得
     */
    getUrlParam: function(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },
    
    /**
     * ローカルストレージ操作
     */
    storage: {
        set: function(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('LocalStorage save failed:', e);
                return false;
            }
        },
        
        get: function(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item !== null ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('LocalStorage load failed:', e);
                return defaultValue;
            }
        },
        
        remove: function(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('LocalStorage remove failed:', e);
                return false;
            }
        }
    },
    
    /**
     * 確認ダイアログ
     */
    confirm: function(message, callback) {
        if (window.confirm(message)) {
            if (typeof callback === 'function') {
                callback();
            }
            return true;
        }
        return false;
    },
    
    /**
     * 遅延実行
     */
    debounce: function(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    },
    
    /**
     * ステータス表示更新
     */
    updateStatus: function(message, type = 'info') {
        const statusArea = document.getElementById('statusArea');
        if (statusArea) {
            const icon = this.getNotificationIcon(type);
            statusArea.innerHTML = `
                <div class="status-info">
                    <i class="${icon}"></i>
                    ${message}
                </div>
            `;
        }
    },
    
    /**
     * CSVダウンロード
     */
    downloadCSV: function(data, filename) {
        const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
};

// ページ読み込み完了時の共通初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('共通JavaScript初期化完了');
    
    // モーダルクローズイベント
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-close')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }
        
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const visibleModal = document.querySelector('.modal[style*="block"]');
            if (visibleModal) {
                visibleModal.style.display = 'none';
            }
        }
    });
});