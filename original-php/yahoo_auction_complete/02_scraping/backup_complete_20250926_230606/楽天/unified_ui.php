<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>統合スクレイピングシステム v2.0 - プラットフォーム別管理</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <link href="../../shared/css/common.css" rel="stylesheet">
    <style>
        /* プラットフォーム別管理用の追加スタイル */
        .platform-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .platform-card {
            background: var(--bg-card, #fff);
            border: 1px solid var(--border-color, #dee2e6);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1));
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .platform-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15));
        }
        
        .platform-card.active {
            border-color: var(--primary-color, #007bff);
            background: linear-gradient(135deg, rgba(0,123,255,0.05) 0%, rgba(0,123,255,0.02) 100%);
        }
        
        .platform-card.planned {
            opacity: 0.7;
            border-style: dashed;
        }
        
        .platform-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .platform-icon {
            width: 48px;
            height: 48px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: white;
        }
        
        .platform-icon.yahoo { background: linear-gradient(135deg, #6f42c1, #5a32a3); }
        .platform-icon.rakuten { background: linear-gradient(135deg, #bf0000, #9b0000); }
        .platform-icon.mercari { background: linear-gradient(135deg, #ff6c00, #e55a00); }
        .platform-icon.pokemon { background: linear-gradient(135deg, #ffcb05, #e6b600); color: #000; }
        .platform-icon.yodobashi { background: linear-gradient(135deg, #e60012, #c40010); }
        .platform-icon.golfdo { background: linear-gradient(135deg, #2e8b57, #256b47); }
        .platform-icon.paypay { background: linear-gradient(135deg, #ff6b6b, #ee5a5a); }
        
        .platform-info h3 {
            margin: 0;
            font-size: 1.25rem;
            color: var(--text-primary, #212529);
        }
        
        .platform-info .status {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status.active { background: #d4edda; color: #155724; }
        .status.planned { background: #fff3cd; color: #856404; }
        .status.beta { background: #d1ecf1; color: #0c5460; }
        
        .platform-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            margin: 1rem 0;
        }
        
        .stat-item {
            text-align: center;
            padding: 0.5rem;
            background: var(--bg-light, #f8f9fa);
            border-radius: 6px;
        }
        
        .stat-value {
            display: block;
            font-size: 1.25rem;
            font-weight: bold;
            color: var(--primary-color, #007bff);
        }
        
        .stat-label {
            font-size: 0.8rem;
            color: var(--text-secondary, #6c757d);
        }
        
        .platform-actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        
        .btn-platform {
            flex: 1;
            min-width: 120px;
            font-size: 0.85rem;
            padding: 0.5rem 1rem;
        }
        
        /* 統合フォーム */
        .unified-form {
            background: var(--bg-card, #fff);
            border: 1px solid var(--border-color, #dee2e6);
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
        }
        
        .form-section {
            margin-bottom: 1.5rem;
        }
        
        .form-section:last-child {
            margin-bottom: 0;
        }
        
        .section-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-primary, #212529);
        }
        
        .url-input {
            position: relative;
        }
        
        .url-input textarea {
            width: 100%;
            min-height: 120px;
            padding: 1rem;
            border: 2px solid var(--border-color, #dee2e6);
            border-radius: 8px;
            font-size: 0.9rem;
            line-height: 1.5;
            transition: border-color 0.3s ease;
        }
        
        .url-input textarea:focus {
            outline: none;
            border-color: var(--primary-color, #007bff);
            box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
        }
        
        .platform-examples {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .example-item {
            padding: 0.75rem;
            background: var(--bg-light, #f8f9fa);
            border-radius: 6px;
            border-left: 4px solid var(--primary-color, #007bff);
        }
        
        .example-platform {
            font-weight: 600;
            margin-bottom: 0.25rem;
            color: var(--text-primary, #212529);
        }
        
        .example-url {
            font-size: 0.85rem;
            color: var(--text-secondary, #6c757d);
            word-break: break-all;
        }
        
        /* 結果表示 */
        .results-grid {
            display: grid;
            gap: 1rem;
        }
        
        .result-card {
            background: var(--bg-card, #fff);
            border: 1px solid var(--border-color, #dee2e6);
            border-radius: 8px;
            padding: 1rem;
            border-left: 4px solid var(--success-color, #28a745);
        }
        
        .result-card.error {
            border-left-color: var(--danger-color, #dc3545);
        }
        
        .result-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
        }
        
        .result-platform {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.25rem 0.75rem;
            background: var(--primary-color, #007bff);
            color: white;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .result-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
        }
        
        .detail-item {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        
        .detail-label {
            font-size: 0.8rem;
            color: var(--text-secondary, #6c757d);
            font-weight: 500;
        }
        
        .detail-value {
            font-size: 0.9rem;
            color: var(--text-primary, #212529);
        }
        
        /* レスポンシブ対応 */
        @media (max-width: 768px) {
            .platform-grid {
                grid-template-columns: 1fr;
            }
            
            .platform-examples {
                grid-template-columns: 1fr;
            }
            
            .result-details {
                grid-template-columns: 1fr;
            }
        }
        
        /* ローディング状態 */
        .loading {
            opacity: 0.7;
            pointer-events: none;
            position: relative;
        }
        
        .loading::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 24px;
            height: 24px;
            margin: -12px 0 0 -12px;
            border: 2px solid var(--primary-color, #007bff);
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-layer-group"></i> 統合スクレイピングシステム v2.0</h1>
            <p class="subtitle">プラットフォーム別管理 - 効率的なデータ収集とフォルダ整理</p>
        </div>

        <!-- プラットフォーム状況ダッシュボード -->
        <div class="section">
            <div class="section-header">
                <i class="fas fa-tachometer-alt"></i>
                <h2 class="section-title">プラットフォーム状況</h2>
                <button class="btn btn-sm btn-secondary" onclick="refreshPlatformStats()">
                    <i class="fas fa-sync-alt"></i> 更新
                </button>
            </div>
            
            <div class="platform-grid" id="platformGrid">
                <!-- プラットフォームカードがJavaScriptで生成される -->
            </div>
        </div>

        <!-- 統合スクレイピングフォーム -->
        <div class="section">
            <div class="section-header">
                <i class="fas fa-magic"></i>
                <h2 class="section-title">統合スクレイピング</h2>
            </div>
            
            <div class="unified-form">
                <form onsubmit="handleUnifiedScraping(event)" id="unifiedForm">
                    <div class="form-section">
                        <div class="section-title">
                            <i class="fas fa-link"></i>
                            商品URL入力
                        </div>
                        
                        <div class="url-input">
                            <textarea 
                                id="urlInput" 
                                name="urls" 
                                placeholder="商品ページのURLを入力してください（複数の場合は改行区切り）&#10;&#10;例：&#10;https://auctions.yahoo.co.jp/jp/auction/x123456789&#10;https://item.rakuten.co.jp/shop/item/"
                                rows="6"
                            ></textarea>
                        </div>
                        
                        <div class="platform-examples">
                            <div class="example-item">
                                <div class="example-platform">
                                    <i class="fas fa-gavel"></i> Yahoo オークション
                                </div>
                                <div class="example-url">https://auctions.yahoo.co.jp/jp/auction/x***</div>
                            </div>
                            <div class="example-item">
                                <div class="example-platform">
                                    <i class="fas fa-store"></i> 楽天市場
                                </div>
                                <div class="example-url">https://item.rakuten.co.jp/shop/item/</div>
                            </div>
                            <div class="example-item">
                                <div class="example-platform">
                                    <i class="fas fa-shopping-bag"></i> メルカリ（実装予定）
                                </div>
                                <div class="example-url">https://jp.mercari.com/item/m***</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <div class="section-title">
                            <i class="fas fa-cogs"></i>
                            実行オプション
                        </div>
                        
                        <div class="grid-3">
                            <label class="checkbox-label">
                                <input type="checkbox" id="validateData" checked>
                                <span>データ検証を実行</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="saveToDb" checked>
                                <span>データベースに保存</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="extractImages" checked>
                                <span>画像URLを抽出</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <div class="button-group">
                            <button type="submit" class="btn btn-primary btn-lg">
                                <i class="fas fa-play"></i> スクレイピング実行
                            </button>
                            <button type="button" class="btn btn-info" onclick="detectPlatforms()">
                                <i class="fas fa-search"></i> プラットフォーム判定
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="clearForm()">
                                <i class="fas fa-broom"></i> フォームクリア
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <!-- 結果表示エリア -->
        <div class="section" id="resultsSection" style="display: none;">
            <div class="section-header">
                <i class="fas fa-list-alt"></i>
                <h2 class="section-title">スクレイピング結果</h2>
                <div class="button-group">
                    <button class="btn btn-sm btn-success" onclick="exportResults()">
                        <i class="fas fa-download"></i> エクスポート
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="clearResults()">
                        <i class="fas fa-trash"></i> クリア
                    </button>
                </div>
            </div>
            
            <div class="results-grid" id="resultsGrid">
                <!-- 結果がJavaScriptで生成される -->
            </div>
        </div>

        <!-- フォルダ管理案内 -->
        <div class="section">
            <div class="section-header">
                <i class="fas fa-folder-open"></i>
                <h2 class="section-title">フォルダ構成</h2>
            </div>
            
            <div class="info-card">
                <h3><i class="fas fa-info-circle"></i> 整理されたフォルダ構成</h3>
                <p>新しいバージョンでは、プラットフォーム別にファイルが整理されています：</p>
                
                <div class="code-block">
                    <pre><code>02_scraping/
├── 📁 platforms/
│   ├── yahoo/     - Yahoo オークション関連
│   ├── rakuten/   - 楽天市場関連
│   ├── mercari/   - メルカリ関連（実装予定）
│   └── ...
├── 📁 api/        - 統合API群
├── 📁 common/     - 共通機能
└── 📁 logs/       - プラットフォーム別ログ</code></pre>
                </div>
                
                <p>この構成により、メンテナンス性が向上し、新しいプラットフォームの追加が容易になりました。</p>
            </div>
        </div>

        <!-- 次のステップ -->
        <div class="section">
            <div class="section-header">
                <i class="fas fa-arrow-right"></i>
                <h2 class="section-title">次のステップ</h2>
            </div>
            
            <div class="navigation-grid">
                <a href="../../07_editing/editing.php" class="nav-card">
                    <div class="nav-icon"><i class="fas fa-edit"></i></div>
                    <h4>データ編集</h4>
                    <p>取得データの編集・調整</p>
                </a>
                
                <a href="../../11_category/category.php" class="nav-card">
                    <div class="nav-icon"><i class="fas fa-tags"></i></div>
                    <h4>カテゴリー分析</h4>
                    <p>AI による自動分類</p>
                </a>
                
                <a href="../../08_listing/listing.php" class="nav-card">
                    <div class="nav-icon"><i class="fas fa-store"></i></div>
                    <h4>出品管理</h4>
                    <p>eBay への自動出品</p>
                </a>
                
                <a href="../../10_zaiko/zaiko.php" class="nav-card">
                    <div class="nav-icon"><i class="fas fa-boxes"></i></div>
                    <h4>在庫管理</h4>
                    <p>商品在庫の追跡</p>
                </a>
            </div>
        </div>
    </div>

    <script>
    // グローバル変数
    let platformStats = {};
    let scrapingResults = [];
    let isProcessing = false;
    
    // 初期化
    document.addEventListener('DOMContentLoaded', function() {
        initializePage();
    });
    
    // ページ初期化
    function initializePage() {
        refreshPlatformStats();
        setupEventListeners();
    }
    
    // イベントリスナー設定
    function setupEventListeners() {
        // フォームのリアルタイム検証
        document.getElementById('urlInput').addEventListener('input', validateUrls);
        
        // キーボードショートカット
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (!isProcessing) {
                    document.getElementById('unifiedForm').requestSubmit();
                }
            }
        });
    }
    
    // プラットフォーム統計の更新
    async function refreshPlatformStats() {
        try {
            showLoading('platformGrid');
            
            const response = await fetch('../api/unified_scraping.php?action=get_stats');
            const data = await response.json();
            
            if (data.success) {
                platformStats = data.data;
                renderPlatformGrid();
            } else {
                showNotification('統計の取得に失敗しました', 'error');
            }
            
        } catch (error) {
            console.error('Stats refresh error:', error);
            showNotification('統計の取得中にエラーが発生しました', 'error');
        } finally {
            hideLoading('platformGrid');
        }
    }
    
    // プラットフォームグリッドの描画
    function renderPlatformGrid() {
        const grid = document.getElementById('platformGrid');
        const platforms = [
            { 
                id: 'yahoo', 
                name: 'Yahoo オークション', 
                icon: 'gavel', 
                status: 'active',
                description: '日本最大級のオークションサイト'
            },
            { 
                id: 'rakuten', 
                name: '楽天市場', 
                icon: 'store', 
                status: 'active',
                description: '日本最大級のECモール'
            },
            { 
                id: 'mercari', 
                name: 'メルカリ', 
                icon: 'shopping-bag', 
                status: 'planned',
                description: 'フリマアプリ（実装予定）'
            },
            { 
                id: 'pokemon', 
                name: 'ポケモンセンター', 
                icon: 'gamepad', 
                status: 'planned',
                description: '公式グッズサイト（実装予定）'
            },
            { 
                id: 'yodobashi', 
                name: 'ヨドバシカメラ', 
                icon: 'tv', 
                status: 'planned',
                description: '家電量販店（実装予定）'
            },
            { 
                id: 'golfdo', 
                name: 'ゴルフドゥ', 
                icon: 'golf-ball', 
                status: 'planned',
                description: 'ゴルフ用品専門店（実装予定）'
            }
        ];
        
        grid.innerHTML = platforms.map(platform => {
            const stats = platformStats.platform_stats?.find(s => s.platform === platform.id) || {};
            const productCount = stats.total_products || 0;
            const avgPrice = stats.avg_price ? Math.round(stats.avg_price).toLocaleString() : '-';
            
            return `
                <div class="platform-card ${platform.status}" data-platform="${platform.id}">
                    <div class="platform-header">
                        <div class="platform-icon ${platform.id}">
                            <i class="fas fa-${platform.icon}"></i>
                        </div>
                        <div class="platform-info">
                            <h3>${platform.name}</h3>
                            <span class="status ${platform.status}">${platform.status}</span>
                        </div>
                    </div>
                    
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0.5rem 0 1rem 0;">
                        ${platform.description}
                    </p>
                    
                    <div class="platform-stats">
                        <div class="stat-item">
                            <span class="stat-value">${productCount.toLocaleString()}</span>
                            <div class="stat-label">商品数</div>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">¥${avgPrice}</span>
                            <div class="stat-label">平均価格</div>
                        </div>
                    </div>
                    
                    <div class="platform-actions">
                        ${platform.status === 'active' ? `
                            <button class="btn btn-platform btn-primary" onclick="openPlatformScraper('${platform.id}')">
                                <i class="fas fa-play"></i> 実行
                            </button>
                            <button class="btn btn-platform btn-secondary" onclick="viewPlatformLogs('${platform.id}')">
                                <i class="fas fa-file-alt"></i> ログ
                            </button>
                        ` : `
                            <button class="btn btn-platform btn-outline-secondary" disabled>
                                <i class="fas fa-clock"></i> 実装予定
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // 統合スクレイピング処理
    async function handleUnifiedScraping(event) {
        event.preventDefault();
        
        if (isProcessing) {
            showNotification('処理中です。しばらくお待ちください。', 'warning');
            return;
        }
        
        const urlInput = document.getElementById('urlInput').value.trim();
        if (!urlInput) {
            showNotification('URLを入力してください', 'error');
            return;
        }
        
        const urls = urlInput.split('\n').filter(url => url.trim()).map(url => url.trim());
        
        if (urls.length === 0) {
            showNotification('有効なURLが見つかりません', 'error');
            return;
        }
        
        // URL形式の簡易検証
        for (let url of urls) {
            if (!isValidUrl(url)) {
                showNotification(`無効なURL形式: ${url}`, 'error');
                return;
            }
        }
        
        isProcessing = true;
        showLoading('unifiedForm');
        
        try {
            const options = {
                validate_data: document.getElementById('validateData').checked,
                save_to_db: document.getElementById('saveToDb').checked,
                extract_images: document.getElementById('extractImages').checked
            };
            
            const formData = new FormData();
            formData.append('action', urls.length === 1 ? 'scrape' : 'batch_scrape');
            formData.append(urls.length === 1 ? 'url' : 'urls', urls.length === 1 ? urls[0] : JSON.stringify(urls));
            formData.append('options', JSON.stringify(options));
            
            const response = await fetch('../api/unified_scraping.php', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (urls.length === 1) {
                    scrapingResults = [{ success: true, data: data.data, url: urls[0] }];
                } else {
                    scrapingResults = data.data.results;
                }
                
                displayResults();
                showNotification(data.message, 'success');
                
                // 統計を更新
                setTimeout(refreshPlatformStats, 1000);
                
            } else {
                showNotification(data.message, 'error');
            }
            
        } catch (error) {
            console.error('Scraping error:', error);
            showNotification('スクレイピング中にエラーが発生しました', 'error');
        } finally {
            isProcessing = false;
            hideLoading('unifiedForm');
        }
    }
    
    // プラットフォーム判定
    async function detectPlatforms() {
        const urlInput = document.getElementById('urlInput').value.trim();
        if (!urlInput) {
            showNotification('URLを入力してください', 'error');
            return;
        }
        
        const urls = urlInput.split('\n').filter(url => url.trim()).map(url => url.trim());
        
        try {
            showLoading('urlInput');
            
            const detectionResults = [];
            for (let url of urls) {
                const response = await fetch(`../api/unified_scraping.php?action=detect_platform&url=${encodeURIComponent(url)}&detailed=true`);
                const data = await response.json();
                
                if (data.success) {
                    detectionResults.push({
                        url: url,
                        platform: data.data.platform,
                        confidence: data.data.confidence,
                        supported: data.data.is_supported
                    });
                }
            }
            
            displayPlatformDetection(detectionResults);
            
        } catch (error) {
            console.error('Detection error:', error);
            showNotification('プラットフォーム判定中にエラーが発生しました', 'error');
        } finally {
            hideLoading('urlInput');
        }
    }
    
    // プラットフォーム判定結果を表示
    function displayPlatformDetection(results) {
        const resultHtml = results.map(result => {
            const platformInfo = getPlatformInfo(result.platform);
            const confidenceColor = result.confidence >= 0.8 ? 'success' : 
                                   result.confidence >= 0.5 ? 'warning' : 'danger';
            
            return `
                <div class="detection-result">
                    <div class="platform-badge ${result.platform}">${platformInfo.name}</div>
                    <div class="confidence">
                        <span class="confidence-label">信頼度:</span>
                        <span class="confidence-value ${confidenceColor}">${Math.round(result.confidence * 100)}%</span>
                    </div>
                    <div class="url-preview">${result.url.substring(0, 60)}${result.url.length > 60 ? '...' : ''}</div>
                    ${result.supported ? 
                        '<span class="support-status supported">対応済み</span>' : 
                        '<span class="support-status planned">実装予定</span>'
                    }
                </div>
            `;
        }).join('');
        
        showModal('プラットフォーム判定結果', resultHtml);
    }
    
    // 結果表示
    function displayResults() {
        const resultsSection = document.getElementById('resultsSection');
        const resultsGrid = document.getElementById('resultsGrid');
        
        const resultHtml = scrapingResults.map((result, index) => {
            if (result.success && result.data) {
                return createSuccessResultCard(result.data, index);
            } else {
                return createErrorResultCard(result, index);
            }
        }).join('');
        
        resultsGrid.innerHTML = resultHtml;
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // 成功結果カードを作成
    function createSuccessResultCard(data, index) {
        const platformInfo = getPlatformInfo(data.platform);
        const imageCount = Array.isArray(data.images) ? data.images.length : 0;
        const price = typeof data.current_price === 'number' ? data.current_price.toLocaleString() : data.current_price;
        
        return `
            <div class="result-card success" data-index="${index}">
                <div class="result-header">
                    <h3 class="result-title">${escapeHtml(data.title || '商品名不明')}</h3>
                    <div class="result-platform ${data.platform}">${platformInfo.name}</div>
                </div>
                
                <div class="result-details">
                    <div class="detail-item">
                        <div class="detail-label">価格</div>
                        <div class="detail-value">¥${price}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">画像数</div>
                        <div class="detail-value">${imageCount}枚</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">カテゴリー</div>
                        <div class="detail-value">${Array.isArray(data.categories) ? data.categories.join(', ') : 'なし'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">店舗</div>
                        <div class="detail-value">${data.seller_info?.shop_name || 'なし'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">取得時刻</div>
                        <div class="detail-value">${formatDateTime(data.scraped_at)}</div>
                    </div>
                </div>
                
                <div class="result-actions" style="margin-top: 1rem;">
                    <button class="btn btn-sm btn-primary" onclick="viewDetails(${index})">
                        <i class="fas fa-eye"></i> 詳細表示
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="copyUrl('${escapeHtml(data.url)}')">
                        <i class="fas fa-copy"></i> URL コピー
                    </button>
                    ${imageCount > 0 ? `
                        <button class="btn btn-sm btn-info" onclick="viewImages(${index})">
                            <i class="fas fa-images"></i> 画像表示
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // エラー結果カードを作成
    function createErrorResultCard(result, index) {
        return `
            <div class="result-card error" data-index="${index}">
                <div class="result-header">
                    <h3 class="result-title">
                        <i class="fas fa-exclamation-triangle"></i> 
                        スクレイピング失敗
                    </h3>
                </div>
                
                <div class="error-details">
                    <div class="error-message">${escapeHtml(result.message || result.error || 'エラーの詳細が不明です')}</div>
                    ${result.url ? `<div class="error-url">URL: ${escapeHtml(result.url)}</div>` : ''}
                </div>
                
                <div class="result-actions" style="margin-top: 1rem;">
                    <button class="btn btn-sm btn-warning" onclick="retryUrl('${escapeHtml(result.url || '')}')">
                        <i class="fas fa-redo"></i> 再試行
                    </button>
                </div>
            </div>
        `;
    }
    
    // プラットフォーム情報を取得
    function getPlatformInfo(platform) {
        const platformMap = {
            yahoo_auction: { name: 'Yahoo オークション', icon: 'gavel' },
            rakuten: { name: '楽天市場', icon: 'store' },
            mercari: { name: 'メルカリ', icon: 'shopping-bag' },
            paypayfleamarket: { name: 'PayPayフリマ', icon: 'credit-card' },
            pokemon_center: { name: 'ポケモンセンター', icon: 'gamepad' },
            yodobashi: { name: 'ヨドバシカメラ', icon: 'tv' },
            golfdo: { name: 'ゴルフドゥ', icon: 'golf-ball' },
            unknown: { name: '不明', icon: 'question' }
        };
        
        return platformMap[platform] || platformMap.unknown;
    }
    
    // URL検証
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    // URLの検証とリアルタイムフィードバック
    function validateUrls() {
        const input = document.getElementById('urlInput');
        const urls = input.value.split('\n').filter(url => url.trim()).map(url => url.trim());
        
        let hasError = false;
        for (let url of urls) {
            if (url && !isValidUrl(url)) {
                hasError = true;
                break;
            }
        }
        
        input.style.borderColor = hasError ? 'var(--danger-color, #dc3545)' : '';
    }
    
    // 詳細表示
    function viewDetails(index) {
        const result = scrapingResults[index];
        if (!result || !result.data) return;
        
        const data = result.data;
        const detailHtml = `
            <div class="detail-view">
                <h3>${escapeHtml(data.title)}</h3>
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>基本情報</h4>
                        <p><strong>価格:</strong> ¥${data.current_price.toLocaleString()}</p>
                        <p><strong>プラットフォーム:</strong> ${getPlatformInfo(data.platform).name}</p>
                        <p><strong>URL:</strong> <a href="${data.url}" target="_blank">${data.url}</a></p>
                    </div>
                    
                    ${data.description ? `
                        <div class="detail-section">
                            <h4>商品説明</h4>
                            <p>${escapeHtml(data.description.substring(0, 200))}${data.description.length > 200 ? '...' : ''}</p>
                        </div>
                    ` : ''}
                    
                    ${data.seller_info?.shop_name ? `
                        <div class="detail-section">
                            <h4>販売者情報</h4>
                            <p><strong>店舗名:</strong> ${escapeHtml(data.seller_info.shop_name)}</p>
                            ${data.seller_info.shop_id ? `<p><strong>店舗ID:</strong> ${escapeHtml(data.seller_info.shop_id)}</p>` : ''}
                        </div>
                    ` : ''}
                    
                    ${Array.isArray(data.categories) && data.categories.length > 0 ? `
                        <div class="detail-section">
                            <h4>カテゴリー</h4>
                            <p>${data.categories.map(cat => escapeHtml(cat)).join(' > ')}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        showModal('商品詳細情報', detailHtml);
    }
    
    // 画像表示
    function viewImages(index) {
        const result = scrapingResults[index];
        if (!result || !result.data || !Array.isArray(result.data.images)) return;
        
        const images = result.data.images;
        const imageHtml = `
            <div class="image-gallery">
                ${images.map((img, i) => `
                    <div class="image-item">
                        <img src="${escapeHtml(img)}" alt="商品画像 ${i + 1}" 
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjhmOWZhIi8+CjxwYXRoIGQ9Ik0xMDAgNTBMMTUwIDEyNUg1MEwxMDAgNTBaIiBmaWxsPSIjZGVlMmU2Ii8+CjxjaXJjbGUgY3g9IjE0MCIgY3k9IjcwIiByPSIxMCIgZmlsbD0iI2RlZTJlNiIvPgo8L3N2Zz4='"
                             style="max-width: 200px; max-height: 200px; margin: 0.5rem; border: 1px solid #dee2e6; border-radius: 4px;">
                        <div class="image-url">${escapeHtml(img)}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        showModal('商品画像', imageHtml);
    }
    
    // URLコピー
    function copyUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
            showNotification('URLをコピーしました', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            showNotification('コピーに失敗しました', 'error');
        });
    }
    
    // 再試行
    function retryUrl(url) {
        if (!url) return;
        
        document.getElementById('urlInput').value = url;
        document.getElementById('unifiedForm').scrollIntoView({ behavior: 'smooth' });
    }
    
    // 結果のエクスポート
    function exportResults() {
        if (scrapingResults.length === 0) {
            showNotification('エクスポートする結果がありません', 'warning');
            return;
        }
        
        const exportData = scrapingResults.map(result => {
            if (result.success && result.data) {
                return {
                    title: result.data.title,
                    price: result.data.current_price,
                    platform: result.data.platform,
                    url: result.data.url,
                    scraped_at: result.data.scraped_at,
                    image_count: Array.isArray(result.data.images) ? result.data.images.length : 0,
                    categories: Array.isArray(result.data.categories) ? result.data.categories.join('|') : '',
                    shop_name: result.data.seller_info?.shop_name || ''
                };
            } else {
                return {
                    title: 'ERROR',
                    price: 0,
                    platform: 'unknown',
                    url: result.url || '',
                    error: result.message || result.error || 'Unknown error'
                };
            }
        });
        
        // CSV形式でダウンロード
        const csv = convertToCSV(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `scraping_results_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        showNotification('結果をエクスポートしました', 'success');
    }
    
    // CSV変換
    function convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(',')
            )
        ].join('\n');
        
        return '\ufeff' + csvContent; // BOM for Excel
    }
    
    // フォームクリア
    function clearForm() {
        document.getElementById('urlInput').value = '';
        document.getElementById('urlInput').style.borderColor = '';
    }
    
    // 結果クリア
    function clearResults() {
        scrapingResults = [];
        document.getElementById('resultsSection').style.display = 'none';
        showNotification('結果をクリアしました', 'info');
    }
    
    // プラットフォーム別スクレイパーを開く
    function openPlatformScraper(platform) {
        const urls = {
            yahoo: '../platforms/yahoo/yahoo_processor.php',
            rakuten: '../platforms/rakuten/rakuten_processor.php'
        };
        
        if (urls[platform]) {
            window.open(urls[platform], '_blank');
        } else {
            showNotification(`${platform} の専用スクレイパーは実装予定です`, 'info');
        }
    }
    
    // プラットフォームログを表示
    function viewPlatformLogs(platform) {
        showNotification(`${platform} のログ表示機能は実装予定です`, 'info');
    }
    
    // ローディング表示
    function showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('loading');
        }
    }
    
    // ローディング非表示
    function hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('loading');
        }
    }
    
    // 通知表示
    function showNotification(message, type = 'info') {
        // 既存の通知を削除
        const existing = document.querySelector('.notification-toast');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification-toast ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${getNotificationIcon(type)}"></i>
                <span>${escapeHtml(message)}</span>
                <button onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 5秒後に自動削除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    // 通知アイコン取得
    function getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    // モーダル表示
    function showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${escapeHtml(title)}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 背景クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // HTML エスケープ
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 日時フォーマット
    function formatDateTime(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }
    </script>
    
    <style>
        /* 追加スタイル */
        .notification-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        }
        
        .notification-content {
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .notification-toast.success .notification-content {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        
        .notification-toast.error .notification-content {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        
        .notification-toast.warning .notification-content {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
        }
        
        .notification-toast.info .notification-content {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
        }
        
        .notification-content button {
            background: none;
            border: none;
            cursor: pointer;
            opacity: 0.7;
            margin-left: auto;
            padding: 0.25rem;
        }
        
        .notification-content button:hover {
            opacity: 1;
        }
        
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        }
        
        .modal-content {
            background: var(--bg-card, #fff);
            border-radius: 12px;
            max-width: 80vw;
            max-height: 80vh;
            overflow: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        
        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.5rem;
            border-bottom: 1px solid var(--border-color, #dee2e6);
        }
        
        .modal-header h3 {
            margin: 0;
        }
        
        .modal-close {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 4px;
        }
        
        .modal-close:hover {
            background: var(--bg-light, #f8f9fa);
        }
        
        .modal-body {
            padding: 1.5rem;
        }
        
        .image-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
            max-height: 60vh;
            overflow-y: auto;
        }
        
        .image-item {
            text-align: center;
        }
        
        .image-url {
            font-size: 0.7rem;
            color: var(--text-secondary, #6c757d);
            margin-top: 0.5rem;
            word-break: break-all;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .code-block {
            background: var(--bg-dark, #f8f9fa);
            border: 1px solid var(--border-color, #dee2e6);
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
            overflow-x: auto;
        }
        
        .code-block pre {
            margin: 0;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.85rem;
            line-height: 1.4;
        }
        
        .info-card {
            background: var(--bg-light, #f8f9fa);
            border: 1px solid var(--border-color, #dee2e6);
            border-radius: 8px;
            padding: 1.5rem;
        }
        
        .info-card h3 {
            margin-top: 0;
            color: var(--primary-color, #007bff);
        }
        
        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 4px;
            transition: background-color 0.2s ease;
        }
        
        .checkbox-label:hover {
            background: var(--bg-light, #f8f9fa);
        }
        
        .checkbox-label input[type="checkbox"] {
            margin: 0;
        }
    </style>
</body>
</html>