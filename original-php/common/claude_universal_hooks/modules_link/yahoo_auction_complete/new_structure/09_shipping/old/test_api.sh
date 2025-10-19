#!/bin/bash
# API動作確認テスト
echo "🔧 API動作確認テスト"
echo "==================="

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/

echo "📂 APIファイル存在確認:"
if [ -f "api/database_viewer.php" ]; then
    echo "✅ api/database_viewer.php 存在"
    ls -la api/database_viewer.php
else
    echo "❌ api/database_viewer.php 不存在"
fi

echo ""
echo "🌐 サーバー稼働確認:"
if lsof -i :8085 > /dev/null 2>&1; then
    echo "✅ ポート8085でサーバー稼働中"
    
    echo ""
    echo "📊 API統計情報テスト:"
    curl -X POST "http://localhost:8085/api/database_viewer.php" \
        -H "Content-Type: application/json" \
        -d '{"action":"get_statistics"}' \
        -w "\nHTTPコード: %{http_code}\n" 2>/dev/null
    
    echo ""
    echo "🔍 API EMSデータテスト:"
    curl -X POST "http://localhost:8085/api/database_viewer.php" \
        -H "Content-Type: application/json" \
        -d '{"action":"get_shipping_data","filters":{"company":"JPPOST","service":"EMS","country":"US","zone":"ALL"}}' \
        -w "\nHTTPコード: %{http_code}\n" 2>/dev/null
        
else
    echo "❌ サーバー未稼働"
    echo "サーバー再起動中..."
    ./start_shipping_server_fixed.sh
fi