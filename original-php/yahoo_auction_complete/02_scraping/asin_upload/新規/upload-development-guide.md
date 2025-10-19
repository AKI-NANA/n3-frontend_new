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
        
        this.showNotification(`ファイル "${file.name}" が選択されました。処理ボ