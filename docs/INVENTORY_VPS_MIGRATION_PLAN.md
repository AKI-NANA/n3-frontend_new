# 在庫管理システム VPS移行 完全計画書

## 🎯 プロジェクト目標

1. **スクレイピングエンジンの共通化**: `/data-collection`と`/inventory-monitoring`で機能を共有
2. **VPS自動化**: Mac起動不要で24時間365日自動監視
3. **拡張性**: 今後のマーケットプレイス追加に対応
4. **価格再計算連携**: 在庫・価格変動時に自動で価格とポリシーを再計算

---

## 📊 現状分析

### 既存の機能

#### 1. `/data-collection` (スクレイピングエンジン)
- Yahoo!オークションからのデータ取得
- 画像、商品詳細、価格、在庫など全データ取得
- **用途**: 出品時の初期データ収集

#### 2. `/inventory-monitoring` (在庫監視)
- APIエンドポイント実装済み
- スケジュール設定UI実装済み
- **問題点**: スクレイピング機能が独立している

### 課題

```
❌ 現状の問題:
┌─────────────────┐     ┌──────────────────────┐
│ /data-collection│     │ /inventory-monitoring│
│                 │     │                      │
│ スクレイピング  │ ⚠️  │ スクレイピング       │
│ 実装A           │     │ 実装B (重複)         │
└─────────────────┘     └──────────────────────┘

✅ 解決後:
┌───────────────────────────────────┐
│ 共通スクレイピングエンジン          │
│ /lib/scraping-engine              │
└───────────────────────────────────┘
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────────────┐
│ /data-collection│  │ /inventory-monitoring│
│ (全データ取得)  │  │ (価格・在庫のみ)     │
└─────────────────┘  └──────────────────────┘
```

---

## 🏗️ アーキテクチャ設計

### システム構成

```
┌─────────────────────────────────────────────────────────┐
│                    フロントエンド                         │
├─────────────────────────────────────────────────────────┤
│ /data-collection          │ /inventory-monitoring       │
│ - 手動データ収集          │ - 在庫状況確認              │
│ - プレビュー              │ - 変動履歴                  │
│                           │ - スケジュール設定          │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    Next.js API Routes                    │
├─────────────────────────────────────────────────────────┤
│ /api/data-collection      │ /api/inventory-monitoring   │
│ - 出品用データ取得        │ - 在庫監視実行              │
│                           │ - スケジュール管理          │
│                           │ - 変動データ取得            │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│              共通スクレイピングエンジン                   │
│              /lib/scraping-engine                        │
├─────────────────────────────────────────────────────────┤
│ - ScrapingEngine (コアクラス)                            │
│ - 目的別プリセット (full / inventory / price_only)      │
│ - ソース別実装 (Yahoo / Mercari / Rakuma)               │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                  VPS Cron Jobs                           │
├─────────────────────────────────────────────────────────┤
│ - 定期実行スクリプト                                      │
│ - ログ記録                                                │
│ - エラー通知                                              │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                 Supabase Database                        │
├─────────────────────────────────────────────────────────┤
│ - products_master (商品マスター)                         │
│ - inventory_monitoring_logs (監視履歴)                   │
│ - inventory_changes (変動データ)                         │
│ - monitoring_schedules (スケジュール設定)                │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 実装フェーズ

### Phase 1: スクレイピングエンジンの共通化 (完了)

✅ `/lib/scraping-engine/index.ts` 作成完了

**機能:**
- 目的別のプリセット設定
- ソース別の実装
- 一括スクレイピング対応

### Phase 2: 在庫監視の出品連携

#### 2-1. データベース修正

```sql
-- products_masterに在庫監視関連カラム追加
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS inventory_monitoring_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS inventory_check_frequency VARCHAR(20) DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS last_inventory_check TIMESTAMP,
ADD COLUMN IF NOT EXISTS inventory_monitoring_started_at TIMESTAMP;

-- 在庫監視を有効化する条件
-- 1. 承認済み (approval_status='approved')
-- 2. スケジュール済み (listing_session_id IS NOT NULL)
-- 3. または実際に出品済み (ebay_listing_id IS NOT NULL)
```

#### 2-2. 出品時の自動監視開始

```typescript
// スケジュール生成時に在庫監視を有効化
async function enableInventoryMonitoring(productIds: number[]) {
  await supabase
    .from('products_master')
    .update({
      inventory_monitoring_enabled: true,
      inventory_monitoring_started_at: new Date().toISOString()
    })
    .in('id', productIds)
}
```

#### 2-3. 監視開始のタイミング

**提案**: 出品7日前から監視開始

```typescript
// scheduled_listing_date の7日前に監視を開始
const monitoringStartDate = new Date(scheduledDate)
monitoringStartDate.setDate(monitoringStartDate.getDate() - 7)

if (new Date() >= monitoringStartDate) {
  // 在庫監視を有効化
  enableInventoryMonitoring([productId])
}
```

### Phase 3: VPS Cron自動実行

#### 3-1. Cronスクリプト作成

```bash
#!/bin/bash
# VPS用在庫監視自動実行スクリプト
# ファイル: ~/n3-frontend_new/scripts/run-inventory-monitoring.sh

cd /home/aritahiroaki/n3-frontend_new

# 環境変数を読み込む
export $(cat .env.local | grep -v '^#' | xargs)

# 在庫監視エンドポイントを呼び出し
curl -X POST http://localhost:3000/api/inventory-monitoring/cron-execute \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  >> /home/aritahiroaki/logs/inventory-monitoring.log 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Inventory monitoring executed" >> /home/aritahiroaki/logs/inventory-monitoring.log
```

#### 3-2. Crontab設定

```cron
# 在庫監視 - デフォルト: 1日1回（午前3時）
0 3 * * * /home/aritahiroaki/n3-frontend_new/scripts/run-inventory-monitoring.sh

# カスタム頻度例:
# 3時間ごと: 0 */3 * * *
# 6時間ごと: 0 */6 * * *
# 12時間ごと: 0 */12 * * *
```

#### 3-3. Cronエンドポイント作成

```typescript
// /app/api/inventory-monitoring/cron-execute/route.ts
export async function POST(request: Request) {
  // CRON_SECRET認証
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.includes(process.env.CRON_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 在庫監視対象の商品を取得
  const { data: products } = await supabase
    .from('products_master')
    .select('*')
    .eq('inventory_monitoring_enabled', true)
    .lte('next_check_at', new Date().toISOString())
  
  // スクレイピング実行
  const engine = new ScrapingEngine('yahoo_auction', SCRAPING_PRESETS.inventory)
  const results = await engine.scrapeMultiple(products.map(p => p.source_url))
  
  // 変動検知と記録
  await processInventoryChanges(products, results)
  
  return Response.json({ success: true, processed: results.length })
}
```

### Phase 4: 価格再計算との連携

#### 4-1. 変動検知時の自動処理

```typescript
async function processInventoryChanges(
  products: Product[],
  results: ScrapingResult[]
) {
  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    const result = results[i]
    
    // 1. ページ削除検知
    if (!result.pageExists || result.pageStatus === 'ended') {
      await handlePageDeleted(product)
      continue
    }
    
    // 2. 価格変動検知
    if (result.price && result.price.changed) {
      await handlePriceChange(product, result.price.current)
    }
    
    // 3. 在庫切れ検知
    if (result.stock && !result.stock.available) {
      await handleOutOfStock(product)
    }
  }
}

// ページ削除時の処理
async function handlePageDeleted(product: Product) {
  // 1. 在庫を0に設定
  await supabase
    .from('products_master')
    .update({ 
      stock_quantity: 0,
      inventory_monitoring_enabled: false
    })
    .eq('id', product.id)
  
  // 2. eBayの在庫を0に更新
  await updateEbayInventory(product.ebay_listing_id, 0)
  
  // 3. 変動ログ記録
  await logInventoryChange(product.id, 'page_deleted')
}

// 価格変動時の処理
async function handlePriceChange(product: Product, newPrice: number) {
  // 1. 価格を更新
  await supabase
    .from('products_master')
    .update({ purchase_price_jpy: newPrice })
    .eq('id', product.id)
  
  // 2. 利益を再計算
  const newProfit = await recalculateProfit(product.id, newPrice)
  
  // 3. eBay価格を再計算
  const newEbayPrice = await recalculateEbayPrice(product.id, newProfit)
  
  // 4. 配送ポリシーを再評価（重量が変わる場合）
  await reevaluateShippingPolicy(product.id)
  
  // 5. eBayに反映
  await updateEbayPrice(product.ebay_listing_id, newEbayPrice)
  
  // 6. 変動ログ記録
  await logInventoryChange(product.id, 'price_change', {
    old_price: product.purchase_price_jpy,
    new_price: newPrice,
    new_ebay_price: newEbayPrice
  })
}

// 在庫切れ時の処理
async function handleOutOfStock(product: Product) {
  // 1. 在庫を0に設定
  await supabase
    .from('products_master')
    .update({ stock_quantity: 0 })
    .eq('id', product.id)
  
  // 2. eBayの在庫を0に更新
  await updateEbayInventory(product.ebay_listing_id, 0)
  
  // 3. 変動ログ記録
  await logInventoryChange(product.id, 'out_of_stock')
}
```

### Phase 5: UIの拡張（カスタム頻度設定）

#### 5-1. マーケットプレイス別設定

```typescript
interface MonitoringRule {
  id: string
  marketplace: 'yahoo_auction' | 'mercari' | 'rakuma' | 'ebay'
  frequency: 'hourly' | 'every_3h' | 'every_6h' | 'daily' | 'weekly'
  enabled: boolean
  priority: 'high' | 'medium' | 'low'
  
  // 条件
  conditions: {
    min_stock?: number           // 在庫数の最小値
    max_price_jpy?: number       // 価格の上限
    categories?: string[]        // 対象カテゴリ
  }
  
  // アクション
  actions: {
    notify_on_change: boolean    // 変動時に通知
    auto_update_ebay: boolean    // eBay自動更新
    auto_recalculate: boolean    // 価格自動再計算
  }
}
```

#### 5-2. UI追加

```tsx
// スケジュール設定タブに追加
<Card>
  <CardHeader>
    <CardTitle>監視ルール</CardTitle>
    <CardDescription>
      マーケットプレイスごとに監視頻度を設定
    </CardDescription>
  </CardHeader>
  <CardContent>
    {monitoringRules.map((rule) => (
      <div key={rule.id} className="space-y-4 border p-4 rounded">
        <div className="flex items-center justify-between">
          <Badge>{rule.marketplace}</Badge>
          <Switch 
            checked={rule.enabled}
            onCheckedChange={(checked) => updateRule(rule.id, { enabled: checked })}
          />
        </div>
        
        <div>
          <Label>監視頻度</Label>
          <Select value={rule.frequency}>
            <SelectItem value="hourly">1時間ごと</SelectItem>
            <SelectItem value="every_3h">3時間ごと</SelectItem>
            <SelectItem value="every_6h">6時間ごと</SelectItem>
            <SelectItem value="daily">1日1回</SelectItem>
            <SelectItem value="weekly">1週間に1回</SelectItem>
          </Select>
        </div>
        
        <div>
          <Label>優先度</Label>
          <Select value={rule.priority}>
            <SelectItem value="high">高（即座に実行）</SelectItem>
            <SelectItem value="medium">中（通常）</SelectItem>
            <SelectItem value="low">低（時間がある時）</SelectItem>
          </Select>
        </div>
      </div>
    ))}
    
    <Button onClick={() => addNewRule()}>
      <Plus className="mr-2 h-4 w-4" />
      ルールを追加
    </Button>
  </CardContent>
</Card>
```

---

## 🔄 データフロー（完全版）

### 1. 出品スケジュール生成時

```
スケジューラーでスケジュール生成
  ↓
scheduled_listing_date が設定される
  ↓
7日前になったら自動的に在庫監視を開始
  ↓
inventory_monitoring_enabled = true
next_check_at = 現在時刻 + 頻度
```

### 2. Cron自動実行

```
VPS Cron (例: 午前3時)
  ↓
/api/inventory-monitoring/cron-execute
  ↓
inventory_monitoring_enabled=true かつ
next_check_at <= 現在時刻 の商品を取得
  ↓
共通スクレイピングエンジンで一括チェック
  (価格・在庫・ページ存在のみ)
  ↓
変動検知
  ├─ ページ削除 → 在庫0、eBay更新
  ├─ 価格変動 → 価格再計算、eBay更新
  └─ 在庫切れ → 在庫0、eBay更新
  ↓
inventory_changes テーブルに記録
  ↓
next_check_at を更新 (現在時刻 + 頻度)
```

### 3. UI確認

```
/inventory-monitoring にアクセス
  ↓
変動データ一覧を表示
  ├─ 未対応の変動を確認
  ├─ CSV出力
  └─ 手動でeBayに反映
```

---

## 📊 データベース設計

### 新規テーブル

```sql
-- 監視ルール
CREATE TABLE monitoring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marketplace VARCHAR(50) NOT NULL,
  frequency VARCHAR(20) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  priority VARCHAR(10) DEFAULT 'medium',
  conditions JSONB,
  actions JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 在庫変動履歴（既存を拡張）
ALTER TABLE inventory_changes
ADD COLUMN IF NOT EXISTS auto_applied BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ebay_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS price_recalculated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS new_ebay_price_usd DECIMAL(10,2);
```

---

## 🚀 デプロイ手順

### 1. データベースマイグレーション

```bash
# Supabase SQL Editorで実行
cat database/migrations/inventory_monitoring_vps.sql
```

### 2. VPSセットアップ

```bash
# スクリプトに実行権限付与
chmod +x ~/n3-frontend_new/scripts/run-inventory-monitoring.sh

# ログディレクトリ作成
mkdir -p ~/logs

# Crontab設定
crontab -e
# 以下を追加:
# 0 3 * * * /home/aritahiroaki/n3-frontend_new/scripts/run-inventory-monitoring.sh
```

### 3. 動作確認

```bash
# 手動実行テスト
~/n3-frontend_new/scripts/run-inventory-monitoring.sh

# ログ確認
tail -f ~/logs/inventory-monitoring.log

# Cron動作確認
sudo systemctl status cron
```

---

## 📈 今後の拡張

### Phase 6: Dynamic Pricing統合（後日）

価格調整戦略を在庫管理と統合：

1. **価格自動調整**: 在庫数に応じて価格を上げ下げ
2. **競合追従**: eBayの競合価格を監視して自動調整
3. **時期別価格**: 季節やイベントに応じて価格変動

---

## ✅ チェックリスト

- [ ] Phase 1: スクレイピングエンジン共通化
- [ ] Phase 2: 出品連携
- [ ] Phase 3: VPS Cron設定
- [ ] Phase 4: 価格再計算連携
- [ ] Phase 5: UI拡張
- [ ] データベースマイグレーション
- [ ] VPSデプロイ
- [ ] 動作確認テスト

---

**作成日**: 2025-11-02  
**ステータス**: 計画書作成完了 → 実装開始待ち  
**所要時間**: Phase 1-3 で約2-3日、Phase 4-5 で約2-3日
