#!/bin/bash
# 拡張Yahoo→eBay統合ワークフロー APIサーバー テストスクリプト

set -e

echo "🧪 拡張Yahoo→eBay統合ワークフロー APIサーバー テスト実行中..."

# 現在のディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

API_URL="http://localhost:5001"
TESTS_PASSED=0
TESTS_FAILED=0

# テストヘルパー関数
run_test() {
    local test_name="$1"
    local endpoint="$2"
    local method="${3:-GET}"
    local data="${4:-}"
    
    echo ""
    echo "🔍 テスト: $test_name"
    echo "   URL: $API_URL$endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint" || echo "000")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST \
                   -H "Content-Type: application/json" \
                   -d "$data" \
                   "$API_URL$endpoint" || echo "000")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        echo "   ✅ PASS ($http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        # レスポンス内容チェック
        if echo "$response_body" | grep -q '"success".*true'; then
            echo "   📋 レスポンス: 正常"
        else
            echo "   ⚠️ レスポンス: 想定外"
        fi
    else
        echo "   ❌ FAIL ($http_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        if [ -n "$response_body" ]; then
            echo "   🔍 エラー詳細: $response_body"
        fi
    fi
}

# サーバー起動確認
echo "🌐 拡張APIサーバー接続確認中..."
if ! curl -s "$API_URL/health" > /dev/null; then
    echo "❌ 拡張APIサーバーに接続できません"
    echo "以下のコマンドでサーバーを起動してください:"
    echo "./start_enhanced_api_server.sh"
    exit 1
fi

echo "✅ 拡張APIサーバー接続確認完了"

# テスト実行
echo ""
echo "====================================================="
echo "🧪 拡張API機能テスト開始"
echo "====================================================="

# 1. ヘルスチェック（拡張版）
run_test "ヘルスチェック（拡張版）" "/health"

# 2. システム状態取得（拡張版）
run_test "システム状態取得（拡張版）" "/api/system_status"

# 3. 全データ取得（拡張版）
run_test "全データ取得（拡張版）" "/api/get_all_data"

# 4. 商品承認キュー取得
run_test "商品承認キュー取得" "/api/get_approval_queue"

# 5. 送料計算（拡張版）
shipping_data='{
    "weight": 1.5,
    "country": "US",
    "dimensions": "30x20x15"
}'
run_test "送料計算（拡張版）" "/api/calculate_shipping" "POST" "$shipping_data"

# 6. Yahoo オークション スクレイピング（拡張版）
scraping_data='{
    "urls": ["https://auctions.yahoo.co.jp/jp/auction/test123"]
}'
run_test "スクレイピング（拡張版）" "/api/scrape_yahoo" "POST" "$scraping_data"

# 7. 商品承認ステータス更新
approval_data='{
    "item_skus": ["ENHANCED_00001", "ENHANCED_00002"],
    "approval_action": "approved"
}'
run_test "商品承認ステータス更新" "/api/update_approval_status" "POST" "$approval_data"

# 8. CSV出力機能テスト
run_test "商品データCSV出力" "/api/export_csv/products"
run_test "送料マトリックスCSV出力" "/api/export_csv/shipping_matrix"

# 高度な機能テスト（オプション）
echo ""
echo "====================================================="
echo "🔬 高度な機能テスト（オプション）"
echo "====================================================="

# 9. 検索機能（もし実装されている場合）
run_test "検索機能テスト" "/api/search?query=test"

# 10. データベース統計
run_test "データベース統計" "/api/stats"

# テスト結果サマリー
echo ""
echo "====================================================="
echo "🧪 拡張API テスト結果サマリー"
echo "====================================================="
echo ""
echo "✅ 成功: $TESTS_PASSED テスト"
echo "❌ 失敗: $TESTS_FAILED テスト"
echo "📊 合計: $((TESTS_PASSED + TESTS_FAILED)) テスト"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo "🎉 全テスト成功! 拡張APIサーバーは正常に動作しています。"
    echo ""
    echo "🌐 フロントエンドアクセス:"
    echo "http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php"
    echo ""
    echo "🔧 拡張機能:"
    echo "  • 高度Yahooスクレイピング"
    echo "  • 商品承認ワークフロー" 
    echo "  • 送料計算エンジン"
    echo "  • CSV出力機能"
    echo "  • データベース統合"
    echo ""
    echo "📋 API仕様確認:"
    echo "http://localhost:5001/health"
    exit 0
else
    echo ""
    echo "⚠️ 一部テストが失敗しました。"
    echo "拡張APIサーバーログを確認してください"
    echo ""
    echo "🔧 デバッグ手順:"
    echo "1. ./start_enhanced_api_server.sh でサーバー再起動"
    echo "2. http://localhost:5001/health でヘルスチェック"
    echo "3. python3 enhanced_complete_api_updated.py でデバッグモード起動"
    exit 1
fi
