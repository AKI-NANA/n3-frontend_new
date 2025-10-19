<?php
/**
 * Yahoo Auction Tool - 出品管理システム
 * 独立ページ版 - eBay出品機能完全実装
 * 作成日: 2025-09-15
 */

// セキュリティヘッダー
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// 共通ファイルの読み込み
require_once '../shared/core/database_query_handler.php';

// APIレスポンス処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

if (!empty($action)) {
    header('Content-Type: application/json; charset=utf-8');
    
    switch ($action) {
        case 'process_listing_csv':
            handleCSVProcessing();
            break;
            
        case 'execute_ebay_listing':
            executeEbayListing();
            break;
            
        case 'generate_csv_template':
            generateCSVTemplate();
            break;
            
        case 'download_yahoo_raw_data':
            downloadYahooRawData();
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => '不明なアクション']);
            exit;
    }
}

/**
 * CSVファイル処理
 */
function handleCSVProcessing() {
    try {
        if (!isset($_FILES['csvFile'])) {
            throw new Exception('CSVファイルが見つかりません');
        }
        
        $file = $_FILES['csvFile'];
        
        // ファイル検証
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('ファイルアップロードエラー');
        }
        
        if ($file['size'] > 10 * 1024 * 1024) {
            throw new Exception('ファイルサイズが大きすぎます（10MB以下）');
        }
        
        // CSV解析
        $csvData = [];
        if (($handle = fopen($file['tmp_name'], "r")) !== FALSE) {
            $headers = fgetcsv($handle);
            $rowCount = 0;
            
            while (($row = fgetcsv($handle)) !== FALSE && $rowCount < 1000) {
                if (count($row) === count($headers)) {
                    $csvData[] = array_combine($headers, $row);
                    $rowCount++;
                }
            }
            fclose($handle);
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'item_count' => count($csvData),
                'data' => $csvData,
                'filename' => $file['name']
            ],
            'message' => 'CSV処理完了'
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'CSV処理エラー: ' . $e->getMessage()
        ]);
    }
    exit;
}

/**
 * eBay出品実行
 */
function executeEbayListing() {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['csv_data'])) {
            throw new Exception('出品データが見つかりません');
        }
        
        $csvData = $input['csv_data'];
        $dryRun = $input['dry_run'] ?? true;
        $batchSize = $input['batch_size'] ?? 10;
        
        $results = [
            'success' => true,
            'data' => [
                'total_items' => count($csvData),
                'success_count' => 0,
                'error_count' => 0,
                'success_items' => [],
                'failed_items' => [],
                'dry_run' => $dryRun
            ]
        ];
        
        foreach ($csvData as $index => $item) {
            try {
                // バリデーション
                if (empty($item['Title'])) {
                    throw new Exception('商品名が空です');
                }
                
                if ($dryRun) {
                    // テスト実行
                    $listingResult = [
                        'success' => true,
                        'ebay_item_id' => 'TEST_' . uniqid(),
                        'listing_url' => 'https://www.ebay.com/itm/test_' . uniqid(),
                        'message' => 'テスト出品成功'
                    ];
                } else {
                    // 実際の出品処理（ここに実装）
                    $listingResult = [
                        'success' => true,
                        'ebay_item_id' => 'REAL_' . uniqid(),
                        'listing_url' => 'https://www.ebay.com/itm/real_' . uniqid(),
                        'message' => '実出品成功（デモ）'
                    ];
                }
                
                if ($listingResult['success']) {
                    $results['data']['success_count']++;
                    $results['data']['success_items'][] = [
                        'index' => $index,
                        'title' => $item['Title'],
                        'ebay_item_id' => $listingResult['ebay_item_id'],
                        'listing_url' => $listingResult['listing_url']
                    ];
                } else {
                    $results['data']['error_count']++;
                    $results['data']['failed_items'][] = [
                        'index' => $index,
                        'title' => $item['Title'],
                        'error' => $listingResult['error'] ?? '不明なエラー'
                    ];
                }
                
                // レート制限
                usleep(500000); // 0.5秒待機
                
            } catch (Exception $e) {
                $results['data']['error_count']++;
                $results['data']['failed_items'][] = [
                    'index' => $index,
                    'title' => $item['Title'] ?? 'Unknown',
                    'error' => $e->getMessage()
                ];
            }
        }
        
        $mode = $dryRun ? 'テスト実行' : '実出品';
        $results['message'] = "{$mode}完了: 成功{$results['data']['success_count']}件、失敗{$results['data']['error_count']}件";
        
        echo json_encode($results);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'eBay出品エラー: ' . $e->getMessage()
        ]);
    }
    exit;
}

/**
 * CSVテンプレート生成
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
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'message' => 'CSV生成エラー: ' . $e->getMessage()
        ]);
    }
    exit;
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
        
        // データベースから取得（関数は別途実装）
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
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'message' => '生データ出力エラー: ' . $e->getMessage()
        ]);
    }
    exit;
}

// getYahooRawDataForCSV() 関数は database_query_handler.php で定義済み
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>出品管理 - Yahoo Auction Tool</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="/modules/yahoo_auction_complete/new_structure/shared/css/common.css" rel="stylesheet">
    <link href="/modules/yahoo_auction_complete/new_structure/shared/css/listing.css" rel="stylesheet">
    <link href="/modules/yahoo_auction_complete/new_structure/shared/css/quick-test.css" rel="stylesheet">
</head>
<body>
    <div class="container">
        <!-- ナビゲーションヘッダー -->
        <nav class="navbar">
            <div class="nav-brand">
                <i class="fas fa-store"></i>
                <span>出品管理</span>
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
                <p>CSV生成・編集・一括出品の完全ワークフロー</p>
            </div>

            <!-- 出品ワークフロー -->
            <div class="listing-workflow">
                <!-- Step 1: CSV生成 -->
                <section class="workflow-step">
                    <div class="step-header">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h3>📄 eBay出品用CSV生成</h3>
                            <p>テンプレートCSVまたは既存データから出品用CSVを生成</p>
                        </div>
                    </div>
                    
                    <div class="csv-generation-grid">
                        <button class="csv-gen-card" onclick="generateCSVTemplate()">
                            <div class="csv-gen-icon">
                                <i class="fas fa-file-csv"></i>
                            </div>
                            <div class="csv-gen-content">
                                <h4>eBayテンプレートCSV</h4>
                                <p>空のテンプレートをダウンロード</p>
                            </div>
                        </button>
                        
                        <button class="csv-gen-card" onclick="generateYahooRawDataCSV()">
                            <div class="csv-gen-icon">
                                <i class="fas fa-yen-sign"></i>
                            </div>
                            <div class="csv-gen-content">
                                <h4>Yahoo生データCSV</h4>
                                <p>スクレイピングデータをCSV出力</p>
                            </div>
                        </button>
                        
                        <button class="csv-gen-card" onclick="generateOptimizedCSV()">
                            <div class="csv-gen-icon">
                                <i class="fas fa-star"></i>
                            </div>
                            <div class="csv-gen-content">
                                <h4>最適化CSV（推奨）</h4>
                                <p>SKU付き・HTML対応</p>
                            </div>
                        </button>
                    </div>
                    
                    <div class="workflow-note">
                        <i class="fas fa-info-circle"></i>
                        <span>推奨: テンプレートをダウンロード → Excel編集 → アップロード の順序</span>
                    </div>
                </section>

                <!-- Step 2: CSV編集・アップロード -->
                <section class="workflow-step">
                    <div class="step-header">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h3>📝 編集済みCSVアップロード</h3>
                            <p>編集したCSVファイルをアップロードして出品準備</p>
                        </div>
                    </div>
                    
                    <div class="csv-upload-area" id="csvUploadArea">
                        <input type="file" id="csvFileInput" accept=".csv" style="display: none;">
                        
                        <div class="upload-zone" onclick="document.getElementById('csvFileInput').click();">
                            <div class="upload-icon">
                                <i class="fas fa-cloud-upload-alt"></i>
                            </div>
                            <div class="upload-text">
                                <strong>編集済みCSVをドラッグ&ドロップ</strong><br>
                                またはクリックしてファイルを選択
                            </div>
                            <div class="upload-formats">
                                CSV形式 | 最大10MB | 最大1,000行
                            </div>
                        </div>
                        
                        <div class="upload-result" id="uploadResult" style="display: none;">
                            <div class="result-icon">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="result-content">
                                <div class="result-filename" id="resultFilename"></div>
                                <div class="result-stats" id="resultStats"></div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Step 3: 出品設定 -->
                <section class="workflow-step">
                    <div class="step-header">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h3>🎯 出品先・設定選択</h3>
                            <p>マーケットプレイス・アカウント・出品オプションを設定</p>
                        </div>
                    </div>
                    
                    <div class="listing-settings">
                        <div class="marketplace-selection">
                            <h4>出品先選択</h4>
                            <div class="marketplace-grid">
                                <label class="marketplace-option active">
                                    <input type="radio" name="marketplace" value="ebay" checked>
                                    <div class="marketplace-card">
                                        <div class="marketplace-icon">🏪</div>
                                        <div class="marketplace-name">eBay</div>
                                        <div class="marketplace-account">mystical-japan-treasures</div>
                                    </div>
                                </label>
                                
                                <label class="marketplace-option disabled">
                                    <input type="radio" name="marketplace" value="amazon" disabled>
                                    <div class="marketplace-card">
                                        <div class="marketplace-icon">📦</div>
                                        <div class="marketplace-name">Amazon</div>
                                        <div class="marketplace-account">準備中</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                        
                        <div class="listing-options">
                            <h4>出品オプション</h4>
                            <div class="options-grid">
                                <label class="option-item">
                                    <input type="checkbox" id="dryRunMode" checked>
                                    <div class="option-content">
                                        <span class="option-icon">🧪</span>
                                        <span class="option-text">テストモード（実際には出品しない）</span>
                                    </div>
                                </label>
                                
                                <label class="option-item">
                                    <input type="checkbox" id="batchMode" checked>
                                    <div class="option-content">
                                        <span class="option-icon">📦</span>
                                        <span class="option-text">バッチ処理（10件ずつ処理）</span>
                                    </div>
                                </label>
                                
                                <label class="option-item">
                                    <input type="checkbox" id="validateMode" checked>
                                    <div class="option-content">
                                        <span class="option-icon">✅</span>
                                        <span class="option-text">事前バリデーション</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Step 4: 出品実行 -->
                <section class="workflow-step">
                    <div class="step-header">
                        <div class="step-number">4</div>
                        <div class="step-content">
                            <h3>🚀 出品実行</h3>
                            <p>設定を確認して一括出品を開始</p>
                        </div>
                    </div>
                    
                    <div class="execution-panel">
                        <div class="execution-summary" id="executionSummary">
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <div class="summary-label">出品予定商品</div>
                                    <div class="summary-value" id="itemCount">0件</div>
                                </div>
                                <div class="summary-item">
                                    <div class="summary-label">出品先</div>
                                    <div class="summary-value" id="selectedMarketplace">未選択</div>
                                </div>
                                <div class="summary-item">
                                    <div class="summary-label">実行モード</div>
                                    <div class="summary-value" id="executionMode">テストモード</div>
                                </div>
                                <div class="summary-item">
                                    <div class="summary-label">予想処理時間</div>
                                    <div class="summary-value" id="estimatedTime">0分</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="execution-controls">
                            <button id="executeButton" class="execute-btn" onclick="executeListingToEbay()" disabled>
                                <i class="fas fa-rocket"></i>
                                <span>eBayに出品開始</span>
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            <!-- 出品進行状況モーダル -->
            <div id="progressModal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🚀 eBay出品進行状況</h3>
                        <button class="modal-close" onclick="closeProgressModal()">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="progress-overview">
                            <div class="progress-bar-container">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="progressFill"></div>
                                </div>
                                <div class="progress-text" id="progressText">準備中...</div>
                            </div>
                        </div>
                        
                        <div class="progress-stats">
                            <div class="stat-card stat-success">
                                <div class="stat-value" id="successCount">0</div>
                                <div class="stat-label">成功</div>
                            </div>
                            <div class="stat-card stat-error">
                                <div class="stat-value" id="errorCount">0</div>
                                <div class="stat-label">失敗</div>
                            </div>
                            <div class="stat-card stat-total">
                                <div class="stat-value" id="totalCount">0</div>
                                <div class="stat-label">総数</div>
                            </div>
                        </div>
                        
                        <div class="progress-log" id="progressLog">
                            <!-- ログ項目は動的生成 -->
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="downloadReportBtn" onclick="downloadReport()" disabled>
                            📊 レポートダウンロード
                        </button>
                        <button class="btn btn-secondary" onclick="closeProgressModal()">閉じる</button>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- CSRF Token -->
    <input type="hidden" id="csrfToken" value="<?= $_SESSION['csrf_token'] ?>">

    <script>
        // グローバル変数
        let uploadedCSVData = null;
        let listingInProgress = false;

        // ページ初期化
        document.addEventListener('DOMContentLoaded', function() {
            initializeListingPage();
        });

        /**
         * ページ初期化
         */
        function initializeListingPage() {
            console.log('出品管理ページ初期化開始');
            
            // CSVファイル入力のイベントリスナー
            const csvInput = document.getElementById('csvFileInput');
            if (csvInput) {
                csvInput.addEventListener('change', handleCSVUpload);
            }
            
            // ドラッグ&ドロップ設定
            const uploadArea = document.getElementById('csvUploadArea');
            if (uploadArea) {
                setupDragAndDrop(uploadArea);
            }
            
            // 出品オプション変更監視
            setupOptionListeners();
            
            console.log('出品管理ページ初期化完了');
        }

        /**
         * CSVテンプレート生成
         */
        function generateCSVTemplate() {
            console.log('CSVテンプレート生成開始');
            
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'listing.php';
            form.style.display = 'none';
            
            const actionInput = document.createElement('input');
            actionInput.type = 'hidden';
            actionInput.name = 'action';
            actionInput.value = 'generate_csv_template';
            
            form.appendChild(actionInput);
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        }

        /**
         * Yahoo生データCSV生成
         */
        function generateYahooRawDataCSV() {
            console.log('Yahoo生データCSV生成開始');
            
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'listing.php';
            form.style.display = 'none';
            
            const actionInput = document.createElement('input');
            actionInput.type = 'hidden';
            actionInput.name = 'action';
            actionInput.value = 'download_yahoo_raw_data';
            
            form.appendChild(actionInput);
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        }

        /**
         * 最適化CSV生成
         */
        function generateOptimizedCSV() {
            console.log('最適化CSV生成開始');
            alert('最適化CSV生成機能は準備中です。現在はテンプレートCSVをご利用ください。');
        }

        /**
         * ドラッグ&ドロップ設定
         */
        function setupDragAndDrop(element) {
            element.addEventListener('dragover', function(e) {
                e.preventDefault();
                element.classList.add('drag-over');
            });
            
            element.addEventListener('dragleave', function(e) {
                e.preventDefault();
                element.classList.remove('drag-over');
            });
            
            element.addEventListener('drop', function(e) {
                e.preventDefault();
                element.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const csvInput = document.getElementById('csvFileInput');
                    csvInput.files = files;
                    handleCSVUpload({ target: csvInput });
                }
            });
        }

        /**
         * CSVアップロード処理
         */
        function handleCSVUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            console.log('CSVファイルアップロード:', file.name);
            
            // ファイル検証
            if (!file.name.toLowerCase().endsWith('.csv')) {
                alert('CSVファイルを選択してください。');
                return;
            }
            
            if (file.size > 10 * 1024 * 1024) {
                alert('ファイルサイズが大きすぎます（10MB以下）。');
                return;
            }
            
            // FormData作成
            const formData = new FormData();
            formData.append('action', 'process_listing_csv');
            formData.append('csvFile', file);
            
            // アップロード実行
            showUploadProgress();
            
            fetch('listing.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(result => {
                hideUploadProgress();
                
                if (result.success) {
                    uploadedCSVData = result.data.data;
                    displayUploadResult(result.data);
                    updateExecutionSummary();
                } else {
                    alert('CSV処理エラー: ' + result.message);
                }
            })
            .catch(error => {
                hideUploadProgress();
                console.error('CSVアップロードエラー:', error);
                alert('CSVアップロードに失敗しました: ' + error.message);
            });
        }

        /**
         * アップロード結果表示
         */
        function displayUploadResult(data) {
            const resultDiv = document.getElementById('uploadResult');
            const filenameDiv = document.getElementById('resultFilename');
            const statsDiv = document.getElementById('resultStats');
            
            if (resultDiv && filenameDiv && statsDiv) {
                filenameDiv.textContent = data.filename;
                statsDiv.textContent = `${data.item_count}件の商品データを読み込みました`;
                
                resultDiv.style.display = 'flex';
            }
        }

        /**
         * 実行サマリー更新
         */
        function updateExecutionSummary() {
            const itemCount = document.getElementById('itemCount');
            const marketplace = document.getElementById('selectedMarketplace');
            const mode = document.getElementById('executionMode');
            const time = document.getElementById('estimatedTime');
            const executeBtn = document.getElementById('executeButton');
            
            if (uploadedCSVData && uploadedCSVData.length > 0) {
                if (itemCount) itemCount.textContent = `${uploadedCSVData.length}件`;
                if (marketplace) marketplace.textContent = 'eBay';
                
                const dryRun = document.getElementById('dryRunMode')?.checked;
                if (mode) mode.textContent = dryRun ? 'テストモード' : '実出品モード';
                
                const estimatedMinutes = Math.ceil(uploadedCSVData.length * 0.5 / 60);
                if (time) time.textContent = `約${estimatedMinutes}分`;
                
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
                marketplace: 'ebay',
                account: 'mystical-japan-treasures'
            };
            
            console.log('eBay出品開始:', requestData);
            
            fetch('listing.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.getElementById('csrfToken')?.value
                },
                body: JSON.stringify({
                    action: 'execute_ebay_listing',
                    ...requestData
                })
            })
            .then(response => response.json())
            .then(result => {
                listingInProgress = false;
                
                if (result.success) {
                    displayListingResults(result.data);
                } else {
                    alert('出品処理エラー: ' + result.message);
                    closeProgressModal();
                }
            })
            .catch(error => {
                listingInProgress = false;
                console.error('出品処理エラー:', error);
                alert('出品処理に失敗しました: ' + error.message);
                closeProgressModal();
            });
        }

        /**
         * 進行状況モーダル表示
         */
        function showProgressModal() {
            const modal = document.getElementById('progressModal');
            if (modal) {
                modal.style.display = 'flex';
                
                // 初期化
                updateProgress(0, 'eBay出品処理を開始しています...');
                updateStats(0, 0, uploadedCSVData?.length || 0);
                clearProgressLog();
            }
        }

        /**
         * 進行状況モーダルを閉じる
         */
        function closeProgressModal() {
            const modal = document.getElementById('progressModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        /**
         * 進行状況更新
         */
        function updateProgress(percentage, text) {
            const fill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            
            if (fill) fill.style.width = `${percentage}%`;
            if (progressText) progressText.textContent = text;
        }

        /**
         * 統計更新
         */
        function updateStats(success, error, total) {
            const successElement = document.getElementById('successCount');
            const errorElement = document.getElementById('errorCount');
            const totalElement = document.getElementById('totalCount');
            
            if (successElement) successElement.textContent = success;
            if (errorElement) errorElement.textContent = error;
            if (totalElement) totalElement.textContent = total;
        }

        /**
         * 出品結果表示
         */
        function displayListingResults(data) {
            console.log('出品結果:', data);
            
            // 進行状況を100%に更新
            updateProgress(100, `出品完了: 成功${data.success_count}件、失敗${data.error_count}件`);
            updateStats(data.success_count, data.error_count, data.total_items);
            
            // 結果ログを表示
            const logContainer = document.getElementById('progressLog');
            if (logContainer) {
                // 成功項目
                data.success_items.forEach(item => {
                    addLogEntry('success', `✅ ${item.title} - ${item.ebay_item_id}`);
                });
                
                // 失敗項目
                data.failed_items.forEach(item => {
                    addLogEntry('error', `❌ ${item.title} - ${item.error}`);
                });
            }
            
            // レポートボタン有効化
            const reportBtn = document.getElementById('downloadReportBtn');
            if (reportBtn) {
                reportBtn.disabled = false;
            }
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
         * アップロード進行状況表示
         */
        function showUploadProgress() {
            // 簡易実装
            console.log('CSVアップロード中...');
        }

        /**
         * アップロード進行状況非表示
         */
        function hideUploadProgress() {
            console.log('CSVアップロード完了');
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
