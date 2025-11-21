// app/api/listing/edit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ListingEditData } from '@/lib/types/listing'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST: 出品データ編集API
 *
 * 第3層（出品データ）のみを更新する
 * 在庫や価格ロジック（第1層/第4層）は触らない
 */
export async function POST(request: NextRequest) {
  try {
    const body: ListingEditData = await request.json()

    const { sku, title, description, item_specifics, variations, listing_mode } = body

    if (!sku) {
      return NextResponse.json(
        { success: false, error: 'SKUは必須です' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // バリデーション
    if (variations.length > 0) {
      // バリエーション画像は最大24枚まで
      const totalImages = variations.reduce((sum, v) => sum + v.images.length, 0)
      if (totalImages > 24) {
        return NextResponse.json(
          { success: false, error: 'バリエーション画像は最大24枚までです' },
          { status: 400 }
        )
      }
    }

    // TODO: 実際のデータベース更新処理
    // 以下はモック実装

    // 1. 出品データテーブルを更新
    // await supabase
    //   .from('listing_data')
    //   .update({
    //     title,
    //     description,
    //     item_specifics,
    //     listing_mode,
    //     updated_at: new Date().toISOString()
    //   })
    //   .eq('sku', sku)

    // 2. バリエーションデータを更新
    // await supabase
    //   .from('listing_variations')
    //   .delete()
    //   .eq('parent_sku', sku)

    // for (const variation of variations) {
    //   await supabase.from('listing_variations').insert({
    //     parent_sku: sku,
    //     child_sku: variation.child_sku,
    //     attributes: variation.attributes,
    //     images: variation.images
    //   })
    // }

    // 3. VERO対策: ブランド名の自動補完
    if (item_specifics.brand_name) {
      // 在庫マスターのVERO対策ロジックから正式名を取得して挿入
      // const { data: veroData } = await supabase
      //   .from('vero_brands')
      //   .select('official_name')
      //   .eq('abbreviated_name', item_specifics.brand_name)
      //   .single()
      //
      // if (veroData) {
      //   item_specifics.brand_name = veroData.official_name
      // }
    }

    console.log(`✅ 出品データ編集成功: SKU=${sku}`)

    return NextResponse.json({
      success: true,
      message: '出品データを更新しました',
      sku
    })

  } catch (error: any) {
    console.error('出品データ編集エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * GET: 特定SKUの出品データ取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sku = searchParams.get('sku')

    if (!sku) {
      return NextResponse.json(
        { success: false, error: 'SKUは必須です' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // TODO: 実際のデータベースクエリ
    // const { data: listingData, error } = await supabase
    //   .from('listing_data')
    //   .select('*, variations:listing_variations(*)')
    //   .eq('sku', sku)
    //   .single()
    //
    // if (error) throw error

    // モックデータ
    const mockData: ListingEditData = {
      sku,
      title: `商品タイトル - ${sku}`,
      description: `これは${sku}の詳細説明です。`,
      item_specifics: {
        brand_name: 'Sample Brand',
        mpn: 'MPN-12345',
        condition: 'New',
        省略ブランド名: 'SB'
      },
      variations: [
        {
          child_sku: `${sku}-001`,
          attributes: { Color: 'Red', Size: 'M' },
          images: [
            { id: '1', url: 'https://via.placeholder.com/300', position: 1 }
          ],
          stock_count: 5
        }
      ],
      listing_mode: '中古優先'
    }

    return NextResponse.json({
      success: true,
      data: mockData
    })

  } catch (error: any) {
    console.error('出品データ取得エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
