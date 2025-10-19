<?php
/**
 * NAGANO-3 テストデータ作成・修復スクリプト (修正版)
 * ダッシュボードの動作確認用データを作成します
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>🛠️ NAGANO-3 テストデータ作成・修復 (修正版)</h1>";

// データベース接続
try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres"; 
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<p>✅ データベース接続成功</p>";
    
    // 1. workflowsテーブルの作成・修復
    echo "<h2>1. Workflowsテーブル作成・修復</h2>";
    
    $createWorkflowsTable = "
    CREATE TABLE IF NOT EXISTS workflows (
        id SERIAL PRIMARY KEY,
        yahoo_auction_id VARCHAR(255),
        product_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'processing',
        current_step INTEGER DEFAULT 1,
        next_step INTEGER,
        priority INTEGER DEFAULT 50,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    )";
    
    $pdo->exec($createWorkflowsTable);
    echo "<p>✅ Workflowsテーブル準備完了</p>";
    
    // インデックス作成
    $indexes = [
        "CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status)",
        "CREATE INDEX IF NOT EXISTS idx_workflows_current_step ON workflows(current_step)",
        "CREATE INDEX IF NOT EXISTS idx_workflows_priority ON workflows(priority DESC)",
        "CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at DESC)"
    ];
    
    foreach ($indexes as $indexSql) {
        $pdo->exec($indexSql);
    }
    echo "<p>✅ インデックス作成完了</p>";
    
    // 2. テストワークフローデータ作成 (修正版)
    echo "<h2>2. テストワークフローデータ作成</h2>";
    
    // 既存のテストデータをクリア
    $pdo->exec("DELETE FROM workflows WHERE yahoo_auction_id LIKE 'test_%'");
    
    $testWorkflows = [
        [
            'yahoo_auction_id' => 'test_auction_001',
            'status' => 'processing',
            'current_step' => 7,
            'priority' => 90,
            'data' => json_encode([
                'type' => 'approval_flow',
                'product_ids' => [1, 2, 3],
                'test_data' => true
            ])
        ],
        [
            'yahoo_auction_id' => 'test_auction_002', 
            'status' => 'approved',
            'current_step' => 8,
            'priority' => 50,
            'data' => json_encode([
                'type' => 'approval_flow',
                'product_ids' => [4, 5],
                'test_data' => true
            ])
        ],
        [
            'yahoo_auction_id' => 'test_auction_003',
            'status' => 'listed',
            'current_step' => 9,
            'priority' => 10,
            'data' => json_encode([
                'type' => 'approval_flow',
                'product_ids' => [6, 7, 8, 9],
                'test_data' => true
            ])
        ],
        [
            'yahoo_auction_id' => 'test_auction_004',
            'status' => 'failed',
            'current_step' => 5,
            'priority' => 70,
            'data' => json_encode([
                'type' => 'approval_flow',
                'product_ids' => [10],
                'error' => 'API connection timeout',
                'test_data' => true
            ])
        ]
    ];
    
    // 修正されたINSERT文（パラメータ数を正確に）
    $insertSql = "
    INSERT INTO workflows (yahoo_auction_id, status, current_step, priority, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, NOW() - INTERVAL '1 hour' * ?, NOW() - INTERVAL '1 minute' * ?)
    ";
    
    foreach ($testWorkflows as $i => $workflow) {
        $hoursAgo = $i + 1; // 1-4時間前
        $minutesAgo = ($i * 15) + 10; // 10-55分前
        
        $stmt = $pdo->prepare($insertSql);
        $stmt->execute([
            $workflow['yahoo_auction_id'],
            $workflow['status'],
            $workflow['current_step'],
            $workflow['priority'],
            $workflow['data'],
            $hoursAgo,
            $minutesAgo
        ]);
    }
    
    echo "<p>✅ テストワークフロー 4件作成</p>";
    
    // 3. yahoo_scraped_products テーブル確認・作成
    echo "<h2>3. Yahoo Scraped Products テーブル</h2>";
    
    $createProductsTable = "
    CREATE TABLE IF NOT EXISTS yahoo_scraped_products (
        id SERIAL PRIMARY KEY,
        source_item_id VARCHAR(255),
        active_title TEXT,
        price_jpy INTEGER,
        active_image_url TEXT,
        approval_status VARCHAR(50) DEFAULT 'pending',
        scraped_yahoo_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    )";
    
    $pdo->exec($createProductsTable);
    echo "<p>✅ Yahoo Scraped Products テーブル準備完了</p>";
    
    // テスト商品データ
    $testProducts = [
        [
            'source_item_id' => 'yahoo_test_001',
            'active_title' => 'テスト商品 - ヴィンテージ腕時計',
            'price_jpy' => 15000,
            'approval_status' => 'approved',
            'scraped_yahoo_data' => json_encode([
                'description' => 'ヴィンテージ腕時計です。状態良好。',
                'category' => '腕時計',
                'condition' => '中古',
                'test_data' => true
            ])
        ],
        [
            'source_item_id' => 'yahoo_test_002',
            'active_title' => 'テスト商品 - アンティーク陶器',
            'price_jpy' => 8500,
            'approval_status' => 'approved',
            'scraped_yahoo_data' => json_encode([
                'description' => '美しいアンティーク陶器コレクション。',
                'category' => '陶器・磁器',
                'condition' => '中古',
                'test_data' => true
            ])
        ],
        [
            'source_item_id' => 'yahoo_test_003',
            'active_title' => 'テスト商品 - レア書籍コレクション',
            'price_jpy' => 12000,
            'approval_status' => 'pending',
            'scraped_yahoo_data' => json_encode([
                'description' => '希少な古書コレクションです。',
                'category' => '本・雑誌',
                'condition' => '中古',
                'test_data' => true
            ])
        ]
    ];
    
    // 既存のテスト商品データをクリア
    $pdo->exec("DELETE FROM yahoo_scraped_products WHERE scraped_yahoo_data::text LIKE '%test_data%'");
    
    $productInsertSql = "
    INSERT INTO yahoo_scraped_products (source_item_id, active_title, price_jpy, approval_status, scraped_yahoo_data)
    VALUES (?, ?, ?, ?, ?)
    ";
    
    foreach ($testProducts as $product) {
        $stmt = $pdo->prepare($productInsertSql);
        $stmt->execute([
            $product['source_item_id'],
            $product['active_title'],
            $product['price_jpy'],
            $product['approval_status'],
            $product['scraped_yahoo_data']
        ]);
    }
    
    echo "<p>✅ テスト商品 3件作成</p>";
    
    // 4. データ確認
    echo "<h2>4. 作成データ確認</h2>";
    
    $workflowCount = $pdo->query("SELECT COUNT(*) FROM workflows")->fetchColumn();
    $productCount = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products")->fetchColumn();
    
    echo "<p>📊 総ワークフロー数: $workflowCount</p>";
    echo "<p>📊 総商品数: $productCount</p>";
    
    // 最新ワークフロー表示
    $recentWorkflows = $pdo->query("
        SELECT yahoo_auction_id, status, current_step, created_at 
        FROM workflows 
        ORDER BY created_at DESC 
        LIMIT 5
    ")->fetchAll();
    
    echo "<h3>最新ワークフロー:</h3>";
    echo "<table border='1' cellpadding='8' cellspacing='0' style='border-collapse: collapse;'>";
    echo "<tr><th>Yahoo ID</th><th>Status</th><th>Step</th><th>Created</th></tr>";
    foreach ($recentWorkflows as $wf) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($wf['yahoo_auction_id']) . "</td>";
        echo "<td>" . htmlspecialchars($wf['status']) . "</td>";
        echo "<td>" . $wf['current_step'] . "/9</td>";
        echo "<td>" . $wf['created_at'] . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    echo "<div style='background: #e8f5e8; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0;'>";
    echo "<h3>✅ テストデータ作成完了!</h3>";
    echo "<p>以下にアクセスしてダッシュボードを確認してください:</p>";
    echo "<ul>";
    $currentUrl = 'http://' . $_SERVER['HTTP_HOST'];
    echo "<li><a href='/new_structure/workflow_engine/dashboard_v2.html' target='_blank'>ダッシュボード v2.0</a></li>";
    echo "<li><a href='/new_structure/workflow_engine/test_integration.php' target='_blank'>統合テスト</a></li>";
    echo "<li><a href='/yahoo_auction_complete_24tools.html' target='_blank'>24ツール統合システム</a></li>";
    echo "</ul>";
    echo "</div>";
    
    // 5. APIテスト実行
    echo "<h2>5. 簡単なAPI接続テスト</h2>";
    
    $engineUrl = 'http://localhost:8080/new_structure/workflow_engine/integrated_workflow_engine.php?action=health_check';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $engineUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        echo "<p>✅ ワークフローエンジンAPI: 接続成功</p>";
        $result = json_decode($response, true);
        if ($result && $result['success']) {
            echo "<p>✅ API レスポンス: " . $result['message'] . "</p>";
        }
    } else {
        echo "<p>⚠️ ワークフローエンジンAPI: HTTP $httpCode (まだ修正が必要)</p>";
    }
    
} catch (Exception $e) {
    echo "<div style='background: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 10px 0;'>";
    echo "<h3>❌ エラーが発生しました</h3>";
    echo "<p>" . $e->getMessage() . "</p>";
    echo "<p><strong>行番号:</strong> " . $e->getLine() . "</p>";
    echo "<p><strong>ファイル:</strong> " . $e->getFile() . "</p>";
    echo "</div>";
}
?>
