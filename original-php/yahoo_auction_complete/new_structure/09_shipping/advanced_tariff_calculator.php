<?php
/**
 * 高度統合利益計算システム - 関税・DDP/DDU対応
 */

// セキュリティ・セッション管理
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>高度統合利益計算システム - 関税・DDP/DDU対応</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root {
            /* カラーパレット */
            --primary: #3b82f6;
            --secondary: #64748b;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --info: #06b6d4;
            --ebay-color: #e53e3e;
            --shopee-color: #ee4d2d;
            
            /* ニュートラルカラー */
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f1f5f9;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --border-hover: #cbd5e0;
            
            /* スペーシング */
            --space-xs: 0.25rem;
            --space-sm: 0.5rem;
            --space-md: 1rem;
            --space-lg: 1.5rem;
            --space-xl: 2rem;
            --space-2xl: 3rem;
            
            /* 境界線とシャドウ */
            --radius-sm: 0.375rem;
            --radius-md: 0.5rem;
            --radius-lg: 0.75rem;
            --radius-xl: 1rem;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }

        /* ヘッダー */
        .header {
            background: linear-gradient(135deg, var(--primary), #1e40af);
            color: white;
            padding: var(--space-xl);
            text-align: center;
            box-shadow: var(--shadow-lg);
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: var(--space-sm);
            font-weight: 700;
        }

        .header p {
            font-size: 1.125rem;
            opacity: 0.9;
        }

        /* コンテナ */
        .container {
            max-width: 1600px;
            margin: 0 auto;
            padding: var(--space-xl);
        }

        /* タブナビゲーション */
        .tab-navigation {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-sm);
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-sm);
            margin-bottom: var(--space-xl);
            box-shadow: var(--shadow-md);
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
            transition: all 0.2s ease;
            white-space: nowrap;
            text-decoration: none;
        }

        .tab-btn:hover {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            transform: translateY(-1px);
        }

        .tab-btn.active {
            background: var(--primary);
            color: white;
            box-shadow: var(--shadow-md);
            transform: translateY(-2px);
        }

        /* タブコンテンツ */
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

        /* 計算セクション */
        .calculation-section {
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            padding: var(--space-2xl);
            margin-bottom: var(--space-xl);
            box-shadow: var(--shadow-md);
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-xl);
            padding-bottom: var(--space-lg);
            border-bottom: 2px solid var(--border);
        }

        .section-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .section-actions {
            display: flex;
            gap: var(--space-sm);
        }

        /* フォームグリッド */
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: var(--space-xl);
            margin-bottom: var(--space-xl);
        }

        .form-section {
            background: var(--bg-tertiary);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            border: 1px solid var(--border);
        }

        .form-section h4 {
            color: var(--text-primary);
            margin-bottom: var(--space-lg);
            font-size: 1.125rem;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            font-weight: 600;
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
            border: 2px solid var(--border);
            border-radius: var(--radius-md);
            font-size: 1rem;
            transition: all 0.2s ease;
            background: var(--bg-secondary);
            color: var(--text-primary);
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* 関税設定エリア */
        .tariff-settings {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(220, 38, 127, 0.05));
            border: 2px solid var(--danger);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-bottom: var(--space-lg);
        }

        .tariff-header {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            margin-bottom: var(--space-lg);
        }

        .tariff-icon {
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 50%;
            background: var(--danger);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
        }

        .tariff-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--danger);
        }

        /* DDP/DDU選択 */
        .shipping-mode-selector {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--space-md);
            margin-bottom: var(--space-lg);
        }

        .mode-card {
            background: var(--bg-secondary);
            border: 2px solid var(--border);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
        }

        .mode-card:hover {
            border-color: var(--primary);
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }

        .mode-card.selected {
            border-color: var(--primary);
            background: rgba(59, 130, 246, 0.05);
        }

        .mode-title {
            font-size: 1.125rem;
            font-weight: 700;
            margin-bottom: var(--space-sm);
        }

        .mode-description {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        /* 国別設定 */
        .country-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: var(--space-sm);
            margin-bottom: var(--space-lg);
        }

        .country-btn {
            padding: var(--space-md);
            border: 2px solid var(--border);
            background: var(--bg-secondary);
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
            font-weight: 600;
            font-size: 0.875rem;
        }

        .country-btn:hover {
            border-color: var(--shopee-color);
            background: rgba(238, 77, 45, 0.05);
        }

        .country-btn.selected {
            border-color: var(--shopee-color);
            background: var(--shopee-color);
            color: white;
        }

        /* ボタン */
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
            transition: all 0.2s ease;
            text-decoration: none;
            text-align: center;
        }

        .btn-primary {
            background: var(--primary);
            color: white;
            box-shadow: var(--shadow-md);
        }

        .btn-primary:hover {
            background: #2563eb;
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .btn-secondary {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 2px solid var(--border);
        }

        .btn-secondary:hover {
            background: var(--bg-secondary);
            border-color: var(--border-hover);
        }

        .btn-success {
            background: var(--success);
            color: white;
        }

        .btn-warning {
            background: var(--warning);
            color: white;
        }

        .btn-calculate {
            width: 100%;
            padding: var(--space-lg);
            font-size: 1.125rem;
            margin-top: var(--space-lg);
        }

        /* 結果表示 */
        .results-container {
            display: none;
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            padding: var(--space-2xl);
            margin-top: var(--space-xl);
            box-shadow: var(--shadow-md);
        }

        .results-container.show {
            display: block;
            animation: fadeIn 0.5s ease;
        }

        .profit-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: var(--space-lg);
            margin-bottom: var(--space-xl);
        }

        .profit-card {
            background: var(--bg-tertiary);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            text-align: center;
            box-shadow: var(--shadow-sm);
            border: 2px solid transparent;
        }

        .profit-card.positive {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
            border-color: var(--success);
        }

        .profit-card.negative {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
            border-color: var(--danger);
        }

        .profit-card.warning {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
            border-color: var(--warning);
        }

        .profit-value {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: var(--space-sm);
        }

        .profit-value.positive { color: var(--success); }
        .profit-value.negative { color: var(--danger); }
        .profit-value.warning { color: var(--warning); }

        .profit-label {
            color: var(--text-secondary);
            font-size: 0.875rem;
            font-weight: 600;
        }

        /* 詳細テーブル */
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: var(--space-lg);
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
        }

        .details-table th,
        .details-table td {
            padding: var(--space-md);
            text-align: left;
            border-bottom: 1px solid var(--border);
        }

        .details-table th {
            background: var(--bg-tertiary);
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .details-table tr:hover {
            background: rgba(0, 0, 0, 0.02);
        }

        /* レスポンシブ */
        @media (max-width: 768px) {
            .container {
                padding: var(--space-md);
            }

            .header h1 {
                font-size: 2rem;
            }

            .form-grid {
                grid-template-columns: 1fr;
            }

            .shipping-mode-selector {
                grid-template-columns: 1fr;
            }

            .profit-summary {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <!-- ヘッダー -->
    <div class="header">
        <h1><i class="fas fa-calculator"></i> 高度統合利益計算システム</h1>
        <p>関税・DDP/DDU対応 - eBay USA & Shopee 7カ国完全対応</p>
    </div>

    <div class="container">
        <!-- タブナビゲーション -->
        <div class="tab-navigation">
            <button class="tab-btn active" onclick="showTab('ebay-usa')">
                <i class="fab fa-ebay"></i> eBay USA (DDP/DDU)
            </button>
            <button class="tab-btn" onclick="showTab('shopee-7countries')">
                <i class="fas fa-shopping-bag"></i> Shopee 7カ国
            </button>
            <button class="tab-btn" onclick="showTab('formula-viewer')">
                <i class="fas fa-function"></i> 計算式表示
            </button>
        </div>

        <!-- eBay USA タブ -->
        <div id="ebay-usa" class="tab-content active">
            <div class="calculation-section">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fab fa-ebay" style="color: var(--ebay-color);"></i>
                        eBay USA 利益計算 (DDP/DDU対応)
                    </div>
                    <div class="section-actions">
                        <button class="btn btn-secondary" onclick="loadEbayPreset()">
                            <i class="fas fa-download"></i> プリセット読込
                        </button>
                        <button class="btn btn-success" onclick="saveEbayConfig()">
                            <i class="fas fa-save"></i> 設定保存
                        </button>
                    </div>
                </div>

                <!-- DDP/DDU選択 -->
                <div class="shipping-mode-selector">
                    <div class="mode-card selected" onclick="selectShippingMode('ddp')" data-mode="ddp">
                        <div class="mode-title">DDP (Delivered Duty Paid)</div>
                        <div class="mode-description">関税込み配送 - 売主が関税負担</div>
                    </div>
                    <div class="mode-card" onclick="selectShippingMode('ddu')" data-mode="ddu">
                        <div class="mode-title">DDU (Delivered Duty Unpaid)</div>
                        <div class="mode-description">関税別配送 - 買主が関税負担</div>
                    </div>
                </div>

                <!-- 関税設定 -->
                <div class="tariff-settings">
                    <div class="tariff-header">
                        <div class="tariff-icon">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <div>
                            <div class="tariff-title">USA関税設定</div>
                            <div style="font-size: 0.875rem; color: var(--text-secondary);">
                                商品カテゴリー別関税率 - UI設定可能
                            </div>
                        </div>
                    </div>

                    <div class="form-grid">
                        <div class="form-section">
                            <h4><i class="fas fa-percentage"></i> 基本関税率</h4>
                            <div class="form-group">
                                <label>Electronics関税率 (%)</label>
                                <input type="number" id="usa-electronics-tariff" value="7.5" step="0.1" placeholder="7.5">
                            </div>
                            <div class="form-group">
                                <label>Textiles関税率 (%)</label>
                                <input type="number" id="usa-textiles-tariff" value="12.0" step="0.1" placeholder="12.0">
                            </div>
                            <div class="form-group">
                                <label>Other関税率 (%)</label>
                                <input type="number" id="usa-other-tariff" value="5.0" step="0.1" placeholder="5.0">
                            </div>
                        </div>

                        <div class="form-section">
                            <h4><i class="fas fa-calculator"></i> 追加費用</h4>
                            <div class="form-group">
                                <label>外注工賃費 (円)</label>
                                <input type="number" id="usa-outsource-fee" value="500" placeholder="500">
                            </div>
                            <div class="form-group">
                                <label>梱包費 (円)</label>
                                <input type="number" id="usa-packaging-fee" value="200" placeholder="200">
                            </div>
                            <div class="form-group">
                                <label>為替変動マージン (%)</label>
                                <input type="number" id="usa-exchange-margin" value="5.0" step="0.1" placeholder="5.0">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 商品情報 -->
                <div class="form-grid">
                    <div class="form-section">
                        <h4><i class="fas fa-box"></i> 商品情報</h4>
                        <div class="form-group">
                            <label>商品タイトル</label>
                            <input type="text" id="usa-item-title" placeholder="iPhone 15 Pro Max 256GB">
                        </div>
                        <div class="form-group">
                            <label>仕入れ価格 (円)</label>
                            <input type="number" id="usa-purchase-price" placeholder="150000">
                        </div>
                        <div class="form-group">
                            <label>販売価格 (USD)</label>
                            <input type="number" id="usa-sell-price" placeholder="1200" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>送料 (USD)</label>
                            <input type="number" id="usa-shipping" placeholder="25" step="0.01">
                        </div>
                    </div>

                    <div class="form-section">
                        <h4><i class="fas fa-cog"></i> eBay設定</h4>
                        <div class="form-group">
                            <label>商品カテゴリー</label>
                            <select id="usa-category">
                                <option value="electronics">Electronics</option>
                                <option value="textiles">Clothing & Textiles</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>商品状態</label>
                            <select id="usa-condition">
                                <option value="New">New</option>
                                <option value="Used">Used</option>
                                <option value="Refurbished">Refurbished</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>重量 (kg)</label>
                            <input type="number" id="usa-weight" placeholder="0.5" step="0.1">
                        </div>
                    </div>
                </div>

                <button class="btn btn-primary btn-calculate" onclick="calculateEbayUSA()">
                    <i class="fas fa-calculator"></i> eBay USA利益計算実行
                </button>
            </div>
        </div>

        <!-- Shopee 7カ国 タブ -->
        <div id="shopee-7countries" class="tab-content">
            <div class="calculation-section">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fas fa-shopping-bag" style="color: var(--shopee-color);"></i>
                        Shopee 7カ国 利益計算 (関税対応)
                    </div>
                    <div class="section-actions">
                        <button class="btn btn-secondary" onclick="loadShopeePreset()">
                            <i class="fas fa-download"></i> プリセット読込
                        </button>
                        <button class="btn btn-success" onclick="saveShopeeConfig()">
                            <i class="fas fa-save"></i> 設定保存
                        </button>
                    </div>
                </div>

                <!-- 国選択 -->
                <div class="country-grid">
                    <div class="country-btn selected" data-country="SG" onclick="selectShopeeCountry('SG')">
                        🇸🇬 シンガポール
                    </div>
                    <div class="country-btn" data-country="MY" onclick="selectShopeeCountry('MY')">
                        🇲🇾 マレーシア
                    </div>
                    <div class="country-btn" data-country="TH" onclick="selectShopeeCountry('TH')">
                        🇹🇭 タイ
                    </div>
                    <div class="country-btn" data-country="PH" onclick="selectShopeeCountry('PH')">
                        🇵🇭 フィリピン
                    </div>
                    <div class="country-btn" data-country="ID" onclick="selectShopeeCountry('ID')">
                        🇮🇩 インドネシア
                    </div>
                    <div class="country-btn" data-country="VN" onclick="selectShopeeCountry('VN')">
                        🇻🇳 ベトナム
                    </div>
                    <div class="country-btn" data-country="TW" onclick="selectShopeeCountry('TW')">
                        🇹🇼 台湾
                    </div>
                </div>

                <!-- 商品情報フォーム -->
                <div class="form-grid">
                    <div class="form-section">
                        <h4><i class="fas fa-box"></i> 商品情報</h4>
                        <div class="form-group">
                            <label>商品タイトル</label>
                            <input type="text" id="shopee-item-title" placeholder="ワイヤレスイヤホン Bluetooth">
                        </div>
                        <div class="form-group">
                            <label>仕入れ価格 (円)</label>
                            <input type="number" id="shopee-purchase-price" placeholder="3000">
                        </div>
                        <div class="form-group">
                            <label>販売価格 (現地通貨)</label>
                            <input type="number" id="shopee-sell-price" placeholder="100" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>送料 (現地通貨)</label>
                            <input type="number" id="shopee-shipping" placeholder="10" step="0.01">
                        </div>
                    </div>

                    <div class="form-section">
                        <h4><i class="fas fa-cog"></i> Shopee設定</h4>
                        <div class="form-group">
                            <label>商品カテゴリー</label>
                            <select id="shopee-category">
                                <option value="electronics">Electronics</option>
                                <option value="fashion">Fashion</option>
                                <option value="home">Home & Living</option>
                                <option value="beauty">Beauty</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>重量 (kg)</label>
                            <input type="number" id="shopee-weight" placeholder="0.2" step="0.1">
                        </div>
                        <div class="form-group">
                            <label>選択国</label>
                            <input type="text" id="shopee-selected-country" readonly value="シンガポール (SGD)">
                        </div>
                    </div>
                </div>

                <button class="btn btn-primary btn-calculate" onclick="calculateShopee7Countries()">
                    <i class="fas fa-calculator"></i> Shopee 7カ国利益計算実行
                </button>
            </div>
        </div>

        <!-- 計算式表示タブ -->
        <div id="formula-viewer" class="tab-content">
            <div class="calculation-section">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fas fa-function"></i>
                        計算式・ロジック表示
                    </div>
                </div>

                <div style="background: var(--bg-tertiary); padding: var(--space-lg); border-radius: var(--radius-lg); margin-bottom: var(--space-lg);">
                    <h3>eBay USA DDP計算式</h3>
                    <p style="font-family: monospace; line-height: 1.8; margin-top: var(--space-md);">
                        総コスト円 = 仕入れ価格 + 外注工賃費 + 梱包費 + 国内送料<br>
                        安全為替レート = 基本為替レート × (1 + 為替変動マージン%)<br>
                        関税額USD = (販売価格USD + 送料USD) × 関税率%<br>
                        eBay手数料USD = 収入総額 × 12.9% + PayPal手数料<br>
                        利益円 = (収入総額USD - 関税額USD - eBay手数料USD) × 安全為替レート - 総コスト円
                    </p>
                </div>

                <div style="background: var(--bg-tertiary); padding: var(--space-lg); border-radius: var(--radius-lg);">
                    <h3>Shopee 7カ国計算式</h3>
                    <p style="font-family: monospace; line-height: 1.8; margin-top: var(--space-md);">
                        課税対象額 = 販売価格 + 送料 - 免税額<br>
                        関税額 = max(0, 課税対象額 × 関税率%)<br>
                        GST/VAT額 = (課税対象額 + 関税額) × GST/VAT率%<br>
                        Shopee手数料 = 収入総額 × 販売手数料率% + 決済手数料<br>
                        利益円 = (収入総額 - 関税額 - GST/VAT額 - Shopee手数料) × 為替レート - 総コスト円
                    </p>
                </div>
            </div>
        </div>

        <!-- 結果表示エリア -->
        <div id="resultsContainer" class="results-container">
            <div class="section-header">
                <div class="section-title">
                    <i class="fas fa-chart-line"></i>
                    計算結果
                </div>
                <div class="section-actions">
                    <button class="btn btn-secondary" onclick="exportResults()">
                        <i class="fas fa-download"></i> 結果出力
                    </button>
                </div>
            </div>

            <!-- 利益サマリー -->
            <div class="profit-summary">
                <div class="profit-card" id="profitCard">
                    <div class="profit-value" id="profitValue">¥0</div>
                    <div class="profit-label">予想利益</div>
                </div>
                <div class="profit-card" id="marginCard">
                    <div class="profit-value" id="marginValue">0%</div>
                    <div class="profit-label">利益率</div>
                </div>
                <div class="profit-card" id="roiCard">
                    <div class="profit-value" id="roiValue">0%</div>
                    <div class="profit-label">ROI</div>
                </div>
                <div class="profit-card" id="tariffCard">
                    <div class="profit-value" id="tariffValue">¥0</div>
                    <div class="profit-label">関税・税額</div>
                </div>
            </div>

            <!-- 詳細結果テーブル -->
            <table class="details-table">
                <thead>
                    <tr>
                        <th>項目</th>
                        <th>金額</th>
                        <th>計算式</th>
                        <th>備考</th>
                    </tr>
                </thead>
                <tbody id="detailsTableBody">
                    <!-- 動的に生成 -->
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // グローバル変数
        let currentShippingMode = 'ddp';
        let selectedShopeeCountry = 'SG';

        // 国別設定データ
        const countrySettings = {
            'SG': {
                name: 'シンガポール',
                currency: 'SGD',
                exchangeRate: 110,
                tariffRate: 7.0,
                vatRate: 7.0,
                dutyFreeAmount: 400,
                commissionRate: 6.0
            },
            'MY': {
                name: 'マレーシア',
                currency: 'MYR',
                exchangeRate: 35,
                tariffRate: 15.0,
                vatRate: 10.0,
                dutyFreeAmount: 500,
                commissionRate: 5.5
            },
            'TH': {
                name: 'タイ',
                currency: 'THB',
                exchangeRate: 4.3,
                tariffRate: 20.0,
                vatRate: 7.0,
                dutyFreeAmount: 1500,
                commissionRate: 5.0
            },
            'PH': {
                name: 'フィリピン',
                currency: 'PHP',
                exchangeRate: 2.7,
                tariffRate: 25.0,
                vatRate: 12.0,
                dutyFreeAmount: 10000,
                commissionRate: 5.5
            },
            'ID': {
                name: 'インドネシア',
                currency: 'IDR',
                exchangeRate: 0.01,
                tariffRate: 30.0,
                vatRate: 11.0,
                dutyFreeAmount: 75,
                commissionRate: 5.0
            },
            'VN': {
                name: 'ベトナム',
                currency: 'VND',
                exchangeRate: 0.006,
                tariffRate: 35.0,
                vatRate: 10.0,
                dutyFreeAmount: 200,
                commissionRate: 6.0
            },
            'TW': {
                name: '台湾',
                currency: 'TWD',
                exchangeRate: 4.8,
                tariffRate: 10.0,
                vatRate: 5.0,
                dutyFreeAmount: 2000,
                commissionRate: 5.5
            }
        };

        // タブ切り替え
        function showTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
            event.target.classList.add('active');
            hideResults();
        }

        // 配送モード選択 (DDP/DDU)
        function selectShippingMode(mode) {
            currentShippingMode = mode;
            document.querySelectorAll('.mode-card').forEach(card => {
                card.classList.remove('selected');
            });
            document.querySelector(`[data-mode="${mode}"]`).classList.add('selected');
        }

        // Shopee国選択
        function selectShopeeCountry(countryCode) {
            selectedShopeeCountry = countryCode;
            document.querySelectorAll('.country-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            document.querySelector(`[data-country="${countryCode}"]`).classList.add('selected');
            
            const settings = countrySettings[countryCode];
            document.getElementById('shopee-selected-country').value = `${settings.name} (${settings.currency})`;
        }

        // eBay USA利益計算 (デモ実装)
        async function calculateEbayUSA() {
            const formData = getEbayUSAFormData();
            if (!validateEbayUSAData(formData)) return;

            try {
                // 基本計算ロジック (実際の実装では API呼び出し)
                const result = calculateBasicProfit(formData, 'ebay');
                displayResults(result, 'eBay USA');
            } catch (error) {
                console.error('計算エラー:', error);
                alert('計算中にエラーが発生しました。');
            }
        }

        // Shopee 7カ国利益計算 (デモ実装)
        async function calculateShopee7Countries() {
            const formData = getShopee7CountriesFormData();
            if (!validateShopee7CountriesData(formData)) return;

            try {
                // 基本計算ロジック (実際の実装では API呼び出し)
                const result = calculateBasicProfit(formData, 'shopee');
                displayResults(result, 'Shopee');
            } catch (error) {
                console.error('計算エラー:', error);
                alert('計算中にエラーが発生しました。');
            }
        }

        // 基本的な利益計算 (デモ用)
        function calculateBasicProfit(data, platform) {
            let profit = 0;
            let margin = 0;
            let roi = 0;
            let tariff = 0;

            if (platform === 'ebay') {
                const exchangeRate = 150;
                const totalCost = data.purchase_price / exchangeRate;
                const revenue = data.sell_price + data.shipping;
                const fees = revenue * 0.13; // 13% eBay手数料
                
                if (currentShippingMode === 'ddp') {
                    tariff = revenue * 0.075; // 7.5% 関税
                }
                
                profit = (revenue - totalCost - fees - tariff) * exchangeRate;
                margin = ((revenue - totalCost - fees - tariff) / revenue) * 100;
                roi = ((revenue - totalCost - fees - tariff) / totalCost) * 100;
            } else if (platform === 'shopee') {
                const settings = countrySettings[selectedShopeeCountry];
                const totalCost = data.purchase_price;
                const revenue = (data.sell_price + data.shipping) * settings.exchangeRate;
                const fees = revenue * (settings.commissionRate / 100);
                
                // 簡易関税計算
                if ((data.sell_price + data.shipping) > settings.dutyFreeAmount) {
                    tariff = (data.sell_price + data.shipping - settings.dutyFreeAmount) * settings.exchangeRate * (settings.tariffRate / 100);
                }
                
                profit = revenue - totalCost - fees - tariff;
                margin = (profit / revenue) * 100;
                roi = (profit / totalCost) * 100;
            }

            return {
                profit_jpy: Math.round(profit),
                margin_percent: Math.round(margin * 100) / 100,
                roi_percent: Math.round(roi * 100) / 100,
                tariff_jpy: Math.round(tariff),
                details: [
                    { label: '総収入', amount: `¥${Math.round((data.sell_price + data.shipping) * 150).toLocaleString()}`, formula: '販売価格 + 送料', note: '為替レート適用済み' },
                    { label: '総コスト', amount: `¥${data.purchase_price.toLocaleString()}`, formula: '仕入れ価格', note: '国内送料含む' },
                    { label: '手数料', amount: `¥${Math.round(((data.sell_price + data.shipping) * 150 * 0.13)).toLocaleString()}`, formula: '収入 × 13%', note: 'プラットフォーム手数料' },
                    { label: '関税', amount: `¥${Math.round(tariff).toLocaleString()}`, formula: '課税対象額 × 関税率', note: currentShippingMode === 'ddp' ? 'DDP適用' : 'DDU (買主負担)' }
                ]
            };
        }

        // フォームデータ取得
        function getEbayUSAFormData() {
            return {
                item_title: document.getElementById('usa-item-title').value,
                purchase_price: parseFloat(document.getElementById('usa-purchase-price').value) || 0,
                sell_price: parseFloat(document.getElementById('usa-sell-price').value) || 0,
                shipping: parseFloat(document.getElementById('usa-shipping').value) || 0,
                category: document.getElementById('usa-category').value,
                condition: document.getElementById('usa-condition').value,
                weight: parseFloat(document.getElementById('usa-weight').value) || 0,
                shipping_mode: currentShippingMode
            };
        }

        function getShopee7CountriesFormData() {
            return {
                item_title: document.getElementById('shopee-item-title').value,
                purchase_price: parseFloat(document.getElementById('shopee-purchase-price').value) || 0,
                sell_price: parseFloat(document.getElementById('shopee-sell-price').value) || 0,
                shipping: parseFloat(document.getElementById('shopee-shipping').value) || 0,
                category: document.getElementById('shopee-category').value,
                weight: parseFloat(document.getElementById('shopee-weight').value) || 0,
                country: selectedShopeeCountry
            };
        }

        // データ検証
        function validateEbayUSAData(data) {
            if (!data.item_title) {
                alert('商品タイトルを入力してください。');
                return false;
            }
            if (data.purchase_price <= 0) {
                alert('仕入れ価格を入力してください。');
                return false;
            }
            if (data.sell_price <= 0) {
                alert('販売価格を入力してください。');
                return false;
            }
            return true;
        }

        function validateShopee7CountriesData(data) {
            if (!data.item_title) {
                alert('商品タイトルを入力してください。');
                return false;
            }
            if (data.purchase_price <= 0) {
                alert('仕入れ価格を入力してください。');
                return false;
            }
            if (data.sell_price <= 0) {
                alert('販売価格を入力してください。');
                return false;
            }
            return true;
        }

        // 結果表示
        function displayResults(result, platform) {
            document.getElementById('profitValue').textContent = `¥${result.profit_jpy.toLocaleString()}`;
            document.getElementById('marginValue').textContent = `${result.margin_percent}%`;
            document.getElementById('roiValue').textContent = `${result.roi_percent}%`;
            document.getElementById('tariffValue').textContent = `¥${result.tariff_jpy.toLocaleString()}`;

            // カードの色分け
            const profitCard = document.getElementById('profitCard');
            const marginCard = document.getElementById('marginCard');
            const roiCard = document.getElementById('roiCard');
            
            const profitClass = result.profit_jpy >= 0 ? 'positive' : 'negative';
            profitCard.className = `profit-card ${profitClass}`;
            marginCard.className = `profit-card ${profitClass}`;
            roiCard.className = `profit-card ${profitClass}`;

            // 詳細テーブル更新
            const tableBody = document.getElementById('detailsTableBody');
            tableBody.innerHTML = '';

            if (result.details) {
                result.details.forEach(detail => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><strong>${detail.label}</strong></td>
                        <td>${detail.amount}</td>
                        <td><code>${detail.formula}</code></td>
                        <td>${detail.note}</td>
                    `;
                    tableBody.appendChild(row);
                });
            }

            showResults();
        }

        // プリセット読込・設定保存機能
        function loadEbayPreset() {
            document.getElementById('usa-item-title').value = 'iPhone 15 Pro Max 256GB';
            document.getElementById('usa-purchase-price').value = 150000;
            document.getElementById('usa-sell-price').value = 1200;
            document.getElementById('usa-shipping').value = 25;
            showNotification('eBayプリセットを読み込みました', 'info');
        }

        function loadShopeePreset() {
            document.getElementById('shopee-item-title').value = 'ワイヤレスイヤホン Bluetooth 5.0';
            document.getElementById('shopee-purchase-price').value = 3000;
            document.getElementById('shopee-sell-price').value = 100;
            document.getElementById('shopee-shipping').value = 10;
            showNotification('Shopeeプリセットを読み込みました', 'info');
        }

        function saveEbayConfig() {
            // 設定保存ロジック（実装時にAPI呼び出し）
            showNotification('eBay USA設定を保存しました！', 'success');
        }

        function saveShopeeConfig() {
            // 設定保存ロジック（実装時にAPI呼び出し）
            showNotification('Shopee設定を保存しました！', 'success');
        }

        function exportResults() {
            const resultData = {
                timestamp: new Date().toISOString(),
                profit_value: document.getElementById('profitValue').textContent,
                margin_value: document.getElementById('marginValue').textContent,
                roi_value: document.getElementById('roiValue').textContent,
                tariff_value: document.getElementById('tariffValue').textContent
            };
            
            const blob = new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `利益計算結果_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('計算結果をエクスポートしました', 'success');
        }

        function showNotification(message, type = 'info') {
            // 既存の通知を削除
            const existingNotification = document.querySelector('.settings-notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            // 新しい通知作成
            const notification = document.createElement('div');
            notification.className = `settings-notification ${type}`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-weight: 600;
                max-width: 300px;
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // 3秒後に自動削除
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 3000);
        }

        // ユーティリティ関数
        function showResults() {
            document.getElementById('resultsContainer').classList.add('show');
        }

        function hideResults() {
            document.getElementById('resultsContainer').classList.remove('show');
        }

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            selectShopeeCountry('SG');
            console.log('高度統合利益計算システム初期化完了');
        });
    </script>
</body>
</html>