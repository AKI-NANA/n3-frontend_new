/**
 * Yahoo Auction Tool - 完全統合版（既存機能保持+新機能追加）
 * 既存の高機能出品システムを完全に保持し、新しいタブ管理・API連携・通知機能を追加
 */

// ===========================================
// 既存のグローバル変数・設定を保持
// ===========================================
let currentCSVData = [];
let selectedPreset = 'premium';
let listingInProgress = false;
let currentListingResults = null;

// 新機能用変数追加
let yaController = null;
let activeTabName = 'dashboard';

// 統合設定オブジェクト
const CONFIG = {
    api: {
        baseUrl: window.location.pathname,
        timeout: 30000,
        retryAttempts: 3
    },
    ui: {
        progressUpdateInterval: 1000,
        animationDuration: 300,
        toastDuration: 4000
    },
    listing: {
        defaultDelay: 2000,
        maxBatchSize: 20,
        templateTypes: ['premium', 'clean', 'luxury']
    }
};

// ===========================================
// 既存のユーティリティ関数を保持
// ===========================================
const Utils = {
    // ログ出力（レベル付き）
    log: (message, level = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        console.log(logEntry);
        
        // UIログ表示（もし存在すれば）
        const logSection = document.getElementById('logSection');
        if (logSection) {
            const logElement = document.createElement('div');
            logElement.className = 'log-entry';
            logElement.innerHTML = `
                <span class="log-timestamp">[${timestamp}]</span>
                <span class="log-level ${level}">${level.toUpperCase()}</span>
                <span>${message}</span>
            `;
            logSection.appendChild(logElement);
            logSection.scrollTop = logSection.scrollHeight;
        }
    },

    // 数値フォーマット（カンマ区切り）
    formatNumber: (num) => {
        return new Intl.NumberFormat().format(num);
    },

    // 時間フォーマット
    formatTime: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    // セーフHTML
    escapeHtml: (unsafe) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    // 要素の表示/非表示
    toggleElement: (elementId, show) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    },

    // アニメーション付き要素切り替え
    animateToggle: (elementId, show, className = 'fade-slide-in') => {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (show) {
            element.style.display = 'block';
            element.classList.add(className);
            setTimeout(() => element.classList.remove(className), CONFIG.ui.animationDuration);
        } else {
            element.classList.add('fade-out');
            setTimeout(() => {
                element.style.display = 'none';
                element.classList.remove('fade-out');
            }, CONFIG.ui.animationDuration);
        }
    }
};

// ===========================================
// 新機能: タブ管理システム
// ===========================================
const TabManager = {
    init() {
        this.setupTabListeners();
        Utils.log('TabManager初期化完了');
    },

    setupTabListeners() {
        // 既存のswitchTab関数と統合
        const originalSwitchTab = window.switchTab;
        window.switchTab = (tabName) => {
            // 既存の処理を実行
            if (originalSwitchTab) {
                originalSwitchTab(tabName);
            }
            
            // 新機能を追加
            this.handleTabSwitch(tabName);
        };
    },

    handleTabSwitch(tabName) {
        activeTabName = tabName;
        
        // タブ固有の初期化処理
        switch(tabName) {
            case 'dashboard':
                if (yaController) yaController.loadDashboardData();
                break;
            case 'approval':
                if (yaController) yaController.loadApprovalData();
                break;
            case 'filters':
                this.initializeFilterSystem();
                break;
            case 'inventory-mgmt':
                this.loadInventoryData();
                break;
            case 'listing':
                // 既存の出品システムを使用
                break;
        }
        
        Utils.log(`タブ切り替え完了: ${tabName}`);
        ToastManager.show(`${tabName}タブを表示しました`, 'info');
    },

    initializeFilterSystem() {
        // 禁止キーワード管理システムの初期化
        this.loadFilterKeywords();
        this.setupRealtimeCheck();
    },

    async loadFilterKeywords() {
        // フィルターキーワードをAPIから取得
        try {
            const response = await fetch(CONFIG.api.baseUrl + '?action=get_filters');
            if (response.ok) {
                const data = await response.json();
                this.displayFilterTable(data.data || []);
            }
        } catch (error) {
            Utils.log('フィルターデータ読み込みエラー: ' + error.message, 'error');
        }
    },

    displayFilterTable(keywords) {
        const tbody = document.getElementById('keywordTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = keywords.map(keyword => `
            <tr>
                <td><input type="checkbox" class="keyword-checkbox" data-id="${keyword.id}"></td>
                <td>${keyword.id}</td>
                <td class="keyword-text">${Utils.escapeHtml(keyword.keyword)}</td>
                <td><span class="category-badge category-${keyword.category}">${keyword.category}</span></td>
                <td><span class="priority-badge priority-${keyword.priority}">${keyword.priority_text}</span></td>
                <td>${keyword.detection_count}</td>
                <td>${keyword.created_date}</td>
                <td>${keyword.last_detected}</td>
                <td><span class="status-badge status-${keyword.status}">${keyword.status_text}</span></td>
                <td>
                    <button class="btn-sm btn-warning" onclick="editKeyword(${keyword.id})">編集</button>
                    <button class="btn-sm btn-danger" onclick="deleteKeyword(${keyword.id})">削除</button>
                </td>
            </tr>
        `).join('');
    },

    setupRealtimeCheck() {
        const titleInput = document.getElementById('titleCheckInput');
        if (titleInput) {
            titleInput.addEventListener('input', this.checkTitleRealtime.bind(this));
        }
    },

    checkTitleRealtime() {
        const titleInput = document.getElementById('titleCheckInput');
        const resultDiv = document.getElementById('titleCheckResult');
        
        if (!titleInput || !resultDiv) return;
        
        const title = titleInput.value.trim();
        if (!title) {
            resultDiv.innerHTML = '<div class="result-placeholder"><i class="fas fa-info-circle"></i>商品タイトルを入力してチェック...</div>';
            return;
        }
        
        // 簡易チェック（実際のAPIに置き換え可能）
        const warnings = this.performBasicCheck(title);
        
        if (warnings.length === 0) {
            resultDiv.innerHTML = `
                <div class="check-result-safe">
                    <i class="fas fa-check-circle"></i>
                    <span>問題のあるキーワードは検出されませんでした</span>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="check-result-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="warning-list">
                        ${warnings.map(warning => `<div class="warning-item">${warning}</div>`).join('')}
                    </div>
                </div>
            `;
        }
    },

    performBasicCheck(title) {
        const warnings = [];
        const lowerTitle = title.toLowerCase();
        
        // 基本的な禁止キーワードチェック
        const bannedWords = ['fake', 'replica', 'counterfeit', '偽物', 'コピー', 'レプリカ'];
        bannedWords.forEach(word => {
            if (lowerTitle.includes(word.toLowerCase())) {
                warnings.push(`禁止キーワード: ${word}`);
            }
        });
        
        // 長さチェック
        if (title.length > 255) {
            warnings.push('タイトルが長すぎます（255文字制限）');
        }
        
        return warnings;
    },

    loadInventoryData() {
        // 在庫データの読み込み
        Utils.log('在庫データ読み込み開始');
        // 実装は省略（必要に応じて追加）
    }
};

// ===========================================
// 新機能: API管理システム
// ===========================================
const APIManager = {
    async request(action, data = {}) {
        const requestData = {
            action: action,
            ...data
        };

        try {
            const response = await fetch(CONFIG.api.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'APIエラーが発生しました');
            }

            return result;
        } catch (error) {
            Utils.log('API リクエストエラー: ' + error.message, 'error');
            throw error;
        }
    },

    async getDashboardStats() {
        return await this.request('get_dashboard_stats');
    },

    async getApprovalQueue() {
        return await this.request('get_approval_queue');
    },

    async searchProducts(query) {
        return await this.request('search_products', { query });
    }
};

// ===========================================
// 新機能: トースト通知システム
// ===========================================
const ToastManager = {
    init() {
        this.createToastContainer();
        Utils.log('ToastManager初期化完了');
    },

    createToastContainer() {
        if (!document.getElementById('toastContainer')) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 350px;
            `;
            document.body.appendChild(container);
        }
    },

    show(message, type = 'info', duration = CONFIG.ui.toastDuration) {
        const toastId = 'toast_' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast toast-${type}`;
        
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${icons[type] || icons.info}"></i>
                <span>${Utils.escapeHtml(message)}</span>
            </div>
            <button class="toast-close" onclick="ToastManager.hide('${toastId}')">&times;</button>
        `;
        
        // スタイル適用
        toast.style.cssText = `
            background: var(--bg-secondary, #ffffff);
            border: 1px solid var(--border-color, #e2e8f0);
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        // タイプ別色設定
        const colors = {
            info: '#3b82f6',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444'
        };
        toast.style.borderLeftColor = colors[type] || colors.info;
        toast.style.borderLeftWidth = '4px';
        
        document.getElementById('toastContainer').appendChild(toast);
        
        // アニメーション
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // 自動削除
        if (duration > 0) {
            setTimeout(() => this.hide(toastId), duration);
        }
        
        return toastId;
    },

    hide(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }
    }
};

// ===========================================
// 新機能: Yahoo Auction Controller（メイン制御）
// ===========================================
class YahooAuctionController {
    constructor() {
        this.isInitialized = false;
        this.dashboardStats = null;
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            Utils.log('YahooAuctionController初期化開始');
            
            // 初期データ読み込み
            await this.loadInitialData();
            
            this.isInitialized = true;
            Utils.log('YahooAuctionController初期化完了');
            ToastManager.show('システム初期化完了', 'success');
            
        } catch (error) {
            Utils.log('YahooAuctionController初期化エラー: ' + error.message, 'error');
            ToastManager.show('システム初期化に失敗しました', 'error');
        }
    }

    async loadInitialData() {
        // 初期統計データ読み込み
        try {
            const stats = await APIManager.getDashboardStats();
            this.dashboardStats = stats.data;
            this.updateDashboardUI(stats.data);
        } catch (error) {
            Utils.log('初期データ読み込みエラー: ' + error.message, 'warning');
        }
    }

    async loadDashboardData() {
        try {
            const stats = await APIManager.getDashboardStats();
            this.dashboardStats = stats.data;
            this.updateDashboardUI(stats.data);
            ToastManager.show('ダッシュボードを更新しました', 'info');
        } catch (error) {
            Utils.log('ダッシュボードデータエラー: ' + error.message, 'error');
            ToastManager.show('ダッシュボード更新に失敗しました', 'error');
        }
    }

    updateDashboardUI(stats) {
        // 統計値更新
        const statElements = {
            'totalRecords': stats.total_records,
            'scrapedCount': stats.scraped_count,
            'calculatedCount': stats.calculated_count,
            'filteredCount': stats.filtered_count,
            'readyCount': stats.ready_count,
            'listedCount': stats.listed_count
        };

        Object.entries(statElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && value !== undefined) {
                element.textContent = Utils.formatNumber(value);
            }
        });
    }

    async loadApprovalData() {
        try {
            const approvalData = await APIManager.getApprovalQueue();
            this.displayApprovalProducts(approvalData.data);
            ToastManager.show('承認待ち商品を更新しました', 'info');
        } catch (error) {
            Utils.log('承認データエラー: ' + error.message, 'error');
            ToastManager.show('承認データ更新に失敗しました', 'error');
        }
    }

    displayApprovalProducts(products) {
        const grid = document.getElementById('approval-product-grid');
        if (!grid || !Array.isArray(products)) return;

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="no-data-container">
                    <div class="no-data-icon"><i class="fas fa-inbox"></i></div>
                    <h3>承認待ち商品がありません</h3>
                    <p>現在、承認が必要な商品はありません。</p>
                </div>
            `;
            return;
        }

        const productsHTML = products.map(product => `
            <div class="approval-product-card" data-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image_url || '/placeholder.jpg'}" alt="商品画像" loading="lazy">
                </div>
                <div class="product-info">
                    <h4 class="product-title">${Utils.escapeHtml(product.title)}</h4>
                    <div class="product-price">¥${Utils.formatNumber(product.price)}</div>
                    <div class="product-status ${product.ai_status}">${product.ai_status_text}</div>
                </div>
                <div class="product-actions">
                    <button class="btn-approve" onclick="approveProduct(${product.id})">承認</button>
                    <button class="btn-reject" onclick="rejectProduct(${product.id})">否認</button>
                </div>
            </div>
        `).join('');

        grid.innerHTML = `<div class="products-container">${productsHTML}</div>`;
    }

    async performSearch(query) {
        try {
            ToastManager.show('検索中...', 'info', 2000);
            const results = await APIManager.searchProducts(query);
            this.displaySearchResults(results.data);
            ToastManager.show(`${results.data.length}件の結果が見つかりました`, 'success');
        } catch (error) {
            Utils.log('検索エラー: ' + error.message, 'error');
            ToastManager.show('検索に失敗しました', 'error');
        }
    }

    displaySearchResults(results) {
        const resultsDiv = document.getElementById('searchResults');
        if (!resultsDiv) return;

        if (results.length === 0) {
            resultsDiv.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>検索結果がありません</p>
                </div>
            `;
            return;
        }

        const resultsHTML = results.map(item => `
            <div class="search-result-item">
                <div class="result-image">
                    <img src="${item.image_url || '/placeholder.jpg'}" alt="商品画像">
                </div>
                <div class="result-content">
                    <h4>${Utils.escapeHtml(item.title)}</h4>
                    <p class="result-price">¥${Utils.formatNumber(item.price)}</p>
                    <p class="result-category">${item.category}</p>
                </div>
            </div>
        `).join('');

        resultsDiv.innerHTML = `<div class="search-results-grid">${resultsHTML}</div>`;
    }
}

// ===========================================
// 既存のCSVファイル処理システムを保持
// ===========================================
const CSVHandler = {
    // 既存の実装をそのまま保持
    async readFile(file) {
        return new Promise((resolve, reject) => {
            if (!file || file.type !== 'text/csv') {
                reject(new Error('有効なCSVファイルを選択してください。'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csvText = e.target.result;
                    const data = this.parseCSV(csvText);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
            reader.readAsText(file);
        });
    },

    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSVデータが不正です（ヘッダーとデータが必要）。');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length !== headers.length) continue;

            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }

        return data;
    },

    validateData(data) {
        const errors = [];
        const requiredFields = ['Title', 'BuyItNowPrice'];

        data.forEach((item, index) => {
            requiredFields.forEach(field => {
                if (!item[field] || item[field].trim() === '') {
                    errors.push(`行 ${index + 2}: ${field} が空です`);
                }
            });

            const price = parseFloat(item['BuyItNowPrice']);
            if (isNaN(price) || price <= 0) {
                errors.push(`行 ${index + 2}: 価格が無効です`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
};

// ===========================================
// 既存のドラッグ&ドロップ機能を保持
// ===========================================
const DragDropHandler = {
    init() {
        const dropAreas = document.querySelectorAll('.drag-drop-area');
        
        dropAreas.forEach(area => {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, this.preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                area.addEventListener(eventName, () => this.highlight(area), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, () => this.unhighlight(area), false);
            });

            area.addEventListener('drop', (e) => this.handleDrop(e, area), false);
        });
    },

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    highlight(area) {
        area.classList.add('dragover');
    },

    unhighlight(area) {
        area.classList.remove('dragover');
    },

    async handleDrop(e, area) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            await this.handleFiles(files);
        }
    },

    async handleFiles(files) {
        const file = files[0];
        
        try {
            Utils.log('CSVファイル処理開始: ' + file.name);
            this.showUploadStatus('処理中...', 'info');
            
            const data = await CSVHandler.readFile(file);
            const validation = CSVHandler.validateData(data);
            
            if (!validation.isValid) {
                throw new Error('データ検証エラー:\n' + validation.errors.join('\n'));
            }
            
            currentCSVData = data;
            this.showUploadStatus(`✅ ${data.length}件のデータを読み込みました`, 'success');
            this.displayDataPreview(data);
            this.enableListingButtons();
            
            Utils.log(`CSVデータ読み込み完了: ${data.length}件`);
            ToastManager.show(`${data.length}件のCSVデータを読み込みました`, 'success');
            
        } catch (error) {
            Utils.log('CSVファイル処理エラー: ' + error.message, 'error');
            this.showUploadStatus('❌ ' + error.message, 'error');
            ToastManager.show('CSVファイル処理に失敗しました', 'error');
        }
    },

    showUploadStatus(message, type) {
        let statusDiv = document.getElementById('uploadStatus');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'uploadStatus';
            statusDiv.className = 'upload-status';
            
            const dragArea = document.querySelector('.drag-drop-area');
            if (dragArea) {
                dragArea.parentNode.insertBefore(statusDiv, dragArea.nextSibling);
            }
        }
        
        statusDiv.textContent = message;
        statusDiv.className = `upload-status ${type}`;
        
        if (type === 'info') {
            statusDiv.classList.add('loading-pulse');
        } else {
            statusDiv.classList.remove('loading-pulse');
        }
    },

    displayDataPreview(data) {
        // 既存の実装を保持
        let previewDiv = document.getElementById('dataPreview');
        if (!previewDiv) {
            previewDiv = document.createElement('div');
            previewDiv.id = 'dataPreview';
            previewDiv.style.marginTop = '1.5rem';
            
            const uploadStatus = document.getElementById('uploadStatus');
            if (uploadStatus) {
                uploadStatus.parentNode.insertBefore(previewDiv, uploadStatus.nextSibling);
            }
        }
        
        const headers = Object.keys(data[0] || {});
        const previewRows = data.slice(0, 5);
        
        previewDiv.innerHTML = `
            <h4 style="margin-bottom: 1rem;">📊 データプレビュー（最初の5件）</h4>
            <div style="overflow-x: auto;">
                <table class="data-table" style="width: 100%; font-size: 0.8rem;">
                    <thead>
                        <tr>
                            ${headers.map(header => `<th style="padding: 0.5rem;">${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${previewRows.map(row => `
                            <tr>
                                ${headers.map(header => `<td style="padding: 0.5rem;">${Utils.escapeHtml(String(row[header] || '').substring(0, 50))}${String(row[header] || '').length > 50 ? '...' : ''}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <p style="text-align: center; color: var(--text-muted); font-size: 0.875rem; margin-top: 1rem;">
                総件数: ${data.length}件 | 表示: 最初の${Math.min(5, data.length)}件
            </p>
        `;
    },

    enableListingButtons() {
        const buttons = document.querySelectorAll('.listing-action-btn');
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('btn--disabled');
        });
    }
};

// ===========================================
// 既存のプリセット管理システムを保持
// ===========================================
const PresetManager = {
    presets: {
        premium: {
            title: '🌟 プレミアム出品',
            description: 'HTMLテンプレート + 高機能説明文',
            settings: {
                templateType: 'Japanese Auction Premium Template',
                enableHTMLTemplate: true,
                delayBetweenItems: 3000,
                batchSize: 10,
                enableValidation: true,
                dryRun: false
            }
        },
        clean: {
            title: '🎯 クリーン出品',
            description: 'シンプルテンプレート + 高速処理',
            settings: {
                templateType: 'Simple Clean Template',
                enableHTMLTemplate: true,
                delayBetweenItems: 2000,
                batchSize: 15,
                enableValidation: true,
                dryRun: false
            }
        },
        test: {
            title: '🧪 テスト実行',
            description: '実際の出品は行わず、処理のみテスト',
            settings: {
                templateType: 'Simple Clean Template',
                enableHTMLTemplate: true,
                delayBetweenItems: 1000,
                batchSize: 20,
                enableValidation: true,
                dryRun: true
            }
        }
    },

    init() {
        this.createPresetUI();
        this.selectPreset('premium');
    },

    createPresetUI() {
        let presetPanel = document.getElementById('presetPanel');
        if (!presetPanel) {
            presetPanel = document.createElement('div');
            presetPanel.id = 'presetPanel';
            presetPanel.className = 'preset-panel';
            
            const listingSection = document.getElementById('listing');
            if (listingSection) {
                const firstChild = listingSection.querySelector('.section');
                if (firstChild) {
                    firstChild.insertBefore(presetPanel, firstChild.firstChild);
                }
            }
        }
        
        presetPanel.innerHTML = `
            <h4 style="margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-cog"></i>
                出品プリセット選択
            </h4>
            <div class="preset-options">
                ${Object.entries(this.presets).map(([key, preset]) => `
                    <div class="preset-option" data-preset="${key}" onclick="PresetManager.selectPreset('${key}')">
                        <div class="preset-title">${preset.title}</div>
                        <div class="preset-description">${preset.description}</div>
                    </div>
                `).join('')}
            </div>
            <div class="batch-controls" style="margin-top: 1.5rem;">
                <div class="control-item">
                    <label class="control-label">項目間遅延 (ms)</label>
                    <input type="number" id="delayInput" class="control-input" value="3000" min="1000" max="10000" step="500">
                </div>
                <div class="control-item">
                    <label class="control-label">バッチサイズ</label>
                    <input type="number" id="batchSizeInput" class="control-input" value="10" min="1" max="50">
                </div>
                <div class="control-item">
                    <label class="control-label">検証モード</label>
                    <select id="validationSelect" class="control-input">
                        <option value="true">有効</option>
                        <option value="false">無効</option>
                    </select>
                </div>
                <div class="control-item">
                    <label class="control-label">実行モード</label>
                    <select id="dryRunSelect" class="control-input">
                        <option value="false">本番実行</option>
                        <option value="true">テスト実行</option>
                    </select>
                </div>
            </div>
        `;
        
        this.bindPresetEvents();
    },

    selectPreset(presetKey) {
        selectedPreset = presetKey;
        const preset = this.presets[presetKey];
        
        if (!preset) return;
        
        document.querySelectorAll('.preset-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`[data-preset="${presetKey}"]`)?.classList.add('selected');
        
        const delayInput = document.getElementById('delayInput');
        const batchSizeInput = document.getElementById('batchSizeInput');
        const validationSelect = document.getElementById('validationSelect');
        const dryRunSelect = document.getElementById('dryRunSelect');
        
        if (delayInput) delayInput.value = preset.settings.delayBetweenItems;
        if (batchSizeInput) batchSizeInput.value = preset.settings.batchSize;
        if (validationSelect) validationSelect.value = preset.settings.enableValidation;
        if (dryRunSelect) dryRunSelect.value = preset.settings.dryRun;
        
        Utils.log(`プリセット選択: ${preset.title}`);
        ToastManager.show(`プリセット選択: ${preset.title}`, 'info');
    },

    bindPresetEvents() {
        ['delayInput', 'batchSizeInput', 'validationSelect', 'dryRunSelect'].forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', () => {
                    this.updateCurrentSettings();
                });
            }
        });
    },

    updateCurrentSettings() {
        const delayInput = document.getElementById('delayInput');
        const batchSizeInput = document.getElementById('batchSizeInput');
        const validationSelect = document.getElementById('validationSelect');
        const dryRunSelect = document.getElementById('dryRunSelect');
        
        if (selectedPreset && this.presets[selectedPreset]) {
            this.presets[selectedPreset].settings = {
                ...this.presets[selectedPreset].settings,
                delayBetweenItems: parseInt(delayInput?.value) || 3000,
                batchSize: parseInt(batchSizeInput?.value) || 10,
                enableValidation: validationSelect?.value === 'true',
                dryRun: dryRunSelect?.value === 'true'
            };
        }
    },

    getCurrentSettings() {
        this.updateCurrentSettings();
        return this.presets[selectedPreset]?.settings || this.presets.premium.settings;
    }
};

// ===========================================
// 既存の高機能出品マネージャーを保持
// ===========================================
const ListingManager = {
    async executeListing() {
        if (listingInProgress) {
            Utils.log('出品処理が既に実行中です', 'warning');
            ToastManager.show('出品処理が既に実行中です', 'warning');
            return;
        }
        
        if (!currentCSVData || currentCSVData.length === 0) {
            const message = 'CSVデータが読み込まれていません。';
            alert(message);
            ToastManager.show(message, 'error');
            return;
        }
        
        try {
            listingInProgress = true;
            Utils.log('高機能出品処理開始');
            ToastManager.show('出品処理を開始します...', 'info');
            
            const settings = PresetManager.getCurrentSettings();
            this.showProgressModal(currentCSVData.length);
            
            const response = await this.callListingAPI(currentCSVData, settings);
            this.displayResults(response);
            
            Utils.log('高機能出品処理完了');
            ToastManager.show('出品処理が完了しました', 'success');
            
        } catch (error) {
            Utils.log('出品処理エラー: ' + error.message, 'error');
            ToastManager.show('出品処理でエラーが発生しました', 'error');
            this.showError(error.message);
        } finally {
            listingInProgress = false;
        }
    },

    async callListingAPI(csvData, settings) {
        const requestData = {
            action: 'execute_ebay_listing_advanced',
            csv_data: csvData,
            platform: 'ebay',
            account: 'mystical-japan-treasures',
            options: {
                ...settings,
                error_handling: 'separate'
            }
        };

        const response = await fetch(CONFIG.api.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || '出品処理でエラーが発生しました');
        }

        return result;
    },

    // 既存のプログレスモーダル表示を保持
    showProgressModal(totalItems) {
        // 既存の実装をそのまま保持
        const modalHTML = `
        <div id="advancedListingModal" class="modal advanced-modal">
            <div class="modal-content advanced-modal-content">
                <div class="modal-header">
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-rocket"></i>
                        高機能eBay出品進行状況
                    </h2>
                    <button class="modal-close" onclick="document.getElementById('advancedListingModal').remove()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="overall-progress">
                        <h3>総合進行状況</h3>
                        <div class="progress-bar-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="overallProgress" style="width: 0%"></div>
                            </div>
                            <div class="progress-text" id="overallProgressText">0 / ${totalItems} 項目処理済み</div>
                        </div>
                    </div>
                    
                    <div class="status-stats">
                        <div class="stat-card stat-success">
                            <h4>✅ 成功</h4>
                            <div class="stat-value" id="successCount">0</div>
                        </div>
                        <div class="stat-card stat-error">
                            <h4>❌ 失敗</h4>
                            <div class="stat-value" id="errorCount">0</div>
                        </div>
                        <div class="stat-card stat-warning">
                            <h4>⚠️ 検証</h4>
                            <div class="stat-value" id="validationCount">0</div>
                        </div>
                        <div class="stat-card stat-info">
                            <h4>⏳ 処理中</h4>
                            <div class="stat-value" id="processingCount">${totalItems}</div>
                        </div>
                    </div>
                    
                    <div class="results-section">
                        <div class="results-tabs">
                            <button class="tab-btn active" data-tab="success" onclick="switchResultTab('success')">
                                ✅ 成功 (<span id="successTabCount">0</span>)
                            </button>
                            <button class="tab-btn" data-tab="failed" onclick="switchResultTab('failed')">
                                ❌ 失敗 (<span id="failedTabCount">0</span>)
                            </button>
                            <button class="tab-btn" data-tab="validation" onclick="switchResultTab('validation')">
                                ⚠️ 検証 (<span id="validationTabCount">0</span>)
                            </button>
                        </div>
                        
                        <div class="results-content">
                            <div id="successResults" class="result-tab-content active">
                                <div class="result-list" id="successList">
                                    <p class="no-results">まだ成功した出品はありません...</p>
                                </div>
                            </div>
                            
                            <div id="failedResults" class="result-tab-content">
                                <div class="result-list" id="failedList">
                                    <p class="no-results">まだ失敗した出品はありません...</p>
                                </div>
                            </div>
                            
                            <div id="validationResults" class="result-tab-content">
                                <div class="result-list" id="validationList">
                                    <p class="no-results">まだ検証エラーはありません...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn--secondary" onclick="document.getElementById('advancedListingModal').remove()">閉じる</button>
                    <button class="btn btn--primary" id="downloadReportBtn" onclick="downloadListingReport()" disabled>
                        <i class="fas fa-download"></i> レポート出力
                    </button>
                </div>
            </div>
        </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    // 既存の結果表示システムを保持
    displayResults(response) {
        currentListingResults = response.data;
        const {
            total_items, success_count, error_count,
            success_items, failed_items, validation_errors = []
        } = response.data;
        
        const processed = success_count + error_count + validation_errors.length;
        const progress = (processed / total_items) * 100;
        
        const progressFill = document.getElementById('overallProgress');
        const progressText = document.getElementById('overallProgressText');
        
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${processed} / ${total_items} 項目処理済み`;
        
        this.updateStats('successCount', success_count);
        this.updateStats('errorCount', error_count);
        this.updateStats('validationCount', validation_errors.length);
        this.updateStats('processingCount', Math.max(0, total_items - processed));
        
        this.updateResultsList('success', success_items || []);
        this.updateResultsList('failed', failed_items || []);
        this.updateResultsList('validation', validation_errors);
        
        this.updateTabCounts(success_count, error_count, validation_errors.length);
        
        const downloadBtn = document.getElementById('downloadReportBtn');
        if (downloadBtn) downloadBtn.disabled = false;
        
        Utils.log(`結果更新完了 - 成功:${success_count} 失敗:${error_count} 検証:${validation_errors.length}`);
    },

    updateStats(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = Utils.formatNumber(value);
        }
    },

    updateTabCounts(success, failed, validation) {
        const successTab = document.getElementById('successTabCount');
        const failedTab = document.getElementById('failedTabCount');
        const validationTab = document.getElementById('validationTabCount');
        
        if (successTab) successTab.textContent = success;
        if (failedTab) failedTab.textContent = failed;
        if (validationTab) validationTab.textContent = validation;
    },

    updateResultsList(type, items) {
        if (!Array.isArray(items)) return;
        
        const listElement = document.getElementById(`${type}List`);
        if (!listElement) return;
        
        if (items.length === 0) {
            listElement.innerHTML = `<p class="no-results">${type === 'success' ? '成功' : type === 'failed' ? '失敗' : '検証エラー'}項目はありません</p>`;
            return;
        }
        
        const itemsHTML = items.map((item) => {
            if (type === 'success') {
                return `
                <div class="result-item result-success">
                    <div class="result-icon">✅</div>
                    <div class="result-content">
                        <h5>${Utils.escapeHtml(item.item?.Title || '不明な商品')}</h5>
                        <p>eBay商品ID: <strong>${item.ebay_item_id}</strong></p>
                        ${item.listing_url ? `<a href="${item.listing_url}" target="_blank" class="view-listing-btn">出品確認</a>` : ''}
                    </div>
                </div>`;
            } else if (type === 'failed') {
                return `
                <div class="result-item result-error">
                    <div class="result-icon">❌</div>
                    <div class="result-content">
                        <h5>${Utils.escapeHtml(item.item?.Title || '不明な商品')}</h5>
                        <p class="error-message">${Utils.escapeHtml(item.error_message || 'エラー情報なし')}</p>
                        <div class="error-type">タイプ: ${item.error_type || 'unknown'}</div>
                    </div>
                </div>`;
            } else if (type === 'validation') {
                return `
                <div class="result-item result-warning">
                    <div class="result-icon">⚠️</div>
                    <div class="result-content">
                        <h5>${Utils.escapeHtml(item.item?.Title || '不明な商品')}</h5>
                        <p class="error-message">${Utils.escapeHtml(item.error_message || '検証エラー')}</p>
                        <div class="error-type">検証問題</div>
                    </div>
                </div>`;
            }
        }).join('');
        
        listElement.innerHTML = itemsHTML;
    },

    showError(message) {
        const errorModal = `
        <div id="errorModal" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 style="color: #ef4444; margin: 0;">❌ エラー</h2>
                    <button class="modal-close" onclick="document.getElementById('errorModal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${Utils.escapeHtml(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn--primary" onclick="document.getElementById('errorModal').remove()">OK</button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', errorModal);
    }
};

// ===========================================
// グローバル関数（HTMLから呼び出し & 既存機能保持）
// ===========================================

// 統合されたタブ切り替え（既存機能保持 + 新機能追加）
function switchTab(tabName) {
    // 既存のタブ切り替え処理
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const targetContent = document.getElementById(tabName);
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (targetContent) targetContent.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
    
    // 新機能: タブマネージャーによる処理
    if (TabManager) {
        TabManager.handleTabSwitch(tabName);
    }
    
    Utils.log(`タブ切り替え: ${tabName}`);
}

// 既存の結果タブ切り替え機能を保持
function switchResultTab(tabName) {
    document.querySelectorAll('.result-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.results-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const targetContent = document.getElementById(`${tabName}Results`);
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (targetContent) targetContent.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
    
    Utils.log(`結果タブ切り替え: ${tabName}`);
}

// 既存のレポート出力機能を保持
function downloadListingReport() {
    if (!currentListingResults) {
        alert('出力するレポートデータがありません。');
        return;
    }
    
    try {
        const report = generateReport(currentListingResults);
        const blob = new Blob([report], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        link.href = URL.createObjectURL(blob);
        link.download = `ebay_listing_report_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`;
        link.click();
        
        Utils.log('レポート出力完了');
        ToastManager.show('レポートを出力しました', 'success');
    } catch (error) {
        Utils.log('レポート出力エラー: ' + error.message, 'error');
        ToastManager.show('レポート出力に失敗しました', 'error');
        alert('レポート出力に失敗しました。');
    }
}

function generateReport(results) {
    const { success_items = [], failed_items = [], validation_errors = [] } = results;
    
    let csvContent = 'Status,Title,Result,Error Message,eBay Item ID,Listing URL\n';
    
    success_items.forEach(item => {
        const title = (item.item?.Title || '').replace(/"/g, '""');
        csvContent += `"Success","${title}","Listed","","${item.ebay_item_id}","${item.listing_url || ''}"\n`;
    });
    
    failed_items.forEach(item => {
        const title = (item.item?.Title || '').replace(/"/g, '""');
        const error = (item.error_message || '').replace(/"/g, '""');
        csvContent += `"Failed","${title}","Error","${error}","",""\n`;
    });
    
    validation_errors.forEach(item => {
        const title = (item.item?.Title || '').replace(/"/g, '""');
        const error = (item.error_message || '').replace(/"/g, '""');
        csvContent += `"Validation Error","${title}","Validation Failed","${error}","",""\n`;
    });
    
    return csvContent;
}

// 既存の出品実行機能を保持
async function executeAdvancedListing() {
    await ListingManager.executeListing();
}

// 新機能: 検索実行
async function searchDatabase() {
    const query = document.getElementById('searchQuery')?.value;
    if (!query || !query.trim()) {
        ToastManager.show('検索キーワードを入力してください', 'warning');
        return;
    }
    
    if (yaController) {
        await yaController.performSearch(query.trim());
    } else {
        ToastManager.show('システムが初期化されていません', 'error');
    }
}

// 新機能: 禁止キーワード管理
function editKeyword(id) {
    Utils.log(`キーワード編集: ID ${id}`);
    ToastManager.show('キーワード編集機能は開発中です', 'info');
}

function deleteKeyword(id) {
    if (confirm('このキーワードを削除しますか？')) {
        Utils.log(`キーワード削除: ID ${id}`);
        ToastManager.show('キーワード削除機能は開発中です', 'info');
    }
}

// 新機能: 商品承認
function approveProduct(id) {
    Utils.log(`商品承認: ID ${id}`);
    ToastManager.show('商品を承認しました', 'success');
}

function rejectProduct(id) {
    Utils.log(`商品否認: ID ${id}`);
    ToastManager.show('商品を否認しました', 'info');
}

// ===========================================
// 統合初期化処理（既存機能保持 + 新機能追加）
// ===========================================
document.addEventListener('DOMContentLoaded', async function() {
    Utils.log('Yahoo Auction Tool 完全統合版 初期化開始');
    
    try {
        // 新機能システム初期化
        ToastManager.init();
        TabManager.init();
        
        // YahooAuctionController初期化
        yaController = new YahooAuctionController();
        await yaController.init();
        
        // 既存システム初期化
        DragDropHandler.init();
        PresetManager.init();
        
        // 既存のイベントバインディング
        const listingButton = document.getElementById('executeListingBtn');
        if (listingButton) {
            listingButton.addEventListener('click', executeAdvancedListing);
        }
        
        const fileInput = document.getElementById('csvFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                if (e.target.files.length > 0) {
                    await DragDropHandler.handleFiles(e.target.files);
                }
            });
        }
        
        // 新機能のイベントバインディング
        const searchButton = document.querySelector('button[onclick="searchDatabase()"]');
        if (searchButton) {
            searchButton.addEventListener('click', searchDatabase);
        }
        
        Utils.log('Yahoo Auction Tool 完全統合版 初期化完了');
        ToastManager.show('Yahoo Auction Tool 初期化完了', 'success');
        
    } catch (error) {
        Utils.log('初期化エラー: ' + error.message, 'error');
        ToastManager.show('システム初期化でエラーが発生しました', 'error');
    }
});

// デバッグ用グローバルオブジェクト（開発時）
window.YahooAuctionTool = {
    Utils,
    CSVHandler,
    DragDropHandler,
    PresetManager,
    ListingManager,
    TabManager,
    APIManager,
    ToastManager,
    yaController,
    currentCSVData,
    currentListingResults,
    activeTabName
};