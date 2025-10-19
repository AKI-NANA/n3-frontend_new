#!/bin/bash
# ファイル整理・クリーンアップスクリプト
# ファイル: cleanup_files.sh

echo "🧹 11_categoryディレクトリ整理開始"
echo "================================"

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/11_category

# 削除対象ファイル
DELETE_FILES=(
    "card_design_samples.html"
    "simple_fee_tool.html" 
    "tool_cards.html"
    "check_db.php"
    "learning_api.php"
    "learning_tool.html"
    "COMPLETE_INTEGRATION_REPORT.md"
    "IMPLEMENTATION_STATUS_REPORT.md"
    "REALISTIC_SYSTEM_DESIGN.md"
    "ebay_category_completion_guide.md"
    "crontab_settings.txt"
    "ebay_sync_scheduler.sh"
    "sync_management_dashboard.php"
    "test_complete_system.sh"
    "yahoo_auction_approval_system.html"
)

# 削除実行
echo "削除対象ファイル:"
for file in "${DELETE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ❌ $file"
        rm "$file"
    else
        echo "  ⚠️  $file (見つかりません)"
    fi
done

echo ""
echo "✅ 整理完了"

# 残存ファイル確認
echo ""
echo "📂 整理後のファイル構成:"
echo "主要ファイル:"
echo "  ✅ frontend/ebay_category_tool.php (完全統合UI)"
echo "  ✅ unified_api.php (統合API)"
echo "  ✅ complete_database_setup.sh (DBセットアップ)"
echo ""

echo "保持ファイル:"
echo "  📊 fee_matching_tool.html (手数料マッチングツール)"
echo "  📊 fee_matcher.php (手数料マッチング処理)"
echo "  📊 check.php (簡易DB確認)"
echo "  📊 index.html (ダッシュボード)"
echo ""

echo "バックエンド:"
ls -la backend/classes/ 2>/dev/null || echo "  backend/classes/ ディレクトリ確認"

echo ""
echo "🎯 整理完了 - 必要なファイルのみ残存"