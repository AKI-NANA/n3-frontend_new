<?php
/**
 * Phase 2 動作テスト
 * 価格変動 → 自動利益計算 の確認
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=" . str_repeat("=", 79) . "\n";
echo "Phase 2: 価格変動連携テスト開始: " . date('Y-m-d H:i:s') . "\n";
echo str_repeat("=", 80) . "\n\n";

// InventoryEngine 読み込み
require_once __DIR__ . '/inventory_management/core/InventoryEngine.php';

$engine = new InventoryEngine();

echo "🔄 在庫・価格チェック実行中...\n\n";

// 在庫チェック実行（価格変動シミュレーション付き）
$result = $engine->performInventoryCheck();

if ($result['success']) {
    $stats = $result['results'];
    
    echo "✅ 実行完了\n\n";
    echo "📊 結果サマリー:\n";
    echo "  - チェック商品数: {$stats['checked_products']}件\n";
    echo "  - 価格変動検知: {$stats['price_changes']}件\n";
    echo "  - 自動計算実行: {$stats['recalculated']}件\n";
    echo "  - エラー: " . count($stats['errors']) . "件\n\n";
    
    if (!empty($stats['errors'])) {
        echo "⚠️ エラー詳細:\n";
        foreach ($stats['errors'] as $error) {
            echo "  - {$error}\n";
        }
        echo "\n";
    }
    
    // データベース確認
    echo "🔍 更新結果確認中...\n\n";
    
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $pdo = new PDO($dsn, "postgres", "Kn240914");
    
    // 最新の価格変動履歴を確認
    $sql = "SELECT 
                sh.id,
                sh.product_id,
                ysp.active_title,
                sh.previous_price,
                sh.new_price,
                sh.change_type,
                sh.created_at,
                ysp.listing_price_usd,
                ysp.price_recalculated_at
            FROM stock_history sh
            JOIN yahoo_scraped_products ysp ON sh.product_id = ysp.id
            WHERE sh.change_type = 'price_change'
            ORDER BY sh.created_at DESC
            LIMIT 5";
    
    $stmt = $pdo->query($sql);
    $changes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (!empty($changes)) {
        echo "✅ 価格変動履歴（最新5件）:\n";
        foreach ($changes as $change) {
            $priceChange = $change['new_price'] - $change['previous_price'];
            $priceChangeSymbol = $priceChange > 0 ? '↑' : '↓';
            
            echo "\n  商品ID: {$change['product_id']}\n";
            echo "  タイトル: {$change['active_title']}\n";
            echo "  価格変動: ¥" . number_format($change['previous_price']) . 
                 " → ¥" . number_format($change['new_price']) . 
                 " ({$priceChangeSymbol}¥" . number_format(abs($priceChange)) . ")\n";
            echo "  出品価格(USD): \$" . ($change['listing_price_usd'] ?? '未計算') . "\n";
            echo "  再計算日時: " . ($change['price_recalculated_at'] ?? '未実行') . "\n";
        }
        echo "\n";
    } else {
        echo "⚠️ 価格変動履歴なし\n\n";
    }
    
    echo str_repeat("=", 80) . "\n";
    echo "✅ Phase 2 テスト完了\n";
    echo str_repeat("=", 80) . "\n";
    
} else {
    echo "❌ 失敗: {$result['error']}\n";
    exit(1);
}
?>
