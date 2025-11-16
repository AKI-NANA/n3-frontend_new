// app/api/hts/estimate/route.ts (完全版)
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { 
      productId, 
      title, 
      englishTitle,
      categoryName, 
      categoryId, 
      material, 
      description,
      ebayApiData 
    } = await request.json()
    
    const supabase = await createClient()
    
    console.log('🔍 HTS推定開始:', { productId, englishTitle, categoryName })
    
    // ============================================
    // Step 1: カテゴリー直接マッピング（最優先）
    // ============================================
    if (categoryName || ebayApiData?.category_name) {
      const category = categoryName || ebayApiData?.category_name
      const categoryResult = await searchByCategory(supabase, category)
      
      if (categoryResult) {
      console.log('✅ カテゴリーで確定:', categoryResult.hts_number)
      
      // 🔥 10桁の詳細コードを取得
      const fullCodeResult = await getFullHTSCode(supabase, categoryResult.hts_number)
      
      return NextResponse.json({
      success: true,
      htsCode: fullCodeResult.hts_number,
      htsDescription: fullCodeResult.description,
        dutyRate: fullCodeResult.general_rate || categoryResult.general_rate || 'Free',
          confidence: fullCodeResult.confidence || categoryResult.confidence || 'high',
        matchedCategory: category,
        source: 'category_mapping',
        notes: categoryResult.notes,
        hierarchy: {
          chapter: fullCodeResult.chapter_code,
          heading: fullCodeResult.heading_code,
          subheading: fullCodeResult.subheading_code
        }
      })
    }
    }
    
    // ============================================
    // Step 2: 🎯 商品タイプ優先検出（新規）
    // ============================================
    const productTitle = englishTitle || title || ''
    const detectedType = detectProductType(productTitle)
    
    if (detectedType) {
      console.log(`🎯 Chapter絞り込み: ${detectedType.chapter} (${detectedType.name})`)
      
      // 検出されたChapter内で最適なHTSコードを検索
      const chapterResults = await searchHTSByChapter(supabase, detectedType.chapter, productTitle)
      
      if (chapterResults.length > 0) {
        const bestMatch = chapterResults[0]
        const fullCodeResult = await getFullHTSCode(supabase, bestMatch.hts_number)
        
        console.log(`✅ Chapter絞り込みで発見: ${fullCodeResult.hts_number}`)
        
        return NextResponse.json({
          success: true,
          htsCode: fullCodeResult.hts_number,
          htsDescription: fullCodeResult.description,
          dutyRate: fullCodeResult.general_rate || 'Free',
          confidence: 'high',
          matchedProductType: detectedType.name,
          source: 'product_type_detection',
          hierarchy: {
            chapter: fullCodeResult.chapter_code,
            heading: fullCodeResult.heading_code,
            subheading: fullCodeResult.subheading_code
          }
        })
      }
    }
    
    // ============================================
    // Step 3: キーワード抽出
    // ============================================
    const keywords = extractKeywordsFromProduct({
      englishTitle,
      title,
      categoryName: categoryName || ebayApiData?.category_name,
      material,
      description,
      ebayApiData
    })
    
    console.log('📝 抽出キーワード:', keywords.slice(0, 10))
    
    if (keywords.length === 0) {
      return NextResponse.json({
        success: true,
        htsCode: '要確認',
        dutyRate: null,
        confidence: 'uncertain',
        message: 'キーワードを抽出できませんでした'
      })
    }
    
    // ============================================
    // Step 3: キーワードマッピングテーブル検索
    // ============================================
    const mappingResults = await searchKeywordMapping(supabase, keywords)
    
    if (mappingResults.length > 0) {
      const bestMatch = mappingResults[0]
      console.log('✅ キーワードマッピングで発見:', bestMatch.hts_number)
      
      // 🔥 10桁の詳細コードを取得
      const fullCodeResult = await getFullHTSCode(supabase, bestMatch.hts_number)
      
      return NextResponse.json({
        success: true,
        htsCode: fullCodeResult.hts_number,
        htsDescription: fullCodeResult.description,
        dutyRate: fullCodeResult.general_rate || bestMatch.duty_rate || 'Free',
        confidence: bestMatch.confidence_score >= 0.9 ? 'high' : 'medium',
        matchedKeywords: [bestMatch.keyword],
        source: 'keyword_mapping',
        notes: bestMatch.notes,
        hierarchy: {
          chapter: fullCodeResult.chapter_code,
          heading: fullCodeResult.heading_code,
          subheading: fullCodeResult.subheading_code
        }
      })
    }
    
    // ============================================
    // Step 4: HTSマスターテーブル全文検索
    // ============================================
    const searchResults = await searchHTSByKeywords(supabase, keywords)
    
    if (searchResults.length === 0) {
      return NextResponse.json({
        success: true,
        htsCode: '要確認',
        dutyRate: null,
        confidence: 'uncertain',
        message: 'HTSコードが見つかりませんでした',
        searchedKeywords: keywords.slice(0, 5)
      })
    }
    
    // 最適なHTSコードを選択
    const bestMatch = selectBestMatch(searchResults, keywords)
    const confidence = calculateConfidence(bestMatch.score, searchResults.length)
    
    // 🔥 10桁の詳細コードを取得
    const fullCodeResult = await getFullHTSCode(supabase, bestMatch.hts_number)
    
    console.log('✅ 全文検索で発見:', fullCodeResult.hts_number, '(confidence:', confidence, ')')
    
    return NextResponse.json({
      success: true,
      htsCode: fullCodeResult.hts_number,
      htsDescription: fullCodeResult.description,
      dutyRate: fullCodeResult.general_rate || bestMatch.general_rate || 'Free',
      confidence,
      matchedKeywords: bestMatch.matchedKeywords.slice(0, 3),
      chapterCode: fullCodeResult.chapter_code,
      headingCode: fullCodeResult.heading_code,
      subheadingCode: fullCodeResult.subheading_code,
      source: 'hts_master_search',
      hierarchy: {
        chapter: fullCodeResult.chapter_code,
        heading: fullCodeResult.heading_code,
        subheading: fullCodeResult.subheading_code
      }
    })
    
  } catch (error: any) {
    console.error('❌ HTS推定エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'HTS推定処理でエラーが発生しました',
      confidence: 'uncertain'
    }, { status: 500 })
  }
}

/**
 * 🔥 10桁の完全なHTSコードを取得
 * 
 * 6桁サブヘッディング（例: 3926.20）から10桁コードを生成
 * 
 * HTS階層構造:
 * - Chapter: 2桁 (例: 39)
 * - Heading: 4桁 (例: 3926)
 * - Subheading: 6桁 (例: 3926.20)
 * - Full Code: 10桁 (例: 3926.20.4000)
 */
async function getFullHTSCode(supabase: any, partialCode: string) {
  try {
    console.log('🔍 10桁コード検索:', partialCode)
    
    // 🔥 ドットを削除して正規化
    const normalizedCode = partialCode.replace(/\./g, '')
    console.log('🔧 正規化後:', normalizedCode)
    
    // ケース1: 既に10桁の場合はそのまま取得
    if (normalizedCode.length === 10) {
      const { data } = await supabase
        .from('hts_codes_details')
        .select('*')
        .eq('hts_number', partialCode)
        .single()
      
      if (data) {
        console.log('✅ 10桁コード直接取得:', data.hts_number)
        return data
      }
    }
    
    // ケース2: 6桁サブヘッディングの場合は、subheading_codeで検索
    if (normalizedCode.length === 6) {
      console.log('🔍 subheading_codeで検索:', normalizedCode)
      
      // subheading_codeで検索（ドットなし）
      const { data: fullCodes } = await supabase
        .from('hts_codes_details')
        .select('*')
        .eq('subheading_code', normalizedCode)
        .order('hts_number')
        .limit(20)
      
      console.log(`📊 見つかったコード数: ${fullCodes?.length || 0}件`)
      
      if (fullCodes && fullCodes.length > 0) {
        // 最初の10桁コードを探す
        // 優先順位: Free > 低い関税率 > 最初のコード
        const freeCode = fullCodes.find(c => 
          c.hts_number.replace(/\./g, '').length === 10 && 
          c.general_rate === 'Free'
        )
        
        if (freeCode) {
          console.log(`✅ 10桁コード取得(Free): ${normalizedCode} → ${freeCode.hts_number}`)
          return freeCode
        }
        
        // Freeがない場合は最初の10桁コード
        const firstFullCode = fullCodes.find(c => c.hts_number.replace(/\./g, '').length === 10)
        
        if (firstFullCode) {
          console.log(`✅ 10桁コード取得: ${normalizedCode} → ${firstFullCode.hts_number}`)
          return firstFullCode
        }
        
        // 10桁がない場合は最初のレコード
        console.log(`⚠️ 10桁コードが見つからず、最初のレコードを使用: ${fullCodes[0].hts_number}`)
        return fullCodes[0]
      }
    }
    
    // ケース3: 見つからない場合はダミーデータを返す
    console.log('⚠️ 10桁コードが見つかりません:', partialCode)
    return {
      hts_number: partialCode,
      description: '要確認 - 詳細コードが見つかりません',
      general_rate: null,
      chapter_code: normalizedCode.substring(0, 2),
      heading_code: normalizedCode.substring(0, 4),
      subheading_code: normalizedCode,
      confidence: 'uncertain'
    }
  } catch (error) {
    console.error('❌ getFullHTSCodeエラー:', error)
    return {
      hts_number: partialCode,
      description: 'エラー - コード取得失敗',
      general_rate: null,
      chapter_code: null,
      heading_code: null,
      subheading_code: null,
      confidence: 'uncertain'
    }
  }
}

/**
 * カテゴリー直接マッピング検索
 */
async function searchByCategory(supabase: any, category: string) {
  try {
    // 完全一致検索
    const { data: exact } = await supabase
      .from('hts_category_mapping')
      .select('*')
      .eq('ebay_category', category)
      .single()
    
    if (exact) {
      // HTSコード詳細を取得
      const { data: detail } = await supabase
        .from('hts_codes_details')
        .select('*')
        .eq('hts_number', exact.hts_number)
        .single()
      
      return {
        ...exact,
        general_rate: detail?.general_rate
      }
    }
    
    // 部分一致検索（category_keywords配列を使用）
    const { data: partial } = await supabase
      .from('hts_category_mapping')
      .select('*')
      .contains('category_keywords', [category.toLowerCase()])
      .limit(1)
    
    if (partial && partial.length > 0) {
      const { data: detail } = await supabase
        .from('hts_codes_details')
        .select('*')
        .eq('hts_number', partial[0].hts_number)
        .single()
      
      return {
        ...partial[0],
        general_rate: detail?.general_rate
      }
    }
    
    return null
  } catch (error) {
    console.error('カテゴリー検索エラー:', error)
    return null
  }
}

/**
 * 🎯 商品タイプ優先検出
 * 
 * 商品の核となるキーワード（bag, watch, toy等）を最優先で検出し、
 * それに基づいてChapterを絞り込む。
 */
const CORE_PRODUCT_TYPES = [
  // バッグ類 - Chapter 42
  {
    chapter: '42',
    keywords: ['bag', 'tote', 'purse', 'handbag', 'backpack', 'pouch', 'wallet', 'briefcase', 'suitcase', 'luggage'],
    priority: 100,
    name: 'Bags and Leather Goods'
  },
  // 腕時計/時計 - Chapter 91
  {
    chapter: '91',
    keywords: ['watch', 'clock', 'timepiece', 'wristwatch', 'smartwatch'],
    priority: 100,
    name: 'Clocks and Watches'
  },
  // おもちゃ/ゲーム - Chapter 95
  {
    chapter: '95',
    keywords: ['toy', 'doll', 'game', 'puzzle', 'plush', 'figure', 'playmat'],
    priority: 90,
    name: 'Toys and Games'
  },
  // 衣類 - Chapter 61/62
  {
    chapter: '61',
    keywords: ['shirt', 't-shirt', 'dress', 'pants', 'jacket', 'coat', 'sweater', 'hoodie', 'clothing', 'apparel'],
    priority: 95,
    name: 'Apparel and Clothing'
  },
  // 靴 - Chapter 64
  {
    chapter: '64',
    keywords: ['shoe', 'shoes', 'boot', 'boots', 'sneaker', 'sandal', 'slipper', 'footwear'],
    priority: 100,
    name: 'Footwear'
  },
  // アクセサリー - Chapter 71
  {
    chapter: '71',
    keywords: ['jewelry', 'jewellery', 'ring', 'necklace', 'bracelet', 'earring', 'pendant'],
    priority: 95,
    name: 'Jewelry'
  },
  // 本/出版物 - Chapter 49
  {
    chapter: '49',
    keywords: ['book', 'magazine', 'comic', 'manga', 'novel', 'catalog', 'publication'],
    priority: 90,
    name: 'Books and Publications'
  },
  // 楽器 - Chapter 92
  {
    chapter: '92',
    keywords: ['guitar', 'piano', 'drum', 'violin', 'instrument', 'musical'],
    priority: 95,
    name: 'Musical Instruments'
  },
  // 家具 - Chapter 94
  {
    chapter: '94',
    keywords: ['furniture', 'chair', 'table', 'desk', 'sofa', 'bed', 'shelf'],
    priority: 90,
    name: 'Furniture'
  },
  // 電子機器 - Chapter 85
  {
    chapter: '85',
    keywords: ['electronic', 'headphone', 'speaker', 'charger', 'cable', 'adapter', 'battery'],
    priority: 85,
    name: 'Electrical Machinery'
  },
]

/**
 * 商品タイプを検出
 */
function detectProductType(title: string): { chapter: string; name: string; confidence: number } | null {
  const titleLower = title.toLowerCase()
  
  for (const type of CORE_PRODUCT_TYPES) {
    for (const keyword of type.keywords) {
      if (titleLower.includes(keyword)) {
        console.log(`🎯 商品タイプ検出: "${keyword}" → Chapter ${type.chapter} (${type.name})`)
        return {
          chapter: type.chapter,
          name: type.name,
          confidence: type.priority
        }
      }
    }
  }
  
  return null
}

/**
 * キーワード抽出関数
 */
function extractKeywordsFromProduct(data: {
  englishTitle?: string
  title?: string
  categoryName?: string
  material?: string
  description?: string
  ebayApiData?: any
}): string[] {
  const keywords: string[] = []
  const seen = new Set<string>()
  
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'new', 'used', 'vintage', 'rare', 'good', 'excellent', 'mint', 'condition',
    'item', 'product', 'sale', 'buy', 'free', 'shipping', 'japan', 'japanese'
  ])
  
  const addKeywords = (text: string) => {
    if (!text) return
    
    const words = text.toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
    
    words.forEach(word => {
      if (!seen.has(word)) {
        keywords.push(word)
        seen.add(word)
      }
    })
  }
  
  // 優先度1: 英語タイトル
  if (data.englishTitle) {
    addKeywords(data.englishTitle)
  }
  
  // 優先度2: SellerMirrorのタイトル
  if (data.ebayApiData?.listing_reference?.referenceItems) {
    const items = data.ebayApiData.listing_reference.referenceItems
    items.slice(0, 3).forEach((item: any) => {
      if (item.title) {
        addKeywords(item.title)
      }
    })
  }
  
  // 優先度3: カテゴリ名
  if (data.categoryName) {
    addKeywords(data.categoryName)
  }
  
  // 優先度4: 素材
  if (data.material && data.material !== '要確認') {
    addKeywords(data.material)
  }
  
  // 優先度5: 日本語タイトル（fallback）
  if (!data.englishTitle && data.title) {
    addKeywords(data.title)
  }
  
  return keywords.slice(0, 30)
}

/**
 * キーワードマッピングテーブル検索
 */
async function searchKeywordMapping(supabase: any, keywords: string[]) {
  try {
    const { data, error } = await supabase
      .from('hts_keyword_mapping')
      .select('*')
      .in('keyword', keywords.slice(0, 15))
      .order('priority', { ascending: false })
      .order('confidence_score', { ascending: false })
      .limit(5)
    
    return data || []
  } catch (error) {
    console.error('マッピング検索エラー:', error)
    return []
  }
}

/**
 * Chapter絞り込みHTS検索
 * 
 * 検出されたChapter内で、商品タイトルに最も適合するHTSコードを検索
 */
async function searchHTSByChapter(supabase: any, chapter: string, title: string) {
  try {
    // Chapter内の全HTSコードを取得
    const { data: allCodes } = await supabase
      .from('hts_codes_details')
      .select('*')
      .eq('chapter_code', chapter)
      .limit(100)
    
    if (!allCodes || allCodes.length === 0) {
      return []
    }
    
    // タイトルからキーワードを抽出
    const titleWords = title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
    
    console.log(`🔍 Chapter ${chapter}内で検索中... (全${allCodes.length}件)`)
    console.log(`📝 タイトルキーワード:`, titleWords.slice(0, 5))
    
    // 各HTSコードとのマッチングスコアを計算
    const scored = allCodes.map(code => {
      const descLower = (code.description || '').toLowerCase()
      let score = 0
      const matchedWords: string[] = []
      
      titleWords.forEach(word => {
        if (descLower.includes(word)) {
          score++
          matchedWords.push(word)
        }
      })
      
      // Free関税の場合はボーナススコア
      if (code.general_rate === 'Free') {
        score += 0.5
      }
      
      return {
        ...code,
        score,
        matchedWords
      }
    })
    
    // スコア順にソート
    scored.sort((a, b) => b.score - a.score)
    
    // スコア1以上の結果を返す
    const results = scored.filter(c => c.score >= 1).slice(0, 5)
    
    if (results.length > 0) {
      console.log(`✅ マッチ: ${results[0].hts_number} (score: ${results[0].score}, matched: ${results[0].matchedWords.join(', ')})`)
    }
    
    return results
  } catch (error) {
    console.error(`Chapter検索エラー (${chapter}):`, error)
    return []
  }
}

/**
 * HTSマスター全文検索
 */
async function searchHTSByKeywords(supabase: any, keywords: string[]) {
  const results: any[] = []
  const seenCodes = new Set<string>()
  
  // 最初の10キーワードで検索
  for (const keyword of keywords.slice(0, 10)) {
    try {
      const { data } = await supabase
        .from('hts_codes_details')
        .select('*')
        .ilike('description', `%${keyword}%`)
        .limit(3)
      
      if (data && data.length > 0) {
        data.forEach((item: any) => {
          if (!seenCodes.has(item.hts_number)) {
            const descLower = (item.description || '').toLowerCase()
            const matchedKeywords = keywords.filter(k => descLower.includes(k.toLowerCase()))
            
            results.push({
              ...item,
              matchedKeyword: keyword,
              matchedKeywords,
              score: matchedKeywords.length
            })
            seenCodes.add(item.hts_number)
          }
        })
      }
    } catch (error) {
      console.error(`検索エラー (${keyword}):`, error)
    }
  }
  
  return results
}

/**
 * 最適なHTSコード選択
 */
function selectBestMatch(results: any[], keywords: string[]) {
  results.sort((a, b) => b.score - a.score)
  return results[0]
}

/**
 * 信頼度計算
 */
function calculateConfidence(score: number, resultCount: number): 'high' | 'medium' | 'low' | 'uncertain' {
  if (score >= 3 && resultCount >= 1) return 'high'
  if (score >= 2) return 'medium'
  if (score >= 1) return 'low'
  return 'uncertain'
}
