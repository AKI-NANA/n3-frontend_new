#!/bin/bash

echo "🔍 全hooks状態調査"
echo "=================="

BASE_DIR="./hooks"
WORKING_HOOKS=()
BROKEN_HOOKS=()

echo "📊 全hooksファイル一覧:"
echo "======================"

for hook_file in "$BASE_DIR"/*.py; do
    if [[ -f "$hook_file" ]]; then
        filename=$(basename "$hook_file")
        echo "🧪 テスト中: $filename"
        
        # 構文チェック
        if python3 -m py_compile "$hook_file" 2>/dev/null; then
            # 実行テスト
            if timeout 10 python3 "$hook_file" --help 2>/dev/null >/dev/null || \
               timeout 10 python3 "$hook_file" 2>/dev/null >/dev/null; then
                echo "✅ $filename - 動作OK"
                WORKING_HOOKS+=("$filename")
            else
                echo "⚠️ $filename - 実行エラー"
                BROKEN_HOOKS+=("$filename")
            fi
        else
            echo "❌ $filename - 構文エラー"
            BROKEN_HOOKS+=("$filename")
        fi
    fi
done

echo ""
echo "📊 調査結果:"
echo "============"
echo "✅ 動作するhooks: ${#WORKING_HOOKS[@]}個"
echo "❌ 問題のあるhooks: ${#BROKEN_HOOKS[@]}個"

echo ""
echo "✅ 動作するhooks一覧:"
for hook in "${WORKING_HOOKS[@]}"; do
    echo "  - $hook"
done

echo ""
echo "❌ 問題のあるhooks一覧:"
for hook in "${BROKEN_HOOKS[@]}"; do
    echo "  - $hook"
done

