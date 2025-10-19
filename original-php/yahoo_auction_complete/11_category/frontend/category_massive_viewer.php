<?php
/**
 * eBayカテゴリー統合管理システム - シンプル版
 * 実テーブル構造対応・JSONBデータ抽出
 */

try {
    // データベース接続
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // ページング設定
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = 20;
    $offset = ($page - 1) * $limit;
    
    // 基本データ取得
    $sql = "
        SELECT 
            ysp.id,
            ysp.source_item_id,
            ysp.price_jpy,
            (ysp.price_jpy * 0.0067) AS price_usd,
            (ysp.scraped_yahoo_data->>'title') as title,
            (ysp.scraped_yahoo_data->>'category') as yahoo_category,
            (ysp.scraped_yahoo_data->>'seller') as seller,
            (ysp.scraped_yahoo_data->>'condition') as condition_info,
            (ysp.ebay_api_data->>'category_id') as ebay_category_id,
            (ysp.ebay_api_data->>'category_name') as ebay_category_name,
            COUNT(*) OVER() as total_count
        FROM yahoo_scraped_products ysp
        ORDER BY ysp.id DESC
        LIMIT ? OFFSET ?
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$limit, $offset]);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $totalCount = $products[0]['total_count'] ?? 0;
    
    // 統計取得
    $totalProducts = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products")->fetchColumn();
    $withTitle = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products WHERE scraped_yahoo_data->>'title' IS NOT NULL")->fetchColumn();
    $categorized = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products WHERE ebay_api_data->>'category_id' IS NOT NULL")->fetchColumn();
    
} catch (Exception $e) {
    $error = $e->getMessage();
    $products = [];
    $totalCount = 0;
    $totalProducts = 0;
    $withTitle = 0;
    $categorized = 0;
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBayカテゴリー統合管理システム - シンプル版</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.4;
        }
        
        .header {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 1.5rem 2rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .header h1 {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1rem;
        }
        
        .notification {
            padding: 1rem 2rem;
            margin: 1rem 0;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        
        .notification.success { background: #d1fae5; color: #065f46; border-left: 4px solid #10b981; }
        .notification.error { background: #fee2e2; color: #991b1b; border-left: 4px solid #ef4444; }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 2rem;
        }
        
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .stat-card-icon {
            font-size: 2rem;
            color: #3b82f6;
            margin-bottom: 0.5rem;
        }
        
        .stat-card-value {
            font-size: 1.8rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 0.25rem;
        }
        
        .stat-card-label {
            font-size: 0.9rem;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .controls {
            background: white;
            padding: 1.5rem 2rem;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }
        
        .search-input {
            min-width: 300px;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            font-size: 1rem;
        }
        
        .btn {
            padding: 0.75rem 1.5rem;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            background: white;
            color: #374151;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            text-decoration: none;
        }
        
        .btn:hover { background: #f9fafb; border-color: #3b82f6; }
        .btn-primary { background: #3b82f6; border-color: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; }
        
        .table-container {
            background: white;
            margin: 0 2rem 2rem;
            border-radius: 0.5rem;
            overflow: hidden;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        
        .table-wrapper {
            overflow-x: auto;
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .products-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }
        
        .products-table th {
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 0.75rem;
            text-align: left;
            font-weight: 600;
            color: #374151;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        .products-table td {
            border-bottom: 1px solid #f3f4f6;
            padding: 0.75rem;
            vertical-align: middle;
        }
        
        .products-table tr:hover {
            background: #f9fafb;
        }
        
        .product-title {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 0.25rem;
            max-width: 250px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .product-meta {
            font-size: 0.8rem;
            color: #6b7280;
        }
        
        .price-display {
            font-weight: 600;
            color: #059669;
        }
        
        .status-badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-weight: 600;
            font-size: 0.75rem;
            text-align: center;
        }
        
        .status-analyzed { background: #dcfce7; color: #166534; }
        .status-pending { background: #fef3c7; color: #92400e; }
        
        .pagination {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }
        
        .pagination-info {
            color: #6b7280;
            font-size: 0.875rem;
        }
        
        .pagination-controls {
            display: flex;
            gap: 0.5rem;
        }
        
        .page-btn {
            padding: 0.5rem 0.75rem;
            border: 1px solid #d1d5db;
            background: white;
            color: #374151;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        
        .page-btn:hover { background: #f9fafb; border-color: #3b82f6; }
        .page-btn.active { background: #3b82f6; border-color: #3b82f6; color: white; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        @media (max-width: 768px) {
            .controls { flex-direction: column; align-items: stretch; }
            .search-input { min-width: 100%; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .table-container { margin: 0 1rem 1rem; }
        }
    </style>
</head>
<body>
    <!-- ヘッダー -->
    <div class="header">
        <h1><i class="fas fa-database"></i> eBayカテゴリー統合管理システム</h1>
        <p>シンプル版 - JSONBデータ対応・リアルデータ表示</p>
    </div>

    <!-- 通知 -->
    <?php if (isset($error)): ?>
    <div class="notification error">
        <i class="fas fa-exclamation-triangle"></i>
        <div>データベースエラー: <?= htmlspecialchars($error) ?></div>
    </div>
    <?php else: ?>
    <div class="notification success">
        <i class="fas fa-check-circle"></i>
        <div>✅ システム正常動作中 - JSONBデータからリアル商品情報を表示</div>
    </div>
    <?php endif; ?>

    <!-- 統計カード -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-card-icon"><i class="fas fa-box"></i></div>
            <div class="stat-card-value"><?= number_format($totalProducts) ?></div>
            <div class="stat-card-label">総商品数</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon"><i class="fas fa-tag"></i></div>
            <div class="stat-card-value"><?= number_format($withTitle) ?></div>
            <div class="stat-card-label">タイトル有り</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon"><i class="fas fa-chart-line"></i></div>
            <div class="stat-card-value"><?= number_format($categorized) ?></div>
            <div class="stat-card-label">eBay分析済み</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon"><i class="fas fa-percent"></i></div>
            <div class="stat-card-value"><?= $totalProducts > 0 ? number_format(($categorized / $totalProducts) * 100, 1) : 0 ?>%</div>
            <div class="stat-card-label">分析完了率</div>
        </div>
    </div>

    <!-- コントロール -->
    <div class="controls">
        <div style="display: flex; gap: 1rem; align-items: center;">
            <input type="text" class="search-input" placeholder="商品タイトルで検索..." 
                   onkeyup="handleSearch(this.value)">
        </div>
        
        <div style="display: flex; gap: 1rem;">
            <button class="btn btn-primary" onclick="processYahooData()">
                <i class="fas fa-play"></i>
                未処理データ分析
            </button>
            <button class="btn" onclick="refreshData()">
                <i class="fas fa-sync-alt"></i>
                更新
            </button>
        </div>
    </div>

    <!-- 商品テーブル -->
    <div class="table-container">
        <div class="table-wrapper">
            <table class="products-table">
                <thead>
                    <tr>
                        <th style="width: 80px;">ID</th>
                        <th style="width: 300px;">商品情報</th>
                        <th style="width: 120px;">価格</th>
                        <th style="width: 150px;">Yahoo情報</th>
                        <th style="width: 200px;">eBay分析結果</th>
                        <th style="width: 100px;">状態</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (isset($error)): ?>
                    <tr>
                        <td colspan="6" style="text-align: center; color: #dc2626; padding: 2rem;">
                            <i class="fas fa-exclamation-triangle"></i>
                            エラー: <?= htmlspecialchars($error) ?>
                        </td>
                    </tr>
                    <?php elseif (empty($products)): ?>
                    <tr>
                        <td colspan="6" style="text-align: center; color: #6b7280; padding: 2rem;">
                            <i class="fas fa-info-circle"></i>
                            商品データを読み込み中...
                        </td>
                    </tr>
                    <?php else: ?>
                    <?php foreach ($products as $product): ?>
                    <tr>
                        <td>
                            <span style="font-family: monospace; color: #374151; font-weight: 600;">
                                <?= $product['id'] ?>
                            </span>
                        </td>
                        <td>
                            <div class="product-title" title="<?= htmlspecialchars($product['title'] ?? 'タイトルなし') ?>">
                                <?= htmlspecialchars(mb_substr($product['title'] ?? 'タイトルなし', 0, 40) . (mb_strlen($product['title'] ?? '') > 40 ? '...' : '')) ?>
                            </div>
                            <div class="product-meta">
                                ソースID: <?= htmlspecialchars($product['source_item_id'] ?? '-') ?>
                            </div>
                        </td>
                        <td>
                            <div class="price-display">
                                ¥<?= number_format($product['price_jpy'] ?? 0) ?>
                            </div>
                            <div style="font-size: 0.8rem; color: #6b7280;">
                                $<?= number_format($product['price_usd'] ?? 0, 2) ?>
                            </div>
                        </td>
                        <td>
                            <div style="font-size: 0.8rem; color: #374151; margin-bottom: 0.25rem;">
                                <strong>カテゴリー:</strong><br>
                                <?= htmlspecialchars($product['yahoo_category'] ?? '未分類') ?>
                            </div>
                            <div style="font-size: 0.8rem; color: #6b7280;">
                                販売者: <?= htmlspecialchars($product['seller'] ?? '不明') ?>
                            </div>
                        </td>
                        <td>
                            <?php if ($product['ebay_category_id']): ?>
                            <div style="font-size: 0.8rem; color: #374151; margin-bottom: 0.25rem;">
                                <strong>eBayカテゴリー:</strong><br>
                                <?= htmlspecialchars($product['ebay_category_name'] ?? 'Unknown') ?>
                            </div>
                            <div style="font-size: 0.8rem; color: #6b7280;">
                                ID: <?= htmlspecialchars($product['ebay_category_id']) ?>
                            </div>
                            <?php else: ?>
                            <div style="font-size: 0.8rem; color: #6b7280;">
                                未分析
                            </div>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($product['ebay_category_id']): ?>
                            <span class="status-badge status-analyzed">
                                <i class="fas fa-check"></i> 分析済み
                            </span>
                            <?php else: ?>
                            <span class="status-badge status-pending">
                                <i class="fas fa-clock"></i> 処理待ち
                            </span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        
        <!-- ページネーション -->
        <?php if ($totalCount > $limit): ?>
        <div class="pagination">
            <div class="pagination-info">
                <?php
                $start = $offset + 1;
                $end = min($offset + $limit, $totalCount);
                ?>
                <?= number_format($start) ?>-<?= number_format($end) ?>件 / 全<?= number_format($totalCount) ?>件表示
            </div>
            
            <div class="pagination-controls">
                <?php 
                $totalPages = ceil($totalCount / $limit);
                $prevPage = max(1, $page - 1);
                $nextPage = min($totalPages, $page + 1);
                ?>
                
                <button class="page-btn" onclick="goToPage(1)" <?= $page <= 1 ? 'disabled' : '' ?>>
                    <i class="fas fa-angle-double-left"></i>
                </button>
                
                <button class="page-btn" onclick="goToPage(<?= $prevPage ?>)" <?= $page <= 1 ? 'disabled' : '' ?>>
                    <i class="fas fa-angle-left"></i>
                </button>
                
                <?php for ($i = max(1, $page - 2); $i <= min($totalPages, $page + 2); $i++): ?>
                <button class="page-btn <?= $i == $page ? 'active' : '' ?>" onclick="goToPage(<?= $i ?>)">
                    <?= $i ?>
                </button>
                <?php endfor; ?>
                
                <button class="page-btn" onclick="goToPage(<?= $nextPage ?>)" <?= $page >= $totalPages ? 'disabled' : '' ?>>
                    <i class="fas fa-angle-right"></i>
                </button>
                
                <button class="page-btn" onclick="goToPage(<?= $totalPages ?>)" <?= $page >= $totalPages ? 'disabled' : '' ?>>
                    <i class="fas fa-angle-double-right"></i>
                </button>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <script>
        function handleSearch(query) {
            // 検索機能は準備中
            console.log('検索クエリ:', query);
        }
        
        function goToPage(page) {
            const url = new URL(window.location);
            url.searchParams.set('page', page);
            window.location = url.toString();
        }
        
        function processYahooData() {
            if (confirm('Yahoo商品データの分析処理を開始しますか？\nJSONBデータから情報を抽出して、eBayカテゴリーを判定します。')) {
                alert('分析機能は準備中です。\n✅ JSONBデータの読み取りは正常に動作しています。');
            }
        }
        
        function refreshData() {
            window.location.reload();
        }
        
        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ eBayカテゴリー統合管理システム（シンプル版）初期化完了');
            console.log('📊 商品データ:', <?= json_encode(count($products)) ?>);
            console.log('📊 分析済み:', <?= json_encode($categorized) ?>);
        });
    </script>
</body>
</html>