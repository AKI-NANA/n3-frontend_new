<?php
/**
 * Eloji FedEx料金データ データベース投入スクリプト（完全版）
 */

header('Content-Type: text/plain; charset=utf-8');

try {
    // データベース接続
    $pdo = new PDO(
        "mysql:host=localhost;dbname=nagano3_db;charset=utf8mb4",
        "your_username", 
        "your_password",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    echo "✅ データベース接続成功\n";
    
    // CSVファイル読み込み
    $csvFile = __DIR__ . '/eloji_fedex_verified_rates.csv';
    
    if (!file_exists($csvFile)) {
        throw new Exception("CSVファイルが見つかりません: " . $csvFile);
    }
    
    echo "✅ CSVファイル確認: " . basename($csvFile) . "\n";
    
    // CSV解析
    $handle = fopen($csvFile, 'r');
    $header = fgetcsv($handle);
    
    echo "📋 CSVヘッダー: " . implode(', ', $header) . "\n";
    
    $dataRows = [];
    $lineNumber = 2;
    
    while (($row = fgetcsv($handle)) !== FALSE) {
        if (count($row) === count($header)) {
            $rowData = array_combine($header, $row);
            $dataRows[] = $rowData;
        } else {
            echo "⚠️ 行{$lineNumber}: カラム数不一致\n";
        }
        $lineNumber++;
    }
    
    fclose($handle);
    
    echo "📊 読み込み完了: " . count($dataRows) . "行\n";
    
    // データ検証
    $validationResults = validateCSVData($dataRows);
    
    if (!$validationResults['valid']) {
        echo "❌ データ検証エラー:\n";
        foreach ($validationResults['errors'] as $error) {
            echo "  - " . $error . "\n";
        }
        exit(1);
    }
    
    echo "✅ データ検証完了: " . $validationResults['total_rows'] . "行\n";
    
    // データベース投入開始
    $pdo->beginTransaction();
    
    try {
        // 1. 配送業者確認・作成
        $carrierId = ensureCarrierExists($pdo, 'ELOJI_FEDEX', 'Eloji (FedEx)');
        echo "✅ 配送業者確認: ID={$carrierId}\n";
        
        // 2. ポリシー作成
        $policyIds = createPolicies($pdo, $carrierId);
        echo "✅ ポリシー作成: Economy={$policyIds['economy']}, Express={$policyIds['express']}\n";
        
        // 3. ゾーン作成
        $zoneIds = createZones($pdo, $dataRows);
        echo "✅ ゾーン作成: " . count($zoneIds) . "ゾーン\n";
        
        // 4. 料金データ投入
        $insertedRates = insertRates($pdo, $dataRows, $policyIds, $zoneIds);
        echo "✅ 料金データ投入: {$insertedRates}件\n";
        
        $pdo->commit();
        
        // 投入結果確認
        $verification = verifyData($pdo, $carrierId);
        
        echo "\n📊 投入結果確認:\n";
        echo "  配送業者: " . $verification['carrier_name'] . "\n";
        echo "  ポリシー数: " . $verification['policy_count'] . "\n";
        echo "  ゾーン数: " . $verification['zone_count'] . "\n";
        echo "  料金データ数: " . $verification['rate_count'] . "\n";
        echo "  重量範囲: " . $verification['weight_range'] . "\n";
        echo "  価格範囲: " . $verification['price_range'] . "\n";
        
        // サンプル計算テスト
        echo "\n🧪 サンプル計算テスト:\n";
        performSampleCalculations($pdo, $carrierId);
        
        echo "\n🎉 データベース投入完了!\n";
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
    exit(1);
}

/**
 * CSV データ検証
 */
function validateCSVData($dataRows) {
    $errors = [];
    $requiredFields = ['carrier_code', 'service_type', 'zone_name', 'weight_min_kg', 'weight_max_kg', 'cost_usd'];
    
    foreach ($dataRows as $i => $row) {
        $lineNum = $i + 2;
        
        // 必須フィールドチェック
        foreach ($requiredFields as $field) {
            if (empty($row[$field])) {
                $errors[] = "行{$lineNum}: {$field} が空です";
            }
        }
        
        // データ型チェック
        if (!empty($row['weight_min_kg']) && !is_numeric($row['weight_min_kg'])) {
            $errors[] = "行{$lineNum}: weight_min_kg が数値ではありません";
        }
        
        if (!empty($row['weight_max_kg']) && !is_numeric($row['weight_max_kg'])) {
            $errors[] = "行{$lineNum}: weight_max_kg が数値ではありません";
        }
        
        if (!empty($row['cost_usd']) && !is_numeric($row['cost_usd'])) {
            $errors[] = "行{$lineNum}: cost_usd が数値ではありません";
        }
        
        // 重量範囲チェック
        if (!empty($row['weight_min_kg']) && !empty($row['weight_max_kg'])) {
            if (floatval($row['weight_min_kg']) > floatval($row['weight_max_kg'])) {
                $errors[] = "行{$lineNum}: weight_min_kg > weight_max_kg";
            }
        }
        
        // サービスタイプチェック
        if (!empty($row['service_type']) && !in_array($row['service_type'], ['economy', 'express'])) {
            $errors[] = "行{$lineNum}: service_type が無効です";
        }
    }
    
    return [
        'valid' => empty($errors),
        'errors' => $errors,
        'total_rows' => count($dataRows)
    ];
}

/**
 * 配送業者確認・作成
 */
function ensureCarrierExists($pdo, $carrierCode, $carrierName) {
    $stmt = $pdo->prepare("SELECT carrier_id FROM shipping_carriers WHERE carrier_code = ?");
    $stmt->execute([$carrierCode]);
    $carrierId = $stmt->fetchColumn();
    
    if (!$carrierId) {
        $stmt = $pdo->prepare("
            INSERT INTO shipping_carriers (carrier_name, carrier_code, priority_order, coverage_regions) 
            VALUES (?, ?, 1, '[\"WORLDWIDE\"]')
        ");
        $stmt->execute([$carrierName, $carrierCode]);
        $carrierId = $pdo->lastInsertId();
    }
    
    return $carrierId;
}

/**
 * ポリシー作成
 */
function createPolicies($pdo, $carrierId) {
    $policies = [
        'economy' => [
            'name' => 'FedEx International Economy',
            'service_name' => 'FedEx International Economy',
            'usa_base_cost' => 20.00,
            'max_weight' => 20.0,
            'delivery_min' => 4,
            'delivery_max' => 8,
            'handling_fee' => 2.50
        ],
        'express' => [
            'name' => 'FedEx International Priority', 
            'service_name' => 'FedEx International Priority',
            'usa_base_cost' => 18.00,
            'max_weight' => 30.0,
            'delivery_min' => 1,
            'delivery_max' => 3,
            'handling_fee' => 3.50
        ]
    ];
    
    $policyIds = [];
    
    foreach ($policies as $type => $policy) {
        $stmt = $pdo->prepare("
            INSERT INTO carrier_policies 
            (carrier_id, policy_name, policy_type, service_name, usa_base_cost, 
             fuel_surcharge_percent, handling_fee, max_weight_kg, 
             default_delivery_days_min, default_delivery_days_max, policy_status)
            VALUES (?, ?, ?, ?, ?, 5.0, ?, ?, ?, ?, 'active')
            ON DUPLICATE KEY UPDATE
            policy_name = VALUES(policy_name),
            service_name = VALUES(service_name),
            usa_base_cost = VALUES(usa_base_cost),
            max_weight_kg = VALUES(max_weight_kg),
            handling_fee = VALUES(handling_fee)
        ");
        
        $stmt->execute([
            $carrierId,
            $policy['name'],
            $type,
            $policy['service_name'],
            $policy['usa_base_cost'],
            $policy['handling_fee'],
            $policy['max_weight'],
            $policy['delivery_min'],
            $policy['delivery_max']
        ]);
        
        // ポリシーID取得
        $stmt = $pdo->prepare("SELECT policy_id FROM carrier_policies WHERE carrier_id = ? AND policy_type = ?");
        $stmt->execute([$carrierId, $type]);
        $policyIds[$type] = $stmt->fetchColumn();
    }
    
    return $policyIds;
}

/**
 * ゾーン作成
 */
function createZones($pdo, $dataRows) {
    $zones = [];
    $zoneIds = [];
    
    // ユニークなゾーン抽出
    foreach ($dataRows as $row) {
        $zoneName = $row['zone_name'];
        $countries = trim($row['country_codes'], '"');
        
        if (!isset($zones[$zoneName])) {
            $zones[$zoneName] = explode(',', $countries);
        }
    }
    
    // ゾーン作成
    foreach ($zones as $zoneName => $countries) {
        $stmt = $pdo->prepare("SELECT zone_id FROM shipping_zones WHERE zone_name = ?");
        $stmt->execute([$zoneName]);
        $zoneId = $stmt->fetchColumn();
        
        if (!$zoneId) {
            $stmt = $pdo->prepare("
                INSERT INTO shipping_zones (zone_name, zone_type, countries_json, zone_priority, is_active)
                VALUES (?, 'international', ?, 50, 1)
            ");
            $stmt->execute([$zoneName, json_encode($countries)]);
            $zoneId = $pdo->lastInsertId();
        }
        
        $zoneIds[$zoneName] = $zoneId;
    }
    
    return $zoneIds;
}

/**
 * 料金データ投入
 */
function insertRates($pdo, $dataRows, $policyIds, $zoneIds) {
    $inserted = 0;
    
    // 既存データ削除
    $stmt = $pdo->prepare("
        DELETE cr FROM carrier_rates cr
        JOIN carrier_policies cp ON cr.policy_id = cp.policy_id
        WHERE cp.carrier_id = (
            SELECT carrier_id FROM carrier_policies WHERE policy_id = ?
        )
    ");
    $stmt->execute([$policyIds['economy']]);
    
    // 新データ挿入
    $stmt = $pdo->prepare("
        INSERT INTO carrier_rates 
        (policy_id, zone_id, weight_min_kg, weight_max_kg, cost_usd, 
         delivery_days_min, delivery_days_max, fuel_surcharge_percent, 
         handling_fee, is_active, effective_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_DATE)
    ");
    
    foreach ($dataRows as $row) {
        $serviceType = $row['service_type'];
        $zoneName = $row['zone_name'];
        
        if (!isset($policyIds[$serviceType]) || !isset($zoneIds[$zoneName])) {
            continue;
        }
        
        $stmt->execute([
            $policyIds[$serviceType],
            $zoneIds[$zoneName],
            floatval($row['weight_min_kg']),
            floatval($row['weight_max_kg']),
            floatval($row['cost_usd']),
            intval($row['delivery_days_min']),
            intval($row['delivery_days_max']),
            floatval($row['fuel_surcharge_percent']),
            floatval($row['handling_fee'])
        ]);
        
        $inserted++;
    }
    
    return $inserted;
}

/**
 * 投入データ検証
 */
function verifyData($pdo, $carrierId) {
    $result = [];
    
    // 配送業者名
    $stmt = $pdo->prepare("SELECT carrier_name FROM shipping_carriers WHERE carrier_id = ?");
    $stmt->execute([$carrierId]);
    $result['carrier_name'] = $stmt->fetchColumn();
    
    // ポリシー数
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM carrier_policies WHERE carrier_id = ?");
    $stmt->execute([$carrierId]);
    $result['policy_count'] = $stmt->fetchColumn();
    
    // ゾーン数
    $stmt = $pdo->query("SELECT COUNT(*) FROM shipping_zones WHERE is_active = 1");
    $result['zone_count'] = $stmt->fetchColumn();
    
    // 料金データ数
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM carrier_rates cr
        JOIN carrier_policies cp ON cr.policy_id = cp.policy_id
        WHERE cp.carrier_id = ?
    ");
    $stmt->execute([$carrierId]);
    $result['rate_count'] = $stmt->fetchColumn();
    
    // 重量範囲
    $stmt = $pdo->prepare("
        SELECT CONCAT(MIN(weight_min_kg), 'kg - ', MAX(weight_max_kg), 'kg') 
        FROM carrier_rates cr
        JOIN carrier_policies cp ON cr.policy_id = cp.policy_id
        WHERE cp.carrier_id = ?
    ");
    $stmt->execute([$carrierId]);
    $result['weight_range'] = $stmt->fetchColumn();
    
    // 価格範囲
    $stmt = $pdo->prepare("
        SELECT CONCAT('$', MIN(cost_usd), ' - $', MAX(cost_usd))
        FROM carrier_rates cr
        JOIN carrier_policies cp ON cr.policy_id = cp.policy_id
        WHERE cp.carrier_id = ?
    ");
    $stmt->execute([$carrierId]);
    $result['price_range'] = $stmt->fetchColumn();
    
    return $result;
}

/**
 * サンプル計算テスト
 */
function performSampleCalculations($pdo, $carrierId) {
    $testCases = [
        ['weight' => 0.5, 'country' => 'US', 'service' => 'economy'],
        ['weight' => 1.0, 'country' => 'GB', 'service' => 'express'],
        ['weight' => 2.0, 'country' => 'AU', 'service' => 'economy'],
        ['weight' => 5.0, 'country' => 'JP', 'service' => 'express']
    ];
    
    foreach ($testCases as $test) {
        $result = calculateTestRate($pdo, $carrierId, $test['weight'], $test['country'], $test['service']);
        if ($result) {
            echo "  {$test['weight']}kg → {$test['country']} ({$test['service']}): $" . $result['cost'] . " ({$result['delivery_days']}日)\n";
        } else {
            echo "  {$test['weight']}kg → {$test['country']} ({$test['service']}): 料金なし\n";
        }
    }
}

/**
 * テスト用料金計算
 */
function calculateTestRate($pdo, $carrierId, $weight, $country, $serviceType) {
    $stmt = $pdo->prepare("
        SELECT cr.cost_usd, 
               CONCAT(cr.delivery_days_min, '-', cr.delivery_days_max) as delivery_days
        FROM carrier_rates cr
        JOIN carrier_policies cp ON cr.policy_id = cp.policy_id
        JOIN shipping_zones sz ON cr.zone_id = sz.zone_id
        WHERE cp.carrier_id = ?
        AND cp.policy_type = ?
        AND JSON_CONTAINS(sz.countries_json, ?)
        AND cr.weight_min_kg <= ?
        AND cr.weight_max_kg >= ?
        AND cr.is_active = 1
        ORDER BY cr.weight_min_kg DESC
        LIMIT 1
    ");
    
    $stmt->execute([$carrierId, $serviceType, '"' . $country . '"', $weight, $weight]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return $result ? ['cost' => $result['cost_usd'], 'delivery_days' => $result['delivery_days']] : null;
}
?>
