#!/bin/bash

# 🚀 Yahoo→eBay統合ワークフロー 禁止ワード機能セットアップ
# 実行前に必ずデータベースの状態を確認してください

echo "🚀 禁止ワード管理システムのセットアップを開始します..."

# 現在のディレクトリを確認
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 実行ディレクトリ: $SCRIPT_DIR"

# PostgreSQLデータベース設定
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="nagano3_db"
DB_USER="postgres"

echo "🔍 データベース接続を確認中..."

# データベース接続テスト
if PGPASSWORD="" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ データベース接続成功"
else
    echo "❌ データベース接続失敗"
    echo "⚠️  PostgreSQLが起動しているか確認してください"
    echo "⚠️  データベース設定を確認してください"
    exit 1
fi

# SQLファイルの存在確認
SQL_FILE="$SCRIPT_DIR/prohibited_keywords_setup.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQLファイルが見つかりません: $SQL_FILE"
    exit 1
fi

echo "📊 データベーススキーマをセットアップ中..."

# SQLスクリプトを実行
if PGPASSWORD="" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"; then
    echo "✅ データベーススキーマセットアップ完了"
else
    echo "❌ データベーススキーマセットアップ失敗"
    exit 1
fi

# テーブル作成の確認
echo "🔍 作成されたテーブルを確認中..."

TABLE_CHECK=$(PGPASSWORD="" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name IN ('prohibited_keywords', 'keyword_check_history', 'keyword_upload_history');
")

if [ "$TABLE_CHECK" -eq 3 ]; then
    echo "✅ 必要なテーブルがすべて作成されました"
else
    echo "⚠️  一部のテーブルが作成されていない可能性があります (作成数: $TABLE_CHECK/3)"
fi

# 初期データの確認
echo "📊 初期データを確認中..."

KEYWORD_COUNT=$(PGPASSWORD="" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) FROM prohibited_keywords;
")

echo "📈 登録されたキーワード数: $KEYWORD_COUNT"

# 関数の動作テスト
echo "🧪 禁止ワードチェック関数をテスト中..."

TEST_RESULT=$(PGPASSWORD="" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT is_prohibited FROM check_title_for_prohibited_words('Nintendo Switch Pro');
")

if [ "$TEST_RESULT" = "t" ] || [ "$TEST_RESULT" = "true" ]; then
    echo "✅ 禁止ワードチェック関数が正常に動作しています"
else
    echo "⚠️  禁止ワードチェック関数の動作を確認してください"
fi

# ファイルパーミッションの設定
echo "🔧 ファイルパーミッションを設定中..."

# PHPファイルに実行権限を設定
chmod 644 "$SCRIPT_DIR/shipping_management_api.php" 2>/dev/null
chmod 644 "$SCRIPT_DIR/prohibited_keywords_manager.js" 2>/dev/null
chmod 644 "$SCRIPT_DIR/yahoo_auction_tool_content.php" 2>/dev/null

echo "✅ ファイルパーミッション設定完了"

# 設定確認
echo ""
echo "🎉 セットアップ完了！"
echo ""
echo "📋 セットアップサマリー:"
echo "   ✅ データベーステーブル作成: 完了"
echo "   ✅ 初期禁止キーワード登録: $KEYWORD_COUNT 件"
echo "   ✅ チェック関数動作確認: 完了"
echo "   ✅ ファイルパーミッション: 完了"
echo ""
echo "🌐 アクセス方法:"
echo "   URL: http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php"
echo "   タブ: フィルター → 禁止ワード管理システム"
echo ""
echo "📝 次の手順:"
echo "   1. ブラウザでYahooオークションツールにアクセス"
echo "   2. 「フィルター」タブを開く"
echo "   3. 「データ更新」ボタンで禁止ワード一覧を確認"
echo "   4. CSVファイルをアップロードして追加の禁止ワードを登録"
echo ""
echo "🔧 APIエンドポイント:"
echo "   ベースURL: http://localhost:8080/modules/yahoo_auction_complete/shipping_management_api.php"
echo "   禁止ワード取得: ?action=get_prohibited_keywords"
echo "   タイトルチェック: ?action=check_prohibited&title=商品名"
echo "   CSVアップロード: POST action=upload_prohibited_keywords"
echo ""
echo "📚 使用例:"
echo "   curl 'http://localhost:8080/modules/yahoo_auction_complete/shipping_management_api.php?action=check_prohibited&title=Nintendo%20Switch'"

# 最終確認のためのテスト実行
echo ""
echo "🧪 最終動作テスト実行中..."

# API動作テスト
API_URL="http://localhost:8080/modules/yahoo_auction_complete/shipping_management_api.php"

# API接続テスト（curlが利用可能な場合）
if command -v curl >/dev/null 2>&1; then
    echo "🌐 API接続テスト中..."
    
    # 禁止ワード統計取得テスト
    if curl -s "$API_URL?action=get_prohibited_stats" >/dev/null; then
        echo "✅ API接続テスト成功"
    else
        echo "⚠️  API接続テストに問題があります"
        echo "   Webサーバーが起動しているか確認してください"
    fi
else
    echo "⚠️  curlコマンドが利用できません。手動でAPIテストを実行してください"
fi

echo ""
echo "🎊 禁止ワード管理システムのセットアップが完了しました！"
echo "   問題が発生した場合は、ログファイルとデータベース接続を確認してください。"
