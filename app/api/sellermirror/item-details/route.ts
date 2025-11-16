// app/api/sellermirror/item-details/route.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * eBay Item Details API - 個別商品の詳細情報を取得
 * Item Specifics（必須項目）を含む完全な商品情報を取得
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemId } = body

    console.log('🔍 eBay商品詳細取得開始')
    console.log('  itemId:', itemId)

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'Item IDが必要です' },
        { status: 400 }
      )
    }

    // eBay認証情報
    const clientId = process.env.EBAY_CLIENT_ID
    const clientSecret = process.env.EBAY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'eBay認証情報が設定されていません' },
        { status: 500 }
      )
    }

    // Application Token取得
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

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Browse API - Get Item Details
    const itemUrl = `https://api.ebay.com/buy/browse/v1/item/${itemId}`
    
    const itemResponse = await fetch(itemUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    })

    if (!itemResponse.ok) {
      const errorText = await itemResponse.text()
      console.error('❌ Item API Error:', errorText)
      return NextResponse.json(
        { success: false, error: 'Item詳細取得失敗' },
        { status: 500 }
      )
    }

    const itemData = await itemResponse.json()

    console.log('✅ Item詳細取得成功')
    console.log('  localizedAspects:', itemData.localizedAspects?.length)

    // Item Specifics（必須項目）を整形
    const itemSpecifics = (itemData.localizedAspects || []).reduce((acc: any, aspect: any) => {
      acc[aspect.name] = aspect.value
      return acc
    }, {})

    // 詳細データを整形
    const detailedItem = {
      itemId: itemData.itemId,
      title: itemData.title,
      price: itemData.price?.value,
      currency: itemData.price?.currency,
      condition: itemData.condition,
      conditionDescription: itemData.conditionDescription,
      
      // カテゴリ情報
      categoryId: itemData.categories?.[0]?.categoryId,
      categoryPath: itemData.categoryPath,
      
      // セラー情報
      seller: {
        username: itemData.seller?.username,
        feedbackScore: itemData.seller?.feedbackScore,
        feedbackPercentage: itemData.seller?.feedbackPercentage
      },
      
      // 配送情報
      shippingOptions: itemData.shippingOptions?.map((opt: any) => ({
        shippingCost: opt.shippingCost?.value || 0,
        shippingCostType: opt.shippingCostType,
        minEstimatedDeliveryDate: opt.minEstimatedDeliveryDate,
        maxEstimatedDeliveryDate: opt.maxEstimatedDeliveryDate
      })),
      
      // 発送元
      itemLocation: {
        city: itemData.itemLocation?.city,
        stateOrProvince: itemData.itemLocation?.stateOrProvince,
        postalCode: itemData.itemLocation?.postalCode,
        country: itemData.itemLocation?.country
      },
      
      // Item Specifics（必須項目）⭐
      itemSpecifics: itemSpecifics,
      
      // その他の情報
      quantitySold: itemData.unitsSold,
      quantityAvailable: itemData.estimatedAvailabilities?.[0]?.estimatedAvailableQuantity,
      itemWebUrl: itemData.itemWebUrl,
      image: itemData.image?.imageUrl,
      additionalImages: itemData.additionalImages?.map((img: any) => img.imageUrl) || [],
      description: itemData.description,
      shortDescription: itemData.shortDescription,
      
      // 商品の詳細情報
      product: itemData.product,
      
      // タイムスタンプ
      retrievedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      itemId,
      detailedItem,
      message: 'Item詳細を取得しました'
    })

  } catch (error: any) {
    console.error('❌ Item詳細取得エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Item詳細取得に失敗しました' },
      { status: 500 }
    )
  }
}
