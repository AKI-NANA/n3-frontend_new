#!/bin/bash

# スクレイピングシステム修正版 実行権限付与・テストスクリプト

echo "🔧 Yahoo Auction スクレイピング修正版 セットアップ"
echo "======================================"

# 現在のディレクトリ
BASE_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete"
cd "$BASE_DIR" || exit 1

echo "📂 作業ディレクトリ: $(pwd)"

# 実行権限付与
echo "🔑 実行権限を付与中..."
chmod +x scraping_system_fixed.py
chmod 644 yahoo_auction_tool_content_fixed.php
chmod 644 scraping_fix.js

# ファイル確認
echo ""
echo "📋 修正版ファイル確認:"
echo "--------------------"

if [ -f "scraping_system_fixed.py" ]; then
    echo "✅ scraping_system_fixed.py ($(stat -f%z scraping_system_fixed.py) bytes)"
    ls -la scraping_system_fixed.py
else
    echo "❌ scraping_system_fixed.py が見つかりません"
fi

if [ -f "yahoo_auction_tool_content_fixed.php" ]; then
    echo "✅ yahoo_auction_tool_content_fixed.php ($(stat -f%z yahoo_auction_tool_content_fixed.php) bytes)"
    ls -la yahoo_auction_tool_content_fixed.php
else
    echo "❌ yahoo_auction_tool_content_fixed.php が見つかりません"
fi

if [ -f "scraping_fix.js" ]; then
    echo "✅ scraping_fix.js ($(stat -f%z scraping_fix.js) bytes)"
    ls -la scraping_fix.js
else
    echo "❌ scraping_fix.js が見つかりません"
fi

echo ""
echo "🐍 Python環境確認:"
echo "----------------"

# Python 確認
VENV_PYTHON="/Users/aritahiroaki/NAGANO-3/N3-Development/.venv/bin/python"

if [ -f "$VENV_PYTHON" ]; then
    echo "✅ 仮想環境Python: $VENV_PYTHON"
    "$VENV_PYTHON" --version
else
    echo "⚠️ 仮想環境Python見つからず、system python3を使用"
    python3 --version
fi

echo ""
echo "🧪 スクレイピングスクリプト構文チェック:"
echo "--------------------------------"

if [ -f "scraping_system_fixed.py" ]; then
    if [ -f "$VENV_PYTHON" ]; then
        "$VENV_PYTHON" -m py_compile scraping_system_fixed.py
    else
        python3 -m py_compile scraping_system_fixed.py
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ Python構文チェック: 正常"
    else
        echo "❌ Python構文エラーが見つかりました"
    fi
else
    echo "❌ スクリプトファイルが見つかりません"
fi

echo ""
echo "🌐 簡易テスト実行:"
echo "---------------"

# テスト実行（引数なし - ヘルプ表示）
if [ -f "scraping_system_fixed.py" ]; then
    echo "テスト1: 引数なし実行（ヘルプ表示）"
    if [ -f "$VENV_PYTHON" ]; then
        timeout 10 "$VENV_PYTHON" scraping_system_fixed.py
    else
        timeout 10 python3 scraping_system_fixed.py
    fi
    echo ""
    
    echo "テスト2: 無効URL実行"
    if [ -f "$VENV_PYTHON" ]; then
        timeout 10 "$VENV_PYTHON" scraping_system_fixed.py "https://invalid-url.com"
    else
        timeout 10 python3 scraping_system_fixed.py "https://invalid-url.com"
    fi
    echo ""
fi

echo ""
echo "📊 セットアップ完了"
echo "================="
echo "修正版ファイルの準備ができました。"
echo ""
echo "🌐 アクセスURL:"
echo "http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content_fixed.php"
echo ""
echo "🔧 主な修正点:"
echo "- URL検証強化"
echo "- エラーハンドリング改善"
echo "- デバッグ機能追加"
echo "- フォールバック機能実装"
echo "- ログシステム強化"
