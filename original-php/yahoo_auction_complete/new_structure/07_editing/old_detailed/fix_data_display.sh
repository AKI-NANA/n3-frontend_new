#!/bin/bash

echo "=== データ表示問題 - 完全解決スクリプト ==="

# 実行権限付与
chmod +x check_postgres.sh

# PostgreSQL状態確認・起動
echo "Step 1: PostgreSQL確認・起動"
./check_postgres.sh

echo -e "\nStep 2: PHPサーバー起動準備"
echo "以下のコマンドでPHPサーバーを起動してください:"
echo "php -S localhost:8000"

echo -e "\nStep 3: テストURL一覧"
echo "📊 診断ツール: http://localhost:8000/diagnostic_test.html"
echo "🔧 修正版エディター: http://localhost:8000/editor_fixed.php"
echo "🗃️ データベーステスト: http://localhost:8000/data_test.php"

echo -e "\nStep 4: 問題特定のための確認項目"
echo "✅ PostgreSQLサービスが起動しているか"
echo "✅ データベース nagano3_db が存在するか"
echo "✅ テーブル yahoo_scraped_products にデータがあるか"
echo "✅ PHPでエラーが発生していないか"
echo "✅ ブラウザのJavaScriptコンソールでエラーが出ていないか"

echo -e "\n=== 準備完了 ==="
