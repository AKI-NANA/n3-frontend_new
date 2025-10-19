#!/bin/bash

# Yahoo Auction編集システム サーバー起動スクリプト
echo "🚀 Yahoo Auction編集システム サーバー起動中..."

# 作業ディレクトリを変更
cd "/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/07_editing"

# 既存のサーバーがあれば停止
echo "既存サーバープロセスをチェック中..."
if pgrep -f "php.*-S.*:8080" > /dev/null; then
    echo "既存のサーバー（ポート8080）を停止中..."
    pkill -f "php.*-S.*:8080"
    sleep 2
fi

# PHPサーバー起動
echo "PHPサーバーを起動中... (ポート8080)"
php -S localhost:8080 > server.log 2>&1 &

# PIDを保存
echo $! > server.pid

sleep 3

# サーバーが起動したか確認
if pgrep -f "php.*-S.*:8080" > /dev/null; then
    echo "✅ サーバー起動成功！"
    echo "📍 アクセスURL: http://localhost:8080/"
    echo "🔗 テストURL: http://localhost:8080/test.php"
    echo "🎯 編集システム: http://localhost:8080/editor.php"
    echo ""
    echo "サーバーログ: $(pwd)/server.log"
    echo "プロセスID: $(cat server.pid)"
else
    echo "❌ サーバー起動に失敗しました"
    echo "ログファイルを確認してください: $(pwd)/server.log"
fi

echo ""
echo "サーバーを停止するには以下のコマンドを実行してください:"
echo "pkill -f 'php.*-S.*:8080'"
