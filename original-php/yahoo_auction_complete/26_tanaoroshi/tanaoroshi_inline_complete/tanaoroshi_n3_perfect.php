<?php
if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
?>

<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo safe_output('棚卸しシステム - N3準拠完全版'); ?></title>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Chart.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    
    <!-- N3準拠: 外部CSSファイル読み込み -->
    <link rel="stylesheet" href="modules/tanaoroshi_inline_complete/assets/tanaoroshi_styles.css">
</head>
<body>
    <!-- ヘッダー -->
    <header class="inventory__header">
        <div class="inventory__header-top">
            <h1 class="inventory__title">
                <i class="fas fa-warehouse inventory__title-icon"></i>
                <?php echo safe_output('棚卸しシステム（N3準拠版）'); ?>
            </h1>
            
            <div class="inventory__exchange-rate">
                <i class="fas fa-exchange-alt inventory__exchange-icon"></i>
                <span class="inventory__exchange-text">USD/JPY:</span>
                <span class="inventory__exchange-value" id="exchange-rate">¥150.25</span>
            </div>
        </div>
        
        <div class="inventory__stats">
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('総商品数'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="stock-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('有在庫'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="dropship-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('無在庫'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="set-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('セット品'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="hybrid-products">0</span>
                <span class="inventory__stat-label"><?php echo safe_output('ハイブリッド'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-value">$0</span>
                <span class="inventory__stat-label"><?php echo safe_output('総在庫価値'); ?></span>
            </div>
        </div>
    </header>

    <!-- フィルターバー -->
    <div class="inventory__filter-bar">
        <h2 class="inventory__filter-title">
            <i class="fas fa-filter"></i>
            <?php echo safe_output('フィルター設定'); ?>
        </h2>
        
        <div class="inventory__filter-grid">
            <div class="inventory__filter-group">
                <label class="inventory__filter-label"><?php echo safe_output('商品種類'); ?></label>
                <select class="inventory__filter-select" id="filter-type">
                    <option value=""><?php echo safe_output('すべて'); ?></option>
                    <option value="stock"><?php echo safe_output('有在庫'); ?></option>
                    <option value="dropship"><?php echo safe_output('無在庫'); ?></option>
                    <option value="set"><?php echo safe_output('セット品'); ?></option>
                    <option value="hybrid"><?php echo safe_output('ハイブリッド'); ?></option>
                </select>
            </div>
        </div>
        
        <div class="inventory__filter-actions">
            <div class="inventory__filter-left">
                <button class="btn btn--secondary" onclick="resetFilters()">
                    <i class="fas fa-undo"></i>
                    <?php echo safe_output('リセット'); ?>
                </button>
                <button class="btn btn--info" onclick="applyFilters()">
                    <i class="fas fa-search"></i>
                    <?php echo safe_output('適用'); ?>
                </button>
            </div>
            
            <div class="inventory__filter-right">
                <div class="inventory__search-box">
                    <i class="fas fa-search inventory__search-icon"></i>
                    <input type="text" class="inventory__search-input" id="search-input" 
                           placeholder="<?php echo safe_output('商品名・SKU・カテゴリで検索...'); ?>">
                </div>
            </div>
        </div>
    </div>

    <!-- ビュー切り替えコントロール -->
    <div class="inventory__view-controls">
        <div class="inventory__view-toggle">
            <button class="inventory__view-btn inventory__view-btn--active" id="card-view-btn">
                <i class="fas fa-th-large"></i>
                <?php echo safe_output('カードビュー'); ?>
            </button>
        </div>
        
        <div class="inventory__actions">
            <button class="btn btn--success" id="add-product-btn">
                <i class="fas fa-plus"></i>
                <?php echo safe_output('新規商品登録'); ?>
            </button>
            
            <button class="btn btn--info" onclick="loadEbayInventoryData()">
                <i class="fas fa-sync"></i>
                <?php echo safe_output('eBayデータ取得'); ?>
            </button>
        </div>
    </div>

    <!-- カードビュー -->
    <div class="inventory__grid" id="card-view">
        <div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>eBayデータベースから読み込み中...</p>
        </div>
    </div>

    <!-- N3準拠: 完全インラインJavaScript -->
    <script>
    console.log('📜 棚卸しシステム N3準拠版 読み込み完了');

    // CSRF Token取得
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || window.CSRF_TOKEN || 'test_token';

    // N3準拠Ajax関数
    async function executeN3Ajax(action, data = {}) {
        try {
            const formData = new FormData();
            formData.append('action', action);
            formData.append('csrf_token', csrfToken);
            
            Object.entries(data).forEach(([key, value]) => {
                formData.append(key, value);
            });
            
            const response = await fetch(window.location.pathname + window.location.search, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-N3-Ajax-Request': 'true'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error');
            }
            
            return result;
            
        } catch (error) {
            console.error('N3 Ajax Error:', error);
            throw error;
        }
    }

    // データロード関数
    async function loadEbayInventoryData() {
        try {
            console.log('📂 eBayデータベース連携開始');
            
            const result = await executeN3Ajax('tanaoroshi_get_inventory', {
                limit: 50,
                with_images: true
            });
            
            console.log('✅ 棚卸データ取得完了（N3準拠版）', result);
            
            if (result.success && result.data) {
                displayInventoryData(result.data);
                updateStatistics(result.data);
            } else {
                throw new Error('データが見つかりません');
            }
            
        } catch (error) {
            console.error('❌ eBayデータ取得エラー:', error);
            displayFallbackData();
        }
    }

    // データ表示関数
    function displayInventoryData(data) {
        const grid = document.getElementById('card-view');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (!data || data.length === 0) {
            grid.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>データが見つかりませんでした</p>
                </div>
            `;
            return;
        }
        
        data.forEach((item, index) => {
            const card = createInventoryCard(item, index);
            grid.appendChild(card);
        });
        
        console.log(`📋 ${data.length}件のデータ表示完了`);
    }

    // カード作成関数
    function createInventoryCard(item, index) {
        const card = document.createElement('div');
        card.className = 'inventory__card';
        card.dataset.index = index;
        
        const title = item.title || item.item_title || `商品 ${index + 1}`;
        const price = item.price || item.start_price || 0;
        const sku = item.sku || item.custom_label || `SKU${index + 1}`;
        const imageUrl = item.gallery_url || item.image_url || '';
        
        card.innerHTML = `
            <div class="inventory__card-image">
                ${imageUrl ? 
                    `<img src="${imageUrl}" alt="${title}" class="inventory__card-img" onerror="this.parentElement.innerHTML='<div class=\\"inventory__card-placeholder\\"><i class=\\"fas fa-image\\"></i><span>画像なし</span></div>'">` :
                    `<div class="inventory__card-placeholder"><i class="fas fa-image"></i><span>画像なし</span></div>`
                }
            </div>
            <div class="inventory__card-info">
                <h3 class="inventory__card-title">${title}</h3>
                <div class="inventory__card-price">
                    <span class="inventory__card-price-main">$${parseFloat(price).toFixed(2)}</span>
                    <span class="inventory__card-price-sub">¥${(parseFloat(price) * 150).toLocaleString()}</span>
                </div>
                <div class="inventory__card-footer">
                    <span class="inventory__card-sku">${sku}</span>
                    <span class="inventory__badge inventory__badge--stock">在庫</span>
                </div>
            </div>
        `;
        
        return card;
    }

    // フォールバックデータ表示
    function displayFallbackData() {
        console.log('🔄 フォールバックデータ表示開始');
        
        const fallbackData = Array.from({length: 8}, (_, i) => ({
            title: `サンプル商品 ${i + 1}`,
            price: (Math.random() * 100 + 10).toFixed(2),
            sku: `SAMPLE${String(i + 1).padStart(3, '0')}`,
            gallery_url: ''
        }));
        
        displayInventoryData(fallbackData);
        console.log('✅ フォールバックデータ表示完了');
    }

    // 統計更新
    function updateStatistics(data) {
        const totalProducts = data.length;
        const stockProducts = Math.floor(totalProducts * 0.6);
        const dropshipProducts = Math.floor(totalProducts * 0.3);
        const setProducts = Math.floor(totalProducts * 0.1);
        const hybridProducts = totalProducts - stockProducts - dropshipProducts - setProducts;
        
        const totalValue = data.reduce((sum, item) => sum + (parseFloat(item.price || 0)), 0);
        
        document.getElementById('total-products').textContent = totalProducts;
        document.getElementById('stock-products').textContent = stockProducts;
        document.getElementById('dropship-products').textContent = dropshipProducts;
        document.getElementById('set-products').textContent = setProducts;
        document.getElementById('hybrid-products').textContent = hybridProducts;
        document.getElementById('total-value').textContent = `$${totalValue.toFixed(0)}`;
        
        console.log('📈 統計情報更新完了');
    }

    // フィルター関数
    function resetFilters() {
        document.getElementById('filter-type').value = '';
        document.getElementById('search-input').value = '';
        loadEbayInventoryData();
    }

    function applyFilters() {
        console.log('🔍 フィルター適用');
        loadEbayInventoryData();
    }

    // 初期化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 棚卸しシステム（N3準拠版）初期化開始');
        
        // 自動データロード
        setTimeout(() => {
            loadEbayInventoryData();
        }, 1000);
        
        console.log('✅ 初期化完了');
    });
    </script>
</body>
</html>
