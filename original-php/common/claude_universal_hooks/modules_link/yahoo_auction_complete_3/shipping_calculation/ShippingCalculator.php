<?php
/**
 * 送料計算ロジック（PHP）
 * USA基準送料システム
 * 作成日: 2025-09-05
 */

class ShippingCalculator {
    private $db;
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    /**
     * 商品の送料を計算する
     * @param string $productId 商品ID
     * @param float $weight 重量(kg)
     * @param array $dimensions サイズ[length, width, height](cm)
     * @param string $destinationCountry 送付先国コード
     * @return array 計算結果
     */
    public function calculateShipping($productId, $weight, $dimensions, $destinationCountry = 'US') {
        try {
            // 1. 容積重量計算
            $volumeWeight = $this->calculateVolumeWeight($dimensions);
            $finalWeight = max($weight, $volumeWeight);
            
            // 2. 商品サイズから適切なポリシー選択
            $policyType = $this->selectOptimalPolicy($finalWeight, $dimensions);
            
            // 3. 送付先ゾーン判定
            $zoneInfo = $this->determineDestinationZone($destinationCountry);
            
            // 4. 実際の送料計算
            $shippingCost = $this->calculateActualCost($policyType, $finalWeight, $zoneInfo);
            
            // 5. 商品テーブル更新
            $this->updateProductShippingData($productId, $weight, $dimensions, $volumeWeight, $finalWeight, $policyType, $shippingCost);
            
            // 6. 計算ログ保存
            $this->logCalculation($productId, $destinationCountry, $zoneInfo['zone_id'], $policyType, $finalWeight, $dimensions, $shippingCost);
            
            return [
                'success' => true,
                'data' => [
                    'shipping_cost_usd' => $shippingCost,
                    'policy_type' => $policyType,
                    'final_weight_kg' => $finalWeight,
                    'zone_info' => $zoneInfo,
                    'calculation_details' => [
                        'actual_weight' => $weight,
                        'volume_weight' => $volumeWeight,
                        'dimensions' => $dimensions,
                        'destination' => $destinationCountry
                    ]
                ]
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 容積重量計算 (length × width × height ÷ 5000)
     */
    private function calculateVolumeWeight($dimensions) {
        $volume = $dimensions[0] * $dimensions[1] * $dimensions[2]; // cm³
        return $volume / 5000; // kg (一般的な航空便の容積重量係数)
    }
    
    /**
     * 商品サイズ・重量に基づく最適ポリシー選択
     */
    private function selectOptimalPolicy($weight, $dimensions) {
        $maxDimension = max($dimensions);
        
        // 小型・軽量商品
        if ($weight <= 0.5 && $maxDimension <= 30) {
            return 'economy';
        }
        
        // 大型または重量商品
        if ($weight > 5.0 || $maxDimension > 100) {
            return 'express';
        }
        
        // 中間サイズ
        return 'standard';
    }
    
    /**
     * 送付先国からゾーン判定
     */
    private function determineDestinationZone($countryCode) {
        $stmt = $this->db->prepare("
            SELECT zone_id, zone_name, zone_type, countries_json 
            FROM shipping_zones 
            WHERE is_active = 1 
            ORDER BY zone_priority ASC
        ");
        $stmt->execute();
        $zones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($zones as $zone) {
            $countries = json_decode($zone['countries_json'], true);
            
            // 完全一致チェック
            if (in_array($countryCode, $countries)) {
                return $zone;
            }
            
            // ワイルドカード（最後の手段）
            if (in_array('*', $countries)) {
                return $zone;
            }
        }
        
        // デフォルト（見つからない場合）
        return [
            'zone_id' => 5, // Rest of World
            'zone_name' => 'Rest of World',
            'zone_type' => 'international'
        ];
    }
    
    /**
     * 実際の送料計算
     */
    private function calculateActualCost($policyType, $weight, $zoneInfo) {
        // 基本ポリシー情報取得
        $stmt = $this->db->prepare("
            SELECT * FROM shipping_policies 
            WHERE policy_type = ? AND policy_status = 'active'
        ");
        $stmt->execute([$policyType]);
        $policy = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$policy) {
            throw new Exception("有効な配送ポリシーが見つかりません: {$policyType}");
        }
        
        // 該当する送料レート取得
        $stmt = $this->db->prepare("
            SELECT cost_usd FROM shipping_rates 
            WHERE policy_id = ? 
            AND (zone_id = ? OR zone_id IS NULL)
            AND weight_min_kg <= ? 
            AND weight_max_kg >= ?
            AND is_active = 1
            ORDER BY zone_id ASC, weight_min_kg ASC
            LIMIT 1
        ");
        $stmt->execute([$policy['policy_id'], $zoneInfo['zone_id'], $weight, $weight]);
        $rate = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$rate) {
            // フォールバック: USA基準送料を使用
            $baseCost = $policy['usa_base_cost'];
        } else {
            $baseCost = $rate['cost_usd'];
        }
        
        // 燃油サーチャージ適用
        $fuelSurcharge = $baseCost * ($policy['fuel_surcharge_percent'] / 100);
        
        // 手数料追加
        $totalCost = $baseCost + $fuelSurcharge + $policy['handling_fee'];
        
        return round($totalCost, 2);
    }
    
    /**
     * 商品の送料データ更新
     */
    private function updateProductShippingData($productId, $weight, $dimensions, $volumeWeight, $finalWeight, $policyType, $shippingCost) {
        // ポリシーID取得
        $stmt = $this->db->prepare("SELECT policy_id FROM shipping_policies WHERE policy_type = ?");
        $stmt->execute([$policyType]);
        $policyId = $stmt->fetchColumn();
        
        $stmt = $this->db->prepare("
            INSERT INTO product_shipping_dimensions 
            (product_id, length_cm, width_cm, height_cm, weight_kg, volume_weight_kg, final_weight_kg, selected_policy_id, calculated_shipping_usd, last_calculated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
            length_cm = VALUES(length_cm),
            width_cm = VALUES(width_cm),
            height_cm = VALUES(height_cm),
            weight_kg = VALUES(weight_kg),
            volume_weight_kg = VALUES(volume_weight_kg),
            final_weight_kg = VALUES(final_weight_kg),
            selected_policy_id = VALUES(selected_policy_id),
            calculated_shipping_usd = VALUES(calculated_shipping_usd),
            last_calculated = VALUES(last_calculated)
        ");
        
        $stmt->execute([
            $productId,
            $dimensions[0], $dimensions[1], $dimensions[2],
            $weight, $volumeWeight, $finalWeight,
            $policyId, $shippingCost
        ]);
    }
    
    /**
     * 計算ログ保存
     */
    private function logCalculation($productId, $destinationCountry, $zoneId, $policyType, $weight, $dimensions, $cost) {
        $stmt = $this->db->prepare("SELECT policy_id FROM shipping_policies WHERE policy_type = ?");
        $stmt->execute([$policyType]);
        $policyId = $stmt->fetchColumn();
        
        $calculationDetails = json_encode([
            'policy_type' => $policyType,
            'input_weight' => $weight,
            'input_dimensions' => $dimensions,
            'calculation_method' => 'auto',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
        $stmt = $this->db->prepare("
            INSERT INTO shipping_calculation_log 
            (product_id, destination_country, destination_zone_id, used_policy_id, input_weight_kg, input_dimensions, calculated_cost_usd, calculation_details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $productId, $destinationCountry, $zoneId, $policyId,
            $weight, implode('×', $dimensions), $cost, $calculationDetails
        ]);
    }
    
    /**
     * 複数商品の一括計算
     */
    public function calculateBulkShipping($products, $destinationCountry = 'US') {
        $results = [];
        
        foreach ($products as $product) {
            $result = $this->calculateShipping(
                $product['product_id'],
                $product['weight'],
                [$product['length'], $product['width'], $product['height']],
                $destinationCountry
            );
            
            $results[] = [
                'product_id' => $product['product_id'],
                'calculation_result' => $result
            ];
        }
        
        return $results;
    }
    
    /**
     * 配送ポリシー情報取得
     */
    public function getPolicyInfo($policyType) {
        $stmt = $this->db->prepare("
            SELECT p.*, 
                   COUNT(sr.rate_id) as rate_count,
                   MIN(sr.cost_usd) as min_cost,
                   MAX(sr.cost_usd) as max_cost
            FROM shipping_policies p
            LEFT JOIN shipping_rates sr ON p.policy_id = sr.policy_id AND sr.is_active = 1
            WHERE p.policy_type = ? AND p.policy_status = 'active'
            GROUP BY p.policy_id
        ");
        $stmt->execute([$policyType]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}

/**
 * 使用例
 */
/*
$db = new PDO($dsn, $username, $password);
$calculator = new ShippingCalculator($db);

$result = $calculator->calculateShipping(
    'PROD-001',           // 商品ID
    1.5,                  // 重量 1.5kg
    [30, 20, 15],        // サイズ 30×20×15cm
    'CA'                  // カナダ宛
);

if ($result['success']) {
    echo "送料: $" . $result['data']['shipping_cost_usd'];
    echo "選択されたポリシー: " . $result['data']['policy_type'];
} else {
    echo "エラー: " . $result['error'];
}
*/
?>
