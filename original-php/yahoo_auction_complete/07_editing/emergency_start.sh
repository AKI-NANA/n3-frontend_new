#!/bin/bash

# ===========================================
# Yahoo Auction統合編集システム 緊急起動スクリプト
# ===========================================

echo "🚨 緊急起動スクリプト実行中..."

# 作業ディレクトリを設定
WORK_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/07_editing"
cd "$WORK_DIR" || exit 1

echo "📁 作業ディレクトリ: $WORK_DIR"

# 既存のPHPサーバープロセスをすべて停止
echo "🔄 既存PHPサーバープロセスを停止中..."
pkill -f "php.*-S" 2>/dev/null || true
sleep 3

# ポート8080を使用しているプロセスを強制停止
echo "🔄 ポート8080のプロセスを停止中..."
lsof -ti :8080 | xargs kill -9 2>/dev/null || true
sleep 2

# 必要なファイルが存在するか確認
echo "🔍 ファイル確認中..."
if [[ ! -f "editor.php" ]]; then
    echo "❌ editor.php が見つかりません！"
    exit 1
fi

if [[ ! -f "test.php" ]]; then
    echo "❌ test.php が見つかりません！"
    exit 1
fi

echo "✅ 必要ファイルが確認されました"

# PHPのバージョンを確認
echo "🔍 PHP確認中..."
php --version || {
    echo "❌ PHPが見つかりません！PHPをインストールしてください"
    exit 1
}

# サーバー起動
echo "🚀 PHPサーバーを起動中..."
echo "   ポート: 8080"
echo "   ドキュメントルート: $WORK_DIR"

# バックグラウンドでサーバーを起動
nohup php -S localhost:8080 > "server_$(date +%Y%m%d_%H%M%S).log" 2>&1 &
SERVER_PID=$!

# PIDを保存
echo $SERVER_PID > "server.pid"

echo "⏳ サーバー起動を待機中..."
sleep 5

# サーバーが起動したかテスト
if curl -s --max-time 5 "http://localhost:8080/test.php" > /dev/null; then
    echo "✅ サーバー起動成功！"
    echo ""
    echo "🌐 アクセス情報:"
    echo "   メインシステム: http://localhost:8080/editor.php"
    echo "   テストページ:   http://localhost:8080/test.php"
    echo "   インデックス:   http://localhost:8080/"
    echo ""
    echo "📊 サーバー情報:"
    echo "   プロセスID: $SERVER_PID"
    echo "   ログファイル: $(ls server_*.log | tail -1)"
    echo ""
    echo "🛑 サーバーを停止するには:"
    echo "   kill $SERVER_PID"
    echo "   または pkill -f 'php.*-S'"
    
else
    echo "❌ サーバー起動に失敗しました"
    
    # 詳細な診断情報を表示
    echo ""
    echo "🔍 診断情報:"
    
    # プロセス確認
    if ps -p $SERVER_PID > /dev/null; then
        echo "   プロセス状態: 実行中 (PID: $SERVER_PID)"
    else
        echo "   プロセス状態: 停止"
    fi
    
    # ログ確認
    LOG_FILE=$(ls server_*.log 2>/dev/null | tail -1)
    if [[ -f "$LOG_FILE" ]]; then
        echo "   ログファイル内容:"
        cat "$LOG_FILE"
    else
        echo "   ログファイルが見つかりません"
    fi
    
    # ポート確認
    if lsof -i :8080 > /dev/null 2>&1; then
        echo "   ポート8080: 使用中"
        lsof -i :8080
    else
        echo "   ポート8080: 利用可能"
    fi
fi

echo ""
echo "=== 緊急起動スクリプト完了 ==="