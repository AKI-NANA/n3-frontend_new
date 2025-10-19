#!/bin/bash
# Yahoo Auction System Python環境セットアップスクリプト

echo "🎯 Yahoo Auction System Python環境セットアップ開始"

# 現在のディレクトリを確認
current_dir=$(pwd)
echo "📁 現在のディレクトリ: $current_dir"

# N3-Developmentディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_system

echo "📦 Python環境確認中..."

# Python3の存在確認
if command -v python3 &> /dev/null; then
    echo "✅ Python3 確認: $(python3 --version)"
else
    echo "❌ Python3 が見つかりません"
    exit 1
fi

# pip3の存在確認
if command -v pip3 &> /dev/null; then
    echo "✅ pip3 確認: $(pip3 --version)"
else
    echo "❌ pip3 が見つかりません"
    exit 1
fi

echo "📥 Playwright インストール中..."

# Playwrightインストール
pip3 install playwright

# Chromiumブラウザインストール
python3 -m playwright install chromium

echo "🧪 スクレイパーテスト実行"

# テスト用URL
test_url="https://auctions.yahoo.co.jp/jp/auction/p1198293948"

# スクレイパーテスト実行
python3 yahoo_scraper.py "$test_url"

echo "✅ Yahoo Auction System セットアップ完了"