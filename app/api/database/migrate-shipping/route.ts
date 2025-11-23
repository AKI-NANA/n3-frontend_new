// app/api/database/migrate-shipping/route.ts
// 出荷管理システム用マイグレーションSQLを表示

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    // マイグレーションファイルを読み込み
    const migrationsDir = path.join(process.cwd(), 'supabase/migrations')

    const salesOrdersPath = path.join(migrationsDir, '20251123_sales_orders.sql')
    const packingInstructionsPath = path.join(migrationsDir, '20251123_packing_instructions_master.sql')
    const processLogPath = path.join(migrationsDir, '20251123_shipping_process_log.sql')

    const salesOrdersSql = fs.readFileSync(salesOrdersPath, 'utf-8')
    const packingInstructionsSql = fs.readFileSync(packingInstructionsPath, 'utf-8')
    const processLogSql = fs.readFileSync(processLogPath, 'utf-8')

    // 統合SQLコンテンツ
    const combinedSql = `-- ================================================================
-- 🚢 出荷管理システム - 統合マイグレーション
-- ================================================================
-- 作成日: 2025-11-23
-- 含まれるテーブル:
--   1. sales_orders (受注管理)
--   2. packing_instructions_master (梱包指示書)
--   3. shipping_process_log (作業ログ)
-- ================================================================

${salesOrdersSql}

-- ================================================================

${packingInstructionsSql}

-- ================================================================

${processLogSql}

-- ================================================================
-- 全マイグレーション完了
-- ================================================================
`

    // 個別ファイル情報
    const files = [
      {
        name: '1. sales_orders.sql',
        content: salesOrdersSql,
        description: '受注データの中核テーブル',
        size: salesOrdersSql.length,
        lines: salesOrdersSql.split('\n').length,
      },
      {
        name: '2. packing_instructions_master.sql',
        content: packingInstructionsSql,
        description: '梱包指示書マスターデータ',
        size: packingInstructionsSql.length,
        lines: packingInstructionsSql.split('\n').length,
      },
      {
        name: '3. shipping_process_log.sql',
        content: processLogSql,
        description: '出荷作業監査ログ',
        size: processLogSql.length,
        lines: processLogSql.split('\n').length,
      },
    ]

    // HTMLとしてフォーマットして返す
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>出荷管理システム - DBマイグレーション</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Monaco', 'Menlo', monospace;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      background: #1e1e1e;
      color: #d4d4d4;
    }
    h1 {
      color: #4fc3f7;
      border-bottom: 3px solid #4fc3f7;
      padding-bottom: 10px;
      margin-top: 0;
    }
    h2 {
      color: #81c784;
      border-bottom: 2px solid #81c784;
      padding-bottom: 8px;
      margin-top: 30px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      border: none;
      color: white;
      font-size: 2em;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 1.1em;
      opacity: 0.9;
    }
    .instructions {
      background: #2d2d2d;
      border-left: 4px solid #4fc3f7;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .instructions h2 {
      margin-top: 0;
      color: #4fc3f7;
      border: none;
    }
    .instructions ol {
      margin: 10px 0;
      padding-left: 25px;
    }
    .instructions li {
      margin: 10px 0;
      line-height: 1.6;
    }
    .instructions a {
      color: #4fc3f7;
      text-decoration: none;
      font-weight: bold;
    }
    .instructions a:hover {
      text-decoration: underline;
    }
    .file-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .file-card {
      background: #2d2d2d;
      border: 2px solid #3d3d3d;
      border-radius: 8px;
      padding: 20px;
      transition: all 0.3s ease;
    }
    .file-card:hover {
      border-color: #4fc3f7;
      transform: translateY(-5px);
      box-shadow: 0 5px 20px rgba(79, 195, 247, 0.3);
    }
    .file-card h3 {
      margin-top: 0;
      color: #81c784;
      font-size: 1.2em;
    }
    .file-card p {
      margin: 8px 0;
      color: #9cdcfe;
    }
    .file-card .stats {
      display: flex;
      gap: 15px;
      margin-top: 15px;
      font-size: 0.9em;
      color: #888;
    }
    .stats span {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .sql-container {
      position: relative;
      margin: 30px 0;
    }
    .tab-buttons {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .tab-button {
      background: #2d2d2d;
      color: #d4d4d4;
      border: 2px solid #3d3d3d;
      padding: 12px 24px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s ease;
    }
    .tab-button:hover {
      background: #3d3d3d;
      border-color: #4fc3f7;
    }
    .tab-button.active {
      background: #4fc3f7;
      color: #1e1e1e;
      border-color: #4fc3f7;
    }
    pre {
      background: #2d2d2d;
      border: 1px solid #3d3d3d;
      border-radius: 5px;
      padding: 20px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.6;
      max-height: 600px;
      overflow-y: auto;
    }
    .copy-button {
      position: sticky;
      top: 10px;
      float: right;
      background: #4fc3f7;
      color: #1e1e1e;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
      z-index: 10;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
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
      padding: 15px 30px;
      border-radius: 5px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      font-weight: bold;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    }
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .warning-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      color: #856404;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .warning-box strong {
      color: #d39e00;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚢 出荷管理システム - データベースマイグレーション</h1>
    <p>受注管理、梱包指示、作業ログの3テーブルを一括構築</p>
  </div>

  <div class="instructions">
    <h2>📋 実行手順</h2>
    <ol>
      <li>下の「統合SQL」または個別SQLタブを選択</li>
      <li>「SQLをコピー」ボタンをクリック</li>
      <li><a href="https://supabase.com/dashboard" target="_blank">Supabaseダッシュボード</a>を開く</li>
      <li>プロジェクトを選択</li>
      <li>左メニューから「SQL Editor」を選択</li>
      <li>「New Query」をクリック</li>
      <li>コピーしたSQLを貼り付け</li>
      <li>「Run」ボタンをクリックして実行</li>
    </ol>
  </div>

  <div class="warning-box">
    <strong>⚠️ 注意事項:</strong>
    マイグレーション実行後、<code>sales_orders</code>テーブルと<code>products_master</code>テーブルの外部キー制約を手動で設定してください（コメントアウトされています）。
  </div>

  <h2>📁 含まれるマイグレーションファイル</h2>
  <div class="file-cards">
    ${files.map((file, index) => `
      <div class="file-card">
        <h3>${file.name}</h3>
        <p>${file.description}</p>
        <div class="stats">
          <span>📄 ${file.lines.toLocaleString()} 行</span>
          <span>💾 ${(file.size / 1024).toFixed(1)} KB</span>
        </div>
      </div>
    `).join('')}
  </div>

  <h2>📝 SQL内容</h2>
  <div class="tab-buttons">
    <button class="tab-button active" onclick="showTab('combined')">📦 統合SQL（推奨）</button>
    <button class="tab-button" onclick="showTab('sales')">1️⃣ Sales Orders</button>
    <button class="tab-button" onclick="showTab('packing')">2️⃣ Packing Instructions</button>
    <button class="tab-button" onclick="showTab('log')">3️⃣ Process Log</button>
  </div>

  <div class="sql-container">
    <button class="copy-button" onclick="copyCurrentTab()">📋 SQLをコピー</button>

    <div id="tab-combined" class="tab-content">
      <pre id="sql-combined">${escapeHtml(combinedSql)}</pre>
    </div>

    <div id="tab-sales" class="tab-content" style="display: none;">
      <pre id="sql-sales">${escapeHtml(salesOrdersSql)}</pre>
    </div>

    <div id="tab-packing" class="tab-content" style="display: none;">
      <pre id="sql-packing">${escapeHtml(packingInstructionsSql)}</pre>
    </div>

    <div id="tab-log" class="tab-content" style="display: none;">
      <pre id="sql-log">${escapeHtml(processLogSql)}</pre>
    </div>
  </div>

  <div class="success-message" id="success-message">
    ✅ SQLをクリップボードにコピーしました！
  </div>

  <script>
    let currentTab = 'combined';

    function showTab(tabName) {
      // 全てのタブを非表示
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
      });

      // 全てのボタンを非アクティブ
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
      });

      // 選択されたタブを表示
      document.getElementById('tab-' + tabName).style.display = 'block';
      event.target.classList.add('active');

      currentTab = tabName;
    }

    function copyCurrentTab() {
      const sqlContent = document.getElementById('sql-' + currentTab).textContent;
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
        error: error.message || 'マイグレーションファイルの読み込みに失敗しました',
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
