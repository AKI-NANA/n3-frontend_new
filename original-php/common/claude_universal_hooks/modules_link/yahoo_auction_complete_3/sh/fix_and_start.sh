#!/bin/bash

# 🚀 Yahoo→eBay システム 緊急修復・起動スクリプト

echo "🔧 Yahoo→eBay システム緊急修復開始..."

# Step 1: 既存プロセス強制終了
echo "🛑 既存プロセス停止中..."

# ポート5001を使用中のプロセスを強制終了
sudo lsof -ti:5001 | xargs sudo kill -9 2>/dev/null || true

# Python関連プロセスを検索・終了
pkill -f "enhanced_complete_api" 2>/dev/null || true
pkill -f "api_server" 2>/dev/null || true
pkill -f "integrated_api" 2>/dev/null || true

# Step 2: プロセス確認
echo "📊 プロセス確認中..."
sleep 2

# ポート使用状況確認
PORT_CHECK=$(lsof -i:5001 2>/dev/null | wc -l)
if [ $PORT_CHECK -gt 0 ]; then
    echo "⚠️ ポート5001がまだ使用中です。さらに強力な方法で停止します..."
    sudo kill -9 $(lsof -ti:5001) 2>/dev/null || true
    sleep 3
fi

# Step 3: ディレクトリ移動確認
echo "📂 作業ディレクトリ確認..."
WORK_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool"

if [ ! -d "$WORK_DIR" ]; then
    echo "❌ 作業ディレクトリが見つかりません: $WORK_DIR"
    exit 1
fi

cd "$WORK_DIR"
echo "✅ 作業ディレクトリ: $(pwd)"

# Step 4: APIファイル存在確認
if [ ! -f "enhanced_complete_api.py" ]; then
    echo "❌ enhanced_complete_api.py が見つかりません"
    echo "📁 現在のファイル一覧:"
    ls -la *.py 2>/dev/null || echo "Pythonファイルが見つかりません"
    exit 1
fi

echo "✅ APIファイル確認完了"

# Step 5: Python環境確認
echo "🐍 Python環境確認..."
PYTHON_VERSION=$(python3 --version 2>/dev/null || echo "Python3 not found")
echo "Python バージョン: $PYTHON_VERSION"

# 必要なパッケージ確認・インストール
echo "📦 必要パッケージ確認..."
python3 -c "import requests, sqlite3, json, time, pathlib, urllib" 2>/dev/null || {
    echo "⚠️ 必要なパッケージをインストール中..."
    pip3 install requests 2>/dev/null || {
        echo "❌ パッケージインストールに失敗しました"
        echo "💡 手動でインストールしてください: pip3 install requests"
    }
}

# Step 6: データディレクトリ確認・作成
echo "📁 データディレクトリ確認..."
mkdir -p yahoo_ebay_data
echo "✅ データディレクトリ準備完了"

# Step 7: ポート最終確認
echo "🔍 ポート5001最終確認..."
if lsof -i:5001 >/dev/null 2>&1; then
    echo "❌ ポート5001がまだ使用中です"
    echo "🔧 使用中のプロセス:"
    lsof -i:5001
    echo ""
    echo "💡 手動で以下を実行してください:"
    echo "sudo kill -9 \$(lsof -ti:5001)"
    exit 1
else
    echo "✅ ポート5001は使用可能です"
fi

# Step 8: APIサーバー起動
echo ""
echo "🚀 Yahoo→eBay APIサーバー起動中..."
echo "========================================================================"
echo "📡 ポート: 5001"
echo "🌐 アクセス: http://localhost:5001"
echo "🛑 停止: Ctrl+C"
echo "========================================================================"
echo ""

# バックグラウンドでAPIサーバー起動し、ログを表示
python3 enhanced_complete_api.py

echo ""
echo "🎉 APIサーバー起動完了！"
echo ""
echo "📋 次のステップ:"
echo "1. ブラウザで http://localhost:8080/modules/yahoo_auction_tool/index.php にアクセス"
echo "2. F12コンソールで以下を実行:"
echo "   const script = document.createElement('script');"
echo "   script.src = 'complete_system_fix.js';"
echo "   document.head.appendChild(script);"
echo ""
