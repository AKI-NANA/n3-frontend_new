#!/bin/bash
# 緊急サーバー起動スクリプト
# ファイル: start_emergency_server.sh

echo "🚀 送料システム緊急サーバー起動"
echo "================================"

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/

# 既存サーバープロセス確認・停止
echo "📋 Step 1: 既存サーバー確認"
if lsof -i :8085 > /dev/null 2>&1; then
    echo "⚠️ ポート8085使用中 - プロセス停止中..."
    lsof -ti :8085 | xargs kill -9 2>/dev/null
    sleep 2
fi

if lsof -i :8080 > /dev/null 2>&1; then
    echo "ℹ️ ポート8080使用中（メインサーバー）"
fi

echo ""
echo "📋 Step 2: PHPサーバー起動"
echo "ポート: 8085"
echo "ドキュメントルート: $(pwd)"

# バックグラウンドでPHPサーバー起動
php -S localhost:8085 > server.log 2>&1 &
SERVER_PID=$!

echo "サーバーPID: $SERVER_PID"
echo "ログファイル: server.log"

# 起動確認
sleep 3

if lsof -i :8085 > /dev/null 2>&1; then
    echo "✅ PHPサーバー起動成功"
    
    echo ""
    echo "🌐 アクセスURL（PHP動作版）:"
    echo "================================"
    echo "1. 📊 送料計算: http://localhost:8085/shipping_calculator_ui.html"
    echo "2. 🎯 4層選択: http://localhost:8085/complete_4layer_shipping_ui.html" 
    echo "3. 🌍 ゾーン管理: http://localhost:8085/zone_management_complete_ui.html"
    echo "4. 🏢 独立マトリックス: http://localhost:8085/carrier_separated_matrix.html"
    echo "5. 📊 データベース表示: http://localhost:8085/database_viewer_ui.html"
    echo "6. 🚨 緊急診断: http://localhost:8085/database_emergency_diagnostic.html"
    
    echo ""
    echo "🔧 API動作確認:"
    sleep 2
    API_TEST=$(curl -s "http://localhost:8085/api/database_viewer.php" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"action":"get_statistics"}' 2>/dev/null)
    
    if echo "$API_TEST" | grep -q "success"; then
        echo "✅ API正常動作"
        echo "データ例: $(echo "$API_TEST" | head -c 100)..."
    else
        echo "⚠️ API応答問題 - 手動確認必要"
    fi
    
    echo ""
    echo "📋 サーバー管理:"
    echo "停止方法: kill $SERVER_PID"
    echo "ログ確認: tail -f server.log"
    echo "プロセス確認: ps aux | grep php"
    
else
    echo "❌ サーバー起動失敗"
    echo "📋 トラブルシュート:"
    echo "1. PHP確認: php --version"
    echo "2. ポート確認: lsof -i :8085"
    echo "3. ログ確認: cat server.log"
fi

echo ""
echo "🎯 今すぐテスト推奨:"
echo "http://localhost:8085/database_viewer_ui.html"
echo "「📊 統計表示」ボタンでデータベース接続確認"