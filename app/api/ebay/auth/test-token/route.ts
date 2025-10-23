import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const refreshToken = process.env.EBAY_REFRESH_TOKEN;
  
  if (!refreshToken || refreshToken.includes('<') || refreshToken.includes('入力')) {
    return NextResponse.json({ 
      error: 'Refresh token not configured',
      message: '.env.localにEBAY_REFRESH_TOKENを設定してください' 
    }, { status: 400 });
  }

  try {
    const credentials = Buffer.from(
      `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
    ).toString('base64');

    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    return NextResponse.json({
      success: true,
      environment: 'Production',
      access_token: data.access_token.substring(0, 20) + '...',
      expires_in: data.expires_in,
      expires_in_hours: Math.floor(data.expires_in / 3600),
      message: '✅ リフレッシュトークンが正常に動作しています！（本番環境）',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to refresh token',
      details: error.message 
    }, { status: 500 });
  }
}
