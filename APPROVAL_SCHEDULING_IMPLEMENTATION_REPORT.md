# 承認・出品スケジューリング機能拡張 - 実装完了報告

## 📋 実装概要

**実装日**: 2025年11月15日  
**対象機能**: 承認ページと出品スケジュール管理の拡張  
**設計書**: `💡 承認と出品スケジューリング機能の拡張アイデア`に基づく実装

## 🎯 実装内容

### 1. データベーススキーマの追加

#### `listing_schedule` テーブルの作成

**ファイル**: `/sql/create_listing_schedule_table.sql`

```sql
CREATE TABLE listing_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_id UUID NOT NULL REFERENCES sku_master(id) ON DELETE CASCADE,
    marketplace TEXT NOT NULL,
    account_id TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    listing_id_external TEXT,
    listed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT,
    notes TEXT,
    priority INTEGER DEFAULT 0,
    UNIQUE(sku_id, marketplace, account_id, scheduled_at)
);
```

**主な機能**:
- SKUマスターとの参照整合性
- マーケットプレイス・アカウント単位の管理
- スケジュール状態管理 (PENDING, SCHEDULED, RUNNING, COMPLETED, ERROR, CANCELLED)
- リトライ機能
- 優先度設定
- RLSポリシー設定済み

**インデックス**:
- `sku_id`, `marketplace`, `status`, `scheduled_at`
- 複合インデックス: `(scheduled_at, status)` for スケジューラ実行最適化

---

### 2. 承認ページの拡張

#### A. 出品戦略コントロールコンポーネント

**ファイル**: `/components/approval/ListingStrategyControl.tsx`

**機能**:
1. **マーケットプレイス選択**
   - eBay (mjt / green)
   - Shopee (main)
   - Qoo10 (main)
   - Amazon JP (main)
   - Shopify (main)
   - トップレベル選択 + アカウント選択の2段階UI

2. **出品モード選択**
   - 即時出品: 承認後すぐに出品処理開始
   - スケジュール出品: 指定日時からスケジュールに従って出品

3. **スケジュール詳細設定**
   - 開始日の設定
   - 出品間隔(時間)の設定
   - 1日あたりのセッション数
   - 時間のランダム化オプション (±30分)

#### B. 承認ページの更新

**ファイル**: `/app/approval/page.tsx`

**主な変更点**:
```typescript
// 🔥 出品戦略コントロールの統合
const [showListingStrategyControl, setShowListingStrategyControl] = useState(false)

// 承認ボタンクリック時
const handleApprove = async () => {
  // データ完全性チェック
  // 不完全な商品がある → 確認モーダル表示
  // 全て完全 → 出品戦略コントロール表示
  setShowListingStrategyControl(true)
}

// 出品戦略確定時
const handleStrategyConfirm = async (strategy: ListingStrategy) => {
  await fetch('/api/approval/create-schedule', {
    method: 'POST',
    body: JSON.stringify({ productIds, strategy })
  })
}
```

**UI改善**:
- 「一括承認」ボタン → 「承認・出品予約」ボタンに変更
- データ不完全商品の警告表示継続
- 出品戦略コントロールモーダル統合

---

### 3. APIエンドポイントの実装

#### 承認・スケジュール作成API

**ファイル**: `/app/api/approval/create-schedule/route.ts`

**エンドポイント**: `POST /api/approval/create-schedule`

**リクエスト**:
```typescript
{
  productIds: number[],
  strategy: {
    marketplaces: Array<{
      marketplace: string,
      accountId: string
    }>,
    mode: 'immediate' | 'scheduled',
    scheduleSettings?: {
      startDate: string,
      intervalHours: number,
      sessionsPerDay: number,
      randomization: boolean
    }
  }
}
```

**処理フロー**:
1. 選択商品の`approval_status`を'approved'に更新
2. `status`を'ready_to_list'に更新
3. `listing_schedule`テーブルにレコード作成

**スケジュール生成ロジック**:

**即時出品の場合**:
```typescript
// 2分間隔で順次実行
const scheduledAt = new Date(now.getTime() + (index * 2 * 60 * 1000))
status = 'PENDING'
priority = 1000 - index // 早い商品ほど高優先度
```

**スケジュール出品の場合**:
```typescript
// ラウンドロビン方式でマーケットプレイス/アカウント割り当て
// セッション数とインターバルに基づいて時刻計算
// ランダム化オプションで±30分のオフセット追加
status = 'SCHEDULED'
priority = 100 - Math.floor(index / 10)
```

**レスポンス**:
```typescript
{
  success: true,
  message: "N件の商品を承認し、M件の出品スケジュールを作成しました",
  data: {
    approvedCount: number,
    scheduleCount: number,
    schedules: Array<Schedule>
  }
}
```

---

### 4. 出品スケジュール管理ページの修正方針

**現在のページ**: `/app/listing-management/page.tsx`

**必要な修正**:

1. **データソースの変更**
   ```typescript
   // 現在: sku_master から直接取得
   .from('sku_master')
   .eq('status', 'ready_to_list')
   
   // 修正後: listing_schedule から取得
   .from('listing_schedule')
   .select(`
     *,
     sku_master (id, sku, title, title_en, current_price, listing_price)
   `)
   .in('status', ['PENDING', 'SCHEDULED'])
   ```

2. **フィルター機能の拡張**
   - マーケットプレイス別
   - アカウント別
   - ステータス別 (PENDING, SCHEDULED, RUNNING, ERROR)
   - 予定日時範囲

3. **即時実行機能の追加**
   ```typescript
   // [即時出品実行] ボタン
   const executeImmediately = async (scheduleIds: string[]) => {
     await supabase
       .from('listing_schedule')
       .update({
         scheduled_at: new Date().toISOString(),
         status: 'PENDING',
         priority: 999
       })
       .in('id', scheduleIds)
   }
   ```

4. **一括操作の追加**
   - スケジュール変更
   - キャンセル
   - 再スケジュール
   - エラーリトライ

---

## 📊 データフロー

```
┌─────────────────────────┐
│   承認ページ (Approval)   │
│   - 商品選択              │
│   - データ完全性チェック   │
└────────────┬────────────┘
             │
             │ 承認ボタンクリック
             ▼
┌─────────────────────────┐
│ 出品戦略コントロール       │
│ - マーケットプレイス選択   │
│ - アカウント選択          │
│ - 出品モード選択          │
│ - スケジュール設定        │
└────────────┬────────────┘
             │
             │ 確定
             ▼
┌─────────────────────────┐
│ API: create-schedule     │
│ 1. approval_status更新   │
│ 2. listing_schedule作成  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ listing_scheduleテーブル │
│ - SKU × Marketplace      │
│ - × Account の組み合わせ │
└────────────┬────────────┘
             │
             │ スケジューラ実行
             ▼
┌─────────────────────────┐
│ 出品スケジュール管理       │
│ - スケジュール一覧        │
│ - 即時実行               │
│ - ステータス管理          │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ PublisherHub.js (将来)  │
│ - 各モールへの実出品      │
│ - 結果のステータス更新    │
└─────────────────────────┘
```

---

## 🔧 技術的詳細

### 使用技術スタック
- **フロントエンド**: Next.js 15.5.4, React 19, TypeScript
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase PostgreSQL
- **UIコンポーネント**: shadcn/ui
- **状態管理**: React Hooks (useState, useEffect)

### セキュリティ対策
- Row Level Security (RLS) ポリシー設定
- 認証済みユーザーのみ操作可能
- SQLインジェクション対策 (Supabaseクライアント使用)
- UNIQUE制約による重複防止

### パフォーマンス最適化
- インデックス最適化 (scheduled_at, status)
- 複合インデックスによるスケジューラ実行高速化
- ページネーション対応 (listing-management)

---

## ✅ 実装完了チェックリスト

### データベース
- [x] `listing_schedule`テーブル作成SQLスクリプト
- [x] インデックス設定
- [x] RLSポリシー設定
- [x] updated_at自動更新トリガー
- [ ] Supabaseでのマイグレーション実行（ユーザー実施）

### 承認ページ
- [x] `ListingStrategyControl`コンポーネント作成
- [x] マーケットプレイス・アカウント選択UI
- [x] 出品モード選択UI
- [x] スケジュール設定UI
- [x] 承認ページへの統合

### API
- [x] `create-schedule` POSTエンドポイント
- [x] スケジュール生成ロジック実装
- [x] エラーハンドリング
- [x] レスポンス形式統一

### 出品スケジュール管理ページ
- [ ] データソース変更 (sku_master → listing_schedule)
- [ ] フィルター機能拡張
- [ ] 即時実行機能追加
- [ ] 一括操作機能追加

---

## 🚀 次のステップ

### 短期 (1週間以内)
1. **データベースマイグレーション**
   ```bash
   # Supabase SQL Editorで実行
   cd /Users/aritahiroaki/n3-frontend_new
   # sql/create_listing_schedule_table.sql の内容を実行
   ```

2. **出品スケジュール管理ページの修正完了**
   - データソース変更
   - フィルター・即時実行機能追加

3. **動作確認・テスト**
   - 承認フロー全体のテスト
   - スケジュール作成のテスト
   - 各マーケットプレイス・アカウント組み合わせテスト

### 中期 (2-4週間)
1. **スケジューラ実装**
   ```typescript
   // 定期実行ジョブ (5分ごと)
   // listing_schedule から scheduled_at <= NOW() && status=PENDING を取得
   // PublisherHub を呼び出して実出品
   // status を COMPLETED に更新
   ```

2. **PublisherHub.js 統合**
   - マーケットプレイス別の出品処理
   - エラーハンドリング・リトライロジック

3. **監視・ログ機能**
   - 出品成功率の追跡
   - エラーログの集約
   - アラート機能

### 長期 (1-3ヶ月)
1. **高度なスケジューリング機能**
   - カテゴリー分散配置
   - SEO最適化された時間帯配置
   - アカウント健全性を考慮した出品制限

2. **レポート・分析機能**
   - 出品実績レポート
   - マーケットプレイス別パフォーマンス
   - A/Bテスト機能

---

## 📝 使用方法

### 1. データベースセットアップ

```bash
# Supabase SQL Editorにアクセス
# /sql/create_listing_schedule_table.sql の内容をコピー&ペースト
# 実行ボタンをクリック
```

### 2. 承認フロー

1. **承認ページ**にアクセス (`http://localhost:3000/approval`)
2. 商品を選択
3. 「承認・出品予約」ボタンをクリック
4. 出品戦略コントロールモーダルで設定:
   - マーケットプレイス・アカウント選択
   - 出品モード選択 (即時 or スケジュール)
   - スケジュール詳細設定
5. 「承認・出品予約」ボタンで確定
6. 成功メッセージ表示

### 3. スケジュール管理

1. **出品スケジュール管理**ページにアクセス (`http://localhost:3000/listing-management`)
2. スケジュール一覧を確認
3. フィルター機能で絞り込み
4. 必要に応じて即時実行・キャンセル等の操作

---

## 🐛 既知の制限事項

1. **PublisherHub統合が未完了**
   - スケジュールは作成されるが、実際の出品処理は未実装
   - 次フェーズで実装予定

2. **出品スケジュール管理ページの修正が未完了**
   - データソースは`listing_schedule`テーブルに変更する必要がある
   - 即時実行機能等を追加する必要がある

3. **エラーリトライロジックが未実装**
   - `retry_count`フィールドは用意されているが、自動リトライ機能は未実装

---

## 📚 参考ドキュメント

- 設計書: `/mnt/project/`の`💡 承認と出品スケジューリング機能の拡張アイデア`
- Supabase PostgreSQL: https://supabase.com/docs/guides/database
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- shadcn/ui: https://ui.shadcn.com/

---

## ✨ まとめ

承認と出品スケジューリング機能の分離に成功し、柔軟な多アカウント・多モール対応が可能になりました。

**主な成果**:
- ✅ データベーススキーマ完成
- ✅ 承認ページの拡張完了
- ✅ 出品戦略コントロールUI実装完了
- ✅ API実装完了

**残作業**:
- データベースマイグレーション実行
- 出品スケジュール管理ページの修正
- スケジューラとPublisherHubの統合

この実装により、「データ承認」と「出品実行」の役割が明確に分離され、ユーザーは承認時に柔軟な出品戦略を選択できるようになりました。
