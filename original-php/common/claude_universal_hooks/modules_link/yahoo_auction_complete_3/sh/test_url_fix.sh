#!/bin/bash

# 🔧 Yahoo Auction スクレイピング URL設定修正版 テストスクリプト

echo "🚀 Yahoo Auction URL設定修正版 テスト実行"
echo "============================================="

# 現在のディレクトリ
BASE_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete"
cd "$BASE_DIR" || exit 1

echo "📂 作業ディレクトリ: $(pwd)"
echo "📅 実行時刻: $(date '+%Y-%m-%d %H:%M:%S')"

# 実行権限付与
echo ""
echo "🔑 実行権限付与中..."
chmod +x scraping_system_fixed.py
chmod +x test_scraping_fix.py

# ファイル確認
echo ""
echo "📋 修正版ファイル確認:"
echo "--------------------"

FILES=("scraping_system_fixed.py" "yahoo_auction_tool_content_fixed.php" "scraping_fix.js" "test_scraping_fix.py")

for FILE in "${FILES[@]}"; do
    if [ -f "$FILE" ]; then
        SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null)
        echo "✅ $FILE (${SIZE} bytes)"
    else
        echo "❌ $FILE が見つかりません"
    fi
done

# Python環境確認
echo ""
echo "🐍 Python環境確認:"
echo "----------------"

VENV_PYTHON="/Users/aritahiroaki/NAGANO-3/N3-Development/.venv/bin/python"

if [ -f "$VENV_PYTHON" ]; then
    echo "✅ 仮想環境Python: $VENV_PYTHON"
    "$VENV_PYTHON" --version
    PYTHON_CMD="$VENV_PYTHON"
else
    echo "⚠️ 仮想環境Python見つからず、system python3を使用"
    python3 --version
    PYTHON_CMD="python3"
fi

# URL設定修正版テスト実行
echo ""
echo "🧪 URL設定修正版テスト:"
echo "---------------------"

echo "テスト1: 引数なし実行（使用方法表示）"
echo "----------------------------------------"
timeout 10 "$PYTHON_CMD" scraping_system_fixed.py
echo ""

echo "テスト2: ローカルURL（修正対象エラー）"
echo "-----------------------------------"
timeout 10 "$PYTHON_CMD" scraping_system_fixed.py "http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php"
echo ""

echo "テスト3: 無効URL"
echo "---------------"
timeout 10 "$PYTHON_CMD" scraping_system_fixed.py "https://google.com"
echo ""

echo "テスト4: 有効Yahoo URL（テスト用）"
echo "-------------------------------"
timeout 10 "$PYTHON_CMD" scraping_system_fixed.py "https://auctions.yahoo.co.jp/jp/auction/test123"
echo ""

echo "テスト5: 総合テストツール実行"
echo "-------------------------"
timeout 30 "$PYTHON_CMD" test_scraping_fix.py all
echo ""

# Web アクセス情報
echo ""
echo "🌐 Webアクセステスト:"
echo "==================="
echo "URL: http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content_fixed.php"
echo ""
echo "🔧 修正内容:"
echo "- ✅ ローカルURL検出・エラー表示"
echo "- ✅ Yahoo URL専用検証"
echo "- ✅ リアルタイム入力検証"
echo "- ✅ 詳細エラーメッセージ"
echo "- ✅ URL例・ヘルプ表示"
echo "- ✅ フォールバック機能"
echo ""

# ログファイル確認
echo "📋 ログファイル確認:"
echo "-----------------"

if [ -f "scraping_debug.log" ]; then
    echo "✅ scraping_debug.log 存在"
    echo "最新ログ:"
    tail -5 scraping_debug.log
else
    echo "⚠️ scraping_debug.log 未作成"
fi

if [ -f "error.log" ]; then
    echo "✅ error.log 存在"
else
    echo "⚠️ error.log 未作成"
fi

echo ""
echo "🎯 期待される動作:"
echo "================="
echo "1. ローカルURL入力 → エラー表示 + 適切な説明"
echo "2. Yahoo以外URL入力 → エラー表示 + URL例表示"
echo "3. 有効Yahoo URL入力 → シミュレーション成功"
echo "4. リアルタイム検証 → 入力中にURL検証表示"
echo ""

echo "✅ テスト完了! 上記URLでWebアクセステストを実行してください。"
