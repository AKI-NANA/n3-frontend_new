#!/bin/bash
# Yahoo Auction Tool 承認システム統合版起動スクリプト

set -e  # エラー時に停止

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool"

echo "🚀 Yahoo Auction Tool 承認システム統合版 起動中..."

# 1. ディレクトリ移動
cd "$PROJECT_ROOT"

# 2. 権限確認・設定
echo "📋 ファイル権限を確認中..."
if [ ! -x "./start_integrated_system.sh" ]; then
    chmod +x ./start_integrated_system.sh
    echo "✅ 実行権限を付与しました"
fi

# 3. 現在のindex.phpをバックアップ
if [ -f "index.php" ] && [ ! -f "index_backup_$(date +%Y%m%d_%H%M%S).php" ]; then
    echo "💾 既存のindex.phpをバックアップ中..."
    cp index.php "index_backup_$(date +%Y%m%d_%H%M%S).php"
    echo "✅ バックアップ完了: index_backup_$(date +%Y%m%d_%H%M%S).php"
fi

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
echo "🗄️ データベーススキーマを更新中..."
if command -v psql >/dev/null 2>&1; then
    psql -h localhost -U nagano3_user -d nagano3_db -f approval_database_schema.sql > /dev/null 2>&1 || {
        echo "⚠️  データベーススキーマ更新をスキップしました（手動で実行してください）"
    }
    echo "✅ データベーススキーマ更新完了"
else
    echo "⚠️  psqlコマンドが見つかりません。データベーススキーマは手動で更新してください"
fi

# 6. APIサーバー起動確認・開始
echo "🔗 APIサーバーを確認中..."

# 既存のAPIサーバーを停止
if [ -f ".api_server.pid" ]; then
    API_PID=$(cat .api_server.pid)
    if kill -0 $API_PID 2>/dev/null; then
        echo "🛑 既存のAPIサーバー (PID: $API_PID) を停止中..."
        kill $API_PID
        sleep 2
    fi
    rm -f .api_server.pid
fi

# 統合APIサーバーの起動
if [ -f "api_server.py" ]; then
    echo "🔧 統合APIサーバーを起動中..."
    
    # Python仮想環境の確認
    if [ -d "venv" ]; then
        source venv/bin/activate
        echo "✅ Python仮想環境をアクティベート"
    fi
    
    # APIサーバーをバックグラウンドで起動
    nohup python3 api_server.py > api_server.log 2>&1 &
    API_PID=$!
    echo $API_PID > .api_server.pid
    
    # 起動確認
    sleep 3
    if kill -0 $API_PID 2>/dev/null; then
        echo "✅ APIサーバー起動成功 (PID: $API_PID)"
    else
        echo "❌ APIサーバー起動失敗"
        exit 1
    fi
else
    echo "⚠️  api_server.py が見つかりません"
fi

# 7. PHPサーバー起動確認・開始
echo "🌐 PHPサーバーを確認中..."

# 既存のPHPサーバーを停止
if [ -f ".php_server.pid" ]; then
    PHP_PID=$(cat .php_server.pid)
    if kill -0 $PHP_PID 2>/dev/null; then
        echo "🛑 既存のPHPサーバー (PID: $PHP_PID) を停止中..."
        kill $PHP_PID
        sleep 2
    fi
    rm -f .php_server.pid
fi

# PHPサーバーの起動
echo "🔧 PHPサーバーを起動中..."
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
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/system_status 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo "✅ APIサーバー接続確認完了"
else
    echo "⚠️  APIサーバー接続確認失敗 (HTTP: $API_STATUS)"
fi

# PHP接続確認
PHP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/index.php 2>/dev/null || echo "000")
if [ "$PHP_STATUS" = "200" ]; then
    echo "✅ PHPサーバー接続確認完了"
else
    echo "⚠️  PHPサーバー接続確認失敗 (HTTP: $PHP_STATUS)"
fi

# 統合確認
INTEGRATED_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/index.php?cache_check=1" 2>/dev/null || echo "000")
if [ "$INTEGRATED_STATUS" = "200" ]; then
    echo "✅ 統合システム接続確認完了"
else
    echo "⚠️  統合システム接続確認失敗 (HTTP: $INTEGRATED_STATUS)"
fi

# 9. 起動完了メッセージ
echo ""
echo "🎉 Yahoo Auction Tool 承認システム統合版の起動が完了しました！"
echo ""
echo "📊 アクセス情報:"
echo "   メインシステム: http://localhost:8080/"
echo "   APIエンドポイント: http://localhost:5001/"
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
echo "   1️⃣  データ取得 → http://localhost:8080/ (データ取得タブ)"
echo "   2️⃣  データ編集 → http://localhost:8080/ (データ編集タブ)"
echo "   3️⃣  AI推奨承認 → http://localhost:8080/ (承認システムタブ)"
echo "   4️⃣  eBay出品 → http://localhost:8080/ (出品管理タブ)"
echo ""
echo "⚠️  システム停止: ./stop_integrated_system.sh"
echo ""

# 10. 自動ブラウザ起動（オプション）
if command -v open >/dev/null 2>&1; then
    read -p "ブラウザでシステムを開きますか？ (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "http://localhost:8080/"
        echo "🌐 ブラウザでシステムを開きました"
    fi
fi

echo "✅ 起動スクリプト完了"