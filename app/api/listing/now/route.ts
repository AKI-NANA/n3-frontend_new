// app/api/listing/now/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { listProductToEbay } from '@/lib/ebay/inventory'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, marketplace, account } = body
    
    if (!date || !marketplace || !account) {
      return NextResponse.json(
        { error: 'date, marketplace, accountは必須です' },
        { status: 400 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data: schedules, error: schedulesError } = await supabase
      .from('listing_schedules')
      .select('*')
      .eq('date', date)
      .eq('marketplace', marketplace)
      .eq('account', account)
      .eq('status', 'pending')
    
    if (schedulesError) throw schedulesError
    
    if (!schedules || schedules.length === 0) {
      return NextResponse.json(
        { error: 'スケジュールが見つかりません' },
        { status: 404 }
      )
    }
    
    let totalSuccess = 0
    let totalFailed = 0
    const allErrors: string[] = []
    
    for (const schedule of schedules) {
      await supabase
        .from('listing_schedules')
        .update({ status: 'in_progress', actual_time: new Date().toISOString() })
        .eq('id', schedule.id)
      
      const { data: products, error: productsError } = await supabase
        .from('yahoo_scraped_products')
        .select('*')
        .eq('listing_session_id', schedule.id.toString())
        .eq('status', 'ready_to_list')
        .order('ai_confidence_score', { ascending: false })
      
      if (productsError) {
        console.error('商品取得エラー:', productsError)
        continue
      }
      
      if (!products || products.length === 0) {
        await supabase
          .from('listing_schedules')
          .update({ status: 'completed', actual_count: 0 })
          .eq('id', schedule.id)
        continue
      }
      
      let successCount = 0
      let failedCount = 0
      
      const accountMap: Record<string, 'account1' | 'account2'> = {
        'account1': 'account1',
        'account2': 'account2'
      }
      
      for (const product of products) {
        try {
          if (marketplace === 'ebay') {
            const ebayAccount = accountMap[account] || 'account1'
            const result = await listProductToEbay(product, ebayAccount)
            
            if (result.success) {
              await supabase.from('yahoo_scraped_products').update({ 
                status: 'listed', 
                listed_at: new Date().toISOString() 
              }).eq('id', product.id)
              
              await supabase.from('listing_history').insert({
                product_id: product.id,
                schedule_id: schedule.id,
                marketplace: marketplace,
                account: account,
                listed_at: new Date().toISOString(),
                listing_id: result.listingId,
                status: 'success'
              })
              
              successCount++
            } else {
              throw new Error(result.error || '出品失敗')
            }
          }
          
          await sleep(2000)
          
        } catch (error: any) {
          console.error(`商品${product.id}の出品エラー:`, error)
          
          await supabase.from('listing_history').insert({
            product_id: product.id,
            schedule_id: schedule.id,
            marketplace: marketplace,
            account: account,
            listed_at: new Date().toISOString(),
            status: 'failed',
            error_message: error.message
          })
          
          allErrors.push(`${product.sku}: ${error.message}`)
          failedCount++
        }
      }
      
      await supabase.from('listing_schedules').update({ 
        status: 'completed',
        actual_count: successCount
      }).eq('id', schedule.id)
      
      totalSuccess += successCount
      totalFailed += failedCount
    }
    
    return NextResponse.json({
      message: '即座出品完了',
      success: totalSuccess,
      failed: totalFailed,
      total: totalSuccess + totalFailed,
      errors: allErrors.length > 0 ? allErrors : undefined
    })
    
  } catch (error: any) {
    console.error('即座出品エラー:', error)
    return NextResponse.json(
      { error: '即座出品に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
