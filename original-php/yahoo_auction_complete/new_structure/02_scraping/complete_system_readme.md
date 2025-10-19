# 完全統合スクレイピング・在庫管理システム

## 📦 対応プラットフォーム一覧（全18サイト）

### フリマ系（3サイト）
1. **メルカリ** (mercari.com)
2. **Yahoo！フリマ** (paypayfleamarket.yahoo.co.jp)
3. **メルカリショップス** (mercari-shops.com)

### リユース系（2サイト）
4. **セカンドストリート** (2ndstreet.jp, golf-kace.com)
5. **オフモール/ハードオフ** (netmall.hardoff.co.jp)

### 公式・量販店系（3サイト）
6. **ポケモンセンター** (pokemoncenter-online.com)
7. **ヨドバシ** (yodobashi.com)
8. **モノタロウ** (monotaro.com)

### ホビー系（1サイト）
9. **駿河屋** (suruga-ya.jp)

### ゴルフ専門店（9サイト）
10. **ゴルフキッズ** (shop.golfkids.co.jp)
11. **ゴルフパートナー** (golfpartner.jp)
12. **アルペン・ゴルフ5** (store.alpen-group.jp)
13. **ゴルフエフォート** (golfeffort.com)
14. **Yゴルフリユース** (y-golf-reuse.com)
15. **ニキゴルフ** (nikigolf.co.jp)
16. **レオナード** (reonard.com)
17. **STST中古** (stst-used.jp)
18. **アフターゴルフ** (aftergolf.net)

## 🏗️ システム構成

```
complete_scraping_system/
├── scrapers/
│   ├── ProductionScraperBase.php          # 基底クラス
│   ├── MercariProductionScraper.php       # メルカリ
│   ├── YahooFleaMarketProductionScraper.php # Yahoo！フリマ
│   ├── SecondStreetProductionScraper.php  # セカスト
│   ├── PokemonCenterProductionScraper.php # ポケモンセンター
│   ├── YodobashiProductionScraper.php     # ヨドバシ
│   ├── MonotaroProductionScraper.php      # モノタロウ
│   ├── SurugayaProductionScraper.php      # 駿河屋
│   ├── OffmallProductionScraper.php       # オフモール
│   ├── MercariShopsProductionScraper.php  # メルカリショップス
│   ├── GolfKidsProductionScraper.php      # ゴルフキッズ
│   ├── GolfPartnerProductionScraper.php   # ゴルフパートナー
│   ├── AlpenGolf5ProductionScraper.php    # アルペン
│   ├── MultiGolfSitesProductionScraper.php # 統合ゴルフ
│   └── CompleteScraperFactory.php         # ファクトリー
├── api/
│   ├── extended_platform_api.php          # 基本API
│   └── golf_products_api.php              # ゴルフ専用API
├── frontend/
│   ├── extended_platform_manager.js       # 基本UI
│   ├── golf_manager.js                    # ゴルフUI
│   └── styles/
│       ├── extended_platform_styles.css
│       └── golf_manager_styles.css
└── database/
    ├── extended_platform_migration.sql
    └── golf_sites_migration.sql
```

## 🚀 セットアップ

### 1. データベースマイグレーション

```bash
# 基本テーブル作成
mysql -u root -p database_name < extended_platform_migration.sql

# ゴルフ専用テーブル追加
mysql -u root -p database_name < golf_sites_migration.sql
```

### 2. 設定確認

```php
// config/database.php
return [
    'host' => 'localhost',
    'database' => 'your_database',
    'username' => 'your_user',
    'password' => 'your_password'
];
```

### 3. 権限設定

```bash
chmod 755 api/*.php
chmod 644 frontend/*.js
chmod 644 frontend/styles/*.css
```

## 📝 使用方法

### PHP（サーバーサイド）

```php
<?php
require_once 'CompleteScraperFactory.php';

$pdo = getDbConnection();
$service = new CompleteScrapingService($pdo);

// 任意のプラットフォームをスクレイピング
$result = $service->scrapeAnyPlatform(
    'https://www.golfpartner.jp/shop/used/product/12345',
    ['download_images' => true]
);

// ゴルフ商品専用処理
$golfResult = $service->scrapeGolfProduct(
    'https://shop.golfkids.co.jp/products/test'
);

// 一括処理
$urls = [
    'https://www.yodobashi.com/product/...',
    'https://www.pokemoncenter-online.com/...',
    'https://www.golfpartner.jp/...'
];
$batchResult = $service->scrapeBatch($urls);

// プラットフォーム情報取得
$factory = new CompleteScraperFactory($pdo);
$platforms = $factory->getSupportedPlatforms();
$categories = $factory->getPlatformsByCategory();
?>
```

### JavaScript（フロントエンド）

```javascript
// 基本プラットフォーム管理
const manager = new ExtendedPlatformManager();
await manager.init();

// ゴルフ商品管理
const golfManager = new GolfProductManager();
await golfManager.init();

// ゴルフクラブ検索
const clubs = await golfManager.searchGolfClubs({
    club_type: 'ドライバー',
    brand: 'テーラーメイド',
    flex: 'S',
    min_price: 10000,
    max_price: 50000,
    status: 'available'
});
```

### REST API

```bash
# プラットフォーム情報取得
curl "http://your-domain/api/golf_products_api.php?action=get_platform_info"

# ゴルフクラブ検索
curl "http://your-domain/api/golf_products_api.php?action=search_golf_clubs&club_type=ドライバー&brand=テーラーメイド"

# 商品スクレイピング
curl -X POST http://your-domain/api/extended_platform_api.php \
  -d "action=scrape_new_platform" \
  -d "url=https://shop.golfkids.co.jp/products/test"

# ゴルフ仕様登録
curl -X POST http://your-domain/api/golf_products_api.php \
  -d "action=register_golf_specs" \
  -d "product_id=123" \
  -d "club_type=ドライバー" \
  -d "brand=テーラーメイド" \
  -d "loft=10.5" \
  -d "flex=S"
```

## 📊 データベーススキーマ

### 主要テーブル

#### supplier_products（商品マスター）
```sql
- id: INT (主キー)
- platform: VARCHAR(20)
- product_title: VARCHAR(500)
- purchase_price: DECIMAL(10,2)
- current_stock: INT
- url_status: VARCHAR(20)
- additional_data: JSON
```

#### golf_product_specifications（ゴルフ仕様）
```sql
- id: INT (主キー)
- supplier_product_id: INT
- club_type: VARCHAR(50)
- brand: VARCHAR(100)
- loft: DECIMAL(4,1)
- flex: VARCHAR(20)
- shaft_name: VARCHAR(200)
- condition_rank: VARCHAR(10)
```

#### platform_configurations（プラットフォーム設定）
```sql
- platform: VARCHAR(20) (主キー)
- display_name: VARCHAR(100)
- base_url: VARCHAR(500)
- request_delay: INT
- custom_config: JSON
```

### 便利なビュー

```sql
-- カテゴリ別統計
SELECT * FROM v_category_statistics;

-- ゴルフクラブ検索
SELECT * FROM v_golf_clubs_search WHERE club_type = 'ドライバー';

-- 在庫アラート
SELECT * FROM v_golf_inventory_alerts;
```

## 🔧 カスタマイズ

### 新規プラットフォーム追加

1. スクレイパークラス作成:

```php
class NewPlatformScraper extends ProductionScraperBase {
    protected function getPlatformName() {
        return 'new_platform';
    }
    
    protected function getTitleSelectors() {
        return ['h1.product-name', '.title'];
    }
    
    // その他の必須メソッド実装...
}
```

2. ファクトリーに追加:

```php
// CompleteScraperFactory.php
public function createScraper($url) {
    if (preg_match('/newsite\.com/', $url)) {
        return new NewPlatformScraper($this->pdo);
    }
    // ...
}
```

3. データベース設定追加:

```sql
INSERT INTO platform_configurations 
(platform, display_name, base_url) 
VALUES ('new_platform', '新プラットフォーム', 'https://newsite.com');
```

## 🎯 機能一覧

### スクレイピング機能
- ✅ 18プラットフォーム対応
- ✅ 自動リトライ機能
- ✅ エラーハンドリング
- ✅ 画像ダウンロード
- ✅ 重複チェック
- ✅ バッチ処理

### 在庫管理機能
- ✅ リアルタイム在庫確認
- ✅ 価格変動追跡
- ✅ URLステータス監視
- ✅ 自動アラート
- ✅ 統計レポート

### ゴルフ専用機能
- ✅ クラブスペック管理
- ✅ 詳細検索
- ✅ ブランド分析
- ✅ 人気クラブランキング
- ✅ 状態ランク管理

## ⚙️ パフォーマンス設定

### リクエスト間隔調整

```php
protected function getScraperConfig() {
    return [
        'request_delay' => 2000,  // ミリ秒
        'max_retries' => 5,
        'timeout' => 30
    ];
}
```

### バッチ処理最適化

```php
$processor = new ProductionBatchProcessor($scraper);
$processor->setBatchSize(10);        // バッチサイズ
$processor->setMaxConcurrent(3);     // 並行処理数
```

## 🐛 トラブルシューティング

### スクレイピング失敗
1. セレクター確認: HTML構造変更の可能性
2. リクエスト間隔延長: アクセス制限対策
3. ログ確認: `scraping_execution_logs`テーブル

### データベースエラー
1. 接続確認: `getDbConnection()`
2. 文字コード: UTF-8設定確認
3. インデックス: `ANALYZE TABLE`実行

### パフォーマンス問題
1. インデックス最適化
2. キャッシュ有効化
3. バッチサイズ調整

## 📈 統計・分析

### カテゴリ別統計
```php
$stats = $service->getCategoryStatistics();
// フリマ、ゴルフ、リユース等の統計
```

### プラットフォーム別実績
```php
$platformStats = $factory->getPlatformStatistics();
```

### 人気商品分析
```php
$popular = $golfManager->getPopularClubs(20);
```

## 🔐 セキュリティ

- ✅ SQLインジェクション対策（プリペアドステートメント）
- ✅ XSS対策（出力エスケープ）
- ✅ CSRF保護
- ✅ 入力検証
- ✅ アクセスログ記録

## 📞 サポート

### ログ確認
```sql
-- エラーログ
SELECT * FROM scraping_execution_logs 
WHERE execution_status = 'failed' 
ORDER BY executed_at DESC LIMIT 100;

-- 在庫アラート
SELECT * FROM v_golf_inventory_alerts 
WHERE alert_type != 'OK';
```

### デバッグモード
```php
// Logger.php
$logger->setLogLevel('DEBUG');
```

## ✅ 開発チェックリスト

- [x] 18プラットフォーム実装完了
- [x] データベースマイグレーション完了
- [x] API実装完了
- [x] フロントエンド実装完了
- [x] ゴルフ専用機能完了
- [x] エラーハンドリング実装
- [x] ドキュメント作成完了

---

**バージョン**: 2.0.0  
**最終更新**: 2025-09-26  
**対応プラットフォーム**: 18サイト  
**主要機能**: スクレイピング + 在庫管理 + ゴルフ専用機能