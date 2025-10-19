<?php
/**
 * 完全統合出品管理システム - 文字化け修正版
 * 機能: CSV生成・編集・アップロード・一括出品・自動スケジューリング
 * 対応: eBay API・多販路・エラーハンドリング・プログレス表示
 */

// 基本設定とインクルード
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300);

// 必要ファイルのインクルード
require_once(__DIR__ . '/ebay_api_integration.php');
require_once(__DIR__ . '/auto_listing_scheduler.php');

/**
 * メイン出品管理クラス
 */
class CompleteListingSystem {
    private $pdo;
    private $ebayApi;
    private $scheduler;
    
    public function __construct() {
        try {
            $this->pdo = $this->getDatabaseConnection();
            if ($this->pdo === null) {
                error_log("データベース接続に失敗しましたが、処理を継続します");
            }
            $this->ebayApi = new EbayApiIntegration(['sandbox' => false]);
            $this->scheduler = new AutoListingScheduler();
        } catch (Exception $e) {
            error_log("CompleteListingSystem初期化エラー: " . $e->getMessage());
        }
    }
    
    /**
     * メイン処理ハンドラー
     */
    public function handleRequest() {
        try {
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $action = $_POST['action'] ?? '';
                
                switch ($action) {
                    case 'generate_csv':
                        return $this->generateCsvTemplate();
                    case 'download_yahoo_data':
                        return $this->downloadYahooData();
                    case 'upload_csv':
                        return $this->handleCsvUpload();
                    case 'validate_data':
                        return $this->validateProductData();
                    case 'bulk_list_products':
                        return $this->bulkListProducts();
                    case 'create_auto_schedule':
                        return $this->createAutoSchedule();
                    case 'update_marketplace_selection':
                        return $this->updateMarketplaceSelection();
                    default:
                        throw new Exception('不正なアクションです');
                }
            }
        } catch (Exception $e) {
            error_log("リクエスト処理エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * CSVテンプレート生成
     */
    private function generateCsvTemplate() {
        $headers = [
            'Item ID', 'Title', 'Description', 'Category', 'Condition',
            'Price', 'Quantity', 'Weight', 'Dimensions', 'Brand',
            'MPN', 'UPC', 'Images', 'Shipping Service', 'Shipping Cost',
            'Return Policy', 'Payment Methods', 'Gallery Type'
        ];
        
        $filename = 'ebay_listing_template_' . date('Y-m-d_H-i-s') . '.csv';
        $filepath = __DIR__ . '/temp/' . $filename;
        
        // ディレクトリ作成
        if (!file_exists(dirname($filepath))) {
            mkdir(dirname($filepath), 0777, true);
        }
        
        $file = fopen($filepath, 'w');
        fputcsv($file, $headers);
        
        // サンプルデータ1行追加
        $sampleData = [
            'SAMPLE_001', 'Sample Product Title', 'Sample description here',
            '11450', 'New', '29.99', '1', '0.5', '10x10x5',
            'Sample Brand', 'SP001', '123456789012',
            'https://example.com/image1.jpg,https://example.com/image2.jpg',
            'Standard Shipping', '5.99', 'Returns Accepted',
            'PayPal,Credit Card', 'Gallery'
        ];
        fputcsv($file, $sampleData);
        fclose($file);
        
        return [
            'success' => true,
            'message' => 'CSVテンプレートを生成しました',
            'download_url' => '/modules/yahoo_auction_complete/new_structure/08_listing/temp/' . $filename
        ];
    }
    
    /**
     * Yahooデータダウンロード
     */
    private function downloadYahooData() {
        try {
            if ($this->pdo === null) {
                return [
                    'success' => false,
                    'message' => 'データベース接続が利用できません（デモモード）'
                ];
            }
            
            $sql = "
            SELECT 
                item_id,
                title,
                description,
                price,
                quantity,
                weight,
                dimensions,
                brand,
                condition_name,
                main_image_url,
                additional_images,
                category,
                listing_status,
                created_at
            FROM mystical_japan_treasures_inventory 
            WHERE listing_status IN ('Approved', 'Ready') 
            AND is_active = true
            ORDER BY created_at DESC
            LIMIT 1000
            ";
            
            $stmt = $this->pdo->query($sql);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($products)) {
                return [
                    'success' => false,
                    'message' => '出品対象の商品が見つかりません'
                ];
            }
            
            $filename = 'yahoo_export_' . date('Y-m-d_H-i-s') . '.csv';
            $filepath = __DIR__ . '/temp/' . $filename;
            
            $file = fopen($filepath, 'w');
            
            // UTF-8 BOM付きで保存
            fputs($file, "\xEF\xBB\xBF");
            
            // ヘッダー行
            $headers = [
                'Item ID', 'Title', 'Description', 'Category', 'Condition',
                'Price', 'Quantity', 'Weight', 'Dimensions', 'Brand',
                'Main Image', 'Additional Images', 'Listing Status', 'Created Date'
            ];
            fputcsv($file, $headers);
            
            // データ行
            foreach ($products as $product) {
                $row = [
                    $product['item_id'],
                    $product['title'],
                    $product['description'],
                    $this->mapToEbayCategory($product['category']),
                    $this->mapToEbayCondition($product['condition_name']),
                    $product['price'],
                    $product['quantity'] ?: 1,
                    $product['weight'] ?: '0.5',
                    $product['dimensions'] ?: '10x10x5',
                    $product['brand'] ?: 'Unknown',
                    $product['main_image_url'],
                    $product['additional_images'],
                    $product['listing_status'],
                    $product['created_at']
                ];
                fputcsv($file, $row);
            }
            
            fclose($file);
            
            return [
                'success' => true,
                'message' => count($products) . '件の商品データをエクスポートしました',
                'download_url' => '/modules/yahoo_auction_complete/new_structure/08_listing/temp/' . $filename,
                'count' => count($products)
            ];
            
        } catch (Exception $e) {
            error_log("Yahooデータダウンロードエラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'データ取得エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * CSVアップロード処理
     */
    private function handleCsvUpload() {
        try {
            if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('ファイルのアップロードに失敗しました');
            }
            
            $csvFile = $_FILES['csv_file']['tmp_name'];
            $data = [];
            $errors = [];
            
            if (($handle = fopen($csvFile, 'r')) !== FALSE) {
                $headers = fgetcsv($handle);
                $rowIndex = 1;
                
                while (($row = fgetcsv($handle)) !== FALSE) {
                    $rowIndex++;
                    
                    if (count($row) !== count($headers)) {
                        $errors[] = [
                            'row' => $rowIndex,
                            'message' => 'カラム数が正しくありません'
                        ];
                        continue;
                    }
                    
                    $rowData = array_combine($headers, $row);
                    
                    // バリデーション実行
                    $validationResult = $this->validateRowData($rowData, $rowIndex);
                    if (!$validationResult['valid']) {
                        $errors = array_merge($errors, $validationResult['errors']);
                    } else {
                        $data[] = $rowData;
                    }
                }
                fclose($handle);
            }
            
            // セッションにデータ保存
            $_SESSION['uploaded_products'] = $data;
            $_SESSION['upload_errors'] = $errors;
            
            return [
                'success' => true,
                'message' => 'CSVファイルを処理しました',
                'valid_count' => count($data),
                'error_count' => count($errors),
                'errors' => $errors
            ];
            
        } catch (Exception $e) {
            error_log("CSVアップロードエラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'CSVアップロードエラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 行データバリデーション
     */
    private function validateRowData($rowData, $rowIndex) {
        $errors = [];
        $isValid = true;
        
        // 必須フィールドチェック
        $requiredFields = ['Title', 'Category', 'Price', 'Condition'];
        foreach ($requiredFields as $field) {
            if (empty($rowData[$field])) {
                $errors[] = [
                    'row' => $rowIndex,
                    'field' => $field,
                    'message' => $field . 'は必須です'
                ];
                $isValid = false;
            }
        }
        
        // 価格チェック
        if (!empty($rowData['Price'])) {
            $price = floatval($rowData['Price']);
            if ($price <= 0 || $price > 999999) {
                $errors[] = [
                    'row' => $rowIndex,
                    'field' => 'Price',
                    'message' => '価格は0.01〜999,999の範囲で入力してください'
                ];
                $isValid = false;
            }
        }
        
        // タイトル長さチェック
        if (!empty($rowData['Title']) && mb_strlen($rowData['Title']) > 80) {
            $errors[] = [
                'row' => $rowIndex,
                'field' => 'Title',
                'message' => 'タイトルは80文字以内で入力してください'
            ];
            $isValid = false;
        }
        
        // カテゴリチェック
        if (!empty($rowData['Category']) && !$this->isValidEbayCategory($rowData['Category'])) {
            $errors[] = [
                'row' => $rowIndex,
                'field' => 'Category',
                'message' => '無効なeBayカテゴリIDです'
            ];
            $isValid = false;
        }
        
        return [
            'valid' => $isValid,
            'errors' => $errors
        ];
    }
    
    /**
     * 一括出品実行
     */
    private function bulkListProducts() {
        try {
            $products = $_SESSION['uploaded_products'] ?? [];
            $selectedMarketplaces = $_POST['marketplaces'] ?? ['ebay'];
            $testMode = ($_POST['test_mode'] ?? 'false') === 'true';
            
            if (empty($products)) {
                throw new Exception('出品対象の商品がありません');
            }
            
            $results = [];
            $successCount = 0;
            $errorCount = 0;
            
            foreach ($products as $index => $product) {
                try {
                    // 販路ごとの出品処理
                    if (in_array('ebay', $selectedMarketplaces)) {
                        $listingResult = $this->ebayApi->addFixedPriceItem($product, $testMode);
                        
                        if ($listingResult['success']) {
                            $successCount++;
                            $this->updateMarketplaceMarking($product['Item ID'], ['ebay' => true]);
                        } else {
                            $errorCount++;
                        }
                        
                        $results[] = [
                            'product_id' => $product['Item ID'],
                            'marketplace' => 'ebay',
                            'success' => $listingResult['success'],
                            'message' => $listingResult['message'],
                            'item_id' => $listingResult['item_id'] ?? null
                        ];
                    }
                    
                    // 進捗更新（AJAX対応）
                    if ($index % 10 === 0) {
                        $progress = intval(($index / count($products)) * 100);
                        file_put_contents(__DIR__ . '/temp/progress.txt', $progress);
                    }
                    
                } catch (Exception $e) {
                    $errorCount++;
                    $results[] = [
                        'product_id' => $product['Item ID'],
                        'marketplace' => 'ebay',
                        'success' => false,
                        'message' => 'エラー: ' . $e->getMessage()
                    ];
                }
            }
            
            // 進捗完了
            file_put_contents(__DIR__ . '/temp/progress.txt', 100);
            
            return [
                'success' => true,
                'message' => "出品処理完了: 成功 {$successCount}件、エラー {$errorCount}件",
                'results' => $results,
                'success_count' => $successCount,
                'error_count' => $errorCount
            ];
            
        } catch (Exception $e) {
            error_log("一括出品エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '一括出品エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 自動出品スケジュール作成
     */
    private function createAutoSchedule() {
        try {
            $scheduleData = [
                'schedule_name' => $_POST['schedule_name'] ?? '',
                'frequency_type' => $_POST['frequency_type'] ?? 'weekly',
                'frequency_value' => json_encode($_POST['frequency_value'] ?? []),
                'random_config' => json_encode([
                    'min_items' => intval($_POST['min_items'] ?? 5),
                    'max_items' => intval($_POST['max_items'] ?? 20),
                    'interval_minutes' => [
                        intval($_POST['min_interval'] ?? 30),
                        intval($_POST['max_interval'] ?? 180)
                    ]
                ]),
                'target_marketplaces' => json_encode($_POST['target_marketplaces'] ?? ['ebay']),
                'is_active' => true
            ];
            
            $result = $this->scheduler->createSchedule($scheduleData);
            
            return [
                'success' => $result['success'],
                'message' => $result['message'],
                'schedule_id' => $result['schedule_id'] ?? null
            ];
            
        } catch (Exception $e) {
            error_log("スケジュール作成エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'スケジュール作成エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 販路マーキング更新
     */
    private function updateMarketplaceMarking($itemId, $marketplaces) {
        try {
            if ($this->pdo === null) {
                error_log('データベース接続がないため、販路マーキングをスキップします');
                return;
            }
            
            $sql = "
            UPDATE mystical_japan_treasures_inventory 
            SET marketplace_targets = ? 
            WHERE item_id = ?
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                json_encode($marketplaces),
                $itemId
            ]);
            
        } catch (Exception $e) {
            error_log('販路マーキング保存エラー: ' . $e->getMessage());
        }
    }
    
    /**
     * ヘルパーメソッド
     */
    private function mapToEbayCategory($category) {
        $categoryMap = [
            'ファッション' => 11450,
            '家電' => 293,
            'スポーツ' => 888,
            'ホーム&ガーデン' => 11700,
            'ジュエリー' => 281,
            'おもちゃ' => 220,
            'コレクティブル' => 1,
            'その他' => 99
        ];
        
        return $categoryMap[$category] ?? 99;
    }
    
    private function mapToEbayCondition($condition) {
        $conditionMap = [
            '新品' => 'New',
            '未使用' => 'New other',
            '中古・美品' => 'Used',
            '中古・良品' => 'Used',
            '中古・可' => 'For parts or not working'
        ];
        
        return $conditionMap[$condition] ?? 'Used';
    }
    
    private function isValidEbayCategory($categoryId) {
        // 実際の実装では eBay API でカテゴリを検証
        return is_numeric($categoryId) && $categoryId > 0;
    }
    
    /**
     * データベース接続
     */
    private function getDatabaseConnection() {
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
}

// メイン処理実行
session_start();
$listingSystem = new CompleteListingSystem();

// AJAX リクエスト処理
if (isset($_GET['ajax'])) {
    header('Content-Type: application/json');
    
    if ($_GET['ajax'] === 'progress') {
        $progress = file_exists(__DIR__ . '/temp/progress.txt') 
            ? intval(file_get_contents(__DIR__ . '/temp/progress.txt')) 
            : 0;
        echo json_encode(['progress' => $progress]);
        exit;
    }
    
    $result = $listingSystem->handleRequest();
    echo json_encode($result);
    exit;
}

// 通常のHTTPリクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $result = $listingSystem->handleRequest();
    
    if ($result['success'] && isset($result['download_url'])) {
        // ファイルダウンロード
        $filePath = __DIR__ . $result['download_url'];
        if (file_exists($filePath)) {
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="' . basename($filePath) . '"');
            readfile($filePath);
            exit;
        }
    }
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>統合出品管理システム - Mystical Japan Treasures</title>
    <link href="enhanced_listing.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <header class="main-header">
            <div class="header-content">
                <h1><i class="fas fa-store"></i> 統合出品管理システム</h1>
                <p class="subtitle">CSV編集・一括出品・自動スケジューリング</p>
            </div>
        </header>

        <!-- メインコンテンツ -->
        <main class="main-content">
            <!-- ステップインジケーター -->
            <div class="steps-indicator">
                <div class="step active" data-step="1">
                    <div class="step-number">1</div>
                    <div class="step-title">データ準備</div>
                </div>
                <div class="step" data-step="2">
                    <div class="step-number">2</div>
                    <div class="step-title">CSV編集</div>
                </div>
                <div class="step" data-step="3">
                    <div class="step-number">3</div>
                    <div class="step-title">検証・修正</div>
                </div>
                <div class="step" data-step="4">
                    <div class="step-number">4</div>
                    <div class="step-title">出品実行</div>
                </div>
            </div>

            <!-- セクション1: データ準備 -->
            <section id="data-preparation" class="content-section active">
                <div class="section-header">
                    <h2><i class="fas fa-database"></i> データ準備</h2>
                    <p>CSVテンプレート生成またはYahooデータのダウンロード</p>
                </div>

                <div class="action-cards">
                    <div class="card">
                        <div class="card-icon">
                            <i class="fas fa-file-csv"></i>
                        </div>
                        <h3>CSVテンプレート生成</h3>
                        <p>eBay出品用の標準テンプレートを生成します</p>
                        <button id="generateCsvBtn" class="btn btn-primary">
                            <i class="fas fa-download"></i> テンプレート生成
                        </button>
                    </div>

                    <div class="card">
                        <div class="card-icon">
                            <i class="fas fa-cloud-download-alt"></i>
                        </div>
                        <h3>Yahooデータダウンロード</h3>
                        <p>承認済み商品データをCSV形式でダウンロード</p>
                        <button id="downloadYahooBtn" class="btn btn-success">
                            <i class="fas fa-download"></i> データダウンロード
                        </button>
                    </div>
                </div>
            </section>

            <!-- セクション2: CSV編集・アップロード -->
            <section id="csv-editing" class="content-section">
                <div class="section-header">
                    <h2><i class="fas fa-upload"></i> CSV編集・アップロード</h2>
                    <p>編集済みCSVファイルをアップロードして検証</p>
                </div>

                <div class="upload-area">
                    <div class="upload-zone" id="csvUploadZone">
                        <div class="upload-icon">
                            <i class="fas fa-cloud-upload-alt"></i>
                        </div>
                        <p class="upload-text">CSVファイルをドラッグ&ドロップ</p>
                        <p class="upload-subtext">または</p>
                        <button class="btn btn-outline" onclick="document.getElementById('csvFileInput').click()">
                            ファイルを選択
                        </button>
                        <input type="file" id="csvFileInput" accept=".csv" style="display: none;">
                    </div>
                </div>

                <!-- アップロード結果表示 -->
                <div id="uploadResult" class="upload-result" style="display: none;">
                    <div class="result-summary">
                        <div class="summary-item success">
                            <i class="fas fa-check-circle"></i>
                            <span class="label">有効データ</span>
                            <span class="count" id="validCount">0</span>
                        </div>
                        <div class="summary-item error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span class="label">エラー</span>
                            <span class="count" id="errorCount">0</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- セクション3: エラー表示・個別編集 -->
            <section id="error-handling" class="content-section">
                <div class="section-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> データ検証・エラー修正</h2>
                    <p>エラーのある商品を個別に編集して修正</p>
                </div>

                <div id="errorList" class="error-list" style="display: none;">
                    <!-- エラーテーブルは JavaScript で動的生成 -->
                </div>

                <div id="validDataPreview" class="data-preview" style="display: none;">
                    <h3>有効データプレビュー</h3>
                    <div class="table-container">
                        <table id="validDataTable" class="data-table">
                            <!-- データテーブルは JavaScript で動的生成 -->
                        </table>
                    </div>
                </div>
            </section>

            <!-- セクション4: 出品設定・実行 -->
            <section id="listing-execution" class="content-section">
                <div class="section-header">
                    <h2><i class="fas fa-rocket"></i> 出品実行</h2>
                    <p>販路選択・設定確認後、一括出品を実行</p>
                </div>

                <div class="listing-settings">
                    <div class="settings-group">
                        <h3><i class="fas fa-store"></i> 販路選択</h3>
                        <div class="marketplace-selection">
                            <label class="checkbox-label">
                                <input type="checkbox" id="ebayMarketplace" value="ebay" checked>
                                <span class="checkmark"></span>
                                <span class="marketplace-name">eBay</span>
                                <span class="marketplace-status active">利用可能</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="yahooMarketplace" value="yahoo">
                                <span class="checkmark"></span>
                                <span class="marketplace-name">Yahoo オークション</span>
                                <span class="marketplace-status pending">開発中</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="mercariMarketplace" value="mercari">
                                <span class="checkmark"></span>
                                <span class="marketplace-name">メルカリ</span>
                                <span class="marketplace-status pending">開発中</span>
                            </label>
                        </div>
                    </div>

                    <div class="settings-group">
                        <h3><i class="fas fa-cogs"></i> 出品設定</h3>
                        <div class="setting-item">
                            <label class="switch">
                                <input type="checkbox" id="testMode">
                                <span class="slider"></span>
                            </label>
                            <span class="setting-label">テストモード（Sandbox使用）</span>
                        </div>
                    </div>
                </div>

                <div class="execution-area">
                    <button id="startListingBtn" class="btn btn-large btn-primary" disabled>
                        <i class="fas fa-play"></i> 一括出品開始
                    </button>
                </div>
            </section>

            <!-- セクション5: 自動出品スケジュール -->
            <section id="auto-scheduling" class="content-section">
                <div class="section-header">
                    <h2><i class="fas fa-calendar-alt"></i> 自動出品スケジュール</h2>
                    <p>定期的な自動出品の設定・管理</p>
                </div>

                <div class="schedule-settings">
                    <div class="form-group">
                        <label for="scheduleName">スケジュール名</label>
                        <input type="text" id="scheduleName" placeholder="例: 平日夜間出品">
                    </div>

                    <div class="form-group">
                        <label for="frequencyType">実行頻度</label>
                        <select id="frequencyType">
                            <option value="daily">毎日</option>
                            <option value="weekly" selected>毎週</option>
                            <option value="monthly">毎月</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>実行日時設定</label>
                        <div id="scheduleDetails" class="schedule-details">
                            <!-- JavaScript で動的生成 -->
                        </div>
                    </div>

                    <div class="form-group">
                        <label>ランダム化設定</label>
                        <div class="random-settings">
                            <div class="input-pair">
                                <label>出品件数</label>
                                <input type="number" id="minItems" value="5" min="1"> 〜 
                                <input type="number" id="maxItems" value="20" min="1"> 件
                            </div>
                            <div class="input-pair">
                                <label>間隔時間</label>
                                <input type="number" id="minInterval" value="30" min="1"> 〜 
                                <input type="number" id="maxInterval" value="180" min="1"> 分
                            </div>
                        </div>
                    </div>

                    <button id="createScheduleBtn" class="btn btn-success">
                        <i class="fas fa-plus"></i> スケジュール作成
                    </button>
                </div>

                <!-- 既存スケジュール一覧 -->
                <div class="existing-schedules">
                    <h3>既存スケジュール</h3>
                    <div id="scheduleList" class="schedule-list">
                        <!-- JavaScript で動的読み込み -->
                    </div>
                </div>
            </section>
        </main>

        <!-- プログレスモーダル -->
        <div id="progressModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-spinner fa-spin"></i> 出品処理中</h3>
                </div>
                <div class="modal-body">
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div id="progressBarFill" class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="progress-text">
                            <span id="progressPercent">0%</span>
                            <span id="progressStatus">準備中...</span>
                        </div>
                    </div>
                    <div id="progressLog" class="progress-log">
                        <!-- ログメッセージ -->
                    </div>
                </div>
            </div>
        </div>

        <!-- 編集モーダル -->
        <div id="editModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>商品情報編集</h3>
                    <button class="modal-close" onclick="closeEditModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="editForm">
                        <!-- フォーム要素は JavaScript で動的生成 -->
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeEditModal()">キャンセル</button>
                    <button class="btn btn-primary" onclick="saveEditedProduct()">保存</button>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript -->
    <script>
        // グローバル変数
        let uploadedData = [];
        let validationErrors = [];
        let currentStep = 1;

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            initializeEventListeners();
            updateStepIndicator();
            generateScheduleDetails();
        });

        // イベントリスナー設定
        function initializeEventListeners() {
            // データ準備
            document.getElementById('generateCsvBtn').addEventListener('click', generateCsvTemplate);
            document.getElementById('downloadYahooBtn').addEventListener('click', downloadYahooData);

            // CSVアップロード
            setupDragAndDrop();
            document.getElementById('csvFileInput').addEventListener('change', handleFileSelect);

            // 出品実行
            document.getElementById('startListingBtn').addEventListener('click', startBulkListing);

            // スケジュール
            document.getElementById('frequencyType').addEventListener('change', generateScheduleDetails);
            document.getElementById('createScheduleBtn').addEventListener('click', createAutoSchedule);

            // 販路選択監視
            document.querySelectorAll('input[type="checkbox"][id$="Marketplace"]').forEach(checkbox => {
                checkbox.addEventListener('change', updateListingButton);
            });
        }

        // CSVテンプレート生成
        async function generateCsvTemplate() {
            showLoading('generateCsvBtn');
            
            try {
                const response = await fetch('', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: 'action=generate_csv'
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    downloadBlob(blob, 'ebay_listing_template.csv');
                    showMessage('CSVテンプレートをダウンロードしました', 'success');
                    nextStep();
                } else {
                    throw new Error('テンプレート生成に失敗しました');
                }
            } catch (error) {
                showMessage('エラー: ' + error.message, 'error');
            } finally {
                hideLoading('generateCsvBtn');
            }
        }

        // Yahooデータダウンロード
        async function downloadYahooData() {
            showLoading('downloadYahooBtn');
            
            try {
                const response = await fetch('?ajax=1', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: 'action=download_yahoo_data'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // ファイルダウンロード
                    window.location.href = '?action=download_yahoo_data';
                    showMessage(result.message, 'success');
                    nextStep();
                } else {
                    showMessage('エラー: ' + result.message, 'error');
                }
            } catch (error) {
                showMessage('エラー: ' + error.message, 'error');
            } finally {
                hideLoading('downloadYahooBtn');
            }
        }

        // ドラッグ&ドロップ設定
        function setupDragAndDrop() {
            const uploadZone = document.getElementById('csvUploadZone');
            
            uploadZone.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                uploadZone.classList.add('dragover');
            });
            
            uploadZone.addEventListener('dragleave', function(e) {
                e.preventDefault();
                e.stopPropagation();
                uploadZone.classList.remove('dragover');
            });
            
            uploadZone.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                uploadZone.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handleFileUpload(files[0]);
                }
            });
        }

        // ファイル選択処理
        function handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) {
                handleFileUpload(file);
            }
        }

        // ファイルアップロード処理
        async function handleFileUpload(file) {
            if (!file.name.toLowerCase().endsWith('.csv')) {
                showMessage('CSVファイルを選択してください', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('action', 'upload_csv');
            formData.append('csv_file', file);
            
            try {
                const response = await fetch('?ajax=1', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    displayUploadResult(result);
                    nextStep();
                } else {
                    showMessage('エラー: ' + result.message, 'error');
                }
            } catch (error) {
                showMessage('アップロードエラー: ' + error.message, 'error');
            }
        }

        // アップロード結果表示
        function displayUploadResult(result) {
            document.getElementById('validCount').textContent = result.valid_count;
            document.getElementById('errorCount').textContent = result.error_count;
            document.getElementById('uploadResult').style.display = 'block';
            
            // エラーがある場合はエラーリスト表示
            if (result.error_count > 0) {
                displayErrorList(result.errors);
            }
            
            // 有効データがある場合は出品ボタン有効化
            if (result.valid_count > 0) {
                updateListingButton();
            }
        }

        // エラーリスト表示
        function displayErrorList(errors) {
            const errorList = document.getElementById('errorList');
            const tableHtml = `
                <h3>エラー一覧</h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>行番号</th>
                                <th>フィールド</th>
                                <th>エラー内容</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${errors.map(error => `
                                <tr>
                                    <td>${error.row}</td>
                                    <td>${error.field || '-'}</td>
                                    <td>${error.message}</td>
                                    <td>
                                        <button class="btn btn-small" onclick="editErrorRow(${error.row})">
                                            <i class="fas fa-edit"></i> 編集
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            errorList.innerHTML = tableHtml;
            errorList.style.display = 'block';
        }

        // 一括出品開始
        async function startBulkListing() {
            const selectedMarketplaces = getSelectedMarketplaces();
            const testMode = document.getElementById('testMode').checked;
            
            if (selectedMarketplaces.length === 0) {
                showMessage('販路を選択してください', 'error');
                return;
            }
            
            // 確認ダイアログ
            const confirmMessage = `${selectedMarketplaces.join(', ')}への出品を開始しますか？${testMode ? '\n（テストモードで実行）' : ''}`;
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // プログレスモーダル表示
            showProgressModal();
            
            try {
                const response = await fetch('?ajax=1', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: `action=bulk_list_products&marketplaces=${selectedMarketplaces.join(',')}&test_mode=${testMode}`
                });
                
                const result = await response.json();
                
                hideProgressModal();
                
                if (result.success) {
                    showMessage(result.message, 'success');
                    displayListingResults(result.results);
                } else {
                    showMessage('エラー: ' + result.message, 'error');
                }
            } catch (error) {
                hideProgressModal();
                showMessage('出品エラー: ' + error.message, 'error');
            }
        }

        // プログレスモーダル表示
        function showProgressModal() {
            document.getElementById('progressModal').style.display = 'block';
            
            // プログレス監視開始
            const progressInterval = setInterval(async () => {
                try {
                    const response = await fetch('?ajax=progress');
                    const result = await response.json();
                    
                    updateProgress(result.progress);
                    
                    if (result.progress >= 100) {
                        clearInterval(progressInterval);
                    }
                } catch (error) {
                    console.error('プログレス取得エラー:', error);
                }
            }, 1000);
        }

        // プログレス更新
        function updateProgress(percent) {
            document.getElementById('progressBarFill').style.width = percent + '%';
            document.getElementById('progressPercent').textContent = percent + '%';
            
            if (percent < 25) {
                document.getElementById('progressStatus').textContent = '準備中...';
            } else if (percent < 75) {
                document.getElementById('progressStatus').textContent = '出品処理中...';
            } else if (percent < 100) {
                document.getElementById('progressStatus').textContent = '仕上げ中...';
            } else {
                document.getElementById('progressStatus').textContent = '完了';
            }
        }

        // プログレスモーダル非表示
        function hideProgressModal() {
            document.getElementById('progressModal').style.display = 'none';
        }

        // 自動スケジュール作成
        async function createAutoSchedule() {
            const scheduleData = {
                action: 'create_auto_schedule',
                schedule_name: document.getElementById('scheduleName').value,
                frequency_type: document.getElementById('frequencyType').value,
                frequency_value: getFrequencyValue(),
                min_items: document.getElementById('minItems').value,
                max_items: document.getElementById('maxItems').value,
                min_interval: document.getElementById('minInterval').value,
                max_interval: document.getElementById('maxInterval').value,
                target_marketplaces: getSelectedMarketplaces()
            };
            
            try {
                const response = await fetch('?ajax=1', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: Object.keys(scheduleData).map(key => key + '=' + encodeURIComponent(scheduleData[key])).join('&')
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage('スケジュールを作成しました', 'success');
                    loadScheduleList();
                    clearScheduleForm();
                } else {
                    showMessage('エラー: ' + result.message, 'error');
                }
            } catch (error) {
                showMessage('スケジュール作成エラー: ' + error.message, 'error');
            }
        }

        // スケジュール詳細生成
        function generateScheduleDetails() {
            const frequencyType = document.getElementById('frequencyType').value;
            const detailsContainer = document.getElementById('scheduleDetails');
            
            let html = '';
            
            switch (frequencyType) {
                case 'daily':
                    html = `
                        <div class="time-input">
                            <label>実行時刻</label>
                            <input type="time" id="dailyTime" value="20:00">
                        </div>
                    `;
                    break;
                case 'weekly':
                    html = `
                        <div class="day-selection">
                            <label>実行曜日</label>
                            <div class="day-checkboxes">
                                ${['月', '火', '水', '木', '金', '土', '日'].map((day, index) => `
                                    <label class="checkbox-label">
                                        <input type="checkbox" value="${index + 1}" ${[1, 3, 5].includes(index + 1) ? 'checked' : ''}>
                                        <span class="checkmark"></span>
                                        <span>${day}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div class="time-input">
                            <label>実行時刻</label>
                            <input type="time" id="weeklyTime" value="20:00">
                        </div>
                    `;
                    break;
                case 'monthly':
                    html = `
                        <div class="date-input">
                            <label>実行日</label>
                            <select id="monthlyDate">
                                ${Array.from({length: 28}, (_, i) => `<option value="${i + 1}">${i + 1}日</option>`).join('')}
                            </select>
                        </div>
                        <div class="time-input">
                            <label>実行時刻</label>
                            <input type="time" id="monthlyTime" value="20:00">
                        </div>
                    `;
                    break;
            }
            
            detailsContainer.innerHTML = html;
        }

        // ヘルパー関数
        function getSelectedMarketplaces() {
            const checkboxes = document.querySelectorAll('input[type="checkbox"][id$="Marketplace"]:checked');
            return Array.from(checkboxes).map(cb => cb.value);
        }

        function getFrequencyValue() {
            const frequencyType = document.getElementById('frequencyType').value;
            
            switch (frequencyType) {
                case 'daily':
                    return {time: document.getElementById('dailyTime').value};
                case 'weekly':
                    const days = Array.from(document.querySelectorAll('.day-checkboxes input:checked')).map(cb => cb.value);
                    return {days: days, time: document.getElementById('weeklyTime').value};
                case 'monthly':
                    return {date: document.getElementById('monthlyDate').value, time: document.getElementById('monthlyTime').value};
                default:
                    return {};
            }
        }

        function updateListingButton() {
            const hasValidData = parseInt(document.getElementById('validCount').textContent) > 0;
            const hasSelectedMarketplace = getSelectedMarketplaces().length > 0;
            
            document.getElementById('startListingBtn').disabled = !(hasValidData && hasSelectedMarketplace);
        }

        function nextStep() {
            if (currentStep < 4) {
                currentStep++;
                updateStepIndicator();
                showSection(currentStep);
            }
        }

        function updateStepIndicator() {
            document.querySelectorAll('.step').forEach((step, index) => {
                if (index + 1 <= currentStep) {
                    step.classList.add('active');
                } else {
                    step.classList.remove('active');
                }
            });
        }

        function showSection(step) {
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            const sections = ['', 'data-preparation', 'csv-editing', 'error-handling', 'listing-execution'];
            document.getElementById(sections[step]).classList.add('active');
        }

        function showLoading(buttonId) {
            const button = document.getElementById(buttonId);
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';
        }

        function hideLoading(buttonId) {
            const button = document.getElementById(buttonId);
            button.disabled = false;
            // 元のテキストに戻す処理は個別に実装
        }

        function showMessage(message, type) {
            // 簡易的なメッセージ表示（実際の実装では Toast や Modal を使用）
            alert(message);
        }

        function downloadBlob(blob, filename) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }

        // スケジュール関連の追加関数
        function loadScheduleList() {
            // スケジュール一覧の読み込み（実装省略）
        }

        function clearScheduleForm() {
            document.getElementById('scheduleName').value = '';
            document.getElementById('minItems').value = '5';
            document.getElementById('maxItems').value = '20';
            document.getElementById('minInterval').value = '30';
            document.getElementById('maxInterval').value = '180';
        }

        // エラー行編集
        function editErrorRow(rowNumber) {
            // 編集モーダルの実装（省略）
            alert('行 ' + rowNumber + ' の編集機能（実装中）');
        }

        // 編集モーダル関連
        function closeEditModal() {
            document.getElementById('editModal').style.display = 'none';
        }

        function saveEditedProduct() {
            // 編集保存処理（実装省略）
            closeEditModal();
        }

        // 出品結果表示
        function displayListingResults(results) {
            // 結果表示の実装（省略）
            console.log('出品結果:', results);
        }
    </script>
</body>
</html>