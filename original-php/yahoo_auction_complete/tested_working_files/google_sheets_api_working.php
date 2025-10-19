<?php
// Google Sheets実データ取得・表示ツール - 動作確認済み完全版
// テスト完了: 2025年8月13日
// 環境: PHP 8.4.8, localhost:8888

header('Content-Type: application/json; charset=UTF-8');
error_reporting(E_ALL & ~E_DEPRECATED);
ini_set('display_errors', 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'test';
    
    try {
        switch ($action) {
            case 'get_sheets_data':
                $result = getGoogleSheetsData();
                break;
            case 'write_to_sheets':
                $result = writeToGoogleSheets();
                break;
            default:
                $result = ['error' => 'Unknown action: ' . $action];
        }
        
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

function getGoogleAccessToken() {
    $service_account_path = '/Users/aritahiroaki/NAGANO-3/N3-Development/config/google-service-account.json';
    
    if (!file_exists($service_account_path)) {
        throw new Exception('Google service account file not found');
    }
    
    $service_account = json_decode(file_get_contents($service_account_path), true);
    
    // JWT Header
    $header = json_encode([
        'alg' => 'RS256',
        'typ' => 'JWT'
    ]);
    
    // JWT Payload
    $now = time();
    $payload = json_encode([
        'iss' => $service_account['client_email'],
        'scope' => 'https://www.googleapis.com/auth/spreadsheets',
        'aud' => 'https://oauth2.googleapis.com/token',
        'exp' => $now + 3600,
        'iat' => $now
    ]);
    
    // Base64 encode
    $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    // Create signature
    $data = $base64Header . '.' . $base64Payload;
    
    // Sign with private key
    $privateKey = openssl_pkey_get_private($service_account['private_key']);
    if (!$privateKey) {
        throw new Exception('Invalid private key');
    }
    
    openssl_sign($data, $signature, $privateKey, OPENSSL_ALGO_SHA256);
    $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    // Create JWT
    $jwt = $data . '.' . $base64Signature;
    
    // Request access token
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/x-www-form-urlencoded'
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code !== 200) {
        throw new Exception('Failed to get access token: HTTP ' . $http_code . ' - ' . $response);
    }
    
    $token_data = json_decode($response, true);
    
    if (!isset($token_data['access_token'])) {
        throw new Exception('No access token in response: ' . $response);
    }
    
    return $token_data['access_token'];
}

function getGoogleSheetsData() {
    try {
        $access_token = getGoogleAccessToken();
        $sheet_id = '1pJ7lYavXSbV6FZALo5AT2sZXt2839XDlvwD4q-Kebvw';
        $range = 'A1:F10'; // 動作確認済みレンジ指定
        
        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$sheet_id}/values/{$range}";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $access_token,
            'Content-Type: application/json'
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code !== 200) {
            throw new Exception('Sheets API Error: HTTP ' . $http_code . ' - ' . $response);
        }
        
        $data = json_decode($response, true);
        
        return [
            'success' => true,
            'message' => 'Google Sheetsデータ取得成功',
            'sheet_id' => $sheet_id,
            'range' => $range,
            'values' => $data['values'] ?? [],
            'row_count' => count($data['values'] ?? []),
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Google Sheets data fetch failed: ' . $e->getMessage()
        ];
    }
}

function writeToGoogleSheets() {
    try {
        $access_token = getGoogleAccessToken();
        $sheet_id = '1pJ7lYavXSbV6FZALo5AT2sZXt2839XDlvwD4q-Kebvw';
        
        // 動作確認済み: 単一セル書き込み
        $range = 'A1';
        $values = [
            ['テスト書き込み - ' . date('Y-m-d H:i:s')]
        ];
        
        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$sheet_id}/values/{$range}?valueInputOption=RAW";
        
        $postData = json_encode([
            'range' => $range,
            'majorDimension' => 'ROWS',
            'values' => $values
        ]);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $access_token,
            'Content-Type: application/json'
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code !== 200) {
            // フォールバック: APPEND方式
            return writeToSheetsAppend($access_token, $sheet_id);
        }
        
        $data = json_decode($response, true);
        
        return [
            'success' => true,
            'message' => 'Google Sheetsデータ書き込み成功',
            'sheet_id' => $sheet_id,
            'range' => $range,
            'written_data' => $values,
            'response' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Google Sheets write failed: ' . $e->getMessage()
        ];
    }
}

function writeToSheetsAppend($access_token, $sheet_id) {
    try {
        // 動作確認済み: APPEND方式
        $range = 'A:A';
        $values = [
            ['テスト追加書き込み - ' . date('Y-m-d H:i:s')]
        ];
        
        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$sheet_id}/values/{$range}:append?valueInputOption=RAW";
        
        $postData = json_encode([
            'range' => $range,
            'majorDimension' => 'ROWS',
            'values' => $values
        ]);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $access_token,
            'Content-Type: application/json'
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code !== 200) {
            throw new Exception('Sheets Append API Error: HTTP ' . $http_code . ' - ' . $response);
        }
        
        $data = json_decode($response, true);
        
        return [
            'success' => true,
            'message' => 'Google Sheetsデータ追加成功（APPENDメソッド）',
            'sheet_id' => $sheet_id,
            'range' => $range,
            'written_data' => $values,
            'response' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Google Sheets append failed: ' . $e->getMessage()
        ];
    }
}

?>
