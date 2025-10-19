# 📋 07_editing モジュール完全引き継ぎ書

**作成日**: 2025年9月26日  
**モジュール**: Yahoo Auction 商品データ編集システム  
**バージョン**: 軽量化復旧版 v1.0  

---

## 📑 目次

1. [システム概要](#1-システム概要)
2. [現状確認と課題](#2-現状確認と課題)
3. [ファイル構成](#3-ファイル構成)
4. [データベース構造](#4-データベース構造)
5. [API仕様](#5-api仕様)
6. [フロントエンド設計](#6-フロントエンド設計)
7. [新モーダル機能の実装方針](#7-新モーダル機能の実装方針)
8. [次フェーズの実装手順](#8-次フェーズの実装手順)
9. [注意事項とトラブルシューティング](#9-注意事項とトラブルシューティング)
10. [次のチャットへの引き継ぎ](#10-次のチャットへの引き継ぎ)

---

## 1. システム概要

### 1.1 目的
- Yahoo Auctionからスクレイピングした商品データの編集・管理
- eBayへの出品前の商品情報整理・カテゴリー設定・画像管理
- 15枚画像対応の新しいモーダル機能の統合

### 1.2 主要機能
- ✅ 未出品データの一覧表示（ページネーション対応）
- ✅ 商品詳細モーダル表示（15枚画像対応予定）
- ✅ 商品情報の編集・更新
- ✅ 商品の削除機能
- ✅ カテゴリー判定ツール連携
- ⚠️ 利益計算・送料計算機能（実装予定）
- ⚠️ CSV出力機能（実装予定）

### 1.3 技術スタック
- **バックエンド**: PHP 8.x, PostgreSQL 16
- **フロントエンド**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **デザイン**: カスタムCSS（機能別配色システム）
- **データベース**: PostgreSQL (nagano3_db)

---

## 2. 現状確認と課題

### 2.1 現在の実装状況

#### ✅ 完成している機能
1. **データベース接続**
   - PostgreSQL接続確立済み
   - エラーハンドリング実装済み
   - 接続テストAPI (`test_connection`) 動作確認済み

2. **データ取得API**
   - `get_unlisted_products`: 未出品データ取得
   - `get_unlisted_products_strict`: 厳密モード（画像URLありのみ）
   - `get_product_details`: 商品詳細取得
   - 動的カラム検出機能（テーブル構造変更に対応）

3. **UI/UXの基本実装**
   - レスポンシブデザイン
   - 機能別配色システム（8色のカテゴリー）
   - ログエリア（下部固定、100行バッファ）
   - ナビゲーションリンク

#### ⚠️ 実装途中・未完成の機能
1. **商品詳細モーダル**
   - モーダル表示: ✅ 動作確認済み
   - 商品データ取得: ✅ 動作確認済み
   - **15枚画像表示**: ❌ 未実装（最重要課題）
   - **画像ギャラリー機能**: ❌ 未実装
   - 保存機能: ⚠️ プレースホルダーのみ

2. **一括操作機能**
   - 全選択チェックボックス: ⚠️ プレースホルダー
   - 選択商品の削除: ⚠️ プレースホルダー
   - 選択商品の一括承認: ⚠️ プレースホルダー

3. **その他の機能**
   - カテゴリー取得: ⚠️ プレースホルダー
   - 利益計算: ⚠️ プレースホルダー
   - 送料計算: ⚠️ プレースホルダー
   - CSV出力: ⚠️ プレースホルダー

### 2.2 重要な課題

#### 🔴 Critical（最優先）
1. **15枚画像対応モーダルの実装**
   - 現在の問題: 1枚目の画像のみ表示
   - 必要な対応: 画像配列の取得・表示ロジック
   - 影響範囲: モーダル表示機能全体

2. **データ整合性の確保**
   - scraped_yahoo_dataのJSON構造確認
   - 画像データの格納形式統一
   - NULL/空文字の適切な処理

#### 🟡 High（高優先度）
3. **保存機能の実装**
   - 商品情報更新API
   - 画像データの更新処理
   - エラーハンドリング

4. **一括操作機能の完成**
   - 複数商品選択UI
   - 一括削除API
   - トランザクション処理

#### 🟢 Medium（中優先度）
5. **補助機能の実装**
   - カテゴリー判定連携
   - 利益計算ロジック
   - CSV出力機能

---

## 3. ファイル構成

### 3.1 現在のファイル構造

```
07_editing/
├── editor.php                    # メインエントリーポイント
├── includes/
│   └── ProductEditor.php         # 商品編集クラス（未使用）
├── config.php                    # モジュール設定
└── handover_docs/               # 引き継ぎドキュメント
    ├── HANDOVER_DOCUMENT.md     # この文書
    └── get_sample_data.php      # サンプルデータ取得スクリプト
```

### 3.2 editor.php の構造

```php
<?php
// 1. エラー設定とセッション管理
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

// 2. データベース接続
$pdo = new PDO(...);

// 3. ヘルパー関数
function sendJsonResponse($data, $success, $message) { ... }
function getDatabaseConnection() { ... }
function getUnlistedProductsData($page, $limit, $strict) { ... }
function getProductDetails($item_id) { ... }
function deleteProduct($productId) { ... }

// 4. APIアクション処理
switch ($_GET['action'] ?? '') {
    case 'get_unlisted_products': ...
    case 'get_product_details': ...
    ...
}

// 5. HTML出力
?>
<!DOCTYPE html>
<html>
<head>
    <style>/* CSS */</style>
</head>
<body>
    <!-- UI要素 -->
    <script>/* JavaScript */</script>
</body>
</html>
```

---

## 4. データベース構造

### 4.1 yahoo_scraped_products テーブル

#### 主要カラム一覧

| カラム名 | データ型 | 説明 | 使用状況 |
|----------|----------|------|----------|
| `id` | SERIAL | 主キー | ✅ 使用中 |
| `source_item_id` | VARCHAR(100) | Yahoo商品ID | ✅ 使用中 |
| `active_title` | TEXT | 商品タイトル | ✅ 使用中 |
| `price_jpy` | INTEGER | 価格（円） | ✅ 使用中 |
| `active_image_url` | TEXT | メイン画像URL | ✅ 使用中 |
| `active_description` | TEXT | 商品説明 | ✅ 使用中 |
| `scraped_yahoo_data` | JSONB | スクレイピング生データ | ⚠️ 15枚画像データ格納 |
| `ebay_category_id` | VARCHAR(50) | eBayカテゴリーID | ✅ 使用中 |
| `item_specifics` | TEXT | Item Specifics | ✅ 使用中 |
| `ebay_item_id` | VARCHAR(100) | eBay出品ID | ✅ 未出品判定に使用 |
| `status` | VARCHAR(20) | ステータス | ✅ 使用中 |
| `sku` | VARCHAR(100) | SKU | ✅ 使用中 |
| `current_stock` | INTEGER | 在庫数 | ✅ 使用中 |
| `created_at` | TIMESTAMP | 作成日時 | ✅ 使用中 |
| `updated_at` | TIMESTAMP | 更新日時 | ✅ 使用中 |

#### scraped_yahoo_data JSON構造（推定）

```json
{
  "url": "https://page.auctions.yahoo.co.jp/jp/auction/...",
  "title": "商品タイトル",
  "price": 1000,
  "category": "カテゴリー名",
  "condition": "中古品",
  "images": [
    "https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image1.jpg",
    "https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image2.jpg"
  ],
  "description": "商品説明",
  "scraped_at": "2025-09-26 12:00:00"
}
```

**⚠️ 重要**: 実際のJSON構造は `get_sample_data.php` を実行して確認すること

### 4.2 重要なクエリ

#### 未出品データ取得
```sql
SELECT 
    id,
    source_item_id as item_id,
    COALESCE(active_title, 'タイトルなし') as title,
    price_jpy as price,
    COALESCE(active_image_url, 'https://placehold.co/...') as picture_url,
    updated_at,
    ebay_category_id,
    item_specifics
FROM yahoo_scraped_products 
WHERE (ebay_item_id IS NULL OR ebay_item_id = '' OR ebay_item_id = '0')
ORDER BY id DESC 
LIMIT ? OFFSET ?
```

#### 商品詳細取得（モーダル用）
```sql
SELECT 
    id as db_id,
    source_item_id as item_id,
    active_title as title,
    price_jpy as current_price,
    active_description as description,
    scraped_yahoo_data,  -- 🔴 15枚画像データを含む
    active_image_url,
    sku,
    status,
    ebay_category_id,
    item_specifics
FROM yahoo_scraped_products 
WHERE source_item_id = ? OR id::text = ?
LIMIT 1
```

---

## 5. API仕様

### 5.1 実装済みAPIエンドポイント

#### ① `GET /editor.php?action=test_connection`
**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "database_connection": "OK",
    "table_exists": true,
    "total_records": 1234,
    "columns": ["id", "source_item_id", ...]
  },
  "message": "データベース接続成功"
}
```

#### ② `GET /editor.php?action=get_unlisted_products&page=1&limit=50`
**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 123,
        "item_id": "x123456789",
        "title": "商品タイトル",
        "price": 1000,
        "picture_url": "https://...",
        "updated_at": "2025-09-26"
      }
    ],
    "total": 1234,
    "page": 1,
    "limit": 50
  }
}
```

#### ③ `GET /editor.php?action=get_product_details&item_id=x123456789`
**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "db_id": 123,
    "item_id": "x123456789",
    "title": "商品タイトル",
    "current_price": 1000,
    "description": "商品説明",
    "images": ["https://..."],  // 🔴 現在1枚のみ
    "ebay_category_id": "",
    "item_specifics": "Brand=Unknown"
  }
}
```

**⚠️ 重要**: `images` 配列が1枚しか返っていない → 15枚対応が必要

---

## 6. フロントエンド設計

### 6.1 機能別配色システム

```css
:root {
  --color-data-main: #4DA8DA;        /* 未出品データ表示 */
  --color-data-strict: #5EABD6;      /* 厳密モード */
  --color-function-category: #80D8C3; /* カテゴリー取得 */
  --color-function-profit: #D1F8EF;   /* 利益計算 */
  --color-manage-filter: #FFD66B;     /* フィルター */
  --color-manage-approve: #FEFBC7;    /* 一括承認 */
  --color-danger-cleanup: #E14434;    /* 削除 */
  --color-utility: #F5F5F5;           /* ユーティリティ */
}
```

### 6.2 主要JavaScript関数

#### データ取得
```javascript
function loadEditingData() {
    fetch('?action=get_unlisted_products&page=1&limit=100')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentData = data.data.data || [];
                displayEditingData(currentData);
            }
        });
}
```

#### モーダル表示
```javascript
function openProductModal(itemId) {
    const modal = document.getElementById('productModal');
    modal.style.display = 'flex';
    
    fetch(`?action=get_product_details&item_id=${itemId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayProductModalContent(data.data);
            }
        });
}
```

---

## 7. 新モーダル機能の実装方針

### 7.1 15枚画像対応の設計

#### 現状の問題点
- ❌ 画像が1枚しか表示されない
- ❌ `scraped_yahoo_data` のJSONから画像配列を抽出していない

#### 実装手順

**Step 1: バックエンド修正** (editor.php)
```php
function getProductDetails($item_id) {
    $pdo = getDatabaseConnection();
    
    $sql = "SELECT 
                id as db_id,
                source_item_id as item_id,
                active_title as title,
                price_jpy as current_price,
                active_description as description,
                scraped_yahoo_data,
                active_image_url,
                sku,
                ebay_category_id,
                item_specifics
            FROM yahoo_scraped_products 
            WHERE source_item_id = ? OR id::text = ?
            LIMIT 1";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$item_id, $item_id]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        return ['success' => false, 'message' => '商品が見つかりません'];
    }
    
    // 🔴 画像配列の抽出
    $yahoo_data = json_decode($product['scraped_yahoo_data'] ?? '{}', true) ?: [];
    $images = [];
    
    // scraped_yahoo_data から画像配列取得
    if (isset($yahoo_data['images']) && is_array($yahoo_data['images'])) {
        $images = $yahoo_data['images'];
    }
    
    // active_image_url を最初に追加
    if (!empty($product['active_image_url']) && 
        !strpos($product['active_image_url'], 'placehold')) {
        array_unshift($images, $product['active_image_url']);
    }
    
    // 重複削除 & 最大15枚
    $images = array_unique($images);
    $images = array_slice($images, 0, 15);
    
    $product_data = [
        'db_id' => $product['db_id'],
        'item_id' => $product['item_id'],
        'title' => $product['title'] ?? 'タイトル不明',
        'current_price' => (int)($product['current_price'] ?? 0),
        'description' => $product['description'] ?? '',
        'condition' => $yahoo_data['condition'] ?? 'Used',
        'category' => $yahoo_data['category'] ?? 'N/A',
        'images' => $images,  // 🔴 画像配列
        'source_url' => $yahoo_data['url'] ?? '',
        'ebay_category_id' => $product['ebay_category_id'] ?? '',
        'item_specifics' => $product['item_specifics'] ?? '',
        'sku' => $product['sku'] ?? ''
    ];
    
    return ['success' => true, 'data' => $product_data];
}
```

**Step 2: フロントエンド画像ギャラリー実装**

```javascript
function displayProductModalContent(productData) {
    const modalBody = document.getElementById('modalBody');
    
    // 🔴 画像ギャラリーHTML生成
    let imageGalleryHtml = '';
    
    if (productData.images && productData.images.length > 0) {
        const mainImage = productData.images[0];
        const thumbnails = productData.images.map((img, index) => `
            <img src="${img}" 
                 class="thumbnail-image ${index === 0 ? 'active' : ''}"
                 data-index="${index}"
                 onclick="changeMainImage('${img}', ${index})"
                 style="width: 60px; height: 60px; object-fit: cover; 
                        cursor: pointer; border: 2px solid ${index === 0 ? '#725CAD' : '#ddd'};">
        `).join('');
        
        imageGalleryHtml = `
            <div class="image-gallery">
                <div class="main-image-container" style="width: 100%; height: 400px; 
                     display: flex; align-items: center; justify-content: center; 
                     background: #f8f9fa; border-radius: 6px;">
                    <img id="mainImage" src="${mainImage}" 
                         style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
                <div class="thumbnail-container" style="display: flex; gap: 5px; 
                     margin-top: 10px; overflow-x: auto;">
                    ${thumbnails}
                </div>
                <div class="image-counter" style="margin-top: 5px; 
                     font-size: 0.9rem; color: #6c757d; text-align: center;">
                    画像: 1 / ${productData.images.length}
                </div>
            </div>
        `;
    } else {
        imageGalleryHtml = `
            <div style="width: 200px; height: 200px; background: #f8f9fa; 
                 display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-image" style="font-size: 2rem; color: #6c757d;"></i>
            </div>
        `;
    }
    
    modalBody.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>${imageGalleryHtml}</div>
            <div>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Item ID</label>
                    <input type="text" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" 
                           value="${productData.item_id}" readonly>
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">データベースID</label>
                    <input type="text" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" 
                           value="${productData.db_id}" readonly>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">商品名</label>
            <input type="text" id="productTitle" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" 
                   value="${escapeHtml(productData.title)}">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">価格（円）</label>
                <input type="number" id="productPrice" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" 
                       value="${productData.current_price}" min="0">
            </div>
            <div>
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">状態</label>
                <select id="productCondition" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="新品" ${productData.condition === '新品' ? 'selected' : ''}>新品</option>
                    <option value="未使用に近い" ${productData.condition === '未使用に近い' ? 'selected' : ''}>未使用に近い</option>
                    <option value="目立った傷や汚れなし" ${productData.condition === '目立った傷や汚れなし' ? 'selected' : ''}>目立った傷や汚れなし</option>
                    <option value="やや傷や汚れあり" ${productData.condition === 'やや傷や汚れあり' ? 'selected' : ''}>やや傷や汚れあり</option>
                    <option value="Used" ${productData.condition === 'Used' ? 'selected' : ''}>Used</option>
                </select>
            </div>
        </div>

        <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">商品説明</label>
            <textarea id="productDescription" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" rows="4">${escapeHtml(productData.description)}</textarea>
        </div>

        <div style="display: flex; gap: 0.5rem; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid #dee2e6;">
            <button class="btn" onclick="closeProductModal()" style="background: #6c757d; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-times"></i> 閉じる
            </button>
            <button class="btn" onclick="saveProductChanges('${productData.item_id}')" style="background: #28a745; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-save"></i> 保存
            </button>
            <button class="btn" onclick="openCategoryTool('${productData.item_id}')" style="background: #007bff; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-tags"></i> カテゴリー判定
            </button>
        </div>
    `;
}

// 🔴 メイン画像切り替え関数
function changeMainImage(imageSrc, index) {
    const mainImage = document.getElementById('mainImage');
    mainImage.src = imageSrc;
    
    // サムネイルのアクティブ状態更新
    document.querySelectorAll('.thumbnail-image').forEach((thumb, i) => {
        thumb.style.border = i === index ? '2px solid #725CAD' : '2px solid #ddd';
        thumb.classList.toggle('active', i === index);
    });
    
    // 画像カウンター更新
    const counter = document.querySelector('.image-counter');
    if (counter) {
        const total = document.querySelectorAll('.thumbnail-image').length;
        counter.textContent = `画像: ${index + 1} / ${total}`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
```

**Step 3: CSSスタイル追加**

```css
/* 画像ギャラリー用 */
.thumbnail-container::-webkit-scrollbar {
    height: 6px;
}

.thumbnail-container::-webkit-scrollbar-thumb {
    background: #725CAD;
    border-radius: 3px;
}

.thumbnail-image:hover {
    border-color: #725CAD !important;
    transform: scale(1.05);
    transition: all 0.2s ease;
}

.thumbnail-image.active {
    box-shadow: 0 0 8px rgba(114, 92, 173, 0.3);
}
```

---

## 8. 次フェーズの実装手順

### 8.1 Phase 1: 15枚画像対応（最優先）

#### ✅ 実装チェックリスト

1. **データ確認** (30分)
   - [ ] `get_sample_data.php` 実行
   - [ ] `scraped_yahoo_data` のJSON構造確認
   - [ ] 画像フィールドの確認

2. **バックエンド修正** (1-2時間)
   - [ ] `getProductDetails()` 関数修正
   - [ ] 画像配列抽出ロジック実装
   - [ ] エラーハンドリング追加

3. **フロントエンド実装** (2-3時間)
   - [ ] 画像ギャラリーHTML生成
   - [ ] サムネイル表示
   - [ ] 画像切り替え機能
   - [ ] CSSスタイル適用

4. **動作確認** (30分)
   - [ ] 複数画像商品で確認
   - [ ] 1枚画像商品で確認
   - [ ] 画像なし商品で確認

### 8.2 Phase 2: 保存機能の実装

#### 実装手順 (2-3時間)

1. **バックエンドAPI**
```php
case 'update_product':
    $item_id = $_POST['item_id'] ?? '';
    $updates = [
        'title' => $_POST['title'] ?? null,
        'price' => $_POST['price'] ?? null,
        'description' => $_POST['description'] ?? null
    ];
    
    $result = updateProduct($item_id, $updates);
    sendJsonResponse($result, $result['success'], $result['message']);
    break;

function updateProduct($item_id, $updates) {
    $pdo = getDatabaseConnection();
    
    try {
        $pdo->beginTransaction();
        
        $updateFields = [];
        $params = [];
        
        if ($updates['title'] !== null) {
            $updateFields[] = "active_title = ?";
            $params[] = $updates['title'];
        }
        
        if ($updates['price'] !== null) {
            $updateFields[] = "price_jpy = ?";
            $params[] = (int)$updates['price'];
        }
        
        if ($updates['description'] !== null) {
            $updateFields[] = "active_description = ?";
            $params[] = $updates['description'];
        }
        
        if (empty($updateFields)) {
            return ['success' => false, 'message' => '更新データなし'];
        }
        
        $sql = "UPDATE yahoo_scraped_products SET " . 
               implode(', ', $updateFields) . ", updated_at = CURRENT_TIMESTAMP " .
               "WHERE source_item_id = ? OR id::text = ?";
        
        $params[] = $item_id;
        $params[] = $item_id;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $pdo->commit();
        
        return [
            'success' => $stmt->rowCount() > 0,
            'message' => $stmt->rowCount() > 0 ? '更新成功' : '商品が見つかりません'
        ];
        
    } catch (Exception $e) {
        $pdo->rollback();
        return ['success' => false, 'message' => 'エラー: ' . $e->getMessage()];
    }
}
```

2. **フロントエンド保存処理**
```javascript
function saveProductChanges(itemId) {
    const title = document.getElementById('productTitle').value;
    const price = document.getElementById('productPrice').value;
    const description = document.getElementById('productDescription').value;
    
    addLogEntry(`商品 ${itemId} を保存中...`, 'info');
    
    fetch('?action=update_product', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            item_id: itemId,
            title: title,
            price: price,
            description: description
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addLogEntry('✅ 保存成功', 'success');
            closeProductModal();
            loadEditingData();
        } else {
            addLogEntry('❌ 失敗: ' + data.message, 'error');
        }
    });
}
```

### 8.3 Phase 3: 一括操作機能

#### 実装手順 (3-4時間)

1. **全選択機能**
```javascript
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.product-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateSelectedCount();
}

function updateSelectedCount() {
    const selected = document.querySelectorAll('.product-checkbox:checked');
    addLogEntry(`${selected.length}件選択中`, 'info');
}
```

2. **一括削除API**
```php
case 'bulk_delete':
    $productIds = json_decode($_POST['product_ids'] ?? '[]', true);
    $result = bulkDeleteProducts($productIds);
    sendJsonResponse($result, $result['success'], $result['message']);
    break;

function bulkDeleteProducts($productIds) {
    $pdo = getDatabaseConnection();
    
    try {
        $pdo->beginTransaction();
        
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));
        $sql = "DELETE FROM yahoo_scraped_products WHERE id IN ($placeholders)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($productIds);
        
        $pdo->commit();
        
        return [
            'success' => true,
            'message' => "{$stmt->rowCount()}件削除",
            'deleted_count' => $stmt->rowCount()
        ];
    } catch (Exception $e) {
        $pdo->rollback();
        return ['success' => false, 'message' => $e->getMessage()];
    }
}
```

---

## 9. 注意事項とトラブルシューティング

### 9.1 重要な注意事項

#### ⚠️ データ整合性
1. **NULL と空文字**
   - WHERE句: `ebay_item_id IS NULL OR ebay_item_id = '' OR ebay_item_id = '0'`
   - JSONデコード: `json_decode($data, true) ?: []`

2. **画像URL検証**
   - プレースホルダー除外: `!strpos($url, 'placehold')`
   - 重複削除: `array_unique()`
   - 最大15枚: `array_slice($images, 0, 15)`

#### 🔒 セキュリティ
1. **SQLインジェクション対策**: プリペアドステートメント必須
2. **XSS対策**: `escapeHtml()` 使用
3. **CSRF対策**: 今後実装予定

### 9.2 よくあるエラー

#### エラー1: モーダルが表示されない
```javascript
// デバッグ
console.log('Modal:', document.getElementById('productModal'));
```

#### エラー2: 画像が表示されない
```javascript
// デバッグ
console.log('Images:', productData.images);
```

#### エラー3: DB接続エラー
```bash
# PostgreSQL起動
pg_ctl start -D /usr/local/var/postgres
```

---

## 10. 次のチャットへの引き継ぎ

### 10.1 必ず実行すること

1. **実データ取得**
```bash
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/07_editing/handover_docs
php get_sample_data.php > sample_data_output.txt
cat sample_data_output.txt
```

2. **引き継ぎ内容確認**
   - この文書を全て読む
   - チェックリストを確認
   - 実装手順を理解

### 10.2 次のチャットで実装すること

**優先順位1**: 15枚画像対応
- [ ] データ構造確認
- [ ] `getProductDetails()` 修正
- [ ] 画像ギャラリーUI実装

**優先順位2**: 保存機能
- [ ] `update_product` API
- [ ] 保存処理実装

**優先順位3**: 一括操作
- [ ] 全選択機能
- [ ] 一括削除API

### 10.3 次のチャット開始テンプレート

```
前回のチャットで07_editingモジュールの完全引き継ぎ書を作成しました。

【完了事項】
✅ editor.phpとAPIの確認
✅ 実データサンプル取得スクリプト作成
✅ 完全引き継ぎ書作成

【次の作業】
1. 実データサンプル確認（get_sample_data.php実行）
2. 15枚画像対応実装（最優先）
3. 保存機能実装
4. 一括操作機能実装

【重要な制約】
- 新しいモーダルHTMLの削減・機能喪失を防ぐ
- 既存の動作を壊さない
- 段階的実装でログ確認

引き継ぎ書:
/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/07_editing/handover_docs/HANDOVER_DOCUMENT.md
```

---

## 付録: ファイルパス一覧

```
【メインファイル】
/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/07_editing/editor.php

【引き継ぎドキュメント】
/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/07_editing/handover_docs/HANDOVER_DOCUMENT.md

【サンプルデータ取得】
/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/07_editing/handover_docs/get_sample_data.php

【設定ファイル】
/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/07_editing/config.php

【共有設定】
/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/shared/config/ebay_api.php

【データベース接続情報】
- Host: localhost
- Database: nagano3_db
- User: postgres
- Password: Kn240914
- Port: 5432
```

---

**📝 この引き継ぎ書は、次のチャットで15枚画像対応を完璧に実装するための完全なガイドです。**

**🎯 最重要タスク: 15枚画像対応モーダルの実装**

**⏰ 推定作業時間: 4-6時間（Phase 1のみ）**
