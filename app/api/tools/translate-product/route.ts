// app/api/tools/translate-product/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const GAS_TRANSLATE_URL = process.env.GOOGLE_APPS_SCRIPT_TRANSLATE_URL

/**
 * シンプルな翻訳関数（Google翻訳API使用）
 */
async function translateText(text: string): Promise<string> {
  if (!text) return text
  
  // 🔥 Google翻訳APIを直接使用（無料・認証不要）
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=en&dt=t&q=${encodeURIComponent(text)}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    // Google翻訳APIのレスポンス形式: [[[翻訳結果, 元のテキスト]]]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      const translated = data[0].map((item: any) => item[0]).join('')
      console.log(`  📝 翻訳: "${text}" → "${translated}"`)
      return translated
    }
    
    return text
  } catch (error) {
    console.error('Translation error:', error)
    return text
  }
}

/**
 * 商品データの翻訳API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, title, description, condition } = body

    console.log('🌐 商品データ翻訳開始')
    console.log(`  Product ID: ${productId}`)

    const translations: any = {}

    // タイトル翻訳
    if (title) {
      console.log(`  📝 タイトル翻訳: "${title}"`)
      const englishTitle = await translateText(title)
      translations.title = englishTitle
      console.log(`  ✅ → "${englishTitle}"`)
    }

    // 説明翻訳
    if (description) {
      console.log(`  📄 説明翻訳中...`)
      const englishDescription = await translateText(description)
      translations.description = englishDescription
      console.log(`  ✅ 説明翻訳完了: ${englishDescription.substring(0, 50)}...`)
    }

    // 状態翻訳
    if (condition) {
      console.log(`  🏷️ 状態翻訳: "${condition}"`)
      const englishCondition = await translateText(condition)
      translations.condition = englishCondition
      console.log(`  ✅ → "${englishCondition}"`)
    }

    // データベースに保存（productIdがある場合）
    if (productId) {
      console.log('  💾 データベースに保存中...')
      
      // 🔥 title_en と description_en のみ保存（condition_enカラムが存在しないため）
      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      
      if (translations.title) {
        updateData.title_en = translations.title
      }
      
      if (translations.description) {
        updateData.description_en = translations.description
      }
      
      // conditionはlisting_dataにJSONとして保存
      if (translations.condition) {
        // 既存のlisting_dataを取得
        const { data: existingProduct } = await supabase
          .from('products_master')
          .select('listing_data')
          .eq('id', productId)
          .single()
        
        const existingListingData = existingProduct?.listing_data || {}
        updateData.listing_data = {
          ...existingListingData,
          condition_en: translations.condition
        }
      }
      
      const { error: updateError } = await supabase
        .from('products_master')
        .update(updateData)
        .eq('id', productId)

      if (updateError) {
        console.error('  ❌ DB保存エラー:', updateError)
        return NextResponse.json({
          success: false,
          error: 'DB保存失敗: ' + updateError.message
        }, { status: 500 })
      }

      console.log('  ✅ データベース保存完了')
    }

    return NextResponse.json({
      success: true,
      translations,
      message: '翻訳が完了しました'
    })

  } catch (error: any) {
    console.error('❌ 翻訳エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || '翻訳に失敗しました' },
      { status: 500 }
    )
  }
}
