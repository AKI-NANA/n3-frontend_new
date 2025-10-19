#!/bin/bash

echo "=== NAGANO-3 トラブルシューティング ==="
echo "$(date)"
echo ""

# 1. ポート8081の完全クリーンアップ
echo "🧹 ポート8081のクリーンアップ..."
sudo lsof -ti:8081 | xargs sudo kill -9 2>/dev/null || echo "既にクリーンです"
sleep 2

# 2. 全てのPHPサーバープロセスを停止
echo "🛑 全PHPサーバープロセス停止..."
sudo pkill -f "php -S" 2>/dev/null || echo "PHPサーバープロセスなし"
sleep 2

# 3. ポート確認
echo "📡 ポート状況再確認..."
lsof -i :8081 2>/dev/null && echo "⚠️ まだポートが使用中" || echo "✅ ポート8081解放済み"

# 4. プロジェクトディレクトリへ移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure

# 5. 代替ポートでサーバー起動
echo ""
echo "🚀 代替ポート8082でサーバー起動..."
echo "アクセスURL: http://localhost:8082"
echo "ダッシュボード: http://localhost:8082/00_workflow_engine/dashboard_v2_integrated.html"
echo ""

php -S localhost:8082