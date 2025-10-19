#!/bin/bash

# 🛡️ 完全バックアップスクリプト
echo "🔄 システム完全バックアップ開始..."

# バックアップディレクトリ作成
BACKUP_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 現在のフォルダを完全コピー
cp -R /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/* "$BACKUP_DIR/"

# データフォルダも個別バックアップ
if [ -d "/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/yahoo_ebay_data" ]; then
    cp -R /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/yahoo_ebay_data "$BACKUP_DIR/yahoo_ebay_data_backup"
fi

# 圧縮アーカイブ作成
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/
tar -czf "yahoo_auction_tool_COMPLETE_BACKUP_$(date +%Y%m%d_%H%M%S).tar.gz" yahoo_auction_tool/

echo "✅ バックアップ完了:"
echo "📁 フォルダバックアップ: $BACKUP_DIR"
echo "📦 圧縮アーカイブ: yahoo_auction_tool_COMPLETE_BACKUP_$(date +%Y%m%d_%H%M%S).tar.gz"

# 現在の状態記録
echo "📊 バックアップ時の状態:"
ps aux | grep python | grep -v grep
lsof -i -P | grep LISTEN | grep python

echo ""
echo "🛡️ バックアップ完了。修復作業を開始できます。"
