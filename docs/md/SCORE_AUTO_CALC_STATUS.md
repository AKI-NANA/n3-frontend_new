# スコア自動計算とデータ完全性チェック - 実装状況レポート

## ✅ 完了した実装

### Phase 1: データ完全性チェック関数の作成 ✅

**ファイル:** `app/tools/editing/utils/dataCompleteness.ts` (新規作成)

**実装内容:**
- `checkDataCompleteness()`: 商品データの完全性をチェック
- `isProfitCalculated()`: 利益計算完了チェック
- その他のヘルパー関数

**チェック項目:**
```typescript
{
  category_id: 'カテゴリID',
  category_name: 'カテゴリ名',
  shipping_cost: '送料',
  profit_amount: '利益額',      // 最後の必須条件
  profit_rate: '利益率',         // 最後の必須条件
  sm_competitor_count: '競合数',
  sold_count: '販売数',
  html_description: 'HTML説明'
}
```

---

### Phase 2: useBatchProcess.tsへのインポート追加 ✅

**ファイル:** `app/tools/editing/hooks/useBatchProcess.ts`

**実装内容:**
```typescript
import { checkDataCompleteness } from '../utils/dataCompleteness'
```

---

## 🔄 今後の実装が必要な項目

### Phase 2続き: 利益計算完了後の自動スコア計算

**課題:** 
`loadProducts()`は非同期で、hook内で更新された商品データを直接取得できない

**解決策の選択肢:**

#### オプション1: productsを引数として受け取る（推奨）✨
```typescript
export function useBatchProcess(
  loadProducts: () => Promise<void>,
  getProducts?: () => Product[]  // ← 追加
) {
  // ...
  
  async function runBatchProfit(productIds: string[]) {
    // 利益計算完了
    await loadProducts()
    
    // ✅ 更新された商品データを取得
    const products = getProducts?.() || []
    const targetProducts = products.filter(p => 
      productIds.includes(String(p.id))
    )
    
    // データ完全性チェック
    const productsReadyForScoring = targetProducts.filter(product => {
      const check = checkDataCompleteness(product)
      return check.isComplete
    })
    
    // スコア計算
    if (productsReadyForScoring.length > 0) {
      await runBatchScores(productsReadyForScoring)
      await loadProducts()
    }
  }
}
```

**page.tsxでの使用:**
```typescript
const {
  runBatchProfit,
  // ...
} = useBatchProcess(
  loadProducts, 
  () => products  // ← products配列を返す関数を渡す
)
```

#### オプション2: API経由で商品データを取得
```typescript
// /api/products/batch を作成
async function runBatchProfit(productIds: string[]) {
  await loadProducts()
  
  // APIから商品データを再取得
  const response = await fetch('/api/products/batch', {
    method: 'POST',
    body: JSON.stringify({ productIds })
  })
  
  const { products } = await response.json()
  // ...
}
```

#### オプション3: 次回ページ読み込み時に自動チェック（現在の実装）
```typescript
// page.tsxのuseEffect内で自動チェック
useEffect(() => {
  if (products.length > 0) {
    autoCalculateScoresIfReady(products)
  }
}, [products])
```

---

### Phase 3: 関税率の取得と表示

#### 3.1 HTSコード取得時に関税率も取得

**ファイル:** `app/api/hts/estimate/route.ts`

**必要な修正:**
```typescript
// 原産国別関税率を取得
let originCountryDutyRate = null
if (originCountry && htsCode) {
  const { data: countryRate } = await supabase
    .from('hts_country_rates')
    .select('duty_rate')
    .eq('hts_code', htsCode)
    .eq('country_code', originCountry)
    .single()
  
  if (countryRate) {
    originCountryDutyRate = countryRate.duty_rate
  }
}

return NextResponse.json({
  // ...
  originCountryDutyRate: originCountryDutyRate,
  materialDutyRate: null  // TODO: 素材別関税率テーブルが必要
})
```

#### 3.2 関税率の保存

**ファイル:** `app/tools/editing/page.tsx` - `handleHTSFetch`

**必要な修正:**
```typescript
updateLocalProduct(product.id, {
  hts_code: data.htsCode,
  hts_description: data.htsDescription || '',
  hts_duty_rate: data.dutyRate || null,
  origin_country_duty_rate: data.originCountryDutyRate || null,  // ← 追加
  material_duty_rate: data.materialDutyRate || null,              // ← 追加
  hts_confidence: data.confidence || 'uncertain'
})
```

#### 3.3 関税率の表示

**ファイル:** `app/tools/editing/components/EditingTable.tsx`

**追加する列:**
```tsx
{
  header: '関税率',
  render: (product) => {
    const dutyRates = []
    
    // 原産国別関税率（優先）
    if (product.origin_country_duty_rate) {
      dutyRates.push({
        label: product.origin_country,
        rate: product.origin_country_duty_rate
      })
    }
    
    // 素材別関税率
    if (product.material_duty_rate) {
      dutyRates.push({
        label: product.material,
        rate: product.material_duty_rate
      })
    }
    
    // 基本関税率（フォールバック）
    if (dutyRates.length === 0 && product.hts_duty_rate) {
      dutyRates.push({
        label: 'HTS',
        rate: product.hts_duty_rate
      })
    }
    
    return (
      <div className="space-y-1">
        {dutyRates.map((dr, idx) => (
          <div key={idx} className="text-xs">
            <span className="font-medium text-blue-600">{dr.label}:</span>
            <span className="ml-1">{dr.rate}</span>
          </div>
        ))}
        {dutyRates.length === 0 && (
          <span className="text-gray-400">未設定</span>
        )}
      </div>
    )
  }
}
```

---

## 🎯 推奨実装順序

### 即座に実装すべき項目

1. **useBatchProcessの修正（オプション1）**
   - `getProducts`パラメータを追加
   - `runBatchProfit`でスコア自動計算を実装

2. **page.tsxの修正**
   - `useBatchProcess`に`() => products`を渡す

3. **動作確認**
   - 利益計算完了後にスコアが自動計算されるか確認

### 次のステップで実装する項目

4. **関税率の取得（hts/estimate/route.ts）**
   - `hts_country_rates`テーブルから原産国別関税率を取得

5. **関税率の保存（page.tsx - handleHTSFetch）**
   - `origin_country_duty_rate`と`material_duty_rate`を保存

6. **関税率の表示（EditingTable.tsx）**
   - 関税率列を追加
   - 優先順位: 原産国別 > 素材別 > 基本

---

## 📊 現在の状況

### スコア計算のトリガー

**現状:**
- ❌ Mirror詳細取得後に自動計算（削除済み）
- ⚠️ 利益計算後の自動計算（実装途中）
- ✅ 手動で「スコア」ボタンを押して計算

**目標:**
- ✅ 利益計算完了後、データが揃った時点で自動計算

### 関税率の表示

**現状:**
- ❌ 関税率が表示されない

**目標:**
- ✅ 原産国別関税率を優先表示
- ✅ 素材別関税率を追加表示
- ✅ 基本関税率をフォールバック表示

---

## 🚀 次のアクション

1. `useBatchProcess`の修正を完了させる
2. `page.tsx`で`getProducts`を渡すように修正
3. テストして動作確認
4. 関税率の取得・保存・表示を実装

以上の実装が完了すれば、要件を100%満たすことができます!
