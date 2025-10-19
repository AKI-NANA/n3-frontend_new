<?php
/**
 * eBay手数料テキストマッチャー - コンパクト版
 */

class EbayFeeTextMatcher {
    private $pdo;
    private $feeRules = [];
    private $categoryData = [];
    
    public function __construct($pdo) { $this->pdo = $pdo; }
    
    public function parseAndMatch($feeText, $csvPath) {
        $this->loadCSV($csvPath);
        $this->parseRules($feeText);
        $matches = $this->match();
        $this->store($matches);
        
        return [
            'success' => true,
            'total_categories' => count($this->categoryData),
            'matched' => count($matches)
        ];
    }
    
    private function loadCSV($csvPath) {
        $handle = fopen($csvPath, 'r');
        fgetcsv($handle); // skip header
        
        while (($data = fgetcsv($handle)) !== FALSE) {
            $this->categoryData[] = [
                'id' => $data[0],
                'path' => $data[1],
                'fvf' => $data[2]
            ];
        }
        fclose($handle);
    }
    
    private function parseRules($text) {
        preg_match_all('/\*\*([^*]+)\*\*.*?(\d+\.?\d*)\s*%/s', $text, $matches, PREG_SET_ORDER);
        
        foreach ($matches as $match) {
            $this->feeRules[] = [
                'keyword' => strtolower($match[1]),
                'fee' => floatval($match[2])
            ];
        }
    }
    
    private function match() {
        $results = [];
        
        foreach ($this->categoryData as $category) {
            $bestScore = 0;
            $bestRule = null;
            
            foreach ($this->feeRules as $rule) {
                $score = $this->scoreMatch(strtolower($category['path']), $rule['keyword']);
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestRule = $rule;
                }
            }
            
            if ($bestScore > 30) {
                $results[] = [
                    'category_id' => $category['id'],
                    'category_path' => $category['path'],
                    'fee' => $bestRule['fee'],
                    'confidence' => $bestScore
                ];
            }
        }
        
        return $results;
    }
    
    private function scoreMatch($categoryPath, $keyword) {
        if (strpos($categoryPath, $keyword) !== false) return 90;
        
        $keywords = explode(' ', $keyword);
        $score = 0;
        foreach ($keywords as $k) {
            if (strpos($categoryPath, $k) !== false) $score += 30;
        }
        
        return $score;
    }
    
    private function store($matches) {
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS fee_matches (
            id SERIAL PRIMARY KEY,
            category_id VARCHAR(50),
            category_path TEXT,
            fee_percent DECIMAL(5,2),
            confidence INTEGER
        )");
        
        $this->pdo->exec("DELETE FROM fee_matches");
        
        $stmt = $this->pdo->prepare("INSERT INTO fee_matches VALUES (DEFAULT,?,?,?,?)");
        foreach ($matches as $m) {
            $stmt->execute([$m['category_id'], $m['category_path'], $m['fee'], $m['confidence']]);
        }
    }
}

// テスト実行
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    
    $feeText = '**Most categories** 13.6% **Books & Magazines** 15.3% **Clothing, Shoes & Accessories** 13.6%';
    
    $matcher = new EbayFeeTextMatcher($pdo);
    $result = $matcher->parseAndMatch($feeText, '2024_利益計算表 最新  Category.csv');
    
    echo json_encode($result, JSON_PRETTY_PRINT);
}
?>