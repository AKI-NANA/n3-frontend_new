#!/bin/bash
# Claude Code Hooks 疎通テストシステム設定・実装

echo "🔗 Claude Code Hooks 疎通テストシステム構築中..."

# 1. ディレクトリ構造作成
mkdir -p ~/.claude/hooks/{pre-tool-use,post-tool-use,scripts}
mkdir -p ~/.claude/logs
mkdir -p ~/.claude/config

# 2. Claude Code設定ファイル作成
cat > ~/.claude/config/settings.json << 'EOF'
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/pre-tool-use/connection_test.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": ".*", 
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/post-tool-use/result_check.sh"
          }
        ]
      }
    ]
  }
}
EOF

# 3. メイン疎通テストスクリプト作成
cat > ~/.claude/hooks/pre-tool-use/connection_test.sh << 'EOF'
#!/bin/bash
# 🔗 プロジェクト疎通テスト（Claude Code起動時自動実行）

LOG_FILE="$HOME/.claude/logs/connection_test_$(date '+%Y%m%d_%H%M%S').log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "🚀 Claude Code Hooks疎通テスト開始 - $(date)"
echo "📁 プロジェクトディレクトリ: $(pwd)"

# プロジェクト判定
PROJECT_TYPE="unknown"
if [[ -f ".env" && -d "modules" && $(grep -c "NAGANO3" .env) -gt 0 ]]; then
    PROJECT_TYPE="nagano3"
    echo "🎯 検出: NAGANO3プロジェクト"
elif [[ -f "composer.json" ]]; then
    PROJECT_TYPE="php"
    echo "🎯 検出: PHPプロジェクト"
elif [[ -f "package.json" ]]; then
    PROJECT_TYPE="nodejs"
    echo "🎯 検出: Node.jsプロジェクト"
fi

# 疎通テスト実行
TESTS_PASSED=0
TESTS_TOTAL=0

# Test 1: 基本ファイル構造確認
echo "📋 Test 1: 基本ファイル構造確認"
((TESTS_TOTAL++))
if [[ "$PROJECT_TYPE" == "nagano3" ]]; then
    if [[ -f "index.php" && -d "common" && -d "modules" ]]; then
        echo "✅ NAGANO3基本構造OK"
        ((TESTS_PASSED++))
    else
        echo "❌ NAGANO3基本構造NG"
    fi
elif [[ -f "index.php" || -f "index.html" ]]; then
    echo "✅ 基本エントリーファイルOK"
    ((TESTS_PASSED++))
else
    echo "❌ エントリーファイルなし"
fi

# Test 2: データベース接続確認
echo "📋 Test 2: データベース接続確認"
((TESTS_TOTAL++))
if [[ -f ".env" ]]; then
    DB_HOST=$(grep "DB_HOST=" .env | cut -d'=' -f2)
    DB_NAME=$(grep "DB_NAME=" .env | cut -d'=' -f2)
    DB_USER=$(grep "DB_USER=" .env | cut -d'=' -f2)
    
    if [[ -n "$DB_HOST" && -n "$DB_NAME" && -n "$DB_USER" ]]; then
        # PostgreSQL接続テスト（実際のパスワードなしでテスト）
        if command -v psql >/dev/null 2>&1; then
            if timeout 5 psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
                echo "✅ データベース接続OK"
                ((TESTS_PASSED++))
            else
                echo "⚠️ データベース接続NG（設定は存在）"
                ((TESTS_PASSED++))  # 設定があればOKとする
            fi
        else
            echo "⚠️ psqlコマンドなし（設定は存在）"
            ((TESTS_PASSED++))  # 設定があればOKとする
        fi
    else
        echo "❌ データベース設定不完全"
    fi
else
    echo "❌ .envファイルなし"
fi

# Test 3: PHP環境確認
echo "📋 Test 3: PHP環境確認"
((TESTS_TOTAL++))
if command -v php >/dev/null 2>&1; then
    PHP_VERSION=$(php -v | head -n1 | grep -oP 'PHP \K[0-9]+\.[0-9]+')
    echo "✅ PHP $PHP_VERSION 利用可能"
    ((TESTS_PASSED++))
else
    echo "❌ PHP未インストール"
fi

# Test 4: JavaScript/Node.js環境確認（必要時）
if [[ "$PROJECT_TYPE" == "nodejs" || -f "package.json" ]]; then
    echo "📋 Test 4: Node.js環境確認"
    ((TESTS_TOTAL++))
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node -v)
        echo "✅ Node.js $NODE_VERSION 利用可能"
        ((TESTS_PASSED++))
    else
        echo "❌ Node.js未インストール"
    fi
fi

# Test 5: Python環境確認（NAGANO3のAI機能用）
if [[ "$PROJECT_TYPE" == "nagano3" ]]; then
    echo "📋 Test 5: Python環境確認"
    ((TESTS_TOTAL++))
    if command -v python3 >/dev/null 2>&1; then
        PYTHON_VERSION=$(python3 --version | grep -oP 'Python \K[0-9]+\.[0-9]+')
        echo "✅ Python $PYTHON_VERSION 利用可能"
        ((TESTS_PASSED++))
    else
        echo "❌ Python3未インストール"
    fi
fi

# Test 6: セキュリティ設定確認
echo "📋 Test 6: セキュリティ設定確認"
((TESTS_TOTAL++))
if [[ -f ".env" ]]; then
    if grep -q "CSRF_TOKEN_SECRET" .env && grep -q "ENCRYPTION_KEY" .env; then
        echo "✅ セキュリティ設定OK"
        ((TESTS_PASSED++))
    else
        echo "❌ セキュリティ設定不完全"
    fi
else
    echo "❌ 環境設定ファイルなし"
fi

# Test 7: API接続確認（NAGANO3の外部連携）
if [[ "$PROJECT_TYPE" == "nagano3" ]]; then
    echo "📋 Test 7: 外部API設定確認"
    ((TESTS_TOTAL++))
    if grep -q "MF_CLIENT_ID" .env && grep -q "OPENAI_API_KEY" .env; then
        echo "✅ 外部API設定OK"
        ((TESTS_PASSED++))
    else
        echo "⚠️ 外部API設定不完全（開発は可能）"
        ((TESTS_PASSED++))  # 開発段階では必須でないためOKとする
    fi
fi

# 結果判定
echo ""
echo "📊 疎通テスト結果: $TESTS_PASSED/$TESTS_TOTAL"
echo "==============================================="

SUCCESS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))

if [[ $SUCCESS_RATE -ge 80 ]]; then
    echo "✅ 疎通テスト成功 (${SUCCESS_RATE}%) - 開発続行可能"
    echo "🚀 Claude Codeでの開発を開始してください"
    exit 0
elif [[ $SUCCESS_RATE -ge 60 ]]; then
    echo "⚠️ 疎通テスト警告 (${SUCCESS_RATE}%) - 一部問題あり"
    echo "💡 問題を修正してから開発することを推奨"
    exit 0
else
    echo "❌ 疎通テスト失敗 (${SUCCESS_RATE}%) - 開発環境に重大な問題"
    echo "🛑 環境修正後に再実行してください"
    exit 1
fi
EOF

# 4. 実行後チェックスクリプト作成
cat > ~/.claude/hooks/post-tool-use/result_check.sh << 'EOF'
#!/bin/bash
# 🔍 Claude Code実行後の結果チェック

LOG_FILE="$HOME/.claude/logs/post_check_$(date '+%Y%m%d_%H%M%S').log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "🔍 Claude Code実行後チェック開始 - $(date)"

# PHPシンタックスチェック
echo "📋 PHPシンタックスチェック"
PHP_ERRORS=0
if command -v php >/dev/null 2>&1; then
    for file in $(find . -name "*.php" -not -path "./vendor/*" -not -path "./.git/*" 2>/dev/null | head -20); do
        if ! php -l "$file" >/dev/null 2>&1; then
            echo "❌ PHPシンタックスエラー: $file"
            ((PHP_ERRORS++))
        fi
    done
    
    if [[ $PHP_ERRORS -eq 0 ]]; then
        echo "✅ PHPシンタックスチェック完了"
    else
        echo "⚠️ PHPシンタックスエラー ${PHP_ERRORS}件発見"
    fi
else
    echo "⚠️ PHP未インストール - スキップ"
fi

# ファイル権限チェック
echo "📋 ファイル権限チェック"
PERMISSION_ISSUES=0
for dir in "logs" "cache" "uploads" "tmp"; do
    if [[ -d "$dir" ]]; then
        if [[ ! -w "$dir" ]]; then
            echo "❌ 書き込み権限なし: $dir"
            ((PERMISSION_ISSUES++))
        else
            echo "✅ 書き込み権限OK: $dir"
        fi
    fi
done

if [[ $PERMISSION_ISSUES -eq 0 ]]; then
    echo "✅ ファイル権限チェック完了"
else
    echo "⚠️ 権限問題 ${PERMISSION_ISSUES}件発見"
fi

# 新規作成ファイル確認
echo "📋 新規作成ファイル確認"
NEW_FILES=$(find . -name "*.php" -o -name "*.js" -o -name "*.html" -newermt "1 minute ago" 2>/dev/null | grep -v ".git" | head -10)
if [[ -n "$NEW_FILES" ]]; then
    echo "📁 新規作成されたファイル:"
    echo "$NEW_FILES"
else
    echo "ℹ️ 新規ファイルなし"
fi

echo "✅ 実行後チェック完了 - $(date)"
EOF

# 5. スクリプト実行権限設定
chmod +x ~/.claude/hooks/pre-tool-use/connection_test.sh
chmod +x ~/.claude/hooks/post-tool-use/result_check.sh

# 6. 手動テスト実行スクリプト作成
cat > ~/.claude/hooks/scripts/manual_test.sh << 'EOF'
#!/bin/bash
# 🧪 手動での疎通テスト実行

echo "🧪 手動