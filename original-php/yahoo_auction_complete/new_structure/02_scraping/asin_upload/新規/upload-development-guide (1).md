# 📤 アップロード機能開発指示書（CSS/JS分離対応版）⭐⭐⭐

## 🎯 **開発目標**

**マルチモール対応**: Amazon・楽天・Yahoo等50+モール統合システム  
**CSS/JS分離**: NAGANO-3基準準拠の完全分離アーキテクチャ  
**高性能処理**: 大量データ（1000件+）の高速処理システム  
**ユーザビリティ**: 直感的な操作性と明確なフィードバック  

---

## 🏗️ **ファイル構造（確定版）**

### **📁 ディレクトリ配置**

```
modules/asin_upload/
├── php/
│   ├── asin_upload_controller.php      # メインコントローラー
│   ├── asin_upload_api.php             # API処理
│   └── mall_config_manager.php         # モール設定管理
├── css/
│   └── asin-upload.css                 # 専用CSS（BEM準拠）
├── js/
│   └── asin-upload.js                  # 専用JavaScript
├── templates/
│   └── asin_upload_content.php         # HTMLテンプレート
└── config/
    ├── mall_configs.json               # モール設定ファイル
    └── upload_settings.json            # アップロード設定
```

### **📋 NAGANO-3統合パス**

```php
// common/css/style.css に追加
@import url('../modules/asin_upload/css/asin-upload.css');

// common/js/main.js の expected配列に追加
'modules/asin_upload.js'
```

---

## 🎨 **CSS分離実装（BEM準拠）**

### **📝 modules/asin_upload/css/asin-upload.css**

```css
/**
 * ASIN/商品URLアップロード専用CSS
 * 出典: HTMLインライン実装からの分離
 * BEM命名規則完全準拠
 */

/* ===== モール選択セクション（BEM: asin-upload__mall-selector） ===== */
.asin-upload__mall-selector {
    background: var(--bg-secondary);           /* 出典: common.css変数 */
    border: 1px solid var(--border-color);    /* 出典: common.css変数 */
    border-radius: var(--radius-xl);          /* 出典: common.css変数 */
    padding: var(--space-6);                  /* 出典: common.css変数 */
    margin-bottom: var(--space-6);            /* 出典: common.css変数 */
}

.asin-upload__mall-title {
    font-size: var(--text-xl);                /* 出典: common.css変数 */
    font-weight: 600;
    color: var(--text-primary);               /* 出典: common.css変数 */
    margin-bottom: var(--space-4);            /* 出典: common.css変数 */
    display: flex;
    align-items: center;
    gap: var(--space-2);                      /* 出典: common.css変数 */
}

.asin-upload__mall-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);                      /* 出典: common.css変数 */
}

.asin-upload__mall-card {
    background: var(--bg-tertiary);           /* 出典: common.css変数 */
    border: 2px solid var(--border-color);   /* 出典: common.css変数 */
    border-radius: var(--radius-lg);         /* 出典: common.css変数 */
    padding: var(--space-5);                 /* 出典: common.css変数 */
    text-align: center;
    cursor: pointer;
    transition: var(--transition-fast);      /* 出典: common.css変数 */
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);                     /* 出典: common.css変数 */
}

.asin-upload__mall-card:hover {
    border-color: var(--asin-upload-primary);
    background: var(--bg-hover);             /* 出典: common.css変数 */
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);            /* 出典: common.css変数 */
}

.asin-upload__mall-card--active {
    border-color: var(--asin-upload-primary);
    background: rgba(59, 130, 246, 0.1);
    box-shadow: var(--shadow-md);            /* 出典: common.css変数 */
}

/* ===== タブシステム（BEM: asin-upload__tabs） ===== */
.asin-upload__tabs {
    display: flex;
    background: var(--bg-tertiary);          /* 出典: common.css変数 */
    border-bottom: 1px solid var(--border-color); /* 出典: common.css変数 */
}

.asin-upload__tab-button {
    flex: 1;
    padding: var(--space-4) var(--space-6);  /* 出典: common.css変数 */
    border: none;
    background: transparent;
    color: var(--text-secondary);            /* 出典: common.css変数 */
    font-size: var(--text-sm);               /* 出典: common.css変数 */
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition-fast);      /* 出典: common.css変数 */
    border-bottom: 3px solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);                     /* 出典: common.css変数 */
}

.asin-upload__tab-button:hover {
    background: var(--bg-hover);             /* 出典: common.css変数 */
    color: var(--text-primary);              /* 出典: common.css変数 */
}

.asin-upload__tab-button--active {
    background: var(--bg-secondary);         /* 出典: common.css変数 */
    color: var(--asin-upload-primary);
    border-bottom-color: var(--asin-upload-primary);
}

/* ===== フォーム要素（BEM: asin-upload__form-*） ===== */
.asin-upload__form-group {
    margin-bottom: var(--space-6);           /* 出典: common.css変数 */
}

.asin-upload__form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);                     /* 出典: common.css変数 */
    margin-bottom: var(--space-6);           /* 出典: common.css変数 */
}

.asin-upload__label {
    display: block;
    font-size: var(--text-sm);               /* 出典: common.css変数 */
    font-weight: 500;
    color: var(--text-primary);              /* 出典: common.css変数 */
    margin-bottom: var(--space-2);           /* 出典: common.css変数 */
}

.asin-upload__input {
    width: 100%;
    padding: var(--space-3) var(--space-4);  /* 出典: common.css変数 */
    border: 1px solid var(--border-color);   /* 出典: common.css変数 */
    border-radius: var(--radius-md);         /* 出典: common.css変数 */
    font-size: var(--text-sm);               /* 出典: common.css変数 */
    color: var(--text-primary);              /* 出典: common.css変数 */
    background: var(--bg-secondary);         /* 出典: common.css変数 */
    transition: var(--transition-fast);      /* 出典: common.css変数 */
}

.asin-upload__input:focus {
    outline: none;
    border-color: var(--asin-upload-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* ===== レスポンシブ対応 ===== */
@media (max-width: 768px) {
    .asin-upload__mall-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .asin-upload__form-row {
        grid-template-columns: 1fr;
    }
    
    .asin-upload__tabs {
        flex-direction: column;
    }
}

@media (max-width: 480px) {
    .asin-upload__mall-grid {
        grid-template-columns: 1fr;
    }
}
```

---

## ⚡ **JavaScript分離実装（NAGANO-3準拠）**

### **📝 modules/asin_upload/js/asin-upload.js**

```javascript
/**
 * ASIN/商品URLアップロード専用JavaScript
 * 出典: HTMLインライン実装からの分離
 * NAGANO-3名前空間準拠
 */

"use strict";

// ===== NAGANO3名前空間登録 =====
window.NAGANO3 = window.NAGANO3 || {};
NAGANO3.modules = NAGANO3.modules || {};

class AsinUploadModule {
    constructor() {
        this.currentFile = null;
        this.isProcessing = false;
        this.selectedMall = 'amazon';
        this.config = {
            ajax_actions: [
                'asin_upload_csv_process',
                'asin_upload_manual_process', 
                'asin_upload_bulk_process',
                'asin_upload_url_auto_collect',
                'asin_upload_get_results'
            ]
        };
        
        this.mallConfigs = {
            amazon: {
                name: 'Amazon',
                asinLabel: 'ASIN',
                bulkLabel: 'ASIN・URL一括入力',
                placeholder: 'B08N5WRWNW',
                urlPattern: 'https://amazon.co.jp/dp/',
                csvFormat: ['ASIN', 'URL', '商品名', '価格']
            },
            rakuten: {
                name: '楽天市場',
                asinLabel: '商品ID',
                bulkLabel: '商品ID・URL一括入力',
                placeholder: 'rakuten-item-123',
                urlPattern: 'https://item.rakuten.co.jp/',
                csvFormat: ['商品ID', 'URL', '商品名', '価格', 'カテゴリ']
            },
            yahoo: {
                name: 'Yahoo!ショッピング',
                asinLabel: '商品コード',
                bulkLabel: '商品コード・URL一括入力',
                placeholder: 'yahoo-abc123',
                urlPattern: 'https://shopping.yahoo.co.jp/',
                csvFormat: ['商品コード', 'URL', '商品名', '価格']
            },
            ebay: {
                name: 'eBay',
                asinLabel: 'Item ID',
                bulkLabel: 'Item ID・URL一括入力',
                placeholder: '123456789012',
                urlPattern: 'https://ebay.com/itm/',
                csvFormat: ['ItemID', 'URL', 'Title', 'Price', 'Category']
            },
            mercari: {
                name: 'メルカリ',
                asinLabel: '商品ID',
                bulkLabel: '商品ID・URL一括入力',
                placeholder: 'm12345678901',
                urlPattern: 'https://mercari.com/jp/items/',
                csvFormat: ['商品ID', 'URL', '商品名', '価格', '状態']
            }
        };
    }
    
    // ===== 初期化 =====
    init() {
        this.setupFileUpload();
        this.selectMall('amazon');
        this.bindEvents();
        console.log("✅ AsinUploadModule初期化完了");
    }
    
    // ===== モール選択機能 =====
    selectMall(mallId) {
        this.selectedMall = mallId;
        
        // モールカードの状態更新
        document.querySelectorAll('.asin-upload__mall-card').forEach(card => {
            card.classList.remove('asin-upload__mall-card--active');
        });
        const selectedCard = document.querySelector(`[data-mall="${mallId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('asin-upload__mall-card--active');
        }
        
        // 選択モール表示更新
        const displayElement = document.getElementById('selectedMallDisplay');
        if (displayElement) {
            displayElement.textContent = this.mallConfigs[mallId].name;
        }
        
        // フォームラベル更新
        this.updateFormLabels(mallId);
        this.updateCSVSample(mallId);
        
        this.showNotification(`${this.mallConfigs[mallId].name}が選択されました。`, 'info');
    }
    
    updateFormLabels(mallId) {
        const config = this.mallConfigs[mallId];
        
        const asinLabel = document.getElementById('asinLabel');
        const bulkLabel = document.getElementById('bulkLabel');
        const asinInput = document.getElementById('asinInput');
        
        if (asinLabel) asinLabel.textContent = config.asinLabel;
        if (bulkLabel) bulkLabel.textContent = config.bulkLabel;
        if (asinInput) asinInput.placeholder = `例: ${config.placeholder}`;
    }
    
    updateCSVSample(mallId) {
        const sampleData = {
            amazon: `ASIN,URL,商品名,価格\nB08N5WRWNW,https://amazon.co.jp/dp/B08N5WRWNW,Echo Dot,3980\nB09B8RRQT5,https://amazon.co.jp/dp/B09B8RRQT5,Fire Stick,4980`,
            rakuten: `商品ID,URL,商品名,価格,カテゴリ\nrakuten-123,https://item.rakuten.co.jp/shop/item123,商品名,2980,家電\nrakuten-456,https://item.rakuten.co.jp/shop/item456,商品名,4980,生活用品`,
            yahoo: `商品コード,URL,商品名,価格\nyahoo-abc123,https://shopping.yahoo.co.jp/products/abc123,商品名,1980\nyahoo-def456,https://shopping.yahoo.co.jp/products/def456,商品名,3980`,
            ebay: `ItemID,URL,Title,Price,Category\n123456789012,https://ebay.com/itm/123456789012,Product Name,29.99,Electronics\n123456789013,https://ebay.com/itm/123456789013,Product Name,49.99,Home`,
            mercari: `商品ID,URL,商品名,価格,状態\nm12345678901,https://mercari.com/jp/items/m12345678901,商品名,1500,未使用に近い\nm12345678902,https://mercari.com/jp/items/m12345678902,商品名,2800,やや傷や汚れあり`
        };
        
        const sampleElement = document.querySelector('.asin-upload__sample-code');
        if (sampleElement) {
            sampleElement.textContent = sampleData[mallId] || sampleData.amazon;
        }
    }
    
    // ===== Ajax通信機能 =====
    async request(action, data = {}) {
        const requestData = {
            action: action,
            mall: this.selectedMall,
            ...data
        };
        
        try {
            const response = await fetch('/modules/asin_upload/php/asin_upload_api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Ajax Error:', error);
            this.showNotification(`通信エラー: ${error.message}`, 'error');
            throw error;
        }
    }
    
    // ===== ファイル処理機能 =====
    setupFileUpload() {
        const fileInput = document.getElementById('csvFile');
        const uploadArea = document.querySelector('.asin-upload__file-upload-area');
        
        if (!fileInput || !uploadArea) return;
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileSelection(file);
            }
        });
        
        // ドラッグ&ドロップ処理
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('asin-upload__file-upload-area--dragover');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('asin-upload__file-upload-area--dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('asin-upload__file-upload-area--dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
            }
        });
    }
    
    handleFileSelection(file) {
        // ファイル形式チェック
        const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        const allowedExtensions = ['.csv', '.xlsx', '.xls'];
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            this.showNotification('サポートされていないファイル形式です。CSV、XLS、XLSXファイルのみアップロード可能です。', 'error');
            return;
        }
        
        // ファイルサイズチェック (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showNotification('ファイルサイズが大きすぎます。10MB以下のファイルをアップロードしてください。', 'error');
            return;
        }
        
        this.currentFile = file;
        const processBtn = document.getElementById('processCsvBtn');
        if (processBtn) {
            processBtn.disabled = false;
        }
        
        this.showNotification(`ファイル "${file.name}" が選択されました。処理ボタンをクリックして続行してください。`, 'success');
    }
    
    // ===== 処理機能 =====
    async processCsvFile() {
        if (!this.currentFile || this.isProcessing) return;
        
        this.isProcessing = true;
        this.showProgress(true);
        this.updateProgress(0, 'ファイルを解析中...');
        
        try {
            const formData = new FormData();
            formData.append('file', this.currentFile);
            formData.append('mall', this.selectedMall);
            
            const response = await this.request('asin_upload_csv_process', {
                filename: this.currentFile.name,
                filesize: this.currentFile.size
            });
            
            if (response.status === 'success') {
                this.showResults(response.data);
                this.showNotification(`${this.mallConfigs[this.selectedMall].name}: CSVファイルの処理が完了しました。`, 'success');
            } else {
                throw new Error(response.message || 'CSVファイルの処理に失敗しました');
            }
            
        } catch (error) {
            this.showNotification('CSVファイルの処理中にエラーが発生しました: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.showProgress(false);
        }
    }
    
    async processManualInput() {
        if (this.isProcessing) return;
        
        const asinValue = document.getElementById('asinInput')?.value.trim();
        const url = document.getElementById('urlInput')?.value.trim();
        
        if (!asinValue && !url) {
            const config = this.mallConfigs[this.selectedMall];
            this.showNotification(`${config.asinLabel}またはURLを入力してください。`, 'error');
            return;
        }
        
        this.isProcessing = true;
        this.showProgress(true);
        this.updateProgress(0, '商品データを取得中...');
        
        try {
            const response = await this.request('asin_upload_manual_process', {
                asin: asinValue,
                url: url
            });
            
            if (response.status === 'success') {
                this.showResults(response.data);
                this.showNotification(`${this.mallConfigs[this.selectedMall].name}: 商品データの取得が完了しました。`, 'success');
            } else {
                throw new Error(response.message || '商品データの取得に失敗しました');
            }
            
        } catch (error) {
            this.showNotification('データ取得中にエラーが発生しました: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.showProgress(false);
        }
    }
    
    async processBulkInput() {
        if (this.isProcessing) return;
        
        const bulkData = document.getElementById('bulkInput')?.value.trim();
        if (!bulkData) {
            const config = this.mallConfigs[this.selectedMall];
            this.showNotification(`${config.bulkLabel.replace('一括入力', '')}を入力してください。`, 'error');
            return;
        }
        
        const lines = bulkData.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            this.showNotification('有効なデータが見つかりません。', 'error');
            return;
        }
        
        this.isProcessing = true;
        this.showProgress(true);
        this.updateProgress(0, `${this.mallConfigs[this.selectedMall].name}: ${lines.length}件のデータを処理中...`);
        
        try {
            const response = await this.request('asin_upload_bulk_process', {
                bulk_data: lines
            });
            
            if (response.status === 'success') {
                this.showResults(response.data);
                this.showNotification(`${this.mallConfigs[this.selectedMall].name}: ${lines.length}件のデータ処理が完了しました。`, 'success');
            } else {
                throw new Error(response.message || '一括処理に失敗しました');
            }
            
        } catch (error) {
            this.showNotification('一括処理中にエラーが発生しました: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.showProgress(false);
        }
    }
    
    async processUrlAutoCollect() {
        if (this.isProcessing) return;
        
        const startUrl = document.getElementById('startUrlInput')?.value.trim();
        const maxCount = parseInt(document.getElementById('maxCountInput')?.value || '100');
        const priceRange = document.getElementById('priceRangeInput')?.value;
        
        if (!startUrl) {
            this.showNotification('開始URLを入力してください。', 'error');
            return;
        }
        
        this.isProcessing = true;
        this.showProgress(true);
        this.updateProgress(0, `${this.mallConfigs[this.selectedMall].name}: URL自動取得を開始中...`);
        
        try {
            const response = await this.request('asin_upload_url_auto_collect', {
                start_url: startUrl,
                max_count: maxCount,
                price_range: priceRange
            });
            
            if (response.status === 'success') {
                this.showResults(response.data);
                this.showNotification(`${this.mallConfigs[this.selectedMall].name}: URL自動取得が完了しました。`, 'success');
            } else {
                throw new Error(response.message || 'URL自動取得に失敗しました');
            }
            
        } catch (error) {
            this.showNotification('URL自動取得中にエラーが発生しました: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.showProgress(false);
        }
    }
    
    // ===== UI制御機能 =====
    showProgress(show) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            if (show) {
                progressBar.classList.add('asin-upload__progress--show');
            } else {
                progressBar.classList.remove('asin-upload__progress--show');
            }
        }
    }
    
    updateProgress(percentage, message) {
        const progressFill = document.getElementById('progressBarFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
        if (progressText) {
            progressText.textContent = message || `${percentage}%`;
        }
    }
    
    showResults(data) {
        const elements = {
            totalCount: document.getElementById('totalCount'),
            successCount: document.getElementById('successCount'),
            errorCount: document.getElementById('errorCount'),
            processingTime: document.getElementById('processingTime'),
            resultsArea: document.getElementById('resultsArea'),
            downloadBtn: document.getElementById('downloadBtn')
        };
        
        if (elements.totalCount) elements.totalCount.textContent = data.total?.toLocaleString() || '0';
        if (elements.successCount) elements.successCount.textContent = data.success?.toLocaleString() || '0';
        if (elements.errorCount) elements.errorCount.textContent = data.error?.toLocaleString() || '0';
        if (elements.processingTime) elements.processingTime.textContent = (data.processing_time || 0) + 's';
        
        if (elements.resultsArea) {
            elements.resultsArea.classList.add('asin-upload__results--show');
        }
        if (elements.downloadBtn) {
            elements.downloadBtn.disabled = false;
        }
    }
    
    hideResults() {
        const resultsArea = document.getElementById('resultsArea');
        const downloadBtn = document.getElementById('downloadBtn');
        
        if (resultsArea) {
            resultsArea.classList.remove('asin-upload__results--show');
        }
        if (downloadBtn) {
            downloadBtn.disabled = true;
        }
    }
    
    // ===== 通知システム =====
    showNotification(message, type = 'info') {
        if (typeof NAGANO3.core.notifications?.show === 'function') {
            NAGANO3.core.notifications.show(message, type);
        } else {
            // フォールバック通知
            console.log(`通知: ${message} (タイプ: ${type})`);
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    // ===== イベントバインディング =====
    bindEvents() {
        // タブ切り替え
        document.querySelectorAll('.asin-upload__tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.target.getAttribute('onclick')?.match(/switchTab\('([^']+)'\)/)?.[1];
                if (tabId) this.switchTab(tabId);
            });
        });
        
        // モール選択
        document.querySelectorAll('.asin-upload__mall-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const mallId = e.currentTarget.getAttribute('data-mall');
                if (mallId && mallId !== 'coming-soon') {
                    this.selectMall(mallId);
                }
            });
        });
    }
    
    switchTab(tabId) {
        // 全タブボタンのアクティブ状態をリセット
        document.querySelectorAll('.asin-upload__tab-button').forEach(btn => {
            btn.classList.remove('asin-upload__tab-button--active');
        });
        
        // 全タブコンテンツを非表示
        document.querySelectorAll('.asin-upload__tab-content').forEach(content => {
            content.classList.remove('asin-upload__tab-content--active');
        });
        
        // 対象タブをアクティブ化
        const activeButton = document.querySelector(`[onclick*="${tabId}"]`);
        const activeContent = document.getElementById(tabId);
        
        if (activeButton) activeButton.classList.add('asin-upload__tab-button--active');
        if (activeContent) activeContent.classList.add('asin-upload__tab-content--active');
        
        // 結果エリアをリセット
        this.hideResults();
    }
    
    // ===== デバッグ情報取得 =====
    getDebugInfo() {
        return {
            name: 'AsinUploadModule',
            version: '1.0.0',
            selectedMall: this.selectedMall,
            isProcessing: this.isProcessing,
            currentFile: this.currentFile?.name || null,
            mallConfigs: Object.keys(this.mallConfigs),
            config: this.config
        };
    }
}

// ===== NAGANO3名前空間に登録 =====
NAGANO3.modules.asin_upload = new AsinUploadModule();

// ===== グローバル関数登録（HTML onclick用） =====
window.selectMall = (mallId) => NAGANO3.modules.asin_upload.selectMall(mallId);
window.switchTab = (tabId) => NAGANO3.modules.asin_upload.switchTab(tabId);
window.processCsvFile = () => NAGANO3.modules.asin_upload.processCsvFile();
window.processManualInput = () => NAGANO3.modules.asin_upload.processManualInput();
window.processBulkInput = () => NAGANO3.modules.asin_upload.processBulkInput();
window.processUrlAutoCollect = () => NAGANO3.modules.asin_upload.processUrlAutoCollect();
window.showComingSoon = () => NAGANO3.modules.asin_upload.showNotification('その他のモールは順次対応予定です。お楽しみに！', 'info');

// ===== 読み込み完了通知 =====
if (NAGANO3.loader) {
    NAGANO3.loader.markLoaded('modules/asin_upload.js');
}

console.log("✅ ASIN Upload JavaScript読み込み完了");
```

---

## 🖥️ **PHP API実装（FastAPI連携）**

### **📝 modules/asin_upload/php/asin_upload_api.php**

```php
<?php
/**
 * ASIN/商品URLアップロード API処理
 * modules/asin_upload/php/asin_upload_api.php
 * NAGANO-3統一レスポンス形式準拠
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

require_once __DIR__ . '/../../../common/php/security_manager.php';
require_once __DIR__ . '/../../../common/php/database_connection.php';
require_once __DIR__ . '/mall_config_manager.php';

class AsinUploadAPI {
    
    private $mall_config_manager;
    private $db;
    
    public function __construct() {
        $this->mall_config_manager = new MallConfigManager();
        $this->db = DatabaseConnection::getInstance();
    }
    
    /**
     * メインエントリーポイント
     */
    public function handleRequest() {
        try {
            // JSON入力の取得
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? '';
            $mall = $input['mall'] ?? 'amazon';
            
            // CSRF チェック（health_check以外）
            if ($action !== 'health_check') {
                SecurityManager::validateCSRFToken();
            }
            
            // アクション実行
            switch ($action) {
                case 'asin_upload_csv_process':
                    return $this->processCsvUpload($input);
                    
                case 'asin_upload_manual_process':
                    return $this->processManualInput($input);
                    
                case 'asin_upload_bulk_process':
                    return $this->processBulkInput($input);
                    
                case 'asin_upload_url_auto_collect':
                    return $this->processUrlAutoCollect($input);
                    
                case 'asin_upload_get_results':
                    return $this->getProcessingResults($input);
                    
                case 'health_check':
                    return $this->healthCheck();
                    
                default:
                    throw new Exception("未対応のアクション: {$action}");
            }
            
        } catch (Exception $e) {
            return $this->createErrorResponse($e->getMessage());
        }
    }
    
    /**
     * CSVファイル処理
     */
    private function processCsvUpload($input) {
        $mall = $input['mall'] ?? 'amazon';
        $filename = $input['filename'] ?? '';
        $filesize = $input['filesize'] ?? 0;
        
        // ファイル検証
        if ($filesize > 10 * 1024 * 1024) {
            throw new Exception('ファイルサイズが大きすぎます（10MB以下）');
        }
        
        // Python API 呼び出し
        $python_response = $this->callPythonAPI('/api/asin-upload/csv-process', [
            'mall' => $mall,
            'filename' => $filename,
            'filesize' => $filesize
        ]);
        
        // 結果をデータベースに保存
        $session_id = $this->saveProcessingSession($mall, 'csv_upload', $python_response);
        
        return $this->createSuccessResponse([
            'session_id' => $session_id,
            'total' => $python_response['total_items'] ?? 0,
            'success' => $python_response['success_count'] ?? 0,
            'error' => $python_response['error_count'] ?? 0,
            'processing_time' => $python_response['processing_time'] ?? 0
        ]);
    }
    
    /**
     * 手動入力処理
     */
    private function processManualInput($input) {
        $mall = $input['mall'] ?? 'amazon';
        $asin = $input['asin'] ?? '';
        $url = $input['url'] ?? '';
        
        if (empty($asin) && empty($url)) {
            throw new Exception('ASINまたはURLが必要です');
        }
        
        // Python API 呼び出し
        $python_response = $this->callPythonAPI('/api/asin-upload/manual-process', [
            'mall' => $mall,
            'asin' => $asin,
            'url' => $url
        ]);
        
        return $this->createSuccessResponse([
            'total' => 1,
            'success' => $python_response['success'] ? 1 : 0,
            'error' => $python_response['success'] ? 0 : 1,
            'processing_time' => $python_response['processing_time'] ?? 1,
            'product_data' => $python_response['product_data'] ?? null
        ]);
    }
    
    /**
     * 一括入力処理
     */
    private function processBulkInput($input) {
        $mall = $input['mall'] ?? 'amazon';
        $bulk_data = $input['bulk_data'] ?? [];
        
        if (empty($bulk_data)) {
            throw new Exception('一括データが必要です');
        }
        
        // Python API 呼び出し
        $python_response = $this->callPythonAPI('/api/asin-upload/bulk-process', [
            'mall' => $mall,
            'bulk_data' => $bulk_data
        ]);
        
        $session_id = $this->saveProcessingSession($mall, 'bulk_upload', $python_response);
        
        return $this->createSuccessResponse([
            'session_id' => $session_id,
            'total' => count($bulk_data),
            'success' => $python_response['success_count'] ?? 0,
            'error' => $python_response['error_count'] ?? 0,
            'processing_time' => $python_response['processing_time'] ?? 0
        ]);
    }
    
    /**
     * URL自動取得処理
     */
    private function processUrlAutoCollect($input) {
        $mall = $input['mall'] ?? 'amazon';
        $start_url = $input['start_url'] ?? '';
        $max_count = $input['max_count'] ?? 100;
        $price_range = $input['price_range'] ?? '';
        
        if (empty($start_url)) {
            throw new Exception('開始URLが必要です');
        }
        
        // Python API 呼び出し
        $python_response = $this->callPythonAPI('/api/asin-upload/url-auto-collect', [
            'mall' => $mall,
            'start_url' => $start_url,
            'max_count' => $max_count,
            'price_range' => $price_range
        ]);
        
        $session_id = $this->saveProcessingSession($mall, 'url_auto_collect', $python_response);
        
        return $this->createSuccessResponse([
            'session_id' => $session_id,
            'total' => $max_count,
            'success' => $python_response['collected_count'] ?? 0,
            'error' => $max_count - ($python_response['collected_count'] ?? 0),
            'processing_time' => $python_response['processing_time'] ?? 0
        ]);
    }
    
    /**
     * Python API呼び出し
     */
    private function callPythonAPI($endpoint, $data) {
        $python_api_url = 'http://localhost:8000' . $endpoint;
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $python_api_url,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json'
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code !== 200) {
            throw new Exception("Python API呼び出しエラー: HTTP {$http_code}");
        }
        
        $result = json_decode($response, true);
        
        if ($result['status'] !== 'success') {
            throw new Exception($result['message'] ?? 'Python API処理エラー');
        }
        
        return $result['data'];
    }
    
    /**
     * 処理セッション保存
     */
    private function saveProcessingSession($mall, $type, $data) {
        $session_id = 'upload_' . uniqid();
        
        $stmt = $this->db->prepare("
            INSERT INTO upload_sessions (
                session_id, mall, upload_type, data, created_at
            ) VALUES (?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $session_id,
            $mall,
            $type,
            json_encode($data)
        ]);
        
        return $session_id;
    }
    
    /**
     * ヘルスチェック
     */
    private function healthCheck() {
        return $this->createSuccessResponse([
            'service' => 'asin_upload_api',
            'status' => 'healthy',
            'version' => '1.0.0',
            'timestamp' => date('c')
        ]);
    }
    
    /**
     * 成功レスポンス作成（NAGANO-3統一形式）
     */
    private function createSuccessResponse($data) {
        header('Content-Type: application/json; charset=utf-8');
        
        $response = [
            'status' => 'success',
            'message' => '処理が正常に完了しました',
            'data' => $data,
            'timestamp' => date('c')
        ];
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * エラーレスポンス作成（NAGANO-3統一形式）
     */
    private function createErrorResponse($message) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(400);
        
        $response = [
            'status' => 'error',
            'message' => $message,
            'data' => null,
            'timestamp' => date('c')
        ];
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
}

// API実行
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $api = new AsinUploadAPI();
    $api->handleRequest();
}
?>
```

---

## 📋 **開発チェックリスト**

### **🔴 必須実装項目**

- [ ] **CSS分離**: HTMLからCSSを完全分離（BEM命名準拠）
- [ ] **JavaScript分離**: HTMLからJavaScriptを完全分離（NAGANO-3名前空間準拠）
- [ ] **モール設定管理**: 5モール + 将来50+モール拡張対応
- [ ] **Python API連携**: FastAPI統合処理システム
- [ ] **ファイルアップロード**: ドラッグ&ドロップ対応
- [ ] **エラーハンドリング**: 統一エラー処理システム
- [ ] **プログレス表示**: リアルタイム進捗表示
- [ ] **結果表示**: 統計データ表示システム

### **🟡 推奨実装項目**

- [ ] **URL自動取得**: スクレーピング機能実装
- [ ] **データベース連携**: 処理履歴・結果保存
- [ ] **キャッシュシステム**: Redis活用の高速化
- [ ] **WebSocket対応**: リアルタイム進捗更新
- [ ] **ファイル検証**: 高度なファイル形式チェック
- [ ] **バッチ処理**: 大量データ処理最適化

### **🟢 将来実装項目**

- [ ] **AI連携**: 商品データ自動分析
- [ ] **マルチ言語**: 国際モール対応
- [ ] **API制限対応**: レート制限・リトライ機能
- [ ] **監視システム**: パフォーマンス監視
- [ ] **レポート機能**: 詳細分析レポート生成

---

## 🚀 **実装手順**

### **Phase 1: 基盤構築（1週間）**

1. **ディレクトリ作成**
```bash
mkdir -p modules/asin_upload/{php,css,js,templates,config}
```

2. **CSS分離**
   - HTMLからCSS抽出
   - BEM命名規則適用
   - 共通変数活用

3. **JavaScript分離**
   - HTMLからJavaScript抽出
   - NAGANO-3名前空間統合
   - モジュール化実装

### **Phase 2: 機能実装（2週間）**

1. **PHP API開発**
   - NAGANO-3統一レスポンス形式
   - Python API連携
   - エラーハンドリング

2. **モール設定システム**
   - 動的設定読み込み
   - UI自動調整
   - 拡張性確保

3. **ファイル処理システム**
   - アップロード機能
   - 検証システム
   - プログレス表示

### **Phase 3: 統合・テスト（1週間）**

1. **NAGANO-3統合**
   - style.css統合
   - main.js統合
   - 競合回避確認

2. **品質保証**
   - 全機能テスト
   - エラーケーステスト
   - パフォーマンステスト

---

## 📝 **注意事項**

### **🚨 重要な制約**

1. **BEM命名必須**: `.asin-upload__element--modifier` 形式厳守
2. **CSS変数活用**: `var(--space-4)` 等共通変数を優先使用
3. **NAGANO-3統合**: 名前空間・レスポンス形式準拠必須
4. **セキュリティ**: CSRF・XSS・SQLインジェクション対策必須

### **🔧 開発時の留意点**

1. **出典明記**: 分離時のCSS・JavaScript出典コメント記載
2. **後方互換性**: 既存HTML onclick等の互換性維持
3. **拡張性**: 50+モール対応の設計
4. **パフォーマンス**: 大量データ処理の最適化

この指示書に従って実装することで、高品質で拡張性の高いアップロード機能が完成します。