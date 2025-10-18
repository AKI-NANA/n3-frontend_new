/**
 * eBay Rate Table生成ユーティリティ
 * 
 * 目的:
 * - ebay_shipping_masterから推奨価格を使用してRate Tableを生成
 * - Standard/Express/Economy の3種類を作成
 * - USA以外の国際配送用（USAはDDP専用ポリシー）
 */

import { supabase } from '@/lib/supabase'

export interface RateTableEntry {
  rate_table_name: string
  weight_from_kg: number
  weight_to_kg: number
  country_code: string
  country_name: string
  zone_code: string
  recommended_price_usd: number
  additional_item_usd: number
  service_code: string
  service_name: string
}

export interface RateTableGenerationResult {
  success: boolean
  rate_table_name: string
  entries_created: number
  countries_count: number
  weight_ranges_count: number
  error?: string
}

/**
 * Rate Table生成（Standard）
 */
export async function generateRateTableStandard(): Promise<RateTableGenerationResult> {
  return generateRateTable('Standard', 'RT_Standard')
}

/**
 * Rate Table生成（Express）
 */
export async function generateRateTableExpress(): Promise<RateTableGenerationResult> {
  return generateRateTable('Express', 'RT_Express')
}

/**
 * Rate Table生成（Economy）
 */
export async function generateRateTableEconomy(): Promise<RateTableGenerationResult> {
  return generateRateTable('Economy', 'RT_Economy')
}

/**
 * Rate Table生成（共通ロジック）
 */
async function generateRateTable(
  serviceType: string,
  rateTableName: string
): Promise<RateTableGenerationResult> {
  try {
    console.log(`🔄 ${rateTableName} 生成開始...`)

    // 既存データを削除
    const { error: deleteError } = await supabase
      .from('ebay_rate_table_entries')
      .delete()
      .eq('rate_table_name', rateTableName)

    if (deleteError) {
      throw new Error(`既存データ削除エラー: ${deleteError.message}`)
    }

    // マスターデータから取得（USA以外）
    const { data: masterData, error: fetchError } = await supabase
      .from('ebay_shipping_master')
      .select('*')
      .eq('service_type', serviceType)
      .neq('country_code', 'US')  // USA除外
      .order('country_code')
      .order('weight_from_kg')

    if (fetchError) {
      throw new Error(`マスターデータ取得エラー: ${fetchError.message}`)
    }

    if (!masterData || masterData.length === 0) {
      throw new Error(`${serviceType}のデータが見つかりません`)
    }

    console.log(`📦 ${serviceType}: ${masterData.length}件のデータ取得`)

    // Rate Table形式に変換
    const entries: RateTableEntry[] = masterData.map(row => ({
      rate_table_name: rateTableName,
      weight_from_kg: parseFloat(row.weight_from_kg),
      weight_to_kg: parseFloat(row.weight_to_kg),
      country_code: row.country_code,
      country_name: row.country_name_ja || row.country_name_en || row.country_code,
      zone_code: row.country_code, // ゾーンコード = 国コード
      recommended_price_usd: parseFloat(row.shipping_cost_with_margin_usd),
      additional_item_usd: parseFloat(row.shipping_cost_with_margin_usd), // 追加アイテムも同額
      service_code: row.service_code,
      service_name: row.service_name
    }))

    // 統計情報を計算
    const countriesSet = new Set(entries.map(e => e.country_code))
    const weightRangesSet = new Set(entries.map(e => `${e.weight_from_kg}-${e.weight_to_kg}`))

    console.log(`✅ 変換完了: ${entries.length}件`)
    console.log(`   - 国数: ${countriesSet.size}`)
    console.log(`   - 重量帯: ${weightRangesSet.size}`)

    // データベースに挿入（バッチ処理）
    const batchSize = 1000
    let totalInserted = 0

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('ebay_rate_table_entries')
        .insert(batch)

      if (insertError) {
        throw new Error(`データ挿入エラー (batch ${i / batchSize + 1}): ${insertError.message}`)
      }

      totalInserted += batch.length
      console.log(`💾 ${totalInserted}/${entries.length}件 保存完了`)
    }

    console.log(`🎉 ${rateTableName} 生成完了！`)

    return {
      success: true,
      rate_table_name: rateTableName,
      entries_created: entries.length,
      countries_count: countriesSet.size,
      weight_ranges_count: weightRangesSet.size
    }

  } catch (error) {
    console.error(`❌ ${rateTableName} 生成エラー:`, error)
    return {
      success: false,
      rate_table_name: rateTableName,
      entries_created: 0,
      countries_count: 0,
      weight_ranges_count: 0,
      error: (error as Error).message
    }
  }
}

/**
 * 全Rate Table生成
 */
export async function generateAllRateTables(): Promise<{
  success: boolean
  results: RateTableGenerationResult[]
  total_entries: number
}> {
  console.log('🚀 全Rate Table生成開始...')

  const results = await Promise.all([
    generateRateTableStandard(),
    generateRateTableExpress(),
    generateRateTableEconomy()
  ])

  const success = results.every(r => r.success)
  const total_entries = results.reduce((sum, r) => sum + r.entries_created, 0)

  console.log(success ? '✅ 全Rate Table生成完了！' : '⚠️ 一部のRate Tableでエラー')
  console.log(`📊 合計: ${total_entries}件`)

  return {
    success,
    results,
    total_entries
  }
}

/**
 * Rate Table統計情報取得
 */
export async function getRateTableStats() {
  const { data, error } = await supabase
    .from('ebay_rate_table_entries')
    .select('rate_table_name, country_code, weight_from_kg, weight_to_kg')

  if (error) {
    throw new Error(`統計取得エラー: ${error.message}`)
  }

  const stats = {
    RT_Standard: {
      entries: 0,
      countries: new Set<string>(),
      weight_ranges: new Set<string>()
    },
    RT_Express: {
      entries: 0,
      countries: new Set<string>(),
      weight_ranges: new Set<string>()
    },
    RT_Economy: {
      entries: 0,
      countries: new Set<string>(),
      weight_ranges: new Set<string>()
    }
  }

  data?.forEach(row => {
    const tableName = row.rate_table_name as 'RT_Standard' | 'RT_Express' | 'RT_Economy'
    if (stats[tableName]) {
      stats[tableName].entries++
      stats[tableName].countries.add(row.country_code)
      stats[tableName].weight_ranges.add(`${row.weight_from_kg}-${row.weight_to_kg}`)
    }
  })

  return {
    RT_Standard: {
      entries: stats.RT_Standard.entries,
      countries: stats.RT_Standard.countries.size,
      weight_ranges: stats.RT_Standard.weight_ranges.size
    },
    RT_Express: {
      entries: stats.RT_Express.entries,
      countries: stats.RT_Express.countries.size,
      weight_ranges: stats.RT_Express.weight_ranges.size
    },
    RT_Economy: {
      entries: stats.RT_Economy.entries,
      countries: stats.RT_Economy.countries.size,
      weight_ranges: stats.RT_Economy.weight_ranges.size
    },
    total: data?.length || 0
  }
}

/**
 * Rate Table内容取得（プレビュー用）
 */
export async function getRateTablePreview(
  rateTableName: string,
  limit: number = 50
) {
  const { data, error } = await supabase
    .from('ebay_rate_table_entries')
    .select('*')
    .eq('rate_table_name', rateTableName)
    .order('country_code')
    .order('weight_from_kg')
    .limit(limit)

  if (error) {
    throw new Error(`プレビュー取得エラー: ${error.message}`)
  }

  return data
}
