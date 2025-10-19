<?php
/**
 * TCG在庫監視定期実行スクリプト
 * 
 * cron設定例: */2 * * * * php /path/to/tcg_inventory_cron.php
 * (2時間毎に実行)
 * 
 * @version 1.0.0
 * @created 2025-09-26
 */

// CLI実行のみ許可
if (php_sapi_name() !== 'cli') {
    die('このスクリプトはコマンドラインからのみ実行できます' . PHP_EOL);
}

require_once __DIR__ . '/../../shared/core/database.php';
require_once __DIR__ . '/../common/TCGInventoryManager.php';

echo "========================================" . PHP_EOL;
echo "TCG在庫監視 定期実行" . PHP_EOL;
echo "実行時刻: " . date('Y-m-d H:i:s') . PHP_EOL;
echo "========================================" . PHP_EOL . PHP_EOL;

try {
    $pdo = getDBConnection();
    $manager = new TCGInventoryManager($pdo);
    
    // 一括在庫チェック実行
    $results = $manager->checkAllTCGStock();
    
    // 結果集計
    $successCount = 0;
    $errorCount = 0;
    $changesDetected = 0;
    
    foreach ($results as $result) {
        if ($result['success']) {
            $successCount++;
            if (!empty($result['changes'])) {
                $changesDetected++;
            }
        } else {
            $errorCount++;
        }
    }
    
    // 結果出力
    echo "チェック完了" . PHP_EOL;
    echo "- 総チェック数: " . count($results) . PHP_EOL;
    echo "- 成功: {$successCount}" . PHP_EOL;
    echo "- エラー: {$errorCount}" . PHP_EOL;
    echo "- 変動検知: {$changesDetected}" . PHP_EOL . PHP_EOL;
    
    // 詳細ログ出力
    if ($changesDetected > 0) {
        echo "========== 変動検知詳細 ==========" . PHP_EOL;
        foreach ($results as $result) {
            if ($result['success'] && !empty($result['changes'])) {
                echo "商品ID: " . ($result['inventory_id'] ?? 'Unknown') . PHP_EOL;
                
                if (isset($result['changes']['price'])) {
                    $pc = $result['changes']['price'];
                    echo "  価格変動: ¥" . number_format($pc['old']) . " → ¥" . number_format($pc['new']);
                    echo " ({$pc['change_percent']}%)" . PHP_EOL;
                }
                
                if (isset($result['changes']['stock_status'])) {
                    $sc = $result['changes']['stock_status'];
                    echo "  在庫変動: {$sc['old']} → {$sc['new']}" . PHP_EOL;
                }
                
                echo PHP_EOL;
            }
        }
    }
    
    echo "========================================" . PHP_EOL;
    echo "処理完了" . PHP_EOL;
    echo "========================================" . PHP_EOL;
    
    exit(0);
    
} catch (Exception $e) {
    echo "エラー発生: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
