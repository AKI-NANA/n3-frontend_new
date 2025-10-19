#!/bin/bash

echo "🔍 Hooks詳細分析 - 190個hooks vs 19ファイル"
echo "============================================="

BASE_DIR="./hooks"

echo "📊 ファイル詳細分析:"
echo "==================="

TOTAL_HOOKS_COUNT=0
TOTAL_CLASSES=0
TOTAL_FUNCTIONS=0

for hook_file in "$BASE_DIR"/*.py; do
    if [[ -f "$hook_file" ]]; then
        filename=$(basename "$hook_file")
        echo ""
        echo "📄 分析中: $filename"
        echo "------------------------"
        
        # ファイルサイズ
        size=$(wc -c < "$hook_file")
        echo "📏 ファイルサイズ: ${size} bytes"
        
        # 行数
        lines=$(wc -l < "$hook_file")
        echo "📝 行数: ${lines} 行"
        
        # クラス数カウント
        classes=$(grep -c "^class " "$hook_file" 2>/dev/null || echo 0)
        echo "🏷️ クラス数: ${classes} 個"
        TOTAL_CLASSES=$((TOTAL_CLASSES + classes))
        
        # 関数数カウント
        functions=$(grep -c "def " "$hook_file" 2>/dev/null || echo 0)
        echo "⚙️ 関数数: ${functions} 個"
        TOTAL_FUNCTIONS=$((TOTAL_FUNCTIONS + functions))
        
        # hook関数の推定
        hook_functions=$(grep -E "def (validate_|check_|test_|verify_|hook_)" "$hook_file" 2>/dev/null | wc -l)
        echo "🪝 Hooks関数推定: ${hook_functions} 個"
        TOTAL_HOOKS_COUNT=$((TOTAL_HOOKS_COUNT + hook_functions))
        
        # 実際のhooks名を表示
        if [[ $hook_functions -gt 0 ]]; then
            echo "  📋 hooks一覧:"
            grep -E "def (validate_|check_|test_|verify_|hook_)" "$hook_file" | head -5 | sed 's/^/    /'
        fi
        
        # 簡単な実行テスト
        echo "🧪 実行テスト:"
        if timeout 3 python3 "$hook_file" --help >/dev/null 2>&1; then
            echo "  ✅ 正常実行"
        else
            echo "  ❌ 実行エラー"
        fi
    fi
done

echo ""
echo "📊 全体統計:"
echo "============"
echo "📁 総ファイル数: $(ls "$BASE_DIR"/*.py 2>/dev/null | wc -l) 個"
echo "🏷️ 総クラス数: ${TOTAL_CLASSES} 個"
echo "⚙️ 総関数数: ${TOTAL_FUNCTIONS} 個"
echo "🪝 推定hooks数: ${TOTAL_HOOKS_COUNT} 個"

echo ""
echo "🎯 190hooks達成状況:"
echo "==================="
if [[ $TOTAL_HOOKS_COUNT -gt 0 ]]; then
    COMPLETION_RATE=$((TOTAL_HOOKS_COUNT * 100 / 190))
    echo "📈 実装率: ${TOTAL_HOOKS_COUNT}/190 (${COMPLETION_RATE}%)"
else
    echo "📈 実装率: 0/190 (0%)"
fi

if [[ $TOTAL_HOOKS_COUNT -lt 50 ]]; then
    echo "📋 状況: 基本実装段階"
elif [[ $TOTAL_HOOKS_COUNT -lt 100 ]]; then
    echo "📋 状況: 中級実装段階"
elif [[ $TOTAL_HOOKS_COUNT -lt 150 ]]; then
    echo "📋 状況: 高級実装段階"
else
    echo "📋 状況: 完成間近"
fi

