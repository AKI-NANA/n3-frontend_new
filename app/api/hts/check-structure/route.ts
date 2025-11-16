import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  try {
    // 1. Headingのサンプルデータ確認
    const { data: headings, error: headingsError } = await supabase
      .from('hts_codes_headings')
      .select('*')
      .limit(3)

    // 2. Subheadingのサンプルデータ確認
    const { data: subheadings, error: subheadingsError } = await supabase
      .from('hts_codes_subheadings')
      .select('*')
      .limit(3)

    // 3. Full Codeのサンプルデータ確認（関税率含む）
    const { data: details, error: detailsError } = await supabase
      .from('hts_codes_details')
      .select('hts_number, description, general_rate, special_rate, column2_rate, chapter_code, heading_code, subheading_code')
      .limit(5)

    // 4. Chapterのデータ確認（除外フラグ含む）
    const { data: chapters, error: chaptersError } = await supabase
      .from('hts_chapters')
      .select('*')
      .limit(5)

    // 5. 関税率の統計
    const { data: rateStats, error: rateStatsError } = await supabase
      .from('hts_codes_details')
      .select('general_rate')
      .not('general_rate', 'is', null)
      .limit(100)

    // 関税率の集計
    const rateCounts: Record<string, number> = {}
    if (rateStats) {
      rateStats.forEach(row => {
        const rate = row.general_rate || 'NULL'
        rateCounts[rate] = (rateCounts[rate] || 0) + 1
      })
    }

    // 6. Chapter除外フラグの統計
    const { data: excludedChapters, error: excludedError } = await supabase
      .from('hts_chapters')
      .select('chapter_code, chapter_description, is_excluded, exclusion_reason')
      .eq('is_excluded', true)

    const { data: availableChapters, error: availableError } = await supabase
      .from('hts_chapters')
      .select('chapter_code')
      .eq('is_excluded', false)

    return NextResponse.json({
      success: true,
      data: {
        headings: {
          sample: headings,
          fields: headings && headings.length > 0 ? Object.keys(headings[0]) : [],
          error: headingsError
        },
        subheadings: {
          sample: subheadings,
          fields: subheadings && subheadings.length > 0 ? Object.keys(subheadings[0]) : [],
          error: subheadingsError
        },
        details: {
          sample: details,
          fields: details && details.length > 0 ? Object.keys(details[0]) : [],
          error: detailsError
        },
        chapters: {
          sample: chapters,
          fields: chapters && chapters.length > 0 ? Object.keys(chapters[0]) : [],
          excluded: excludedChapters?.length || 0,
          available: availableChapters?.length || 0,
          excludedList: excludedChapters,
          error: chaptersError
        },
        rates: {
          topRates: Object.entries(rateCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([rate, count]) => ({ rate, count })),
          totalSampled: rateStats?.length || 0,
          error: rateStatsError
        }
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
