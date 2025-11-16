// app/tools/editing/components/GeminiBatchModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Copy, CheckCircle2, ExternalLink, Loader2, AlertCircle } from 'lucide-react'

interface GeminiBatchModalProps {
  selectedIds: Set<string>
  onClose: () => void
  onComplete: () => Promise<void>
}

type Step = 'select' | 'prompt' | 'paste' | 'saving' | 'complete'
type DataType = 'basic' | 'customs' | 'market' | 'both'

export function GeminiBatchModal({ selectedIds, onClose, onComplete }: GeminiBatchModalProps) {
  const [step, setStep] = useState<Step>('select')
  const [dataType, setDataType] = useState<DataType>('both')
  const [prompt, setPrompt] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const [pasteData, setPasteData] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // データタイプが選択されたらプロンプト生成
  useEffect(() => {
    if (step === 'prompt') {
      handleGeneratePrompt()
    }
  }, [step, dataType])

  // データタイプ選択からプロンプトへ
  const handleSelectDataType = (type: DataType) => {
    setDataType(type)
    setStep('prompt')
  }

  // プロンプト生成
  const handleGeneratePrompt = async () => {
    try {
      setError(null)
      const response = await fetch('/api/gemini-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productIds: Array.from(selectedIds).map(Number),
          dataType: dataType
        })
      })

      if (!response.ok) {
        throw new Error('プロンプト生成に失敗しました')
      }

      const data = await response.json()
      setPrompt(data.prompt)

    } catch (error: any) {
      setError(error.message)
      console.error('Prompt generation error:', error)
    }
  }

  // プロンプトコピー
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2000)
    } catch (err) {
      // フォールバック
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

  // Gemini Webを開く
  const handleOpenGemini = () => {
    window.open('https://gemini.google.com/', '_blank')
  }

  // 貼り付けステップへ
  const handleNextToPaste = () => {
    setStep('paste')
  }

  // 保存処理
  const handleSave = async () => {
    if (!pasteData.trim()) {
      setError('Geminiの出力を貼り付けてください')
      return
    }

    setStep('saving')
    setError(null)

    try {
      // JSONをパース
      let jsonText = pasteData.trim()
      
      // マークダウンのコードブロックを削除
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '')
      }

      const jsonData = JSON.parse(jsonText)

      // 配列でない場合はエラー
      if (!Array.isArray(jsonData)) {
        throw new Error('JSON配列である必要があります')
      }

      console.log(`🚀 一括更新API呼び出し: ${jsonData.length}件`)

      // 一括更新API呼び出し
      const response = await fetch('/api/products/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: jsonData })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '保存に失敗しました')
      }

      const result = await response.json()
      setResult(result)

      console.log('✅ 保存完了:', result)

      setStep('complete')

      // データ再読み込み
      await onComplete()

      // 2秒後に自動で閉じる
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (error: any) {
      console.error('❌ 保存エラー:', error)
      setError(error.message)
      setStep('paste')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-indigo-600">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              🤖 Gemini一括データ取得（{selectedIds.size}件）
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* プログレスバー */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 text-sm">
          <div className={`flex items-center gap-2 ${step === 'select' ? 'text-purple-600 font-semibold' : 'text-gray-500'}`}>
            0. データ選択
          </div>
          <div className={`flex items-center gap-2 ${step === 'prompt' ? 'text-purple-600 font-semibold' : 'text-gray-500'}`}>
            1. プロンプト
          </div>
          <div className={`flex items-center gap-2 ${step === 'paste' ? 'text-purple-600 font-semibold' : 'text-gray-500'}`}>
            2. 貼り付け
          </div>
          <div className={`flex items-center gap-2 ${step === 'saving' ? 'text-purple-600 font-semibold' : 'text-gray-500'}`}>
            3. 保存中
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

          {/* ステップ0: データタイプ選択 */}
          {step === 'select' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">どのデータを取得しますか？</h3>
                <p className="text-sm text-gray-600">{selectedIds.size}件の商品を処理します</p>
              </div>

              {/* 全てのデータ（推奨） */}
              <button
                onClick={() => handleSelectDataType('both')}
                className="w-full p-6 text-left border-2 border-purple-300 hover:border-purple-500 rounded-lg transition-all hover:shadow-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white flex items-center justify-center text-xl font-bold">
                    🚀
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">全データ取得（推奨）</h4>
                      <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded">推奨</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      基本情報 + 関税 + 市場調査を一度に取得
                    </p>
                    <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-blue-600">✅ 基本情報:</span>
                        <span className="text-gray-600">英語タイトル、サイズ、重さ</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-orange-600">✅ 関税情報:</span>
                        <span className="text-gray-600">HTSコード、原産国、素材、関税率</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-600">✅ 市場調査:</span>
                        <span className="text-gray-600">プレミア率、人気度、競合数</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                      <span>🕒 処理時間: 約1-2分</span>
                      <span>💾 保存先: 全テーブル</span>
                      <span className="text-purple-600 font-semibold">✨ 最も効率的</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* 基本データのみ */}
              <button
                onClick={() => handleSelectDataType('basic')}
                className="w-full p-6 text-left border-2 border-blue-200 hover:border-blue-400 rounded-lg transition-all hover:shadow-lg bg-blue-50 dark:bg-blue-900/20"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl font-bold">
                    ⚡
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-2">基本データのみ（速い）</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      英語タイトル、サイズ、重さ
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>🕒 処理時間: 約30秒</span>
                      <span>📁 保存先: products_masterテーブル</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* 関税情報のみ */}
              <button
                onClick={() => handleSelectDataType('customs')}
                className="w-full p-6 text-left border-2 border-orange-200 hover:border-orange-400 rounded-lg transition-all hover:shadow-lg bg-orange-50 dark:bg-orange-900/20"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center text-xl font-bold">
                    📊
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-2">関税情報のみ</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      HTSコード、原産国、素材、関税率
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>🕒 処理時間: 約45秒</span>
                      <span>📁 保存先: products_master + customs_duties</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* 市場調査のみ */}
              <button
                onClick={() => handleSelectDataType('market')}
                className="w-full p-6 text-left border-2 border-green-200 hover:border-green-400 rounded-lg transition-all hover:shadow-lg bg-green-50 dark:bg-green-900/20"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold">
                    📊
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-2">市場調査のみ</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      プレミア率、コミュニティスコア、競合数、供給状況
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>🕒 処理時間: 約1分</span>
                      <span>📁 保存先: listing_data.market_research</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* ステップ1: プロンプト */}
          {step === 'prompt' && (
            <div className="space-y-4">
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
                      <p className="font-semibold">Gemini Webで実行</p>
                      <p className="text-xs text-gray-600">プロンプトを貼り付けて送信（無料）</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                      <p className="font-semibold">JSON出力をコピー</p>
                      <p className="text-xs text-gray-600">Geminiの回答全体を選択してコピー</p>
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
                    Gemini Webを開く
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Gemini用プロンプト
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={prompt || 'プロンプトを生成中...'}
                    className="w-full h-96 p-3 border rounded-lg font-mono text-xs resize-none bg-gray-50"
                  />
                  <Button
                    onClick={handleCopyPrompt}
                    className="absolute top-2 right-2"
                    size="sm"
                    disabled={!prompt}
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
                <Button onClick={handleNextToPaste} className="flex-1 bg-green-600 hover:bg-green-700" size="lg">
                  ✅ コピーしたら「次へ」
                </Button>
              </div>
            </div>
          )}

          {/* ステップ2: 貼り付け */}
          {step === 'paste' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold mb-2 text-lg">📋 Geminiの出力を貼り付け</h3>
                <div className="space-y-2 text-sm">
                  <p>✅ Geminiの回答全体をコピー（```json ... ``` を含む）</p>
                  <p>✅ 下のテキストエリアに貼り付け (Ctrl+V / Cmd+V)</p>
                  <p>✅ 「保存」ボタンをクリック</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                  <span>Geminiの出力（JSON）</span>
                  <span className="text-xs text-gray-500">
                    {pasteData.length > 0 ? `${pasteData.length}文字入力済み` : '待機中...'}
                  </span>
                </label>
                <textarea
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder='Geminiの回答をここに貼り付けてください...

例:
```json
[
  {
    "sku": "YAH-409933",
    "english_title": "Pokemon Card...",
    "hts_code": "9504.40.00.00",
    ...
  }
]
```'
                  className="w-full h-96 p-3 border-2 border-blue-300 rounded-lg font-mono text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  autoFocus
                />
              </div>

              {pasteData.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 text-sm">
                  ✅ JSONデータが検出されました。「保存」ボタンをクリックしてください。
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => setStep('prompt')} variant="outline">
                  ← 戻る
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="flex-1 bg-green-600 hover:bg-green-700" 
                  size="lg"
                  disabled={pasteData.length === 0}
                >
                  💾 Supabaseに保存
                </Button>
              </div>
            </div>
          )}

          {/* ステップ3: 保存中 */}
          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-16 h-16 text-purple-600 animate-spin mb-4" />
              <p className="text-lg font-semibold mb-2">Supabaseに保存中...</p>
              <p className="text-sm text-gray-600">しばらくお待ちください</p>
            </div>
          )}

          {/* ステップ4: 完了 */}
          {step === 'complete' && result && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2">保存完了！</h3>
                
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

                <p className="text-sm text-gray-600 mt-4">
                  画面が自動的に更新されました
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
