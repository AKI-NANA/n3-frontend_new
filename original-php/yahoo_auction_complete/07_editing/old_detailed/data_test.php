<?php
/**
 * データ表示問題の診断スクリプト
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// データベース接続テスト
function testDatabaseConnection() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        echo "✅ データベース接続: 成功\n";
        return $pdo;
        
    } catch (PDOException $e) {
        echo "❌ データベース接続: 失敗 - " . $e->getMessage() . "\n";
        return null;
    }
}

// テーブル存在確認
function checkTableExists($pdo) {
    try {
        $sql = "SELECT table_name FROM information_schema.tables WHERE table_name = 'yahoo_scraped_products'";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch();
        
        if ($result) {
            echo "✅ テーブル yahoo_scraped_products: 存在\n";
            return true;
        } else {
            echo "❌ テーブル yahoo_scraped_products: 存在しない\n";
            return false;
        }
        
    } catch (Exception $e) {
        echo "❌ テーブル確認エラー: " . $e->getMessage() . "\n";
        return false;
    }
}

// データ件数確認
function checkDataCount($pdo) {
    try {
        // 全データ件数
        $sql = "SELECT COUNT(*) as total FROM yahoo_scraped_products";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $total = $stmt->fetch()['total'];
        
        // 未出品データ件数
        $sql = "SELECT COUNT(*) as unlisted FROM yahoo_scraped_products WHERE (ebay_item_id IS NULL OR ebay_item_id = '')";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $unlisted = $stmt->fetch()['unlisted'];
        
        echo "📊 データ件数:\n";
        echo "   - 全データ: {$total} 件\n";
        echo "   - 未出品データ: {$unlisted} 件\n";
        
        return ['total' => $total, 'unlisted' => $unlisted];
        
    } catch (Exception $e) {
        echo "❌ データ件数確認エラー: " . $e->getMessage() . "\n";
        return null;
    }
}

// サンプルデータ取得
function getSampleData($pdo) {
    try {
        $sql = "SELECT 
                    id,
                    source_item_id,
                    active_title,
                    price_jpy,
                    active_image_url,
                    created_at
                FROM yahoo_scraped_products 
                WHERE (ebay_item_id IS NULL OR ebay_item_id = '')
                ORDER BY created_at DESC 
                LIMIT 3";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($samples) > 0) {
            echo "📋 サンプルデータ:\n";
            foreach ($samples as $sample) {
                echo "   ID: {$sample['id']}, Title: " . substr($sample['active_title'] ?? 'N/A', 0, 30) . "...\n";
            }
        } else {
            echo "⚠️  未出品データが見つかりません\n";
        }
        
        return $samples;
        
    } catch (Exception $e) {
        echo "❌ サンプルデータ取得エラー: " . $e->getMessage() . "\n";
        return [];
    }
}

// JSON API テスト
function testJsonApi($pdo) {
    try {
        $sql = "SELECT 
                    id,
                    source_item_id as item_id,
                    COALESCE(active_title, 'タイトルなし') as title,
                    price_jpy as price,
                    COALESCE(active_image_url, 'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image') as picture_url
                FROM yahoo_scraped_products 
                WHERE (ebay_item_id IS NULL OR ebay_item_id = '')
                ORDER BY created_at DESC 
                LIMIT 5";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $response = [
            'success' => true,
            'data' => [
                'data' => $data,
                'total' => count($data),
                'page' => 1,
                'limit' => 5
            ],
            'message' => 'APIテスト成功',
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        echo "🔧 JSON API レスポンス:\n";
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
        
        return $response;
        
    } catch (Exception $e) {
        echo "❌ JSON API テストエラー: " . $e->getMessage() . "\n";
        return null;
    }
}

// WEBアクセステスト用のaction処理
if (isset($_GET['action']) && $_GET['action'] === 'test_api') {
    header('Content-Type: application/json; charset=utf-8');
    
    $pdo = testDatabaseConnection();
    if ($pdo) {
        $response = testJsonApi($pdo);
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['success' => false, 'message' => 'データベース接続失敗'], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// コマンドライン実行時のテスト
echo "=== Yahoo Auction データ表示問題 診断スクリプト ===\n\n";

echo "1. データベース接続テスト\n";
$pdo = testDatabaseConnection();

if ($pdo) {
    echo "\n2. テーブル存在確認\n";
    $tableExists = checkTableExists($pdo);
    
    if ($tableExists) {
        echo "\n3. データ件数確認\n";
        $counts = checkDataCount($pdo);
        
        echo "\n4. サンプルデータ確認\n";
        $samples = getSampleData($pdo);
        
        echo "\n5. JSON API テスト\n";
        $apiTest = testJsonApi($pdo);
        
        if ($counts && $counts['unlisted'] > 0) {
            echo "\n✅ 診断結果: データは存在します。表示されない原因は他にあります。\n";
            echo "\n次の手順:\n";
            echo "1. PHPサーバーを起動: php -S localhost:8000\n";
            echo "2. ブラウザでテスト: http://localhost:8000/data_test.php?action=test_api\n";
            echo "3. JavaScriptコンソールでエラーを確認\n";
        } else {
            echo "\n⚠️  診断結果: 未出品データが存在しません。\n";
            echo "スクレイピングまたはデータインポートが必要です。\n";
        }
    }
} else {
    echo "\n❌ データベースに接続できません。PostgreSQLサービスを確認してください。\n";
}

echo "\n=== 診断完了 ===\n";
?>