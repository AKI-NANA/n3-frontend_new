<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>利益計算システム改良版 - Yahoo Auction Tool</title>
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

        .nav-links {
            display: flex;
            gap: var(--space-sm);
        }

        .nav-links a {
            color: #cbd5e1;
            text-decoration: none;
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-md);
            font-size: 0.875rem;
            transition: var(--transition-normal);
            border: 1px solid transparent;
        }

        .nav-links a:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border-color: rgba(255, 255, 255, 0.2);
        }

        .nav-links a.active {
            background: linear-gradient(135deg, var(--calculation-primary), var(--calculation-secondary));
            color: white;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
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
            display: flex;
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-sm);
            margin-bottom: var(--space-xl);
            box-shadow: var(--shadow-md);
            border: 1px solid var(--border-color);
            overflow-x: auto;
        }

        .tab-btn {
            display: flex;
            align-items: center;
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

        .btn-group {
            display: flex;
            gap: var(--space-sm);
            margin-top: var(--space-md);
        }

        /* ===== 階層設定システム ===== */
        .hierarchy-system {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid var(--color-info);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-bottom: var(--space-xl);
        }

        .hierarchy-level {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: var(--space-md);
            align-items: center;
            padding: var(--space-md);
            background: rgba(255, 255, 255, 0.7);
            border-radius: var(--radius-md);
            margin-bottom: var(--space-md);
            border-left: 4px solid;
        }

        .hierarchy-level.level-1 { border-left-color: #dc2626; }
        .hierarchy-level.level-2 { border-left-color: #f59e0b; }
        .hierarchy-level.level-3 { border-left-color: #3b82f6; }
        .hierarchy-level.level-4 { border-left-color: #6b7280; }

        .hierarchy-badge {
            padding: var(--space-xs) var(--space-sm);
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            font-weight: 700;
            color: white;
        }

        .hierarchy-badge.priority-1 { background: #dc2626; }
        .hierarchy-badge.priority-2 { background: #f59e0b; }
        .hierarchy-badge.priority-3 { background: #3b82f6; }
        .hierarchy-badge.priority-4 { background: #6b7280; }

        /* ===== 条件設定エリア ===== */
        .condition-builder {
            background: var(--bg-tertiary);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-top: var(--space-md);
        }

        .condition-row {
            display: grid;
            grid-template-columns: auto 1fr auto 1fr auto;
            gap: var(--space-sm);
            align-items: center;
            padding: var(--space-md);
            background: var(--bg-secondary);
            border-radius: var(--radius-md);
            margin-bottom: var(--space-sm);
            border: 1px solid var(--border-color);
        }

        .condition-row select,
        .condition-row input {
            padding: var(--space-sm);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
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

        /* ===== 手数料グループ表示 ===== */
        .fee-groups {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: var(--space-md);
            margin-top: var(--space-md);
        }

        .fee-group {
            background: var(--bg-secondary);
            border: 2px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            transition: var(--transition-normal);
        }

        .fee-group:hover {
            border-color: var(--calculation-primary);
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }

        .fee-group h5 {
            color: var(--text-primary);
            margin-bottom: var(--space-md);
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .fee-range {
            font-size: 0.875rem;
            color: var(--text-muted);
            margin-bottom: var(--space-sm);
        }

        .fee-examples {
            font-size: 0.75rem;
            color: var(--text-muted);
            line-height: 1.4;
        }

        /* ===== 検索フィールド ===== */
        .search-field {
            position: relative;
            margin-bottom: var(--space-lg);
        }

        .search-field input {
            padding-left: 2.5rem;
        }

        .search-field i {
            position: absolute;
            left: var(--space-md);
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
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

        /* ===== レスポンシブデザイン ===== */
        @media (max-width: 768px) {
            .container {
                padding: var(--space-sm);
            }
            
            .nav-links {
                display: none;
            }

            .page-header h1 {
                font-size: 1.875rem;
            }

            .form-grid {
                grid-template-columns: 1fr;
            }

            .tab-navigation {
                flex-direction: column;
                gap: var(--space-xs);
            }

            .tab-btn {
                justify-content: center;
                width: 100%;
            }

            .dual-currency {
                grid-template-columns: 1fr;
            }

            .condition-row {
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
                <span>利益計算システム改良版</span>
            </div>
            <div class="nav-links">
                <a href="#"><i class="fas fa-tachometer-alt"></i> ダッシュボード</a>
                <a href="#"><i class="fas fa-spider"></i> データ取得</a>
                <a href="#"><i class="fas fa-check-circle"></i> 商品承認</a>
                <a href="#" class="active"><i class="fas fa-calculator"></i> 利益計算</a>
                <a href="#"><i class="fas fa-warehouse"></i> 在庫管理</a>
            </div>
        </nav>

        <!-- ページヘッダー -->
        <div class="page-header">
            <h1><i class="fas fa-chart-line"></i> 出品前利益シミュレーションシステム</h1>
            <p>階層型設定・価格帯別条件・ハイブリッド手数料管理による高精度計算</p>
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
                            <input type="number" id="yahooPrice" placeholder="15000" value="15000">
                        </div>
                        
                        <div class="form-group">
                            <label>国内送料 (円)</label>
                            <input type="number" id="domesticShipping" placeholder="800" value="800">
                        </div>
                        
                        <div class="form-group">
                            <label>商品重量 (g)</label>
                            <input type="number" id="itemWeight" placeholder="500" value="500">
                        </div>
                        
                        <div class="form-group">
                            <label>商品サイズ (cm × cm × cm)</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-sm);">
                                <input type="number" id="sizeLength" placeholder="20" value="20">
                                <input type="number" id="sizeWidth" placeholder="15" value="15">
                                <input type="number" id="sizeHeight" placeholder="10" value="10">
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
                            <input type="number" id="assumedPrice" placeholder="120.00" value="120.00" step="0.01">
                        </div>
                        
                        <div class="form-group">
                            <label>想定送料（買い手負担・USD）</label>
                            <input type="number" id="assumedShipping" placeholder="15.00" value="15.00" step="0.01">
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
                                <span>基本レート (API取得):</span>
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
                        <div class="result-value" id="totalRevenue">$135.00</div>
                        <div class="result-label">総収入</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="totalCost">$110.50</div>
                        <div class="result-label">総コスト</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="ebayFees">$13.85</div>
                        <div class="result-label">eBay手数料</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="netProfit">$10.65</div>
                        <div class="result-label">純利益</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="profitMargin">7.9%</div>
                        <div class="result-label">利益率</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="roi">9.6%</div>
                        <div class="result-label">ROI</div>
                    </div>
                </div>

                <!-- 推奨事項 -->
                <div class="recommendation" id="recommendation" style="display: none;">
                    <div class="recommendation-content">
                        <i class="fas fa-lightbulb"></i>
                        <div class="recommendation-text" id="recommendationText">
                            利益率が低めです。販売価格を$140以上に設定するか、より安価な商品を選択することをお勧めします。
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
                        <i class="fas fa-cogs"></i> 基本設定（全体に影響）
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
                        <h4><i class="fas fa-layer-group"></i> 階層設定システム</h4>
                        
                        <div class="hierarchy-system">
                            <div class="hierarchy-level level-1">
                                <div class="hierarchy-badge priority-1">最高優先</div>
                                <div>価格帯・重量・サイズ別設定</div>
                                <button class="btn btn-secondary" onclick="editConditionSettings()">設定</button>
                            </div>
                            <div class="hierarchy-level level-2">
                                <div class="hierarchy-badge priority-2">高優先</div>
                                <div>コンディション別設定</div>
                                <button class="btn btn-secondary" onclick="editConditionSettings()">設定</button>
                            </div>
                            <div class="hierarchy-level level-3">
                                <div class="hierarchy-badge priority-3">中優先</div>
                                <div>カテゴリー別設定</div>
                                <button class="btn btn-secondary" onclick="editCategorySettings()">設定</button>
                            </div>
                            <div class="hierarchy-level level-4">
                                <div class="hierarchy-badge priority-4">デフォルト</div>
                                <div>基本設定（上記で設定）</div>
                                <span style="color: var(--text-muted);">常時適用</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 条件設定エリア -->
                <div class="condition-builder">
                    <h4><i class="fas fa-sliders-h"></i> 条件別設定追加</h4>
                    
                    <div class="condition-row">
                        <span>もし</span>
                        <select>
                            <option value="price">仕入れ価格が</option>
                            <option value="weight">重量が</option>
                            <option value="size">サイズが</option>
                            <option value="category">カテゴリーが</option>
                        </select>
                        <select>
                            <option value="less">未満</option>
                            <option value="greater">以上</option>
                            <option value="between">の間</option>
                            <option value="equal">と等しい</option>
                        </select>
                        <input type="text" placeholder="値を入力">
                        <button class="btn btn-secondary">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    
                    <div style="margin-top: var(--space-md); padding: var(--space-md); background: rgba(59, 130, 246, 0.1); border-radius: var(--radius-md);">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
                            <div>
                                <label>この条件の利益率 (%)</label>
                                <input type="number" value="15.0" step="0.1">
                            </div>
                            <div>
                                <label>この条件の最低利益額</label>
                                <div class="dual-currency">
                                    <input type="number" value="3.00" step="0.01" placeholder="USD">
                                    <div class="currency-display">¥468</div>
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-primary" style="margin-top: var(--space-md);">
                            <i class="fas fa-save"></i> 条件を保存
                        </button>
                    </div>
                </div>

                <!-- 設定済み条件一覧 -->
                <div style="margin-top: var(--space-xl);">
                    <h4><i class="fas fa-list"></i> 設定済み条件</h4>
                    
                    <div style="background: var(--bg-secondary); border-radius: var(--radius-lg); padding: var(--space-lg); border: 1px solid var(--border-color);">
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: var(--space-md); align-items: center; padding: var(--space-sm); border-bottom: 1px solid var(--border-color); font-weight: 600;">
                            <div>条件</div>
                            <div>利益率</div>
                            <div>最低利益額</div>
                            <div>優先順位</div>
                            <div>操作</div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: var(--space-md); align-items: center; padding: var(--space-sm); border-bottom: 1px solid var(--border-color);">
                            <div>仕入れ価格 < ¥10,000</div>
                            <div>15.0%</div>
                            <div>$3.00 (¥468)</div>
                            <div><span class="hierarchy-badge priority-1">1</span></div>
                            <div>
                                <button class="btn btn-secondary" style="padding: var(--space-xs) var(--space-sm); font-size: 0.75rem;">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: var(--space-md); align-items: center; padding: var(--space-sm); border-bottom: 1px solid var(--border-color);">
                            <div>コンディション = 新品</div>
                            <div>28.0%</div>
                            <div>$7.00 (¥1,091)</div>
                            <div><span class="hierarchy-badge priority-2">2</span></div>
                            <div>
                                <button class="btn btn-secondary" style="padding: var(--space-xs) var(--space-sm); font-size: 0.75rem;">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: var(--space-md); align-items: center; padding: var(--space-sm);">
                            <div>カテゴリー = エレクトロニクス</div>
                            <div>25.0%</div>
                            <div>$8.00 (¥1,247)</div>
                            <div><span class="hierarchy-badge priority-3">3</span></div>
                            <div>
                                <button class="btn btn-secondary" style="padding: var(--space-xs) var(--space-sm); font-size: 0.75rem;">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
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
                    <div class="btn-group">
                        <button class="btn btn-info" onclick="updateFeesFromAPI()">
                            <i class="fas fa-sync"></i> API更新
                        </button>
                        <button class="btn btn-secondary" onclick="openManualFeeEditor()">
                            <i class="fas fa-edit"></i> 手動編集
                        </button>
                    </div>
                </div>

                <!-- 手数料検索 -->
                <div class="search-field">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="カテゴリー名またはIDで検索..." id="feeSearch">
                </div>

                <!-- 手数料グループ表示 -->
                <div class="fee-groups">
                    <div class="fee-group">
                        <h5><i class="fas fa-laptop"></i> エレクトロニクス系</h5>
                        <div class="fee-range">Final Value Fee: 9.15% - 12.9%</div>
                        <div class="fee-range">Insertion Fee: $0.30 - $0.35</div>
                        <div class="fee-examples">
                            Consumer Electronics, Computers, Cell Phones, Cameras, Audio/Video
                        </div>
                    </div>

                    <div class="fee-group">
                        <h5><i class="fas fa-tshirt"></i> ファッション系</h5>
                        <div class="fee-range">Final Value Fee: 12.9% - 13.25%</div>
                        <div class="fee-range">Insertion Fee: $0.30</div>
                        <div class="fee-examples">
                            Clothing, Shoes, Accessories, Jewelry, Watches
                        </div>
                    </div>

                    <div class="fee-group">
                        <h5><i class="fas fa-home"></i> ホーム・ライフスタイル</h5>
                        <div class="fee-range">Final Value Fee: 10.0% - 15.0%</div>
                        <div class="fee-range">Insertion Fee: $0.30 - $0.35</div>
                        <div class="fee-examples">
                            Home & Garden, Health & Beauty, Sports, Books
                        </div>
                    </div>

                    <div class="fee-group">
                        <h5><i class="fas fa-gem"></i> コレクティブル系</h5>
                        <div class="fee-range">Final Value Fee: 9.15% - 15.0%</div>
                        <div class="fee-range">Insertion Fee: $0.35</div>
                        <div class="fee-examples">
                            Collectibles, Antiques, Art, Coins, Stamps
                        </div>
                    </div>

                    <div class="fee-group">
                        <h5><i class="fas fa-car"></i> 自動車・その他</h5>
                        <div class="fee-range">Final Value Fee: 5.0% - 10.0%</div>
                        <div class="fee-range">Insertion Fee: $0.35 - $1.00</div>
                        <div class="fee-examples">
                            eBay Motors, Heavy Equipment, Real Estate
                        </div>
                    </div>

                    <div class="fee-group">
                        <h5><i class="fas fa-question-circle"></i> その他・特殊</h5>
                        <div class="fee-range">Final Value Fee: 変動</div>
                        <div class="fee-range">Insertion Fee: 変動</div>
                        <div class="fee-examples">
                            Business & Industrial, Professional Services
                        </div>
                    </div>
                </div>

                <!-- 手数料変更履歴 -->
                <div style="margin-top: var(--space-xl);">
                    <h4><i class="fas fa-history"></i> 手数料変更履歴</h4>
                    
                    <div style="background: var(--bg-secondary); border-radius: var(--radius-lg); padding: var(--space-lg); border: 1px solid var(--border-color);">
                        <div style="display: grid; grid-template-columns: auto 2fr 1fr 1fr auto auto; gap: var(--space-md); align-items: center; padding: var(--space-sm); border-bottom: 1px solid var(--border-color); font-weight: 600;">
                            <div>日付</div>
                            <div>カテゴリー</div>
                            <div>変更前</div>
                            <div>変更後</div>
                            <div>ソース</div>
                            <div>状態</div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: auto 2fr 1fr 1fr auto auto; gap: var(--space-md); align-items: center; padding: var(--space-sm); border-bottom: 1px solid var(--border-color);">
                            <div>2025-09-17</div>
                            <div>Consumer Electronics</div>
                            <div>10.2%</div>
                            <div>10.0%</div>
                            <div><span style="color: var(--color-info);">API</span></div>
                            <div><span style="color: var(--color-success);">適用済み</span></div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: auto 2fr 1fr 1fr auto auto; gap: var(--space-md); align-items: center; padding: var(--space-sm); border-bottom: 1px solid var(--border-color);">
                            <div>2025-09-15</div>
                            <div>Clothing</div>
                            <div>12.35%</div>
                            <div>12.9%</div>
                            <div><span style="color: var(--color-warning);">手動</span></div>
                            <div><span style="color: var(--color-success);">適用済み</span></div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: auto 2fr 1fr 1fr auto auto; gap: var(--space-md); align-items: center; padding: var(--space-sm);">
                            <div>2025-09-10</div>
                            <div>Books</div>
                            <div>13.25%</div>
                            <div>15.0%</div>
                            <div><span style="color: var(--color-info);">API</span></div>
                            <div><span style="color: var(--color-warning);">保護中</span></div>
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
                    <button class="btn btn-info" onclick="updateExchangeRate()">
                        <i class="fas fa-sync"></i> レート更新
                    </button>
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
                                API最終取得: 2025-09-17 14:30:00
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
                        
                        <div style="margin-top: var(--space-md); padding: var(--space-md); background: rgba(245, 158, 11, 0.1); border-radius: var(--radius-md);">
                            <div style="font-weight: 600; margin-bottom: var(--space-sm);">影響例:</div>
                            <div style="font-size: 0.875rem; line-height: 1.6;">
                                ¥15,000の商品 → $96.15 (基本) → $96.15 (マージン適用)<br>
                                マージンにより約¥7のリスク軽減
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4><i class="fas fa-cog"></i> 自動取得設定</h4>
                        
                        <div class="form-group">
                            <label>API提供元</label>
                            <select id="exchangeApiProvider">
                                <option value="openexchangerates" selected>Open Exchange Rates</option>
                                <option value="fixer">Fixer.io</option>
                                <option value="currencylayer">CurrencyLayer</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>更新頻度</label>
                            <select id="exchangeUpdateFreq">
                                <option value="hourly">1時間ごと</option>
                                <option value="daily" selected>1日1回</option>
                                <option value="manual">手動のみ</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>変動アラート閾値 (%)</label>
                            <input type="number" id="volatilityAlert" value="2.0" step="0.1">
                        </div>
                    </div>
                </div>

                <!-- レート履歴（簡素化） -->
                <div style="margin-top: var(--space-xl);">
                    <h4><i class="fas fa-chart-area"></i> レート推移（直近7日間）</h4>
                    
                    <div style="background: var(--bg-secondary); border-radius: var(--radius-lg); padding: var(--space-lg); border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
                            <span>最高値: ¥149.25 (9/15)</span>
                            <span>最低値: ¥147.80 (9/12)</span>
                            <span>変動幅: ¥1.45 (0.98%)</span>
                        </div>
                        <div style="height: 60px; background: linear-gradient(90deg, var(--color-success) 0%, var(--calculation-primary) 50%, var(--color-info) 100%); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                            📈 グラフエリア（実装時に詳細チャート表示）
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // タブ切り替え機能
        document.addEventListener('DOMContentLoaded', function() {
            console.log('利益計算システム改良版 初期化開始');
            
            // タブボタンのイベントリスナー
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const targetTab = this.dataset.tab;
                    switchTab(targetTab);
                });
            });
            
            // 為替レート変更時の自動換算
            document.getElementById('globalMinProfitUSD').addEventListener('input', updateCurrencyConversion);
            document.getElementById('exchangeMargin').addEventListener('input', updateExchangeCalculation);
            
            // カテゴリー選択時の手数料表示更新
            document.getElementById('ebayCategory').addEventListener('change', updateCategoryFees);
            
            // 初期データの読み込み
            updateCategoryFees();
            updateCurrencyConversion();
            updateExchangeCalculation();
            
            console.log('利益計算システム改良版 初期化完了');
        });

        // タブ切り替え関数
        function switchTab(tabName) {
            // 全てのタブボタンから active クラスを削除
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 全てのタブコンテンツを非表示
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // 指定されたタブボタンとコンテンツを表示
            document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
            document.getElementById(tabName).classList.add('active');
        }

        // 通貨換算更新
        function updateCurrencyConversion() {
            const usdAmount = parseFloat(document.getElementById('globalMinProfitUSD').value) || 0;
            const exchangeRate = 155.93; // 計算用レート
            const jpyAmount = Math.round(usdAmount * exchangeRate);
            
            document.getElementById('globalMinProfitJPY').textContent = `¥${jpyAmount.toLocaleString()}`;
        }

        // 為替計算表示更新
        function updateExchangeCalculation() {
            const baseRate = 148.50;
            const margin = parseFloat(document.getElementById('exchangeMargin').value) || 5.0;
            const calculatedRate = baseRate * (1 + (margin / 100));
            
            document.getElementById('baseRate').textContent = `1 USD = ¥${baseRate}`;
            document.getElementById('marginPercent').textContent = `+${margin}%`;
            document.getElementById('calculationRate').textContent = `1 USD = ¥${calculatedRate.toFixed(2)}`;
            
            // 他の換算も更新
            updateCurrencyConversion();
        }

        // カテゴリー手数料表示更新
        function updateCategoryFees() {
            const categorySelect = document.getElementById('ebayCategory');
            const selectedValue = categorySelect.value;
            
            const feeData = {
                '293': { final: 10.0, insertion: 0.35, name: 'Consumer Electronics' },
                '11450': { final: 12.9, insertion: 0.30, name: 'Clothing, Shoes & Accessories' },
                '58058': { final: 9.15, insertion: 0.35, name: 'Collectibles' },
                '267': { final: 15.0, insertion: 0.30, name: 'Books' },
                '550': { final: 12.9, insertion: 0.35, name: 'Art' }
            };
            
            const fees = feeData[selectedValue];
            if (fees) {
                document.getElementById('finalValueFee').textContent = `${fees.final}%`;
                document.getElementById('insertionFee').textContent = `$${fees.insertion}`;
            }
        }

        // 利益計算実行
        function calculateProfit() {
            try {
                const yahooPrice = parseFloat(document.getElementById('yahooPrice').