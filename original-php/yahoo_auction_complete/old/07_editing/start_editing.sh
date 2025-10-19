#!/bin/bash

# Yahoo Auction編集システム起動スクリプト
echo "=== Yahoo Auction編集システム起動 ==="

# ディレクトリ移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete

# PHPサーバー起動
echo "PHPサーバーを起動中..."
php -S localhost:8000

echo "サーバー起動完了"
echo "アクセスURL: http://localhost:8000/new_structure/07_editing/editor.php"
