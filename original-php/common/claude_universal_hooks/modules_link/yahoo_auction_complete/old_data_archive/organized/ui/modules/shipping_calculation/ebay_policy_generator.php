<?php
/**
 * eBay配送ポリシー自動生成システム
 * PostgreSQL配送データベースからeBayポリシー生成
 */

class EbayShippingPolicyGenerator {
    private $pdo;
    private $carrierId;
    
    public function __construct() {
        // PostgreSQL接続
        $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
        $this->pdo = new PDO($dsn, "postgres", "", [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        
        // Eloji FedX配送業者ID取得
        $stmt = $this->pdo->prepare("SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'ELOJI_FEDEX'");
        $stmt->execute();
        $this->carrierId = $stmt->fetchColumn();
    }
    
    /**
     * eBay配送ポリシー生成（商品重量別）
     */
    public function generateEbayPolicies($productWeight = 1.0, $productDimensions = null) {
        echo "🎯 eBay配送ポリシー生成開始 (商品重量: {$productWeight}kg)\n\n";
        
        // 全地域の料金取得
        $shippingRates = $this->calculateAllRegionRates($productWeight);
        
        if (empty($shippingRates)) {
            throw new Exception("配送料金が見つかりません");
        }
        
        // eBayポリシー生成
        $policies = [
            'economy' => $this->generateEbayPolicy('economy', $shippingRates['economy'], $productWeight),
            'express' => $this->generateEbayPolicy('express', $shippingRates['express'], $productWeight)
        ];
        
        return $policies;
    }
    
    /**
     * 全地域の料金計算
     */
    private function calculateAllRegionRates($weight) {
        $rates = ['economy' => [], 'express' => []];
        
        // 利用可能ゾーン取得
        $stmt = $this->pdo->query("
            SELECT zone_id, zone_name, countries_json 
            FROM shipping_zones 
            WHERE countries_json IS NOT NULL 
            ORDER BY zone_name
        ");
        $zones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($zones as $zone) {
            $countries = json_decode($zone['countries_json'], true);
            if (!$countries) continue;
            
            foreach (['economy', 'express'] as $serviceType) {
                $rate = $this->calculateZoneRate($zone['zone_id'], $weight, $serviceType);
                if ($rate) {
                    $rates[$serviceType][] = [
                        'zone_name' => $zone['zone_name'],
                        'countries' => $countries,
                        'base_cost' => floatval($rate['cost_usd']),
                        'delivery_days' => $rate['delivery_days'],
                        'total_cost' => $this->calculateTotalCost($rate['cost_usd'], $serviceType)
                    ];
                }
            }
        }
        
        return $rates;
    }
    
    /**
     * ゾーン別料金計算
     */
    private function calculateZoneRate($zoneId, $weight, $serviceType) {
        $stmt = $this->pdo->prepare("
            SELECT cr.cost_usd, 
                   cr.delivery_days_min || '-' || cr.delivery_days_max as delivery_days
            FROM carrier_rates_extended cr
            JOIN carrier_policies_extended cp ON cr.policy_id = cp.policy_id
            WHERE cp.carrier_id = ?
            AND cp.policy_type = ?
            AND cr.zone_id = ?
            AND cr.weight_min_kg <= ?
            AND cr.weight_max_kg >= ?
            AND cr.is_active = true
            ORDER BY cr.weight_min_kg DESC
            LIMIT 1
        ");
        
        $stmt->execute([$this->carrierId, $serviceType, $zoneId, $weight, $weight]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * 総費用計算（燃料代・手数料込み）
     */
    private function calculateTotalCost($baseCost, $serviceType) {
        $fuelSurcharge = floatval($baseCost) * 0.05; // 5%
        $handlingFee = ($serviceType === 'express') ? 3.50 : 2.50;
        return round(floatval($baseCost) + $fuelSurcharge + $handlingFee, 2);
    }
    
    /**
     * eBayポリシー生成
     */
    private function generateEbayPolicy($serviceType, $rates, $productWeight) {
        $serviceName = ($serviceType === 'express') ? 'FedX International Priority' : 'FedX International Economy';
        $description = ($serviceType === 'express') ? 'Fast Express Shipping' : 'Economy International Shipping';
        
        // 料金をeBay形式に変換
        $ebayRates = [];
        foreach ($rates as $rate) {
            foreach ($rate['countries'] as $country) {
                $ebayRates[] = [
                    'country' => $country,
                    'zone' => $rate['zone_name'],
                    'cost' => $rate['total_cost'],
                    'delivery_days' => $rate['delivery_days']
                ];
            }
        }
        
        // 料金でソート（安い順）
        usort($ebayRates, function($a, $b) {
            return $a['cost'] <=> $b['cost'];
        });
        
        return [
            'service_name' => $serviceName,
            'description' => $description,
            'service_type' => $serviceType,
            'product_weight' => $productWeight,
            'rates' => $ebayRates,
            'policy_json' => $this->generateEbayPolicyJSON($serviceName, $ebayRates),
            'csv_export' => $this->generateCSVExport($serviceName, $ebayRates)
        ];
    }
    
    /**
     * eBayポリシーJSON生成
     */
    private function generateEbayPolicyJSON($serviceName, $rates) {
        $policy = [
            'name' => $serviceName,
            'description' => 'International shipping via ' . $serviceName,
            'shippingOptions' => []
        ];
        
        // 地域別グループ化
        $regionGroups = [];
        foreach ($rates as $rate) {
            $region = $rate['zone'];
            if (!isset($regionGroups[$region])) {
                $regionGroups[$region] = [];
            }
            $regionGroups[$region][] = $rate;
        }
        
        foreach ($regionGroups as $region => $regionRates) {
            $avgCost = array_sum(array_column($regionRates, 'cost')) / count($regionRates);
            $countries = array_unique(array_column($regionRates, 'country'));
            
            $policy['shippingOptions'][] = [
                'optionType' => 'FLAT',
                'costType' => 'FLAT_RATE',
                'shippingCost' => [
                    'value' => round($avgCost, 2),
                    'currency' => 'USD'
                ],
                'additionalShippingCost' => [
                    'value' => 0.00,
                    'currency' => 'USD'
                ],
                'regionIncluded' => [
                    'regionName' => $region,
                    'regionType' => 'INTERNATIONAL',
                    'countries' => $countries
                ]
            ];
        }
        
        return json_encode($policy, JSON_PRETTY_PRINT);
    }
    
    /**
     * CSV形式エクスポート
     */
    private function generateCSVExport($serviceName, $rates) {
        $csv = "Service,Country,Zone,Cost_USD,Delivery_Days\n";
        foreach ($rates as $rate) {
            $csv .= sprintf("%s,%s,%s,%.2f,%s\n", 
                $serviceName,
                $rate['country'],
                $rate['zone'],
                $rate['cost'],
                $rate['delivery_days']
            );
        }
        return $csv;
    }
}

// ===== 実行例 =====
try {
    echo "🎯 eBay配送ポリシー自動生成システム\n";
    echo "PDFデータベース → eBayポリシー変換\n\n";
    
    $generator = new EbayShippingPolicyGenerator();
    
    // 様々な商品重量でポリシー生成
    $testWeights = [0.5, 1.0, 2.0, 5.0];
    
    foreach ($testWeights as $weight) {
        echo str_repeat("=", 60) . "\n";
        echo "商品重量: {$weight}kg のeBayポリシー生成\n";
        echo str_repeat("=", 60) . "\n";
        
        $policies = $generator->generateEbayPolicies($weight);
        
        foreach (['economy', 'express'] as $serviceType) {
            $policy = $policies[$serviceType];
            
            echo "\n📋 {$policy['service_name']} ポリシー:\n";
            echo "  料金パターン数: " . count($policy['rates']) . "\n";
            echo "  最安値: $" . min(array_column($policy['rates'], 'cost')) . "\n";
            echo "  最高値: $" . max(array_column($policy['rates'], 'cost')) . "\n";
            
            // 主要国の料金表示
            $mainCountries = ['US', 'GB', 'AU', 'JP', 'DE', 'CA'];
            echo "  主要国料金:\n";
            
            foreach ($policy['rates'] as $rate) {
                if (in_array($rate['country'], $mainCountries)) {
                    echo sprintf("    %s: $%.2f (%s日)\n", 
                        $rate['country'], 
                        $rate['cost'], 
                        $rate['delivery_days']
                    );
                }
            }
        }
        
        echo "\n✅ {$weight}kg商品のeBayポリシー生成完了\n";
    }
    
    echo "\n🎉 eBay配送ポリシー自動生成完了！\n";
    echo "✅ PDFデータ → PostgreSQL → eBayポリシーの完全自動化達成\n";
    
} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
}
?>
