#!/bin/bash
# ===================================================
# ワンライナー セットアップ & 起動スクリプト
# ===================================================

echo "🚀 Yahoo→eBay統合ワークフロー クイック起動中..."

# 実行権限付与
chmod +x start_api_server_complete.sh
chmod +x stop_api_server_complete.sh
chmod +x test_api_server_complete.sh

# APIサーバー起動
./start_api_server_complete.sh

# 5秒待機後テスト実行
echo ""
echo "⏳ 5秒後にテスト実行..."
sleep 5

./test_api_server_complete.sh
