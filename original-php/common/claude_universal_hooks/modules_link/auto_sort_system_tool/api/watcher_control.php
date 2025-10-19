<?php
/**
 * N3統合自動振り分けシステム - 監視制御API
 * ファイル: modules/auto_sort_system_tool/api/watcher_control.php
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

header('Content-Type: application/json; charset=UTF-8');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    $action = $input['action'] ?? '';
    $project_root = dirname(dirname(dirname(__DIR__)));
    
    switch ($action) {
        case 'start_watcher':
            $result = startWatcher($project_root);
            break;
            
        case 'stop_watcher':
            $result = stopWatcher($project_root);
            break;
            
        case 'check_status':
            $result = checkWatcherStatus($project_root);
            break;
            
        case 'scan_existing':
            $result = scanExisting($project_root);
            break;
            
        default:
            throw new Exception('不明なアクション: ' . $action);
    }
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Watcher Control API Error: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

function startWatcher($project_root) {
    try {
        $watcher_script = $project_root . '/hooks/5_tools/auto_download_watcher.py';
        $pid_file = $project_root . '/data/auto_sort_system/watcher.pid';
        $log_file = $project_root . '/logs/auto_download_watcher.log';
        
        // 既に起動中かチェック
        if (file_exists($pid_file)) {
            $pid = trim(file_get_contents($pid_file));
            if (isProcessRunning($pid)) {
                return [
                    'success' => false,
                    'error' => '監視システムは既に起動中です'
                ];
            }
        }
        
        // Python環境変数設定
        $env_vars = [
            'PYTHONPATH=' . $project_root . ':' . $project_root . '/hooks',
            'PYTHONIOENCODING=utf-8'
        ];
        
        // バックグラウンドで監視開始
        $command = 'cd ' . escapeshellarg($project_root) . ' && ' .
                  implode(' ', $env_vars) . ' ' .
                  'python3 ' . escapeshellarg($watcher_script) . ' --daemon' .
                  ' > ' . escapeshellarg($log_file) . ' 2>&1 & echo $!';
        
        $pid = trim(shell_exec($command));
        
        if ($pid && is_numeric($pid)) {
            // PIDファイル保存
            file_put_contents($pid_file, $pid);
            
            // 起動確認（3秒待機）
            sleep(3);
            
            if (isProcessRunning($pid)) {
                return [
                    'success' => true,
                    'message' => 'ダウンロードフォルダ監視を開始しました',
                    'data' => [
                        'pid' => $pid,
                        'log_file' => $log_file
                    ]
                ];
            } else {
                throw new Exception('監視プロセスの起動に失敗しました');
            }
        } else {
            throw new Exception('プロセス起動コマンドの実行に失敗しました');
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => '監視開始エラー: ' . $e->getMessage()
        ];
    }
}

function stopWatcher($project_root) {
    try {
        $pid_file = $project_root . '/data/auto_sort_system/watcher.pid';
        
        if (!file_exists($pid_file)) {
            return [
                'success' => false,
                'error' => '監視システムは起動していません'
            ];
        }
        
        $pid = trim(file_get_contents($pid_file));
        
        if ($pid && is_numeric($pid) && isProcessRunning($pid)) {
            // プロセス終了
            exec("kill {$pid}", $output, $return_code);
            
            // 強制終了が必要な場合
            sleep(2);
            if (isProcessRunning($pid)) {
                exec("kill -9 {$pid}");
            }
            
            // PIDファイル削除
            unlink($pid_file);
            
            return [
                'success' => true,
                'message' => 'ダウンロードフォルダ監視を停止しました'
            ];
        } else {
            // PIDファイル削除（プロセスが既に終了している場合）
            unlink($pid_file);
            
            return [
                'success' => true,
                'message' => '監視システムは既に停止していました'
            ];
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => '監視停止エラー: ' . $e->getMessage()
        ];
    }
}

function checkWatcherStatus($project_root) {
    try {
        $pid_file = $project_root . '/data/auto_sort_system/watcher.pid';
        $log_file = $project_root . '/logs/auto_download_watcher.log';
        
        $active = false;
        $pid = null;
        
        if (file_exists($pid_file)) {
            $pid = trim(file_get_contents($pid_file));
            if ($pid && is_numeric($pid) && isProcessRunning($pid)) {
                $active = true;
            }
        }
        
        // ログファイルから最新ステータス取得
        $log_tail = '';
        if (file_exists($log_file)) {
            $log_lines = file($log_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            $log_tail = implode("\n", array_slice($log_lines, -10));
        }
        
        return [
            'success' => true,
            'data' => [
                'active' => $active,
                'pid' => $pid,
                'log_tail' => $log_tail
            ]
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => '状態確認エラー: ' . $e->getMessage()
        ];
    }
}

function scanExisting($project_root) {
    try {
        $watcher_script = $project_root . '/hooks/5_tools/auto_download_watcher.py';
        
        // Python環境変数設定
        $env_vars = [
            'PYTHONPATH=' . $project_root . ':' . $project_root . '/hooks',
            'PYTHONIOENCODING=utf-8'
        ];
        
        // 既存ファイル一括処理実行
        $command = 'cd ' . escapeshellarg($project_root) . ' && ' .
                  implode(' ', $env_vars) . ' ' .
                  'python3 ' . escapeshellarg($watcher_script) . ' --scan 2>&1';
        
        $output = shell_exec($command);
        
        // 処理結果解析
        $processed_count = 0;
        if (preg_match('/処理完了.*?(\d+)/', $output, $matches)) {
            $processed_count = intval($matches[1]);
        }
        
        return [
            'success' => true,
            'message' => '既存ファイル処理が完了しました',
            'data' => [
                'processed_count' => $processed_count,
                'output' => $output
            ]
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => '既存ファイル処理エラー: ' . $e->getMessage()
        ];
    }
}

function isProcessRunning($pid) {
    if (!$pid || !is_numeric($pid)) {
        return false;
    }
    
    $command = "ps -p {$pid} > /dev/null 2>&1; echo $?";
    $result = trim(shell_exec($command));
    
    return $result === '0';
}
?>