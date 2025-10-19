#!/bin/bash
# 🛡️ 修正版 Yahoo Auction Tool 安全ファイル移動スクリプト

echo "🚀 Yahoo Auction Tool ファイル整理開始（修正版）"
echo "========================================="

# 作業ディレクトリ確認
WORK_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_tool"
cd "$WORK_DIR" || { echo "❌ 作業ディレクトリに移動できません"; exit 1; }

echo "📁 現在のディレクトリ: $(pwd)"
echo "📊 移動前ファイル数: $(find . -maxdepth 1 -type f | wc -l)"

# Phase 1: バックアップ作成（修正版）
echo ""
echo "📦 Phase 1: 全体バックアップ作成（修正版）"
BACKUP_NAME="backup_before_cleanup_$(date +%Y%m%d_%H%M%S).tar.gz"

# 一時的にバックアップ用ディレクトリ作成
mkdir -p ../temp_backup
cp -r . ../temp_backup/yahoo_auction_tool_backup
cd ../temp_backup
tar -czf "$BACKUP_NAME" yahoo_auction_tool_backup --exclude=venv --exclude=__pycache__ --exclude=.git
mv "$BACKUP_NAME" "$WORK_DIR/"
cd "$WORK_DIR"
rm -rf ../temp_backup

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

# 個別ファイル移動（より安全）
if ls *.backup.* 1> /dev/null 2>&1; then
    mv *.backup.* 削除候補/ 2>/dev/null
    echo "  ✓ *.backup.*: 移動完了"
fi

if ls *_backup_* 1> /dev/null 2>&1; then
    mv *_backup_* 削除候補/ 2>/dev/null
    echo "  ✓ *_backup_*: 移動完了"
fi

if ls *_old* 1> /dev/null 2>&1; then
    mv *_old* 削除候補/ 2>/dev/null
    echo "  ✓ *_old*: 移動完了"
fi

if ls .*.pid 1> /dev/null 2>&1; then
    mv .*.pid 削除候補/ 2>/dev/null
    echo "  ✓ .*.pid: 移動完了"
fi

if ls *.log 1> /dev/null 2>&1; then
    mv *.log 削除候補/ 2>/dev/null
    echo "  ✓ *.log: 移動完了"
fi

# テスト・デバッグファイル移動
echo ""
echo "🟡 テスト・デバッグファイル移動中..."

if ls test_* 1> /dev/null 2>&1; then
    mv test_* 削除候補/ 2>/dev/null
    echo "  ✓ test_*: 移動完了"
fi

if ls sample.* 1> /dev/null 2>&1; then
    mv sample.* 削除候補/ 2>/dev/null
    echo "  ✓ sample.*: 移動完了"
fi

if ls debug_* 1> /dev/null 2>&1; then
    mv debug_* 削除候補/ 2>/dev/null
    echo "  ✓ debug_*: 移動完了"
fi

if ls diagnose_* 1> /dev/null 2>&1; then
    mv diagnose_* 削除候補/ 2>/dev/null
    echo "  ✓ diagnose_*: 移動完了"
fi

# 古いindex移動
echo ""
echo "🟡 古いindexファイル移動中..."
OLD_INDEX_FILES=("index.html" "index2.html" "index.php")
for file in "${OLD_INDEX_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" 削除候補/
        echo "  ✓ $file 移動"
    fi
done

# index_で始まるファイル
if ls index_*.php 1> /dev/null 2>&1; then
    mv index_*.php 削除候補/ 2>/dev/null
    echo "  ✓ index_*.php: 移動完了"
fi

# 古いAPIサーバー移動
echo ""
echo "🟡 古いAPIサーバー移動中..."
OLD_API_FILES=(
    "api_server.py" 
    "api_server_simple.py" 
    "api_server_integrated.py" 
    "minimal_api_server.py" 
    "emergency_fixed_api.py"
    "api_server_complete_v2.py"
    "integrated_api_server.py"
    "integrated_api_server_with_csv.py"
    "standalone_api_server.py"
)

for file in "${OLD_API_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" 削除候補/
        echo "  ✓ $file 移動"
    fi
done

# 古いワークフロー移動
echo ""
echo "🟡 古いワークフローファイル移動中..."
if [ -f "complete_yahoo_ebay_workflow.py" ]; then
    mv "complete_yahoo_ebay_workflow.py" 削除候補/
    echo "  ✓ complete_yahoo_ebay_workflow.py 移動"
fi

if ls workflow_api_server*.py 1> /dev/null 2>&1; then
    mv workflow_api_server*.py 削除候補/ 2>/dev/null
    echo "  ✓ workflow_api_server*.py: 移動完了"
fi

# 古いUI・JS移動
echo ""
echo "🟡 古いUI・JavaScriptファイル移動中..."
OLD_JS_FILES=(
    "complete_system_fix.js"
    "emergency_complete_fix.js"
    "fix_all_functions.js"
    "complete_ui_improvements.js"
)

for file in "${OLD_JS_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" 削除候補/
        echo "  ✓ $file 移動"
    fi
done

# phase2関連ファイル
if ls *_phase2*.js 1> /dev/null 2>&1; then
    mv *_phase2*.js 削除候補/ 2>/dev/null
    echo "  ✓ *_phase2*.js: 移動完了"
fi

if ls *_emergency_fix.js 1> /dev/null 2>&1; then
    mv *_emergency_fix.js 削除候補/ 2>/dev/null
    echo "  ✓ *_emergency_fix.js: 移動完了"
fi

# 結果表示
echo ""
echo "📊 移動作業完了"
echo "========================================="
echo "📁 移動されたファイル数: $(find 削除候補/ -type f 2>/dev/null | wc -l)"
echo "📁 残りファイル数: $(find . -maxdepth 1 -type f | wc -l)"
echo ""
echo "📋 削除候補フォルダ内容（先頭20件）:"
ls -la 削除候補/ 2>/dev/null | head -20

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
