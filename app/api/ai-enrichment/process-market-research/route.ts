import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface MarketResearchResult {
  product_id: string
  sku: string
  status: string
  basic_info: {
    title_en_new: string
    title_en_used: string
    hts_code: string
    hts_description: string
    origin_country: string
    origin_source: string
    customs_rate: number
    length_cm: number
    width_cm: number
    height_cm: number
    weight_g: number
  }
  market_research: any
  data_completion: any
  notes: string
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const result: MarketResearchResult = Array.isArray(data) ? data[0] : data

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🤖 AI市場調査結果の自動処理開始')
    console.log('  商品ID:', result.product_id)
    console.log('  SKU:', result.sku)

    const productId = parseInt(result.product_id)
    if (isNaN(productId)) {
      return NextResponse.json({ success: false, error: '無効な商品ID' }, { status: 400 })
    }

    // 商品データ取得
    const { data: product, error: fetchError } = await supabase
      .from('products_master')
      .select('*')
      .eq('id', productId)
      .single()

    if (fetchError || !product) {
      console.error('❌ 商品取得エラー:', fetchError)
      return NextResponse.json({ success: false, error: '商品が見つかりません' }, { status: 404 })
    }

    console.log('✅ 既存商品データ取得完了')

    // 関税率検証
    const { data: dutyData } = await supabase
      .from('customs_duties')
      .select('*')
      .eq('hts_code', result.basic_info.hts_code)
      .eq('origin_country', result.basic_info.origin_country)
      .single()

    let totalDutyRate = result.basic_info.customs_rate / 100
    let baseDuty = totalDutyRate
    let section301Rate = 0

    if (dutyData) {
      totalDutyRate = dutyData.total_duty_rate || totalDutyRate
      baseDuty = dutyData.base_duty || baseDuty
      section301Rate = dutyData.section301_rate || 0
      console.log('✅ customs_dutiesから関税率取得')
    } else {
      console.log('⚠️  AI提供の関税率を使用')
    }

    console.log('  基本関税:', (baseDuty * 100).toFixed(2) + '%')
    console.log('  総関税率:', (totalDutyRate * 100).toFixed(2) + '%')

    // listing_dataの更新
    const existingListingData = product.listing_data || {}
    const updatedListingData = {
      ...existingListingData,
      // 寸法データ
      weight_g: result.basic_info.weight_g,
      length_cm: result.basic_info.length_cm,
      width_cm: result.basic_info.width_cm,
      height_cm: result.basic_info.height_cm,
      // HTS情報
      hts_code: result.basic_info.hts_code,
      hts_description: result.basic_info.hts_description,
      origin_country: result.basic_info.origin_country,
      origin_source: result.basic_info.origin_source,
      // 関税情報
      duty_rate: totalDutyRate,
      base_duty: baseDuty,
      section301_rate: section301Rate,
      // 市場調査データ
      market_research: {
        ...result.market_research,
        enriched_at: new Date().toISOString()
      },
      data_completion: result.data_completion,
      ai_notes: result.notes
    }

    // products_master更新（listing_dataのみ）
    console.log('💾 Supabaseを更新中...')
    const { error: updateError } = await supabase
      .from('products_master')
      .update({
        english_title: result.basic_info.title_en_new,
        listing_data: updatedListingData,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)

    if (updateError) {
      console.error('❌ Supabase更新エラー:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase更新失敗',
        details: updateError.message 
      }, { status: 500 })
    }

    console.log('✅ Supabase更新完了')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json({
      success: true,
      productId,
      sku: result.sku,
      saved: {
        basic_info: {
          english_title: result.basic_info.title_en_new,
          dimensions: {
            length_cm: result.basic_info.length_cm,
            width_cm: result.basic_info.width_cm,
            height_cm: result.basic_info.height_cm,
            weight_g: result.basic_info.weight_g
          },
          hts_code: result.basic_info.hts_code,
          origin_country: result.basic_info.origin_country,
          duty_rate: totalDutyRate
        },
        market_research: {
          f_price_premium: result.market_research.f_price_premium,
          f_community_score: result.market_research.f_community_score,
          c_supply_japan: result.market_research.c_supply_japan,
          s_flag_discontinued: result.market_research.s_flag_discontinued
        }
      },
      verification: {
        hts_validated: !!dutyData,
        duty_source: dutyData ? 'customs_duties' : 'ai_provided',
        data_completion: result.data_completion
      },
      message: '市場調査データをSupabaseに保存しました'
    })
  } catch (error: any) {
    console.error('❌ 処理エラー:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    endpoint: '/api/ai-enrichment/process-market-research',
    method: 'POST',
    description: 'AI生成の市場調査結果を自動的にSupabaseに保存します'
  })
}
