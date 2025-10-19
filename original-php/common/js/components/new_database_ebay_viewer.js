/**
 * 新しいデータベース構造対応のeBay商品表示JavaScript
 * USA中心化 + 多国展開モーダル表示機能
 */

class NewDatabaseEbayViewer {
    constructor() {
        this.currentData = [];
        this.apiBaseUrl = '/modules/database_analysis/new_structure_viewer.php';
        this.init();
    }

    async init() {
        console.log('🎯 新構造eBay表示システム初期化開始');
        
        try {
            // 新しいデータベース構造からデータ取得
            await this.loadRealData();
            
            // UI初期化
            this.initializeUI();
            
            console.log('✅ 新構造eBay表示システム初期化完了');
        } catch (error) {
            console.error('❌ 初期化エラー:', error);
            this.showError('システム初期化に失敗しました');
        }
    }

    async loadRealData() {
        console.log('🔄 実際のデータベースからデータ取得開始');
        
        try {
            // 新構造APIからデータ取得
            const response = await fetch(`${this.apiBaseUrl}?api=products&limit=20`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            this.currentData = data;
            console.log(`✅ データ取得完了: ${data.length}件`);
            
            // データ表示
            this.displayProducts(data);
            
        } catch (error) {
            console.error('❌ データ取得エラー:', error);
            // フォールバック: サンプルデータ使用
            this.loadSampleData();
        }
    }

    loadSampleData() {
        console.log('🔄 フォールバック: サンプルデータ使用');
        
        const sampleData = [
            {
                master_id: 1,
                master_sku: 'STOCK_0001',
                product_title: 'Apple iPhone 14 Pro Max 256GB - Deep Purple (Unlocked)',
                usa_price_usd: 899.99,
                category_name: 'Cell Phones',
                condition_display_name: 'New',
                main_image_url: 'https://i.ebayimg.com/images/g/abc123/s-l1600.jpg',
                usa_listing_url: 'https://www.ebay.com/itm/123456789012',
                quantity: 5,
                is_multi_country: true,
                total_countries_count: 3,
                international_notice: '他2国でも出品中',
                price_display: '$899.99 - $945.00',
                available_countries: ['US', 'CA', 'UK']
            },
            {
                master_id: 2,
                master_sku: 'STOCK_0002',
                product_title: 'Samsung Galaxy S23 Ultra 512GB - Phantom Black',
                usa_price_usd: 799.00,
                category_name: 'Smartphones',
                condition_display_name: 'New',
                main_image_url: 'https://i.ebayimg.com/images/g/def456/s-l1600.jpg',
                usa_listing_url: 'https://www.ebay.com/itm/234567890123',
                quantity: 3,
                is_multi_country: false,
                total_countries_count: 1,
                international_notice: 'USA限定出品',
                price_display: '$799.00',
                available_countries: ['US']
            }
        ];
        
        this.currentData = sampleData;
        this.displayProducts(sampleData);
    }

    initializeUI() {
        // 商品詳細モーダルHTML追加
        this.createProductDetailModal();
        
        // モーダル関連イベント設定
        this.setupModalEvents();
    }

    createProductDetailModal() {
        const modalHTML = `
            <div id="productDetailModal" class="product-detail-modal" style="display: none;">
                <div class="product-detail-modal__overlay" onclick="this.closeProductDetail()"></div>
                <div class="product-detail-modal__content">
                    <div class="product-detail-modal__header">
                        <h2 id="modalProductTitle">商品詳細</h2>
                        <button class="product-detail-modal__close" onclick="window.newDbViewer.closeProductDetail()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="product-detail-modal__body" id="modalProductBody">
                        <!-- 動的コンテンツ -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // モーダルCSS追加
        this.addModalStyles();
    }

    addModalStyles() {
        const styles = `
            <style id="product-detail-modal-styles">
                .product-detail-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: modalFadeIn 0.3s ease;
                }

                .product-detail-modal__overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(2px);
                }

                .product-detail-modal__content {
                    position: relative;
                    background: white;
                    border-radius: 1rem;
                    width: 90vw;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                    animation: modalSlideIn 0.3s ease;
                }

                .product-detail-modal__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid #e2e8f0;
                    background: #f8fafc;
                }

                .product-detail-modal__header h2 {
                    margin: 0;
                    color: #1e293b;
                    font-size: 1.25rem;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    line-height: 1.4;
                }

                .product-detail-modal__close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #64748b;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                    margin-left: 1rem;
                }

                .product-detail-modal__close:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                }

                .product-detail-modal__body {
                    padding: 2rem;
                    max-height: 70vh;
                    overflow-y: auto;
                }

                /* USA商品情報セクション */
                .usa-product-section {
                    margin-bottom: 2rem;
                    padding: 1.5rem;
                    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                    border-radius: 0.75rem;
                    border: 1px solid #93c5fd;
                }

                .usa-product-section h3 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0 0 1rem 0;
                    color: #1e40af;
                    font-size: 1.1rem;
                }

                .usa-product-info {
                    display: grid;
                    grid-template-columns: auto 1fr auto;
                    gap: 1.5rem;
                    align-items: center;
                }

                .usa-product-image {
                    width: 120px;
                    height: 120px;
                    border-radius: 0.5rem;
                    object-fit: cover;
                    border: 2px solid #93c5fd;
                }

                .usa-product-details {
                    flex: 1;
                }

                .usa-price {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #1e40af;
                    margin-bottom: 0.5rem;
                }

                .usa-meta {
                    color: #475569;
                    font-size: 0.875rem;
                    margin-bottom: 1rem;
                }

                .usa-action {
                    text-align: right;
                }

                .ebay-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    background: #1e40af;
                    color: white;
                    text-decoration: none;
                    border-radius: 0.5rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }

                .ebay-link:hover {
                    background: #1e3a8a;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(30, 64, 175, 0.3);
                }

                /* 国際出品セクション */
                .international-section {
                    margin-bottom: 1.5rem;
                }

                .international-section h3 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0 0 1rem 0;
                    color: #059669;
                    font-size: 1.1rem;
                }

                .countries-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 1rem;
                }

                .country-item {
                    padding: 1rem;
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    border-radius: 0.5rem;
                    transition: all 0.2s ease;
                }

                .country-item:hover {
                    background: #dcfce7;
                    transform: translateY(-1px);
                }

                .country-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }

                .country-name {
                    font-weight: bold;
                    color: #166534;
                    font-size: 1rem;
                }

                .country-currency {
                    background: #16a34a;
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                }

                .country-price {
                    color: #374151;
                    margin-bottom: 0.5rem;
                }

                .price-local {
                    font-weight: bold;
                    font-size: 1.1rem;
                }

                .price-usd {
                    color: #6b7280;
                    font-size: 0.875rem;
                }

                .price-difference {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                }

                .price-higher {
                    background: #fef2f2;
                    color: #dc2626;
                }

                .price-lower {
                    background: #f0f9ff;
                    color: #0284c7;
                }

                .country-actions {
                    margin-top: 0.75rem;
                }

                .country-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.375rem;
                    padding: 0.5rem 1rem;
                    background: white;
                    border: 1px solid #16a34a;
                    color: #16a34a;
                    text-decoration: none;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }

                .country-link:hover {
                    background: #16a34a;
                    color: white;
                }

                /* 単一国の場合のメッセージ */
                .single-country-notice {
                    text-align: center;
                    padding: 2rem;
                    color: #64748b;
                    background: #f8fafc;
                    border-radius: 0.5rem;
                    border: 1px dashed #cbd5e1;
                }

                .single-country-notice i {
                    font-size: 2rem;
                    margin-bottom: 1rem;
                    color: #94a3b8;
                }

                /* アニメーション */
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }

                /* レスポンシブ */
                @media (max-width: 768px) {
                    .product-detail-modal__content {
                        width: 95vw;
                        margin: 0 2.5vw;
                    }

                    .product-detail-modal__body {
                        padding: 1.5rem;
                    }

                    .usa-product-info {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                        text-align: center;
                    }

                    .usa-product-image {
                        justify-self: center;
                    }

                    .countries-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupModalEvents() {
        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeProductDetail();
            }
        });
    }

    displayProducts(products) {
        const container = document.getElementById('sample-data');
        
        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-box-open"></i>
                    商品データがありません
                </div>
            `;
            return;
        }

        const productsHTML = products.map((product, index) => {
            const imageUrl = product.main_image_url || 'https://via.placeholder.com/200x200?text=No+Image';
            const multiCountryBadge = product.is_multi_country ? 
                `<div class="multi-country-badge">🌍 ${product.international_notice}</div>` : '';
            
            return `
                <div class="product-card" data-master-id="${product.master_id}">
                    <div class="product-image-container">
                        <img src="${imageUrl}" alt="${product.product_title}" class="product-image" loading="lazy">
                        <div class="product-overlay">
                            <div class="product-category">${product.category_name || 'その他'}</div>
                            <div class="product-price">${product.price_display}</div>
                        </div>
                        ${multiCountryBadge}
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.product_title}</h3>
                        <div class="product-meta">
                            <span class="product-condition">${product.condition_display_name || '不明'}</span>
                            <span class="product-sku">SKU: ${product.master_sku}</span>
                        </div>
                        <div class="product-actions">
                            <a href="${product.usa_listing_url}" target="_blank" class="btn btn--primary btn--small">
                                <i class="fas fa-external-link-alt"></i> eBay USA
                            </a>
                            <button class="btn btn--secondary btn--small" onclick="window.newDbViewer.showProductDetail(${product.master_id})">
                                <i class="fas fa-info-circle"></i> 詳細・他国
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="products-grid">
                ${productsHTML}
            </div>
        `;

        // 基本的なカードスタイルを追加
        if (!document.getElementById('product-card-styles')) {
            this.addProductCardStyles();
        }

        console.log(`✅ 商品表示完了: ${products.length}件`);
    }

    addProductCardStyles() {
        const cardStyles = `
            <style id="product-card-styles">
                .products-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.5rem;
                    margin: 1rem 0;
                }

                .product-card {
                    background: white;
                    border-radius: 0.75rem;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    transition: all 0.3s ease;
                    border: 1px solid #e2e8f0;
                }

                .product-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }

                .product-image-container {
                    position: relative;
                    height: 200px;
                    overflow: hidden;
                }

                .product-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .product-overlay {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0,0,0,0.8));
                    padding: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: end;
                }

                .product-category {
                    color: #e2e8f0;
                    font-size: 0.875rem;
                    font-weight: 500;
                }

                .product-price {
                    color: white;
                    font-size: 1.25rem;
                    font-weight: bold;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                }

                .multi-country-badge {
                    position: absolute;
                    top: 0.75rem;
                    right: 0.75rem;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    padding: 0.375rem 0.75rem;
                    border-radius: 1rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
                }

                .product-info {
                    padding: 1.25rem;
                }

                .product-title {
                    font-size: 1rem;
                    font-weight: 600;
                    color: #1e293b;
                    margin: 0 0 0.75rem 0;
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .product-meta {
                    display: flex;
                    justify-content: space-between;
                    color: #64748b;
                    font-size: 0.875rem;
                    margin-bottom: 1rem;
                }

                .product-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.375rem;
                    padding: 0.5rem 0.875rem;
                    border: none;
                    border-radius: 0.375rem;
                    font-size: 0.8125rem;
                    font-weight: 500;
                    text-decoration: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn--small {
                    padding: 0.375rem 0.75rem;
                    font-size: 0.75rem;
                }

                .btn--primary {
                    background: #3b82f6;
                    color: white;
                }

                .btn--primary:hover {
                    background: #2563eb;
                    transform: translateY(-1px);
                }

                .btn--secondary {
                    background: #f1f5f9;
                    color: #475569;
                    border: 1px solid #e2e8f0;
                }

                .btn--secondary:hover {
                    background: #e2e8f0;
                    color: #334155;
                }

                @media (max-width: 768px) {
                    .products-grid {
                        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                        gap: 1rem;
                    }

                    .product-actions {
                        flex-direction: column;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', cardStyles);
    }

    async showProductDetail(masterId) {
        console.log(`🔍 商品詳細表示: Master ID ${masterId}`);
        
        try {
            // モーダルを表示
            const modal = document.getElementById('productDetailModal');
            modal.style.display = 'flex';
            
            // ローディング表示
            document.getElementById('modalProductBody').innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #3b82f6; margin-bottom: 1rem;"></i>
                    <p>商品詳細を読み込み中...</p>
                </div>
            `;
            
            // データベースから商品詳細を取得
            const response = await fetch(`${this.apiBaseUrl}?api=product_detail&master_id=${masterId}`);
            const productDetail = await response.json();
            
            if (productDetail.error) {
                throw new Error(productDetail.error);
            }
            
            // 商品詳細を表示
            this.renderProductDetail(productDetail);
            
        } catch (error) {
            console.error('❌ 商品詳細表示エラー:', error);
            
            // エラー時はサンプル商品詳細を表示
            const sampleProduct = this.currentData.find(p => p.master_id == masterId) || this.currentData[0];
            if (sampleProduct) {
                this.renderSampleProductDetail(sampleProduct);
            } else {
                this.showError('商品詳細の取得に失敗しました');
            }
        }
    }

    renderProductDetail(productDetail) {
        const modal = document.getElementById('productDetailModal');
        const titleElement = document.getElementById('modalProductTitle');
        const bodyElement = document.getElementById('modalProductBody');
        
        // タイトル設定
        titleElement.textContent = productDetail.product_title;
        
        // 国際出品情報の処理
        const internationalListings = productDetail.international_listings || [];
        
        let internationalHTML = '';
        
        if (internationalListings.length > 0) {
            const countriesHTML = internationalListings.map(listing => {
                const priceDiffClass = listing.price_difference_percent > 0 ? 'price-higher' : 'price-lower';
                const priceDiffSign = listing.price_difference_percent > 0 ? '+' : '';
                
                return `
                    <div class="country-item">
                        <div class="country-header">
                            <div class="country-name">${this.getCountryName(listing.country_code)}</div>
                            <div class="country-currency">${listing.currency}</div>
                        </div>
                        <div class="country-price">
                            <div class="price-local">${listing.price_value} ${listing.currency}</div>
                            <div class="price-usd">($${listing.price_usd_equivalent} USD)</div>
                            <div class="price-difference ${priceDiffClass}">
                                ${priceDiffSign}${listing.price_difference_percent}%
                            </div>
                        </div>
                        <div class="country-actions">
                            <a href="${listing.listing_url}" target="_blank" class="country-link">
                                <i class="fas fa-external-link-alt"></i>
                                eBay ${listing.country_code}
                            </a>
                        </div>
                    </div>
                `;
            }).join('');
            
            internationalHTML = `
                <div class="international-section">
                    <h3><i class="fas fa-globe"></i> 国際出品情報 (${internationalListings.length}ヶ国)</h3>
                    <div class="countries-grid">
                        ${countriesHTML}
                    </div>
                </div>
            `;
        } else {
            internationalHTML = `
                <div class="international-section">
                    <h3><i class="fas fa-globe"></i> 国際出品情報</h3>
                    <div class="single-country-notice">
                        <i class="fas fa-flag-usa"></i>
                        <p>この商品はUSA限定で出品されています</p>
                        <small>他国での出品予定は現在ありません</small>
                    </div>
                </div>
            `;
        }
        
        // モーダル内容生成
        const imageUrl = (productDetail.picture_urls && productDetail.picture_urls.length > 0) ? 
            productDetail.picture_urls[0] : 'https://via.placeholder.com/120x120?text=No+Image';
        
        bodyElement.innerHTML = `
            <div class="usa-product-section">
                <h3><i class="fas fa-flag-usa"></i> USA商品情報 (メイン)</h3>
                <div class="usa-product-info">
                    <img src="${imageUrl}" alt="${productDetail.product_title}" class="usa-product-image">
                    <div class="usa-product-details">
                        <div class="usa-price">$${productDetail.usa_price_usd}</div>
                        <div class="usa-meta">
                            SKU: ${productDetail.master_sku} | 在庫: ${productDetail.quantity}個<br>
                            状態: ${productDetail.condition_display_name} | カテゴリ: ${productDetail.category_name}
                        </div>
                        ${productDetail.is_multi_country ? 
                            `<div style="color: #059669; font-weight: 500;">🌍 ${productDetail.total_countries_count}ヶ国で出品中</div>` :
                            `<div style="color: #64748b;">🇺🇸 USA限定出品</div>`
                        }
                    </div>
                    <div class="usa-action">
                        <a href="${productDetail.usa_listing_url}" target="_blank" class="ebay-link">
                            <i class="fas fa-external-link-alt"></i>
                            eBay USAで見る
                        </a>
                    </div>
                </div>
            </div>
            ${internationalHTML}
        `;
        
        console.log(`✅ 商品詳細表示完了: ${productDetail.product_title}`);
    }

    renderSampleProductDetail(sampleProduct) {
        const titleElement = document.getElementById('modalProductTitle');
        const bodyElement = document.getElementById('modalProductBody');
        
        titleElement.textContent = sampleProduct.product_title;
        
        const imageUrl = sampleProduct.main_image_url || 'https://via.placeholder.com/120x120?text=No+Image';
        
        // サンプル国際出品データ
        const sampleInternational = sampleProduct.is_multi_country ? [
            {
                country_code: 'CA',
                currency: 'CAD',
                price_value: Math.round(sampleProduct.usa_price_usd * 1.25),
                price_usd_equivalent: Math.round(sampleProduct.usa_price_usd * 1.02),
                price_difference_percent: 2.0,
                listing_url: 'https://www.ebay.ca/itm/sample'
            },
            {
                country_code: 'UK',
                currency: 'GBP',
                price_value: Math.round(sampleProduct.usa_price_usd * 0.82),
                price_usd_equivalent: Math.round(sampleProduct.usa_price_usd * 1.05),
                price_difference_percent: 5.0,
                listing_url: 'https://www.ebay.co.uk/itm/sample'
            }
        ] : [];
        
        let internationalHTML = '';
        
        if (sampleInternational.length > 0) {
            const countriesHTML = sampleInternational.map(listing => {
                const priceDiffClass = listing.price_difference_percent > 0 ? 'price-higher' : 'price-lower';
                
                return `
                    <div class="country-item">
                        <div class="country-header">
                            <div class="country-name">${this.getCountryName(listing.country_code)}</div>
                            <div class="country-currency">${listing.currency}</div>
                        </div>
                        <div class="country-price">
                            <div class="price-local">${listing.price_value} ${listing.currency}</div>
                            <div class="price-usd">($${listing.price_usd_equivalent} USD)</div>
                            <div class="price-difference ${priceDiffClass}">
                                +${listing.price_difference_percent}%
                            </div>
                        </div>
                        <div class="country-actions">
                            <a href="${listing.listing_url}" target="_blank" class="country-link">
                                <i class="fas fa-external-link-alt"></i>
                                eBay ${listing.country_code}
                            </a>
                        </div>
                    </div>
                `;
            }).join('');
            
            internationalHTML = `
                <div class="international-section">
                    <h3><i class="fas fa-globe"></i> 国際出品情報 (${sampleInternational.length}ヶ国)</h3>
                    <div class="countries-grid">
                        ${countriesHTML}
                    </div>
                </div>
            `;
        } else {
            internationalHTML = `
                <div class="international-section">
                    <h3><i class="fas fa-globe"></i> 国際出品情報</h3>
                    <div class="single-country-notice">
                        <i class="fas fa-flag-usa"></i>
                        <p>この商品はUSA限定で出品されています</p>
                        <small>他国での出品予定は現在ありません</small>
                    </div>
                </div>
            `;
        }
        
        bodyElement.innerHTML = `
            <div class="usa-product-section">
                <h3><i class="fas fa-flag-usa"></i> USA商品情報 (メイン)</h3>
                <div class="usa-product-info">
                    <img src="${imageUrl}" alt="${sampleProduct.product_title}" class="usa-product-image">
                    <div class="usa-product-details">
                        <div class="usa-price">$${sampleProduct.usa_price_usd}</div>
                        <div class="usa-meta">
                            SKU: ${sampleProduct.master_sku} | 在庫: ${sampleProduct.quantity}個<br>
                            状態: ${sampleProduct.condition_display_name} | カテゴリ: ${sampleProduct.category_name}
                        </div>
                        ${sampleProduct.is_multi_country ? 
                            `<div style="color: #059669; font-weight: 500;">🌍 ${sampleProduct.total_countries_count}ヶ国で出品中</div>` :
                            `<div style="color: #64748b;">🇺🇸 USA限定出品</div>`
                        }
                    </div>
                    <div class="usa-action">
                        <a href="${sampleProduct.usa_listing_url}" target="_blank" class="ebay-link">
                            <i class="fas fa-external-link-alt"></i>
                            eBay USAで見る
                        </a>
                    </div>
                </div>
            </div>
            ${internationalHTML}
        `;
        
        console.log(`✅ サンプル商品詳細表示: ${sampleProduct.product_title}`);
    }

    getCountryName(countryCode) {
        const countryNames = {
            'US': 'アメリカ',
            'CA': 'カナダ',
            'UK': 'イギリス',
            'AU': 'オーストラリア',
            'DE': 'ドイツ',
            'FR': 'フランス',
            'IT': 'イタリア',
            'ES': 'スペイン',
            'JP': '日本'
        };
        
        return countryNames[countryCode] || countryCode;
    }

    closeProductDetail() {
        const modal = document.getElementById('productDetailModal');
        if (modal) {
            modal.style.display = 'none';
        }
        console.log('📝 商品詳細モーダルを閉じました');
    }

    showError(message) {
        const container = document.getElementById('sample-data') || document.body;
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #dc2626;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

// グローバル初期化
document.addEventListener('DOMContentLoaded', function() {
    window.newDbViewer = new NewDatabaseEbayViewer();
    console.log('✅ 新構造eBayビューワー初期化完了');
});

// 従来のelement_viewer.jsとの互換性確保
if (window.EbayViewSwitcher) {
    console.log('🔄 従来のEbayViewSwitcherとの統合...');
    
    // 既存のsetDataメソッドをオーバーライド
    const originalSetData = window.EbayViewSwitcher.setData;
    window.EbayViewSwitcher.setData = function(data) {
        if (window.newDbViewer) {
            window.newDbViewer.displayProducts(data);
        } else {
            originalSetData.call(this, data);
        }
    };
}