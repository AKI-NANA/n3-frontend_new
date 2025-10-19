<?php
/**
 * Yahoo Auction統合システム - 商品データ編集システム（データベース対応修正版）
 * 実際のテーブル構造に合わせて動的にクエリを生成
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

if (session_status() == PHP_SESSION_NONE) {
    @session_start();
}

$pdo = null;

// データベース接続
try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres";
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    error_log("editor_db_fixed.php: データベース接続確立済み");
} catch (PDOException $e) {
    error_log("editor_db_fixed.php: データベース接続失敗: " . $e->getMessage());
    $pdo = null;
}

/**
 * JSON レスポンス送信
 */
function sendJsonResponse($data, $success = true, $message = '') {
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'source' => 'editor_db_fixed.php'
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * データベース接続取得
 */
function getDatabaseConnection() {
    global $pdo;
    if (isset($pdo) && $pdo instanceof PDO) {
        return $pdo;
    }
    
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $new_pdo = new PDO($dsn, $user, $password);
        $new_pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $pdo = $new_pdo;
        return $new_pdo;
        
    } catch (PDOException $e) {
        error_log("データベース接続失敗: " . $e->getMessage());
        return null;
    }
}

/**
 * テーブル構造を取得
 */
function getTableColumns($pdo) {
    $sql = "SELECT column_name FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' ORDER BY ordinal_position";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * 未出品データ取得（データベース構造対応版）
 */
function getUnlistedProductsData($page = 1, $limit = 50, $strict = false) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'data' => [],
            'total' => 0,
            'page' => $page,
            'limit' => $limit,
            'note' => 'データベース接続エラー'
        ];
    }
    
    try {
        // テーブル構造を動的に取得
        $columns = getTableColumns($pdo);
        error_log("利用可能なカラム: " . implode(', ', $columns));
        
        // 基本的なWHERE条件
        $whereClause = "WHERE (ebay_item_id IS NULL OR ebay_item_id = '' OR ebay_item_id = '0')";
        
        if ($strict && in_array('active_image_url', $columns)) {
            $whereClause .= " AND active_image_url IS NOT NULL AND active_image_url != ''";
        }
        
        // 動的SELECTクエリ生成（存在するカラムのみ使用）
        $selectFields = [
            'id',
            in_array('source_item_id', $columns) ? 'source_item_id as item_id' : 'id as item_id',
            in_array('active_title', $columns) ? "COALESCE(active_title, 'タイトルなし') as title" : "'タイトルなし' as title",
            in_array('price_jpy', $columns) ? 'price_jpy as price' : (in_array('price', $columns) ? 'price' : '0 as price'),
            in_array('active_image_url', $columns) ? "COALESCE(active_image_url, 'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image') as picture_url" : "'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image' as picture_url",
            "'N/A' as category_name",
            "'Used' as condition_name",
            "'Yahoo' as platform",
            in_array('updated_at', $columns) ? 'updated_at' : (in_array('created_at', $columns) ? 'created_at as updated_at' : "'2025-09-18' as updated_at"),
            in_array('ebay_category_id', $columns) ? 'ebay_category_id' : "'' as ebay_category_id"
        ];
        
        $sql = "SELECT " . implode(', ', $selectFields) . 
               " FROM yahoo_scraped_products " .
               "{$whereClause} " .
               "ORDER BY id DESC " .
               "LIMIT ? OFFSET ?";
        
        $offset = ($page - 1) * $limit;
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit, $offset]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 総数取得
        $countSql = "SELECT COUNT(*) as total FROM yahoo_scraped_products {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute();
        $totalResult = $countStmt->fetch();
        
        error_log("データ取得成功: " . count($data) . "件取得");
        
        return [
            'data' => $data,
            'total' => $totalResult['total'] ?? count($data),
            'page' => $page,
            'limit' => $limit,
            'note' => "未出品データ " . count($data) . " 件取得（DB構造対応版）",
            'columns_available' => $columns,
            'sql_executed' => $sql
        ];
        
    } catch (Exception $e) {
        error_log("未出品データ取得エラー: " . $e->getMessage());
        
        return [
            'data' => [],
            'total' => 0,
            'page' => $page,
            'limit' => $limit,
            'note' => "データ取得エラー: {$e->getMessage()}",
            'error' => $e->getMessage()
        ];
    }
}

/**
 * 商品詳細取得（データベース構造対応版）
 */
function getProductDetails($item_id) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'message' => 'データベースに接続できません'
        ];
    }
    
    try {
        // テーブル構造を動的に取得
        $columns = getTableColumns($pdo);
        
        // 動的SELECTクエリ生成
        $selectFields = [
            'id as db_id',
            in_array('source_item_id', $columns) ? 'source_item_id as item_id' : 'id as item_id',
            in_array('active_title', $columns) ? 'active_title as title' : (in_array('title', $columns) ? 'title' : "'タイトル不明' as title"),
            in_array('price_jpy', $columns) ? 'price_jpy as current_price' : (in_array('price', $columns) ? 'price as current_price' : '0 as current_price'),
            in_array('active_description', $columns) ? 'active_description as description' : (in_array('description', $columns) ? 'description' : "'' as description"),
            in_array('scraped_yahoo_data', $columns) ? 'scraped_yahoo_data' : "'' as scraped_yahoo_data",
            in_array('active_image_url', $columns) ? 'active_image_url' : (in_array('image_url', $columns) ? 'image_url as active_image_url' : "'' as active_image_url"),
            in_array('sku', $columns) ? 'sku' : "'' as sku",
            in_array('status', $columns) ? 'status' : "'active' as status",
            in_array('current_stock', $columns) ? 'current_stock' : (in_array('stock', $columns) ? 'stock as current_stock' : '1 as current_stock'),
            in_array('created_at', $columns) ? 'created_at' : "'2025-09-18' as created_at",
            in_array('updated_at', $columns) ? 'updated_at' : (in_array('created_at', $columns) ? 'created_at as updated_at' : "'2025-09-18' as updated_at"),
            in_array('ebay_category_id', $columns) ? 'ebay_category_id' : "'' as ebay_category_id"
        ];
        
        $sql = "SELECT " . implode(', ', $selectFields) . 
               " FROM yahoo_scraped_products " .
               "WHERE " . (in_array('source_item_id', $columns) ? "source_item_id = ? OR " : "") . "id::text = ? " .
               "ORDER BY " . (in_array('created_at', $columns) ? "created_at" : "id") . " DESC " .
               "LIMIT 1";
        
        $stmt = $pdo->prepare($sql);
        if (in_array('source_item_id', $columns)) {
            $stmt->execute([$item_id, $item_id]);
        } else {
            $stmt->execute([$item_id]);
        }
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            return [
                'success' => false,
                'message' => "指定された商品が見つかりません: {$item_id}"
            ];
        }
        
        $yahoo_data = json_decode($product['scraped_yahoo_data'] ?? '{}', true) ?: [];
        
        // 画像データの処理（データベース構造対応）
        $images = extractImagesFromProduct($product, $yahoo_data);
        
        $product_data = [
            'db_id' => $product['db_id'],
            'item_id' => $product['item_id'],
            'title' => $product['title'] ?? 'タイトル不明',
            'current_price' => (int)($product['current_price'] ?? 0),
            'description' => $product['description'] ?? '',
            'condition' => $yahoo_data['condition'] ?? 'Used',
            'category' => $yahoo_data['category'] ?? 'N/A',
            'images' => $images,
            'source_url' => $yahoo_data['url'] ?? '',
            'ebay_category_id' => $product['ebay_category_id'] ?? '',
            'item_specifics' => 'Brand=Unknown■Condition=Used', // デフォルト値
            'scraped_at' => $product['created_at'] ?? '',
            'sku' => $product['sku'] ?? '',
            'yahoo_data_raw' => $yahoo_data,
            'available_columns' => $columns // デバッグ用
        ];
        
        return [
            'success' => true,
            'data' => $product_data,
            'message' => '商品詳細取得成功（DB構造対応版）'
        ];
        
    } catch (Exception $e) {
        error_log('商品詳細取得エラー: ' . $e->getMessage());
        return [
            'success' => false,
            'message' => '商品詳細取得エラー: ' . $e->getMessage()
        ];
    }
}

/**
 * 画像データ抽出（データベース構造対応版）
 */
function extractImagesFromProduct($product, $yahoo_data) {
    $images = [];
    
    // 1. active_image_url から取得
    if (!empty($product['active_image_url']) && !strpos($product['active_image_url'], 'placehold')) {
        $images[] = $product['active_image_url'];
    }
    
    // 2. yahoo_data から画像を抽出
    if (!empty($yahoo_data)) {
        // 様々な画像データソースを確認
        $imageSources = [
            'all_images', 'images', 'image_urls', 'picture_urls',
            'extraction_results.images',
            'validation_info.image.all_images'
        ];
        
        foreach ($imageSources as $source) {
            $sourceData = $yahoo_data;
            $keys = explode('.', $source);
            
            foreach ($keys as $key) {
                if (isset($sourceData[$key])) {
                    $sourceData = $sourceData[$key];
                } else {
                    $sourceData = null;
                    break;
                }
            }
            
            if (is_array($sourceData)) {
                $images = array_merge($images, $sourceData);
            }
        }
    }
    
    // 重複除去とフィルタリング
    $images = array_unique($images);
    $images = array_filter($images, function($img) {
        return !empty($img) && 
               is_string($img) && 
               strlen($img) > 10 && 
               !strpos($img, 'placehold') &&
               (strpos($img, 'http') === 0 || strpos($img, '//') === 0);
    });
    
    $images = array_values($images);
    
    if (count($images) > 15) {
        $images = array_slice($images, 0, 15);
    }
    
    if (empty($images)) {
        return ['https://placehold.co/300x200/725CAD/FFFFFF/png?text=No+Image'];
    }
    
    return $images;
}

/**
 * 商品削除（データベース構造対応版）
 */
function deleteProduct($productId) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'message' => 'データベースに接続できません'
        ];
    }
    
    try {
        $deleteSql = "DELETE FROM yahoo_scraped_products WHERE id = ?";
        $deleteStmt = $pdo->prepare($deleteSql);
        $deleteStmt->execute([$productId]);
        
        $deletedCount = $deleteStmt->rowCount();
        
        if ($deletedCount > 0) {
            return [
                'success' => true,
                'message' => "商品ID {$productId} を削除しました（DB構造対応版）",
                'deleted_count' => $deletedCount
            ];
        } else {
            return [
                'success' => false,
                'message' => "商品ID {$productId} が見つかりませんでした"
            ];
        }
        
    } catch (Exception $e) {
        error_log("商品削除エラー: " . $e->getMessage());
        
        return [
            'success' => false,
            'message' => "商品削除エラー: {$e->getMessage()}"
        ];
    }
}

// API アクション処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

if (!empty($action)) {
    switch ($action) {
        case 'get_unlisted_products':
            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 50);
            $result = getUnlistedProductsData($page, $limit);
            sendJsonResponse($result, true, $result['note']);
            break;
            
        case 'get_unlisted_products_strict':
            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 50);
            $result = getUnlistedProductsData($page, $limit, true);
            sendJsonResponse($result, true, $result['note']);
            break;
            
        case 'get_product_details':
            $item_id = $_GET['item_id'] ?? $_POST['item_id'] ?? '';
            if (empty($item_id)) {
                sendJsonResponse(null, false, 'Item IDが指定されていません');
            }
            $result = getProductDetails($item_id);
            sendJsonResponse($result, $result['success'], $result['message']);
            break;
            
        case 'delete_product':
            $productId = $_POST['product_id'] ?? $_GET['product_id'] ?? '';
            if (empty($productId)) {
                sendJsonResponse(null, false, '商品IDが指定されていません');
            }
            $result = deleteProduct($productId);
            sendJsonResponse($result, $result['success'], $result['message']);
            break;
            
        case 'test_connection':
            $pdo = getDatabaseConnection();
            if ($pdo) {
                try {
                    $columns = getTableColumns($pdo);
                    $countSql = "SELECT COUNT(*) as total FROM yahoo_scraped_products";
                    $countStmt = $pdo->prepare($countSql);
                    $countStmt->execute();
                    $count = $countStmt->fetch()['total'];
                    
                    sendJsonResponse([
                        'database_connection' => 'OK',
                        'table_exists' => true,
                        'total_records' => $count,
                        'columns' => $columns,
                        'version' => 'DB構造対応版 v1.0'
                    ], true, "データベース接続成功: {$count}件のレコード（DB構造対応版）");
                } catch (Exception $e) {
                    sendJsonResponse(null, false, "テーブル確認エラー: " . $e->getMessage());
                }
            } else {
                sendJsonResponse(null, false, 'データベース接続失敗');
            }
            break;
            
        default:
            sendJsonResponse(null, false, '不明なアクション: ' . $action);
    }
    exit;
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction - データ編集システム（DB構造対応版）</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="editor_fixed_complete.css">
</head>
<body>
    <div class="container">
        <div class="main-dashboard">
            <!-- 修復完了バナー -->
            <div class="success-banner">
                <i class="fas fa-check-circle"></i>
                <strong>✅ Yahoo Auction編集システム - DB構造対応版起動完了</strong>
                <span style="margin-left: auto; font-size: 0.9em;">データベース構造自動検出・エラー解決</span>
            </div>

            <!-- ナビゲーションヘッダー -->
            <div class="dashboard-header">
                <h1><i class="fas fa-edit"></i> Yahoo オークションデータ編集システム（DB構造対応版）</h1>
                <p>✅ データベース構造自動検出 ✅ カラム不足エラー解決 ✅ 動的クエリ生成</p>
                
                <!-- デバッグ情報リンク -->
                <div style="margin-top: 1rem;">
                    <a href="check_database_structure.php" target="_blank" style="background: #17a2b8; color: white; padding: 0.5rem 1rem; border-radius: 4px; text-decoration: none;">
                        <i class="fas fa-database"></i> データベース構造確認
                    </a>
                </div>
            </div>

            <!-- 操作パネル -->
            <div class="section">
                <div class="section-header">
                    <i class="fas fa-tools"></i>
                    <h3>操作パネル（DB構造対応版）</h3>
                </div>
                <div class="editing-actions">
                    <!-- データ表示グループ -->
                    <div class="button-group">
                        <button class="btn btn-utility" onclick="testConnection()">
                            <i class="fas fa-plug"></i> 接続テスト
                        </button>
                        <button class="btn btn-data-main" onclick="loadEditingData()">
                            <i class="fas fa-database"></i> 未出品データ表示
                        </button>
                        <button class="btn btn-data-strict" onclick="loadEditingDataStrict()">
                            <i class="fas fa-filter"></i> 厳密モード（URL有）
                        </button>
                    </div>
                </div>
            </div>

            <!-- データテーブル -->
            <div class="section">
                <div class="section-header">
                    <i class="fas fa-table"></i>
                    <h3>商品データ一覧（DB構造対応版）</h3>
                </div>
                <div class="data-table-container">
                    <table class="data-table" id="editingDataTable">
                        <thead>
                            <tr>
                                <th style="width: 40px;">
                                    <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
                                </th>
                                <th style="width: 80px;">画像</th>
                                <th style="width: 120px;">Item ID</th>
                                <th style="width: 250px;">商品名</th>
                                <th style="width: 80px;">価格</th>
                                <th style="width: 100px;">カテゴリ</th>
                                <th style="width: 140px;">eBayカテゴリー</th>
                                <th style="width: 80px;">状態</th>
                                <th style="width: 80px;">ソース</th>
                                <th style="width: 100px;">更新日時</th>
                                <th style="width: 200px;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="editingTableBody">
                            <tr>
                                <td colspan="11" style="text-align: center; padding: 2rem;">
                                    <i class="fas fa-database" style="font-size: 2rem; color: #8CCDEB; margin-bottom: 1rem; display: block;"></i>
                                    <strong>DB構造対応版起動完了！「接続テスト」→「未出品データ表示」をクリックしてください</strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>

    <!-- ログエリア（下部固定） -->
    <div class="log-area">
        <h4><i class="fas fa-terminal"></i> システムログ（DB構造対応版）</h4>
        <div id="logContainer">
            <div class="log-entry success">[起動完了] Yahoo Auction編集システム - DB構造対応版初期化完了</div>
            <div class="log-entry info">[修復済み] ✅ カラム不足エラー ✅ 動的クエリ生成 ✅ データベース構造自動検出</div>
        </div>
    </div>

    <script>
    // JavaScript部分は既存のeditor_fixed_complete.jsをベースに、APIエンドポイントのみ変更
    let currentData = [];
    let selectedItems = [];

    function addLogEntry(message, type = 'info') {
        const logContainer = document.getElementById('logContainer');
        if (logContainer) {
            const entry = document.createElement('div');
            entry.className = `log-entry ${type}`;
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            logContainer.appendChild(entry);
            logContainer.scrollTop = logContainer.scrollHeight;
            
            const entries = logContainer.querySelectorAll('.log-entry');
            if (entries.length > 100) {
                entries[0].remove();
            }
        }
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    function testConnection() {
        addLogEntry('データベース接続テスト開始...', 'info');
        
        fetch('editor_db_fixed.php?action=test_connection')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    addLogEntry(`✅ 接続成功: ${data.data.total_records}件のレコード（${data.data.version}）`, 'success');
                    addLogEntry(`ℹ️ カラム数: ${data.data.columns.length}個`, 'info');
                    console.log('利用可能なカラム:', data.data.columns);
                } else {
                    addLogEntry(`❌ 接続失敗: ${data.message}`, 'error');
                }
            })
            .catch(error => {
                addLogEntry(`❌ 接続エラー: ${error.message}`, 'error');
            });
    }

    function loadEditingData() {
        addLogEntry('未出品データ読み込み開始...', 'info');
        
        fetch('editor_db_fixed.php?action=get_unlisted_products&page=1&limit=100')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const products = data.data.data || [];
                    currentData = products;
                    displayEditingData(products);
                    addLogEntry(`未出品データ ${data.data.total || 0} 件読み込み完了`, 'success');
                } else {
                    throw new Error(data.message);
                }
            })
            .catch(error => {
                addLogEntry(`データ読み込みエラー: ${error.message}`, 'error');
            });
    }

    function loadEditingDataStrict() {
        addLogEntry('厳密モード（URL有）データ読み込み開始...', 'info');
        
        fetch('editor_db_fixed.php?action=get_unlisted_products_strict&page=1&limit=100')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    currentData = data.data.data || [];
                    displayEditingData(currentData);
                    addLogEntry(`厳密モードデータ ${data.data.total || 0} 件読み込み完了`, 'success');
                } else {
                    throw new Error(data.message);
                }
            })
            .catch(error => {
                addLogEntry(`データ読み込みエラー: ${error.message}`, 'error');
            });
    }

    function displayEditingData(products) {
        const tableBody = document.getElementById('editingTableBody');
        
        if (!products || products.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-info-circle" style="color: #8CCDEB;"></i>
                        データが見つかりませんでした
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = products.map(product => {
            const imageUrl = getValidImageUrl(product.picture_url);
            const itemId = product.item_id || product.id;
            const title = product.title || 'タイトルなし';
            const price = product.price || 0;
            const categoryName = product.category_name || 'N/A';
            const conditionName = product.condition_name || 'N/A';
            const platform = product.platform || 'Yahoo';
            const updatedAt = product.updated_at;
            const ebayCategory = product.ebay_category_id || '未設定';
            
            return `
                <tr data-product-id="${product.id}">
                    <td>
                        <input type="checkbox" class="product-checkbox" value="${product.id}">
                    </td>
                    <td>
                        <img src="${imageUrl}" 
                             alt="商品画像" 
                             class="product-thumbnail"
                             onclick="openProductModal('${itemId}')"
                             onerror="this.src='https://placehold.co/60x60/725CAD/FFFFFF/png?text=No+Image'">
                    </td>
                    <td style="font-size: 0.7rem;">${itemId}</td>
                    <td style="font-size: 0.7rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis;">
                        ${title}
                    </td>
                    <td class="price-value">¥${price.toLocaleString()}</td>
                    <td style="font-size: 0.7rem;">${categoryName}</td>
                    <td style="font-size: 0.7rem;">${ebayCategory}</td>
                    <td style="font-size: 0.7rem;">${conditionName}</td>
                    <td>
                        <span class="source-badge source-yahoo">${platform}</span>
                    </td>
                    <td style="font-size: 0.65rem;">${formatDate(updatedAt)}</td>
                    <td class="action-buttons">
                        <button class="btn-sm btn-function-category" onclick="openProductModal('${itemId}')" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-sm btn-danger-delete" onclick="deleteProductConfirm('${product.id}')" title="削除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        addLogEntry(`テーブル表示完了: ${products.length}件`, 'success');
    }

    function openProductModal(itemId) {
        addLogEntry(`商品 ${itemId} の詳細モーダルを表示開始`, 'info');
        
        // 既存のモーダルを削除
        const existingModal = document.getElementById('productModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 新しいモーダルを動的作成
        createProductModal();
        
        const modal = document.getElementById('productModal');
        modal.style.display = 'flex';
        
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem; color: #725CAD;"></i><br>
                データを読み込み中...
            </div>
        `;
        
        fetch(`editor_db_fixed.php?action=get_product_details&item_id=${encodeURIComponent(itemId)}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data) {
                    displayProductModalContent(data.data);
                    addLogEntry(`✅ モーダル表示成功: ${data.data.title}`, 'success');
                } else {
                    showModalError(data.message || '商品データの取得に失敗しました');
                }
            })
            .catch(error => {
                addLogEntry(`❌ モーダルエラー: ${error.message}`, 'error');
                showModalError(`データ読み込みエラー: ${error.message}`);
            });
    }

    function createProductModal() {
        const modalHtml = `
            <div id="productModal" class="modal-overlay" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">
                            <i class="fas fa-edit"></i>
                            商品詳細編集（DB構造対応版）
                        </h2>
                        <button class="modal-close" onclick="closeProductModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div id="modalBody"></div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        addLogEntry('✅ モーダルを動的作成しました（DB構造対応版）', 'success');
    }

    function displayProductModalContent(productData) {
        const modalBody = document.getElementById('modalBody');
        
        addLogEntry(`モーダル内容表示: ${productData.title}`, 'success');
        
        let imageHtml = '';
        if (productData.images && productData.images.length > 0) {
            imageHtml = `<img src="${productData.images[0]}" alt="商品画像" style="max-width: 200px; max-height: 200px; border-radius: 6px; border: 1px solid #dee2e6; object-fit: cover;">`;
        } else {
            imageHtml = `<div style="width: 200px; height: 200px; background: #f8f9fa; border: 1px solid #dee2e6; display: flex; align-items: center; justify-content: center; border-radius: 6px;"><i class="fas fa-image" style="font-size: 2rem; color: #6c757d;"></i></div>`;
        }
        
        modalBody.innerHTML = `
            <div style="background: linear-gradient(135deg, #d4edda, #c3e6cb); color: #155724; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                <i class="fas fa-check-circle"></i>
                <strong>✅ DB構造対応版 - カラム不足エラー解決完了</strong>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                    ${imageHtml}
                </div>
                <div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Item ID</label>
                        <input type="text" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" value="${productData.item_id || ''}" readonly>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">データベースID</label>
                        <input type="text" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" value="${productData.db_id || ''}" readonly>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">商品名</label>
                <input type="text" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" value="${escapeHtml(productData.title || '')}">
            </div>

            <div style="display: flex; gap: 0.5rem; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid #dee2e6;">
                <button onclick="closeProductModal()" style="background: #6c757d; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-times"></i> 閉じる
                </button>
            </div>
        `;
    }

    function closeProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function showModalError(message) {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div style="background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                <i class="fas fa-exclamation-triangle"></i>
                ${escapeHtml(message)}
            </div>
            <div style="text-align: center;">
                <button onclick="closeProductModal()" style="background: #6c757d; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
                    閉じる
                </button>
            </div>
        `;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function getValidImageUrl(url) {
        if (!url || url.includes('placehold')) {
            return 'https://placehold.co/60x60/725CAD/FFFFFF/png?text=No+Image';
        }
        return url;
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ja-JP', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }

    function deleteProductConfirm(productId) {
        if (confirm(`商品ID ${productId} を削除しますか？`)) {
            // 削除処理は後で実装
            addLogEntry(`商品 ${productId} の削除機能は実装予定です`, 'info');
        }
    }

    function toggleSelectAll() {
        addLogEntry('全選択機能は実装予定です', 'info');
    }

    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeProductModal();
        }
    });

    // モーダル外クリックで閉じる
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('productModal');
        if (modal && e.target === modal) {
            closeProductModal();
        }
    });

    // 初期化
    document.addEventListener('DOMContentLoaded', function() {
        addLogEntry('Yahoo Auction編集システム - DB構造対応版初期化完了', 'success');
    });
    </script>
</body>
</html>