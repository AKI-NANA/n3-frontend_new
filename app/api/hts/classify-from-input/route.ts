import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ストップワード（除外する一般的な単語）
const STOP_WORDS = [
  'the', 'and', 'for', 'with', 'new', 'used', 'vintage', 'rare',
  'limited', 'edition', 'official', 'authentic', 'original', 'set',
  'excellent', 'condition', 'tested', 'working', 'good', 'great',
  'brand', 'item', 'product', 'sealed', 'unopened', 'unknown'
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { titleKeywords = '', descriptionKeywords = '', ebayCategory = '' } = body

    if (!titleKeywords && !descriptionKeywords && !ebayCategory) {
      return NextResponse.json(
        { error: 'タイトル、詳細、またはカテゴリーのいずれかを入力してください' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1️⃣ キーワード抽出
    const allKeywords = [
      ...extractKeywords(titleKeywords),
      ...extractKeywords(descriptionKeywords)
    ]

    console.log('🔍 抽出されたキーワード:', allKeywords)

    // 2️⃣ カテゴリーマッピング確認（eBayカテゴリーが指定されている場合）
    let categoryHints: string[] = []
    if (ebayCategory) {
      const { data: categoryMapping } = await supabase
        .from('ebay_category_hs_mapping')
        .select('hs_code, confidence')
        .ilike('ebay_category_name', `%${ebayCategory}%`)
        .order('confidence', { ascending: false })
        .limit(3)

      if (categoryMapping && categoryMapping.length > 0) {
        categoryHints = categoryMapping.map(m => m.hs_code.substring(0, 2)) // Chapter抽出
        console.log('📂 カテゴリーヒント (Chapter):', categoryHints)
      }
    }

    // 3️⃣ HTSコード検索
    const results = await searchHTSCodes(supabase, allKeywords, categoryHints)

    if (results.length === 0) {
      return NextResponse.json({
        success: false,
        error: '適切なHTSコードが見つかりませんでした',
        keywords: allKeywords,
        categoryHints,
        suggestions: [
          'より具体的なキーワードを入力してください',
          '商品の材質や用途を含めてください',
          'カテゴリーを指定してください'
        ]
      }, { status: 404 })
    }

    // 4️⃣ スコアリング
    const scored = scoreResults(results, allKeywords, titleKeywords, categoryHints)

    // 5️⃣ トップ10を返す
    const top10 = scored.slice(0, 10)

    return NextResponse.json({
      success: true,
      results: top10,
      totalCandidates: scored.length,
      keywords: allKeywords,
      categoryHints,
      searchMethod: categoryHints.length > 0 ? 'category + keyword' : 'keyword only'
    })

  } catch (error: any) {
    console.error('❌ HTS分類エラー:', error)
    return NextResponse.json(
      { error: 'HTS分類に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * キーワード抽出
 */
function extractKeywords(text: string): string[] {
  if (!text) return []

  const keywords = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // ハイフンは残す
    .split(/\s+/)
    .filter(word => word.length > 2) // 3文字以上
    .filter(word => !STOP_WORDS.includes(word)) // ストップワード除外

  // 重複削除
  return Array.from(new Set(keywords))
}

/**
 * HTSコード検索
 */
async function searchHTSCodes(
  supabase: any,
  keywords: string[],
  categoryHints: string[]
) {
  const results: any[] = []
  const seenCodes = new Set<string>()

  // カテゴリーヒントがある場合は優先検索
  if (categoryHints.length > 0) {
    for (const chapter of categoryHints) {
      for (const keyword of keywords.slice(0, 5)) {
        const { data } = await supabase
          .from('hts_codes_details')
          .select('*')
          .eq('chapter_code', chapter)
          .ilike('description', `%${keyword}%`)
          .limit(20)

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
  }

  // 全体からキーワード検索
  for (const keyword of keywords.slice(0, 8)) {
    const { data } = await supabase
      .from('hts_codes_details')
      .select('*')
      .ilike('description', `%${keyword}%`)
      .limit(30)

    if (data) {
      for (const item of data) {
        if (!seenCodes.has(item.hts_number)) {
          results.push(item)
          seenCodes.add(item.hts_number)
        }
      }
    }
  }

  return results
}

/**
 * スコアリング
 */
function scoreResults(
  candidates: any[],
  keywords: string[],
  titleText: string,
  categoryHints: string[]
) {
  const titleLower = titleText.toLowerCase()

  return candidates.map(candidate => {
    let score = 0
    const description = (candidate.description || '').toLowerCase()

    // 1. キーワードマッチング（各+10点）
    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        score += 10
      }
    }

    // 2. タイトルの主要単語マッチ（+15点）
    const mainWords = titleLower.split(/\s+/).filter(w => w.length > 4)
    for (const word of mainWords.slice(0, 3)) {
      if (description.includes(word)) {
        score += 15
      }
    }

    // 3. カテゴリーヒントマッチ（+20点）
    if (categoryHints.includes(candidate.chapter_code)) {
      score += 20
    }

    // 4. 短すぎる説明はペナルティ
    if (description.length < 30) {
      score -= 5
    }

    // 5. "other" が含まれる場合はペナルティ
    if (description.includes('other') && description.length < 50) {
      score -= 10
    }

    return {
      hts_number: candidate.hts_number,
      description: candidate.description,
      chapter_code: candidate.chapter_code,
      heading_code: candidate.heading_code,
      subheading_code: candidate.subheading_code,
      general_rate: candidate.general_rate || 'Free',
      special_rate: candidate.special_rate || 'Free',
      score: Math.max(0, Math.min(score, 100)), // 0-100点
      confidence: Math.round((Math.max(0, Math.min(score, 100)) / 100) * 100) // 信頼度%
    }
  }).sort((a, b) => b.score - a.score)
}
