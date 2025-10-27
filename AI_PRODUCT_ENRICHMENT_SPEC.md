# AI商品データ強化システム 開発指示書

## 📋 目次
1. [システム概要](#システム概要)
2. [データベース構造](#データベース構造)
3. [API実装](#api実装)
4. [フロントエンド実装](#フロントエンド実装)
5. [MCP統合](#mcp統合)
6. [実装手順](#実装手順)

---

## システム概要

### 目的
日本語商品データから以下を自動生成・取得してSupabaseに保存：
1. **HTSコード（10桁）** - Supabase検索で検証
2. **関税率** - 原産国別に自動計算
3. **原産国** - AI判定
4. **SEO最適化英語タイトル** - AI生成
5. **商品寸法（重量・サイズ）** - Web検索で取得

### アーキテクチャ

```
┌─────────────────────────────────────┐
│ /tools/editing                      │
│ 「AI商品データ強化」ボタン          │
└──────┬──────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ AIDataEnrichmentModal.tsx            │
│ ┌──────────────────────────────────┐ │
│ │ プロンプト自動生成               │ │
│ │ ↓                                │ │
│ │ Claude Webで処理                 │ │
│ │ (Web検索 + AI判定)               │ │
│ │ ↓                                │ │
│ │ JSON結果を貼り付け               │ │
│ └──────────────────────────────────┘ │
└──────┬──────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ バックエンドAPI処理                  │
│ /api/hts/search    → Supabase        │
│ /api/hts/verify    → Supabase        │
│ /api/tariff/calc   → Supabase        │
└──────┬──────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Supabase                             │
│ • hs_codes_by_country               │
│ • origin_countries                  │
│ • products (保存先)                 │
└──────────────────────────────────────┘
```

---

## データベース構造

### 1. `hs_codes_by_country` テーブル

HTSコードと原産国別の関税率を管理。

```sql
CREATE TABLE IF NOT EXISTS hs_codes_by_country (
  id SERIAL PRIMARY KEY,
  hs_code TEXT NOT NULL,              -- 10桁HTSコード (例: 9006.91.0000)
  origin_country TEXT NOT NULL,       -- 原産国コード (JP, CN, DE, etc.)
  duty_rate NUMERIC(6,4) NOT NULL,    -- 関税率 (例: 0.2400 = 24%)
  special_program TEXT,               -- MFN, FTA, Section301, etc.
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hs_code, origin_country)
);

CREATE INDEX idx_hs_country ON hs_codes_by_country(hs_code, origin_country);
```

**サンプルデータ:**
```sql
INSERT INTO hs_codes_by_country (hs_code, origin_country, duty_rate, special_program) VALUES
  ('9006.91.0000', 'JP', 0.2400, 'TRUMP_2025'),  -- 日本: 24%
  ('9006.91.0000', 'CN', 0.3400, 'TRUMP_2025'),  -- 中国: 34%
  ('9006.91.0000', 'DE', 0.1500, 'TRADE_DEAL');  -- ドイツ: 15%
```

---

### 2. `origin_countries` テーブル

原産国マスターデータ（TRUMP 2025関税含む）。

```sql
CREATE TABLE IF NOT EXISTS origin_countries (
  code TEXT PRIMARY KEY,              -- 国コード (JP, CN, US, etc.)
  name TEXT NOT NULL,                 -- 英語名
  name_ja TEXT,                       -- 日本語名
  base_tariff_rate NUMERIC(6,4),      -- 基本関税率
  section301_rate NUMERIC(6,4),       -- Section 301追加関税
  section232_rate NUMERIC(6,4),       -- Section 232追加関税（TRUMP 2025）
  antidumping_rate NUMERIC(6,4),      -- アンチダンピング税
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**主要国の関税率（2025年）:**
| 国コード | 国名 | 関税率 |
|---------|------|--------|
| JP | 日本 | 24% |
| CN | 中国 | 34% |
| KR | 韓国 | 25% |
| DE | ドイツ | 15% |
| US | アメリカ | 0% |

---

### 3. `products` テーブル

商品データの保存先。

```typescript
interface Product {
  id: number
  sku: string
  title: string                    // 日本語タイトル
  english_title: string | null     // ← AI生成

  // AI強化データを listing_data (JSONB) に格納
  listing_data: {
    // 寸法情報（Web検索で取得）
    weight_g?: number
    length_cm?: number
    width_cm?: number
    height_cm?: number

    // HTS情報
    hts_code?: string              // ← AI判定 + Supabase検証
    origin_country?: string        // ← AI判定
    duty_rate?: number             // ← 自動計算

    // 既存フィールド
    ddp_price_usd?: number
    html_description?: string
  }

  // その他
  ebay_api_data: any
  created_at: string
  updated_at: string
}
```

---

## API実装

### `/api/hts/search/route.ts` - HTS検索API

**機能:** キーワードでHTSコードを検索

```typescript
// app/api/hts/search/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!keyword) {
      return NextResponse.json({ error: 'キーワードが必要です' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // HTSコードを検索（descriptionでの部分一致）
    const { data, error } = await supabase
      .from('hs_codes_by_country')
      .select('hs_code, origin_country, duty_rate, special_program, notes')
      .ilike('notes', `%${keyword}%`)
      .limit(limit)

    if (error) {
      console.error('HTS検索エラー:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // HTSコードでグループ化（同じHTSコードで複数の原産国がある）
    const grouped = data.reduce((acc, item) => {
      if (!acc[item.hs_code]) {
        acc[item.hs_code] = {
          hts_code: item.hs_code,
          notes: item.notes,
          countries: []
        }
      }
      acc[item.hs_code].countries.push({
        origin_country: item.origin_country,
        duty_rate: item.duty_rate,
        special_program: item.special_program
      })
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      success: true,
      results: Object.values(grouped)
    })

  } catch (error: any) {
    console.error('HTS検索API致命的エラー:', error)
    return NextResponse.json({
      error: '予期しないエラーが発生しました',
      message: error.message
    }, { status: 500 })
  }
}
```

---

### `/api/hts/verify/route.ts` - HTS検証API

**機能:** HTSコードと原産国の組み合わせを検証し、関税率を返す

```typescript
// app/api/hts/verify/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { hts_code, origin_country } = await request.json()

    if (!hts_code || !origin_country) {
      return NextResponse.json({
        error: 'hts_codeとorigin_countryが必要です'
      }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // HTSコードと原産国の組み合わせを検証
    const { data, error } = await supabase
      .from('hs_codes_by_country')
      .select('*')
      .eq('hs_code', hts_code)
      .eq('origin_country', origin_country.toUpperCase())
      .single()

    if (error) {
      // データが見つからない場合
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          valid: false,
          message: `HTSコード ${hts_code} と原産国 ${origin_country} の組み合わせが見つかりません`
        })
      }

      console.error('HTS検証エラー:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      valid: true,
      data: {
        hts_code: data.hs_code,
        origin_country: data.origin_country,
        duty_rate: data.duty_rate,
        special_program: data.special_program,
        notes: data.notes
      }
    })

  } catch (error: any) {
    console.error('HTS検証API致命的エラー:', error)
    return NextResponse.json({
      error: '予期しないエラーが発生しました',
      message: error.message
    }, { status: 500 })
  }
}
```

---

### `/api/tariff/calculate/route.ts` - 関税計算API

**機能:** 原産国から総関税率を計算

```typescript
// app/api/tariff/calculate/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { origin_country, hts_code } = await request.json()

    if (!origin_country) {
      return NextResponse.json({
        error: 'origin_countryが必要です'
      }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 原産国情報を取得
    const { data: countryData, error: countryError } = await supabase
      .from('origin_countries')
      .select('*')
      .eq('code', origin_country.toUpperCase())
      .single()

    if (countryError) {
      console.error('原産国取得エラー:', countryError)
      return NextResponse.json({
        error: `原産国 ${origin_country} が見つかりません`
      }, { status: 404 })
    }

    // HTSコード別の関税率を取得（存在する場合）
    let htsSpecificRate = null
    if (hts_code) {
      const { data: htsData } = await supabase
        .from('hs_codes_by_country')
        .select('duty_rate, special_program')
        .eq('hs_code', hts_code)
        .eq('origin_country', origin_country.toUpperCase())
        .single()

      if (htsData) {
        htsSpecificRate = htsData.duty_rate
      }
    }

    // 総関税率を計算
    const totalTariffRate = htsSpecificRate !== null
      ? htsSpecificRate
      : (
          (countryData.base_tariff_rate || 0) +
          (countryData.section301_rate || 0) +
          (countryData.section232_rate || 0) +
          (countryData.antidumping_rate || 0)
        )

    return NextResponse.json({
      success: true,
      data: {
        origin_country: countryData.code,
        country_name: countryData.name,
        country_name_ja: countryData.name_ja,
        base_tariff_rate: countryData.base_tariff_rate || 0,
        section301_rate: countryData.section301_rate || 0,
        section232_rate: countryData.section232_rate || 0,
        antidumping_rate: countryData.antidumping_rate || 0,
        total_tariff_rate: totalTariffRate,
        hts_specific: htsSpecificRate !== null,
        hts_code: hts_code || null
      }
    })

  } catch (error: any) {
    console.error('関税計算API致命的エラー:', error)
    return NextResponse.json({
      error: '予期しないエラーが発生しました',
      message: error.message
    }, { status: 500 })
  }
}
```

---

## フロントエンド実装

### `/app/tools/editing/components/AIDataEnrichmentModal.tsx`

**機能:** AI商品データ強化モーダル

```tsx
// app/tools/editing/components/AIDataEnrichmentModal.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Copy, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Product } from '../types/product'

interface AIDataEnrichmentModalProps {
  product: Product
  onClose: () => void
  onSave: (data: EnrichedData) => Promise<void>
}

interface EnrichedData {
  english_title: string
  weight_g: number
  length_cm: number
  width_cm: number
  height_cm: number
  hts_code: string
  origin_country: string
  duty_rate: number
}

export function AIDataEnrichmentModal({ product, onClose, onSave }: AIDataEnrichmentModalProps) {
  const [step, setStep] = useState<'prompt' | 'paste' | 'verify' | 'save'>('prompt')
  const [promptCopied, setPromptCopied] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [parsedData, setParsedData] = useState<any>(null)
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // Claude用プロンプト生成
  const generatePrompt = () => {
    return `以下の商品について、Web検索を使って正確な情報を調査し、JSON形式で回答してください。

**商品情報:**
- 商品名: ${product.title}
- SKU: ${product.sku}
${product.listing_data?.description ? `- 説明: ${product.listing_data.description}` : ''}

**調査項目:**

1. **Web検索で実物の寸法を取得**（推測NG、必ず検索してください）
   - 重量(g)
   - 長さ(cm)、幅(cm)、高さ(cm)
   - パッケージサイズではなく商品本体のサイズ

2. **HTSコード（10桁）を3つ候補を挙げてください**
   - 形式: XXXX.XX.XXXX
   - 商品の材質・用途に基づいて選定

3. **原産国（製造国）**
   - 2文字の国コード（例: JP, CN, US）

4. **SEO最適化された英語タイトル**
   - 最大80文字
   - キーワードを含める
   - 先頭を大文字にしない（小文字で開始）

**回答フォーマット（必ずこの形式で）:**

\`\`\`json
{
  "weight_g": 250,
  "length_cm": 20.5,
  "width_cm": 15.0,
  "height_cm": 5.0,
  "hts_candidates": [
    {
      "code": "8471.30.0100",
      "description": "portable automatic data processing machines"
    },
    {
      "code": "8517.62.0050",
      "description": "smartphones and cellular phones"
    },
    {
      "code": "9006.91.0000",
      "description": "camera tripods and supports"
    }
  ],
  "origin_country": "CN",
  "english_title": "premium wireless bluetooth headphones with noise cancellation"
}
\`\`\`

**注意:**
- 寸法は必ずWeb検索で実物データを取得してください
- 推測は絶対にしないでください
- 見つからない場合は "not_found" と記載してください`
  }

  const handleCopyPrompt = () => {
    const prompt = generatePrompt()
    navigator.clipboard.writeText(prompt)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  const handlePasteJSON = () => {
    try {
      // JSONをパース
      const parsed = JSON.parse(jsonInput)

      // 必須フィールドの検証
      if (!parsed.weight_g || !parsed.length_cm || !parsed.width_cm ||
          !parsed.height_cm || !parsed.hts_candidates || !parsed.origin_country ||
          !parsed.english_title) {
        alert('必須フィールドが不足しています')
        return
      }

      setParsedData(parsed)
      setStep('verify')
    } catch (error) {
      alert('JSON形式が正しくありません')
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    try {
      // HTS候補を検証（最初の候補を使用）
      const firstHTS = parsedData.hts_candidates[0].code

      const verifyResponse = await fetch('/api/hts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hts_code: firstHTS,
          origin_country: parsedData.origin_country
        })
      })

      const verifyResult = await verifyResponse.json()

      if (verifyResult.valid) {
        // 関税率を計算
        const tariffResponse = await fetch('/api/tariff/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin_country: parsedData.origin_country,
            hts_code: firstHTS
          })
        })

        const tariffResult = await tariffResponse.json()

        setVerificationResult({
          valid: true,
          hts_code: firstHTS,
          duty_rate: tariffResult.data.total_tariff_rate,
          country_name: tariffResult.data.country_name_ja || tariffResult.data.country_name
        })

        setStep('save')
      } else {
        setVerificationResult({
          valid: false,
          message: verifyResult.message
        })
      }

    } catch (error) {
      console.error('検証エラー:', error)
      alert('検証中にエラーが発生しました')
    } finally {
      setVerifying(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const enrichedData: EnrichedData = {
        english_title: parsedData.english_title,
        weight_g: parsedData.weight_g,
        length_cm: parsedData.length_cm,
        width_cm: parsedData.width_cm,
        height_cm: parsedData.height_cm,
        hts_code: verificationResult.hts_code,
        origin_country: parsedData.origin_country,
        duty_rate: verificationResult.duty_rate
      }

      await onSave(enrichedData)
      onClose()
    } catch (error) {
      console.error('保存エラー:', error)
      alert('保存中にエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">AI商品データ強化</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ステップ1: プロンプト生成 */}
          {step === 'prompt' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">📋 手順</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>下のプロンプトをコピー</li>
                  <li>Claude Web（無料版でOK）を開く</li>
                  <li>プロンプトを貼り付けて送信</li>
                  <li>Claudeの回答（JSON）をコピー</li>
                  <li>このモーダルに戻って「次へ」</li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Claude用プロンプト
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={generatePrompt()}
                    className="w-full h-64 p-3 border rounded-lg font-mono text-xs resize-none"
                  />
                  <Button
                    onClick={handleCopyPrompt}
                    className="absolute top-2 right-2"
                    size="sm"
                  >
                    {promptCopied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        コピー済み
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        コピー
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Button onClick={() => setStep('paste')} className="w-full">
                次へ: Claude の回答を貼り付け
              </Button>
            </div>
          )}

          {/* ステップ2: JSON貼り付け */}
          {step === 'paste' && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm">
                  Claudeが生成したJSON（```json ... ``` の部分）を下に貼り付けてください
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Claude の回答 (JSON)
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"weight_g": 250, "length_cm": 20.5, ...}'
                  className="w-full h-64 p-3 border rounded-lg font-mono text-xs"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setStep('prompt')} variant="outline">
                  戻る
                </Button>
                <Button onClick={handlePasteJSON} className="flex-1">
                  検証する
                </Button>
              </div>
            </div>
          )}

          {/* ステップ3: 検証 */}
          {step === 'verify' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <p className="text-sm">
                  Supabaseでデータを検証しています...
                </p>
              </div>

              {parsedData && (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="font-semibold text-sm mb-2">寸法</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>重量: {parsedData.weight_g}g</div>
                      <div>長さ: {parsedData.length_cm}cm</div>
                      <div>幅: {parsedData.width_cm}cm</div>
                      <div>高さ: {parsedData.height_cm}cm</div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="font-semibold text-sm mb-2">HTS候補</h4>
                    {parsedData.hts_candidates.map((hts: any, i: number) => (
                      <div key={i} className="text-sm mb-1">
                        {i + 1}. {hts.code} - {hts.description}
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="font-semibold text-sm mb-2">その他</h4>
                    <div className="text-sm">
                      <div>原産国: {parsedData.origin_country}</div>
                      <div>英語タイトル: {parsedData.english_title}</div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleVerify}
                className="w-full"
                disabled={verifying}
              >
                {verifying ? '検証中...' : 'Supabaseで検証'}
              </Button>
            </div>
          )}

          {/* ステップ4: 保存 */}
          {step === 'save' && (
            <div className="space-y-4">
              {verificationResult?.valid ? (
                <>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">検証成功！</p>
                      <p className="text-sm mt-1">
                        HTSコード: {verificationResult.hts_code}<br />
                        原産国: {verificationResult.country_name}<br />
                        関税率: {(verificationResult.duty_rate * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <Button onClick={handleSave} className="w-full" disabled={saving}>
                    {saving ? '保存中...' : 'Supabaseに保存'}
                  </Button>
                </>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">検証失敗</p>
                    <p className="text-sm mt-1">{verificationResult?.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### `ToolPanel.tsx` へのボタン追加

既存の`ToolPanel.tsx`に「AI商品データ強化」ボタンを追加：

```tsx
// app/tools/editing/components/ToolPanel.tsx 内に追加

interface ToolPanelProps {
  // 既存のprops...
  onAIEnrich?: () => void  // ← 追加
}

export function ToolPanel({
  // 既存のprops...
  onAIEnrich
}: ToolPanelProps) {
  return (
    <div className="flex gap-2">
      {/* 既存のボタン... */}

      <Button
        onClick={onAIEnrich}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        AI商品データ強化
      </Button>
    </div>
  )
}
```

---

### `page.tsx` での統合

```tsx
// app/tools/editing/page.tsx 内に追加

import { AIDataEnrichmentModal } from './components/AIDataEnrichmentModal'

export default function EditingPage() {
  // 既存のstate...
  const [showAIEnrichModal, setShowAIEnrichModal] = useState(false)
  const [enrichTargetProduct, setEnrichTargetProduct] = useState<Product | null>(null)

  const handleAIEnrich = () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    // 最初の選択商品を対象にする
    const firstId = Array.from(selectedIds)[0]
    const product = products.find(p => p.id === firstId)

    if (product) {
      setEnrichTargetProduct(product)
      setShowAIEnrichModal(true)
    }
  }

  const handleSaveEnrichedData = async (data: any) => {
    if (!enrichTargetProduct) return

    try {
      const response = await fetch(`/api/products/${enrichTargetProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          english_title: data.english_title,
          listing_data: {
            ...enrichTargetProduct.listing_data,
            weight_g: data.weight_g,
            length_cm: data.length_cm,
            width_cm: data.width_cm,
            height_cm: data.height_cm,
            hts_code: data.hts_code,
            origin_country: data.origin_country,
            duty_rate: data.duty_rate
          }
        })
      })

      if (!response.ok) {
        throw new Error('保存に失敗しました')
      }

      showToast('AI強化データを保存しました')
      await loadProducts()
    } catch (error) {
      console.error('保存エラー:', error)
      showToast('保存に失敗しました', 'error')
    }
  }

  return (
    <div>
      <ToolPanel
        // 既存のprops...
        onAIEnrich={handleAIEnrich}
      />

      {/* 既存のコンテンツ... */}

      {showAIEnrichModal && enrichTargetProduct && (
        <AIDataEnrichmentModal
          product={enrichTargetProduct}
          onClose={() => {
            setShowAIEnrichModal(false)
            setEnrichTargetProduct(null)
          }}
          onSave={handleSaveEnrichedData}
        />
      )}
    </div>
  )
}
```

---

## MCP統合

### Supabase MCP Serverの設定確認

**前提:** Supabase MCP Serverが既にインストール済みであること

設定ファイル（`~/.config/claude/claude_desktop_config.json`）:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "https://zdzfpucdyxdlavkgrvil.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

---

### MCPでの使用例

Claude Codeに依頼するコマンド例：

```
この商品を処理してください:
- 商品名: ソニー ワイヤレスヘッドホン WH-1000XM5
- SKU: SONY-WH1000XM5-BLK

以下を実行:
1. Web検索で寸法を取得
2. HTSコードを検索（Supabaseから）
3. 原産国を判定
4. 関税率を計算（Supabaseから）
5. 英語タイトルを生成
6. Supabaseのproductsテーブルに保存
```

Claude Codeが自動的に：
- Web検索ツールで寸法を取得
- Supabase MCPで`hs_codes_by_country`を検索
- Supabase MCPで`origin_countries`から関税率を取得
- Supabase MCPで`products`テーブルを更新

---

## 実装手順

### Phase 1: API実装（所要時間: 15分）

1. `/app/api/hts/search/route.ts` を作成
2. `/app/api/hts/verify/route.ts` を作成
3. `/app/api/tariff/calculate/route.ts` を作成
4. Postmanでテスト

**テスト例:**
```bash
# HTS検索
curl "http://localhost:3000/api/hts/search?keyword=camera"

# HTS検証
curl -X POST http://localhost:3000/api/hts/verify \
  -H "Content-Type: application/json" \
  -d '{"hts_code":"9006.91.0000","origin_country":"JP"}'

# 関税計算
curl -X POST http://localhost:3000/api/tariff/calculate \
  -H "Content-Type: application/json" \
  -d '{"origin_country":"JP","hts_code":"9006.91.0000"}'
```

---

### Phase 2: フロントエンド実装（所要時間: 20分）

1. `/app/tools/editing/components/AIDataEnrichmentModal.tsx` を作成
2. `/app/tools/editing/components/ToolPanel.tsx` にボタン追加
3. `/app/tools/editing/page.tsx` でモーダルを統合
4. ブラウザで動作確認

---

### Phase 3: MCP統合テスト（所要時間: 5分）

1. Supabase MCP Serverが動作していることを確認
2. Claude Codeで商品データ処理を依頼
3. Supabaseに正しく保存されているか確認

---

### Phase 4: 本番デプロイ（所要時間: 5分）

```bash
git add .
git commit -m "feat: add AI product data enrichment with HTS/tariff calculation"
git push -u origin claude/csv-to-json-conversion-011CUXkuqkgTetG1QXGnXsaG
```

---

## トラブルシューティング

### 問題1: Supabase接続エラー

**症状:**
```
Error: Supabase環境変数が設定されていません
```

**解決策:**
`.env.local`に以下を追加:
```
NEXT_PUBLIC_SUPABASE_URL=https://zdzfpucdyxdlavkgrvil.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

### 問題2: HTSコードが見つからない

**症状:**
検証時に「HTSコードが見つかりません」エラー

**解決策:**
1. `hs_codes_by_country`テーブルにデータが存在するか確認
2. HTSコードのフォーマットを確認（10桁、ドット含む）
3. 原産国コードが大文字であることを確認

```sql
-- データ確認
SELECT * FROM hs_codes_by_country
WHERE hs_code LIKE '9006%'
LIMIT 10;
```

---

### 問題3: JSONパースエラー

**症状:**
「JSON形式が正しくありません」エラー

**解決策:**
Claudeの回答から```json ... ```の部分だけを抽出してください。

正しい例:
```json
{
  "weight_g": 250,
  "length_cm": 20.5
}
```

間違った例:
```
ここにJSON形式で回答します:
```json
{
  "weight_g": 250
}
```
```

---

## まとめ

### 完成後にできること

✅ Claude Web（無料）でWeb検索＋AI判定
✅ HTSコードと関税率の自動検証（Supabase）
✅ 原産国別の正確な関税計算
✅ 商品寸法の自動取得（推測なし）
✅ SEO最適化英語タイトル生成
✅ データをSupabaseに一括保存

### 費用

**完全無料**
- Claude Web: 無料版でOK
- Supabase: 既存インフラ
- Next.js API: 既存インフラ

---

## 参考資料

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Claude API](https://docs.anthropic.com/claude/reference)

---

**開発指示書 v1.0**
作成日: 2025-10-27
対象システム: n3-frontend_new (/tools/editing)
