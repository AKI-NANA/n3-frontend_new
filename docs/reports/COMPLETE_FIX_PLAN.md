# ============================================
# 全ツール完全修正 - マスターテーブル対応
# ============================================

## 📋 **修正が必要な全ファイル**

### **Phase 1: データベース修正（最優先）**

1. **ADD_ALL_TOOL_COLUMNS.sql を実行**
   - 全ツール必須カラムを追加
   - 約40個のカラムを追加

### **Phase 2: API修正（7つ）**

#### 1️⃣ **送料計算API**
**ファイル**: `app/api/tools/shipping-calculate/route.ts`

**修正内容**:
```typescript
// ❌ 修正前
const price_jpy = product.price_jpy
const weight_g = listingData.weight_g

// ✅ 修正後
import { ProductFieldHelpers } from '@/lib/supabase/field-helpers'
const price_jpy = ProductFieldHelpers.getPrice(product)
const weight_g = ProductFieldHelpers.getWeightG(product)

// 保存先も確認
.update({
  listing_data: updatedListingData,
  ddp_price_usd: breakdown.finalTotal,        // ✅ 新カラム
  ddu_price_usd: breakdown.finalProductPrice, // ✅ 新カラム
  shipping_cost_usd: breakdown.finalShipping, // ✅ 新カラム
  shipping_policy: breakdown.selectedPolicyName, // ✅ 新カラム
  profit_amount_usd: breakdown.profit,
  profit_margin: breakdown.profitMargin
})
```

#### 2️⃣ **利益計算API**
**ファイル**: `app/api/tools/profit-calculate/route.ts`

**修正内容**:
```typescript
// ❌ 修正前
const price_jpy = product.price_jpy
const ddp_price_usd = product.listing_data?.ddp_price_usd

// ✅ 修正後
const price_jpy = ProductFieldHelpers.getPrice(product)
const ddp_price_usd = product.ddp_price_usd || product.listing_data?.ddp_price_usd

// 検証
if (!ddp_price_usd) {
  errors.push({
    id: product.id,
    error: '送料計算が未実行です。先に送料計算を実行してください。'
  })
  continue
}
```

#### 3️⃣ **SM分析API**
**ファイル**: `app/api/tools/sellermirror-analyze/route.ts`

**修正内容**:
```typescript
// ❌ 修正前
const title = product.title_en || product.title

// ✅ 修正後
const title = ProductFieldHelpers.getTitle(product)

// 保存先
.update({
  sm_sales_count: data.salesCount,
  sm_competitor_count: data.competitorCount,
  sm_lowest_price: data.lowestPrice,
  sm_average_price: data.averagePrice,
  sm_profit_margin: data.profitMargin,
  sm_profit_amount_usd: data.profitAmount,
  sm_data: data.fullData,
  sm_fetched_at: new Date().toISOString()
})
```

#### 4️⃣ **一括リサーチAPI**
**ファイル**: `app/api/bulk-research/route.ts`

**修正内容**:
```typescript
// ✅ 修正後
const title = ProductFieldHelpers.getTitle(product)
const price = ProductFieldHelpers.getPrice(product)

// 保存先
.update({
  research_sold_count: results.soldCount,
  research_competitor_count: results.competitorCount,
  research_lowest_price: results.lowestPrice,
  research_profit_margin: results.profitMargin,
  research_profit_amount: results.profitAmount,
  research_data: results.fullData,
  research_completed: true,
  research_updated_at: new Date().toISOString()
})
```

#### 5️⃣ **フィルターAPI**
**ファイル**: `app/api/filters/route.ts`

**修正内容**:
```typescript
const title = ProductFieldHelpers.getTitle(product)
const category = ProductFieldHelpers.getCategory(product)

// 保存先
.update({
  filter_passed: filterResults.passed,
  export_filter_status: filterResults.exportStatus,
  patent_filter_status: filterResults.patentStatus,
  mall_filter_status: filterResults.mallStatus,
  final_judgment: filterResults.finalJudgment,
  filter_checked_at: new Date().toISOString()
})
```

#### 6️⃣ **カテゴリ分析API**
**ファイル**: `app/api/tools/category-analyze/route.ts`

**修正内容**:
```typescript
const title = ProductFieldHelpers.getTitle(product)
const description = ProductFieldHelpers.getDescription(product)

// 保存先
.update({
  category_id: detected.id,
  category_name: detected.name,
  category_number: detected.number,
  category_confidence: detected.confidence,
  category_candidates: detected.candidates,
  ebay_category_id: detected.ebayId,
  ebay_category_path: detected.path
})
```

#### 7️⃣ **HTML生成API**
**ファイル**: `app/api/tools/html-generate/route.ts`

**修正内容**:
```typescript
const title = ProductFieldHelpers.getTitle(product)
const description = ProductFieldHelpers.getDescription(product)
const images = ProductFieldHelpers.getImages(product)

// 検証
const validation = ProductFieldHelpers.validateForHTML(product)
if (!validation.valid) {
  errors.push({
    id: product.id,
    error: `必須データ不足: ${validation.missing.join(', ')}`
  })
  continue
}
```

---

## 🎯 **実行順序**

### **ステップ1: データベース修正（5分）**
```sql
-- Supabase SQL Editorで実行:
ADD_ALL_TOOL_COLUMNS.sql
```

### **ステップ2: ヘルパーファイル確認（既に作成済み）**
```
lib/supabase/field-helpers.ts ✅
```

### **ステップ3: 全APIを一括修正（次の指示で実行）**

APIファイルは存在確認が必要なので、次のステップで修正します。

---

## 📊 **期待される結果**

### **修正前（現状）**
```
送料計算: ❌ ddp_price_usd カラムが存在しない
利益計算: ❌ 動かない
SM分析: ❌ 動かない
```

### **修正後（目標）**
```
送料計算: ✅ 完全動作
利益計算: ✅ 完全動作  
SM分析: ✅ 完全動作
一括リサーチ: ✅ 完全動作
フィルター: ✅ 完全動作
カテゴリ分析: ✅ 完全動作
HTML生成: ✅ 完全動作
```

---

## 🚀 **今すぐ実行**

```sql
-- Supabase SQL Editorで:
ADD_ALL_TOOL_COLUMNS.sql
```

実行後、以下のSELECTで確認してください：

```sql
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products_master';
```

**期待値**: 約100カラム以上

結果を教えてください！
