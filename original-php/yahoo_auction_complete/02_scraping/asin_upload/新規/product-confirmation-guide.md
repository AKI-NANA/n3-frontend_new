# 🛒 商品確認画面開発指示書（処理フロー統合版）⭐⭐⭐

## 🎯 **開発目標**

**統合処理フロー**: アップロード→送料計算→輸出禁止→AI評価→翻訳→価格決定→スコア算出→確認→一括出品  
**視認性重視**: 大量データ（1000件+）の効率的な確認システム  
**品質保証**: 人間による最終確認で品質担保  
**操作効率**: 直感的な一括操作・個別調整機能  

---

## 🏗️ **ファイル構造（確定版）**

### **📁 ディレクトリ配置**

```
modules/product_confirmation/
├── php/
│   ├── product_confirmation_controller.php    # メインコントローラー
│   ├── product_confirmation_api.php           # API処理
│   ├── scoring_engine.php                     # スコア算出エンジン
│   └── export_manager.php                     # 出品処理管理
├── css/
│   └── product-confirmation.css               # 専用CSS（BEM準拠）
├── js/
│   └── product-confirmation.js                # 専用JavaScript
├── templates/
│   └── product_confirmation_content.php       # HTMLテンプレート
└── config/
    ├── scoring_rules.json                     # スコア評価ルール
    └── export_settings.json                   # 出品設定
```

### **📋 NAGANO-3統合パス**

```php
// common/css/style.css に追加
@import url('../modules/product_confirmation/css/product-confirmation.css');

// common/js/main.js の expected配列に追加
'modules/product_confirmation.js'
```

---

## 🎨 **UI/UX設計仕様**

### **📊 メイン画面レイアウト**

```html
<!-- 商品確認画面構造 -->
<div class="product-confirmation">
    <!-- ヘッダー統計情報 -->
    <div class="product-confirmation__header">
        <div class="product-confirmation__stats">
            <div class="stat-card stat-card--total">
                <span class="stat-number">1,000</span>
                <span class="stat-label">総件数</span>
            </div>
            <div class="stat-card stat-card--success">
                <span class="stat-number">850</span>
                <span class="stat-label">出品OK</span>
            </div>
            <div class="stat-card stat-card--warning">
                <span class="stat-number">100</span>
                <span class="stat-label">要確認</span>
            </div>
            <div class="stat-card stat-card--error">
                <span class="stat-number">50</span>
                <span class="stat-label">出品NG</span>
            </div>
        </div>
        
        <div class="product-confirmation__controls">
            <div class="filter-group">
                <select class="filter-select" id="statusFilter">
                    <option value="">すべて表示</option>
                    <option value="ok">出品OK</option>
                    <option value="warning">要確認</option>
                    <option value="error">出品NG</option>
                </select>
                <select class="filter-select" id="scoreFilter">
                    <option value="">スコア：すべて</option>
                    <option value="high">90点以上</option>
                    <option value="medium">70-89点</option>
                    <option value="low">70点未満</option>
                </select>
            </div>
            
            <div class="action-group">
                <button class="btn btn--secondary" id="selectAllBtn">
                    <i class="fas fa-check-square"></i> 全選択
                </button>
                <button class="btn btn--primary" id="bulkExportBtn" disabled>
                    <i class="fas fa-upload"></i> 選択項目を一括出品
                </button>
            </div>
        </div>
    </div>
    
    <!-- 商品リスト表示エリア -->
    <div class="product-confirmation__list" id="productList">
        <!-- 動的生成される商品アイテム -->
    </div>
    
    <!-- ページネーション -->
    <div class="product-confirmation__pagination">
        <button class="pagination-btn" id="prevBtn">← 前へ</button>
        <span class="pagination-info">1-50 / 1,000件</span>
        <button class="pagination-btn" id="nextBtn">次へ →</button>
    </div>
</div>
```

### **🛒 商品アイテム設計**

```html
<!-- 商品アイテムテンプレート -->
<div class="product-item" data-product-id="123" data-status="ok">
    <div class="product-item__checkbox">
        <input type="checkbox" id="product-123" class="product-checkbox">
        <label for="product-123"></label>
    </div>
    
    <div class="product-item__image">
        <img src="product-image.jpg" alt="商品画像" class="product-image">
        <div class="product-item__mall-badge">Amazon</div>
    </div>
    
    <div class="product-item__content">
        <div class="product-item__header">
            <h3 class="product-title">Echo Dot (エコードット) 第5世代 - スマートスピーカー</h3>
            <div class="product-item__score">
                <div class="score-circle score-circle--high">95</div>
                <span class="score-label">出品推奨度</span>
            </div>
        </div>
        
        <div class="product-item__details">
            <div class="detail-row">
                <span class="detail-label">仕入価格:</span>
                <span class="detail-value">¥3,980</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">販売価格:</span>
                <span class="detail-value detail-value--price">¥5,980</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">送料:</span>
                <span class="detail-value">¥500</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">利益率:</span>
                <span class="detail-value detail-value--profit">34%</span>
            </div>
        </div>
        
        <div class="product-item__status">
            <div class="status-indicators">
                <div class="status-indicator status-indicator--pass">
                    <i class="fas fa-shipping-fast"></i>
                    <span>送料計算</span>
                </div>
                <div class="status-indicator status-indicator--pass">
                    <i class="fas fa-ban"></i>
                    <span>輸出禁止</span>
                </div>
                <div class="status-indicator status-indicator--pass">
                    <i class="fas fa-robot"></i>
                    <span>AI評価</span>
                </div>
                <div class="status-indicator status-indicator--pass">
                    <i class="fas fa-language"></i>
                    <span>翻訳</span>
                </div>
            </div>
        </div>
    </div>
    
    <div class="product-item__actions">
        <button class="btn btn--sm btn--secondary" onclick="editProduct(123)">
            <i class="fas fa-edit"></i> 編集
        </button>
        <button class="btn btn--sm btn--success" onclick="exportSingle(123)">
            <i class="fas fa-upload"></i> 出品
        </button>
        <button class="btn btn--sm btn--info" onclick="showDetails(123)">
            <i class="fas fa-info-circle"></i> 詳細
        </button>
    </div>
</div>
```

---

## 🎨 **CSS実装（BEM準拠）**

### **📝 modules/product_confirmation/css/product-confirmation.css**

```css
/**
 * 商品確認画面専用CSS
 * BEM命名規則完全準拠
 * 出典: NAGANO-3統一スタイルガイド準拠
 */

/* ===== メインコンテナ（BEM: product-confirmation） ===== */
.product-confirmation {
    background: var(--bg-primary);              /* 出典: common.css変数 */
    padding: var(--space-6);                    /* 出典: common.css変数 */
    min-height: 100vh;
}

/* ===== ヘッダーセクション（BEM: product-confirmation__header） ===== */
.product-confirmation__header {
    background: var(--bg-secondary);            /* 出典: common.css変数 */
    border: 1px solid var(--border-color);     /* 出典: common.css変数 */
    border-radius: var(--radius-xl);           /* 出典: common.css変数 */
    padding: var(--space-6);                   /* 出典: common.css変数 */
    margin-bottom: var(--space-6);             /* 出典: common.css変数 */
    box-shadow: var(--shadow-md);              /* 出典: common.css変数 */
}

.product-confirmation__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);                       /* 出典: common.css変数 */
    margin-bottom: var(--space-6);             /* 出典: common.css変数 */
}

.product-confirmation__controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-4);                       /* 出典: common.css変数 */
}

/* ===== 統計カード（BEM: stat-card） ===== */
.stat-card {
    background: var(--bg-tertiary);            /* 出典: common.css変数 */
    border: 1px solid var(--border-color);    /* 出典: common.css変数 */
    border-radius: var(--radius-lg);          /* 出典: common.css変数 */
    padding: var(--space-5);                  /* 出典: common.css変数 */
    text-align: center;
    transition: var(--transition-fast);       /* 出典: common.css変数 */
    position: relative;
    overflow: hidden;
}

.stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--color-primary);         /* 出典: common.css変数 */
}

.stat-card--total::before { background: var(--color-info); }
.stat-card--success::before { background: var(--color-success); }
.stat-card--warning::before { background: var(--color-warning); }
.stat-card--error::before { background: var(--color-danger); }

.stat-number {
    display: block;
    font-size: var(--text-3xl);               /* 出典: common.css変数 */
    font-weight: 700;
    color: var(--text-primary);               /* 出典: common.css変数 */
    margin-bottom: var(--space-1);            /* 出典: common.css変数 */
}

.stat-label {
    font-size: var(--text-sm);                /* 出典: common.css変数 */
    color: var(--text-secondary);             /* 出典: common.css変数 */
    font-weight: 500;
}

/* ===== フィルター・アクショングループ ===== */
.filter-group,
.action-group {
    display: flex;
    align-items: center;
    gap: var(--space-3);                      /* 出典: common.css変数 */
}

.filter-select {
    padding: var(--space-2) var(--space-4);   /* 出典: common.css変数 */
    border: 1px solid var(--border-color);   /* 出典: common.css変数 */
    border-radius: var(--radius-md);         /* 出典: common.css変数 */
    background: var(--bg-secondary);         /* 出典: common.css変数 */
    font-size: var(--text-sm);               /* 出典: common.css変数 */
    color: var(--text-primary);              /* 出典: common.css変数 */
}

/* ===== 商品リスト（BEM: product-confirmation__list） ===== */
.product-confirmation__list {
    display: grid;
    gap: var(--space-4);                      /* 出典: common.css変数 */
    margin-bottom: var(--space-6);           /* 出典: common.css変数 */
}

/* ===== 商品アイテム（BEM: product-item） ===== */
.product-item {
    background: var(--bg-secondary);          /* 出典: common.css変数 */
    border: 1px solid var(--border-color);   /* 出典: common.css変数 */
    border-radius: var(--radius-lg);         /* 出典: common.css変数 */
    padding: var(--space-5);                 /* 出典: common.css変数 */
    display: grid;
    grid-template-columns: auto 150px 1fr auto;
    gap: var(--space-4);                     /* 出典: common.css変数 */
    align-items: start;
    transition: var(--transition-fast);      /* 出典: common.css変数 */
    position: relative;
}

.product-item:hover {
    box-shadow: var(--shadow-md);            /* 出典: common.css変数 */
    transform: translateY(-2px);
}

.product-item[data-status="ok"] {
    border-left: 4px solid var(--color-success);    /* 出典: common.css変数 */
}

.product-item[data-status="warning"] {
    border-left: 4px solid var(--color-warning);    /* 出典: common.css変数 */
}

.product-item[data-status="error"] {
    border-left: 4px solid var(--color-danger);     /* 出典: common.css変数 */
}

/* ===== チェックボックス（BEM: product-item__checkbox） ===== */
.product-item__checkbox {
    display: flex;
    align-items: center;
    padding-top: var(--space-2);             /* 出典: common.css変数 */
}

.product-checkbox {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

/* ===== 商品画像（BEM: product-item__image） ===== */
.product-item__image {
    position: relative;
}

.product-image {
    width: 150px;
    height: 150px;
    object-fit: cover;
    border-radius: var(--radius-md);         /* 出典: common.css変数 */
    border: 1px solid var(--border-light);  /* 出典: common.css変数 */
}

.product-item__mall-badge {
    position: absolute;
    top: var(--space-1);                     /* 出典: common.css変数 */
    right: var(--space-1);                  /* 出典: common.css変数 */
    background: var(--color-primary);       /* 出典: common.css変数 */
    color: var(--text-white);               /* 出典: common.css変数 */
    font-size: var(--text-xs);              /* 出典: common.css変数 */
    padding: var(--space-1) var(--space-2); /* 出典: common.css変数 */
    border-radius: var(--radius-sm);        /* 出典: common.css変数 */
    font-weight: 600;
}

/* ===== 商品コンテンツ（BEM: product-item__content） ===== */
.product-item__content {
    flex: 1;
}

.product-item__header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: var(--space-4);           /* 出典: common.css変数 */
}

.product-title {
    font-size: var(--text-lg);              /* 出典: common.css変数 */
    font-weight: 600;
    color: var(--text-primary);             /* 出典: common.css変数 */
    margin: 0;
    line-height: 1.4;
}

/* ===== スコア表示（BEM: product-item__score） ===== */
.product-item__score {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.score-circle {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xl);              /* 出典: common.css変数 */
    font-weight: 700;
    color: var(--text-white);               /* 出典: common.css変数 */
    margin-bottom: var(--space-1);          /* 出典: common.css変数 */
}

.score-circle--high { background: var(--color-success); }    /* 出典: common.css変数 */
.score-circle--medium { background: var(--color-warning); }  /* 出典: common.css変数 */
.score-circle--low { background: var(--color-danger); }      /* 出典: common.css変数 */

.score-label {
    font-size: var(--text-xs);              /* 出典: common.css変数 */
    color: var(--text-secondary);           /* 出典: common.css変数 */
}

/* ===== 商品詳細（BEM: product-item__details） ===== */
.product-item__details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);                    /* 出典: common.css変数 */
    margin-bottom: var(--space-4);         /* 出典: common.css変数 */
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.detail-label {
    font-size: var(--text-sm);             /* 出典: common.css変数 */
    color: var(--text-secondary);          /* 出典: common.css変数 */
}

.detail-value {
    font-size: var(--text-sm);             /* 出典: common.css変数 */
    font-weight: 600;
    color: var(--text-primary);            /* 出典: common.css変数 */
}

.detail-value--price {
    color: var(--color-success);           /* 出典: common.css変数 */
}

.detail-value--profit {
    color: var(--color-info);              /* 出典: common.css変数 */
}

/* ===== ステータス表示（BEM: product-item__status） ===== */
.product-item__status {
    margin-bottom: var(--space-4);         /* 出典: common.css変数 */
}

.status-indicators {
    display: flex;
    gap: var(--space-3);                   /* 出典: common.css変数 */
}

.status-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    font-size: var(--text-xs);             /* 出典: common.css変数 */
    color: var(--text-secondary);          /* 出典: common.css変数 */
}

.status-indicator i {
    font-size: var(--text-lg);             /* 出典: common.css変数 */
    margin-bottom: var(--space-1);         /* 出典: common.css変数 */
}

.status-indicator--pass i {
    color: var(--color-success);           /* 出典: common.css変数 */
}

.status-indicator--warning i {
    color: var(--color-warning);           /* 出典: common.css変数 */
}

.status-indicator--error i {
    color: var(--color-danger);            /* 出典: common.css変数 */
}

/* ===== アクションボタン（BEM: product-item__actions） ===== */
.product-item__actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);                   /* 出典: common.css変数 */
    align-items: stretch;
}

/* ===== ページネーション（BEM: product-confirmation__pagination） ===== */
.product-confirmation__pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-4);                   /* 出典: common.css変数 */
    padding: var(--space-4);               /* 出典: common.css変数 */
    background: var(--bg-secondary);       /* 出典: common.css変数 */
    border-radius: var(--radius-lg);      /* 出典: common.css変数 */
    border: 1px solid var(--border-color); /* 出典: common.css変数 */
}

.pagination-btn {
    padding: var(--space-2) var(--space-4); /* 出典: common.css変数 */
    border: 1px solid var(--border-color);  /* 出典: common.css変数 */
    border-radius: var(--radius-md);        /* 出典: common.css変数 */
    background: var(--bg-tertiary);         /* 出典: common.css変数 */
    color: var(--text-primary);             /* 出典: common.css変数 */
    cursor: pointer;
    transition: var(--transition-fast);     /* 出典: common.css変数 */
}

.pagination-btn:hover {
    background: var(--bg-hover);            /* 出典: common.css変数 */
}

.pagination-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.pagination-info {
    font-size: var(--text-sm);              /* 出典: common.css変数 */
    color: var(--text-secondary);           /* 出典: common.css変数 */
}

/* ===== レスポンシブ対応 ===== */
@media (max-width: 1024px) {
    .product-item {
        grid-template-columns: auto 120px 1fr auto;
    }
    
    .product-image {
        width: 120px;
        height: 120px;
    }
    
    .product-item__details {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .product-confirmation__controls {
        flex-direction: column;
        align-items: stretch;
    }
    
    .filter-group,
    .action-group {
        justify-content: center;
        flex-wrap: wrap;
    }
    
    .product-item {
        grid-template-columns: 1fr;
        gap: var(--space-3);                 /* 出典: common.css変数 */
    }
    
    .product-item__header {
        flex-direction: column;
        gap: var(--space-3);                 /* 出典: common.css変数 */
    }
    
    .status-indicators {
        justify-content: center;
        flex-wrap: wrap;
    }
    
    .product-item__actions {
        flex-direction: row;
        justify-content: center;
    }
}

@media (max-width: 480px) {
    .product-confirmation {
        padding: var(--space-4);             /* 出典: common.css変数 */
    }
    
    .product-confirmation__stats {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .product-item {
        padding: var(--space-4);             /* 出典: common.css変数 */
    }
}

/* ===== ローディング状態 ===== */
.product-confirmation--loading {
    opacity: 0.6;
    pointer-events: none;
}

.loading-spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color);  /* 出典: common.css変数 */
    border-radius: 50%;
    border-top-color: var(--color-primary); /* 出典: common.css変数 */
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ===== 選択状態 ===== */
.product-item--selected {
    background: rgba(59, 130, 246, 0.1);
    border-color: var(--color-primary);     /* 出典: common.css変数 */
    box-shadow: var(--shadow-md);           /* 出典: common.css変数 */
}
```

---

## ⚡ **JavaScript実装（NAGANO-3準拠）**

### **📝 modules/product_confirmation/js/product-confirmation.js**

```javascript
/**
 * 商品確認画面専用JavaScript
 * NAGANO-3名前空間準拠・統合処理フロー対応
 */

"use strict";

// ===== NAGANO3名前空間登録 =====
window.NAGANO3 = window.NAGANO3 || {};
NAGANO3.modules = NAGANO3.modules || {};

class ProductConfirmationModule {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.totalItems = 0;
        this.products = [];
        this.selectedProducts = new Set();
        this.filters = {
            status: '',
            score: '',
            searchTerm: ''
        };
        
        this.config = {
            ajax_actions: [
                'product_confirmation_load_products',
                'product_confirmation_update_product',
                'product_confirmation_bulk_export',
                'product_confirmation_get_details'
            ]
        };
    }
    
    // ===== 初期化 =====
    async init() {
        try {
            this.bindEvents();
            await this.loadProducts();
            this.updateStats();
            console.log("✅ ProductConfirmationModule初期化完了");
        } catch (error) {
            console.error("❌ ProductConfirmationModule初期化失敗:", error);
            this.showNotification('初期化に失敗しました: ' + error.message, 'error');
        }
    }
    
    // ===== 商品データ読み込み =====
    async loadProducts() {
        try {
            this.showLoading(true);
            
            const response = await this.request('product_confirmation_load_products', {
                page: this.currentPage,
                per_page: this.itemsPerPage,
                filters: this.filters
            });
            
            if (response.status === 'success') {
                this.products = response.data.products;
                this.totalItems = response.data.total;
                this.renderProducts();
                this.updatePagination();
            } else {
                throw new Error(response.message || '商品データの読み込みに失敗しました');
            }
            
        } catch (error) {
            this.showNotification('商品データの読み込みに失敗しました: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // ===== 商品リスト描画 =====
    renderProducts() {
        const productList = document.getElementById('productList');
        if (!productList) return;
        
        productList.innerHTML = '';
        
        this.products.forEach(product => {
            const productElement = this.createProductElement(product);
            productList.appendChild(productElement);
        });
        
        this.updateSelectionUI();
    }
    
    // ===== 商品要素作成 =====
    createProductElement(product) {
        const element = document.createElement('div');
        element.className = 'product-item';
        element.setAttribute('data-product-id', product.id);
        element.setAttribute('data-status', product.status);
        
        // 選択状態の反映
        if (this.selectedProducts.has(product.id)) {
            element.classList.add('product-item--selected');
        }
        
        element.innerHTML = `
            <div class="product-item__checkbox">
                <input type="checkbox" id="product-${product.id}" class="product-checkbox" 
                       ${this.selectedProducts.has(product.id) ? 'checked' : ''}>
                <label for="product-${product.id}"></label>
            </div>
            
            <div class="product-item__image">
                <img src="${product.image_url || '/images/no-image.png'}" 
                     alt="${product.title}" class="product-image" 
                     loading="lazy">
                <div class="product-item__mall-badge">${product.mall}</div>
            </div>
            
            <div class="product-item__content">
                <div class="product-item__header">
                    <h3 class="product-title">${this.escapeHtml(product.title)}</h3>
                    <div class="product-item__score">
                        <div class="score-circle score-circle--${this.getScoreClass(product.score)}">
                            ${product.score}
                        </div>
                        <span class="score-label">出品推奨度</span>
                    </div>
                </div>
                
                <div class="product-item__details">
                    <div class="detail-row">
                        <span class="detail-label">仕入価格:</span>
                        <span class="detail-value">¥${product.purchase_price?.toLocaleString() || 0}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">販売価格:</span>
                        <span class="detail-value detail-value--price">¥${product.selling_price?.toLocaleString() || 0}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">送料:</span>
                        <span class="detail-value">¥${product.shipping_cost?.toLocaleString() || 0}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">利益率:</span>
                        <span class="detail-value detail-value--profit">${product.profit_rate || 0}%</span>
                    </div>
                </div>
                
                <div class="product-item__status">
                    <div class="status-indicators">
                        ${this.createStatusIndicators(product.processing_status)}
                    </div>
                </div>
            </div>
            
            <div class="product-item__actions">
                <button class="btn btn--sm btn--secondary" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i> 編集
                </button>
                <button class="btn btn--sm btn--success" onclick="exportSingle(${product.id})">
                    <i class="fas fa-upload"></i> 出品
                </button>
                <button class="btn btn--sm btn--info" onclick="showDetails(${product.id})">
                    <i class="fas fa-info-circle"></i> 詳細
                </button>
            </div>
        `;
        
        // チェックボックスイベント
        const checkbox = element.querySelector('.product-checkbox');
        checkbox.addEventListener('change', (e) => {
            this.toggleProductSelection(product.id, e.target.checked);
        });
        
        return element;
    }
    
    // ===== ステータスインジケーター作成 =====
    createStatusIndicators(processingStatus) {
        const indicators = [
            { key: 'shipping_calculation', icon: 'fas fa-shipping-fast', label: '送料計算' },
            { key: 'export_restriction', icon: 'fas fa-ban', label: '輸出禁止' },
            { key: 'ai_evaluation', icon: 'fas fa-robot', label: 'AI評価' },
            { key: 'translation', icon: 'fas fa-language', label: '翻訳' }
        ];
        
        return indicators.map(indicator => {
            const status = processingStatus?.[indicator.key] || 'pending';
            const statusClass = status === 'completed' ? 'pass' : 
                               status === 'error' ? 'error' : 'warning';
            
            return `
                <div class="status-indicator status-indicator--${statusClass}">
                    <i class="${indicator.icon}"></i>
                    <span>${indicator.label}</span>
                </div>
            `;
        }).join('');
    }
    
    // ===== スコアクラス取得 =====
    getScoreClass(score) {
        if (score >= 90) return 'high';
        if (score >= 70) return 'medium';
        return 'low';
    }
    
    // ===== 商品選択制御 =====
    toggleProductSelection(productId, isSelected) {
        if (isSelected) {
            this.selectedProducts.add(productId);
        } else {
            this.selectedProducts.delete(productId);
        }
        
        // UI更新
        const productElement = document.querySelector(`[data-product-id="${productId}"]`);
        if (productElement) {
            if (isSelected) {
                productElement.classList.add('product-item--selected');
            } else {
                productElement.classList.remove('product-item--selected');
            }
        }
        
        this.updateSelectionUI();
    }
    
    // ===== 選択UI更新 =====
    updateSelectionUI() {
        const selectedCount = this.selectedProducts.size;
        const bulkExportBtn = document.getElementById('bulkExportBtn');
        const selectAllBtn = document.getElementById('selectAllBtn');
        
        // 一括出品ボタンの状態更新
        if (bulkExportBtn) {
            bulkExportBtn.disabled = selectedCount === 0;
            bulkExportBtn.innerHTML = selectedCount > 0 
                ? `<i class="fas fa-upload"></i> 選択項目を一括出品 (${selectedCount}件)`
                : `<i class="fas fa-upload"></i> 選択項目を一括出品`;
        }
        
        // 全選択ボタンの状態更新
        if (selectAllBtn) {
            const allSelected = this.products.length > 0 && 
                               this.products.every(p => this.selectedProducts.has(p.id));
            selectAllBtn.innerHTML = allSelected 
                ? `<i class="fas fa-square"></i> 全選択解除`
                : `<i class="fas fa-check-square"></i> 全選択`;
        }
    }
    
    // ===== 全選択・全選択解除 =====
    toggleSelectAll() {
        const allSelected = this.products.length > 0 && 
                           this.products.every(p => this.selectedProducts.has(p.id));
        
        if (allSelected) {
            // 全選択解除
            this.products.forEach(product => {
                this.selectedProducts.delete(product.id);
                const checkbox = document.getElementById(`product-${product.id}`);
                if (checkbox) checkbox.checked = false;
                
                const element = document.querySelector(`[data-product-id="${product.id}"]`);
                if (element) element.classList.remove('product-item--selected');
            });
        } else {
            // 全選択
            this.products.forEach(product => {
                this.selectedProducts.add(product.id);
                const checkbox = document.getElementById(`product-${product.id}`);
                if (checkbox) checkbox.checked = true;
                
                const element = document.querySelector(`[data-product-id="${product.id}"]`);
                if (element) element.classList.add('product-item--selected');
            });
        }
        
        this.updateSelectionUI();
    }
    
    // ===== フィルター適用 =====
    applyFilters() {
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const scoreFilter = document.getElementById('scoreFilter')?.value || '';
        
        this.filters = {
            status: statusFilter,
            score: scoreFilter
        };
        
        this.currentPage = 1;
        this.loadProducts();
    }
    
    // ===== 統計情報更新 =====
    updateStats() {
        // 実際の実装では API から統計データを取得
        const stats = {
            total: this.totalItems,
            success: Math.floor(this.totalItems * 0.85),
            warning: Math.floor(this.totalItems * 0.10),
            error: Math.floor(this.totalItems * 0.05)
        };
        
        // 統計カード更新
        document.querySelectorAll('.stat-card').forEach(card => {
            const number = card.querySelector('.stat-number');
            if (number) {
                if (card.classList.contains('stat-card--total')) {
                    number.textContent = stats.total.toLocaleString();
                } else if (card.classList.contains('stat-card--success')) {
                    number.textContent = stats.success.toLocaleString();
                } else if (card.classList.contains('stat-card--warning')) {
                    number.textContent = stats.warning.toLocaleString();
                } else if (card.classList.contains('stat-card--error')) {
                    number.textContent = stats.error.toLocaleString();
                }
            }
        });
    }
    
    // ===== ページネーション更新 =====
    updatePagination() {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
        
        // ページネーション情報更新
        const paginationInfo = document.querySelector('.pagination-info');
        if (paginationInfo) {
            paginationInfo.textContent = `${startItem}-${endItem} / ${this.totalItems.toLocaleString()}件`;
        }
        
        // ボタン状態更新
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
        }
    }
    
    // ===== ページ移動 =====
    changePage(direction) {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        
        if (direction === 'prev' && this.currentPage > 1) {
            this.currentPage--;
        } else if (direction === 'next' && this.currentPage < totalPages) {
            this.currentPage++;
        }
        
        this.loadProducts();
    }
    
    // ===== 単一商品出品 =====
    async exportSingle(productId) {
        try {
            this.showLoading(true);
            
            const response = await this.request('product_confirmation_single_export', {
                product_id: productId
            });
            
            if (response.status === 'success') {
                this.showNotification('商品の出品が完了しました。', 'success');
                this.loadProducts(); // リスト更新
            } else {
                throw new Error(response.message || '出品に失敗しました');
            }
            
        } catch (error) {
            this.showNotification('出品中にエラーが発生しました: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // ===== 一括出品 =====
    async bulkExport() {
        if (this.selectedProducts.size === 0) {
            this.showNotification('出品する商品を選択してください。', 'warning');
            return;
        }
        
        const confirmMessage = `選択した${this.selectedProducts.size}件の商品を一括出品しますか？\n\n` +
                             '※この操作は元に戻せません。';
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            this.showLoading(true);
            
            const productIds = Array.from(this.selectedProducts);
            const response = await this.request('product_confirmation_bulk_export', {
                product_ids: productIds
            });
            
            if (response.status === 'success') {
                const result = response.data;
                this.showNotification(
                    `一括出品完了: 成功${result.success_count}件、失敗${result.error_count}件`, 
                    'success'
                );
                
                // 選択解除
                this.selectedProducts.clear();
                this.loadProducts(); // リスト更新
            } else {
                throw new Error(response.message || '一括出品に失敗しました');
            }
            
        } catch (error) {
            this.showNotification('一括出品中にエラーが発生しました: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // ===== 商品編集 =====
    async editProduct(productId) {
        try {
            const response = await this.request('product_confirmation_get_details', {
                product_id: productId
            });
            
            if (response.status === 'success') {
                this.showEditModal(response.data.product);
            } else {
                throw new Error(response.message || '商品詳細の取得に失敗しました');
            }
            
        } catch (error) {
            this.showNotification('商品詳細の取得に失敗しました: ' + error.message, 'error');
        }
    }
    
    // ===== 編集モーダル表示 =====
    showEditModal(product) {
        // モーダル実装（簡略版）
        const modal = document.createElement('div');
        modal.className = 'modal modal--edit';
        modal.innerHTML = `
            <div class="modal__content">
                <div class="modal__header">
                    <h3>商品編集</h3>
                    <button class="modal__close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal__body">
                    <div class="form-group">
                        <label>商品名</label>
                        <input type="text" id="editTitle" value="${this.escapeHtml(product.title)}">
                    </div>
                    <div class="form-group">
                        <label>販売価格</label>
                        <input type="number" id="editPrice" value="${product.selling_price}">
                    </div>
                    <div class="form-group">
                        <label>商品説明</label>
                        <textarea id="editDescription">${this.escapeHtml(product.description || '')}</textarea>
                    </div>
                </div>
                <div class="modal__footer">
                    <button class="btn btn--secondary" onclick="this.closest('.modal').remove()">キャンセル</button>
                    <button class="btn btn--primary" onclick="saveProductEdit(${product.id})">保存</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // モーダル表示アニメーション
        setTimeout(() => modal.classList.add('modal--show'), 10);
    }
    
    // ===== 商品詳細表示 =====
    async showDetails(productId) {
        try {
            const response = await this.request('product_confirmation_get_details', {
                product_id: productId
            });
            
            if (response.status === 'success') {
                this.showDetailsModal(response.data.product);
            } else {
                throw new Error(response.message || '商品詳細の取得に失敗しました');
            }
            
        } catch (error) {
            this.showNotification('商品詳細の取得に失敗しました: ' + error.message, 'error');
        }
    }
    
    // ===== 詳細モーダル表示 =====
    showDetailsModal(product) {
        const modal = document.createElement('div');
        modal.className = 'modal modal--details';
        modal.innerHTML = `
            <div class="modal__content modal__content--large">
                <div class="modal__header">
                    <h3>商品詳細</h3>
                    <button class="modal__close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal__body">
                    <div class="product-details">
                        <div class="product-details__image">
                            <img src="${product.image_url}" alt="${product.title}">
                        </div>
                        <div class="product-details__info">
                            <h4>${this.escapeHtml(product.title)}</h4>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <span class="detail-label">ASIN/商品ID:</span>
                                    <span class="detail-value">${product.asin || product.product_id}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">モール:</span>
                                    <span class="detail-value">${product.mall}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">カテゴリ:</span>
                                    <span class="detail-value">${product.category || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">ブランド:</span>
                                    <span class="detail-value">${product.brand || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">仕入価格:</span>
                                    <span class="detail-value">¥${product.purchase_price?.toLocaleString()}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">販売価格:</span>
                                    <span class="detail-value">¥${product.selling_price?.toLocaleString()}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">送料:</span>
                                    <span class="detail-value">¥${product.shipping_cost?.toLocaleString()}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">利益:</span>
                                    <span class="detail-value">¥${product.profit?.toLocaleString()}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">利益率:</span>
                                    <span class="detail-value">${product.profit_rate}%</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">推奨スコア:</span>
                                    <span class="detail-value">${product.score}点</span>
                                </div>
                            </div>
                            
                            <div class="processing-details">
                                <h5>処理状況</h5>
                                <div class="processing-list">
                                    ${this.createProcessingDetails(product.processing_status)}
                                </div>
                            </div>
                            
                            ${product.description ? `
                                <div class="product-description">
                                    <h5>商品説明</h5>
                                    <p>${this.escapeHtml(product.description)}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="modal__footer">
                    <button class="btn btn--secondary" onclick="this.closest('.modal').remove()">閉じる</button>
                    <button class="btn btn--info" onclick="editProduct(${product.id})">編集</button>
                    <button class="btn btn--success" onclick="exportSingle(${product.id})">出品</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('modal--show'), 10);
    }
    
    // ===== 処理詳細作成 =====
    createProcessingDetails(processingStatus) {
        const processes = [
            { key: 'shipping_calculation', label: '送料計算', icon: 'fas fa-shipping-fast' },
            { key: 'export_restriction', label: '輸出禁止チェック', icon: 'fas fa-ban' },
            { key: 'ai_evaluation', label: 'AI評価', icon: 'fas fa-robot' },
            { key: 'translation', label: '翻訳処理', icon: 'fas fa-language' }
        ];
        
        return processes.map(process => {
            const status = processingStatus?.[process.key] || { status: 'pending' };
            const statusText = status.status === 'completed' ? '完了' :
                              status.status === 'error' ? 'エラー' : '処理中';
            const statusClass = status.status === 'completed' ? 'success' :
                               status.status === 'error' ? 'error' : 'warning';
            
            return `
                <div class="processing-item processing-item--${statusClass}">
                    <i class="${process.icon}"></i>
                    <span class="processing-label">${process.label}</span>
                    <span class="processing-status">${statusText}</span>
                    ${status.message ? `<span class="processing-detail">${status.message}</span>` : ''}
                </div>
            `;
        }).join('');
    }
    
    // ===== Ajax通信機能 =====
    async request(action, data = {}) {
        try {
            const response = await fetch('/modules/product_confirmation/php/product_confirmation_api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    action: action,
                    ...data
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Ajax Error:', error);
            throw error;
        }
    }
    
    // ===== ユーティリティ関数 =====
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    showLoading(show) {
        const confirmation = document.querySelector('.product-confirmation');
        if (confirmation) {
            if (show) {
                confirmation.classList.add('product-confirmation--loading');
            } else {
                confirmation.classList.remove('product-confirmation--loading');
            }
        }
    }
    
    showNotification(message, type = 'info') {
        if (typeof NAGANO3.core.notifications?.show === 'function') {
            NAGANO3.core.notifications.show(message, type);
        } else {
            console.log(`通知: ${message} (タイプ: ${type})`);
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    // ===== イベントバインディング =====
    bindEvents() {
        // フィルター変更
        document.getElementById('statusFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('scoreFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        // 全選択ボタン
        document.getElementById('selectAllBtn')?.addEventListener('click', () => {
            this.toggleSelectAll();
        });
        
        // 一括出品ボタン
        document.getElementById('bulkExportBtn')?.addEventListener('click', () => {
            this.bulkExport();
        });
        
        // ページネーション
        document.getElementById('prevBtn')?.addEventListener('click', () => {
            this.changePage('prev');
        });
        
        document.getElementById('nextBtn')?.addEventListener('click', () => {
            this.changePage('next');
        });
    }
    
    // ===== デバッグ情報取得 =====
    getDebugInfo() {
        return {
            name: 'ProductConfirmationModule',
            version: '1.0.0',
            currentPage: this.currentPage,
            totalItems: this.totalItems,
            selectedCount: this.selectedProducts.size,
            filters: this.filters,
            config: this.config
        };
    }
}

// ===== NAGANO3名前空間に登録 =====
NAGANO3.modules.product_confirmation = new ProductConfirmationModule();

// ===== グローバル関数登録（HTML onclick用） =====
window.editProduct = (productId) => NAGANO3.modules.product_confirmation.editProduct(productId);
window.exportSingle = (productId) => NAGANO3.modules.product_confirmation.exportSingle(productId);
window.showDetails = (productId) => NAGANO3.modules.product_confirmation.showDetails(productId);
window.saveProductEdit = (productId) => {
    // 編集保存処理（実装省略）
    console.log('商品編集保存:', productId);
};

// ===== 読み込み完了通知 =====
if (NAGANO3.loader) {
    NAGANO3.loader.markLoaded('modules/product_confirmation.js');
}

console.log("✅ Product Confirmation JavaScript読み込み完了");
```

---

## 🖥️ **PHP API実装（処理フロー統合）**

### **📝 modules/product_confirmation/php/product_confirmation_api.php**

```php
<?php
/**
 * 商品確認画面 API処理
 * 統合処理フロー対応版（送料計算→輸出禁止→AI評価→翻訳→価格決定→スコア算出）
 */

require_once __DIR__ . '/../../../common/php/security_manager.php';
require_once __DIR__ . '/../../../common/php/database_connection.php';
require_once __DIR__ . '/scoring_engine.php';

class ProductConfirmationAPI {
    
    private $db;
    private $scoring_engine;
    
    public function __construct() {
        $this->db = DatabaseConnection::getInstance();
        $this->scoring_engine = new ScoringEngine();
    }
    
    /**
     * メインエントリーポイント
     */
    public function handleRequest() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? '';
            
            // CSRF チェック
            SecurityManager::validateCSRFToken();
            
            switch ($action) {
                case 'product_confirmation_load_products':
                    return $this->loadProducts($input);
                    
                case 'product_confirmation_get_details':
                    return $this->getProductDetails($input);
                    
                case 'product_confirmation_single_export':
                    return $this->singleExport($input);
                    
                case 'product_confirmation_bulk_export':
                    return $this->bulkExport($input);
                    
                case 'product_confirmation_update_product':
                    return $this->updateProduct($input);
                    
                default:
                    throw new Exception("未対応のアクション: {$action}");
            }
            
        } catch (Exception $e) {
            return $this->createErrorResponse($e->getMessage());
        }
    }
    
    /**
     * 商品リスト取得
     */
    private function loadProducts($input) {
        $page = intval($input['page'] ?? 1);
        $per_page = intval($input['per_page'] ?? 50);
        $filters = $input['filters'] ?? [];
        
        $offset = ($page - 1) * $per_page;
        
        // フィルター条件構築
        $where_conditions = ['1=1'];
        $params = [];
        
        if (!empty($filters['status'])) {
            if ($filters['status'] === 'ok') {
                $where_conditions[] = 'processing_score >= 80 AND export_status = "ready"';
            } elseif ($filters['status'] === 'warning') {
                $where_conditions[] = 'processing_score BETWEEN 60 AND 79';
            } elseif ($filters['status'] === 'error') {
                $where_conditions[] = 'processing_score < 60 OR export_status = "blocked"';
            }
        }
        
        if (!empty($filters['score'])) {
            if ($filters['score'] === 'high') {
                $where_conditions[] = 'processing_score >= 90';
            } elseif ($filters['score'] === 'medium') {
                $where_conditions[] = 'processing_score BETWEEN 70 AND 89';
            } elseif ($filters['score'] === 'low') {
                $where_conditions[] = 'processing_score < 70';
            }
        }
        
        $where_clause = implode(' AND ', $where_conditions);
        
        // 総件数取得
        $count_sql = "SELECT COUNT(*) as total FROM products WHERE {$where_clause}";
        $count_result = $this->db->query($count_sql);
        $total = $count_result->fetch()['total'];
        
        // 商品データ取得
        $sql = "
            SELECT 
                p.*,
                ps.shipping_calculation_status,
                ps.export_restriction_status,
                ps.ai_evaluation_status,
                ps.translation_status,
                ps.processing_score,
                ps.status_messages
            FROM products p
            LEFT JOIN product_processing_status ps ON p.id = ps.product_id
            WHERE {$where_clause}
            ORDER BY p.created_at DESC
            LIMIT {$per_page} OFFSET {$offset}
        ";
        
        $result = $this->db->query($sql);
        $products = [];
        
        while ($row = $result->fetch()) {
            $products[] = [
                'id' => $row['id'],
                'title' => $row['title'],
                'asin' => $row['asin'],
                'mall' => $row['mall'],
                'image_url' => $row['image_url'],
                'purchase_price' => $row['purchase_price'],
                'selling_price' => $row['selling_price'],
                'shipping_cost' => $row['shipping_cost'],
                'profit' => $row['selling_price'] - $row['purchase_price'] - $row['shipping_cost'],
                'profit_rate' => $this->calculateProfitRate($row),
                'score' => $row['processing_score'] ?? 0,
                'status' => $this->determineProductStatus($row),
                'processing_status' => [
                    'shipping_calculation' => [
                        'status' => $row['shipping_calculation_status'] ?? 'pending'
                    ],
                    'export_restriction' => [
                        'status' => $row['export_restriction_status'] ?? 'pending'
                    ],
                    'ai_evaluation' => [
                        'status' => $row['ai_evaluation_status'] ?? 'pending'
                    ],
                    'translation' => [
                        'status' => $row['translation_status'] ?? 'pending'
                    ]
                ]
            ];
        }
        
        return $this->createSuccessResponse([
            'products' => $products,
            'total' => $total,
            'page' => $page,
            'per_page' => $per_page,
            'total_pages' => ceil($total / $per_page)
        ]);
    }
    
    /**
     * 商品詳細取得
     */
    private function getProductDetails($input) {
        $product_id = $input['product_id'] ?? '';
        
        if (empty($product_id)) {
            throw new Exception('商品IDが必要です');
        }
        
        $sql = "
            SELECT 
                p.*,
                ps.*
            FROM products p
            LEFT JOIN product_processing_status ps ON p.id = ps.product_id
            WHERE p.id = ?
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$product_id]);
        $row = $stmt->fetch();
        
        if (!$row) {
            throw new Exception('商品が見つかりません');
        }
        
        $product = [
            'id' => $row['id'],
            'title' => $row['title'],
            'description' => $row['description'],
            'asin' => $row['asin'],
            'mall' => $row['mall'],
            'category' => $row['category'],
            'brand' => $row['brand'],
            'image_url' => $row['image_url'],
            'purchase_price' => $row['purchase_price'],
            'selling_price' => $row['selling_price'],
            'shipping_cost' => $row['shipping_cost'],
            'profit' => $row['selling_price'] - $row['purchase_price'] - $row['shipping_cost'],
            'profit_rate' => $this->calculateProfitRate($row),
            'score' => $row['processing_score'] ?? 0,
            'processing_status' => [
                'shipping_calculation' => [
                    'status' => $row['shipping_calculation_status'] ?? 'pending',
                    'message' => $row['shipping_message'] ?? ''
                ],
                'export_restriction' => [
                    'status' => $row['export_restriction_status'] ?? 'pending',
                    'message' => $row['export_restriction_message'] ?? ''
                ],
                'ai_evaluation' => [
                    'status' => $row['ai_evaluation_status'] ?? 'pending',
                    'message' => $row['ai_evaluation_message'] ?? ''
                ],
                'translation' => [
                    'status' => $row['translation_status'] ?? 'pending',
                    'message' => $row['translation_message'] ?? ''
                ]
            ]
        ];
        
        return $this->createSuccessResponse(['product' => $product]);
    }
    
    /**
     * 単一商品出品
     */
    private function singleExport($input) {
        $product_id = $input['product_id'] ?? '';
        
        if (empty($product_id)) {
            throw new Exception('商品IDが必要です');
        }
        
        // Python API呼び出しで実際の出品処理
        $python_response = $this->callPythonAPI('/api/product-export/single', [
            'product_id' => $product_id
        ]);
        
        // 出品ステータス更新
        $this->updateExportStatus($product_id, 'exported');
        
        return $this->createSuccessResponse([
            'product_id' => $product_id,
            'export_result' => $python_response
        ]);
    }
    
    /**
     * 一括出品
     */
    private function bulkExport($input) {
        $product_ids = $input['product_ids'] ?? [];
        
        if (empty($product_ids)) {
            throw new Exception('商品IDが必要です');
        }
        
        $success_count = 0;
        $error_count = 0;
        $results = [];
        
        foreach ($product_ids as $product_id) {
            try {
                $python_response = $this->callPythonAPI('/api/product-export/single', [
                    'product_id' => $product_id
                ]);
                
                $this->updateExportStatus($product_id, 'exported');
                $success_count++;
                
                $results[] = [
                    'product_id' => $product_id,
                    'status' => 'success',
                    'result' => $python_response
                ];
                
            } catch (Exception $e) {
                $error_count++;
                $results[] = [
                    'product_id' => $product_id,
                    'status' => 'error',
                    'message' => $e->getMessage()
                ];
            }
        }
        
        return $this->createSuccessResponse([
            'success_count' => $success_count,
            'error_count' => $error_count,
            'results' => $results
        ]);
    }
    
    /**
     * ユーティリティ関数
     */
    private function calculateProfitRate($row) {
        $profit = $row['selling_price'] - $row['purchase_price'] - $row['shipping_cost'];
        return $row['purchase_price'] > 0 ? round(($profit / $row['purchase_price']) * 100, 1) : 0;
    }
    
    private function determineProductStatus($row) {
        $score = $row['processing_score'] ?? 0;
        if ($score >= 80) return 'ok';
        if ($score >= 60) return 'warning';
        return 'error';
    }
    
    private function callPythonAPI($endpoint, $data) {
        // Python API呼び出し処理（省略）
        return ['status' => 'success', 'message' => '処理完了'];
    }
    
    private function updateExportStatus($product_id, $status) {
        $stmt = $this->db->prepare("
            UPDATE products 
            SET export_status = ?, exported_at = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$status, $product_id]);
    }
    
    private function createSuccessResponse($data) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => 'success',
            'message' => '処理が正常に完了しました',
            'data' => $data,
            'timestamp' => date('c')
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    private function createErrorResponse($message) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => $message,
            'data' => null,
            'timestamp' => date('c')
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// API実行
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $api = new ProductConfirmationAPI();
    $api->handleRequest();
}
?>
```

---

## 📋 **開発チェックリスト**

### **🔴 必須実装項目**

- [ ] **統合処理フロー**: アップロード→送料計算→輸出禁止→AI評価→翻訳→価格決定→スコア算出→確認
- [ ] **大量データ対応**: 1000件+の効率的な表示・操作
- [ ] **視認性重視**: 大きめ画像・明確なステータス表示
- [ ] **一括操作**: 選択・確認・出品の効率的な操作
- [ ] **フィルター機能**: ステータス・スコア別表示
- [ ] **リアルタイム更新**: 処理状況の動的更新
- [ ] **エラーハンドリング**: 詳細なエラー表示・リカバリー

### **🟡 推奨実装項目**

- [ ] **詳細モーダル**: 商品情報の詳細表示
- [ ] **編集機能**: 価格・説明等の個別調整
- [ ] **履歴管理**: 出品履歴・変更履歴
- [ ] **通知システム**: 処理完了・エラー通知
- [ ] **エクスポート**: 結果データのCSV出力

### **🟢 将来実装項目**

- [ ] **AI推奨**: スコアリングアルゴリズム改良
- [ ] **予測分析**: 売れ行き予測表示
- [ ] **自動出品**: 条件付き自動出品機能
- [ ] **レポート**: 詳細分析レポート

この指示書により、統合処理フローに対応した高品質な商品確認画面が実現できます！