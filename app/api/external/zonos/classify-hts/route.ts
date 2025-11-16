// app/api/external/zonos/classify-hts/route.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * Zonos Classify API - HTSコード分類
 * 
 * 📌 外部APIを使用して商品説明からHTSコードを正確に取得
 * 
 * Zonos API Documentation:
 * https://docs.zonos.com/api/classify
 * 
 * INPUT:
 * - description: 商品説明（英語）
 * - originCountry: 原産国コード (ISO 3166-1 alpha-2)
 * - material: 素材（オプション）
 * - category: カテゴリ（オプション）
 * 
 * OUTPUT:
 * - htsCode: 10桁HTSコード
 * - description: HTS説明
 * - dutyRate: 関税率 (%)
 * - confidence: 確信度 (0-1)
 */

interface ZonosClassifyRequest {
  description: string
  originCountry?: string
  material?: string
  category?: string
  value?: number // 商品価値（USD）
}

interface ZonosClassifyResponse {
  success: boolean
  data?: {
    htsCode: string
    htsDescription: string
    dutyRate: number
    confidence: number
    alternativeCodes?: Array<{
      code: string
      description: string
      confidence: number
    }>
  }
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<ZonosClassifyResponse>> {
  try {
    const body: ZonosClassifyRequest = await request.json()
    const { description, originCountry = 'JP', material, category, value } = body

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '商品説明が必要です' },
        { status: 400 }
      )
    }

    // Zonos APIキーの確認
    const zonosApiKey = process.env.ZONOS_API_KEY
    
    if (!zonosApiKey) {
      console.warn('⚠️ ZONOS_API_KEY が設定されていません')
      
      // フォールバック: USITCデータベースから検索
      return await fallbackToUSITC(description, originCountry, material)
    }

    // Zonos Classify API呼び出し
    console.log('🌐 Zonos Classify API呼び出し:', {
      description: description.substring(0, 50),
      originCountry,
      material,
      category
    })

    const zonosResponse = await fetch('https://api.zonos.com/v1/classify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${zonosApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description,
        origin_country: originCountry,
        material,
        category,
        value,
        destination_country: 'US' // デフォルトはアメリカ
      })
    })

    if (!zonosResponse.ok) {
      const errorText = await zonosResponse.text()
      console.error('❌ Zonos API Error:', errorText)
      
      // フォールバック
      return await fallbackToUSITC(description, originCountry, material)
    }

    const zonosData = await zonosResponse.json()
    
    console.log('✅ Zonos API Response:', zonosData)

    // Zonos レスポンスの解析
    const htsCode = zonosData.hts_code || zonosData.hs_code
    const htsDescription = zonosData.description || ''
    const dutyRate = zonosData.duty_rate || 0
    const confidence = zonosData.confidence || 0.8

    if (!htsCode) {
      throw new Error('Zonos APIからHTSコードを取得できませんでした')
    }

    // 代替コード候補
    const alternativeCodes = (zonosData.alternatives || []).map((alt: any) => ({
      code: alt.hts_code || alt.hs_code,
      description: alt.description || '',
      confidence: alt.confidence || 0
    }))

    return NextResponse.json({
      success: true,
      data: {
        htsCode,
        htsDescription,
        dutyRate,
        confidence,
        alternativeCodes: alternativeCodes.slice(0, 3) // 上位3件
      }
    })

  } catch (error: any) {
    console.error('Zonos classify error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'HTSコード分類に失敗しました' 
      },
      { status: 500 }
    )
  }
}

/**
 * フォールバック: USITCデータベースから検索
 * Zonos APIが使えない場合の代替手段
 */
async function fallbackToUSITC(
  description: string, 
  originCountry: string,
  material?: string
): Promise<NextResponse<ZonosClassifyResponse>> {
  try {
    console.log('🔄 USITC フォールバックモード')

    // Supabaseから類似HTSコードを検索
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // キーワード抽出
    const keywords = extractKeywords(description, material)
    console.log('  抽出キーワード:', keywords)

    // hts_codes_detailsテーブルから検索
    const { data: htsCodes, error } = await supabase
      .from('hts_codes_details')
      .select('*')
      .or(keywords.map(k => `description.ilike.%${k}%`).join(','))
      .order('usage_count', { ascending: false })
      .limit(5)

    if (error) throw error

    if (!htsCodes || htsCodes.length === 0) {
      return NextResponse.json({
        success: false,
        error: '該当するHTSコードが見つかりませんでした。手動で確認してください。'
      }, { status: 404 })
    }

    // 最も一致度の高いコードを選択
    const bestMatch = htsCodes[0]
    
    // customs_dutiesから関税率を取得
    const { data: dutyData } = await supabase
      .from('customs_duties')
      .select('*')
      .eq('hts_code', bestMatch.hts_number)
      .eq('origin_country', originCountry)
      .single()

    const dutyRate = dutyData?.total_duty_rate || bestMatch.general_rate_of_duty || 0

    console.log('✅ USITC フォールバック結果:', bestMatch.hts_number)

    return NextResponse.json({
      success: true,
      data: {
        htsCode: bestMatch.hts_number,
        htsDescription: bestMatch.description,
        dutyRate,
        confidence: 0.6, // フォールバックは確信度低め
        alternativeCodes: htsCodes.slice(1, 4).map(code => ({
          code: code.hts_number,
          description: code.description,
          confidence: 0.5
        }))
      }
    })

  } catch (error: any) {
    console.error('❌ USITC フォールバック失敗:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'HTSコード検索に失敗しました: ' + error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * 商品説明からキーワード抽出
 */
function extractKeywords(description: string, material?: string): string[] {
  const keywords: string[] = []
  
  const text = description.toLowerCase()
  
  // 主要カテゴリ検出
  if (text.includes('card') || text.includes('trading')) keywords.push('card')
  if (text.includes('pokemon') || text.includes('yugioh')) keywords.push('game')
  if (text.includes('cotton') || text.includes('fabric')) keywords.push('textile')
  if (text.includes('plastic')) keywords.push('plastic')
  if (text.includes('metal') || text.includes('steel')) keywords.push('metal')
  if (text.includes('electronic') || text.includes('device')) keywords.push('electronic')
  if (text.includes('toy') || text.includes('figure')) keywords.push('toy')
  if (text.includes('clothing') || text.includes('apparel')) keywords.push('apparel')
  if (text.includes('book') || text.includes('magazine')) keywords.push('printed')
  
  // 素材追加
  if (material) {
    keywords.push(material.toLowerCase())
  }
  
  // 最低1つはキーワードを返す
  if (keywords.length === 0) {
    keywords.push('miscellaneous')
  }
  
  return keywords
}

/**
 * GET: ヘルスチェック
 */
export async function GET() {
  const hasZonosKey = !!process.env.ZONOS_API_KEY
  
  return NextResponse.json({
    service: 'Zonos Classify HTS',
    status: hasZonosKey ? 'ready' : 'fallback_mode',
    zonosApiConfigured: hasZonosKey,
    fallbackAvailable: true
  })
}
