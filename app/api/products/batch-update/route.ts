// app/api/products/batch-update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ProductUpdate {
  sku: string
  // 基本データ
  english_title?: string
  hts_code?: string
  hts_confidence?: string
  origin_country?: string
  material?: string
  length_cm?: number
  width_cm?: number
  height_cm?: number
  weight_g?: number
  // 関税データ
  hts_duty_rate?: number
  origin_country_duty_rate?: number
  material_duty_rate?: number
  // 市場調査データ
  f_price_premium?: number
  f_community_score?: number
  c_supply_japan?: number
  c_supply_trend?: string
  s_flag_discontinued?: string
}

interface BatchUpdateResult {
  sku: string
  success: boolean
  error?: string
  product_id?: number
}

/**
 * 商品データ一括更新API（BULK UPSERT方式）
 * 
 * SKUをキーとして、複数商品を一括で更新します。
 * - 存在する商品のみ更新
 * - 一部失敗しても成功分はコミット
 * - エラーは個別に記録
 */
export async function POST(request: NextRequest) {
  try {
    const { updates }: { updates: ProductUpdate[] } = await request.json()

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: '更新データが必要です' },
        { status: 400 }
      )
    }

    console.log(`📦 一括更新開始: ${updates.length}件`)

    const results: BatchUpdateResult[] = []
    let succeeded = 0
    let failed = 0

    // 各商品を個別に処理（部分コミット方式）
    for (const update of updates) {
      try {
        // 1. バリデーション
        const validationError = validateUpdate(update)
        if (validationError) {
          results.push({
            sku: update.sku,
            success: false,
            error: validationError
          })
          failed++
          continue
        }

        // 2. SKUで商品を検索
        console.log(`🔍 SKU検索: ${update.sku}`)
        const { data: existingProduct, error: findError } = await supabase
          .from('products_master')
          .select('id, sku, listing_data')
          .eq('sku', update.sku)
          .single()

        console.log('  検索結果:', existingProduct)
        console.log('  エラー:', findError)

        if (findError || !existingProduct) {
          console.error(`❌ SKU「${update.sku}」が見つかりません`)
          results.push({
            sku: update.sku,
            success: false,
            error: `SKU「${update.sku}」が見つかりません`
          })
          failed++
          continue
        }

        const product = existingProduct

        // 3. UPDATE実行
        const updateData: any = {
          updated_at: new Date().toISOString()
        }

        // 基本データフィールド
        if (update.english_title !== undefined) {
          updateData.english_title = update.english_title
        }
        if (update.hts_code !== undefined) {
          updateData.hts_code = update.hts_code
        }
        if (update.hts_confidence !== undefined) {
          updateData.hts_confidence = update.hts_confidence
        }
        if (update.origin_country !== undefined) {
          updateData.origin_country = update.origin_country
        }
        if (update.material !== undefined) {
          updateData.material = update.material
        }

        // サイズ・重量はlisting_dataに保存（カラムがない場合）
        const existingListingData = product?.listing_data || {}
        const sizeWeightData: any = {}
        
        if (update.length_cm !== undefined) {
          sizeWeightData.length_cm = update.length_cm
        }
        if (update.width_cm !== undefined) {
          sizeWeightData.width_cm = update.width_cm
        }
        if (update.height_cm !== undefined) {
          sizeWeightData.height_cm = update.height_cm
        }
        if (update.weight_g !== undefined) {
          sizeWeightData.weight_g = update.weight_g
        }

        // 関税率データもlisting_dataに
        if (update.hts_duty_rate !== undefined) {
          sizeWeightData.hts_duty_rate = update.hts_duty_rate
        }
        if (update.origin_country_duty_rate !== undefined) {
          sizeWeightData.origin_country_duty_rate = update.origin_country_duty_rate
        }
        if (update.material_duty_rate !== undefined) {
          sizeWeightData.material_duty_rate = update.material_duty_rate
        }

        // 市場調査データはlisting_data.market_researchに保存
        const marketResearchData: any = {}
        if (update.f_price_premium !== undefined) {
          marketResearchData.f_price_premium = update.f_price_premium
        }
        if (update.f_community_score !== undefined) {
          marketResearchData.f_community_score = update.f_community_score
        }
        if (update.c_supply_japan !== undefined) {
          marketResearchData.c_supply_japan = update.c_supply_japan
        }
        if (update.c_supply_trend !== undefined) {
          marketResearchData.c_supply_trend = update.c_supply_trend
        }
        if (update.s_flag_discontinued !== undefined) {
          marketResearchData.s_flag_discontinued = update.s_flag_discontinued
        }

        // listing_dataを統合して更新
        if (Object.keys(sizeWeightData).length > 0 || Object.keys(marketResearchData).length > 0) {
          updateData.listing_data = {
            ...existingListingData,
            ...sizeWeightData, // サイズ・重量・関税率をルートに
            market_research: Object.keys(marketResearchData).length > 0 ? {
              ...(existingListingData.market_research || {}),
              ...marketResearchData,
              last_updated: new Date().toISOString()
            } : existingListingData.market_research
          }
        }

        const { error: updateError } = await supabase
          .from('products_master')
          .update(updateData)
          .eq('id', existingProduct.id)

        if (updateError) {
          throw updateError
        }

        results.push({
          sku: update.sku,
          success: true,
          product_id: existingProduct.id
        })
        succeeded++

        console.log(`  ✅ ${update.sku} 更新成功`)

      } catch (error: any) {
        results.push({
          sku: update.sku,
          success: false,
          error: error.message || '更新に失敗しました'
        })
        failed++
        console.error(`  ❌ ${update.sku} 更新失敗:`, error.message)
      }
    }

    console.log(`📊 一括更新完了: 成功 ${succeeded}件、失敗 ${failed}件`)

    return NextResponse.json({
      success: true,
      total: updates.length,
      succeeded,
      failed,
      results
    })

  } catch (error: any) {
    console.error('❌ 一括更新エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * データバリデーション
 */
function validateUpdate(update: ProductUpdate): string | null {
  // SKU必須
  if (!update.sku || update.sku.trim() === '') {
    return 'SKUは必須です'
  }

  // HTSコードは10桁（入力されている場合のみ）
  if (update.hts_code && !/^\d{4}\.\d{2}\.\d{2}\.\d{2}$/.test(update.hts_code)) {
    return `HTSコードの形式が不正です: ${update.hts_code}（正しい形式: 9504.40.00.00）`
  }

  // HTS信頼度は指定値のみ
  if (update.hts_confidence && !['high', 'medium', 'low', 'uncertain'].includes(update.hts_confidence)) {
    return `HTS信頼度の値が不正です: ${update.hts_confidence}（許可値: high, medium, low, uncertain）`
  }

  // 原産国は2文字（入力されている場合のみ）
  if (update.origin_country && !/^[A-Z]{2}$/.test(update.origin_country)) {
    return `原産国コードの形式が不正です: ${update.origin_country}（正しい形式: JP, CN, US等の2文字）`
  }

  // 数値フィールドは正の値
  const numericFields = [
    { key: 'length_cm', label: '長さ' },
    { key: 'width_cm', label: '幅' },
    { key: 'height_cm', label: '高さ' },
    { key: 'weight_g', label: '重さ' }
  ]

  for (const field of numericFields) {
    const value = (update as any)[field.key]
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number' || value < 0) {
        return `${field.label}は0以上の数値である必要があります: ${value}`
      }
    }
  }

  return null
}
