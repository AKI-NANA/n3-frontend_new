// app/api/hts/keywords/[hts_code]/route.ts
// タスクA: HTSキーワード検索API（連携の要）

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * HTSコードに関連するキーワードを取得するAPI
 *
 * 用途: データ編集UIでHTSコードが入力・変更された際に、
 *       関連するキーワードをリアルタイムで表示するために使用
 *
 * @param params - { hts_code: string } パスパラメータ
 * @returns キーワードリスト（日本語・英語）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { hts_code: string } }
) {
  try {
    const { hts_code } = params

    // パラメータバリデーション
    if (!hts_code) {
      return NextResponse.json(
        { error: 'HTSコードが指定されていません' },
        { status: 400 }
      )
    }

    // HTSコードの形式検証（6-10桁の数字とドット）
    const htsCodePattern = /^[\d.]{6,10}$/
    if (!htsCodePattern.test(hts_code)) {
      return NextResponse.json(
        { error: 'HTSコードの形式が無効です' },
        { status: 400 }
      )
    }

    console.log(`🔍 HTSキーワード検索: ${hts_code}`)

    // Supabaseクライアント作成
    const supabase = createClient()

    // hs_keywordsテーブルからキーワードを取得
    const { data: keywords, error } = await supabase
      .from('hs_keywords')
      .select('keyword, language, created_by')
      .eq('hs_code', hts_code)
      .order('language', { ascending: true })
      .order('keyword', { ascending: true })

    if (error) {
      console.error('❌ Supabaseエラー:', error)
      return NextResponse.json(
        { error: 'データベースエラーが発生しました', details: error.message },
        { status: 500 }
      )
    }

    // キーワードがない場合
    if (!keywords || keywords.length === 0) {
      console.log(`⚠️ HTSコード ${hts_code} のキーワードが見つかりません`)
      return NextResponse.json({
        hts_code,
        keywords_ja: [],
        keywords_en: [],
        total: 0,
        message: 'このHTSコードのキーワードはまだ生成されていません'
      })
    }

    // 言語別に分類
    const keywords_ja = keywords
      .filter(k => k.language === 'ja')
      .map(k => k.keyword)

    const keywords_en = keywords
      .filter(k => k.language === 'en')
      .map(k => k.keyword)

    console.log(`✅ キーワード取得成功: ${keywords.length}件（日本語: ${keywords_ja.length}件、英語: ${keywords_en.length}件）`)

    // レスポンス
    return NextResponse.json({
      hts_code,
      keywords_ja,
      keywords_en,
      total: keywords.length,
      breakdown: {
        japanese: keywords_ja.length,
        english: keywords_en.length
      }
    })

  } catch (error: any) {
    console.error('❌ HTSキーワードAPI エラー:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: error.message },
      { status: 500 }
    )
  }
}
