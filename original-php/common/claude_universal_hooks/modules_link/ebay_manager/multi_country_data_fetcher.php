<?php
/**
 * 多国籍・CSV・セット品対応 eBayデータ取得UI
 * サンプルデータ完全禁止・実APIデータ専用
 */

// データベース接続確認
function checkMultiCountryDatabase() {
    try {
        $pdo = new PDO("pgsql:host=localhost;port=5432;dbname=ebay_kanri_db", "postgres", "Kn240914");
        
        // 多国籍対応テーブル確認
        $tables = ['products', 'ebay_listings', 'product_sets', 'csv_import_history', 'real_api_log'];
        $table_status = [];
        
        foreach ($tables as $table) {
            $stmt = $pdo->query("SELECT COUNT(*) FROM {$table}");
            $count = $stmt->fetchColumn();
            $table_status[$table] = $count;
        }
        
        // 多国展開統計
        $stmt = $pdo->query("SELECT * FROM multi_country_stats LIMIT 10");
        $multi_country_products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'connected' => true,
            'tables' => $table_status,
            'multi_country_products' => $multi_country_products,
            'total_countries' => 8, // US, UK, DE, AU, CA, FR, IT, ES
            'sample_data_blocked' => true
        ];
        
    } catch (Exception $e) {
        return ['connected' => false, 'error' => $e->getMessage()];
    }
}

$db_status = checkMultiCountryDatabase();
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>多国籍eBayデータ取得システム</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; }
        
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
        .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stat-card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-value { font-size: 2rem; font-weight: bold; color: #4f46e5; }
        .stat-label { color: #64748b; margin-top: 0.5rem; }
        
        .section { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .section h2 { margin-bottom: 1.5rem; color: #1e293b; }
        
        .btn { padding: 0.75rem 1.5rem; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #4f46e5; color: white; }
        .btn-primary:hover { background: #3730a3; }
        .btn-success { background: #10b981; color: white; }
        .btn-success:hover { background: #047857; }
        .btn-warning { background: #f59e0b; color: white; }
        .btn-warning:hover { background: #d97706; }
        
        .form-group { margin-bottom: 1rem; }
        .form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
        .form-input { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
        .form-select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
        
        .progress { background: #e5e7eb; border-radius: 8px; overflow: hidden; margin: 1rem 0; }
        .progress-bar { height: 8px; background: #4f46e5; width: 0%; transition: width 0.3s; }
        
        .alert { padding: 1rem; border-radius: 6px; margin: 1rem 0; }
        .alert-success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .alert-error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        
        .country-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin: 1rem 0; }
        .country-card { text-align: center; padding: 1rem; background: #f8fafc; border-radius: 6px; border: 2px solid transparent; cursor: pointer; }
        .country-card.selected { border-color: #4f46e5; background: #eef2ff; }
        .country-flag { font-size: 2rem; margin-bottom: 0.5rem; }
        
        .table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .table th, .table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .table th { background: #f9fafb; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-globe"></i> 多国籍eBayデータ取得システム</h1>
            <p>実APIデータ専用・8ヶ国対応・CSV/セット品管理</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value"><?= $db_status['connected'] ? '✅' : '❌' ?></div>
                <div class="stat-label">データベース接続</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?= $db_status['tables']['products'] ?? 0 ?></div>
                <div class="stat-label">登録商品数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?= $db_status['tables']['ebay_listings'] ?? 0 ?></div>
                <div class="stat-label">総出品数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?= count($db_status['multi_country_products'] ?? []) ?></div>
                <div class="stat-label">多国展開商品</div>
            </div>
        </div>
        
        <!-- 多国籍データ取得セクション -->
        <div class="section">
            <h2><i class="fas fa-download"></i> 多国籍データ取得</h2>
            <p style="margin-bottom: 2rem; color: #64748b;">8ヶ国のeBayサイトから実際のデータを取得します（サンプルデータは一切使用されません）</p>
            
            <div class="form-group">
                <label class="form-label">検索キーワード:</label>
                <input type="text" id="search-term" class="form-input" placeholder="iphone, laptop, camera など" value="iphone">
            </div>
            
            <div class="form-group">
                <label class="form-label">対象国（複数選択可能）:</label>
                <div class="country-grid">
                    <div class="country-card selected" data-country="US">
                        <div class="country-flag">🇺🇸</div>
                        <div>アメリカ</div>
                    </div>
                    <div class="country-card selected" data-country="UK">
                        <div class="country-flag">🇬🇧</div>
                        <div>イギリス</div>
                    </div>
                    <div class="country-card selected" data-country="DE">
                        <div class="country-flag">🇩🇪</div>
                        <div>ドイツ</div>
                    </div>
                    <div class="country-card selected" data-country="AU">
                        <div class="country-flag">🇦🇺</div>
                        <div>オーストラリア</div>
                    </div>
                    <div class="country-card" data-country="CA">
                        <div class="country-flag">🇨🇦</div>
                        <div>カナダ</div>
                    </div>
                    <div class="country-card" data-country="FR">
                        <div class="country-flag">🇫🇷</div>
                        <div>フランス</div>
                    </div>
                    <div class="country-card" data-country="IT">
                        <div class="country-flag">🇮🇹</div>
                        <div>イタリア</div>
                    </div>
                    <div class="country-card" data-country="ES">
                        <div class="country-flag">🇪🇸</div>
                        <div>スペイン</div>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                <button id="fetch-btn" class="btn btn-primary">
                    <i class="fas fa-globe"></i> 多国籍データ取得開始
                </button>
                <button id="clear-btn" class="btn btn-warning">
                    <i class="fas fa-trash"></i> 全データクリア
                </button>
            </div>
            
            <div id="progress-section" style="display: none;">
                <div class="progress">
                    <div id="progress-bar" class="progress-bar"></div>
                </div>
                <div id="progress-text">準備中...</div>
            </div>
            
            <div id="result-section"></div>
        </div>
        
        <!-- 多国展開商品表示 -->
        <?php if (!empty($db_status['multi_country_products'])): ?>
        <div class="section">
            <h2><i class="fas fa-chart-line"></i> 多国展開商品一覧</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>商品名</th>
                        <th>展開国数</th>
                        <th>展開国</th>
                        <th>価格範囲</th>
                        <th>総ウォッチ数</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($db_status['multi_country_products'] as $product): ?>
                    <tr>
                        <td><code><?= htmlspecialchars($product['sku']) ?></code></td>
                        <td><?= htmlspecialchars(mb_substr($product['title'], 0, 50)) ?>...</td>
                        <td><strong><?= $product['countries_count'] ?></strong></td>
                        <td><?= htmlspecialchars($product['sites']) ?></td>
                        <td>$<?= number_format($product['min_price_usd'], 2) ?> - $<?= number_format($product['max_price_usd'], 2) ?></td>
                        <td><?= number_format($product['total_watchers']) ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>
    </div>
    
    <script>
        // 国選択機能
        document.querySelectorAll('.country-card').forEach(card => {
            card.addEventListener('click', () => {
                card.classList.toggle('selected');
            });
        });
        
        // 多国籍データ取得
        document.getElementById('fetch-btn').addEventListener('click', async () => {
            const searchTerm = document.getElementById('search-term').value.trim();
            const selectedCountries = Array.from(document.querySelectorAll('.country-card.selected')).map(card => card.dataset.country);
            
            if (!searchTerm) {
                alert('検索キーワードを入力してください');
                return;
            }
            
            if (selectedCountries.length === 0) {
                alert('少なくとも1つの国を選択してください');
                return;
            }
            
            const btn = document.getElementById('fetch-btn');
            const progressSection = document.getElementById('progress-section');
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 取得中...';
            progressSection.style.display = 'block';
            
            try {
                const response = await fetch('/modules/tanaoroshi_inline_complete/ebay_multi_country_real_api.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: `action=search_multi_country_real&search_term=${encodeURIComponent(searchTerm)}&countries=${selectedCountries.join(',')}`
                });
                
                const data = await response.json();
                
                if (data.success) {
                    progressBar.style.width = '100%';
                    progressText.textContent = `成功: ${data.total_products_found}件の商品を${data.successful_sites.length}ヶ国から取得`;
                    
                    // 結果表示
                    document.getElementById('result-section').innerHTML = `
                        <div class="alert alert-success">
                            <h4>✅ 多国籍データ取得完了</h4>
                            <p>検索語: ${searchTerm}</p>
                            <p>取得商品数: ${data.total_products_found}件</p>
                            <p>成功国: ${data.successful_sites.join(', ')}</p>
                            <p>多国展開商品: ${data.multi_country_products.length}件</p>
                        </div>
                    `;
                    
                    setTimeout(() => location.reload(), 3000);
                } else {
                    throw new Error(data.error || '取得に失敗しました');
                }
                
            } catch (error) {
                progressText.textContent = 'エラー: ' + error.message;
                document.getElementById('result-section').innerHTML = `
                    <div class="alert alert-error">
                        <h4>❌ 取得エラー</h4>
                        <p>${error.message}</p>
                    </div>
                `;
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-globe"></i> 多国籍データ取得開始';
            }
        });
        
        console.log('✅ 多国籍eBayデータ取得UI初期化完了');
        console.log('🌍 対象国数: 8ヶ国');
        console.log('🚫 サンプルデータ: 完全禁止');
        console.log('📊 データベース接続:', <?= $db_status['connected'] ? 'true' : 'false' ?>);
    </script>
</body>
</html>
