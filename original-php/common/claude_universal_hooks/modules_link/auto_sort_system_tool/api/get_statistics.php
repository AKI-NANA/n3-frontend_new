<?php
/**
 * N3統合自動振り分けシステム - 統計取得API
 * ファイル: modules/auto_sort_system_tool/api/get_statistics.php
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

header('Content-Type: application/json; charset=UTF-8');

try {
    // Python統計取得スクリプト実行
    $project_root = dirname(dirname(dirname(__DIR__)));
    $python_script = $project_root . '/hooks/5_tools/auto_sort_processor_hook.py';
    
    // 統計取得用の一時的なPythonスクリプト実行
    $python_code = '
import sys
sys.path.append("' . $project_root . '/hooks/2_optional")
sys.path.append("' . $project_root . '/hooks/5_tools")

from auto_sort_processor_hook import AutoSortProcessor
import json

try:
    processor = AutoSortProcessor()
    stats = processor.get_processing_stats()
    print(json.dumps(stats, ensure_ascii=False))
except Exception as e:
    print(json.dumps({"error": str(e)}, ensure_ascii=False))
';
    
    // 一時ファイルにPythonコードを保存
    $temp_script = sys_get_temp_dir() . '/auto_sort_stats_' . time() . '.py';
    file_put_contents($temp_script, $python_code);
    
    // 環境変数設定
    putenv("PYTHONPATH=" . $project_root . ":" . $project_root . "/hooks");
    
    // Python実行
    $output = [];
    $return_code = 0;
    exec("python3 {$temp_script} 2>&1", $output, $return_code);
    
    // 一時ファイル削除
    unlink($temp_script);
    
    if ($return_code !== 0) {
        throw new Exception('統計取得に失敗しました: ' . implode("\n", $output));
    }
    
    $result_json = implode("\n", $output);
    $stats_data = json_decode($result_json, true);
    
    if (!$stats_data) {
        throw new Exception('統計データの解析に失敗しました');
    }
    
    if (isset($stats_data['error'])) {
        throw new Exception($stats_data['error']);
    }
    
    echo json_encode([
        'success' => true,
        'data' => $stats_data
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Auto Sort Statistics API Error: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>