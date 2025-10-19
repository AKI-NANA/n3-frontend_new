/**
 * eBay Test Viewer JavaScript - 完全データ対応版
 */

class EbayTestViewerComplete {
    constructor() {
        this.currentData = [];
        this.currentView = 'card';
        this.init();
    }

    init() {
        console.log('eBay Test Viewer 完全データ対応版初期化開始');
        this.setupGlobalFunctions();
        this.loadCompleteData();
    }

    setupGlobalFunctions() {
        window.ebayViewer = this;
        window.showProductDetail = (index) => this.showProductDetail(index);
        window.editProduct = (index) => this.editProduct(index);
        window.refreshData = () => this.loadCompleteData();
        window.switchTab = (tabName) => this.switchTab(tabName);
    }

    async loadCompleteData() {
        try {
            console.log('完全データ読み込み開始');
            const response = await fetch('modules/ebay_test_viewer/complete_data_api.php');
            const result = await response.json();
            
            if (result.success) {
                this.currentData = result.products || [];
                console.log(`完全データ読み込み成功: ${this.currentData.length}件`);
                console.log('データフィールド:', result.data_fields);
                
                this.renderCurrentView();
            } else {
                console.error('データ読み込みエラー:', result.error);
            }
        } catch (error) {
            console.error('通信エラー:', error);
        }
    }

    renderCurrentView() {
        const container = document.getElementById('sample-data');
        if (!container) return;

        if (this.currentView === 'card') {
            container.innerHTML = this.generateCardView();
        } else {
            container.innerHTML = this.generateExcelView();
        }
    }

    generateCardView() {
        if (!this.currentData.length) return '<div class="no-data">データがありません</div>';

        const cardsHTML = this.currentData.slice(0, 12).map((item, index) => {
            const imageUrl = (item.picture_urls && item.picture_urls.length > 0) 
                ? item.picture_urls[0] 
                : 'https://via.placeholder.com/200x200?text=No+Image';
            
            const price = item.current_price_value ? 
                `${item.current_price_value} ${item.current_price_currency || 'USD'}` : 
                '価格未設定';
                
            const condition = item.condition_display_name || '状態未記載';
            const location = `${item.location || ''}${item.country ? ', ' + item.country : ''}` || '発送地不明';
            
            return `
                <div class="product-card" data-index="${index}" onclick="showProductDetail(${index})">
                    <div class="card-image-container">
                        <img src="${imageUrl}" alt="商品画像" class="card-image" 
                             onerror="this.src='https://via.placeholder.com/200x200?text=No+Image'">
                        <div class="card-badges">
                            <span class="badge badge-${item.listing_status === 'Active' ? 'active' : 'inactive'}">
                                ${item.listing_status || 'Unknown'}
                            </span>
                            ${item.watch_count > 0 ? `<span class="badge badge-watch">${item.watch_count}👁</span>` : ''}
                        </div>
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">${(item.title || 'タイトルなし').substring(0, 60)}...</h3>
                        <div class="card-price">${price}</div>
                        <div class="card-details">
                            <div class="card-detail-item">
                                <span class="label">状態:</span>
                                <span class="value">${condition}</span>
                            </div>
                            <div class="card-detail-item">
                                <span class="label">在庫:</span>
                                <span class="value">${item.quantity || 0}個 (${item.quantity_sold || 0}個売上)</span>
                            </div>
                            <div class="card-detail-item">
                                <span class="label">発送地:</span>
                                <span class="value">${location}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="complete-data-header">
                <h3>eBay商品データベース (完全版)</h3>
                <p>${this.currentData.length}件の商品データを表示中</p>
            </div>
            <div class="cards-container">
                ${cardsHTML}
            </div>
            ${this.getCardStyles()}
        `;
    }

    generateExcelView() {
        if (!this.currentData.length) return '<div class="no-data">データがありません</div>';

        const columns = [
            { key: 'ebay_item_id', label: 'eBay ID', width: '120px' },
            { key: 'title', label: '商品名', width: '300px' },
            { key: 'sku', label: 'SKU', width: '100px' },
            { key: 'current_price_value', label: '価格', width: '80px' },
            { key: 'current_price_currency', label: '通貨', width: '60px' },
            { key: 'quantity', label: '在庫', width: '60px' },
            { key: 'quantity_sold', label: '売上', width: '60px' },
            { key: 'condition_display_name', label: '状態', width: '100px' },
            { key: 'listing_status', label: 'ステータス', width: '100px' },
            { key: 'watch_count', label: 'ウォッチ', width: '70px' },
            { key: 'seller_feedback_score', label: '評価', width: '70px' },
            { key: 'location', label: '発送地', width: '120px' }
        ];

        const headerHTML = columns.map(col => 
            `<th style="width: ${col.width}">${col.label}</th>`
        ).join('') + '<th style="width: 120px">操作</th>';

        const rowsHTML = this.currentData.map((item, index) => {
            const cells = columns.map(col => {
                let value = item[col.key] || '-';
                
                if (col.key === 'title' && value !== '-') {
                    value = String(value).substring(0, 40) + (String(value).length > 40 ? '...' : '');
                } else if (col.key === 'current_price_value' && value !== '-') {
                    value = parseFloat(value).toFixed(2);
                } else if (col.key === 'listing_status') {
                    const statusMap = {
                        'Active': '🟢 アクティブ',
                        'Ended': '🔴 終了',
                        'Completed': '✅ 完了'
                    };
                    value = statusMap[value] || value;
                }
                
                return `<td title="${item[col.key] || ''}">${value}</td>`;
            }).join('');

            const actionsHTML = `
                <td class="actions-cell">
                    <button class="action-btn detail-btn" onclick="showProductDetail(${index})" title="詳細表示">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="editProduct(${index})" title="編集">
                        <i class="fas fa-edit"></i>
                    </button>
                    <a href="${item.view_item_url || '#'}" target="_blank" class="action-btn ebay-btn" title="eBayで見る">
                        <i class="fab fa-ebay"></i>
                    </a>
                </td>
            `;

            return `<tr>${cells}${actionsHTML}</tr>`;
        }).join('');

        return `
            <div class="excel-container">
                <div class="excel-header">
                    <h3>eBay商品一覧 (Excel形式)</h3>
                    <p>${this.currentData.length}件の商品データ</p>
                </div>
                <table class="excel-table">
                    <thead>
                        <tr>${headerHTML}</tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>
            </div>
            ${this.getExcelStyles()}
        `;
    }

    showProductDetail(index) {
        const product = this.currentData[index];
        if (!product || !window.N3Modal) {
            alert('商品データが見つかりません');
            return;
        }

        const detailHTML = this.generateDetailModalContent(product, index);

        N3Modal.setContent('test-modal', {
            title: `商品詳細: ${product.title ? product.title.substring(0, 40) + '...' : 'ID: ' + product.ebay_item_id}`,
            body: detailHTML,
            footer: `
                <button class="n3-btn n3-btn--secondary" onclick="N3Modal.close('test-modal')">
                    <i class="fas fa-times"></i> 閉じる
                </button>
                <button class="n3-btn n3-btn--warning" onclick="editProduct(${index}); N3Modal.close('test-modal');">
                    <i class="fas fa-edit"></i> 編集
                </button>
                <a href="${product.view_item_url || '#'}" target="_blank" class="n3-btn n3-btn--info">
                    <i class="fab fa-ebay"></i> eBayで見る
                </a>
            `
        });
        
        N3Modal.open('test-modal');
    }

    generateDetailModalContent(product, index) {
        const imageUrl = (product.picture_urls && product.picture_urls.length > 0) 
            ? product.picture_urls[0] 
            : 'https://via.placeholder.com/200x200?text=No+Image';

        return `
            <div class="product-detail-container">
                <div class="product-header">
                    <div class="product-image">
                        <img src="${imageUrl}" alt="商品画像" onerror="this.src='https://via.placeholder.com/200x200?text=No+Image'" />
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.title || 'タイトルなし'}</h3>
                        <div class="product-meta">
                            <span class="price">${product.current_price_value || '0.00'} ${product.current_price_currency || 'USD'}</span>
                            <span class="status status--${product.listing_status === 'Active' ? 'active' : 'inactive'}">
                                ${product.listing_status || 'Unknown'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-tabs">
                    <div class="tab-buttons">
                        <button class="tab-btn tab-btn--active" onclick="switchTab('basic')">基本情報</button>
                        <button class="tab-btn" onclick="switchTab('description')">商品説明</button>
                        <button class="tab-btn" onclick="switchTab('shipping')">配送情報</button>
                        <button class="tab-btn" onclick="switchTab('technical')">技術情報</button>
                        <button class="tab-btn" onclick="switchTab('raw')">生データ</button>
                    </div>
                    
                    <div id="tab-basic" class="tab-content tab-content--active">
                        ${this.generateBasicInfoTab(product)}
                    </div>
                    
                    <div id="tab-description" class="tab-content">
                        ${this.generateDescriptionTab(product)}
                    </div>
                    
                    <div id="tab-shipping" class="tab-content">
                        ${this.generateShippingTab(product)}
                    </div>
                    
                    <div id="tab-technical" class="tab-content">
                        ${this.generateTechnicalTab(product)}
                    </div>
                    
                    <div id="tab-raw" class="tab-content">
                        <pre class="json-display">${JSON.stringify(product, null, 2)}</pre>
                    </div>
                </div>
            </div>
            ${this.getModalStyles()}
        `;
    }

    generateBasicInfoTab(product) {
        return `
            <div class="info-grid">
                <div class="info-item"><label>eBay商品ID:</label><span>${product.ebay_item_id || '-'}</span></div>
                <div class="info-item"><label>SKU:</label><span>${product.sku || '-'}</span></div>
                <div class="info-item"><label>コンディション:</label><span>${product.condition_display_name || '-'}</span></div>
                <div class="info-item"><label>カテゴリ:</label><span>${product.category_name || '-'}</span></div>
                <div class="info-item"><label>現在価格:</label><span>${product.current_price_value || '0.00'} ${product.current_price_currency || ''}</span></div>
                <div class="info-item"><label>開始価格:</label><span>${product.start_price_value || '0.00'} ${product.current_price_currency || ''}</span></div>
                <div class="info-item"><label>即決価格:</label><span>${product.buy_it_now_price_value || '-'} ${product.current_price_currency || ''}</span></div>
                <div class="info-item"><label>数量:</label><span>${product.quantity || '0'}個</span></div>
                <div class="info-item"><label>売上数:</label><span>${product.quantity_sold || '0'}個</span></div>
                <div class="info-item"><label>ウォッチ数:</label><span>${product.watch_count || '0'}人</span></div>
                <div class="info-item"><label>入札数:</label><span>${product.bid_count || '0'}件</span></div>
                <div class="info-item"><label>出品タイプ:</label><span>${product.listing_type || '-'}</span></div>
                <div class="info-item"><label>販売者ID:</label><span>${product.seller_user_id || '-'}</span></div>
                <div class="info-item"><label>販売者評価:</label><span>${product.seller_feedback_score || '0'} (${product.seller_positive_feedback_percent || '0'}%)</span></div>
                <div class="info-item"><label>発送地:</label><span>${product.location || '-'}, ${product.country || '-'}</span></div>
                <div class="info-item"><label>データ完全性:</label><span>${product.data_completeness_score || '0'}%</span></div>
                <div class="info-item"><label>更新日:</label><span>${product.updated_at || '-'}</span></div>
            </div>
        `;
    }

    generateDescriptionTab(product) {
        return `
            <div class="description-content">
                ${product.description ? 
                    `<div class="description-text">${product.description.replace(/\n/g, '<br>')}</div>` : 
                    '<div class="no-content">商品説明がありません</div>'
                }
            </div>
        `;
    }

    generateShippingTab(product) {
        return `
            <div class="shipping-info">
                <h4>配送詳細:</h4>
                ${product.shipping_details ? 
                    `<pre class="json-display">${JSON.stringify(product.shipping_details, null, 2)}</pre>` : 
                    '<div class="no-content">配送情報がありません</div>'
                }
                <h4>配送料:</h4>
                ${product.shipping_costs ? 
                    `<pre class="json-display">${JSON.stringify(product.shipping_costs, null, 2)}</pre>` : 
                    '<div class="no-content">配送料情報がありません</div>'
                }
            </div>
        `;
    }

    generateTechnicalTab(product) {
        return `
            <div class="technical-info">
                <h4>商品仕様:</h4>
                ${product.item_specifics ? 
                    `<pre class="json-display">${JSON.stringify(product.item_specifics, null, 2)}</pre>` : 
                    '<div class="no-content">商品仕様情報がありません</div>'
                }
                <div class="tech-grid">
                    <div class="tech-item"><label>開始時刻:</label><span>${product.start_time || '-'}</span></div>
                    <div class="tech-item"><label>終了時刻:</label><span>${product.end_time || '-'}</span></div>
                    <div class="tech-item"><label>最終更新:</label><span>${product.last_modified_time || '-'}</span></div>
                    <div class="tech-item"><label>同期時刻:</label><span>${product.sync_timestamp || '-'}</span></div>
                    <div class="tech-item"><label>作成日:</label><span>${product.created_at || '-'}</span></div>
                </div>
            </div>
        `;
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('tab-btn--active');
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('tab-content--active');
        });
        
        event.target.classList.add('tab-btn--active');
        const tabContent = document.getElementById(`tab-${tabName}`);
        if (tabContent) {
            tabContent.classList.add('tab-content--active');
        }
    }

    editProduct(index) {
        alert('編集機能は開発中です');
    }

    getCardStyles() {
        return `<style>
            .complete-data-header {
                text-align: center;
                margin-bottom: 2rem;
                padding: 1rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 12px;
            }
            .cards-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 1.5rem;
                padding: 1rem 0;
            }
            .product-card {
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
                cursor: pointer;
            }
            .product-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.15);
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
            .card-badges {
                position: absolute;
                top: 10px;
                right: 10px;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .badge {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
            }
            .badge-active { background: #10b981; color: white; }
            .badge-inactive { background: #f59e0b; color: white; }
            .badge-watch { background: #3b82f6; color: white; }
            .card-content {
                padding: 1rem;
            }
            .card-title {
                font-size: 0.9rem;
                font-weight: 600;
                margin: 0 0 0.5rem 0;
                line-height: 1.3;
            }
            .card-price {
                font-size: 1.1rem;
                font-weight: 700;
                color: #059669;
                margin-bottom: 1rem;
            }
            .card-details {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            .card-detail-item {
                display: flex;
                justify-content: space-between;
                font-size: 0.8rem;
            }
            .card-detail-item .label {
                font-weight: 600;
                color: #6b7280;
            }
            .card-detail-item .value {
                color: #1f2937;
            }
        </style>`;
    }

    getExcelStyles() {
        return `<style>
            .excel-container {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .excel-header {
                padding: 1rem;
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
            }
            .excel-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.8rem;
            }
            .excel-table th {
                background: #374151;
                color: white;
                font-weight: 600;
                padding: 0.75rem 0.5rem;
                text-align: left;
                position: sticky;
                top: 0;
                z-index: 10;
            }
            .excel-table td {
                padding: 0.5rem;
                border-bottom: 1px solid #f3f4f6;
                vertical-align: middle;
            }
            .excel-table tr:hover {
                background: #f9fafb;
            }
            .actions-cell {
                text-align: center;
            }
            .action-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin: 0 2px;
                text-decoration: none;
                transition: all 0.2s ease;
            }
            .detail-btn { background: #dbeafe; color: #1d4ed8; }
            .edit-btn { background: #dcfce7; color: #166534; }
            .ebay-btn { background: #fef3cd; color: #d97706; }
            .action-btn:hover { transform: scale(1.1); }
        </style>`;
    }

    getModalStyles() {
        return `<style>
            .product-detail-container { max-width: 100%; font-size: 0.875rem; }
            .product-header { display: flex; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb; }
            .product-image { flex-shrink: 0; }
            .product-image img { width: 150px; height: 150px; object-fit: cover; border-radius: 8px; }
            .product-info { flex: 1; }
            .product-title { font-size: 1.125rem; font-weight: 600; color: #1f2937; margin-bottom: 0.75rem; }
            .product-meta { display: flex; gap: 1rem; align-items: center; }
            .price { font-size: 1.25rem; font-weight: 700; color: #059669; }
            .status { padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
            .status--active { background: #dcfce7; color: #166534; }
            .status--inactive { background: #fef3cd; color: #92400e; }
            .tab-buttons { display: flex; border-bottom: 1px solid #e5e7eb; margin-bottom: 1rem; }
            .tab-btn { background: none; border: none; padding: 0.75rem 1rem; cursor: pointer; font-weight: 500; color: #6b7280; }
            .tab-btn--active { color: #3b82f6; border-bottom: 2px solid #3b82f6; }
            .tab-content { display: none; }
            .tab-content--active { display: block; }
            .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0.75rem; }
            .info-item { display: flex; justify-content: space-between; padding: 0.5rem; background: #f8fafc; border-radius: 4px; }
            .info-item label { font-weight: 600; color: #374151; }
            .description-text { background: #f8fafc; padding: 1rem; border-radius: 6px; line-height: 1.6; }
            .json-display { background: #1f2937; color: #e5e7eb; padding: 1rem; border-radius: 6px; font-family: monospace; font-size: 0.75rem; overflow: auto; max-height: 300px; }
            .no-content { text-align: center; color: #9ca3af; padding: 2rem; }
            .tech-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem; margin-top: 1rem; }
            .tech-item { display: flex; justify-content: space-between; padding: 0.5rem; background: #f8fafc; border-radius: 4px; }
        </style>`;
    }
}

// グローバル変数として設定
window.EbayTestViewerComplete = EbayTestViewerComplete;

console.log('EbayTestViewerComplete 完全データ対応版読み込み完了');
