<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>在庫管理統計ダッシュボード</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #2c3e50;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        
        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .stat-label {
            font-size: 0.9rem;
            color: #7f8c8d;
            margin-bottom: 0.5rem;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .stat-change {
            font-size: 0.85rem;
            margin-top: 0.5rem;
        }
        
        .stat-change.positive { color: #27ae60; }
        .stat-change.negative { color: #e74c3c; }
        
        .table-container {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .table-title {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #2c3e50;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ecf0f1;
        }
        
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #5a6c7d;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .platform-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 500;
        }
        
        .platform-ebay { background: #ffd93d; color: #2c3e50; }
        .platform-amazon { background: #ff9a00; color: white; }
        
        .status-synced { color: #27ae60; }
        .status-pending { color: #f39c12; }
        .status-failed { color: #e74c3c; }
        
        .refresh-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background 0.2s;
        }
        
        .refresh-btn:hover {
            background: #5568d3;
        }
        
        .loading {
            text-align: center;
            padding: 2rem;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>📊 在庫管理統計ダッシュボード</h1>
            <p style="margin-top: 0.5rem; opacity: 0.9;">リアルタイム価格変動・モール別同期状況</p>
        </div>
    </div>
    
    <div class="container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2>概要統計</h2>
            <button class="refresh-btn" onclick="loadAllData()">🔄 更新</button>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">管理中商品数</div>
                <div class="stat-value" id="totalManaged">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">今日のチェック完了</div>
                <div class="stat-value" id="todayChecked">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">今日の価格変更</div>
                <div class="stat-value" id="todayChanges">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">総変更回数</div>
                <div class="stat-value" id="totalChanges">-</div>
            </div>
        </div>
        
        <div class="table-container">
            <div class="table-title">モール別同期状況</div>
            <table id="platformTable">
                <thead>
                    <tr>
                        <th>モール</th>
                        <th>総商品数</th>
                        <th>同期済み</th>
                        <th>同期待ち</th>
                        <th>失敗</th>
                        <th>最終同期</th>
                    </tr>
                </thead>
                <tbody id="platformTableBody">
                    <tr><td colspan="6" class="loading">読み込み中...</td></tr>
                </tbody>
            </table>
        </div>
        
        <div class="table-container">
            <div class="table-title">最近の価格変更（20件）</div>
            <table id="recentChangesTable">
                <thead>
                    <tr>
                        <th>商品ID</th>
                        <th>商品名</th>
                        <th>変更前</th>
                        <th>変更後</th>
                        <th>変動率</th>
                        <th>モール</th>
                        <th>日時</th>
                    </tr>
                </thead>
                <tbody id="recentChangesBody">
                    <tr><td colspan="7" class="loading">読み込み中...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        const API_BASE = '/modules/yahoo_auction_complete/new_structure/02_scraping/inventory_management/api/inventory_statistics.php';
        
        async function loadAllData() {
            await Promise.all([
                loadDashboard(),
                loadPlatformStats(),
                loadRecentChanges()
            ]);
        }
        
        async function loadDashboard() {
            try {
                const res = await fetch(`${API_BASE}?action=dashboard`);
                const data = await res.json();
                
                if (data.success) {
                    document.getElementById('totalManaged').textContent = data.data.summary.total_managed.toLocaleString();
                    document.getElementById('todayChecked').textContent = data.data.summary.today_checked.toLocaleString();
                    document.getElementById('todayChanges').textContent = data.data.summary.today_changes.toLocaleString();
                    document.getElementById('totalChanges').textContent = (data.data.price_statistics.total_changes || 0).toLocaleString();
                }
            } catch (error) {
                console.error('Dashboard load error:', error);
            }
        }
        
        async function loadPlatformStats() {
            try {
                const res = await fetch(`${API_BASE}?action=platform_stats`);
                const data = await res.json();
                
                if (data.success && data.data.length > 0) {
                    const tbody = document.getElementById('platformTableBody');
                    tbody.innerHTML = data.data.map(row => `
                        <tr>
                            <td><span class="platform-badge platform-${row.platform.toLowerCase()}">${row.platform.toUpperCase()}</span></td>
                            <td>${row.total_products}</td>
                            <td class="status-synced">${row.synced}</td>
                            <td class="status-pending">${row.pending}</td>
                            <td class="status-failed">${row.failed}</td>
                            <td>${row.last_sync ? new Date(row.last_sync).toLocaleString('ja-JP') : '-'}</td>
                        </tr>
                    `).join('');
                } else {
                    document.getElementById('platformTableBody').innerHTML = '<tr><td colspan="6">データがありません</td></tr>';
                }
            } catch (error) {
                console.error('Platform stats load error:', error);
            }
        }
        
        async function loadRecentChanges() {
            try {
                const res = await fetch(`${API_BASE}?action=recent_changes&limit=20`);
                const data = await res.json();
                
                if (data.success && data.data.length > 0) {
                    const tbody = document.getElementById('recentChangesBody');
                    tbody.innerHTML = data.data.map(row => {
                        const changePercent = parseFloat(row.change_percent);
                        const changeClass = changePercent >= 0 ? 'positive' : 'negative';
                        const changeSymbol = changePercent >= 0 ? '+' : '';
                        
                        return `
                            <tr>
                                <td>${row.product_id}</td>
                                <td>${row.title.substring(0, 40)}...</td>
                                <td>¥${parseInt(row.old_price_jpy).toLocaleString()}</td>
                                <td>¥${parseInt(row.new_price_jpy).toLocaleString()} / $${parseFloat(row.new_price_usd).toFixed(2)}</td>
                                <td class="stat-change ${changeClass}">${changeSymbol}${changePercent}%</td>
                                <td><span class="platform-badge platform-${row.platform || 'ebay'}">${(row.platform || 'eBay').toUpperCase()}</span></td>
                                <td>${new Date(row.created_at).toLocaleString('ja-JP')}</td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    document.getElementById('recentChangesBody').innerHTML = '<tr><td colspan="7">データがありません</td></tr>';
                }
            } catch (error) {
                console.error('Recent changes load error:', error);
            }
        }
        
        // 初回読み込み
        loadAllData();
        
        // 5分ごとに自動更新
        setInterval(loadAllData, 5 * 60 * 1000);
    </script>
</body>
</html>
