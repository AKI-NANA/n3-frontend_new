<?php
/**
 * 📝 記帳管理モジュール Ajax処理
 * ファイル: modules/kicho/ajax_handler.php
 * 
 * ✅ MFクラウド連携
 * ✅ CSV取り込み・処理
 * ✅ AI学習・ルール生成
 * ✅ 取引承認・管理
 * ✅ 自動仕訳機能
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    http_response_code(403);
    exit('Direct access forbidden');
}

// セッション確保
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// =====================================
// 🛡️ セキュリティ・初期設定
// =====================================

// CSRFトークン確認
function validateCSRFToken() {
    $token = $_POST['csrf_token'] ?? $_GET['csrf_token'] ?? '';
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    
    return !empty($token) && hash_equals($_SESSION['csrf_token'], $token);
}

// 入力サニタイズ
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

// 日付検証
function validateDate($date, $format = 'Y-m-d') {
    $d = DateTime::createFromFormat($format, $date);
    return $d && $d->format($format) === $date;
}

// =====================================
// 📁 データファイル管理
// =====================================

function getDataDir() {
    $dataDir = __DIR__ . '/../../data/kicho';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    return $dataDir;
}

function getTransactionsFile() {
    return getDataDir() . '/transactions.json';
}

function getRulesFile() {
    return getDataDir() . '/rules.json';
}

function getStatisticsFile() {
    return getDataDir() . '/statistics.json';
}

function loadTransactions() {
    $file = getTransactionsFile();
    if (!file_exists($file)) {
        return [];
    }
    
    $content = file_get_contents($file);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function saveTransactions($transactions) {
    $file = getTransactionsFile();
    $dataDir = dirname($file);
    
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    
    $json = json_encode($transactions, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($file, $json) !== false;
}

function loadRules() {
    $file = getRulesFile();
    if (!file_exists($file)) {
        return [];
    }
    
    $content = file_get_contents($file);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function saveRules($rules) {
    $file = getRulesFile();
    $json = json_encode($rules, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($file, $json) !== false;
}

// =====================================
// 🎯 メインAjax処理振り分け
// =====================================

try {
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    // CSRF確認（GET以外）
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && !validateCSRFToken()) {
        throw new Exception('CSRF token validation failed');
    }
    
    $response = handleKichoAction($action);
    
    return $response;
    
} catch (Exception $e) {
    error_log("記帳Ajax処理エラー: " . $e->getMessage());
    
    return [
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => defined('DEBUG_MODE') && DEBUG_MODE ? [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ] : null
    ];
}

// =====================================
// 📝 記帳管理アクション処理
// =====================================

function handleKichoAction($action) {
    switch ($action) {
        // === MFクラウド連携 ===
        case 'mf_import':
            return handleMFImport();
        case 'mf_export':
        case 'send_to_mf':
        case 'export_to_mf':
            return handleMFExport();
        case 'mf_status':
            return handleMFStatus();
        case 'mf_sync':
            return handleMFSync();
        
        // === CSV処理 ===
        case 'csv_upload':
            return handleCSVUpload();
        case 'csv_export':
            return handleCSVExport();
        case 'csv_template':
            return handleCSVTemplate();
        case 'validate_csv':
            return handleValidateCSV();
        
        // === AI学習・ルール ===
        case 'ai_learn':
        case 'text_learning':
            return handleAILearning();
        case 'create_rule':
            return handleCreateRule();
        case 'update_rule':
            return handleUpdateRule();
        case 'delete_rule':
            return handleDeleteRule();
        case 'get_rules':
            return handleGetRules();
        case 'apply_rules':
            return handleApplyRules();
        
        // === 取引管理 ===
        case 'get_transactions':
            return handleGetTransactions();
        case 'approve_transaction':
            return handleApproveTransaction();
        case 'approve_all_transactions':
        case 'batch_approve':
            return handleBatchApprove();
        case 'reject_transaction':
            return handleRejectTransaction();
        case 'update_transaction':
            return handleUpdateTransaction();
        case 'delete_transaction':
            return handleDeleteTransaction();
        
        // === 統計・レポート ===
        case 'get_stats':
        case 'get_statistics':
            return handleGetStatistics();
        case 'update_data':
            return handleUpdateData();
        case 'generate_report':
            return handleGenerateReport();
        case 'health_check':
            return handleHealthCheck();
        
        // === 勘定科目管理 ===
        case 'get_accounts':
            return handleGetAccounts();
        case 'create_account':
            return handleCreateAccount();
        case 'update_account':
            return handleUpdateAccount();
        case 'delete_account':
            return handleDeleteAccount();
        
        default:
            throw new Exception("未知のアクション: {$action}");
    }
}

// =====================================
// 💰 MFクラウド連携機能
// =====================================

/**
 * MFクラウドデータ取り込み
 */
function handleMFImport() {
    try {
        $startDate = $_POST['start_date'] ?? '';
        $endDate = $_POST['end_date'] ?? '';
        $purpose = $_POST['purpose'] ?? 'accounting';
        $autoLearn = isset($_POST['auto_learn']) && $_POST['auto_learn'] === '1';
        
        // 日付検証
        if (empty($startDate) || empty($endDate)) {
            throw new Exception('開始日と終了日を指定してください');
        }
        
        if (!validateDate($startDate) || !validateDate($endDate)) {
            throw new Exception('日付の形式が正しくありません');
        }
        
        if (strtotime($startDate) > strtotime($endDate)) {
            throw new Exception('開始日は終了日より前である必要があります');
        }
        
        // 期間計算
        $daysDiff = (strtotime($endDate) - strtotime($startDate)) / (60 * 60 * 24);
        if ($daysDiff > 365) {
            throw new Exception('取り込み期間は1年以内にしてください');
        }
        
        // 実際の実装では MF APIを呼び出し
        // デモモードでは擬似データ生成
        $importedTransactions = generateMFDemoData($startDate, $endDate, $purpose);
        $importedCount = count($importedTransactions);
        
        // 既存取引データに追加
        $transactions = loadTransactions();
        $newTransactionIds = [];
        
        foreach ($importedTransactions as $transaction) {
            $transaction['id'] = generateUniqueId();
            $transaction['source'] = 'mf_import';
            $transaction['imported_at'] = date('Y-m-d H:i:s');
            $transaction['status'] = 'pending';
            
            $transactions[] = $transaction;
            $newTransactionIds[] = $transaction['id'];
        }
        
        saveTransactions($transactions);
        
        // 自動学習実行
        if ($autoLearn && $importedCount > 0) {
            $learningResult = performAutoLearning($importedTransactions);
        }
        
        // 統計更新
        updateStatistics([
            'mf_imports' => $importedCount,
            'last_import' => date('Y-m-d H:i:s')
        ]);
        
        return [
            'success' => true,
            'message' => "MFクラウドから{$importedCount}件のデータを取り込みました",
            'data' => [
                'imported_count' => $importedCount,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'purpose' => $purpose,
                'auto_learn_enabled' => $autoLearn,
                'new_transaction_ids' => $newTransactionIds,
                'learning_result' => $learningResult ?? null
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("MF取り込みエラー: " . $e->getMessage());
    }
}

/**
 * MFクラウドへエクスポート
 */
function handleMFExport() {
    try {
        $transactionIds = $_POST['transaction_ids'] ?? [];
        $exportType = $_POST['export_type'] ?? 'approved_only';
        $dateFrom = $_POST['date_from'] ?? '';
        $dateTo = $_POST['date_to'] ?? '';
        
        $transactions = loadTransactions();
        $exportTransactions = [];
        
        // エクスポート対象フィルタリング
        foreach ($transactions as $transaction) {
            $shouldExport = false;
            
            if (!empty($transactionIds)) {
                $shouldExport = in_array($transaction['id'], $transactionIds);
            } elseif ($exportType === 'approved_only') {
                $shouldExport = $transaction['status'] === 'approved';
            } elseif ($exportType === 'date_range') {
                $transactionDate = $transaction['transaction_date'];
                $shouldExport = (!empty($dateFrom) ? $transactionDate >= $dateFrom : true) &&
                               (!empty($dateTo) ? $transactionDate <= $dateTo : true);
            }
            
            if ($shouldExport) {
                $exportTransactions[] = $transaction;
            }
        }
        
        if (empty($exportTransactions)) {
            throw new Exception('エクスポート対象の取引がありません');
        }
        
        // 実際の実装では MF API に送信
        // デモモードでは擬似処理
        $exportedCount = count($exportTransactions);
        $exportId = 'EXP_' . date('YmdHis') . '_' . rand(1000, 9999);
        
        // エクスポート履歴記録
        foreach ($exportTransactions as &$transaction) {
            $transaction['exported_to_mf'] = true;
            $transaction['export_id'] = $exportId;
            $transaction['exported_at'] = date('Y-m-d H:i:s');
        }
        
        saveTransactions($transactions);
        
        // 統計更新
        updateStatistics([
            'mf_exports' => $exportedCount,
            'last_export' => date('Y-m-d H:i:s')
        ]);
        
        return [
            'success' => true,
            'message' => "MFクラウドに{$exportedCount}件のデータを送信しました",
            'data' => [
                'exported_count' => $exportedCount,
                'export_id' => $exportId,
                'export_type' => $exportType,
                'export_time' => date('Y-m-d H:i:s')
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("MFエクスポートエラー: " . $e->getMessage());
    }
}

/**
 * MF接続状態確認
 */
function handleMFStatus() {
    try {
        // 実際の実装では MF API の接続状態を確認
        // デモモードでは擬似状態
        $status = [
            'connected' => true,
            'last_sync' => date('Y-m-d H:i:s', strtotime('-1 hour')),
            'api_health' => 'good',
            'rate_limit_remaining' => rand(80, 100),
            'account_info' => [
                'company_name' => 'デモ会社',
                'subscription_type' => 'premium',
                'expires_at' => date('Y-m-d', strtotime('+30 days'))
            ]
        ];
        
        return [
            'success' => true,
            'data' => $status
        ];
        
    } catch (Exception $e) {
        throw new Exception("MF状態確認エラー: " . $e->getMessage());
    }
}

// =====================================
// 📄 CSV処理機能
// =====================================

/**
 * CSVアップロード処理
 */
function handleCSVUpload() {
    try {
        if (!isset($_FILES['csv_file'])) {
            throw new Exception('CSVファイルが選択されていません');
        }
        
        $file = $_FILES['csv_file'];
        $autoLearn = isset($_POST['auto_learn']) && $_POST['auto_learn'] === '1';
        $encoding = $_POST['encoding'] ?? 'UTF-8';
        $delimiter = $_POST['delimiter'] ?? ',';
        
        // ファイル検証
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('ファイルアップロードエラー: ' . getUploadErrorMessage($file['error']));
        }
        
        if ($file['size'] > 10 * 1024 * 1024) { // 10MB制限
            throw new Exception('ファイルサイズが大きすぎます（10MB以下にしてください）');
        }
        
        $allowedTypes = ['text/csv', 'application/csv', 'text/plain'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $allowedTypes) && !preg_match('/\.csv$/i', $file['name'])) {
            throw new Exception('CSVファイルのみアップロード可能です');
        }
        
        // CSVファイル解析
        $csvData = parseCSVFile($file['tmp_name'], $encoding, $delimiter);
        
        if (empty($csvData)) {
            throw new Exception('CSVファイルが空か、読み込みに失敗しました');
        }
        
        // データ変換・検証
        $transactions = convertCSVToTransactions($csvData);
        $validTransactions = [];
        $errorRows = [];
        
        foreach ($transactions as $index => $transaction) {
            $validation = validateTransaction($transaction);
            if ($validation['valid']) {
                $transaction['id'] = generateUniqueId();
                $transaction['source'] = 'csv_upload';
                $transaction['uploaded_at'] = date('Y-m-d H:i:s');
                $transaction['status'] = 'pending';
                $transaction['original_row'] = $index + 2; // ヘッダー行を考慮
                
                $validTransactions[] = $transaction;
            } else {
                $errorRows[] = [
                    'row' => $index + 2,
                    'errors' => $validation['errors'],
                    'data' => $transaction
                ];
            }
        }
        
        if (empty($validTransactions)) {
            throw new Exception('有効な取引データがありません');
        }
        
        // 既存データに追加
        $existingTransactions = loadTransactions();
        $allTransactions = array_merge($existingTransactions, $validTransactions);
        saveTransactions($allTransactions);
        
        // 自動学習実行
        $learningResult = null;
        if ($autoLearn && count($validTransactions) > 0) {
            $learningResult = performAutoLearning($validTransactions);
        }
        
        // 統計更新
        updateStatistics([
            'csv_uploads' => count($validTransactions),
            'last_csv_upload' => date('Y-m-d H:i:s')
        ]);
        
        return [
            'success' => true,
            'message' => "CSVから" . count($validTransactions) . "件のデータを処理しました",
            'data' => [
                'processed_count' => count($validTransactions),
                'error_count' => count($errorRows),
                'filename' => $file['name'],
                'auto_learn_enabled' => $autoLearn,
                'learning_result' => $learningResult,
                'error_rows' => $errorRows
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("CSVアップロードエラー: " . $e->getMessage());
    }
}

/**
 * CSVエクスポート
 */
function handleCSVExport() {
    try {
        $format = $_POST['format'] ?? 'standard';
        $dateFrom = $_POST['date_from'] ?? '';
        $dateTo = $_POST['date_to'] ?? '';
        $status = $_POST['status'] ?? '';
        
        $transactions = loadTransactions();
        $exportData = [];
        
        // フィルタリング
        foreach ($transactions as $transaction) {
            $include = true;
            
            if (!empty($dateFrom) && $transaction['transaction_date'] < $dateFrom) {
                $include = false;
            }
            if (!empty($dateTo) && $transaction['transaction_date'] > $dateTo) {
                $include = false;
            }
            if (!empty($status) && $transaction['status'] !== $status) {
                $include = false;
            }
            
            if ($include) {
                $exportData[] = $transaction;
            }
        }
        
        if (empty($exportData)) {
            throw new Exception('エクスポート対象のデータがありません');
        }
        
        // CSV形式に変換
        $csvContent = generateCSVContent($exportData, $format);
        $filename = 'transactions_' . date('Y-m-d_H-i-s') . '.csv';
        
        // CSVファイル保存（一時的）
        $tempFile = sys_get_temp_dir() . '/' . $filename;
        file_put_contents($tempFile, $csvContent);
        
        return [
            'success' => true,
            'message' => count($exportData) . '件の取引をCSVエクスポートしました',
            'data' => [
                'filename' => $filename,
                'record_count' => count($exportData),
                'download_url' => '/download.php?file=' . urlencode($filename),
                'file_size' => strlen($csvContent)
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("CSVエクスポートエラー: " . $e->getMessage());
    }
}

// =====================================
// 🤖 AI学習・ルール機能
// =====================================

/**
 * AI学習実行
 */
function handleAILearning() {
    try {
        $learningText = trim($_POST['learning_text'] ?? '');
        $learningType = $_POST['learning_type'] ?? 'manual';
        $autoApply = isset($_POST['auto_apply']) && $_POST['auto_apply'] === '1';
        
        if (empty($learningText)) {
            throw new Exception('学習テキストを入力してください');
        }
        
        if (strlen($learningText) < 10) {
            throw new Exception('学習テキストは10文字以上入力してください');
        }
        
        // テキスト解析・ルール生成
        $analysisResult = analyzeTextForRules($learningText, $learningType);
        $generatedRules = $analysisResult['rules'];
        $confidence = $analysisResult['confidence'];
        
        if (empty($generatedRules)) {
            throw new Exception('学習テキストからルールを生成できませんでした');
        }
        
        // 既存ルールとの重複チェック
        $existingRules = loadRules();
        $newRules = [];
        $duplicateCount = 0;
        
        foreach ($generatedRules as $rule) {
            $isDuplicate = false;
            foreach ($existingRules as $existingRule) {
                if (isSimilarRule($rule, $existingRule)) {
                    $isDuplicate = true;
                    break;
                }
            }
            
            if (!$isDuplicate) {
                $rule['id'] = generateUniqueId();
                $rule['created_at'] = date('Y-m-d H:i:s');
                $rule['created_by'] = 'ai_learning';
                $rule['learning_type'] = $learningType;
                $rule['confidence'] = $confidence;
                $rule['status'] = $autoApply ? 'active' : 'pending';
                $rule['auto_generated'] = true;
                
                $newRules[] = $rule;
            } else {
                $duplicateCount++;
            }
        }
        
        // 新規ルール保存
        if (!empty($newRules)) {
            $allRules = array_merge($existingRules, $newRules);
            saveRules($allRules);
        }
        
        // 統計更新
        updateStatistics([
            'ai_learning_sessions' => 1,
            'rules_generated' => count($newRules),
            'last_ai_learning' => date('Y-m-d H:i:s')
        ]);
        
        return [
            'success' => true,
            'message' => "AI学習完了: " . count($newRules) . "件のルールを生成しました",
            'data' => [
                'rules_generated' => count($newRules),
                'duplicate_rules' => $duplicateCount,
                'learning_type' => $learningType,
                'text_length' => strlen($learningText),
                'confidence' => $confidence,
                'auto_applied' => $autoApply,
                'new_rules' => $newRules
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("AI学習エラー: " . $e->getMessage());
    }
}

/**
 * ルール作成
 */
function handleCreateRule() {
    try {
        $requiredFields = ['rule_name', 'keyword', 'debit_account'];
        
        foreach ($requiredFields as $field) {
            if (empty($_POST[$field])) {
                throw new Exception("必須項目が入力されていません: {$field}");
            }
        }
        
        $rules = loadRules();
        
        // 重複チェック
        foreach ($rules as $existingRule) {
            if ($existingRule['rule_name'] === $_POST['rule_name']) {
                throw new Exception('同じ名前のルールが既に存在します');
            }
        }
        
        $newRule = [
            'id' => generateUniqueId(),
            'rule_name' => sanitizeInput($_POST['rule_name']),
            'keyword' => sanitizeInput($_POST['keyword']),
            'keyword_type' => sanitizeInput($_POST['keyword_type'] ?? 'contains'),
            'debit_account' => sanitizeInput($_POST['debit_account']),
            'credit_account' => sanitizeInput($_POST['credit_account'] ?? ''),
            'amount_condition' => sanitizeInput($_POST['amount_condition'] ?? ''),
            'priority' => intval($_POST['priority'] ?? 50),
            'status' => sanitizeInput($_POST['status'] ?? 'active'),
            'auto_apply' => isset($_POST['auto_apply']) && $_POST['auto_apply'] === '1',
            'description' => sanitizeInput($_POST['description'] ?? ''),
            'tags' => explode(',', sanitizeInput($_POST['tags'] ?? '')),
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
            'created_by' => $_SESSION['user_id'] ?? 'system',
            'auto_generated' => false,
            'usage_count' => 0,
            'success_rate' => 0
        ];
        
        $rules[] = $newRule;
        
        // 優先度順でソート
        usort($rules, function($a, $b) {
            return $b['priority'] - $a['priority'];
        });
        
        if (!saveRules($rules)) {
            throw new Exception('ルールの保存に失敗しました');
        }
        
        return [
            'success' => true,
            'message' => "ルール「{$newRule['rule_name']}」を作成しました",
            'data' => $newRule
        ];
        
    } catch (Exception $e) {
        throw new Exception("ルール作成エラー: " . $e->getMessage());
    }
}

/**
 * ルール更新
 */
function handleUpdateRule() {
    try {
        $ruleId = $_POST['rule_id'] ?? '';
        if (empty($ruleId)) {
            throw new Exception('ルールIDが指定されていません');
        }
        
        $rules = loadRules();
        $ruleIndex = findRuleIndex($rules, $ruleId);
        
        if ($ruleIndex === false) {
            throw new Exception('指定されたルールが見つかりません');
        }
        
        // 更新可能フィールド
        $updateableFields = [
            'rule_name', 'keyword', 'keyword_type', 'debit_account', 'credit_account',
            'amount_condition', 'priority', 'status', 'auto_apply', 'description', 'tags'
        ];
        
        foreach ($updateableFields as $field) {
            if (isset($_POST[$field])) {
                if ($field === 'tags') {
                    $rules[$ruleIndex][$field] = explode(',', sanitizeInput($_POST[$field]));
                } elseif ($field === 'priority') {
                    $rules[$ruleIndex][$field] = intval($_POST[$field]);
                } elseif ($field === 'auto_apply') {
                    $rules[$ruleIndex][$field] = $_POST[$field] === '1';
                } else {
                    $rules[$ruleIndex][$field] = sanitizeInput($_POST[$field]);
                }
            }
        }
        
        $rules[$ruleIndex]['updated_at'] = date('Y-m-d H:i:s');
        
        // 優先度順でソート
        usort($rules, function($a, $b) {
            return $b['priority'] - $a['priority'];
        });
        
        if (!saveRules($rules)) {
            throw new Exception('ルールの更新に失敗しました');
        }
        
        return [
            'success' => true,
            'message' => 'ルールを更新しました'
        ];
        
    } catch (Exception $e) {
        throw new Exception("ルール更新エラー: " . $e->getMessage());
    }
}

/**
 * ルール削除
 */
function handleDeleteRule() {
    try {
        $ruleId = $_POST['rule_id'] ?? '';
        if (empty($ruleId)) {
            throw new Exception('ルールIDが指定されていません');
        }
        
        $rules = loadRules();
        $ruleIndex = findRuleIndex($rules, $ruleId);
        
        if ($ruleIndex === false) {
            throw new Exception('指定されたルールが見つかりません');
        }
        
        $deletedRule = $rules[$ruleIndex];
        unset($rules[$ruleIndex]);
        $rules = array_values($rules); // インデックス再構成
        
        if (!saveRules($rules)) {
            throw new Exception('ルールの削除に失敗しました');
        }
        
        return [
            'success' => true,
            'message' => 'ルールを削除しました',
            'data' => [
                'deleted_rule_name' => $deletedRule['rule_name'],
                'remaining_count' => count($rules)
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("ルール削除エラー: " . $e->getMessage());
    }
}

/**
 * ルール一覧取得
 */
function handleGetRules() {
    try {
        $rules = loadRules();
        $status = $_GET['status'] ?? '';
        $search = $_GET['search'] ?? '';
        
        // フィルタリング
        if (!empty($status) || !empty($search)) {
            $rules = array_filter($rules, function($rule) use ($status, $search) {
                $matchStatus = empty($status) || $rule['status'] === $status;
                $matchSearch = empty($search) || 
                              stripos($rule['rule_name'], $search) !== false ||
                              stripos($rule['keyword'], $search) !== false;
                
                return $matchStatus && $matchSearch;
            });
        }
        
        return [
            'success' => true,
            'data' => array_values($rules),
            'count' => count($rules)
        ];
        
    } catch (Exception $e) {
        throw new Exception("ルール取得エラー: " . $e->getMessage());
    }
}

// =====================================
// 💼 取引管理機能
// =====================================

/**
 * 取引一覧取得
 */
function handleGetTransactions() {
    try {
        $transactions = loadTransactions();
        $page = intval($_GET['page'] ?? 1);
        $pageSize = intval($_GET['page_size'] ?? 25);
        $status = $_GET['status'] ?? '';
        $dateFrom = $_GET['date_from'] ?? '';
        $dateTo = $_GET['date_to'] ?? '';
        $search = $_GET['search'] ?? '';
        
        // フィルタリング
        $filteredTransactions = array_filter($transactions, function($transaction) use ($status, $dateFrom, $dateTo, $search) {
            $matchStatus = empty($status) || $transaction['status'] === $status;
            $matchDateFrom = empty($dateFrom) || $transaction['transaction_date'] >= $dateFrom;
            $matchDateTo = empty($dateTo) || $transaction['transaction_date'] <= $dateTo;
            $matchSearch = empty($search) || 
                          stripos($transaction['description'], $search) !== false ||
                          stripos($transaction['debit_account'], $search) !== false ||
                          stripos($transaction['credit_account'], $search) !== false;
            
            return $matchStatus && $matchDateFrom && $matchDateTo && $matchSearch;
        });
        
        // 日付順でソート（新しい順）
        usort($filteredTransactions, function($a, $b) {
            return strtotime($b['transaction_date']) - strtotime($a['transaction_date']);
        });
        
        // ページネーション
        $totalItems = count($filteredTransactions);
        $totalPages = ceil($totalItems / $pageSize);
        $offset = ($page - 1) * $pageSize;
        $pagedTransactions = array_slice($filteredTransactions, $offset, $pageSize);
        
        return [
            'success' => true,
            'data' => [
                'transactions' => array_values($pagedTransactions),
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_items' => $totalItems,
                    'page_size' => $pageSize
                ]
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("取引取得エラー: " . $e->getMessage());
    }
}

/**
 * 取引承認
 */
function handleApproveTransaction() {
    try {
        $transactionId = $_POST['transaction_id'] ?? '';
        if (empty($transactionId)) {
            throw new Exception('取引IDが指定されていません');
        }
        
        $transactions = loadTransactions();
        $transactionIndex = findTransactionIndex($transactions, $transactionId);
        
        if ($transactionIndex === false) {
            throw new Exception('指定された取引が見つかりません');
        }
        
        if ($transactions[$transactionIndex]['status'] === 'approved') {
            throw new Exception('この取引は既に承認済みです');
        }
        
        $transactions[$transactionIndex]['status'] = 'approved';
        $transactions[$transactionIndex]['approved_at'] = date('Y-m-d H:i:s');
        $transactions[$transactionIndex]['approved_by'] = $_SESSION['user_id'] ?? 'system';
        
        if (!saveTransactions($transactions)) {
            throw new Exception('取引の承認に失敗しました');
        }
        
        // 統計更新
        updateStatistics([
            'approved_transactions' => 1,
            'last_approval' => date('Y-m-d H:i:s')
        ]);
        
        return [
            'success' => true,
            'message' => '取引を承認しました',
            'data' => [
                'transaction_id' => $transactionId,
                'approved_at' => $transactions[$transactionIndex]['approved_at']
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("取引承認エラー: " . $e->getMessage());
    }
}

/**
 * 一括承認
 */
function handleBatchApprove() {
    try {
        $transactionIds = $_POST['transaction_ids'] ?? [];
        $approveAll = isset($_POST['approve_all']) && $_POST['approve_all'] === '1';
        
        $transactions = loadTransactions();
        $approvedCount = 0;
        $errors = [];
        
        foreach ($transactions as &$transaction) {
            $shouldApprove = false;
            
            if ($approveAll && $transaction['status'] === 'pending') {
                $shouldApprove = true;
            } elseif (!empty($transactionIds) && in_array($transaction['id'], $transactionIds)) {
                $shouldApprove = true;
            }
            
            if ($shouldApprove) {
                if ($transaction['status'] !== 'approved') {
                    $transaction['status'] = 'approved';
                    $transaction['approved_at'] = date('Y-m-d H:i:s');
                    $transaction['approved_by'] = $_SESSION['user_id'] ?? 'system';
                    $approvedCount++;
                } else {
                    $errors[] = "取引ID {$transaction['id']} は既に承認済みです";
                }
            }
        }
        
        if ($approvedCount === 0) {
            throw new Exception('承認対象の取引がありません');
        }
        
        if (!saveTransactions($transactions)) {
            throw new Exception('一括承認の保存に失敗しました');
        }
        
        // 統計更新
        updateStatistics([
            'approved_transactions' => $approvedCount,
            'last_batch_approval' => date('Y-m-d H:i:s')
        ]);
        
        return [
            'success' => true,
            'message' => "{$approvedCount}件の取引を一括承認しました",
            'data' => [
                'approved_count' => $approvedCount,
                'errors' => $errors
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("一括承認エラー: " . $e->getMessage());
    }
}

/**
 * 取引却下
 */
function handleRejectTransaction() {
    try {
        $transactionId = $_POST['transaction_id'] ?? '';
        $reason = sanitizeInput($_POST['reason'] ?? '');
        
        if (empty($transactionId)) {
            throw new Exception('取引IDが指定されていません');
        }
        
        $transactions = loadTransactions();
        $transactionIndex = findTransactionIndex($transactions, $transactionId);
        
        if ($transactionIndex === false) {
            throw new Exception('指定された取引が見つかりません');
        }
        
        $transactions[$transactionIndex]['status'] = 'rejected';
        $transactions[$transactionIndex]['rejected_at'] = date('Y-m-d H:i:s');
        $transactions[$transactionIndex]['rejected_by'] = $_SESSION['user_id'] ?? 'system';
        $transactions[$transactionIndex]['rejection_reason'] = $reason;
        
        if (!saveTransactions($transactions)) {
            throw new Exception('取引の却下に失敗しました');
        }
        
        return [
            'success' => true,
            'message' => '取引を却下しました',
            'data' => [
                'transaction_id' => $transactionId,
                'rejected_at' => $transactions[$transactionIndex]['rejected_at'],
                'reason' => $reason
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("取引却下エラー: " . $e->getMessage());
    }
}

// =====================================
// 📊 統計・レポート機能
// =====================================

/**
 * 統計情報取得
 */
function handleGetStatistics() {
    try {
        $transactions = loadTransactions();
        $rules = loadRules();
        
        $stats = [
            'transactions' => [
                'total' => count($transactions),
                'pending' => count(array_filter($transactions, fn($t) => $t['status'] === 'pending')),
                'approved' => count(array_filter($transactions, fn($t) => $t['status'] === 'approved')),
                'rejected' => count(array_filter($transactions, fn($t) => $t['status'] === 'rejected'))
            ],
            'rules' => [
                'total' => count($rules),
                'active' => count(array_filter($rules, fn($r) => $r['status'] === 'active')),
                'auto_generated' => count(array_filter($rules, fn($r) => $r['auto_generated'] ?? false))
            ],
            'automation' => [
                'rate' => calculateAutomationRate($transactions),
                'rule_usage' => calculateRuleUsageStats($rules),
                'processing_time' => calculateAverageProcessingTime($transactions)
            ],
            'recent_activity' => getRecentActivity($transactions, 10),
            'monthly_summary' => getMonthlyTransactionSummary($transactions)
        ];
        
        return [
            'success' => true,
            'data' => $stats
        ];
        
    } catch (Exception $e) {
        throw new Exception("統計取得エラー: " . $e->getMessage());
    }
}

/**
 * データ更新
 */
function handleUpdateData() {
    try {
        // 統計再計算
        $transactions = loadTransactions();
        $rules = loadRules();
        
        // ルール使用統計更新
        foreach ($rules as &$rule) {
            $usageCount = 0;
            $successCount = 0;
            
            foreach ($transactions as $transaction) {
                if (isset($transaction['applied_rule_id']) && $transaction['applied_rule_id'] === $rule['id']) {
                    $usageCount++;
                    if ($transaction['status'] === 'approved') {
                        $successCount++;
                    }
                }
            }
            
            $rule['usage_count'] = $usageCount;
            $rule['success_rate'] = $usageCount > 0 ? round(($successCount / $usageCount) * 100, 2) : 0;
        }
        
        saveRules($rules);
        
        // 全体統計更新
        $overallStats = [
            'total_transactions' => count($transactions),
            'total_rules' => count($rules),
            'automation_rate' => calculateAutomationRate($transactions),
            'last_data_update' => date('Y-m-d H:i:s')
        ];
        
        updateStatistics($overallStats);
        
        return [
            'success' => true,
            'message' => 'データを更新しました',
            'data' => [
                'updated_at' => date('Y-m-d H:i:s'),
                'statistics_updated' => true,
                'rule_stats_updated' => true,
                'processed_transactions' => count($transactions),
                'processed_rules' => count($rules)
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("データ更新エラー: " . $e->getMessage());
    }
}

/**
 * ヘルスチェック
 */
function handleHealthCheck() {
    try {
        $checks = [
            'data_directory' => is_dir(getDataDir()) && is_writable(getDataDir()),
            'transactions_file' => !file_exists(getTransactionsFile()) || is_readable(getTransactionsFile()),
            'rules_file' => !file_exists(getRulesFile()) || is_readable(getRulesFile()),
            'upload_directory' => is_dir(sys_get_temp_dir()) && is_writable(sys_get_temp_dir()),
            'session_active' => session_status() === PHP_SESSION_ACTIVE,
            'file_upload_enabled' => ini_get('file_uploads') == 1,
            'max_upload_size' => ini_get('upload_max_filesize'),
            'memory_limit' => ini_get('memory_limit')
        ];
        
        $allHealthy = array_reduce($checks, function($carry, $check) {
            return $carry && ($check === true || is_string($check));
        }, true);
        
        return [
            'success' => true,
            'data' => [
                'status' => $allHealthy ? 'healthy' : 'warning',
                'checks' => $checks,
                'timestamp' => date('Y-m-d H:i:s'),
                'memory_usage' => memory_get_usage(true),
                'peak_memory' => memory_get_peak_usage(true)
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("ヘルスチェックエラー: " . $e->getMessage());
    }
}

// =====================================
// 🛠️ ユーティリティ関数
// =====================================

/**
 * ユニークID生成
 */
function generateUniqueId() {
    return date('YmdHis') . '_' . bin2hex(random_bytes(4));
}

/**
 * ルールインデックス検索
 */
function findRuleIndex($rules, $ruleId) {
    foreach ($rules as $index => $rule) {
        if ($rule['id'] === $ruleId) {
            return $index;
        }
    }
    return false;
}

/**
 * 取引インデックス検索
 */
function findTransactionIndex($transactions, $transactionId) {
    foreach ($transactions as $index => $transaction) {
        if ($transaction['id'] === $transactionId) {
            return $index;
        }
    }
    return false;
}

/**
 * 統計情報更新
 */
function updateStatistics($newStats) {
    $statsFile = getStatisticsFile();
    $currentStats = [];
    
    if (file_exists($statsFile)) {
        $content = file_get_contents($statsFile);
        $currentStats = json_decode($content, true) ?: [];
    }
    
    $currentStats = array_merge($currentStats, $newStats);
    $currentStats['last_updated'] = date('Y-m-d H:i:s');
    
    $json = json_encode($currentStats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    file_put_contents($statsFile, $json);
}

/**
 * アップロードエラーメッセージ取得
 */
function getUploadErrorMessage($errorCode) {
    $errors = [
        UPLOAD_ERR_OK => 'エラーなし',
        UPLOAD_ERR_INI_SIZE => 'php.iniの upload_max_filesize を超過',
        UPLOAD_ERR_FORM_SIZE => 'HTMLフォームの MAX_FILE_SIZE を超過',
        UPLOAD_ERR_PARTIAL => 'ファイルが一部のみアップロード',
        UPLOAD_ERR_NO_FILE => 'ファイルがアップロードされていません',
        UPLOAD_ERR_NO_TMP_DIR => '一時ディレクトリがありません',
        UPLOAD_ERR_CANT_WRITE => 'ディスクへの書き込みに失敗',
        UPLOAD_ERR_EXTENSION => 'PHPエクステンションがアップロードを停止'
    ];
    
    return $errors[$errorCode] ?? '不明なエラー';
}

/**
 * CSV解析
 */
function parseCSVFile($filePath, $encoding = 'UTF-8', $delimiter = ',') {
    $data = [];
    
    if (($handle = fopen($filePath, 'r')) !== false) {
        $header = null;
        $rowIndex = 0;
        
        while (($row = fgetcsv($handle, 1000, $delimiter)) !== false) {
            if ($encoding !== 'UTF-8') {
                $row = array_map(function($value) use ($encoding) {
                    return mb_convert_encoding($value, 'UTF-8', $encoding);
                }, $row);
            }
            
            if ($rowIndex === 0) {
                $header = $row;
            } else {
                if (count($row) === count($header)) {
                    $data[] = array_combine($header, $row);
                }
            }
            $rowIndex++;
        }
        
        fclose($handle);
    }
    
    return $data;
}

/**
 * CSV→取引データ変換
 */
function convertCSVToTransactions($csvData) {
    $transactions = [];
    
    foreach ($csvData as $row) {
        $transaction = [
            'transaction_date' => formatDate($row['日付'] ?? $row['date'] ?? ''),
            'description' => sanitizeInput($row['摘要'] ?? $row['description'] ?? ''),
            'amount' => floatval(str_replace(['¥', ','], '', $row['金額'] ?? $row['amount'] ?? '0')),
            'debit_account' => sanitizeInput($row['借方科目'] ?? $row['debit'] ?? ''),
            'credit_account' => sanitizeInput($row['貸方科目'] ?? $row['credit'] ?? ''),
            'memo' => sanitizeInput($row['メモ'] ?? $row['memo'] ?? ''),
            'reference' => sanitizeInput($row['参照'] ?? $row['reference'] ?? '')
        ];
        
        $transactions[] = $transaction;
    }
    
    return $transactions;
}

/**
 * 取引データ検証
 */
function validateTransaction($transaction) {
    $errors = [];
    
    if (empty($transaction['transaction_date']) || !validateDate($transaction['transaction_date'])) {
        $errors[] = '取引日付が無効です';
    }
    
    if (empty($transaction['description'])) {
        $errors[] = '摘要が入力されていません';
    }
    
    if (!is_numeric($transaction['amount']) || $transaction['amount'] <= 0) {
        $errors[] = '金額が無効です';
    }
    
    if (empty($transaction['debit_account'])) {
        $errors[] = '借方科目が入力されていません';
    }
    
    return [
        'valid' => empty($errors),
        'errors' => $errors
    ];
}

/**
 * 自動学習実行
 */
function performAutoLearning($transactions) {
    $learningResults = [
        'analyzed_transactions' => count($transactions),
        'patterns_found' => 0,
        'rules_suggested' => 0,
        'confidence_average' => 0
    ];
    
    // 実際の実装では機械学習アルゴリズムを使用
    // デモモードでは簡易パターン認識
    $patterns = [];
    
    foreach ($transactions as $transaction) {
        $description = $transaction['description'];
        $debitAccount = $transaction['debit_account'];
        
        // キーワードパターン抽出
        $keywords = extractKeywords($description);
        
        foreach ($keywords as $keyword) {
            if (!isset($patterns[$keyword])) {
                $patterns[$keyword] = [
                    'keyword' => $keyword,
                    'debit_accounts' => [],
                    'count' => 0
                ];
            }
            
            if (!in_array($debitAccount, $patterns[$keyword]['debit_accounts'])) {
                $patterns[$keyword]['debit_accounts'][] = $debitAccount;
            }
            
            $patterns[$keyword]['count']++;
        }
    }
    
    // 有効なパターンから推奨ルール生成
    $suggestedRules = [];
    foreach ($patterns as $pattern) {
        if ($pattern['count'] >= 2 && count($pattern['debit_accounts']) === 1) {
            $suggestedRules[] = [
                'rule_name' => $pattern['keyword'] . '自動分類',
                'keyword' => $pattern['keyword'],
                'debit_account' => $pattern['debit_accounts'][0],
                'confidence' => min(90, $pattern['count'] * 20)
            ];
        }
    }
    
    $learningResults['patterns_found'] = count($patterns);
    $learningResults['rules_suggested'] = count($suggestedRules);
    $learningResults['confidence_average'] = !empty($suggestedRules) ? 
        array_sum(array_column($suggestedRules, 'confidence')) / count($suggestedRules) : 0;
    
    return $learningResults;
}

/**
 * キーワード抽出
 */
function extractKeywords($text) {
    // 簡易キーワード抽出
    $text = mb_strtolower($text);
    $stopWords = ['の', 'に', 'を', 'は', 'が', 'で', 'から', 'まで', 'と', 'や'];
    
    $words = preg_split('/[\s\p{P}]+/u', $text);
    $keywords = [];
    
    foreach ($words as $word) {
        $word = trim($word);
        if (mb_strlen($word) >= 2 && !in_array($word, $stopWords)) {
            $keywords[] = $word;
        }
    }
    
    return array_unique($keywords);
}

/**
 * 日付フォーマット
 */
function formatDate($dateString) {
    if (empty($dateString)) {
        return '';
    }
    
    // 様々な日付形式に対応
    $formats = ['Y-m-d', 'Y/m/d', 'm/d/Y', 'd/m/Y', 'Y-m-d H:i:s'];
    
    foreach ($formats as $format) {
        $date = DateTime::createFromFormat($format, $dateString);
        if ($date !== false) {
            return $date->format('Y-m-d');
        }
    }
    
    return '';
}

/**
 * MFデモデータ生成
 */
function generateMFDemoData($startDate, $endDate, $purpose) {
    $transactions = [];
    $days = (strtotime($endDate) - strtotime($startDate)) / (60 * 60 * 24);
    $count = min(50, max(5, intval($days * 0.5)));
    
    $sampleTransactions = [
        ['description' => 'Amazon決済', 'debit_account' => '消耗品費', 'amount' => 2500],
        ['description' => '電気料金', 'debit_account' => '水道光熱費', 'amount' => 8500],
        ['description' => '売上入金', 'debit_account' => '普通預金', 'amount' => 125000],
        ['description' => 'オフィス賃料', 'debit_account' => '地代家賃', 'amount' => 80000],
        ['description' => '交通費精算', 'debit_account' => '旅費交通費', 'amount' => 1200],
        ['description' => '通信費', 'debit_account' => '通信費', 'amount' => 12000]
    ];
    
    for ($i = 0; $i < $count; $i++) {
        $sample = $sampleTransactions[array_rand($sampleTransactions)];
        $randomDate = date('Y-m-d', strtotime($startDate) + rand(0, $days * 24 * 60 * 60));
        
        $transactions[] = [
            'transaction_date' => $randomDate,
            'description' => $sample['description'],
            'amount' => $sample['amount'] + rand(-500, 500),
            'debit_account' => $sample['debit_account'],
            'credit_account' => '普通預金',
            'memo' => 'MFクラウドから取り込み',
            'reference' => 'MF-' . date('Ymd') . '-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT)
        ];
    }
    
    return $transactions;
}

/**
 * 自動化率計算
 */
function calculateAutomationRate($transactions) {
    if (empty($transactions)) {
        return 0;
    }
    
    $autoProcessed = count(array_filter($transactions, function($t) {
        return isset($t['applied_rule_id']) && !empty($t['applied_rule_id']);
    }));
    
    return round(($autoProcessed / count($transactions)) * 100, 1);
}

/**
 * 最近のアクティビティ取得
 */
function getRecentActivity($transactions, $limit = 10) {
    $recentTransactions = array_slice($transactions, -$limit);
    
    return array_map(function($transaction) {
        return [
            'id' => $transaction['id'],
            'date' => $transaction['transaction_date'],
            'description' => $transaction['description'],
            'amount' => $transaction['amount'],
            'status' => $transaction['status'],
            'created_at' => $transaction['created_at'] ?? null
        ];
    }, $recentTransactions);
}

/**
 * 月次取引サマリー取得
 */
function getMonthlyTransactionSummary($transactions) {
    $summary = [];
    
    foreach ($transactions as $transaction) {
        $month = date('Y-m', strtotime($transaction['transaction_date']));
        
        if (!isset($summary[$month])) {
            $summary[$month] = [
                'month' => $month,
                'count' => 0,
                'total_amount' => 0,
                'approved_count' => 0
            ];
        }
        
        $summary[$month]['count']++;
        $summary[$month]['total_amount'] += $transaction['amount'];
        
        if ($transaction['status'] === 'approved') {
            $summary[$month]['approved_count']++;
        }
    }
    
    return array_values($summary);
}

?>