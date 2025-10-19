/**
 * eBay Test Viewer JavaScript - N3準拠版（構文エラー修正版）
 */

class EbayTestViewerN3 {
    constructor() {
        this.currentData = [];
        this.currentView = 'card';
        this.init();
    }

    init() {
        console.log('eBay Test Viewer N3準拠版初期化開始');
        this.setupGlobalFunctions();
        this.loadData();
    }

    setupGlobalFunctions() {
        window.ebayViewer = this;
        window.showProductDetail = (index) => this.showProductDetail(index);
        window.switchTab = this.switchTab.bind(this);
    }

    async loadData() {
        try {
            // データベースから直接画像URL取得
            const response = await fetch('/modules/ebay_test_viewer/database_images_clean.php');
            const result = await response.json();
            
            if (result.success && result.products) {
                this.currentData = result.products;
                this.displayDatabaseImages();
                console.log('データベース画像データ読み込み成功:', result.products.length);
            } else {
                console.error('データベース接続エラー:', result.error);
                this.displayError('データベースからデータを取得できませんでした');
            }
        } catch (error) {
            console.error('データ読み込みエラー:', error);
            this.displayError('通信エラーが発生しました');
        }
    }

    displayDatabaseImages() {
        const container = document.getElementById('sample-data') || document.querySelector('.cards-container');
        if (!container || !this.currentData.length) return;

        // データベース画像直接表示HTML生成
        const cardsHTML = this.currentData.map((product, index) => {
            const imageUrls = product.image_urls || [];
            const firstImage = imageUrls.length > 0 ? imageUrls[0] : '';
            const price = product.current_price_value ? parseFloat(product.current_price_value).toFixed(2) : '0.00';
            
            return `
                <div class="product-card" onclick="showProductDetail(${index})">
                    <div class="card-image-container">
                        <img src="${firstImage}" 
                             alt="${product.title || '商品画像'}"
                             class="card-image"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSIxMDAiIHk9Ijc1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIj5Ob0ltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                        <div class="card-overlay">
                            <div class="card-price">$${price}</div>
                            <div class="card-status ${product.listing_status || 'unknown'}">${product.listing_status || 'Unknown'}</div>
                        </div>
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">${product.title || 'タイトルなし'}</h3>
                        <div class="card-actions">
                            <button class="card-btn">詳細表示</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="database-images-header">
                <h3>データベース画像直接表示 (${this.currentData.length}件)</h3>
                <p>Base64変換なし - データベースURL直接表示</p>
            </div>
            <div class="cards-grid">
                ${cardsHTML}
            </div>
            ${this.getStyles()}
        `;
    }

    showProductDetail(index) {
        const product = this.currentData[index];
        if (!product) return;

        const imageUrls = product.image_urls || [];
        const detailHTML = `
            <div class="product-detail">
                <div class="detail-image">
                    <img src="${imageUrls[0] || ''}" alt="商品画像" style="max-width: 200px;">
                </div>
                <div class="detail-info">
                    <h3>${product.title}</h3>
                    <p>価格: $${product.current_price_value}</p>
                    <p>状態: ${product.listing_status}</p>
                    <p>eBay ID: ${product.ebay_item_id}</p>
                </div>
            </div>
        `;

        if (window.N3Modal) {
            N3Modal.setContent('test-modal', {
                title: '商品詳細',
                body: detailHTML
            });
            N3Modal.open('test-modal');
        } else {
            alert(`商品詳細:\n${product.title}\n価格: $${product.current_price_value}`);
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('tab-btn--active');
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('tab-content--active');
        });
        
        const activeBtn = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
        if (activeBtn) activeBtn.classList.add('tab-btn--active');
        
        const activeContent = document.getElementById(`tab-${tabName}`);
        if (activeContent) activeContent.classList.add('tab-content--active');
    }

    displayError(message) {
        const container = document.getElementById('sample-data');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>エラー</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()">再読み込み</button>
                </div>
            `;
        }
    }

    getStyles() {
        return `
            <style>
                .database-images-header {
                    text-align: center;
                    margin-bottom: 2rem;
                    padding: 1rem;
                    background: linear-gradient(135deg, #10b981 0%, #047857 100%);
                    color: white;
                    border-radius: 8px;
                }
                
                .cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 1.5rem;
                    padding: 1rem 0;
                }
                
                .product-card {
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                    cursor: pointer;
                }
                
                .product-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px rgba(0,0,0,0.15);
                }
                
                .card-image-container {
                    position: relative;
                    height: 200px;
                    overflow: hidden;
                }
                
                .card-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .card-overlay {
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
                
                .card-price {
                    color: white;
                    font-weight: bold;
                    font-size: 1.1rem;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.7);
                }
                
                .card-status {
                    color: white;
                    font-size: 0.8rem;
                    background: rgba(255,255,255,0.2);
                    padding: 4px 8px;
                    border-radius: 12px;
                    backdrop-filter: blur(4px);
                }
                
                .card-content {
                    padding: 1rem;
                }
                
                .card-title {
                    font-size: 0.9rem;
                    font-weight: 600;
                    margin: 0 0 0.5rem 0;
                    line-height: 1.3;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                .card-actions {
                    text-align: center;
                    margin-top: 0.5rem;
                }
                
                .card-btn {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: background 0.2s ease;
                }
                
                .card-btn:hover {
                    background: #2563eb;
                }
                
                .error-message {
                    text-align: center;
                    padding: 2rem;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    color: #991b1b;
                }
                
                @media (max-width: 768px) {
                    .cards-grid {
                        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                        gap: 1rem;
                    }
                }
            </style>
        `;
    }
}

// グローバル変数として定義
window.EbayTestViewerN3 = EbayTestViewerN3;

// タブ切り替えグローバル関数
window.switchTab = function(tabName) {
    if (window.ebayViewer && window.ebayViewer.switchTab) {
        window.ebayViewer.switchTab(tabName);
    }
};

// DOM読み込み後に初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('EbayTestViewerN3 初期化開始');
    new EbayTestViewerN3();
});

console.log('EbayTestViewerN3 モジュール読み込み完了');
