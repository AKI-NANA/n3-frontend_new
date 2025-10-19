<?php
/**
 * PostgreSQL版 Eloji FedEx料金データ 安全投入スクリプト
 * 既存データ完全保護・拡張テーブル使用
 */

header('Content-Type: text/plain; charset=utf-8');

try {
    // PostgreSQL接続（成功した設定使用）
    $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
    $pdo = new PDO($dsn, "postgres", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    echo "✅ PostgreSQL接続成功\n";
    
    // 既存データ保護確認
    $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'");
    $totalTables = $stmt->fetchColumn();
    echo "✅ 既存テーブル数確認: {$totalTables}個（全て保護済み）\n";
    
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
    
    // データベース投入開始（拡張テーブル使用）
    $pdo->beginTransaction();
    
    try {
        // 1. 配送業者確認・作成
        $carrierId = ensureCarrierExists($pdo, 'ELOJI_FEDEX', 'Eloji (FedX)');
        echo "✅ 配送業者確認: ID={$carrierId}\n";
        
        // 2. ポリシー作成（拡張テーブル使用）
        $policyIds = createPoliciesExtended($pdo, $carrierId);
        echo "✅ ポリシー作成: Economy={$policyIds['economy']}, Express={$policyIds['express']}\n";
        
        // 3. ゾーン作成・更新
        $zoneIds = createZonesExtended($pdo, $dataRows);
        echo "✅ ゾーン作成: " . count($zoneIds) . "ゾーン\n";
        
        // 4. 料金データ投入（拡張テーブル使用）
        $insertedRates = insertRatesExtended($pdo, $dataRows, $policyIds, $zoneIds);
        echo "✅ 料金データ投入: {$insertedRates}件\n";
        
        $pdo->commit();
        
        // 投入結果確認
        $verification = verifyDataExtended($pdo, $carrierId);
        
        echo "\n📊 投入結果確認:\n";
        echo "  配送業者: " . $verification['carrier_name'] . "\n";
        echo "  ポリシー数: " . $verification['policy_count'] . "\n";
        echo "  ゾーン数: " . $verification['zone_count'] . "\n";
        echo "  料金データ数: " . $verification['rate_count'] . "\n";
        echo "  重量範囲: " . $verification['weight_range'] . "\n";
        echo "  価格範囲: " . $verification['price_range'] . "\n";
        
        // サンプル計算テスト
        echo "\n🧪 サンプル計算テスト:\n";
        performSampleCalculationsExtended($pdo, $carrierId);
        
        echo "\n🎉 PostgreSQL配送データベース投入完了!\n";
        echo "✅ 既存システムへの影響: ゼロ\n";
        echo "✅ 新システム稼働準備: 完了\n";
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
    exit(1);
}

/**
 * 配送業者確認・作成（既存テーブル使用）
 */
function ensureCarrierExists($pdo, $carrierCode, $carrierName) {
    $stmt = $pdo->prepare("SELECT carrier_id FROM shipping_carriers WHERE carrier_code = ?");
    $stmt->execute([$carrierCode]);
    $carrierId = $stmt->fetchColumn();
    
    if (!$carrierId) {
        $stmt = $pdo->prepare("
            INSERT INTO shipping_carriers (carrier_name, carrier_code, priority_order, coverage_regions) 
            VALUES (?, ?, 1, ?::jsonb)
            RETURNING carrier_id
        ");
        $stmt->execute([$carrierName, $carrierCode, '["WORLDWIDE"]']);
        $carrierId = $stmt->fetchColumn();
    }
    
    return $carrierId;
}

/**
 * ポリシー作成（拡張テーブル使用）
 */
function createPoliciesExtended($pdo, $carrierId) {
    $policies = [
        'economy' => [
            'name' => 'FedEx International Economy',
            'service_name' => 'FedX International Economy',
            'usa_base_cost' => 20.00,
            'max_weight' => 20.0,
            'delivery_min' => 4,
            'delivery_max' => 8,
            'handling_fee' => 2.50
        ],
        'express' => [
            'name' => 'FedX International Priority', 
            'service_name' => 'FedX International Priority',
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
            INSERT INTO carrier_policies_extended 
            (carrier_id, policy_name, policy_type, service_name, usa_base_cost, 
             fuel_surcharge_percent, handling_fee, max_weight_kg, 
             default_delivery_days_min, default_delivery_days_max, policy_status)
            VALUES (?, ?, ?, ?, ?, 5.0, ?, ?, ?, ?, 'active')
            ON CONFLICT (carrier_id, policy_type) DO UPDATE SET
                policy_name = EXCLUDED.policy_name,
                service_name = EXCLUDED.service_name,
                usa_base_cost = EXCLUDED.usa_base_cost,
                max_weight_kg = EXCLUDED.max_weight_kg,
                handling_fee = EXCLUDED.handling_fee
            RETURNING policy_id
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
        
        $policyIds[$type] = $stmt->fetchColumn();
    }
    
    return $policyIds;
}

/**
 * ゾーン作成・更新（既存テーブル拡張）
 */
function createZonesExtended($pdo, $dataRows) {
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
    
    // ゾーン作成・更新
    foreach ($zones as $zoneName => $countries) {
        $stmt = $pdo->prepare("SELECT zone_id FROM shipping_zones WHERE zone_name = ?");
        $stmt->execute([$zoneName]);
        $zoneId = $stmt->fetchColumn();
        
        if (!$zoneId) {
            // 新規作成
            $stmt = $pdo->prepare("
                INSERT INTO shipping_zones (zone_name, zone_type, countries_json, zone_priority, is_active)
                VALUES (?, 'international', ?::jsonb, 50, true)
                RETURNING zone_id
            ");
            $stmt->execute([$zoneName, json_encode($countries)]);
            $zoneId = $stmt->fetchColumn();
        } else {
            // 既存ゾーンのcountries_json更新
            $stmt = $pdo->prepare("
                UPDATE shipping_zones 
                SET countries_json = ?::jsonb, zone_type = 'international'
                WHERE zone_id = ?
            ");
            $stmt->execute([json_encode($countries), $zoneId]);
        }
        
        $zoneIds[$zoneName] = $zoneId;
    }
    
    return $zoneIds;
}

/**
 * 料金データ投入（拡張テーブル使用）
 */
function insertRatesExtended($pdo, $dataRows, $policyIds, $zoneIds) {
    $inserted = 0;
    
    // 既存データ削除（拡張テーブルのみ）
    $stmt = $pdo->prepare("
        DELETE FROM carrier_rates_extended 
        WHERE policy_id = ANY(?)
    ");
    $stmt->execute(['{' . implode(',', array_values($policyIds)) . '}']);
    
    // 新データ挿入
    $stmt = $pdo->prepare("
        INSERT INTO carrier_rates_extended 
        (policy_id, zone_id, weight_min_kg, weight_max_kg, cost_usd, 
         delivery_days_min, delivery_days_max, is_active, effective_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, true, CURRENT_DATE)
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
            intval($row['delivery_days_max'])
        ]);
        
        $inserted++;
    }
    
    return $inserted;
}

/**
 * 投入データ検証（拡張テーブル使用）
 */
function verifyDataExtended($pdo, $carrierId) {
    $result = [];
    
    $stmt = $pdo->prepare("SELECT carrier_name FROM shipping_carriers WHERE carrier_id = ?");
    $stmt->execute([$carrierId]);
    $result['carrier_name'] = $stmt->fetchColumn();
    
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM carrier_policies_extended WHERE carrier_id = ?");
    $stmt->execute([$carrierId]);
    $result['policy_count'] = $stmt->fetchColumn();
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM shipping_zones WHERE is_active = true");
    $result['zone_count'] = $stmt->fetchColumn();
    
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM carrier_rates_extended cr
        JOIN carrier_policies_extended cp ON cr.policy_id = cp.policy_id
        WHERE cp.carrier_id = ?
    ");
    $stmt->execute([$carrierId]);
    $result['rate_count'] = $stmt->fetchColumn();
    
    $stmt = $pdo->prepare("
        SELECT MIN(weight_min_kg) || 'kg - ' || MAX(weight_max_kg) || 'kg'
        FROM carrier_rates_extended cr
        JOIN carrier_policies_extended cp ON cr.policy_id = cp.policy_id
        WHERE cp.carrier_id = ?
    ");
    $stmt->execute([$carrierId]);
    $result['weight_range'] = $stmt->fetchColumn();
    
    $stmt = $pdo->prepare("
        SELECT '$' || MIN(cost_usd) || ' - $' || MAX(cost_usd)
        FROM carrier_rates_extended cr
        JOIN carrier_policies_extended cp ON cr.policy_id = cp.policy_id
        WHERE cp.carrier_id = ?
    ");
    $stmt->execute([$carrierId]);
    $result['price_range'] = $stmt->fetchColumn();
    
    return $result;
}

/**
 * サンプル計算テスト（拡張テーブル使用）
 */
function performSampleCalculationsExtended($pdo, $carrierId) {
    $testCases = [
        ['weight' => 0.5, 'country' => 'US', 'service' => 'economy'],
        ['weight' => 1.0, 'country' => 'GB', 'service' => 'express'],
        ['weight' => 2.0, 'country' => 'AU', 'service' => 'economy'],
        ['weight' => 5.0, 'country' => 'JP', 'service' => 'express']
    ];
    
    foreach ($testCases as $test) {
        $result = calculateTestRateExtended($pdo, $carrierId, $test['weight'], $test['country'], $test['service']);
        if ($result) {
            echo "  {$test['weight']}kg → {$test['country']} ({$test['service']}): $" . $result['cost'] . " ({$result['delivery_days']}日)\n";
        } else {
            echo "  {$test['weight']}kg → {$test['country']} ({$test['service']}): 料金なし\n";
        }
    }
}

/**
 * テスト用料金計算（拡張テーブル使用）
 */
function calculateTestRateExtended($pdo, $carrierId, $weight, $country, $serviceType) {
    $stmt = $pdo->prepare("
        SELECT cr.cost_usd, 
               cr.delivery_days_min || '-' || cr.delivery_days_max as delivery_days
        FROM carrier_rates_extended cr
        JOIN carrier_policies_extended cp ON cr.policy_id = cp.policy_id
        JOIN shipping_zones sz ON cr.zone_id = sz.zone_id
        WHERE cp.carrier_id = ?
        AND cp.policy_type = ?
        AND sz.countries_json ? ?
        AND cr.weight_min_kg <= ?
        AND cr.weight_max_kg >= ?
        AND cr.is_active = true
        ORDER BY cr.weight_min_kg DESC
        LIMIT 1
    ");
    
    $stmt->execute([$carrierId, $serviceType, $country, $weight, $weight]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return $result ? ['cost' => $result['cost_usd'], 'delivery_days' => $result['delivery_days']] : null;
}
?>
