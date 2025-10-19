<?php
/**
 * データベース現状確認・データ抽出スクリプト
 * 既存データの詳細確認とGemini引き継ぎ用データ準備
 */

header('Content-Type: text/plain; charset=utf-8');

try {
    // PostgreSQL接続
    $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
    $pdo = new PDO($dsn, "postgres", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    echo "📊 データベース現状確認・データ抽出レポート\n";
    echo str_repeat("=", 80) . "\n\n";
    
    // 1. 全テーブル一覧
    echo "📋 1. 全テーブル一覧:\n";
    echo str_repeat("-", 40) . "\n";
    $stmt = $pdo->query("
        SELECT tablename, schemaname 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
    ");
    $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($tables as $table) {
        echo "  - {$table['tablename']}\n";
    }
    echo "\n総テーブル数: " . count($tables) . "\n\n";
    
    // 2. 配送関連テーブルの詳細確認
    echo "🚚 2. 配送関連テーブル詳細:\n";
    echo str_repeat("-", 40) . "\n";
    
    $shippingTables = ['shipping_carriers', 'shipping_zones', 'carrier_policies', 'carrier_policies_extended', 'carrier_rates', 'carrier_rates_extended'];
    
    foreach ($shippingTables as $tableName) {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as record_count
            FROM information_schema.tables 
            WHERE table_name = ? AND table_schema = 'public'
        ");
        $stmt->execute([$tableName]);
        $exists = $stmt->fetchColumn() > 0;
        
        if ($exists) {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM {$tableName}");
            $stmt->execute();
            $count = $stmt->fetchColumn();
            echo "  ✅ {$tableName}: {$count}件\n";
            
            // サンプルデータ表示
            if ($count > 0) {
                $stmt = $pdo->prepare("SELECT * FROM {$tableName} LIMIT 3");
                $stmt->execute();
                $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo "     サンプル: " . json_encode($samples[0], JSON_UNESCAPED_UNICODE) . "\n";
            }
        } else {
            echo "  ❌ {$tableName}: 存在しません\n";
        }
    }
    
    // 3. 現在の配送業者データ
    echo "\n🏢 3. 現在の配送業者データ:\n";
    echo str_repeat("-", 40) . "\n";
    
    $stmt = $pdo->query("
        SELECT carrier_id, carrier_name, carrier_code, is_active, priority_order
        FROM shipping_carriers 
        ORDER BY priority_order
    ");
    $carriers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($carriers as $carrier) {
        $status = $carrier['is_active'] ? '✅' : '❌';
        echo "  {$status} [{$carrier['carrier_id']}] {$carrier['carrier_name']} ({$carrier['carrier_code']})\n";
    }
    
    // 4. 現在の配送ゾーンデータ
    echo "\n🌍 4. 現在の配送ゾーンデータ:\n";
    echo str_repeat("-", 40) . "\n";
    
    $stmt = $pdo->query("
        SELECT zone_id, zone_name, countries_json, is_active
        FROM shipping_zones 
        WHERE is_active = true
        ORDER BY zone_name
    ");
    $zones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($zones as $zone) {
        $countries = json_decode($zone['countries_json'], true);
        $countryList = is_array($countries) ? implode(', ', $countries) : '設定なし';
        echo "  [{$zone['zone_id']}] {$zone['zone_name']}: {$countryList}\n";
    }
    
    // 5. 料金データ統計
    echo "\n💰 5. 料金データ統計:\n";
    echo str_repeat("-", 40) . "\n";
    
    // 拡張テーブルの確認
    $extendedTablesExist = false;
    $stmt = $pdo->prepare("
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_name = 'carrier_rates_extended' AND table_schema = 'public'
    ");
    $stmt->execute();
    $extendedTablesExist = $stmt->fetchColumn() > 0;
    
    if ($extendedTablesExist) {
        $stmt = $pdo->query("
            SELECT 
                sc.carrier_name,
                cp.policy_type,
                COUNT(cr.rate_id) as rate_count,
                MIN(cr.cost_usd) as min_cost,
                MAX(cr.cost_usd) as max_cost,
                AVG(cr.cost_usd) as avg_cost
            FROM carrier_rates_extended cr
            JOIN carrier_policies_extended cp ON cr.policy_id = cp.policy_id
            JOIN shipping_carriers sc ON cp.carrier_id = sc.carrier_id
            WHERE cr.is_active = true
            GROUP BY sc.carrier_name, cp.policy_type
            ORDER BY sc.carrier_name, cp.policy_type
        ");
        $rateStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($rateStats as $stat) {
            echo sprintf("  %s (%s): %d件 ($%.2f～$%.2f, 平均$%.2f)\n",
                $stat['carrier_name'],
                $stat['policy_type'],
                $stat['rate_count'],
                $stat['min_cost'],
                $stat['max_cost'],
                $stat['avg_cost']
            );
        }
    } else {
        echo "  ⚠️ 拡張テーブル（carrier_rates_extended）が存在しません\n";
        
        // 基本テーブルの確認
        $stmt = $pdo->prepare("
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_name = 'carrier_rates' AND table_schema = 'public'
        ");
        $stmt->execute();
        if ($stmt->fetchColumn() > 0) {
            $stmt = $pdo->query("SELECT COUNT(*) FROM carrier_rates");
            $stmt->execute();
            $count = $stmt->fetchColumn();
            echo "  基本テーブル carrier_rates: {$count}件\n";
        }
    }
    
    // 6. Gemini引き継ぎ用JSON生成
    echo "\n📄 6. Gemini引き継ぎ用データ生成:\n";
    echo str_repeat("-", 40) . "\n";
    
    $handoffData = [
        'database_status' => [
            'total_tables' => count($tables),
            'shipping_tables_exist' => true,
            'extended_tables_exist' => $extendedTablesExist,
            'has_rate_data' => !empty($rateStats)
        ],
        'carriers' => $carriers,
        'zones' => $zones,
        'rate_statistics' => $rateStats ?? [],
        'api_endpoints' => [
            'base_url' => 'http://localhost:8080/modules/yahoo_auction_tool/shipping_calculation/',
            'api_file' => 'shipping_management_api.php',
            'actions' => [
                'carriers_by_group' => '?action=carriers_by_group',
                'calculate' => '?action=calculate&weight=1.0&country=US',
                'rates' => '?action=rates',
                'export_csv' => '?action=export_csv&type=all',
                'statistics' => '?action=statistics'
            ]
        ],
        'ui_requirements' => [
            'display_carriers_by_group' => true,
            'enable_region_restrictions' => true,
            'show_rate_calculator' => true,
            'csv_management' => true,
            'highlight_optimal_rates' => true
        ]
    ];
    
    $jsonFile = __DIR__ . '/gemini_handoff_data.json';
    file_put_contents($jsonFile, json_encode($handoffData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    echo "  ✅ Gemini引き継ぎデータ生成完了: " . basename($jsonFile) . "\n";
    
    // 7. 実際のデータサンプル出力
    echo "\n📋 7. 実際のデータサンプル（Gemini用）:\n";
    echo str_repeat("-", 40) . "\n";
    
    if ($extendedTablesExist && !empty($rateStats)) {
        // 実際の料金データサンプル
        $stmt = $pdo->query("
            SELECT 
                sc.carrier_name,
                cp.policy_type,
                sz.zone_name,
                cr.weight_min_kg,
                cr.weight_max_kg,
                cr.cost_usd,
                cr.delivery_days_min,
                cr.delivery_days_max
            FROM carrier_rates_extended cr
            JOIN carrier_policies_extended cp ON cr.policy_id = cp.policy_id
            JOIN shipping_carriers sc ON cp.carrier_id = sc.carrier_id
            JOIN shipping_zones sz ON cr.zone_id = sz.zone_id
            WHERE cr.is_active = true
            ORDER BY sc.carrier_name, cp.policy_type, sz.zone_name, cr.weight_min_kg
            LIMIT 20
        ");
        $sampleRates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "実際の料金データサンプル（20件）:\n";
        foreach ($sampleRates as $rate) {
            echo sprintf("  %s %s %s: %skg-%.1fkg = $%.2f (%d-%d日)\n",
                $rate['carrier_name'],
                $rate['policy_type'],
                $rate['zone_name'],
                $rate['weight_min_kg'],
                $rate['weight_max_kg'],
                $rate['cost_usd'],
                $rate['delivery_days_min'],
                $rate['delivery_days_max']
            );
        }
        
        // サンプルデータもJSONに追加
        $handoffData['sample_rates'] = $sampleRates;
        file_put_contents($jsonFile, json_encode($handoffData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    echo "\n🎯 8. 次のステップ:\n";
    echo str_repeat("-", 40) . "\n";
    echo "1. データベース拡張実行が必要な場合:\n";
    echo "   psql nagano3_db -f shipping_integrated_schema.sql\n\n";
    echo "2. Geminiへの引き継ぎ準備完了:\n";
    echo "   - データファイル: gemini_handoff_data.json\n";
    echo "   - API URL: http://localhost:8080/modules/yahoo_auction_tool/shipping_calculation/shipping_management_api.php\n";
    echo "   - 目標UI: shipping_dashboard_advanced.html\n\n";
    echo "3. UIで実装すべき機能:\n";
    echo "   - 業者グループ別表示\n";
    echo "   - 地域制約管理\n";
    echo "   - リアルタイム計算機\n";
    echo "   - CSV管理機能\n";
    echo "   - 最適解ハイライト\n\n";
    
} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
}
?>
