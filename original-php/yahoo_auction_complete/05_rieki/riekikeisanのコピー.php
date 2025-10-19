<?php
/**
 * Yahoo Auction Tool - 拡張版利益計算システム
 * 
 * 新機能:
 * - eBayカテゴリー別自動手数料計算
 * - 為替レート自動取得と変動マージン設定
 * - 階層型利益率管理（グローバル、カテゴリー、コンディション、期間別）
 * - 出品期間に応じた価格自動調整
 * - 計算過程の完全履歴保存
 * 
 * @version 2.0.0
 * @date 2025-09-17
 */

// セキュリティとエラーハンドリング
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// 依存ファイルの読み込み
require_once '../shared/core/database_query_handler.php';
require_once '../classes/PriceCalculator.php';

// グローバル変数
$priceCalculator = null;

try {
    $pdo = getDatabaseConnection();
    if ($pdo) {
        $priceCalculator = new PriceCalculator($pdo);
    }
} catch (Exception $e) {
    error_log('PriceCalculator初期化エラー: ' . $e->getMessage());
}

// API処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

if (!empty($action)) {
    header('Content-Type: application/json; charset=utf-8');
    
    switch ($action) {
        case 'calculate_advanced_profit':
            calculateAdvancedProfit();
            break;
            
        case 'get_category_fees':
            getCategoryFees();
            break;
            
        case 'get_profit_settings':
            getProfitSettings();
            break;
            
        case 'save_profit_settings':
            saveProfitSettings();
            break;
            
        case 'get_exchange_rate':
            getExchangeRate();
            break;
            
        case 'get_calculation_history':
            getCalculationHistory();
            break;
            
        case 'analyze_roi_advanced':
            analyzeAdvancedROI();
            break;
            
        case 'export_calculations':
            exportCalculations();
            break;
            
        case 'simulate_pricing':
            simulatePricing();
            break;
            
        default:
            sendJsonResponse(null, false, '未知のアクション');
            break;
    }
}

/**
 * 拡張版利益計算
 */
function calculateAdvancedProfit() {
    global $priceCalculator;
    
    try {
        if (!$priceCalculator) {
            throw new Exception('計算エンジンが初期化されていません');
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        // 入力データの検証
        $requiredFields = ['id', 'price_jpy', 'category_id', 'condition'];
        foreach ($requiredFields as $field) {
            if (!isset($input[$field])) {
                throw new Exception("必須フィールド '{$field}' が不足しています");
            }
        }
        
        // 商品データの準備
        $itemData = [
            'id' => $input['id'],
            'price_jpy' => floatval($input['price_jpy']),
            'shipping_jpy' => floatval($input['shipping_jpy'] ?? 0),
            'category_id' => intval($input['category_id']),
            'condition' => $input['condition'],
            'days_since_listing' => intval($input['days_since_listing'] ?? 0)
        ];
        
        // 計算実行
        $result = $priceCalculator->calculateFinalPrice($itemData);
        
        if (isset($result['error'])) {
            sendJsonResponse(null, false, $result['error']);
            return;
        }
        
        sendJsonResponse($result, true, '高度利益計算完了');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, '計算エラー: ' . $e->getMessage());
    }
}

/**
 * カテゴリー手数料取得
 */
function getCategoryFees() {
    global $priceCalculator;
    
    try {
        $categoryId = intval($_GET['category_id'] ?? 0);
        
        if ($categoryId <= 0) {
            throw new Exception('有効なカテゴリーIDが必要です');
        }
        
        $fees = $priceCalculator->getEbayCategoryFees($categoryId);
        
        if (!$fees) {
            throw new Exception('カテゴリー手数料が見つかりません');
        }
        
        sendJsonResponse($fees, true, 'カテゴリー手数料取得成功');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'カテゴリー手数料取得エラー: ' . $e->getMessage());
    }
}

/**
 * 利益率設定取得
 */
function getProfitSettings() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            throw new Exception('データベース接続エラー');
        }
        
        $stmt = $pdo->prepare("
            SELECT id, setting_type, target_value, profit_margin_target, 
                   minimum_profit_amount, maximum_price_usd, priority_order, 
                   active, description
            FROM profit_settings 
            ORDER BY setting_type, priority_order
        ");
        $stmt->execute();
        $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendJsonResponse($settings, true, '利益率設定取得成功');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, '利益率設定取得エラー: ' . $e->getMessage());
    }
}

/**
 * 利益率設定保存
 */
function saveProfitSettings() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            throw new Exception('データベース接続エラー');
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $pdo->beginTransaction();
        
        // 既存設定の無効化（必要に応じて）
        if ($input['replace_existing'] ?? false) {
            $stmt = $pdo->prepare("UPDATE profit_settings SET active = FALSE WHERE setting_type = ?");
            $stmt->execute([$input['setting_type']]);
        }
        
        // 新設定の保存
        $stmt = $pdo->prepare("
            INSERT INTO profit_settings (
                setting_type, target_value, profit_margin_target, 
                minimum_profit_amount, maximum_price_usd, priority_order, 
                description, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $input['setting_type'],
            $input['target_value'],
            floatval($input['profit_margin_target']),
            floatval($input['minimum_profit_amount']),
            floatval($input['maximum_price_usd'] ?? 0) ?: null,
            intval($input['priority_order'] ?? 999),
            $input['description'] ?? '',
            true
        ]);
        
        $pdo->commit();
        
        sendJsonResponse(['id' => $pdo->lastInsertId()], true, '利益率設定保存成功');
        
    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendJsonResponse(null, false, '利益率設定保存エラー: ' . $e->getMessage());
    }
}

/**
 * 為替レート取得
 */
function getExchangeRate() {
    global $priceCalculator;
    
    try {
        $customMargin = floatval($_GET['custom_margin'] ?? 0) ?: null;
        $rateInfo = $priceCalculator->getCalculatedExchangeRate($customMargin);
        
        if (!$rateInfo) {
            throw new Exception('為替レートが取得できません');
        }
        
        sendJsonResponse($rateInfo, true, '為替レート取得成功');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, '為替レート取得エラー: ' . $e->getMessage());
    }
}

/**
 * 計算履歴取得
 */
function getCalculationHistory() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            throw new Exception('データベース接続エラー');
        }
        
        $limit = intval($_GET['limit'] ?? 50);
        $offset = intval($_GET['offset'] ?? 0);
        $itemId = $_GET['item_id'] ?? null;
        
        $whereClause = '';
        $params = [];
        
        if ($itemId) {
            $whereClause = 'WHERE item_id = ?';
            $params[] = $itemId;
        }
        
        $stmt = $pdo->prepare("
            SELECT 
                id, item_id, category_id, item_condition, days_since_listing,
                price_jpy, shipping_jpy, exchange_rate, safety_margin,
                profit_margin_target, minimum_profit_amount,
                total_cost_jpy, total_cost_usd, recommended_price_usd,
                estimated_profit_usd, actual_profit_margin, roi,
                calculation_type, notes, created_at
            FROM profit_calculations 
            {$whereClause}
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        ");
        
        $params[] = $limit;
        $params[] = $offset;
        $stmt->execute($params);
        
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 総件数も取得
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM profit_calculations {$whereClause}");
        if ($itemId) {
            $countStmt->execute([$itemId]);
        } else {
            $countStmt->execute();
        }
        $totalCount = $countStmt->fetchColumn();
        
        sendJsonResponse([
            'history' => $history,
            'total_count' => $totalCount,
            'page_info' => [
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => ($offset + $limit) < $totalCount
            ]
        ], true, '計算履歴取得成功');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, '計算履歴取得エラー: ' . $e->getMessage());
    }
}

/**
 * 高度ROI分析
 */
function analyzeAdvancedROI() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            throw new Exception('データベース接続エラー');
        }
        
        // カテゴリー別ROI分析
        $categoryStmt = $pdo->prepare("
            SELECT 
                ec.category_name,
                pc.category_id,
                COUNT(*) as calculation_count,
                AVG(pc.actual_profit_margin) as avg_profit_margin,
                AVG(pc.roi) as avg_roi,
                AVG(pc.recommended_price_usd) as avg_price,
                MIN(pc.roi) as min_roi,
                MAX(pc.roi) as max_roi,
                STDDEV(pc.roi) as roi_stddev
            FROM profit_calculations pc
            LEFT JOIN ebay_categories ec ON pc.category_id = ec.category_id
            WHERE pc.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY pc.category_id, ec.category_name
            ORDER BY avg_roi DESC
        ");
        $categoryStmt->execute();
        $categoryAnalysis = $categoryStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // コンディション別分析
        $conditionStmt = $pdo->prepare("
            SELECT 
                item_condition,
                COUNT(*) as calculation_count,
                AVG(actual_profit_margin) as avg_profit_margin,
                AVG(roi) as avg_roi,
                AVG(recommended_price_usd) as avg_price
            FROM profit_calculations
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY item_condition
            ORDER BY avg_roi DESC
        ");
        $conditionStmt->execute();
        $conditionAnalysis = $conditionStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 期間別トレンド
        $trendStmt = $pdo->prepare("
            SELECT 
                DATE(created_at) as calculation_date,
                COUNT(*) as daily_calculations,
                AVG(actual_profit_margin) as avg_profit_margin,
                AVG(roi) as avg_roi
            FROM profit_calculations
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY calculation_date DESC
        ");
        $trendStmt->execute();
        $trendAnalysis = $trendStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 全体統計
        $overallStmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_calculations,
                AVG(actual_profit_margin) as overall_avg_margin,
                AVG(roi) as overall_avg_roi,
                COUNT(CASE WHEN roi > 30 THEN 1 END) as high_roi_count,
                COUNT(CASE WHEN roi < 10 THEN 1 END) as low_roi_count
            FROM profit_calculations
            WHERE created_at >= NOW() - INTERVAL '30 days'
        ");
        $overallStmt->execute();
        $overallStats = $overallStmt->fetch(PDO::FETCH_ASSOC);
        
        sendJsonResponse([
            'category_analysis' => $categoryAnalysis,
            'condition_analysis' => $conditionAnalysis,
            'trend_analysis' => $trendAnalysis,
            'overall_stats' => $overallStats,
            'analysis_period' => '過去30日間'
        ], true, '高度ROI分析完了');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'ROI分析エラー: ' . $e->getMessage());
    }
}

/**
 * 計算データエクスポート
 */
function exportCalculations() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            throw new Exception('データベース接続エラー');
        }
        
        $fromDate = $_GET['from_date'] ?? date('Y-m-d', strtotime('-30 days'));
        $toDate = $_GET['to_date'] ?? date('Y-m-d');
        
        $stmt = $pdo->prepare("
            SELECT 
                pc.item_id,
                ec.category_name,
                pc.item_condition,
                pc.days_since_listing,
                pc.price_jpy,
                pc.shipping_jpy,
                pc.total_cost_jpy,
                pc.exchange_rate,
                pc.safety_margin,
                pc.total_cost_usd,
                pc.recommended_price_usd,
                pc.estimated_profit_usd,
                pc.actual_profit_margin,
                pc.roi,
                pc.profit_margin_target,
                pc.minimum_profit_amount,
                pc.final_value_fee_percent,
                pc.insertion_fee_usd,
                pc.notes,
                pc.created_at
            FROM profit_calculations pc
            LEFT JOIN ebay_categories ec ON pc.category_id = ec.category_id
            WHERE pc.created_at BETWEEN ? AND ?
            ORDER BY pc.created_at DESC
        ");
        
        $stmt->execute([$fromDate . ' 00:00:00', $toDate . ' 23:59:59']);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // CSVヘッダー
        $csvHeaders = [
            '商品ID', 'カテゴリー', 'コンディション', '出品経過日数',
            '商品価格(円)', '送料(円)', '総コスト(円)', '為替レート', '安全マージン(%)',
            '総コスト(USD)', '推奨価格(USD)', '予想利益(USD)', '実利益率(%)', 'ROI(%)',
            '目標利益率(%)', '最低利益額(USD)', 'FVF率(%)', '出品手数料(USD)',
            '備考', '計算日時'
        ];
        
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="profit_calculations_' . date('Ymd_His') . '.csv"');
        echo "\xEF\xBB\xBF"; // UTF-8 BOM
        
        // ヘッダー出力
        echo implode(',', array_map(function($header) {
            return '"' . str_replace('"', '""', $header) . '"';
        }, $csvHeaders)) . "\n";
        
        // データ出力
        foreach ($data as $row) {
            $csvRow = [
                $row['item_id'],
                $row['category_name'] ?? '',
                $row['item_condition'],
                $row['days_since_listing'],
                $row['price_jpy'],
                $row['shipping_jpy'],
                $row['total_cost_jpy'],
                $row['exchange_rate'],
                $row['safety_margin'],
                $row['total_cost_usd'],
                $row['recommended_price_usd'],
                $row['estimated_profit_usd'],
                $row['actual_profit_margin'],
                $row['roi'],
                $row['profit_margin_target'],
                $row['minimum_profit_amount'],
                $row['final_value_fee_percent'],
                $row['insertion_fee_usd'],
                $row['notes'] ?? '',
                $row['created_at']
            ];
            
            echo implode(',', array_map(function($field) {
                return '"' . str_replace('"', '""', $field) . '"';
            }, $csvRow)) . "\n";
        }
        
        exit;
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'エクスポートエラー: ' . $e->getMessage());
    }
}

/**
 * 価格シミュレーション
 */
function simulatePricing() {
    global $priceCalculator;
    
    try {
        if (!$priceCalculator) {
            throw new Exception('計算エンジンが初期化されていません');
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $baseItemData = [
            'id' => $input['id'] ?? 'simulation',
            'price_jpy' => floatval($input['price_jpy']),
            'shipping_jpy' => floatval($input['shipping_jpy'] ?? 0),
            'category_id' => intval($input['category_id']),
            'condition' => $input['condition'],
            'days_since_listing' => 0
        ];
        
        $scenarios = [];
        
        // 異なる利益率でのシミュレーション
        $profitMargins = [15, 20, 25, 30, 35, 40];
        foreach ($profitMargins as $margin) {
            $scenarios[] = [
                'scenario' => "利益率{$margin}%",
                'margin' => $margin,
                'result' => $this->simulateWithMargin($baseItemData, $margin)
            ];
        }
        
        // 異なる為替マージンでのシミュレーション
        $exchangeMargins = [3, 5, 7, 10];
        foreach ($exchangeMargins as $exMargin) {
            $scenarios[] = [
                'scenario' => "為替マージン{$exMargin}%",
                'exchange_margin' => $exMargin,
                'result' => $this->simulateWithExchangeMargin($baseItemData, $exMargin)
            ];
        }
        
        sendJsonResponse([
            'base_data' => $baseItemData,
            'scenarios' => $scenarios,
            'simulation_timestamp' => date('Y-m-d H:i:s')
        ], true, '価格シミュレーション完了');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'シミュレーションエラー: ' . $e->getMessage());
    }
}

/**
 * ヘルパー関数
 */
function sendJsonResponse($data, $success, $message) {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>拡張版利益計算システム - Yahoo Auction Tool</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="../shared/css/common.css" rel="stylesheet">
    <style>
        /* 拡張版専用CSS */
        .advanced-calculator {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 15px;
            margin-bottom: 2rem;
        }
        
        .calculation-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 2rem;
            margin-top: 2rem;
        }
        
        .calc-section {
            background: rgba(255, 255, 255, 0.1);
            padding: 1.5rem;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        
        .settings-panel {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 10px;
            padding: 1.5rem;
            margin: 1rem 0;
        }
        
        .history-table {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .roi-chart {
            background: white;
            border-radius: 10px;
            padding: 1.5rem;
            margin: 1rem 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .simulation-results {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .scenario-card {
            background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            color: white;
            padding: 1rem;
            border-radius: 8px;
            text-align: center;
        }
        
        .input-group {
            margin-bottom: 1rem;
        }
        
        .input-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        
        .input-group input, .input-group select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 1rem;
        }
        
        .btn-group {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
        }
        
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 0.5rem;
        }
        
        .status-success { background: #28a745; }
        .status-warning { background: #ffc107; }
        .status-danger { background: #dc3545; }
        
        @media (max-width: 768px) {
            .calculation-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ナビゲーションヘッダー -->
        <nav class="navbar">
            <div class="nav-brand">
                <i class="fas fa-calculator-alt"></i>
                <span>拡張版利益計算</span>
            </div>
            <div class="nav-links">
                <a href="../01_dashboard/dashboard.php"><i class="fas fa-tachometer-alt"></i> ダッシュボード</a>
                <a href="../02_scraping/scraping.php"><i class="fas fa-spider"></i> データ取得</a>
                <a href="../10_riekikeisan/riekikeisan.php" class="active"><i class="fas fa-calculator"></i> 利益計算</a>
            </div>
        </nav>

        <!-- メインコンテンツ -->
        <main class="main-content">
            <!-- ヘッダーセクション -->
            <div class="advanced-calculator">
                <h1><i class="fas fa-chart-line"></i> 拡張版利益計算システム</h1>
                <p>eBayカテゴリー別手数料・為替変動・階層型利益率設定による高精度価格計算</p>
                
                <div class="system-status">
                    <span class="status-indicator status-success" id="dbStatus"></span>データベース接続
                    <span class="status-indicator status-success" id="calcStatus"></span>計算エンジン
                    <span class="status-indicator status-warning" id="rateStatus"></span>為替レート
                </div>
            </div>

            <!-- タブナビゲーション -->
            <div class="tab-navigation">
                <button class="tab-btn active" data-tab="calculator">高度計算</button>
                <button class="tab-btn" data-tab="settings">設定管理</button>
                <button class="tab-btn" data-tab="history">計算履歴</button>
                <button class="tab-btn" data-tab="analysis">ROI分析</button>
                <button class="tab-btn" data-tab="simulation">価格シミュレーション</button>
            </div>

            <!-- 高度計算タブ -->
            <div id="calculator" class="tab-content active">
                <div class="calculation-grid">
                    <!-- 基本情報入力 -->
                    <div class="calc-section">
                        <h3><i class="fas fa-edit"></i> 商品情報</h3>
                        
                        <div class="input-group">
                            <label for="itemId">商品ID</label>
                            <input type="text" id="itemId" placeholder="商品IDを入力">
                        </div>
                        
                        <div class="input-group">
                            <label for="priceJpy">商品価格 (円)</label>
                            <input type="number" id="priceJpy" step="0.01" placeholder="10000">
                        </div>
                        
                        <div class="input-group">
                            <label for="shippingJpy">送料 (円)</label>
                            <input type="number" id="shippingJpy" step="0.01" placeholder="800">
                        </div>
                        
                        <div class="input-group">
                            <label for="categoryId">eBayカテゴリー</label>
                            <select id="categoryId">
                                <option value="">カテゴリーを選択</option>
                                <option value="293">Consumer Electronics</option>
                                <option value="11450">Clothing, Shoes & Accessories</option>
                                <option value="58058">Collectibles</option>
                                <option value="267">Books</option>
                                <option value="550">Art</option>
                            </select>
                        </div>
                        
                        <div class="input-group">
                            <label for="condition">商品コンディション</label>
                            <select id="condition">
                                <option value="New">新品</option>
                                <option value="Used">中古</option>
                                <option value="Refurbished">リファビッシュ品</option>
                            </select>
                        </div>
                        
                        <div class="input-group">
                            <label for="daysSinceListing">出品からの経過日数</label>
                            <input type="number" id="daysSinceListing" value="0" min="0">
                        </div>
                    </div>

                    <!-- 設定情報 -->
                    <div class="calc-section">
                        <h3><i class="fas fa-cog"></i> 計算設定</h3>
                        
                        <div class="settings-display" id="settingsDisplay">
                            <div class="setting-item">
                                <span class="setting-label">為替レート:</span>
                                <span class="setting-value" id="currentRate">取得中...</span>
                            </div>
                            <div class="setting-item">
                                <span class="setting-label">安全マージン:</span>
                                <span class="setting-value" id="safetyMargin">5.0%</span>
                            </div>
                            <div class="setting-item">
                                <span class="setting-label">カテゴリー手数料:</span>
                                <span class="setting-value" id="categoryFee">選択してください</span>
                            </div>
                            <div class="setting-item">
                                <span class="setting-label">目標利益率:</span>
                                <span class="setting-value" id="targetMargin">設定に基づく</span>
                            </div>
                        </div>
                        
                        <div class="btn-group">
                            <button class="btn btn-info" onclick="loadCurrentSettings()">
                                <i class="fas fa-sync"></i> 設定更新
                            </button>
                            <button class="btn btn-primary" onclick="calculateAdvanced()">
                                <i class="fas fa-calculator"></i> 計算実行
                            </button>
                        </div>
                    </div>

                    <!-- 計算結果 -->
                    <div class="calc-section">
                        <h3><i class="fas fa-chart-bar"></i> 計算結果</h3>
                        
                        <div class="result-display" id="resultDisplay">
                            <div class="result-item">
                                <span class="result-label">推奨販売価格:</span>
                                <span class="result-value" id="recommendedPrice">-</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">予想利益:</span>
                                <span class="result-value" id="estimatedProfit">-</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">利益率:</span>
                                <span class="result-value" id="profitMargin">-</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">ROI:</span>
                                <span class="result-value" id="roiValue">-</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">総手数料:</span>
                                <span class="result-value" id="totalFees">-</span>
                            </div>
                        </div>
                        
                        <div class="recommendations" id="recommendations">
                            <!-- 推奨事項が動的に表示される -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- 設定管理タブ -->
            <div id="settings" class="tab-content">
                <div class="settings-panel">
                    <h3><i class="fas fa-sliders-h"></i> 利益率設定管理</h3>
                    
                    <div class="setting-form">
                        <div class="input-group">
                            <label for="settingType">設定タイプ</label>
                            <select id="settingType">
                                <option value="global">グローバル設定</option>
                                <option value="category">カテゴリー別設定</option>
                                <option value="condition">コンディション別設定</option>
                                <option value="period">期間別設定</option>
                            </select>
                        </div>
                        
                        <div class="input-group">
                            <label for="targetValue">対象値</label>
                            <input type="text" id="targetValue" placeholder="カテゴリーID、コンディション名等">
                        </div>
                        
                        <div class="input-group">
                            <label for="profitMarginTarget">目標利益率 (%)</label>
                            <input type="number" id="profitMarginTarget" step="0.1" value="25.0">
                        </div>
                        
                        <div class="input-group">
                            <label for="minimumProfitAmount">最低利益額 (USD)</label>
                            <input type="number" id="minimumProfitAmount" step="0.01" value="5.00">
                        </div>
                        
                        <div class="input-group">
                            <label for="maxPriceUsd">最大販売価格 (USD)</label>
                            <input type="number" id="maxPriceUsd" step="0.01" placeholder="制限なしの場合は空白">
                        </div>
                        
                        <div class="input-group">
                            <label for="priorityOrder">優先順位</label>
                            <input type="number" id="priorityOrder" value="999">
                        </div>
                        
                        <div class="input-group">
                            <label for="settingDescription">説明</label>
                            <input type="text" id="settingDescription" placeholder="設定の説明">
                        </div>
                        
                        <div class="btn-group">
                            <button class="btn btn-success" onclick="saveProfitSetting()">
                                <i class="fas fa-save"></i> 設定保存
                            </button>
                            <button class="btn btn-info" onclick="loadProfitSettings()">
                                <i class="fas fa-list"></i> 一覧表示
                            </button>
                        </div>
                    </div>
                    
                    <div class="settings-list" id="settingsList">
                        <!-- 設定一覧が動的に表示される -->
                    </div>
                </div>
            </div>

            <!-- 計算履歴タブ -->
            <div id="history" class="tab-content">
                <div class="section-header">
                    <h3><i class="fas fa-history"></i> 計算履歴</h3>
                    <div class="btn-group">
                        <button class="btn btn-info" onclick="loadCalculationHistory()">
                            <i class="fas fa-sync"></i> 履歴更新
                        </button>
                        <button class="btn btn-success" onclick="exportCalculationData()">
                            <i class="fas fa-download"></i> CSV出力
                        </button>
                    </div>
                </div>
                
                <div class="history-table" id="historyTable">
                    <!-- 履歴テーブルが動的に表示される -->
                </div>
            </div>

            <!-- ROI分析タブ -->
            <div id="analysis" class="tab-content">
                <div class="section-header">
                    <h3><i class="fas fa-chart-pie"></i> 高度ROI分析</h3>
                    <button class="btn btn-info" onclick="loadAdvancedROIAnalysis()">
                        <i class="fas fa-sync"></i> 分析更新
                    </button>
                </div>
                
                <div class="analysis-grid">
                    <div class="roi-chart" id="categoryAnalysis">
                        <h4>カテゴリー別分析</h4>
                        <div id="categoryChartData"></div>
                    </div>
                    
                    <div class="roi-chart" id="conditionAnalysis">
                        <h4>コンディション別分析</h4>
                        <div id="conditionChartData"></div>
                    </div>
                    
                    <div class="roi-chart" id="trendAnalysis">
                        <h4>期間別トレンド</h4>
                        <div id="trendChartData"></div>
                    </div>
                </div>
            </div>

            <!-- 価格シミュレーションタブ -->
            <div id="simulation" class="tab-content">
                <div class="section-header">
                    <h3><i class="fas fa-chart-area"></i> 価格シミュレーション</h3>
                    <button class="btn btn-primary" onclick="runPriceSimulation()">
                        <i class="fas fa-play"></i> シミュレーション実行
                    </button>
                </div>
                
                <div class="simulation-results" id="simulationResults">
                    <!-- シミュレーション結果が動的に表示される -->
                </div>
            </div>
        </main>
    </div>

    <script>
        // 拡張版利益計算システムJavaScript
        
        // グローバル変数
        let currentCalculationResult = null;
        let currentSettings = {};
        
        // ページ初期化
        document.addEventListener('DOMContentLoaded', function() {
            initializeAdvancedCalculator();
        });
        
        function initializeAdvancedCalculator() {
            console.log('拡張版利益計算システム初期化開始');
            
            // タブイベントリスナー
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    switchTab(this.dataset.tab);
                });
            });
            
            // 入力フィールドのイベントリスナー
            ['itemId', 'priceJpy', 'shippingJpy', 'categoryId', 'condition', 'daysSinceListing'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', updateCalculationSettings);
                }
            });
            
            // 初期設定の読み込み
            loadCurrentSettings();
            
            console.log('拡張版利益計算システム初期化完了');
        }
        
        // タブ切り替え
        function switchTab(tabName) {
            // タブボタンの状態更新
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
            
            // タブコンテンツの表示切り替え
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName).classList.add('active');
            
            // タブ固有の初期化処理
            switch(tabName) {
                case 'settings':
                    loadProfitSettings();
                    break;
                case 'history':
                    loadCalculationHistory();
                    break;
                case 'analysis':
                    loadAdvancedROIAnalysis();
                    break;
                case 'simulation':
                    // シミュレーションタブの初期化
                    break;
            }
        }
        
        // 現在の設定を読み込み
        function loadCurrentSettings() {
            // 為替レート取得
            fetch('riekikeisan.php?action=get_exchange_rate')
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        updateRateDisplay(result.data);
                    }
                })
                .catch(error => {
                    console.error('為替レート取得エラー:', error);
                });
            
            // カテゴリー情報更新
            updateCalculationSettings();
        }
        
        // 為替レート表示更新
        function updateRateDisplay(rateData) {
            document.getElementById('currentRate').textContent = 
                `1 JPY = ${rateData.calculated_rate.toFixed(6)} USD`;
            document.getElementById('safetyMargin').textContent = 
                `${rateData.safety_margin}%`;
            
            // ステータス更新
            document.getElementById('rateStatus').className = 'status-indicator status-success';
        }
        
        // 計算設定更新
        function updateCalculationSettings() {
            const categoryId = document.getElementById('categoryId').value;
            
            if (categoryId) {
                // カテゴリー手数料取得
                fetch(`riekikeisan.php?action=get_category_fees&category_id=${categoryId}`)
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            document.getElementById('categoryFee').textContent = 
                                `${result.data.final_value_fee}% + ${result.data.insertion_fee}`;
                        }
                    })
                    .catch(error => {
                        console.error('カテゴリー手数料取得エラー:', error);
                    });
            }
        }
        
        // 高度計算実行
        function calculateAdvanced() {
            const itemData = {
                id: document.getElementById('itemId').value || 'manual_calc',
                price_jpy: parseFloat(document.getElementById('priceJpy').value) || 0,
                shipping_jpy: parseFloat(document.getElementById('shippingJpy').value) || 0,
                category_id: parseInt(document.getElementById('categoryId').value) || 0,
                condition: document.getElementById('condition').value,
                days_since_listing: parseInt(document.getElementById('daysSinceListing').value) || 0
            };
            
            // 入力検証
            if (itemData.price_jpy <= 0 || itemData.category_id <= 0) {
                alert('商品価格とカテゴリーを正しく入力してください。');
                return;
            }
            
            console.log('高度計算実行:', itemData);
            
            fetch('riekikeisan.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'calculate_advanced_profit',
                    ...itemData
                })
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    displayCalculationResult(result.data);
                    currentCalculationResult = result.data;
                } else {
                    alert('計算エラー: ' + result.message);
                }
            })
            .catch(error => {
                console.error('計算エラー:', error);
                alert('計算処理中にエラーが発生しました。');
            });
        }
        
        // 計算結果表示
        function displayCalculationResult(data) {
            const results = data.results;
            
            document.getElementById('recommendedPrice').textContent = 
                `${results.recommended_price_usd}`;
            document.getElementById('estimatedProfit').textContent = 
                `${results.estimated_profit_usd}`;
            document.getElementById('profitMargin').textContent = 
                `${results.actual_profit_margin}%`;
            document.getElementById('roiValue').textContent = 
                `${results.roi}%`;
            document.getElementById('totalFees').textContent = 
                `${results.total_fees_usd}`;
            
            // 推奨事項表示
            const recommendationsDiv = document.getElementById('recommendations');
            recommendationsDiv.innerHTML = data.recommendations.map(rec => 
                `<div class="recommendation-item"><i class="fas fa-lightbulb"></i> ${rec}</div>`
            ).join('');
        }
        
        // 利益率設定保存
        function saveProfitSetting() {
            const settingData = {
                setting_type: document.getElementById('settingType').value,
                target_value: document.getElementById('targetValue').value,
                profit_margin_target: parseFloat(document.getElementById('profitMarginTarget').value),
                minimum_profit_amount: parseFloat(document.getElementById('minimumProfitAmount').value),
                maximum_price_usd: parseFloat(document.getElementById('maxPriceUsd').value) || null,
                priority_order: parseInt(document.getElementById('priorityOrder').value),
                description: document.getElementById('settingDescription').value
            };
            
            fetch('riekikeisan.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'save_profit_settings',
                    ...settingData
                })
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert('設定を保存しました。');
                    loadProfitSettings();
                } else {
                    alert('保存エラー: ' + result.message);
                }
            })
            .catch(error => {
                console.error('設定保存エラー:', error);
                alert('設定保存中にエラーが発生しました。');
            });
        }
        
        // 利益率設定一覧読み込み
        function loadProfitSettings() {
            fetch('riekikeisan.php?action=get_profit_settings')
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        displayProfitSettings(result.data);
                    }
                })
                .catch(error => {
                    console.error('設定読み込みエラー:', error);
                });
        }
        
        // 利益率設定表示
        function displayProfitSettings(settings) {
            const listDiv = document.getElementById('settingsList');
            
            if (settings.length === 0) {
                listDiv.innerHTML = '<p>設定がありません。</p>';
                return;
            }
            
            const table = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>タイプ</th>
                            <th>対象値</th>
                            <th>利益率(%)</th>
                            <th>最低利益額($)</th>
                            <th>優先順位</th>
                            <th>状態</th>
                            <th>説明</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${settings.map(setting => `
                            <tr>
                                <td>${setting.setting_type}</td>
                                <td>${setting.target_value}</td>
                                <td>${setting.profit_margin_target}</td>
                                <td>${setting.minimum_profit_amount}</td>
                                <td>${setting.priority_order}</td>
                                <td>
                                    <span class="status-indicator ${setting.active ? 'status-success' : 'status-danger'}"></span>
                                    ${setting.active ? '有効' : '無効'}
                                </td>
                                <td>${setting.description || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            listDiv.innerHTML = table;
        }
        
        // 計算履歴読み込み
        function loadCalculationHistory() {
            fetch('riekikeisan.php?action=get_calculation_history&limit=50')
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        displayCalculationHistory(result.data.history);
                    }
                })
                .catch(error => {
                    console.error('履歴読み込みエラー:', error);
                });
        }
        
        // 計算履歴表示
        function displayCalculationHistory(history) {
            const tableDiv = document.getElementById('historyTable');
            
            if (history.length === 0) {
                tableDiv.innerHTML = '<p>計算履歴がありません。</p>';
                return;
            }
            
            const table = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>商品ID</th>
                            <th>カテゴリー</th>
                            <th>コンディション</th>
                            <th>商品価格(円)</th>
                            <th>推奨価格($)</th>
                            <th>利益率(%)</th>
                            <th>ROI(%)</th>
                            <th>計算日時</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(calc => `
                            <tr>
                                <td>${calc.item_id}</td>
                                <td>${calc.category_id}</td>
                                <td>${calc.item_condition}</td>
                                <td>¥${calc.price_jpy.toLocaleString()}</td>
                                <td>${calc.recommended_price_usd}</td>
                                <td>${calc.actual_profit_margin}%</td>
                                <td>${calc.roi}%</td>
                                <td>${new Date(calc.created_at).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            tableDiv.innerHTML = table;
        }
        
        // ROI分析読み込み
        function loadAdvancedROIAnalysis() {
            fetch('riekikeisan.php?action=analyze_roi_advanced')
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        displayROIAnalysis(result.data);
                    }
                })
                .catch(error => {
                    console.error('ROI分析エラー:', error);
                });
        }
        
        // ROI分析表示
        function displayROIAnalysis(data) {
            // カテゴリー別分析
            displayCategoryAnalysis(data.category_analysis);
            
            // コンディション別分析
            displayConditionAnalysis(data.condition_analysis);
            
            // トレンド分析
            displayTrendAnalysis(data.trend_analysis);
        }
        
        function displayCategoryAnalysis(categoryData) {
            const chartDiv = document.getElementById('categoryChartData');
            
            const html = categoryData.map(cat => `
                <div class="analysis-item">
                    <h5>${cat.category_name || 'Unknown'}</h5>
                    <div class="analysis-metrics">
                        <span>平均ROI: ${parseFloat(cat.avg_roi).toFixed(1)}%</span>
                        <span>計算回数: ${cat.calculation_count}</span>
                        <span>平均価格: ${parseFloat(cat.avg_price).toFixed(2)}</span>
                    </div>
                </div>
            `).join('');
            
            chartDiv.innerHTML = html;
        }
        
        function displayConditionAnalysis(conditionData) {
            const chartDiv = document.getElementById('conditionChartData');
            
            const html = conditionData.map(cond => `
                <div class="analysis-item">
                    <h5>${cond.item_condition}</h5>
                    <div class="analysis-metrics">
                        <span>平均ROI: ${parseFloat(cond.avg_roi).toFixed(1)}%</span>
                        <span>平均利益率: ${parseFloat(cond.avg_profit_margin).toFixed(1)}%</span>
                        <span>計算回数: ${cond.calculation_count}</span>
                    </div>
                </div>
            `).join('');
            
            chartDiv.innerHTML = html;
        }
        
        function displayTrendAnalysis(trendData) {
            const chartDiv = document.getElementById('trendChartData');
            
            const html = trendData.slice(0, 10).map(trend => `
                <div class="trend-item">
                    <span class="trend-date">${trend.calculation_date}</span>
                    <span class="trend-count">${trend.daily_calculations}件</span>
                    <span class="trend-roi">ROI: ${parseFloat(trend.avg_roi).toFixed(1)}%</span>
                </div>
            `).join('');
            
            chartDiv.innerHTML = html;
        }
        
        // 価格シミュレーション実行
        function runPriceSimulation() {
            const itemData = {
                id: document.getElementById('itemId').value || 'simulation',
                price_jpy: parseFloat(document.getElementById('priceJpy').value) || 0,
                shipping_jpy: parseFloat(document.getElementById('shippingJpy').value) || 0,
                category_id: parseInt(document.getElementById('categoryId').value) || 0,
                condition: document.getElementById('condition').value
            };
            
            if (itemData.price_jpy <= 0 || itemData.category_id <= 0) {
                alert('商品価格とカテゴリーを正しく入力してください。');
                return;
            }
            
            fetch('riekikeisan.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'simulate_pricing',
                    ...itemData
                })
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    displaySimulationResults(result.data);
                } else {
                    alert('シミュレーションエラー: ' + result.message);
                }
            })
            .catch(error => {
                console.error('シミュレーションエラー:', error);
                alert('シミュレーション実行中にエラーが発生しました。');
            });
        }
        
        // シミュレーション結果表示
        function displaySimulationResults(data) {
            const resultsDiv = document.getElementById('simulationResults');
            
            const html = data.scenarios.map(scenario => `
                <div class="scenario-card">
                    <h4>${scenario.scenario}</h4>
                    <div class="scenario-metrics">
                        <div>推奨価格: ${scenario.result?.recommended_price || 'N/A'}</div>
                        <div>利益率: ${scenario.result?.profit_margin || 'N/A'}%</div>
                        <div>ROI: ${scenario.result?.roi || 'N/A'}%</div>
                    </div>
                </div>
            `).join('');
            
            resultsDiv.innerHTML = html;
        }
        
        // CSVエクスポート
        function exportCalculationData() {
            const fromDate = prompt('開始日を入力してください (YYYY-MM-DD):', 
                new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]);
            const toDate = prompt('終了日を入力してください (YYYY-MM-DD):', 
                new Date().toISOString().split('T')[0]);
            
            if (fromDate && toDate) {
                window.open(`riekikeisan.php?action=export_calculations&from_date=${fromDate}&to_date=${toDate}`);
            }
        }
        
        // ユーティリティ関数
        function formatCurrency(amount, currency = 'USD') {
            return new Intl.NumberFormat('ja-JP', {
                style: 'currency',
                currency: currency
            }).format(amount);
        }
        
        function formatPercentage(value) {
            return `${parseFloat(value).toFixed(2)}%`;
        }
        
        // エラーハンドリング
        window.addEventListener('error', function(event) {
            console.error('JavaScript エラー:', event.error);
        });
        
        console.log('拡張版利益計算システム JavaScript 読み込み完了');
    </script>
</body>
</html>