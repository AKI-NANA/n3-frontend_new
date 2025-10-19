#!/bin/bash
# 🚨 ワンライン修復コマンド

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_tool && pkill -f enhanced_complete_api_updated.py; python3 -m venv venv 2>/dev/null; source venv/bin/activate; pip install flask flask-cors pandas requests --quiet; echo "🚀 APIサーバー起動中..."; python3 enhanced_complete_api_updated.py &
echo "⏳ 5秒待機後にヘルスチェック..."
sleep 5
curl -s http://localhost:5001/health && echo -e "\n✅ API修復完了!" || echo -e "\n❌ 修復失敗"
echo "🌐 フロントエンド: http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php"
