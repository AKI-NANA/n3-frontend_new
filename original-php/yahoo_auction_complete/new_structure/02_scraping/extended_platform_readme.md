# 拡張プラットフォーム実装ガイド

## 📦 新規追加プラットフォーム

本実装では以下の5つの新規プラットフォームに対応しました:

1. **ポケモンセンター** (pokemoncenter-online.com)
2. **ヨドバシ** (yodobashi.com)
3. **モノタロウ** (monotaro.com)
4. **駿河屋** (suruga-ya.jp)
5. **オフモール/ハードオフ** (netmall.hardoff.co.jp)

## 🏗️ ファイル構成

```
/
├── PokemonCenterProductionScraper.php    # ポケモンセンタースクレイパー
├── YodobashiProductionScraper.php        # ヨドバシスクレイパー
├── MonotaroProductionScraper.php         # モノタロウスクレイパー
├── SurugayaProductionScraper.php         # 駿河屋スクレイパー
├── OffmallProductionScraper.php          # オフモールスクレイパー
├── ExtendedScraperFactory.php            # 統合ファクトリークラス
├── extended_platform_api.php             # 在庫管理API
├── extended_platform_migration.sql       # データベースマイグレーション
├── extended_platform_manager.js          # フロントエンドJS
├── extended_platform_styles.css          # スタイルシート
├── extended_platform_demo.html           # デモページ
└── EXTENDED_PLATFORMS_README.md          # 本ファイル
```

## 🚀 セットアップ手順

### 1. データベースマイグレーション実行

```bash
mysql -u your_user -p your_database < extended_platform_migration.sql
```

### 2. PHPファイル配置

既存のスクレイピングシステムディレクトリに各PHPファイルを配置:

```
02_scraping/
├── platforms/
│   ├── pokemon_center/
│   │   └── PokemonCenterProductionScraper.php
│   ├── yodobashi/
│   │   └── YodobashiProductionScraper.php
│   ├── monotaro/
│   │   └── MonotaroProductionScraper.php
│   ├── surugaya/
│   │   └── SurugayaProductionScraper.php
│   └── offmall/
│       └── OffmallProductionScraper.php
├── ExtendedScraperFactory.php
└── api/
    └── extended_platform_api.php
```

### 3. フロントエンド設置

```
public/
├── js/
│   └── extended_platform_manager.js
├── css/
│   └── extended_platform_styles.css
└── extended_platform_demo.html
```

## 📝 使用方法

### PHP使用例

```php
<?php
require_once 'ExtendedScraperFactory.php';

$pdo = getDbConnection();
$service = new ExtendedScrapingService($pdo);

// 単一URL スクレイピング
$result = $service->scrapeAnyPlatform(
    'https://www.pokemoncenter-online.com/4521329400181.html',
    ['download_images' => true]
);

if ($result['success']) {
    echo "商品ID: " . $result['product_id'] . "\n";
    echo "タイトル: " . $result['data']['title'] . "\n";
    echo "価格: " . $result['data']['price'] . "円\n";
}

// 一括スクレイピング
$urls = [
    'https://www.yodobashi.com/product/...',
    'https://www.monotaro.com/g/...',
    'https://www.suruga-ya.jp/product/...'
];

$batchResult = $service->scrapeBatch($urls);
echo "成功: " . $batchResult['summary']['successful'] . "件\n";
?>
```

### JavaScript使用例

```javascript
// 初期化
const manager = new ExtendedPlatformManager('/api/extended_platform_api.php');
await manager.init();

// 単一スクレイピング
const result = await manager.scrapeUrl(
    'https://www.pokemoncenter-online.com/4521329400181.html',
    { downloadImages: true }
);

// プラットフォーム別商品取得
const products = await manager.getPlatformProducts('pokemon_center', 50, 0);

// 検索
const searchResults = await manager.searchProducts('ポケモン', 'pokemon_center', 'available');
```

### REST API使用例

```bash
# 商品スクレイピング
curl -X POST http://your-domain/api/extended_platform_api.php \
  -d "action=scrape_new_platform" \
  -d "url=https://www.pokemoncenter-online.com/4521329400181.html"

# プラットフォーム統計取得
curl "http://your-domain/api/extended_platform_api.php?action=get_supported_platforms"

# 商品検索
curl "http://your-domain/api/extended_platform_api.php?action=search_products&keyword=ポケモン&platform=pokemon_center"
```

## 🔧 カスタマイズ

### 新規プラットフォーム追加

1. `ProductionScraperBase`を継承した新しいクラスを作成
2. 必須メソッドを実装:
   - `getScraperConfig()`
   - `getPlatformName()`
   - `getTitleSelectors()`
   - `getPriceSelectors()`
   - その他の抽象メソッド

3. `ExtendedScraperFactory::createScraper()`にURL判定ロジックを追加

### セレクター調整

各プラットフォームのHTML構造が変更された場合、該当スクレイパーのセレクター配列を更新:

```php
protected function getTitleSelectors() {
    return [
        'h1.new-title-class',  // 新しいセレクター追加
        'h1.product-name',     // 既存セレクター
        // ...
    ];
}
```

## 📊 データベーススキーマ

### supplier_products テーブル

```sql
- id: INT (主キー)
- platform: VARCHAR(20) 'pokemon_center', 'yodobashi', etc.
- platform_product_id: VARCHAR(100)
- source_url: TEXT
- product_title: VARCHAR(500)
- condition_type: VARCHAR(50)
- purchase_price: DECIMAL(10,2)
- current_stock: INT
- url_status: VARCHAR(20) 'available', 'sold_out', 'dead'
- additional_data: JSON (プラットフォーム固有データ)
```

### platform_configurations テーブル

```sql
- platform: VARCHAR(20) (主キー)
- display_name: VARCHAR(100)
- base_url: VARCHAR(500)
- request_delay: INT (ミリ秒)
- max_retries: INT
```

## ⚙️ 設定

### リクエスト間隔調整

```php
protected function getScraperConfig() {
    return [
        'request_delay' => 3000,  // 3秒間隔
        'max_retries' => 5,       // 最大5回リトライ
        'timeout' => 30           // 30秒タイムアウト
    ];
}
```

### プロキシ設定（オプション）

```php
// ProductionScraperBase内
$context = stream_context_create([
    'http' => [
        'proxy' => 'tcp://proxy.example.com:8080',
        'request_fulluri' => true
    ]
]);
```

## 🐛 トラブルシューティング

### スクレイピング失敗

1. セレクターが正しいか確認
2. リクエスト間隔を長くする
3. タイムアウト時間を延長
4. エラーログ確認: `scraping_execution_logs`テーブル

### データ保存エラー

1. データベース接続確認
2. テーブル存在確認
3. 文字エンコーディング確認(UTF-8)

### 重複検出エラー

- `source_url`の正規化が正しく機能しているか確認
- `platform`値が正しく設定されているか確認

## 📈 パフォーマンス最適化

1. **バッチ処理**: 大量URLは`scrapeBatch()`を使用
2. **並行処理**: 適切な`request_delay`設定
3. **キャッシング**: 画像ダウンロードはオプション化
4. **インデックス**: データベースクエリ最適化

## 🔐 セキュリティ

1. **入力検証**: すべてのURL入力を検証
2. **SQL インジェクション対策**: プリペアドステートメント使用
3. **XSS対策**: 出力時のエスケープ処理
4. **レート制限**: アクセス頻度制限実装

## 📞 サポート

問題が発生した場合:

1. エラーログ確認: `scraping_execution_logs`
2. デバッグモード有効化
3. 既存プラットフォーム(mercari等)との動作比較

## ✅ チェックリスト

実装完了前の確認項目:

- [ ] データベースマイグレーション実行済み
- [ ] 全PHPファイル配置済み
- [ ] 各プラットフォームの動作テスト完了
- [ ] エラーハンドリング動作確認
- [ ] 在庫管理システムとの連携確認
- [ ] フロントエンドUI動作確認
- [ ] パフォーマンステスト実施

---

**バージョン**: 1.0.0  
**最終更新**: 2025-09-26  
**対応プラットフォーム**: 5 (新規) + 3 (既存) = 計8プラットフォーム