// 🖼️ 商品モーダル（小さめ画像サイズ・実画像対応・完成版）
    TN3.openProductModal = function(product) {
        if (!product) return;
        
        const modal = document.getElementById('itemModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');
        
        if (title) title.textContent = product.name;
        if (body) {
            const gradient = TN3.getProductGradient(product);
            const categoryIcon = TN3.getCategoryIcon(product.categoryKey);
            const imageStyle = product.image 
                ? `background-image: url('${product.image}'); background-size: cover; background-position: center;`
                : `background: ${gradient};`;
            
            body.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    <div><strong>SKU:</strong> ${product.sku}</div>
                    <div><strong>種類:</strong> ${TN3.getTypeLabel(product.type)}</div>
                    <div><strong>価格:</strong> $${product.priceUSD.toFixed(2)}</div>
                    <div><strong>在庫:</strong> ${product.stock}</div>
                    <div><strong>リスク:</strong> <span style="color: ${product.risk === 'high' ? '#dc2626' : product.risk === 'medium' ? '#f59e0b' : '#10b981'}">${product.risk}</span></div>
                    <div><strong>AI判定:</strong> <span style="color: ${product.ai === 'approved' ? '#10b981' : product.ai === 'rejected' ? '#dc2626' : '#6b7280'}">${product.ai}</span></div>
                    <div><strong>利益率:</strong> ${product.profitRate}%</div>
                    <div><strong>状態:</strong> ${product.condition}</div>
                </div>
                <div style="text-align: center; margin: 1rem 0;">
                    <!-- 小さめ画像サイズ（200x120） -->
                    <div style="width: 200px; height: 120px; ${imageStyle} margin: 0 auto; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; text-shadow: 0 2px 4px rgba(0,0,0,0.8); position: relative;">
                        ${!product.image ? categoryIcon : ''}
                        <div style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.6rem; font-weight: 700;">
                            ${product.image ? 'Real Image' : 'Gradient'}
                        </div>
                    </div>
                </div>
                <div style="margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #1e293b;">📊 商品詳細情報:</h4>
                    <p style="margin: 0; color: #64748b; line-height: 1.5;">
                        ${product.image ? 'Unsplash実画像URL対応' : 'カテゴリグラデーション表示'}で表示されている商品です。
                        現在の在庫数は${product.stock}個、販売価格は$${product.priceUSD.toFixed(2)}に設定されています。
                        <br><br>
                        <strong>✅ リスク判定: ${product.risk} / AI判定: ${product.ai} / 利益率: ${product.profitRate}%</strong>
                        <br>
                        <strong>📦 カテゴリ: ${product.category} / 状態: ${product.condition}</strong>
                    </p>
                </div>
            `;
        }
        
        TN3.openModal('itemModal');
    };

    // 通知システム
    TN3.showSuccess = function(title, message) {
        TN3.showNotification(title, message, 'success');
    };

    TN3.showNotification = function(title, message, type = 'info') {
        const existing = document.getElementById('tn3-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.id = 'tn3-notification';
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; max-width: 400px; padding: 1rem;
            background: ${type === 'success' ? '#f0f9ff' : '#f8fafc'};
            border: 1px solid ${type === 'success' ? '#bae6fd' : '#e2e8f0'};
            border-left: 4px solid ${type === 'success' ? '#10b981' : '#3b82f6'};
            border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                <div style="color: ${type === 'success' ? '#10b981' : '#3b82f6'};">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem; color: #1e293b;">${title}</div>
                    <div style="color: #64748b; font-size: 0.875rem; white-space: pre-line;">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #64748b; cursor: pointer; font-size: 1.25rem;">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, 8000);
    };

    // イベント処理
    TN3.handleAction = function(element, event) {
        const action = element.dataset.action;
        if (!action) return;
        
        TN3.log(`⚡ アクション実行: ${action}`);
        
        switch (action) {
            case 'switch-view':
                const view = element.dataset.view;
                TN3.switchView(view);
                break;
            case 'load-inventory-data':
                TN3.loadInventoryData();
                break;
            case 'close-modal':
                const modalId = element.dataset.modal;
                TN3.closeModal(modalId);
                break;
            case 'apply-filters':
                TN3.applyFilters();
                break;
            case 'reset-filters':
                document.querySelectorAll('.inventory__filter-select').forEach(select => {
                    select.value = '';
                });
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.value = '';
                TN3.applyFilters();
                break;
        }
    };

    // 初期化
    TN3.init = function() {
        TN3.log('🚀 実画像対応版システム初期化開始');
        
        TN3.forceStopLoading();
        
        // イベントリスナー設定
        document.addEventListener('click', function(event) {
            const target = event.target.closest('[data-action]');
            if (target) {
                TN3.handleAction(target, event);
            }
        });
        
        // フィルター変更時の自動適用
        document.addEventListener('change', function(event) {
            if (event.target.classList.contains('inventory__filter-select')) {
                TN3.applyFilters();
            }
        });
        
        // 検索入力リアルタイム処理
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => TN3.applyFilters(), 300);
            });
        }
        
        // データ読み込み（複数回試行保証）
        setTimeout(() => TN3.loadInventoryData(), 100);
        setTimeout(() => {
            if (TN3.data.allProducts.length === 0) {
                TN3.forceStopLoading();
                TN3.loadInventoryData();
            }
        }, 500);
        
        TN3.log(`✅ 実画像対応版システム初期化完了 - ${TN3.config.testMode.itemCount}件テスト対応`);
    };

    // DOM読み込み完了時の初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', TN3.init);
    } else {
        TN3.init();
    }

})(window.TanaoroshiN3System);

// 🎯 統一モーダルシステム（グローバル関数）
window.openModal = function(modalId) {
    if (window.TanaoroshiN3System && window.TanaoroshiN3System.openModal) {
        return window.TanaoroshiN3System.openModal(modalId);
    }
};

window.closeModal = function(modalId) {
    if (window.TanaoroshiN3System && window.TanaoroshiN3System.closeModal) {
        return window.TanaoroshiN3System.closeModal(modalId);
    }
};

// その他のグローバル関数
window.forceStopInventoryLoading = function() {
    if (window.TanaoroshiN3System && window.TanaoroshiN3System.forceStopLoading) {
        window.TanaoroshiN3System.forceStopLoading();
        window.TanaoroshiN3System.loadInventoryData();
    }
};

console.log('✅ 棚卸しシステム 実画像対応版 初期化完了 - Unsplash実画像・50件テスト・小さめモーダル・エラーハンドリング対応');