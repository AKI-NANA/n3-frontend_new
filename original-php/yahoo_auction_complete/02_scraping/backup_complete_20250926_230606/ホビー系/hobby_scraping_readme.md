# 🎮 ホビー系ECサイト統合スクレイピングシステム

**バージョン**: 1.0.0  
**開発日**: 2025年9月26日  
**対応プラットフォーム**: 25+サイト

---

## 📋 目次

1. [システム概要](#システム概要)
2. [対応プラットフォーム](#対応プラットフォーム)
3. [セットアップ](#セットアップ)
4. [使用方法](#使用方法)
5. [HTML構造分析](#HTML構造分析)
6. [データベース設計](#データベース設計)
7. [API仕様](#API仕様)
8. [トラブルシューティング](#トラブルシューティング)

---

## 🎯 システム概要

既存の`yahoo_scraped_products`テーブルを拡張し、ヤフオク・メルカリに加えて25以上のホビー系ECサイトからの商品データ取得、在庫監視、価格追跡を統合的に管理するシステムです。

### 主要機能

- ✅ **25+プラットフォーム対応**: タカラトミー、バンダイ、任天堂など
- ✅ **リアルタイム在庫監視**: 自動在庫チェック
- ✅ **価格変動追跡**: 履歴データベース記録
- ✅ **既存システム完全連携**: yahoo_scraped_products拡張
- ✅ **柔軟なHTML解析**: 複数セレクター対応
- ✅ **バッチ処理対応**: 大量URL一括処理

---

## 🏪 対応プラットフォーム

### 大手メーカー直営
- **タカラトミー系**: モール、リカちゃん、トミカ、プラレール、ポケモン等
- **バンダイ系**: ホビーサイト、プレミアムバンダイ、ガシャポン
- **任天堂**: 公式ストア

### ホビー専門店
- ポストホビー（ホビージャパン直営）
- KYDストア
- ひこセブン
- トイサピエンス
- フミオ

### メーカー・公式ストア
- タミヤ
- メディコス
- ブリッツウェイ
- ブーストギア
- メタルボックス

### コンテンツ公式ストア
- 集英社コミックストア
- 東宝エンタテインメント
- NARUTO公式
- ソフマップ
- アニメストア
- ガールズバンドクライ
- 豆魚雷
- バトンストア

---

## 🚀 セットアップ

### 1. 必要な環境

```bash
- PHP 8.0以上
- PostgreSQL 12以上
- Composer
- GuzzleHTTP
- Symfony DomCrawler
```

### 2. Composerパッケージインストール

```bash
composer require guzzlehttp/guzzle
composer require symfony/dom-crawler
composer require symfony/css-selector
```

### 3. データベースマイグレーション実行

```bash
psql -U postgres -d nagano3_db -f database_migration.sql
```

実行内容:
- 既存`yahoo_scraped_products`テーブル拡張
- 価格・在庫変動履歴テーブル作成
- プラットフォーム管理テーブル作成
- インデックス・ビュー・トリガー設定

### 4. ディレクトリ構造作成

```bash
02_scraping/
├── platforms/
│   ├── hobby/
│   │   ├── BaseHobbyScraper.php          # 基底クラス
│   │   ├── TakaraTomyScraper.php         # タカラトミー
│   │   ├── BandaiHobbyScraper.php        # バンダイ
│   │   ├── NintendoStoreScraper.php      # 任天堂
│   │   ├── PostHobbyScraper.php          # ポストホビー
│   │   └── [各プラットフォーム]
│   └── batch/
│       └── hobby_scraping_batch.php      # バッチ処理
├── config/
│   ├── platforms.json                     # プラットフォーム設定
│   └── urls/
│       ├── takaratomy_urls.txt
│       ├── bandai_urls.txt
│       └── [各プラットフォームURL]
└── logs/
    └── scraping/
        └── [日次ログファイル]
```

### 5. 設定ファイル配置

`config/platforms.json` を配置し、各プラットフォームのセレクター設定を記述。

---

## 📖 使用方法

### 基本的な使用法

#### 単一URL スクレイピング

```php
<?php
require_once 'platforms/hobby/TakaraTomyScraper.php';

$scraper = new TakaraTomyScraper();
$result = $scraper->scrape('https://takaratomymall.jp/shop/g/g4904810990604/');

if ($result['success']) {
    echo "成功: Product ID " . $result['product_id'];
    print_r($result['data']);
} else {
    echo "エラー: " . $result['error'];
}
```

#### バッチ処理（全プラットフォーム）

```bash
php platforms/batch/hobby_scraping_batch.php --platform=all
```

#### バッチ処理（特定プラットフォーム）

```bash
php platforms/batch/hobby_scraping_batch.php --platform=takaratomy --urls=config/urls/takaratomy_urls.txt
```

#### Cronジョブ設定例

```cron
# 1時間毎に全プラットフォームスクレイピング
0 * * * * cd /path/to/02_scraping && php platforms/batch/hobby_scraping_batch.php --platform=all

# 15分毎に在庫監視（監視対象のみ）
*/15 * * * * cd /path/to/02_scraping && php platforms/batch/stock_monitor.php
```

---

## 🔍 HTML構造分析

### タカラトミーモール

```html
<!-- 商品ページ構造 -->
<div class="product-detail">
    <h1 class="product-name">トミカ No.123 ...</h1>
    <div class="price-box">
        <span class="price">¥880</span>
        <s class="original-price">¥1,100</s>
    </div>
    <div class="stock-status">在庫あり</div>
    <button class="add-to-cart">カートに入れる</button>
    <div class="product-images">
        <img src="..." class="product-image">
    </div>
    <div class="product-description">商品説明...</div>
</div>
```

**在庫判定ロジック**:
1. `button.add-to-cart[disabled]` → 在庫切れ
2. テキスト「品切れ」「入荷待ち」 → 在庫切れ
3. テキスト「予約」 → 予約受付中
4. それ以外 → 在庫あり

### バンダイホビーサイト

```html
<!-- SPA構造（React/Vue.js） -->
<div id="app">
    <div class="item-detail">
        <h1 class="item-name">HG 1/144 ガンダム...</h1>
        <div class="price-info">
            <span class="price-value">2,200</span>
        </div>
        <div class="stock-info" data-stock="available">発売中</div>
    </div>
</div>

<!-- JSON-LD構造化データ -->
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "HG 1/144 ガンダム",
  "offers": {
    "@type": "Offer",
    "price": "2200",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

**スクレイピング手法**:
- Headless Browser (Puppeteer/Playwright) 使用推奨
- JSON-LD抽出で効率化
- APIエンドポイント逆解析

### ポストホビー

```html
<div class="item_box">
    <h2 class="item_name">S.H.Figuarts ...</h2>
    <span class="sale_price">¥7,700</span>
    <p class="item_stock">在庫: 3個</p>
    <img class="item_photo" src="...">
    <div class="item_detail">商品詳細...</div>
</div>
```

**在庫抽出**:
- 正規表現: `/在庫[:：]\s*(\d+)/` で数値取得
- 「入荷待ち」「完売」テキストで判定

### 任天堂公式ストア

```html
<div class="product-info">
    <h1 class="product-name">ゼルダの伝説...</h1>
    <div class="product-price">¥6,578</div>
    <div class="stock-message">在庫あり</div>
    <button class="btn-add-cart">カートに追加</button>
</div>
```

**注意事項**:
- Cloudflare保護あり
- レート制限: 5秒/リクエスト
- User-Agent必須

---

## 💾 データベース設計

### 拡張されたyahoo_scraped_productsテーブル

```sql
CREATE TABLE yahoo_scraped_products (
    id SERIAL PRIMARY KEY,
    -- 既存カラム
    title VARCHAR(500),
    price DECIMAL(10,2),
    url TEXT,
    image_url TEXT,
    description TEXT,
    category VARCHAR(100),
    
    -- 新規追加カラム
    source_platform VARCHAR(50),        -- プラットフォームコード
    source_item_id VARCHAR(100),        -- プラットフォーム固有ID
    stock_status VARCHAR(50),           -- in_stock/out_of_stock/preorder
    stock_quantity INTEGER,             -- 在庫数
    brand VARCHAR(100),                 -- ブランド名
    scraped_data JSONB,                 -- 生データJSON
    monitoring_enabled BOOLEAN,         -- 監視有効化
    last_monitored_at TIMESTAMP,        -- 最終監視日時
    
    -- タイムスタンプ
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 価格変動履歴テーブル

```sql
CREATE TABLE price_change_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES yahoo_scraped_products(id),
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    change_percent DECIMAL(5,2),
    change_amount DECIMAL(10,2),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 在庫変動履歴テーブル

```sql
CREATE TABLE stock_change_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES yahoo_scraped_products(id),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    old_quantity INTEGER,
    new_quantity INTEGER,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### プラットフォーム管理テーブル

```sql
CREATE TABLE scraping_platforms (
    id SERIAL PRIMARY KEY,
    platform_code VARCHAR(50) UNIQUE,
    platform_name VARCHAR(100),
    platform_type VARCHAR(20),
    base_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    scraping_config JSONB,
    total_products INTEGER DEFAULT 0,
    last_scraped_at TIMESTAMP
);
```

---

## 🔌 API仕様

### 商品検索API

```php
GET /api/products/search
Parameters:
  - platform: string (プラットフォームコード)
  - keyword: string (検索キーワード)
  - stock_status: string (in_stock/out_of_stock/preorder)
  - min_price: float
  - max_price: float
  - limit: int (デフォルト: 20)

Response:
{
  "success": true,
  "count": 15,
  "products": [
    {
      "id": 123,
      "title": "商品名",
      "price": 2980,
      "stock_status": "in_stock",
      "stock_quantity": 5,
      "platform": "takaratomy",
      "url": "https://...",
      "image_url": "https://..."
    }
  ]
}
```

### 在庫変動取得API

```php
GET /api/stock-changes
Parameters:
  - product_id: int
  - days: int (デフォルト: 7)

Response:
{
  "success": true,
  "product_id": 123,
  "changes": [
    {
      "old_status": "in_stock",
      "new_status": "out_of_stock",
      "old_quantity": 10,
      "new_quantity": 0,
      "detected_at": "2025-09-26 10:30:00"
    }
  ]
}
```

### 価格変動取得API

```php
GET /api/price-changes
Parameters:
  - product_id: int
  - days: int (デフォルト: 30)

Response:
{
  "success": true,
  "product_id": 123,
  "changes": [
    {
      "old_price": 3000,
      "new_price": 2700,
      "change_percent": -10.0,
      "detected_at": "2025-09-25 14:20:00"
    }
  ]
}
```

---

## 🛠️ トラブルシューティング

### よくある問題と解決方法

#### 1. スクレイピングが失敗する

**症状**: エラーログに「Connection timeout」

**解決方法**:
```php
// config/platforms.json のタイムアウト値を増やす
"timeout": 60,  // 30 → 60秒に変更
"max_retries": 5  // リトライ回数を増やす
```

#### 2. 在庫状態が正しく取得できない

**症状**: `stock_status` が常に `unknown`

**解決方法**:
1. HTML構造を再確認
```bash
curl -A "Mozilla/5.0" https://target-url.com > test.html
```

2. セレクターを修正
```json
"selectors": {
  "stock_status": [
    ".stock-info",      // 優先度高
    ".availability",
    "span.stock"
  ]
}
```

3. キーワードパターンを追加
```json
"stock_patterns": {
  "in_stock": ["在庫あり", "販売中", "Available"],
  "out_of_stock": ["品切れ", "完売", "Out of Stock"]
}
```

#### 3. 価格が0円になる

**症状**: `price` が `0.00`

**解決方法**:
```php
// デバッグモード有効化
protected function extractPrice($html) {
    $crawler = new Crawler($html);
    
    foreach ($this->selectors['price'] as $selector) {
        try {
            $priceText = $crawler->filter($selector)->text();
            error_log("Price text found: {$priceText}"); // デバッグログ
            
            $price = preg_replace('/[^0-9]/', '', $priceText);
            if (!empty($price)) {
                return (float) $price;
            }
        } catch (\Exception $e) {
            error_log("Selector failed: {$selector}");
        }
    }
    return 0;
}
```

#### 4. IPブロックされる

**症状**: 403 Forbidden エラー

**解決方法**:
1. リクエスト間隔を延ばす
```json
"request_delay": 5000  // 2秒 → 5秒
```

2. User-Agentをローテーション
```php
protected function getRandomUserAgent() {
    $agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
        'Mozilla/5.0 (X11; Linux x86_64)...'
    ];
    return $agents[array_rand($agents)];
}
```

3. プロキシ使用（必要な場合）
```php
$this->httpClient = new Client([
    'proxy' => 'http://proxy-server:port',
    'timeout' => 30
]);
```

#### 5. データベース接続エラー

**症状**: `SQLSTATE[08006] Connection failed`

**解決方法**:
```php
// 接続パラメータ確認
$dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
$user = "postgres";
$password = "Kn240914";

// 接続テスト
try {
    $pdo = new PDO($dsn, $user, $password);
    echo "Database connection OK\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
```

---

## 📊 統計・モニタリング

### プラットフォーム別統計

```sql
-- プラットフォーム別商品数
SELECT 
    source_platform,
    COUNT(*) as total_products,
    COUNT(CASE WHEN stock_status = 'in_stock' THEN 1 END) as in_stock,
    COUNT(CASE WHEN stock_status = 'out_of_stock' THEN 1 END) as out_of_stock,
    AVG(price) as avg_price
FROM yahoo_scraped_products
GROUP BY source_platform
ORDER BY total_products DESC;
```

### 最近の価格変動

```sql
-- 過去7日間の価格変動
SELECT 
    ysp.title,
    ysp.source_platform,
    pch.old_price,
    pch.new_price,
    pch.change_percent,
    pch.detected_at
FROM price_change_history pch
JOIN yahoo_scraped_products ysp ON pch.product_id = ysp.id
WHERE pch.detected_at >= NOW() - INTERVAL '7 days'
ORDER BY ABS(pch.change_percent) DESC
LIMIT 20;
```

### 在庫変動アラート

```sql
-- 在庫復活商品（out_of_stock → in_stock）
SELECT 
    ysp.id,
    ysp.title,
    ysp.price,
    ysp.url,
    sch.detected_at
FROM stock_change_history sch
JOIN yahoo_scraped_products ysp ON sch.product_id = ysp.id
WHERE sch.old_status = 'out_of_stock'
  AND sch.new_status = 'in_stock'
  AND sch.detected_at >= NOW() - INTERVAL '24 hours'
ORDER BY sch.detected_at DESC;
```

---

## 🔐 セキュリティ・コンプライアンス

### robots.txt 遵守

各プラットフォームの`robots.txt`を必ず確認:

```bash
curl https://takaratomymall.jp/robots.txt
curl https://bandai-hobby.net/robots.txt
```

### レート制限

推奨設定:
- **大手公式サイト**: 5秒/リクエスト
- **中小ECサイト**: 2-3秒/リクエスト
- **専門ショップ**: 1-2秒/リクエスト

### 利用規約確認

各サイトの利用規約を確認し、禁止事項を遵守してください。

---

## 📝 今後の拡張計画

### Phase 2 (3ヶ月後)
- [ ] Headless Browser 統合（Puppeteer/Playwright）
- [ ] API対応プラットフォーム拡大
- [ ] リアルタイム通知機能（Webhook/メール）
- [ ] 価格予測AI機能

### Phase 3 (6ヶ月後)
- [ ] モバイルアプリ連携
- [ ] Amazon、楽天市場対応
- [ ] 自動再入荷アラート
- [ ] 価格最適化レコメンド

---

## 📞 サポート・問い合わせ

**開発チーム**: システム開発部  
**プロジェクト**: ホビー系EC統合スクレイピング  
**バージョン**: 1.0.0  
**最終更新**: 2025年9月26日

---

## ✅ チェックリスト（初回セットアップ）

- [ ] Composerパッケージインストール完了
- [ ] データベースマイグレーション実行完了
- [ ] config/platforms.json 配置完了
- [ ] ログディレクトリ作成完了
- [ ] 各スクレイパークラス配置完了
- [ ] バッチスクリプトテスト実行成功
- [ ] Cronジョブ設定完了
- [ ] 既存システムとの連携確認完了

**セットアップ完了後、最初のスクレイピングテストを実行してください！**

```bash
php platforms/batch/hobby_scraping_batch.php --platform=takaratomy --urls=test_urls.txt
```