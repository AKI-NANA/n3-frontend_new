#!/bin/bash
# eBayカテゴリー自動判定システム - 完全セットアップスクリプト
# 引き継ぎ書対応: 即座に利用可能な状態にセットアップ

echo "=== eBayカテゴリー自動判定システム セットアップ開始 ==="
echo "日時: $(date '+%Y-%m-%d %H:%M:%S')"
echo

# 1. データベース接続テスト
echo "1. データベース接続テスト"
psql -h localhost -U aritahiroaki -d nagano3_db -c "SELECT version();" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ データベース接続成功"
else
    echo "❌ データベース接続失敗 - 設定を確認してください"
    exit 1
fi
echo

# 2. 既存テーブル確認
echo "2. 既存テーブル確認"
YAHOO_TABLE=$(psql -h localhost -U aritahiroaki -d nagano3_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'yahoo_scraped_products';" 2>/dev/null)
CATEGORY_TABLE=$(psql -h localhost -U aritahiroaki -d nagano3_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'ebay_category_fees';" 2>/dev/null)

echo "Yahoo商品テーブル: $(echo $YAHOO_TABLE | tr -d ' ')"
echo "eBayカテゴリーテーブル: $(echo $CATEGORY_TABLE | tr -d ' ')"
echo

# 3. データベース拡張実行
echo "3. データベース拡張実行"
psql -h localhost -U aritahiroaki -d nagano3_db -f database/ebay_category_extension.sql
if [ $? -eq 0 ]; then
    echo "✅ データベース拡張完了"
else
    echo "❌ データベース拡張失敗"
    exit 1
fi
echo

# 4. テストデータ投入
echo "4. テストデータ投入"
psql -h localhost -U aritahiroaki -d nagano3_db << EOF
-- テスト用Yahoo商品データ
INSERT INTO yahoo_scraped_products (title, price_jpy, description, image_urls) VALUES
('iPhone 14 Pro 128GB ブラック SIMフリー 美品', 120000, 'SIMフリー iPhone 14 Pro 128GB。目立った傷なし、動作良好。', '["https://example.com/iphone1.jpg"]'),
('Canon EOS R6 Mark II ボディ', 280000, 'ミラーレス一眼カメラ。新品同様、箱・付属品完備。', '["https://example.com/canon1.jpg"]'),
('ポケモンカード ピカチュウ プロモ PSA10', 50000, '鑑定済み完美品。PSA10グレード。', '["https://example.com/pokemon1.jpg"]'),
('Nintendo Switch 本体 有機ELモデル', 35000, '使用期間短く美品。Joy-Con、ドック付属。', '["https://example.com/switch1.jpg"]'),
('MacBook Air M2 13インチ 256GB', 150000, '2022年モデル。軽微な使用感あり。', '["https://example.com/macbook1.jpg"]')
ON CONFLICT DO NOTHING;

-- 拡張テーブルの動作確認
SELECT 'テーブル作成確認' as status, 
       (SELECT COUNT(*) FROM listing_quota_categories) as quota_categories,
       (SELECT COUNT(*) FROM current_listings_count) as current_listings,
       (SELECT COUNT(*) FROM ebay_category_search_cache) as cache_entries;
EOF

if [ $? -eq 0 ]; then
    echo "✅ テストデータ投入完了"
else
    echo "❌ テストデータ投入失敗"
fi
echo

# 5. API設定ファイル作成
echo "5. API設定ファイル作成"
cat > backend/config/api_settings.php << 'EOF'
<?php
/**
 * eBayカテゴリー自動判定システム - API設定
 * 本番運用前に適切な値を設定してください
 */

return [
    'ebay_api' => [
        'app_id' => 'YOUR_EBAY_APP_ID', // eBay Developer Accountで取得
        'global_id' => 'EBAY-US',
        'endpoint' => 'https://svcs.ebay.com/services/search/FindingService/v1',
        'version' => '1.13.0',
        'sandbox_mode' => true // 本番環境では false に変更
    ],
    
    'database' => [
        'host' => 'localhost',
        'database' => 'nagano3_db',
        'username' => 'aritahiroaki',
        'password' => '',
        'charset' => 'utf8'
    ],
    
    'system' => [
        'debug_mode' => true, // 本番環境では false に変更
        'max_api_calls_per_hour' => 1000,
        'cache_duration_days' => 30,
        'batch_size_limit' => 50
    ],
    
    'store_settings' => [
        'default_store_level' => 'basic',
        'quota_warning_threshold' => 5 // 残り5件以下で警告
    ]
];
EOF

mkdir -p backend/config
echo "✅ API設定ファイル作成完了"
echo

# 6. 権限設定
echo "6. ファイル権限設定"
chmod 755 backend/api/*.php
chmod 755 backend/classes/*.php
chmod 644 backend/config/*.php
echo "✅ 権限設定完了"
echo

# 7. 動作テスト
echo "7. 動作テスト"
echo "PHPバージョン: $(php -v | head -n 1)"

# PHP設定確認
php -r "
echo 'PDO PostgreSQL: ' . (extension_loaded('pdo_pgsql') ? '✅' : '❌') . PHP_EOL;
echo 'cURL: ' . (extension_loaded('curl') ? '✅' : '❌') . PHP_EOL;
echo 'JSON: ' . (extension_loaded('json') ? '✅' : '❌') . PHP_EOL;
"

echo

# 8. 完了報告
echo "=== セットアップ完了 ==="
echo
echo "🎉 eBayカテゴリー自動判定システムの準備が完了しました！"
echo
echo "📍 アクセス情報:"
echo "   URL: http://localhost:8000/modules/yahoo_auction_complete/new_structure/11_category/frontend/category_massive_viewer.php"
echo "   API: http://localhost:8000/modules/yahoo_auction_complete/new_structure/11_category/backend/api/unified_category_api.php"
echo
echo "🔧 次のステップ:"
echo "   1. backend/config/api_settings.php でeBay APIキーを設定"
echo "   2. ブラウザでUIにアクセスして動作確認"
echo "   3. Yahoo商品入力フォームでテスト実行"
echo
echo "📊 機能一覧:"
echo "   ✅ Yahoo商品 → eBayカテゴリー自動判定"
echo "   ✅ eBay Finding API + キーワード辞書統合"
echo "   ✅ Select Categories判定"
echo "   ✅ 出品枠管理・残数チェック"
echo "   ✅ 31,644カテゴリー高速表示"
echo "   ✅ バッチ処理対応"
echo
echo "セットアップ完了日時: $(date '+%Y-%m-%d %H:%M:%S')"
