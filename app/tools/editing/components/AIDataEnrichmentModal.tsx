// app/tools/editing/components/AIDataEnrichmentModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Copy, CheckCircle2, AlertCircle, Sparkles, Database, RefreshCw, ExternalLink } from 'lucide-react'
import type { Product } from '../types/product'

interface AIDataEnrichmentModalProps {
  product: Product
  onClose: () => void
  onSave: (success: boolean) => Promise<void>
}

interface AIResult {
  dimensions: {
    weight_g: number
    length_cm: number
    width_cm: number
    height_cm: number
    verification_source?: string
    confidence?: string
  }
  hts_candidates: Array<{
    code: string
    description: string
    reasoning: string
    confidence: number
  }>
  origin_country: {
    code: string
    name: string
    reasoning: string
  }
  english_title: string
  title_reasoning?: string
}

type Step = 'loading' | 'prompt' | 'paste' | 'verify' | 'complete'

export function AIDataEnrichmentModal({ product, onClose, onSave }: AIDataEnrichmentModalProps) {
  const [step, setStep] = useState<Step>('loading')
  const [promptData, setPromptData] = useState<any>(null)
  const [prompt, setPrompt] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [parsedResult, setParsedResult] = useState<AIResult | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // プロンプトデータ取得（クライアント側で生成 - API課金なし）
  useEffect(() => {
    loadPromptData()
  }, [product.id])

  const loadPromptData = async () => {
    try {
      setError(null)
      
      // セルミラーデータ
      const sellerMirrorData = product.ebay_api_data?.listing_reference || null
      
      // 既存の寸法データ
      const existingDimensions = product.listing_data || {}
      
      // HTSコード候補（フロントエンドで静的に保持 - API不要）
      const htsCandidates = await fetchHTSCandidates()
      
      // 原産国マスター（フロントエンドで静的に保持 - API不要）
      const countries = await fetchCountries()
      
      // プロンプトデータ構築
      const data = {
        product: {
          id: product.id,
          title: product.title,
          description: product.scraped_data?.description || '',
          price_jpy: product.price_jpy,
          images: product.scraped_data?.image_urls || [],
          category: product.scraped_data?.category || ''
        },
        existingData: {
          weight_g: existingDimensions.weight_g || null,
          length_cm: existingDimensions.length_cm || null,
          width_cm: existingDimensions.width_cm || null,
          height_cm: existingDimensions.height_cm || null,
          cost_jpy: existingDimensions.cost_jpy || null
        },
        sellerMirror: sellerMirrorData ? {
          referenceCount: sellerMirrorData.referenceItems?.length || 0,
          averagePrice: calculateAveragePrice(sellerMirrorData.referenceItems),
          categoryId: sellerMirrorData.suggestedCategory,
          categoryPath: sellerMirrorData.suggestedCategoryPath,
          topTitles: sellerMirrorData.referenceItems
            ?.slice(0, 3)
            .map((item: any) => item.title) || []
        } : null,
        databaseReferences: {
          htsCandidates: htsCandidates.slice(0, 10),
          countries: countries.slice(0, 15)
        }
      }
      
      setPromptData(data)
      setPrompt(generateAIPrompt(data))
      setStep('prompt')
    } catch (err: any) {
      setError(err.message)
      setStep('prompt')
    }
  }

  // HTSコード候補取得（キャッシュ化推奨）
  const fetchHTSCandidates = async () => {
    try {
      const response = await fetch('/api/hts-codes')
      if (!response.ok) return []
      const data = await response.json()
      return data.map((hts: any) => ({
        code: hts.hts_code,
        description: hts.description,
        category: hts.category,
        baseDuty: hts.base_duty || 0,
        section301Rate: hts.section301_rate || 0
      }))
    } catch {
      return []
    }
  }

  // 原産国マスター取得（キャッシュ化推奨）
  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/hts-countries')
      if (!response.ok) return []
      const data = await response.json()
      return data.map((c: any) => ({
        code: c.country_code,
        name: c.country_name
      }))
    } catch {
      return []
    }
  }

  const calculateAveragePrice = (items: any[]): number | null => {
    if (!items || items.length === 0) return null
    const prices = items
      .map(item => item.price)
      .filter(price => typeof price === 'number' && price > 0)
    if (prices.length === 0) return null
    return prices.reduce((sum, price) => sum + price, 0) / prices.length
  }

  const generateAIPrompt = (data: any): string => {
    const { product, existingData, sellerMirror, databaseReferences } = data

    return `# 商品データ強化タスク

## 📦 商品基本情報
- **商品名**: ${product.title}
- **説明**: ${product.description || '（なし）'}
- **価格**: ¥${product.price_jpy?.toLocaleString() || '不明'}
- **画像URL**: ${product.images[0] || '（なし）'}

${existingData.weight_g ? `
## 📏 既存の寸法データ（確認が必要）
- 重量: ${existingData.weight_g}g
- サイズ: ${existingData.length_cm}×${existingData.width_cm}×${existingData.height_cm}cm

⚠️ **重要**: この寸法データが正確か、Web検索で必ず確認してください。
` : ''}

${sellerMirror ? `
## 🔍 eBay競合分析データ（SellerMirror）
- 類似商品数: ${sellerMirror.referenceCount}件
- 平均価格: $${sellerMirror.averagePrice?.toFixed(2) || '不明'}
- eBayカテゴリ: ${sellerMirror.categoryPath}

**競合商品の英語タイトル例**:
${sellerMirror.topTitles.map((title: string, i: number) => `${i + 1}. ${title}`).join('\n')}
` : ''}

## 🗂️ データベース参照（以下から選択）

### HTSコード候補
${databaseReferences.htsCandidates.map((hts: any) => 
  `- **${hts.code}**: ${hts.description}`
).join('\n')}

### 原産国候補
${databaseReferences.countries.map((c: any) => 
  `- **${c.code}**: ${c.name}`
).join('\n')}

---

## 📋 実行タスク

### 1. 寸法データの確認・取得
${existingData.weight_g ? '既存データをWeb検索で確認' : 'Web検索で実物の寸法を取得'}
- 重量（g）、長さ×幅×高さ（cm）

### 2. HTSコード判定
上記の候補から **最も適切な3つ** を選んでください。

### 3. 原産国判定
上記の候補から選択してください。

### 4. SEO最適化英語タイトル生成
多販路で使える汎用性重視（最大80文字）

---

## 📤 回答フォーマット

\`\`\`json
{
  "dimensions": {
    "weight_g": 250,
    "length_cm": 20.5,
    "width_cm": 15.0,
    "height_cm": 5.0,
    "verification_source": "公式サイト名",
    "confidence": "verified"
  },
  "hts_candidates": [
    {
      "code": "8471.30.0100",
      "description": "portable automatic data processing machines",
      "reasoning": "選定理由",
      "confidence": 85
    },
    {
      "code": "8517.62.0050",
      "description": "smartphones",
      "reasoning": "選定理由",
      "confidence": 70
    },
    {
      "code": "6204.62.4031",
      "description": "women's trousers",
      "reasoning": "選定理由",
      "confidence": 60
    }
  ],
  "origin_country": {
    "code": "CN",
    "name": "China",
    "reasoning": "判定根拠"
  },
  "english_title": "premium wireless bluetooth headphones with noise cancellation"
}
\`\`\``
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2000)
    } catch (err) {
      // フォールバック: テキストエリアを使用
      const textArea = document.createElement('textarea')
      textArea.value = prompt
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setPromptCopied(true)
        setTimeout(() => setPromptCopied(false), 2000)
      } catch (e) {
        setError('コピーに失敗しました。手動でテキストを選択してコピーしてください。')
      }
      document.body.removeChild(textArea)
    }
  }

  const handleOpenGemini = () => {
    window.open('https://gemini.google.com/', '_blank')
  }

  const handleOpenClaude = () => {
    window.open('https://claude.ai/', '_blank')
  }

  const handlePasteJSON = () => {
    try {
      setError(null)
      
      // JSONをパース
      let jsonText = jsonInput.trim()
      
      // ```json ... ``` のマークダウンを削除
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '')
      }
      
      const parsed: AIResult = JSON.parse(jsonText)

      // 必須フィールドの検証
      if (!parsed.dimensions || !parsed.hts_candidates || !parsed.origin_country || !parsed.english_title) {
        throw new Error('必須フィールドが不足しています')
      }

      if (parsed.hts_candidates.length < 3) {
        throw new Error('HTSコード候補は3つ必要です')
      }

      setParsedResult(parsed)
      setStep('verify')
      
      // 自動的に検証を開始
      setTimeout(() => handleVerify(parsed), 500)
    } catch (err: any) {
      setError('JSON形式が正しくありません: ' + err.message)
    }
  }

  const handleVerify = async (result: AIResult = parsedResult!) => {
    if (!result) return

    setVerifying(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-enrichment/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          ...result
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '検証に失敗しました')
      }

      setVerificationResult(data)
      setStep('complete')

      // 親コンポーネントに成功を通知
      await onSave(true)

    } catch (err: any) {
      setError(err.message)
      setStep('verify')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-indigo-600">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">AI商品データ強化（無料）</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* プログレスバー */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 text-sm">
          <div className={`flex items-center gap-2 ${step === 'prompt' ? 'text-purple-600 font-semibold' : 'text-gray-500'}`}>
            1. プロンプト
          </div>
          <div className={`flex items-center gap-2 ${step === 'paste' ? 'text-purple-600 font-semibold' : 'text-gray-500'}`}>
            2. JSON貼り付け
          </div>
          <div className={`flex items-center gap-2 ${step === 'verify' ? 'text-purple-600 font-semibold' : 'text-gray-500'}`}>
            3. 検証
          </div>
          <div className={`flex items-center gap-2 ${step === 'complete' ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
            4. 完了
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">エラー</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* ステップ1: プロンプト生成 */}
          {step === 'prompt' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  📋 統合データ概要
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">商品タイトル:</p>
                    <p className="font-medium">{product.title}</p>
                  </div>
                  {promptData?.sellerMirror && (
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">セルミラーデータ:</p>
                      <p className="font-medium">{promptData.sellerMirror.referenceCount}件の競合商品</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">HTSコード候補:</p>
                    <p className="font-medium">{promptData?.databaseReferences?.htsCandidates?.length || 0}件</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">原産国マスター:</p>
                    <p className="font-medium">{promptData?.databaseReferences?.countries?.length || 0}カ国</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-semibold mb-2 text-lg">🚀 使い方（3ステップ）</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                      <p className="font-semibold">プロンプトをコピー</p>
                      <p className="text-xs text-gray-600">下の「コピー」ボタンをクリック</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                    <div>
                      <p className="font-semibold">AIに貼り付けて実行</p>
                      <p className="text-xs text-gray-600">GeminiまたはClaude Webで送信（無料）</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                      <p className="font-semibold">JSONをこのモーダルに貼り付け</p>
                      <p className="text-xs text-gray-600">「次へ」ボタンを押して保存画面へ</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={handleOpenGemini}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Gemini を開く
                  </Button>
                  <Button
                    onClick={handleOpenClaude}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Claude を開く
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  AI用プロンプト（統合データ）
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={prompt}
                    className="w-full h-96 p-3 border rounded-lg font-mono text-xs resize-none bg-gray-50"
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

              <div className="flex gap-2">
                <Button onClick={() => setStep('paste')} className="flex-1 bg-green-600 hover:bg-green-700" size="lg">
                  ✅ プロンプトをコピーしたら「次へ」
                </Button>
              </div>
            </div>
          )}

          {/* ステップ2: JSON貼り付け */}
          {step === 'paste' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold mb-2 text-lg">📋 AIの回答を貼り付け</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <p>Gemini/Claudeの回答全体をコピー（```json ... ``` を含む）</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                    <p>下のテキストエリアに貼り付け (Ctrl+V / Cmd+V)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                    <p>「保存」ボタンをクリックで自動的に検証・保存実行</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                  <span>AIの回答 (JSON)</span>
                  <span className="text-xs text-gray-500">
                    {jsonInput.length > 0 ? `${jsonInput.length}文字入力済み` : '待機中...'}
                  </span>
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='AIの回答をここに貼り付けてください...\n\n例:\n```json\n{\n  "dimensions": {...},\n  "hts_candidates": [...],\n  ...\n}\n```'
                  className="w-full h-64 p-3 border-2 border-blue-300 rounded-lg font-mono text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  autoFocus
                />
              </div>

              {jsonInput.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 text-sm">
                  ✅ JSONデータが検出されました。下の「保存」ボタンをクリックして続行してください。
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => setStep('prompt')} variant="outline">
                  ← 戻る
                </Button>
                <Button 
                  onClick={handlePasteJSON} 
                  className="flex-1 bg-green-600 hover:bg-green-700" 
                  size="lg"
                  disabled={jsonInput.length === 0}
                >
                  💾 保存してSupabaseに更新
                </Button>
              </div>
            </div>
          )}

          {/* ステップ3: 検証中 */}
          {step === 'verify' && (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-16 h-16 text-purple-600 animate-spin mb-4" />
              <p className="text-lg font-semibold mb-2">Supabaseで検証中...</p>
              <p className="text-sm text-gray-600">HTSコードと関税率を確認しています</p>
            </div>
          )}

          {/* ステップ4: 完了 */}
          {step === 'complete' && verificationResult && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2">AI商品データ強化完了！</h3>
                <p className="text-sm text-gray-600 mb-4">
                  商品データが正常に更新され、DDP計算が自動実行されました
                </p>
                
                <div className="w-full max-w-md space-y-2 text-left">
                  <div className="flex justify-between text-sm">
                    <span>HTSコード:</span>
                    <span className="font-mono font-semibold">{verificationResult.verification.hts_code}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>原産国:</span>
                    <span className="font-semibold">{verificationResult.verification.origin_country}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>関税率:</span>
                    <span className="font-semibold text-red-600">
                      {(verificationResult.verification.duty_rate * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold mb-1">💰 API課金: ¥0</p>
                <p className="text-xs text-gray-600">
                  無料のGemini/Claude Webを使用したため、API料金は発生していません
                </p>
              </div>

              <Button onClick={onClose} className="w-full" size="lg">
                閉じる
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
