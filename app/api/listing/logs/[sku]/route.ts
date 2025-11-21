// app/api/listing/logs/[sku]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  PriceChangeLog,
  StockChangeLog,
  OrderHistoryItem
} from '@/lib/types/listing'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET: 特定SKUの履歴データ取得API
 *
 * 価格変動履歴、在庫変動ログ、受注履歴を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sku: string } }
) {
  try {
    const sku = params.sku

    if (!sku) {
      return NextResponse.json(
        { success: false, error: 'SKUは必須です' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const logType = searchParams.get('type') // 'price', 'stock', 'order', or 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createClient(supabaseUrl, supabaseKey)

    // TODO: 実際のデータベースクエリ
    // 価格変動ログ
    let priceLogs: PriceChangeLog[] = []
    if (!logType || logType === 'all' || logType === 'price') {
      priceLogs = generateMockPriceLogs(sku, limit)
      // const { data } = await supabase
      //   .from('price_change_logs')
      //   .select('*')
      //   .eq('sku', sku)
      //   .order('created_at', { ascending: false })
      //   .range(offset, offset + limit - 1)
      // priceLogs = data || []
    }

    // 在庫変動ログ
    let stockLogs: StockChangeLog[] = []
    if (!logType || logType === 'all' || logType === 'stock') {
      stockLogs = generateMockStockLogs(sku, limit)
      // const { data } = await supabase
      //   .from('stock_change_logs')
      //   .select('*')
      //   .eq('sku', sku)
      //   .order('created_at', { ascending: false })
      //   .range(offset, offset + limit - 1)
      // stockLogs = data || []
    }

    // 受注履歴
    let orderHistory: OrderHistoryItem[] = []
    if (!logType || logType === 'all' || logType === 'order') {
      orderHistory = generateMockOrderHistory(sku, limit)
      // const { data } = await supabase
      //   .from('order_history')
      //   .select('*')
      //   .eq('sku', sku)
      //   .order('order_date', { ascending: false })
      //   .range(offset, offset + limit - 1)
      // orderHistory = data || []
    }

    return NextResponse.json({
      success: true,
      data: {
        sku,
        price_logs: priceLogs,
        stock_logs: stockLogs,
        order_history: orderHistory
      }
    })

  } catch (error: any) {
    console.error('ログ取得エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * モック: 価格変動ログ生成
 */
function generateMockPriceLogs(sku: string, limit: number): PriceChangeLog[] {
  const reasons = [
    '競合最安値追従',
    'SOLD数による値上げ',
    '在庫減少による値上げ',
    '季節調整',
    'モード変更: 中古優先',
    'モード変更: 新品優先',
    '手動調整'
  ]

  return Array.from({ length: Math.min(limit, 20) }, (_, i) => {
    const oldPrice = 10000 + Math.floor(Math.random() * 5000)
    const changePercent = (Math.random() * 20) - 10 // -10% ~ +10%
    const newPrice = Math.floor(oldPrice * (1 + changePercent / 100))

    return {
      id: `price-log-${i + 1}`,
      sku,
      old_price: oldPrice,
      new_price: newPrice,
      change_reason: reasons[Math.floor(Math.random() * reasons.length)],
      change_percentage: changePercent,
      triggered_by: Math.random() > 0.3 ? '自動' : '手動',
      created_at: new Date(Date.now() - i * 86400000).toISOString()
    }
  })
}

/**
 * モック: 在庫変動ログ生成
 */
function generateMockStockLogs(sku: string, limit: number): StockChangeLog[] {
  const sources = ['自社有在庫', '仕入れ先A', '仕入れ先B']
  const changeTypes = ['increase', 'decrease', 'sync_error'] as const

  return Array.from({ length: Math.min(limit, 15) }, (_, i) => {
    const oldCount = Math.floor(Math.random() * 20) + 5
    const change = Math.floor(Math.random() * 10) - 5
    const newCount = Math.max(0, oldCount + change)

    return {
      id: `stock-log-${i + 1}`,
      sku,
      source: sources[Math.floor(Math.random() * sources.length)],
      old_count: oldCount,
      new_count: newCount,
      change_type: change > 0 ? 'increase' : (change < 0 ? 'decrease' : 'sync_error'),
      notes: i % 3 === 0 ? 'HTML解析エラー発生' : undefined,
      created_at: new Date(Date.now() - i * 43200000).toISOString()
    }
  })
}

/**
 * モック: 受注履歴生成
 */
function generateMockOrderHistory(sku: string, limit: number): OrderHistoryItem[] {
  const malls = ['ebay', 'amazon', 'shopee'] as const

  return Array.from({ length: Math.min(limit, 30) }, (_, i) => ({
    id: `order-${i + 1}`,
    sku,
    mall: malls[Math.floor(Math.random() * malls.length)],
    order_id: `ORD-${1000 + i}`,
    quantity: Math.floor(Math.random() * 3) + 1,
    price: Math.floor(Math.random() * 20000) + 5000,
    order_date: new Date(Date.now() - i * 172800000).toISOString()
  }))
}
