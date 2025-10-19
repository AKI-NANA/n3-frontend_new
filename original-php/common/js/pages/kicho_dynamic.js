
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
 * 記帳動的化システム - kicho_dynamic.js
 * 保存場所: /common/js/pages/kicho_dynamic.js
 * 
 * 機能:
 * - 動的フォーム生成・管理
 * - リアルタイム計算・検証
 * - Ajax通信による即座保存
 * - data-action属性対応
 */

class KichoDynamicSystem {
    constructor() {
        this.currentEntries = [];
        this.autoSaveTimer = null;
        this.validationRules = {};
        this.calculationEngine = new KichoCalculationEngine();
        
        this.init();
    }
    
    init() {
        console.log('🎯 記帳動的化システム初期化開始');
        
        // DOMContentLoaded確保
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupSystem());
        } else {
            this.setupSystem();
        }
    }
    
    setupSystem() {
        this.setupEventListeners();
        this.setupDataActionHandlers();
        this.setupAutoSave();
        this.setupValidation();
        this.loadExistingData();
        
        console.log('✅ 記帳動的化システム初期化完了');
    }
    
    // ===========================================
    // data-action ハンドラー設定
    // ===========================================
    setupDataActionHandlers() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            e.preventDefault();
            
            const action = target.getAttribute('data-action');
            const page = target.getAttribute('data-page') || 'kicho_content';
            
            console.log(`🔄 Data-Action実行: ${action}`);
            
            switch(action) {
                case 'add-entry':
                    this.addNewEntry();
                    break;
                case 'save-entry':
                    this.saveEntry(target);
                    break;
                case 'delete-entry':
                    this.deleteEntry(target);
                    break;
                case 'calculate-totals':
                    this.calculateTotals();
                    break;
                case 'export-data':
                    this.exportData();
                    break;
                case 'import-data':
                    this.importData();
                    break;
                case 'validate-entry':
                    this.validateEntry(target);
                    break;
                case 'auto-complete':
                    this.showAutoComplete(target);
                    break;
                default:
                    this.handleCustomAction(action, target, page);
            }
        });
    }
    
    // ===========================================
    // 動的エントリ管理
    // ===========================================
    addNewEntry() {
        const entryId = `entry_${Date.now()}`;
        const entryHtml = this.generateEntryHtml(entryId);
        
        const container = document.querySelector('#kicho-entries-container');
        if (!container) {
            console.error('❌ エントリコンテナが見つかりません');
            return;
        }
        
        container.insertAdjacentHTML('beforeend', entryHtml);
        
        // 新エントリの初期化
        this.initializeEntry(entryId);
        
        // 自動フォーカス
        const newEntry = document.querySelector(`[data-entry-id="${entryId}"]`);
        const firstInput = newEntry.querySelector('input, select');
        if (firstInput) firstInput.focus();
        
        console.log(`✅ 新エントリ追加: ${entryId}`);
    }
    
    generateEntryHtml(entryId) {
        return `
        <div class="kicho-entry" data-entry-id="${entryId}">
            <div class="entry-header">
                <span class="entry-number">#${this.currentEntries.length + 1}</span>
                <button type="button" data-action="delete-entry" data-entry-id="${entryId}" class="btn-delete">
                    削除
                </button>
            </div>
            
            <div class="entry-fields">
                <div class="field-group">
                    <label>日付</label>
                    <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}" 
                           data-field="date" data-validate="required,date">
                </div>
                
                <div class="field-group">
                    <label>勘定科目</label>
                    <select name="account" data-field="account" data-validate="required" data-action="auto-complete">
                        <option value="">選択してください</option>
                        <option value="cash">現金</option>
                        <option value="bank">普通預金</option>
                        <option value="sales">売上</option>
                        <option value="expense">経費</option>
                    </select>
                </div>
                
                <div class="field-group">
                    <label>摘要</label>
                    <input type="text" name="description" data-field="description" 
                           data-validate="required" data-action="auto-complete" 
                           placeholder="取引内容を入力">
                </div>
                
                <div class="field-group">
                    <label>借方金額</label>
                    <input type="number" name="debit" data-field="debit" 
                           data-validate="numeric" data-calculate="total"
                           placeholder="0">
                </div>
                
                <div class="field-group">
                    <label>貸方金額</label>
                    <input type="number" name="credit" data-field="credit" 
                           data-validate="numeric" data-calculate="total"
                           placeholder="0">
                </div>
                
                <div class="field-group">
                    <button type="button" data-action="save-entry" data-entry-id="${entryId}" class="btn-save">
                        保存
                    </button>
                    <button type="button" data-action="validate-entry" data-entry-id="${entryId}" class="btn-validate">
                        検証
                    </button>
                </div>
            </div>
            
            <div class="entry-status" data-status="new">
                <span class="status-indicator">新規</span>
                <span class="validation-messages"></span>
            </div>
        </div>
        `;
    }
    
    initializeEntry(entryId) {
        const entry = document.querySelector(`[data-entry-id="${entryId}"]`);
        if (!entry) return;
        
        // リアルタイム計算設定
        const calculationFields = entry.querySelectorAll('[data-calculate]');
        calculationFields.forEach(field => {
            field.addEventListener('input', () => this.handleCalculation(entryId));
        });
        
        // リアルタイム検証設定
        const validationFields = entry.querySelectorAll('[data-validate]');
        validationFields.forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => this.clearFieldError(field));
        });
        
        this.currentEntries.push({
            id: entryId,
            status: 'new',
            data: {},
            lastModified: new Date()
        });
    }
    
    // ===========================================
    // Ajax通信システム
    // ===========================================
    async saveEntry(target) {
        const entryId = target.getAttribute('data-entry-id');
        const entryData = this.collectEntryData(entryId);
        
        if (!this.validateEntryData(entryData)) {
            this.showError('入力データに問題があります');
            return;
        }
        
        this.showLoading(entryId, '保存中...');
        
        try {
            const response = await this.sendAjaxRequest('save-entry', {
                entry_id: entryId,
                entry_data: entryData
            });
            
            if (response.success) {
                this.updateEntryStatus(entryId, 'saved');
                this.showSuccess('保存完了');
                console.log(`✅ エントリ保存成功: ${entryId}`);
            } else {
                throw new Error(response.message || '保存に失敗しました');
            }
        } catch (error) {
            this.showError(`保存エラー: ${error.message}`);
            console.error('❌ 保存エラー:', error);
        } finally {
            this.hideLoading(entryId);
        }
    }
    
    async deleteEntry(target) {
        const entryId = target.getAttribute('data-entry-id');
        
        if (!confirm('このエントリを削除しますか？')) {
            return;
        }
        
        this.showLoading(entryId, '削除中...');
        
        try {
            const response = await this.sendAjaxRequest('delete-entry', {
                entry_id: entryId
            });
            
            if (response.success) {
                this.removeEntryFromDOM(entryId);
                this.removeEntryFromMemory(entryId);
                this.showSuccess('削除完了');
                console.log(`✅ エントリ削除成功: ${entryId}`);
            } else {
                throw new Error(response.message || '削除に失敗しました');
            }
        } catch (error) {
            this.showError(`削除エラー: ${error.message}`);
            console.error('❌ 削除エラー:', error);
        } finally {
            this.hideLoading(entryId);
        }
    }
    
    async sendAjaxRequest(action, data = {}) {
        const requestData = {
            ajax: 1,
            page: 'kicho_content',
            action: action,
            ...data
        };
        
        const response = await fetch('/index.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: new URLSearchParams(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    // ===========================================
    // リアルタイム計算システム
    // ===========================================
    handleCalculation(entryId) {
        const entry = document.querySelector(`[data-entry-id="${entryId}"]`);
        if (!entry) return;
        
        const debitField = entry.querySelector('[data-field="debit"]');
        const creditField = entry.querySelector('[data-field="credit"]');
        
        const debitValue = parseFloat(debitField.value) || 0;
        const creditValue = parseFloat(creditField.value) || 0;
        
        // 貸借平衡チェック
        const balance = debitValue - creditValue;
        
        this.updateBalanceDisplay(entryId, balance);
        this.calculateGrandTotals();
    }
    
    updateBalanceDisplay(entryId, balance) {
        const entry = document.querySelector(`[data-entry-id="${entryId}"]`);
        let balanceDisplay = entry.querySelector('.balance-display');
        
        if (!balanceDisplay) {
            balanceDisplay = document.createElement('div');
            balanceDisplay.className = 'balance-display';
            entry.querySelector('.entry-fields').appendChild(balanceDisplay);
        }
        
        if (balance === 0) {
            balanceDisplay.innerHTML = '<span class="balance-ok">✅ 貸借平衡</span>';
        } else {
            balanceDisplay.innerHTML = `<span class="balance-error">⚠️ 差額: ${balance.toLocaleString()}円</span>`;
        }
    }
    
    calculateGrandTotals() {
        let totalDebit = 0;
        let totalCredit = 0;
        
        document.querySelectorAll('.kicho-entry').forEach(entry => {
            const debit = parseFloat(entry.querySelector('[data-field="debit"]').value) || 0;
            const credit = parseFloat(entry.querySelector('[data-field="credit"]').value) || 0;
            
            totalDebit += debit;
            totalCredit += credit;
        });
        
        this.updateGrandTotalDisplay(totalDebit, totalCredit);
    }
    
    updateGrandTotalDisplay(totalDebit, totalCredit) {
        let totalDisplay = document.querySelector('#grand-totals');
        
        if (!totalDisplay) {
            totalDisplay = document.createElement('div');
            totalDisplay.id = 'grand-totals';
            totalDisplay.className = 'grand-totals';
            
            const container = document.querySelector('#kicho-entries-container');
            container.parentNode.insertBefore(totalDisplay, container.nextSibling);
        }
        
        const balance = totalDebit - totalCredit;
        const balanceClass = balance === 0 ? 'balanced' : 'unbalanced';
        
        totalDisplay.innerHTML = `
            <div class="totals-header">合計</div>
            <div class="total-item">借方合計: ${totalDebit.toLocaleString()}円</div>
            <div class="total-item">貸方合計: ${totalCredit.toLocaleString()}円</div>
            <div class="total-balance ${balanceClass}">
                差額: ${balance.toLocaleString()}円 ${balance === 0 ? '✅' : '⚠️'}
            </div>
        `;
    }
    
    // ===========================================
    // バリデーションシステム
    // ===========================================
    validateField(field) {
        const validateRules = field.getAttribute('data-validate');
        if (!validateRules) return true;
        
        const rules = validateRules.split(',');
        const value = field.value.trim();
        
        for (const rule of rules) {
            if (!this.executeValidationRule(rule.trim(), value, field)) {
                this.showFieldError(field, `${rule}の検証に失敗しました`);
                return false;
            }
        }
        
        this.clearFieldError(field);
        return true;
    }
    
    executeValidationRule(rule, value, field) {
        switch (rule) {
            case 'required':
                return value !== '';
            case 'numeric':
                return value === '' || !isNaN(value);
            case 'date':
                return value === '' || !isNaN(Date.parse(value));
            default:
                return true;
        }
    }
    
    showFieldError(field, message) {
        field.classList.add('field-error');
        
        let errorDiv = field.parentNode.querySelector('.field-error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'field-error-message';
            field.parentNode.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
    }
    
    clearFieldError(field) {
        field.classList.remove('field-error');
        
        const errorDiv = field.parentNode.querySelector('.field-error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
    
    // ===========================================
    // 自動保存システム
    // ===========================================
    setupAutoSave() {
        document.addEventListener('input', (e) => {
            if (e.target.closest('.kicho-entry')) {
                this.scheduleAutoSave();
            }
        });
    }
    
    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            this.executeAutoSave();
        }, 5000); // 5秒後に自動保存
    }
    
    async executeAutoSave() {
        const unsavedEntries = this.currentEntries.filter(entry => entry.status === 'modified');
        
        if (unsavedEntries.length === 0) return;
        
        console.log(`🔄 自動保存実行: ${unsavedEntries.length}件`);
        
        for (const entry of unsavedEntries) {
            try {
                const entryData = this.collectEntryData(entry.id);
                await this.sendAjaxRequest('auto-save-entry', {
                    entry_id: entry.id,
                    entry_data: entryData
                });
                
                this.updateEntryStatus(entry.id, 'auto-saved');
            } catch (error) {
                console.error(`❌ 自動保存エラー (${entry.id}):`, error);
            }
        }
    }
    
    // ===========================================
    // ユーティリティ関数
    // ===========================================
    collectEntryData(entryId) {
        const entry = document.querySelector(`[data-entry-id="${entryId}"]`);
        if (!entry) return null;
        
        const data = {};
        const fields = entry.querySelectorAll('[data-field]');
        
        fields.forEach(field => {
            const fieldName = field.getAttribute('data-field');
            data[fieldName] = field.value;
        });
        
        return data;
    }
    
    updateEntryStatus(entryId, status) {
        const entryIndex = this.currentEntries.findIndex(e => e.id === entryId);
        if (entryIndex !== -1) {
            this.currentEntries[entryIndex].status = status;
            this.currentEntries[entryIndex].lastModified = new Date();
        }
        
        const statusElement = document.querySelector(`[data-entry-id="${entryId}"] .status-indicator`);
        if (statusElement) {
            statusElement.textContent = this.getStatusText(status);
            statusElement.className = `status-indicator status-${status}`;
        }
    }
    
    getStatusText(status) {
        const statusMap = {
            'new': '新規',
            'modified': '変更済',
            'saved': '保存済',
            'auto-saved': '自動保存',
            'error': 'エラー'
        };
        
        return statusMap[status] || status;
    }
    
    showLoading(entryId, message) {
        const entry = document.querySelector(`[data-entry-id="${entryId}"]`);
        if (!entry) return;
        
        let loadingDiv = entry.querySelector('.loading-overlay');
        if (!loadingDiv) {
            loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-overlay';
            entry.appendChild(loadingDiv);
        }
        
        loadingDiv.innerHTML = `<div class="loading-spinner"></div><div class="loading-text">${message}</div>`;
        loadingDiv.style.display = 'flex';
    }
    
    hideLoading(entryId) {
        const entry = document.querySelector(`[data-entry-id="${entryId}"]`);
        const loadingDiv = entry?.querySelector('.loading-overlay');
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // カスタムアクション処理
    handleCustomAction(action, target, page) {
        console.log(`🔄 カスタムアクション: ${action}`);
        
        // 他のdata-actionに対応
        this.sendAjaxRequest(action, {
            element_id: target.id,
            additional_data: target.dataset
        }).then(response => {
            console.log(`✅ カスタムアクション完了: ${action}`, response);
        }).catch(error => {
            console.error(`❌ カスタムアクションエラー: ${action}`, error);
        });
    }
}

// 計算エンジンクラス
class KichoCalculationEngine {
    constructor() {
        this.taxRate = 0.1; // 10%
    }
    
    calculateTax(amount) {
        return Math.floor(amount * this.taxRate);
    }
    
    calculateBalance(debit, credit) {
        return debit - credit;
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY'
        }).format(amount);
    }
}

// 自動初期化
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('#kicho-entries-container') || 
        document.querySelector('[data-page="kicho_content"]')) {
        window.kichoDynamicSystem = new KichoDynamicSystem();
        console.log('🎯 記帳動的化システム起動完了');
    }
});