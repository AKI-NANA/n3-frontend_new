import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const account = req.nextUrl.searchParams.get('account') || 'green'
    
    // トークン取得
    const token = account === 'mjt'
      ? process.env.EBAY_USER_ACCESS_TOKEN_MJT
      : process.env.EBAY_USER_ACCESS_TOKEN_GREEN
    
    if (!token) {
      throw new Error('eBay access token not found')
    }

    console.log(`🔍 ${account}アカウントのRate Tableを取得中...`)

    // eBay APIでRate Table一覧を取得
    const response = await fetch(
      'https://api.ebay.com/sell/account/v1/rate_table',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en-US'
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ eBay APIエラー:', data)
      return NextResponse.json(
        { error: data.errors || data },
        { status: response.status }
      )
    }

    console.log('✅ Rate Table取得成功:', data.rateTables?.length || 0, '個')

    return NextResponse.json({
      success: true,
      account,
      rateTables: data.rateTables || [],
      total: data.total || 0
    })

  } catch (error: any) {
    console.error('❌ エラー:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
