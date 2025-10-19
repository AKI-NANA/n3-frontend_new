#!/bin/bash

echo "🚀 09_shipping専用サーバー起動 - ポート8081"

# 作業ディレクトリ設定
WORK_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete"
cd "$WORK_DIR"

# 既存プロセス終了
echo "🛑 既存プロセス終了中..."
pkill -f "php -S.*808[0-9]" 2>/dev/null
sleep 2

# ポートクリア
for port in 8080 8081 8082; do
    lsof -ti:$port | xargs kill -9 2>/dev/null
done
sleep 2

# ポート8081でサーバー起動
echo "📡 PHPサーバー起動中（ポート8081）..."
php -S localhost:8081 > server_8081.log 2>&1 &
SERVER_PID=$!

# 起動確認
sleep 3
if kill -0 $SERVER_PID 2>/dev/null && lsof -i :8081 > /dev/null 2>&1; then
    echo "✅ サーバー起動成功！"
    echo "🔢 プロセスID: $SERVER_PID"
    echo ""
    echo "🎯 目標URL:"
    echo "   http://localhost:8081/new_structure/09_shipping/advanced_tariff_api.php?action=health"
    echo ""
    echo "🧪 テストURL:"
    echo "   http://localhost:8081/new_structure/09_shipping/advanced_tariff_api.php"
    echo "   http://localhost:8081/test_php.php"
    echo ""
    echo "📋 ログ確認: tail -f server_8081.log"
    echo "🛑 停止: kill $SERVER_PID"
    
    # API動作テスト
    echo ""
    echo "🧪 API動作テスト実行中..."
    sleep 2
    
    if curl -s "http://localhost:8081/new_structure/09_shipping/advanced_tariff_api.php?action=health" | grep -q "success"; then
        echo "✅ API正常動作確認！"
    else
        echo "⚠️ API動作に問題があります"
        echo "📋 cURLテスト結果:"
        curl -s "http://localhost:8081/new_structure/09_shipping/advanced_tariff_api.php?action=health" || echo "接続失敗"
    fi
    
else
    echo "❌ サーバー起動失敗"
    echo "📋 エラーログ:"
    cat server_8081.log 2>/dev/null || echo "ログファイルなし"
fi

echo ""
echo "🔍 現在の状況:"
ps aux | grep "php -S" | grep -v grep
lsof -i :8081
