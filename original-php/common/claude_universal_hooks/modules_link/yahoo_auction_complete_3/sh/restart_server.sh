#!/bin/bash
# Flask-CORS インストールとサーバー再起動

echo "🔧 Flask-CORS インストール中..."
pip3 install flask-cors

echo "🚀 修正版サーバー起動中..."
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool
python3 workflow_api_server_complete.py
