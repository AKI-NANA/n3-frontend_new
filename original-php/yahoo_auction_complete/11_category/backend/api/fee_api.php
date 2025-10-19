<?php
/**
 * 手数料取得API - Supabase版
 * ファイル: fee_api.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Supabase接続
    require_once __DIR__ . '/../config/supabase.php';
    $pdo = getSupabaseConnection();
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? '';
    
    switch ($action) {
        case 'get_category_fee':
            $categoryId = $input['category_id'] ?? '';
            $priceUsd = floatval($input['price_usd'] ?? 0);
            
            if (empty($categoryId)) {
                throw new Exception('カテゴリーIDが必要です');
            }
            
            // 手数料マスターから取得
            $sql = "SELECT * FROM ebay_category_fees WHERE category_id = ? LIMIT 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$categoryId]);
            $feeData = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$feeData) {
                echo json_encode([
                    'success' => false,
                    'error' => 'このカテゴリーの手数料データが見つかりません',
                    'category_id' => $categoryId,
                    'message' => 'ebay_category_fees テーブルにデータを追加してください'
                ]);
                exit;
            }
            
            // 手数料計算
            $finalValueFeePercent = floatval($feeData['final_value_fee_percent']);
            $finalValueFee = $priceUsd * ($finalValueFeePercent / 100);
            
            // PayPal手数料
            $paypalFeePercent = floatval($feeData['paypal_fee_percent'] ?? 2.90);
            $paypalFeeFixed = floatval($feeData['paypal_fee_fixed'] ?? 0.30);
            $paypalFee = ($priceUsd * ($paypalFeePercent / 100)) + $paypalFeeFixed;
            
            // 総手数料
            $insertionFee = floatval($feeData['insertion_fee'] ?? 0);
            $totalFee = $finalValueFee + $insertionFee + $paypalFee;
            
            echo json_encode([
                'success' => true,
                'fee' => [
                    'category_id' => $categoryId,
                    'final_value_fee_percent' => $finalValueFeePercent,
                    'final_value_fee_amount' => round($finalValueFee, 2),
                    'insertion_fee' => $insertionFee,
                    'paypal_fee_percent' => $paypalFeePercent,
                    'paypal_fee_fixed' => $paypalFeeFixed,
                    'paypal_fee' => round($paypalFee, 2),
                    'total_fee' => round($totalFee, 2),
                    'price_usd' => $priceUsd
                ]
            ]);
            break;
            
        default:
            throw new Exception('不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
