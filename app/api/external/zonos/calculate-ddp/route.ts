// app/api/external/zonos/calculate-ddp/route.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * Zonos DDP計算API
 * 
 * 📌 外部APIを使用してDDP（配送料込み関税）を正確に計算
 * 
 * Zonos API Documentation:
 * https://docs.zonos.com/api/landed-cost
 * 
 * INPUT:
 * - htsCode: HTSコード (10桁)
 * - originCountry: 原産国コード
 * - destinationCountry: 仕向国コード
 * - value: 商品価値（USD）
 * - shippingCost: 送料（USD）
 * - weight: 重量（kg）
 * 
 * OUTPUT:
 * - dutyAmount: 関税額（USD）
 * - taxAmount: VAT/消費税額（USD）
 * - totalDDP: DDP合計（USD）
 * - breakdown: 詳細内訳
 */

interface DDPCalculationRequest {
  htsCode: string
  originCountry: string
  destinationCountry: string
  value: number
  shippingCost?: number
  weight?: number
  quantity?: number
}

interface DDPCalculationResponse {
  success: boolean
  data?: {
    dutyAmount: number
    taxAmount: number
    totalDDP: number
    breakdown: {
      itemValue: number
      shipping: number
      duty: number
      tax: number
      total: number
    }
    dutyRate: number
    taxRate: number
  }
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<DDPCalculationResponse>> {
  try {
    const body: DDPCalculationRequest = await request.json()
    const {
      htsCode,
      originCountry,
      destinationCountry,
      value,
      shippingCost = 0,
      weight = 0,
      quantity = 1
    } = body

    // バリデーション
    if (!htsCode || !originCountry || !destinationCountry) {
      return NextResponse.json(
        { success: false, error: 'HTSコード、原産国、仕向国が必要です' },
        { status: 400 }
      )
    }

    if (!value || value <= 0) {
      return NextResponse.json(
        { success: false, error: '商品価値が必要です' },
        { status: 400 }
      )
    }

    // Zonos APIキーの確認
    const zonosApiKey = process.env.ZONOS_API_KEY
    
    if (!zonosApiKey) {
      console.warn('⚠️ ZONOS_API_KEY が設定されていません')
      
      // フォールバック: Supabaseから計算
      return await fallbackToSupabaseCalculation(body)
    }

    // Zonos Landed Cost API呼び出し
    console.log('🌐 Zonos Landed Cost API呼び出し:', {
      htsCode,
      originCountry,
      destinationCountry,
      value,
      shippingCost
    })

    const zonosResponse = await fetch('https://api.zonos.com/v1/landed-cost', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${zonosApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          hs_code: htsCode,
          origin_country: originCountry,
          quantity,
          unit_price: value,
          description: 'Product'
        }],
        destination_country: destinationCountry,
        shipping_cost: shippingCost,
        currency: 'USD'
      })
    })

    if (!zonosResponse.ok) {
      const errorText = await zonosResponse.text()
      console.error('❌ Zonos API Error:', errorText)
      
      // フォールバック
      return await fallbackToSupabaseCalculation(body)
    }

    const zonosData = await zonosResponse.json()
    
    console.log('✅ Zonos API Response:', zonosData)

    // Zonos レスポンスの解析
    const dutyAmount = zonosData.duty_amount || 0
    const taxAmount = zonosData.tax_amount || zonosData.vat_amount || 0
    const totalDDP = zonosData.landed_cost || (value + shippingCost + dutyAmount + taxAmount)

    return NextResponse.json({
      success: true,
      data: {
        dutyAmount,
        taxAmount,
        totalDDP,
        breakdown: {
          itemValue: value,
          shipping: shippingCost,
          duty: dutyAmount,
          tax: taxAmount,
          total: totalDDP
        },
        dutyRate: zonosData.duty_rate || (dutyAmount / value) || 0,
        taxRate: zonosData.tax_rate || (taxAmount / (value + dutyAmount)) || 0
      }
    })

  } catch (error: any) {
    console.error('Zonos DDP calculation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'DDP計算に失敗しました' 
      },
      { status: 500 }
    )
  }
}

/**
 * フォールバック: Supabaseデータベースから計算
 * Zonos APIが使えない場合の代替手段
 */
async function fallbackToSupabaseCalculation(
  request: DDPCalculationRequest
): Promise<NextResponse<DDPCalculationResponse>> {
  try {
    console.log('🔄 Supabase フォールバックモード')

    const { htsCode, originCountry, destinationCountry, value, shippingCost = 0 } = request

    // Supabaseから関税率を取得
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // customs_dutiesテーブルから検索
    const { data: dutyData, error } = await supabase
      .from('customs_duties')
      .select('*')
      .eq('hts_code', htsCode)
      .eq('origin_country', originCountry)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // 関税率の取得
    let dutyRate = 0
    let taxRate = 0

    if (dutyData) {
      dutyRate = dutyData.total_duty_rate || dutyData.general_duty_rate || 0
      
      // 国別のVAT/消費税率
      if (destinationCountry === 'GB') taxRate = 0.20 // UK VAT
      else if (destinationCountry === 'DE') taxRate = 0.19 // Germany VAT
      else if (destinationCountry === 'FR') taxRate = 0.20 // France VAT
      else if (destinationCountry === 'IT') taxRate = 0.22 // Italy VAT
      else if (destinationCountry === 'ES') taxRate = 0.21 // Spain VAT
      else if (destinationCountry === 'US') taxRate = 0 // USA: 連邦税なし（州税は別）
    } else {
      // データがない場合、デフォルト値
      console.warn(`⚠️ 関税データなし: ${htsCode} (${originCountry})`)
      
      // hts_codes_detailsから基本関税率を取得
      const { data: htsDetails } = await supabase
        .from('hts_codes_details')
        .select('general_rate_of_duty, special_rate_of_duty')
        .eq('hts_number', htsCode)
        .single()
      
      if (htsDetails) {
        dutyRate = htsDetails.general_rate_of_duty || 0
      } else {
        // それでもなければ、保守的に10%と仮定
        dutyRate = 0.10
      }
    }

    // DDP計算
    const dutyAmount = value * dutyRate
    const taxableAmount = value + dutyAmount
    const taxAmount = taxableAmount * taxRate
    const totalDDP = value + shippingCost + dutyAmount + taxAmount

    console.log('✅ Supabase フォールバック計算完了:', {
      dutyRate: `${(dutyRate * 100).toFixed(2)}%`,
      taxRate: `${(taxRate * 100).toFixed(2)}%`,
      totalDDP: `$${totalDDP.toFixed(2)}`
    })

    return NextResponse.json({
      success: true,
      data: {
        dutyAmount,
        taxAmount,
        totalDDP,
        breakdown: {
          itemValue: value,
          shipping: shippingCost,
          duty: dutyAmount,
          tax: taxAmount,
          total: totalDDP
        },
        dutyRate,
        taxRate
      }
    })

  } catch (error: any) {
    console.error('❌ Supabase フォールバック失敗:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'DDP計算に失敗しました: ' + error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * GET: ヘルスチェック
 */
export async function GET() {
  const hasZonosKey = !!process.env.ZONOS_API_KEY
  
  return NextResponse.json({
    service: 'Zonos DDP Calculator',
    status: hasZonosKey ? 'ready' : 'fallback_mode',
    zonosApiConfigured: hasZonosKey,
    fallbackAvailable: true
  })
}
