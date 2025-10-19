#!/bin/bash
# 🛡️ Yahoo Auction Tool 安全ファイル移動スクリプト
# 削除ではなく移動で安全確保

echo "🚀 Yahoo Auction Tool ファイル整理開始"
echo "========================================="

# 作業ディレクトリ確認
WORK_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_tool"
cd "$WORK_DIR" || { echo "❌ 作業ディレクトリに移動できません"; exit 1; }

echo "📁 現在のディレクトリ: $(pwd)"
echo "📊 移動前ファイル数: $(find . -maxdepth 1 -type f | wc -l)"

# Phase 1: バックアップ作成
echo ""
echo "📦 Phase 1: 全体バックアップ作成"
BACKUP_NAME="backup_before_cleanup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$BACKUP_NAME" . --exclude=venv --exclude=__pycache__ --exclude=.git
echo "✅ バックアップ作成完了: $BACKUP_NAME"

# 重要ファイル緊急バックアップ
mkdir -p emergency_backup
cp yahoo_auction_tool_content.php emergency_backup/ 2>/dev/null || echo "⚠️ yahoo_auction_tool_content.php が見つかりません"
cp api_server_complete.py emergency_backup/ 2>/dev/null || echo "⚠️ api_server_complete.py が見つかりません"  
cp unified_scraping_system.py emergency_backup/ 2>/dev/null || echo "⚠️ unified_scraping_system.py が見つかりません"
cp config.json emergency_backup/ 2>/dev/null || echo "⚠️ config.json が見つかりません"
echo "✅ 重要ファイル緊急バックアップ完了"

# Phase 2: 削除候補フォルダ作成
echo ""
echo "📁 Phase 2: 削除候補フォルダ作成"
mkdir -p 削除候補

# 移動カウンター
MOVED_COUNT=0

# バックアップ・一時ファイル移動
echo ""
echo "🟡 バックアップ・一時ファイル移動中..."
for pattern in "*.backup.*" "*_backup_*" "*_old*" "*のコピー*" ".*.pid" "*.log"; do
    if ls $pattern 1> /dev/null 2>&1; then
        mv $pattern 削除候補/ 2>/dev/null
        COUNT=$(ls 削除候補/ | grep -E "$(echo $pattern | sed 's/\*/.*/')" | wc -l)
        MOVED_COUNT=$((MOVED_COUNT + COUNT))
        echo "  ✓ $pattern パターン: ${COUNT}件移動"
    fi
done

# テスト・デバッグファイル移動
echo ""
echo "🟡 テスト・デバッグファイル移動中..."
for pattern in "test_*" "*_test.*" "sample.*" "debug_*" "diagnose_*"; do
    if ls $pattern 1> /dev/null 2>&1; then
        mv $pattern 削除候補/ 2>/dev/null
        COUNT=$(find 削除候補/ -name "$(echo $pattern | sed 's/\*/.*/')" | wc -l)
        MOVED_COUNT=$((MOVED_COUNT + COUNT))
        echo "  ✓ $pattern パターン: ${COUNT}件移動"
    fi
done

# 古いindex移動
echo ""
echo "🟡 古いindexファイル移動中..."
for file in "index.html" "index2.html" "index.php" "index_*.php"; do
    if ls $file 1> /dev/null 2>&1; then
        mv $file 削除候補/ 2>/dev/null
        echo "  ✓ $file 移動"
        MOVED_COUNT=$((MOVED_COUNT + 1))
    fi
done

# 古いAPIサーバー移動
echo ""
echo "🟡 古いAPIサーバー移動中..."
OLD_API_FILES=("api_server.py" "api_server_simple.py" "api_server_integrated.py" "minimal_api_server.py" "emergency_fixed_api.py")
for file in "${OLD_API_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" 削除候補/
        echo "  ✓ $file 移動"
        MOVED_COUNT=$((MOVED_COUNT + 1))
    fi
done

# 古いワークフロー移動
echo ""
echo "🟡 古いワークフローファイル移動中..."
for pattern in "complete_yahoo_ebay_workflow.py" "workflow_api_server*.py"; do
    if ls $pattern 1> /dev/null 2>&1; then
        mv $pattern 削除候補/ 2>/dev/null
        echo "  ✓ $pattern 移動"
        MOVED_COUNT=$((MOVED_COUNT + 1))
    fi
done

# 古いUI・JS移動
echo ""
echo "🟡 古いUI・JavaScriptファイル移動中..."
for pattern in "*_emergency_fix.js" "*_phase2*.js" "complete_system_fix.js"; do
    if ls $pattern 1> /dev/null 2>&1; then
        mv $pattern 削除候補/ 2>/dev/null
        echo "  ✓ $pattern 移動"
        MOVED_COUNT=$((MOVED_COUNT + 1))
    fi
done

# 結果表示
echo ""
echo "📊 移動作業完了"
echo "========================================="
echo "📁 移動されたファイル数: $(find 削除候補/ -type f | wc -l)"
echo "📁 残りファイル数: $(find . -maxdepth 1 -type f | wc -l)"
echo ""
echo "📋 削除候補フォルダ内容:"
ls -la 削除候補/ | head -20

echo ""
echo "✅ ファイル移動完了!"
echo ""
echo "🔧 次のステップ:"
echo "  1. システム動作確認実施"
echo "  2. 問題なければ削除候補フォルダは後日削除"
echo "  3. 問題があれば: mv 削除候補/ファイル名 ./ で復旧"
echo ""
echo "⚠️ 復旧コマンド例:"
echo "  mv 削除候補/必要なファイル名 ./"
