#!/bin/bash
# ===================================================
# 最終セットアップ & 権限付与
# ===================================================

echo "🔧 Yahoo→eBay統合ワークフロー 最終セットアップ中..."

# 現在のディレクトリを確認
CURRENT_DIR=$(pwd)
echo "作業ディレクトリ: $CURRENT_DIR"

# Yahoo Auction Toolディレクトリに移動
TARGET_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool"

if [ -d "$TARGET_DIR" ]; then
    cd "$TARGET_DIR"
    echo "✅ ディレクトリ変更: $TARGET_DIR"
else
    echo "❌ ディレクトリが見つかりません: $TARGET_DIR"
    exit 1
fi

# 実行権限付与
echo ""
echo "🔑 実行権限付与中..."

executable_files=(
    "start_api_server_complete.sh"
    "stop_api_server_complete.sh" 
    "test_api_server_complete.sh"
    "quick_start.sh"
    "diagnose_system.sh"
    "api_server_complete_v2.py"
)

for file in "${executable_files[@]}"; do
    if [ -f "$file" ]; then
        chmod +x "$file"
        echo "   ✅ $file"
    else
        echo "   ❌ $file (ファイルが見つかりません)"
    fi
done

# ディレクトリ作成
echo ""
echo "📁 必要ディレクトリ作成中..."

directories=(
    "logs"
    "yahoo_ebay_data"
    "uploads"
)

for dir in "${directories[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo "   ✅ $dir ディレクトリ作成"
    else
        echo "   ℹ️ $dir ディレクトリ既存"
    fi
done

echo ""
echo "====================================================="
echo "🎉 Yahoo→eBay統合ワークフロー セットアップ完了!"
echo "====================================================="
echo ""
echo "📋 利用可能コマンド:"
echo ""
echo "🔍 システム診断:"
echo "   ./diagnose_system.sh"
echo ""
echo "🚀 クイック起動:"
echo "   ./quick_start.sh"
echo ""
echo "⚙️ 個別操作:"
echo "   ./start_api_server_complete.sh  # APIサーバー起動"
echo "   ./test_api_server_complete.sh   # APIテスト実行"
echo "   ./stop_api_server_complete.sh   # APIサーバー停止"
echo ""
echo "🌐 アクセスURL:"
echo "   API: http://localhost:5001"
echo "   フロントエンド: http://localhost:8080/modules/yahoo_auction_tool/index.php"
echo ""
echo "📊 ログ監視:"
echo "   tail -f logs/api_server.log"
echo ""
echo "🎯 推奨起動手順:"
echo "   1. ./diagnose_system.sh     # システム状態確認"
echo "   2. ./quick_start.sh         # 統合システム起動"
echo "   3. ブラウザでフロントエンドアクセス"
echo ""
