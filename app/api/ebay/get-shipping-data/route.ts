// app/api/ebay/get-shipping-data/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = createClient()

    // 1. 送料計算データ取得（ZONE別）
    const { data: shippingRates } = await supabase
      .from('shipping_rates')
      .select('*')
      .order('weight_from_g')

    // 2. サービス情報
    const { data: services } = await supabase
      .from('shipping_services')
      .select('*')

    // 3. ゾーン情報
    const { data: zones } = await supabase
      .from('shipping_zones')
      .select('*')

    // 4. HSコードと関税率
    const { data: hsCodes } = await supabase
      .from('hs_codes')
      .select('code, description, base_duty, section301, section301_rate')
      .order('base_duty', { ascending: false })

    // 5. 送料データをZONE・重量別に整理
    const ratesByZoneWeight = shippingRates?.reduce((acc: any, rate: any) => {
      const zoneId = rate.zone_id
      const weightKg = {
        from: rate.weight_from_g / 1000,
        to: rate.weight_to_g / 1000
      }
      
      if (!acc[zoneId]) {
        acc[zoneId] = []
      }
      
      acc[zoneId].push({
        weightFrom: weightKg.from,
        weightTo: weightKg.to,
        costJPY: rate.base_price_jpy,
        costUSD: (rate.base_price_jpy / 150).toFixed(2),
        serviceId: rate.service_id
      })
      
      return acc
    }, {}) || {}

    // 6. 関税率の分析（中国+Section301で最大75%まで）
    const tariffAnalysis = hsCodes?.map((hs: any) => {
      const maxRate = hs.section301 
        ? hs.base_duty + (hs.section301_rate || 0.25)
        : hs.base_duty
      return {
        code: hs.code,
        description: hs.description?.substring(0, 50),
        baseRate: hs.base_duty,
        maxRate: maxRate,
        isSection301: hs.section301
      }
    }) || []

    const maxTariff = Math.max(...tariffAnalysis.map(t => t.maxRate), 0)

    // 7. 関税率の分布（実際の範囲に基づく）
    const tariffDistribution = {
      '0-5%': tariffAnalysis.filter(t => t.maxRate <= 0.05).length,
      '5-10%': tariffAnalysis.filter(t => t.maxRate > 0.05 && t.maxRate <= 0.10).length,
      '10-15%': tariffAnalysis.filter(t => t.maxRate > 0.10 && t.maxRate <= 0.15).length,
      '15-25%': tariffAnalysis.filter(t => t.maxRate > 0.15 && t.maxRate <= 0.25).length,
      '25-50%': tariffAnalysis.filter(t => t.maxRate > 0.25 && t.maxRate <= 0.50).length,
      '50%以上': tariffAnalysis.filter(t => t.maxRate > 0.50).length,
    }

    return NextResponse.json({
      shipping: {
        byZone: ratesByZoneWeight,
        zones: zones || [],
        services: services || [],
        zonesCount: Object.keys(ratesByZoneWeight).length,
        weightRangesCount: shippingRates?.length || 0
      },
      tariffs: {
        maxRate: maxTariff,
        maxRatePercent: (maxTariff * 100).toFixed(1) + '%',
        distribution: tariffDistribution,
        topRates: tariffAnalysis.slice(0, 20)
      },
      summary: {
        zonesCount: Object.keys(ratesByZoneWeight).length,
        hsCodesCount: hsCodes?.length || 0,
        maxTariffRate: (maxTariff * 100).toFixed(1) + '%',
        shippingRatesCount: shippingRates?.length || 0
      }
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
