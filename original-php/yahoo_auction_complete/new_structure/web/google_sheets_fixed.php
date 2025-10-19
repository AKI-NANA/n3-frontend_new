<?php
// Google Sheets実データ取得・表示ツール - レンジ修正版

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
        $range = 'A1:F10'; // シンプルなレンジ指定
        
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
        
        // 単一セルに書き込み（まずはシンプルに）
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
            // 書き込みに失敗した場合、追加で詳細を取得
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
        // APPENDメソッドを使用（より安全）
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

// HTMLコンテンツ（POSTリクエストでない場合のみ表示）
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>Google Sheets実データ取得テスト - 修正版</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 20px; background: #f8f9fa;">
    <div style="max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="color: #333; text-align: center; margin-bottom: 30px;">📊 Google Sheets実データ取得テスト（修正版）</h1>
        
        <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #007bff;">
            <strong>✅ API接続確認済み</strong><br>
            Google Sheets APIとの接続が確認できました。レンジ指定を修正して再テストします。
        </div>
        
        <div style="text-align: center; margin-bottom: 30px;">
            <button onclick="getSheetsData()" style="padding: 12px 24px; margin: 10px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold; background: #007bff; color: white;">
                📥 Sheetsデータ取得
            </button>
            <button onclick="writeToSheets()" style="padding: 12px 24px; margin: 10px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold; background: #28a745; color: white;">
                📤 Sheetsにデータ書き込み
            </button>
        </div>
        
        <div id="loading" style="display: none; color: #007bff; font-weight: bold; text-align: center;">🔄 処理中...</div>
        
        <div id="result" style="margin-top: 20px; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; max-height: 400px; overflow-y: auto; border: 1px solid #ddd;"></div>
        
        <div id="data-display" style="margin-top: 20px;"></div>
    </div>

    <script>
        function showLoading() {
            document.getElementById('loading').style.display = 'block';
        }
        
        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
        }
        
        async function makeRequest(action) {
            try {
                const formData = new FormData();
                formData.append('action', action);
                
                const response = await fetch('google_sheets_fixed.php', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const text = await response.text();
                
                try {
                    return JSON.parse(text);
                } catch (e) {
                    return {
                        success: false,
                        error: 'レスポンスの解析に失敗しました',
                        raw_response: text.substring(0, 500)
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }
        
        function displayResult(result) {
            const resultElement = document.getElementById('result');
            
            if (result.success) {
                resultElement.style.background = '#d4edda';
                resultElement.style.color = '#155724';
                resultElement.style.borderColor = '#c3e6cb';
            } else {
                resultElement.style.background = '#f8d7da';
                resultElement.style.color = '#721c24';
                resultElement.style.borderColor = '#f5c6cb';
            }
            
            resultElement.innerHTML = JSON.stringify(result, null, 2);
        }
        
        function displayDataTable(values) {
            const dataDisplay = document.getElementById('data-display');
            
            if (!values || values.length === 0) {
                dataDisplay.innerHTML = '<p style="color: #666;">データがありません</p>';
                return;
            }
            
            let html = '<h3 style="color: #333; margin-bottom: 15px;">📋 取得したデータ</h3>';
            html += '<div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px;">';
            html += '<table style="width: 100%; border-collapse: collapse;">';
            
            // データ行
            html += '<tbody>';
            values.forEach((row, rowIndex) => {
                html += `<tr>`;
                row.forEach((cell, cellIndex) => {
                    const isHeader = rowIndex === 0;
                    const style = isHeader 
                        ? "border: 1px solid #ddd; padding: 8px; text-align: left; background: #f8f9fa; font-weight: bold;"
                        : "border: 1px solid #ddd; padding: 8px; text-align: left;";
                    html += `<${isHeader ? 'th' : 'td'} style="${style}">${cell || '空'}</${isHeader ? 'th' : 'td'}>`;
                });
                html += `</tr>`;
            });
            html += '</tbody></table></div>';
            
            html += `<p style="margin-top: 10px; color: #666; font-size: 14px;"><small>※ ${values.length}行のデータを表示</small></p>`;
            
            dataDisplay.innerHTML = html;
        }
        
        async function getSheetsData() {
            showLoading();
            const result = await makeRequest('get_sheets_data');
            hideLoading();
            
            displayResult(result);
            
            if (result.success && result.values) {
                displayDataTable(result.values);
            }
        }
        
        async function writeToSheets() {
            showLoading();
            const result = await makeRequest('write_to_sheets');
            hideLoading();
            
            displayResult(result);
            
            if (result.success) {
                // 書き込み後、データを再取得して表示
                setTimeout(() => {
                    getSheetsData();
                }, 1000);
            }
        }
        
        window.onload = function() {
            console.log('🚀 Google Sheets修正版テスト起動完了');
        };
    </script>
</body>
</html>
<?php
}
?>
