<?php
/**
 * 4層選択式送料計算システム - PHP統合版
 * データベース直接接続・サーバーサイドレンダリング対応
 */

// エラー表示設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// データベース接続
function getDatabaseConnection() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        return $pdo;
    } catch (PDOException $e) {
        throw new Exception('データベース接続失敗: ' . $e->getMessage());
    }
}

// 初期データ取得
$db_connected = false;
$initial_data = [
    'total_records' => 0,
    'ems_records' => 0,
    'countries' => 0,
    'db_status' => 'disconnected'
];

try {
    $pdo = getDatabaseConnection();
    $db_connected = true;
    
    // 統計情報取得
    $stmt = $pdo->query("SELECT COUNT(*) FROM shipping_service_rates");
    $initial_data['total_records'] = $stmt->fetchColumn();
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM shipping_service_rates WHERE company_code = 'JPPOST' AND service_code = 'EMS'");
    $initial_data['ems_records'] = $stmt->fetchColumn();
    
    $stmt = $pdo->query("SELECT COUNT(DISTINCT country_code) FROM shipping_service_rates");
    $initial_data['countries'] = $stmt->fetchColumn();
    
    $initial_data['db_status'] = 'connected';
    
} catch (Exception $e) {
    $db_error = $e->getMessage();
}

// AJAX API処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && 
    strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false) {
    
    header('Content-Type: application/json; charset=utf-8');
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    try {
        switch ($action) {
            case 'get_shipping_data':
                $filters = $input['filters'] ?? [];
                $result = getShippingData($pdo, $filters);
                echo json_encode(['success' => true, 'data' => $result]);
                break;
                
            case 'get_statistics':
                echo json_encode(['success' => true, 'data' => $initial_data]);
                break;
                
            default:
                echo json_encode(['success' => false, 'error' => '不明なアクション']);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    
    exit;
}

// 配送データ取得関数
function getShippingData($pdo, $filters) {
    $sql = "
        SELECT 
            company_code,
            carrier_code,
            service_code,
            country_code,
            zone_code,
            weight_from_g,
            weight_to_g,
            price_jpy,
            data_source,
            created_at
        FROM shipping_service_rates 
        WHERE 1=1
    ";
    
    $params = [];
    
    if (!empty($filters['company']) && $filters['company'] !== 'ALL') {
        $sql .= " AND company_code = ?";
        $params[] = $filters['company'];
    }
    
    if (!empty($filters['service']) && $filters['service'] !== 'ALL') {
        $sql .= " AND service_code = ?";
        $params[] = $filters['service'];
    }
    
    if (!empty($filters['country']) && $filters['country'] !== 'ALL') {
        $sql .= " AND country_code = ?";
        $params[] = $filters['country'];
    }
    
    $sql .= " ORDER BY company_code, country_code, weight_from_g LIMIT 100";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>送料計算システム - 4層選択（PHP統合版・30kg対応）</title>
    <style>
        :root {
            --elogi-color: #FF6B6B;
            --cpass-color: #1E90FF;
            --jppost-color: #2EC4B6;
            --bg-light: #f8fafc;
            --bg-white: #ffffff;
            --text-dark: #1e293b;
            --text-gray: #64748b;
            --border: #e2e8f0;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --radius: 8px;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg-light);
            color: var(--text-dark);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #3b82f6, #1e40af);
            color: white;
            padding: 30px;
            border-radius: var(--radius);
            text-align: center;
            margin-bottom: 30px;
        }
        
        .db-status {
            background: <?= $db_connected ? '#10b981' : '#ef4444' ?>;
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            display: inline-block;
            margin-top: 10px;
            font-size: 14px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: var(--bg-white);
            border-radius: var(--radius);
            padding: 20px;
            box-shadow: var(--shadow);
            text-align: center;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #3b82f6;
        }
        
        .stat-label {
            color: var(--text-gray);
            font-size: 14px;
            margin-top: 5px;
        }
        
        .selection-flow {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .selection-step {
            background: var(--bg-white);
            border-radius: var(--radius);
            padding: 20px;
            box-shadow: var(--shadow);
            border-top: 4px solid #3b82f6;
        }
        
        .step-header {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .step-number {
            background: #3b82f6;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
        }
        
        .country-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 8px;
        }
        
        .country-btn {
            padding: 10px 8px;
            border: 1px solid var(--border);
            background: var(--bg-white);
            border-radius: 5px;
            cursor: pointer;
            text-align: center;
            transition: all 0.2s;
            font-size: 12px;
        }
        
        .country-btn:hover {
            background: #f1f5f9;
            border-color: #3b82f6;
        }
        
        .country-btn.selected {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
        }
        
        .company-buttons {
            display: grid;
            gap: 10px;
        }
        
        .company-btn {
            padding: 15px;
            border: 2px solid var(--border);
            background: var(--bg-white);
            border-radius: var(--radius);
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
        }
        
        .company-btn:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow);
        }
        
        .company-btn.selected.elogi {
            border-color: var(--elogi-color);
            background: rgba(255, 107, 107, 0.1);
        }
        
        .company-btn.selected.cpass {
            border-color: var(--cpass-color);
            background: rgba(30, 144, 255, 0.1);
        }
        
        .company-btn.selected.jppost {
            border-color: var(--jppost-color);
            background: rgba(46, 196, 182, 0.1);
        }
        
        .company-btn.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }
        
        .company-name {
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .company-zone {
            font-size: 12px;
            color: var(--text-gray);
        }
        
        .carrier-grid {
            display: grid;
            gap: 8px;
        }
        
        .carrier-btn {
            padding: 12px;
            border: 1px solid var(--border);
            background: var(--bg-white);
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
        }
        
        .carrier-btn:hover {
            background: #f8fafc;
            border-color: #3b82f6;
        }
        
        .carrier-btn.selected {
            background: #e0f2fe;
            border-color: #0288d1;
        }
        
        .carrier-name {
            font-weight: 600;
            font-size: 14px;
        }
        
        .carrier-services {
            font-size: 11px;
            color: var(--text-gray);
            margin-top: 3px;
        }
        
        .service-list {
            display: grid;
            gap: 6px;
            max-height: 200px;
            overflow-y: auto;
        }
        
        .service-btn {
            padding: 10px 12px;
            border: 1px solid var(--border);
            background: var(--bg-white);
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
        }
        
        .service-btn:hover {
            background: #f1f5f9;
        }
        
        .service-btn.selected {
            background: #dbeafe;
            border-color: #3b82f6;
        }
        
        .service-name {
            font-weight: 600;
            font-size: 13px;
        }
        
        .service-details {
            font-size: 11px;
            color: var(--text-gray);
            margin-top: 2px;
        }
        
        .matrix-container {
            background: var(--bg-white);
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            overflow: hidden;
            margin-top: 30px;
        }
        
        .matrix-header {
            background: linear-gradient(135deg, #3b82f6, #1e40af);
            color: white;
            padding: 20px;
        }
        
        .matrix-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .matrix-subtitle {
            opacity: 0.9;
            font-size: 14px;
        }
        
        .matrix-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .matrix-table th {
            background: #f8fafc;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid var(--border);
        }
        
        .matrix-table td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .weight-cell {
            font-weight: 600;
        }
        
        .price-cell {
            font-size: 16px;
            font-weight: 600;
            color: #059669;
        }
        
        .no-selection {
            text-align: center;
            padding: 40px;
            color: var(--text-gray);
        }
        
        .selection-summary {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: var(--radius);
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .summary-title {
            font-weight: 600;
            color: #0c4a6e;
            margin-bottom: 8px;
        }
        
        .summary-details {
            font-size: 14px;
            color: #0369a1;
        }
        
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-active { background: #10b981; }
        .status-inactive { background: #ef4444; }
        
        .loading-matrix {
            text-align: center;
            padding: 40px;
            color: var(--text-gray);
        }
        
        .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(59, 130, 246, 0.3);
            border-radius: 50%;
            border-top-color: #3b82f6;
            animation: spin 1s ease-in-out infinite;
            margin-right: 10px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .database-badge {
            background: #10b981;
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 10px;
            margin-left: 5px;
        }
        
        .mock-badge {
            background: #f59e0b;
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 10px;
            margin-left: 5px;
        }
        
        .price-source {
            font-size: 10px;
            color: var(--text-gray);
            font-style: italic;
        }
        
        @media (max-width: 1200px) {
            .selection-flow {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 768px) {
            .selection-flow {
                grid-template-columns: 1fr;
            }
            
            .country-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚢 送料計算システム（PHP統合版・全業者対応・30kg対応）</h1>
            <p>4層選択方式: 国 → 配送会社 → 配送業者 → サービス → 実際の料金</p>
            <p><strong>eLogi・CPass・日本郵便 | EMS 30kgまで対応 | 実データベース連携</strong></p>
            
            <div class="db-status">
                <?php if ($db_connected): ?>
                    ✅ データベース接続OK | 総レコード: <?= number_format($initial_data['total_records']) ?>件 | EMS: <?= number_format($initial_data['ems_records']) ?>件
                <?php else: ?>
                    ❌ データベース接続エラー: <?= isset($db_error) ? htmlspecialchars($db_error) : '不明なエラー' ?>
                <?php endif; ?>
            </div>
        </div>

        <!-- 統計情報 -->
        <?php if ($db_connected): ?>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number"><?= number_format($initial_data['total_records']) ?></div>
                <div class="stat-label">総配送データ</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= number_format($initial_data['ems_records']) ?></div>
                <div class="stat-label">EMS実データ</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?= $initial_data['countries'] ?></div>
                <div class="stat-label">対応国数</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">30kg</div>
                <div class="stat-label">最大重量</div>
            </div>
        </div>
        <?php endif; ?>

        <!-- 選択フロー -->
        <div class="selection-flow">
            <!-- Step 1: 国選択 -->
            <div class="selection-step">
                <div class="step-header">
                    <div class="step-number">1</div>
                    配送先国選択
                </div>
                <div class="country-grid">
                    <button class="country-btn" data-country="US">🇺🇸<br>アメリカ</button>
                    <button class="country-btn" data-country="CN">🇨🇳<br>中国</button>
                    <button class="country-btn" data-country="KR">🇰🇷<br>韓国</button>
                    <button class="country-btn" data-country="TW">🇹🇼<br>台湾</button>
                    <button class="country-btn" data-country="HK">🇭🇰<br>香港</button>
                    <button class="country-btn" data-country="SG">🇸🇬<br>シンガポール</button>
                    <button class="country-btn" data-country="TH">🇹🇭<br>タイ</button>
                    <button class="country-btn" data-country="AU">🇦🇺<br>オーストラリア</button>
                    <button class="country-btn" data-country="CA">🇨🇦<br>カナダ</button>
                    <button class="country-btn" data-country="GB">🇬🇧<br>イギリス</button>
                    <button class="country-btn" data-country="DE">🇩🇪<br>ドイツ</button>
                </div>
            </div>

            <!-- Step 2: 配送会社選択 -->
            <div class="selection-step">
                <div class="step-header">
                    <div class="step-number">2</div>
                    配送会社選択
                </div>
                <div class="company-buttons" id="company-buttons">
                    <div class="no-selection">
                        国を選択してください
                    </div>
                </div>
            </div>

            <!-- Step 3: 配送業者選択 -->
            <div class="selection-step">
                <div class="step-header">
                    <div class="step-number">3</div>
                    配送業者選択
                </div>
                <div class="carrier-grid" id="carrier-grid">
                    <div class="no-selection">
                        配送会社を選択してください
                    </div>
                </div>
            </div>

            <!-- Step 4: サービス選択 -->
            <div class="selection-step">
                <div class="step-header">
                    <div class="step-number">4</div>
                    サービス選択
                </div>
                <div class="service-list" id="service-list">
                    <div class="no-selection">
                        配送業者を選択してください
                    </div>
                </div>
            </div>
        </div>

        <!-- 選択サマリー -->
        <div class="selection-summary" id="selection-summary" style="display: none;">
            <div class="summary-title">現在の選択</div>
            <div class="summary-details" id="summary-details">
                <!-- JavaScript で動的生成 -->
            </div>
        </div>

        <!-- 料金マトリックス -->
        <div class="matrix-container" id="matrix-container" style="display: none;">
            <div class="matrix-header">
                <div class="matrix-title" id="matrix-title">料金マトリックス</div>
                <div class="matrix-subtitle" id="matrix-subtitle">重量別料金表</div>
            </div>
            <div style="padding: 20px;">
                <table class="matrix-table">
                    <thead>
                        <tr>
                            <th>重量</th>
                            <th>料金（円）</th>
                            <th>配送日数</th>
                            <th>特徴</th>
                            <th>データソース</th>
                        </tr>
                    </thead>
                    <tbody id="matrix-body">
                        <tr>
                            <td colspan="5" class="loading-matrix">
                                <div class="loading-spinner"></div>
                                データベースから料金情報を取得中...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // PHP から渡された初期データ
        const initialData = <?= json_encode($initial_data) ?>;
        const dbConnected = <?= $db_connected ? 'true' : 'false' ?>;
        
        // 国別配送業者対応状況
        const countrySupport = {
            'US': { 
                name: 'アメリカ', flag: '🇺🇸', jppost_zone: '第4地帯',
                elogi: { supported: true, zone: 'Zone1' },
                cpass: { supported: true, zone: 'USA対応' }
            },
            'CN': { 
                name: '中国', flag: '🇨🇳', jppost_zone: '第1地帯',
                elogi: { supported: true, zone: 'Zone1' },
                cpass: { supported: false, zone: '対応外' }
            },
            'KR': { 
                name: '韓国', flag: '🇰🇷', jppost_zone: '第1地帯',
                elogi: { supported: true, zone: 'Zone1' },
                cpass: { supported: false, zone: '対応外' }
            },
            'TW': { 
                name: '台湾', flag: '🇹🇼', jppost_zone: '第1地帯',
                elogi: { supported: true, zone: 'Zone1' },
                cpass: { supported: false, zone: '対応外' }
            },
            'HK': { 
                name: '香港', flag: '🇭🇰', jppost_zone: '第2地帯',
                elogi: { supported: true, zone: 'Zone1' },
                cpass: { supported: false, zone: '対応外' }
            },
            'SG': { 
                name: 'シンガポール', flag: '🇸🇬', jppost_zone: '第2地帯',
                elogi: { supported: true, zone: 'Zone1' },
                cpass: { supported: false, zone: '対応外' }
            },
            'TH': { 
                name: 'タイ', flag: '🇹🇭', jppost_zone: '第2地帯',
                elogi: { supported: true, zone: 'Zone1' },
                cpass: { supported: false, zone: '対応外' }
            },
            'AU': { 
                name: 'オーストラリア', flag: '🇦🇺', jppost_zone: '第3地帯',
                elogi: { supported: true, zone: 'Zone3' },
                cpass: { supported: true, zone: 'AU対応' }
            },
            'CA': { 
                name: 'カナダ', flag: '🇨🇦', jppost_zone: '第3地帯',
                elogi: { supported: true, zone: 'Zone2' },
                cpass: { supported: false, zone: '対応外' }
            },
            'GB': { 
                name: 'イギリス', flag: '🇬🇧', jppost_zone: '第3地帯',
                elogi: { supported: true, zone: 'Zone2' },
                cpass: { supported: true, zone: 'UK対応' }
            },
            'DE': { 
                name: 'ドイツ', flag: '🇩🇪', jppost_zone: '第3地帯',
                elogi: { supported: true, zone: 'Zone2' },
                cpass: { supported: true, zone: 'DE対応' }
            }
        };

        // 配送業者サービスデータ（モック）
        const carrierServices = {
            'ELOGI': {
                'UPS': [
                    { code: 'UPS_EXPRESS', name: 'UPS Express', days: '1-2', type: 'EXPRESS' },
                    { code: 'UPS_STANDARD', name: 'UPS Standard', days: '2-3', type: 'STANDARD' },
                    { code: 'UPS_SAVER', name: 'UPS Saver', days: '3-4', type: 'ECONOMY' }
                ],
                'DHL': [
                    { code: 'DHL_EXPRESS', name: 'DHL Express Worldwide', days: '1-2', type: 'EXPRESS' },
                    { code: 'DHL_ECONOMY', name: 'DHL Economy', days: '3-5', type: 'ECONOMY' }
                ],
                'FEDEX': [
                    { code: 'FEDEX_PRIORITY', name: 'FedEx International Priority', days: '1-2', type: 'EXPRESS' },
                    { code: 'FEDEX_ECONOMY', name: 'FedEx International Economy', days: '3-5', type: 'ECONOMY' }
                ]
            },
            'CPASS': {
                'DHL': [
                    { code: 'DHL_ECOMMERCE', name: 'DHL eCommerce', days: '7-12', type: 'ECONOMY' },
                    { code: 'DHL_PACKET', name: 'DHL Packet', days: '10-15', type: 'ECONOMY' }
                ],
                'FEDEX': [
                    { code: 'FEDEX_SMARTPOST', name: 'FedEx SmartPost', days: '8-12', type: 'ECONOMY' },
                    { code: 'FEDEX_GROUND', name: 'FedEx Ground', days: '5-8', type: 'STANDARD' }
                ],
                'SPEEDPAK': [
                    { code: 'SPEEDPAK_ECONOMY', name: 'SpeedPAK Economy', days: '8-15', type: 'ECONOMY' },
                    { code: 'SPEEDPAK_STANDARD', name: 'SpeedPAK Standard', days: '6-10', type: 'STANDARD' }
                ]
            }
        };

        // 現在の選択状態
        let currentSelection = {
            country: null,
            company: null,
            carrier: null,
            service: null
        };

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('4層選択システム（PHP統合版）初期化完了');
            console.log('初期データ:', initialData);
            console.log('DB接続状況:', dbConnected);
            
            initializeEventListeners();
        });

        function initializeEventListeners() {
            // 国選択
            document.querySelectorAll('.country-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    selectCountry(this.dataset.country);
                });
            });
        }

        function selectCountry(countryCode) {
            currentSelection.country = countryCode;
            currentSelection.company = null;
            currentSelection.carrier = null;
            currentSelection.service = null;

            // UI更新
            updateCountrySelection(countryCode);
            updateCompanyButtons(countryCode);
            clearCarrierSelection();
            clearServiceSelection();
            updateSelectionSummary();
        }

        function updateCountrySelection(countryCode) {
            document.querySelectorAll('.country-btn').forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.country === countryCode);
            });
        }

        function updateCompanyButtons(countryCode) {
            const countryData = countrySupport[countryCode];
            const companyButtonsDiv = document.getElementById('company-buttons');
            
            let html = '';
            
            // eLogi
            const elogiSupported = countryData.elogi.supported;
            html += `
                <button class="company-btn elogi ${elogiSupported ? '' : 'disabled'}" 
                        data-company="ELOGI" 
                        ${elogiSupported ? '' : 'disabled'}>
                    <div class="company-name">
                        <span class="status-indicator ${elogiSupported ? 'status-active' : 'status-inactive'}"></span>
                        eLogi
                        <span class="mock-badge">モック</span>
                    </div>
                    <div class="company-zone">${countryData.elogi.zone}</div>
                </button>
            `;
            
            // CPass
            const cpassSupported = countryData.cpass.supported;
            html += `
                <button class="company-btn cpass ${cpassSupported ? '' : 'disabled'}" 
                        data-company="CPASS" 
                        ${cpassSupported ? '' : 'disabled'}>
                    <div class="company-name">
                        <span class="status-indicator ${cpassSupported ? 'status-active' : 'status-inactive'}"></span>
                        CPass
                        <span class="mock-badge">モック</span>
                    </div>
                    <div class="company-zone">${countryData.cpass.zone}</div>
                </button>
            `;
            
            // 日本郵便
            html += `
                <button class="company-btn jppost" data-company="JPPOST">
                    <div class="company-name">
                        <span class="status-indicator status-active"></span>
                        日本郵便 (EMS)
                        <span class="database-badge">実データ</span>
                    </div>
                    <div class="company-zone">${countryData.jppost_zone}</div>
                </button>
            `;
            
            companyButtonsDiv.innerHTML = html;
            
            // イベントリスナー追加
            companyButtonsDiv.querySelectorAll('.company-btn:not(.disabled)').forEach(btn => {
                btn.addEventListener('click', function() {
                    selectCompany(this.dataset.company);
                });
            });
        }

        function selectCompany(companyCode) {
            currentSelection.company = companyCode;
            currentSelection.carrier = null;
            currentSelection.service = null;

            // UI更新
            updateCompanySelection(companyCode);
            updateCarrierButtons(companyCode);
            clearServiceSelection();
            updateSelectionSummary();
        }

        function updateCompanySelection(companyCode) {
            document.querySelectorAll('.company-btn').forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.company === companyCode);
            });
        }

        function updateCarrierButtons(companyCode) {
            const carrierGridDiv = document.getElementById('carrier-grid');
            
            if (companyCode === 'JPPOST') {
                carrierGridDiv.innerHTML = `
                    <button class="carrier-btn" data-carrier="EMS">
                        <div class="carrier-name">EMS <span class="database-badge">実データ</span></div>
                        <div class="carrier-services">国際スピード郵便（30kgまで対応）</div>
                    </button>
                `;
            } else if (companyCode === 'ELOGI' || companyCode === 'CPASS') {
                let html = '';
                const carriers = Object.keys(carrierServices[companyCode]);
                carriers.forEach(carrierCode => {
                    const serviceCount = carrierServices[companyCode][carrierCode].length;
                    html += `
                        <button class="carrier-btn" data-carrier="${carrierCode}">
                            <div class="carrier-name">${carrierCode} <span class="mock-badge">モック</span></div>
                            <div class="carrier-services">${serviceCount}サービス</div>
                        </button>
                    `;
                });
                carrierGridDiv.innerHTML = html;
            }
            
            // イベントリスナー追加
            carrierGridDiv.querySelectorAll('.carrier-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    selectCarrier(this.dataset.carrier);
                });
            });
        }

        function selectCarrier(carrierCode) {
            currentSelection.carrier = carrierCode;
            currentSelection.service = null;

            // UI更新
            updateCarrierSelection(carrierCode);
            updateServiceButtons(carrierCode);
            updateSelectionSummary();
        }

        function updateCarrierSelection(carrierCode) {
            document.querySelectorAll('.carrier-btn').forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.carrier === carrierCode);
            });
        }

        function updateServiceButtons(carrierCode) {
            const serviceListDiv = document.getElementById('service-list');
            
            if (carrierCode === 'EMS') {
                serviceListDiv.innerHTML = `
                    <button class="service-btn" data-service="EMS">
                        <div class="service-name">EMS（国際スピード郵便）<span class="database-badge">実データ</span></div>
                        <div class="service-details">EXPRESS | 3-6日 | 追跡・保険付 | 30kgまで</div>
                    </button>
                `;
            } else {
                // eLogi/CPassのサービス
                let html = '';
                const services = carrierServices[currentSelection.company][carrierCode];
                services.forEach(service => {
                    html += `
                        <button class="service-btn" data-service="${service.code}">
                            <div class="service-name">${service.name} <span class="mock-badge">モック</span></div>
                            <div class="service-details">${service.type} | ${service.days}日</div>
                        </button>
                    `;
                });
                serviceListDiv.innerHTML = html;
            }
            
            // イベントリスナー追加
            serviceListDiv.querySelectorAll('.service-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    selectService(this.dataset.service);
                });
            });
        }

        function selectService(serviceCode) {
            currentSelection.service = serviceCode;

            // UI更新
            updateServiceSelection(serviceCode);
            updateSelectionSummary();
            
            if (serviceCode === 'EMS' && dbConnected) {
                loadRealPriceData();
            } else {
                generateMockPriceMatrix();
            }
        }

        function updateServiceSelection(serviceCode) {
            document.querySelectorAll('.service-btn').forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.service === serviceCode);
            });
        }

        function clearCarrierSelection() {
            document.getElementById('carrier-grid').innerHTML = '<div class="no-selection">配送会社を選択してください</div>';
        }

        function clearServiceSelection() {
            document.getElementById('service-list').innerHTML = '<div class="no-selection">配送業者を選択してください</div>';
        }

        function updateSelectionSummary() {
            const summaryDiv = document.getElementById('selection-summary');
            const detailsDiv = document.getElementById('summary-details');
            
            if (!currentSelection.country) {
                summaryDiv.style.display = 'none';
                return;
            }
            
            summaryDiv.style.display = 'block';
            
            const countryData = countrySupport[currentSelection.country];
            let details = `${countryData.flag} ${countryData.name}`;
            
            if (currentSelection.company) {
                const companyNames = {
                    'ELOGI': 'eLogi',
                    'CPASS': 'CPass',
                    'JPPOST': '日本郵便'
                };
                details += ` → ${companyNames[currentSelection.company]}`;
                
                if (currentSelection.carrier) {
                    details += ` → ${currentSelection.carrier}`;
                    
                    if (currentSelection.service) {
                        details += ` → ${currentSelection.service}`;
                    }
                }
            }
            
            detailsDiv.textContent = details;
        }

        // データベースから実際のEMS料金データ取得
        async function loadRealPriceData() {
            const matrixContainer = document.getElementById('matrix-container');
            const matrixTitle = document.getElementById('matrix-title');
            const matrixSubtitle = document.getElementById('matrix-subtitle');
            const matrixBody = document.getElementById('matrix-body');
            
            // ローディング表示
            matrixContainer.style.display = 'block';
            matrixBody.innerHTML = `
                <tr>
                    <td colspan="5" class="loading-matrix">
                        <div class="loading-spinner"></div>
                        データベースから${countrySupport[currentSelection.country].name}向けEMS料金を取得中...
                    </td>
                </tr>
            `;
            
            try {
                // 自分自身にAJAXリクエスト（PHP処理）
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'get_shipping_data',
                        filters: {
                            company: 'JPPOST',
                            service: 'EMS',
                            country: currentSelection.country
                        }
                    })
                });
                
                const result = await response.json();
                
                if (result.success && result.data.length > 0) {
                    displayRealPriceMatrix(result.data);
                } else {
                    // データがない場合
                    matrixBody.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px; color: #ef4444;">
                                ⚠️ ${countrySupport[currentSelection.country].name}向けのEMS料金データが見つかりません
                                <br><small>データベースに該当国のデータが投入されていない可能性があります</small>
                            </td>
                        </tr>
                    `;
                }
                
            } catch (error) {
                console.error('Price data loading error:', error);
                matrixBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 40px; color: #ef4444;">
                            ❌ 料金データの取得に失敗しました
                            <br><small>PHP処理エラー: ${error.message}</small>
                        </td>
                    </tr>
                `;
            }
        }

        function displayRealPriceMatrix(priceData) {
            const matrixTitle = document.getElementById('matrix-title');
            const matrixSubtitle = document.getElementById('matrix-subtitle');
            const matrixBody = document.getElementById('matrix-body');
            const countryData = countrySupport[currentSelection.country];
            
            // ヘッダー更新
            matrixTitle.textContent = `EMS ${countryData.name}向け料金（PHP統合・実データベース・正確な重量区分）`;
            matrixSubtitle.textContent = `${countryData.jppost_zone} | EXPRESS | 配送日数: 3-6日 | 追跡・保険付`;
            
            // 料金データ表示（正確な重量区分表示）
            let html = '';
            
            priceData.forEach(data => {
                const weightDisplay = getWeightDisplay(data.weight_from_g, data.weight_to_g);
                const features = getEMSFeatures();
                
                html += `
                    <tr>
                        <td class="weight-cell">${weightDisplay}</td>
                        <td class="price-cell">¥${data.price_jpy.toLocaleString()}</td>
                        <td>3-6日</td>
                        <td>${features}</td>
                        <td class="price-source">${data.data_source || 'PHP統合'}</td>
                    </tr>
                `;
            });
            
            matrixBody.innerHTML = html;
        }

        // 重量表示を正確に計算
        function getWeightDisplay(weightFromG, weightToG) {
            if (weightToG <= 1000) {
                // 1kg以下は「～gまで」表示
                return `${weightToG}gまで`;
            } else if (weightToG <= 2000) {
                // 2kg以下は「～kgまで」表示（小数点あり）
                const kg = weightToG / 1000;
                if (kg === Math.floor(kg)) {
                    return `${kg}kgまで`;
                } else {
                    return `${kg}kgまで`;
                }
            } else {
                // 2kg超は「～kgまで」表示（整数）
                const kg = weightToG / 1000;
                return `${kg}kgまで`;
            }
        }

        // モック料金マトリックス生成（eLogi/CPass用）
        function generateMockPriceMatrix() {
            const matrixContainer = document.getElementById('matrix-container');
            const matrixTitle = document.getElementById('matrix-title');
            const matrixSubtitle = document.getElementById('matrix-subtitle');
            const matrixBody = document.getElementById('matrix-body');
            const countryData = countrySupport[currentSelection.country];
            
            matrixContainer.style.display = 'block';
            
            // ヘッダー更新
            matrixTitle.textContent = `${currentSelection.company} ${currentSelection.carrier} ${countryData.name}向け料金（PHPモックデータ）`;
            matrixSubtitle.textContent = `サンプル料金 | 実際の料金は各業者にお問い合わせください`;
            
            // モック料金生成
            const weights = [1, 2, 3, 5, 10, 15, 20, 30];
            let html = '';
            let basePrice = currentSelection.company === 'ELOGI' ? 4000 : 2000;
            
            weights.forEach(weight => {
                const price = Math.round(basePrice + (weight * 300));
                const days = currentSelection.company === 'ELOGI' ? '1-3' : '7-14';
                const type = currentSelection.company === 'ELOGI' ? 'EXPRESS' : 'ECONOMY';
                
                html += `
                    <tr>
                        <td class="weight-cell">${weight}kg</td>
                        <td class="price-cell">¥${price.toLocaleString()}</td>
                        <td>${days}日</td>
                        <td>${type}</td>
                        <td class="price-source">PHPモック</td>
                    </tr>
                `;
            });
            
            matrixBody.innerHTML = html;
        }

        function getEMSFeatures() {
            return '追跡, 保険, 優先取扱';
        }
    </script>
</body>
</html>