#!/bin/bash
# Yahoo→eBay統合ワークフロー 拡張APIサーバー起動スクリプト

echo "🚀 Yahoo→eBay統合ワークフロー 拡張APIサーバー起動中..."
echo "=============================================="

# 現在のディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 既存のAPIサーバーを停止
echo "🔄 既存APIサーバー停止中..."
pkill -f "python.*enhanced_complete_api_updated.py" || echo "既存サーバーは稼働していませんでした"
pkill -f "python.*api_server_complete.py" || echo "旧APIサーバーは稼働していませんでした"
sleep 2

# 必要ディレクトリ作成
echo "📁 ディレクトリ準備中..."
mkdir -p uploads
mkdir -p yahoo_ebay_data
chmod 755 uploads yahoo_ebay_data

# 実行権限付与
chmod +x enhanced_complete_api_updated.py

# 仮想環境チェック
if [ -d "venv" ]; then
    echo "🐍 仮想環境をアクティベート中..."
    source venv/bin/activate
else
    echo "⚠️ 仮想環境が見つかりません。システムPythonを使用します。"
fi

# 必要ライブラリ確認
echo "📦 ライブラリ確認中..."
python3 -c "
import sys
required_modules = ['flask', 'flask_cors', 'pandas', 'requests']
missing_modules = []

for module in required_modules:
    try:
        __import__(module)
        print(f'✅ {module}')
    except ImportError:
        missing_modules.append(module)
        print(f'❌ {module} - not found')

if missing_modules:
    print(f'\\n⚠️ 不足ライブラリ: {missing_modules}')
    print('インストールしています...')
    import subprocess
    for module in missing_modules:
        if module == 'flask_cors':
            subprocess.run([sys.executable, '-m', 'pip', 'install', 'Flask-CORS'], check=True)
        else:
            subprocess.run([sys.executable, '-m', 'pip', 'install', module], check=True)
else:
    print('✅ 全ライブラリ確認完了')
"

# 高度な機能モジュールチェック
echo ""
echo "🔍 高度な機能モジュール確認中..."
if [ -f "unified_scraping_system.py" ]; then
    echo "✅ 統合スクレイピングシステム: 利用可能"
else
    echo "⚠️ 統合スクレイピングシステム: 基本モードで動作"
fi

if [ -f "scrape_yahoo_auction_advanced.py" ]; then
    echo "✅ 高度スクレイピングエンジン: 利用可能"
else
    echo "⚠️ 高度スクレイピングエンジン: フォールバックモード"
fi

if [ -f "ebay_integration_controller.py" ]; then
    echo "✅ eBay統合コントローラー: 利用可能"
else
    echo "⚠️ eBay統合コントローラー: 基本モードで動作"
fi

# データベースファイル初期化確認
if [ -f "yahoo_ebay_workflow_enhanced.db" ]; then
    echo "📊 拡張データベース: 既存ファイル使用"
else
    echo "📊 拡張データベース: 新規作成予定"
fi

echo ""
echo "🌟 拡張APIサーバー起動準備完了!"
echo ""
echo "🎯 提供機能一覧:"
echo "  ✅ 高度Yahooスクレイピング（Playwright対応）"
echo "  ✅ PostgreSQL統合データベース"
echo "  ✅ 商品承認ワークフロー"
echo "  ✅ 送料計算エンジン"
echo "  ✅ CSV出力機能"
echo "  ✅ eBay API統合準備"
echo "  ✅ 重複検出システム"
echo "  ✅ エラーハンドリング"
echo ""
echo "🌐 アクセス先:"
echo "  フロントエンド: http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php"
echo "  API ヘルスチェック: http://localhost:5001/health"
echo ""

# メインサーバー起動
echo "🚀 拡張APIサーバー起動中..."
python3 enhanced_complete_api_updated.py

echo ""
echo "🔚 拡張APIサーバーが終了しました"
