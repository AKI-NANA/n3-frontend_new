#!/bin/bash
# Yahoo Auction Tool スクレイピング機能修正スクリプト
# 作成日: 2025-09-11

echo "🚀 Yahoo Auction Tool スクレイピング機能修正開始"

# ディレクトリ移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/py

# 仮想環境作成
echo "📦 Python仮想環境作成中..."
python3 -m venv yahoo_auction_env

# 仮想環境有効化
echo "🔌 仮想環境有効化中..."
source yahoo_auction_env/bin/activate

# 必要パッケージインストール
echo "📥 必要パッケージインストール中..."
pip install flask flask-cors pandas requests sqlite3

# APIサーバー起動
echo "🌐 APIサーバー起動中..."
echo "アクセス先: http://localhost:5002"
echo "ヘルスチェック: http://localhost:5002/health"
echo ""
echo "停止するには Ctrl+C を押してください"
echo ""

python3 enhanced_api_port5002_fixed.py
