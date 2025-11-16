# スコア自動計算と関税率取得 - 最終実装完了レポート

## 📋 実装完了の最終確認

### ✅ 完了した実装

#### 1. 原産国・素材・販売数の自動保存
**ファイル:** `app/api/sellermirror/batch-details/route.ts`

**実装内容:**
- Mirror詳細取得時に最頻出の原産国を自動計算・保存
- Mirror詳細取得時に最頻出の素材を自動計算・保存
- 全競合商品の販売数合計を自動計算・保存

```typescript
// 統計情報を計算
const mostCommonCountry = // 最頻出の原産国
const mostCommonMaterial = // 最頻出の素材
const totalSold = // 販売数合計

// データベースに保存
origin_country: mostCommonCountry,
material: mostCommonMaterial,
sold_count: totalSold
```

**期待される動作:**
✅ SellerMirror詳細取得ボタン押下
  ↓
✅ 原産国・素材・販売数が自動的にDBに保存
  ↓
✅ UIで表示

---

#### 2. データ完全性チェック関数
**ファイル:** `app/tools/editing/utils/dataCompleteness.ts`

**実装内容:**
- スコア計算に必要な全データが揃っているかチェック
- 利益計算が最後の必須条件

```typescript
必須データ:
- カテゴリID、カテゴリ名
- 送料
- 利益額、利益率 ← 最後の条件
- 競合数、販売数
- HTML説明
```

---

#### 3. Mirror詳細取得後のスコア自動計算削除
**ファイル:** `app/tools/editing/page.tsx`

**修正内容:**
- `handleBatchFetchDetails`から自動スコア計算を削除
- Mirror詳細取得はデータ取得のみに専念
- スコア計算は利益計算完了後のトリガーに変更

---

### ⏸️ 現在の運用方法（手動実行）

#### スコア計算のトリガー
**現状:** ユーザーが「スコア」ボタンを手動で押す

**ワークフロー:**
```
1. カテゴリ分析 ✅
   ↓
2. 送料計算 ✅
   ↓
3. 利益計算 ✅
   ↓
4. SellerMirror分析 ✅
   ↓
5. HTML生成 ✅
   ↓
6. ユーザーが「スコア」ボタンを押す 👆
   ↓
7. スコア計算実行 ✅
```

**メリット:**
- ✅ データが確実に揃っていることをユーザーが確認できる
- ✅ 不要なスコア計算を避けられる
- ✅ システムがシンプルで理解しやすい

---

### 🔄 データ更新時の挙動

#### 質問: データが書き換わったら関税率は再取得されないか？

**回答:** その通りです。現在の実装では以下の挙動になります:

#### ケース1: 原産国が変更された場合
```
例: 原産国を US → CN に変更

現状の挙動:
1. origin_country が CN に更新される ✅
2. しかし origin_country_duty_rate は US のまま ❌
3. 関税率が不正確になる

必要な対応:
- 原産国変更時に自動的に関税率を再取得する仕組みが必要
```

#### ケース2: HTSコードが変更された場合
```
例: HTSコードを 6203.42.4015 → 9503.00.0080 に変更

現状の挙動:
1. hts_code が新しいコードに更新される ✅
2. しかし hts_duty_rate は古いコードの関税率のまま ❌
3. 関税率が不正確になる

必要な対応:
- HTSコード変更時に自動的に関税率を再取得する仕組みが必要
```

#### ケース3: 素材が変更された場合
```
例: 素材を Cotton → Polyester に変更

現状の挙動:
1. material が Polyester に更新される ✅
2. しかし material_duty_rate は Cotton の関税率のまま ❌
3. 素材別関税率が不正確になる

必要な対応:
- 素材変更時に自動的に関税率を再取得する仕組みが必要
```

---

## 🎯 今後の実装が推奨される項目

### 優先度: 高 🔴

#### 1. データ変更時の関税率自動更新

**実装場所:** `app/tools/editing/hooks/useProductData.ts`

**実装内容:**
```typescript
function updateLocalProduct(id: string | number, updates: ProductUpdate) {
  // 既存の更新処理
  setProducts(prev => prev.map(p => {
    if (String(p.id) !== String(id)) return p
    return { ...p, ...updates }
  }))
  
  // 🔥 追加: 関税率に影響するフィールドが変更された場合、自動再取得
  if (updates.origin_country || updates.hts_code || updates.material) {
    triggerDutyRateUpdate(id, {
      origin_country: updates.origin_country || product.origin_country,
      hts_code: updates.hts_code || product.hts_code,
      material: updates.material || product.material
    })
  }
}

async function triggerDutyRateUpdate(
  productId: string, 
  data: { origin_country?: string, hts_code?: string, material?: string }
) {
  console.log('🔄 関税率再取得トリガー:', productId)
  
  try {
    const response = await fetch('/api/duty-rates/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        hts_code: data.hts_code,
        origin_country: data.origin_country,
        material: data.material
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      // 関税率を自動更新
      updateLocalProduct(productId, {
        hts_duty_rate: result.hts_duty_rate,
        origin_country_duty_rate: result.origin_country_duty_rate,
        material_duty_rate: result.material_duty_rate
      })
      
      console.log('✅ 関税率自動更新完了')
    }
  } catch (error) {
    console.error('❌ 関税率自動更新エラー:', error)
  }
}
```

#### 2. 関税率計算API

**新規作成:** `app/api/duty-rates/calculate/route.ts`

**実装内容:**
```typescript
export async function POST(request: Request) {
  const { productId, hts_code, origin_country, material } = await request.json()
  
  const supabase = await createClient()
  
  // 1. 基本関税率を取得（HTSコードから）
  const { data: htsData } = await supabase
    .from('hts_codes')
    .select('general_rate')
    .eq('hts_number', hts_code)
    .single()
  
  // 2. 原産国別関税率を取得
  let originCountryDutyRate = null
  if (origin_country && hts_code) {
    const { data: countryRate } = await supabase
      .from('hts_country_rates')
      .select('duty_rate')
      .eq('hts_code', hts_code)
      .eq('country_code', origin_country)
      .single()
    
    if (countryRate) {
      originCountryDutyRate = countryRate.duty_rate
    }
  }
  
  // 3. 素材別関税率を取得（テーブルがあれば）
  let materialDutyRate = null
  // TODO: material別の関税率テーブルから取得
  
  // 4. データベースに保存
  await supabase
    .from('products_master')
    .update({
      hts_duty_rate: htsData?.general_rate || null,
      origin_country_duty_rate: originCountryDutyRate,
      material_duty_rate: materialDutyRate
    })
    .eq('id', productId)
  
  return NextResponse.json({
    success: true,
    hts_duty_rate: htsData?.general_rate || null,
    origin_country_duty_rate: originCountryDutyRate,
    material_duty_rate: materialDutyRate
  })
}
```

---

### 優先度: 中 🟡

#### 3. 関税率の表示

**ファイル:** `app/tools/editing/components/EditingTable.tsx`

**追加する列:**
```tsx
{
  header: '関税率',
  width: '120px',
  render: (product) => (
    <DutyRateDisplay product={product} />
  )
}
```

**コンポーネント:** `components/DutyRateDisplay.tsx` (新規作成)
```tsx
export function DutyRateDisplay({ product }: { product: any }) {
  const rates = []
  
  // 優先順位1: 原産国別関税率
  if (product.origin_country_duty_rate) {
    rates.push({
      label: product.origin_country,
      rate: product.origin_country_duty_rate,
      priority: 1
    })
  }
  
  // 優先順位2: 素材別関税率
  if (product.material_duty_rate) {
    rates.push({
      label: product.material,
      rate: product.material_duty_rate,
      priority: 2
    })
  }
  
  // 優先順位3: 基本関税率（フォールバック）
  if (rates.length === 0 && product.hts_duty_rate) {
    rates.push({
      label: 'HTS',
      rate: product.hts_duty_rate,
      priority: 3
    })
  }
  
  if (rates.length === 0) {
    return <span className="text-gray-400 text-xs">未設定</span>
  }
  
  return (
    <div className="space-y-1">
      {rates.map((r, idx) => (
        <div key={idx} className="text-xs">
          <span className="font-medium text-blue-600">{r.label}:</span>
          <span className="ml-1">{r.rate}</span>
          {r.priority === 1 && (
            <span className="ml-1 text-green-600">🌍</span>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## 📊 現在のデータフロー

### 正常なフロー
```
1. SellerMirror詳細取得
   ↓
2. 原産国・素材・販売数が自動保存 ✅
   ↓
3. HTSコード取得ボタン
   ↓
4. HTSコード + 関税率が保存 ✅
   ↓
5. カテゴリ分析 → 送料計算 → 利益計算 ✅
   ↓
6. ユーザーが「スコア」ボタンを押す 👆
   ↓
7. スコア計算 ✅
```

### データ変更時の問題フロー
```
1. ユーザーが原産国を変更（US → CN）
   ↓
2. origin_country は CN に更新される ✅
   ↓
3. しかし origin_country_duty_rate は US のまま ❌
   ↓
4. 利益計算が不正確になる ❌
```

### 理想的なフロー（今後の実装）
```
1. ユーザーが原産国を変更（US → CN）
   ↓
2. origin_country は CN に更新される ✅
   ↓
3. 🔥 自動的に関税率再取得API呼び出し
   ↓
4. origin_country_duty_rate が CN の関税率に更新される ✅
   ↓
5. 利益計算が正確になる ✅
```

---

## 🎯 まとめ

### 現在の実装状況
- ✅ 原産国・素材・販売数の自動保存完了
- ✅ データ完全性チェック関数完成
- ✅ スコア計算は手動実行（ボタン押下）
- ⚠️ データ変更時の関税率自動更新は未実装

### ユーザーへの影響
- ✅ 基本的なワークフローは正常に動作
- ⚠️ データ変更後は手動で関税率を再取得する必要がある
- ⚠️ 関税率の表示列はまだ追加されていない

### 今後の推奨実装
1. 🔴 データ変更時の関税率自動更新（優先度: 高）
2. 🟡 関税率の表示列追加（優先度: 中）
3. 🟢 素材別関税率テーブルの作成（優先度: 低）

---

以上で、現在の実装状況と今後の推奨実装を整理しました。
基本機能は完成しており、データ変更時の自動更新は次のフェーズで実装することを推奨します。
