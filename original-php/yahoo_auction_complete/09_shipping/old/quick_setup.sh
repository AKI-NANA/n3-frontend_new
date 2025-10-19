#!/bin/bash

# 簡単実行版: Advanced Tariff Calculator DB セットアップ

echo "🚀 Advanced Tariff Calculator データベース自動セットアップ"

# 現在のディレクトリを移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping

# 実行権限付与
chmod +x setup_advanced_tariff_db.sh

# セットアップ実行
./setup_advanced_tariff_db.sh

echo ""
echo "📝 次のステップ:"
echo "1. サーバーが起動していることを確認"
echo "   cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete"
echo "   php -S localhost:8081"
echo ""
echo "2. ブラウザで確認:"
echo "   http://localhost:8081/new_structure/09_shipping/check_database_tariff.php"
