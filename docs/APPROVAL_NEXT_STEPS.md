# 承認システム統合 - 実装完了 & 次のステップ

## ✅ 完了した修正

### 1. **承認ページ** (`/app/approval/page.tsx`)

#### 追加機能:
- ✅ **データ完全性チェック機能**
  - 必須フィールド: タイトル、コンディション、カテゴリ、原産国、HTSコード、AIスコア、画像
  - 不完全なデータは赤い「不完全」バッジ表示
  - 不完全な商品を承認しようとするとエラーメッセージ

- ✅ **データ完全性フィルター**
  - 「完全」「不完全」「すべて」の3つのオプション
  - データ完全性サマリー表示（完全/不完全の件数）

- ✅ **承認・否認・取消機能**
  - 承認: `approval_status='approved'`に設定
  - 否認: `approval_status='rejected'`に設定
  - 承認取消: `approval_status='pending'`に戻す

- ✅ **エラーハンドリング改善**
  - 詳細なエラーメッセージ表示
  - データ完全性チェックでの具体的な商品リスト表示

### 2. **スケジューラーページ** (`/app/listing-management/page.tsx`)

#### 既に実装済み:
- ✅ 承認済み商品のみ取得 (`approval_status='approved'`)
- ✅ 出品待ちステータスの商品のみ対象 (`status='ready_to_list'`)

### 3. **Cronエンドポイント** (`/app/api/cron/execute-schedules/route.ts`)

#### 既に実装済み:
- ✅ 承認済み商品のみ自動出品

### 4. **環境変数**

```bash
CRON_SECRET=nx07xvmI9HWjNmyGr5UsBZ6T9D69RSrA9v/IHs62t9E=
```

---

## 🔧 必須: データベースマイグレーション

### 手順1: Supabase SQL Editorを開く

1. https://supabase.com/dashboard にアクセス
2. プロジェクト `zdzfpucdyxdlavkgrvil` を選択
3. 左メニューから「SQL Editor」を選択
4. 「New Query」をクリック

### 手順2: 以下のSQLを実行

```sql
-- 1. approval_status カラムの追加（存在しない場合）
ALTER TABLE products_master 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';

-- 2. 承認関連カラムの追加
ALTER TABLE products_master 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_products_master_approval_status 
ON products_master(approval_status);

CREATE INDEX IF NOT EXISTS idx_products_master_status_approval 
ON products_master(status, approval_status);

CREATE INDEX IF NOT EXISTS idx_yahoo_products_approval_status 
ON yahoo_scraped_products(approval_status);

CREATE INDEX IF NOT EXISTS idx_yahoo_products_status_approval 
ON yahoo_scraped_products(status, approval_status);

-- 4. 既存データの移行（status='ready_to_list'のものは承認済みとする）
UPDATE products_master 
SET approval_status = 'approved',
    approved_at = COALESCE(approved_at, created_at)
WHERE status = 'ready_to_list' 
  AND (approval_status IS NULL OR approval_status = 'pending');

UPDATE yahoo_scraped_products 
SET approval_status = 'approved',
    approved_at = COALESCE(approved_at, created_at)
WHERE status = 'ready_to_list' 
  AND (approval_status IS NULL OR approval_status = 'pending');

-- 5. 検証: 承認済み商品数を確認
SELECT 
  'products_master' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE approval_status = 'approved') as approved,
  COUNT(*) FILTER (WHERE approval_status = 'pending') as pending,
  COUNT(*) FILTER (WHERE approval_status = 'rejected') as rejected
FROM products_master
UNION ALL
SELECT 
  'yahoo_scraped_products' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE approval_status = 'approved') as approved,
  COUNT(*) FILTER (WHERE approval_status = 'pending') as pending,
  COUNT(*) FILTER (WHERE approval_status = 'rejected') as rejected
FROM yahoo_scraped_products;
```

### 手順3: 実行結果を確認

最後のSELECT文で以下のような結果が表示されればOK:

```
table_name              | total | approved | pending | rejected
------------------------|-------|----------|---------|----------
products_master         |   150 |       85 |      60 |        5
yahoo_scraped_products  |   320 |      180 |     135 |        5
```

---

## 📊 動作確認テスト

### テスト1: 承認ページでデータ完全性チェック

1. http://localhost:3000/approval にアクセス
2. フィルターから「データ完全性: 不完全」を選択
3. 不完全な商品に赤い「不完全」バッジが表示されることを確認
4. 不完全な商品を選択して「一括承認」をクリック
5. エラーメッセージが表示され、承認できないことを確認 ✅

### テスト2: 完全なデータの承認

1. フィルターから「データ完全性: 完全」を選択
2. 商品を選択して「一括承認」をクリック
3. 成功メッセージが表示されることを確認 ✅
4. 「承認済み」タブに移動することを確認 ✅

### テスト3: スケジューラーに表示

1. http://localhost:3000/listing-management にアクセス
2. 承認した商品が「商品一覧」に表示されることを確認 ✅
3. 承認していない商品は表示されないことを確認 ✅

### テスト4: スケジュール生成

1. スケジューラーで「スケジュール生成」をクリック
2. 承認済み商品のみでスケジュールが生成されることを確認 ✅
3. カレンダーに出品予定が表示されることを確認 ✅

### テスト5: 承認取消

1. 承認ページの「承認済み」タブに移動
2. 商品を選択して「承認取消」をクリック
3. 「承認待ち」タブに戻ることを確認 ✅
4. スケジューラーから消えることを確認 ✅

---

## 🚨 エラーが出た場合のトラブルシューティング

### エラー: "column status does not exist"

**原因**: `products_master`テーブルに`status`カラムがない

**解決策**:
```sql
ALTER TABLE products_master 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
```

### エラー: "承認に失敗しました"

**原因1**: データベース接続エラー
- Supabaseのサービスが起動しているか確認

**原因2**: カラムが存在しない
- 上記のマイグレーションSQLを実行

**原因3**: RLSポリシー
```sql
-- RLSを一時的に無効化（開発環境のみ）
ALTER TABLE products_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE yahoo_scraped_products DISABLE ROW LEVEL SECURITY;
```

---

## 📝 データ完全性チェックの詳細

### 必須フィールド

以下のすべてが存在する場合のみ「完全」と判定:

1. ✅ **タイトル**: `title` または `title_en`
2. ✅ **コンディション**: `condition`
3. ✅ **カテゴリ**: `category_name`
4. ✅ **原産国**: `origin_country`
5. ✅ **HTSコード**: `hts_code`
6. ✅ **AIスコア**: `ai_confidence_score` (not null)
7. ✅ **画像**: `images`, `gallery_images`, または `primary_image_url` のいずれか

### チェック関数

```typescript
function isDataComplete(product: Product): boolean {
  const requiredFields = [
    product.title || product.title_en,
    product.condition,
    product.category_name,
    product.origin_country,
    product.hts_code,
    product.ai_confidence_score !== null && product.ai_confidence_score !== undefined,
    (product.images && product.images.length > 0) || 
    (product.gallery_images && product.gallery_images.length > 0) ||
    product.primary_image_url
  ]
  
  return requiredFields.every(field => field)
}
```

---

## 🎯 次のステップ

### 1. データベースマイグレーション実行 ← **今ここ**

上記のSQLをSupabaseで実行してください。

### 2. 動作確認

すべてのテストシナリオを実行してください。

### 3. 本番データの承認作業

1. 承認ページで「データ完全性: 不完全」の商品を確認
2. 不完全なデータを修正（または否認）
3. 完全なデータのみを承認
4. スケジューラーでスケジュール生成

### 4. VPSへのデプロイ

```bash
cd ~/n3-frontend_new
git add .
git commit -m "Add approval system with data completeness check"
git push origin main

# VPSで
git pull origin main
npm install
npm run build
pm2 restart n3-frontend
```

---

**作成日**: 2025-11-02  
**ステータス**: ✅ コード完成 → ⏳ DBマイグレーション待ち  
**次の作業**: Supabase SQL Editorで上記SQLを実行
