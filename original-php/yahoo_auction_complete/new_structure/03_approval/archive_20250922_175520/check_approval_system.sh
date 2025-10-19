# メインプロジェクトの承認システムディレクトリに移動
cd ~/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/03_approval

echo "=== 現在の03_approvalディレクトリ内容確認 ==="
pwd
ls -la

echo -e "\n=== ファイルサイズと詳細情報 ==="
du -h *

echo -e "\n=== HTMLファイル確認 ==="
find . -name "*.html" -exec echo "ファイル: {}" \; -exec wc -l {} \;

echo -e "\n=== PHPファイル確認 ==="
find . -name "*.php" -exec echo "ファイル: {}" \; -exec wc -l {} \;

echo -e "\n=== JavaScriptファイル確認 ==="
find . -name "*.js" -exec echo "ファイル: {}" \; -exec wc -l {} \;

echo -e "\n=== CSSファイル確認 ==="
find . -name "*.css" -exec echo "ファイル: {}" \; -exec wc -l {} \;

echo -e "\n=== データベース接続テスト ==="
php -r "
try {
    \$pdo = new PDO('pgsql:host=localhost;port=5432;dbname=yahoo_auction_system', 'postgres', '');
    echo '✅ yahoo_auction_system DB接続成功\n';
    
    // テーブル確認
    \$stmt = \$pdo->query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \\'public\\'');
    \$tableCount = \$stmt->fetchColumn();
    echo \"テーブル数: \$tableCount\n\";
    
} catch(Exception \$e) {
    echo '❌ DB接続失敗: ' . \$e->getMessage() . '\n';
}
"

echo -e "\n=== approval.php動作テスト ==="
if [ -f "approval.php" ]; then
    php approval.php
else
    echo "⚠️ approval.phpが存在しません"
fi