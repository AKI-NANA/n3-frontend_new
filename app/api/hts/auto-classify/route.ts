// app/api/hts/auto-classify/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { upsertHTSClassification } from '@/lib/supabase/hts-classification'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, force = false } = body

    if (!productId) {
      return NextResponse.json({ error: 'productIdが必要です' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1️⃣ 商品データを取得
    const { data: product, error: productError } = await supabase
      .from('products_master')
      .select('id, title, title_en, category_name, ebay_category_id, scraped_data')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ 
        error: '商品が見つかりません',
        details: productError?.message 
      }, { status: 404 })
    }

    // 既存のHTS分類を確認
    const { data: existingHTS } = await supabase
      .from('product_hts_classification')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .single()

    if (existingHTS && !force) {
      return NextResponse.json({
        success: false,
        error: 'すでにHTS分類が存在します',
        existing: existingHTS,
        message: 'force=trueで上書き可能'
      }, { status: 409 })
    }

    // 2️⃣ キーワード抽出
    const englishTitle = product.title_en || product.title || ''
    const keywords = extractKeywords(englishTitle, product.category_name)

    console.log('🔍 HTS自動分類開始:', {
      productId,
      englishTitle: englishTitle.substring(0, 50),
      keywords
    })

    // 3️⃣ HTSコードを検索
    const htsResults = await searchHTSCodes(supabase, keywords, englishTitle)

    if (htsResults.length === 0) {
      return NextResponse.json({
        success: false,
        error: '適切なHTSコードが見つかりませんでした',
        keywords,
        suggestions: [
          '商品タイトルを英語で入力してください',
          'より具体的な商品カテゴリを設定してください'
        ]
      }, { status: 404 })
    }

    // 4️⃣ 最適なHTSコードを選定
    const bestMatch = selectBestHTS(htsResults, keywords, product)

    console.log('✅ HTS自動選定完了:', {
      htsCode: bestMatch.hts_code,
      confidence: bestMatch.confidence_score,
      description: bestMatch.description?.substring(0, 50)
    })

    // 5️⃣ データベースに保存
    const savedHTS = await upsertHTSClassification(productId, {
      hts_code: bestMatch.hts_code,
      hts_chapter_code: bestMatch.chapter_code,
      hts_heading_code: bestMatch.heading_code,
      hts_subheading_code: bestMatch.subheading_code,
      hts_description: bestMatch.description,
      general_rate: bestMatch.general_rate,
      special_rate: bestMatch.special_rate,
      confidence_score: bestMatch.confidence_score,
      classification_method: 'auto',
      classified_by: 'system',
      analysis_data: {
        keywords,
        candidates: htsResults.slice(0, 5).map(r => ({
          hts_code: r.hts_number,
          description: r.description?.substring(0, 100),
          score: r.score || 0
        })),
        search_method: 'keyword_matching_v2',
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      classification: savedHTS,
      analysis: {
        keywords,
        candidatesCount: htsResults.length,
        topCandidates: htsResults.slice(0, 3).map(r => ({
          code: r.hts_number,
          description: r.description?.substring(0, 80),
          score: r.score || 0
        })),
        method: 'auto'
      }
    })

  } catch (error: any) {
    console.error('❌ HTS自動分類エラー:', error)
    return NextResponse.json({
      error: 'HTS自動分類に失敗しました',
      message: error.message,
      details: error
    }, { status: 500 })
  }
}

/**
 * 商品タイトルとカテゴリからキーワードを抽出（改善版）
 */
function extractKeywords(title: string, categoryName?: string): string[] {
  const keywords: string[] = []

  // タイトルから主要キーワードを抽出
  const titleWords = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // ハイフンは残す
    .split(/\s+/)
    .filter(word => word.length > 2) // 3文字以上
    .filter(word => !STOP_WORDS.includes(word)) // ストップワード除外

  keywords.push(...titleWords)

  // カテゴリ名からもキーワード抽出
  if (categoryName && categoryName !== '不明 (Unknown)' && categoryName !== 'null') {
    const categoryWords = categoryName
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !STOP_WORDS.includes(word))
    
    keywords.push(...categoryWords)
  }

  // 重複削除
  return Array.from(new Set(keywords))
}

// ストップワード（除外する一般的な単語）
const STOP_WORDS = [
  'the', 'and', 'for', 'with', 'new', 'used', 'vintage', 'rare',
  'limited', 'edition', 'official', 'authentic', 'original', 'set',
  'excellent', 'condition', 'tested', 'working', 'good', 'great',
  'brand', 'item', 'product', 'sealed', 'unopened', 'unknown'
]

/**
 * HTSコードをキーワードで検索（改善版）
 */
async function searchHTSCodes(
  supabase: any,
  keywords: string[],
  fullTitle: string
) {
  const results: any[] = []
  const seenCodes = new Set<string>()

  // 重要キーワード（製品タイプ）を優先
  const priorityKeywords = keywords.filter(k => 
    k.length > 4 || ['lens', 'camera', 'nikon', 'canon', 'sony', 'dji', 'drone'].includes(k)
  )

  // 優先キーワードで検索
  for (const keyword of priorityKeywords.slice(0, 3)) {
    const { data, error } = await supabase
      .from('hts_codes_details')
      .select('hts_number, description, chapter_code, heading_code, subheading_code, general_rate, special_rate')
      .ilike('description', `%${keyword}%`)
      .limit(30)

    if (!error && data) {
      for (const item of data) {
        if (!seenCodes.has(item.hts_number)) {
          results.push(item)
          seenCodes.add(item.hts_number)
        }
      }
    }
  }

  // その他のキーワードで補完
  for (const keyword of keywords.slice(0, 5)) {
    if (priorityKeywords.includes(keyword)) continue
    
    const { data, error } = await supabase
      .from('hts_codes_details')
      .select('hts_number, description, chapter_code, heading_code, subheading_code, general_rate, special_rate')
      .ilike('description', `%${keyword}%`)
      .limit(20)

    if (!error && data) {
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
 * 最適なHTSコードを選定（改善版）
 */
function selectBestHTS(candidates: any[], keywords: string[], product: any) {
  const englishTitle = (product.title_en || product.title || '').toLowerCase()
  
  // スコアリング
  const scored = candidates.map(candidate => {
    let score = 0
    const description = (candidate.description || '').toLowerCase()

    // 1. 重要キーワードの完全一致（各+25点）
    const importantWords = ['camera', 'lens', 'drone', 'electronic', 'optical', 'photographic']
    for (const word of importantWords) {
      if (keywords.includes(word) && description.includes(word)) {
        score += 25
      }
    }

    // 2. キーワードマッチング（各+10点）
    for (const keyword of keywords) {
      if (description.includes(keyword.toLowerCase())) {
        score += 10
      }
    }

    // 3. タイトルの主要単語マッチ（+15点）
    const mainWords = englishTitle.split(/\s+/).filter(w => w.length > 4)
    for (const word of mainWords.slice(0, 3)) {
      if (description.includes(word)) {
        score += 15
      }
    }

    // 4. Chapter優先度
    // Chapter 90 (光学機器) にボーナス（カメラ・レンズの場合）
    if (candidate.chapter_code === '90' && (
      englishTitle.includes('camera') || 
      englishTitle.includes('lens') ||
      englishTitle.includes('optical')
    )) {
      score += 30
    }

    // Chapter 85 (電気機器) にボーナス（電子機器の場合）
    if (candidate.chapter_code === '85' && (
      englishTitle.includes('electronic') ||
      englishTitle.includes('playstation') ||
      englishTitle.includes('console')
    )) {
      score += 30
    }

    // Chapter 95 (玩具) にボーナス（ゲーム・トイの場合）
    if (candidate.chapter_code === '95' && (
      englishTitle.includes('game') ||
      englishTitle.includes('toy') ||
      englishTitle.includes('card')
    )) {
      score += 30
    }

    // 5. 長すぎるdescriptionはペナルティ
    if (description.length > 150) {
      score -= 5
    }

    // 6. あまりに一般的なdescriptionはペナルティ
    if (description.includes('other') && description.length < 50) {
      score -= 10
    }

    return {
      ...candidate,
      score: Math.min(score, 100) // 最大100点
    }
  })

  // スコア順にソート
  scored.sort((a, b) => b.score - a.score)

  const best = scored[0] || scored[0]

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
