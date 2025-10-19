<?php
/**
 * TCG統合管理UI
 * 
 * 11サイト対応の統一管理画面
 * Yahoo Auction統合システムのUI設計を継承
 * 
 * @version 1.0.0
 * @created 2025-09-26
 */

require_once __DIR__ . '/../../shared/core/database.php';

$pdo = getDBConnection();
$pageTitle = 'TCG統合スクレイピング管理';
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle; ?></title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f7fa;
            color: #2c3e50;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            margin-bottom: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        header h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }
        
        header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        }
        
        .card h2 {
            font-size: 24px;
            margin-bottom: 20px;
            color: #667eea;
            display: flex;
            align-items: center;
        }
        
        .card h2::before {
            content: '●';
            margin-right: 10px;
            font-size: 12px;
        }
        
        .platform-selector {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .platform-btn {
            padding: 15px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
        }
        
        .platform-btn:hover {
            border-color: #667eea;
            background: #f8f9ff;
            transform: translateY(-2px);
        }
        
        .platform-btn.active {
            border-color: #667eea;
            background: #667eea;
            color: white;
        }
        
        .platform-btn .name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .platform-btn .category {
            font-size: 12px;
            opacity: 0.7;
        }
        
        .input-group {
            margin-bottom: 20px;
        }
        
        .input-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
        }
        
        .input-group textarea {
            width: 100%;
            min-height: 150px;
            padding: 12px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            font-family: monospace;
            font-size: 14px;
            resize: vertical;
        }
        
        .input-group textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .btn-group {
            display: flex;
            gap: 15px;
            margin-top: 20px;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn-primary {
            background: #667eea;
            color: white;
        }
        
        .btn-primary:hover {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #5a6268;
        }
        
        .btn-success {
            background: #28a745;
            color: white;
        }
        
        .btn-success:hover {
            background: #218838;
        }
        
        #results {
            margin-top: 30px;
        }
        
        .result-item {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 8px;
        }
        
        .result-item.success {
            border-left-color: #28a745;
        }
        
        .result-item.error {
            border-left-color: #dc3545;
        }
        
        .result-item .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .result-item .title {
            font-weight: bold;
            font-size: 16px;
        }
        
        .result-item .platform {
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
        }
        
        .result-item .details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }
        
        .result-item .detail {
            font-size: 14px;
        }
        
        .result-item .detail .label {
            font-weight: 600;
            color: #666;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        
        .stat-card .number {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .stat-card .label {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .loading.active {
            display: block;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1><?php echo $pageTitle; ?></h1>
            <p>11サイト対応の統合TCGスクレイピング・在庫管理システム</p>
        </header>
        
        <!-- プラットフォーム選択 -->
        <div class="card">
            <h2>対応プラットフォーム</h2>
            <div class="platform-selector" id="platformSelector">
                <div class="platform-btn active" data-platform="auto">
                    <div class="name">自動判定</div>
                    <div class="category">全サイト対応</div>
                </div>
                <div class="platform-btn" data-platform="singlestar">
                    <div class="name">シングルスター</div>
                    <div class="category">MTG専門</div>
                </div>
                <div class="platform-btn" data-platform="hareruya_mtg">
                    <div class="name">晴れる屋MTG</div>
                    <div class="category">MTG</div>
                </div>
                <div class="platform-btn" data-platform="hareruya2">
                    <div class="name">晴れる屋2</div>
                    <div class="category">ポケカ</div>
                </div>
                <div class="platform-btn" data-platform="fullahead">
                    <div class="name">フルアヘッド</div>
                    <div class="category">ポケカ専門</div>
                </div>
                <div class="platform-btn" data-platform="cardrush">
                    <div class="name">カードラッシュ</div>
                    <div class="category">ポケカ</div>
                </div>
                <div class="platform-btn" data-platform="yuyu_tei">
                    <div class="name">遊々亭</div>
                    <div class="category">総合TCG</div>
                </div>
                <div class="platform-btn" data-platform="furu1">
                    <div class="name">駿河屋</div>
                    <div class="category">総合</div>
                </div>
                <div class="platform-btn" data-platform="dorasuta">
                    <div class="name">ドラスタ</div>
                    <div class="category">総合TCG</div>
                </div>
            </div>
        </div>
        
        <!-- スクレイピング実行 -->
        <div class="card">
            <h2>スクレイピング実行</h2>
            
            <div class="input-group">
                <label>商品URL（1行1URL、複数可）</label>
                <textarea id="urlInput" placeholder="https://www.singlestar.jp/product/12345
https://www.hareruyamtg.com/ja/products/67890
https://pokemon-card-fullahead.com/product/11111"></textarea>
            </div>
            
            <div class="btn-group">
                <button class="btn btn-primary" onclick="startScraping()">
                    スクレイピング開始
                </button>
                <button class="btn btn-secondary" onclick="clearResults()">
                    結果クリア
                </button>
                <button class="btn btn-success" onclick="exportResults()">
                    結果エクスポート
                </button>
            </div>
            
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p style="margin-top: 10px;">処理中...</p>
            </div>
        </div>
        
        <!-- 結果表示 -->
        <div class="card" id="resultsCard" style="display: none;">
            <h2>スクレイピング結果</h2>
            <div id="results"></div>
        </div>
        
        <!-- 統計情報 -->
        <div class="card">
            <h2>統計情報</h2>
            <div class="stats-grid" id="statsGrid">
                <div class="stat-card">
                    <div class="number" id="totalProducts">0</div>
                    <div class="label">登録商品数</div>
                </div>
                <div class="stat-card">
                    <div class="number" id="todayScraped">0</div>
                    <div class="label">本日取得数</div>
                </div>
                <div class="stat-card">
                    <div class="number" id="inStockCount">0</div>
                    <div class="label">在庫あり</div>
                </div>
                <div class="stat-card">
                    <div class="number" id="platformCount">11</div>
                    <div class="label">対応サイト数</div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        let selectedPlatform = 'auto';
        let scrapingResults = [];
        
        // プラットフォーム選択
        document.querySelectorAll('.platform-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                selectedPlatform = this.dataset.platform;
            });
        });
        
        // スクレイピング開始
        async function startScraping() {
            const urlInput = document.getElementById('urlInput').value.trim();
            
            if (!urlInput) {
                alert('URLを入力してください');
                return;
            }
            
            const urls = urlInput.split('\n').filter(url => url.trim());
            
            if (urls.length === 0) {
                alert('有効なURLがありません');
                return;
            }
            
            document.getElementById('loading').classList.add('active');
            document.getElementById('resultsCard').style.display = 'none';
            scrapingResults = [];
            
            try {
                const response = await fetch('../api/tcg_unified_scraping_api.php?action=batch_scrape', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ urls: urls })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    scrapingResults = data.data.results;
                    displayResults(data.data);
                    updateStats();
                } else {
                    alert('エラー: ' + data.error);
                }
                
            } catch (error) {
                alert('通信エラー: ' + error.message);
            } finally {
                document.getElementById('loading').classList.remove('active');
            }
        }
        
        // 結果表示
        function displayResults(data) {
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = '';
            
            if (data.results.length === 0) {
                resultsDiv.innerHTML = '<p>結果がありません</p>';
                return;
            }
            
            data.results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = `result-item ${result.success ? 'success' : 'error'}`;
                
                if (result.success) {
                    const d = result.data;
                    resultItem.innerHTML = `
                        <div class="header">
                            <div class="title">${d.card_name || 'タイトル不明'}</div>
                            <div class="platform">${result.platform}</div>
                        </div>
                        <div class="details">
                            <div class="detail">
                                <span class="label">価格:</span> ¥${Number(d.price || 0).toLocaleString()}
                            </div>
                            <div class="detail">
                                <span class="label">在庫:</span> ${d.stock_status}
                            </div>
                            <div class="detail">
                                <span class="label">状態:</span> ${d.condition}
                            </div>
                            <div class="detail">
                                <span class="label">カテゴリ:</span> ${d.tcg_category}
                            </div>
                        </div>
                    `;
                } else {
                    resultItem.innerHTML = `
                        <div class="header">
                            <div class="title">エラー</div>
                        </div>
                        <div class="details">
                            <div class="detail">${result.error}</div>
                        </div>
                    `;
                }
                
                resultsDiv.appendChild(resultItem);
            });
            
            document.getElementById('resultsCard').style.display = 'block';
        }
        
        // 統計更新
        async function updateStats() {
            try {
                const response = await fetch('../api/tcg_unified_scraping_api.php?action=get_stats');
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('totalProducts').textContent = data.data.total_products || 0;
                    
                    const inStock = data.data.stats.reduce((sum, s) => sum + (s.in_stock || 0), 0);
                    document.getElementById('inStockCount').textContent = inStock;
                }
            } catch (error) {
                console.error('統計取得エラー:', error);
            }
        }
        
        // 結果クリア
        function clearResults() {
            document.getElementById('urlInput').value = '';
            document.getElementById('results').innerHTML = '';
            document.getElementById('resultsCard').style.display = 'none';
            scrapingResults = [];
        }
        
        // 結果エクスポート
        function exportResults() {
            if (scrapingResults.length === 0) {
                alert('エクスポートする結果がありません');
                return;
            }
            
            const csv = convertToCSV(scrapingResults);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `tcg_scraping_${new Date().toISOString().slice(0,10)}.csv`;
            link.click();
        }
        
        // CSV変換
        function convertToCSV(results) {
            const headers = ['プラットフォーム', 'カード名', '価格', '在庫状態', '状態', 'カテゴリ', 'URL'];
            const rows = results.map(r => {
                if (!r.success) return null;
                const d = r.data;
                return [
                    r.platform,
                    d.card_name || '',
                    d.price || 0,
                    d.stock_status || '',
                    d.condition || '',
                    d.tcg_category || '',
                    d.source_url || ''
                ];
            }).filter(r => r !== null);
            
            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }
        
        // 初期統計読み込み
        updateStats();
    </script>
</body>
</html>
