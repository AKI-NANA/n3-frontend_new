# 🎯 関税計算システム完全実装マニュアル

## 📋 実装概要

指示書に基づき、以下の機能を実装します:

1. **Phase 1**: SM分析の修正とsellermirror_analysisテーブル連携
2. **Phase 2**: Gemini分析テーブル作成
3. **Phase 3**: Gemini分析UI実装
4. **Phase 4**: HTS確定と関税計算
5. **Phase 5**: 利益計算の更新

---

## 🗂️ 作成済みファイル

### 1. SQL設定ファイル

```
sql/phase1_sm_analysis_setup.sql          # Phase 1: テーブル・トリガー作成
sql/phase2_gemini_analysis_setup.sql      # Phase 2: Gemini分析テーブル
```

### 2. APIエンドポイント

```
app/api/sm-analysis/route.ts             # sellermirror_analysis保存API
```

---

## 📝 実装手順

### Step 1: データベースセットアップ

#### 1-1. Supabase SQL Editorでの実行

1. Supabaseダッシュボードにログイン
   - URL: https://zdzfpucdyxdlavkgrvil.supabase.co

2. SQL Editorを開く

3. Phase 1のSQLを実行:
   ```bash
   # ファイルの内容をコピー
   cat sql/phase1_sm_analysis_setup.sql
   ```
   - SQL Editorに貼り付けて実行
   - 以下が作成されます:
     - `sellermirror_analysis`テーブル
     - `products`テーブルに必要なカラム追加
     - `sync_sm_data_to_products()`トリガー関数

4. 実行結果を確認:
   ```sql
   -- テーブル確認
   SELECT * FROM sellermirror_analysis LIMIT 1;
   
   -- カラム確認
   SELECT column_name, data_type 
   FROM information_schema.columns
   WHERE table_name = 'products'
   AND column_name IN ('material', 'origin_country', 'hts_code', 'final_tariff_rate');
   
   -- トリガー確認
   SELECT tgname, tgenabled FROM pg_trigger
   WHERE tgname = 'trigger_sync_sm_data';
   ```

5. Phase 2のSQLを実行:
   ```bash
   cat sql/phase2_gemini_analysis_setup.sql
   ```

---

### Step 2: SM分析APIの統合

#### 2-1. 既存のSM分析APIを修正

現在の`/api/tools/sellermirror-analyze/route.ts`は`products_master`に保存していますが、
新しい`/api/sm-analysis/route.ts`を使用して`sellermirror_analysis`テーブルに保存します。

#### 2-2. 修正内容

`app/api/tools/sellermirror-analyze/route.ts`の該当部分を以下のように修正:

```typescript
// 既存のコード（修正前）
// ebay_api_dataに保存...

// 修正後: sellermirror_analysisに保存
const smAnalysisResponse = await fetch(`${baseUrl}/api/sm-analysis`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: product.id,
    competitor_count: smResult.listingData?.referenceItems?.length || 0,
    avg_price_usd: calculateAvgPrice(smResult.listingData?.referenceItems),
    min_price_usd: calculateMinPrice(smResult.listingData?.referenceItems),
    max_price_usd: calculateMaxPrice(smResult.listingData?.referenceItems),
    common_aspects: extractCommonAspects(smResult.listingData?.referenceItems),
    analyzed_at: new Date().toISOString()
  })
})
```

#### 2-3. ヘルパー関数の追加

```typescript
// 価格計算ヘルパー
function calculateAvgPrice(items: any[]): number | null {
  if (!items || items.length === 0) return null
  const prices = items.map(i => parseFloat(i.price)).filter(p => !isNaN(p))
  if (prices.length === 0) return null
  return prices.reduce((sum, p) => sum + p, 0) / prices.length
}

function calculateMinPrice(items: any[]): number | null {
  if (!items || items.length === 0) return null
  const prices = items.map(i => parseFloat(i.price)).filter(p => !isNaN(p))
  return prices.length > 0 ? Math.min(...prices) : null
}

function calculateMaxPrice(items: any[]): number | null {
  if (!items || items.length === 0) return null
  const prices = items.map(i => parseFloat(i.price)).filter(p => !isNaN(p))
  return prices.length > 0 ? Math.max(...prices) : null
}

// Item Specificsの共通項目を抽出
function extractCommonAspects(items: any[]): any {
  if (!items || items.length === 0) return {}
  
  const aspectCounts: Record<string, Record<string, number>> = {}
  
  // 各アイテムのItem Specificsをカウント
  items.forEach(item => {
    const specifics = item.itemSpecifics || item.item_specifics || {}
    Object.entries(specifics).forEach(([key, value]) => {
      if (!aspectCounts[key]) aspectCounts[key] = {}
      const strValue = String(value)
      aspectCounts[key][strValue] = (aspectCounts[key][strValue] || 0) + 1
    })
  })
  
  // 最頻出の値を取得
  const commonAspects: Record<string, string> = {}
  Object.entries(aspectCounts).forEach(([key, valueCounts]) => {
    const maxCount = Math.max(...Object.values(valueCounts))
    const mostCommonValue = Object.entries(valueCounts)
      .find(([_, count]) => count === maxCount)?.[0]
    if (mostCommonValue) {
      commonAspects[key] = mostCommonValue
    }
  })
  
  return commonAspects
}
```

---

### Step 3: 動作テスト

#### 3-1. ローカル開発サーバー起動

```bash
cd /Users/aritahiroaki/n3-frontend_new
npm run dev
```

#### 3-2. テスト手順

1. ブラウザで開く: http://localhost:3000/tools/editing

2. 商品を選択

3. 「SM分析」ボタンをクリック

4. 実行結果を確認:
   ```sql
   -- Supabase SQL Editorで確認
   SELECT 
     sa.*,
     p.sm_competitors,
     p.sm_min_price_usd,
     p.material,
     p.origin_country
   FROM sellermirror_analysis sa
   JOIN products p ON p.id = sa.product_id
   ORDER BY sa.analyzed_at DESC
   LIMIT 10;
   ```

5. 期待される結果:
   - ✅ `sellermirror_analysis`にデータが保存される
   - ✅ トリガーが実行され、`products`テーブルが更新される
   - ✅ `common_aspects`から`material`と`origin_country`が抽出される

---

### Step 4: Gemini分析UI実装（Phase 3）

#### 4-1. コンポーネント作成

```bash
# Gemini分析モーダルコンポーネントを作成
touch app/tools/editing/components/GeminiAnalysisModal.tsx
```

#### 4-2. 実装内容

```typescript
// app/tools/editing/components/GeminiAnalysisModal.tsx
'use client'

import { useState } from 'react'
import { Product } from '../types/product'

interface Props {
  product: Product
  smData: any
  onClose: () => void
  onSave: (data: any) => void
}

export function GeminiAnalysisModal({ product, smData, onClose, onSave }: Props) {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  // プロンプト生成
  const generatePrompt = () => {
    const promptText = `
あなたは米国税関のHTS分類専門家です。
以下の商品情報から、最適なHTSコード（10桁）を判定し、eBay出品用にタイトル・説明を英語でリライトしてください。

【商品情報】
タイトル（日本語）: ${product.title}
説明（日本語）: ${product.description || 'なし'}
ブランド: ${product.brand || '不明'}
カテゴリー: ${product.category_name || '不明'}
仕入価格: ${product.price_jpy}円

【SM分析データ（競合商品のItem Specifics）】
${JSON.stringify(smData?.common_aspects || {}, null, 2)}

【出力形式】
以下のJSON形式で出力してください。コードブロックは不要です。

{
  "rewritten_title": "英語タイトル（80文字以内、SEO最適化）",
  "rewritten_description": "英語説明文（改行あり、詳細に）",
  "material": "plush/plastic/metal/wood等",
  "origin_country": "JP/CN/US等の国コード",
  "hts_candidates": [
    {
      "code": "9503.00.00.11",
      "confidence": 95,
      "reason": "判定理由を日本語で"
    },
    {
      "code": "9503.00.00.31",
      "confidence": 75,
      "reason": "代替候補の理由"
    }
  ]
}

【重要なHTSルール】
- 玩具: Chapter 95（9503）
- トレーディングカード: Chapter 97（9704）
- 釣具: Chapter 95（9507）
- 時計: Chapter 91
- 光学機器: Chapter 90
`
    setPrompt(promptText)
  }

  // Gemini結果をパース
  const parseResponse = async () => {
    setLoading(true)
    try {
      // JSONのクリーニング（```json ... ```を除去）
      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      const data = JSON.parse(cleanedResponse)
      
      // gemini_analysisテーブルに保存
      const saveResponse = await fetch('/api/gemini-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          input_prompt: prompt,
          rewritten_title_en: data.rewritten_title,
          rewritten_description_en: data.rewritten_description,
          detected_material: data.material,
          detected_origin_country: data.origin_country,
          hts_candidate_1: data.hts_candidates[0]?.code,
          hts_confidence_1: data.hts_candidates[0]?.confidence,
          hts_reason_1: data.hts_candidates[0]?.reason,
          hts_candidate_2: data.hts_candidates[1]?.code,
          hts_confidence_2: data.hts_candidates[1]?.confidence,
          hts_reason_2: data.hts_candidates[1]?.reason,
          hts_candidate_3: data.hts_candidates[2]?.code,
          hts_confidence_3: data.hts_candidates[2]?.confidence,
          hts_reason_3: data.hts_candidates[2]?.reason
        })
      })
      
      const result = await saveResponse.json()
      
      if (result.success) {
        alert('✅ Gemini分析を保存しました！')
        onSave(data)
      } else {
        alert('❌ 保存に失敗: ' + result.error)
      }
      
    } catch (error: any) {
      alert('❌ JSONパースエラー: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
        <h2 className="text-xl font-bold mb-4">Gemini AI分析</h2>
        
        {/* プロンプト生成 */}
        <div className="mb-4">
          <button
            onClick={generatePrompt}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            プロンプト生成
          </button>
        </div>
        
        {/* プロンプト表示 */}
        {prompt && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              プロンプト（Geminiに貼り付け）
            </label>
            <textarea
              value={prompt}
              readOnly
              className="w-full h-40 p-2 border rounded font-mono text-sm"
            />
            <button
              onClick={() => navigator.clipboard.writeText(prompt)}
              className="mt-2 px-3 py-1 bg-gray-600 text-white rounded text-sm"
            >
              クリップボードにコピー
            </button>
          </div>
        )}
        
        {/* Gemini結果入力 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Geminiの回答（JSONを貼り付け）
          </label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Geminiからの回答をここに貼り付けてください"
            className="w-full h-40 p-2 border rounded font-mono text-sm"
          />
        </div>
        
        {/* 実行ボタン */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            キャンセル
          </button>
          <button
            onClick={parseResponse}
            disabled={!response || loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '処理中...' : '解析して保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

### Step 5: Gemini分析APIの作成

```bash
mkdir -p app/api/gemini-analysis
touch app/api/gemini-analysis/route.ts
```

```typescript
// app/api/gemini-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('gemini_analysis')
      .upsert({
        product_id: body.product_id,
        input_prompt: body.input_prompt,
        rewritten_title_en: body.rewritten_title_en,
        rewritten_description_en: body.rewritten_description_en,
        detected_material: body.detected_material,
        detected_origin_country: body.detected_origin_country,
        hts_candidate_1: body.hts_candidate_1,
        hts_confidence_1: body.hts_confidence_1,
        hts_reason_1: body.hts_reason_1,
        hts_candidate_2: body.hts_candidate_2,
        hts_confidence_2: body.hts_confidence_2,
        hts_reason_2: body.hts_reason_2,
        hts_candidate_3: body.hts_candidate_3,
        hts_confidence_3: body.hts_confidence_3,
        hts_reason_3: body.hts_reason_3,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'product_id'
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: data
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

---

## ✅ 完了チェックリスト

### Phase 1: SM分析の修正
- [x] `phase1_sm_analysis_setup.sql`作成
- [x] `/api/sm-analysis/route.ts`作成
- [ ] Supabaseでテーブル作成実行
- [ ] `/api/tools/sellermirror-analyze/route.ts`修正
- [ ] 動作テスト

### Phase 2: Gemini分析テーブル
- [x] `phase2_gemini_analysis_setup.sql`作成
- [ ] Supabaseでテーブル作成実行
- [ ] トリガー動作確認

### Phase 3: Gemini分析UI
- [ ] `GeminiAnalysisModal.tsx`作成
- [ ] `/api/gemini-analysis/route.ts`作成
- [ ] モーダル統合テスト

### Phase 4: HTS確定と関税計算
- [ ] HTS選択UI実装
- [ ] 関税計算API統合
- [ ] `calculate_final_tariff()`関数呼び出し

### Phase 5: 利益計算更新
- [ ] 利益計算ロジック更新
- [ ] 関税額を含む原価計算
- [ ] テスト実行

---

## 🐛 トラブルシューティング

### 問題1: トリガーが実行されない

**確認方法:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_sync_sm_data';
```

**対処法:**
```sql
-- トリガーを再作成
DROP TRIGGER IF EXISTS trigger_sync_sm_data ON sellermirror_analysis;
CREATE TRIGGER trigger_sync_sm_data
AFTER INSERT OR UPDATE ON sellermirror_analysis
FOR EACH ROW
EXECUTE FUNCTION sync_sm_data_to_products();
```

### 問題2: カラムが存在しない

**確認方法:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('material', 'origin_country', 'hts_code');
```

**対処法:**
```sql
-- カラムを手動で追加
ALTER TABLE products ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS origin_country TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hts_code TEXT;
```

---

## 📚 次のステップ

1. **Phase 1の完了**を最優先
2. テストデータで動作確認
3. Phase 2-3の実装
4. 本番データでの検証

実装に問題があれば、このマニュアルに戻って確認してください。
