<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>商品データ編集・補完システム</title>
    <link rel="stylesheet" href="../shared/css/common.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div class="container">
        <!-- ページヘッダー -->
        <header class="page-header">
            <h1><i class="fas fa-edit"></i> 商品データ編集・補完システム</h1>
            <div class="stats-summary">
                <div class="stat-item">
                    <i class="fas fa-database"></i>
                    <span>データベース連携</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-shipping-fast"></i>
                    <span>送料計算準備</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-calculator"></i>
                    <span>利益計算連携</span>
                </div>
            </div>
        </header>

        <!-- ワークフロー表示 -->
        <div class="section">
            <h2><i class="fas fa-route"></i> 推奨ワークフロー</h2>
            <div class="workflow-steps">
                <div class="step completed">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h4>スクレイピング</h4>
                        <p>基本データ取得完了</p>
                    </div>
                </div>
                <div class="step active">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h4>データ編集・補完</h4>
                        <p>重量・サイズ入力</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h4>送料計算</h4>
                        <p>配送費用算出</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <h4>利益計算</h4>
                        <p>収益性判断</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">5</div>
                    <div class="step-content">
                        <h4>出品決定</h4>
                        <p>最終決定・出品</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 商品選択・検索 -->
        <div class="section">
            <h2><i class="fas fa-search"></i> 商品検索・選択</h2>
            
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4);">
                <div class="form-group">
                    <label>商品検索</label>
                    <input type="text" id="productSearch" class="form-input" 
                           placeholder="ゲンガー、商品名、ASIN、IDで検索...">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <button class="btn btn-primary" onclick="searchProducts()">
                        <i class="fas fa-search"></i>検索実行
                    </button>
                </div>
            </div>

            <!-- 検索結果・商品リスト -->
            <div id="productList" class="product-list">
                <!-- サンプルデータ（実際はDB連携） -->
                <div class="product-item" data-id="gengar-001" onclick="selectProduct('gengar-001')">
                    <div class="product-image">
                        <div class="image-placeholder">
                            <i class="fas fa-image"></i>
                        </div>
                    </div>
                    <div class="product-info">
                        <h4>ポケモン ゲンガー フィギュア</h4>
                        <div class="product-details">
                            <span class="price">¥15,000</span>
                            <span class="condition">中古</span>
                            <span class="status incomplete">データ不完全</span>
                        </div>
                        <div class="missing-data">
                            <span class="missing-tag">重量未入力</span>
                            <span class="missing-tag">サイズ未入力</span>
                        </div>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-sm btn-warning">
                            <i class="fas fa-edit"></i>編集
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 選択された商品の編集フォーム -->
        <div id="editingForm" class="section" style="display: none;">
            <div class="section-header">
                <h2><i class="fas fa-edit"></i> 商品データ編集</h2>
                <div class="btn-group">
                    <button class="btn btn-success" onclick="saveAndCalculateShipping()">
                        <i class="fas fa-shipping-fast"></i>保存して送料計算へ
                    </button>
                    <button class="btn btn-info" onclick="saveAndProfitCalculation()">
                        <i class="fas fa-calculator"></i>保存して利益計算へ
                    </button>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                <!-- 基本情報 -->
                <div class="form-section">
                    <h3><i class="fas fa-info-circle"></i> 基本情報</h3>
                    
                    <div class="form-group">
                        <label>商品名</label>
                        <input type="text" id="productName" class="form-input" 
                               value="ポケモン ゲンガー フィギュア">
                    </div>
                    
                    <div class="form-group">
                        <label>現在価格</label>
                        <input type="number" id="currentPrice" class="form-input" value="15000">
                    </div>
                    
                    <div class="form-group">
                        <label>商品状態</label>
                        <select id="condition" class="form-input">
                            <option value="new">新品</option>
                            <option value="used" selected>中古</option>
                            <option value="damaged">ダメージあり</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>商品説明・特記事項</label>
                        <textarea id="description" class="form-input" rows="4"
                                  placeholder="箱なし、小さな傷あり等..."></textarea>
                    </div>
                </div>

                <!-- 送料計算用データ -->
                <div class="form-section">
                    <h3><i class="fas fa-shipping-fast"></i> 送料計算用データ</h3>
                    
                    <div class="notification warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        以下のデータは送料計算に必須です
                    </div>

                    <div class="form-group">
                        <label>重量 (グラム) *必須</label>
                        <input type="number" id="weight" class="form-input required" 
                               placeholder="例: 250">
                        <small>正確な重量を入力してください（パッケージ込み）</small>
                    </div>
                    
                    <div class="form-group">
                        <label>サイズ (センチメートル) *必須</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-2);">
                            <input type="number" id="length" class="form-input required" placeholder="長さ">
                            <input type="number" id="width" class="form-input required" placeholder="幅">
                            <input type="number" id="height" class="form-input required" placeholder="高さ">
                        </div>
                        <small>梱包後のサイズを入力してください</small>
                    </div>
                    
                    <div class="form-group">
                        <label>商品カテゴリー</label>
                        <select id="category" class="form-input">
                            <option value="toys">おもちゃ・フィギュア</option>
                            <option value="electronics">電子機器</option>
                            <option value="clothing">衣類</option>
                            <option value="books">書籍</option>
                            <option value="collectibles">コレクティブル</option>
                        </select>
                    </div>

                    <!-- 入力支援ツール -->
                    <div style="margin-top: var(--space-4);">
                        <h4>入力支援ツール</h4>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-secondary" onclick="estimateWeight()">
                                <i class="fas fa-magic"></i>重量推定
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="estimateSize()">
                                <i class="fas fa-ruler"></i>サイズ推定
                            </button>
                            <button class="btn btn-sm btn-info" onclick="showSizeGuide()">
                                <i class="fas fa-question-circle"></i>サイズガイド
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- データ完成度チェック -->
            <div class="data-completeness" id="completenessCheck">
                <h3><i class="fas fa-check-circle"></i> データ完成度チェック</h3>
                <div class="completeness-grid">
                    <div class="check-item incomplete" id="check-weight">
                        <i class="fas fa-times"></i>
                        <span>重量データ</span>
                    </div>
                    <div class="check-item incomplete" id="check-size">
                        <i class="fas fa-times"></i>
                        <span>サイズデータ</span>
                    </div>
                    <div class="check-item complete" id="check-price">
                        <i class="fas fa-check"></i>
                        <span>価格データ</span>
                    </div>
                    <div class="check-item complete" id="check-condition">
                        <i class="fas fa-check"></i>
                        <span>商品状態</span>
                    </div>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" id="completenessProgress" style="width: 50%;"></div>
                </div>
                <div class="progress-text">データ完成度: <span id="completenessPercent">50</span>%</div>
            </div>

            <!-- 次のステップへのボタン -->
            <div class="next-steps" id="nextSteps" style="display: none;">
                <div class="notification success">
                    <i class="fas fa-check-circle"></i>
                    必要データが揃いました！次のステップに進めます
                </div>
                
                <div class="btn-group">
                    <a href="../09_shipping/complete_4layer_shipping_ui_php.php?product_id=gengar-001" 
                       class="btn btn-primary">
                        <i class="fas fa-shipping-fast"></i>送料計算システムへ
                    </a>
                    <a href="../05_rieki/rieki.php?product_id=gengar-001" 
                       class="btn btn-success">
                        <i class="fas fa-calculator"></i>利益計算システムへ
                    </a>
                    <button class="btn btn-info" onclick="runBothCalculations()">
                        <i class="fas fa-magic"></i>送料・利益 一括計算
                    </button>
                </div>
            </div>
        </div>
    </div>

    <style>
        .workflow-steps {
            display: flex;
            align-items: center;
            gap: var(--space-4);
            margin: var(--space-4) 0;
            overflow-x: auto;
            padding: var(--space-2) 0;
        }
        
        .step {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-3);
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            border: 2px solid var(--border-color);
            min-width: 200px;
            transition: var(--transition);
        }
        
        .step.completed {
            border-color: var(--success-color);
            background: rgba(16, 185, 129, 0.1);
        }
        
        .step.active {
            border-color: var(--primary-color);
            background: rgba(37, 99, 235, 0.1);
            transform: scale(1.05);
        }
        
        .step-number {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--border-color);
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
        }
        
        .step.completed .step-number {
            background: var(--success-color);
            color: white;
        }
        
        .step.active .step-number {
            background: var(--primary-color);
            color: white;
        }
        
        .step-content h4 {
            margin: 0 0 var(--space-1) 0;
            color: var(--text-primary);
        }
        
        .step-content p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 0.875rem;
        }
        
        .product-list {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-color);
            overflow: hidden;
        }
        
        .product-item {
            display: grid;
            grid-template-columns: 100px 1fr auto;
            gap: var(--space-3);
            padding: var(--space-3);
            border-bottom: 1px solid var(--border-color);
            cursor: pointer;
            transition: var(--transition);
        }
        
        .product-item:hover {
            background: var(--bg-hover);
        }
        
        .image-placeholder {
            width: 100px;
            height: 100px;
            background: var(--bg-tertiary);
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            font-size: 2rem;
        }
        
        .product-info h4 {
            margin: 0 0 var(--space-2) 0;
            color: var(--text-primary);
        }
        
        .product-details {
            display: flex;
            gap: var(--space-2);
            margin-bottom: var(--space-2);
        }
        
        .price {
            background: var(--success-color);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: var(--radius-sm);
            font-weight: 600;
        }
        
        .condition {
            background: var(--info-color);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: var(--radius-sm);
            font-size: 0.875rem;
        }
        
        .status.incomplete {
            background: var(--warning-color);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: var(--radius-sm);
            font-size: 0.875rem;
        }
        
        .missing-data {
            display: flex;
            gap: var(--space-1);
        }
        
        .missing-tag {
            background: var(--danger-color);
            color: white;
            padding: 0.125rem 0.375rem;
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
        }
        
        .form-section {
            background: var(--bg-secondary);
            padding: var(--space-4);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-color);
        }
        
        .form-section h3 {
            margin: 0 0 var(--space-3) 0;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--space-2);
        }
        
        .required {
            border-left: 4px solid var(--warning-color);
        }
        
        .data-completeness {
            background: var(--bg-tertiary);
            padding: var(--space-4);
            border-radius: var(--radius-lg);
            margin-top: var(--space-4);
        }
        
        .completeness-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: var(--space-2);
            margin: var(--space-3) 0;
        }
        
        .check-item {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-2);
            border-radius: var(--radius-md);
            font-weight: 500;
        }
        
        .check-item.complete {
            background: rgba(16, 185, 129, 0.1);
            color: var(--success-color);
        }
        
        .check-item.incomplete {
            background: rgba(239, 68, 68, 0.1);
            color: var(--danger-color);
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background: var(--bg-secondary);
            border-radius: var(--radius-full);
            overflow: hidden;
            margin: var(--space-3) 0 var(--space-2) 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--success-color), var(--info-color));
            transition: width 0.3s ease;
        }
        
        .progress-text {
            text-align: center;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .next-steps {
            margin-top: var(--space-4);
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-4);
            padding-bottom: var(--space-3);
            border-bottom: 2px solid var(--border-color);
        }
        
        .section-header h2 {
            margin: 0;
            display: flex;
            align-items: center;
            gap: var(--space-2);
        }
    </style>

    <script>
        let selectedProductId = null;

        function searchProducts() {
            const query = document.getElementById('productSearch').value;
            console.log('商品検索:', query);
            showNotification('検索機能は開発中です', 'info');
        }

        function selectProduct(productId) {
            selectedProductId = productId;
            document.getElementById('editingForm').style.display = 'block';
            document.getElementById('editingForm').scrollIntoView({behavior: 'smooth'});
            
            loadProductData(productId);
        }

        function loadProductData(productId) {
            if (productId === 'gengar-001') {
                document.getElementById('productName').value = 'ポケモン ゲンガー フィギュア';
                document.getElementById('currentPrice').value = 15000;
                document.getElementById('condition').value = 'used';
                document.getElementById('category').value = 'toys';
            }
            
            updateCompletenessCheck();
        }

        function updateCompletenessCheck() {
            const weight = document.getElementById('weight').value;
            const length = document.getElementById('length').value;
            const width = document.getElementById('width').value;
            const height = document.getElementById('height').value;
            
            updateCheckItem('check-weight', !!weight);
            updateCheckItem('check-size', !!(length && width && height));
            
            let completeness = 50;
            if (weight) completeness += 25;
            if (length && width && height) completeness += 25;
            
            document.getElementById('completenessProgress').style.width = completeness + '%';
            document.getElementById('completenessPercent').textContent = completeness;
            
            if (completeness === 100) {
                document.getElementById('nextSteps').style.display = 'block';
            } else {
                document.getElementById('nextSteps').style.display = 'none';
            }
        }

        function updateCheckItem(id, isComplete) {
            const element = document.getElementById(id);
            const icon = element.querySelector('i');
            
            if (isComplete) {
                element.className = 'check-item complete';
                icon.className = 'fas fa-check';
            } else {
                element.className = 'check-item incomplete';
                icon.className = 'fas fa-times';
            }
        }

        function estimateWeight() {
            const category = document.getElementById('category').value;
            let estimatedWeight;
            
            switch(category) {
                case 'toys':
                    estimatedWeight = 250;
                    break;
                case 'electronics':
                    estimatedWeight = 500;
                    break;
                default:
                    estimatedWeight = 200;
            }
            
            document.getElementById('weight').value = estimatedWeight;
            updateCompletenessCheck();
            showNotification(`推定重量 ${estimatedWeight}g を設定しました`, 'success');
        }

        function estimateSize() {
            const category = document.getElementById('category').value;
            
            if (category === 'toys') {
                document.getElementById('length').value = 15;
                document.getElementById('width').value = 12;
                document.getElementById('height').value = 20;
                updateCompletenessCheck();
                showNotification('フィギュア標準サイズを設定しました', 'success');
            }
        }

        function showSizeGuide() {
            showNotification('サイズガイド機能は開発中です', 'info');
        }

        function saveAndCalculateShipping() {
            if (!validateRequiredFields()) return;
            
            saveProductData();
            window.location.href = '../09_shipping/complete_4layer_shipping_ui_php.php?product_id=' + selectedProductId;
        }

        function saveAndProfitCalculation() {
            if (!validateRequiredFields()) return;
            
            saveProductData();
            window.location.href = '../05_rieki/rieki.php?product_id=' + selectedProductId;
        }

        function runBothCalculations() {
            if (!validateRequiredFields()) return;
            
            saveProductData();
            showNotification('一括計算機能は開発中です', 'info');
        }

        function validateRequiredFields() {
            const weight = document.getElementById('weight').value;
            const length = document.getElementById('length').value;
            const width = document.getElementById('width').value;
            const height = document.getElementById('height').value;
            
            if (!weight || !length || !width || !height) {
                showNotification('重量とサイズは必須項目です', 'warning');
                return false;
            }
            return true;
        }

        function saveProductData() {
            const productData = {
                id: selectedProductId,
                name: document.getElementById('productName').value,
                price: document.getElementById('currentPrice').value,
                condition: document.getElementById('condition').value,
                weight: document.getElementById('weight').value,
                length: document.getElementById('length').value,
                width: document.getElementById('width').value,
                height: document.getElementById('height').value,
                category: document.getElementById('category').value,
                description: document.getElementById('description').value
            };
            
            console.log('保存データ:', productData);
            showNotification('商品データを保存しました', 'success');
        }

        function showNotification(message, type = 'info') {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }

        document.addEventListener('DOMContentLoaded', function() {
            ['weight', 'length', 'width', 'height'].forEach(id => {
                document.getElementById(id).addEventListener('input', updateCompletenessCheck);
            });
        });
    </script>
</body>
</html>
