<?php
/**
 * 🎯 N3新カードシステム フィーチャースイッチ
 * ファイル: modules/tanaoroshi_inline_complete/n3_feature_switch.php
 * 作成日: 2025年8月25日
 * 目的: 新旧システム安全切り替え
 */

// 🎯 フィーチャースイッチ設定
class N3FeatureSwitch {
    
    /**
     * 新カードシステムを使用するかの判定
     */
    public static function useNewCardSystem() {
        // 🎯 URL パラメータでの制御
        if (isset($_GET['n3_cards']) && $_GET['n3_cards'] === '1') {
            return true;
        }
        
        // 🎯 セッションでの制御
        if (isset($_SESSION['n3_cards_enabled']) && $_SESSION['n3_cards_enabled'] === true) {
            return true;
        }
        
        // 🎯 環境変数での制御
        if (getenv('N3_CARDS_ENABLED') === 'true') {
            return true;
        }
        
        // 🎯 設定ファイルでの制御
        $config_file = __DIR__ . '/../../config/n3_features.json';
        if (file_exists($config_file)) {
            $config = json_decode(file_get_contents($config_file), true);
            if (isset($config['new_card_system']) && $config['new_card_system'] === true) {
                return true;
            }
        }
        
        // デフォルト: 無効
        return false;
    }
    
    /**
     * 新カードシステム有効化
     */
    public static function enableNewCardSystem() {
        $_SESSION['n3_cards_enabled'] = true;
        return true;
    }
    
    /**
     * 新カードシステム無効化
     */
    public static function disableNewCardSystem() {
        $_SESSION['n3_cards_enabled'] = false;
        return true;
    }
    
    /**
     * 現在の状態取得
     */
    public static function getStatus() {
        return [
            'new_card_system' => self::useNewCardSystem(),
            'url_param' => isset($_GET['n3_cards']) ? $_GET['n3_cards'] : 'not_set',
            'session' => isset($_SESSION['n3_cards_enabled']) ? $_SESSION['n3_cards_enabled'] : 'not_set',
            'env_var' => getenv('N3_CARDS_ENABLED') ?: 'not_set'
        ];
    }
}

// 🎯 カード表示HTML生成関数
function renderProductCards($products, $useNewSystem = null) {
    // フィーチャースイッチ確認
    if ($useNewSystem === null) {
        $useNewSystem = N3FeatureSwitch::useNewCardSystem();
    }
    
    if ($useNewSystem) {
        return renderN3ProductCards($products);
    } else {
        return renderLegacyProductCards($products);
    }
}

/**
 * 新N3カードシステムHTML生成
 */
function renderN3ProductCards($products) {
    ob_start();
    ?>
    <!-- 🎯 N3新カードシステム -->
    <div id="n3-card-container" class="n3-product-cards">
        <div class="n3-product-cards__empty">
            <i class="fas fa-box-open n3-product-cards__empty-icon"></i>
            <p class="n3-product-cards__empty-text">N3新カードシステム読み込み中...</p>
        </div>
    </div>
    
    <!-- N3新カードシステム CSS -->
    <link rel="stylesheet" href="common/css/n3-card-system.css">
    
    <!-- N3新カードシステム JavaScript -->
    <script src="common/js/components/n3-product-cards.js"></script>
    
    <script>
    // 🎯 新カードシステム初期化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🎯 N3新カードシステム初期化開始');
        
        try {
            // カードマネージャー作成
            const cardManager = new window.N3.ProductCardManager('#n3-card-container');
            
            // 商品データがある場合は表示
            const productsData = <?php echo json_encode($products ?? []); ?>;
            
            if (productsData && productsData.length > 0) {
                cardManager.renderCards(productsData);
                console.log(`✅ N3カード表示完了: ${productsData.length}件`);
            } else {
                console.log('⚠️ 商品データがありません');
            }
            
            // グローバル参照保持
            window.N3.currentCardManager = cardManager;
            
        } catch (error) {
            console.error('❌ N3新カードシステム初期化エラー:', error);
            
            // エラー表示
            const container = document.getElementById('n3-card-container');
            if (container) {
                container.innerHTML = `
                    <div class="n3-product-cards__empty" style="color: #ef4444;">
                        <i class="fas fa-exclamation-triangle n3-product-cards__empty-icon"></i>
                        <p class="n3-product-cards__empty-text">N3カードシステムエラー: ${error.message}</p>
                        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                            再読み込み
                        </button>
                    </div>
                `;
            }
        }
    });
    
    // 🎯 Bootstrap Modal統合
    window.N3 = window.N3 || {};
    window.N3.createProductModal = function(productData) {
        console.log('🎯 Bootstrap Modal表示:', productData.name);
        
        // 既存モーダルシステムを使用
        if (typeof window.TanaoroshiSystem !== 'undefined' && window.TanaoroshiSystem.openProductModal) {
            window.TanaoroshiSystem.openProductModal(productData);
        } else if (typeof bootstrap !== 'undefined') {
            // フォールバック: 簡易Bootstrap Modal
            showSimpleProductModal(productData);
        } else {
            // 最終フォールバック: alert
            alert(`📦 ${productData.name}\n\nSKU: ${productData.sku}\n価格: $${productData.priceUSD.toFixed(2)}\n在庫: ${productData.stock}`);
        }
    };
    
    function showSimpleProductModal(productData) {
        // 簡易モーダル表示ロジック
        const modalHTML = `
            <div class="modal fade" id="n3ProductModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">📦 ${productData.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p><strong>SKU:</strong> ${productData.sku}</p>
                            <p><strong>価格:</strong> $${productData.priceUSD.toFixed(2)}</p>
                            <p><strong>在庫:</strong> ${productData.stock}個</p>
                            <p><strong>タイプ:</strong> ${productData.type}</p>
                            <p><strong>カテゴリ:</strong> ${productData.category}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">閉じる</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 既存モーダル削除
        const existingModal = document.getElementById('n3ProductModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 新しいモーダル追加
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Bootstrap Modal表示
        const modal = new bootstrap.Modal(document.getElementById('n3ProductModal'));
        modal.show();
    }
    </script>
    <?php
    return ob_get_clean();
}

/**
 * 既存レガシーカードシステムHTML生成
 */
function renderLegacyProductCards($products) {
    ob_start();
    ?>
    <!-- 🔄 レガシーカードシステム -->
    <div class="inventory__grid js-inventory-grid" id="card-grid">
        <div class="inventory__loading-state" data-loading="true">
            <i class="fas fa-spinner fa-spin"></i>
            <p>レガシーシステムでデータ読み込み中...</p>
        </div>
    </div>
    
    <script>
    // レガシーシステム初期化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔄 レガシーカードシステム使用');
        
        // 既存のTanaoroshiSystemを使用
        if (typeof window.TanaoroshiSystem !== 'undefined') {
            window.TanaoroshiSystem.loadInventoryData();
        } else {
            console.error('❌ TanaoroshiSystemが見つかりません');
        }
    });
    </script>
    <?php
    return ob_get_clean();
}
?>