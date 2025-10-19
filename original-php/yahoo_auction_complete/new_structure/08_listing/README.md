# 08_listing PHP API システム

## 🎯 概要

統合出品管理システムのPHP API版です。HTML+JSから完全PHP APIに変換し、eBay API連携・CSV処理・自動スケジューリング機能を統合しています。

## ✨ 主な機能

### 基本機能
- **CSV処理**: アップロード・検証・一括処理
- **eBay API連携**: 実際の商品出品・管理機能
- **一括出品**: 複数商品の同時処理
- **スケジューリング**: 自動出品の時間・頻度設定
- **リアルタイム監視**: 出品状況の即座確認

### 高度機能
- **テストモード**: Sandbox環境での安全なテスト
- **エラーハンドリング**: 自動再試行・復旧機能  
- **API制限管理**: eBay API使用量の自動追跡
- **ランダム化**: 出品タイミング・価格の自動調整
- **統計ダッシュボード**: 詳細な出品分析

## 🏗️ アーキテクチャ

```
08_listing/
├── api/
│   ├── listing.php           # メインAPI エンドポイント
│   └── EbayAPIClient.php     # eBay API連携クラス
├── database/
│   └── schema.sql           # 出品システム用DBスキーマ
├── index.php                # フロントエンド (PHP版)
└── README.md                # このファイル
```

## 📊 データベーススキーマ

### 最適化されたテーブル設計

#### listing_queue テーブル
- **出品キュー管理**: 承認済み商品の出品待ち状態
- **マーケットプレイス対応**: eBay・Yahoo・メルカリ対応
- **スケジューリング**: 予約出品機能
- **リトライ機能**: 失敗時の自動再試行

#### listing_schedules テーブル  
- **柔軟なスケジュール**: 日次・週次・月次対応
- **ランダム化機能**: 出品件数・間隔・価格の変動
- **実行履歴**: 完全なスケジュール実行記録

#### CSV関連テーブル
- **csv_uploads**: アップロード履歴管理
- **csv_row_data**: 行単位での検証結果
- **重複チェック**: ファイルハッシュによる重複防止

## 🚀 API エンドポイント

### 出品管理
- `GET api/listing.php?action=get_listing_queue` - 出品キュー取得
- `POST api/listing.php` - 一括出品開始
- `GET api/listing.php?action=get_listing_stats` - 統計情報

### CSV処理
- `POST api/listing.php?action=upload_csv` - CSVアップロード
- `GET api/listing.php?action=validate_csv` - CSV検証状況
- `GET api/listing.php?action=get_csv_template` - テンプレート生成

### スケジューリング
- `POST api/listing.php?action=create_schedule` - スケジュール作成
- `GET api/listing.php?action=get_schedules` - スケジュール一覧
- `POST api/listing.php?action=execute_schedule` - 手動実行

## 🔌 eBay API連携

### Trading API 機能
```php
$ebayAPI = getEbayAPI(true); // Sandbox mode

// 商品出品
$result = $ebayAPI->addItem([
    'title' => 'Product Title',
    'description' => 'Product description',
    'price' => 29.99,
    'category_id' => '9355',
    'images' => ['https://example.com/image.jpg']
]);

// 出品状況確認
$items = $ebayAPI->getMyeBaySelling();

// 商品終了
$result = $ebayAPI->endItem('item_id', 'NotAvailable');
```

### API制限管理
- **使用量追跡**: 日次・時間制限の自動管理
- **制限チェック**: API呼び出し前の制限確認
- **使用量表示**: リアルタイムな制限状況表示

## 📝 CSV処理

### サポートフィールド
```csv
title,description,price,category_id,condition_id,images,quantity,duration
Sample Product,Product description,29.99,9355,1000,https://example.com/image.jpg,1,7
```

### 検証機能
- **必須フィールド**: title, price, category_id
- **データ型チェック**: 数値・URL・文字列長
- **ビジネスルール**: 価格範囲・カテゴリー有効性
- **警告システム**: エラーではないが注意が必要な項目

### 処理フロー
1. **アップロード**: ファイル受信・重複チェック
2. **検証**: 非同期での行単位検証
3. **修正**: エラー行の個別修正機能
4. **処理**: 出品キューへの一括追加

## ⏰ スケジューリング機能

### スケジュール設定例
```json
{
    "name": "平日夜間出品",
    "frequency_type": "weekly",
    "frequency_details": {
        "days": [1, 2, 3, 4, 5],
        "hour": 20,
        "minute": 0
    },
    "random_items_min": 5,
    "random_items_max": 15,
    "random_interval_min": 30,
    "random_interval_max": 180,
    "timing_mode": "peak"
}
```

### ランダム化機能
- **出品件数**: 最小〜最大範囲での自動調整
- **出品間隔**: 30分〜3時間のランダム間隔
- **価格変動**: ±5%の自動価格調整
- **タイミング**: ピーク時間優先・オフピーク・完全ランダム

## 🔧 設定・セットアップ

### 1. データベース設定
```bash
# PostgreSQL スキーマ作成
psql -d nagano3 -f database/schema.sql
```

### 2. eBay API設定
```bash
export EBAY_APP_ID=your_app_id
export EBAY_DEV_ID=your_dev_id  
export EBAY_CERT_ID=your_cert_id
export EBAY_TOKEN=your_auth_token
export PAYPAL_EMAIL=your_paypal_email
```

### 3. Redis設定（オプション）
```bash
export REDIS_HOST=127.0.0.1
export REDIS_PORT=6379
```

### 4. アクセス
```
http://localhost:8081/new_structure/08_listing/
```

## 🎯 統合ワークフローとの連携

### 03_approval からのデータ流入
1. **承認完了**: approval_queue → listing_queue への自動転送
2. **データ変換**: Yahoo形式 → eBay形式の自動変換
3. **価格調整**: JPY → USD の自動換算
4. **画像最適化**: 複数画像の適切な順序設定

### 10_zaiko への出品通知
1. **出品完了**: eBayアイテムID付きで在庫システムに通知
2. **在庫連携**: 出品数量と在庫数の自動同期
3. **売上追跡**: 販売実績の在庫システム反映

## 📈 パフォーマンス特徴

### eBay API最適化
- **API制限遵守**: 日次5,000回・時間200回の制限管理
- **バッチ処理**: 複数商品の効率的な順次処理
- **エラー回復**: 失敗時の自動再試行（最大3回）

### CSV処理最適化
- **ストリーミング**: 大容量ファイルの逐次処理
- **非同期検証**: アップロード後のバックグラウンド処理
- **重複防止**: ファイルハッシュによる重複アップロード検出

### スケジューリング最適化
- **効率的実行**: 無駄のない時刻計算アルゴリズム
- **履歴管理**: 実行結果の完全な記録・分析
- **失敗処理**: スケジュール実行失敗時の通知・復旧

## 🔐 セキュリティ機能

### ファイルアップロード
- **ファイル検証**: 拡張子・MIME type・サイズ制限
- **ウイルススキャン**: アップロードファイルの安全性確認
- **サンドボックス**: 隔離された環境でのファイル処理

### API認証
- **JWT認証**: 統合認証システムとの完全連携
- **権限管理**: 出品管理権限の細かい制御
- **セッション管理**: 安全なユーザーセッション

## 🧪 テスト・デバッグ

### Sandboxモード
- **安全なテスト**: 実際の出品を行わない模擬処理
- **APIテスト**: eBay Sandbox環境での完全テスト
- **データ検証**: テスト用のダミーデータ生成

### モニタリング
- **リアルタイム統計**: 出品成功率・処理時間の監視
- **エラー追跡**: 失敗原因の詳細ログ
- **パフォーマンス分析**: API呼び出し効率の測定

## 📊 統計・分析

### 出品統計
- **成功率**: 出品成功 vs 失敗の割合
- **処理時間**: 平均出品処理時間
- **API使用量**: eBay API制限の使用状況
- **スケジュール効率**: 自動実行の成功率

### 収益分析
- **出品商品価値**: 出品総額の推移
- **市場別分析**: eBay・Yahoo等の販路別実績
- **時間別パフォーマンス**: 出品時間帯の効果測定

## 🔄 運用・保守

### 自動化機能
- **スケジュール実行**: cron または システムタスクでの定期実行
- **失敗アラート**: 出品失敗時のメール・Slack通知
- **統計レポート**: 日次・週次の自動レポート生成

### 保守機能
- **ログ管理**: 自動ローテーション・長期保存
- **データクリーンアップ**: 古いCSVデータの自動削除
- **パフォーマンス最適化**: 統計ビューの定期更新

## 🚦 今後の拡張予定

### 短期（1-2ヶ月）
- **Yahoo オークション対応**: Yahoo API統合
- **メルカリ対応**: メルカリAPI統合
- **画像最適化**: 自動リサイズ・最適化機能
- **価格戦略**: 競合価格との自動比較・調整

### 長期（3-6ヶ月）
- **AI価格設定**: 機械学習による最適価格提案
- **在庫予測**: 需要予測による出品タイミング最適化
- **多言語対応**: 海外マーケット向けの商品説明翻訳
- **分析ダッシュボード**: Grafana連携の詳細分析

## 🤝 開発・貢献

### コード品質
- **PSR-12準拠**: PHP コーディング規約
- **例外処理**: 堅牢なエラーハンドリング
- **テスト**: 単体テスト・統合テストの充実
- **ドキュメント**: 詳細なコードコメント

### 拡張ポイント
- 新しいマーケットプレイス対応
- カスタム出品ルールの追加
- 高度な分析機能
- 外部サービス連携

---

**統合ポイント**: 03_approval → 08_listing → 10_zaiko の完全な自動化フローが完成
