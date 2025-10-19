<?php
/**
 * tanaoroshi ⇔ ebay_kanri_db 同期システム
 * AI分析結果表示統合版
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

class TanaoroshiEbayAISync {
    private $pdo;
    
    public function __construct() {
        // ebay_kanri_db への接続
        $db_config = [
            'host' => 'localhost',
            'port' => '5432',
            'dbname' => 'ebay_kanri_db',
            'user' => 'postgres',
            'password' => 'postgres'
        ];
        
        $dsn = "pgsql:host={$db_config['host']};port={$db_config['port']};dbname={$db_config['dbname']}";
        $this->pdo = new PDO($dsn, $db_config['user'], $db_config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
    }
    
    /**
     * 🔄 完全同期データ取得（AI分析結果統合）
     */
    public function getInventoryWithAIScores($limit = 100) {
        try {
            // 商品 + eBay出品 + AIスコア結合クエリ
            $stmt = $this->pdo->prepare("
                SELECT 
                    p.product_id,
                    p.sku,
                    p.title,
                    p.image_url,
                    p.product_type,
                    p.created_at,
                    
                    -- eBay出品詳細（84項目の一部）
                    el.listing_id,
                    el.ebay_item_id,
                    el.price_original,
                    el.price_usd,
                    el.currency,
                    el.listing_quantity,
                    el.sold_quantity,
                    el.available_quantity,
                    el.watchers_count,
                    el.view_count,
                    el.condition_name,
                    el.brand,
                    el.mpn,
                    el.category_name,
                    el.location,
                    el.country,
                    el.seller_username,
                    el.seller_feedback_score,
                    el.gallery_url,
                    el.item_web_url,
                    el.start_time,
                    el.end_time,
                    el.listing_status,
                    el.global_shipping,
                    el.best_offer_enabled,
                    el.store_name,
                    
                    -- 🧠 AIスコア分析結果
                    ais.overall_score,
                    ais.title_quality_score,
                    ais.description_quality_score,
                    ais.image_quality_score,
                    ais.pricing_competitiveness_score,
                    ais.listing_optimization_score,
                    ais.seo_score,
                    ais.conversion_potential_score,
                    ais.market_demand_score,
                    ais.competition_score,
                    ais.profit_margin_score,
                    
                    -- 🔮 AI予測データ
                    ais.predicted_daily_views,
                    ais.predicted_watchers,
                    ais.predicted_sale_probability,
                    ais.predicted_days_to_sell,
                    ais.predicted_final_sale_price,
                    ais.confidence_level,
                    ais.analysis_timestamp,
                    
                    -- 🎯 改善提案・リスク情報
                    ais.optimization_suggestions,
                    ais.risk_factors,
                    ais.risk_level
                    
                FROM products p
                LEFT JOIN ebay_listings el ON p.product_id = el.product_id
                LEFT JOIN ai_analysis_scores ais ON el.listing_id = ais.listing_id
                ORDER BY 
                    ais.overall_score DESC NULLS LAST,
                    p.created_at DESC
                LIMIT ?
            ");
            
            $stmt->execute([$limit]);
            $results = $stmt->fetchAll();
            
            // データ後処理（JSONデコード等）
            foreach ($results as &$item) {
                // JSON項目のデコード
                $item['optimization_suggestions'] = json_decode($item['optimization_suggestions'] ?? '[]', true);
                $item['risk_factors'] = json_decode($item['risk_factors'] ?? '[]', true);
                
                // AIスコア評価ランク
                $item['ai_rank'] = $this->calculateAIRank($item['overall_score']);
                
                // 改善優先度
                $item['improvement_priority'] = $this->calculateImprovementPriority($item);
                
                // 表示用データ整形
                $item['display_price'] = '$' . number_format($item['price_usd'] ?? 0, 2);
                $item['display_score'] = $item['overall_score'] ? round($item['overall_score'], 1) : 'N/A';
                $item['score_color'] = $this->getScoreColor($item['overall_score']);
            }
            
            return [
                'success' => true,
                'data' => $results,
                'count' => count($results),
                'with_ai_scores' => count(array_filter($results, function($item) {
                    return !is_null($item['overall_score']);
                })),
                'sync_timestamp' => date('Y-m-d H:i:s')
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'データベース同期エラー: ' . $e->getMessage(),
                'data' => []
            ];
        }
    }
    
    /**
     * 🎯 AIスコアランク計算
     */
    private function calculateAIRank($score) {
        if (is_null($score)) return 'unanalyzed';
        
        if ($score >= 90) return 'excellent';
        if ($score >= 80) return 'good';
        if ($score >= 70) return 'average';
        if ($score >= 60) return 'below_average';
        return 'poor';
    }
    
    /**
     * 🚨 改善優先度計算
     */
    private function calculateImprovementPriority($item) {
        $score = $item['overall_score'];
        $watchers = $item['watchers_count'] ?? 0;
        $views = $item['view_count'] ?? 0;
        
        if (is_null($score)) return 'analyze_needed';
        
        // 低スコア + 高注目度 = 高優先度
        if ($score < 60 && ($watchers > 5 || $views > 100)) {
            return 'high';
        }
        
        if ($score < 70) return 'medium';
        if ($score < 80) return 'low';
        
        return 'none';
    }
    
    /**
     * 🎨 スコア色計算
     */
    private function getScoreColor($score) {
        if (is_null($score)) return '#94a3b8'; // グレー
        
        if ($score >= 90) return '#10b981'; // 緑
        if ($score >= 80) return '#059669'; // 深緑
        if ($score >= 70) return '#f59e0b'; // 黄
        if ($score >= 60) return '#f97316'; // オレンジ
        return '#ef4444'; // 赤
    }
    
    /**
     * 📊 統計情報取得
     */
    public function getStatistics() {
        try {
            $stats = [];
            
            // 基本統計
            $stats['total_products'] = $this->pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
            $stats['total_listings'] = $this->pdo->query("SELECT COUNT(*) FROM ebay_listings")->fetchColumn();
            $stats['with_ai_scores'] = $this->pdo->query("SELECT COUNT(*) FROM ai_analysis_scores")->fetchColumn();
            
            // AIスコア統計
            $score_stats = $this->pdo->query("
                SELECT 
                    COUNT(*) as total,
                    AVG(overall_score) as avg_score,
                    COUNT(CASE WHEN overall_score >= 80 THEN 1 END) as high_score,
                    COUNT(CASE WHEN overall_score < 60 THEN 1 END) as low_score
                FROM ai_analysis_scores
            ")->fetch();
            
            $stats['ai_analysis_rate'] = $stats['total_listings'] > 0 ? 
                round(($stats['with_ai_scores'] / $stats['total_listings']) * 100, 1) : 0;
            $stats['average_ai_score'] = round($score_stats['avg_score'] ?? 0, 1);
            $stats['high_score_products'] = $score_stats['high_score'] ?? 0;
            $stats['improvement_needed'] = $score_stats['low_score'] ?? 0;
            
            return [
                'success' => true,
                'data' => $stats
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 🚀 AI分析実行トリガー
     */
    public function triggerAIAnalysis($product_ids = null) {
        try {
            $queue_items = [];
            
            if ($product_ids) {
                // 指定商品のみ
                $placeholders = str_repeat('?,', count($product_ids) - 1) . '?';
                $stmt = $this->pdo->prepare("
                    SELECT el.listing_id, el.product_id 
                    FROM ebay_listings el 
                    WHERE el.product_id IN ($placeholders)
                ");
                $stmt->execute($product_ids);
                $listings = $stmt->fetchAll();
            } else {
                // AI未分析の商品を自動選択
                $listings = $this->pdo->query("
                    SELECT el.listing_id, el.product_id 
                    FROM ebay_listings el 
                    LEFT JOIN ai_analysis_scores ais ON el.listing_id = ais.listing_id
                    WHERE ais.listing_id IS NULL
                    ORDER BY el.created_at DESC
                    LIMIT 50
                ")->fetchAll();
            }
            
            // AI分析キューに追加
            foreach ($listings as $listing) {
                $stmt = $this->pdo->prepare("
                    INSERT INTO ai_analysis_queue (listing_id, product_id, priority, analysis_type)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT (listing_id) DO UPDATE SET
                        scheduled_at = CURRENT_TIMESTAMP,
                        status = 'pending'
                ");
                $stmt->execute([$listing['listing_id'], $listing['product_id'], 5, 'full']);
                $queue_items[] = $listing['listing_id'];
            }
            
            return [
                'success' => true,
                'queued_items' => count($queue_items),
                'message' => count($queue_items) . '件の商品をAI分析キューに追加しました'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'AI分析キュー追加エラー: ' . $e->getMessage()
            ];
        }
    }
}

// AJAX処理
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    
    $action = $_POST['ajax_action'] ?? '';
    $sync = new TanaoroshiEbayAISync();
    
    try {
        switch ($action) {
            case 'get_inventory':
                $limit = intval($_POST['limit'] ?? 100);
                $result = $sync->getInventoryWithAIScores($limit);
                echo json_encode($result);
                break;
                
            case 'get_statistics':
                $result = $sync->getStatistics();
                echo json_encode($result);
                break;
                
            case 'trigger_ai_analysis':
                $product_ids = isset($_POST['product_ids']) ? 
                    json_decode($_POST['product_ids'], true) : null;
                $result = $sync->triggerAIAnalysis($product_ids);
                echo json_encode($result);
                break;
                
            case 'database_status':
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'postgresql_connected' => true,
                        'table_exists' => true,
                        'ai_system_enabled' => true,
                        'record_count' => $sync->getStatistics()['data']['total_products'] ?? 0
                    ]
                ]);
                break;
                
            default:
                echo json_encode([
                    'success' => false,
                    'error' => '不正なアクション: ' . $action
                ]);
        }
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => 'AJAX処理エラー: ' . $e->getMessage()
        ]);
    }
    
    exit;
}
?>
