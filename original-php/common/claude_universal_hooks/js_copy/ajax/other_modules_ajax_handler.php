<?php
/**
 * 🔧 その他モジュール Ajax処理
 * ファイル: modules/other/ajax_handler.php
 * 
 * ✅ ASIN管理
 * ✅ 設定管理
 * ✅ ユーザー管理
 * ✅ システム監視
 * ✅ バックアップ・復元
 * ✅ ログ管理
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

function validateCSRFToken() {
    $token = $_POST['csrf_token'] ?? $_GET['csrf_token'] ?? '';
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return !empty($token) && hash_equals($_SESSION['csrf_token'], $token);
}

function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

// =====================================
// 📁 データファイル管理
// =====================================

function getDataDir() {
    $dataDir = __DIR__ . '/../../data/other';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    return $dataDir;
}

function getAsinFile() {
    return getDataDir() . '/asin_data.json';
}

function getSettingsFile() {
    return getDataDir() . '/settings.json';
}

function getLogsFile() {
    return getDataDir() . '/system_logs.json';
}

function getUsersFile() {
    return getDataDir() . '/users.json';
}

// =====================================
// 🎯 メインAjax処理振り分け
// =====================================

try {
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && !validateCSRFToken()) {
        throw new Exception('CSRF token validation failed');
    }
    
    $response = handleOtherAction($action);
    return $response;
    
} catch (Exception $e) {
    error_log("その他モジュールAjax処理エラー: " . $e->getMessage());
    return [
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => defined('DEBUG_MODE') && DEBUG_MODE ? [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ] : null
    ];
}

// =====================================
// 🔧 その他モジュールアクション処理
// =====================================

function handleOtherAction($action) {
    switch ($action) {
        // === ASIN管理 ===
        case 'upload_asin_csv':
            return handleUploadAsinCSV();
        case 'process_asin_list':
            return handleProcessAsinList();
        case 'validate_asin':
            return handleValidateAsin();
        case 'get_asin_results':
            return handleGetAsinResults();
        case 'export_asin_data':
            return handleExportAsinData();
        
        // === 設定管理 ===
        case 'get_settings':
            return handleGetSettings();
        case 'update_settings':
            return handleUpdateSettings();
        case 'reset_settings':
            return handleResetSettings();
        case 'export_settings':
            return handleExportSettings();
        case 'import_settings':
            return handleImportSettings();
        
        // === ユーザー管理 ===
        case 'get_users':
            return handleGetUsers();
        case 'create_user':
            return handleCreateUser();
        case 'update_user':
            return handleUpdateUser();
        case 'delete_user':
            return handleDeleteUser();
        case 'change_password':
            return handleChangePassword();
        
        // === システム監視 ===
        case 'get_system_info':
            return handleGetSystemInfo();
        case 'get_performance_data':
            return handleGetPerformanceData();
        case 'clear_cache':
            return handleClearCache();
        case 'run_maintenance':
            return handleRunMaintenance();
        case 'check_updates':
            return handleCheckUpdates();
        
        // === ログ管理 ===
        case 'get_logs':
            return handleGetLogs();
        case 'clear_logs':
            return handleClearLogs();
        case 'export_logs':
            return handleExportLogs();
        case 'log_search':
            return handleLogSearch();
        
        // === バックアップ・復元 ===
        case 'create_backup':
            return handleCreateBackup();
        case 'restore_backup':
            return handleRestoreBackup();
        case 'list_backups':
            return handleListBackups();
        case 'delete_backup':
            return handleDeleteBackup();
        
        // === ヘルスチェック ===
        case 'health_check':
            return handleHealthCheck();
        case 'system_status':
            return handleSystemStatus();
        case 'security_check':
            return handleSecurityCheck();
        
        default:
            throw new Exception("未知のアクション: {$action}");
    }
}

// =====================================
// 📋 ASIN管理機能
// =====================================

function handleUploadAsinCSV() {
    try {
        if (!isset($_FILES['asin_file'])) {
            throw new Exception('ASINファイルが選択されていません');
        }
        
        $file = $_FILES['asin_file'];
        $processMode = $_POST['process_mode'] ?? 'validate_only';
        
        // ファイル検証
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('ファイルアップロードエラー');
        }
        
        if ($file['size'] > 5 * 1024 * 1024) { // 5MB制限
            throw new Exception('ファイルサイズが大きすぎます');
        }
        
        // CSV解析
        $asinData = parseAsinCSV($file['tmp_name']);
        
        if (empty($asinData)) {
            throw new Exception('有効なASINデータが見つかりません');
        }
        
        $results = [
            'total_rows' => count($asinData),
            'valid_asins' => 0,
            'invalid_asins' => 0,
            'processed_items' => [],
            'errors' => []
        ];
        
        foreach ($asinData as $index => $item) {
            $asin = $item['asin'] ?? $item['ASIN'] ?? '';
            $validation = validateASIN($asin);
            
            if ($validation['valid']) {
                $results['valid_asins']++;
                
                if ($processMode === 'process_all') {
                    $productData = fetchProductData($asin);
                    $results['processed_items'][] = array_merge($item, $productData);
                } else {
                    $results['processed_items'][] = array_merge($item, ['status' => 'valid']);
                }
            } else {
                $results['invalid_asins']++;
                $results['errors'][] = [
                    'row' => $index + 1,
                    'asin' => $asin,
                    'error' => $validation['error']
                ];
            }
        }
        
        // 結果保存
        if ($processMode === 'process_all' && $results['valid_asins'] > 0) {
            saveAsinResults($results);
        }
        
        return [
            'success' => true,
            'message' => "ASIN処理完了: {$results['valid_asins']}件成功、{$results['invalid_asins']}件エラー",
            'data' => $results
        ];
        
    } catch (Exception $e) {
        throw new Exception("ASIN CSV アップロードエラー: " . $e->getMessage());
    }
}

function handleValidateAsin() {
    try {
        $asin = sanitizeInput($_POST['asin'] ?? '');
        
        if (empty($asin)) {
            throw new Exception('ASINが指定されていません');
        }
        
        $validation = validateASIN($asin);
        
        if ($validation['valid']) {
            $productData = fetchProductData($asin);
            
            return [
                'success' => true,
                'message' => 'ASIN検証成功',
                'data' => array_merge($validation, $productData)
            ];
        } else {
            return [
                'success' => false,
                'error' => $validation['error'],
                'data' => $validation
            ];
        }
        
    } catch (Exception $e) {
        throw new Exception("ASIN検証エラー: " . $e->getMessage());
    }
}

// =====================================
// ⚙️ 設定管理機能
// =====================================

function handleGetSettings() {
    try {
        $settingsFile = getSettingsFile();
        $settings = [];
        
        if (file_exists($settingsFile)) {
            $content = file_get_contents($settingsFile);
            $settings = json_decode($content, true) ?: [];
        }
        
        // デフォルト設定をマージ
        $defaultSettings = getDefaultSettings();
        $settings = array_merge($defaultSettings, $settings);
        
        return [
            'success' => true,
            'data' => $settings
        ];
        
    } catch (Exception $e) {
        throw new Exception("設定取得エラー: " . $e->getMessage());
    }
}

function handleUpdateSettings() {
    try {
        $newSettings = $_POST['settings'] ?? [];
        
        if (empty($newSettings) || !is_array($newSettings)) {
            throw new Exception('有効な設定データが指定されていません');
        }
        
        // 設定値検証
        $validatedSettings = validateSettings($newSettings);
        
        // 既存設定読み込み
        $settingsFile = getSettingsFile();
        $currentSettings = [];
        
        if (file_exists($settingsFile)) {
            $content = file_get_contents($settingsFile);
            $currentSettings = json_decode($content, true) ?: [];
        }
        
        // 設定マージ
        $updatedSettings = array_merge($currentSettings, $validatedSettings);
        $updatedSettings['last_updated'] = date('Y-m-d H:i:s');
        $updatedSettings['updated_by'] = $_SESSION['user_id'] ?? 'system';
        
        // 保存
        $json = json_encode($updatedSettings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        file_put_contents($settingsFile, $json);
        
        // 設定変更ログ記録
        logSystemEvent('settings_updated', 'システム設定が更新されました', $validatedSettings);
        
        return [
            'success' => true,
            'message' => '設定を更新しました',
            'data' => $updatedSettings
        ];
        
    } catch (Exception $e) {
        throw new Exception("設定更新エラー: " . $e->getMessage());
    }
}

// =====================================
// 👤 ユーザー管理機能
// =====================================

function handleGetUsers() {
    try {
        $usersFile = getUsersFile();
        $users = [];
        
        if (file_exists($usersFile)) {
            $content = file_get_contents($usersFile);
            $users = json_decode($content, true) ?: [];
        }
        
        // パスワードハッシュを除外
        foreach ($users as &$user) {
            unset($user['password_hash']);
            $user['last_login_formatted'] = !empty($user['last_login']) ? 
                date('Y-m-d H:i:s', strtotime($user['last_login'])) : null;
        }
        
        return [
            'success' => true,
            'data' => [
                'users' => $users,
                'total_count' => count($users),
                'active_count' => count(array_filter($users, fn($u) => $u['status'] === 'active'))
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("ユーザー一覧取得エラー: " . $e->getMessage());
    }
}

function handleCreateUser() {
    try {
        $requiredFields = ['username', 'email', 'password', 'role'];
        
        foreach ($requiredFields as $field) {
            if (empty($_POST[$field])) {
                throw new Exception("必須項目が入力されていません: {$field}");
            }
        }
        
        $username = sanitizeInput($_POST['username']);
        $email = sanitizeInput($_POST['email']);
        $password = $_POST['password'];
        $role = sanitizeInput($_POST['role']);
        $fullName = sanitizeInput($_POST['full_name'] ?? '');
        
        // バリデーション
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('有効なメールアドレスを入力してください');
        }
        
        if (strlen($password) < 8) {
            throw new Exception('パスワードは8文字以上である必要があります');
        }
        
        $validRoles = ['admin', 'manager', 'user', 'readonly'];
        if (!in_array($role, $validRoles)) {
            throw new Exception('有効な役割を選択してください');
        }
        
        // 既存ユーザーチェック
        $users = loadUsers();
        foreach ($users as $user) {
            if ($user['username'] === $username) {
                throw new Exception('同じユーザー名が既に存在します');
            }
            if ($user['email'] === $email) {
                throw new Exception('同じメールアドレスが既に存在します');
            }
        }
        
        // 新規ユーザー作成
        $newUser = [
            'id' => generateUniqueId(),
            'username' => $username,
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'full_name' => $fullName,
            'role' => $role,
            'status' => 'active',
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $_SESSION['user_id'] ?? 'system',
            'last_login' => null,
            'login_count' => 0,
            'preferences' => []
        ];
        
        $users[] = $newUser;
        saveUsers($users);
        
        // ログ記録
        logSystemEvent('user_created', "新規ユーザー作成: {$username}", ['username' => $username, 'role' => $role]);
        
        // レスポンス用データ（パスワードハッシュ除外）
        $responseUser = $newUser;
        unset($responseUser['password_hash']);
        
        return [
            'success' => true,
            'message' => 'ユーザーを作成しました',
            'data' => $responseUser
        ];
        
    } catch (Exception $e) {
        throw new Exception("ユーザー作成エラー: " . $e->getMessage());
    }
}

// =====================================
// 📊 システム監視機能
// =====================================

function handleGetSystemInfo() {
    try {
        $systemInfo = [
            'server' => [
                'php_version' => PHP_VERSION,
                'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
                'operating_system' => PHP_OS,
                'server_time' => date('Y-m-d H:i:s'),
                'timezone' => date_default_timezone_get(),
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'post_max_size' => ini_get('post_max_size')
            ],
            'database' => [
                'type' => 'JSON Files',
                'status' => 'Connected',
                'data_directory' => realpath(__DIR__ . '/../../data'),
                'writable' => is_writable(__DIR__ . '/../../data')
            ],
            'application' => [
                'version' => defined('NAGANO3_VERSION') ? NAGANO3_VERSION : '1.0.0',
                'debug_mode' => defined('DEBUG_MODE') ? DEBUG_MODE : false,
                'session_active' => session_status() === PHP_SESSION_ACTIVE,
                'current_user' => $_SESSION['user_id'] ?? 'anonymous'
            ],
            'performance' => [
                'memory_usage' => formatBytes(memory_get_usage(true)),
                'peak_memory' => formatBytes(memory_get_peak_usage(true)),
                'memory_usage_percentage' => getMemoryUsagePercentage(),
                'disk_free_space' => formatBytes(disk_free_space(__DIR__)),
                'disk_total_space' => formatBytes(disk_total_space(__DIR__))
            ],
            'extensions' => [
                'json' => extension_loaded('json'),
                'mbstring' => extension_loaded('mbstring'),
                'curl' => extension_loaded('curl'),
                'gd' => extension_loaded('gd'),
                'zip' => extension_loaded('zip'),
                'openssl' => extension_loaded('openssl')
            ]
        ];
        
        return [
            'success' => true,
            'data' => $systemInfo
        ];
        
    } catch (Exception $e) {
        throw new Exception("システム情報取得エラー: " . $e->getMessage());
    }
}

function handleGetPerformanceData() {
    try {
        $timeRange = $_GET['time_range'] ?? '1h'; // 1h, 6h, 24h, 7d
        
        // パフォーマンスデータ生成（実際の実装では履歴データを使用）
        $performanceData = generatePerformanceData($timeRange);
        
        return [
            'success' => true,
            'data' => $performanceData
        ];
        
    } catch (Exception $e) {
        throw new Exception("パフォーマンスデータ取得エラー: " . $e->getMessage());
    }
}

// =====================================
// 📝 ログ管理機能
// =====================================

function handleGetLogs() {
    try {
        $logType = $_GET['log_type'] ?? 'all'; // system, error, access, security
        $dateFrom = $_GET['date_from'] ?? date('Y-m-d', strtotime('-7 days'));
        $dateTo = $_GET['date_to'] ?? date('Y-m-d');
        $limit = intval($_GET['limit'] ?? 100);
        
        $logs = loadSystemLogs();
        
        // フィルタリング
        $filteredLogs = array_filter($logs, function($log) use ($logType, $dateFrom, $dateTo) {
            $logDate = substr($log['timestamp'], 0, 10);
            $matchType = $logType === 'all' || $log['type'] === $logType;
            $matchDate = $logDate >= $dateFrom && $logDate <= $dateTo;
            
            return $matchType && $matchDate;
        });
        
        // 新しい順でソート
        usort($filteredLogs, function($a, $b) {
            return strtotime($b['timestamp']) - strtotime($a['timestamp']);
        });
        
        // 制限適用
        $filteredLogs = array_slice($filteredLogs, 0, $limit);
        
        return [
            'success' => true,
            'data' => [
                'logs' => $filteredLogs,
                'total_count' => count($logs),
                'filtered_count' => count($filteredLogs),
                'filters' => [
                    'type' => $logType,
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'limit' => $limit
                ]
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("ログ取得エラー: " . $e->getMessage());
    }
}

function handleClearLogs() {
    try {
        $logType = $_POST['log_type'] ?? 'all';
        $olderThan = $_POST['older_than'] ?? '30'; // days
        
        $logs = loadSystemLogs();
        $cutoffDate = date('Y-m-d', strtotime("-{$olderThan} days"));
        $removedCount = 0;
        
        if ($logType === 'all') {
            $logs = array_filter($logs, function($log) use ($cutoffDate, &$removedCount) {
                $logDate = substr($log['timestamp'], 0, 10);
                if ($logDate < $cutoffDate) {
                    $removedCount++;
                    return false;
                }
                return true;
            });
        } else {
            $logs = array_filter($logs, function($log) use ($logType, $cutoffDate, &$removedCount) {
                $logDate = substr($log['timestamp'], 0, 10);
                if ($log['type'] === $logType && $logDate < $cutoffDate) {
                    $removedCount++;
                    return false;
                }
                return true;
            });
        }
        
        saveSystemLogs(array_values($logs));
        
        // ログクリア記録
        logSystemEvent('logs_cleared', "ログクリア実行: {$removedCount}件削除", [
            'type' => $logType,
            'older_than' => $olderThan,
            'removed_count' => $removedCount
        ]);
        
        return [
            'success' => true,
            'message' => "{$removedCount}件のログを削除しました",
            'data' => [
                'removed_count' => $removedCount,
                'remaining_count' => count($logs)
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("ログクリアエラー: " . $e->getMessage());
    }
}

// =====================================
// 💾 バックアップ・復元機能
// =====================================

function handleCreateBackup() {
    try {
        $backupType = $_POST['backup_type'] ?? 'full'; // full, data_only, settings_only
        $compression = isset($_POST['compression']) && $_POST['compression'] === '1';
        
        $backupData = [
            'backup_info' => [
                'type' => $backupType,
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $_SESSION['user_id'] ?? 'system',
                'version' => defined('NAGANO3_VERSION') ? NAGANO3_VERSION : '1.0.0',
                'compression' => $compression
            ]
        ];
        
        $dataDir = __DIR__ . '/../../data';
        
        switch ($backupType) {
            case 'full':
                $backupData['data'] = collectAllData($dataDir);
                break;
            case 'data_only':
                $backupData['data'] = collectDataOnly($dataDir);
                break;
            case 'settings_only':
                $backupData['data'] = collectSettingsOnly($dataDir);
                break;
        }
        
        $backupId = 'backup_' . date('Ymd_His') . '_' . $backupType;
        $backupFile = getDataDir() . "/backups/{$backupId}.json";
        
        // バックアップディレクトリ作成
        $backupDir = dirname($backupFile);
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }
        
        // バックアップ保存
        $json = json_encode($backupData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        if ($compression && extension_loaded('zlib')) {
            $json = gzcompress($json, 9);
            $backupFile = str_replace('.json', '.json.gz', $backupFile);
        }
        
        file_put_contents($backupFile, $json);
        
        // バックアップ記録
        logSystemEvent('backup_created', "バックアップ作成: {$backupId}", [
            'type' => $backupType,
            'file_size' => filesize($backupFile),
            'compression' => $compression
        ]);
        
        return [
            'success' => true,
            'message' => 'バックアップを作成しました',
            'data' => [
                'backup_id' => $backupId,
                'backup_file' => basename($backupFile),
                'file_size' => formatBytes(filesize($backupFile)),
                'backup_type' => $backupType,
                'compression' => $compression
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("バックアップ作成エラー: " . $e->getMessage());
    }
}

function handleHealthCheck() {
    try {
        $checks = [
            'data_directory' => [
                'status' => is_dir(__DIR__ . '/../../data') && is_writable(__DIR__ . '/../../data'),
                'message' => 'データディレクトリの読み書き可能性'
            ],
            'php_version' => [
                'status' => version_compare(PHP_VERSION, '7.4.0', '>='),
                'message' => 'PHP バージョン 7.4.0 以上',
                'current' => PHP_VERSION
            ],
            'memory_limit' => [
                'status' => getMemoryUsagePercentage() < 80,
                'message' => 'メモリ使用量が80%未満',
                'current' => getMemoryUsagePercentage() . '%'
            ],
            'disk_space' => [
                'status' => getDiskUsagePercentage() < 90,
                'message' => 'ディスク使用量が90%未満',
                'current' => getDiskUsagePercentage() . '%'
            ],
            'required_extensions' => [
                'status' => extension_loaded('json') && extension_loaded('mbstring'),
                'message' => '必要なPHP拡張モジュールの有効化',
                'extensions' => [
                    'json' => extension_loaded('json'),
                    'mbstring' => extension_loaded('mbstring'),
                    'curl' => extension_loaded('curl')
                ]
            ],
            'session' => [
                'status' => session_status() === PHP_SESSION_ACTIVE,
                'message' => 'セッション機能の動作確認'
            ],
            'file_permissions' => [
                'status' => checkFilePermissions(),
                'message' => 'ファイル権限の確認'
            ]
        ];
        
        $overallHealth = array_reduce($checks, function($carry, $check) {
            return $carry && $check['status'];
        }, true);
        
        return [
            'success' => true,
            'data' => [
                'overall_status' => $overallHealth ? 'healthy' : 'warning',
                'checks' => $checks,
                'timestamp' => date('Y-m-d H:i:s'),
                'system_uptime' => getSystemUptime()
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("ヘルスチェックエラー: " . $e->getMessage());
    }
}

// =====================================
// 🛠️ ユーティリティ関数
// =====================================

function generateUniqueId() {
    return date('YmdHis') . '_' . bin2hex(random_bytes(4));
}

function parseAsinCSV($filePath) {
    $data = [];
    
    if (($handle = fopen($filePath, 'r')) !== false) {
        $header = null;
        $rowIndex = 0;
        
        while (($row = fgetcsv($handle, 1000, ',')) !== false) {
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

function validateASIN($asin) {
    // ASIN形式チェック（10文字の英数字）
    if (!preg_match('/^[A-Z0-9]{10}$/', $asin)) {
        return [
            'valid' => false,
            'error' => '無効なASIN形式です（10文字の英数字である必要があります）'
        ];
    }
    
    return [
        'valid' => true,
        'asin' => $asin,
        'formatted_asin' => $asin
    ];
}

function fetchProductData($asin) {
    // 実際の実装では Amazon API を使用
    // デモモードでは擬似データを返す
    $sampleProducts = [
        ['name' => 'サンプル商品A', 'price' => '¥1,980', 'category' => 'Electronics'],
        ['name' => 'サンプル商品B', 'price' => '¥3,500', 'category' => 'Books'],
        ['name' => 'サンプル商品C', 'price' => '¥2,750', 'category' => 'Home & Kitchen'],
        ['name' => 'サンプル商品D', 'price' => '¥8,900', 'category' => 'Sports'],
        ['name' => 'サンプル商品E', 'price' => '¥1,200', 'category' => 'Health']
    ];
    
    $randomProduct = $sampleProducts[array_rand($sampleProducts)];
    
    return [
        'asin' => $asin,
        'product_name' => $randomProduct['name'],
        'price' => $randomProduct['price'],
        'category' => $randomProduct['category'],
        'availability' => 'In Stock',
        'seller' => 'Amazon.co.jp',
        'rating' => rand(35, 50) / 10,
        'review_count' => rand(10, 1000),
        'image_url' => 'https://via.placeholder.com/150x150?text=' . urlencode($randomProduct['name']),
        'fetched_at' => date('Y-m-d H:i:s')
    ];
}

function saveAsinResults($results) {
    $asinFile = getAsinFile();
    $json = json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    file_put_contents($asinFile, $json);
}

function getDefaultSettings() {
    return [
        'system' => [
            'site_name' => 'NAGANO-3',
            'timezone' => 'Asia/Tokyo',
            'date_format' => 'Y-m-d',
            'currency' => 'JPY',
            'language' => 'ja'
        ],
        'security' => [
            'session_timeout' => 3600,
            'max_login_attempts' => 5,
            'password_min_length' => 8,
            'require_https' => false
        ],
        'performance' => [
            'cache_enabled' => true,
            'cache_ttl' => 3600,
            'max_file_size' => '10M',
            'memory_limit' => '256M'
        ],
        'notifications' => [
            'email_enabled' => false,
            'low_stock_alerts' => true,
            'system_alerts' => true,
            'backup_notifications' => true
        ]
    ];
}

function validateSettings($settings) {
    $validated = [];
    
    foreach ($settings as $category => $values) {
        if (!is_array($values)) continue;
        
        foreach ($values as $key => $value) {
            // 基本的なサニタイズ
            if (is_string($value)) {
                $validated[$category][$key] = sanitizeInput($value);
            } elseif (is_bool($value) || is_numeric($value)) {
                $validated[$category][$key] = $value;
            }
        }
    }
    
    return $validated;
}

function loadUsers() {
    $usersFile = getUsersFile();
    if (!file_exists($usersFile)) {
        return [];
    }
    
    $content = file_get_contents($usersFile);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function saveUsers($users) {
    $usersFile = getUsersFile();
    $dataDir = dirname($usersFile);
    
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    
    $json = json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($usersFile, $json) !== false;
}

function logSystemEvent($type, $message, $data = []) {
    $logs = loadSystemLogs();
    
    $logEntry = [
        'id' => generateUniqueId(),
        'type' => $type,
        'level' => 'info',
        'message' => $message,
        'data' => $data,
        'user_id' => $_SESSION['user_id'] ?? 'system',
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    $logs[] = $logEntry;
    
    // ログは最新1000件まで保持
    if (count($logs) > 1000) {
        $logs = array_slice($logs, -1000);
    }
    
    saveSystemLogs($logs);
}

function loadSystemLogs() {
    $logsFile = getLogsFile();
    if (!file_exists($logsFile)) {
        return [];
    }
    
    $content = file_get_contents($logsFile);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function saveSystemLogs($logs) {
    $logsFile = getLogsFile();
    $json = json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($logsFile, $json) !== false;
}

function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}

function getMemoryUsagePercentage() {
    $memoryLimit = ini_get('memory_limit');
    $memoryLimitBytes = convertToBytes($memoryLimit);
    $memoryUsage = memory_get_usage(true);
    
    return $memoryLimitBytes > 0 ? round(($memoryUsage / $memoryLimitBytes) * 100, 1) : 0;
}

function getDiskUsagePercentage() {
    $totalSpace = disk_total_space(__DIR__);
    $freeSpace = disk_free_space(__DIR__);
    $usedSpace = $totalSpace - $freeSpace;
    
    return $totalSpace > 0 ? round(($usedSpace / $totalSpace) * 100, 1) : 0;
}

function convertToBytes($value) {
    $unit = strtolower(substr($value, -1));
    $number = (int) $value;
    
    switch ($unit) {
        case 'g':
            $number *= 1024;
        case 'm':
            $number *= 1024;
        case 'k':
            $number *= 1024;
    }
    
    return $number;
}

function checkFilePermissions() {
    $paths = [
        __DIR__ . '/../../data',
        __DIR__ . '/../../data/apikey',
        __DIR__ . '/../../data/kicho',
        __DIR__ . '/../../data/juchu_kanri',
        __DIR__ . '/../../data/shohin',
        __DIR__ . '/../../data/zaiko'
    ];
    
    foreach ($paths as $path) {
        if (file_exists($path) && !is_writable($path)) {
            return false;
        }
    }
    
    return true;
}

function getSystemUptime() {
    // 簡易的なアップタイム（セッション開始時刻から計算）
    $sessionStart = $_SESSION['session_start'] ?? time();
    $uptime = time() - $sessionStart;
    
    $hours = floor($uptime / 3600);
    $minutes = floor(($uptime % 3600) / 60);
    $seconds = $uptime % 60;
    
    return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
}

function generatePerformanceData($timeRange) {
    $dataPoints = [];
    $now = time();
    
    switch ($timeRange) {
        case '1h':
            $interval = 300; // 5分間隔
            $points = 12;
            break;
        case '6h':
            $interval = 1800; // 30分間隔
            $points = 12;
            break;
        case '24h':
            $interval = 3600; // 1時間間隔
            $points = 24;
            break;
        case '7d':
            $interval = 21600; // 6時間間隔
            $points = 28;
            break;
        default:
            $interval = 300;
            $points = 12;
    }
    
    for ($i = $points - 1; $i >= 0; $i--) {
        $timestamp = $now - ($i * $interval);
        $dataPoints[] = [
            'timestamp' => date('Y-m-d H:i:s', $timestamp),
            'cpu_usage' => rand(10, 60),
            'memory_usage' => rand(30, 80),
            'disk_usage' => rand(40, 70),
            'network_in' => rand(100, 1000),
            'network_out' => rand(50, 500),
            'response_time' => rand(100, 800)
        ];
    }
    
    return [
        'time_range' => $timeRange,
        'data_points' => $dataPoints,
        'summary' => [
            'avg_cpu' => array_sum(array_column($dataPoints, 'cpu_usage')) / count($dataPoints),
            'avg_memory' => array_sum(array_column($dataPoints, 'memory_usage')) / count($dataPoints),
            'avg_response_time' => array_sum(array_column($dataPoints, 'response_time')) / count($dataPoints)
        ]
    ];
}

function collectAllData($dataDir) {
    $data = [];
    
    if (is_dir($dataDir)) {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dataDir)
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'json') {
                $relativePath = str_replace($dataDir . '/', '', $file->getPathname());
                $content = file_get_contents($file->getPathname());
                $data[$relativePath] = json_decode($content, true);
            }
        }
    }
    
    return $data;
}

function collectDataOnly($dataDir) {
    // データファイルのみ（設定ファイル除外）
    $data = collectAllData($dataDir);
    
    // 設定関連ファイルを除外
    $excludePatterns = ['settings', 'config', 'users'];
    
    foreach ($data as $path => $content) {
        foreach ($excludePatterns as $pattern) {
            if (strpos($path, $pattern) !== false) {
                unset($data[$path]);
                break;
            }
        }
    }
    
    return $data;
}

function collectSettingsOnly($dataDir) {
    $data = collectAllData($dataDir);
    $settingsData = [];
    
    // 設定関連ファイルのみ抽出
    $includePatterns = ['settings', 'config', 'users'];
    
    foreach ($data as $path => $content) {
        foreach ($includePatterns as $pattern) {
            if (strpos($path, $pattern) !== false) {
                $settingsData[$path] = $content;
                break;
            }
        }
    }
    
    return $settingsData;
}

?>