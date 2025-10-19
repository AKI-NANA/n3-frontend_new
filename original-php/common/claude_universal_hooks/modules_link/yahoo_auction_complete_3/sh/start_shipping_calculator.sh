#!/bin/bash

# 🚀 送料・利益計算エディター 統合システム起動スクリプト

echo "🚀 Yahoo→eBay統合ワークフロー + 送料計算エディター起動中..."

# カレントディレクトリ移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool

# 権限設定
echo "🔧 権限設定中..."
chmod +x shipping_calculation/*.py
chmod +x *.py

# 必要なディレクトリ作成
echo "📁 ディレクトリ作成中..."
mkdir -p yahoo_ebay_data/shipping_calculation
mkdir -p logs

# Python環境確認
echo "🐍 Python環境確認中..."
if command -v python3 &> /dev/null; then
    echo "✅ Python3 確認済み"
else
    echo "❌ Python3が見つかりません。インストールしてください。"
    exit 1
fi

# 必要なPythonパッケージのインストール確認
echo "📦 パッケージ確認中..."
python3 -c "import flask, pandas, requests, sqlite3" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ 必要なパッケージ確認済み"
else
    echo "📦 必要なパッケージをインストール中..."
    pip3 install flask pandas requests sqlite3
fi

# データベース初期化テスト
echo "🗄️ データベース初期化テスト中..."
python3 -c "
from shipping_calculation.shipping_rules_manager import ShippingRulesManager
from pathlib import Path
import sqlite3

try:
    data_dir = Path('yahoo_ebay_data')
    data_dir.mkdir(exist_ok=True)
    manager = ShippingRulesManager(data_dir / 'shipping_calculation')
    rules = manager.get_shipping_rules()
    print(f'✅ データベース初期化完了: {len(rules)}件のルール')
except Exception as e:
    print(f'❌ データベース初期化エラー: {e}')
"

# APIサーバー起動
echo "🌐 統合APIサーバー起動中..."
echo "メインURL: http://localhost:5001"
echo "===== 利用可能な機能 ====="
echo "• 送料ルール管理: /api/shipping/rules"
echo "• 計算テスト: /api/shipping/calculate"
echo "• バッチ計算: /api/shipping/calculate/batch"
echo "• 統計情報: /api/shipping/stats"
echo "============================="

# サーバー起動（バックグラウンド）
python3 shipping_calculation/integrated_api_server.py &
API_PID=$!

echo "📊 APIサーバーPID: $API_PID"

# PHPビルトインサーバー起動
echo "🌐 PHPサーバー起動中..."
echo "フロントエンドURL: http://localhost:8080"

# PHP起動（バックグラウンド）
php -S localhost:8080 index.php &
PHP_PID=$!

echo "📊 PHPサーバーPID: $PHP_PID"

# PID保存
echo $API_PID > .api_server.pid
echo $PHP_PID > .php_server.pid

echo ""
echo "🎉 送料・利益計算エディター起動完了！"
echo "📱 フロントエンド: http://localhost:8080"
echo "⚡ バックエンドAPI: http://localhost:5001"
echo ""
echo "🔄 停止方法:"
echo "kill $(cat .api_server.pid) $(cat .php_server.pid)"
echo "または Ctrl+C"

# サーバー稼働確認
sleep 3
echo "🔍 サーバー稼働確認中..."

# API接続テスト
if curl -s http://localhost:5001/api/shipping/rules > /dev/null; then
    echo "✅ APIサーバー稼働中"
else
    echo "❌ APIサーバー接続失敗"
fi

# PHP接続テスト  
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ PHPサーバー稼働中"
else
    echo "❌ PHPサーバー接続失敗"
fi

echo ""
echo "🎯 送料・利益計算エディター操作ガイド:"
echo "1. http://localhost:8080 にアクセス"
echo "2. 「送料計算」タブをクリック" 
echo "3. 基本設定→送料ルール→テスト計算の順で操作"
echo "4. 「全データ再計算」で既存商品に送料計算適用"
echo ""

# フォアグラウンドで待機
wait
