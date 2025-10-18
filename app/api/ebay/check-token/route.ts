import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const account = req.nextUrl.searchParams.get('account') || 'green'
    
    const token = account === 'mjt'
      ? process.env.EBAY_USER_ACCESS_TOKEN_MJT
      : process.env.EBAY_USER_ACCESS_TOKEN_GREEN
    
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    // トークンの最初と最後の10文字のみ表示（セキュリティ）
    const maskedToken = `${token.substring(0, 10)}...${token.substring(token.length - 10)}`
    
    return NextResponse.json({
      account,
      tokenLength: token.length,
      tokenPreview: maskedToken,
      isSet: !!token
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
