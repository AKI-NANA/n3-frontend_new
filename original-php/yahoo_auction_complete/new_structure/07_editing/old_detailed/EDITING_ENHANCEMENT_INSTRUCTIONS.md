# 📋 05editing.php 進化版修正指示書
## eBayカテゴリー自動判定連携・出品前管理UI特化版

### 🎯 修正目標
- 既存05editing.phpを**出品前管理UI**として進化
- eBayカテゴリー自動判定システムとの完全連携
- 必須項目編集機能の追加
- データ量は未出品商品のみで軽量維持
- Claude編集可能性を保持

---

## 📁 修正ファイル構成

```
05_editing/
├── editing.php                    # メインファイル修正
├── ebay_category_integration.js   # 新規作成
├── product_edit_modal.php         # 新規作成  
├── editing_api_enhanced.php       # 新規作成
└── modal_styles.css               # 新規作成
```

---

## 🔧 修正内容詳細

### **1. editing.php メインファイル修正**

#### **追加するボタン（操作パネルに）**
```html
<!-- 既存の操作パネルに追加 -->
<div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
    <!-- 既存ボタン -->
    <button class="btn btn-info" onclick="loadEditingData()">
        <i class="fas fa-database"></i> 未出品データ表示
    </button>
    
    <!-- 新規追加ボタン -->
    <button class="btn btn-warning" onclick="runBatchCategoryDetection()">
        <i class="fas fa-magic"></i> 一括カテゴリー判定
    </button>
    <button class="btn btn-success" onclick="validateAllItemSpecifics()">
        <i class="fas fa-check-double"></i> 必須項目チェック
    </button>
    <button class="btn btn-primary" onclick="openBulkEditModal()">
        <i class="fas fa-edit"></i> 一括編集モーダル
    </button>
</div>
```

#### **データテーブル列の追加**
```html
<!-- 既存テーブルヘッダーに追加 -->
<th style="width: 150px;">eBayカテゴリー</th>
<th style="width: 200px;">必須項目</th>
<th style="width: 100px;">完了度</th>
<th style="width: 200px;">操作</th> <!-- 既存の操作列を拡張 -->
```

#### **データテーブル行の拡張**
```html
<!-- 既存の商品行に追加 -->
<td class="ebay-category-cell">
    <div id="category-${row.id}">
        <span class="category-name">未設定</span>
        <div class="confidence-bar" style="display: none;">
            <div class="confidence-fill" style="width: 0%;"></div>
        </div>
    </div>
</td>
<td class="item-specifics-cell">
    <div id="specifics-${row.id}">
        <span class="specifics-preview">Brand=Unknown■Condition=Used</span>
        <button class="btn-sm btn-info" onclick="editItemSpecifics(${row.id})">
            <i class="fas fa-edit"></i>
        </button>
    </div>
</td>
<td class="completion-cell">
    <div class="completion-indicator" id="completion-${row.id}">
        <span class="completion-percentage">0%</span>
        <div class="completion-bar">
            <div class="completion-fill" style="width: 0%;"></div>
        </div>
    </div>
</td>
<td class="action-buttons">
    <!-- 既存ボタン + 新規ボタン -->
    <button class="btn-sm btn-warning" onclick="detectProductCategory(${row.id})" title="カテゴリー判定">
        <i class="fas fa-tags"></i>
    </button>
    <button class="btn-sm btn-primary" onclick="openEditModal(${row.id})" title="詳細編集">
        <i class="fas fa-edit"></i>
    </button>
    <button class="btn-sm btn-success" onclick="markReadyForListing(${row.id})" title="出品準備完了">
        <i class="fas fa-check"></i>
    </button>
</td>
```

---

### **2. ebay_category_integration.js 新規作成**

```javascript
/**
 * eBayカテゴリー統合JavaScript
 * 05editing.php専用・Claude編集性重視
 */

// eBayカテゴリーシステム設定
const EBAY_CATEGORY_API_BASE = '/new_structure/06_ebay_category_system/backend/api/detect_category.php';

// 単一商品カテゴリー判定
async function detectProductCategory(productId) {
    try {
        showProductLoading(productId, 'カテゴリー判定中...');
        
        // 商品データ取得
        const productData = await getProductData(productId);
        
        // eBayカテゴリー判定API呼び出し
        const response = await fetch(EBAY_CATEGORY_API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'detect_single',
                title: productData.title,
                price: productData.price,
                description: productData.description || ''
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // UI更新
            updateProductCategoryDisplay(productId, result.result);
            updateProductItemSpecifics(productId, result.result.item_specifics);
            updateCompletionStatus(productId);
            
            // データベース保存
            await saveProductCategoryData(productId, result.result);
            
            showNotification(`商品 ${productId} のカテゴリー判定完了: ${result.result.category_name} (${result.result.confidence}%)`, 'success');
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('カテゴリー判定エラー:', error);
        showNotification(`カテゴリー判定エラー: ${error.message}`, 'error');
    } finally {
        hideProductLoading(productId);
    }
}

// 一括カテゴリー判定
async function runBatchCategoryDetection() {
    const uncategorizedProducts = getUncategorizedProducts();
    
    if (uncategorizedProducts.length === 0) {
        showNotification('未設定のカテゴリーはありません', 'info');
        return;
    }
    
    if (!confirm(`${uncategorizedProducts.length}件の商品に対してカテゴリー判定を実行しますか？`)) {
        return;
    }
    
    let processed = 0;
    const total = uncategorizedProducts.length;
    
    showNotification(`一括カテゴリー判定開始: ${total}件`, 'info');
    
    for (const productId of uncategorizedProducts) {
        try {
            await detectProductCategory(productId);
            processed++;
            
            // 進行状況更新
            updateBatchProgress(processed, total);
            
            // API負荷軽減のため1秒待機
            await sleep(1000);
            
        } catch (error) {
            console.error(`商品 ${productId} の判定失敗:`, error);
        }
    }
    
    showNotification(`一括カテゴリー判定完了: ${processed}/${total}件`, 'success');
    refreshEditingData();
}

// 商品編集モーダル表示
function openEditModal(productId) {
    const modalUrl = `product_edit_modal.php?product_id=${productId}`;
    
    fetch(modalUrl)
        .then(response => response.text())
        .then(html => {
            showModal(html);
            initializeEditModal(productId);
        })
        .catch(error => {
            showNotification(`モーダル表示エラー: ${error.message}`, 'error');
        });
}

// 必須項目編集
function editItemSpecifics(productId) {
    const currentSpecifics = getProductItemSpecifics(productId);
    const categoryId = getProductCategoryId(productId);
    
    openItemSpecificsEditor(productId, categoryId, currentSpecifics);
}

// 出品準備完了マーク
async function markReadyForListing(productId) {
    try {
        const completionRate = getProductCompletionRate(productId);
        
        if (completionRate < 80) {
            if (!confirm(`完了度が${completionRate}%です。このまま出品準備完了にしますか？`)) {
                return;
            }
        }
        
        const response = await fetch('editing_api_enhanced.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'mark_ready_for_listing',
                product_id: productId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // UI更新
            markProductAsReady(productId);
            showNotification(`商品 ${productId} を出品準備完了にマークしました`, 'success');
            
            // 統計更新
            updateEditingStats();
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        showNotification(`出品準備完了マーク失敗: ${error.message}`, 'error');
    }
}

// ユーティリティ関数
function getUncategorizedProducts() {
    const rows = document.querySelectorAll('tr[data-product-id]');
    const uncategorized = [];
    
    rows.forEach(row => {
        const categoryCell = row.querySelector('.category-name');
        if (!categoryCell || categoryCell.textContent === '未設定') {
            uncategorized.push(row.dataset.productId);
        }
    });
    
    return uncategorized;
}

function updateProductCategoryDisplay(productId, categoryResult) {
    const categoryCell = document.querySelector(`#category-${productId}`);
    if (categoryCell) {
        categoryCell.innerHTML = `
            <div class="category-info">
                <span class="category-name">${categoryResult.category_name}</span>
                <div class="category-id">ID: ${categoryResult.category_id}</div>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${categoryResult.confidence}%;">
                        ${categoryResult.confidence}%
                    </div>
                </div>
            </div>
        `;
    }
}

function updateProductItemSpecifics(productId, itemSpecifics) {
    const specificsCell = document.querySelector(`#specifics-${productId}`);
    if (specificsCell) {
        const preview = itemSpecifics.length > 50 ? 
            itemSpecifics.substring(0, 50) + '...' : itemSpecifics;
            
        specificsCell.querySelector('.specifics-preview').textContent = preview;
        specificsCell.setAttribute('data-full-specifics', itemSpecifics);
    }
}

function updateCompletionStatus(productId) {
    const hasCategory = document.querySelector(`#category-${productId} .category-name`).textContent !== '未設定';
    const hasSpecifics = document.querySelector(`#specifics-${productId}`).getAttribute('data-full-specifics');
    
    let completionRate = 0;
    if (hasCategory) completionRate += 50;
    if (hasSpecifics && hasSpecifics !== 'Brand=Unknown■Condition=Used') completionRate += 50;
    
    const completionCell = document.querySelector(`#completion-${productId}`);
    if (completionCell) {
        completionCell.querySelector('.completion-percentage').textContent = `${completionRate}%`;
        completionCell.querySelector('.completion-fill').style.width = `${completionRate}%`;
        
        // 色分け
        const fillElement = completionCell.querySelector('.completion-fill');
        if (completionRate >= 80) {
            fillElement.style.backgroundColor = '#10b981';
        } else if (completionRate >= 50) {
            fillElement.style.backgroundColor = '#f59e0b';
        } else {
            fillElement.style.backgroundColor = '#ef4444';
        }
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ eBayカテゴリー統合システム初期化完了');
});
```

---

### **3. product_edit_modal.php 新規作成**

```php
<?php
/**
 * 商品詳細編集モーダル
 * eBayカテゴリー + Item Specifics 統合編集
 */

$product_id = $_GET['product_id'] ?? '';
if (empty($product_id)) {
    die('商品IDが指定されていません');
}

// 商品データ取得
$product_data = getProductDetails($product_id);
if (!$product_data) {
    die('商品データが見つかりません');
}
?>

<div class="modal-content" style="width: 800px; max-height: 80vh;">
    <div class="modal-header">
        <h3>
            <i class="fas fa-edit"></i> 
            商品詳細編集
        </h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    
    <div class="modal-body">
        <form id="productEditForm">
            <input type="hidden" name="product_id" value="<?= htmlspecialchars($product_id) ?>">
            
            <!-- 基本情報タブ -->
            <div class="tab-container">
                <div class="tab-nav">
                    <button type="button" class="tab-btn active" data-tab="basic">基本情報</button>
                    <button type="button" class="tab-btn" data-tab="category">eBayカテゴリー</button>
                    <button type="button" class="tab-btn" data-tab="specifics">必須項目</button>
                    <button type="button" class="tab-btn" data-tab="preview">プレビュー</button>
                </div>
                
                <!-- 基本情報タブ -->
                <div class="tab-content active" id="basic-tab">
                    <div class="form-group">
                        <label>商品タイトル *</label>
                        <textarea name="title" rows="2" required><?= htmlspecialchars($product_data['title']) ?></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>価格（円） *</label>
                            <input type="number" name="price_jpy" value="<?= $product_data['price'] ?>" required>
                        </div>
                        <div class="form-group">
                            <label>USD価格（自動計算）</label>
                            <input type="number" name="price_usd" value="<?= round($product_data['price'] / 150, 2) ?>" readonly>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>商品説明</label>
                        <textarea name="description" rows="4"><?= htmlspecialchars($product_data['description']) ?></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>状態</label>
                            <select name="condition">
                                <option value="New">新品</option>
                                <option value="Like New">ほぼ新品</option>
                                <option value="Very Good">とても良い</option>
                                <option value="Good">良い</option>
                                <option value="Acceptable">可</option>
                                <option value="For parts or not working">ジャンク</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>在庫数</label>
                            <input type="number" name="stock" value="1" min="1">
                        </div>
                    </div>
                </div>
                
                <!-- eBayカテゴリータブ -->
                <div class="tab-content" id="category-tab">
                    <div class="category-detection">
                        <button type="button" class="btn btn-primary" onclick="detectCategoryInModal()">
                            <i class="fas fa-magic"></i> AI自動判定実行
                        </button>
                        <div id="category-result" style="margin-top: 1rem;">
                            <!-- 判定結果がここに表示 -->
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>選択されたカテゴリー</label>
                        <select name="ebay_category_id" id="ebay-category-select">
                            <option value="">カテゴリーを選択してください</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>判定信頼度</label>
                        <div class="confidence-display" id="confidence-display">
                            <div class="confidence-bar">
                                <div class="confidence-fill" style="width: 0%;">0%</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 必須項目タブ -->
                <div class="tab-content" id="specifics-tab">
                    <div class="item-specifics-editor">
                        <div class="form-group">
                            <label>Item Specifics (Maru9形式)</label>
                            <textarea name="item_specifics" id="item-specifics-raw" rows="3" 
                                      placeholder="Brand=Unknown■Color=Black■Condition=Used">Brand=Unknown■Condition=Used</textarea>
                        </div>
                        
                        <div class="specifics-visual-editor" id="specifics-visual-editor">
                            <!-- 視覚的編集UIがここに動的生成 -->
                        </div>
                        
                        <div class="specifics-actions">
                            <button type="button" class="btn btn-info" onclick="parseItemSpecifics()">
                                <i class="fas fa-parse"></i> 解析・視覚編集
                            </button>
                            <button type="button" class="btn btn-success" onclick="validateItemSpecifics()">
                                <i class="fas fa-check"></i> 必須項目チェック
                            </button>
                            <button type="button" class="btn btn-warning" onclick="resetToDefaults()">
                                <i class="fas fa-undo"></i> デフォルト値に戻す
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- プレビュータブ -->
                <div class="tab-content" id="preview-tab">
                    <div class="listing-preview">
                        <h4>eBay出品プレビュー</h4>
                        <div class="preview-content" id="listing-preview-content">
                            <!-- プレビューがここに表示 -->
                        </div>
                    </div>
                </div>
            </div>
        </form>
    </div>
    
    <div class="modal-footer">
        <div class="completion-status">
            <span>完了度: </span>
            <span id="modal-completion-rate">0%</span>
        </div>
        
        <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">
                <i class="fas fa-times"></i> キャンセル
            </button>
            <button type="button" class="btn btn-success" onclick="saveProductChanges()">
                <i class="fas fa-save"></i> 保存
            </button>
            <button type="button" class="btn btn-primary" onclick="saveAndMarkReady()">
                <i class="fas fa-check"></i> 保存して出品準備完了
            </button>
        </div>
    </div>
</div>

<script>
// モーダル専用JavaScript
function initializeEditModal(productId) {
    // タブ切り替え
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchModalTab(this.dataset.tab);
        });
    });
    
    // 価格変更時のUSD自動計算
    document.querySelector('input[name="price_jpy"]').addEventListener('input', function() {
        const usdInput = document.querySelector('input[name="price_usd"]');
        usdInput.value = (this.value / 150).toFixed(2);
    });
    
    console.log(`商品編集モーダル初期化: ${productId}`);
}

function switchModalTab(tabId) {
    // すべてのタブを非アクティブに
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 指定タブをアクティブに
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.querySelector(`#${tabId}-tab`).classList.add('active');
}

async function detectCategoryInModal() {
    const title = document.querySelector('input[name="title"]').value;
    const price = document.querySelector('input[name="price_jpy"]').value;
    const description = document.querySelector('textarea[name="description"]').value;
    
    if (!title) {
        alert('商品タイトルを入力してください');
        return;
    }
    
    try {
        // ローディング表示
        document.getElementById('category-result').innerHTML = '<div class="loading">判定中...</div>';
        
        // API呼び出し
        const response = await fetch('/new_structure/06_ebay_category_system/backend/api/detect_category.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'detect_single',
                title: title,
                price: parseFloat(price) || 0,
                description: description
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayCategoryResult(result.result);
            updateItemSpecificsFromCategory(result.result);
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        document.getElementById('category-result').innerHTML = 
            `<div class="error">エラー: ${error.message}</div>`;
    }
}

function displayCategoryResult(categoryResult) {
    const html = `
        <div class="category-result-display">
            <h5>判定結果</h5>
            <div class="category-info">
                <strong>${categoryResult.category_name}</strong>
                <span class="category-id">(ID: ${categoryResult.category_id})</span>
            </div>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${categoryResult.confidence}%;">
                    信頼度: ${categoryResult.confidence}%
                </div>
            </div>
            <div class="matched-keywords">
                <strong>マッチキーワード:</strong> ${categoryResult.matched_keywords?.join(', ') || 'なし'}
            </div>
        </div>
    `;
    
    document.getElementById('category-result').innerHTML = html;
    
    // カテゴリー選択を更新
    const selectElement = document.getElementById('ebay-category-select');
    selectElement.innerHTML = `<option value="${categoryResult.category_id}" selected>${categoryResult.category_name}</option>`;
}

function updateItemSpecificsFromCategory(categoryResult) {
    if (categoryResult.item_specifics) {
        document.getElementById('item-specifics-raw').value = categoryResult.item_specifics;
        parseItemSpecifics();
    }
}

async function saveProductChanges() {
    const formData = new FormData(document.getElementById('productEditForm'));
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch('editing_api_enhanced.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_product_enhanced',
                ...data
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('商品データを保存しました', 'success');
            closeModal();
            refreshEditingData();
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        showNotification(`保存エラー: ${error.message}`, 'error');
    }
}
</script>
```

---

### **4. editing_api_enhanced.php 新規作成**

```php
<?php
/**
 * 拡張編集API - eBayカテゴリー統合版
 */

header('Content-Type: application/json');
require_once 'editing.php'; // 既存関数を利用

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

switch ($action) {
    case 'update_product_enhanced':
        $result = updateProductEnhanced($input);
        echo json_encode($result);
        break;
        
    case 'mark_ready_for_listing':
        $result = markProductReadyForListing($input['product_id']);
        echo json_encode($result);
        break;
        
    case 'get_product_completion_rate':
        $result = getProductCompletionRate($input['product_id']);
        echo json_encode($result);
        break;
        
    default:
        echo json_encode(['success' => false, 'message' => 'Unknown action']);
}

function updateProductEnhanced($data) {
    try {
        $pdo = getDatabaseConnection();
        
        $sql = "UPDATE yahoo_scraped_products SET 
                    active_title = ?, 
                    price_jpy = ?, 
                    active_price_usd = ?,
                    active_description = ?,
                    scraped_yahoo_data = ?,
                    ebay_category_id = ?,
                    item_specifics = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        $yahoo_data = json_encode([
            'condition' => $data['condition'],
            'stock' => $data['stock'],
            'ebay_category_name' => $data['ebay_category_name'] ?? '',
            'updated_by' => 'enhanced_editing'
        ]);
        
        $stmt = $pdo->prepare($sql);
        $success = $stmt->execute([
            $data['title'],
            $data['price_jpy'],
            $data['price_usd'],
            $data['description'],
            $yahoo_data,
            $data['ebay_category_id'],
            $data['item_specifics'],
            $data['product_id']
        ]);
        
        if ($success) {
            return [
                'success' => true,
                'message' => '商品データを更新しました',
                'updated_fields' => array_keys($data)
            ];
        } else {
            throw new Exception('データベース更新に失敗しました');
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => $e->getMessage()
        ];
    }
}

function markProductReadyForListing($product_id) {
    try {
        $pdo = getDatabaseConnection();
        
        $sql = "UPDATE yahoo_scraped_products SET 
                    status = 'ready_for_listing',
                    listing_prepared_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $success = $stmt->execute([$product_id]);
        
        if ($success) {
            return [
                'success' => true,
                'message' => '出品準備完了にマークしました',
                'product_id' => $product_id
            ];
        } else {
            throw new Exception('ステータス更新に失敗しました');
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => $e->getMessage()
        ];
    }
}

function getProductCompletionRate($product_id) {
    try {
        $pdo = getDatabaseConnection();
        
        $sql = "SELECT active_title, ebay_category_id, item_specifics FROM yahoo_scraped_products WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$product_id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            throw new Exception('商品が見つかりません');
        }
        
        $completion = 0;
        
        // タイトルチェック（20%）
        if (!empty($product['active_title'])) $completion += 20;
        
        // カテゴリーチェック（40%）
        if (!empty($product['ebay_category_id'])) $completion += 40;
        
        // 必須項目チェック（40%）
        if (!empty($product['item_specifics']) && 
            $product['item_specifics'] !== 'Brand=Unknown■Condition=Used') {
            $completion += 40;
        }
        
        return [
            'success' => true,
            'completion_rate' => $completion,
            'product_id' => $product_id
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => $e->getMessage()
        ];
    }
}
?>
```

---

## 📋 修正作業手順

### **Phase 1: 基本修正（30分）**
1. `editing.php` にボタン・テーブル列追加
2. `ebay_category_integration.js` 作成
3. 基本的なカテゴリー判定機能実装

### **Phase 2: モーダル機能（45分）**
1. `product_edit_modal.php` 作成
2. `editing_api_enhanced.php` 作成  
3. モーダル統合・テスト

### **Phase 3: UI改善（15分）**
1. スタイル調整・レスポンシブ対応
2. エラーハンドリング強化
3. 通知システム連携

---

## ✅ 完了判定基準

- [  ] eBayカテゴリー自動判定ボタン動作
- [  ] カテゴリー判定結果の表示・保存
- [  ] 必須項目編集モーダル表示
- [  ] Item Specifics の編集・保存
- [  ] 完了度計算・表示
- [  ] 出品準備完了マーク機能
- [  ] 一括処理機能
- [  ] デフォルト値設定機能

**この修正により、05editing.phpが完全な出品前管理UIとして進化し、Yahoo Auction → eBay出品フローの中核を担うことができます！**

---

*📝 作業時間目安: 90分*  
*🎯 Claude編集性: 各ファイル2000行以下で維持*  
*💡 データ量: 未出品商品のみで軽量維持*