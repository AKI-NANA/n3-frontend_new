<?php
/**
 * 統合APIハンドラー
 * 元ファイル（yahoo_auction_tool_content.php）の行20-150 APIエンドポイント処理を抽出・統合
 */

require_once 'includes.php';

class YahooAuctionAPI {
    
    /**
     * APIリクエスト処理メイン
     * 元ファイル 行20-40 の条件分岐処理を移行・改良
     */
    public static function handleRequest() {
        // 元ファイル 行20-25 から抽出
        $isAjaxRequest = isAjaxRequest();
        $action = $_POST['action'] ?? $_GET['action'] ?? '';
        
        if (!$isAjaxRequest || empty($action)) {
            return null; // 通常のページ表示（各ツールが処理）
        }
        
        // CSRF保護（POSTリクエストのみ）
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && !validateCSRFToken()) {
            sendJsonResponse(null, false, 'CSRF token mismatch');
            return;
        }
        
        logMessage("API呼び出し: {$action}", 'INFO');
        
        try {
            // 元ファイル 行30-150 のswitch文を移行・拡張
            switch ($action) {
                case 'get_dashboard_stats':
                    self::handleDashboardStats();
                    break;
                    
                case 'get_approval_queue':
                    self::handleApprovalQueue();
                    break;
                    
                case 'search_products':
                    self::handleSearchProducts();
                    break;
                    
                case 'detect_ebay_category':
                    self::handleDetectEbayCategory();
                    break;
                    
                case 'test_api_connection':
                    self::handleTestConnection();
                    break;
                    
                // ワークフローデータ管理（新規）
                case 'save_workflow_data':
                    self::handleSaveWorkflowData();
                    break;
                    
                case 'get_workflow_data':
                    self::handleGetWorkflowData();
                    break;
                    
                case 'get_next_workflow_step':
                    self::handleGetNextWorkflowStep();
                    break;
                    
                case 'get_workflow_status':
                    self::handleGetWorkflowStatus();
                    break;
                    
                default:
                    sendJsonResponse(null, false, '不明なアクション: ' . $action);
            }
            
        } catch (Exception $e) {
            logMessage("API処理エラー [{$action}]: " . $e->getMessage(), 'ERROR');
            sendJsonResponse(null, false, 'システムエラーが発生しました: ' . $e->getMessage());
        }
    }
    
    /**
     * ダッシュボード統計取得（元ファイル 行40-50 から移行）
     */
    private static function handleDashboardStats() {
        $stats = getDashboardStats();
        sendJsonResponse($stats, $stats !== null, $stats !== null ? '' : 'データベース接続エラー');
    }
    
    /**
     * 承認キューデータ取得（元ファイル 行55-65 から移行）
     */
    private static function handleApprovalQueue() {
        $approvalData = getApprovalQueueData();
        sendJsonResponse($approvalData, true, '承認待ち商品を取得しました');
    }
    
    /**
     * 商品検索（元ファイル 行70-85 から移行・改良）
     */
    private static function handleSearchProducts() {
        $query = trim($_GET['query'] ?? '');
        
        if (empty($query)) {
            sendJsonResponse(null, false, '検索キーワードが空です');
            return;
        }
        
        if (strlen($query) < 2) {
            sendJsonResponse(null, false, '検索キーワードは2文字以上で入力してください');
            return;
        }
        
        $results = searchProducts($query);
        $message = "「{$query}」の検索結果: " . count($results) . "件";
        
        sendJsonResponse([
            'products' => $results,
            'query' => $query,
            'count' => count($results),
            'message' => $message
        ], true, $message);
    }
    
    /**
     * eBayカテゴリ自動判定（元ファイル 行90-140 から移行・拡張）
     */
    private static function handleDetectEbayCategory() {
        $productTitle = trim($_POST['product_title'] ?? '');
        $productDescription = trim($_POST['product_description'] ?? '');
        
        if (empty($productTitle)) {
            sendJsonResponse(null, false, '商品タイトルが必要です');
            return;
        }
        
        $categoryResults = self::detectEbayCategory($productTitle, $productDescription);
        
        sendJsonResponse($categoryResults, true, 'カテゴリ判定が完了しました');
    }
    
    /**
     * API接続テスト（元ファイル 行145-150 から移行）
     */
    private static function handleTestConnection() {
        try {
            $connection = getDatabaseConnection();
            $isConnected = $connection !== null;
            
            if ($isConnected) {
                // 基本的なクエリテスト
                $stmt = $connection->query("SELECT 1 as test");
                $result = $stmt->fetch();
                $isConnected = $result && $result['test'] == 1;
            }
            
            $message = $isConnected ? 'データベース接続成功' : 'データベース接続失敗';
            sendJsonResponse(['connected' => $isConnected], $isConnected, $message);
            
        } catch (Exception $e) {
            sendJsonResponse(['connected' => false], false, 'データベース接続エラー: ' . $e->getMessage());
        }
    }
    
    /**
     * ワークフローデータ保存（新規機能）
     */
    private static function handleSaveWorkflowData() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $step = (int)($input['step'] ?? 0);
        $toolName = trim($input['tool_name'] ?? '');
        $data = $input['data'] ?? [];
        $status = trim($input['status'] ?? 'completed');
        
        if ($step < 1 || $step > 10) {
            sendJsonResponse(null, false, '無効なワークフローステップです');
            return;
        }
        
        if (empty($toolName)) {
            sendJsonResponse(null, false, 'ツール名が必要です');
            return;
        }
        
        $result = saveWorkflowData($step, $toolName, $data, $status);
        $message = $result ? 'ワークフローデータを保存しました' : 'ワークフローデータ保存に失敗しました';
        
        sendJsonResponse(['saved' => $result], $result, $message);
    }
    
    /**
     * ワークフローデータ取得（新規機能）
     */
    private static function handleGetWorkflowData() {
        $step = isset($_GET['step']) ? (int)$_GET['step'] : null;
        $toolName = $_GET['tool_name'] ?? null;
        
        $data = getWorkflowData($step, $toolName);
        
        sendJsonResponse($data, true, 'ワークフローデータを取得しました');
    }
    
    /**
     * 次のワークフローステップ取得（新規機能）
     */
    private static function handleGetNextWorkflowStep() {
        $nextStep = getNextWorkflowStep();
        
        sendJsonResponse([
            'next_step' => $nextStep,
            'step_name' => self::getStepName($nextStep),
            'tool_path' => self::getToolPath($nextStep)
        ], true, "次のステップ: Step {$nextStep}");
    }
    
    /**
     * ワークフロー全体状況取得（新規機能）
     */
    private static function handleGetWorkflowStatus() {
        $allData = getWorkflowData();
        $steps = [];
        
        for ($i = 1; $i <= 10; $i++) {
            $steps[$i] = [
                'step_number' => $i,
                'step_name' => self::getStepName($i),
                'tool_path' => self::getToolPath($i),
                'status' => 'pending',
                'completed_at' => null,
                'data_available' => false
            ];
        }
        
        foreach ($allData as $data) {
            $stepNum = (int)$data['workflow_step'];
            if (isset($steps[$stepNum])) {
                $steps[$stepNum]['status'] = $data['status'];
                $steps[$stepNum]['completed_at'] = $data['updated_at'];
                $steps[$stepNum]['data_available'] = !empty($data['data_payload']);
            }
        }
        
        sendJsonResponse([
            'steps' => array_values($steps),
            'total_completed' => count(array_filter($steps, fn($s) => $s['status'] === 'completed')),
            'next_step' => getNextWorkflowStep()
        ], true, 'ワークフロー状況を取得しました');
    }
    
    /**
     * eBayカテゴリ判定（元ファイル detectEbayCategory 関数を移行・改良）
     */
    private static function detectEbayCategory($title, $description = '') {
        // 元ファイル 行200-350 の判定ロジックを移行・拡張
        $categories = [
            [
                'category_id' => '58058',
                'category_name' => 'Cell Phones & Accessories > Cell Phones & Smartphones',
                'confidence' => 95,
                'keywords_matched' => ['iPhone', 'phone', 'smartphone', 'mobile', 'android'],
                'item_specifics' => [
                    'Brand' => 'Apple',
                    'Model' => 'iPhone',
                    'Storage Capacity' => '128GB',
                    'Color' => 'Space Gray',
                    'Network' => 'Unlocked'
                ]
            ],
            [
                'category_id' => '175672',
                'category_name' => 'Consumer Electronics > Cameras & Photo > Digital Cameras',
                'confidence' => 90,
                'keywords_matched' => ['camera', 'canon', 'nikon', 'sony', 'lens', 'dslr'],
                'item_specifics' => [
                    'Brand' => 'Canon',
                    'Type' => 'Digital SLR',
                    'Megapixels' => '24.0MP',
                    'Optical Zoom' => '3x',
                    'Features' => 'HD Video Recording'
                ]
            ],
            [
                'category_id' => '11450',
                'category_name' => 'Clothing, Shoes & Accessories > Men\'s Clothing',
                'confidence' => 85,
                'keywords_matched' => ['shirt', 'jacket', 'pants', 'clothing', 'fashion', 'wear'],
                'item_specifics' => [
                    'Brand' => 'Unbranded',
                    'Size' => 'L',
                    'Color' => 'Blue',
                    'Material' => 'Cotton',
                    'Style' => 'Casual'
                ]
            ],
            [
                'category_id' => '293',
                'category_name' => 'Consumer Electronics > Portable Audio & Headphones',
                'confidence' => 80,
                'keywords_matched' => ['headphone', 'earphone', 'audio', 'sound', 'music', 'speaker'],
                'item_specifics' => [
                    'Brand' => 'Sony',
                    'Type' => 'Over-Ear',
                    'Connectivity' => 'Wireless',
                    'Features' => 'Noise Cancellation',
                    'Color' => 'Black'
                ]
            ],
            [
                'category_id' => '58020',
                'category_name' => 'Computers/Tablets & Networking > Laptops & Netbooks',
                'confidence' => 88,
                'keywords_matched' => ['laptop', 'notebook', 'computer', 'macbook', 'thinkpad'],
                'item_specifics' => [
                    'Brand' => 'Apple',
                    'Screen Size' => '13 in',
                    'Processor' => 'Intel Core i5',
                    'RAM' => '8GB',
                    'Storage' => '256GB SSD'
                ]
            ]
        ];
        
        $title_lower = strtolower($title);
        $description_lower = strtolower($description);
        $text = $title_lower . ' ' . $description_lower;
        
        $matched_categories = [];
        
        foreach ($categories as $category) {
            $match_count = 0;
            $matched_keywords = [];
            
            foreach ($category['keywords_matched'] as $keyword) {
                if (strpos($text, strtolower($keyword)) !== false) {
                    $match_count++;
                    $matched_keywords[] = $keyword;
                }
            }
            
            if ($match_count > 0) {
                $category['confidence'] = min(95, 60 + ($match_count * 15));
                $category['keywords_matched'] = $matched_keywords;
                $matched_categories[] = $category;
            }
        }
        
        // マッチしない場合はデフォルトカテゴリ
        if (empty($matched_categories)) {
            $matched_categories[] = [
                'category_id' => '99',
                'category_name' => 'Everything Else > Other',
                'confidence' => 40,
                'keywords_matched' => [],
                'item_specifics' => [
                    'Condition' => 'Used',
                    'Brand' => 'Unbranded',
                    'Type' => 'Unknown'
                ]
            ];
        }
        
        // 信頼度順にソート
        usort($matched_categories, function($a, $b) {
            return $b['confidence'] - $a['confidence'];
        });
        
        return $matched_categories;
    }
    
    /**
     * ステップ名取得
     */
    private static function getStepName($step) {
        $stepNames = [
            1 => 'データ取得',
            2 => 'スクレイピング',
            3 => '商品承認',
            4 => '承認分析', 
            5 => 'データ編集',
            6 => '送料計算',
            7 => 'フィルター',
            8 => '出品管理',
            9 => '在庫管理',
            10 => 'レポート'
        ];
        
        return $stepNames[$step] ?? "Step {$step}";
    }
    
    /**
     * ツールパス取得
     */
    private static function getToolPath($step) {
        $toolPaths = [
            1 => 'dashboard/dashboard.php',
            2 => 'scraping/scraping.php', 
            3 => 'approval/approval.php',
            4 => 'analysis/analysis.php',
            5 => 'editing/editing.php',
            6 => 'calculation/calculation.php',
            7 => 'filters/filters.php',
            8 => 'listing/listing.php',
            9 => 'inventory/inventory.php',
            10 => 'reports/reports.php'
        ];
        
        return $toolPaths[$step] ?? '';
    }
}

// API処理実行（元ファイルの最下部処理を移行）
YahooAuctionAPI::handleRequest();
?>
