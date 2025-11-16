import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // product_html_generated テーブルの構造を確認
    const { data: sample, error } = await supabase
      .from('product_html_generated')
      .select('*')
      .limit(1)
      .single()
    
    let fields: string[] = []
    let fieldTypes: Record<string, string> = {}
    
    if (sample) {
      fields = Object.keys(sample)
      fields.forEach(field => {
        const value = sample[field]
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
    
    return NextResponse.json({
      success: true,
      table_exists: !error,
      sample_data: sample,
      fields: fields,
      field_types: fieldTypes,
      error: error?.message || null
    })
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
