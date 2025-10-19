<?php
/**
 * Yahoo Auction Tool - 利益計算システム完全版
 * 
 * 機能:
 * - 階層型利益率設定システム
 * - eBayカテゴリー別手数料管理
 * - 為替レート自動取得・安全マージン適用
 * - 価格自動調整・計算履歴管理
 * - ROI分析・価格シミュレーション
 * 
 * @author Claude AI
 * @version 2.0.0
 * @date 2025-09-17
 */

// データベース接続設定
$host = 'localhost';
$dbname = 'yahoo_auction_tool';
$username = 'your_db_user';
$password = 'your_db_password';

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die('データベース接続エラー: ' . $e->getMessage());
}

// PriceCalculatorクラスの読み込み
require_once 'classes/PriceCalculator.php';

$calculator = new PriceCalculator($pdo);

// APIリクエスト処理
if (isset($_GET['action']) || isset($_POST['action'])) {
    $action = $_GET['action'] ?? $_POST['action'];
    header('Content-Type: application/json');
    
    switch ($action) {
        case 'calculate_advanced_profit':
            $result = handleAdvancedProfitCalculation($calculator);
            echo json_encode($result);
            exit;
            
        case 'get_category_fees':
            $categoryId = $_GET['category_id'] ?? 0;
            $result = $calculator->getEbayCategoryFees($categoryId);
            echo json_encode($result);
            exit;
            
        case 'get_exchange_rate':
            $result = $calculator->getCalculatedExchangeRate();
            echo json_encode($result);
            exit;
            
        case 'save_profit_settings':
            $result = saveProfitSettings($calculator);
            echo json_encode($result);
            exit;
            
        case 'get_calculation_history':
            $result = getCalculationHistory($pdo);
            echo json_encode($result);
            exit;
            
        case 'analyze_roi_advanced':
            $result = analyzeROI($pdo);
            echo json_encode($result);
            exit;
            
        case 'export_calculations':
            exportCalculationsCSV($pdo);
            exit;
            
        case 'load_initial_data':
            $result = loadInitialData($pdo);
            echo json_encode($result);
            exit;
    }
}

/**
 * 高度利益計算処理
 */
function handleAdvancedProfitCalculation($calculator) {
    try {
        $itemData = [
            'id' => $_POST['id'] ?? '',
            'price_jpy' => floatval($_POST['price_jpy'] ?? 0),
            'shipping_jpy' => floatval($_POST['shipping_jpy'] ?? 0),
            'category_id' => intval($_POST['category_id'] ?? 0),
            'condition' => $_POST['condition'] ?? 'Used',
            'days_since_listing' => intval($_POST['days_since_listing'] ?? 0)
        ];
        
        if ($itemData['price_jpy'] <= 0) {
            return ['success' => false, 'message' => '商品価格が正しく入力されていません。'];
        }
        
        $result = $calculator->calculateFinalPrice($itemData);
        
        return [
            'success' => true,
            'data' => $result,
            'message' => '高度利益計算完了'
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => '計算エラー: ' . $e->getMessage()
        ];
    }
}

/**
 * 利益率設定保存
 */
function saveProfitSettings($calculator) {
    try {
        $settingData = [
            'setting_type' => $_POST['setting_type'] ?? 'global',
            'target_value' => $_POST['target_value'] ?? 'default',
            'profit_margin_target' => floatval($_POST['profit_margin_target'] ?? 20.0),
            'minimum_profit_amount' => floatval($_POST['minimum_profit_amount'] ?? 5.0),
            'priority_order' => intval($_POST['priority_order'] ?? 999)
        ];
        
        $result = $calculator->saveProfitSetting($settingData);
        
        return [
            'success' => true,
            'data' => $result,
            'message' => '利益率設定を保存しました。'
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => '設定保存エラー: ' . $e->getMessage()
        ];
    }
}

/**
 * 計算履歴取得
 */
function getCalculationHistory($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                item_id,
                category_id,
                item_condition,
                price_jpy,
                recommended_price_usd,
                actual_profit_margin,
                roi,
                created_at
            FROM profit_calculations 
            ORDER BY created_at DESC 
            LIMIT 50
        ");
        $stmt->execute();
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => $history
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => '履歴取得エラー: ' . $e->getMessage()
        ];
    }
}

/**
 * ROI分析
 */
function analyzeROI($pdo) {
    try {
        // カテゴリー別分析
        $categoryStmt = $pdo->prepare("
            SELECT 
                ec.category_name,
                COUNT(*) as calculation_count,
                AVG(pc.actual_profit_margin) as avg_profit_margin,
                AVG(pc.roi) as avg_roi,
                AVG(pc.recommended_price_usd) as avg_price
            FROM profit_calculations pc
            LEFT JOIN ebay_categories ec ON pc.category_id = ec.category_id
            WHERE pc.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY ec.category_id, ec.category_name
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
                AVG(roi) as avg_roi
            FROM profit_calculations 
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY item_condition
            ORDER BY avg_roi DESC
        ");
        $conditionStmt->execute();
        $conditionAnalysis = $conditionStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // トレンド分析
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
        
        return [
            'success' => true,
            'data' => [
                'category_analysis' => $categoryAnalysis,
                'condition_analysis' => $conditionAnalysis,
                'trend_analysis' => $trendAnalysis
            ]
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'ROI分析エラー: ' . $e->getMessage()
        ];
    }
}

/**
 * 計算結果CSV出力
 */
function exportCalculationsCSV($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                item_id,
                category_id,
                item_condition,
                price_jpy,
                shipping_jpy,
                recommended_price_usd,
                estimated_profit_usd,
                actual_profit_margin,
                roi,
                total_fees_usd,
                created_at
            FROM profit_calculations 
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="profit_calculations_' . date('Y-m-d') . '.csv"');
        
        $output = fopen('php://output', 'w');
        
        // ヘッダー行
        fputcsv($output, [
            '商品ID',
            'カテゴリーID',
            'コンディション',
            '商品価格(円)',
            '送料(円)',
            '推奨価格(USD)',
            '予想利益(USD)',
            '利益率(%)',
            'ROI(%)',
            '総手数料(USD)',
            '計算日時'
        ]);
        
        // データ行
        foreach ($data as $row) {
            fputcsv($output, $row);
        }
        
        fclose($output);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'CSV出力エラー: ' . $e->getMessage()]);
    }
}

/**
 * 初期データロード
 */
function loadInitialData($pdo) {
    try {
        // eBayカテゴリー一覧取得
        $categoriesStmt = $pdo->prepare("
            SELECT category_id, category_name, final_value_fee, insertion_fee 
            FROM ebay_categories 
            WHERE active = TRUE 
            ORDER BY category_name
        ");
        $categoriesStmt->execute();
        $categories = $categoriesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 現在の為替レート取得
        $exchangeStmt = $pdo->prepare("
            SELECT rate, safety_margin, calculated_rate, recorded_at
            FROM exchange_rates
            WHERE currency_from = 'JPY' AND currency_to = 'USD'
            ORDER BY recorded_at DESC
            LIMIT 1
        ");
        $exchangeStmt->execute();
        $exchangeRate = $exchangeStmt->fetch(PDO::FETCH_ASSOC);
        
        // システム設定取得
        $settingsStmt = $pdo->prepare("
            SELECT setting_key, setting_value 
            FROM system_settings 
            WHERE setting_key IN ('default_safety_margin', 'global_profit_margin', 'minimum_profit_usd')
        ");
        $settingsStmt->execute();
        $settings = $settingsStmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        return [
            'success' => true,
            'data' => [
                'categories' => $categories,
                'exchange_rate' => $exchangeRate,
                'system_settings' => $settings
            ]
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => '初期データ取得エラー: ' . $e->getMessage()
        ];
    }
}

?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>利益計算システム完全版 - Yahoo Auction Tool</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        /* 完全版CSS - 改良されたスタイル */
        
        :root {
            --primary: #3b82f6;
            --primary-dark: #2563eb;
            --secondary: #6366f1;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --info: #06b6d4;
            
            --profit-primary: #f59e0b;
            --profit-secondary: #d97706;
            --profit-positive: #059669;
            --profit-negative: #dc2626;
            --profit-neutral: #6b7280;
            
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f1f5f9;
            --bg-hover: #e2e8f0;
            
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --text-white: #ffffff;
            
            --border: #e2e8f0;
            --border-hover: #cbd5e1;
            
            --radius-sm: 0.25rem;
            --radius-md: 0.5rem;
            --radius-lg: 0.75rem;
            --radius-xl: 1rem;
            
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            
            --space-xs: 0.25rem;
            --space-sm: 0.5rem;
            --space-md: 1rem;
            --space-lg: 1.5rem;
            --space-xl: 2rem;
            --space-2xl: 3rem;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--bg-primary);
            font-size: 1rem;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: var(--space-md);
            min-height: 100vh;
        }

        /* ナビゲーション */
        .navbar {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: var(--space-lg);
            border-radius: var(--radius-xl);
            margin-bottom: var(--space-xl);
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: var(--shadow-lg);
        }

        .nav-brand {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            font-size: 1.5rem;
            font-weight: 700;
        }

        .nav-brand i {
            background: linear-gradient(45deg, var(--profit-primary), var(--profit-secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 1.75rem;
        }

        .nav-status {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            font-size: 0.875rem;
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-sm) var(--space-md);
            background: rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--success);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* ページヘッダー */
        .page-header {
            background: linear-gradient(135deg, var(--profit-primary) 0%, var(--profit-secondary) 100%);
            color: white;
            padding: var(--space-2xl);
            border-radius: var(--radius-xl);
            margin-bottom: var(--space-xl);
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .page-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: rotate 20s linear infinite;
        }

        @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        .page-header h1 {
            font-size: 2.5rem;
            margin: 0 0 var(--space-md) 0;
            position: relative;
            z-index: 1;
        }

        .page-header p {
            font-size: 1.125rem;
            margin: 0;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }

        /* タブナビゲーション */
        .tab-navigation {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-sm);
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-sm);
            margin-bottom: var(--space-xl);
            box-shadow: var(--shadow-md);
            border: 1px solid var(--border);
        }

        .tab-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-sm);
            padding: var(--space-md) var(--space-lg);
            border: 1px solid transparent;
            background: transparent;
            color: var(--text-secondary);
            border-radius: var(--radius-md);
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            text-decoration: none;
        }

        .tab-btn:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
            border-color: var(--border-hover);
            transform: translateY(-1px);
        }

        .tab-btn.active {
            background: linear-gradient(135deg, var(--profit-primary), var(--profit-secondary));
            color: white;
            box-shadow: var(--shadow-md);
            transform: translateY(-2px);
        }

        .tab-btn i {
            font-size: 1rem;
        }

        /* タブコンテンツ */
        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
            animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* セクション */
        .section {
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            padding: var(--space-xl);
            margin-bottom: var(--space-xl);
            border: 1px solid var(--border);
            box-shadow: var(--shadow-sm);
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-lg);
            padding-bottom: var(--space-md);
            border-bottom: 2px solid var(--border);
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .section-title i {
            color: var(--profit-primary);
            font-size: 1.25rem;
        }

        /* フォーム */
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: var(--space-xl);
        }

        .form-section {
            background: var(--bg-tertiary);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            border: 1px solid var(--border);
        }

        .form-section h4 {
            color: var(--text-primary);
            margin-bottom: var(--space-md);
            font-size: 1.125rem;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .form-section h4 i {
            color: var(--profit-primary);
        }

        .form-group {
            margin-bottom: var(--space-lg);
        }

        .form-group label {
            display: block;
            margin-bottom: var(--space-sm);
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .form-group input,
        .form-group select {
            width: 100%;
            padding: var(--space-md);
            border: 2px solid var(--border);
            border-radius: var(--radius-md);
            font-size: 1rem;
            transition: all 0.2s ease;
            background: var(--bg-secondary);
            color: var(--text-primary);
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: var(--profit-primary);
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
        }

        /* ボタン */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-md) var(--space-lg);
            border: none;
            border-radius: var(--radius-md);
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            text-align: center;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--profit-primary), var(--profit-secondary));
            color: white;
            box-shadow: var(--shadow-md);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .btn-secondary {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 2px solid var(--border);
        }

        .btn-secondary:hover {
            background: var(--bg-hover);
            border-color: var(--border-hover);
        }

        .btn-info {
            background: linear-gradient(135deg, var(--info), #0891b2);
            color: white;
        }

        .btn-success {
            background: linear-gradient(135deg, var(--success), #047857);
            color: white;
        }

        .btn-warning {
            background: linear-gradient(135deg, var(--warning), #d97706);
            color: white;
        }

        .btn-danger {
            background: linear-gradient(135deg, var(--danger), #b91c1c);
            color: white;
        }

        .btn-group {
            display: flex;
            gap: var(--space-sm);
            flex-wrap: wrap;
        }

        /* 結果表示 */
        .result-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-lg);
            margin-top: var(--space-xl);
        }

        .result-card {
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
            border: 2px solid var(--border);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            text-align: center;
            transition: all 0.2s ease;
        }

        .result-card:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-lg);
            border-color: var(--profit-primary);
        }

        .result-value {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: var(--space-sm);
            color: var(--profit-positive);
        }

        .result-value.negative {
            color: var(--profit-negative);
        }

        .result-value.neutral {
            color: var(--profit-neutral);
        }

        .result-label {
            font-size: 0.875rem;
            color: var(--text-muted);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* 推奨事項 */
        .recommendation {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid var(--info);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-top: var(--space-xl);
            position: relative;
            overflow: hidden;
        }

        .recommendation::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(135deg, var(--info), #0284c7);
        }

        .recommendation-content {
            display: flex;
            align-items: flex-start;
            gap: var(--space-md);
        }

        .recommendation i {
            color: var(--info);
            font-size: 1.5rem;
            margin-top: 0.25rem;
        }

        .recommendation-text {
            flex: 1;
            font-weight: 500;
            line-height: 1.6;
            color: #0c4a6e;
        }

        /* データテーブル */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: var(--space-lg);
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
        }

        .data-table th,
        .data-table td {
            padding: var(--space-md);
            text-align: left;
            border-bottom: 1px solid var(--border);
        }

        .data-table th {
            background: var(--bg-tertiary);
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .data-table tr:hover {
            background: var(--bg-hover);
        }

        /* ローディング表示 */
        .loading {
            display: none;
            text-align: center;
            padding: var(--space-lg);
            color: var(--text-muted);
        }

        .loading.show {
            display: block;
        }

        .loading i {
            font-size: 2rem;
            animation: spin 1s linear infinite;
            color: var(--profit-primary);
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* エラー表示 */
        .error-message {
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border: 2px solid var(--danger);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin: var(--space-md) 0;
            color: #7f1d1d;
            display: none;
        }

        .error-message.show {
            display: block;
        }

        .error-message i {
            color: var(--danger);
            margin-right: var(--space-sm);
        }

        /* レスポンシブ */
        @media (max-width: 768px) {
            .container {
                padding: var(--space-sm);
            }
            
            .navbar {
                flex-direction: column;
                gap: var(--space-md);
                text-align: center;
            }

            .page-header h1 {
                font-size: 1.875rem;
            }

            .form-grid {
                grid-template-columns: 1fr;
            }

            .tab-navigation {
                grid-template-columns: 1fr;
            }

            .btn-group {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ナビゲーション -->
        <nav class="navbar">
            <div class="nav-brand">
                <i class="fas fa-calculator"></i>
                <span>利益計算システム完全版</span>
            </div>
            <div class="nav-status">
                <div class="status-indicator">
                    <div class="status-dot"></div>
                    <span>システム稼働中</span>
                </div>
                <div class="status-indicator">
                    <i class="fas fa-exchange-alt"></i>
                    <span id="currentRate">レート取得中...</span>
                </div>
            </div>
        </nav>

        <!-- ページヘッダー -->
        <div class="page-header">
            <h1><i class="fas fa-chart-line"></i> 出品前利益シミュレーション・完全版</h1>
            <p>階層型設定・価格帯別条件・ハイブリッド手数料管理・為替安全マージン対応</p>
        </div>

        <!-- エラーメッセージ -->
        <div id="errorMessage" class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <span id="errorText"></span>
        </div>

        <!-- タブナビゲーション -->
        <div class="tab-navigation">
            <button class="tab-btn active" data-tab="advanced-calculation">
                <i class="fas fa-calculator"></i> 高度計算
            </button>
            <button class="tab-btn" data-tab="settings-management">
                <i class="fas fa-cogs"></i> 設定管理
            </button>
            <button class="tab-btn" data-tab="calculation-history">
                <i class="fas fa-history"></i> 計算履歴
            </button>
            <button class="tab-btn" data-tab="roi-analysis">
                <i class="fas fa-chart-bar"></i> ROI分析
            </button>
            <button class="tab-btn" data-tab="price-simulation">
                <i class="fas fa-sliders-h"></i> 価格シミュレーション
            </button>
        </div>

        <!-- 高度計算タブ -->
        <div id="advanced-calculation" class="tab-content active">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-calculator"></i> 高度利益計算
                    </h3>
                    <div class="btn-group">
                        <button class="btn btn-secondary" onclick="clearAdvancedForm()">
                            <i class="fas fa-eraser"></i> クリア
                        </button>
                        <button class="btn btn-info" onclick="loadSampleAdvancedData()">
                            <i class="fas fa-file-import"></i> サンプル
                        </button>
                    </div>
                </div>

                <form id="advancedCalculationForm">
                    <div class="form-grid">
                        <!-- 商品情報 -->
                        <div class="form-section">
                            <h4><i class="fas fa-box"></i> 商品情報</h4>
                            
                            <div class="form-group">
                                <label>商品ID</label>
                                <input type="text" id="itemId" name="id" placeholder="例: ITEM-12345">
                            </div>
                            
                            <div class="form-group">
                                <label>商品価格 (円)</label>
                                <input type="number" id="itemPrice" name="price_jpy" placeholder="15000" required>
                            </div>
                            
                            <div class="form-group">
                                <label>送料 (円)</label>
                                <input type="number" id="shippingCost" name="shipping_jpy" placeholder="800" required>
                            </div>
                            
                            <div class="form-group">
                                <label>eBayカテゴリー</label>
                                <select id="ebayCategory" name="category_id" required>
                                    <option value="">カテゴリーを選択...</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>商品コンディション</label>
                                <select id="itemCondition" name="condition" required>
                                    <option value="New">新品</option>
                                    <option value="Used" selected>中古</option>
                                    <option value="Refurbished">リファビッシュ品</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>出品経過日数</label>
                                <input type="number" id="daysSinceListing" name="days_since_listing" value="0" min="0">
                            </div>
                        </div>

                        <!-- 計算設定表示 -->
                        <div class="form-section">
                            <h4><i class="fas fa-cog"></i> 適用される設定</h4>
                            
                            <div id="appliedSettingsDisplay" style="background: var(--bg-secondary); padding: var(--space-md); border-radius: var(--radius-md); border: 1px solid var(--border);">
                                <div class="loading">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>設定を読み込み中...</p>
                                </div>
                            </div>
                            
                            <div style="margin-top: var(--space-md);">
                                <h5>現在の為替レート</h5>
                                <div id="exchangeRateDisplay" style="background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%); padding: var(--space-md); border-radius: var(--radius-md); border: 2px solid var(--warning);">
                                    <div class="loading">
                                        <i class="fas fa-spinner fa-spin"></i>
                                        <span>レート取得中...</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 計算実行 -->
                        <div class="form-section">
                            <h4><i class="fas fa-play"></i> 計算実行</h4>
                            
                            <div class="btn-group" style="margin-top: var(--space-md);">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-calculator"></i> 高度計算実行
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

                <!-- 計算結果 -->
                <div id="calculationResults" style="display: none;">
                    <div class="result-grid">
                        <div class="result-card">
                            <div class="result-value" id="recommendedPrice">$0.00</div>
                            <div class="result-label">推奨販売価格</div>
                        </div>
                        <div class="result-card">
                            <div class="result-value" id="estimatedProfit">$0.00</div>
                            <div class="result-label">予想利益</div>
                        </div>
                        <div class="result-card">
                            <div class="result-value" id="actualProfitMargin">0.0%</div>
                            <div class="result-label">実利益率</div>
                        </div>
                        <div class="result-card">
                            <div class="result-value" id="roiValue">0.0%</div>
                            <div class="result-label">ROI</div>
                        </div>
                        <div class="result-card">
                            <div class="result-value" id="totalFees">$0.00</div>
                            <div class="result-label">総手数料</div>
                        </div>
                        <div class="result-card">
                            <div class="result-value" id="totalCostUsd">$0.00</div>
                            <div class="result-label">総コスト</div>
                        </div>
                    </div>

                    <!-- 推奨事項 -->
                    <div class="recommendation">
                        <div class="recommendation-content">
                            <i class="fas fa-lightbulb"></i>
                            <div class="recommendation-text" id="recommendationText">
                                計算結果に基づく推奨事項がここに表示されます。
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 設定管理タブ -->
        <div id="settings-management" class="tab-content">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-cogs"></i> 利益率設定管理
                    </h3>
                    <button class="btn btn-primary" onclick="openSettingsModal()">
                        <i class="fas fa-plus"></i> 新規設定追加
                    </button>
                </div>

                <div id="settingsContent">
                    <!-- 設定一覧がここに動的に読み込まれます -->
                </div>
            </div>
        </div>

        <!-- 計算履歴タブ -->
        <div id="calculation-history" class="tab-content">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-history"></i> 計算履歴
                    </h3>
                    <div class="btn-group">
                        <button class="btn btn-info" onclick="refreshCalculationHistory()">
                            <i class="fas fa-sync"></i> 更新
                        </button>
                        <button class="btn btn-success" onclick="exportCalculationHistory()">
                            <i class="fas fa-download"></i> CSV出力
                        </button>
                    </div>
                </div>

                <div id="historyContent">
                    <!-- 履歴がここに動的に読み込まれます -->
                </div>
            </div>
        </div>

        <!-- ROI分析タブ -->
        <div id="roi-analysis" class="tab-content">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-chart-bar"></i> ROI分析
                    </h3>
                    <button class="btn btn-info" onclick="refreshROIAnalysis()">
                        <i class="fas fa-sync"></i> 分析更新
                    </button>
                </div>

                <div id="roiAnalysisContent">
                    <!-- ROI分析結果がここに動的に読み込まれます -->
                </div>
            </div>
        </div>

        <!-- 価格シミュレーションタブ -->
        <div id="price-simulation" class="tab-content">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-sliders-h"></i> 価格シミュレーション
                    </h3>
                </div>

                <div id="simulationContent">
                    <p>価格シミュレーション機能は開発中です。</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        // グローバル変数
        let currentExchangeRate = null;
        let systemSettings = {};
        let ebayCategories = [];

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('利益計算システム完全版 初期化開始');
            
            // タブ切り替えイベント
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const targetTab = this.dataset.tab;
                    switchTab(targetTab);
                });
            });

            // フォーム送信イベント
            document.getElementById('advancedCalculationForm').addEventListener('submit', function(e) {
                e.preventDefault();
                performAdvancedCalculation();
            });

            // 初期データ読み込み
            loadInitialData();
        });

        // タブ切り替え
        function switchTab(tabName) {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
            document.getElementById(tabName).classList.add('active');

            // タブ固有の初期化処理
            initializeTabContent(tabName);
        }

        // タブコンテンツ初期化
        function initializeTabContent(tabName) {
            switch(tabName) {
                case 'calculation-history':
                    loadCalculationHistory();
                    break;
                case 'roi-analysis':
                    loadROIAnalysis();
                    break;
                case 'settings-management':
                    loadSettingsManagement();
                    break;
            }
        }

        // 初期データ読み込み
        async function loadInitialData() {
            try {
                showLoading('初期データを読み込み中...');
                
                const response = await fetch('riekikeisan.php?action=load_initial_data');
                const result = await response.json();
                
                if (result.success) {
                    ebayCategories = result.data.categories;
                    currentExchangeRate = result.data.exchange_rate;
                    systemSettings = result.data.system_settings;
                    
                    populateCategorySelect();
                    updateExchangeRateDisplay();
                    updateNavStatus();
                } else {
                    showError('初期データの読み込みに失敗しました: ' + result.message);
                }
            } catch (error) {
                console.error('初期データ読み込みエラー:', error);
                showError('システムエラーが発生しました。');
            } finally {
                hideLoading();
            }
        }

        // カテゴリーセレクト要素の生成
        function populateCategorySelect() {
            const select = document.getElementById('ebayCategory');
            select.innerHTML = '<option value="">カテゴリーを選択...</option>';
            
            ebayCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_id;
                option.textContent = `${category.category_name} (${category.final_value_fee}% + $${category.insertion_fee})`;
                select.appendChild(option);
            });
        }

        // 為替レート表示更新
        function updateExchangeRateDisplay() {
            if (currentExchangeRate) {
                document.getElementById('currentRate').textContent = 
                    `1 USD = ¥${currentExchangeRate.calculated_rate.toFixed(2)}`;
                    
                const display = document.getElementById('exchangeRateDisplay');
                display.innerHTML = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm);">
                        <div>
                            <strong>基本レート:</strong><br>
                            1 USD = ¥${currentExchangeRate.base_rate.toFixed(2)}
                        </div>
                        <div>
                            <strong>計算用レート:</strong><br>
                            1 USD = ¥${currentExchangeRate.calculated_rate.toFixed(2)}
                        </div>
                    </div>
                    <div style="margin-top: var(--space-sm); font-size: 0.875rem; color: var(--text-muted);">
                        安全マージン: +${currentExchangeRate.safety_margin}% | 
                        取得日時: ${new Date(currentExchangeRate.recorded_at).toLocaleString()}
                    </div>
                `;
            }
        }

        // ナビステータス更新
        function updateNavStatus() {
            if (currentExchangeRate) {
                const rateAge = new Date() - new Date(currentExchangeRate.recorded_at);
                const hoursAge = rateAge / (1000 * 60 * 60);
                
                const statusDot = document.querySelector('.status-dot');
                if (hoursAge > 24) {
                    statusDot.style.background = 'var(--warning)';
                } else if (hoursAge > 48) {
                    statusDot.style.background = 'var(--danger)';
                }
            }
        }

        // 高度計算実行
        async function performAdvancedCalculation() {
            try {
                showLoading('計算実行中...');
                hideError();
                
                const formData = new FormData(document.getElementById('advancedCalculationForm'));
                formData.append('action', 'calculate_advanced_profit');
                
                const response = await fetch('riekikeisan.php', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    displayCalculationResults(result.data);
                } else {
                    showError(result.message);
                }
                
            } catch (error) {
                console.error('計算エラー:', error);
                showError('計算処理中にエラーが発生しました。');
            } finally {
                hideLoading();
            }
        }

        // 計算結果表示
        function displayCalculationResults(data) {
            const resultsDiv = document.getElementById('calculationResults');
            
            // 結果値の更新
            document.getElementById('recommendedPrice').textContent = `$${data.results.recommended_price_usd.toFixed(2)}`;
            document.getElementById('estimatedProfit').textContent = `$${data.results.estimated_profit_usd.toFixed(2)}`;
            document.getElementById('actualProfitMargin').textContent = `${data.results.actual_profit_margin.toFixed(1)}%`;
            document.getElementById('roiValue').textContent = `${data.results.roi.toFixed(1)}%`;
            document.getElementById('totalFees').textContent = `$${data.results.total_fees_usd.toFixed(2)}`;
            document.getElementById('totalCostUsd').textContent = `$${data.results.total_cost_usd.toFixed(2)}`;

            // 色分け
            updateResultCardColors(data.results);

            // 推奨事項
            const recommendationText = generateRecommendationText(data.results);
            document.getElementById('recommendationText').textContent = recommendationText;

            // 結果表示
            resultsDiv.style.display = 'block';
            resultsDiv.scrollIntoView({ behavior: 'smooth' });
        }

        // 結果カードの色更新
        function updateResultCardColors(results) {
            const profitElement = document.getElementById('estimatedProfit');
            const marginElement = document.getElementById('actualProfitMargin');
            const roiElement = document.getElementById('roiValue');

            // 利益の色分け
            profitElement.className = 'result-value ' + 
                (results.estimated_profit_usd > 0 ? '' : 'negative');

            // 利益率の色分け
            const marginClass = results.actual_profit_margin > 20 ? '' : 
                                results.actual_profit_margin > 10 ? 'neutral' : 'negative';
            marginElement.className = 'result-value ' + marginClass;

            // ROIの色分け
            const roiClass = results.roi > 25 ? '' : 
                            results.roi > 15 ? 'neutral' : 'negative';
            roiElement.className = 'result-value ' + roiClass;
        }

        // 推奨事項テキスト生成
        function generateRecommendationText(results) {
            if (results.estimated_profit_usd <= 0) {
                return '⚠️ この設定では損失が発生します。販売価格を上げるか、より安価な商品を選択してください。';
            } else if (results.actual_profit_margin < 10) {
                return '🔴 利益率が非常に低いです。リスクを考慮すると推奨できません。価格を見直してください。';
            } else if (results.actual_profit_margin < 20) {
                return '🟡 利益率が低めです。販売価格を上げるか、コストを削減することを検討してください。';
            } else if (results.actual_profit_margin < 30) {
                return '✅ 標準的な利益率です。この設定で進めても問題ありませんが、さらなる最適化の余地があります。';
            } else {
                return '🎉 優秀な利益率です！この価格設定を維持し、同様の商品の仕入れを増やすことを検討してください。';
            }
        }

        // 計算履歴読み込み
        async function loadCalculationHistory() {
            try {
                showLoading('履歴を読み込み中...');
                
                const response = await fetch('riekikeisan.php?action=get_calculation_history');
                const result = await response.json();
                
                if (result.success) {
                    displayCalculationHistory(result.data);
                } else {
                    showError('履歴の読み込みに失敗しました: ' + result.message);
                }
            } catch (error) {
                console.error('履歴読み込みエラー:', error);
                showError('履歴の読み込み中にエラーが発生しました。');
            } finally {
                hideLoading();
            }
        }

        // 計算履歴表示
        function displayCalculationHistory(historyData) {
            const content = document.getElementById('historyContent');
            
            if (historyData.length === 0) {
                content.innerHTML = '<p>計算履歴はありません。</p>';
                return;
            }

            const table = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>商品ID</th>
                            <th>カテゴリー</th>
                            <th>コンディション</th>
                            <th>商品価格</th>
                            <th>推奨価格</th>
                            <th>利益率</th>
                            <th>ROI</th>
                            <th>計算日時</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historyData.map(item => `
                            <tr>
                                <td>${item.item_id || '-'}</td>
                                <td>${item.category_id}</td>
                                <td>${item.item_condition}</td>
                                <td>¥${parseInt(item.price_jpy).toLocaleString()}</td>
                                <td>$${parseFloat(item.recommended_price_usd).toFixed(2)}</td>
                                <td class="${getMarginColorClass(item.actual_profit_margin)}">${parseFloat(item.actual_profit_margin).toFixed(1)}%</td>
                                <td class="${getROIColorClass(item.roi)}">${parseFloat(item.roi).toFixed(1)}%</td>
                                <td>${new Date(item.created_at).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            content.innerHTML = table;
        }

        // 利益率の色クラス取得
        function getMarginColorClass(margin) {
            const m = parseFloat(margin);
            if (m > 20) return 'text-success';
            if (m > 10) return 'text-warning';
            return 'text-danger';
        }

        // ROIの色クラス取得
        function getROIColorClass(roi) {
            const r = parseFloat(roi);
            if (r > 25) return 'text-success';
            if (r > 15) return 'text-warning';
            return 'text-danger';
        }

        // ROI分析読み込み
        async function loadROIAnalysis() {
            try {
                showLoading('ROI分析中...');
                
                const response = await fetch('riekikeisan.php?action=analyze_roi_advanced');
                const result = await response.json();
                
                if (result.success) {
                    displayROIAnalysis(result.data);
                } else {
                    showError('ROI分析に失敗しました: ' + result.message);
                }
            } catch (error) {
                console.error('ROI分析エラー:', error);
                showError('ROI分析中にエラーが発生しました。');
            } finally {
                hideLoading();
            }
        }

        // ROI分析結果表示
        function displayROIAnalysis(analysisData) {
            const content = document.getElementById('roiAnalysisContent');
            
            const html = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-xl);">
                    <div class="form-section">
                        <h4><i class="fas fa-tags"></i> カテゴリー別分析</h4>
                        ${displayCategoryAnalysis(analysisData.category_analysis)}
                    </div>
                    
                    <div class="form-section">
                        <h4><i class="fas fa-star"></i> コンディション別分析</h4>
                        ${displayConditionAnalysis(analysisData.condition_analysis)}
                    </div>
                    
                    <div class="form-section">
                        <h4><i class="fas fa-chart-line"></i> トレンド分析</h4>
                        ${displayTrendAnalysis(analysisData.trend_analysis)}
                    </div>
                </div>
            `;
            
            content.innerHTML = html;
        }

        // カテゴリー別分析表示
        function displayCategoryAnalysis(data) {
            if (!data || data.length === 0) {
                return '<p>分析データがありません。</p>';
            }

            return `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>カテゴリー</th>
                            <th>計算回数</th>
                            <th>平均利益率</th>
                            <th>平均ROI</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(cat => `
                            <tr>
                                <td>${cat.category_name || 'Unknown'}</td>
                                <td>${cat.calculation_count}</td>
                                <td class="${getMarginColorClass(cat.avg_profit_margin)}">${parseFloat(cat.avg_profit_margin).toFixed(1)}%</td>
                                <td class="${getROIColorClass(cat.avg_roi)}">${parseFloat(cat.avg_roi).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        // コンディション別分析表示
        function displayConditionAnalysis(data) {
            if (!data || data.length === 0) {
                return '<p>分析データがありません。</p>';
            }

            return `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>コンディション</th>
                            <th>計算回数</th>
                            <th>平均利益率</th>
                            <th>平均ROI</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(cond => `
                            <tr>
                                <td>${cond.item_condition}</td>
                                <td>${cond.calculation_count}</td>
                                <td class="${getMarginColorClass(cond.avg_profit_margin)}">${parseFloat(cond.avg_profit_margin).toFixed(1)}%</td>
                                <td class="${getROIColorClass(cond.avg_roi)}">${parseFloat(cond.avg_roi).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        // トレンド分析表示
        function displayTrendAnalysis(data) {
            if (!data || data.length === 0) {
                return '<p>分析データがありません。</p>';
            }

            return `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>日付</th>
                            <th>計算回数</th>
                            <th>平均利益率</th>
                            <th>平均ROI</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(trend => `
                            <tr>
                                <td>${trend.calculation_date}</td>
                                <td>${trend.daily_calculations}</td>
                                <td class="${getMarginColorClass(trend.avg_profit_margin)}">${parseFloat(trend.avg_profit_margin).toFixed(1)}%</td>
                                <td class="${getROIColorClass(trend.avg_roi)}">${parseFloat(trend.avg_roi).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        // 設定管理読み込み
        function loadSettingsManagement() {
            const content = document.getElementById('settingsContent');
            content.innerHTML = `
                <div class="form-section">
                    <h4><i class="fas fa-layer-group"></i> 階層設定システム</h4>
                    <p>設定管理機能は開発中です。現在は基本的な利益率設定のみ対応しています。</p>
                </div>
            `;
        }

        // サンプルデータ読み込み
        function loadSampleAdvancedData() {
            document.getElementById('itemId').value = 'SAMPLE-001';
            document.getElementById('itemPrice').value = '15000';
            document.getElementById('shippingCost').value = '800';
            document.getElementById('itemCondition').value = 'Used';
            document.getElementById('daysSinceListing').value = '7';
            
            // カテゴリーが読み込まれている場合は設定
            if (ebayCategories.length > 0) {
                document.getElementById('ebayCategory').value = ebayCategories[0].category_id;
            }
        }

        // フォームクリア
        function clearAdvancedForm() {
            document.getElementById('advancedCalculationForm').reset();
            document.getElementById('calculationResults').style.display = 'none';
            hideError();
        }

        // 計算履歴更新
        function refreshCalculationHistory() {
            loadCalculationHistory();
        }

        // 計算履歴CSV出力
        function exportCalculationHistory() {
            window.open('riekikeisan.php?action=export_calculations', '_blank');
        }

        // ROI分析更新
        function refreshROIAnalysis() {
            loadROIAnalysis();
        }

        // ユーティリティ関数
        function showLoading(message) {
            // 実装: ローディング表示
            console.log('Loading:', message);
        }

        function hideLoading() {
            // 実装: ローディング非表示
            console.log('Loading hidden');
        }

        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            const errorText = document.getElementById('errorText');
            errorText.textContent = message;
            errorDiv.classList.add('show');
        }

        function hideError() {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.classList.remove('show');
        }

        // 設定モーダル開く（未実装）
        function openSettingsModal() {
            alert('設定管理機能は開発中です。');
        }

        // CSSクラス追加
        const additionalStyles = `
            .text-success { color: var(--profit-positive) !important; }
            .text-warning { color: var(--profit-neutral) !important; }
            .text-danger { color: var(--profit-negative) !important; }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = additionalStyles;
        document.head.appendChild(styleSheet);

        console.log('利益計算システム完全版 JavaScript初期化完了');
    </script>
</body>
</html>