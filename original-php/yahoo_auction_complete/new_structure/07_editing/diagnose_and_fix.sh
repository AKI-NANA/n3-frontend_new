#!/bin/bash

echo "🔍 Yahoo Auction編集システム診断開始..."

# 1. 現在のサーバープロセスを確認
echo "=== サーバープロセス確認 ==="
if pgrep -f "php.*-S" > /dev/null; then
    echo "✅ PHPサーバーが実行中:"
    pgrep -fl "php.*-S"
else
    echo "❌ PHPサーバーが見つかりません"
fi

echo ""

# 2. ポート8080の使用状況を確認
echo "=== ポート8080使用状況 ==="
if lsof -i :8080 > /dev/null 2>&1; then
    echo "✅ ポート8080が使用中:"
    lsof -i :8080
else
    echo "❌ ポート8080は使用されていません"
fi

echo ""

# 3. ファイル存在確認
echo "=== ファイル存在確認 ==="
EDITOR_PATH="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/07_editing"

if [ -f "$EDITOR_PATH/editor.php" ]; then
    echo "✅ editor.php が存在します"
    echo "   ファイルサイズ: $(wc -c < "$EDITOR_PATH/editor.php") bytes"
else
    echo "❌ editor.php が見つかりません"
fi

if [ -f "$EDITOR_PATH/test.php" ]; then
    echo "✅ test.php が存在します"
else
    echo "❌ test.php が見つかりません"
fi

echo ""

# 4. 自動修復を試行
echo "=== 自動修復実行 ==="

cd "$EDITOR_PATH"

# 既存サーバーを停止
if pgrep -f "php.*-S.*:8080" > /dev/null; then
    echo "既存サーバー（ポート8080）を停止中..."
    pkill -f "php.*-S.*:8080"
    sleep 2
fi

# 新しいサーバーを起動
echo "新しいPHPサーバーを起動中..."
nohup php -S localhost:8080 > server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > server.pid

sleep 3

# 起動確認
if pgrep -f "php.*-S.*:8080" > /dev/null; then
    echo "✅ サーバー起動成功！"
    echo "📍 メインURL: http://localhost:8080/editor.php"
    echo "🔗 テストURL: http://localhost:8080/test.php"
    echo "📊 プロセスID: $SERVER_PID"
    
    # 簡単な接続テスト
    echo ""
    echo "=== 接続テスト実行 ==="
    if curl -s "http://localhost:8080/test.php" | grep -q "PHPサーバー正常動作中"; then
        echo "✅ HTTP接続テスト成功"
    else
        echo "❌ HTTP接続テストに失敗"
    fi
    
else
    echo "❌ サーバー起動に失敗"
    echo "ログファイル内容:"
    cat server.log 2>/dev/null || echo "ログファイルが見つかりません"
fi

echo ""
echo "=== 診断完了 ==="
echo "問題が解決しない場合は、ログファイルを確認してください:"
echo "   $EDITOR_PATH/server.log"
