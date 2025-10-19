<?php
/**
 * 送料計算API - ツール実行用エンドポイント
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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
        error_log("Database connection failed: " . $e->getMessage());
        return null;
    }
}

// 簡易送料計算（モック）
function calculateShippingCost($weight, $length, $width, $height, $destination = 'US') {
    // 容積重量計算 (cm³ / 5000)
    $volumetric_weight = 0;
    if ($length > 0 && $width > 0 && $height > 0) {
        $volumetric_weight = ($length * $width * $height) / 5000;
    }
    
    // 課金重量（実重量 vs 容積重量の大きい方）
    $chargeable_weight = max($weight, $volumetric_weight);
    
    // 基本料金計算（簡易版）
    $base_rate = 2000; // 基本料金
    $weight_rate = 500; // kg単位の追加料金
    
    $total_jpy = $base_rate + ($chargeable_weight * $weight_rate);
    $total_usd = round($total_jpy / 150, 2);
    
    return [
        'success' => true,
        'data' => [
            'recommended_method' => 'EMS（国際スピード郵便）',
            'shipping_cost' => $total_usd,
            'shipping_cost_jpy' => round($total_jpy),
            'delivery_days' => '3-6',
            'chargeable_weight' => round($chargeable_weight, 2),
            'volumetric_weight' => round($volumetric_weight, 2),
            'calculation_details' => [
                'weight' => $weight,
                'dimensions' => [
                    'length' => $length,
                    'width' => $width,
                    'height' => $height
                ],
                'destination' => $destination
            ]
        ]
    ];
}

// メイン処理
try {
    // POST データ取得
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        // フォームデータの場合
        $input = $_POST;
    }
    
    $action = $input['action'] ?? '';
    $weight = floatval($input['weight'] ?? 0);
    $length = floatval($input['length'] ?? 0);
    $width = floatval($input['width'] ?? 0);
    $height = floatval($input['height'] ?? 0);
    $destination = strtoupper($input['destination'] ?? 'US');
    
    // バリデーション
    if ($weight <= 0) {
        echo json_encode([
            'success' => false,
            'message' => '重量は必須です（0より大きい値）'
        ]);
        exit;
    }
    
    // 送料計算実行
    $result = calculateShippingCost($weight, $length, $width, $height, $destination);
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Shipping calculation error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => '送料計算エラー: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
