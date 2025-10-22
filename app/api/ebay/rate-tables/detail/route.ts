import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service') || 'Express'

    console.log(`📊 [Rate Tables Detail] サービスタイプ: ${service}`)

    // Rate Tableのテーブル名を取得
    const rateTableName = `RT_${service}`

    // 全データを取得（Supabaseのデフォルト1000件制限を回避）
    let allData: any[] = []
    let from = 0
    const batchSize = 1000

    while (true) {
      const { data: batch, error: fetchError } = await supabase
        .from('ebay_rate_table_entries')
        .select('*')
        .eq('rate_table_name', rateTableName)
        .order('weight_from_kg', { ascending: true })
        .order('country_code', { ascending: true })
        .range(from, from + batchSize - 1)
      
      if (fetchError) {
        console.error('❌ データ取得エラー:', fetchError)
        return NextResponse.json({
          success: false,
          error: fetchError.message
        }, { status: 500 })
      }
      
      if (!batch || batch.length === 0) break
      
      allData = allData.concat(batch)
      
      if (batch.length < batchSize) break
      
      from += batchSize
    }
    
    console.log(`📦 取得完了: ${allData.length}件`)



    if (!allData || allData.length === 0) {
      return NextResponse.json({
        success: true,
        weightRanges: [],
        allData: [],
        stats: {
          totalEntries: 0,
          totalCountries: 0,
          totalWeightRanges: 0
        }
      })
    }

    // 重量帯ごとのカウントを集計
    const weightRangeMap = new Map<string, number>()
    const countriesSet = new Set<string>()

    allData.forEach((entry: any) => {
      const key = `${entry.weight_from_kg}-${entry.weight_to_kg}`
      weightRangeMap.set(key, (weightRangeMap.get(key) || 0) + 1)
      countriesSet.add(entry.country_code)
    })

    // 重量帯リストを作成
    const weightRanges = Array.from(weightRangeMap.entries())
      .map(([key, count]) => {
        const [from, to] = key.split('-').map(Number)
        return { from, to, count }
      })
      .sort((a, b) => a.from - b.from)

    const stats = {
      totalEntries: allData.length,
      totalCountries: countriesSet.size,
      totalWeightRanges: weightRanges.length
    }

    console.log(`✅ [Rate Tables Detail] 取得完了:`, {
      totalEntries: stats.totalEntries,
      totalCountries: stats.totalCountries,
      totalWeightRanges: stats.totalWeightRanges
    })

    return NextResponse.json({
      success: true,
      weightRanges,
      allData,
      stats
    })

  } catch (error) {
    console.error('❌ [Rate Tables Detail] エラー:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}
