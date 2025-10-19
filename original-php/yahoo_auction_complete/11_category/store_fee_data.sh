#!/bin/bash
# eBay手数料データベース格納実行スクリプト
# ファイル: store_fee_data.sh

echo "🏷️ eBay手数料データベース格納開始"
echo "=================================="

# 現在のディレクトリ確認
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 実行ディレクトリ: $SCRIPT_DIR"

# CSVファイル確認
CSV_FILE="$SCRIPT_DIR/2024_利益計算表 最新  Category.csv"

if [ ! -f "$CSV_FILE" ]; then
    echo "❌ CSVファイルが見つかりません: $CSV_FILE"
    echo ""
    echo "📋 CSVファイルを配置してください:"
    echo "   cp 'path/to/2024_利益計算表 最新  Category.csv' '$SCRIPT_DIR/'"
    echo ""
    exit 1
fi

echo "✅ CSVファイル発見: $(basename "$CSV_FILE")"
echo "📊 CSVファイル情報:"
wc -l "$CSV_FILE"

# データベース接続テスト
echo ""
echo "🔌 データベース接続テスト"
if psql -h localhost -U aritahiroaki -d nagano3_db -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ データベース接続OK"
else
    echo "❌ データベース接続失敗"
    echo "データベース設定を確認してください"
    exit 1
fi

# PHP実行
echo ""
echo "🚀 手数料マッチング処理実行"
cd "$SCRIPT_DIR"

php -r "
// 手数料テキストデータ（実際のeBay公式データ）
\$feeText = '
**Most categories**
* 13.6% on total amount of the sale up to \$7,500 calculated per item
* 2.35% on the portion of the sale over \$7,500

**Books & Magazines**
**Movies & TV**
**Music**
* 15.3% on total amount of the sale up to \$7,500 calculated per item
* 2.35% on the portion of the sale over \$7,500

**Coins & Paper Money**
* 13.25% on total amount of the sale up to \$7,500 calculated per item
* 2.35% on the portion of the sale over \$7,500

**Clothing, Shoes & Accessories**
* 13.6% if total amount of the sale is \$2,000 or less, calculated per item
* 9% if total amount of the sale is over \$2,000, calculated per item

**Jewelry & Watches**
* 15% if total amount of the sale is \$5,000 or less, calculated per item
* 9% if total amount of the sale is over \$5,000, calculated per item

**Musical Instruments & Gear**
* 6.7% on total amount of the sale up to \$7,500 calculated per item
* 2.35% on the portion of the sale over \$7,500

**Business & Industrial**
* 3% on total amount of the sale up to \$15,000 calculated per item
* 0.5% on the portion of the sale over \$15,000
';

require_once 'fee_matcher.php';

try {
    \$pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    \$matcher = new EbayFeeTextMatcher(\$pdo);
    \$result = \$matcher->parseAndMatch(\$feeText, '2024_利益計算表 最新  Category.csv');
    
    if (\$result['success']) {
        echo \"✅ 処理完了!\\n\";
        echo \"📊 総カテゴリー数: {\$result['total_categories']}\\n\";
        echo \"🎯 マッチ数: {\$result['matched']}\\n\";
        echo \"📈 成功率: \" . round((\$result['matched'] / \$result['total_categories']) * 100, 1) . \"%\\n\";
        
        // データベース確認
        \$stmt = \$pdo->query('SELECT COUNT(*) FROM fee_matches');
        \$count = \$stmt->fetchColumn();
        echo \"💾 データベース格納済み: {\$count}件\\n\";
        
    } else {
        echo \"❌ 処理失敗\\n\";
    }
    
} catch (Exception \$e) {
    echo \"❌ エラー: \" . \$e->getMessage() . \"\\n\";
    exit(1);
}
"

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
    FROM fee_matches WHERE confidence >= 80
    UNION ALL
    SELECT
        '中信頼度(60-79%)' as 項目, COUNT(*)::text as 値  
    FROM fee_matches WHERE confidence >= 60 AND confidence < 80;
"

echo ""
echo "📋 サンプルデータ表示"
psql -h localhost -U aritahiroaki -d nagano3_db -c "
    SELECT 
        LEFT(category_path, 50) as カテゴリー,
        fee_percent as 手数料率,
        confidence as 信頼度
    FROM fee_matches 
    ORDER BY confidence DESC 
    LIMIT 10;
"

echo ""
echo "🎉 データベース格納完了!"
echo "=================================="