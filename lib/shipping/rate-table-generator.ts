/**
 * eBay Rate Table生成ユーティリティ
 * 
 * 目的:
 * - ebay_shipping_masterからデータを取得
 * - マージンを適用した推奨価格を計算
 * - eBayアップロード用のRate Table形式で出力
 */

import { supabase } from '@/lib/supabase'
import { enrichArrayWithMargin, type MarginCalculationResult } from './margin-calculator'

export interface RateTableRow {
  weight_range: string              // 例: "0.5kg - 1.0kg"
  service_name: string              // サービス名
  zone: string                      // ゾーン or 国コード
  country_name: string              // 国名
  base_rate_jpy: number             // 原価
  recommended_price_jpy: number     // 推奨販売価格（円）
  recommended_price_usd: number     // 推奨販売価格（USD）
  margin_percentage: number         // マージン率（%）
}

export interface RateTableOptions {
  service_code?: string             // 特定サービスのみ
  country_code?: string             // 特定国のみ
  min_weight_kg?: number           // 最小重量
  max_weight_kg?: number           // 最大重量
  include_base_rate?: boolean      // 原価も含める（デフォルト: true）
}

/**
 * eBay Rate Table用データ生成
 * 
 * @param options フィルター・オプション
 * @returns Rate Table形式のデータ
 * 
 * @example
 * // 日本郵便EMSのアメリカ向け料金表
 * const rateTable = await generateRateTable({
 *   service_code: 'JPPOST_EMS',
 *   country_code: 'US'
 * })
 */
export async function generateRateTable(
  options: RateTableOptions = {}
): Promise<RateTableRow[]> {
  // クエリ構築
  let query = supabase
    .from('ebay_shipping_master')
    .select('*')
    .order('weight_from_kg')
  
  if (options.service_code) {
    query = query.eq('service_code', options.service_code)
  }
  
  if (options.country_code) {
    query = query.eq('country_code', options.country_code)
  }
  
  if (options.min_weight_kg !== undefined) {
    query = query.gte('weight_from_kg', options.min_weight_kg)
  }
  
  if (options.max_weight_kg !== undefined) {
    query = query.lte('weight_to_kg', options.max_weight_kg)
  }
  
  // データ取得
  const { data, error } = await query
  
  if (error) {
    throw new Error(`Failed to fetch rate table data: ${error.message}`)
  }
  
  if (!data || data.length === 0) {
    return []
  }
  
  // マージン計算を追加
  const enrichedData = enrichArrayWithMargin(data)
  
  // Rate Table形式に変換
  return enrichedData.map(row => ({
    weight_range: `${row.weight_from_kg}kg - ${row.weight_to_kg}kg`,
    service_name: row.service_name || row.service_code,
    zone: row.zone || row.country_code,
    country_name: row.country_name_ja || row.country_name_en || row.country_code,
    base_rate_jpy: row.base_rate_jpy,
    recommended_price_jpy: row.margin.recommended_price_jpy,
    recommended_price_usd: row.margin.recommended_price_usd,
    margin_percentage: Math.round((row.margin.margin_rate - 1) * 100)
  }))
}

/**
 * CSV形式でエクスポート
 * 
 * @param data Rate Tableデータ
 * @param options エクスポートオプション
 * @returns CSV文字列
 * 
 * @example
 * const data = await generateRateTable({ service_code: 'JPPOST_EMS' })
 * const csv = exportRateTableCSV(data)
 * // ファイルとしてダウンロード
 * const blob = new Blob([csv], { type: 'text/csv' })
 * const url = URL.createObjectURL(blob)
 */
export function exportRateTableCSV(
  data: RateTableRow[],
  options: { include_base_rate?: boolean } = { include_base_rate: true }
): string {
  const headers = [
    'Weight Range',
    'Service',
    'Zone',
    'Country',
    ...(options.include_base_rate ? ['Base Rate (JPY)'] : []),
    'Recommended Price (JPY)',
    'Recommended Price (USD)',
    'Margin %'
  ]
  
  const rows = data.map(row => [
    row.weight_range,
    row.service_name,
    row.zone,
    row.country_name,
    ...(options.include_base_rate ? [row.base_rate_jpy] : []),
    row.recommended_price_jpy,
    row.recommended_price_usd,
    `${row.margin_percentage}%`
  ])
  
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
}

/**
 * eBayアップロード用シンプル形式でエクスポート
 * 
 * @param data Rate Tableデータ
 * @returns CSV文字列（Weight, Zone, Price USDのみ）
 * 
 * @example
 * // eBayに直接アップロード可能な形式
 * const csv = exportEbayFormatCSV(data)
 */
export function exportEbayFormatCSV(data: RateTableRow[]): string {
  const headers = ['Weight (kg)', 'Zone', 'Price (USD)']
  
  const rows = data.map(row => [
    row.weight_range.split(' - ')[1], // 終了重量のみ
    row.zone,
    row.recommended_price_usd
  ])
  
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
}

/**
 * 国別にグループ化してRate Tableを生成
 * 
 * @param service_code サービスコード
 * @returns 国コードをキーとしたRate Tableマップ
 */
export async function generateRateTableByCountry(
  service_code: string
): Promise<Record<string, RateTableRow[]>> {
  const allData = await generateRateTable({ service_code })
  
  return allData.reduce((acc, row) => {
    const countryCode = row.zone
    if (!acc[countryCode]) {
      acc[countryCode] = []
    }
    acc[countryCode].push(row)
    return acc
  }, {} as Record<string, RateTableRow[]>)
}

/**
 * 重量帯別の価格比較データを生成
 * 
 * @param country_code 国コード
 * @param weight_kg 重量
 * @returns 全サービスの価格比較
 */
export async function compareServicesForWeight(
  country_code: string,
  weight_kg: number
): Promise<Array<RateTableRow & { service_code: string }>> {
  const { data, error } = await supabase
    .from('ebay_shipping_master')
    .select('*')
    .eq('country_code', country_code)
    .lte('weight_from_kg', weight_kg)
    .gte('weight_to_kg', weight_kg)
    .order('base_rate_jpy')
  
  if (error) throw error
  if (!data) return []
  
  const enrichedData = enrichArrayWithMargin(data)
  
  return enrichedData.map(row => ({
    service_code: row.service_code,
    weight_range: `${row.weight_from_kg}kg - ${row.weight_to_kg}kg`,
    service_name: row.service_name || row.service_code,
    zone: row.zone || row.country_code,
    country_name: row.country_name_ja || row.country_name_en || row.country_code,
    base_rate_jpy: row.base_rate_jpy,
    recommended_price_jpy: row.margin.recommended_price_jpy,
    recommended_price_usd: row.margin.recommended_price_usd,
    margin_percentage: Math.round((row.margin.margin_rate - 1) * 100)
  }))
}
