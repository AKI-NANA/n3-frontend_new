/**
 * EbayTestViewerN3 - PostgreSQL配列対応版
 */

class EbayTestViewerN3Final {
    constructor() {
        this.currentData = [];
        this.init();
    }

    init() {
        console.log('EbayTestViewerN3Final PostgreSQL配列対応版 初期化開始');
        this.setupGlobalFunctions();
        this.loadDatabaseImages();
    }

    setupGlobalFunctions() {
        window.ebayViewerFinal = this;
        window.showProductDetail = (index) => this.showProductDetail(index);
    }

    async loadDatabaseImages() {
        try {
            const response = await fetch('/modules/ebay_test_viewer/database_postgresql_array.php');
            const result = await response.json();
            
            if (result.success && result.products) {
                this.currentData = result.products;
                this.displayImages();
                console.log(`PostgreSQL配列パース成功: ${result.count}件の有効商品 / ${result.total_processed}件処理`);
            } else {
                console.error('PostgreSQL配列パースエラー:', result.error);
                this.displayError('データベース読み込みに失敗しました');
            }
        } catch (error) {
            console.error('通信エラー:', error);
            this.displayError('通信エラーが発生しました');
        }
    }

    displayImages() {
        // 既存のcontainerを探す
        let container = document.getElementById('sample-data') || 
                       document.getElementById('cards-container') ||
                       document.querySelector('.cards-container');
        
        if (!container) {
            // containerが見つからない場合、bodyに直接追加
            container = document.createElement('div');
            container.id = 'ebay-images-container';
            document.body.appendChild(container);
        }

        if (!this.currentData.length) {
            container.innerHTML = '<div class="no-data">有効な画像付き商品が見つかりませんでした</div>';
            return;
        }

        const cardsHTML = this.currentData.map((product, index) => {
            const imageUrls = product.image_urls || [];
            const firstImage = imageUrls.length > 0 ? imageUrls[0] : '';
            const price = product.current_price_value ? parseFloat(product.current_price_value).toFixed(2) : '0.00';
            const imageCount = imageUrls.length;
            
            return `
                <div class="product-card-final" onclick="showProductDetail(${index})">
                    <div class="card-image-container-final">
                        <img src="${firstImage}" 
                             alt="${product.title || '商品画像'}"
                             class="card-image-final"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDI1MCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI1MCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGM0Y0RjYiLz48Y2lyY2xlIGN4PSIxMjUiIGN5PSI4MCIgcj0iMjAiIGZpbGw9IiM5Q0EzQUYiLz48cGF0aCBkPSJNOTAgMTMwSDEzMFYxNjBIOTBWMTMwWiIgZmlsbD0iIzlDQTNBRiIvPjx0ZXh0IHg9IjEyNSIgeT0iMTg1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LXNpemU9IjEyIj5Ob0ltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                        
                        <div class="card-overlay-final">
                            <div class="card-price-final">$${price}</div>
                            ${imageCount > 1 ? `<div class="card-image-count-final">${imageCount}枚</div>` : ''}
                        </div>
                        
                        <div class="card-status-final ${(product.listing_status || '').toLowerCase()}">
                            ${product.listing_status || 'Unknown'}
                        </div>
                    </div>
                    
                    <div class="card-content-final">
                        <h3 class="card-title-final">${product.title || 'タイトルなし'}</h3>
                        <div class="card-meta-final">
                            <span class="card-id-final">ID: ${product.ebay_item_id}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="database-images-header-final">
                <h2>eBay商品画像直接表示システム</h2>
                <p>PostgreSQL配列パース成功 - ${this.currentData.length}件の商品画像を表示中</p>
                <div class="status-indicator-final">
                    <span class="status-success-final">データベース直接表示 ✓</span>
                    <span class="status-info-final">Base64変換なし</span>
                </div>
            </div>
            <div class="cards-grid-final">
                ${cardsHTML}
            </div>
            ${this.getStyles()}
        `;
    }

    showProductDetail(index) {
        const product = this.currentData[index];
        if (!product) return;

        const imageUrls = product.image_urls || [];
        const imageGallery = imageUrls.map((url, i) => 
            `<img src="${url}" alt="商品画像${i+1}" style="width: 100px; height: 100px; object-fit: cover; margin: 5px; border: 1px solid #ddd;">`
        ).join('');

        const detailHTML = `
            <div class="product-detail-final">
                <div class="detail-images-final">
                    <div class="main-image-final">
                        <img src="${imageUrls[0] || ''}" alt="メイン画像" style="max-width: 300px; max-height: 300px;">
                    </div>
                    <div class="image-gallery-final">
                        ${imageGallery}
                    </div>
                </div>
                <div class="detail-info-final">
                    <h3>${product.title}</h3>
                    <div class="detail-grid-final">
                        <div><strong>価格:</strong> $${product.current_price_value}</div>
                        <div><strong>状態:</strong> ${product.listing_status}</div>
                        <div><strong>eBay ID:</strong> ${product.ebay_item_id}</div>
                        <div><strong>画像数:</strong> ${imageUrls.length}枚</div>
                    </div>
                    <div class="actions-final">
                        <a href="https://www.ebay.com/itm/${product.ebay_item_id}" target="_blank" class="ebay-link-final">
                            eBayで見る
                        </a>
                    </div>
                </div>
            </div>
        `;

        if (window.N3Modal) {
            N3Modal.setContent('test-modal', {
                title: `商品詳細: ${product.title?.substring(0, 30)}...`,
                body: detailHTML
            });
            N3Modal.open('test-modal');
        } else {
            // フォールバック: 新しいウィンドウで詳細表示
            const detailWindow = window.open('', '_blank', 'width=800,height=600');
            detailWindow.document.write(`
                <html>
                    <head><title>商品詳細</title></head>
                    <body style="font-family: Arial, sans-serif; padding: 20px;">
                        ${detailHTML}
                    </body>
                </html>
            `);
        }
    }

    displayError(message) {
        const container = document.getElementById('sample-data') || document.body;
        container.innerHTML = `
            <div class="error-message-final">
                <h3>エラーが発生しました</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="retry-btn-final">再試行</button>
            </div>
        `;
    }

    getStyles() {
        return `
            <style>
                .database-images-header-final {
                    text-align: center;
                    margin-bottom: 2rem;
                    padding: 1.5rem;
                    background: linear-gradient(135deg, #0f766e 0%, #047857 100%);
                    color: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                
                .database-images-header-final h2 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.5rem;
                }
                
                .status-indicator-final {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    margin-top: 1rem;
                }
                
                .status-success-final, .status-info-final {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                
                .status-success-final {
                    background: rgba(34, 197, 94, 0.2);
                    color: #bbf7d0;
                }
                
                .status-info-final {
                    background: rgba(59, 130, 246, 0.2);
                    color: #dbeafe;
                }
                
                .cards-grid-final {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                    padding: 1rem 0;
                }
                
                .product-card-final {
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    transition: all 0.3s ease;
                    cursor: pointer;
                    border: 1px solid #f1f5f9;
                }
                
                .product-card-final:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 12px 24px rgba(0,0,0,0.15);
                }
                
                .card-image-container-final {
                    position: relative;
                    height: 220px;
                    overflow: hidden;
                    background: #f8fafc;
                }
                
                .card-image-final {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.3s ease;
                }
                
                .product-card-final:hover .card-image-final {
                    transform: scale(1.05);
                }
                
                .card-overlay-final {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0,0,0,0.8));
                    padding: 1.5rem 1rem 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: end;
                }
                
                .card-price-final {
                    color: white;
                    font-weight: 700;
                    font-size: 1.2rem;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.7);
                }
                
                .card-image-count-final {
                    color: white;
                    font-size: 0.8rem;
                    background: rgba(59, 130, 246, 0.8);
                    padding: 4px 8px;
                    border-radius: 12px;
                    backdrop-filter: blur(4px);
                }
                
                .card-status-final {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    backdrop-filter: blur(8px);
                }
                
                .card-status-final.active {
                    background: rgba(34, 197, 94, 0.9);
                    color: white;
                }
                
                .card-status-final.ended {
                    background: rgba(239, 68, 68, 0.9);
                    color: white;
                }
                
                .card-content-final {
                    padding: 1.25rem;
                }
                
                .card-title-final {
                    font-size: 1rem;
                    font-weight: 600;
                    margin: 0 0 0.75rem 0;
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    color: #1f2937;
                }
                
                .card-meta-final {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .card-id-final {
                    font-size: 0.75rem;
                    color: #6b7280;
                    font-weight: 500;
                }
                
                .product-detail-final {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                    max-width: 800px;
                }
                
                .detail-images-final {
                    text-align: center;
                }
                
                .image-gallery-final {
                    margin-top: 1rem;
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                
                .detail-grid-final {
                    display: grid;
                    gap: 0.75rem;
                    margin: 1rem 0;
                }
                
                .detail-grid-final div {
                    padding: 0.5rem;
                    background: #f8fafc;
                    border-radius: 6px;
                }
                
                .ebay-link-final {
                    display: inline-block;
                    background: #fbbf24;
                    color: #92400e;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 600;
                    transition: all 0.2s ease;
                }
                
                .ebay-link-final:hover {
                    background: #f59e0b;
                    transform: translateY(-2px);
                }
                
                .error-message-final {
                    text-align: center;
                    padding: 3rem;
                    background: #fef2f2;
                    border: 2px solid #fecaca;
                    border-radius: 12px;
                    color: #991b1b;
                }
                
                .retry-btn-final {
                    background: #dc2626;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    margin-top: 1rem;
                }
                
                @media (max-width: 768px) {
                    .cards-grid-final {
                        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                        gap: 1rem;
                    }
                    
                    .product-detail-final {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                }
            </style>
        `;
    }
}

// グローバル変数として定義
window.EbayTestViewerN3Final = EbayTestViewerN3Final;

// DOM読み込み後に初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('EbayTestViewerN3Final PostgreSQL配列対応版 初期化開始');
    new EbayTestViewerN3Final();
});

console.log('EbayTestViewerN3Final PostgreSQL配列対応版 モジュール読み込み完了');
