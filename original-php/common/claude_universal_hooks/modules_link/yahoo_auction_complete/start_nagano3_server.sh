#!/bin/bash

# NAGANO-3統合システム専用サーバー起動スクリプト
echo "🚀 NAGANO-3統合ワークフローシステム起動中..."

# ディレクトリ移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete

# 既存プロセスの確認と終了
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  ポート8080は既に使用中です。"
    echo "🔧 既存のプロセスを終了します..."
    pkill -f "php -S localhost:8080"
    sleep 2
fi

# PHPサーバー起動
echo "📡 PHPサーバーを localhost:8080 で起動中..."
echo "📍 ドキュメントルート: $(pwd)"
echo ""

# 起動確認用の待機
nohup php -S localhost:8080 > server.log 2>&1 &
sleep 3

if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ サーバー起動成功！"
    echo ""
    echo "🔧 NAGANO-3統合システム アクセスURL:"
    echo "   📊 システム診断: http://localhost:8080/new_structure/workflow_engine/system_diagnostic.php"
    echo "   🔧 テストデータ作成: http://localhost:8080/new_structure/workflow_engine/create_test_data.php"
    echo "   📈 ダッシュボード v2.0: http://localhost:8080/new_structure/workflow_engine/dashboard_v2.html"
    echo "   🧪 統合テスト: http://localhost:8080/new_structure/workflow_engine/test_integration.php"
    echo ""
    echo "🛑 サーバー停止: pkill -f 'php -S localhost:8080'"
    echo "📋 ログ確認: tail -f server.log"
else
    echo "❌ サーバー起動に失敗しました。"
    echo "📋 エラーログ確認: cat server.log"
fi
