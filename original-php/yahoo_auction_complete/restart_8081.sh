#!/bin/bash

echo "=== 8081ポート完全復旧スクリプト ==="
echo "$(date)"
echo ""

# 1. 8081ポートの全プロセス強制終了
echo "🛑 8081ポート使用プロセス強制終了..."
sudo lsof -ti:8081 | xargs sudo kill -9 2>/dev/null || echo "プロセスなし"

# 2. PHP関連プロセス全停止
echo "🛑 PHP関連プロセス停止..."
sudo pkill -f "php -S.*:8081" 2>/dev/null || echo "該当プロセスなし"

# 3. 2秒待機
sleep 2

# 4. ポート状況確認
echo "📡 ポート8081状況確認..."
if lsof -i :8081 >/dev/null 2>&1; then
    echo "⚠️ まだポートが使用中です。以下のプロセスを手動で停止してください："
    lsof -i :8081
    exit 1
else
    echo "✅ ポート8081解放完了"
fi

# 5. プロジェクトディレクトリへ移動
echo "📂 プロジェクトディレクトリへ移動..."
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure || {
    echo "❌ ディレクトリが見つかりません"
    exit 1
}
echo "現在のディレクトリ: $(pwd)"

# 6. 8081ポートでサーバー起動
echo ""
echo "🚀 8081ポートでPHPサーバー起動..."
echo "アクセスURL: http://localhost:8081"
echo "メイン: http://localhost:8081/index.php"
echo "ダッシュボード: http://localhost:8081/00_workflow_engine/dashboard_v2_integrated.html"
echo "停止方法: Ctrl+C"
echo ""
echo "=== サーバー起動中 ==="

php -S localhost:8081 -t .