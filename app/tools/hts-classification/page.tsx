'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { upsertHTSClassification, getActiveHTSClassification } from '@/lib/supabase/hts-classification'

const supabase = createClient()

interface Product {
  id: number
  title: string | null
  title_en: string | null
  category_name: string | null
  scraped_data: any
  listing_data: any
}

interface HTSResult {
  hts_code: string
  hts_description: string
  confidence_score: number
  chapter_code: string
}

export default function HTSClassificationPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [classifying, setClassifying] = useState<number | null>(null)
  const [results, setResults] = useState<Record<number, HTSResult>>({})

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products_master')
        .select('id, title, title_en, category_name, scraped_data, listing_data')
        .order('id', { ascending: false })
        .limit(20)

      if (error) throw error
      setProducts(data || [])

      // 既存のHTS分類を取得
      const existingHTS: Record<number, HTSResult> = {}
      for (const product of (data || [])) {
        const hts = await getActiveHTSClassification(product.id)
        if (hts) {
          existingHTS[product.id] = {
            hts_code: hts.hts_code,
            hts_description: hts.hts_description || '',
            confidence_score: hts.confidence_score,
            chapter_code: hts.hts_chapter_code
          }
        }
      }
      setResults(existingHTS)
    } catch (error) {
      console.error('商品読み込みエラー:', error)
      alert('商品の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const classifyHTS = async (productId: number) => {
    setClassifying(productId)
    try {
      const product = products.find(p => p.id === productId)
      if (!product) return

      const titleToUse = product.title_en || product.title
      if (!titleToUse) {
        alert('商品タイトルが見つかりません')
        return
      }

      console.log('🔍 HTS選定開始:', titleToUse)

      // 1. キーワード抽出
      const keywords = extractKeywords(titleToUse, product.category_name)
      console.log('🔑 キーワード:', keywords)

      if (keywords.length === 0) {
        alert('キーワードを抽出できませんでした')
        return
      }

      // 2. Chapter特定
      const chapter = await determineChapter(product.category_name, keywords, titleToUse)
      console.log('📂 Chapter:', chapter)

      // 3. HTS検索
      const htsCandidates = await searchHTSCodes(chapter, keywords)
      console.log('📊 候補数:', htsCandidates.length)

      if (htsCandidates.length === 0) {
        alert('適切なHTSコードが見つかりませんでした')
        return
      }

      // 4. 最適選定
      const best = selectBestHTS(htsCandidates, keywords, product)
      console.log('✅ 選定結果:', best)

      // 5. 保存
      await upsertHTSClassification(productId, {
        hts_code: best.hts_code,
        hts_chapter_code: best.chapter_code,
        hts_heading_code: best.heading_code,
        hts_subheading_code: best.subheading_code,
        hts_description: best.description,
        general_rate: best.general_rate,
        special_rate: best.special_rate,
        confidence_score: best.confidence_score,
        classification_method: 'auto',
        classified_by: 'system',
        analysis_data: {
          keywords,
          chapter,
          timestamp: new Date().toISOString()
        }
      })

      // 6. UI更新
      setResults(prev => ({
        ...prev,
        [productId]: {
          hts_code: best.hts_code,
          hts_description: best.description,
          confidence_score: best.confidence_score,
          chapter_code: best.chapter_code
        }
      }))

      alert(`HTS選定完了: ${best.hts_code} (信頼度: ${best.confidence_score})`)
    } catch (error) {
      console.error('HTS選定エラー:', error)
      alert('HTS選定に失敗しました: ' + (error as Error).message)
    } finally {
      setClassifying(null)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">HTS分類ツール（新規）</h1>
        <p className="text-sm text-gray-600 mt-2">
          ※ これは既存の編集ツールとは別の新しいツールです
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border text-left">ID</th>
                <th className="px-4 py-2 border text-left">商品名</th>
                <th className="px-4 py-2 border text-left">カテゴリ</th>
                <th className="px-4 py-2 border text-left">HTSコード</th>
                <th className="px-4 py-2 border text-left">信頼度</th>
                <th className="px-4 py-2 border text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => {
                const result = results[product.id]
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{product.id}</td>
                    <td className="px-4 py-2 border">
                      <div className="max-w-md truncate">
                        {product.title_en || product.title || '(タイトルなし)'}
                      </div>
                    </td>
                    <td className="px-4 py-2 border">{product.category_name || '-'}</td>
                    <td className="px-4 py-2 border">
                      {result ? (
                        <div>
                          <div className="font-mono text-sm">{result.hts_code}</div>
                          <div className="text-xs text-gray-500">Ch.{result.chapter_code}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">未選定</span>
                      )}
                    </td>
                    <td className="px-4 py-2 border">
                      {result && (
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          result.confidence_score >= 70 ? 'bg-green-100 text-green-800' :
                          result.confidence_score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.confidence_score}点
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 border">
                      <button
                        onClick={() => classifyHTS(product.id)}
                        disabled={classifying === product.id}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 text-sm"
                      >
                        {classifying === product.id ? '選定中...' : 'HTS選定'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ===== HTS選定ロジック =====

function extractKeywords(title: string | null, categoryName: string | null | undefined): string[] {
  if (!title) return []
  
  const keywords: string[] = []
  const titleWords = title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1)
    .filter(word => !['the', 'and', 'for', 'with', 'new', 'used', 'excellent', 'condition', 'tested'].includes(word))

  keywords.push(...titleWords)

  // 製品タイプ推測
  const titleLower = title.toLowerCase()
  if (titleLower.includes('mm') || titleLower.includes('lens')) keywords.push('lens', 'optical')
  if (titleLower.includes('camera')) keywords.push('camera', 'photographic')
  if (titleLower.includes('drone') || titleLower.includes('dji')) keywords.push('drone', 'aircraft')
  if (titleLower.includes('playstation') || titleLower.includes('console')) keywords.push('video', 'game', 'console')

  return Array.from(new Set(keywords))
}

async function determineChapter(categoryName: string | null, keywords: string[], title: string) {
  // カテゴリマッピング
  if (categoryName && categoryName !== '不明 (Unknown)') {
    const { data } = await supabase
      .from('category_hts_mapping')
      .select('hts_chapter_code, confidence')
      .ilike('category_name', `%${categoryName}%`)
      .order('priority', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      return data[0].hts_chapter_code
    }
  }

  // キーワードマッチング
  const { data: allMappings } = await supabase
    .from('category_hts_mapping')
    .select('hts_chapter_code, category_keywords')

  if (allMappings) {
    let bestMatch = { chapter: '', score: 0 }
    for (const mapping of allMappings) {
      let score = 0
      const mappingKeywords = mapping.category_keywords || []
      for (const keyword of keywords) {
        if (mappingKeywords.includes(keyword.toLowerCase())) {
          score += 20
        }
      }
      if (score > bestMatch.score) {
        bestMatch = { chapter: mapping.hts_chapter_code, score }
      }
    }
    if (bestMatch.score > 20) {
      return bestMatch.chapter
    }
  }

  return '90' // デフォルト
}

async function searchHTSCodes(chapter: string, keywords: string[]) {
  const results: any[] = []
  const seenCodes = new Set<string>()

  const priorityKeywords = keywords.filter(k => 
    ['lens', 'camera', 'optical', 'photographic', 'drone', 'aircraft', 'video', 'game', 'console', 'electronic'].includes(k)
  )

  for (const keyword of priorityKeywords) {
    const { data } = await supabase
      .from('hts_codes_details')
      .select('*')
      .eq('chapter_code', chapter)
      .ilike('description', `%${keyword}%`)
      .limit(50)

    if (data) {
      for (const item of data) {
        if (!seenCodes.has(item.hts_number)) {
          results.push(item)
          seenCodes.add(item.hts_number)
        }
      }
    }
  }

  // 全体検索フォールバック
  if (results.length === 0) {
    for (const keyword of priorityKeywords) {
      const { data } = await supabase
        .from('hts_codes_details')
        .select('*')
        .ilike('description', `%${keyword}%`)
        .limit(50)

      if (data) {
        for (const item of data) {
          if (!seenCodes.has(item.hts_number)) {
            results.push(item)
            seenCodes.add(item.hts_number)
          }
        }
      }
    }
  }

  return results
}

function selectBestHTS(candidates: any[], keywords: string[], product: any) {
  const englishTitle = (product.title_en || product.title || '').toLowerCase()
  
  const scored = candidates.map(candidate => {
    let score = 0
    const description = (candidate.description || '').toLowerCase()
    const htsNumber = candidate.hts_number || ''
    const codeLength = htsNumber.replace(/\./g, '').length

    // 階層レベル
    if (codeLength >= 10) score += 10

    // Subheading一致
    if (htsNumber.startsWith('9002.11')) score += 40
    else if (htsNumber.startsWith('9002.19')) score += 30
    else if (htsNumber.startsWith('9002')) score += 20

    // "Other"の評価
    if (description === 'other' && codeLength >= 10) score += 25

    // 除外ワード
    const excludeWords = ['projection', 'projector', 'closed-circuit', 'cctv', 'surveillance', 'prism', 'mirror', 'filter']
    for (const word of excludeWords) {
      if (description.includes(word) && !englishTitle.includes(word)) score -= 30
    }

    // キーワードマッチ
    for (const keyword of keywords) {
      if (description.includes(keyword.toLowerCase())) score += 8
    }

    // ヘッダー行除外
    if (description.endsWith(':') || description.length < 10) score -= 50

    return { ...candidate, score: Math.max(0, Math.min(score, 100)) }
  })

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]

  return {
    hts_code: best.hts_number,
    chapter_code: best.chapter_code,
    heading_code: best.heading_code,
    subheading_code: best.subheading_code,
    description: best.description,
    general_rate: best.general_rate || 'Free',
    special_rate: best.special_rate || 'Free',
    confidence_score: best.score
  }
}
