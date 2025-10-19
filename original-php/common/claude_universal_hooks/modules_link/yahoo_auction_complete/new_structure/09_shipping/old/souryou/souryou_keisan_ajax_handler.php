<?php
/**
 * 送料計算システム - Ajax処理ハンドラー
 * modules/souryou_keisan/php/souryou_keisan_ajax_handler.php
 * 
 * ✅ NAGANO-3統合対応
 * ✅ 統一レスポンス形式
 * ✅ エラーハンドリング完備
 */

if (!defined('SECURE_ACCESS')) {
    http_response_code(403);
    exit('Direct access forbidden');
}

// 必須：Ajax専用ヘッダー
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

// 必須：セキュリティ読み込み
require_once __DIR__ . '/../../../common/security/vps_security.php';
require_once __DIR__ . '/../../../common/error/vps_error_handler.php';

try {
    // セキュリティチェック
    VPSSecurityManager::protectCSRF();
    VPSSecurityManager::checkPermission('souryou_keisan_access');
    
    // アクション取得
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    
    if (empty($action)) {
        throw new InvalidArgumentException('アクションが指定されていません');
    }
    
    // アクション処理
    $response = handleSouryouKeisanAction($action);
    
    // 統一レスポンス形式確保
    if (!isset($response['status'])) {
        $response['status'] = 'success';
    }
    if (!isset($response['timestamp'])) {
        $response['timestamp'] = date('Y-m-d\TH:i:s\Z');
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // エラーログ記録
    error_log("送料計算Ajax Error: " . $e->getMessage());
    
    // 統一エラーレスポンス
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'error_code' => get_class($e),
        'timestamp' => date('Y-m-d\TH:i:s\Z'),
        'debug_info' => VPSSecurityManager::detectEnvironment() === 'development' ? [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ] : null
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * 送料計算アクション処理メイン関数
 */
function handleSouryouKeisanAction($action) {
    switch ($action) {
        case 'calculate_shipping':
            return calculateShipping();
            
        case 'get_carrier_rates':
            return getCarrierRates();
            
        case 'upload_csv':
            return uploadCarrierCSV();
            
        case 'health_check':
            return healthCheck();
            
        case 'get_zones':
            return getDestinationZones();
            
        default:
            throw new InvalidArgumentException("未対応のアクション: {$action}");
    }
}

/**
 * 送料計算メイン処理
 */
function calculateShipping() {
    try {
        // 入力値取得・検証
        $weight = floatval($_POST['weight'] ?? 0);
        $length = floatval($_POST['length'] ?? 0);
        $width = floatval($_POST['width'] ?? 0);
        $height = floatval($_POST['height'] ?? 0);
        $destination_zone = $_POST['destination_zone'] ?? 'zone5a';
        $marketplace = $_POST['marketplace'] ?? 'shopify';
        
        // バリデーション
        if ($weight <= 0) {
            throw new InvalidArgumentException('重量は0より大きい値を入力してください');
        }
        if ($length <= 0 || $width <= 0 || $height <= 0) {
            throw new InvalidArgumentException('寸法は0より大きい値を入力してください');
        }
        
        // 重量補正計算
        $corrected_weight = calculateCorrectedWeight($weight, $length, $width, $height);
        
        // 配送会社別料金計算
        $shipping_options = calculateAllCarriers($corrected_weight, $destination_zone, $length, $width, $height);
        
        // 料金順ソート
        usort($shipping_options, function($a, $b) {
            return $a['total_cost'] <=> $b['total_cost'];
        });
        
        // 推奨配送方法選定
        $recommended = !empty($shipping_options) ? $shipping_options[0] : null;
        
        return [
            'status' => 'success',
            'message' => '送料計算完了',
            'data' => [
                'input' => [
                    'weight' => $weight,
                    'dimensions' => ['length' => $length, 'width' => $width, 'height' => $height],
                    'destination_zone' => $destination_zone,
                    'marketplace' => $marketplace
                ],
                'corrected_weight' => $corrected_weight,
                'shipping_options' => $shipping_options,
                'recommended' => $recommended,
                'total_options' => count($shipping_options),
                'calculation_time' => date('Y-m-d H:i:s')
            ]
        ];
        
    } catch (Exception $e) {
        throw new RuntimeException("送料計算エラー: " . $e->getMessage());
    }
}

/**
 * 重量補正計算
 */
function calculateCorrectedWeight($weight, $length, $width, $height) {
    // 基本梱包材重量
    $packaging_weight = 150; // g
    $additional_weight = 50;  // g
    
    // 容積重量計算 (cm³ ÷ 5000)
    $volumetric_weight = ($length * $width * $height) / 5000;
    
    // 課金対象重量（実重量 + 梱包材 vs 容積重量の大きい方）
    $packaged_weight = $weight + $packaging_weight + $additional_weight;
    $billing_weight = max($packaged_weight, $volumetric_weight);
    
    return round($billing_weight, 2);
}

/**
 * 全配送会社の料金計算
 */
function calculateAllCarriers($weight, $zone, $length, $width, $height) {
    $carriers = [
        'fedex_intl_economy' => ['name' => 'FedEx International Economy', 'base_rate' => 24.50, 'fuel_rate' => 0.15, 'days' => '3-5'],
        'fedex_intl_priority' => ['name' => 'FedEx International Priority', 'base_rate' => 42.80, 'fuel_rate' => 0.15, 'days' => '1-3'],
        'dhl_express' => ['name' => 'DHL Express Worldwide', 'base_rate' => 38.60, 'fuel_rate' => 0.12, 'days' => '1-3'],
        'jppost_ems' => ['name' => '日本郵便 EMS', 'base_rate' => 28.50, 'fuel_rate' => 0.00, 'days' => '3-6'],
        'jppost_small' => ['name' => '日本郵便 小型包装物', 'base_rate' => 12.80, 'fuel_rate' => 0.00, 'days' => '7-14'],
        'jppost_registered' => ['name' => '日本郵便 書留', 'base_rate' => 24.70, 'fuel_rate' => 0.00, 'days' => '5-10']
    ];
    
    $results = [];
    
    foreach ($carriers as $code => $carrier) {
        // 重量による調整
        $weight_factor = calculateWeightFactor($weight);
        $zone_factor = calculateZoneFactor($zone);
        $size_factor = calculateSizeFactor($length, $width, $height);
        
        // 基本料金計算
        $base_cost = $carrier['base_rate'] * $weight_factor * $zone_factor * $size_factor;
        
        // 燃油サーチャージ
        $fuel_surcharge = $base_cost * $carrier['fuel_rate'];
        
        // 合計料金
        $total_cost = $base_cost + $fuel_surcharge;
        
        // サイズ制限チェック
        $size_ok = checkSizeLimits($code, $length, $width, $height);
        
        if ($size_ok) {
            $results[] = [
                'carrier_code' => $code,
                'carrier_name' => $carrier['name'],
                'base_cost' => round($base_cost, 2),
                'fuel_surcharge' => round($fuel_surcharge, 2),
                'total_cost' => round($total_cost, 2),
                'delivery_days' => $carrier['days'],
                'weight_factor' => $weight_factor,
                'zone_factor' => $zone_factor,
                'size_factor' => $size_factor,
                'tracking' => in_array($code, ['fedex_intl_economy', 'fedex_intl_priority', 'dhl_express', 'jppost_ems', 'jppost_registered']),
                'insurance' => in_array($code, ['fedex_intl_economy', 'fedex_intl_priority', 'dhl_express', 'jppost_ems', 'jppost_registered'])
            ];
        }
    }
    
    return $results;
}

/**
 * 重量係数計算
 */
function calculateWeightFactor($weight) {
    if ($weight <= 500) return 1.0;
    if ($weight <= 1000) return 1.2;
    if ($weight <= 2000) return 1.5;
    return 1.8;
}

/**
 * Zone係数計算
 */
function calculateZoneFactor($zone) {
    $factors = [
        'zone1' => 1.0,   // アメリカ
        'zone2' => 1.2,   // カナダ
        'zone3' => 1.8,   // 中南米
        'zone4' => 1.6,   // ヨーロッパ
        'zone5a' => 1.4,  // 日本・韓国
        'zone5b' => 1.3,  // 中国・台湾
        'zone6' => 1.7,   // オセアニア
        'zone7' => 2.0    // 中東・アフリカ
    ];
    
    return $factors[$zone] ?? 1.4;
}

/**
 * サイズ係数計算
 */
function calculateSizeFactor($length, $width, $height) {
    $max_dimension = max($length, $width, $height);
    
    if ($max_dimension <= 60) return 1.0;
    if ($max_dimension <= 100) return 1.1;
    if ($max_dimension <= 150) return 1.2;
    return 1.3;
}

/**
 * サイズ制限チェック
 */
function checkSizeLimits($carrier_code, $length, $width, $height) {
    $limits = [
        'fedex_intl_economy' => ['max_length' => 60, 'max_width' => 60, 'max_height' => 60],
        'fedex_intl_priority' => ['max_length' => 60, 'max_width' => 60, 'max_height' => 60],
        'dhl_express' => ['max_length' => 61, 'max_width' => 46, 'max_height' => 46],
        'jppost_ems' => ['max_length' => 150, 'max_width' => 150, 'max_height' => 150],
        'jppost_small' => ['max_length' => 60, 'max_width' => 60, 'max_height' => 60],
        'jppost_registered' => ['max_length' => 90, 'max_width' => 90, 'max_height' => 90]
    ];
    
    if (!isset($limits[$carrier_code])) return true;
    
    $limit = $limits[$carrier_code];
    return ($length <= $limit['max_length'] && 
            $width <= $limit['max_width'] && 
            $height <= $limit['max_height']);
}

/**
 * 配送会社料金データ取得
 */
function getCarrierRates() {
    return [
        'status' => 'success',
        'message' => '配送会社データ取得完了',
        'data' => [
            'carriers' => [
                'fedex_intl_economy' => ['name' => 'FedEx International Economy', 'status' => 'active'],
                'fedex_intl_priority' => ['name' => 'FedEx International Priority', 'status' => 'active'],
                'dhl_express' => ['name' => 'DHL Express Worldwide', 'status' => 'active'],
                'jppost_ems' => ['name' => '日本郵便 EMS', 'status' => 'active'],
                'jppost_small' => ['name' => '日本郵便 小型包装物', 'status' => 'active'],
                'jppost_registered' => ['name' => '日本郵便 書留', 'status' => 'active']
            ],
            'total_count' => 6,
            'active_count' => 6
        ]
    ];
}

/**
 * CSV アップロード処理
 */
function uploadCarrierCSV() {
    // 今後実装予定
    return [
        'status' => 'success',
        'message' => 'CSV アップロード機能は今後実装予定です',
        'data' => ['upload_status' => 'not_implemented']
    ];
}

/**
 * ヘルスチェック
 */
function healthCheck() {
    return [
        'status' => 'success',
        'message' => '送料計算システム正常稼働中',
        'data' => [
            'system_status' => 'healthy',
            'version' => '1.0.0',
            'environment' => VPSSecurityManager::detectEnvironment(),
            'timestamp' => date('Y-m-d H:i:s'),
            'supported_carriers' => 6,
            'supported_zones' => 7
        ]
    ];
}

/**
 * 配送先Zone一覧取得
 */
function getDestinationZones() {
    return [
        'status' => 'success',
        'message' => '配送先Zone一覧取得完了',
        'data' => [
            'zones' => [
                'zone1' => 'アメリカ本土48州',
                'zone2' => 'カナダ',
                'zone3' => '中南米',
                'zone4' => 'ヨーロッパ',
                'zone5a' => '日本・韓国・シンガポール',
                'zone5b' => '中国・台湾・香港',
                'zone6' => 'オセアニア',
                'zone7' => '中東・アフリカ'
            ]
        ]
    ];
}
?>