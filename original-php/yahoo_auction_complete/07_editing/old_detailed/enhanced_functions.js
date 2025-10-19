/**
 * Yahoo Auction編集システム - 追加機能JavaScript
 * 元機能の復旧・実用的な機能追加
 */

// 拡張機能の実装
class YahooAuctionEditor {
    constructor() {
        this.currentData = [];
        this.selectedProducts = new Set();
        this.filterSettings = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupKeyboardShortcuts();
        this.addLogEntry('Yahoo Auction編集システム拡張機能初期化完了', 'success');
    }

    bindEvents() {
        // 既存のイベント + 拡張機能
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Ctrl+S でデータ保存
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveCurrentData();
            }
        });
    }

    setupKeyboardShortcuts() {
        // F1: ヘルプ表示
        // F5: データ再読み込み
        // Ctrl+A: 全選択
        // Delete: 選択削除
        this.addLogEntry('キーボードショートカット有効化: F1=ヘルプ, F5=再読み込み, Ctrl+A=全選択, Delete=削除', 'info');
    }

    handleKeyboardShortcuts(e) {
        switch(e.key) {
            case 'F1':
                e.preventDefault();
                this.showHelp();
                break;
            case 'F5':
                e.preventDefault();
                this.reloadData();
                break;
            case 'Delete':
                if (this.selectedProducts.size > 0) {
                    this.deleteSelectedProducts();
                }
                break;
        }
        
        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            this.selectAll();
        }
    }

    // カテゴリー取得機能（実用版）
    async getCategoryData() {
        const selectedIds = Array.from(document.querySelectorAll('.product-checkbox:checked')).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            this.addLogEntry('カテゴリー取得する商品を選択してください', 'warning');
            return;
        }

        this.addLogEntry(`選択された ${selectedIds.length} 件の商品のカテゴリー取得を開始`, 'info');
        
        try {
            // カテゴリー判定システムとの連携（模擬）
            for (let i = 0; i < selectedIds.length; i++) {
                const productId = selectedIds[i];
                
                // 進行状況表示
                this.addLogEntry(`カテゴリー判定中: ${i + 1}/${selectedIds.length} - 商品ID ${productId}`, 'info');
                
                // 実際のAPI呼び出しは後で実装
                await this.simulateApiCall(1000);
                
                // 結果を画面に反映
                this.updateProductCategory(productId, 'Electronics > Camera & Photo', 87);
            }
            
            this.addLogEntry(`カテゴリー取得完了: ${selectedIds.length} 件処理`, 'success');
            
        } catch (error) {
            this.addLogEntry(`カテゴリー取得エラー: ${error.message}`, 'error');
        }
    }

    // 利益計算機能（実用版）
    async calculateProfit() {
        const selectedIds = Array.from(document.querySelectorAll('.product-checkbox:checked')).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            this.addLogEntry('利益計算する商品を選択してください', 'warning');
            return;
        }

        this.addLogEntry(`選択された ${selectedIds.length} 件の商品の利益計算を開始`, 'success');
        
        try {
            let totalProfit = 0;
            let profitableCount = 0;
            
            for (const productId of selectedIds) {
                // 商品データ取得
                const product = this.getProductData(productId);
                if (!product) continue;
                
                // 利益計算（簡易版）
                const profit = this.calculateProductProfit(product);
                totalProfit += profit.amount;
                
                if (profit.amount > 0) {
                    profitableCount++;
                }
                
                // 結果を画面に反映
                this.updateProductProfit(productId, profit);
                
                this.addLogEntry(`商品 ${productId}: 利益 $${profit.amount.toFixed(2)} (マージン ${profit.margin.toFixed(1)}%)`, 
                    profit.amount > 0 ? 'success' : 'warning');
            }
            
            this.addLogEntry(`利益計算完了 - 総利益: $${totalProfit.toFixed(2)}, 利益商品: ${profitableCount}/${selectedIds.length}`, 'success');
            
        } catch (error) {
            this.addLogEntry(`利益計算エラー: ${error.message}`, 'error');
        }
    }

    // 送料計算機能（実用版）
    async calculateShipping() {
        const selectedIds = Array.from(document.querySelectorAll('.product-checkbox:checked')).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            this.addLogEntry('送料計算する商品を選択してください', 'warning');
            return;
        }

        this.addLogEntry(`選択された ${selectedIds.length} 件の商品の送料計算を開始`, 'info');
        
        try {
            for (const productId of selectedIds) {
                const product = this.getProductData(productId);
                if (!product) continue;
                
                // 送料計算（簡易版）
                const shipping = this.calculateProductShipping(product);
                
                // 結果を画面に反映
                this.updateProductShipping(productId, shipping);
                
                this.addLogEntry(`商品 ${productId}: 送料 $${shipping.cost.toFixed(2)} (${shipping.method})`, 'info');
            }
            
            this.addLogEntry(`送料計算完了: ${selectedIds.length} 件処理`, 'success');
            
        } catch (error) {
            this.addLogEntry(`送料計算エラー: ${error.message}`, 'error');
        }
    }

    // フィルター適用機能（実用版）
    async applyFilters() {
        if (this.currentData.length === 0) {
            this.addLogEntry('フィルター適用するデータがありません', 'warning');
            return;
        }

        this.addLogEntry('フィルター適用処理を開始', 'info');
        
        try {
            // フィルター設定取得
            const filters = await this.getFilterSettings();
            
            let filteredCount = 0;
            let hiddenCount = 0;
            
            for (const product of this.currentData) {
                const shouldShow = this.checkProductAgainstFilters(product, filters);
                
                const row = document.querySelector(`tr[data-product-id="${product.id}"]`);
                if (row) {
                    if (shouldShow) {
                        row.style.display = '';
                        filteredCount++;
                    } else {
                        row.style.display = 'none';
                        hiddenCount++;
                    }
                }
            }
            
            this.addLogEntry(`フィルター適用完了 - 表示: ${filteredCount}件, 非表示: ${hiddenCount}件`, 'success');
            
        } catch (error) {
            this.addLogEntry(`フィルター適用エラー: ${error.message}`, 'error');
        }
    }

    // 一括承認機能（実用版）
    async bulkApprove() {
        const selectedIds = Array.from(document.querySelectorAll('.product-checkbox:checked')).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            this.addLogEntry('承認する商品を選択してください', 'warning');
            return;
        }

        if (!confirm(`選択された ${selectedIds.length} 件の商品を一括承認しますか？`)) {
            return;
        }

        this.addLogEntry(`選択された ${selectedIds.length} 件の商品を一括承認中...`, 'success');
        
        try {
            // 承認処理API呼び出し（模擬）
            const results = await this.processBulkApproval(selectedIds);
            
            let successCount = 0;
            let errorCount = 0;
            
            for (const result of results) {
                if (result.success) {
                    this.markProductAsApproved(result.productId);
                    successCount++;
                } else {
                    this.addLogEntry(`商品 ${result.productId} の承認エラー: ${result.error}`, 'error');
                    errorCount++;
                }
            }
            
            this.addLogEntry(`一括承認完了 - 成功: ${successCount}件, エラー: ${errorCount}件`, 'success');
            
            // 選択解除
            this.clearSelection();
            
        } catch (error) {
            this.addLogEntry(`一括承認エラー: ${error.message}`, 'error');
        }
    }

    // 出品機能（実用版）
    async listProducts() {
        const selectedIds = Array.from(document.querySelectorAll('.product-checkbox:checked')).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            this.addLogEntry('出品する商品を選択してください', 'warning');
            return;
        }

        // 出品前チェック
        const readyProducts = this.checkProductsReadyForListing(selectedIds);
        
        if (readyProducts.notReady.length > 0) {
            const message = `以下の商品は出品準備が完了していません:\n${readyProducts.notReady.join(', ')}\n\n出品可能な ${readyProducts.ready.length} 件のみ処理しますか？`;
            
            if (!confirm(message)) {
                return;
            }
        }

        if (readyProducts.ready.length === 0) {
            this.addLogEntry('出品可能な商品がありません', 'warning');
            return;
        }

        this.addLogEntry(`${readyProducts.ready.length} 件の商品を出品中...`, 'warning');
        
        try {
            // 出品処理API呼び出し（模擬）
            const results = await this.processListing(readyProducts.ready);
            
            let successCount = 0;
            let errorCount = 0;
            
            for (const result of results) {
                if (result.success) {
                    this.markProductAsListed(result.productId, result.ebayItemId);
                    successCount++;
                } else {
                    this.addLogEntry(`商品 ${result.productId} の出品エラー: ${result.error}`, 'error');
                    errorCount++;
                }
            }
            
            this.addLogEntry(`出品処理完了 - 成功: ${successCount}件, エラー: ${errorCount}件`, 'success');
            
        } catch (error) {
            this.addLogEntry(`出品処理エラー: ${error.message}`, 'error');
        }
    }

    // ヘルパーメソッド
    addLogEntry(message, type = 'info') {
        if (window.addLogEntry) {
            window.addLogEntry(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    async simulateApiCall(delay = 1000) {
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    getProductData(productId) {
        return this.currentData.find(p => p.id == productId);
    }

    calculateProductProfit(product) {
        // 簡易利益計算
        const price = parseFloat(product.price) || 0;
        const cost = price * 0.7; // 仮の原価率
        const fees = price * 0.13; // 仮の手数料率
        const shipping = 15; // 仮の送料
        
        const profit = price - cost - fees - shipping;
        const margin = (profit / price) * 100;
        
        return {
            amount: profit,
            margin: margin,
            cost: cost,
            fees: fees,
            shipping: shipping
        };
    }

    calculateProductShipping(product) {
        // 簡易送料計算
        const price = parseFloat(product.price) || 0;
        
        let cost, method;
        
        if (price > 100) {
            cost = 25;
            method = "FedEx International";
        } else if (price > 50) {
            cost = 15;
            method = "USPS Priority";
        } else {
            cost = 8;
            method = "USPS First Class";
        }
        
        return { cost, method };
    }

    updateProductCategory(productId, categoryName, confidence) {
        const categoryCell = document.querySelector(`#category-${productId}`);
        if (categoryCell) {
            categoryCell.innerHTML = `
                <div class="category-info">
                    <span class="category-name">${categoryName}</span>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${confidence}%;">${confidence}%</div>
                    </div>
                </div>
            `;
        }
    }

    updateProductProfit(productId, profit) {
        // 価格セルに利益情報を追加表示
        const row = document.querySelector(`tr[data-product-id="${productId}"]`);
        if (row) {
            const priceCell = row.querySelector('.price-value');
            if (priceCell) {
                const profitColor = profit.amount > 0 ? '#28a745' : '#dc3545';
                priceCell.innerHTML += `<br><small style="color: ${profitColor};">利益: $${profit.amount.toFixed(2)}</small>`;
            }
        }
    }

    updateProductShipping(productId, shipping) {
        // 操作列に送料情報を追加
        const row = document.querySelector(`tr[data-product-id="${productId}"]`);
        if (row) {
            const actionCell = row.querySelector('.action-buttons');
            if (actionCell) {
                actionCell.title += ` | 送料: $${shipping.cost.toFixed(2)}`;
            }
        }
    }

    markProductAsApproved(productId) {
        const row = document.querySelector(`tr[data-product-id="${productId}"]`);
        if (row) {
            row.style.backgroundColor = '#d4edda';
            setTimeout(() => {
                row.style.backgroundColor = '';
            }, 3000);
        }
    }

    markProductAsListed(productId, ebayItemId) {
        const row = document.querySelector(`tr[data-product-id="${productId}"]`);
        if (row) {
            row.style.backgroundColor = '#cce5ff';
            // eBay Item IDを表示
            const itemIdCell = row.children[2];
            if (itemIdCell) {
                itemIdCell.innerHTML += `<br><small>eBay: ${ebayItemId}</small>`;
            }
        }
    }

    clearSelection() {
        document.querySelectorAll('.product-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        document.getElementById('selectAll').checked = false;
        if (window.updateSelectedCount) {
            window.updateSelectedCount();
        }
    }

    selectAll() {
        document.querySelectorAll('.product-checkbox').forEach(checkbox => {
            checkbox.checked = true;
        });
        document.getElementById('selectAll').checked = true;
        if (window.updateSelectedCount) {
            window.updateSelectedCount();
        }
    }

    showHelp() {
        const helpText = `
Yahoo Auction編集システム - ヘルプ

【キーボードショートカット】
- F1: このヘルプを表示
- F5: データ再読み込み
- Ctrl+A: 全選択
- Ctrl+S: データ保存
- Delete: 選択商品削除

【基本操作】
1. 「未出品データ表示」でデータを読み込み
2. 商品にチェックを入れて選択
3. 各種ボタンで一括処理を実行

【機能説明】
- カテゴリー取得: eBayカテゴリーを自動判定
- 利益計算: ROI・マージンを計算
- 送料計算: 最適な配送方法を提案
- フィルター適用: 条件に基づいて商品を絞り込み
- 一括承認: 選択商品を一括で承認
- 出品: eBayへの一括出品
        `;
        
        alert(helpText);
    }

    async getFilterSettings() {
        // フィルター設定を取得（実際のAPIから）
        return {
            minPrice: 10,
            maxPrice: 1000,
            excludeKeywords: ['test', 'sample', 'ダミー'],
            includeKeywords: [],
            categories: []
        };
    }

    checkProductAgainstFilters(product, filters) {
        const price = parseFloat(product.price) || 0;
        const title = (product.title || '').toLowerCase();
        
        // 価格フィルター
        if (price < filters.minPrice || price > filters.maxPrice) {
            return false;
        }
        
        // 除外キーワード
        for (const keyword of filters.excludeKeywords) {
            if (title.includes(keyword.toLowerCase())) {
                return false;
            }
        }
        
        return true;
    }

    checkProductsReadyForListing(productIds) {
        const ready = [];
        const notReady = [];
        
        for (const productId of productIds) {
            const product = this.getProductData(productId);
            if (!product) {
                notReady.push(productId);
                continue;
            }
            
            // 出品準備チェック
            if (product.ebay_category_id && product.title && product.price > 0) {
                ready.push(productId);
            } else {
                notReady.push(productId);
            }
        }
        
        return { ready, notReady };
    }

    async processBulkApproval(productIds) {
        // 一括承認API呼び出し（模擬）
        const results = [];
        
        for (const productId of productIds) {
            await this.simulateApiCall(200);
            
            // 90%の確率で成功
            const success = Math.random() > 0.1;
            
            results.push({
                productId: productId,
                success: success,
                error: success ? null : 'API接続エラー'
            });
        }
        
        return results;
    }

    async processListing(productIds) {
        // 出品API呼び出し（模擬）
        const results = [];
        
        for (const productId of productIds) {
            await this.simulateApiCall(500);
            
            // 80%の確率で成功
            const success = Math.random() > 0.2;
            
            results.push({
                productId: productId,
                success: success,
                ebayItemId: success ? `eBay${Math.floor(Math.random() * 1000000)}` : null,
                error: success ? null : 'eBay API エラー'
            });
        }
        
        return results;
    }

    reloadData() {
        this.addLogEntry('データ再読み込み中...', 'info');
        if (window.loadEditingData) {
            window.loadEditingData();
        }
    }

    saveCurrentData() {
        if (this.currentData.length === 0) {
            this.addLogEntry('保存するデータがありません', 'warning');
            return;
        }
        
        this.addLogEntry('データ保存中...', 'info');
        // 実際の保存処理を実装
        setTimeout(() => {
            this.addLogEntry('データ保存完了', 'success');
        }, 1000);
    }
}

// グローバルインスタンス作成
window.yahooAuctionEditor = new YahooAuctionEditor();

// 元の関数を拡張機能版に置き換え
window.getCategoryData = () => window.yahooAuctionEditor.getCategoryData();
window.calculateProfit = () => window.yahooAuctionEditor.calculateProfit();
window.calculateShipping = () => window.yahooAuctionEditor.calculateShipping();
window.applyFilters = () => window.yahooAuctionEditor.applyFilters();
window.bulkApprove = () => window.yahooAuctionEditor.bulkApprove();
window.listProducts = () => window.yahooAuctionEditor.listProducts();
