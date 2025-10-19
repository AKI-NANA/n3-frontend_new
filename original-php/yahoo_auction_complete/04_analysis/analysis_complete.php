<?php
/**
 * Yahoo Auction Complete - データ分析システム 完全版
 * 総合分析・予測分析・トレンド分析・収益性分析・競合分析
 */

// エラーハンドリングとセキュリティ
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// データベース接続
function getDatabaseConnection() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        return null;
    }
}

// API処理
if (isset($_GET['action']) || isset($_POST['action'])) {
    $action = $_GET['action'] ?? $_POST['action'];
    header('Content-Type: application/json');
    
    try {
        switch ($action) {
            case 'get_overview_stats':
                echo json_encode(getOverviewStats());
                break;
                
            case 'get_price_trends':
                $period = $_GET['period'] ?? '30';
                echo json_encode(getPriceTrends($period));
                break;
                
            case 'get_category_analysis':
                echo json_encode(getCategoryAnalysis());
                break;
                
            case 'get_profit_analysis':
                echo json_encode(getProfitAnalysis());
                break;
                
            case 'get_conversion_rates':
                echo json_encode(getConversionRates());
                break;
                
            case 'get_competitive_analysis':
                $category = $_GET['category'] ?? '';
                echo json_encode(getCompetitiveAnalysis($category));
                break;
                
            case 'get_prediction_data':
                $type = $_GET['type'] ?? 'sales';
                echo json_encode(getPredictionData($type));
                break;
                
            case 'get_performance_metrics':
                echo json_encode(getPerformanceMetrics());
                break;
                
            case 'export_report':
                $format = $_GET['format'] ?? 'csv';
                $reportType = $_GET['report_type'] ?? 'overview';
                echo json_encode(exportReport($reportType, $format));
                break;
                
            default:
                echo json_encode(['error' => 'Invalid action']);
        }
    } catch (Exception $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// 概要統計取得
function getOverviewStats() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        $stats = [];
        
        // 基本統計
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved_products,
                COUNT(CASE WHEN listing_status = 'listed' THEN 1 END) as listed_products,
                COUNT(CASE WHEN DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_products
            FROM yahoo_scraped_products
        ");
        
        $basicStats = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats = array_merge($stats, $basicStats);
        
        // 価格統計
        $stmt = $pdo->query("
            SELECT 
                AVG(price_jpy) as avg_price_jpy,
                AVG(price_usd) as avg_price_usd,
                MIN(price_jpy) as min_price_jpy,
                MAX(price_jpy) as max_price_jpy,
                STDDEV(price_jpy) as price_std_dev
            FROM yahoo_scraped_products 
            WHERE price_jpy > 0
        ");
        
        $priceStats = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats = array_merge($stats, $priceStats);
        
        // 利益率統計
        $stmt = $pdo->query("
            SELECT 
                AVG(CASE 
                    WHEN price_jpy > 0 AND price_usd > 0 
                    THEN ((price_usd * 150) - price_jpy) / price_jpy * 100 
                    ELSE NULL 
                END) as avg_profit_rate,
                COUNT(CASE 
                    WHEN price_jpy > 0 AND price_usd > 0 AND ((price_usd * 150) - price_jpy) > 0 
                    THEN 1 
                END) as profitable_products
            FROM yahoo_scraped_products
        ");
        
        $profitStats = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats = array_merge($stats, $profitStats);
        
        // 処理効率統計
        $stats['approval_rate'] = $basicStats['total_products'] > 0 ? 
            ($basicStats['approved_products'] / $basicStats['total_products']) * 100 : 0;
        $stats['listing_rate'] = $basicStats['approved_products'] > 0 ? 
            ($basicStats['listed_products'] / $basicStats['approved_products']) * 100 : 0;
        
        return [
            'success' => true,
            'stats' => $stats,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// 価格トレンド分析
function getPriceTrends($period = '30') {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        $stmt = $pdo->prepare("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as product_count,
                AVG(price_jpy) as avg_price_jpy,
                AVG(price_usd) as avg_price_usd,
                MIN(price_jpy) as min_price,
                MAX(price_jpy) as max_price
            FROM yahoo_scraped_products 
            WHERE created_at >= CURRENT_DATE - INTERVAL ? DAY
            AND price_jpy > 0
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        ");
        
        $stmt->execute([$period]);
        $trends = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 移動平均計算
        $movingAverage = calculateMovingAverage($trends, 'avg_price_jpy', 7);
        
        return [
            'success' => true,
            'trends' => $trends,
            'moving_average' => $movingAverage,
            'period' => $period
        ];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// カテゴリー分析
function getCategoryAnalysis() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        $stmt = $pdo->query("
            SELECT 
                category_name,
                COUNT(*) as product_count,
                AVG(price_jpy) as avg_price,
                AVG(CASE 
                    WHEN price_jpy > 0 AND price_usd > 0 
                    THEN ((price_usd * 150) - price_jpy) / price_jpy * 100 
                    ELSE NULL 
                END) as avg_profit_rate,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN listing_status = 'listed' THEN 1 END) as listed_count
            FROM yahoo_scraped_products 
            WHERE category_name IS NOT NULL 
            GROUP BY category_name
            HAVING COUNT(*) >= 3
            ORDER BY product_count DESC
            LIMIT 20
        ");
        
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // カテゴリー別パフォーマンス指標計算
        foreach ($categories as &$category) {
            $category['approval_rate'] = $category['product_count'] > 0 ? 
                ($category['approved_count'] / $category['product_count']) * 100 : 0;
            $category['listing_rate'] = $category['approved_count'] > 0 ? 
                ($category['listed_count'] / $category['approved_count']) * 100 : 0;
            $category['overall_score'] = calculateCategoryScore($category);
        }
        
        return [
            'success' => true,
            'categories' => $categories
        ];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// 利益分析
function getProfitAnalysis() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        // 利益率分布
        $stmt = $pdo->query("
            SELECT 
                CASE 
                    WHEN profit_rate < 0 THEN 'Loss'
                    WHEN profit_rate >= 0 AND profit_rate < 10 THEN '0-10%'
                    WHEN profit_rate >= 10 AND profit_rate < 20 THEN '10-20%'
                    WHEN profit_rate >= 20 AND profit_rate < 50 THEN '20-50%'
                    WHEN profit_rate >= 50 AND profit_rate < 100 THEN '50-100%'
                    ELSE '100%+'
                END as profit_range,
                COUNT(*) as count
            FROM (
                SELECT 
                    CASE 
                        WHEN price_jpy > 0 AND price_usd > 0 
                        THEN ((price_usd * 150) - price_jpy) / price_jpy * 100 
                        ELSE NULL 
                    END as profit_rate
                FROM yahoo_scraped_products
                WHERE price_jpy > 0 AND price_usd > 0
            ) profit_data
            WHERE profit_rate IS NOT NULL
            GROUP BY profit_range
            ORDER BY 
                CASE profit_range
                    WHEN 'Loss' THEN 1
                    WHEN '0-10%' THEN 2
                    WHEN '10-20%' THEN 3
                    WHEN '20-50%' THEN 4
                    WHEN '50-100%' THEN 5
                    ELSE 6
                END
        ");
        
        $profitDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 高利益商品トップ10
        $stmt = $pdo->query("
            SELECT 
                title,
                price_jpy,
                price_usd,
                category_name,
                ((price_usd * 150) - price_jpy) as profit_jpy,
                ((price_usd * 150) - price_jpy) / price_jpy * 100 as profit_rate
            FROM yahoo_scraped_products 
            WHERE price_jpy > 0 AND price_usd > 0
            ORDER BY profit_rate DESC
            LIMIT 10
        ");
        
        $topProfitProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'profit_distribution' => $profitDistribution,
            'top_profit_products' => $topProfitProducts
        ];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// コンバージョン率分析
function getConversionRates() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        // 日別コンバージョン率
        $stmt = $pdo->query("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as scraped,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN listing_status = 'listed' THEN 1 END) as listed,
                COUNT(CASE WHEN sale_status = 'sold' THEN 1 END) as sold
            FROM yahoo_scraped_products 
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        ");
        
        $dailyRates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // コンバージョン率計算
        foreach ($dailyRates as &$rate) {
            $rate['approval_rate'] = $rate['scraped'] > 0 ? ($rate['approved'] / $rate['scraped']) * 100 : 0;
            $rate['listing_rate'] = $rate['approved'] > 0 ? ($rate['listed'] / $rate['approved']) * 100 : 0;
            $rate['sale_rate'] = $rate['listed'] > 0 ? ($rate['sold'] / $rate['listed']) * 100 : 0;
        }
        
        return [
            'success' => true,
            'daily_rates' => $dailyRates
        ];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// 競合分析
function getCompetitiveAnalysis($category = '') {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        $whereClause = '';
        $params = [];
        
        if (!empty($category)) {
            $whereClause = 'WHERE category_name = ?';
            $params[] = $category;
        }
        
        // 価格競争力分析
        $stmt = $pdo->prepare("
            SELECT 
                price_range,
                COUNT(*) as product_count,
                AVG(approval_rate) as avg_approval_rate
            FROM (
                SELECT 
                    CASE 
                        WHEN price_jpy < 1000 THEN 'Under 1K'
                        WHEN price_jpy < 5000 THEN '1K-5K'
                        WHEN price_jpy < 10000 THEN '5K-10K'
                        WHEN price_jpy < 50000 THEN '10K-50K'
                        ELSE 'Over 50K'
                    END as price_range,
                    CASE WHEN approval_status = 'approved' THEN 100.0 ELSE 0.0 END as approval_rate
                FROM yahoo_scraped_products 
                {$whereClause}
                AND price_jpy > 0
            ) price_analysis
            GROUP BY price_range
            ORDER BY 
                CASE price_range
                    WHEN 'Under 1K' THEN 1
                    WHEN '1K-5K' THEN 2
                    WHEN '5K-10K' THEN 3
                    WHEN '10K-50K' THEN 4
                    ELSE 5
                END
        ");
        
        $stmt->execute($params);
        $priceCompetitiveness = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'price_competitiveness' => $priceCompetitiveness,
            'category' => $category
        ];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// 予測データ
function getPredictionData($type = 'sales') {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        // 過去30日のデータを基に予測
        $stmt = $pdo->query("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as daily_count,
                AVG(price_jpy) as avg_price
            FROM yahoo_scraped_products 
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
        
        $historicalData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 簡単な線形予測
        $predictions = generateSimplePrediction($historicalData, $type);
        
        return [
            'success' => true,
            'historical_data' => $historicalData,
            'predictions' => $predictions,
            'type' => $type
        ];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// パフォーマンス指標
function getPerformanceMetrics() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['error' => 'Database connection failed'];
        }
        
        // 時間別処理効率
        $stmt = $pdo->query("
            SELECT 
                EXTRACT(HOUR FROM created_at) as hour,
                COUNT(*) as product_count,
                AVG(CASE WHEN approval_status = 'approved' THEN 1.0 ELSE 0.0 END) * 100 as approval_rate
            FROM yahoo_scraped_products 
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY EXTRACT(HOUR FROM created_at)
            ORDER BY hour
        ");
        
        $hourlyMetrics = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 週別トレンド
        $stmt = $pdo->query("
            SELECT 
                EXTRACT(DOW FROM created_at) as day_of_week,
                COUNT(*) as product_count,
                AVG(price_jpy) as avg_price
            FROM yahoo_scraped_products 
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY EXTRACT(DOW FROM created_at)
            ORDER BY day_of_week
        ");
        
        $weeklyMetrics = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'hourly_metrics' => $hourlyMetrics,
            'weekly_metrics' => $weeklyMetrics
        ];
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// レポートエクスポート
function exportReport($reportType, $format) {
    try {
        $data = [];
        
        switch ($reportType) {
            case 'overview':
                $data = getOverviewStats();
                break;
            case 'category':
                $data = getCategoryAnalysis();
                break;
            case 'profit':
                $data = getProfitAnalysis();
                break;
            default:
                return ['error' => 'Invalid report type'];
        }
        
        if ($format === 'csv') {
            $csvData = convertToCSV($data);
            return [
                'success' => true,
                'csv_data' => $csvData,
                'filename' => $reportType . '_report_' . date('Y-m-d') . '.csv'
            ];
        }
        
        return $data;
        
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// ヘルパー関数

// 移動平均計算
function calculateMovingAverage($data, $field, $window) {
    $movingAverage = [];
    $count = count($data);
    
    for ($i = 0; $i < $count; $i++) {
        $start = max(0, $i - $window + 1);
        $values = array_slice($data, $start, $i - $start + 1);
        $avg = array_sum(array_column($values, $field)) / count($values);
        $movingAverage[] = [
            'date' => $data[$i]['date'],
            'moving_avg' => $avg
        ];
    }
    
    return $movingAverage;
}

// カテゴリースコア計算
function calculateCategoryScore($category) {
    $score = 0;
    $score += ($category['approval_rate'] ?? 0) * 0.3;
    $score += ($category['listing_rate'] ?? 0) * 0.3;
    $score += min(($category['avg_profit_rate'] ?? 0), 100) * 0.4;
    return round($score, 2);
}

// 簡単な予測生成
function generateSimplePrediction($historicalData, $type) {
    if (count($historicalData) < 2) {
        return [];
    }
    
    $field = $type === 'sales' ? 'daily_count' : 'avg_price';
    $values = array_column($historicalData, $field);
    
    // 線形トレンド計算
    $n = count($values);
    $x = range(1, $n);
    $sumX = array_sum($x);
    $sumY = array_sum($values);
    $sumXY = 0;
    $sumX2 = 0;
    
    for ($i = 0; $i < $n; $i++) {
        $sumXY += $x[$i] * $values[$i];
        $sumX2 += $x[$i] * $x[$i];
    }
    
    $slope = ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);
    $intercept = ($sumY - $slope * $sumX) / $n;
    
    // 今後7日の予測
    $predictions = [];
    for ($i = 1; $i <= 7; $i++) {
        $futureX = $n + $i;
        $predictedValue = $slope * $futureX + $intercept;
        $predictions[] = [
            'date' => date('Y-m-d', strtotime("+{$i} days")),
            'predicted_value' => max(0, round($predictedValue, 2))
        ];
    }
    
    return $predictions;
}

// CSV変換
function convertToCSV($data) {
    if (!isset($data['success']) || !$data['success']) {
        return '';
    }
    
    $output = '';
    $headers = [];
    $rows = [];
    
    if (isset($data['stats'])) {
        $headers = array_keys($data['stats']);
        $rows[] = array_values($data['stats']);
    } elseif (isset($data['categories'])) {
        if (!empty($data['categories'])) {
            $headers = array_keys($data['categories'][0]);
            foreach ($data['categories'] as $category) {
                $rows[] = array_values($category);
            }
        }
    }
    
    if (!empty($headers)) {
        $output .= implode(',', $headers) . "\n";
        foreach ($rows as $row) {
            $output .= implode(',', $row) . "\n";
        }
    }
    
    return $output;
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>データ分析システム - Yahoo Auction Complete</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    <style>
        :root {
            --primary-color: #2563eb;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --info-color: #06b6d4;
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --border-color: #e2e8f0;
            --radius-md: 0.5rem;
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 1rem;
        }

        .header {
            background: linear-gradient(135deg, var(--primary-color), var(--info-color));
            color: white;
            padding: 2rem;
            border-radius: var(--radius-md);
            margin-bottom: 2rem;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }

        .tabs {
            display: flex;
            background: var(--bg-secondary);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md);
            margin-bottom: 2rem;
            overflow: hidden;
        }

        .tab-button {
            flex: 1;
            padding: 1rem;
            border: none;
            background: transparent;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
            border-bottom: 3px solid transparent;
        }

        .tab-button.active {
            background: var(--primary-color);
            color: white;
            border-bottom-color: var(--info-color);
        }

        .tab-button:hover:not(.active) {
            background: var(--bg-primary);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: var(--bg-secondary);
            padding: 1.5rem;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md);
            text-align: center;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }

        .stat-value.primary { color: var(--primary-color); }
        .stat-value.success { color: var(--success-color); }
        .stat-value.warning { color: var(--warning-color); }
        .stat-value.danger { color: var(--danger-color); }

        .content-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 2rem;
        }

        .main-content {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .card {
            background: var(--bg-secondary);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md);
            overflow: hidden;
        }

        .card-header {
            padding: 1rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .card-content {
            padding: 1rem;
        }

        .chart-container {
            position: relative;
            height: 400px;
            margin: 1rem 0;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }

        .data-table th,
        .data-table td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        .data-table th {
            background: var(--bg-primary);
            font-weight: 600;
        }

        .data-table tr:hover {
            background: var(--bg-primary);
        }

        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: var(--radius-md);
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        .btn-primary {
            background: var(--primary-color);
            color: white;
        }

        .btn-success {
            background: var(--success-color);
            color: white;
        }

        .btn:hover {
            transform: translateY(-1px);
            filter: brightness(110%);
        }

        .form-select {
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            background: var(--bg-secondary);
        }

        .loading {
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
        }

        .metric-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            border-bottom: 1px solid var(--border-color);
        }

        .metric-item:last-child {
            border-bottom: none;
        }

        .metric-label {
            font-weight: 500;
        }

        .metric-value {
            font-weight: bold;
            color: var(--primary-color);
        }

        @media (max-width: 768px) {
            .content-grid {
                grid-template-columns: 1fr;
            }
            
            .tabs {
                flex-direction: column;
            }
            
            .tab-button {
                padding: 0.75rem;
            }
            
            .header h1 {
                font-size: 1.8rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <h1><i class="fas fa-chart-line"></i> データ分析システム</h1>
            <p>総合分析・予測分析・トレンド分析・収益性分析・競合分析</p>
        </div>

        <!-- タブナビゲーション -->
        <div class="tabs">
            <button class="tab-button active" onclick="switchTab('overview')">
                <i class="fas fa-tachometer-alt"></i> 概要
            </button>
            <button class="tab-button" onclick="switchTab('trends')">
                <i class="fas fa-chart-line"></i> トレンド
            </button>
            <button class="tab-button" onclick="switchTab('categories')">
                <i class="fas fa-tags"></i> カテゴリー
            </button>
            <button class="tab-button" onclick="switchTab('profit')">
                <i class="fas fa-yen-sign"></i> 利益分析
            </button>
            <button class="tab-button" onclick="switchTab('performance')">
                <i class="fas fa-chart-bar"></i> パフォーマンス
            </button>
            <button class="tab-button" onclick="switchTab('prediction')">
                <i class="fas fa-crystal-ball"></i> 予測
            </button>
        </div>

        <!-- 概要タブ -->
        <div id="overview" class="tab-content active">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value primary" id="totalProducts">-</div>
                    <div class="stat-label">総商品数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value success" id="approvedProducts">-</div>
                    <div class="stat-label">承認済み</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value warning" id="avgPrice">-</div>
                    <div class="stat-label">平均価格</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value primary" id="avgProfitRate">-</div>
                    <div class="stat-label">平均利益率</div>
                </div>
            </div>

            <div class="content-grid">
                <div class="main-content">
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-chart-pie"></i> システム概要</h3>
                            <button class="btn btn-primary" onclick="exportReport('overview')">
                                <i class="fas fa-download"></i> レポート出力
                            </button>
                        </div>
                        <div class="card-content">
                            <div class="chart-container">
                                <canvas id="overviewChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="sidebar">
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-list"></i> 主要指標</h3>
                        </div>
                        <div class="card-content">
                            <div id="keyMetrics">
                                <div class="loading">読み込み中...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- トレンドタブ -->
        <div id="trends" class="tab-content">
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-chart-line"></i> 価格トレンド分析</h3>
                    <div>
                        <select id="trendPeriod" class="form-select" onchange="loadPriceTrends()">
                            <option value="7">過去7日</option>
                            <option value="30" selected>過去30日</option>
                            <option value="90">過去90日</option>
                        </select>
                    </div>
                </div>
                <div class="card-content">
                    <div class="chart-container">
                        <canvas id="trendChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <!-- カテゴリータブ -->
        <div id="categories" class="tab-content">
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-tags"></i> カテゴリー別分析</h3>
                    <button class="btn btn-success" onclick="exportReport('category')">
                        <i class="fas fa-file-excel"></i> Excel出力
                    </button>
                </div>
                <div class="card-content">
                    <table class="data-table" id="categoryTable">
                        <thead>
                            <tr>
                                <th>カテゴリー</th>
                                <th>商品数</th>
                                <th>平均価格</th>
                                <th>利益率</th>
                                <th>承認率</th>
                                <th>スコア</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="6" class="loading">データを読み込み中...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- 利益分析タブ -->
        <div id="profit" class="tab-content">
            <div class="content-grid">
                <div class="main-content">
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-yen-sign"></i> 利益率分布</h3>
                        </div>
                        <div class="card-content">
                            <div class="chart-container">
                                <canvas id="profitChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="sidebar">
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-trophy"></i> 高利益商品TOP10</h3>
                        </div>
                        <div class="card-content">
                            <div id="topProfitProducts">
                                <div class="loading">読み込み中...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- パフォーマンスタブ -->
        <div id="performance" class="tab-content">
            <div class="content-grid">
                <div class="main-content">
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-clock"></i> 時間別パフォーマンス</h3>
                        </div>
                        <div class="card-content">
                            <div class="chart-container">
                                <canvas id="performanceChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="sidebar">
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-calendar"></i> 週別分析</h3>
                        </div>
                        <div class="card-content">
                            <div class="chart-container">
                                <canvas id="weeklyChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 予測タブ -->
        <div id="prediction" class="tab-content">
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-crystal-ball"></i> 予測分析</h3>
                    <div>
                        <select id="predictionType" class="form-select" onchange="loadPredictionData()">
                            <option value="sales">売上予測</option>
                            <option value="price">価格予測</option>
                        </select>
                    </div>
                </div>
                <div class="card-content">
                    <div class="chart-container">
                        <canvas id="predictionChart"></canvas>
                    </div>
                    <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-primary); border-radius: var(--radius-md);">
                        <h4>予測について</h4>
                        <p>過去30日のデータを基にした線形予測モデルを使用しています。実際の結果は市場状況により変動する可能性があります。</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // グローバル変数
        let charts = {};

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            loadOverviewStats();
            loadPriceTrends();
            loadCategoryAnalysis();
            loadProfitAnalysis();
            loadPerformanceMetrics();
            loadPredictionData();
        });

        // タブ切り替え
        function switchTab(tabName) {
            // すべてのタブを非アクティブに
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // 選択されたタブをアクティブに
            event.target.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        }

        // 概要統計読み込み
        async function loadOverviewStats() {
            try {
                const response = await fetch('analysis_complete.php?action=get_overview_stats');
                const data = await response.json();
                
                if (data.success) {
                    const stats = data.stats;
                    document.getElementById('totalProducts').textContent = stats.total_products || 0;
                    document.getElementById('approvedProducts').textContent = stats.approved_products || 0;
                    document.getElementById('avgPrice').textContent = '¥' + (stats.avg_price_jpy ? Math.round(stats.avg_price_jpy).toLocaleString() : '0');
                    document.getElementById('avgProfitRate').textContent = (stats.avg_profit_rate ? stats.avg_profit_rate.toFixed(1) : '0') + '%';
                    
                    displayKeyMetrics(stats);
                    createOverviewChart(stats);
                }
            } catch (error) {
                console.error('概要統計読み込みエラー:', error);
            }
        }

        // 主要指標表示
        function displayKeyMetrics(stats) {
            const container = document.getElementById('keyMetrics');
            const metrics = [
                { label: '承認率', value: (stats.approval_rate || 0).toFixed(1) + '%' },
                { label: '出品率', value: (stats.listing_rate || 0).toFixed(1) + '%' },
                { label: '利益商品数', value: (stats.profitable_products || 0).toLocaleString() },
                { label: '最高価格', value: '¥' + (stats.max_price_jpy || 0).toLocaleString() },
                { label: '最低価格', value: '¥' + (stats.min_price_jpy || 0).toLocaleString() }
            ];

            const html = metrics.map(metric => `
                <div class="metric-item">
                    <span class="metric-label">${metric.label}</span>
                    <span class="metric-value">${metric.value}</span>
                </div>
            `).join('');

            container.innerHTML = html;
        }

        // 概要チャート作成
        function createOverviewChart(stats) {
            const ctx = document.getElementById('overviewChart').getContext('2d');
            
            if (charts.overview) {
                charts.overview.destroy();
            }

            charts.overview = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['承認済み', '否認済み', '保留中'],
                    datasets: [{
                        data: [
                            stats.approved_products || 0,
                            (stats.total_products - stats.approved_products) || 0,
                            stats.pending_products || 0
                        ],
                        backgroundColor: ['#10b981', '#ef4444', '#f59e0b']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // 価格トレンド読み込み
        async function loadPriceTrends() {
            const period = document.getElementById('trendPeriod')?.value || '30';
            
            try {
                const response = await fetch(`analysis_complete.php?action=get_price_trends&period=${period}`);
                const data = await response.json();
                
                if (data.success) {
                    createTrendChart(data.trends);
                }
            } catch (error) {
                console.error('トレンド読み込みエラー:', error);
            }
        }

        // トレンドチャート作成
        function createTrendChart(trends) {
            const ctx = document.getElementById('trendChart').getContext('2d');
            
            if (charts.trend) {
                charts.trend.destroy();
            }

            const labels = trends.map(t => new Date(t.date).toLocaleDateString('ja-JP'));
            
            charts.trend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '平均価格（円）',
                        data: trends.map(t => t.avg_price_jpy),
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4
                    }, {
                        label: '商品数',
                        data: trends.map(t => t.product_count),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                            },
                        }
                    }
                }
            });
        }

        // カテゴリー分析読み込み
        async function loadCategoryAnalysis() {
            try {
                const response = await fetch('analysis_complete.php?action=get_category_analysis');
                const data = await response.json();
                
                if (data.success) {
                    displayCategoryTable(data.categories);
                }
            } catch (error) {
                console.error('カテゴリー分析読み込みエラー:', error);
            }
        }

        // カテゴリーテーブル表示
        function displayCategoryTable(categories) {
            const tbody = document.querySelector('#categoryTable tbody');
            
            if (categories.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">データがありません</td></tr>';
                return;
            }

            const html = categories.map(cat => `
                <tr>
                    <td>${cat.category_name}</td>
                    <td>${cat.product_count}</td>
                    <td>¥${Math.round(cat.avg_price || 0).toLocaleString()}</td>
                    <td>${(cat.avg_profit_rate || 0).toFixed(1)}%</td>
                    <td>${(cat.approval_rate || 0).toFixed(1)}%</td>
                    <td>${cat.overall_score || 0}</td>
                </tr>
            `).join('');

            tbody.innerHTML = html;
        }

        // 利益分析読み込み
        async function loadProfitAnalysis() {
            try {
                const response = await fetch('analysis_complete.php?action=get_profit_analysis');
                const data = await response.json();
                
                if (data.success) {
                    createProfitChart(data.profit_distribution);
                    displayTopProfitProducts(data.top_profit_products);
                }
            } catch (error) {
                console.error('利益分析読み込みエラー:', error);
            }
        }

        // 利益チャート作成
        function createProfitChart(distribution) {
            const ctx = document.getElementById('profitChart').getContext('2d');
            
            if (charts.profit) {
                charts.profit.destroy();
            }

            charts.profit = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: distribution.map(d => d.profit_range),
                    datasets: [{
                        label: '商品数',
                        data: distribution.map(d => d.count),
                        backgroundColor: [
                            '#ef4444', '#f59e0b', '#10b981', 
                            '#06b6d4', '#2563eb', '#7c3aed'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }

        // 高利益商品表示
        function displayTopProfitProducts(products) {
            const container = document.getElementById('topProfitProducts');
            
            if (products.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">データがありません</div>';
                return;
            }

            const html = products.map((product, index) => `
                <div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color); ${index === products.length - 1 ? 'border-bottom: none;' : ''}">
                    <div style="font-weight: 500; margin-bottom: 0.25rem;">${product.title.substring(0, 30)}...</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                        利益率: <strong style="color: var(--success-color);">${(product.profit_rate || 0).toFixed(1)}%</strong>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                        利益: ¥${(product.profit_jpy || 0).toLocaleString()}
                    </div>
                </div>
            `).join('');

            container.innerHTML = html;
        }

        // パフォーマンス指標読み込み
        async function loadPerformanceMetrics() {
            try {
                const response = await fetch('analysis_complete.php?action=get_performance_metrics');
                const data = await response.json();
                
                if (data.success) {
                    createPerformanceChart(data.hourly_metrics);
                    createWeeklyChart(data.weekly_metrics);
                }
            } catch (error) {
                console.error('パフォーマンス指標読み込みエラー:', error);
            }
        }

        // パフォーマンスチャート作成
        function createPerformanceChart(hourlyData) {
            const ctx = document.getElementById('performanceChart').getContext('2d');
            
            if (charts.performance) {
                charts.performance.destroy();
            }

            charts.performance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: hourlyData.map(h => h.hour + '時'),
                    datasets: [{
                        label: '商品数',
                        data: hourlyData.map(h => h.product_count),
                        backgroundColor: '#2563eb'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // 週別チャート作成
        function createWeeklyChart(weeklyData) {
            const ctx = document.getElementById('weeklyChart').getContext('2d');
            
            if (charts.weekly) {
                charts.weekly.destroy();
            }

            const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

            charts.weekly = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: weeklyData.map(w => dayNames[w.day_of_week]),
                    datasets: [{
                        label: '商品数',
                        data: weeklyData.map(w => w.product_count),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // 予測データ読み込み
        async function loadPredictionData() {
            const type = document.getElementById('predictionType')?.value || 'sales';
            
            try {
                const response = await fetch(`analysis_complete.php?action=get_prediction_data&type=${type}`);
                const data = await response.json();
                
                if (data.success) {
                    createPredictionChart(data.historical_data, data.predictions, type);
                }
            } catch (error) {
                console.error('予測データ読み込みエラー:', error);
            }
        }

        // 予測チャート作成
        function createPredictionChart(historical, predictions, type) {
            const ctx = document.getElementById('predictionChart').getContext('2d');
            
            if (charts.prediction) {
                charts.prediction.destroy();
            }

            const field = type === 'sales' ? 'daily_count' : 'avg_price';
            const historicalLabels = historical.map(h => new Date(h.date).toLocaleDateString('ja-JP'));
            const predictionLabels = predictions.map(p => new Date(p.date).toLocaleDateString('ja-JP'));

            charts.prediction = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [...historicalLabels, ...predictionLabels],
                    datasets: [{
                        label: '実績データ',
                        data: [...historical.map(h => h[field]), ...new Array(predictions.length).fill(null)],
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)'
                    }, {
                        label: '予測データ',
                        data: [...new Array(historical.length).fill(null), ...predictions.map(p => p.predicted_value)],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderDash: [5, 5]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // レポート出力
        async function exportReport(reportType) {
            try {
                const response = await fetch(`analysis_complete.php?action=export_report&report_type=${reportType}&format=csv`);
                const data = await response.json();
                
                if (data.success && data.csv_data) {
                    downloadCSV(data.csv_data, data.filename);
                }
            } catch (error) {
                console.error('レポート出力エラー:', error);
            }
        }

        // CSV ダウンロード
        function downloadCSV(csvData, filename) {
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }

        console.log('データ分析システム初期化完了');
    </script>
</body>
</html>