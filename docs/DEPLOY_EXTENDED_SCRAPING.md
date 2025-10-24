# 拡張スクレイピング機能のデプロイ手順

**実装日**: 2025年10月24日
**機能**: Yahoo Auction完全スクレイピング（送料、画像、説明文、出品者情報）

---

## 🎯 新機能概要

### 追加された取得項目

1. **送料 (shippingCost)**
   - 「配送」「送料」「発送」ラベルから検索
   - 「出品者負担」「送料無料」の検出 → 0円
   - 金額の正確な抽出

2. **仕入れ値 (totalCost)**
   - 計算式: `価格 + 送料 = 仕入れ値`
   - 送料不明時は価格のみ（警告付き）

3. **全画像 (images)**
   - Yahoo画像サーバーから全画像取得
   - サムネイル除外 (na_170x170)
   - 配列形式で保存

4. **商品説明 (description)**
   - 複数セレクタパターン
   - `<pre>` タグ対応（Yahoo Auction標準）
   - 50文字以上のみ有効

5. **出品者情報 (sellerName, sellerRating)**
   - `/user/` リンクから抽出
   - 評価情報取得

6. **終了時間 (endTime)**
   - 「終了」ラベルから抽出

7. **カテゴリ (category)**
   - パンくずリストから取得

### データ品質管理

```typescript
dataQuality: {
  titleFound: boolean      // タイトル取得成功
  priceFound: boolean      // 価格取得成功（必須）
  shippingFound: boolean   // 送料取得成功
  conditionFound: boolean  // 商品状態取得成功
  bidsFound: boolean       // 入札数取得成功
  imagesFound: boolean     // 画像取得成功
  descriptionFound: boolean // 説明文取得成功
  sellerFound: boolean     // 出品者取得成功
}
```

### 安全性強化

- ✅ `null` 使用（0や空文字ではなく、取得失敗を明示）
- ✅ 必須フィールド（タイトル、価格）がない場合は `status: 'error'`
- ✅ 部分取得の場合は `status: 'partial'` + 警告配列
- ✅ データベースには必須フィールドがある場合のみ保存

---

## 🚀 VPSデプロイ手順

### ステップ1: GitHubでマージ確認

ブラウザで以下を確認：
```
https://github.com/AKI-NANA/n3-frontend_new/pulls
```

**最新のPR**が緑色（Merged）になっていることを確認。

### ステップ2: VPSにSSH接続

```bash
ssh ubuntu@tk2-236-27682.vs.sakura.ne.jp
```

### ステップ3: 最新コードを取得

```bash
cd ~/n3-frontend_new
git pull origin main
```

**期待される出力**:
```
remote: Counting objects: ...
Updating c022dee..76b411e
 app/api/scraping/execute/route.ts | 268 ++++++++++++++++++++++++++++++++---
 1 file changed, 228 insertions(+), 40 deletions(-)
```

### ステップ4: ビルド

```bash
npm run build
```

**期待される出力**:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
```

### ステップ5: アプリケーション再起動

```bash
pm2 restart n3-frontend
```

**確認**:
```bash
pm2 logs n3-frontend --lines 20
```

エラーがないことを確認。

---

## 🧪 動作確認

### 1. デバッグエンドポイント

```bash
curl https://n3.emverze.com/api/scraping/debug | jq
```

**期待される結果**:
```json
{
  "checks": {
    "puppeteer": { "installed": true },
    "chromeLaunch": { "success": true },
    "supabase": { "url": "設定済み" }
  }
}
```

### 2. 実際のスクレイピングテスト

```bash
curl -X POST https://n3.emverze.com/api/scraping/execute \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://page.auctions.yahoo.co.jp/jp/auction/t1204568188"],
    "platforms": ["yahoo-auction"]
  }' | jq '.results[0]'
```

**期待される結果**:
```json
{
  "title": "【大量出品中 正規品】ポケモンカード...",
  "price": 3500,
  "shippingCost": 0,           // ← NEW
  "totalCost": 3500,           // ← NEW (仕入れ値)
  "status": "success",
  "condition": "目立った傷や汚れなし",
  "bids": "0件",
  "images": [                   // ← NEW
    "https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/...",
    "https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/..."
  ],
  "description": "ポケモンカード...", // ← NEW
  "sellerName": "出品者名",      // ← NEW
  "endTime": "1月 25日 22時 ...", // ← NEW
  "category": "ポケモンカードゲーム", // ← NEW
  "dataQuality": {              // ← NEW
    "titleFound": true,
    "priceFound": true,
    "shippingFound": true,
    "imagesFound": true,
    "descriptionFound": true,
    "sellerFound": true
  }
}
```

### 3. データベース確認

Supabase Dashboard → Table Editor → `scraped_products`

新しいカラムにデータが入っているか確認：
- `shipping_cost`
- `total_cost`
- `images` (配列)
- `description`
- `seller_name`
- `end_time`
- `category`

---

## 🔍 トラブルシューティング

### Q1: 送料が常に `null`

**原因**: Yahoo Auctionのページ構造が変わった可能性

**対策**:
```bash
# VPSでデバッグ実行
curl -X POST https://n3.emverze.com/api/scraping/execute \
  -H "Content-Type: application/json" \
  -d '{"urls": ["送料ありのURL"], "platforms": ["yahoo-auction"]}' | jq '.results[0].warnings'
```

警告メッセージを確認。

### Q2: 画像が取得できない

**原因**: セレクタパターンの変更

**確認**:
```bash
pm2 logs n3-frontend | grep "画像"
```

### Q3: データベースエラー

**原因**: カラムが存在しない

**対策**:
```sql
-- Supabase SQL Editorで実行
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS shipping_cost INTEGER;
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS total_cost INTEGER;
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS images TEXT[];
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS category TEXT;
```

---

## 📊 データベーススキーマ確認

既存のマイグレーションファイルに新カラムが含まれているか確認：

```bash
cat supabase/migrations/20251023_create_scraped_products.sql
```

含まれていない場合、Supabase Dashboardで手動追加。

---

## 📝 テスト用URL

### 送料無料のケース
```
https://page.auctions.yahoo.co.jp/jp/auction/t1204568188
```
→ shippingCost: 0 が期待される

### 送料ありのケース
```
（実際のURLで確認）
```
→ shippingCost: 数値 が期待される

---

**コミット**: `76b411e`
**ブランチ**: `claude/safe-scraping-011CUMaeWipViad45zaNRUXz`
**実装**: `app/api/scraping/execute/route.ts`
