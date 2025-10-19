#!/bin/bash

# 既存のサーバープロセスを停止
echo "🔄 既存のサーバープロセスを確認・停止中..."
if [ -f .server_pid ]; then
    OLD_PID=$(cat .server_pid)
    echo "既存のPID: $OLD_PID"
    kill -9 $OLD_PID 2>/dev/null || echo "プロセス $OLD_PID は既に停止しています"
    rm -f .server_pid
fi

# その他のPHPサーバープロセスも停止
pkill -f "php -S" 2>/dev/null || echo "他のPHPサーバーはありません"

echo "🚀 新しいサーバーを起動中..."
echo "ディレクトリ: $(pwd)"
echo "ポート: 8082"

# サーバー起動（バックグラウンド）
nohup php -S localhost:8082 > server.log 2>&1 &
SERVER_PID=$!

# PIDを保存
echo $SERVER_PID > .server_pid

echo "✅ サーバーが起動しました！"
echo "PID: $SERVER_PID"
echo "アクセスURL:"
echo "  📊 サーバー状況: http://localhost:8082/server_status.php"
echo "  🚢 4層選択UI: http://localhost:8082/complete_4layer_shipping_ui.html"
echo "  🧮 計算システム: http://localhost:8082/enhanced_calculation_php_fixed.php"
echo "  🔧 テストページ: http://localhost:8082/test_complete_4layer.html"

# 少し待ってからアクセステスト
sleep 2
echo ""
echo "🔍 サーバー応答確認中..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8082/server_status.php

echo ""
echo "📜 ログ確認（最後の10行）:"
tail -n 10 server.log

echo ""
echo "🎯 完了！ブラウザで上記URLにアクセスしてください。"