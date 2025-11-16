# 🔄 開発引き継ぎ書：個別価格戦略システム実装

**作成日**: 2025-11-03  
**プロジェクト**: N3 E-commerce Management System  
**機能**: 商品ごとの個別価格戦略設定システム

---

## 📊 現在の完成状況

### ✅ 完了済み（Phase 1-2）

#### データベース基盤
- ✅ `pricing_rules` テーブル作成
- ✅ `price_changes` テーブル作成
- ✅ `product_scores` テーブル作成
- ✅ `unified_changes` テーブル作成
- ✅ `inventory_monitoring_logs` テーブル作成
- ✅ `monitoring_schedules` テーブル作成
- ✅ `pricing_defaults` テーブル作成
- ✅ `products_master` テーブル拡張（個別戦略カラム追加）
- ✅ ビュー作成（`product_effective_strategy`, `pricing_strategy_stats`）
- ✅ トリガー関数作成
- ✅ 便利な関数作成（`get_effective_strategy()`, `apply_default_to_all_products()`）

#### 実行済みマイグレーション
1. ✅ `001_unified_inventory_pricing_fixed.sql`
2. ✅ `002_fix_pricing_rules_duplicates.sql`
3. ✅ `add_monitoring_logs_schedules.sql`
4. ✅ `003_individual_pricing_strategy_clean.sql`

---

## 🎯 次に実装すべき機能

### Phase 3: デフォルト設定UI（優先度：最高）

**目的**: 全商品に適用されるグローバル価格戦略を設定するUI

**既存ページを改良**: `http://localhost:3000/inventory-monitoring`

#### 実装内容

##### 1. ページ構成の変更

**現状**: `/inventory-monitoring`は在庫監視の実行画面
**改良後**: タブ切り替えで「実行」と「デフォルト設定」を表示

```tsx
// /app/inventory-monitoring/page.tsx の構造

<Tabs defaultValue="execution">
  <TabsList>
    <TabsTrigger value="execution">在庫監視実行</TabsTrigger>
    <TabsTrigger value="defaults">デフォルト設定</TabsTrigger>
  </TabsList>
  
  <TabsContent value="execution">
    {/* 既存の在庫監視実行UI */}
  </TabsContent>
  
  <TabsContent value="defaults">
    <PricingDefaultsSettings />
  </TabsContent>
</Tabs>
```

##### 2. 新規コンポーネント: `PricingDefaultsSettings`

**ファイル**: `/app/inventory-monitoring/components/PricingDefaultsSettings.tsx`

**機能**:
- グローバルデフォルト設定の取得・表示
- 価格戦略の選択（最安値追従/差分維持/最低利益のみ/なし）
- 戦略パラメータの設定
- 在庫切れ時のアクション設定
- 監視頻度の設定
- 設定の保存

**UIレイアウト**:

```
┌─────────────────────────────────────────────┐
│  グローバルデフォルト価格戦略               │
├─────────────────────────────────────────────┤
│                                             │
│  📊 価格戦略                                │
│  ○ 最安値追従（最低利益確保）               │
│  ○ 基準価格からの差分維持                   │
│  ○ 最低利益確保のみ                         │
│  ○ 戦略なし（手動管理）                     │
│                                             │
│  💰 価格調整パラメータ                      │
│  最低利益額（USD）: [___10___]              │
│  価格調整率（%）: [___-5___] %              │
│  競合追従: [☑] 有効                        │
│  最大調整幅（%）: [___20___] %              │
│                                             │
│  📦 在庫切れ時の対応                        │
│  ○ 在庫を0に設定                           │
│  ○ 出品を一時停止                          │
│  ○ 出品を終了                              │
│  ○ 通知のみ（自動変更なし）                │
│                                             │
│  ⏱ 監視頻度                                │
│  デフォルト頻度: [▼ 1日1回]                │
│                                             │
│  📊 影響範囲                                │
│  適用対象商品数: 0件                        │
│                                             │
│  [デフォルト設定を保存]  [リセット]        │
└─────────────────────────────────────────────┘
```

##### 3. データフロー

```
┌──────────────────────┐
│ PricingDefaultsSettings│
│ (Reactコンポーネント)  │
└──────────┬───────────┘
           │
           │ useEffect
           ↓
┌──────────────────────┐
│ GET /api/settings/   │
│ pricing-defaults     │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│ Supabase:            │
│ pricing_defaults     │
│ WHERE setting_name = │
│ 'global_default'     │
└──────────────────────┘

[保存時]

┌──────────────────────┐
│ PricingDefaultsSettings│
│ onSubmit()           │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│ PUT /api/settings/   │
│ pricing-defaults     │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│ Supabase UPDATE      │
│ pricing_defaults     │
│ SET ...              │
└──────────────────────┘
```

##### 4. 必要なAPIエンドポイント

**ファイル**: `/app/api/settings/pricing-defaults/route.ts`

```typescript
// GET - デフォルト設定取得
export async function GET(request: Request) {
  const { data, error } = await supabase
    .from('pricing_defaults')
    .select('*')
    .eq('setting_name', 'global_default')
    .single()
  
  return NextResponse.json(data)
}

// PUT - デフォルト設定更新
export async function PUT(request: Request) {
  const body = await request.json()
  
  const { data, error } = await supabase
    .from('pricing_defaults')
    .update({
      strategy_type: body.strategy_type,
      strategy_params: body.strategy_params,
      out_of_stock_action: body.out_of_stock_action,
      default_check_frequency: body.default_check_frequency,
      updated_at: new Date().toISOString()
    })
    .eq('setting_name', 'global_default')
  
  return NextResponse.json(data)
}
```

##### 5. 型定義

**ファイル**: `/types/pricing.ts`

```typescript
export type PricingStrategyType = 
  | 'follow_lowest'
  | 'price_difference'
  | 'minimum_profit'
  | 'seasonal'
  | 'none'

export type OutOfStockAction = 
  | 'set_zero'
  | 'pause_listing'
  | 'end_listing'
  | 'notify_only'

export interface PricingDefaults {
  id: string
  setting_name: string
  enabled: boolean
  priority: number
  strategy_type: PricingStrategyType
  strategy_params: {
    min_profit_usd?: number
    price_adjust_percent?: number
    follow_competitor?: boolean
    max_adjust_percent?: number
    price_difference_usd?: number
    apply_above_lowest?: boolean
  }
  out_of_stock_action: OutOfStockAction
  default_check_frequency: string
  enable_price_monitoring: boolean
  enable_inventory_monitoring: boolean
  notify_on_price_change: boolean
  notify_on_out_of_stock: boolean
  notification_email?: string
  created_at: string
  updated_at: string
  created_by?: string
  description?: string
}
```

##### 6. 実装チェックリスト

**Phase 3.1: 基本構造**
- [ ] `/app/inventory-monitoring/page.tsx` にタブUI追加
- [ ] `/app/inventory-monitoring/components/PricingDefaultsSettings.tsx` 作成
- [ ] `/types/pricing.ts` 型定義作成

**Phase 3.2: APIエンドポイント**
- [ ] `/app/api/settings/pricing-defaults/route.ts` 作成
- [ ] GET エンドポイント実装
- [ ] PUT エンドポイント実装
- [ ] エラーハンドリング実装

**Phase 3.3: UIコンポーネント**
- [ ] 価格戦略選択UI実装
- [ ] パラメータ入力フォーム実装
- [ ] 在庫切れアクション選択UI実装
- [ ] 監視頻度選択UI実装
- [ ] 影響範囲表示実装

**Phase 3.4: データ連携**
- [ ] デフォルト設定の取得実装
- [ ] デフォルト設定の保存実装
- [ ] リアルタイムバリデーション実装
- [ ] 保存成功/失敗のトースト通知

**Phase 3.5: テスト**
- [ ] 設定取得の動作確認
- [ ] 設定保存の動作確認
- [ ] バリデーションの確認
- [ ] エッジケースのテスト

---

### Phase 4: 編集モーダル拡張（優先度：高）

**目的**: 商品ごとに個別の価格戦略を設定できるようにする

**既存ページを拡張**: `http://localhost:3000/tools/editing`

#### 実装内容

##### 1. 編集モーダルに「価格戦略」タブを追加

**現状**: `/tools/editing`のモーダルには複数のタブが既にある
**追加**: 新しいタブ「価格戦略」を追加

```tsx
// 既存のTabsListに追加
<TabsList>
  <TabsTrigger value="basic">基本情報</TabsTrigger>
  <TabsTrigger value="pricing">価格・利益</TabsTrigger>
  <TabsTrigger value="strategy">価格戦略</TabsTrigger> {/* 新規追加 */}
  {/* その他既存タブ */}
</TabsList>

<TabsContent value="strategy">
  <PricingStrategyTab productId={selectedProduct.id} />
</TabsContent>
```

##### 2. 新規コンポーネント: `PricingStrategyTab`

**ファイル**: `/app/tools/editing/components/PricingStrategyTab.tsx`

**機能**:
- デフォルト設定の継承/個別設定の切り替え
- 商品固有の価格戦略選択
- パラメータのカスタマイズ
- 現在のデフォルト設定の表示
- リアルタイムプレビュー

**UIレイアウト**:

```
┌─────────────────────────────────────────────┐
│  価格戦略設定                               │
├─────────────────────────────────────────────┤
│                                             │
│  設定の継承                                 │
│  [☑] デフォルト設定を使用                  │
│  └→ 現在のデフォルト: 最低利益確保のみ     │
│                                             │
│  ─────────────────────────────────          │
│                                             │
│  個別設定（デフォルトを上書き）             │
│  [☐] デフォルト設定を使用                  │
│                                             │
│  📊 価格戦略（この商品専用）                │
│  ┌──────────────────────────────┐          │
│  │ ○ 最安値追従（最低利益確保）  │          │
│  │ ○ 最安値より5%安く            │          │
│  │ ○ 最安値より$5高く            │          │
│  │ ○ 最低利益確保のみ            │          │
│  │ ○ 戦略なし                    │          │
│  └──────────────────────────────┘          │
│                                             │
│  💰 この商品の最低利益額                    │
│  USD: [___15___]                            │
│  ※デフォルト: $10                          │
│                                             │
│  📦 在庫切れ時の対応                        │
│  [▼ 在庫を0に設定]                         │
│  ※デフォルト: 在庫を0に設定                │
│                                             │
│  ⏱ 監視頻度                                │
│  [▼ 6時間ごと]                             │
│  ※デフォルト: 1日1回                       │
│                                             │
│  📝 メモ                                    │
│  [____________________________]            │
│                                             │
│  [設定を保存] [デフォルトに戻す]           │
└─────────────────────────────────────────────┘
```

##### 3. データフロー

```
[商品選択時]

┌──────────────────────┐
│ PricingStrategyTab   │
│ useEffect            │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│ GET /api/products/   │
│ [id]/pricing-strategy│
└──────────┬───────────┘
           │
           ↓
┌──────────────────────────────┐
│ Supabase:                    │
│ product_effective_strategy   │
│ WHERE product_id = ?         │
└──────────────────────────────┘

[保存時]

┌──────────────────────┐
│ PricingStrategyTab   │
│ onSubmit()           │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│ PUT /api/products/   │
│ [id]/pricing-strategy│
└──────────┬───────────┘
           │
           ↓
┌──────────────────────────────┐
│ Supabase UPDATE              │
│ products_master SET          │
│   use_default_pricing = ?,   │
│   custom_pricing_strategy,   │
│   custom_strategy_params,    │
│   ...                        │
└──────────────────────────────┘
```

##### 4. 必要なAPIエンドポイント

**ファイル**: `/app/api/products/[id]/pricing-strategy/route.ts`

```typescript
// GET - 商品の有効な価格戦略を取得
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const productId = parseInt(params.id)
  
  // 商品の有効な戦略を取得（ビューを使用）
  const { data: strategy, error } = await supabase
    .from('product_effective_strategy')
    .select('*')
    .eq('product_id', productId)
    .single()
  
  return NextResponse.json(strategy)
}

// PUT - 商品の個別価格戦略を更新
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const productId = parseInt(params.id)
  const body = await request.json()
  
  const { data, error } = await supabase
    .from('products_master')
    .update({
      use_default_pricing: body.use_default_pricing,
      use_default_inventory: body.use_default_inventory,
      custom_pricing_strategy: body.custom_pricing_strategy,
      custom_strategy_params: body.custom_strategy_params,
      custom_out_of_stock_action: body.custom_out_of_stock_action,
      custom_check_frequency: body.custom_check_frequency,
      pricing_strategy_notes: body.pricing_strategy_notes,
      pricing_overridden_by: 'user' // 実際はログインユーザー情報を使用
    })
    .eq('id', productId)
  
  return NextResponse.json(data)
}

// DELETE - 個別設定を削除してデフォルトに戻す
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const productId = parseInt(params.id)
  
  const { data, error } = await supabase
    .from('products_master')
    .update({
      use_default_pricing: true,
      use_default_inventory: true,
      custom_pricing_strategy: null,
      custom_strategy_params: {},
      custom_out_of_stock_action: null,
      custom_check_frequency: null,
      pricing_strategy_notes: null,
      pricing_overridden_at: null,
      pricing_overridden_by: null
    })
    .eq('id', productId)
  
  return NextResponse.json(data)
}
```

##### 5. 型定義（追加）

**ファイル**: `/types/pricing.ts`に追加

```typescript
export interface ProductPricingStrategy {
  product_id: number
  sku: string
  title: string
  effective_strategy: PricingStrategyType
  effective_params: Record<string, any>
  effective_out_of_stock_action: OutOfStockAction
  effective_check_frequency: string
  strategy_source: 'default' | 'custom'
  use_default_pricing: boolean
  use_default_inventory: boolean
  pricing_overridden_at?: string
  pricing_overridden_by?: string
  pricing_strategy_notes?: string
}
```

##### 6. 実装チェックリスト

**Phase 4.1: タブ追加**
- [ ] `/app/tools/editing/page.tsx` または該当モーダルに「価格戦略」タブ追加
- [ ] `/app/tools/editing/components/PricingStrategyTab.tsx` 作成

**Phase 4.2: APIエンドポイント**
- [ ] `/app/api/products/[id]/pricing-strategy/route.ts` 作成
- [ ] GET エンドポイント実装
- [ ] PUT エンドポイント実装
- [ ] DELETE エンドポイント実装

**Phase 4.3: UIコンポーネント**
- [ ] デフォルト継承トグル実装
- [ ] 個別戦略選択UI実装
- [ ] パラメータカスタマイズフォーム実装
- [ ] デフォルト設定の表示実装
- [ ] プレビュー機能実装

**Phase 4.4: データ連携**
- [ ] 商品の現在の戦略取得実装
- [ ] 個別設定の保存実装
- [ ] デフォルトに戻す機能実装
- [ ] バリデーション実装

**Phase 4.5: テスト**
- [ ] 個別設定の保存確認
- [ ] デフォルト継承の確認
- [ ] デフォルトに戻す機能の確認
- [ ] エッジケースのテスト

---

## 📁 ファイル構成

### 新規作成するファイル

```
/app/
  inventory-monitoring/
    components/
      PricingDefaultsSettings.tsx         # Phase 3
  tools/
    editing/
      components/
        PricingStrategyTab.tsx             # Phase 4
  api/
    settings/
      pricing-defaults/
        route.ts                           # Phase 3
    products/
      [id]/
        pricing-strategy/
          route.ts                         # Phase 4

/types/
  pricing.ts                               # Phase 3 & 4

/lib/
  pricing-engine/
    strategy-resolver.ts                   # Phase 5（次々回）
```

### 修正するファイル

```
/app/
  inventory-monitoring/
    page.tsx                               # タブUI追加
  tools/
    editing/
      page.tsx または該当モーダルファイル   # 価格戦略タブ追加
```

---

## 🔧 技術スタック

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **UI**: shadcn/ui (Radix UI)
- **State**: React Hooks (useState, useEffect)
- **API**: Next.js Route Handlers
- **Validation**: Zod（推奨）

---

## 📊 データベーススキーマ参照

### `pricing_defaults` テーブル

```sql
CREATE TABLE pricing_defaults (
  id UUID PRIMARY KEY,
  setting_name VARCHAR(100) UNIQUE,
  strategy_type VARCHAR(50),
  strategy_params JSONB,
  out_of_stock_action VARCHAR(50),
  default_check_frequency VARCHAR(20),
  -- その他カラム
)
```

### `products_master` 拡張カラム

```sql
ALTER TABLE products_master
ADD COLUMN custom_pricing_strategy VARCHAR(50),
ADD COLUMN custom_strategy_params JSONB,
ADD COLUMN custom_out_of_stock_action VARCHAR(50),
ADD COLUMN custom_check_frequency VARCHAR(20),
ADD COLUMN use_default_pricing BOOLEAN DEFAULT TRUE,
ADD COLUMN use_default_inventory BOOLEAN DEFAULT TRUE,
-- その他カラム
```

### ビュー: `product_effective_strategy`

商品の有効な価格戦略（デフォルト or 個別）を返す

```sql
SELECT * FROM product_effective_strategy WHERE product_id = ?
```

---

## 🎨 UIデザインガイドライン

### カラースキーム

- **プライマリ**: Blue (shadcn/ui default)
- **セカンダリ**: Gray
- **成功**: Green
- **警告**: Yellow
- **エラー**: Red

### コンポーネント使用

- **ボタン**: `<Button variant="default" | "outline" | "ghost">`
- **入力**: `<Input type="number" | "text">`
- **選択**: `<RadioGroup>`, `<Select>`
- **トグル**: `<Switch>`
- **カード**: `<Card>`, `<CardHeader>`, `<CardContent>`

### レスポンシブ対応

- デスクトップ優先
- タブレット（768px以上）でも使用可能に
- モバイル対応は優先度低

---

## 🧪 テスト項目

### Phase 3: デフォルト設定UI

1. **表示テスト**
   - [ ] デフォルト設定が正しく読み込まれるか
   - [ ] 現在の設定値が正しく表示されるか

2. **操作テスト**
   - [ ] 価格戦略の選択ができるか
   - [ ] パラメータの入力ができるか
   - [ ] 在庫切れアクションの選択ができるか
   - [ ] 設定の保存ができるか

3. **バリデーションテスト**
   - [ ] 最低利益額が正の数値のみか
   - [ ] パーセンテージが適切な範囲か
   - [ ] 必須項目が入力されているか

4. **エラーハンドリング**
   - [ ] API エラー時にトースト通知が表示されるか
   - [ ] ネットワークエラー時の挙動は適切か

### Phase 4: 編集モーダル拡張

1. **表示テスト**
   - [ ] 価格戦略タブが表示されるか
   - [ ] 商品の現在の戦略が正しく表示されるか
   - [ ] デフォルト設定が参考として表示されるか

2. **操作テスト**
   - [ ] デフォルト継承のトグルができるか
   - [ ] 個別戦略の選択ができるか
   - [ ] 個別パラメータの入力ができるか
   - [ ] 設定の保存ができるか
   - [ ] デフォルトに戻す機能が動作するか

3. **データ整合性テスト**
   - [ ] 保存後にビューが更新されるか
   - [ ] 個別設定がデフォルトより優先されるか
   - [ ] トリガーが正しく動作するか

---

## 💡 実装のヒント

### Phase 3 のヒント

1. **既存UIとの統合**
   - `/inventory-monitoring/page.tsx` の既存コードを壊さないように注意
   - Tabs コンポーネントを使用して、既存UIと新規UIを分離

2. **状態管理**
   - `useState` で設定値を管理
   - `useEffect` で初期読み込み
   - フォームライブラリ（React Hook Form）の使用を推奨

3. **バリデーション**
   - Zod を使用してスキーマ定義
   - クライアント側とサーバー側の両方でバリデーション

### Phase 4 のヒント

1. **既存モーダルの調査**
   - `/tools/editing` のモーダル構造を確認
   - 既存のタブと同じ構造でタブを追加

2. **コンテキスト利用**
   - 商品IDは親コンポーネントから props で受け取る
   - モーダルの開閉状態も親で管理

3. **プレビュー機能**
   - 設定変更時にリアルタイムで計算結果を表示
   - 「この設定だと利益は$Xになります」のような表示

---

## 🚀 実装順序（推奨）

### Week 1: Phase 3（デフォルト設定UI）

1. Day 1-2: 型定義とAPIエンドポイント作成
2. Day 3-4: PricingDefaultsSettings コンポーネント作成
3. Day 5: テストとバグ修正

### Week 2: Phase 4（編集モーダル拡張）

1. Day 1-2: APIエンドポイント作成
2. Day 3-4: PricingStrategyTab コンポーネント作成
3. Day 5: テストとバグ修正

---

## 📞 サポート・質問

### データベース関連
- Supabase Dashboard: https://supabase.com/dashboard/project/zdzfpucdyxdlavkgrvil
- テーブル構造: `/docs/DATABASE_SCHEMA.md`

### UI関連
- shadcn/ui: https://ui.shadcn.com/
- 既存コンポーネントを参考にする

### API関連
- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

---

## ✅ 完了チェックリスト

### Phase 3完了の確認項目
- [ ] デフォルト設定UIが表示される
- [ ] 設定の読み込みが動作する
- [ ] 設定の保存が動作する
- [ ] バリデーションが機能する
- [ ] エラーハンドリングが適切

### Phase 4完了の確認項目
- [ ] 価格戦略タブが表示される
- [ ] 商品の戦略が取得できる
- [ ] 個別設定が保存できる
- [ ] デフォルトに戻せる
- [ ] UIが直感的

---

## 📝 備考

- 既存のコードを壊さないように慎重に実装
- コミット前に必ずテスト
- UI/UXは既存ページのデザインに合わせる
- エラーメッセージは日本語で表示
- ローディング状態を適切に表示

---

**次のステップ**: Phase 3（デフォルト設定UI）の実装開始

**推定工数**: 
- Phase 3: 5日
- Phase 4: 5日
- 合計: 10営業日

頑張ってください！🚀
