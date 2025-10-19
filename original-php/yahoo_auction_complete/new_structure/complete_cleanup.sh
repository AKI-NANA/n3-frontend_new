#!/bin/bash

echo "=== NAGANO-3 完全クリーンアップ & 復旧 ==="
echo "$(date)"
echo ""

# 1. 全てのPHPサーバープロセスを強制停止
echo "🛑 全PHPサーバープロセス強制停止..."
sudo pkill -9 php 2>/dev/null && echo "✅ PHPプロセス停止完了" || echo "ℹ️ 停止対象プロセスなし"

# 2. 特に8081ポート関連を確実に停止
echo "🛑 ポート8081専用クリーンアップ..."
sudo lsof -ti:8081 | xargs sudo kill -9 2>/dev/null && echo "✅ ポート8081クリア" || echo "ℹ️ ポート8081既にクリア"

# 3. 念のため8080-8090の範囲も確認・停止
echo "🛑 開発用ポート範囲クリーンアップ..."
for port in {8080..8090}; do
    sudo lsof -ti:$port | xargs sudo kill -9 2>/dev/null && echo "✅ ポート$port クリア" || true
done

# 4. 3秒待機
echo "⏳ システム安定化待機..."
sleep 3

# 5. 全ポート状況確認
echo "📡 ポート使用状況最終確認..."
echo "8080ポート:" && (lsof -i:8080 || echo "空き")
echo "8081ポート:" && (lsof -i:8081 || echo "空き")
echo "8082ポート:" && (lsof -i:8082 || echo "空き")

# 6. PHPプロセス確認
echo "🐘 PHPプロセス確認..."
ps aux | grep php | grep -v grep || echo "PHPプロセスなし"

# 7. プロジェクトディレクトリへ移動
echo ""
echo "📂 プロジェクトディレクトリ確認..."
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure || {
    echo "❌ プロジェクトディレクトリエラー"
    exit 1
}
echo "✅ ディレクトリ: $(pwd)"

# 8. 必要ファイル確認
echo "📋 システムファイル確認..."
[ -f "index.php" ] && echo "✅ index.php" || echo "❌ index.php"
[ -f "00_workflow_engine/dashboard_v2_integrated.html" ] && echo "✅ dashboard" || echo "❌ dashboard"
[ -f "00_workflow_engine/integrated_workflow_engine_8081.php" ] && echo "✅ workflow engine" || echo "❌ workflow engine"

echo ""
echo "🎯 クリーンアップ完了！"
echo "今すぐ以下のコマンドでサーバー起動してください："
echo ""
echo "php -S localhost:8081"
echo ""
echo "アクセスURL:"
echo "http://localhost:8081"
echo "http://localhost:8081/00_workflow_engine/dashboard_v2_integrated.html"