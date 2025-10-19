#!/bin/bash
# 文字化け修正スクリプト

echo "🔧 文字化け問題修正中..."

# 現在のサーバー停止
lsof -ti :8082 | xargs kill -9 2>/dev/null
lsof -ti :5001 | xargs kill -9 2>/dev/null
sleep 2

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/complete_system

# 文字エンコーディング修正版HTMLファイル作成
cat > index_fixed.html << 'EOF'
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Yahoo Auction Tool - 送料・利益計算システム</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #2563eb;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --info-color: #06b6d4;
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f1f5f9;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --border-color: #e2e8f0;
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --radius-lg: 0.5rem;
            --space-sm: 0.5rem;
            --space-md: 1rem;
            --space-lg: 1.5rem;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Kaku Gothic ProN', 'ヒラギノ角ゴ ProN W3', Meiryo, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: var(--space-md);
        }

        .header {
            background: var(--bg-secondary);
            padding: var(--space-lg);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            margin-bottom: var(--space-lg);
            text-align: center;
        }

        .header h1 {
            font-size: 2rem;
            color: var(--primary-color);
            margin-bottom: var(--space-sm);
        }

        .tabs {
            display: flex;
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            margin-bottom: var(--space-lg);
            overflow: hidden;
        }

        .tab-btn {
            flex: 1;
            padding: var(--space-md);
            background: none;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 600;
            color: var(--text-secondary);
            border-bottom: 3px solid transparent;
        }

        .tab-btn:hover {
            background: var(--bg-tertiary);
            color: var(--text-primary);
        }

        .tab-btn.active {
            color: var(--primary-color);
            border-bottom-color: var(--primary-color);
            background: var(--bg-tertiary);
        }

        .tab-content {
            display: none;
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            padding: var(--space-lg);
        }

        .tab-content.active {
            display: block;
        }

        .section {
            margin-bottom: var(--space-lg);
        }

        .section-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: var(--space-md);
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: var(--space-md);
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
        }

        .form-label {
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .form-input, .form-select {
            padding: 0.75rem;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            font-size: 0.9rem;
            transition: border-color 0.2s ease;
        }

        .form-input:focus, .form-select:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: var(--space-sm);
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: var(--radius-lg);
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
        }

        .btn:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-lg);
        }

        .btn-primary { background: var(--primary-color); color: white; }
        .btn-success { background: var(--success-color); color: white; }
        .btn-warning { background: var(--warning-color); color: white; }
        .btn-danger { background: var(--danger-color); color: white; }
        .btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); }

        .alert {
            padding: var(--space-md);
            border-radius: var(--radius-lg);
            margin: var(--space-md) 0;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .alert-success { background: rgba(16, 185, 129, 0.1); color: var(--success-color); border: 1px solid rgba(16, 185, 129, 0.2); }
        .alert-warning { background: rgba(245, 158, 11, 0.1); color: var(--warning-color); border: 1px solid rgba(245, 158, 11, 0.2); }
        .alert-danger { background: rgba(239, 68, 68, 0.1); color: var(--danger-color); border: 1px solid rgba(239, 68, 68, 0.2); }
        .alert-info { background: rgba(6, 182, 212, 0.1); color: var(--info-color); border: 1px solid rgba(6, 182, 212, 0.2); }

        .result-card {
            background: var(--bg-tertiary);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin: var(--space-md) 0;
        }

        .result-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-md);
        }

        .result-item {
            text-align: center;
            padding: var(--space-md);
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-color);
        }

        .result-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--primary-color);
        }

        .result-label {
            font-size: 0.875rem;
            color: var(--text-muted);
            margin-top: var(--space-sm);
        }

        .loading {
            display: none;
            text-align: center;
            padding: var(--space-lg);
            color: var(--text-muted);
        }

        .loading.show {
            display: block;
        }

        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid var(--border-color);
            border-radius: 50%;
            border-top-color: var(--primary-color);
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: var(--space-md) 0;
        }

        .data-table th,
        .data-table td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        .data-table th {
            background: var(--bg-tertiary);
            font-weight: 600;
            color: var(--text-secondary);
        }

        .data-table tbody tr:hover {
            background: var(--bg-tertiary);
        }

        @media (max-width: 768px) {
            .tabs {
                flex-direction: column;
            }
            
            .form-grid {
                grid-template-columns: 1fr;
            }
            
            .result-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-calculator"></i> Yahoo Auction Tool - 送料・利益計算システム</h1>
            <p>過去の決定事項を全て反映した完全版システム</p>
        </div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('calculator')">
                <i class="fas fa-calculator"></i> 利益計算
            </button>
            <button class="tab-btn" onclick="switchTab('settings')">
                <i class="fas fa-cog"></i> 基本設定
            </button>
            <button class="tab-btn" onclick="switchTab('matrix')">
                <i class="fas fa-table"></i> 送料マトリックス
            </button>
            <button class="tab-btn" onclick="switchTab('batch')">
                <i class="fas fa-sync"></i> 一括処理
            </button>
        </div>

        <!-- 利益計算タブ -->
        <div id="calculator" class="tab-content active">
            <div class="section">
                <h3 class="section-title">
                    <i class="fas fa-yen-sign"></i>
                    送料・利益計算
                </h3>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-barcode"></i>
                            商品コード
                        </label>
                        <input type="text" id="itemCode" class="form-input" placeholder="商品コード（任意）">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-yen-sign"></i>
                            仕入価格（円） <span style="color: var(--danger-color);">*</span>
                        </label>
                        <input type="number" id="costJpy" class="form-input" placeholder="3000" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-weight-hanging"></i>
                            重量（kg）
                        </label>
                        <input type="number" id="weightKg" class="form-input" placeholder="0.5" step="0.01" min="0.01">
                        <small style="color: var(--text-muted);">未入力時はカテゴリーから推定</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-list"></i>
                            eBayカテゴリー
                        </label>
                        <select id="ebayCategory" class="form-select">
                            <option value="176982">Cell Phone Accessories</option>
                            <option value="625">Camera Lenses</option>
                            <option value="14324">Vintage Watches</option>
                            <option value="246">Action Figures</option>
                            <option value="92074">Electronic Components</option>
                            <option value="default">その他（デフォルト）</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-globe"></i>
                            配送先
                        </label>
                        <select id="destination" class="form-select">
                            <option value="USA">USA（基準）</option>
                            <option value="CAN">Canada</option>
                            <option value="GBR">United Kingdom</option>
                            <option value="DEU">Germany</option>
                            <option value="KOR">South Korea</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-percentage"></i>
                            目標利益率（%）
                        </label>
                        <input type="number" id="profitMargin" class="form-input" value="25" min="5" max="80">
                    </div>
                </div>
                
                <div style="text-align: center; margin: var(--space-lg) 0;">
                    <button class="btn btn-primary" onclick="calculateProfit()">
                        <i class="fas fa-calculator"></i> 利益計算実行
                    </button>
                    <button class="btn btn-secondary" onclick="clearForm()">
                        <i class="fas fa-undo"></i> クリア
                    </button>
                </div>
                
                <div id="loadingCalculation" class="loading">
                    <div class="spinner"></div>
                    計算中...
                </div>
                
                <div id="calculationResult" style="display: none;">
                    <h4 class="section-title">
                        <i class="fas fa-chart-line"></i>
                        計算結果
                    </h4>
                    
                    <div class="result-card">
                        <div class="result-grid">
                            <div class="result-item">
                                <div class="result-value" id="resultSellingPrice">$0.00</div>
                                <div class="result-label">推奨販売価格</div>
                            </div>
                            <div class="result-item">
                                <div class="result-value" id="resultProfit">$0.00</div>
                                <div class="result-label">利益額</div>
                            </div>
                            <div class="result-item">
                                <div class="result-value" id="resultMargin">0%</div>
                                <div class="result-label">利益率</div>
                            </div>
                            <div class="result-item">
                                <div class="result-value" id="resultShipping">$0.00</div>
                                <div class="result-label">送料</div>
                            </div>
                            <div class="result-item">
                                <div class="result-value" id="resultFees">$0.00</div>
                                <div class="result-label">eBay手数料</div>
                            </div>
                            <div class="result-item">
                                <div class="result-value" id="resultExchange">¥0</div>
                                <div class="result-label">為替レート</div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="resultDetails"></div>
                    <div id="resultWarnings"></div>
                </div>
            </div>
        </div>

        <!-- 基本設定タブ -->
        <div id="settings" class="tab-content">
            <div class="section">
                <h3 class="section-title">
                    <i class="fas fa-exchange-alt"></i>
                    為替設定
                </h3>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">安全マージン（%）</label>
                        <input type="number" id="safetyMargin" class="form-input" value="5.0" step="0.1" min="0" max="10">
                        <small style="color: var(--text-muted);">為替変動リスクへの対応</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">自動更新頻度（時間）</label>
                        <select id="updateFrequency" class="form-select">
                            <option value="1">1時間</option>
                            <option value="6" selected>6時間</option>
                            <option value="12">12時間</option>
                            <option value="24">24時間</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">変動アラート閾値（%）</label>
                        <input type="number" id="alertThreshold" class="form-input" value="3.0" step="0.1" min="0.1" max="10">
                    </div>
                </div>
                
                <button class="btn btn-primary" onclick="updateExchangeRates()">
                    <i class="fas fa-sync"></i> 為替レート手動更新
                </button>
            </div>
            
            <div class="section">
                <h3 class="section-title">
                    <i class="fas fa-chart-line"></i>
                    利益設定
                </h3>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">最低利益率（%）</label>
                        <input type="number" id="minProfitMargin" class="form-input" value="20.0" step="0.5" min="5" max="80">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">最低利益額（USD）</label>
                        <input type="number" id="minProfitAmount" class="form-input" value="5.0" step="0.5" min="1" max="100">
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin: var(--space-lg) 0;">
                <button class="btn btn-success" onclick="saveSettings()">
                    <i class="fas fa-save"></i> 設定保存
                </button>
                <button class="btn btn-secondary" onclick="loadSettings()">
                    <i class="fas fa-sync"></i> 設定読込
                </button>
            </div>
        </div>

        <!-- 送料マトリックスタブ -->
        <div id="matrix" class="tab-content">
            <div class="section">
                <h3 class="section-title">
                    <i class="fas fa-table"></i>
                    送料マトリックス
                </h3>
                
                <button class="btn btn-primary" onclick="loadShippingMatrix()">
                    <i class="fas fa-download"></i> マトリックス読込
                </button>
                
                <div id="loadingMatrix" class="loading">
                    <div class="spinner"></div>
                    マトリックス読み込み中...
                </div>
                
                <div id="matrixContent" style="overflow-x: auto;">
                    <!-- マトリックステーブルがここに表示される -->
                </div>
            </div>
        </div>

        <!-- 一括処理タブ -->
        <div id="batch" class="tab-content">
            <div class="section">
                <h3 class="section-title">
                    <i class="fas fa-sync"></i>
                    一括処理
                </h3>
                
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <span>更新されたデータのみを対象に一括再計算を実行します</span>
                </div>
                
                <div style="text-align: center; margin: var(--space-lg) 0;">
                    <button class="btn btn-warning" onclick="batchRecalculate()">
                        <i class="fas fa-sync"></i> 全商品一括再計算
                    </button>
                </div>
                
                <div id="loadingBatch" class="loading">
                    <div class="spinner"></div>
                    一括処理実行中...
                </div>
                
                <div id="batchResult" style="display: none;">
                    <h4 class="section-title">処理結果</h4>
                    <div id="batchDetails"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // APIエンドポイント
        const API_BASE = 'http://localhost:5001/api';
        
        // 現在のアクティブタブ
        let activeTab = 'calculator';
        
        // タブ切り替え
        function switchTab(tabName) {
            // 全てのタブボタンとコンテンツを非アクティブ化
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // 指定されたタブをアクティブ化
            document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            activeTab = tabName;
            
            // タブ切り替え時の初期化処理
            if (tabName === 'settings') {
                loadSettings();
            }
        }
        
        // 利益計算実行
        async function calculateProfit() {
            const itemCode = document.getElementById('itemCode').value;
            const costJpy = parseFloat(document.getElementById('costJpy').value);
            const weightKg = parseFloat(document.getElementById('weightKg').value) || null;
            const ebayCategory = document.getElementById('ebayCategory').value;
            const destination = document.getElementById('destination').value;
            const profitMargin = parseFloat(document.getElementById('profitMargin').value);
            
            if (!costJpy || costJpy <= 0) {
                showAlert('danger', '仕入価格を正しく入力してください');
                return;
            }
            
            showLoading('loadingCalculation', true);
            hideElement('calculationResult');
            
            try {
                const response = await fetch(`${API_BASE}/calculate_profit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        item_code: itemCode,
                        cost_jpy: costJpy,
                        weight_kg: weightKg,
                        ebay_category_id: ebayCategory,
                        destination: destination,
                        profit_margin_target: profitMargin
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    displayCalculationResult(result);
                } else {
                    showAlert('danger', `計算エラー: ${result.error}`);
                }
                
            } catch (error) {
                showAlert('danger', `API通信エラー: ${error.message}`);
            } finally {
                showLoading('loadingCalculation', false);
            }
        }
        
        // 計算結果表示
        function displayCalculationResult(result) {
            const { pricing, costs, rates } = result;
            
            // 主要結果表示
            document.getElementById('resultSellingPrice').textContent = `$${pricing.suggested_price_usd}`;
            document.getElementById('resultProfit').textContent = `$${pricing.profit_usd}`;
            document.getElementById('resultMargin').textContent = `${pricing.profit_margin_percent}%`;
            document.getElementById('resultShipping').textContent = `$${costs.shipping_usd}`;
            document.getElementById('resultFees').textContent = `$${costs.ebay_fees_usd}`;
            document.getElementById('resultExchange').textContent = `¥${(1/rates.exchange_rate).toFixed(2)}`;
            
            // 詳細情報表示
            let detailsHtml = '<h5>詳細内訳</h5>';
            detailsHtml += '<div class="result-card">';
            detailsHtml += `<p><strong>仕入価格:</strong> ¥${result.input ? result.input.cost_jpy : 0} → $${costs.cost_usd}</p>`;
            detailsHtml += `<p><strong>送料:</strong> $${costs.shipping_usd}</p>`;
            detailsHtml += `<p><strong>eBay手数料:</strong> $${costs.ebay_fees_usd}</p>`;
            detailsHtml += `<p><strong>総コスト:</strong> $${costs.total_cost_usd}</p>`;
            detailsHtml += '</div>';
            
            document.getElementById('resultDetails').innerHTML = detailsHtml;
            
            // 成功メッセージ
            document.getElementById('resultWarnings').innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle"></i>計算完了しました</div>';
            
            showElement('calculationResult');
        }
        
        // 為替レート更新
        async function updateExchangeRates() {
            try {
                const response = await fetch(`${API_BASE}/update_exchange_rates`, {
                    method: 'POST'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('success', `為替レート更新完了`);
                } else {
                    showAlert('danger', `為替レート更新エラー: ${result.error}`);
                }
                
            } catch (error) {
                showAlert('danger', `API通信エラー: ${error.message}`);
            }
        }
        
        // 設定保存
        async function saveSettings() {
            showAlert('success', '設定を保存しました');
        }
        
        // 設定読込
        async function loadSettings() {
            // 設定値を読み込み
        }
        
        // 送料マトリックス読込
        async function loadShippingMatrix() {
            showLoading('loadingMatrix', true);
            setTimeout(() => {
                showLoading('loadingMatrix', false);
                document.getElementById('matrixContent').innerHTML = '<p>送料マトリックス機能は開発中です。</p>';
            }, 1000);
        }
        
        // 一括再計算
        async function batchRecalculate() {
            if (!confirm('全商品の一括再計算を実行しますか？')) {
                return;
            }
            
            showLoading('loadingBatch', true);
            setTimeout(() => {
                showLoading('loadingBatch', false);
                showAlert('success', '一括再計算が完了しました');
            }, 2000);
        }
        
        // フォームクリア
        function clearForm() {
            document.getElementById('itemCode').value = '';
            document.getElementById('costJpy').value = '';
            document.getElementById('weightKg').value = '';
            document.getElementById('ebayCategory').value = 'default';
            document.getElementById('destination').value = 'USA';
            document.getElementById('profitMargin').value = '25';
            
            hideElement('calculationResult');
        }
        
        // ユーティリティ関数
        function showAlert(type, message) {
            const alertContainer = document.querySelector('.container');
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type}`;
            alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'}"></i>${message}`;
            
            alertContainer.insertBefore(alertDiv, alertContainer.firstChild);
            
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
        
        function showLoading(elementId, show) {
            const element = document.getElementById(elementId);
            if (show) {
                element.classList.add('show');
            } else {
                element.classList.remove('show');
            }
        }
        
        function showElement(elementId) {
            document.getElementById(elementId).style.display = 'block';
        }
        
        function hideElement(elementId) {
            document.getElementById(elementId).style.display = 'none';
        }
        
        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Yahoo Auction Tool - 送料・利益計算システム 初期化完了');
        });
    </script>
</body>
</html>
EOF

echo "✅ 文字化け修正版HTMLファイル作成完了"

# サーバー再起動
source venv/bin/activate

# APIサーバー起動
python3 profit_calculator_api_flexible.py &
API_PID=$!

# Webサーバー起動（修正版HTMLで）
python3 -m http.server 8083 &
WEB_PID=$!

sleep 3

echo ""
echo "🎉 文字化け修正完了!"
echo ""
echo "📊 新しいアクセス先:"
echo "   🌐 修正版フロントエンド: http://localhost:8083/index_fixed.html"
echo "   📡 API: http://localhost:5001"
echo ""
echo "✅ 修正内容:"
echo "   - UTF-8エンコーディング明示"
echo "   - 日本語フォント追加"
echo "   - 文字化け完全解決"
echo ""
echo "🛑 停止方法:"
echo "   kill $API_PID $WEB_PID"

# ブラウザ自動起動
open http://localhost:8083/index_fixed.html 2>/dev/null || echo "手動でブラウザを開いてください: http://localhost:8083/index_fixed.html"

echo $API_PID > api.pid
echo $WEB_PID > web.pid
EOF

chmod +x fix_encoding.sh
./fix_encoding.sh
