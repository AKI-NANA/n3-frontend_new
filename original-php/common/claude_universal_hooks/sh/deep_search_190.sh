#!/bin/bash

echo "🔍 190個hooks徹底検索"
echo "==================="

BASE_DIR="./hooks"

echo "📊 あらゆるパターンでhooks検索:"
echo "=============================="

# パターン1: 通常のhooks関数
echo "🔍 パターン1: hooks関数"
hooks_funcs=$(grep -r "def.*hook" "$BASE_DIR" | wc -l)
echo "  hooks関数: ${hooks_funcs} 個"

# パターン2: クラス内のメソッド（すべて）
echo "🔍 パターン2: 全メソッド"
all_methods=$(grep -r "def " "$BASE_DIR" | wc -l)
echo "  全メソッド: ${all_methods} 個"

# パターン3: 特定の命名パターン
echo "🔍 パターン3: 詳細パターン別"
validate_count=$(grep -r "def validate_" "$BASE_DIR" | wc -l)
check_count=$(grep -r "def check_" "$BASE_DIR" | wc -l)
test_count=$(grep -r "def test_" "$BASE_DIR" | wc -l)
verify_count=$(grep -r "def verify_" "$BASE_DIR" | wc -l)
hook_count=$(grep -r "def hook_" "$BASE_DIR" | wc -l)
execute_count=$(grep -r "def execute_" "$BASE_DIR" | wc -l)
run_count=$(grep -r "def run_" "$BASE_DIR" | wc -l)
process_count=$(grep -r "def process_" "$BASE_DIR" | wc -l)
analyze_count=$(grep -r "def analyze_" "$BASE_DIR" | wc -l)
monitor_count=$(grep -r "def monitor_" "$BASE_DIR" | wc -l)
scan_count=$(grep -r "def scan_" "$BASE_DIR" | wc -l)
detect_count=$(grep -r "def detect_" "$BASE_DIR" | wc -l)
generate_count=$(grep -r "def generate_" "$BASE_DIR" | wc -l)
create_count=$(grep -r "def create_" "$BASE_DIR" | wc -l)
build_count=$(grep -r "def build_" "$BASE_DIR" | wc -l)
setup_count=$(grep -r "def setup_" "$BASE_DIR" | wc -l)
config_count=$(grep -r "def config_" "$BASE_DIR" | wc -l)
init_count=$(grep -r "def init_" "$BASE_DIR" | wc -l)
load_count=$(grep -r "def load_" "$BASE_DIR" | wc -l)
save_count=$(grep -r "def save_" "$BASE_DIR" | wc -l)
parse_count=$(grep -r "def parse_" "$BASE_DIR" | wc -l)
format_count=$(grep -r "def format_" "$BASE_DIR" | wc -l)
render_count=$(grep -r "def render_" "$BASE_DIR" | wc -l)
handle_count=$(grep -r "def handle_" "$BASE_DIR" | wc -l)
manage_count=$(grep -r "def manage_" "$BASE_DIR" | wc -l)

echo "  validate_*: ${validate_count}"
echo "  check_*: ${check_count}"
echo "  test_*: ${test_count}"
echo "  verify_*: ${verify_count}"
echo "  hook_*: ${hook_count}"
echo "  execute_*: ${execute_count}"
echo "  run_*: ${run_count}"
echo "  process_*: ${process_count}"
echo "  analyze_*: ${analyze_count}"
echo "  monitor_*: ${monitor_count}"
echo "  scan_*: ${scan_count}"
echo "  detect_*: ${detect_count}"
echo "  generate_*: ${generate_count}"
echo "  create_*: ${create_count}"
echo "  build_*: ${build_count}"
echo "  setup_*: ${setup_count}"
echo "  config_*: ${config_count}"
echo "  init_*: ${init_count}"
echo "  load_*: ${load_count}"
echo "  save_*: ${save_count}"
echo "  parse_*: ${parse_count}"
echo "  format_*: ${format_count}"
echo "  render_*: ${render_count}"
echo "  handle_*: ${handle_count}"
echo "  manage_*: ${manage_count}"

DETAILED_TOTAL=$((validate_count + check_count + test_count + verify_count + hook_count + execute_count + run_count + process_count + analyze_count + monitor_count + scan_count + detect_count + generate_count + create_count + build_count + setup_count + config_count + init_count + load_count + save_count + parse_count + format_count + render_count + handle_count + manage_count))

echo ""
echo "📊 詳細パターン合計: ${DETAILED_TOTAL} 個"

# パターン4: コメント内のhooks説明も検索
echo ""
echo "🔍 パターン4: コメント内のhooks説明"
comment_hooks=$(grep -r "# Hook" "$BASE_DIR" | wc -l)
doc_hooks=$(grep -r "Hook [0-9]" "$BASE_DIR" | wc -l)
numbered_hooks=$(grep -r "def.*[0-9]" "$BASE_DIR" | wc -l)
echo "  コメント内hooks: ${comment_hooks} 個"
echo "  Hook番号付き: ${doc_hooks} 個"
echo "  番号付きdef: ${numbered_hooks} 個"

# パターン5: クラス名から推定
echo ""
echo "🔍 パターン5: クラス名からhooks推定"
hook_classes=$(grep -r "class.*Hook" "$BASE_DIR" | wc -l)
validation_classes=$(grep -r "class.*Validation" "$BASE_DIR" | wc -l)
checker_classes=$(grep -r "class.*Checker" "$BASE_DIR" | wc -l)
echo "  Hook付きクラス: ${hook_classes} 個"
echo "  Validation付きクラス: ${validation_classes} 個"
echo "  Checker付きクラス: ${checker_classes} 個"

echo ""
echo "🎯 最終集計:"
echo "============"
echo "📊 全メソッド数: ${all_methods} 個"
echo "📊 詳細パターン合計: ${DETAILED_TOTAL} 個"

# 最大の可能性を探る
MAX_ESTIMATE=$DETAILED_TOTAL
echo "📈 最大推定hooks数: ${MAX_ESTIMATE} 個"

if [[ $MAX_ESTIMATE -ge 190 ]]; then
    echo "🎉 190個目標達成！"
else
    MISSING=$((190 - MAX_ESTIMATE))
    echo "⚠️ 不足: ${MISSING} 個"
fi

