<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    // 1. データベース接続テスト
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", "postgres", "Kn240914");
    
    // 2. 既存ワークフロー確認
    $stmt = $pdo->query("SELECT id, yahoo_auction_id, status, current_step FROM workflows ORDER BY id DESC LIMIT 5");
    $workflows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. 承認フロー実行（商品ID=1）
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if ($input['action'] === 'process_data') {
            // 模擬承認処理
            $stmt = $pdo->prepare("UPDATE workflows SET status = 'approved', current_step = 8 WHERE id = 1");
            $stmt->execute();
            
            echo json_encode([
                'success' => true,
                'message' => '商品ID=1の承認フロー完了',
                'processed_id' => 1
            ]);
            exit;
        }
    }
    
    // 4. 状況報告
    echo json_encode([
        'success' => true,
        'message' => 'システム正常稼働中',
        'timestamp' => date('Y-m-d H:i:s'),
        'workflows' => $workflows,
        'next_action' => 'POST {"action":"process_data"} でデータ処理実行'
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>