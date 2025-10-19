<?php
/**
 * データベース保存機能修正版 + 在庫管理連携
 * スクレイピングデータを正しいテーブルに保存 + 在庫管理システムへ自動登録
 */

// データベース接続
function getScrapingDatabaseConnection() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        return $pdo;
    } catch (PDOException $e) {
        error_log("スクレイピング用DB接続失敗: " . $e->getMessage());
        return null;
    }
}

/**
 * 商品データをyahoo_scraped_productsテーブルに保存 + 在庫管理連携
 * ✅ 在庫管理システムへの自動登録機能を統合
 */
function saveScrapedProductToDatabase($product_data) {
    try {
        $pdo = getScrapingDatabaseConnection();
        if (!$pdo) {
            return [
                'success' => false,
                'error' => 'データベース接続失敗'
            ];
        }
        
        $pdo->beginTransaction();
        
        // ===== 1. yahoo_scraped_products テーブルに保存 =====
        $sql = "INSERT INTO yahoo_scraped_products (
            source_item_id,
            sku,
            ebay_item_id,
            title_hash,
            price_jpy,
            scraped_yahoo_data,
            active_title,
            active_description,
            active_price_usd,
            active_image_url,
            current_stock,
            status,
            priority_source,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (source_item_id) DO UPDATE SET
            active_title = EXCLUDED.active_title,
            active_description = EXCLUDED.active_description,
            price_jpy = EXCLUDED.price_jpy,
            scraped_yahoo_data = EXCLUDED.scraped_yahoo_data,
            updated_at = EXCLUDED.updated_at
        RETURNING id";
        
        $stmt = $pdo->prepare($sql);
        
        // データ準備
        $source_item_id = $product_data['item_id'] ?? 'SCRAPED_' . time();
        $sku = 'SKU-' . strtoupper($source_item_id);
        $ebay_item_id = null; // 未出品なのでNULL
        $title_hash = md5($product_data['title'] ?? '');
        $price_jpy = (int)($product_data['current_price'] ?? 0);
        $scraped_yahoo_data = json_encode([
            'category' => $product_data['category'] ?? 'Unknown',
            'condition' => $product_data['condition'] ?? 'Used',
            'url' => $product_data['source_url'] ?? '',
            'seller_name' => $product_data['seller_info']['name'] ?? '',
            'end_time' => $product_data['auction_info']['end_time'] ?? '',
            'bid_count' => $product_data['auction_info']['bid_count'] ?? 0,
            'scraped_at' => $product_data['scraped_at'] ?? date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        $active_title = $product_data['title'] ?? 'タイトル不明';
        $active_description = $product_data['description'] ?? '';
        $active_price_usd = round($price_jpy / 150, 2); // 簡易USD換算
        $active_image_url = $product_data['images'][0] ?? 'https://via.placeholder.com/300x200/725CAD/FFFFFF?text=No+Image';
        $current_stock = 1;
        $status = 'scraped';
        $priority_source = 'yahoo';
        $created_at = date('Y-m-d H:i:s');
        $updated_at = date('Y-m-d H:i:s');
        
        $stmt->execute([
            $source_item_id,
            $sku,
            $ebay_item_id,
            $title_hash,
            $price_jpy,
            $scraped_yahoo_data,
            $active_title,
            $active_description,
            $active_price_usd,
            $active_image_url,
            $current_stock,
            $status,
            $priority_source,
            $created_at,
            $updated_at
        ]);
        
        // product_id 取得
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $productId = $result ? $result['id'] : null;
        
        if (!$productId) {
            // 既存商品の場合、IDを取得
            $stmt = $pdo->prepare(
                "SELECT id FROM yahoo_scraped_products 
                 WHERE source_item_id = ?"
            );
            $stmt->execute([$source_item_id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $productId = $row['id'];
        }
        
        // ===== 2. ✅ inventory_management への自動登録 =====
        $inventoryResult = registerToInventoryManagement($pdo, $productId, $product_data);
        
        $pdo->commit();
        
        error_log("✅ スクレイピング → 在庫管理 連携完了: Product ID {$productId}");
        
        return [
            'success' => true,
            'product_id' => $productId,
            'source_item_id' => $source_item_id,
            'inventory_registered' => $inventoryResult['success'],
            'monitoring_enabled' => true
        ];
        
    } catch (Exception $e) {
        if (isset($pdo)) {
            $pdo->rollback();
        }
        error_log("❌ スクレイピングデータDB保存失敗: " . $e->getMessage());
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * ✅ 在庫管理システムへの自動登録（新規関数）
 * 
 * @param PDO $pdo データベース接続
 * @param int $productId yahoo_scraped_products.id
 * @param array $productData スクレイピングデータ
 * @return array 登録結果
 */
function registerToInventoryManagement($pdo, $productId, $productData) {
    try {
        // 重複チェック
        $stmt = $pdo->prepare(
            "SELECT id FROM inventory_management 
             WHERE product_id = ? AND source_platform = 'yahoo'"
        );
        $stmt->execute([$productId]);
        
        if ($existing = $stmt->fetch(PDO::FETCH_ASSOC)) {
            error_log("⚠️ 既に在庫管理に登録済み: Product ID {$productId}");
            
            // 価格更新のみ実施
            $stmt = $pdo->prepare(
                "UPDATE inventory_management 
                 SET current_price = ?, 
                     last_verified_at = NOW(),
                     updated_at = NOW()
                 WHERE id = ?"
            );
            $stmt->execute([
                $productData['current_price'] ?? 0,
                $existing['id']
            ]);
            
            return [
                'success' => true,
                'action' => 'updated',
                'inventory_id' => $existing['id']
            ];
        }
        
        // ===== inventory_management へ新規登録 =====
        $sql = "INSERT INTO inventory_management (
            product_id,
            source_platform,
            source_url,
            source_product_id,
            current_stock,
            current_price,
            title_hash,
            url_status,
            last_verified_at,
            monitoring_enabled,
            created_at,
            updated_at
        ) VALUES (?, 'yahoo', ?, ?, 1, ?, ?, 'active', NOW(), true, NOW(), NOW())
        RETURNING id";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $productId,
            $productData['source_url'] ?? '',
            $productData['item_id'] ?? '',
            $productData['current_price'] ?? 0,
            hash('sha256', $productData['title'] ?? '')
        ]);
        
        $inventoryResult = $stmt->fetch(PDO::FETCH_ASSOC);
        $inventoryId = $inventoryResult['id'];
        
        // ===== stock_history へ初期価格記録 =====
        recordInitialStockHistory($pdo, $productId, $productData);
        
        error_log("✅ 在庫管理登録完了: Inventory ID {$inventoryId}, Product ID {$productId}");
        
        return [
            'success' => true,
            'action' => 'created',
            'inventory_id' => $inventoryId
        ];
        
    } catch (Exception $e) {
        error_log("❌ 在庫管理登録エラー: " . $e->getMessage());
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * ✅ 初期在庫・価格履歴の記録（新規関数）
 * 
 * @param PDO $pdo データベース接続
 * @param int $productId yahoo_scraped_products.id
 * @param array $productData スクレイピングデータ
 * @return bool 成功可否
 */
function recordInitialStockHistory($pdo, $productId, $productData) {
    try {
        $sql = "INSERT INTO stock_history (
            product_id,
            previous_price,
            new_price,
            previous_stock,
            new_stock,
            change_type,
            change_source,
            created_at
        ) VALUES (?, NULL, ?, NULL, 1, 'initial', 'yahoo', NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $productId,
            $productData['current_price'] ?? 0
        ]);
        
        error_log("✅ 初期価格履歴記録完了: Product ID {$productId}, 価格 ¥" . ($productData['current_price'] ?? 0));
        
        return true;
        
    } catch (Exception $e) {
        error_log("❌ 初期履歴記録エラー: " . $e->getMessage());
        // 履歴記録失敗でもメイン処理は成功とする
        return false;
    }
}

// テスト用サンプルデータ作成
function createSampleScrapedData() {
    $sample_products = [
        [
            'item_id' => 'SCRAPED_001',
            'title' => 'ヴィンテージ 腕時計 セイコー 自動巻き',
            'description' => '1970年代のセイコー自動巻き腕時計です。動作確認済み。',
            'current_price' => 45000,
            'condition' => 'Used',
            'category' => 'Watch',
            'images' => ['https://via.placeholder.com/300x200/0B1D51/FFFFFF?text=Watch'],
            'seller_info' => ['name' => 'vintage_collector'],
            'auction_info' => ['end_time' => date('Y-m-d H:i:s', strtotime('+3 days')), 'bid_count' => 5],
            'source_url' => 'https://auctions.yahoo.co.jp/jp/auction/scraped001',
            'scraped_at' => date('Y-m-d H:i:s')
        ],
        [
            'item_id' => 'SCRAPED_002', 
            'title' => '限定版 フィギュア ガンダム MSN-04',
            'description' => 'バンダイ製ガンダムフィギュア限定版です。未開封品。',
            'current_price' => 28000,
            'condition' => 'New',
            'category' => 'Figure',
            'images' => ['https://via.placeholder.com/300x200/725CAD/FFFFFF?text=Gundam'],
            'seller_info' => ['name' => 'figure_shop'],
            'auction_info' => ['end_time' => date('Y-m-d H:i:s', strtotime('+5 days')), 'bid_count' => 12],
            'source_url' => 'https://auctions.yahoo.co.jp/jp/auction/scraped002',
            'scraped_at' => date('Y-m-d H:i:s')
        ]
    ];
    
    $results = [];
    foreach ($sample_products as $product) {
        $result = saveScrapedProductToDatabase($product);
        $results[] = $result;
    }
    
    $success_count = count(array_filter($results, function($r) { return $r['success']; }));
    
    return [
        'success' => $success_count > 0,
        'message' => "{$success_count}件のサンプルデータを作成しました",
        'created_count' => $success_count,
        'details' => $results
    ];
}

// 実際のスクレイピング結果をDBに保存する関数（修正版）
function saveProductToDatabase($product_data) {
    return saveScrapedProductToDatabase($product_data);
}

echo "✅ データベース保存機能修正版 + 在庫管理連携 読み込み完了\n";
?>
