import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.EBAY_APP_ID;
  const redirectUri = encodeURIComponent(process.env.EBAY_REDIRECT_URI || '');
  const scope = encodeURIComponent('https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory');
  
  // 本番環境のeBay認証URL
  const authUrl = `https://auth.ebay.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;
  
  return NextResponse.redirect(authUrl);
}
