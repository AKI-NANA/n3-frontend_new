#!/bin/bash

echo "🗂️ Yahoo Auction システム データ整理開始"
echo "========================================"

# 基本ディレクトリ設定
BASE_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure"
cd "$BASE_DIR"

echo "📍 現在のディレクトリ: $(pwd)"
echo ""

# =============================================================================
# 02_scraping - 大量ファイルの整理（70ファイル → 5ファイルに削減）
# =============================================================================
echo "🕸️ 02_scraping の整理（70ファイル → 5ファイル）..."

# oldディレクトリ作成
mkdir -p "02_scraping/old"

# 保持するファイル（最新・重要ファイルのみ）
KEEP_02=(
    "scraping.php"
    "scraping.css" 
    "yahoo_auction_script.js"
    "yahoo_parser_v2025.php"
    "api"
    "old"
)

# oldに移動するファイルリスト作成
moved_count_02=0
for file in 02_scraping/*; do
    if [ -f "$file" ] || [ -d "$file" ]; then
        filename=$(basename "$file")
        keep_file=false
        
        for keep in "${KEEP_02[@]}"; do
            if [[ "$filename" == "$keep" ]]; then
                keep_file=true
                break
            fi
        done
        
        if [[ "$keep_file" == false ]]; then
            echo "  📦 移動: $filename → old/"
            mv "$file" "02_scraping/old/"
            ((moved_count_02++))
        fi
    fi
done

echo "✅ 02_scraping - ${moved_count_02}ファイルをoldに移動、5ファイルに整理完了"

# =============================================================================
# 05_rieki - 重複ファイルの整理（22ファイル → 8ファイル）
# =============================================================================
echo ""
echo "💰 05_rieki の整理（22ファイル → 8ファイル）..."

# oldディレクトリ作成（old2と統合）
mkdir -p "05_rieki/old_archive"

# old2の内容をold_archiveに移動
if [ -d "05_rieki/old2" ]; then
    mv 05_rieki/old2/* 05_rieki/old_archive/ 2>/dev/null
    rmdir 05_rieki/old2 2>/dev/null
    echo "  🔄 old2の内容をold_archiveに統合"
fi

# 保持するファイル
KEEP_05=(
    "rieki.php"
    "riekikeisan.php"
    "complete_profit_calculator.php"
    "enhanced_price_calculator.php"
    "price_calculator_class.php"
    "database_schema.sql"
    "old"
    "old_archive"
)

# 古いファイルをoldに移動
moved_count_05=0
for file in 05_rieki/*; do
    if [ -f "$file" ] || [ -d "$file" ]; then
        filename=$(basename "$file")
        keep_file=false
        
        for keep in "${KEEP_05[@]}"; do
            if [[ "$filename" == "$keep" ]]; then
                keep_file=true
                break
            fi
        done
        
        if [[ "$keep_file" == false ]]; then
            echo "  📦 移動: $filename → old/"
            mv "$file" "05_rieki/old/"
            ((moved_count_05++))
        fi
    fi
done

echo "✅ 05_rieki - ${moved_count_05}ファイルをoldに移動、8ファイルに整理完了"

# =============================================================================
# 07_editing - 大量ファイルの整理（48ファイル → 12ファイル）
# =============================================================================
echo ""
echo "✏️ 07_editing の整理（48ファイル → 12ファイル）..."

# oldディレクトリ作成
mkdir -p "07_editing/old_detailed"

# 保持するファイル（最新・重要ファイルのみ）
KEEP_07=(
    "editor_fixed_complete.php"
    "editor_fixed_complete.css"
    "editor_fixed_complete.js"
    "editor.php"
    "editing.css"
    "editing.js"
    "api"
    "assets"
    "includes"
    "config.php"
    "old_detailed"
    "refactor_completion_report.md"
)

# バックアップファイルと古いファイルをoldに移動
moved_count_07=0
for file in 07_editing/*; do
    if [ -f "$file" ] || [ -d "$file" ]; then
        filename=$(basename "$file")
        keep_file=false
        
        # バックアップファイルの判定
        if [[ "$filename" == *"backup"* ]] || [[ "$filename" == *"debug"* ]] || [[ "$filename" == *"test"* ]] || [[ "$filename" == *"old"* ]]; then
            echo "  📦 移動: $filename → old_detailed/"
            mv "$file" "07_editing/old_detailed/"
            ((moved_count_07++))
            continue
        fi
        
        for keep in "${KEEP_07[@]}"; do
            if [[ "$filename" == "$keep" ]]; then
                keep_file=true
                break
            fi
        done
        
        if [[ "$keep_file" == false ]]; then
            echo "  📦 移動: $filename → old_detailed/"
            mv "$file" "07_editing/old_detailed/"
            ((moved_count_07++))
        fi
    fi
done

echo "✅ 07_editing - ${moved_count_07}ファイルをold_detailedに移動、12ファイルに整理完了"

# =============================================================================
# 08_listing - 基本構造保持
# =============================================================================
echo ""
echo "📋 08_listing の整理..."
mkdir -p "08_listing/old"

# 古いファイルをoldに移動
OLD_08=(
    "auto-listing-scheduler.php"
    "deployment-handover-guide.md"
    "final-file-package.md"
    "listing-enhancement-plan.md"
)

moved_count_08=0
for old_file in "${OLD_08[@]}"; do
    if [ -f "08_listing/$old_file" ]; then
        echo "  📦 移動: $old_file → old/"
        mv "08_listing/$old_file" "08_listing/old/"
        ((moved_count_08++))
    fi
done

echo "✅ 08_listing - ${moved_count_08}ファイルをoldに移動、整理完了"

# =============================================================================
# 10_zaiko - 基本構造保持
# =============================================================================
echo ""
echo "📦 10_zaiko の整理..."
mkdir -p "10_zaiko/old"

moved_count_10=0
if [ -f "10_zaiko/inventory_management_plan.md" ]; then
    echo "  📦 移動: inventory_management_plan.md → old/"
    mv "10_zaiko/inventory_management_plan.md" "10_zaiko/old/"
    ((moved_count_10++))
fi

echo "✅ 10_zaiko - ${moved_count_10}ファイルをoldに移動、整理完了"

# =============================================================================
# 12_html_editor - 基本構造保持
# =============================================================================
echo ""
echo "🌐 12_html_editor の整理..."
mkdir -p "12_html_editor/old"

moved_count_12=0
if [ -f "12_html_editor/debug_test.php" ]; then
    echo "  📦 移動: debug_test.php → old/"
    mv "12_html_editor/debug_test.php" "12_html_editor/old/"
    ((moved_count_12++))
fi

echo "✅ 12_html_editor - ${moved_count_12}ファイルをoldに移動、整理完了"

# =============================================================================
# ルートレベルファイルの整理
# =============================================================================
echo ""
echo "📄 ルートレベルファイルの整理..."

mkdir -p "old_root_files"

# 古いファイルをoldに移動
ROOT_OLD_FILES=(
    "test_fix.php"
    "test_fix_final.php"
    "07の修正.md"
    "editing_refactor_plan.md"
    ".DS_Store"
)

moved_count_root=0
for old_file in "${ROOT_OLD_FILES[@]}"; do
    if [ -f "$old_file" ]; then
        echo "  📦 移動: $old_file → old_root_files/"
        mv "$old_file" "old_root_files/"
        ((moved_count_root++))
    fi
done

# 空のディレクトリも整理
EMPTY_DIRS=(
    "#"
    "API統合（11_integrationを移動）"
    "カテゴリー判定（06_ebay_category_systemから分離）"
)

removed_dirs=0
for empty_dir in "${EMPTY_DIRS[@]}"; do
    if [ -d "$empty_dir" ]; then
        echo "  🗑️ 削除: $empty_dir（空のディレクトリ）"
        rmdir "$empty_dir" 2>/dev/null && ((removed_dirs++))
    fi
done

echo "✅ ルートレベル - ${moved_count_root}ファイルをold_root_filesに移動、${removed_dirs}ディレクトリを削除"

# =============================================================================
# 整理結果のサマリー表示
# =============================================================================
echo ""
echo "📊 整理結果サマリー"
echo "=================="

total_moved=$((moved_count_02 + moved_count_05 + moved_count_07 + moved_count_08 + moved_count_10 + moved_count_12 + moved_count_root))

echo "📁 02_scraping: 5ファイル保持 (${moved_count_02}ファイルをoldに移動)"
echo "📁 05_rieki: 8ファイル保持 (${moved_count_05}ファイルをoldに移動)"
echo "📁 07_editing: 12ファイル保持 (${moved_count_07}ファイルをold_detailedに移動)"
echo "📁 08_listing: 整理済み (${moved_count_08}ファイルをoldに移動)"
echo "📁 10_zaiko: 整理済み (${moved_count_10}ファイルをoldに移動)"
echo "📁 12_html_editor: 整理済み (${moved_count_12}ファイルをoldに移動)"
echo "📁 ルートファイル: 整理済み (${moved_count_root}ファイルをold_root_filesに移動)"

echo ""
echo "🎉 Yahoo Auction システム データ整理完了！"
echo "=========================================="
echo "✅ 合計 ${total_moved} ファイルをoldフォルダに移動"
echo "✅ 大量ファイル削減: 70→5 (02_scraping), 48→12 (07_editing), 22→8 (05_rieki)"
echo "✅ 各モジュールのoldフォルダに古いファイルを安全に保管"
echo "✅ システムが軽量化され、メンテナンスしやすくなりました！"
echo ""
echo "🔍 現在のディレクトリ構造:"
ls -la
