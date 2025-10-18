/**
 * VeRO統合フィルター処理
 * 商品のVeROブランドチェックと推奨コンディション設定
 */

import { createClient } from '@supabase/supabase-js'

export interface VeROCheckResult {
  isVeROBrand: boolean
  brandName?: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recommendedCondition: 'NEW' | 'LIKE_NEW' | 'USED'
  forceUsedCondition: boolean
  notes: string
  violationCount: number
}

export interface ProductVeROData {
  id: string
  title: string
  description: string
  brand?: string
  condition?: string
}

/**
 * 商品のVeROブランドチェック
 */
export async function checkProductVeRO(
  supabaseUrl: string,
  supabaseKey: string,
  product: ProductVeROData
): Promise<VeROCheckResult> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  const defaultResult: VeROCheckResult = {
    isVeROBrand: false,
    riskLevel: 'LOW',
    recommendedCondition: 'NEW',
    forceUsedCondition: false,
    notes: '',
    violationCount: 0,
  }
  
  try {
    // VeROブランドルールを取得
    const { data: rules, error } = await supabase
      .from('vero_brand_rules')
      .select('*')
      .eq('is_active', true)
    
    if (error) {
      console.error('VeROルール取得エラー:', error)
      return defaultResult
    }
    
    if (!rules || rules.length === 0) {
      return defaultResult
    }
    
    // 商品タイトルと説明文を結合
    const searchText = `${product.title} ${product.description}`.toLowerCase()
    
    // キーワードマッチング
    for (const rule of rules) {
      const keywords = rule.keywords || []
      
      for (const keyword of keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          // VeROブランドを検出
          return {
            isVeROBrand: true,
            brandName: rule.brand_name,
            riskLevel: determineRiskLevel(rule.violation_count),
            recommendedCondition: rule.recommended_condition || 'LIKE_NEW',
            forceUsedCondition: rule.force_used_condition || false,
            notes: rule.notes || '',
            violationCount: rule.violation_count || 0,
          }
        }
      }
    }
    
    return defaultResult
    
  } catch (error) {
    console.error('VeROチェックエラー:', error)
    return defaultResult
  }
}

/**
 * 違反カウントに基づくリスクレベル判定
 */
function determineRiskLevel(violationCount: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (violationCount >= 100) return 'CRITICAL'
  if (violationCount >= 50) return 'HIGH'
  if (violationCount >= 20) return 'MEDIUM'
  return 'LOW'
}

/**
 * 商品にVeROフラグを設定
 */
export async function flagProductAsVeRO(
  supabaseUrl: string,
  supabaseKey: string,
  productId: string,
  veroData: VeROCheckResult
): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    const { error } = await supabase
      .from('yahoo_scraped_products')
      .update({
        is_vero_brand: veroData.isVeROBrand,
        vero_brand_name: veroData.brandName,
        vero_risk_level: veroData.riskLevel,
        recommended_condition: veroData.recommendedCondition,
        vero_notes: veroData.notes,
        vero_checked_at: new Date().toISOString(),
      })
      .eq('id', productId)
    
    if (error) {
      console.error('VeROフラグ設定エラー:', error)
      return false
    }
    
    return true
    
  } catch (error) {
    console.error('VeROフラグ設定エラー:', error)
    return false
  }
}

/**
 * VeRO承認ページ用：推奨コンディション表示
 */
export function getVeROConditionBadge(
  isVeROBrand: boolean,
  recommendedCondition: string,
  currentCondition: string
): {
  show: boolean
  color: string
  message: string
  warning: boolean
} {
  if (!isVeROBrand) {
    return {
      show: false,
      color: 'gray',
      message: '',
      warning: false,
    }
  }
  
  const isCorrectCondition = currentCondition === recommendedCondition
  
  if (recommendedCondition === 'LIKE_NEW' && currentCondition === 'NEW') {
    return {
      show: true,
      color: 'red',
      message: '⚠️ VeROブランド：新品出品は禁止。LIKE_NEWで出品してください',
      warning: true,
    }
  }
  
  if (isCorrectCondition) {
    return {
      show: true,
      color: 'green',
      message: `✓ VeROブランド：${recommendedCondition}で出品可能`,
      warning: false,
    }
  }
  
  return {
    show: true,
    color: 'orange',
    message: `推奨コンディション：${recommendedCondition}`,
    warning: true,
  }
}

/**
 * VeRO注意事項テキスト生成
 */
export function generateVeROWarningText(
  brandName: string,
  violationCount: number,
  notes: string
): string {
  let warning = `🚨 VeROブランド検出: ${brandName}\n\n`
  
  if (violationCount >= 100) {
    warning += `【最重要警告】過去${violationCount}件の違反報告があります。\n`
  } else if (violationCount >= 50) {
    warning += `【重要警告】過去${violationCount}件の違反報告があります。\n`
  } else if (violationCount > 0) {
    warning += `過去${violationCount}件の違反報告があります。\n`
  }
  
  warning += '\n必須対策：\n'
  warning += '✓ 新品での出品は禁止（LIKE_NEWで出品）\n'
  warning += '✓ 自分で撮影した写真のみ使用\n'
  warning += '✓ 製造番号・ロゴが明確にわかる写真を掲載\n'
  warning += '✓ 正規販売店からの領収書を添付\n'
  warning += '✓ 配送先の地域制限を確認\n'
  
  if (notes) {
    warning += `\n備考：\n${notes}\n`
  }
  
  return warning
}
