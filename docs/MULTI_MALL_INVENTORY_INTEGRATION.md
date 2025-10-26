# 多モール統合在庫管理システム 設計書
## 既存システム拡張版

**作成日**: 2025-10-22
**対象**: `/inventory-monitoring` の多モール対応化
**目的**: Amazon、eBay、Shopee、Coupang等の全モール在庫を一元管理

---

## 📋 現状分析

### 既存システム (`/inventory-monitoring`)

**実装状況**:
- ✅ UI完成（shadcn/ui、高機能ダッシュボード）
- ✅ スクレイピングベースの在庫監視コンセプト
- ✅ ロボット対策機能（ランダム遅延、スケジュール設定）
- ✅ 複数モール表示（Yahoo、メルカリ、楽天、Amazon、eBay）
- ❌ **APIバックエンド未実装**（サンプルデータのみ）

**ファイル**:
```
/app/inventory-monitoring/page.tsx (717行)
```

**既存の機能**:
1. ダッシュボード概要（監視中商品、価格更新、在庫切れ、エラー）
2. 実行履歴タブ（定期実行・手動実行の記録）
3. 在庫0商品タブ（出品停止/再出品判断）
4. エラータブ（リトライ管理）
5. スケジュール設定モーダル（ロボット対策）

**既存の表示モール**:
- Yahoo!
- メルカリ
- 楽天
- Amazon
- eBay

---

## 🎯 統合設計方針

### Phase 1: APIバックエンド実装（Week 1-2）

既存UIをそのまま活用し、バックエンドAPIを実装する。

#### 1.1 データベース設計

**既存計画書のテーブルを使用**:
```
✓ products - 商品マスター
✓ amazon_sp_products - Amazon SP-API専用
✓ ebay_products - eBay専用
✓ inventory_master - 統合在庫管理
✓ inventory_history - 在庫変動履歴
✓ channel_sync_queue - 販路間同期キュー
```

**参照**: `docs/MULTI_CHANNEL_SYSTEM_PLAN.md`

#### 1.2 API Routes追加

```
/app/api/inventory-monitoring/
├── dashboard/route.ts          # ダッシュボード統計API
├── products/route.ts           # 監視商品一覧API
├── zero-stock/route.ts         # 在庫切れ商品API
├── errors/route.ts             # エラー商品API
├── execution-history/route.ts  # 実行履歴API
├── sync/
│   ├── manual/route.ts         # 手動同期トリガー
│   ├── schedule/route.ts       # スケジュール設定
│   └── status/route.ts         # 同期ステータス確認
└── actions/
    ├── stop-listing/route.ts   # 出品停止
    ├── relist/route.ts         # 再出品
    └── retry/route.ts          # エラーリトライ
```

---

### Phase 2: UI拡張（Week 3）

既存UIに以下を追加：

#### 2.1 モール別フィルター機能

```tsx
// 現在のマーケットプレイス表示
const marketplaceIcons = {
  yahoo: { name: 'Yahoo!', color: 'bg-red-500' },
  mercari: { name: 'メルカリ', color: 'bg-red-400' },
  rakuten: { name: '楽天', color: 'bg-red-600' },
  amazon: { name: 'Amazon', color: 'bg-orange-500' },
  ebay: { name: 'eBay', color: 'bg-blue-600' }
}

// ↓ 拡張

const marketplaceIcons = {
  amazon: {
    name: 'Amazon',
    color: 'bg-orange-500',
    apiType: 'sp-api',      // SP-API統合
    syncEnabled: true,
    icon: Globe
  },
  ebay: {
    name: 'eBay',
    color: 'bg-blue-600',
    apiType: 'trading-api', // eBay Trading API
    syncEnabled: true,
    icon: Globe
  },
  shopee: {
    name: 'Shopee',
    color: 'bg-orange-600',
    apiType: 'shopee-api',  // Shopee API
    syncEnabled: false,     // Phase 2で実装
    icon: ShoppingCart
  },
  yahoo: {
    name: 'Yahoo!',
    color: 'bg-red-500',
    apiType: 'scraping',    // スクレイピング継続
    syncEnabled: true,
    icon: Globe
  },
  mercari: {
    name: 'メルカリ',
    color: 'bg-red-400',
    apiType: 'scraping',
    syncEnabled: true,
    icon: ShoppingCart
  },
  rakuten: {
    name: '楽天',
    color: 'bg-red-600',
    apiType: 'rakuten-api', // 楽天API（将来）
    syncEnabled: false,
    icon: Globe
  },
  coupang: {
    name: 'Coupang',
    color: 'bg-purple-600',
    apiType: 'coupang-api', // Coupang API（将来）
    syncEnabled: false,
    icon: Globe
  }
}
```

#### 2.2 モール別タブ追加

既存のタブ構成：
```tsx
<Tabs defaultValue="history">
  <TabsList>
    <TabsTrigger value="history">実行履歴</TabsTrigger>
    <TabsTrigger value="zero-stock">在庫0商品</TabsTrigger>
    <TabsTrigger value="errors">エラー</TabsTrigger>
  </TabsList>
```

↓ 拡張

```tsx
<Tabs defaultValue="all">
  <TabsList>
    <TabsTrigger value="all">
      <Package className="mr-2 h-4 w-4" />
      全モール
    </TabsTrigger>
    <TabsTrigger value="amazon">
      <Globe className="mr-2 h-4 w-4" />
      Amazon ({amazonCount})
    </TabsTrigger>
    <TabsTrigger value="ebay">
      <Globe className="mr-2 h-4 w-4" />
      eBay ({ebayCount})
    </TabsTrigger>
    <TabsTrigger value="shopee">
      <ShoppingCart className="mr-2 h-4 w-4" />
      Shopee ({shopeeCount})
    </TabsTrigger>
    <TabsTrigger value="history">
      <Clock className="mr-2 h-4 w-4" />
      実行履歴
    </TabsTrigger>
    <TabsTrigger value="errors">
      <AlertTriangle className="mr-2 h-4 w-4" />
      エラー ({errorCount})
    </TabsTrigger>
  </TabsList>

  <TabsContent value="all">
    {/* 全モールの在庫一覧 */}
  </TabsContent>

  <TabsContent value="amazon">
    {/* Amazon専用ビュー（SP-API統合） */}
  </TabsContent>

  <TabsContent value="ebay">
    {/* eBay専用ビュー（Trading API統合） */}
  </TabsContent>
</Tabs>
```

#### 2.3 リアルタイム在庫表示

```tsx
<Card>
  <CardHeader>
    <CardTitle>在庫状況</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {products.map(product => (
        <div key={product.id} className="border rounded p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={product.image} className="w-16 h-16 rounded" />
              <div>
                <h3 className="font-medium">{product.title}</h3>
                <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
              </div>
            </div>

            {/* モール別在庫表示 */}
            <div className="flex gap-4">
              <div className="text-center">
                <Badge className="bg-orange-500 mb-1">Amazon</Badge>
                <p className="text-2xl font-bold">
                  {product.inventory.amazon.available}
                </p>
                <p className="text-xs text-muted-foreground">
                  予約: {product.inventory.amazon.reserved}
                </p>
              </div>

              <div className="text-center">
                <Badge className="bg-blue-600 mb-1">eBay</Badge>
                <p className="text-2xl font-bold">
                  {product.inventory.ebay.quantity}
                </p>
                <p className="text-xs text-muted-foreground">
                  出品中: {product.inventory.ebay.active}
                </p>
              </div>

              <div className="text-center">
                <Badge className="bg-orange-600 mb-1">Shopee</Badge>
                <p className="text-2xl font-bold">
                  {product.inventory.shopee.stock}
                </p>
                <p className="text-xs text-muted-foreground">
                  販売中: {product.inventory.shopee.sold}
                </p>
              </div>
            </div>

            {/* 同期ボタン */}
            <Button
              size="sm"
              onClick={() => handleSyncInventory(product.id)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              同期
            </Button>
          </div>

          {/* 最終同期時刻 */}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            最終同期: {product.lastSyncAt}
            {product.syncStatus === 'syncing' && (
              <Badge variant="outline" className="bg-blue-50">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                同期中
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

---

## 🔄 Amazon SP-API統合フロー

### 在庫同期の仕組み

```mermaid
graph LR
    A[Vercel Cron<br/>5分ごと] --> B[/api/cron/inventory-sync]
    B --> C{同期対象<br/>商品取得}
    C --> D[Amazon SP-API<br/>在庫取得]
    C --> E[eBay API<br/>在庫取得]
    C --> F[Shopee API<br/>在庫取得]

    D --> G[inventory_master<br/>更新]
    E --> G
    F --> G

    G --> H[inventory_history<br/>記録]
    H --> I[channel_sync_queue<br/>投入]
    I --> J[他モールへ同期]
```

### API実装例

**`/app/api/inventory-monitoring/dashboard/route.ts`**
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()

  // 監視中商品数
  const { count: monitoring } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // 在庫切れ商品数
  const { count: zeroStock } = await supabase
    .from('inventory_master')
    .select('*', { count: 'exact', head: true })
    .eq('is_out_of_stock', true)

  // エラー数（過去24時間）
  const { data: errors } = await supabase
    .from('api_call_logs')
    .select('id')
    .eq('is_error', true)
    .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())

  // 最新の実行履歴
  const { data: latestExecution } = await supabase
    .from('inventory_sync_executions')
    .select('*')
    .order('executed_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({
    success: true,
    stats: {
      monitoring: monitoring || 0,
      priceUpdated: latestExecution?.price_update_count || 0,
      zeroStock: zeroStock || 0,
      errors: errors?.length || 0
    }
  })
}
```

**`/app/api/inventory-monitoring/products/route.ts`**
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel') // amazon, ebay, shopee, all
  const status = searchParams.get('status')   // zero-stock, low-stock, normal

  const supabase = createClient()

  let query = supabase
    .from('products')
    .select(`
      *,
      inventory_master(*),
      amazon_sp_products(*),
      ebay_products(*)
    `)

  // チャンネルフィルター
  if (channel && channel !== 'all') {
    query = query.contains('channels', { [channel]: true })
  }

  // ステータスフィルター
  if (status === 'zero-stock') {
    query = query.eq('inventory_master.is_out_of_stock', true)
  } else if (status === 'low-stock') {
    query = query.eq('inventory_master.is_low_stock', true)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // データ整形
  const products = data.map(product => ({
    id: product.id,
    sku: product.master_sku,
    title: product.title,
    image: product.main_image_url,
    inventory: {
      total: product.inventory_master?.total_stock || 0,
      available: product.inventory_master?.available_stock || 0,
      reserved: product.inventory_master?.reserved_stock || 0,
      amazon: {
        available: product.amazon_sp_products?.available_quantity || 0,
        reserved: product.amazon_sp_products?.reserved_quantity || 0,
        inbound: product.amazon_sp_products?.inbound_quantity || 0
      },
      ebay: {
        quantity: product.ebay_products?.quantity || 0,
        active: product.ebay_products?.listing_status === 'active' ? 1 : 0
      }
    },
    channels: product.channels,
    lastSyncAt: product.inventory_master?.last_sync_at,
    syncStatus: 'idle' // idle, syncing, error
  }))

  return NextResponse.json({
    success: true,
    products,
    total: products.length
  })
}
```

**`/app/api/inventory-monitoring/sync/manual/route.ts`**
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { productIds } = await request.json()

  const supabase = createClient()

  // 同期キューに投入
  const syncJobs = productIds.map((productId: string) => ({
    product_id: productId,
    channel: 'all',
    sync_type: 'inventory',
    priority: 1, // 手動実行は最優先
    status: 'pending'
  }))

  const { data, error } = await supabase
    .from('channel_sync_queue')
    .insert(syncJobs)
    .select()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // バックグラウンドで同期処理を開始
  // TODO: Vercel Cronまたはワーカーで処理

  return NextResponse.json({
    success: true,
    message: `${productIds.length}件の商品を同期キューに追加しました`,
    jobs: data
  })
}
```

---

## 📊 データフロー

### 在庫同期の流れ

```
1. Vercel Cron (5分ごと)
   ↓
2. /api/cron/inventory-sync
   - 同期対象商品をDBから取得
   - next_sync_at <= NOW() の商品
   ↓
3. Amazon SP-API呼び出し
   - FBA在庫取得 (getInventorySummaries)
   - MFN在庫取得 (getListingsItem)
   ↓
4. inventory_master更新
   - total_stock更新
   - reserved_stock更新
   - available_stock自動計算
   ↓
5. inventory_history記録
   - 変動履歴を保存
   ↓
6. channel_sync_queue投入
   - 他モールへの同期指示
   ↓
7. eBay在庫同期
   - Trading APIで在庫更新
```

---

## 🛠️ 実装スケジュール

### Week 1: データベース & API基盤

**Day 1-2**: データベースマイグレーション
- [ ] `products`テーブル作成
- [ ] `inventory_master`テーブル作成
- [ ] `channel_sync_queue`テーブル作成
- [ ] `amazon_sp_products`テーブル作成
- [ ] `ebay_products`テーブル作成

**Day 3-4**: 基本API実装
- [ ] `/api/inventory-monitoring/dashboard`
- [ ] `/api/inventory-monitoring/products`
- [ ] `/api/inventory-monitoring/zero-stock`
- [ ] `/api/inventory-monitoring/errors`

**Day 5**: Amazon SP-API統合
- [ ] SP-API認証実装
- [ ] 在庫取得機能
- [ ] `/api/amazon-sp/inventory/sync`

### Week 2: 同期機能 & UI接続

**Day 6-7**: 同期ロジック実装
- [ ] `/api/inventory-monitoring/sync/manual`
- [ ] `/api/inventory-monitoring/sync/schedule`
- [ ] `/api/cron/inventory-sync` (Vercel Cron)

**Day 8-9**: UI接続
- [ ] 既存UIをAPIに接続
- [ ] リアルタイムデータ表示
- [ ] ローディング状態実装

**Day 10**: テスト
- [ ] 手動同期テスト
- [ ] 自動同期テスト
- [ ] エラーハンドリング確認

### Week 3: UI拡張 & eBay統合

**Day 11-12**: モール別タブ実装
- [ ] Amazonタブ
- [ ] eBayタブ
- [ ] Shopeeタブ（UI のみ）

**Day 13-14**: eBay API統合
- [ ] eBay在庫取得
- [ ] eBay在庫更新
- [ ] `/api/ebay/inventory/sync`

**Day 15**: 統合テスト & デプロイ
- [ ] 全機能テスト
- [ ] 本番デプロイ
- [ ] ドキュメント更新

---

## 🎯 完成イメージ

### ダッシュボード

```
┌─────────────────────────────────────────────────────────────┐
│ 在庫管理監視システム                    [スケジュール] [手動実行] [レポート]│
│ 自動在庫連動 & ロボット対策機能                                │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │監視中商品 │ │価格更新   │ │在庫切れ   │ │エラー     │     │
│ │  1,234   │ │   45     │ │   12     │ │   3      │     │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
├─────────────────────────────────────────────────────────────┤
│ [全モール] [Amazon (543)] [eBay (421)] [Shopee (270)] [履歴] [エラー]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [商品画像] Canon EOS R5                          SKU: CAM-089│ │
│ │                                                          │ │
│ │ Amazon: 8 (予約: 2)   eBay: 5   Shopee: 12   [同期]      │ │
│ │ 最終同期: 2025-10-22 14:30:00  [同期中...]              │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [商品画像] MacBook Pro 14inch                  SKU: MAC-042│ │
│ │                                                          │ │
│ │ Amazon: 0 (予約: 0)   eBay: 3   Shopee: 0   [同期]      │ │
│ │ 最終同期: 2025-10-22 14:25:15  ⚠️ Amazon在庫切れ        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ チェックリスト

### 準備
- [ ] Amazon SP-API認証情報取得
- [ ] eBay Trading API認証情報確認
- [ ] Supabaseプロジェクト準備

### Week 1完了条件
- [ ] データベース構築完了
- [ ] 基本API動作確認
- [ ] Amazon SP-API在庫取得成功

### Week 2完了条件
- [ ] 手動同期動作確認
- [ ] 自動同期（Cron）動作確認
- [ ] UIにリアルタイムデータ表示

### Week 3完了条件
- [ ] モール別タブ実装完了
- [ ] eBay在庫同期動作確認
- [ ] 本番環境デプロイ

---

## 📌 注意事項

### API制限

| モール | レート制限 | 対策 |
|--------|-----------|------|
| Amazon SP-API | FBA: 10req/30秒 | Bottleneck.js |
| eBay Trading API | 5,000req/日 | キュー管理 |
| Shopee API | 1,000req/分 | 未実装（Phase 2） |

### スケーリング

- 初期: 1,000商品
- 3ヶ月: 3〜5万商品
- 6ヶ月: 10万商品以上

**対策**:
- バッチ処理（100商品ずつ）
- 優先度管理（sync_priority）
- キャッシュ活用（Redis）

---

**次のステップ**: データベースマイグレーション実行

**作成者**: Claude Code
**最終更新**: 2025-10-22
