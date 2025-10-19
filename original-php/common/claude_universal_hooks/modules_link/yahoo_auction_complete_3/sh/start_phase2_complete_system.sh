#!/bin/bash

# 🚀 送料計算システム Phase 2 統合版起動スクリプト
# Gemini AI アドバイス実装完了版

echo "🌟 ===== 送料計算システム Phase 2 統合版起動 ====="
echo ""
echo "📋 実装完了機能（Gemini AI アドバイス）:"
echo "   🇺🇸 USA基準送料内包戦略"
echo "   🚛 eloji送料データCSV管理"  
echo "   🛡️ 為替リスク安全マージン"
echo "   📦 統合価格計算システム"
echo "   📊 自動データベース管理"
echo ""

# カレントディレクトリ移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool

# 権限設定
echo "🔧 Phase 2 権限設定中..."
chmod +x shipping_calculation/*.py
chmod +x *.py
chmod +x *.sh

# 必要なディレクトリ作成
echo "📁 Phase 2 ディレクトリ作成中..."
mkdir -p yahoo_ebay_data/shipping_calculation
mkdir -p yahoo_ebay_data/csv_uploads
mkdir -p logs

# Python環境・パッケージ確認
echo "🐍 Phase 2 Python環境確認中..."
python3 -c "
try:
    import flask, pandas, requests, sqlite3, werkzeug
    print('✅ Phase 2 必要パッケージ確認済み')
except ImportError as e:
    print(f'❌ 不足パッケージ: {e}')
    print('📦 パッケージインストール中...')
    import subprocess
    subprocess.run(['pip3', 'install', 'flask', 'pandas', 'requests', 'werkzeug'])
"

# Phase 2 データベース初期化テスト
echo "🗄️ Phase 2 データベース初期化テスト中..."
python3 -c "
import sys
from pathlib import Path
sys.path.append('shipping_calculation')

try:
    from usa_base_calculator import USABaseShippingCalculator
    from eloji_csv_manager import ElojiShippingDataManager
    from exchange_risk_manager import ExchangeRateRiskManager
    
    # データベースパス
    db_path = Path('./yahoo_ebay_data/shipping_calculation/shipping_rules.db')
    
    # 各システム初期化テスト
    print('🔄 USA基準計算システムテスト中...')
    usa_calc = USABaseShippingCalculator(db_path)
    print('✅ USA基準計算システム OK')
    
    print('🔄 eloji CSV管理システムテスト中...')
    eloji_mgr = ElojiShippingDataManager(db_path, Path('./yahoo_ebay_data/csv_uploads'))
    print('✅ eloji CSV管理システム OK')
    
    print('🔄 為替リスク管理システムテスト中...')
    exchange_mgr = ExchangeRateRiskManager(db_path)
    print('✅ 為替リスク管理システム OK')
    
    print('🎉 Phase 2 コンポーネント初期化完了')
    
except Exception as e:
    print(f'❌ Phase 2 初期化エラー: {e}')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ Phase 2 データベース初期化に失敗しました"
    exit 1
fi

# 既存サーバーのポート確認・停止
echo "🔍 既存サーバー確認中..."
if lsof -ti:5001; then
    echo "⚠️ ポート5001使用中。既存サーバー停止中..."
    kill -9 $(lsof -ti:5001) 2>/dev/null
    sleep 2
fi

if lsof -ti:5000; then
    echo "⚠️ ポート5000使用中。既存サーバー停止中..."
    kill -9 $(lsof -ti:5000) 2>/dev/null
    sleep 2
fi

# PHPサーバー起動（バックグラウンド）
echo "🌐 PHPサーバー起動中..."
php -S localhost:8080 -t . > logs/php_server.log 2>&1 &
PHP_PID=$!
echo "✅ PHPサーバー起動完了 (PID: $PHP_PID)"

# 少し待機
sleep 3

# Phase 2 統合APIサーバー起動
echo ""
echo "🚀 Phase 2 統合APIサーバー起動中..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Python統合サーバー起動
python3 shipping_calculation/start_phase2_system.py &
PYTHON_PID=$!

echo ""
echo "🎯 === Phase 2 完全統合システム起動完了 ==="
echo ""
echo "🌐 フロントエンド: http://localhost:8080"
echo "📱 API サーバー: 自動検出ポート（通常5001または5000）"
echo ""
echo "🔧 === Phase 2 新機能利用手順 ==="
echo "1. http://localhost:8080 にアクセス"
echo "2. 「送料計算」タブをクリック"
echo "3. 「USA基準送料設定」でUSA送料内包を確認"
echo "4. 「eloji CSV管理」でCSVアップロード"
echo "5. 「為替リスクマージン」で安全レート設定"
echo "6. 「統合計算テスト」で全機能テスト"
echo "7. 実データに適用して本格運用開始"
echo ""
echo "🎉 === Gemini AI アドバイス完全実装版 ==="
echo "• USA基準送料内包価格戦略"
echo "• eloji CSV自動同期システム" 
echo "• 動的為替リスク安全マージン"
echo "• 統合送料最適化計算"
echo "• 自動データベース管理"
echo ""
echo "💡 問題発生時は Ctrl+C で停止してください"
echo "📋 詳細ログは logs/ フォルダで確認可能"
echo ""

# サーバー監視・終了処理
cleanup() {
    echo ""
    echo "🛑 Phase 2 統合システム停止中..."
    
    if kill -0 $PHP_PID 2>/dev/null; then
        echo "🔄 PHPサーバー停止中..."
        kill $PHP_PID
    fi
    
    if kill -0 $PYTHON_PID 2>/dev/null; then
        echo "🔄 Python統合サーバー停止中..."
        kill $PYTHON_PID
    fi
    
    # 残存プロセス強制終了
    pkill -f "php -S localhost:8080" 2>/dev/null
    pkill -f "start_phase2_system.py" 2>/dev/null
    
    echo "✅ Phase 2 統合システム停止完了"
    exit 0
}

# シグナルハンドラー設定
trap cleanup SIGINT SIGTERM

# サーバー稼働状態確認
sleep 5
echo "🔍 サーバー稼働状態確認中..."

# PHPサーバー確認
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ PHPフロントエンドサーバー: 正常稼働"
else
    echo "⚠️ PHPフロントエンドサーバー: 応答なし"
fi

# Python APIサーバー確認（ポート自動検出）
API_PORT=""
for port in 5001 5000 5002; do
    if curl -s "http://localhost:$port/system_status_phase2" > /dev/null; then
        API_PORT=$port
        echo "✅ Phase 2 統合APIサーバー: 正常稼働 (ポート: $port)"
        break
    fi
done

if [ -z "$API_PORT" ]; then
    echo "⚠️ Phase 2 統合APIサーバー: ポート検出失敗"
    echo "🔄 手動確認: http://localhost:5001/system_status_phase2"
fi

echo ""
echo "🎊 === Phase 2 送料計算システム準備完了 ==="
echo "📲 ブラウザで http://localhost:8080 にアクセスしてください"
echo ""

# 無限待機（Ctrl+C まで）
while true; do
    sleep 60
    # サーバー生存確認（1分ごと）
    if ! kill -0 $PHP_PID 2>/dev/null; then
        echo "⚠️ PHPサーバーが停止しました。再起動中..."
        php -S localhost:8080 -t . > logs/php_server.log 2>&1 &
        PHP_PID=$!
    fi
    
    if ! kill -0 $PYTHON_PID 2>/dev/null; then
        echo "⚠️ Python統合サーバーが停止しました。再起動中..."
        python3 shipping_calculation/start_phase2_system.py &
        PYTHON_PID=$!
    fi
done
