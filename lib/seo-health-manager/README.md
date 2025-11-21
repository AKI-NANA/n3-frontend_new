# Phase 7: SEO/健全性マネージャー

## 概要

Phase 7は、多販路EC統合管理システムにおける「SEO低下の防止」と「死に筋排除」を実現するための機能群です。
eBayアカウントの健全性を維持し、売上を最大化することを目的としています。

## 主要機能

### 7-1. オークションアンカー管理

**目的**: 全カテゴリーに対し、「利益損失にならないスタート価格」を設定し、オークション出品を毎日自動実行する。

**実装内容**:
- `calculateMinStartPrice()`: 仕入れ価格、送料、目標利益率から最低開始価格を算出
- `getRecommendedStartPriceByCategory()`: カテゴリー別の最適な開始価格を推奨
- カテゴリーごとの利益率設定（Video Games: 25%, Electronics: 15%, Collectibles: 40%など）

**財務目標**: 損失リスクをゼロ化
**SEO目標**: STR（Sell-Through Rate）の安定的な向上を保証

### 7-2. オークション終了時の自動措置

**目的**: 入札なし（0ドル終了）の場合、システムは即座にオークションを終了させ、自動で「通常の利益が出る価格」の定額出品に切り替える。

**実装内容**:
- `determinePostAuctionAction()`: オークション終了後のアクションを自動決定
- 入札なし → 定額出品に自動切り替え（`auto_convert_to_fixed`フラグが有効な場合）
- 定額価格は開始価格の1.3倍に設定

**SEO目標**: 0ドル終了によるネガティブシグナルを回避

### 7-3. 一点もの在庫監視

**目的**: 入札がない状態で、バックエンドの仕入れ先から在庫ロスが確認された場合、システムは自動でオークションを終了させる。

**実装内容**:
- `checkInventoryLossAction()`: 在庫ロス時の自動判定
- 入札なし + 在庫ロス → 即時自動終了
- 入札あり + 在庫ロス → 人間にアラート（セラー都合のキャンセル防止）

**業務/信頼目標**: セラー都合のキャンセルを防ぎ、eBayペナルティを回避

### 7-4. 健全性スコアの継続監視

**目的**: 定額出品に切り替わったリスティングや、その他の全リスティングに対し、90日間の販売実績を監視し、スコアが低いものは自動終了を推奨する。

**実装内容**:
- `calculateHealthScore()`: 90日間の販売実績から健全性スコア（0-100）を算出
- スコア計算項目:
  - 最終販売からの経過日数（30点満点）
  - コンバージョン率（25点満点）
  - 閲覧数（20点満点）
  - 検索表示率（15点満点）
  - クリック率（10点満点）
- 死に筋判定: スコア30以下、または90日間販売なし
- 推奨アクション: `keep`（維持）、`revise`（見直し）、`end`（終了）

**SEO目標**: アカウント全体の販売効率を高く維持

## UI統合

### IntegratedDashboard_V1.jsx（Phase 3）への統合

- SEO関連のアラート追加（在庫ロス、健全性スコア低下、入札なし終了）
- SEO関連のKPI追加（アクティブなオークション数、平均健全性スコア、死に筋リスティング数）

### BulkSourcingApproval_V1.jsx（Phase 5）への統合

- 新しいタブ「オークション管理（Phase 7）」を追加
- オークションアンカー管理リストの表示
- オークション実行サマリーパネル
- 一括オークション処理の実行（人間承認ゲートウェイ、C2要件対応）

## データモデル

### AuctionAnchor（オークションアンカー）

```typescript
interface AuctionAnchor {
  id: string;
  product_id: string;
  category: string;
  min_start_price_usd: number;        // 最低開始価格
  current_start_price_usd: number;    // 現在の開始価格
  auto_relist: boolean;               // 自動再出品フラグ
  auction_status: 'active' | 'ended_no_bids' | 'ended_with_bids' | 'converted_to_fixed';
  auto_convert_to_fixed: boolean;     // 自動定額切替フラグ
  inventory_check_enabled: boolean;   // 在庫監視の有効化
  // ...
}
```

### ListingHealthScore（健全性スコア）

```typescript
interface ListingHealthScore {
  id: string;
  product_id: string;
  health_score: number;               // 0-100
  days_since_last_sale: number;
  total_views_90d: number;
  total_sales_90d: number;
  conversion_rate_90d: number;
  is_dead_listing: boolean;
  recommended_action: 'keep' | 'revise' | 'end';
  // ...
}
```

## クリティカル制約の遵守

### C1: クレジットカード決済の必須
- オークションアンカー管理はPhase 5（仕入れ承認）と統合されており、クレカ利用状況を考慮

### C2: 人間承認（ハッキング対策）
- オークション一括実行時に人間による最終承認が必要
- `AuctionBatchExecutionRequest`に`approved_by_user_id`を必須化

### C3: SEO低下の防止（死に筋排除）
- 健全性スコアによる自動終了推奨で死に筋を排除
- 0ドル終了を回避し、STRを向上

### C4: 全カテゴリーのオークションSEOアンカー戦略
- カテゴリー別の最適価格設定
- 全カテゴリーでオークションアンカーを管理可能

## 使用方法

### オークションアンカー管理

```typescript
import { calculateMinStartPrice, executeBatchAuctions } from '@/lib/seo-health-manager';

// 最低開始価格の計算
const minPrice = calculateMinStartPrice(
  6500,      // 仕入れ価格（円）
  15.00,     // 送料（USD）
  0.10,      // 目標利益率（10%）
  150        // 為替レート
);

// 一括オークション実行
const result = await executeBatchAuctions({
  anchor_ids: ['ANCHOR-001', 'ANCHOR-002'],
  execution_type: 'immediate',
  approved_by_user_id: 'user-123',
}, anchors);
```

### 健全性スコア計算

```typescript
import { calculateHealthScore, generateAutoEndRecommendations } from '@/lib/seo-health-manager';

// スコア計算
const scoreResult = calculateHealthScore({
  days_since_last_sale: 95,
  total_views_90d: 120,
  total_sales_90d: 0,
  conversion_rate_90d: 0.0,
  avg_daily_views: 1.3,
  search_appearance_rate: 15,
  click_through_rate: 0.8,
  watch_count: 2,
});

console.log(scoreResult.health_score);        // 健全性スコア
console.log(scoreResult.is_dead_listing);     // 死に筋判定
console.log(scoreResult.recommended_action);  // 推奨アクション
```

## 今後の拡張

- [ ] eBay API連携の実装
- [ ] Supabaseとのデータ連携
- [ ] 在庫監視の自動スケジュール実行
- [ ] 健全性スコアの機械学習による最適化
- [ ] カテゴリー別の利益率の動的調整
