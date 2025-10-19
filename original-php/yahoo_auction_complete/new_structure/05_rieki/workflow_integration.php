<?php
/**
 * 05_rieki ワークフロー連携API
 * 利益計算システムを00_workflow_engineに統合
 */

// CORS・セキュリティヘッダー
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// エラー表示
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 設定
$workflow_engine_url = 'http://localhost:8080/modules/yahoo_auction_complete/new_structure/00_workflow_engine/integrated_workflow_engine_8080.php';
$rieki_calculator_url = 'http://localhost:8080/modules/yahoo_auction_complete/new_structure/05_rieki/advanced_tariff_calculator.php';

/**
 * ワークフロー連携クラス
 */
class RiekiWorkflowIntegration {
    
    /**
     * 利益計算をワークフローに通知
     */
    public function notifyCalculationToWorkflow($calculationData) {
        try {
            // ワークフロー新規作成
            $workflowData = [
                'action' => 'start_profit_calculation_workflow',
                'yahoo_auction_id' => 'profit_calc_' . time(),
                'data' => [
                    'type' => 'profit_calculation',
                    'calculation_type' => $calculationData['type'],
                    'input_data' => $calculationData['input'],
                    'result_data' => $calculationData['result'],
                    'timestamp' => date('Y-m-d H:i:s'),
                    'source' => '05_rieki'
                ]
            ];
            
            // ワークフローエンジンに送信
            $response = $this->callWorkflowEngine($workflowData);
            
            return [
                'success' => true,
                'workflow_id' => $response['workflow_id'] ?? null,
                'message' => '利益計算結果をワークフローに統合しました'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'ワークフロー連携エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * ダッシュボード用統計データ取得
     */
    public function getDashboardStats() {
        $stats = [
            'total_calculations' => $this->getTotalCalculations(),
            'profitable_items' => $this->getProfitableItemsCount(),
            'average_profit_margin' => $this->getAverageMargin(),
            'recent_calculations' => $this->getRecentCalculations(5),
            'platform_breakdown' => $this->getPlatformBreakdown()
        ];
        
        return [
            'success' => true,
            'data' => $stats,
            'updated_at' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * 利益計算履歴取得（仮実装）
     */
    private function getTotalCalculations() {
        // 実装: データベースから取得 or ログファイルから計算
        return rand(150, 500); // テストデータ
    }
    
    private function getProfitableItemsCount() {
        return rand(80, 200);
    }
    
    private function getAverageMargin() {
        return round(rand(15, 35) + (rand(0, 99) / 100), 2);
    }
    
    private function getRecentCalculations($limit) {
        // テストデータ
        $calculations = [];
        for ($i = 0; $i < $limit; $i++) {
            $calculations[] = [
                'id' => $i + 1,
                'type' => ['advanced', 'ebay', 'shopee'][rand(0, 2)],
                'profit_jpy' => rand(1000, 50000),
                'margin_percent' => rand(5, 40),
                'timestamp' => date('Y-m-d H:i:s', time() - rand(0, 86400))
            ];
        }
        return $calculations;
    }
    
    private function getPlatformBreakdown() {
        return [
            'advanced' => rand(50, 150),
            'ebay' => rand(30, 100),
            'shopee' => rand(20, 80)
        ];
    }
    
    /**
     * ワークフローエンジン呼び出し
     */
    private function callWorkflowEngine($data) {
        global $workflow_engine_url;
        
        $options = [
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/json',
                'content' => json_encode($data)
            ]
        ];
        
        $context = stream_context_create($options);
        $response = file_get_contents($workflow_engine_url, false, $context);
        
        if ($response === false) {
            throw new Exception('ワークフローエンジンとの通信に失敗しました');
        }
        
        return json_decode($response, true);
    }
}

// API処理
try {
    $integration = new RiekiWorkflowIntegration();
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
        
        switch ($action) {
            case 'notify_calculation':
                $calculationData = $input['data'] ?? [];
                $result = $integration->notifyCalculationToWorkflow($calculationData);
                echo json_encode($result);
                break;
                
            default:
                echo json_encode([
                    'success' => false,
                    'message' => '無効なアクションです: ' . $action
                ]);
        }
        
    } else { // GET
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'dashboard_stats':
                $result = $integration->getDashboardStats();
                echo json_encode($result);
                break;
                
            case 'health_check':
                echo json_encode([
                    'success' => true,
                    'message' => '05_rieki ワークフロー連携API が正常に動作しています',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'version' => '1.0.0'
                ]);
                break;
                
            default:
                echo json_encode([
                    'success' => false,
                    'message' => '無効なアクションです: ' . $action
                ]);
        }
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => '05_rieki連携エラー: ' . $e->getMessage()
    ]);
}
?>