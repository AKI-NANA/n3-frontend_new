/**
 * eBay Inventory API エンドポイント
 * User Token を使用してインベントリ情報を取得
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const userToken = process.env.EBAY_USER_ACCESS_TOKEN

    if (!userToken) {
      return NextResponse.json(
        { error: 'EBAY_USER_ACCESS_TOKEN が設定されていません' },
        { status: 400 }
      )
    }

    console.log('📤 eBay Inventory API を呼び出し中...')

    // eBay Inventory API エンドポイント
    const response = await fetch('https://api.ebay.com/sell/inventory/v1/inventory_items', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
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

    console.log('✅ インベントリ取得成功')

    try {
      const jsonData = JSON.parse(data)
      return NextResponse.json({
        success: true,
        data: jsonData,
        message: 'インベントリデータを取得しました'
      })
    } catch (e) {
      return NextResponse.json({
        success: true,
        data: data,
        message: 'インベントリデータを取得しました（テキスト形式）'
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
