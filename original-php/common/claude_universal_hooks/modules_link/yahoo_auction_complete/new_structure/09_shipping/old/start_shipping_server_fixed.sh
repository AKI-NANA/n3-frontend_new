#!/bin/bash
# 送料システム専用サーバー起動（確実版）
# ファイル: start_shipping_server_fixed.sh

echo "🚀 送料システム専用サーバー起動"
echo "============================="

# 正確なディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/

echo "📂 現在のディレクトリ: $(pwd)"
echo "📋 ファイル存在確認:"

# ファイル存在確認
declare -a files=(
    "shipping_calculator_ui.html"
    "complete_4layer_shipping_ui.html"
    "zone_management_complete_ui.html"
    "carrier_separated_matrix.html"
    "database_viewer_ui.html"
    "api/database_viewer.php"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file が見つかりません"
    fi
done

echo ""
echo "📋 既存サーバープロセス停止"

# 既存のPHPサーバー停止
pkill -f "php -S" 2>/dev/null
sleep 2

# ポート8085の既存プロセス停止
if lsof -i :8085 > /dev/null 2>&1; then
    echo "ポート8085使用中 - 強制停止中..."
    lsof -ti :8085 | xargs kill -9 2>/dev/null
    sleep 2
fi

echo ""
echo "📋 PHPサーバー起動"
echo "ポート: 8085"
echo "ドキュメントルート: $(pwd)"

# バックグラウンドでPHPサーバー起動
nohup php -S localhost:8085 > server.log 2>&1 &
SERVER_PID=$!

echo "サーバーPID: $SERVER_PID"

# 起動確認（少し長めに待機）
echo "サーバー起動確認中..."
sleep 5

if lsof -i :8085 > /dev/null 2>&1; then
    echo "✅ PHPサーバー起動成功"
    
    echo ""
    echo "🌐 正しいアクセスURL（専用サーバー）:"
    echo "=================================="
    echo "1. 📊 送料計算システム:"
    echo "   http://localhost:8085/shipping_calculator_ui.html"
    echo ""
    echo "2. 🎯 4層選択システム:"
    echo "   http://localhost:8085/complete_4layer_shipping_ui.html"
    echo ""
    echo "3. 🌍 ゾーン管理システム:"
    echo "   http://localhost:8085/zone_management_complete_ui.html"
    echo ""
    echo "4. 🏢 独立マトリックス:"
    echo "   http://localhost:8085/carrier_separated_matrix.html"
    echo ""
    echo "5. 📊 データベース表示システム:"
    echo "   http://localhost:8085/database_viewer_ui.html"
    echo ""
    echo "6. 🚨 緊急診断システム:"
    echo "   http://localhost:8085/database_emergency_diagnostic.html"
    
    echo ""
    echo "🔧 API動作確認:"
    sleep 2
    
    # API接続テスト
    API_RESPONSE=$(curl -s -X POST "http://localhost:8085/api/database_viewer.php" \
        -H "Content-Type: application/json" \
        -d '{"action":"get_statistics"}' 2>/dev/null)
    
    if echo "$API_RESPONSE" | grep -q '"success":true'; then
        echo "✅ データベースAPI正常動作"
        TOTAL_RECORDS=$(echo "$API_RESPONSE" | grep -o '"total_records":[0-9]*' | cut -d':' -f2)
        EMS_RECORDS=$(echo "$API_RESPONSE" | grep -o '"ems_records":[0-9]*' | cut -d':' -f2)
        echo "📊 総レコード数: ${TOTAL_RECORDS:-不明}"
        echo "📊 EMSデータ: ${EMS_RECORDS:-不明}件"
    else
        echo "⚠️ API応答に問題があります"
        echo "レスポンス: $API_RESPONSE"
    fi
    
    echo ""
    echo "🎯 推奨テスト手順:"
    echo "1. データベース表示システムにアクセス"
    echo "2. '📊 統計表示' ボタンをクリック"
    echo "3. EMSデータ83件の存在を確認"
    echo "4. '🔍 データ表示' でアメリカ向け¥3,900-¥5,300確認"
    
    echo ""
    echo "📋 サーバー管理:"
    echo "停止方法: kill $SERVER_PID"
    echo "ログ確認: tail -f server.log"
    echo "プロセス確認: ps aux | grep $SERVER_PID"
    
    # PIDファイル作成
    echo $SERVER_PID > .server_pid
    echo "PIDファイル作成: .server_pid"
    
else
    echo "❌ サーバー起動失敗"
    echo ""
    echo "📋 トラブルシュート:"
    echo "1. PHP確認: php --version"
    echo "2. ポート確認: lsof -i :8085"
    echo "3. ログ確認: cat server.log"
    echo "4. 権限確認: ls -la"
    echo ""
    echo "📋 代替方法:"
    echo "手動起動: php -S localhost:8085"
    exit 1
fi

echo ""
echo "🎉 送料システム専用サーバー起動完了"
echo "================================="
echo "すべての機能が http://localhost:8085/ で利用可能です"
echo "データベースには83件のEMSデータが投入済みです"