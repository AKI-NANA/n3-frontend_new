# 出品スケジュールツール自動化・開発計画書

## 📋 プロジェクト概要

**作成日**: 2025-11-02  
**対象システム**: n3-frontend_new 出品スケジュールツール  
**目的**: PC非依存の真の自動化システム構築とカテゴリ分散ロジック実装

---

## 🔍 現状分析結果

### 1. URL構造について

**結論**: **両方とも存在しますが、機能が異なります**

#### `/listing-management` (メインツール)
- **パス**: `app/listing-management/page.tsx`
- **役割**: スマート出品スケジューラーのメインUI
- **機能**:
  - スケジュール生成
  - カレンダー表示
  - 商品一覧とフィルタリング
  - モール別設定（eBay、Shopee、Amazon JP、Shopifyなど）
  - ランダム化設定
  - 「今すぐ出品」機能

#### `/management/listing` (シンプル版)
- **パス**: `app/management/listing/page.tsx`
- **役割**: `ListingManagement` コンポーネントをラップ
- **内容**: 
```tsx
import { ListingManagement } from '@/components/management-suite/listing/ListingManagement'

export default function ListingPage() {
  return <ListingManagement />
}
```

**推奨**: `/listing-management` をメインツールとして使用

---

## 📊 機能実装状況

### ✅ 実装済みの機能

#### 1. スケジュール生成システム
- ✅ **優先度ベースのソート**
  - `listing_priority` (high > medium > low)
  - `ai_confidence_score` (高い順)
  - `profit_amount_usd` (高い順)

- ✅ **モール別設定**
  ```typescript
  - eBay account1/account2: ランダム化ON
  - Shopee: ランダム化OFF（固定時刻）
  - Amazon JP: ランダム化OFF
  - Shopify: ランダム化OFF
  ```

- ✅ **ランダム化機能**
  - セッション数のランダム化 (2-6回/日)
  - 時刻のランダム化 (±30分)
  - 商品間隔のランダム化 (20-120秒)

- ✅ **日次・週次・月次の上限設定**
  ```typescript
  limits: {
    dailyMin: 10,
    dailyMax: 50,
    weeklyMin: 70,
    weeklyMax: 200,
    monthlyMax: 500
  }
  ```

#### 2. eBay API統合
- ✅ **Inventory API連携**
  - `lib/ebay/inventory.ts` に実装済み
  - `listProductToEbay()`: 商品出品関数
  - 3ステップの出品プロセス:
    1. Inventory Item作成/更新
    2. Offer作成
    3. Offer公開（出品）

- ✅ **OAuth認証**
  - `lib/ebay/oauth.ts` に実装済み
  - User Token方式（18ヶ月有効）
  - 2アカウント対応 (account1, account2)
  - 環境変数:
    - `EBAY_AUTH_TOKEN` または `EBAY_USER_ACCESS_TOKEN` (account1)
    - `EBAY_USER_TOKEN_GREEN` (account2)

#### 3. 即座出品機能
- ✅ **API実装**: `app/api/listing/now/route.ts`
- ✅ **処理フロー**:
  1. スケジュールから対象商品を取得
  2. eBay APIで順次出品
  3. ステータス更新 (`ready_to_list` → `listed`)
  4. 出品履歴の記録
  5. 2秒間隔で出品（レート制限対策）

#### 4. データベース統合
- ✅ **Supabase連携**
  - `yahoo_scraped_products`: 商品データ
  - `listing_schedules`: スケジュールデータ
  - `listing_history`: 出品履歴

- ✅ **スケジュール保存**: `lib/smart-scheduler.ts`
  - `saveSchedulesToDatabase()` 関数
  - 商品とスケジュールの紐付け

---

### ❌ 未実装の機能

#### 1. **完全自動化（最重要）**
**現状**: 手動生成・手動実行
```typescript
// 現在の動作
1. ユーザーが「スケジュール生成」ボタンをクリック
2. ユーザーが「今すぐ出品」ボタンをクリック
```

**必要な実装**:
```typescript
// 目標: 自動実行
1. Cronジョブでスケジュールをチェック
2. 指定時刻になったら自動で出品API実行
3. PCの起動状態に依存しない
```

#### 2. **カテゴリ分散ロジック（SEO最適化）**
**現状**: スコアのみで優先度決定
```typescript
// 現在の実装
sortProductsByPriority(products) {
  return products.sort((a, b) => {
    // 1. priority
    // 2. ai_confidence_score
    // 3. profit_amount_usd
  })
}
```

**必要な実装**:
```typescript
// 目標: カテゴリ分散を考慮
generateSchedule(products, settings) {
  // 1. 直近X日間の出品カテゴリを取得
  // 2. 出品がないカテゴリを特定
  // 3. そのカテゴリから最低1商品を選択
  // 4. 残りはスコア順に配分
}
```

#### 3. **サーバーサイド実行環境**
**現状**: Next.jsのクライアントサイド処理
- `'use client'` ディレクティブ使用
- ブラウザ依存

**必要な実装**:
- **Cronジョブシステム**
  - Vercel Cron（簡易版）
  - VPS上のcron（本格版）
- **サーバーサイドAPI**
  - `/api/cron/execute-schedules` エンドポイント
  - スケジュール実行ロジック

---

## 🎯 開発計画

### フェーズ1: 自動実行基盤構築【優先度: 最高】

#### 1.1 Cronエンドポイント作成
```
app/api/cron/execute-schedules/route.ts
```

**実装内容**:
```typescript
export async function GET(request: NextRequest) {
  // 1. 現在時刻から5分以内のスケジュールを取得
  // 2. ステータスが'pending'のスケジュールのみ処理
  // 3. 各スケジュールに対して出品処理実行
  // 4. 結果をログに記録
  // 5. エラー時のリトライロジック
}
```

#### 1.2 Vercel Cronの設定
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/execute-schedules",
      "schedule": "*/5 * * * *"  // 5分ごと
    }
  ]
}
```

**制限事項**:
- Vercel Cron: 最短1分間隔
- 実行時間: 最大10秒（Hobby）、60秒（Pro）
- タイムゾーン: UTC

#### 1.3 VPS移行準備（将来的）
**VPS推奨スペック**:
- CPU: 1-2 core
- RAM: 2-4 GB
- Storage: 20-40 GB SSD
- OS: Ubuntu 22.04 LTS

**候補サービス**:
1. **Linode** (Akamai): $5/月～
2. **DigitalOcean**: $6/月～
3. **Vultr**: $6/月～
4. **ConoHa VPS** (日本): 1,000円/月～

### フェーズ2: カテゴリ分散ロジック実装【優先度: 高】

#### 2.1 データベース拡張
```sql
-- listing_schedulesテーブルに追加
ALTER TABLE listing_schedules 
ADD COLUMN category_id VARCHAR(50);

-- カテゴリ分散設定テーブル
CREATE TABLE category_distribution_settings (
  id SERIAL PRIMARY KEY,
  lookback_days INTEGER DEFAULT 7,
  min_categories_per_day INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.2 スケジュール生成ロジック改良
```typescript
// lib/smart-scheduler.ts の拡張

interface CategoryDistributionSettings {
  lookbackDays: number;      // 直近X日間をチェック
  minCategoriesPerDay: number; // 1日最低N個の異なるカテゴリ
}

class SmartScheduleGenerator {
  async generateMonthlySchedule(
    products: Product[], 
    startDate: Date, 
    endDate: Date,
    categorySettings: CategoryDistributionSettings
  ): Promise<ScheduledSession[]> {
    
    // 1. 直近の出品カテゴリ統計を取得
    const recentCategories = await this.getRecentCategories(
      categorySettings.lookbackDays
    );
    
    // 2. カテゴリ別に商品をグループ化
    const categoryGroups = this.groupByCategory(products);
    
    // 3. 出品が少ないカテゴリを優先
    const underrepresentedCategories = this.findUnderrepresentedCategories(
      categoryGroups,
      recentCategories
    );
    
    // 4. スケジュール生成時にカテゴリ分散を考慮
    return this.generateWithCategoryDistribution(
      products,
      startDate,
      endDate,
      underrepresentedCategories,
      categorySettings
    );
  }
  
  private async getRecentCategories(days: number) {
    // Supabaseから直近N日間の出品カテゴリを取得
    const { data } = await supabase
      .from('listing_schedules')
      .select('category_id, COUNT(*) as count')
      .gte('date', subDays(new Date(), days))
      .groupBy('category_id');
    
    return data;
  }
}
```

#### 2.3 UI設定追加
```tsx
// app/listing-management/page.tsx に追加

<TabsContent value="category-settings">
  <Card>
    <CardHeader>
      <CardTitle>カテゴリ分散設定（SEO最適化）</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div>
          <Label>チェック期間（日）</Label>
          <Input 
            type="number" 
            value={categorySettings.lookbackDays}
            onChange={(e) => setCategorySettings({
              ...categorySettings,
              lookbackDays: parseInt(e.target.value)
            })}
          />
          <p className="text-xs text-muted-foreground">
            直近N日間の出品カテゴリをチェック
          </p>
        </div>
        
        <div>
          <Label>1日最低カテゴリ数</Label>
          <Input 
            type="number" 
            value={categorySettings.minCategoriesPerDay}
            onChange={(e) => setCategorySettings({
              ...categorySettings,
              minCategoriesPerDay: parseInt(e.target.value)
            })}
          />
          <p className="text-xs text-muted-foreground">
            出品が少ないカテゴリから最低N個選択
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>
```

### フェーズ3: 監視・ログシステム【優先度: 中】

#### 3.1 実行ログテーブル
```sql
CREATE TABLE cron_execution_logs (
  id SERIAL PRIMARY KEY,
  execution_time TIMESTAMP NOT NULL,
  schedules_processed INTEGER,
  products_listed INTEGER,
  errors_count INTEGER,
  error_details JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.2 ダッシュボード
```tsx
// app/listing-management/page.tsx に追加

<Card>
  <CardHeader>
    <CardTitle>自動実行ログ</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {executionLogs.map(log => (
        <div key={log.id} className="flex items-center justify-between p-3 border rounded">
          <div>
            <div className="font-medium">
              {new Date(log.execution_time).toLocaleString('ja-JP')}
            </div>
            <div className="text-sm text-muted-foreground">
              {log.products_listed}件出品 / {log.schedules_processed}セッション
            </div>
          </div>
          {log.errors_count > 0 && (
            <Badge variant="destructive">{log.errors_count}件エラー</Badge>
          )}
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

---

## 🚀 実装優先順位

### 最優先（今すぐ実装）
1. ✅ **Cronエンドポイント作成** (`/api/cron/execute-schedules`)
2. ✅ **Vercel Cron設定** (`vercel.json`)
3. ✅ **基本的な自動実行ロジック**

### 高優先度（1週間以内）
4. ✅ **カテゴリ分散ロジック実装**
5. ✅ **UI設定画面追加**
6. ✅ **エラーハンドリング強化**

### 中優先度（2週間以内）
7. ✅ **実行ログシステム**
8. ✅ **監視ダッシュボード**
9. ✅ **通知機能（エラー時）**

### 低優先度（将来的）
10. ⏳ **VPS移行**
11. ⏳ **より高度なランダム化**
12. ⏳ **A/Bテスト機能**

---

## 💡 技術的な実現可能性

### ✅ できること

#### 1. Vercel Cronによる自動化
- **実現可能**: はい
- **制限**:
  - 最短1分間隔
  - Hobby: 10秒、Pro: 60秒のタイムアウト
  - 同時実行: 1つのみ

**推奨アプローチ**:
```typescript
// 1分ごとにチェック、該当スケジュールのみ実行
export async function GET() {
  const now = new Date();
  const fiveMinutesAgo = subMinutes(now, 5);
  const fiveMinutesLater = addMinutes(now, 5);
  
  // 現在時刻±5分のスケジュールを取得
  const schedules = await getSchedulesInTimeRange(
    fiveMinutesAgo, 
    fiveMinutesLater
  );
  
  // 1つずつ処理（タイムアウト対策）
  for (const schedule of schedules.slice(0, 5)) {
    await processSchedule(schedule);
  }
}
```

#### 2. eBay API統合
- **実現可能**: はい（既に実装済み）
- **現状**: User Token方式で18ヶ月有効
- **レート制限**: 5,000 calls/day（十分）

#### 3. カテゴリ分散ロジック
- **実現可能**: はい
- **データ**: 既存の`category_id`を活用
- **計算量**: O(n log n) で実装可能

### ⚠️ 注意が必要なこと

#### 1. タイムゾーン
- **Vercel Cron**: UTC固定
- **対策**: 日本時間に変換
```typescript
const JST_OFFSET = 9 * 60 * 60 * 1000;
const jstDate = new Date(Date.now() + JST_OFFSET);
```

#### 2. 実行時間制限
- **Hobby**: 10秒
- **Pro**: 60秒
- **対策**: 
  - 1回の実行で最大5商品まで
  - 残りは次回の実行で処理

#### 3. eBay APIエラー
- **対策**: 
  - リトライロジック（3回まで）
  - エラーログの詳細記録
  - 管理者への通知

### ❌ VPSでないとできないこと

1. **秒単位のスケジュール**
   - Vercel: 最短1分
   - VPS: 任意（例: 10秒ごと）

2. **長時間実行**
   - Vercel: 最大60秒
   - VPS: 無制限

3. **並列処理**
   - Vercel: 基本的に1つずつ
   - VPS: 複数ワーカー可能

---

## 📝 まとめ

### 現状
- ✅ **UI**: 完成度高い
- ✅ **スケジュール生成**: 動作確認済み
- ✅ **eBay API連携**: 実装済み
- ✅ **即座出品**: 動作確認済み
- ❌ **自動実行**: 未実装
- ❌ **カテゴリ分散**: 未実装

### 次のステップ
1. **今日〜明日**: Cronエンドポイント作成
2. **今週中**: Vercel Cronで自動化テスト
3. **来週**: カテゴリ分散ロジック実装
4. **2週間後**: 本番運用開始

### 推奨事項
- まず**Vercel Cron**で自動化を実現
- 運用しながら**カテゴリ分散**を追加
- 将来的に規模拡大時に**VPS移行**を検討

---

**作成者**: Claude  
**レビュー**: 未  
**承認**: 未  
