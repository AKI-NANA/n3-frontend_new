// app/api/database/migrate-sm-sales/route.ts
// sm_sales_countカラム追加マイグレーション

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    // マイグレーションファイルを読み込み
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20251030_add_sm_sales_count.sql')
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8')

    // HTMLとしてフォーマットして返す
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SellerMirror販売数カラム追加 - DBマイグレーション</title>
  <style>
    body {
      font-family: 'Monaco', 'Menlo', monospace;
      max-width: 1200px;
      margin: 20px auto;
      padding: 20px;
      background: #1e1e1e;
      color: #d4d4d4;
    }
    h1 {
      color: #4fc3f7;
      border-bottom: 2px solid #4fc3f7;
      padding-bottom: 10px;
    }
    .instructions {
      background: #2d2d2d;
      border-left: 4px solid #4fc3f7;
      padding: 15px;
      margin: 20px 0;
    }
    .instructions h2 {
      margin-top: 0;
      color: #4fc3f7;
    }
    .instructions ol {
      margin: 10px 0;
    }
    .instructions li {
      margin: 8px 0;
    }
    .instructions a {
      color: #4fc3f7;
      text-decoration: none;
    }
    .instructions a:hover {
      text-decoration: underline;
    }
    .sql-container {
      position: relative;
    }
    pre {
      background: #2d2d2d;
      border: 1px solid #3d3d3d;
      border-radius: 5px;
      padding: 20px;
      overflow-x: auto;
      font-size: 14px;
      line-height: 1.6;
    }
    .copy-button {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #4fc3f7;
      color: #1e1e1e;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    .copy-button:hover {
      background: #29b6f6;
    }
    .copy-button:active {
      background: #0288d1;
    }
    .success-message {
      display: none;
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .stats {
      background: #2d2d2d;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .stats p {
      margin: 5px 0;
      color: #9cdcfe;
    }
    .warning {
      background: #ff9800;
      color: #1e1e1e;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>📊 SellerMirror販売数カラム追加 - DBマイグレーション</h1>

  <div class="warning">
    ⚠️ このマイグレーションは productsテーブルに sm_sales_count カラムを追加します
  </div>

  <div class="instructions">
    <h2>📋 実行手順</h2>
    <ol>
      <li>下の「SQLをコピー」ボタンをクリック</li>
      <li><a href="https://supabase.com/dashboard/project/zdzfpucdyxdlavkgrvil" target="_blank">Supabaseダッシュボード</a>を開く</li>
      <li>左メニューから「SQL Editor」を選択</li>
      <li>「New Query」をクリック</li>
      <li>コピーしたSQLを貼り付け</li>
      <li>「Run」ボタンをクリックして実行</li>
      <li>「Success. No rows returned」と表示されたら完了</li>
    </ol>
  </div>

  <div class="stats">
    <p><strong>マイグレーションファイル:</strong> 20251030_add_sm_sales_count.sql</p>
    <p><strong>対象テーブル:</strong> products</p>
    <p><strong>追加カラム:</strong> sm_sales_count (INTEGER)</p>
    <p><strong>文字数:</strong> ${sqlContent.length.toLocaleString()} 文字</p>
    <p><strong>行数:</strong> ${sqlContent.split('\n').length.toLocaleString()} 行</p>
  </div>

  <div class="sql-container">
    <button class="copy-button" onclick="copyToClipboard()">📋 SQLをコピー</button>
    <pre id="sql-content">${escapeHtml(sqlContent)}</pre>
  </div>

  <div class="success-message" id="success-message">
    ✅ SQLをクリップボードにコピーしました！
  </div>

  <script>
    function copyToClipboard() {
      const sqlContent = document.getElementById('sql-content').textContent;
      navigator.clipboard.writeText(sqlContent).then(() => {
        const message = document.getElementById('success-message');
        message.style.display = 'block';
        setTimeout(() => {
          message.style.display = 'none';
        }, 3000);
      }).catch(err => {
        alert('コピーに失敗しました: ' + err);
      });
    }
  </script>
</body>
</html>
`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'SQLファイルの読み込みに失敗しました',
      },
      { status: 500 }
    )
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
