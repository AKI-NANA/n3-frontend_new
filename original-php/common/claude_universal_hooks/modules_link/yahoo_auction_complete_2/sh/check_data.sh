#!/bin/bash
# 現在のデータ確認コマンド集

echo "🔍 現在のスクレイピングデータ確認"
echo "============================================"

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/yahoo_ebay_data

echo "📊 ファイル一覧:"
ls -la

echo ""
echo "📋 スクレイピング済み商品数:"
if [ -f "scraped_products.csv" ]; then
    lines=$(wc -l < scraped_products.csv)
    data_lines=$((lines - 1))  # ヘッダー行を除く
    echo "総行数: $lines (データ行: $data_lines)"
else
    echo "CSVファイルが存在しません"
fi

echo ""
echo "🎯 商品データ詳細:"
if [ -f "scraped_products.csv" ]; then
    echo "--- 商品ID・タイトル・価格 ---"
    tail -n +2 scraped_products.csv | cut -d',' -f1,4,5 | head -5
    
    echo ""
    echo "--- ステータス確認 ---"
    tail -n +2 scraped_products.csv | cut -d',' -f16 | sort | uniq -c
    
    echo ""
    echo "--- Yahoo URL ---"
    tail -n +2 scraped_products.csv | cut -d',' -f3
else
    echo "CSVファイルが存在しません"
fi

echo ""
echo "🔍 検索テスト用キーワード:"
if [ -f "scraped_products.csv" ]; then
    echo "商品ID: $(tail -n +2 scraped_products.csv | cut -d',' -f1)"
    echo "タイトルから: 'お兄ちゃん', 'おしまい', '8巻'"
    echo "Yahoo ID: 's1198365605'"
fi
