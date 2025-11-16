// app/tools/editing/components/AIMarketResearchModal.tsx
'use client'

import { useState } from 'react'
import { X, Copy, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateAIAnalysisPrompt } from '../lib/aiExportPrompt'

interface Product {
  id: string
  sku: string
  title: string
  title_en?: string
  price_jpy: number
  msrp?: number
  release_date?: string
  category_name?: string
  category_id?: string
  length_cm?: number
  width_cm?: number
  height_cm?: number
  weight_g?: number
  condition?: string
  image_url?: string
  brand?: string
}

interface AIMarketResearchModalProps {
  products: Product[]
  onClose: () => void
  onComplete?: () => void
}

export function AIMarketResearchModal({
  products,
  onClose,
  onComplete
}: AIMarketResearchModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [copied, setCopied] = useState(false)
  const [prompt, setPrompt] = useState('')

  // ステップ2でプロンプト生成
  const handleGeneratePrompt = () => {
    const generatedPrompt = generateAIAnalysisPrompt(products)
    setPrompt(generatedPrompt)
    setStep(2)
  }

  // プロンプトをコピー
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('コピー失敗:', err)
      alert('コピーに失敗しました')
    }
  }

  // Claude Webを開く
  const handleOpenClaudeWeb = () => {
    window.open('https://claude.ai', '_blank')
    setStep(3)
  }

  // 完了
  const handleComplete = () => {
    if (onComplete) onComplete()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <h2 className="text-2xl font-bold">AI商品データ強化</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-purple-100 text-sm">
            市場調査データ + HTSコード + 英語タイトル（VERO対応）を一括取得
          </p>
        </div>

        {/* ステップインジケーター */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex">
            {[
              { num: 1, label: 'データ確認' },
              { num: 2, label: 'プロンプト' },
              { num: 3, label: '処理実行' },
              { num: 4, label: '完了' }
            ].map((s) => (
              <div
                key={s.num}
                className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors ${
                  step >= s.num
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400 font-semibold'
                    : 'border-transparent text-gray-400'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step >= s.num ? 'bg-purple-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {s.num}
                  </span>
                  <span className="text-sm hidden sm:inline">{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ステップ1: データ確認 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      処理時間の目安
                    </h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• 1-10件: 約2-5分</li>
                      <li>• 11-50件: 約5-15分</li>
                      <li>• 51-100件: 約15-30分</li>
                      <li>• 100件以上: 30分以上かかる場合があります</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    📦 選択された商品（{products.length}件）
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto">
                  {products.map((p) => (
                    <div key={p.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center gap-3">
                        {p.image_url && (
                          <img
                            src={p.image_url}
                            alt={p.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {p.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span>SKU: {p.sku}</span>
                            <span>•</span>
                            <span>¥{p.price_jpy?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2">
                  <span>📋</span> 取得されるデータ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                  <div>✅ 英語タイトル（VERO対応2パターン）</div>
                  <div>✅ HTSコード・原産国・関税率</div>
                  <div>✅ プレミア率（国内相場調査）</div>
                  <div>✅ 国内流通量</div>
                  <div>✅ コミュニティスコア</div>
                  <div>✅ 廃盤・生産状況</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleGeneratePrompt}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                >
                  プロンプト生成
                </Button>
              </div>
            </div>
          )}

          {/* ステップ2: プロンプト表示 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      プロンプト生成完了
                    </h3>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      以下のプロンプトをコピーして、Claude Desktop または Claude Web に貼り付けてください
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                  {prompt}
                </pre>
                <Button
                  onClick={handleCopy}
                  className="absolute top-2 right-2"
                  size="sm"
                  variant={copied ? 'default' : 'secondary'}
                >
                  {copied ? (
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

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1"
                >
                  戻る
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                >
                  次へ
                </Button>
              </div>
            </div>
          )}

          {/* ステップ3: 処理実行 */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="inline-block animate-pulse mb-4">
                  <span className="text-6xl">🤖</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Claude で処理中...
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  各ステップで ✅ チェックマークが表示されます
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                  📝 処理手順
                </h3>
                <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <span>Claude Desktop にプロンプトを貼り付け</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <span>Enter キーを押して実行</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span>
                    <span>各ステップの ✅ チェックマークを確認</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">4.</span>
                    <span>Claude が自動でSupabaseにデータを保存</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">5.</span>
                    <span>「✅ Supabase更新完了」のメッセージを確認</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">6.</span>
                    <span>このモーダルで「処理完了」ボタンをクリック</span>
                  </li>
                </ol>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  ⚠️ 重要な注意事項
                </h3>
                <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                  <li>• 原産国は必ず実データで確認（推測禁止）</li>
                  <li>• HTSコードの誤りは赤字リスクあり</li>
                  <li>• 不明なデータは "UNKNOWN" と記載</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1"
                >
                  戻る
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  処理完了
                </Button>
              </div>
            </div>
          )}

          {/* ステップ4: 完了 */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="inline-block mb-4">
                  <span className="text-6xl">✅</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  AI強化処理完了！
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {products.length}件の商品データが更新されました
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  📊 次のステップ
                </h3>
                <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                  <li className="flex items-start gap-2">
                    <span>✅</span>
                    <span>データが自動的にデータベースに保存されました</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🔄</span>
                    <span>「データ読み込み」ボタンで最新データを確認してください</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>📈</span>
                    <span>スコア計算が自動的に更新されます</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleComplete}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
              >
                閉じる
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
