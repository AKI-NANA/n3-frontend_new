#!/bin/bash

# デモ版HTMLファイルをブラウザで直接開く
# PHPサーバーなしでモーダル機能をテスト

echo "🎯 Yahoo Auction編集システム - デモ版を開きます..."

# HTMLファイルのパス
HTML_FILE="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/07_editing/yahoo_editing_fixed_complete.html"

# macOSの場合はopen、Linuxの場合はxdg-open
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 macOSでブラウザを起動中..."
    open "$HTML_FILE"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Linuxでブラウザを起動中..."
    xdg-open "$HTML_FILE"
else
    echo "📁 HTMLファイルパス: $HTML_FILE"
    echo "   ↑ このファイルをブラウザで開いてください"
fi

echo "✅ デモ版では以下の機能をテストできます:"
echo "   - モーダル表示機能"
echo "   - 15枚画像ギャラリー"
echo "   - レスポンシブデザイン"
echo "   - UI/UXの改善確認"