import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // 1. テーブル構造を取得
    const { data: structureData, error: structureError } = await supabase
      .rpc('get_table_structure', { table_name: 'products_master' })
      .then(() => ({ data: null, error: { message: 'RPC not available' } }))
      .catch(() => ({ data: null, error: { message: 'RPC failed' } }))
    
    // 2. サンプルデータを1件取得して実際のフィールドを確認
    const { data: sampleData, error: sampleError } = await supabase
      .from('products_master')
      .select('*')
      .limit(1)
      .single()
    
    if (sampleError) {
      console.error('Sample data error:', sampleError)
    }
    
    // 3. フィールド一覧を抽出
    const fields = sampleData ? Object.keys(sampleData) : []
    
    // 4. 各フィールドの型を判定
    const fieldTypes: Record<string, string> = {}
    if (sampleData) {
      fields.forEach(field => {
        const value = sampleData[field]
        if (value === null) {
          fieldTypes[field] = 'null'
        } else if (Array.isArray(value)) {
          fieldTypes[field] = 'array'
        } else if (typeof value === 'object') {
          fieldTypes[field] = 'object/jsonb'
        } else {
          fieldTypes[field] = typeof value
        }
      })
    }
    
    // 5. JSONB フィールドの内部構造を解析
    const jsonbFields: Record<string, any> = {}
    if (sampleData) {
      ['scraped_data', 'ebay_api_data', 'listing_data'].forEach(field => {
        if (sampleData[field] && typeof sampleData[field] === 'object') {
          jsonbFields[field] = {
            keys: Object.keys(sampleData[field]),
            sample: sampleData[field]
          }
        }
      })
    }
    
    // 6. 画像関連フィールドの詳細確認
    const imageInfo = {
      primary_image_url: sampleData?.primary_image_url || null,
      images_field: sampleData?.images || null,
      images_type: Array.isArray(sampleData?.images) ? 'array' : typeof sampleData?.images,
      images_count: Array.isArray(sampleData?.images) ? sampleData.images.length : 0,
      scraped_data_images: sampleData?.scraped_data?.images || null,
      scraped_data_images_type: Array.isArray(sampleData?.scraped_data?.images) ? 'array' : typeof sampleData?.scraped_data?.images,
      scraped_data_images_count: Array.isArray(sampleData?.scraped_data?.images) ? sampleData.scraped_data.images.length : 0,
    }
    
    return NextResponse.json({
      success: true,
      total_fields: fields.length,
      fields: fields,
      field_types: fieldTypes,
      jsonb_fields: jsonbFields,
      image_info: imageInfo,
      sample_data: sampleData,
      note: 'products_masterテーブルの完全構造分析'
    })
    
  } catch (error: any) {
    console.error('Structure analysis error:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
