import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface ScheduleRequest {
  productIds: number[]
  strategy: {
    marketplaces?: Array<{
      marketplace: string
      accountId: string
    }>
    mode: 'immediate' | 'scheduled'
    scheduleSettings?: {
      startDate: string
      intervalHours: number
      sessionsPerDay: number
      randomization: boolean
    }
  }
}

/**
 * 承認と出品スケジュール作成API
 * POST /api/approval/create-schedule
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] create-schedule POST called')
    const supabase = await createClient()
    const body: ScheduleRequest = await request.json()
    console.log('[API] Request body:', JSON.stringify(body, null, 2))
    
    const { productIds, strategy } = body
    
    if (!productIds || productIds.length === 0) {
      console.error('[API] No products selected')
      return NextResponse.json(
        { error: '商品が選択されていません' },
        { status: 400 }
      )
    }

    // 🔥 マーケットプレイス指定がない場合はデフォルト設定を取得
    let marketplaces = strategy.marketplaces
    
    if (!marketplaces || marketplaces.length === 0) {
      const { data: defaultSettings, error: defaultError } = await supabase
        .from('default_listing_settings')
        .select('*')
        .eq('is_active', true)
        .is('category_name', null) // 全商品のデフォルト
        .single()
      
      if (defaultError || !defaultSettings) {
        console.error('Error fetching default settings:', defaultError)
        // デフォルト設定がない場合は、eBay Mainをハードコード
        marketplaces = [{ marketplace: 'ebay', accountId: 'main_account' }]
      } else {
        marketplaces = [{
          marketplace: defaultSettings.marketplace,
          accountId: defaultSettings.account_id
        }]
      }
    }

    // 1. 選択された商品のapproval_statusを'approved'に更新
    console.log('[API] Updating approval status for products:', productIds)
    const { error: updateError } = await supabase
      .from('products_master')
      .update({ 
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', productIds)

    if (updateError) {
      console.error('[API] Error updating approval status:', updateError)
      return NextResponse.json(
        { error: `承認ステータスの更新に失敗しました: ${updateError.message || JSON.stringify(updateError)}` },
        { status: 500 }
      )
    }
    console.log('[API] Approval status updated successfully')

    // 2. listing_scheduleレコードの作成
    console.log('[API] Creating schedule records...')
    const scheduleRecords = createScheduleRecords(productIds, { ...strategy, marketplaces })
    console.log('[API] Schedule records to insert:', JSON.stringify(scheduleRecords, null, 2))
    
    const { data: insertedSchedules, error: insertError } = await supabase
      .from('listing_schedule')
      .insert(scheduleRecords)
      .select()

    if (insertError) {
      console.error('Error inserting schedule records:', insertError)
      return NextResponse.json(
        { error: `スケジュールの作成に失敗しました: ${insertError.message || JSON.stringify(insertError)}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${productIds.length}件の商品を承認し、${scheduleRecords.length}件の出品スケジュールを作成しました`,
      data: {
        approvedCount: productIds.length,
        scheduleCount: insertedSchedules?.length || 0,
        schedules: insertedSchedules
      }
    })

  } catch (error) {
    console.error('Error in create-schedule API:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * スケジュールレコードの生成
 */
function createScheduleRecords(
  productIds: number[], 
  strategy: ScheduleRequest['strategy'] & { marketplaces: Array<{ marketplace: string; accountId: string }> }
): Array<any> {
  const records: Array<any> = []
  const now = new Date()
  
  // 即時出品の場合
  if (strategy.mode === 'immediate') {
    productIds.forEach((productId, index) => {
      strategy.marketplaces.forEach(({ marketplace, accountId }) => {
        // 即時出品の場合は、数分後に実行（同時実行を避けるため少しずつずらす）
        const scheduledAt = new Date(now.getTime() + (index * 2 * 60 * 1000)) // 2分ごと
        
        records.push({
          product_id: productId,
          marketplace: marketplace,
          account_id: accountId,
          scheduled_at: scheduledAt.toISOString(),
          status: 'PENDING',
          listing_strategy: 'immediate',
          priority: 1000 - index
        })
      })
    })
  } 
  // スケジュール出品の場合（自動スケジューリング）
  else if (strategy.mode === 'scheduled') {
    // スケジュール設定がない場合は、単にpending状態で登録（後で自動スケジューリング）
    productIds.forEach((productId, index) => {
      strategy.marketplaces.forEach(({ marketplace, accountId }) => {
        records.push({
          product_id: productId,
          marketplace: marketplace,
          account_id: accountId,
          scheduled_at: null,
          status: 'PENDING',
          listing_strategy: 'auto_scheduled',
          priority: 100 - index
        })
      })
    })
  }
  
  return records
}

/**
 * スケジュールの取得
 * GET /api/approval/create-schedule
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const productId = searchParams.get('productId')
    const marketplace = searchParams.get('marketplace')
    const status = searchParams.get('status')
    
    let query = supabase
      .from('listing_schedule')
      .select(`
        *,
        products_master!listing_schedule_product_id_fkey (
          id,
          sku,
          title,
          title_en,
          current_price,
          listing_price
        )
      `)
      .order('scheduled_at', { ascending: true })
    
    if (productId) {
      query = query.eq('product_id', productId)
    }
    
    if (marketplace) {
      query = query.eq('marketplace', marketplace)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching schedules:', error)
      return NextResponse.json(
        { error: 'スケジュールの取得に失敗しました', details: error },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: data || []
    })
    
  } catch (error) {
    console.error('Error in GET create-schedule API:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: String(error) },
      { status: 500 }
    )
  }
}
