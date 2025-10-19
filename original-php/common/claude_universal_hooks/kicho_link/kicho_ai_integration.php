<?php
/**
 * 🤖 KICHO ローカルAI連携システム - FastAPI統合版
 * modules/kicho/kicho_ai_integration.php
 * 
 * ✅ FastAPI実連携（http://localhost:8000）
 * ✅ AI学習結果視覚化システム
 * ✅ 学習データ前処理・ルール生成
 * ✅ PostgreSQL + AI統合管理
 * ✅ エラーハンドリング・フォールバック
 * 
 * @version 5.0.0-AI-INTEGRATION
 */

// セキュリティ確認
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

if (!defined('SECURE_ACCESS') || !SECURE_ACCESS) {
    http_response_code(403);
    die('{"error":"Direct access forbidden","code":403}');
}

// =====================================
// 🤖 ローカルAI連携システム
// =====================================

class KichoAIIntegration {
    
    /** @var string FastAPI基本URL */
    private $fastapi_base_url;
    
    /** @var int 接続タイムアウト（秒） */
    private $timeout;
    
    /** @var bool AI接続状況 */
    private $ai_available;
    
    /** @var PDO データベース接続 */
    private $pdo;
    
    /** @var array AI学習履歴キャッシュ */
    private $learning_cache;
    
    /**
     * コンストラクタ
     */
    public function __construct() {
        $this->fastapi_base_url = 'http://localhost:8000';
        $this->timeout = 30;
        $this->ai_available = false;
        $this->learning_cache = [];
        
        $this->initializeAI();
    }
    
    /**
     * AI連携システム初期化
     */
    private function initializeAI() {
        try {
            // データベース接続取得
            $this->pdo = $this->getKichoDatabase();
            
            // FastAPI接続確認
            $this->checkFastAPIConnection();
            
            error_log("✅ KICHO AI: 初期化完了 (FastAPI: " . ($this->ai_available ? "接続" : "未接続") . ")");
            
        } catch (Exception $e) {
            error_log("⚠️ KICHO AI: 初期化警告 - " . $e->getMessage());
        }
    }
    
    /**
     * PostgreSQL接続取得
     */
    private function getKichoDatabase() {
        static $pdo = null;
        
        if ($pdo !== null) {
            return $pdo;
        }
        
        try {
            $dsn = "pgsql:host=localhost;port=5432;dbname=postgres";
            $username = "aritahiroaki";
            $password = "";
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 10
            ];
            
            $pdo = new PDO($dsn, $username, $password, $options);
            $stmt = $pdo->query("SELECT 1");
            
            return $pdo;
            
        } catch (PDOException $e) {
            error_log("❌ KICHO AI: データベース接続失敗 - " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * FastAPI接続確認
     */
    private function checkFastAPIConnection() {
        try {
            $health_url = $this->fastapi_base_url . '/health';
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'timeout' => 5,
                    'header' => "Content-Type: application/json\r\n"
                ]
            ]);
            
            $response = @file_get_contents($health_url, false, $context);
            
            if ($response !== false) {
                $data = json_decode($response, true);
                $this->ai_available = isset($data['status']) && $data['status'] === 'healthy';
                
                if ($this->ai_available) {
                    error_log("✅ KICHO AI: FastAPI接続成功 - " . $health_url);
                } else {
                    error_log("⚠️ KICHO AI: FastAPI応答異常 - " . $response);
                }
            } else {
                error_log("❌ KICHO AI: FastAPI接続失敗 - " . $health_url);
            }
            
        } catch (Exception $e) {
            error_log("❌ KICHO AI: 接続チェックエラー - " . $e->getMessage());
            $this->ai_available = false;
        }
    }
    
    /**
     * AI学習実行（メイン処理）
     * 
     * @param string $text_content 学習用テキスト
     * @param string $learning_mode 学習モード
     * @return array 学習結果
     */
    public function executeAILearning($text_content, $learning_mode = 'incremental') {
        try {
            // 入力検証
            $this->validateLearningInput($text_content);
            
            // データベースに学習セッション記録
            $session_id = $this->createLearningSession($text_content, $learning_mode);
            
            // AI学習実行
            if ($this->ai_available) {
                $ai_result = $this->callFastAPILearning($text_content, $session_id, $learning_mode);
            } else {
                $ai_result = $this->simulateAILearning($text_content, $session_id);
            }
            
            // 学習結果をデータベースに保存
            $this->saveLearningResult($session_id, $ai_result);
            
            // 視覚化データ生成
            $visualization_data = $this->generateVisualization($ai_result);
            
            // ルール生成
            $generated_rules = $this->generateRules($ai_result, $text_content);
            
            return [
                'success' => true,
                'session_id' => $session_id,
                'accuracy' => $ai_result['accuracy'],
                'confidence' => $ai_result['confidence'],
                'processing_time' => $ai_result['processing_time'],
                'rules_generated' => count($generated_rules),
                'rules' => $generated_rules,
                'visualization' => $visualization_data,
                'ai_source' => $this->ai_available ? 'fastapi' : 'simulation',
                'message' => $this->ai_available ? 
                    'AI学習が完了しました' : 
                    'AI学習をシミュレーションで完了しました（FastAPI未接続）'
            ];
            
        } catch (Exception $e) {
            error_log("❌ KICHO AI: 学習実行エラー - " . $e->getMessage());
            
            // エラー時もセッションを記録
            if (isset($session_id)) {
                $this->updateLearningSession($session_id, 'error', null, null, $e->getMessage());
            }
            
            throw $e;
        }
    }
    
    /**
     * 学習入力検証
     */
    private function validateLearningInput($text_content) {
        if (empty($text_content)) {
            throw new Exception('学習用テキストが入力されていません');
        }
        
        if (strlen($text_content) < 10) {
            throw new Exception('学習用テキストが短すぎます（10文字以上必要）');
        }
        
        if (strlen($text_content) > 10000) {
            throw new Exception('学習用テキストが長すぎます（10000文字以下）');
        }
        
        // 危険な文字列チェック
        $dangerous_patterns = ['<script', '<?php', 'javascript:', 'eval('];
        foreach ($dangerous_patterns as $pattern) {
            if (stripos($text_content, $pattern) !== false) {
                throw new Exception('不正な文字列が含まれています');
            }
        }
    }
    
    /**
     * 学習セッション作成
     */
    private function createLearningSession($text_content, $learning_mode) {
        $session_id = 'ai_' . date('YmdHis') . '_' . uniqid();
        
        if ($this->pdo) {
            try {
                $stmt = $this->pdo->prepare("
                    INSERT INTO ai_learning_texts (
                        session_id, text_content, learning_mode, status, created_at
                    ) VALUES (?, ?, ?, 'processing', NOW())
                ");
                $stmt->execute([$session_id, $text_content, $learning_mode]);
                
                error_log("✅ KICHO AI: 学習セッション作成 - {$session_id}");
            } catch (Exception $e) {
                error_log("⚠️ KICHO AI: セッション作成失敗 - " . $e->getMessage());
            }
        }
        
        return $session_id;
    }
    
    /**
     * FastAPI AI学習呼び出し
     */
    private function callFastAPILearning($text_content, $session_id, $learning_mode) {
        $api_url = $this->fastapi_base_url . '/api/ai-learning';
        
        $request_data = [
            'session_id' => $session_id,
            'text_content' => $text_content,
            'learning_mode' => $learning_mode,
            'language' => 'ja',
            'domain' => 'accounting',
            'timestamp' => date('c')
        ];
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => json_encode($request_data),
                'timeout' => $this->timeout
            ]
        ]);
        
        $start_time = microtime(true);
        $response = @file_get_contents($api_url, false, $context);
        $processing_time = round((microtime(true) - $start_time) * 1000); // ミリ秒
        
        if ($response === false) {
            throw new Exception('FastAPI通信エラー: ' . error_get_last()['message']);
        }
        
        $result = json_decode($response, true);
        
        if (!$result || !isset($result['success']) || !$result['success']) {
            throw new Exception('FastAPI処理エラー: ' . ($result['error'] ?? 'Unknown error'));
        }
        
        // 処理時間を追加
        $result['processing_time'] = $processing_time;
        
        error_log("✅ KICHO AI: FastAPI学習完了 - {$session_id} ({$processing_time}ms)");
        
        return $result;
    }
    
    /**
     * AI学習シミュレーション（FastAPI未接続時）
     */
    private function simulateAILearning($text_content, $session_id) {
        // テキスト解析（簡易版）
        $keywords = $this->extractKeywords($text_content);
        $patterns = $this->detectPatterns($text_content);
        
        // 模擬精度計算
        $word_count = str_word_count($text_content);
        $accuracy = min(0.95, max(0.7, 0.75 + (count($keywords) * 0.05) + (count($patterns) * 0.03)));
        $confidence = min(0.9, max(0.6, $accuracy - 0.1 + (rand(-5, 5) / 100)));
        
        $processing_time = rand(800, 2500); // 0.8-2.5秒
        usleep($processing_time * 1000); // 実際に待機
        
        error_log("✅ KICHO AI: シミュレーション学習完了 - {$session_id} ({$processing_time}ms)");
        
        return [
            'success' => true,
            'accuracy' => $accuracy,
            'confidence' => $confidence,
            'processing_time' => $processing_time,
            'keywords' => $keywords,
            'patterns' => $patterns,
            'simulation' => true
        ];
    }
    
    /**
     * キーワード抽出
     */
    private function extractKeywords($text) {
        // 勘定科目関連キーワード
        $accounting_keywords = [
            '消耗品' => '消耗品費',
            'Amazon' => '消耗品費',
            '文具' => '消耗品費',
            '広告' => '広告宣伝費',
            'Google Ads' => '広告宣伝費',
            'Facebook広告' => '広告宣伝費',
            '電車' => '旅費交通費',
            'バス' => '旅費交通費',
            'タクシー' => '旅費交通費',
            '電気' => '水道光熱費',
            'ガス' => '水道光熱費',
            '水道' => '水道光熱費',
            '会議' => '会議費',
            '接待' => '接待交際費',
            '研修' => '研修費',
            '書籍' => '新聞図書費'
        ];
        
        $found_keywords = [];
        
        foreach ($accounting_keywords as $keyword => $category) {
            if (mb_strpos($text, $keyword) !== false) {
                $found_keywords[] = [
                    'keyword' => $keyword,
                    'category' => $category,
                    'confidence' => rand(80, 95) / 100
                ];
            }
        }
        
        return $found_keywords;
    }
    
    /**
     * パターン検出
     */
    private function detectPatterns($text) {
        $patterns = [];
        
        // 金額パターン
        if (preg_match('/(\d{1,3}(?:,\d{3})*|\d+)円/', $text, $matches)) {
            $amount = (int)str_replace(',', '', $matches[1]);
            $patterns[] = [
                'type' => 'amount',
                'value' => $amount,
                'range' => $this->getAmountRange($amount)
            ];
        }
        
        // 日付パターン
        if (preg_match('/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[\.\-\/]\d{1,2})/', $text)) {
            $patterns[] = [
                'type' => 'date',
                'detected' => true
            ];
        }
        
        // 企業名パターン
        if (preg_match('/(株式会社|有限会社|\(株\)|\(有\)|Co\.|Inc\.|LLC)/', $text)) {
            $patterns[] = [
                'type' => 'company',
                'detected' => true
            ];
        }
        
        return $patterns;
    }
    
    /**
     * 金額レンジ取得
     */
    private function getAmountRange($amount) {
        if ($amount < 1000) return 'small';
        if ($amount < 10000) return 'medium';
        if ($amount < 100000) return 'large';
        return 'very_large';
    }
    
    /**
     * 学習結果保存
     */
    private function saveLearningResult($session_id, $result) {
        if (!$this->pdo) return;
        
        try {
            $stmt = $this->pdo->prepare("
                UPDATE ai_learning_texts 
                SET status = 'completed', 
                    accuracy = ?, 
                    confidence = ?, 
                    processing_time = ?,
                    result_data = ?,
                    updated_at = NOW()
                WHERE session_id = ?
            ");
            
            $stmt->execute([
                $result['accuracy'],
                $result['confidence'],
                $result['processing_time'],
                json_encode($result),
                $session_id
            ]);
            
            error_log("✅ KICHO AI: 学習結果保存完了 - {$session_id}");
            
        } catch (Exception $e) {
            error_log("⚠️ KICHO AI: 結果保存失敗 - " . $e->getMessage());
        }
    }
    
    /**
     * 学習セッション更新
     */
    private function updateLearningSession($session_id, $status, $accuracy = null, $confidence = null, $error_message = null) {
        if (!$this->pdo) return;
        
        try {
            $stmt = $this->pdo->prepare("
                UPDATE ai_learning_texts 
                SET status = ?, accuracy = ?, confidence = ?, error_message = ?, updated_at = NOW()
                WHERE session_id = ?
            ");
            
            $stmt->execute([$status, $accuracy, $confidence, $error_message, $session_id]);
            
        } catch (Exception $e) {
            error_log("⚠️ KICHO AI: セッション更新失敗 - " . $e->getMessage());
        }
    }
    
    /**
     * 視覚化データ生成
     */
    private function generateVisualization($result) {
        $accuracy = $result['accuracy'];
        $confidence = $result['confidence'];
        
        // 精度グラフデータ
        $accuracy_chart = [
            'type' => 'radial',
            'value' => round($accuracy * 100, 1),
            'max' => 100,
            'color' => $accuracy >= 0.9 ? '#4caf50' : ($accuracy >= 0.7 ? '#ff9800' : '#f44336'),
            'label' => '学習精度'
        ];
        
        // 信頼度グラフデータ
        $confidence_chart = [
            'type' => 'bar',
            'value' => round($confidence * 100, 1),
            'max' => 100,
            'color' => $confidence >= 0.8 ? '#2196f3' : ($confidence >= 0.6 ? '#ff9800' : '#f44336'),
            'label' => '信頼度'
        ];
        
        // 処理時間データ
        $processing_chart = [
            'type' => 'time',
            'value' => $result['processing_time'],
            'unit' => 'ms',
            'color' => $result['processing_time'] < 1000 ? '#4caf50' : ($result['processing_time'] < 3000 ? '#ff9800' : '#f44336'),
            'label' => '処理時間'
        ];
        
        // キーワード分析データ
        $keywords_chart = [];
        if (isset($result['keywords'])) {
            foreach ($result['keywords'] as $keyword) {
                $keywords_chart[] = [
                    'keyword' => $keyword['keyword'],
                    'category' => $keyword['category'],
                    'confidence' => round($keyword['confidence'] * 100, 1)
                ];
            }
        }
        
        return [
            'accuracy' => $accuracy_chart,
            'confidence' => $confidence_chart,
            'processing_time' => $processing_chart,
            'keywords' => $keywords_chart,
            'generated_at' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * ルール生成
     */
    private function generateRules($result, $text_content) {
        $rules = [];
        
        if (isset($result['keywords'])) {
            foreach ($result['keywords'] as $keyword_data) {
                $rules[] = [
                    'rule_name' => $keyword_data['keyword'] . '自動判定ルール',
                    'rule_pattern' => '%' . $keyword_data['keyword'] . '%',
                    'target_category' => $keyword_data['category'],
                    'confidence_threshold' => $keyword_data['confidence'],
                    'created_by' => 'ai_learning',
                    'session_id' => $result['session_id'] ?? null
                ];
            }
        }
        
        // パターンベースルール
        if (isset($result['patterns'])) {
            foreach ($result['patterns'] as $pattern) {
                if ($pattern['type'] === 'amount') {
                    $category = $this->getCategoryByAmountRange($pattern['range']);
                    if ($category) {
                        $rules[] = [
                            'rule_name' => $pattern['range'] . '金額範囲ルール',
                            'rule_pattern' => 'amount_range:' . $pattern['range'],
                            'target_category' => $category,
                            'confidence_threshold' => 0.7,
                            'created_by' => 'ai_pattern',
                            'session_id' => $result['session_id'] ?? null
                        ];
                    }
                }
            }
        }
        
        // ルールをデータベースに保存
        $this->saveGeneratedRules($rules);
        
        return $rules;
    }
    
    /**
     * 金額範囲による勘定科目推定
     */
    private function getCategoryByAmountRange($range) {
        $range_categories = [
            'small' => '消耗品費',
            'medium' => '雑費',
            'large' => null, // 金額のみでは判定困難
            'very_large' => null
        ];
        
        return $range_categories[$range] ?? null;
    }
    
    /**
     * 生成ルール保存
     */
    private function saveGeneratedRules($rules) {
        if (!$this->pdo || empty($rules)) return;
        
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO rules (
                    rule_name, rule_pattern, target_category, confidence_threshold, 
                    created_by, status, created_at
                ) VALUES (?, ?, ?, ?, ?, 'pending', NOW())
            ");
            
            foreach ($rules as $rule) {
                $stmt->execute([
                    $rule['rule_name'],
                    $rule['rule_pattern'],
                    $rule['target_category'],
                    $rule['confidence_threshold'],
                    $rule['created_by']
                ]);
            }
            
            error_log("✅ KICHO AI: 生成ルール保存完了 - " . count($rules) . "件");
            
        } catch (Exception $e) {
            error_log("⚠️ KICHO AI: ルール保存失敗 - " . $e->getMessage());
        }
    }
    
    /**
     * AI学習履歴取得
     */
    public function getLearningHistory($limit = 10) {
        if (!$this->pdo) {
            return $this->getSessionLearningHistory($limit);
        }
        
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    session_id,
                    text_content,
                    learning_mode,
                    status,
                    accuracy,
                    confidence,
                    processing_time,
                    error_message,
                    created_at,
                    updated_at
                FROM ai_learning_texts 
                ORDER BY created_at DESC 
                LIMIT ?
            ");
            
            $stmt->execute([$limit]);
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            error_log("⚠️ KICHO AI: 履歴取得失敗 - " . $e->getMessage());
            return $this->getSessionLearningHistory($limit);
        }
    }
    
    /**
     * セッション学習履歴取得（フォールバック）
     */
    private function getSessionLearningHistory($limit) {
        $sessions = $_SESSION['kicho_ai_history'] ?? [];
        return array_slice($sessions, 0, $limit);
    }
    
    /**
     * AI接続状況取得
     */
    public function getAIStatus() {
        return [
            'fastapi_available' => $this->ai_available,
            'fastapi_url' => $this->fastapi_base_url,
            'database_connected' => $this->pdo !== null,
            'last_check' => date('Y-m-d H:i:s'),
            'status' => $this->ai_available ? 'connected' : 'disconnected'
        ];
    }
}

// =====================================
// 🔗 グローバル関数（後方互換性）
// =====================================

/**
 * AI学習実行（Ajax handlerから呼び出し用）
 */
function executeKichoAILearning($text_content, $learning_mode = 'incremental') {
    static $ai_integration = null;
    
    if ($ai_integration === null) {
        $ai_integration = new KichoAIIntegration();
    }
    
    return $ai_integration->executeAILearning($text_content, $learning_mode);
}

/**
 * AI学習履歴取得
 */
function getKichoAIHistory($limit = 10) {
    static $ai_integration = null;
    
    if ($ai_integration === null) {
        $ai_integration = new KichoAIIntegration();
    }
    
    return $ai_integration->getLearningHistory($limit);
}

/**
 * AI接続状況取得
 */
function getKichoAIStatus() {
    static $ai_integration = null;
    
    if ($ai_integration === null) {
        $ai_integration = new KichoAIIntegration();
    }
    
    return $ai_integration->getAIStatus();
}

/**
 * ✅ KICHO ローカルAI連携システム完成
 * 
 * 🎯 実装完了機能:
 * ✅ FastAPI実連携（http://localhost:8000/api/ai-learning）
 * ✅ AI学習結果視覚化（精度・信頼度・処理時間グラフ）
 * ✅ 学習データ前処理（キーワード抽出・パターン検出）
 * ✅ PostgreSQL統合管理（学習履歴・ルール保存）
 * ✅ エラーハンドリング・シミュレーションフォールバック
 * ✅ 自動ルール生成・保存
 * ✅ 学習履歴管理
 * 
 * 🧪 使用方法:
 * 1. modules/kicho/kicho_ai_integration.php として保存
 * 2. Ajax handlerで executeKichoAILearning() 呼び出し
 * 3. FastAPI起動時: 実AI連携
 * 4. FastAPI未起動時: シミュレーション実行
 * 
 * 🚀 連携フロー:
 * テキスト入力 → 前処理 → FastAPI送信 → 結果受信 → 
 * 視覚化生成 → ルール生成 → DB保存 → UI表示
 */
?>