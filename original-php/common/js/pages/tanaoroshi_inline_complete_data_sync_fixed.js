/**
 * 🎯 棚卸しシステム：データ同期修正版 JavaScript
 * Gemini推奨のInventoryDataManagerクラス実装 + ビュー切り替え完全修正
 * 
 * 実装内容:
 * 1. 単一データソース管理（filteredData統一）
 * 2. カードビュー⇔エクセルビューの完全同期
 * 3. 効率的なDOM操作とパフォーマンス最適化
 * 4. エクセル風編集可能テーブル
 */

(function() {
    'use strict';
    
    /**
     * InventoryDataManagerクラス
     * データ管理、フィルター、ビュー切り替えを一元管理
     */
    class InventoryDataManager {
        constructor() {
            this.originalData = []; // DBから取得した生のデータ
            this.filteredData = []; // フィルター・検索適用後のデータ
            this.currentView = 'card'; // 'card' or 'excel'
            this.exchangeRate = 150.25;
            this.selectedProducts = [];
            
            // DOM要素のキャッシュ
            this.cardViewElement = null;
            this.excelViewElement = null;
            this.cardViewBtn = null;
            this.excelViewBtn = null;
            
            this.initializeElements();
        }

        /**
         * DOM要素の初期化とキャッシュ
         */
        initializeElements() {
            // ビューコンテナ
            this.cardViewElement = document.getElementById('card-view');
            this.excelViewElement = document.getElementById('list-view');
            
            // ビュー切り替えボタン
            this.cardViewBtn = document.getElementById('card-view-btn');
            this.excelViewBtn = document.getElementById('list-view-btn');
            
            console.log('🎯 InventoryDataManager 要素初期化:', {
                cardView: !!this.cardViewElement,
                excelView: !!this.excelViewElement,
                cardBtn: !!this.cardViewBtn,
                excelBtn: !!this.excelViewBtn
            });
        }

        /**
         * PostgreSQLからデータを読み込み
         */
        async loadData() {
            try {
                console.log('🐘 PostgreSQLデータ読み込み開始');
                this.showLoading();
                
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: new URLSearchParams({
                        'ajax_action': 'get_inventory',
                        'handler': 'postgresql_ebay',
                        'limit': '1000'
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (result.success && result.data && Array.isArray(result.data)) {
                    console.log('✅ PostgreSQLデータ取得成功:', result.data.length, '件');
                    
                    // データを標準形式に変換
                    this.originalData = this.convertPostgreSQLData(result.data);
                    this.filteredData = [...this.originalData];
                    
                    // ビューを更新
                    this.updateView();
                    this.updateStatistics();
                    
                    this.showNotification(`PostgreSQLデータ読み込み完了 (${this.originalData.length}件)`, 'success');
                } else {
                    throw new Error(result.error || result.message || 'データ取得に失敗');
                }
                
            } catch (error) {
                console.error('❌ データ読み込みエラー:', error);
                this.showNotification(`データ読み込みエラー: ${error.message}`, 'error');
                
                // エラー時はデモデータを読み込み
                this.loadDemoData();
            } finally {
                this.hideLoading();
            }
        }

        /**
         * PostgreSQLデータを標準形式に変換
         */
        convertPostgreSQLData(rawData) {
            return rawData.map((item, index) => ({
                id: item.id || index + 1,
                title: item.title || item.name || 'Unknown Product',
                sku: item.sku || `SKU-${String(index + 1).padStart(3, '0')}`,
                type: this.normalizeProductType(item.type),
                condition: item.condition || 'new',
                priceUSD: parseFloat(item.price_usd || item.price || 0),
                priceJPY: Math.round((item.price_usd || item.price || 0) * this.exchangeRate),
                costUSD: parseFloat(item.cost_usd || item.cost || 0),
                stock: parseInt(item.stock || 0),
                profit: this.calculateProfit(item.price_usd || item.price, item.cost_usd || item.cost),
                channels: this.parseChannels(item.channels || item.marketplace),
                category: item.category || 'Uncategorized',
                image: item.image || null,
                description: item.description || '',
                supplier: item.supplier || '',
                ebay_item_id: item.ebay_item_id || null,
                last_updated: item.last_updated || new Date().toISOString()
            }));
        }

        /**
         * 商品タイプの正規化
         */
        normalizeProductType(type) {
            if (!type) return 'stock';
            
            const typeMap = {
                'stock': 'stock',
                'dropship': 'dropship', 
                'set': 'set',
                'bundle': 'set',
                'hybrid': 'hybrid'
            };
            
            return typeMap[type.toLowerCase()] || 'stock';
        }

        /**
         * 利益計算
         */
        calculateProfit(price, cost) {
            const p = parseFloat(price || 0);
            const c = parseFloat(cost || 0);
            return Math.max(0, p - c);
        }

        /**
         * チャネル情報の解析
         */
        parseChannels(channelsStr) {
            if (!channelsStr) return ['ebay'];
            
            if (Array.isArray(channelsStr)) return channelsStr;
            
            if (typeof channelsStr === 'string') {
                return channelsStr.split(',').map(ch => ch.trim().toLowerCase());
            }
            
            return ['ebay'];
        }

        /**
         * フィルターと検索を適用
         */
        applyFiltersAndSearch(filters = {}, searchQuery = '') {
            console.log('🎯 フィルター適用:', { filters, searchQuery });
            
            let tempFiltered = [...this.originalData];
            
            // テキスト検索
            if (searchQuery && searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                tempFiltered = tempFiltered.filter(item => 
                    item.title.toLowerCase().includes(query) ||
                    item.sku.toLowerCase().includes(query) ||
                    item.category.toLowerCase().includes(query)
                );
            }
            
            // 商品種類フィルター
            if (filters.type && filters.type !== '') {
                tempFiltered = tempFiltered.filter(item => item.type === filters.type);
            }
            
            // チャネルフィルター
            if (filters.channel && filters.channel !== '') {
                tempFiltered = tempFiltered.filter(item => 
                    item.channels.includes(filters.channel)
                );
            }
            
            // 在庫状況フィルター
            if (filters.stockStatus && filters.stockStatus !== '') {
                tempFiltered = tempFiltered.filter(item => {
                    const stock = item.stock;
                    switch (filters.stockStatus) {
                        case 'sufficient': return stock >= 20;
                        case 'warning': return stock >= 5 && stock < 20;
                        case 'low': return stock >= 1 && stock < 5;
                        case 'out': return stock === 0;
                        default: return true;
                    }
                });
            }
            
            // 価格範囲フィルター
            if (filters.priceRange && filters.priceRange !== '') {
                tempFiltered = tempFiltered.filter(item => {
                    const price = item.priceUSD;
                    switch (filters.priceRange) {
                        case '0-25': return price >= 0 && price <= 25;
                        case '25-50': return price > 25 && price <= 50;
                        case '50-100': return price > 50 && price <= 100;
                        case '100+': return price > 100;
                        default: return true;
                    }
                });
            }
            
            this.filteredData = tempFiltered;
            this.updateView();
            this.updateStatistics();
            
            console.log(`✅ フィルター結果: ${this.filteredData.length}/${this.originalData.length}件`);
        }

        /**
         * ビューを切り替えて再描画
         */
        switchView(viewType) {
            console.log('🔄 ビュー切り替え:', viewType);
            
            if (!this.cardViewElement || !this.excelViewElement) {
                console.error('❌ ビュー要素が見つかりません');
                return false;
            }
            
            this.currentView = viewType;
            this.updateView();
            this.updateViewButtons();
            
            return true;
        }

        /**
         * 全てのビューを最新のデータで描画
         */
        updateView() {
            if (!this.filteredData) {
                console.warn('⚠️ filteredDataが未初期化');
                return;
            }
            
            console.log(`🎨 ビュー更新: ${this.currentView} (${this.filteredData.length}件)`);
            
            if (this.currentView === 'card') {
                this.renderCardView();
                this.showCardView();
            } else {
                this.renderExcelTable();
                this.showExcelView();
            }
        }

        /**
         * ビューコンテナの表示・非表示切り替え
         */
        showCardView() {
            if (this.cardViewElement && this.excelViewElement) {
                this.cardViewElement.style.display = 'grid';
                this.excelViewElement.style.display = 'none';
                console.log('✅ カードビュー表示');
            }
        }

        showExcelView() {
            if (this.cardViewElement && this.excelViewElement) {
                this.cardViewElement.style.display = 'none';
                this.excelViewElement.style.display = 'block';
                console.log('✅ エクセルビュー表示');
            }
        }

        /**
         * ビュー切り替えボタンの状態更新
         */
        updateViewButtons() {
            if (this.cardViewBtn && this.excelViewBtn) {
                this.cardViewBtn.classList.remove('inventory__view-btn--active');
                this.excelViewBtn.classList.remove('inventory__view-btn--active');
                
                if (this.currentView === 'card') {
                    this.cardViewBtn.classList.add('inventory__view-btn--active');
                } else {
                    this.excelViewBtn.classList.add('inventory__view-btn--active');
                }
            }
        }

        /**
         * カードビューの描画（DocumentFragment使用で最適化）
         */
        renderCardView() {
            if (!this.cardViewElement) {
                console.error('❌ カードビューコンテナが見つかりません');
                return;
            }
            
            console.log(`📋 カードビュー描画: ${this.filteredData.length}件`);
            
            // DocumentFragment使用で高速化
            const fragment = document.createDocumentFragment();
            
            this.filteredData.forEach(item => {
                const cardElement = this.createCardElement(item);
                fragment.appendChild(cardElement);
            });
            
            // 一括DOM更新
            this.cardViewElement.innerHTML = '';
            this.cardViewElement.appendChild(fragment);
            
            // カードイベントリスナー設定
            this.attachCardEventListeners();
            
            console.log('✅ カードビュー描画完了');
        }

        /**
         * 個別カード要素の作成
         */
        createCardElement(item) {
            const card = document.createElement('div');
            card.className = 'inventory__card';
            card.dataset.id = item.id;
            
            const stockStatus = this.getStockStatus(item.stock);
            const channelBadges = item.channels.map(ch => 
                `<span class="inventory__channel-badge inventory__channel-badge--${ch}">${ch.toUpperCase()}</span>`
            ).join('');
            
            card.innerHTML = `
                <div class="inventory__card-header">
                    <div class="inventory__card-image">
                        ${item.image ? 
                            `<img src="${item.image}" alt="${item.title}" loading="lazy">` :
                            '<i class="fas fa-image inventory__card-placeholder"></i>'
                        }
                    </div>
                    <div class="inventory__card-type inventory__card-type--${item.type}">
                        ${this.getTypeText(item.type)}
                    </div>
                </div>
                
                <div class="inventory__card-body">
                    <h3 class="inventory__card-title" title="${item.title}">
                        ${item.title}
                    </h3>
                    
                    <div class="inventory__card-sku">
                        <span class="inventory__card-label">SKU:</span>
                        <span class="inventory__card-value">${item.sku}</span>
                    </div>
                    
                    <div class="inventory__card-price">
                        <div class="inventory__price-usd">$${item.priceUSD.toFixed(2)}</div>
                        <div class="inventory__price-jpy">¥${item.priceJPY.toLocaleString()}</div>
                    </div>
                    
                    <div class="inventory__card-stock">
                        <span class="inventory__stock-badge inventory__stock-badge--${stockStatus.class}">
                            <i class="fas ${stockStatus.icon}"></i>
                            ${item.type === 'dropship' ? '無在庫' : `在庫: ${item.stock}`}
                        </span>
                    </div>
                    
                    <div class="inventory__card-channels">
                        ${channelBadges}
                    </div>
                    
                    <div class="inventory__card-profit">
                        <span class="inventory__card-label">利益:</span>
                        <span class="inventory__profit-value">$${item.profit.toFixed(2)}</span>
                    </div>
                </div>
                
                <div class="inventory__card-actions">
                    <button class="inventory__card-btn inventory__card-btn--edit" 
                            onclick="editProduct(${item.id})" 
                            title="編集">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="inventory__card-btn inventory__card-btn--delete" 
                            onclick="deleteProduct(${item.id})" 
                            title="削除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            return card;
        }

        /**
         * エクセルテーブルの描画
         */
        renderExcelTable() {
            const tableBody = document.getElementById('products-table-body');
            if (!tableBody) {
                console.error('❌ テーブルボディが見つかりません');
                return;
            }
            
            console.log(`📊 エクセルテーブル描画: ${this.filteredData.length}件`);
            
            if (this.filteredData.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="13" style="text-align: center; padding: 2rem; color: #6c757d;">
                            <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <div>表示するデータがありません</div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            // DocumentFragment使用で高速化
            const fragment = document.createDocumentFragment();
            
            this.filteredData.forEach(item => {
                const rowElement = this.createTableRowElement(item);
                fragment.appendChild(rowElement);
            });
            
            // 一括DOM更新
            tableBody.innerHTML = '';
            tableBody.appendChild(fragment);
            
            // テーブルイベントリスナー設定
            this.attachTableEventListeners();
            
            console.log('✅ エクセルテーブル描画完了');
        }

        /**
         * テーブル行要素の作成
         */
        createTableRowElement(item) {
            const row = document.createElement('tr');
            row.dataset.id = item.id;
            
            const channelBadges = item.channels.map(ch => 
                `<span class="channel-badge channel-badge--${ch}">${ch.substring(0, 1).toUpperCase()}</span>`
            ).join('');
            
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="excel-checkbox product-checkbox" data-id="${item.id}">
                </td>
                <td>
                    ${item.image ? 
                        `<img src="${item.image}" alt="${item.title}" style="width: 40px; height: 32px; object-fit: cover; border-radius: 4px;">` :
                        '<div class="table-image-placeholder" style="width: 40px; height: 32px; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 4px; color: #6c757d;"><i class="fas fa-image"></i></div>'
                    }
                </td>
                <td>
                    <input type="text" class="excel-cell" value="${item.title}" 
                           data-field="title" data-id="${item.id}">
                </td>
                <td>
                    <input type="text" class="excel-cell" value="${item.sku}" 
                           data-field="sku" data-id="${item.id}">
                </td>
                <td>
                    <select class="excel-select" data-field="type" data-id="${item.id}">
                        <option value="stock" ${item.type === 'stock' ? 'selected' : ''}>有在庫</option>
                        <option value="dropship" ${item.type === 'dropship' ? 'selected' : ''}>無在庫</option>
                        <option value="set" ${item.type === 'set' ? 'selected' : ''}>セット品</option>
                        <option value="hybrid" ${item.type === 'hybrid' ? 'selected' : ''}>ハイブリッド</option>
                    </select>
                </td>
                <td>
                    <select class="excel-select" data-field="condition" data-id="${item.id}">
                        <option value="new" ${item.condition === 'new' ? 'selected' : ''}>新品</option>
                        <option value="used" ${item.condition === 'used' ? 'selected' : ''}>中古</option>
                        <option value="refurbished" ${item.condition === 'refurbished' ? 'selected' : ''}>整備済み</option>
                    </select>
                </td>
                <td>
                    <input type="number" class="excel-cell" value="${item.priceUSD.toFixed(2)}" 
                           style="text-align: right;" step="0.01" min="0"
                           data-field="price_usd" data-id="${item.id}">
                </td>
                <td style="text-align: center;">
                    ${item.type === 'dropship' ? 
                        '<span style="color: #6c757d;">無在庫</span>' :
                        `<input type="number" class="excel-cell" value="${item.stock}" 
                                style="text-align: center;" min="0"
                                data-field="stock" data-id="${item.id}">`
                    }
                </td>
                <td>
                    <input type="number" class="excel-cell" value="${item.costUSD.toFixed(2)}" 
                           style="text-align: right;" step="0.01" min="0"
                           data-field="cost_usd" data-id="${item.id}">
                </td>
                <td style="text-align: center; font-weight: 600; color: #28a745;">
                    $${item.profit.toFixed(2)}
                </td>
                <td style="text-align: center;">
                    ${channelBadges}
                </td>
                <td>
                    <input type="text" class="excel-cell" value="${item.category}" 
                           data-field="category" data-id="${item.id}">
                </td>
                <td>
                    <div style="display: flex; gap: 4px; justify-content: center;">
                        <button class="excel-btn excel-btn--small" onclick="editProduct(${item.id})" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="excel-btn excel-btn--small excel-btn--danger" onclick="deleteProduct(${item.id})" title="削除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            return row;
        }

        /**
         * カードイベントリスナーの設定
         */
        attachCardEventListeners() {
            const cards = this.cardViewElement.querySelectorAll('.inventory__card');
            
            cards.forEach(card => {
                // 既存リスナー削除
                card.removeEventListener('click', this.handleCardClick.bind(this));
                
                // 新しいリスナー追加
                card.addEventListener('click', this.handleCardClick.bind(this));
            });
            
            console.log(`✅ ${cards.length}枚のカードにイベントリスナー設定`);
        }

        /**
         * テーブルイベントリスナーの設定（Gemini推奨のイベント委譲）
         */
        attachTableEventListeners() {
            const tableBody = document.getElementById('products-table-body');
            if (!tableBody) return;
            
            // 既存リスナー削除
            tableBody.removeEventListener('blur', this.handleTableCellEdit.bind(this), true);
            tableBody.removeEventListener('change', this.handleTableSelectChange.bind(this), true);
            
            // イベント委譲でリスナー設定
            tableBody.addEventListener('blur', this.handleTableCellEdit.bind(this), true);
            tableBody.addEventListener('change', this.handleTableSelectChange.bind(this), true);
            
            console.log('✅ テーブルイベントリスナー設定（イベント委譲）');
        }

        /**
         * カードクリックハンドラー
         */
        handleCardClick(event) {
            // ボタンクリックは除外
            if (event.target.closest('button') || event.target.closest('.inventory__card-actions')) {
                return;
            }
            
            event.preventDefault();
            event.stopPropagation();
            
            const card = event.currentTarget;
            const productId = parseInt(card.dataset.id);
            
            // 選択状態切り替え
            card.classList.toggle('inventory__card--selected');
            
            if (card.classList.contains('inventory__card--selected')) {
                if (!this.selectedProducts.includes(productId)) {
                    this.selectedProducts.push(productId);
                }
            } else {
                this.selectedProducts = this.selectedProducts.filter(id => id !== productId);
            }
            
            this.updateSelectionUI();
            console.log('🎯 商品選択更新:', this.selectedProducts);
        }

        /**
         * テーブルセル編集ハンドラー（Gemini推奨）
         */
        handleTableCellEdit(event) {
            const target = event.target;
            
            if (!target.matches('.excel-cell')) return;
            
            const productId = parseInt(target.dataset.id);
            const fieldName = target.dataset.field;
            const newValue = target.value;
            
            // バリデーション
            if (newValue.trim() === '') {
                this.showNotification('値は空にできません', 'warning');
                target.focus();
                return;
            }
            
            console.log('📝 セル編集:', { productId, fieldName, newValue });
            
            // データの更新
            this.updateProductData(productId, fieldName, newValue);
        }

        /**
         * テーブルセレクト変更ハンドラー
         */
        handleTableSelectChange(event) {
            const target = event.target;
            
            if (!target.matches('.excel-select')) return;
            
            const productId = parseInt(target.dataset.id);
            const fieldName = target.dataset.field;
            const newValue = target.value;
            
            console.log('🔄 セレクト変更:', { productId, fieldName, newValue });
            
            // データの更新
            this.updateProductData(productId, fieldName, newValue);
        }

        /**
         * 商品データの更新
         */
        updateProductData(productId, fieldName, newValue) {
            // ローカルデータ更新
            const product = this.filteredData.find(item => item.id === productId);
            if (product) {
                product[fieldName] = newValue;
                
                // 価格変更時は利益を再計算
                if (fieldName === 'price_usd' || fieldName === 'cost_usd') {
                    product.profit = this.calculateProfit(product.priceUSD, product.costUSD);
                }
                
                console.log('✅ ローカルデータ更新:', { productId, fieldName, newValue });
            }
            
            // データベース更新（バックグラウンド）
            this.updateProductInDB(productId, fieldName, newValue);
        }

        /**
         * データベース更新（Gemini推奨）
         */
        async updateProductInDB(id, field, value) {
            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: new URLSearchParams({
                        'ajax_action': 'update_product',
                        'handler': 'postgresql_ebay',
                        'id': id,
                        'field': field,
                        'value': value
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ DB更新成功:', { id, field, value });
                } else {
                    console.error('❌ DB更新失敗:', result.error);
                    this.showNotification('データベース更新に失敗しました', 'error');
                }
                
            } catch (error) {
                console.error('❌ DB更新エラー:', error);
                this.showNotification('データベース更新エラーが発生しました', 'error');
            }
        }

        /**
         * ユーティリティメソッド群
         */
        getStockStatus(stock) {
            if (stock === 0) return { class: 'out', icon: 'fa-times-circle' };
            if (stock < 5) return { class: 'low', icon: 'fa-exclamation-triangle' };
            if (stock < 20) return { class: 'warning', icon: 'fa-exclamation-circle' };
            return { class: 'sufficient', icon: 'fa-check-circle' };
        }

        getTypeText(type) {
            const typeMap = {
                'stock': '有在庫',
                'dropship': '無在庫',
                'set': 'セット品',
                'hybrid': 'ハイブリッド'
            };
            return typeMap[type] || '不明';
        }

        updateSelectionUI() {
            const selectedCount = this.selectedProducts.length;
            const createSetBtn = document.getElementById('create-set-btn');
            const setBtnText = document.getElementById('set-btn-text');
            
            if (createSetBtn && setBtnText) {
                if (selectedCount >= 2) {
                    createSetBtn.disabled = false;
                    createSetBtn.className = 'btn btn--warning';
                    setBtnText.textContent = `選択商品からセット品作成 (${selectedCount}点)`;
                } else {
                    createSetBtn.disabled = false;
                    createSetBtn.className = 'btn btn--warning';
                    setBtnText.textContent = '新規セット品作成';
                }
            }
        }

        updateStatistics() {
            const stats = this.calculateStatistics();
            
            const totalElement = document.getElementById('total-products');
            const stockElement = document.getElementById('stock-products');
            const dropshipElement = document.getElementById('dropship-products');
            const setElement = document.getElementById('set-products');
            const hybridElement = document.getElementById('hybrid-products');
            const valueElement = document.getElementById('total-value');
            
            if (totalElement) totalElement.textContent = stats.total;
            if (stockElement) stockElement.textContent = stats.stock;
            if (dropshipElement) dropshipElement.textContent = stats.dropship;
            if (setElement) setElement.textContent = stats.set;
            if (hybridElement) hybridElement.textContent = stats.hybrid;
            if (valueElement) valueElement.textContent = `$${stats.totalValue.toFixed(2)}`;
        }

        calculateStatistics() {
            return this.filteredData.reduce((stats, item) => {
                stats.total++;
                stats[item.type]++;
                stats.totalValue += item.priceUSD * item.stock;
                return stats;
            }, {
                total: 0,
                stock: 0,
                dropship: 0,
                set: 0,
                hybrid: 0,
                totalValue: 0
            });
        }

        loadDemoData() {
            console.log('📊 デモデータ読み込み');
            
            this.originalData = this.generateDemoData(50);
            this.filteredData = [...this.originalData];
            this.updateView();
            this.updateStatistics();
            
            this.showNotification('デモデータを読み込みました', 'info');
        }

        generateDemoData(count) {
            const demoData = [];
            const categories = ['Electronics', 'Fashion', 'Home', 'Sports', 'Books'];
            const types = ['stock', 'dropship', 'set', 'hybrid'];
            const productNames = [
                'Wireless Gaming Mouse RGB LED',
                'Bluetooth Wireless Headphones',
                'USB-C Fast Charging Cable',
                'Portable Wireless Speaker',
                'Smartphone Car Mount Holder',
                'LED Desk Lamp with USB Charging',
                'Gaming Mechanical Keyboard',
                'Laptop Cooling Pad Stand',
                'Wireless Phone Charger Pad',
                'Bluetooth Fitness Tracker'
            ];
            
            for (let i = 1; i <= count; i++) {
                const type = types[Math.floor(Math.random() * types.length)];
                const price = Math.random() * 200 + 10;
                const cost = price * (0.4 + Math.random() * 0.4);
                const baseName = productNames[Math.floor(Math.random() * productNames.length)];
                
                demoData.push({
                    id: i,
                    title: `${baseName} - Model ${String(i).padStart(3, '0')}`,
                    sku: `DEMO-${String(i).padStart(3, '0')}`,
                    type: type,
                    condition: 'new',
                    priceUSD: price,
                    priceJPY: Math.round(price * this.exchangeRate),
                    costUSD: cost,
                    stock: type === 'dropship' ? 0 : Math.floor(Math.random() * 100),
                    profit: price - cost,
                    channels: ['ebay'],
                    category: categories[Math.floor(Math.random() * categories.length)],
                    image: null,
                    description: `Demo product ${i} description`,
                    supplier: 'Demo Supplier',
                    ebay_item_id: null,
                    last_updated: new Date().toISOString()
                });
            }
            
            return demoData;
        }

        showLoading() {
            console.log('⏳ ローディング表示');
            // ローディング表示実装
        }

        hideLoading() {
            console.log('✅ ローディング非表示');
            // ローディング非表示実装
        }

        showNotification(message, type = 'info') {
            console.log(`📢 ${type.toUpperCase()}: ${message}`);
            // 通知表示実装
        }
    }

    // グローバルインスタンス作成
    window.inventoryManager = new InventoryDataManager();

    // DOMContentLoaded時の初期化
    let isSystemInitialized = false;
    
    function initializeInventorySystem() {
        if (isSystemInitialized) {
            console.log('⚠️ システム重複初期化を防止');
            return;
        }
        isSystemInitialized = true;
        
        console.log('🚀 棚卸しシステム初期化開始（データ同期修正版）');
        
        // イベントリスナー設定
        setupEventListeners();
        
        // データ読み込み
        window.inventoryManager.loadData();
        
        console.log('✅ システム初期化完了');
    }

    function setupEventListeners() {
        console.log('🔧 イベントリスナー設定');
        
        // ビュー切り替えボタン
        const cardViewBtn = document.getElementById('card-view-btn');
        const excelViewBtn = document.getElementById('list-view-btn');
        
        if (cardViewBtn) {
            cardViewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.inventoryManager.switchView('card');
            });
        }
        
        if (excelViewBtn) {
            excelViewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.inventoryManager.switchView('excel');
            });
        }
        
        // フィルター設定
        const filterSelects = document.querySelectorAll('.inventory__filter-select');
        const searchInput = document.getElementById('search-input');
        
        filterSelects.forEach(select => {
            select.addEventListener('change', applyFilters);
        });
        
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
        }
        
        console.log('✅ イベントリスナー設定完了');
    }

    function applyFilters() {
        const filters = {
            type: document.getElementById('filter-type')?.value || '',
            channel: document.getElementById('filter-channel')?.value || '',
            stockStatus: document.getElementById('filter-stock-status')?.value || '',
            priceRange: document.getElementById('filter-price-range')?.value || ''
        };
        
        const searchQuery = document.getElementById('search-input')?.value || '';
        
        window.inventoryManager.applyFiltersAndSearch(filters, searchQuery);
    }

    // グローバル関数公開
    window.switchView = (view) => window.inventoryManager.switchView(view);
    window.loadPostgreSQLData = () => window.inventoryManager.loadData();
    window.syncEbayData = () => {
        console.log('🔄 eBay同期要求 - InventoryDataManager統合予定');
        // eBay同期機能は既存システムと統合
    };
    window.applyFilters = applyFilters;
    window.resetFilters = () => {
        // フィルターリセット実装
        document.querySelectorAll('.inventory__filter-select').forEach(select => {
            select.value = '';
        });
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        applyFilters();
    };

    // ダミー関数（既存コードとの互換性）
    window.editProduct = (id) => {
        console.log('📝 商品編集:', id);
        // 商品編集モーダル表示等の実装
    };
    
    window.deleteProduct = (id) => {
        console.log('🗑️ 商品削除:', id);
        if (confirm('この商品を削除しますか？')) {
            // 削除処理実装
        }
    };

    // 初期化実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeInventorySystem);
    } else {
        // 既にDOM読み込み済み
        setTimeout(initializeInventorySystem, 100);
    }
    
    // フォールバック初期化（5秒後）
    setTimeout(() => {
        if (!isSystemInitialized) {
            console.log('🚑 フォールバック初期化実行');
            initializeInventorySystem();
        }
    }, 5000);

    console.log('📜 棚卸しシステム（データ同期修正版）JavaScript読み込み完了');

})();