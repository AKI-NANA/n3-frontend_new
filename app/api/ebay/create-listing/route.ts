/**
 * eBay Create Listing API エンドポイント
 * User Token を使用して出品を作成
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const userToken = process.env.EBAY_USER_ACCESS_TOKEN

    if (!userToken) {
      return NextResponse.json(
        { error: 'EBAY_USER_ACCESS_TOKEN が設定されていません' },
        { status: 400 }
      )
    }

    const body = await request.json()

    const { title, description, price, quantity, category } = body

    if (!title || !price) {
      return NextResponse.json(
        { error: 'title と price は必須です' },
        { status: 400 }
      )
    }

    console.log('📤 eBay Create Listing API を呼び出し中...')
    console.log('商品:', { title, price, quantity })

    // eBay Inventory API で出品を作成
    // 注：実際には inventory/create を使用
    const listingPayload = {
      title: title,
      description: description || '',
      price: price,
      quantity: quantity || 1,
      categoryId: category || '293'
    }

    const response = await fetch('https://api.ebay.com/sell/inventory/v1/inventory', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(listingPayload)
    })

    const data = await response.text()

    console.log(`ステータス: ${response.status}`)

    if (!response.ok) {
      console.error('❌ eBay API エラー:', data)
      return NextResponse.json(
        {
          error: 'eBay API エラー',
          status: response.status,
          details: data
        },
        { status: response.status }
      )
    }

    console.log('✅ 出品作成成功')

    try {
      const jsonData = JSON.parse(data)
      return NextResponse.json({
        success: true,
        data: jsonData,
        message: '出品を作成しました'
      })
    } catch (e) {
      return NextResponse.json({
        success: true,
        data: data,
        message: '出品を作成しました（テキスト形式）'
      })
    }

  } catch (error: any) {
    console.error('❌ リクエストエラー:', error.message)
    return NextResponse.json(
      { error: error.message || 'リクエストに失敗しました' },
      { status: 500 }
    )
  }
}
