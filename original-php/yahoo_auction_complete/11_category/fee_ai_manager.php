<?php
/**
 * eBay手数料AI解析管理UI
 * ファイル: fee_ai_manager.php  
 * AI判定結果の確認・承認・修正機能
 */

session_start();
require_once 'backend/classes/EbayFeeAIParser.php';

// データベース接続
try {
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die('Database connection failed: ' . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBay手数料AI解析管理システム</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #2563eb;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --info: #06b6d4;
            --light: #f8fafc;
            --dark: #1f2937;
            --border: #e5e7eb;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--light);
            color: var(--dark);
            line-height: 1.6;
        }
        
        .header {
            background: linear-gradient(135deg, var(--primary), var(--info));
            color: white;
            padding: 2rem;
            text-align: center;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1.5rem;
        }
        
        .card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid var(--border);
        }
        
        .card-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
            text-decoration: none;
        }
        
        .btn:hover { background: #1d4ed8; }
        .btn-success { background: var(--success); }
        .btn-warning { background: var(--warning); }
        .btn-danger { background: var(--danger); }
        .btn-secondary { background: #6b7280; }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        .form-label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        
        .form-input, .form-textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border);
            border-radius: 6px;
            font-size: 1rem;
        }
        
        .form-textarea {
            min-height: 200px;
            resize: vertical;
        }
        
        .fee-item {
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            background: #f9fafb;
        }
        
        .fee-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .category-name {
            font-weight: 600;
            color: var(--dark);
        }
        
        .confidence-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .confidence-high { background: #d1fae5; color: #065f46; }
        .confidence-medium { background: #fef3c7; color: #92400e; }
        .confidence-low { background: #fee2e2; color: #991b1b; }
        
        .fee-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-top: 0.75rem;
        }
        
        .fee-detail {
            background: white;
            padding: 0.5rem;
            border-radius: 4px;
            text-align: center;
        }
        
        .fee-detail-label {
            font-size: 0.8rem;
            color: #6b7280;
            margin-bottom: 0.25rem;
        }
        
        .fee-detail-value {
            font-size: 1.1rem;
            font-weight: 600;
        }
        
        .tabs {
            display: flex;
            border-bottom: 2px solid var(--border);
            margin-bottom: 1.5rem;
        }
        
        .tab {
            background: none;
            border: none;
            padding: 1rem 1.5rem;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            transition: all 0.2s;
        }
        
        .tab.active {
            border-bottom-color: var(--primary);
            color: var(--primary);
            font-weight: 600;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .alert {
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .alert-success {
            background: #d1fae5;
            border: 1px solid #10b981;
            color: #065f46;
        }
        
        .alert-warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            color: #92400e;
        }
        
        .alert-error {
            background: #fee2e2;
            border: 1px solid #ef4444;
            color: #991b1b;
        }
        
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
        }
        
        @media (max-width: 768px) {
            .grid-2 { grid-template-columns: 1fr; }
        }
    </style>
</head>

<body>
    <div class="header">
        <h1><i class="fas fa-robot"></i> eBay手数料AI解析管理システム</h1>
        <p>手数料データをAIが自動解析・判定してカテゴリー別に格納</p>
    </div>

    <div class="container">
        <!-- タブナビゲーション -->
        <div class="tabs">
            <button class="tab active" onclick="switchTab('parse')">
                <i class="fas fa-brain"></i> AI解析実行
            </button>
            <button class="tab" onclick="switchTab('review')">
                <i class="fas fa-check-circle"></i> 解析結果確認
            </button>
            <button class="tab" onclick="switchTab('history')">
                <i class="fas fa-history"></i> 解析履歴
            </button>
            <button class="tab" onclick="switchTab('settings')">
                <i class="fas fa-cogs"></i> 設定
            </button>
        </div>

        <!-- AI解析実行タブ -->
        <div id="tab-parse" class="tab-content active">
            <div class="grid-2">
                <!-- 手動データ入力 -->
                <div class="card">
                    <div class="card-title">
                        <i class="fas fa-keyboard"></i>
                        手動データ解析
                    </div>
                    
                    <form id="manualParseForm">
                        <div class="form-group">
                            <label class="form-label">手数料データ入力</label>
                            <textarea id="feeDataInput" class="form-textarea" 
                                      placeholder="eBay公式サイトからの手数料データをペーストしてください...

例:
Final value fees:
- Cell Phones & Smartphones: 12.90%
- Cameras & Photo: 12.35%
- Clothing: 13.25%
- Books, Movies & Music: 15.30%"></textarea>
                        </div>
                        
                        <button type="submit" class="btn">
                            <i class="fas fa-magic"></i>
                            AI解析実行
                        </button>
                    </form>
                </div>

                <!-- 自動取得・解析 -->
                <div class="card">
                    <div class="card-title">
                        <i class="fas fa-download"></i>
                        自動取得・解析
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">取得元URL</label>
                        <input type="url" id="sourceUrl" class="form-input" 
                               value="https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees">
                    </div>
                    
                    <button onclick="fetchAndParse()" class="btn btn-success">
                        <i class="fas fa-robot"></i>
                        自動取得・AI解析
                    </button>
                    
                    <div class="alert alert-warning" style="margin-top: 1rem;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>注意:</strong> OpenAI API Keyが設定されている場合、高精度のAI解析が実行されます。
                            未設定の場合はルールベース解析にフォールバックします。
                        </div>
                    </div>
                </div>
            </div>

            <!-- 解析結果表示エリア -->
            <div id="parseResults" style="display: none;">
                <div class="card">
                    <div class="card-title">
                        <i class="fas fa-chart-line"></i>
                        解析結果
                    </div>
                    <div id="parseResultsContent"></div>
                </div>
            </div>
        </div>

        <!-- 解析結果確認タブ -->
        <div id="tab-review" class="tab-content">
            <div class="card">
                <div class="card-title">
                    <i class="fas fa-list"></i>
                    AI解析済み手数料データ
                    <button onclick="loadParsedFees()" class="btn btn-secondary" style="margin-left: auto;">
                        <i class="fas fa-refresh"></i>
                        更新
                    </button>
                </div>
                <div id="parsedFeesContainer">
                    <p style="text-align: center; color: #6b7280; padding: 2rem;">
                        「更新」ボタンをクリックして解析済みデータを読み込んでください
                    </p>
                </div>
            </div>
        </div>

        <!-- 解析履歴タブ -->
        <div id="tab-history" class="tab-content">
            <div class="card">
                <div class="card-title">
                    <i class="fas fa-clock"></i>
                    解析実行履歴
                </div>
                <div id="historyContainer">
                    <!-- 履歴データ表示 -->
                </div>
            </div>
        </div>

        <!-- 設定タブ -->
        <div id="tab-settings" class="tab-content">
            <div class="card">
                <div class="card-title">
                    <i class="fas fa-key"></i>
                    OpenAI API設定
                </div>
                
                <div class="form-group">
                    <label class="form-label">OpenAI API Key</label>
                    <input type="password" id="openaiApiKey" class="form-input" 
                           placeholder="sk-..." >
                    <small style="color: #6b7280;">
                        高精度AI解析のためにOpenAI API Keyを設定してください（オプション）
                    </small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">信頼度しきい値</label>
                    <input type="range" id="confidenceThreshold" min="0" max="100" value="60" 
                           oninput="document.getElementById('confidenceValue').textContent = this.value + '%'">
                    <small>この値未満の信頼度の解析結果は除外されます: <span id="confidenceValue">60%</span></small>
                </div>
                
                <button onclick="saveSettings()" class="btn">
                    <i class="fas fa-save"></i>
                    設定保存
                </button>
            </div>
        </div>
    </div>

    <script>
        // グローバル変数
        let currentParseResults = null;

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ eBay手数料AI解析システム初期化完了');
            loadSettings();
        });

        // タブ切り替え
        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
            document.getElementById(`tab-${tabName}`).classList.add('active');

            if (tabName === 'review') {
                loadParsedFees();
            } else if (tabName === 'history') {
                loadAnalysisHistory();
            }
        }

        // 手動データ解析
        document.getElementById('manualParseForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const feeData = document.getElementById('feeDataInput').value.trim();
            if (!feeData) {
                alert('手数料データを入力してください');
                return;
            }

            await executeAIParsing(feeData, 'manual');
        });

        // 自動取得・解析
        async function fetchAndParse() {
            const sourceUrl = document.getElementById('sourceUrl').value;
            if (!sourceUrl) {
                alert('取得元URLを入力してください');
                return;
            }

            showLoadingState('自動取得・AI解析を実行中...');

            try {
                const response = await fetch('backend/api/ai_fee_parser.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        action: 'fetch_and_parse',
                        source_url: sourceUrl,
                        openai_api_key: getOpenAIKey()
                    })
                });

                const result = await response.json();
                displayParseResults(result);

            } catch (error) {
                console.error('自動解析エラー:', error);
                showAlert('自動解析中にエラーが発生しました: ' + error.message, 'error');
            }
        }

        // AI解析実行（共通処理）
        async function executeAIParsing(feeData, source = 'manual') {
            showLoadingState('AI解析を実行中...');

            try {
                const response = await fetch('backend/api/ai_fee_parser.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        action: 'parse_fee_data',
                        fee_data: feeData,
                        openai_api_key: getOpenAIKey(),
                        source: source
                    })
                });

                const result = await response.json();
                displayParseResults(result);

            } catch (error) {
                console.error('AI解析エラー:', error);
                showAlert('AI解析中にエラーが発生しました: ' + error.message, 'error');
            }
        }

        // 解析結果表示
        function displayParseResults(result) {
            const resultsDiv = document.getElementById('parseResults');
            const contentDiv = document.getElementById('parseResultsContent');

            if (result.success) {
                currentParseResults = result;
                
                let html = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i>
                        <div>
                            解析完了: ${result.parsed_categories}カテゴリーを解析し、
                            ${result.stored_records}件のデータを格納しました
                        </div>
                    </div>

                    <div class="card" style="margin-top: 1rem;">
                        <div class="card-title">解析されたカテゴリー</div>
                `;

                // 解析結果の詳細表示（仮想的なデータ構造）
                if (result.details && result.details.categories) {
                    result.details.categories.forEach(category => {
                        const confidenceClass = 
                            category.confidence_score >= 80 ? 'confidence-high' :
                            category.confidence_score >= 60 ? 'confidence-medium' : 'confidence-low';

                        html += `
                            <div class="fee-item">
                                <div class="fee-header">
                                    <div class="category-name">${category.category_name}</div>
                                    <div class="confidence-badge ${confidenceClass}">
                                        信頼度: ${category.confidence_score}%
                                    </div>
                                </div>
                                <div class="fee-details">
                                    <div class="fee-detail">
                                        <div class="fee-detail-label">カテゴリーID</div>
                                        <div class="fee-detail-value">${category.category_id || 'N/A'}</div>
                                    </div>
                                    <div class="fee-detail">
                                        <div class="fee-detail-label">手数料率</div>
                                        <div class="fee-detail-value">${category.final_value_fee_percent}%</div>
                                    </div>
                                    <div class="fee-detail">
                                        <div class="fee-detail-label">最大手数料</div>
                                        <div class="fee-detail-value">$${category.final_value_fee_max || 'N/A'}</div>
                                    </div>
                                </div>
                                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #6b7280;">
                                    判定根拠: "${category.source_text}"
                                </div>
                            </div>
                        `;
                    });
                }

                html += '</div>';
                contentDiv.innerHTML = html;
                resultsDiv.style.display = 'block';

            } else {
                showAlert('解析に失敗しました: ' + result.error, 'error');
            }
        }

        // 解析済みデータ読み込み
        async function loadParsedFees() {
            try {
                const response = await fetch('backend/api/ai_fee_parser.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({action: 'get_parsed_fees'})
                });

                const result = await response.json();
                
                if (result.success) {
                    displayParsedFeesTable(result.fees);
                } else {
                    showAlert('データ読み込みに失敗しました', 'error');
                }

            } catch (error) {
                console.error('データ読み込みエラー:', error);
                showAlert('データ読み込み中にエラーが発生しました', 'error');
            }
        }

        // 解析済みデータテーブル表示
        function displayParsedFeesTable(fees) {
            const container = document.getElementById('parsedFeesContainer');
            
            if (!fees || fees.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">解析済みデータがありません</p>';
                return;
            }

            let html = `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f9fafb;">
                                <th style="padding: 0.75rem; border: 1px solid #e5e7eb;">カテゴリー名</th>
                                <th style="padding: 0.75rem; border: 1px solid #e5e7eb;">ID</th>
                                <th style="padding: 0.75rem; border: 1px solid #e5e7eb;">手数料率</th>
                                <th style="padding: 0.75rem; border: 1px solid #e5e7eb;">信頼度</th>
                                <th style="padding: 0.75rem; border: 1px solid #e5e7eb;">更新日</th>
                                <th style="padding: 0.75rem; border: 1px solid #e5e7eb;">操作</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            fees.forEach(fee => {
                const confidenceClass = 
                    fee.confidence_score >= 80 ? 'confidence-high' :
                    fee.confidence_score >= 60 ? 'confidence-medium' : 'confidence-low';

                html += `
                    <tr>
                        <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">${fee.category_name}</td>
                        <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">${fee.category_id || 'N/A'}</td>
                        <td style="padding: 0.75rem; border: 1px solid #e5e7eb; font-weight: 600;">${fee.final_value_fee_percent}%</td>
                        <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">
                            <span class="confidence-badge ${confidenceClass}">${fee.confidence_score}%</span>
                        </td>
                        <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">${new Date(fee.updated_at).toLocaleDateString('ja-JP')}</td>
                        <td style="padding: 0.75rem; border: 1px solid #e5e7eb;">
                            <button onclick="editFee('${fee.id}')" class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                                <i class="fas fa-edit"></i> 編集
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += '</tbody></table></div>';
            container.innerHTML = html;
        }

        // 設定読み込み・保存
        function loadSettings() {
            const savedKey = localStorage.getItem('ebay_openai_key');
            const savedThreshold = localStorage.getItem('ebay_confidence_threshold');

            if (savedKey) {
                document.getElementById('openaiApiKey').value = savedKey;
            }
            if (savedThreshold) {
                document.getElementById('confidenceThreshold').value = savedThreshold;
                document.getElementById('confidenceValue').textContent = savedThreshold + '%';
            }
        }

        function saveSettings() {
            const apiKey = document.getElementById('openaiApiKey').value;
            const threshold = document.getElementById('confidenceThreshold').value;

            localStorage.setItem('ebay_openai_key', apiKey);
            localStorage.setItem('ebay_confidence_threshold', threshold);

            showAlert('設定を保存しました', 'success');
        }

        function getOpenAIKey() {
            return document.getElementById('openaiApiKey').value || localStorage.getItem('ebay_openai_key');
        }

        // ユーティリティ関数
        function showLoadingState(message) {
            // 実装: ローディング表示
            console.log('Loading:', message);
        }

        function showAlert(message, type = 'info') {
            // 簡易アラート（実装時は適切なUI要素に置き換え）
            const alertClass = type === 'success' ? 'alert-success' : 
                              type === 'error' ? 'alert-error' : 'alert-warning';
            
            console.log(`[${type.toUpperCase()}] ${message}`);
            
            // 実際のアラート表示（簡易版）
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert ${alertClass}`;
            alertDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
            
            document.body.insertBefore(alertDiv, document.body.firstChild);
            
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }

        // 履歴読み込み（プレースホルダー）
        function loadAnalysisHistory() {
            document.getElementById('historyContainer').innerHTML = 
                '<p style="color: #6b7280; padding: 1rem;">解析履歴機能は開発中です</p>';
        }

        function editFee(feeId) {
            alert(`手数料ID ${feeId} の編集機能は開発中です`);
        }

        console.log('🤖 eBay手数料AI解析管理システム初期化完了');
    </script>
</body>
</html>