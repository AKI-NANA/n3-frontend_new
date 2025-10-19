<?php
/**
 * CAIDS ⇔ Claude連動ブリッジシステム v2.0
 * クロードの作業を検出・監視・フィードバック
 */

class CAIDSClaudeIntegrationBridge {
    
    private $dataDir;
    private $sessionId;
    private $integrationSettings;
    
    public function __construct() {
        $this->dataDir = __DIR__ . '/../data';
        $this->sessionId = $_SESSION['caids_session_id'] ?? null;
        
        $this->integrationSettings = [
            'auto_detect_filesystem_operations' => true,
            'monitor_file_changes' => true,
            'track_artifact_creation' => true,
            'detect_hook_implementations' => true,
            'real_time_feedback' => true,
            'phase_auto_progression' => true
        ];
        
        $this->initializeIntegration();
    }
    
    /**
     * Claude連動システム初期化
     */
    private function initializeIntegration() {
        // 連動ログファイル作成
        $integrationLogPath = $this->dataDir . '/claude_integration.json';
        
        if (!file_exists($integrationLogPath)) {
            $initialData = [
                'integration_start' => date('Y-m-d H:i:s'),
                'caids_version' => '2.0',
                'claude_operations' => [],
                'detected_patterns' => [],
                'auto_triggers' => [],
                'session_mapping' => []
            ];
            
            file_put_contents($integrationLogPath, json_encode($initialData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
    }
    
    /**
     * Claude操作検出・監視
     */
    public function detectClaudeOperation($operationType, $details = []) {
        $operationData = [
            'operation_id' => uniqid('claude_op_'),
            'type' => $operationType,
            'timestamp' => date('Y-m-d H:i:s'),
            'session_id' => $this->sessionId,
            'details' => $details,
            'auto_triggered' => false
        ];
        
        // 操作タイプ別処理
        switch ($operationType) {
            case 'filesystem_write':
                return $this->handleFilesystemWrite($operationData);
                
            case 'artifact_creation':
                return $this->handleArtifactCreation($operationData);
                
            case 'hook_implementation':
                return $this->handleHookImplementation($operationData);
                
            case 'code_generation':
                return $this->handleCodeGeneration($operationData);
                
            case 'phase_completion':
                return $this->handlePhaseCompletion($operationData);
                
            default:
                return $this->handleGenericOperation($operationData);
        }
    }
    
    /**
     * ファイルシステム書き込み操作処理
     */
    private function handleFilesystemWrite($operationData) {
        $filePath = $operationData['details']['file_path'] ?? '';
        $fileSize = $operationData['details']['file_size'] ?? 0;
        $fileType = pathinfo($filePath, PATHINFO_EXTENSION);
        
        // CAIDS監視システムに通知
        $this->notifyCAIDSMonitor('FILE_CREATED', [
            'file_path' => $filePath,
            'file_type' => $fileType,
            'file_size' => $fileSize,
            'operation_id' => $operationData['operation_id']
        ]);
        
        // Hook実装ファイル検出
        if ($this->isHookImplementationFile($filePath)) {
            $this->triggerHookDetection($filePath, $operationData);
        }
        
        // フェーズ自動進行判定
        if ($this->shouldProgressPhase($filePath, $fileType)) {
            $this->triggerPhaseProgression($operationData);
        }
        
        $operationData['processed'] = true;
        $operationData['caids_notified'] = true;
        
        return $operationData;
    }
    
    /**
     * アーティファクト作成処理
     */
    private function handleArtifactCreation($operationData) {
        $artifactType = $operationData['details']['artifact_type'] ?? 'unknown';
        $artifactSize = $operationData['details']['artifact_size'] ?? 0;
        $artifactLanguage = $operationData['details']['language'] ?? 'unknown';
        
        // アーティファクトタイプ別処理
        $phaseMapping = [
            'php' => 5,           // PHP Backend
            'javascript' => 3,    // JavaScript統合
            'css' => 2,          // CSS統合システム
            'html' => 4,         // Ajax統合
            'application/vnd.ant.code' => 'auto_detect'
        ];
        
        $targetPhase = $phaseMapping[$artifactType] ?? null;
        
        if ($targetPhase) {
            if ($targetPhase === 'auto_detect') {
                $targetPhase = $this->detectPhaseFromContent($operationData['details']);
            }
            
            // 該当フェーズの進捗更新
            $this->updatePhaseProgress($targetPhase, 25, 'active');
            
            // ログ追加
            $this->addIntegrationLog('ARTIFACT_CREATED', [
                'artifact_type' => $artifactType,
                'target_phase' => $targetPhase,
                'file_size' => $artifactSize,
                'language' => $artifactLanguage
            ]);
        }
        
        return $operationData;
    }
    
    /**
     * Hook実装処理
     */
    private function handleHookImplementation($operationData) {
        $hookName = $operationData['details']['hook_name'] ?? '';
        $hookType = $operationData['details']['hook_type'] ?? 'HISSU';
        $implementation = $operationData['details']['implementation'] ?? '';
        
        // Hook読み込み進捗更新
        $this->updateHookProgress($hookType, 1, $hookName);
        
        // 必須Hook実装時のフェーズ進行
        if ($hookType === 'HISSU') {
            $this->updatePhaseProgress(1, 20, 'active');
            
            // 必須Hook完了チェック
            if ($this->checkEssentialHooksCompletion()) {
                $this->updatePhaseProgress(1, 100, 'completed');
                $this->updatePhaseProgress(2, 0, 'active'); // 次フェーズ開始
            }
        }
        
        // Hook実装の品質メトリクス
        $qualityMetrics = $this->analyzeHookQuality($implementation);
        
        $operationData['quality_metrics'] = $qualityMetrics;
        $operationData['hook_registered'] = true;
        
        return $operationData;
    }
    
    /**
     * コード生成処理
     */
    private function handleCodeGeneration($operationData) {
        $codeType = $operationData['details']['code_type'] ?? '';
        $codeSize = $operationData['details']['code_size'] ?? 0;
        $complexity = $operationData['details']['complexity'] ?? 'medium';
        
        // コード生成統計更新
        $this->updateCodeGenerationStats($codeType, $codeSize, $complexity);
        
        // 自動品質チェック
        if ($this->integrationSettings['auto_detect_filesystem_operations']) {
            $qualityCheck = $this->performAutoQualityCheck($operationData['details']);
            $operationData['quality_check'] = $qualityCheck;
        }
        
        return $operationData;
    }
    
    /**
     * フェーズ完了処理
     */
    private function handlePhaseCompletion($operationData) {
        $phaseNum = $operationData['details']['phase'] ?? 1;
        $completionRate = $operationData['details']['completion_rate'] ?? 100;
        
        // フェーズ完了通知
        $this->updatePhaseProgress($phaseNum, $completionRate, 'completed');
        
        // 次フェーズ自動開始
        if ($this->integrationSettings['phase_auto_progression'] && $phaseNum < 6) {
            $this->updatePhaseProgress($phaseNum + 1, 0, 'active');
            
            $this->addIntegrationLog('PHASE_AUTO_PROGRESSION', [
                'completed_phase' => $phaseNum,
                'started_phase' => $phaseNum + 1,
                'auto_triggered' => true
            ]);
        }
        
        return $operationData;
    }
    
    /**
     * 汎用操作処理
     */
    private function handleGenericOperation($operationData) {
        // 基本的な操作ログ記録
        $this->logClaudeOperation($operationData);
        
        return $operationData;
    }
    
    /**
     * CAIDS監視システムに通知
     */
    private function notifyCAIDSMonitor($eventType, $eventData) {
        if (!$this->sessionId) {
            return false;
        }
        
        // API経由でCAIDS監視システムに通知
        $apiUrl = '/modules/caids_monitor/api/get_progress.php';
        $postData = [
            'endpoint' => 'add_log',
            'session_id' => $this->sessionId,
            'type' => 'CLAUDE_INTEGRATION',
            'message' => "Claude操作検出: {$eventType} - " . json_encode($eventData, JSON_UNESCAPED_UNICODE)
        ];
        
        // 内部API呼び出し（簡易実装）
        $this->callInternalAPI($apiUrl, $postData);
        
        return true;
    }
    
    /**
     * Hook検出トリガー
     */
    private function triggerHookDetection($filePath, $operationData) {
        // Hook実装ファイルパターン分析
        $hookPatterns = [
            'HISSU_' => 'HISSU',
            'SENYO_' => 'SENYO', 
            'HANYO_' => 'HANYO',
            '_hook' => 'AUTO_DETECT',
            'Hook' => 'AUTO_DETECT'
        ];
        
        $detectedType = 'AUTO_DETECT';
        foreach ($hookPatterns as $pattern => $type) {
            if (strpos(basename($filePath), $pattern) !== false) {
                $detectedType = $type;
                break;
            }
        }
        
        // Hook実装検出通知
        $this->detectClaudeOperation('hook_implementation', [
            'hook_name' => basename($filePath, '.php'),
            'hook_type' => $detectedType,
            'file_path' => $filePath,
            'auto_detected' => true
        ]);
    }
    
    /**
     * フェーズ進行トリガー
     */
    private function triggerPhaseProgression($operationData) {
        $filePath = $operationData['details']['file_path'] ?? '';
        $fileType = pathinfo($filePath, PATHINFO_EXTENSION);
        
        // ファイルタイプ別フェーズマッピング
        $phaseMapping = [
            'php' => 5,
            'js' => 3,
            'css' => 2,
            'html' => 4
        ];
        
        $targetPhase = $phaseMapping[$fileType] ?? null;
        
        if ($targetPhase) {
            $this->updatePhaseProgress($targetPhase, 15, 'active');
        }
    }
    
    /**
     * Hook実装ファイル判定
     */
    private function isHookImplementationFile($filePath) {
        $filename = basename($filePath);
        
        $hookIndicators = [
            'hook', 'Hook', 'HOOK',
            'HISSU_', 'SENYO_', 'HANYO_',
            'caids', 'CAIDS'
        ];
        
        foreach ($hookIndicators as $indicator) {
            if (strpos($filename, $indicator) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * フェーズ進行判定
     */
    private function shouldProgressPhase($filePath, $fileType) {
        $progressionTriggers = [
            'php' => true,
            'js' => true,
            'css' => true,
            'html' => true,
            'json' => false
        ];
        
        return $progressionTriggers[$fileType] ?? false;
    }
    
    /**
     * フェーズ進捗更新
     */
    private function updatePhaseProgress($phaseNum, $progress, $status) {
        if (!$this->sessionId) {
            return false;
        }
        
        $apiUrl = '/modules/caids_monitor/api/get_progress.php';
        $postData = [
            'endpoint' => 'update_phase',
            'session_id' => $this->sessionId,
            'phase' => $phaseNum,
            'progress' => $progress,
            'status' => $status
        ];
        
        return $this->callInternalAPI($apiUrl, $postData);
    }
    
    /**
     * Hook進捗更新
     */
    private function updateHookProgress($hookType, $progress, $hookName) {
        if (!$this->sessionId) {
            return false;
        }
        
        $apiUrl = '/modules/caids_monitor/api/get_progress.php';
        $postData = [
            'endpoint' => 'update_hook',
            'session_id' => $this->sessionId,
            'hook_type' => $hookType,
            'progress' => $progress,
            'hook_name' => $hookName
        ];
        
        return $this->callInternalAPI($apiUrl, $postData);
    }
    
    /**
     * 必須Hook完了チェック
     */
    private function checkEssentialHooksCompletion() {
        // セッションデータ確認
        if (!$this->sessionId) {
            return false;
        }
        
        $sessionPath = $this->dataDir . '/sessions/' . $this->sessionId . '.json';
        
        if (file_exists($sessionPath)) {
            $sessionData = json_decode(file_get_contents($sessionPath), true);
            $hooksData = $sessionData['hooks'] ?? [];
            
            // 必須Hook数チェック（目標値: 4個以上）
            $hissuCount = $hooksData['by_tier']['HISSU'] ?? 0;
            
            return $hissuCount >= 4;
        }
        
        return false;
    }
    
    /**
     * Hook品質分析
     */
    private function analyzeHookQuality($implementation) {
        $metrics = [
            'code_length' => strlen($implementation),
            'complexity_score' => 0,
            'documentation_score' => 0,
            'best_practices_score' => 0,
            'overall_quality' => 'unknown'
        ];
        
        // 複雑度スコア（簡易実装）
        $complexity_indicators = ['if', 'for', 'while', 'function', 'class'];
        foreach ($complexity_indicators as $indicator) {
            $metrics['complexity_score'] += substr_count(strtolower($implementation), $indicator);
        }
        
        // ドキュメンテーションスコア
        if (strpos($implementation, '/**') !== false) {
            $metrics['documentation_score'] += 10;
        }
        if (strpos($implementation, '@param') !== false) {
            $metrics['documentation_score'] += 5;
        }
        if (strpos($implementation, '@return') !== false) {
            $metrics['documentation_score'] += 5;
        }
        
        // ベストプラクティススコア
        if (strpos($implementation, 'error_reporting') !== false) {
            $metrics['best_practices_score'] += 5;
        }
        if (strpos($implementation, 'try {') !== false) {
            $metrics['best_practices_score'] += 10;
        }
        
        // 総合品質判定
        $totalScore = $metrics['documentation_score'] + $metrics['best_practices_score'];
        
        if ($totalScore >= 20) {
            $metrics['overall_quality'] = 'excellent';
        } elseif ($totalScore >= 15) {
            $metrics['overall_quality'] = 'good';
        } elseif ($totalScore >= 10) {
            $metrics['overall_quality'] = 'fair';
        } else {
            $metrics['overall_quality'] = 'needs_improvement';
        }
        
        return $metrics;
    }
    
    /**
     * 統合ログ追加
     */
    private function addIntegrationLog($eventType, $eventData) {
        $integrationLogPath = $this->dataDir . '/claude_integration.json';
        
        if (file_exists($integrationLogPath)) {
            $integrationData = json_decode(file_get_contents($integrationLogPath), true);
            
            $integrationData['claude_operations'][] = [
                'event_type' => $eventType,
                'event_data' => $eventData,
                'timestamp' => date('Y-m-d H:i:s'),
                'session_id' => $this->sessionId
            ];
            
            // ログ数制限（最新500件）
            if (count($integrationData['claude_operations']) > 500) {
                $integrationData['claude_operations'] = array_slice(
                    $integrationData['claude_operations'], -500
                );
            }
            
            file_put_contents($integrationLogPath, json_encode($integrationData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
    }
    
    /**
     * 内部API呼び出し
     */
    private function callInternalAPI($url, $postData) {
        // 簡易的な内部API呼び出し実装
        // 実際の環境では適切なHTTPクライアントを使用
        
        try {
            // POST データをJSON形式に変換
            $jsonData = json_encode($postData);
            
            // 内部的にAPI処理をシミュレート
            // 実装時は実際のHTTP reqeustまたはダイレクト関数呼び出し
            
            return ['success' => true, 'data' => $postData];
            
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * コンテンツからフェーズ検出
     */
    private function detectPhaseFromContent($details) {
        $content = $details['content'] ?? '';
        
        if (stripos($content, 'css') !== false || stripos($content, 'style') !== false) {
            return 2; // CSS統合システム
        }
        
        if (stripos($content, 'javascript') !== false || stripos($content, 'script') !== false) {
            return 3; // JavaScript統合
        }
        
        if (stripos($content, 'ajax') !== false || stripos($content, 'fetch') !== false) {
            return 4; // Ajax統合
        }
        
        if (stripos($content, 'php') !== false || stripos($content, 'backend') !== false) {
            return 5; // PHP Backend
        }
        
        if (stripos($content, 'test') !== false || stripos($content, 'quality') !== false) {
            return 6; // 品質保証・テスト
        }
        
        return 1; // デフォルト：必須Hook読み込み
    }
    
    /**
     * Claude操作ログ記録
     */
    private function logClaudeOperation($operationData) {
        $this->addIntegrationLog('CLAUDE_OPERATION', $operationData);
    }
    
    /**
     * コード生成統計更新
     */
    private function updateCodeGenerationStats($codeType, $codeSize, $complexity) {
        $statsPath = $this->dataDir . '/code_generation_stats.json';
        
        $stats = [];
        if (file_exists($statsPath)) {
            $stats = json_decode(file_get_contents($statsPath), true) ?? [];
        }
        
        if (!isset($stats['daily_stats'])) {
            $stats['daily_stats'] = [];
        }
        
        $today = date('Y-m-d');
        if (!isset($stats['daily_stats'][$today])) {
            $stats['daily_stats'][$today] = [
                'total_files' => 0,
                'total_size' => 0,
                'by_type' => [],
                'complexity_distribution' => []
            ];
        }
        
        $stats['daily_stats'][$today]['total_files']++;
        $stats['daily_stats'][$today]['total_size'] += $codeSize;
        
        if (!isset($stats['daily_stats'][$today]['by_type'][$codeType])) {
            $stats['daily_stats'][$today]['by_type'][$codeType] = 0;
        }
        $stats['daily_stats'][$today]['by_type'][$codeType]++;
        
        if (!isset($stats['daily_stats'][$today]['complexity_distribution'][$complexity])) {
            $stats['daily_stats'][$today]['complexity_distribution'][$complexity] = 0;
        }
        $stats['daily_stats'][$today]['complexity_distribution'][$complexity]++;
        
        file_put_contents($statsPath, json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    /**
     * 自動品質チェック
     */
    private function performAutoQualityCheck($details) {
        $content = $details['content'] ?? '';
        $language = $details['language'] ?? '';
        
        $qualityScore = 0;
        $issues = [];
        $recommendations = [];
        
        // 基本的な品質チェック
        if (strlen($content) > 0) {
            $qualityScore += 10; // コンテンツ存在
        }
        
        // 言語別品質チェック
        switch ($language) {
            case 'php':
                $qualityScore += $this->checkPHPQuality($content, $issues, $recommendations);
                break;
                
            case 'javascript':
                $qualityScore += $this->checkJavaScriptQuality($content, $issues, $recommendations);
                break;
                
            case 'css':
                $qualityScore += $this->checkCSSQuality($content, $issues, $recommendations);
                break;
                
            case 'html':
                $qualityScore += $this->checkHTMLQuality($content, $issues, $recommendations);
                break;
        }
        
        // 品質レベル判定
        $qualityLevel = 'poor';
        if ($qualityScore >= 80) {
            $qualityLevel = 'excellent';
        } elseif ($qualityScore >= 60) {
            $qualityLevel = 'good';
        } elseif ($qualityScore >= 40) {
            $qualityLevel = 'fair';
        }
        
        return [
            'quality_score' => $qualityScore,
            'quality_level' => $qualityLevel,
            'issues' => $issues,
            'recommendations' => $recommendations,
            'check_time' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * PHP品質チェック
     */
    private function checkPHPQuality($content, &$issues, &$recommendations) {
        $score = 0;
        
        // PHP開始タグチェック
        if (strpos($content, '<?php') !== false) {
            $score += 10;
        } else {
            $issues[] = 'PHP開始タグが見つかりません';
        }
        
        // エラー報告設定チェック
        if (strpos($content, 'error_reporting') !== false) {
            $score += 10;
        } else {
            $recommendations[] = 'error_reporting設定を追加することを推奨';
        }
        
        // 例外処理チェック
        if (strpos($content, 'try') !== false && strpos($content, 'catch') !== false) {
            $score += 15;
        } else {
            $recommendations[] = 'try-catch文による例外処理を追加することを推奨';
        }
        
        // クラス定義チェック
        if (strpos($content, 'class ') !== false) {
            $score += 10;
        }
        
        // ドキュメンテーションチェック
        if (strpos($content, '/**') !== false) {
            $score += 10;
        } else {
            $recommendations[] = 'PHPDocによるドキュメンテーションを追加することを推奨';
        }
        
        // セキュリティチェック
        if (strpos($content, 'htmlspecialchars') !== false || strpos($content, 'filter_var') !== false) {
            $score += 15;
        } else {
            $issues[] = 'XSS対策が不十分な可能性があります';
        }
        
        return $score;
    }
    
    /**
     * JavaScript品質チェック
     */
    private function checkJavaScriptQuality($content, &$issues, &$recommendations) {
        $score = 0;
        
        // ES6機能使用チェック
        if (strpos($content, 'const ') !== false || strpos($content, 'let ') !== false) {
            $score += 15;
        } else {
            $recommendations[] = 'ES6のconst/let宣言を使用することを推奨';
        }
        
        // アロー関数チェック
        if (strpos($content, '=>') !== false) {
            $score += 10;
        }
        
        // 非同期処理チェック
        if (strpos($content, 'async') !== false && strpos($content, 'await') !== false) {
            $score += 15;
        }
        
        // エラーハンドリングチェック
        if (strpos($content, 'try') !== false && strpos($content, 'catch') !== false) {
            $score += 15;
        } else {
            $recommendations[] = 'エラーハンドリングを追加することを推奨';
        }
        
        // コメントチェック
        if (strpos($content, '//') !== false || strpos($content, '/*') !== false) {
            $score += 10;
        } else {
            $recommendations[] = 'コードにコメントを追加することを推奨';
        }
        
        // 厳密等価演算子チェック
        if (strpos($content, '===') !== false) {
            $score += 10;
        } else {
            $issues[] = '厳密等価演算子(===)の使用を推奨';
        }
        
        return $score;
    }
    
    /**
     * CSS品質チェック
     */
    private function checkCSSQuality($content, &$issues, &$recommendations) {
        $score = 0;
        
        // CSS変数使用チェック
        if (strpos($content, '--') !== false && strpos($content, 'var(') !== false) {
            $score += 15;
        } else {
            $recommendations[] = 'CSS変数を使用することを推奨';
        }
        
        // FlexboxまたはGridチェック
        if (strpos($content, 'display: flex') !== false || strpos($content, 'display: grid') !== false) {
            $score += 15;
        }
        
        // レスポンシブデザインチェック
        if (strpos($content, '@media') !== false) {
            $score += 20;
        } else {
            $recommendations[] = 'レスポンシブデザインのためのメディアクエリを追加することを推奨';
        }
        
        // BEM命名規則チェック
        if (preg_match('/\.[a-z-]+(__[a-z-]+)?(--[a-z-]+)?/', $content)) {
            $score += 15;
        } else {
            $recommendations[] = 'BEM命名規則の使用を推奨';
        }
        
        // コメントチェック
        if (strpos($content, '/*') !== false) {
            $score += 10;
        } else {
            $recommendations[] = 'CSSにコメントを追加することを推奨';
        }
        
        return $score;
    }
    
    /**
     * HTML品質チェック
     */
    private function checkHTMLQuality($content, &$issues, &$recommendations) {
        $score = 0;
        
        // DOCTYPE宣言チェック
        if (strpos($content, '<!DOCTYPE html>') !== false) {
            $score += 15;
        } else {
            $issues[] = 'DOCTYPE宣言が見つかりません';
        }
        
        // HTML5セマンティック要素チェック
        $semanticElements = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
        $semanticFound = 0;
        foreach ($semanticElements as $element) {
            if (strpos($content, "<$element") !== false) {
                $semanticFound++;
            }
        }
        $score += $semanticFound * 3;
        
        // アクセシビリティチェック
        if (strpos($content, 'alt=') !== false) {
            $score += 10;
        } else {
            $recommendations[] = '画像にalt属性を追加することを推奨';
        }
        
        // メタタグチェック
        if (strpos($content, '<meta charset=') !== false) {
            $score += 10;
        }
        
        if (strpos($content, 'viewport') !== false) {
            $score += 10;
        } else {
            $recommendations[] = 'レスポンシブデザインのためのviewportメタタグを追加することを推奨';
        }
        
        return $score;
    }
    
    /**
     * リアルタイム連動トリガー
     */
    public function triggerRealTimeUpdate($eventType, $eventData = []) {
        if (!$this->integrationSettings['real_time_feedback']) {
            return false;
        }
        
        // CAIDS監視システムにリアルタイム更新通知
        $this->notifyCAIDSMonitor('REAL_TIME_UPDATE', [
            'event_type' => $eventType,
            'event_data' => $eventData,
            'trigger_time' => date('Y-m-d H:i:s')
        ]);
        
        // Claude操作パターン学習
        $this->learnClaudeOperationPattern($eventType, $eventData);
        
        return true;
    }
    
    /**
     * Claude操作パターン学習
     */
    private function learnClaudeOperationPattern($eventType, $eventData) {
        $integrationLogPath = $this->dataDir . '/claude_integration.json';
        
        if (file_exists($integrationLogPath)) {
            $integrationData = json_decode(file_get_contents($integrationLogPath), true);
            
            if (!isset($integrationData['detected_patterns'])) {
                $integrationData['detected_patterns'] = [];
            }
            
            // パターン検出・学習ロジック
            $pattern = [
                'event_type' => $eventType,
                'frequency' => 1,
                'last_occurrence' => date('Y-m-d H:i:s'),
                'context' => $eventData
            ];
            
            // 既存パターンチェック
            $patternKey = md5($eventType . serialize($eventData));
            
            if (isset($integrationData['detected_patterns'][$patternKey])) {
                $integrationData['detected_patterns'][$patternKey]['frequency']++;
                $integrationData['detected_patterns'][$patternKey]['last_occurrence'] = date('Y-m-d H:i:s');
            } else {
                $integrationData['detected_patterns'][$patternKey] = $pattern;
            }
            
            file_put_contents($integrationLogPath, json_encode($integrationData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
    }
    
    /**
     * 統合統計データ取得
     */
    public function getIntegrationStatistics() {
        $integrationLogPath = $this->dataDir . '/claude_integration.json';
        $statsPath = $this->dataDir . '/code_generation_stats.json';
        
        $statistics = [
            'integration_status' => 'active',
            'total_operations' => 0,
            'today_operations' => 0,
            'pattern_count' => 0,
            'quality_average' => 0,
            'phase_progression_rate' => 0,
            'hook_implementation_count' => 0
        ];
        
        // 統合ログ分析
        if (file_exists($integrationLogPath)) {
            $integrationData = json_decode(file_get_contents($integrationLogPath), true);
            
            $statistics['total_operations'] = count($integrationData['claude_operations'] ?? []);
            $statistics['pattern_count'] = count($integrationData['detected_patterns'] ?? []);
            
            // 今日の操作数
            $today = date('Y-m-d');
            $todayOps = array_filter($integrationData['claude_operations'] ?? [], function($op) use ($today) {
                return strpos($op['timestamp'], $today) === 0;
            });
            $statistics['today_operations'] = count($todayOps);
        }
        
        // コード生成統計分析
        if (file_exists($statsPath)) {
            $codeStats = json_decode(file_get_contents($statsPath), true);
            
            // 品質平均計算（簡易実装）
            $statistics['quality_average'] = 75; // デモ値
        }
        
        return $statistics;
    }
    
    /**
     * 統合システム設定更新
     */
    public function updateIntegrationSettings($newSettings) {
        $this->integrationSettings = array_merge($this->integrationSettings, $newSettings);
        
        // 設定保存
        $settingsPath = $this->dataDir . '/integration_settings.json';
        file_put_contents($settingsPath, json_encode($this->integrationSettings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        $this->addIntegrationLog('SETTINGS_UPDATED', $newSettings);
        
        return true;
    }
}

// グローバル統合ブリッジインスタンス
$GLOBALS['caids_claude_bridge'] = null;

/**
 * Claude連動ブリッジ取得
 */
function getCAIDSClaudeBridge() {
    if ($GLOBALS['caids_claude_bridge'] === null) {
        $GLOBALS['caids_claude_bridge'] = new CAIDSClaudeIntegrationBridge();
    }
    
    return $GLOBALS['caids_claude_bridge'];
}

/**
 * Claude操作検出（グローバル関数）
 */
function detectClaudeOperation($operationType, $details = []) {
    $bridge = getCAIDSClaudeBridge();
    return $bridge->detectClaudeOperation($operationType, $details);
}

/**
 * リアルタイム更新トリガー（グローバル関数）
 */
function triggerCAIDSUpdate($eventType, $eventData = []) {
    $bridge = getCAIDSClaudeBridge();
    return $bridge->triggerRealTimeUpdate($eventType, $eventData);
}

// 自動初期化（session開始時）
if (session_status() === PHP_SESSION_ACTIVE) {
    getCAIDSClaudeBridge();
}

?>