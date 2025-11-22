// app/api/hts/verify-data/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * HTS階層システム検証API
 * 計画書「フェーズ0: 現状確認」の検証項目をすべてチェック
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // ============================================
    // 1. 全体統計の取得
    // ============================================
    const [chaptersRes, headingsRes, subheadingsRes, detailsRes] = await Promise.all([
      supabase.from('hts_chapters').select('*', { count: 'exact', head: true }),
      supabase.from('hts_codes_headings').select('*', { count: 'exact', head: true }),
      supabase.from('hts_codes_subheadings').select('*', { count: 'exact', head: true }),
      supabase.from('hts_codes_details').select('*', { count: 'exact', head: true })
    ])

    const totals = {
      chapters: chaptersRes.count || 0,
      headings: headingsRes.count || 0,
      subheadings: subheadingsRes.count || 0,
      details: detailsRes.count || 0
    }

    // ============================================
    // 2. Chapter 95の存在確認
    // ============================================
    const { data: chapter95, error: chapter95Error } = await supabase
      .from('hts_chapters')
      .select('*')
      .eq('chapter_code', '95')
      .single()

    // ============================================
    // 3. Heading 9503の存在確認
    // ============================================
    const { data: heading9503, error: heading9503Error } = await supabase
      .from('hts_codes_headings')
      .select('*')
      .eq('heading_code', '9503')
      .single()

    // ============================================
    // 4. Full Code 9503.00.00.11の存在確認
    // ============================================
    const { data: fullCode9503_00_00_11, error: fullCodeError } = await supabase
      .from('hts_codes_details')
      .select('*')
      .eq('hts_number', '9503.00.00.11')
      .single()

    // ============================================
    // 5. 9503で始まる全コードのサンプル取得
    // ============================================
    const { data: allCodes9503, count: codes9503Count } = await supabase
      .from('hts_codes_details')
      .select('*', { count: 'exact' })
      .like('hts_number', '9503%')
      .order('hts_number')
      .limit(10)

    // ============================================
    // 6. テーブル間の関連確認
    // ============================================
    // hts_codes_headingsのカラム構造を確認
    const { data: headingSample } = await supabase
      .from('hts_codes_headings')
      .select('*')
      .limit(1)
      .single()

    const hasChapterId = headingSample ? 'chapter_id' in headingSample : false
    const hasChapterCode = headingSample ? 'chapter_code' in headingSample : false

    // ============================================
    // 7. 日本語データの存在確認
    // ============================================
    const { data: chapterWithJa, count: chaptersWithJaCount } = await supabase
      .from('hts_chapters')
      .select('*', { count: 'exact' })
      .not('description_ja', 'is', null)
      .limit(1)

    const { data: headingWithJa, count: headingsWithJaCount } = await supabase
      .from('hts_codes_headings')
      .select('*', { count: 'exact' })
      .not('description_ja', 'is', null)
      .limit(1)

    const { data: detailWithJa, count: detailsWithJaCount } = await supabase
      .from('hts_codes_details')
      .select('*', { count: 'exact' })
      .not('description_ja', 'is', null)
      .limit(1)

    // ============================================
    // 8. 判定基準（計画書に従って）
    // ============================================
    const checks = {
      totals,

      // Chapter 95
      chapter95: {
        exists: !!chapter95,
        data: chapter95,
        error: chapter95Error?.message
      },

      // Heading 9503
      heading9503: {
        exists: !!heading9503,
        data: heading9503,
        error: heading9503Error?.message
      },

      // Full Code 9503.00.00.11
      fullCode_9503_00_00_11: {
        exists: !!fullCode9503_00_00_11,
        hasDutyRate: !!fullCode9503_00_00_11?.general_rate,
        data: fullCode9503_00_00_11,
        error: fullCodeError?.message
      },

      // 9503の全コード
      allCodes9503: {
        count: codes9503Count || 0,
        sample: allCodes9503 || []
      },

      // テーブル関連
      relationCheck: {
        hasChapterId,
        hasChapterCode,
        headingSampleFields: headingSample ? Object.keys(headingSample) : []
      },

      // 日本語データ
      japaneseData: {
        chapters: chaptersWithJaCount || 0,
        headings: headingsWithJaCount || 0,
        details: detailsWithJaCount || 0,
        hasAnyJapanese: (chaptersWithJaCount || 0) > 0 ||
                        (headingsWithJaCount || 0) > 0 ||
                        (detailsWithJaCount || 0) > 0
      }
    }

    // ============================================
    // 9. 判定結果のスコアリング
    // ============================================
    let score = 0
    let maxScore = 8

    // 件数チェック（4項目）
    if (totals.chapters >= 99) score++
    if (totals.headings >= 1000) score++
    if (totals.subheadings >= 4000) score++
    if (totals.details >= 25000) score++

    // 存在チェック（3項目）
    if (checks.chapter95.exists) score++
    if (checks.heading9503.exists) score++
    if (checks.fullCode_9503_00_00_11.exists && checks.fullCode_9503_00_00_11.hasDutyRate) score++

    // 関連チェック（1項目）
    if (checks.relationCheck.hasChapterId) score++

    // ============================================
    // 10. 推奨パスの決定
    // ============================================
    let recommendedPath: 'phase1' | 'phase2' | 'partial_fix' = 'phase2'
    let pathReason = ''

    if (score >= 7) {
      recommendedPath = 'phase1'
      pathReason = 'データは正常です。日本語追加のみで対応可能です。'
    } else if (score <= 3) {
      recommendedPath = 'phase2'
      pathReason = 'データが不完全です。全データの再インポートを推奨します。'
    } else {
      recommendedPath = 'partial_fix'
      pathReason = '一部のデータに問題があります。部分修正を検討してください。'
    }

    return NextResponse.json({
      success: true,
      score: `${score}/${maxScore}`,
      recommendedPath,
      pathReason,
      results: {
        checks,
        summary: {
          totalChapters: totals.chapters,
          totalHeadings: totals.headings,
          totalSubheadings: totals.subheadings,
          totalDetails: totals.details,
          japaneseDataExists: checks.japaneseData.hasAnyJapanese,
          japaneseChapters: checks.japaneseData.chapters,
          japaneseHeadings: checks.japaneseData.headings,
          japaneseDetails: checks.japaneseData.details
        }
      }
    })

  } catch (error: any) {
    console.error('HTS検証API致命的エラー:', error)
    return NextResponse.json({
      success: false,
      error: '予期しないエラーが発生しました',
      message: error.message
    }, { status: 500 })
  }
}
