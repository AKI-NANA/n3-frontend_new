# Amazon統合システム 完全概要・フォルダマップ

## 🎯 システム全体概要

**目的**: Yahoo!オークション統合システムに Amazon PA-API を統合し、データ取得・在庫管理・商品マッチングを自動化  
**設計原則**: 既存システム完全保護 + モジュラー設計による拡張性確保  
**開発期間**: 18日間（4フェーズ）  
**技術スタック**: PHP 8.x + PostgreSQL + Vanilla JavaScript + Amazon PA-API 5.0

---

## 📁 フォルダ構造マップ

### 🏗️ 推奨統合配置
```
new_structure/
├── amazon_integration/                 # Amazon統合システム専用ディレクトリ
│   ├── api/                           # Phase 1: API基盤
│   │   ├── AmazonApiClient.php        # PA-API通信・署名・レート制限
│   │   ├── AmazonDataProcessor.php    # データ正規化・DB保存
│   │   └── config/
│   │       └── amazon_api.php         # API設定・認証情報
│   │
│   ├── monitoring/                    # Phase 2: 監視エンジン
│   │   ├── AmazonStockMonitor.php     # 在庫・価格監視
│   │   ├── scheduler.php              # Cron統合スケジューラ
│   │   └── alerts/                    # アラート・通知
│   │
│   ├── ui/                           # Phase 3: ユーザーインターフェース
│   │   ├── amazon_editor.php         # 編集UI（タブ統合型）
│   │   ├── api/
│   │   │   └── amazon_data.php       # データ操作API
│   │   └── assets/
│   │       ├── amazon.css            # Amazon専用スタイル
│   │       └── amazon.js             # Amazon専用JavaScript
│   │
│   ├── matching/                     # Phase 4: 商品マッチング
│   │   ├── ProductMatcher.php        # 自動マッチングエンジン
│   │   ├── batch_matching.php        # バッチ処理スクリプト
│   │   └── algorithms/               # マッチングアルゴリズム
│   │
│   ├── database/                     # データベース設計
│   │   ├── migrations/               # テーブル作成SQL
│   │   └── schemas/                  # スキーマ定義
│   │
│   ├── logs/                         # ログファイル
│   │   ├── amazon_api.log           # API呼び出しログ
│   │   ├── monitoring.log           # 監視ログ
│   │   └── matching.log             # マッチングログ
│   │
│   └── documentation/                # ドキュメント
│       ├── api_reference.md         # API仕様書
│       ├── deployment_guide.md      # デプロイメントガイド
│       └── troubleshooting.md       # トラブルシューティング
│
├── shared/                          # 既存共通ライブラリ（活用）
│   ├── core/
│   │   ├── Database.php            # データベース接続（既存活用）
│   │   ├── ApiResponse.php         # 統一API応答（既存活用）
│   │   └── Logger.php              # ログ管理（既存活用）
│   └── config/
│       └── database.php            # DB設定（既存活用）
│
└── 01_dashboard/ ～ 14_api_renkei/  # 既存システム（保護対象）
```

---

## 🔧 各フォルダ詳細説明

### 📡 amazon_integration/api/ - Phase 1: API基盤
**役割**: Amazon PA-API との通信基盤
```php
AmazonApiClient.php:
- PA-API 5.0 署名認証（AWS Signature v4）
- 指数関数的バックオフ（2^n秒待機）
- レート制限管理（1req/sec）
- エラーハンドリング（3回自動リトライ）

AmazonDataProcessor.php:
- JSON応答の正規化・検証
- amazon_research_data テーブル操作
- 価格変動検知（5%以上で記録）
- 在庫状況変動監視

config/amazon_api.php:
- API認証情報（環境変数から読み込み）
- レート制限設定
- バックオフ設定
- ログ・キャッシュ設定
```

### 📊 amazon_integration/monitoring/ - Phase 2: 監視エンジン
**役割**: 自動監視・アラートシステム
```php
AmazonStockMonitor.php:
- 高優先度商品（30分間隔）
- 通常商品（8時間間隔）
- 効率的SQLクエリ（last_api_check_at活用）
- 在庫切れアラート送信

scheduler.php:
- Cron統合管理
- 既存Yahoo!システム保護
- Amazon監視実行
- ヘルスチェック機能

alerts/:
- メール通知テンプレート
- Slack連携設定
- エラー閾値管理
```

### 🖥️ amazon_integration/ui/ - Phase 3: ユーザーインターフェース
**役割**: 統合編集インターフェース
```php
amazon_editor.php:
- タブ切り替え型UI（Yahoo! ⇔ Amazon）
- Chart.js価格変動グラフ
- 横断検索機能
- モーダル統合デザイン

api/amazon_data.php:
- RESTful APIエンドポイント
- CRUD操作（検索・更新・削除）
- 価格履歴API
- Yahoo!関連商品検索API

assets/:
- Amazon専用CSS（既存common.cssと統合）
- JavaScript（既存common.jsライブラリ活用）
- Chart.js統合
```

### 🤖 amazon_integration/matching/ - Phase 4: 商品マッチング
**役割**: AI駆動型自動マッチング
```php
ProductMatcher.php:
- Yahoo! ⇔ Amazon商品マッチング
- 信頼度計算（タイトル60% + ブランド30% + 価格10%）
- キーワード抽出アルゴリズム
- バッチ・リアルタイム処理

batch_matching.php:
- Cron対応バッチスクリプト
- 未マッチング商品自動処理
- ドライラン機能
- 進捗レポート生成

algorithms/:
- テキスト類似度計算
- ブランド名正規化
- 価格妥当性判定
```

### 🗄️ amazon_integration/database/ - データベース設計
**役割**: データ構造管理
```sql
migrations/:
- 001_create_amazon_research_data.sql
- 002_create_amazon_price_history.sql  
- 003_create_product_cross_reference.sql
- 004_create_indexes.sql

schemas/:
- amazon_tables_schema.sql
- relationships_diagram.sql
- performance_indexes.sql
```

---

## 🔄 データフロー全体像

### 1. データ取得フロー
```
Cron Scheduler
    ↓
AmazonStockMonitor.php
    ↓
優先度別商品抽出（SQL）
    ↓
AmazonApiClient.php（PA-API呼び出し）
    ↓
AmazonDataProcessor.php（正規化・保存）
    ↓
amazon_research_data テーブル更新
    ↓
価格変動検知 → amazon_price_history記録
```

### 2. UI操作フロー
```
amazon_editor.php（ブラウザ）
    ↓
amazon_data.php（API）
    ↓
データベース操作
    ↓
JSON応答
    ↓
JavaScript（Chart.js）
    ↓
動的UI更新
```

### 3. マッチングフロー
```
Yahoo!商品データ
    ↓
ProductMatcher.php（キーワード抽出）
    ↓
Amazon検索実行
    ↓
信頼度計算（3要素重み付け）
    ↓
product_cross_reference保存
    ↓
UI表示・分析
```

---

## 🚀 デプロイメント手順

### 1. ディレクトリ作成
```bash
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure
mkdir -p amazon_integration/{api/{config},monitoring/alerts,ui/{api,assets},matching/algorithms,database/{migrations,schemas},logs,documentation}
```

### 2. ファイル配置
```
amazon_integration/api/AmazonApiClient.php
amazon_integration/api/AmazonDataProcessor.php  
amazon_integration/api/config/amazon_api.php
amazon_integration/monitoring/AmazonStockMonitor.php
amazon_integration/monitoring/scheduler.php
amazon_integration/ui/amazon_editor.php
amazon_integration/ui/api/amazon_data.php
amazon_integration/matching/ProductMatcher.php
amazon_integration/matching/batch_matching.php
```

### 3. データベースセットアップ
```sql
-- amazon_integration/database/migrations/ 内のSQLを順次実行
psql -d yahoo_auction_db -f 001_create_amazon_research_data.sql
psql -d yahoo_auction_db -f 002_create_amazon_price_history.sql
psql -d yahoo_auction_db -f 003_create_product_cross_reference.sql
```

### 4. Cron設定
```bash
# /etc/crontab または crontab -e
*/30 * * * * php /path/to/amazon_integration/monitoring/scheduler.php --amazon --high-priority
0 */8 * * * php /path/to/amazon_integration/monitoring/scheduler.php --amazon --normal-priority
0 2 * * * php /path/to/amazon_integration/matching/batch_matching.php --limit=100
```

---

## 🔧 設定ファイル構成

### environment変数 (.env)
```env
# Amazon PA-API
AMAZON_ACCESS_KEY=AKIA...
AMAZON_SECRET_KEY=xxxxx
AMAZON_PARTNER_TAG=your-tag
AMAZON_MARKETPLACE=www.amazon.com

# データベース（既存活用）
DB_HOST=localhost
DB_NAME=yahoo_auction_db
DB_USER=postgres
DB_PASS=password
```

### amazon_api.php 主要設定
```php
'rate_limits' => [
    'requests_per_second' => 1,
    'max_requests_per_day' => 8640,
    'retry_max_attempts' => 3
],
'monitoring' => [
    'high_priority_interval' => 1800,  // 30分
    'normal_priority_interval' => 28800, // 8時間
    'price_threshold' => 5.0 // 5%変動で記録
]
```

---

## 📊 データベーステーブル構造

### amazon_research_data（商品マスター）
```sql
asin VARCHAR(10) UNIQUE          -- Amazon商品ID
title TEXT                       -- 商品タイトル
current_price DECIMAL(10,2)      -- 現在価格
price_min/max DECIMAL(10,2)      -- 価格履歴最低/最高
current_stock_status VARCHAR(20) -- 在庫状況
is_prime BOOLEAN                 -- プライム対象
product_images JSONB             -- 画像URL配列
price_fluctuation_count INTEGER  -- 変動回数
is_high_priority BOOLEAN         -- 監視優先度
last_api_check_at TIMESTAMP      -- 最終確認日時
```

### amazon_price_history（価格履歴）
```sql
asin VARCHAR(10)                 -- 商品ASIN
price DECIMAL(10,2)              -- 記録時価格
change_percentage DECIMAL(5,2)   -- 変動率
stock_status VARCHAR(20)         -- 在庫状況
change_trigger VARCHAR(50)       -- 変動トリガー
recorded_at TIMESTAMP            -- 記録日時
```

### product_cross_reference（マッチング）
```sql
yahoo_product_id INTEGER         -- Yahoo!商品ID
amazon_asin VARCHAR(10)          -- Amazon ASIN
match_confidence DECIMAL(3,2)    -- マッチング信頼度
match_type VARCHAR(20)           -- マッチタイプ
```

---

## ⚡ パフォーマンス仕様

### API制限対応
- **レート制限**: 1秒間隔厳守
- **日次制限**: 8,640リクエスト以内
- **リトライ**: 指数関数的バックオフ（2^n秒）
- **エラー率**: 1%以下目標

### 監視性能
- **高優先度**: 30分間隔、50商品/回
- **通常優先度**: 8時間間隔、30商品/回
- **変動検知**: 5%以上で即座記録
- **応答時間**: 平均30秒以内

### UI性能
- **ページ読み込み**: 2秒以内
- **検索応答**: 1秒以内
- **グラフ描画**: 500ms以内
- **同時アクセス**: 10ユーザー対応

---

## 🛡️ セキュリティ対策

### API セキュリティ
```php
// CSRF トークン検証
if ($token !== $_SESSION['csrf_token']) {
    throw new Exception('CSRF token invalid');
}

// 入力検証
private function validateAsin($asin) {
    return preg_match('/^[A-Z0-9]{10}$/', $asin);
}

// SQLインジェクション対策
$stmt = $this->db->prepare("SELECT * FROM amazon_research_data WHERE asin = ?");
```

### データ保護
- **環境変数**: 機密情報の外部化
- **ログマスキング**: APIキーの自動マスク
- **アクセス制御**: IPアドレス制限
- **暗号化**: 通信データTLS 1.3

---

## 📈 監視・運用指標

### システム健全性
```bash
# ヘルスチェック
php amazon_integration/monitoring/scheduler.php --health-check

# 統計情報
php amazon_integration/monitoring/scheduler.php --stats

# ログ監視
tail -f amazon_integration/logs/amazon_api.log
```

### KPI目標値
- **API成功率**: 99%以上
- **データ更新遅延**: 30秒以内
- **価格変動検知**: 95%以上
- **マッチング精度**: 80%以上
- **システム稼働率**: 99.9%以上

---

## 🔧 トラブルシューティング

### よくある問題
1. **API制限超過**: スケジューラ間隔調整
2. **マッチング精度低下**: アルゴリズム閾値調整
3. **メモリ不足**: バッチサイズ縮小
4. **DB接続エラー**: 接続プール設定確認

### ログファイル確認箇所
```bash
# API エラー
grep "ERROR" amazon_integration/logs/amazon_api.log

# 監視エラー  
grep "WARNING\|ERROR" amazon_integration/logs/monitoring.log

# マッチングエラー
grep "FAIL" amazon_integration/logs/matching.log
```

---

## 🚀 今後の拡張計画

### 短期（3ヶ月）
- 複数マーケットプレイス対応（UK, DE, CA）
- Machine Learning価格予測モデル
- 高度アラート設定

### 中期（6ヶ月）
- 自動出品候補提案システム
- 競合他社価格比較
- ダイナミック価格設定

### 長期（1年）
- AI駆動型マーケット分析
- 多チャンネル在庫統合
- 予測分析ダッシュボード

---

**このマップに従って開発・運用することで、Amazon統合システムの全体像を常に把握でき、効率的な開発・保守が可能になります。**