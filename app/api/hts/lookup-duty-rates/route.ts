// app/api/hts/lookup-duty-rates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 🎯 HTSコード・原産国・素材から関税率を検索して返す
 * 
 * リクエスト形式:
 * {
 *   productIds: string[]  // 処理対象の商品ID配列
 *   onlyOriginCountry?: boolean  // 原産国のみ取得
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productIds, onlyOriginCountry } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '商品IDが必要です' },
        { status: 400 }
      )
    }

    console.log('🔍 関税率検索開始')
    console.log(`  対象商品数: ${productIds.length}件`)
    console.log(`  原産国のみ: ${onlyOriginCountry || false}`)

    let updatedCount = 0
    const results: any[] = []

    for (const productId of productIds) {
      try {
        console.log(`\n📦 処理中: ${productId}`)

        // 🔍 商品情報を取得
        const { data: product, error: fetchError } = await supabase
          .from('products_master')
          .select('*')
          .eq('id', productId)
          .single()

        if (fetchError || !product) {
          console.log(`  ⏭️ 商品が見つかりません`)
          results.push({ productId, success: false, error: '商品が見つかりません' })
          continue
        }

        const updates: any = {}

        // 🔥 原産国別の追加関税率を取得
        if (product.origin_country) {
          console.log(`  🌍 原産国: ${product.origin_country}`)
          
          // 国コードの正規化（US, USA, United States → US）
          const normalizedCountryCode = normalizeCountryCode(product.origin_country)
          console.log(`    正規化後: ${normalizedCountryCode}`)
          
          // 🔥 正しいテーブル名: origin_countries
          const { data: countryData } = await supabase
            .from('origin_countries')
            .select('total_additional_tariff, section232_rate, section301_rate, name')
            .eq('code', normalizedCountryCode)
            .eq('active', true)
            .single()

          if (countryData && countryData.total_additional_tariff != null) {
            console.log(`    ✅ 追加関税率: ${countryData.total_additional_tariff * 100}%`)
            console.log(`    国名: ${countryData.name}`)
            updates.origin_country_duty_rate = countryData.total_additional_tariff * 100 // パーセント表示
          } else {
            console.log(`    ⚠️ 追加関税データなし → 0%`)
            updates.origin_country_duty_rate = 0
          }
        }

        // 原産国のみの場合はここで終了
        if (onlyOriginCountry) {
          results.push({ productId, success: true, updates })
          continue
        }

        // 🔥 1. HTSコードから一般関税率を取得
        if (product.hts_code && product.hts_code !== '要確認' && product.hts_code !== '取得失敗') {
          console.log(`  🔍 HTSコード: ${product.hts_code}`)
          
          // 🔥 正しいテーブル名: hts_codes_details (28,881件の完全データ)
          // 🔥 正しいカラム名: hts_number, general_rate, description
          const { data: htsData } = await supabase
            .from('hts_codes_details')
            .select('hts_number, general_rate, special_rate, description, japan_export_common, high_tariff_flag')
            .eq('hts_number', product.hts_code)
            .single()

          if (htsData && htsData.general_rate) {
            // 関税率をパーセント値に変換（例: "5%" → 5, "Free" → 0）
            const dutyRate = htsData.general_rate.toLowerCase() === 'free' 
              ? 0 
              : parseFloat(htsData.general_rate.replace('%', '').replace(/[^0-9.]/g, '')) || 0
              
            console.log(`    ✅ 一般関税率: ${htsData.general_rate} (${dutyRate}%)`)
            updates.hts_duty_rate = dutyRate
            
            // HTS説明も更新（未設定の場合）
            if (!product.hts_description && htsData.description) {
              updates.hts_description = htsData.description
            }
            
            // 特別税率があれば表示
            if (htsData.special_rate && htsData.special_rate.toLowerCase() !== 'free') {
              console.log(`    🇯🇵 特別税率: ${htsData.special_rate}`)
            }
            
            // 日本輸出品フラグ
            if (htsData.japan_export_common) {
              console.log(`    🇯🇵 日本輸出品: はい`)
            }
            
            // 高関税フラグ
            if (htsData.high_tariff_flag) {
              console.log(`    ⚠️ 高関税対象`)
            }
          } else {
            console.log(`    ⚠️ HTSデータが見つかりません (hts_number: ${product.hts_code})`)
          }
        }

        // 🔥 3. 素材別の追加関税を確認
        if (product.material) {
          console.log(`  🧵 素材: ${product.material}`)
          
          // 素材による関税率の変更は通常HTSコード自体が異なるため、
          // 特定の素材で追加関税がある場合のみ処理
          // 例: アルミニウム製品への追加関税など
          
          const specialMaterials = [
            { material: 'aluminum', rate: 10 },
            { material: 'steel', rate: 25 },
            { material: 'stainless steel', rate: 25 },
          ]
          
          const materialLower = product.material.toLowerCase()
          const specialMaterial = specialMaterials.find(m => 
            materialLower.includes(m.material)
          )
          
          if (specialMaterial) {
            console.log(`    ✅ 特殊素材 - 追加関税: ${specialMaterial.rate}%`)
            updates.material_duty_rate = specialMaterial.rate
          } else {
            console.log(`    ✅ 通常素材 - 追加関税なし: 0%`)
            updates.material_duty_rate = 0
          }
        }

        // 🔥 4. データベースに保存
        if (Object.keys(updates).length > 0) {
          console.log(`  💾 更新内容:`, updates)
          
          const { error: updateError } = await supabase
            .from('products_master')
            .update({
              ...updates,
              updated_at: new Date().toISOString()
            })
            .eq('id', productId)

          if (updateError) {
            console.error(`  ❌ 更新エラー:`, updateError)
            results.push({ productId, success: false, error: updateError.message })
          } else {
            console.log(`  ✅ 更新成功`)
            updatedCount++
            results.push({ productId, success: true, updates })
          }
        } else {
          console.log(`  ⏭️ 更新不要（データ不足）`)
          results.push({ productId, success: true, updates: {}, message: 'データ不足のためスキップ' })
        }

      } catch (error: any) {
        console.error(`  ❌ エラー (${productId}):`, error.message)
        results.push({ productId, success: false, error: error.message })
      }
    }

    console.log(`\n📊 処理完了: ${updatedCount}/${productIds.length}件更新`)

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: productIds.length,
      results,
      message: `${updatedCount}件の関税率を更新しました`
    })

  } catch (error: any) {
    console.error('❌ 関税率検索エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || '関税率検索に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 国コードを正規化
 * 様々な表記形式に対応
 */
function normalizeCountryCode(countryInput: string): string {
  const normalized = countryInput.trim().toUpperCase()
  
  // 国コード変換テーブル
  const countryMap: Record<string, string> = {
    'US': 'US',
    'USA': 'US',
    'UNITED STATES': 'US',
    'UNITED STATES OF AMERICA': 'US',
    'アメリカ': 'US',
    'アメリカ合衆国': 'US',
    
    'CN': 'CN',
    'CHINA': 'CN',
    'PRC': 'CN',
    '中国': 'CN',
    '中華人民共和国': 'CN',
    
    'JP': 'JP',
    'JAPAN': 'JP',
    '日本': 'JP',
    
    'KR': 'KR',
    'KOREA': 'KR',
    'SOUTH KOREA': 'KR',
    '韓国': 'KR',
    '大韓民国': 'KR',
    
    'UK': 'GB',
    'GB': 'GB',
    'UNITED KINGDOM': 'GB',
    'GREAT BRITAIN': 'GB',
    'イギリス': 'GB',
    '英国': 'GB',
    
    'DE': 'DE',
    'GERMANY': 'DE',
    'ドイツ': 'DE',
    
    'FR': 'FR',
    'FRANCE': 'FR',
    'フランス': 'FR',
    
    'IT': 'IT',
    'ITALY': 'IT',
    'イタリア': 'IT',
    
    'ES': 'ES',
    'SPAIN': 'ES',
    'スペイン': 'ES',
    
    'CA': 'CA',
    'CANADA': 'CA',
    'カナダ': 'CA',
    
    'MX': 'MX',
    'MEXICO': 'MX',
    'メキシコ': 'MX',
    
    'AU': 'AU',
    'AUSTRALIA': 'AU',
    'オーストラリア': 'AU',
    
    'TW': 'TW',
    'TAIWAN': 'TW',
    '台湾': 'TW',
    
    'HK': 'HK',
    'HONG KONG': 'HK',
    '香港': 'HK',
    
    'SG': 'SG',
    'SINGAPORE': 'SG',
    'シンガポール': 'SG',
    
    'TH': 'TH',
    'THAILAND': 'TH',
    'タイ': 'TH',
    
    'VN': 'VN',
    'VIETNAM': 'VN',
    'ベトナム': 'VN',
    
    'IN': 'IN',
    'INDIA': 'IN',
    'インド': 'IN',
  }
  
  return countryMap[normalized] || normalized.substring(0, 2)
}
