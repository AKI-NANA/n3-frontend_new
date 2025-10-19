<?php
/**
 * 完成版出品管理システム - listing.php
 * modules/yahoo_auction_complete/new_structure/08_listing/listing.php
 * 
 * 🎯 統合機能:
 * - CSV生成・編集・アップロード
 * - eBay API一括出品
 * - 多販路対応
 * - 自動出品スケジューラー
 * - エラーハンドリング統合
 * - editing.php機能統合
 */

// 共通機能読み込み
require_once(__DIR__ . '/../shared/includes/includes.php');

// eBay API統合クラス読み込み
require_once(__DIR__ . '/ebay_api_integration.php');

// 自動出品スケジューラー読み込み  
require_once(__DIR__ . '/auto_listing_scheduler.php');

// POSTリクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' || isset($_GET['action'])) {
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    
    switch ($action) {
        case 'generate_csv_template':
            generateCSVTemplate();
            break;
        case 'download_yahoo_raw_data':
            downloadYahooRawData();
            break;
        case 'upload_csv':
            handleCSVUpload();
            break;
        case 'execute_listing':
            executeEbayListing();
            break;
        case 'validate_csv':
            validateCSVData();
            break;
        case 'get_error_items':
            getErrorItems();
            break;
        case 'save_edited_item':
            saveEditedItem();
            break;
        case 'create_auto_schedule':
            createAutoSchedule();
            break;
        case 'get_schedule_list':
            getScheduleList();
            break;
        case 'toggle_schedule':
            toggleSchedule();
            break;
        case 'get_marketplace_accounts':
            getMarketplaceAccounts();
            break;
        case 'save_marketplace_selection':
            saveMarketplaceSelection();
            break;
        default:
            sendJsonResponse(null, false, '不正なアクションです');
            break;
    }
}

/**
 * CSV テンプレート生成
 */
function generateCSVTemplate() {
    try {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="ebay_template_' . date('Ymd_His') . '.csv"');
        
        echo "\xEF\xBB\xBF"; // UTF-8 BOM
        
        // ヘッダー
        echo "Action,Category,Title,Description,Quantity,BuyItNowPrice,ConditionID,Location,PaymentProfile,ReturnProfile,ShippingProfile,PictureURL,UPC,Brand,ConditionDescription,SiteID,PostalCode,Currency,Format,Duration,Country\n";
        
        // サンプル行
        echo 'Add,293,"Sample Product Title","Product description here",1,19.99,3000,Japan,"Standard Payment","30 Days Return","Standard Shipping",https://example.com/image.jpg,,,Used,0,100-0001,USD,FixedPriceItem,GTC,JP' . "\n";
        
        exit;
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'CSV生成エラー: ' . $e->getMessage());
    }
}

/**
 * Yahoo生データダウンロード
 */
function downloadYahooRawData() {
    try {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="yahoo_raw_data_' . date('Ymd_His') . '.csv"');
        
        echo "\xEF\xBB\xBF"; // UTF-8 BOM
        
        // ヘッダー
        echo "item_id,title,current_price,condition_name,category_name,picture_url,source_url,updated_at\n";
        
        // データベースから取得
        $data = getYahooRawDataForCSV();
        
        if (!empty($data)) {
            foreach ($data as $row) {
                $csvRow = [
                    $row['item_id'] ?? '',
                    $row['title'] ?? '',
                    $row['current_price'] ?? '0',
                    $row['condition_name'] ?? '',
                    $row['category_name'] ?? '',
                    $row['picture_url'] ?? '',
                    $row['source_url'] ?? '',
                    $row['updated_at'] ?? ''
                ];
                
                // CSVエスケープ
                $escapedRow = array_map(function($field) {
                    $field = (string)$field;
                    if (strpos($field, ',') !== false || strpos($field, '"') !== false || strpos($field, "\n") !== false) {
                        return '"' . str_replace('"', '""', $field) . '"';
                    }
                    return $field;
                }, $csvRow);
                
                echo implode(',', $escapedRow) . "\n";
            }
        } else {
            echo 'NO_DATA,"No raw data available","0","","","","",""' . "\n";
        }
        
        exit;
    } catch (Exception $e) {
        sendJsonResponse(null, false, '生データ出力エラー: ' . $e->getMessage());
    }
}

/**
 * CSVアップロード処理
 */
function handleCSVUpload() {
    try {
        if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('ファイルアップロードエラー');
        }
        
        $uploadedFile = $_FILES['csv_file']['tmp_name'];
        $csvData = [];
        
        if (($handle = fopen($uploadedFile, 'r')) !== false) {
            $header = fgetcsv($handle);
            
            while (($row = fgetcsv($handle)) !== false) {
                if (count($row) >= count($header)) {
                    $csvData[] = array_combine($header, $row);
                }
            }
            fclose($handle);
        }
        
        if (empty($csvData)) {
            throw new Exception('CSVデータが空です');
        }
        
        // バリデーション実行
        $validation = validateUploadedCSV($csvData);
        
        // セッションに保存
        $_SESSION['uploaded_csv_data'] = $csvData;
        $_SESSION['csv_validation'] = $validation;
        
        sendJsonResponse([
            'total_rows' => count($csvData),
            'valid_rows' => $validation['valid_count'],
            'error_rows' => $validation['error_count'],
            'errors' => $validation['errors'],
            'preview_data' => array_slice($csvData, 0, 5)
        ], true, 'CSVアップロード完了');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'CSVアップロードエラー: ' . $e->getMessage());
    }
}

/**
 * CSVデータバリデーション
 */
function validateUploadedCSV($csvData) {
    $errors = [];
    $validCount = 0;
    $errorCount = 0;
    
    foreach ($csvData as $index => $row) {
        $rowErrors = [];
        
        // 必須フィールドチェック
        if (empty($row['Title'])) {
            $rowErrors[] = 'タイトルが空です';
        }
        
        if (empty($row['BuyItNowPrice']) || !is_numeric($row['BuyItNowPrice']) || floatval($row['BuyItNowPrice']) <= 0) {
            $rowErrors[] = '価格が無効です';
        }
        
        if (empty($row['Category']) || !is_numeric($row['Category'])) {
            $rowErrors[] = 'カテゴリーIDが無効です';
        }
        
        if (empty($row['Description'])) {
            $rowErrors[] = '商品説明が空です';
        }
        
        // 文字数制限チェック
        if (!empty($row['Title']) && strlen($row['Title']) > 255) {
            $rowErrors[] = 'タイトルが255文字を超えています';
        }
        
        // URL形式チェック
        if (!empty($row['PictureURL']) && !filter_var($row['PictureURL'], FILTER_VALIDATE_URL)) {
            $rowErrors[] = '画像URLが無効です';
        }
        
        if (!empty($rowErrors)) {
            $errors[] = [
                'row' => $index + 1,
                'data' => $row,
                'errors' => $rowErrors
            ];
            $errorCount++;
        } else {
            $validCount++;
        }
    }
    
    return [
        'valid_count' => $validCount,
        'error_count' => $errorCount,
        'errors' => $errors
    ];
}

/**
 * eBay出品実行
 */
function executeEbayListing() {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['csv_data'])) {
            // セッションからデータ取得を試行
            if (isset($_SESSION['uploaded_csv_data'])) {
                $csvData = $_SESSION['uploaded_csv_data'];
                $dryRun = $input['dry_run'] ?? true;
                $batchSize = $input['batch_size'] ?? 10;
            } else {
                throw new Exception('出品データが見つかりません');
            }
        } else {
            $csvData = $input['csv_data'];
            $dryRun = $input['dry_run'] ?? true;
            $batchSize = $input['batch_size'] ?? 10;
        }
        
        // 選択された販路取得
        $selectedMarketplaces = $input['marketplaces'] ?? ['ebay'];
        
        // eBay API設定
        $ebayConfig = [
            'sandbox' => $dryRun,
            'app_id' => $_ENV['EBAY_APP_ID'] ?? null,
            'dev_id' => $_ENV['EBAY_DEV_ID'] ?? null,
            'cert_id' => $_ENV['EBAY_CERT_ID'] ?? null,
            'user_token' => $_ENV['EBAY_USER_TOKEN'] ?? null
        ];
        
        $ebayApi = new EbayApiIntegration($ebayConfig);
        
        $options = [
            'dry_run' => $dryRun,
            'batch_size' => $batchSize,
            'marketplaces' => $selectedMarketplaces
        ];
        
        $results = $ebayApi->executeBulkListing($csvData, $options);
        
        // データベースに販路マーキング保存
        if (!$dryRun && $results['success']) {
            saveMarketplaceTargets($csvData, $selectedMarketplaces);
        }
        
        echo json_encode($results);
        exit;
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'eBay出品エラー: ' . $e->getMessage());
    }
}

/**
 * エラーアイテム取得
 */
function getErrorItems() {
    try {
        if (!isset($_SESSION['csv_validation']) || !isset($_SESSION['uploaded_csv_data'])) {
            throw new Exception('バリデーションデータが見つかりません');
        }
        
        $validation = $_SESSION['csv_validation'];
        $errorItems = [];
        
        foreach ($validation['errors'] as $error) {
            $errorItems[] = [
                'row_number' => $error['row'],
                'data' => $error['data'],
                'errors' => $error['errors']
            ];
        }
        
        sendJsonResponse([
            'error_items' => $errorItems,
            'total_errors' => count($errorItems)
        ], true, 'エラーデータ取得完了');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'エラーデータ取得失敗: ' . $e->getMessage());
    }
}

/**
 * 編集アイテム保存
 */
function saveEditedItem() {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['row_number']) || !isset($input['data'])) {
            throw new Exception('編集データが不正です');
        }
        
        $rowNumber = $input['row_number'];
        $editedData = $input['data'];
        
        // セッション内CSVデータを更新
        if (isset($_SESSION['uploaded_csv_data'])) {
            $_SESSION['uploaded_csv_data'][$rowNumber - 1] = $editedData;
            
            // バリデーション再実行
            $validation = validateUploadedCSV($_SESSION['uploaded_csv_data']);
            $_SESSION['csv_validation'] = $validation;
            
            sendJsonResponse([
                'updated_row' => $rowNumber,
                'validation_status' => $validation
            ], true, '編集内容を保存しました');
        } else {
            throw new Exception('CSVデータが見つかりません');
        }
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, '編集保存エラー: ' . $e->getMessage());
    }
}

/**
 * 自動スケジュール作成
 */
function createAutoSchedule() {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $config = [
            'name' => $input['schedule_name'] ?? 'デフォルトスケジュール',
            'frequency' => $input['frequency'] ?? 'daily',
            'start_time' => $input['start_time'] ?? '09:00',
            'end_time' => $input['end_time'] ?? '21:00',
            'min_items_per_day' => $input['min_items'] ?? 3,
            'max_items_per_day' => $input['max_items'] ?? 10,
            'days_of_week' => $input['days_of_week'] ?? [1,2,3,4,5],
            'target_marketplaces' => $input['marketplaces'] ?? ['ebay'],
            'randomize_timing' => $input['randomize_timing'] ?? true,
            'randomize_quantity' => $input['randomize_quantity'] ?? true,
            'is_active' => $input['is_active'] ?? true
        ];
        
        $scheduler = new AutoListingScheduler();
        $result = $scheduler->createSchedule($config);
        
        sendJsonResponse($result['schedule_id'] ?? null, $result['success'], $result['message']);
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'スケジュール作成エラー: ' . $e->getMessage());
    }
}

/**
 * スケジュール一覧取得
 */
function getScheduleList() {
    try {
        $scheduler = new AutoListingScheduler();
        
        $activeSchedules = $scheduler->getActiveSchedules();
        $upcomingListings = $scheduler->getUpcomingListings(7);
        $recentHistory = $scheduler->getListingHistory(7);
        
        sendJsonResponse([
            'active_schedules' => $activeSchedules,
            'upcoming_listings' => $upcomingListings,
            'recent_history' => $recentHistory
        ], true, 'スケジュール一覧取得完了');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'スケジュール取得エラー: ' . $e->getMessage());
    }
}

/**
 * 販路アカウント取得
 */
function getMarketplaceAccounts() {
    try {
        // モックデータ（実際にはデータベースから取得）
        $accounts = [
            [
                'id' => 1,
                'marketplace_name' => 'ebay',
                'account_name' => 'Main eBay Account',
                'account_id' => 'main_ebay',
                'is_active' => true,
                'status' => 'active'
            ],
            [
                'id' => 2,
                'marketplace_name' => 'yahoo',
                'account_name' => 'Yahoo Auction',
                'account_id' => 'main_yahoo',
                'is_active' => false,
                'status' => 'development'
            ],
            [
                'id' => 3,
                'marketplace_name' => 'mercari',
                'account_name' => 'Mercari Shop',
                'account_id' => 'main_mercari',
                'is_active' => false,
                'status' => 'development'
            ]
        ];
        
        sendJsonResponse($accounts, true, '販路アカウント取得完了');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, '販路取得エラー: ' . $e->getMessage());
    }
}

/**
 * 販路選択保存
 */
function saveMarketplaceSelection() {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['marketplaces'])) {
            throw new Exception('販路選択データが不正です');
        }
        
        $_SESSION['selected_marketplaces'] = $input['marketplaces'];
        
        sendJsonResponse([
            'selected_marketplaces' => $input['marketplaces'],
            'selection_count' => count($input['marketplaces'])
        ], true, '販路選択を保存しました');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, '販路選択保存エラー: ' . $e->getMessage());
    }
}

/**
 * Yahoo生データ取得（内部関数）
 */
function getYahooRawDataForCSV() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return [];
        
        $sql = "
        SELECT 
            source_item_id as item_id,
            COALESCE(active_title, 'タイトルなし') as title,
            COALESCE(cached_price_usd, ROUND(price_jpy / 150.0, 2)) as current_price,
            COALESCE((scraped_yahoo_data->>'condition')::text, condition_name, 'N/A') as condition_name,
            COALESCE((scraped_yahoo_data->>'category')::text, category, 'N/A') as category_name,
            COALESCE(active_image_url, 'https://placehold.co/150x150?text=No+Image') as picture_url,
            (scraped_yahoo_data->>'url')::text as source_url,
            updated_at
        FROM mystical_japan_treasures_inventory 
        WHERE listing_status = 'Approved' 
        AND (ebay_item_id IS NULL OR ebay_item_id = '')
        ORDER BY updated_at DESC 
        LIMIT 1000
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
        
    } catch (Exception $e) {
        error_log('Yahoo生データ取得エラー: ' . $e->getMessage());
        return [];
    }
}

/**
 * 販路マーキング保存
 */
function saveMarketplaceTargets($csvData, $marketplaces) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return;
        
        foreach ($csvData as $item) {
            if (isset($item['item_id'])) {
                $sql = "
                UPDATE mystical_japan_treasures_inventory 
                SET target_marketplaces = ?, updated_at = NOW()
                WHERE source_item_id = ?
                ";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    json_encode($marketplaces),
                    $item['item_id']
                ]);
            }
        }
        
    } catch (Exception $e) {
        error_log('販路マーキング保存エラー: ' . $e->getMessage());
    }
}

/**
 * データベース接続取得
 */
function getDatabaseConnection() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        return $pdo;
    } catch (PDOException $e) {
        error_log("データベース接続エラー: " . $e->getMessage());
        return null;
    }
}

?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>出品管理システム - Yahoo Auction Tool</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="listing.css" rel="stylesheet">
</head>
<body>
    <div class="container">
        <!-- ナビゲーションヘッダー -->
        <nav class="navbar">
            <div class="nav-brand">
                <i class="fas fa-rocket"></i>
                <span>出品管理システム</span>
            </div>
            <div class="nav-links">
                <a href="../01_dashboard/dashboard.php"><i class="fas fa-tachometer-alt"></i> ダッシュボード</a>
                <a href="../02_scraping/scraping.php"><i class="fas fa-spider"></i> データ取得</a>
                <a href="../03_approval/approval.php"><i class="fas fa-check-circle"></i> 商品承認</a>
                <a href="../05_editing/editing.php"><i class="fas fa-edit"></i> データ編集</a>
                <a href="../07_filters/filters.php"><i class="fas fa-filter"></i> フィルター</a>
                <a href="../08_listing/listing.php" class="active"><i class="fas fa-store"></i> 出品管理</a>
                <a href="../09_inventory/inventory.php"><i class="fas fa-warehouse"></i> 在庫管理</a>
            </div>
        </nav>

        <!-- メインコンテンツ -->
        <main class="main-content">
            <div class="page-header">
                <h1><i class="fas fa-rocket"></i> eBay出品管理システム</h1>
                <p>CSVアップロード・多販路出品・自動スケジューリングの完全統合システム</p>
            </div>

            <!-- 出品ワークフロー -->
            <div class="listing-workflow">
                
                <!-- Step 1: CSVデータ準備 -->
                <section class="workflow-step">
                    <div class="step-header">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h3>📄 CSVデータ準備</h3>
                            <p>Yahooデータを取得してCSVテンプレートを生成、または既存CSVを編集します</p>
                        </div>
                    </div>
                    
                    <div class="step-actions">
                        <div class="action-group">
                            <h4>🔄 データ取得・生成</h4>
                            <div class="button-group">
                                <button class="btn btn-primary" onclick="downloadRawData()">
                                    <i class="fas fa-download"></i> Yahooデータダウンロード
                                </button>
                                <button class="btn btn-outline" onclick="generateTemplate()">
                                    <i class="fas fa-file-csv"></i> CSVテンプレート生成
                                </button>
                            </div>
                        </div>
                        
                        <div class="generation-status" id="generationStatus" style="display: none;">
                            <div class="status-content">
                                <i class="fas fa-spinner fa-spin"></i>
                                <span id="generationMessage">CSVデータ生成中...</span>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Step 2: CSVアップロード -->
                <section class="workflow-step">
                    <div class="step-header">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h3>📤 CSVアップロード</h3>
                            <p>編集したCSVファイルをアップロードしてバリデーションを実行します</p>
                        </div>
                    </div>
                    
                    <div class="listing-upload-section">
                        <div class="drag-drop-area" id="csvDropArea" 
                             ondrop="handleCSVDrop(event)" 
                             ondragover="handleDragOver(event)" 
                             ondragleave="handleDragLeave(event)">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <h4>CSVファイルをドラッグ＆ドロップ</h4>
                            <p>または<strong>クリックしてファイル選択</strong></p>
                            <input type="file" id="csvFileInput" accept=".csv" style="display: none;" onchange="handleCSVUpload(event)">
                        </div>
                        
                        <div class="upload-results" id="uploadResults" style="display: none;">
                            <div class="result-summary">
                                <div class="result-item result-success">
                                    <i class="fas fa-check-circle result-icon"></i>
                                    <div class="result-details">
                                        <div class="result-title">アップロード完了</div>
                                        <div class="result-message" id="uploadSummary"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="validation-results">
                                <div class="status-stats">
                                    <div class="stat-card stat-info">
                                        <i class="fas fa-file-csv stat-icon"></i>
                                        <div class="stat-value" id="totalRows">0</div>
                                        <div class="stat-label">総行数</div>
                                    </div>
                                    <div class="stat-card stat-success">
                                        <i class="fas fa-check stat-icon"></i>
                                        <div class="stat-value" id="validRows">0</div>
                                        <div class="stat-label">有効データ</div>
                                    </div>
                                    <div class="stat-card stat-error">
                                        <i class="fas fa-exclamation-triangle stat-icon"></i>
                                        <div class="stat-value" id="errorRows">0</div>
                                        <div class="stat-label">エラーデータ</div>
                                    </div>
                                </div>
                                
                                <div class="error-handling" id="errorHandling" style="display: none;">
                                    <h4><i class="fas fa-tools"></i> エラーデータ処理</h4>
                                    <div class="error-actions">
                                        <button class="btn btn-warning" onclick="showErrorItems()">
                                            <i class="fas fa-list"></i> エラー一覧表示
                                        </button>
                                        <button class="btn btn-info" onclick="openErrorEditor()">
                                            <i class="fas fa-edit"></i> 個別編集モード
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Step 3: 販路選択 -->
                <section class="workflow-step">
                    <div class="step-header">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h3>🏪 出品先販路選択</h3>
                            <p>アップロードしたデータをどの販路に出品するかを選択します</p>
                        </div>
                    </div>
                    
                    <div class="marketplace-selection">
                        <div class="marketplace-grid" id="marketplaceGrid">
                            <div class="marketplace-card" data-marketplace="ebay" onclick="toggleMarketplace('ebay')">
                                <i class="fab fa-ebay marketplace-icon" style="color: #E53238;"></i>
                                <div class="marketplace-name">eBay</div>
                                <div class="marketplace-account">Main Account</div>
                                <div class="marketplace-status active">利用可能</div>
                            </div>
                            
                            <div class="marketplace-card disabled" data-marketplace="yahoo">
                                <i class="fab fa-yahoo marketplace-icon" style="color: #FF0033;"></i>
                                <div class="marketplace-name">Yahoo オークション</div>
                                <div class="marketplace-account">開発中</div>
                                <div class="marketplace-status inactive">準備中</div>
                            </div>
                            
                            <div class="marketplace-card disabled" data-marketplace="mercari">
                                <i class="fas fa-store marketplace-icon" style="color: #FF6B35;"></i>
                                <div class="marketplace-name">メルカリ</div>
                                <div class="marketplace-account">開発中</div>
                                <div class="marketplace-status inactive">準備中</div>
                            </div>
                        </div>
                        
                        <div class="bulk-selection">
                            <button class="btn btn-primary" onclick="selectAllMarketplaces()">
                                <i class="fas fa-check-all"></i> 利用可能な販路をすべて選択
                            </button>
                        </div>
                    </div>
                </section>

                <!-- Step 4: 出品設定・実行 -->
                <section class="workflow-step">
                    <div class="step-header">
                        <div class="step-number">4</div>
                        <div class="step-content">
                            <h3>⚡ 出品実行</h3>
                            <p>出品設定を確認して一括出品を実行します</p>
                        </div>
                    </div>
                    
                    <div class="listing-settings">
                        <div class="settings-group">
                            <h4>🛠️ 出品オプション</h4>
                            <div class="options-grid">
                                <div class="option-item">
                                    <input type="checkbox" id="dryRunMode" checked>
                                    <label for="dryRunMode">テストモード（実出品なし）</label>
                                </div>
                                <div class="option-item">
                                    <input type="checkbox" id="batchMode" checked>
                                    <label for="batchMode">バッチ処理（10件ずつ）</label>
                                </div>
                                <div class="option-item">
                                    <input type="checkbox" id="validateMode" checked>
                                    <label for="validateMode">事前バリデーション</label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="execution-summary" id="executionSummary">
                            <h4>📊 実行概要</h4>
                            <div class="summary-stats">
                                <div class="summary-item">
                                    <span class="summary-label">処理件数:</span>
                                    <span class="summary-value" id="processCount">0件</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">出品先:</span>
                                    <span class="summary-value" id="targetMarkets">未選択</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">予想時間:</span>
                                    <span class="summary-value" id="estimatedTime">-</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">実行モード:</span>
                                    <span class="summary-value" id="executionMode">テストモード</span>
                                </div>
                            </div>
                            
                            <div class="execution-actions">
                                <button class="btn btn-success btn-lg" id="executeListingBtn" onclick="executeListingToEbay()" disabled>
                                    <i class="fas fa-rocket"></i> 一括出品実行
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Step 5: 自動出品スケジュール -->
                <section class="workflow-step">
                    <div class="step-header">
                        <div class="step-number">5</div>
                        <div class="step-content">
                            <h3>🤖 自動出品スケジュール</h3>
                            <p>定期的な自動出品のスケジュールを設定・管理します</p>
                        </div>
                    </div>
                    
                    <div class="scheduling-settings">
                        <div class="schedule-form">
                            <h4>⏰ 新規スケジュール作成</h4>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label class="form-label">スケジュール名</label>
                                    <input type="text" class="form-control" id="scheduleName" placeholder="例: 平日定期出品">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">出品頻度</label>
                                    <select class="form-control" id="scheduleFrequency">
                                        <option value="daily">毎日</option>
                                        <option value="weekly">毎週</option>
                                        <option value="monthly">毎月</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">出品時間帯</label>
                                    <div class="time-range">
                                        <input type="time" class="form-control" id="startTime" value="09:00">
                                        <span>～</span>
                                        <input type="time" class="form-control" id="endTime" value="21:00">
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">1日の出品数</label>
                                    <div class="number-range">
                                        <input type="number" class="form-control" id="minItems" value="3" min="1">
                                        <span>～</span>
                                        <input type="number" class="form-control" id="maxItems" value="10" min="1">
                                        <span>個</span>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <div class="form-check">
                                        <input type="checkbox" id="randomizePosting" checked>
                                        <label class="form-check-label" for="randomizePosting">
                                            ランダム出品（ロボット感を軽減）
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="schedule-actions">
                                <button class="btn btn-primary" onclick="createAutoSchedule()">
                                    <i class="fas fa-calendar-plus"></i> スケジュール作成
                                </button>
                                <button class="btn btn-outline" onclick="loadScheduleList()">
                                    <i class="fas fa-list"></i> 既存スケジュール表示
                                </button>
                            </div>
                        </div>
                        
                        <div class="schedule-status" id="scheduleStatus" style="display: none;">
                            <h4>📋 スケジュール状況</h4>
                            <div class="status-tabs">
                                <button class="tab-btn active" onclick="showScheduleTab('active')">アクティブ</button>
                                <button class="tab-btn" onclick="showScheduleTab('upcoming')">予定</button>
                                <button class="tab-btn" onclick="showScheduleTab('history')">履歴</button>
                            </div>
                            
                            <div class="tab-content" id="scheduleTabContent">
                                <!-- JavaScript で動的生成 -->
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </main>

        <!-- プログレスモーダル -->
        <div class="modal" id="listingProgressModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-rocket"></i> 出品処理実行中
                    </h3>
                </div>
                <div class="modal-body">
                    <div class="progress-section">
                        <div class="progress-info">
                            <span id="progressText">処理開始中...</span>
                            <span id="progressPercent">0%</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="overallProgress" style="width: 0%"></div>
                        </div>
                    </div>
                    
                    <div class="status-stats">
                        <div class="stat-card stat-success">
                            <i class="fas fa-check stat-icon"></i>
                            <div class="stat-value" id="successCount">0</div>
                            <div class="stat-label">成功</div>
                        </div>
                        <div class="stat-card stat-error">
                            <i class="fas fa-times stat-icon"></i>
                            <div class="stat-value" id="errorCount">0</div>
                            <div class="stat-label">失敗</div>
                        </div>
                        <div class="stat-card stat-info">
                            <i class="fas fa-clock stat-icon"></i>
                            <div class="stat-value" id="processingCount">0</div>
                            <div class="stat-label">処理中</div>
                        </div>
                    </div>
                    
                    <div class="progress-log-section">
                        <h4>📝 処理ログ</h4>
                        <div class="progress-log" id="progressLog">
                            <div class="log-entry info">処理を開始します...</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="closeProgressBtn" onclick="closeProgressModal()" disabled>
                        <i class="fas fa-times"></i> 閉じる
                    </button>
                    <button class="btn btn-primary" id="downloadReportBtn" onclick="downloadReport()" disabled>
                        <i class="fas fa-download"></i> レポートダウンロード
                    </button>
                </div>
            </div>
        </div>

        <!-- エラー編集モーダル -->
        <div class="modal" id="errorEditModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-edit"></i> エラーデータ編集
                    </h3>
                </div>
                <div class="modal-body">
                    <div class="error-item-editor" id="errorItemEditor">
                        <!-- JavaScript で動的生成 -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeErrorEditModal()">
                        <i class="fas fa-times"></i> キャンセル
                    </button>
                    <button class="btn btn-success" onclick="saveEditedItem()">
                        <i class="fas fa-save"></i> 保存
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript -->
    <script>
        // グローバル変数
        let uploadedCSVData = null;
        let validationResults = null;
        let selectedMarketplaces = ['ebay'];
        let listingInProgress = false;

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ 出品管理システム初期化開始');
            
            // ドラッグ&ドロップ設定
            setupDragAndDrop();
            
            // 販路選択設定
            setupMarketplaceSelection();
            
            // 出品オプション監視
            setupOptionListeners();
            
            console.log('🚀 出品管理システム初期化完了');
        });

        /**
         * ドラッグ&ドロップ設定
         */
        function setupDragAndDrop() {
            const dropArea = document.getElementById('csvDropArea');
            const fileInput = document.getElementById('csvFileInput');

            if (dropArea && fileInput) {
                dropArea.addEventListener('click', () => fileInput.click());
            }
        }

        /**
         * CSVドロップ処理
         */
        function handleCSVDrop(event) {
            event.preventDefault();
            event.currentTarget.classList.remove('drag-over');
            
            const files = event.dataTransfer.files;
            if (files.length > 0 && files[0].name.endsWith('.csv')) {
                processCSVFile(files[0]);
            } else {
                alert('CSVファイルを選択してください');
            }
        }

        function handleDragOver(event) {
            event.preventDefault();
            event.currentTarget.classList.add('drag-over');
        }

        function handleDragLeave(event) {
            event.preventDefault();
            event.currentTarget.classList.remove('drag-over');
        }

        /**
         * CSV ファイルアップロード処理
         */
        function handleCSVUpload(event) {
            const file = event.target.files[0];
            if (file && file.name.endsWith('.csv')) {
                processCSVFile(file);
            }
        }

        /**
         * CSV ファイル処理
         */
        function processCSVFile(file) {
            const formData = new FormData();
            formData.append('csv_file', file);
            formData.append('action', 'upload_csv');

            fetch('listing.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    uploadedCSVData = data.data.preview_data;
                    validationResults = data.data;
                    
                    displayUploadResults(data.data);
                    updateExecutionSummary();
                } else {
                    alert('CSV処理エラー: ' + data.message);
                }
            })
            .catch(error => {
                console.error('CSV処理エラー:', error);
                alert('CSV処理中にエラーが発生しました');
            });
        }

        /**
         * アップロード結果表示
         */
        function displayUploadResults(data) {
            const resultsDiv = document.getElementById('uploadResults');
            const summarySpan = document.getElementById('uploadSummary');
            const totalRows = document.getElementById('totalRows');
            const validRows = document.getElementById('validRows');
            const errorRows = document.getElementById('errorRows');
            const errorHandling = document.getElementById('errorHandling');

            if (resultsDiv) resultsDiv.style.display = 'block';
            if (summarySpan) summarySpan.textContent = `${data.total_rows}件のデータをアップロードしました`;
            if (totalRows) totalRows.textContent = data.total_rows;
            if (validRows) validRows.textContent = data.valid_rows;
            if (errorRows) errorRows.textContent = data.error_rows;
            
            if (errorHandling && data.error_rows > 0) {
                errorHandling.style.display = 'block';
            }
        }

        /**
         * 販路選択設定
         */
        function setupMarketplaceSelection() {
            const marketplaceCards = document.querySelectorAll('.marketplace-card:not(.disabled)');
            
            marketplaceCards.forEach(card => {
                card.addEventListener('click', function() {
                    const marketplace = this.dataset.marketplace;
                    toggleMarketplace(marketplace);
                });
            });
        }

        /**
         * 販路切り替え
         */
        function toggleMarketplace(marketplace) {
            const card = document.querySelector(`[data-marketplace="${marketplace}"]`);
            if (!card || card.classList.contains('disabled')) return;

            if (card.classList.contains('selected')) {
                card.classList.remove('selected');
                selectedMarketplaces = selectedMarketplaces.filter(m => m !== marketplace);
            } else {
                card.classList.add('selected');
                if (!selectedMarketplaces.includes(marketplace)) {
                    selectedMarketplaces.push(marketplace);
                }
            }
            
            updateExecutionSummary();
        }

        /**
         * 全販路選択
         */
        function selectAllMarketplaces() {
            const availableCards = document.querySelectorAll('.marketplace-card:not(.disabled)');
            selectedMarketplaces = [];
            
            availableCards.forEach(card => {
                card.classList.add('selected');
                selectedMarketplaces.push(card.dataset.marketplace);
            });
            
            updateExecutionSummary();
        }

        /**
         * 実行概要更新
         */
        function updateExecutionSummary() {
            const processCount = document.getElementById('processCount');
            const targetMarkets = document.getElementById('targetMarkets');
            const estimatedTime = document.getElementById('estimatedTime');
            const executionMode = document.getElementById('executionMode');
            const executeBtn = document.getElementById('executeListingBtn');

            if (uploadedCSVData && uploadedCSVData.length > 0) {
                if (processCount) processCount.textContent = `${uploadedCSVData.length}件`;
                
                if (targetMarkets) {
                    targetMarkets.textContent = selectedMarketplaces.length > 0 ? 
                        selectedMarketplaces.join(', ') : '未選択';
                }
                
                const dryRun = document.getElementById('dryRunMode')?.checked;
                if (executionMode) {
                    executionMode.textContent = dryRun ? 'テストモード' : '実出品モード';
                }
                
                const estimatedMinutes = Math.ceil(uploadedCSVData.length * 0.5 / 60);
                if (estimatedTime) estimatedTime.textContent = `約${estimatedMinutes}分`;
                
                if (executeBtn) executeBtn.disabled = false;
            }
        }

        /**
         * 出品オプション監視
         */
        function setupOptionListeners() {
            const options = ['dryRunMode', 'batchMode', 'validateMode'];
            
            options.forEach(optionId => {
                const element = document.getElementById(optionId);
                if (element) {
                    element.addEventListener('change', updateExecutionSummary);
                }
            });
        }

        /**
         * Raw データダウンロード
         */
        function downloadRawData() {
            const status = document.getElementById('generationStatus');
            const message = document.getElementById('generationMessage');
            
            if (status) status.style.display = 'block';
            if (message) message.textContent = 'Yahooデータ生成中...';
            
            window.location.href = 'listing.php?action=download_yahoo_raw_data';
            
            setTimeout(() => {
                if (status) status.style.display = 'none';
            }, 3000);
        }

        /**
         * テンプレート生成
         */
        function generateTemplate() {
            window.location.href = 'listing.php?action=generate_csv_template';
        }

        /**
         * eBay出品実行
         */
        function executeListingToEbay() {
            if (!uploadedCSVData || uploadedCSVData.length === 0) {
                alert('CSVデータがアップロードされていません。');
                return;
            }
            
            if (listingInProgress) {
                alert('出品処理が実行中です。');
                return;
            }
            
            const dryRun = document.getElementById('dryRunMode')?.checked ?? true;
            const batchMode = document.getElementById('batchMode')?.checked ?? true;
            
            const confirmMessage = dryRun 
                ? `テストモードで${uploadedCSVData.length}件の出品処理を開始しますか？`
                : `実際に${uploadedCSVData.length}件をeBayに出品しますか？（この操作は取り消せません）`;
                
            if (!confirm(confirmMessage)) {
                return;
            }
            
            listingInProgress = true;
            showProgressModal();
            
            const requestData = {
                csv_data: uploadedCSVData,
                dry_run: dryRun,
                batch_size: batchMode ? 10 : 1,
                marketplaces: selectedMarketplaces
            };
            
            fetch('listing.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(Object.assign(requestData, {action: 'execute_listing'}))
            })
            .then(response => response.json())
            .then(data => {
                listingInProgress = false;
                handleListingResults(data);
            })
            .catch(error => {
                listingInProgress = false;
                console.error('出品エラー:', error);
                alert('出品処理中にエラーが発生しました');
                closeProgressModal();
            });
        }

        /**
         * プログレスモーダル表示
         */
        function showProgressModal() {
            const modal = document.getElementById('listingProgressModal');
            if (modal) {
                modal.classList.add('show');
                clearProgressLog();
                addLogEntry('info', '出品処理を開始します...');
            }
        }

        /**
         * プログレスモーダル閉じる
         */
        function closeProgressModal() {
            const modal = document.getElementById('listingProgressModal');
            if (modal) {
                modal.classList.remove('show');
            }
        }

        /**
         * 出品結果処理
         */
        function handleListingResults(data) {
            const progressText = document.getElementById('progressText');
            const progressPercent = document.getElementById('progressPercent');
            const progressBar = document.getElementById('overallProgress');
            const successCount = document.getElementById('successCount');
            const errorCount = document.getElementById('errorCount');
            const closeBtn = document.getElementById('closeProgressBtn');

            if (data.success && data.data) {
                // 進行状況更新
                if (progressText) progressText.textContent = '処理完了';
                if (progressPercent) progressPercent.textContent = '100%';
                if (progressBar) progressBar.style.width = '100%';
                if (successCount) successCount.textContent = data.data.success_count;
                if (errorCount) errorCount.textContent = data.data.error_count;
                
                addLogEntry('success', `✅ 出品処理完了: 成功${data.data.success_count}件、失敗${data.data.error_count}件`);
                
                // 成功アイテム
                if (data.data.success_items) {
                    data.data.success_items.forEach(item => {
                        addLogEntry('success', `✅ ${item.title} - 出品完了`);
                    });
                }
                
                // 失敗アイテム
                if (data.data.failed_items) {
                    data.data.failed_items.forEach(item => {
                        addLogEntry('error', `❌ ${item.title} - ${item.error}`);
                    });
                }
            } else {
                addLogEntry('error', `❌ エラー: ${data.message}`);
            }
            
            // 閉じるボタン有効化
            if (closeBtn) closeBtn.disabled = false;
            
            // レポートボタン有効化
            const reportBtn = document.getElementById('downloadReportBtn');
            if (reportBtn) reportBtn.disabled = false;
        }

        /**
         * ログエントリ追加
         */
        function addLogEntry(type, message) {
            const logContainer = document.getElementById('progressLog');
            if (!logContainer) return;
            
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            entry.textContent = message;
            
            logContainer.appendChild(entry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }

        /**
         * ログクリア
         */
        function clearProgressLog() {
            const logContainer = document.getElementById('progressLog');
            if (logContainer) {
                logContainer.innerHTML = '';
            }
        }

        /**
         * エラーアイテム表示
         */
        function showErrorItems() {
            fetch('listing.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({action: 'get_error_items'})
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayErrorItemsList(data.data.error_items);
                } else {
                    alert('エラーデータ取得に失敗しました');
                }
            });
        }

        /**
         * エラー編集モード
         */
        function openErrorEditor() {
            const modal = document.getElementById('errorEditModal');
            if (modal) {
                modal.classList.add('show');
            }
        }

        function closeErrorEditModal() {
            const modal = document.getElementById('errorEditModal');
            if (modal) {
                modal.classList.remove('show');
            }
        }

        /**
         * 自動スケジュール作成
         */
        function createAutoSchedule() {
            const scheduleData = {
                schedule_name: document.getElementById('scheduleName')?.value || 'デフォルトスケジュール',
                frequency: document.getElementById('scheduleFrequency')?.value || 'daily',
                start_time: document.getElementById('startTime')?.value || '09:00',
                end_time: document.getElementById('endTime')?.value || '21:00',
                min_items: parseInt(document.getElementById('minItems')?.value) || 3,
                max_items: parseInt(document.getElementById('maxItems')?.value) || 10,
                randomize_timing: document.getElementById('randomizePosting')?.checked ?? true,
                marketplaces: selectedMarketplaces
            };
            
            fetch('listing.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(Object.assign(scheduleData, {action: 'create_auto_schedule'}))
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('スケジュールを作成しました');
                    loadScheduleList();
                } else {
                    alert('スケジュール作成エラー: ' + data.message);
                }
            })
            .catch(error => {
                console.error('スケジュール作成エラー:', error);
            });
        }

        /**
         * スケジュール一覧読み込み
         */
        function loadScheduleList() {
            fetch('listing.php?action=get_schedule_list')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayScheduleList(data.data);
                    document.getElementById('scheduleStatus').style.display = 'block';
                }
            });
        }

        /**
         * スケジュール一覧表示
         */
        function displayScheduleList(scheduleData) {
            // スケジュール表示処理（簡易実装）
            console.log('スケジュール一覧:', scheduleData);
        }

        /**
         * レポートダウンロード
         */
        function downloadReport() {
            alert('レポートダウンロード機能は準備中です。');
        }

        console.log('✅ 出品管理システム JavaScript 初期化完了');
    </script>
</body>
</html>