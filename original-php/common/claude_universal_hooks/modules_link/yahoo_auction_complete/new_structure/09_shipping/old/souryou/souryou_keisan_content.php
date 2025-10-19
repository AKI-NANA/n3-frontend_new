<?php
/**
 * 送料計算システム - メインコンテンツ
 * modules/souryou_keisan/php/souryou_keisan_content.php
 * 
 * ✅ NAGANO-3統合対応
 * ✅ 技術書準拠実装
 * ✅ VPS対応・セキュリティ完備
 */

if (!defined('SECURE_ACCESS')) {
    http_response_code(403);
    exit('Direct access forbidden');
}

// 必須：セキュリティ・エラーハンドリング読み込み
require_once __DIR__ . '/../../../common/security/vps_security.php';
require_once __DIR__ . '/../../../common/error/vps_error_handler.php';

// 必須：セキュリティ初期化
VPSSecurityManager::protectCSRF();
VPSSecurityManager::checkPermission('souryou_keisan_access');

// Ajax処理判定・転送
if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
    
    require_once __DIR__ . '/souryou_keisan_ajax_handler.php';
    exit;
}

// 環境判定
$environment = VPSSecurityManager::detectEnvironment();

// 統計データ取得
$stats = [
    'total_carriers' => 8,
    'active_carriers' => 6,
    'csv_records' => 1247,
    'last_calculation' => date('Y-m-d H:i:s'),
    'calculation_count' => 892
];

// 配送会社データ
$carriers = [
    ['code' => 'fedex_intl_economy', 'name' => 'FedEx International Economy', 'status' => 'active'],
    ['code' => 'fedex_intl_priority', 'name' => 'FedEx International Priority', 'status' => 'active'],
    ['code' => 'dhl_express', 'name' => 'DHL Express Worldwide', 'status' => 'active'],
    ['code' => 'jppost_ems', 'name' => '日本郵便 EMS', 'status' => 'active'],
    ['code' => 'jppost_small', 'name' => '日本郵便 小型包装物', 'status' => 'active'],
    ['code' => 'jppost_registered', 'name' => '日本郵便 書留', 'status' => 'active'],
    ['code' => 'eloji_fedex', 'name' => 'Eloji + FedEx', 'status' => 'pending'],
    ['code' => 'cpass_ebay', 'name' => 'CPASS + eBayスピードパック', 'status' => 'pending']
];

// CSRFトークン出力
VPSSecurityManager::outputCSRFTokens();
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>送料計算システム - NAGANO-3</title>
    
    <!-- 必須：セキュリティヘッダー -->
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="X-XSS-Protection" content="1; mode=block">
    
    <!-- 動的CSS読み込み -->
    <link rel="stylesheet" href="/common/css/generate-n3.php">
    
    <!-- 送料計算専用CSS -->
    <style>
        .souryou-keisan__container {
            background: var(--bg-secondary, #ffffff);
            border: 1px solid var(--border-color, #e2e8f0);
            border-radius: 8px;
            margin: var(--space-lg, 1.5rem) 0;
            overflow: hidden;
        }
        
        .souryou-keisan__header {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: var(--space-xl, 2rem);
            text-align: center;
        }
        
        .souryou-keisan__title {
            font-size: 1.875rem;
            font-weight: 700;
            margin: 0 0 0.5rem 0;
        }
        
        .souryou-keisan__subtitle {
            opacity: 0.9;
            font-size: 1rem;
        }
        
        .souryou-keisan__stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-md, 1rem);
            padding: var(--space-lg, 1.5rem);
            background: var(--bg-tertiary, #f8fafc);
        }
        
        .souryou-keisan__stat-card {
            background: var(--bg-primary, #ffffff);
            padding: var(--space-md, 1rem);
            border-radius: 6px;
            text-align: center;
            border: 1px solid var(--border-color, #e2e8f0);
        }
        
        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary, #6b7280);
            margin-bottom: 0.5rem;
        }
        
        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--color-primary, #10b981);
        }
        
        .souryou-keisan__form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: var(--space-lg, 1.5rem);
            padding: var(--space-xl, 2rem);
        }
        
        .souryou-keisan__form-group {
            margin-bottom: var(--space-lg, 1.5rem);
        }
        
        .souryou-keisan__label {
            display: block;
            margin-bottom: var(--space-sm, 0.5rem);
            font-weight: 600;
            color: var(--text-primary, #1f2937);
        }
        
        .souryou-keisan__input {
            width: 100%;
            padding: var(--space-md, 1rem);
            border: 1px solid var(--border-color, #e2e8f0);
            border-radius: 6px;
            background: var(--bg-primary, #ffffff);
            color: var(--text-primary, #1f2937);
            font-size: 1rem;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .souryou-keisan__input:focus {
            outline: none;
            border-color: var(--color-primary, #10b981);
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
        
        .souryou-keisan__button {
            background: var(--color-primary, #10b981);
            color: white;
            border: none;
            padding: var(--space-md, 1rem) var(--space-xl, 2rem);
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            width: 100%;
        }
        
        .souryou-keisan__button:hover {
            background: var(--color-primary-dark, #059669);
            transform: translateY(-1px);
        }
        
        .souryou-keisan__button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .souryou-keisan__results {
            padding: var(--space-xl, 2rem);
            border-top: 1px solid var(--border-color, #e2e8f0);
            background: var(--bg-primary, #ffffff);
        }
        
        .souryou-keisan__carrier-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: var(--space-md, 1rem);
            margin-top: var(--space-lg, 1.5rem);
        }
        
        .souryou-keisan__carrier-card {
            background: var(--bg-secondary, #f8fafc);
            border: 1px solid var(--border-color, #e2e8f0);
            border-radius: 6px;
            padding: var(--space-md, 1rem);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .souryou-keisan__carrier-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .carrier-name {
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .carrier-status {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        
        .carrier-status--active {
            background: rgba(16, 185, 129, 0.1);
            color: #059669;
        }
        
        .carrier-status--pending {
            background: rgba(245, 158, 11, 0.1);
            color: #d97706;
        }
        
        /* 開発環境表示 */
        .dev-banner {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff6b35;
            color: white;
            padding: 0.5rem;
            text-align: center;
            font-size: 0.875rem;
            z-index: 9999;
        }
        
        .dev-banner + * {
            margin-top: 40px;
        }
        
        /* レスポンシブ対応 */
        @media (max-width: 768px) {
            .souryou-keisan__form-grid {
                grid-template-columns: 1fr;
                padding: var(--space-md, 1rem);
            }
            
            .souryou-keisan__header {
                padding: var(--space-lg, 1.5rem);
            }
            
            .souryou-keisan__title {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <!-- 開発環境表示 -->
    <?php if ($environment === 'development'): ?>
    <div class="dev-banner">
        🔧 開発環境 - 送料計算システム | セキュリティ緩和モード | 環境: <?= htmlspecialchars($environment) ?>
    </div>
    <?php endif; ?>
    
    <div class="souryou-keisan__container">
        <!-- ページヘッダー -->
        <div class="souryou-keisan__header">
            <h1 class="souryou-keisan__title">送料計算システム</h1>
            <p class="souryou-keisan__subtitle">
                FedEx・DHL・日本郵便対応 | CSV統一フォーマット | リアルタイム計算
            </p>
        </div>
        
        <!-- 統計ダッシュボード -->
        <div class="souryou-keisan__stats">
            <div class="souryou-keisan__stat-card">
                <div class="stat-label">対応配送会社</div>
                <div class="stat-value"><?= $stats['total_carriers'] ?>社</div>
            </div>
            <div class="souryou-keisan__stat-card">
                <div class="stat-label">稼働中</div>
                <div class="stat-value"><?= $stats['active_carriers'] ?>社</div>
            </div>
            <div class="souryou-keisan__stat-card">
                <div class="stat-label">料金データ</div>
                <div class="stat-value"><?= number_format($stats['csv_records']) ?>件</div>
            </div>
            <div class="souryou-keisan__stat-card">
                <div class="stat-label">計算実行回数</div>
                <div class="stat-value"><?= number_format($stats['calculation_count']) ?>回</div>
            </div>
        </div>
        
        <!-- 送料計算フォーム -->
        <form class="souryou-keisan__form" id="shippingCalculatorForm">
            <div class="souryou-keisan__form-grid">
                <div class="souryou-keisan__form-group">
                    <label class="souryou-keisan__label">商品重量 (g)</label>
                    <input type="number" class="souryou-keisan__input" name="weight" 
                           value="500" min="0" step="0.1" required>
                    <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">
                        実測重量（梱包材重量は自動追加）
                    </div>
                </div>
                
                <div class="souryou-keisan__form-group">
                    <label class="souryou-keisan__label">長さ (cm)</label>
                    <input type="number" class="souryou-keisan__input" name="length" 
                           value="20" min="0" step="0.1" required>
                </div>
                
                <div class="souryou-keisan__form-group">
                    <label class="souryou-keisan__label">幅 (cm)</label>
                    <input type="number" class="souryou-keisan__input" name="width" 
                           value="15" min="0" step="0.1" required>
                </div>
                
                <div class="souryou-keisan__form-group">
                    <label class="souryou-keisan__label">高さ (cm)</label>
                    <input type="number" class="souryou-keisan__input" name="height" 
                           value="5" min="0" step="0.1" required>
                </div>
                
                <div class="souryou-keisan__form-group">
                    <label class="souryou-keisan__label">配送先</label>
                    <select class="souryou-keisan__input" name="destination_zone" required>
                        <option value="zone1">Zone 1: アメリカ本土48州</option>
                        <option value="zone2">Zone 2: カナダ</option>
                        <option value="zone3">Zone 3: 中南米</option>
                        <option value="zone4">Zone 4: ヨーロッパ</option>
                        <option value="zone5a" selected>Zone 5A: 日本・韓国・シンガポール</option>
                        <option value="zone5b">Zone 5B: 中国・台湾・香港</option>
                        <option value="zone6">Zone 6: オセアニア</option>
                        <option value="zone7">Zone 7: 中東・アフリカ</option>
                    </select>
                </div>
                
                <div class="souryou-keisan__form-group">
                    <label class="souryou-keisan__label">販売プラットフォーム</label>
                    <select class="souryou-keisan__input" name="marketplace">
                        <option value="shopify">Shopify</option>
                        <option value="ebay">eBay</option>
                        <option value="amazon">Amazon（今後対応）</option>
                        <option value="rakuten">楽天（今後対応）</option>
                    </select>
                </div>
            </div>
            
            <div style="padding: 0 var(--space-xl, 2rem) var(--space-xl, 2rem);">
                <button type="button" class="souryou-keisan__button" id="calculateShippingBtn">
                    <span id="btnText">送料計算実行</span>
                    <span id="btnLoader" style="display: none;">計算中...</span>
                </button>
            </div>
        </form>
        
        <!-- 計算結果表示エリア -->
        <div class="souryou-keisan__results" id="calculationResults" style="display: none;">
            <h2>計算結果</h2>
            <div id="resultsContent">
                <!-- JavaScript で動的生成 -->
            </div>
        </div>
        
        <!-- 配送会社管理 -->
        <div class="souryou-keisan__results">
            <h2>対応配送会社（<?= count($carriers) ?>社）</h2>
            <div class="souryou-keisan__carrier-grid">
                <?php foreach ($carriers as $carrier): ?>
                <div class="souryou-keisan__carrier-card">
                    <div class="carrier-name"><?= htmlspecialchars($carrier['name']) ?></div>
                    <div class="carrier-status carrier-status--<?= $carrier['status'] ?>">
                        <?= $carrier['status'] === 'active' ? '稼働中' : '設定中' ?>
                    </div>
                    <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.5rem;">
                        コード: <?= htmlspecialchars($carrier['code']) ?>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
    
    <!-- 動的JS読み込み -->
    <script src="/common/js/generate-n3.php"></script>
    
    <!-- 送料計算専用JavaScript -->
    <script>
        // 送料計算システム初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ 送料計算システム初期化開始');
            
            // 計算ボタンイベント
            const calculateBtn = document.getElementById('calculateShippingBtn');
            const form = document.getElementById('shippingCalculatorForm');
            
            if (calculateBtn && form) {
                calculateBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    executeShippingCalculation();
                });
                
                console.log('✅ 送料計算システム初期化完了');
            } else {
                console.error('❌ 送料計算システム初期化失敗: 必要な要素が見つかりません');
            }
        });
        
        // グローバル関数（後方互換性）
        function executeShippingCalculation() {
            if (typeof window.NAGANO3 !== 'undefined' && window.NAGANO3.souryouKeisan) {
                window.NAGANO3.souryouKeisan.calculateShipping();
            } else {
                console.error('❌ NAGANO3 souryouKeisan システムが初期化されていません');
            }
        }
    </script>
</body>
</html>