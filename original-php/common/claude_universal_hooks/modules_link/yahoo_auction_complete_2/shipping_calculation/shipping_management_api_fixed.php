<?php
/**
 * 配送管理統合API（修正版）
 * Group By エラー修正・簡単化
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

class ShippingManagementAPI {
    private $pdo;
    
    public function __construct() {
        $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
        $this->pdo = new PDO($dsn, "postgres", "", [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
    }
    
    /**
     * 配送業者一覧取得（簡易版）
     */
    public function getCarriers() {
        $stmt = $this->pdo->query("
            SELECT 
                sc.carrier_id,
                sc.carrier_name,
                sc.carrier_code,
                sc.is_active,
                sc.priority_order,
                COUNT(DISTINCT ss.service_id) as service_count,
                COUNT(DISTINCT cr.rate_id) as rate_count
            FROM shipping_carriers sc
            LEFT JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id AND ss.is_active = TRUE
            LEFT JOIN carrier_policies_extended cp ON sc.carrier_id = cp.carrier_id
            LEFT JOIN carrier_rates_extended cr ON cp.policy_id = cr.policy_id AND cr.is_active = TRUE
            WHERE sc.is_active = TRUE
            GROUP BY sc.carrier_id, sc.carrier_name, sc.carrier_code, sc.is_active, sc.priority_order
            ORDER BY sc.priority_order
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 配送業者グループ別取得（簡易版）
     */
    public function getCarriersByGroup() {
        // グループ情報取得
        $stmt = $this->pdo->query("
            SELECT 
                COALESCE(cg.group_name, 'その他') as group_name,
                sc.carrier_id,
                sc.carrier_name,
                sc.carrier_code,
                sc.is_active,
                COUNT(DISTINCT ss.service_id) as service_count,
                COUNT(DISTINCT cr.rate_id) as rate_count
            FROM shipping_carriers sc
            LEFT JOIN carrier_group_members cgm ON sc.carrier_id = cgm.carrier_id
            LEFT JOIN carrier_groups cg ON cgm.group_id = cg.group_id
            LEFT JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id AND ss.is_active = TRUE
            LEFT JOIN carrier_policies_extended cp ON sc.carrier_id = cp.carrier_id
            LEFT JOIN carrier_rates_extended cr ON cp.policy_id = cr.policy_id AND cr.is_active = TRUE
            WHERE sc.is_active = TRUE
            GROUP BY cg.group_name, sc.carrier_id, sc.carrier_name, sc.carrier_code, sc.is_active
            ORDER BY 
                CASE 
                    WHEN cg.group_name = 'Eloji' THEN 1
                    WHEN cg.group_name = 'Cpass' THEN 2
                    WHEN cg.group_name = '日本郵便' THEN 3
                    ELSE 4
                END,
                sc.priority_order
        ");
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // グループ別に整理
        $grouped = [];
        foreach ($results as $row) {
            $groupName = $row['group_name'];
            if (!isset($grouped[$groupName])) {
                $grouped[$groupName] = [];
            }
            $grouped[$groupName][] = [
                'carrier_id' => $row['carrier_id'],
                'carrier_name' => $row['carrier_name'],
                'carrier_code' => $row['carrier_code'],
                'is_active' => $row['is_active'],
                'service_count' => $row['service_count'],
                'rate_count' => $row['rate_count']
            ];
        }
        
        return $grouped;
    }
    
    /**
     * 料金データ取得（フィルター付き）
     */
    public function getRates($filters = []) {
        $sql = "
            SELECT 
                sc.carrier_name,
                sc.carrier_code,
                ss.service_name,
                ss.service_type,
                sz.zone_name,
                sz.countries_json,
                cr.weight_min_kg,
                cr.weight_max_kg,
                cr.cost_usd,
                cr.delivery_days_min,
                cr.delivery_days_max,
                cr.is_active,
                cr.rate_id
            FROM shipping_carriers sc
            LEFT JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id AND ss.is_active = TRUE
            LEFT JOIN carrier_policies_extended cp ON sc.carrier_id = cp.carrier_id AND cp.policy_type = ss.service_type
            LEFT JOIN carrier_rates_extended cr ON cp.policy_id = cr.policy_id AND cr.is_active = TRUE
            LEFT JOIN shipping_zones sz ON cr.zone_id = sz.zone_id
            WHERE sc.is_active = TRUE
        ";
        
        $params = [];
        
        if (!empty($filters['carrier_code'])) {
            $sql .= " AND sc.carrier_code = ?";
            $params[] = $filters['carrier_code'];
        }
        
        if (!empty($filters['service_type'])) {
            $sql .= " AND ss.service_type = ?";
            $params[] = $filters['service_type'];
        }
        
        $sql .= " ORDER BY sc.carrier_name, ss.service_type, sz.zone_name, cr.weight_min_kg";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * CSV出力
     */
    public function exportCSV($type = 'all', $filters = []) {
        $rates = $this->getRates($filters);
        
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="shipping_rates_' . $type . '_' . date('Y-m-d') . '.csv"');
        
        $output = fopen('php://output', 'w');
        
        // ヘッダー
        fputcsv($output, [
            'carrier_name', 'carrier_code', 'service_name', 'service_type',
            'zone_name', 'countries', 'weight_min_kg', 'weight_max_kg',
            'cost_usd', 'delivery_days_min', 'delivery_days_max', 'is_active'
        ]);
        
        // データ
        foreach ($rates as $rate) {
            $countries = json_decode($rate['countries_json'], true);
            fputcsv($output, [
                $rate['carrier_name'],
                $rate['carrier_code'],
                $rate['service_name'],
                $rate['service_type'],
                $rate['zone_name'],
                is_array($countries) ? implode(';', $countries) : '',
                $rate['weight_min_kg'],
                $rate['weight_max_kg'],
                $rate['cost_usd'],
                $rate['delivery_days_min'],
                $rate['delivery_days_max'],
                $rate['is_active'] ? 'true' : 'false'
            ]);
        }
        
        fclose($output);
        exit;
    }
    
    /**
     * 統計情報取得
     */
    public function getStatistics() {
        // 基本統計
        $stmt = $this->pdo->query("
            SELECT 
                COUNT(DISTINCT sc.carrier_id) as total_carriers,
                COUNT(DISTINCT ss.service_id) as total_services,
                COUNT(DISTINCT sz.zone_id) as total_zones,
                COUNT(cr.rate_id) as total_rates,
                MIN(cr.cost_usd) as min_cost,
                MAX(cr.cost_usd) as max_cost,
                AVG(cr.cost_usd) as avg_cost
            FROM shipping_carriers sc
            LEFT JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id AND ss.is_active = TRUE
            LEFT JOIN shipping_zones sz ON sz.is_active = TRUE
            LEFT JOIN carrier_policies_extended cp ON sc.carrier_id = cp.carrier_id
            LEFT JOIN carrier_rates_extended cr ON cp.policy_id = cr.policy_id AND cr.is_active = TRUE
            WHERE sc.is_active = TRUE
        ");
        $basicStats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'basic' => $basicStats
        ];
    }
}

// API ルーティング
try {
    $api = new ShippingManagementAPI();
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'carriers':
            echo json_encode($api->getCarriers());
            break;
            
        case 'carriers_by_group':
            echo json_encode($api->getCarriersByGroup());
            break;
            
        case 'rates':
            echo json_encode($api->getRates($_GET));
            break;
            
        case 'export_csv':
            $type = $_GET['type'] ?? 'all';
            $filters = array_intersect_key($_GET, array_flip(['carrier_code', 'service_type']));
            $api->exportCSV($type, $filters);
            break;
            
        case 'statistics':
            echo json_encode($api->getStatistics());
            break;
            
        default:
            echo json_encode(['error' => 'Invalid action']);
    }
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
