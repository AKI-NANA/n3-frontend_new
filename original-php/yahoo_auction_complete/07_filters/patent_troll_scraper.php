<?php
/**
 * パテントトロール事例自動スクレイピングシステム
 * USPTO、Google Patents、PatentFreedom等から特許侵害事例を収集
 */

class PatentTrollScraper {
    private $pdo;
    private $scrapingSources;
    private $userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    
    public function __construct($database) {
        $this->pdo = $database;
        $this->loadScrapingSources();
    }
    
    /**
     * スクレイピングソース設定読み込み
     */
    private function loadScrapingSources() {
        $stmt = $this->pdo->prepare("
            SELECT * FROM scraping_sources 
            WHERE source_type = 'PATENT_TROLL' AND status = 'ACTIVE'
        ");
        $stmt->execute();
        $this->scrapingSources = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * メイン実行関数
     */
    public function executeFullScraping() {
        $results = [
            'total_sources' => count($this->scrapingSources),
            'processed' => 0,
            'new_cases' => 0,
            'errors' => []
        ];
        
        foreach ($this->scrapingSources as $source) {
            try {
                echo "Processing source: {$source['source_name']}\n";
                
                $cases = $this->scrapePatentCases($source);
                $newCount = $this->saveCasesToDatabase($cases);
                
                $results['processed']++;
                $results['new_cases'] += $newCount;
                
                // 最終スクレイピング時刻更新
                $this->updateLastScraped($source['id']);
                
                echo "Found {$newCount} new cases from {$source['source_name']}\n";
                
                // レート制限対応
                sleep(2);
                
            } catch (Exception $e) {
                $error = "Error scraping {$source['source_name']}: " . $e->getMessage();
                $results['errors'][] = $error;
                error_log($error);
                
                // エラー状態更新
                $this->updateSourceStatus($source['id'], 'ERROR');
            }
        }
        
        return $results;
    }
    
    /**
     * USPTO特許侵害事例スクレイピング
     */
    private function scrapeUSPTOCases() {
        $cases = [];
        $baseUrl = 'https://www.uspto.gov/patents-application-process/patent-search-fees/ptab-proceedings';
        
        $html = $this->fetchPageContent($baseUrl);
        if (!$html) return [];
        
        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);
        
        // PTAB proceedings から特許事例を抽出
        $caseElements = $xpath->query("//div[@class='ptab-case']");
        
        foreach ($caseElements as $element) {
            $titleNode = $xpath->query(".//h3", $element)->item(0);
            $patentNode = $xpath->query(".//span[@class='patent-number']", $element)->item(0);
            $dateNode = $xpath->query(".//span[@class='case-date']", $element)->item(0);
            $summaryNode = $xpath->query(".//p[@class='summary']", $element)->item(0);
            
            if ($titleNode && $patentNode) {
                $cases[] = [
                    'case_title' => trim($titleNode->textContent),
                    'patent_number' => trim($patentNode->textContent),
                    'plaintiff' => $this->extractPlaintiff($titleNode->textContent),
                    'defendant' => $this->extractDefendant($titleNode->textContent),
                    'case_summary' => $summaryNode ? trim($summaryNode->textContent) : '',
                    'case_date' => $dateNode ? $this->parseDate($dateNode->textContent) : null,
                    'source_url' => $baseUrl,
                    'risk_level' => $this->assessRiskLevel($titleNode->textContent),
                    'keywords' => $this->extractKeywords($titleNode->textContent . ' ' . ($summaryNode ? $summaryNode->textContent : ''))
                ];
            }
        }
        
        return $cases;
    }
    
    /**
     * Google Patents から特許情報スクレイピング
     */
    private function scrapeGooglePatents() {
        $cases = [];
        $searchTerms = ['patent troll', 'NPE litigation', 'patent assertion entity'];
        
        foreach ($searchTerms as $term) {
            $url = 'https://patents.google.com/?q=' . urlencode($term) . '&assignee_type=non-practicing-entity';
            
            $html = $this->fetchPageContent($url);
            if (!$html) continue;
            
            $dom = new DOMDocument();
            @$dom->loadHTML($html);
            $xpath = new DOMXPath($dom);
            
            $patentElements = $xpath->query("//article[@class='result']");
            
            foreach ($patentElements as $element) {
                $titleNode = $xpath->query(".//h3/a", $element)->item(0);
                $assigneeNode = $xpath->query(".//dd[contains(@class,'assignee')]", $element)->item(0);
                $dateNode = $xpath->query(".//time", $element)->item(0);
                
                if ($titleNode && $this->isPatentTroll($assigneeNode ? $assigneeNode->textContent : '')) {
                    $cases[] = [
                        'case_title' => trim($titleNode->textContent),
                        'patent_number' => $this->extractPatentNumber($titleNode->getAttribute('href')),
                        'plaintiff' => $assigneeNode ? trim($assigneeNode->textContent) : '',
                        'defendant' => '', // Google Patentsでは被告情報は取得困難
                        'case_summary' => $this->generateSummaryFromGooglePatent($element, $xpath),
                        'case_date' => $dateNode ? $this->parseDate($dateNode->getAttribute('datetime')) : null,
                        'source_url' => 'https://patents.google.com' . $titleNode->getAttribute('href'),
                        'risk_level' => 'MEDIUM',
                        'keywords' => $this->extractKeywords($titleNode->textContent)
                    ];
                }
            }
            
            sleep(1); // レート制限対応
        }
        
        return $cases;
    }
    
    /**
     * PatentFreedom データベーススクレイピング
     */
    private function scrapePatentFreedom() {
        // PatentFreedomはAPIアクセスが必要な場合が多いため、
        // 公開データのみスクレイピング
        $cases = [];
        $url = 'https://www.patentfreedom.com/about-npes/';
        
        $html = $this->fetchPageContent($url);
        if (!$html) return [];
        
        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);
        
        // NPE（Non-Practicing Entity）リストを取得
        $npeElements = $xpath->query("//table[@class='npe-list']//tr");
        
        foreach ($npeElements as $row) {
            $cells = $xpath->query(".//td", $row);
            if ($cells->length >= 3) {
                $npe_name = trim($cells->item(0)->textContent);
                $case_count = trim($cells->item(1)->textContent);
                $last_activity = trim($cells->item(2)->textContent);
                
                // NPE情報を事例として保存
                $cases[] = [
                    'case_title' => "NPE Activity Report: $npe_name",
                    'patent_number' => '',
                    'plaintiff' => $npe_name,
                    'defendant' => 'Multiple defendants',
                    'case_summary' => "Known NPE with $case_count documented cases",
                    'case_date' => $this->parseDate($last_activity),
                    'source_url' => $url,
                    'risk_level' => $this->assessNPERisk($case_count),
                    'keywords' => $this->generateNPEKeywords($npe_name)
                ];
            }
        }
        
        return $cases;
    }
    
    /**
     * 汎用スクレイピング実行
     */
    private function scrapePatentCases($source) {
        switch ($source['source_name']) {
            case 'USPTO Patent Cases':
                return $this->scrapeUSPTOCases();
            case 'Google Patents NPE':
                return $this->scrapeGooglePatents();
            case 'PatentFreedom Database':
                return $this->scrapePatentFreedom();
            default:
                return $this->genericScraping($source);
        }
    }
    
    /**
     * 汎用スクレイピング（設定ベース）
     */
    private function genericScraping($source) {
        $html = $this->fetchPageContent($source['base_url']);
        if (!$html) return [];
        
        $config = json_decode($source['scraping_config'], true);
        $dom = new DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new DOMXPath($dom);
        
        $cases = [];
        $elements = $xpath->query($config['selector'] ?? "//div[@class='case']");
        
        foreach ($elements as $element) {
            $case = [];
            foreach ($config['fields'] as $field => $selector) {
                $node = $xpath->query($selector, $element)->item(0);
                $case[$field] = $node ? trim($node->textContent) : '';
            }
            
            if (!empty($case['title']) || !empty($case['patent_number'])) {
                $cases[] = [
                    'case_title' => $case['title'] ?? '',
                    'patent_number' => $case['patent_number'] ?? '',
                    'plaintiff' => $case['plaintiff'] ?? '',
                    'defendant' => $case['defendant'] ?? '',
                    'case_summary' => $case['summary'] ?? '',
                    'case_date' => isset($case['date']) ? $this->parseDate($case['date']) : null,
                    'source_url' => $source['base_url'],
                    'risk_level' => 'MEDIUM',
                    'keywords' => $this->extractKeywords(implode(' ', $case))
                ];
            }
        }
        
        return $cases;
    }
    
    /**
     * Webページ内容取得
     */
    private function fetchPageContent($url, $timeout = 30) {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    "User-Agent: {$this->userAgent}",
                    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language: en-US,en;q=0.5",
                    "Accept-Encoding: gzip, deflate",
                    "Connection: keep-alive"
                ],
                'timeout' => $timeout
            ]
        ]);
        
        try {
            $content = file_get_contents($url, false, $context);
            return $content !== false ? $content : null;
        } catch (Exception $e) {
            error_log("Failed to fetch content from $url: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * 事例をデータベースに保存
     */
    private function saveCasesToDatabase($cases) {
        $newCount = 0;
        
        foreach ($cases as $case) {
            // 重複チェック
            $stmt = $this->pdo->prepare("
                SELECT id FROM patent_troll_cases 
                WHERE case_title = ? OR patent_number = ?
            ");
            $stmt->execute([$case['case_title'], $case['patent_number']]);
            
            if ($stmt->rowCount() === 0) {
                // 新規事例として保存
                $stmt = $this->pdo->prepare("
                    INSERT INTO patent_troll_cases (
                        case_title, patent_number, plaintiff, defendant, case_summary,
                        keywords, risk_level, case_date, source_url, scraping_date, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), TRUE)
                ");
                
                $result = $stmt->execute([
                    $case['case_title'],
                    $case['patent_number'],
                    $case['plaintiff'],
                    $case['defendant'],
                    $case['case_summary'],
                    $case['keywords'],
                    $case['risk_level'],
                    $case['case_date'],
                    $case['source_url']
                ]);
                
                if ($result) {
                    $newCount++;
                    
                    // 関連するフィルターキーワードも自動生成
                    $this->generateFilterKeywords($case);
                }
            }
        }
        
        return $newCount;
    }
    
    /**
     * フィルターキーワード自動生成
     */
    private function generateFilterKeywords($case) {
        $keywords = explode(',', $case['keywords']);
        
        foreach ($keywords as $keyword) {
            $keyword = trim($keyword);
            if (strlen($keyword) > 2) {
                // 既存チェック
                $stmt = $this->pdo->prepare("
                    SELECT id FROM filter_keywords 
                    WHERE keyword = ? AND type = 'PATENT_TROLL'
                ");
                $stmt->execute([$keyword]);
                
                if ($stmt->rowCount() === 0) {
                    // 新規キーワード追加
                    $stmt = $this->pdo->prepare("
                        INSERT INTO filter_keywords (
                            keyword, type, priority, mall_name, detection_count, is_active, created_at
                        ) VALUES (?, 'PATENT_TROLL', ?, NULL, 0, TRUE, NOW())
                    ");
                    
                    $priority = $this->determinePriority($case['risk_level']);
                    $stmt->execute([$keyword, $priority]);
                }
            }
        }
    }
    
    // ヘルパー関数群
    private function extractPlaintiff($title) {
        // タイトルから原告を抽出（簡易版）
        if (preg_match('/^([^v\s]+(?:\s+[^v\s]+)*)\s+v\.?\s+/', $title, $matches)) {
            return trim($matches[1]);
        }
        return '';
    }
    
    private function extractDefendant($title) {
        // タイトルから被告を抽出（簡易版）
        if (preg_match('/\s+v\.?\s+([^,]+)/', $title, $matches)) {
            return trim($matches[1]);
        }
        return '';
    }
    
    private function extractPatentNumber($url) {
        if (preg_match('/patent\/([A-Z0-9]+)/', $url, $matches)) {
            return $matches[1];
        }
        return '';
    }
    
    private function parseDate($dateString) {
        try {
            $date = new DateTime($dateString);
            return $date->format('Y-m-d');
        } catch (Exception $e) {
            return null;
        }
    }
    
    private function extractKeywords($text) {
        // 重要キーワード抽出（簡易版）
        $stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        $words = preg_split('/\W+/', strtolower($text));
        $keywords = array_filter($words, function($word) use ($stopWords) {
            return strlen($word) > 3 && !in_array($word, $stopWords);
        });
        
        return implode(',', array_unique(array_slice($keywords, 0, 10)));
    }
    
    private function assessRiskLevel($title) {
        $highRiskTerms = ['injunction', 'damages', 'willful infringement', 'enhanced damages'];
        $lowRiskTerms = ['settlement', 'license', 'agreement'];
        
        $titleLower = strtolower($title);
        
        foreach ($highRiskTerms as $term) {
            if (strpos($titleLower, $term) !== false) return 'HIGH';
        }
        
        foreach ($lowRiskTerms as $term) {
            if (strpos($titleLower, $term) !== false) return 'LOW';
        }
        
        return 'MEDIUM';
    }
    
    private function isPatentTroll($assigneeName) {
        $trollKeywords = ['LLC', 'Holdings', 'Licensing', 'IP', 'Technologies', 'Solutions', 'Innovations'];
        $assigneeLower = strtolower($assigneeName);
        
        foreach ($trollKeywords as $keyword) {
            if (strpos($assigneeLower, strtolower($keyword)) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    private function assessNPERisk($caseCount) {
        $count = intval($caseCount);
        if ($count > 50) return 'HIGH';
        if ($count > 10) return 'MEDIUM';
        return 'LOW';
    }
    
    private function generateNPEKeywords($npeName) {
        return str_replace([' ', ',', '.'], ['', ',', ''], strtolower($npeName));
    }
    
    private function determinePriority($riskLevel) {
        switch ($riskLevel) {
            case 'HIGH': return 'HIGH';
            case 'LOW': return 'LOW';
            default: return 'MEDIUM';
        }
    }
    
    private function updateLastScraped($sourceId) {
        $stmt = $this->pdo->prepare("
            UPDATE scraping_sources 
            SET last_scraped = NOW(), next_scheduled = DATE_ADD(NOW(), INTERVAL 1 DAY)
            WHERE id = ?
        ");
        $stmt->execute([$sourceId]);
    }
    
    private function updateSourceStatus($sourceId, $status) {
        $stmt = $this->pdo->prepare("UPDATE scraping_sources SET status = ? WHERE id = ?");
        $stmt->execute([$status, $sourceId]);
    }
    
    private function generateSummaryFromGooglePatent($element, $xpath) {
        $abstractNode = $xpath->query(".//dd[contains(@class,'abstract')]", $element)->item(0);
        return $abstractNode ? substr(trim($abstractNode->textContent), 0, 500) : '';
    }
}

// 使用例とcron設定
if (basename(__FILE__) == basename($_SERVER['PHP_SELF'])) {
    require_once '../shared/core/database.php';
    
    try {
        $scraper = new PatentTrollScraper($pdo);
        
        echo "Starting patent troll scraping process...\n";
        $results = $scraper->executeFullScraping();
        
        echo "Scraping completed!\n";
        echo "Total sources processed: {$results['processed']}\n";
        echo "New cases discovered: {$results['new_cases']}\n";
        
        if (!empty($results['errors'])) {
            echo "Errors encountered:\n";
            foreach ($results['errors'] as $error) {
                echo "- $error\n";
            }
        }
        
    } catch (Exception $e) {
        echo "Fatal error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

/**
 * Cron設定例（毎日午前2時実行）:
 * 0 2 * * * /usr/bin/php /path/to/patent_troll_scraper.php >> /var/log/patent_scraping.log 2>&1
 */