<?php
/**
 * タブ式マトリックス表示システム
 * 指示書 Phase 2: タブ式マトリックスUI実装
 */

// セキュリティとセッション管理
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF トークン生成
if (!isset($_SESSION['matrix_csrf_token'])) {
    $_SESSION['matrix_csrf_token'] = bin2hex(random_bytes(32));
}

// データベース接続設定
require_once '../shipping_calculator_database.php';

// エラーハンドリング
set_error_handler(function($severity, $message, $file, $line) {
    error_log("Matrix UI Error: $message in $file on line $line");
});

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>送料マトリックス - タブ式UI</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../css/matrix_ui.css">
    <style>
        :root {
            --matrix-primary: #059669;
            --matrix-secondary: #10b981;
            --matrix-accent: #06b6d4;
            --matrix-warning: #f59e0b;
            --matrix-danger: #ef4444;
            --matrix-success: #10b981;
            
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f1f5f9;
            --bg-quaternary: #e2e8f0;
            
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --text-inverse: #ffffff;
            
            --border-light: #e2e8f0;
            --border-medium: #cbd5e1;
            --border-dark: #94a3b8;
            
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            
            --radius-sm: 0.25rem;
            --radius-md: 0.375rem;
            --radius-lg: 0.5rem;
            --radius-xl: 0.75rem;
            --radius-2xl: 1rem;
            
            --space-xs: 0.25rem;
            --space-sm: 0.5rem;
            --space-md: 1rem;
            --space-lg: 1.5rem;
            --space-xl: 2rem;
            --space-2xl: 2.5rem;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--bg-primary);
        }

        .matrix-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: var(--space-lg);
        }

        /* ヘッダー */
        .matrix-header {
            background: linear-gradient(135deg, var(--matrix-primary), var(--matrix-secondary));
            color: var(--text-inverse);
            padding: var(--space-xl);
            border-radius: var(--radius-2xl);
            margin-bottom: var(--space-xl);
            box-shadow: var(--shadow-lg);
        }

        .matrix-header h1 {
            font-size: 2.25rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: var(--space-md);
            margin-bottom: var(--space-sm);
        }

        .matrix-header p {
            font-size: 1.125rem;
            opacity: 0.9;
        }

        /* 条件設定パネル */
        .matrix-conditions {
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            padding: var(--space-xl);
            margin-bottom: var(--space-xl);
            border: 1px solid var(--border-light);
            box-shadow: var(--shadow-sm);
        }

        .conditions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-lg);
            margin-bottom: var(--space-lg);
        }

        .condition-item {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
        }

        .condition-label {
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--space-xs);
        }

        .condition-input, .condition-select {
            padding: var(--space-sm) var(--space-md);
            border: 2px solid var(--border-light);
            border-radius: var(--radius-md);
            font-size: 1rem;
            transition: all 0.2s ease;
            background: var(--bg-secondary);
        }

        .condition-input:focus, .condition-select:focus {
            outline: none;
            border-color: var(--matrix-primary);
            box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        .generate-button {
            background: linear-gradient(135deg, var(--matrix-primary), var(--matrix-secondary));
            color: var(--text-inverse);
            border: none;
            padding: var(--space-md) var(--space-xl);
            border-radius: var(--radius-lg);
            font-size: 1.125rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            box-shadow: var(--shadow-md);
        }

        .generate-button:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .generate-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        /* タブナビゲーション */
        .matrix-tab-container {
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            border: 1px solid var(--border-light);
            box-shadow: var(--shadow-md);
            overflow: hidden;
        }

        .matrix-tab-navigation {
            display: flex;
            background: var(--bg-tertiary);
            border-bottom: 1px solid var(--border-light);
            overflow-x: auto;
        }

        .matrix-tab-btn {
            background: none;
            border: none;
            padding: var(--space-lg) var(--space-xl);
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-secondary);
            white-space: nowrap;
            border-bottom: 3px solid transparent;
        }

        .matrix-tab-btn:hover {
            background: var(--bg-secondary);
            color: var(--text-primary);
        }

        .matrix-tab-btn.active {
            background: var(--bg-secondary);
            color: var(--matrix-primary);
            border-bottom-color: var(--matrix-primary);
        }

        .matrix-tab-btn i {
            font-size: 1.125rem;
        }

        /* マトリックス表示エリア */
        .matrix-content-area {
            padding: var(--space-xl);
            min-height: 400px;
        }

        /* エクセル風グリッド */
        .shipping-matrix-grid {
            display: grid;
            gap: 1px;
            background: var(--border-medium);
            border: 2px solid var(--border-medium);
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-md);
        }

        .matrix-cell {
            background: var(--bg-secondary);
            padding: var(--space-sm) var(--space-md);
            text-align: center;
            position: relative;
            transition: all 0.2s ease;
            min-height: 45px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .matrix-cell.header {
            background: var(--bg-quaternary);
            font-weight: 700;
            color: var(--text-primary);
            position: sticky;
            top: 0;
            z-index: 10;
            border-bottom: 2px solid var(--border-dark);
        }

        .matrix-cell.service-name {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            text-align: left;
            font-weight: 600;
            color: var(--text-primary);
            border-right: 2px solid var(--border-dark);
        }

        .matrix-cell.price {
            cursor: pointer;
            font-weight: 600;
            color: var(--matrix-primary);
        }

        .matrix-cell.price:hover {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            transform: scale(1.05);
            box-shadow: var(--shadow-md);
            z-index: 5;
        }

        .matrix-cell.price.cheapest {
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
            border: 2px solid var(--matrix-success);
            font-weight: 700;
        }

        .matrix-cell.price.fastest {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid var(--matrix-warning);
            font-weight: 700;
        }
        
        .matrix-cell.price.estimated {
            background: linear-gradient(135deg, #fff8dc 0%, #ffeaa7 100%);
            border: 2px dashed #fdcb6e;
            position: relative;
        }
        
        .matrix-cell.price.estimated:hover {
            background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
            transform: scale(1.02);
        }
        
        .price-value {
            font-weight: 700;
            font-size: 0.95rem;
            margin-bottom: 2px;
        }
        
        .estimated-label {
            font-size: 0.7rem;
            background: #fdcb6e;
            color: #2d3436;
            padding: 1px 4px;
            border-radius: 3px;
            font-weight: 600;
        }
        
        .real-data-label {
            font-size: 0.7rem;
            background: #00b894;
            color: white;
            padding: 1px 4px;
            border-radius: 3px;
            font-weight: 600;
        }
        
        .matrix-cell.no-data {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            color: #6c757d;
            text-align: center;
            cursor: default;
        }
        
        .no-data-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            opacity: 0.7;
        }
        
        .no-data-content i {
            font-size: 1.2rem;
            margin-bottom: 2px;
        }

        /* 詳細表示ポップアップ */
        .price-breakdown {
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-secondary);
            border: 2px solid var(--border-dark);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            box-shadow: var(--shadow-xl);
            z-index: 100;
            min-width: 280px;
            max-width: 400px;
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s ease;
        }

        .price-breakdown.show {
            opacity: 1;
            visibility: visible;
        }

        .breakdown-header {
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: var(--space-md);
            padding-bottom: var(--space-sm);
            border-bottom: 2px solid var(--border-light);
        }

        .breakdown-table {
            width: 100%;
            margin-bottom: var(--space-md);
        }

        .breakdown-table td {
            padding: var(--space-xs) 0;
            border-bottom: 1px solid var(--border-light);
        }

        .breakdown-table td:first-child {
            color: var(--text-secondary);
        }

        .breakdown-table td:last-child {
            text-align: right;
            font-weight: 600;
            color: var(--text-primary);
        }

        .breakdown-table tr.total td {
            font-weight: 700;
            font-size: 1.125rem;
            color: var(--matrix-primary);
            border-top: 2px solid var(--border-dark);
            padding-top: var(--space-sm);
        }

        .delivery-info {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .delivery-info p {
            margin-bottom: var(--space-xs);
            display: flex;
            align-items: center;
            gap: var(--space-xs);
        }

        .delivery-info i {
            color: var(--matrix-accent);
            width: 16px;
        }

        /* 比較タブ専用スタイル */
        .comparison-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: var(--space-lg);
        }

        .comparison-card {
            background: var(--bg-secondary);
            border: 2px solid var(--border-light);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            box-shadow: var(--shadow-sm);
            transition: all 0.2s ease;
        }

        .comparison-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }

        .comparison-card.best-price {
            border-color: var(--matrix-success);
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }

        .comparison-card.best-speed {
            border-color: var(--matrix-warning);
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-md);
        }

        .card-title {
            font-weight: 700;
            color: var(--text-primary);
        }

        .card-badge {
            padding: var(--space-xs) var(--space-sm);
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
        }

        .card-badge.best {
            background: var(--matrix-success);
            color: var(--text-inverse);
        }

        .card-badge.fast {
            background: var(--matrix-warning);
            color: var(--text-inverse);
        }

        .card-price {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--matrix-primary);
            margin-bottom: var(--space-sm);
        }

        .card-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--space-sm);
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .card-detail {
            display: flex;
            align-items: center;
            gap: var(--space-xs);
        }

        .card-detail i {
            color: var(--matrix-accent);
            width: 14px;
        }

        /* ローディング状態 */
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(248, 250, 252, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-xl);
            z-index: 50;
        }

        .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid var(--border-light);
            border-top: 4px solid var(--matrix-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* レスポンシブ */
        @media (max-width: 768px) {
            .matrix-container {
                padding: var(--space-md);
            }
            
            .conditions-grid {
                grid-template-columns: 1fr;
            }
            
            .matrix-tab-navigation {
                flex-direction: column;
            }
            
            .shipping-matrix-grid {
                font-size: 0.875rem;
            }
            
            .matrix-cell {
                padding: var(--space-xs) var(--space-sm);
                min-height: 35px;
            }
            
            .comparison-grid {
                grid-template-columns: 1fr;
            }
        }

        /* アニメーション */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .matrix-content-area > * {
            animation: fadeIn 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="matrix-container">
        <!-- ヘッダー -->
        <div class="matrix-header">
            <h1><i class="fas fa-table"></i> 送料マトリックス - タブ式UI</h1>
            <p>業者別・サービス別の詳細料金比較と最適配送オプション選択</p>
        </div>

        <!-- 条件設定パネル -->
        <div class="matrix-conditions">
            <div class="conditions-grid">
                <div class="condition-item">
                    <label class="condition-label">
                        <i class="fas fa-map-marker-alt"></i>
                        配送先国
                    </label>
                    <select id="matrixDestination" class="condition-select" required>
                        <option value="">-- 国を選択 --</option>
                        <option value="US">🇺🇸 アメリカ合衆国</option>
                        <option value="CA">🇨🇦 カナダ</option>
                        <option value="GB">🇬🇧 イギリス</option>
                        <option value="DE">🇩🇪 ドイツ</option>
                        <option value="FR">🇫🇷 フランス</option>
                        <option value="AU">🇦🇺 オーストラリア</option>
                        <option value="KR">🇰🇷 韓国</option>
                        <option value="CN">🇨🇳 中国</option>
                        <option value="TW">🇹🇼 台湾</option>
                        <option value="HK">🇭🇰 香港</option>
                        <option value="SG">🇸🇬 シンガポール</option>
                    </select>
                </div>

                <div class="condition-item">
                    <label class="condition-label">
                        <i class="fas fa-weight"></i>
                        最大重量 (kg)
                    </label>
                    <input type="number" id="matrixMaxWeight" class="condition-input" 
                           value="20.0" min="0.5" max="70" step="0.5">
                </div>

                <div class="condition-item">
                    <label class="condition-label">
                        <i class="fas fa-step-forward"></i>
                        重量刻み (kg)
                    </label>
                    <select id="matrixWeightStep" class="condition-select">
                        <option value="0.5" selected>0.5kg刻み（推奨）</option>
                        <option value="1.0">1.0kg刻み</option>
                        <option value="2.0">2.0kg刻み</option>
                        <option value="5.0">5.0kg刻み</option>
                    </select>
                </div>

                <div class="condition-item">
                    <label class="condition-label">
                        <i class="fas fa-filter"></i>
                        表示タイプ
                    </label>
                    <select id="matrixDisplayType" class="condition-select">
                        <option value="all">全て表示</option>
                        <option value="economy">エコノミーのみ</option>
                        <option value="express">エクスプレスのみ</option>
                        <option value="courier">クーリエのみ</option>
                    </select>
                </div>
            </div>

            <div style="display: flex; justify-content: center; gap: var(--space-md);">
                <button class="generate-button" onclick="generateMatrix()" id="generateBtn">
                    <i class="fas fa-cogs"></i>
                    マトリックス生成
                </button>
            </div>
        </div>

        <!-- タブ式マトリックス表示 -->
        <div class="matrix-tab-container" id="matrixTabContainer" style="display: none;">
            <div class="matrix-tab-navigation" id="matrixTabNav">
                <!-- タブは動的生成 -->
            </div>
            
            <div class="matrix-content-area" id="matrixContentArea">
                <!-- マトリックス内容は動的生成 -->
            </div>
        </div>
    </div>

    <!-- JavaScript -->
    <script src="../js/matrix_manager.js"></script>
    <script>
        // グローバル変数
        let matrixData = null;
        let currentTab = 'emoji';
        let currentBreakdown = null;

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('タブ式マトリックスUI 初期化完了');
            
            // CSRFトークン設定
            window.csrfToken = '<?= $_SESSION['matrix_csrf_token'] ?>';
        });

        // マトリックス生成
        async function generateMatrix() {
            const destination = document.getElementById('matrixDestination').value;
            const maxWeight = parseFloat(document.getElementById('matrixMaxWeight').value);
            const weightStep = parseFloat(document.getElementById('matrixWeightStep').value);
            const displayType = document.getElementById('matrixDisplayType').value;

            if (!destination) {
                alert('配送先国を選択してください');
                return;
            }

            showLoading();

            try {
                const response = await fetch('../api/matrix_data_api.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': window.csrfToken
                    },
                    body: JSON.stringify({
                        action: 'get_tabbed_matrix',
                        destination: destination,
                        max_weight: maxWeight,
                        weight_step: weightStep,
                        display_type: displayType
                    })
                });

                const result = await response.json();

                if (result.success) {
                    matrixData = result.data;
                    displayTabbedMatrix(result.data);
                } else {
                    throw new Error(result.message || 'マトリックス生成に失敗しました');
                }

            } catch (error) {
                console.error('Matrix generation error:', error);
                alert('マトリックス生成エラー: ' + error.message);
            } finally {
                hideLoading();
            }
        }

        // タブ式マトリックス表示
        function displayTabbedMatrix(data) {
            const container = document.getElementById('matrixTabContainer');
            const navContainer = document.getElementById('matrixTabNav');
            
            // タブナビゲーション生成
            const carriers = ['emoji', 'cpass', 'jppost', 'comparison'];
            const carrierLabels = {
                'emoji': '<i class="fas fa-shipping-fast"></i> Emoji配送',
                'cpass': '<i class="fas fa-plane"></i> CPass配送',
                'jppost': '<i class="fas fa-mail-bulk"></i> 日本郵便',
                'comparison': '<i class="fas fa-balance-scale"></i> 料金比較'
            };

            navContainer.innerHTML = carriers.map(carrier => `
                <button class="matrix-tab-btn ${carrier === 'emoji' ? 'active' : ''}" 
                        data-tab="${carrier}" onclick="switchMatrixTab('${carrier}')">
                    ${carrierLabels[carrier]}
                </button>
            `).join('');

            // 最初のタブ（Emoji）を表示
            currentTab = 'emoji';
            displayCarrierMatrix('emoji');
            
            container.style.display = 'block';
        }

        // タブ切り替え
        function switchMatrixTab(tabName) {
            // タブボタンの状態更新
            document.querySelectorAll('.matrix-tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

            currentTab = tabName;

            // 既存の詳細表示を隠す
            hideAllBreakdowns();

            // タブ内容表示
            if (tabName === 'comparison') {
                displayComparisonView();
            } else {
                displayCarrierMatrix(tabName);
            }
        }

        // 業者別マトリックス表示
        function displayCarrierMatrix(carrierCode) {
            if (!matrixData || !matrixData.carriers[carrierCode]) {
                document.getElementById('matrixContentArea').innerHTML = `
                    <div style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: var(--space-md);"></i>
                        <p>このキャリアのデータがありません</p>
                    </div>
                `;
                return;
            }

            const carrierData = matrixData.carriers[carrierCode];
            const weightSteps = matrixData.weight_steps;
            
            // 重量ステップが多い場合は表示を調整
            const displayWeightSteps = weightSteps.length > 20 ? 
                weightSteps.filter((w, i) => i % 2 === 0 || w <= 5) : // 5kg以下は全表示、それ以降は2つおき
                weightSteps;
            
            // ヘッダー行生成
            const headers = ['サービス', ...displayWeightSteps.map(w => `${w}kg`)];
            
            // グリッドスタイル設定（重量列数に応じて調整）
            const columnWidth = displayWeightSteps.length > 15 ? '80px' : '100px';
            const gridColumns = `200px repeat(${displayWeightSteps.length}, minmax(${columnWidth}, 1fr))`;
            
            let matrixHtml = `
                <div class="shipping-matrix-grid" style="grid-template-columns: ${gridColumns}; font-size: ${displayWeightSteps.length > 15 ? '0.8rem' : '1rem'};">
                    ${headers.map(header => `
                        <div class="matrix-cell header">${header}</div>
                    `).join('')}
            `;

            // 各サービスの料金行生成
            const services = Object.keys(carrierData);
            services.forEach(serviceName => {
                const serviceData = carrierData[serviceName];
                
                matrixHtml += `
                    <div class="matrix-cell service-name">${serviceName}</div>
                `;
                
                displayWeightSteps.forEach(weight => {
                    const priceData = serviceData[weight];
                    if (priceData) {
                        const isChepest = priceData.is_cheapest ? ' cheapest' : '';
                        const isFastest = priceData.is_fastest ? ' fastest' : '';
                        const isEstimated = priceData.estimated ? ' estimated' : '';
                        
                        matrixHtml += `
                            <div class="matrix-cell price${isChepest}${isFastest}${isEstimated}" 
                                 onclick="showPriceBreakdown(this, '${serviceName}', ${weight}, '${carrierCode}'); return false;"
                                 data-service="${serviceName}" data-weight="${weight}" data-carrier="${carrierCode}"
                                 title="${serviceName} ${weight}kg - ¥${priceData.price.toLocaleString()}${priceData.estimated ? ' (推定値)' : ' (実データ)'}">
                                <div class="price-value">¥${priceData.price.toLocaleString()}</div>
                                ${priceData.estimated ? '<div class="estimated-label">推定</div>' : '<div class="real-data-label">実データ</div>'}
                                <div class="price-breakdown" style="display: none;">
                                    <div class="breakdown-header">${serviceName} - ${weight}kg</div>
                                    <table class="breakdown-table">
                                        <tr><td>基本料金:</td><td>¥${(priceData.breakdown?.base_price || Math.round(priceData.price * 0.7)).toLocaleString()}</td></tr>
                                        <tr><td>重量追加:</td><td>¥${(priceData.breakdown?.weight_surcharge || Math.round(priceData.price * 0.2)).toLocaleString()}</td></tr>
                                        <tr><td>燃料サーチャージ:</td><td>¥${(priceData.breakdown?.fuel_surcharge || Math.round(priceData.price * 0.1)).toLocaleString()}</td></tr>
                                        <tr><td>その他手数料:</td><td>¥${(priceData.breakdown?.other_fees || 0).toLocaleString()}</td></tr>
                                        <tr class="total"><td><strong>合計:</strong></td><td><strong>¥${priceData.price.toLocaleString()}</strong></td></tr>
                                    </table>
                                    <div class="delivery-info">
                                        <p><i class="fas fa-clock"></i> 配送日数: ${priceData.delivery_days || '2-5'}日</p>
                                        <p><i class="fas fa-shield-alt"></i> 保険: ${priceData.has_insurance ? '有' : '無'}</p>
                                        <p><i class="fas fa-search"></i> 追跡: ${priceData.has_tracking ? '有' : '無'}</p>
                                        <p><i class="fas fa-database"></i> データ: ${priceData.estimated ? '推定値（PDFデータ未抽出）' : '実データ（PDFから抽出）'}</p>
                                        ${priceData.weight_range ? `<p><i class="fas fa-balance-scale"></i> 重量範囲: ${priceData.weight_range.from_g/1000}kg-${priceData.weight_range.to_g/1000}kg</p>` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        matrixHtml += `
                            <div class="matrix-cell no-data" 
                                 title="${weight}kg: この重量のデータがありません">
                                <div class="no-data-content">
                                    <i class="fas fa-minus"></i>
                                    <small>データなし</small>
                                </div>
                            </div>
                        `;
                    }
                });
            });

            matrixHtml += '</div>';
            
            // 重量表示数の情報
            if (weightSteps.length !== displayWeightSteps.length) {
                matrixHtml += `
                    <div style="margin-top: var(--space-md); padding: var(--space-sm); background: #e3f2fd; border-radius: var(--radius-md); font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> 
                        表示: ${displayWeightSteps.length}列 / 全${weightSteps.length}列 
                        （5kg以下は全表示、以降は間引き表示）
                    </div>
                `;
            }
            
            document.getElementById('matrixContentArea').innerHTML = matrixHtml;
        }

        // 比較ビュー表示
        function displayComparisonView() {
            if (!matrixData || !matrixData.comparison_data) {
                document.getElementById('matrixContentArea').innerHTML = `
                    <div style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: var(--space-md);"></i>
                        <p>比較データがありません</p>
                    </div>
                `;
                return;
            }

            const comparisonData = matrixData.comparison_data;
            
            let comparisonHtml = `
                <div style="margin-bottom: var(--space-lg);">
                    <h3 style="color: var(--text-primary); margin-bottom: var(--space-md);">
                        <i class="fas fa-chart-line"></i> 全業者料金比較
                    </h3>
                    <p style="color: var(--text-secondary);">
                        ${matrixData.destination} 向け送料の業者間比較。価格と配送日数を総合的に比較できます。
                    </p>
                </div>
                
                <div class="comparison-grid">
            `;

            // 重量別の最安・最速オプション表示
            matrixData.weight_steps.forEach(weight => {
                const weightData = comparisonData[weight];
                if (weightData) {
                    const cheapest = weightData.cheapest;
                    const fastest = weightData.fastest;
                    
                    comparisonHtml += `
                        <div class="comparison-card">
                            <div class="card-header">
                                <h4 class="card-title">${weight}kg</h4>
                            </div>
                            
                            ${cheapest ? `
                                <div class="comparison-card best-price" style="margin-bottom: var(--space-md);">
                                    <div class="card-header">
                                        <span class="card-title">💰 最安オプション</span>
                                        <span class="card-badge best">BEST</span>
                                    </div>
                                    <div class="card-price">¥${cheapest.price.toLocaleString()}</div>
                                    <div class="card-details">
                                        <div class="card-detail">
                                            <i class="fas fa-truck"></i>
                                            ${cheapest.service_name}
                                        </div>
                                        <div class="card-detail">
                                            <i class="fas fa-clock"></i>
                                            ${cheapest.delivery_days}日
                                        </div>
                                        <div class="card-detail">
                                            <i class="fas fa-building"></i>
                                            ${cheapest.carrier}
                                        </div>
                                        <div class="card-detail">
                                            <i class="fas fa-dollar-sign"></i>
                                            $${(cheapest.price / 150).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${fastest ? `
                                <div class="comparison-card best-speed">
                                    <div class="card-header">
                                        <span class="card-title">⚡ 最速オプション</span>
                                        <span class="card-badge fast">FAST</span>
                                    </div>
                                    <div class="card-price">¥${fastest.price.toLocaleString()}</div>
                                    <div class="card-details">
                                        <div class="card-detail">
                                            <i class="fas fa-truck"></i>
                                            ${fastest.service_name}
                                        </div>
                                        <div class="card-detail">
                                            <i class="fas fa-clock"></i>
                                            ${fastest.delivery_days}日
                                        </div>
                                        <div class="card-detail">
                                            <i class="fas fa-building"></i>
                                            ${fastest.carrier}
                                        </div>
                                        <div class="card-detail">
                                            <i class="fas fa-dollar-sign"></i>
                                            $${(fastest.price / 150).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }
            });

            comparisonHtml += '</div>';
            document.getElementById('matrixContentArea').innerHTML = comparisonHtml;
        }

        // 詳細表示制御
        function showPriceBreakdown(cell, serviceName, weight, carrier) {
            // イベントの伝播を停止
            event.stopPropagation();
            
            // 他の詳細表示を隠す
            hideAllBreakdowns();
            
            const breakdown = cell.querySelector('.price-breakdown');
            if (breakdown) {
                breakdown.style.display = 'block';
                breakdown.style.zIndex = '1000';
                
                // アニメーション付きで表示
                setTimeout(() => {
                    breakdown.classList.add('show');
                }, 10);
                
                currentBreakdown = breakdown;
                
                // 外側クリック用リスナー（遅延追加）
                setTimeout(() => {
                    document.addEventListener('click', outsideClickHandler, true);
                }, 200);
                
                console.log(`💰 価格詳細表示: ${serviceName} ${weight}kg ${carrier}`);
            }
        }

        function hideAllBreakdowns() {
            document.querySelectorAll('.price-breakdown').forEach(breakdown => {
                breakdown.classList.remove('show');
                setTimeout(() => {
                    breakdown.style.display = 'none';
                }, 300); // アニメーション時間を延長
            });
            
            document.removeEventListener('click', outsideClickHandler, true);
            currentBreakdown = null;
        }

        function outsideClickHandler(event) {
            // より厳密な外側クリック判定
            if (currentBreakdown && 
                !currentBreakdown.contains(event.target) && 
                !event.target.closest('.matrix-cell.price')) {
                
                event.preventDefault();
                hideAllBreakdowns();
            }
        }

        // ローディング制御
        function showLoading() {
            const btn = document.getElementById('generateBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
        }

        function hideLoading() {
            const btn = document.getElementById('generateBtn');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cogs"></i> マトリックス生成';
        }

        console.log('タブ式マトリックスUI JavaScript 初期化完了');
    </script>
</body>
</html>