# 🚀 グローバル・フロンティア無在庫プラットフォーム

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [Phase 1: 基盤構築](#phase-1-基盤構築)
3. [Phase 2: クロスボーダー戦略](#phase-2-クロスボーダー戦略)
4. [Phase 3: グローバル展開](#phase-3-グローバル展開)
5. [セットアップ](#セットアップ)
6. [API仕様](#api仕様)

---

## プロジェクト概要

### 🎯 最終目標

Amazonがある全ての国を対象に、多重リスク分析と自動化されたクロスボーダー取引を実行し、**在庫リスクゼロ**で利益を最大化する。

### 💡 核となる戦略

**多重ハイブリッド戦略**：

1. **P-4戦略（市場枯渇）** - 在庫切れ→再入荷のタイミングを狙う
2. **P-1戦略（価格ミス）** - 急激な価格下落を狙う
3. **クロス無在庫戦略** - 国際間の価格差を自動で刈り取る

以下の3つの収益モデルを自動で使い分ける：

- 🏠 **自国完結型** - US→US FBA、JP→JP FBA
- 🌍 **国際転売型** - US→JP、JP→USなど国際FBA
- 📦 **クロス無在庫型** - A国購入→B国顧客へ直送（DDP処理）

### 🛡️ リスク管理

全ての取引は**DDP（関税元払い）処理**と**発送代行業者（フォワーダー）**を経由し、関税リスクとアカウント停止リスクをシステムで排除。

---

## Phase 1: 基盤構築

### ✅ 実装完了項目

#### 1. Keepa API統合

**目的：** P-4/P-1戦略の核心となる価格・在庫・BSRデータ取得

**実装ファイル：**

- `lib/keepa/keepa-api-client.ts` - Keepa APIクライアント
- `types/keepa.ts` - Keepa型定義
- `app/api/keepa/product/route.ts` - 商品データ取得
- `app/api/keepa/batch/route.ts` - 一括取得（最大100件）
- `app/api/keepa/score/route.ts` - P-4/P-1スコア計算
- `app/api/keepa/deals/route.ts` - ディールファインダー
- `app/api/keepa/token-status/route.ts` - トークン残高確認
- `app/api/keepa/sync-product/route.ts` - DBと同期
- `app/api/keepa/opportunity-scanner/route.ts` - 購入機会スキャン

**P-4スコアリングアルゴリズム：**

```typescript
総合スコア (0-100) =
  在庫切れ頻度 (0-40) +
  価格上昇率 (0-30) +
  BSRボラティリティ (0-20) +
  現在の機会 (0-10)

推奨レベル:
  70-100点: excellent (即座に仕入れるべき)
  40-69点: good (仕入れ推奨)
  20-39点: moderate (監視対象)
  0-19点: none (スキップ)
```

**P-1スコアリングアルゴリズム：**

```typescript
総合スコア (0-100) =
  価格下落率 (0-50) +
  価格下落速度 (0-20) +
  歴史的安定性 (0-15) +
  BSRクオリティ (0-15)

推奨レベル:
  70-100点: excellent (完璧な価格ミス)
  40-69点: good (優良価格ミス)
  20-39点: moderate (監視対象)
  0-19点: none (スキップ)
```

#### 2. データベーススキーマ拡張

**マイグレーションファイル：**

- `migrations/add_keepa_columns.sql`

**追加カラム（50+）：**

```sql
-- ASIN・ドメイン
asin, keepa_domain

-- P-4スコア（6カラム）
p4_total_score, p4_stock_out_frequency, p4_price_increase,
p4_bsr_volatility, p4_current_opportunity, p4_recommendation

-- P-1スコア（6カラム）
p1_total_score, p1_price_drop_percentage, p1_drop_speed,
p1_historical_stability, p1_sales_rank_quality, p1_recommendation

-- 統合スコア（4カラム）
primary_strategy, primary_score, should_purchase, urgency

-- BSR（4カラム）
current_bsr, avg_bsr_30d, avg_bsr_90d, bsr_category

-- 価格履歴（5カラム）
current_amazon_price, avg_amazon_price_30d, avg_amazon_price_90d,
min_amazon_price_90d, max_amazon_price_90d

-- 在庫状態（4カラム）
is_in_stock, stock_out_count_90d, last_stock_out_date, last_restock_date

-- レビュー（2カラム）
review_count, review_rating

-- Keepa生データ（2カラム）
keepa_data (JSONB), keepa_last_updated
```

**インデックス最適化：**

```sql
-- パフォーマンス重視の9つのインデックス
idx_products_master_asin
idx_products_master_p4_score
idx_products_master_p1_score
idx_products_master_should_purchase
idx_products_master_bsr
idx_products_master_stock_status
idx_products_master_keepa_updated
idx_products_master_keepa_data_gin (GINインデックス)
```

#### 3. 型定義の完全整備

**更新ファイル：**

- `types/products-master-complete.ts`
- `types/keepa.ts`

---

## Phase 2: クロスボーダー戦略

### 🔨 実装予定項目

#### 1. フォワーダーAPI連携

**対象フォワーダー候補：**

- Shipito
- MyUS
- Planet Express
- Stackry

**実装内容：**

- DDP処理自動化
- 再梱包指示
- 発送指示自動化
- トラッキング統合

#### 2. 関税自動計算エンジン

**既存リソース活用：**

- `hs_codes` テーブル（既存）
- `exchange_rates` テーブル（既存）
- `origin_countries` テーブル（既存）

**実装内容：**

```typescript
関税総額 = (商品価格 + 国際送料) × 関税率 + 手数料
DDP価格 = 商品価格 + 国際送料 + 関税総額
顧客支払額 = DDP価格 + 利益マージン
```

#### 3. 最適ルート決定ロジック

**アルゴリズム：**

```typescript
実質利益 = 販売価格 - (仕入れ価格 + 送料 + 関税 + 手数料)

for each (仕入れ国 × 販売国) {
  if (実質利益 > 最低利益閾値 && 利益率 > 最低利益率) {
    ルート候補に追加
  }
}

最適ルート = max(実質利益)
```

---

## Phase 3: グローバル展開

### 🌍 実装予定項目

#### 1. 多国籍FBA拡張

**対象マーケット：**

- Amazon US ✅ (部分実装済み)
- Amazon JP ✅ (部分実装済み)
- Amazon UK
- Amazon DE
- Amazon FR
- Amazon IT
- Amazon ES
- Amazon CA
- Amazon MX
- Amazon AU
- Amazon IN
- Amazon BR

#### 2. ローカルモール統合

**対象プラットフォーム：**

- eBay (US, UK, DE) ✅ (既存実装あり)
- Shopee (SG, MY, TH, PH, VN)
- Qoo10 (JP, SG)
- Buyma (JP)
- Mercari (JP, US)
- Rakuten (JP)

#### 3. 多通貨・為替最適化

**実装内容：**

- リアルタイム為替レート取得（既存 `exchange_rates` 活用）
- 為替変動予測アルゴリズム
- 自動決済タイミング最適化（円高時に自動購入など）

---

## セットアップ

### 環境変数設定

`.env.local` に以下を追加：

```bash
# Keepa API
KEEPA_API_KEY=your_keepa_api_key_here

# Amazon Product Advertising API (既存)
AMAZON_ACCESS_KEY=your_access_key
AMAZON_SECRET_KEY=your_secret_key
AMAZON_PARTNER_TAG=your_partner_tag
AMAZON_MARKETPLACE=www.amazon.com
AMAZON_REGION=us-east-1

# Supabase (既存)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### データベースマイグレーション

```bash
# Supabase CLIを使用
supabase db push

# または、SQLファイルを直接実行
psql -h your_db_host -U your_user -d your_db -f migrations/add_keepa_columns.sql
```

### パッケージインストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

---

## API仕様

### Keepa統合API

#### 1. 商品データ取得

```http
GET /api/keepa/product?asin=B0XXXXXXXX&domain=1
```

**レスポンス例：**

```json
{
  "asin": "B0XXXXXXXX",
  "title": "Product Title",
  "stats": {
    "current": [2999, 3499, 2799, 15420],
    "avg": [3299, 3699, 2999, 18500]
  },
  "csv": [[...], [...], ...]
}
```

#### 2. P-4/P-1スコア計算

```http
POST /api/keepa/score
Content-Type: application/json

{
  "asin": "B0XXXXXXXX",
  "domain": 1,
  "strategy": "both"
}
```

**レスポンス例：**

```json
{
  "asin": "B0XXXXXXXX",
  "title": "Product Title",
  "p4Score": {
    "totalScore": 78.5,
    "stockOutFrequency": 32.0,
    "priceIncrease": 25.0,
    "bsrVolatility": 18.5,
    "currentOpportunity": 3.0,
    "recommendation": "excellent"
  },
  "p1Score": {
    "totalScore": 65.0,
    "priceDropPercentage": 35.0,
    "dropSpeed": 15.0,
    "historicalStability": 10.0,
    "salesRankQuality": 5.0,
    "recommendation": "good"
  },
  "combined": {
    "primaryStrategy": "P-4",
    "primaryScore": 78.5,
    "shouldPurchase": true,
    "urgency": "high"
  }
}
```

#### 3. DBと同期

```http
POST /api/keepa/sync-product
Content-Type: application/json

{
  "asin": "B0XXXXXXXX",
  "domain": 1
}
```

**レスポンス例：**

```json
{
  "success": true,
  "product": { ... },
  "scores": { ... },
  "message": "Product synced successfully with Keepa data"
}
```

#### 4. 購入機会スキャン

```http
GET /api/keepa/opportunity-scanner?domain=1&minScore=40&limit=50&strategy=P-4
```

**レスポンス例：**

```json
{
  "total": 42,
  "opportunities": [
    {
      "asin": "B0XXXXXXXX",
      "title": "Product Title",
      "primary_score": 85.5,
      "urgency": "high",
      "primary_strategy": "P-4",
      "current_amazon_price": 29.99,
      "should_purchase": true
    },
    ...
  ],
  "grouped": {
    "high": [...],
    "medium": [...],
    "low": [...]
  },
  "byStrategy": {
    "P-4": [...],
    "P-1": [...]
  }
}
```

#### 5. ディールファインダー

```http
GET /api/keepa/deals?domain=1&minDiscount=30&maxPrice=100
```

**レスポンス例：**

```json
{
  "deals": [
    {
      "asin": "B0XXXXXXXX",
      "title": "Product Title",
      "currentPrice": 29.99,
      "avgPrice": 49.99,
      "bsr": 1542,
      "p1Score": {
        "totalScore": 85.0,
        "recommendation": "excellent"
      }
    },
    ...
  ],
  "count": 15
}
```

---

## 🎯 次のステップ

### Phase 1 残タスク

1. ✅ ~~Keepa API統合~~
2. ✅ ~~データベーススキーマ拡張~~
3. 🔨 Amazon完全API統合（注文・在庫・FBA納品）
4. 🔨 自国完結FBAロジック
5. 🔨 自動決済システム
6. 🔨 FBA納品プラン自動作成

### Phase 2（クロスボーダー）

1. フォワーダーAPI連携
2. 関税自動計算エンジン
3. 最適ルート決定ロジック

### Phase 3（グローバル展開）

1. 多国籍FBA拡張
2. ローカルモール統合
3. 多通貨・為替最適化

---

## 📚 参考資料

- [Keepa API Documentation](https://keepa.com/#!api)
- [Amazon Product Advertising API](https://webservices.amazon.com/paapi5/documentation/)
- [Amazon MWS/SP-API Documentation](https://developer-docs.amazon.com/sp-api/)

---

## 📄 ライセンス

Private Project - All Rights Reserved
