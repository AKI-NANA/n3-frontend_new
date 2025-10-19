# 自動価格最適化システム - 完全開発計画書 v1.0

**プロジェクト名**: eBay自動価格最適化・最安値追従システム  
**バージョン**: 1.0.0  
**作成日**: 2025-10-03  
**対象システム**: n3-frontend (Next.js 14 + Supabase)

---

## 📋 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [システム全体構成](#2-システム全体構成)
3. [既存システムの評価](#3-既存システムの評価)
4. [新規開発要件](#4-新規開発要件)
5. [データベース設計](#5-データベース設計)
6. [API設計](#6-api設計)
7. [UI/UX設計](#7-uiux設計)
8. [開発フェーズ](#8-開発フェーズ)
9. [技術仕様](#9-技術仕様)
10. [リスク管理](#10-リスク管理)

---

## 1. プロジェクト概要

### 1.1 目的

在庫管理ツールの仕入値変動を検知し、利益計算ツールと連携して自動的に価格を再計算し、eBay MUG 8カ国での競合最安値を追従しながら、赤字を防止する自動価格最適化システムを構築する。

### 1.2 主要機能

1. **仕入値変動検知機能**
   - 在庫管理ツールからの仕入値変動をリアルタイムで検知
   - Webhook または API polling による自動検知
   - 変動履歴の保存と分析

2. **自動価格再計算機能**
   - 仕入値変動時の利益率再計算
   - DDP/DDU方式に対応した価格計算
   - 最低利益率・最低利益額の自動チェック

3. **競合最安値追従機能**
   - eBay MUG 8カ国の最安価格取得
   - 競合価格との比較分析
   - 赤字にならない範囲での価格調整提案

4. **赤字防止機能**
   - 最低利益率の自動チェック
   - 赤字予測時の自動アラート
   - 価格調整停止判定

5. **eBay自動価格更新機能**
   - eBay API経由での価格更新
   - バルク更新対応
   - 更新履歴管理

### 1.3 システム要件

#### 機能要件
- 仕入値変動検知: リアルタイム（Webhook）または5分間隔（Polling）
- 価格再計算: 変動検知から30秒以内
- 競合価格取得: 日次バッチ実行（毎朝3:00）
- eBay価格更新: 手動承認後、即時反映

#### 非機能要件
- 可用性: 99.5%以上
- 応答時間: API応答2秒以内
- データ整合性: トランザクション保証
- セキュリティ: API認証、権限管理

---

## 2. システム全体構成

### 2.1 システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│  フロントエンド層 (Next.js 14 + React 18)               │
├─────────────────────────────────────────────────────────┤
│  ① 在庫管理UI (/inventory)                              │
│  ② 利益計算UI (/ebay-pricing)                           │
│  ③ 商品編集UI (/tools/editing) [拡張]                   │
│  ④ 価格最適化UI (/price-optimization) [新規]           │
│  ⑤ 競合分析UI (/competitor-analysis) [新規]            │
└─────────────────────────────────────────────────────────┘
              ↓ API通信
┌─────────────────────────────────────────────────────────┐
│  APIレイヤー (Next.js API Routes)                        │
├─────────────────────────────────────────────────────────┤
│  ① 在庫管理API                                           │
│  ② 利益計算API                                           │
│  ③ 競合価格取得API [新規]                               │
│  ④ 自動価格調整API [新規]                               │
│  ⑤ eBay連携API [新規]                                   │
└─────────────────────────────────────────────────────────┘
              ↓ データアクセス
┌─────────────────────────────────────────────────────────┐
│  データベース層 (Supabase - PostgreSQL)                  │
├─────────────────────────────────────────────────────────┤
│  【既存テーブル】                                         │
│  - inventory_management (在庫マスタ)                     │
│  - stock_history (在庫履歴)                              │
│  - yahoo_scraped_products (商品データ)                   │
│  - ebay_categories (カテゴリ)                            │
│  - profit_margin_settings (利益率設定)                   │
│                                                          │
│  【新規テーブル】                                         │
│  - cost_change_history (仕入値変動履歴) [新規]          │
│  - competitor_prices (競合価格) [新規]                   │
│  - price_optimization_rules (価格最適化ルール) [新規]   │
│  - price_adjustment_queue (価格調整キュー) [新規]       │
│  - price_update_history (価格更新履歴) [新規]           │
│  - ebay_mug_countries (MUG対応国マスタ) [新規]          │
│  - auto_pricing_settings (自動価格設定) [新規]          │
└─────────────────────────────────────────────────────────┘
              ↓ 外部連携
┌─────────────────────────────────────────────────────────┐
│  外部API層                                                │
├─────────────────────────────────────────────────────────┤
│  ① eBay Finding API (競合価格取得)                       │
│  ② eBay Trading API (価格更新)                           │
│  ③ 在庫管理Webhook (仕入値変動通知)                     │
└─────────────────────────────────────────────────────────┘
              ↓ バッチ処理
┌─────────────────────────────────────────────────────────┐
│  バッチ処理層                                             │
├─────────────────────────────────────────────────────────┤
│  ① 競合価格取得バッチ (日次: 3:00)                       │
│  ② 価格最適化バッチ (日次: 4:00)                         │
│  ③ 仕入値変動監視バッチ (5分間隔)                        │
│  ④ 赤字商品検知バッチ (日次: 8:00)                       │
└─────────────────────────────────────────────────────────┘
```

### 2.2 データフロー

#### パターン1: 仕入値変動時の自動価格調整

```
[在庫管理ツール]
    ↓ 仕入値変更
[Webhook/API通知]
    ↓
[cost_change_history保存] → [変動検知サービス起動]
    ↓
[利益計算API呼び出し]
    ↓
[新価格計算] → [最低利益率チェック]
    ↓
[価格調整必要?]
    ├─ YES → [price_adjustment_queue登録]
    │           ↓
    │       [ユーザーに通知・承認待ち]
    │           ↓
    │       [承認後: eBay API更新]
    └─ NO  → [ログ記録のみ]
```

#### パターン2: 競合価格追従（日次バッチ）

```
[バッチ起動: 毎朝3:00]
    ↓
[対象商品リスト取得]
    ↓
[各商品について並列処理]
    ├─ eBay Finding API呼び出し
    ├─ MUG 8カ国の最安価格取得
    └─ competitor_prices保存
    ↓
[価格差分析]
    ↓
[調整が必要な商品抽出]
    ↓
[利益率シミュレーション]
    ↓
[赤字判定]
    ├─ 利益確保可能 → [price_adjustment_queue登録]
    └─ 赤字リスク   → [アラート通知 + 調整停止]
    ↓
[レポート生成]
```

---

## 3. 既存システムの評価

### 3.1 在庫管理ツール (/inventory)

#### 実装状況
| 項目 | 状況 | 備考 |
|-----|------|------|
| 在庫一覧表示 | ✅ 完了 | リアルタイム検索対応 |
| SKU管理 | ✅ 完了 | - |
| 在庫数量追跡 | ✅ 完了 | - |
| 仕入値管理 | ✅ 完了 | `inventory_management`テーブル |
| 仕入値変動検知 | ❌ 未実装 | **開発必要** |
| Webhook提供 | ❌ 未実装 | **開発必要** |
| 変動履歴保存 | ⚠️ 部分実装 | `stock_history`のみ、仕入値履歴なし |

#### 必要な拡張
1. **仕入値変動履歴テーブル追加**
   - テーブル名: `cost_change_history`
   - 仕入値の変更前後を記録

2. **Webhook機能追加**
   - エンドポイント: `/api/webhooks/cost-change`
   - ペイロード: `{item_id, old_cost, new_cost, changed_at}`

3. **API拡張**
   - `GET /api/inventory/cost-history/:item_id`
   - `POST /api/inventory/webhook-register`

### 3.2 利益計算ツール (/ebay-pricing)

#### 実装状況
| 項目 | 状況 | 備考 |
|-----|------|------|
| DDP/DDU価格計算 | ✅ 完了 | USA DDP対応済み |
| HSコード連携 | ✅ 完了 | - |
| 関税計算 | ✅ 完了 | - |
| 利益率シミュレーション | ✅ 完了 | - |
| 為替レート管理 | ✅ 完了 | - |
| 最低利益率設定 | ⚠️ 部分実装 | グローバル設定のみ |
| 商品個別利益率設定 | ❌ 未実装 | **開発必要** |
| 最低利益額設定 | ❌ 未実装 | **開発必要** |
| 自動再計算機能 | ❌ 未実装 | **開発必要** |

#### 必要な拡張
1. **商品個別設定テーブル追加**
   - テーブル名: `item_pricing_settings`
   - 商品ごとの最低利益率・最低利益額

2. **自動再計算API追加**
   - エンドポイント: `/api/pricing/recalculate`
   - トリガー: Webhook、手動、バッチ

3. **赤字判定ロジック追加**
   - 最低利益率チェック
   - 最低利益額チェック
   - アラート生成

### 3.3 商品編集UI (/tools/editing)

#### 実装状況
| 項目 | 状況 | 備考 |
|-----|------|------|
| 商品情報編集 | ✅ 完了 | 一括編集対応 |
| 画像管理 | ✅ 完了 | - |
| カテゴリ変更 | ✅ 完了 | - |
| 価格設定 | ✅ 完了 | 手動設定のみ |
| 利益率個別設定 | ❌ 未実装 | **開発必要** |
| 最安値追従ON/OFF | ❌ 未実装 | **開発必要** |
| 赤字防止設定 | ❌ 未実装 | **開発必要** |

#### 必要な拡張
1. **価格設定タブ追加**
   - 最低利益率設定UI
   - 最低利益額設定UI
   - 最安値追従ON/OFF切り替え

2. **バルク設定機能**
   - 複数商品の一括設定
   - カテゴリ別デフォルト設定

---

## 4. 新規開発要件

### 4.1 競合価格取得機能

#### 機能概要
eBay Finding APIを使用して、MUG 8カ国での競合最安価格を自動取得する。

#### 対応国リスト
1. USA (ebay.com)
2. UK (ebay.co.uk)
3. Germany (ebay.de)
4. Australia (ebay.com.au)
5. Canada (ebay.ca)
6. France (ebay.fr)
7. Italy (ebay.it)
8. Spain (ebay.es)

#### 実装仕様

##### API設計
```typescript
// エンドポイント
POST /api/competitor/fetch-prices

// リクエスト
{
  item_id: string;
  keywords: string;
  countries: string[]; // ['US', 'UK', 'DE', 'AU', 'CA', 'FR', 'IT', 'ES']
  category_id?: number;
}

// レスポンス
{
  success: boolean;
  data: {
    item_id: string;
    prices: {
      country: string;
      lowest_price: number;
      average_price: number;
      currency: string;
      listings_count: number;
      fetched_at: string;
    }[];
  };
}
```

##### データベーステーブル
```sql
CREATE TABLE competitor_prices (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    ebay_site_id INTEGER NOT NULL,
    lowest_price DECIMAL(10,2) NOT NULL,
    average_price DECIMAL(10,2),
    median_price DECIMAL(10,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    listings_count INTEGER DEFAULT 0,
    search_keywords TEXT,
    category_id INTEGER,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(item_id, country_code, fetched_at::date)
);

CREATE INDEX idx_competitor_prices_item ON competitor_prices(item_id);
CREATE INDEX idx_competitor_prices_country ON competitor_prices(country_code);
CREATE INDEX idx_competitor_prices_fetched ON competitor_prices(fetched_at DESC);
```

##### バッチ処理
```typescript
// cron設定: 毎日3:00実行
// ファイル: /app/api/cron/fetch-competitor-prices/route.ts

export async function GET(request: Request) {
  // 1. 対象商品取得（最安値追従ON の商品のみ）
  const items = await getItemsWithAutoTracking();
  
  // 2. 並列処理（10商品ずつ）
  const batches = chunk(items, 10);
  
  for (const batch of batches) {
    await Promise.all(
      batch.map(item => fetchCompetitorPrices(item))
    );
    await sleep(5000); // Rate limit対策
  }
  
  // 3. レポート生成
  await generateCompetitorReport();
  
  return Response.json({ success: true });
}
```

### 4.2 自動価格調整エンジン

#### 機能概要
仕入値変動および競合価格の変化を検知し、利益を確保しながら最適な価格を自動提案する。

#### 価格調整ロジック

##### ステップ1: 価格調整必要性の判定
```typescript
interface PriceAdjustmentCheck {
  needsAdjustment: boolean;
  reason: 'cost_changed' | 'competitor_lower' | 'margin_low' | 'none';
  currentMargin: number;
  targetMargin: number;
  competitorPrice?: number;
}

function checkNeedsAdjustment(item: Item): PriceAdjustmentCheck {
  // 1. 仕入値変動チェック
  if (item.cost_changed) {
    return {
      needsAdjustment: true,
      reason: 'cost_changed',
      currentMargin: calculateMargin(item),
      targetMargin: item.min_margin
    };
  }
  
  // 2. 競合価格チェック
  const competitorPrice = getLowestCompetitorPrice(item.id);
  if (competitorPrice && item.current_price > competitorPrice * 1.1) {
    return {
      needsAdjustment: true,
      reason: 'competitor_lower',
      currentMargin: calculateMargin(item),
      targetMargin: item.min_margin,
      competitorPrice
    };
  }
  
  // 3. 利益率チェック
  const margin = calculateMargin(item);
  if (margin < item.min_margin) {
    return {
      needsAdjustment: true,
      reason: 'margin_low',
      currentMargin: margin,
      targetMargin: item.min_margin
    };
  }
  
  return { needsAdjustment: false, reason: 'none', currentMargin: margin, targetMargin: item.min_margin };
}
```

##### ステップ2: 新価格の計算
```typescript
interface PriceProposal {
  proposedPrice: number;
  expectedMargin: number;
  expectedProfit: number;
  isRedRisk: boolean;
  adjustmentReason: string;
}

function calculateOptimalPrice(
  item: Item,
  competitorPrices: CompetitorPrice[]
): PriceProposal {
  // 1. 最低必要価格の計算
  const minRequiredPrice = calculateMinPrice(
    item.cost,
    item.min_margin,
    item.min_profit_amount
  );
  
  // 2. 競合最安価格の取得
  const lowestCompetitor = Math.min(
    ...competitorPrices.map(p => p.lowest_price)
  );
  
  // 3. 目標価格の決定
  // 競合より10%安くしたい
  const targetPrice = lowestCompetitor * 0.9;
  
  // 4. 赤字判定
  if (targetPrice < minRequiredPrice) {
    // 赤字になる場合は、最低価格を提案
    return {
      proposedPrice: minRequiredPrice,
      expectedMargin: item.min_margin,
      expectedProfit: calculateProfit(minRequiredPrice, item.cost),
      isRedRisk: true,
      adjustmentReason: '競合より高いが、利益確保のため最低価格を設定'
    };
  }
  
  // 5. 利益確保可能な場合
  return {
    proposedPrice: targetPrice,
    expectedMargin: calculateMargin(targetPrice, item.cost),
    expectedProfit: calculateProfit(targetPrice, item.cost),
    isRedRisk: false,
    adjustmentReason: '競合より10%安く、利益確保可能'
  };
}
```

##### ステップ3: 価格調整キューへの登録
```typescript
async function queuePriceAdjustment(
  item: Item,
  proposal: PriceProposal
): Promise<void> {
  await supabase.from('price_adjustment_queue').insert({
    item_id: item.id,
    current_price: item.current_price,
    proposed_price: proposal.proposedPrice,
    adjustment_reason: proposal.adjustmentReason,
    expected_margin: proposal.expectedMargin,
    expected_profit: proposal.expectedProfit,
    is_red_risk: proposal.isRedRisk,
    status: 'pending_approval',
    created_at: new Date().toISOString()
  });
  
  // アラート通知
  if (proposal.isRedRisk) {
    await sendAlert({
      type: 'red_risk',
      item_id: item.id,
      message: `商品 ${item.name} が赤字リスクです`
    });
  }
}
```

#### データベーステーブル

##### price_adjustment_queue（価格調整キュー）
```sql
CREATE TABLE price_adjustment_queue (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,
    ebay_item_id VARCHAR(100),
    
    -- 価格情報
    current_price DECIMAL(10,2) NOT NULL,
    proposed_price DECIMAL(10,2) NOT NULL,
    price_difference DECIMAL(10,2) GENERATED ALWAYS AS (proposed_price - current_price) STORED,
    
    -- 調整理由
    adjustment_reason TEXT,
    trigger_type VARCHAR(50), -- 'cost_change', 'competitor', 'manual', 'batch'
    
    -- 利益予測
    expected_margin DECIMAL(5,2),
    expected_profit DECIMAL(10,2),
    current_margin DECIMAL(5,2),
    
    -- リスク評価
    is_red_risk BOOLEAN DEFAULT FALSE,
    risk_level VARCHAR(20), -- 'low', 'medium', 'high'
    
    -- 承認フロー
    status VARCHAR(50) DEFAULT 'pending_approval',
    -- 'pending_approval', 'approved', 'rejected', 'applied', 'failed'
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- 実行情報
    applied_at TIMESTAMP WITH TIME ZONE,
    ebay_api_response JSONB,
    
    -- メタデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_price_queue_item ON price_adjustment_queue(item_id);
CREATE INDEX idx_price_queue_status ON price_adjustment_queue(status);
CREATE INDEX idx_price_queue_risk ON price_adjustment_queue(is_red_risk);
```

##### price_update_history（価格更新履歴）
```sql
CREATE TABLE price_update_history (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,
    ebay_item_id VARCHAR(100),
    
    -- 価格変更
    old_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    price_change DECIMAL(10,2) GENERATED ALWAYS AS (new_price - old_price) STORED,
    price_change_percent DECIMAL(5,2),
    
    -- 変更理由
    change_reason TEXT,
    trigger_type VARCHAR(50),
    
    -- eBay API情報
    ebay_api_call_id VARCHAR(100),
    ebay_response JSONB,
    
    -- 結果
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    -- メタデータ
    updated_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_price_history_item ON price_update_history(item_id);
CREATE INDEX idx_price_history_created ON price_update_history(created_at DESC);
```

### 4.3 赤字防止機能

#### 機能概要
価格調整時に赤字リスクを自動判定し、最低利益率・最低利益額を下回る場合は調整を停止する。

#### 赤字判定ロジック

```typescript
interface RedRiskCheck {
  isRedRisk: boolean;
  reasons: string[];
  canAdjust: boolean;
  minSafePrice: number;
}

function checkRedRisk(
  item: Item,
  proposedPrice: number
): RedRiskCheck {
  const reasons: string[] = [];
  let isRedRisk = false;
  
  // 1. 最低利益率チェック
  const margin = calculateMargin(proposedPrice, item.cost);
  if (margin < item.min_margin) {
    reasons.push(
      `利益率 ${margin.toFixed(2)}% < 最低利益率 ${item.min_margin}%`
    );
    isRedRisk = true;
  }
  
  // 2. 最低利益額チェック
  const profit = calculateProfit(proposedPrice, item.cost);
  if (item.min_profit_amount && profit < item.min_profit_amount) {
    reasons.push(
      `利益額 ¥${profit} < 最低利益額 ¥${item.min_profit_amount}`
    );
    isRedRisk = true;
  }
  
  // 3. 原価割れチェック
  const totalCost = calculateTotalCost(item);
  if (proposedPrice < totalCost) {
    reasons.push(`提案価格 $${proposedPrice} < 総コスト $${totalCost}`);
    isRedRisk = true;
  }
  
  // 4. 最低安全価格の計算
  const minSafePrice = Math.max(
    calculatePriceForMargin(item.cost, item.min_margin),
    calculatePriceForProfit(item.cost, item.min_profit_amount),
    totalCost * 1.05 // 5%の安全マージン
  );
  
  return {
    isRedRisk,
    reasons,
    canAdjust: !isRedRisk || proposedPrice >= minSafePrice,
    minSafePrice
  };
}
```

#### アラート通知

```typescript
interface Alert {
  type: 'red_risk' | 'cost_change' | 'competitor_alert';
  severity: 'low' | 'medium' | 'high';
  item_id: string;
  message: string;
  data?: any;
}

async function sendAlert(alert: Alert): Promise<void> {
  // 1. データベースに保存
  await supabase.from('alerts').insert(alert);
  
  // 2. メール通知（高リスクのみ）
  if (alert.severity === 'high') {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[警告] ${alert.type}`,
      body: alert.message
    });
  }
  
  // 3. Slack通知
  await sendSlackMessage({
    channel: '#price-alerts',
    text: alert.message,
    attachments: [
      {
        color: alert.severity === 'high' ? 'danger' : 'warning',
        fields: [
          { title: 'Item ID', value: alert.item_id },
          { title: 'Type', value: alert.type },
          { title: 'Severity', value: alert.severity }
        ]
      }
    ]
  });
}
```

### 4.4 eBay API連携

#### 機能概要
eBay Trading APIを使用して、価格を自動更新する。

#### API仕様

##### ReviseFixedPriceItem（価格更新）
```typescript
async function updateEbayPrice(
  itemId: string,
  newPrice: number
): Promise<EbayUpdateResult> {
  const ebayApi = new EbayTradingAPI({
    appId: process.env.EBAY_APP_ID,
    certId: process.env.EBAY_CERT_ID,
    devId: process.env.EBAY_DEV_ID,
    authToken: process.env.EBAY_AUTH_TOKEN
  });
  
  try {
    const response = await ebayApi.ReviseFixedPriceItem({
      ItemID: itemId,
      Item: {
        StartPrice: newPrice
      }
    });
    
    // 履歴保存
    await savePriceUpdateHistory({
      item_id: itemId,
      new_price: newPrice,
      success: true,
      ebay_response: response
    });
    
    return {
      success: true,
      itemId,
      newPrice,
      ebayResponse: response
    };
  } catch (error) {
    // エラー処理
    await savePriceUpdateHistory({
      item_id: itemId,
      new_price: newPrice,
      success: false,
      error_message: error.message
    });
    
    return {
      success: false,
      itemId,
      error: error.message
    };
  }
}
```

##### バルク更新
```typescript
async function bulkUpdateEbayPrices(
  updates: Array<{ itemId: string; newPrice: number }>
): Promise<BulkUpdateResult> {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  // Rate limit対策: 5件ずつ、1秒待機
  const batches = chunk(updates, 5);
  
  for (const batch of batches) {
    const batchResults = await Promise.allSettled(
      batch.map(update => updateEbayPrice(update.itemId, update.newPrice))
    );
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({
          itemId: batch[index].itemId,
          error: result.status === 'rejected' 
            ? result.reason 
            : result.value.error
        });
      }
    });
    
    // Rate limit対策
    await sleep(1000);
  }
  
  return results;
}
```

---

## 5. データベース設計

### 5.1 新規テーブル一覧

#### cost_change_history（仕入値変動履歴）
```sql
CREATE TABLE cost_change_history (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    
    -- 仕入値情報
    old_cost DECIMAL(10,2) NOT NULL,
    new_cost DECIMAL(10,2) NOT NULL,
    cost_difference DECIMAL(10,2) GENERATED ALWAYS AS (new_cost - old_cost) STORED,
    cost_change_percent DECIMAL(5,2),
    
    -- 変更理由
    change_reason VARCHAR(255),
    change_source VARCHAR(50), -- 'manual', 'import', 'webhook', 'api'
    
    -- 影響分析
    affected_price DECIMAL(10,2),
    margin_impact DECIMAL(5,2),
    requires_price_adjustment BOOLEAN DEFAULT FALSE,
    
    -- メタデータ
    changed_by VARCHAR(100),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_cost_change_item ON cost_change_history(item_id);
CREATE INDEX idx_cost_change_date ON cost_change_history(changed_at DESC);
CREATE INDEX idx_cost_change_processed ON cost_change_history(processed);
```

#### auto_pricing_settings（自動価格設定）
```sql
CREATE TABLE auto_pricing_settings (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) UNIQUE NOT NULL,
    sku VARCHAR(100),
    
    -- 最低利益設定
    min_margin_percent DECIMAL(5,2) DEFAULT 20.00,
    min_profit_amount DECIMAL(10,2),
    
    -- 最安値追従設定
    auto_tracking_enabled BOOLEAN DEFAULT FALSE,
    target_competitor_ratio DECIMAL(5,2) DEFAULT 0.90, -- 90% of competitor
    max_price_decrease_percent DECIMAL(5,2) DEFAULT 10.00,
    max_price_increase_percent DECIMAL(5,2) DEFAULT 20.00,
    
    -- 対象国設定
    target_countries TEXT[], -- ['US', 'UK', 'DE', 'AU', 'CA', 'FR', 'IT', 'ES']
    
    -- 価格範囲制限
    min_allowed_price DECIMAL(10,2),
    max_allowed_price DECIMAL(10,2),
    
    -- 調整頻度
    adjustment_frequency VARCHAR(20) DEFAULT 'daily', -- 'daily', 'weekly', 'manual'
    last_adjusted_at TIMESTAMP WITH TIME ZONE,
    
    -- メタデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auto_pricing_item ON auto_pricing_settings(item_id);
CREATE INDEX idx_auto_pricing_enabled ON auto_pricing_settings(auto_tracking_enabled);
```

#### ebay_mug_countries（MUG対応国マスタ）
```sql
CREATE TABLE ebay_mug_countries (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(3) UNIQUE NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    ebay_site_id INTEGER NOT NULL,
    ebay_global_id VARCHAR(20) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    
    -- API設定
    api_endpoint VARCHAR(255),
    finding_api_url VARCHAR(255),
    
    -- 利用可能性
    is_active BOOLEAN DEFAULT TRUE,
    supports_finding_api BOOLEAN DEFAULT TRUE,
    
    -- メタデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 初期データ投入
INSERT INTO ebay_mug_countries (country_code, country_name, ebay_site_id, ebay_global_id, currency_code) VALUES
('US', 'United States', 0, 'EBAY-US', 'USD'),
('UK', 'United Kingdom', 3, 'EBAY-GB', 'GBP'),
('DE', 'Germany', 77, 'EBAY-DE', 'EUR'),
('AU', 'Australia', 15, 'EBAY-AU', 'AUD'),
('CA', 'Canada', 2, 'EBAY-CA', 'CAD'),
('FR', 'France', 71, 'EBAY-FR', 'EUR'),
('IT', 'Italy', 101, 'EBAY-IT', 'EUR'),
('ES', 'Spain', 186, 'EBAY-ES', 'EUR');
```

#### price_optimization_rules（価格最適化ルール）
```sql
CREATE TABLE price_optimization_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'global', 'category', 'item'
    
    -- 適用条件
    category_id INTEGER,
    item_id VARCHAR(100),
    condition_type VARCHAR(50),
    price_range_min DECIMAL(10,2),
    price_range_max DECIMAL(10,2),
    
    -- 最適化設定
    target_margin_percent DECIMAL(5,2),
    competitor_price_ratio DECIMAL(5,2),
    max_adjustment_percent DECIMAL(5,2),
    
    -- 制約条件
    min_margin_percent DECIMAL(5,2) NOT NULL,
    min_profit_amount DECIMAL(10,2),
    max_loss_percent DECIMAL(5,2) DEFAULT 0.00,
    
    -- 実行設定
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- メタデータ
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_optimization_rules_type ON price_optimization_rules(rule_type);
CREATE INDEX idx_optimization_rules_category ON price_optimization_rules(category_id);
CREATE INDEX idx_optimization_rules_active ON price_optimization_rules(is_active);
```

### 5.2 既存テーブルの拡張

#### inventory_management（在庫マスタ）
```sql
-- 追加カラム
ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS cost_jpy DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS last_cost_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cost_change_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_pricing_enabled BOOLEAN DEFAULT FALSE;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_inventory_auto_pricing 
ON inventory_management(auto_pricing_enabled);
```

#### profit_margin_settings（利益率設定）
```sql
-- 追加カラム
ALTER TABLE profit_margin_settings
ADD COLUMN IF NOT EXISTS min_profit_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS allow_loss BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS max_loss_percent DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS adjustment_frequency VARCHAR(20) DEFAULT 'manual';

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_profit_settings_type 
ON profit_margin_settings(setting_type);
```

---

## 6. API設計

### 6.1 API一覧

#### 在庫管理API

##### POST /api/inventory/cost-change
仕入値変更を記録し、価格調整をトリガー

**リクエスト**
```json
{
  "item_id": "ITEM-12345",
  "old_cost": 5000,
  "new_cost": 5500,
  "change_reason": "仕入先価格改定",
  "change_source": "manual"
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "change_id": 123,
    "item_id": "ITEM-12345",
    "cost_difference": 500,
    "margin_impact": -2.5,
    "requires_adjustment": true,
    "adjustment_queued": true
  }
}
```

##### POST /api/webhooks/cost-change
在庫管理ツールからのWebhook受信

**ペイロード**
```json
{
  "event": "cost.updated",
  "timestamp": "2025-10-03T10:00:00Z",
  "data": {
    "item_id": "ITEM-12345",
    "old_cost": 5000,
    "new_cost": 5500,
    "changed_by": "user@example.com"
  }
}
```

#### 利益計算API

##### POST /api/pricing/recalculate
価格再計算を実行

**リクエスト**
```json
{
  "item_id": "ITEM-12345",
  "new_cost": 5500,
  "trigger": "cost_change"
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "item_id": "ITEM-12345",
    "current_price": 150.00,
    "current_margin": 25.5,
    "new_required_price": 165.00,
    "new_expected_margin": 22.3,
    "min_safe_price": 160.00,
    "adjustment_recommended": true
  }
}
```

#### 競合価格API

##### POST /api/competitor/fetch-prices
競合価格を取得

**リクエスト**
```json
{
  "item_id": "ITEM-12345",
  "keywords": "vintage camera",
  "countries": ["US", "UK", "DE"],
  "category_id": 625
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "item_id": "ITEM-12345",
    "prices": [
      {
        "country": "US",
        "lowest_price": 145.00,
        "average_price": 165.00,
        "currency": "USD",
        "listings_count": 25
      },
      {
        "country": "UK",
        "lowest_price": 120.00,
        "average_price": 140.00,
        "currency": "GBP",
        "listings_count": 18
      }
    ],
    "fetched_at": "2025-10-03T10:00:00Z"
  }
}
```

##### GET /api/competitor/history/:item_id
競合価格履歴を取得

**レスポンス**
```json
{
  "success": true,
  "data": {
    "item_id": "ITEM-12345",
    "history": [
      {
        "date": "2025-10-01",
        "US": { "lowest": 150.00, "average": 170.00 },
        "UK": { "lowest": 125.00, "average": 145.00 }
      },
      {
        "date": "2025-10-02",
        "US": { "lowest": 145.00, "average": 165.00 },
        "UK": { "lowest": 120.00, "average": 140.00 }
      }
    ]
  }
}
```

#### 価格調整API

##### GET /api/price-adjustment/queue
価格調整キューを取得

**クエリパラメータ**
- status: 'pending_approval' | 'approved' | 'rejected' | 'applied'
- risk: 'low' | 'medium' | 'high'
- limit: number
- offset: number

**レスポンス**
```json
{
  "success": true,
  "data": {
    "total": 25,
    "items": [
      {
        "id": 1,
        "item_id": "ITEM-12345",
        "current_price": 150.00,
        "proposed_price": 145.00,
        "adjustment_reason": "競合より10%安く設定",
        "expected_margin": 22.3,
        "is_red_risk": false,
        "status": "pending_approval",
        "created_at": "2025-10-03T10:00:00Z"
      }
    ]
  }
}
```

##### POST /api/price-adjustment/approve
価格調整を承認

**リクエスト**
```json
{
  "adjustment_ids": [1, 2, 3],
  "approved_by": "admin@example.com",
  "apply_immediately": true
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "approved_count": 3,
    "applied_count": 3,
    "failed_count": 0,
    "results": [
      {
        "adjustment_id": 1,
        "item_id": "ITEM-12345",
        "success": true,
        "new_price": 145.00
      }
    ]
  }
}
```

##### POST /api/price-adjustment/reject
価格調整を却下

**リクエスト**
```json
{
  "adjustment_ids": [4, 5],
  "rejection_reason": "競合価格が不正確",
  "rejected_by": "admin@example.com"
}
```

#### eBay連携API

##### POST /api/ebay/update-price
eBay価格を更新

**リクエスト**
```json
{
  "ebay_item_id": "123456789012",
  "new_price": 145.00
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "ebay_item_id": "123456789012",
    "old_price": 150.00,
    "new_price": 145.00,
    "updated_at": "2025-10-03T10:05:00Z",
    "ebay_response": {
      "Ack": "Success",
      "Timestamp": "2025-10-03T10:05:00.000Z"
    }
  }
}
```

##### POST /api/ebay/bulk-update-prices
一括価格更新

**リクエスト**
```json
{
  "updates": [
    { "ebay_item_id": "123456789012", "new_price": 145.00 },
    { "ebay_item_id": "123456789013", "new_price": 200.00 }
  ]
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "total": 2,
    "success_count": 2,
    "failed_count": 0,
    "results": [
      {
        "ebay_item_id": "123456789012",
        "success": true,
        "new_price": 145.00
      }
    ]
  }
}
```

### 6.2 Webhook設計

#### /api/webhooks/cost-change
仕入値変動通知

**ペイロード形式**
```json
{
  "event": "cost.updated",
  "timestamp": "2025-10-03T10:00:00Z",
  "data": {
    "item_id": "ITEM-12345",
    "sku": "SKU-001",
    "old_cost": 5000,
    "new_cost": 5500,
    "currency": "JPY",
    "changed_by": "user@example.com",
    "change_reason": "仕入先価格改定"
  }
}
```

**処理フロー**
1. Webhook受信
2. 署名検証
3. cost_change_history保存
4. 価格再計算トリガー
5. 必要に応じてキュー登録
6. 200 OK返却

---

## 7. UI/UX設計

### 7.1 新規ページ

#### ① 価格最適化ダッシュボード（/price-optimization）

**目的**: 価格調整の承認・管理

**レイアウト**
```
┌────────────────────────────────────────────────┐
│ 📊 価格最適化ダッシュボード                    │
├────────────────────────────────────────────────┤
│                                                 │
│ [統計カード]                                    │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│ │承認待│ │赤字  │ │今日の│ │競合  │           │
│ │  15  │ │リスク│ │調整  │ │変動  │           │
│ │  件  │ │ 3件  │ │ 8件  │ │12件  │           │
│ └──────┘ └──────┘ └──────┘ └──────┘           │
│                                                 │
│ [フィルター]                                    │
│ ステータス: [▼ 全て]  リスク: [▼ 全て]        │
│ 調整理由: [▼ 全て]  期間: [▼ 今日]            │
│                                                 │
│ [価格調整キュー]                                │
│ ┌────────────────────────────────────────────┐ │
│ │商品名    │現在価格│提案価格│利益率│リスク│  │ │
│ ├────────────────────────────────────────────┤ │
│ │Camera A  │ $150  │ $145  │22.3% │低   │✓ │ │
│ │Watch B   │ $200  │ $210  │18.5% │中   │✓ │ │
│ │Book C    │ $50   │ $55   │15.2% │高⚠  │✓ │ │
│ └────────────────────────────────────────────┘ │
│                                                 │
│ [一括操作]                                      │
│ [✓ 選択した3件を承認] [× 却下]                │
│                                                 │
└────────────────────────────────────────────────┘
```

**主要機能**
- 価格調整キューの一覧表示
- 赤字リスクの色分け表示
- 承認/却下のワンクリック操作
- 一括承認機能
- 調整理由の詳細表示
- 利益シミュレーション

#### ② 競合分析ダッシュボード（/competitor-analysis）

**目的**: 競合価格の可視化・分析

**レイアウト**
```
┌────────────────────────────────────────────────┐
│ 📈 競合価格分析                                 │
├────────────────────────────────────────────────┤
│                                                 │
│ [商品選択]                                      │
│ 商品: [Camera A ▼]  カテゴリ: [Electronics ▼] │
│                                                 │
│ [国別価格比較]                                  │
│ ┌────────────────────────────────────────────┐ │
│ │     │自社価格│競合最安│競合平均│差額      │ │
│ ├────────────────────────────────────────────┤ │
│ │ US  │ $150  │ $145  │ $165  │+$5 ⚠    │ │
│ │ UK  │ £120  │ £115  │ £130  │+£5 ⚠    │ │
│ │ DE  │ €135  │ €140  │ €150  │-€5 ✓    │ │
│ │ AU  │ A$200 │ A$195 │ A$210 │+A$5 ⚠   │ │
│ └────────────────────────────────────────────┘ │
│                                                 │
│ [価格推移グラフ]                                │
│ ┌────────────────────────────────────────────┐ │
│ │ 価格                                        │ │
│ │  $200 ┬─────────────────────────────────   │ │
│ │       │    ╱╲  自社                        │ │
│ │  $150 ┼───╱──╲───────────────────────     │ │
│ │       │        ╲  ╱╲  競合最安             │ │
│ │  $100 ┴─────────╲╱──╲─────────────────    │ │
│ │       10/1   10/5   10/10  10/15          │ │
│ └────────────────────────────────────────────┘ │
│                                                 │
│ [推奨アクション]                                │
│ 💡 USとUKで競合より高いです。$140に下げることを│
│    推奨します（利益率: 21.5%）                  │
│                                                 │
│ [価格調整を申請]                                │
│                                                 │
└────────────────────────────────────────────────┘
```

**主要機能**
- 国別価格比較表
- 価格推移グラフ
- 自動推奨アクション
- 価格調整申請
- 履歴データの可視化

### 7.2 既存ページの拡張

#### ① 商品編集UI（/tools/editing）

**追加タブ**: 「価格設定」

**レイアウト**
```
┌────────────────────────────────────────────────┐
│ [商品情報] [画像] [カテゴリ] [価格設定★] [出品]│
├────────────────────────────────────────────────┤
│                                                 │
│ 📊 価格自動調整設定                             │
│                                                 │
│ [基本設定]                                      │
│ ┌────────────────────────────────────────────┐ │
│ │ 最安値追従を有効にする                      │ │
│ │ [ ✓ ] 自動的に競合最安価格に追従            │ │
│ │                                              │ │
│ │ 最低利益率: [  20  ] %                      │ │
│ │ 最低利益額: [ 1000 ] 円                     │ │
│ └────────────────────────────────────────────┘ │
│                                                 │
│ [詳細設定]                                      │
│ ┌────────────────────────────────────────────┐ │
│ │ 対象国:                                      │ │
│ │ [✓] USA    [✓] UK     [✓] Germany          │ │
│ │ [✓] AU     [ ] Canada [ ] France            │ │
│ │                                              │ │
│ │ 価格調整範囲:                                │ │
│ │ 最小価格: [ $100 ]  最大価格: [ $300 ]     │ │
│ │                                              │ │
│ │ 調整頻度: [ 毎日 ▼ ]                        │ │
│ │ 競合価格の何%に設定: [ 90 ] %               │ │
│ └────────────────────────────────────────────┘ │
│                                                 │
│ [現在の価格情報]                                │
│ ┌────────────────────────────────────────────┐ │
│ │ 現在価格: $150                              │ │
│ │ 現在利益率: 25.5%                           │ │
│ │ 競合最安: $145 (USA)                        │ │
│ │ 推奨価格: $140 (利益率: 22.3%)              │ │
│ └────────────────────────────────────────────┘ │
│                                                 │
│ [保存] [キャンセル]                             │
│                                                 │
└────────────────────────────────────────────────┘
```

#### ② 在庫管理UI（/inventory）

**追加カラム**
- 最終仕入値更新日
- 自動価格調整: ON/OFF
- 価格調整ステータス
- 次回調整予定

**アクション追加**
- 一括で自動価格調整を有効化
- 仕入値一括更新

---

## 8. 開発フェーズ

### Phase 1: 基盤構築（2週間）

#### Week 1: データベース・API基盤
**担当**: バックエンド開発

**タスク**
1. データベーススキーマ作成
   - 新規テーブル作成SQL実行
   - 既存テーブルの拡張
   - インデックス最適化
   - マイグレーションスクリプト作成

2. Supabase設定
   - Row Level Security (RLS)設定
   - テーブルパーミッション設定
   - リアルタイム購読設定

3. 基本API実装
   - 仕入値変動API
   - Webhook受信エンドポイント
   - 基本的なCRUD操作

**成果物**
- データベーススキーマ完成
- マイグレーションスクリプト
- 基本API 5本

#### Week 2: 利益計算ロジック拡張
**担当**: バックエンド開発

**タスク**
1. 価格再計算エンジン実装
   - 仕入値変動検知ロジック
   - 利益率再計算
   - 赤字判定ロジック

2. 最低利益率・最低利益額チェック
   - 商品個別設定対応
   - カテゴリデフォルト設定

3. ユニットテスト作成
   - 計算ロジックのテスト
   - エッジケースのテスト

**成果物**
- 価格再計算エンジン
- 赤字判定ロジック
- ユニットテスト 20件以上

### Phase 2: 競合価格取得機能（2週間）

#### Week 3: eBay Finding API統合
**担当**: バックエンド開発

**タスク**
1. eBay Finding API実装
   - API認証設定
   - 価格取得ロジック
   - MUG 8カ国対応

2. 競合価格保存
   - データベース保存
   - 重複チェック
   - 履歴管理

3. エラーハンドリング
   - Rate limit対策
   - リトライロジック
   - エラーログ記録

**成果物**
- eBay Finding API統合
- 競合価格取得API
- エラーハンドリング

#### Week 4: バッチ処理・スケジューラー
**担当**: バックエンド開発

**タスク**
1. 競合価格取得バッチ
   - 日次バッチ実装
   - 並列処理対応
   - Rate limit考慮

2. 価格最適化バッチ
   - 価格比較ロジック
   - 調整提案生成
   - キュー登録

3. Cron設定
   - Vercel Cron設定
   - バッチ実行ログ
   - エラー通知

**成果物**
- 競合価格取得バッチ
- 価格最適化バッチ
- Cron設定完了

### Phase 3: UI開発（2週間）

#### Week 5: 価格最適化ダッシュボード
**担当**: フロントエンド開発

**タスク**
1. ページ作成
   - `/price-optimization` ページ
   - レイアウト実装
   - レスポンシブ対応

2. 価格調整キュー表示
   - データテーブル実装
   - フィルター機能
   - ソート機能

3. 承認/却下機能
   - 単品承認UI
   - 一括承認UI
   - 却下理由入力
   - 承認確認ダイアログ

4. リアルタイム更新
   - Supabaseリアルタイム購読
   - 自動リフレッシュ
   - 通知表示

**成果物**
- 価格最適化ダッシュボードページ
- 承認/却下機能
- リアルタイム更新

#### Week 6: 競合分析UI・商品編集拡張
**担当**: フロントエンド開発

**タスク**
1. 競合分析ダッシュボード
   - `/competitor-analysis` ページ
   - 国別価格比較表
   - 価格推移グラフ（Chart.js / Recharts）

2. 商品編集UI拡張
   - 価格設定タブ追加
   - 自動価格調整設定フォーム
   - 対象国選択UI

3. 在庫管理UI拡張
   - 自動価格調整カラム追加
   - 仕入値一括更新機能
   - フィルター追加

**成果物**
- 競合分析ダッシュボード
- 商品編集UI拡張
- 在庫管理UI拡張

### Phase 4: eBay API連携（1週間）

#### Week 7: eBay Trading API統合
**担当**: バックエンド開発

**タスク**
1. eBay Trading API実装
   - API認証設定
   - ReviseFixedPriceItem実装
   - バルク更新実装

2. 価格更新ロジック
   - 更新履歴保存
   - エラーハンドリング
   - Rate limit対策

3. Webhook統合
   - 承認時の自動更新
   - 更新結果の通知
   - エラー時のリトライ

**成果物**
- eBay Trading API統合
- 自動価格更新機能
- 更新履歴管理

### Phase 5: テスト・デバッグ（1週間）

#### Week 8: 統合テスト・バグ修正
**担当**: 全員

**タスク**
1. 統合テスト
   - エンドツーエンドテスト
   - パフォーマンステスト
   - 負荷テスト

2. バグ修正
   - 致命的バグの修正
   - UI/UXの改善
   - エラーメッセージの改善

3. ドキュメント作成
   - ユーザーマニュアル
   - API仕様書
   - 運用マニュアル

**成果物**
- テストレポート
- バグ修正完了
- ドキュメント一式

### Phase 6: 本番リリース（1週間）

#### Week 9: 段階的リリース
**担当**: 全員

**タスク**
1. ステージング環境デプロイ
   - 本番同等環境でのテスト
   - データ移行テスト
   - パフォーマンス確認

2. 本番環境デプロイ
   - データベースマイグレーション実行
   - API デプロイ
   - フロントエンドデプロイ

3. モニタリング設定
   - エラー監視
   - パフォーマンス監視
   - アラート設定

**成果物**
- 本番環境リリース完了
- モニタリング設定完了
- 運用開始

---

## 9. 技術仕様

### 9.1 技術スタック

#### フロントエンド
```yaml
Framework: Next.js 14 (App Router)
Language: TypeScript 5.x
UI Library: React 18
Styling: Tailwind CSS 3.x
Component Library: shadcn/ui
Charts: Recharts / Chart.js
State Management: React Hooks (useState, useEffect, useContext)
Data Fetching: 
  - Supabase Client
  - SWR (キャッシュ・リアルタイム更新)
Form Handling: React Hook Form + Zod
```

#### バックエンド
```yaml
API: Next.js API Routes
Database: Supabase (PostgreSQL 15)
ORM: Supabase Client (Type-safe)
Authentication: Supabase Auth
File Storage: Supabase Storage
Real-time: Supabase Realtime
```

#### 外部API
```yaml
eBay Finding API: v1.0
eBay Trading API: v1249
Rate Limiting: 5,000 calls/day (Finding), 5,000 calls/day (Trading)
```

#### インフラ
```yaml
Hosting: Vercel
Database: Supabase Cloud
Cron Jobs: Vercel Cron
Monitoring: Vercel Analytics + Sentry
Logging: Supabase Logs + Custom Logger
```

### 9.2 パフォーマンス要件

#### API応答時間
| エンドポイント | 目標 | 最大 |
|--------------|------|------|
| GET /api/inventory/* | 500ms | 2s |
| POST /api/pricing/recalculate | 1s | 3s |
| GET /api/competitor/history | 1s | 3s |
| POST /api/price-adjustment/approve | 500ms | 2s |
| POST /api/ebay/update-price | 2s | 5s |

#### バッチ処理時間
| バッチ | 対象件数 | 目標時間 |
|--------|---------|---------|
| 競合価格取得 | 100商品 | 10分 |
| 競合価格取得 | 1,000商品 | 90分 |
| 価格最適化 | 100商品 | 5分 |
| 価格最適化 | 1,000商品 | 30分 |

#### データベース
```yaml
接続プール: 最大20接続
クエリタイムアウト: 10秒
インデックス: 全主要カラムに設定
パーティショニング: 1年ごと（履歴テーブル）
```

### 9.3 セキュリティ

#### 認証・認可
```yaml
認証方式: Supabase Auth (JWT)
セッション管理: Cookie-based (httpOnly, secure)
権限管理: Row Level Security (RLS)
API認証: Bearer Token
Webhook認証: HMAC署名検証
```

#### データ保護
```yaml
暗号化: 
  - データベース: AES-256
  - 通信: TLS 1.3
  - 機密情報: Vault (環境変数)
  
個人情報:
  - 最小限の収集
  - 暗号化保存
  - アクセスログ記録
```

#### API Rate Limiting
```yaml
一般API: 100 req/min/IP
管理API: 1,000 req/min/user
Webhook: 10 req/min/source
eBay API: 5,000 req/day (外部制限)
```

### 9.4 エラーハンドリング

#### エラー分類
```typescript
enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  DATABASE_ERROR = 'database_error',
  EXTERNAL_API_ERROR = 'external_api_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  NOT_FOUND_ERROR = 'not_found_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  INTERNAL_ERROR = 'internal_error'
}
```

#### エラーレスポンス形式
```typescript
interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    details?: any;
    code?: string;
    timestamp: string;
    request_id: string;
  };
}
```

#### リトライロジック
```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
}

// 例: eBay API呼び出し
const EBAY_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};
```

### 9.5 ログ設計

#### ログレベル
```typescript
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}
```

#### ログ形式
```typescript
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: {
    user_id?: string;
    item_id?: string;
    request_id?: string;
    [key: string]: any;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

#### ログ保存先
```yaml
開発環境: Console
ステージング: Supabase Logs
本番環境: 
  - Supabase Logs (7日保存)
  - Sentry (エラーログ、90日保存)
  - Custom Logger (重要ログ、永続保存)
```

---

## 10. リスク管理

### 10.1 技術的リスク

#### リスク1: eBay API Rate Limit超過
**発生確率**: 中  
**影響度**: 高

**対策**
- Rate limit監視機能の実装
- キャッシュ戦略の導入（1時間キャッシュ）
- バッチ処理の最適化（並列度調整）
- エラー時のリトライ間隔調整
- 複数APIキーの準備

**緊急対応**
- 手動更新に切り替え
- バッチ実行頻度を下げる（日次→週次）
- 対象商品を絞り込む

#### リスク2: データベース負荷増大
**発生確率**: 中  
**影響度**: 中

**対策**
- インデックス最適化
- クエリ最適化（N+1問題の回避）
- 接続プール管理
- パーティショニング導入（履歴テーブル）
- 定期的なVACUUM実行

**緊急対応**
- Supabaseプラン上位へアップグレード
- 読み取り専用レプリカの導入
- キャッシュ層の追加

#### リスク3: 計算ロジックのバグ
**発生確率**: 中  
**影響度**: 高（赤字リスク）

**対策**
- 包括的なユニットテスト（カバレッジ80%以上）
- エッジケースのテスト
- ステージング環境での十分なテスト期間
- 本番でのシャドウモード運用（最初の2週間）
- 手動承認フローの必須化

**緊急対応**
- 自動調整の即座停止
- 手動価格設定への切り替え
- バグ修正後の段階的再開

### 10.2 運用リスク

#### リスク4: 競合価格データの不正確さ
**発生確率**: 低  
**影響度**: 中

**対策**
- 複数ソースからのデータ取得
- 異常値検知ロジック
- 価格推移の可視化
- ユーザーによる手動確認フロー

**緊急対応**
- 特定国のデータを一時除外
- 手動価格設定への切り替え

#### リスク5: 仕入値変動の遅延通知
**発生確率**: 低  
**影響度**: 中

**対策**
- Webhook + Polling の二重化
- 変動検知の定期チェック（5分間隔）
- アラート通知の複数チャネル化

**緊急対応**
- 手動での仕入値更新
- バッチ処理での一括再計算

### 10.3 ビジネスリスク

#### リスク6: 過度な価格変更による顧客離れ
**発生確率**: 低  
**影響度**: 高

**対策**
- 価格変更頻度の制限（1日1回まで）
- 価格変動幅の制限（±10%まで）
- 段階的な価格調整（一気に下げない）
- 価格変更履歴の可視化

**モニタリング指標**
- 価格変更後の売上変化
- 顧客からの問い合わせ数
- 競合との価格差

#### リスク7: 赤字商品の見逃し
**発生確率**: 低  
**影響度**: 高

**対策**
- 多重の赤字チェック（利益率・利益額・原価）
- アラート通知の確実な配信
- 週次レポートでの再確認
- 手動承認の必須化（高リスク商品）

**モニタリング指標**
- 赤字商品数
- 平均利益率
- 利益額の推移

---

## 11. 成功指標（KPI）

### 11.1 開発KPI

| 指標 | 目標値 | 測定方法 |
|-----|--------|---------|
| 開発完了率 | 100% | タスク完了数 / 全タスク数 |
| テストカバレッジ | 80%以上 | Jest coverage report |
| バグ密度 | 10件以下/1000行 | SonarQube |
| API応答時間 | 2秒以内 | Vercel Analytics |
| ページロード時間 | 3秒以内 | Lighthouse |

### 11.2 運用KPI

| 指標 | 目標値 | 測定方法 |
|-----|--------|---------|
| 自動価格調整成功率 | 95%以上 | 成功数 / 総実行数 |
| 赤字商品検知率 | 100% | 検知数 / 実際の赤字数 |
| 競合価格取得成功率 | 90%以上 | 成功数 / 総試行数 |
| 価格更新成功率 | 98%以上 | 成功数 / 総更新数 |
| システム稼働率 | 99.5%以上 | Uptime monitoring |

### 11.3 ビジネスKPI

| 指標 | 目標値 | 測定方法 |
|-----|--------|---------|
| 平均利益率の改善 | +5%以上 | 導入前後比較 |
| 価格競争力の向上 | 上位20%維持 | 競合価格比較 |
| 価格調整にかかる工数削減 | -80% | 作業時間計測 |
| 赤字商品の削減 | -90% | 赤字商品数推移 |
| 売上の増加 | +10%以上 | 売上推移 |

---

## 12. リリース計画

### 12.1 リリーススケジュール

#### ステージング環境リリース
**日程**: Week 8 月曜日  
**内容**: 全機能のステージング環境デプロイ  
**期間**: 1週間（テスト期間）

#### 本番環境ソフトローンチ
**日程**: Week 9 月曜日  
**内容**: 
- データベースマイグレーション実行
- API・フロントエンドデプロイ
- 限定ユーザーでの運用開始（10商品）

#### 段階的ロールアウト
```yaml
Week 9 (Day 1-2):
  対象: 10商品
  機能: 手動承認のみ
  
Week 9 (Day 3-4):
  対象: 50商品
  機能: 手動承認のみ
  
Week 9 (Day 5-7):
  対象: 100商品
  機能: 手動承認 + 自動更新（低リスク商品のみ）
  
Week 10:
  対象: 全商品
  機能: 全機能有効化
```

### 12.2 ロールバック計画

#### データベースロールバック
```sql
-- マイグレーション前のバックアップ取得
pg_dump -h [HOST] -U [USER] -d [DB] > backup_20251003.sql

-- ロールバック実行
psql -h [HOST] -U [USER] -d [DB] < backup_20251003.sql
```

#### アプリケーションロールバック
```bash
# Vercelの前のデプロイに戻す
vercel rollback [DEPLOYMENT_URL]

# または特定のコミットに戻す
git revert [COMMIT_HASH]
git push origin main
```

#### データ整合性チェック
```typescript
// ロールバック後の整合性確認スクリプト
async function checkDataIntegrity() {
  // 1. 孤児レコードチェック
  // 2. 外部キー整合性チェック
  // 3. 価格データの妥当性チェック
  // 4. 在庫数の整合性チェック
}
```

---

## 13. 保守・運用

### 13.1 日次運用タスク

#### モーニングチェック（毎朝9:00）
```yaml
- [ ] バッチ実行ログ確認
- [ ] エラーログ確認（Sentry）
- [ ] 価格調整キュー確認
- [ ] 赤字アラート確認
- [ ] システム稼働率確認
```

#### 承認作業（随時）
```yaml
- [ ] 価格調整の承認/却下
- [ ] 赤字リスク商品の確認
- [ ] 競合価格の妥当性確認
```

#### イブニングレビュー（毎夕18:00）
```yaml
- [ ] 当日の価格更新数確認
- [ ] 更新成功率確認
- [ ] エラー発生状況確認
- [ ] KPI達成状況確認
```

### 13.2 週次運用タスク

#### 毎週月曜日
```yaml
- [ ] 週次レポート確認
- [ ] 競合価格トレンド分析
- [ ] 利益率推移確認
- [ ] バッチ処理最適化検討
```

#### 毎週金曜日
```yaml
- [ ] データベースバックアップ確認
- [ ] システムパフォーマンス分析
- [ ] 来週の計画確認
```

### 13.3 月次運用タスク

#### 月初
```yaml
- [ ] 月次KPIレポート作成
- [ ] システム利用状況分析
- [ ] コスト分析（eBay APIコール数、Supabase使用量）
- [ ] 改善提案のまとめ
```

#### 月中
```yaml
- [ ] データベースメンテナンス（VACUUM, ANALYZE）
- [ ] 古いログの削除（90日以前）
- [ ] パフォーマンスチューニング
```

#### 月末
```yaml
- [ ] 月次レポート提出
- [ ] 来月の目標設定
- [ ] システムアップデート計画
```

### 13.4 障害対応フロー

#### レベル1: 軽微な障害（5分以内に復旧）
```yaml
例:
  - 一部APIの一時的エラー
  - 単一バッチの失敗
  
対応:
  1. エラーログ確認
  2. 自動リトライ実行
  3. リトライ失敗時は手動再実行
  4. 障害ログ記録
```

#### レベル2: 中程度の障害（30分以内に復旧）
```yaml
例:
  - 複数APIの同時エラー
  - データベース接続エラー
  - eBay API Rate Limit超過
  
対応:
  1. 影響範囲の特定
  2. 自動処理の一時停止
  3. 手動処理への切り替え
  4. 根本原因の調査
  5. 修正・再開
  6. 事後レポート作成
```

#### レベル3: 重大な障害（即座に対応）
```yaml
例:
  - システム全体ダウン
  - データ不整合
  - 大量の赤字商品発生
  
対応:
  1. 全自動処理の即座停止
  2. 管理者への緊急通知
  3. 影響範囲の特定
  4. ロールバック実行
  5. データ整合性チェック
  6. 段階的復旧
  7. 詳細な事後レポート作成
  8. 再発防止策の実施
```

---

## 14. ドキュメント一覧

### 14.1 技術ドキュメント

| ドキュメント名 | 内容 | 対象者 |
|--------------|------|--------|
| システム設計書 | アーキテクチャ、データフロー | 開発者 |
| データベース設計書 | スキーマ、ER図、インデックス | 開発者 |
| API仕様書 | 全エンドポイントの詳細 | 開発者 |
| コーディング規約 | TypeScript/React規約 | 開発者 |
| テスト仕様書 | テストケース、シナリオ | QA |

### 14.2 運用ドキュメント

| ドキュメント名 | 内容 | 対象者 |
|--------------|------|--------|
| 運用マニュアル | 日次/週次/月次タスク | 運用担当 |
| 障害対応マニュアル | 障害レベル別対応フロー | 運用担当 |
| バックアップ手順書 | データバックアップ方法 | 運用担当 |
| モニタリング設定書 | アラート設定、閾値 | 運用担当 |

### 14.3 ユーザードキュメント

| ドキュメント名 | 内容 | 対象者 |
|--------------|------|--------|
| ユーザーマニュアル | 機能説明、操作方法 | エンドユーザー |
| FAQ | よくある質問と回答 | エンドユーザー |
| チュートリアル動画 | 各機能の使い方 | エンドユーザー |

---

## 15. 付録

### 15.1 用語集

| 用語 | 説明 |
|-----|------|
| MUG | Multi-currency User Experience - eBayの多通貨対応機能 |
| DDP | Delivered Duty Paid - 関税込み配送 |
| DDU | Delivered Duty Unpaid - 関税別配送 |
| FVF | Final Value Fee - eBay販売手数料 |
| SKU | Stock Keeping Unit - 在庫管理単位 |
| RLS | Row Level Security - Supabaseの行レベルセキュリティ |
| Rate Limit | API呼び出し回数制限 |

### 15.2 参考資料

#### eBay API
- [eBay Developer Program](https://developer.ebay.com/)
- [Finding API Documentation](https://developer.ebay.com/DevZone/finding/Concepts/FindingAPIGuide.html)
- [Trading API Documentation](https://developer.ebay.com/DevZone/XML/docs/Reference/eBay/index.html)

#### Supabase
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

#### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

### 15.3 チェックリスト

#### リリース前チェックリスト
```yaml
データベース:
  - [ ] マイグレーションスクリプト準備完了
  - [ ] バックアップ取得完了
  - [ ] RLS設定確認完了
  - [ ] インデックス最適化完了

API:
  - [ ] 全エンドポイントのテスト完了
  - [ ] エラーハンドリング確認完了
  - [ ] Rate Limiting設定完了
  - [ ] 認証・認可確認完了

UI:
  - [ ] 全ページの動作確認完了
  - [ ] レスポンシブ対応確認完了
  - [ ] アクセシビリティ確認完了
  - [ ] パフォーマンス確認完了

外部連携:
  - [ ] eBay API認証確認完了
  - [ ] Webhook設定確認完了
  - [ ] メール通知テスト完了

ドキュメント:
  - [ ] ユーザーマニュアル作成完了
  - [ ] API仕様書作成完了
  - [ ] 運用マニュアル作成完了

モニタリング:
  - [ ] Sentry設定完了
  - [ ] Vercel Analytics設定完了
  - [ ] アラート設定完了
```

---

## 16. まとめ

### 16.1 開発スコープ

**実装する機能**
1. ✅ 仕入値変動検知機能
2. ✅ 自動価格再計算機能
3. ✅ 競合最安値追従機能（MUG 8カ国）
4. ✅ 赤字防止機能
5. ✅ eBay自動価格更新機能
6. ✅ 価格最適化ダッシュボード
7. ✅ 競合分析ダッシュボード
8. ✅ 商品編集UI拡張

**実装しない機能（今回は対象外）**
- ❌ メルカリ・Yahoo!オークションへの対応
- ❌ AI/機械学習による価格予測
- ❌ 季節変動への自動対応
- ❌ 需要予測機能

### 16.2 期待される効果

**定量的効果**
- 価格調整工数: **80%削減**（手動 → 自動化）
- 平均利益率: **+5%向上**（最適化により）
- 赤字商品: **90%削減**（防止機能により）
- 競合価格追従率: **95%以上**（MUG 8カ国）

**定性的効果**
- 価格競争力の維持・向上
- 赤字リスクの早期発見
- データに基づいた意思決定
- 運用負荷の大幅削減

### 16.3 今後の拡張計画（Phase 2以降）

**短期（3ヶ月以内）**
- カテゴリ別最適化ルールの追加
- 季節変動への対応
- より詳細なレポート機能

**中期（6ヶ月以内）**
- AI/機械学習による価格予測
- 需要予測機能
- 自動在庫補充提案

**長期（1年以内）**
- 他プラットフォーム対応（メルカリ、Yahoo!）
- グローバル展開（アジア、欧州）
- 高度なビジネスインテリジェンス

---

**開発計画書 完**

**承認欄**
- 技術責任者: ________________ 日付: ________
- プロジェクトマネージャー: ________________ 日付: ________