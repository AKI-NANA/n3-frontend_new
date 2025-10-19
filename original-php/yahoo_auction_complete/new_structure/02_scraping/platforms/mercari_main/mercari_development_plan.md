# 📦 メルカリ商品スクレイピング・在庫管理開発計画書

**プロジェクト名**: メルカリ統合スクレイピングシステム  
**開発期間**: 7-10日間  
**技術スタック**: PHP 8.x + PostgreSQL + Redis  
**設計原則**: 既存システム準拠、エンタープライズレベル品質

---

## 🎯 プロジェクト概要

### 目標
既存のYahoo Auction統合システムの成功事例を基に、メルカリの商品スクレイピングと在庫管理機能を開発し、マルチプラットフォーム対応システムとして完成させる。

### 既存システムとの関係
- **ベースシステム**: Yahoo Auction統合システム（商用化段階、3年開発済み）
- **在庫管理**: 2025年9月完全実装済みシステムを活用
- **技術標準**: 既存API標準、データベース設計を継承

---

## 🏗️ システム設計

### アーキテクチャ
```
02_scraping/
├── platforms/
│   ├── yahoo/          # 既存（完成）
│   ├── rakuten/        # 既存（基盤完成）
│   └── mercari/        # 新規開発対象
│       ├── MercariScraper.php
│       ├── mercari_parser.php
│       ├── mercari_config.php
│       └── MercariInventoryManager.php
├── inventory_management/  # 既存（完全実装済み）
├── api_unified/          # 統合API
└── common/               # 共通ライブラリ
```

### データフロー
```
メルカリ商品URL → スクレイピング → データ解析 → 在庫管理登録 → 価格監視 → 変動通知
```

---

## 📋 開発フェーズ

### **Phase 1: 基盤構築（1-2日）**

#### 1.1 メルカリ設定ファイル作成
```php
// platforms/mercari/mercari_config.php
return [
    'platform_name' => 'メルカリ',
    'platform_id' => 'mercari',
    'base_url' => 'https://jp.mercari.com',
    'request_delay' => 3000, // メルカリは厳しいため長めに設定
    'timeout' => 30,
    'max_retries' => 3,
    'selectors' => [
        'title' => 'h1[data-testid="name"]',
        'price' => 'span[data-testid="price"]',
        'condition' => 'span[data-testid="item-condition"]',
        'description' => 'div[data-testid="description"]',
        'images' => 'img[data-testid="product-image"]',
        'seller' => 'a[data-testid="seller-name"]',
        'sold_status' => 'div[data-testid="item-sold-out-badge"]'
    ]
];
```

#### 1.2 メルカリ専用データベーステーブル
```sql
-- メルカリ特有の情報を格納
CREATE TABLE mercari_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mercari_item_id VARCHAR(20) UNIQUE NOT NULL,
    scraped_product_id INT,
    seller_info JSON,
    condition_details TEXT,
    shipping_info JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scraped_product_id) REFERENCES yahoo_scraped_products(id)
);
```

### **Phase 2: メルカリスクレイパー開発（3-5日）**

#### 2.1 MercariScraper.php 実装
```php
class MercariScraper extends BaseScraper 
{
    private $config;
    private $logger;
    
    public function __construct($pdo) {
        parent::__construct($pdo);
        $this->config = require 'mercari_config.php';
        $this->logger = new ScrapingLogger('mercari');
    }
    
    public function scrapeProduct($url) {
        // URL検証
        if (!$this->isValidMercariUrl($url)) {
            throw new InvalidArgumentException('無効なメルカリURL');
        }
        
        // 商品ID抽出
        $itemId = $this->extractItemId($url);
        
        // 重複チェック
        if ($this->isDuplicateProduct($itemId)) {
            return $this->handleDuplicateProduct($itemId);
        }
        
        // スクレイピング実行
        $html = $this->fetchWithRetry($url);
        $productData = $this->parseProductData($html, $url);
        
        // データベース保存
        $productId = $this->saveProduct($productData);
        
        // 在庫管理システム登録
        $this->registerToInventorySystem($productId, $url);
        
        return [
            'success' => true,
            'product_id' => $productId,
            'data' => $productData
        ];
    }
}
```

#### 2.2 メルカリ特有の解析処理
- **商品状態**: 新品・未使用、目立った傷や汚れなし、など
- **配送情報**: 送料込み・送料別、配送方法
- **出品者情報**: 評価、出品数
- **売り切れ検知**: SOLD OUT表示の検出

#### 2.3 アンチスクレイピング対策
- **User-Agent ローテーション**: 複数のUA使用
- **リクエスト間隔**: 3-5秒の間隔設定
- **セッション管理**: Cookie管理による自然なアクセスパターン
- **プロキシ対応**: 必要に応じてプロキシローテーション

### **Phase 3: 在庫管理統合（2-3日）**

#### 3.1 既存在庫管理システム拡張
```php
class MercariInventoryManager extends InventoryManager 
{
    public function registerMercariProduct($productId, $mercariUrl) {
        // 既存の在庫管理テーブルにメルカリ商品を登録
        $stmt = $this->pdo->prepare("
            INSERT INTO inventory_management 
            (product_id, source_platform, source_url, monitoring_enabled) 
            VALUES (?, 'mercari', ?, true)
        ");
        return $stmt->execute([$productId, $mercariUrl]);
    }
    
    public function checkMercariStock($inventoryId) {
        // メルカリの在庫状況をチェック
        $product = $this->getInventoryProduct($inventoryId);
        $currentData = $this->scraper->scrapeProduct($product['source_url']);
        
        // 変更検知・履歴記録
        return $this->processStockChange($inventoryId, $currentData);
    }
}
```

#### 3.2 定期監視システム統合
既存のcronシステムにメルカリ商品の価格・在庫監視を追加：

```php
// scripts/inventory_cron.php に追加
case 'mercari':
    $manager = new MercariInventoryManager($pdo);
    $result = $manager->checkMercariStock($inventory['id']);
    break;
```

### **Phase 4: API統合（1-2日）**

#### 4.1 統合スクレイピングAPI拡張
```php
// api_unified/unified_scraping.php
function executeMultiPlatformScraping($url) {
    $platform = detectPlatform($url);
    
    switch ($platform) {
        case 'mercari':
            return executeMercariScraping($url, $pdo);
        case 'yahoo_auction':
            return executeYahooScraping($url, $pdo);
        // 他のプラットフォーム...
    }
}
```

#### 4.2 RESTful API エンドポイント
```
POST /api/scraping/mercari
GET /api/inventory/mercari/{product_id}
PUT /api/inventory/mercari/{product_id}/monitor
DELETE /api/inventory/mercari/{product_id}
```

### **Phase 5: UI統合（1-2日）**

#### 5.1 統合管理画面
- **プラットフォーム選択**: Yahoo/楽天/メルカリの選択UI
- **一括スクレイピング**: 複数URLの同時処理
- **在庫監視ダッシュボード**: リアルタイム状況表示

#### 5.2 メルカリ専用機能
- **商品状態表示**: メルカリ特有の状態情報
- **出品者情報**: 評価・信頼度表示
- **配送情報**: 送料・配送方法詳細

---

## 🔧 技術仕様詳細

### メルカリの技術的特徴
1. **Single Page Application**: React.js使用、動的コンテンツ
2. **API構造**: GraphQL API使用
3. **認証**: OAuth2.0ベース
4. **レート制限**: 厳格なアクセス制限

### 対応アプローチ
1. **Headless Browser**: Selenium/Puppeteer使用検討
2. **API逆解析**: 公開API構造の分析活用
3. **機械学習**: 商品判定精度向上
4. **キャッシング**: Redis活用による高速化

### セキュリティ対策
- **IPローテーション**: プロキシ使用
- **リクエスト分散**: 時間分散処理
- **ログ管理**: 詳細アクセスログ
- **エラー処理**: 適切なエラーハンドリング

---

## 📊 データ構造設計

### メルカリ商品データスキーマ
```json
{
    "mercari_item_id": "m12345678",
    "title": "商品タイトル",
    "price": 2980,
    "original_price": 3500,
    "condition": "新品、未使用",
    "description": "商品説明文...",
    "images": [
        "https://static.mercdn.net/item/detail/orig/photos/...",
    ],
    "seller": {
        "name": "出品者名",
        "rating": 4.8,
        "reviews": 150
    },
    "shipping": {
        "method": "らくらくメルカリ便",
        "cost": "送料込み",
        "duration": "1-2日で発送"
    },
    "category": {
        "main": "レディース",
        "sub": "トップス",
        "detail": "Tシャツ/カットソー(半袖/袖なし)"
    },
    "status": "on_sale", // on_sale, sold_out, deleted
    "scraped_at": "2025-09-25T10:30:00Z"
}
```

### 在庫管理統合データ
```sql
-- inventory_management テーブル拡張
ALTER TABLE inventory_management 
ADD COLUMN mercari_specific_data JSON COMMENT 'メルカリ固有データ';

-- メルカリ価格履歴
CREATE TABLE mercari_price_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    price DECIMAL(10,2),
    original_price DECIMAL(10,2),
    discount_rate DECIMAL(5,2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product_time (product_id, recorded_at)
);
```

---

## 🚀 開発スケジュール

### 週1: 基盤構築・スクレイパー開発
- **Day 1-2**: 設定ファイル、データベース設計
- **Day 3-5**: MercariScraper.php 実装・テスト
- **Day 6-7**: アンチスクレイピング対策・安定化

### 週2: システム統合・完成
- **Day 8-9**: 在庫管理システム統合
- **Day 10**: API統合・UI実装
- **Day 11**: 総合テスト・品質保証
- **Day 12-14**: ドキュメント作成・運用準備

---

## ✅ 品質保証

### テスト戦略
1. **ユニットテスト**: 各クラス・メソッドの単体テスト
2. **統合テスト**: システム間連携テスト  
3. **パフォーマンステスト**: 大量データ処理テスト
4. **セキュリティテスト**: 脆弱性・アクセス制限テスト

### 監視・運用
1. **ログ監視**: エラー・パフォーマンス監視
2. **アラート**: 異常検知時の通知機能
3. **レポート**: 日次・週次処理レポート
4. **メンテナンス**: 定期的な最適化・更新

### 成功指標
- **スクレイピング成功率**: 95%以上
- **データ精度**: 98%以上
- **システム稼働率**: 99%以上
- **処理速度**: 100商品/時間以上

---

## 🔮 将来拡張計画

### フェーズ2拡張（3-6ヶ月後）
- **Amazon**: セラー商品スクレイピング
- **PayPayフリマ**: フリマ系プラットフォーム拡張
- **ラクマ**: 楽天フリマ対応

### フェーズ3拡張（6-12ヶ月後）
- **AI機能**: 商品自動分類・価格予測
- **モバイルアプリ**: スマホ対応システム
- **クラウド化**: AWS/Azure完全対応

---

## 📝 リスク管理

### 技術リスク
- **メルカリ仕様変更**: 定期的な仕様チェック・更新対応
- **アクセス制限**: プロキシ・分散処理での対応
- **パフォーマンス**: キャッシュ・最適化による高速化

### 運用リスク  
- **法的問題**: 利用規約遵守・適切な利用
- **データ品質**: 検証機能・手動確認体制
- **システム障害**: 冗長化・バックアップ体制

### 対策
- **段階的リリース**: 小規模テストから本格運用へ
- **監視体制**: 24時間監視・即座対応
- **バックアップ**: 定期バックアップ・復旧手順

---

## 💡 成功のための重要ポイント

1. **既存システム活用**: Yahoo Auctionの成功事例を最大限活用
2. **段階的開発**: 小さな成功を積み重ねて大きな目標達成
3. **品質重視**: エンタープライズレベルの品質標準維持
4. **継続改善**: ユーザーフィードバックによる継続的改善
5. **技術革新**: 最新技術の積極的導入・実験

---

## 📞 サポート・連絡先

**開発チーム**: システム開発部  
**プロジェクト管理**: 統合システム担当  
**緊急連絡**: 24時間監視体制  
**次回レビュー**: 開発完了後1週間以内