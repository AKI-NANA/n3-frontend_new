<?php
/**
 * 実データサンプル取得スクリプト
 * 引き継ぎ書用のサンプルデータを取得
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// データベース接続
try {
    $pdo = new PDO(
        "pgsql:host=localhost;dbname=nagano3_db",
        "postgres",
        "Kn240914"
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== データベース接続成功 ===\n\n";
    
    // 1. テーブル構造の取得
    echo "## 1. yahoo_scraped_products テーブル構造\n\n";
    $columnsSql = "SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable,
        column_default
    FROM information_schema.columns 
    WHERE table_name = 'yahoo_scraped_products' 
    ORDER BY ordinal_position";
    
    $stmt = $pdo->query($columnsSql);
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "| カラム名 | データ型 | NULL許可 | デフォルト値 |\n";
    echo "|----------|----------|----------|-------------|\n";
    
    foreach ($columns as $col) {
        $type = $col['data_type'];
        if ($col['character_maximum_length']) {
            $type .= "({$col['character_maximum_length']})";
        }
        
        echo "| {$col['column_name']} | {$type} | {$col['is_nullable']} | " . 
             ($col['column_default'] ?? 'NULL') . " |\n";
    }
    
    echo "\n\n";
    
    // 2. 実データサンプル取得（3件）
    echo "## 2. 実データサンプル（3件）\n\n";
    $dataSql = "SELECT 
        id,
        source_item_id,
        active_title,
        price_jpy,
        active_image_url,
        active_description,
        scraped_yahoo_data,
        ebay_category_id,
        item_specifics,
        ebay_item_id,
        status,
        sku,
        current_stock,
        created_at,
        updated_at
    FROM yahoo_scraped_products 
    WHERE active_title IS NOT NULL
    ORDER BY id DESC 
    LIMIT 3";
    
    $stmt = $pdo->query($dataSql);
    $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($samples as $index => $sample) {
        echo "### サンプル " . ($index + 1) . "\n\n";
        echo "```json\n";
        echo json_encode($sample, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        echo "\n```\n\n";
    }
    
    // 3. 統計情報
    echo "## 3. データベース統計情報\n\n";
    
    $statsSql = "SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN ebay_item_id IS NULL OR ebay_item_id = '' THEN 1 END) as unlisted_count,
        COUNT(CASE WHEN ebay_item_id IS NOT NULL AND ebay_item_id != '' THEN 1 END) as listed_count,
        COUNT(CASE WHEN active_image_url IS NOT NULL AND active_image_url != '' THEN 1 END) as with_image_count,
        COUNT(CASE WHEN ebay_category_id IS NOT NULL AND ebay_category_id != '' THEN 1 END) as with_category_count
    FROM yahoo_scraped_products";
    
    $stmt = $pdo->query($statsSql);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "- **総レコード数**: " . number_format($stats['total_count']) . "件\n";
    echo "- **未出品データ**: " . number_format($stats['unlisted_count']) . "件\n";
    echo "- **出品済みデータ**: " . number_format($stats['listed_count']) . "件\n";
    echo "- **画像URLあり**: " . number_format($stats['with_image_count']) . "件\n";
    echo "- **eBayカテゴリー設定済み**: " . number_format($stats['with_category_count']) . "件\n\n";
    
    // 4. scraped_yahoo_data のサンプル
    echo "## 4. scraped_yahoo_data JSONサンプル\n\n";
    $jsonSql = "SELECT scraped_yahoo_data 
                FROM yahoo_scraped_products 
                WHERE scraped_yahoo_data IS NOT NULL 
                  AND scraped_yahoo_data != '{}' 
                  AND scraped_yahoo_data != '' 
                LIMIT 1";
    
    $stmt = $pdo->query($jsonSql);
    $jsonSample = $stmt->fetchColumn();
    
    if ($jsonSample) {
        echo "```json\n";
        $decoded = json_decode($jsonSample, true);
        echo json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        echo "\n```\n\n";
    }
    
    // 5. APIレスポンスサンプル
    echo "## 5. editor.php APIレスポンスサンプル\n\n";
    echo "### GET ?action=get_unlisted_products&page=1&limit=2\n\n";
    echo "```json\n";
    
    $apiSql = "SELECT 
        id,
        source_item_id as item_id,
        COALESCE(active_title, 'タイトルなし') as title,
        price_jpy as price,
        COALESCE(active_image_url, 'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image') as picture_url,
        'N/A' as category_name,
        'Used' as condition_name,
        'Yahoo' as platform,
        updated_at,
        ebay_category_id,
        item_specifics
    FROM yahoo_scraped_products 
    WHERE (ebay_item_id IS NULL OR ebay_item_id = '' OR ebay_item_id = '0')
    ORDER BY id DESC 
    LIMIT 2";
    
    $stmt = $pdo->query($apiSql);
    $apiData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $apiResponse = [
        'success' => true,
        'data' => [
            'data' => $apiData,
            'total' => $stats['unlisted_count'],
            'page' => 1,
            'limit' => 2
        ],
        'message' => '未出品データ取得成功',
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode($apiResponse, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    echo "\n```\n\n";
    
    echo "=== データ取得完了 ===\n";
    
} catch (PDOException $e) {
    echo "データベースエラー: " . $e->getMessage() . "\n";
    exit(1);
}
?>
