<?php
if (!defined('SECURE_ACCESS')) {
    die('Direct access not allowed');
}

// XSS対策関数
function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
?>

<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo safe_output('棚卸しシステム - 8枚横並び修正版'); ?></title>
    
    <!-- 外部リソース -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- 外部CSSファイル読み込み -->
    <link rel="stylesheet" href="modules/tanaoroshi_inline_complete/assets/tanaoroshi_styles.css">
    
    <style>
    /* ===== 🎯 8枚横並び専用修正CSS ===== */
    
    /* メインコンテナの調整 */
    .main-content {
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
    }
    
    /* 🔥 重要：8枚横並びグリッド設定 */
    .inventory__grid {
        display: grid !important;
        grid-template-columns: repeat(8, 1fr) !important; /* 8列固定 */
        gap: 0.75rem !important;
        padding: 1rem !important;
        background: var(--bg-primary, #f8fafc) !important;
        min-height: calc(100vh - 400px) !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
    }
    
    /* カード設定（幅は伸縮せず等分） */
    .inventory__card {
        background: var(--bg-secondary, #ffffff) !important;
        border: 1px solid var(--border-color, #e2e8f0) !important;
        border-radius: var(--radius-lg, 0.75rem) !important;
        overflow: hidden !important;
        cursor: pointer !important;
        transition: all 0.2s ease-in-out !important;
        position: relative !important;
        display: flex !important;
        flex-direction: column !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
        
        /* 🎯 重要：固定高さ、幅は自動（等分） */
        height: 320px !important;
        width: 100% !important;
        min-width: 0 !important; /* フレックス要素の縮小を許可 */
        max-width: 100% !important;
    }
    
    .inventory__card:hover {
        box-shadow: 0 4px 20px rgba(0,0,0,0.12) !important;
        transform: translateY(-2px) !important;
        border-color: #3b82f6 !important;
        z-index: 5 !important;
    }
    
    /* 画像エリア */
    .inventory__card-image {
        position: relative !important;
        height: 140px !important;
        background: var(--bg-tertiary, #f1f5f9) !important;
        overflow: hidden !important;
        flex-shrink: 0 !important;
    }
    
    .inventory__card-img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        object-position: center !important;
    }
    
    .inventory__card-placeholder {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 100% !important;
        background: var(--bg-tertiary, #f1f5f9) !important;
        color: var(--text-muted, #64748b) !important;
        flex-direction: column !important;
        gap: 0.5rem !important;
        font-size: 32px !important;
    }
    
    /* 情報エリア */
    .inventory__card-info {
        padding: 0.75rem !important;
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 0.5rem !important;
        justify-content: space-between !important;
        min-height: 0 !important;
    }
    
    .inventory__card-title {
        font-size: 0.8rem !important;
        font-weight: 600 !important;
        color: var(--text-primary, #1e293b) !important;
        line-height: 1.2 !important;
        margin: 0 !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        overflow: hidden !important;
        height: 1.92rem !important; /* 2行分 */
    }
    
    .inventory__card-price {
        display: flex !important;
        flex-direction: column !important;
        gap: 0.25rem !important;
    }
    
    .inventory__card-price-main {
        font-size: 0.9rem !important;
        font-weight: 700 !important;
        color: #e74c3c !important;
    }
    
    .inventory__card-price-sub {
        font-size: 0.7rem !important;
        color: var(--text-muted, #64748b) !important;
    }
    
    /* フッター */
    .inventory__card-footer {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-top: auto !important;
        padding-top: 0.5rem !important;
        border-top: 1px solid var(--border-light, #f1f5f9) !important;
        font-size: 0.7rem !important;
        min-height: 1.5rem !important;
    }
    
    .inventory__card-sku {
        font-size: 0.65rem !important;
        color: var(--text-muted, #64748b) !important;
        font-family: monospace !important;
        background: var(--bg-tertiary, #f1f5f9) !important;
        padding: 0.125rem 0.25rem !important;
        border-radius: 0.25rem !important;
        max-width: 60px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }
    
    .inventory__badge {
        padding: 0.125rem 0.375rem !important;
        border-radius: 0.25rem !important;
        font-size: 0.6rem !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
        color: white !important;
    }
    
    .inventory__badge--stock { background: #059669 !important; }
    .inventory__badge--dropship { background: #7c3aed !important; }
    .inventory__badge--set { background: #dc6803 !important; }
    .inventory__badge--hybrid { background: #0e7490 !important; }
    
    .inventory__card-badges {
        position: absolute !important;
        top: 0.5rem !important;
        left: 0.5rem !important;
        right: 0.5rem !important;
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 0.25rem !important;
        z-index: 5 !important;
        pointer-events: none !important;
    }
    
    .inventory__channel-badges {
        display: flex !important;
        gap: 0.125rem !important;
        margin-top: 0.25rem !important;
    }
    
    .inventory__channel-badge {
        padding: 0.125rem 0.25rem !important;
        border-radius: 0.125rem !important;
        font-size: 0.5rem !important;
        font-weight: 700 !important;
        background: rgba(255, 255, 255, 0.9) !important;
        color: var(--text-primary, #1e293b) !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
    }
    
    .inventory__channel-badge--ebay { background: #0064d2 !important; color: white !important; }
    .inventory__channel-badge--mercari { background: #d63384 !important; color: white !important; }
    .inventory__channel-badge--shopify { background: #96bf48 !important; color: white !important; }
    
    /* レスポンシブ対応 */
    @media (max-width: 1600px) {
        .inventory__grid { grid-template-columns: repeat(6, 1fr) !important; }
    }
    
    @media (max-width: 1200px) {
        .inventory__grid { grid-template-columns: repeat(4, 1fr) !important; }
    }
    
    @media (max-width: 768px) {
        .inventory__grid { 
            grid-template-columns: repeat(2, 1fr) !important; 
            gap: 0.5rem !important; 
        }
        .inventory__card { height: 280px !important; }
        .inventory__card-image { height: 120px !important; }
    }
    
    @media (max-width: 480px) {
        .inventory__grid { grid-template-columns: 1fr !important; }
        .inventory__card { height: 260px !important; }
        .inventory__card-image { height: 100px !important; }
    }
    
    /* データソース情報の調整 */
    .data-source-info {
        grid-column: 1 / -1 !important;
        margin-bottom: 1rem !important;
        padding: 1rem !important;
        background: white !important;
        border-radius: var(--radius-lg, 0.75rem) !important;
        border-left: 4px solid #3b82f6 !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
    }
    </style>
</head>
<body>
    <!-- ヘッダー -->
    <header class="inventory__header">
        <div class="inventory__header-top">
            <h1 class="inventory__title">
                <i class="fas fa-warehouse inventory__title-icon"></i>
                <?php echo safe_output('棚卸しシステム（8枚横並び修正版）'); ?>
            </h1>
            
            <div class="inventory__exchange-rate">
                <i class="fas fa-exchange-alt inventory__exchange-icon"></i>
                <span class="inventory__exchange-text">USD/JPY:</span>
                <span class="inventory__exchange-value" id="exchange-rate">¥150.25</span>
            </div>
        </div>
        
        <div class="inventory__stats">
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-products">8</span>
                <span class="inventory__stat-label"><?php echo safe_output('総商品数'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="stock-products">6</span>
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
                <span class="inventory__stat-number" id="hybrid-products">2</span>
                <span class="inventory__stat-label"><?php echo safe_output('ハイブリッド'); ?></span>
            </div>
            <div class="inventory__stat">
                <span class="inventory__stat-number" id="total-value">$1,247.92</span>
                <span class="inventory__stat-label"><?php echo safe_output('総在庫価値'); ?></span>
            </div>
        </div>
    </header>

    <!-- ビュー切り替えコントロール -->
    <div class="inventory__view-controls">
        <div class="inventory__view-toggle">
            <button class="inventory__view-btn inventory__view-btn--active" id="card-view-btn">
                <i class="fas fa-th-large"></i>
                <?php echo safe_output('カードビュー（8枚横並び）'); ?>
            </button>
        </div>
        
        <div class="inventory__actions">
            <button class="btn btn--info" onclick="window.location.reload()">
                <i class="fas fa-sync"></i>
                <?php echo safe_output('表示更新'); ?>
            </button>
        </div>
    </div>

    <!-- 🎯 カードビュー（8枚横並び） -->
    <div class="inventory__grid" id="card-view">
        
        <!-- カード1 -->
        <div class="inventory__card">
            <div class="inventory__card-image">
                <img src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop" 
                     alt="商品1" class="inventory__card-img">
                <div class="inventory__card-badges">
                    <span class="inventory__badge inventory__badge--stock">有在庫</span>
                    <div class="inventory__channel-badges">
                        <span class="inventory__channel-badge inventory__channel-badge--ebay">eBay</span>
                        <span class="inventory__channel-badge inventory__channel-badge--mercari">メルカリ</span>
                        <span class="inventory__channel-badge inventory__channel-badge--shopify">Shopify</span>
                    </div>
                </div>
            </div>
            <div class="inventory__card-info">
                <h3 class="inventory__card-title">Premium Golf Equipment - Professional Grade Performance</h3>
                <div class="inventory__card-price">
                    <span class="inventory__card-price-main">$299.99</span>
                    <span class="inventory__card-price-sub">在庫: 12個</span>
                </div>
                <div class="inventory__card-footer">
                    <span class="inventory__card-sku">GOLF-DRV-001</span>
                    <span style="color: #059669; font-weight: 600;">新品</span>
                </div>
            </div>
        </div>

        <!-- カード2 -->
        <div class="inventory__card">
            <div class="inventory__card-image">
                <img src="https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=200&fit=crop" 
                     alt="商品2" class="inventory__card-img">
                <div class="inventory__card-badges">
                    <span class="inventory__badge inventory__badge--stock">有在庫</span>
                    <div class="inventory__channel-badges">
                        <span class="inventory__channel-badge inventory__channel-badge--ebay">eBay</span>
                    </div>
                </div>
            </div>
            <div class="inventory__card-info">
                <h3 class="inventory__card-title">Advanced Electronic Device - Premium Technology</h3>
                <div class="inventory__card-price">
                    <span class="inventory__card-price-main">$149.99</span>
                    <span class="inventory__card-price-sub">在庫: 8個</span>
                </div>
                <div class="inventory__card-footer">
                    <span class="inventory__card-sku">ELEC-ADV-002</span>
                    <span style="color: #f59e0b; font-weight: 600;">中古</span>
                </div>
            </div>
        </div>

        <!-- カード3 -->
        <div class="inventory__card">
            <div class="inventory__card-image">
                <img src="https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=300&h=200&fit=crop" 
                     alt="商品3" class="inventory__card-img">
                <div class="inventory__card-badges">
                    <span class="inventory__badge inventory__badge--stock">有在庫</span>
                    <div class="inventory__channel-badges">
                        <span class="inventory__channel-badge inventory__channel-badge--ebay">eBay</span>
                        <span class="inventory__channel-badge inventory__channel-badge--shopify">Shopify</span>
                    </div>
                </div>
            </div>
            <div class="inventory__card-info">
                <h3 class="inventory__card-title">Professional Sports Equipment - High Performance</h3>
                <div class="inventory__card-price">
                    <span class="inventory__card-price-main">$89.99</span>
                    <span class="inventory__card-price-sub">在庫: 5個</span>
                </div>
                <div class="inventory__card-footer">
                    <span class="inventory__card-sku">SPORT-PRO-003</span>
                    <span style="color: #059669; font-weight: 600;">新品</span>
                </div>
            </div>
        </div>

        <!-- カード4 -->
        <div class="inventory__card">
            <div class="inventory__card-image">
                <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=200&fit=crop" 
                     alt="商品4" class="inventory__card-img">
                <div class="inventory__card-badges">
                    <span class="inventory__badge inventory__badge--stock">有在庫</span>
                    <div class="inventory__channel-badges">
                        <span class="inventory__channel-badge inventory__channel-badge--ebay">eBay</span>
                    </div>
                </div>
            </div>
            <div class="inventory__card-info">
                <h3 class="inventory__card-title">Premium Quality Product - Professional Grade Watch</h3>
                <div class="inventory__card-price">
                    <span class="inventory__card-price-main">$199.99</span>
                    <span class="inventory__card-price-sub">在庫: 3個</span>
                </div>
                <div class="inventory__card-footer">
                    <span class="inventory__card-sku">WATCH-LUX-004</span>
                    <span style="color: #059669; font-weight: 600;">新品</span>
                </div>
            </div>
        </div>

        <!-- カード5 -->
        <div class="inventory__card">
            <div class="inventory__card-image">
                <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop" 
                     alt="商品5" class="inventory__card-img">
                <div class="inventory__card-badges">
                    <span class="inventory__badge inventory__badge--stock">有在庫</span>
                    <div class="inventory__channel-badges">
                        <span class="inventory__channel-badge inventory__channel-badge--ebay">eBay</span>
                        <span class="inventory__channel-badge inventory__channel-badge--mercari">メルカリ</span>
                    </div>
                </div>
            </div>
            <div class="inventory__card-info">
                <h3 class="inventory__card-title">Premium Smartphone Accessory - Advanced Protection</h3>
                <div class="inventory__card-price">
                    <span class="inventory__card-price-main">$39.99</span>
                    <span class="inventory__card-price-sub">在庫: 25個</span>
                </div>
                <div class="inventory__card-footer">
                    <span class="inventory__card-sku">PHONE-ACC-005</span>
                    <span style="color: #059669; font-weight: 600;">新品</span>
                </div>
            </div>
        </div>

        <!-- カード6 -->
        <div class="inventory__card">
            <div class="inventory__card-image">
                <img src="https://images.unsplash.com/photo-1560879234-44e610b6ed46?w=300&h=200&fit=crop" 
                     alt="商品6" class="inventory__card-img">
                <div class="inventory__card-badges">
                    <span class="inventory__badge inventory__badge--stock">有在庫</span>
                    <div class="inventory__channel-badges">
                        <span class="inventory__channel-badge inventory__channel-badge--ebay">eBay</span>
                    </div>
                </div>
            </div>
            <div class="inventory__card-info">
                <h3 class="inventory__card-title">Professional Gaming Equipment - Tournament Grade</h3>
                <div class="inventory__card-price">
                    <span class="inventory__card-price-main">$79.99</span>
                    <span class="inventory__card-price-sub">在庫: 7個</span>
                </div>
                <div class="inventory__card-footer">
                    <span class="inventory__card-sku">GAME-PRO-006</span>
                    <span style="color: #f59e0b; font-weight: 600;">中古</span>
                </div>
            </div>
        </div>

        <!-- カード7 -->
        <div class="inventory__card">
            <div class="inventory__card-image">
                <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop" 
                     alt="商品7" class="inventory__card-img">
                <div class="inventory__card-badges">
                    <span class="inventory__badge inventory__badge--hybrid">ハイブリッド</span>
                    <div class="inventory__channel-badges">
                        <span class="inventory__channel-badge inventory__channel-badge--ebay">eBay</span>
                        <span class="inventory__channel-badge inventory__channel-badge--shopify">Shopify</span>
                    </div>
                </div>
            </div>
            <div class="inventory__card-info">
                <h3 class="inventory__card-title">Premium Fashion Item - Luxury Brand Sneakers</h3>
                <div class="inventory__card-price">
                    <span class="inventory__card-price-main">$129.99</span>
                    <span class="inventory__card-price-sub">在庫: 0個</span>
                </div>
                <div class="inventory__card-footer">
                    <span class="inventory__card-sku">SHOES-LUX-007</span>
                    <span style="color: #e74c3c; font-weight: 600;">在庫切れ</span>
                </div>
            </div>
        </div>

        <!-- カード8 -->
        <div class="inventory__card">
            <div class="inventory__card-image">
                <img src="https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&h=200&fit=crop" 
                     alt="商品8" class="inventory__card-img">
                <div class="inventory__card-badges">
                    <span class="inventory__badge inventory__badge--hybrid">ハイブリッド</span>
                    <div class="inventory__channel-badges">
                        <span class="inventory__channel-badge inventory__channel-badge--ebay">eBay</span>
                        <span class="inventory__channel-badge inventory__channel-badge--mercari">メルカリ</span>
                    </div>
                </div>
            </div>
            <div class="inventory__card-info">
                <h3 class="inventory__card-title">Advanced Technology Device - Premium Wireless</h3>
                <div class="inventory__card-price">
                    <span class="inventory__card-price-main">$179.99</span>
                    <span class="inventory__card-price-sub">在庫: 0個</span>
                </div>
                <div class="inventory__card-footer">
                    <span class="inventory__card-sku">AUDIO-WL-008</span>
                    <span style="color: #e74c3c; font-weight: 600;">在庫切れ</span>
                </div>
            </div>
        </div>

    </div>

    <script>
    // 開発用ログ
    console.log('✅ 8枚横並びレイアウト（元HTML・CSS準拠）表示完了');
    console.log('📊 表示データ:', {
        cardCount: 8,
        gridColumns: '8列（レスポンシブ対応）',
        cardHeight: '320px固定',
        width: '幅は伸縮せず等分'
    });
    
    // レスポンシブ確認用
    function checkResponsive() {
        const width = window.innerWidth;
        if (width <= 480) {
            console.log('📱 モバイル表示: 1列');
        } else if (width <= 768) {
            console.log('📱 タブレット表示: 2列');
        } else if (width <= 1200) {
            console.log('💻 ノートPC表示: 4列');
        } else if (width <= 1600) {
            console.log('🖥️ ワイド表示: 6列');
        } else {
            console.log('🖥️ デスクトップ表示: 8列');
        }
    }
    
    window.addEventListener('resize', checkResponsive);
    checkResponsive(); // 初期実行
    </script>
    
</body>
</html>
