#!/bin/bash

# Yahoo Auction 07_editing モジュール 動作確認スクリプト
# リファクタリング後の動作テスト

echo "🚀 Yahoo Auction 07_editing モジュール 動作確認開始"
echo "=============================================="

# 基本設定
BASE_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure"
MODULE_DIR="${BASE_DIR}/07_editing"

echo "📁 ディレクトリ構造確認"
echo "----------------------------------------------"

# 必要なファイルの存在確認
files=(
    "${MODULE_DIR}/editor.php"
    "${MODULE_DIR}/api/data.php"
    "${MODULE_DIR}/api/update.php" 
    "${MODULE_DIR}/api/delete.php"
    "${MODULE_DIR}/api/export.php"
    "${MODULE_DIR}/assets/editor.css"
    "${MODULE_DIR}/assets/editor.js"
    "${MODULE_DIR}/includes/ProductEditor.php"
    "${MODULE_DIR}/config.php"
    "${BASE_DIR}/shared/core/Database.php"
    "${BASE_DIR}/shared/core/ApiResponse.php"
    "${BASE_DIR}/shared/css/common.css"
    "${BASE_DIR}/shared/js/common.js"
    "${BASE_DIR}/shared/js/api.js"
)

missing_files=0
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $(basename "$file")"
    else
        echo "❌ $(basename "$file") - NOT FOUND"
        missing_files=$((missing_files + 1))
    fi
done

echo ""
echo "📊 ファイル確認結果"
echo "----------------------------------------------"
echo "総ファイル数: ${#files[@]}"
echo "存在するファイル: $((${#files[@]} - missing_files))"
echo "不足ファイル: ${missing_files}"

if [ $missing_files -gt 0 ]; then
    echo "⚠️  不足ファイルがあります。リファクタリングを再確認してください。"
    exit 1
fi

echo ""
echo "🔧 PHP 構文チェック"
echo "----------------------------------------------"

php_files=(
    "${MODULE_DIR}/editor.php"
    "${MODULE_DIR}/api/data.php"
    "${MODULE_DIR}/api/update.php"
    "${MODULE_DIR}/api/delete.php"
    "${MODULE_DIR}/api/export.php"
    "${MODULE_DIR}/includes/ProductEditor.php"
    "${BASE_DIR}/shared/core/Database.php"
    "${BASE_DIR}/shared/core/ApiResponse.php"
)

syntax_errors=0
for php_file in "${php_files[@]}"; do
    if php -l "$php_file" > /dev/null 2>&1; then
        echo "✅ $(basename "$php_file") - 構文OK"
    else
        echo "❌ $(basename "$php_file") - 構文エラー"
        php -l "$php_file"
        syntax_errors=$((syntax_errors + 1))
    fi
done

echo ""
echo "📊 PHP構文チェック結果"
echo "----------------------------------------------"
echo "チェック対象: ${#php_files[@]}ファイル"
echo "構文エラー: ${syntax_errors}ファイル"

if [ $syntax_errors -gt 0 ]; then
    echo "⚠️  PHP構文エラーがあります。修正してください。"
    exit 1
fi

echo ""
echo "🌐 Webサーバー起動確認"
echo "----------------------------------------------"

# PHPサーバーの起動確認
cd "$BASE_DIR" || exit 1

# ポート8000が使用中かチェック
if lsof -i :8000 > /dev/null 2>&1; then
    echo "⚠️  ポート8000は既に使用中です"
    echo "既存のサーバーを停止するか、別のポートを使用してください"
    
    # 既存のPHPサーバープロセスを表示
    echo "実行中のPHPサーバー:"
    lsof -i :8000
else
    echo "✅ ポート8000は使用可能です"
    
    # PHPサーバーを起動
    echo "🚀 PHPサーバーを起動中..."
    php -S localhost:8000 > /dev/null 2>&1 &
    PHP_PID=$!
    echo "PHPサーバー PID: $PHP_PID"
    
    # 少し待ってからサーバーの応答確認
    sleep 3
    
    if curl -s "http://localhost:8000/07_editing/editor.php" > /dev/null; then
        echo "✅ Webサーバーが正常に起動しました"
        echo "🌐 アクセスURL: http://localhost:8000/07_editing/editor.php"
    else
        echo "❌ Webサーバーへの接続に失敗しました"
        kill $PHP_PID > /dev/null 2>&1
        exit 1
    fi
fi

echo ""
echo "📋 手動テスト項目"
echo "----------------------------------------------"
echo "以下の項目を手動でテストしてください:"
echo ""
echo "1. 基本機能テスト"
echo "   - [URL] http://localhost:8000/07_editing/editor.php"
echo "   - [ ] ページが正常に表示される"
echo "   - [ ] 「データ読み込み」ボタンが動作する"
echo "   - [ ] 商品一覧が表示される"
echo "   - [ ] ページネーションが動作する"
echo ""
echo "2. 検索・フィルター機能"
echo "   - [ ] キーワード検索が動作する"
echo "   - [ ] 検索結果が正しく表示される"
echo "   - [ ] 検索クリアが動作する"
echo ""
echo "3. 選択・操作機能"
echo "   - [ ] 商品選択（チェックボックス）が動作する"
echo "   - [ ] 全選択機能が動作する"
echo "   - [ ] 一括操作パネルが表示される"
echo ""
echo "4. 編集機能"
echo "   - [ ] 商品編集ボタンをクリックしてモーダルが開く"
echo "   - [ ] 商品情報が正しく表示される"
echo "   - [ ] 情報を変更して保存できる"
echo ""
echo "5. 削除機能"
echo "   - [ ] 個別削除が動作する"
echo "   - [ ] 一括削除が動作する"
echo "   - [ ] ダミーデータ削除が動作する"
echo ""
echo "6. 出力機能"
echo "   - [ ] CSV出力が動作する"
echo "   - [ ] ダウンロードファイルが正しい"
echo ""
echo "7. エラーハンドリング"
echo "   - [ ] 不正な操作でエラーメッセージが表示される"
echo "   - [ ] ネットワークエラー時の表示"
echo ""
echo "8. レスポンシブデザイン"
echo "   - [ ] スマートフォン表示で正常に動作する"
echo "   - [ ] タブレット表示で正常に動作する"
echo ""

echo "💡 API個別テスト"
echo "----------------------------------------------"
echo "以下のコマンドでAPI動作を個別確認できます:"
echo ""
echo "# データ取得API"
echo "curl \"http://localhost:8000/07_editing/api/data.php?page=1&limit=5\""
echo ""
echo "# 商品更新API (POSTデータ例)"
echo "curl -X POST http://localhost:8000/07_editing/api/update.php \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"item_id\":\"test123\", \"title\":\"テスト商品\", \"price\":1000}'"
echo ""
echo "# CSV出力API"
echo "curl \"http://localhost:8000/07_editing/api/export.php\" -o test_export.csv"
echo ""

echo "🎯 パフォーマンステスト"
echo "----------------------------------------------"
echo "以下でパフォーマンスを測定できます:"
echo ""
echo "# レスポンス時間測定"
echo "time curl -s \"http://localhost:8000/07_editing/api/data.php?page=1&limit=20\" > /dev/null"
echo ""
echo "# 大量データテスト"
echo "curl \"http://localhost:8000/07_editing/api/data.php?page=1&limit=100\""
echo ""

echo ""
echo "✅ 動作確認スクリプト完了"
echo "=============================================="
echo "手動テストを実行して、すべての機能が正常に動作することを確認してください。"
echo ""
echo "問題が発生した場合は以下を確認:"
echo "1. データベース接続設定"
echo "2. ファイルパーミッション"
echo "3. PHPエラーログ"
echo "4. ブラウザのコンソールエラー"
echo ""
echo "🚀 テスト完了後、次のモジュールのリファクタリングに進んでください！"
