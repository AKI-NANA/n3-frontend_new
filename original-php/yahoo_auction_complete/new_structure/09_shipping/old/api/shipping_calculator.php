<?php
/**
 * 送料計算API - 実際の計算エンジン
 * エンドポイント: api/shipping_calculator.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーハンドリング
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    // データベース接続
    function getDatabaseConnection() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            return $pdo;
        } catch (PDOException $e) {
            throw new Exception('データベース接続失敗: ' . $e->getMessage());
        }
    }
    
    // リクエスト処理
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    $pdo = getDatabaseConnection();
    
    switch ($action) {
        case 'calculate_shipping':
            // メイン送料計算
            $data = $input['data'] ?? [];
            $result = calculateShippingRates($pdo, $data);
            sendResponse($result, true, '送料計算完了');
            break;
            
        case 'search_country':
            // 国検索
            $countryName = $input['country_name'] ?? '';
            $result = searchCountryByName($pdo, $countryName);
            sendResponse($result, true, '国検索完了');
            break;
            
        case 'get_zone_countries':
            // ゾーン別国一覧
            $zoneCode = $input['zone_code'] ?? '';
            $result = getZoneCountries($pdo, $zoneCode);
            sendResponse($result, true, 'ゾーン国一覧取得完了');
            break;
            
        case 'get_all_zones':
            // 全ゾーン情報
            $result = getAllZoneInformation($pdo);
            sendResponse($result, true, '全ゾーン情報取得完了');
            break;
            
        default:
            throw new Exception('不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    sendResponse(null, false, $e->getMessage());
    error_log('送料計算API エラー: ' . $e->getMessage());
}

/**
 * メイン送料計算関数
 */
function calculateShippingRates($pdo, $data) {
    // 入力データ検証
    if (empty($data['destination']) || empty($data['weight'])) {
        throw new Exception('配送先と重量は必須です');
    }
    
    $destination = $data['destination'];
    $weight = floatval($data['weight']);
    $dimensions = [
        'length' => floatval($data['length'] ?? 0),
        'width' => floatval($data['width'] ?? 0),
        'height' => floatval($data['height'] ?? 0)
    ];
    $value = floatval($data['value'] ?? 0);
    $options = $data['options'] ?? [];
    
    // 国情報取得
    $countryInfo = getCountryInfo($pdo, $destination);
    if (!$countryInfo) {
        throw new Exception('指定された国の配送情報が見つかりません');
    }
    
    $results = [];
    
    // 各配送会社の料金を計算
    $companies = ['ELOGI', 'CPASS', 'JPPOST'];
    
    foreach ($companies as $companyCode) {
        $companyResults = calculateCompanyRates($pdo, $companyCode, $countryInfo, $weight, $dimensions, $value, $options);
        $results = array_merge($results, $companyResults);
    }
    
    // 結果をソート（料金順）
    usort($results, function($a, $b) {
        return $a['total_price'] <=> $b['total_price'];
    });
    
    return $results;
}

/**
 * 配送会社別料金計算
 */
function calculateCompanyRates($pdo, $companyCode, $countryInfo, $weight, $dimensions, $value, $options) {
    $results = [];
    
    // 会社の対応確認
    $zoneField = strtolower($companyCode) . '_zone';
    $supportField = strtolower($companyCode) . '_supported';
    
    if (!$countryInfo[$supportField] || $countryInfo[$zoneField] === '対応外') {
        return $results; // 対応外の場合は空配列を返す
    }
    
    $zone = $countryInfo[$zoneField];
    
    // 利用可能サービス取得
    $sql = "
        SELECT ss.*, ssr.price_jpy, ssr.weight_from_g, ssr.weight_to_g
        FROM shipping_services ss
        LEFT JOIN shipping_service_rates ssr ON (
            ss.company_code = ssr.company_code AND 
            ss.carrier_code = ssr.carrier_code AND 
            ss.service_code = ssr.service_code AND
            ssr.country_code = ? AND
            ssr.zone_code = ? AND
            ssr.weight_from_g <= ? AND
            ssr.weight_to_g >= ?
        )
        WHERE ss.company_code = ?
          AND ss.is_active = TRUE
          AND ? = ANY(ss.supported_zones)
        ORDER BY ss.carrier_code, ss.service_code
    ";
    
    $weightGrams = $weight * 1000;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $countryInfo['country_code'],
        $zone,
        $weightGrams,
        $weightGrams,
        $companyCode,
        $zone
    ]);
    
    $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($services as $service) {
        // 料金がデータベースにない場合は推定計算
        $basePrice = $service['price_jpy'] ?: estimatePrice($companyCode, $service, $weight, $zone);
        
        if ($basePrice > 0) {
            // 追加料金計算
            $additionalCharges = calculateAdditionalCharges($basePrice, $weight, $dimensions, $value, $options, $service);
            $totalPrice = $basePrice + $additionalCharges['total'];
            
            $results[] = [
                'id' => $service['service_code'] . '_' . $countryInfo['country_code'],
                'company_code' => $companyCode,
                'company_name' => getCompanyDisplayName($companyCode),
                'carrier_name' => $service['carrier_code'],
                'service_code' => $service['service_code'],
                'service_name' => $service['service_name_ja'],
                'service_type' => $service['service_type'],
                'base_price' => $basePrice,
                'additional_charges' => $additionalCharges,
                'total_price' => $totalPrice,
                'delivery_days' => $service['delivery_speed'] * 2, // 概算日数
                'has_tracking' => $service['has_tracking'],
                'has_insurance' => $service['has_insurance'],
                'max_weight_kg' => $service['max_weight_kg'],
                'zone' => $zone,
                'features' => generateServiceFeatures($service, $options)
            ];
        }
    }
    
    return $results;
}

/**
 * 料金推定計算（データベースに料金がない場合）
 */
function estimatePrice($companyCode, $service, $weight, $zone) {
    // 基本料金テーブル（簡略版）
    $basePrices = [
        'ELOGI' => [
            'Zone1' => 3500,
            'Zone2' => 4500,
            'Zone3' => 5500
        ],
        'CPASS' => [
            'USA対応' => 1800,
            'UK対応' => 2000,
            'DE対応' => 2200,
            'AU対応' => 2400
        ],
        'JPPOST' => [
            '第1地帯' => 1200,
            '第2地帯' => 1500,
            '第3地帯' => 2000,
            '第4地帯' => 2200,
            '第5地帯' => 2500
        ]
    ];
    
    $basePrice = $basePrices[$companyCode][$zone] ?? 2000;
    
    // サービスタイプによる調整
    switch ($service['service_type']) {
        case 'EXPRESS':
            $basePrice *= 1.4;
            break;
        case 'STANDARD':
            $basePrice *= 1.1;
            break;
        case 'ECONOMY':
            $basePrice *= 0.8;
            break;
    }
    
    // 重量による追加
    if ($weight > 1.0) {
        $basePrice += ($weight - 1.0) * 800;
    }
    
    return round($basePrice);
}

/**
 * 追加料金計算
 */
function calculateAdditionalCharges($basePrice, $weight, $dimensions, $value, $options, $service) {
    $charges = [
        'fuel_surcharge' => 0,
        'insurance' => 0,
        'signature' => 0,
        'saturday' => 0,
        'oversized' => 0,
        'total' => 0
    ];
    
    // 燃料サーチャージ（基本料金の10%）
    $charges['fuel_surcharge'] = round($basePrice * 0.10);
    
    // 保険料
    if ($options['insurance'] ?? false) {
        $charges['insurance'] = max(500, round($value * 0.01));
    }
    
    // 署名確認
    if ($options['signature'] ?? false) {
        $charges['signature'] = 800;
    }
    
    // 土曜配達
    if ($options['saturday'] ?? false) {
        $charges['saturday'] = 1500;
    }
    
    // 大型荷物サーチャージ
    $volume = $dimensions['length'] * $dimensions['width'] * $dimensions['height'];
    if ($volume > 50000) { // 50L以上
        $charges['oversized'] = 2000;
    }
    
    $charges['total'] = array_sum($charges);
    
    return $charges;
}

/**
 * 国情報取得
 */
function getCountryInfo($pdo, $countryCode) {
    $sql = "SELECT * FROM country_zones_extended WHERE country_code = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$countryCode]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * 国名検索
 */
function searchCountryByName($pdo, $countryName) {
    $sql = "
        SELECT country_code, country_name_ja as name, country_flag as flag 
        FROM country_zones_extended 
        WHERE country_name_ja ILIKE ? OR country_name_en ILIKE ?
        ORDER BY 
            CASE WHEN country_name_ja ILIKE ? THEN 1 ELSE 2 END,
            country_name_ja
        LIMIT 10
    ";
    
    $searchTerm = '%' . $countryName . '%';
    $exactTerm = $countryName . '%';
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$searchTerm, $searchTerm, $exactTerm]);
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * ゾーン別国一覧取得
 */
function getZoneCountries($pdo, $zoneCode) {
    $sql = "
        SELECT country_code, country_name_ja, country_flag
        FROM country_zones_extended 
        WHERE elogi_zone = ? OR cpass_zone = ? OR jppost_zone = ?
        ORDER BY country_name_ja
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$zoneCode, $zoneCode, $zoneCode]);
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * 全ゾーン情報取得
 */
function getAllZoneInformation($pdo) {
    $sql = "
        SELECT 
            'ELOGI' as company,
            elogi_zone as zone,
            COUNT(*) as country_count,
            array_agg(country_name_ja ORDER BY country_name_ja) as countries
        FROM country_zones_extended 
        WHERE elogi_supported = TRUE AND elogi_zone IS NOT NULL
        GROUP BY elogi_zone
        
        UNION ALL
        
        SELECT 
            'CPASS' as company,
            cpass_zone as zone,
            COUNT(*) as country_count,
            array_agg(country_name_ja ORDER BY country_name_ja) as countries
        FROM country_zones_extended 
        WHERE cpass_supported = TRUE AND cpass_zone IS NOT NULL AND cpass_zone != '対応外'
        GROUP BY cpass_zone
        
        UNION ALL
        
        SELECT 
            'JPPOST' as company,
            jppost_zone as zone,
            COUNT(*) as country_count,
            array_agg(country_name_ja ORDER BY country_name_ja) as countries
        FROM country_zones_extended 
        WHERE jppost_supported = TRUE AND jppost_zone IS NOT NULL
        GROUP BY jppost_zone
        
        ORDER BY company, zone
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * ユーティリティ関数
 */
function getCompanyDisplayName($companyCode) {
    $names = [
        'ELOGI' => 'eLogi',
        'CPASS' => 'CPass',
        'JPPOST' => '日本郵便'
    ];
    return $names[$companyCode] ?? $companyCode;
}

function generateServiceFeatures($service, $options) {
    $features = [];
    
    if ($service['service_type'] === 'EXPRESS') {
        $features[] = '特急';
    }
    
    if ($service['has_tracking']) {
        $features[] = '追跡';
    }
    
    if ($service['has_insurance']) {
        $features[] = '保険';
    }
    
    if ($options['signature'] ?? false) {
        $features[] = '署名確認';
    }
    
    return implode(', ', $features) ?: '-';
}

function sendResponse($data, $success = true, $message = '') {
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

?>