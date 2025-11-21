# Supabase セットアップガイド - 画像最適化エンジン

## 概要

画像最適化エンジンを使用するには、Supabaseに以下をセットアップする必要があります：

1. **image_rules テーブル** - ウォーターマーク設定を保存
2. **inventory-images バケット** - 処理済み画像を保存

---

## ステップ 1: データベーステーブルの作成

### 方法 A: Supabase SQL Editor を使用（推奨）

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. 左メニューから **SQL Editor** をクリック
4. 以下のSQLスクリプトをコピー＆ペーストして実行

```sql
-- ============================================
-- 画像ルールテーブル (image_rules)
-- モールアカウントごとのウォーターマーク設定を管理
-- ============================================

CREATE TABLE IF NOT EXISTS image_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- アカウント情報
  account_id VARCHAR(100) NOT NULL,
  marketplace VARCHAR(50) NOT NULL, -- 'ebay', 'amazon-global', 'amazon-jp', 'shopee', 'coupang', 'shopify'

  -- ウォーターマーク設定
  watermark_enabled BOOLEAN DEFAULT false,
  watermark_image_url TEXT, -- Supabase Storage URL
  watermark_position VARCHAR(20) DEFAULT 'bottom-right', -- 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'
  watermark_opacity DECIMAL(3, 2) DEFAULT 0.8, -- 0.0 ~ 1.0
  watermark_scale DECIMAL(3, 2) DEFAULT 0.15, -- ウォーターマークサイズ（画像サイズの割合）

  -- Amazon例外処理
  skip_watermark_for_amazon BOOLEAN DEFAULT true,

  -- 画像最適化設定
  auto_resize BOOLEAN DEFAULT true,
  target_size_px INTEGER DEFAULT 1600, -- 推奨画像サイズ
  quality INTEGER DEFAULT 90, -- JPEG品質 (1-100)

  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 制約
  CONSTRAINT unique_account_marketplace UNIQUE (account_id, marketplace)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_image_rules_account ON image_rules(account_id);
CREATE INDEX IF NOT EXISTS idx_image_rules_marketplace ON image_rules(marketplace);

-- RLS (Row Level Security) ポリシー
ALTER TABLE image_rules ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のアカウントのルールのみ閲覧・編集可能
CREATE POLICY "Users can view their own image rules"
  ON image_rules FOR SELECT
  USING (auth.uid()::text = account_id);

CREATE POLICY "Users can insert their own image rules"
  ON image_rules FOR INSERT
  WITH CHECK (auth.uid()::text = account_id);

CREATE POLICY "Users can update their own image rules"
  ON image_rules FOR UPDATE
  USING (auth.uid()::text = account_id);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_image_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_image_rules_updated_at
  BEFORE UPDATE ON image_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_image_rules_updated_at();
```

5. **Run** をクリックして実行
6. 成功メッセージを確認

### 方法 B: psql コマンドを使用

```bash
psql -h YOUR_SUPABASE_HOST \
     -U postgres \
     -d postgres \
     -f supabase/schema/image_rules.sql
```

### 確認

テーブルが正しく作成されたか確認：

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'image_rules';
```

---

## ステップ 2: ストレージバケットの作成

### inventory-images バケットを作成

1. Supabase Dashboard で **Storage** をクリック
2. **New Bucket** をクリック
3. 以下の設定で作成：
   - **Name**: `inventory-images`
   - **Public bucket**: ✅ チェック（画像URLを公開する場合）
   - **File size limit**: 10 MB（推奨）
   - **Allowed MIME types**: `image/*`

### フォルダ構造を作成（オプション）

バケット内に以下のフォルダを作成（自動的に作成されますが、事前に作成することも可能）：

```
inventory-images/
├── products/       # 元の画像
├── optimized/      # P1/P2/P3バリアント
└── listings/       # 最終処理済み画像
```

### ストレージポリシーの設定

認証ユーザーがアップロード・読み取り可能にする：

1. **Storage** > **Policies** をクリック
2. **New Policy** をクリック
3. 以下のポリシーを作成：

#### アップロードポリシー

```sql
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inventory-images'
  AND (storage.foldername(name))[1] IN ('products', 'optimized', 'listings')
);
```

#### 読み取りポリシー

```sql
CREATE POLICY "Public images are accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'inventory-images');
```

#### 削除ポリシー（オプション）

```sql
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inventory-images');
```

---

## ステップ 3: 環境変数の設定

`.env.local` に以下を追加：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**取得方法**:
1. Supabase Dashboard > **Settings** > **API**
2. **Project URL** をコピー → `NEXT_PUBLIC_SUPABASE_URL`
3. **anon public** をコピー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **service_role secret** をコピー → `SUPABASE_SERVICE_ROLE_KEY`

---

## ステップ 4: 動作確認

### テーブルの確認

```sql
-- テーブルが作成されているか確認
SELECT * FROM image_rules LIMIT 1;
```

### ストレージの確認

1. Supabase Dashboard > **Storage** > **inventory-images**
2. テスト画像をアップロード
3. 公開URLが取得できることを確認

### アプリケーションでの確認

1. アプリケーションを起動: `npm run dev`
2. `/settings/image-rules` にアクセス
3. モールを選択してウォーターマーク設定を保存
4. エラーが発生しないことを確認

---

## トラブルシューティング

### Q1: テーブル作成時に権限エラーが発生

**原因**: RLSポリシーの問題

**解決策**:
```sql
-- RLSを一時的に無効化
ALTER TABLE image_rules DISABLE ROW LEVEL SECURITY;

-- データを挿入/確認

-- RLSを再度有効化
ALTER TABLE image_rules ENABLE ROW LEVEL SECURITY;
```

### Q2: ストレージへのアップロードが失敗

**原因**: ストレージポリシーが正しく設定されていない

**解決策**:
1. Supabase Dashboard > **Storage** > **Policies**
2. `inventory-images` バケットのポリシーを確認
3. 認証ユーザーに INSERT/SELECT 権限があることを確認

### Q3: 環境変数が読み込まれない

**原因**: `.env.local` の設定ミス

**解決策**:
1. `.env.local` のキーと値に余計な空白がないか確認
2. アプリケーションを再起動: `npm run dev`
3. コンソールに「✅ Supabase初期化」が表示されることを確認

---

## 次のステップ

セットアップが完了したら、以下のドキュメントを参照してください：

- **使用方法**: `docs/IMAGE_OPTIMIZATION_ENGINE.md`
- **実装ガイド**: `docs/IMAGE_OPTIMIZATION_IMPLEMENTATION.md`

これで画像最適化エンジンを使用する準備が整いました！
