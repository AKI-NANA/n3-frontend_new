<?php
/**
 * N3統合自動振り分けシステム - フィードバックAPI
 * ファイル: modules/auto_sort_system_tool/api/submit_feedback.php
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

header('Content-Type: application/json; charset=UTF-8');

try {
    // POSTデータの取得
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    $file_path = $input['file_path'] ?? '';
    $predicted_category = $input['predicted_category'] ?? '';
    $actual_category = $input['actual_category'] ?? '';
    $user_notes = $input['user_notes'] ?? '';
    
    if (empty($file_path) || empty($predicted_category) || empty($actual_category)) {
        throw new Exception('必要なパラメータが不足しています');
    }
    
    // Python フィードバック保存スクリプト実行
    $project_root = dirname(dirname(dirname(__DIR__)));
    
    $python_code = '
import sys
sys.path.append("' . $project_root . '/hooks/2_optional")

from auto_sort_ai_learning_hook import AutoSortAILearning
import json

try:
    ai_learning = AutoSortAILearning()
    ai_learning.save_user_feedback(
        "' . addslashes($file_path) . '",
        "' . addslashes($predicted_category) . '",
        "' . addslashes($actual_category) . '",
        "' . addslashes($user_notes) . '"
    )
    print(json.dumps({"success": True}, ensure_ascii=False))
except Exception as e:
    print(json.dumps({"error": str(e)}, ensure_ascii=False))
';
    
    // 一時ファイルにPythonコードを保存
    $temp_script = sys_get_temp_dir() . '/auto_sort_feedback_' . time() . '.py';
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
        throw new Exception('フィードバック保存に失敗しました: ' . implode("\n", $output));
    }
    
    $result_json = implode("\n", $output);
    $result_data = json_decode($result_json, true);
    
    if (!$result_data) {
        throw new Exception('フィードバック結果の解析に失敗しました');
    }
    
    if (isset($result_data['error'])) {
        throw new Exception($result_data['error']);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'フィードバックを保存しました'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Auto Sort Feedback API Error: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>