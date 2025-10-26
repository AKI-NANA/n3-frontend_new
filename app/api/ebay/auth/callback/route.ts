import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.json({ error: 'Authorization code not found' }, { status: 400 });
  }

  try {
    const credentials = Buffer.from(
      `${process.env.EBAY_CLIENT_ID_MJT}:${process.env.EBAY_CLIENT_SECRET_MJT}`
    ).toString('base64');

    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.EBAY_REDIRECT_URI || '',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    const { access_token, refresh_token, expires_in } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>eBay Token Retrieved - Production</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial; padding: 40px; background: #f5f5f5; }
          .container { background: white; padding: 30px; border-radius: 8px; max-width: 800px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .token { background: #f0f0f0; padding: 15px; border-radius: 4px; word-break: break-all; margin: 10px 0; font-family: monospace; font-size: 14px; }
          .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
          .production { color: #ff6b6b; font-weight: bold; background: #ffe6e6; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .warning { color: #dc3545; font-weight: bold; background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .copy-btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px; font-size: 16px; }
          .copy-btn:hover { background: #0056b3; }
          .copied { background: #28a745 !important; }
          h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          .command { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; margin: 10px 0; font-family: monospace; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✅ トークン取得成功！</div>
          
          <div class="production">
            🚀 <strong>本番環境 (Production)</strong> のトークンです<br>
            このトークンで実際のeBay取引が可能になります
          </div>
          
          <h2>🔑 Refresh Token（これをVPSに設定）</h2>
          <div class="token" id="refreshToken">${refresh_token}</div>
          <button class="copy-btn" id="copyBtn" onclick="copyToken()">📋 Refresh Tokenをコピー</button>
          
          <div class="warning">
            ⚠️ <strong>重要:</strong> このリフレッシュトークンを今すぐVPSの.env.localに設定してください！<br>
            このトークンは18ヶ月間有効です。
          </div>
          
          <h2>📝 VPSでの設定手順</h2>
          <div class="command">$ ssh ubuntu@tk2-236-27682.vs.sakura.ne.jp
$ cd ~/n3-frontend_new
$ nano .env.local

# この行を探す:
EBAY_REFRESH_TOKEN=

# 上記でコピーしたトークンを貼り付け

# 保存: Ctrl + O → Enter → Ctrl + X

$ pm2 restart n3-frontend</div>
          
          <h2>📊 トークン情報</h2>
          <p><strong>環境:</strong> Production（本番環境）</p>
          <p><strong>Access Token有効期限:</strong> ${expires_in}秒（${Math.floor(expires_in / 3600)}時間）</p>
          <p><strong>Refresh Token有効期限:</strong> 18ヶ月</p>
          
          <details>
            <summary style="cursor: pointer; color: #007bff; font-weight: bold;">🔍 Access Token（デバッグ用）</summary>
            <div class="token">${access_token}</div>
          </details>
        </div>
        
        <script>
          function copyToken() {
            const token = document.getElementById('refreshToken').textContent;
            const btn = document.getElementById('copyBtn');
            navigator.clipboard.writeText(token).then(() => {
              btn.textContent = '✅ コピーしました！';
              btn.classList.add('copied');
              setTimeout(() => {
                btn.textContent = '📋 Refresh Tokenをコピー';
                btn.classList.remove('copied');
              }, 3000);
            });
          }
        </script>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Token Error</title>
        <style>
          body { font-family: Arial; padding: 40px; background: #f5f5f5; }
          .container { background: white; padding: 30px; border-radius: 8px; max-width: 800px; margin: 0 auto; }
          .error { color: #dc3545; font-size: 20px; }
          pre { background: #f0f0f0; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">❌ トークン取得エラー</div>
          <h3>エラー詳細:</h3>
          <pre>${error.message}</pre>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
}
