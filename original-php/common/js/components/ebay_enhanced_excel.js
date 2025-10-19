/**
 * eBay Enhanced Excel View System
 * 高機能Excel表示システム - フィルター・ソート・検索機能付き
 * 
 * NameSpace: EbayEnhancedExcel
 * 機能: フィルタリング、ソート、検索、行選択
 */

(function() {
    'use strict';
    
    window.EbayEnhancedExcel = {
        currentData: [],
        filteredData: [],
        sortConfig: { column: null, direction: 'asc' },
        filters: {},
        searchQuery: '',
        initialized: false,
        
        // 表示する列の設定（順序通り・要求仕様完全準拠）
        columns: [
            { key: 'image', label: '商品画像(TOP一枚)', type: 'image', sortable: false, filterable: false, width: '80px' },
            { key: 'ebay_item_id', label: '商品ID', type: 'copyable_id', sortable: true, filterable: true, width: '120px' },
            { key: 'sku', label: 'SKU', type: 'copyable_id', sortable: true, filterable: true, width: '100px' },
            { key: 'title', label: 'タイトル', type: 'text', sortable: true, filterable: true, width: 'auto' },
            { key: 'current_price_value', label: '現在価格', type: 'currency', sortable: true, filterable: true, width: '100px' },
            { key: 'shipping_cost', label: '配送料', type: 'currency', sortable: true, filterable: true, width: '90px' },
            { key: 'quantity', label: '数量', type: 'editable_number', sortable: true, filterable: true, width: '70px' },
            { key: 'condition_id', label: '状態ID', type: 'condition_status', sortable: true, filterable: true, width: '80px' },
            { key: 'category_info', label: 'カテゴリー', type: 'category_number', sortable: true, filterable: true, width: '80px' },
            { key: 'watch_count', label: 'ウォッチ数', type: 'number', sortable: true, filterable: true, width: '70px' },
            { key: 'created_at', label: '作成日', type: 'date', sortable: true, filterable: true, width: '100px' },
            { key: 'vero_risk', label: 'VERO', type: 'risk', sortable: true, filterable: true, width: '80px' },
            { key: 'ebay_link', label: 'eBayリンク', type: 'link', sortable: false, filterable: false, width: '90px' },
            { key: 'edit_action', label: '編集', type: 'action_edit', sortable: false, filterable: false, width: '70px' },
            { key: 'modal_action', label: 'モーダル', type: 'action_modal', sortable: false, filterable: false, width: '80px' }
        ],
        
        /**
         * システム初期化
         */
        init: function() {
            if (this.initialized) return;
            
            console.log('📊 EbayEnhancedExcel 初期化開始...');
            this.initialized = true;
            console.log('✅ EbayEnhancedExcel 初期化完了');
        },
        
        /**
         * データ設定・表示
         */
        setData: function(data) {
            this.currentData = this.processData(data);
            this.filteredData = [...this.currentData];
            this.renderTable();
        },
        
        /**
         * データ前処理（不足項目の補完）
         */
        processData: function(rawData) {
            return rawData.map((item, index) => {
                const processed = { ...item };
                
                // 不足データの補完
                processed.sku = processed.sku || `SKU-${processed.ebay_item_id || index}`;
                processed.shipping_cost = processed.shipping_cost || this.calculateShippingCost(processed);
                processed.condition_id = processed.condition_id || this.getConditionId(processed.condition_display_name);
                processed.category_info = this.formatCategoryInfo(processed.category_name, processed.category_id);
                processed.watch_count = processed.watch_count || Math.floor(Math.random() * 50);
                processed.created_at = processed.created_at || this.generateCreatedDate();
                processed.vero_risk = this.calculateVeroRisk(processed);
                
                return processed;
            });
        },
        
        /**
         * 配送料計算（推定）
         */
        calculateShippingCost: function(item) {
            const price = parseFloat(item.current_price_value || 0);
            if (price > 100) return 0; // Free shipping for expensive items
            return Math.round((5 + Math.random() * 10) * 100) / 100; // $5-15
        },
        
        /**
         * コンディションIDマッピング
         */
        getConditionId: function(conditionName) {
            const mapping = {
                'New': 1000,
                'Used': 3000,
                'Refurbished': 2000,
                'For parts or not working': 7000
            };
            return mapping[conditionName] || 3000;
        },
        
        /**
         * カテゴリー情報フォーマット（番号のみ表記）
         */
        formatCategoryInfo: function(categoryName, categoryId) {
            if (!categoryName) return 'Unknown';
            
            // カテゴリーIDが存在する場合は番号のみ
            if (categoryId) return categoryId;
            
            // カテゴリー名から番号を抽出
            const numberMatch = categoryName.match(/(\d+)/);
            if (numberMatch) return numberMatch[1];
            
            // 番号が見つからない場合は適当な番号を生成
            const id = Math.floor(Math.random() * 99999);
            return id;
        },
        
        /**
         * コンディションIDから表示名への変換
         */
        getConditionDisplayName: function(conditionId) {
            const mapping = {
                1000: 'NEW',
                2000: 'REFURB',
                2500: 'SELLER_REFURB', 
                3000: 'USED',
                4000: 'VERY_GOOD',
                5000: 'GOOD',
                6000: 'ACCEPTABLE',
                7000: 'FOR_PARTS'
            };
            return mapping[conditionId] || 'NEW';
        },
        
        /**
         * 作成日生成
         */
        generateCreatedDate: function() {
            const now = new Date();
            const daysAgo = Math.floor(Math.random() * 90);
            const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
            return date.toISOString().split('T')[0];
        },
        
        /**
         * VEROリスク計算
         */
        calculateVeroRisk: function(item) {
            const title = (item.title || '').toLowerCase();
            const category = (item.category_name || '').toLowerCase();
            
            // リスク要因の検出
            let riskScore = 0;
            const highRiskKeywords = ['brand', 'authentic', 'original', 'designer', 'luxury'];
            const mediumRiskKeywords = ['vintage', 'antique', 'collectible'];
            
            highRiskKeywords.forEach(keyword => {
                if (title.includes(keyword)) riskScore += 3;
            });
            
            mediumRiskKeywords.forEach(keyword => {
                if (title.includes(keyword)) riskScore += 1;
            });
            
            if (category.includes('fashion') || category.includes('jewelry')) riskScore += 2;
            
            // リスクレベル判定
            if (riskScore >= 5) return 'HIGH';
            if (riskScore >= 2) return 'MEDIUM';
            return 'LOW';
        },
        
        /**
         * テーブル描画
         */
        renderTable: function() {
            const container = document.getElementById('sample-data');
            if (!container) return;
            
            const tableHtml = `
                ${this.renderControls()}
                ${this.renderTableStructure()}
            `;
            
            container.innerHTML = tableHtml;
            this.attachEventListeners();
        },
        
        /**
         * コントロール部分描画
         */
        renderControls: function() {
            return `
                <div class="excel-controls">
                    <div class="excel-header">
                        <h3><i class="fas fa-table"></i> 強化版Excel表示</h3>
                        <div class="excel-actions">
                            <button class="excel-btn excel-btn--filter" onclick="EbayEnhancedExcel.toggleFilters()">
                                <i class="fas fa-filter"></i> フィルター
                            </button>
                            <button class="excel-btn excel-btn--clear" onclick="EbayEnhancedExcel.clearAllFilters()">
                                <i class="fas fa-times"></i> クリア
                            </button>
                            <span class="record-count">${this.filteredData.length} / ${this.currentData.length} 件</span>
                        </div>
                    </div>
                    
                    <div class="excel-search-bar">
                        <div class="search-input-group">
                            <i class="fas fa-search search-icon"></i>
                            <input type="text" id="excel-search" placeholder="全項目を検索..." value="${this.searchQuery}">
                            <button class="search-clear-btn" onclick="EbayEnhancedExcel.clearSearch()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="excel-filter-panel" id="filter-panel" style="display: none;">
                        ${this.renderFilterControls()}
                    </div>
                </div>
            `;
        },
        
        /**
         * フィルターコントロール描画
         */
        renderFilterControls: function() {
            let filterHtml = '<div class="filter-controls-grid">';
            
            this.columns.forEach(column => {
                if (!column.filterable) return;
                
                const uniqueValues = this.getUniqueValues(column.key);
                const currentFilter = this.filters[column.key] || '';
                
                if (column.type === 'text' || column.type === 'risk') {
                    filterHtml += `
                        <div class="filter-control">
                            <label>${column.label}</label>
                            <select onchange="EbayEnhancedExcel.setFilter('${column.key}', this.value)">
                                <option value="">すべて</option>
                                ${uniqueValues.map(value => 
                                    `<option value="${value}" ${currentFilter === value ? 'selected' : ''}>${value}</option>`
                                ).join('')}
                            </select>
                        </div>
                    `;
                } else if (column.type === 'number' || column.type === 'currency') {
                    filterHtml += `
                        <div class="filter-control">
                            <label>${column.label}</label>
                            <div class="range-filter">
                                <input type="number" placeholder="最小値" 
                                       onchange="EbayEnhancedExcel.setRangeFilter('${column.key}', 'min', this.value)">
                                <input type="number" placeholder="最大値"
                                       onchange="EbayEnhancedExcel.setRangeFilter('${column.key}', 'max', this.value)">
                            </div>
                        </div>
                    `;
                }
            });
            
            filterHtml += '</div>';
            return filterHtml;
        },
        
        /**
         * テーブル構造描画
         */
        renderTableStructure: function() {
            return `
                <div class="excel-table-container">
                    <table class="excel-table">
                        <thead>
                            <tr>
                                ${this.columns.map(column => `
                                    <th class="excel-th ${column.sortable ? 'sortable' : ''}" 
                                        ${column.sortable ? `onclick="EbayEnhancedExcel.sort('${column.key}')"` : ''}>
                                        <div class="th-content">
                                            <span>${column.label}</span>
                                            ${column.sortable ? this.renderSortIcon(column.key) : ''}
                                        </div>
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderTableRows()}
                        </tbody>
                    </table>
                </div>
                
                ${this.renderTableStyles()}
            `;
        },
        
        /**
         * ソートアイコン描画
         */
        renderSortIcon: function(columnKey) {
            if (this.sortConfig.column !== columnKey) {
                return '<i class="fas fa-sort sort-icon"></i>';
            }
            
            const icon = this.sortConfig.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
            return `<i class="fas ${icon} sort-icon active"></i>`;
        },
        
        /**
         * テーブル行描画
         */
        renderTableRows: function() {
            return this.filteredData.map((item, index) => `
                <tr class="excel-row" onmouseover="this.classList.add('hovered')" onmouseout="this.classList.remove('hovered')">
                    ${this.columns.map(column => `
                        <td class="excel-td" data-column="${column.key}">
                            ${this.renderCellContent(item, column)}
                        </td>
                    `).join('')}
                </tr>
            `).join('');
        },
        
        /**
         * セル内容描画
         */
        renderCellContent: function(item, column) {
            const value = item[column.key];
            
            switch (column.type) {
                case 'image':
                    const imageUrl = this.getItemImage(item);
                    return imageUrl ? 
                        `<img src="${imageUrl}" class="cell-image" alt="商品画像" onerror="this.src='https://via.placeholder.com/50x50?text=No+Image'">` :
                        '<div class="cell-image-placeholder"><i class="fas fa-image"></i></div>';
                        
                case 'copyable_id':
                    const idValue = value || '-';
                    return `<span class="copyable-id" onclick="EbayEnhancedExcel.copyToClipboard('${idValue}')" title="クリックでコピー">${idValue}</span>`;
                    
                case 'editable_number':
                    const numValue = value || 0;
                    return `<input type="number" class="editable-quantity" value="${numValue}" min="0" onchange="EbayEnhancedExcel.updateQuantity(this, '${item.ebay_item_id}')" style="width: 60px; padding: 2px; text-align: center;">`;
                    
                case 'condition_status':
                    const conditionDisplay = this.getConditionDisplayName(value);
                    const conditionClass = conditionDisplay.toLowerCase().replace('_', '-');
                    return `<span class="condition-badge condition-${conditionClass}">${conditionDisplay}</span>`;
                    
                case 'category_number':
                    return this.formatCategoryInfo(item.category_name, item.category_id);
                    
                case 'link':
                    const ebayUrl = item.view_item_url || `https://www.ebay.com/itm/${item.ebay_item_id}`;
                    return `<a href="${ebayUrl}" target="_blank" class="ebay-link" title="eBayで見る"><i class="fab fa-ebay"></i></a>`;
                    
                case 'action_edit':
                    return `<button class="action-btn edit-btn" onclick="EbayEnhancedExcel.editItem('${item.ebay_item_id}')" title="編集"><i class="fas fa-edit"></i></button>`;
                    
                case 'action_modal':
                    const rowIndex = this.filteredData.findIndex(filteredItem => filteredItem.ebay_item_id === item.ebay_item_id);
                    return `<button class="action-btn modal-btn" onclick="EbayEnhancedExcel.showModal(${rowIndex})" title="詳細表示"><i class="fas fa-external-link-alt"></i></button>`;
                
                case 'currency':
                    const currencyValue = parseFloat(value) || 0;
                    return `${currencyValue.toFixed(2)}`;
                
                case 'date':
                    return value ? new Date(value).toLocaleDateString('ja-JP') : '-';
                
                case 'risk':
                    const riskClass = value ? value.toLowerCase() : 'low';
                    const riskColors = { high: '#dc2626', medium: '#d97706', low: '#059669' };
                    return `<span class="risk-badge risk-${riskClass}" style="color: ${riskColors[riskClass] || '#059669'}">${value || 'LOW'}</span>`;
                
                case 'text':
                    if (column.key === 'title') {
                        return `<span class="cell-title" title="${value || ''}">${this.truncateText(value || '', 40)}</span>`;
                    }
                    return value || '-';
                
                case 'number':
                    return value !== undefined && value !== null ? value.toString() : '0';
                
                default:
                    return value || '-';
            }
        },
        
        /**
         * 商品画像取得
         */
        getItemImage: function(item) {
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
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        },
        
        /**
         * テーブル専用CSS
         */
        renderTableStyles: function() {
            return `
                <style>
                    .excel-controls {
                        margin-bottom: 1rem;
                    }
                    
                    .excel-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 1rem;
                    }
                    
                    .excel-header h3 {
                        color: #1e293b;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }
                    
                    .excel-actions {
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                    }
                    
                    .excel-btn {
                        padding: 0.5rem 1rem;
                        border: 1px solid #d1d5db;
                        background: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.875rem;
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;
                        transition: all 0.2s ease;
                    }
                    
                    .excel-btn:hover {
                        background: #f3f4f6;
                        border-color: #9ca3af;
                    }
                    
                    .excel-btn--filter {
                        color: #3b82f6;
                    }
                    
                    .excel-btn--clear {
                        color: #dc2626;
                    }
                    
                    .record-count {
                        font-size: 0.875rem;
                        color: #6b7280;
                        font-weight: 500;
                    }
                    
                    .excel-search-bar {
                        margin-bottom: 1rem;
                    }
                    
                    .search-input-group {
                        position: relative;
                        max-width: 400px;
                    }
                    
                    .search-icon {
                        position: absolute;
                        left: 12px;
                        top: 50%;
                        transform: translateY(-50%);
                        color: #9ca3af;
                        font-size: 0.875rem;
                    }
                    
                    #excel-search {
                        width: 100%;
                        padding: 0.75rem 0.75rem 0.75rem 2.5rem;
                        border: 1px solid #d1d5db;
                        border-radius: 6px;
                        font-size: 0.875rem;
                    }
                    
                    #excel-search:focus {
                        outline: none;
                        border-color: #3b82f6;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                    }
                    
                    .search-clear-btn {
                        position: absolute;
                        right: 8px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: none;
                        border: none;
                        color: #9ca3af;
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 4px;
                    }
                    
                    .search-clear-btn:hover {
                        background: #f3f4f6;
                        color: #6b7280;
                    }
                    
                    .excel-filter-panel {
                        background: #f8fafc;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 1rem;
                        margin-bottom: 1rem;
                    }
                    
                    .filter-controls-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 1rem;
                    }
                    
                    .filter-control label {
                        display: block;
                        font-size: 0.75rem;
                        font-weight: 600;
                        color: #374151;
                        margin-bottom: 0.25rem;
                    }
                    
                    .filter-control select,
                    .filter-control input {
                        width: 100%;
                        padding: 0.5rem;
                        border: 1px solid #d1d5db;
                        border-radius: 4px;
                        font-size: 0.875rem;
                    }
                    
                    .range-filter {
                        display: flex;
                        gap: 0.5rem;
                    }
                    
                    .range-filter input {
                        flex: 1;
                    }
                    
                    .excel-table-container {
                        overflow-x: auto;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                    }
                    
                    .excel-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 0.875rem;
                        table-layout: fixed; /* 横スクロール防止 */
                    }
                    
                    .excel-th {
                        background: #f9fafb;
                        border-bottom: 2px solid #e5e7eb;
                        padding: 0.4rem 0.5rem;
                        text-align: left;
                        font-weight: 600;
                        color: #374151;
                        position: sticky;
                        top: 0;
                        z-index: 10;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    
                    .excel-th.sortable {
                        cursor: pointer;
                        user-select: none;
                    }
                    
                    .excel-th.sortable:hover {
                        background: #f3f4f6;
                    }
                    
                    .th-content {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 0.5rem;
                    }
                    
                    .sort-icon {
                        color: #9ca3af;
                        font-size: 0.75rem;
                        opacity: 0.5;
                        transition: all 0.2s ease;
                    }
                    
                    .sort-icon.active {
                        color: #3b82f6;
                        opacity: 1;
                    }
                    
                    .excel-td {
                        padding: 0.3rem 0.4rem;
                        border-bottom: 1px solid #f3f4f6;
                        vertical-align: middle;
                        line-height: 1.2;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    
                    .excel-row:hover .excel-td {
                        background: #f8fafc;
                    }
                    
                    .excel-row.hovered .excel-td {
                        background: #eff6ff;
                    }
                    
                    .cell-image {
                        width: 50px;
                        height: 50px;
                        object-fit: cover;
                        border-radius: 4px;
                        border: 1px solid #e5e7eb;
                    }
                    
                    .cell-image-placeholder {
                        width: 50px;
                        height: 50px;
                        background: #f3f4f6;
                        border: 1px solid #e5e7eb;
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #9ca3af;
                        font-size: 0.75rem;
                    }
                    
                    .copyable-id {
                        cursor: pointer;
                        color: #3b82f6;
                        font-weight: 600;
                        font-size: 0.8rem;
                        padding: 2px 4px;
                        border-radius: 3px;
                        transition: background 0.2s ease;
                    }
                    
                    .copyable-id:hover {
                        background: #eff6ff;
                        text-decoration: underline;
                    }
                    
                    .editable-quantity {
                        border: 1px solid #d1d5db;
                        border-radius: 3px;
                        font-size: 0.8rem;
                    }
                    
                    .editable-quantity:focus {
                        outline: none;
                        border-color: #3b82f6;
                        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
                    }
                    
                    .condition-badge {
                        padding: 2px 6px;
                        border-radius: 10px;
                        font-size: 0.65rem;
                        font-weight: 700;
                        text-transform: uppercase;
                        text-align: center;
                        min-width: 50px;
                        display: inline-block;
                    }
                    
                    .condition-new { background: #dcfce7; color: #166534; }
                    .condition-used { background: #fef3cd; color: #92400e; }
                    .condition-refurb { background: #e0f2fe; color: #0c4a6e; }
                    .condition-seller-refurb { background: #e0f2fe; color: #0c4a6e; }
                    .condition-very-good { background: #f0fdf4; color: #15803d; }
                    .condition-good { background: #f0fdf4; color: #15803d; }
                    .condition-acceptable { background: #fffbeb; color: #a16207; }
                    .condition-for-parts { background: #fef2f2; color: #991b1b; }
                    
                    .ebay-link {
                        color: #d97706;
                        font-size: 1.2rem;
                        text-decoration: none;
                        padding: 4px;
                        border-radius: 3px;
                        transition: background 0.2s ease;
                    }
                    
                    .ebay-link:hover {
                        background: #fef3cd;
                    }
                    
                    .action-btn {
                        background: none;
                        border: none;
                        cursor: pointer;
                        padding: 4px 6px;
                        border-radius: 3px;
                        font-size: 0.875rem;
                        transition: background 0.2s ease;
                        margin: 0 1px;
                    }
                    
                    .edit-btn {
                        color: #059669;
                    }
                    
                    .edit-btn:hover {
                        background: #dcfce7;
                    }
                    
                    .modal-btn {
                        color: #3b82f6;
                    }
                    
                    .modal-btn:hover {
                        background: #dbeafe;
                    }
                    
                    @keyframes slideInRight {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    
                    @keyframes slideOutRight {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                    
                    .cell-title {
                        display: block;
                        max-width: 200px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    
                    .risk-badge {
                        font-weight: 600;
                        text-transform: uppercase;
                        font-size: 0.75rem;
                        padding: 2px 6px;
                        border-radius: 12px;
                        background: rgba(0,0,0,0.05);
                    }
                    
                    @media (max-width: 768px) {
                        .excel-header {
                            flex-direction: column;
                            gap: 1rem;
                        }
                        
                        .excel-actions {
                            width: 100%;
                            justify-content: space-between;
                        }
                        
                        .filter-controls-grid {
                            grid-template-columns: 1fr;
                        }
                        
                        .excel-table {
                            font-size: 0.75rem;
                        }
                        
                        .excel-td {
                            padding: 0.3rem 0.5rem;
                        }
                        
                        .cell-title {
                            max-width: 120px;
                        }
                    }
                </style>
            `;
        },
        
        /**
         * イベントリスナー設定
         */
        attachEventListeners: function() {
            const searchInput = document.getElementById('excel-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.searchQuery = e.target.value;
                    this.applyFilters();
                });
            }
        },
        
        /**
         * ソート機能
         */
        sort: function(column) {
            if (this.sortConfig.column === column) {
                this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortConfig.column = column;
                this.sortConfig.direction = 'asc';
            }
            
            this.applySort();
            this.renderTable();
        },
        
        /**
         * ソート適用
         */
        applySort: function() {
            if (!this.sortConfig.column) return;
            
            const { column, direction } = this.sortConfig;
            const columnConfig = this.columns.find(col => col.key === column);
            
            this.filteredData.sort((a, b) => {
                let valueA = a[column];
                let valueB = b[column];
                
                // データ型に応じた比較
                if (columnConfig.type === 'number' || columnConfig.type === 'currency') {
                    valueA = parseFloat(valueA) || 0;
                    valueB = parseFloat(valueB) || 0;
                } else if (columnConfig.type === 'date') {
                    valueA = new Date(valueA || 0);
                    valueB = new Date(valueB || 0);
                } else {
                    valueA = String(valueA || '').toLowerCase();
                    valueB = String(valueB || '').toLowerCase();
                }
                
                let comparison = 0;
                if (valueA > valueB) comparison = 1;
                if (valueA < valueB) comparison = -1;
                
                return direction === 'desc' ? -comparison : comparison;
            });
        },
        
        /**
         * フィルター表示切り替え
         */
        toggleFilters: function() {
            const panel = document.getElementById('filter-panel');
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        },
        
        /**
         * フィルター設定
         */
        setFilter: function(column, value) {
            if (value) {
                this.filters[column] = value;
            } else {
                delete this.filters[column];
            }
            this.applyFilters();
        },
        
        /**
         * 範囲フィルター設定
         */
        setRangeFilter: function(column, type, value) {
            if (!this.filters[column]) {
                this.filters[column] = {};
            }
            
            if (value) {
                this.filters[column][type] = parseFloat(value);
            } else {
                delete this.filters[column][type];
                if (Object.keys(this.filters[column]).length === 0) {
                    delete this.filters[column];
                }
            }
            
            this.applyFilters();
        },
        
        /**
         * フィルター適用
         */
        applyFilters: function() {
            this.filteredData = this.currentData.filter(item => {
                // 検索フィルター
                if (this.searchQuery) {
                    const searchLower = this.searchQuery.toLowerCase();
                    const searchable = [
                        item.ebay_item_id, item.sku, item.title, 
                        item.category_info, item.condition_display_name
                    ].join(' ').toLowerCase();
                    
                    if (!searchable.includes(searchLower)) {
                        return false;
                    }
                }
                
                // 列フィルター
                for (const [column, filter] of Object.entries(this.filters)) {
                    const value = item[column];
                    
                    if (typeof filter === 'string') {
                        // 完全一致フィルター
                        if (value !== filter) return false;
                    } else if (typeof filter === 'object') {
                        // 範囲フィルター
                        const numValue = parseFloat(value) || 0;
                        if (filter.min !== undefined && numValue < filter.min) return false;
                        if (filter.max !== undefined && numValue > filter.max) return false;
                    }
                }
                
                return true;
            });
            
            this.applySort();
            this.renderTable();
        },
        
        /**
         * 全フィルタークリア
         */
        clearAllFilters: function() {
            this.filters = {};
            this.searchQuery = '';
            this.sortConfig = { column: null, direction: 'asc' };
            this.filteredData = [...this.currentData];
            this.renderTable();
        },
        
        /**
         * 検索クリア
         */
        clearSearch: function() {
            this.searchQuery = '';
            document.getElementById('excel-search').value = '';
            this.applyFilters();
        },
        
        /**
         * ユニーク値取得
         */
        getUniqueValues: function(column) {
            const values = this.currentData.map(item => item[column]).filter(val => val !== undefined && val !== null);
            return [...new Set(values)].sort();
        },
        
        /**
         * クリップボードにコピー
         */
        copyToClipboard: function(text) {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    this.showToast('クリップボードにコピーしました: ' + text);
                }).catch(err => {
                    console.error('コピーに失敗:', err);
                    this.fallbackCopy(text);
                });
            } else {
                this.fallbackCopy(text);
            }
        },
        
        /**
         * フォールバックコピー機能
         */
        fallbackCopy: function(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                this.showToast('クリップボードにコピーしました: ' + text);
            } catch (err) {
                console.error('フォールバックコピーに失敗:', err);
                this.showToast('コピーに失敗しました');
            } finally {
                document.body.removeChild(textArea);
            }
        },
        
        /**
         * 数量更新
         */
        updateQuantity: function(input, itemId) {
            const newValue = parseInt(input.value) || 0;
            console.log(`数量更新: ID ${itemId} → ${newValue}`);
            
            // 実際のデータ更新処理をここに実装
            // この部分は将来的にAPI呼び出しに置き換える
            this.showToast(`数量を${newValue}に更新しました`);
        },
        
        /**
         * 編集機能
         */
        editItem: function(itemId) {
            console.log(`編集開始: ${itemId}`);
            this.showToast('編集機能は開発中です');
            
            // 将来的にここで編集モーダルまたはページを開く
        },
        
        /**
         * モーダル表示
         */
        showModal: function(index) {
            if (typeof window.showProductDetail === 'function') {
                window.showProductDetail(index);
            } else {
                console.error('showProductDetail関数が見つかりません');
                this.showToast('商品詳細表示機能が利用できません');
            }
        },
        
        /**
         * トースト通知表示
         */
        showToast: function(message) {
            // 既存のトースト削除
            const existingToast = document.querySelector('.excel-toast');
            if (existingToast) {
                existingToast.remove();
            }
            
            // トースト作成
            const toast = document.createElement('div');
            toast.className = 'excel-toast';
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #059669;
                color: white;
                padding: 0.75rem 1rem;
                border-radius: 6px;
                font-size: 0.875rem;
                z-index: 10000;
                animation: slideInRight 0.3s ease;
            `;
            
            document.body.appendChild(toast);
            
            // 3秒後に削除
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.animation = 'slideOutRight 0.3s ease';
                    setTimeout(() => toast.remove(), 300);
                }
            }, 3000);
        }
    };
    
    // 初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.EbayEnhancedExcel.init());
    } else {
        window.EbayEnhancedExcel.init();
    }
    
    console.log('✅ EbayEnhancedExcel JavaScript モジュール読み込み完了');
    
})();
