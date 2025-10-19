<?php
/**
 * Cron実行用 - 自動出品処理
 * 実行: */5 * * * * /usr/bin/php /path/to/cron_auto_listing.php
 */

require_once(__DIR__ . '/auto_listing_scheduler.php');

try {
    // セキュリティチェック
    if (php_sapi_name() === 'cli' || (isset($argv[1]) && $argv[1] === 'auto-listing-secret-2025')) {
        $scheduler = new AutoListingScheduler();
        $result = $scheduler->executePendingListings();
        
        // ログ出力
        error_log(date('Y-m-d H:i:s') . " - 自動出品実行結果: " . json_encode($result));
        
        if (php_sapi_name() !== 'cli') {
            header('Content-Type: application/json');
            echo json_encode($result);
        }
    } else {
        throw new Exception('不正なアクセスです');
    }
    
} catch (Exception $e) {
    error_log("Cron自動出品エラー: " . $e->getMessage());
}
?>
