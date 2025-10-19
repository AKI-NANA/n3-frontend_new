<?php
/**
 * 配送業者比較システム
 * Eloji (FedEx) vs オレンジコネクト の最安値自動選択
 */

class CarrierComparisonEngine {
    private $pdo;
    private $carriers = [];
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->loadCarriers();
    }
    
    /**
     * 配送業者情報読み込み
     */
    private function loadCarriers() {
        $stmt = $this->pdo->query("
            SELECT carrier_id, carrier_name, carrier_code, coverage_regions 
            FROM shipping_carriers 
            WHERE is_active = 1 
            ORDER BY priority_order ASC
        ");
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $this->carriers[$row['carrier_code']] = $row;
        }
    }
    
    /**
     * 最安値配送業者選択
     */
    public function findBestShipping($productId, $weight, $dimensions, $destinationCountry) {
        $results = [];
        
        // 各業者で料金計算
        foreach ($this->carriers as $carrierCode => $carrier) {
            if ($this->isCarrierAvailable($carrierCode, $destinationCountry)) {
                $carrierResult = $this->calculateCarrierRates($carrier, $productId, $weight, $dimensions, $destinationCountry);
                if ($carrierResult['success']) {
                    $results[$carrierCode] = $carrierResult;
                }
            }
        }
        
        if (empty($results)) {
            return [
                'success' => false,
                'error' => '利用可能な配送業者が見つかりません'
            ];
        }
        
        // 最安値業者選択
        $bestOption = $this->selectBestOption($results);
        
        // 比較ログ保存
        $this->saveComparisonLog($productId, $weight, $dimensions, $destinationCountry, $bestOption, $results);
        
        return [
            'success' => true,
            'best_option' => $bestOption,
            'all_options' => $results,
            'savings' => $this->calculateSavings($results)
        ];
    }
    
    /**
     * 業者利用可能性確認
     */
    private function isCarrierAvailable($carrierCode, $destinationCountry) {
        $carrier = $this->carriers[$carrierCode];
        $coverage = json_decode($carrier['coverage_regions'], true);
        
        switch ($carrierCode) {
            case 'ELOJI_FEDEX':
                return true; // 全世界対応
                
            case 'ORANGE_CONNEX':
                return $destinationCountry !== 'US'; // USA以外
                
            default:
                return in_array('WORLDWIDE', $coverage);
        }
    }
    
    /**
     * 業者別料金計算
     */
    private function calculateCarrierRates($carrier, $productId, $weight, $dimensions, $destinationCountry) {
        try {
            // ゾーン判定
            $zoneId = $this->determineZone($destinationCountry);
            if (!$zoneId) {
                return ['success' => false, 'error' => 'ゾーン判定失敗'];
            }
            
            // 各サービスタイプで計算
            $services = $this->calculateAllServices($carrier['carrier_id'], $zoneId, $weight, $dimensions);
            
            if (empty($services)) {
                return ['success' => false, 'error' => '利用可能なサービスなし'];
            }
            
            // 最安サービス選択
            $bestService = min($services);
            
            return [
                'success' => true,
                'carrier' => $carrier,
                'best_service' => $bestService,
                'all_services' => $services,
                'zone_id' => $zoneId
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 全サービスタイプ計算
     */
    private function calculateAllServices($carrierId, $zoneId, $weight, $dimensions) {
        $services = [];
        
        // Economy と Express の2サービス
        foreach (['economy', 'express'] as $serviceType) {
            $rate = $this->calculateServiceRate($carrierId, $serviceType, $zoneId, $weight, $dimensions);
            if ($rate) {
                $services[$serviceType] = $rate;
            }
        }
        
        return $services;
    }
    
    /**
     * サービス別料金計算
     */
    private function calculateServiceRate($carrierId, $serviceType, $zoneId, $weight, $dimensions) {
        // 容積重量計算
        $volumeWeight = ($dimensions[0] * $dimensions[1] * $dimensions[2]) / 5000;
        $chargeableWeight = max($weight, $volumeWeight);
        
        // 該当料金取得
        $stmt = $this->pdo->prepare("
            SELECT cr.*, cp.policy_name, cp.fuel_surcharge_percent, cp.handling_fee
            FROM carrier_rates cr
            JOIN carrier_policies cp ON cr.policy_id = cp.policy_id
            WHERE cp.carrier_id = ? 
            AND cp.policy_type = ?
            AND cr.zone_id = ?
            AND cr.weight_min_kg <= ?
            AND cr.weight_max_kg >= ?
            AND cr.is_active = 1
            AND (cr.expiry_date IS NULL OR cr.expiry_date >= CURRENT_DATE)
            ORDER BY cr.weight_min_kg DESC
            LIMIT 1
        ");
        
        $stmt->execute([$carrierId, $serviceType, $zoneId, $chargeableWeight, $chargeableWeight]);
        $rate = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$rate) {
            return null;
        }
        
        // 最終料金計算
        $baseCost = floatval($rate['cost_usd']);
        $fuelSurcharge = $baseCost * (floatval($rate['fuel_surcharge_percent']) / 100);
        $handlingFee = floatval($rate['handling_fee']);
        $finalCost = $baseCost + $fuelSurcharge + $handlingFee;
        
        return [
            'service_type' => $serviceType,
            'service_name' => $rate['policy_name'],
            'base_cost' => $baseCost,
            'fuel_surcharge' => $fuelSurcharge,
            'handling_fee' => $handlingFee,
            'final_cost' => round($finalCost, 2),
            'chargeable_weight' => $chargeableWeight,
            'delivery_days' => $rate['delivery_days_min'] . '-' . $rate['delivery_days_max'],
            'rate_details' => $rate
        ];
    }
    
    /**
     * ゾーン判定
     */
    private function determineZone($country) {
        $stmt = $this->pdo->prepare("
            SELECT zone_id 
            FROM shipping_zones 
            WHERE JSON_CONTAINS(countries_json, ?) 
            AND is_active = 1
            ORDER BY zone_priority ASC
            LIMIT 1
        ");
        
        $stmt->execute(['"' . $country . '"']);
        return $stmt->fetchColumn();
    }
    
    /**
     * 最安オプション選択
     */
    private function selectBestOption($results) {
        $bestCost = PHP_FLOAT_MAX;
        $bestOption = null;
        
        foreach ($results as $carrierCode => $result) {
            $cost = $result['best_service']['final_cost'];
            if ($cost < $bestCost) {
                $bestCost = $cost;
                $bestOption = [
                    'carrier_code' => $carrierCode,
                    'carrier_name' => $result['carrier']['carrier_name'],
                    'service' => $result['best_service'],
                    'total_cost' => $cost
                ];
            }
        }
        
        return $bestOption;
    }
    
    /**
     * 節約額計算
     */
    private function calculateSavings($results) {
        if (count($results) < 2) {
            return ['savings_amount' => 0, 'savings_percent' => 0];
        }
        
        $costs = [];
        foreach ($results as $result) {
            $costs[] = $result['best_service']['final_cost'];
        }
        
        sort($costs);
        $cheapest = $costs[0];
        $mostExpensive = $costs[count($costs) - 1];
        
        $savings = $mostExpensive - $cheapest;
        $savingsPercent = ($savings / $mostExpensive) * 100;
        
        return [
            'savings_amount' => round($savings, 2),
            'savings_percent' => round($savingsPercent, 1),
            'cheapest_cost' => $cheapest,
            'most_expensive_cost' => $mostExpensive
        ];
    }
    
    /**
     * 比較ログ保存
     */
    private function saveComparisonLog($productId, $weight, $dimensions, $destinationCountry, $bestOption, $allResults) {
        $stmt = $this->pdo->prepare("
            INSERT INTO rate_comparison_log 
            (product_id, weight_kg, length_cm, width_cm, height_cm, destination_country, 
             best_carrier_id, best_cost_usd, best_delivery_days, comparison_results)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $carrierId = $this->carriers[$bestOption['carrier_code']]['carrier_id'];
        
        $stmt->execute([
            $productId,
            $weight,
            $dimensions[0],
            $dimensions[1], 
            $dimensions[2],
            $destinationCountry,
            $carrierId,
            $bestOption['total_cost'],
            $bestOption['service']['delivery_days'],
            json_encode($allResults)
        ]);
    }
    
    /**
     * Eloji専用データセット
     */
    public function setElojiRates($csvData) {
        $carrierId = $this->carriers['ELOJI_FEDEX']['carrier_id'];
        
        $this->pdo->beginTransaction();
        try {
            // 既存データ削除
            $stmt = $this->pdo->prepare("
                DELETE cr FROM carrier_rates cr
                JOIN carrier_policies cp ON cr.policy_id = cp.policy_id
                WHERE cp.carrier_id = ?
            ");
            $stmt->execute([$carrierId]);
            
            // 新データ挿入
            foreach ($csvData as $row) {
                $this->insertElojiRate($carrierId, $row);
            }
            
            $this->pdo->commit();
            return ['success' => true, 'message' => 'Elojiデータ更新完了'];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
    
    /**
     * オレンジコネクト用データセット（将来実装）
     */
    public function setOrangeConnexRates($csvData) {
        // オレンジコネクトのデータ形式に合わせて実装
        // 現在は準備のみ
        return [
            'success' => false, 
            'message' => 'オレンジコネクトデータは未実装'
        ];
    }
}
?>
