/**
 * 商品編集システム JavaScript
 * Yahoo Auction統合システム - 07_editing モジュール
 */

class ProductEditor {
    constructor() {
        this.selectedProducts = new Set();
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalPages = 1;
        this.currentFilters = {};
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateStatus('システム準備完了 - データ読み込みボタンをクリックしてください');
    }
    
    bindEvents() {
        // データ読み込み
        document.getElementById('loadData')?.addEventListener('click', () => this.loadData());
        document.getElementById('loadUnlisted')?.addEventListener('click', () => this.loadData({ unlisted_only: true }));
        document.getElementById('refreshData')?.addEventListener('click', () => this.refreshData());
        
        // 検索
        document.getElementById('searchBtn')?.addEventListener('click', () => this.performSearch());
        document.getElementById('clearSearch')?.addEventListener('click', () => this.clearSearch());
        document.getElementById('searchKeyword')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
        
        // 出力
        document.getElementById('exportCSV')?.addEventListener('click', () => this.exportCSV());
        document.getElementById('exportFiltered')?.addEventListener('click', () => this.exportFiltered());
        
        // 削除・管理
        document.getElementById('cleanupDummy')?.addEventListener('click', () => this.cleanupDummyData());
        document.getElementById('deleteSelected')?.addEventListener('click', () => this.deleteSelected());
        
        // 選択
        document.getElementById('selectAll')?.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        document.getElementById('clearSelection')?.addEventListener('click', () => this.clearSelection());
        
        // 一括操作
        document.getElementById('bulkEdit')?.addEventListener('click', () => this.bulkEdit());
        document.getElementById('bulkDelete')?.addEventListener('click', () => this.deleteSelected());
        
        // ページネーション
        document.getElementById('prevPage')?.addEventListener('click', () => this.previousPage());
        document.getElementById('nextPage')?.addEventListener('click', () => this.nextPage());
        
        // 編集モーダル
        document.getElementById('saveEdit')?.addEventListener('click', () => this.saveEdit());
        document.querySelectorAll('.modal-close')?.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
    }
    
    async loadData(filters = {}) {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.currentFilters = { ...this.currentFilters, ...filters };
            
            this.showLoading('データ読み込み中...');
            this.updateStatus('商品データを読み込み中...', 'info');
            
            const params = {
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.currentFilters
            };
            
            const response = await ApiClient.get('api/data.php', params);
            
            if (response.success) {
                this.renderTable(response.data);
                this.updatePagination(response.pagination);
                this.updateStatus(`${response.pagination.total}件のデータを読み込みました`, 'success');
                CommonUtils.showNotification('データ読み込み完了', 'success', 3000);
            } else {
                throw new Error(response.message || 'データ読み込み失敗');
            }
            
        } catch (error) {
            console.error('Data load error:', error);
            this.showError('データ読み込みエラー: ' + error.message);
            this.updateStatus('データ読み込み失敗', 'error');
        } finally {
            this.isLoading = false;
        }
    }
    
    renderTable(products) {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;
        
        if (!products || products.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="11" class="loading-cell">
                        <i class="fas fa-inbox"></i><br>
                        表示できるデータがありません
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = products.map(product => this.renderProductRow(product)).join('');
        
        // 行クリックイベント
        tbody.querySelectorAll('tr').forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox) {
                row.addEventListener('click', (e) => {
                    if (e.target.type !== 'checkbox' && !e.target.classList.contains('btn')) {
                        checkbox.checked = !checkbox.checked;
                        this.updateSelection();
                    }
                });
                
                checkbox.addEventListener('change', () => this.updateSelection());
            }
        });
    }
    
    renderProductRow(product) {
        return `
            <tr data-product-id="${product.id}">
                <td class="select-col">
                    <input type="checkbox" value="${product.id}">
                </td>
                <td class="image-col">
                    <img src="${product.image_url}" alt="商品画像" class="product-image" 
                         onerror="this.src='https://placehold.co/60x60/725CAD/FFFFFF/png?text=No+Image'">
                </td>
                <td class="id-col" title="${product.item_id}">
                    ${CommonUtils.truncateText(product.item_id, 15)}
                </td>
                <td class="title-col" title="${product.title}">
                    ${CommonUtils.truncateText(product.title, 40)}
                </td>
                <td class="price-col">
                    <div class="price-display">
                        <div class="price-primary">¥${CommonUtils.formatNumber(product.price.jpy)}</div>
                        <div class="price-secondary">$${product.price.usd}</div>
                    </div>
                </td>
                <td class="category-col">
                    <span class="badge badge-category">${CommonUtils.truncateText(product.category, 12)}</span>
                </td>
                <td class="condition-col" title="${product.condition}">
                    ${CommonUtils.truncateText(product.condition, 10)}
                </td>
                <td class="platform-col">
                    <span class="badge badge-platform">${product.platform}</span>
                </td>
                <td class="status-col">
                    <span class="badge ${product.listing_status === 'listed' ? 'badge-status-listed' : 'badge-status-unlisted'}">
                        ${product.listing_status === 'listed' ? '出品済' : '未出品'}
                    </span>
                </td>
                <td class="date-col" title="${product.updated_at}">
                    ${CommonUtils.formatDate(product.updated_at, 'MM-DD HH:mm')}
                </td>
                <td class="action-col">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info" onclick="productEditor.editProduct('${product.item_id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="productEditor.deleteProduct('${product.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    updateSelection() {
        const checkboxes = document.querySelectorAll('#tableBody input[type="checkbox"]');
        const checkedBoxes = document.querySelectorAll('#tableBody input[type="checkbox"]:checked');
        
        this.selectedProducts.clear();
        checkedBoxes.forEach(cb => this.selectedProducts.add(cb.value));
        
        // 全選択チェックボックスの状態更新
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
            selectAll.checked = checkedBoxes.length === checkboxes.length && checkboxes.length > 0;
        }
        
        // 一括操作パネルの表示/非表示
        const bulkPanel = document.getElementById('bulkPanel');
        const selectedCount = document.getElementById('selectedCount');
        
        if (this.selectedProducts.size > 0) {
            bulkPanel.style.display = 'flex';
            selectedCount.textContent = this.selectedProducts.size;
        } else {
            bulkPanel.style.display = 'none';
        }
    }
    
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('#tableBody input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = checked);
        this.updateSelection();
    }
    
    clearSelection() {
        this.selectedProducts.clear();
        document.querySelectorAll('#tableBody input[type="checkbox"]:checked').forEach(cb => cb.checked = false);
        document.getElementById('selectAll').checked = false;
        document.getElementById('bulkPanel').style.display = 'none';
    }
    
    async performSearch() {
        const keyword = document.getElementById('searchKeyword')?.value.trim();
        
        this.currentPage = 1;
        this.currentFilters = {};
        
        if (keyword) {
            this.currentFilters.keyword = keyword;
        }
        
        await this.loadData();
    }
    
    clearSearch() {
        document.getElementById('searchKeyword').value = '';
        this.currentFilters = {};
        this.currentPage = 1;
        this.loadData();
    }
    
    async refreshData() {
        await this.loadData();
    }
    
    updatePagination(pagination) {
        this.totalPages = pagination.total_pages;
        this.currentPage = pagination.page;
        
        const paginationEl = document.getElementById('pagination');
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (paginationEl) {
            paginationEl.style.display = this.totalPages > 1 ? 'flex' : 'none';
        }
        
        if (pageInfo) {
            pageInfo.textContent = `${this.currentPage} / ${this.totalPages} ページ (全${pagination.total}件)`;
        }
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }
    }
    
    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.loadData();
        }
    }
    
    async nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            await this.loadData();
        }
    }
    
    async exportCSV() {
        try {
            this.updateStatus('CSV出力中...', 'info');
            
            const params = { ...this.currentFilters };
            await ApiClient.download('api/export.php', params);
            
            this.updateStatus('CSV出力完了', 'success');
            CommonUtils.showNotification('CSVファイルをダウンロードしました', 'success');
            
        } catch (error) {
            console.error('CSV export error:', error);
            this.showError('CSV出力エラー: ' + error.message);
        }
    }
    
    async exportFiltered() {
        if (this.selectedProducts.size === 0) {
            CommonUtils.showNotification('出力する商品を選択してください', 'warning');
            return;
        }
        
        try {
            this.updateStatus('選択商品のCSV出力中...', 'info');
            
            const params = {
                ...this.currentFilters,
                product_ids: Array.from(this.selectedProducts)
            };
            
            await ApiClient.download('api/export.php', params);
            
            this.updateStatus('選択商品のCSV出力完了', 'success');
            CommonUtils.showNotification('選択商品のCSVファイルをダウンロードしました', 'success');
            
        } catch (error) {
            console.error('Filtered CSV export error:', error);
            this.showError('CSV出力エラー: ' + error.message);
        }
    }
    
    async cleanupDummyData() {
        if (!CommonUtils.confirm('ダミーデータを削除しますか？この操作は取り消せません。')) {
            return;
        }
        
        try {
            this.updateStatus('ダミーデータ削除中...', 'info');
            
            const response = await ApiClient.post('api/delete.php', {
                action: 'cleanup_dummy'
            });
            
            if (response.success) {
                CommonUtils.showNotification(response.message, 'success');
                this.updateStatus('ダミーデータ削除完了', 'success');
                await this.refreshData();
            } else {
                throw new Error(response.message);
            }
            
        } catch (error) {
            console.error('Cleanup error:', error);
            this.showError('ダミーデータ削除エラー: ' + error.message);
        }
    }
    
    async deleteSelected() {
        if (this.selectedProducts.size === 0) {
            CommonUtils.showNotification('削除する商品を選択してください', 'warning');
            return;
        }
        
        if (!CommonUtils.confirm(`選択した${this.selectedProducts.size}件の商品を削除しますか？この操作は取り消せません。`)) {
            return;
        }
        
        try {
            this.updateStatus('選択商品削除中...', 'info');
            
            const response = await ApiClient.post('api/delete.php', {
                product_ids: Array.from(this.selectedProducts)
            });
            
            if (response.success) {
                CommonUtils.showNotification(response.message, 'success');
                this.updateStatus('選択商品削除完了', 'success');
                this.clearSelection();
                await this.refreshData();
            } else {
                throw new Error(response.message);
            }
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showError('商品削除エラー: ' + error.message);
        }
    }
    
    async deleteProduct(productId) {
        if (!CommonUtils.confirm('この商品を削除しますか？この操作は取り消せません。')) {
            return;
        }
        
        try {
            const response = await ApiClient.post('api/delete.php', {
                product_id: productId
            });
            
            if (response.success) {
                CommonUtils.showNotification('商品を削除しました', 'success');
                await this.refreshData();
            } else {
                throw new Error(response.message);
            }
            
        } catch (error) {
            console.error('Delete product error:', error);
            this.showError('商品削除エラー: ' + error.message);
        }
    }
    
    async editProduct(itemId) {
        try {
            // 商品詳細を取得
            const response = await ApiClient.get('api/data.php', { item_id: itemId });
            
            if (response.success && response.data.length > 0) {
                this.showEditModal(response.data[0]);
            } else {
                throw new Error('商品データが見つかりません');
            }
            
        } catch (error) {
            console.error('Edit product error:', error);
            this.showError('商品詳細取得エラー: ' + error.message);
        }
    }
    
    showEditModal(product) {
        const modal = document.getElementById('editModal');
        
        document.getElementById('editItemId').value = product.item_id;
        document.getElementById('editTitle').value = product.title;
        document.getElementById('editPrice').value = product.price.jpy;
        document.getElementById('editCategory').value = product.category;
        document.getElementById('editCondition').value = product.condition;
        document.getElementById('editDescription').value = product.description || '';
        
        modal.style.display = 'flex';
    }
    
    closeModal() {
        document.getElementById('editModal').style.display = 'none';
    }
    
    async saveEdit() {
        const form = document.getElementById('editForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        try {
            const data = {
                item_id: document.getElementById('editItemId').value,
                title: document.getElementById('editTitle').value,
                price: parseInt(document.getElementById('editPrice').value),
                category: document.getElementById('editCategory').value,
                condition: document.getElementById('editCondition').value,
                description: document.getElementById('editDescription').value
            };
            
            const response = await ApiClient.post('api/update.php', data);
            
            if (response.success) {
                CommonUtils.showNotification('商品データを更新しました', 'success');
                this.closeModal();
                await this.refreshData();
            } else {
                throw new Error(response.message);
            }
            
        } catch (error) {
            console.error('Save edit error:', error);
            this.showError('商品更新エラー: ' + error.message);
        }
    }
    
    bulkEdit() {
        CommonUtils.showNotification('一括編集機能は開発中です', 'info');
    }
    
    showLoading(message) {
        CommonUtils.showLoading('#tableBody', message);
    }
    
    showError(message) {
        CommonUtils.showNotification(message, 'error');
        console.error(message);
    }
    
    updateStatus(message, type = 'info') {
        CommonUtils.updateStatus(message, type);
    }
}

// グローバルインスタンス作成
let productEditor;

document.addEventListener('DOMContentLoaded', function() {
    productEditor = new ProductEditor();
    console.log('商品編集システム初期化完了');
});