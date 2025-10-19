<?php
/**
 * N3準拠 ヤフオクスクレイパー Ajax専用ハンドラー
 * Python スクレイパー実行とJSON応答
 */

// 直接アクセス防止
if (!defined('SECURE_ACCESS')) define('SECURE_ACCESS', true);

// POST以外のリクエストを拒否
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['success' => false, 'error' => 'POST method required']);
    exit;
}

// Buffer制御
while (ob_get_level()) ob_end_clean();
ob_start();

// レスポンスヘッダー設定
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, must-revalidate');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');

// セッション開始
session_start();

// CSRF保護
if (!isset($_POST['csrf_token']) || !isset($_SESSION['csrf_token']) || 
    !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
    echo json_encode(['success' => false, 'error' => 'CSRF token invalid']);
    exit;
}

try {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'scrape_yahoo_auction':
            $result = handleYahooAuctionScraping();
            break;
            
        case 'test_connection':
            $result = ['success' => true, 'message' => 'Ajax connection successful'];
            break;
            
        default:
            $result = ['success' => false, 'error' => 'Unknown action: ' . $action];
    }
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Yahoo Scraper Ajax Error: " . $e->getMessage());
    echo json_encode([
        'success' => false, 
        'error' => 'Server error occurred: ' . $e->getMessage()
    ]);
} finally {
    ob_end_flush();
    exit;
}

/**
 * ヤフオクスクレイピング実行
 */
function handleYahooAuctionScraping() {
    $yahoo_url = $_POST['yahoo_url'] ?? '';
    
    // URL検証
    if (empty($yahoo_url)) {
        return ['success' => false, 'error' => 'URLが指定されていません'];
    }
    
    if (strpos($yahoo_url, 'auctions.yahoo.co.jp') === false) {
        return ['success' => false, 'error' => 'ヤフオクのURLを指定してください'];
    }
    
    // URL安全性チェック
    if (!filter_var($yahoo_url, FILTER_VALIDATE_URL)) {
        return ['success' => false, 'error' => '無効なURL形式です'];
    }
    
    try {
        // Pythonスクレイパー実行
        $scraped_data = executePythonScraper($yahoo_url);
        
        if ($scraped_data === false) {
            return [
                'success' => false, 
                'error' => 'Pythonスクレイパーの実行に失敗しました'
            ];
        }
        
        // 結果検証
        if (!isset($scraped_data['scrape_success']) || $scraped_data['scrape_success'] !== true) {
            return [
                'success' => false,
                'error' => $scraped_data['error'] ?? 'スクレイピング処理でエラーが発生しました'
            ];
        }
        
        // 成功レスポンス
        return [
            'success' => true,
            'data' => [
                'title_jp' => $scraped_data['title_jp'] ?? 'タイトル取得失敗',
                'price_jpy' => intval($scraped_data['price_jpy'] ?? 0),
                'price_text' => $scraped_data['price_text'] ?? '価格取得失敗',
                'description_jp' => $scraped_data['description_jp'] ?? '説明取得失敗',
                'image_urls' => $scraped_data['image_urls'] ?? '',
                'scrape_timestamp' => $scraped_data['scrape_timestamp'] ?? date('Y-m-d H:i:s')
            ]
        ];
        
    } catch (Exception $e) {
        error_log("Scraping execution error: " . $e->getMessage());
        return [
            'success' => false,
            'error' => 'スクレイピング実行中にエラーが発生しました: ' . $e->getMessage()
        ];
    }
}

/**
 * Pythonスクレイパー実行
 */
function executePythonScraper($url) {
    // Python実行ディレクトリの検出
    $python_dirs = [
        '/Users/aritahiroaki/yahoo_auction_tool',  // 元のディレクトリ
        '/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_scraper/python',  // N3内
        '/Users/aritahiroaki/Desktop/yahoo_auction_app'  // 代替ディレクトリ
    ];
    
    $python_script_path = null;
    $working_directory = null;
    
    foreach ($python_dirs as $dir) {
        $script_path = $dir . '/yahoo_auction_scraper.py';
        if (file_exists($script_path)) {
            $python_script_path = $script_path;
            $working_directory = $dir;
            break;
        }
    }
    
    if (!$python_script_path) {
        error_log("Python scraper script not found in any of the expected directories");
        return false;
    }
    
    // Python環境の検出
    $python_commands = ['python3', 'python', '/usr/bin/python3'];
    $python_executable = null;
    
    foreach ($python_commands as $cmd) {
        $test_output = shell_exec("which $cmd 2>/dev/null");
        if (!empty($test_output)) {
            $python_executable = trim($test_output);
            break;
        }
    }
    
    if (!$python_executable) {
        error_log("Python executable not found");
        return false;
    }
    
    // 仮想環境の確認と設定
    $venv_path = $working_directory . '/venv';
    if (is_dir($venv_path)) {
        $python_executable = $venv_path . '/bin/python';
    }
    
    // Pythonスクリプト実行コマンド構築
    $escaped_url = escapeshellarg($url);
    $escaped_script = escapeshellarg($python_script_path);
    
    // 実行用のPythonコード
    $python_code = "
import sys
sys.path.append('$working_directory')
from yahoo_auction_scraper import scrape_yahoo_auction
import json

try:
    result = scrape_yahoo_auction('$url', debug=False)
    print(json.dumps(result, ensure_ascii=False))
except Exception as e:
    error_result = {
        'scrape_success': False,
        'error': str(e)
    }
    print(json.dumps(error_result, ensure_ascii=False))
";
    
    // 一時ファイルにPythonコードを書き込み
    $temp_file = tempnam(sys_get_temp_dir(), 'yahoo_scraper_');
    file_put_contents($temp_file, $python_code);
    
    try {
        // Pythonスクリプト実行
        $command = "$python_executable $temp_file 2>&1";
        
        // 実行時間制限を設定（60秒）
        $descriptorspec = array(
            0 => array("pipe", "r"),
            1 => array("pipe", "w"),
            2 => array("pipe", "w")
        );
        
        $process = proc_open($command, $descriptorspec, $pipes, $working_directory);
        
        if (is_resource($process)) {
            // 入力を閉じる
            fclose($pipes[0]);
            
            // 出力を読み取り（タイムアウト付き）
            $output = '';
            $error = '';
            
            $timeout = 60; // 60秒タイムアウト
            $start_time = time();
            
            while (time() - $start_time < $timeout) {
                $status = proc_get_status($process);
                if (!$status['running']) {
                    break;
                }
                usleep(100000); // 0.1秒待機
            }
            
            $output = stream_get_contents($pipes[1]);
            $error = stream_get_contents($pipes[2]);
            
            fclose($pipes[1]);
            fclose($pipes[2]);
            
            $return_value = proc_close($process);
            
            // デバッグログ
            error_log("Python command: $command");
            error_log("Python output: $output");
            error_log("Python error: $error");
            error_log("Return value: $return_value");
            
            if (!empty($output)) {
                $json_data = json_decode(trim($output), true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    return $json_data;
                } else {
                    error_log("JSON decode error: " . json_last_error_msg() . " | Output: $output");
                }
            }
            
            if (!empty($error)) {
                error_log("Python stderr: $error");
            }
        }
        
        return false;
        
    } finally {
        // 一時ファイル削除
        if (file_exists($temp_file)) {
            unlink($temp_file);
        }
    }
}

/**
 * 入力値サニタイズ
 */
function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * レスポンス送信とログ記録
 */
function logAndRespond($data, $is_error = false) {
    $log_message = date('Y-m-d H:i:s') . " - Yahoo Scraper: " . 
                   ($is_error ? 'ERROR - ' : 'SUCCESS - ') . 
                   json_encode($data, JSON_UNESCAPED_UNICODE);
    
    error_log($log_message);
    
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
}
?>
