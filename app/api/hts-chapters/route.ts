import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('hts_chapters')
      .select('*')
      .order('chapter_code', { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching HTS chapters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch HTS chapters' },
      { status: 500 }
    )
  }
}
