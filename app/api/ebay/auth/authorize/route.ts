import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // MJTアカウントのClient IDを使用（greenも同じClient IDなので両方で使える）
    const clientId = process.env.EBAY_CLIENT_ID_MJT || process.env.EBAY_CLIENT_ID;
    
    // 環境に応じてリダイレクトURIを選択
    const host = request.headers.get('host') || '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    
    const redirectUri = isLocalhost 
      ? process.env.EBAY_REDIRECT_URI_LOCAL
      : process.env.EBAY_REDIRECT_URI_PRODUCTION;
    
    // 環境変数のチェック
    if (!clientId) {
      console.error('❌ EBAY_CLIENT_ID_MJT または EBAY_CLIENT_ID が設定されていません')
      return NextResponse.json(
        { error: 'EBAY_CLIENT_IDが設定されていません' },
        { status: 500 }
      )
    }
    
    if (!redirectUri) {
      console.error('❌ EBAY_REDIRECT_URI が設定されていません')
      console.error(`Host: ${host}, isLocalhost: ${isLocalhost}`)
      return NextResponse.json(
        { 
          error: 'EBAY_REDIRECT_URIが設定されていません',
          environment: isLocalhost ? 'local' : 'production',
          required: isLocalhost ? 'EBAY_REDIRECT_URI_LOCAL' : 'EBAY_REDIRECT_URI_PRODUCTION'
        },
        { status: 500 }
      )
    }
    
    console.log('🔑 eBay認証リダイレクト開始')
    console.log('Host:', host)
    console.log('Environment:', isLocalhost ? 'Local' : 'Production')
    console.log('Client ID:', clientId.substring(0, 20) + '...')
    console.log('Redirect URI:', redirectUri)
    
    // ✅ Browse API (Buy API)用のスコープを追加
    const scope = encodeURIComponent(
      'https://api.ebay.com/oauth/api_scope ' +
      'https://api.ebay.com/oauth/api_scope/sell.account ' +
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment ' +
      'https://api.ebay.com/oauth/api_scope/sell.inventory ' +
      'https://api.ebay.com/oauth/api_scope/buy.item.feed ' +
      'https://api.ebay.com/oauth/api_scope/buy.marketplace.insights'
    );
    
    // 本番環境のeBay認証URL
    const authUrl = `https://auth.ebay.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
    
    console.log('✅ リダイレクトURL生成成功')
    
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('❌ eBay認証リダイレクトエラー:', error)
    return NextResponse.json(
      { 
        error: '認証リダイレクトに失敗しました',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
