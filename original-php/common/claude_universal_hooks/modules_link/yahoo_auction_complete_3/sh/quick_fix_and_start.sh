#!/bin/bash
# クイック修正・起動スクリプト

echo "🔧 Yahoo→eBay統合ワークフロー クイック修正・起動"
echo "============================================"

# 現在のディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_tool

echo "📋 1. 実行権限を付与中..."
chmod +x *.sh *.py

echo "📋 2. 既存プロセス停止中..."
pkill -f "python.*enhanced_complete_api_updated.py" > /dev/null 2>&1 || echo "既存APIサーバーは稼働していませんでした"
pkill -f "python.*api_server_complete.py" > /dev/null 2>&1 || echo "旧APIサーバーは稼働していませんでした"

echo "📋 3. Pythonライブラリ確認中..."
python3 -c "
import sys
required = ['flask', 'flask_cors', 'pandas', 'requests']
missing = []
for lib in required:
    try:
        __import__(lib)
        print(f'✅ {lib}')
    except ImportError:
        missing.append(lib)
        print(f'❌ {lib} - インストール中...')

if missing:
    import subprocess
    for lib in missing:
        if lib == 'flask_cors':
            subprocess.run([sys.executable, '-m', 'pip', 'install', 'Flask-CORS'], check=True)
        else:
            subprocess.run([sys.executable, '-m', 'pip', 'install', lib], check=True)
    print('✅ 不足ライブラリをインストールしました')
else:
    print('✅ 全ライブラリ確認完了')
"

echo ""
echo "📋 4. 拡張APIサーバー起動中..."
echo "   ポート: 5001"
echo "   ヘルスチェック: http://localhost:5001/health"
echo ""

# バックグラウンドでAPIサーバー起動
nohup python3 enhanced_complete_api_updated.py > api_server.log 2>&1 &
SERVER_PID=$!

echo "🔄 APIサーバー起動待機中（PID: $SERVER_PID）..."
sleep 3

# ヘルスチェック
for i in {1..10}; do
    if curl -s http://localhost:5001/health > /dev/null 2>&1; then
        echo "✅ APIサーバー起動完了！"
        break
    else
        echo "⏳ 起動待機中... ($i/10)"
        sleep 2
    fi
done

# 最終確認
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo ""
    echo "🎉 システム起動完了!"
    echo "============================================"
    echo ""
    echo "🌐 アクセス先:"
    echo "   フロントエンド: http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php"
    echo "   API ヘルスチェック: http://localhost:5001/health"
    echo "   システム状態: http://localhost:5001/api/system_status"
    echo ""
    echo "📊 利用可能機能:"
    echo "   ✅ 商品承認システム"
    echo "   ✅ 送料計算エンジン"
    echo "   ✅ データ編集・CSV出力"
    echo "   ✅ Yahooスクレイピング"
    echo ""
    echo "🔧 システム停止: kill $SERVER_PID"
    echo "📝 ログ確認: tail -f api_server.log"
    echo ""
    echo "▶️ ブラウザで上記URLにアクセスしてください"
else
    echo ""
    echo "❌ APIサーバー起動失敗"
    echo "ログを確認してください: cat api_server.log"
    exit 1
fi
