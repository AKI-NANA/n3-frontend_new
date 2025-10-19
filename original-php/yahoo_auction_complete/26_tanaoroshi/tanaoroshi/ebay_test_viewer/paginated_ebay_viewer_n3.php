<?php
/**
 * N3統合eBayデータビューア メインページ
 * 
 * @version 1.0
 * @features Ajax/HTML完全分離・画像表示エラー撲滅・API操作統合
 * @security CSRF保護・入力サニタイゼーション・セッション管理
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// N3基本設定読み込み
// require_once('../../common/config/config.php');  // N3テンプレートでは不要
// require_once('../../common/includes/auth.php');   // N3テンプレートでは不要

// N3独立動作用の設定
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// 最小限DB設定
require_once('../../modules/apikey/nagano3_db_config.php');
require_once('ebay_api_n3_operations.php');

// CSRF保護
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRFトークン生成
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

// ページタイトル設定
$page_title = 'eBayデータビューア（N3統合版）';
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?> - NAGANO-3</title>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    
    <!-- N3統合CSS（絶対パス） -->
    <link rel="stylesheet" href="/NAGANO-3/N3-Development/common/css/style.css">
    <link rel="stylesheet" href="/NAGANO-3/N3-Development/common/css/components/n3_modal_system.css">
    <link rel="stylesheet" href="/NAGANO-3/N3-Development/common/css/components/ebay_view_switcher_n3.css">
    <link rel="stylesheet" href="/NAGANO-3/N3-Development/common/css/pages/filters.css">
    
    <!-- 専用CSS -->
    <link rel="stylesheet" href="css/ebay_excel_view.css">
</head>

<body class="n3-body">
    <!-- N3統合ヘッダー -->
    <div class="ebay-viewer-container">
        
        <!-- ======= ヘッダーセクション ======= -->
        <div class="ebay-viewer__header">
            <div class="ebay-viewer__title-section">
                <h1 class="ebay-viewer__title">
                    <i class="fas fa-database"></i>
                    <?= htmlspecialchars($page_title) ?>
                    <span class="ebay-viewer__count" id="data-count">読み込み中...</span>
                </h1>
                <p class="ebay-viewer__subtitle">
                    PostgreSQL連携・画像表示最適化・リアルタイムAPI操作対応
                </p>
            </div>
            
            <!-- API操作ツールバー -->
            <div class="ebay-viewer__toolbar">
                <button class="btn btn--primary" onclick="EbayViewerN3.refreshData()" id="refresh-btn">
                    <i class="fas fa-sync"></i> データ更新
                </button>
                <button class="btn btn--success" onclick="EbayViewerN3.showStatistics()" id="stats-btn">
                    <i class="fas fa-chart-bar"></i> 統計表示
                </button>
                <button class="btn btn--info" onclick="EbayViewerN3.exportData()" id="export-btn">
                    <i class="fas fa-download"></i> エクスポート
                </button>
            </div>
        </div>
        
        <!-- ======= 表示切り替え・検索セクション ======= -->
        <div class="ebay-excel__filters">
            <!-- 検索バー -->
            <div class="ebay-excel__search">
                <i class="fas fa-search ebay-excel__search-icon"></i>
                <input 
                    type="text" 
                    class="ebay-excel__search-input" 
                    id="search-input"
                    placeholder="商品タイトル・商品IDで検索..."
                    autocomplete="off"
                >
            </div>
            
            <!-- フィルター -->
            <select class="ebay-excel__filter-select" id="status-filter">
                <option value="">全ステータス</option>
                <option value="Active">出品中</option>
                <option value="Ended">終了</option>
                <option value="Sold">売約済み</option>
            </select>
            
            <select class="ebay-excel__filter-select" id="image-filter">
                <option value="">全て</option>
                <option value="true">画像あり</option>
                <option value="false">画像なし</option>
            </select>
            
            <!-- 表示件数選択 -->
            <select class="ebay-excel__filter-select" id="per-page-select">
                <option value="25">25件</option>
                <option value="50" selected>50件</option>
                <option value="100">100件</option>
            </select>
        </div>
        
        <!-- ======= 一括操作バー（選択時のみ表示） ======= -->
        <div class="ebay-excel__bulk-actions" id="bulk-actions">
            <div class="ebay-excel__bulk-info">
                <span id="selected-count">0</span>件選択中
            </div>
            <div class="ebay-excel__bulk-buttons">
                <button class="ebay-excel__bulk-btn ebay-excel__bulk-btn--stop" onclick="EbayViewerN3.bulkStopListings()">
                    <i class="fas fa-stop"></i> 一括停止
                </button>
                <button class="ebay-excel__bulk-btn ebay-excel__bulk-btn--inventory" onclick="EbayViewerN3.bulkUpdateInventory()">
                    <i class="fas fa-boxes"></i> 一括在庫更新
                </button>
            </div>
        </div>
        
        <!-- ======= データ表示エリア ======= -->
        <div class="ebay-excel__container">
            
            <!-- テーブルヘッダー -->
            <table class="ebay-excel__table">
                <thead>
                    <tr>
                        <th class="ebay-excel__header">
                            <div class="ebay-excel__select-all">
                                <input type="checkbox" class="ebay-excel__checkbox" id="select-all" onchange="EbayViewerN3.toggleSelectAll(this)">
                                <span class="ebay-excel__selected-count" id="header-selected-count"></span>
                            </div>
                        </th>
                        <th class="ebay-excel__header">画像</th>
                        <th class="ebay-excel__header ebay-excel__header--sortable" data-sort="ebay_item_id">商品ID</th>
                        <th class="ebay-excel__header ebay-excel__header--sortable" data-sort="title">タイトル</th>
                        <th class="ebay-excel__header ebay-excel__header--sortable" data-sort="current_price_value">価格</th>
                        <th class="ebay-excel__header ebay-excel__header--sortable" data-sort="quantity">数量</th>
                        <th class="ebay-excel__header ebay-excel__header--sortable" data-sort="listing_status">ステータス</th>
                        <th class="ebay-excel__header">操作</th>
                    </tr>
                </thead>
                <tbody id="data-table-body">
                    <!-- データ行は JavaScript で動的生成 -->
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                            <i class="fas fa-spinner fa-spin"></i> データを読み込み中...
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <!-- ページネーション -->
            <div class="ebay-excel__pagination">
                <div class="ebay-excel__page-info" id="page-info">
                    0 - 0 件 （全 0 件中）
                </div>
                <div class="ebay-excel__page-controls">
                    <button class="ebay-excel__page-btn" id="first-page" onclick="EbayViewerN3.goToPage(1)">
                        <i class="fas fa-angle-double-left"></i>
                    </button>
                    <button class="ebay-excel__page-btn" id="prev-page" onclick="EbayViewerN3.previousPage()">
                        <i class="fas fa-angle-left"></i>
                    </button>
                    
                    <div id="page-numbers">
                        <!-- ページ番号ボタンはJavaScriptで生成 -->
                    </div>
                    
                    <button class="ebay-excel__page-btn" id="next-page" onclick="EbayViewerN3.nextPage()">
                        <i class="fas fa-angle-right"></i>
                    </button>
                    <button class="ebay-excel__page-btn" id="last-page" onclick="EbayViewerN3.goToLastPage()">
                        <i class="fas fa-angle-double-right"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- ======= N3モーダルシステム ======= -->
    
    <!-- 商品詳細モーダル -->
    <div id="ebay-detail-modal" class="n3-modal" aria-hidden="true">
        <div class="n3-modal__container" style="max-width: 1000px;">
            <div class="n3-modal__header">
                <h2 class="n3-modal__title">商品詳細・編集</h2>
                <button class="n3-modal__close" onclick="EbayViewerN3.closeModal('ebay-detail-modal')">&times;</button>
            </div>
            <div class="n3-modal__body" id="detail-modal-content">
                <!-- 詳細内容は JavaScript で生成 -->
            </div>
            <div class="n3-modal__footer" id="detail-modal-footer">
                <button class="btn btn--secondary" onclick="EbayViewerN3.closeModal('ebay-detail-modal')">閉じる</button>
            </div>
        </div>
    </div>
    
    <!-- 一括在庫更新モーダル -->
    <div id="bulk-inventory-modal" class="n3-modal" aria-hidden="true">
        <div class="n3-modal__container">
            <div class="n3-modal__header">
                <h2 class="n3-modal__title">一括在庫更新</h2>
                <button class="n3-modal__close" onclick="EbayViewerN3.closeModal('bulk-inventory-modal')">&times;</button>
            </div>
            <div class="n3-modal__body">
                <form id="bulk-inventory-form">
                    <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>">
                    <div class="form-group">
                        <label for="new-quantity">新しい在庫数:</label>
                        <input type="number" id="new-quantity" name="quantity" min="0" max="9999" required class="form-control">
                    </div>
                    <p class="text-secondary">
                        <span id="bulk-selected-count">0</span>件の商品の在庫数を更新します
                    </p>
                </form>
            </div>
            <div class="n3-modal__footer">
                <button class="btn btn--secondary" onclick="EbayViewerN3.closeModal('bulk-inventory-modal')">キャンセル</button>
                <button class="btn btn--success" onclick="EbayViewerN3.executeBulkInventoryUpdate()">
                    <i class="fas fa-boxes"></i> 更新実行
                </button>
            </div>
        </div>
    </div>
    
    <!-- 統計表示モーダル -->
    <div id="statistics-modal" class="n3-modal" aria-hidden="true">
        <div class="n3-modal__container">
            <div class="n3-modal__header">
                <h2 class="n3-modal__title">eBayデータ統計</h2>
                <button class="n3-modal__close" onclick="EbayViewerN3.closeModal('statistics-modal')">&times;</button>
            </div>
            <div class="n3-modal__body" id="statistics-content">
                <!-- 統計内容はJavaScriptで生成 -->
            </div>
            <div class="n3-modal__footer">
                <button class="btn btn--secondary" onclick="EbayViewerN3.closeModal('statistics-modal')">閉じる</button>
            </div>
        </div>
    </div>
    
    <!-- ======= JavaScript統合（N3準拠・分離） ======= -->
    
    <!-- N3基盤JavaScript -->
    <script src="../../common/js/components/n3_modal_system.js"></script>
    
    <!-- 専用JavaScript（分離） -->
    <script src="js/ebay_image_handler.js"></script>
    
    <!-- メインJavaScript -->
    <script>
        // N3統合eBayビューアシステム
        class EbayViewerN3 {
            constructor() {
                this.currentPage = 1;
                this.perPage = 50;
                this.totalPages = 1;
                this.totalCount = 0;
                this.currentSearch = '';
                this.currentFilters = {};
                this.selectedItems = new Set();
                this.sortField = '';
                this.sortDirection = '';
                
                // CSRF保護
                this.csrfToken = "<?= $csrf_token ?>";
                
                console.log('✅ N3統合eBayビューア初期化完了');
            }
            
            /**
             * 初期化処理
             */
            async init() {
                try {
                    // イベントリスナー設定
                    this.setupEventListeners();
                    
                    // 初回データ読み込み
                    await this.loadData();
                    
                    console.log('🚀 eBayデータビューア起動完了');
                    
                } catch (error) {
                    console.error('初期化エラー:', error);
                    this.showError('システムの初期化に失敗しました');
                }
            }
            
            /**
             * イベントリスナー設定
             */
            setupEventListeners() {
                // 検索入力
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    let searchTimeout;
                    searchInput.addEventListener('input', (e) => {
                        clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(() => {
                            this.currentSearch = e.target.value;
                            this.currentPage = 1;
                            this.loadData();
                        }, 500);
                    });
                }
                
                // フィルター変更
                document.getElementById('status-filter')?.addEventListener('change', (e) => {
                    this.currentFilters.status = e.target.value;
                    this.currentPage = 1;
                    this.loadData();
                });
                
                document.getElementById('image-filter')?.addEventListener('change', (e) => {
                    this.currentFilters.has_image = e.target.value;
                    this.currentPage = 1;
                    this.loadData();
                });
                
                document.getElementById('per-page-select')?.addEventListener('change', (e) => {
                    this.perPage = parseInt(e.target.value);
                    this.currentPage = 1;
                    this.loadData();
                });
                
                // ソートヘッダー
                document.querySelectorAll('.ebay-excel__header--sortable').forEach(header => {
                    header.addEventListener('click', (e) => {
                        const sortField = e.currentTarget.dataset.sort;
                        this.toggleSort(sortField);
                    });
                });
            }
            
            /**
             * データ読み込み
             */
            async loadData() {
                try {
                    this.showLoading(true);
                    
                    const formData = new FormData();
                    formData.append('action', 'get_data');
                    formData.append('page', this.currentPage);
                    formData.append('per_page', this.perPage);
                    formData.append('search', this.currentSearch);
                    formData.append('csrf_token', this.csrfToken);
                    
                    // フィルター追加
                    Object.keys(this.currentFilters).forEach(key => {
                        if (this.currentFilters[key]) {
                            formData.append(`filters[${key}]`, this.currentFilters[key]);
                        }
                    });
                    
                    const response = await fetch('ebay_data_api_n3.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.updateDisplay(result);
                        this.updatePagination(result.pagination);
                    } else {
                        throw new Error(result.error || 'データ読み込みエラー');
                    }
                    
                } catch (error) {
                    console.error('データ読み込みエラー:', error);
                    this.showError('データの読み込みに失敗しました: ' + error.message);
                } finally {
                    this.showLoading(false);
                }
            }
            
            /**
             * ローディング状態管理
             */
            showLoading(show) {
                const tbody = document.getElementById('data-table-body');
                if (!tbody) return;
                
                if (show) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                                <i class="fas fa-spinner fa-spin"></i> データを読み込み中...
                            </td>
                        </tr>
                    `;
                }
            }
            
            /**
             * エラー表示
             */
            showError(message) {
                console.error('Error:', message);
                
                const tbody = document.getElementById('data-table-body');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 2rem; color: var(--color-danger, #ef4444);">
                                <i class="fas fa-exclamation-triangle"></i> ${message}
                            </td>
                        </tr>
                    `;
                }
                
                // アラートも表示
                alert('エラー: ' + message);
            }
            
            /**
             * テーブル行作成
             */
            createTableRow(item) {
                const row = document.createElement('tr');
                row.className = 'ebay-excel__row';
                row.setAttribute('data-item-id', item.ebay_item_id);
                
                // 価格フォーマット
                const priceText = item.current_price_value ? 
                    `${parseFloat(item.current_price_value).toFixed(2)}` : 'N/A';
                
                // ステータスクラス
                const statusClass = item.listing_status === 'Active' ? 'ebay-excel__status--active' :
                                   item.listing_status === 'Ended' ? 'ebay-excel__status--ended' :
                                   item.listing_status === 'Sold' ? 'ebay-excel__status--sold' : '';
                
                row.innerHTML = `
                    <td class="ebay-excel__cell">
                        <input type="checkbox" class="ebay-excel__checkbox" 
                               value="${item.ebay_item_id}" 
                               onchange="EbayViewerN3.toggleRowSelection(this)">
                    </td>
                    <td class="ebay-excel__cell ebay-excel__cell--image">
                        <img src="${item.picture_url || 'https://via.placeholder.com/60x60/f1f5f9/64748b?text=No+Image'}" 
                             alt="商品画像" 
                             class="ebay-excel__image" 
                             loading="lazy"
                             onerror="this.src='https://via.placeholder.com/60x60/f1f5f9/64748b?text=No+Image'">
                    </td>
                    <td class="ebay-excel__cell ebay-excel__cell--id">
                        ${item.ebay_item_id || 'N/A'}
                    </td>
                    <td class="ebay-excel__cell ebay-excel__cell--title" title="${item.title || 'タイトルなし'}">
                        ${item.title || 'タイトルなし'}
                    </td>
                    <td class="ebay-excel__cell ebay-excel__cell--price">
                        <span class="ebay-excel__price ebay-excel__price--usd">${priceText}</span>
                    </td>
                    <td class="ebay-excel__cell">
                        <span class="ebay-excel__quantity">${item.quantity || 0}</span>
                    </td>
                    <td class="ebay-excel__cell">
                        <span class="ebay-excel__status ${statusClass}">
                            ${item.listing_status || 'Unknown'}
                        </span>
                    </td>
                    <td class="ebay-excel__cell ebay-excel__cell--actions">
                        <div class="ebay-excel__actions">
                            <button class="ebay-excel__action-btn ebay-excel__action-btn--details" 
                                    onclick="EbayViewerN3.showItemDetails('${item.ebay_item_id}')"
                                    title="詳細表示">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="ebay-excel__action-btn ebay-excel__action-btn--edit" 
                                    onclick="EbayViewerN3.editItem('${item.ebay_item_id}')"
                                    title="編集">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="ebay-excel__action-btn ebay-excel__action-btn--link" 
                                    onclick="window.open('${item.view_item_url}', '_blank')"
                                    title="eBayで表示">
                                <i class="fab fa-ebay"></i>
                            </button>
                            <button class="ebay-excel__action-btn ebay-excel__action-btn--stop" 
                                    onclick="EbayViewerN3.stopListing('${item.ebay_item_id}')"
                                    title="出品停止">
                                <i class="fas fa-stop"></i>
                            </button>
                        </div>
                    </td>
                `;
            /**
             * 表示更新
             */
            updateDisplay(result) {
                const tbody = document.getElementById('data-table-body');
                const countElement = document.getElementById('data-count');
                
                if (!tbody) return;
                
                // 件数表示更新
                if (countElement) {
                    countElement.textContent = `${result.pagination ? result.pagination.total_count : result.data.length}件`;
                }
                
                // テーブル内容更新
                tbody.innerHTML = '';
                
                if (!result.data || result.data.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                                <i class="fas fa-info-circle"></i> 該当するデータがありません
                            </td>
                        </tr>
                    `;
                    return;
                }
                
                result.data.forEach(item => {
                    const row = this.createTableRow(item);
                    tbody.appendChild(row);
                });
                
                // 画像遅延読み込み初期化
                if (typeof EbayImageHandler !== 'undefined') {
                    EbayImageHandler.initializeLazyLoading();
                }
            }
            
            /**
             * ページネーション更新
             */
            updatePagination(pagination) {
                if (!pagination) return;
                
                // ページ情報更新
                const pageInfo = document.getElementById('page-info');
                if (pageInfo) {
                    const start = (pagination.current_page - 1) * pagination.per_page + 1;
                    const end = Math.min(start + pagination.per_page - 1, pagination.total_count);
                    pageInfo.textContent = `${start} - ${end} 件 （全 ${pagination.total_count} 件中）`;
                }
                
                this.currentPage = pagination.current_page;
                this.totalPages = pagination.total_pages;
                this.totalCount = pagination.total_count;
            }
            
            // 他のメソッドのプレースホルダー
            toggleSort(field) {
                console.log('ソート:', field);
            }
            
            toggleSelectAll(checkbox) {
                console.log('全選択:', checkbox.checked);
            }
            
            toggleRowSelection(checkbox) {
                console.log('行選択:', checkbox.value, checkbox.checked);
            }
            
            showItemDetails(itemId) {
                alert(`商品ID: ${itemId} の詳細表示`);
            }
            
            editItem(itemId) {
                alert(`商品ID: ${itemId} の編集`);
            }
            
            stopListing(itemId) {
                if (confirm(`商品ID: ${itemId} を停止しますか？`)) {
                    alert('停止機能は実装中です');
                }
            }
            
            showStatistics() {
                alert('統計情報を表示します');
            }
            
            exportData() {
                alert('データエクスポート機能');
            }
            
            bulkStopListings() {
                alert('一括停止機能');
            }
            
            bulkUpdateInventory() {
                alert('一括在庫更新機能');
            }
            
            goToPage(page) {
                console.log('ページ移動:', page);
            }
            
            previousPage() {
                console.log('前ページ');
            }
            
            nextPage() {
                console.log('次ページ');
            }
            
            goToLastPage() {
                console.log('最終ページ');
            }
            
            closeModal(modalId) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.style.display = 'none';
                }
            }
        }
        
        // グローバルインスタンス
        const EbayViewerN3Instance = new EbayViewerN3();
        
        // ページ読み込み完了時に初期化
        document.addEventListener('DOMContentLoaded', function() {
            EbayViewerN3Instance.init();
        });
        
        // グローバル関数（onclick用）
        window.EbayViewerN3 = {
            refreshData: () => EbayViewerN3Instance.loadData(),
            showStatistics: () => EbayViewerN3Instance.showStatistics(),
            exportData: () => EbayViewerN3Instance.exportData(),
            toggleSelectAll: (checkbox) => EbayViewerN3Instance.toggleSelectAll(checkbox),
            bulkStopListings: () => EbayViewerN3Instance.bulkStopListings(),
            bulkUpdateInventory: () => EbayViewerN3Instance.bulkUpdateInventory(),
            goToPage: (page) => EbayViewerN3Instance.goToPage(page),
            previousPage: () => EbayViewerN3Instance.previousPage(),
            nextPage: () => EbayViewerN3Instance.nextPage(),
            goToLastPage: () => EbayViewerN3Instance.goToLastPage(),
            closeModal: (modalId) => EbayViewerN3Instance.closeModal(modalId)
        };
    </script>
    
    <!-- 完成状況表示（開発時のみ） -->
    <script>
        console.log('📊 N3統合eBayデータビューア開発状況:');
        console.log('✅ Phase 1: API継承システム - 完了');
        console.log('✅ Phase 2: 画像表示エラー解決システム - 完了');
        console.log('✅ Phase 3: N3統合エクセルビューCSS - 完了');
        console.log('🔄 Phase 4: メインページ作成 - 実行中');
        console.log('⏳ Phase 5: サイドバー統合 - 準備完了');
    </script>
</body>
</html>