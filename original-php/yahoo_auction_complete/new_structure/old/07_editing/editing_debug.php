<?php
/**
 * クイックデバッグ機能付きediting.php
 * 既存機能にデバッグ情報を追加
 */

// デバッグモード（URLパラメータ debug=1 で有効化）
$debug_mode = isset($_GET['debug']) && $_GET['debug'] == '1';

if ($debug_mode) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    echo "<h2>🔍 デバッグモード有効</h2>";
}

// データベース接続
try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres";
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    if ($debug_mode) {
        echo "<div style='background:#d4edda; padding:10px; margin:10px; border-radius:5px;'>✅ データベース接続: 成功</div>";
    }
    
} catch (PDOException $e) {
    if ($debug_mode) {
        echo "<div style='background:#f8d7da; padding:10px; margin:10px; border-radius:5px;'>❌ データベース接続: 失敗<br>" . $e->getMessage() . "</div>";
    }
    die('データベース接続エラー');
}

// デバッグ情報表示
if ($debug_mode) {
    echo "<div style='background:#fff3cd; padding:15px; margin:10px; border-radius:5px;'>";
    echo "<h3>📊 システム診断結果</h3>";
    
    // テーブル存在確認
    try {
        $check_table = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products");
        $total_count = $check_table->fetchColumn();
        echo "<p>✅ yahoo_scraped_products テーブル: 存在 ({$total_count}件)</p>";
        
        // 未出品データ確認
        $unlisted = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products WHERE (ebay_item_id IS NULL OR ebay_item_id = '')");
        $unlisted_count = $unlisted->fetchColumn();
        echo "<p>📋 未出品データ: {$unlisted_count}件</p>";
        
        // サンプルデータ
        if ($total_count > 0) {
            $sample = $pdo->query("SELECT id, source_item_id, active_title FROM yahoo_scraped_products LIMIT 3")->fetchAll();
            echo "<p>📄 サンプルデータ:</p><ul>";
            foreach ($sample as $row) {
                echo "<li>ID:{$row['id']} - {$row['source_item_id']} - " . substr($row['active_title'], 0, 30) . "...</li>";
            }
            echo "</ul>";
        }
        
    } catch (Exception $e) {
        echo "<p>❌ テーブルチェックエラー: " . $e->getMessage() . "</p>";
    }
    
    echo "</div>";
}

// API処理
if (isset($_GET['action'])) {
    // エラー出力を完全に抑制
    error_reporting(0);
    ini_set('display_errors', 0);
    
    // 出力バッファリングをクリア
    while (ob_get_level()) {
        ob_end_clean();
    }
    ob_start();
    
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    try {
        switch ($_GET['action']) {
            case 'get_scraped_products':
                $page = intval($_GET['page'] ?? 1);
                $limit = intval($_GET['limit'] ?? 20);
                $offset = ($page - 1) * $limit;
                
                if ($debug_mode) {
                    error_log("Debug: get_scraped_products called with page={$page}, limit={$limit}");
                }
                
                // データ取得クエリ（eBayカテゴリー列を含む・エラー対応版）
                $sql = "SELECT 
                            id,
                            source_item_id as item_id,
                            COALESCE(active_title, 'タイトルなし') as title,
                            price_jpy as price,
                            COALESCE(cached_price_usd, ROUND(price_jpy / 150.0, 2)) as current_price,
                            COALESCE((scraped_yahoo_data->>'category')::text, category, 'N/A') as category_name,
                            COALESCE((scraped_yahoo_data->>'condition')::text, condition_name, 'N/A') as condition_name,
                            COALESCE(active_image_url, 'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image') as picture_url,
                            (scraped_yahoo_data->>'url')::text as source_url,
                            updated_at,
                            CASE 
                                WHEN (scraped_yahoo_data->>'url')::text LIKE '%auctions.yahoo.co.jp%' THEN 'ヤフオク'
                                WHEN (scraped_yahoo_data->>'url')::text LIKE '%yahoo.co.jp%' THEN 'Yahoo'
                                ELSE 'Unknown'
                            END as platform,
                            sku as master_sku,
                            CASE 
                                WHEN ebay_item_id IS NULL OR ebay_item_id = '' THEN 'not_listed'
                                ELSE 'listed'
                            END as listing_status";
                
                // eBayカテゴリーカラムの存在確認
                try {
                    $column_check = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' AND column_name IN ('ebay_category_id', 'ebay_category_path', 'category_confidence')");
                    $existing_columns = $column_check->fetchAll(PDO::FETCH_COLUMN);
                    
                    if (in_array('ebay_category_id', $existing_columns)) {
                        $sql .= ",
                            -- eBayカテゴリー判定結果
                            ebay_category_id,
                            COALESCE(ebay_category_path, 'カテゴリー未判定') as ebay_category_path,
                            COALESCE(category_confidence, 0) as category_confidence";
                    } else {
                        $sql .= ",
                            -- eBayカテゴリー判定結果（デフォルト値）
                            NULL as ebay_category_id,
                            'カテゴリー未判定' as ebay_category_path,
                            0 as category_confidence";
                    }
                } catch (Exception $e) {
                    // カラム確認エラーの場合はデフォルト値を使用
                    $sql .= ",
                        -- eBayカテゴリー判定結果（フォールバック）
                        NULL as ebay_category_id,
                        'カテゴリー未判定' as ebay_category_path,
                        0 as category_confidence";
                }
                
                $sql .= "
                        FROM yahoo_scraped_products 
                        WHERE (ebay_item_id IS NULL OR ebay_item_id = '')
                        ORDER BY updated_at DESC, id DESC 
                        LIMIT ? OFFSET ?";
                
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$limit, $offset]);
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // 総件数取得
                $countStmt = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products WHERE (ebay_item_id IS NULL OR ebay_item_id = '')");
                $total = $countStmt->fetchColumn();
                
                // クリーンなJSON出力
                while (ob_get_level()) {
                    ob_end_clean();
                }
                ob_start();
                
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'data' => $data,
                        'total' => intval($total),
                        'page' => $page,
                        'limit' => $limit,
                        'note' => "未出品データ取得成功 ({$total}件中{$limit}件表示)"
                    ]
                ], JSON_UNESCAPED_UNICODE);
                
                ob_end_flush();
                exit;
                
            case 'get_all_products':
                // 全データ表示（出品済み含む）
                $page = intval($_GET['page'] ?? 1);
                $limit = intval($_GET['limit'] ?? 20);
                $offset = ($page - 1) * $limit;
                
                // 全データクエリ（eBayカテゴリー列を含む・エラー対応版）
                $sql = "SELECT 
                            id,
                            source_item_id as item_id,
                            COALESCE(active_title, 'タイトルなし') as title,
                            price_jpy as price,
                            COALESCE(cached_price_usd, ROUND(price_jpy / 150.0, 2)) as current_price,
                            COALESCE((scraped_yahoo_data->>'category')::text, category, 'N/A') as category_name,
                            COALESCE((scraped_yahoo_data->>'condition')::text, condition_name, 'N/A') as condition_name,
                            COALESCE(active_image_url, 'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image') as picture_url,
                            (scraped_yahoo_data->>'url')::text as source_url,
                            updated_at,
                            CASE 
                                WHEN (scraped_yahoo_data->>'url')::text LIKE '%auctions.yahoo.co.jp%' THEN 'ヤフオク'
                                WHEN (scraped_yahoo_data->>'url')::text LIKE '%yahoo.co.jp%' THEN 'Yahoo'
                                ELSE 'Unknown'
                            END as platform,
                            sku as master_sku,
                            CASE 
                                WHEN ebay_item_id IS NULL OR ebay_item_id = '' THEN 'not_listed'
                                ELSE 'listed'
                            END as listing_status";
                
                // eBayカテゴリーカラムの存在確認
                try {
                    $column_check = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' AND column_name IN ('ebay_category_id', 'ebay_category_path', 'category_confidence')");
                    $existing_columns = $column_check->fetchAll(PDO::FETCH_COLUMN);
                    
                    if (in_array('ebay_category_id', $existing_columns)) {
                        $sql .= ",
                            -- eBayカテゴリー判定結果
                            ebay_category_id,
                            COALESCE(ebay_category_path, 'カテゴリー未判定') as ebay_category_path,
                            COALESCE(category_confidence, 0) as category_confidence";
                    } else {
                        $sql .= ",
                            -- eBayカテゴリー判定結果（デフォルト値）
                            NULL as ebay_category_id,
                            'カテゴリー未判定' as ebay_category_path,
                            0 as category_confidence";
                    }
                } catch (Exception $e) {
                    // カラム確認エラーの場合はデフォルト値を使用
                    $sql .= ",
                        -- eBayカテゴリー判定結果（フォールバック）
                        NULL as ebay_category_id,
                        'カテゴリー未判定' as ebay_category_path,
                        0 as category_confidence";
                }
                
                $sql .= "
                        FROM yahoo_scraped_products 
                        ORDER BY updated_at DESC, id DESC 
                        LIMIT ? OFFSET ?";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$limit, $offset]);
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // 総件数取得
                $countStmt = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products");
                $total = $countStmt->fetchColumn();
                
                // クリーンなJSON出力
                while (ob_get_level()) {
                    ob_end_clean();
                }
                ob_start();
                
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'data' => $data,
                        'total' => intval($total),
                        'page' => $page,
                        'limit' => $limit,
                        'note' => "全データ取得成功 ({$total}件中{$limit}件表示) - 出品済み含む"
                    ]
                ], JSON_UNESCAPED_UNICODE);
                
                ob_end_flush();
                exit;
                
            default:
                // クリーンなJSON出力
                while (ob_get_level()) {
                    ob_end_clean();
                }
                ob_start();
                
                echo json_encode(['success' => false, 'message' => 'Unknown action'], JSON_UNESCAPED_UNICODE);
                
                ob_end_flush();
                exit;
        }
        
    } catch (Exception $e) {
        // エラーレスポンスをクリーンにJSON出力
        while (ob_get_level()) {
            ob_end_clean();
        }
        ob_start();
        
        echo json_encode([
            'success' => false,
            'message' => 'API処理エラー: ' . $e->getMessage(),
            'error_type' => 'api_exception',
            'debug_info' => $debug_mode ? [
                'action' => $_GET['action'] ?? 'none',
                'parameters' => $_GET,
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ] : null
        ], JSON_UNESCAPED_UNICODE);
        
        ob_end_flush();
        exit;
    }
}

// HTML出力開始
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction データ編集システム<?= $debug_mode ? ' - デバッグモード' : '' ?></title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root {
            --primary-color: #725CAD;
            --secondary-color: #9D8DF1;
            --success-color: #28a745;
            --warning-color: #ffc107;
            --danger-color: #dc3545;
            --info-color: #17a2b8;
            --bg-primary: #f8f9fa;
            --bg-secondary: #ffffff;
            --text-primary: #2c3e50;
            --text-muted: #6c757d;
            --border-color: #dee2e6;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            margin: 0;
            padding: 0;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .dashboard-header {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .dashboard-header h1 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 600;
        }

        .dashboard-header p {
            margin: 5px 0 0 0;
            opacity: 0.9;
        }

        .actions-panel {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .btn {
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .btn-primary { background: var(--primary-color); color: white; }
        .btn-success { background: var(--success-color); color: white; }
        .btn-warning { background: var(--warning-color); color: white; }
        .btn-danger { background: var(--danger-color); color: white; }
        .btn-info { background: var(--info-color); color: white; }

        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .data-table {
            background: var(--bg-secondary);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
            font-size: 0.875rem;
        }

        th {
            background: var(--bg-primary);
            font-weight: 600;
            color: var(--text-primary);
        }

        .log-container {
            background: var(--bg-secondary);
            border-radius: 8px;
            padding: 15px;
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid var(--border-color);
        }

        .log-entry {
            padding: 5px 0;
            font-size: 0.8rem;
            font-family: 'Courier New', monospace;
        }

        .log-entry.info { color: var(--info-color); }
        .log-entry.success { color: var(--success-color); }
        .log-entry.warning { color: var(--warning-color); }
        .log-entry.error { color: var(--danger-color); }

        .debug-banner {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <?php if ($debug_mode): ?>
            <div class="debug-banner">
                <i class="fas fa-bug"></i> <strong>デバッグモード有効</strong> - 詳細情報が表示されています
                <a href="?" style="margin-left: 15px;">通常モードに戻る</a>
            </div>
        <?php endif; ?>

        <div class="dashboard-header">
            <h1><i class="fas fa-edit"></i> Yahoo Auction データ編集システム</h1>
            <p>スクレイピング済み商品データの編集・管理・eBayカテゴリー判定</p>
        </div>

        <div class="actions-panel">
            <button class="btn btn-primary" onclick="loadEditingData()">
                <i class="fas fa-download"></i> 未出品データ表示
            </button>
            <button class="btn btn-info" onclick="loadAllData()">
                <i class="fas fa-list"></i> 全データ表示
            </button>
            <button class="btn btn-warning" onclick="downloadEditingCSV()">
                <i class="fas fa-file-csv"></i> CSV出力
            </button>
            <button class="btn btn-danger" onclick="showDeleteAllDialog()">
                <i class="fas fa-trash-alt"></i> 全データ削除
            </button>
            <?php if (!$debug_mode): ?>
                <a href="?debug=1" class="btn btn-info">
                    <i class="fas fa-bug"></i> デバッグモード
                </a>
            <?php endif; ?>
        </div>

        <!-- 一括操作パネル -->
        <div id="bulkActionsPanel" style="display: none; margin-bottom: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                <span><strong><span id="selectedCount">0</span> 件選択中</strong></span>
                <button class="btn btn-warning" onclick="openBatchCategoryTool()" title="選択商品の一括カテゴリー判定">
                <i class="fas fa-tags"></i> 一括カテゴリー判定
                </button>
                    <button class="btn btn-info" onclick="openCategorySystemTool()" title="eBayカテゴリー管理システム">
                        <i class="fas fa-cogs"></i> カテゴリーシステム
                    </button>
                <button class="btn btn-danger" onclick="deleteSelectedProducts()" title="選択商品を削除">
                    <i class="fas fa-trash"></i> 選択削除
                </button>
                <button class="btn btn-secondary" onclick="clearSelection()" title="選択解除">
                    <i class="fas fa-times"></i> 選択解除
                </button>
            </div>
        </div>

        <div class="data-table">
            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;">
                            <input type="checkbox" id="selectAll" onchange="toggleSelectAll()" title="全選択">
                        </th>
                        <th style="width: 80px;">画像</th>
                        <th style="width: 120px;">Item ID</th>
                        <th>タイトル</th>
                        <th style="width: 100px;">価格</th>
                        <th style="width: 120px;">カテゴリ</th>
                        <th style="width: 150px;">eBayカテゴリ</th>
                        <th style="width: 100px;">状態</th>
                        <th style="width: 80px;">ソース</th>
                        <th style="width: 100px;">更新日</th>
                        <th style="width: 120px;">操作</th>
                    </tr>
                </thead>
                <tbody id="editingTableBody">
                    <tr>
                        <td colspan="11" style="text-align: center; padding: 40px;">
                            <i class="fas fa-info-circle" style="font-size: 2rem; color: var(--info-color); margin-bottom: 10px;"></i><br>
                            <strong>「未出品データ表示」ボタンをクリックしてデータを読み込んでください</strong>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="log-container" id="logContainer">
            <div class="log-entry info">[システム] Yahoo Auction データ編集システム起動完了</div>
        </div>
    </div>

    <!-- JavaScript読み込み -->
    <script src="editing.js"></script>
    <script src="delete_functions.js"></script>
    <script src="ebay_category_display.js"></script>
    <script src="hybrid_price_display.js"></script>

    <script>
        // CSRF トークン設定
        window.CSRF_TOKEN = "";
        
        // eBayカテゴリーシステム統合関数
        function openCategorySystemTool() {
            const categoryToolUrl = '../06_ebay_category_system/frontend/ebay_category_tool.php';
            window.open(categoryToolUrl, '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
            showNotification('🚀 eBayカテゴリー管理システムを開きました', 'info');
        }
        
        // 一括カテゴリー判定関数を修正
        function openBatchCategoryTool() {
            // selectedItemsが定義されていない場合のフォールバック
            if (typeof selectedItems === 'undefined') {
                selectedItems = [];
            }
            
            if (!selectedItems || selectedItems.length === 0) {
                showNotification('カテゴリー判定を行う商品を選択してください', 'warning');
                return;
            }
            
            const categoryToolUrl = '../06_ebay_category_system/frontend/ebay_category_tool.php';
            const itemIds = selectedItems.join(',');
            const url = `${categoryToolUrl}?item_ids=${encodeURIComponent(itemIds)}&mode=batch&source=editing`;
            
            // 新しいタブで開く
            window.open(url, '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
            
            showNotification(`選択した ${selectedItems.length} 件の商品の一括カテゴリー判定ツールを開きました`, 'info');
        }
        
        // 通知表示関数
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
                color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : '#0c5460'};
                border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : type === 'warning' ? '#ffeaa7' : '#bee5eb'};
                border-radius: 6px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 10000;
                max-width: 400px;
                font-size: 0.875rem;
            `;
            notification.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                ${message}
            `;
            
            document.body.appendChild(notification);
            
            // 5秒後に自動削除
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);
        }
        
        // デバッグモードでの追加情報
        <?php if ($debug_mode): ?>
        console.log('🔍 デバッグモード有効');
        console.log('データベース接続: 成功');
        <?php endif; ?>
    </script>
</body>
</html>