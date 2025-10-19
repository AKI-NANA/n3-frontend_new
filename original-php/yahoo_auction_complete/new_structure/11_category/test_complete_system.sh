#!/bin/bash
#
# eBayカテゴリーシステム - 完全テストスイート
# 実行日: 2025-09-19
#

echo "🧪 eBayカテゴリーシステム 完全テスト開始"
echo "======================================="

# テスト設定
API_URL="http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category/unified_api.php"
TEST_COUNT=0
PASS_COUNT=0

# テスト実行関数
run_test() {
    local test_name="$1"
    local test_data="$2"
    local expected_success="$3"
    
    TEST_COUNT=$((TEST_COUNT + 1))
    echo ""
    echo "🔍 テスト $TEST_COUNT: $test_name"
    echo "📤 送信データ: $test_data"
    
    local response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "$test_data")
    
    echo "📥 応答: $response"
    
    if echo "$response" | grep -q '"success":true' && [ "$expected_success" = "true" ]; then
        echo "✅ 成功"
        PASS_COUNT=$((PASS_COUNT + 1))
    elif echo "$response" | grep -q '"success":false' && [ "$expected_success" = "false" ]; then
        echo "✅ 期待通りの失敗"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo "❌ テスト失敗"
    fi
}

echo "🌐 APIエンドポイント: $API_URL"
echo ""

# =============================================================================
# テスト実行
# =============================================================================

# テスト1: iPhone判定
run_test "iPhone カテゴリー判定" \
    '{"action":"select_category","product_info":{"title":"iPhone 14 Pro 128GB Space Black","brand":"Apple","price_jpy":120000}}' \
    "true"

# テスト2: カメラ判定
run_test "Canon カメラ判定" \
    '{"action":"select_category","product_info":{"title":"Canon EOS R6 Mark II ボディ","brand":"Canon","price_jpy":280000}}' \
    "true"

# テスト3: ゲーム判定
run_test "PlayStation 判定" \
    '{"action":"select_category","product_info":{"title":"PlayStation 5 本体 CFI-2000A01","brand":"Sony","price_jpy":60000}}' \
    "true"

# テスト4: 本・漫画判定
run_test "漫画本判定" \
    '{"action":"select_category","product_info":{"title":"ドラゴンボール 完全版 全34巻セット","price_jpy":15000}}' \
    "true"

# テスト5: 不明商品（Other判定）
run_test "不明商品判定" \
    '{"action":"select_category","product_info":{"title":"謎の商品XYZ123","price_jpy":1000}}' \
    "true"

# テスト6: 統計情報取得
run_test "システム統計取得" \
    '{"action":"get_stats"}' \
    "true"

# テスト7: カテゴリー一覧取得
run_test "カテゴリー一覧取得" \
    '{"action":"get_categories"}' \
    "true"

# テスト8: バッチ処理テスト
run_test "バッチ処理テスト" \
    '{"action":"batch_process","products":[{"title":"iPhone 13","price_jpy":80000},{"title":"Canon EOS Kiss","price_jpy":50000}]}' \
    "true"

# テスト9: 空データエラーテスト
run_test "空データエラー" \
    '{"action":"select_category","product_info":{}}' \
    "false"

# テスト10: 不正アクションエラーテスト
run_test "不正アクションエラー" \
    '{"action":"invalid_action"}' \
    "false"

# =============================================================================
# テスト結果サマリー
# =============================================================================

echo ""
echo "📊 ================ テスト結果 =================="
echo "🔍 実行テスト数: $TEST_COUNT"
echo "✅ 成功テスト数: $PASS_COUNT"
echo "❌ 失敗テスト数: $((TEST_COUNT - PASS_COUNT))"

if [ $PASS_COUNT -eq $TEST_COUNT ]; then
    echo "🎉 全テスト合格！システム正常稼働中！"
    echo ""
    echo "🚀 システム利用準備完了:"
    echo "   フロントエンド: http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category/frontend/ebay_category_tool.php"
    echo ""
    exit 0
else
    echo "⚠️  一部テストが失敗しました"
    echo "📋 ログを確認して問題を修正してください"
    echo ""
    exit 1
fi