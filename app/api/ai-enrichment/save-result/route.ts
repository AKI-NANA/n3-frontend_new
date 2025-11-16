// app/api/ai-enrichment/save-result/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AIEnrichmentResult {
  productId: number
  dimensions: {
    weight_g: number
    length_cm: number
    width_cm: number
    height_cm: number
    verification_source?: string
    confidence?: string
  }
  hts_candidates: Array<{
    code: string
    description: string
    reasoning: string
    confidence: number
  }>
  origin_country: {
    code: string
    name: string
    reasoning: string
  }
  english_title: string
  title_reasoning?: string
}

/**
 * AI強化結果の検証・保存API（Supabase関税率取得版）
 */
export async function POST(request: NextRequest) {
  try {
    const result: AIEnrichmentResult = await request.json()

    console.log('🤖 AI強化結果の検証開始')
    console.log('  productId:', result.productId)

    // 1. HTSコード検証（Supabaseから直接取得）
    const topHtsCandidate = result.hts_candidates[0]
    
    console.log('🔍 Supabaseから関税率を取得中...')
    console.log('  HTSコード:', topHtsCandidate.code)
    console.log('  原産国:', result.origin_country.code)
    
    // customs_dutiesテーブルから関税率を取得
    const { data: dutyData, error: dutyError } = await supabase
      .from('customs_duties')
      .select('*')
      .eq('hts_code', topHtsCandidate.code)
      .eq('origin_country', result.origin_country.code)
      .single()

    if (dutyError || !dutyData) {
      console.warn('⚠️ customs_dutiesに該当データなし、hs_codes_by_countryから検索...')
      
      // フォールバック: hs_codes_by_countryから取得
      const { data: htsData, error: htsError } = await supabase
        .from('hs_codes_by_country')
        .select('*')
        .eq('hts_code', topHtsCandidate.code)
        .eq('country_code', result.origin_country.code)
        .single()

      if (htsError || !htsData) {
        return NextResponse.json({
          success: false,
          error: 'HTSコードと原産国の組み合わせがデータベースに存在しません',
          details: `${topHtsCandidate.code} × ${result.origin_country.code}`,
          suggestion: 'Supabaseにデータを追加するか、別のHTSコードを選択してください'
        }, { status: 400 })
      }

      // hs_codes_by_countryのデータを使用
      var totalDutyRate = (htsData.base_duty || 0) + (htsData.section301_rate || 0)
      var baseDuty = htsData.base_duty || 0
      var section301Rate = htsData.section301_rate || 0
      
      console.log('✅ hs_codes_by_countryから取得')
      console.log('  基本関税:', (baseDuty * 100).toFixed(2) + '%')
      console.log('  Section 301:', (section301Rate * 100).toFixed(2) + '%')
      console.log('  総関税率:', (totalDutyRate * 100).toFixed(2) + '%')
      
    } else {
      // customs_dutiesのデータを使用（より詳細）
      var totalDutyRate = dutyData.total_duty_rate || 0
      var baseDuty = dutyData.base_duty || 0
      var section301Rate = dutyData.section301_rate || 0
      
      console.log('✅ customs_dutiesから取得（優先）')
      console.log('  基本関税:', (baseDuty * 100).toFixed(2) + '%')
      console.log('  Section 301:', (section301Rate * 100).toFixed(2) + '%')
      console.log('  総関税率:', (totalDutyRate * 100).toFixed(2) + '%')
    }

    // 2. 商品データ更新
    const { data: product } = await supabase
      .from('products_master')
      .select('listing_data, ebay_api_data, price_jpy')
      .eq('id', result.productId)
      .single()

    const existingListingData = product?.listing_data || {}

    const updatedListingData = {
      ...existingListingData,
      // 寸法データ
      weight_g: result.dimensions.weight_g,
      length_cm: result.dimensions.length_cm,
      width_cm: result.dimensions.width_cm,
      height_cm: result.dimensions.height_cm,
      // HTS情報
      hts_code: topHtsCandidate.code,
      hts_description: topHtsCandidate.description,
      origin_country: result.origin_country.code,
      origin_country_name: result.origin_country.name,
      // Supabaseから取得した関税率
      duty_rate: totalDutyRate,
      base_duty: baseDuty,
      section301_rate: section301Rate,
      // AI判定の信頼度
      ai_confidence: {
        hts_code: topHtsCandidate.confidence,
        origin_country: result.origin_country.reasoning,
        dimensions: result.dimensions.confidence || 'unknown',
        verification_source: result.dimensions.verification_source,
        enriched_at: new Date().toISOString()
      },
      // HTS候補（全3つ保存）
      hts_alternatives: result.hts_candidates.map(c => ({
        code: c.code,
        description: c.description,
        confidence: c.confidence
      }))
    }

    const { error: updateError } = await supabase
      .from('products_master')
      .update({
        english_title: result.english_title,
        listing_data: updatedListingData,
        // HTSデータを専用カラムにも保存
        hts_code: topHtsCandidate.code,
        origin_country: result.origin_country.code,
        duty_rate: totalDutyRate,
        base_duty_rate: baseDuty,
        additional_duty_rate: section301Rate,
        updated_at: new Date().toISOString()
      })
      .eq('id', result.productId)

    if (updateError) {
      console.error('❌ DB更新エラー:', updateError)
      return NextResponse.json({
        success: false,
        error: 'DB更新失敗',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('✅ 商品データ更新完了')

    // 3. DDP計算を自動実行
    const ddpResult = await executeDDPCalculation(result, {
      productId: result.productId,
      costJPY: product?.listing_data?.cost_jpy || product?.price_jpy || 0,
      dutyRate: totalDutyRate,
      ebayApiData: product?.ebay_api_data
    })

    return NextResponse.json({
      success: true,
      productId: result.productId,
      verification: {
        hts_code: topHtsCandidate.code,
        origin_country: result.origin_country.code,
        duty_rate: totalDutyRate,
        base_duty: baseDuty,
        section301_rate: section301Rate,
        validated: true,
        data_source: dutyData ? 'customs_duties' : 'hs_codes_by_country'
      },
      saved: {
        english_title: result.english_title,
        dimensions: result.dimensions,
        hts_code: topHtsCandidate.code,
        duty_rate: totalDutyRate
      },
      ddp_calculation: ddpResult
    })

  } catch (error: any) {
    console.error('❌ AI強化結果保存エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// DDP計算を実行
async function executeDDPCalculation(
  result: AIEnrichmentResult, 
  context: {
    productId: number
    costJPY: number
    dutyRate: number
    ebayApiData: any
  }
) {
  try {
    console.log('📊 DDP計算を自動実行中...')

    const ddpResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ebay-intl-pricing/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: context.productId,
        costJPY: context.costJPY,
        weightKg: result.dimensions.weight_g / 1000,
        lengthCm: result.dimensions.length_cm,
        widthCm: result.dimensions.width_cm,
        heightCm: result.dimensions.height_cm,
        hsCode: result.hts_candidates[0].code,
        categoryId: context.ebayApiData?.category_id || 293,
        condition: 'New',
        originCountry: result.origin_country.code,
        targetCountries: ['US', 'UK', 'AU', 'CA', 'DE', 'FR', 'JP']
      })
    })

    if (ddpResponse.ok) {
      const ddpResult = await ddpResponse.json()
      console.log('✅ DDP計算完了')
      return {
        success: true,
        pricing: ddpResult.pricing,
        breakeven: ddpResult.breakeven_prices
      }
    } else {
      console.error('❌ DDP計算API失敗')
      return { success: false, error: 'DDP計算API失敗' }
    }

  } catch (error) {
    console.error('❌ DDP計算エラー:', error)
    return { success: false, error: String(error) }
  }
}
