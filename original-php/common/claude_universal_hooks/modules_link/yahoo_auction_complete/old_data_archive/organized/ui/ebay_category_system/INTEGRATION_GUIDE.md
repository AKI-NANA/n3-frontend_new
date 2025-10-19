# 🎯 eBayカテゴリー自動判定システム - 統合手順書

## 📋 完成したフロントエンド（Claude担当分）

### ✅ 作成済みファイル一覧

```
/Users/aritahiroaki/NAGANO-3/N3-Development/modules/ebay_category_system/
├── frontend/
│   ├── css/
│   │   └── ebay_category_tool.css                    # ✅ 専用CSS（完成）
│   ├── js/
│   │   └── ebay_category_tool.js                     # ✅ JavaScript機能（完成）
│   ├── ebay_category_tool.php                        # ✅ 単体HTML（完成）
│   └── yahoo_auction_tool_with_ebay_category.php     # ✅ 既存統合版（完成）
```

### ✅ 実装完了機能

#### 1. UI/UXコンポーネント（完成）
- **CSVアップロード**: ドラッグ&ドロップ対応
- **プログレスバー**: アニメーション付き処理状況表示
- **データテーブル**: ソート・フィルター機能付き
- **編集モーダル**: 商品情報編集インターフェース
- **一括操作**: 選択・承認・否認・CSV出力
- **単一商品テスト**: リアルタイム判定機能

#### 2. JavaScript機能（完成）
- **ファイル処理**: CSV読み込み・検証・パース
- **API通信**: RESTful API連携準備完了
- **状態管理**: 選択状態・処理状況の管理
- **エラーハンドリング**: 包括的エラー処理
- **レスポンシブ**: モバイル対応完了

#### 3. 既存システム統合（完成）
- **非破壊統合**: 既存ファイル保護・新規タブ追加
- **デザイン統一**: N3デザインシステム準拠
- **JavaScript競合回避**: 名前空間分離完了

---

## 🔧 バックエンドAPI仕様（Gemini担当分）

### 📍 必要なAPIエンドポイント

#### 1. CSV一括処理API
```php
POST /modules/ebay_category_system/backend/api/process_csv.php
Request: FormData with CSV file
Response: {
    "success": true,
    "data": {
        "processed_count": 100,
        "results": [
            {
                "title": "iPhone 14 Pro 128GB",
                "price": 999.99,
                "category_id": "9355",
                "category_name": "Cell Phones & Smartphones", 
                "confidence": 95,
                "item_specifics": "Brand=Apple■Model=iPhone 14 Pro■Color=Unknown■Condition=Used",
                "status": "pending"
            }
        ]
    }
}
```

#### 2. 単一商品判定API
```php
POST /modules/ebay_category_system/backend/api/detect_category.php
Request: {
    "title": "iPhone 14 Pro 128GB",
    "price": 999.99,
    "description": "美品です"
}
Response: {
    "success": true,
    "category_id": "9355",
    "category_name": "Cell Phones & Smartphones",
    "confidence": 95,
    "matched_keywords": ["iphone"],
    "item_specifics": "Brand=Apple■Model=iPhone 14 Pro■Color=Unknown■Condition=Used"
}
```

#### 3. カテゴリー一覧取得API
```php
GET /modules/ebay_category_system/backend/api/get_categories.php
Response: {
    "success": true,
    "data": [
        {
            "category_id": "9355",
            "category_name": "Cell Phones & Smartphones",
            "parent_id": "15032"
        }
    ]
}
```

#### 4. 商品情報更新API
```php
POST /modules/ebay_category_system/backend/api/update_item.php
Request: {
    "index": 0,
    "data": {
        "title": "iPhone 14 Pro 128GB Space Black",
        "category_id": "9355",
        "item_specifics": "Brand=Apple■Model=iPhone 14 Pro■Color=Space Black■Condition=Used"
    }
}
Response: {
    "success": true,
    "message": "商品情報を更新しました"
}
```

#### 5. CSV出力API
```php
POST /modules/ebay_category_system/backend/api/export_csv.php
Request: {
    "data": [商品データ配列]
}
Response: {
    "success": true,
    "data": {
        "csv_url": "/downloads/processed_20251214.csv"
    }
}
```

---

## 🗄️ 必要なデータベース構造（Gemini担当分）

### 1. eBayカテゴリーマスター
```sql
CREATE TABLE ebay_categories (
    category_id VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(200) NOT NULL,
    parent_id VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- サンプルデータ投入
INSERT INTO ebay_categories VALUES
('9355', 'Cell Phones & Smartphones', '15032', TRUE, NOW()),
('625', 'Cameras & Photo', '625', TRUE, NOW()),
('2536', 'Trading Card Games', '11116', TRUE, NOW()),
-- ... 50以上のカテゴリー
```

### 2. カテゴリー別必須項目
```sql
CREATE TABLE category_required_fields (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) REFERENCES ebay_categories(category_id),
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL, -- 'required', 'recommended'
    possible_values TEXT[], -- 選択肢
    default_value VARCHAR(100) DEFAULT 'Unknown',
    sort_order INTEGER DEFAULT 0
);

-- 例: Cell Phones用必須項目
INSERT INTO category_required_fields VALUES
(1, '9355', 'Brand', 'required', ARRAY['Apple', 'Samsung', 'Google'], 'Unknown', 1),
(2, '9355', 'Model', 'required', NULL, 'Unknown', 2),
(3, '9355', 'Storage Capacity', 'recommended', ARRAY['64 GB', '128 GB', '256 GB'], 'Unknown', 3);
```

### 3. キーワード判定辞書
```sql
CREATE TABLE category_keywords (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) REFERENCES ebay_categories(category_id),
    keyword VARCHAR(100) NOT NULL,
    keyword_type VARCHAR(20) DEFAULT 'primary', -- 'primary', 'secondary'
    weight INTEGER DEFAULT 5,
    language VARCHAR(5) DEFAULT 'ja' -- 'ja', 'en'
);

-- キーワード例
INSERT INTO category_keywords VALUES
(1, '9355', 'iphone', 'primary', 10, 'en'),
(2, '9355', 'スマホ', 'primary', 10, 'ja'),
(3, '9355', 'smartphone', 'primary', 10, 'en');
```

### 4. 処理済み商品データ
```sql
CREATE TABLE processed_products (
    id SERIAL PRIMARY KEY,
    original_title TEXT NOT NULL,
    original_price DECIMAL(10,2),
    yahoo_category VARCHAR(100),
    detected_category_id VARCHAR(20),
    category_confidence INTEGER,
    item_specifics TEXT, -- Maru9形式文字列
    status VARCHAR(20) DEFAULT 'pending', -- pending/approved/rejected/exported
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 💻 必要なPHPクラス実装（Gemini担当分）

### 1. CategoryDetector.php
```php
<?php
class CategoryDetector {
    private $pdo;
    
    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
    }
    
    /**
     * メイン機能: カテゴリー自動判定
     */
    public function detectCategory($productData) {
        // 1. キーワード辞書による基本判定
        $keywordMatch = $this->matchByKeywords($productData['title']);
        
        // 2. 価格帯による精度向上
        $enhancedResult = $this->enhanceByPrice($keywordMatch, $productData['price']);
        
        // 3. 必須項目生成
        $itemSpecifics = $this->generateItemSpecifics($enhancedResult['category_id']);
        
        return [
            'category_id' => $enhancedResult['category_id'],
            'category_name' => $enhancedResult['category_name'],
            'confidence' => $enhancedResult['confidence'],
            'matched_keywords' => $enhancedResult['keywords'],
            'item_specifics' => $itemSpecifics
        ];
    }
    
    private function matchByKeywords($text) {
        // キーワード辞書との照合実装
        // 重み付けスコア計算
        // 最適カテゴリー選択
    }
    
    private function enhanceByPrice($basicResult, $price) {
        // 価格帯による判定精度向上
        // カテゴリー固有の価格レンジチェック
    }
    
    private function generateItemSpecifics($categoryId) {
        // カテゴリー固有の必須項目生成
        // Maru9形式文字列作成
    }
}
?>
```

### 2. ItemSpecificsGenerator.php
```php
<?php
class ItemSpecificsGenerator {
    
    /**
     * Maru9形式必須項目文字列生成
     */
    public function generateItemSpecificsString($categoryId, $customValues = []) {
        $fields = $this->getRequiredFields($categoryId);
        $itemSpecifics = [];
        
        foreach ($fields as $field) {
            $value = $customValues[$field['field_name']] ?? $field['default_value'];
            $itemSpecifics[] = $field['field_name'] . '=' . $value;
        }
        
        return implode('■', $itemSpecifics);
    }
    
    /**
     * カテゴリー別必須項目取得
     */
    public function getRequiredFields($categoryId) {
        $sql = "SELECT field_name, default_value, possible_values FROM category_required_fields WHERE category_id = ? ORDER BY sort_order";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$categoryId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>
```

### 3. CSVProcessor.php
```php
<?php
class CSVProcessor {
    
    /**
     * CSV一括処理メイン機能
     */
    public function processBulkCSV($csvFilePath) {
        $data = $this->parseCSV($csvFilePath);
        $results = [];
        
        foreach ($data as $row) {
            $categoryResult = $this->categoryDetector->detectCategory($row);
            $results[] = array_merge($row, $categoryResult);
        }
        
        return [
            'processed_count' => count($results),
            'results' => $results
        ];
    }
    
    /**
     * 処理結果CSV出力
     */
    public function generateOutputCSV($processedData) {
        $csvContent = $this->arrayToCSV($processedData);
        $filename = 'ebay_category_results_' . date('Y-m-d_H-i-s') . '.csv';
        $filepath = '/path/to/downloads/' . $filename;
        
        file_put_contents($filepath, $csvContent);
        
        return [
            'csv_url' => '/downloads/' . $filename,
            'filename' => $filename
        ];
    }
}
?>
```

---

## 🚀 統合手順（開発完了後）

### Phase 1: 既存システムへの安全統合

#### Option A: 非破壊統合（推奨）
```bash
# 1. 既存ファイルバックアップ
cp /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/content_php/yahoo_auction_tool_content.php \
   /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/content_php/yahoo_auction_tool_content_backup.php

# 2. 統合版に置き換え
cp /Users/aritahiroaki/NAGANO-3/N3-Development/modules/ebay_category_system/frontend/yahoo_auction_tool_with_ebay_category.php \
   /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/content_php/yahoo_auction_tool_content.php
```

#### Option B: 独立運用
```bash
# 単体で動作させる場合
# http://localhost:8080/modules/ebay_category_system/frontend/ebay_category_tool.php でアクセス可能
```

### Phase 2: 動作確認チェックリスト

#### ✅ フロントエンド確認項目
- [ ] タブが正常に表示される
- [ ] CSVアップロード画面が動作する
- [ ] ドラッグ&ドロップが機能する
- [ ] 単一商品テストが動作する（デモ版）
- [ ] レスポンシブデザインが機能する

#### ✅ バックエンド統合後確認項目（Gemini完成後）
- [ ] CSV処理APIが正常動作する
- [ ] カテゴリー判定精度が85%以上
- [ ] 必須項目生成が正確に動作する
- [ ] 大量データ処理（1,000件以上）が安定動作する
- [ ] エラーハンドリングが適切に機能する

---

## 📊 期待される成果・効果

### 業務効率化
- **カテゴリー選択時間**: 手動選択からほぼゼロに短縮
- **必須項目作成時間**: 90%削減（自動生成）
- **処理精度**: 人的エラー大幅削減

### システム価値向上
- **eBay出品準備**: 完全自動化
- **商品データ品質**: 標準化・統一化
- **運用保守性**: モジュール化による管理性向上

### 拡張可能性
- **他プラットフォーム対応**: Amazon、メルカリ等への展開可能
- **AI機能強化**: 機械学習による精度向上
- **多言語対応**: 英語・中国語等への拡張

---

## 🔧 技術仕様サマリー

### フロントエンド技術スタック
- **HTML5/CSS3**: モダンウェブ標準準拠
- **JavaScript (ES6+)**: クラスベース設計
- **Responsive Design**: モバイルファーストアプローチ
- **N3 Design System**: 既存システムとの統一感

### バックエンド技術要件（Gemini実装分）
- **PHP 8.1+**: 型宣言・エラーハンドリング強化
- **PostgreSQL**: リレーショナルデータベース
- **RESTful API**: JSON通信
- **MVC Architecture**: 保守性重視の設計

### セキュリティ要件
- **CSRF対策**: トークンベース認証
- **SQLインジェクション対策**: プリペアードステートメント
- **ファイルアップロード制限**: サイズ・形式チェック
- **入力検証**: 全入力データの検証

---

## 🎯 最終確認事項

### Claude担当分（完成済み）✅
- [x] フロントエンドUI実装完成
- [x] JavaScript機能実装完成
- [x] CSS/レスポンシブデザイン完成
- [x] 既存システム統合準備完成
- [x] API連携インターフェース準備完成

### Gemini担当分（開発待ち）🚧
- [ ] データベース設計・構築
- [ ] CategoryDetector.php実装
- [ ] ItemSpecificsGenerator.php実装
- [ ] CSVProcessor.php実装
- [ ] 全APIエンドポイント実装

### 統合テスト（両者完成後）⏳
- [ ] API連携テスト
- [ ] エンドツーエンドテスト
- [ ] パフォーマンステスト
- [ ] セキュリティテスト
- [ ] 本番リリース

---

**🎉 フロントエンド実装完了 - Geminiによるバックエンド実装をお待ちしています！**