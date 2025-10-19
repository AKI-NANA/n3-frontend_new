<?php
/**
 * 配送ポリシー自動生成エンジン
 * AI生成テンプレートをベースにした自動化システム
 */

class PolicyGenerationEngine {
    private $pdo;
    private $templates;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->loadTemplates();
    }
    
    /**
     * AI生成テンプレート読み込み
     */
    private function loadTemplates() {
        $templateFile = __DIR__ . '/policy_templates.json';
        
        if (!file_exists($templateFile)) {
            throw new Exception('ポリシーテンプレートが見つかりません。初回セットアップが必要です。');
        }
        
        $this->templates = json_decode(file_get_contents($templateFile), true);
    }
    
    /**
     * 送料データから3つのポリシーを自動生成
     */
    public function generatePoliciesFromData($shippingData) {
        $generatedPolicies = [];
        
        foreach (['economy', 'standard', 'express'] as $policyType) {
            $policy = $this->generateSinglePolicy($policyType, $shippingData);
            $generatedPolicies[$policyType] = $policy;
        }
        
        return $generatedPolicies;
    }
    
    /**
     * 単一ポリシー生成
     */
    private function generateSinglePolicy($policyType, $shippingData) {
        $template = $this->templates['policy_templates'][$policyType];
        
        $policy = [
            'name' => $template['name'],
            'type' => $policyType,
            'zones' => [],
            'rules' => $template['rules']
        ];
        
        // ゾーン別料金設定
        foreach ($this->templates['zone_mapping'] as $zoneName => $countries) {
            $zoneRates = $this->calculateZoneRates($zoneName, $policyType, $shippingData);
            $policy['zones'][$zoneName] = $zoneRates;
        }
        
        return $policy;
    }
    
    /**
     * ゾーン別料金計算
     */
    private function calculateZoneRates($zoneName, $policyType, $shippingData) {
        $template = $this->templates['policy_templates'][$policyType];
        $zoneTemplate = $template['zones'][$zoneName] ?? $template['zones']['default'];
        
        $rates = [];
        
        // 送料データからゾーン該当分を抽出
        $zoneData = array_filter($shippingData, function($row) use ($zoneName) {
            return $row['zone_name'] === $zoneName;
        });
        
        if (empty($zoneData)) {
            // テンプレートのデフォルト値使用
            $rates = [
                'base_cost' => $zoneTemplate['base_cost'],
                'weight_ranges' => $this->generateDefaultWeightRanges($zoneTemplate)
            ];
        } else {
            // 実データから計算
            $rates = $this->calculateRatesFromData($zoneData, $zoneTemplate);
        }
        
        // 燃油サーチャージ等を追加
        $rates = $this->applyAdditionalCharges($rates);
        
        return $rates;
    }
    
    /**
     * デフォルト重量範囲生成
     */
    private function generateDefaultWeightRanges($zoneTemplate) {
        $ranges = [];
        $baseRate = $zoneTemplate['base_cost'];
        $weightFactor = $zoneTemplate['weight_factor'];
        
        $weightBreaks = [0.5, 1.0, 2.0, 5.0, 10.0, 20.0];
        
        for ($i = 0; $i < count($weightBreaks); $i++) {
            $minWeight = $i === 0 ? 0 : $weightBreaks[$i-1];
            $maxWeight = $weightBreaks[$i];
            
            $cost = $baseRate + ($maxWeight * $weightFactor);
            
            $ranges[] = [
                'weight_min' => $minWeight,
                'weight_max' => $maxWeight,
                'cost' => round($cost, 2)
            ];
        }
        
        return $ranges;
    }
    
    /**
     * 実データから料金計算
     */
    private function calculateRatesFromData($zoneData, $zoneTemplate) {
        $rates = [];
        
        // データをサービスタイプでフィルター
        $serviceData = array_filter($zoneData, function($row) use ($zoneTemplate) {
            return $row['service_type'] === $zoneTemplate['service_type'];
        });
        
        foreach ($serviceData as $row) {
            $rates[] = [
                'weight_min' => floatval($row['weight_min_kg']),
                'weight_max' => floatval($row['weight_max_kg']),
                'cost' => floatval($row['cost_usd']),
                'delivery_days_min' => intval($row['delivery_days_min'] ?? 0),
                'delivery_days_max' => intval($row['delivery_days_max'] ?? 0)
            ];
        }
        
        return ['weight_ranges' => $rates];
    }
    
    /**
     * 追加料金適用
     */
    private function applyAdditionalCharges($rates) {
        $rules = $this->templates['calculation_rules'];
        
        if (isset($rates['weight_ranges'])) {
            foreach ($rates['weight_ranges'] as &$range) {
                // 燃油サーチャージ
                $fuelSurcharge = $range['cost'] * ($rules['fuel_surcharge'] / 100);
                
                // 手数料
                $handlingFee = $rules['handling_fee'];
                
                // 最終価格
                $range['final_cost'] = round($range['cost'] + $fuelSurcharge + $handlingFee, 2);
                $range['fuel_surcharge'] = round($fuelSurcharge, 2);
                $range['handling_fee'] = $handlingFee;
            }
        }
        
        return $rates;
    }
    
    /**
     * 生成されたポリシーをデータベースに保存
     */
    public function savePolicyToDatabase($policyData) {
        $this->pdo->beginTransaction();
        
        try {
            // ポリシー本体保存
            $stmt = $this->pdo->prepare("
                INSERT INTO shipping_policies 
                (policy_name, policy_type, usa_base_cost, fuel_surcharge_percent, handling_fee, policy_status)
                VALUES (?, ?, ?, ?, ?, 'active')
                ON DUPLICATE KEY UPDATE
                policy_name = VALUES(policy_name),
                usa_base_cost = VALUES(usa_base_cost),
                fuel_surcharge_percent = VALUES(fuel_surcharge_percent),
                handling_fee = VALUES(handling_fee)
            ");
            
            $usaBaseCost = $this->calculateUSABaseCost($policyData);
            
            $stmt->execute([
                $policyData['name'],
                $policyData['type'],
                $usaBaseCost,
                $this->templates['calculation_rules']['fuel_surcharge'],
                $this->templates['calculation_rules']['handling_fee']
            ]);
            
            $policyId = $this->pdo->lastInsertId() ?: $this->getPolicyIdByType($policyData['type']);
            
            // ゾーン別料金保存
            $this->savePolicyRates($policyId, $policyData['zones']);
            
            $this->pdo->commit();
            
            return [
                'success' => true,
                'policy_id' => $policyId,
                'message' => "ポリシー '{$policyData['name']}' を保存しました"
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
    
    /**
     * USA基準送料計算
     */
    private function calculateUSABaseCost($policyData) {
        if (isset($policyData['zones']['North America']['weight_ranges'][0]['final_cost'])) {
            return $policyData['zones']['North America']['weight_ranges'][0]['final_cost'];
        }
        
        // フォールバック
        $defaults = ['economy' => 15.00, 'standard' => 25.00, 'express' => 45.00];
        return $defaults[$policyData['type']] ?? 25.00;
    }
    
    /**
     * ポリシーID取得
     */
    private function getPolicyIdByType($policyType) {
        $stmt = $this->pdo->prepare("SELECT policy_id FROM shipping_policies WHERE policy_type = ?");
        $stmt->execute([$policyType]);
        return $stmt->fetchColumn();
    }
    
    /**
     * ポリシー料金保存
     */
    private function savePolicyRates($policyId, $zonesData) {
        // 既存料金削除
        $stmt = $this->pdo->prepare("DELETE FROM shipping_rates WHERE policy_id = ?");
        $stmt->execute([$policyId]);
        
        // 新料金挿入
        $stmt = $this->pdo->prepare("
            INSERT INTO shipping_rates 
            (policy_id, zone_id, weight_min_kg, weight_max_kg, cost_usd, delivery_days_min, delivery_days_max, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ");
        
        foreach ($zonesData as $zoneName => $zoneRates) {
            $zoneId = $this->getOrCreateZoneId($zoneName);
            
            if (isset($zoneRates['weight_ranges'])) {
                foreach ($zoneRates['weight_ranges'] as $range) {
                    $stmt->execute([
                        $policyId,
                        $zoneId,
                        $range['weight_min'],
                        $range['weight_max'],
                        $range['final_cost'],
                        $range['delivery_days_min'] ?? null,
                        $range['delivery_days_max'] ?? null
                    ]);
                }
            }
        }
    }
    
    /**
     * ゾーンID取得または作成
     */
    private function getOrCreateZoneId($zoneName) {
        $stmt = $this->pdo->prepare("SELECT zone_id FROM shipping_zones WHERE zone_name = ?");
        $stmt->execute([$zoneName]);
        $zoneId = $stmt->fetchColumn();
        
        if (!$zoneId) {
            $countries = $this->templates['zone_mapping'][$zoneName] ?? [];
            
            $stmt = $this->pdo->prepare("
                INSERT INTO shipping_zones (zone_name, zone_type, countries_json, zone_priority)
                VALUES (?, 'international', ?, 50)
            ");
            $stmt->execute([$zoneName, json_encode($countries)]);
            $zoneId = $this->pdo->lastInsertId();
        }
        
        return $zoneId;
    }
    
    /**
     * 全ポリシー自動生成・保存
     */
    public function generateAndSaveAllPolicies($shippingData) {
        $results = [];
        
        $policies = $this->generatePoliciesFromData($shippingData);
        
        foreach ($policies as $policyType => $policyData) {
            try {
                $result = $this->savePolicyToDatabase($policyData);
                $results[$policyType] = $result;
            } catch (Exception $e) {
                $results[$policyType] = [
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }
        
        return $results;
    }
}
?>
