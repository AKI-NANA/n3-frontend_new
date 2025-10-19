#!/bin/bash

# Advanced Tariff Calculator 設定保存機能 セットアップ手順

echo "🔧 Advanced Tariff Calculator 設定保存機能セットアップ"
echo "=================================================="

# Step 1: データベースに設定保存テーブルを作成
echo ""
echo "📊 Step 1: 設定保存テーブル作成"
if command -v psql >/dev/null 2>&1; then
    echo "PostgreSQL接続テスト中..."
    if psql -h localhost -d nagano3_db -U postgres -c "SELECT version();" >/dev/null 2>&1; then
        echo "✅ PostgreSQL接続成功"
        
        # テーブル作成
        echo "📝 advanced_tariff_settings テーブル作成中..."
        psql -h localhost -d nagano3_db -U postgres -f create_tariff_settings_table.sql
        
        if [ $? -eq 0 ]; then
            echo "✅ テーブル作成成功"
        else
            echo "❌ テーブル作成失敗 - 手動でSQLを実行してください"
        fi
    else
        echo "❌ PostgreSQL接続失敗"
        echo "手動でデータベースを起動してください: brew services start postgresql"
    fi
else
    echo "❌ psqlコマンドが見つかりません"
fi

# Step 2: APIファイルの存在確認
echo ""
echo "📁 Step 2: APIファイル確認"
if [ -f "tariff_settings_api.php" ]; then
    echo "✅ tariff_settings_api.php 存在確認"
else
    echo "❌ tariff_settings_api.php が見つかりません"
    echo "ファイルを作成してください"
fi

# Step 3: メインファイルの更新確認
echo ""
echo "🔧 Step 3: メインファイル更新確認"
if grep -q "loadSettingsFromAPI" advanced_tariff_calculator.php; then
    echo "✅ advanced_tariff_calculator.php 更新済み"
else
    echo "❌ advanced_tariff_calculator.php の更新が必要"
fi

# Step 4: テスト手順の表示
echo ""
echo "🧪 Step 4: テスト手順"
echo "=================="
echo "1. ブラウザで以下にアクセス:"
echo "   http://localhost:8081/new_structure/09_shipping/advanced_tariff_calculator.php"
echo ""
echo "2. eBay USA設定を変更してから「設定保存」ボタンをクリック"
echo ""
echo "3. ページをリロードして設定値が復元されることを確認"
echo ""
echo "4. Shopee設定でも同様にテスト"
echo ""

# Step 5: API健康確認
echo "🩺 Step 5: API健康確認"
echo "=================="
if command -v curl >/dev/null 2>&1; then
    echo "APIエンドポイントテスト中..."
    response=$(curl -s "http://localhost:8081/new_structure/09_shipping/tariff_settings_api.php?action=health" 2>/dev/null)
    
    if [[ $response == *"success"* ]]; then
        echo "✅ Settings API正常動作"
    else
        echo "⚠️ Settings API要確認 - サーバーが起動していますか？"
    fi
else
    echo "ℹ️ curlコマンドが見つかりません - 手動でAPIをテストしてください"
fi

echo ""
echo "🎉 セットアップ完了！"
echo ""
echo "💡 トラブルシューティング:"
echo "- 「設定保存機能は開発中です」が表示される場合:"
echo "  → ブラウザのキャッシュをクリアしてリロード"
echo "- 設定が保存されない場合:"
echo "  → データベース接続とテーブル作成を確認"
echo "- API通信エラーの場合:"
echo "  → tariff_settings_api.php の存在とサーバー起動を確認"
