#!/bin/bash
# ===================================================
# 適切なAPIサーバーへの切り替えスクリプト
# ===================================================

echo "🔄 Yahoo→eBay統合ワークフロー APIサーバー切り替え中..."

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool

# 現在のAPIサーバーを停止
echo "🛑 現在のAPIサーバー停止中..."
PID=$(lsof -ti:5001 2>/dev/null)
if [ -n "$PID" ]; then
    echo "停止対象プロセス: $PID"
    kill $PID
    sleep 2
    
    # 強制停止確認
    if ps -p $PID > /dev/null 2>&1; then
        echo "強制停止実行中..."
        kill -9 $PID
        sleep 1
    fi
    
    echo "✅ APIサーバー停止完了"
else
    echo "既にAPIサーバーが停止しています"
fi

# 適切なAPIサーバーファイルを確認・起動
echo ""
echo "🚀 適切なAPIサーバー起動中..."

# 優先順位でAPIサーバーファイルを確認
api_servers=(
    "api_server_complete_v2.py"
    "workflow_api_server_complete.py"
    "api_server_complete.py"
    "standalone_api_server.py"
)

selected_server=""

for server in "${api_servers[@]}"; do
    if [ -f "$server" ]; then
        echo "✅ $server 存在確認"
        
        # エンドポイント確認
        if grep -q "system_status\|scrape_yahoo\|get_all_data" "$server"; then
            echo "   📡 必要エンドポイント確認済み"
            selected_server="$server"
            break
        else
            echo "   ⚠️ 必要エンドポイント不足"
        fi
    else
        echo "❌ $server 未存在"
    fi
done

if [ -n "$selected_server" ]; then
    echo ""
    echo "🎯 選択されたAPIサーバー: $selected_server"
    echo "起動中..."
    
    # 仮想環境確認・起動
    if [ -d "venv" ]; then
        echo "Python仮想環境アクティベート中..."
        source venv/bin/activate
    fi
    
    # バックグラウンドで起動
    nohup python3 "$selected_server" > logs/api_server.log 2>&1 &
    NEW_PID=$!
    
    echo "新APIサーバープロセス: $NEW_PID"
    echo "$NEW_PID" > .api_server.pid
    
    # 起動確認
    echo "起動確認中..."
    sleep 3
    
    if curl -s "http://localhost:5001/system_status" > /dev/null 2>&1; then
        echo "✅ APIサーバー起動成功"
        echo ""
        echo "📋 確認用コマンド:"
        echo "curl http://localhost:5001/system_status"
    else
        echo "⚠️ APIサーバー起動確認失敗"
        echo "ログ確認: tail -f logs/api_server.log"
    fi
    
else
    echo ""
    echo "❌ 適切なAPIサーバーが見つかりません"
    echo ""
    echo "🔧 手動実行の推奨:"
    echo "python3 api_server_complete_v2.py"
    echo "または"
    echo "python3 workflow_api_server_complete.py"
fi

echo ""
echo "🌐 フロントエンド確認:"
echo "open http://localhost:8080/modules/yahoo_auction_tool/index.php"

echo ""
echo "===== APIサーバー切り替え完了 ====="
