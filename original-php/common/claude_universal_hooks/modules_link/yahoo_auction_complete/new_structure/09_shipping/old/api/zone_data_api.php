<?php
/**
 * ゾーンデータAPI - CPass基準
 * 目視確認しやすいゾーン情報提供
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// データベース接続
function getZoneDatabase() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        return $pdo;
    } catch (PDOException $e) {
        error_log('Zone Database connection error: ' . $e->getMessage());
        return null;
    }
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'get_zones':
            handleGetZones();
            break;
            
        case 'get_zone_countries':
            handleGetZoneCountries();
            break;
            
        case 'search_country':
            handleSearchCountry();
            break;
            
        default:
            sendZoneResponse(null, false, '不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    error_log('Zone API Error: ' . $e->getMessage());
    sendZoneResponse(null, false, 'システムエラーが発生しました');
}

/**
 * ゾーン一覧取得
 */
function handleGetZones() {
    $pdo = getZoneDatabase();
    
    if (!$pdo) {
        // フォールバック: サンプルデータ
        $sampleZones = [
            [
                'zone_code' => 'zone1',
                'zone_name' => 'ゾーン1 - 北米',
                'zone_color' => '#10b981',
                'countries_ja' => 'アメリカ合衆国, カナダ',
                'country_count' => 2
            ],
            [
                'zone_code' => 'zone2',
                'zone_name' => 'ゾーン2 - ヨーロッパ',
                'zone_color' => '#3b82f6', 
                'countries_ja' => 'イギリス, ドイツ, フランス, イタリア, スペイン, オランダ',
                'country_count' => 6
            ],
            [
                'zone_code' => 'zone3',
                'zone_name' => 'ゾーン3 - オセアニア',
                'zone_color' => '#f59e0b',
                'countries_ja' => 'オーストラリア, ニュージーランド', 
                'country_count' => 2
            ],
            [
                'zone_code' => 'zone4',
                'zone_name' => 'ゾーン4 - アジア',
                'zone_color' => '#ef4444',
                'countries_ja' => 'シンガポール, 香港, 台湾, 韓国, タイ',
                'country_count' => 5
            ],
            [
                'zone_code' => 'zone5',
                'zone_name' => 'ゾーン5 - その他',
                'zone_color' => '#8b5cf6',
                'countries_ja' => 'ブラジル, メキシコ, インド',
                'country_count' => 3
            ]
        ];
        
        sendZoneResponse([
            'zones' => $sampleZones,
            'countries' => [],
            'data_source' => 'sample'
        ], true, 'サンプルゾーンデータを表示中');
        return;
    }
    
    try {
        // ゾーン一覧取得
        $sql = "SELECT * FROM matrix_zone_options ORDER BY zone_display_order";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $zones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 国別マッピング取得
        $sql = "SELECT * FROM country_zone_mapping WHERE is_active = TRUE ORDER BY country_name_ja";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $countries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendZoneResponse([
            'zones' => $zones,
            'countries' => $countries,
            'data_source' => 'database'
        ], true, 'ゾーンデータ取得完了');
        
    } catch (PDOException $e) {
        error_log('Zone query error: ' . $e->getMessage());
        sendZoneResponse(null, false, 'ゾーンデータ取得エラー');
    }
}

/**
 * 特定ゾーンの国一覧取得
 */
function handleGetZoneCountries() {
    $zoneCode = $_GET['zone_code'] ?? '';
    
    if (empty($zoneCode)) {
        sendZoneResponse(null, false, 'ゾーンコードが必要です');
        return;
    }
    
    $pdo = getZoneDatabase();
    
    if (!$pdo) {
        sendZoneResponse(null, false, 'データベース接続エラー');
        return;
    }
    
    try {
        $sql = "SELECT * FROM country_zone_mapping 
                WHERE zone_code = ? AND is_active = TRUE 
                ORDER BY country_name_ja";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$zoneCode]);
        $countries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendZoneResponse([
            'zone_code' => $zoneCode,
            'countries' => $countries
        ], true, 'ゾーン別国情報取得完了');
        
    } catch (PDOException $e) {
        error_log('Zone countries query error: ' . $e->getMessage());
        sendZoneResponse(null, false, 'ゾーン別国情報取得エラー');
    }
}

/**
 * 国検索
 */
function handleSearchCountry() {
    $query = $_GET['query'] ?? '';
    
    if (empty($query)) {
        sendZoneResponse(null, false, '検索クエリが必要です');
        return;
    }
    
    $pdo = getZoneDatabase();
    
    if (!$pdo) {
        sendZoneResponse(null, false, 'データベース接続エラー');
        return;
    }
    
    try {
        $sql = "SELECT czm.*, sz.zone_name, sz.zone_color 
                FROM country_zone_mapping czm
                JOIN shipping_zones sz ON czm.zone_code = sz.zone_code
                WHERE (czm.country_name_ja ILIKE ? OR czm.country_name_en ILIKE ? OR czm.country_code ILIKE ?)
                AND czm.is_active = TRUE AND sz.is_active = TRUE
                ORDER BY czm.country_name_ja";
        
        $searchTerm = '%' . $query . '%';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$searchTerm, $searchTerm, $searchTerm]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendZoneResponse([
            'query' => $query,
            'results' => $results
        ], true, '国検索完了');
        
    } catch (PDOException $e) {
        error_log('Country search error: ' . $e->getMessage());
        sendZoneResponse(null, false, '国検索エラー');
    }
}

/**
 * JSON レスポンス送信
 */
function sendZoneResponse($data, $success = true, $message = '') {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'api' => 'zone_data_api'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
