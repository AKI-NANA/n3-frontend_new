<?php
/**
 * eBayカテゴリー統合システム - 完全版UI
 * ファイル: frontend/ebay_category_tool.php (更新版)
 */
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBay統合カテゴリーシステム - 完全版</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #667eea;
            --success: #48bb78;
            --warning: #ed8936;
            --danger: #f56565;
            --info: #4299e1;
            --bg: #f7fafc;
            --card: #ffffff;
            --text: #2d3748;
            --border: #e2e8f0;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, var(--primary), #764ba2);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .nav-tabs {
            display: flex;
            background: white;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            overflow: hidden;
        }
        
        .nav-tab {
            flex: 1;
            padding: 15px 20px;
            background: #f8f9fa;
            border: none;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .nav-tab.active {
            background: var(--primary);
            color: white;
        }
        
        .nav-tab:hover {
            background: var(--primary);
            color: white;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .card {
            background: var(--card);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .grid {
            display: grid;
            gap: 25px;
        }
        
        .grid-2 { grid-template-columns: 1fr 1fr; }
        .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
        
        @media (max-width: 768px) {
            .grid-2, .grid-3 { grid-template-columns: 1fr; }
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: var(--text);
        }
        
        input, textarea, select {
            width: 100%;
            padding: 12px;
            border: 2px solid var(--border);
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.2s;
        }
        
        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: var(--primary);
        }
        
        .btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn:hover { background: #5a67d8; transform: translateY(-1px); }
        .btn:disabled { background: #a0aec0; cursor: not-allowed; transform: none; }
        .btn-success { background: var(--success); }
        .btn-warning { background: var(--warning); }
        .btn-danger { background: var(--danger); }
        .btn-info { background: var(--info); }
        
        .result {
            background: #f0fff4;
            border-left: 4px solid var(--success);
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .error {
            background: #fed7d7;
            border-left: 4px solid var(--danger);
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .confidence-bar {
            background: #e2e8f0;
            height: 20px;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .confidence-fill {
            height: 100%;
            background: linear-gradient(90deg, #f56565, #ed8936, #48bb78);
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 0.9rem;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid var(--primary);
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: var(--primary);
        }
        
        .learning-badge {
            display: inline-block;
            background: #bee3f8;
            color: #2b6cb0;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        
        .upload-area {
            border: 2px dashed var(--border);
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            background: #f8f9fa;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .upload-area:hover {
            border-color: var(--primary);
            background: #f0f9ff;
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
        
        .notification {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .notification.info {
            background: #dbeafe;
            border-left: 4px solid var(--info);
            color: #1e40af;
        }
        
        .notification.success {
            background: #d1fae5;
            border-left: 4px solid var(--success);
            color: #065f46;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-brain"></i> eBay統合カテゴリーシステム</h1>
            <p>AI学習 + API自動同期 + 手数料計算 - 完全統合版</p>
        </div>

        <div class="nav-tabs">
            <button class="nav-tab active" onclick="showTab('category-detection')">
                <i class="fas fa-search"></i> カテゴリー判定
            </button>
            <button class="nav-tab" onclick="showTab('batch-processing')">
                <i class="fas fa-upload"></i> バッチ処理
            </button>
            <button class="nav-tab" onclick="showTab('ebay-sync')">
                <i class="fas fa-sync"></i> eBay同期
            </button>
            <button class="nav-tab" onclick="showTab('learning-system')">
                <i class="fas fa-graduation-cap"></i> 学習システム
            </button>
            <button class="nav-tab" onclick="showTab('statistics')">
                <i class="fas fa-chart-bar"></i> 統計・分析
            </button>
        </div>

        <!-- カテゴリー判定タブ -->
        <div id="category-detection" class="tab-content active">
            <div class="grid grid-2">
                <div class="card">
                    <h2><i class="fas fa-magic"></i> 単一商品カテゴリー判定</h2>
                    
                    <form id="singleCategoryForm">
                        <div class="form-group">
                            <label for="title">商品タイトル <span style="color: red;">*</span></label>
                            <input type="text" id="title" placeholder="例: iPhone 14 Pro 128GB Space Black" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="brand">ブランド</label>
                            <input type="text" id="brand" placeholder="例: Apple">
                        </div>
                        
                        <div class="form-group">
                            <label for="price">価格（円）</label>
                            <input type="number" id="price" placeholder="120000" min="0">
                        </div>
                        
                        <div class="form-group">
                            <label for="yahooCategory">Yahooカテゴリー</label>
                            <input type="text" id="yahooCategory" placeholder="携帯電話、スマートフォン">
                        </div>
                        
                        <div class="form-group">
                            <label for="description">商品説明（任意）</label>
                            <textarea id="description" rows="3" placeholder="詳細な商品説明"></textarea>
                        </div>
                        
                        <button type="submit" class="btn" id="singleSubmitBtn">
                            <i class="fas fa-magic"></i> カテゴリー判定実行
                        </button>
                    </form>
                    
                    <div id="singleResult" style="display: none;"></div>
                </div>
                
                <div class="card">
                    <h2><i class="fas fa-list"></i> 利用可能カテゴリー</h2>
                    <button class="btn btn-info" onclick="loadCategories()">
                        <i class="fas fa-download"></i> カテゴリー一覧取得
                    </button>
                    
                    <div id="categoriesList" style="margin-top: 20px;">
                        <p style="color: #666;">「カテゴリー一覧取得」ボタンをクリックしてください。</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- バッチ処理タブ -->
        <div id="batch-processing" class="tab-content">
            <div class="card">
                <h2><i class="fas fa-upload"></i> CSVバッチ処理</h2>
                
                <div class="notification info">
                    <i class="fas fa-info-circle"></i>
                    <div>
                        <strong>CSVフォーマット:</strong> title, brand, price_jpy, yahoo_category, description<br>
                        複数商品を一括でカテゴリー判定できます。
                    </div>
                </div>
                
                <div class="upload-area" onclick="document.getElementById('csvFile').click()">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: #999; margin-bottom: 15px;"></i>
                    <h3>CSVファイルをアップロード</h3>
                    <p>クリックしてファイルを選択、またはドラッグ&ドロップ</p>
                </div>
                
                <input type="file" id="csvFile" accept=".csv" style="display: none;" onchange="handleCsvUpload(this)">
                
                <div id="batchProgress" style="display: none; margin-top: 20px;">
                    <h4>処理進行状況</h4>
                    <div class="confidence-bar">
                        <div id="batchProgressBar" class="confidence-fill" style="width: 0%;">0%</div>
                    </div>
                    <p id="batchProgressText">準備中...</p>
                </div>
                
                <div id="batchResults" style="display: none; margin-top: 20px;">
                    <h4>バッチ処理結果</h4>
                    <div id="batchResultsContent"></div>
                </div>
            </div>
        </div>

        <!-- eBay同期タブ -->
        <div id="ebay-sync" class="tab-content">
            <div class="grid grid-2">
                <div class="card">
                    <h2><i class="fas fa-sync"></i> eBayデータ同期</h2>
                    
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <div>
                            最新のeBayカテゴリーと手数料情報を取得してデータベースを更新します。
                        </div>
                    </div>
                    
                    <div class="grid">
                        <button class="btn btn-success" onclick="syncEbayData('categories')">
                            <i class="fas fa-download"></i> カテゴリー同期
                        </button>
                        
                        <button class="btn btn-warning" onclick="syncEbayData('fees')">
                            <i class="fas fa-dollar-sign"></i> 手数料同期
                        </button>
                        
                        <button class="btn btn-info" onclick="syncEbayData('full')">
                            <i class="fas fa-sync-alt"></i> 完全同期
                        </button>
                    </div>
                    
                    <div id="syncResult" style="margin-top: 20px;"></div>
                </div>
                
                <div class="card">
                    <h2><i class="fas fa-database"></i> データベース状況</h2>
                    
                    <button class="btn btn-info" onclick="checkDatabaseStatus()">
                        <i class="fas fa-check"></i> 状況確認
                    </button>
                    
                    <div id="databaseStatus" style="margin-top: 20px;">
                        <p style="color: #666;">「状況確認」ボタンをクリックしてください。</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 学習システムタブ -->
        <div id="learning-system" class="tab-content">
            <div class="grid grid-2">
                <div class="card">
                    <h2><i class="fas fa-graduation-cap"></i> 手動学習</h2>
                    
                    <div class="notification info">
                        <i class="fas fa-lightbulb"></i>
                        <div>
                            間違った判定を手動で修正して、システムを学習させることができます。
                        </div>
                    </div>
                    
                    <form id="manualLearningForm">
                        <div class="form-group">
                            <label for="learningTitle">商品タイトル</label>
                            <input type="text" id="learningTitle" placeholder="学習させたい商品タイトル" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="correctCategoryId">正しいカテゴリーID</label>
                            <input type="text" id="correctCategoryId" placeholder="例: 293" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="correctCategoryName">正しいカテゴリー名</label>
                            <input type="text" id="correctCategoryName" placeholder="例: Cell Phones & Smartphones" required>
                        </div>
                        
                        <button type="submit" class="btn btn-success">
                            <i class="fas fa-brain"></i> 学習データ追加
                        </button>
                    </form>
                    
                    <div id="learningResult" style="margin-top: 20px;"></div>
                </div>
                
                <div class="card">
                    <h2><i class="fas fa-chart-line"></i> 学習進捗</h2>
                    
                    <button class="btn btn-info" onclick="loadLearningStats()">
                        <i class="fas fa-refresh"></i> 学習状況更新
                    </button>
                    
                    <div id="learningStats" style="margin-top: 20px;">
                        <p style="color: #666;">「学習状況更新」ボタンをクリックしてください。</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 統計・分析タブ -->
        <div id="statistics" class="tab-content">
            <div class="card">
                <h2><i class="fas fa-chart-bar"></i> システム統計</h2>
                
                <button class="btn btn-success" onclick="loadFullStats()">
                    <i class="fas fa-sync"></i> 統計データ更新
                </button>
                
                <div id="fullStatsContainer" style="margin-top: 20px;">
                    <p style="color: #666;">「統計データ更新」ボタンをクリックしてください。</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        // グローバル変数
        const API_URL = '../unified_api.php';
        
        // タブ切り替え
        function showTab(tabId) {
            // すべてのタブを非表示
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // 選択されたタブを表示
            document.getElementById(tabId).classList.add('active');
            event.target.classList.add('active');
        }
        
        // 単一商品カテゴリー判定
        document.getElementById('singleCategoryForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('singleSubmitBtn');
            const resultDiv = document.getElementById('singleResult');
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="loading"></div> 判定中...';
            
            const productInfo = {
                title: document.getElementById('title').value,
                brand: document.getElementById('brand').value,
                price_jpy: parseInt(document.getElementById('price').value) || 0,
                yahoo_category: document.getElementById('yahooCategory').value,
                description: document.getElementById('description').value
            };
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'select_category',
                        product_info: productInfo
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    displaySingleResult(data);
                } else {
                    displayError(resultDiv, data.error || '判定に失敗しました');
                }
                
            } catch (error) {
                displayError(resultDiv, '通信エラー: ' + error.message);
            }
            
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-magic"></i> カテゴリー判定実行';
        });
        
        // 結果表示
        function displaySingleResult(data) {
            const resultDiv = document.getElementById('singleResult');
            const category = data.category;
            
            const confidenceColor = category.confidence >= 80 ? '#48bb78' : 
                                   category.confidence >= 60 ? '#ed8936' : '#f56565';
            
            let methodBadge = '';
            if (data.method === 'learned_database') {
                methodBadge = '<span class="learning-badge"><i class="fas fa-brain"></i> 学習データ使用</span>';
            } else if (data.method.includes('learned')) {
                methodBadge = '<span class="learning-badge"><i class="fas fa-plus"></i> 新規学習</span>';
            }
            
            resultDiv.innerHTML = `
                <div class="result">
                    <h3><i class="fas fa-check-circle"></i> 判定結果 ${methodBadge}</h3>
                    
                    <div style="margin: 15px 0;">
                        <strong>カテゴリー:</strong> ${category.category_name}<br>
                        <strong>カテゴリーID:</strong> ${category.category_id}<br>
                        <strong>判定方法:</strong> ${data.method}<br>
                        <strong>処理時間:</strong> ${data.processing_time_ms}ms
                        ${category.usage_count ? `<br><strong>使用実績:</strong> ${category.usage_count}回` : ''}
                    </div>
                    
                    <div>
                        <strong>信頼度:</strong>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${category.confidence}%; background: ${confidenceColor};">
                                ${category.confidence}%
                            </div>
                        </div>
                    </div>
                    
                    ${category.matched_keywords && category.matched_keywords.length > 0 ? 
                        `<div style="margin-top: 15px;">
                            <strong>マッチキーワード:</strong> ${category.matched_keywords.join(', ')}
                        </div>` : ''
                    }
                </div>
            `;
            
            resultDiv.style.display = 'block';
        }
        
        // エラー表示
        function displayError(container, message) {
            container.innerHTML = `
                <div class="error">
                    <h3><i class="fas fa-exclamation-triangle"></i> エラー</h3>
                    <p>${message}</p>
                </div>
            `;
            container.style.display = 'block';
        }
        
        // カテゴリー一覧読み込み
        async function loadCategories() {
            const container = document.getElementById('categoriesList');
            container.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> カテゴリー一覧を読み込み中...</p>';
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_categories' })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    container.innerHTML = `
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${data.categories.map(cat => 
                                `<div style="padding: 8px; border-bottom: 1px solid #eee;">
                                    <strong>${cat.category_name}</strong><br>
                                    <small>ID: ${cat.category_id} | ${cat.category_path || 'パス未設定'}</small>
                                </div>`
                            ).join('')}
                        </div>
                    `;
                } else {
                    container.innerHTML = '<p style="color: red;">カテゴリー一覧の取得に失敗しました</p>';
                }
                
            } catch (error) {
                container.innerHTML = '<p style="color: red;">通信エラー: ' + error.message + '</p>';
            }
        }
        
        // 統計データ読み込み
        async function loadFullStats() {
            const container = document.getElementById('fullStatsContainer');
            container.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> 統計データを読み込み中...</p>';
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_stats' })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    displayFullStats(data.stats);
                } else {
                    container.innerHTML = '<p style="color: red;">統計データの取得に失敗しました</p>';
                }
                
            } catch (error) {
                container.innerHTML = '<p style="color: red;">通信エラー: ' + error.message + '</p>';
            }
        }
        
        // 統計表示
        function displayFullStats(stats) {
            const container = document.getElementById('fullStatsContainer');
            
            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${stats.total_patterns || 0}</div>
                        <div>学習パターン数</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.avg_confidence || 0}%</div>
                        <div>平均信頼度</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.total_usage || 0}</div>
                        <div>総使用回数</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.mature_patterns || 0}</div>
                        <div>成熟パターン数</div>
                    </div>
                </div>
                
                ${stats.database_size ? `
                    <div style="margin-top: 30px;">
                        <h4><i class="fas fa-database"></i> データベース規模</h4>
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-number">${stats.database_size.categories}</div>
                                <div>カテゴリー数</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number">${stats.database_size.keywords}</div>
                                <div>キーワード数</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number">${stats.database_size.fee_data}</div>
                                <div>手数料データ</div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${stats.top_patterns && stats.top_patterns.length > 0 ? `
                    <div style="margin-top: 30px;">
                        <h4><i class="fas fa-trophy"></i> よく使われるパターン</h4>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            ${stats.top_patterns.map(pattern => 
                                `<div style="margin: 8px 0; padding: 10px; background: white; border-radius: 4px;">
                                    <strong>${pattern.title.substring(0, 50)}...</strong><br>
                                    <small>→ ${pattern.category} (${pattern.usage_count}回使用, 信頼度${pattern.confidence}%)</small>
                                </div>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
        }
        
        // eBayデータ同期
        async function syncEbayData(type) {
            const resultDiv = document.getElementById('syncResult');
            resultDiv.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> eBayデータ同期中...</p>';
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sync_ebay_data', sync_type: type })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.innerHTML = `
                        <div class="result">
                            <h4><i class="fas fa-check"></i> 同期完了</h4>
                            <p>${data.message}</p>
                            <div style="margin-top: 10px;">
                                <small>カテゴリー更新: ${data.updates.categories_updated}件</small><br>
                                <small>キーワード追加: ${data.updates.keywords_added}件</small><br>
                                <small>手数料更新: ${data.updates.fees_updated}件</small><br>
                                <small>実行時刻: ${data.timestamp}</small>
                            </div>
                        </div>
                    `;
                } else {
                    resultDiv.innerHTML = `<div class="error"><p>同期に失敗しました: ${data.error}</p></div>`;
                }
                
            } catch (error) {
                resultDiv.innerHTML = `<div class="error"><p>通信エラー: ${error.message}</p></div>`;
            }
        }
        
        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🧠 eBay統合カテゴリーシステム 初期化完了');
        });
        
        // その他の機能は簡潔にするため省略
        // CSVアップロード、手動学習などの実装
        
    </script>
</body>
</html>