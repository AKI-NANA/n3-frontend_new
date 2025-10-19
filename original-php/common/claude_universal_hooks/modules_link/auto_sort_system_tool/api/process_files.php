<?php
/**
 * N3統合自動振り分けシステム - ファイル処理API
 * ファイル: modules/auto_sort_system_tool/api/process_files.php
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

header('Content-Type: application/json; charset=UTF-8');

try {
    // POSTデータの取得
    $move_files = isset($_POST['move_files']) && $_POST['move_files'] === '1';
    $processing_mode = $_POST['processing_mode'] ?? 'auto';
    $confidence_threshold = floatval($_POST['confidence_threshold'] ?? 0.75);
    
    // アップロードされたファイルの処理
    if (!isset($_FILES['files']) || empty($_FILES['files']['name'])) {
        throw new Exception('ファイルがアップロードされていません');
    }
    
    $uploaded_files = $_FILES['files'];
    $file_count = is_array($uploaded_files['name']) ? count($uploaded_files['name']) : 1;
    
    // データディレクトリ設定
    $project_root = dirname(dirname(dirname(__DIR__)));
    $data_dir = $project_root . '/data/auto_sort_system';
    $input_dir = $data_dir . '/input';
    $temp_dir = $input_dir . '/temp_' . time();
    
    // 一時ディレクトリ作成
    if (!is_dir($temp_dir)) {
        mkdir($temp_dir, 0755, true);
    }
    
    $uploaded_file_paths = [];
    
    // ファイルを一時ディレクトリに保存
    for ($i = 0; $i < $file_count; $i++) {
        $file_name = is_array($uploaded_files['name']) ? $uploaded_files['name'][$i] : $uploaded_files['name'];
        $file_tmp = is_array($uploaded_files['tmp_name']) ? $uploaded_files['tmp_name'][$i] : $uploaded_files['tmp_name'];
        $file_error = is_array($uploaded_files['error']) ? $uploaded_files['error'][$i] : $uploaded_files['error'];
        
        if ($file_error !== UPLOAD_ERR_OK) {
            throw new Exception("ファイルアップロードエラー: {$file_name}");
        }
        
        // ファイル名のサニタイズ
        $safe_filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file_name);
        $destination_path = $temp_dir . '/' . $safe_filename;
        
        if (move_uploaded_file($file_tmp, $destination_path)) {
            $uploaded_file_paths[] = $destination_path;
        } else {
            throw new Exception("ファイル移動失敗: {$file_name}");
        }
    }
    
    // Python処理システム実行
    $python_script = $project_root . '/hooks/5_tools/auto_sort_processor_hook.py';
    $python_command = "python3 {$python_script}";
    
    // 処理パラメータをJSONファイルで渡す
    $params = [
        'input_path' => $temp_dir,
        'move_files' => $move_files,
        'processing_mode' => $processing_mode,
        'confidence_threshold' => $confidence_threshold,
        'uploaded_files' => $uploaded_file_paths
    ];
    
    $params_file = $temp_dir . '/processing_params.json';
    file_put_contents($params_file, json_encode($params, JSON_UNESCAPED_UNICODE));
    
    // Python処理実行
    $output = [];
    $return_code = 0;
    
    // 環境変数設定
    putenv("PYTHONPATH=" . $project_root . ":" . $project_root . "/hooks");
    putenv("AUTO_SORT_PARAMS_FILE=" . $params_file);
    
    exec($python_command . " 2>&1", $output, $return_code);
    
    if ($return_code !== 0) {
        $error_output = implode("\n", $output);
        throw new Exception("処理エラー: {$error_output}");
    }
    
    // 結果ファイル読み込み
    $result_file = $temp_dir . '/processing_result.json';
    
    if (file_exists($result_file)) {
        $result_data = json_decode(file_get_contents($result_file), true);
        
        if (!$result_data) {
            throw new Exception('処理結果の解析に失敗しました');
        }
        
        // 一時ファイルクリーンアップ
        array_map('unlink', glob($temp_dir . '/*'));
        rmdir($temp_dir);
        
        echo json_encode([
            'success' => true,
            'message' => '処理が完了しました',
            'data' => $result_data
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        throw new Exception('処理結果ファイルが見つかりません');
    }
    
} catch (Exception $e) {
    // エラーログ記録
    error_log("Auto Sort API Error: " . $e->getMessage());
    
    // 一時ファイルクリーンアップ（エラー時）
    if (isset($temp_dir) && is_dir($temp_dir)) {
        array_map('unlink', glob($temp_dir . '/*'));
        rmdir($temp_dir);
    }
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>