/**
 * eBay Test Viewer JavaScript - N3準拠版（構文エラー完全修正版）
 */

class EbayTestViewerN3 {
    constructor() {
        this.currentData = [];
        this.currentView = 'card';
        this.init();
    }

    init() {
        console.log('eBay Test Viewer N3準拠版初期化開始');
        this.setupGlobalFunctions();
        this.loadData();
    }

    setupGlobalFunctions() {
        window.ebayViewer = this;
        window.EbayTestViewerN3 = EbayTestViewerN3;
        window.testModal = () => this.testModal();
        window.refreshData = () => this.refreshData();
        window.showProductDetail = (index) => this.showProductDetail(index);
        window.editProduct = (index) => this.editProduct(index);
    }

    async loadData() {
        try {
            const response = await fetch('modules/ebay_test_viewer/debug_data.php');
            const result = await response.json();
            
            if (result.success) {
                this.currentData = result.data.sample_data || [];
                this.renderCurrentView();
            }
        } catch (error) {
            console.error('通信エラー:', error);
        }
    }

    renderCurrentView() {
        const container = document.getElementById('sample-data');
        if (!container) return;
        
        container.innerHTML = '<div>N3準拠版システム動作中</div>';
    }

    showProductDetail(index) {
        const product = this.currentData[index];
        if (!product) {
            alert('商品データが見つかりません');
            return;
        }
        
        if (window.N3Modal) {
            N3Modal.alert({ 
                title: '商品詳細', 
                message: `商品: ${product.title || product.ebay_item_id}`, 
                type: 'info' 
            });
        } else {
            alert(`商品詳細: ${product.title || product.ebay_item_id}`);
        }
    }

    editProduct(index) {
        alert('編集機能は開発中です');
    }

    testModal() {
        if (window.N3Modal) {
            N3Modal.alert({ title: 'テスト', message: 'モーダルテスト完了', type: 'success' });
        } else {
            alert('モーダルテスト完了');
        }
    }

    refreshData() {
        console.log('データ更新開始');
        this.loadData();
    }

    updateQuantity(index, newValue) {
        console.log(`数量更新: Index ${index}, 値: ${newValue}`);
        if (this.currentData[index]) {
            this.currentData[index].quantity = newValue;
        }
    }
}

// グローバル変数として設定
window.EbayTestViewerN3 = EbayTestViewerN3;

// タブ切り替え関数
window.switchTab = function(tabName) {
    console.log(`タブ切り替え: ${tabName}`);
};

console.log('EbayTestViewerN3 構文エラー修正版読み込み完了');
