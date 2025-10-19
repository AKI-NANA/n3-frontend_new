<?php
/**
 * 送料計算エンジン - ShippingCalculator
 * 複雑な配送ルールと多次元評価による最適解抽出
 * 
 * 機能:
 * - 階層的ルール適用（基本ルール + 国別例外）
 * - 梱包補正計算
 * - 燃油サーチャージ適用
 * - 多次元スコアリング
 * - 最大5候補抽出
 */
class ShippingCalculator {
    private $pdo;
    private $debugMode = false;
    
    public function __construct($pdo, $debugMode = false) {
        $this->pdo = $pdo;
        $this->debugMode = $debugMode;
    }
    
    /**
     * メイン計算関数
     * @param array $params 計算パラメータ
     * @return array 計算結果
     */
    public function calculateShipping($params) {
        $result = [
            'success' => false,
            'data' => null,
            'message' => '',
            'debug' => []
        ];
        
        try {
            // パラメータ検証
            $validationResult = $this->validateParams($params);
            if (!$validationResult['valid']) {
                $result['message'] = $validationResult['message'];
                return $result;
            }
            
            // 計算UUID生成
            $calculationUuid = $this->generateUuid();
            
            // 梱包後サイズ・重量計算
            $packedDimensions = $this->calculatePackedDimensions($params);
            
            // 利用可能サービス取得
            $availableServices = $this->getAvailableServices($params['destination'], $packedDimensions);
            
            if (empty($availableServices)) {
                $result['message'] = '指定条件で利用可能な配送サービスがありません';
                return $result;
            }
            
            // 各サービスの送料計算
            $calculatedOptions = [];
            foreach ($availableServices as $service) {
                $option = $this->calculateServiceCost($service, $params, $packedDimensions);
                if ($option) {
                    $calculatedOptions[] = $option;
                }
            }
            
            if (empty($calculatedOptions)) {
                $result['message'] = '送料計算結果がありません';
                return $result;
            }
            
            // スコアリング・ランキング
            $rankedOptions = $this->rankOptions($calculatedOptions, $params);
            
            // 最大5候補まで
            $topOptions = array_slice($rankedOptions, 0, 5);
            
            // 計算結果保存
            $this->saveCalculation($calculationUuid, $params, $packedDimensions, $topOptions);
            
            $result['success'] = true;
            $result['data'] = [
                'calculation_uuid' => $calculationUuid,
                'calculation_details' => [
                    'original_weight' => $params['weight'],
                    'packed_weight' => $packedDimensions['weight'],
                    'original_dimensions' => $params['dimensions'] ?? [],
                    'packed_dimensions' => $packedDimensions['dimensions'],
                    'destination' => $params['destination'],
                    'user_preference' => $params['preference'] ?? 'balanced',
                    'calculated_at' => date('Y-m-d H:i:s')
                ],
                'options' => $topOptions,
                'total_options_calculated' => count($calculatedOptions)
            ];
            
            if ($this->debugMode) {
                $result['debug'] = [
                    'available_services' => count($availableServices),
                    'calculated_options' => count($calculatedOptions),
                    'packed_dimensions' => $packedDimensions
                ];
            }
            
        } catch (Exception $e) {
            $result['message'] = '計算エラー: ' . $e->getMessage();
            if ($this->debugMode) {
                $result['debug']['error'] = $e->getTrace();
            }
        }
        
        return $result;
    }
    
    /**
     * パラメータ検証
     */
    private function validateParams($params) {
        $required = ['weight', 'destination'];
        foreach ($required as $field) {
            if (!isset($params[$field]) || empty($params[$field])) {
                return ['valid' => false, 'message' => "必須パラメータが不足: {$field}"];
            }
        }
        
        if (!is_numeric($params['weight']) || $params['weight'] <= 0) {
            return ['valid' => false, 'message' => '重量は正の数値で入力してください'];
        }
        
        if (strlen($params['destination']) !== 2 && strlen($params['destination']) !== 3) {
            return ['valid' => false, 'message' => '配送先国コードが不正です'];
        }
        
        return ['valid' => true];
    }
    
    /**
     * 梱包後サイズ・重量計算
     */
    private function calculatePackedDimensions($params) {
        $weight = (float)$params['weight'];
        $dimensions = $params['dimensions'] ?? [];
        
        // デフォルト梱包補正係数
        $defaultWeightFactor = 1.05; // 5%増
        $defaultSizeFactor = 1.10;   // 10%増
        
        $packedWeight = $weight * $defaultWeightFactor;
        
        $packedDimensions = [];
        if (!empty($dimensions)) {
            $packedDimensions = [
                'length' => ($dimensions['length'] ?? 0) * $defaultSizeFactor,
                'width' => ($dimensions['width'] ?? 0) * $defaultSizeFactor,
                'height' => ($dimensions['height'] ?? 0) * $defaultSizeFactor
            ];
        }
        
        return [
            'weight' => $packedWeight,
            'dimensions' => $packedDimensions,
            'weight_factor' => $defaultWeightFactor,
            'size_factor' => $defaultSizeFactor
        ];
    }
    
    /**
     * 利用可能サービス取得
     */
    private function getAvailableServices($destination, $packedDimensions) {
        $sql = "
            SELECT DISTINCT
                s.id,
                s.name,
                s.code,
                s.type,
                s.delivery_days_min,
                s.delivery_days_max,
                s.tracking,
                s.insurance,
                c.name as carrier_name,
                c.code as carrier_code
            FROM services s
            JOIN carriers c ON s.carrier_id = c.id
            WHERE s.status = 'active' 
            AND c.status = 'active'
            AND (
                -- 国別例外で利用可能
                EXISTS (
                    SELECT 1 FROM country_exceptions ce 
                    WHERE ce.service_id = s.id 
                    AND ce.country_code = ? 
                    AND ce.is_available = true
                    AND ce.weight_from <= ? 
                    AND ce.weight_to >= ?
                    AND (ce.effective_to IS NULL OR ce.effective_to >= CURRENT_DATE)
                )
                OR (
                    -- 基本ルールで利用可能（国別例外がない場合）
                    NOT EXISTS (
                        SELECT 1 FROM country_exceptions ce2 
                        WHERE ce2.service_id = s.id 
                        AND ce2.country_code = ?
                    )
                    AND EXISTS (
                        SELECT 1 FROM shipping_rules sr 
                        WHERE sr.service_id = s.id 
                        AND sr.weight_from <= ? 
                        AND sr.weight_to >= ?
                        AND (sr.effective_to IS NULL OR sr.effective_to >= CURRENT_DATE)
                    )
                )
            )
            ORDER BY c.id, s.type DESC, s.name
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $destination, 
            $packedDimensions['weight'], 
            $packedDimensions['weight'],
            $destination,
            $packedDimensions['weight'], 
            $packedDimensions['weight']
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * サービス別送料計算
     */
    private function calculateServiceCost($service, $params, $packedDimensions) {
        // 国別例外ルール優先
        $rule = $this->getCountryRule($service['id'], $params['destination'], $packedDimensions['weight']);
        
        // 国別例外がなければ基本ルール
        if (!$rule) {
            $rule = $this->getBasicRule($service['id'], $packedDimensions['weight']);
        }
        
        if (!$rule) {
            return null;
        }
        
        // サイズ制限チェック
        $sizeOk = $this->checkSizeRestrictions($rule, $packedDimensions['dimensions']);
        
        // 送料計算
        $baseCost = (float)$rule['base_price'];
        $weightCost = 0;
        
        if ($packedDimensions['weight'] > $rule['weight_from']) {
            $extraWeight = $packedDimensions['weight'] - $rule['weight_from'];
            $weightCost = $extraWeight * (float)$rule['price_per_kg'];
        }
        
        $totalCost = $baseCost + $weightCost;
        
        // 燃油サーチャージ適用
        $surchargeRate = $this->getSurchargeRate($service['id']);
        $surcharge = $totalCost * $surchargeRate;
        $finalCost = $totalCost + $surcharge;
        
        // USD換算（簡易）
        $usdRate = 0.0067; // 1円 = 0.0067ドル（実際はAPI取得推奨）
        $costUsd = $finalCost * $usdRate;
        
        return [
            'service_id' => $service['id'],
            'carrier_name' => $service['carrier_name'],
            'carrier_code' => $service['carrier_code'],
            'service_name' => $service['name'],
            'service_code' => $service['code'],
            'type' => $service['type'],
            'cost_jpy' => round($finalCost, 0),
            'cost_usd' => round($costUsd, 2),
            'base_cost' => $baseCost,
            'weight_cost' => $weightCost,
            'surcharge' => $surcharge,
            'surcharge_rate' => $surchargeRate,
            'delivery_days_min' => $service['delivery_days_min'],
            'delivery_days_max' => $service['delivery_days_max'],
            'delivery_days' => ($service['delivery_days_min'] + $service['delivery_days_max']) / 2,
            'tracking' => (bool)$service['tracking'],
            'insurance' => (bool)$service['insurance'],
            'size_ok' => $sizeOk,
            'currency' => 'JPY'
        ];
    }
    
    /**
     * 国別例外ルール取得
     */
    private function getCountryRule($serviceId, $countryCode, $weight) {
        $sql = "
            SELECT * FROM country_exceptions 
            WHERE service_id = ? 
            AND country_code = ? 
            AND weight_from <= ? 
            AND weight_to >= ?
            AND is_available = true
            AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
            ORDER BY weight_from DESC
            LIMIT 1
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$serviceId, $countryCode, $weight, $weight]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * 基本ルール取得
     */
    private function getBasicRule($serviceId, $weight) {
        $sql = "
            SELECT * FROM shipping_rules 
            WHERE service_id = ? 
            AND weight_from <= ? 
            AND weight_to >= ?
            AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
            ORDER BY weight_from DESC
            LIMIT 1
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$serviceId, $weight, $weight]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * サイズ制限チェック
     */
    private function checkSizeRestrictions($rule, $dimensions) {
        if (empty($dimensions)) {
            return true; // サイズ不明の場合はOKとする
        }
        
        $length = $dimensions['length'] ?? 0;
        $width = $dimensions['width'] ?? 0;
        $height = $dimensions['height'] ?? 0;
        
        // 各辺の制限チェック
        if ($rule['max_length'] && $length > $rule['max_length']) return false;
        if ($rule['max_width'] && $width > $rule['max_width']) return false;
        if ($rule['max_height'] && $height > $rule['max_height']) return false;
        
        // 胴回り制限チェック（L + 2W + 2H）
        if ($rule['max_girth']) {
            $girth = $length + (2 * $width) + (2 * $height);
            if ($girth > $rule['max_girth']) return false;
        }
        
        return true;
    }
    
    /**
     * 燃油サーチャージ取得
     */
    private function getSurchargeRate($serviceId) {
        $sql = "
            SELECT rate FROM surcharges 
            WHERE service_id = ? 
            AND effective_date <= CURRENT_DATE 
            ORDER BY effective_date DESC 
            LIMIT 1
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$serviceId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result ? (float)$result['rate'] : 0.0;
    }
    
    /**
     * オプションランキング（多次元スコアリング）
     */
    private function rankOptions($options, $params) {
        $preference = $params['preference'] ?? 'balanced';
        
        // 価格・速度の最小・最大値取得
        $prices = array_column($options, 'cost_jpy');
        $speeds = array_column($options, 'delivery_days');
        
        $minPrice = min($prices);
        $maxPrice = max($prices);
        $minSpeed = min($speeds);
        $maxSpeed = max($speeds);
        
        // 各オプションにスコア追加
        foreach ($options as &$option) {
            // 価格スコア（安いほど高得点）
            $priceScore = $maxPrice > $minPrice ? 
                (($maxPrice - $option['cost_jpy']) / ($maxPrice - $minPrice)) * 100 : 50;
            
            // 速度スコア（速いほど高得点）
            $speedScore = $maxSpeed > $minSpeed ? 
                (($maxSpeed - $option['delivery_days']) / ($maxSpeed - $minSpeed)) * 100 : 50;
            
            // 信頼性スコア
            $reliabilityScore = 50;
            if ($option['tracking']) $reliabilityScore += 20;
            if ($option['insurance']) $reliabilityScore += 20;
            if ($option['size_ok']) $reliabilityScore += 10;
            
            // タイプ別重み調整
            $typeBonus = 0;
            if ($preference === 'economy' && $option['type'] === 'economy') {
                $typeBonus = 15;
            } elseif ($preference === 'courier' && $option['type'] === 'courier') {
                $typeBonus = 15;
            }
            
            // 総合スコア計算
            $totalScore = ($priceScore * 0.4) + ($speedScore * 0.3) + ($reliabilityScore * 0.2) + $typeBonus + (random_int(-5, 5));
            
            $option['scores'] = [
                'price_score' => round($priceScore, 1),
                'speed_score' => round($speedScore, 1),
                'reliability_score' => round($reliabilityScore, 1),
                'type_bonus' => $typeBonus,
                'total_score' => round($totalScore, 1)
            ];
            
            $option['recommended'] = false;
        }
        
        // スコア順ソート
        usort($options, function($a, $b) {
            return $b['scores']['total_score'] <=> $a['scores']['total_score'];
        });
        
        // トップを推奨に設定
        if (!empty($options)) {
            $options[0]['recommended'] = true;
        }
        
        return $options;
    }
    
    /**
     * 計算結果保存
     */
    private function saveCalculation($uuid, $params, $packedDimensions, $results) {
        $sql = "
            INSERT INTO shipping_calculations (
                calculation_uuid, destination_country, original_weight, packed_weight,
                original_length, original_width, original_height,
                packed_length, packed_width, packed_height,
                user_preference, calculation_results, selected_service_id, 
                selected_price, selected_currency
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $dimensions = $params['dimensions'] ?? [];
        $packedDims = $packedDimensions['dimensions'];
        $topResult = $results[0] ?? null;
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $uuid,
            $params['destination'],
            $params['weight'],
            $packedDimensions['weight'],
            $dimensions['length'] ?? null,
            $dimensions['width'] ?? null,
            $dimensions['height'] ?? null,
            $packedDims['length'] ?? null,
            $packedDims['width'] ?? null,
            $packedDims['height'] ?? null,
            $params['preference'] ?? 'balanced',
            json_encode($results, JSON_UNESCAPED_UNICODE),
            $topResult['service_id'] ?? null,
            $topResult['cost_jpy'] ?? null,
            'JPY'
        ]);
    }
    
    /**
     * UUID生成
     */
    private function generateUuid() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}
?>