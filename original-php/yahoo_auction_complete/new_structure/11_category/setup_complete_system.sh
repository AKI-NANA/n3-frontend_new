#!/bin/bash
#
# eBayカテゴリー完全システム - データベース構築スクリプト
# 実行日: 2025-09-19
#

echo "🚀 eBayカテゴリー完全システム構築開始"
echo "=================================="

# データベース接続情報
DB_HOST="localhost"
DB_NAME="nagano3_db"
DB_USER="aritahiroaki"
DB_PORT="5432"

# 現在のディレクトリ取得
SCRIPT_DIR=$(cd $(dirname $0) && pwd)
SQL_FILE="$SCRIPT_DIR/complete_system_tables.sql"

echo "📂 SQLファイル: $SQL_FILE"

# PostgreSQL接続テスト
echo "🔍 データベース接続テスト..."
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ データベース接続成功"
else
    echo "❌ データベース接続失敗"
    echo "📋 解決方法:"
    echo "   1. PostgreSQLサーバーが起動していることを確認"
    echo "   2. データベース名・ユーザー名を確認"
    echo "   3. 認証設定を確認"
    exit 1
fi

# SQLファイル存在確認
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQLファイルが見つかりません: $SQL_FILE"
    exit 1
fi

echo "🔧 SQLファイル実行中..."

# SQLファイル実行
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SQL_FILE"; then
    echo ""
    echo "🎉 ==============================================="
    echo "🎉   eBayカテゴリーシステム構築完了！"
    echo "🎉 ==============================================="
    echo ""
    
    # システム確認
    echo "📊 システム状況確認:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT 
            'カテゴリー数' as 項目, COUNT(*)::text as 数量 
        FROM ebay_categories
        UNION ALL
        SELECT 
            'キーワード数' as 項目, COUNT(*)::text as 数量 
        FROM category_keywords
        UNION ALL
        SELECT 
            '学習データ数' as 項目, COUNT(*)::text as 数量 
        FROM ebay_simple_learning
        UNION ALL
        SELECT 
            '手数料データ数' as 項目, COUNT(*)::text as 数量 
        FROM fee_matches;
    "
    
    echo ""
    echo "🌐 フロントエンドアクセス:"
    echo "   http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category/frontend/ebay_category_tool.php"
    echo ""
    echo "📋 次のステップ:"
    echo "   1. フロントエンドでテスト実行"
    echo "   2. 単一商品カテゴリー判定テスト"
    echo "   3. Yahoo Auctionデータとの連携テスト"
    
else
    echo "❌ SQLファイル実行失敗"
    echo "📋 エラーログを確認してください"
    exit 1
fi

echo ""
echo "🏁 スクリプト実行完了"