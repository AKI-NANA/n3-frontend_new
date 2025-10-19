<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>利益計算システム完全版 - Yahoo Auction Tool</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        /* 利益計算システム専用CSS - 共通CSSベース */
        
        /* ===== CSS変数（共通CSS準拠） ===== */
        :root {
            /* スペース */
            --space-xs: 0.25rem;
            --space-sm: 0.5rem;
            --space-md: 1rem;
            --space-lg: 1.5rem;
            --space-xl: 2rem;
            --space-2xl: 3rem;
            
            /* カラーパレット */
            --color-primary: #3b82f6;
            --color-secondary: #6366f1;
            --color-success: #10b981;
            --color-warning: #f59e0b;
            --color-danger: #ef4444;
            --color-info: #06b6d4;
            --color-gray: #6b7280;
            
            /* 利益計算専用カラー */
            --calculation-primary: #f59e0b;
            --calculation-secondary: #d97706;
            --profit-positive: #059669;
            --profit-negative: #dc2626;
            --profit-neutral: #6b7280;
            
            /* 背景色 */
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f1f5f9;
            --bg-hover: #e2e8f0;
            --bg-active: #cbd5e1;
            
            /* テキスト色 */
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --text-white: #ffffff;
            
            /* ボーダー */
            --border-color: #e2e8f0;
            --border-color-hover: #cbd5e1;
            --border-width: 1px;
            
            /* 角丸 */
            --radius-sm: 0.25rem;
            --radius-md: 0.5rem;
            --radius-lg: 0.75rem;
            --radius-xl: 1rem;
            
            /* シャドウ */
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            
            /* アニメーション */
            --transition-fast: all 0.15s ease-in-out;
            --transition-normal: all 0.2s ease-in-out;
            --transition-slow: all 0.3s ease-in-out;
        }

        /* ===== リセット・基本設定 ===== */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--bg-primary);
            font-size: 1rem;
        }

        /* ===== コンテナ・レイアウト ===== */
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: var(--space-md);
            min-height: 100vh;
        }

        /* ===== ナビゲーション ===== */
        .navbar {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: var(--space-lg);
            border-radius: var(--radius-xl);
            margin-bottom: var(--space-xl);
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: var(--shadow-lg);
        }

        .nav-brand {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            font-size: 1.5rem;
            font-weight: 700;
        }

        .nav-brand i {
            background: linear-gradient(45deg, var(--calculation-primary), var(--calculation-secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 1.75rem;
        }

        .nav-status {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            font-size: 0.875rem;
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-sm) var(--space-md);
            background: rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--color-success);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* ===== ページヘッダー ===== */
        .page-header {
            background: linear-gradient(135deg, var(--calculation-primary) 0%, var(--calculation-secondary) 100%);
            color: white;
            padding: var(--space-2xl);
            border-radius: var(--radius-xl);
            margin-bottom: var(--space-xl);
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .page-header h1 {
            font-size: 2.5rem;
            margin: 0 0 var(--space-md) 0;
            position: relative;
            z-index: 1;
        }

        .page-header p {
            font-size: 1.125rem;
            margin: 0 0 var(--space-lg) 0;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }

        /* ===== タブナビゲーション ===== */
        .tab-navigation {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: var(--space-sm);
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-sm);
            margin-bottom: var(--space-xl);
            box-shadow: var(--shadow-md);
            border: 1px solid var(--border-color);
        }

        .tab-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-sm);
            padding: var(--space-md) var(--space-lg);
            border: 1px solid transparent;
            background: transparent;
            color: var(--text-secondary);
            border-radius: var(--radius-md);
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition-normal);
            white-space: nowrap;
            text-decoration: none;
        }

        .tab-btn:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
            border-color: var(--border-color-hover);
        }

        .tab-btn.active {
            background: linear-gradient(135deg, var(--calculation-primary), var(--calculation-secondary));
            color: white;
            box-shadow: var(--shadow-md);
        }

        .tab-btn i {
            font-size: 1rem;
        }

        /* ===== タブコンテンツ ===== */
        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
            animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* ===== セクション ===== */
        .section {
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            padding: var(--space-xl);
            margin-bottom: var(--space-xl);
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-sm);
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-lg);
            padding-bottom: var(--space-md);
            border-bottom: 2px solid var(--border-color);
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .section-title i {
            color: var(--calculation-primary);
            font-size: 1.25rem;
        }

        /* ===== フォーム要素 ===== */
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: var(--space-xl);
        }

        .form-section {
            background: var(--bg-tertiary);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            border: 1px solid var(--border-color);
        }

        .form-section h4 {
            color: var(--text-primary);
            margin-bottom: var(--space-md);
            font-size: 1.125rem;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .form-section h4 i {
            color: var(--calculation-primary);
        }

        .form-group {
            margin-bottom: var(--space-lg);
        }

        .form-group label {
            display: block;
            margin-bottom: var(--space-sm);
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .form-group input,
        .form-group select {
            width: 100%;
            padding: var(--space-md);
            border: 2px solid var(--border-color);
            border-radius: var(--radius-md);
            font-size: 1rem;
            transition: var(--transition-normal);
            background: var(--bg-secondary);
            color: var(--text-primary);
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: var(--calculation-primary);
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
        }

        .dual-currency {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--space-sm);
            align-items: end;
        }

        .currency-display {
            background: var(--bg-secondary);
            padding: var(--space-md);
            border-radius: var(--radius-md);
            border: 2px solid var(--border-color);
            text-align: center;
            font-weight: 600;
            color: var(--text-muted);
        }

        /* ===== ボタン ===== */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-md) var(--space-lg);
            border: none;
            border-radius: var(--radius-md);
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition-normal);
            text-decoration: none;
            text-align: center;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--calculation-primary), var(--calculation-secondary));
            color: white;
            box-shadow: var(--shadow-md);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .btn-secondary {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 2px solid var(--border-color);
        }

        .btn-info {
            background: linear-gradient(135deg, var(--color-info), #0891b2);
            color: white;
        }

        .btn-success {
            background: linear-gradient(135deg, var(--color-success), #047857);
            color: white;
        }

        .btn-group {
            display: flex;
            gap: var(--space-sm);
            margin-top: var(--space-md);
        }

        /* ===== 結果表示 ===== */
        .result-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-lg);
            margin-top: var(--space-xl);
        }

        .result-card {
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
            border: 2px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            text-align: center;
            transition: var(--transition-normal);
        }

        .result-card:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-lg);
            border-color: var(--calculation-primary);
        }

        .result-value {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: var(--space-sm);
            color: var(--profit-positive);
        }

        .result-value.negative {
            color: var(--profit-negative);
        }

        .result-value.neutral {
            color: var(--profit-neutral);
        }

        .result-value.positive {
            color: var(--profit-positive);
        }

        .result-label {
            font-size: 0.875rem;
            color: var(--text-muted);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* ===== 推奨事項 ===== */
        .recommendation {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid var(--color-info);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-top: var(--space-xl);
            position: relative;
            overflow: hidden;
        }

        .recommendation::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(135deg, var(--color-info), #0284c7);
        }

        .recommendation-content {
            display: flex;
            align-items: flex-start;
            gap: var(--space-md);
        }

        .recommendation i {
            color: var(--color-info);
            font-size: 1.5rem;
            margin-top: 0.25rem;
        }

        .recommendation-text {
            flex: 1;
            font-weight: 500;
            line-height: 1.6;
            color: #0c4a6e;
        }

        /* ===== 為替計算表示 ===== */
        .exchange-calculation {
            background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%);
            border: 2px solid var(--color-warning);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-top: var(--space-md);
        }

        .calculation-step {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-sm) 0;
            border-bottom: 1px solid rgba(245, 158, 11, 0.3);
        }

        .calculation-step:last-child {
            border-bottom: none;
            font-weight: 700;
            font-size: 1.125rem;
            color: #92400e;
        }

        /* ===== データテーブル ===== */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: var(--space-lg);
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
        }

        .data-table th,
        .data-table td {
            padding: var(--space-md);
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        .data-table th {
            background: var(--bg-tertiary);
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .data-table tr:hover {
            background: var(--bg-hover);
        }

        /* ===== ユーティリティクラス ===== */
        .text-success { color: var(--profit-positive) !important; }
        .text-warning { color: var(--profit-neutral) !important; }
        .text-danger { color: var(--profit-negative) !important; }

        /* ===== レスポンシブデザイン ===== */
        @media (max-width: 768px) {
            .container {
                padding: var(--space-sm);
            }
            
            .navbar {
                flex-direction: column;
                gap: var(--space-md);
            }

            .nav-status {
                flex-direction: column;
                gap: var(--space-sm);
            }

            .page-header h1 {
                font-size: 1.875rem;
            }

            .form-grid {
                grid-template-columns: 1fr;
            }

            .tab-navigation {
                grid-template-columns: 1fr;
            }

            .dual-currency {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ナビゲーション -->
        <nav class="navbar">
            <div class="nav-brand">
                <i class="fas fa-calculator"></i>
                <span>利益計算システム完全版</span>
            </div>
            <div class="nav-status">
                <div class="status-indicator">
                    <div class="status-dot"></div>
                    <span>システム稼働中</span>
                </div>
                <div class="status-indicator">
                    <i class="fas fa-exchange-alt"></i>
                    <span id="currentRate">1 USD = ¥155.93</span>
                </div>
            </div>
        </nav>

        <!-- ページヘッダー -->
        <div class="page-header">
            <h1><i class="fas fa-chart-line"></i> 出品前利益シミュレーション・完全版</h1>
            <p>6つの機能タブによる統合利益計算システム（単独動作版）</p>
        </div>

        <!-- タブナビゲーション -->
        <div class="tab-navigation">
            <button class="tab-btn active" data-tab="simulation">
                <i class="fas fa-chart-line"></i> 利益シミュレーション
            </button>
            <button class="tab-btn" data-tab="base-settings">
                <i class="fas fa-cogs"></i> 基本設定
            </button>
            <button class="tab-btn" data-tab="fee-management">
                <i class="fas fa-tags"></i> 手数料管理
            </button>
            <button class="tab-btn" data-tab="exchange-rates">
                <i class="fas fa-exchange-alt"></i> 為替レート
            </button>
            <button class="tab-btn" data-tab="calculation-history">
                <i class="fas fa-history"></i> 計算履歴
            </button>
            <button class="tab-btn" data-tab="roi-analysis">
                <i class="fas fa-chart-bar"></i> ROI分析
            </button>
        </div>

        <!-- 利益シミュレーションタブ -->
        <div id="simulation" class="tab-content active">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-calculator"></i> 出品前利益シミュレーション
                    </h3>
                    <div class="btn-group">
                        <button class="btn btn-secondary" onclick="clearSimulation()">
                            <i class="fas fa-eraser"></i> クリア
                        </button>
                        <button class="btn btn-info" onclick="loadSampleData()">
                            <i class="fas fa-file-import"></i> サンプルデータ
                        </button>
                    </div>
                </div>

                <div class="form-grid">
                    <!-- 商品情報 -->
                    <div class="form-section">
                        <h4><i class="fas fa-box"></i> 商品情報</h4>
                        
                        <div class="form-group">
                            <label>Yahoo!オークション価格 (円)</label>
                            <input type="number" id="yahooPrice" placeholder="15000">
                        </div>
                        
                        <div class="form-group">
                            <label>国内送料 (円)</label>
                            <input type="number" id="domesticShipping" placeholder="800">
                        </div>
                        
                        <div class="form-group">
                            <label>商品重量 (g)</label>
                            <input type="number" id="itemWeight" placeholder="500">
                        </div>
                        
                        <div class="form-group">
                            <label>商品サイズ (cm × cm × cm)</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-sm);">
                                <input type="number" id="sizeLength" placeholder="20">
                                <input type="number" id="sizeWidth" placeholder="15">
                                <input type="number" id="sizeHeight" placeholder="10">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>eBayカテゴリー</label>
                            <select id="ebayCategory">
                                <option value="293">Consumer Electronics (10.0% + $0.35)</option>
                                <option value="11450">Clothing, Shoes & Accessories (12.9% + $0.30)</option>
                                <option value="58058">Collectibles (9.15% + $0.35)</option>
                                <option value="267">Books (15.0% + $0.30)</option>
                                <option value="550">Art (12.9% + $0.35)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>商品コンディション</label>
                            <select id="itemCondition">
                                <option value="New">新品</option>
                                <option value="Used" selected>中古</option>
                                <option value="Refurbished">リファビッシュ品</option>
                            </select>
                        </div>
                    </div>

                    <!-- 販売予定価格 -->
                    <div class="form-section">
                        <h4><i class="fas fa-dollar-sign"></i> 販売予定価格（シミュレーション）</h4>
                        
                        <div class="form-group">
                            <label>想定販売価格 (USD)</label>
                            <input type="number" id="assumedPrice" placeholder="120.00" step="0.01">
                        </div>
                        
                        <div class="form-group">
                            <label>想定送料（買い手負担・USD）</label>
                            <input type="number" id="assumedShipping" placeholder="15.00" step="0.01">
                        </div>
                        
                        <div class="btn-group">
                            <button class="btn btn-primary" onclick="calculateProfit()">
                                <i class="fas fa-magic"></i> 利益計算実行
                            </button>
                        </div>

                        <!-- 適用される設定表示 -->
                        <div style="margin-top: var(--space-lg); padding: var(--space-md); background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                            <h5 style="margin-bottom: var(--space-md); color: var(--text-primary);">
                                <i class="fas fa-info-circle"></i> 適用される設定
                            </h5>
                            <div id="appliedSettings">
                                <div>利益設定: 基本設定を適用</div>
                                <div>最低利益額: ¥780 ($5.00)</div>
                                <div>目標利益率: 20%</div>
                            </div>
                        </div>
                    </div>

                    <!-- 為替・手数料情報 -->
                    <div class="form-section">
                        <h4><i class="fas fa-exchange-alt"></i> 為替計算過程</h4>
                        
                        <div class="exchange-calculation">
                            <div class="calculation-step">
                                <span>基本レート:</span>
                                <span id="baseRate">1 USD = ¥148.50</span>
                            </div>
                            <div class="calculation-step">
                                <span>安全マージン設定:</span>
                                <span id="marginPercent">+5.0%</span>
                            </div>
                            <div class="calculation-step">
                                <span>マージン計算:</span>
                                <span>¥148.50 × 1.05 = ¥155.93</span>
                            </div>
                            <div class="calculation-step">
                                <span>計算用レート:</span>
                                <span id="calculationRate">1 USD = ¥155.93</span>
                            </div>
                        </div>
                        
                        <div style="margin-top: var(--space-md); padding: var(--space-md); background: var(--bg-secondary); border-radius: var(--radius-md);">
                            <h5 style="margin-bottom: var(--space-sm);">選択カテゴリー手数料</h5>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm);">
                                <div>Final Value Fee: <span id="finalValueFee">10.0%</span></div>
                                <div>Insertion Fee: <span id="insertionFee">$0.35</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 計算結果 -->
                <div class="result-grid" id="resultGrid" style="display: none;">
                    <div class="result-card">
                        <div class="result-value" id="totalRevenue">$0.00</div>
                        <div class="result-label">総収入</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="totalCost">$0.00</div>
                        <div class="result-label">総コスト</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="ebayFees">$0.00</div>
                        <div class="result-label">eBay手数料</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="netProfit">$0.00</div>
                        <div class="result-label">純利益</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="profitMargin">0.0%</div>
                        <div class="result-label">利益率</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="roi">0.0%</div>
                        <div class="result-label">ROI</div>
                    </div>
                </div>

                <!-- 推奨事項 -->
                <div class="recommendation" id="recommendation" style="display: none;">
                    <div class="recommendation-content">
                        <i class="fas fa-lightbulb"></i>
                        <div class="recommendation-text" id="recommendationText">
                            計算結果に基づく推奨事項を表示します。
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 基本設定タブ -->
        <div id="base-settings" class="tab-content">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-cogs"></i> 基本設定
                    </h3>
                    <button class="btn btn-primary" onclick="saveBaseSettings()">
                        <i class="fas fa-save"></i> 設定保存
                    </button>
                </div>

                <div class="form-grid">
                    <div class="form-section">
                        <h4><i class="fas fa-globe"></i> グローバル利益設定</h4>
                        
                        <div class="form-group">
                            <label>デフォルト目標利益率 (%)</label>
                            <input type="number" id="globalProfitMargin" value="20.0" step="0.1">
                        </div>
                        
                        <div class="form-group">
                            <label>最低利益額</label>
                            <div class="dual-currency">
                                <div>
                                    <input type="number" id="globalMinProfitUSD" value="5.00" step="0.01" placeholder="USD">
                                </div>
                                <div class="currency-display" id="globalMinProfitJPY">
                                    ¥780
                                </div>
                            </div>
                            <small style="color: var(--text-muted); font-size: 0.75rem;">為替レート: 1 USD = ¥155.93で自動換算</small>
                        </div>
                        
                        <div class="form-group">
                            <label>為替安全マージン (%)</label>
                            <input type="number" id="exchangeMargin" value="5.0" step="0.1">
                        </div>
                    </div>

                    <div class="form-section">
                        <h4><i class="fas fa-info-circle"></i> システム情報</h4>
                        
                        <div style="background: rgba(59, 130, 246, 0.1); padding: var(--space-md); border-radius: var(--radius-md); margin-bottom: var(--space-md);">
                            <p><strong>動作モード:</strong> 単独計算システム（完全版）</p>
                            <p><strong>データベース連携:</strong> 無効</p>
                            <p><strong>API連携:</strong> 無効</p>
                            <p><strong>最終更新:</strong> 2025-09-18</p>
                        </div>
                        
                        <div style="background: rgba(245, 158, 11, 0.1); padding: var(--space-md); border-radius: var(--radius-md);">
                            <p><strong>注意:</strong> この版は手動入力専用です。他モジュールとの連携機能は後日実装予定です。</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 手数料管理タブ -->
        <div id="fee-management" class="tab-content">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-tags"></i> eBay手数料管理
                    </h3>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-lg);">
                    <div style="background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: var(--space-lg); border: 1px solid var(--border-color);">
                        <h5><i class="fas fa-laptop"></i> エレクトロニクス系</h5>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--space-sm);">Final Value Fee: 9.15% - 12.9%</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--space-sm);">Insertion Fee: $0.30 - $0.35</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
                            Consumer Electronics, Computers, Cell Phones, Cameras, Audio/Video
                        </div>
                    </div>

                    <div style="background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: var(--space-lg); border: 1px solid var(--border-color);">
                        <h5><i class="fas fa-tshirt"></i> ファッション系</h5>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--space-sm);">Final Value Fee: 12.9% - 13.25%</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--space-sm);">Insertion Fee: $0.30</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
                            Clothing, Shoes, Accessories, Jewelry, Watches
                        </div>
                    </div>

                    <div style="background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: var(--space-lg); border: 1px solid var(--border-color);">
                        <h5><i class="fas fa-home"></i> ホーム・ライフスタイル</h5>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--space-sm);">Final Value Fee: 10.0% - 15.0%</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--space-sm);">Insertion Fee: $0.30 - $0.35</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
                            Home & Garden, Health & Beauty, Sports, Books
                        </div>
                    </div>

                    <div style="background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: var(--space-lg); border: 1px solid var(--border-color);">
                        <h5><i class="fas fa-gem"></i> コレクティブル系</h5>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--space-sm);">Final Value Fee: 9.15% - 15.0%</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: var(--space-sm);">Insertion Fee: $0.35</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
                            Collectibles, Antiques, Art, Coins, Stamps
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 為替レートタブ -->
        <div id="exchange-rates" class="tab-content">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-exchange-alt"></i> 為替レート管理
                    </h3>
                </div>

                <div class="form-grid">
                    <div class="form-section">
                        <h4><i class="fas fa-chart-line"></i> 現在のレート</h4>
                        
                        <div style="text-align: center; padding: var(--space-lg);">
                            <div style="font-size: 2.5rem; font-weight: 700; color: var(--calculation-primary); margin-bottom: var(--space-sm);">
                                ¥148.50
                            </div>
                            <div style="color: var(--text-muted);">1 USD = 148.50 JPY</div>
                            <div style="font-size: 0.875rem; color: var(--text-muted); margin-top: var(--space-sm);">
                                固定レート（単独動作版）
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4><i class="fas fa-shield-alt"></i> 安全マージン設定</h4>
                        
                        <div class="form-group">
                            <label>安全マージン (%)</label>
                            <input type="number" id="currentSafetyMargin" value="5.0" step="0.1">
                        </div>
                        
                        <div class="exchange-calculation">
                            <div class="calculation-step">
                                <span>基本レート:</span>
                                <span>¥148.50</span>
                            </div>
                            <div class="calculation-step">
                                <span>マージン (5.0%):</span>
                                <span>¥7.43</span>
                            </div>
                            <div class="calculation-step">
                                <span>計算用レート:</span>
                                <span>¥155.93</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 計算履歴タブ -->
        <div id="calculation-history" class="tab-content">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-history"></i> 計算履歴
                    </h3>
                    <div class="btn-group">
                        <button class="btn btn-info" onclick="refreshCalculationHistory()">
                            <i class="fas fa-sync"></i> 更新
                        </button>
                        <button class="btn btn-success" onclick="exportCalculationHistory()">
                            <i class="fas fa-download"></i> CSV出力
                        </button>
                    </div>
                </div>

                <div id="historyContent">
                    <div class="form-section">
                        <h4><i class="fas fa-info-circle"></i> 履歴機能について</h4>
                        <p>この機能は単独動作版では制限されています。データベース連携版では以下の機能が利用可能になります：</p>
                        <ul style="margin-top: var(--space-md); padding-left: var(--space-xl);">
                            <li>過去の計算結果の保存・表示</li>
                            <li>計算履歴のCSVエクスポート</li>
                            <li>計算結果の統計分析</li>
                            <li>商品別利益率トレンド表示</li>
                        </ul>
                        
                        <div style="margin-top: var(--space-lg); padding: var(--space-md); background: rgba(59, 130, 246, 0.1); border-radius: var(--radius-md);">
                            <p><strong>サンプル履歴データ</strong>（デモンストレーション用）</p>
                            <table class="data-table" style="margin-top: var(--space-md);">
                                <thead>
                                    <tr>
                                        <th>商品ID</th>
                                        <th>商品価格</th>
                                        <th>推奨価格</th>
                                        <th>利益率</th>
                                        <th>ROI</th>
                                        <th>計算日時</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>SAMPLE-001</td>
                                        <td>¥15,000</td>
                                        <td>$120.00</td>
                                        <td class="text-success">18.5%</td>
                                        <td class="text-success">22.3%</td>
                                        <td>2025-09-18 10:30</td>
                                    </tr>
                                    <tr>
                                        <td>SAMPLE-002</td>
                                        <td>¥8,500</td>
                                        <td>$75.00</td>
                                        <td class="text-warning">12.8%</td>
                                        <td class="text-warning">15.2%</td>
                                        <td>2025-09-18 09:15</td>
                                    </tr>
                                    <tr>
                                        <td>SAMPLE-003</td>
                                        <td>¥25,000</td>
                                        <td>$180.00</td>
                                        <td class="text-success">25.4%</td>
                                        <td class="text-success">31.7%</td>
                                        <td>2025-09-17 16:45</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ROI分析タブ -->
        <div id="roi-analysis" class="tab-content">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-chart-bar"></i> ROI分析
                    </h3>
                    <button class="btn btn-info" onclick="refreshROIAnalysis()">
                        <i class="fas fa-sync"></i> 分析更新
                    </button>
                </div>

                <div id="roiAnalysisContent">
                    <div class="form-section">
                        <h4><i class="fas fa-info-circle"></i> ROI分析機能について</h4>
                        <p>この機能は単独動作版では制限されています。データベース連携版では以下の分析が利用可能になります：</p>
                        <ul style="margin-top: var(--space-md); padding-left: var(--space-xl);">
                            <li>カテゴリー別ROI分析</li>
                            <li>コンディション別利益率分析</li>
                            <li>時系列トレンド分析</li>
                            <li>価格帯別収益性分析</li>
                        </ul>
                        
                        <div style="margin-top: var(--space-lg);">
                            <h5>サンプル分析結果（デモンストレーション用）</h5>
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-lg); margin-top: var(--space-md);">
                                <div class="form-section">
                                    <h4><i class="fas fa-tags"></i> カテゴリー別分析</h4>
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>カテゴリー</th>
                                                <th>平均ROI</th>
                                                <th>計算回数</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>エレクトロニクス</td>
                                                <td class="text-success">24.8%</td>
                                                <td>45</td>
                                            </tr>
                                            <tr>
                                                <td>ファッション</td>
                                                <td class="text-warning">18.3%</td>
                                                <td>23</td>
                                            </tr>
                                            <tr>
                                                <td>コレクティブル</td>
                                                <td class="text-success">31.2%</td>
                                                <td>12</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="form-section">
                                    <h4><i class="fas fa-star"></i> コンディション別分析</h4>
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>コンディション</th>
                                                <th>平均ROI</th>
                                                <th>計算回数</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>新品</td>
                                                <td class="text-success">28.5%</td>
                                                <td>25</td>
                                            </tr>
                                            <tr>
                                                <td>中古</td>
                                                <td class="text-success">21.7%</td>
                                                <td>48</td>
                                            </tr>
                                            <tr>
                                                <td>リファビッシュ品</td>
                                                <td class="text-warning">19.3%</td>
                                                <td>7</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div style="margin-top: var(--space-lg);">
                                <h5>推奨事項</h5>
                                <div class="recommendation">
                                    <div class="recommendation-content">
                                        <i class="fas fa-lightbulb"></i>
                                        <div class="recommendation-text">
                                            <strong>分析結果に基づく推奨事項：</strong><br>
                                            • コレクティブル系カテゴリーが最も高いROI（31.2%）を示しています<br>
                                            • 新品コンディションの商品が平均28.5%の高いROIを実現<br>
                                            • エレクトロニクス系は安定した収益性（24.8%）と計算回数（45件）のバランスが良好<br>
                                            • より詳細な分析にはデータベース連携版をご利用ください
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript読み込み -->
    <script src="assets/calculator.js"></script>

    <script>
        // 履歴・分析タブ用の追加関数
        function refreshCalculationHistory() {
            showNotification('計算履歴更新機能は開発中です', 'warning');
            console.log('⚠️ 履歴更新機能（開発中）');
        }

        function exportCalculationHistory() {
            showNotification('CSV出力機能は開発中です', 'warning');
            console.log('⚠️ CSV出力機能（開発中）');
        }

        function refreshROIAnalysis() {
            showNotification('ROI分析更新機能は開発中です', 'warning');
            console.log('⚠️ ROI分析更新機能（開発中）');
        }

        // 通知システム拡張
        function showNotification(message, type = 'info') {
            const emoji = {
                'success': '✅',
                'error': '❌',
                'warning': '⚠️',
                'info': 'ℹ️'
            };
            
            console.log(`${emoji[type]} ${message}`);
            
            // 簡易アラート（本格的な通知システムは後日実装）
            if (type === 'warning' || type === 'error') {
                alert(`${emoji[type]} ${message}`);
            }
        }

        console.log('✅ 利益計算システム完全版（6タブ対応）JavaScript 読み込み完了');
        console.log('🔍 デバッグ用: window.debugCalculator() でデバッグ情報表示可能');
    </script>
</body>
</html>
