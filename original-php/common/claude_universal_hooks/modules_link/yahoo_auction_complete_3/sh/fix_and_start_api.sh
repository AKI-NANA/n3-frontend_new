#!/bin/bash
# ===================================================
# 依存関係解決 & APIサーバー起動
# ===================================================

echo "🔧 Yahoo→eBay統合ワークフロー 依存関係解決中..."

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool

# 仮想環境の確認・作成
if [ ! -d "venv" ]; then
    echo "Python仮想環境作成中..."
    python3 -m venv venv
fi

# 仮想環境アクティベート
echo "仮想環境アクティベート中..."
source venv/bin/activate

# 依存関係インストール
echo "依存関係インストール中..."
if [ -f "requirements_api_server.txt" ]; then
    pip install -r requirements_api_server.txt
elif [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    # 最小限の依存関係を手動インストール
    echo "最小限の依存関係をインストール中..."
    pip install flask flask-cors requests beautifulsoup4 pandas sqlite3 aiohttp fastapi uvicorn
fi

echo ""
echo "🚀 APIサーバー起動中..."

# プロセス停止確認
PID=$(lsof -ti:5001 2>/dev/null)
if [ -n "$PID" ]; then
    echo "既存プロセス停止中..."
    kill $PID
    sleep 2
fi

# より単純なAPIサーバーから試行
api_servers=(
    "workflow_api_server_complete.py"
    "api_server_complete.py"
    "standalone_api_server.py"
    "api_server_complete_v2.py"
)

for server in "${api_servers[@]}"; do
    if [ -f "$server" ]; then
        echo ""
        echo "🧪 $server 起動テスト中..."
        
        # バックグラウンドで起動テスト
        timeout 10 python3 "$server" &
        TEST_PID=$!
        sleep 3
        
        # 起動確認
        if curl -s "http://localhost:5001/" > /dev/null 2>&1; then
            echo "✅ $server 起動成功"
            
            # プロセス停止
            kill $TEST_PID 2>/dev/null
            
            # 本格起動
            echo "本格起動中..."
            nohup python3 "$server" > logs/api_server.log 2>&1 &
            NEW_PID=$!
            echo "$NEW_PID" > .api_server.pid
            
            sleep 3
            
            # エンドポイントテスト
            echo "エンドポイントテスト中..."
            if curl -s "http://localhost:5001/system_status" > /dev/null 2>&1; then
                echo "✅ /system_status 動作確認"
            elif curl -s "http://localhost:5001/" > /dev/null 2>&1; then
                echo "✅ ルートエンドポイント動作確認"
            fi
            
            echo ""
            echo "🎉 APIサーバー起動成功: $server"
            echo "📡 アクセス: http://localhost:5001"
            exit 0
        else
            echo "❌ $server 起動失敗"
            kill $TEST_PID 2>/dev/null
        fi
    else
        echo "❌ $server ファイル未存在"
    fi
done

echo ""
echo "❌ 全てのAPIサーバー起動に失敗しました"
echo ""
echo "🔍 ログ確認:"
echo "tail -n 20 logs/api_server.log"
echo ""
echo "🛠️ 手動デバッグ:"
echo "source venv/bin/activate"
echo "python3 workflow_api_server_complete.py"
