/**
 * eBay編集機能独立版 JavaScript
 * EbayTestViewerN3に依存しない独立したクラス
 */

class EbayEditManager {
    constructor() {
        this.currentData = [];
        this.init();
        console.log('eBay編集機能独立版初期化完了');
    }

    init() {
        this.setupGlobalFunctions();
        this.loadCSRFToken();
    }

    setupGlobalFunctions() {
        window.EbayEditManager = this;
        window.editProduct = (index) => this.showEditModal(index);
        window.updateQuantityDirect = (index, newValue) => this.updateQuantityDirect(index, newValue);
    }

    loadCSRFToken() {
        // CSRF トークンの確認
        if (!window.CSRF_TOKEN) {
            console.warn('CSRF_TOKEN が設定されていません');
        }
    }

    setData(data) {
        this.currentData = data || [];
    }

    showEditModal(index) {
        if (!this.currentData[index]) {
            alert('商品データが見つかりません');
            return;
        }

        const product = this.currentData[index];
        
        if (window.N3Modal) {
            N3Modal.alert({ 
                title: '編集機能', 
                message: `商品「${product.title || product.ebay_item_id}」の編集機能は開発中です。`, 
                type: 'info' 
            });
        } else {
            alert(`編集機能開発中\n商品: ${product.title || product.ebay_item_id}`);
        }
    }

    async updateQuantityDirect(index, newValue) {
        if (!this.currentData[index]) {
            console.error('商品データが見つかりません');
            return;
        }

        console.log(`在庫更新: Index ${index}, 新しい値: ${newValue}`);
        
        // 簡易バリデーション
        if (newValue === '' || isNaN(newValue) || parseInt(newValue) < 0) {
            alert('在庫数は0以上の整数で入力してください');
            return;
        }

        // データ更新（実際のAPI呼び出しは後で実装）
        this.currentData[index].quantity = parseInt(newValue);
        console.log('在庫更新完了（ローカルのみ）');
    }

    // 将来の拡張用メソッド
    async sendEditRequest(action, data) {
        // TODO: 実際のAPI呼び出し実装
        console.log('編集リクエスト:', action, data);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    message: 'テスト実行完了'
                });
            }, 1000);
        });
    }
}

// グローバル変数として定義
window.EbayEditManager = EbayEditManager;

// 自動初期化
document.addEventListener('DOMContentLoaded', function() {
    if (!window.ebayEditManager) {
        window.ebayEditManager = new EbayEditManager();
    }
});

console.log('EbayEditManager 独立版読み込み完了');
