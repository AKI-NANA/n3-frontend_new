import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // MJTアカウントのClient IDを使用（greenも同じClient IDなので両方で使える）
  const clientId = process.env.EBAY_CLIENT_ID_MJT;
  const redirectUri = encodeURIComponent(process.env.EBAY_REDIRECT_URI || '');
  const scope = encodeURIComponent('https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.inventory');
  
  // 本番環境のeBay認証URL
  const authUrl = `https://auth.ebay.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;
  
  return NextResponse.redirect(authUrl);
}
