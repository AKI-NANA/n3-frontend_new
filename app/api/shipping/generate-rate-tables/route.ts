import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 設定
const EXCHANGE_RATE = 150
const MULTIPLIER = 2.2

// 商品価格帯（15段階）
const PRICE_RANGES = [
  { min: 0, max: 50 },
  { min: 50, max: 100 },
  { min: 100, max: 150 },
  { min: 150, max: 200 },
  { min: 200, max: 300 },
  { min: 300, max: 400 },
  { min: 400, max: 500 },
  { min: 500, max: 600 },
  { min: 600, max: 750 },
  { min: 750, max: 1000 },
  { min: 1000, max: 1500 },
  { min: 1500, max: 2000 },
  { min: 2000, max: 2500 },
  { min: 2500, max: 3000 },
  { min: 3000, max: 999999 }
]

// 関税率（16段階）
const TARIFF_RATES = [
  0.00, 0.05, 0.075, 0.10, 0.125, 0.15, 0.175, 0.20,
  0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.60, 0.70
]

export async function POST() {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let count = 0
        let successCount = 0
        let errorCount = 0
        const total = PRICE_RANGES.length * TARIFF_RATES.length
        const errors: string[] = []

        console.log('=== Rate Table Generation Started ===')
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('Using Service Role Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

        for (const priceRange of PRICE_RANGES) {
          for (const tariffRate of TARIFF_RATES) {
            count++
            
            // 進捗送信
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                progress: true,
                current: count,
                total,
                message: `Price$${priceRange.min}-${priceRange.max} × Tariff${(tariffRate * 100).toFixed(1)}%`
              })}\n\n`)
            )

            // Rate Table生成
            const avgPrice = (priceRange.min + priceRange.max) / 2
            const ddpCost = avgPrice * tariffRate

            const rateTableName = `RT_Price$${priceRange.min}-${priceRange.max}_Tariff${(tariffRate * 100).toFixed(1)}%`

            // DBに保存
            const { data, error } = await supabase
              .from('ebay_rate_tables')
              .insert({
                name: rateTableName,
                price_min: priceRange.min,
                price_max: priceRange.max,
                tariff_rate: tariffRate,
                calculated_ddp_cost: ddpCost,
                exchange_rate: EXCHANGE_RATE,
                multiplier: MULTIPLIER,
                description: `Products $${priceRange.min}-$${priceRange.max} with ${(tariffRate * 100).toFixed(1)}% tariff`
              })
              .select()

            if (error) {
              console.error(`❌ Insert error [${count}/${total}]:`, error)
              errorCount++
              errors.push(`${rateTableName}: ${error.message}`)
              
              // 最初のエラーをストリームに送信
              if (errorCount === 1) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    error: true,
                    message: `Database error: ${error.message}`,
                    code: error.code,
                    details: error.details
                  })}\n\n`)
                )
              }
            } else {
              successCount++
              if (successCount === 1) {
                console.log('✅ First successful insert:', data)
              }
            }

            // 少し待機（負荷軽減）
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }

        console.log('=== Rate Table Generation Complete ===')
        console.log('Total:', count)
        console.log('Success:', successCount)
        console.log('Errors:', errorCount)

        if (errorCount > 0) {
          console.log('Error samples:', errors.slice(0, 3))
        }

        // 完了送信
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            complete: true,
            count,
            success: successCount,
            errors: errorCount,
            errorSamples: errors.slice(0, 3)
          })}\n\n`)
        )

        controller.close()
      } catch (error: any) {
        console.error('Fatal error:', error)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            error: true,
            message: error.message,
            stack: error.stack
          })}\n\n`)
        )
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
