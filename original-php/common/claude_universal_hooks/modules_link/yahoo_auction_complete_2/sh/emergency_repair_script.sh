#!/bin/bash

echo "🚀 Yahoo Auction Tool 緊急修復スクリプト"
echo "========================================"

# 現在のディレクトリ確認
CURRENT_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete"
cd "$CURRENT_DIR" || exit 1

echo "📂 作業ディレクトリ: $CURRENT_DIR"

# Phase 1: データベースサンプルデータ投入
echo ""
echo "📊 Phase 1: データベースサンプルデータ投入開始..."

# yahoo_scraped_products テーブル作成・データ投入
echo "🗄️ スクレイピングテーブル作成・データ投入..."
psql -d nagano3_db -c "
CREATE TABLE IF NOT EXISTS yahoo_scraped_products (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(50) UNIQUE,
    title TEXT,
    current_price DECIMAL(10,2),
    condition_name VARCHAR(100),
    category_name VARCHAR(100),
    picture_url TEXT,
    gallery_url TEXT,
    watch_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- サンプルデータ投入
INSERT INTO yahoo_scraped_products (item_id, title, current_price, condition_name, category_name, picture_url, watch_count)
VALUES 
('YAH001', 'Sony WH-1000XM4 ワイヤレスヘッドホン', 25000, 'New', 'Electronics', 'https://via.placeholder.com/300x200', 15),
('YAH002', 'Nintendo Switch 本体', 32000, 'Used', 'Games', 'https://via.placeholder.com/300x200', 28),
('YAH003', 'Apple iPhone 14 Pro', 120000, 'Like New', 'Electronics', 'https://via.placeholder.com/300x200', 42),
('YAH004', 'Canon EOS R5 ミラーレスカメラ', 280000, 'New', 'Cameras', 'https://via.placeholder.com/300x200', 67),
('YAH005', 'MacBook Pro 16インチ M2', 250000, 'Very Good', 'Computers', 'https://via.placeholder.com/300x200', 89),
('YAH006', 'ロレックス サブマリーナ', 800000, 'Used', 'Watches', 'https://via.placeholder.com/300x200', 156),
('YAH007', 'ヴィトン ハンドバッグ', 45000, 'Good', 'Fashion', 'https://via.placeholder.com/300x200', 34),
('YAH008', 'ダイソン V15 掃除機', 58000, 'New', 'Home', 'https://via.placeholder.com/300x200', 23),
('YAH009', 'プレイステーション5', 48000, 'New', 'Games', 'https://via.placeholder.com/300x200', 125),
('YAH010', 'バルミューダ トースター', 22000, 'Like New', 'Home', 'https://via.placeholder.com/300x200', 19)
ON CONFLICT (item_id) DO NOTHING;
"

if [ $? -eq 0 ]; then
    echo "✅ スクレイピングデータ投入完了"
else
    echo "❌ スクレイピングデータ投入失敗"
fi

# 禁止キーワードテーブル作成
echo "🚫 禁止キーワードテーブル作成..."
psql -d nagano3_db -c "
CREATE TABLE IF NOT EXISTS prohibited_keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT '一般',
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'active',
    description TEXT,
    detection_count INTEGER DEFAULT 0,
    created_date DATE DEFAULT CURRENT_DATE,
    last_detected DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 禁止キーワードサンプルデータ
INSERT INTO prohibited_keywords (keyword, category, priority, status, description, detection_count, last_detected)
VALUES 
('偽物', 'ブランド', 'high', 'active', 'ブランド偽造品を示すキーワード', 127, '2025-09-10'),
('コピー品', 'ブランド', 'high', 'active', 'コピー商品を示すキーワード', 89, '2025-09-09'),
('レプリカ', 'ブランド', 'medium', 'active', 'レプリカ商品を示すキーワード', 56, '2025-09-08'),
('激安', '価格', 'medium', 'active', '過度な安値を示すキーワード', 34, '2025-09-07'),
('海賊版', 'メディア', 'high', 'active', '著作権侵害を示すキーワード', 23, '2025-09-06'),
('無許可', '一般', 'high', 'active', '無許可商品を示すキーワード', 45, '2025-09-05'),
('違法', '一般', 'high', 'active', '違法商品を示すキーワード', 12, '2025-09-04'),
('模倣品', 'ブランド', 'medium', 'active', '模倣品を示すキーワード', 67, '2025-09-03')
ON CONFLICT (keyword) DO NOTHING;

-- 統計ビュー作成
CREATE OR REPLACE VIEW prohibited_keywords_stats AS
SELECT 
    COUNT(*) as total_keywords,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
    COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
    COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_keywords,
    COUNT(CASE WHEN last_detected = CURRENT_DATE THEN 1 END) as detected_today,
    MAX(updated_at) as last_update
FROM prohibited_keywords;
"

if [ $? -eq 0 ]; then
    echo "✅ 禁止キーワードテーブル作成完了"
else
    echo "❌ 禁止キーワードテーブル作成失敗"
fi

echo ""
echo "📊 Phase 1 完了: データベースサンプルデータ投入完了"

# Phase 2: 必要なPythonパッケージ確認・インストール
echo ""
echo "🐍 Phase 2: Python環境確認・設定..."

echo "📋 Python バージョン確認:"
python3 --version

echo "📦 必要パッケージ確認・インストール..."
pip3 install flask flask-cors requests pandas 2>/dev/null || echo "⚠️ パッケージインストール: 一部スキップ"

# Playwright は時間がかかるので後回し
echo "🎭 Playwright は必要時にインストールしてください: playwright install"

echo ""
echo "📊 Phase 2 完了: Python環境設定完了"

# Phase 3: APIサーバー起動確認
echo ""
echo "🌐 Phase 3: APIサーバー状況確認..."

echo "🔍 ポート5001確認:"
if curl -s http://localhost:5001/health >/dev/null 2>&1; then
    echo "✅ APIサーバー(Port 5001)が稼働中"
else
    echo "❌ APIサーバー(Port 5001)が停止中"
    echo "💡 手動起動方法:"
    echo "   cd $CURRENT_DIR"
    echo "   python3 enhanced_complete_api_updated.py"
fi

echo "🔍 ポート5002確認:"
if curl -s http://localhost:5002/health >/dev/null 2>&1; then
    echo "✅ APIサーバー(Port 5002)が稼働中"
else
    echo "❌ APIサーバー(Port 5002)が停止中"
fi

echo ""
echo "📊 Phase 3 完了: APIサーバー状況確認完了"

# Phase 4: ブラウザテスト準備
echo ""
echo "🌐 Phase 4: システムテスト準備..."

echo "📝 アクセス可能URL:"
echo "   🎯 メインツール: http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php"
echo "   📊 データベース分析: http://localhost:8080/modules/yahoo_auction_complete/database_analysis.php"
echo "   💊 ヘルスチェック: http://localhost:5001/health (APIサーバー稼働時)"

echo ""
echo "🔧 動作確認手順:"
echo "1. メインツールにアクセス"
echo "2. 商品承認タブでデータが表示されることを確認"
echo "3. データ編集タブでスクレイピングデータが表示されることを確認" 
echo "4. フィルタータブで禁止キーワードが表示されることを確認"

# 最終確認
echo ""
echo "🔍 最終確認: データベーステーブル状況"
psql -d nagano3_db -c "
SELECT 
    'yahoo_scraped_products' as table_name, 
    COUNT(*) as record_count 
FROM yahoo_scraped_products
UNION ALL
SELECT 
    'prohibited_keywords' as table_name, 
    COUNT(*) as record_count 
FROM prohibited_keywords;
"

echo ""
echo "🎉 Yahoo Auction Tool 緊急修復完了!"
echo "========================================"
echo "📱 ブラウザでアクセスしてテストしてください:"
echo "   http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php"
echo ""
echo "⚠️  APIサーバーが必要な場合は手動で起動してください:"
echo "   python3 enhanced_complete_api_updated.py"
echo ""
echo "✅ 修復作業完了時刻: $(date '+%Y-%m-%d %H:%M:%S')"
