#!/bin/bash

# Advanced Tariff Calculator データベーステーブル作成スクリプト
# nagano3_db に advanced_profit_calculations テーブルを作成

echo "🔧 Advanced Tariff Calculator データベースセットアップ開始"
echo "=================================================="

# データベース接続確認
echo "1. データベース接続確認中..."
if psql -h localhost -d nagano3_db -U postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ nagano3_db 接続成功"
else
    echo "❌ nagano3_db 接続失敗"
    echo "以下を確認してください:"
    echo "- PostgreSQL が起動しているか"
    echo "- データベース nagano3_db が存在するか"
    echo "- ユーザー postgres のパスワードが正しいか"
    exit 1
fi

# SQLファイル存在確認
SQL_FILE="create_advanced_profit_table.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQLファイルが見つかりません: $SQL_FILE"
    exit 1
fi

# テーブル作成実行
echo "2. advanced_profit_calculations テーブル作成中..."
if psql -h localhost -d nagano3_db -U postgres -f "$SQL_FILE"; then
    echo "✅ テーブル作成完了"
else
    echo "❌ テーブル作成失敗"
    exit 1
fi

# 作成確認
echo "3. 作成確認..."
TABLE_EXISTS=$(psql -h localhost -d nagano3_db -U postgres -t -c "
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'advanced_profit_calculations'
    );
" | tr -d ' ')

if [ "$TABLE_EXISTS" = "t" ]; then
    echo "✅ advanced_profit_calculations テーブル確認完了"
    
    # レコード数確認
    RECORD_COUNT=$(psql -h localhost -d nagano3_db -U postgres -t -c "SELECT COUNT(*) FROM advanced_profit_calculations;" | tr -d ' ')
    echo "📊 サンプルデータ: $RECORD_COUNT 件"
    
else
    echo "❌ テーブル作成の確認に失敗"
    exit 1
fi

# テーブル構造表示
echo "4. テーブル構造確認:"
psql -h localhost -d nagano3_db -U postgres -c "\d+ advanced_profit_calculations"

echo ""
echo "🎉 セットアップ完了！"
echo "=================================================="
echo "advanced_tariff_calculator.php でデータベース保存が利用可能になりました"
echo ""
echo "アクセス URL:"
echo "- メインツール: http://localhost:8081/new_structure/09_shipping/advanced_tariff_calculator.php"
echo "- API確認: http://localhost:8081/new_structure/09_shipping/advanced_tariff_api_fixed.php?action=health"
echo "- DB確認: http://localhost:8081/new_structure/09_shipping/check_database_tariff.php"
echo ""
echo "使用方法:"
echo "1. 上記URLにアクセス"
echo "2. 商品情報・価格を入力"
echo "3. 計算実行"
echo "4. 結果が自動的にデータベースに保存されます"
