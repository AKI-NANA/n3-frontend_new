# 🧪 n3-frontend 完全機能テストガイド

**テスト日**: 2025年11月3日  
**環境**: Macローカル開発環境  
**目的**: 全機能の動作確認

---

## 📋 テスト準備

### 1. サーバー起動

```bash
cd /Users/aritahiroaki/n3-frontend_new

# 開発サーバー起動
npm run dev

# ブラウザで開く
open http://localhost:3000
```

### 2. ログイン確認

```
URL: http://localhost:3000/login
```

- [ ] ログイン画面が表示される
- [ ] 認証情報でログインできる
- [ ] ダッシュボードにリダイレクトされる

---

## 🎯 機能別テストチェックリスト

### A. 在庫・価格監視システム (`/inventory-monitoring`)

#### A-1. デフォルト設定タブ

```
URL: http://localhost:3000/inventory-monitoring
タブ: デフォルト設定
```

**テスト項目**:
- [ ] 監視頻度の選択肢が表示される
  - 2時間ごと
  - 6時間ごと
  - 12時間ごと
  - 1日1回
- [ ] 在庫切れ時の価格設定オプション
  - 0円に設定
  - 維持
  - 非公開
- [ ] 最小利益額（USD）の設定
- [ ] Yahoo Auctionソース設定
  - SellerMirror優先
  - 商品URL直接
  - 両方使用
- [ ] 設定保存ボタンが動作する

**確認方法**:
```bash
# API直接テスト
curl -X GET "http://localhost:3000/api/inventory-monitoring/schedule" | jq .
```

#### A-2. 統合変動管理タブ

```
URL: http://localhost:3000/inventory-monitoring
タブ: 統合変動管理
```

**テスト項目**:
- [ ] 監視対象商品一覧が表示される
- [ ] 商品追加ボタンが動作する
- [ ] フィルター機能
  - ステータスフィルター（アクティブ/非アクティブ）
  - 変動検知フィルター（価格変動/在庫変動）
  - マーケットプレイスフィルター
- [ ] ソート機能
  - 最終チェック日時
  - 変動回数
  - 商品名
- [ ] 個別商品設定の変更
  - 監視頻度の個別設定
  - 在庫切れ時の動作
  - 最小利益額
- [ ] 一括操作
  - 選択した商品の監視開始/停止
  - 選択した商品の設定変更

**データベース確認**:
```sql
-- Supabase SQL Editor
SELECT 
  id,
  product_name,
  monitoring_enabled,
  check_frequency,
  last_checked_at,
  change_count
FROM monitored_products
ORDER BY last_checked_at DESC
LIMIT 10;
```

#### A-3. 今すぐ監視実行

```
URL: http://localhost:3000/inventory-monitoring
```

**テスト項目**:
- [ ] 「今すぐ監視実行」ボタンをクリック
- [ ] 実行中のローディング表示
- [ ] 進捗状況の表示
  - 処理中の商品数
  - 検知された変動数
- [ ] 完了後のサマリー表示
  - 総チェック数
  - 価格変動検知数
  - 在庫変動検知数
  - エラー数

**API直接テスト**:
```bash
# 監視実行
curl -X POST "http://localhost:3000/api/inventory-monitoring/execute" \
  -H "Content-Type: application/json"

# ステータス確認
curl -X GET "http://localhost:3000/api/inventory-monitoring/stats" | jq .
```

**期待される動作**:
1. SellerMirrorから商品情報を取得
2. Yahoo Auctionページをスクレイピング
3. 価格・在庫状況を比較
4. 変動がある場合は記録
5. 自動価格調整ルールを適用（設定に応じて）

#### A-4. 実行履歴タブ

```
URL: http://localhost:3000/inventory-monitoring
タブ: 実行履歴
```

**テスト項目**:
- [ ] 実行履歴一覧が表示される
- [ ] 各実行ログの詳細
  - 実行日時
  - 処理商品数
  - 検知変動数
  - ステータス（成功/失敗/部分成功）
  - エラーメッセージ（ある場合）
- [ ] ログの詳細表示
  - 個別商品の処理結果
  - 変動検知詳細
  - エラー詳細
- [ ] ログのエクスポート機能
  - CSV形式
  - JSON形式

**データベース確認**:
```sql
-- Supabase SQL Editor
SELECT 
  id,
  started_at,
  completed_at,
  total_products,
  changes_detected,
  status,
  error_message
FROM inventory_monitoring_logs
ORDER BY started_at DESC
LIMIT 20;
```

---

### B. 価格戦略システム (`/inventory-monitoring` - デフォルト設定内)

#### B-1. グローバル価格戦略

**テスト項目**:
- [ ] 基本価格設定
  - 利益率ベース
  - 固定利益額ベース
  - 競合価格ベース
- [ ] 調整ルール（15+種類）
  - 送料調整
  - 競合者信頼度調整
  - カテゴリ別調整
  - 季節調整
  - 在庫レベル調整
  - 販売速度調整
  - etc...
- [ ] ルールの優先順位設定
- [ ] ルールの有効/無効切り替え

**確認SQL**:
```sql
SELECT 
  strategy_type,
  base_profit_margin,
  min_profit_usd,
  adjustment_rules,
  enabled
FROM global_pricing_strategy
WHERE marketplace = 'ebay';
```

#### B-2. 個別商品価格戦略

**テスト項目**:
- [ ] グローバル設定の継承/上書き
- [ ] 商品固有の調整ルール
- [ ] 価格履歴の表示
- [ ] 手動価格設定のオーバーライド

**確認SQL**:
```sql
SELECT 
  p.product_name,
  pp.use_custom_strategy,
  pp.custom_strategy,
  pp.manual_price_override
FROM products p
LEFT JOIN product_pricing pp ON p.id = pp.product_id
WHERE pp.use_custom_strategy = true;
```

#### B-3. 価格計算エンジンテスト

**テスト項目**:
- [ ] 複数ルールの統合計算
- [ ] ロス防止機能
  - 最小利益を下回る価格は設定しない
  - 警告表示
- [ ] 為替レート連動
- [ ] 競合価格取得失敗時の動作
- [ ] 再計算トリガー
  - 為替レート変動
  - コスト変更
  - 競合価格変動

**API直接テスト**:
```bash
# 価格計算テスト
curl -X POST "http://localhost:3000/api/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "test-product-id",
    "base_cost": 100,
    "competitor_price": 150
  }' | jq .
```

---

### C. スコアリングシステム (`/research/scoring`)

#### C-1. スコアアルゴリズム設定

```
URL: http://localhost:3000/research/scoring
```

**テスト項目**:
- [ ] スコア要素の重み付け設定
  - 利益率
  - 販売速度
  - 競合数
  - トレンド
  - リスク要因
- [ ] カテゴリ別重み設定
- [ ] 重み付けのプリセット
  - 保守的（リスク回避）
  - バランス型
  - 積極的（高利益優先）
- [ ] カスタムプリセット作成

**確認SQL**:
```sql
SELECT 
  category,
  profit_weight,
  velocity_weight,
  competition_weight,
  trend_weight,
  risk_weight
FROM scoring_weights
ORDER BY category;
```

#### C-2. スコア計算結果

**テスト項目**:
- [ ] 商品一覧のスコア表示
- [ ] スコアの内訳表示
  - 各要素の個別スコア
  - 重み適用後のスコア
  - 合計スコア
- [ ] スコア順ソート
- [ ] スコアフィルター（閾値設定）

#### C-3. リスティング優先順位

**テスト項目**:
- [ ] スコアに基づく自動優先順位付け
- [ ] 手動での優先順位調整
- [ ] 優先順位の保存
- [ ] バッチリスティング時の順序反映

---

### D. eBay API統合 (`/ebay`)

#### D-1. 認証・トークン管理

```
URL: http://localhost:3000/ebay
```

**テスト項目**:
- [ ] OAuth2認証フロー
  - 認証URLの生成
  - コールバック処理
  - トークン取得
- [ ] リフレッシュトークンの自動更新
- [ ] 複数アカウント管理
  - MJTアカウント
  - GREENアカウント
- [ ] トークンステータス確認

**API直接テスト**:
```bash
# トークンテスト
curl -X GET "http://localhost:3000/api/ebay/check-token" | jq .

# トークン更新テスト
curl -X POST "http://localhost:3000/api/ebay/auth/test-token" | jq .
```

#### D-2. Trading API機能

**テスト項目**:
- [ ] 商品リスティング作成
  - タイトル
  - 説明文（HTMLテンプレート）
  - 価格
  - 数量
  - 送料ポリシー
  - 返品ポリシー
- [ ] 商品情報更新
  - 価格変更
  - 在庫数変更
  - 説明文更新
- [ ] 商品削除/終了
- [ ] バルクリスティング

**API直接テスト**:
```bash
# リスティング作成テスト
curl -X POST "http://localhost:3000/api/ebay/create-listing" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Product",
    "description": "<p>Test description</p>",
    "price": 29.99,
    "quantity": 10
  }' | jq .
```

#### D-3. Browse API機能

**テスト項目**:
- [ ] 商品検索
- [ ] カテゴリ取得
- [ ] 競合商品分析
- [ ] 市場価格調査

---

### E. SellerMirror統合 (`/tools/sellermirror-analyze`)

#### E-1. 商品分析

```
URL: http://localhost:3000/tools/sellermirror-analyze
```

**テスト項目**:
- [ ] URLからの商品情報取得
- [ ] 競合者情報取得
  - 販売者名
  - 価格
  - 評価
  - 在庫状況
- [ ] 競合者信頼度計算
  - 評価数
  - 評価率
  - 販売実績
- [ ] データのキャッシング

**API直接テスト**:
```bash
# SellerMirror分析
curl -X POST "http://localhost:3000/api/sellermirror/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://sellermirror.com/product/..."
  }' | jq .
```

#### E-2. データ精度検証

**テスト項目**:
- [ ] 取得データの正確性
- [ ] Yahoo Auctionとの一致率
- [ ] エラーハンドリング
  - URL不正
  - 商品が見つからない
  - APIレート制限

---

### F. 配送・関税計算 (`/shipping-calc`)

#### F-1. 配送料計算

```
URL: http://localhost:3000/shipping-calc
```

**テスト項目**:
- [ ] 基本配送料計算
  - 重量別
  - サイズ別
  - 配送先国別
- [ ] キャリア選択
  - FedEx
  - DHL
  - USPS
  - etc...
- [ ] サービスレベル選択
  - Standard
  - Expedited
  - Priority
- [ ] 配送料テーブル
  - Zone別料金
  - 重量バンド

**確認SQL**:
```sql
SELECT 
  carrier,
  service_type,
  zone,
  weight_band_start,
  weight_band_end,
  price
FROM shipping_rates
ORDER BY carrier, zone, weight_band_start
LIMIT 50;
```

#### F-2. 関税計算

**テスト項目**:
- [ ] HSコード検索
- [ ] 国別関税率取得
- [ ] 関税額計算
- [ ] DDP（配送関税込み）計算
- [ ] DDU（関税別）計算

**確認SQL**:
```sql
SELECT 
  country_code,
  hs_code,
  duty_rate,
  vat_rate,
  additional_fees
FROM customs_rates
WHERE country_code = 'US'
LIMIT 20;
```

---

### G. HTMLテンプレート (`/tools/html-editor`)

#### G-1. テンプレート管理

```
URL: http://localhost:3000/tools/html-editor
```

**テスト項目**:
- [ ] テンプレート一覧表示
- [ ] テンプレート作成
- [ ] テンプレート編集
  - HTMLエディター
  - CSSスタイリング
  - JavaScriptサポート
- [ ] テンプレート削除
- [ ] デフォルトテンプレート設定

#### G-2. テンプレート適用

**テスト項目**:
- [ ] 商品情報の自動挿入
  - {{title}}
  - {{description}}
  - {{price}}
  - {{images}}
- [ ] 条件分岐
- [ ] ループ処理
- [ ] プレビュー機能

---

### H. フィルター管理 (`/filter-management`)

#### H-1. フィルター作成

```
URL: http://localhost:3000/filter-management
```

**テスト項目**:
- [ ] フィルター条件設定
  - 価格範囲
  - カテゴリ
  - ブランド
  - コンディション
  - 販売者評価
- [ ] AND/OR条件
- [ ] 複合条件
- [ ] フィルター保存
- [ ] フィルタープリセット

#### H-2. フィルター適用

**テスト項目**:
- [ ] 商品リスト絞り込み
- [ ] リアルタイムフィルタリング
- [ ] フィルター結果の保存
- [ ] フィルターの共有

---

### I. バッチ処理 (`/bulk-listing`)

#### I-1. 一括リスティング

```
URL: http://localhost:3000/bulk-listing
```

**テスト項目**:
- [ ] CSVインポート
- [ ] データ検証
  - 必須フィールドチェック
  - データ型チェック
  - 重複チェック
- [ ] プレビュー表示
- [ ] バッチ実行
  - 並列処理
  - エラーハンドリング
  - ロールバック
- [ ] 進捗表示
- [ ] 結果レポート

---

### J. データ管理 (`/data-collection`)

#### J-1. データ収集

```
URL: http://localhost:3000/data-collection
```

**テスト項目**:
- [ ] Yahoo Auctionスクレイピング
- [ ] Amazon商品情報取得
- [ ] eBay市場調査
- [ ] データクリーニング
- [ ] データ正規化

#### J-2. データ品質

**テスト項目**:
- [ ] 重複データ除去
- [ ] 欠損値補完
- [ ] データ検証
- [ ] データ更新頻度

---

### K. レポート・分析 (`/dashboard`)

#### K-1. ダッシュボード

```
URL: http://localhost:3000/dashboard
```

**テスト項目**:
- [ ] KPI表示
  - 総商品数
  - アクティブリスティング数
  - 今日の売上
  - 今月の売上
  - 利益率
- [ ] グラフ表示
  - 売上推移
  - カテゴリ別売上
  - 地域別売上
- [ ] アラート
  - 在庫切れ
  - 価格異常
  - エラー

---

## 🔧 システムテスト

### 1. パフォーマンステスト

```bash
# 大量商品の監視テスト（1000商品）
curl -X POST "http://localhost:3000/api/inventory-monitoring/execute" \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000}'

# 処理時間測定
time curl -X POST "http://localhost:3000/api/inventory-monitoring/execute"
```

**目標**:
- 100商品: 5分以内
- 500商品: 20分以内
- 1000商品: 40分以内

### 2. エラーハンドリングテスト

**テストケース**:
- [ ] ネットワークエラー
  - タイムアウト
  - 接続失敗
- [ ] APIエラー
  - 401 Unauthorized
  - 403 Forbidden
  - 429 Rate Limit
  - 500 Server Error
- [ ] データエラー
  - 不正なJSON
  - 欠損フィールド
  - 型不一致

### 3. セキュリティテスト

**テストケース**:
- [ ] 認証なしでのアクセス拒否
- [ ] JWT検証
- [ ] CORS設定
- [ ] SQL Injection対策
- [ ] XSS対策

---

## 📊 テスト結果記録

### 実行日時
- **開始**: 2025-11-03 ___:___
- **終了**: 2025-11-03 ___:___

### 成功率

| カテゴリ | テスト数 | 成功 | 失敗 | 成功率 |
|---------|---------|------|------|--------|
| 在庫監視 | ___ | ___ | ___ | ___% |
| 価格戦略 | ___ | ___ | ___ | ___% |
| スコアリング | ___ | ___ | ___ | ___% |
| eBay API | ___ | ___ | ___ | ___% |
| SellerMirror | ___ | ___ | ___ | ___% |
| 配送計算 | ___ | ___ | ___ | ___% |
| HTMLテンプレート | ___ | ___ | ___ | ___% |
| フィルター | ___ | ___ | ___ | ___% |
| バッチ処理 | ___ | ___ | ___ | ___% |
| データ管理 | ___ | ___ | ___ | ___% |
| レポート | ___ | ___ | ___ | ___% |
| **合計** | **___** | **___** | **___** | **___%** |

### 重大な問題

1. 
2. 
3. 

### 改善提案

1. 
2. 
3. 

---

## 🚀 次のステップ

### ローカル環境で問題なければ

1. **VPSへのデプロイ**
   ```bash
   # VPSにSSH
   ssh ubuntu@160.16.120.186
   
   # 最新コードをプル
   cd ~/n3-frontend_new
   git pull
   
   # 依存関係更新
   npm install
   
   # ビルド
   npm run build
   
   # PM2再起動
   pm2 restart n3-frontend
   ```

2. **Cron設定（自動監視）**
   ```bash
   # VPS上で
   crontab -e
   
   # 12時間ごとに監視
   0 0,12 * * * ~/scripts/inventory-monitoring.sh
   ```

3. **本番環境での動作確認**
   - 1週間の監視
   - ログのチェック
   - パフォーマンス測定

---

## ✅ テスト完了の定義

以下の全てが満たされた場合、テスト完了とする：

- [ ] 全機能の基本動作確認完了
- [ ] 重大なバグなし
- [ ] パフォーマンス目標達成
- [ ] セキュリティチェック完了
- [ ] ドキュメント更新完了
- [ ] VPS環境での動作確認完了

---

**テスト担当**: Claude (Anthropic)  
**レビュー**: アリタヒロアキ様  
**承認**: _____________
