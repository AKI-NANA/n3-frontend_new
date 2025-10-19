# 価格・利益計算システム開発指示書・技術仕様書

## 📋 システム概要

### プロジェクト名
**Yahoo Auction Tool - 拡張版価格・利益計算システム**

### バージョン
**2.0.0**（2025年9月17日リリース）

### 目的
輸出転売ビジネスにおける複雑な価格計算を自動化し、eBayカテゴリー別手数料、為替変動、階層型利益率設定を統合した高精度な価格計算システムを提供する。

### 対象ユーザー
- 輸出転売事業者
- eBay・Yahoo Auction間での転売業務従事者
- 価格戦略の最適化を求める事業者

---

## 🎯 システム構成と技術スタック

### フロントエンド
- **HTML5/CSS3**: レスポンシブデザイン対応
- **JavaScript (ES6+)**: 動的UI制御、リアルタイム計算
- **Font Awesome 6.0**: アイコンライブラリ

### バックエンド
- **PHP 8.0+**: サーバーサイド処理
- **PostgreSQL 13+**: メインデータベース
- **PDO**: データベース接続層

### 外部API
- **Open Exchange Rates API**: 為替レート自動取得
- **eBay API**: カテゴリー情報連携（将来的）

### インフラ
- **Cron**: 定期実行タスク（為替レート更新、価格調整）
- **ログ管理**: システムログ、エラートラッキング

---

## 🗄️ データベース設計

### 1. ebay_categories（eBayカテゴリー情報）
```sql
CREATE TABLE ebay_categories (
    category_id INT PRIMARY KEY,           -- eBayカテゴリーID
    category_name VARCHAR(255) NOT NULL,   -- カテゴリー名
    final_value_fee DECIMAL(5,2) NOT NULL, -- ファイナルバリューフィー(%)
    insertion_fee DECIMAL(5,2) NOT NULL,   -- 出品手数料(USD)
    store_final_value_fee DECIMAL(5,2),    -- ストア手数料(%)
    category_path TEXT,                     -- カテゴリーパス
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**役割**: eBayカテゴリー取得ツールと連携し、カテゴリーごとの手数料率を一元管理

### 2. profit_settings（階層型利益率設定）
```sql
CREATE TABLE profit_settings (
    id SERIAL PRIMARY KEY,
    setting_type VARCHAR(50) NOT NULL,     -- 'global', 'category', 'condition', 'period'
    target_value VARCHAR(100) NOT NULL,    -- 対象値（カテゴリーID、コンディション名等）
    profit_margin_target DECIMAL(5,2) NOT NULL, -- 目標利益率(%)
    minimum_profit_amount DECIMAL(8,2) NOT NULL, -- 最低利益額(USD)
    maximum_price_usd DECIMAL(10,2),       -- 最大販売価格制限
    priority_order INT NOT NULL DEFAULT 999, -- 適用優先順位
    active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**適用優先順位**: period（期間） > condition（コンディション） > category（カテゴリー） > global（グローバル）

### 3. exchange_rates（為替レート履歴）
```sql
CREATE TABLE exchange_rates (
    id SERIAL PRIMARY KEY,
    currency_from VARCHAR(3) NOT NULL DEFAULT 'JPY',
    currency_to VARCHAR(3) NOT NULL DEFAULT 'USD',
    rate DECIMAL(10, 6) NOT NULL,          -- 基本為替レート
    safety_margin DECIMAL(5,2) NOT NULL DEFAULT 5.00, -- 安全マージン(%)
    calculated_rate DECIMAL(10,6) NOT NULL, -- マージン適用後レート
    source VARCHAR(50) DEFAULT 'Open Exchange Rates',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**計算式**: calculated_rate = rate × (1 + safety_margin/100)

### 4. price_adjustment_rules（価格調整ルール）
```sql
CREATE TABLE price_adjustment_rules (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES ebay_categories(category_id),
    condition_type VARCHAR(50),            -- 商品コンディション
    days_since_listing INT NOT NULL,      -- 出品からの経過日数
    adjustment_type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed_amount'
    adjustment_value DECIMAL(8,2) NOT NULL, -- 調整値
    min_price_limit DECIMAL(8,2),         -- 最低価格制限
    max_applications INT DEFAULT NULL,     -- 適用回数上限
    active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 5. profit_calculations（計算履歴）
```sql
CREATE TABLE profit_calculations (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,        -- 商品ID
    category_id INT REFERENCES ebay_categories(category_id),
    item_condition VARCHAR(50),           -- 商品コンディション
    days_since_listing INT DEFAULT 0,     -- 出品からの経過日数
    
    -- 入力データ
    price_jpy DECIMAL(10,2) NOT NULL,     -- 商品価格(円)
    shipping_jpy DECIMAL(8,2) DEFAULT 0,  -- 送料(円)
    
    -- 計算に使用した設定
    exchange_rate DECIMAL(10,6) NOT NULL, -- 使用した為替レート
    safety_margin DECIMAL(5,2) NOT NULL,  -- 適用した安全マージン
    profit_margin_target DECIMAL(5,2) NOT NULL, -- 目標利益率
    minimum_profit_amount DECIMAL(8,2) NOT NULL, -- 最低利益額
    
    -- eBay手数料
    final_value_fee_percent DECIMAL(5,2) NOT NULL, -- FVF率
    insertion_fee_usd DECIMAL(5,2) NOT NULL,       -- 出品手数料
    
    -- 計算結果
    total_cost_jpy DECIMAL(10,2) NOT NULL,      -- 総コスト(円)
    total_cost_usd DECIMAL(10,2) NOT NULL,      -- 総コスト(USD)
    recommended_price_usd DECIMAL(10,2) NOT NULL, -- 推奨販売価格(USD)
    estimated_profit_usd DECIMAL(10,2) NOT NULL,  -- 予想利益(USD)
    actual_profit_margin DECIMAL(5,2) NOT NULL,   -- 実際の利益率
    roi DECIMAL(5,2) NOT NULL,                    -- ROI
    
    -- メタデータ
    calculation_type VARCHAR(50) DEFAULT 'standard',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 6. system_settings（システム設定）
```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 コアクラス仕様

### PriceCalculator クラス
**ファイル**: `classes/PriceCalculator.php`

#### 主要メソッド

##### `getCalculatedExchangeRate($custom_safety_margin = null)`
- **目的**: 安全マージン適用済み為替レートを取得
- **戻り値**: 
```php
[
    'base_rate' => float,        // 基本レート
    'safety_margin' => float,    // 安全マージン(%)
    'calculated_rate' => float,  // 計算用レート
    'recorded_at' => string      // 記録日時
]
```

##### `getProfitSettings($itemId, $categoryId, $condition, $daysSinceListing)`
- **目的**: 階層型設定から適用すべき利益率設定を取得
- **優先順位**: period > condition > category > global
- **戻り値**: 利益率設定配列

##### `getEbayCategoryFees($categoryId)`
- **目的**: eBayカテゴリー別手数料情報を取得
- **戻り値**: 
```php
[
    'category_name' => string,
    'final_value_fee' => float,      // FVF率(%)
    'insertion_fee' => float,        // 出品手数料(USD)
    'store_final_value_fee' => float // ストア手数料(%)
]
```

##### `calculateFinalPrice($itemData)`
- **目的**: 全要素を考慮した最終価格計算
- **入力**: 
```php
[
    'id' => string,              // 商品ID
    'price_jpy' => float,        // 商品価格(円)
    'shipping_jpy' => float,     // 送料(円)
    'category_id' => int,        // カテゴリーID
    'condition' => string,       // コンディション
    'days_since_listing' => int  // 出品経過日数
]
```

#### 価格計算アルゴリズム
```
1. 総コスト(JPY) = 商品価格 + 送料
2. 総コスト(USD) = 総コスト(JPY) × 計算用為替レート
3. 目標利益(USD) = MAX(総コスト(USD) × 目標利益率, 最低利益額)
4. 最終価格(USD) = (総コスト(USD) + 出品手数料 + 目標利益) ÷ (1 - FVF率)
5. 実利益 = 最終価格 - 総コスト - 全手数料
6. 利益率 = 実利益 ÷ 最終価格 × 100
7. ROI = 実利益 ÷ 総コスト × 100
```

---

## ⚙️ 自動化システム

### cronジョブ: daily_tasks.php
**実行スケジュール**: 毎日午前6時
```bash
0 6 * * * cd /path/to/project && php cron/daily_tasks.php
```

#### 実行タスク

##### 1. 為替レート自動更新（ExchangeRateUpdater）
- Open Exchange Rates APIから最新レートを取得
- 安全マージンを適用した計算用レートを生成
- APIが利用不可の場合はフォールバック処理
- 30日以上古いレートデータを自動削除

##### 2. 価格自動調整（PriceAdjuster）
- price_adjustment_rulesに基づく価格調整
- 出品期間に応じた段階的価格変更
- 最低価格制限の適用
- 調整回数制限の管理

##### 3. システム統計更新（SystemStatsUpdater）
- 日次統計の計算と保存
- 90日以上古い計算履歴の削除
- システム設定の最適化提案

---

## 🖥️ ユーザーインターフェース

### メイン画面構成
**ファイル**: `riekikeisan.php`

#### 1. 高度計算タブ
- **商品情報入力**: ID、価格、送料、カテゴリー、コンディション、経過日数
- **設定表示**: 現在の為替レート、安全マージン、カテゴリー手数料、目標利益率
- **計算結果表示**: 推奨価格、予想利益、利益率、ROI、総手数料
- **推奨事項**: 計算結果に基づく自動生成アドバイス

#### 2. 設定管理タブ
- **利益率設定**: タイプ（global/category/condition/period）別設定
- **設定一覧**: 既存設定の表示・編集・無効化
- **優先順位管理**: 設定適用順序の制御

#### 3. 計算履歴タブ
- **履歴表示**: 過去の計算結果一覧
- **フィルタリング**: 商品ID、日付範囲による絞り込み
- **CSV出力**: 計算データのエクスポート機能

#### 4. ROI分析タブ
- **カテゴリー別分析**: カテゴリーごとの収益性比較
- **コンディション別分析**: 商品状態別の利益率傾向
- **期間別トレンド**: 時系列での収益性変化

#### 5. 価格シミュレーションタブ
- **利益率変動シミュレーション**: 異なる利益率での価格比較
- **為替マージン影響**: マージン変更による価格変動
- **シナリオ比較**: 複数条件での最適価格提案

---

## 🔌 API仕様

### 内部API エンドポイント

#### `POST /riekikeisan.php`
```json
{
    "action": "calculate_advanced_profit",
    "id": "商品ID",
    "price_jpy": 10000,
    "shipping_jpy": 800,
    "category_id": 293,
    "condition": "Used",
    "days_since_listing": 15
}
```

**レスポンス**:
```json
{
    "success": true,
    "data": {
        "item_id": "商品ID",
        "calculation_timestamp": "2025-09-17 10:30:00",
        "input_data": {...},
        "calculation_settings": {...},
        "results": {
            "total_cost_usd": 75.50,
            "recommended_price_usd": 120.00,
            "estimated_profit_usd": 32.15,
            "actual_profit_margin": 26.79,
            "roi": 42.58,
            "total_fees_usd": 12.35
        },
        "recommendations": ["適切な利益率です。この価格設定を維持することをお勧めします。"]
    },
    "message": "高度利益計算完了"
}
```

#### その他のエンドポイント
- `GET /riekikeisan.php?action=get_category_fees&category_id=293`
- `GET /riekikeisan.php?action=get_exchange_rate`
- `POST /riekikeisan.php` (action: save_profit_settings)
- `GET /riekikeisan.php?action=get_calculation_history`
- `GET /riekikeisan.php?action=analyze_roi_advanced`
- `GET /riekikeisan.php?action=export_calculations`

---

## 🔗 外部システム連携

### 1. eBayカテゴリー取得ツール連携
**連携方式**: データベース直接連携
- カテゴリー取得ツールがebay_categoriesテーブルに手数料情報を保存
- 利益計算システムが最新の手数料情報を自動取得
- カテゴリー情報の更新通知機能

### 2. 商品管理システム連携
**連携テーブル**: mystical_japan_treasures_inventory
- 商品情報の自動取得
- 計算結果の販売価格自動反映
- 出品ステータスとの連動

### 3. 送料計算ツール連携
**データ連携**: shipping_jpyフィールド
- 送料計算ツールの結果を利益計算に自動組み込み
- 配送方法別の送料情報取得

---

## 📊 設定例とベストプラクティス

### 利益率設定例
```sql
-- グローバル設定（デフォルト）
INSERT INTO profit_settings (setting_type, target_value, profit_margin_target, minimum_profit_amount, priority_order) 
VALUES ('global', 'default', 25.00, 5.00, 999);

-- カテゴリー別設定（エレクトロニクス）
INSERT INTO profit_settings (setting_type, target_value, profit_margin_target, minimum_profit_amount, priority_order) 
VALUES ('category', '293', 30.00, 8.00, 100);

-- コンディション別設定（中古品）
INSERT INTO profit_settings (setting_type, target_value, profit_margin_target, minimum_profit_amount, priority_order) 
VALUES ('condition', 'Used', 20.00, 3.00, 200);

-- 期間別設定（30日経過後）
INSERT INTO profit_settings (setting_type, target_value, profit_margin_target, minimum_profit_amount, priority_order) 
VALUES ('period', '30', 15.00, 2.00, 50);
```

### 価格調整ルール例
```sql
-- エレクトロニクス中古品：30日後5%値下げ
INSERT INTO price_adjustment_rules (category_id, condition_type, days_since_listing, adjustment_type, adjustment_value, min_price_limit) 
VALUES (293, 'Used', 30, 'percentage', -5.00, 10.00);

-- ファッション新品：45日後3%値下げ
INSERT INTO price_adjustment_rules (category_id, condition_type, days_since_listing, adjustment_type, adjustment_value, min_price_limit) 
VALUES (11450, 'New', 45, 'percentage', -3.00, 15.00);
```

### システム設定例
```sql
-- Open Exchange Rates APIキー
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) 
VALUES ('exchange_api_key', 'your_api_key_here', 'string', 'Open Exchange Rates APIキー');

-- デフォルト安全マージン
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) 
VALUES ('default_safety_margin', '5.0', 'number', 'デフォルト為替安全マージン(%)');

-- 価格更新頻度
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) 
VALUES ('price_update_frequency', '24', 'number', '価格自動更新頻度(時間)');
```

---

## 🛠️ インストール・セットアップ手順

### 1. データベースセットアップ
```bash
# PostgreSQLにスキーマを作成
psql -U your_user -d your_database -f artifacts/database_schema.sql
```

### 2. ファイル配置
```
new_structure/
├── 10_riekikeisan/
│   ├── riekikeisan.php          # メインUI
│   └── README.md
├── classes/
│   └── PriceCalculator.php      # コアクラス
├── cron/
│   └── daily_tasks.php          # 自動化スクリプト
└── logs/
    ├── cron.log                 # cronログ
    └── system.log               # システムログ
```

### 3. 権限設定
```bash
# ログディレクトリの書き込み権限
chmod 755 logs/
chmod 666 logs/*.log

# cronスクリプトの実行権限
chmod +x cron/daily_tasks.php
```

### 4. cronジョブ設定
```bash
# crontabに追加
crontab -e

# 以下を追加
0 6 * * * cd /path/to/your/project && php cron/daily_tasks.php >> logs/cron.log 2>&1
```

### 5. 初期設定
```sql
-- Open Exchange Rates APIキーの設定
UPDATE system_settings SET setting_value = 'your_actual_api_key' WHERE setting_key = 'exchange_api_key';

-- 初回為替レート取得の実行
php cron/daily_tasks.php
```

---

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. 為替レート取得エラー
**症状**: 「為替レートが取得できません」エラー
**原因**: APIキー未設定、API制限、ネットワーク問題
**解決**: 
```sql
-- APIキー確認
SELECT setting_value FROM system_settings WHERE setting_key = 'exchange_api_key';
-- ログ確認
tail -f logs/cron.log
```

#### 2. 計算結果が異常
**症状**: 推奨価格が極端に高い/低い
**原因**: 利益率設定の競合、カテゴリー手数料の誤設定
**解決**: 
```sql
-- 適用設定の確認
SELECT * FROM profit_settings WHERE active = TRUE ORDER BY priority_order;
-- カテゴリー手数料の確認
SELECT * FROM ebay_categories WHERE category_id = ?;
```

#### 3. 価格自動調整が動作しない
**症状**: 価格調整ルールが適用されない
**原因**: cronジョブ未実行、商品テーブル連携不備
**解決**: 
```bash
# cronジョブの実行確認
crontab -l
# 手動実行テスト
php cron/daily_tasks.php
```

---

## 📈 パフォーマンス最適化

### インデックス戦略
```sql
-- 頻繁にアクセスされるカラムにインデックス作成済み
CREATE INDEX idx_profit_calculations_item_id ON profit_calculations(item_id);
CREATE INDEX idx_exchange_rates_recorded_at ON exchange_rates(recorded_at DESC);
CREATE INDEX idx_profit_settings_type_value ON profit_settings(setting_type, target_value);
```

### クエリ最適化
- ビューの活用（latest_exchange_rate）
- プリペアドステートメントの使用
- 結果セットサイズの制限

### キャッシュ戦略
- 為替レートの1日1回更新
- カテゴリー手数料のメモリキャッシュ
- 計算結果の一時保存

---

## 🔒 セキュリティ考慮事項

### 入力値検証
- SQLインジェクション対策（PDOプリペアドステートメント）
- XSS対策（HTML出力時のエスケープ）
- CSRF対策（トークン検証）

### データ保護
- 機密データの暗号化（APIキー）
- アクセスログの記録
- データベース接続の暗号化

### 権限管理
- 最小権限の原則
- APIアクセス制限
- ログファイルの適切な権限設定

---

## 📝 開発・保守ガイドライン

### コーディング規約
- PSR-12準拠のPHPコーディングスタイル
- 関数・クラスのドキュメンテーション
- エラーハンドリングの統一

### テスト戦略
- 単体テスト（PHPUnit）
- 統合テスト（API エンドポイント）
- パフォーマンステスト（大量データ処理）

### 監視・アラート
- システムログの定期確認
- 為替レート取得失敗の通知
- 異常な計算結果の検出

### バックアップ戦略
- データベースの日次バックアップ
- 設定ファイルのバージョン管理
- 計算履歴の長期保存

---

## 🚀 今後の拡張予定

### Phase 2 機能
- AIによる価格最適化提案
- 競合他社価格との比較機能
- 売上実績との連携分析

### Phase 3 機能
- モバイルアプリ対応
- リアルタイム価格更新
- 多通貨対応

### システム改善
- GraphQL API導入
- マイクロサービス化
- クラウドネイティブ対応

---

## 📞 サポート・連絡先

### 技術サポート
- **開発者**: Claude AI Assistant
- **ドキュメント**: 本仕様書
- **ログ確認**: `logs/system.log`, `logs/cron.log`

### 緊急時対応
1. システムログの確認
2. データベース接続の確認
3. cronジョブの実行状況確認
4. APIキー・設定の確認

---

## 📋 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2025-09-17 | 初回リリース - 全機能実装完了 | Claude |
| 1.0.0 | 2025-09-13 | 基本利益計算機能 | 既存システム |

---

**このドキュメントは、システムの理解・保守・拡張時の参考資料として活用してください。**