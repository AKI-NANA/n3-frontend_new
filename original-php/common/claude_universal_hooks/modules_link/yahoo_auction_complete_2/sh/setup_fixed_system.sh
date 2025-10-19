#!/bin/bash

echo "🔧 修復版システム セットアップ開始..."

# 必要ライブラリインストール
echo "📦 ライブラリインストール中..."
pip install flask flask-cors pandas requests playwright

# Playwright初期化
echo "🎭 Playwright初期化中..."
python -m playwright install

# 実行権限付与
echo "🔑 実行権限付与中..."
chmod +x workflow_api_server_fixed.py

echo ""
echo "✅ セットアップ完了!"
echo ""
echo "🚀 起動コマンド:"
echo "python3 workflow_api_server_fixed.py"
echo ""
echo "🌐 アクセスURL:"
echo "http://localhost:5001"
