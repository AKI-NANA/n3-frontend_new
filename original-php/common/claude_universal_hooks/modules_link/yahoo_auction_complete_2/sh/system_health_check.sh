#!/bin/bash
# 🔍 Yahoo Auction Tool システム動作確認スクリプト

echo "🔍 Yahoo Auction Tool システム動作確認"
echo "========================================="

# 作業ディレクトリ移動
WORK_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_tool"
cd "$WORK_DIR" || { echo "❌ 作業ディレクトリに移動できません"; exit 1; }

echo "📁 現在のディレクトリ: $(pwd)"
echo ""

# 1. 重要ファイル存在確認
echo "📋 1. 重要ファイル存在確認"
CRITICAL_FILES=(
    "yahoo_auction_tool_content.php"
    "api_server_complete.py" 
    "unified_scraping_system.py"
    "config.json"
    "unified_scraped_ebay_database_schema_fixed.sql"
)

ALL_CRITICAL_EXISTS=true
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file - 不足"
        ALL_CRITICAL_EXISTS=false
    fi
done

if [ "$ALL_CRITICAL_EXISTS" = false ]; then
    echo ""
    echo "⚠️ 重要ファイルが不足しています。削除候補フォルダから復旧してください:"
    echo "  mv 削除候補/不足ファイル名 ./"
    exit 1
fi

echo ""

# 2. Python環境確認
echo "📋 2. Python環境確認"
if [ -d "venv" ]; then
    echo "  ✅ Python仮想環境存在"
    
    # 仮想環境有効化テスト
    source venv/bin/activate 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "  ✅ 仮想環境有効化成功"
        
        # 必要パッケージ確認
        python3 -c "import flask, pandas, requests, playwright" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "  ✅ 必要パッケージ確認"
        else
            echo "  ⚠️ パッケージ不足 - pip install -r requirements.txt 実行が必要"
        fi
        
        deactivate 2>/dev/null
    else
        echo "  ❌ 仮想環境有効化失敗"
    fi
else
    echo "  ❌ Python仮想環境不存在"
fi

echo ""

# 3. データベース接続確認
echo "📋 3. データベース接続確認"
psql -d nagano3_db -c "SELECT current_database();" 2>/dev/null 1>/dev/null
if [ $? -eq 0 ]; then
    echo "  ✅ nagano3_db接続成功"
    
    # テーブル確認
    TABLES=$(psql -d nagano3_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%unified%';" 2>/dev/null)
    if [ "$TABLES" -gt 0 ]; then
        echo "  ✅ 統合テーブル存在確認 ($TABLES個)"
    else
        echo "  ⚠️ 統合テーブル未作成 - SQLファイル実行が必要"
    fi
else
    echo "  ❌ データベース接続失敗"
    echo "     PostgreSQLサービス確認が必要"
fi

echo ""

# 4. ポート使用状況確認
echo "📋 4. ポート使用状況確認"
PORT_5000=$(lsof -i :5000 2>/dev/null | wc -l)
PORT_8080=$(lsof -i :8080 2>/dev/null | wc -l)

if [ "$PORT_5000" -gt 0 ]; then
    echo "  ⚠️ ポート5000使用中 - 既存APIサーバーが動作中の可能性"
else
    echo "  ✅ ポート5000利用可能"
fi

if [ "$PORT_8080" -gt 0 ]; then
    echo "  ⚠️ ポート8080使用中 - 既存PHPサーバーが動作中の可能性" 
else
    echo "  ✅ ポート8080利用可能"
fi

echo ""

# 5. APIサーバー起動テスト
echo "📋 5. APIサーバー起動テスト"
if [ -f "api_server_complete.py" ]; then
    source venv/bin/activate 2>/dev/null
    
    # バックグラウンドでAPIサーバー起動
    python3 api_server_complete.py &
    API_PID=$!
    
    # 起動待機
    sleep 3
    
    # ヘルスチェック
    HEALTH_RESPONSE=$(curl -s http://localhost:5000/health 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "  ✅ APIサーバー起動成功"
        echo "  📊 レスポンス: $HEALTH_RESPONSE"
    else
        echo "  ❌ APIサーバー起動失敗"
    fi
    
    # APIサーバー停止
    kill $API_PID 2>/dev/null
    
    deactivate 2>/dev/null
else
    echo "  ❌ api_server_complete.py が存在しません"
fi

echo ""

# 6. UI アクセステスト
echo "📋 6. UI アクセステスト" 
if [ -f "yahoo_auction_tool_content.php" ]; then
    # PHPサーバーが動作中かチェック
    PHP_RESPONSE=$(curl -s "http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php" 2>/dev/null | head -c 100)
    if [ $? -eq 0 ] && [ -n "$PHP_RESPONSE" ]; then
        echo "  ✅ UI アクセス成功"
        echo "  📊 レスポンス先頭: ${PHP_RESPONSE}..."
    else
        echo "  ⚠️ UI アクセス失敗 - PHPサーバー起動確認が必要"
        echo "     アクセス先: http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php"
    fi
else
    echo "  ❌ yahoo_auction_tool_content.php が存在しません"
fi

echo ""

# 7. 総合判定
echo "📊 総合判定"
echo "========================================="

if [ "$ALL_CRITICAL_EXISTS" = true ]; then
    echo "✅ システムファイル: 正常"
else
    echo "❌ システムファイル: 不完全"
fi

echo ""
echo "🎯 推奨次ステップ:"
echo "  1. 不足があれば該当ファイルを復旧"
echo "  2. データベーステーブル作成確認" 
echo "  3. Python依存関係インストール"
echo "  4. APIサーバー・PHPサーバー起動"
echo "  5. Gemini作成のJavaScript統合"
echo ""
echo "✅ システム動作確認完了"
