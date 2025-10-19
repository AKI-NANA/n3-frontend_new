/**
 * eBayカテゴリー判定モーダル機能
 * editing.phpに追加するカテゴリー判定機能
 */

// カテゴリー判定モーダルのHTML（editing.phpの</body>前に追加）
const categoryModalHTML = `
<!-- カテゴリー判定モーダル -->
<div id="categoryModal" class="modal-overlay" style="display: none;">
    <div class="modal-container" style="width: 700px; max-height: 80vh; overflow-y: auto; background: white; border-radius: 8px; padding: 20px; margin: auto;">
        <div class="modal-header" style="margin-bottom: 20px; border-bottom: 1px solid #dee2e6; padding-bottom: 10px;">
            <h3>eBayカテゴリー自動判定結果</h3>
            <button onclick="closeCategoryModal()" style="float: right; background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        
        <div class="modal-body">
            <div id="categoryResult">
                <!-- 判定結果が表示される -->
            </div>
        </div>
        
        <div class="modal-footer" style="text-align: right; padding-top: 15px; border-top: 1px solid #dee2e6; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="closeCategoryModal()" style="margin-right: 10px;">
                <i class="fas fa-times"></i> 閉じる
            </button>
            <button class="btn btn-success" onclick="applyCategoryResult()">
                <i class="fas fa-check"></i> カテゴリーを適用
            </button>
        </div>
    </div>
</div>
`;

// モーダル用CSS（editing.phpの<style>内に追加）
const categoryModalCSS = `
/* カテゴリー判定モーダル用CSS */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(2px);
}

.modal-container {
    background: var(--bg-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
}

.category-result {
    padding: 15px;
    margin: 10px 0;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
}

.category-confidence {
    font-weight: 600;
    color: var(--accent-purple);
    margin-bottom: 10px;
}

.category-path {
    font-family: 'Courier New', monospace;
    background: var(--bg-tertiary);
    padding: 8px;
    border-radius: var(--radius-sm);
    margin: 8px 0;
    font-size: 0.8rem;
}

.item-specifics-preview {
    background: var(--bg-tertiary);
    padding: 10px;
    border-radius: var(--radius-sm);
    margin: 10px 0;
    font-size: 0.85rem;
    font-family: 'Courier New', monospace;
}
`;

// JavaScript関数（editing.phpの<script>内に追加）
let currentCategoryData = null;
let currentProductId = null;

/**
 * カテゴリー判定を実行
 */
async function detectProductCategory(productId) {
    currentProductId = productId;
    
    try {
        // 商品詳細を取得
        const productResponse = await fetch(`?action=get_product_details&item_id=${productId}`);
        const productData = await productResponse.json();
        
        if (!productData.success) {
            showError('商品データの取得に失敗しました: ' + productData.message);
            return;
        }
        
        const product = productData.data;
        
        // カテゴリー判定APIを呼び出し
        const categoryResponse = await fetch('category_detection_api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'detect_category',
                title: product.title,
                description: product.description,
                condition: product.condition,
                images: product.images,
                price: product.current_price
            })
        });
        
        const categoryData = await categoryResponse.json();
        
        if (categoryData.success) {
            currentCategoryData = categoryData.data;
            displayCategoryResult(categoryData.data, product);
            showCategoryModal();
        } else {
            showError('カテゴリー判定に失敗しました: ' + categoryData.message);
        }
        
    } catch (error) {
        console.error('カテゴリー判定エラー:', error);
        showError('カテゴリー判定でエラーが発生しました');
    }
}

/**
 * カテゴリー判定結果を表示
 */
function displayCategoryResult(categoryData, productData) {
    const resultContainer = document.getElementById('categoryResult');
    
    const resultHTML = `
        <div class="category-result">
            <h4>商品情報</h4>
            <p><strong>タイトル:</strong> ${productData.title}</p>
            <p><strong>価格:</strong> ¥${productData.current_price.toLocaleString()}</p>
            <p><strong>状態:</strong> ${productData.condition}</p>
        </div>
        
        <div class="category-result">
            <h4>推奨eBayカテゴリー</h4>
            <div class="category-confidence">信頼度: ${categoryData.confidence}%</div>
            <div class="category-path">${categoryData.category_path}</div>
            <p><strong>カテゴリーID:</strong> ${categoryData.category_id}</p>
        </div>
        
        <div class="category-result">
            <h4>推奨必須項目</h4>
            <div class="item-specifics-preview">${categoryData.item_specifics}</div>
        </div>
        
        <div class="category-result">
            <h4>判定理由</h4>
            <p>${categoryData.reasoning}</p>
        </div>
    `;
    
    resultContainer.innerHTML = resultHTML;
}

/**
 * カテゴリーモーダルを表示
 */
function showCategoryModal() {
    document.getElementById('categoryModal').style.display = 'flex';
}

/**
 * カテゴリーモーダルを閉じる
 */
function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    currentCategoryData = null;
    currentProductId = null;
}

/**
 * カテゴリー判定結果を適用
 */
async function applyCategoryResult() {
    if (!currentCategoryData || !currentProductId) {
        showError('適用するカテゴリーデータがありません');
        return;
    }
    
    try {
        const response = await fetch('?action=update_product', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                item_id: currentProductId,
                title: currentCategoryData.optimized_title || '',
                category: currentCategoryData.category_path,
                ebay_category_id: currentCategoryData.category_id,
                item_specifics: currentCategoryData.item_specifics
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('カテゴリー情報を適用しました', 'success');
            closeCategoryModal();
            // テーブルを再読み込み
            loadEditingData();
        } else {
            showError('カテゴリー適用に失敗しました: ' + result.message);
        }
        
    } catch (error) {
        console.error('カテゴリー適用エラー:', error);
        showError('カテゴリー適用でエラーが発生しました');
    }
}

// ESCキーでモーダルを閉じる
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCategoryModal();
    }
});

// 一括カテゴリー判定
async function runBatchCategoryDetection() {
    if (selectedItems.length === 0) {
        showNotification('商品を選択してください', 'warning');
        return;
    }
    
    if (!confirm(`${selectedItems.length}件の商品に対してカテゴリー判定を実行しますか？`)) {
        return;
    }
    
    let processedCount = 0;
    let successCount = 0;
    
    for (const productId of selectedItems) {
        try {
            await detectProductCategory(productId);
            successCount++;
        } catch (error) {
            console.error(`商品${productId}のカテゴリー判定エラー:`, error);
        }
        processedCount++;
        
        // 進捗表示
        showNotification(`カテゴリー判定進捗: ${processedCount}/${selectedItems.length}件`, 'info');
        
        // API制限を考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    showNotification(`一括カテゴリー判定完了: ${successCount}/${processedCount}件成功`, 'success');
}

export { detectProductCategory, runBatchCategoryDetection, categoryModalHTML, categoryModalCSS };