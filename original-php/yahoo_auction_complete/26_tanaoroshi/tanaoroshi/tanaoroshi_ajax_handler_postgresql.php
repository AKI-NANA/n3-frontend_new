<?php
/**
 * Tanaoroshi Ajax Handler - PostgreSQL統合N3準拠版
 * 修正日: 2025-08-15
 * 修正項目: PostgreSQL直接接続、JSON応答正常化、Hook依存除去
 */

// N3統合チェック
if (!defined('_ROUTED_FROM_INDEX')) {
    // 直接アクセスの場合はindex.phpにリダイレクト
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        header('Location: ../../index.php?page=tanaoroshi_inline_complete');
        exit;
    }
    // GETアクセスは404
    http_response_code(404);
    exit();
}

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

header('Content-Type: application/json; charset=UTF-8');

// XSS対策関数
function escape_html($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

// JSON応答関数
function json_response($success, $data = null, $message = '', $error = '') {
    $response = [
        'success' => $success,
        'timestamp' => date('c'),
        'message' => escape_html($message)
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    if (!empty($error)) {
        $response['error'] = escape_html($error);
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// PostgreSQL直接接続関数
function get_postgresql_inventory_data($limit = 50) {
    try {
        error_log("🐘 PostgreSQL直接接続開始");
        
        // PostgreSQL接続設定
        $host = 'localhost';
        $port = '5432';
        $dbname = 'nagano3_db';
        $username = 'postgres';
        $password = 'Kn240914';
        
        $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";
        $pdo = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 30
        ]);
        
        error_log("✅ PostgreSQL接続成功");
        
        // テーブル名確認
        $table_query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%inventory%' OR table_name LIKE '%mystical%'";
        $tables = $pdo->query($table_query)->fetchAll();
        
        error_log("📋 利用可能テーブル: " . json_encode(array_column($tables, 'table_name')));
        
        // メインテーブルからデータ取得
        $main_table = 'mystical_japan_treasures_inventory';
        $sql = "SELECT 
                    item_id,
                    title,
                    sku,
                    current_price,
                    quantity,
                    condition,
                    category,
                    gallery_url,
                    listing_status,
                    watch_count,
                    view_count,
                    created_at,
                    updated_at
                FROM {$main_table} 
                ORDER BY view_count DESC 
                LIMIT :limit";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $raw_data = $stmt->fetchAll();
        error_log("📦 PostgreSQL生データ取得: " . count($raw_data) . "件");
        
        // 棚卸しシステム形式に変換
        $converted_data = [];
        foreach ($raw_data as $index => $item) {
            $converted_data[] = [
                'id' => $item['item_id'],
                'title' => $item['title'] ?? '商品名なし',
                'sku' => $item['sku'] ?? $item['item_id'],
                'price' => (float)($item['current_price'] ?? 0),
                'quantity' => (int)($item['quantity'] ?? 0),
                'condition' => $item['condition'] ?? 'Used',
                'category' => $item['category'] ?? 'Unknown',
                'gallery_url' => $item['gallery_url'] ?? '',
                'listing_status' => $item['listing_status'] ?? '不明',
                'watch_count' => (int)($item['watch_count'] ?? 0),
                'view_count' => (int)($item['view_count'] ?? 0),
                'data_source' => 'postgresql_direct',
                'created_at' => $item['created_at'] ?? date('c'),
                'updated_at' => $item['updated_at'] ?? date('c')
            ];
        }
        
        error_log("✅ PostgreSQL変換完了: " . count($converted_data) . "件");
        return $converted_data;
        
    } catch (PDOException $e) {
        error_log("❌ PostgreSQL接続エラー: " . $e->getMessage());
        return null;
    } catch (Exception $e) {
        error_log("❌ PostgreSQL処理エラー: " . $e->getMessage());
        return null;
    }
}

// フォールバック: JSONファイルデータ取得
function get_json_fallback_data() {
    try {
        $json_path = '/Users/aritahiroaki/NAGANO-3/N3-Development/data/ebay_inventory/professional_demo_inventory.json';
        
        if (!file_exists($json_path)) {
            error_log("JSONファイルが見つかりません: {$json_path}");
            return get_sample_fallback_data();
        }
        
        $json_content = file_get_contents($json_path);
        $data = json_decode($json_content, true);
        
        if ($data === null) {
            error_log("JSONデコードエラー: " . json_last_error_msg());
            return get_sample_fallback_data();
        }
        
        // 最初の20件を変換
        $converted_data = [];
        $count = 0;
        foreach ($data as $index => $item) {
            if ($count >= 20) break;
            
            $converted_data[] = [
                'id' => $item['ebay_item_id'] ?? "JSON{$index}",
                'title' => $item['title'] ?? '商品名なし',
                'sku' => $item['ebay_item_id'] ?? "SKU{$index}",
                'price' => (float)($item['current_price'] ?? 0),
                'quantity' => (int)($item['quantity'] ?? 0),
                'condition' => $item['condition'] ?? 'Used',
                'category' => $item['category_name'] ?? 'Unknown',
                'gallery_url' => get_fallback_image_by_category($item['category_name'] ?? 'Electronics'),
                'listing_status' => $item['listing_status'] ?? '不明',
                'watch_count' => (int)($item['watch_count'] ?? 0),
                'view_count' => (int)($item['view_count'] ?? 0),
                'data_source' => 'json_fallback',
                'created_at' => $item['created_at'] ?? date('c'),
                'updated_at' => $item['updated_at'] ?? date('c')
            ];
            $count++;
        }
        
        error_log("📦 JSON変換完了: " . count($converted_data) . "件");
        return $converted_data;
        
    } catch (Exception $e) {
        error_log("❌ JSONデータ読み込みエラー: " . $e->getMessage());
        return get_sample_fallback_data();
    }
}

// 最終フォールバック: サンプルデータ
function get_sample_fallback_data() {
    return [
        [
            'id' => 'SAMPLE001',
            'title' => 'サンプル商品 1 - システム接続エラー',
            'sku' => 'SAMPLE001',
            'price' => 25.99,
            'quantity' => 0,
            'condition' => 'Used',
            'category' => 'Electronics',
            'gallery_url' => 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop&auto=format',
            'listing_status' => 'エラー',
            'watch_count' => 0,
            'view_count' => 0,
            'data_source' => 'sample_fallback',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ],
        [
            'id' => 'SAMPLE002',
            'title' => 'サンプル商品 2 - データベース未接続',
            'sku' => 'SAMPLE002',
            'price' => 45.50,
            'quantity' => 5,
            'condition' => 'New',
            'category' => 'Fashion',
            'gallery_url' => 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop&auto=format',
            'listing_status' => 'エラー',
            'watch_count' => 0,
            'view_count' => 0,
            'data_source' => 'sample_fallback',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ]
    ];
}

// カテゴリ別フォールバック画像
function get_fallback_image_by_category($category) {
    $fallback_images = [
        'Electronics' => 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400&h=300&fit=crop&auto=format',
        'Fashion' => 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop&auto=format',
        'Home' => 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format',
        'Sports' => 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&auto=format'
    ];
    
    return $fallback_images[$category] ?? $fallback_images['Electronics'];
}

// メイン処理
try {
    $action = $_POST['action'] ?? '';
    $input = $_POST;
    
    // フォールバック: JSON形式も対応
    if (empty($action)) {
        $json_input = json_decode(file_get_contents('php://input'), true);
        if ($json_input) {
            $action = $json_input['action'] ?? '';
            $input = array_merge($input, $json_input);
        }
    }
    
    // N3準拠: tanaoroshi_プレフィックス除去
    $action = str_replace('tanaoroshi_', '', $action);
    
    error_log("📡 N3統合Ajax処理: action={$action}");
    
    switch ($action) {
        case 'get_inventory':
            $limit = (int)($input['limit'] ?? 50);
            
            // PostgreSQL優先取得
            $inventory_data = get_postgresql_inventory_data($limit);
            
            if ($inventory_data === null) {
                // フォールバック1: JSONファイル
                error_log("⚠️ PostgreSQL失敗、JSONフォールバック実行");
                $inventory_data = get_json_fallback_data();
                
                if (empty($inventory_data)) {
                    // フォールバック2: サンプルデータ
                    error_log("⚠️ JSON失敗、サンプルデータ実行");
                    $inventory_data = get_sample_fallback_data();
                }
            }
            
            json_response(true, $inventory_data, 
                '在庫データ取得成功 (' . count($inventory_data) . '件) - ' . 
                ($inventory_data[0]['data_source'] ?? 'unknown'), '');
            break;
            
        case 'health_check':
            // システム健康状態確認
            json_response(true, [
                'status' => 'healthy',
                'timestamp' => date('c'),
                'postgresql_available' => get_postgresql_inventory_data(1) !== null,
                'version' => '2.0-postgresql-integrated'
            ], 'システム正常動作', '');
            break;
            
        default:
            json_response(false, null, '', "不明なアクション: {$action}");
            break;
    }
    
} catch (Exception $e) {
    error_log("Tanaoroshi Ajax Handler Critical Error: " . $e->getMessage());
    json_response(false, null, '', 'サーバー内部エラーが発生しました');
}
?>