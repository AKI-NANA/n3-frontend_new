<?php
/**
 * 楽天市場スクレイピングクラス
 * 
 * 作成日: 2025-09-25
 * 用途: 楽天市場商品データの取得・解析
 * 依存: rakuten_parser_v2025.php
 */

require_once __DIR__ . '/rakuten_parser_v2025.php';

class RakutenScraper {
    
    private $pdo;
    private $user_agents;
    private $request_delay;
    private $max_retries;
    private $timeout;
    
    /**
     * コンストラクタ
     * 
     * @param PDO $pdo データベース接続
     */
    public function __construct($pdo = null) {
        $this->pdo = $pdo;
        $this->request_delay = 2; // リクエスト間隔（秒）
        $this->max_retries = 3;   // 最大リトライ回数
        $this->timeout = 30;      // タイムアウト（秒）
        
        // ユーザーエージェントローテーション
        $this->user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
        ];
        
        writeLog("楽天スクレイパー初期化完了", 'INFO');
    }
    
    /**
     * 楽天商品ページをスクレイピング
     * 
     * @param string $url 楽天商品ページURL
     * @return array スクレイピング結果
     */
    public function scrapeProduct($url) {
        try {
            writeLog("楽天商品スクレイピング開始: {$url}", 'INFO');
            
            // URL検証
            if (!$this->isValidRakutenUrl($url)) {
                throw new Exception("無効な楽天URLです: {$url}");
            }
            
            // 商品ID抽出
            $item_id = extractRakutenItemId($url);
            writeLog("楽天商品ID抽出: {$item_id}", 'INFO');
            
            // HTML取得
            $html = $this->fetchHtml($url);
            if (!$html) {
                throw new Exception("HTMLの取得に失敗しました");
            }
            
            // データ解析
            $scraped_data = parseRakutenProductHTML_V2025($html, $url, $item_id);
            
            // データ検証
            if (!validateRakutenData($scraped_data)) {
                writeLog("楽天データ検証に失敗", 'WARNING');
                // 検証失敗でも部分的なデータを返す
            }
            
            // データベース保存
            if ($this->pdo && $this->shouldSaveToDatabase($scraped_data)) {
                $this->saveToDatabase($scraped_data);
            }
            
            writeLog("楽天商品スクレイピング完了: {$scraped_data['title']}", 'SUCCESS');
            
            return [
                'success' => true,
                'data' => $scraped_data,
                'message' => '楽天商品データの取得に成功しました'
            ];
            
        } catch (Exception $e) {
            writeLog("楽天スクレイピングエラー: " . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'data' => null,
                'message' => $e->getMessage(),
                'error_type' => 'rakuten_scraping_error'
            ];
        }
    }
    
    /**
     * 複数の楽天商品を一括スクレイピング
     * 
     * @param array $urls 楽天商品ページURLの配列
     * @return array 一括スクレイピング結果
     */
    public function scrapeBatch($urls) {
        $results = [];
        $success_count = 0;
        $error_count = 0;
        
        writeLog("楽天一括スクレイピング開始: " . count($urls) . "件", 'INFO');
        
        foreach ($urls as $index => $url) {
            try {
                writeLog("楽天スクレイピング進行中: " . ($index + 1) . "/" . count($urls), 'INFO');
                
                $result = $this->scrapeProduct($url);
                $results[] = $result;
                
                if ($result['success']) {
                    $success_count++;
                } else {
                    $error_count++;
                }
                
                // リクエスト間隔を守る
                if ($index < count($urls) - 1) {
                    sleep($this->request_delay);
                }
                
            } catch (Exception $e) {
                $error_count++;
                $results[] = [
                    'success' => false,
                    'data' => null,
                    'message' => $e->getMessage(),
                    'url' => $url
                ];
                writeLog("楽天一括スクレイピングエラー: {$url} - " . $e->getMessage(), 'ERROR');
            }
        }
        
        writeLog("楽天一括スクレイピング完了: 成功{$success_count}件、エラー{$error_count}件", 'INFO');
        
        return [
            'success' => $success_count > 0,
            'results' => $results,
            'summary' => [
                'total' => count($urls),
                'success_count' => $success_count,
                'error_count' => $error_count,
                'success_rate' => $success_count > 0 ? round(($success_count / count($urls)) * 100, 2) : 0
            ]
        ];
    }
    
    /**
     * HTMLを取得
     * 
     * @param string $url URL
     * @return string|false HTML文字列、失敗時はfalse
     */
    private function fetchHtml($url) {
        $attempts = 0;
        
        while ($attempts < $this->max_retries) {
            try {
                $attempts++;
                writeLog("楽天HTML取得試行: {$attempts}/{$this->max_retries} - {$url}", 'INFO');
                
                // cURLセットアップ
                $ch = curl_init();
                curl_setopt_array($ch, [
                    CURLOPT_URL => $url,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => $this->timeout,
                    CURLOPT_USERAGENT => $this->getRandomUserAgent(),
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_MAXREDIRS => 5,
                    CURLOPT_SSL_VERIFYPEER => false,
                    CURLOPT_ENCODING => '', // 圧縮を有効化
                    CURLOPT_HTTPHEADER => [
                        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language: ja-JP,ja;q=0.9,en;q=0.8',
                        'Accept-Encoding: gzip, deflate, br',
                        'DNT: 1',
                        'Connection: keep-alive',
                        'Upgrade-Insecure-Requests: 1'
                    ]
                ]);
                
                $html = curl_exec($ch);
                $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curl_error = curl_error($ch);
                curl_close($ch);
                
                if ($curl_error) {
                    throw new Exception("cURLエラー: {$curl_error}");
                }
                
                if ($http_code !== 200) {
                    throw new Exception("HTTPエラー: {$http_code}");
                }
                
                if (!$html) {
                    throw new Exception("空のHTMLレスポンス");
                }
                
                writeLog("楽天HTML取得成功: " . strlen($html) . " bytes", 'SUCCESS');
                return $html;
                
            } catch (Exception $e) {
                writeLog("楽天HTML取得エラー (試行{$attempts}): " . $e->getMessage(), 'WARNING');
                
                if ($attempts < $this->max_retries) {
                    $wait_time = $attempts * 2; // 指数バックオフ
                    writeLog("楽天HTML取得リトライ待機: {$wait_time}秒", 'INFO');
                    sleep($wait_time);
                } else {
                    writeLog("楽天HTML取得最大試行回数に達しました", 'ERROR');
                }
            }
        }
        
        return false;
    }
    
    /**
     * データベースに保存
     * 
     * @param array $data スクレイピングされたデータ
     * @return bool 保存成功かどうか
     */
    private function saveToDatabase($data) {
        try {
            // 既存レコードのチェック
            $stmt = $this->pdo->prepare("
                SELECT id FROM yahoo_scraped_products 
                WHERE original_url = ? AND platform = 'rakuten'
            ");
            $stmt->execute([$data['url']]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing) {
                // 更新
                $stmt = $this->pdo->prepare("
                    UPDATE yahoo_scraped_products SET
                        title = ?, current_price = ?, description = ?,
                        images = ?, seller_info = ?, categories = ?,
                        rating_info = ?, shipping_info = ?, 
                        scraped_at = ?, extraction_method = ?
                    WHERE id = ?
                ");
                $stmt->execute([
                    $data['title'],
                    $data['current_price'],
                    $data['description'],
                    json_encode($data['images']),
                    json_encode($data['seller_info']),
                    json_encode($data['categories']),
                    json_encode($data['rating_info']),
                    json_encode($data['shipping_info']),
                    $data['scraped_at'],
                    $data['extraction_method'],
                    $existing['id']
                ]);
                writeLog("楽天データ更新完了: {$data['title']}", 'SUCCESS');
            } else {
                // 新規挿入
                $stmt = $this->pdo->prepare("
                    INSERT INTO yahoo_scraped_products (
                        item_id, title, current_price, description, images,
                        seller_info, categories, rating_info, shipping_info,
                        original_url, platform, scraped_at, extraction_method
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'rakuten', ?, ?)
                ");
                $stmt->execute([
                    $data['item_id'],
                    $data['title'],
                    $data['current_price'],
                    $data['description'],
                    json_encode($data['images']),
                    json_encode($data['seller_info']),
                    json_encode($data['categories']),
                    json_encode($data['rating_info']),
                    json_encode($data['shipping_info']),
                    $data['url'],
                    $data['scraped_at'],
                    $data['extraction_method']
                ]);
                writeLog("楽天データ挿入完了: {$data['title']}", 'SUCCESS');
            }
            
            return true;
            
        } catch (Exception $e) {
            writeLog("楽天データベース保存エラー: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * 有効な楽天URLかチェック
     * 
     * @param string $url URL
     * @return bool 有効かどうか
     */
    private function isValidRakutenUrl($url) {
        return isRakutenUrl($url) && 
               strpos($url, 'item.rakuten.co.jp') !== false &&
               filter_var($url, FILTER_VALIDATE_URL) !== false;
    }
    
    /**
     * データベース保存が必要かチェック
     * 
     * @param array $data データ
     * @return bool 保存が必要かどうか
     */
    private function shouldSaveToDatabase($data) {
        return !empty($data['title']) && 
               $data['current_price'] > 0 &&
               !empty($data['url']);
    }
    
    /**
     * ランダムなユーザーエージェントを取得
     * 
     * @return string ユーザーエージェント
     */
    private function getRandomUserAgent() {
        return $this->user_agents[array_rand($this->user_agents)];
    }
    
    /**
     * スクレイピング統計を取得
     * 
     * @return array 統計データ
     */
    public function getScrapingStats() {
        if (!$this->pdo) {
            return ['error' => 'データベース接続が必要です'];
        }
        
        try {
            $stmt = $this->pdo->query("
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(CASE WHEN platform = 'rakuten' THEN 1 END) as rakuten_products,
                    AVG(CASE WHEN platform = 'rakuten' THEN current_price END) as avg_rakuten_price,
                    MAX(scraped_at) as last_scraped
                FROM yahoo_scraped_products
            ");
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            writeLog("楽天統計取得エラー: " . $e->getMessage(), 'ERROR');
            return ['error' => $e->getMessage()];
        }
    }
    
    /**
     * 最近の楽天スクレイピング結果を取得
     * 
     * @param int $limit 取得件数
     * @return array 楽天商品データ
     */
    public function getRecentRakutenProducts($limit = 10) {
        if (!$this->pdo) {
            return [];
        }
        
        try {
            $stmt = $this->pdo->prepare("
                SELECT * FROM yahoo_scraped_products 
                WHERE platform = 'rakuten'
                ORDER BY scraped_at DESC 
                LIMIT ?
            ");
            $stmt->execute([$limit]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            writeLog("楽天商品取得エラー: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }
}

writeLog("✅ 楽天スクレイパークラス読み込み完了", 'SUCCESS');
?>