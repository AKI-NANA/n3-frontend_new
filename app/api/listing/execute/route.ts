// app/api/listing/execute/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { listProductToEbay } from '@/lib/ebay/inventory'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scheduleId } = body
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data: schedule, error: scheduleError } = await supabase
      .from('listing_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single()
    
    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'スケジュールが見つかりません' }, { status: 404 })
    }
    
    await supabase
      .from('listing_schedules')
      .update({ status: 'in_progress', actual_time: new Date().toISOString() })
      .eq('id', scheduleId)
    
    const { data: products, error: productsError } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .eq('listing_session_id', scheduleId.toString())
      .eq('status', 'ready_to_list')
      .order('ai_confidence_score', { ascending: false })
    
    if (productsError) throw productsError
    
    if (!products || products.length === 0) {
      await supabase
        .from('listing_schedules')
        .update({ status: 'completed', actual_count: 0 })
        .eq('id', scheduleId)
      
      return NextResponse.json({ message: '出品する商品がありません', count: 0 })
    }
    
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []
    
    const accountMap: Record<string, 'account1' | 'account2'> = {
      'account1': 'account1',
      'account2': 'account2',
      'mjt': 'account1',
      'green': 'account2'
    }
    
    for (const product of products) {
      try {
        const interval = randomBetween(schedule.item_interval_min || 20, schedule.item_interval_max || 90)
        await sleep(interval * 1000)
        
        if (schedule.marketplace === 'ebay') {
          const ebayAccount = accountMap[schedule.account] || 'account1'
          const result = await listProductToEbay(product, ebayAccount)
          
          if (result.success) {
            await supabase.from('yahoo_scraped_products').update({ 
              status: 'listed', 
              listed_at: new Date().toISOString() 
            }).eq('id', product.id)
            
            await supabase.from('listing_history').insert({
              product_id: product.id,
              schedule_id: scheduleId,
              marketplace: schedule.marketplace,
              account: schedule.account,
              listed_at: new Date().toISOString(),
              listing_id: result.listingId,
              status: 'success'
            })
            
            successCount++
          } else {
            throw new Error(result.error || '出品失敗')
          }
        } else {
          console.log(`${schedule.marketplace} への出品は未実装`)
        }
        
      } catch (error: any) {
        console.error(`商品${product.id}の出品エラー:`, error)
        
        await supabase.from('listing_history').insert({
          product_id: product.id,
          schedule_id: scheduleId,
          marketplace: schedule.marketplace,
          account: schedule.account,
          listed_at: new Date().toISOString(),
          status: 'failed',
          error_message: error.message
        })
        
        errors.push(`${product.sku}: ${error.message}`)
        failedCount++
      }
    }
    
    await supabase.from('listing_schedules').update({ 
      status: 'completed',
      actual_count: successCount
    }).eq('id', scheduleId)
    
    return NextResponse.json({
      message: '出品完了',
      success: successCount,
      failed: failedCount,
      total: products.length,
      errors: errors.length > 0 ? errors : undefined
    })
    
  } catch (error: any) {
    console.error('出品実行エラー:', error)
    return NextResponse.json(
      { error: '出品実行に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
