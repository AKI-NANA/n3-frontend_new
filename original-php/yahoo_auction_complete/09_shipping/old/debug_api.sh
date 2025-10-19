#!/bin/bash
# API詳細デバッグ - なぜAPIが応答しないかを確認

echo "🔍 API詳細デバッグ開始"
echo "===================="

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/

echo "📋 Step 1: APIファイル存在確認"
ls -la api/

echo ""
echo "📋 Step 2: PHP構文チェック"
php -l api/matrix_data_api.php

echo ""
echo "📋 Step 3: データベース接続テスト"
php -r "
try {
    \$pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'postgres', 'Kn240914');
    \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo '✅ データベース接続成功\n';
    
    \$stmt = \$pdo->prepare('SELECT COUNT(*) FROM real_shipping_rates WHERE data_source LIKE \"%csv_2025\"');
    \$stmt->execute();
    \$count = \$stmt->fetchColumn();
    echo '📊 CSVデータ件数: ' . \$count . \" 件\n\";
    
} catch (Exception \$e) {
    echo '❌ エラー: ' . \$e->getMessage() . \"\n\";
}
"

echo ""
echo "📋 Step 4: 簡単なAPIテスト"
echo "APIパス確認中..."

# シンプルなGETリクエスト
curl -v "http://localhost:8000/new_structure/09_shipping/api/matrix_data_api.php?action=test" 2>&1 | head -20

echo ""
echo "📋 Step 5: PHPサーバー確認"
echo "PHPサーバーが起動しているか確認:"
ps aux | grep php | grep -v grep

echo ""
echo "📋 Step 6: ポート8000確認"
echo "ポート8000でサーバーが起動しているか確認:"
lsof -i :8000

echo ""
echo "📋 Step 7: 代替APIテスト"
echo "直接PHPファイル実行テスト:"
cd api/
php -r "
\$_POST['action'] = 'get_tabbed_matrix';
\$_POST['destination'] = 'US';
\$_POST['max_weight'] = 5.0;
\$_POST['weight_step'] = 0.5;

// JSON入力をシミュレート
file_put_contents('php://input', json_encode([
    'action' => 'get_tabbed_matrix',
    'destination' => 'US', 
    'max_weight' => 5.0,
    'weight_step' => 0.5
]));

include 'matrix_data_api.php';
"

echo ""
echo "🔍 API詳細デバッグ完了"