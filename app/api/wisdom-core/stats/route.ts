import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 統計情報のみ取得（全データ）
export async function GET() {
  try {
    // 全データを取得（ページネーション対応）
    let allData: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('code_map')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
      
      if (error) throw error
      
      if (data && data.length > 0) {
        allData = allData.concat(data)
        page++
        hasMore = data.length === pageSize
      } else {
        hasMore = false
      }
    }
    
    console.log(`📊 全データ取得: ${allData.length}件`)
    
    // 関連ツール集計
    const allRelatedTools = new Set<string>()
    allData.forEach(item => {
      if (item.related_tools && Array.isArray(item.related_tools)) {
        item.related_tools.forEach((tool: string) => allRelatedTools.add(tool))
      }
    })
    
    // カテゴリ集計
    const byCategory = allData.reduce((acc: any, item) => {
      const cat = item.category || 'other'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {})
    
    // ツールタイプ集計
    const byToolType = allData.reduce((acc: any, item) => {
      const tool = item.tool_type || 'その他'
      acc[tool] = (acc[tool] || 0) + 1
      return acc
    }, {})
    
    // 拡張子集計
    const byExtension = allData.reduce((acc: any, item) => {
      const ext = item.tech_stack || 'unknown'
      acc[ext] = (acc[ext] || 0) + 1
      return acc
    }, {})
    
    const stats = {
      total: allData.length,
      byCategory,
      byToolType,
      byExtension,
      relatedTools: Array.from(allRelatedTools).sort(),
      categories: Object.keys(byCategory).length,
      toolTypes: Object.keys(byToolType).length,
      extensions: Object.keys(byExtension).length,
    }
    
    console.log('📊 統計:', {
      total: stats.total,
      categories: stats.categories,
      toolTypes: stats.toolTypes,
      extensions: stats.extensions,
      relatedTools: stats.relatedTools.length,
    })
    
    // 拡張子の合計を検証
    const extensionTotal = Object.values(byExtension).reduce((sum: number, count: any) => sum + count, 0)
    console.log('📊 拡張子合計:', extensionTotal, '総数:', stats.total)
    
    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error: any) {
    console.error('Stats error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
