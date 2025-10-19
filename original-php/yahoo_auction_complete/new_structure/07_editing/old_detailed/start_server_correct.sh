#!/bin/bash

echo "=== データ表示問題解決 - 正しいサーバー起動 ==="

# 現在のディレクトリを確認
echo "現在のディレクトリ:"
pwd

# 07_editingディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/07_editing

echo "作業ディレクトリに移動:"
pwd

# ファイル存在確認
echo -e "\n必要ファイルの存在確認:"
for file in "editor_fixed.php" "data_test.php" "diagnostic_test.html"; do
    if [ -f "$file" ]; then
        echo "✅ $file - 存在"
    else
        echo "❌ $file - 存在しない"
    fi
done

# 既存のPHPサーバープロセスを停止
echo -e "\n既存PHPサーバープロセスを停止..."
pkill -f "php -S"
sleep 2

# PostgreSQL状態確認
echo -e "\nPostgreSQL状態確認..."
if command -v brew &> /dev/null; then
    brew services start postgresql
    echo "PostgreSQL起動を試行しました"
else
    echo "Homebrewが見つかりません"
fi

# PHPサーバーを正しいディレクトリで起動
echo -e "\nPHPサーバーを起動中..."
echo "サーバー起動コマンド: php -S localhost:8000"
echo "ドキュメントルート: $(pwd)"

# バックグラウンドでサーバー起動
nohup php -S localhost:8000 > server.log 2>&1 &
SERVER_PID=$!

echo "PHPサーバーPID: $SERVER_PID"
sleep 3

# サーバー状態確認
echo -e "\nサーバー応答テスト:"
if curl -s http://localhost:8000/editor_fixed.php | head -c 100 | grep -q "DOCTYPE"; then
    echo "✅ editor_fixed.php - 応答OK"
else
    echo "❌ editor_fixed.php - 応答エラー"
fi

if curl -s http://localhost:8000/diagnostic_test.html | head -c 100 | grep -q "DOCTYPE"; then
    echo "✅ diagnostic_test.html - 応答OK"
else
    echo "❌ diagnostic_test.html - 応答エラー"
fi

# テストURL一覧
echo -e "\n🌐 ブラウザでアクセスするURL:"
echo "1. 修正版エディター: http://localhost:8000/editor_fixed.php"
echo "2. 診断ツール: http://localhost:8000/diagnostic_test.html"
echo "3. データベーステスト: http://localhost:8000/data_test.php"

echo -e "\n📋 テスト手順:"
echo "1. まず diagnostic_test.html で「データベースAPIテスト」を実行"
echo "2. 次に editor_fixed.php で「接続テスト」を実行"
echo "3. 問題なければ「未出品データ表示」を実行"

echo -e "\n🔧 サーバー停止方法:"
echo "kill $SERVER_PID"

echo -e "\n=== 準備完了 ==="
