# 棚卸し（在庫管理）システム デプロイメントガイド

## 📋 目次

1. [概要](#概要)
2. [前提条件](#前提条件)
3. [データベースセットアップ](#データベースセットアップ)
4. [アプリケーションのデプロイ](#アプリケーションのデプロイ)
5. [動作確認](#動作確認)
6. [トラブルシューティング](#トラブルシューティング)

---

## 概要

このガイドでは、棚卸し（在庫管理）システムのデプロイ手順を説明します。

### 実装済み機能

- ✅ 在庫マスター管理（CRUD操作）
- ✅ セット商品作成機能
- ✅ 出品データ連携（/tools/editing へ）
- ✅ フィルター・検索機能
- ✅ グリッド/テーブル表示切替
- ✅ 在庫変更履歴の自動記録
- ✅ セット商品の在庫自動計算

### システム構成

```
┌─────────────────────┐
│  /zaiko/tanaoroshi  │  在庫マスター管理
│  (棚卸しUI)          │  - 商品登録・編集
└──────────┬──────────┘  - セット作成
           │
           │ 出品データ作成
           ▼
┌─────────────────────┐
│  /tools/editing     │  出品データ編集
│  (FullFeaturedModal)│  - タイトル編集
└──────────┬──────────┘  - カテゴリ設定
           │             - 価格計算
           │             - HTML生成
           ▼
┌─────────────────────┐
│  TabFinal           │  最終確認・出品
│  (出品実行)          │  - セット商品対応
└─────────────────────┘  - 構成商品自動停止
```

---

## 前提条件

### 必須

- [x] Supabaseプロジェクトが作成済み
- [x] Node.js 18以上がインストール済み
- [x] GitとGitHub/GitLabアクセス権限

### 確認方法

```bash
# Node.jsバージョン確認
node --version  # v18.0.0以上

# Supabase接続確認
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## データベースセットアップ

### ステップ1: Supabaseダッシュボードにアクセス

1. https://supabase.com/dashboard にログイン
2. プロジェクトを選択
3. 左メニューから「**SQL Editor**」を開く

### ステップ2: マイグレーションSQLを実行

1. 新規クエリを作成
2. 以下のファイルの内容を **全てコピー** して貼り付け:
   ```
   supabase/migrations/20251026_inventory_system.sql
   ```
3. 「**RUN**」ボタンをクリック

### ステップ3: 実行結果の確認

成功すると以下のテーブルが作成されます:

- ✅ `inventory_master` - 在庫マスターテーブル
- ✅ `set_components` - セット構成テーブル
- ✅ `inventory_changes` - 在庫変更履歴テーブル

#### 確認方法

左メニュー「**Table Editor**」で以下を確認:

```sql
-- サンプルデータの確認
SELECT COUNT(*) FROM inventory_master;
-- 結果: 7件 (iPhone, MacBook, AirPods, Watch, iPad, Sony, Bundle Set)

SELECT * FROM inventory_master WHERE product_type = 'set';
-- 結果: 1件 (Apple Bundle Set)

SELECT * FROM set_components;
-- 結果: 3件 (セット構成: iPhone + AirPods + Watch)
```

### エラーが発生した場合

#### エラー: `type "inventory_type" already exists`

→ **問題なし**。既に型が存在している場合のエラーです。無視してください。

#### エラー: `relation "inventory_master" already exists`

→ **問題なし**。テーブルが既に存在しています。

#### エラー: `permission denied`

→ **解決策**:
1. Supabase Dashboard → Settings → Database
2. 「Pooler」が有効になっているか確認
3. RLSポリシーが正しく設定されているか確認

---

## アプリケーションのデプロイ

### ステップ1: リポジトリの更新

```bash
# 最新のコードを取得
git pull origin claude/amazon-research-tool-setup-011CULLtFV48C1pR7PeyHTdv

# 依存関係のインストール
npm install
```

### ステップ2: 環境変数の確認

`.env.local` ファイルに以下が設定されているか確認:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# (オプション) マイグレーション実行用
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### ステップ3: ビルド実行

```bash
npm run build
```

成功すると以下のように表示されます:

```
✓ Compiled successfully in 36.0s
✓ Generating static pages (151/151)
```

### ステップ4: 本番環境へデプロイ

#### Vercel の場合

```bash
vercel --prod
```

#### VPS (Docker) の場合

```bash
# ビルド
docker build -t n3-frontend .

# 起動
docker run -d -p 3000:3000 --env-file .env.local n3-frontend
```

#### 手動デプロイの場合

```bash
# ビルド成果物を確認
ls -la .next/

# VPSにアップロード
rsync -avz .next/ user@vps:/path/to/app/.next/
rsync -avz public/ user@vps:/path/to/app/public/

# VPS上で起動
ssh user@vps
cd /path/to/app
pm2 restart n3-frontend
```

---

## 動作確認

### ステップ1: アプリケーション起動

```bash
npm run dev
```

→ http://localhost:3000 にアクセス

### ステップ2: サイドバーの確認

左サイドバーに以下が表示されているか確認:

```
在庫
  └─ 📦 棚卸し  [ready]  ← クリック
```

### ステップ3: 棚卸しページの確認

http://localhost:3000/zaiko/tanaoroshi にアクセスして以下を確認:

#### 表示される要素

- ✅ 統計ヘッダー（総商品数、在庫状態、在庫総額、選択中）
- ✅ アクションバー（新規商品登録、セット商品作成、選択解除）
- ✅ フィルターパネル（検索、商品タイプ、在庫状態、カテゴリ、商品状態）
- ✅ 商品カード（7件のサンプルデータ）

#### サンプルデータ

| 商品名 | タイプ | 在庫 | 原価 |
|--------|--------|------|------|
| iPhone 14 Pro Max 256GB | 有在庫 | 5個 | $800.00 |
| MacBook Air M2 | 有在庫 | 2個 | $1,000.00 |
| AirPods Pro 2nd Gen | 有在庫 | 10個 | $180.00 |
| Apple Watch Series 9 | 有在庫 | 3個 | $300.00 |
| iPad Air 5th Gen | 有在庫 | 7個 | $500.00 |
| Sony WH-1000XM5 | 無在庫 | 0個 | $250.00 |
| **Apple Bundle Set** | **セット** | **0個** | **$0.00** |

### ステップ4: 機能テスト

#### 4-1. 新規商品登録

1. 「新規商品登録」ボタンをクリック
2. 必須項目を入力:
   - 商品名: `Test Product`
   - 商品タイプ: `有在庫`
   - 原価: `100`
   - 販売価格: `150`
   - 在庫数: `5`
3. 「登録」ボタンをクリック
4. 商品リストに追加されることを確認

#### 4-2. セット商品作成

1. 商品カードのチェックボックスで **2つ以上** の商品を選択
2. 「セット商品作成」ボタンをクリック
3. セット商品設定:
   - セット商品名: `Test Bundle`
   - 販売価格: `500`
   - 各商品の必要数を調整
4. 「セット商品を作成」ボタンをクリック
5. 作成可能セット数が正しく計算されることを確認

#### 4-3. 出品データ連携

1. 在庫ありの商品で「出品へ」ボタンをクリック
2. `/tools/editing` ページにリダイレクトされることを確認
3. `yahoo_scraped_products` テーブルにデータが追加されることを確認:

```sql
SELECT * FROM yahoo_scraped_products
WHERE source = 'tanaoroshi'
ORDER BY created_at DESC
LIMIT 1;
```

#### 4-4. セット商品出品フロー

1. セット商品を作成
2. 「出品へ」ボタンをクリック
3. `/tools/editing` で編集
4. TabFinalタブを開く
5. **セット商品構成** セクションが表示されることを確認
6. 構成商品の画像・SKU・在庫数が表示されることを確認
7. 出品ボタンをクリックすると確認ダイアログが表示されることを確認:

```
📦 セット商品の出品確認

このセット商品を出品すると、以下の構成商品の出品が自動的に停止されます：

• iPhone 14 Pro Max 256GB × 1
• AirPods Pro 2nd Gen × 1
• Apple Watch Series 9 × 1

出品を実行しますか？
```

---

## トラブルシューティング

### 問題1: 商品が表示されない

**症状**: 棚卸しページが空白、または「商品が見つかりませんでした」と表示される

**原因**: データベースマイグレーションが実行されていない

**解決策**:
1. Supabase Dashboard → SQL Editor
2. マイグレーションSQLを再実行
3. サンプルデータのINSERT文が成功しているか確認

```sql
SELECT COUNT(*) FROM inventory_master;
-- 結果が7未満の場合、INSERT文を再実行
```

---

### 問題2: 「出品へ」ボタンが動作しない

**症状**: ボタンをクリックしても反応がない、またはエラーが発生

**原因**: `yahoo_scraped_products` テーブルが存在しない

**解決策**:
```sql
-- テーブル存在確認
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'yahoo_scraped_products'
);

-- 存在しない場合、該当マイグレーションを実行
-- supabase/migrations/20251022_create_yahoo_scraped_products.sql
```

---

### 問題3: セット商品の在庫が0のまま

**症状**: セット商品を作成したが、physical_quantity が常に0

**原因**: `calculate_set_available_quantity()` 関数が正しく動作していない

**解決策**:

```sql
-- 関数の動作確認
SELECT calculate_set_available_quantity(
  (SELECT id FROM inventory_master WHERE unique_id = 'SET-001')
);
-- 結果が3以上であるべき（iPhone: 5個、AirPods: 10個、Watch: 3個 → min 3セット）

-- 関数が存在しない場合、マイグレーションを再実行
```

---

### 問題4: ビルドエラーが発生する

**症状**: `npm run build` でエラーが発生

**エラー例**:
```
Error: Cannot find module '@/types/inventory'
```

**解決策**:
```bash
# TypeScriptキャッシュをクリア
rm -rf .next
rm -rf node_modules/.cache

# 依存関係を再インストール
npm install

# 再ビルド
npm run build
```

---

### 問題5: TabFinalでセット商品情報が表示されない

**症状**: セット商品を出品画面に送っても、セット構成が表示されない

**原因**: `scraped_data` に `is_set` フラグが設定されていない

**解決策**:

1. `handleSendToEditing` 関数を確認:
   ```typescript
   // app/zaiko/tanaoroshi/page.tsx
   scraped_data: {
     images: product.images,
     is_set: product.product_type === 'set',  // ← この行が必要
     set_components: product.set_components
   }
   ```

2. データベースを確認:
   ```sql
   SELECT scraped_data FROM yahoo_scraped_products
   WHERE source = 'tanaoroshi'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

---

## 次のステップ

✅ Phase 1-1 (Week 1-2): データベース構築、基本UI → **完了**

📝 Phase 1-2 (Week 3-4): 商品登録、データ連携 → **次回実装**
- API routes for inventory operations
- Image upload to Supabase Storage
- Bulk import from CSV

📝 Phase 1-3 (Week 5-6): セット商品機能 → **次回実装**
- Automatic inventory sync
- Order webhook integration
- Set product automatic listing stop

📝 Phase 1-4 (Week 7): 受注連動、最終調整 → **次回実装**
- eBay/Yahoo order webhooks
- Automatic inventory decrement
- Email notifications

---

## サポート

問題が解決しない場合:

1. **ログ確認**: ブラウザのコンソール（F12）でエラーを確認
2. **Supabaseログ**: Supabase Dashboard → Logs → Postgres Logs
3. **GitHub Issues**: https://github.com/your-repo/issues

---

## 参考資料

- [棚卸しシステム開発計画書](./TANAOROSHI_SYSTEM_DEVELOPMENT_PLAN.md)
- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Next.js公式ドキュメント](https://nextjs.org/docs)

---

**最終更新**: 2025-10-26
**バージョン**: 1.0.0
**ステータス**: Phase 1-1 完了
