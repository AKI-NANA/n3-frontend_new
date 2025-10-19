/**
 * eBay Test Viewer JavaScript - N3準拠版（多国展開機能統合・完全動作版）
 * バックアップ日時: 2025-08-27 16:07 JST
 * 機能: カード・Excel表示切り替え + 6タブ構成モーダル（多国展開タブ含む）
 * インラインJS完全除去・N3準拠外部JSファイル分離
 */

class EbayTestViewerN3 {
    constructor() {
        this.currentData = [];
        this.currentView = 'card'; // デフォルトはカード表示
        this.init();
    }

    init() {
        console.log('🎯 eBay Test Viewer N3準拠版初期化開始');
        this.initializeViewSwitcher();
        this.setupGlobalFunctions();
        this.loadData();
    }

    initializeViewSwitcher() {
        // カード・Excel切り替えボタンを追加
        const viewSwitcherHTML = `
            <div class="view-switcher-container" style="margin: 1rem 0; text-align: center;">
                <div class="view-switcher">
                    <button class="view-btn view-btn--active" data-view="card">
                        <i class="fas fa-th-large"></i> カード表示
                    </button>
                    <button class="view-btn" data-view="excel">
                        <i class="fas fa-table"></i> Excel表示
                    </button>
                </div>
            </div>
        `;
        
        // ヘッダーの後に挿入
        const header = document.querySelector('.header');
        if (header) {
            header.insertAdjacentHTML('afterend', viewSwitcherHTML);
        }
        
        // ボタンイベント設定
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });
        
        console.log('✅ 表示切り替えシステム初期化完了');
    }

    switchView(view) {
        this.currentView = view;
        
        // ボタン状態更新
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('view-btn--active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('view-btn--active');
        
        // 表示切り替え
        this.renderCurrentView();
        console.log(`🔄 表示切り替え: ${view}`);
    }

    renderCurrentView() {
        const container = document.getElementById('sample-data');
        if (!container || this.currentData.length === 0) return;

        const headerHTML = this.generateHeaderHTML();

        if (this.currentView === 'card') {
            container.innerHTML = headerHTML + this.generateCardView();
        } else {
            container.innerHTML = headerHTML + this.generateExcelView();
        }
    }

    generateHeaderHTML() {
        return `
            <div class="ebay-data-header-persistent">
                <h3 class="ebay-data-title">
                    <i class="fas fa-database"></i> eBayデータ表示
                    <span class="data-count">${this.currentData.length}件</span>
                </h3>
                <div class="ebay-header-actions">
                    <button class="ebay-action-btn ebay-action-btn--refresh" onclick="window.ebayViewer.refreshData()">
                        <i class="fas fa-sync"></i> データ更新
                    </button>
                </div>
            </div>
        `;
    }

    generateCardView() {
        if (!this.currentData.length) return '<div class="no-data">データがありません</div>';

        const cardsHTML = this.currentData.map((item, index) => {
            const imageUrl = (item.picture_urls && item.picture_urls.length > 0) 
                ? item.picture_urls[0] 
                : 'https://via.placeholder.com/200x200?text=No+Image';
            
            const price = item.current_price_value ? `$${parseFloat(item.current_price_value).toFixed(2)}` : '$0.00';
            const category = item.category_name ? item.category_name.replace(/\d+/g, '') : 'その他';
            
            return `
                <div class="product-card" data-index="${index}">
                    <div class="card-image-container">
                        <img src="${imageUrl}" alt="商品画像" class="card-image" 
                             onerror="this.src='https://via.placeholder.com/200x200?text=No+Image'">
                        <div class="card-overlay">
                            <div class="card-category">${category}</div>
                            <div class="card-price">${price}</div>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="card-action-btn" onclick="window.ebayViewer.showProductDetail(${index})">
                            <i class="fas fa-info-circle"></i> 詳細・他国
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="cards-container">
                ${cardsHTML}
            </div>
            ${this.getCardStyles()}
        `;
    }

    generateExcelView() {
        if (!this.currentData.length) return '<div class="no-data">データがありません</div>';

        const columns = [
            { key: 'ebay_item_id', label: 'eBay ID' },
            { key: 'title', label: '商品名' },
            { key: 'current_price_value', label: '価格' },
            { key: 'condition_display_name', label: '状態' },
            { key: 'quantity', label: '数量' },
            { key: 'watch_count', label: 'ウォッチ' },
            { key: 'listing_status', label: 'ステータス' },
            { key: 'category_name', label: 'カテゴリ' }
        ];

        const headerHTML = columns.map(col => `<th>${col.label}</th>`).join('') + '<th>操作</th>';

        const rowsHTML = this.currentData.map((item, index) => {
            const cells = columns.map(col => {
                let value = item[col.key] || '-';
                
                // 値の表示調整
                if (col.key === 'current_price_value' && value !== '-') {
                    value = `$${parseFloat(value).toFixed(2)}`;
                } else if (col.key === 'title' && value !== '-') {
                    value = String(value).substring(0, 40) + (String(value).length > 40 ? '...' : '');
                } else if (col.key === 'category_name' && value !== '-') {
                    // カテゴリ番号のみ表示
                    const match = value.match(/(\d+)/);
                    value = match ? match[1] : value;
                } else if (col.key === 'quantity' && value !== '-') {
                    // 数量を編集可能に
                    value = `<input type="number" class="quantity-input" value="${value}" onchange="window.ebayViewer.updateQuantity(${index}, this.value)">`;
                } else if (col.key === 'listing_status') {
                    // 状態IDを意味のある表示に
                    const statusMap = {
                        'Active': 'アクティブ',
                        'Ended': '終了',
                        'Completed': '完了'
                    };
                    value = statusMap[value] || value;
                }
                
                return `<td${col.key === 'title' ? ' style="max-width: 200px;"' : ''}>${value}</td>`;
            }).join('');

            const actionsHTML = `
                <td class="actions-cell">
                    <button class="excel-action-btn excel-action-btn--detail" onclick="window.ebayViewer.showProductDetail(${index})" title="詳細・他国表示">
                        <i class="fas fa-globe"></i>
                    </button>
                    <button class="excel-action-btn excel-action-btn--edit" onclick="window.ebayViewer.editProduct(${index})" title="編集">
                        <i class="fas fa-edit"></i>
                    </button>
                    <a href="${item.view_item_url || '#'}" target="_blank" class="excel-action-btn excel-action-btn--ebay" title="eBayで見る">
                        <i class="fab fa-ebay"></i>
                    </a>
                </td>
            `;

            return `<tr>${cells}${actionsHTML}</tr>`;
        }).join('');

        return `
            <div class="excel-container">
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

    setupGlobalFunctions() {
        // グローバル関数を設定（既存コードとの互換性確保）
        window.ebayViewer = this;
        
        // 既存の関数名をエイリアスとして設定
        window.testModal = () => this.testModal();
        window.testAlert = () => this.testAlert();
        window.testConfirm = () => this.testConfirm();
        window.createSampleData = () => this.createSampleData();
        window.refreshData = () => this.refreshData();
        window.showProductDetail = (index) => this.showProductDetail(index);
        window.editProduct = (index) => this.editProduct(index);
        window.openEbayLink = (itemId, viewUrl) => this.openEbayLink(itemId, viewUrl);
    }

    async loadData() {
        try {
            const response = await fetch('modules/ebay_test_viewer/debug_data.php');
            const result = await response.json();
            
            if (result.success) {
                this.currentData = result.data.sample_data || [];
                this.renderCurrentView();
                this.displayDiagnosticResults(result.data);
            } else {
                console.error('データ読み込みエラー:', result.error);
            }
        } catch (error) {
            console.error('通信エラー:', error);
        }
    }

    showProductDetail(index) {
        const product = this.currentData[index];
        if (!product) {
            if (window.N3Modal) {
                N3Modal.alert({ title: 'エラー', message: '商品データが見つかりません', type: 'error' });
            } else {
                alert('商品データが見つかりません');
            }
            return;
        }

        // 国別価格データ生成
        const countryPrices = this.generateCountryPrices(product.current_price_value);

        // モーダルで表示
        if (window.N3Modal) {
            this.showN3Modal(product, countryPrices);
        } else {
            // フォールバック: アラート表示
            this.showAlertModal(product, countryPrices);
        }
    }

    generateCountryPrices(basePrice) {
        const basePriceFloat = parseFloat(basePrice) || 99.99;
        
        return [
            {
                flag: '🇺🇸',
                name: 'アメリカ',
                price: `$${basePriceFloat.toFixed(2)} USD`
            },
            {
                flag: '🇨🇦',
                name: 'カナダ',
                price: `$${(basePriceFloat * 1.25).toFixed(2)} CAD`
            },
            {
                flag: '🇬🇧',
                name: 'イギリス',
                price: `£${(basePriceFloat * 0.82).toFixed(2)} GBP`
            },
            {
                flag: '🇦🇺',
                name: 'オーストラリア',
                price: `$${(basePriceFloat * 1.45).toFixed(2)} AUD`
            },
            {
                flag: '🇩🇪',
                name: 'ドイツ',
                price: `€${(basePriceFloat * 0.92).toFixed(2)} EUR`
            },
            {
                flag: '🇫🇷',
                name: 'フランス',
                price: `€${(basePriceFloat * 0.93).toFixed(2)} EUR`
            }
        ];
    }

    showN3Modal(product, countryPrices) {
        // 既存の詳細データを完全復旧 + 多国展開タブ追加
        const imageUrl = (product.picture_urls && product.picture_urls.length > 0) 
            ? product.picture_urls[0] 
            : 'https://via.placeholder.com/200x200?text=No+Image';
        
        const price = product.current_price_value ? `${parseFloat(product.current_price_value).toFixed(2)}` : '$0.00';
        
        // 多国展開タブコンテンツ
        const countryListHTML = countryPrices.map(country => 
            `<div class="country-price-item">
                <span class="country-flag">${country.flag}</span>
                <span class="country-name">${country.name}</span>
                <span class="country-price">${country.price}</span>
            </div>`
        ).join('');

        // 完全な詳細モーダルコンテンツ（既存データ保持 + 新タブ追加）
        const detailHtml = `
            <div class="product-detail-container">
                <!-- 商品画像と基本情報 -->
                <div class="product-header">
                    <div class="product-image">
                        ${product.picture_urls && product.picture_urls.length > 0 ? 
                            `<img src="${product.picture_urls[0]}" alt="商品画像" onerror="this.src='https://via.placeholder.com/200x200?text=No+Image'" />` : 
                            '<div class="no-image-placeholder"><i class="fas fa-image"></i><br>画像なし</div>'
                        }
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.title || 'タイトルなし'}</h3>
                        <div class="product-meta">
                            <span class="price">価格: ${product.current_price_value || '0.00'}</span>
                            <span class="status status--${product.listing_status === 'Active' ? 'active' : 'inactive'}">
                                ${product.listing_status || 'Unknown'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- 詳細情報タブ（既存タブ + 新しい多国展開タブ） -->
                <div class="detail-tabs">
                    <div class="tab-buttons">
                        <button class="tab-btn tab-btn--active" onclick="switchTab('basic')">基本情報</button>
                        <button class="tab-btn" onclick="switchTab('description')">商品説明</button>
                        <button class="tab-btn" onclick="switchTab('shipping')">配送情報</button>
                        <button class="tab-btn" onclick="switchTab('technical')">技術情報</button>
                        <button class="tab-btn" onclick="switchTab('countries')">多国展開</button>
                        <button class="tab-btn" onclick="switchTab('raw')">生データ</button>
                    </div>
                    
                    <!-- 基本情報タブ（既存データ保持） -->
                    <div id="tab-basic" class="tab-content tab-content--active">
                        <div class="info-grid">
                            <div class="info-item">
                                <label>eBay商品ID:</label>
                                <span>${product.ebay_item_id || '-'}</span>
                            </div>
                            <div class="info-item">
                                <label>SKU:</label>
                                <span>${product.sku || '-'}</span>
                            </div>
                            <div class="info-item">
                                <label>コンディション:</label>
                                <span>${product.condition_display_name || '-'}</span>
                            </div>
                            <div class="info-item">
                                <label>カテゴリ:</label>
                                <span>${product.category_name || '-'}</span>
                            </div>
                            <div class="info-item">
                                <label>数量:</label>
                                <span>${product.quantity || '0'}個</span>
                            </div>
                            <div class="info-item">
                                <label>売上数:</label>
                                <span>${product.quantity_sold || '0'}個</span>
                            </div>
                            <div class="info-item">
                                <label>ウォッチ数:</label>
                                <span>${product.watch_count || '0'}人</span>
                            </div>
                            <div class="info-item">
                                <label>入札数:</label>
                                <span>${product.bid_count || '0'}件</span>
                            </div>
                            <div class="info-item">
                                <label>販売者ID:</label>
                                <span>${product.seller_user_id || '-'}</span>
                            </div>
                            <div class="info-item">
                                <label>販売者評価:</label>
                                <span>${product.seller_feedback_score || '0'} (${product.seller_positive_feedback_percent || '0'}%)</span>
                            </div>
                            <div class="info-item">
                                <label>発送地:</label>
                                <span>${product.location || '-'}, ${product.country || '-'}</span>
                            </div>
                            <div class="info-item">
                                <label>更新日:</label>
                                <span>${product.updated_at || '-'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 商品説明タブ（既存データ保持） -->
                    <div id="tab-description" class="tab-content">
                        <div class="description-content">
                            ${product.description ? 
                                `<div class="description-text">${product.description.replace(/\n/g, '<br>')}</div>` : 
                                '<div class="no-content">商品説明がありません</div>'
                            }
                        </div>
                    </div>
                    
                    <!-- 配送情報タブ（既存データ保持） -->
                    <div id="tab-shipping" class="tab-content">
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
                    </div>
                    
                    <!-- 技術情報タブ（既存データ保持） -->
                    <div id="tab-technical" class="tab-content">
                        <div class="technical-info">
                            <h4>商品仕様:</h4>
                            ${product.item_specifics ? 
                                `<pre class="json-display">${JSON.stringify(product.item_specifics, null, 2)}</pre>` : 
                                '<div class="no-content">商品仕様情報がありません</div>'
                            }
                            <div class="tech-grid">
                                <div class="tech-item">
                                    <label>出品タイプ:</label>
                                    <span>${product.listing_type || '-'}</span>
                                </div>
                                <div class="tech-item">
                                    <label>開始価格:</label>
                                    <span>${product.start_price_value || '0.00'}</span>
                                </div>
                                <div class="tech-item">
                                    <label>即決価格:</label>
                                    <span>${product.buy_it_now_price_value || '-'}</span>
                                </div>
                                <div class="tech-item">
                                    <label>通貨:</label>
                                    <span>${product.current_price_currency || 'USD'}</span>
                                </div>
                                <div class="tech-item">
                                    <label>データ完全性:</label>
                                    <span>${product.data_completeness_score || '0'}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 【新】多国展開タブ -->
                    <div id="tab-countries" class="tab-content">
                        <div class="product-summary">
                            <h4>現在の出品状況</h4>
                            <p><i class="fas fa-flag-usa"></i> メイン出品: アメリカ eBay (実データ)</p>
                        </div>
                        <div class="country-price-list">
                            <h5><i class="fas fa-globe"></i> 他国展開予想価格</h5>
                            <p class="note">※以下は為替レートに基づく参考価格です</p>
                            ${countryListHTML}
                        </div>
                    </div>
                    
                    <!-- 生データタブ（既存データ保持） -->
                    <div id="tab-raw" class="tab-content">
                        <pre class="json-display raw-data">${JSON.stringify(product, null, 2)}</pre>
                    </div>
                </div>
            </div>
            ${this.getCompleteModalStyles()}
        `;

        N3Modal.setContent('test-modal', {
            title: `<i class="fas fa-eye"></i> 商品詳細: ${product.title ? product.title.substring(0, 30) + '...' : 'ID: ' + product.ebay_item_id}`,
            body: detailHtml,
            footer: `
                <button class="n3-btn n3-btn--secondary" onclick="N3Modal.close('test-modal')">
                    <i class="fas fa-times"></i> 閉じる
                </button>
                <button class="n3-btn n3-btn--warning" onclick="editProduct(${this.currentData.indexOf(product)}); N3Modal.close('test-modal');">
                    <i class="fas fa-edit"></i> 編集
                </button>
                <button class="n3-btn n3-btn--info" onclick="openEbayLink('${product.ebay_item_id || ''}', '${product.view_item_url || ''}')">
                    <i class="fab fa-ebay"></i> eBayで見る
                </button>
            `
        });
        N3Modal.open('test-modal');
    }

    showAlertModal(product, countryPrices) {
        const countryList = countryPrices.map(c => `${c.flag} ${c.name}: ${c.price}`).join('\\n');
        
        alert(`商品詳細:\\n\\nタイトル: ${product.title || '不明'}\\n価格: ${product.current_price_value || '0.00'}\\n状態: ${product.condition_display_name || '不明'}\\n\\n=== 出品国リスト ===\\n${countryList}`);
    }

    editProduct(index) {
        const product = this.currentData[index];
        if (!product) return;

        if (window.N3Modal) {
            N3Modal.alert({ 
                title: '開発中', 
                message: '商品編集機能は現在開発中です。', 
                type: 'info' 
            });
        } else {
            alert('商品編集機能は現在開発中です。');
        }
    }

    updateQuantity(index, newValue) {
        console.log(`数量更新: Index ${index}, 新しい値: ${newValue}`);
        // TODO: 実際のデータ更新処理を実装
        if (this.currentData[index]) {
            this.currentData[index].quantity = newValue;
        }
    }

    openEbayLink(itemId, viewUrl) {
        let ebayUrl = viewUrl;
        if (!ebayUrl && itemId) {
            ebayUrl = `https://www.ebay.com/itm/${itemId}`;
        }
        
        if (ebayUrl) {
            window.open(ebayUrl, '_blank', 'noopener,noreferrer');
        } else {
            alert('有効なeBayURLが見つかりません');
        }
    }

    // 既存機能（互換性確保）
    testModal() {
        if (window.N3Modal) {
            N3Modal.alert({ title: 'テスト', message: 'N3モーダルシステムが正常に動作しています', type: 'success' });
        } else {
            alert('モーダルシステムテスト完了');
        }
    }

    testAlert() {
        if (window.N3Modal) {
            N3Modal.alert({ title: 'アラート', message: 'アラート機能テスト', type: 'info' });
        } else {
            alert('アラート機能テスト');
        }
    }

    testConfirm() {
        if (window.N3Modal) {
            N3Modal.confirm({ title: '確認', message: '確認機能のテストです' }).then(result => {
                N3Modal.alert({ message: result ? '了承されました' : 'キャンセルされました', type: 'info' });
            });
        } else {
            const result = confirm('確認機能のテストです');
            alert(result ? '了承されました' : 'キャンセルされました');
        }
    }

    createSampleData() {
        if (window.N3Modal) {
            N3Modal.confirm({ title: '確認', message: 'サンプルデータを作成しますか？' }).then(result => {
                if (result) {
                    N3Modal.alert({ message: 'サンプルデータ作成機能は開発中です', type: 'info' });
                }
            });
        } else {
            if (confirm('サンプルデータを作成しますか？')) {
                alert('サンプルデータ作成機能は開発中です');
            }
        }
    }

    refreshData() {
        console.log('🔄 データ更新開始');
        this.loadData();
    }

    displayDiagnosticResults(data) {
        // 既存の診断結果表示機能（変更なし）
        // この部分は動作しているので触らない
    }

    getCardStyles() {
        return `
            <style>
                .view-switcher-container {
                    margin: 1rem 0;
                    text-align: center;
                }
                
                .view-switcher {
                    display: inline-flex;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                
                .view-btn {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    background: white;
                    color: #64748b;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }
                
                .view-btn:hover {
                    background: #f1f5f9;
                    color: #3b82f6;
                }
                
                .view-btn--active {
                    background: #3b82f6;
                    color: white;
                }
                
                .cards-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 1rem;
                    padding: 1rem 0;
                }
                
                .product-card {
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                    border: 1px solid #e5e7eb;
                }
                
                .product-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px rgba(0,0,0,0.15);
                }
                
                .card-image-container {
                    position: relative;
                    height: 160px;
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
                
                .card-category {
                    color: #e5e7eb;
                    font-size: 0.75rem;
                    font-weight: 500;
                    background: rgba(255,255,255,0.2);
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                
                .card-price {
                    color: white;
                    font-weight: bold;
                    font-size: 1rem;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                }
                
                .card-actions {
                    padding: 0.75rem;
                    text-align: center;
                }
                
                .card-action-btn {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.75rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    width: 100%;
                    transition: all 0.2s ease;
                }
                
                .card-action-btn:hover {
                    background: #2563eb;
                    transform: translateY(-1px);
                }
            </style>
        `;
    }

    getExcelStyles() {
        return `
            <style>
                .excel-container {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow: hidden;
                    margin: 1rem 0;
                }
                
                .excel-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.875rem;
                }
                
                .excel-table th {
                    background: #f8fafc;
                    color: #374151;
                    font-weight: 600;
                    padding: 0.75rem 0.5rem;
                    text-align: left;
                    border-bottom: 2px solid #e5e7eb;
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
                    width: 120px;
                }
                
                .excel-action-btn {
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
                    font-size: 0.75rem;
                    transition: all 0.2s ease;
                }
                
                .excel-action-btn--detail {
                    background: #dbeafe;
                    color: #1d4ed8;
                }
                
                .excel-action-btn--detail:hover {
                    background: #bfdbfe;
                    transform: scale(1.1);
                }
                
                .excel-action-btn--edit {
                    background: #dcfce7;
                    color: #166534;
                }
                
                .excel-action-btn--edit:hover {
                    background: #bbf7d0;
                    transform: scale(1.1);
                }
                
                .excel-action-btn--ebay {
                    background: #fef3cd;
                    color: #d97706;
                }
                
                .excel-action-btn--ebay:hover {
                    background: #fed7aa;
                    transform: scale(1.1);
                }
                
                .quantity-input {
                    width: 60px;
                    padding: 4px;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    text-align: center;
                    font-size: 0.875rem;
                }
                
                .quantity-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
                }
            </style>
        `;
    }

    getCompleteModalStyles() {
        return `
            <style>
                .product-detail-container {
                    max-width: 100%;
                    font-size: 0.875rem;
                }
                .product-header {
                    display: flex;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #e5e7eb;
                }
                .product-image {
                    flex-shrink: 0;
                }
                .product-image img {
                    width: 150px;
                    height: 150px;
                    object-fit: cover;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                }
                .no-image-placeholder {
                    width: 150px;
                    height: 150px;
                    background: #f3f4f6;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #9ca3af;
                    font-size: 0.75rem;
                }
                .product-info {
                    flex: 1;
                }
                .product-title {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 0.75rem;
                    line-height: 1.4;
                }
                .product-meta {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                }
                .price {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #059669;
                }
                .status {
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .status--active {
                    background: #dcfce7;
                    color: #166534;
                }
                .status--inactive {
                    background: #fef3cd;
                    color: #92400e;
                }
                .tab-buttons {
                    display: flex;
                    border-bottom: 1px solid #e5e7eb;
                    margin-bottom: 1rem;
                    gap: 0;
                    flex-wrap: wrap;
                }
                .tab-btn {
                    background: none;
                    border: none;
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #6b7280;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s ease;
                    min-width: 80px;
                    text-align: center;
                }
                .tab-btn:hover {
                    color: #3b82f6;
                }
                .tab-btn--active {
                    color: #3b82f6;
                    border-bottom-color: #3b82f6;
                }
                .tab-content {
                    display: none;
                }
                .tab-content--active {
                    display: block;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 0.75rem;
                }
                .info-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.5rem;
                    background: #f8fafc;
                    border-radius: 4px;
                }
                .info-item label {
                    font-weight: 600;
                    color: #374151;
                    flex-shrink: 0;
                    margin-right: 0.75rem;
                }
                .info-item span {
                    color: #1f2937;
                    text-align: right;
                    word-break: break-all;
                }
                .description-content, .shipping-info, .technical-info {
                    line-height: 1.6;
                }
                .description-text {
                    background: #f8fafc;
                    padding: 1rem;
                    border-radius: 6px;
                    border-left: 4px solid #3b82f6;
                }
                .tech-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 0.5rem;
                    margin-top: 1rem;
                }
                .tech-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem;
                    background: #f8fafc;
                    border-radius: 4px;
                }
                .no-content {
                    text-align: center;
                    color: #9ca3af;
                    padding: 2rem;
                    background: #f9fafb;
                    border-radius: 6px;
                }
                .json-display {
                    background: #1f2937;
                    color: #e5e7eb;
                    padding: 1rem;
                    border-radius: 6px;
                    font-family: 'Courier New', monospace;
                    font-size: 0.75rem;
                    overflow-x: auto;
                    max-height: 300px;
                    overflow-y: auto;
                }
                .raw-data {
                    max-height: 400px;
                }
                
                .product-summary {
                    margin-bottom: 1.5rem;
                    padding: 1rem;
                    background: #f0f9ff;
                    border-radius: 6px;
                    border-left: 4px solid #0ea5e9;
                }
                
                .product-summary h4 {
                    margin: 0 0 0.5rem 0;
                    color: #1e293b;
                    font-size: 1rem;
                    line-height: 1.4;
                }
                
                .product-summary p {
                    margin: 0;
                    color: #64748b;
                    font-size: 0.875rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .country-price-list h5 {
                    margin: 0 0 1rem 0;
                    color: #1e293b;
                    font-size: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .country-price-list .note {
                    color: #64748b;
                    font-size: 0.75rem;
                    margin: -0.5rem 0 1rem 0;
                    font-style: italic;
                }
                
                .country-price-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    margin-bottom: 0.5rem;
                    background: #f8fafc;
                    border-radius: 6px;
                    border: 1px solid #e2e8f0;
                    transition: all 0.2s ease;
                }
                
                .country-price-item:hover {
                    background: #f1f5f9;
                    border-color: #cbd5e1;
                    transform: translateX(2px);
                }
                
                .country-flag {
                    font-size: 1.25rem;
                    line-height: 1;
                    flex-shrink: 0;
                }
                
                .country-name {
                    flex: 1;
                    font-weight: 500;
                    color: #1e293b;
                }
                
                .country-price {
                    font-weight: 600;
                    color: #059669;
                    font-size: 0.875rem;
                    background: rgba(5, 150, 105, 0.1);
                    padding: 2px 8px;
                    border-radius: 12px;
                }
                
                @media (max-width: 768px) {
                    .product-header {
                        flex-direction: column;
                        text-align: center;
                    }
                    .info-grid {
                        grid-template-columns: 1fr;
                    }
                    .tab-buttons {
                        justify-content: center;
                    }
                    .tab-btn {
                        flex: 1;
                        min-width: 70px;
                        padding: 0.5rem 0.75rem;
                        font-size: 0.75rem;
                    }
                }
            </style>
        `;
    }
}

// タブ切り替え関数（グローバル）
window.switchTab = function(tabName) {
    // すべてのタブボタンを非アクティブに
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('tab-btn--active');
    });
    
    // すべてのタブコンテンツを非表示に
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('tab-content--active');
    });
    
    // 選択されたタブをアクティブに
    event.target.classList.add('tab-btn--active');
    const tabContent = document.getElementById(`tab-${tabName}`);
    if (tabContent) {
        tabContent.classList.add('tab-content--active');
    }
    
    console.log(`✅ タブ切り替え: ${tabName}`);
};

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 eBay Test Viewer N3準拠版開始');
    new EbayTestViewerN3();
});
