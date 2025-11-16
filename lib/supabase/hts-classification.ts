// lib/supabase/hts-classification.ts
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface HTSClassification {
  id: string
  product_id: number
  hts_code: string
  hts_chapter_code: string
  hts_heading_code: string
  hts_subheading_code: string
  hts_description: string | null
  general_rate: string | null
  special_rate: string | null
  additional_duties: string | null
  confidence_score: number
  classification_method: 'auto' | 'manual' | 'ai' | 'verified'
  classified_by: string | null
  analysis_data: any
  is_active: boolean
  verification_status: 'pending' | 'verified' | 'needs_review'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HTSClassificationHistory {
  id: string
  product_id: number
  hts_classification_id: string | null
  old_hts_code: string | null
  new_hts_code: string | null
  old_confidence_score: number | null
  new_confidence_score: number | null
  change_reason: string | null
  change_type: 'create' | 'update' | 'verify' | 'override'
  changed_by: string | null
  changed_at: string
}

/**
 * 商品のアクティブなHTS分類を取得
 */
export async function getActiveHTSClassification(productId: number): Promise<HTSClassification | null> {
  const { data, error } = await supabase
    .from('product_hts_classification')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // データが見つからない場合はnullを返す
      return null
    }
    console.error('Error fetching HTS classification:', error)
    throw error
  }

  return data
}

/**
 * 複数商品のHTS分類を一括取得（JOIN用）
 */
export async function getHTSClassifications(productIds: number[]): Promise<Record<number, HTSClassification>> {
  const { data, error } = await supabase
    .from('product_hts_classification')
    .select('*')
    .in('product_id', productIds)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching HTS classifications:', error)
    throw error
  }

  // product_idをキーとした辞書に変換
  return (data || []).reduce((acc, item) => {
    acc[item.product_id] = item
    return acc
  }, {} as Record<number, HTSClassification>)
}

/**
 * HTS分類を作成または更新
 */
export async function upsertHTSClassification(
  productId: number,
  htsData: {
    hts_code: string
    hts_chapter_code: string
    hts_heading_code: string
    hts_subheading_code: string
    hts_description?: string
    general_rate?: string
    special_rate?: string
    additional_duties?: string
    confidence_score: number
    classification_method: 'auto' | 'manual' | 'ai' | 'verified'
    classified_by?: string
    analysis_data?: any
    notes?: string
    verification_status?: 'pending' | 'verified' | 'needs_review'
  }
): Promise<HTSClassification> {
  // 既存のアクティブなHTS分類を非アクティブ化
  const { error: deactivateError } = await supabase
    .from('product_hts_classification')
    .update({ is_active: false })
    .eq('product_id', productId)
    .eq('is_active', true)

  if (deactivateError) {
    console.error('Error deactivating old HTS classification:', deactivateError)
    throw deactivateError
  }

  // 新しいHTS分類を作成
  const { data, error } = await supabase
    .from('product_hts_classification')
    .insert({
      product_id: productId,
      ...htsData,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating HTS classification:', error)
    throw error
  }

  return data
}

/**
 * HTS分類を手動で検証済みにマーク
 */
export async function verifyHTSClassification(
  classificationId: string,
  verifiedBy: string,
  notes?: string
): Promise<HTSClassification> {
  const { data, error } = await supabase
    .from('product_hts_classification')
    .update({
      verification_status: 'verified',
      classification_method: 'verified',
      classified_by: verifiedBy,
      notes: notes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', classificationId)
    .select()
    .single()

  if (error) {
    console.error('Error verifying HTS classification:', error)
    throw error
  }

  return data
}

/**
 * 商品のHTS分類履歴を取得
 */
export async function getHTSClassificationHistory(productId: number): Promise<HTSClassificationHistory[]> {
  const { data, error } = await supabase
    .from('hts_classification_history')
    .select('*')
    .eq('product_id', productId)
    .order('changed_at', { ascending: false })

  if (error) {
    console.error('Error fetching HTS classification history:', error)
    throw error
  }

  return data || []
}

/**
 * 信頼度スコアが低い（要レビュー）商品を取得
 */
export async function getLowConfidenceClassifications(
  threshold: number = 70,
  limit: number = 50
): Promise<Array<HTSClassification & { product_title?: string }>> {
  const { data, error } = await supabase
    .from('product_hts_classification')
    .select(`
      *,
      products_master!product_id (
        title,
        title_en
      )
    `)
    .eq('is_active', true)
    .lt('confidence_score', threshold)
    .order('confidence_score', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching low confidence classifications:', error)
    throw error
  }

  // データ整形
  return (data || []).map(item => ({
    ...item,
    product_title: (item.products_master as any)?.title_en || (item.products_master as any)?.title
  }))
}

/**
 * HTS分類の統計情報を取得
 */
export async function getHTSClassificationStats() {
  // 総数
  const { count: totalCount } = await supabase
    .from('product_hts_classification')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // 検証済み数
  const { count: verifiedCount } = await supabase
    .from('product_hts_classification')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('verification_status', 'verified')

  // 自動分類数
  const { count: autoCount } = await supabase
    .from('product_hts_classification')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('classification_method', 'auto')

  // 平均信頼度スコア
  const { data: avgData } = await supabase
    .from('product_hts_classification')
    .select('confidence_score')
    .eq('is_active', true)

  const avgConfidence = avgData && avgData.length > 0
    ? avgData.reduce((sum, item) => sum + (item.confidence_score || 0), 0) / avgData.length
    : 0

  return {
    total: totalCount || 0,
    verified: verifiedCount || 0,
    auto: autoCount || 0,
    avgConfidence: Math.round(avgConfidence * 100) / 100
  }
}

/**
 * Chapterごとの商品数を集計
 */
export async function getHTSChapterDistribution() {
  const { data, error } = await supabase
    .from('product_hts_classification')
    .select('hts_chapter_code')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching chapter distribution:', error)
    throw error
  }

  // Chapterごとにカウント
  const distribution = (data || []).reduce((acc, item) => {
    const chapter = item.hts_chapter_code
    acc[chapter] = (acc[chapter] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // 配列に変換してソート
  return Object.entries(distribution)
    .map(([chapter, count]) => ({ chapter, count }))
    .sort((a, b) => b.count - a.count)
}
