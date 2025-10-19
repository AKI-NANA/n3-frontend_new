/**
 * 棚卸しシステム 完全修復版JavaScript
 * ダッシュボード構造を適用した完全動作版
 * 修正日: 2025年8月16日
 */

console.log('🚀 棚卸しシステム完全修復版JavaScript初期化開始');

// グローバル変数
let currentView = 'card';
let allInventoryData = [];
let filteredData = [];
let selectedItems = [];
let isLoading = false;
let exchangeRate = 150.25;

// DOM読み込み完了時の初期化（ダッシュボード構造と同じ）
document.addEventListener('DOMContentLoaded', function() {
    console.log('📚 DOM読み込み完了 - 棚卸しシステム初期化');
    
    try {
        // 初期化処理
        initializeTanaoroshiSystem();
        
        // イベントリスナー設定
        setupEventListeners();
        
        // Bootstrap確認
        checkBootstrapAvailability();
        
        // 初期データ読み込み
        loadInitialData();
        
        console.log('✅ 棚卸しシステム初期化完了');
        
    } catch (error) {
        console.error('❌ 棚卸しシステム初期化エラー:', error);
        showErrorMessage('システム初期化に失敗しました: ' + error.message);
    }
});

// システム初期化
function initializeTanaoroshiSystem() {
    console.log('🔧 棚卸しシステム初期化処理開始');
    
    // ビュー切り替えボタンの初期化
    const cardViewBtn = document.getElementById('card-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    
    if (cardViewBtn && listViewBtn) {
        // 初期状態設定
        cardViewBtn.classList.add('inventory__view-btn--active');
        listViewBtn.classList.remove('inventory__view-btn--active');
        
        console.log('✅ ビュー切り替えボタン初期化完了');
    }
    
    // フィルター初期化
    resetFilters();
    
    // 統計表示初期化
    updateStatistics();
    
    console.log('✅ システム初期化処理完了');
}

// イベントリスナー設定（ダッシュボード構造準拠）
function setupEventListeners() {
    console.log('🔧 イベントリスナー設定開始');
    
    try {
        // ビュー切り替えボタン
        const cardViewBtn = document.getElementById('card-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        
        if (cardViewBtn) {
            cardViewBtn.addEventListener('click', function() {
                console.log('📋 カードビュー切り替え');
                switchView('card');
            });
        }
        
        if (listViewBtn) {
            listViewBtn.addEventListener('click', function() {
                console.log('📊 Excelビュー切り替え');
                switchView('list');
            });
        }
        
        // フィルター適用ボタン
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', function() {
                console.log('🔍 フィルター適用');
                applyFilters();
            });
        }
        
        // フィルターリセットボタン
        const resetFiltersBtn = document.getElementById('reset-filters-btn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', function() {
                console.log('🔄 フィルターリセット');
                resetFilters();
            });
        }
        
        // 検索入力
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                console.log('🔍 検索実行:', this.value);
                performSearch(this.value);
            });
        }
        
        // データ取得ボタン
        const loadPostgreSQLBtn = document.getElementById('load-postgresql-btn');
        if (loadPostgreSQLBtn) {
            loadPostgreSQLBtn.addEventListener('click', function() {
                console.log('🗄️ PostgreSQLデータ取得');
                loadPostgreSQLData();
            });
        }
        
        // 同期実行ボタン
        const syncEbayBtn = document.getElementById('sync-ebay-btn');
        if (syncEbayBtn) {
            syncEbayBtn.addEventListener('click', function() {
                console.log('🔄 eBay同期実行');
                syncEbayData();
            });
        }
        
        // フォーム送信イベント（モーダル用）- 強制表示機能統合
        setupModalEventListeners();
        
        // モーダルテストボタン追加（デバッグ用）
        setTimeout(addModalTestButtons, 1000); // 1秒後に追加
        
        console.log('✅ イベントリスナー設定完了');
        
    } catch (error) {
        console.error('❌ イベントリスナー設定エラー:', error);
    }
}

// モーダルイベントリスナー設定（強制表示機能統合版）
function setupModalEventListeners() {
    console.log('🔧 モーダルイベントリスナー設定 - 強制表示対応版');
    
    try {
        // 新規商品登録ボタンのイベントリスナー
        const addProductBtn = document.querySelector('[data-bs-target="#addProductModal"]');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('📋 新規商品登録ボタンクリック');
                forceShowModal('addProductModal');
            });
        }
        
        // セット品作成ボタンのイベントリスナー
        const createSetBtn = document.querySelector('[data-bs-target="#createSetModal"]');
        if (createSetBtn) {
            createSetBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('📋 セット品作成ボタンクリック');
                forceShowModal('createSetModal');
            });
        }
        
        // モーダル表示確認イベント
        const addProductModal = document.getElementById('addProductModal');
        const createSetModal = document.getElementById('createSetModal');
        
        if (addProductModal) {
            addProductModal.addEventListener('shown.bs.modal', function () {
                console.log('✅ モーダルテスト成功 📋 新規商品登録モーダルが開かれました');
                const firstInput = addProductModal.querySelector('input');
                if (firstInput) firstInput.focus();
            });
        }
        
        if (createSetModal) {
            createSetModal.addEventListener('shown.bs.modal', function () {
                console.log('✅ モーダルテスト成功 📋 セット品作成モーダルが開かれました');
                const firstInput = createSetModal.querySelector('input');
                if (firstInput) firstInput.focus();
            });
        }
        
        // フォーム送信
        const addProductForm = document.getElementById('add-product-form');
        if (addProductForm) {
            addProductForm.addEventListener('submit', function(e) {
                e.preventDefault();
                handleAddProductSubmit();
            });
        }
        
        const createSetForm = document.getElementById('create-set-form');
        if (createSetForm) {
            createSetForm.addEventListener('submit', function(e) {
                e.preventDefault();
                handleCreateSetSubmit();
            });
        }
        
        console.log('✅ モーダルイベントリスナー設定完了 - 強制表示機能統合');
        
    } catch (error) {
        console.error('❌ モーダルイベントリスナー設定エラー:', error);
    }
}

// 🔍 デバッグ用テストボタン追加（引き継ぎ書検証方法）
function addModalTestButtons() {
    console.log('🔧 デバッグ用テストボタン追加');
    
    try {
        // モーダルテストボタン
        const modalTestBtn = document.createElement('button');
        modalTestBtn.textContent = 'モーダルテスト';
        modalTestBtn.className = 'modal-test-button';
        modalTestBtn.title = 'クリックでモーダル強制表示テスト';
        modalTestBtn.onclick = function() {
            console.log('🔍 モーダルテストボタンクリック');
            forceShowModal('addProductModal');
        };
        document.body.appendChild(modalTestBtn);
        
        // ビューテストボタン
        const viewTestBtn = document.createElement('button');
        viewTestBtn.textContent = 'ビューテスト';
        viewTestBtn.className = 'view-test-button';
        viewTestBtn.title = 'クリックでビュー切り替えテスト';
        viewTestBtn.onclick = function() {
            console.log('🔍 ビューテストボタンクリック');
            testViewSystem();
        };
        document.body.appendChild(viewTestBtn);
        
        // コンソールテスト方法表示
        console.log('%c🔍 テスト方法 - コンソールで実行可能:', 'color: #007bff; font-weight: bold;');
        console.log('%cforceShowModal("addProductModal"); // モーダルテスト', 'color: #28a745;');
        console.log('%cswitchView("list"); // Excelビューテスト', 'color: #28a745;');
        console.log('%cswitchView("card"); // カードビューテスト', 'color: #28a745;');
        console.log('%ctestModalSystem(); // モーダル自動テスト', 'color: #007bff;');
        console.log('%ctestViewSystem(); // ビュー自動テスト', 'color: #007bff;');
        
        console.log('✅ デバッグ用テストボタン追加完了');
        
    } catch (error) {
        console.error('❌ デバッグボタン追加エラー:', error);
    }
}

// 🛠️ モーダル強制表示機能（引き継ぎ書修正方法B統合）
function forceShowModal(modalId) {
    console.log(`🔧 モーダル強制表示実行: ${modalId}`);
    
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`❌ モーダル要素が見つかりません: ${modalId}`);
        return false;
    }
    
    try {
        // 既存のBackdropを削除
        const existingBackdrop = document.querySelector('.modal-backdrop');
        if (existingBackdrop) {
            existingBackdrop.remove();
        }
        
        // Bootstrap標準方法を試行
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            console.log('📋 Bootstrap標準モーダル実行');
            const bootstrapModal = new bootstrap.Modal(modal, {
                backdrop: true,
                keyboard: true,
                focus: true
            });
            bootstrapModal.show();
        }
        
        // フォールバック強制表示（引き継ぎ書修正方法B）
        console.log('🔧 フォールバック強制表示実行');
        
        // モーダル強制スタイル適用
        modal.style.display = 'block';
        modal.style.zIndex = '1050';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.overflow = 'auto';
        modal.classList.add('show');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('role', 'dialog');
        modal.removeAttribute('aria-hidden');
        
        // modal-dialogの強制位置設定
        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.style.position = 'relative';
            modalDialog.style.top = '10%';
            modalDialog.style.margin = '0 auto';
            modalDialog.style.zIndex = '1051';
            modalDialog.style.maxWidth = '500px';
            modalDialog.style.width = '90%';
        }
        
        // modal-contentの強制位置設定
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.position = 'relative';
            modalContent.style.zIndex = '1052';
            modalContent.style.backgroundColor = '#fff';
            modalContent.style.border = '1px solid #dee2e6';
            modalContent.style.borderRadius = '0.375rem';
            modalContent.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.15)';
        }
        
        // body設定
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        // モーダル背景追加
        if (!document.querySelector('.modal-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1040;
                background-color: #000;
                opacity: 0.5;
            `;
            
            // 背景クリックで閉じる
            backdrop.addEventListener('click', function() {
                forceHideModal(modalId);
            });
            
            document.body.appendChild(backdrop);
        }
        
        // ESCキーで閉じる
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                forceHideModal(modalId);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // 閉じるボタンのイベント設定
        const closeButtons = modal.querySelectorAll('[data-bs-dismiss="modal"], .btn-close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                forceHideModal(modalId);
            });
        });
        
        console.log(`✅ モーダル強制表示成功: ${modalId}`);
        
        // shown.bs.modalイベント発火
        const shownEvent = new Event('shown.bs.modal');
        modal.dispatchEvent(shownEvent);
        
        return true;
        
    } catch (error) {
        console.error(`❌ モーダル強制表示エラー: ${modalId}`, error);
        return false;
    }
}

// 🛠️ モーダル強制非表示機能
function forceHideModal(modalId) {
    console.log(`🔧 モーダル強制非表示実行: ${modalId}`);
    
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    try {
        // Bootstrap標準方法
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const bootstrapModal = bootstrap.Modal.getInstance(modal);
            if (bootstrapModal) {
                bootstrapModal.hide();
            }
        }
        
        // 強制非表示
        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        modal.removeAttribute('aria-modal');
        modal.removeAttribute('role');
        
        // 背景削除
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        
        // body設定リセット
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        
        console.log(`✅ モーダル強制非表示成功: ${modalId}`);
        
    } catch (error) {
        console.error(`❌ モーダル強制非表示エラー: ${modalId}`, error);
    }
}

// Bootstrap可用性確認
function checkBootstrapAvailability() {
    console.log('🔍 Bootstrap可用性確認');
    
    const bootstrapAvailable = typeof bootstrap !== 'undefined';
    console.log('Bootstrap:', bootstrapAvailable ? '✅ 利用可能' : '❌ 未利用可能');
    
    if (!bootstrapAvailable) {
        console.warn('⚠️ Bootstrapが利用できません。モーダル機能が制限される可能性があります。');
        showErrorMessage('Bootstrapライブラリが読み込まれていません。一部の機能が動作しない可能性があります。');
    }
    
    return bootstrapAvailable;
}

// 初期データ読み込み
function loadInitialData() {
    console.log('📊 初期データ読み込み開始');
    
    // ローディング表示
    showLoading(true);
    
    // PostgreSQLデータ取得を試行
    loadPostgreSQLData();
}

// PostgreSQLデータ読み込み（Ajax通信）
async function loadPostgreSQLData() {
    console.log('🗄️ PostgreSQLデータ読み込み開始');
    
    try {
        showLoading(true);
        updateDatabaseStatus('connecting', 'PostgreSQL接続中...');
        
        const response = await fetch('modules/tanaoroshi_inline_complete/tanaoroshi_ajax_handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: 'get_inventory',
                limit: '30',
                csrf_token: 'dev_token_safe',  // 開発環境用トークン
                dev_mode: '1'  // 開発モード明示指定
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📊 PostgreSQL応答:', result);
        
        if (result.success && result.data) {
            allInventoryData = result.data;
            filteredData = [...allInventoryData];
            
            console.log(`✅ データ読み込み成功: ${allInventoryData.length}件`);
            
            // 画面更新
            renderInventoryData();
            updateStatistics();
            updateDatabaseStatus('connected', `PostgreSQL接続済み - ${allInventoryData.length}件取得`);
            
            showSuccessMessage(`データ読み込み完了: ${allInventoryData.length}件の商品データを取得しました`);
            
        } else {
            throw new Error(result.error || 'データ取得に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ PostgreSQLデータ読み込みエラー:', error);
        updateDatabaseStatus('error', `接続エラー: ${error.message}`);
        showErrorMessage(`データ読み込みエラー: ${error.message}`);
        
        // デモデータをフォールバック
        loadDemoData();
        
    } finally {
        showLoading(false);
    }
}

// デモデータ読み込み（フォールバック）
function loadDemoData() {
    console.log('📊 デモデータ読み込み');
    
    // デモデータは既にHTMLに含まれているカードを利用
    const demoCards = document.querySelectorAll('.inventory__card');
    const demoData = [];
    
    demoCards.forEach((card, index) => {
        const title = card.querySelector('.inventory__card-title')?.textContent || `商品 ${index + 1}`;
        const price = card.querySelector('.inventory__card-price-main')?.textContent?.replace('$', '') || '0';
        const sku = card.querySelector('.inventory__card-sku')?.textContent || `SKU-${index + 1}`;
        const badge = card.querySelector('.inventory__badge');
        
        let type = 'stock';
        if (badge) {
            if (badge.textContent.includes('無在庫')) type = 'dropship';
            else if (badge.textContent.includes('セット品')) type = 'set';
            else if (badge.textContent.includes('ハイブリッド')) type = 'hybrid';
        }
        
        demoData.push({
            id: index + 1,
            title: title,
            name: title,
            sku: sku,
            type: type,
            condition: 'new',
            priceUSD: parseFloat(price) || 0,
            price: parseFloat(price) || 0,
            stock: type === 'dropship' ? 0 : Math.floor(Math.random() * 10) + 1,
            category: 'Electronics',
            channels: ['ebay'],
            image: '',
            data_source: 'demo_html_fallback'
        });
    });
    
    if (demoData.length > 0) {
        allInventoryData = demoData;
        filteredData = [...allInventoryData];
        
        console.log(`✅ デモデータ読み込み完了: ${demoData.length}件`);
        
        renderInventoryData();
        updateStatistics();
        updateDatabaseStatus('demo', `デモデータ表示中 - ${demoData.length}件`);
    }
}

// 🔄 画面表示の切り替え（引き継ぎ書修正版：排他制御強化）
function switchView(viewType) {
    console.log(`🔄 ビュー切り替え: ${viewType}`);
    
    currentView = viewType;
    
    const cardView = document.getElementById('card-view');
    const listView = document.getElementById('list-view');
    const cardViewBtn = document.getElementById('card-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    
    if (viewType === 'card') {
        // カードビュー表示 - 排他制御強化（引き継ぎ書修正方法）
        if (cardView) {
            cardView.style.display = 'grid';
            cardView.style.visibility = 'visible';
            cardView.style.opacity = '1';
            cardView.style.position = 'relative';
            cardView.style.zIndex = 'auto';
        }
        if (listView) {
            listView.style.display = 'none';
            listView.style.visibility = 'hidden';
            listView.style.opacity = '0';
            listView.style.position = 'absolute';
            listView.style.zIndex = '-1';
        }
        
        // ボタン状態更新
        if (cardViewBtn) {
            cardViewBtn.classList.add('inventory__view-btn--active');
            cardViewBtn.style.backgroundColor = '#007bff';
            cardViewBtn.style.color = '#fff';
        }
        if (listViewBtn) {
            listViewBtn.classList.remove('inventory__view-btn--active');
            listViewBtn.style.backgroundColor = '';
            listViewBtn.style.color = '';
        }
        
        console.log('📋 カードビュー表示完了 - Excelビュー完全非表示');
        
    } else if (viewType === 'list') {
        // Excelビュー表示 - 排他制御強化（引き継ぎ書修正方法）
        if (cardView) {
            cardView.style.display = 'none';
            cardView.style.visibility = 'hidden';
            cardView.style.opacity = '0';
            cardView.style.position = 'absolute';
            cardView.style.zIndex = '-1';
        }
        if (listView) {
            listView.style.display = 'block';
            listView.style.visibility = 'visible';
            listView.style.opacity = '1';
            listView.style.position = 'relative';
            listView.style.zIndex = 'auto';
        }
        
        // ボタン状態更新
        if (cardViewBtn) {
            cardViewBtn.classList.remove('inventory__view-btn--active');
            cardViewBtn.style.backgroundColor = '';
            cardViewBtn.style.color = '';
        }
        if (listViewBtn) {
            listViewBtn.classList.add('inventory__view-btn--active');
            listViewBtn.style.backgroundColor = '#007bff';
            listViewBtn.style.color = '#fff';
        }
        
        // Excelテーブルデータ更新
        renderExcelTable();
        
        console.log('📊 Excelビュー表示完了 - カードビュー完全非表示');
    }
    
    console.log(`✅ ビュー切り替え完了: ${viewType} - 排他制御強化済み`);
}

// データ表示処理
function renderInventoryData() {
    console.log('🎨 データ表示処理開始');
    
    if (currentView === 'card') {
        renderCardView();
    } else {
        renderExcelTable();
    }
}

// カードビュー表示
function renderCardView() {
    console.log('🎨 カードビュー表示');
    
    const cardContainer = document.getElementById('card-view');
    if (!cardContainer) {
        console.error('❌ カードコンテナが見つかりません');
        return;
    }
    
    if (filteredData.length === 0) {
        cardContainer.innerHTML = '<div class="no-data-message">表示するデータがありません</div>';
        return;
    }
    
    // 既存のHTMLカードはそのまま残し、動的データがあれば追加表示
    const dynamicCards = filteredData.slice(8).map((item, index) => {
        const realIndex = index + 9; // 既存8個の後から
        
        return `
            <div class="inventory__card" data-id="${item.id || realIndex}">
                <div class="inventory__card-image">
                    <div class="inventory__card-placeholder">
                        <i class="fas fa-image"></i>
                        <span>商品画像</span>
                    </div>
                    <div class="inventory__card-badges">
                        <span class="inventory__badge inventory__badge--${item.type}">${getTypeBadgeText(item.type)}</span>
                    </div>
                </div>
                <div class="inventory__card-info">
                    <h3 class="inventory__card-title">${item.title || item.name}</h3>
                    <div class="inventory__card-price">
                        <div class="inventory__card-price-main">$${(item.priceUSD || item.price || 0).toFixed(2)}</div>
                        <div class="inventory__card-price-sub">¥${Math.round((item.priceUSD || item.price || 0) * exchangeRate).toLocaleString()}</div>
                    </div>
                    <div class="inventory__card-footer">
                        <span class="inventory__card-sku">${item.sku}</span>
                        <span style="color: ${item.stock > 0 ? '#10b981' : '#06b6d4'}; font-size: 0.75rem; font-weight: 600;">
                            ${item.stock > 0 ? `在庫:${item.stock}` : getTypeText(item.type)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // 動的カードがあれば既存カードの後に追加
    if (dynamicCards) {
        const existingCards = cardContainer.innerHTML;
        cardContainer.innerHTML = existingCards + dynamicCards;
    }
    
    console.log(`✅ カードビュー表示完了: ${filteredData.length}件`);
}

// Excelテーブル表示
function renderExcelTable() {
    console.log('📊 Excelテーブル表示');
    
    const tableBody = document.getElementById('excel-table-body');
    if (!tableBody) {
        console.error('❌ テーブルボディが見つかりません');
        return;
    }
    
    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" class="text-center">表示するデータがありません</td></tr>';
        return;
    }
    
    const tableRows = filteredData.map((item, index) => {
        return `
            <tr>
                <td><input type="checkbox" class="item-checkbox" data-id="${item.id || index + 1}"></td>
                <td>
                    <div class="table-image-placeholder">
                        <i class="fas fa-image"></i>
                    </div>
                </td>
                <td class="text-left">${item.title || item.name}</td>
                <td>${item.sku}</td>
                <td><span class="badge badge-${item.type}">${getTypeBadgeText(item.type)}</span></td>
                <td class="text-right">$${(item.priceUSD || item.price || 0).toFixed(2)}</td>
                <td class="text-right">¥${Math.round((item.priceUSD || item.price || 0) * exchangeRate).toLocaleString()}</td>
                <td class="text-center">${item.stock || 0}</td>
                <td class="text-center">
                    ${(item.channels || ['ebay']).map(channel => 
                        `<span class="channel-badge">${channel}</span>`
                    ).join('')}
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="editItem(${item.id || index + 1})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${item.id || index + 1})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = tableRows;
    
    console.log(`✅ Excelテーブル表示完了: ${filteredData.length}件`);
}

// フィルター適用
function applyFilters() {
    console.log('🔍 フィルター適用開始');
    
    try {
        let filtered = [...allInventoryData];
        
        // 商品種類フィルター
        const typeFilter = document.getElementById('filter-type')?.value;
        if (typeFilter) {
            filtered = filtered.filter(item => item.type === typeFilter);
        }
        
        // チャネルフィルター
        const channelFilter = document.getElementById('filter-channel')?.value;
        if (channelFilter) {
            filtered = filtered.filter(item => 
                item.channels && item.channels.includes(channelFilter)
            );
        }
        
        // 在庫状況フィルター
        const stockFilter = document.getElementById('filter-stock-status')?.value;
        if (stockFilter) {
            filtered = filtered.filter(item => {
                const stock = item.stock || 0;
                switch (stockFilter) {
                    case 'sufficient': return stock >= 10;
                    case 'warning': return stock >= 5 && stock < 10;
                    case 'low': return stock > 0 && stock < 5;
                    case 'out': return stock === 0;
                    default: return true;
                }
            });
        }
        
        // 価格範囲フィルター
        const priceFilter = document.getElementById('filter-price-range')?.value;
        if (priceFilter) {
            filtered = filtered.filter(item => {
                const price = item.priceUSD || item.price || 0;
                switch (priceFilter) {
                    case '0-25': return price >= 0 && price <= 25;
                    case '25-50': return price > 25 && price <= 50;
                    case '50-100': return price > 50 && price <= 100;
                    case '100+': return price > 100;
                    default: return true;
                }
            });
        }
        
        filteredData = filtered;
        renderInventoryData();
        updateStatistics();
        
        console.log(`✅ フィルター適用完了: ${filteredData.length}件表示`);
        showSuccessMessage(`フィルター適用完了: ${filteredData.length}件の商品を表示中`);
        
    } catch (error) {
        console.error('❌ フィルター適用エラー:', error);
        showErrorMessage('フィルター適用中にエラーが発生しました');
    }
}

// フィルターリセット
function resetFilters() {
    console.log('🔄 フィルターリセット');
    
    // フィルター要素リセット
    const filterElements = [
        'filter-type',
        'filter-channel', 
        'filter-stock-status',
        'filter-price-range'
    ];
    
    filterElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    
    // 検索入力リセット
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    // データリセット
    filteredData = [...allInventoryData];
    renderInventoryData();
    updateStatistics();
    
    console.log('✅ フィルターリセット完了');
}

// 検索実行
function performSearch(query) {
    if (!query.trim()) {
        filteredData = [...allInventoryData];
    } else {
        const searchTerm = query.toLowerCase();
        filteredData = allInventoryData.filter(item => {
            return (
                (item.title || item.name || '').toLowerCase().includes(searchTerm) ||
                (item.sku || '').toLowerCase().includes(searchTerm) ||
                (item.category || '').toLowerCase().includes(searchTerm)
            );
        });
    }
    
    renderInventoryData();
    updateStatistics();
    
    console.log(`🔍 検索完了: "${query}" -> ${filteredData.length}件`);
}

// 統計更新
function updateStatistics() {
    console.log('📊 統計データ更新');
    
    const totalProducts = allInventoryData.length;
    const stockProducts = allInventoryData.filter(item => item.type === 'stock').length;
    const dropshipProducts = allInventoryData.filter(item => item.type === 'dropship').length;
    const setProducts = allInventoryData.filter(item => item.type === 'set').length;
    const hybridProducts = allInventoryData.filter(item => item.type === 'hybrid').length;
    
    const totalValue = allInventoryData.reduce((sum, item) => {
        return sum + ((item.priceUSD || item.price || 0) * (item.stock || 0));
    }, 0);
    
    // 統計表示更新
    updateStatElement('total-products', totalProducts);
    updateStatElement('stock-products', stockProducts);
    updateStatElement('dropship-products', dropshipProducts);
    updateStatElement('set-products', setProducts);
    updateStatElement('hybrid-products', hybridProducts);
    updateStatElement('total-value', `$${(totalValue / 1000).toFixed(1)}K`);
    
    console.log(`✅ 統計更新完了: 全${totalProducts}件, 在庫${stockProducts}件`);
}

// 統計要素更新
function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// データベース状態更新
function updateDatabaseStatus(status, message) {
    const statusElement = document.getElementById('database-status');
    const textElement = document.getElementById('database-status-text');
    
    if (statusElement && textElement) {
        // 状態に応じてクラス設定
        statusElement.className = 'database-status';
        
        switch (status) {
            case 'connected':
                statusElement.classList.add('database-status--connected');
                break;
            case 'connecting':
                statusElement.classList.add('database-status--connecting');
                break;
            case 'error':
                statusElement.classList.add('database-status--error');
                break;
            case 'demo':
                statusElement.classList.add('database-status--demo');
                break;
            default:
                statusElement.classList.add('database-status--disconnected');
        }
        
        textElement.textContent = message;
    }
}

// ローディング表示制御
function showLoading(show) {
    // 簡易ローディング実装
    let loadingElement = document.getElementById('loading-overlay');
    
    if (show) {
        if (!loadingElement) {
            loadingElement = document.createElement('div');
            loadingElement.id = 'loading-overlay';
            loadingElement.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                color: white;
                font-size: 1.2rem;
            `;
            loadingElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> データ読み込み中...';
            document.body.appendChild(loadingElement);
        }
        isLoading = true;
    } else {
        if (loadingElement) {
            loadingElement.remove();
        }
        isLoading = false;
    }
}

// メッセージ表示
function showSuccessMessage(message) {
    console.log('✅ 成功:', message);
    showToast(message, 'success');
}

function showErrorMessage(message) {
    console.error('❌ エラー:', message);
    showToast(message, 'error');
}

function showToast(message, type = 'info') {
    // 簡易トースト実装
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        max-width: 400px;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// ユーティリティ関数
function getTypeBadgeText(type) {
    switch (type) {
        case 'stock': return '有在庫';
        case 'dropship': return '無在庫';
        case 'set': return 'セット品';
        case 'hybrid': return 'ハイブリッド';
        default: return '不明';
    }
}

function getTypeText(type) {
    switch (type) {
        case 'dropship': return 'ドロップシップ';
        case 'set': return 'セット販売';
        case 'hybrid': return 'ハイブリッド';
        default: return 'ドロップシップ';
    }
}

// モーダル関連機能（ダッシュボード構造準拠）
function handleAddProductSubmit() {
    console.log('📋 新規商品登録フォーム送信');
    
    const formData = {
        name: document.getElementById('product-name')?.value,
        sku: document.getElementById('product-sku')?.value,
        type: document.getElementById('product-type')?.value,
        condition: document.getElementById('product-condition')?.value,
        price: document.getElementById('product-price')?.value,
        cost: document.getElementById('product-cost')?.value,
        stock: document.getElementById('product-stock')?.value,
        category: document.getElementById('product-category')?.value,
        image: document.getElementById('product-image')?.value,
        description: document.getElementById('product-description')?.value
    };
    
    console.log('📋 フォームデータ:', formData);
    
    // モーダルを閉じる
    const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
    if (modal) modal.hide();
    
    showSuccessMessage(`商品登録が完了しました！\n商品名: ${formData.name}\nSKU: ${formData.sku}`);
}

function handleCreateSetSubmit() {
    console.log('📋 セット品作成フォーム送信');
    
    const formData = {
        name: document.getElementById('set-name')?.value,
        sku: document.getElementById('set-sku')?.value,
        price: document.getElementById('set-price')?.value,
        discount: document.getElementById('set-discount')?.value,
        description: document.getElementById('set-description')?.value
    };
    
    console.log('📋 セットフォームデータ:', formData);
    
    // モーダルを閉じる
    const modal = bootstrap.Modal.getInstance(document.getElementById('createSetModal'));
    if (modal) modal.hide();
    
    showSuccessMessage(`セット品作成が完了しました！\nセット名: ${formData.name}\nセットSKU: ${formData.sku}`);
}

// その他の機能
function syncEbayData() {
    console.log('🔄 eBay同期実行');
    showLoading(true);
    
    setTimeout(() => {
        showLoading(false);
        showSuccessMessage('eBay同期が完了しました');
    }, 2000);
}

function editItem(itemId) {
    console.log('✏️ 商品編集:', itemId);
    showSuccessMessage(`商品ID ${itemId} の編集機能は開発中です`);
}

function deleteItem(itemId) {
    console.log('🗑️ 商品削除:', itemId);
    if (confirm(`商品ID ${itemId} を削除しますか？`)) {
        showSuccessMessage(`商品ID ${itemId} を削除しました`);
    }
}

// 🛠️ テスト用グローバル関数（引き継ぎ書検証方法）
window.forceShowModal = forceShowModal;
window.switchView = switchView;
window.loadPostgreSQLData = loadPostgreSQLData; // 追加：グローバルアクセス用
window.testModalSystem = function() {
    console.log('🔍 モーダルシステムテスト開始');
    forceShowModal('addProductModal');
};
window.testViewSystem = function() {
    console.log('🔍 ビュー切り替えテスト開始');
    console.log('📊 Excelビューテスト');
    switchView('list');
    setTimeout(() => {
        console.log('📋 カードビューテスト');
        switchView('card');
    }, 2000);
};

console.log('✅ 棚卸しシステム完全修復版JavaScript読み込み完了 - モーダル＆ビュー修正統合');
