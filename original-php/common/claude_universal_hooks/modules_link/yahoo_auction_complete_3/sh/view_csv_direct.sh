#!/bin/bash
# CSVファイル直接表示

echo "📊 現在のCSVデータ確認"
echo "=================================="

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/yahoo_ebay_data

if [ -f "scraped_products.csv" ]; then
    echo "✅ scraped_products.csv が見つかりました"
    echo ""
    echo "📋 ヘッダー行:"
    head -1 scraped_products.csv
    echo ""
    echo "📋 データ行 (最初の3行):"
    tail -n +2 scraped_products.csv | head -3
    echo ""
    echo "📊 総行数: $(wc -l < scraped_products.csv) (ヘッダー含む)"
    echo "📊 データ行数: $(($(wc -l < scraped_products.csv) - 1))"
else
    echo "❌ scraped_products.csv が見つかりません"
fi
