import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // 古いデータ（id: 1-8）
    const { data: oldData } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .in('id', [1, 2, 3, 4, 5, 6, 7, 8])
      .order('id')
    
    // 新しいデータ（id: 9）
    const { data: newData } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .eq('id', 9)
      .single()
    
    const oldSample = oldData?.[0]
    
    return NextResponse.json({
      old_data_structure: {
        sample_id: oldSample?.id,
        sample_sku: oldSample?.sku,
        has_scraped_data: !!oldSample?.scraped_data,
        has_listing_data: !!oldSample?.listing_data,
        scraped_data_structure: oldSample?.scraped_data ? Object.keys(oldSample.scraped_data) : [],
        image_location: oldSample?.scraped_data?.images ? 'scraped_data.images' : 
                       oldSample?.scraped_data?.image_urls ? 'scraped_data.image_urls' : 'なし',
        full_sample: oldSample
      },
      new_data_structure: {
        id: newData?.id,
        sku: newData?.sku,
        has_scraped_data: !!newData?.scraped_data,
        has_listing_data: !!newData?.listing_data,
        full_sample: newData
      },
      comparison: {
        old_has_data: !!oldSample?.scraped_data,
        new_has_data: !!newData?.scraped_data,
        broken: !!oldSample?.scraped_data && !newData?.scraped_data
      },
      all_old_items: oldData?.map(item => ({
        id: item.id,
        sku: item.sku,
        title: item.title?.substring(0, 40),
        has_scraped_data: !!item.scraped_data,
        has_images: !!(item.scraped_data?.images || item.scraped_data?.image_urls),
        created_at: item.created_at
      }))
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
