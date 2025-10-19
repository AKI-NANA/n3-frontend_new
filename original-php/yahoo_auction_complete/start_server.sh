#!/bin/bash

echo "=== NAGANO-3 サーバー起動スクリプト ==="
echo "現在の日時: $(date)"
echo ""

# ポート8081の使用状況確認
echo "📡 ポート8081の使用状況確認..."
lsof -i :8081 2>/dev/null || echo "ポート8081は使用されていません"
echo ""

# PHPのバージョン確認
echo "🐘 PHPバージョン確認..."
php --version | head -1
echo ""

# PostgreSQL接続確認
echo "🐘 PostgreSQL接続確認..."
psql -h localhost -U postgres -d nagano3_db -c "SELECT version();" 2>/dev/null && echo "✅ PostgreSQL接続OK" || echo "❌ PostgreSQL接続エラー"
echo ""

# プロジェクトディレクトリに移動
PROJECT_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure"
cd "$PROJECT_DIR" || { echo "❌ プロジェクトディレクトリが見つかりません"; exit 1; }

echo "📂 現在のディレクトリ: $(pwd)"
echo ""

# PHPサーバーを8081ポートで起動
echo "🚀 PHPサーバーを8081ポートで起動します..."
echo "アクセスURL: http://localhost:8081"
echo "停止方法: Ctrl+C"
echo ""
echo "=== サーバー起動中 ==="

# PHPビルトインサーバーを起動
php -S localhost:8081 -t . 2>&1 | while IFS= read -r line; do
    echo "[$(date '+%H:%M:%S')] $line"
done