/**
 * 🎯 商品承認グリッドシステム JavaScript - N3準拠外部版
 * NAGANO-3 Hooksシステム完全準拠・画像表示修正・高密度レイアウト
 * 修正日: 2025年8月24日
 */

// N3準拠: CAIDS Error Handlerとの統合
if (window.CAIDS_ERROR_HANDLER) {
    console.log('✅ CAIDS Error Handler detected - Integration active');
}

// グローバル変数
window.ShouhinApprovalSystem = window.ShouhinApprovalSystem || {};

(function(SAS) {
    'use strict';

    // システム設定
    SAS.config = {
        version: 'N3-Compliant-v1.0-External-JS',
        debugMode: true,
        maxDisplayItems: 25,
        compactMode: true
    };

    // データストレージ
    SAS.data = {
        selectedProducts: new Set(),
        currentFilter: 'all',
        approvedCount: 0,
        rejectedCount: 0,
        heldCount: 0,
        productData: []
    };

    // ログ関数
    SAS.log = function(message, level = 'info') {
        if (!SAS.config.debugMode) return;
        const timestamp = new Date().toISOString();
        console.log(`[SAS-${level.toUpperCase()}] ${timestamp}: ${message}`);
    };

    // 🔧 緊急修正: カテゴリ別カラーパターン画像（エラー無し）
    SAS.productImages = {
        'EMV-ELE-H-001': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23dbeafe"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%232563eb" font-size="16"%3EApple Watch%3C/text%3E%3C/svg%3E',
        'EMV-TOY-M-002': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23fef3c7"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%23d97706" font-size="16"%3ELEGO%3C/text%3E%3C/svg%3E',
        'EMV-BK-H-003': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23f3e8ff"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%237c3aed" font-size="16"%3EClean Code%3C/text%3E%3C/svg%3E',
        'EMV-CLO-M-004': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23dcfce7"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%2316a34a" font-size="16"%3EUniqlo%3C/text%3E%3C/svg%3E',
        'EMV-ELE-H-005': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23dbeafe"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%232563eb" font-size="16"%3ESony WH-1000XM5%3C/text%3E%3C/svg%3E',
        'EMV-TOY-M-006': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23fef3c7"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%23d97706" font-size="16"%3EJigsaw Puzzle%3C/text%3E%3C/svg%3E',
        'EMV-ELE-H-007': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23dbeafe"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%232563eb" font-size="16"%3EiPad Pro%3C/text%3E%3C/svg%3E',
        'EMV-BK-M-008': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23f3e8ff"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%237c3aed" font-size="16"%3E人を動かす%3C/text%3E%3C/svg%3E',
        'EMV-CLO-H-009': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23dcfce7"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%2316a34a" font-size="16"%3EPatagonia%3C/text%3E%3C/svg%3E',
        'EMV-TOY-M-010': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23fef3c7"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%23d97706" font-size="16"%3ECatan%3C/text%3E%3C/svg%3E',
        'EMV-ELE-H-011': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23dbeafe"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%232563eb" font-size="16"%3EBose Speaker%3C/text%3E%3C/svg%3E',
        'EMV-BK-M-012': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23f3e8ff"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%237c3aed" font-size="16"%3EHarry Potter%3C/text%3E%3C/svg%3E',
        'EMV-ELE-H-013': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23dbeafe"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%232563eb" font-size="16"%3ENintendo Switch%3C/text%3E%3C/svg%3E',
        'EMV-TOY-H-014': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23fef3c7"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%23d97706" font-size="16"%3EPokemon Cards%3C/text%3E%3C/svg%3E',
        'EMV-BK-M-015': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23f3e8ff"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%237c3aed" font-size="16"%3EThink Fast Slow%3C/text%3E%3C/svg%3E',
        'EMV-ELE-H-016': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23dbeafe"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%232563eb" font-size="16"%3EMacBook Pro%3C/text%3E%3C/svg%3E',
        'EMV-TOY-M-017': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23fef3c7"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%23d97706" font-size="16"%3ETamiya%3C/text%3E%3C/svg%3E',
        'EMV-CLO-H-018': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23dcfce7"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%2316a34a" font-size="16"%3ESupreme Hoodie%3C/text%3E%3C/svg%3E',
        'EMV-ELE-M-019': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23dbeafe"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%232563eb" font-size="16"%3EiPhone 14 Pro%3C/text%3E%3C/svg%3E',
        'EMV-BK-H-020': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23f3e8ff"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%237c3aed" font-size="16"%3EProgramming Guide%3C/text%3E%3C/svg%3E',
        'EMV-TOY-H-021': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23fef3c7"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%23d97706" font-size="16"%3EYu-Gi-Oh Cards%3C/text%3E%3C/svg%3E',
        'EMV-CLO-M-022': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23dcfce7"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%2316a34a" font-size="16"%3ENike Air Jordan%3C/text%3E%3C/svg%3E',
        'EMV-ELE-H-023': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23dbeafe"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%232563eb" font-size="16"%3ECanon Camera%3C/text%3E%3C/svg%3E',
        'EMV-BK-M-024': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23f3e8ff"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%237c3aed" font-size="16"%3EAI Revolution%3C/text%3E%3C/svg%3E',
        'EMV-TOY-M-025': 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23fef3c7"/%3E%3Ctext x="150" y="100" text-anchor="middle" fill="%23d97706" font-size="16"%3EDragon Ball%3C/text%3E%3C/svg%3E'
    };

    // 🔧 緊急修正: シンプルなカラーパターンフォールバック画像
    SAS.fallbackImage = 'data:image/svg+xml,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="300" height="200" fill="%23f1f5f9"/%3E%3Crect x="100" y="60" width="100" height="80" rx="8" fill="%23e2e8f0"/%3E%3Ccircle cx="130" cy="90" r="10" fill="%23cbd5e1"/%3E%3Cpath d="M110 120L140 100L170 110L190 130V140H110V120Z" fill="%23cbd5e1"/%3E%3C/svg%3E';

    // 商品データ（可変枚数対応）
    SAS.generateProductData = function() {
        return [
            {
                sku: "EMV-ELE-H-001", risk: "high", ai: "approved", category: "electronics", condition: "new",
                price: 18500, source: "amazon", title: "Apple Watch Series 9 GPS", stock: 1, profitRate: 23.5, profitAmount: 4348
            },
            {
                sku: "EMV-TOY-M-002", risk: "medium", ai: "approved", category: "toys", condition: "new",
                price: 12800, source: "ebay", title: "LEGO Creator Expert 10242", stock: 3, profitRate: 18.2, profitAmount: 2330
            },
            {
                sku: "EMV-BK-H-003", risk: "high", ai: "rejected", category: "books", condition: "used",
                price: 4200, source: "shopify", title: "Clean Code プログラマ必読書", stock: 1, profitRate: 31.8, profitAmount: 1336
            },
            {
                sku: "EMV-CLO-M-004", risk: "medium", ai: "approved", category: "clothing", condition: "new",
                price: 3980, source: "amazon", title: "Uniqlo ヒートテック Tシャツ", stock: 8, profitRate: 15.7, profitAmount: 625
            },
            {
                sku: "EMV-ELE-H-005", risk: "high", ai: "rejected", category: "electronics", condition: "preorder",
                price: 28900, source: "ebay", title: "Sony WH-1000XM5 ヘッドフォン", stock: 1, profitRate: 27.3, profitAmount: 7889
            },
            {
                sku: "EMV-TOY-M-006", risk: "medium", ai: "approved", category: "toys", condition: "used",
                price: 6750, source: "shopify", title: "1000ピース ジグソーパズル", stock: 2, profitRate: 22.1, profitAmount: 1492
            },
            {
                sku: "EMV-ELE-H-007", risk: "high", ai: "approved", category: "electronics", condition: "refurbished",
                price: 45200, source: "amazon", title: "iPad Pro 11インチ 第4世代", stock: 1, profitRate: 19.8, profitAmount: 8950
            },
            {
                sku: "EMV-BK-M-008", risk: "medium", ai: "rejected", category: "books", condition: "new",
                price: 2890, source: "ebay", title: "人を動かす D.カーネギー", stock: 5, profitRate: 24.6, profitAmount: 711
            },
            {
                sku: "EMV-CLO-H-009", risk: "high", ai: "rejected", category: "clothing", condition: "used",
                price: 16500, source: "shopify", title: "Patagonia フリースジャケット", stock: 1, profitRate: 33.2, profitAmount: 5478
            },
            {
                sku: "EMV-TOY-M-010", risk: "medium", ai: "approved", category: "toys", condition: "new",
                price: 8980, source: "amazon", title: "カタン ボードゲーム 日本語版", stock: 4, profitRate: 16.9, profitAmount: 1518
            },
            {
                sku: "EMV-ELE-H-011", risk: "high", ai: "approved", category: "electronics", condition: "new",
                price: 32800, source: "ebay", title: "Bose SoundLink Mini II", stock: 1, profitRate: 28.7, profitAmount: 9414
            },
            {
                sku: "EMV-BK-M-012", risk: "medium", ai: "rejected", category: "books", condition: "used",
                price: 1650, source: "shopify", title: "ハリー・ポッターと賢者の石", stock: 3, profitRate: 29.4, profitAmount: 485
            },
            {
                sku: "EMV-ELE-H-013", risk: "high", ai: "pending", category: "electronics", condition: "new",
                price: 24500, source: "amazon", title: "Nintendo Switch OLED", stock: 2, profitRate: 21.3, profitAmount: 5218
            },
            {
                sku: "EMV-TOY-H-014", risk: "high", ai: "pending", category: "toys", condition: "new",
                price: 15800, source: "ebay", title: "ポケモンカード 未開封BOX", stock: 1, profitRate: 45.2, profitAmount: 7142
            },
            {
                sku: "EMV-BK-M-015", risk: "medium", ai: "approved", category: "books", condition: "new",
                price: 3200, source: "shopify", title: "Think Fast and Slow", stock: 6, profitRate: 18.7, profitAmount: 598
            },
            {
                sku: "EMV-ELE-H-016", risk: "high", ai: "rejected", category: "electronics", condition: "new",
                price: 89800, source: "amazon", title: "MacBook Pro 14インチ M3", stock: 1, profitRate: 12.5, profitAmount: 11225
            },
            {
                sku: "EMV-TOY-M-017", risk: "medium", ai: "approved", category: "toys", condition: "new",
                price: 7800, source: "ebay", title: "タミヤ ミニ四駆 完全セット", stock: 3, profitRate: 25.1, profitAmount: 1958
            },
            {
                sku: "EMV-CLO-H-018", risk: "high", ai: "pending", category: "clothing", condition: "new",
                price: 25600, source: "shopify", title: "Supreme Box Logo Hoodie", stock: 1, profitRate: 38.4, profitAmount: 9830
            },
            {
                sku: "EMV-ELE-M-019", risk: "medium", ai: "approved", category: "electronics", condition: "used",
                price: 14200, source: "amazon", title: "iPhone 14 Pro 128GB", stock: 2, profitRate: 19.7, profitAmount: 2797
            },
            {
                sku: "EMV-BK-H-020", risk: "high", ai: "rejected", category: "books", condition: "new",
                price: 4980, source: "ebay", title: "プログラミング完全ガイド 2024", stock: 4, profitRate: 42.1, profitAmount: 2097
            },
            {
                sku: "EMV-TOY-H-021", risk: "high", ai: "approved", category: "toys", condition: "new",
                price: 18900, source: "shopify", title: "遊戯王 限定コレクション", stock: 1, profitRate: 51.2, profitAmount: 9677
            },
            {
                sku: "EMV-CLO-M-022", risk: "medium", ai: "approved", category: "clothing", condition: "used",
                price: 8900, source: "amazon", title: "Nike Air Jordan 1 Retro", stock: 1, profitRate: 28.3, profitAmount: 2519
            },
            {
                sku: "EMV-ELE-H-023", risk: "high", ai: "pending", category: "electronics", condition: "new",
                price: 35400, source: "ebay", title: "Canon EOS R6 Mark II", stock: 1, profitRate: 22.8, profitAmount: 8071
            },
            {
                sku: "EMV-BK-M-024", risk: "medium", ai: "approved", category: "books", condition: "new",
                price: 2750, source: "shopify", title: "AI革命と未来社会", stock: 8, profitRate: 31.2, profitAmount: 858
            },
            {
                sku: "EMV-TOY-M-025", risk: "medium", ai: "rejected", category: "toys", condition: "new",
                price: 12400, source: "amazon", title: "ドラゴンボール フィギュア", stock: 2, profitRate: 23.8, profitAmount: 2951
            }
        ];
    };

    // カテゴリ日本語名マッピング
    SAS.categoryNames = {
        electronics: "電子機器",
        toys: "おもちゃ",
        books: "書籍",
        clothing: "衣類"
    };

    // 仕入先名マッピング
    SAS.sourceNames = {
        amazon: "Amazon",
        ebay: "eBay",
        shopify: "Shopify"
    };

    // コンディション名取得
    SAS.getConditionName = function(condition) {
        const names = {
            new: "新品",
            used: "中古",
            preorder: "予約",
            refurbished: "整備済"
        };
        return names[condition] || condition;
    };

    // 🔧 コンパクトな商品カード作成（画像重視・半透明テキスト）
    SAS.createProductCard = function(product) {
        const aiClass = `product-card--ai-${product.ai}`;
        const riskClass = `product-card--risk-${product.risk}`;
        const imageUrl = SAS.productImages[product.sku] || SAS.fallbackImage;
        
        return `
            <div class="product-card ${riskClass} ${aiClass}" 
                 data-risk="${product.risk}" 
                 data-ai="${product.ai}"
                 data-category="${product.category}" 
                 data-condition="${product.condition}"
                 data-price="${product.price}"
                 data-source="${product.source}"
                 data-sku="${product.sku}"
                 onclick="window.ShouhinApprovalSystem.toggleSelection(this)">
              
              <div class="product-card__image-container" 
                   style="background-image: url('${imageUrl}');">
                
                <!-- バッジ（画像上） -->
                <div class="product-card__badges">
                  <div class="product-card__badge-left">
                    <div class="product-card__risk-badge product-card__risk-badge--${product.risk}">
                      ${product.risk === 'high' ? '高' : '中'}
                    </div>
                    <div class="product-card__ai-badge product-card__ai-badge--${product.ai}">
                      ${product.ai === 'approved' ? 'AI承認' : product.ai === 'rejected' ? 'AI否認' : 'AI判定待ち'}
                    </div>
                  </div>
                  <div class="product-card__badge-right">
                    <div class="product-card__mall-badge">${SAS.sourceNames[product.source]}</div>
                  </div>
                </div>
                
                <!-- 半透明テキストオーバーレイ -->
                <div class="product-card__text-overlay">
                  <div class="product-card__title">${product.title}</div>
                  <div class="product-card__price">¥${product.price.toLocaleString()}</div>
                  <div class="product-card__details">
                    <span>在庫:${product.stock}</span>
                    <span>利益:${product.profitRate}%</span>
                  </div>
                </div>
                
                <!-- プレースホルダー（画像エラー時） -->
                <div class="product-card__image-placeholder" style="display: none;">
                  <i class="fas fa-image"></i>
                </div>
              </div>
              
              <!-- 情報セクション（コンパクト） -->
              <div class="product-card__info">
                <div class="product-card__category">${SAS.categoryNames[product.category]}</div>
                <div class="product-card__footer">
                  <div class="product-card__condition product-card__condition--${product.condition}">
                    ${SAS.getConditionName(product.condition)}
                  </div>
                  <div class="product-card__sku">${product.sku}</div>
                </div>
              </div>
            </div>
        `;
    };

    // 商品レンダリング
    SAS.renderProducts = function(products) {
        const grid = document.getElementById('productGrid');
        if (!grid) {
            SAS.log('商品グリッド要素が見つかりません', 'error');
            return;
        }
        
        grid.innerHTML = products.map(product => SAS.createProductCard(product)).join('');
        
        // 画像エラー処理
        SAS.setupImageErrorHandling();
        
        SAS.log(`商品レンダリング完了: ${products.length}件`);
    };

    // 🔧 緊急修正: 画像エラー処理設定（SVG画像用）
    SAS.setupImageErrorHandling = function() {
        const containers = document.querySelectorAll('.product-card__image-container');
        containers.forEach(container => {
            const bgImage = container.style.backgroundImage;
            
            // データURL（SVG）の場合はエラーチェックをスキップ
            if (bgImage && bgImage.startsWith('url("data:image/svg+xml')) {
                SAS.log('SVGデータURL検出 - エラーチェックをスキップ', 'info');
                return;
            }
            
            // 外部URL画像の場合のみエラーチェック実行
            if (bgImage && bgImage.startsWith('url("http')) {
                const img = new Image();
                const url = bgImage.slice(5, -2); // url('...') から ... を抽出
                
                img.onerror = function() {
                    container.style.backgroundImage = `url('${SAS.fallbackImage}')`;
                    SAS.log('画像エラー - フォールバックに切り替え: ' + url, 'warning');
                };
                
                img.src = url;
            }
        });
        
        SAS.log('画像エラー処理設定完了', 'info');
    };

    // フィルター初期化
    SAS.initializeFilters = function() {
        const filterButtons = document.querySelectorAll('.approval__filter-btn');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                if (this.dataset.filter) {
                    const group = this.closest('.approval__filter-group');
                    const groupButtons = group.querySelectorAll('.approval__filter-btn');
                    groupButtons.forEach(btn => btn.classList.remove('approval__filter-btn--active'));
                    
                    this.classList.add('approval__filter-btn--active');
                    SAS.applyFilter(this.dataset.filter);
                }
            });
        });
    };

    // フィルター適用
    SAS.applyFilter = function(filter) {
        SAS.data.currentFilter = filter;
        const cards = document.querySelectorAll('.product-card');
        
        cards.forEach(card => {
            let show = true;
            
            if (filter === 'all') {
                show = true;
            } else if (filter === 'ai-approved') {
                show = card.dataset.ai === 'approved';
            } else if (filter === 'ai-rejected') {
                show = card.dataset.ai === 'rejected';
            } else if (filter === 'ai-pending') {
                show = card.dataset.ai === 'pending';
            } else if (filter === 'high-risk') {
                show = card.dataset.risk === 'high';
            } else if (filter === 'medium-risk') {
                show = card.dataset.risk === 'medium';
            } else if (filter === 'low-price') {
                const price = parseInt(card.dataset.price);
                show = price <= 5000;
            } else if (filter === 'medium-price') {
                const price = parseInt(card.dataset.price);
                show = price > 5000 && price <= 20000;
            } else if (filter === 'high-price') {
                const price = parseInt(card.dataset.price);
                show = price > 20000;
            }
            
            if (show) {
                card.style.display = 'block';
                card.style.animation = 'cardSlideIn 0.3s ease';
            } else {
                card.style.display = 'none';
            }
        });
        
        SAS.log(`フィルター適用: ${filter}`);
    };

    // 商品選択の切り替え（クリック選択）
    SAS.toggleSelection = function(card) {
        if (!card || !card.dataset.sku) {
            SAS.log('Invalid card element', 'warning');
            return;
        }
        
        const sku = card.dataset.sku;
        
        if (SAS.data.selectedProducts.has(sku)) {
            SAS.data.selectedProducts.delete(sku);
            card.classList.remove('product-card--selected');
        } else {
            SAS.data.selectedProducts.add(sku);
            card.classList.add('product-card--selected');
        }
        
        SAS.updateBulkActions();
    };

    // 一括操作バーの更新
    SAS.updateBulkActions = function() {
        const bulkActions = document.getElementById('bulkActions');
        const selectedCount = document.getElementById('selectedCount');
        
        if (SAS.data.selectedProducts.size > 0) {
            bulkActions.classList.add('approval__bulk-actions--show');
            selectedCount.textContent = SAS.data.selectedProducts.size;
        } else {
            bulkActions.classList.remove('approval__bulk-actions--show');
        }
    };

    // 一括選択機能
    SAS.selectAllVisible = function() {
        const visibleCards = document.querySelectorAll('.product-card:not([style*="display: none"])');
        visibleCards.forEach(card => {
            if (card.dataset.sku && !SAS.data.selectedProducts.has(card.dataset.sku)) {
                SAS.data.selectedProducts.add(card.dataset.sku);
                card.classList.add('product-card--selected');
            }
        });
        SAS.updateBulkActions();
        SAS.showNotification(`${visibleCards.length}件の表示中商品を全選択しました`, 'info');
    };

    SAS.deselectAll = function() {
        SAS.data.selectedProducts.clear();
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            card.classList.remove('product-card--selected');
        });
        SAS.updateBulkActions();
        SAS.showNotification('全選択を解除しました', 'info');
    };

    // 承認・否認・保留処理
    SAS.bulkApprove = function() {
        if (SAS.data.selectedProducts.size === 0) {
            SAS.showNotification('商品が選択されていません', 'warning');
            return;
        }
        
        if (confirm(`${SAS.data.selectedProducts.size}件の商品を承認しますか？`)) {
            const selectedCards = [];
            document.querySelectorAll('.product-card').forEach(card => {
                if (card.dataset.sku && SAS.data.selectedProducts.has(card.dataset.sku)) {
                    selectedCards.push(card);
                }
            });
            
            selectedCards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.transform = 'scale(0.9)';
                    card.style.opacity = '0.5';
                    card.style.backgroundColor = '#f0fdf4';
                    card.style.borderColor = '#22c55e';
                    
                    setTimeout(() => {
                        if (card.parentNode) {
                            const cardSku = card.dataset.sku;
                            const productIndex = SAS.data.productData.findIndex(p => p.sku === cardSku);
                            if (productIndex !== -1) {
                                SAS.data.productData.splice(productIndex, 1);
                            }
                            card.remove();
                        }
                        SAS.data.approvedCount++;
                    }, 500);
                }, index * 100);
            });
            
            SAS.data.selectedProducts.clear();
            SAS.updateBulkActions();
            
            setTimeout(() => {
                SAS.showNotification(`${selectedCards.length}件の商品を承認しました`, 'success');
                SAS.updateStats();
            }, 1000);
        }
    };

    SAS.bulkReject = function() {
        if (SAS.data.selectedProducts.size === 0) {
            SAS.showNotification('商品が選択されていません', 'warning');
            return;
        }
        
        if (confirm(`${SAS.data.selectedProducts.size}件の商品を否認しますか？`)) {
            const selectedCards = [];
            document.querySelectorAll('.product-card').forEach(card => {
                if (card.dataset.sku && SAS.data.selectedProducts.has(card.dataset.sku)) {
                    selectedCards.push(card);
                }
            });
            
            selectedCards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.transform = 'scale(0.9)';
                    card.style.opacity = '0.5';
                    card.style.backgroundColor = '#fef2f2';
                    card.style.borderColor = '#ef4444';
                    
                    setTimeout(() => {
                        if (card.parentNode) {
                            const cardSku = card.dataset.sku;
                            const productIndex = SAS.data.productData.findIndex(p => p.sku === cardSku);
                            if (productIndex !== -1) {
                                SAS.data.productData.splice(productIndex, 1);
                            }
                            card.remove();
                        }
                        SAS.data.rejectedCount++;
                    }, 500);
                }, index * 100);
            });
            
            SAS.data.selectedProducts.clear();
            SAS.updateBulkActions();
            
            setTimeout(() => {
                SAS.showNotification(`${selectedCards.length}件の商品を否認しました`, 'danger');
                SAS.updateStats();
            }, 1000);
        }
    };

    SAS.bulkHold = function() {
        if (SAS.data.selectedProducts.size === 0) {
            SAS.showNotification('商品が選択されていません', 'warning');
            return;
        }
        
        if (confirm(`${SAS.data.selectedProducts.size}件の商品を保留にしますか？`)) {
            const selectedCards = [];
            document.querySelectorAll('.product-card').forEach(card => {
                if (card.dataset.sku && SAS.data.selectedProducts.has(card.dataset.sku)) {
                    selectedCards.push(card);
                }
            });
            
            selectedCards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.transform = 'scale(0.9)';
                    card.style.opacity = '0.5';
                    card.style.backgroundColor = '#fefbf0';
                    card.style.borderColor = '#f59e0b';
                    
                    setTimeout(() => {
                        if (card.parentNode) {
                            const cardSku = card.dataset.sku;
                            const productIndex = SAS.data.productData.findIndex(p => p.sku === cardSku);
                            if (productIndex !== -1) {
                                SAS.data.productData.splice(productIndex, 1);
                            }
                            card.remove();
                        }
                        SAS.data.heldCount++;
                    }, 500);
                }, index * 100);
            });
            
            SAS.data.selectedProducts.clear();
            SAS.updateBulkActions();
            
            setTimeout(() => {
                SAS.showNotification(`${selectedCards.length}件の商品を保留にしました`, 'warning');
                SAS.updateStats();
            }, 1000);
        }
    };

    // 選択クリア
    SAS.clearSelection = function() {
        SAS.data.selectedProducts.clear();
        
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            card.classList.remove('product-card--selected');
        });
        
        SAS.updateBulkActions();
        SAS.showNotification('選択をクリアしました', 'info');
    };

    // 統計更新
    SAS.updateStats = function() {
        const remainingCards = document.querySelectorAll('.product-card').length;
        
        const pendingCountEl = document.getElementById('pendingCount');
        const totalProductCountEl = document.getElementById('totalProductCount');
        const totalCountEl = document.getElementById('totalCount');
        const displayRangeEl = document.getElementById('displayRange');
        
        if (pendingCountEl) pendingCountEl.textContent = remainingCards;
        if (totalProductCountEl) totalProductCountEl.textContent = remainingCards;
        if (totalCountEl) totalCountEl.textContent = remainingCards;
        if (displayRangeEl) displayRangeEl.textContent = `1-${remainingCards}件表示`;
        
        SAS.updateFilterCounts();
        
        SAS.log(`承認済み: ${SAS.data.approvedCount}件, 否認済み: ${SAS.data.rejectedCount}件, 保留: ${SAS.data.heldCount}件, 残り: ${remainingCards}件`);
    };

    // フィルターカウント更新
    SAS.updateFilterCounts = function() {
        const cards = document.querySelectorAll('.product-card');
        
        const counts = {
            all: cards.length,
            aiApproved: 0,
            aiRejected: 0,
            aiPending: 0,
            highRisk: 0,
            mediumRisk: 0,
            lowPrice: 0,
            mediumPrice: 0,
            highPrice: 0
        };
        
        cards.forEach(card => {
            const ai = card.dataset.ai;
            const risk = card.dataset.risk;
            const price = parseInt(card.dataset.price);
            
            if (ai === 'approved') counts.aiApproved++;
            if (ai === 'rejected') counts.aiRejected++;
            if (ai === 'pending') counts.aiPending++;
            
            if (risk === 'high') counts.highRisk++;
            if (risk === 'medium') counts.mediumRisk++;
            
            if (price <= 5000) counts.lowPrice++;
            if (price > 5000 && price <= 20000) counts.mediumPrice++;
            if (price > 20000) counts.highPrice++;
        });
        
        // DOM更新
        const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        
        updateElement('countAll', counts.all);
        updateElement('countAiApproved', counts.aiApproved);
        updateElement('countAiRejected', counts.aiRejected);
        updateElement('countAiPending', counts.aiPending);
        updateElement('countHighRisk', counts.highRisk);
        updateElement('countMediumRisk', counts.mediumRisk);
        updateElement('countLowPrice', counts.lowPrice);
        updateElement('countMediumPrice', counts.mediumPrice);
        updateElement('countHighPrice', counts.highPrice);
    };

    // 通知表示
    SAS.showNotification = function(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColors = {
            success: 'var(--filter-success)',
            warning: 'var(--filter-warning)',
            danger: 'var(--filter-danger)',
            info: 'var(--filter-info)'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${bgColors[type] || bgColors.info};
            color: white;
            border-radius: 8px;
            font-weight: 500;
            z-index: 1000;
            animation: cardSlideIn 0.3s ease;
            box-shadow: var(--shadow-lg);
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    };

    // キーボードショートカット
    SAS.setupKeyboardShortcuts = function() {
        document.addEventListener('keydown', function(e) {
            // Ctrl+A: 全選択
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                SAS.selectAllVisible();
            }
            
            // Escape: 選択クリア
            if (e.key === 'Escape') {
                SAS.clearSelection();
            }
            
            // Enter: 一括承認
            if (e.key === 'Enter' && SAS.data.selectedProducts.size > 0) {
                SAS.bulkApprove();
            }
            
            // R: 一括否認
            if (e.key === 'r' && SAS.data.selectedProducts.size > 0) {
                SAS.bulkReject();
            }
            
            // H: 一括保留
            if (e.key === 'h' && SAS.data.selectedProducts.size > 0) {
                SAS.bulkHold();
            }
        });
    };

    // 初期化
    SAS.init = function() {
        SAS.log('商品承認グリッドシステム初期化開始 - N3準拠外部版');
        
        // データ生成・保存
        SAS.data.productData = SAS.generateProductData();
        
        // 商品レンダリング
        SAS.renderProducts(SAS.data.productData);
        
        // フィルター初期化
        SAS.initializeFilters();
        
        // 一括操作バー更新
        SAS.updateBulkActions();
        
        // 統計更新
        SAS.updateStats();
        
        // キーボードショートカット
        SAS.setupKeyboardShortcuts();
        
        // システム準備完了
        document.body.dataset.systemReady = 'true';
        
        SAS.log('商品承認グリッドシステム初期化完了 - N3準拠外部版');
    };

    // DOM読み込み完了時の初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', SAS.init);
    } else {
        SAS.init();
    }

})(window.ShouhinApprovalSystem);

// グローバル関数エクスポート（HTMLからの呼び出し用）
window.selectAllVisible = function() {
    if (window.ShouhinApprovalSystem) {
        return window.ShouhinApprovalSystem.selectAllVisible();
    }
};

window.deselectAll = function() {
    if (window.ShouhinApprovalSystem) {
        return window.ShouhinApprovalSystem.deselectAll();
    }
};

window.bulkApprove = function() {
    if (window.ShouhinApprovalSystem) {
        return window.ShouhinApprovalSystem.bulkApprove();
    }
};

window.bulkReject = function() {
    if (window.ShouhinApprovalSystem) {
        return window.ShouhinApprovalSystem.bulkReject();
    }
};

window.bulkHold = function() {
    if (window.ShouhinApprovalSystem) {
        return window.ShouhinApprovalSystem.bulkHold();
    }
};

window.clearSelection = function() {
    if (window.ShouhinApprovalSystem) {
        return window.ShouhinApprovalSystem.clearSelection();
    }
};

console.log('✅ 商品承認グリッドシステム JavaScript N3準拠外部版 初期化完了');