<?php
/**
 * 軽量化修正版 - データ表示問題の修正
 * 最小限の修正でデータ表示機能を復旧
 */

// エラー表示を有効にして問題を特定
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// データベース接続の確立
function getDatabaseConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            error_log("✅ データベース接続確立");
            
        } catch (PDOException $e) {
            error_log("❌ データベース接続失敗: " . $e->getMessage());
            return null;
        }
    }
    
    return $pdo;
}

// JSON レスポンス送信（修正版）
function sendJsonResponse($data, $success = true, $message = '') {
    // 出力バッファをクリア
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // ヘッダー設定
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'debug_info' => [
            'php_version' => PHP_VERSION,
            'memory_usage' => memory_get_usage(true),
            'script_name' => basename(__FILE__)
        ]
    ];
    
    $json = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
    if ($json === false) {
        $json = json_encode([
            'success' => false,
            'message' => 'JSON エンコードエラー: ' . json_last_error_msg(),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    echo $json;
    exit;
}

// 未出品データ取得（問題修正版）
function getUnlistedProductsData($page = 1, $limit = 50, $strict = false) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'data' => [],
            'total' => 0,
            'page' => $page,
            'limit' => $limit,
            'error' => 'データベース接続失敗'
        ];
    }
    
    try {
        // 基本的なWHERE条件
        $whereClause = "WHERE (ebay_item_id IS NULL OR ebay_item_id = '' OR ebay_item_id = '0')";
        
        if ($strict) {
            $whereClause .= " AND active_image_url IS NOT NULL AND active_image_url != ''";
            $whereClause .= " AND active_image_url NOT LIKE '%placehold%'";
        }
        
        // データ取得クエリ（シンプル版）
        $sql = "SELECT 
                    id,
                    source_item_id as item_id,
                    COALESCE(active_title, scraped_yahoo_data->>'title', 'タイトル不明') as title,
                    COALESCE(price_jpy, 0) as price,
                    COALESCE(active_image_url, 'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image') as picture_url,
                    COALESCE(scraped_yahoo_data->>'category', 'N/A') as category_name,
                    COALESCE(scraped_yahoo_data->>'condition', 'Used') as condition_name,
                    CASE 
                        WHEN scraped_yahoo_data->>'url' LIKE '%auctions.yahoo.co.jp%' THEN 'ヤフオク'
                        WHEN scraped_yahoo_data->>'url' LIKE '%yahoo%' THEN 'Yahoo'
                        ELSE 'Unknown'
                    END as platform,
                    updated_at,
                    ebay_category_id,
                    item_specifics
                FROM yahoo_scraped_products 
                {$whereClause} 
                ORDER BY id DESC 
                LIMIT ? OFFSET ?";
        
        $offset = ($page - 1) * $limit;
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit, $offset]);
        $data = $stmt->fetchAll();
        
        // 総数取得
        $countSql = "SELECT COUNT(*) as total FROM yahoo_scraped_products {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute();
        $totalResult = $countStmt->fetch();
        $total = $totalResult['total'] ?? 0;
        
        error_log("✅ データ取得成功: {$total}件中{$limit}件表示");
        
        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'note' => "未出品データ {$total} 件中 " . count($data) . " 件取得",
            'sql_info' => [
                'where_clause' => $whereClause,
                'offset' => $offset,
                'limit' => $limit
            ]
        ];
        
    } catch (Exception $e) {
        error_log("❌ データ取得エラー: " . $e->getMessage());
        
        return [
            'data' => [],
            'total' => 0,
            'page' => $page,
            'limit' => $limit,
            'error' => $e->getMessage(),
            'note' => "データ取得エラーが発生しました"
        ];
    }
}

// 商品詳細取得（修正版）
function getProductDetails($item_id) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'message' => 'データベース接続失敗'
        ];
    }
    
    try {
        $sql = "SELECT 
                    id as db_id,
                    source_item_id as item_id,
                    active_title as title,
                    price_jpy as current_price,
                    active_description as description,
                    scraped_yahoo_data,
                    active_image_url,
                    sku,
                    status,
                    created_at,
                    updated_at,
                    ebay_category_id,
                    item_specifics
                FROM yahoo_scraped_products 
                WHERE source_item_id = ? OR id::text = ?
                LIMIT 1";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$item_id, $item_id]);
        $product = $stmt->fetch();
        
        if (!$product) {
            return [
                'success' => false,
                'message' => "商品が見つかりません: {$item_id}"
            ];
        }
        
        $yahoo_data = json_decode($product['scraped_yahoo_data'] ?? '{}', true) ?: [];
        
        $product_data = [
            'db_id' => $product['db_id'],
            'item_id' => $product['item_id'],
            'title' => $product['title'] ?? 'タイトル不明',
            'current_price' => (int)($product['current_price'] ?? 0),
            'description' => $product['description'] ?? '',
            'condition' => $yahoo_data['condition'] ?? 'Used',
            'category' => $yahoo_data['category'] ?? 'N/A',
            'images' => [$product['active_image_url']] ?? [],
            'source_url' => $yahoo_data['url'] ?? '',
            'ebay_category_id' => $product['ebay_category_id'] ?? '',
            'item_specifics' => $product['item_specifics'] ?? '',
            'sku' => $product['sku'] ?? ''
        ];
        
        return [
            'success' => true,
            'data' => $product_data,
            'message' => '商品詳細取得成功'
        ];
        
    } catch (Exception $e) {
        error_log('商品詳細取得エラー: ' . $e->getMessage());
        return [
            'success' => false,
            'message' => '商品詳細取得エラー: ' . $e->getMessage()
        ];
    }
}

// API処理
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if (!empty($action)) {
    error_log("API呼び出し: {$action}");
    
    switch ($action) {
        case 'get_unlisted_products':
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = max(1, min(200, intval($_GET['limit'] ?? 50)));
            $result = getUnlistedProductsData($page, $limit, false);
            sendJsonResponse($result, true, $result['note'] ?? 'データ取得完了');
            break;
            
        case 'get_unlisted_products_strict':
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = max(1, min(200, intval($_GET['limit'] ?? 50)));
            $result = getUnlistedProductsData($page, $limit, true);
            sendJsonResponse($result, true, $result['note'] ?? 'データ取得完了');
            break;
            
        case 'get_product_details':
            $item_id = $_GET['item_id'] ?? $_POST['item_id'] ?? '';
            if (empty($item_id)) {
                sendJsonResponse(null, false, 'Item IDが指定されていません');
            }
            $result = getProductDetails($item_id);
            sendJsonResponse($result['data'] ?? null, $result['success'], $result['message']);
            break;
            
        case 'test_connection':
            $pdo = getDatabaseConnection();
            if ($pdo) {
                try {
                    $stmt = $pdo->query("SELECT COUNT(*) as total FROM yahoo_scraped_products");
                    $count = $stmt->fetch()['total'];
                    sendJsonResponse(['total_records' => $count], true, "データベース接続成功: {$count}件のレコード");
                } catch (Exception $e) {
                    sendJsonResponse(null, false, "クエリ実行エラー: " . $e->getMessage());
                }
            } else {
                sendJsonResponse(null, false, 'データベース接続失敗');
            }
            break;
            
        default:
            sendJsonResponse(null, false, "不明なアクション: {$action}");
    }
    exit;
}

// HTMLページの表示
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction - データ編集システム（修正版）</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            background: #f8f9fa; 
            margin: 0; 
            padding: 20px; 
            color: #333;
        }
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 2rem; 
            text-align: center;
        }
        .header h1 { 
            margin: 0; 
            font-size: 2rem; 
            font-weight: 700;
        }
        .controls { 
            padding: 1.5rem; 
            background: #f8f9fa; 
            border-bottom: 1px solid #dee2e6; 
            display: flex; 
            gap: 1rem; 
            flex-wrap: wrap;
        }
        .btn { 
            padding: 0.75rem 1.5rem; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer; 
            font-weight: 500; 
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .btn:hover { 
            transform: translateY(-1px); 
            box-shadow: 0 4px 8px rgba(0,0,0,0.15); 
        }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-info { background: #17a2b8; color: white; }
        .btn-warning { background: #ffc107; color: #212529; }
        
        .table-container { 
            overflow-x: auto; 
            padding: 1rem;
        }
        .data-table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 0.875rem;
        }
        .data-table th, .data-table td { 
            border: 1px solid #dee2e6; 
            padding: 0.75rem; 
            text-align: left;
        }
        .data-table th { 
            background: #e9ecef; 
            font-weight: 600; 
            position: sticky; 
            top: 0;
        }
        .data-table tr:hover { 
            background: #f8f9fa; 
        }
        .product-thumbnail { 
            width: 80px; 
            height: 80px; 
            object-fit: cover; 
            border-radius: 4px; 
            cursor: pointer;
        }
        .price { 
            font-weight: 600; 
            color: #28a745;
        }
        .status { 
            text-align: center; 
            padding: 2rem; 
            color: #6c757d;
        }
        .error { 
            color: #dc3545; 
            background: #f8d7da; 
            padding: 1rem; 
            border-radius: 6px; 
            margin: 1rem;
        }
        .loading { 
            text-align: center; 
            padding: 3rem;
        }
        .spinner { 
            border: 3px solid #f3f3f3; 
            border-top: 3px solid #007bff; 
            border-radius: 50%; 
            width: 30px; 
            height: 30px; 
            animation: spin 1s linear infinite; 
            margin: 0 auto 1rem;
        }
        @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
        }

        /* モーダル */
        .modal { 
            display: none; 
            position: fixed; 
            z-index: 1000; 
            left: 0; 
            top: 0; 
            width: 100%; 
            height: 100%; 
            background: rgba(0,0,0,0.5);
        }
        .modal-content { 
            background: white; 
            margin: 5% auto; 
            padding: 2rem; 
            border-radius: 8px; 
            width: 90%; 
            max-width: 600px; 
            max-height: 80vh; 
            overflow-y: auto;
        }
        .modal-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 1rem;
        }
        .close { 
            font-size: 1.5rem; 
            cursor: pointer; 
            color: #999;
        }
        .close:hover { 
            color: #333; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-edit"></i> Yahoo Auction データ編集システム</h1>
            <p>修正版 - データ表示問題を解決</p>
        </div>
        
        <div class="controls">
            <button class="btn btn-primary" onclick="testConnection()">
                <i class="fas fa-database"></i> 接続テスト
            </button>
            <button class="btn btn-success" onclick="loadUnlistedProducts()">
                <i class="fas fa-list"></i> 未出品データ表示
            </button>
            <button class="btn btn-info" onclick="loadUnlistedProductsStrict()">
                <i class="fas fa-filter"></i> 厳密モード
            </button>
            <button class="btn btn-warning" onclick="clearTable()">
                <i class="fas fa-refresh"></i> クリア
            </button>
        </div>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>画像</th>
                        <th>ID</th>
                        <th>商品名</th>
                        <th>価格</th>
                        <th>カテゴリ</th>
                        <th>状態</th>
                        <th>プラットフォーム</th>
                        <th>更新日</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="dataTableBody">
                    <tr>
                        <td colspan="9" class="status">
                            <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                            「未出品データ表示」ボタンをクリックしてデータを読み込んでください
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- モーダル -->
    <div id="productModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-edit"></i> 商品詳細</h2>
                <span class="close" onclick="closeModal()">&times;</span>
            </div>
            <div id="modalBody">
                <div class="loading">
                    <div class="spinner"></div>
                    データを読み込み中...
                </div>
            </div>
        </div>
    </div>

    <script>
        console.log('✅ Yahoo Auction編集システム修正版 初期化');
        
        let currentData = [];

        // 接続テスト
        async function testConnection() {
            showLoading('接続テスト中...');
            
            try {
                const response = await fetch('?action=test_connection');
                const data = await response.json();
                
                if (data.success) {
                    showSuccess(`✅ 接続成功: ${data.data.total_records}件のレコードが存在`);
                } else {
                    showError(`❌ 接続失敗: ${data.message}`);
                }
            } catch (error) {
                showError(`❌ 接続エラー: ${error.message}`);
            }
        }

        // 未出品データ読み込み
        async function loadUnlistedProducts() {
            showLoading('未出品データを読み込み中...');
            
            try {
                const response = await fetch('?action=get_unlisted_products&page=1&limit=100');
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    currentData = result.data.data || [];
                    displayProducts(currentData);
                    showSuccess(`✅ ${result.data.total || 0}件中${currentData.length}件を表示`);
                } else {
                    showError(`❌ データ読み込み失敗: ${result.message}`);
                }
            } catch (error) {
                showError(`❌ データ読み込みエラー: ${error.message}`);
                console.error('詳細エラー:', error);
            }
        }

        // 厳密モード読み込み
        async function loadUnlistedProductsStrict() {
            showLoading('厳密モードでデータを読み込み中...');
            
            try {
                const response = await fetch('?action=get_unlisted_products_strict&page=1&limit=100');
                const result = await response.json();
                
                if (result.success) {
                    currentData = result.data.data || [];
                    displayProducts(currentData);
                    showSuccess(`✅ 厳密モード: ${currentData.length}件を表示`);
                } else {
                    showError(`❌ 厳密モード失敗: ${result.message}`);
                }
            } catch (error) {
                showError(`❌ 厳密モードエラー: ${error.message}`);
            }
        }

        // 商品表示
        function displayProducts(products) {
            const tbody = document.getElementById('dataTableBody');
            
            if (!products || products.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" class="status">
                            <i class="fas fa-exclamation-circle" style="color: orange;"></i><br>
                            データが見つかりませんでした
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = products.map(product => `
                <tr>
                    <td>
                        <img src="${getValidImageUrl(product.picture_url)}" 
                             alt="商品画像" 
                             class="product-thumbnail"
                             onclick="openProductModal('${product.item_id || product.id}')"
                             onerror="this.src='https://placehold.co/80x80/6c757d/ffffff?text=No+Image'">
                    </td>
                    <td>${product.item_id || product.id}</td>
                    <td>${escapeHtml(product.title || 'タイトルなし')}</td>
                    <td class="price">¥${(product.price || 0).toLocaleString()}</td>
                    <td>${escapeHtml(product.category_name || 'N/A')}</td>
                    <td>${escapeHtml(product.condition_name || 'N/A')}</td>
                    <td>${product.platform || 'Unknown'}</td>
                    <td>${formatDate(product.updated_at)}</td>
                    <td>
                        <button class="btn btn-primary" onclick="editProduct('${product.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        // 商品モーダル表示
        async function openProductModal(itemId) {
            document.getElementById('productModal').style.display = 'block';
            
            try {
                const response = await fetch(`?action=get_product_details&item_id=${encodeURIComponent(itemId)}`);
                const result = await response.json();
                
                if (result.success) {
                    displayProductModal(result.data);
                } else {
                    showModalError(result.message);
                }
            } catch (error) {
                showModalError(`モーダル読み込みエラー: ${error.message}`);
            }
        }

        // モーダル内容表示
        function displayProductModal(product) {
            document.getElementById('modalBody').innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <img src="${getValidImageUrl(product.images[0])}" 
                         alt="商品画像" 
                         style="max-width: 200px; max-height: 200px; border-radius: 4px;">
                </div>
                <p><strong>商品名:</strong> ${escapeHtml(product.title)}</p>
                <p><strong>価格:</strong> ¥${product.current_price.toLocaleString()}</p>
                <p><strong>状態:</strong> ${escapeHtml(product.condition)}</p>
                <p><strong>カテゴリ:</strong> ${escapeHtml(product.category)}</p>
                <p><strong>SKU:</strong> ${escapeHtml(product.sku)}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-primary" onclick="closeModal()">閉じる</button>
                </div>
            `;
        }

        // モーダル閉じる
        function closeModal() {
            document.getElementById('productModal').style.display = 'none';
        }

        // モーダルエラー表示
        function showModalError(message) {
            document.getElementById('modalBody').innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${escapeHtml(message)}
                </div>
                <button class="btn btn-primary" onclick="closeModal()">閉じる</button>
            `;
        }

        // ユーティリティ関数
        function getValidImageUrl(url) {
            if (!url || url.includes('placehold') || url === 'null') {
                return 'https://placehold.co/80x80/6c757d/ffffff?text=No+Image';
            }
            return url;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }

        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('ja-JP');
            } catch (e) {
                return 'N/A';
            }
        }

        function showLoading(message) {
            document.getElementById('dataTableBody').innerHTML = `
                <tr>
                    <td colspan="9" class="loading">
                        <div class="spinner"></div>
                        ${message}
                    </td>
                </tr>
            `;
        }

        function showSuccess(message) {
            console.log('✅', message);
        }

        function showError(message) {
            console.error('❌', message);
            document.getElementById('dataTableBody').innerHTML = `
                <tr>
                    <td colspan="9" class="error">
                        <i class="fas fa-exclamation-triangle"></i>
                        ${message}
                    </td>
                </tr>
            `;
        }

        function clearTable() {
            document.getElementById('dataTableBody').innerHTML = `
                <tr>
                    <td colspan="9" class="status">
                        <i class="fas fa-info-circle"></i><br>
                        データがクリアされました
                    </td>
                </tr>
            `;
            currentData = [];
        }

        function editProduct(productId) {
            console.log('商品編集:', productId);
        }

        // モーダル外クリックで閉じる
        window.onclick = function(event) {
            const modal = document.getElementById('productModal');
            if (event.target === modal) {
                closeModal();
            }
        }

        // 初期化完了
        console.log('✅ 修正版システム初期化完了');
    </script>
</body>
</html>