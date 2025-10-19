#!/bin/bash

echo "=== Yahoo Auction Complete サーバー診断・修復スクリプト ==="
echo "現在時刻: $(date)"
echo ""

# 現在のディレクトリ確認
echo "🔍 現在のディレクトリ:"
pwd
echo ""

# 8080ポートの使用状況確認
echo "🔍 ポート8080の使用状況確認:"
lsof -i :8080 || echo "ポート8080は空いています"
echo ""

# プロセス確認
echo "🔍 PHPプロセス確認:"
pgrep -l php || echo "PHPプロセスが見つかりません"
echo ""

# ファイル存在確認
echo "🔍 重要ファイルの存在確認:"
echo "- editing.php: $([ -f 'new_structure/07_editing/editing.php' ] && echo '✅ 存在' || echo '❌ 不在')"
echo "- editor.php: $([ -f 'new_structure/07_editing/editor.php' ] && echo '✅ 存在' || echo '❌ 不在')"
echo ""

# サーバー起動
echo "🚀 PHPサーバーを8080ポートで起動します..."
echo "ディレクトリ: $(pwd)"
echo "アクセスURL: http://localhost:8080/modules/yahoo_auction_complete/new_structure/07_editing/editing.php"
echo ""

# サーバー起動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete
php -S localhost:8080 -t /Users/aritahiroaki/NAGANO-3/N3-Development

