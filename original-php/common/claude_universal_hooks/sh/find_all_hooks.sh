#!/bin/bash

echo "🔍 190個hooks完全検索"
echo "===================="

BASE_DIR="./hooks"

echo "📊 検索パターン別hooks数:"
echo "========================"

# パターン1: validate_ で始まる関数
validate_hooks=$(grep -r "def validate_" "$BASE_DIR" | wc -l)
echo "🔍 validate_* パターン: ${validate_hooks} 個"

# パターン2: check_ で始まる関数  
check_hooks=$(grep -r "def check_" "$BASE_DIR" | wc -l)
echo "🔍 check_* パターン: ${check_hooks} 個"

# パターン3: test_ で始まる関数
test_hooks=$(grep -r "def test_" "$BASE_DIR" | wc -l)
echo "🔍 test_* パターン: ${test_hooks} 個"

# パターン4: verify_ で始まる関数
verify_hooks=$(grep -r "def verify_" "$BASE_DIR" | wc -l)
echo "🔍 verify_* パターン: ${verify_hooks} 個"

# パターン5: hook_ で始まる関数
hook_hooks=$(grep -r "def hook_" "$BASE_DIR" | wc -l)
echo "🔍 hook_* パターン: ${hook_hooks} 個"

# パターン6: execute_ で始まる関数
execute_hooks=$(grep -r "def execute_" "$BASE_DIR" | wc -l)
echo "🔍 execute_* パターン: ${execute_hooks} 個"

# パターン7: run_ で始まる関数
run_hooks=$(grep -r "def run_" "$BASE_DIR" | wc -l)
echo "🔍 run_* パターン: ${run_hooks} 個"

# パターン8: process_ で始まる関数
process_hooks=$(grep -r "def process_" "$BASE_DIR" | wc -l)
echo "🔍 process_* パターン: ${process_hooks} 個"

# パターン9: analyze_ で始まる関数
analyze_hooks=$(grep -r "def analyze_" "$BASE_DIR" | wc -l)
echo "🔍 analyze_* パターン: ${analyze_hooks} 個"

# 全パターン合計
TOTAL_FOUND=$((validate_hooks + check_hooks + test_hooks + verify_hooks + hook_hooks + execute_hooks + run_hooks + process_hooks + analyze_hooks))
echo ""
echo "📊 全パターン合計: ${TOTAL_FOUND} 個"

echo ""
echo "🔍 具体的なhooks一覧（最初の20個）:"
echo "================================="
grep -rn "def \(validate_\|check_\|test_\|verify_\|hook_\|execute_\|run_\|process_\|analyze_\)" "$BASE_DIR" | head -20

echo ""
echo "📄 ファイル別hooks分布:"
echo "====================="
for file in "$BASE_DIR"/*.py; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        file_hooks=$(grep -c "def \(validate_\|check_\|test_\|verify_\|hook_\|execute_\|run_\|process_\|analyze_\)" "$file")
        if [[ $file_hooks -gt 0 ]]; then
            echo "📄 $filename: ${file_hooks} 個"
        fi
    fi
done

