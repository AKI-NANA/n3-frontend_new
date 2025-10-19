<?php
/**
 * NAGANO-3 eBay受注管理システム - 包括的ダッシュボード・レポートシステム
 * 
 * @version 3.0.0
 * @date 2025-06-11
 * @description KPI分析・トレンド分析・予測ダッシュボード
 */

class N3ComprehensiveDashboard {
    
    private $db;
    private $ai_engine;
    private $cache_manager;
    private $report_generator;
    private $chart_builder;
    
    public function __construct() {
        $this->db = new PDO(
            "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']}",
            $_ENV['DB_USER'],
            $_ENV['DB_PASS'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        
        $this->ai_engine = new AIRecommendationEngine();
        $this->cache_manager = new CacheManager();
        $this->report_generator = new ReportGenerator();
        $this->chart_builder = new ChartBuilder();
    }
    
    /**
     * メインダッシュボードデータ取得
     * 
     * @param array $filters フィルター条件
     * @return array ダッシュボードデータ
     */
    public function getMainDashboardData($filters = []) {
        $cache_key = 'dashboard_main_' . md5(serialize($filters));
        $cached_data = $this->cache_manager->get($cache_key);
        
        if ($cached_data) {
            return $cached_data;
        }
        
        $dashboard_data = [
            'summary_kpis' => $this->getSummaryKPIs($filters),
            'real_time_metrics' => $this->getRealTimeMetrics(),
            'recent_orders' => $this->getRecentOrdersData($filters),
            'profit_analysis' => $this->getProfitAnalysis($filters),
            'inventory_status' => $this->getInventoryStatus(),
            'ai_insights' => $this->getAIInsights($filters),
            'performance_trends' => $this->getPerformanceTrends($filters),
            'alerts_notifications' => $this->getActiveAlerts(),
            'competitor_analysis' => $this->getCompetitorAnalysis(),
            'forecast_data' => $this->getForecastData($filters)
        ];
        
        // 30分キャッシュ
        $this->cache_manager->set($cache_key, $dashboard_data, 1800);
        
        return $dashboard_data;
    }
    
    /**
     * サマリーKPI取得
     * 
     * @param array $filters
     * @return array KPIデータ
     */
    public function getSummaryKPIs($filters) {
        $date_filter = $this->buildDateFilter($filters);
        
        // 売上KPI
        $sales_kpis = $this->calculateSalesKPIs($date_filter);
        
        // 利益KPI
        $profit_kpis = $this->calculateProfitKPIs($date_filter);
        
        // 効率KPI
        $efficiency_kpis = $this->calculateEfficiencyKPIs($date_filter);
        
        // 顧客KPI
        $customer_kpis = $this->calculateCustomerKPIs($date_filter);
        
        return [
            'sales' => $sales_kpis,
            'profit' => $profit_kpis,
            'efficiency' => $efficiency_kpis,
            'customer' => $customer_kpis,
            'comparison' => $this->getKPIComparison($date_filter)
        ];
    }
    
    /**
     * 売上KPI計算
     */
    private function calculateSalesKPIs($date_filter) {
        $stmt = $this->db->prepare("
            SELECT 
                COUNT(*) as total_orders,
                SUM(sale_price) as total_sales,
                AVG(sale_price) as avg_order_value,
                SUM(CASE WHEN status = 'completed' THEN sale_price ELSE 0 END) as completed_sales,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as orders_24h
            FROM ebay_orders 
            WHERE {$date_filter}
        ");
        $stmt->execute();
        $sales_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 前期比較
        $previous_period = $this->getPreviousPeriodSales($date_filter);
        
        return [
            'total_orders' => intval($sales_data['total_orders']),
            'total_sales' => floatval($sales_data['total_sales']),
            'avg_order_value' => floatval($sales_data['avg_order_value']),
            'completed_sales' => floatval($sales_data['completed_sales']),
            'orders_24h' => intval($sales_data['orders_24h']),
            'growth_rate' => $this->calculateGrowthRate($sales_data['total_sales'], $previous_period['total_sales']),
            'completion_rate' => ($sales_data['total_orders'] > 0) ? ($sales_data['completed_sales'] / $sales_data['total_sales']) * 100 : 0
        ];
    }
    
    /**
     * 利益KPI計算
     */
    private function calculateProfitKPIs($date_filter) {
        $stmt = $this->db->prepare("
            SELECT 
                SUM(profit_amount) as total_profit,
                AVG(profit_rate) as avg_profit_rate,
                SUM(CASE WHEN profit_rate > 20 THEN profit_amount ELSE 0 END) as high_profit_sales,
                COUNT(CASE WHEN profit_rate > 20 THEN 1 END) as high_profit_orders,
                MIN(profit_rate) as min_profit_rate,
                MAX(profit_rate) as max_profit_rate
            FROM ebay_orders 
            WHERE profit_amount IS NOT NULL AND {$date_filter}
        ");
        $stmt->execute();
        $profit_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'total_profit' => floatval($profit_data['total_profit']),
            'avg_profit_rate' => floatval($profit_data['avg_profit_rate']),
            'high_profit_sales' => floatval($profit_data['high_profit_sales']),
            'high_profit_orders' => intval($profit_data['high_profit_orders']),
            'profit_margin' => $this->calculateProfitMargin($date_filter),
            'profit_per_order' => $this->calculateProfitPerOrder($date_filter),
            'roi' => $this->calculateROI($date_filter)
        ];
    }
    
    /**
     * リアルタイムメトリクス取得
     */
    public function getRealTimeMetrics() {
        return [
            'active_orders' => $this->getActiveOrdersCount(),
            'pending_shipments' => $this->getPendingShipmentsCount(),
            'low_stock_items' => $this->getLowStockItemsCount(),
            'today_sales' => $this->getTodaySales(),
            'current_hour_orders' => $this->getCurrentHourOrders(),
            'system_performance' => $this->getSystemPerformanceMetrics(),
            'api_status' => $this->getAPIStatusMetrics()
        ];
    }
    
    /**
     * 利益分析データ取得
     */
    public function getProfitAnalysis($filters) {
        // 商品別利益分析
        $product_profit = $this->getProductProfitAnalysis($filters);
        
        // カテゴリ別利益分析
        $category_profit = $this->getCategoryProfitAnalysis($filters);
        
        // 時系列利益分析
        $timeline_profit = $this->getTimelineProfitAnalysis($filters);
        
        // 利益構造分析
        $profit_structure = $this->getProfitStructureAnalysis($filters);
        
        return [
            'by_product' => $product_profit,
            'by_category' => $category_profit,
            'timeline' => $timeline_profit,
            'structure' => $profit_structure,
            'optimization_opportunities' => $this->identifyOptimizationOpportunities($filters)
        ];
    }
    
    /**
     * 在庫ステータス取得
     */
    public function getInventoryStatus() {
        $stmt = $this->db->prepare("
            SELECT 
                i.sku,
                i.product_name,
                i.current_stock,
                i.reorder_level,
                i.max_stock,
                i.avg_daily_sales,
                CASE 
                    WHEN i.current_stock = 0 THEN 'out_of_stock'
                    WHEN i.current_stock <= i.reorder_level THEN 'low_stock'
                    WHEN i.current_stock >= i.max_stock * 0.8 THEN 'overstocked'
                    ELSE 'normal'
                END as stock_status,
                CASE 
                    WHEN i.avg_daily_sales > 0 THEN i.current_stock / i.avg_daily_sales
                    ELSE 999
                END as days_of_inventory
            FROM inventory i
            ORDER BY 
                CASE 
                    WHEN i.current_stock = 0 THEN 1
                    WHEN i.current_stock <= i.reorder_level THEN 2
                    ELSE 3
                END,
                i.avg_daily_sales DESC
        ");
        $stmt->execute();
        $inventory_data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 在庫状況サマリー
        $summary = [
            'total_items' => count($inventory_data),
            'out_of_stock' => count(array_filter($inventory_data, fn($item) => $item['stock_status'] === 'out_of_stock')),
            'low_stock' => count(array_filter($inventory_data, fn($item) => $item['stock_status'] === 'low_stock')),
            'normal_stock' => count(array_filter($inventory_data, fn($item) => $item['stock_status'] === 'normal')),
            'overstocked' => count(array_filter($inventory_data, fn($item) => $item['stock_status'] === 'overstocked')),
            'avg_days_inventory' => array_sum(array_column($inventory_data, 'days_of_inventory')) / count($inventory_data)
        ];
        
        return [
            'summary' => $summary,
            'items' => $inventory_data,
            'reorder_recommendations' => $this->generateReorderRecommendations($inventory_data),
            'inventory_value' => $this->calculateInventoryValue(),
            'turnover_analysis' => $this->analyzeInventoryTurnover()
        ];
    }
    
    /**
     * AI洞察データ取得
     */
    public function getAIInsights($filters) {
        // AI推奨の集計
        $ai_recommendations = $this->getAIRecommendationsSummary($filters);
        
        // パフォーマンス予測
        $performance_predictions = $this->getPerformancePredictions($filters);
        
        // 市場トレンド分析
        $market_trends = $this->getMarketTrendAnalysis($filters);
        
        // 顧客行動分析
        $customer_behavior = $this->getCustomerBehaviorAnalysis($filters);
        
        return [
            'recommendations' => $ai_recommendations,
            'predictions' => $performance_predictions,
            'market_trends' => $market_trends,
            'customer_behavior' => $customer_behavior,
            'actionable_insights' => $this->generateActionableInsights($filters)
        ];
    }
    
    /**
     * パフォーマンストレンド取得
     */
    public function getPerformanceTrends($filters) {
        $period = $filters['period'] ?? '30d';
        
        // 売上トレンド
        $sales_trend = $this->getSalesTrend($period);
        
        // 利益トレンド
        $profit_trend = $this->getProfitTrend($period);
        
        // 受注トレンド
        $order_trend = $this->getOrderTrend($period);
        
        // 効率トレンド
        $efficiency_trend = $this->getEfficiencyTrend($period);
        
        return [
            'sales' => $sales_trend,
            'profit' => $profit_trend,
            'orders' => $order_trend,
            'efficiency' => $efficiency_trend,
            'seasonal_patterns' => $this->analyzeSeasonalPatterns($period),
            'trend_analysis' => $this->analyzeTrends([
                'sales' => $sales_trend,
                'profit' => $profit_trend,
                'orders' => $order_trend
            ])
        ];
    }
    
    /**
     * 競合分析データ取得
     */
    public function getCompetitorAnalysis() {
        // 価格比較データ
        $price_comparison = $this->getPriceComparisonData();
        
        // 市場シェア分析
        $market_share = $this->getMarketShareAnalysis();
        
        // 競合商品分析
        $competitor_products = $this->getCompetitorProductAnalysis();
        
        return [
            'price_comparison' => $price_comparison,
            'market_share' => $market_share,
            'competitor_products' => $competitor_products,
            'competitive_positioning' => $this->analyzeCompetitivePositioning(),
            'opportunities' => $this->identifyCompetitiveOpportunities()
        ];
    }
    
    /**
     * 予測データ取得
     */
    public function getForecastData($filters) {
        // 売上予測
        $sales_forecast = $this->generateSalesForecast($filters);
        
        // 需要予測
        $demand_forecast = $this->generateDemandForecast($filters);
        
        // 在庫予測
        $inventory_forecast = $this->generateInventoryForecast($filters);
        
        // 利益予測
        $profit_forecast = $this->generateProfitForecast($filters);
        
        return [
            'sales' => $sales_forecast,
            'demand' => $demand_forecast,
            'inventory' => $inventory_forecast,
            'profit' => $profit_forecast,
            'scenarios' => $this->generateScenarioAnalysis($filters),
            'confidence_intervals' => $this->calculateConfidenceIntervals($filters)
        ];
    }
    
    /**
     * カスタムレポート生成
     * 
     * @param array $report_config レポート設定
     * @return array レポートデータ
     */
    public function generateCustomReport($report_config) {
        $report_data = [];
        
        // レポートタイプに応じた処理
        switch ($report_config['type']) {
            case 'executive_summary':
                $report_data = $this->generateExecutiveSummaryReport($report_config);
                break;
                
            case 'profit_analysis':
                $report_data = $this->generateProfitAnalysisReport($report_config);
                break;
                
            case 'inventory_report':
                $report_data = $this->generateInventoryReport($report_config);
                break;
                
            case 'customer_analysis':
                $report_data = $this->generateCustomerAnalysisReport($report_config);
                break;
                
            case 'product_performance':
                $report_data = $this->generateProductPerformanceReport($report_config);
                break;
                
            case 'financial_report':
                $report_data = $this->generateFinancialReport($report_config);
                break;
                
            default:
                throw new Exception("未対応のレポートタイプ: {$report_config['type']}");
        }
        
        // レポートメタデータ追加
        $report_data['metadata'] = [
            'generated_at' => date('Y-m-d H:i:s'),
            'report_type' => $report_config['type'],
            'filters' => $report_config['filters'] ?? [],
            'period' => $report_config['period'] ?? '30d',
            'version' => '3.0.0'
        ];
        
        return $report_data;
    }
    
    /**
     * エグゼクティブサマリーレポート生成
     */
    private function generateExecutiveSummaryReport($config) {
        $filters = $config['filters'] ?? [];
        
        return [
            'overview' => [
                'key_metrics' => $this->getSummaryKPIs($filters),
                'performance_highlights' => $this->getPerformanceHighlights($filters),
                'critical_issues' => $this->identifyCriticalIssues($filters)
            ],
            'financial_summary' => [
                'revenue_analysis' => $this->getRevenueAnalysis($filters),
                'profitability_analysis' => $this->getProfitabilityAnalysis($filters),
                'cost_analysis' => $this->getCostAnalysis($filters)
            ],
            'operational_summary' => [
                'efficiency_metrics' => $this->getEfficiencyMetrics($filters),
                'inventory_status' => $this->getInventoryStatusSummary($filters),
                'fulfillment_performance' => $this->getFulfillmentPerformance($filters)
            ],
            'strategic_insights' => [
                'growth_opportunities' => $this->identifyGrowthOpportunities($filters),
                'risk_assessment' => $this->assessBusinessRisks($filters),
                'recommendations' => $this->generateStrategicRecommendations($filters)
            ],
            'charts' => $this->generateExecutiveCharts($filters)
        ];
    }
    
    /**
     * 利益分析レポート生成
     */
    private function generateProfitAnalysisReport($config) {
        $filters = $config['filters'] ?? [];
        
        return [
            'profit_overview' => $this->getProfitOverview($filters),
            'margin_analysis' => $this->getMarginAnalysis($filters),
            'cost_breakdown' => $this->getCostBreakdown($filters),
            'profitability_trends' => $this->getProfitabilityTrends($filters),
            'product_profitability' => $this->getProductProfitability($filters),
            'optimization_recommendations' => $this->getProfitOptimizationRecommendations($filters),
            'scenario_analysis' => $this->getProfitScenarioAnalysis($filters),
            'charts' => $this->generateProfitCharts($filters)
        ];
    }
    
    /**
     * データエクスポート機能
     * 
     * @param array $export_config エクスポート設定
     * @return string エクスポートファイルパス
     */
    public function exportData($export_config) {
        $format = $export_config['format'] ?? 'xlsx';
        $data_type = $export_config['data_type'];
        $filters = $export_config['filters'] ?? [];
        
        // データ取得
        $export_data = $this->getExportData($data_type, $filters);
        
        // ファイル生成
        switch ($format) {
            case 'xlsx':
                return $this->generateExcelFile($export_data, $export_config);
                
            case 'csv':
                return $this->generateCSVFile($export_data, $export_config);
                
            case 'pdf':
                return $this->generatePDFFile($export_data, $export_config);
                
            case 'json':
                return $this->generateJSONFile($export_data, $export_config);
                
            default:
                throw new Exception("未対応のエクスポート形式: {$format}");
        }
    }
    
    /**
     * 自動レポート配信設定
     * 
     * @param array $schedule_config スケジュール設定
     * @return bool 設定成功可否
     */
    public function scheduleAutomaticReport($schedule_config) {
        try {
            // スケジュール設定をデータベースに保存
            $stmt = $this->db->prepare("
                INSERT INTO report_schedules 
                (name, report_type, schedule_pattern, recipients, filters, format, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $schedule_config['name'],
                $schedule_config['report_type'],
                $schedule_config['schedule_pattern'], // cron形式
                json_encode($schedule_config['recipients']),
                json_encode($schedule_config['filters']),
                $schedule_config['format']
            ]);
            
            // Cronジョブ登録
            $this->registerCronJob($schedule_config);
            
            return true;
            
        } catch (Exception $e) {
            error_log("自動レポート設定エラー: " . $e->getMessage());
            return false;
        }
    }
    
    // ========== ユーティリティメソッド ==========
    
    private function buildDateFilter($filters) {
        $start_date = $filters['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
        $end_date = $filters['end_date'] ?? date('Y-m-d');
        
        return "created_at BETWEEN '{$start_date}' AND '{$end_date} 23:59:59'";
    }
    
    private function calculateGrowthRate($current, $previous) {
        if ($previous == 0) return 0;
        return (($current - $previous) / $previous) * 100;
    }
    
    private function getActiveOrdersCount() {
        $stmt = $this->db->query("SELECT COUNT(*) FROM ebay_orders WHERE status IN ('pending', 'processing')");
        return intval($stmt->fetchColumn());
    }
    
    private function getPendingShipmentsCount() {
        $stmt = $this->db->query("SELECT COUNT(*) FROM ebay_orders WHERE shipping_status = 'pending'");
        return intval($stmt->fetchColumn());
    }
    
    private function getLowStockItemsCount() {
        $stmt = $this->db->query("SELECT COUNT(*) FROM inventory WHERE current_stock <= reorder_level");
        return intval($stmt->fetchColumn());
    }
    
    private function getTodaySales() {
        $stmt = $this->db->query("
            SELECT COALESCE(SUM(sale_price), 0) 
            FROM ebay_orders 
            WHERE DATE(created_at) = CURDATE()
        ");
        return floatval($stmt->fetchColumn());
    }
    
    private function getCurrentHourOrders() {
        $stmt = $this->db->query("
            SELECT COUNT(*) 
            FROM ebay_orders 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        return intval($stmt->fetchColumn());
    }
    
    // 以下、実装簡略化のため基本的な戻り値のみ定義
    private function getSystemPerformanceMetrics() { return ['cpu' => 45, 'memory' => 62, 'disk' => 78]; }
    private function getAPIStatusMetrics() { return ['ebay' => 'online', 'shipping' => 'online', 'inventory' => 'online']; }
    private function getPreviousPeriodSales($date_filter) { return ['total_sales' => 100000]; }
    private function calculateProfitMargin($date_filter) { return 15.5; }
    private function calculateProfitPerOrder($date_filter) { return 2500; }
    private function calculateROI($date_filter) { return 18.2; }
    private function getProductProfitAnalysis($filters) { return []; }
    private function getCategoryProfitAnalysis($filters) { return []; }
    private function getTimelineProfitAnalysis($filters) { return []; }
    private function getProfitStructureAnalysis($filters) { return []; }
    private function identifyOptimizationOpportunities($filters) { return []; }
    private function generateReorderRecommendations($inventory_data) { return []; }
    private function calculateInventoryValue() { return 5000000; }
    private function analyzeInventoryTurnover() { return []; }
    private function getAIRecommendationsSummary($filters) { return []; }
    private function getPerformancePredictions($filters) { return []; }
    private function getMarketTrendAnalysis($filters) { return []; }
    private function getCustomerBehaviorAnalysis($filters) { return []; }
    private function generateActionableInsights($filters) { return []; }
    private function getSalesTrend($period) { return []; }
    private function getProfitTrend($period) { return []; }
    private function getOrderTrend($period) { return []; }
    private function getEfficiencyTrend($period) { return []; }
    private function analyzeSeasonalPatterns($period) { return []; }
    private function analyzeTrends($data) { return []; }
    private function getPriceComparisonData() { return []; }
    private function getMarketShareAnalysis() { return []; }
    private function getCompetitorProductAnalysis() { return []; }
    private function analyzeCompetitivePositioning() { return []; }
    private function identifyCompetitiveOpportunities() { return []; }
    private function generateSalesForecast($filters) { return []; }
    private function generateDemandForecast($filters) { return []; }
    private function generateInventoryForecast($filters) { return []; }
    private function generateProfitForecast($filters) { return []; }
    private function generateScenarioAnalysis($filters) { return []; }
    private function calculateConfidenceIntervals($filters) { return []; }
    private function getPerformanceHighlights($filters) { return []; }
    private function identifyCriticalIssues($filters) { return []; }
    private function getRevenueAnalysis($filters) { return []; }
    private function getProfitabilityAnalysis($filters) { return []; }
    private function getCostAnalysis($filters) { return []; }
    private function getEfficiencyMetrics($filters) { return []; }
    private function getInventoryStatusSummary($filters) { return []; }
    private function getFulfillmentPerformance($filters) { return []; }
    private function identifyGrowthOpportunities($filters) { return []; }
    private function assessBusinessRisks($filters) { return []; }
    private function generateStrategicRecommendations($filters) { return []; }
    private function generateExecutiveCharts($filters) { return []; }
    private function getProfitOverview($filters) { return []; }
    private function getMarginAnalysis($filters) { return []; }
    private function getCostBreakdown($filters) { return []; }
    private function getProfitabilityTrends($filters) { return []; }
    private function getProductProfitability($filters) { return []; }
    private function getProfitOptimizationRecommendations($filters) { return []; }
    private function getProfitScenarioAnalysis($filters) { return []; }
    private function generateProfitCharts($filters) { return []; }
    private function getExportData($data_type, $filters) { return []; }
    private function generateExcelFile($data, $config) { return '/tmp/export.xlsx'; }
    private function generateCSVFile($data, $config) { return '/tmp/export.csv'; }
    private function generatePDFFile($data, $config) { return '/tmp/export.pdf'; }
    private function generateJSONFile($data, $config) { return '/tmp/export.json'; }
    private function registerCronJob($config) { return true; }
    private function calculateCustomerKPIs($date_filter) { return []; }
    private function calculateEfficiencyKPIs($date_filter) { return []; }
    private function getKPIComparison($date_filter) { return []; }
    private function getActiveAlerts() { return []; }
    private function getRecentOrdersData($filters) { return []; }
}

/**
 * レポート生成クラス
 */
class ReportGenerator {
    
    public function generateReport($type, $data, $config = []) {
        switch ($type) {
            case 'html':
                return $this->generateHTMLReport($data, $config);
            case 'pdf':
                return $this->generatePDFReport($data, $config);
            case 'excel':
                return $this->generateExcelReport($data, $config);
            default:
                throw new Exception("未対応のレポート形式: {$type}");
        }
    }
    
    private function generateHTMLReport($data, $config) {
        // HTML レポート生成実装
        return "<html><body><h1>NAGANO-3 レポート</h1></body></html>";
    }
    
    private function generatePDFReport($data, $config) {
        // PDF レポート生成実装
        return '/tmp/report.pdf';
    }
    
    private function generateExcelReport($data, $config) {
        // Excel レポート生成実装
        return '/tmp/report.xlsx';
    }
}

/**
 * チャート構築クラス
 */
class ChartBuilder {
    
    public function buildChart($type, $data, $options = []) {
        $chart_config = [
            'type' => $type,
            'data' => $data,
            'options' => $options,
            'responsive' => true,
            'animation' => true
        ];
        
        return $chart_config;
    }
    
    public function buildDashboardCharts($dashboard_data) {
        return [
            'sales_trend' => $this->buildChart('line', $dashboard_data['performance_trends']['sales']),
            'profit_breakdown' => $this->buildChart('pie', $dashboard_data['profit_analysis']['structure']),
            'inventory_status' => $this->buildChart('doughnut', $dashboard_data['inventory_status']['summary']),
            'order_volume' => $this->buildChart('bar', $dashboard_data['performance_trends']['orders']),
            'kpi_comparison' => $this->buildChart('radar', $dashboard_data['summary_kpis']['comparison']),
            'forecast_chart' => $this->buildChart('line', $dashboard_data['forecast_data']['sales'])
        ];
    }
}

/**
 * 高度分析エンジン
 */
class AdvancedAnalyticsEngine {
    
    private $db;
    private $ml_service;
    
    public function __construct() {
        $this->db = new PDO(
            "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']}",
            $_ENV['DB_USER'],
            $_ENV['DB_PASS'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $this->ml_service = new MachineLearningService();
    }
    
    /**
     * 顧客セグメント分析
     * 
     * @return array セグメント分析結果
     */
    public function performCustomerSegmentation() {
        // RFM分析（Recency, Frequency, Monetary）
        $stmt = $this->db->prepare("
            SELECT 
                buyer_id,
                DATEDIFF(NOW(), MAX(created_at)) as recency,
                COUNT(*) as frequency,
                SUM(sale_price) as monetary_value,
                AVG(sale_price) as avg_order_value,
                MIN(created_at) as first_order_date,
                MAX(created_at) as last_order_date
            FROM ebay_orders 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
            GROUP BY buyer_id
            HAVING COUNT(*) >= 1
        ");
        $stmt->execute();
        $customer_data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // RFMスコア計算
        $segmented_customers = [];
        foreach ($customer_data as $customer) {
            $rfm_scores = $this->calculateRFMScores($customer, $customer_data);
            $segment = $this->determineCustomerSegment($rfm_scores);
            
            $segmented_customers[] = [
                'buyer_id' => $customer['buyer_id'],
                'recency_score' => $rfm_scores['recency'],
                'frequency_score' => $rfm_scores['frequency'],
                'monetary_score' => $rfm_scores['monetary'],
                'rfm_score' => $rfm_scores['combined'],
                'segment' => $segment,
                'customer_value' => $this->calculateCustomerLifetimeValue($customer),
                'risk_level' => $this->assessCustomerRisk($customer),
                'recommendations' => $this->generateCustomerRecommendations($segment, $customer)
            ];
        }
        
        // セグメント統計
        $segment_summary = $this->generateSegmentSummary($segmented_customers);
        
        return [
            'customers' => $segmented_customers,
            'segments' => $segment_summary,
            'insights' => $this->generateCustomerInsights($segmented_customers),
            'action_plans' => $this->generateSegmentActionPlans($segment_summary)
        ];
    }
    
    /**
     * 商品パフォーマンス分析
     * 
     * @param array $filters
     * @return array 商品分析結果
     */
    public function analyzeProductPerformance($filters = []) {
        $date_filter = $this->buildDateFilter($filters);
        
        $stmt = $this->db->prepare("
            SELECT 
                p.sku,
                p.product_name,
                p.category,
                COUNT(o.order_id) as total_orders,
                SUM(o.sale_price) as total_revenue,
                AVG(o.sale_price) as avg_selling_price,
                SUM(o.profit_amount) as total_profit,
                AVG(o.profit_rate) as avg_profit_rate,
                COUNT(DISTINCT o.buyer_id) as unique_customers,
                AVG(DATEDIFF(o.shipped_date, o.created_at)) as avg_fulfillment_days,
                COUNT(CASE WHEN o.status = 'returned' THEN 1 END) as return_count,
                (COUNT(CASE WHEN o.status = 'returned' THEN 1 END) / COUNT(*)) * 100 as return_rate
            FROM products p
            LEFT JOIN ebay_orders o ON p.sku = o.custom_label
            WHERE {$date_filter}
            GROUP BY p.sku, p.product_name, p.category
            HAVING total_orders > 0
            ORDER BY total_revenue DESC
        ");
        $stmt->execute();
        $product_data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 商品分類
        $classified_products = [];
        foreach ($product_data as $product) {
            $performance_metrics = $this->calculateProductMetrics($product);
            $classification = $this->classifyProduct($performance_metrics);
            
            $classified_products[] = array_merge($product, [
                'performance_score' => $performance_metrics['score'],
                'velocity' => $performance_metrics['velocity'],
                'profitability_tier' => $performance_metrics['profitability_tier'],
                'classification' => $classification,
                'recommendations' => $this->generateProductRecommendations($classification, $product),
                'trend_direction' => $this->analyzeProductTrend($product['sku']),
                'seasonality' => $this->analyzeProductSeasonality($product['sku']),
                'competition_level' => $this->assessCompetitionLevel($product['sku'])
            ]);
        }
        
        return [
            'products' => $classified_products,
            'category_analysis' => $this->analyzeCategoryPerformance($classified_products),
            'portfolio_balance' => $this->analyzeProductPortfolioBalance($classified_products),
            'optimization_opportunities' => $this->identifyProductOptimizations($classified_products)
        ];
    }
    
    /**
     * 予測モデリング
     * 
     * @param string $prediction_type
     * @param array $parameters
     * @return array 予測結果
     */
    public function performPredictiveModeling($prediction_type, $parameters = []) {
        switch ($prediction_type) {
            case 'demand_forecast':
                return $this->generateDemandForecast($parameters);
            case 'price_optimization':
                return $this->optimizePricing($parameters);
            case 'inventory_planning':
                return $this->planInventoryLevels($parameters);
            case 'customer_churn':
                return $this->predictCustomerChurn($parameters);
            case 'market_opportunity':
                return $this->identifyMarketOpportunities($parameters);
            default:
                throw new Exception("未対応の予測タイプ: {$prediction_type}");
        }
    }
    
    /**
     * 需要予測
     */
    private function generateDemandForecast($parameters) {
        $forecast_horizon = $parameters['horizon_days'] ?? 30;
        $products = $parameters['products'] ?? [];
        
        $forecasts = [];
        
        foreach ($products as $sku) {
            // 過去の販売データ取得
            $historical_data = $this->getHistoricalSalesData($sku);
            
            // 季節性分析
            $seasonality = $this->analyzeSeasonality($historical_data);
            
            // トレンド分析
            $trend = $this->analyzeTrend($historical_data);
            
            // 外部要因分析
            $external_factors = $this->analyzeExternalFactors($sku);
            
            // 機械学習予測
            $ml_prediction = $this->ml_service->predictDemand([
                'historical_data' => $historical_data,
                'seasonality' => $seasonality,
                'trend' => $trend,
                'external_factors' => $external_factors,
                'horizon' => $forecast_horizon
            ]);
            
            $forecasts[$sku] = [
                'daily_forecast' => $ml_prediction['daily_predictions'],
                'total_forecast' => array_sum($ml_prediction['daily_predictions']),
                'confidence_interval' => $ml_prediction['confidence_interval'],
                'accuracy_score' => $ml_prediction['accuracy_score'],
                'trend_direction' => $trend['direction'],
                'seasonality_factor' => $seasonality['factor'],
                'recommendations' => $this->generateDemandRecommendations($ml_prediction, $sku)
            ];
        }
        
        return [
            'forecasts' => $forecasts,
            'aggregate_forecast' => $this->aggregateForecasts($forecasts),
            'methodology' => $this->getForecastMethodology(),
            'assumptions' => $this->getForecastAssumptions()
        ];
    }
    
    /**
     * 価格最適化
     */
    private function optimizePricing($parameters) {
        $products = $parameters['products'] ?? [];
        $optimization_goal = $parameters['goal'] ?? 'profit_maximization'; // profit_maximization, revenue_maximization, market_share
        
        $optimizations = [];
        
        foreach ($products as $sku) {
            // 現在の価格設定分析
            $current_pricing = $this->getCurrentPricingData($sku);
            
            // 競合価格分析
            $competitor_pricing = $this->getCompetitorPricing($sku);
            
            // 需要弾性分析
            $price_elasticity = $this->calculatePriceElasticity($sku);
            
            // 最適価格計算
            $optimal_price = $this->calculateOptimalPrice([
                'current_pricing' => $current_pricing,
                'competitor_pricing' => $competitor_pricing,
                'price_elasticity' => $price_elasticity,
                'optimization_goal' => $optimization_goal
            ]);
            
            $optimizations[$sku] = [
                'current_price' => $current_pricing['price'],
                'recommended_price' => $optimal_price['price'],
                'price_change' => $optimal_price['price'] - $current_pricing['price'],
                'price_change_percent' => (($optimal_price['price'] - $current_pricing['price']) / $current_pricing['price']) * 100,
                'expected_impact' => $optimal_price['expected_impact'],
                'confidence_score' => $optimal_price['confidence'],
                'implementation_priority' => $optimal_price['priority'],
                'reasoning' => $optimal_price['reasoning']
            ];
        }
        
        return [
            'optimizations' => $optimizations,
            'portfolio_impact' => $this->calculatePortfolioImpact($optimizations),
            'implementation_plan' => $this->createPriceImplementationPlan($optimizations),
            'monitoring_metrics' => $this->definePriceMonitoringMetrics($optimizations)
        ];
    }
    
    /**
     * A/Bテスト分析
     * 
     * @param array $test_config
     * @return array テスト結果
     */
    public function performABTestAnalysis($test_config) {
        $test_id = $test_config['test_id'];
        $metric = $test_config['metric']; // conversion_rate, revenue, profit_rate
        $significance_level = $test_config['significance_level'] ?? 0.05;
        
        // テストデータ取得
        $test_data = $this->getABTestData($test_id);
        
        // 統計分析
        $statistical_results = $this->performStatisticalAnalysis($test_data, $metric, $significance_level);
        
        // 効果量計算
        $effect_size = $this->calculateEffectSize($test_data, $metric);
        
        // 信頼区間計算
        $confidence_interval = $this->calculateConfidenceInterval($test_data, $metric, $significance_level);
        
        // ビジネスインパクト分析
        $business_impact = $this->analyzeBusitoness_Impact($test_data, $statistical_results);
        
        return [
            'test_summary' => [
                'test_id' => $test_id,
                'duration' => $test_data['duration'],
                'sample_size_a' => $test_data['group_a']['size'],
                'sample_size_b' => $test_data['group_b']['size'],
                'power' => $statistical_results['power']
            ],
            'results' => [
                'group_a_performance' => $test_data['group_a']['performance'],
                'group_b_performance' => $test_data['group_b']['performance'],
                'relative_improvement' => $statistical_results['relative_improvement'],
                'p_value' => $statistical_results['p_value'],
                'is_significant' => $statistical_results['is_significant'],
                'effect_size' => $effect_size,
                'confidence_interval' => $confidence_interval
            ],
            'business_impact' => $business_impact,
            'recommendations' => $this->generateABTestRecommendations($statistical_results, $business_impact),
            'next_steps' => $this->defineNextSteps($statistical_results, $test_config)
        ];
    }
    
    /**
     * 異常検知分析
     * 
     * @param array $detection_config
     * @return array 異常検知結果
     */
    public function performAnomalyDetection($detection_config) {
        $metrics = $detection_config['metrics']; // sales, orders, profit_rate, inventory_level
        $detection_method = $detection_config['method'] ?? 'statistical'; // statistical, ml, hybrid
        $sensitivity = $detection_config['sensitivity'] ?? 'medium'; // low, medium, high
        
        $anomalies = [];
        
        foreach ($metrics as $metric) {
            // 過去データ取得
            $historical_data = $this->getMetricHistoricalData($metric);
            
            // 異常検知実行
            switch ($detection_method) {
                case 'statistical':
                    $detected_anomalies = $this->detectStatisticalAnomalies($historical_data, $sensitivity);
                    break;
                case 'ml':
                    $detected_anomalies = $this->detectMLAnomalies($historical_data, $sensitivity);
                    break;
                case 'hybrid':
                    $detected_anomalies = $this->detectHybridAnomalies($historical_data, $sensitivity);
                    break;
            }
            
            $anomalies[$metric] = [
                'detected_anomalies' => $detected_anomalies,
                'anomaly_count' => count($detected_anomalies),
                'severity_distribution' => $this->categorizeSeverity($detected_anomalies),
                'trend_analysis' => $this->analyzeAnomalyTrends($detected_anomalies),
                'root_cause_analysis' => $this->performRootCauseAnalysis($detected_anomalies, $metric)
            ];
        }
        
        return [
            'anomalies' => $anomalies,
            'summary' => $this->generateAnomalySummary($anomalies),
            'alerts' => $this->generateAnomalyAlerts($anomalies),
            'action_items' => $this->generateAnomalyActionItems($anomalies)
        ];
    }
    
    // ========== プライベートメソッド（実装簡略化） ==========
    
    private function calculateRFMScores($customer, $all_customers) {
        // RFMスコア計算実装
        return ['recency' => 4, 'frequency' => 3, 'monetary' => 5, 'combined' => 'RFM435'];
    }
    
    private function determineCustomerSegment($rfm_scores) {
        // セグメント判定実装
        return 'loyal_customers';
    }
    
    private function calculateCustomerLifetimeValue($customer) {
        // CLV計算実装
        return floatval($customer['monetary_value']) * 1.5;
    }
    
    private function assessCustomerRisk($customer) {
        // リスク評価実装
        return 'low';
    }
    
    private function generateCustomerRecommendations($segment, $customer) {
        // 顧客推奨生成実装
        return ['action' => 'retention_campaign'];
    }
    
    private function generateSegmentSummary($customers) {
        // セグメントサマリー生成実装
        return ['total_segments' => 5, 'largest_segment' => 'loyal_customers'];
    }
    
    private function generateCustomerInsights($customers) {
        // 顧客洞察生成実装
        return ['key_insight' => 'loyal_customers_drive_60%_revenue'];
    }
    
    private function generateSegmentActionPlans($summary) {
        // アクションプラン生成実装
        return ['plan' => 'focus_on_loyal_customer_retention'];
    }
    
    private function buildDateFilter($filters) {
        $start_date = $filters['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
        $end_date = $filters['end_date'] ?? date('Y-m-d');
        return "o.created_at BETWEEN '{$start_date}' AND '{$end_date} 23:59:59'";
    }
    
    private function calculateProductMetrics($product) {
        return [
            'score' => 85,
            'velocity' => 'high',
            'profitability_tier' => 'tier_1'
        ];
    }
    
    private function classifyProduct($metrics) {
        return 'star_product';
    }
    
    private function generateProductRecommendations($classification, $product) {
        return ['action' => 'increase_marketing_budget'];
    }
    
    private function analyzeProductTrend($sku) {
        return 'upward';
    }
    
    private function analyzeProductSeasonality($sku) {
        return ['seasonal' => true, 'peak_months' => [11, 12]];
    }
    
    private function assessCompetitionLevel($sku) {
        return 'medium';
    }
    
    private function analyzeCategoryPerformance($products) {
        return ['top_category' => 'electronics'];
    }
    
    private function analyzeProductPortfolioBalance($products) {
        return ['balance_score' => 75];
    }
    
    private function identifyProductOptimizations($products) {
        return ['optimization_count' => 15];
    }
    
    private function getHistoricalSalesData($sku) {
        return [['date' => '2025-01-01', 'quantity' => 5]];
    }
    
    private function analyzeSeasonality($data) {
        return ['factor' => 1.2];
    }
    
    private function analyzeTrend($data) {
        return ['direction' => 'upward'];
    }
    
    private function analyzeExternalFactors($sku) {
        return ['factors' => ['economic_indicator' => 1.1]];
    }
    
    private function aggregateForecasts($forecasts) {
        return ['total_forecast' => 1000];
    }
    
    private function getForecastMethodology() {
        return 'Machine Learning with ARIMA and External Factors';
    }
    
    private function getForecastAssumptions() {
        return ['assumption_1' => 'stable_market_conditions'];
    }
    
    private function generateDemandRecommendations($prediction, $sku) {
        return ['recommendation' => 'increase_inventory'];
    }
    
    private function getCurrentPricingData($sku) {
        return ['price' => 5000];
    }
    
    private function getCompetitorPricing($sku) {
        return ['avg_competitor_price' => 5200];
    }
    
    private function calculatePriceElasticity($sku) {
        return -1.5;
    }
    
    private function calculateOptimalPrice($params) {
        return [
            'price' => 5100,
            'expected_impact' => ['revenue_increase' => 8.5],
            'confidence' => 85,
            'priority' => 'high',
            'reasoning' => 'competitor_analysis_suggests_price_increase_opportunity'
        ];
    }
    
    private function calculatePortfolioImpact($optimizations) {
        return ['total_revenue_impact' => 150000];
    }
    
    private function createPriceImplementationPlan($optimizations) {
        return ['implementation_phases' => 3];
    }
    
    private function definePriceMonitoringMetrics($optimizations) {
        return ['metrics' => ['conversion_rate', 'revenue', 'competitor_response']];
    }
    
    private function getABTestData($test_id) {
        return [
            'duration' => 30,
            'group_a' => ['size' => 1000, 'performance' => 12.5],
            'group_b' => ['size' => 1000, 'performance' => 15.2]
        ];
    }
    
    private function performStatisticalAnalysis($test_data, $metric, $significance_level) {
        return [
            'relative_improvement' => 21.6,
            'p_value' => 0.025,
            'is_significant' => true,
            'power' => 0.85
        ];
    }
    
    private function calculateEffectSize($test_data, $metric) {
        return 0.65;
    }
    
    private function calculateConfidenceInterval($test_data, $metric, $significance_level) {
        return ['lower' => 1.2, 'upper' => 4.8];
    }
    
    private function analyzeBusinsss_Impact($test_data, $results) {
        return ['annual_revenue_impact' => 250000];
    }
    
    private function generateABTestRecommendations($results, $impact) {
        return ['recommendation' => 'implement_variant_b'];
    }
    
    private function defineNextSteps($results, $config) {
        return ['next_step' => 'full_rollout'];
    }
    
    private function getMetricHistoricalData($metric) {
        return [['date' => '2025-01-01', 'value' => 100]];
    }
    
    private function detectStatisticalAnomalies($data, $sensitivity) {
        return [['date' => '2025-01-15', 'value' => 250, 'severity' => 'high']];
    }
    
    private function detectMLAnomalies($data, $sensitivity) {
        return [['date' => '2025-01-15', 'value' => 250, 'severity' => 'high']];
    }
    
    private function detectHybridAnomalies($data, $sensitivity) {
        return [['date' => '2025-01-15', 'value' => 250, 'severity' => 'high']];
    }
    
    private function categorizeSeverity($anomalies) {
        return ['high' => 1, 'medium' => 2, 'low' => 1];
    }
    
    private function analyzeAnomalyTrends($anomalies) {
        return ['trend' => 'increasing_frequency'];
    }
    
    private function performRootCauseAnalysis($anomalies, $metric) {
        return ['likely_cause' => 'external_market_shock'];
    }
    
    private function generateAnomalySummary($anomalies) {
        return ['total_anomalies' => 4, 'critical_anomalies' => 1];
    }
    
    private function generateAnomalyAlerts($anomalies) {
        return [['type' => 'critical', 'message' => 'revenue_anomaly_detected']];
    }
    
    private function generateAnomalyActionItems($anomalies) {
        return [['priority' => 'high', 'action' => 'investigate_revenue_drop']];
    }
}

?>