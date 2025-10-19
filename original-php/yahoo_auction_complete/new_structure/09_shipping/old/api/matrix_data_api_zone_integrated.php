<?php
/**
 * ゾーン体系統合対応 マトリックスAPI
 * 各配送会社の独立したゾーン体系に完全対応
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

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

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $input['action'] ?? $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get_country_zones':
            handleGetCountryZones($input);
            break;
            
        case 'get_carrier_zones':
            handleGetCarrierZones($input);
            break;
            
        case 'get_zone_comparison':
            handleGetZoneComparison($input);
            break;
            
        case 'test_zone_system':
            handleTestZoneSystem();
            break;
            
        default:
            sendResponse(['error' => '不明なアクション: ' . $action], false);
    }
    
} catch (Exception $e) {
    error_log('Zone API Exception: ' . $e->getMessage());
    sendResponse(['error' => 'システムエラー'], false);
}

/**
 * 国別全社ゾーン取得
 */
function handleGetCountryZones($input) {
    $countryCode = $input['country_code'] ?? '';
    
    if (empty($countryCode)) {
        sendResponse(['error' => '国コードが必要です'], false);
        return;
    }
    
    $pdo = getZoneDatabase();
    if (!$pdo) {
        sendResponse(['error' => 'データベース接続エラー'], false);
        return;
    }
    
    $sql = "SELECT * FROM get_country_all_zones(?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$countryCode]);
    $zones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    sendResponse([
        'country_code' => $countryCode,
        'zones' => $zones,
        'zone_count' => count($zones)
    ], true);
}

/**
 * 配送会社別ゾーン取得
 */
function handleGetCarrierZones($input) {
    $carrierCode = $input['carrier_code'] ?? '';
    
    if (empty($carrierCode)) {
        sendResponse(['error' => '配送会社コードが必要です'], false);
        return;
    }
    
    $pdo = getZoneDatabase();
    if (!$pdo) {
        sendResponse(['error' => 'データベース接続エラー'], false);
        return;
    }
    
    $sql = "SELECT * FROM get_carrier_zone_summary(?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$carrierCode]);
    $zones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    sendResponse([
        'carrier_code' => $carrierCode,
        'zones' => $zones,
        'zone_count' => count($zones)
    ], true);
}

/**
 * ゾーン比較データ取得
 */
function handleGetZoneComparison($input) {
    $pdo = getZoneDatabase();
    if (!$pdo) {
        sendResponse(['error' => 'データベース接続エラー'], false);
        return;
    }
    
    // 主要国の各社ゾーン比較
    $countries = ['US', 'GB', 'DE', 'SG', 'CN', 'AU'];
    $comparison = [];
    
    foreach ($countries as $countryCode) {
        $sql = "SELECT * FROM get_country_all_zones(?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$countryCode]);
        $zones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $comparison[$countryCode] = [
            'zones' => $zones,
            'supported_carriers' => count($zones)
        ];
    }
    
    sendResponse([
        'comparison' => $comparison,
        'total_countries' => count($countries)
    ], true);
}

/**
 * ゾーンシステムテスト
 */
function handleTestZoneSystem() {
    $pdo = getZoneDatabase();
    if (!$pdo) {
        sendResponse(['error' => 'データベース接続エラー'], false);
        return;
    }
    
    $tests = [];
    
    // テスト1: アメリカのゾーン確認
    $sql = "SELECT * FROM get_country_all_zones('US')";
    $stmt = $pdo->query($sql);
    $usZones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $tests['us_zones'] = [
        'count' => count($usZones),
        'carriers' => array_column($usZones, 'carrier_name')
    ];
    
    // テスト2: eLogi ゾーン確認
    $sql = "SELECT * FROM get_carrier_zone_summary('ELOGI')";
    $stmt = $pdo->query($sql);
    $elogiZones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $tests['elogi_zones'] = [
        'count' => count($elogiZones),
        'zones' => array_column($elogiZones, 'zone_display_name')
    ];
    
    // テスト3: 統計情報
    $sql = "SELECT COUNT(*) as total_zones FROM carrier_zone_definitions";
    $stmt = $pdo->query($sql);
    $totalZones = $stmt->fetch(PDO::FETCH_COLUMN);
    
    $sql = "SELECT COUNT(*) as total_mappings FROM carrier_country_zones";
    $stmt = $pdo->query($sql);
    $totalMappings = $stmt->fetch(PDO::FETCH_COLUMN);
    
    $tests['statistics'] = [
        'total_zone_definitions' => $totalZones,
        'total_country_mappings' => $totalMappings
    ];
    
    sendResponse([
        'test_results' => $tests,
        'system_status' => 'operational'
    ], true);
}

function sendResponse($data, $success = true) {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s'),
        'api' => 'zone_integrated_api'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
?>
