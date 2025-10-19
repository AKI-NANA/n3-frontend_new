#!/bin/bash

# Yahoo Auction Tool 修正版動作確認スクリプト
# 作成日: 2025-09-10

echo "🔧 Yahoo Auction Tool 修正版動作確認開始"
echo "=================================="

# 1. ファイル存在確認
echo "📁 ファイル存在確認:"
FILES=(
    "yahoo_auction_tool_content.php"
    "yahoo_auction_tool.js"
    "yahoo_auction_tool_styles.css"
    "database_query_handler.php"
)

for file in "${FILES[@]}"; do
    if [ -f "/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/$file" ]; then
        echo "✅ $file - 存在"
    else
        echo "❌ $file - 不存在"
    fi
done

echo ""

# 2. PHP構文チェック
echo "🔍 PHP構文チェック:"
php -l /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_tool_content.php
php -l /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/database_query_handler.php

echo ""

# 3. 権限確認
echo "🔐 ファイル権限確認:"
ls -la /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_tool_content.php
ls -la /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/database_query_handler.php

echo ""

# 4. 簡単なAPIテスト
echo "🌐 API接続テスト:"
curl -s "http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php?action=check_db_connection" | head -100

echo ""
echo "=================================="
echo "✅ 動作確認完了"
echo ""
echo "📋 次のステップ:"
echo "1. ブラウザで以下のURLにアクセス:"
echo "   http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php"
echo ""
echo "2. 問題がある場合:"
echo "   - デバッグ情報ボタンをクリック"
echo "   - 接続テストボタンをクリック"
echo "   - ブラウザのコンソールでエラー確認"
echo ""
echo "3. 主な修正点:"
echo "   - データベース接続エラー処理追加"
echo "   - フォールバック機能実装"
echo "   - APIエンドポイント修正"
echo "   - JavaScriptエラーハンドリング強化"
