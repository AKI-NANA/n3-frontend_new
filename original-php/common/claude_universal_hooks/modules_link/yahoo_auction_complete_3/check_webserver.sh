#!/bin/bash

echo "🔍 Webサーバー状態確認スクリプト"

# 1. ポート8080の使用状況確認
echo "📡 ポート8080の使用状況:"
lsof -i :8080 || echo "ポート8080は使用されていません"

# 2. Webサーバープロセス確認
echo -e "\n🖥️ 実行中のWebサーバープロセス:"
ps aux | grep -E "(httpd|nginx|apache|php)" | grep -v grep || echo "Webサーバープロセスが見つかりません"

# 3. PHP cli確認
echo -e "\n🐘 PHP確認:"
php --version || echo "PHPが見つかりません"

# 4. ファイル存在確認
echo -e "\n📁 ファイル存在確認:"
TARGET_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete"

if [ -f "$TARGET_DIR/content_php/yahoo_auction_tool_content.php" ]; then
    echo "✅ メインファイル存在: content_php/yahoo_auction_tool_content.php"
    ls -la "$TARGET_DIR/content_php/yahoo_auction_tool_content.php"
else
    echo "❌ メインファイル不在: content_php/yahoo_auction_tool_content.php"
fi

# 5. ディレクトリ権限確認
echo -e "\n🔐 ディレクトリ権限確認:"
ls -la "$TARGET_DIR/" | head -10

# 6. 簡単なWebサーバー起動（必要に応じて）
echo -e "\n🚀 Webサーバー起動方法:"
echo "cd $TARGET_DIR"
echo "php -S localhost:8080"
echo ""
echo "または、N3-Development ルートから:"
echo "cd /Users/aritahiroaki/NAGANO-3/N3-Development"
echo "php -S localhost:8080"

# 7. アクセステスト用URL
echo -e "\n🌐 テスト用URL:"
echo "1. 診断スクリプト: http://localhost:8080/modules/yahoo_auction_complete/debug_display_issue.php"
echo "2. メインツール: http://localhost:8080/modules/yahoo_auction_complete/content_php/yahoo_auction_tool_content.php"
echo "3. 代替ツール: http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_content.php"

# 8. カールテスト（オプション）
echo -e "\n🧪 ローカル接続テスト:"
curl -I http://localhost:8080/modules/yahoo_auction_complete/debug_display_issue.php 2>/dev/null | head -3 || echo "ローカル接続失敗 - Webサーバーが起動していない可能性があります"
