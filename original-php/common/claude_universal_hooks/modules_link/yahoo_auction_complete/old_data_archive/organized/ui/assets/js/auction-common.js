/**
 * Yahoo Auction Tool - 共通JavaScript機能
 * 全ツール共通で使用される機能を提供
 * 
 * @version 1.0.0
 * @date 2025-09-15
 * @description ワークフロー管理・通知システム・API通信・N3統合機能
 */

// ================================
// ワークフロー管理システム
// ================================
class AuctionWorkflow {
    static workflowSteps = {
        1: { name: 'スクレイピング', url: '../02_scraping/scraping.php', icon: 'fas fa-spider' },
        2: { name: '商品承認', url: '../03_approval/approval.php', icon: 'fas fa-check-circle' },
        3: { name: '承認分析', url: '../04_analysis/analysis.php', icon: 'fas fa-chart-bar' },
        4: { name: 'データ編集', url: '../05_editing/editing.php', icon: 'fas fa-edit' },
        5: { name: '送料計算', url: '../06_calculation/calculation.php', icon: 'fas fa-calculator' },
        6: { name: 'フィルター', url: '../07_filters/filters.php', icon: 'fas fa-filter' },
        7: { name: '出品管理', url: '../08_listing/listing.php', icon: 'fas fa-store' },
        8: { name: '在庫管理', url: '../09_inventory/inventory.php', icon: 'fas fa-warehouse' }
    };

    /**
     * ワークフロー状態を取得
     */
    static async getWorkflowStatus() {
        try {
            const response = await fetch('../core/api_handler.php?action=get_workflow_status');
            const result = await response.json();
            
            if (result.success) {
                return result.data;
            }
            throw new Error(result.message || 'ワークフロー状態取得に失敗');
        } catch (error) {
            console.error('ワークフロー状態取得エラー:', error);
            return this.getDefaultWorkflowStatus();
        }
    }

    /**
     * デフォルトワークフロー状態
     */
    static getDefaultWorkflowStatus() {
        const status = {};
        Object.keys(this.workflowSteps).forEach(step => {
            status[step] = {
                name: this.workflowSteps[step].name,
                completed: false,
                count: 0,
                last_update: null
            };
        });
        return status;
    }

    /**
     * ワークフローデータ転送
     */
    static async transferData(fromStep, toStep, data = null) {
        try {
            const payload = {
                action: 'transfer_data',
                from_step: fromStep,
                to_step: toStep,
                data: data
            };

            const response = await fetch('../core/api_handler.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`データ転送完了: ステップ${fromStep} → ステップ${toStep}`, 'success');
                return result.data;
            }
            throw new Error(result.message);
        } catch (error) {
            console.error('データ転送エラー:', error);
            this.showNotification(`データ転送失敗: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * ワークフロー進行状況表示を更新
     */
    static async updateWorkflowDisplay() {
        const status = await this.getWorkflowStatus();
        const progressElement = document.getElementById('workflowProgress');
        
        if (progressElement) {
            progressElement.innerHTML = this.generateProgressHTML(status);
            this.attachProgressEvents();
        }

        // 統計更新
        this.updateWorkflowStats(status);
    }

    /**
     * ワークフロー進行状況HTML生成
     */
    static generateProgressHTML(status) {
        const stepEntries = Object.entries(status);
        const completedSteps = stepEntries.filter(([_, stepData]) => stepData.completed).length;
        const totalSteps = stepEntries.length;
        const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

        return `
            <div class="workflow-header">
                <h3><i class="fas fa-route"></i> ワークフロー進行状況</h3>
                <div class="workflow-stats">
                    <span class="progress-text">${completedSteps}/${totalSteps} 完了 (${Math.round(progress)}%)</span>
                </div>
            </div>
            <div class="workflow-progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="workflow-steps">
                ${stepEntries.map(([stepNum, stepData]) => `
                    <div class="workflow-step ${stepData.completed ? 'completed' : 'pending'}" data-step="${stepNum}">
                        <div class="step-indicator">
                            <i class="${this.workflowSteps[stepNum]?.icon || 'fas fa-circle'}"></i>
                            <span class="step-number">${stepNum}</span>
                        </div>
                        <div class="step-info">
                            <h4 class="step-name">${stepData.name}</h4>
                            <div class="step-details">
                                <span class="step-status ${stepData.completed ? 'completed' : 'pending'}">
                                    ${stepData.completed ? '✓ 完了' : '○ 待機中'}
                                </span>
                                ${stepData.count > 0 ? `<span class="step-count">${stepData.count}件</span>` : ''}
                            </div>
                            ${stepData.last_update ? `
                                <small class="step-timestamp">最終更新: ${this.formatDateTime(stepData.last_update)}</small>
                            ` : ''}
                        </div>
                        <div class="step-actions">
                            <button class="btn btn-sm btn-primary step-open-btn" data-url="${this.workflowSteps[stepNum]?.url || '#'}">
                                <i class="fas fa-external-link-alt"></i> 開く
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * 進行状況イベント設定
     */
    static attachProgressEvents() {
        // ステップ開くボタン
        document.querySelectorAll('.step-open-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.currentTarget.dataset.url;
                if (url && url !== '#') {
                    window.open(url, '_blank');
                }
            });
        });

        // ステップクリックでツール開く
        document.querySelectorAll('.workflow-step').forEach(step => {
            step.addEventListener('click', (e) => {
                if (e.target.closest('.step-actions')) return; // ボタンクリック時は除外
                
                const stepNum = step.dataset.step;
                const stepInfo = this.workflowSteps[stepNum];
                if (stepInfo) {
                    window.open(stepInfo.url, '_blank');
                }
            });
        });
    }

    /**
     * ワークフロー統計更新
     */
    static updateWorkflowStats(status) {
        const stats = this.calculateWorkflowStats(status);
        
        // 統計要素更新
        this.updateStatElement('totalSteps', stats.totalSteps);
        this.updateStatElement('completedSteps', stats.completedSteps);
        this.updateStatElement('pendingSteps', stats.pendingSteps);
        this.updateStatElement('totalItems', stats.totalItems);
        this.updateStatElement('completionRate', `${stats.completionRate}%`);
    }

    /**
     * 統計計算
     */
    static calculateWorkflowStats(status) {
        const stepEntries = Object.entries(status);
        const completedSteps = stepEntries.filter(([_, stepData]) => stepData.completed);
        const totalItems = stepEntries.reduce((sum, [_, stepData]) => sum + (stepData.count || 0), 0);
        
        return {
            totalSteps: stepEntries.length,
            completedSteps: completedSteps.length,
            pendingSteps: stepEntries.length - completedSteps.length,
            totalItems: totalItems,
            completionRate: stepEntries.length > 0 ? Math.round((completedSteps.length / stepEntries.length) * 100) : 0
        };
    }

    /**
     * 統計要素更新
     */
    static updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * 日時フォーマット
     */
    static formatDateTime(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * 通知システム
     */
    static showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `auction-notification notification-${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <i class="${icons[type] || icons.info}"></i>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // 通知コンテナがない場合は作成
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // 自動削除
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }

        return notification;
    }

    /**
     * 成功メッセージ表示（次ステップリンク付き）
     */
    static showSuccessMessage(message, nextStepUrl = null, currentStep = null) {
        let fullMessage = message;
        
        if (nextStepUrl && currentStep) {
            const nextStep = parseInt(currentStep) + 1;
            const nextStepInfo = this.workflowSteps[nextStep];
            if (nextStepInfo) {
                fullMessage += ` <a href="${nextStepUrl}" target="_blank" class="next-step-link">次: ${nextStepInfo.name}</a>`;
            }
        }
        
        const notification = this.showNotification(fullMessage, 'success', 8000);
        notification.classList.add('success-with-next');
        
        return notification;
    }
}

// ================================
// API通信管理システム
// ================================
class AuctionAPI {
    static baseUrl = '../core/api_handler.php';

    /**
     * 汎用API呼び出し
     */
    static async call(action, data = null, method = 'GET') {
        try {
            let url = `${this.baseUrl}?action=${action}`;
            let options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };

            if (method === 'POST' && data) {
                options.body = JSON.stringify(data);
            } else if (method === 'GET' && data) {
                const params = new URLSearchParams(data);
                url += `&${params.toString()}`;
            }

            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'API呼び出しに失敗しました');
            }

            return result.data;
        } catch (error) {
            console.error('API呼び出しエラー:', error);
            throw error;
        }
    }

    /**
     * データ取得
     */
    static async getData(step = null, filters = null) {
        const params = {};
        if (step) params.step = step;
        if (filters) Object.assign(params, filters);
        
        return await this.call('get_data', params);
    }

    /**
     * データ保存
     */
    static async saveData(step, data, status = 'completed') {
        return await this.call('save_data', { step, data, status }, 'POST');
    }

    /**
     * 検索
     */
    static async search(query, filters = null) {
        const params = { query };
        if (filters) Object.assign(params, filters);
        
        return await this.call('search', params);
    }

    /**
     * 統計取得
     */
    static async getStats(type = 'dashboard') {
        return await this.call('get_stats', { type });
    }
}

// ================================
// UI共通機能
// ================================
class AuctionUI {
    /**
     * ローディング表示
     */
    static showLoading(container, message = '読み込み中...') {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container) {
            container.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p class="loading-message">${message}</p>
                </div>
            `;
        }
    }

    /**
     * エラー表示
     */
    static showError(container, message, showRetry = true) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container) {
            container.innerHTML = `
                <div class="error-container">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>エラーが発生しました</h3>
                    <p class="error-message">${message}</p>
                    ${showRetry ? `
                        <div class="error-actions">
                            <button class="btn btn-primary" onclick="location.reload()">
                                <i class="fas fa-redo"></i> 再試行
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }

    /**
     * 空データ表示
     */
    static showEmpty(container, message = 'データがありません', actionButton = null) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container) {
            container.innerHTML = `
                <div class="empty-container">
                    <div class="empty-icon">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <h3>データなし</h3>
                    <p class="empty-message">${message}</p>
                    ${actionButton ? `
                        <div class="empty-actions">
                            ${actionButton}
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }

    /**
     * 確認ダイアログ
     */
    static confirm(message, title = '確認') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'auction-modal confirm-modal';
            modal.innerHTML = `
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary cancel-btn">キャンセル</button>
                        <button class="btn btn-primary confirm-btn">OK</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const confirmBtn = modal.querySelector('.confirm-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');
            const backdrop = modal.querySelector('.modal-backdrop');

            const cleanup = () => modal.remove();

            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            backdrop.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
        });
    }

    /**
     * テーブル初期化
     */
    static initializeTable(tableId, options = {}) {
        const table = document.getElementById(tableId);
        if (!table) return;

        // ソート機能
        if (options.sortable !== false) {
            this.addTableSorting(table);
        }

        // フィルタ機能
        if (options.filterable) {
            this.addTableFiltering(table, options.filterable);
        }

        // ページネーション
        if (options.pagination) {
            this.addTablePagination(table, options.pagination);
        }
    }

    /**
     * テーブルソート機能追加
     */
    static addTableSorting(table) {
        const headers = table.querySelectorAll('th[data-sortable]');
        
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const column = header.dataset.sortable;
                const currentOrder = header.dataset.order || 'asc';
                const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
                
                this.sortTable(table, column, newOrder);
                
                // ヘッダー状態更新
                headers.forEach(h => {
                    h.classList.remove('sort-asc', 'sort-desc');
                    delete h.dataset.order;
                });
                
                header.classList.add(`sort-${newOrder}`);
                header.dataset.order = newOrder;
            });
        });
    }

    /**
     * テーブルソート実行
     */
    static sortTable(table, column, order) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
            const aVal = a.querySelector(`[data-column="${column}"]`)?.textContent || '';
            const bVal = b.querySelector(`[data-column="${column}"]`)?.textContent || '';
            
            let comparison = 0;
            if (aVal < bVal) comparison = -1;
            if (aVal > bVal) comparison = 1;
            
            return order === 'desc' ? -comparison : comparison;
        });
        
        rows.forEach(row => tbody.appendChild(row));
    }

    /**
     * CSVダウンロード
     */
    static downloadCSV(data, filename) {
        if (!data || data.length === 0) {
            AuctionWorkflow.showNotification('ダウンロードするデータがありません', 'warning');
            return;
        }

        try {
            // CSV形式に変換
            const headers = Object.keys(data[0]);
            const csvRows = [
                headers.join(','), // ヘッダー行
                ...data.map(row => 
                    headers.map(header => {
                        const value = row[header] || '';
                        // カンマやダブルクォートを含む場合はエスケープ
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    }).join(',')
                )
            ];

            const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM付きUTF-8
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename || `data_${new Date().toISOString().slice(0, 10)}.csv`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            AuctionWorkflow.showNotification(`CSV ダウンロード完了: ${link.download}`, 'success');
        } catch (error) {
            console.error('CSV ダウンロードエラー:', error);
            AuctionWorkflow.showNotification('CSV ダウンロードに失敗しました', 'error');
        }
    }
}

// ================================
// ページ初期化
// ================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Auction Tool 共通システム初期化開始');
    
    try {
        // ワークフロー表示更新
        await AuctionWorkflow.updateWorkflowDisplay();
        
        // 共通イベントリスナー設定
        setupCommonEventListeners();
        
        // ページ固有の初期化
        if (typeof initializePage === 'function') {
            await initializePage();
        }
        
        console.log('✅ Auction Tool 共通システム初期化完了');
    } catch (error) {
        console.error('❌ 初期化エラー:', error);
        AuctionWorkflow.showNotification('システム初期化に失敗しました', 'error');
    }
});

/**
 * 共通イベントリスナー設定
 */
function setupCommonEventListeners() {
    // 自動更新ボタン
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            location.reload();
        });
    }

    // ヘルプボタン
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', showHelp);
    }

    // ショートカットキー
    document.addEventListener('keydown', (e) => {
        // Ctrl+R: リロード
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            location.reload();
        }
        
        // Ctrl+H: ヘルプ
        if (e.ctrlKey && e.key === 'h') {
            e.preventDefault();
            showHelp();
        }
    });
}

/**
 * ヘルプ表示
 */
function showHelp() {
    const modal = document.createElement('div');
    modal.className = 'auction-modal help-modal';
    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-question-circle"></i> ヘルプ</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <h4>キーボードショートカット</h4>
                <ul>
                    <li><kbd>Ctrl + R</kbd> - ページリロード</li>
                    <li><kbd>Ctrl + H</kbd> - ヘルプ表示</li>
                </ul>
                <h4>ワークフロー</h4>
                <ol>
                    <li>データ取得（スクレイピング）</li>
                    <li>商品承認</li>
                    <li>データ編集</li>
                    <li>送料計算</li>
                    <li>フィルター適用</li>
                    <li>出品管理</li>
                    <li>在庫管理</li>
                </ol>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary close-help">閉じる</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.close-help');
    const closeX = modal.querySelector('.modal-close');
    const backdrop = modal.querySelector('.modal-backdrop');

    const closeModal = () => modal.remove();

    closeBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
}

// ================================
// グローバル関数エクスポート
// ================================
window.AuctionWorkflow = AuctionWorkflow;
window.AuctionAPI = AuctionAPI;
window.AuctionUI = AuctionUI;

console.log('📦 Auction Tool 共通システム読み込み完了');
