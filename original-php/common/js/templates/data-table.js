/**
 * N3 データテーブルテンプレート JavaScript
 * データ表示・操作の標準実装
 */

(function(window) {
    'use strict';
    
    /**
     * N3 データテーブルテンプレート
     */
    const N3DataTable = {
        /**
         * データテーブル初期化
         */
        init: function(options = {}) {
            const defaultOptions = {
                containerId: 'data-table',
                dataSource: null,
                columns: [],
                pagination: true,
                pageSize: 20,
                sortable: true,
                searchable: true,
                selectable: false,
                exportable: true,
                refreshable: true,
                onInit: null,
                onDataLoaded: null,
                onRowClick: null,
                onSelectionChange: null
            };
            
            const config = { ...defaultOptions, ...options };
            
            console.log('📊 N3データテーブルテンプレート初期化', config);
            
            // 必須パラメータチェック
            if (!config.containerId || !config.columns || config.columns.length === 0) {
                console.error('❌ containerId と columns は必須です');
                return false;
            }
            
            // コンテナ確認
            const container = document.getElementById(config.containerId);
            if (!container) {
                console.error('❌ コンテナが見つかりません:', config.containerId);
                return false;
            }
            
            // 設定保存
            this.config = config;
            this.container = container;
            this.data = [];
            this.filteredData = [];
            this.currentPage = 1;
            this.selectedRows = [];
            
            // UI構築
            this.buildTableUI();
            
            // データ読み込み
            if (config.dataSource) {
                this.loadData();
            }
            
            // カスタム初期化
            if (config.onInit && typeof config.onInit === 'function') {
                config.onInit(this);
            }
            
            return this;
        },
        
        /**
         * テーブルUI構築
         */
        buildTableUI: function() {
            const { config } = this;
            
            let html = '<div class="n3-datatable">';
            
            // ツールバー
            html += this.buildToolbar();
            
            // テーブル本体
            html += '<div class="n3-datatable__table-container">';
            html += '<table class="n3-table n3-datatable__table" id="' + config.containerId + '-table">';
            html += this.buildTableHeader();
            html += '<tbody id="' + config.containerId + '-tbody">';
            html += '<tr><td colspan="' + (config.columns.length + (config.selectable ? 1 : 0)) + '" style="text-align: center; padding: 2rem;">データを読み込み中...</td></tr>';
            html += '</tbody>';
            html += '</table>';
            html += '</div>';
            
            // ページネーション
            if (config.pagination) {
                html += this.buildPagination();
            }
            
            html += '</div>';
            
            this.container.innerHTML = html;
            
            // イベントリスナー設定
            this.setupEventListeners();
        },
        
        /**
         * ツールバー構築
         */
        buildToolbar: function() {
            const { config } = this;
            
            let html = '<div class="n3-datatable__toolbar">';
            
            // 左側: 情報表示
            html += '<div class="n3-datatable__info">';
            html += '<span id="' + config.containerId + '-info">データ件数: 0</span>';
            html += '</div>';
            
            // 右側: 操作ボタン
            html += '<div class="n3-datatable__actions">';
            
            // 検索
            if (config.searchable) {
                html += '<input type="text" class="n3-form-control" placeholder="検索..." id="' + config.containerId + '-search" style="width: 200px; margin-right: 0.5rem;">';
            }
            
            // 更新ボタン
            if (config.refreshable) {
                html += '<button class="n3-btn n3-btn--secondary" id="' + config.containerId + '-refresh" title="データ更新">';
                html += '<i class="fas fa-sync-alt"></i>';
                html += '</button>';
            }
            
            // エクスポートボタン
            if (config.exportable) {
                html += '<div class="dropdown" style="display: inline-block; margin-left: 0.5rem;">';
                html += '<button class="n3-btn n3-btn--secondary dropdown-toggle" id="' + config.containerId + '-export">';
                html += '<i class="fas fa-download"></i> エクスポート';
                html += '</button>';
                html += '<div class="dropdown-menu">';
                html += '<a class="dropdown-item" data-export="csv">CSV形式</a>';
                html += '<a class="dropdown-item" data-export="json">JSON形式</a>';
                html += '</div>';
                html += '</div>';
            }
            
            html += '</div>';
            html += '</div>';
            
            return html;
        },
        
        /**
         * テーブルヘッダー構築
         */
        buildTableHeader: function() {
            const { config } = this;
            
            let html = '<thead><tr>';
            
            // 選択チェックボックス
            if (config.selectable) {
                html += '<th style="width: 50px;">';
                html += '<input type="checkbox" id="' + config.containerId + '-select-all">';
                html += '</th>';
            }
            
            // カラムヘッダー
            config.columns.forEach(column => {
                const sortable = config.sortable && column.sortable !== false;
                const sortClass = sortable ? ' class="n3-sortable"' : '';
                const sortIcon = sortable ? ' <i class="fas fa-sort"></i>' : '';
                const width = column.width ? ` style="width: ${column.width}"` : '';
                
                html += `<th${sortClass} data-key="${column.key}"${width}>`;
                html += column.label + sortIcon;
                html += '</th>';
            });
            
            html += '</tr></thead>';
            
            return html;
        },
        
        /**
         * ページネーション構築
         */
        buildPagination: function() {
            const containerId = this.config.containerId;
            
            let html = '<div class="n3-datatable__pagination" id="' + containerId + '-pagination">';
            html += '<div class="n3-pagination">';
            
            html += '<button class="n3-btn n3-btn--secondary" id="' + containerId + '-prev" disabled>';
            html += '<i class="fas fa-chevron-left"></i> 前へ';
            html += '</button>';
            
            html += '<span class="n3-pagination__info" id="' + containerId + '-page-info">1 / 1</span>';
            
            html += '<button class="n3-btn n3-btn--secondary" id="' + containerId + '-next" disabled>';
            html += '次へ <i class="fas fa-chevron-right"></i>';
            html += '</button>';
            
            html += '</div>';
            html += '</div>';
            
            return html;
        },
        
        /**
         * イベントリスナー設定
         */
        setupEventListeners: function() {
            const { config } = this;
            const containerId = config.containerId;
            
            // 検索
            if (config.searchable) {
                const searchInput = document.getElementById(containerId + '-search');
                if (searchInput) {
                    const searchFunction = N3Utils.debounce((query) => {
                        this.search(query);
                    }, 300);
                    
                    searchInput.addEventListener('input', (e) => {
                        searchFunction(e.target.value);
                    });
                }
            }
            
            // 更新ボタン
            if (config.refreshable) {
                const refreshBtn = document.getElementById(containerId + '-refresh');
                if (refreshBtn) {
                    refreshBtn.addEventListener('click', () => {
                        this.refresh();
                    });
                }
            }
            
            // エクスポート
            if (config.exportable) {
                const exportItems = document.querySelectorAll(`#${containerId}-export + .dropdown-menu .dropdown-item`);
                exportItems.forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        const format = item.dataset.export;
                        this.export(format);
                    });
                });
            }
            
            // 全選択
            if (config.selectable) {
                const selectAllCheckbox = document.getElementById(containerId + '-select-all');
                if (selectAllCheckbox) {
                    selectAllCheckbox.addEventListener('change', (e) => {
                        this.selectAll(e.target.checked);
                    });
                }
            }
            
            // ソート
            if (config.sortable) {
                document.addEventListener('click', (e) => {
                    if (e.target.closest('.n3-sortable')) {
                        const header = e.target.closest('.n3-sortable');
                        const key = header.dataset.key;
                        this.sort(key);
                    }
                });
            }
            
            // ページネーション
            if (config.pagination) {
                const prevBtn = document.getElementById(containerId + '-prev');
                const nextBtn = document.getElementById(containerId + '-next');
                
                if (prevBtn) {
                    prevBtn.addEventListener('click', () => {
                        this.previousPage();
                    });
                }
                
                if (nextBtn) {
                    nextBtn.addEventListener('click', () => {
                        this.nextPage();
                    });
                }
            }
            
            // 行クリック
            document.addEventListener('click', (e) => {
                const row = e.target.closest(`#${containerId}-table tbody tr`);
                if (row && config.onRowClick) {
                    const index = Array.from(row.parentNode.children).indexOf(row);
                    const data = this.getCurrentPageData()[index];
                    config.onRowClick(data, index, row);
                }
            });
        },
        
        /**
         * データ読み込み
         */
        async loadData() {
            const { config } = this;
            
            try {
                this.showLoading();
                
                let data;
                
                if (typeof config.dataSource === 'string') {
                    // URL からデータ取得
                    const result = await N3API.fetchData(config.dataSource);
                    data = result.data || result;
                } else if (typeof config.dataSource === 'function') {
                    // 関数からデータ取得
                    data = await config.dataSource();
                } else if (Array.isArray(config.dataSource)) {
                    // 直接データ指定
                    data = config.dataSource;
                } else {
                    throw new Error('Invalid dataSource configuration');
                }
                
                this.setData(data);
                
                if (config.onDataLoaded && typeof config.onDataLoaded === 'function') {
                    config.onDataLoaded(data);
                }
                
            } catch (error) {
                console.error('データ読み込みエラー:', error);
                this.showError('データの読み込みに失敗しました: ' + error.message);
            }
        },
        
        /**
         * データ設定
         */
        setData: function(data) {
            if (!Array.isArray(data)) {
                console.error('データは配列である必要があります');
                return;
            }
            
            this.data = data;
            this.filteredData = [...data];
            this.currentPage = 1;
            this.selectedRows = [];
            
            this.updateDisplay();
            this.updateInfo();
            this.updatePagination();
        },
        
        /**
         * 表示更新
         */
        updateDisplay: function() {
            const tbody = document.getElementById(this.config.containerId + '-tbody');
            if (!tbody) return;
            
            const pageData = this.getCurrentPageData();
            
            if (pageData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${this.getColumnCount()}" style="text-align: center; padding: 2rem;">データがありません</td></tr>`;
                return;
            }
            
            const rows = pageData.map((item, index) => this.renderRow(item, index)).join('');
            tbody.innerHTML = rows;
            
            // 選択状態復元
            this.updateSelectionUI();
        },
        
        /**
         * 行レンダリング
         */
        renderRow: function(item, index) {
            const { config } = this;
            const globalIndex = (this.currentPage - 1) * config.pageSize + index;
            
            let html = `<tr data-index="${globalIndex}">`;
            
            // 選択チェックボックス
            if (config.selectable) {
                const checked = this.selectedRows.includes(globalIndex) ? ' checked' : '';
                html += `<td><input type="checkbox" class="row-select" data-index="${globalIndex}"${checked}></td>`;
            }
            
            // データセル
            config.columns.forEach(column => {
                let value = this.getNestedValue(item, column.key);
                
                // フォーマッター適用
                if (column.formatter && typeof column.formatter === 'function') {
                    value = column.formatter(value, item, globalIndex);
                }
                
                html += `<td>${value}</td>`;
            });
            
            html += '</tr>';
            
            return html;
        },
        
        /**
         * ネストした値取得
         */
        getNestedValue: function(obj, path) {
            return path.split('.').reduce((o, p) => o && o[p], obj) || '';
        },
        
        /**
         * 現在ページのデータ取得
         */
        getCurrentPageData: function() {
            if (!this.config.pagination) {
                return this.filteredData;
            }
            
            const start = (this.currentPage - 1) * this.config.pageSize;
            const end = start + this.config.pageSize;
            
            return this.filteredData.slice(start, end);
        },
        
        /**
         * カラム数取得
         */
        getColumnCount: function() {
            return this.config.columns.length + (this.config.selectable ? 1 : 0);
        },
        
        /**
         * 検索
         */
        search: function(query) {
            if (!query || query.trim() === '') {
                this.filteredData = [...this.data];
            } else {
                const queryLower = query.toLowerCase();
                this.filteredData = this.data.filter(item => {
                    return this.config.columns.some(column => {
                        const value = this.getNestedValue(item, column.key);
                        return String(value).toLowerCase().includes(queryLower);
                    });
                });
            }
            
            this.currentPage = 1;
            this.updateDisplay();
            this.updateInfo();
            this.updatePagination();
        },
        
        /**
         * ソート
         */
        sort: function(key) {
            // ソート状態管理
            if (!this.sortState) {
                this.sortState = { key: null, direction: 'asc' };
            }
            
            if (this.sortState.key === key) {
                this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortState.key = key;
                this.sortState.direction = 'asc';
            }
            
            // データソート
            this.filteredData.sort((a, b) => {
                const aVal = this.getNestedValue(a, key);
                const bVal = this.getNestedValue(b, key);
                
                let result = 0;
                
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    result = aVal - bVal;
                } else {
                    const aStr = String(aVal).toLowerCase();
                    const bStr = String(bVal).toLowerCase();
                    result = aStr.localeCompare(bStr);
                }
                
                return this.sortState.direction === 'desc' ? -result : result;
            });
            
            // ソートアイコン更新
            this.updateSortIcons(key, this.sortState.direction);
            
            this.currentPage = 1;
            this.updateDisplay();
            this.updatePagination();
        },
        
        /**
         * ソートアイコン更新
         */
        updateSortIcons: function(activeKey, direction) {
            const headers = document.querySelectorAll(`#${this.config.containerId}-table .n3-sortable`);
            
            headers.forEach(header => {
                const icon = header.querySelector('i');
                if (!icon) return;
                
                if (header.dataset.key === activeKey) {
                    icon.className = `fas fa-sort-${direction === 'asc' ? 'up' : 'down'}`;
                } else {
                    icon.className = 'fas fa-sort';
                }
            });
        },
        
        /**
         * 全選択
         */
        selectAll: function(checked) {
            const currentPageData = this.getCurrentPageData();
            const startIndex = (this.currentPage - 1) * this.config.pageSize;
            
            currentPageData.forEach((_, index) => {
                const globalIndex = startIndex + index;
                
                if (checked) {
                    if (!this.selectedRows.includes(globalIndex)) {
                        this.selectedRows.push(globalIndex);
                    }
                } else {
                    const selectedIndex = this.selectedRows.indexOf(globalIndex);
                    if (selectedIndex > -1) {
                        this.selectedRows.splice(selectedIndex, 1);
                    }
                }
            });
            
            this.updateSelectionUI();
            this.triggerSelectionChange();
        },
        
        /**
         * 行選択
         */
        selectRow: function(index, checked) {
            if (checked) {
                if (!this.selectedRows.includes(index)) {
                    this.selectedRows.push(index);
                }
            } else {
                const selectedIndex = this.selectedRows.indexOf(index);
                if (selectedIndex > -1) {
                    this.selectedRows.splice(selectedIndex, 1);
                }
            }
            
            this.updateSelectionUI();
            this.triggerSelectionChange();
        },
        
        /**
         * 選択UI更新
         */
        updateSelectionUI: function() {
            const checkboxes = document.querySelectorAll(`#${this.config.containerId}-table .row-select`);
            const selectAllCheckbox = document.getElementById(this.config.containerId + '-select-all');
            
            checkboxes.forEach(checkbox => {
                const index = parseInt(checkbox.dataset.index);
                checkbox.checked = this.selectedRows.includes(index);
            });
            
            if (selectAllCheckbox) {
                const currentPageData = this.getCurrentPageData();
                const startIndex = (this.currentPage - 1) * this.config.pageSize;
                const allSelected = currentPageData.every((_, index) => {
                    return this.selectedRows.includes(startIndex + index);
                });
                
                selectAllCheckbox.checked = currentPageData.length > 0 && allSelected;
            }
        },
        
        /**
         * 選択変更イベント発火
         */
        triggerSelectionChange: function() {
            if (this.config.onSelectionChange && typeof this.config.onSelectionChange === 'function') {
                const selectedData = this.selectedRows.map(index => this.data[index]).filter(Boolean);
                this.config.onSelectionChange(selectedData, this.selectedRows);
            }
        },
        
        /**
         * ページネーション - 前のページ
         */
        previousPage: function() {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.updateDisplay();
                this.updatePagination();
            }
        },
        
        /**
         * ページネーション - 次のページ
         */
        nextPage: function() {
            const totalPages = this.getTotalPages();
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.updateDisplay();
                this.updatePagination();
            }
        },
        
        /**
         * 総ページ数取得
         */
        getTotalPages: function() {
            if (!this.config.pagination) return 1;
            return Math.ceil(this.filteredData.length / this.config.pageSize);
        },
        
        /**
         * ページネーション更新
         */
        updatePagination: function() {
            if (!this.config.pagination) return;
            
            const totalPages = this.getTotalPages();
            const prevBtn = document.getElementById(this.config.containerId + '-prev');
            const nextBtn = document.getElementById(this.config.containerId + '-next');
            const pageInfo = document.getElementById(this.config.containerId + '-page-info');
            
            if (prevBtn) {
                prevBtn.disabled = this.currentPage <= 1;
            }
            
            if (nextBtn) {
                nextBtn.disabled = this.currentPage >= totalPages;
            }
            
            if (pageInfo) {
                pageInfo.textContent = `${this.currentPage} / ${totalPages}`;
            }
        },
        
        /**
         * 情報表示更新
         */
        updateInfo: function() {
            const infoElement = document.getElementById(this.config.containerId + '-info');
            if (infoElement) {
                const total = this.data.length;
                const filtered = this.filteredData.length;
                const selected = this.selectedRows.length;
                
                let text = `データ件数: ${filtered.toLocaleString()}`;
                if (filtered !== total) {
                    text += ` (全${total.toLocaleString()}件中)`;
                }
                if (selected > 0) {
                    text += ` | 選択: ${selected}件`;
                }
                
                infoElement.textContent = text;
            }
        },
        
        /**
         * 更新
         */
        refresh: function() {
            if (this.config.dataSource) {
                this.loadData();
            } else {
                N3Utils.showWarning('データソースが設定されていません');
            }
        },
        
        /**
         * エクスポート
         */
        export: function(format) {
            const data = this.filteredData;
            const columns = this.config.columns;
            const filename = 'export_' + new Date().toISOString().slice(0, 10);
            
            switch (format) {
                case 'csv':
                    this.exportToCSV(data, columns, filename);
                    break;
                case 'json':
                    this.exportToJSON(data, filename);
                    break;
                default:
                    N3Utils.showError('サポートされていないエクスポート形式です');
            }
        },
        
        /**
         * CSV エクスポート
         */
        exportToCSV: function(data, columns, filename) {
            // ヘッダー行
            const headers = columns.map(col => col.label).join(',');
            
            // データ行
            const rows = data.map(item => {
                return columns.map(col => {
                    let value = this.getNestedValue(item, col.key);
                    
                    // CSV用にエスケープ
                    value = String(value).replace(/"/g, '""');
                    return `"${value}"`;
                }).join(',');
            });
            
            const csvContent = [headers, ...rows].join('\n');
            
            this.downloadFile(csvContent, filename + '.csv', 'text/csv');
        },
        
        /**
         * JSON エクスポート
         */
        exportToJSON: function(data, filename) {
            const jsonContent = JSON.stringify(data, null, 2);
            this.downloadFile(jsonContent, filename + '.json', 'application/json');
        },
        
        /**
         * ファイルダウンロード
         */
        downloadFile: function(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            N3Utils.showSuccess(`${filename} をダウンロードしました`);
        },
        
        /**
         * ローディング表示
         */
        showLoading: function() {
            const tbody = document.getElementById(this.config.containerId + '-tbody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="${this.getColumnCount()}" style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> データを読み込み中...</td></tr>`;
            }
        },
        
        /**
         * エラー表示
         */
        showError: function(message) {
            const tbody = document.getElementById(this.config.containerId + '-tbody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="${this.getColumnCount()}" style="text-align: center; padding: 2rem; color: var(--color-danger, #dc3545);"><i class="fas fa-exclamation-triangle"></i> ${message}</td></tr>`;
            }
            
            N3Utils.showError(message);
        },
        
        /**
         * 選択されたデータ取得
         */
        getSelectedData: function() {
            return this.selectedRows.map(index => this.data[index]).filter(Boolean);
        },
        
        /**
         * 選択クリア
         */
        clearSelection: function() {
            this.selectedRows = [];
            this.updateSelectionUI();
            this.updateInfo();
            this.triggerSelectionChange();
        },
        
        /**
         * データ取得
         */
        getData: function() {
            return this.data;
        },
        
        /**
         * フィルターされたデータ取得
         */
        getFilteredData: function() {
            return this.filteredData;
        }
    };
    
    // グローバル露出
    window.N3DataTable = N3DataTable;
    
    console.log('✅ N3DataTable Template loaded');
    
})(window);
