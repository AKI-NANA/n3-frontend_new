# 🚀 グローバル・フロンティア無在庫プラットフォーム

**世界中のAmazonマーケットで価格差と在庫の非効率性を自動で刈り取る、真のグローバルアービトラージプラットフォーム**

---

## 📑 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [Phase 1: 実装完了機能](#phase-1-実装完了機能)
3. [セットアップ手順](#セットアップ手順)
4. [使用方法](#使用方法)
5. [API仕様](#api仕様)
6. [今後の展開](#今後の展開)

---

## プロジェクト概要

### 🎯 最終目標

Amazonがある全ての国を対象に、多重リスク分析と自動化されたクロスボーダー取引を実行し、**在庫リスクゼロ**で利益を最大化する。

### 💡 核となる戦略

**多重ハイブリッド戦略：**

1. **P-4戦略（市場枯渇）** - 在庫切れ→再入荷のタイミングを狙う
2. **P-1戦略（価格ミス）** - 急激な価格下落を狙う
3. **自国完結型FBA** - US→US FBA、JP→JP FBA（Phase 1 完了✅）
4. **クロス無在庫戦略** - 国際間の価格差を自動で刈り取る（Phase 2）
5. **多国籍展開** - 全Amazon国とローカルモールへ拡大（Phase 3）

---

## Phase 1: 実装完了機能 ✅

### 1. Keepa API統合 ✅

**実装内容：**

- P-4/P-1スコアリングアルゴリズム
- 価格履歴・BSR・在庫状態の自動分析
- ディールファインダー
- バッチ処理（最大100件）

**主要ファイル：**

```
lib/keepa/keepa-api-client.ts
types/keepa.ts
app/api/keepa/product/route.ts
app/api/keepa/score/route.ts
app/api/keepa/deals/route.ts
app/api/keepa/sync-product/route.ts
app/api/keepa/opportunity-scanner/route.ts
```

**スコアリングロジック：**

```
P-4 総合スコア (0-100) =
  在庫切れ頻度 (0-40) +
  価格上昇率 (0-30) +
  BSRボラティリティ (0-20) +
  現在の機会 (0-10)

P-1 総合スコア (0-100) =
  価格下落率 (0-50) +
  価格下落速度 (0-20) +
  歴史的安定性 (0-15) +
  BSRクオリティ (0-15)

推奨レベル:
  70-100: excellent (即座に仕入れるべき)
  40-69: good (仕入れ推奨)
  20-39: moderate (監視対象)
  0-19: none (スキップ)
```

---

### 2. データベーススキーマ拡張 ✅

**追加カラム数：** 50+ カラム

**主要テーブル：**

- `products_master` - P-4/P-1スコア、BSR、価格履歴、在庫状態
- `arbitrage_purchases` - 購入記録と利益追跡
- `arbitrage_alerts` - 機会アラート
- `arbitrage_strategies` - 戦略設定
- `arbitrage_execution_logs` - 実行ログ

**マイグレーションファイル：**

```
migrations/add_keepa_columns.sql
migrations/add_arbitrage_tables.sql
```

**パフォーマンス最適化：**

- 9つの高速インデックス（ASIN、スコア、BSR、在庫状態など）
- GINインデックス（JSONB高速検索）

---

### 3. Amazon SP-API統合 ✅

**実装内容：**

- FBA Inbound Shipment（納品プラン作成）
- FBA Inventory Management（在庫管理）
- Orders API（注文取得）
- Catalog API（商品情報取得）
- Listings API（出品管理）

**対応マーケットプレイス：**

- ✅ US (Amazon.com)
- ✅ JP (Amazon.co.jp)
- ✅ UK, DE, FR, IT, ES, CA (設定済み)
- 🔨 その他全Amazon国（Phase 3で拡張予定）

**主要ファイル：**

```
lib/amazon/sp-api-client.ts
types/amazon-sp-api.ts
app/api/amazon-sp/fba/create-shipment/route.ts
app/api/amazon-sp/inventory/route.ts
app/api/amazon-sp/orders/route.ts
```

---

### 4. 自国完結FBA自動化サービス ✅

**実装内容：**

完全自動化フロー：

1. **スキャン** - KeepaでP-4/P-1高スコア商品を検出
2. **分析** - 利益率・FBA手数料・BSRを自動計算
3. **購入記録** - DB に購入予定を記録
4. **FBA納品** - SP-APIで納品プラン自動作成
5. **モニタリング** - 高優先度機会を定期監視

**主要ファイル：**

```
lib/services/domestic-fba-arbitrage.ts
app/api/arbitrage/scan/route.ts
app/api/arbitrage/automate/route.ts
app/api/arbitrage/monitor/route.ts
```

**自動化レベル：**

- ✅ スキャン・分析：完全自動
- ✅ DB記録：完全自動
- ✅ FBA納品プラン作成：完全自動
- 🔨 自動購入：Phase 1.5で実装予定（現在は手動購入を前提）

---

## セットアップ手順

### 1. 環境変数設定

`.env.local` ファイルを作成：

```bash
cp .env.example .env.local
```

以下の必須環境変数を設定：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Keepa API (必須)
KEEPA_API_KEY=your_keepa_api_key

# Amazon Product Advertising API (任意)
AMAZON_ACCESS_KEY=your_access_key
AMAZON_SECRET_KEY=your_secret_key
AMAZON_PARTNER_TAG=your_partner_tag

# Amazon Selling Partner API (FBA機能に必須)
AMAZON_SP_CLIENT_ID=your_sp_client_id
AMAZON_SP_CLIENT_SECRET=your_sp_client_secret
AMAZON_SP_REFRESH_TOKEN=your_sp_refresh_token
AMAZON_SP_ACCESS_KEY_ID=your_sp_access_key_id
AMAZON_SP_SECRET_ACCESS_KEY=your_sp_secret_access_key
AMAZON_SELLER_ID=your_seller_id
```

### 2. データベースマイグレーション

Supabase CLIを使用：

```bash
# マイグレーション実行
supabase db push

# または、SQLファイルを直接実行
psql -h your_db_host -U your_user -d your_db -f migrations/add_keepa_columns.sql
psql -h your_db_host -U your_user -d your_db -f migrations/add_arbitrage_tables.sql
```

### 3. パッケージインストール

```bash
npm install
```

### 4. 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

---

## 使用方法

### 📊 機会スキャン

```bash
# US マーケットプレイスをスキャン
curl -X POST http://localhost:3000/api/arbitrage/scan \
  -H "Content-Type: application/json" \
  -d '{
    "marketplace": "US",
    "minScore": 40,
    "maxResults": 50
  }'
```

**レスポンス例：**

```json
{
  "success": true,
  "marketplace": "US",
  "opportunities": [
    {
      "asin": "B0XXXXXXXX",
      "title": "Product Title",
      "currentPrice": 29.99,
      "avgPrice": 49.99,
      "bsr": 1542,
      "p4Score": 78.5,
      "p1Score": 65.0,
      "estimatedProfit": 8.50,
      "estimatedMargin": 17.0,
      "recommendation": "excellent"
    }
  ],
  "stats": {
    "total": 42,
    "excellent": 8,
    "good": 15,
    "avgProfit": 6.75
  }
}
```

---

### 🤖 完全自動化実行

```bash
curl -X POST http://localhost:3000/api/arbitrage/automate \
  -H "Content-Type: application/json" \
  -d '{
    "marketplace": "US",
    "minScore": 70,
    "maxItems": 10,
    "shipFromAddress": {
      "name": "Your Name",
      "addressLine1": "123 Main St",
      "city": "New York",
      "stateOrProvinceCode": "NY",
      "postalCode": "10001",
      "countryCode": "US"
    }
  }'
```

**実行内容：**

1. 高スコア商品をスキャン
2. 上位10件をDB に記録
3. Keepaデータを `products_master` に同期
4. 実行ログを保存

**次のステップ：**

1. 手動でAmazon.comにて商品を購入
2. 購入完了後、FBA納品プラン作成
3. 商品をFBA倉庫へ発送

---

### 📡 定期モニタリング

```bash
# 高優先度機会を監視（cronで定期実行推奨）
curl http://localhost:3000/api/arbitrage/monitor?marketplace=US
```

**用途：**

- 毎時実行してアラート生成
- `arbitrage_alerts` テーブルに通知保存
- スコア70以上、緊急度 "high" の機会を自動検出

---

## API仕様

### Keepa統合API

#### 1. P-4/P-1スコア計算

```
POST /api/keepa/score
Content-Type: application/json

{
  "asin": "B0XXXXXXXX",
  "domain": 1,
  "strategy": "both"
}
```

#### 2. 商品同期（DBへ保存）

```
POST /api/keepa/sync-product
Content-Type: application/json

{
  "asin": "B0XXXXXXXX",
  "domain": 1
}
```

#### 3. 購入機会スキャン

```
GET /api/keepa/opportunity-scanner?domain=1&minScore=40&limit=50
```

---

### Amazon SP-API

#### 1. FBA納品プラン作成

```
POST /api/amazon-sp/fba/create-shipment
Content-Type: application/json

{
  "marketplace": "US",
  "items": [
    {
      "sellerSKU": "SKU-123",
      "quantity": 1,
      "asin": "B0XXXXXXXX"
    }
  ],
  "shipFromAddress": {...},
  "shipmentName": "My Shipment"
}
```

#### 2. FBA在庫取得

```
GET /api/amazon-sp/inventory?marketplace=US
```

#### 3. 注文一覧取得

```
GET /api/amazon-sp/orders?marketplace=US&days=7
```

---

### アービトラージ自動化API

#### 1. 機会スキャン

```
POST /api/arbitrage/scan
Content-Type: application/json

{
  "marketplace": "US",
  "minScore": 40,
  "maxResults": 50
}
```

#### 2. 完全自動化実行

```
POST /api/arbitrage/automate
Content-Type: application/json

{
  "marketplace": "US",
  "minScore": 70,
  "maxItems": 10,
  "shipFromAddress": {...}
}
```

#### 3. 定期モニタリング

```
GET /api/arbitrage/monitor?marketplace=US
```

---

## 今後の展開

### Phase 1.5: 自動購入機能（次のステップ）

**実装予定：**

- Puppeteer/Playwrightによるヘッドレスブラウザ自動購入
- Amazon購入フロー完全自動化
- 決済処理の自動化
- 購入確認メール解析

**優先度：** 高

---

### Phase 2: クロスボーダー戦略 🔨

**実装予定：**

1. **フォワーダーAPI連携**
   - Shipito, MyUS, Planet Express統合
   - DDP処理自動化
   - 再梱包指示

2. **関税自動計算エンジン**
   - HSコード自動マッピング
   - リアルタイム為替レート
   - DDP総額計算

3. **最適ルート決定ロジック**
   - A国→B国の全ペア利益計算
   - 実質利益最大化アルゴリズム
   - 送料・関税・手数料の統合最適化

**優先度：** 中

---

### Phase 3: グローバル展開 🌍

**実装予定：**

1. **多国籍FBA拡張**
   - Amazon EU（UK, DE, FR, IT, ES）
   - Amazon APAC（AU, SG, IN）
   - Amazon LATAM（BR, MX）

2. **ローカルモール統合**
   - eBay（US, UK, DE）
   - Shopee（SG, MY, TH, PH, VN）
   - Qoo10（JP, SG）
   - Mercari（JP, US）

3. **多通貨・為替最適化**
   - 為替変動予測
   - 自動決済タイミング最適化
   - 円高時の自動購入トリガー

**優先度：** 低

---

## 📚 ドキュメント

- [完全ガイド](docs/GLOBAL_DROPSHIPPING_PLATFORM.md)
- [Keepa API Documentation](https://keepa.com/#!api)
- [Amazon SP-API Documentation](https://developer-docs.amazon.com/sp-api/)
- [Supabase Documentation](https://supabase.com/docs)

---

## 📄 ライセンス

Private Project - All Rights Reserved

---

## 🎯 Phase 1 完了状況

| タスク | ステータス |
|--------|-----------|
| Keepa API統合 | ✅ 完了 |
| データベーススキーマ拡張 | ✅ 完了 |
| Amazon SP-API統合 | ✅ 完了 |
| 自国完結FBA自動化 | ✅ 完了 |
| 自動購入機能 | 🔨 Phase 1.5 |

**Phase 1 達成率: 85%**

次のステップは **Phase 1.5: 自動購入機能** の実装です！
