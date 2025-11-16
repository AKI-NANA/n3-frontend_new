# テーブル設計とデータフロー - 完全解説

## 📊 テーブル設計の正しい理解

### products_master (商品マスター)
**役割**: 商品の基本情報と承認状態を管理する **マスターテーブル**

```sql
CREATE TABLE products_master (
    id BIGINT PRIMARY KEY,
    sku TEXT UNIQUE,
    title TEXT,
    title_en TEXT,
    approval_status TEXT,  -- 'pending', 'approved', 'rejected'
    workflow_status TEXT,  -- 'scraped', 'enriched', 'ready_to_list'
    ai_confidence_score INTEGER,
    listing_priority TEXT,  -- 'high', 'medium', 'low'
    current_price DECIMAL,
    listing_price DECIMAL,
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    -- ... その他の商品情報
);
```

**重要な点**:
- このテーブルには **どのモールに出品するか** の情報は **含まれていない**
- 1つの商品を複数のモールに出品する可能性があるため
- マーケットプレイス情報は `listing_schedule` テーブルで管理

---

### listing_schedule (出品スケジュール)
**役割**: 承認済み商品の **出品スケジュール** を管理する

```sql
CREATE TABLE listing_schedule (
    id UUID PRIMARY KEY,
    product_id BIGINT REFERENCES products_master(id),  -- ← マスターへの参照
    marketplace TEXT,      -- 'ebay', 'shopee', 'amazon_jp', etc.
    account_id TEXT,       -- そのモール内の特定アカウント
    scheduled_at TIMESTAMPTZ,  -- 出品予定日時
    status TEXT,           -- 'PENDING', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'ERROR'
    priority INTEGER,      -- 優先度 (AIスコアに基づく)
    listing_id_external TEXT,  -- モールから返されるID (出品後)
    listed_at TIMESTAMPTZ,     -- 実際に出品された日時
    error_message TEXT,
    retry_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**重要な点**:
- **1対多の関係**: 1つの `products_master` レコードに対して、複数の `listing_schedule` レコードが存在可能
- 同じ商品を異なるモール・アカウント・日時で出品できる

**データ例**:
```
products_master:
  id=322, sku='YAH-13', approval_status='approved'

listing_schedule (3つのスケジュール):
  product_id=322, marketplace='ebay',   account_id='account1', scheduled_at='2025-11-16 10:00'
  product_id=322, marketplace='ebay',   account_id='account2', scheduled_at='2025-11-16 14:00'
  product_id=322, marketplace='shopee', account_id='main',     scheduled_at='2025-11-17 09:00'
```

---

## 🔄 正しいデータフロー

### フェーズ1: 商品承認 (承認ページ)

```
1. ユーザーが承認ページで商品を選択
   ↓
2. 「承認・出品予約」ボタンをクリック
   ↓
3. 出品戦略コントロールモーダルが表示
   - マーケットプレイス選択 (ebay, shopee, etc.)
   - アカウント選択 (account1, account2, main, etc.)
   - モード選択 (即時 or スケジュール)
   - スケジュール設定 (開始日、間隔、ランダム化など)
   ↓
4. 「承認・出品予約」確定
   ↓
5. API呼び出し: POST /api/approval/create-schedule
   {
     productIds: [322, 323, 324],
     strategy: {
       marketplaces: [
         { marketplace: 'ebay', accountId: 'account1' },
         { marketplace: 'shopee', accountId: 'main' }
       ],
       mode: 'scheduled',
       scheduleSettings: {
         startDate: '2025-11-16',
         intervalHours: 4,
         sessionsPerDay: 3,
         randomization: true
       }
     }
   }
   ↓
6. API処理:
   
   6-1. products_master テーブルを更新
   UPDATE products_master SET
     approval_status = 'approved',
     approved_at = NOW(),
     workflow_status = 'ready_to_list'
   WHERE id IN (322, 323, 324)
   
   6-2. listing_schedule テーブルにレコード作成
   - 各商品 × 各マーケットプレイス の組み合わせを作成
   - scheduled_at を計算 (スコアの高い順、設定に基づく)
   - priority を設定 (ai_confidence_score に基づく)
   
   例: 商品3つ × モール2つ = 6件のスケジュールレコード
   
   INSERT INTO listing_schedule VALUES
   (322, 'ebay',   'account1', '2025-11-16 10:00', 'SCHEDULED', 1000),
   (323, 'ebay',   'account1', '2025-11-16 14:00', 'SCHEDULED', 900),
   (324, 'ebay',   'account1', '2025-11-16 18:00', 'SCHEDULED', 800),
   (322, 'shopee', 'main',     '2025-11-17 09:00', 'SCHEDULED', 1000),
   (323, 'shopee', 'main',     '2025-11-17 13:00', 'SCHEDULED', 900),
   (324, 'shopee', 'main',     '2025-11-17 17:00', 'SCHEDULED', 800)
```

---

### フェーズ2: スケジュール確認 (listing-management ページ)

```
1. ページアクセス: http://localhost:3000/listing-management
   ↓
2. データ取得クエリ:
   SELECT 
     ls.*,
     pm.sku,
     pm.title,
     pm.title_en,
     pm.current_price,
     pm.listing_price,
     pm.ai_confidence_score
   FROM listing_schedule ls
   LEFT JOIN products_master pm ON ls.product_id = pm.id
   ORDER BY ls.scheduled_at ASC
   ↓
3. 表示:
   - カレンダービュー (月次)
   - 商品一覧 (フィルター可能)
   - ステータス別集計
   ↓
4. 操作:
   - 即時実行: scheduled_at を NOW() に変更、priority を 999 に設定
   - キャンセル: status を 'CANCELLED' に変更
   - 削除: レコードを削除
```

---

### フェーズ3: 自動出品 (スケジューラー - 未実装)

```
1. Cron Job or Edge Function (定期実行)
   ↓
2. 実行対象のスケジュール取得:
   SELECT 
     ls.*,
     pm.*
   FROM listing_schedule ls
   JOIN products_master pm ON ls.product_id = pm.id
   WHERE ls.scheduled_at <= NOW()
     AND ls.status IN ('PENDING', 'SCHEDULED')
   ORDER BY ls.priority DESC, ls.scheduled_at ASC
   LIMIT 10
   ↓
3. 各スケジュールに対して実行:
   
   for each schedule:
     3-1. PublisherHub API呼び出し
          - marketplace: schedule.marketplace
          - account_id: schedule.account_id
          - product_data: schedule.products_master (全商品情報)
     
     3-2. 成功時:
          UPDATE listing_schedule SET
            status = 'COMPLETED',
            listed_at = NOW(),
            listing_id_external = '返されたeBay Item ID'
          WHERE id = schedule.id
          
          UPDATE products_master SET
            listing_status = 'listed',
            ebay_item_id = '返されたID'  -- marketplace固有のID
          WHERE id = schedule.product_id
     
     3-3. 失敗時:
          UPDATE listing_schedule SET
            status = 'ERROR',
            error_message = 'エラー内容',
            retry_count = retry_count + 1
          WHERE id = schedule.id
```

---

## ✅ 現在の実装状況

### 実装済み ✓
1. **products_master テーブル**: 商品データが存在 (id=322など)
2. **listing_schedule テーブル**: テーブル構造完成
3. **承認API**: `/api/approval/create-schedule` - スケジュール作成ロジック実装済み
4. **listing-management ページ**: 
   - listing_schedule からデータ取得
   - カレンダー表示
   - 商品一覧表示
   - 即時実行・キャンセル・削除機能

### 未実装 ✗
1. **PublisherHub API統合**: 実際の出品処理
2. **自動スケジューラー**: Cron Job / Edge Function
3. **出品完了後のステータス更新**: listing_schedule.status の自動更新

---

## 🎯 次に確認すべきこと

### 1. データベース確認
Supabase SQL Editorで以下を実行:

```sql
-- products_masterのデータ確認
SELECT id, sku, title, approval_status, approved_at 
FROM products_master 
WHERE id = 322;

-- listing_scheduleのデータ確認 (存在するか?)
SELECT * FROM listing_schedule 
WHERE product_id = 322;

-- 承認済みだがスケジュールがない商品
SELECT pm.id, pm.sku, pm.title, pm.approval_status
FROM products_master pm
LEFT JOIN listing_schedule ls ON pm.id = ls.product_id
WHERE pm.approval_status = 'approved' AND ls.id IS NULL;
```

### 2. 承認フローのテスト
1. `http://localhost:3000/approval` にアクセス
2. id=322の商品を選択
3. 「承認・出品予約」をクリック
4. 出品戦略を設定
5. 確定
6. listing_schedule テーブルにレコードが作成されることを確認
7. `http://localhost:3000/listing-management` でスケジュールが表示されることを確認

---

## 📝 重要なポイント

### products_master は「商品カタログ」
- どの商品が存在するか
- どの商品が承認されたか
- 商品の基本情報 (価格、タイトル、画像など)

### listing_schedule は「出品予定表」
- いつ、どのモールに、どのアカウントで出品するか
- 出品の優先順位
- 出品結果の記録

### 1商品 → 複数スケジュール
同じ商品を:
- 異なるモールに出品できる (eBay + Shopee)
- 同じモールの異なるアカウントに出品できる (eBay account1 + account2)
- 異なる日時に出品できる

これが **listing_schedule テーブルが必要な理由** です。

---

## 🚀 推奨される次のステップ

1. **データ確認**: 上記のSQLを実行してテーブルの状態を確認
2. **テストフロー**: 承認→スケジュール作成→表示の流れを確認
3. **PublisherHub統合**: 実際の出品処理の実装
4. **スケジューラー実装**: 自動出品の仕組み構築

すべてのロジックは正しく設計されています。あとは各機能を順番に実装・テストしていくだけです！
