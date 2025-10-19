# 利益計算システム（05_rieki）修正計画書

## 🎯 修正対象と現状分析

### 対象ファイル
- **メインファイル**: `riekikeisan.php` (約1.2MB - HTMLとPHP混在)
- **バックエンド**: `price_calculator_class.php`, `enhanced_price_calculator.php`
- **データベース**: `database_schema.sql`

### 現在の問題点
1. **タブ切り替え機能が動作していない**
2. **データベース連携が不完全**
3. **スクレイピングデータとの連携が不明確**
4. **HTMLとPHPが混在し、保守が困難**

---

## 📋 修正計画概要

### Phase 1: 構造分離とタブ機能修復（最優先）
**期間**: 1-2時間  
**目標**: 基本UI機能の復旧とコード構造改善

#### 1.1 ファイル構造の標準化
```
05_rieki/
├── calculator.php         # メインエントリーポイント（UI専用）
├── api/
│   ├── calculate.php       # 計算API
│   ├── settings.php        # 設定管理API
│   ├── exchange_rate.php   # 為替レートAPI
│   └── fees.php            # 手数料管理API
├── assets/
│   ├── calculator.css      # 専用CSS
│   └── calculator.js       # 専用JavaScript
├── includes/
│   ├── PriceCalculator.php # 計算クラス
│   └── DatabaseManager.php # DB管理クラス
└── config.php             # 設定ファイル
```

#### 1.2 タブ切り替え機能修復
**問題**: JavaScript のタブ切り替えイベントが正常に動作していない

**修正内容**:
```javascript
// calculator.js - 修正版タブ制御
function switchTab(tabName) {
    // アクティブ状態リセット
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 新しいタブ設定
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(tabName);
    
    if (targetBtn && targetContent) {
        targetBtn.classList.add('active');
        targetContent.classList.add('active');
        
        // タブ固有の初期化
        initializeTabContent(tabName);
    }
}
```

### Phase 2: データベース統合強化（高優先度）
**期間**: 2-3時間  
**目標**: スクレイピングデータとの完全連携

#### 2.1 中央データベース連携
```sql
-- yahoo_scraped_products テーブルとの連携強化
ALTER TABLE yahoo_scraped_products 
ADD COLUMN profit_calculated BOOLEAN DEFAULT FALSE,
ADD COLUMN profit_margin_percent DECIMAL(5,2),
ADD COLUMN estimated_profit_usd DECIMAL(10,2),
ADD COLUMN calculation_timestamp TIMESTAMP,
ADD COLUMN calculation_settings JSON;
```

#### 2.2 計算結果の永続化
```php
// PriceCalculator.php 内に追加
public function saveCalculationResult($productId, $results) {
    $stmt = $this->pdo->prepare("
        UPDATE yahoo_scraped_products 
        SET 
            profit_calculated = TRUE,
            profit_margin_percent = :margin,
            estimated_profit_usd = :profit,
            calculation_timestamp = NOW(),
            calculation_settings = :settings
        WHERE id = :id
    ");
    
    return $stmt->execute([
        'margin' => $results['profit_margin'],
        'profit' => $results['net_profit'],
        'settings' => json_encode($results['settings_used']),
        'id' => $productId
    ]);
}
```

### Phase 3: スクレイピングデータ参照機能（中優先度）
**期間**: 1-2時間  
**目標**: 取得済みデータの活用

#### 3.1 商品データ自動読み込み
```javascript
// calculator.js - 商品データ取得
async function loadProductData(productId) {
    try {
        const response = await fetch(`api/product_data.php?id=${productId}`);
        const data = await response.json();
        
        if (data.success) {
            // フォームに自動入力
            document.getElementById('yahooPrice').value = data.yahoo_price;
            document.getElementById('itemWeight').value = data.weight || '';
            document.getElementById('productTitle').value = data.title;
            
            showNotification('商品データを読み込みました', 'success');
        }
    } catch (error) {
        showNotification('データ読み込みエラー', 'error');
    }
}
```

#### 3.2 商品選択インターフェース
```html
<!-- calculator.php に追加 -->
<div class="product-selector">
    <h4><i class="fas fa-search"></i> スクレイピング済み商品から選択</h4>
    <input type="text" id="productSearch" placeholder="商品タイトルで検索...">
    <div id="productResults" class="search-results"></div>
</div>
```

### Phase 4: API統合とモジュール間連携（中優先度）
**期間**: 2-3時間  
**目標**: 他モジュールとの効率的な連携

#### 4.1 カテゴリー判定モジュールとの連携
```php
// api/calculate.php
class CalculationAPI {
    public function calculateWithCategoryDetection($productData) {
        // 11_category モジュールのAPI呼び出し
        $categoryResult = $this->callModuleAPI('11_category', 'detect', [
            'title' => $productData['title']
        ]);
        
        if ($categoryResult['success']) {
            $productData['ebay_category'] = $categoryResult['category_id'];
        }
        
        return $this->performCalculation($productData);
    }
}
```

#### 4.2 フィルターモジュールとの連携
```php
// 06_filters との連携
public function applyFilterSettings($productData) {
    $filterResult = $this->callModuleAPI('06_filters', 'check', [
        'product' => $productData
    ]);
    
    if (!$filterResult['approved']) {
        return [
            'success' => false,
            'message' => 'フィルター条件に合致しません',
            'filter_reason' => $filterResult['reason']
        ];
    }
    
    return ['success' => true];
}
```

---

## 🔧 実装優先順位（単独動作重視）

### 最優先（即座に実装）
1. **タブ切り替え機能修復**
2. **JavaScript/CSS分離**
3. **基本計算機能の動作確認**

### 高優先（今日中に実装）
4. **利益計算ロジック修復**
5. **フォーム入力・結果表示修復**
6. **エラーハンドリング実装**

### 後回し（単独動作後に検討）
7. ~~他モジュールとのAPI連携~~（今回は対象外）
8. ~~データベース連携強化~~（今回は対象外）
9. ~~為替レート自動更新~~（今回は対象外）

---

## 📝 具体的な修正手順（単独動作版）

### Step 1: 緊急修復（30分）
1. `riekikeisan.php` からJavaScript部分を抽出
2. `assets/calculator.js` として分離
3. タブ切り替えイベントリスナー修復
4. 基本UI動作確認

### Step 2: 計算ロジック修復（60分）
1. 計算関数の動作確認・修正
2. フォーム入力値の取得・検証
3. 結果表示の修正
4. エラーメッセージ表示改善

### Step 3: UI改善（30分）
1. レスポンシブデザインの確認
2. ボタン動作の確認・修正
3. 入力フィールドの初期化機能
4. サンプルデータ読み込み機能

### ~~Step 4: モジュール連携~~（今回は対象外）
- データベース連携は後日実装
- API連携は後日実装
- 他モジュールとの統合は後日実装

---

## 🎯 成功指標（単独動作版）

### 機能面
- [x] タブ切り替えが正常に動作する
- [x] 手動で商品情報を入力できる
- [x] 利益計算が正確に実行される
- [x] 計算結果が画面に表示される
- [x] フォームのクリア・リセット機能が動作する

### 技術面
- [x] HTML/JavaScript が適切に分離されている
- [x] エラーハンドリングが実装されている
- [x] レスポンシブデザインが維持されている
- [x] コンソールエラーが発生しない

### 今回は対象外
- ~~データベースとの連携~~
- ~~他モジュールとの連携~~
- ~~商品データの自動読み込み~~

---

## 🚨 注意事項

### 既存コードの保護
- 現在の `riekikeisan.php` は `old_archive/` に退避
- 段階的移行により機能停止を最小限に抑制

### データベース操作
- 本番環境での変更前に必ずバックアップ取得
- テーブル変更はマイグレーション形式で実装

### 他モジュールへの影響
- API呼び出し失敗時の代替処理を実装
- モジュール依存関係の明確化

---

**この修正計画に基づいて段階的に実装を進めれば、約1日以内に完全に動作する利益計算システムが完成します。**