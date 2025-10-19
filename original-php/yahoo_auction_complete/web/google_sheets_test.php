<?php
// Google Sheets実データ取得・表示ツール

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
        $range = 'Sheet1!A1:Z10'; // 最初の10行、A-Z列を取得
        
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
            'raw_data' => $data,
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
        $range = 'Sheet1!A1:D1'; // A1からD1に書き込み
        
        // 書き込むデータ
        $values = [
            ['商品名', '価格', '状態', '更新日時'],
            ['テスト商品1', '¥1,000', '新品', date('Y-m-d H:i:s')],
            ['テスト商品2', '¥2,500', '中古', date('Y-m-d H:i:s')]
        ];
        
        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$sheet_id}/values/{$range}?valueInputOption=RAW";
        
        $postData = json_encode([
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
            throw new Exception('Sheets Write API Error: HTTP ' . $http_code . ' - ' . $response);
        }
        
        $data = json_decode($response, true);
        
        return [
            'success' => true,
            'message' => 'Google Sheetsデータ書き込み成功',
            'sheet_id' => $sheet_id,
            'range' => $range,
            'written_rows' => count($values),
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

// HTMLコンテンツ（POSTリクエストでない場合のみ表示）
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>Google Sheets実データ取得テスト</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background: #f8f9fa; 
        }
        .container { 
            max-width: 1000px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        h1 { 
            color: #333; 
            text-align: center; 
            margin-bottom: 30px; 
        }
        .btn { 
            padding: 12px 24px; 
            margin: 10px; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer; 
            font-size: 14px; 
            font-weight: bold; 
        }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn:hover { opacity: 0.8; }
        .result { 
            margin-top: 20px; 
            padding: 15px; 
            border-radius: 5px; 
            font-family: monospace; 
            white-space: pre-wrap; 
            max-height: 400px; 
            overflow-y: auto; 
        }
        .result.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .result.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .loading { 
            display: none; 
            color: #007bff; 
            font-weight: bold; 
        }
        .loading.show { display: inline-block; }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px; 
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
        }
        th { 
            background: #f8f9fa; 
            font-weight: bold; 
        }
        .data-table { 
            max-height: 300px; 
            overflow-y: auto; 
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Google Sheets実データ取得テスト</h1>
        
        <div style="text-align: center; margin-bottom: 30px;">
            <button class="btn btn-primary" onclick="getSheetsData()">
                📥 Sheetsデータ取得
            </button>
            <button class="btn btn-success" onclick="writeToSheets()">
                📤 Sheetsにデータ書き込み
            </button>
        </div>
        
        <div class="loading" id="loading">🔄 処理中...</div>
        <div id="result" class="result"></div>
        <div id="data-display"></div>
    </div>

    <script>
        function showLoading() {
            document.getElementById('loading').classList.add('show');
        }
        
        function hideLoading() {
            document.getElementById('loading').classList.remove('show');
        }
        
        async function makeRequest(action) {
            try {
                const formData = new FormData();
                formData.append('action', action);
                
                const response = await fetch('google_sheets_test.php', {
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
            const className = result.success ? 'success' : 'error';
            
            resultElement.className = `result ${className}`;
            resultElement.innerHTML = JSON.stringify(result, null, 2);
        }
        
        function displayDataTable(values) {
            const dataDisplay = document.getElementById('data-display');
            
            if (!values || values.length === 0) {
                dataDisplay.innerHTML = '<p>データがありません</p>';
                return;
            }
            
            let html = '<h3>📋 取得したデータ</h3><div class="data-table"><table>';
            
            // ヘッダー行
            if (values[0]) {
                html += '<thead><tr>';
                values[0].forEach((cell, index) => {
                    html += `<th>列${index + 1}: ${cell || '空'}</th>`;
                });
                html += '</tr></thead>';
            }
            
            // データ行
            html += '<tbody>';
            values.slice(1, 11).forEach((row, rowIndex) => { // 最大10行表示
                html += `<tr>`;
                row.forEach((cell, cellIndex) => {
                    html += `<td>${cell || '空'}</td>`;
                });
                html += `</tr>`;
            });
            html += '</tbody></table></div>';
            
            if (values.length > 11) {
                html += `<p><small>※ ${values.length - 1}行中、最初の10行を表示</small></p>`;
            }
            
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
            console.log('🚀 Google Sheets実データテスト起動完了');
        };
    </script>
</body>
</html>
<?php
}
?>
