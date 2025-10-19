/**
 * editing.phpに追加する修正パッチ
 * カテゴリー判定機能の統合
 */

// 1. HTMLの</body>直前に以下を追加
const MODAL_HTML_ADDITION = `
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

// 2. CSSの</style>直前に以下を追加
const CSS_ADDITION = `
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
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
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

// 3. 操作パネルのHTML修正（一括カテゴリー判定ボタンを追加）
const BUTTON_ADDITION = `
<button class="btn btn-warning" onclick="runBatchCategoryDetection()">
    <i class="fas fa-magic"></i> 一括カテゴリー判定
</button>
`;

// 4. テーブルヘッダーにカテゴリー列を追加
const TABLE_HEADER_ADDITION = `
<th style="width: 120px;">eBayカテゴリー</th>
`;

// 5. テーブル行のカテゴリー判定ボタンを追加
const TABLE_ROW_BUTTON = `
<button class="btn btn-sm btn-warning" onclick="detectProductCategory('${item.id || item.item_id}')" title="カテゴリー判定">
    <i class="fas fa-tags"></i>
</button>
`;

// 6. JavaScriptの</script>直前に追加
const JAVASCRIPT_ADDITION = `
<script src="category_detection_modal.js"></script>
`;

export { 
    MODAL_HTML_ADDITION,
    CSS_ADDITION, 
    BUTTON_ADDITION,
    TABLE_HEADER_ADDITION,
    TABLE_ROW_BUTTON,
    JAVASCRIPT_ADDITION 
};