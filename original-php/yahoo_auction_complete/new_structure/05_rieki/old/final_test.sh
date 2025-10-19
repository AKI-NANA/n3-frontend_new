#!/bin/bash

# 完全修正版API - 最終テスト

echo "🚀 完全修正版API - 最終テスト"
echo "============================="

# PHP エラーログクリア
php_error_log="/tmp/php_error.log"
> "$php_error_log"

echo "🧪 テスト1: ヘルスチェック"
health_result=$(curl -s "http://localhost:8081/new_structure/05_rieki/tariff_settings_api.php?action=health")
echo "ヘルスチェック結果:"
echo "$health_result" | jq '.'

echo ""
echo "🧪 テスト2: 外注工賃費300円で保存"

test_data='{
  "action": "save_settings",
  "category": "ebay_usa",
  "settings": {
    "outsource_fee": 300,
    "electronics_tariff": 8.5,
    "packaging_fee": 250
  }
}'

echo "送信データ:"
echo "$test_data" | jq '.'

save_result=$(curl -s -X POST http://localhost:8081/new_structure/05_rieki/tariff_settings_api.php \
  -H "Content-Type: application/json" \
  -d "$test_data")

echo "保存結果:"
echo "$save_result" | jq '.'

echo ""
echo "📋 PHP エラーログ (保存処理):"
cat "$php_error_log"

echo ""
echo "🗄️ データベース確認:"
outsource_value=$(psql -h localhost -d nagano3_db -U postgres -t -c "SELECT setting_value FROM advanced_tariff_settings WHERE setting_category = 'ebay_usa' AND setting_key = 'outsource_fee';" 2>/dev/null | tr -d ' ')

echo "データベース内の外注工賃費: $outsource_value"

if [ "$outsource_value" = "300" ]; then
    echo "✅ 成功！正しく300で保存されました！"
elif [ "$outsource_value" = "500" ]; then
    echo "❌ まだ500のままです"
else
    echo "⚠️ 予期しない値: $outsource_value"
fi

echo ""
echo "🧪 テスト3: 保存後の読み込み確認"

# ログクリア
> "$php_error_log"

load_result=$(curl -s "http://localhost:8081/new_structure/05_rieki/tariff_settings_api.php?action=load_settings&category=ebay_usa")

echo "読み込み結果:"
echo "$load_result" | jq '.settings.outsource_fee'

echo ""
echo "📋 PHP エラーログ (読み込み処理):"
cat "$php_error_log"

echo ""
echo "🎯 結果サマリー:"
echo "外注工賃費 - 送信: 300, 保存: $outsource_value, 読み込み: $(echo "$load_result" | jq -r '.settings.outsource_fee // "N/A"')"

if [ "$outsource_value" = "300" ]; then
    echo "🎉 完全成功！外注工賃費保存問題は解決されました！"
else
    echo "⚠️ 引き続き問題があります。ログを確認してください。"
fi
