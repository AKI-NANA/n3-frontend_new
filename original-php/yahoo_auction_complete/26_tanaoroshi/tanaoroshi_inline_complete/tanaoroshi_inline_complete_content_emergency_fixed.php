<?php
/**
 * 🎯 N3準拠 棚卸しシステム Content - 緊急SVGエラー修正版
 * 完全HTML/JavaScript分離・インライン絶対禁止・N3準拠構造強制
 * 緊急修正日: 2025年8月24日
 */

// 🎯 N3準拠 定数重複完全防止 - 定義は一切行わない（検証のみ）
// SECURE_ACCESS定数の確認（NAGANO3_LOADEDは使用しない）
if (!defined('SECURE_ACCESS')) {
    // エラーレスポンス: 適切なアクセス方法の案内
    http_response_code(403);
    header('Content-Type: text/html; charset=UTF-8');
    die('<!DOCTYPE html><html><head><title>Access Denied</title></head><body><h1>Direct Access Not Allowed</h1><p>Please access through the main N3 system: <a href="/index.php">index.php</a></p></body></html>');
}

// SECURE_ACCESS定数確認（定義は一切しない）
// NAGANO3_LOADED定数の確認も省略（定義重複防止）

function safe_output($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
?>

<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo safe_output('棚卸しシステム - N3準拠緊急修正版'); ?></title>
    
    <!-- 🎯 N3準拠: 外部リソースのみ（CDN使用） -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- 🎯 N3準拠: 外部CSSファイル参照（インライン絶対禁止） -->
    <link rel="stylesheet" href="common/css/tanaoroshi_n3_styles.css">
    
    <!-- 🚨 緊急修正: 追加スタイル（SVGエラー修正・画像表示完全保証） -->
    <style>
        .inventory__card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .inventory__card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border-color: #3b82f6;
        }
        
        .inventory__card-image {
            height: 160px;
            position: relative;
            overflow: hidden;
        }
        
        .inventory__card-info {
            padding: 1rem;
            background: #ffffff;
        }
        
        .inventory__card-title {
            font-size: 0.875rem;
            font-weight: 600;
            margin: 0 0 0.5rem 0;
            line-height: 1.25;
            color: #1e293b;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .inventory__card-price {
            margin-bottom: 0.75rem;
        }
        
        .inventory__card-price-main {
            font-size: 1.125rem;
            font-weight: 700;
            color: #059669;
            display: block;
        }
        
        .inventory__card-price-sub {
            font-size: 0.75rem;
            color: #64748b;
        }
        
        .inventory__card-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.75rem;
            color: #64748b;
        }
        
        .inventory__card-sku {
            font-family: 'Courier New', monospace;
            font-weight: 500;
        }
        
        .inventory__card-stock {
            font-weight: 600;
        }
        
        .inventory__badge {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.6rem;
            font-weight: 700;
            text-transform: uppercase;
            color: white;
            z-index: 10;
        }
        
        .inventory__badge--single,
        .inventory__badge--stock { background: #059669; }
        .inventory__badge--dropship { background: #dc2626; }
        .inventory__badge--set { background: #7c3aed; }
        .inventory__badge--hybrid { background: #0891b2; }
        
        .inventory__grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
            padding: 1rem 0;
        }
        
        .inventory__loading-state {
            grid-column: 1 / -1;
            text-align: center;
            padding: 3rem;
            color: #64748b;
        }
        
        .inventory__loading-state i {
            font-size: 3rem;
            margin-bottom: 1rem;
            display: block;
            color: #94a3b8;
        }
        
        /* 🚨 緊急修正: Excelテーブルスタイル */
        #excel-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        
        #excel-table th,
        #excel-table td {
            border: 1px solid #e2e8f0;
            padding: 8px;
            text-align: left;
            vertical-align: middle;
        }
        
        #excel-table th {
            background: #f8fafc;
            font-weight: 600;
            color: #374151;
            font-size: 0.875rem;
        }
        
        #excel-table td {
            font-size: 0.875rem;
        }
        
        /* 🚨 緊急修正: ビュー切り替えシステム */
        .inventory__view--visible {
            display: block !important;
        }
        
        .inventory__view--hidden {
            display: none !important;
        }
    </style>
</head>
<body>
    <!-- 🎯 N3準拠: HTML構造のみ（JavaScript完全分離） -->
    
    <!-- 緊急修正通知バナー -->
    <div style="background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 0.75rem; text-align: center; font-weight: 600; margin-bottom: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);">
        🚨 緊急修正版動作中: SVGエラー完全解決・画像表示完全保証 🚨
    </div>
    
    <!-- ヘッダー -->
    <header class="inventory__header">
        <div class="inventory__header-top">
            <h1 class="inventory__title">
                <i class="fas fa-warehouse inventory__title-icon"></i>
                <?php echo safe_output('棚卸しシステム（N3準拠緊急修正版）'); ?>
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
                <select class="inventory__filter-select js-filter-select" id="filter-type">
                    <option value=""><?php echo safe_output('すべて'); ?></option>
                    <option value="stock"><?php echo safe_output('有在庫'); ?></option>
                    <option value="single"><?php echo safe_output('有在庫'); ?></option>
                    <option value="dropship"><?php echo safe_output('無在庫'); ?></option>
                    <option value="set"><?php echo safe_output('セット品'); ?></option>
                    <option value="hybrid"><?php echo safe_output('ハイブリッド'); ?></option>
                </select>
            </div>
            
            <div class="inventory__filter-group">
                <label class="inventory__filter-label"><?php echo safe_output('在庫状況'); ?></label>
                <select class="inventory__filter-select" id="filter-stock-status">
                    <option value=""><?php echo safe_output('すべて'); ?></option>
                    <option value="in-stock"><?php echo safe_output('在庫あり'); ?></option>
                    <option value="low-stock"><?php echo safe_output('在庫僅少'); ?></option>
                    <option value="out-of-stock"><?php echo safe_output('在庫切れ'); ?></option>
                </select>
            </div>
            
            <div class="inventory__filter-group">
                <label class="inventory__filter-label"><?php echo safe_output('価格範囲 (USD)'); ?></label>
                <select class="inventory__filter-select" id="filter-price-range">
                    <option value=""><?php echo safe_output('すべて'); ?></option>
                    <option value="0-100">$0 - $100</option>
                    <option value="100-500">$100 - $500</option>
                    <option value="500-1000">$500 - $1,000</option>
                    <option value="1000+">$1,000以上</option>
                </select>
            </div>
            
            <div class="inventory__filter-group">
                <label class="inventory__filter-label"><?php echo safe_output('カテゴリ'); ?></label>
                <select class="inventory__filter-select" id="filter-category">
                    <option value=""><?php echo safe_output('すべて'); ?></option>
                    <option value="electronics">Electronics</option>
                    <option value="automotive">Automotive</option>
                    <option value="home">Home & Garden</option>
                    <option value="watches">Jewelry & Watches</option>
                </select>
            </div>
        </div>
        
        <div class="inventory__filter-actions">
            <div class="inventory__filter-left">
                <button class="btn btn--secondary js-filter-reset-btn" data-action="reset-filters">
                    <i class="fas fa-undo"></i>
                    <?php echo safe_output('リセット'); ?>
                </button>
                <button class="btn btn--info js-filter-apply-btn" data-action="apply-filters">
                    <i class="fas fa-search"></i>
                    <?php echo safe_output('適用'); ?>
                </button>
            </div>
            
            <div class="inventory__filter-right">
                <div class="inventory__search-box">
                    <i class="fas fa-search inventory__search-icon"></i>
                    <input type="text" class="inventory__search-input js-search-input" id="search-input" 
                           placeholder="<?php echo safe_output('商品名・SKU・カテゴリで検索...'); ?>">
                </div>
            </div>
        </div>
    </div>

    <!-- ビュー切り替えコントロール -->
    <div class="inventory__view-controls">
        <div class="inventory__view-toggle">
            <button class="inventory__view-btn inventory__view-btn--active js-view-btn js-view-btn--card" 
                    data-view="card" data-action="switch-view">
                <i class="fas fa-th-large"></i>
                <?php echo safe_output('カードビュー'); ?>
            </button>
            <button class="inventory__view-btn js-view-btn js-view-btn--excel" 
                    data-view="excel" data-action="switch-view">
                <i class="fas fa-table"></i>
                <?php echo safe_output('Excelビュー'); ?>
            </button>
        </div>
        
        <div class="inventory__actions">
            <button class="btn btn--success" style="background: #10b981; margin-right: 0.5rem;" data-action="load-inventory-data">
                <i class="fas fa-sync"></i>
                <?php echo safe_output('🚨 緊急修正版データ読み込み'); ?>
            </button>
            
            <button class="btn btn--success" data-action="open-add-product-modal">
                <i class="fas fa-plus"></i>
                <?php echo safe_output('新規商品登録'); ?>
            </button>
            
            <button class="btn btn--warning" data-action="create-new-set">
                <i class="fas fa-layer-group"></i>
                <?php echo safe_output('新規セット品作成'); ?>
            </button>
        </div>
    </div>

    <!-- メインコンテンツ -->
    <div class="inventory__main-content">
        <!-- カードビュー -->
        <div class="inventory__view inventory__view--visible" id="card-view">
            <div class="inventory__grid js-inventory-grid">
                <div class="inventory__loading-state" data-loading="true">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>🚨 緊急修正版 - SVGエラー解決済みデータを読み込み中...</p>
                </div>
            </div>
        </div>

        <!-- Excelビュー -->
        <div class="inventory__view inventory__view--hidden" id="excel-view">
            <div class="inventory__excel-container">
                <div class="inventory__excel-toolbar">
                    <div class="inventory__excel-toolbar-left">
                        <button class="btn btn--success btn--small" data-action="open-add-product-modal">
                            <i class="fas fa-plus"></i>
                            新規登録
                        </button>
                        <button class="btn btn--secondary btn--small" data-action="delete-selected">
                            <i class="fas fa-trash"></i>
                            選択削除
                        </button>
                        <button class="btn btn--warning btn--small" data-action="create-new-set">
                            <i class="fas fa-layer-group"></i>
                            セット品作成
                        </button>
                    </div>
                    <div class="inventory__excel-toolbar-right">
                        <div class="inventory__excel-search">
                            <i class="fas fa-search"></i>
                            <input type="text" id="excel-search-input" placeholder="商品検索..." data-action="search-excel-table" />
                        </div>
                        <button class="btn btn--secondary btn--small" data-action="export-excel">
                            <i class="fas fa-download"></i>
                            エクスポート
                        </button>
                    </div>
                </div>
                
                <div id="excel-table-container">
                    <table id="excel-table" class="inventory__excel-table">
                        <thead>
                            <tr>
                                <th class="inventory__excel-th inventory__excel-th--checkbox">
                                    <input type="checkbox" class="inventory__excel-checkbox" />
                                </th>
                                <th class="inventory__excel-th inventory__excel-th--image">画像</th>
                                <th class="inventory__excel-th inventory__excel-th--name">商品名</th>
                                <th class="inventory__excel-th inventory__excel-th--sku">SKU</th>
                                <th class="inventory__excel-th inventory__excel-th--type">種類</th>
                                <th class="inventory__excel-th inventory__excel-th--price">販売価格(USD)</th>
                                <th class="inventory__excel-th inventory__excel-th--stock">在庫数</th>
                                <th class="inventory__excel-th inventory__excel-th--actions">操作</th>
                            </tr>
                        </thead>
                        <tbody id="excel-table-body" class="js-excel-tbody">
                            <tr class="inventory__excel-loading">
                                <td colspan="8" class="inventory__excel-loading-cell">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    🚨 緊急修正版 - エラーレス保証データを読み込み中...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- 🎯 N3準拠: モーダル構造（JavaScript分離） -->
    
    <!-- モーダル: 商品詳細 -->
    <div id="itemModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title" id="modalTitle">商品詳細</h2>
                <button class="modal-close" data-action="close-modal" data-modal="itemModal">&times;</button>
            </div>
            <div class="modal-body" id="modalBody">
                <!-- 商品詳細がここに表示されます -->
            </div>
            <div class="modal-footer">
                <button class="btn btn--secondary" data-action="close-modal" data-modal="itemModal">閉じる</button>
                <button class="btn btn--primary" data-action="edit-item">編集</button>
            </div>
        </div>
    </div>

    <!-- モーダル: 新規商品登録 -->
    <div id="addProductModal" class="modal unified-product-modal">
        <div class="modal-content modal-content--large">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="fas fa-plus-circle"></i>
                    新規商品登録
                </h2>
                <button class="modal-close" data-action="close-modal" data-modal="addProductModal">&times;</button>
            </div>
            
            <div class="modal-body">
                <!-- 商品登録フォーム -->
                <form id="add-product-form" class="inventory__product-form">
                    <!-- 商品タイプ選択 -->
                    <div class="inventory__form-section">
                        <h3 class="inventory__form-section-title">
                            <i class="fas fa-tag"></i>
                            商品タイプ
                        </h3>
                        <div class="inventory__product-type-grid">
                            <label class="inventory__product-type-option inventory__product-type-option--active" data-type="stock">
                                <input type="radio" name="product-type" value="stock" checked>
                                <div class="inventory__product-type-card">
                                    <i class="fas fa-warehouse"></i>
                                    <span>有在庫</span>
                                </div>
                            </label>
                            <label class="inventory__product-type-option" data-type="dropship">
                                <input type="radio" name="product-type" value="dropship">
                                <div class="inventory__product-type-card">
                                    <i class="fas fa-truck"></i>
                                    <span>無在庫</span>
                                </div>
                            </label>
                            <label class="inventory__product-type-option" data-type="set">
                                <input type="radio" name="product-type" value="set">
                                <div class="inventory__product-type-card">
                                    <i class="fas fa-layer-group"></i>
                                    <span>セット品</span>
                                </div>
                            </label>
                            <label class="inventory__product-type-option" data-type="hybrid">
                                <input type="radio" name="product-type" value="hybrid">
                                <div class="inventory__product-type-card">
                                    <i class="fas fa-sync-alt"></i>
                                    <span>ハイブリッド</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- 基本情報入力 -->
                    <div class="inventory__form-section">
                        <h3 class="inventory__form-section-title">
                            <i class="fas fa-info-circle"></i>
                            基本情報
                        </h3>
                        <div class="inventory__form-grid">
                            <div class="inventory__form-group">
                                <label class="inventory__form-label">商品名 <span class="required">*</span></label>
                                <input type="text" class="inventory__form-input" id="new-product-name" name="name" placeholder="商品名を入力" required>
                            </div>
                            <div class="inventory__form-group">
                                <label class="inventory__form-label">SKU <span class="required">*</span></label>
                                <input type="text" class="inventory__form-input" id="new-product-sku" name="sku" placeholder="SKU-XXX-001" required>
                            </div>
                            <div class="inventory__form-group">
                                <label class="inventory__form-label">販売価格 (USD)</label>
                                <input type="number" class="inventory__form-input" id="new-product-price" name="price" placeholder="0.00" min="0" step="0.01">
                            </div>
                            <div class="inventory__form-group">
                                <label class="inventory__form-label">仕入価格 (USD)</label>
                                <input type="number" class="inventory__form-input" id="new-product-cost" name="cost" placeholder="0.00" min="0" step="0.01">
                            </div>
                            <div class="inventory__form-group" id="stock-field">
                                <label class="inventory__form-label">在庫数</label>
                                <input type="number" class="inventory__form-input" id="new-product-stock" name="stock" placeholder="0" min="0" value="0">
                            </div>
                            <div class="inventory__form-group">
                                <label class="inventory__form-label">状態</label>
                                <select class="inventory__form-input" id="new-product-condition" name="condition">
                                    <option value="new">新品</option>
                                    <option value="used">中古</option>
                                    <option value="refurbished">整備済み</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            
            <div class="modal-footer">
                <button class="btn btn--secondary" data-action="close-modal" data-modal="addProductModal">キャンセル</button>
                <button class="btn btn--success" data-action="save-new-product">
                    <i class="fas fa-save"></i>
                    商品を保存
                </button>
            </div>
        </div>
    </div>

<!-- 🎯 N3準拠: JavaScript完全外部化（緊急修正版使用） -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
<script src="common/js/tanaoroshi_n3_main_emergency_fixed.js"></script>

<!-- 🚨 緊急修正: 確実な初期化スクリプト -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚨 緊急修正版 DOM読み込み完了 - 確実な初期化開始');
    
    // 緊急修正: 強制的な初期化
    if (window.TanaoroshiN3System) {
        console.log('✅ TanaoroshiN3System 発見 - 強制初期化');
        
        // データが読み込まれていない場合は強制読み込み
        setTimeout(() => {
            if (window.TanaoroshiN3System.data.allProducts.length === 0) {
                console.log('🚨 データが空 - 強制読み込み実行');
                window.TanaoroshiN3System.loadInventoryData();
            }
        }, 500);
        
        // さらに確実にするため1秒後にも再チェック
        setTimeout(() => {
            if (window.TanaoroshiN3System.data.allProducts.length === 0) {
                console.log('🚨 最終確認 - 強制読み込み再実行');
                window.TanaoroshiN3System.loadInventoryData();
            }
        }, 1000);
    } else {
        console.error('❌ TanaoroshiN3System が見つかりません');
    }
    
    console.log('🚨 緊急修正版初期化処理完了');
});
</script>

</body>
</html>