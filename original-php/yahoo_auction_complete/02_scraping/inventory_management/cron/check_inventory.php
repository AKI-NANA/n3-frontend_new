#!/usr/bin/env php
<?php
/**
 * 在庫管理 定期実行スクリプト (ロボット対策版)
 * 
 * 実行内容:
 * 1. 出品済み商品の在庫・価格チェック
 * 2. 価格変動時の自動利益計算 (05_rieki)
 * 3. eBay API価格自動更新
 * 4. 同期状態の記録
 * 
 * ロボット対策:
 * - ランダム遅延（開始前・商品間）
 * - ランダム順序で商品取得
 * - User-Agentローテーション
 * 
 * Cron設定:
 * 0 6,22 * * * (朝6時・夜22時 = USA時間最適化)
 * 
 * @version 2.1.0 (ロボット対策版)
 * @created 2025-09-27
 */

// CLI実行のみ許可
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die('This script can only be run from command line');
}

require_once __DIR__ . '/../core/InventoryImplementationExtended.php';

// エラーハンドリング
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

// スクリプト実行時間制限解除
set_time_limit(0);
ini_set('memory_limit', '512M');

// ログ出力
function logMessage($level, $message, $context = []) {
    $timestamp = date('Y-m-d H:i:s');
    $contextStr = empty($context) ? '' : ' ' . json_encode($context, JSON_UNESCAPED_UNICODE);
    echo "[{$timestamp}] [{$level}] {$message}{$contextStr}\n";
}

try {
    logMessage('INFO', '🚀 在庫管理 定期チェック開始');
    
    // ロボット対策1: 開始前のランダム遅延（0-30秒）
    $startDelay = rand(0, 30);
    logMessage('INFO', "⏱️  ランダム遅延: {$startDelay}秒");
    sleep($startDelay);
    
    $engine = new InventoryImplementationExtended();
    
    // 未登録の出品済み商品を一括登録 (初回実行時)
    if (isset($argv[1]) && $argv[1] === '--init') {
        logMessage('INFO', '📦 初期登録モード: 未登録の出品済み商品を一括登録');
        $initResult = $engine->bulkRegisterListedProducts(500);
        logMessage('INFO', '✅ 初期登録完了', $initResult);
    }
    
    // ロボット対策2: ランダム順序で商品チェック
    $result = $engine->performInventoryCheckWithRandomization();
    
    logMessage('INFO', '✅ 在庫チェック完了', [
        'total_checked' => $result['total'],
        'updated' => $result['updated'],
        'errors' => $result['errors']
    ]);
    
    // 変更詳細ログ
    if (!empty($result['changes'])) {
        logMessage('INFO', '📊 価格変動詳細:');
        foreach ($result['changes'] as $change) {
            if (isset($change['changes'])) {
                foreach ($change['changes'] as $detail) {
                    if ($detail['type'] === 'price_change') {
                        logMessage('INFO', "  商品ID {$change['product_id']}: {$detail['old_price']}円 → {$detail['new_price']}円 ({$detail['change_percent']}%)");
                    }
                }
            }
        }
    }
    
    // 出品先モール価格一括同期 (オプション)
    if (isset($argv[1]) && $argv[1] === '--sync-all') {
        logMessage('INFO', '🔄 全出品先価格一括同期開始');
        $syncResult = $engine->syncAllListingPrices();
        logMessage('INFO', '✅ 一括同期完了', $syncResult);
    }
    
    logMessage('INFO', '🎉 在庫管理 定期チェック完了');
    exit(0);
    
} catch (Exception $e) {
    logMessage('ERROR', '❌ 致命的エラー発生', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    exit(1);
}
?>
