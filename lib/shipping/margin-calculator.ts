/**
 * 送料マージン計算ユーティリティ
 * 
 * 目的: 
 * - base_rate_jpy（原価）から推奨販売価格を計算
 * - サービスタイプ別のマージン率を適用
 * - 既存データを破壊せず、新しいプロパティとして追加
 */

export interface MarginCalculationResult {
  base_rate_jpy: number           // 原価
  margin_rate: number              // マージン率（例: 1.5 = 50%マージン）
  margin_amount_jpy: number        // マージン額（円）
  recommended_price_jpy: number    // 推奨販売価格（円）
  recommended_price_usd: number    // 推奨販売価格（USD）
}

/**
 * サービスタイプ別マージン率
 * 
 * Standard: 30%マージン（1.3倍）
 * Express:  50%マージン（1.5倍）
 * Economy:  20%マージン（1.2倍）
 */
const MARGIN_RATES: Record<string, number> = {
  'Standard': 1.3,
  'Express': 1.5,
  'Economy': 1.2
}

const USD_JPY_RATE = 154.32

/**
 * サービスタイプに応じたマージンを計算
 * 
 * @param baseRateJpy 基本料金（原価・円）
 * @param serviceType サービスタイプ（Express/Standard/Economy）
 * @returns マージン計算結果
 * 
 * @example
 * const result = calculateMargin(1000, 'Express')
 * // => { 
 * //   base_rate_jpy: 1000,
 * //   margin_rate: 1.5,
 * //   margin_amount_jpy: 500,
 * //   recommended_price_jpy: 1500,
 * //   recommended_price_usd: 9.72
 * // }
 */
export function calculateMargin(
  baseRateJpy: number,
  serviceType: string
): MarginCalculationResult {
  // マージン率を取得（デフォルトは1.2倍）
  const marginRate = MARGIN_RATES[serviceType] || 1.2
  
  // 推奨販売価格を計算（四捨五入）
  const recommendedPriceJpy = Math.round(baseRateJpy * marginRate)
  
  // マージン額を計算
  const marginAmountJpy = recommendedPriceJpy - baseRateJpy
  
  // USD換算
  const recommendedPriceUsd = parseFloat((recommendedPriceJpy / USD_JPY_RATE).toFixed(2))
  
  return {
    base_rate_jpy: baseRateJpy,
    margin_rate: marginRate,
    margin_amount_jpy: marginAmountJpy,
    recommended_price_jpy: recommendedPriceJpy,
    recommended_price_usd: recommendedPriceUsd
  }
}

/**
 * 既存データにマージン情報を追加（非破壊的）
 * 
 * @param data 元データ（base_rate_jpy と service_type を持つ）
 * @returns 元データ + margin プロパティ
 * 
 * @example
 * const original = { base_rate_jpy: 1000, service_type: 'Express', country: 'US' }
 * const enriched = enrichWithMargin(original)
 * // => { 
 * //   base_rate_jpy: 1000, 
 * //   service_type: 'Express', 
 * //   country: 'US',
 * //   margin: { ... }
 * // }
 */
export function enrichWithMargin<T extends { 
  base_rate_jpy: number
  service_type: string 
}>(data: T): T & { margin: MarginCalculationResult } {
  return {
    ...data,
    margin: calculateMargin(data.base_rate_jpy, data.service_type)
  }
}

/**
 * 配列データに一括でマージン情報を追加
 * 
 * @param dataArray データ配列
 * @returns マージン情報付きデータ配列
 * 
 * @example
 * const results = [
 *   { base_rate_jpy: 1000, service_type: 'Express' },
 *   { base_rate_jpy: 800, service_type: 'Standard' }
 * ]
 * const enriched = enrichArrayWithMargin(results)
 * // 各要素に margin プロパティが追加される
 */
export function enrichArrayWithMargin<T extends { 
  base_rate_jpy: number
  service_type: string 
}>(dataArray: T[]): Array<T & { margin: MarginCalculationResult }> {
  return dataArray.map(enrichWithMargin)
}

/**
 * マージン率を取得（表示用）
 * 
 * @param serviceType サービスタイプ
 * @returns マージンのパーセンテージ（例: 50 for 50%）
 */
export function getMarginPercentage(serviceType: string): number {
  const rate = MARGIN_RATES[serviceType] || 1.2
  return Math.round((rate - 1) * 100)
}

/**
 * サービスタイプに応じた推奨価格を直接計算（簡易版）
 * 
 * @param baseRateJpy 基本料金
 * @param serviceType サービスタイプ
 * @returns 推奨販売価格（円）
 */
export function getRecommendedPrice(baseRateJpy: number, serviceType: string): number {
  const marginRate = MARGIN_RATES[serviceType] || 1.2
  return Math.round(baseRateJpy * marginRate)
}
