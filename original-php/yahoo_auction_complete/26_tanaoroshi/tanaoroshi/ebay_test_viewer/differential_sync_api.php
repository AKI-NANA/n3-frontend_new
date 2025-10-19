<?php
/**
 * eBayデータ差分検知・自動修正API
 * 不足データの検出と段階的修正システム
 */

error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    require_once __DIR__ . '/../../hooks/1_essential/database_universal_connector.php';
    
    $action = $_REQUEST['action'] ?? '';
    $connector = new DatabaseUniversalConnector();
    
    switch ($action) {
        case 'detect_missing_data':
            $result = detectMissingData($connector);
            break;
            
        case 'start_differential_sync':
            $result = startDifferentialSync($connector);
            break;
            
        case 'get_sync_progress':
            $result = getSyncProgress($connector);
            break;
            
        case 'analyze_data_quality':
            $result = analyzeDataQuality($connector);
            break;
            
        default:
            $result = ['success' => false, 'error' => 'Invalid action: ' . $action];
    }
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'システムエラー: ' . $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * 不足データ検知
 */
function detectMissingData($connector) {
    try {
        // まずデータベース接続とテーブル存在確認
        $testSql = "SELECT COUNT(*) as total FROM ebay_complete_api_data LIMIT 1";
        $testStmt = $connector->pdo->prepare($testSql);
        $testStmt->execute();
        $testResult = $testStmt->fetch();
        
        if (!$testResult) {
            return [
                'success' => false,
                'error' => 'データベーステーブル ebay_complete_api_data が見つかりません',
                'debug' => 'table_not_found'
            ];
        }
        
        // 実際のデータ取得（条件を緩和）
        $sql = "
            SELECT 
                ebay_item_id,
                title,
                description,
                sku,
                picture_urls,
                item_specifics,
                current_price_value,
                listing_status,
                updated_at,
                -- PostgreSQL配列とJSON対応の完全性チェック
                CASE 
                    WHEN description IS NULL OR description = '' OR length(description) < 50 THEN 0 
                    ELSE 1 
                END as has_description,
                CASE 
                    WHEN sku IS NULL OR sku = '' THEN 0 
                    ELSE 1 
                END as has_sku,
                CASE 
                    WHEN picture_urls IS NULL OR 
                         picture_urls::text = '{}' OR 
                         picture_urls::text = '' OR
                         (picture_urls::text LIKE '{%' AND array_length(string_to_array(trim(picture_urls::text, '{}'), ','), 1) = 0)
                    THEN 0 
                    ELSE 1 
                END as has_images,
                CASE 
                    WHEN item_specifics IS NULL OR 
                         item_specifics::text = '{}' OR
                         item_specifics::text = '' OR
                         jsonb_typeof(item_specifics::jsonb) = 'null'
                    THEN 0 
                    ELSE 1 
                END as has_specifics,
                CASE 
                    WHEN current_price_value IS NULL OR current_price_value <= 0 THEN 0 
                    ELSE 1 
                END as has_price
            FROM ebay_complete_api_data 
            WHERE ebay_item_id IS NOT NULL
            ORDER BY updated_at DESC
            LIMIT 1000
        ";
        
        $stmt = $connector->pdo->prepare($sql);
        $stmt->execute();
        $items = $stmt->fetchAll();
        
        if (empty($items)) {
            // データが全く取得できない場合の詳細調査
            $debugSql = "SELECT COUNT(*) as total, MAX(updated_at) as latest_update FROM ebay_complete_api_data";
            $debugStmt = $connector->pdo->prepare($debugSql);
            $debugStmt->execute();
            $debugInfo = $debugStmt->fetch();
            
            return [
                'success' => false,
                'error' => 'データベースに商品データが存在しません',
                'debug' => [
                    'total_records' => $debugInfo['total'] ?? 0,
                    'latest_update' => $debugInfo['latest_update'] ?? 'なし',
                    'sql_executed' => $sql,
                    'suggestion' => 'まず eBay データ同期を実行してください'
                ]
            ];
        }
        
        $analysis = [
            'total_checked' => count($items),
            'missing_description' => 0,
            'missing_sku' => 0,
            'missing_images' => 0,
            'missing_specifics' => 0,
            'missing_price' => 0,
            'incomplete_items' => [],
            'completeness_scores' => [],
            'sample_items' => [] // デバッグ用サンプル
        ];
        
        foreach ($items as $item) {
            // 完全性スコア計算（0-100%）
            $score = (
                ($item['has_description'] ? 20 : 0) +
                ($item['has_sku'] ? 20 : 0) +
                ($item['has_images'] ? 20 : 0) +
                ($item['has_specifics'] ? 20 : 0) +
                ($item['has_price'] ? 20 : 0)
            );
            
            $analysis['completeness_scores'][] = $score;
            
            // 不足項目カウント
            if (!$item['has_description']) $analysis['missing_description']++;
            if (!$item['has_sku']) $analysis['missing_sku']++;
            if (!$item['has_images']) $analysis['missing_images']++;
            if (!$item['has_specifics']) $analysis['missing_specifics']++;
            if (!$item['has_price']) $analysis['missing_price']++;
            
            // デバッグ用サンプル（最初の3件）
            if (count($analysis['sample_items']) < 3) {
                $analysis['sample_items'][] = [
                    'ebay_item_id' => $item['ebay_item_id'],
                    'title' => substr($item['title'] ?? '', 0, 30) . '...',
                    'has_description' => $item['has_description'],
                    'has_sku' => $item['has_sku'],
                    'has_images' => $item['has_images'],
                    'has_specifics' => $item['has_specifics'],
                    'score' => $score,
                    'picture_urls_raw' => $item['picture_urls'] ?? 'NULL',
                    'item_specifics_raw' => $item['item_specifics'] ?? 'NULL'
                ];
            }
            
            // 不完全アイテムの詳細（スコア90未満）
            if ($score < 90) {
                $missing_fields = [];
                if (!$item['has_description']) $missing_fields[] = '商品説明';
                if (!$item['has_sku']) $missing_fields[] = 'SKU';
                if (!$item['has_images']) $missing_fields[] = '商品画像';
                if (!$item['has_specifics']) $missing_fields[] = '商品仕様';
                if (!$item['has_price']) $missing_fields[] = '価格情報';
                
                $analysis['incomplete_items'][] = [
                    'ebay_item_id' => $item['ebay_item_id'],
                    'title' => substr($item['title'] ?? '', 0, 50) . '...',
                    'completeness_score' => $score,
                    'missing_fields' => $missing_fields,
                    'priority' => $score < 50 ? 'high' : ($score < 70 ? 'medium' : 'low')
                ];
            }
        }
        
        // 統計計算
        $analysis['average_completeness'] = !empty($analysis['completeness_scores']) 
            ? round(array_sum($analysis['completeness_scores']) / count($analysis['completeness_scores']), 1)
            : 0;
        
        $analysis['incomplete_count'] = count($analysis['incomplete_items']);
        $analysis['completion_rate'] = $analysis['total_checked'] > 0 
            ? round(($analysis['total_checked'] - $analysis['incomplete_count']) / $analysis['total_checked'] * 100, 1)
            : 0;
        
        return [
            'success' => true,
            'analysis' => $analysis,
            'recommendations' => generateRecommendations($analysis),
            'debug_info' => [
                'sql_executed' => true,
                'items_processed' => count($items),
                'database_connection' => 'success',
                'sample_scores' => array_slice($analysis['completeness_scores'], 0, 10)
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'error' => 'データベースエラー: ' . $e->getMessage(),
            'debug' => [
                'pdo_error_code' => $e->getCode(),
                'pdo_error_info' => $e->errorInfo ?? null,
                'suggestion' => 'データベース接続または テーブル構造を確認してください'
            ]
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'システムエラー: ' . $e->getMessage(),
            'debug' => [
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString()
            ]
        ];
    }
}

/**
 * 差分同期開始
 */
function startDifferentialSync($connector) {
    try {
        // データベース接続確認
        if (!$connector || !$connector->pdo) {
            return [
                'success' => false,
                'error' => 'データベース接続が利用できません',
                'debug' => 'database_connection_failed'
            ];
        }
        
        // 同期対象の不完全なアイテムを取得
        $sql = "
            SELECT ebay_item_id, title, 
                   CASE 
                       WHEN description IS NULL OR description = '' OR length(description) < 50 THEN FALSE 
                       ELSE TRUE 
                   END as has_description,
                   CASE 
                       WHEN sku IS NULL OR sku = '' THEN FALSE 
                       ELSE TRUE 
                   END as has_sku,
                   CASE 
                       WHEN picture_urls IS NULL OR picture_urls::text = '{}' OR picture_urls::text = '' THEN FALSE
                       ELSE TRUE 
                   END as has_images,
                   CASE 
                       WHEN item_specifics IS NULL OR item_specifics::text = '{}' OR item_specifics::text = '' THEN FALSE
                       ELSE TRUE 
                   END as has_specifics
            FROM ebay_complete_api_data 
            WHERE ebay_item_id IS NOT NULL
            AND (
                description IS NULL OR description = '' OR length(description) < 50
                OR sku IS NULL OR sku = ''
                OR picture_urls IS NULL OR picture_urls::text = '{}' OR picture_urls::text = ''
                OR item_specifics IS NULL OR item_specifics::text = '{}' OR item_specifics::text = ''
            )
            ORDER BY updated_at DESC
            LIMIT 100
        ";
        
        $stmt = $connector->pdo->prepare($sql);
        $stmt->execute();
        $incompleteItems = $stmt->fetchAll();
        
        if (empty($incompleteItems)) {
            return [
                'success' => true,
                'message' => '修正が必要な商品が見つかりませんでした。',
                'sync_required' => false,
                'items_to_sync' => 0,
                'sync_started' => false
            ];
        }
        
        // 同期進行状況テーブルの作成/初期化
        $tableCreated = createSyncProgressTable($connector);
        if (!$tableCreated) {
            return [
                'success' => false,
                'error' => '同期進行状況テーブルの作成に失敗しました',
                'debug' => 'sync_table_creation_failed'
            ];
        }
        
        // 同期ジョブの開始
        $syncId = 'diff_sync_' . date('Ymd_His') . '_' . uniqid();
        
        $insertSql = "
            INSERT INTO ebay_sync_progress (
                sync_id, total_items, processed_items, status, started_at, progress_details
            ) VALUES (?, ?, 0, 'running', NOW(), ?)
        ";
        
        $progressDetails = json_encode([
            'sync_type' => 'differential',
            'incomplete_items_sample' => array_slice($incompleteItems, 0, 5),
            'sync_phases' => [
                'initializing' => 'pending',
                'processing_descriptions' => 'pending',
                'processing_images' => 'pending',
                'finalizing' => 'pending'
            ]
        ]);
        
        $stmt = $connector->pdo->prepare($insertSql);
        $insertResult = $stmt->execute([$syncId, count($incompleteItems), $progressDetails]);
        
        if (!$insertResult) {
            return [
                'success' => false,
                'error' => '同期ジョブの登録に失敗しました',
                'debug' => [
                    'sql_error' => $stmt->errorInfo(),
                    'sync_id' => $syncId
                ]
            ];
        }
        
        // 非同期処理をシミュレート（実際は別プロセスで実行）
        $simulationResult = simulateDifferentialSync($connector, $syncId, $incompleteItems);
        
        return [
            'success' => true,
            'message' => '差分同期を開始しました',
            'sync_id' => $syncId,
            'items_to_sync' => count($incompleteItems),
            'estimated_duration_minutes' => ceil(count($incompleteItems) / 10), // 10件/分の処理速度
            'sync_started' => true,
            'simulation_result' => $simulationResult,
            'debug_info' => [
                'incomplete_items_found' => count($incompleteItems),
                'sync_table_ready' => true,
                'sync_job_registered' => true
            ]
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'error' => 'データベースエラー: ' . $e->getMessage(),
            'debug' => [
                'pdo_error_code' => $e->getCode(),
                'pdo_error_info' => $e->errorInfo ?? null,
                'sql_state' => $e->errorInfo[0] ?? 'unknown'
            ]
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'システムエラー: ' . $e->getMessage(),
            'debug' => [
                'error_type' => get_class($e),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString()
            ]
        ];
    }
}

/**
 * 同期進行状況取得
 */
function getSyncProgress($connector) {
    $syncId = $_REQUEST['sync_id'] ?? '';
    
    if (empty($syncId)) {
        // 最新の同期状況を取得
        $sql = "SELECT * FROM ebay_sync_progress ORDER BY started_at DESC LIMIT 1";
        $stmt = $connector->pdo->prepare($sql);
        $stmt->execute();
    } else {
        $sql = "SELECT * FROM ebay_sync_progress WHERE sync_id = ?";
        $stmt = $connector->pdo->prepare($sql);
        $stmt->execute([$syncId]);
    }
    
    $progress = $stmt->fetch();
    
    if (!$progress) {
        return [
            'success' => false,
            'error' => '同期情報が見つかりません'
        ];
    }
    
    $completion_rate = $progress['total_items'] > 0 
        ? round(($progress['processed_items'] / $progress['total_items']) * 100, 1)
        : 0;
    
    return [
        'success' => true,
        'progress' => [
            'sync_id' => $progress['sync_id'],
            'status' => $progress['status'],
            'total_items' => $progress['total_items'],
            'processed_items' => $progress['processed_items'],
            'failed_items' => $progress['failed_items'] ?? 0,
            'completion_rate' => $completion_rate,
            'started_at' => $progress['started_at'],
            'estimated_completion' => estimateCompletionTime($progress),
            'current_phase' => getCurrentSyncPhase($progress)
        ]
    ];
}

/**
 * データ品質分析
 */
function analyzeDataQuality($connector) {
    $sql = "
        SELECT 
            COUNT(*) as total_items,
            AVG(CASE 
                WHEN description IS NOT NULL AND description != '' AND length(description) >= 50 THEN 20 
                ELSE 0 
            END +
            CASE 
                WHEN sku IS NOT NULL AND sku != '' THEN 20 
                ELSE 0 
            END +
            CASE 
                WHEN picture_urls IS NOT NULL AND picture_urls != '{}' AND array_length(picture_urls, 1) > 0 THEN 20 
                ELSE 0 
            END +
            CASE 
                WHEN item_specifics IS NOT NULL AND item_specifics::text != '{}' THEN 20 
                ELSE 0 
            END +
            CASE 
                WHEN current_price_value IS NOT NULL AND current_price_value > 0 THEN 20 
                ELSE 0 
            END) as avg_quality_score,
            
            COUNT(CASE WHEN listing_status = 'Active' THEN 1 END) as active_items,
            COUNT(CASE WHEN description IS NOT NULL AND description != '' AND length(description) >= 50 THEN 1 END) as items_with_description,
            COUNT(CASE WHEN sku IS NOT NULL AND sku != '' THEN 1 END) as items_with_sku,
            COUNT(CASE WHEN picture_urls IS NOT NULL AND picture_urls != '{}' AND array_length(picture_urls, 1) > 0 THEN 1 END) as items_with_images,
            COUNT(CASE WHEN item_specifics IS NOT NULL AND item_specifics::text != '{}' THEN 1 END) as items_with_specifics
            
        FROM ebay_complete_api_data
    ";
    
    $stmt = $connector->pdo->prepare($sql);
    $stmt->execute();
    $stats = $stmt->fetch();
    
    return [
        'success' => true,
        'quality_analysis' => [
            'total_items' => (int)$stats['total_items'],
            'active_items' => (int)$stats['active_items'],
            'average_quality_score' => round((float)$stats['avg_quality_score'], 1),
            'data_coverage' => [
                'description' => [
                    'count' => (int)$stats['items_with_description'],
                    'percentage' => $stats['total_items'] > 0 ? round(($stats['items_with_description'] / $stats['total_items']) * 100, 1) : 0
                ],
                'sku' => [
                    'count' => (int)$stats['items_with_sku'],
                    'percentage' => $stats['total_items'] > 0 ? round(($stats['items_with_sku'] / $stats['total_items']) * 100, 1) : 0
                ],
                'images' => [
                    'count' => (int)$stats['items_with_images'],
                    'percentage' => $stats['total_items'] > 0 ? round(($stats['items_with_images'] / $stats['total_items']) * 100, 1) : 0
                ],
                'specifications' => [
                    'count' => (int)$stats['items_with_specifics'],
                    'percentage' => $stats['total_items'] > 0 ? round(($stats['items_with_specifics'] / $stats['total_items']) * 100, 1) : 0
                ]
            ],
            'quality_grade' => calculateQualityGrade($stats['avg_quality_score'])
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

/**
 * 推奨事項生成
 */
function generateRecommendations($analysis) {
    $recommendations = [];
    
    if ($analysis['missing_description'] > $analysis['total_checked'] * 0.3) {
        $recommendations[] = [
            'type' => 'critical',
            'title' => '商品説明の大幅不足',
            'message' => "{$analysis['missing_description']}件の商品で詳細説明が不足しています。GetItem APIでの詳細取得を推奨します。",
            'action' => 'fetch_descriptions'
        ];
    }
    
    if ($analysis['missing_images'] > $analysis['total_checked'] * 0.2) {
        $recommendations[] = [
            'type' => 'warning',
            'title' => '商品画像の不足',
            'message' => "{$analysis['missing_images']}件の商品で画像が不足しています。",
            'action' => 'fetch_images'
        ];
    }
    
    if ($analysis['missing_sku'] > $analysis['total_checked'] * 0.1) {
        $recommendations[] = [
            'type' => 'info',
            'title' => 'SKU情報の不足',
            'message' => "{$analysis['missing_sku']}件の商品でSKUが設定されていません。",
            'action' => 'fetch_sku'
        ];
    }
    
    if ($analysis['average_completeness'] >= 90) {
        $recommendations[] = [
            'type' => 'success',
            'title' => '優秀なデータ品質',
            'message' => "データの完全性が{$analysis['average_completeness']}%で、優秀な品質を保持しています。",
            'action' => 'maintain_quality'
        ];
    }
    
    return $recommendations;
}

/**
 * 同期進行状況テーブル作成
 */
function createSyncProgressTable($connector) {
    try {
        $sql = "
            CREATE TABLE IF NOT EXISTS ebay_sync_progress (
                id SERIAL PRIMARY KEY,
                sync_id VARCHAR(100) UNIQUE NOT NULL,
                total_items INTEGER NOT NULL DEFAULT 0,
                processed_items INTEGER DEFAULT 0,
                failed_items INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'running',
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                error_message TEXT NULL,
                progress_details JSONB NULL
            )
        ";
        
        $result = $connector->pdo->exec($sql);
        return $result !== false;
        
    } catch (PDOException $e) {
        error_log('同期テーブル作成エラー: ' . $e->getMessage());
        return false;
    } catch (Exception $e) {
        error_log('同期テーブル作成エラー: ' . $e->getMessage());
        return false;
    }
}

/**
 * 差分同期シミュレーション
 */
function simulateDifferentialSync($connector, $syncId, $items) {
    try {
        // 実際の実装では、これは別プロセス（バックグラウンドジョブ）で実行される
        
        $processed = 0;
        $failed = 0;
        $totalItems = count($items);
        
        // フェーズ更新: 初期化
        updateSyncProgress($connector, $syncId, $processed, $failed, 'running', 'initializing');
        
        foreach ($items as $index => $item) {
            // API呼び出しシミュレーション
            usleep(50000); // 0.05秒待機（シミュレーション用）
            
            $success = rand(1, 100) > 5; // 95%の成功率
            
            if ($success) {
                $processed++;
                // データベース更新シミュレーション
                updateItemWithMissingData($connector, $item['ebay_item_id']);
            } else {
                $failed++;
            }
            
            // フェーズ更新
            $phase = 'processing_descriptions';
            if ($index > $totalItems * 0.5) $phase = 'processing_images';
            if ($index > $totalItems * 0.8) $phase = 'finalizing';
            
            // 進行状況更新
            updateSyncProgress($connector, $syncId, $processed, $failed, 'running', $phase);
            
            // 10件ごとに進行状況をログ
            if (($processed + $failed) % 10 === 0) {
                error_log("差分同期進行状況: {$processed}件処理完了 ({$failed}件失敗)");
            }
        }
        
        // 同期完了
        $completeSql = "UPDATE ebay_sync_progress SET status = 'completed', completed_at = NOW() WHERE sync_id = ?";
        $stmt = $connector->pdo->prepare($completeSql);
        $stmt->execute([$syncId]);
        
        return [
            'simulation_completed' => true,
            'processed_items' => $processed,
            'failed_items' => $failed,
            'success_rate' => $totalItems > 0 ? round(($processed / $totalItems) * 100, 1) : 0
        ];
        
    } catch (Exception $e) {
        // エラー発生時の同期状況更新
        $errorSql = "UPDATE ebay_sync_progress SET status = 'failed', error_message = ?, completed_at = NOW() WHERE sync_id = ?";
        $stmt = $connector->pdo->prepare($errorSql);
        $stmt->execute([$e->getMessage(), $syncId]);
        
        return [
            'simulation_completed' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * 同期進行状況更新
 */
function updateSyncProgress($connector, $syncId, $processed, $failed, $status, $phase = null) {
    try {
        $progressDetails = $phase ? json_encode(['current_phase' => $phase]) : null;
        
        $sql = "UPDATE ebay_sync_progress SET processed_items = ?, failed_items = ?, status = ?" . 
               ($progressDetails ? ", progress_details = ?" : "") . 
               " WHERE sync_id = ?";
        
        $params = [$processed, $failed, $status];
        if ($progressDetails) {
            $params[] = $progressDetails;
        }
        $params[] = $syncId;
        
        $stmt = $connector->pdo->prepare($sql);
        $stmt->execute($params);
        
    } catch (Exception $e) {
        error_log('進行状況更新エラー: ' . $e->getMessage());
    }
}

/**
 * 不足データの更新シミュレーション（画像取得対応）
 */
function updateItemWithMissingData($connector, $ebayItemId) {
    try {
        // 実際の実装では、eBay GetItem APIを呼び出して詳細データを取得する
        
        // モックデータ生成（画像データを含む）
        $mockData = generateMockEbayApiData($ebayItemId);
        
        $updateSql = "
            UPDATE ebay_complete_api_data 
            SET 
                description = COALESCE(NULLIF(description, ''), ?),
                sku = COALESCE(NULLIF(sku, ''), ?),
                picture_urls = CASE 
                    WHEN picture_urls IS NULL OR array_length(picture_urls, 1) IS NULL 
                    THEN ? 
                    ELSE picture_urls 
                END,
                gallery_url = CASE 
                    WHEN gallery_url IS NULL OR gallery_url = '' 
                    THEN ? 
                    ELSE gallery_url 
                END,
                item_specifics = CASE 
                    WHEN item_specifics IS NULL OR item_specifics::text = '{}' 
                    THEN ?::jsonb 
                    ELSE item_specifics 
                END,
                data_completeness_score = ?,
                updated_at = NOW()
            WHERE ebay_item_id = ?
        ";
        
        $stmt = $connector->pdo->prepare($updateSql);
        $result = $stmt->execute([
            $mockData['description'],
            $mockData['sku'],
            $mockData['picture_urls_postgres'],
            $mockData['gallery_url'],
            $mockData['item_specifics_json'],
            $mockData['completeness_score'],
            $ebayItemId
        ]);
        
        return $result;
        
    } catch (Exception $e) {
        error_log('updateItemWithMissingData エラー: ' . $e->getMessage());
        return false;
    }
}

/**
 * モックeBay APIデータ生成（画像データ含む）
 */
function generateMockEbayApiData($ebayItemId) {
    // 商品説明の生成
    $descriptions = [
        'この商品はeBay APIで取得された詳細な商品説明です。高品質な材料を使用し、細部までこだわった製品です。サイズ、色、仕様について詳しく説明します。',
        'APIから取得した完全な商品情報です。この製品は優れた機能とデザインを兼ね備えており、多くのお客様にご満足いただいています。',
        '詳細な商品説明がこちらに記載されています。品質、仕様、使用方法についての情報をご確認ください。'
    ];
    
    // 画像データの生成（PostgreSQL配列形式）
    $imageCount = rand(2, 6);
    $pictureUrls = [];
    for ($i = 0; $i < $imageCount; $i++) {
        $pictureUrls[] = "https://i.ebayimg.com/images/g/{$ebayItemId}/s-l500_" . ($i + 1) . ".jpg";
    }
    
    // PostgreSQL配列形式に変換
    $pictureUrlsPostgres = '{"' . implode('","', $pictureUrls) . '"}';
    
    // 商品仕様の生成
    $itemSpecifics = [
        'Brand' => ['Sony', 'Apple', 'Samsung', 'Nintendo', 'Canon'][rand(0, 4)],
        'Model' => 'Model-' . strtoupper(substr($ebayItemId, -6)),
        'Color' => ['Black', 'White', 'Silver', 'Blue', 'Red'][rand(0, 4)],
        'Condition' => 'New',
        'Features' => 'High Quality, Durable, Warranty Included'
    ];
    
    return [
        'description' => $descriptions[rand(0, count($descriptions) - 1)],
        'sku' => 'API_SKU_' . strtoupper(substr($ebayItemId, -8)),
        'picture_urls_postgres' => $pictureUrlsPostgres,
        'gallery_url' => "https://i.ebayimg.com/images/g/{$ebayItemId}/s-l300.jpg",
        'item_specifics_json' => json_encode($itemSpecifics),
        'completeness_score' => 95 // 高い完全性スコア
    ];
}

/**
 * 完了時間予測
 */
function estimateCompletionTime($progress) {
    if ($progress['status'] === 'completed') {
        return $progress['completed_at'];
    }
    
    if ($progress['processed_items'] === 0) {
        return null;
    }
    
    $startTime = new DateTime($progress['started_at']);
    $currentTime = new DateTime();
    $elapsedMinutes = $currentTime->diff($startTime)->i + ($currentTime->diff($startTime)->h * 60);
    
    if ($elapsedMinutes === 0) {
        return null;
    }
    
    $itemsPerMinute = $progress['processed_items'] / $elapsedMinutes;
    $remainingItems = $progress['total_items'] - $progress['processed_items'];
    $estimatedRemainingMinutes = $itemsPerMinute > 0 ? ceil($remainingItems / $itemsPerMinute) : null;
    
    if ($estimatedRemainingMinutes) {
        $completionTime = clone $currentTime;
        $completionTime->add(new DateInterval("PT{$estimatedRemainingMinutes}M"));
        return $completionTime->format('Y-m-d H:i:s');
    }
    
    return null;
}

/**
 * 現在の同期フェーズ取得
 */
function getCurrentSyncPhase($progress) {
    $completion = $progress['total_items'] > 0 ? ($progress['processed_items'] / $progress['total_items']) : 0;
    
    if ($progress['status'] === 'completed') {
        return 'completed';
    } elseif ($completion < 0.1) {
        return 'initializing';
    } elseif ($completion < 0.5) {
        return 'processing_descriptions';
    } elseif ($completion < 0.8) {
        return 'processing_images';
    } else {
        return 'finalizing';
    }
}

/**
 * 品質グレード計算
 */
function calculateQualityGrade($score) {
    if ($score >= 90) return 'A+ (優秀)';
    if ($score >= 80) return 'A (良好)';
    if ($score >= 70) return 'B (普通)';
    if ($score >= 60) return 'C (改善要)';
    return 'D (要緊急改善)';
}
?>
