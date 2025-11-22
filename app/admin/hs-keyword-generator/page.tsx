// app/admin/hs-keyword-generator/page.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, Database, Edit, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react'

type Step = 'select' | 'processing' | 'complete'

interface HsCodeInput {
  hs_code: string
  description_ja?: string
  description_en?: string
}

interface GenerationResult {
  total: number
  completed: number
  succeeded: number
  failed: number
  errors?: Array<{ hs_code: string; error: string }>
}

export default function HSKeywordGeneratorPage() {
  const [step, setStep] = useState<Step>('select')
  const [hsCodes, setHsCodes] = useState<HsCodeInput[]>([])
  const [manualInput, setManualInput] = useState('')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // CSVファイルアップロード
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())

        // ヘッダー行をスキップ
        const dataLines = lines.slice(1)

        const parsedCodes: HsCodeInput[] = dataLines.map(line => {
          const [hs_code, description_ja, description_en] = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
          return {
            hs_code,
            description_ja: description_ja || undefined,
            description_en: description_en || undefined
          }
        }).filter(item => item.hs_code)

        setHsCodes(parsedCodes)
        setError(null)
      } catch (err) {
        setError('CSVファイルの解析に失敗しました')
      }
    }
    reader.readAsText(file)
  }

  // Supabaseから全HTSコードを取得
  const handleFetchFromDatabase = async () => {
    try {
      setError(null)
      // TODO: Supabaseから既存のHTSコードリストを取得するAPIを実装
      // 暫定的にダミーデータ
      const dummyCodes: HsCodeInput[] = [
        { hs_code: '854160', description_ja: '集積回路', description_en: 'Electronic integrated circuits' },
        { hs_code: '950300', description_ja: 'その他のおもちゃ', description_en: 'Other toys' }
      ]
      setHsCodes(dummyCodes)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // 手動入力からHSコードを解析
  const handleParseManualInput = () => {
    try {
      const parsed = JSON.parse(manualInput) as HsCodeInput[]
      if (!Array.isArray(parsed)) {
        throw new Error('JSON配列形式で入力してください')
      }
      setHsCodes(parsed)
      setError(null)
    } catch (err: any) {
      setError('JSON解析エラー: ' + err.message)
    }
  }

  // キーワード生成実行
  const handleGenerate = async () => {
    if (hsCodes.length === 0) {
      setError('HSコードが選択されていません')
      return
    }

    setStep('processing')
    setError(null)
    setProgress(0)

    try {
      const response = await fetch('/api/admin/generate-hs-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hsCodes })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'キーワード生成に失敗しました')
      }

      const data: GenerationResult = await response.json()
      setResult(data)
      setStep('complete')

    } catch (err: any) {
      console.error('❌ キーワード生成エラー:', err)
      setError(err.message)
      setStep('select')
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🤖 HSコード分類キーワード自動生成</h1>
        <p className="text-gray-600">
          Gemini APIを使用して、HTSコードに関連する日本語・英語キーワードを自動生成します
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">エラー</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* ステップ1: データソース選択 */}
      {step === 'select' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* CSV アップロード */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  CSVアップロード
                </CardTitle>
                <CardDescription>
                  HSコードリストをCSVファイルで一括登録
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-2">
                  形式: hs_code,description_ja,description_en
                </p>
              </CardContent>
            </Card>

            {/* Supabaseから取得 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  データベースから取得
                </CardTitle>
                <CardDescription>
                  既存のHTSコードリストを自動取得
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleFetchFromDatabase} className="w-full">
                  <Database className="w-4 h-4 mr-2" />
                  Supabaseから取得
                </Button>
              </CardContent>
            </Card>

            {/* 手動入力 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  手動入力
                </CardTitle>
                <CardDescription>
                  JSON形式で直接入力
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => document.getElementById('manual-input-area')?.classList.toggle('hidden')}
                  variant="outline"
                  className="w-full"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  入力エリアを開く
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 手動入力エリア */}
          <div id="manual-input-area" className="hidden">
            <Card>
              <CardHeader>
                <CardTitle>JSON入力</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={`[\n  {\n    "hs_code": "854160",\n    "description_ja": "集積回路",\n    "description_en": "Electronic integrated circuits"\n  }\n]`}
                  className="w-full h-48 p-3 border rounded-lg font-mono text-sm"
                />
                <Button onClick={handleParseManualInput} className="w-full">
                  JSONを解析
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 読み込まれたHSコードのプレビュー */}
          {hsCodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>読み込まれたHSコード</span>
                  <Badge variant="outline">{hsCodes.length}件</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">HSコード</th>
                        <th className="p-2 text-left">日本語説明</th>
                        <th className="p-2 text-left">英語説明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hsCodes.slice(0, 20).map((code, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2 font-mono">{code.hs_code}</td>
                          <td className="p-2">{code.description_ja || '-'}</td>
                          <td className="p-2">{code.description_en || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {hsCodes.length > 20 && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      他 {hsCodes.length - 20}件...
                    </p>
                  )}
                </div>

                <Button onClick={handleGenerate} className="w-full mt-4 bg-green-600 hover:bg-green-700" size="lg">
                  🚀 キーワード生成を開始（{hsCodes.length}件）
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ステップ2: 処理中 */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
          <p className="text-lg font-semibold mb-2">キーワード生成中...</p>
          <p className="text-sm text-gray-600">{hsCodes.length}件のHTSコードを処理しています</p>
          <p className="text-xs text-gray-500 mt-2">Gemini API: gemini-2.5-flash-preview-09-2025</p>
        </div>
      )}

      {/* ステップ3: 完了 */}
      {step === 'complete' && result && (
        <div className="space-y-4">
          <div className="bg-green-50 p-6 rounded-lg border border-green-200 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">キーワード生成完了！</h3>

            <div className="w-full max-w-md space-y-2 text-left mt-4">
              <div className="flex justify-between text-sm">
                <span>処理件数:</span>
                <span className="font-semibold">{result.total}件</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>成功:</span>
                <span className="font-semibold text-green-600">{result.succeeded}件</span>
              </div>
              {result.failed > 0 && (
                <div className="flex justify-between text-sm">
                  <span>失敗:</span>
                  <span className="font-semibold text-red-600">{result.failed}件</span>
                </div>
              )}
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">エラー詳細</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {result.errors.map((err, i) => (
                    <div key={i} className="p-2 bg-red-50 rounded border border-red-200 text-sm">
                      <span className="font-mono font-semibold">{err.hs_code}</span>: {err.error}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={() => { setStep('select'); setResult(null); setHsCodes([]) }} className="w-full" size="lg">
            別のHSコードを処理
          </Button>
        </div>
      )}

      {/* ガイド */}
      <div className="mt-12 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          使い方
        </h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span>CSVアップロード、データベースから取得、または手動入力でHTSコードリストを準備</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">2.</span>
            <span>「キーワード生成を開始」ボタンをクリック</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span>Gemini APIが各HTSコードに対して10-20個の日本語・英語キーワードを生成</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>生成されたキーワードは自動的にデータベースに保存され、データ編集UIで利用可能になります</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
