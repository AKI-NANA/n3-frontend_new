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
    <title><?php echo safe_output('棚卸しシステム - 8枚カード表示版'); ?></title>
    
    <!-- 外部リソース -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
    /* ===== 🎯 完全新設計：8枚カードレイアウト ===== */
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f8fafc;
        color: #1e293b;
        line-height: 1.6;
    }
    
    .container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 20px;
    }
    
    /* ===== ヘッダー ===== */
    .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        border-radius: 15px;
        margin-bottom: 30px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .header-title {
        font-size: 32px;
        font-weight: 700;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .header-subtitle {
        font-size: 16px;
        opacity: 0.9;
        font-weight: 400;
    }
    
    /* ===== 統計カード ===== */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
    }
    
    .stat-card {
        background: white;
        padding: 25px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        text-align: center;
        border-left: 5px solid #667eea;
        transition: transform 0.2s ease;
    }
    
    .stat-card:hover {
        transform: translateY(-5px);
    }
    
    .stat-number {
        font-size: 28px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 8px;
        display: block;
    }
    
    .stat-label {
        font-size: 14px;
        color: #7f8c8d;
        font-weight: 500;
    }
    
    /* ===== 🔥 重要：商品グリッド（8枚カード表示） ===== */
    .products-section {
        background: white;
        border-radius: 15px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        overflow: hidden;
        margin-bottom: 30px;
    }
    
    .products-header {
        background: #f8f9fa;
        padding: 20px 25px;
        border-bottom: 1px solid #e9ecef;
        font-weight: 600;
        color: #2c3e50;
        font-size: 18px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .products-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0;
        padding: 0;
    }
    
    /* ===== 🎯 カード設計（分割防止の核心設計） ===== */
    .product-card {
        /* ブロック要素として設計 */
        display: block;
        background: white;
        border: 1px solid #e9ecef;
        padding: 20px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        
        /* カード分割防止設定 */
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        -webkit-column-break-inside: avoid !important;
        
        /* 固定高さでカード統一 */
        height: 350px;
        width: 100%;
    }
    
    .product-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 15px 40px rgba(0,0,0,0.15);
        border-color: #667eea;
        z-index: 5;
    }
    
    /* ===== 商品画像エリア ===== */
    .product-image-container {
        height: 160px;
        background: #f8f9fa;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 15px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .product-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
    }
    
    .product-card:hover .product-image {
        transform: scale(1.05);
    }
    
    .image-placeholder {
        color: #94a3b8;
        font-size: 48px;
        opacity: 0.6;
    }
    
    /* ===== 商品情報エリア ===== */
    .product-info {
        height: calc(100% - 160px - 15px);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    
    .product-title {
        font-size: 16px;
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 10px;
        line-height: 1.4;
        
        /* テキスト省略（2行制限） */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        height: 44px;
    }
    
    .product-details {
        margin-bottom: 15px;
        flex: 1;
    }
    
    .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 14px;
    }
    
    .detail-label {
        color: #7f8c8d;
        font-weight: 500;
    }
    
    .detail-value {
        color: #2c3e50;
        font-weight: 600;
    }
    
    .price-value {
        color: #e74c3c;
        font-size: 18px;
        font-weight: 700;
    }
    
    .stock-value {
        color: #27ae60;
        font-weight: 700;
    }
    
    .sku-value {
        font-family: 'Courier New', monospace;
        background: #f8f9fa;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
    }
    
    /* ===== 商品フッター ===== */
    .product-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid #f1f5f9;
        margin-top: auto;
    }
    
    .status-badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .status-active {
        background: #d4edda;
        color: #155724;
    }
    
    .status-inactive {
        background: #f8d7da;
        color: #721c24;
    }
    
    .watchers-info {
        font-size: 12px;
        color: #6c757d;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    /* ===== レスポンシブ対応 ===== */
    @media (max-width: 1200px) {
        .products-grid {
            grid-template-columns: repeat(3, 1fr);
        }
    }
    
    @media (max-width: 900px) {
        .products-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .product-card {
            height: 320px;
        }
        
        .product-image-container {
            height: 140px;
        }
    }
    
    @media (max-width: 600px) {
        .products-grid {
            grid-template-columns: 1fr;
        }
        
        .container {
            padding: 15px;
        }
        
        .product-card {
            height: 300px;
        }
        
        .product-image-container {
            height: 120px;
        }
    }
    
    /* ===== アニメーション ===== */
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .product-card {
        animation: fadeInUp 0.6s ease forwards;
    }
    
    .product-card:nth-child(1) { animation-delay: 0.1s; }
    .product-card:nth-child(2) { animation-delay: 0.2s; }
    .product-card:nth-child(3) { animation-delay: 0.3s; }
    .product-card:nth-child(4) { animation-delay: 0.4s; }
    .product-card:nth-child(5) { animation-delay: 0.5s; }
    .product-card:nth-child(6) { animation-delay: 0.6s; }
    .product-card:nth-child(7) { animation-delay: 0.7s; }
    .product-card:nth-child(8) { animation-delay: 0.8s; }
    
    /* ===== 印刷対応 ===== */
    @media print {
        .products-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        
        .product-card {
            break-inside: avoid;
            page-break-inside: avoid;
            height: auto;
        }
    }
    </style>
</head>
<body>
    
    <div class="container">
        
        <!-- ヘッダー -->
        <header class="header">
            <h1 class="header-title">
                <i class="fas fa-clipboard-check"></i>
                棚卸システム - 8枚カード表示版
            </h1>
            <p class="header-subtitle">
                API無し固定データ | カードレイアウト確認版 | レスポンシブ対応
            </p>
        </header>
        
        <!-- 統計情報 -->
        <section class="stats-grid">
            <div class="stat-card">
                <span class="stat-number">8</span>
                <span class="stat-label">表示商品数</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">6</span>
                <span class="stat-label">アクティブ</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">$1,247.92</span>
                <span class="stat-label">総価値</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">$155.99</span>
                <span class="stat-label">平均価格</span>
            </div>
        </section>
        
        <!-- 商品グリッド -->
        <section class="products-section">
            <header class="products-header">
                <i class="fas fa-boxes"></i>
                商品一覧 - 8枚カード固定表示
            </header>
            
            <!-- 🎯 8枚の固定カード表示 -->
            <div class="products-grid">
                
                <!-- カード1 -->
                <div class="product-card">
                    <div class="product-image-container">
                        <img src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop" 
                             alt="商品1" class="product-image">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">Premium Golf Equipment - Professional Grade Performance Driver</h3>
                        <div class="product-details">
                            <div class="detail-row">
                                <span class="detail-label">SKU:</span>
                                <span class="detail-value sku-value">GOLF-DRV-001</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">価格:</span>
                                <span class="detail-value price-value">$299.99</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">在庫:</span>
                                <span class="detail-value stock-value">12個</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">状態:</span>
                                <span class="detail-value">新品</span>
                            </div>
                        </div>
                        <div class="product-footer">
                            <span class="status-badge status-active">アクティブ</span>
                            <div class="watchers-info">
                                <i class="fas fa-eye"></i>
                                <span>24</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- カード2 -->
                <div class="product-card">
                    <div class="product-image-container">
                        <img src="https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=200&fit=crop" 
                             alt="商品2" class="product-image">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">Advanced Electronic Device - Premium Technology Product</h3>
                        <div class="product-details">
                            <div class="detail-row">
                                <span class="detail-label">SKU:</span>
                                <span class="detail-value sku-value">ELEC-ADV-002</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">価格:</span>
                                <span class="detail-value price-value">$149.99</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">在庫:</span>
                                <span class="detail-value stock-value">8個</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">状態:</span>
                                <span class="detail-value">中古</span>
                            </div>
                        </div>
                        <div class="product-footer">
                            <span class="status-badge status-active">アクティブ</span>
                            <div class="watchers-info">
                                <i class="fas fa-eye"></i>
                                <span>15</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- カード3 -->
                <div class="product-card">
                    <div class="product-image-container">
                        <img src="https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=300&h=200&fit=crop" 
                             alt="商品3" class="product-image">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">Professional Sports Equipment - High Performance Gear</h3>
                        <div class="product-details">
                            <div class="detail-row">
                                <span class="detail-label">SKU:</span>
                                <span class="detail-value sku-value">SPORT-PRO-003</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">価格:</span>
                                <span class="detail-value price-value">$89.99</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">在庫:</span>
                                <span class="detail-value stock-value">5個</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">状態:</span>
                                <span class="detail-value">新品</span>
                            </div>
                        </div>
                        <div class="product-footer">
                            <span class="status-badge status-active">アクティブ</span>
                            <div class="watchers-info">
                                <i class="fas fa-eye"></i>
                                <span>31</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- カード4 -->
                <div class="product-card">
                    <div class="product-image-container">
                        <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=200&fit=crop" 
                             alt="商品4" class="product-image">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">Premium Quality Product - Professional Grade Watch</h3>
                        <div class="product-details">
                            <div class="detail-row">
                                <span class="detail-label">SKU:</span>
                                <span class="detail-value sku-value">WATCH-LUX-004</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">価格:</span>
                                <span class="detail-value price-value">$199.99</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">在庫:</span>
                                <span class="detail-value stock-value">3個</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">状態:</span>
                                <span class="detail-value">新品</span>
                            </div>
                        </div>
                        <div class="product-footer">
                            <span class="status-badge status-active">アクティブ</span>
                            <div class="watchers-info">
                                <i class="fas fa-eye"></i>
                                <span>18</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- カード5 -->
                <div class="product-card">
                    <div class="product-image-container">
                        <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop" 
                             alt="商品5" class="product-image">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">Premium Smartphone Accessory - Advanced Protection Case</h3>
                        <div class="product-details">
                            <div class="detail-row">
                                <span class="detail-label">SKU:</span>
                                <span class="detail-value sku-value">PHONE-ACC-005</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">価格:</span>
                                <span class="detail-value price-value">$39.99</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">在庫:</span>
                                <span class="detail-value stock-value">25個</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">状態:</span>
                                <span class="detail-value">新品</span>
                            </div>
                        </div>
                        <div class="product-footer">
                            <span class="status-badge status-active">アクティブ</span>
                            <div class="watchers-info">
                                <i class="fas fa-eye"></i>
                                <span>42</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- カード6 -->
                <div class="product-card">
                    <div class="product-image-container">
                        <img src="https://images.unsplash.com/photo-1560879234-44e610b6ed46?w=300&h=200&fit=crop" 
                             alt="商品6" class="product-image">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">Professional Gaming Equipment - Tournament Grade Controller</h3>
                        <div class="product-details">
                            <div class="detail-row">
                                <span class="detail-label">SKU:</span>
                                <span class="detail-value sku-value">GAME-PRO-006</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">価格:</span>
                                <span class="detail-value price-value">$79.99</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">在庫:</span>
                                <span class="detail-value stock-value">7個</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">状態:</span>
                                <span class="detail-value">中古</span>
                            </div>
                        </div>
                        <div class="product-footer">
                            <span class="status-badge status-active">アクティブ</span>
                            <div class="watchers-info">
                                <i class="fas fa-eye"></i>
                                <span>29</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- カード7 -->
                <div class="product-card">
                    <div class="product-image-container">
                        <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop" 
                             alt="商品7" class="product-image">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">Premium Fashion Item - Luxury Brand Sneakers Collection</h3>
                        <div class="product-details">
                            <div class="detail-row">
                                <span class="detail-label">SKU:</span>
                                <span class="detail-value sku-value">SHOES-LUX-007</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">価格:</span>
                                <span class="detail-value price-value">$129.99</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">在庫:</span>
                                <span class="detail-value stock-value">0個</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">状態:</span>
                                <span class="detail-value">新品</span>
                            </div>
                        </div>
                        <div class="product-footer">
                            <span class="status-badge status-inactive">在庫切れ</span>
                            <div class="watchers-info">
                                <i class="fas fa-eye"></i>
                                <span>67</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- カード8 -->
                <div class="product-card">
                    <div class="product-image-container">
                        <img src="https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&h=200&fit=crop" 
                             alt="商品8" class="product-image">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">Advanced Technology Device - Premium Wireless Headphones</h3>
                        <div class="product-details">
                            <div class="detail-row">
                                <span class="detail-label">SKU:</span>
                                <span class="detail-value sku-value">AUDIO-WL-008</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">価格:</span>
                                <span class="detail-value price-value">$179.99</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">在庫:</span>
                                <span class="detail-value stock-value">0個</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">状態:</span>
                                <span class="detail-value">新品</span>
                            </div>
                        </div>
                        <div class="product-footer">
                            <span class="status-badge status-inactive">在庫切れ</span>
                            <div class="watchers-info">
                                <i class="fas fa-eye"></i>
                                <span>53</span>
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>
        </section>
        
        <!-- フッター情報 -->
        <footer style="text-align: center; padding: 20px; color: #7f8c8d; font-size: 14px;">
            <p>🎯 8枚カード固定表示版 | レイアウト確認完了 | 次: APIデータ統合</p>
        </footer>
        
    </div>
    
    <script>
    // 開発用ログ
    console.log('✅ 8枚カードレイアウト表示完了');
    console.log('📊 表示データ:', {
        cardCount: 8,
        gridColumns: '4列（レスポンシブ対応）',
        cardHeight: '350px固定',
        animation: 'fadeInUp順次表示'
    });
    
    // レスポンシブ確認用
    function checkResponsive() {
        const width = window.innerWidth;
        if (width <= 600) {
            console.log('📱 モバイル表示: 1列');
        } else if (width <= 900) {
            console.log('📱 タブレット表示: 2列');
        } else if (width <= 1200) {
            console.log('💻 ノートPC表示: 3列');
        } else {
            console.log('🖥️ デスクトップ表示: 4列');
        }
    }
    
    window.addEventListener('resize', checkResponsive);
    checkResponsive(); // 初期実行
    </script>
    
</body>
</html>
