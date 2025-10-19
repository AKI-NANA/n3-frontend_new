#!/bin/bash

# 実行権限を付与してサーバーを起動

echo "🔐 実行権限を付与中..."
chmod +x "/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/05_editing/start_editing_server.sh"

echo "🚀 編集システムサーバーを起動中..."
cd "/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/05_editing"
bash start_editing_server.sh