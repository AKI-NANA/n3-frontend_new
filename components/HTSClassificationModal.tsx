'use client'

import { useState } from 'react'
import { parseGeminiOutput, formatParseErrors, generateGeminiPrompt, SAMPLE_GEMINI_OUTPUT, type GeminiOutput } from '@/lib/utils/geminiParser'
import { HSKeywordDisplay } from '@/components/HSKeywordDisplay'

interface HTSClassificationModalProps {
  product: {
    id: string
    title: string
    category_name?: string
    brand_name?: string
  }
  onClose: () => void
  onSave: (updates: any) => Promise<void>
}

export function HTSClassificationModal({
  product,
  onClose,
  onSave
}: HTSClassificationModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [geminiText, setGeminiText] = useState('')
  const [parsedData, setParsedData] = useState<GeminiOutput | null>(null)
  const [htsCandidates, setHtsCandidates] = useState<any[]>([])
  const [selectedHTS, setSelectedHTS] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // サンプルデータを使用
  const handleUseSample = () => {
    setGeminiText(SAMPLE_GEMINI_OUTPUT)
    setError(null)
  }
  
  // プロンプトをコピー
  const handleCopyPrompt = async () => {
    const prompt = generateGeminiPrompt(
      product.title,
      product.category_name,
      product.brand_name
    )
    
    try {
      await navigator.clipboard.writeText(prompt)
      alert('✅ プロンプトをコピーしました！\nGemini Web UIに貼り付けてください。')
    } catch (err) {
      alert('コピーに失敗しました')
    }
  }
  
  // 自動パース
  const handleParse = () => {
    setError(null)
    const result = parseGeminiOutput(geminiText)
    
    if (result.success && result.data) {
      setParsedData(result.data)
      setStep(2)
      console.log('✅ パース成功:', result.data)
    } else {
      const errorMsg = result.errors 
        ? formatParseErrors(result.errors)
        : 'パースに失敗しました'
      setError(errorMsg)
      console.error('❌ パースエラー:', result.errors)
    }
  }
  
  // HTS検索実行
  const handleHTSLookup = async () => {
    if (!parsedData) {
      setError('まず「自動パース」を実行してください')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 HTS検索開始:', {
        title: product.title,
        keywords: parsedData.hts_keywords,
        material: parsedData.material_recommendation
      })
      
      const response = await fetch('/api/products/hts-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.title,  // ✅ title_ja → title
          category: product.category_name,
          brand: product.brand_name,
          hts_keywords: parsedData.hts_keywords,
          material_recommendation: parsedData.material_recommendation,
          origin_country_candidate: parsedData.origin_country_candidate,
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('✅ HTS検索結果:', data)
      
      if (data.success && data.data?.candidates) {
        setHtsCandidates(data.data.candidates)
        setStep(3)
        
        // 最高スコアの候補を自動選択
        if (data.data.candidates.length > 0) {
          setSelectedHTS(data.data.candidates[0])
        }
      } else {
        throw new Error(data.error || 'HTS検索に失敗しました')
      }
    } catch (err) {
      console.error('❌ HTS検索エラー:', err)
      setError(err instanceof Error ? err.message : 'HTS検索中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }
  
  // 保存
  const handleSave = async () => {
    if (!selectedHTS || !parsedData) {
      setError('HTSコードを選択してください')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('💾 保存開始:', {
        hts_code: selectedHTS.hts_code,
        score: selectedHTS.score,
        confidence: selectedHTS.confidence
      })
      
      await onSave({
        // Gemini出力
        hts_keywords: parsedData.hts_keywords,
        material: parsedData.material_recommendation,
        origin_country: parsedData.origin_country_candidate.split(',')[0]?.trim() || '',
        english_title: parsedData.rewritten_title,
        market_research_summary: parsedData.market_summary,
        market_score: parsedData.market_score,
        
        // HTS検索結果
        hts_code: selectedHTS.hts_code,
        hts_description: selectedHTS.description,
        hts_duty_rate: parseFloat(selectedHTS.general_rate?.replace('%', '') || '0'),
        hts_score: selectedHTS.score,
        hts_confidence: selectedHTS.confidence,
        hts_source: selectedHTS.source,
        origin_country_hint: selectedHTS.origin_country_hint || '',
      })
      
      alert('✅ 保存しました！HTSスコアがテーブルに反映されます。')
      onClose()
    } catch (err) {
      console.error('❌ 保存エラー:', err)
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }
  
  // 信頼度に応じた色
  const getConfidenceColor = (confidence: string) => {
    if (confidence === 'very_high') return 'text-green-600 bg-green-50'
    if (confidence === 'high') return 'text-blue-600 bg-blue-50'
    if (confidence === 'medium') return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">🎓 HTS分類</h2>
            <p className="text-sm text-gray-600 mt-1">
              {product.title.substring(0, 50)}...
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={loading}
          >
            ✕
          </button>
        </div>
        
        {/* ステップインジケーター */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 font-medium">貼り付け</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="ml-2 font-medium">確認</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="ml-2 font-medium">選択</span>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm whitespace-pre-line">{error}</p>
            </div>
          )}
          
          {/* ステップ1: Gemini出力を貼り付け */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">📋 ステップ1: Gemini出力を貼り付け</h3>
                <div className="space-x-2">
                  <button
                    onClick={handleCopyPrompt}
                    className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    📋 プロンプトをコピー
                  </button>
                  <button
                    onClick={handleUseSample}
                    className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    サンプル使用
                  </button>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>使い方:</strong><br/>
                  1. 「プロンプトをコピー」をクリック<br/>
                  2. Gemini Web UIに貼り付けて実行<br/>
                  3. 生成された結果を下のテキストエリアに貼り付け<br/>
                  4. 「自動パース」をクリック
                </p>
              </div>
              
              <textarea
                className="w-full border rounded-lg p-3 font-mono text-sm"
                rows={12}
                placeholder="HTS_KEYWORDS: trading cards, collectible, pokemon
MATERIAL_RECOMMENDATION: Paper
ORIGIN_COUNTRY_CANDIDATE: JP,CN
REWRITTEN_TITLE: Pokemon Card - Gengar VMAX
MARKET_SUMMARY: High demand collectible...
MARKET_SCORE: 85"
                value={geminiText}
                onChange={(e) => setGeminiText(e.target.value)}
              />
              
              <button 
                onClick={handleParse}
                disabled={!geminiText.trim()}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
              >
                自動パース →
              </button>
            </div>
          )}
          
          {/* ステップ2: パース結果 */}
          {step === 2 && parsedData && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">✅ ステップ2: パース結果を確認</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">HTSキーワード *</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2 mt-1"
                    value={parsedData.hts_keywords}
                    onChange={(e) => setParsedData({...parsedData, hts_keywords: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">推奨素材</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2 mt-1"
                    value={parsedData.material_recommendation}
                    onChange={(e) => setParsedData({...parsedData, material_recommendation: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">原産国候補</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2 mt-1"
                    placeholder="JP,CN,US"
                    value={parsedData.origin_country_candidate}
                    onChange={(e) => setParsedData({...parsedData, origin_country_candidate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">市場スコア</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full border rounded-lg p-2 mt-1"
                    value={parsedData.market_score}
                    onChange={(e) => setParsedData({...parsedData, market_score: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">英語タイトル（VERO対応）</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2 mt-1"
                    value={parsedData.rewritten_title}
                    onChange={(e) => setParsedData({...parsedData, rewritten_title: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">市場調査サマリー</label>
                  <textarea
                    className="w-full border rounded-lg p-2 mt-1"
                    rows={3}
                    value={parsedData.market_summary}
                    onChange={(e) => setParsedData({...parsedData, market_summary: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button 
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ← 戻る
                </button>
                <button 
                  onClick={handleHTSLookup}
                  disabled={loading || !parsedData.hts_keywords}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
                >
                  {loading ? '検索中...' : 'HTS検索実行 →'}
                </button>
              </div>
            </div>
          )}
          
          {/* ステップ3: HTS候補リスト */}
          {step === 3 && htsCandidates.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">🎯 ステップ3: HTS候補を選択</h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {htsCandidates.map((candidate, index) => (
                  <div
                    key={index}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedHTS?.hts_code === candidate.hts_code 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedHTS(candidate)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg">{candidate.hts_code}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(candidate.confidence)}`}>
                            {candidate.confidence}
                          </span>
                        </div>
                        <p className="text-sm mt-1 text-gray-700">{candidate.description}</p>
                        {candidate.origin_country_hint && (
                          <p className="text-xs text-gray-500 mt-1">
                            💡 原産国候補: {candidate.origin_country_hint}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-blue-600">{candidate.score}点</div>
                        <div className="text-xs text-gray-500">関税率: {candidate.general_rate || '0%'}</div>
                        <div className="text-xs text-gray-500 mt-1">ソース: {candidate.source}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 選択されたHTSコードの関連キーワード */}
              {selectedHTS && (
                <HSKeywordDisplay
                  htsCode={selectedHTS.hts_code}
                  className="mt-4"
                />
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ← 戻る
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !selectedHTS}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-semibold"
                >
                  {loading ? '保存中...' : '✅ 保存して学習'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
