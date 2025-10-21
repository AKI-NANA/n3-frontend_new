import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const order = searchParams.get('order') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('amazon_products')
      .select('*')
      .eq('user_id', user.id)

    // ソート
    if (sortBy === 'profit_score') {
      query = query.order('profit_score', { ascending: order === 'asc' })
    } else if (sortBy === 'price') {
      query = query.order('current_price', { ascending: order === 'asc' })
    } else if (sortBy === 'rating') {
      query = query.order('star_rating', { ascending: order === 'asc' })
    } else {
      query = query.order('created_at', { ascending: order === 'asc' })
    }

    query = query.range(offset, offset + limit - 1)

    const { data: products, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ products: products || [] })
  } catch (error: any) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get products' },
      { status: 500 }
    )
  }
}
