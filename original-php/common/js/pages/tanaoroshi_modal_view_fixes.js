/**
 * 【緊急修正】モーダル・ビュー切り替え完全修正版
 * 問題: モーダル中央配置不備・閉じる機能不全・ビュー切り替え不完全
 */

// ========================================
// 【修正1】モーダル表示・非表示の完全実装
// ========================================

// モーダル表示関数（完全修正版）
function showModalComplete(modalId) {
    try {
        console.log('🔓 モーダル表示開始:', modalId);
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('❌ モーダル要素が見つかりません:', modalId);
            return false;
        }
        
        // 【重要】他の全モーダルを先に閉じる
        closeAllModalsComplete();
        
        // 【重要】N3準拠モーダル表示制御 - 絶対中央配置版
        modal.style.cssText = `
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            justify-content: center !important;
            align-items: center !important;
            place-items: center !important;
            place-content: center !important;
            align-content: center !important;
            justify-items: center !important;
            z-index: 50000 !important;
        `;
        modal.classList.add('modal--active');
        
        // 【重要】背景スクロール無効化
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = '0px'; // スクロールバー補正
        
        // 【重要】ESCキー・背景クリック対応
        setupModalCloseHandlers(modal, modalId);
        
        // フォーカス設定
        setTimeout(() => {
            const focusTarget = modal.querySelector('input, button, select, textarea');
            if (focusTarget) focusTarget.focus();
        }, 100);
        
        console.log('✅ モーダル表示完了:', modalId);
        return true;
        
    } catch (error) {
        console.error('❌ モーダル表示エラー:', error);
        return false;
    }
}

// モーダル非表示関数（完全修正版）
function hideModalComplete(modalId) {
    try {
        console.log('🔐 モーダル非表示開始:', modalId);
        
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('❌ モーダル要素が見つかりません:', modalId);
            return false;
        }
        
        // 【重要】モーダル非表示の完全制御
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        modal.classList.remove('modal--active');
        
        // 【重要】背景スクロール復元
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // イベントリスナー削除
        removeModalCloseHandlers(modal);
        
        console.log('✅ モーダル非表示完了:', modalId);
        return true;
        
    } catch (error) {
        console.error('❌ モーダル非表示エラー:', error);
        return false;
    }
}

// 全モーダル閉じる関数（完全修正版）
function closeAllModalsComplete() {
    try {
        const modals = document.querySelectorAll('.modal');
        console.log(`🔐 全モーダル閉じる: ${modals.length}個`);
        
        modals.forEach(function(modal) {
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.style.opacity = '0';
            modal.classList.remove('modal--active');
            removeModalCloseHandlers(modal);
        });
        
        // 背景スクロール復元
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        console.log('✅ 全モーダル閉じる完了');
        return true;
        
    } catch (error) {
        console.error('❌ 全モーダル閉じるエラー:', error);
        return false;
    }
}

// ========================================
// 【修正2】モーダル閉じるイベントハンドリング
// ========================================

// モーダル閉じるハンドラー設定
function setupModalCloseHandlers(modal, modalId) {
    // ESCキーハンドラー
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            console.log('⌨️ ESC キー検出 - モーダル閉じる:', modalId);
            hideModalComplete(modalId);
        }
    };
    
    // 背景クリックハンドラー
    const backgroundClickHandler = function(e) {
        // モーダル背景（modal要素自体）をクリックした場合のみ閉じる
        if (e.target === modal) {
            console.log('🖱️ モーダル背景クリック検出 - モーダル閉じる:', modalId);
            hideModalComplete(modalId);
        }
    };
    
    // イベントリスナー追加
    document.addEventListener('keydown', escHandler);
    modal.addEventListener('click', backgroundClickHandler);
    
    // 後で削除できるようにモーダル要素に保存
    modal._escHandler = escHandler;
    modal._backgroundClickHandler = backgroundClickHandler;
}

// モーダル閉じるハンドラー削除
function removeModalCloseHandlers(modal) {
    if (modal._escHandler) {
        document.removeEventListener('keydown', modal._escHandler);
        delete modal._escHandler;
    }
    
    if (modal._backgroundClickHandler) {
        modal.removeEventListener('click', modal._backgroundClickHandler);
        delete modal._backgroundClickHandler;
    }
}

// ========================================
// 【修正3】ビュー切り替えの完全実装
// ========================================

// ビュー切り替え関数（完全修正版 - N3準拠排他制御）
function switchViewComplete(viewType) {
    try {
        console.log('🔄 ビュー切り替え開始（N3準拠）:', viewType);
        
        const cardView = document.getElementById('card-view');
        const listView = document.getElementById('list-view');
        const cardViewBtn = document.getElementById('card-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        
        if (!cardView || !listView || !cardViewBtn || !listViewBtn) {
            console.error('❌ ビュー要素が見つかりません');
            return false;
        }
        
        // 【重要】N3準拠: 完全排他制御 - 必ず両方を明示的制御
        if (viewType === 'grid' || viewType === 'card') {
            // カードビュー表示
            cardView.style.display = 'grid';
            cardView.style.visibility = 'visible';
            cardView.classList.add('view--active');
            
            // Excelビュー完全非表示
            listView.style.display = 'none';
            listView.style.visibility = 'hidden';
            listView.classList.remove('view--active');
            
            // ボタン状態更新
            cardViewBtn.classList.add('inventory__view-btn--active');
            listViewBtn.classList.remove('inventory__view-btn--active');
            
            // カードリスナー再設定
            setTimeout(() => {
                if (window.TanaoroshiSystem && window.TanaoroshiSystem.reattachCardListeners) {
                    window.TanaoroshiSystem.reattachCardListeners();
                }
            }, 100);
            
            console.log('✅ カードビューに切り替え完了（N3準拠）');
            
        } else if (viewType === 'list' || viewType === 'table' || viewType === 'excel') {
            // Excelビュー表示
            listView.style.display = 'block';
            listView.style.visibility = 'visible';
            listView.classList.add('view--active');
            
            // カードビュー完全非表示
            cardView.style.display = 'none';
            cardView.style.visibility = 'hidden';
            cardView.classList.remove('view--active');
            
            // ボタン状態更新
            listViewBtn.classList.add('inventory__view-btn--active');
            cardViewBtn.classList.remove('inventory__view-btn--active');
            
            // Excelテーブルデータ生成
            generateExcelTableDataComplete();
            
            console.log('✅ Excelビューに切り替え完了（N3準拠）');
            
        } else {
            console.error('❌ 無効なビュータイプ:', viewType);
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ ビュー切り替えエラー:', error);
        return false;
    }
}

// ========================================
// 【修正4】Excelテーブルデータ生成（完全実装）
// ========================================

function generateExcelTableDataComplete() {
    try {
        console.log('📊 Excelテーブルデータ生成開始');
        
        const tableBody = document.getElementById('excel-table-body');
        if (!tableBody) {
            console.warn('⚠️ excel-table-body要素が見つかりません');
            return false;
        }
        
        // カードビューから現在のデータを取得
        const cards = document.querySelectorAll('.inventory__card');
        
        if (cards.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        表示するデータがありません
                    </td>
                </tr>
            `;
            return false;
        }
        
        const rows = Array.from(cards).map(function(card, index) {
            const id = card.dataset.id || (index + 1);
            const title = card.querySelector('.inventory__card-title')?.textContent?.trim() || '商品名未設定';
            const sku = card.querySelector('.inventory__card-sku')?.textContent?.trim() || 'SKU未設定';
            const priceMain = card.querySelector('.inventory__card-price-main')?.textContent?.trim() || '$0.00';
            const priceSub = card.querySelector('.inventory__card-price-sub')?.textContent?.trim() || '¥0';
            const badge = card.querySelector('.inventory__badge')?.textContent?.trim() || '不明';
            
            // バッジタイプ判定
            let badgeClass = 'table-badge--stock';
            if (badge.includes('無在庫') || badge.includes('dropship')) badgeClass = 'table-badge--dropship';
            else if (badge.includes('セット') || badge.includes('set')) badgeClass = 'table-badge--set';
            else if (badge.includes('ハイブリッド') || badge.includes('hybrid')) badgeClass = 'table-badge--hybrid';
            
            return `
                <tr data-id="${id}">
                    <td>
                        <input type="checkbox" class="product-checkbox" data-id="${id}">
                    </td>
                    <td>
                        <div class="table-image-placeholder">📷</div>
                    </td>
                    <td title="${title}">${title.length > 50 ? title.substring(0, 50) + '...' : title}</td>
                    <td><code>${sku}</code></td>
                    <td>
                        <span class="table-badge ${badgeClass}">${badge}</span>
                    </td>
                    <td style="text-align: right; font-weight: 600;">${priceMain}</td>
                    <td style="text-align: right; color: var(--text-muted);">${priceSub}</td>
                    <td style="text-align: center;">
                        ${badge.includes('無在庫') ? '∞' : Math.floor(Math.random() * 10) + 1}
                    </td>
                    <td>
                        <span style="font-size: 0.7rem; background: var(--color-ebay); color: white; padding: 0.125rem 0.25rem; border-radius: 0.25rem;">eBay</span>
                    </td>
                    <td>
                        <button class="btn-small btn-small--edit" onclick="editProduct(${id})">
                            <i class="fas fa-edit"></i> 編集
                        </button>
                        <button class="btn-small btn-small--delete" onclick="deleteProduct(${id})">
                            <i class="fas fa-trash"></i> 削除
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        tableBody.innerHTML = rows;
        
        // チェックボックス全選択機能
        setupSelectAllCheckbox();
        
        console.log(`✅ Excelテーブルデータ生成完了: ${cards.length}行`);
        return true;
        
    } catch (error) {
        console.error('❌ Excelテーブルデータ生成エラー:', error);
        return false;
    }
}

// ========================================
// 【修正5】チェックボックス全選択機能
// ========================================

function setupSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const productCheckboxes = document.querySelectorAll('.product-checkbox');
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            productCheckboxes.forEach(function(checkbox) {
                checkbox.checked = selectAllCheckbox.checked;
            });
            console.log(`📋 全選択: ${selectAllCheckbox.checked ? 'ON' : 'OFF'}`);
        });
    }
    
    productCheckboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
            const checkedCount = document.querySelectorAll('.product-checkbox:checked').length;
            const totalCount = productCheckboxes.length;
            
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = checkedCount === totalCount;
                selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < totalCount;
            }
        });
    });
}

// ========================================
// 【修正6】テーブル操作関数
// ========================================

function editProduct(productId) {
    console.log('✏️ 商品編集:', productId);
    alert(`商品 ID: ${productId} の編集機能は実装予定です`);
}

function deleteProduct(productId) {
    console.log('🗑️ 商品削除:', productId);
    if (confirm(`商品 ID: ${productId} を削除しますか？`)) {
        // 削除処理（実装予定）
        alert('削除機能は実装予定です');
    }
}

// ========================================
// 【修正7】イベントリスナー設定の修正版
// ========================================

function setupModalEventListenersComplete() {
    console.log('🔧 モーダルイベントリスナー設定（完全版）');
    
    // 新規商品登録ボタン
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.removeEventListener('click', handleAddProductClick);
        addProductBtn.addEventListener('click', handleAddProductClick);
        console.log('✅ 新規商品登録ボタン設定完了');
    }
    
    // セット品作成ボタン  
    const createSetBtn = document.getElementById('create-set-btn');
    if (createSetBtn) {
        createSetBtn.removeEventListener('click', handleCreateSetClick);
        createSetBtn.addEventListener('click', handleCreateSetClick);
        console.log('✅ セット品作成ボタン設定完了');
    }
    
    // モーダル閉じるボタン（×ボタン）
    const closeButtons = document.querySelectorAll('.modal-close');
    closeButtons.forEach(function(btn) {
        btn.removeEventListener('click', handleModalCloseClick);
        btn.addEventListener('click', handleModalCloseClick);
    });
    
    // キャンセルボタン
    const cancelButtons = document.querySelectorAll('#cancel-add-product, #cancel-create-set');
    cancelButtons.forEach(function(btn) {
        btn.removeEventListener('click', handleModalCloseClick);
        btn.addEventListener('click', handleModalCloseClick);
    });
    
    console.log('✅ モーダルイベントリスナー設定完了');
}

function setupViewEventListenersComplete() {
    console.log('🔧 ビューイベントリスナー設定（完全版）');
    
    // カードビューボタン
    const cardViewBtn = document.getElementById('card-view-btn');
    if (cardViewBtn) {
        cardViewBtn.removeEventListener('click', handleCardViewClick);
        cardViewBtn.addEventListener('click', handleCardViewClick);
        console.log('✅ カードビューボタン設定完了');
    }
    
    // リストビューボタン
    const listViewBtn = document.getElementById('list-view-btn');
    if (listViewBtn) {
        listViewBtn.removeEventListener('click', handleListViewClick);
        listViewBtn.addEventListener('click', handleListViewClick);
        console.log('✅ リストビューボタン設定完了');
    }
    
    console.log('✅ ビューイベントリスナー設定完了');
}

// ========================================
// 【修正8】イベントハンドラー関数
// ========================================

function handleAddProductClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('📝 新規商品登録ボタンクリック');
    showModalComplete('add-product-modal');
}

function handleCreateSetClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('📦 セット品作成ボタンクリック');
    showModalComplete('create-set-modal');
}

function handleModalCloseClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 最も近いモーダルを見つけて閉じる
    const modal = e.target.closest('.modal');
    if (modal && modal.id) {
        console.log('🔐 モーダル閉じるボタンクリック:', modal.id);
        hideModalComplete(modal.id);
    } else {
        // フォールバック: 全モーダルを閉じる
        console.log('🔐 フォールバック: 全モーダル閉じる');
        closeAllModalsComplete();
    }
}

function handleCardViewClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('📋 カードビューボタンクリック');
    switchViewComplete('grid');
}

function handleListViewClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('📊 リストビューボタンクリック');
    switchViewComplete('list');
}

// ========================================
// 【修正9】グローバル関数の再定義（上書き）
// ========================================

// 既存のグローバル関数を完全修正版で上書き
window.showAddProductModal = function() {
    return showModalComplete('add-product-modal');
};

window.showCreateSetModal = function() {
    return showModalComplete('create-set-modal');
};

window.closeModal = function(modalId) {
    return hideModalComplete(modalId);
};

window.closeAllModals = function() {
    return closeAllModalsComplete();
};

window.switchView = function(viewType) {
    return switchViewComplete(viewType);
};

// デバッグ用テスト関数
window.testModalSystem = function() {
    console.log('🧪 モーダルシステムテスト開始');
    
    const tests = [
        () => showModalComplete('add-product-modal'),
        () => new Promise(resolve => setTimeout(() => {
            hideModalComplete('add-product-modal');
            resolve();
        }, 2000)),
        () => showModalComplete('create-set-modal'),
        () => new Promise(resolve => setTimeout(() => {
            closeAllModalsComplete();
            resolve();
        }, 2000))
    ];
    
    tests.reduce((promise, test) => promise.then(test), Promise.resolve())
        .then(() => console.log('✅ モーダルシステムテスト完了'));
};

window.testViewSystem = function() {
    console.log('🧪 ビューシステムテスト開始');
    
    setTimeout(() => switchViewComplete('list'), 1000);
    setTimeout(() => switchViewComplete('grid'), 3000);
    setTimeout(() => console.log('✅ ビューシステムテスト完了'), 4000);
};

// ========================================
// 【修正10】初期化統合
// ========================================

function initializeModalViewSystemComplete() {
    console.log('🚀 モーダル・ビューシステム完全初期化');
    
    try {
        // イベントリスナー設定
        setupModalEventListenersComplete();
        setupViewEventListenersComplete();
        
        // 初期状態設定
        switchViewComplete('grid'); // デフォルトはカードビュー
        
        console.log('✅ モーダル・ビューシステム初期化完了');
        return true;
        
    } catch (error) {
        console.error('❌ モーダル・ビューシステム初期化エラー:', error);
        return false;
    }
}

// DOMContentLoaded時の自動初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModalViewSystemComplete);
} else {
    initializeModalViewSystemComplete();
}

console.log('📜 モーダル・ビュー切り替え完全修正版 読み込み完了');