<?php
/**
 * リアルタイムタイトルチェックAPI
 * 商品タイトル入力時のリアルタイム禁止キーワード検出
 * 
 * エンドポイント: api/realtime_check.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

require_once '../../shared/core/includes.php';

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
function validateCSRFToken() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return !empty($token) && hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

// エラーレスポンス
function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $message,
        'detected_keywords' => [],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// 成功レスポンス
function sendSuccess($detectedKeywords = [], $riskLevel = 'safe') {
    echo json_encode([
        'success' => true,
        'detected_keywords' => $detectedKeywords,
        'risk_level' => $riskLevel,
        'total_detected' => count($detectedKeywords),
        'is_safe' => empty($detectedKeywords),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// リクエスト検証
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('POSTメソッドのみ許可されています', 405);
}

if (!validateCSRFToken()) {
    sendError('CSRFトークンが無効です', 403);
}

$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    sendError('不正なJSONフォーマットです');
}

$title = trim($input['title'] ?? '');
if (empty($title)) {
    sendSuccess(); // 空の場合は安全として返す
}

try {
    $checker = new RealtimeKeywordChecker($pdo);
    $results = $checker->checkTitle($title);
    
    // リスクレベル判定
    $riskLevel = 'safe';
    if (!empty($results)) {
        $highRiskCount = count(array_filter($results, function($item) {
            return $item['priority'] === 'HIGH';
        }));
        
        if ($highRiskCount > 0) {
            $riskLevel = 'high';
        } elseif (count($results) >= 3) {
            $riskLevel = 'medium';
        } else {
            $riskLevel = 'low';
        }
    }
    
    sendSuccess($results, $riskLevel);
    
} catch (Exception $e) {
    error_log('Realtime Check Error: ' . $e->getMessage());
    sendError('システムエラーが発生しました', 500);
}

/**
 * リアルタイムキーワードチェッククラス
 */
class RealtimeKeywordChecker {
    private $pdo;
    private $keywordCache = [];
    private $cacheExpiry = 300; // 5分
    
    public function __construct($database) {
        $this->pdo = $database;
    }
    
    /**
     * タイトルチェック実行
     */
    public function checkTitle($title) {
        $this->loadKeywords();
        
        $detectedKeywords = [];
        $titleLower = mb_strtolower($title, 'UTF-8');
        
        foreach ($this->keywordCache as $keywordData) {
            $keyword = $keywordData['keyword'];
            $keywordLower = mb_strtolower($keyword, 'UTF-8');
            
            if ($this->isKeywordDetected($titleLower, $keywordLower)) {
                $detectedKeywords[] = [
                    'keyword' => $keyword,
                    'type' => $keywordData['type'],
                    'priority' => $keywordData['priority'],
                    'mall_name' => $keywordData['mall_name'],
                    'position' => mb_strpos($titleLower, $keywordLower),
                    'match_type' => $this->getMatchType($titleLower, $keywordLower)
                ];
                
                // 検出回数を非同期で更新（パフォーマンス重視）
                $this->updateDetectionCountAsync($keywordData['id']);
            }
        }
        
        // 重要度でソート（HIGH -> MEDIUM -> LOW）
        usort($detectedKeywords, function($a, $b) {
            $priorityOrder = ['HIGH' => 3, 'MEDIUM' => 2, 'LOW' => 1];
            return $priorityOrder[$b['priority']] <=> $priorityOrder[$a['priority']];
        });
        
        return $detectedKeywords;
    }
    
    /**
     * キーワード読み込み（キャッシュ機能付き）
     */
    private function loadKeywords() {
        $cacheFile = sys_get_temp_dir() . '/keyword_cache.json';
        $useCache = false;
        
        // キャッシュファイルの存在と有効性確認
        if (file_exists($cacheFile)) {
            $cacheTime = filemtime($cacheFile);
            if (time() - $cacheTime < $this->cacheExpiry) {
                $this->keywordCache = json_decode(file_get_contents($cacheFile), true) ?: [];
                $useCache = true;
            }
        }
        
        if (!$useCache) {
            // データベースから最新キーワードを取得
            $stmt = $this->pdo->prepare("
                SELECT id, keyword, type, priority, mall_name, is_active
                FROM filter_keywords 
                WHERE is_active = TRUE
                ORDER BY 
                    CASE priority 
                        WHEN 'HIGH' THEN 3 
                        WHEN 'MEDIUM' THEN 2 
                        ELSE 1 
                    END DESC,
                    LENGTH(keyword) DESC
            ");
            $stmt->execute();
            $this->keywordCache = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // キャッシュファイルに保存
            if (!empty($this->keywordCache)) {
                file_put_contents($cacheFile, json_encode($this->keywordCache), LOCK_EX);
            }
        }
    }
    
    /**
     * キーワード検出判定
     */
    private function isKeywordDetected($text, $keyword) {
        // 完全一致チェック
        if (mb_strpos($text, $keyword) !== false) {
            return true;
        }
        
        // スペース区切り単語としてのチェック
        $words = preg_split('/[\s\-_\.]+/', $text);
        foreach ($words as $word) {
            if (mb_strtolower($word, 'UTF-8') === $keyword) {
                return true;
            }
        }
        
        // 部分一致（3文字以上のキーワードのみ）
        if (mb_strlen($keyword) >= 3) {
            if (mb_strpos($text, $keyword) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * マッチタイプ判定
     */
    private function getMatchType($text, $keyword) {
        if (mb_strpos($text, $keyword) !== false) {
            // 単語境界でのマッチかチェック
            $pattern = '/\b' . preg_quote($keyword, '/') . '\b/iu';
            if (preg_match($pattern, $text)) {
                return 'exact_word';
            }
            return 'partial';
        }
        return 'none';
    }
    
    /**
     * 検出回数の非同期更新
     */
    private function updateDetectionCountAsync($keywordId) {
        // 簡易的な非同期処理（実際の本格実装では専用のキューシステムを使用）
        $updateFile = sys_get_temp_dir() . "/detection_updates.log";
        $logEntry = json_encode([
            'keyword_id' => $keywordId,
            'timestamp' => time()
        ]) . "\n";
        
        file_put_contents($updateFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
    
    /**
     * 検出レポート生成
     */
    public function generateDetectionReport($title) {
        $results = $this->checkTitle($title);
        
        $report = [
            'title' => $title,
            'total_detected' => count($results),
            'is_safe' => empty($results),
            'risk_assessment' => $this->assessRisk($results),
            'detected_keywords' => $results,
            'recommendations' => $this->generateRecommendations($results)
        ];
        
        return $report;
    }
    
    /**
     * リスク評価
     */
    private function assessRisk($detectedKeywords) {
        if (empty($detectedKeywords)) {
            return [
                'level' => 'safe',
                'score' => 0,
                'description' => '禁止キーワードは検出されませんでした'
            ];
        }
        
        $score = 0;
        $highRiskCount = 0;
        
        foreach ($detectedKeywords as $keyword) {
            switch ($keyword['priority']) {
                case 'HIGH':
                    $score += 10;
                    $highRiskCount++;
                    break;
                case 'MEDIUM':
                    $score += 5;
                    break;
                case 'LOW':
                    $score += 2;
                    break;
            }
        }
        
        if ($highRiskCount > 0 || $score >= 20) {
            $level = 'high';
            $description = '高リスクキーワードが検出されました。出品は推奨されません。';
        } elseif ($score >= 10 || count($detectedKeywords) >= 3) {
            $level = 'medium';
            $description = '中程度のリスクキーワードが検出されました。要注意です。';
        } else {
            $level = 'low';
            $description = '低リスクキーワードが検出されました。注意が必要です。';
        }
        
        return [
            'level' => $level,
            'score' => $score,
            'high_risk_count' => $highRiskCount,
            'description' => $description
        ];
    }
    
    /**
     * 改善提案生成
     */
    private function generateRecommendations($detectedKeywords) {
        if (empty($detectedKeywords)) {
            return ['このタイトルは問題ありません。'];
        }
        
        $recommendations = [];
        
        foreach ($detectedKeywords as $keyword) {
            $word = $keyword['keyword'];
            $type = $keyword['type'];
            
            switch ($type) {
                case 'EXPORT':
                    $recommendations[] = "「{$word}」は輸出禁止に関連する用語です。別の表現に変更してください。";
                    break;
                case 'PATENT':
                    $recommendations[] = "「{$word}」は特許・著作権に関連する用語です。正規品であることを明記するか、別の表現を検討してください。";
                    break;
                case 'MALL':
                    $recommendations[] = "「{$word}」は特定のモールで禁止されている用語です。出品先を確認してください。";
                    break;
            }
        }
        
        // 一般的な改善提案を追加
        if (count($detectedKeywords) > 1) {
            $recommendations[] = '複数の問題が検出されました。タイトルの全面的な見直しをお勧めします。';
        }
        
        $recommendations[] = 'より具体的で魅力的な商品説明に焦点を当てることを検討してください。';
        
        return array_unique($recommendations);
    }
}

/**
 * 検出回数更新の定期実行処理（cron等で実行）
 */
function processDetectionUpdates($pdo) {
    $updateFile = sys_get_temp_dir() . "/detection_updates.log";
    
    if (!file_exists($updateFile)) {
        return;
    }
    
    $updates = file($updateFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (empty($updates)) {
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        $updateCounts = [];
        foreach ($updates as $line) {
            $data = json_decode($line, true);
            if ($data && isset($data['keyword_id'])) {
                $keywordId = $data['keyword_id'];
                $updateCounts[$keywordId] = ($updateCounts[$keywordId] ?? 0) + 1;
            }
        }
        
        $stmt = $pdo->prepare("
            UPDATE filter_keywords 
            SET detection_count = detection_count + ?, updated_at = NOW() 
            WHERE id = ?
        ");
        
        foreach ($updateCounts as $keywordId => $count) {
            $stmt->execute([$count, $keywordId]);
        }
        
        $pdo->commit();
        
        // 処理済みファイル削除
        unlink($updateFile);
        
        error_log("検出回数更新完了: " . count($updateCounts) . "キーワード");
        
    } catch (Exception $e) {
        $pdo->rollback();
        error_log("検出回数更新エラー: " . $e->getMessage());
    }
}