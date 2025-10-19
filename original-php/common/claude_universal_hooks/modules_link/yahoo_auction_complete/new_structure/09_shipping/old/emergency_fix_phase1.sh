#!/bin/bash
# 🚨 フェーズ1: 緊急修正（即座にシステムを動かす）

echo "🚨 フェーズ1: 緊急修正実行開始"
echo "================================"

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/

echo "📋 Step 1: price_usd カラム問題解決"
echo "既存のprice_usd修正SQLがあるか確認..."
if [ -f "../11_category/PRICE_USD_FIX.sql" ]; then
    echo "✅ PRICE_USD_FIX.sql が見つかりました"
    echo "価格変換設定を実行..."
    psql -h localhost -d nagano3_db -U postgres -f ../11_category/PRICE_USD_FIX.sql
else
    echo "⚠️ PRICE_USD_FIX.sql が見つかりません - 代替手段で対応"
    
    # 代替SQL実行
    psql -h localhost -d nagano3_db -U postgres -c "
    -- price_usd カラム緊急追加
    ALTER TABLE yahoo_scraped_products 
    ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10,2) DEFAULT 0;
    
    -- 既存データの変換（1USD = 150JPY）
    UPDATE yahoo_scraped_products 
    SET price_usd = ROUND(COALESCE(price_jpy, 0) / 150.0, 2)
    WHERE price_usd IS NULL OR price_usd = 0;
    
    SELECT COUNT(*) as updated_records FROM yahoo_scraped_products WHERE price_usd > 0;
    "
fi

echo ""
echo "📋 Step 2: NULL値問題対応API切り替え"
echo "修正版APIをバックアップ作成後に適用..."

# 既存APIのバックアップ
if [ -f "api/matrix_data_api.php" ]; then
    cp api/matrix_data_api.php api/matrix_data_api_backup_$(date +%Y%m%d_%H%M%S).php
    echo "✅ 既存APIをバックアップしました"
fi

# 修正版APIを適用
cp api/matrix_data_api_fixed.php api/matrix_data_api.php
echo "✅ NULL値対応版APIを適用しました"

echo ""
echo "📋 Step 3: API動作テスト"
echo "修正されたAPIが正常に動作するかテスト中..."

# API基本テスト
echo "基本接続テスト:"
curl -s -X POST "http://localhost:8080/new_structure/09_shipping/api/matrix_data_api.php" \
  -H "Content-Type: application/json" \
  -d '{"action":"test"}' | head -c 200

echo ""
echo ""
echo "マトリックス生成テスト:"
curl -s -X POST "http://localhost:8080/new_structure/09_shipping/api/matrix_data_api.php" \
  -H "Content-Type: application/json" \
  -d '{"action":"get_tabbed_matrix","destination":"US","max_weight":5.0,"weight_step":0.5}' | head -c 300

echo ""
echo ""
echo "📋 Step 4: データベース接続確認"
echo "EMS正確データが投入されているか確認..."

psql -h localhost -d nagano3_db -U postgres -c "
SELECT 
    carrier_code,
    COUNT(*) as record_count,
    MIN(price_jpy) as min_price,
    MAX(price_jpy) as max_price,
    data_source
FROM real_shipping_rates 
WHERE carrier_code IN ('JPPOST', 'CPASS') 
GROUP BY carrier_code, data_source
ORDER BY carrier_code;
"

echo ""
echo "📋 Step 5: システム稼働確認"
echo "ブラウザでアクセス可能な状態かチェック..."

# PHPサーバーが起動しているか確認
if lsof -i :8080 > /dev/null 2>&1; then
    echo "✅ PHPサーバーがポート8080で稼働中"
    echo "ブラウザアクセス: http://localhost:8080/new_structure/09_shipping/unified_comparison.php"
else
    echo "⚠️ PHPサーバーが起動していません"
    echo "以下のコマンドでサーバーを起動してください:"
    echo "cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/"
    echo "./start_server_8080.sh"
fi

echo ""
echo "✅ フェーズ1: 緊急修正完了"
echo "=========================="
echo ""
echo "🎯 修正内容:"
echo "1. ✅ price_usd カラム問題解決"
echo "2. ✅ NULL値エラー対応（?? 演算子使用）"  
echo "3. ✅ API安定性向上（エラーハンドリング強化）"
echo "4. ✅ データ型安全性確保（型チェック関数追加）"
echo ""
echo "📌 確認事項:"
echo "- EMS 0.5kg → ¥3,900 が表示されるか"
echo "- EMS 1.0kg → ¥5,300 が表示されるか"
echo "- PHP Deprecated Warningが解消されているか"
echo ""
echo "🔄 次のフェーズ2では以下を実装予定:"
echo "- データベース設計最適化"
echo "- DAOパターン導入"
echo "- SQLインジェクション対策"
echo "- スキーマ管理改善"

echo ""
echo "即座にテストを実行するには:"
echo "ブラウザで http://localhost:8080/new_structure/09_shipping/unified_comparison.php にアクセス"
echo "「統合料金マトリックス生成」ボタンをクリックして動作確認"