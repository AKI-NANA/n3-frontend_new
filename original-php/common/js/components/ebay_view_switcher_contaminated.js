/**
 * eBay データ表示切り替えシステム
 * カード型・Excel型の表示切り替え（衝突回避版）
 * 
 * NameSpace: EbayViewSwitcher
 * 衝突回避: 独立したオブジェクトに全機能を格納
 */

(function() {
    'use strict';
    
    // 完全独立したネームスペース
    window.EbayViewSwitcher = {
        currentView: 'table', // 'table' or 'card'
        currentData: [],
        initialized: false,
        
        /**
         * システム初期化
         */
        init: function() {
            if (this.initialized) return;
            
            console.log('🔄 EbayViewSwitcher 初期化開始 (衝突回避モード)');
            
            // 表示切り替えボタンの作成
            this.createSwitchButtons();
            
            this.initialized = true;
            console.log('✅ EbayViewSwitcher 初期化完了');
        },
        
        /**
         * 表示切り替えボタン作成
         */
        createSwitchButtons: function() {
            const container = document.getElementById('sample-data');
            if (!container) return;
            
            // ボタンが既に存在する場合は削除
            const existingButtons = document.getElementById('view-switch-buttons');
            if (existingButtons) {
                existingButtons.remove();
            }
            
            // ボタンコンテナ作成
            const buttonContainer = document.createElement('div');
            buttonContainer.id = 'view-switch-buttons';
            buttonContainer.innerHTML = `
                <div class="view-switch-container">
                    <h3><i class="fas fa-table"></i> 実際のサンプルデータ</h3>
                    <div class="view-switch-buttons">
                        <button class="view-switch-btn view-switch-btn--active" data-view="table" onclick="EbayViewSwitcher.switchView('table')">
                            <i class="fas fa-table"></i> Excel表示
                        </button>
                        <button class="view-switch-btn" data-view="card" onclick="EbayViewSwitcher.switchView('card')">
                            <i class="fas fa-th-large"></i> カード表示
                        </button>
                    </div>
                </div>
                
                <style>
                    .view-switch-container {
                        margin-bottom: 1rem;
                    }
                    
                    .view-switch-container h3 {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        margin-bottom: 1rem;
                        color: #1e293b;
                    }
                    
                    .view-switch-buttons {
                        display: flex;
                        gap: 0.5rem;
                        margin-bottom: 1.5rem;
                        justify-content: center;
                    }
                    
                    .view-switch-btn {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.75rem 1.5rem;
                        border: 2px solid #e5e7eb;
                        background: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: #6b7280;
                        transition: all 0.2s ease;
                    }
                    
                    .view-switch-btn:hover {
                        border-color: #3b82f6;
                        color: #3b82f6;
                        transform: translateY(-2px);
                    }
                    
                    .view-switch-btn--active {
                        border-color: #3b82f6;
                        background: #3b82f6;
                        color: white;
                    }
                    
                    .view-switch-btn--active:hover {
                        background: #2563eb;
                        transform: translateY(-2px);
                    }
                </style>
            `;
            
            // 既存のh3要素を探して置換
            const existingTitle = container.querySelector('h3');
            if (existingTitle) {
                existingTitle.parentNode.insertBefore(buttonContainer, existingTitle);
                existingTitle.remove();
            } else {
                container.insertBefore(buttonContainer, container.firstChild);
            }
        },
        
        /**
         * 表示切り替えメイン関数
         */
        switchView: function(viewType) {
            console.log(`🔄 表示切り替え: ${this.currentView} → ${viewType}`);
            
            if (this.currentView === viewType) return;
            
            this.currentView = viewType;
            this.updateSwitchButtons();
            
            // データが存在する場合は再レンダリング
            if (this.currentData.length > 0) {
                this.renderData(this.currentData);
            }
        },
        
        /**
         * 切り替えボタンの状態更新
         */
        updateSwitchButtons: function() {
            const buttons = document.querySelectorAll('.view-switch-btn');
            buttons.forEach(btn => {
                btn.classList.remove('view-switch-btn--active');
                if (btn.dataset.view === this.currentView) {
                    btn.classList.add('view-switch-btn--active');
                }
            });
        },
        
        /**
         * データセット・レンダリング
         */
        setData: function(data) {
            this.currentData = data;
            this.renderData(data);
        },
        
        /**
         * データレンダリング（表示形式に応じて）
         */
        renderData: function(data) {
            const container = document.getElementById('sample-data');
            if (!container) return;
            
            const dataContainer = container.querySelector('#data-display-area') || this.createDataDisplayArea(container);
            
            if (this.currentView === 'table') {
                dataContainer.innerHTML = this.generateTableHTML(data);
            } else {
                dataContainer.innerHTML = this.generateCardHTML(data);
            }
            
            // グローバルデータも更新（既存機能との互換性）
            window.currentProductData = data;
        },
        
        /**
         * データ表示エリア作成
         */
        createDataDisplayArea: function(container) {
            const dataArea = document.createElement('div');
            dataArea.id = 'data-display-area';
            container.appendChild(dataArea);
            return dataArea;
        },
        
        /**
         * Excel表示HTML生成（強化版統合）
         */
        generateTableHTML: function(data) {
            if (!data || data.length === 0) {
                return '<div class="alert alert-warning">データがありません</div>';
            }
            
            // 強化版Excel表示システムが利用可能な場合は委譲
            if (typeof window.EbayEnhancedExcel !== 'undefined') {
                console.log('🚀 強化版Excel表示システムを使用');
                // 強化版システムにデータを渡して表示
                setTimeout(() => {
                    window.EbayEnhancedExcel.setData(data);
                }, 100);
                
                return `
                    <div id="enhanced-excel-placeholder">
                        <div style="text-align: center; padding: 2rem; color: #64748b;">
                            <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 1rem; display: block;"></i>
                            強化版Excel表示を読み込み中...
                        </div>
                    </div>
                `;
            }
            
            // フォールバック: 基本テーブル表示
            
            let html = '<div style="overflow-x: auto;"><table class="data-table"><thead><tr>';
            
            const displayColumns = ['ebay_item_id', 'title', 'current_price_value', 'condition_display_name', 'quantity', 'listing_status'];
            displayColumns.forEach(key => {
                const displayName = this.getFieldDisplayName(key);
                html += `<th>${displayName}</th>`;
            });
            html += '<th>操作</th></tr></thead><tbody>';
            
            data.forEach((item, index) => {
                html += '<tr>';
                
                displayColumns.forEach(key => {
                    let value = item[key] || '-';
                    
                    if (key === 'current_price_value' && value !== '-') {
                        value = `$${parseFloat(value).toFixed(2)}`;
                    } else if (key === 'title' && value !== '-') {
                        value = String(value).substring(0, 60) + (String(value).length > 60 ? '...' : '');
                    } else if (key === 'listing_status') {
                        const statusClass = value === 'Active' ? 'success' : 'warning';
                        value = `<span class="status-badge status-badge--${statusClass}">${value}</span>`;
                    }
                    
                    html += `<td>${value}</td>`;
                });
                
                html += `
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn action-btn--detail" onclick="EbayViewSwitcher.showProductDetail(${index})" title="詳細表示">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn action-btn--ebay" onclick="EbayViewSwitcher.openEbayLink('${item.ebay_item_id || ''}', '${item.view_item_url || ''}')" title="eBayで見る">
                                <i class="fab fa-ebay"></i>
                            </button>
                            <button class="action-btn action-btn--edit" onclick="EbayViewSwitcher.editProduct(${index})" title="編集">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                html += '</tr>';
            });
            
            html += '</tbody></table></div>';
            return html;
        },
        
        /**
         * カード表示HTML生成（新機能）
         */
        generateCardHTML: function(data) {
            if (!data || data.length === 0) {
                return '<div class="alert alert-warning">データがありません</div>';
            }
            
            let html = '<div class="ebay-card-grid">';
            
            data.forEach((item, index) => {
                const imageUrl = this.getProductImageUrl(item);
                const statusClass = item.listing_status === 'Active' ? 'active' : 'inactive';
                
                html += `
                    <div class="ebay-product-card" onclick="EbayViewSwitcher.showProductDetail(${index})">
                        <div class="ebay-card-image">
                            ${imageUrl ? 
                                `<img src="${imageUrl}" alt="商品画像" onerror="this.src='https://via.placeholder.com/200x200?text=No+Image'" />` :
                                '<div class="ebay-card-placeholder"><i class="fas fa-image"></i></div>'
                            }
                            <div class="ebay-card-status ebay-card-status--${statusClass}">
                                ${item.listing_status || 'Unknown'}
                            </div>
                        </div>
                        
                        <div class="ebay-card-content">
                            <div class="ebay-card-title">${this.truncateText(item.title || 'タイトルなし', 50)}</div>
                            <div class="ebay-card-price">$${parseFloat(item.current_price_value || 0).toFixed(2)}</div>
                            <div class="ebay-card-meta">
                                <span class="ebay-card-condition">${item.condition_display_name || 'Unknown'}</span>
                                <span class="ebay-card-quantity">在庫: ${item.quantity || 0}</span>
                            </div>
                            
                            <div class="ebay-card-actions" onclick="event.stopPropagation();">
                                <button class="ebay-card-btn ebay-card-btn--detail" onclick="EbayViewSwitcher.showProductDetail(${index})" title="詳細表示">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="ebay-card-btn ebay-card-btn--ebay" onclick="EbayViewSwitcher.openEbayLink('${item.ebay_item_id || ''}', '${item.view_item_url || ''}')" title="eBayで見る">
                                    <i class="fab fa-ebay"></i>
                                </button>
                                <button class="ebay-card-btn ebay-card-btn--edit" onclick="EbayViewSwitcher.editProduct(${index})" title="編集">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            
            // カード専用CSS追加
            html += this.getCardStyles();
            
            return html;
        },
        
        /**
         * 商品画像URL取得
         */
        getProductImageUrl: function(item) {
            if (item.picture_urls && Array.isArray(item.picture_urls) && item.picture_urls.length > 0) {
                return item.picture_urls[0];
            }
            if (item.gallery_url) {
                return item.gallery_url;
            }
            return null;
        },
        
        /**
         * テキスト切り詰め
         */
        truncateText: function(text, maxLength) {
            if (!text) return '';
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        },
        
        /**
         * フィールド表示名取得
         */
        getFieldDisplayName: function(field) {
            const fieldNames = {
                'ebay_item_id': '商品ID',
                'title': 'タイトル',
                'current_price_value': '価格',
                'condition_display_name': '状態',
                'quantity': '在庫',
                'listing_status': 'ステータス'
            };
            return fieldNames[field] || field;
        },
        
        /**
         * カード用CSS生成
         */
        getCardStyles: function() {
            return `
                <style>
                    .ebay-card-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                        gap: 1.5rem;
                        margin-top: 1rem;
                    }
                    
                    .ebay-product-card {
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        border: 1px solid #e5e7eb;
                    }
                    
                    .ebay-product-card:hover {
                        transform: translateY(-4px);
                        box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
                        border-color: #3b82f6;
                    }
                    
                    .ebay-card-image {
                        position: relative;
                        width: 100%;
                        height: 200px;
                        overflow: hidden;
                    }
                    
                    .ebay-card-image img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        transition: transform 0.3s ease;
                    }
                    
                    .ebay-product-card:hover .ebay-card-image img {
                        transform: scale(1.05);
                    }
                    
                    .ebay-card-placeholder {
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #9ca3af;
                        font-size: 3rem;
                    }
                    
                    .ebay-card-status {
                        position: absolute;
                        top: 12px;
                        right: 12px;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        backdrop-filter: blur(10px);
                    }
                    
                    .ebay-card-status--active {
                        background: rgba(16, 185, 129, 0.9);
                        color: white;
                    }
                    
                    .ebay-card-status--inactive {
                        background: rgba(245, 158, 11, 0.9);
                        color: white;
                    }
                    
                    .ebay-card-content {
                        padding: 1.25rem;
                    }
                    
                    .ebay-card-title {
                        font-size: 1rem;
                        font-weight: 600;
                        color: #1f2937;
                        margin-bottom: 0.75rem;
                        line-height: 1.4;
                        height: 2.8em;
                        overflow: hidden;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                    }
                    
                    .ebay-card-price {
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: #059669;
                        margin-bottom: 0.75rem;
                    }
                    
                    .ebay-card-meta {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 1rem;
                        font-size: 0.875rem;
                        color: #6b7280;
                    }
                    
                    .ebay-card-condition {
                        padding: 2px 6px;
                        background: #f3f4f6;
                        border-radius: 4px;
                        font-weight: 500;
                    }
                    
                    .ebay-card-actions {
                        display: flex;
                        gap: 0.5rem;
                        justify-content: center;
                    }
                    
                    .ebay-card-btn {
                        flex: 1;
                        padding: 0.5rem;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.875rem;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .ebay-card-btn--detail {
                        background: #dbeafe;
                        color: #1d4ed8;
                    }
                    
                    .ebay-card-btn--detail:hover {
                        background: #bfdbfe;
                    }
                    
                    .ebay-card-btn--ebay {
                        background: #fef3cd;
                        color: #d97706;
                    }
                    
                    .ebay-card-btn--ebay:hover {
                        background: #fed7aa;
                    }
                    
                    .ebay-card-btn--edit {
                        background: #dcfce7;
                        color: #166534;
                    }
                    
                    .ebay-card-btn--edit:hover {
                        background: #bbf7d0;
                    }
                    
                    /* レスポンシブ対応 */
                    @media (max-width: 768px) {
                        .ebay-card-grid {
                            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                            gap: 1rem;
                        }
                        
                        .ebay-card-content {
                            padding: 1rem;
                        }
                        
                        .ebay-card-title {
                            font-size: 0.875rem;
                        }
                        
                        .ebay-card-price {
                            font-size: 1.25rem;
                        }
                    }
                    
                    @media (max-width: 480px) {
                        .ebay-card-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                </style>
            `;
        },
        
        /**
         * 商品詳細表示（既存機能を呼び出し）
         */
        showProductDetail: function(index) {
            if (typeof window.showProductDetail === 'function') {
                window.showProductDetail(index);
            } else {
                console.error('showProductDetail関数が見つかりません');
            }
        },
        
        /**
         * eBayリンクを開く（既存機能を呼び出し）
         */
        openEbayLink: function(itemId, viewUrl) {
            if (typeof window.openEbayLink === 'function') {
                window.openEbayLink(itemId, viewUrl);
            } else {
                console.error('openEbayLink関数が見つかりません');
            }
        },
        
        /**
         * 商品編集（既存機能を呼び出し）
         */
        editProduct: function(index) {
            if (typeof window.editProduct === 'function') {
                window.editProduct(index);
            } else {
                console.error('editProduct関数が見つかりません');
            }
        }
    };
    
    // DOMContentLoaded で初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.EbayViewSwitcher.init());
    } else {
        window.EbayViewSwitcher.init();
    }
    
    console.log('✅ EbayViewSwitcher JavaScript モジュール読み込み完了');
    
})();
