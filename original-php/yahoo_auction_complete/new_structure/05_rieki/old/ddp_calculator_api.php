<?php
/**
 * DDP/DDU計算API エンドポイント
 * 既存の利益計算システムにDDP/DDU機能を統合
 */

// api/calculate_dual_pricing.php
require_once '../includes/EnhancedPriceCalculator.php';
require_once '../shared/core/Database.php';
require_once '../shared/core/ApiResponse.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $database = new Database();
    $pdo = $database->getConnection();
    $calculator = new EnhancedPriceCalculator($pdo);
    
    $action = $_GET['action'] ?? $_POST['action'] ?? 'calculate';
    
    switch ($action) {
        case 'calculate':
            $result = handleDualCalculation($calculator);
            break;
            
        case 'get_history':
            $result = getCalculationHistory($pdo);
            break;
            
        case 'save_strategy':
            $result = saveListingStrategy($pdo);
            break;
            
        case 'get_tax_settings':
            $result = getTaxSettings($calculator);
            break;
            
        case 'update_tax_settings':
            $result = updateTaxSettings($pdo);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
    ApiResponse::success($result);
    
} catch (Exception $e) {
    ApiResponse::error($e->getMessage());
}

/**
 * DDP/DDU両方の価格計算
 */
function handleDualCalculation($calculator) {
    $itemData = [
        'id' => $_POST['item_id'] ?? '',
        'price_jpy' => floatval($_POST['price_jpy'] ?? 0),
        'shipping_jpy' => floatval($_POST['shipping_jpy'] ?? 0),
        'category_id' => intval($_POST['category_id'] ?? 293),
        'origin_country' => $_POST['origin_country'] ?? 'JP',
        'weight_kg' => floatval($_POST['weight_kg'] ?? 0.5),
        'hs_code' => $_POST['hs_code'] ?? '',
        'target_countries' => $_POST['target_countries'] ?? ['US']
    ];
    
    if ($itemData['price_jpy'] <= 0) {
        throw new Exception('商品価格が正しく入力されていません。');
    }
    
    $result = $calculator->calculateBothPrices($itemData);
    
    if (!$result['success']) {
        throw new Exception($result['error']);
    }
    
    return [
        'calculation_data' => $result,
        'recommendations' => generateAdvancedRecommendations($result),
        'ebay_settings' => generateEbayListingSettings($result),
        'message' => 'DDP/DDU両価格計算完了'
    ];
}

/**
 * 計算履歴取得
 */
function getCalculationHistory($pdo) {
    $limit = intval($_GET['limit'] ?? 20);
    $offset = intval($_GET['offset'] ?? 0);
    
    $stmt = $pdo->prepare("
        SELECT 
            id, item_id, category_id,
            ddu_price_usd, ddp_price_usd, 
            price_difference_usd, price_difference_percent,
            ddu_profit_margin, ddp_profit_margin,
            competitiveness_score, coupon_recommended,
            created_at
        FROM enhanced_profit_calculations 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$limit, $offset]);
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 統計データも取得
    $statsStmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_calculations,
            AVG(price_difference_percent) as avg_price_difference,
            AVG(competitiveness_score) as avg_competitiveness,
            COUNT(CASE WHEN coupon_recommended = 1 THEN 1 END) as coupon_recommended_count
        FROM enhanced_profit_calculations
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $statsStmt->execute();
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    return [
        'history' => $history,
        'statistics' => $stats,
        'pagination' => [
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => count($history) === $limit
        ]
    ];
}

/**
 * 出品戦略保存
 */
function saveListingStrategy($pdo) {
    $calculationId = intval($_POST['calculation_id']);
    $strategies = $_POST['strategies']; // US_DDP, INTERNATIONAL_DDU
    
    $pdo->beginTransaction();
    
    try {
        foreach ($strategies as $strategy) {
            $stmt = $pdo->prepare("
                INSERT INTO listing_strategies (
                    calculation_id, market_type, listing_price_usd, 
                    shipping_price_usd, ebay_settings, status
                ) VALUES (?, ?, ?, ?, ?, 'PLANNED')
            ");
            
            $stmt->execute([
                $calculationId,
                $strategy['market_type'],
                $strategy['listing_price_usd'],
                $strategy['shipping_price_usd'],
                json_encode($strategy['ebay_settings'])
            ]);
        }
        
        $pdo->commit();
        return ['saved_strategies' => count($strategies)];
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
}

/**
 * 税制設定取得
 */
function getTaxSettings($calculator) {
    return [
        'countries' => $calculator->getTaxSettings(),
        'hs_codes' => $calculator->getHSCodeMappings(),
        'shipping_limits' => $calculator->getShippingLimits()
    ];
}

/**
 * 高度な推奨事項生成
 */
function generateAdvancedRecommendations($result) {
    $recommendations = [];
    $analysis = $result['price_analysis'];
    
    // 価格競争力分析
    if ($analysis['competitiveness_impact'] === 'EXCELLENT') {
        $recommendations[] = [
            'type' => 'pricing',
            'priority' => 'high',
            'title' => 'DDP戦略強力推奨',
            'message' => '価格差が小さく、DDP導入により購入率大幅向上が期待できます。',
            'action' => 'US市場でのDDP価格での出品を即座に開始してください。'
        ];
    }
    
    // クーポン戦略
    if ($analysis['coupon_strategy']['recommended']) {
        $recommendations[] = [
            'type' => 'coupon',
            'priority' => 'medium',
            'title' => '戦略的クーポン活用',
            'message' => $analysis['coupon_strategy']['reason'],
            'action' => "対象国：" . implode(', ', $analysis['coupon_strategy']['target_countries'])
        ];
    }
    
    // 市場拡大提案
    $recommendations[] = [
        'type' => 'expansion',
        'priority' => 'low',
        'title' => '市場拡大機会',
        'message' => 'DDP成功後、カナダ・オーストラリア市場への展開を検討。',
        'action' => 'これらの市場での税制調査とテスト出品を計画してください。'
    ];
    
    return $recommendations;
}

/**
 * eBay出品設定生成
 */
function generateEbayListingSettings($result) {
    $usListing = $result['listing_strategy']['us_listing'];
    $intlListing = $result['listing_strategy']['international_listing'];
    
    return [
        'us_ddp_listing' => [
            'site_id' => 0, // eBay US
            'category_id' => 293, // 動的に設定
            'title_template' => '[PRODUCT_TITLE] ' . $usListing['title_addition'],
            'price' => $usListing['product_price_usd'],
            'shipping_type' => 'Flat',
            'shipping_cost' => $usListing['shipping_usd'],
            'item_specifics' => [
                'Shipping' => 'Tax & Duty Included',
                'Origin' => 'Japan',
                'Condition' => 'New' // 動的に設定
            ],
            'shipping_exclusions' => $usListing['shipping_exclusions'],
            'return_policy' => [
                'returns_accepted' => true,
                'return_period' => '30 Days',
                'return_shipping_paid_by' => 'Seller'
            ]
        ],
        'international_ddu_listing' => [
            'site_id' => 77, // eBay Germany (代表)
            'category_id' => 293,
            'title_template' => '[PRODUCT_TITLE] ' . $intlListing['title_addition'],
            'price' => $intlListing['product_price_usd'],
            'shipping_type' => 'Calculated',
            'item_specifics' => [
                'Shipping' => 'Duties & Taxes may apply',
                'Origin' => 'Japan',
                'Condition' => 'New'
            ],
            'shipping_exclusions' => $intlListing['shipping_exclusions'],
            'global_shipping' => false
        ]
    ];
}

// ユーティリティクラス
class ApiResponse {
    public static function success($data, $message = '') {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $data,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    public static function error($message, $code = 400) {
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'error' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
}
?>