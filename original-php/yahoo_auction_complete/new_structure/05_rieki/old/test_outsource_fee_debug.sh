#!/bin/bash

# 外注工賃費保存問題 - 包括的デバッグテスト

echo "🔧 外注工賃費保存問題 - 包括的デバッグテスト"
echo "=============================================="

# データベース状況確認
echo "📊 Step 1: データベース状況確認"
chmod +x debug_database.sh
./debug_database.sh

echo ""
echo "🧪 Step 2: API直接テスト"

# 保存APIテスト
echo "💾 保存APIテスト (外注工賃費300円)..."
save_result=$(curl -s -X POST http://localhost:8081/new_structure/05_rieki/tariff_settings_api.php \
  -H "Content-Type: application/json" \
  -d '{
    "action": "save_settings",
    "category": "ebay_usa", 
    "settings": {
      "outsource_fee": 300,
      "electronics_tariff": 8.0,
      "packaging_fee": 200
    }
  }')

echo "保存結果: $save_result"

# 読み込みAPIテスト  
echo ""
echo "📖 読み込みAPIテスト..."
load_result=$(curl -s "http://localhost:8081/new_structure/05_rieki/tariff_settings_api.php?action=load_settings&category=ebay_usa")

echo "読み込み結果: $load_result"

# データベース直接確認
echo ""
echo "🗄️ Step 3: データベース直接確認"
echo "外注工賃費の実際の値:"
outsource_value=$(psql -h localhost -d nagano3_db -U postgres -t -c "SELECT setting_value FROM advanced_tariff_settings WHERE setting_category = 'ebay_usa' AND setting_key = 'outsource_fee';" 2>/dev/null | tr -d ' ')

if [ -n "$outsource_value" ]; then
    echo "データベース内の外注工賃費: $outsource_value"
    if [ "$outsource_value" = "300" ]; then
        echo "✅ 正しく300で保存されています"
    else
        echo "❌ 期待値300ですが実際は: $outsource_value"
    fi
else
    echo "❌ 外注工賃費のデータが見つかりません"
fi

echo ""
echo "📝 Step 4: ブラウザテスト用コード"
cat << 'EOF'
=== ブラウザのコンソールで実行してください ===

// 1. 現在のフォーム値確認
console.log('現在の外注工賃費:', document.getElementById('usa-outsource-fee').value);

// 2. 手動で300に設定して保存テスト
document.getElementById('usa-outsource-fee').value = 300;
console.log('300に設定しました');

// 3. 保存実行
saveEbayConfig();

// 4. 5秒後にページリロードして確認
setTimeout(() => {
    console.log('リロード前の値:', document.getElementById('usa-outsource-fee').value);
    location.reload();
}, 5000);

// リロード後、以下を実行して値を確認
// console.log('リロード後の値:', document.getElementById('usa-outsource-fee').value);

=== デバッグ情報確認 ===

// API直接テスト
fetch('tariff_settings_api.php?action=load_settings&category=ebay_usa')
  .then(r => r.json())
  .then(data => {
    console.log('API読み込み結果:', data);
    if (data.success && data.settings) {
      console.log('外注工賃費:', data.settings.outsource_fee);
    }
  });

EOF

echo ""
echo "🚨 問題の特定ポイント:"
echo "1. API保存が成功しているか？"
echo "2. データベースに実際に保存されているか？"
echo "3. 読み込み時に正しく取得できているか？"
echo "4. JavaScript初期化時にデフォルト値で上書きされていないか？"

echo ""
echo "💡 次のステップ:"
echo "1. 上記のブラウザテストを実行"
echo "2. 開発者ツールのConsoleタブでログを確認"
echo "3. NetworkタブでAPI通信を確認"
echo "4. 問題箇所を特定して修正"
