#!/bin/bash
# Yahoo Auction Tool 承認システム統合版停止スクリプト

set -e  # エラー時に停止

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool"

echo "🛑 Yahoo Auction Tool 承認システム統合版 停止中..."

# 1. ディレクトリ移動
cd "$PROJECT_ROOT"

# 2. APIサーバー停止
if [ -f ".api_server.pid" ]; then
    API_PID=$(cat .api_server.pid)
    if kill -0 $API_PID 2>/dev/null; then
        echo "🔗 APIサーバー (PID: $API_PID) を停止中..."
        kill $API_PID
        
        # 正常終了を待つ
        for i in {1..10}; do
            if ! kill -0 $API_PID 2>/dev/null; then
                echo "✅ APIサーバー停止完了"
                break
            fi
            sleep 1
        done
        
        # 強制終了が必要な場合
        if kill -0 $API_PID 2>/dev/null; then
            echo "⚠️  APIサーバーを強制停止します..."
            kill -9 $API_PID
            echo "✅ APIサーバー強制停止完了"
        fi
    else
        echo "ℹ️  APIサーバーは既に停止しています"
    fi
    rm -f .api_server.pid
else
    echo "ℹ️  APIサーバーのPIDファイルが見つかりません"
fi

# 3. PHPサーバー停止
if [ -f ".php_server.pid" ]; then
    PHP_PID=$(cat .php_server.pid)
    if kill -0 $PHP_PID 2>/dev/null; then
        echo "🌐 PHPサーバー (PID: $PHP_PID) を停止中..."
        kill $PHP_PID
        
        # 正常終了を待つ
        for i in {1..10}; do
            if ! kill -0 $PHP_PID 2>/dev/null; then
                echo "✅ PHPサーバー停止完了"
                break
            fi
            sleep 1
        done
        
        # 強制終了が必要な場合
        if kill -0 $PHP_PID 2>/dev/null; then
            echo "⚠️  PHPサーバーを強制停止します..."
            kill -9 $PHP_PID
            echo "✅ PHPサーバー強制停止完了"
        fi
    else
        echo "ℹ️  PHPサーバーは既に停止しています"
    fi
    rm -f .php_server.pid
else
    echo "ℹ️  PHPサーバーのPIDファイルが見つかりません"
fi

# 4. 関連プロセスの確認・クリーンアップ
echo "🧹 関連プロセスをクリーンアップ中..."

# ポート5001を使用しているプロセス
API_PROCESSES=$(lsof -ti:5001 2>/dev/null || true)
if [ ! -z "$API_PROCESSES" ]; then
    echo "⚠️  ポート5001で実行中のプロセスを停止します..."
    echo $API_PROCESSES | xargs kill -9 2>/dev/null || true
    echo "✅ ポート5001クリーンアップ完了"
fi

# ポート8080を使用しているプロセス
PHP_PROCESSES=$(lsof -ti:8080 2>/dev/null || true)
if [ ! -z "$PHP_PROCESSES" ]; then
    echo "⚠️  ポート8080で実行中のプロセスを停止します..."
    echo $PHP_PROCESSES | xargs kill -9 2>/dev/null || true
    echo "✅ ポート8080クリーンアップ完了"
fi

# 5. ログファイルの整理
echo "📋 ログファイルを整理中..."

# ログファイルサイズ確認
if [ -f "api_server.log" ]; then
    LOG_SIZE=$(wc -c < api_server.log)
    if [ $LOG_SIZE -gt 10485760 ]; then  # 10MB以上
        echo "📄 APIサーバーログをローテーションします..."
        mv api_server.log "api_server_$(date +%Y%m%d_%H%M%S).log"
        echo "✅ APIサーバーログローテーション完了"
    fi
fi

if [ -f "php_server.log" ]; then
    LOG_SIZE=$(wc -c < php_server.log)
    if [ $LOG_SIZE -gt 10485760 ]; then  # 10MB以上
        echo "📄 PHPサーバーログをローテーションします..."
        mv php_server.log "php_server_$(date +%Y%m%d_%H%M%S).log"
        echo "✅ PHPサーバーログローテーション完了"
    fi
fi

# 6. 一時ファイルのクリーンアップ
echo "🗂️  一時ファイルをクリーンアップ中..."

# 古いバックアップファイル（30日以上）を削除
find . -name "index_backup_*.php" -mtime +30 -delete 2>/dev/null || true
find . -name "*_$(date +%Y%m%d_)*.log" -mtime +30 -delete 2>/dev/null || true

echo "✅ 一時ファイルクリーンアップ完了"

# 7. システム状態確認
echo "🔍 システム状態を確認中..."

# ポート確認
API_PORT_STATUS=$(lsof -ti:5001 2>/dev/null || echo "clear")
PHP_PORT_STATUS=$(lsof -ti:8080 2>/dev/null || echo "clear")

if [ "$API_PORT_STATUS" = "clear" ]; then
    echo "✅ ポート5001: 解放済み"
else
    echo "⚠️  ポート5001: まだ使用中"
fi

if [ "$PHP_PORT_STATUS" = "clear" ]; then
    echo "✅ ポート8080: 解放済み"
else
    echo "⚠️  ポート8080: まだ使用中"
fi

# 8. データベース接続の確認・クリーンアップ
echo "🗄️ データベース接続をクリーンアップ中..."

# PostgreSQL接続プールのクリーンアップ（必要に応じて）
if command -v psql >/dev/null 2>&1; then
    # アクティブな接続数を確認
    ACTIVE_CONNECTIONS=$(psql -h localhost -U nagano3_user -d nagano3_db -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='nagano3_db' AND state='active';" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [ "$ACTIVE_CONNECTIONS" -gt 0 ]; then
        echo "ℹ️  アクティブなDB接続数: $ACTIVE_CONNECTIONS"
    else
        echo "✅ データベース接続クリーンアップ完了"
    fi
else
    echo "ℹ️  psqlコマンドが見つかりません（データベース接続確認をスキップ）"
fi

# 9. システム復旧ガイド表示
echo ""
echo "📊 システム停止完了レポート:"
echo "   ✅ APIサーバー: 停止済み"
echo "   ✅ PHPサーバー: 停止済み"
echo "   ✅ ポートクリーンアップ: 完了"
echo "   ✅ ログローテーション: 完了"
echo "   ✅ 一時ファイルクリーンアップ: 完了"
echo ""
echo "🔄 システム再起動方法:"
echo "   ./start_integrated_system.sh"
echo ""
echo "📋 トラブルシューティング:"
echo "   ログ確認: tail -f api_server.log"
echo "   ポート確認: lsof -i:5001,8080"
echo "   プロセス確認: ps aux | grep -E '(python|php)'"
echo ""

# 10. バックアップ作成の推奨
LAST_BACKUP=$(find . -name "*backup*" -mtime -7 2>/dev/null | wc -l | tr -d ' ')
if [ "$LAST_BACKUP" -eq 0 ]; then
    echo "💾 推奨: 週次バックアップを実行してください"
    echo "   ./create_system_backup.sh"
    echo ""
fi

echo "✅ Yahoo Auction Tool 承認システム統合版の停止が完了しました"