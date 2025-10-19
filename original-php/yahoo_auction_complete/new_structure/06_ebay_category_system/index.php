<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBay カテゴリーシステム</title>
    <link rel="stylesheet" href="../shared/css/common.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div class="container">
        <!-- ページヘッダー -->
        <header class="page-header">
            <h1><i class="fas fa-tags"></i> eBay カテゴリーシステム</h1>
            <div class="stats-summary">
                <div class="stat-item">
                    <i class="fas fa-list"></i>
                    <span>カテゴリー管理</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-percentage"></i>
                    <span>手数料計算</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-database"></i>
                    <span>システム統合</span>
                </div>
            </div>
        </header>

        <!-- 機能選択 -->
        <div class="section">
            <h2><i class="fas fa-tools"></i> 利用可能な機能</h2>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-4); margin-top: var(--space-4);">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-sitemap"></i>
                    </div>
                    <h3>カテゴリー階層管理</h3>
                    <p>eBayカテゴリーの階層構造を管理し、適切な手数料を自動計算します。</p>
                    <button class="btn btn-primary" onclick="showCategoryManager()">
                        <i class="fas fa-cog"></i>管理画面
                    </button>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-calculator"></i>
                    </div>
                    <h3>手数料計算機</h3>
                    <p>カテゴリー別の詳細な手数料計算を実行します。</p>
                    <button class="btn btn-info" onclick="showFeeCalculator()">
                        <i class="fas fa-calculator"></i>計算開始
                    </button>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-sync"></i>
                    </div>
                    <h3>カテゴリー同期</h3>
                    <p>eBay APIからカテゴリー情報を同期し、データベースを更新します。</p>
                    <button class="btn btn-success" onclick="syncCategories()">
                        <i class="fas fa-download"></i>同期実行
                    </button>
                </div>
            </div>
        </div>

        <!-- カテゴリー管理セクション -->
        <div id="category-manager" class="section" style="display: none;">
            <h2><i class="fas fa-sitemap"></i> カテゴリー管理</h2>
            
            <div class="notification info">
                <i class="fas fa-info-circle"></i>
                この機能は開発中です。完全版では以下の機能が利用可能になります：
            </div>

            <ul style="margin-top: var(--space-3); padding-left: var(--space-4);">
                <li>eBayカテゴリーツリーの表示・検索</li>
                <li>カテゴリー別手数料率の管理</li>
                <li>商品カテゴリーの自動推奨</li>
                <li>カテゴリー変更履歴の追跡</li>
            </ul>

            <div style="margin-top: var(--space-4);">
                <h3>主要カテゴリー例</h3>
                <div style="display: grid; gap: var(--space-2); margin-top: var(--space-2);">
                    <div class="category-item">
                        <strong>Consumer Electronics</strong> - 10.0% + $0.35
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">ID: 293</div>
                    </div>
                    <div class="category-item">
                        <strong>Clothing, Shoes & Accessories</strong> - 12.9% + $0.30
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">ID: 11450</div>
                    </div>
                    <div class="category-item">
                        <strong>Collectibles</strong> - 9.15% + $0.35
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">ID: 58058</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 手数料計算機セクション -->
        <div id="fee-calculator" class="section" style="display: none;">
            <h2><i class="fas fa-calculator"></i> 手数料計算機</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-top: var(--space-4);">
                <div>
                    <h3>商品情報入力</h3>
                    <div class="form-group">
                        <label>販売価格 (USD)</label>
                        <input type="number" id="salePrice" class="form-input" placeholder="100.00" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>カテゴリー選択</label>
                        <select id="categorySelect" class="form-input">
                            <option value="293">Consumer Electronics (10.0%)</option>
                            <option value="11450">Clothing (12.9%)</option>
                            <option value="58058">Collectibles (9.15%)</option>
                            <option value="267">Books (15.0%)</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="calculateFees()">
                        <i class="fas fa-calculate"></i>手数料計算
                    </button>
                </div>

                <div>
                    <h3>計算結果</h3>
                    <div id="fee-results" class="result-display">
                        <div class="result-item">
                            <span class="result-label">Final Value Fee:</span>
                            <span class="result-value" id="finalValueFee">$0.00</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Insertion Fee:</span>
                            <span class="result-value" id="insertionFee">$0.00</span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">合計手数料:</span>
                            <span class="result-value total" id="totalFees">$0.00</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <style>
        .feature-card {
            background: var(--bg-secondary);
            padding: var(--space-4);
            border-radius: var(--radius-lg);
            text-align: center;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-sm);
            transition: var(--transition);
        }
        .feature-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
        .feature-icon {
            font-size: 3rem;
            color: var(--primary-color);
            margin-bottom: var(--space-3);
        }
        .feature-card h3 {
            margin: 0 0 var(--space-2) 0;
            color: var(--text-primary);
        }
        .feature-card p {
            color: var(--text-secondary);
            margin-bottom: var(--space-3);
        }
        .category-item {
            background: var(--bg-secondary);
            padding: var(--space-3);
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
        }
        .result-display {
            background: var(--bg-tertiary);
            padding: var(--space-4);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-color);
        }
        .result-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: var(--space-2);
            padding-bottom: var(--space-2);
            border-bottom: 1px solid var(--border-color);
        }
        .result-item:last-child {
            border-bottom: none;
            font-weight: 600;
        }
        .result-label {
            color: var(--text-secondary);
        }
        .result-value {
            font-weight: 600;
            color: var(--text-primary);
        }
        .result-value.total {
            color: var(--primary-color);
            font-size: 1.125rem;
        }
    </style>

    <script>
        function showCategoryManager() {
            hideAllSections();
            document.getElementById('category-manager').style.display = 'block';
        }

        function showFeeCalculator() {
            hideAllSections();
            document.getElementById('fee-calculator').style.display = 'block';
        }

        function hideAllSections() {
            document.getElementById('category-manager').style.display = 'none';
            document.getElementById('fee-calculator').style.display = 'none';
        }

        function calculateFees() {
            const price = parseFloat(document.getElementById('salePrice').value) || 0;
            const categorySelect = document.getElementById('categorySelect');
            const category = categorySelect.value;
            
            if (price <= 0) {
                alert('販売価格を入力してください');
                return;
            }

            // カテゴリー別手数料率
            const feeRates = {
                '293': { rate: 0.10, insertion: 0.35 }, // Electronics
                '11450': { rate: 0.129, insertion: 0.30 }, // Clothing
                '58058': { rate: 0.0915, insertion: 0.35 }, // Collectibles
                '267': { rate: 0.15, insertion: 0.30 } // Books
            };

            const fees = feeRates[category];
            const finalValueFee = price * fees.rate;
            const insertionFee = fees.insertion;
            const totalFees = finalValueFee + insertionFee;

            // 結果表示
            document.getElementById('finalValueFee').textContent = `$${finalValueFee.toFixed(2)}`;
            document.getElementById('insertionFee').textContent = `$${insertionFee.toFixed(2)}`;
            document.getElementById('totalFees').textContent = `$${totalFees.toFixed(2)}`;
        }

        function syncCategories() {
            const notification = document.createElement('div');
            notification.className = 'notification success';
            notification.innerHTML = '<i class="fas fa-check-circle"></i> カテゴリー同期機能は開発中です。';
            
            const container = document.querySelector('.container');
            container.insertBefore(notification, container.firstChild);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    </script>
</body>
</html>
