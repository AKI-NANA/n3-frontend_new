#!/bin/bash
# ===================================================
# 既存システム統合・調査スクリプト
# ===================================================

echo "🔍 既存Yahoo→eBay統合ワークフロー 調査開始..."

# 現在のディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "===== 既存実装確認 ====="

# 既存のPythonサーバー確認
echo "🐍 Pythonサーバープロセス確認:"
ps aux | grep python | grep -v grep | grep -E "(api|server|workflow)" || echo "   Pythonサーバー未検出"

# 既存のPHPサーバー確認  
echo ""
echo "🐘 PHPサーバープロセス確認:"
ps aux | grep php | grep -v grep || echo "   PHPサーバー未検出"

# ポート使用状況
echo ""
echo "🔌 ポート使用状況:"
echo "   ポート5001:" $(lsof -ti:5001 2>/dev/null && echo "使用中" || echo "空き")
echo "   ポート8080:" $(lsof -ti:8080 2>/dev/null && echo "使用中" || echo "空き")
echo "   ポート5555:" $(lsof -ti:5555 2>/dev/null && echo "使用中" || echo "空き")

# 既存のAPIサーバーファイル確認
echo ""
echo "===== 既存APIサーバーファイル ====="

api_files=(
    "api_server.py"
    "api_server_complete.py" 
    "standalone_api_server.py"
    "workflow_api_server.py"
    "workflow_api_server_complete.py"
    "simple_integration_system.py"
)

for file in "${api_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - 存在"
        # ポート情報抽出
        port=$(grep -E "(port|PORT)" "$file" | head -1 | grep -o '[0-9]\+' | head -1)
        if [ -n "$port" ]; then
            echo "   📡 ポート: $port"
        fi
    else
        echo "❌ $file - 未存在"
    fi
done

# 既存のスクレイピングファイル確認
echo ""
echo "===== 既存スクレイピングファイル ====="

scraper_files=(
    "yahoo_auction_scraper.py"
    "scraper_engine.py"
    "scrape_yahoo_auction_advanced.py"
    "unified_scraping_system.py"
)

for file in "${scraper_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - 存在"
        # Playwright使用確認
        if grep -q "playwright" "$file"; then
            echo "   🎭 Playwright使用"
        fi
        if grep -q "requests" "$file"; then
            echo "   📡 requests使用"  
        fi
    else
        echo "❌ $file - 未存在"
    fi
done

# 既存の送料計算システム確認
echo ""
echo "===== 既存送料計算システム ====="

if [ -d "shipping_calculation" ]; then
    echo "✅ shipping_calculation/ ディレクトリ存在"
    
    shipping_files=(
        "shipping_calculation/shipping_api.py"
        "shipping_calculation/ShippingCalculator.php"
        "shipping_calculation/shipping_management_api.php"
    )
    
    for file in "${shipping_files[@]}"; do
        if [ -f "$file" ]; then
            echo "   ✅ $(basename $file)"
        else
            echo "   ❌ $(basename $file)"
        fi
    done
    
    # 送料データベース確認
    if [ -f "shipping_calculation/yahoo_ebay_data/shipping_calculation/shipping_rules.db" ]; then
        echo "   ✅ 送料データベース存在"
        db_size=$(du -h "shipping_calculation/yahoo_ebay_data/shipping_calculation/shipping_rules.db" | cut -f1)
        echo "   📊 データベースサイズ: $db_size"
    else
        echo "   ❌ 送料データベース未存在"
    fi
else
    echo "❌ shipping_calculation/ ディレクトリ未存在"
fi

# 既存データベース確認
echo ""
echo "===== 既存データベース確認 ====="

if [ -d "yahoo_ebay_data" ]; then
    echo "✅ yahoo_ebay_data/ ディレクトリ存在"
    
    find yahoo_ebay_data -name "*.db" -o -name "*.sqlite" | while read db_file; do
        if [ -f "$db_file" ]; then
            db_size=$(du -h "$db_file" | cut -f1)
            echo "   ✅ $(basename $db_file) ($db_size)"
        fi
    done
else
    echo "❌ yahoo_ebay_data/ ディレクトリ未存在"
fi

# 既存設定ファイル確認
echo ""
echo "===== 既存設定ファイル ====="

config_files=(
    "config.json"
    "config.php"
    ".env"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - 存在"
        
        # APIポート設定確認
        if grep -q "port" "$file" 2>/dev/null; then
            port_info=$(grep -E "(port|PORT)" "$file" | head -3)
            echo "   📡 ポート設定: $port_info"
        fi
    else
        echo "❌ $file - 未存在"
    fi
done

echo ""
echo "===== 統合推奨アクション ====="

# 推奨アクション
echo ""
echo "🔧 既存システム活用のための統合推奨事項:"
echo ""

if [ -f "yahoo_auction_scraper.py" ]; then
    echo "1. 🕷️ スクレイピング統合:"
    echo "   - yahoo_auction_scraper.pyをAPI化"
    echo "   - Playwright環境の確認"
    echo "   - 実行コマンド: python yahoo_auction_scraper.py"
fi

if [ -d "shipping_calculation" ]; then
    echo ""
    echo "2. 📦 送料計算統合:"
    echo "   - shipping_calculation/shipping_api.pyを起動"
    echo "   - PHPベースのAPIとPython統合"
    echo "   - データベース接続確認"
fi

echo ""
echo "3. 🔗 APIエンドポイント統合:"
echo "   - index.phpのAPI URL調整"
echo "   - 既存APIサーバーの起動確認"
echo "   - ポート統一（5001推奨）"

echo ""
echo "4. 🧪 動作テスト:"
echo "   - 既存システムの動作確認"
echo "   - フロントエンドとの接続テスト"
echo "   - 機能統合テスト"

echo ""
echo "===== 次のステップ ====="
echo ""
echo "📋 実行推奨コマンド:"
echo ""
echo "# 1. 既存システム起動確認"
echo "python yahoo_auction_scraper.py"
echo ""
echo "# 2. 送料計算API起動"
echo "cd shipping_calculation && python shipping_api.py"
echo ""  
echo "# 3. メインAPIサーバー起動"
echo "python workflow_api_server_complete.py"
echo ""
echo "# 4. フロントエンド接続確認"
echo "curl http://localhost:5001/system_status"
echo ""

echo "===== 調査完了 ====="
