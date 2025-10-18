/**
 * VeRO履歴更新API
 * UIボタンから呼び出してeBayのVeRO履歴を取得・更新
 * 
 * POST /api/vero/update-history
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    switch (action) {
      case 'get_stats':
        return await getVeROStats(supabase)
        
      case 'trigger_scraping':
        return await triggerScrapingJob()
        
      case 'manual_add':
        return await manualAddViolation(supabase, body.data)
        
      default:
        return NextResponse.json(
          { success: false, message: '無効なアクションです' },
          { status: 400 }
        )
    }
    
  } catch (error: any) {
    console.error('VeRO API エラー:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}

async function getVeROStats(supabase: any) {
  const { data: brandRules } = await supabase
    .from('vero_brand_rules')
    .select('*')
    .order('violation_count', { ascending: false })
  
  return NextResponse.json({ success: true, data: brandRules })
}

async function triggerScrapingJob() {
  return NextResponse.json({
    success: false,
    message: '手動でPythonスクレイピングスクリプトを実行してください',
  }, { status: 501 })
}

async function manualAddViolation(supabase: any, data: any) {
  const { error } = await supabase
    .from('vero_scraped_violations')
    .insert(data)
  
  if (error) throw error
  
  return NextResponse.json({
    success: true,
    message: 'VeRO違反データを追加しました',
  })
}
