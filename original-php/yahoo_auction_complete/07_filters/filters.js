/**
 * フィルターツール専用JavaScript
 * 2段階フィルタリングプロセス・モール選択・API連携
 */

class FilterManager {
    constructor() {
        this.csrfToken = this.getCSRFToken();
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeMallSelectors();
        this.updateUI();
        console.log('フィルターツール初期化完了');
    }

    getCSRFToken() {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag ? metaTag.getAttribute('content') : 
               document.querySelector('input[name="csrf_token"]')?.value || '';
    }

    bindEvents() {
        // モール選択のイベントリスナー
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('mall-selector')) {
                this.handleMallSelection(e.target);
            }
        });

        // チェックボックス全選択
        const selectAllProducts = document.getElementById('selectAllProducts');
        if (selectAllProducts) {
            selectAllProducts.addEventListener('change', this.toggleAllProducts);
        }

        // 個別チェックボックス
        document.querySelectorAll('.product-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', this.updateSelectedCount);
        });

        // 出品ボタンのイベント
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('listing-btn') || 
                e.target.closest('.listing-btn')) {
                const button = e.target.classList.contains('listing-btn') ? 
                              e.target : e.target.closest('.listing-btn');
                if (!button.disabled) {
                    this.handleListingAction(button);
                }
            }
        });
    }

    initializeMallSelectors() {
        document.querySelectorAll('.mall-selector').forEach(selector => {
            // 第1段階フィルターが通過していない場合は無効化
            const row = selector.closest('tr');
            const exportStatus = row.querySelector('[data-filter="export"]');
            const patentStatus = row.querySelector('[data-filter="patent"]');
            
            // 輸出・特許フィルターが両方ともOKでない場合は無効化
            const exportOK = row.querySelector('.filter-status .status-success[title*="輸出OK"]');
            const patentOK = row.querySelectorAll('.filter-status .status-success[title*="特許OK"]')[0];
            
            if (!exportOK || !patentOK) {
                selector.disabled = true;
                selector.title = '第1段階フィルター（輸出・特許）を通過後に選択可能';
            }
        });
    }

    async handleMallSelection(selector) {
        const productId = selector.getAttribute('data-product-id');
        const selectedMall = selector.value;
        
        if (!productId) {
            console.error('商品IDが見つかりません');
            return;
        }

        // 選択がクリアされた場合
        if (!selectedMall) {
            await this.clearMallFilter(productId);
            return;
        }

        // ローディング状態に設定
        this.setLoadingState(selector, true);
        
        try {
            // APIを呼び出してモール専用フィルターを実行
            const result = await this.executeMallFilter(productId, selectedMall);
            
            if (result.success) {
                this.updateProductRow(productId, result.data);
                this.showNotification(`${selectedMall}モール用フィルター処理完了`, 'success');
            } else {
                this.showNotification(`フィルター処理エラー: ${result.message}`, 'error');
                selector.value = ''; // 選択をリセット
            }
        } catch (error) {
            console.error('モールフィルター実行エラー:', error);
            this.showNotification('システムエラーが発生しました', 'error');
            selector.value = ''; // 選択をリセット
        } finally {
            this.setLoadingState(selector, false);
        }
    }

    async executeMallFilter(productId, mallName) {
        const response = await fetch('api/filter_handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.csrfToken
            },
            body: JSON.stringify({
                action: 'execute_mall_filter',
                product_id: parseInt(productId),
                mall_name: mallName
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    async clearMallFilter(productId) {
        try {
            const response = await fetch('api/filter_handler.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify({
                    action: 'clear_mall_filter',
                    product_id: parseInt(productId)
                })
            });

            const result = await response.json();
            if (result.success) {
                this.updateProductRow(productId, result.data);
            }
        } catch (error) {
            console.error('モールフィルタークリアエラー:', error);
        }
    }

    updateProductRow(productId, data) {
        const row = document.querySelector(`tr[data-product-id="${productId}"]`);
        if (!row) return;

        // モールフィルター状態を更新
        const mallStatusCell = row.querySelector('.filter-status:last-of-type');
        if (mallStatusCell) {
            let statusHTML = '';
            if (data.mall_filter_status === null) {
                statusHTML = '<span class="status-badge status-pending" title="モール未選択"><i class="fas fa-clock"></i></span>';
            } else if (data.mall_filter_status) {
                statusHTML = '<span class="status-badge status-success" title="モールOK"><i class="fas fa-check"></i></span>';
            } else {
                const keywords = data.mall_detected_keywords || '';
                statusHTML = `<span class="status-badge status-danger" title="モールNG: ${keywords}"><i class="fas fa-times"></i></span>`;
            }
            mallStatusCell.innerHTML = statusHTML;
        }

        // 最終判定を更新
        const finalJudgmentCell = row.querySelector('.final-judgment');
        if (finalJudgmentCell) {
            let judgmentHTML = '';
            let judgmentClass = '';
            let judgmentIcon = '';
            
            switch (data.final_judgment) {
                case 'OK':
                    judgmentClass = 'status-success';
                    judgmentIcon = 'fas fa-check-circle';
                    break;
                case 'NG':
                    judgmentClass = 'status-danger';
                    judgmentIcon = 'fas fa-times-circle';
                    break;
                default:
                    judgmentClass = 'status-pending';
                    judgmentIcon = 'fas fa-clock';
            }
            
            judgmentHTML = `<span class="status-badge ${judgmentClass}">
                              <i class="${judgmentIcon}"></i>
                              ${data.final_judgment}
                          </span>`;
            finalJudgmentCell.innerHTML = judgmentHTML;
        }

        // 出品ボタンの状態を更新
        const listingBtn = row.querySelector('.listing-btn');
        if (listingBtn) {
            listingBtn.disabled = (data.final_judgment !== 'OK');
            if (data.final_judgment === 'OK') {
                listingBtn.classList.remove('btn-disabled');
                listingBtn.title = '出品可能';
            } else {
                listingBtn.classList.add('btn-disabled');
                listingBtn.title = 'フィルター通過後に出品可能';
            }
        }
    }

    handleListingAction(button) {
        const productId = button.getAttribute('data-product-id');
        if (!productId) return;

        // 出品確認ダイアログ
        if (confirm('この商品を出品しますか？')) {
            this.executeListingProcess(productId);
        }
    }

    async executeListingProcess(productId) {
        try {
            const response = await fetch('api/listing_handler.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify({
                    action: 'execute_listing',
                    product_id: parseInt(productId)
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification('出品処理を開始しました', 'success');
                // 必要に応じてUIを更新
            } else {
                this.showNotification(`出品エラー: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('出品処理エラー:', error);
            this.showNotification('出品処理でエラーが発生しました', 'error');
        }
    }

    setLoadingState(element, isLoading) {
        if (isLoading) {
            element.disabled = true;
            element.style.opacity = '0.6';
            element.style.cursor = 'wait';
        } else {
            element.disabled = false;
            element.style.opacity = '1';
            element.style.cursor = 'pointer';
        }
    }

    toggleAllProducts(e) {
        const isChecked = e.target.checked;
        document.querySelectorAll('.product-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        filterManager.updateSelectedCount();
    }

    updateSelectedCount() {
        const selectedCount = document.querySelectorAll('.product-checkbox:checked').length;
        const countElement = document.getElementById('selectedProductCount');
        if (countElement) {
            countElement.textContent = `${selectedCount}件選択中`;
        }
    }

    updateUI() {
        this.updateSelectedCount();
        // その他のUI更新処理
    }

    showNotification(message, type = 'info') {
        // 通知システム（既存の実装を使用するか、独自実装）
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // 3秒後に自動削除
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // データ更新
    async refreshProductData() {
        try {
            const response = await fetch('api/product_data.php', {
                method: 'GET',
                headers: {
                    'X-CSRF-Token': this.csrfToken
                }
            });
            
            if (response.ok) {
                location.reload(); // 簡易実装：ページ再読み込み
            }
        } catch (error) {
            console.error('データ更新エラー:', error);
        }
    }

    // 一括承認処理
    async bulkApproval() {
        const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'))
            .map(cb => cb.getAttribute('data-id'));
        
        if (selectedProducts.length === 0) {
            alert('承認する商品を選択してください');
            return;
        }

        if (!confirm(`選択された${selectedProducts.length}件の商品を一括承認しますか？`)) {
            return;
        }

        try {
            const response = await fetch('api/bulk_operations.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify({
                    action: 'bulk_approve',
                    product_ids: selectedProducts.map(id => parseInt(id))
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification(`${result.updated_count}件の商品を承認しました`, 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                this.showNotification(`一括承認エラー: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('一括承認エラー:', error);
            this.showNotification('一括承認でエラーが発生しました', 'error');
        }
    }
}

// リアルタイムタイトルチェック（既存機能の拡張）
function checkTitleRealtime() {
    const title = document.getElementById('titleCheckInput').value;
    const resultDiv = document.getElementById('titleCheckResult');
    
    if (title.trim() === '') {
        resultDiv.innerHTML = `
            <div class="result-placeholder">
                <i class="fas fa-info-circle"></i>
                商品タイトルを入力すると、禁止キーワードをリアルタイムでチェックします
            </div>
        `;
        return;
    }

    // APIを使用したリアルタイムチェック
    fetch('api/realtime_check.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': filterManager.csrfToken
        },
        body: JSON.stringify({
            title: title
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.detected_keywords && result.detected_keywords.length > 0) {
            resultDiv.innerHTML = `
                <div class="check-result-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>警告: 禁止キーワードが検出されました</strong>
                    <div class="detected-words">
                        ${result.detected_keywords.map(word => 
                            `<span class="detected-word">${word.keyword} (${word.type})</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="check-result-success">
                    <i class="fas fa-check-circle"></i>
                    <strong>安全: 禁止キーワードは検出されませんでした</strong>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('リアルタイムチェックエラー:', error);
        resultDiv.innerHTML = `
            <div class="check-result-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>チェック処理でエラーが発生しました</strong>
            </div>
        `;
    });
}

// その他の既存機能
function showProductDetails(productId) {
    // 商品詳細モーダルまたはページを表示
    console.log('商品詳細表示:', productId);
    // 実装：モーダルウィンドウまたは詳細ページへの遷移
}

function refreshProductData() {
    filterManager.refreshProductData();
}

function bulkApproval() {
    filterManager.bulkApproval();
}

// 既存のCSV関連機能
function uploadProhibitedCSV() {
    document.getElementById('csvFileInput').click();
}

function handleCSVDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        handleCSVUpload({target: {files: files}});
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
        console.log('CSVファイルアップロード:', file.name);
        // TODO: CSV処理実装
        alert('CSVファイル「' + file.name + '」をアップロードしました。処理機能は開発中です。');
    } else {
        alert('CSVファイルを選択してください。');
    }
}

// DOMContentLoaded時の初期化
let filterManager;
document.addEventListener('DOMContentLoaded', function() {
    filterManager = new FilterManager();
    console.log('フィルターツールシステム初期化完了');
});