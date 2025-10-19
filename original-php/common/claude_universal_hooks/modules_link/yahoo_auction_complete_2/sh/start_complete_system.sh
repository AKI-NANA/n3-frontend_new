#!/bin/bash
# eBay完全出品システム起動スクリプト

echo "🚀 eBay完全出品システム起動中..."
echo "==========================================="

# 既存サーバー停止
echo "🔄 既存サーバー停止中..."
pkill -f "python.*ebay.*system"
pkill -f "python.*workflow.*server"
sleep 2

# ディレクトリ移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool

# 必要ディレクトリ作成
echo "📁 ディレクトリ準備中..."
mkdir -p yahoo_ebay_data
mkdir -p uploads

# 権限設定
chmod +x *.py
chmod +x *.sh

# 必要ライブラリ確認
echo "📦 ライブラリ確認中..."
python3 -c "import flask, pandas, requests" 2>/dev/null || {
    echo "⚠️  必要ライブラリをインストール中..."
    pip3 install flask pandas requests werkzeug
}

# システム起動
echo "🌟 完全版システム起動中..."
echo ""
echo "🎯 機能一覧:"
echo "✅ CSVドラッグ&ドロップアップロード"
echo "✅ 送料自動計算（重量・サイズベース）"
echo "✅ 出品禁止フィルター"
echo "✅ HTML説明文自動生成"
echo "✅ カテゴリ自動推定"
echo "✅ eBay API完全マッピング"
echo "✅ 出品前バリデーション"
echo ""

# メインシステム起動
python3 ebay_complete_system.py

echo ""
echo "🔚 システム終了しました"
