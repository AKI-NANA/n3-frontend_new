import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// 標準60重量帯の定義
const STANDARD_WEIGHT_RANGES = [
  // 0-10kg: 0.25kg刻み (40段階)
  ...Array.from({ length: 40 }, (_, i) => ({
    from: i * 0.25,
    to: (i + 1) * 0.25
  })),
  // 10-20kg: 0.5kg刻み (20段階)
  ...Array.from({ length: 20 }, (_, i) => ({
    from: 10 + i * 0.5,
    to: 10 + (i + 1) * 0.5
  }))
].slice(0, 60)

// アフリカ諸国リスト (56カ国)
const AFRICAN_COUNTRIES = [
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD',
  'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA',
  'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW',
  'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE',
  'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ',
  'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW'
]

/**
 * 重量に最も近いマスターデータを検索
 */
async function findClosestPrice(
  supabase: any,
  serviceType: string,
  countryCode: string,
  weightFrom: number,
  weightTo: number
) {
  const { data, error } = await supabase
    .from('ebay_shipping_master')
    .select('recommended_price_usd, additional_item_usd')
    .eq('service_type', serviceType)
    .eq('country_code', countryCode)
    .gte('weight_to_kg', weightFrom)
    .order('weight_from_kg', { ascending: true })
    .limit(1)

  if (error || !data || data.length === 0) {
    return null
  }

  return {
    recommended_price_usd: parseFloat(data[0].recommended_price_usd),
    additional_item_usd: parseFloat(data[0].additional_item_usd)
  }
}

/**
 * アフリカ諸国の平均価格を計算
 */
async function calculateAfricaAveragePrice(
  supabase: any,
  serviceType: string,
  weightFrom: number,
  weightTo: number
) {
  const prices: number[] = []
  const additionals: number[] = []

  for (const countryCode of AFRICAN_COUNTRIES) {
    const pricing = await findClosestPrice(supabase, serviceType, countryCode, weightFrom, weightTo)
    if (pricing) {
      prices.push(pricing.recommended_price_usd)
      additionals.push(pricing.additional_item_usd)
    }
  }

  if (prices.length === 0) {
    return null
  }

  return {
    recommended_price_usd: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
    additional_item_usd: Math.round((additionals.reduce((a, b) => a + b, 0) / additionals.length) * 100) / 100
  }
}

/**
 * 新Rate Table生成
 */
async function generateUnifiedRateTable(supabase: any, serviceType: string) {
  const rateTableName = `RT_${serviceType}`

  console.log(`\n🔄 ${rateTableName} 生成開始...`)

  // 既存データ削除
  await supabase
    .from('ebay_rate_table_entries')
    .delete()
    .eq('rate_table_name', rateTableName)

  // 全対象国を取得（アフリカ以外、USA以外）
  const { data: allCountries } = await supabase
    .from('ebay_shipping_master')
    .select('country_code, country_name_en, country_name_ja')
    .eq('service_type', serviceType)

  if (!allCountries) {
    throw new Error('国データ取得エラー')
  }

  // アフリカとUSAを除外
  type CountryData = { country_code: string; country_name_en?: string; country_name_ja?: string }
  const uniqueCountries = Array.from(
    new Map(
      (allCountries as CountryData[])
        .filter(c => !AFRICAN_COUNTRIES.includes(c.country_code) && c.country_code !== 'US')
        .map(c => [c.country_code, c])
    ).values()
  )

  console.log(`📦 対象国数: ${uniqueCountries.length}カ国（アフリカ除く、USA除く）`)
  console.log(`📦 重量帯数: ${STANDARD_WEIGHT_RANGES.length}種類`)

  const entries: any[] = []

  // 各重量帯×各国でエントリ生成
  for (const range of STANDARD_WEIGHT_RANGES) {
    console.log(`⚖️  処理中: ${range.from}kg - ${range.to}kg`)

    // 通常国
    for (const country of uniqueCountries) {
      const pricing = await findClosestPrice(
        supabase,
        serviceType,
        country.country_code,
        range.from,
        range.to
      )

      if (pricing) {
        entries.push({
          rate_table_name: rateTableName,
          weight_from_kg: range.from,
          weight_to_kg: range.to,
          country_code: country.country_code,
          country_name: country.country_name_ja || country.country_name_en,
          zone_code: 'ZONE_GENERAL',
          recommended_price_usd: pricing.recommended_price_usd,
          additional_item_usd: pricing.additional_item_usd,
          service_code: serviceType.toUpperCase(),
          service_name: `${serviceType} Shipping`
        })
      }
    }

    // アフリカ（1つにまとめる）
    const africaPricing = await calculateAfricaAveragePrice(
      supabase,
      serviceType,
      range.from,
      range.to
    )

    if (africaPricing) {
      entries.push({
        rate_table_name: rateTableName,
        weight_from_kg: range.from,
        weight_to_kg: range.to,
        country_code: 'AFRICA',
        country_name: 'Africa (All Countries)',
        zone_code: 'ZONE_AFRICA',
        recommended_price_usd: africaPricing.recommended_price_usd,
        additional_item_usd: africaPricing.additional_item_usd,
        service_code: serviceType.toUpperCase(),
        service_name: `${serviceType} Shipping`
      })
    }
  }

  // 一括挿入（バッチ処理）
  const batchSize = 500  // 1000から500に変更
  let insertedCount = 0
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize)
    const { error: insertError } = await supabase
      .from('ebay_rate_table_entries')
      .insert(batch)

    if (insertError) {
      console.error(`❌ 挿入エラー (${i}-${i + batch.length}):`, insertError)
      throw new Error(`挿入エラー: ${insertError.message}`)
    }

    insertedCount += batch.length
    console.log(`✅ 挿入: ${insertedCount} / ${entries.length}件`)
  }

  console.log(`✅ ${rateTableName} 完了: ${entries.length}件`)
  
  return {
    success: true,
    entries_created: entries.length,
    weight_ranges: STANDARD_WEIGHT_RANGES.length,
    countries_count: uniqueCountries.length + 1 // +1 for Africa
  }
}

/**
 * POST /api/ebay/rate-tables/rebuild
 * Rate Table再構築
 */
export async function POST() {
  try {
    const supabase = createClient()

    console.log('🚀 Rate Table再構築開始\n')
    console.log('📋 設定:')
    console.log(`  - 重量帯: ${STANDARD_WEIGHT_RANGES.length}種類`)
    console.log(`  - アフリカ: ${AFRICAN_COUNTRIES.length}カ国を統合\n`)

    const results = {
      Express: await generateUnifiedRateTable(supabase, 'Express'),
      Standard: await generateUnifiedRateTable(supabase, 'Standard'),
      Economy: await generateUnifiedRateTable(supabase, 'Economy')
    }

    const totalEntries = 
      results.Express.entries_created + 
      results.Standard.entries_created + 
      results.Economy.entries_created

    console.log('\n✅ 全Rate Table生成完了！')
    console.log(`\n📊 合計: ${totalEntries}件`)

    return NextResponse.json({
      success: true,
      message: 'Rate Table再構築完了',
      results,
      totalEntries
    })

  } catch (error) {
    console.error('❌ エラー:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message 
      },
      { status: 500 }
    )
  }
}
