#!/bin/bash
# Yahoo Auction Tool 承認システム統合版起動スクリプト（最終修正版）

set -e  # エラー時に停止

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool"

echo "🚀 Yahoo Auction Tool 承認システム統合版 起動中..."

# 1. ディレクトリ移動
cd "$PROJECT_ROOT"

# 2. 権限確認・設定
echo "📋 ファイル権限を確認中..."
chmod +x ./start_integrated_system_final.sh 2>/dev/null || true
chmod +x ./stop_integrated_system.sh 2>/dev/null || true

# 3. 既存プロセスの停止
echo "🛑 既存のサーバープロセスを停止中..."

# APIサーバー停止
if [ -f ".api_server.pid" ]; then
    API_PID=$(cat .api_server.pid)
    if kill -0 $API_PID 2>/dev/null; then
        echo "🔗 既存のAPIサーバー (PID: $API_PID) を停止中..."
        kill $API_PID 2>/dev/null || true
        sleep 2
    fi
    rm -f .api_server.pid
fi

# PHPサーバー停止
if [ -f ".php_server.pid" ]; then
    PHP_PID=$(cat .php_server.pid)
    if kill -0 $PHP_PID 2>/dev/null; then
        echo "🌐 既存のPHPサーバー (PID: $PHP_PID) を停止中..."
        kill $PHP_PID 2>/dev/null || true
        sleep 2
    fi
    rm -f .php_server.pid
fi

# ポートクリーンアップ
lsof -ti:5001 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:8080 2>/dev/null | xargs kill -9 2>/dev/null || true

echo "✅ 既存プロセス停止完了"

# 4. 統合版ファイルを配置
if [ -f "index_integrated.php" ]; then
    echo "🔄 統合版システムを有効化中..."
    cp index_integrated.php index.php
    echo "✅ 統合版システムが有効になりました"
else
    echo "❌ index_integrated.php が見つかりません"
    exit 1
fi

# 5. データベーススキーマ更新
if [ -f "approval_database_schema_complete.sql" ]; then
    echo "🗄️ データベーススキーマを更新中..."
    if command -v psql >/dev/null 2>&1; then
        # データベース接続テスト
        if psql -h localhost -U nagano3_user -d nagano3_db -c "SELECT 1;" > /dev/null 2>&1; then
            echo "✅ データベース接続確認完了"
            psql -h localhost -U nagano3_user -d nagano3_db -f approval_database_schema_complete.sql
            echo "✅ データベーススキーマ更新完了"
        else
            echo "⚠️  データベース接続に失敗しました。手動でスキーマを実行してください:"
            echo "   psql -h localhost -U nagano3_user -d nagano3_db -f approval_database_schema_complete.sql"
        fi
    else
        echo "⚠️  psqlコマンドが見つかりません。手動でスキーマを実行してください"
    fi
else
    echo "⚠️  approval_database_schema_complete.sql が見つかりません"
fi

# 6. シンプルAPIサーバーの起動
echo "🔗 統合APIサーバーを起動中..."

if [ -f "api_server_simple.py" ]; then
    echo "🔧 シンプルAPIサーバーを起動中..."
    
    # バックグラウンドで起動（依存関係なし）
    nohup python3 api_server_simple.py > api_server.log 2>&1 &
    API_PID=$!
    echo $API_PID > .api_server.pid
    
    # 起動確認
    sleep 3
    if kill -0 $API_PID 2>/dev/null; then
        echo "✅ APIサーバー起動成功 (PID: $API_PID)"
    else
        echo "❌ APIサーバー起動失敗。ログを確認してください:"
        echo "   tail -f api_server.log"
        exit 1
    fi
else
    echo "❌ api_server_simple.py が見つかりません"
    exit 1
fi

# 7. PHPサーバーの起動
echo "🌐 PHPサーバーを起動中..."
nohup php -S localhost:8080 -t . > php_server.log 2>&1 &
PHP_PID=$!
echo $PHP_PID > .php_server.pid

# 起動確認
sleep 2
if kill -0 $PHP_PID 2>/dev/null; then
    echo "✅ PHPサーバー起動成功 (PID: $PHP_PID)"
else
    echo "❌ PHPサーバー起動失敗"
    exit 1
fi

# 8. システム動作確認
echo "🧪 システム動作確認中..."

# API接続確認
sleep 3
for i in {1..5}; do
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/system_status 2>/dev/null || echo "000")
    if [ "$API_STATUS" = "200" ]; then
        echo "✅ APIサーバー接続確認完了"
        break
    else
        echo "⏳ APIサーバー接続確認中... ($i/5)"
        sleep 2
    fi
done

if [ "$API_STATUS" != "200" ]; then
    echo "❌ APIサーバー接続確認失敗（続行します）"
fi

# PHP接続確認
PHP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/index.php 2>/dev/null || echo "000")
if [ "$PHP_STATUS" = "200" ]; then
    echo "✅ PHPサーバー接続確認完了"
else
    echo "⚠️  PHPサーバー接続確認失敗 (HTTP: $PHP_STATUS)"
fi

# 9. 起動完了メッセージ
echo ""
echo "🎉 Yahoo Auction Tool 承認システム統合版の起動が完了しました！"
echo ""
echo "📊 アクセス情報:"
echo "   メインシステム: http://localhost:8080/"
echo "   APIサーバー: http://localhost:5001/"
echo "   承認システムAPI: http://localhost:8080/api_endpoints_approval.php"
echo ""
echo "📋 プロセス情報:"
echo "   APIサーバー: PID $API_PID (ポート 5001)"
echo "   PHPサーバー: PID $PHP_PID (ポート 8080)"
echo ""
echo "📂 ログファイル:"
echo "   APIサーバーログ: $PROJECT_ROOT/api_server.log"
echo "   PHPサーバーログ: $PROJECT_ROOT/php_server.log"
echo ""
echo "🎯 統合ワークフロー:"
echo "   1️⃣  ブラウザで http://localhost:8080/ にアクセス"
echo "   2️⃣  「承認システム」タブをクリック"
echo "   3️⃣  「承認キュー読込」ボタンをクリック"
echo "   4️⃣  サンプル商品データの承認作業を実行"
echo ""
echo "⚠️  システム停止: ./stop_integrated_system.sh"
echo ""

# 10. 自動ブラウザ起動（オプション）
echo "✅ 起動スクリプト完了"

if command -v open >/dev/null 2>&1; then
    read -p "ブラウザでシステムを開きますか？ (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "http://localhost:8080/"
        echo "🌐 ブラウザでシステムを開きました"
    fi
fi