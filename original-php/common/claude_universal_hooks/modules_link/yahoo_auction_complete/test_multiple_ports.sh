#!/bin/bash

echo "🔄 複数ポートでPHPサーバー起動テスト..."

# ディレクトリ移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete

# 既存プロセス終了
pkill -f "php -S" 2>/dev/null
sleep 2

# ポート8080でテスト
echo "📡 ポート8080でテスト..."
php -S localhost:8080 > server_8080.log 2>&1 &
sleep 3

if curl -s http://localhost:8080/test_php.php > /dev/null 2>&1; then
    echo "✅ ポート8080: 成功"
    echo "🌐 アクセス: http://localhost:8080/test_php.php"
else
    echo "❌ ポート8080: 失敗"
    pkill -f "php -S localhost:8080"
    
    # ポート8081でテスト
    echo "📡 ポート8081でテスト..."
    php -S localhost:8081 > server_8081.log 2>&1 &
    sleep 3
    
    if curl -s http://localhost:8081/test_php.php > /dev/null 2>&1; then
        echo "✅ ポート8081: 成功"
        echo "🌐 アクセス: http://localhost:8081/test_php.php"
    else
        echo "❌ ポート8081: 失敗"
        pkill -f "php -S localhost:8081"
        
        # ポート9000でテスト
        echo "📡 ポート9000でテスト..."
        php -S localhost:9000 > server_9000.log 2>&1 &
        sleep 3
        
        if curl -s http://localhost:9000/test_php.php > /dev/null 2>&1; then
            echo "✅ ポート9000: 成功"
            echo "🌐 アクセス: http://localhost:9000/test_php.php"
        else
            echo "❌ 全ポート失敗"
            echo "📋 エラーログ確認:"
            echo "--- 8080 ---"
            cat server_8080.log 2>/dev/null || echo "ログなし"
            echo "--- 8081 ---"
            cat server_8081.log 2>/dev/null || echo "ログなし"
            echo "--- 9000 ---"
            cat server_9000.log 2>/dev/null || echo "ログなし"
        fi
    fi
fi

echo ""
echo "🔍 現在のプロセス:"
ps aux | grep "php -S" | grep -v grep
