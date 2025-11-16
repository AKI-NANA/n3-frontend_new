// lib/tariffService.ts
/**
 * HTS判別サービス - PostgreSQL RPC版
 * 
 * データベース側のストアドファンクションを呼び出す
 * 高精度なフレーズ検索とスコアリングはDB側で実行
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface HtsCandidate {
  hts_number: string
  heading_description: string
  subheading_description?: string
  detail_description?: string
  description_ja?: string
  general_rate?: string
  relevance_score?: number
  confidence_level?: 'high' | 'medium' | 'low' | 'uncertain'
  match_type?: string
}

/**
 * PostgreSQLストアドファンクションを呼び出してHTS候補を検索
 * 
 * @param keywords カンマ区切りのキーワード/フレーズ
 * @returns HTS候補リスト（上位10件）
 */
export async function lookupHtsCandidates(keywords: string): Promise<HtsCandidate[]> {
  try {
    console.log('🔍 HTS検索開始（PostgreSQL RPC） - キーワード:', keywords)

    // PostgreSQLストアドファンクションを呼び出し
    const { data, error } = await supabase
      .rpc('search_hts_candidates', {
        search_keywords: keywords
      })

    if (error) {
      console.error('❌ RPC呼び出しエラー:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ 該当するHTSコードが見つかりませんでした')
      return []
    }

    console.log(`✅ HTS検索完了: ${data.length}件の候補`)
    data.slice(0, 5).forEach((item: any, index: number) => {
      console.log(`  ${index + 1}. ${item.hts_number} (スコア: ${item.relevance_score}, タイプ: ${item.match_type})`)
    })

    return data

  } catch (error: any) {
    console.error('❌ HTS検索エラー:', error)
    throw new Error(`HTS検索に失敗しました: ${error.message}`)
  }
}

/**
 * 関税率をHTSコードと原産国から取得
 */
export async function getDutyRate(
  htsCode: string,
  originCountry: string
): Promise<number> {
  try {
    console.log(`🔍 関税率検索: ${htsCode} (${originCountry})`)

    const { data, error } = await supabase
      .from('customs_duties')
      .select('total_duty_rate, general_duty_rate, section_301_rate')
      .eq('hts_code', htsCode)
      .eq('origin_country', originCountry)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (data) {
      const rate = data.total_duty_rate || data.general_duty_rate || 0
      console.log(`  ✅ 関税率: ${(rate * 100).toFixed(2)}%`)
      return rate
    }

    const { data: htsData, error: htsError } = await supabase
      .from('hts_codes_details')
      .select('general_rate_of_duty, special_rate_of_duty')
      .eq('hts_number', htsCode)
      .single()

    if (htsError && htsError.code !== 'PGRST116') {
      throw htsError
    }

    if (htsData?.general_rate_of_duty) {
      const rateStr = htsData.general_rate_of_duty
      const rateMatch = rateStr.match(/[\d.]+/)
      if (rateMatch) {
        const rate = parseFloat(rateMatch[0]) / 100
        console.log(`  ✅ 関税率: ${(rate * 100).toFixed(2)}%`)
        return rate
      }
    }

    console.warn('  ⚠️ 関税率データなし')
    return 0

  } catch (error: any) {
    console.error('❌ 関税率取得エラー:', error)
    return 0
  }
}

/**
 * キーワードの妥当性をチェック
 */
export function validateKeywords(keywords: string): {
  valid: boolean
  message?: string
  keywordCount?: number
} {
  if (!keywords || keywords.trim().length === 0) {
    return {
      valid: false,
      message: 'キーワードが入力されていません'
    }
  }

  const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)

  if (keywordArray.length === 0) {
    return {
      valid: false,
      message: '有効なキーワードがありません'
    }
  }

  if (keywordArray.length > 10) {
    return {
      valid: false,
      message: 'キーワードは10個以下にしてください'
    }
  }

  return {
    valid: true,
    keywordCount: keywordArray.length
  }
}

/**
 * HTSコードの日本語解説を生成
 */
export function generateHtsExplanation(candidate: HtsCandidate): string {
  const parts: string[] = []
  
  // 基本説明
  if (candidate.detail_description) {
    parts.push(candidate.detail_description)
  } else if (candidate.subheading_description) {
    parts.push(candidate.subheading_description)
  } else if (candidate.heading_description) {
    parts.push(candidate.heading_description)
  }
  
  // 関税率
  if (candidate.general_rate) {
    const rate = candidate.general_rate.toLowerCase()
    if (rate === 'free') {
      parts.push('関税: 無税')
    } else {
      parts.push(`関税: ${candidate.general_rate}`)
    }
  }
  
  // 信頼度の説明
  if (candidate.confidence_level) {
    const confidenceText = {
      high: '信頼度: 高（そのまま使用可）',
      medium: '信頼度: 中（確認推奨）',
      low: '信頼度: 低（要確認）',
      uncertain: '信頼度: 不確実（手動選択推奨）'
    }
    parts.push(confidenceText[candidate.confidence_level])
  }
  
  return parts.join(' | ')
}

/**
 * 信頼度の日本語表示
 */
export function getConfidenceLabel(level?: string): string {
  const labels = {
    high: '高',
    medium: '中',
    low: '低',
    uncertain: '不確実'
  }
  return level ? labels[level as keyof typeof labels] || '不明' : '不明'
}

/**
 * 信頼度の色
 */
export function getConfidenceColor(level?: string): string {
  const colors = {
    high: '#10b981',    // green
    medium: '#f59e0b', // amber
    low: '#ef4444',    // red
    uncertain: '#6b7280' // gray
  }
  return level ? colors[level as keyof typeof colors] || '#6b7280' : '#6b7280'
}

/**
 * サンプルキーワードを生成（ユーザー向けガイド）
 */
export function generateSampleKeywords(productTitle: string): string {
  const titleLower = productTitle.toLowerCase()
  const keywords: string[] = []

  // フレーズ優先
  if (titleLower.includes('card') || titleLower.includes('カード')) {
    keywords.push('playing cards', 'printed cards', 'paper')
  }
  if (titleLower.includes('pokemon') || titleLower.includes('ポケモン')) {
    keywords.push('pokemon', 'collectible')
  }
  if (titleLower.includes('phone') || titleLower.includes('iphone')) {
    keywords.push('mobile phone', 'smartphone', 'electronic')
  }
  if (titleLower.includes('shirt') || titleLower.includes('シャツ')) {
    keywords.push('cotton shirt', 'apparel', 'textile')
  }
  if (titleLower.includes('toy') || titleLower.includes('おもちゃ')) {
    keywords.push('toy', 'game', 'plastic')
  }

  if (keywords.length === 0) {
    return 'playing cards, collectible, paper'
  }

  return keywords.join(', ')
}
