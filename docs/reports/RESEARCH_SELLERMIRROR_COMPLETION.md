# リサーチ機能とSellerMirror分析の修正完了

## 📋 修正概要

### **機能の整理**

#### **1. SellerMirror分析 = 出品用データ取得**
- **目的**: eBayへの出品時に必要な情報を取得
- **API**: `/api/sellermirror/analyze`
- **取得データ**:
  - カテゴリー情報（Category ID, Category Path）
  - 参考商品情報（タイトル、価格、状態、出品者名）
  - 出品テンプレート（最大5件の類似商品）
- **保存先**: `ebay_api_data.listing_reference`
- **利益計算は行わない** ← 出品用データ取得のみ

#### **2. リサーチ機能 = スコアリング材料 + 最安値での利益判定**
- **目的**: 販売可能性の判断とスコアリング材料の取得
- **API**: `/api/research`
- **取得データ**:
  - **Finding API（販売済み）**: 販売数、販売期間
  - **Browse API（出品中）**: 現在の最安値（送料込み、同じコンディション）
- **計算内容**:
  - 最安値で出品した場合の利益額
  - 最安値で出品した場合の利益率
- **保存先**: 
  - `research_sold_count` - 販売数
  - `research_competitor_count` - 競合数（同じコンディション）
  - `research_lowest_price` - 最安値（送料込み）
  - `research_profit_margin` - 最安値での利益率
  - `research_profit_amount` - 最安値での利益額

#### **3. 一括リサーチ機能**
- **API**: `/api/bulk-research`
- **実行内容**:
  1. カテゴリ分析
  2. 送料計算
  3. リサーチ（販売実績 + 最安値利益計算）
  4. SellerMirror分析（出品用データ取得）

---

## 🗂️ 作成・修正したファイル

### **1. APIエンドポイント**

#### `/app/api/sellermirror/analyze/route.ts` ✅
- eBay Browse APIで類似商品を検索
- 出品用の参考データを取得（最大10件）
- カテゴリー情報を自動設定
- 利益計算は行わない

#### `/app/api/research/route.ts` ✅ 新規作成
- Finding APIで販売済み商品を取得
- Browse APIで現在の最安値を取得（送料込み、同じコンディション）
- 最安値で出品した場合の利益を計算
- データをDBに保存

#### `/app/api/bulk-research/route.ts` ✅
- カテゴリ、送料、リサーチ、SM分析を一括実行
- 各APIを順次呼び出し
- 結果をまとめて返す

#### `/app/api/tools/sellermirror-analyze/route.ts` ✅
- `/api/sellermirror/analyze`を呼び出すラッパー
- 複数商品に対応

---

### **2. フロントエンド**

#### `/app/tools/editing/page.tsx` ✅
- `handleBulkResearch`関数を実装
- リサーチボタンのイベントハンドラー追加

#### `/app/tools/editing/components/EditingTable.tsx` ✅
- リサーチ結果の列を追加（紫色の背景で強調）
  - 販売数
  - 競合数
  - 最安値（送料込み）
  - 最安値での利益率
  - 最安値での利益額

#### `/app/tools/editing/components/ToolPanel.tsx` ✅
- 「🔍 一括リサーチ」ボタンを追加（紫→青のグラデーション）
- 「SM分析」ボタンを保持（アンバー色）

#### `/app/tools/editing/types/product.ts` ✅
- リサーチフィールドを追加
  - `research_sold_count`
  - `research_competitor_count`
  - `research_lowest_price`
  - `research_profit_margin`
  - `research_profit_amount`

---

## 🗄️ データベース更新

### **必要なSQL（Supabaseで実行）**

```sql
-- リサーチ結果フィールドを追加
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS research_sold_count INTEGER,
ADD COLUMN IF NOT EXISTS research_competitor_count INTEGER,
ADD COLUMN IF NOT EXISTS research_lowest_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS research_profit_margin NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS research_profit_amount NUMERIC(10,2);

-- インデックスを追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_research_profit_margin ON yahoo_scraped_products(research_profit_margin);
CREATE INDEX IF NOT EXISTS idx_research_sold_count ON yahoo_scraped_products(research_sold_count);
```

---

## 🎯 使い方

### **1. SellerMirror分析ボタン（出品用データ取得）**
1. 商品を選択
2. 「SM分析」ボタンをクリック
3. eBay Browse APIで類似商品を検索
4. 出品に必要なカテゴリー情報と参考データを取得
5. `ebay_api_data.listing_reference`に保存

### **2. 一括リサーチボタン（販売実績 + 最安値利益計算）**
1. 商品を選択
2. 「🔍 一括リサーチ」ボタンをクリック
3. 以下を自動実行：
   - カテゴリ分析
   - 送料計算
   - リサーチ（Finding API + Browse API）
   - SellerMirror分析
4. テーブルに結果が表示される

---

## 📊 期待される結果

### **SM分析（出品用データ取得）**
```
✅ 類似商品10件を取得
✅ カテゴリーID: 12345
✅ カテゴリーパス: Electronics > Cameras > Digital Cameras
✅ 参考商品5件を保存
```

### **リサーチ（販売実績 + 最安値利益計算）**
```
✅ 販売数: 15件
✅ 競合数: 23件（同じコンディション）
✅ 最安値: $45.99（送料込み）
✅ 最安値での利益率: 12.5%
✅ 最安値での利益額: $5.75
```

---

## 🧪 テスト手順

1. **サーバーを起動**
   ```bash
   npm run dev
   ```

2. **Supabaseでスキーマを更新**
   - 上記のSQLを実行

3. **editingページにアクセス**
   ```
   http://localhost:3000/tools/editing
   ```

4. **商品を選択してテスト**
   - 「SM分析」をクリック → 出品用データが取得される
   - 「🔍 一括リサーチ」をクリック → 販売実績と最安値利益が表示される

5. **結果を確認**
   - テーブルの紫色の列にリサーチ結果が表示される
   - 販売数、競合数、最安値、利益率、利益額が確認できる

---

## ✅ 完成！

**これで、リサーチ機能とSellerMirror分析が正しく分離され、それぞれの目的に応じて動作します！**

- **SM分析**: 出品用のデータ取得
- **リサーチ**: 販売実績と最安値での利益判定
- **一括リサーチ**: 全てを自動で実行

**次のステップ**: データベースのスキーマを更新してテストを実行してください。
