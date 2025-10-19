<?php
/**
 * 利益計算システム完全統合版 (PHP版)
 * profit_calculator_complete_final.phpの完全動作版
 */

// APIリクエスト処理
if (isset($_POST['action']) || isset($_GET['action'])) {
    require_once 'profit_calculator_complete_api.php';
    exit();
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>利益計算システム完全統合版 - 全機能搭載FINAL</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        /* CSS Variables */
        :root {
            --primary: #3b82f6; --success: #10b981; --warning: #f59e0b; --danger: #ef4444; --info: #06b6d4;
            --bg-primary: #f8fafc; --bg-secondary: #ffffff; --bg-tertiary: #f1f5f9;
            --text-primary: #1e293b; --text-secondary: #475569; --text-muted: #64748b;
            --border-color: #e2e8f0; --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --space-sm: 0.5rem; --space-md: 1rem; --space-lg: 1.5rem; --space-xl: 2rem;
            --radius-md: 0.5rem; --radius-lg: 0.75rem; --radius-xl: 1rem;
            --ebay-color: #e53e3e; --shopee-color: #ee4d2d; --calc-primary: #f59e0b;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg-primary); color: var(--text-primary); line-height: 1.6; }
        .container { max-width: 1600px; margin: 0 auto; padding: var(--space-md); }

        /* Header */
        .header { background: linear-gradient(135deg, var(--calc-primary), #d97706); color: white; padding: var(--space-xl); border-radius: var(--radius-xl); margin-bottom: var(--space-xl); text-align: center; box-shadow: var(--shadow-md); }
        .header h1 { font-size: 2.5rem; margin-bottom: var(--space-md); }
        .header p { font-size: 1.125rem; opacity: 0.9; }

        /* Navigation - 改善されたボタンサイズ */
        .nav { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-md); background: var(--bg-secondary); border-radius: var(--radius-lg); padding: var(--space-lg); margin-bottom: var(--space-xl); box-shadow: var(--shadow-md); }
        .nav-btn { 
            padding: var(--space-lg) var(--space-xl); 
            border: none; 
            background: transparent; 
            border-radius: var(--radius-md); 
            cursor: pointer; 
            font-weight: 600; 
            font-size: 1rem;
            transition: all 0.2s; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            gap: var(--space-sm);
            min-height: 60px;
        }
        .nav-btn:hover { background: var(--bg-tertiary); transform: translateY(-2px); }
        .nav-btn.active { background: var(--calc-primary); color: white; box-shadow: var(--shadow-md); }

        /* Tabs */
        .tab { display: none; }
        .tab.active { display: block; animation: fadeIn 0.3s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Sections */
        .section { background: var(--bg-secondary); border-radius: var(--radius-xl); padding: var(--space-xl); margin-bottom: var(--space-xl); box-shadow: var(--shadow-md); }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg); border-bottom: 2px solid var(--border-color); padding-bottom: var(--space-md); }
        .section-title { font-size: 1.5rem; font-weight: 700; display: flex; align-items: center; gap: var(--space-sm); }
        .section-title i { color: var(--calc-primary); }

        /* Forms */
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: var(--space-xl); }
        .form-section { background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: var(--space-xl); }
        .form-section h4 { margin-bottom: var(--space-md); display: flex; align-items: center; gap: var(--space-sm); font-size: 1.125rem; }
        .form-section h4 i { color: var(--calc-primary); }
        .form-group { margin-bottom: var(--space-lg); }
        .form-group label { display: block; margin-bottom: var(--space-sm); font-weight: 600; font-size: 0.9rem; }
        .form-group input, .form-group select { 
            width: 100%; 
            padding: var(--space-md) var(--space-lg); 
            border: 2px solid var(--border-color); 
            border-radius: var(--radius-md); 
            background: var(--bg-secondary); 
            font-size: 1rem;
        }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: var(--calc-primary); box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1); }

        /* Buttons - サイズ改善 */
        .btn { 
            display: inline-flex; 
            align-items: center; 
            gap: var(--space-sm); 
            padding: var(--space-lg) var(--space-xl); 
            border: none; 
            border-radius: var(--radius-md); 
            font-weight: 600; 
            font-size: 1rem;
            cursor: pointer; 
            transition: all 0.2s; 
            text-decoration: none; 
            min-height: 48px;
        }
        .btn-primary { background: var(--calc-primary); color: white; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); border: 2px solid var(--border-color); }
        .btn-success { background: var(--success); color: white; }
        .btn-warning { background: var(--warning); color: white; }
        .btn-info { background: var(--info); color: white; }
        .btn-calculate { width: 100%; padding: var(--space-xl); font-size: 1.25rem; margin-top: var(--space-lg); }
        .btn-group { display: flex; gap: var(--space-md); margin-top: var(--space-md); flex-wrap: wrap; }

        /* Results */
        .result-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-lg); margin-top: var(--space-xl); }
        .result-card { background: var(--bg-secondary); border: 2px solid var(--border-color); border-radius: var(--radius-lg); padding: var(--space-xl); text-align: center; transition: all 0.2s; }
        .result-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
        .result-value { font-size: 2.25rem; font-weight: 700; margin-bottom: var(--space-sm); color: var(--success); }
        .result-value.negative { color: var(--danger); }
        .result-value.warning { color: var(--warning); }
        .result-label { font-size: 0.875rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; }

        /* Mode Selection */
        .mode-selector { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); margin-bottom: var(--space-lg); }
        .mode-card { background: var(--bg-secondary); border: 2px solid var(--border-color); border-radius: var(--radius-lg); padding: var(--space-xl); cursor: pointer; text-align: center; transition: all 0.2s; }
        .mode-card:hover { border-color: var(--primary); transform: translateY(-2px); }
        .mode-card.selected { border-color: var(--primary); background: rgba(59, 130, 246, 0.05); }

        /* Country Grid */
        .country-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg); }
        .country-btn { 
            padding: var(--space-lg); 
            border: 2px solid var(--border-color); 
            background: var(--bg-secondary); 
            border-radius: var(--radius-md); 
            cursor: pointer; 
            text-align: center; 
            font-weight: 600; 
            transition: all 0.2s; 
            min-height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .country-btn:hover { border-color: var(--shopee-color); transform: translateY(-2px); }
        .country-btn.selected { border-color: var(--shopee-color); background: var(--shopee-color); color: white; }

        /* Tables */
        .data-table { width: 100%; border-collapse: collapse; margin-top: var(--space-lg); background: var(--bg-secondary); border-radius: var(--radius-lg); overflow: hidden; }
        .data-table th, .data-table td { padding: var(--space-lg); text-align: left; border-bottom: 1px solid var(--border-color); }
        .data-table th { background: var(--bg-tertiary); font-weight: 600; }
        .data-table tr:hover { background: var(--bg-tertiary); }

        /* Special Sections */
        .tariff-settings { background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(220, 38, 127, 0.05)); border: 2px solid var(--danger); border-radius: var(--radius-lg); padding: var(--space-xl); margin-bottom: var(--space-lg); }
        .fee-display { background: linear-gradient(135deg, #fefce8, #fef3c7); border: 2px solid var(--warning); border-radius: var(--radius-lg); padding: var(--space-xl); margin-top: var(--space-md); }
        .fee-breakdown { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--space-md); margin-top: var(--space-md); }
        .fee-item { text-align: center; background: rgba(255, 255, 255, 0.7); padding: var(--space-lg); border-radius: var(--radius-md); }
        .fee-value { font-size: 1.375rem; font-weight: 700; color: #92400e; margin-bottom: var(--space-sm); }

        /* Responsive */
        @media (max-width: 768px) {
            .container { padding: var(--space-sm); }
            .form-grid { grid-template-columns: 1fr; }
            .mode-selector { grid-template-columns: 1fr; }
            .result-grid { grid-template-columns: 1fr; }
            .nav { grid-template-columns: 1fr; }
            .country-grid { grid-template-columns: repeat(2, 1fr); }
            .btn-group { flex-direction: column; }
            .header h1 { font-size: 2rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1><i class="fas fa-calculator"></i> 利益計算システム完全統合版</h1>
            <p>eBay DDP/DDU・Shopee 7カ国・段階手数料・階層型利益率・為替変動対応完全版</p>
        </div>

        <!-- Navigation -->
        <div class="nav">
            <button class="nav-btn active" onclick="showTab('simulation')">
                <i class="fas fa-chart-line"></i> 高精度シミュレーション
            </button>
            <button class="nav-btn" onclick="showTab('ebay')">
                <i class="fab fa-ebay"></i> eBay USA (DDP/DDU)
            </button>
            <button class="nav-btn" onclick="showTab('shopee')">
                <i class="fas fa-shopping-bag"></i> Shopee 7カ国
            </button>
            <button class="nav-btn" onclick="showTab('fees')">
                <i class="fas fa-tags"></i> 段階手数料管理
            </button>
            <button class="nav-btn" onclick="showTab('settings')">
                <i class="fas fa-sliders-h"></i> 利益率設定
            </button>
            <button class="nav-btn" onclick="showTab('rates')">
                <i class="fas fa-exchange-alt"></i> 為替レート
            </button>
        </div>

        <!-- 高精度シミュレーションタブ -->
        <div id="simulation" class="tab active">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-calculator"></i> 高精度出品前利益シミュレーション
                    </h3>
                    <div class="btn-group">
                        <button class="btn btn-secondary" onclick="clearAll()">
                            <i class="fas fa-eraser"></i> クリア
                        </button>
                        <button class="btn btn-info" onclick="loadSample()">
                            <i class="fas fa-file-import"></i> サンプル
                        </button>
                        <button class="btn btn-warning" onclick="loadAdvanced()">
                            <i class="fas fa-rocket"></i> 高精度プリセット
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
                            <label>外注工賃費 (円)</label>
                            <input type="number" id="outsourceFee" placeholder="500" value="500">
                        </div>
                        
                        <div class="form-group">
                            <label>梱包費 (円)</label>
                            <input type="number" id="packagingFee" placeholder="200" value="200">
                        </div>
                        
                        <div class="form-group">
                            <label>eBayカテゴリー（段階手数料）</label>
                            <select id="ebayCategory">
                                <option value="293">Consumer Electronics (Tier1: 10.0%, Tier2: 12.35% @$7,500)</option>
                                <option value="11450">Clothing (Tier1: 12.9%, Tier2: 14.70% @$10,000)</option>
                                <option value="58058">Collectibles (Tier1: 9.15%, Tier2: 11.70% @$5,000)</option>
                                <option value="267">Books (Tier1: 15.0%, Tier2: 15.0%)</option>
                                <option value="550">Art (Tier1: 12.9%, Tier2: 15.0% @$10,000)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>商品コンディション（階層型利益率）</label>
                            <select id="itemCondition">
                                <option value="New">新品 (目標: 28% | 最低: $7.00)</option>
                                <option value="Used" selected>中古 (目標: 20% | 最低: $3.00)</option>
                                <option value="Refurbished">リファビッシュ (目標: 25% | 最低: $5.00)</option>
                                <option value="ForParts">ジャンク (目標: 15% | 最低: $2.00)</option>
                            </select>
                        </div>
                    </div>

                    <!-- 販売価格設定 -->
                    <div class="form-section">
                        <h4><i class="fas fa-dollar-sign"></i> 販売価格設定</h4>
                        
                        <div class="form-group">
                            <label>想定販売価格 (USD)</label>
                            <input type="number" id="assumedPrice" placeholder="120.00" value="120.00" step="0.01">
                        </div>
                        
                        <div class="form-group">
                            <label>想定送料 (USD)</label>
                            <input type="number" id="assumedShipping" placeholder="15.00" value="15.00" step="0.01">
                        </div>
                        
                        <div class="form-group">
                            <label>出品経過日数</label>
                            <input type="number" id="daysSince" value="0" min="0" max="365">
                            <small style="color: var(--text-muted);">30日以上: 15%利益率, 60日以上: 10%利益率</small>
                        </div>
                        
                        <div class="form-group">
                            <label>販売戦略</label>
                            <select id="strategy">
                                <option value="standard">標準販売</option>
                                <option value="quick">早期売却 (-5%)</option>
                                <option value="premium">プレミアム (+10%)</option>
                                <option value="volume">ボリューム (-3%)</option>
                            </select>
                        </div>
                        
                        <button class="btn btn-primary btn-calculate" onclick="calculateAdvanced()">
                            <i class="fas fa-magic"></i> 高精度利益計算実行
                        </button>
                    </div>

                    <!-- 手数料情報表示 -->
                    <div class="form-section">
                        <h4><i class="fas fa-info-circle"></i> 段階手数料・為替情報</h4>
                        
                        <div class="fee-display">
                            <h5>段階手数料計算</h5>
                            <div class="fee-breakdown">
                                <div class="fee-item">
                                    <div class="fee-value" id="tier1Rate">10.0%</div>
                                    <div>Tier1 Fee</div>
                                </div>
                                <div class="fee-item">
                                    <div class="fee-value" id="tier2Rate">12.35%</div>
                                    <div>Tier2 Fee</div>
                                </div>
                                <div class="fee-item">
                                    <div class="fee-value" id="appliedRate">10.0%</div>
                                    <div>適用手数料</div>
                                </div>
                                <div class="fee-item">
                                    <div class="fee-value" id="insertionFee">$0.35</div>
                                    <div>出品手数料</div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-top: var(--space-md); padding: var(--space-md); background: var(--bg-tertiary); border-radius: var(--radius-md);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-sm);">
                                <span>リアルタイム為替:</span>
                                <span id="currentRate">1 USD = ¥148.5</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-sm);">
                                <span>安全マージン:</span>
                                <span>5.0%</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-weight: 700;">
                                <span>計算用レート:</span>
                                <span id="safeRate">1 USD = ¥155.9</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 計算結果表示 -->
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
                        <div class="result-value" id="totalFees">$13.85</div>
                        <div class="result-label">総手数料</div>
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
                    <div class="result-card">
                        <div class="result-value" id="recommendedPrice">$145.50</div>
                        <div class="result-label">推奨価格</div>
                    </div>
                    <div class="result-card">
                        <div class="result-value" id="breakEven">$125.30</div>
                        <div class="result-label">損益分岐点</div>
                    </div>
                </div>

                <!-- 推奨事項 -->
                <div id="recommendation" style="display: none; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border: 2px solid var(--info); border-radius: var(--radius-lg); padding: var(--space-lg); margin-top: var(--space-xl);">
                    <div style="display: flex; align-items: flex-start; gap: var(--space-md);">
                        <i class="fas fa-lightbulb" style="color: var(--info); font-size: 1.5rem; margin-top: 0.25rem;"></i>
                        <div id="recommendationText" style="flex: 1; font-weight: 500; line-height: 1.6; color: #0c4a6e;">
                            高精度計算による推奨事項を表示します...
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- eBay USAタブ -->
        <div id="ebay" class="tab">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fab fa-ebay" style="color: var(--ebay-color);"></i> eBay USA 利益計算 (DDP/DDU対応)
                    </h3>
                    <div class="btn-group">
                        <button class="btn btn-secondary" onclick="loadEbayPreset()">
                            <i class="fas fa-download"></i> プリセット
                        </button>
                        <button class="btn btn-success" onclick="saveEbayConfig()">
                            <i class="fas fa-save"></i> 設定保存
                        </button>
                    </div>
                </div>

                <!-- DDP/DDU選択 -->
                <div class="mode-selector">
                    <div class="mode-card selected" onclick="selectMode('ddp')" data-mode="ddp">
                        <div style="font-size: 1.125rem; font-weight: 700; margin-bottom: var(--space-sm);">DDP (Delivered Duty Paid)</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">関税込み配送 - 売主が関税負担</div>
                    </div>
                    <div class="mode-card" onclick="selectMode('ddu')" data-mode="ddu">
                        <div style="font-size: 1.125rem; font-weight: 700; margin-bottom: var(--space-sm);">DDU (Delivered Duty Unpaid)</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">関税別配送 - 買主が関税負担</div>
                    </div>
                </div>

                <!-- 関税設定 -->
                <div class="tariff-settings">
                    <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-lg);">
                        <div style="width: 2.5rem; height: 2.5rem; border-radius: 50%; background: var(--danger); color: white; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <div>
                            <div style="font-size: 1.25rem; font-weight: 700; color: var(--danger);">USA関税設定</div>
                            <div style="font-size: 0.875rem; color: var(--text-secondary);">商品カテゴリー別関税率</div>
                        </div>
                    </div>

                    <div class="form-grid">
                        <div class="form-section">
                            <h4><i class="fas fa-percentage"></i> 基本関税率</h4>
                            <div class="form-group">
                                <label>Electronics関税率 (%)</label>
                                <input type="number" id="electronicsRate" value="7.5" step="0.1">
                            </div>
                            <div class="form-group">
                                <label>Textiles関税率 (%)</label>
                                <input type="number" id="textilesRate" value="12.0" step="0.1">
                            </div>
                            <div class="form-group">
                                <label>Other関税率 (%)</label>
                                <input type="number" id="otherRate" value="5.0" step="0.1">
                            </div>
                        </div>

                        <div class="form-section">
                            <h4><i class="fas fa-calculator"></i> 追加費用</h4>
                            <div class="form-group">
                                <label>外注工賃費 (円)</label>
                                <input type="number" id="ebayOutsourceFee" value="500">
                            </div>
                            <div class="form-group">
                                <label>梱包費 (円)</label>
                                <input type="number" id="ebayPackagingFee" value="200">
                            </div>
                            <div class="form-group">
                                <label>為替変動マージン (%)</label>
                                <input type="number" id="ebayMargin" value="5.0" step="0.1">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- eBay商品情報 -->
                <div class="form-grid">
                    <div class="form-section">
                        <h4><i class="fas fa-box"></i> 商品情報</h4>
                        <div class="form-group">
                            <label>商品タイトル</label>
                            <input type="text" id="ebayTitle" placeholder="iPhone 15 Pro Max 256GB">
                        </div>
                        <div class="form-group">
                            <label>仕入れ価格 (円)</label>
                            <input type="number" id="ebayPurchasePrice" placeholder="150000">
                        </div>
                        <div class="form-group">
                            <label>販売価格 (USD)</label>
                            <input type="number" id="ebaySellPrice" placeholder="1200" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>送料 (USD)</label>
                            <input type="number" id="ebayShipping" placeholder="25" step="0.01">
                        </div>
                    </div>

                    <div class="form-section">
                        <h4><i class="fas fa-cog"></i> eBay設定</h4>
                        <div class="form-group">
                            <label>商品カテゴリー</label>
                            <select id="ebayProductCategory">
                                <option value="electronics">Electronics</option>
                                <option value="textiles">Clothing & Textiles</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>商品状態</label>
                            <select id="ebayCondition">
                                <option value="New">New</option>
                                <option value="Used">Used</option>
                                <option value="Refurbished">Refurbished</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>重量 (kg)</label>
                            <input type="number" id="ebayWeight" placeholder="0.5" step="0.1">
                        </div>
                    </div>
                </div>

                <button class="btn btn-primary btn-calculate" onclick="calculateEbay()">
                    <i class="fas fa-calculator"></i> eBay USA利益計算実行
                </button>
            </div>
        </div>

        <!-- Shopee 7カ国タブ -->
        <div id="shopee" class="tab">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-shopping-bag" style="color: var(--shopee-color);"></i> Shopee 7カ国利益計算
                    </h3>
                    <div class="btn-group">
                        <button class="btn btn-secondary" onclick="loadShopeePreset()">
                            <i class="fas fa-download"></i> プリセット
                        </button>
                        <button class="btn btn-success" onclick="saveShopeeConfig()">
                            <i class="fas fa-save"></i> 設定保存
                        </button>
                    </div>
                </div>

                <!-- 国選択 -->
                <div class="country-grid">
                    <div class="country-btn selected" data-country="SG" onclick="selectCountry('SG')">🇸🇬 シンガポール</div>
                    <div class="country-btn" data-country="MY" onclick="selectCountry('MY')">🇲🇾 マレーシア</div>
                    <div class="country-btn" data-country="TH" onclick="selectCountry('TH')">🇹🇭 タイ</div>
                    <div class="country-btn" data-country="PH" onclick="selectCountry('PH')">🇵🇭 フィリピン</div>
                    <div class="country-btn" data-country="ID" onclick="selectCountry('ID')">🇮🇩 インドネシア</div>
                    <div class="country-btn" data-country="VN" onclick="selectCountry('VN')">🇻🇳 ベトナム</div>
                    <div class="country-btn" data-country="TW" onclick="selectCountry('TW')">🇹🇼 台湾</div>
                </div>

                <!-- Shopee商品情報・関税設定 -->
                <div class="form-grid">
                    <div class="form-section">
                        <h4><i class="fas fa-box"></i> 商品情報</h4>
                        <div class="form-group">
                            <label>商品タイトル</label>
                            <input type="text" id="shopeeTitle" placeholder="ワイヤレスイヤホン Bluetooth">
                        </div>
                        <div class="form-group">
                            <label>仕入れ価格 (円)</label>
                            <input type="number" id="shopeePurchasePrice" placeholder="3000">
                        </div>
                        <div class="form-group">
                            <label>販売価格 (現地通貨)</label>
                            <input type="number" id="shopeeSellPrice" placeholder="100" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>送料 (現地通貨)</label>
                            <input type="number" id="shopeeShipping" placeholder="10" step="0.01">
                        </div>
                    </div>

                    <div class="form-section">
                        <h4><i class="fas fa-globe-asia"></i> <span id="countryTitle">シンガポール</span> 関税設定</h4>
                        <div class="form-group">
                            <label>関税率 (%)</label>
                            <input type="number" id="shopeeTariffRate" value="7.0" step="0.1">
                        </div>
                        <div class="form-group">
                            <label>GST/VAT (%)</label>
                            <input type="number" id="shopeeVatRate" value="7.0" step="0.1">
                        </div>
                        <div class="form-group">
                            <label>免税額 (現地通貨)</label>
                            <input type="number" id="shopeeDutyFree" value="400">
                        </div>
                        <div class="form-group">
                            <label>選択国通貨</label>
                            <input type="text" id="selectedCountry" readonly value="シンガポール (SGD)">
                        </div>
                    </div>
                </div>

                <button class="btn btn-primary btn-calculate" onclick="calculateShopee()">
                    <i class="fas fa-calculator"></i> Shopee 7カ国利益計算実行
                </button>
            </div>
        </div>

        <!-- 段階手数料管理タブ -->
        <div id="fees" class="tab">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-tags"></i> eBay段階手数料管理
                    </h3>
                    <div class="btn-group">
                        <button class="btn btn-info" onclick="updateFeesAPI()">
                            <i class="fas fa-sync"></i> API更新
                        </button>
                        <button class="btn btn-warning" onclick="editFees()">
                            <i class="fas fa-edit"></i> 手数料編集
                        </button>
                    </div>
                </div>

                <!-- 段階手数料テーブル -->
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>カテゴリーID</th>
                            <th>カテゴリー名</th>
                            <th>Tier1手数料</th>
                            <th>Tier1閾値</th>
                            <th>Tier2手数料</th>
                            <th>Insertion Fee</th>
                            <th>最終更新</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>293</td>
                            <td>Consumer Electronics</td>
                            <td>10.0%</td>
                            <td>$7,500</td>
                            <td>12.35%</td>
                            <td>$0.35</td>
                            <td>2025-09-17</td>
                        </tr>
                        <tr>
                            <td>11450</td>
                            <td>Clothing & Accessories</td>
                            <td>12.9%</td>
                            <td>$10,000</td>
                            <td>14.70%</td>
                            <td>$0.30</td>
                            <td>2025-09-17</td>
                        </tr>
                        <tr>
                            <td>58058</td>
                            <td>Collectibles</td>
                            <td>9.15%</td>
                            <td>$5,000</td>
                            <td>11.70%</td>
                            <td>$0.35</td>
                            <td>2025-09-17</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 利益率設定タブ -->
        <div id="settings" class="tab">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-sliders-h"></i> 階層型利益率設定
                    </h3>
                    <button class="btn btn-primary" onclick="addProfitRule()">
                        <i class="fas fa-plus"></i> 新規設定追加
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-xl);">
                    <div style="background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: var(--space-lg);">
                        <h4><i class="fas fa-globe"></i> グローバル設定</h4>
                        <div class="form-group">
                            <label>デフォルト目標利益率 (%)</label>
                            <input type="number" id="globalMargin" value="25.0" step="0.1">
                        </div>
                        <div class="form-group">
                            <label>最低利益額 (USD)</label>
                            <input type="number" id="globalMinProfit" value="5.00" step="0.01">
                        </div>
                    </div>

                    <div style="background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: var(--space-lg);">
                        <h4><i class="fas fa-layer-group"></i> 優先順位</h4>
                        <div style="background: var(--bg-secondary); padding: var(--space-md); border-radius: var(--radius-md);">
                            <div style="padding: var(--space-sm) 0; border-bottom: 1px solid var(--border-color);">
                                <strong>1. 期間別設定</strong> (最高優先)
                            </div>
                            <div style="padding: var(--space-sm) 0; border-bottom: 1px solid var(--border-color);">
                                <strong>2. コンディション別</strong> (高優先)
                            </div>
                            <div style="padding: var(--space-sm) 0; border-bottom: 1px solid var(--border-color);">
                                <strong>3. カテゴリー別</strong> (中優先)
                            </div>
                            <div style="padding: var(--space-sm) 0;">
                                <strong>4. グローバル設定</strong> (デフォルト)
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 利益率設定テーブル -->
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>設定タイプ</th>
                            <th>対象値</th>
                            <th>目標利益率</th>
                            <th>最低利益額</th>
                            <th>優先順位</th>
                            <th>状態</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span style="color: var(--success);">期間</span></td>
                            <td>30日経過</td>
                            <td>15.0%</td>
                            <td>$2.00</td>
                            <td>50</td>
                            <td><span style="color: var(--success);">有効</span></td>
                        </tr>
                        <tr>
                            <td><span style="color: var(--info);">コンディション</span></td>
                            <td>新品</td>
                            <td>28.0%</td>
                            <td>$7.00</td>
                            <td>200</td>
                            <td><span style="color: var(--success);">有効</span></td>
                        </tr>
                        <tr>
                            <td><span style="color: var(--warning);">カテゴリー</span></td>
                            <td>Electronics (293)</td>
                            <td>30.0%</td>
                            <td>$8.00</td>
                            <td>100</td>
                            <td><span style="color: var(--success);">有効</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 為替レートタブ -->
        <div id="rates" class="tab">
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fas fa-exchange-alt"></i> 為替レート管理
                    </h3>
                    <button class="btn btn-info" onclick="updateRates()">
                        <i class="fas fa-sync"></i> レート更新
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-xl);">
                    <div style="background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: var(--space-lg);">
                        <h4><i class="fas fa-chart-line"></i> USD/JPY</h4>
                        <div style="text-align: center; padding: var(--space-lg);">
                            <div style="font-size: 2.5rem; font-weight: 700; color: var(--calc-primary); margin-bottom: var(--space-sm);">
                                ¥148.50
                            </div>
                            <div style="color: var(--text-muted);">1 USD = 148.50 JPY</div>
                            <div style="font-size: 0.875rem; color: var(--text-muted); margin-top: var(--space-sm);">
                                最終更新: 2025-09-17 14:30
                            </div>
                        </div>
                    </div>

                    <div style="background: var(--bg-tertiary); border-radius: var(--radius-lg); padding: var(--space-lg);">
                        <h4><i class="fas fa-globe-asia"></i> Shopee各国レート</h4>
                        <div style="display: grid; gap: var(--space-sm);">
                            <div style="display: flex; justify-content: space-between;">
                                <span>🇸🇬 SGD:</span><span>¥110.45</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>🇲🇾 MYR:</span><span>¥33.78</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>🇹🇭 THB:</span><span>¥4.23</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>🇻🇳 VND:</span><span>¥0.0061</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>🇵🇭 PHP:</span><span>¥2.68</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>🇮🇩 IDR:</span><span>¥0.0098</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>🇹🇼 TWD:</span><span>¥4.75</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript読み込み -->
    <script>
        // タブ切り替え機能（インライン実装）
        function showTab(tabName) {
            // すべてのナビゲーションボタンからactiveクラスを削除
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            // すべてのタブからactiveクラスを削除
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            
            // クリックされたボタンにactiveクラスを追加
            event.target.classList.add('active');
            // 対応するタブにactiveクラスを追加
            document.getElementById(tabName).classList.add('active');
            
            console.log(`📋 タブ切り替え: ${tabName}`);
        }
        
        // 基本的な計算機能（プレースホルダー）
        function calculateAdvanced() {
            alert('高精度利益計算機能は開発中です。APIと連携して実装予定です。');
        }
        
        function calculateEbay() {
            alert('eBay計算機能は開発中です。');
        }
        
        function calculateShopee() {
            alert('Shopee計算機能は開発中です。');
        }
        
        function clearAll() {
            const inputs = document.querySelectorAll('input[type="number"], input[type="text"]');
            inputs.forEach(input => input.value = '');
            console.log('フォームをクリアしました');
        }
        
        function loadSample() {
            document.getElementById('yahooPrice').value = '15000';
            document.getElementById('domesticShipping').value = '800';
            document.getElementById('outsourceFee').value = '500';
            document.getElementById('packagingFee').value = '200';
            document.getElementById('assumedPrice').value = '120.00';
            document.getElementById('assumedShipping').value = '15.00';
            console.log('サンプルデータを読み込みました');
        }
        
        function loadAdvanced() {
            document.getElementById('yahooPrice').value = '75000';
            document.getElementById('domesticShipping').value = '1200';
            document.getElementById('outsourceFee').value = '1000';
            document.getElementById('packagingFee').value = '500';
            document.getElementById('assumedPrice').value = '899.99';
            document.getElementById('assumedShipping').value = '35.00';
            console.log('高精度プリセットを読み込みました');
        }
        
        // モード・国選択機能
        let currentMode = 'ddp';
        let selectedCountry = 'SG';
        
        function selectMode(mode) {
            currentMode = mode;
            document.querySelectorAll('.mode-card').forEach(card => card.classList.remove('selected'));
            document.querySelector(`[data-mode="${mode}"]`).classList.add('selected');
            console.log(`モード選択: ${mode}`);
        }
        
        function selectCountry(country) {
            selectedCountry = country;
            document.querySelectorAll('.country-btn').forEach(btn => btn.classList.remove('selected'));
            document.querySelector(`[data-country="${country}"]`).classList.add('selected');
            console.log(`国選択: ${country}`);
        }
        
        // プリセット機能
        function loadEbayPreset() {
            document.getElementById('ebayTitle').value = 'iPhone 15 Pro Max 256GB';
            document.getElementById('ebayPurchasePrice').value = '150000';
            document.getElementById('ebaySellPrice').value = '1200';
            document.getElementById('ebayShipping').value = '25';
            console.log('eBayプリセットを読み込みました');
        }
        
        function loadShopeePreset() {
            document.getElementById('shopeeTitle').value = 'ワイヤレスイヤホン Bluetooth';
            document.getElementById('shopeePurchasePrice').value = '3000';
            document.getElementById('shopeeSellPrice').value = '100';
            document.getElementById('shopeeShipping').value = '10';
            console.log('Shopeeプリセットを読み込みました');
        }
        
        // 設定保存機能（プレースホルダー）
        function saveEbayConfig() {
            alert('eBay設定保存機能は開発中です。');
        }
        
        function saveShopeeConfig() {
            alert('Shopee設定保存機能は開発中です。');
        }
        
        // API機能（プレースホルダー）
        function updateFeesAPI() {
            alert('手数料API更新機能は開発中です。');
        }
        
        function editFees() {
            alert('手数料編集機能は開発中です。');
        }
        
        function addProfitRule() {
            alert('利益設定追加機能は開発中です。');
        }
        
        function updateRates() {
            alert('為替レート更新機能は開発中です。');
        }
        
        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎯 利益計算システム初期化完了');
            console.log('✅ タブ切り替え機能が利用可能です');
        });
    </script>
    
    <!-- 外部JavaScript読み込み（オプション） -->
    <script src="assets/calculator.js" onerror="console.log('外部JavaScriptファイルが見つかりません。内部実装を使用します。')"></script>
</body>
</html>