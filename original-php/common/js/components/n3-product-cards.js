/**
 * 🎯 N3商品カード管理システム - ES6 Class完全版
 * ファイル: common/js/components/n3-product-cards.js
 * 作成日: 2025年8月25日
 * 目的: DOM操作とビジネスロジック完全分離
 */

// 🎯 N3名前空間でグローバル汚染防止
window.N3 = window.N3 || {};

/**
 * 個別商品カードクラス
 * CSS操作を最小限に抑え、data属性とクラスで状態管理
 */
class N3ProductCard {
    constructor(productData, containerElement) {
        this.productData = this.sanitizeProductData(productData);
        this.containerElement = containerElement;
        this.element = null;
        
        // DOM要素参照
        this.imageElement = null;
        this.titleElement = null;
        this.priceElement = null;
        this.stockElement = null;
        this.badgeElement = null;
        
        // 状態管理
        this.isVisible = false;
        this.isSelected = false;
        this.hasError = false;
        
        this.init();
    }
    
    /**
     * 初期化処理
     */
    init() {
        console.log(`🎯 N3ProductCard初期化: ${this.productData.name}`);
        
        try {
            this.createElement();
            this.attachEvents();
            this.render();
            console.log(`✅ カード初期化完了: ${this.productData.name}`);
        } catch (error) {
            console.error(`❌ カード初期化エラー: ${error.message}`);
            this.showError('初期化エラー', error.message);
        }
    }
    
    /**
     * 商品データのサニタイズ
     */
    sanitizeProductData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('無効な商品データ');
        }
        
        return {
            id: data.id || Math.random().toString(36).substr(2, 9),
            name: String(data.name || '商品名不明'),
            sku: String(data.sku || 'SKU-UNKNOWN'),
            priceUSD: parseFloat(data.priceUSD || 0),
            costUSD: parseFloat(data.costUSD || 0),
            stock: parseInt(data.stock || 0),
            type: String(data.type || 'stock'),
            condition: String(data.condition || 'new'),
            category: String(data.category || 'Electronics'),
            image: String(data.image || ''),
            description: String(data.description || '')
        };
    }
    
    /**
     * DOM要素作成（完全にCSSに依存、スタイル直書き禁止）
     */
    createElement() {
        // メインカード要素
        this.element = document.createElement('div');
        this.element.className = 'n3-product-card js-product-card-click hover-lift hover-shadow';
        this.element.setAttribute('data-product-id', this.productData.id);
        this.element.setAttribute('data-product-type', this.productData.type);
        
        // HTML構造作成
        this.element.innerHTML = `
            <div class="n3-product-card__image js-card-image-lazy" data-image-url="${this.productData.image}">
                ${!this.productData.image ? `
                    <div class="n3-product-card__image-placeholder">
                        <i class="fas fa-image n3-product-card__image-placeholder-icon"></i>
                        <span class="n3-product-card__image-placeholder-text">画像なし</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="n3-product-card__info">
                <h3 class="n3-product-card__title">${this.productData.name}</h3>
                <div class="n3-product-card__price">$${this.productData.priceUSD.toFixed(2)}</div>
                
                <div class="n3-product-card__footer">
                    <span class="n3-badge n3-badge--${this.productData.type} n3-product-card__type-badge">
                        ${this.getTypeLabel(this.productData.type)}
                    </span>
                    <span class="n3-product-card__stock n3-product-card__stock--${this.productData.stock > 0 ? 'available' : 'empty'}">
                        在庫: ${this.productData.stock}
                    </span>
                </div>
            </div>
        `;
        
        // DOM要素参照取得
        this.imageElement = this.element.querySelector('.n3-product-card__image');
        this.titleElement = this.element.querySelector('.n3-product-card__title');
        this.priceElement = this.element.querySelector('.n3-product-card__price');
        this.stockElement = this.element.querySelector('.n3-product-card__stock');
        this.badgeElement = this.element.querySelector('.n3-product-card__type-badge');
    }
    
    /**
     * イベントリスナー設定
     */
    attachEvents() {
        // カードクリックイベント
        this.element.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleClick();
        });
        
        // ホバーイベント（ログ用）
        this.element.addEventListener('mouseenter', () => {
            console.log(`ホバー開始: ${this.productData.name}`);
        });
        
        // 画像遅延読み込み
        if (this.productData.image) {
            this.setupLazyImageLoading();
        }
    }
    
    /**
     * 画像遅延読み込み設定
     */
    setupLazyImageLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage();
                        imageObserver.unobserve(entry.target);
                    }
                });
            });
            
            imageObserver.observe(this.imageElement);
        } else {
            // フォールバック: 即座読み込み
            this.loadImage();
        }
    }
    
    /**
     * 画像読み込み（CSS backgroundでの表示）
     */
    loadImage() {
        if (this.productData.image) {
            // CSSのbackground-imageで表示
            this.imageElement.style.backgroundImage = `url('${this.productData.image}')`;
            
            // プレースホルダー非表示
            const placeholder = this.imageElement.querySelector('.n3-product-card__image-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            
            // 状態クラス追加
            this.element.classList.add('has-image');
            console.log(`✅ 画像読み込み完了: ${this.productData.name}`);
        }
    }
    
    /**
     * カードクリック処理
     */
    handleClick() {
        console.log(`🔥 カードクリック: ${this.productData.name}`);
        
        // 選択状態切り替え
        this.toggleSelection();
        
        // モーダル表示
        this.showModal();
    }
    
    /**
     * モーダル表示（Bootstrap使用）
     */
    showModal() {
        console.log(`🎯 モーダル表示: ${this.productData.name}`);
        
        // カスタムイベント発火
        const modalEvent = new CustomEvent('n3-product-card-modal', {
            detail: {
                productData: this.productData,
                cardElement: this.element
            }
        });
        
        document.dispatchEvent(modalEvent);
    }
    
    /**
     * 選択状態切り替え
     */
    toggleSelection() {
        this.isSelected = !this.isSelected;
        
        if (this.isSelected) {
            this.element.classList.add('n3-product-card--selected');
        } else {
            this.element.classList.remove('n3-product-card--selected');
        }
        
        console.log(`選択状態: ${this.isSelected ? 'ON' : 'OFF'} - ${this.productData.name}`);
    }
    
    /**
     * 表示状態制御
     */
    show() {
        this.isVisible = true;
        this.element.classList.add('is-visible');
        this.element.classList.remove('is-hidden');
    }
    
    hide() {
        this.isVisible = false;
        this.element.classList.add('is-hidden');
        this.element.classList.remove('is-visible');
    }
    
    /**
     * エラー状態表示
     */
    showError(title, message) {
        this.hasError = true;
        this.element.classList.add('n3-product-card--error');
        
        // エラー内容をタイトルに表示
        if (this.titleElement) {
            this.titleElement.textContent = `❌ ${title}`;
        }
        
        console.error(`❌ カードエラー: ${title} - ${message}`);
    }
    
    /**
     * 商品タイプラベル取得
     */
    getTypeLabel(type) {
        const labels = {
            stock: '有在庫',
            dropship: '無在庫',
            set: 'セット',
            hybrid: 'ハイブリッド'
        };
        return labels[type] || type;
    }
    
    /**
     * DOM要素を取得
     */
    getElement() {
        return this.element;
    }
    
    /**
     * 商品データ取得
     */
    getProductData() {
        return this.productData;
    }
    
    /**
     * 破棄処理
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        console.log(`🗑️ カード破棄: ${this.productData.name}`);
    }
}

/**
 * 商品カードコレクション管理クラス
 */
class N3ProductCardManager {
    constructor(containerSelector) {
        this.containerElement = document.querySelector(containerSelector);
        this.cards = new Map(); // Map<productId, N3ProductCard>
        this.isInitialized = false;
        
        if (!this.containerElement) {
            throw new Error(`コンテナ要素が見つかりません: ${containerSelector}`);
        }
        
        this.init();
    }
    
    /**
     * マネージャー初期化
     */
    init() {
        console.log('🎯 N3ProductCardManager初期化');
        
        // コンテナにCSSクラス追加
        this.containerElement.className = 'n3-product-cards';
        
        // モーダルイベントリスナー設定
        this.setupModalHandler();
        
        this.isInitialized = true;
        console.log('✅ N3ProductCardManager初期化完了');
    }
    
    /**
     * モーダルハンドラー設定
     */
    setupModalHandler() {
        document.addEventListener('n3-product-card-modal', (event) => {
            const { productData } = event.detail;
            this.showProductModal(productData);
        });
    }
    
    /**
     * 商品データからカード一括作成
     */
    renderCards(productsData) {
        console.log(`🎯 カード一括作成: ${productsData.length}件`);
        
        // 既存カード全削除
        this.clearAll();
        
        // 空状態チェック
        if (!productsData || productsData.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // カード作成
        let successCount = 0;
        let errorCount = 0;
        
        productsData.forEach((productData, index) => {
            try {
                const card = new N3ProductCard(productData, this.containerElement);
                this.cards.set(productData.id, card);
                
                // DOM追加
                this.containerElement.appendChild(card.getElement());
                card.show();
                
                successCount++;
                console.log(`✅ カード作成成功 ${index + 1}/${productsData.length}: ${productData.name}`);
                
            } catch (error) {
                errorCount++;
                console.error(`❌ カード作成エラー ${index + 1}/${productsData.length}:`, error);
                
                // エラーカード表示
                this.showErrorCard(`商品${index + 1}`, error.message);
            }
        });
        
        console.log(`🎊 カード作成完了: 成功${successCount}件, エラー${errorCount}件`);
    }
    
    /**
     * 空状態表示
     */
    showEmptyState() {
        this.containerElement.innerHTML = `
            <div class="n3-product-cards__empty">
                <i class="fas fa-box-open n3-product-cards__empty-icon"></i>
                <p class="n3-product-cards__empty-text">表示する商品がありません</p>
            </div>
        `;
    }
    
    /**
     * エラーカード表示
     */
    showErrorCard(title, message) {
        const errorCardElement = document.createElement('div');
        errorCardElement.className = 'n3-product-card n3-product-card--error';
        errorCardElement.innerHTML = `
            <div class="n3-product-card__info" style="text-align: center; color: var(--n3-color-danger);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                <h3 class="n3-product-card__title">${title}</h3>
                <p style="font-size: 0.875rem; margin: 0;">${message}</p>
            </div>
        `;
        
        this.containerElement.appendChild(errorCardElement);
    }
    
    /**
     * 商品モーダル表示（Bootstrap使用）
     */
    showProductModal(productData) {
        console.log(`🎯 商品モーダル表示: ${productData.name}`);
        
        // Bootstrap Modal使用前提
        if (typeof bootstrap !== 'undefined' && window.N3.createProductModal) {
            window.N3.createProductModal(productData);
        } else {
            // フォールバック: 簡易alert
            const details = [
                `商品名: ${productData.name}`,
                `SKU: ${productData.sku}`,
                `価格: $${productData.priceUSD.toFixed(2)}`,
                `在庫: ${productData.stock}`,
                `タイプ: ${productData.type}`
            ].join('\n');
            
            alert(`📦 商品詳細\n\n${details}`);
        }
    }
    
    /**
     * 全カード削除
     */
    clearAll() {
        this.cards.forEach(card => card.destroy());
        this.cards.clear();
        this.containerElement.innerHTML = '';
        
        console.log('🗑️ 全カード削除完了');
    }
    
    /**
     * 特定カード取得
     */
    getCard(productId) {
        return this.cards.get(productId);
    }
    
    /**
     * カード数取得
     */
    getCardCount() {
        return this.cards.size;
    }
}

// 🎯 N3名前空間にエクスポート
window.N3.ProductCard = N3ProductCard;
window.N3.ProductCardManager = N3ProductCardManager;

// 🎯 グローバル関数（後方互換性）
window.createN3ProductCards = function(productsData, containerSelector = '#card-grid') {
    try {
        const manager = new N3ProductCardManager(containerSelector);
        manager.renderCards(productsData);
        return manager;
    } catch (error) {
        console.error('❌ N3カード作成エラー:', error);
        return null;
    }
};

console.log('🎯 N3ProductCard システム読み込み完了');