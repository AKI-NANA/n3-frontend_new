<?php
/**
 * 統一API応答クラス
 * Yahoo Auction統合システム - shared 基盤
 */

class ApiResponse {
    
    /**
     * 成功応答の送信
     * 
     * @param mixed $data レスポンスデータ
     * @param string $message メッセージ
     * @param string $module モジュール名
     * @return void
     */
    public static function success($data = null, $message = '', $module = '') {
        self::send([
            'success' => true,
            'data' => $data,
            'message' => $message,
            'module' => $module,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * エラー応答の送信
     * 
     * @param string $message エラーメッセージ
     * @param int $code エラーコード
     * @param string $module モジュール名
     * @param array $details 詳細情報
     * @return void
     */
    public static function error($message, $code = 500, $module = '', $details = []) {
        self::send([
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => $code,
                'details' => $details
            ],
            'module' => $module,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * 検証エラー応答の送信
     * 
     * @param array $errors 検証エラー配列
     * @param string $module モジュール名
     * @return void
     */
    public static function validationError($errors, $module = '') {
        self::send([
            'success' => false,
            'error' => [
                'message' => '入力データに問題があります',
                'code' => 422,
                'validation_errors' => $errors
            ],
            'module' => $module,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * 認証エラー応答の送信
     * 
     * @param string $message メッセージ
     * @param string $module モジュール名
     * @return void
     */
    public static function unauthorized($message = '認証が必要です', $module = '') {
        self::send([
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => 401
            ],
            'module' => $module,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * 権限エラー応答の送信
     * 
     * @param string $message メッセージ
     * @param string $module モジュール名
     * @return void
     */
    public static function forbidden($message = 'アクセスが拒否されました', $module = '') {
        self::send([
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => 403
            ],
            'module' => $module,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * データ不存在エラー応答の送信
     * 
     * @param string $message メッセージ
     * @param string $module モジュール名
     * @return void
     */
    public static function notFound($message = 'データが見つかりません', $module = '') {
        self::send([
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => 404
            ],
            'module' => $module,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * ページネーション付き成功応答の送信
     * 
     * @param array $data データ配列
     * @param int $total 総件数
     * @param int $page 現在ページ
     * @param int $limit ページサイズ
     * @param string $message メッセージ
     * @param string $module モジュール名
     * @return void
     */
    public static function paginated($data, $total, $page, $limit, $message = '', $module = '') {
        $totalPages = ceil($total / $limit);
        
        self::send([
            'success' => true,
            'data' => $data,
            'pagination' => [
                'total' => $total,
                'current_page' => $page,
                'per_page' => $limit,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1
            ],
            'message' => $message,
            'module' => $module,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * ファイルダウンロード応答の送信
     * 
     * @param string $filePath ファイルパス
     * @param string $fileName ダウンロード時のファイル名
     * @param string $contentType Content-Type
     * @return void
     */
    public static function download($filePath, $fileName, $contentType = 'application/octet-stream') {
        if (!file_exists($filePath)) {
            self::notFound('ファイルが見つかりません');
            return;
        }
        
        // 出力バッファをクリア
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        header('Content-Type: ' . $contentType);
        header('Content-Disposition: attachment; filename="' . $fileName . '"');
        header('Content-Length: ' . filesize($filePath));
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        
        readfile($filePath);
        exit;
    }
    
    /**
     * CSV応答の送信
     * 
     * @param array $data CSVデータ（2次元配列）
     * @param string $fileName ファイル名
     * @param array $headers ヘッダー行（省略時は$dataの最初の行のキーを使用）
     * @return void
     */
    public static function csv($data, $fileName, $headers = []) {
        // 出力バッファをクリア
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $fileName . '"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        
        // UTF-8 BOM出力
        echo "\xEF\xBB\xBF";
        
        $output = fopen('php://output', 'w');
        
        // ヘッダー行出力
        if (!empty($headers)) {
            fputcsv($output, $headers);
        } elseif (!empty($data)) {
            fputcsv($output, array_keys($data[0]));
        }
        
        // データ行出力
        foreach ($data as $row) {
            fputcsv($output, $row);
        }
        
        fclose($output);
        exit;
    }
    
    /**
     * JSON応答の実際の送信
     * 
     * @param array $data 応答データ
     * @return void
     */
    private static function send($data) {
        // 出力バッファをクリア
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        // HTTPステータスコードの設定
        if (!$data['success'] && isset($data['error']['code'])) {
            http_response_code($data['error']['code']);
        }
        
        // ヘッダー設定
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        
        // CORS対応（必要に応じて）
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        
        // JSON出力
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * バッチ処理結果応答の送信
     * 
     * @param array $results 結果配列
     * @param string $message メッセージ
     * @param string $module モジュール名
     * @return void
     */
    public static function batch($results, $message = '', $module = '') {
        $successCount = 0;
        $errorCount = 0;
        $errors = [];
        
        foreach ($results as $index => $result) {
            if ($result['success']) {
                $successCount++;
            } else {
                $errorCount++;
                $errors[] = [
                    'index' => $index,
                    'error' => $result['error']
                ];
            }
        }
        
        self::send([
            'success' => $errorCount === 0,
            'data' => [
                'total' => count($results),
                'success_count' => $successCount,
                'error_count' => $errorCount,
                'results' => $results,
                'errors' => $errors
            ],
            'message' => $message ?: "バッチ処理完了: 成功{$successCount}件、エラー{$errorCount}件",
            'module' => $module,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}
?>