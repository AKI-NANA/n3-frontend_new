<?php
/**
 * エラーハンドリング強化版データベース保存
 */

function saveProductToDatabaseEnhanced($product_data) {
    try {
        writeLog("🔄 [Enhanced DB保存開始] 高精度データベース保存処理開始", 'INFO');
        
        // データ品質チェック
        if (!validateProductDataQuality($product_data)) {
            writeLog("❌ [データ品質不合格] 保存を中止します", 'ERROR');
            return [
                'success' => false,
                'error' => 'データ品質が不合格のため保存できません',
                'quality_score' => $product_data['data_quality'] ?? 0
            ];
        }
        
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        writeLog("✅ [DB接続成功] Enhanced保存処理でPDO接続確立", 'SUCCESS');
        
        // 強化されたデータ準備
        $source_item_id = $product_data['item_id'] ?? 'ENHANCED_' . time() . '_' . rand(1000, 9999);
        $sku = 'SKU-ENH-' . strtoupper(substr($source_item_id, 0, 12));
        
        // 価格データの処理
        $price_jpy = $product_data['current_price'] ?? $product_data['immediate_price'] ?? 0;
        $immediate_price = $product_data['immediate_price'] ?? null;
        
        $active_title = $product_data['title'] ?? null;
        $active_description = generateEnhancedDescription($product_data);
        $active_price_usd = $price_jpy > 0 ? round($price_jpy / 150, 2) : null;
        $active_image_url = $product_data['main_image'] ?? $product_data['images'][0] ?? 'https://placehold.co/300x200/725CAD/FFFFFF/png?text=No+Image';
        
        // 強化されたJSONデータ
        $scraped_yahoo_data = json_encode([
            'category' => $product_data['category'],
            'condition' => $product_data['condition'],
            'url' => $product_data['source_url'],
            'seller_name' => $product_data['seller_info']['name'] ?? 'Unknown',
            'bid_count' => $product_data['auction_info']['bid_count'] ?? 0,
            'end_time' => $product_data['auction_info']['end_time'] ?? '',
            'images' => $product_data['images'] ?? [],
            'immediate_price' => $immediate_price,
            'price_info' => [
                'tax_included' => $product_data['tax_included'] ?? false,
                'shipping_free' => $product_data['shipping_free'] ?? false
            ],
            'scraped_at' => $product_data['scraped_at'],
            'scraping_method' => $product_data['scraping_method'],
            'data_quality' => $product_data['data_quality'],
            'validation_status' => $product_data['validation_status'],
            'errors' => $product_data['errors'] ?? [],
            'warnings' => $product_data['warnings'] ?? []
        ], JSON_UNESCAPED_UNICODE);
        
        $current_stock = 1;
        $status = 'scraped_enhanced';
        
        // カテゴリのマッピング
        $category = mapCategoryToStandard($product_data['category']);
        $condition_name = $product_data['condition'];
        
        writeLog("📝 [Enhanced データ準備完了]", 'INFO');
        writeLog("   source_item_id: {$source_item_id}", 'DEBUG');
        writeLog("   title: {$active_title}", 'DEBUG');
        writeLog("   price: ¥{$price_jpy} (immediate: ¥{$immediate_price})", 'DEBUG');
        writeLog("   category: {$category}", 'DEBUG');
        writeLog("   condition: {$condition_name}", 'DEBUG');
        writeLog("   images: " . count($product_data['images'] ?? []), 'DEBUG');
        writeLog("   quality: {$product_data['data_quality']}%", 'DEBUG');
        
        // 重複チェック（強化版）
        $existing = checkExistingProductEnhanced($pdo, $source_item_id, $product_data['source_url']);
        
        if ($existing) {
            writeLog("🔄 [Enhanced UPDATE] 既存データを高品質データで更新", 'INFO');
            
            $sql = "UPDATE yahoo_scraped_products SET 
                sku = ?, price_jpy = ?, scraped_yahoo_data = ?, active_title = ?,
                active_description = ?, active_price_usd = ?, active_image_url = ?,
                category = ?, condition_name = ?, current_stock = ?, status = ?,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
            
            $params = [
                $sku, $price_jpy, $scraped_yahoo_data, $active_title,
                $active_description, $active_price_usd, $active_image_url,
                $category, $condition_name, $current_stock, $status,
                $existing['id']
            ];
            
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute($params);
            
            if ($result) {
                $affected_rows = $stmt->rowCount();
                writeLog("✅ [Enhanced UPDATE成功] {$affected_rows}行更新: {$source_item_id}", 'SUCCESS');
                
                return [
                    'success' => true,
                    'action' => 'updated',
                    'item_id' => $source_item_id,
                    'database_id' => $existing['id'],
                    'quality_score' => $product_data['data_quality']
                ];
            } else {
                writeLog("❌ [Enhanced UPDATE失敗] {$source_item_id}", 'ERROR');
                return ['success' => false, 'error' => 'UPDATE実行失敗'];
            }
            
        } else {
            writeLog("🆕 [Enhanced INSERT] 新規高品質データを挿入", 'INFO');
            
            $sql = "INSERT INTO yahoo_scraped_products (
                source_item_id, sku, price_jpy, scraped_yahoo_data, active_title,
                active_description, active_price_usd, active_image_url, category,
                condition_name, current_stock, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
            
            $params = [
                $source_item_id, $sku, $price_jpy, $scraped_yahoo_data, $active_title,
                $active_description, $active_price_usd, $active_image_url, $category,
                $condition_name, $current_stock, $status
            ];
            
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute($params);
            
            if ($result) {
                $insert_id = $pdo->lastInsertId();
                writeLog("✅ [Enhanced INSERT成功] 新規ID: {$insert_id}, Quality: {$product_data['data_quality']}%", 'SUCCESS');
                
                // 保存確認
                $verify_result = verifyDataSaved($pdo, $insert_id, $source_item_id);
                
                return [
                    'success' => true,
                    'action' => 'inserted',
                    'item_id' => $source_item_id,
                    'database_id' => $insert_id,
                    'quality_score' => $product_data['data_quality'],
                    'verification' => $verify_result
                ];
            } else {
                writeLog("❌ [Enhanced INSERT失敗] {$source_item_id}", 'ERROR');
                return ['success' => false, 'error' => 'INSERT実行失敗'];
            }
        }
        
    } catch (PDOException $e) {
        writeLog("❌ [Enhanced DB PDOエラー] " . $e->getMessage(), 'ERROR');
        writeLog("❌ [ErrorInfo] " . json_encode($e->errorInfo), 'ERROR');
        
        return [
            'success' => false,
            'error' => 'データベースエラー: ' . $e->getMessage(),
            'error_code' => $e->getCode()
        ];
    } catch (Exception $e) {
        writeLog("❌ [Enhanced DB 一般例外] " . $e->getMessage(), 'ERROR');
        
        return [
            'success' => false,
            'error' => '保存処理エラー: ' . $e->getMessage()
        ];
    }
}

/**
 * 商品データ品質検証
 */
function validateProductDataQuality($product_data) {
    $min_quality_score = 50; // 最低品質スコア
    
    // 品質スコアチェック
    $quality_score = $product_data['data_quality'] ?? 0;
    if ($quality_score < $min_quality_score) {
        writeLog("❌ [品質不合格] スコア: {$quality_score}% (最低: {$min_quality_score}%)", 'ERROR');
        return false;
    }
    
    // クリティカルエラーチェック
    if (!empty($product_data['errors'])) {
        writeLog("❌ [クリティカルエラー] " . implode(', ', $product_data['errors']), 'ERROR');
        return false;
    }
    
    // 必須フィールドチェック
    $required_fields = ['title', 'source_url'];
    foreach ($required_fields as $field) {
        if (empty($product_data[$field])) {
            writeLog("❌ [必須フィールド不足] {$field}が空です", 'ERROR');
            return false;
        }
    }
    
    // 価格チェック
    if (empty($product_data['current_price']) && empty($product_data['immediate_price'])) {
        writeLog("❌ [価格情報不足] 現在価格・即決価格ともに空です", 'ERROR');
        return false;
    }
    
    writeLog("✅ [品質検証通過] スコア: {$quality_score}%", 'SUCCESS');
    return true;
}

/**
 * 既存商品の強化チェック
 */
function checkExistingProductEnhanced($pdo, $source_item_id, $source_url) {
    $sql = "SELECT id, source_item_id, active_title, scraped_yahoo_data 
            FROM yahoo_scraped_products 
            WHERE source_item_id = ? OR (scraped_yahoo_data->>'url')::text = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$source_item_id, $source_url]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existing) {
        writeLog("🔍 [既存データ発見] ID: {$existing['id']}, Title: " . substr($existing['active_title'], 0, 30) . "...", 'INFO');
        
        // 既存データの品質をチェック
        $existing_data = json_decode($existing['scraped_yahoo_data'], true);
        $existing_quality = $existing_data['data_quality'] ?? 0;
        
        writeLog("📊 [既存データ品質] {$existing_quality}%", 'INFO');
    }
    
    return $existing;
}

/**
 * 強化された商品説明生成
 */
function generateEnhancedDescription($product_data) {
    $description_parts = [];
    
    // カテゴリ情報
    if (!empty($product_data['category'])) {
        $description_parts[] = "カテゴリ: " . $product_data['category'];
    }
    
    // 商品状態
    if (!empty($product_data['condition'])) {
        $description_parts[] = "状態: " . $product_data['condition'];
    }
    
    // 価格情報
    if (!empty($product_data['current_price'])) {
        $description_parts[] = "現在価格: ¥" . number_format($product_data['current_price']);
    }
    
    if (!empty($product_data['immediate_price'])) {
        $description_parts[] = "即決価格: ¥" . number_format($product_data['immediate_price']);
    }
    
    // オークション情報
    if (!empty($product_data['auction_info']['bid_count'])) {
        $description_parts[] = "入札数: " . $product_data['auction_info']['bid_count'] . "件";
    }
    
    // 出品者情報
    if (!empty($product_data['seller_info']['name'])) {
        $description_parts[] = "出品者: " . $product_data['seller_info']['name'];
    }
    
    // データ品質情報
    if (!empty($product_data['data_quality'])) {
        $description_parts[] = "データ品質: " . $product_data['data_quality'] . "%";
    }
    
    $description = implode(" | ", $description_parts);
    
    // タイトルを先頭に追加
    if (!empty($product_data['title'])) {
        $description = $product_data['title'] . " | " . $description;
    }
    
    return mb_substr($description, 0, 500, 'UTF-8');
}

/**
 * カテゴリの標準化マッピング
 */
function mapCategoryToStandard($category) {
    if (empty($category)) {
        return 'その他';
    }
    
    $category_mapping = [
        'ポケモンカード' => 'トレーディングカード',
        'ポケモンカードゲーム' => 'トレーディングカード',
        'Pokemon' => 'トレーディングカード',
        'TCG' => 'トレーディングカード',
        'トレカ' => 'トレーディングカード',
        'フィギュア' => 'フィギュア・模型',
        'ねんどろいど' => 'フィギュア・模型',
        'プラモデル' => 'フィギュア・模型',
        'アンティーク' => 'アンティーク・工芸品',
        'ヴィンテージ' => 'アンティーク・工芸品',
        '時計' => 'ファッション',
        '腕時計' => 'ファッション',
        'アクセサリー' => 'ファッション'
    ];
    
    return $category_mapping[$category] ?? $category;
}

/**
 * データ保存確認
 */
function verifyDataSaved($pdo, $insert_id, $source_item_id) {
    try {
        $sql = "SELECT id, source_item_id, active_title, price_jpy, 
                       scraped_yahoo_data->>'data_quality' as quality_score
                FROM yahoo_scraped_products WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$insert_id]);
        $saved_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($saved_data) {
            writeLog("✅ [保存確認成功] ID: {$saved_data['id']}, Quality: {$saved_data['quality_score']}%", 'SUCCESS');
            return [
                'verified' => true,
                'saved_id' => $saved_data['id'],
                'saved_title' => $saved_data['active_title'],
                'saved_price' => $saved_data['price_jpy'],
                'saved_quality' => $saved_data['quality_score']
            ];
        } else {
            writeLog("❌ [保存確認失敗] データが見つかりません", 'ERROR');
            return ['verified' => false];
        }
        
    } catch (Exception $e) {
        writeLog("❌ [保存確認例外] " . $e->getMessage(), 'ERROR');
        return ['verified' => false, 'error' => $e->getMessage()];
    }
}

echo "✅ Enhanced Database Functions 読み込み完了\n";
?>
