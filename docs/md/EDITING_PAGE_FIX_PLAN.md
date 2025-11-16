# 商品編集ページ - データ保存問題の修正計画

## 📋 問題の詳細分析

### 1. 原産国 (origin_country) が保存されない
**原因:**
- `batch-details/route.ts`で`itemLocation.country`を取得している
- しかし`products`テーブルの`origin_country`カラムに保存されていない
- `listing_data.item_specifics`にも含まれていない

**現在のデータフロー:**
```
eBay API → itemLocation.country → updatedItems[].itemLocation.country
                                  ↓
                              ebay_api_data (JSONB)のみに保存
                                  ↓
                              origin_countryカラムには未保存 ❌
```

**必要な処理:**
```typescript
// 最頻出の原産国を取得
const countries = updatedItems
  .map(item => item.itemLocation?.country)
  .filter(c => c)

const countryCount: Record<string, number> = {}
countries.forEach(c => countryCount[c] = (countryCount[c] || 0) + 1)

const mostCommonCountry = Object.entries(countryCount)
  .sort((a, b) => b[1] - a[1])[0]?.[0]

// productsテーブルに保存
origin_country: mostCommonCountry
```

---

### 2. 素材 (material) が保存されない
**原因:**
- `itemSpecifics.Material`は取得されている
- `listing_data.item_specifics.Material`に保存されている
- しかし`products.material`カラムに反映されていない

**現在のデータフロー:**
```
eBay API → localizedAspects → itemSpecifics.Material
                               ↓
                          listing_data.item_specifics (JSONB)のみに保存
                               ↓
                          materialカラムには未保存 ❌
```

**必要な処理:**
```typescript
// Item SpecificsからMaterialを抽出
const materials = updatedItems
  .map(item => item.itemSpecifics?.Material)
  .filter(m => m)

const materialCount: Record<string, number> = {}
materials.forEach(m => materialCount[m] = (materialCount[m] || 0) + 1)

const mostCommonMaterial = Object.entries(materialCount)
  .sort((a, b) => b[1] - a[1])[0]?.[0]

// productsテーブルに保存
material: mostCommonMaterial
```

---

### 3. 販売数 (sold_count) が保存されない
**原因:**
- 個別商品の`quantitySold`は取得されている
- しかし**全競合商品の合計販売数**を計算していない
- `sold_count`カラムに保存されていない

**現在のデータフロー:**
```
eBay API → itemData.unitsSold → updatedItems[].quantitySold
                                 ↓
                            個別の販売数は保存済み
                                 ↓
                            合計は未計算 ❌
```

**必要な処理:**
```typescript
// 全競合商品の販売数を合計
const totalSold = updatedItems
  .map(item => parseInt(item.quantitySold) || 0)
  .reduce((sum, sold) => sum + sold, 0)

console.log(`  📊 競合販売数合計: ${totalSold}件`)

// productsテーブルに保存
sold_count: totalSold
```

---

### 4. スコア (final_score) が自動計算されない
**原因:**
- スコア計算は`/api/tools/calculate-scores`で実行される
- しかし、全データ取得完了後に**自動実行されていない**
- ユーザーが手動で「スコア」ボタンを押す必要がある

**必要な処理:**
1. 全データ取得完了時にスコア計算を自動実行
2. スコア計算の依存関係を確認:
   - カテゴリ分析 ✅
   - 送料計算 ✅
   - 利益計算 ✅
   - SellerMirror分析 ✅
   - HTML生成 ✅
   - **→ この後にスコア計算**

---

## 🔧 修正内容

### Phase 1: batch-details/route.tsの修正

**ファイル:** `/Users/aritahiroaki/n3-frontend_new/app/api/sellermirror/batch-details/route.ts`

**修正箇所 (行268-290付近):**

```typescript
// ✅ 修正前
const updatedListingData = {
  ...(product.listing_data || {}),
  condition_id: conditionId,
  item_specifics: firstItemSpecifics,
  storage_location: storageLocation,
  ebay_category_id: firstSuccessResult?.details?.categoryId || '',
  ebay_category_name: firstSuccessResult?.details?.categoryPath || '',
}

// ✅ 修正後
// 📊 競合商品の統計情報を計算
const countries = updatedItems
  .map(item => item.itemLocation?.country)
  .filter(c => c)

const countryCount: Record<string, number> = {}
countries.forEach(c => countryCount[c] = (countryCount[c] || 0) + 1)
const mostCommonCountry = Object.entries(countryCount)
  .sort((a, b) => b[1] - a[1])[0]?.[0] || ''

const materials = updatedItems
  .map(item => item.itemSpecifics?.Material)
  .filter(m => m)

const materialCount: Record<string, number> = {}
materials.forEach(m => materialCount[m] = (materialCount[m] || 0) + 1)
const mostCommonMaterial = Object.entries(materialCount)
  .sort((a, b) => b[1] - a[1])[0]?.[0] || ''

const totalSold = updatedItems
  .map(item => parseInt(item.quantitySold) || 0)
  .reduce((sum, sold) => sum + sold, 0)

console.log(`  📊 統計情報:`)
console.log(`    - 最頻出原産国: ${mostCommonCountry} (${countries.length}件中)`)
console.log(`    - 最頻出素材: ${mostCommonMaterial} (${materials.length}件中)`)
console.log(`    - 競合販売数合計: ${totalSold}件`)

const updatedListingData = {
  ...(product.listing_data || {}),
  condition_id: conditionId,
  item_specifics: firstItemSpecifics,
  storage_location: storageLocation,
  ebay_category_id: firstSuccessResult?.details?.categoryId || '',
  ebay_category_name: firstSuccessResult?.details?.categoryPath || '',
}
```

**修正箇所 (行295-310付近) - UPDATE文:**

```typescript
// ✅ 修正前
const { error: updateError } = await supabase
  .from('products_master')
  .update({
    ebay_api_data: {
      ...existingData,
      listing_reference: {
        ...listingReference,
        referenceItems: updatedItems
      }
    },
    listing_data: updatedListingData,
    ...(shouldUpdateEnglishTitle && { english_title: firstItemTitle }),
    updated_at: new Date().toISOString()
  })
  .eq('id', productId)

// ✅ 修正後
const { error: updateError } = await supabase
  .from('products_master')
  .update({
    ebay_api_data: {
      ...existingData,
      listing_reference: {
        ...listingReference,
        referenceItems: updatedItems
      }
    },
    listing_data: updatedListingData,
    ...(shouldUpdateEnglishTitle && { english_title: firstItemTitle }),
    // 🔥 追加: 原産国・素材・販売数をトップレベルに保存
    ...(mostCommonCountry && { origin_country: mostCommonCountry }),
    ...(mostCommonMaterial && { material: mostCommonMaterial }),
    sold_count: totalSold,
    updated_at: new Date().toISOString()
  })
  .eq('id', productId)
```

---

### Phase 2: スコア自動計算の実装

**ファイル:** `/Users/aritahiroaki/n3-frontend_new/app/tools/editing/page.tsx`

**修正箇所 (handleBatchFetchDetails関数の最後):**

```typescript
// ✅ 修正前
await loadProducts()

// ✅ 修正後
await loadProducts()

// 🎯 自動スコア計算
console.log('🎯 詳細取得完了 → スコア自動計算開始')
try {
  const affectedProductIds = Object.keys(groupedByProduct)
  const productsToScore = products.filter(p => affectedProductIds.includes(p.id))
  
  const scoresResult = await runBatchScores(productsToScore)
  
  if (scoresResult.success) {
    showToast(`✅ スコア計算完了！`, 'success')
    await loadProducts() // 再読み込みでスコアを反映
  } else {
    console.error('❌ スコア計算失敗:', scoresResult.error)
  }
} catch (error: any) {
  console.error('❌ スコア自動計算エラー:', error)
}
```

---

### Phase 3: UIでの原産国・素材の取得ボタン修正

**ファイル:** `/Users/aritahiroaki/n3-frontend_new/app/tools/editing/page.tsx`

**修正箇所 (handleOriginCountryFetch):**

```typescript
// ✅ 修正: Mirror選択商品から原産国を取得
const handleOriginCountryFetch = async () => {
  if (selectedIds.size === 0) {
    showToast('商品を選択してください', 'error')
    return
  }

  showToast('原産国情報を取得中...', 'success')

  try {
    const selectedArray = Array.from(selectedIds)
    let updatedCount = 0

    for (const productId of selectedArray) {
      const product = products.find(p => String(p.id) === productId)
      if (!product) continue

      // 🔥 既にorigin_countryがあればスキップ
      if (product.origin_country) {
        console.log(`  ⏭️ ${productId}: 原産国既存 (${product.origin_country})`)
        continue
      }

      // 🔥 ebay_api_data.listing_reference.referenceItemsから取得
      const referenceItems = product.ebay_api_data?.listing_reference?.referenceItems || []
      
      if (referenceItems.length === 0) {
        console.log(`  ⏭️ ${productId}: 参照商品なし`)
        continue
      }

      // 最頻出の原産国を取得
      const countries = referenceItems
        .map((item: any) => item.itemLocation?.country)
        .filter((c: string) => c)

      if (countries.length === 0) {
        console.log(`  ⏭️ ${productId}: 原産国情報なし`)
        continue
      }

      const countryCount: Record<string, number> = {}
      countries.forEach((c: string) => {
        countryCount[c] = (countryCount[c] || 0) + 1
      })

      const mostCommonCountry = Object.entries(countryCount)
        .sort((a, b) => b[1] - a[1])[0]?.[0]

      if (mostCommonCountry) {
        console.log(`  ✅ ${productId}: ${mostCommonCountry} (${countries.length}件中${countryCount[mostCommonCountry]}件)`)
        
        // 🔥 ローカル状態を更新
        updateLocalProduct(productId, {
          origin_country: mostCommonCountry
        })
        
        // 🔥 データベースに即座に保存
        try {
          const response = await fetch('/api/products/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: productId,
              updates: { origin_country: mostCommonCountry }
            })
          })
          
          if (response.ok) {
            updatedCount++
          }
        } catch (saveError) {
          console.error('❌ 保存エラー:', saveError)
        }
      }
    }

    if (updatedCount > 0) {
      showToast(`${updatedCount}件の原産国を更新しました`, 'success')
      await loadProducts()
    } else {
      showToast('更新する原産国データがありませんでした', 'error')
    }
  } catch (error: any) {
    showToast(error.message || '原産国取得に失敗しました', 'error')
  }
}
```

**修正箇所 (handleMaterialFetch):**

```typescript
// ✅ 修正: Item Specificsから素材を取得
const handleMaterialFetch = async () => {
  if (selectedIds.size === 0) {
    showToast('商品を選択してください', 'error')
    return
  }

  showToast('素材情報を取得中...', 'success')

  try {
    const selectedArray = Array.from(selectedIds)
    let updatedCount = 0

    for (const productId of selectedArray) {
      const product = products.find(p => String(p.id) === productId)
      if (!product) continue

      // 🔥 既にmaterialがあればスキップ
      if (product.material) {
        console.log(`  ⏭️ ${productId}: 素材既存 (${product.material})`)
        continue
      }

      // 🔥 ebay_api_data.listing_reference.referenceItemsから取得
      const referenceItems = product.ebay_api_data?.listing_reference?.referenceItems || []
      
      if (referenceItems.length === 0) {
        console.log(`  ⏭️ ${productId}: 参照商品なし`)
        continue
      }

      // 最頻出の素材を取得
      const materials = referenceItems
        .map((item: any) => item.itemSpecifics?.Material)
        .filter((m: string) => m)

      if (materials.length === 0) {
        console.log(`  ⏭️ ${productId}: 素材情報なし`)
        continue
      }

      const materialCount: Record<string, number> = {}
      materials.forEach((m: string) => {
        materialCount[m] = (materialCount[m] || 0) + 1
      })

      const mostCommonMaterial = Object.entries(materialCount)
        .sort((a, b) => b[1] - a[1])[0]?.[0]

      if (mostCommonMaterial) {
        console.log(`  ✅ ${productId}: ${mostCommonMaterial} (${materials.length}件中${materialCount[mostCommonMaterial]}件)`)
        
        // 🔥 ローカル状態を更新
        updateLocalProduct(productId, {
          material: mostCommonMaterial
        })
        
        // 🔥 データベースに即座に保存
        try {
          const response = await fetch('/api/products/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: productId,
              updates: { material: mostCommonMaterial }
            })
          })
          
          if (response.ok) {
            updatedCount++
          }
        } catch (saveError) {
          console.error('❌ 保存エラー:', saveError)
        }
      }
    }

    if (updatedCount > 0) {
      showToast(`${updatedCount}件の素材を更新しました`, 'success')
      await loadProducts()
    } else {
      showToast('更新する素材データがありませんでした', 'error')
    }
  } catch (error: any) {
    showToast(error.message || '素材取得に失敗しました', 'error')
  }
}
```

---

## ✅ 実装順序

1. **Phase 1** - `batch-details/route.ts`の修正
   - 原産国・素材・販売数の集計ロジックを追加
   - UPDATE文に3つのフィールドを追加
   
2. **Phase 2** - スコア自動計算の実装
   - `handleBatchFetchDetails`にスコア計算を追加
   
3. **Phase 3** - UI側の取得ボタン修正
   - `handleOriginCountryFetch`の修正
   - `handleMaterialFetch`の修正

4. **テスト**
   - 商品選択 → Mirror詳細取得
   - 原産国・素材・販売数が保存されるか確認
   - スコアが自動計算されるか確認

---

## 🎯 期待される結果

### 修正前
- ❌ 原産国: 表示されない
- ❌ 素材: 表示されない
- ❌ 販売数: 0 または 未設定
- ❌ スコア: 手動実行が必要

### 修正後
- ✅ 原産国: Mirror詳細取得時に自動保存 → UIで表示
- ✅ 素材: Mirror詳細取得時に自動保存 → UIで表示
- ✅ 販売数: 全競合の合計が自動計算 → UIで表示
- ✅ スコア: Mirror詳細取得後に自動計算 → UIで表示

---

## 📝 データベーススキーマ確認

```sql
-- productsテーブルの該当カラム
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('origin_country', 'material', 'sold_count', 'final_score');

-- 期待される結果:
-- origin_country | text | YES
-- material       | text | YES
-- sold_count     | integer | YES
-- final_score    | numeric | YES
```

---

## 🚀 実装開始

Phase 1から順番に実装していきます。
