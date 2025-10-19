#!/bin/bash

echo "🔍 PostgreSQL データベーステーブル調査"
echo "=========================================="

# データベース接続テスト
echo "1. データベース接続テスト..."
psql -h localhost -U postgres -d nagano3_db -c "SELECT version();" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ データベース接続成功"
else
    echo "❌ データベース接続失敗 - パスワード入力が必要な可能性があります"
    echo "手動実行: psql -h localhost -U postgres -d nagano3_db"
    echo "パスワード: Kn240914"
fi

echo ""
echo "2. 全テーブル一覧..."
psql -h localhost -U postgres -d nagano3_db -c "
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
" 2>/dev/null

echo ""
echo "3. スクレイピング関連テーブル検索..."
psql -h localhost -U postgres -d nagano3_db -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%scrap%' 
       OR table_name LIKE '%yahoo%' 
       OR table_name LIKE '%auction%'
       OR table_name LIKE '%product%'
       OR table_name LIKE '%ebay%'
       OR table_name LIKE '%unified%')
ORDER BY table_name;
" 2>/dev/null

echo ""
echo "4. unified_scraped_ebay_products テーブル詳細..."
psql -h localhost -U postgres -d nagano3_db -c "
\d unified_scraped_ebay_products
" 2>/dev/null

echo ""
echo "5. テーブル行数確認..."
psql -h localhost -U postgres -d nagano3_db -c "
SELECT 
  'unified_scraped_ebay_products' as table_name,
  COUNT(*) as row_count,
  COUNT(*) FILTER (WHERE status IS NULL OR status = 'scraped') as unlisted_count,
  MAX(updated_at) as latest_update
FROM unified_scraped_ebay_products;
" 2>/dev/null

echo ""
echo "6. サンプルデータ表示..."
psql -h localhost -U postgres -d nagano3_db -c "
SELECT 
  product_id,
  SUBSTRING(COALESCE(active_title, title_jp, title_en), 1, 50) as title_short,
  COALESCE(active_price_jpy, price_jpy) as price_jpy,
  status,
  data_source_priority,
  updated_at
FROM unified_scraped_ebay_products 
ORDER BY updated_at DESC 
LIMIT 5;
" 2>/dev/null

echo ""
echo "✅ 調査完了"
echo ""
echo "🚀 手動実行コマンド（パスワード入力版）:"
echo "psql -h localhost -U postgres -d nagano3_db"
echo "パスワード: Kn240914"
echo ""
echo "📊 基本クエリ例:"
echo "SELECT COUNT(*) FROM unified_scraped_ebay_products;"
echo "SELECT * FROM unified_scraped_ebay_products LIMIT 3;"
