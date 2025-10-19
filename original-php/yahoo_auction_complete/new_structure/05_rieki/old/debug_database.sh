#!/bin/bash

# データベース保存状況確認スクリプト

echo "🔍 Advanced Tariff Settings データベース確認"
echo "=============================================="

# データベース接続確認
echo "📊 データベース接続テスト..."
if ! psql -h localhost -d nagano3_db -U postgres -c "SELECT 1;" >/dev/null 2>&1; then
    echo "❌ データベース接続失敗"
    exit 1
fi
echo "✅ データベース接続成功"

# テーブル存在確認
echo ""
echo "📋 テーブル存在確認..."
table_exists=$(psql -h localhost -d nagano3_db -U postgres -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'advanced_tariff_settings');" 2>/dev/null | tr -d ' ')

if [ "$table_exists" = "t" ]; then
    echo "✅ advanced_tariff_settings テーブル存在"
else
    echo "❌ advanced_tariff_settings テーブルが見つかりません"
    echo "テーブル作成を実行してください:"
    echo "psql -h localhost -d nagano3_db -U postgres -f create_tariff_settings_table.sql"
    exit 1
fi

# 全データ確認
echo ""
echo "📝 現在の保存データ一覧:"
psql -h localhost -d nagano3_db -U postgres -c "
SELECT 
    setting_category,
    setting_key,
    setting_value,
    setting_type,
    updated_at
FROM advanced_tariff_settings 
WHERE user_id = 'default' 
ORDER BY setting_category, setting_key;
"

# eBay USA設定のみ詳細表示
echo ""
echo "🇺🇸 eBay USA設定詳細:"
psql -h localhost -d nagano3_db -U postgres -c "
SELECT 
    setting_key,
    setting_value,
    updated_at
FROM advanced_tariff_settings 
WHERE user_id = 'default' AND setting_category = 'ebay_usa'
ORDER BY setting_key;
"

# 外注工賃費の確認
echo ""
echo "💰 外注工賃費の履歴:"
outsource_fee=$(psql -h localhost -d nagano3_db -U postgres -t -c "SELECT setting_value FROM advanced_tariff_settings WHERE user_id = 'default' AND setting_category = 'ebay_usa' AND setting_key = 'outsource_fee';" 2>/dev/null | tr -d ' ')

if [ -n "$outsource_fee" ]; then
    echo "現在の外注工賃費: $outsource_fee 円"
    if [ "$outsource_fee" = "300" ]; then
        echo "✅ 正しく300円で保存されています"
    elif [ "$outsource_fee" = "500" ]; then
        echo "⚠️ デフォルト値500円のままです（保存されていない可能性）"
    else
        echo "ℹ️ カスタム値: $outsource_fee 円"
    fi
else
    echo "❌ 外注工賃費の設定が見つかりません"
fi

# 最近の更新履歴
echo ""
echo "🕒 最近の設定更新履歴:"
psql -h localhost -d nagano3_db -U postgres -c "
SELECT 
    setting_category,
    setting_key,
    setting_value,
    updated_at
FROM advanced_tariff_settings 
WHERE user_id = 'default' AND updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
"

echo ""
echo "💡 デバッグのヒント:"
echo "- 外注工賃費が500円のままの場合 → 保存APIが正常に動作していない"
echo "- 外注工賃費が300円の場合 → 読み込みAPIまたはJavaScript初期化の問題"
echo "- 最近の更新履歴が空の場合 → 保存操作が実行されていない"
