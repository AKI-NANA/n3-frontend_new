<?php
/**
 * 在庫管理連携テストスクリプト
 * スクレイピング → 在庫管理 の動作確認
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=" . str_repeat("=", 79) . "\n";
echo "在庫管理連携テスト開始: " . date('Y-m-d H:i:s') . "\n";
echo str_repeat("=", 80) . "\n\n";

// database_functions.php を読み込み
require_once __DIR__ . '/database_functions.php';

// テストデータ作成
$test_product = [
    'item_id' => 'TEST_' . time(),
    'title' => 'テスト商品 - 在庫管理連携確認用',
    'description' => 'このデータは在庫管理システムとの連携テスト用です。',
    'current_price' => 12000,
    'condition' => 'Used',
    'category' => 'Test',
    'images' => ['https://via.placeholder.com/300x200/4CAF50/FFFFFF?text=TEST'],
    'seller_info' => ['name' => 'test_seller'],
    'auction_info' => [
        'end_time' => date('Y-m-d H:i:s', strtotime('+7 days')),
        'bid_count' => 0
    ],
    'source_url' => 'https://auctions.yahoo.co.jp/jp/auction/test_' . time(),
    'scraped_at' => date('Y-m-d H:i:s')
];

echo "📦 テストデータ:\n";
echo "  - 商品ID: {$test_product['item_id']}\n";
echo "  - タイトル: {$test_product['title']}\n";
echo "  - 価格: ¥" . number_format($test_product['current_price']) . "\n";
echo "  - URL: {$test_product['source_url']}\n\n";

// スクレイピングデータ保存（自動的に在庫管理にも登録される）
echo "🔄 スクレイピングデータ保存 + 在庫管理登録...\n";
$result = saveScrapedProductToDatabase($test_product);

if ($result['success']) {
    echo "✅ 成功！\n\n";
    echo "📊 結果:\n";
    echo "  - Product ID: {$result['product_id']}\n";
    echo "  - Source Item ID: {$result['source_item_id']}\n";
    echo "  - 在庫管理登録: " . ($result['inventory_registered'] ? '✅' : '❌') . "\n";
    echo "  - 監視有効: " . ($result['monitoring_enabled'] ? '✅' : '❌') . "\n\n";
    
    // データベース確認
    echo "🔍 データベース確認中...\n\n";
    
    $pdo = getScrapingDatabaseConnection();
    
    // yahoo_scraped_products 確認
    $stmt = $pdo->prepare("SELECT * FROM yahoo_scraped_products WHERE id = ?");
    $stmt->execute([$result['product_id']]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($product) {
        echo "✅ yahoo_scraped_products テーブル:\n";
        echo "  - ID: {$product['id']}\n";
        echo "  - タイトル: {$product['active_title']}\n";
        echo "  - 価格: ¥" . number_format($product['price_jpy']) . "\n";
        echo "  - ステータス: {$product['status']}\n\n";
    }
    
    // inventory_management 確認
    $stmt = $pdo->prepare("SELECT * FROM inventory_management WHERE product_id = ?");
    $stmt->execute([$result['product_id']]);
    $inventory = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($inventory) {
        echo "✅ inventory_management テーブル:\n";
        echo "  - Inventory ID: {$inventory['id']}\n";
        echo "  - Product ID: {$inventory['product_id']}\n";
        echo "  - 仕入れ先: {$inventory['source_platform']}\n";
        echo "  - 現在価格: ¥" . number_format($inventory['current_price']) . "\n";
        echo "  - 監視有効: " . ($inventory['monitoring_enabled'] ? 'はい' : 'いいえ') . "\n";
        echo "  - URLステータス: {$inventory['url_status']}\n\n";
    } else {
        echo "❌ inventory_management テーブルにデータなし\n\n";
    }
    
    // stock_history 確認
    $stmt = $pdo->prepare("SELECT * FROM stock_history WHERE product_id = ? ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$result['product_id']]);
    $history = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($history) {
        echo "✅ stock_history テーブル:\n";
        echo "  - History ID: {$history['id']}\n";
        echo "  - 変更タイプ: {$history['change_type']}\n";
        echo "  - 新価格: ¥" . number_format($history['new_price']) . "\n";
        echo "  - 変更元: {$history['change_source']}\n";
        echo "  - 記録日時: {$history['created_at']}\n\n";
    } else {
        echo "❌ stock_history テーブルにデータなし\n\n";
    }
    
    echo str_repeat("=", 80) . "\n";
    echo "✅ 在庫管理連携テスト完了\n";
    echo str_repeat("=", 80) . "\n";
    
} else {
    echo "❌ 失敗: {$result['error']}\n";
    exit(1);
}
?>
