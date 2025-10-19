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
        
        # hook関数の推定（validate_, check_, test_, verify_で始まる関数）
        hook_functions=$(grep -c "def \(validate_\|check_\|test_\|verify_\|hook_\)" "$hook_file" 2>/dev/null || echo 0)
        echo "🪝 Hooks関数推定: ${hook_functions} 個"
        TOTAL_HOOKS_COUNT=$((TOTAL_HOOKS_COUNT + hook_functions))
        
        # インポートエラーチェック
        echo "🔍 依存関係チェック:"
        missing_imports=$(python3 -c "
import ast
import sys
try:
    with open('$hook_file', 'r') as f:
        tree = ast.parse(f.read())
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                try:
                    __import__(alias.name)
                except ImportError:
                    print(f'  ❌ {alias.name}')
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                try:
                    __import__(node.module)
                except ImportError:
                    print(f'  ❌ {node.module}')
except Exception as e:
    print(f'  ⚠️ 解析エラー: {e}')
        " 2>/dev/null)
        
        if [[ -z "$missing_imports" ]]; then
            echo "  ✅ 依存関係OK"
        else
            echo "$missing_imports"
        fi
        
        # メイン関数確認
        if grep -q "if __name__ == \"__main__\":" "$hook_file"; then
            echo "✅ 実行可能（main関数あり）"
        else
            echo "⚠️ ライブラリ形式（main関数なし）"
        fi
        
        # 実際の実行テスト
        echo "🧪 実行テスト:"
        timeout 5 python3 "$hook_file" --help >/dev/null 2>&1
        exit_code=$?
        case $exit_code in
            0) echo "  ✅ 正常実行" ;;
            124) echo "  ⏱️ タイムアウト（実行中）" ;;
            *) echo "  ❌ 実行エラー (exit code: $exit_code)" ;;
        esac
    fi
done

echo ""
echo "📊 全体統計:"
echo "============"
echo "📁 総ファイル数: $(ls "$BASE_DIR"/*.py | wc -l) 個"
echo "🏷️ 総クラス数: ${TOTAL_CLASSES} 個"
echo "⚙️ 総関数数: ${TOTAL_FUNCTIONS} 個"
echo "🪝 推定hooks数: ${TOTAL_HOOKS_COUNT} 個"

echo ""
echo "🎯 190hooks達成状況:"
echo "==================="
COMPLETION_RATE=$((TOTAL_HOOKS_COUNT * 100 / 190))
echo "📈 実装率: ${TOTAL_HOOKS_COUNT}/190 (${COMPLETION_RATE}%)"

if [[ $TOTAL_HOOKS_COUNT -lt 50 ]]; then
    echo "📋 状況: 基本実装段階"
elif [[ $TOTAL_HOOKS_COUNT -lt 100 ]]; then
    echo "📋 状況: 中級実装段階"
elif [[ $TOTAL_HOOKS_COUNT -lt 150 ]]; then
    echo "📋 状況: 高級実装段階"
else
    echo "📋 状況: 完成間近"
fi

