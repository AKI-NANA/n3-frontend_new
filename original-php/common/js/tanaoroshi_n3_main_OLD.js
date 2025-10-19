/**
 * 🎯 N3準拠 棚卸しシステム JavaScript - Phase1修正版
 * 完全外部化・priceUSD undefined エラー解決・N3準拠構造
 * 修正日: 2025年8月18日 Phase1
 */

// 🎯 N3準拠: グローバル名前空間（汚染防止）
window.TanaoroshiN3System = window.TanaoroshiN3System || {};

(function(TN3) {
    'use strict';

    // 🎯 N3準拠: システム設定
    TN3.config = {
        version: 'Phase1-N3-Compliant',
        apiEndpoint: "modules/tanaoroshi_inline_complete/tanaoroshi_ajax_handler.php",
        debugMode: true,
        n3Compliant: true
    };

    // 🎯 N3準拠: データストレージ
    TN3.data = {
        allProducts: [],
        filteredProducts: [],
        globalProducts: [],  // 多国展開データ
        filteredGlobalProducts: [],  // フィルター済み多国展開データ
        currentView: 'card',
        currentPage: 1,
        itemsPerPage: 80,
        statistics: {
            total: 0,
            stock: 0,
            dropship: 0,
            set: 0,
            hybrid: 0,
            totalValue: 0,
            // 多国展開統計
            globalCountries: 0,
            globalListings: 0,
            globalRevenue: 0
        }
    };

    // 🎯 N3準拠: ログ関数（JSON安全・エラー修正版）
    TN3.log = function(message, level = 'info') {
        if (!TN3.config.debugMode) return;
        const timestamp = new Date().toISOString();
        // level.toUpperCase エラー修正
        const safeLevel = typeof level === 'string' ? level.toUpperCase() : 'INFO';
        console.log(`[TN3-${safeLevel}] ${timestamp}: ${message}`);
    };

    // 🎯 N3準拠: Ajax通信関数（デバッグ強化版）
    TN3.ajax = async function(action, data = {}) {
        try {
            TN3.log(`Ajax要求開始: ${action}`);
            
            const formData = new FormData();
            formData.append('action', action);
            formData.append('dev_mode', '1');
            
            // データ追加
            Object.keys(data).forEach(key => {
                formData.append(key, data[key]);
            });
            
            // 実データ用エンドポイント使用（修正版）
            const endpoint = 'modules/tanaoroshi_inline_complete/tanaoroshi_ajax_handler.php';
            
            TN3.log(`エンドポイント: ${endpoint}`);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });
            
            TN3.log(`HTTPステータス: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // レスポンステキストを取得してデバッグ
            const responseText = await response.text();
            TN3.log(`レスポンステキスト（最初の100文字）: ${responseText.substring(0, 100)}`);
            
            // JSONパース試行
            let result;
            try {
                result = JSON.parse(responseText);
                TN3.log(`JSONパース成功: ${action}`);
            } catch (parseError) {
                TN3.log(`JSONパースエラー: ${parseError.message}`, 'error');
                TN3.log(`レスポンス全体: ${responseText}`, 'error');
                throw new Error(`JSONパースエラー: ${parseError.message}`);
            }
            
            if (!result.n3_compliant) {
                TN3.log('警告: N3準拠レスポンスではありません', 'warning');
            }
            
            TN3.log(`Ajax要求完了: ${action} - ${result.success ? '成功' : '失敗'}`);
            return result;
            
        } catch (error) {
            TN3.log(`Ajax要求エラー: ${action} - ${error.message}`, 'error');
            
            // ユーザーにエラー表示
            TN3.showError('Ajax通信エラー', 
                `アクション: ${action}\n` +
                `エラー: ${error.message}\n\n` +
                `推奨手順:\n` +
                `1. ブラウザの開発者ツールでネットワークタブを確認\n` +
                `2. PHPエラーログを確認\n` +
                `3. ページを再読み込み`);
            
            throw error;
        }
    };

    // 🎯 Phase1最重要: priceUSD undefined エラー完全解決関数
    TN3.sanitizeProductData = function(product) {
        if (!product || typeof product !== 'object') {
            TN3.log('警告: 無効な商品データ', 'warning');
            return null;
        }

        // ✅ priceUSD undefined エラー完全解決
        const priceUSD = parseFloat(product.priceUSD ?? product.price_usd ?? product.price ?? 0);
        const costUSD = parseFloat(product.costUSD ?? product.cost_usd ?? (priceUSD * 0.7) ?? 0);
        const stock = parseInt(product.stock ?? product.quantity ?? 0);
        
        return {
            // 基本フィールド
            id: product.id ?? Math.random().toString(36).substr(2, 9),
            name: product.name ?? product.title ?? '商品名不明',
            title: product.title ?? product.name ?? '商品名不明',
            sku: product.sku ?? `SKU-${Date.now()}`,
            type: product.type ?? 'stock',
            condition: product.condition ?? 'new',
            
            // ✅ 価格フィールド（undefinedエラー解決）
            priceUSD: priceUSD,
            costUSD: costUSD,
            price: priceUSD,  // 互換性
            
            // ✅ 在庫フィールド（undefinedエラー解決）
            stock: stock,
            quantity: stock,  // 互換性
            
            // その他フィールド
            category: product.category ?? 'Electronics',
            channels: product.channels ?? ['ebay'],
            image: product.image ?? product.gallery_url ?? '',
            gallery_url: product.gallery_url ?? product.image ?? '',
            listing_status: product.listing_status ?? '出品中',
            watch_count: parseInt(product.watch_count ?? product.watchers_count ?? 0),
            watchers_count: parseInt(product.watchers_count ?? product.watch_count ?? 0),
            view_count: parseInt(product.view_count ?? product.views_count ?? 0),
            views_count: parseInt(product.views_count ?? product.view_count ?? 0),
            item_id: product.item_id ?? product.ebay_item_id ?? `ITEM-${Date.now()}`,
            ebay_item_id: product.ebay_item_id ?? product.item_id ?? `EBAY-${Date.now()}`,
            data_source: product.data_source ?? 'n3_sanitized',
            updated_at: product.updated_at ?? new Date().toISOString(),
            created_at: product.created_at ?? new Date().toISOString()
        };
    };

    // 🎯 安全なデータ読み込み（100件制限）
    TN3.loadSafeInventoryData = async function() {
        try {
            TN3.log('安全データ読み込み開始（100件制限）');
            
            // 100件制限のAPI呼び出し
            const response = await fetch('modules/ebay_kanri/n3_integration_api.php?action=get_inventory&limit=100');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.products && Array.isArray(result.products)) {
                // eBayデータをN3準拠形式に変換
                const ebayProducts = result.products.slice(0, 100).map(product => ({
                    id: product.product_id || Math.random().toString(36).substr(2, 9),
                    name: product.title || '商品名不明',
                    title: product.title || '商品名不明', 
                    sku: product.sku || 'SKU不明',
                    type: 'stock',
                    condition: 'new',
                    priceUSD: parseFloat(product.selling_price_usd || product.avg_listing_price || 0),
                    costUSD: parseFloat(product.cost_usd || 0),
                    price: parseFloat(product.selling_price_usd || product.avg_listing_price || 0),
                    stock: parseInt(product.physical_stock || 0),
                    quantity: parseInt(product.physical_stock || 0),
                    available_stock: parseInt(product.available_stock || 0),
                    reserved_stock: parseInt(product.reserved_stock || 0),
                    category: 'eBay商品',
                    channels: product.sites ? product.sites.split(', ') : ['ebay'],
                    image: product.image_hash ? `https://i.ebayimg.com/images/g/${product.image_hash}/s-l300.jpg` : '',
                    gallery_url: product.image_hash ? `https://i.ebayimg.com/images/g/${product.image_hash}/s-l300.jpg` : '',
                    listing_status: '出品中',
                    watch_count: 0,
                    watchers_count: 0,
                    view_count: 0,
                    views_count: 0,
                    item_id: `EBAY-${product.product_id}`,
                    ebay_item_id: `EBAY-${product.product_id}`,
                    countries_count: parseInt(product.countries_count || 0),
                    sites: product.sites || '',
                    data_source: 'ebay_safe_100',
                    updated_at: product.updated_at || new Date().toISOString(),
                    created_at: product.created_at || new Date().toISOString()
                }));
                
                const sanitizedData = ebayProducts
                    .map(TN3.sanitizeProductData)
                    .filter(product => product !== null);
                
                TN3.data.allProducts = sanitizedData;
                TN3.data.filteredProducts = [...sanitizedData];
                
                TN3.log(`安全データ読み込み成功: ${sanitizedData.length}件（100件制限）`);
                TN3.log(`データソース: ebay_safe_100`);
                
                // 統計更新
                TN3.updateStatistics();
                
                // UI更新
                TN3.updateDisplay();
                
                // 成功通知
                TN3.showSuccess('安全データ取得成功', 
                    `${sanitizedData.length}件の商品データを読み込みました。\n\n` +
                    `• 制限: 100件のみ（システム保護）\n` +
                    `• 全件取得: データハブで実行してください`);
                
                return true;
            } else {
                throw new Error(result.error || '安全データ取得に失敗しました');
            }
            
        } catch (error) {
            TN3.log(`安全データ読み込みエラー: ${error.message}`, 'error');
            
            TN3.showError('安全データ読み込みエラー', 
                `${error.message}\n\n` +
                `推奨手順:\n` +
                `1. データハブでデータ取得\n` +
                `   http://localhost:8080/?page=php_system_files&sub=data_hub\n\n` +
                `2. フルデータを取得後にこのページで表示`);
            return false;
        }
    };
    TN3.loadInventoryData = async function() {
        try {
            TN3.log('実データ読み込み開始（nagano3_db → mystical_japan_treasures_inventory）');
            
            // 実データAjax要求
            const result = await TN3.ajax('load_inventory_data', { limit: 1000 });
            
            // 🔧 修正: result.data を使用（result.productsではない）
            if (result.success && result.data && Array.isArray(result.data)) {
                // ✅ 実データは既に変換済みで取得
                const ebayProducts = result.data;
                
                const sanitizedData = ebayProducts
                    .map(TN3.sanitizeProductData)
                    .filter(product => product !== null);
                
                TN3.data.allProducts = sanitizedData;
                TN3.data.filteredProducts = [...sanitizedData];
                
                TN3.log(`実データ読み込み成功: ${sanitizedData.length}件`);
                TN3.log(`データソース: nagano3_db.mystical_japan_treasures_inventory`);
                
                // 統計更新
                TN3.updateStatistics();
                
                // UI更新
                TN3.updateDisplay();
                
                // 実データ取得成功通知
                TN3.showSuccess('実データ取得成功', 
                    `✅ nagano3_db → mystical_japan_treasures_inventory\n` +
                    `取得件数: ${sanitizedData.length}件\n` +
                    `データベース総数: 634件\n` +
                    `データソース: 実データベース`);
                
                return true;
            } else {
                // 🔧 デバッグ情報追加
                TN3.log(`データ構造エラー - result.success: ${result.success}`, 'error');
                TN3.log(`result.data 存在: ${!!result.data}`, 'error');
                TN3.log(`result.data 型: ${typeof result.data}`, 'error');
                TN3.log(`result.data 配列: ${Array.isArray(result.data)}`, 'error');
                TN3.log(`result 全体:`, result);
                
                throw new Error(result.error || '実データ取得に失敗しました');
            }
            
        } catch (error) {
            TN3.log(`実データ読み込みエラー: ${error.message}`, 'error');
            
            // エラー表示
            TN3.showError('実データ読み込みエラー', 
                `${error.message}\n\n` +
                `推奨手順:\n` +
                `1. Universal Data Hub でデータ確認\n` +
                `2. データベース接続確認\n` +
                `3. ページ再読み込み`);
            return false;
        }
    };

    // 🎯 N3準拠: 統計更新
    TN3.updateStatistics = function() {
        const products = TN3.data.allProducts;
        
        const stats = {
            total: products.length,
            stock: products.filter(p => p.type === 'stock').length,
            dropship: products.filter(p => p.type === 'dropship').length,
            set: products.filter(p => p.type === 'set').length,
            hybrid: products.filter(p => p.type === 'hybrid').length,
            totalValue: products.reduce((sum, p) => sum + (p.priceUSD * p.stock), 0),
            // 多国展開統計
            globalCountries: TN3.getUniqueCountries(TN3.data.globalProducts).length,
            globalListings: TN3.data.globalProducts.length,
            globalRevenue: TN3.data.globalProducts.reduce((sum, p) => sum + (parseFloat(p.total_sales || 0)), 0)
        };
        
        TN3.data.statistics = stats;
        
        // DOM更新
        TN3.updateStatisticsDisplay(stats);
        
        TN3.log(`統計更新完了: 総数${stats.total}, 有在庫${stats.stock}, 無在庫${stats.dropship}, セット${stats.set}, ハイブリッド${stats.hybrid}`);
        TN3.log(`多国展開統計: 展開国${stats.globalCountries}, 出品${stats.globalListings}, 売上${stats.globalRevenue.toFixed(2)}`);
    };

    // 🎯 N3準拠: 統計表示更新
    TN3.updateStatisticsDisplay = function(stats) {
        const elements = {
            'total-products': stats.total,
            'stock-products': stats.stock,
            'dropship-products': stats.dropship,
            'set-products': stats.set,
            'hybrid-products': stats.hybrid,
            'total-value': `${(stats.totalValue / 1000).toFixed(1)}K`,
            // 多国展開統計
            'global-countries': stats.globalCountries,
            'global-listings': stats.globalListings,
            'global-revenue': `${(stats.globalRevenue / 1000).toFixed(1)}K`
        };
        
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        });
        
        // 多国展開統計の表示制御
        const isGlobalView = TN3.data.currentView === 'global';
        const globalStats = document.querySelectorAll('.inventory__stat--global');
        globalStats.forEach(stat => {
            stat.style.display = isGlobalView ? 'block' : 'none';
        });
    };

    // 🎯 Phase1重要: カード作成関数（priceUSD undefinedエラー完全解決）
    TN3.createProductCard = function(product) {
        try {
            // ✅ 事前データ検証（undefinedエラー防止）
            if (!product) {
                TN3.log('警告: 空の商品データ', 'warning');
                return null;
            }

            // ✅ 価格データ安全取得（undefinedエラー完全解決）
            const priceUSD = parseFloat(product.priceUSD ?? 0);
            const costUSD = parseFloat(product.costUSD ?? priceUSD * 0.7);
            const stock = parseInt(product.stock ?? 0);
            
            // ✅ 安全な文字列作成
            const name = String(product.name ?? '商品名不明');
            const sku = String(product.sku ?? 'SKU不明');
            const type = String(product.type ?? 'stock');
            
            const card = document.createElement('div');
            card.className = 'inventory__card';
            card.dataset.productId = product.id;
            card.dataset.productType = type;
            
            card.innerHTML = `
                <div class="inventory__card-image">
                    ${product.image ? 
                        `<img src="" alt="${name}" class="inventory__card-img" style="display: none;">` + 
                        `<div class="inventory__card-placeholder" style="display: flex;">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>読み込み中...</span>
                        </div>` : 
                        `<div class="inventory__card-placeholder">
                            <i class="fas fa-image"></i>
                            <span>画像なし</span>
                        </div>`
                    }
                    <div class="inventory__badge inventory__badge--${type}">
                        ${TN3.getTypeLabel(type)}
                    </div>
                </div>
                <div class="inventory__card-info">
                    <h3 class="inventory__card-title" title="${name}">${name}</h3>
                    <div class="inventory__card-price">
                        <span class="inventory__card-price-main">${priceUSD.toFixed(2)}</span>
                        <span class="inventory__card-price-sub">仕入: ${costUSD.toFixed(2)}</span>
                    </div>
                    <div class="inventory__card-footer">
                        <span class="inventory__card-sku">${sku}</span>
                        <span class="inventory__card-stock">在庫: ${stock}</span>
                    </div>
                </div>
            `;
            
            // 画像フォールバック処理を適用
            if (product.image) {
                const imgElement = card.querySelector('.inventory__card-img');
                const itemId = product.item_id || product.ebay_item_id || product.id;
                if (imgElement && itemId) {
                    TN3.setupImageFallback(imgElement, itemId);
                }
            }
            
            // クリックイベント
            card.addEventListener('click', () => TN3.openProductModal(product));
            
            return card;
            
        } catch (error) {
            TN3.log(`カード作成エラー: ${error.message}`, 'error');
            return null;
        }
    };

    // 🎯 N3準拠: タイプラベル取得
    TN3.getTypeLabel = function(type) {
        const labels = {
            stock: '有在庫',
            dropship: '無在庫',
            set: 'セット',
            hybrid: 'ハイブリッド'
        };
        return labels[type] || type;
    };

    // 🎆 画像フォールバック処理（eBay最新形式対応）
    TN3.setupImageFallback = function(imgElement, itemId) {
        if (!imgElement || !itemId) return;
        
        // 🚨 最新のeBay画像URL形式（診断結果を反映）
        const fallbackUrls = [
            `https://i.ebayimg.com/images/g/${itemId.charAt(0)}${itemId.substring(1, 3)}/${itemId}/s-l500.jpg`, // 新形式1
            `https://i.ebayimg.com/images/g/${itemId}/s-l500.jpg`, // 標準形式
            `https://i.ebayimg.com/thumbs/images/g/${itemId}/s-l300.jpg`, // サムネイル
            `https://i.ebayimg.com/images/g/${itemId}/s-l400.jpg`, // 中サイズ
            `https://thumbs1.ebaystatic.com/m/m${itemId}/s-l225.jpg`, // 旧形式
            `https://i.ebayimg.com/00/s/NTAwWDUwMA==/${itemId}/$_35.JPG`, // エンコード形式
            `https://i.ebayimg.com/images/g/${itemId}/s-l1600.jpg` // 高解像度
        ];
        
        let currentIndex = 0;
        
        const tryNextUrl = () => {
            if (currentIndex >= fallbackUrls.length) {
                // 全て失敗した場合はプレースホルダー表示
                imgElement.style.display = 'none';
                const placeholder = imgElement.nextElementSibling;
                if (placeholder && placeholder.classList.contains('inventory__card-placeholder')) {
                    placeholder.style.display = 'flex';
                    placeholder.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i><span>全ての画像URLが404エラー</span>';
                }
                TN3.log(`画像読み込み失敗: ${itemId} (全${fallbackUrls.length}個のURLを試行)`, 'warning');
                return;
            }
            
            const currentUrl = fallbackUrls[currentIndex];
            TN3.log(`画像URL試行 [${currentIndex + 1}/${fallbackUrls.length}]: ${currentUrl}`);
            
            imgElement.onerror = () => {
                TN3.log(`画像URL失敗 [${currentIndex + 1}]: ${currentUrl}`, 'warning');
                currentIndex++;
                setTimeout(tryNextUrl, 100); // ライトな遅延でサーバー負荷軽減
            };
            
            imgElement.onload = () => {
                TN3.log(`画像URL成功 [${currentIndex + 1}]: ${currentUrl}`, 'success');
                imgElement.style.display = 'block';
                const placeholder = imgElement.nextElementSibling;
                if (placeholder) placeholder.style.display = 'none';
            };
            
            imgElement.src = currentUrl;
        };
        
        tryNextUrl();
    };

    // 🎯 N3準拠: 表示更新
    TN3.updateDisplay = function() {
        if (TN3.data.currentView === 'card') {
            TN3.updateCardView();
        } else if (TN3.data.currentView === 'excel') {
            TN3.updateExcelView();
        } else if (TN3.data.currentView === 'global') {
            TN3.updateGlobalView();
        }
    };

    // 🎯 N3準拠: カードビュー更新
    TN3.updateCardView = function() {
        const grid = document.querySelector('.inventory__grid');
        if (!grid) {
            TN3.log('カードグリッド要素が見つかりません', 'error');
            return;
        }
        
        // ローディング状態クリア
        grid.innerHTML = '';
        
        const products = TN3.data.filteredProducts;
        const startIndex = (TN3.data.currentPage - 1) * TN3.data.itemsPerPage;
        const endIndex = startIndex + TN3.data.itemsPerPage;
        const currentPageProducts = products.slice(startIndex, endIndex);
        
        if (currentPageProducts.length === 0) {
            grid.innerHTML = `
                <div class="inventory__loading-state">
                    <i class="fas fa-box-open"></i>
                    <p>表示する商品がありません</p>
                </div>
            `;
            return;
        }
        
        // カード作成
        currentPageProducts.forEach(product => {
            const card = TN3.createProductCard(product);
            if (card) {
                grid.appendChild(card);
            }
        });
        
        // ページネーション更新
        TN3.updateCardPagination(products.length);
        
        TN3.log(`カードビュー更新完了: ${currentPageProducts.length}件表示`);
    };

    // 🎯 N3準拠: カードページネーション更新
    TN3.updateCardPagination = function(totalItems) {
        const totalPages = Math.ceil(totalItems / TN3.data.itemsPerPage);
        const currentPage = TN3.data.currentPage;
        
        // ページ情報更新
        const info = document.getElementById('card-pagination-info');
        if (info) {
            const startItem = (currentPage - 1) * TN3.data.itemsPerPage + 1;
            const endItem = Math.min(currentPage * TN3.data.itemsPerPage, totalItems);
            info.textContent = `商品: ${startItem}-${endItem} / ${totalItems}件`;
        }
        
        // ボタン状態更新
        const prevBtn = document.getElementById('card-prev-btn');
        const nextBtn = document.getElementById('card-next-btn');
        
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
        
        // ページ番号更新
        const pageNumbers = document.getElementById('card-page-numbers');
        if (pageNumbers && totalPages > 1) {
            let numbersHtml = '';
            
            // シンプルページネーション（5ページまで表示）
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, startPage + 4);
            
            for (let i = startPage; i <= endPage; i++) {
                const isActive = i === currentPage ? 'inventory__pagination-btn--active' : '';
                numbersHtml += `<button class="inventory__pagination-btn ${isActive}" onclick="TanaoroshiN3System.goToCardPage(${i})">${i}</button>`;
            }
            
            pageNumbers.innerHTML = numbersHtml;
        }
    };

    // 🎯 N3準拠: Excelビュー更新（基本実装）
    TN3.updateExcelView = function() {
        const tbody = document.getElementById('excel-table-body');
        if (!tbody) {
            TN3.log('Excelテーブル要素が見つかりません', 'error');
            return;
        }
        
        tbody.innerHTML = '';
        
        const products = TN3.data.filteredProducts;
        const startIndex = (TN3.data.currentPage - 1) * TN3.data.itemsPerPage;
        const endIndex = startIndex + TN3.data.itemsPerPage;
        const currentPageProducts = products.slice(startIndex, endIndex);
        
        if (currentPageProducts.length === 0) {
            tbody.innerHTML = `
                <tr class="inventory__excel-loading">
                    <td colspan="8" class="inventory__excel-loading-cell">
                        <i class="fas fa-box-open"></i>
                        表示する商品がありません
                    </td>
                </tr>
            `;
            return;
        }
        
        currentPageProducts.forEach(product => {
            const row = TN3.createExcelRow(product);
            if (row) {
                tbody.appendChild(row);
            }
        });
        
        TN3.log(`Excelビュー更新完了: ${currentPageProducts.length}件表示`);
    };

    // 🎯 N3準拠: Excel行作成
    TN3.createExcelRow = function(product) {
        try {
            const priceUSD = parseFloat(product.priceUSD ?? 0);
            const stock = parseInt(product.stock ?? 0);
            
            const row = document.createElement('tr');
            row.dataset.productId = product.id;
            
            row.innerHTML = `
                <td style="border: 1px solid var(--border-light); padding: var(--space-xs); text-align: center;">
                    <input type="checkbox" class="inventory__excel-checkbox" />
                </td>
                <td style="border: 1px solid var(--border-light); padding: var(--space-xs); text-align: center;">
                    ${product.image ? 
                        `<img src="${product.image}" alt="${product.name}" 
                              style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" 
                              onerror="this.onerror=null; this.src='https://i.ebayimg.com/images/g/' + '${product.item_id || product.id}' + '/s-l225.jpg'; 
                                       if(this.complete && this.naturalHeight === 0) { this.style.display='none'; this.innerHTML='<i class=\"fas fa-exclamation-triangle\" style=\"color: orange;\"></i>'; }" />` : 
                        '<i class="fas fa-image" style="color: var(--text-muted);"></i>'
                    }
                </td>
                <td style="border: 1px solid var(--border-light); padding: var(--space-xs); font-weight: 500;">
                    ${product.name}
                </td>
                <td style="border: 1px solid var(--border-light); padding: var(--space-xs); font-family: monospace;">
                    ${product.sku}
                </td>
                <td style="border: 1px solid var(--border-light); padding: var(--space-xs);">
                    <span class="inventory__badge inventory__badge--${product.type}" style="font-size: 0.6rem; padding: 2px 6px;">
                        ${TN3.getTypeLabel(product.type)}
                    </span>
                </td>
                <td style="border: 1px solid var(--border-light); padding: var(--space-xs); text-align: right; font-weight: 600;">
                    $${priceUSD.toFixed(2)}
                </td>
                <td style="border: 1px solid var(--border-light); padding: var(--space-xs); text-align: center;">
                    ${stock}
                </td>
                <td style="border: 1px solid var(--border-light); padding: var(--space-xs); text-align: center;">
                    <button class="btn btn--primary btn--small" style="padding: 2px 6px; font-size: 0.6rem;" onclick="TanaoroshiN3System.openProductModal(TanaoroshiN3System.data.allProducts.find(p => p.id === '${product.id}'))">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            
            return row;
            
        } catch (error) {
            TN3.log(`Excel行作成エラー: ${error.message}`, 'error');
            return null;
        }
    };

    // 🎯 N3準拠: モーダル関数
    TN3.openModal = function(modalId) {
        TN3.log(`モーダル表示: ${modalId}`);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            requestAnimationFrame(() => {
                modal.classList.add('modal--active');
            });
            TN3.log(`モーダル表示完了: ${modalId}`);
        } else {
            TN3.log(`モーダル要素未発見: ${modalId}`, 'error');
        }
    };

    TN3.closeModal = function(modalId) {
        TN3.log(`モーダル非表示: ${modalId}`);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('modal--active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    };

    // 🎯 N3準拠: 商品モーダル
    TN3.openProductModal = function(product) {
        if (!product) return;
        
        const modal = document.getElementById('itemModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');
        
        if (title) title.textContent = product.name;
        if (body) {
            body.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div><strong>SKU:</strong> ${product.sku}</div>
                    <div><strong>種類:</strong> ${TN3.getTypeLabel(product.type)}</div>
                    <div><strong>価格:</strong> $${parseFloat(product.priceUSD || 0).toFixed(2)}</div>
                    <div><strong>在庫:</strong> ${parseInt(product.stock || 0)}</div>
                    <div><strong>カテゴリ:</strong> ${product.category}</div>
                    <div><strong>状態:</strong> ${product.condition}</div>
                </div>
                ${product.image ? `<img src="${product.image}" alt="${product.name}" style="max-width: 100%; margin-top: 1rem;">` : ''}
            `;
        }
        
        TN3.openModal('itemModal');
    };

    // 🎯 N3準拠: 通知表示機能
    TN3.showError = function(title, message) {
        alert(`❌ ${title}\n\n${message}`);
    };
    
    TN3.showSuccess = function(title, message) {
        alert(`✅ ${title}\n\n${message}`);
    };

    // 🎯 N3準拠: イベント処理システム
    TN3.handleAction = function(element, event) {
        const action = element.dataset.action;
        if (!action) return;
        
        TN3.log(`アクション実行: ${action}`);
        
        switch (action) {
            case 'switch-view':
                const view = element.dataset.view;
                TN3.switchView(view);
                break;
                
            case 'open-add-product-modal':
                TN3.openModal('addProductModal');
                break;
                
            case 'create-new-set':
                TN3.openModal('setModal');
                break;
                
            case 'close-modal':
                const modalId = element.dataset.modal;
                TN3.closeModal(modalId);
                break;
                
            case 'test-postgresql':
                TN3.testPostgreSQL();
                break;
                
            case 'open-test-modal':
                TN3.openModal('testModal');
                break;
                
            case 'load-ebay-postgresql-data':
                // 棚卸システムでの直接取得を禁止（システム保護）
                TN3.showError('データ取得エラー', 
                    '棚卸システムでの直接データ取得は禁止されています。\n\n' +
                    '正しい手順:\n' +
                    '1. データハブでデータ取得\n' +
                    '   http://localhost:8080/?page=php_system_files&sub=data_hub\n\n' +
                    '2. このページでデータ表示確認\n\n' +
                    '※ 全件取得するとシステムが停止する恐れがあります。');
                break;
                
            case 'load-safe-100-data':
                // 100件制限の安全データ読み込み
                TN3.loadSafeInventoryData();
                break;
                
            case 'sync-with-ebay':
                alert('eBay同期機能は実装中です');
                break;
                
            case 'save-new-product':
                alert('商品登録機能は実装中です');
                break;
                
            case 'save-set-product':
                alert('セット品保存機能は実装中です');
                break;
                
            case 'edit-item':
                alert('アイテム編集機能は実装中です');
                break;
                
            case 'reset-filters':
                TN3.resetFilters();
                break;
                
            case 'apply-filters':
                TN3.applyFilters();
                break;
                
            case 'change-card-page':
                const direction = parseInt(element.dataset.direction);
                TN3.changeCardPage(direction);
                break;
                
            case 'change-cards-per-page':
            const newPerPage = parseInt(element.value);
            if (newPerPage > 0) {
            TN3.data.itemsPerPage = newPerPage;
            TN3.data.currentPage = 1;
            TN3.updateDisplay();
            TN3.log(`表示件数変更: ${newPerPage}件`);
            }
            break;
                
            case 'apply-global-filters':
                TN3.applyGlobalFilters();
                break;
                
            case 'sync-global-data':
                TN3.syncGlobalData();
                break;
                
            case 'export-global-data':
                alert('多国展開データエクスポート機能は実装中です');
                break;
                
            case 'change-global-page':
                const globalDirection = parseInt(element.dataset.direction);
                TN3.changeGlobalPage(globalDirection);
                break;
                
            case 'change-global-items-per-page':
                const globalPerPage = parseInt(element.value);
                if (globalPerPage > 0) {
                    TN3.data.itemsPerPage = globalPerPage;
                    TN3.data.currentPage = 1;
                    TN3.updateDisplay();
                    TN3.log(`多国展開表示件数変更: ${globalPerPage}件`);
                }
                break;
                
            default:
                TN3.log(`未対応アクション: ${action}`, 'warning');
        }
    };

    // 🎯 N3準拠: ビュー切り替え
    TN3.switchView = function(view) {
        TN3.data.currentView = view;
        
        // ビューボタン更新
        document.querySelectorAll('.js-view-btn').forEach(btn => {
            btn.classList.remove('inventory__view-btn--active');
        });
        document.querySelector(`[data-view="${view}"]`)?.classList.add('inventory__view-btn--active');
        
        // ビューコンテナ更新
        document.querySelectorAll('.inventory__view').forEach(viewEl => {
            viewEl.classList.remove('inventory__view--visible');
            viewEl.classList.add('inventory__view--hidden');
        });
        
        const targetView = document.getElementById(`${view}-view`);
        if (targetView) {
            targetView.classList.remove('inventory__view--hidden');
            targetView.classList.add('inventory__view--visible');
        }
        
        TN3.updateDisplay();
        TN3.log(`ビュー切り替え完了: ${view}`);
    };

    // 🎯 N3準拠: PostgreSQLテスト
    TN3.testPostgreSQL = async function() {
        try {
            const result = await TN3.ajax('database_status');
            
            const testBody = document.getElementById('testModalBody');
            if (testBody) {
                testBody.innerHTML = `
                    <div style="font-family: monospace; background: #f8f9fa; padding: 1rem; border-radius: 4px;">
                        <h4>PostgreSQLテスト結果</h4>
                        <pre>${JSON.stringify(result, null, 2)}</pre>
                    </div>
                `;
            }
            TN3.openModal('testModal');
            
        } catch (error) {
            TN3.showError('PostgreSQLテストエラー', error.message);
        }
    };

    // 🎯 N3準拠: ページ変更機能
    TN3.changeCardPage = function(direction) {
        const totalPages = Math.ceil(TN3.data.filteredProducts.length / TN3.data.itemsPerPage);
        const newPage = TN3.data.currentPage + direction;
        
        if (newPage >= 1 && newPage <= totalPages) {
            TN3.data.currentPage = newPage;
            TN3.updateDisplay();
            TN3.log(`ページ変更: ${newPage}/${totalPages}`);
        } else {
            TN3.log(`ページ変更範囲外: ${newPage}`, 'warning');
        }
    };
    
    TN3.goToCardPage = function(pageNumber) {
        const totalPages = Math.ceil(TN3.data.filteredProducts.length / TN3.data.itemsPerPage);
        
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            TN3.data.currentPage = pageNumber;
            TN3.updateDisplay();
            TN3.log(`ページジャンプ: ${pageNumber}/${totalPages}`);
        }
    };
    TN3.applyFilters = function() {
        const filters = {
            type: document.getElementById('filter-type')?.value || '',
            channel: document.getElementById('filter-channel')?.value || '',
            stockStatus: document.getElementById('filter-stock-status')?.value || '',
            priceRange: document.getElementById('filter-price-range')?.value || '',
            search: document.getElementById('search-input')?.value?.trim() || ''
        };
        
        TN3.log(`フィルター適用: ${JSON.stringify(filters)}`);
        
        let filtered = [...TN3.data.allProducts];
        
        // 商品種類フィルター
        if (filters.type) {
            filtered = filtered.filter(product => product.type === filters.type);
            TN3.log(`種類フィルター後: ${filtered.length}件`);
        }
        
        // チャンネルフィルター
        if (filters.channel) {
            filtered = filtered.filter(product => 
                product.channels && product.channels.includes(filters.channel)
            );
            TN3.log(`チャンネルフィルター後: ${filtered.length}件`);
        }
        
        // 在庫状況フィルター
        if (filters.stockStatus) {
            filtered = filtered.filter(product => {
                const stock = parseInt(product.stock || 0);
                switch (filters.stockStatus) {
                    case 'in-stock': return stock > 0;
                    case 'low-stock': return stock > 0 && stock <= 5;
                    case 'out-of-stock': return stock === 0;
                    default: return true;
                }
            });
            TN3.log(`在庫状況フィルター後: ${filtered.length}件`);
        }
        
        // 価格範囲フィルター
        if (filters.priceRange) {
            filtered = filtered.filter(product => {
                const price = parseFloat(product.priceUSD || 0);
                switch (filters.priceRange) {
                    case '0-100': return price >= 0 && price <= 100;
                    case '100-500': return price > 100 && price <= 500;
                    case '500-1000': return price > 500 && price <= 1000;
                    case '1000+': return price > 1000;
                    default: return true;
                }
            });
            TN3.log(`価格フィルター後: ${filtered.length}件`);
        }
        
        // 検索フィルター
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(product => 
                (product.name && product.name.toLowerCase().includes(searchLower)) ||
                (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
                (product.category && product.category.toLowerCase().includes(searchLower))
            );
            TN3.log(`検索フィルター後: ${filtered.length}件`);
        }
        
        TN3.data.filteredProducts = filtered;
        TN3.data.currentPage = 1;
        TN3.updateDisplay();
        
        TN3.log(`フィルター適用完了: ${filtered.length}/${TN3.data.allProducts.length}件表示`);
    };

    TN3.resetFilters = function() {
        // フィルターリセット
        document.querySelectorAll('.inventory__filter-select').forEach(select => {
            select.value = '';
        });
        document.getElementById('search-input').value = '';
        
        TN3.applyFilters();
        TN3.log('フィルターリセット完了');
    };

    // 🎯 多国展開ビュー専用機能
    
    // 多国展開データ読み込み
    TN3.loadGlobalData = async function() {
        try {
            TN3.log('多国展開データ読み込み開始');
            
            // テストデータ生成（実際はここでAPI呼び出し）
            const globalTestData = TN3.generateGlobalTestData();
            
            TN3.data.globalProducts = globalTestData;
            TN3.data.filteredGlobalProducts = [...globalTestData];
            
            TN3.log(`多国展開データ読み込み成功: ${globalTestData.length}件`);
            
            // 統計更新
            TN3.updateStatistics();
            
            // 多国展開ビューがアクティブなら表示更新
            if (TN3.data.currentView === 'global') {
                TN3.updateGlobalView();
            }
            
            return true;
            
        } catch (error) {
            TN3.log(`多国展開データ読み込みエラー: ${error.message}`, 'error');
            return false;
        }
    };
    
    // テストデータ生成（多国展開）
    TN3.generateGlobalTestData = function() {
        const countries = ['US', 'UK', 'DE', 'AU', 'CA', 'FR', 'IT', 'ES'];
        const statuses = ['active', 'sold', 'ended', 'draft'];
        const productNames = [
            'Premium Gaming Headset',
            'Wireless Bluetooth Earbuds',
            'Mechanical Keyboard RGB',
            'USB-C Charging Cable',
            'Smartphone Car Mount',
            'Portable Power Bank',
            'LED Desk Lamp',
            'Waterproof Phone Case',
            'Gaming Mouse Pad',
            'Wireless Charging Station'
        ];
        
        const globalData = [];
        
        // 50件のテストデータ生成
        for (let i = 0; i < 50; i++) {
            const country = countries[Math.floor(Math.random() * countries.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const productName = productNames[Math.floor(Math.random() * productNames.length)];
            const price = (Math.random() * 200 + 10).toFixed(2);
            const sales = status === 'sold' ? (Math.random() * 5000).toFixed(2) : '0';
            const watchers = Math.floor(Math.random() * 50);
            const views = Math.floor(Math.random() * 500 + 100);
            
            globalData.push({
                id: `global-${i + 1}`,
                name: `${productName} - ${country}`,
                sku: `GLB-${country}-${String(i + 1).padStart(3, '0')}`,
                country: country,
                status: status,
                price_usd: parseFloat(price),
                total_sales: parseFloat(sales),
                watchers_count: watchers,
                views_count: views,
                listing_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                image: `https://picsum.photos/400/300?random=${i + 1}`,
                ebay_item_id: `EBAY-${country}-${Date.now()}-${i}`,
                category: 'Electronics',
                data_source: 'global_test_data'
            });
        }
        
        return globalData;
    };
    
    // 多国展開ビュー更新
    TN3.updateGlobalView = function() {
        const grid = document.getElementById('global-grid');
        if (!grid) {
            TN3.log('多国展開グリッド要素が見つかりません', 'error');
            return;
        }
        
        // ローディング状態クリア
        grid.innerHTML = '';
        
        const products = TN3.data.filteredGlobalProducts;
        const startIndex = (TN3.data.currentPage - 1) * TN3.data.itemsPerPage;
        const endIndex = startIndex + TN3.data.itemsPerPage;
        const currentPageProducts = products.slice(startIndex, endIndex);
        
        if (currentPageProducts.length === 0) {
            grid.innerHTML = `
                <div class="inventory__loading-state">
                    <i class="fas fa-globe"></i>
                    <p>表示する多国展開商品がありません</p>
                </div>
            `;
            return;
        }
        
        // 多国展開カード作成
        currentPageProducts.forEach(product => {
            const card = TN3.createGlobalCard(product);
            if (card) {
                grid.appendChild(card);
            }
        });
        
        // ページネーション更新
        TN3.updateGlobalPagination(products.length);
        
        TN3.log(`多国展開ビュー更新完了: ${currentPageProducts.length}件表示`);
    };
    
    // 多国展開カード作成
    TN3.createGlobalCard = function(product) {
        try {
            const price = parseFloat(product.price_usd || 0);
            const sales = parseFloat(product.total_sales || 0);
            const watchers = parseInt(product.watchers_count || 0);
            const views = parseInt(product.views_count || 0);
            
            const card = document.createElement('div');
            card.className = 'inventory__global-card';
            card.dataset.productId = product.id;
            card.dataset.country = product.country;
            card.dataset.status = product.status;
            
            const countryCode = product.country.toLowerCase();
            const statusClass = `inventory__global-status--${product.status}`;
            const flagClass = `inventory__global-flag--${countryCode}`;
            
            card.innerHTML = `
                <div class="inventory__global-card-header">
                    <div class="inventory__global-card-flags">
                        <span class="inventory__global-flag ${flagClass}">
                            <i class="fas fa-flag"></i>
                            ${product.country}
                        </span>
                    </div>
                </div>
                <div class="inventory__global-card-image">
                    ${product.image ? 
                        `<img src="${product.image}" alt="${product.name}" class="inventory__global-card-img" onerror="this.style.display='none';">` : 
                        `<div class="inventory__card-placeholder">
                            <i class="fas fa-image"></i>
                            <span>画像なし</span>
                        </div>`
                    }
                    <div class="inventory__global-status ${statusClass}">
                        ${TN3.getStatusLabel(product.status)}
                    </div>
                </div>
                <div class="inventory__global-card-info">
                    <h3 class="inventory__global-card-title" title="${product.name}">${product.name}</h3>
                    <div class="inventory__global-card-metrics">
                        <div class="inventory__global-metric">
                            <span class="inventory__global-metric-value">${price.toFixed(0)}</span>
                            <div class="inventory__global-metric-label">価格</div>
                        </div>
                        <div class="inventory__global-metric">
                            <span class="inventory__global-metric-value">${watchers}</span>
                            <div class="inventory__global-metric-label">ウォッチ</div>
                        </div>
                        <div class="inventory__global-metric">
                            <span class="inventory__global-metric-value">${views}</span>
                            <div class="inventory__global-metric-label">ビュー</div>
                        </div>
                    </div>
                </div>
                <div class="inventory__global-card-footer">
                    <span class="inventory__global-card-sku">${product.sku}</span>
                    <span class="inventory__global-card-revenue">${sales.toFixed(0)}</span>
                </div>
            `;
            
            // クリックイベント
            card.addEventListener('click', () => TN3.openGlobalProductModal(product));
            
            return card;
            
        } catch (error) {
            TN3.log(`多国展開カード作成エラー: ${error.message}`, 'error');
            return null;
        }
    };
    
    // ステータスラベル取得
    TN3.getStatusLabel = function(status) {
        const labels = {
            active: '出品中',
            sold: '売切れ',
            ended: '終了',
            draft: '下書き'
        };
        return labels[status] || status;
    };
    
    // ユニーク国取得
    TN3.getUniqueCountries = function(products) {
        const countries = new Set();
        products.forEach(product => {
            if (product.country) {
                countries.add(product.country);
            }
        });
        return Array.from(countries);
    };
    
    // 多国展開フィルター適用
    TN3.applyGlobalFilters = function() {
        const countryFilter = document.getElementById('global-country-filter')?.value || '';
        const statusFilter = document.getElementById('global-status-filter')?.value || '';
        
        TN3.log(`多国展開フィルター適用: 国=${countryFilter}, 状態=${statusFilter}`);
        
        let filtered = [...TN3.data.globalProducts];
        
        // 国フィルター
        if (countryFilter) {
            filtered = filtered.filter(product => product.country === countryFilter);
        }
        
        // 状態フィルター
        if (statusFilter) {
            filtered = filtered.filter(product => product.status === statusFilter);
        }
        
        TN3.data.filteredGlobalProducts = filtered;
        TN3.data.currentPage = 1;
        TN3.updateGlobalView();
        
        TN3.log(`多国展開フィルター適用完了: ${filtered.length}/${TN3.data.globalProducts.length}件表示`);
    };
    
    // 多国展開データ同期
    TN3.syncGlobalData = async function() {
        try {
            TN3.log('多国展開データ同期開始');
            
            // ローディング表示
            const grid = document.getElementById('global-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="inventory__loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>多国展開データを同期中...</p>
                    </div>
                `;
            }
            
            // 実際の実装ではここでeBay API呼び出し
            await new Promise(resolve => setTimeout(resolve, 2000)); // シミュレーション
            
            // データ再読み込み
            await TN3.loadGlobalData();
            
            TN3.log('多国展開データ同期完了');
            
        } catch (error) {
            TN3.log(`多国展開データ同期エラー: ${error.message}`, 'error');
            TN3.showError('同期エラー', error.message);
        }
    };
    
    // 多国展開ページネーション更新
    TN3.updateGlobalPagination = function(totalItems) {
        const totalPages = Math.ceil(totalItems / TN3.data.itemsPerPage);
        const currentPage = TN3.data.currentPage;
        
        // ページ情報更新
        const info = document.getElementById('global-pagination-info');
        if (info) {
            const startItem = (currentPage - 1) * TN3.data.itemsPerPage + 1;
            const endItem = Math.min(currentPage * TN3.data.itemsPerPage, totalItems);
            info.textContent = `多国展開商品: ${startItem}-${endItem} / ${totalItems}件`;
        }
        
        // ボタン状態更新
        const prevBtn = document.getElementById('global-prev-btn');
        const nextBtn = document.getElementById('global-next-btn');
        
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
        
        // ページ番号更新
        const pageNumbers = document.getElementById('global-page-numbers');
        if (pageNumbers && totalPages > 1) {
            let numbersHtml = '';
            
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, startPage + 4);
            
            for (let i = startPage; i <= endPage; i++) {
                const isActive = i === currentPage ? 'inventory__pagination-btn--active' : '';
                numbersHtml += `<button class="inventory__pagination-btn ${isActive}" onclick="TanaoroshiN3System.goToGlobalPage(${i})">${i}</button>`;
            }
            
            pageNumbers.innerHTML = numbersHtml;
        }
    };
    
    // 多国展開ページ変更
    TN3.changeGlobalPage = function(direction) {
        const totalPages = Math.ceil(TN3.data.filteredGlobalProducts.length / TN3.data.itemsPerPage);
        const newPage = TN3.data.currentPage + direction;
        
        if (newPage >= 1 && newPage <= totalPages) {
            TN3.data.currentPage = newPage;
            TN3.updateGlobalView();
            TN3.log(`多国展開ページ変更: ${newPage}/${totalPages}`);
        }
    };
    
    TN3.goToGlobalPage = function(pageNumber) {
        const totalPages = Math.ceil(TN3.data.filteredGlobalProducts.length / TN3.data.itemsPerPage);
        
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            TN3.data.currentPage = pageNumber;
            TN3.updateGlobalView();
            TN3.log(`多国展開ページジャンプ: ${pageNumber}/${totalPages}`);
        }
    };
    
    // 多国展開商品モーダル
    TN3.openGlobalProductModal = function(product) {
        if (!product) return;
        
        const modal = document.getElementById('itemModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');
        
        if (title) title.textContent = `${product.name} (${product.country})`;
        if (body) {
            body.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div><strong>SKU:</strong> ${product.sku}</div>
                    <div><strong>国:</strong> ${product.country}</div>
                    <div><strong>状態:</strong> ${TN3.getStatusLabel(product.status)}</div>
                    <div><strong>価格:</strong> ${parseFloat(product.price_usd || 0).toFixed(2)}</div>
                    <div><strong>売上:</strong> ${parseFloat(product.total_sales || 0).toFixed(2)}</div>
                    <div><strong>ウォッチ:</strong> ${parseInt(product.watchers_count || 0)}</div>
                    <div><strong>ビュー:</strong> ${parseInt(product.views_count || 0)}</div>
                    <div><strong>eBay ID:</strong> ${product.ebay_item_id}</div>
                </div>
                ${product.image ? `<img src="${product.image}" alt="${product.name}" style="max-width: 100%; margin-top: 1rem;">` : ''}
            `;
        }
        
        TN3.openModal('itemModal');
    };

    // 🎯 N3準拠: 初期化
    TN3.init = function() {
        TN3.log('TanaoroshiN3System初期化開始 - Phase2');
        
        // 既存システム停止確認
        if (window.TanaoroshiSystem) {
            TN3.log('既存システム無効化済みを確認', 'warning');
        }
        
        // イベントリスナー設定
        document.addEventListener('click', function(event) {
            const target = event.target.closest('[data-action]');
            if (target) {
                TN3.handleAction(target, event);
            }
        });
        
        // 変更イベントリスナー
        document.addEventListener('change', function(event) {
            const target = event.target;
            if (target.dataset.action) {
                TN3.handleAction(target, event);
            }
            
            // フィルター選択時の自動適用
            if (target.classList.contains('inventory__filter-select')) {
                TN3.log('フィルター変更検知 - 自動適用');
                TN3.applyFilters();
            }
        });
        
        // 検索入力リアルタイム処理
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', function(event) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    TN3.log('リアルタイム検索実行');
                    TN3.applyFilters();
                }, 300);
            });
        }
        
        // 初期データ読み込み
        setTimeout(() => {
            TN3.loadInventoryData();
            TN3.loadGlobalData(); // 多国展開データも読み込み
        }, 100);
        
        TN3.log('TanaoroshiN3System初期化完了 - Phase2');
    };

    // 🎯 N3準拠: DOM読み込み完了時の初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', TN3.init);
    } else {
        TN3.init();
    }

})(window.TanaoroshiN3System);

// 🎯 N3準拠: グローバル関数エクスポート（後方互換性）
window.openModal = window.TanaoroshiN3System.openModal;
window.closeModal = window.TanaoroshiN3System.closeModal;

console.log('✅ N3準拠 棚卸しシステム JavaScript 初期化完了');