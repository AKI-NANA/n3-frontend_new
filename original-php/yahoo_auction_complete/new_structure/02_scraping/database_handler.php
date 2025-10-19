<?php
/**
 * Enhanced Database Functions for Scraping
 */

function saveProductToDatabaseEnhanced($product_data) {
    try {
        writeLog("[Enhanced DB Save Start] High-precision database save process started", 'INFO');
        
        // Data quality check
        if (!validateProductDataQuality($product_data)) {
            writeLog("[Data Quality Failed] Aborting save", 'ERROR');
            return [
                'success' => false,
                'error' => 'Data quality check failed',
                'quality_score' => $product_data['data_quality'] ?? 0
            ];
        }
        
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        writeLog("[DB Connection Success] Enhanced save process PDO connection established", 'SUCCESS');
        
        // Enhanced data preparation
        $source_item_id = $product_data['item_id'] ?? 'ENHANCED_' . time() . '_' . rand(1000, 9999);
        $sku = 'SKU-ENH-' . strtoupper(substr($source_item_id, 0, 12));
        
        // Price data processing
        $price_jpy = $product_data['current_price'] ?? $product_data['immediate_price'] ?? 0;
        $immediate_price = $product_data['immediate_price'] ?? null;
        
        $active_title = $product_data['title'] ?? null;
        $active_description = generateEnhancedDescription($product_data);
        $active_price_usd = $price_jpy > 0 ? round($price_jpy / 150, 2) : null;
        $active_image_url = $product_data['main_image'] ?? $product_data['images'][0] ?? 'https://placehold.co/300x200/725CAD/FFFFFF/png?text=No+Image';
        
        // Enhanced JSON data
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
        
        // Category mapping
        $category = mapCategoryToStandard($product_data['category']);
        $condition_name = $product_data['condition'];
        
        writeLog("[Enhanced Data Prepared]", 'INFO');
        writeLog("   source_item_id: {$source_item_id}", 'DEBUG');
        writeLog("   title: {$active_title}", 'DEBUG');
        writeLog("   price: ¥{$price_jpy} (immediate: ¥{$immediate_price})", 'DEBUG');
        writeLog("   category: {$category}", 'DEBUG');
        writeLog("   condition: {$condition_name}", 'DEBUG');
        writeLog("   images: " . count($product_data['images'] ?? []), 'DEBUG');
        writeLog("   quality: {$product_data['data_quality']}%", 'DEBUG');
        
        // Duplicate check (enhanced)
        $existing = checkExistingProductEnhanced($pdo, $source_item_id, $product_data['source_url']);
        
        if ($existing) {
            writeLog("[Enhanced UPDATE] Updating existing data with high-quality data", 'INFO');
            
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
                writeLog("[Enhanced UPDATE Success] {$affected_rows} rows updated: {$source_item_id}", 'SUCCESS');
                
                return [
                    'success' => true,
                    'action' => 'updated',
                    'item_id' => $source_item_id,
                    'database_id' => $existing['id'],
                    'quality_score' => $product_data['data_quality']
                ];
            } else {
                writeLog("[Enhanced UPDATE Failed] {$source_item_id}", 'ERROR');
                return ['success' => false, 'error' => 'UPDATE execution failed'];
            }
            
        } else {
            writeLog("[Enhanced INSERT] Inserting new high-quality data", 'INFO');
            
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
                writeLog("[Enhanced INSERT Success] New ID: {$insert_id}, Quality: {$product_data['data_quality']}%", 'SUCCESS');
                
                // Save verification
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
                writeLog("[Enhanced INSERT Failed] {$source_item_id}", 'ERROR');
                return ['success' => false, 'error' => 'INSERT execution failed'];
            }
        }
        
    } catch (PDOException $e) {
        writeLog("[Enhanced DB PDO Error] " . $e->getMessage(), 'ERROR');
        writeLog("[ErrorInfo] " . json_encode($e->errorInfo), 'ERROR');
        
        return [
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage(),
            'error_code' => $e->getCode()
        ];
    } catch (Exception $e) {
        writeLog("[Enhanced DB General Exception] " . $e->getMessage(), 'ERROR');
        
        return [
            'success' => false,
            'error' => 'Save process error: ' . $e->getMessage()
        ];
    }
}

function validateProductDataQuality($product_data) {
    $min_quality_score = 50;
    
    $quality_score = $product_data['data_quality'] ?? 0;
    if ($quality_score < $min_quality_score) {
        writeLog("[Quality Failed] Score: {$quality_score}% (minimum: {$min_quality_score}%)", 'ERROR');
        return false;
    }
    
    if (!empty($product_data['errors'])) {
        writeLog("[Critical Error] " . implode(', ', $product_data['errors']), 'ERROR');
        return false;
    }
    
    $required_fields = ['title', 'source_url'];
    foreach ($required_fields as $field) {
        if (empty($product_data[$field])) {
            writeLog("[Required Field Missing] {$field} is empty", 'ERROR');
            return false;
        }
    }
    
    if (empty($product_data['current_price']) && empty($product_data['immediate_price'])) {
        writeLog("[Price Info Missing] Both current and immediate prices are empty", 'ERROR');
        return false;
    }
    
    writeLog("[Quality Validation Passed] Score: {$quality_score}%", 'SUCCESS');
    return true;
}

function checkExistingProductEnhanced($pdo, $source_item_id, $source_url) {
    $sql = "SELECT id, source_item_id, active_title, scraped_yahoo_data 
            FROM yahoo_scraped_products 
            WHERE source_item_id = ? OR (scraped_yahoo_data->>'url')::text = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$source_item_id, $source_url]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existing) {
        writeLog("[Existing Data Found] ID: {$existing['id']}, Title: " . substr($existing['active_title'], 0, 30) . "...", 'INFO');
        
        $existing_data = json_decode($existing['scraped_yahoo_data'], true);
        $existing_quality = $existing_data['data_quality'] ?? 0;
        
        writeLog("[Existing Data Quality] {$existing_quality}%", 'INFO');
    }
    
    return $existing;
}

function generateEnhancedDescription($product_data) {
    $description_parts = [];
    
    if (!empty($product_data['category'])) {
        $description_parts[] = "Category: " . $product_data['category'];
    }
    
    if (!empty($product_data['condition'])) {
        $description_parts[] = "Condition: " . $product_data['condition'];
    }
    
    if (!empty($product_data['current_price'])) {
        $description_parts[] = "Current Price: ¥" . number_format($product_data['current_price']);
    }
    
    if (!empty($product_data['immediate_price'])) {
        $description_parts[] = "Buy Now: ¥" . number_format($product_data['immediate_price']);
    }
    
    if (!empty($product_data['auction_info']['bid_count'])) {
        $description_parts[] = "Bids: " . $product_data['auction_info']['bid_count'];
    }
    
    if (!empty($product_data['seller_info']['name'])) {
        $description_parts[] = "Seller: " . $product_data['seller_info']['name'];
    }
    
    if (!empty($product_data['data_quality'])) {
        $description_parts[] = "Quality: " . $product_data['data_quality'] . "%";
    }
    
    $description = implode(" | ", $description_parts);
    
    if (!empty($product_data['title'])) {
        $description = $product_data['title'] . " | " . $description;
    }
    
    return mb_substr($description, 0, 500, 'UTF-8');
}

function mapCategoryToStandard($category) {
    if (empty($category)) {
        return 'Other';
    }
    
    $category_mapping = [
        'ポケモンカード' => 'Trading Cards',
        'ポケモンカードゲーム' => 'Trading Cards',
        'Pokemon' => 'Trading Cards',
        'TCG' => 'Trading Cards',
        'トレカ' => 'Trading Cards',
        'フィギュア' => 'Figures & Models',
        'ねんどろいど' => 'Figures & Models',
        'プラモデル' => 'Figures & Models',
        'アンティーク' => 'Antiques & Crafts',
        'ヴィンテージ' => 'Antiques & Crafts',
        '時計' => 'Fashion',
        '腕時計' => 'Fashion',
        'アクセサリー' => 'Fashion'
    ];
    
    return $category_mapping[$category] ?? $category;
}

function verifyDataSaved($pdo, $insert_id, $source_item_id) {
    try {
        $sql = "SELECT id, source_item_id, active_title, price_jpy, 
                       scraped_yahoo_data->>'data_quality' as quality_score
                FROM yahoo_scraped_products WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$insert_id]);
        $saved_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($saved_data) {
            writeLog("[Save Verification Success] ID: {$saved_data['id']}, Quality: {$saved_data['quality_score']}%", 'SUCCESS');
            return [
                'verified' => true,
                'saved_id' => $saved_data['id'],
                'saved_title' => $saved_data['active_title'],
                'saved_price' => $saved_data['price_jpy'],
                'saved_quality' => $saved_data['quality_score']
            ];
        } else {
            writeLog("[Save Verification Failed] Data not found", 'ERROR');
            return ['verified' => false];
        }
        
    } catch (Exception $e) {
        writeLog("[Save Verification Exception] " . $e->getMessage(), 'ERROR');
        return ['verified' => false, 'error' => $e->getMessage()];
    }
}
?>
