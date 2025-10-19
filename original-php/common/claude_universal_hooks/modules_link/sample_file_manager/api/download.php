<?php
/**
 * 🔸 📥 ダウンロード_h - CAIDS統合ファイルダウンロードAPI
 * ZIP圧縮・セキュリティ・ログ記録統合
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// CAIDS量子化エラーハンドリング
function caids_download_error($message, $code = 404) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $message,
        'caids_error_id' => 'DL_ERR_' . time(),
        'caids_hooks_applied' => ['🔸 ⚠️ エラー処理_h']
    ]);
    exit;
}

try {
    $action = $_GET['action'] ?? 'single';
    
    // CAIDS量子化データベース接続
    $db = new PDO('sqlite:../config/caids_database.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    switch ($action) {
        case 'single':
            // 単一ファイルダウンロード
            $file_id = $_GET['file_id'] ?? '';
            if (empty($file_id)) {
                caids_download_error('ファイルIDが指定されていません');
            }
            
            // CAIDS量子化ファイル情報取得
            $stmt = $db->prepare("SELECT * FROM files WHERE file_id = :file_id");
            $stmt->execute(['file_id' => $file_id]);
            $file_info = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$file_info) {
                caids_download_error('ファイルが見つかりません');
            }
            
            $file_path = $file_info['file_path'];
            if (!file_exists($file_path)) {
                caids_download_error('ファイルが存在しません');
            }
            
            // CAIDS量子化ダウンロード実行
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . $file_info['original_name'] . '"');
            header('Content-Length: ' . filesize($file_path));
            header('X-CAIDS-Hooks: 🔸 📥 ダウンロード_h, 🔸 🛡️ セキュリティ_h');
            
            readfile($file_path);
            
            // CAIDS量子化ログ記録
            error_log("[CAIDS] File downloaded: {$file_info['original_name']} by " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
            break;
            
        case 'zip':
            // ZIP圧縮ダウンロード
            $file_ids = $_GET['file_ids'] ?? '';
            if (empty($file_ids)) {
                caids_download_error('ファイルIDが指定されていません');
            }
            
            $file_ids_array = explode(',', $file_ids);
            $placeholders = str_repeat('?,', count($file_ids_array) - 1) . '?';
            
            // CAIDS量子化複数ファイル情報取得
            $stmt = $db->prepare("SELECT * FROM files WHERE file_id IN ($placeholders)");
            $stmt->execute($file_ids_array);
            $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($files)) {
                caids_download_error('ファイルが見つかりません');
            }
            
            // CAIDS量子化ZIP作成
            $zip_filename = 'caids_files_' . date('Ymd_His') . '.zip';
            $zip_path = '../uploads/temp/' . $zip_filename;
            
            // 一時ディレクトリ作成
            $temp_dir = dirname($zip_path);
            if (!is_dir($temp_dir)) {
                mkdir($temp_dir, 0755, true);
            }
            
            $zip = new ZipArchive();
            if ($zip->open($zip_path, ZipArchive::CREATE) !== TRUE) {
                caids_download_error('ZIP作成に失敗しました', 500);
            }
            
            foreach ($files as $file) {
                if (file_exists($file['file_path'])) {
                    $zip->addFile($file['file_path'], $file['original_name']);
                }
            }
            $zip->close();
            
            // CAIDS量子化ZIPダウンロード
            header('Content-Type: application/zip');
            header('Content-Disposition: attachment; filename="' . $zip_filename . '"');
            header('Content-Length: ' . filesize($zip_path));
            header('X-CAIDS-Hooks: 🔸 📥 ZIP圧縮_h, 🔸 🛡️ セキュリティ_h');
            
            readfile($zip_path);
            
            // CAIDS量子化一時ファイル削除
            unlink($zip_path);
            
            // CAIDS量子化ログ記録
            error_log("[CAIDS] ZIP downloaded: " . count($files) . " files by " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
            break;
            
        case 'list':
            // ファイル一覧取得
            header('Content-Type: application/json');
            
            $stmt = $db->query("SELECT file_id, original_name, file_size, mime_type, uploaded_at FROM files ORDER BY uploaded_at DESC");
            $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // CAIDS量子化ファイルサイズフォーマット
            foreach ($files as &$file) {
                $file['file_size_formatted'] = formatBytes($file['file_size']);
                $file['file_type_icon'] = getFileTypeIcon($file['mime_type']);
            }
            
            echo json_encode([
                'success' => true,
                'files' => $files,
                'total_count' => count($files),
                'caids_hooks_applied' => ['🔸 📋 ファイル一覧_h', '🔸 📊 データ処理_h'],
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            break;
            
        default:
            caids_download_error('無効なアクションです', 400);
    }
    
} catch (Exception $e) {
    caids_download_error('システムエラー: ' . $e->getMessage(), 500);
}

// CAIDS量子化ユーティリティ関数
function formatBytes($size, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    for ($i = 0; $size >= 1024 && $i < count($units) - 1; $i++) {
        $size /= 1024;
    }
    
    return round($size, $precision) . ' ' . $units[$i];
}

function getFileTypeIcon($mime_type) {
    $icons = [
        'image/' => '🖼️',
        'application/pdf' => '📄',
        'text/' => '📝',
        'audio/' => '🎵',
        'video/' => '🎬',
        'application/zip' => '📦'
    ];
    
    foreach ($icons as $type => $icon) {
        if (strpos($mime_type, $type) === 0) {
            return $icon;
        }
    }
    
    return '📄';
}
?>