import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // 画像URLがあるレコードだけ取得
    const { data: withImages } = await supabase
      .from('products_master')
      .select('id, sku, title, primary_image_url, gallery_images')
      .not('primary_image_url', 'is', null)
      .order('id')
    
    // 画像URLがないレコード数
    const { count: noImageCount } = await supabase
      .from('products_master')
      .select('*', { count: 'exact', head: true })
      .is('primary_image_url', null)
    
    // ゲンガー確認
    const { data: gengar } = await supabase
      .from('products_master')
      .select('*')
      .eq('sku', 'NH0QT')
      .single()
    
    return NextResponse.json({
      has_images: withImages?.length || 0,
      no_images: noImageCount || 0,
      total: 112,
      with_image_data: withImages,
      gengar_detail: {
        sku: gengar?.sku,
        title: gengar?.title,
        primary_image_url: gengar?.primary_image_url,
        gallery_images: gengar?.gallery_images,
        url_type: typeof gengar?.primary_image_url,
        url_length: gengar?.primary_image_url?.length || 0
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
