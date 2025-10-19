#!/bin/bash
"""
🎯 ヤフオク→eBay完全ワークフロー 起動スクリプト
"""

echo "🚀 ヤフオク→eBay完全ワークフロー システム起動中..."

# 必要なディレクトリ確認
YAHOO_TOOL_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool"

if [ ! -d "$YAHOO_TOOL_DIR" ]; then
    echo "❌ ディレクトリが見つかりません: $YAHOO_TOOL_DIR"
    exit 1
fi

# ディレクトリ移動
cd "$YAHOO_TOOL_DIR"
echo "📁 作業ディレクトリ: $(pwd)"

# Python環境確認
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3が見つかりません"
    exit 1
fi

# 必要なパッケージインストール確認
echo "📦 必要なパッケージ確認中..."

# requirements.txt作成
cat > requirements.txt << EOF
flask>=2.0.0
playwright>=1.40.0
pandas>=1.5.0
requests>=2.28.0
beautifulsoup4>=4.11.0
lxml>=4.9.0
openpyxl>=3.0.0
EOF

# パッケージインストール
python3 -m pip install -r requirements.txt

# Playwright ブラウザインストール
echo "🌐 Playwrightブラウザインストール中..."
python3 -m playwright install chromium

# データディレクトリ作成
mkdir -p yahoo_ebay_data

# 実行権限付与
chmod +x workflow_api_server.py

echo "✅ 環境準備完了！"
echo ""
echo "🎯 === 使用方法 ==="
echo "1. APIサーバー起動:"
echo "   python3 workflow_api_server.py"
echo ""
echo "2. ブラウザでアクセス:"
echo "   http://localhost:5000"
echo ""
echo "3. ワークフロー実行:"
echo "   Step 1: ヤフオクURL入力 → スクレイピング"
echo "   Step 2: CSV編集 → Excelで商品情報編集"
echo "   Step 3: 内容確認 → UI上で確認"
echo "   Step 4: eBay出品 → 自動出品実行"
echo "   Step 5: 在庫管理 → 日次在庫監視"
echo ""
echo "🔧 === 主要ファイル ==="
echo "• workflow_api_server.py     : APIサーバー"
echo "• workflow_dashboard.html    : Web UI"
echo "• complete_yahoo_ebay_workflow.py : メインロジック"
echo "• yahoo_ebay_data/           : データ保存フォルダ"
echo ""
echo "📋 === API エンドポイント ==="
echo "• GET  /                     : メインダッシュボード"
echo "• GET  /test                 : 動作テスト"
echo "• POST /scrape_yahoo         : ヤフオクスクレイピング"
echo "• POST /create_editing_csv   : 編集用CSV作成"
echo "• POST /process_edited_csv   : 編集済みCSV処理"
echo "• POST /start_ebay_listing   : eBay出品実行"
echo "• POST /run_inventory_check  : 在庫チェック実行"
echo ""
echo "🎉 準備完了！以下のコマンドでサーバーを起動してください:"
echo "python3 workflow_api_server.py"
