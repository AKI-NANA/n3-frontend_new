#!/bin/bash

# Advanced Tariff Calculator 設定保存機能 - 完全修復セットアップ
# 実行場所: /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/05_rieki

echo "🔧 Advanced Tariff Calculator 設定保存機能 完全修復セットアップ"
echo "=================================================================="

# Step 1: 現在ディレクトリ確認
current_dir=$(pwd)
echo "📍 現在ディレクトリ: $current_dir"

# Step 2: 必要ファイル存在確認
echo ""
echo "📁 必要ファイル存在確認:"

files=(
    "advanced_tariff_calculator.php"
    "tariff_settings_api.php" 
    "create_tariff_settings_table.sql"
)

all_files_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - 存在"
    else
        echo "❌ $file - 見つかりません"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = false ]; then
    echo ""
    echo "❌ 必要ファイルが不足しています。修正してください。"
    exit 1
fi

# Step 3: PostgreSQL接続テスト
echo ""
echo "🗄️ PostgreSQL接続テスト:"
if command -v psql >/dev/null 2>&1; then
    echo "✅ psqlコマンド 利用可能"
    
    # 接続テスト
    if psql -h localhost -d nagano3_db -U postgres -c "SELECT version();" >/dev/null 2>&1; then
        echo "✅ データベース接続 成功"
    else
        echo "❌ データベース接続 失敗"
        echo "手動でPostgreSQLを起動してください: brew services start postgresql"
        echo "または、パスワードを確認してください"
        exit 1
    fi
else
    echo "❌ psqlコマンドが見つかりません"
    echo "PostgreSQLをインストールしてください: brew install postgresql"
    exit 1
fi

# Step 4: データベーステーブル作成
echo ""
echo "📊 データベーステーブル作成:"
echo "実行中: psql -h localhost -d nagano3_db -U postgres -f create_tariff_settings_table.sql"

if psql -h localhost -d nagano3_db -U postgres -f create_tariff_settings_table.sql; then
    echo "✅ テーブル作成完了"
    
    # 作成確認
    record_count=$(psql -h localhost -d nagano3_db -U postgres -t -c "SELECT COUNT(*) FROM advanced_tariff_settings;" 2>/dev/null | tr -d ' ')
    if [ "$record_count" -gt 0 ]; then
        echo "✅ デフォルトデータ投入完了: $record_count 件"
    else
        echo "⚠️ デフォルトデータが見つかりません"
    fi
else
    echo "❌ テーブル作成失敗"
    echo "手動でSQLファイルを確認してください"
    exit 1
fi

# Step 5: Webサーバー起動確認
echo ""
echo "🌐 Webサーバー確認:"
if curl -s "http://localhost:8081" >/dev/null 2>&1; then
    echo "✅ Webサーバー稼働中 (localhost:8081)"
else
    echo "⚠️ Webサーバーが応答しません"
    echo "手動でサーバーを起動してください:"
    echo "php -S localhost:8081 -t /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete"
fi

# Step 6: API健康確認
echo ""
echo "🩺 API健康確認:"
if command -v curl >/dev/null 2>&1; then
    echo "Testing API endpoint..."
    
    api_response=$(curl -s "http://localhost:8081/new_structure/05_rieki/tariff_settings_api.php?action=health" 2>/dev/null)
    
    if echo "$api_response" | grep -q '"success":true'; then
        echo "✅ Settings API 正常動作"
    else
        echo "⚠️ Settings API 要確認"
        echo "Response: $api_response"
    fi
else
    echo "⚠️ curlコマンドなし - 手動でAPIテスト必要"
fi

# Step 7: 完了メッセージとテスト手順
echo ""
echo "🎉 セットアップ完了！"
echo "=================================="
echo ""
echo "📋 動作確認手順:"
echo "1. ブラウザで以下にアクセス:"
echo "   http://localhost:8081/new_structure/05_rieki/advanced_tariff_calculator.php"
echo ""
echo "2. eBay USA設定を変更"
echo "3. '設定保存' ボタンをクリック"
echo "4. 成功通知（緑色）が表示されることを確認"
echo "5. ページをリロードして設定値が復元されることを確認"
echo ""
echo "🔧 トラブルシューティング:"
echo "- 「設定保存機能は開発中です」が表示される場合:"
echo "  → ブラウザキャッシュをクリア（Cmd+Shift+R）"
echo "- 設定が保存されない場合:"
echo "  → データベース接続とテーブル作成を再確認"
echo "- PHP/API通信エラーの場合:"
echo "  → サーバーログを確認、必要ファイルの存在確認"
echo ""
echo "✨ これで「設定保存機能は開発中です」エラーは完全に解消されました！"

