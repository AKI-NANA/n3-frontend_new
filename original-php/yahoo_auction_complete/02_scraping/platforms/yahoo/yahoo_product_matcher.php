<?php
/**
 * Yahoo!×Amazon商品マッチングエンジン
 * new_structure/02_scraping/matcher/ProductMatcher.php
 */

require_once __DIR__ . '/../../shared/core/Database.php';
require_once __DIR__ . '/../../shared/core/Logger.php';
require_once __DIR__ . '/../amazon/AmazonApiClient.php';

class ProductMatcher {
    private $db;
    private $logger;
    private $amazonClient;
    private $config;
    
    // マッチング設定
    private $matchingThreshold = 0.75; // マッチング信頼度の最低基準
    private $batchSize = 50;
    private $maxSearchResults = 10;
    
    public function __construct() {
        $this->db = new Database();
        $this->logger = new Logger('ProductMatcher');
        $this->amazonClient = new AmazonApiClient();
        $this->config = require __DIR__ . '/../../shared/config/amazon_api.php';
        
        // 設定値で上書き
        $this->matchingThreshold = $this->config['matching']['confidence_threshold'] ?? $this->matchingThreshold;
        $this->batchSize = $this->config['matching']['batch_size'] ?? $this->batchSize;
    }
    
    /**
     * Yahoo!商品に対応するAmazon商品を自動検索・マッチング
     * 
     * @param int $yahooProductId Yahoo!商品ID
     * @return array|false マッチング結果
     */
    public function findAmazonMatches(int $yahooProductId) {
        try {
            // Yahoo!商品情報取得
            $yahooProduct = $this->getYahooProduct($yahooProductId);
            if (!$yahooProduct) {
                $this->logger->warning('Yahoo!商品が見つかりません', ['id' => $yahooProductId]);
                return false;
            }
            
            $this->logger->info('マッチング開始', [
                'yahoo_id' => $yahooProductId,
                'title' => $yahooProduct['title']
            ]);
            
            // キーワード抽出とAmazon検索
            $keywords = $this->extractSearchKeywords($yahooProduct['title']);
            $amazonResults = $this->searchAmazonByKeywords($keywords, $yahooProduct);
            
            if (empty($amazonResults)) {
                $this->logger->info('Amazon検索結果なし', ['keywords' => $keywords]);
                return [];
            }
            
            // マッチング判定
            $matches = [];
            foreach ($amazonResults as $amazonProduct) {
                $confidence = $this->calculateMatchConfidence($yahooProduct, $amazonProduct);
                
                if ($confidence >= $this->matchingThreshold) {
                    $matches[] = [
                        'asin' => $amazonProduct['asin'],
                        'title' => $amazonProduct['title'],
                        'confidence' => $confidence,
                        'match_type' => $this->determineMatchType($confidence),
                        'price_comparison' => $this->comparePrices($yahooProduct, $amazonProduct)
                    ];
                }
            }
            
            // 信頼度でソート
            usort($matches, function($a, $b) {
                return $b['confidence'] <=> $a['confidence'];
            });
            
            // マッチング結果をデータベースに保存
            if (!empty($matches)) {
                $this->saveMatchingResults($yahooProductId, $matches);
            }
            
            $this->logger->info('マッチング完了', [
                'yahoo_id' => $yahooProductId,
                'matches_found' => count($matches)
            ]);
            
            return $matches;
            
        } catch (Exception $e) {
            $this->logger->error('マッチング処理エラー', [
                'yahoo_id' => $yahooProductId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * Yahoo!商品情報取得
     * 
     * @param int $yahooProductId Yahoo!商品ID
     * @return array|false 商品情報
     */
    private function getYahooProduct(int $yahooProductId) {
        $sql = "SELECT id, title, current_price, url, description, category, brand, condition_text 
                FROM yahoo_scraped_products 
                WHERE id = ?";
        
        return $this->db->prepare($sql)->execute([$yahooProductId])->fetch();
    }
    
    /**
     * 検索キーワード抽出
     * 
     * @param string $title 商品タイトル
     * @return array キーワード配列
     */
    private function extractSearchKeywords(string $title) {
        // タイトルクリーニング
        $cleanTitle = $this->cleanProductTitle($title);
        
        // ブランド名抽出
        $brands = $this->extractBrandNames($cleanTitle);
        
        // 型番・モデル番号抽出
        $modelNumbers = $this->extractModelNumbers($cleanTitle);
        
        // 一般キーワード抽出
        $generalKeywords = $this->extractGeneralKeywords($cleanTitle);
        
        // キーワードを重要度順で結合
        $keywords = array_merge($brands, $modelNumbers, $generalKeywords);
        
        // 重複除去と制限
        $keywords = array_unique(array_filter($keywords));
        return array_slice($keywords, 0, 5);
    }
    
    /**
     * 商品タイトルクリーニング
     * 
     * @param string $title 原題
     * @return string クリーニング済み
     */
    private function cleanProductTitle(string $title) {
        // HTML タグ除去
        $title = strip_tags($title);
        
        // 特殊文字の正規化
        $title = mb_convert_kana($title, 'as', 'UTF-8');
        
        // ノイズワード除去
        $noisePatterns = [
            '/\[.*?\]/',           // [新品]、[中古]等
            '/【.*?】/',           // 【送料無料】等
            '/\(.*?円.*?\)/',      // (1000円)等の価格表記
            '/送料.*?[無料込]/',    // 送料関連
            '/即決|即落札/',       // オークション関連
            '/新品|中古|美品/',     // 状態関連
            '/[0-9]+年[0-9]+月発売/', // 発売日情報
        ];
        
        foreach ($noisePatterns as $pattern) {
            $title = preg_replace($pattern, ' ', $title);
        }
        
        // 複数スペースを単一化
        $title = preg_replace('/\s+/', ' ', trim($title));
        
        return $title;
    }
    
    /**
     * ブランド名抽出
     * 
     * @param string $title タイトル
     * @return array ブランド名配列
     */
    private function extractBrandNames(string $title) {
        // 有名ブランドリスト（例）
        $knownBrands = [
            'Apple', 'Sony', 'Samsung', 'Nintendo', 'Canon', 'Nikon', 'Panasonic',
            'CASIO', 'SEIKO', 'CITIZEN', 'BOSE', 'JBL', 'Audio-Technica',
            'Microsoft', 'Google', 'Amazon', 'Anker', 'RAVPower',
            'アップル', 'ソニー', 'サムスン', 'ニンテンドー', 'キヤノン', 'ニコン',
            'パナソニック', 'カシオ', 'セイコー', 'シチズン', 'ボーズ'
        ];
        
        $foundBrands = [];
        $titleLower = mb_strtolower($title);
        
        foreach ($knownBrands as $brand) {
            if (mb_strpos($titleLower, mb_strtolower($brand)) !== false) {
                $foundBrands[] = $brand;
            }
        }
        
        return array_unique($foundBrands);
    }
    
    /**
     * モデル番号抽出
     * 
     * @param string $title タイトル
     * @return array モデル番号配列
     */
    private function extractModelNumbers(string $title) {
        $models = [];
        
        // 英数字の組み合わせパターン
        preg_match_all('/[A-Z]{1,3}[0-9]{2,6}[A-Z]?/', $title, $matches);
        if (!empty($matches[0])) {
            $models = array_merge($models, $matches[0]);
        }
        
        // ハイフン区切りの型番
        preg_match_all('/[A-Z0-9]+-[A-Z0-9]+/', $title, $matches);
        if (!empty($matches[0])) {
            $models = array_merge($models, $matches[0]);
        }
        
        return array_unique($models);
    }
    
    /**
     * 一般キーワード抽出
     * 
     * @param string $title タイトル
     * @return array キーワード配列
     */
    private function extractGeneralKeywords(string $title) {
        // 形態素解析の代わりにシンプルな単語分割
        $words = preg_split('/[\s\p{P}]+/u', $title, -1, PREG_SPLIT_NO_EMPTY);
        
        // ストップワード
        $stopWords = [
            '商品', '新品', '中古', '美品', '訳あり', '送料', '無料', '込み',
            '即決', '即落札', '出品', '販売', 'セット', 'まとめ', '大量',
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
        ];
        
        $keywords = [];
        foreach ($words as $word) {
            $word = trim($word);
            if (mb_strlen($word) >= 2 && !in_array(mb_strtolower($word), $stopWords)) {
                if (preg_match('/[\p{L}\p{N}]/u', $word)) { // 文字または数字を含む
                    $keywords[] = $word;
                }
            }
        }
        
        // 重要度計算（長い単語ほど重要）
        usort($keywords, function($a, $b) {
            return mb_strlen($b) - mb_strlen($a);
        });
        
        return array_slice(array_unique($keywords), 0, 10);
    }
    
    /**
     * Amazonキーワード検索
     * 
     * @param array $keywords キーワード配列
     * @param array $yahooProduct Yahoo!商品情報
     * @return array Amazon検索結果
     */
    private function searchAmazonByKeywords(array $keywords, array $yahooProduct) {
        $allResults = [];
        
        // 複数キーワード組み合わせで検索
        $searchQueries = $this->generateSearchQueries($keywords, $yahooProduct);
        
        foreach ($searchQueries as $query) {
            try {
                $this->logger->info('Amazon検索実行', ['query' => $query]);
                
                $results = $this->amazonClient->searchItems($query, [
                    'ItemCount' => $this->maxSearchResults,
                    'SearchIndex' => 'All'
                ]);
                
                if (isset($results['SearchResult']['Items'])) {
                    $items = $this->normalizeAmazonSearchResults($results['SearchResult']['Items']);
                    $allResults = array_merge($allResults, $items);
                }
                
                // API制限考慮
                sleep(1);
                
            } catch (Exception $e) {
                $this->logger->warning('Amazon検索エラー', [
                    'query' => $query,
                    'error' => $e->getMessage()
                ]);
                continue;
            }
        }
        
        // 重複除去（ASIN基準）
        $uniqueResults = [];
        $seenAsins = [];
        
        foreach ($allResults as $item) {
            if (!in_array($item['asin'], $seenAsins)) {
                $uniqueResults[] = $item;
                $seenAsins[] = $item['asin'];
            }
        }
        
        return $uniqueResults;
    }
    
    /**
     * 検索クエリ生成
     * 
     * @param array $keywords キーワード
     * @param array $yahooProduct Yahoo!商品情報
     * @return array 検索クエリ配列
     */
    private function generateSearchQueries(array $keywords, array $yahooProduct) {
        $queries = [];
        
        // 1. 最重要キーワード単体
        if (!empty($keywords)) {
            $queries[] = $keywords[0];
        }
        
        // 2. 上位2つのキーワード組み合わせ
        if (count($keywords) >= 2) {
            $queries[] = $keywords[0] . ' ' . $keywords[1];
        }
        
        // 3. ブランド + モデル組み合わせ
        $brands = array_filter($keywords, function($k) {
            return preg_match('/^[A-Za-z]{3,}$/', $k);
        });
        $models = array_filter($keywords, function($k) {
            return preg_match('/[A-Z0-9]/', $k) && preg_match('/[0-9]/', $k);
        });
        
        if (!empty($brands) && !empty($models)) {
            $queries[] = $brands[0] . ' ' . $models[0];
        }
        
        // 重複除去と制限
        return array_unique(array_slice($queries, 0, 3));
    }
    
    /**
     * Amazon検索結果正規化
     * 
     * @param array $amazonItems Amazon API結果
     * @return array 正規化されたデータ
     */
    private function normalizeAmazonSearchResults(array $amazonItems) {
        $normalized = [];
        
        foreach ($amazonItems as $item) {
            $price = null;
            if (isset($item['Offers']['Listings'][0]['Price']['Amount'])) {
                $price = $item['Offers']['Listings'][0]['Price']['Amount'];
            }
            
            $brand = $item['ItemInfo']['ByLineInfo']['Brand']['DisplayValue'] ?? '';
            $title = $item['ItemInfo']['Title']['DisplayValue'] ?? '';
            
            $normalized[] = [
                'asin' => $item['ASIN'],
                'title' => $title,
                'price' => $price,
                'brand' => $brand,
                'raw_data' => $item
            ];
        }
        
        return $normalized;
    }
    
    /**
     * マッチング信頼度計算
     * 
     * @param array $yahooProduct Yahoo!商品
     * @param array $amazonProduct Amazon商品
     * @return float 信頼度 (0.0-1.0)
     */
    private function calculateMatchConfidence(array $yahooProduct, array $amazonProduct) {
        // タイトル類似度 (60%)
        $titleSimilarity = $this->calculateTextSimilarity(
            $yahooProduct['title'], 
            $amazonProduct['title']
        );
        
        // ブランド一致度 (30%)
        $brandMatch = $this->checkBrandMatch($yahooProduct, $amazonProduct);
        
        // 価格範囲妥当性 (10%)
        $priceRange = $this->checkPriceRange($yahooProduct, $amazonProduct);
        
        // 重み付け計算
        $confidence = ($titleSimilarity * 0.6) + ($brandMatch * 0.3) + ($priceRange * 0.1);
        
        return round($confidence, 3);
    }
    
    /**
     * テキスト類似度計算
     * 
     * @param string $text1 テキスト1
     * @param string $text2 テキスト2
     * @return float 類似度 (0.0-1.0)
     */
    private function calculateTextSimilarity(string $text1, string $text2) {
        // 共通キーワード抽出
        $words1 = $this->extractGeneralKeywords($text1);
        $words2 = $this->extractGeneralKeywords($text2);
        
        if (empty($words1) || empty($words2)) {
            return 0.0;
        }
        
        // 正規化
        $words1 = array_map('mb_strtolower', $words1);
        $words2 = array_map('mb_strtolower', $words2);
        
        // 共通単語数
        $intersection = array_intersect($words1, $words2);
        $union = array_unique(array_merge($words1, $words2));
        
        // Jaccard係数
        return count($union) > 0 ? count($intersection) / count($union) : 0.0;
    }
    
    /**
     * ブランド一致確認
     * 
     * @param array $yahooProduct Yahoo!商品
     * @param array $amazonProduct Amazon商品
     * @return float 一致度 (0.0-1.0)
     */
    private function checkBrandMatch(array $yahooProduct, array $amazonProduct) {
        $yahooBrand = mb_strtolower($yahooProduct['brand'] ?? '');
        $amazonBrand = mb_strtolower($amazonProduct['brand'] ?? '');
        
        if (empty($yahooBrand) && empty($amazonBrand)) {
            return 0.5; // 両方不明の場合は中間値
        }
        
        if (empty($yahooBrand) || empty($amazonBrand)) {
            return 0.3; // 片方不明の場合は低評価
        }
        
        // 完全一致
        if ($yahooBrand === $amazonBrand) {
            return 1.0;
        }
        
        // 部分一致
        if (mb_strpos($yahooBrand, $amazonBrand) !== false || 
            mb_strpos($amazonBrand, $yahooBrand) !== false) {
            return 0.8;
        }
        
        return 0.0;
    }
    
    /**
     * 価格範囲確認
     * 
     * @param array $yahooProduct Yahoo!商品
     * @param array $amazonProduct Amazon商品
     * @return float 妥当性 (0.0-1.0)
     */
    private function checkPriceRange(array $yahooProduct, array $amazonProduct) {
        $yahooPrice = floatval($yahooProduct['current_price'] ?? 0);
        $amazonPrice = floatval($amazonProduct['price'] ?? 0);
        
        if ($yahooPrice <= 0 || $amazonPrice <= 0) {
            return 0.5; // 価格不明の場合は中間値
        }
        
        // USD->JPY概算変換 (Amazon価格)
        $amazonPriceJpy = $amazonPrice * 150; // 簡易レート
        
        // 価格差の割合
        $priceDiff = abs($yahooPrice - $amazonPriceJpy);
        $avgPrice = ($yahooPrice + $amazonPriceJpy) / 2;
        
        if ($avgPrice > 0) {
            $diffRatio = $priceDiff / $avgPrice;
            
            // 価格差が小さいほど高評価
            if ($diffRatio <= 0.1) return 1.0;      // 10%以内
            if ($diffRatio <= 0.3) return 0.8;      // 30%以内
            if ($diffRatio <= 0.5) return 0.5;      // 50%以内
            return 0.2;                              // 50%超
        }
        
        return 0.5;
    }
    
    /**
     * マッチタイプ決定
     * 
     * @param float $confidence 信頼度
     * @return string マッチタイプ
     */
    private function determineMatchType(float $confidence) {
        if ($confidence >= 0.9) return 'exact';
        if ($confidence >= 0.8) return 'high';
        if ($confidence >= 0.75) return 'similar';
        return 'variant';
    }
    
    /**
     * 価格比較データ生成
     * 
     * @param array $yahooProduct Yahoo!商品
     * @param array $amazonProduct Amazon商品
     * @return array 価格比較データ
     */
    private function comparePrices(array $yahooProduct, array $amazonProduct) {
        $yahooPrice = floatval($yahooProduct['current_price'] ?? 0);
        $amazonPrice = floatval($amazonProduct['price'] ?? 0);
        $amazonPriceJpy = $amazonPrice * 150; // 簡易変換
        
        return [
            'yahoo_price_jpy' => $yahooPrice,
            'amazon_price_usd' => $amazonPrice,
            'amazon_price_jpy' => $amazonPriceJpy,
            'price_difference' => $yahooPrice - $amazonPriceJpy,
            'cheaper_platform' => $yahooPrice < $amazonPriceJpy ? 'yahoo' : 'amazon'
        ];
    }
    
    /**
     * マッチング結果保存
     * 
     * @param int $yahooProductId Yahoo!商品ID
     * @param array $matches マッチング結果
     */
    private function saveMatchingResults(int $yahooProductId, array $matches) {
        try {
            $this->db->beginTransaction();
            
            // 既存マッチングを削除
            $this->db->prepare("DELETE FROM product_cross_reference WHERE yahoo_product_id = ?")
                     ->execute([$yahooProductId]);
            
            // 新しいマッチングを保存
            $insertSql = "INSERT INTO product_cross_reference 
                         (yahoo_product_id, amazon_asin, match_confidence, match_type, created_at)
                         VALUES (?, ?, ?, ?, NOW())";
            
            foreach ($matches as $match) {
                $this->db->prepare($insertSql)->execute([
                    $yahooProductId,
                    $match['asin'],
                    $match['confidence'],
                    $match['match_type']
                ]);
            }
            
            $this->db->commit();
            
            $this->logger->info('マッチング結果保存完了', [
                'yahoo_id' => $yahooProductId,
                'matches_saved' => count($matches)
            ]);
            
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logger->error('マッチング結果保存エラー: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * バッチマッチング実行
     * 
     * @param int $limit 処理件数制限
     * @return array 処理結果
     */
    public function runBatchMatching(int $limit = null) {
        $limit = $limit ?? $this->batchSize;
        
        $this->logger->info('バッチマッチング開始', ['limit' => $limit]);
        
        // 未マッチング商品取得
        $sql = "SELECT id FROM yahoo_scraped_products 
                WHERE id NOT IN (SELECT yahoo_product_id FROM product_cross_reference)
                AND title IS NOT NULL
                AND title != ''
                ORDER BY created_at DESC 
                LIMIT ?";
        
        $unmatchedProducts = $this->db->prepare($sql)->execute([$limit])->fetchAll();
        
        $results = [
            'processed' => 0,
            'matched' => 0,
            'errors' => 0,
            'start_time' => time()
        ];
        
        foreach ($unmatchedProducts as $product) {
            try {
                $matches = $this->findAmazonMatches($product['id']);
                
                $results['processed']++;
                if (!empty($matches)) {
                    $results['matched']++;
                }
                
                // API制限考慮
                sleep(2);
                
            } catch (Exception $e) {
                $results['errors']++;
                $this->logger->error('バッチマッチング個別エラー', [
                    'yahoo_id' => $product['id'],
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        $results['execution_time'] = time() - $results['start_time'];
        
        $this->logger->info('バッチマッチング完了', $results);
        
        return $results;
    }
}
?>