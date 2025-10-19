<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>マルチプラットフォーム スクレイピング システム v2025</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <link href="../shared/css/common.css" rel="stylesheet">
    <style>
        /* プラットフォーム選択用のスタイル */
        .platform-selector {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }
        
        .platform-option {
            background: var(--bg-secondary, #f8f9fa);
            border: 2px solid var(--border-color, #dee2e6);
            border-radius: 8px;
            padding: 0.5rem 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            min-width: 120px;
        }
        
        .platform-option:hover {
            border-color: var(--primary-color, #007bff);
            background: var(--bg-hover, #e9ecef);
        }
        
        .platform-option.active {
            border-color: var(--primary-color, #007bff);
            background: var(--primary-color, #007bff);
            color: white;
        }
        
        .platform-option.disabled {
            opacity: 0.6;
            cursor: not-allowed;
            border-color: var(--gray-300, #dee2e6);
        }
        
        .platform-option.disabled:hover {
            border-color: var(--gray-300, #dee2e6);
            background: var(--bg-secondary, #f8f9fa);
            color: inherit;
        }
        
        .url-input-group {
            margin-bottom: 1rem;
        }
        
        .url-input-group label {
            display: block;
            margin-bottom: 0.3rem;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-primary, #212529);
        }
        
        .url-examples {
            font-size: 0.8rem;
            color: var(--text-secondary, #6c757d);
            margin-top: 0.3rem;
            line-height: 1.4;
        }
        
        .platform-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background: var(--bg-card, #fff);
            border: 1px solid var(--border-color, #dee2e6);
            border-radius: 8px;
            padding: 1rem;
            text-align: center;
            box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1));
        }
        
        .stat-card .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: var(--primary-color, #007bff);
            display: block;
        }
        
        .stat-card .stat-label {
            font-size: 0.9rem;
            color: var(--text-secondary, #6c757d);
            margin-top: 0.5rem;
        }
        
        .results-container {
            margin-top: 2rem;
        }
        
        .result-item {
            background: var(--bg-card, #fff);
            border: 1px solid var(--border-color, #dee2e6);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            position: relative;
        }
        
        .result-item.success {
            border-left: 4px solid var(--success-color, #28a745);
        }
        
        .result-item.error {
            border-left: 4px solid var(--danger-color, #dc3545);
        }
        
        .platform-badge {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            background: var(--primary-color, #007bff);
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.7rem;
            text-transform: uppercase;
        }
        
        .platform-badge.yahoo { background: #6f42c1; }
        .platform-badge.rakuten { background: #bf0000; }
        .platform-badge.mercari { background: #ff6c00; }
        .platform-badge.pokemon { background: #ffcb05; color: #000; }
        .platform-badge.yodobashi { background: #e60012; }
        
        .batch-results {
            margin-top: 2rem;
        }
        
        .batch-summary {
            background: var(--bg-info, #d1ecf1);
            border: 1px solid var(--border-info, #bee5eb);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        
        .progress-bar {
            background: var(--bg-secondary, #f8f9fa);
            border-radius: 4px;
            height: 8px;
            overflow: hidden;
            margin-top: 0.5rem;
        }
        
        .progress-fill {
            background: var(--success-color, #28a745);
            height: 100%;
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-robot"></i> マルチプラットフォーム スクレイピング システム</h1>
            <p class="subtitle">Yahoo・楽天・メルカリ・その他ECサイト対応 v2025</p>
        </div>

        <!-- プラットフォーム統計 -->
        <div class="section">
            <div class="section-header">
                <i class="fas fa-chart-bar"></i>
                <h3 class="section-title">プラットフォーム統計</h3>
                <button class="btn btn-sm btn-secondary" onclick="loadStats()">
                    <i class="fas fa-refresh"></i> 更新
                </button>
            </div>
            <div class="platform-stats" id="platformStats">
                <div class="stat-card">
                    <span class="stat-number">-</span>
                    <div class="stat-label">総商品数</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">-</span>
                    <div class="stat-label">Yahoo商品</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">-</span>
                    <div class="stat-label">楽天商品</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">-</span>
                    <div class="stat-label">平均価格</div>
                </div>
            </div>
        </div>

        <!-- スクレイピングセクション -->
        <div class="section">
            <div class="section-header">
                <i class="fas fa-download"></i>
                <h3 class="section-title">商品データ取得</h3>
            </div>

            <!-- プラットフォーム選択 -->
            <div class="platform-selector">
                <div class="platform-option active" data-platform="auto" onclick="selectPlatform('auto')">
                    <i class="fas fa-magic"></i>
                    <span>自動判定</span>
                </div>
                <div class="platform-option" data-platform="yahoo" onclick="selectPlatform('yahoo')">
                    <i class="fas fa-gavel"></i>
                    <span>Yahoo</span>
                </div>
                <div class="platform-option" data-platform="rakuten" onclick="selectPlatform('rakuten')">
                    <i class="fas fa-store"></i>
                    <span>楽天市場</span>
                </div>
                <div class="platform-option disabled" data-platform="mercari" onclick="selectPlatform('mercari')">
                    <i class="fas fa-shopping-bag"></i>
                    <span>メルカリ</span>
                </div>
                <div class="platform-option disabled" data-platform="pokemon" onclick="selectPlatform('pokemon')">
                    <i class="fas fa-gamepad"></i>
                    <span>ポケモン</span>
                </div>
                <div class="platform-option disabled" data-platform="yodobashi" onclick="selectPlatform('yodobashi')">
                    <i class="fas fa-tv"></i>
                    <span>ヨドバシ</span>
                </div>
            </div>

            <div class="grid-2">
                <!-- 単一URL入力 -->
                <div>
                    <form onsubmit="return handleSingleScraping(event)" id="scrapingForm">
                        <div class="url-input-group">
                            <label>商品ページURL</label>
                            <textarea name="url" id="productUrl" rows="4" placeholder="商品ページのURLを入力してください
複数URL可（改行区切り）"></textarea>
                            <div class="url-examples" id="urlExamples">
                                <strong>対応URL例:</strong><br>
                                • Yahoo: https://auctions.yahoo.co.jp/jp/auction/xxxxx<br>
                                • 楽天: https://item.rakuten.co.jp/shop/item/
                            </div>
                        </div>
                        <div class="button-group">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-play"></i> スクレイピング開始
                            </button>
                            <button type="button" class="btn btn-info" onclick="testConnection()">
                                <i class="fas fa-link"></i> 接続テスト
                            </button>
                            <button type="button" class="btn btn-success" onclick="clearResults()">
                                <i class="fas fa-trash"></i> 結果クリア
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- CSVアップロード -->
                <div>
                    <form onsubmit="return handleCsvUpload(event)" enctype="multipart/form-data">
                        <div class="url-input-group">
                            <label>CSV一括アップロード</label>
                            <input type="file" name="csv_file" accept=".csv" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
                            <div class="url-examples">
                                <strong>CSV形式:</strong> 1行目にURL、2行目以降にデータ<br>
                                最大100件まで一括処理可能
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-upload"></i> CSV一括処理
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- 結果表示エリア -->
        <div class="results-container" id="resultsContainer" style="display: none;">
            <div class="section">
                <div class="section-header">
                    <i class="fas fa-list"></i>
                    <h3 class="section-title">スクレイピング結果</h3>
                </div>
                <div id="resultsContent"></div>
            </div>
        </div>

        <!-- システムナビゲーション -->
        <div class="section">
            <div class="section-header">
                <i class="fas fa-arrow-right"></i>
                <h3 class="section-title">次のステップ</h3>
            </div>
            <div class="navigation-grid">
                <a href="../07_editing/editing.php" class="nav-card">
                    <div class="nav-icon"><i class="fas fa-edit"></i></div>
                    <h4>データ編集</h4>
                    <p>取得したデータの確認・編集</p>
                </a>
                
                <a href="../06_filters/filters.php" class="nav-card">
                    <div class="nav-icon"><i class="fas fa-filter"></i></div>
                    <h4>フィルター設定</h4>
                    <p>商品絞り込み条件の設定</p>
                </a>
                
                <a href="../11_category/category.php" class="nav-card">
                    <div class="nav-icon"><i class="fas fa-tags"></i></div>
                    <h4>カテゴリー分析</h4>
                    <p>AI による商品分類</p>
                </a>
                
                <a href="../08_listing/listing.php" class="nav-card">
                    <div class="nav-icon"><i class="fas fa-store"></i></div>
                    <h4>出品管理</h4>
                    <p>eBay への自動出品</p>
                </a>
            </div>
        </div>
    </div>

    <script>
    // グローバル変数
    let currentPlatform = 'auto';
    let scrapingResults = [];
    let isProcessing = false;
    
    // 初期化
    document.addEventListener('DOMContentLoaded', function() {
        loadStats();
        updateUrlExamples();
    });
    
    // プラットフォーム選択
    function selectPlatform(platform) {
        // disabled プラットフォームはスキップ
        const platformOption = document.querySelector(`.platform-option[data-platform="${platform}"]`);
        if (platformOption && platformOption.classList.contains('disabled')) {
            showNotification('このプラットフォームは実装予定です', 'warning');
            return;
        }
        
        currentPlatform = platform;
        
        // アクティブ状態更新
        document.querySelectorAll('.platform-option').forEach(option => {
            option.classList.remove('active');
        });
        
        document.querySelector(`.platform-option[data-platform="${platform}"]`).classList.add('active');
        
        updateUrlExamples();
    }
    
    // URL例の更新
    function updateUrlExamples() {
        const examples = {
            auto: `<strong>対応URL例:</strong><br>
                • Yahoo: https://auctions.yahoo.co.jp/jp/auction/xxxxx<br>
                • 楽天: https://item.rakuten.co.jp/shop/item/`,
            yahoo: `<strong>Yahoo オークション URL例:</strong><br>
                • https://auctions.yahoo.co.jp/jp/auction/x123456789<br>
                • https://page.auctions.yahoo.co.jp/jp/auction/x123456789`,
            rakuten: `<strong>楽天市場 URL例:</strong><br>
                • https://item.rakuten.co.jp/shopname/itemcode/<br>
                • https://item.rakuten.co.jp/shopname/itemcode/?iasid=xxx`,
            mercari: `<strong>メルカリ URL例（実装予定）:</strong><br>
                • https://jp.mercari.com/item/mxxxxxxxxxx`,
            pokemon: `<strong>ポケモンセンター URL例（実装予定）:</strong><br>
                • https://www.pokemoncenter-online.com/?p_cd=xxxxx`,
            yodobashi: `<strong>ヨドバシカメラ URL例（実装予定）:</strong><br>
                • https://www.yodobashi.com/product/xxxxx/`
        };
        
        document.getElementById('urlExamples').innerHTML = examples[currentPlatform] || examples.auto;
    }
    
    // 統計データ読み込み
    function loadStats() {
        fetch('scraping_enhanced.php?action=get_stats')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateStatsDisplay(data.data);
                } else {
                    console.error('統計取得エラー:', data.message);
                }
            })
            .catch(error => {
                console.error('統計取得エラー:', error);
            });
    }
    
    // 統計表示更新
    function updateStatsDisplay(stats) {
        const statCards = document.querySelectorAll('.stat-card .stat-number');
        
        statCards[0].textContent = stats.total_products || '0';
        statCards[1].textContent = stats.yahoo_products || '0';
        statCards[2].textContent = stats.rakuten_products || '0';
        statCards[3].textContent = stats.avg_price ? '¥' + Math.round(stats.avg_price).toLocaleString() : '-';
    }
    
    // 単一スクレイピング処理
    function handleSingleScraping(event) {
        event.preventDefault();
        
        if (isProcessing) {
            showNotification('処理中です。しばらくお待ちください。', 'warning');
            return false;
        }
        
        const url = document.getElementById('productUrl').value.trim();
        if (!url) {
            showNotification('URLを入力してください', 'error');
            return false;
        }
        
        // 複数URLの場合はバッチ処理に切り替え
        const urls = url.split('\n').filter(u => u.trim()).map(u => u.trim());
        if (urls.length > 1) {
            return handleBatchScraping(urls);
        }
        
        startScraping(urls[0]);
        return false;
    }
    
    // スクレイピング開始
    function startScraping(url) {
        isProcessing = true;
        showNotification('スクレイピングを開始しています...', 'info');
        
        // ボタンを無効化
        const submitBtn = document.querySelector('#scrapingForm button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';
        submitBtn.disabled = true;
        
        const formData = new FormData();
        formData.append('action', 'scrape');
        formData.append('url', url);
        
        fetch('scraping_enhanced.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            isProcessing = false;
            
            // ボタンを有効化
            submitBtn.innerHTML = '<i class="fas fa-play"></i> スクレイピング開始';
            submitBtn.disabled = false;
            
            if (data.success) {
                showNotification('スクレイピングが完了しました', 'success');
                displaySingleResult(data.data);
                loadStats(); // 統計更新
            } else {
                showNotification('スクレイピングに失敗しました: ' + data.message, 'error');
            }
        })
        .catch(error => {
            isProcessing = false;
            submitBtn.innerHTML = '<i class="fas fa-play"></i> スクレイピング開始';
            submitBtn.disabled = false;
            showNotification('エラーが発生しました: ' + error.message, 'error');
            console.error('スクレイピングエラー:', error);
        });
    }
    
    // バッチスクレイピング処理
    function handleBatchScraping(urls) {
        if (urls.length > 100) {
            showNotification('一度に処理できるURLは100件までです', 'error');
            return false;
        }
        
        isProcessing = true;
        showNotification(`${urls.length}件のURLをバッチ処理しています...`, 'info');
        
        const formData = new FormData();
        formData.append('action', 'batch_scrape');
        formData.append('urls', JSON.stringify(urls));
        
        fetch('scraping_enhanced.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            isProcessing = false;
            
            if (data.success) {
                showNotification('バッチ処理が完了しました', 'success');
                displayBatchResults(data.data);
                loadStats();
            } else {
                showNotification('バッチ処理に失敗しました: ' + data.message, 'error');
            }
        })
        .catch(error => {
            isProcessing = false;
            showNotification('エラーが発生しました: ' + error.message, 'error');
            console.error('バッチ処理エラー:', error);
        });
        
        return false;
    }
    
    // CSV アップロード処理
    function handleCsvUpload(event) {
        event.preventDefault();
        
        const fileInput = event.target.querySelector('input[type="file"]');
        const file = fileInput.files[0];
        
        if (!file) {
            showNotification('CSVファイルを選択してください', 'error');
            return false;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const csv = e.target.result;
            const lines = csv.split('\n').filter(line => line.trim());
            const urls = lines.slice(1).map(line => line.split(',')[0].trim()).filter(url => url);
            
            if (urls.length === 0) {
                showNotification('有効なURLが見つかりませんでした', 'error');
                return;
            }
            
            handleBatchScraping(urls);
        };
        
        reader.readAsText(file);
        return false;
    }
    
    // 単一結果表示
    function displaySingleResult(data) {
        const resultsContainer = document.getElementById('resultsContainer');
        const resultsContent = document.getElementById('resultsContent');
        
        const platformBadge = getPlatformBadge(data.platform);
        const resultHtml = `
            <div class="result-item success">
                ${platformBadge}
                <h4><i class="fas fa-check-circle"></i> ${data.title}</h4>
                <div class="grid-2" style="margin-top: 1rem;">
                    <div>
                        <strong>価格:</strong> ¥${data.current_price.toLocaleString()}<br>
                        <strong>URL:</strong> <a href="${data.url}" target="_blank">${data.url.substring(0, 50)}...</a><br>
                        <strong>取得日時:</strong> ${data.scraped_at}
                    </div>
                    <div>
                        <strong>画像数:</strong> ${data.images ? data.images.length : 0}枚<br>
                        <strong>カテゴリー:</strong> ${data.categories ? data.categories.join(', ') : 'なし'}<br>
                        <strong>店舗:</strong> ${data.seller_info?.shop_name || 'なし'}
                    </div>
                </div>
            </div>
        `;
        
        resultsContent.innerHTML = resultHtml;
        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    // バッチ結果表示
    function displayBatchResults(data) {
        const resultsContainer = document.getElementById('resultsContainer');
        const resultsContent = document.getElementById('resultsContent');
        
        const summary = data.summary;
        const successRate = (summary.success_count / summary.total * 100).toFixed(1);
        
        let resultsHtml = `
            <div class="batch-summary">
                <h4><i class="fas fa-chart-pie"></i> 処理結果サマリー</h4>
                <div class="grid-3" style="margin-top: 1rem;">
                    <div><strong>総件数:</strong> ${summary.total}件</div>
                    <div><strong>成功:</strong> ${summary.success_count}件</div>
                    <div><strong>エラー:</strong> ${summary.error_count}件</div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${successRate}%"></div>
                </div>
                <div style="margin-top: 0.5rem; font-size: 0.9rem;">成功率: ${successRate}%</div>
            </div>
        `;
        
        data.results.forEach((result, index) => {
            if (result.success && result.data) {
                const platformBadge = getPlatformBadge(result.data.platform);
                resultsHtml += `
                    <div class="result-item success">
                        ${platformBadge}
                        <h5><i class="fas fa-check-circle"></i> ${result.data.title}</h5>
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">
                            価格: ¥${result.data.current_price.toLocaleString()} | 
                            画像: ${result.data.images ? result.data.images.length : 0}枚
                        </div>
                    </div>
                `;
            } else {
                resultsHtml += `
                    <div class="result-item error">
                        <h5><i class="fas fa-exclamation-triangle"></i> 処理エラー</h5>
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">
                            ${result.message || result.error || 'エラーの詳細が不明です'}
                        </div>
                    </div>
                `;
            }
        });
        
        resultsContent.innerHTML = resultsHtml;
        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    // プラットフォームバッジ取得
    function getPlatformBadge(platform) {
        const badges = {
            yahoo_auction: '<div class="platform-badge yahoo">Yahoo</div>',
            rakuten: '<div class="platform-badge rakuten">楽天</div>',
            mercari: '<div class="platform-badge mercari">メルカリ</div>',
            pokemon_center: '<div class="platform-badge pokemon">ポケモン</div>',
            yodobashi: '<div class="platform-badge yodobashi">ヨドバシ</div>'
        };
        
        return badges[platform] || '<div class="platform-badge">その他</div>';
    }
    
    // 接続テスト
    function testConnection() {
        showNotification('接続テストを実行しています...', 'info');
        
        fetch('scraping_enhanced.php?action=test_connection')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('接続テスト成功: 全ての機能が正常です', 'success');
                } else {
                    showNotification('接続テスト失敗: ' + data.message, 'warning');
                }
                console.log('接続テスト結果:', data.data);
            })
            .catch(error => {
                showNotification('接続テストエラー: ' + error.message, 'error');
                console.error('接続テストエラー:', error);
            });
    }
    
    // 結果クリア
    function clearResults() {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.style.display = 'none';
        document.getElementById('resultsContent').innerHTML = '';
        scrapingResults = [];
        showNotification('結果をクリアしました', 'info');
    }
    
    // 通知表示
    function showNotification(message, type = 'info') {
        // 既存の通知を削除
        const existingNotification = document.querySelector('.notification-overlay');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification-overlay ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${getNotificationIcon(type)}"></i>
                <span>${message}</span>
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
    </script>
    
    <style>
        /* 通知スタイル */
        .notification-overlay {
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
        
        .notification-overlay.success .notification-content {
            background: var(--success-color, #d4edda);
            border: 1px solid var(--success-border, #c3e6cb);
            color: var(--success-text, #155724);
        }
        
        .notification-overlay.error .notification-content {
            background: var(--danger-color, #f8d7da);
            border: 1px solid var(--danger-border, #f5c6cb);
            color: var(--danger-text, #721c24);
        }
        
        .notification-overlay.warning .notification-content {
            background: var(--warning-color, #fff3cd);
            border: 1px solid var(--warning-border, #ffeaa7);
            color: var(--warning-text, #856404);
        }
        
        .notification-overlay.info .notification-content {
            background: var(--info-color, #d1ecf1);
            border: 1px solid var(--info-border, #bee5eb);
            color: var(--info-text, #0c5460);
        }
        
        .notification-content button {
            background: none;
            border: none;
            cursor: pointer;
            opacity: 0.7;
            margin-left: auto;
        }
        
        .notification-content button:hover {
            opacity: 1;
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
    </style>
</body>
</html>