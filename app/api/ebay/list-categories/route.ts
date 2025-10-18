// app/api/ebay/list-categories/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const level = searchParams.get('level') ? parseInt(searchParams.get('level')) : null

    const supabase = createClient()

    // ページネーションで全件取得
    const pageSize = 1000
    let allData: any[] = []
    let page = 0
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from('ebay_pricing_category_fees')
        .select('category_key, category_name, category_path, category_parent_id, category_level, fvf, insertion_fee, active')
        .eq('active', true)

      // レベルフィルタ
      if (level === 1) {
        query = query.is('category_parent_id', null)
      } else if (level && level > 1) {
        query = query.eq('category_level', level)
      }

      // 検索フィルタ
      if (search) {
        query = query.or(`category_name.ilike.%${search}%,category_key.eq.${search}`)
      }

      // ページネーション
      const from = page * pageSize
      const to = from + pageSize - 1
      
      const { data, error } = await query.range(from, to)

      if (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data]
        page++
        hasMore = data.length === pageSize
      } else {
        hasMore = false
      }
    }

    console.log('Fetched total:', allData.length, 'categories')

    return NextResponse.json({
      categories: allData,
      total: allData.length,
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
