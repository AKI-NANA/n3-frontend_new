import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * HTS学習システム Phase 2: HTS検索API
 * 
 * Gemini出力データを受け取り、RPC関数で3段階検索を実行
 * 1. 学習データ検索（最優先、900+点）
 * 2. マスターデータ検索（高優先、700-800点）
 * 3. HTS公式検索（フォールバック、0-700点）
 */

export async function POST(request: Request) {
  try {
    console.log('🔍 HTS検索API呼び出し')
    
    const body = await request.json()
    console.log('📥 リクエストボディ:', body)
    
    const {
      title,                      // ✅ 正しいカラム名
      category,
      brand,
      hts_keywords,              // Gemini生成キーワード（優先）
      material_recommendation,    // Gemini生成素材
      origin_country_candidate,   // Gemini生成原産国
      keywords                    // フォールバックキーワード
    } = body
    
    // キーワードの優先順位: Gemini生成 > 手動入力
    const searchKeywords = hts_keywords || keywords
    
    if (!searchKeywords) {
      return NextResponse.json({
        success: false,
        error: 'キーワードが指定されていません（hts_keywords または keywords）'
      }, { status: 400 })
    }
    
    console.log('🔑 検索パラメータ:', {
      キーワード: searchKeywords,
      カテゴリー: category,
      ブランド: brand,
      素材: material_recommendation,
      原産国: origin_country_candidate
    })
    
    // Supabase RPC呼び出し
    const supabase = await createClient()
    
    // 🔥 RPC関数を呼び出し
    const { data, error } = await supabase.rpc('search_hts_with_learning', {
      p_keywords: searchKeywords,
      p_category_ja: category || null,
      p_brand_ja: brand || null,
      p_material_ja: material_recommendation || null,
      p_title_ja: title || null  // ✅ titleを使用
    })
    
    if (error) {
      console.error('❌ Supabase RPCエラー:', error)
      return NextResponse.json({
        success: false,
        error: `HTS検索に失敗しました: ${error.message}`,
        details: error
      }, { status: 500 })
    }
    
    console.log('✅ HTS検索結果:', {
      件数: data?.length || 0,
      最高スコア: data?.[0]?.score || 0
    })
    
    // 結果を返す
    return NextResponse.json({
      success: true,
      data: {
        candidates: data || [],
        count: data?.length || 0,
        // 最高スコアの候補を自動選択情報として返す
        autoSelected: data && data.length > 0 ? {
          hts_code: data[0].hts_code,
          confidence: data[0].confidence,
          score: data[0].score
        } : null
      }
    })
    
  } catch (error) {
    console.error('❌ HTS検索APIエラー:', error)
    console.error('エラー詳細:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'サーバーエラーが発生しました',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
