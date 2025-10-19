<?php
/**
 * FedXゾーン比較 & データベース確認システム
 * PDFゾーン vs 現在のデータベース詳細比較
 */

header('Content-Type: text/plain; charset=utf-8');

try {
    // PostgreSQL接続
    $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
    $pdo = new PDO($dsn, "postgres", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    echo "🔍 FedXゾーン比較 & データベース確認システム\n";
    echo str_repeat("=", 80) . "\n\n";
    
    // PDFから抽出した正確なFedXゾーン定義
    $pdfZones = [
        'A' => ['name' => '中国マカオ', 'countries' => ['CN', 'MO']],
        'D' => ['name' => 'ポリネシア', 'countries' => ['PF', 'WS', 'TO', 'FJ']],
        'E' => ['name' => '米国(一部)', 'countries' => ['US']],
        'F' => ['name' => '北米', 'countries' => ['US', 'CA']],
        'G' => ['name' => '中南米', 'countries' => ['MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE']],
        'H' => ['name' => 'ヨーロッパ', 'countries' => ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE']],
        'I' => ['name' => 'ヨーロッパ', 'countries' => ['AT', 'CH', 'SE', 'NO', 'DK', 'FI']],
        'J' => ['name' => '中東', 'countries' => ['AE', 'SA', 'IL', 'JO', 'KW', 'QA']],
        'K' => ['name' => '中国南部', 'countries' => ['CN']],
        'M' => ['name' => 'ヨーロッパ', 'countries' => ['PT', 'IE', 'GR']],
        'N' => ['name' => 'ベトナム', 'countries' => ['VN']],
        'O' => ['name' => 'インド', 'countries' => ['IN']],
        'Q' => ['name' => 'マレーシア', 'countries' => ['MY']],
        'R' => ['name' => 'タイ', 'countries' => ['TH']],
        'S' => ['name' => 'フィリピン', 'countries' => ['PH']],
        'T' => ['name' => 'インドネシア', 'countries' => ['ID']],
        'U' => ['name' => 'オーストラリア', 'countries' => ['AU', 'NZ']],
        'V' => ['name' => '香港', 'countries' => ['HK']],
        'W' => ['name' => '中国（南部以外）', 'countries' => ['CN']],
        'X' => ['name' => '台湾', 'countries' => ['TW']],
        'Y' => ['name' => 'シンガポール', 'countries' => ['SG']],
        'Z' => ['name' => '韓国', 'countries' => ['KR']]
    ];
    
    // 現在のデータベースのゾーン取得
    echo "📋 現在のデータベースゾーン:\n";
    echo str_repeat("-", 40) . "\n";
    $stmt = $pdo->query("
        SELECT zone_id, zone_name, countries_json 
        FROM shipping_zones 
        WHERE countries_json IS NOT NULL 
        ORDER BY zone_name
    ");
    $dbZones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($dbZones as $zone) {
        $countries = json_decode($zone['countries_json'], true);
        echo sprintf("  %s: %s\n", 
            str_pad($zone['zone_name'], 20), 
            implode(', ', $countries)
        );
    }
    
    echo "\n📋 PDFの正確なFedXゾーン:\n";
    echo str_repeat("-", 40) . "\n";
    foreach ($pdfZones as $zoneCode => $zone) {
        echo sprintf("  Zone %s (%s): %s\n", 
            $zoneCode, 
            str_pad($zone['name'], 15), 
            implode(', ', $zone['countries'])
        );
    }
    
    // ゾーン比較分析
    echo "\n🔍 ゾーン比較分析:\n";
    echo str_repeat("-", 40) . "\n";
    
    // 簡略化された現在のゾーン vs PDFの詳細ゾーン
    echo "現在のシステム: 6つの統合ゾーン（効率重視）\n";
    echo "PDFのFedX: 22の詳細ゾーン（正確な料金区分）\n\n";
    
    echo "主な違い:\n";
    echo "  • 現在: アジアを3つに統合 (East Asia, Asia Pacific, Middle East/Africa)\n";
    echo "  • PDF: アジアを11ゾーンに細分化 (A,K,N,O,Q,R,S,T,U,V,W,X,Y,Z)\n";
    echo "  • 現在: ヨーロッパを1つに統合\n";
    echo "  • PDF: ヨーロッパを3ゾーンに分割 (H,I,M)\n\n";
    
    // 全料金データ詳細表示
    echo "📊 現在のデータベース全料金データ:\n";
    echo str_repeat("=", 80) . "\n";
    
    $stmt = $pdo->prepare("
        SELECT 
            sz.zone_name,
            cp.policy_type,
            cr.weight_min_kg,
            cr.weight_max_kg,
            cr.cost_usd,
            cr.delivery_days_min,
            cr.delivery_days_max
        FROM carrier_rates_extended cr
        JOIN carrier_policies_extended cp ON cr.policy_id = cp.policy_id
        JOIN shipping_zones sz ON cr.zone_id = sz.zone_id
        WHERE cp.carrier_id = (SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'ELOJI_FEDEX')
        ORDER BY sz.zone_name, cp.policy_type, cr.weight_min_kg
    ");
    $stmt->execute();
    $allRates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // ゾーン別・サービス別にグループ化
    $groupedRates = [];
    foreach ($allRates as $rate) {
        $key = $rate['zone_name'] . '|' . $rate['policy_type'];
        if (!isset($groupedRates[$key])) {
            $groupedRates[$key] = [];
        }
        $groupedRates[$key][] = $rate;
    }
    
    foreach ($groupedRates as $key => $rates) {
        list($zoneName, $policyType) = explode('|', $key);
        echo "\n🌍 {$zoneName} - " . ucfirst($policyType) . " (" . count($rates) . "料金設定)\n";
        echo str_repeat("-", 60) . "\n";
        echo "重量範囲        料金(USD)    配送日数\n";
        echo str_repeat("-", 60) . "\n";
        
        foreach ($rates as $rate) {
            echo sprintf("%s - %skg    $%-8s  %s-%s日\n",
                str_pad($rate['weight_min_kg'], 4, ' ', STR_PAD_LEFT),
                str_pad($rate['weight_max_kg'], 4, ' ', STR_PAD_LEFT),
                number_format($rate['cost_usd'], 2),
                $rate['delivery_days_min'],
                $rate['delivery_days_max']
            );
        }
    }
    
    // CSV出力機能
    echo "\n\n💾 CSV出力ファイル生成中...\n";
    generateCSVExports($pdo);
    
    echo "\n🎯 推奨事項:\n";
    echo str_repeat("-", 40) . "\n";
    echo "1. 現在の6ゾーンシステムは実用的で効率的\n";
    echo "2. より正確な料金が必要な場合はPDFの22ゾーン実装を検討\n";
    echo "3. 生成されたCSVファイルでデータ詳細確認可能\n";
    echo "4. UIダッシュボードの作成を推奨\n\n";
    
} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
}

/**
 * CSV出力ファイル生成
 */
function generateCSVExports($pdo) {
    $outputDir = __DIR__ . '/csv_exports/';
    if (!is_dir($outputDir)) {
        mkdir($outputDir, 0755, true);
    }
    
    // 全料金データCSV出力
    $stmt = $pdo->query("
        SELECT 
            sc.carrier_name,
            cp.policy_type as service_type,
            cp.policy_name as service_name,
            sz.zone_name,
            sz.countries_json,
            cr.weight_min_kg,
            cr.weight_max_kg,
            cr.cost_usd,
            cr.delivery_days_min,
            cr.delivery_days_max,
            cr.effective_date,
            cr.is_active
        FROM carrier_rates_extended cr
        JOIN carrier_policies_extended cp ON cr.policy_id = cp.policy_id
        JOIN shipping_carriers sc ON cp.carrier_id = sc.carrier_id
        JOIN shipping_zones sz ON cr.zone_id = sz.zone_id
        ORDER BY sz.zone_name, cp.policy_type, cr.weight_min_kg
    ");
    $allData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 全データCSV
    $csvContent = "carrier_name,service_type,service_name,zone_name,countries,weight_min_kg,weight_max_kg,cost_usd,delivery_days_min,delivery_days_max,effective_date,is_active\n";
    foreach ($allData as $row) {
        $countries = json_decode($row['countries_json'], true);
        $csvContent .= sprintf("%s,%s,%s,%s,\"%s\",%s,%s,%s,%s,%s,%s,%s\n",
            $row['carrier_name'],
            $row['service_type'],
            $row['service_name'],
            $row['zone_name'],
            implode(';', $countries),
            $row['weight_min_kg'],
            $row['weight_max_kg'],
            $row['cost_usd'],
            $row['delivery_days_min'],
            $row['delivery_days_max'],
            $row['effective_date'],
            $row['is_active'] ? 'true' : 'false'
        );
    }
    
    $filename = $outputDir . 'fedex_all_rates_' . date('Y-m-d_H-i-s') . '.csv';
    file_put_contents($filename, $csvContent);
    echo "✅ 全料金データCSV: " . basename($filename) . "\n";
    
    // サービス別CSV
    foreach (['economy', 'express'] as $serviceType) {
        $serviceData = array_filter($allData, function($row) use ($serviceType) {
            return $row['service_type'] === $serviceType;
        });
        
        $serviceCsv = "zone_name,countries,weight_min_kg,weight_max_kg,cost_usd,delivery_days\n";
        foreach ($serviceData as $row) {
            $countries = json_decode($row['countries_json'], true);
            $serviceCsv .= sprintf("%s,\"%s\",%s,%s,%s,%s-%s\n",
                $row['zone_name'],
                implode(';', $countries),
                $row['weight_min_kg'],
                $row['weight_max_kg'],
                $row['cost_usd'],
                $row['delivery_days_min'],
                $row['delivery_days_max']
            );
        }
        
        $serviceFilename = $outputDir . 'fedex_' . $serviceType . '_rates_' . date('Y-m-d_H-i-s') . '.csv';
        file_put_contents($serviceFilename, $serviceCsv);
        echo "✅ " . ucfirst($serviceType) . "料金CSV: " . basename($serviceFilename) . "\n";
    }
    
    echo "📁 CSV出力先: " . realpath($outputDir) . "\n";
}
?>
