<?php
/**
 * Amazon データAPI
 * new_structure/07_editing/api/amazon_data.php
 */

require_once __DIR__ . '/../../../shared/core/Database.php';
require_once __DIR__ . '/../../../shared/core/ApiResponse.php';
require_once __DIR__ . '/../../../shared/core/Logger.php';
require_once __DIR__ . '/../../02_scraping/amazon/AmazonDataProcessor.php';

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

class AmazonDataApi {
    private $db;
    private $logger;
    private $dataProcessor;
    
    public function __construct() {
        $this->db = new Database();
        $this->logger = new Logger('AmazonDataAPI');
        $this->dataProcessor = new AmazonDataProcessor();
    }
    
    /**
     * APIリクエスト処理
     */
    public function handleRequest() {
        try {
            // CSRF トークン検証
            $this->validateCsrfToken();
            
            $action = $_GET['action'] ?? $_POST['action'] ?? '';
            
            switch ($action) {
                case 'fetch':
                    return $this->fetchAmazonData();
                    
                case 'search':
                    return $this->searchAmazonProducts();
                    
                case 'detail':
                    return $this->getProductDetail();
                    
                case 'update_priority':
                    return $this->updatePriority();
                    
                case 'add_asins':
                    return $this->addAsins();
                    
                case 'fetch_history':
                    return $this->fetchPriceHistory();
                    
                case 'search_yahoo_related':
                    return $this->searchYahooRelated();
                    
                case 'cross_analysis':
                    return $this->getCrossAnalysis();
                    
                case 'update_product':
                    return $this->updateProduct();
                    
                case 'refresh_data':
                    return $this->refreshProductData();
                    
                default:
                    ApiResponse::error('無効なアクションです: ' . $action);
            }
            
        } catch (Exception $e) {
            $this->logger->error('API処理エラー: ' . $e->getMessage());
            ApiResponse::error('処理中にエラーが発生しました: ' . $e->getMessage());
        }
    }
    
    /**
     * CSRF トークン検証
     */
    private function validateCsrfToken() {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
        
        if (empty($token) || $token !== ($_SESSION['csrf_token'] ?? '')) {
            throw new Exception('CSRF トークンが無効です');
        }
    }
    
    /**
     * Amazon商品データ取得
     */
    private function fetchAmazonData() {
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(50, max(1, intval($_GET['limit'] ?? 12)));
        $offset = ($page - 1) * $limit;
        
        // 基本クエリ
        $baseQuery = "SELECT * FROM amazon_research_data";
        $whereConditions = [];
        $params = [];
        
        // フィルター条件
        if (isset($_GET['high_priority']) && $_GET['high_priority'] === 'true') {
            $whereConditions[] = "is_high_priority = TRUE";
        }
        
        if (isset($_GET['stock_out']) && $_GET['stock_out'] === 'true') {
            $whereConditions[] = "current_stock_status = 'OutOfStock'";
        }
        
        // 検索条件
        if (!empty($_GET['query'])) {
            $query = '%' . $_GET['query'] . '%';
            $whereConditions[] = "(title ILIKE ? OR asin ILIKE ? OR brand ILIKE ?)";
            $params = array_merge($params, [$query, $query, $query]);
        }
        
        // WHERE句追加
        if (!empty($whereConditions)) {
            $baseQuery .= " WHERE " . implode(" AND ", $whereConditions);
        }
        
        // 総数取得
        $countQuery = str_replace("SELECT *", "SELECT COUNT(*)", $baseQuery);
        $totalCount = $this->db->prepare($countQuery)->execute($params)->fetch()['count'];
        
        // ソート
        $sortBy = $_GET['sort_by'] ?? 'updated_at';
        $sortOrder = $_GET['sort_order'] ?? 'DESC';
        
        $allowedSorts = ['updated_at', 'current_price', 'price_fluctuation_count', 'title', 'created_at'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'updated_at';
        }
        
        $sortOrder = strtoupper($sortOrder) === 'ASC' ? 'ASC' : 'DESC';
        
        $baseQuery .= " ORDER BY {$sortBy} {$sortOrder}";
        $baseQuery .= " LIMIT {$limit} OFFSET {$offset}";
        
        // データ取得
        $products = $this->db->prepare($baseQuery)->execute($params)->fetchAll();
        
        // ページネーション情報
        $totalPages = ceil($totalCount / $limit);
        $pagination = [
            'current_page' => $page,
            'total_pages' => $totalPages,
            'total_count' => $totalCount,
            'per_page' => $limit,
            'has_next' => $page < $totalPages,
            'has_prev' => $page > 1
        ];
        
        ApiResponse::success([
            'products' => $products,
            'pagination' => $pagination
        ]);
    }
    
    /**
     * Amazon商品検索
     */
    private function searchAmazonProducts() {
        // fetch と同じロジックを使用（検索パラメータ付き）
        $this->fetchAmazonData();
    }
    
    /**
     * 商品詳細取得
     */
    private function getProductDetail() {
        $asin = trim($_GET['asin'] ?? '');
        
        if (empty($asin)) {
            ApiResponse::error('ASINが必要です');
            return;
        }
        
        // 商品詳細取得
        $product = $this->db->prepare("SELECT * FROM amazon_research_data WHERE asin = ?")
                           ->execute([$asin])
                           ->fetch();
        
        if (!$product) {
            ApiResponse::error('指定された商品が見つかりません');
            return;
        }
        
        // 最近の価格履歴も取得
        $priceHistory = $this->db->prepare("
            SELECT price, stock_status, recorded_at, change_percentage, notes 
            FROM amazon_price_history 
            WHERE asin = ? 
            ORDER BY recorded_at DESC 
            LIMIT 30
        ")->execute([$asin])->fetchAll();
        
        ApiResponse::success([
            'product' => $product,
            'price_history' => $priceHistory
        ]);
    }
    
    /**
     * 優先度更新
     */
    private function updatePriority() {
        $asin = trim($_POST['asin'] ?? '');
        $isHighPriority = filter_var($_POST['is_high_priority'] ?? false, FILTER_VALIDATE_BOOLEAN);
        
        if (empty($asin)) {
            ApiResponse::error('ASINが必要です');
            return;
        }
        
        $sql = "UPDATE amazon_research_data SET is_high_priority = ?, updated_at = NOW() WHERE asin = ?";
        $result = $this->db->prepare($sql)->execute([$isHighPriority, $asin]);
        
        if ($result->rowCount() > 0) {
            $this->logger->info('優先度更新', [
                'asin' => $asin,
                'is_high_priority' => $isHighPriority
            ]);
            
            ApiResponse::success([
                'asin' => $asin,
                'is_high_priority' => $isHighPriority
            ], '優先度を更新しました');
        } else {
            ApiResponse::error('商品が見つからないか、更新に失敗しました');
        }
    }
    
    /**
     * ASIN追加
     */
    private function addAsins() {
        $asinInput = trim($_POST['asins'] ?? '');
        $isHighPriority = filter_var($_POST['is_high_priority'] ?? false, FILTER_VALIDATE_BOOLEAN);
        
        if (empty($asinInput)) {
            ApiResponse::error('ASINが必要です');
            return;
        }
        
        // ASINリストを解析
        $asins = array_filter(array_map('trim', preg_split('/[\r\n,\s]+/', $asinInput)));
        $validAsins = array_filter($asins, function($asin) {
            return preg_match('/^[A-Z0-9]{10}$/', $asin);
        });
        
        if (empty($validAsins)) {
            ApiResponse::error('有効なASINが見つかりません');
            return;
        }
        
        try {
            // Amazon APIからデータ取得・保存
            $results = $this->dataProcessor->processAsinList($validAsins);
            
            // 優先度設定
            if ($isHighPriority) {
                foreach ($validAsins as $asin) {
                    $this->db->prepare("UPDATE amazon_research_data SET is_high_priority = TRUE WHERE asin = ?")
                             ->execute([$asin]);
                }
            }
            
            $this->logger->info('ASIN追加完了', [
                'asins' => $validAsins,
                'results' => $results
            ]);
            
            ApiResponse::success([
                'added_asins' => $validAsins,
                'results' => $results
            ], count($validAsins) . '件のASINを追加しました');
            
        } catch (Exception $e) {
            $this->logger->error('ASIN追加エラー: ' . $e->getMessage());
            ApiResponse::error('ASIN追加中にエラーが発生しました: ' . $e->getMessage());
        }
    }
    
    /**
     * 価格履歴取得
     */
    private function fetchPriceHistory() {
        $asin = trim($_GET['asin'] ?? '');
        
        if (empty($asin)) {
            ApiResponse::error('ASINが必要です');
            return;
        }
        
        $history = $this->db->prepare("
            SELECT price, stock_status, recorded_at, change_percentage, notes 
            FROM amazon_price_history 
            WHERE asin = ? 
            ORDER BY recorded_at DESC 
            LIMIT 100
        ")->execute([$asin])->fetchAll();
        
        // Chart.js用のデータ形式に変換
        $chartData = $this->formatPriceHistoryForChart($history);
        
        ApiResponse::success([
            'asin' => $asin,
            'history' => $history,
            'chart_data' => $chartData
        ]);
    }
    
    /**
     * Chart.js用のデータ形式変換
     */
    private function formatPriceHistoryForChart(array $history) {
        $labels = [];
        $prices = [];
        $stockStatuses = [];
        
        // 時系列順に並び替え
        $reversedHistory = array_reverse($history);
        
        foreach ($reversedHistory as $record) {
            $labels[] = date('m/d H:i', strtotime($record['recorded_at']));
            $prices[] = (float)$record['price'];
            $stockStatuses[] = $record['stock_status'];
        }
        
        return [
            'labels' => $labels,
            'datasets' => [
                [
                    'label' => '価格推移',
                    'data' => $prices,
                    'borderColor' => '#007bff',
                    'backgroundColor' => 'rgba(0, 123, 255, 0.1)',
                    'fill' => true,
                    'tension' => 0.1
                ]
            ]
        ];
    }
    
    /**
     * Yahoo!関連商品検索
     */
    private function searchYahooRelated() {
        $amazonTitle = trim($_POST['title'] ?? '');
        $amazonAsin = trim($_POST['asin'] ?? '');
        
        if (empty($amazonTitle)) {
            ApiResponse::error('商品タイトルが必要です');
            return;
        }
        
        try {
            // Amazonタイトルからキーワード抽出
            $keywords = $this->extractKeywords($amazonTitle);
            
            // Yahoo!データベースで類似商品検索
            $yahooResults = $this->searchYahooDatabase($keywords);
            
            // 既存マッチング確認
            $existingMatch = $this->db->prepare("
                SELECT * FROM product_cross_reference 
                WHERE amazon_asin = ?
            ")->execute([$amazonAsin])->fetch();
            
            ApiResponse::success([
                'amazon_title' => $amazonTitle,
                'amazon_asin' => $amazonAsin,
                'keywords' => $keywords,
                'yahoo_results' => $yahooResults,
                'existing_match' => $existingMatch,
                'match_count' => count($yahooResults)
            ]);
            
        } catch (Exception $e) {
            $this->logger->error('Yahoo!関連商品検索エラー: ' . $e->getMessage());
            ApiResponse::error('検索中にエラーが発生しました');
        }
    }
    
    /**
     * キーワード抽出
     */
    private function extractKeywords(string $title) {
        // 日本語と英語の両方に対応したキーワード抽出
        $title = mb_strtolower($title);
        
        // 不要な文字を除去
        $cleanTitle = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $title);
        
        // 単語分割
        $words = preg_split('/\s+/', $cleanTitle);
        
        // ストップワード除去
        $stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'は', 'が', 'を', 'に', 'で', 'と', 'の'];
        $keywords = array_filter($words, function($word) use ($stopWords) {
            return strlen($word) > 2 && !in_array($word, $stopWords);
        });
        
        // 重要度でソート（長い単語ほど重要）
        usort($keywords, function($a, $b) {
            return strlen($b) - strlen($a);
        });
        
        return array_slice(array_unique($keywords), 0, 5);
    }
    
    /**
     * Yahoo!データベース検索
     */
    private function searchYahooDatabase(array $keywords) {
        if (empty($keywords)) {
            return [];
        }
        
        // 検索クエリ構築
        $searchConditions = [];
        $params = [];
        
        foreach ($keywords as $keyword) {
            $searchConditions[] = "title ILIKE ?";
            $params[] = "%{$keyword}%";
        }
        
        $sql = "SELECT id, title, current_price, url, end_time, created_at 
                FROM yahoo_scraped_products 
                WHERE " . implode(" OR ", $searchConditions) . "
                ORDER BY created_at DESC 
                LIMIT 20";
        
        try {
            $results = $this->db->prepare($sql)->execute($params)->fetchAll();
            
            // マッチング信頼度を計算
            foreach ($results as &$result) {
                $result['match_confidence'] = $this->calculateMatchConfidence($keywords, $result['title']);
            }
            
            // 信頼度でソート
            usort($results, function($a, $b) {
                return $b['match_confidence'] <=> $a['match_confidence'];
            });
            
            return $results;
            
        } catch (Exception $e) {
            $this->logger->error('Yahoo!データベース検索エラー: ' . $e->getMessage());
            return [];
        }
    }
    
    /**
     * マッチング信頼度計算
     */
    private function calculateMatchConfidence(array $keywords, string $title) {
        $title = mb_strtolower($title);
        $matchCount = 0;
        
        foreach ($keywords as $keyword) {
            if (mb_strpos($title, mb_strtolower($keyword)) !== false) {
                $matchCount++;
            }
        }
        
        return round(($matchCount / count($keywords)) * 100, 1);
    }
    
    /**
     * 横断分析データ取得
     */
    private function getCrossAnalysis() {
        try {
            // Amazon商品統計
            $amazonStats = $this->db->query("
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(CASE WHEN is_high_priority THEN 1 END) as high_priority_count,
                    COUNT(CASE WHEN current_stock_status = 'OutOfStock' THEN 1 END) as out_of_stock_count,
                    AVG(current_price) as avg_price,
                    MAX(price_fluctuation_count) as max_fluctuations
                FROM amazon_research_data
            ")->fetch();
            
            // Yahoo!商品統計
            $yahooStats = $this->db->query("
                SELECT 
                    COUNT(*) as total_products,
                    AVG(current_price) as avg_price,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
                FROM yahoo_scraped_products
            ")->fetch();
            
            // クロスリファレンス統計
            $crossRefStats = $this->db->query("
                SELECT 
                    COUNT(*) as total_matches,
                    AVG(match_confidence) as avg_confidence,
                    COUNT(CASE WHEN match_confidence > 80 THEN 1 END) as high_confidence_matches
                FROM product_cross_reference
            ")->fetch();
            
            // 最近のマッチング結果
            $recentMatches = $this->db->query("
                SELECT 
                    pcr.*,
                    ard.title as amazon_title,
                    ard.current_price as amazon_price,
                    ysp.title as yahoo_title,
                    ysp.current_price as yahoo_price
                FROM product_cross_reference pcr
                LEFT JOIN amazon_research_data ard ON pcr.amazon_asin = ard.asin
                LEFT JOIN yahoo_scraped_products ysp ON pcr.yahoo_product_id = ysp.id
                ORDER BY pcr.created_at DESC
                LIMIT 10
            ")->fetchAll();
            
            ApiResponse::success([
                'amazon_stats' => $amazonStats,
                'yahoo_stats' => $yahooStats,
                'cross_reference_stats' => $crossRefStats,
                'recent_matches' => $recentMatches
            ]);
            
        } catch (Exception $e) {
            $this->logger->error('横断分析エラー: ' . $e->getMessage());
            ApiResponse::error('分析データの取得に失敗しました');
        }
    }
    
    /**
     * 商品データ更新
     */
    private function updateProduct() {
        $asin = trim($_POST['asin'] ?? '');
        $updates = $_POST['updates'] ?? [];
        
        if (empty($asin) || empty($updates)) {
            ApiResponse::error('ASINと更新データが必要です');
            return;
        }
        
        try {
            $this->db->beginTransaction();
            
            // 許可された更新フィールド
            $allowedFields = ['is_high_priority', 'monitor_frequency'];
            $setParts = [];
            $params = [];
            
            foreach ($updates as $field => $value) {
                if (in_array($field, $allowedFields)) {
                    $setParts[] = "{$field} = ?";
                    $params[] = $value;
                }
            }
            
            if (!empty($setParts)) {
                $params[] = $asin;
                $sql = "UPDATE amazon_research_data SET " . implode(', ', $setParts) . ", updated_at = NOW() WHERE asin = ?";
                $this->db->prepare($sql)->execute($params);
            }
            
            $this->db->commit();
            
            $this->logger->info('商品データ更新', [
                'asin' => $asin,
                'updates' => $updates
            ]);
            
            ApiResponse::success(['asin' => $asin], '商品データを更新しました');
            
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logger->error('商品データ更新エラー: ' . $e->getMessage());
            ApiResponse::error('更新中にエラーが発生しました');
        }
    }
    
    /**
     * 商品データ再取得
     */
    private function refreshProductData() {
        $asins = $_POST['asins'] ?? [];
        
        if (empty($asins)) {
            ApiResponse::error('ASINが必要です');
            return;
        }
        
        try {
            // Amazon APIから最新データを取得
            $results = $this->dataProcessor->processAsinList($asins);
            
            $this->logger->info('商品データ再取得', [
                'asins' => $asins,
                'results' => $results
            ]);
            
            ApiResponse::success([
                'asins' => $asins,
                'results' => $results
            ], count($asins) . '件の商品データを更新しました');
            
        } catch (Exception $e) {
            $this->logger->error('商品データ再取得エラー: ' . $e->getMessage());
            ApiResponse::error('データ更新中にエラーが発生しました: ' . $e->getMessage());
        }
    }
}

// APIリクエスト処理実行
try {
    $api = new AmazonDataApi();
    $api->handleRequest();
    
} catch (Exception $e) {
    error_log('Amazon Data API Fatal Error: ' . $e->getMessage());
    ApiResponse::error('システムエラーが発生しました');
}
?>