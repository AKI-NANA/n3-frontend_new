#!/bin/bash

echo "=== PostgreSQL状態確認スクリプト ==="

# PostgreSQLの状態確認
echo "1. PostgreSQLサービス状態確認:"
if command -v brew &> /dev/null; then
    echo "Homebrewでの状態:"
    brew services list | grep postgresql
    
    echo -e "\n2. PostgreSQL起動を試行:"
    brew services start postgresql
    
    echo -e "\n3. 起動後の状態確認:"
    brew services list | grep postgresql
else
    echo "Homebrewが見つかりません。手動でPostgreSQLの状態を確認してください。"
fi

echo -e "\n4. データベース接続テスト:"
php -r "
try {
    \$pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'postgres', 'Kn240914');
    echo '✅ データベース接続成功\n';
    
    \$stmt = \$pdo->query('SELECT COUNT(*) as total FROM yahoo_scraped_products');
    \$count = \$stmt->fetch()['total'];
    echo '📊 レコード数: ' . \$count . ' 件\n';
    
    \$stmt = \$pdo->query('SELECT COUNT(*) as unlisted FROM yahoo_scraped_products WHERE (ebay_item_id IS NULL OR ebay_item_id = \'\')');
    \$unlisted = \$stmt->fetch()['unlisted'];
    echo '📦 未出品データ: ' . \$unlisted . ' 件\n';
    
} catch (Exception \$e) {
    echo '❌ データベース接続失敗: ' . \$e->getMessage() . '\n';
    echo '💡 PostgreSQLサービスが起動していない可能性があります\n';
}
"

echo -e "\n=== 確認完了 ===";
