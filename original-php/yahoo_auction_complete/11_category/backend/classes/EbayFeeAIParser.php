<?php
/**
 * eBay手数料AI判定・自動格納システム
 * ファイル: EbayFeeAIParser.php
 * 手数料データからAIがカテゴリー別手数料を判定・格納
 */

class EbayFeeAIParser {
    private $openaiApiKey;
    private $pdo;
    
    public function __construct($dbConnection, $openaiApiKey = null) {
        $this->pdo = $dbConnection;
        $this->openaiApiKey = $openaiApiKey;
    }
    
    /**
     * メイン処理: 手数料データを解析してカテゴリー別に格納
     */
    public function parseAndStoreFeeData($rawFeeData) {
        try {
            // 1. 生データの前処理
            $cleanData = $this->preprocessFeeData($rawFeeData);
            
            // 2. AIによる解析・判定
            $parsedFees = $this->aiParseFeeData($cleanData);
            
            // 3. データベースに格納
            $result = $this->storeParsedFees($parsedFees);
            
            return [
                'success' => true,
                'parsed_categories' => count($parsedFees),
                'stored_records' => $result['stored_count'],
                'processing_log' => $result['log']
            ];
            
        } catch (Exception $e) {
            error_log("Fee parsing error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 生データの前処理・クリーニング
     */
    private function preprocessFeeData($rawData) {
        // HTML タグ除去
        $cleaned = strip_tags($rawData);
        
        // 不要な空白・改行を正規化
        $cleaned = preg_replace('/\s+/', ' ', $cleaned);
        
        // 手数料関連のパターンを抽出
        $patterns = [
            // パーセンテージパターン: "13.25%", "12.9%"
            '/(\d+\.?\d*)\s*%/',
            // カテゴリー名パターン
            '/(?:category|categories?):\s*([A-Za-z\s&,-]+)/i',
            // 価格パターン: "$750", "$1,000"
            '/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/',
        ];
        
        $extractedData = [];
        foreach ($patterns as $pattern) {
            preg_match_all($pattern, $cleaned, $matches);
            $extractedData[] = $matches;
        }
        
        return [
            'original' => $rawData,
            'cleaned' => $cleaned,
            'extracted_patterns' => $extractedData
        ];
    }
    
    /**
     * OpenAI GPTを使用した手数料データ解析
     */
    private function aiParseFeeData($cleanData) {
        if (!$this->openaiApiKey) {
            // OpenAI未設定時のフォールバック: ルールベース解析
            return $this->ruleBasedParsing($cleanData);
        }
        
        $prompt = $this->buildAnalysisPrompt($cleanData['cleaned']);
        
        $response = $this->callOpenAI($prompt);
        
        return $this->parseAIResponse($response);
    }
    
    /**
     * AI解析用プロンプト構築
     */
    private function buildAnalysisPrompt($feeData) {
        return "
あなたはeBay手数料解析の専門家です。以下の手数料データを解析し、カテゴリー別の手数料を特定してください。

=== 解析対象データ ===
{$feeData}

=== 出力形式（JSON） ===
{
  \"categories\": [
    {
      \"category_name\": \"カテゴリー名\",
      \"category_id\": \"予想されるeBayカテゴリーID（不明な場合は null）\",
      \"final_value_fee_percent\": 数値,
      \"final_value_fee_max\": 数値または null,
      \"confidence_score\": 0-100の信頼度,
      \"source_text\": \"判定根拠となったテキスト部分\"
    }
  ],
  \"default_fee\": {
    \"final_value_fee_percent\": 数値,
    \"applies_to\": \"適用対象の説明\"
  }
}

=== 解析指示 ===
1. カテゴリー名から以下の主要カテゴリーを特定してください:
   - Cell Phones & Smartphones (ID: 293)
   - Cameras & Photo (ID: 625)
   - Clothing, Shoes & Accessories (ID: 11450)
   - Books, Movies & Music (ID: 267)
   - Musical Instruments (ID: 10542)
   - Business & Industrial (ID: 12576)

2. 手数料パーセンテージを正確に抽出してください
3. 最大手数料キャップがある場合は特定してください
4. 信頼度スコアは解析の確実性を示してください

出力はJSONのみで、説明文は不要です。
";
    }
    
    /**
     * OpenAI API呼び出し
     */
    private function callOpenAI($prompt) {
        if (!$this->openaiApiKey) {
            throw new Exception("OpenAI API key not configured");
        }
        
        $data = [
            'model' => 'gpt-4-turbo',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are an expert eBay fee analyst. Respond only in valid JSON format.'
                ],
                [
                    'role' => 'user', 
                    'content' => $prompt
                ]
            ],
            'temperature' => 0.1, // 低い温度で一貫性を保つ
            'max_tokens' => 2000
        ];
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => 'https://api.openai.com/v1/chat/completions',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->openaiApiKey,
                'Content-Type: application/json'
            ],
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_TIMEOUT => 30
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception("OpenAI API error: HTTP {$httpCode}");
        }
        
        $decoded = json_decode($response, true);
        
        if (!isset($decoded['choices'][0]['message']['content'])) {
            throw new Exception("Invalid OpenAI response format");
        }
        
        return $decoded['choices'][0]['message']['content'];
    }
    
    /**
     * AI応答の解析
     */
    private function parseAIResponse($aiResponse) {
        $decoded = json_decode($aiResponse, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON response from AI: " . json_last_error_msg());
        }
        
        // 応答の妥当性確認
        if (!isset($decoded['categories']) || !is_array($decoded['categories'])) {
            throw new Exception("Invalid AI response structure");
        }
        
        // 信頼度フィルタリング（60%未満は除外）
        $filteredCategories = array_filter($decoded['categories'], function($category) {
            return ($category['confidence_score'] ?? 0) >= 60;
        });
        
        return [
            'categories' => $filteredCategories,
            'default_fee' => $decoded['default_fee'] ?? null,
            'raw_ai_response' => $aiResponse
        ];
    }
    
    /**
     * ルールベース解析（OpenAI未使用時のフォールバック）
     */
    private function ruleBasedParsing($cleanData) {
        $categories = [];
        $text = $cleanData['cleaned'];
        
        // 既知のカテゴリーパターンマッチング
        $categoryPatterns = [
            'Cell Phones|Smartphones|iPhone|Android' => ['id' => '293', 'name' => 'Cell Phones & Smartphones'],
            'Cameras?|Photo|Canon|Nikon|Sony' => ['id' => '625', 'name' => 'Cameras & Photo'],
            'Clothing|Shoes|Fashion|Apparel' => ['id' => '11450', 'name' => 'Clothing, Shoes & Accessories'],
            'Books?|Movies?|Music|DVD|CD' => ['id' => '267', 'name' => 'Books, Movies & Music'],
            'Musical Instruments?|Guitar|Piano' => ['id' => '10542', 'name' => 'Musical Instruments'],
            'Business|Industrial|Equipment' => ['id' => '12576', 'name' => 'Business & Industrial']
        ];
        
        foreach ($categoryPatterns as $pattern => $categoryInfo) {
            if (preg_match("/{$pattern}/i", $text)) {
                // 該当カテゴリー近辺の手数料パーセンテージを探索
                if (preg_match("/(?:{$pattern}).*?(\d+\.?\d*)\s*%/i", $text, $matches)) {
                    $categories[] = [
                        'category_name' => $categoryInfo['name'],
                        'category_id' => $categoryInfo['id'],
                        'final_value_fee_percent' => floatval($matches[1]),
                        'confidence_score' => 75, // ルールベース判定の信頼度
                        'source_text' => $matches[0]
                    ];
                }
            }
        }
        
        return [
            'categories' => $categories,
            'method' => 'rule_based'
        ];
    }
    
    /**
     * 解析結果をデータベースに格納
     */
    private function storeParsedFees($parsedFees) {
        $storedCount = 0;
        $log = [];
        
        // 既存の手数料データを無効化
        $this->pdo->exec("UPDATE ebay_category_fees SET is_active = FALSE, updated_at = NOW()");
        
        foreach ($parsedFees['categories'] as $category) {
            try {
                // 新しい手数料データを挿入
                $stmt = $this->pdo->prepare("
                    INSERT INTO ebay_category_fees (
                        category_id, category_name, final_value_fee_percent, 
                        final_value_fee_max, confidence_score, source_text,
                        data_source, is_active, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 'ai_parsed', TRUE, NOW(), NOW())
                ");
                
                $stmt->execute([
                    $category['category_id'],
                    $category['category_name'],
                    $category['final_value_fee_percent'],
                    $category['final_value_fee_max'] ?? null,
                    $category['confidence_score'] ?? 0,
                    $category['source_text'] ?? ''
                ]);
                
                $storedCount++;
                $log[] = "Stored: {$category['category_name']} - {$category['final_value_fee_percent']}%";
                
            } catch (Exception $e) {
                $log[] = "Error storing {$category['category_name']}: " . $e->getMessage();
            }
        }
        
        // デフォルト手数料も格納
        if (isset($parsedFees['default_fee'])) {
            try {
                $stmt = $this->pdo->prepare("
                    INSERT INTO ebay_category_fees (
                        category_id, category_name, final_value_fee_percent,
                        data_source, is_active, created_at, updated_at
                    ) VALUES ('DEFAULT', 'Default Category', ?, 'ai_parsed', TRUE, NOW(), NOW())
                ");
                
                $stmt->execute([$parsedFees['default_fee']['final_value_fee_percent']]);
                $storedCount++;
                $log[] = "Stored default fee: {$parsedFees['default_fee']['final_value_fee_percent']}%";
                
            } catch (Exception $e) {
                $log[] = "Error storing default fee: " . $e->getMessage();
            }
        }
        
        return [
            'stored_count' => $storedCount,
            'log' => $log
        ];
    }
    
    /**
     * 手数料データソースからの自動取得・解析
     */
    public function fetchAndParseFeeData($sourceUrl = null) {
        $sourceUrl = $sourceUrl ?? 'https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees';
        
        // eBay公式ページから手数料情報を取得
        $context = stream_context_create([
            'http' => [
                'timeout' => 15,
                'user_agent' => 'Mozilla/5.0 (compatible; eBayFeeParser/1.0)'
            ]
        ]);
        
        $rawData = file_get_contents($sourceUrl, false, $context);
        
        if ($rawData === false) {
            throw new Exception("Failed to fetch fee data from {$sourceUrl}");
        }
        
        return $this->parseAndStoreFeeData($rawData);
    }
}

/**
 * 使用例・テストスクリプト
 */
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    // データベース接続
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // OpenAI API Key（環境変数から取得）
    $openaiKey = getenv('OPENAI_API_KEY');
    
    $parser = new EbayFeeAIParser($pdo, $openaiKey);
    
    echo "=== eBay手数料AI解析テスト ===\n";
    
    // サンプル手数料データ
    $sampleFeeData = "
    eBay Selling Fees 2024
    
    Final value fees:
    - Cell Phones & Smartphones: 12.90%
    - Cameras & Photo: 12.35% 
    - Clothing, Shoes & Accessories: 13.25%
    - Books, Movies & Music: 15.30%
    - Musical Instruments & Gear: 6.35%
    - Business & Industrial: 3.00%
    - Most other categories: 13.25%
    
    Maximum final value fee: $750 for most categories
    Per order fee: $0.40 for orders over $10.00
    ";
    
    $result = $parser->parseAndStoreFeeData($sampleFeeData);
    
    if ($result['success']) {
        echo "✅ 解析成功\n";
        echo "解析カテゴリー数: {$result['parsed_categories']}\n";
        echo "格納レコード数: {$result['stored_records']}\n";
        
        foreach ($result['processing_log'] as $logEntry) {
            echo "- {$logEntry}\n";
        }
    } else {
        echo "❌ 解析失敗: {$result['error']}\n";
    }
    
    // 実際のeBayページから取得テスト
    if ($openaiKey) {
        echo "\n=== 実データ取得・解析テスト ===\n";
        try {
            $liveResult = $parser->fetchAndParseFeeData();
            echo "ライブデータ解析結果: " . json_encode($liveResult, JSON_PRETTY_PRINT) . "\n";
        } catch (Exception $e) {
            echo "ライブデータ取得エラー: " . $e->getMessage() . "\n";
        }
    }
}
?>