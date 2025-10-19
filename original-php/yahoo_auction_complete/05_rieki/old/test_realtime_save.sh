#!/bin/bash

# リアルタイム保存テスト & ログ確認

echo "🔧 リアルタイム外注工賃費保存テスト"
echo "=================================="

# PHP エラーログの場所を確認
php_error_log=$(php -r "echo ini_get('error_log') ?: '/tmp/php_error.log';")
echo "📋 PHP エラーログ: $php_error_log"

# ログファイルをクリア
if [ -f "$php_error_log" ]; then
    > "$php_error_log"
    echo "✅ ログファイルをクリアしました"
fi

echo ""
echo "🧪 テスト1: 正しいデータで保存API呼び出し"

# 300円で保存テスト
test_data='{
  "action": "save_settings",
  "category": "ebay_usa",
  "settings": {
    "outsource_fee": 300,
    "electronics_tariff": 8.5,
    "packaging_fee": 250
  }
}'

echo "送信データ: $test_data"

curl_result=$(curl -s -X POST http://localhost:8081/new_structure/05_rieki/tariff_settings_api.php \
  -H "Content-Type: application/json" \
  -d "$test_data")

echo "APIレスポンス: $curl_result"

echo ""
echo "📋 PHP エラーログ (保存処理):"
if [ -f "$php_error_log" ]; then
    cat "$php_error_log"
else
    echo "ログファイルが見つかりません"
fi

echo ""
echo "🧪 テスト2: 保存後データベース確認"

outsource_value=$(psql -h localhost -d nagano3_db -U postgres -t -c "SELECT setting_value FROM advanced_tariff_settings WHERE setting_category = 'ebay_usa' AND setting_key = 'outsource_fee';" 2>/dev/null | tr -d ' ')

echo "データベース内の外注工賃費: $outsource_value"

if [ "$outsource_value" = "300" ]; then
    echo "✅ 正しく300で保存されました！"
elif [ "$outsource_value" = "500" ]; then
    echo "❌ まだ500のままです。保存処理に問題があります。"
else
    echo "⚠️ 予期しない値: $outsource_value"
fi

echo ""
echo "🧪 テスト3: 読み込みAPI確認"

# ログをクリア
> "$php_error_log"

load_result=$(curl -s "http://localhost:8081/new_structure/05_rieki/tariff_settings_api.php?action=load_settings&category=ebay_usa")

echo "読み込みAPIレスポンス: $load_result"

echo ""
echo "📋 PHP エラーログ (読み込み処理):"
cat "$php_error_log"

echo ""
echo "💡 次のステップ:"
echo "1. 上記のログで実際に300が送信されているかを確認"
echo "2. 保存処理で正しく処理されているかを確認"
echo "3. ブラウザでも同様のテストを実行"

echo ""
echo "🌐 ブラウザテスト用コード:"
cat << 'EOF'
// ブラウザのコンソールで実行してください

// 1. リアルタイム保存テスト
const testSave = async () => {
    const testSettings = {
        outsource_fee: 300,
        electronics_tariff: 8.5,
        packaging_fee: 250
    };
    
    console.log('🔥 送信データ:', testSettings);
    
    const response = await fetch('tariff_settings_api.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            action: 'save_settings',
            category: 'ebay_usa',
            settings: testSettings
        })
    });
    
    const result = await response.json();
    console.log('📥 APIレスポンス:', result);
    
    return result;
};

// 実行
testSave();

EOF
