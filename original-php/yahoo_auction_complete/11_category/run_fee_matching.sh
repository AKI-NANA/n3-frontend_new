#!/bin/bash
# eBay手数料データベース格納（サンプルデータ対応版）

echo "🏷️ eBay手数料データベース格納開始"
echo "=================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CSV_FILE="$SCRIPT_DIR/2024_利益計算表 最新  Category.csv"

# CSVファイル確認
if [ ! -f "$CSV_FILE" ]; then
    echo "⚠️  CSVファイルが見つかりません"
    echo "📊 サンプルデータで実行します"
    
    # サンプルCSVファイル作成
    cat > "$CSV_FILE" << 'EOF'
CategoryID,Category Path,FVF
1,Books & Magazines > Fiction Books,15.30%
2,Books & Magazines > Non-Fiction,15.30%
3,Movies & TV > DVDs & Blu-ray Discs,15.30%
4,Movies & TV > VHS Tapes,15.30%
5,Music > CDs,15.30%
6,Music > Vinyl Records,15.30%
7,Clothing Shoes & Accessories > Women > Tops,13.60%
8,Clothing Shoes & Accessories > Men > Shirts,13.60%
9,Clothing Shoes & Accessories > Women > Shoes,13.60%
10,Jewelry & Watches > Fine Jewelry > Rings,15.00%
11,Jewelry & Watches > Watches > Wristwatches,15.00%
12,Electronics > Cell Phones & Accessories,13.60%
13,Electronics > Computers & Tablets,13.60%
14,Coins & Paper Money > Coins > World,13.25%
15,Coins & Paper Money > Paper Money,13.25%
16,Musical Instruments & Gear > Guitars & Basses,6.70%
17,Musical Instruments & Gear > Pro Audio Equipment,6.70%
18,Business & Industrial > Heavy Equipment,3.00%
19,Business & Industrial > Restaurant & Food Service,3.00%
20,Home & Garden > Kitchen Dining & Bar,13.60%
21,Toys & Hobbies > Action Figures,13.60%
22,Collectibles > Trading Cards,13.25%
23,Sports Mem Cards & Fan Shop > Sports Trading Cards,13.25%
24,Art > Paintings,13.60%
25,Antiques > Furniture,13.60%
EOF
    echo "✅ サンプルCSV作成完了: 25カテゴリー"
else
    echo "✅ CSVファイル発見: $(basename "$CSV_FILE")"
fi

echo "📊 CSVファイル情報:"
wc -l "$CSV_FILE"

# データベース接続テスト
echo ""
echo "🔌 データベース接続テスト"
if psql -h localhost -U aritahiroaki -d nagano3_db -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ データベース接続OK"
else
    echo "❌ データベース接続失敗"
    echo "PostgreSQLを起動してください: brew services start postgresql"
    exit 1
fi

# PHP実行
echo ""
echo "🚀 手数料マッチング処理実行"
cd "$SCRIPT_DIR"

php << 'PHP_CODE'
<?php
$feeText = '
**Most categories**
* 13.6% on total amount of the sale up to $7,500 calculated per item
* 2.35% on the portion of the sale over $7,500

**Books & Magazines**
**Movies & TV**
**Music**
* 15.3% on total amount of the sale up to $7,500 calculated per item
* 2.35% on the portion of the sale over $7,500

**Coins & Paper Money**
* 13.25% on total amount of the sale up to $7,500 calculated per item
* 2.35% on the portion of the sale over $7,500

**Clothing, Shoes & Accessories**
* 13.6% if total amount of the sale is $2,000 or less, calculated per item
* 9% if total amount of the sale is over $2,000, calculated per item

**Jewelry & Watches**
* 15% if total amount of the sale is $5,000 or less, calculated per item
* 9% if total amount of the sale is over $5,000, calculated per item

**Musical Instruments & Gear**
* 6.7% on total amount of the sale up to $7,500 calculated per item
* 2.35% on the portion of the sale over $7,500

**Business & Industrial**
* 3% on total amount of the sale up to $15,000 calculated per item
* 0.5% on the portion of the sale over $15,000
';

require_once 'fee_matcher.php';

try {
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $matcher = new EbayFeeTextMatcher($pdo);
    $result = $matcher->parseAndMatch($feeText, '2024_利益計算表 最新  Category.csv');
    
    if ($result['success']) {
        echo "✅ 処理完了!\n";
        echo "📊 総カテゴリー数: {$result['total_categories']}\n";
        echo "🎯 マッチ数: {$result['matched']}\n";
        
        if ($result['total_categories'] > 0) {
            echo "📈 成功率: " . round(($result['matched'] / $result['total_categories']) * 100, 1) . "%\n";
        }
        
        // データベース確認
        $stmt = $pdo->query('SELECT COUNT(*) FROM fee_matches');
        $count = $stmt->fetchColumn();
        echo "💾 データベース格納済み: {$count}件\n";
        
    } else {
        echo "❌ 処理失敗\n";
    }
    
} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
    exit(1);
}
PHP_CODE

echo ""
echo "🔍 格納データ確認"
psql -h localhost -U aritahiroaki -d nagano3_db -c "
    SELECT 
        '総件数' as 項目, COUNT(*)::text as 値 
    FROM fee_matches
    UNION ALL
    SELECT 
        '平均信頼度' as 項目, ROUND(AVG(confidence), 1)::text || '%' as 値
    FROM fee_matches
    UNION ALL
    SELECT 
        '高信頼度(80%+)' as 項目, COUNT(*)::text as 値
    FROM fee_matches WHERE confidence >= 80;
"

echo ""
echo "📋 格納データサンプル"
psql -h localhost -U aritahiroaki -d nagano3_db -c "
    SELECT 
        LEFT(category_path, 40) as カテゴリー,
        fee_percent as 手数料率,
        confidence as 信頼度
    FROM fee_matches 
    ORDER BY confidence DESC 
    LIMIT 10;
"

echo ""
echo "🎉 データベース格納完了!"
echo "=================================="
echo ""
echo "📋 次のステップ:"
echo "1. Webツールで確認: open fee_matching_tool.html"  
echo "2. データベース直接確認: psql -h localhost -U aritahiroaki -d nagano3_db"
echo "3. 実際のCSVファイルがある場合は、上記のサンプルファイルを置き換えて再実行"