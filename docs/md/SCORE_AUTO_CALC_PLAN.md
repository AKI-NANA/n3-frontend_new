# スコア自動計算とデータ完全性チェックの実装計画

## 📋 要件の整理

### 1. スコア計算の自動実行条件

**必須データ:**
```typescript
{
  category_id: string,           // カテゴリ分析
  category_name: string,         // カテゴリ分析
  shipping_cost: number,         // 送料計算
  profit_amount: number,         // 利益計算 ← 最後の必須条件
  profit_rate: number,           // 利益計算
  sm_competitor_count: number,   // SellerMirror分析
  sold_count: number,            // SellerMirror分析
  html_description: string       // HTML生成
}
```

**トリガー条件:**
- 上記の全データが揃った時点で自動実行
- 特に`profit_amount`と`profit_rate`が最後の条件

### 2. 関税率の表示

**データベース構造:**
```sql
-- products_master テーブル
hts_code                   TEXT  -- HTSコード
hts_duty_rate              TEXT  -- 基本関税率
origin_country             TEXT  -- 原産国
origin_country_duty_rate   TEXT  -- 原産国別関税率
material                   TEXT  -- 素材
material_duty_rate         TEXT  -- 素材別関税率
```

**表示ロジック:**
1. `origin_country_duty_rate`があれば表示
2. `material_duty_rate`があれば追加表示
3. どちらもなければ`hts_duty_rate`(基本関税率)を表示

---

## 🔧 実装内容

### Phase 1: データ完全性チェック関数の作成

**ファイル:** `app/tools/editing/utils/dataCompleteness.ts` (新規作成)

```typescript
/**
 * 商品データの完全性をチェック
 */
export function checkDataCompleteness(product: any): {
  isComplete: boolean
  missingFields: string[]
  completedFields: string[]
} {
  const requiredFields = {
    category_id: 'カテゴリID',
    category_name: 'カテゴリ名',
    shipping_cost: '送料',
    profit_amount: '利益額',
    profit_rate: '利益率',
    sm_competitor_count: '競合数',
    sold_count: '販売数',
    html_description: 'HTML説明'
  }

  const missingFields: string[] = []
  const completedFields: string[] = []

  for (const [field, label] of Object.entries(requiredFields)) {
    const value = product[field]
    
    if (value === null || value === undefined || value === '' || 
        (typeof value === 'number' && isNaN(value))) {
      missingFields.push(label)
    } else {
      completedFields.push(label)
    }
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completedFields
  }
}

/**
 * 利益計算が完了しているかチェック
 */
export function isProfitCalculated(product: any): boolean {
  return (
    product.profit_amount !== null &&
    product.profit_amount !== undefined &&
    !isNaN(product.profit_amount) &&
    product.profit_rate !== null &&
    product.profit_rate !== undefined &&
    !isNaN(product.profit_rate)
  )
}
```

---

### Phase 2: 利益計算完了後の自動スコア計算

**ファイル:** `app/tools/editing/hooks/useBatchProcess.ts`

**修正箇所:** `runBatchProfit`関数の最後

```typescript
async function runBatchProfit(productIds: string[]) {
  try {
    setProcessing(true)
    setCurrentStep('利益計算中...')

    const response = await fetch('/api/tools/calculate-profit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds })
    })

    const data = await response.json()

    if (data.success) {
      console.log(`✅ 利益計算完了: ${data.updated}件`)
      
      // 🔥 データをリロードして最新状態を取得
      await loadProducts?.()
      
      // 🎯 利益計算完了後、データが揃った商品のスコアを自動計算
      console.log('🎯 利益計算完了 → データ完全性チェック開始')
      
      // 更新された商品を取得
      const updatedProducts = await fetchUpdatedProducts(productIds)
      
      // データが完全に揃った商品のみスコア計算
      const productsReadyForScoring = updatedProducts.filter(product => {
        const check = checkDataCompleteness(product)
        if (!check.isComplete) {
          console.log(`  ⏭️ ${product.id}: データ不完全`, check.missingFields)
        }
        return check.isComplete
      })
      
      if (productsReadyForScoring.length > 0) {
        console.log(`  📊 スコア計算対象: ${productsReadyForScoring.length}件`)
        
        const scoresResult = await runBatchScores(productsReadyForScoring)
        
        if (scoresResult.success) {
          console.log(`  ✅ スコア計算完了: ${productsReadyForScoring.length}件`)
          await loadProducts?.()
        } else {
          console.error('  ❌ スコア計算失敗:', scoresResult.error)
        }
      } else {
        console.log('  ⏭️ スコア計算対象なし（データ不完全）')
      }

      return { success: true, updated: data.updated }
    } else {
      throw new Error(data.error || '利益計算に失敗しました')
    }
  } catch (error: any) {
    console.error('❌ runBatchProfit error:', error)
    return { success: false, error: error.message }
  } finally {
    setProcessing(false)
    setCurrentStep('')
  }
}
```

---

### Phase 3: 関税率の取得と表示

#### 3.1 HTSコード取得時に関税率も取得

**ファイル:** `app/api/hts/estimate/route.ts`

**現状:** 既に`dutyRate`を返している ✅

**必要な追加:** 原産国別・素材別関税率の取得

```typescript
// HTSコード推定後、関税率を取得
const htsCode = fullCodeResult.hts_number
const originCountry = productData.origin_country
const material = productData.material

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

// 素材別関税率を取得（もしテーブルがあれば）
let materialDutyRate = null
if (material && htsCode) {
  // TODO: material別の関税率テーブルがあれば取得
  // 現在は未実装
}

return NextResponse.json({
  success: true,
  htsCode: htsCode,
  htsDescription: fullCodeResult.description,
  dutyRate: fullCodeResult.general_rate || 'Free',
  originCountryDutyRate: originCountryDutyRate,
  materialDutyRate: materialDutyRate,
  confidence: 'high',
  // ...
})
```

#### 3.2 関税率の保存

**ファイル:** `app/tools/editing/page.tsx`

**修正箇所:** `handleHTSFetch`関数

```typescript
const handleHTSFetch = async () => {
  // ... 既存のコード

  const data = await response.json()

  if (data.success && data.htsCode) {
    // 🔥 関税率も一緒に保存
    updateLocalProduct(product.id, {
      hts_code: data.htsCode,
      hts_description: data.htsDescription || '',
      hts_duty_rate: data.dutyRate || null,
      origin_country_duty_rate: data.originCountryDutyRate || null,
      material_duty_rate: data.materialDutyRate || null,
      hts_confidence: data.confidence || 'uncertain'
    })
    
    // データベースに保存
    await fetch('/api/products/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: product.id,
        updates: {
          hts_code: data.htsCode,
          hts_description: data.htsDescription || '',
          hts_duty_rate: data.dutyRate || null,
          origin_country_duty_rate: data.originCountryDutyRate || null,
          material_duty_rate: data.materialDutyRate || null,
          hts_confidence: data.confidence || 'uncertain'
        }
      })
    })
  }
}
```

#### 3.3 関税率の表示

**ファイル:** `app/tools/editing/components/EditingTable.tsx`

**追加する列:**

```tsx
// 関税率列を追加
{
  header: '関税率',
  render: (product) => {
    const dutyRates = []
    
    // 原産国別関税率（優先）
    if (product.origin_country_duty_rate) {
      dutyRates.push({
        label: `${product.origin_country}`,
        rate: product.origin_country_duty_rate,
        type: 'country'
      })
    }
    
    // 素材別関税率
    if (product.material_duty_rate) {
      dutyRates.push({
        label: product.material,
        rate: product.material_duty_rate,
        type: 'material'
      })
    }
    
    // 基本関税率（フォールバック）
    if (dutyRates.length === 0 && product.hts_duty_rate) {
      dutyRates.push({
        label: 'HTS',
        rate: product.hts_duty_rate,
        type: 'hts'
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

## 📊 データフロー(修正後)

```
1. カテゴリ分析 ✅
   ↓
2. 送料計算 ✅
   ↓
3. 利益計算 ✅ ← トリガーポイント
   ↓
4. データ完全性チェック
   ↓
5. スコア自動計算（データが揃った商品のみ）
   ↓
6. final_scoreに保存
```

**関税率の取得と表示:**
```
HTSコード推定
   ↓
基本関税率取得 (hts_duty_rate)
   ↓
原産国別関税率取得 (origin_country_duty_rate)
   ↓
素材別関税率取得 (material_duty_rate)
   ↓
products_masterに保存
   ↓
EditingTableで表示
```

---

## ✅ 実装順序

1. **Phase 1** - データ完全性チェック関数の作成
   - `dataCompleteness.ts`を作成
   - チェック関数を実装

2. **Phase 2** - 利益計算完了後の自動スコア計算
   - `useBatchProcess.ts`の`runBatchProfit`を修正
   - データ完全性チェックを追加
   - スコア自動計算を追加

3. **Phase 3** - 関税率の取得と表示
   - `hts/estimate/route.ts`で関税率取得を追加
   - `handleHTSFetch`で関税率保存を追加
   - `EditingTable.tsx`で関税率列を追加

4. **テスト**
   - 利益計算完了後にスコアが自動計算されるか確認
   - 関税率が正しく表示されるか確認

---

## 🎯 期待される結果

### スコア計算
- ❌ 修正前: Mirror詳細取得後に自動計算（条件不完全）
- ✅ 修正後: **利益計算完了後、全データが揃った時点で自動計算**

### 関税率表示
- ❌ 修正前: 関税率が表示されない
- ✅ 修正後: 
  - 原産国別関税率を優先表示
  - 素材別関税率を追加表示
  - どちらもなければ基本関税率を表示

---

## 📝 注意事項

1. **データ完全性チェック**
   - 全ての必須フィールドが揃っているか確認
   - 特に`profit_amount`と`profit_rate`が最後の条件

2. **スコア計算のタイミング**
   - 利益計算完了後のみ実行
   - データが不完全な商品はスキップ

3. **関税率の優先順位**
   - 原産国別 > 素材別 > 基本関税率

4. **パフォーマンス**
   - データ完全性チェックは軽量な処理
   - スコア計算は必要な商品のみ実行

---

## 🚀 実装開始

次のステップで実装を開始します!
