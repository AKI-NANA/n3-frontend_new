#!/bin/bash

echo "🚀 Yahoo Auction Complete サーバー強制再起動..."

# 現在のディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete

# 既存プロセスを強制終了
echo "🛑 既存のPHPサーバープロセスを終了中..."
pkill -f "php -S"
sleep 2

# ポート確認
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  ポート8080がまだ使用中です。強制終了します。"
    sudo lsof -ti:8080 | xargs sudo kill -9
    sleep 2
fi

# 権限設定
chmod +x check_server.sh
chmod +x start_server.sh

# ファイル確認
echo "📄 重要ファイル確認:"
echo "- index.php: $(test -f index.php && echo '✅存在' || echo '❌不在')"
echo "- test_php.php: $(test -f test_php.php && echo '✅存在' || echo '❌不在')"
echo "- php_tools_index.php: $(test -f php_tools_index.php && echo '✅存在' || echo '❌不在')"

# サーバー起動
echo "📡 PHPサーバーを localhost:8080 で起動中..."
php -S localhost:8080 > server.log 2>&1 &

# プロセスID取得
SERVER_PID=$!
echo "🔢 サーバープロセスID: $SERVER_PID"

# 起動確認
sleep 3
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ サーバー起動成功！"
    echo ""
    echo "🌐 テストURL:"
    echo "   1. 基本テスト: http://localhost:8080/test_php.php"
    echo "   2. PHP版ツール: http://localhost:8080/php_tools_index.php"
    echo "   3. 既存システム: http://localhost:8080/index.php"
    echo ""
    echo "📋 ログ確認: tail -f server.log"
    echo "🛑 停止: pkill -f 'php -S localhost:8080'"
else
    echo "❌ サーバー起動に失敗しました。"
    echo "📋 ログ内容:"
    cat server.log
fi
