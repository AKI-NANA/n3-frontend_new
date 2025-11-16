// app/api/ebay/category-specifics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * eBay GetCategorySpecifics API
 * カテゴリIDから必須項目・推奨項目を取得
 */

interface ItemSpecific {
  name: string
  label: string
  type: 'text' | 'select' | 'number'
  required: boolean
  cardinality?: 'SINGLE' | 'MULTI'
  options?: string[]
  maxLength?: number
  aspectConstraint?: {
    aspectDataType: string
    aspectRequired: boolean
    aspectMode: string
    aspectEnabledForVariations: boolean
  }
}

interface CategorySpecifics {
  categoryId: string
  categoryName: string
  requiredFields: ItemSpecific[]
  recommendedFields: ItemSpecific[]
  cachedAt: string
}

export async function POST(request: NextRequest) {
  try {
    const { categoryId } = await request.json()

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'categoryIdが必要です' },
        { status: 400 }
      )
    }

    console.log(`🔍 カテゴリ ${categoryId} の必須項目を取得中...`)

    // 1. キャッシュを確認（24時間以内）
    const { data: cached } = await supabase
      .from('ebay_category_specifics')
      .select('*')
      .eq('category_id', categoryId)
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single()

    if (cached) {
      console.log(`✅ キャッシュから取得`)
      return NextResponse.json({
        success: true,
        categoryId,
        categoryName: cached.category_name,
        requiredFields: cached.required_fields || [],
        recommendedFields: cached.recommended_fields || [],
        cached: true
      })
    }

    // 2. eBay Taxonomy API (Metadata) から取得
    console.log(`📡 eBay APIから取得中...`)
    
    const clientId = process.env.EBAY_CLIENT_ID || process.env.EBAY_APP_ID
    const clientSecret = process.env.EBAY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'eBay認証情報が設定されていません' },
        { status: 500 }
      )
    }

    // OAuth Token取得
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const tokenResponse = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope'
      })
    })

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'eBayトークン取得失敗' },
        { status: 500 }
      )
    }

    const { access_token } = await tokenResponse.json()

    // eBay Taxonomy API: Get Item Aspects for Category
    const aspectsUrl = `https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category?category_id=${categoryId}`
    
    const aspectsResponse = await fetch(aspectsUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!aspectsResponse.ok) {
      const errorText = await aspectsResponse.text()
      console.error(`❌ eBay API エラー:`, errorText)
      return NextResponse.json(
        { success: false, error: 'eBay API呼び出し失敗', details: errorText },
        { status: aspectsResponse.status }
      )
    }

    const aspectsData = await aspectsResponse.json()

    console.log(`📋 取得したaspects:`, {
      categoryId: aspectsData.categoryTreeId,
      aspectsCount: aspectsData.aspects?.length || 0
    })

    // 3. Item Specificsを整形
    const requiredFields: ItemSpecific[] = []
    const recommendedFields: ItemSpecific[] = []

    if (aspectsData.aspects && Array.isArray(aspectsData.aspects)) {
      aspectsData.aspects.forEach((aspect: any) => {
        const field: ItemSpecific = {
          name: aspect.localizedAspectName,
          label: aspect.localizedAspectName,
          type: determineFieldType(aspect),
          required: aspect.aspectConstraint?.aspectRequired || false,
          cardinality: aspect.aspectConstraint?.aspectCardinality,
          options: aspect.aspectValues?.map((v: any) => v.localizedValue) || [],
          maxLength: aspect.aspectConstraint?.aspectMaxLength,
          aspectConstraint: aspect.aspectConstraint
        }

        if (field.required) {
          requiredFields.push(field)
        } else {
          recommendedFields.push(field)
        }
      })
    }

    console.log(`✅ 必須項目: ${requiredFields.length}件`)
    console.log(`✅ 推奨項目: ${recommendedFields.length}件`)

    // 4. DBにキャッシュ
    const categoryName = aspectsData.categoryName || aspectsData.categoryTreeNodeAncestors?.[0]?.categoryName || 'Unknown'

    const { error: upsertError } = await supabase
      .from('ebay_category_specifics')
      .upsert({
        category_id: categoryId,
        category_name: categoryName,
        required_fields: requiredFields,
        recommended_fields: recommendedFields,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'category_id'
      })

    if (upsertError) {
      console.error('⚠️ キャッシュ保存エラー:', upsertError)
      // エラーでも続行
    } else {
      console.log('✅ キャッシュに保存')
    }

    return NextResponse.json({
      success: true,
      categoryId,
      categoryName,
      requiredFields,
      recommendedFields,
      cached: false
    })

  } catch (error: any) {
    console.error('❌ カテゴリ必須項目取得エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'カテゴリ必須項目取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * Aspectのデータ型からフィールドタイプを判定
 */
function determineFieldType(aspect: any): 'text' | 'select' | 'number' {
  const dataType = aspect.aspectConstraint?.aspectDataType?.toLowerCase()
  
  // 選択肢がある場合はselect
  if (aspect.aspectValues && aspect.aspectValues.length > 0) {
    return 'select'
  }
  
  // データ型から判定
  if (dataType?.includes('number') || dataType?.includes('integer')) {
    return 'number'
  }
  
  return 'text'
}
