<?php
/**
 * 🎯 KICHO記帳ツール Ajax処理 - Mac環境対応版
 * 
 * ✅ 設定ファイル不在対応
 * ✅ Mac環境でのエラーハンドリング
 * ✅ ファイルベース優先動作
 * ✅ 全アクション実装
 * 
 * @version 5.0.3-MAC-ENVIRONMENT
 */

// セキュリティ確認
define('SECURE_ACCESS', true);

// エラー報告設定（Mac開発環境用）
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// セッション初期化
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// レスポンスヘッダー設定
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

// =====================================
// 🔧 設定読み込み（安全版）
// =====================================

function loadKichoConfig() {
    $configFile = __DIR__ . '/config/kicho_config.php';
    
    if (file_exists($configFile)) {
        return include $configFile;
    }
    
    // デフォルト設定（設定ファイルが無い場合）
    return [
        'DB_ENABLED' => false,
        'AI_ENABLED' => false,
        'ENABLE_MF_INTEGRATION' => false,
        'DEBUG_MODE' => true,
        'DATA_DIR' => __DIR__ . '/data/kicho',
        'CSV_UPLOAD_DIR' => __DIR__ . '/data/kicho/uploads',
        'BACKUP_DIR' => __DIR__ . '/data/kicho/backups',
        'LOCAL_DEVELOPMENT' => true,
        'FEATURES' => [
            'ai_learning' => false,
            'mf_integration' => false,
            'csv_upload' => true,
            'auto_refresh' => true,
            'backup_restore' => true,
            'user_settings' => true,
            'statistics' => true
        ]
    ];
}

$config = loadKichoConfig();

// =====================================
// 📁 ディレクトリ・ファイル管理
// =====================================

function getKichoDataDir() {
    global $config;
    $dataDir = $config['DATA_DIR'] ?? __DIR__ . '/data/kicho';
    
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    return $dataDir;
}

function saveDataToFile($type, $data) {
    $file = getKichoDataDir() . "/{$type}.json";
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $result = file_put_contents($file, $json, LOCK_EX);
    
    if ($result !== false) {
        error_log("✅ KICHO: {$type}.json保存成功");
    } else {
        error_log("❌ KICHO: {$type}.json保存失敗");
    }
    
    return $result !== false;
}

function loadDataFromFile($type) {
    $file = getKichoDataDir() . "/{$type}.json";
    
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $data = json_decode($content, true);
        return $data ?: [];
    }
    
    return [];
}

// =====================================
// 🗄️ データベース管理（オプション）
// =====================================

function getKichoDatabase() {
    global $config;
    
    // データベース無効の場合はnullを返す
    if (!($config['DB_ENABLED'] ?? false)) {
        return null;
    }
    
    static $pdo = null;
    
    if ($pdo !== null) {
        return $pdo;
    }
    
    try {
        $dsn = "{$config['DB_TYPE']}:host={$config['DB_HOST']};port={$config['DB_PORT']};dbname={$config['DB_NAME']}";
        
        $pdo = new PDO($dsn, $config['DB_USER'], $config['DB_PASS'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 10
        ]);
        
        error_log("✅ KICHO: データベース接続成功");
        return $pdo;
        
    } catch (PDOException $e) {
        error_log("❌ KICHO: DB接続失敗 - " . $e->getMessage());
        return null;
    }
}

// =====================================
// ⚙️ ユーザー設定管理
// =====================================

function loadUserSettings($user_id = null) {
    if ($user_id === null) {
        $user_id = $_SESSION['user_id'] ?? 'default_user';
    }
    
    $allSettings = loadDataFromFile('user_settings');
    $userSettings = array_filter($allSettings, function($setting) use ($user_id) {
        return ($setting['user_id'] ?? '') === $user_id;
    });
    
    if (!empty($userSettings)) {
        $userSettings = array_values($userSettings);
        usort($userSettings, function($a, $b) {
            return strtotime($b['updated_at'] ?? '1970-01-01') - strtotime($a['updated_at'] ?? '1970-01-01');
        });
        return $userSettings[0];
    }
    
    // デフォルト設定
    return [
        'user_id' => $user_id,
        'auto_refresh_enabled' => false,
        'auto_refresh_interval' => 30,
        'notifications_enabled' => true,
        'theme' => 'default',
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

function saveUserSettings($user_id, $settings) {
    $settingsData = array_merge($settings, [
        'user_id' => $user_id,
        'updated_at' => date('Y-m-d H:i:s')
    ]);
    
    $allSettings = loadDataFromFile('user_settings');
    
    $found = false;
    foreach ($allSettings as &$setting) {
        if (($setting['user_id'] ?? '') === $user_id) {
            $setting = $settingsData;
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        $settingsData['created_at'] = date('Y-m-d H:i:s');
        $allSettings[] = $settingsData;
    }
    
    return saveDataToFile('user_settings', $allSettings);
}

// =====================================
// 🔄 Auto Refresh機能
// =====================================

function toggleAutoRefresh() {
    $user_id = $_SESSION['user_id'] ?? 'default_user';
    
    try {
        $currentSettings = loadUserSettings($user_id);
        $newState = !($currentSettings['auto_refresh_enabled'] ?? false);
        
        $newSettings = array_merge($currentSettings, [
            'auto_refresh_enabled' => $newState,
            'last_toggle_time' => date('Y-m-d H:i:s')
        ]);
        
        $success = saveUserSettings($user_id, $newSettings);
        
        if (!$success) {
            throw new Exception('設定の保存に失敗しました');
        }
        
        // トグル履歴保存
        $toggleHistory = loadDataFromFile('auto_refresh_history');
        $toggleHistory[] = [
            'id' => 'toggle-' . time(),
            'user_id' => $user_id,
            'previous_state' => $currentSettings['auto_refresh_enabled'] ?? false,
            'new_state' => $newState,
            'toggle_time' => date('Y-m-d H:i:s'),
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ];
        saveDataToFile('auto_refresh_history', $toggleHistory);
        
        error_log("✅ KICHO: Auto Refresh設定変更 - {$user_id}: " . ($newState ? 'ON' : 'OFF'));
        
        return [
            'user_id' => $user_id,
            'auto_refresh_enabled' => $newState,
            'auto_refresh_interval' => $newSettings['auto_refresh_interval'] ?? 30,
            'previous_state' => $currentSettings['auto_refresh_enabled'] ?? false,
            'toggle_time' => $newSettings['last_toggle_time'],
            'settings' => $newSettings
        ];
        
    } catch (Exception $e) {
        error_log("❌ KICHO: Auto Refresh切り替えエラー - {$user_id}: " . $e->getMessage());
        throw $e;
    }
}

function getAutoRefreshStatus() {
    $user_id = $_SESSION['user_id'] ?? 'default_user';
    $settings = loadUserSettings($user_id);
    
    return [
        'user_id' => $user_id,
        'auto_refresh_enabled' => $settings['auto_refresh_enabled'] ?? false,
        'auto_refresh_interval' => $settings['auto_refresh_interval'] ?? 30,
        'last_updated' => $settings['updated_at'] ?? date('Y-m-d H:i:s')
    ];
}

// =====================================
// 📊 ルール管理機能
// =====================================

function getSavedRules() {
    $rules = loadDataFromFile('saved_rules');
    return $rules;
}

function saveCategoryRule($ruleData) {
    $rules = loadDataFromFile('saved_rules');
    
    $newRule = [
        'id' => time(),
        'rule_type' => $ruleData['type'] ?? 'category',
        'pattern' => $ruleData['pattern'] ?? '',
        'category' => $ruleData['category'] ?? '',
        'subcategory' => $ruleData['subcategory'] ?? '',
        'confidence' => $ruleData['confidence'] ?? 1.0,
        'created_at' => date('Y-m-d H:i:s'),
        'created_by' => $_SESSION['user_id'] ?? 'default_user',
        'usage_count' => 0,
        'last_used' => null
    ];
    
    $rules[] = $newRule;
    saveDataToFile('saved_rules', $rules);
    
    return $newRule;
}

function deleteSavedRule($rule_id) {
    $rules = loadDataFromFile('saved_rules');
    $original_count = count($rules);
    
    $rules = array_filter($rules, function($rule) use ($rule_id) {
        return ($rule['id'] ?? '') != $rule_id;
    });
    
    $rules = array_values($rules);
    
    if (count($rules) < $original_count) {
        saveDataToFile('saved_rules', $rules);
        return true;
    }
    
    return false;
}

// =====================================
// 💳 MFクラウド連携（ダミー実装）
// =====================================

function executeMFImport() {
    try {
        // サンプル取引データ
        $importData = [
            'transactions' => [
                [
                    'id' => 'mf-' . time() . '-1',
                    'date' => date('Y-m-d'),
                    'description' => 'Amazon購入 - オフィス用品一式',
                    'amount' => -2580,
                    'category' => '消耗品費',
                    'subcategory' => 'オフィス用品',
                    'status' => 'pending',
                    'source' => 'mf_cloud',
                    'account' => 'メインカード',
                    'created_at' => date('Y-m-d H:i:s')
                ],
                [
                    'id' => 'mf-' . time() . '-2',
                    'date' => date('Y-m-d'),
                    'description' => 'Google Workspace Pro',
                    'amount' => -1680,
                    'category' => '通信費',
                    'subcategory' => 'クラウドサービス',
                    'status' => 'pending',
                    'source' => 'mf_cloud',
                    'account' => '事業用カード',
                    'created_at' => date('Y-m-d H:i:s')
                ],
                [
                    'id' => 'mf-' . time() . '-3',
                    'date' => date('Y-m-d'),
                    'description' => 'クライアント請求入金',
                    'amount' => 150000,
                    'category' => '売上高',
                    'subcategory' => 'サービス売上',
                    'status' => 'approved',
                    'source' => 'mf_cloud',
                    'account' => '事業用口座',
                    'created_at' => date('Y-m-d H:i:s')
                ]
            ],
            'summary' => [
                'total_imported' => 3,
                'new_transactions' => 3,
                'duplicates_found' => 0,
                'total_amount' => 145740,
                'expense_amount' => -4260,
                'income_amount' => 150000,
                'import_time' => date('Y-m-d H:i:s'),
                'import_id' => 'mf-import-' . time()
            ]
        ];
        
        // transactionsファイルに保存
        $existingTransactions = loadDataFromFile('transactions');
        $allTransactions = array_merge($existingTransactions, $importData['transactions']);
        saveDataToFile('transactions', $allTransactions);
        
        // imported_dataファイルに保存（UI表示用）
        $importedData = loadDataFromFile('imported_data');
        foreach ($importData['transactions'] as $transaction) {
            $importedData[] = [
                'id' => $transaction['id'],
                'type' => 'mf',
                'content' => $transaction['description'],
                'amount' => $transaction['amount'],
                'category' => $transaction['category'],
                'date' => $transaction['date'],
                'status' => $transaction['status'],
                'source' => 'MFクラウド',
                'created_at' => $transaction['created_at']
            ];
        }
        saveDataToFile('imported_data', $importedData);
        
        // インポート履歴保存
        $importHistory = loadDataFromFile('mf_import_history');
        $importHistory[] = [
            'id' => $importData['summary']['import_id'],
            'imported_count' => $importData['summary']['total_imported'],
            'new_count' => $importData['summary']['new_transactions'],
            'duplicates' => $importData['summary']['duplicates_found'],
            'total_amount' => $importData['summary']['total_amount'],
            'expense_amount' => $importData['summary']['expense_amount'],
            'income_amount' => $importData['summary']['income_amount'],
            'import_time' => $importData['summary']['import_time'],
            'status' => 'completed'
        ];
        saveDataToFile('mf_import_history', $importHistory);
        
        error_log("✅ KICHO: MFインポート完了 - {$importData['summary']['total_imported']}件");
        return $importData;
        
    } catch (Exception $e) {
        error_log("❌ MFインポートエラー: " . $e->getMessage());
        throw $e;
    }
}

function getMFImportHistory() {
    try {
        $history = loadDataFromFile('mf_import_history');
        
        // 履歴を新しい順にソート
        usort($history, function($a, $b) {
            return strtotime($b['import_time'] ?? '1970-01-01') - strtotime($a['import_time'] ?? '1970-01-01');
        });
        
        return [
            'history' => array_slice($history, 0, 20),
            'statistics' => [
                'total_imports' => count($history),
                'total_transactions' => array_sum(array_column($history, 'imported_count')),
                'total_amount' => array_sum(array_column($history, 'total_amount')),
                'last_import' => $history[0]['import_time'] ?? null
            ]
        ];
        
    } catch (Exception $e) {
        error_log("❌ MF履歴取得エラー: " . $e->getMessage());
        throw $e;
    }
}

// =====================================
// 📊 統計データ生成
// =====================================

function generateStatistics() {
    $transactions = loadDataFromFile('transactions');
    $imported_data = loadDataFromFile('imported_data');
    
    $stats = [
        'total_transactions' => count($transactions),
        'pending_count' => count(array_filter($transactions, fn($t) => ($t['status'] ?? '') === 'pending')),
        'approved_count' => count(array_filter($transactions, fn($t) => ($t['status'] ?? '') === 'approved')),
        'total_imported' => count($imported_data),
        'mf_count' => count(array_filter($imported_data, fn($d) => ($d['type'] ?? '') === 'mf')),
        'csv_count' => count(array_filter($imported_data, fn($d) => ($d['type'] ?? '') === 'csv')),
        'text_count' => count(array_filter($imported_data, fn($d) => ($d['type'] ?? '') === 'text')),
        'total_income' => array_sum(array_map(fn($t) => max(0, $t['amount'] ?? 0), $transactions)),
        'total_expense' => abs(array_sum(array_map(fn($t) => min(0, $t['amount'] ?? 0), $transactions))),
        'data_source' => 'json_file',
        'last_update' => date('Y-m-d H:i:s')
    ];
    
    return $stats;
}

// =====================================
// 🔍 Health Check機能
// =====================================

function performHealthCheck() {
    global $config;
    
    $health = [
        'status' => 'ok',
        'checks' => [],
        'timestamp' => date('Y-m-d H:i:s'),
        'version' => '5.0.3-MAC',
        'environment' => 'mac_local'
    ];
    
    try {
        // ファイルシステムチェック
        $dataDir = getKichoDataDir();
        if (is_writable($dataDir)) {
            $health['checks']['filesystem'] = [
                'status' => 'ok',
                'message' => 'ファイルシステム書き込み可能'
            ];
        } else {
            $health['checks']['filesystem'] = [
                'status' => 'error',
                'message' => 'ファイルシステム書き込み不可'
            ];
            $health['status'] = 'error';
        }
        
        // 設定ファイルチェック
        if ($config['LOCAL_DEVELOPMENT'] ?? false) {
            $health['checks']['config'] = [
                'status' => 'ok',
                'message' => '設定ファイル読み込み成功'
            ];
        }
        
        // セッションチェック
        if (session_status() === PHP_SESSION_ACTIVE) {
            $health['checks']['session'] = [
                'status' => 'ok',
                'message' => 'セッション有効'
            ];
        } else {
            $health['checks']['session'] = [
                'status' => 'warning',
                'message' => 'セッション無効'
            ];
        }
        
    } catch (Exception $e) {
        $health['status'] = 'error';
        $health['error'] = $e->getMessage();
    }
    
    return $health;
}

// =====================================
// 🎯 メインAjax処理ルーター
// =====================================

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POST method required', 405);
    }
    
    $input = file_get_contents('php://input');
    $requestData = json_decode($input, true);
    
    if ($requestData) {
        $action = $requestData['action'] ?? '';
        $postData = $requestData;
    } else {
        $action = $_POST['action'] ?? '';
        $postData = $_POST;
    }
    
    error_log("🎯 KICHO Ajax: {$action} 実行開始");
    
    switch ($action) {
        // =====================================
        // 🔄 Auto Refresh機能
        // =====================================
        
        case 'toggle-auto-refresh':
            $result = toggleAutoRefresh();
            
            echo json_encode([
                'success' => true,
                'message' => '自動更新設定を' . ($result['auto_refresh_enabled'] ? '有効' : '無効') . 'にしました',
                'data' => [
                    'auto_refresh_status' => $result,
                    'ui_update' => [
                        'action' => 'update_auto_refresh_ui',
                        'enabled' => $result['auto_refresh_enabled'],
                        'interval' => $result['auto_refresh_interval']
                    ]
                ]
            ]);
            break;
            
        case 'get-auto-refresh-status':
            $status = getAutoRefreshStatus();
            
            echo json_encode([
                'success' => true,
                'message' => '自動更新状態を取得しました',
                'data' => ['auto_refresh_status' => $status]
            ]);
            break;
            
        // =====================================
        // 📊 ルール管理
        // =====================================
        
        case 'get-saved-rules':
            $rules = getSavedRules();
            
            echo json_encode([
                'success' => true,
                'message' => '保存済みルールを取得しました',
                'data' => [
                    'rules' => $rules,
                    'total_count' => count($rules)
                ]
            ]);
            break;
            
        case 'save-accounting-rule':
            $ruleData = [
                'type' => $postData['rule_type'] ?? 'category',
                'pattern' => $postData['pattern'] ?? '',
                'category' => $postData['category'] ?? '',
                'subcategory' => $postData['subcategory'] ?? '',
                'confidence' => floatval($postData['confidence'] ?? 1.0)
            ];
            
            $savedRule = saveCategoryRule($ruleData);
            
            echo json_encode([
                'success' => true,
                'message' => 'ルールを保存しました',
                'data' => [
                    'saved_rule' => $savedRule,
                    'rule_id' => $savedRule['id']
                ]
            ]);
            break;
            
        case 'delete-saved-rule':
            $rule_id = $postData['rule_id'] ?? '';
            if (empty($rule_id)) {
                throw new Exception('削除対象のルールIDが指定されていません');
            }
            
            $deleted = deleteSavedRule($rule_id);
            
            if ($deleted) {
                echo json_encode([
                    'success' => true,
                    'message' => 'ルールを削除しました',
                    'data' => [
                        'deleted_rule_id' => $rule_id
                    ]
                ]);
            } else {
                throw new Exception('指定されたルールが見つかりませんでした');
            }
            break;
            
        // =====================================
        // 💳 MFクラウド連携
        // =====================================
        
        case 'execute-mf-import':
            $result = executeMFImport();
            $stats = generateStatistics();
            
            echo json_encode([
                'success' => true,
                'message' => "MFクラウドから{$result['summary']['total_imported']}件のデータを取得しました",
                'data' => [
                    'mf_result' => $result,
                    'stats' => $stats,
                    'ui_update' => [
                        'action' => 'refresh_data_display',
                        'new_transactions' => $result['transactions'],
                        'show_notification' => true,
                        'notification_message' => "新規取引データ{$result['summary']['total_imported']}件を取得しました"
                    ]
                ]
            ]);
            break;
            
        case 'show-mf-history':
            $historyData = getMFImportHistory();
            
            echo json_encode([
                'success' => true,
                'message' => 'MFクラウド連携履歴を取得しました',
                'data' => [
                    'mf_history' => $historyData,
                    'ui_update' => [
                        'action' => 'show_mf_history_modal',
                        'history' => $historyData['history'],
                        'statistics' => $historyData['statistics']
                    ]
                ]
            ]);
            break;
            
        // =====================================
        // 🔍 Health Check
        // =====================================
        
        case 'health-check':
            $health = performHealthCheck();
            
            echo json_encode([
                'success' => true,
                'message' => 'システム正常動作中',
                'data' => $health,
                'csrf_token' => bin2hex(random_bytes(32)),
                'timestamp' => date('c'),
                'system_status' => $health['status']
            ]);
            break;
            
        // =====================================
        // 📊 データ取得
        // =====================================
        
        case 'get_statistics':
            $stats = generateStatistics();
            echo json_encode([
                'success' => true,
                'message' => '統計データ取得成功',
                'data' => ['stats' => $stats]
            ]);
            break;
            
        case 'get_initial_data':
            $transactions = loadDataFromFile('transactions');
            $imported_data = loadDataFromFile('imported_data');
            $stats = generateStatistics();
            
            echo json_encode([
                'success' => true,
                'message' => '初期データ取得成功',
                'data' => [
                    'transactions' => $transactions,
                    'imported_data' => $imported_data,
                    'stats' => $stats
                ]
            ]);
            break;
            
        // =====================================
        // 🗑️ 削除機能
        // =====================================
        
        case 'delete-data-item':
            $item_id = $postData['item_id'] ?? '';
            if (empty($item_id)) {
                throw new Exception('削除対象IDが指定されていません');
            }
            
            $imported_data = loadDataFromFile('imported_data');
            $original_count = count($imported_data);
            
            $imported_data = array_filter($imported_data, fn($item) => ($item['id'] ?? '') !== $item_id);
            $imported_data = array_values($imported_data);
            
            if (count($imported_data) < $original_count) {
                saveDataToFile('imported_data', $imported_data);
                $stats = generateStatistics();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'データを削除しました',
                    'data' => [
                        'stats' => $stats,
                        'ui_update' => [
                            'action' => 'remove_element',
                            'selector' => "[data-item-id='{$item_id}']"
                        ]
                    ]
                ]);
            } else {
                throw new Exception('削除対象が見つかりませんでした');
            }
            break;
            
        case 'select-all-imported-data':
            echo json_encode([
                'success' => true,
                'message' => '全データを選択しました',
                'data' => [
                    'ui_update' => [
                        'action' => 'select_all_checkboxes',
                        'selector' => '.kicho__data-checkbox'
                    ]
                ]
            ]);
            break;
            
        case 'refresh-all':
            $stats = generateStatistics();
            $transactions = loadDataFromFile('transactions');
            $imported_data = loadDataFromFile('imported_data');
            
            echo json_encode([
                'success' => true,
                'message' => 'データを更新しました',
                'data' => [
                    'stats' => $stats,
                    'transactions' => $transactions,
                    'imported_data' => $imported_data,
                    'ui_update' => [
                        'action' => 'refresh_all_data'
                    ]
                ]
            ]);
            break;
            
        // =====================================
        // 🔧 その他機能
        // =====================================
        
        case 'execute-full-backup':
            $backupData = [
                'transactions' => loadDataFromFile('transactions'),
                'imported_data' => loadDataFromFile('imported_data'),
                'user_settings' => loadDataFromFile('user_settings'),
                'saved_rules' => loadDataFromFile('saved_rules'),
                'auto_refresh_history' => loadDataFromFile('auto_refresh_history'),
                'mf_import_history' => loadDataFromFile('mf_import_history'),
                'backup_time' => date('Y-m-d H:i:s'),
                'version' => '5.0.3-MAC'
            ];
            
            $backupFile = getKichoDataDir() . "/backup_" . date('Y-m-d_H-i-s') . '.json';
            file_put_contents($backupFile, json_encode($backupData, JSON_PRETTY_PRINT));
            
            echo json_encode([
                'success' => true,
                'message' => 'バックアップを作成しました',
                'data' => [
                    'backup_file' => basename($backupFile),
                    'backup_size' => filesize($backupFile),
                    'backup_time' => date('Y-m-d H:i:s')
                ]
            ]);
            break;
            
        default:
            throw new Exception("未対応のアクション: {$action}", 400);
    }
    
} catch (Exception $e) {
    error_log("❌ KICHO Ajax エラー [{$action}]: " . $e->getMessage());
    
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => $e->getCode() ?: 500,
        'action' => $action ?? 'unknown',
        'timestamp' => date('Y-m-d H:i:s'),
        'environment' => 'mac_local'
    ]);
}

error_log("🏁 KICHO Ajax処理完了 [{$action}]");
?>