#!/bin/bash
# eBay完全データ取得・構築スクリプト
# ファイル: build_complete_system.sh

echo "🚀 eBay完全統合システム構築開始"
echo "================================="
echo ""

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/11_category

# Step 1: API設定確認
echo "🔧 Step 1: eBay API設定確認"
echo "=========================="
php ebay_api_config.php

read -p "API設定は正しいですか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ API設定を完了してから再実行してください"
    echo ""
    echo "📝 設定方法:"
    echo "1. .envファイル作成:"
    echo "   EBAY_APP_ID=your_app_id"
    echo "   EBAY_DEV_ID=your_dev_id" 
    echo "   EBAY_CERT_ID=your_cert_id"
    echo "   EBAY_AUTH_TOKEN=your_auth_token"
    echo ""
    exit 1
fi

# Step 2: データベース基本セットアップ
echo ""
echo "💾 Step 2: データベース基本セットアップ"
echo "=================================="
chmod +x complete_database_setup.sh
./complete_database_setup.sh

if [ $? -ne 0 ]; then
    echo "❌ データベースセットアップ失敗"
    exit 1
fi

# Step 3: eBay全カテゴリー取得
echo ""
echo "📥 Step 3: eBay全カテゴリー取得"
echo "==========================="
echo "⚠️  これは時間がかかる処理です（20-30分）"
read -p "実行しますか？ (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 eBay API でカテゴリー取得開始..."
    php ebay_category_fetcher.php
    
    if [ $? -eq 0 ]; then
        echo "✅ カテゴリー取得完了"
    else
        echo "❌ カテゴリー取得失敗 - 手動で実行してください"
    fi
else
    echo "⏭️  カテゴリー取得をスキップしました"
fi

# Step 4: eBay手数料取得
echo ""
echo "💰 Step 4: eBay手数料取得"
echo "======================"
read -p "手数料データを取得しますか？ (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 eBay API で手数料取得開始..."
    php ebay_fee_fetcher.php
    
    if [ $? -eq 0 ]; then
        echo "✅ 手数料取得完了"
    else
        echo "❌ 手数料取得失敗 - 手動で実行してください"
    fi
else
    echo "⏭️  手数料取得をスキップしました"
fi

# Step 5: システム確認
echo ""
echo "🔍 Step 5: システム確認"
echo "==================="
echo "データベース状況確認中..."

psql -h localhost -U aritahiroaki -d nagano3_db << 'EOF'
SELECT 
    'ebay_categories_full' as table_name, COUNT(*) as record_count
FROM ebay_categories_full
UNION ALL
SELECT 
    'ebay_category_fees' as table_name, COUNT(*) as record_count  
FROM ebay_category_fees
UNION ALL
SELECT
    'category_keywords' as table_name, COUNT(*) as record_count
FROM category_keywords;
EOF

# Step 6: 統合UI確認
echo ""
echo "🎯 Step 6: 統合UI確認"
echo "=================="
echo "統合UIを起動しています..."

if command -v open >/dev/null 2>&1; then
    open "http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category/frontend/ebay_category_tool.php"
    echo "✅ ブラウザでUIが開きました"
else
    echo "📱 手動でブラウザを開いてください:"
    echo "http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category/frontend/ebay_category_tool.php"
fi

# 完了
echo ""
echo "🎉 eBay完全統合システム構築完了!"
echo "==============================="
echo ""
echo "📋 利用可能な機能:"
echo "  ✅ リアルタイムカテゴリー判定"
echo "  ✅ 学習型データベース"
echo "  ✅ 手数料自動計算"
echo "  ✅ バッチ処理対応"
echo "  ✅ 統計・分析機能"
echo ""
echo "🔧 個別実行コマンド:"
echo "  php ebay_category_fetcher.php  # カテゴリー再取得"
echo "  php ebay_fee_fetcher.php       # 手数料再取得" 
echo "  php ebay_api_config.php        # API設定確認"
echo ""
echo "🎯 次のステップ:"
echo "1. ブラウザでUIを開いてテスト実行"
echo "2. 商品データでカテゴリー判定テスト"
echo "3. 学習機能の動作確認"
echo ""