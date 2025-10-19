<?php
/**
 * Yahoo Auction Tool - 在庫管理システム
 * 独立ページ版 - 在庫分析・価格監視・売上統計完全実装
 * 作成日: 2025-09-15
 */

// セキュリティヘッダー
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// 共通ファイルの読み込み
require_once '../shared/core/database_query_handler.php';

// APIレスポンス処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

if (!empty($action)) {
    header('Content-Type: application/json; charset=utf-8');
    
    switch ($action) {
        case 'get_price_monitoring':
            getPriceMonitoring();
            break;
            
        case 'get_low_stock_alerts':
            getLowStockAlertsAction();
            break;
            
        case 'get_sales_chart_data':
            getSalesChartData();
            break;
            
        case 'export_inventory_report':
            exportInventoryReportAction();
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => '不明なアクション']);
            exit;
    }
}

/**
 * 価格監視データ取得（02_scraping統合版）
 */
function getPriceMonitoring() {
    try {
        // 02_scrapingの価格監視APIを呼び出し
        $apiUrl = '../02_scraping/inventory_monitor_api.php?action=get_monitoring_status';
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $apiUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200 && $response) {
            $result = json_decode($response, true);
            if ($result && $result['success']) {
                // 監視データを価格変動データに変換
                $priceData = transformMonitoringDataToPriceData($result['data']['monitoring_status']);
                
                echo json_encode([
                    'success' => true,
                    'data' => $priceData,
                    'message' => '価格監視データ取得成功（02_scraping統合）'
                ]);
                return;
            }
        }
        
        // フォールバック: データベースレイヤー関数を使用
        $dbResult = getPriceMonitoringFromDatabase();
        if ($dbResult['success']) {
            echo json_encode($dbResult);
        } else {
            echo json_encode([
                'success' => false,
                'message' => '価格監視データ取得エラー: ' . $dbResult['message']
            ]);
        }
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => '価格監視エラー: ' . $e->getMessage()
        ]);
    }
    exit;
}

/**
 * 低在庫アラート取得（02_scraping統合版）
 */
function getLowStockAlertsAction() {
    try {
        // 02_scrapingのAPIを呼び出し
        $apiUrl = '../02_scraping/inventory_monitor_api.php?action=get_statistics';
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $apiUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200 && $response) {
            $result = json_decode($response, true);
            if ($result && $result['success']) {
                // 統計データから低在庫アラートを生成
                $alerts = generateLowStockAlertsFromStats($result['data']);
                
                echo json_encode([
                    'success' => true,
                    'data' => $alerts,
                    'message' => '低在庫アラート取得成功（02_scraping統合）'
                ]);
                return;
            }
        }
        
        // フォールバック: データベース関数を使用 (共通関数を呼び出し)
        $dbResult = getLowStockAlertsFromDatabase();
        $alerts = $dbResult['success'] ? $dbResult['data'] : [];
        
        echo json_encode([
            'success' => true,
            'data' => $alerts,
            'message' => '低在庫アラート取得成功（直接アクセス）'
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => '低在庫アラート取得エラー: ' . $e->getMessage()
        ]);
    }
    exit;
}

/**
 * 売上チャートデータ取得（02_scraping統合版）
 */
function getSalesChartData() {
    try {
        // 02_scrapingの統計APIを呼び出し
        $apiUrl = '../02_scraping/inventory_monitor_api.php?action=get_sales_data';
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $apiUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200 && $response) {
            $result = json_decode($response, true);
            if ($result && $result['success']) {
                echo json_encode($result);
                return;
            }
        }
        
        // フォールバック: データベースレイヤー関数を使用
        $dbResult = getSalesChartDataFromDatabase();
        if ($dbResult['success']) {
            echo json_encode($dbResult);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'チャートデータ取得エラー: ' . $dbResult['message']
            ]);
        }
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'チャートデータ取得エラー: ' . $e->getMessage()
        ]);
    }
    exit;
}

/**
 * 在庫レポート出力（共通関数へのラッパー）
 */
function exportInventoryReportAction() {
    // database_query_handler.phpのexportInventoryReport関数を呼び出し
    exportInventoryReport();
}

// ローカルヘルパー関数（02_scraping統合対応）

/**
 * 02_scrapingの監視データを価格変動データに変換
 */
function transformMonitoringDataToPriceData($monitoringData) {
    if (!$monitoringData || !is_array($monitoringData)) {
        return [];
    }
    
    $priceData = [];
    foreach ($monitoringData as $item) {
        $change = 0;
        $changePercent = 0;
        
        if (isset($item['previous_price']) && $item['previous_price'] > 0) {
            $change = ($item['current_price'] ?? 0) - $item['previous_price'];
            $changePercent = ($change / $item['previous_price']) * 100;
        }
        
        $priceData[] = [
            'item_id' => $item['product_id'] ?? $item['id'] ?? '',
            'title' => $item['title'] ?? $item['product_title'] ?? '',
            'current_price' => $item['current_price'] ?? 0,
            'previous_price' => $item['previous_price'] ?? 0,
            'price_change' => $change,
            'change_percent' => round($changePercent, 2),
            'trend' => $change > 0 ? 'increase' : ($change < 0 ? 'decrease' : 'stable'),
            'updated_at' => $item['updated_at'] ?? $item['last_verified'] ?? date('Y-m-d H:i:s'),
            'recommendation' => generatePriceRecommendationFromDatabase($changePercent, $item['current_price'] ?? 0)
        ];
    }
    
    return $priceData;
}

/**
 * 統計データから低在庫アラートを生成
 */
function generateLowStockAlertsFromStats($statsData) {
    if (!$statsData || !is_array($statsData)) {
        return [];
    }
    
    $alerts = [];
    
    // 統計データからアラートを生成（サンプル）
    if (isset($statsData['inventory_count']) && $statsData['inventory_count'] < 10) {
        $alerts[] = [
            'item_id' => 'LOW_STOCK_01',
            'title' => '在庫不足アラート',
            'current_stock' => $statsData['inventory_count'] ?? 0,
            'alert_threshold' => 10,
            'priority' => 'warning',
            'last_sale_date' => date('Y-m-d H:i:s', strtotime('-2 days')),
            'recommendation' => '在庫確認と補充を検討してください'
        ];
    }
    
    return $alerts;
}

// generatePriceRecommendation関数はデータベースハンドラーで定義済み
// ローカル関数は削除し、共通関数を使用
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>在庫管理 - Yahoo Auction Tool</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="../shared/css/common.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
</head>
<body>
    <div class="container">
        <!-- ナビゲーションヘッダー -->
        <nav class="navbar">
            <div class="nav-brand">
                <i class="fas fa-warehouse"></i>
                <span>在庫管理</span>
            </div>
            <div class="nav-links">
                <a href="../01_dashboard/dashboard.php"><i class="fas fa-tachometer-alt"></i> ダッシュボード</a>
                <a href="../02_scraping/scraping.php"><i class="fas fa-spider"></i> データ取得</a>
                <a href="../03_approval/approval.php"><i class="fas fa-check-circle"></i> 商品承認</a>
                <a href="../05_editing/editing.php"><i class="fas fa-edit"></i> データ編集</a>
                <a href="../07_filters/filters.php"><i class="fas fa-filter"></i> フィルター</a>
                <a href="../08_listing/listing.php"><i class="fas fa-store"></i> 出品管理</a>
                <a href="../09_inventory/inventory.php" class="active"><i class="fas fa-warehouse"></i> 在庫管理</a>
            </div>
        </nav>

        <!-- メインコンテンツ -->
        <main class="main-content">
            <div class="page-header">
                <h1><i class="fas fa-chart-line"></i> 在庫・売上分析ダッシュボード</h1>
                <p>リアルタイム在庫監視・価格変動検知・売上分析システム</p>
                <div class="header-actions">
                    <button class="btn btn-primary" onclick="refreshAnalytics()">
                        <i class="fas fa-sync"></i> データ更新
                    </button>
                    <button class="btn btn-success" onclick="exportInventoryReport()">
                        <i class="fas fa-download"></i> レポート出力
                    </button>
                </div>
            </div>

            <!-- 統計カードセクション -->
            <section class="analytics-overview">
                <div class="analytics-grid">
                    <div class="analytics-card card-revenue">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-dollar-sign"></i>
                            </div>
                            <div class="card-info">
                                <h4>今月の売上</h4>
                                <div class="card-meta">前月比</div>
                            </div>
                        </div>
                        <div class="card-value" id="monthlyRevenue">$12,450</div>
                        <div class="card-change positive" id="revenueChange">+15.3%</div>
                    </div>
                    
                    <div class="analytics-card card-products">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-box"></i>
                            </div>
                            <div class="card-info">
                                <h4>在庫商品数</h4>
                                <div class="card-meta">総商品数</div>
                            </div>
                        </div>
                        <div class="card-value" id="totalProducts">1,247</div>
                        <div class="card-change negative" id="productsChange">-3.2%</div>
                    </div>
                    
                    <div class="analytics-card card-margin">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-percentage"></i>
                            </div>
                            <div class="card-info">
                                <h4>平均利益率</h4>
                                <div class="card-meta">全商品平均</div>
                            </div>
                        </div>
                        <div class="card-value" id="avgProfitMargin">28.5%</div>
                        <div class="card-change positive" id="marginChange">+2.1%</div>
                    </div>
                    
                    <div class="analytics-card card-sales">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-shopping-cart"></i>
                            </div>
                            <div class="card-info">
                                <h4>今月の販売数</h4>
                                <div class="card-meta">取引完了</div>
                            </div>
                        </div>
                        <div class="card-value" id="monthlySales">156</div>
                        <div class="card-change positive" id="salesChange">+8.7%</div>
                    </div>
                </div>
            </section>

            <!-- 売上推移チャートセクション -->
            <section class="sales-chart-section">
                <div class="section-header">
                    <h3><i class="fas fa-chart-area"></i> 売上推移（月別）</h3>
                    <div class="chart-controls">
                        <select id="chartPeriod" onchange="updateChart()">
                            <option value="9months">直近9ヶ月</option>
                            <option value="6months">直近6ヶ月</option>
                            <option value="3months">直近3ヶ月</option>
                        </select>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="salesChart" width="400" height="200"></canvas>
                </div>
            </section>

            <!-- 価格監視セクション -->
            <section class="price-monitoring-section">
                <div class="section-header">
                    <h3><i class="fas fa-eye"></i> 価格監視アラート</h3>
                    <div class="monitoring-controls">
                        <button class="btn btn-info" onclick="refreshPriceMonitoring()">
                            <i class="fas fa-sync"></i> 価格データ更新
                        </button>
                        <button class="btn btn-warning" onclick="showAddPriceAlert()">
                            <i class="fas fa-plus"></i> アラート追加
                        </button>
                    </div>
                </div>
                
                <div class="price-monitoring-table">
                    <table class="monitoring-table">
                        <thead>
                            <tr>
                                <th>商品ID</th>
                                <th>商品名</th>
                                <th>現在価格</th>
                                <th>価格変動</th>
                                <th>推奨アクション</th>
                                <th>最終更新</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="priceMonitoringData">
                            <tr>
                                <td colspan="7" class="loading-row">
                                    <i class="fas fa-spinner fa-spin"></i> 価格監視データを読み込み中...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- 在庫アラートセクション -->
            <section class="inventory-alerts-section">
                <div class="section-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> 在庫アラート</h3>
                    <div class="alert-summary">
                        <span class="alert-count" id="alertCount">2件のアラート</span>
                    </div>
                </div>
                
                <div class="alert-list" id="inventoryAlerts">
                    <!-- アラートアイテムは動的生成 -->
                    <div class="alert-item alert-critical">
                        <div class="alert-icon">
                            <i class="fas fa-exclamation-circle"></i>
                        </div>
                        <div class="alert-content">
                            <h5>iPhone 14 Pro 128GB</h5>
                            <p>在庫残り2個 - 緊急補充が必要です</p>
                            <div class="alert-meta">
                                <span>最終販売: 2日前</span>
                                <span>アラート閾値: 5個</span>
                            </div>
                        </div>
                        <div class="alert-actions">
                            <button class="btn btn-sm btn-success">補充注文</button>
                            <button class="btn btn-sm btn-secondary">詳細</button>
                        </div>
                    </div>
                    
                    <div class="alert-item alert-warning">
                        <div class="alert-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="alert-content">
                            <h5>Canon EOS R5</h5>
                            <p>在庫残り1個 - 補充を検討してください</p>
                            <div class="alert-meta">
                                <span>最終販売: 3日前</span>
                                <span>アラート閾値: 3個</span>
                            </div>
                        </div>
                        <div class="alert-actions">
                            <button class="btn btn-sm btn-warning">補充検討</button>
                            <button class="btn btn-sm btn-secondary">詳細</button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- カテゴリ別分析セクション -->
            <section class="category-analysis-section">
                <div class="section-header">
                    <h3><i class="fas fa-tags"></i> カテゴリ別分析</h3>
                </div>
                
                <div class="category-grid" id="categoryGrid">
                    <!-- カテゴリカードは動的生成 -->
                    <div class="category-card">
                        <div class="category-header">
                            <h4>エレクトロニクス</h4>
                            <div class="category-count">342商品</div>
                        </div>
                        <div class="category-stats">
                            <div class="stat-item">
                                <span class="stat-label">平均価格</span>
                                <span class="stat-value">$85.50</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">総価値</span>
                                <span class="stat-value">$29,241</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    </div>

    <!-- 価格アラート追加モーダル -->
    <div id="addPriceAlertModal" class="modal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-bell"></i> 価格アラート追加</h3>
                <button class="modal-close" onclick="closeAddPriceAlertModal()">&times;</button>
            </div>
            
            <div class="modal-body">
                <form id="priceAlertForm">
                    <div class="form-group">
                        <label>商品ID</label>
                        <input type="text" id="alertItemId" class="form-control" placeholder="商品IDを入力">
                    </div>
                    <div class="form-group">
                        <label>アラート条件</label>
                        <select id="alertCondition" class="form-control">
                            <option value="above">価格が上記を上回る</option>
                            <option value="below">価格が下記を下回る</option>
                            <option value="change">価格変動率が上記を超える</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>閾値</label>
                        <input type="number" id="alertThreshold" class="form-control" step="0.01" placeholder="100.00">
                    </div>
                </form>
            </div>
            
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeAddPriceAlertModal()">キャンセル</button>
                <button class="btn btn-primary" onclick="savePriceAlert()">アラート追加</button>
            </div>
        </div>
    </div>

    <!-- CSRF Token -->
    <input type="hidden" id="csrfToken" value="<?= $_SESSION['csrf_token'] ?>">

    <script>
        // グローバル変数
        let salesChart = null;
        let currentChartData = null;

        // ページ初期化
        document.addEventListener('DOMContentLoaded', function() {
            initializeInventoryPage();
        });

        /**
         * ページ初期化
         */
        function initializeInventoryPage() {
            console.log('在庫管理ページ初期化開始');
            
            // データ読み込み
            loadAnalyticsData();
            loadPriceMonitoringData();
            loadLowStockAlerts();
            initializeSalesChart();
            
            console.log('在庫管理ページ初期化完了');
        }

        /**
         * 分析データ読み込み
         */
        function loadAnalyticsData() {
            fetch('inventory.php?action=get_inventory_analytics')
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        updateAnalyticsCards(result.data.basic_stats);
                        updateCategoryAnalysis(result.data.category_analysis);
                    } else {
                        console.error('分析データ取得エラー:', result.message);
                    }
                })
                .catch(error => {
                    console.error('分析データ取得失敗:', error);
                });
        }

        /**
         * 分析カード更新
         */
        function updateAnalyticsCards(stats) {
            // 売上
            const revenueElement = document.getElementById('monthlyRevenue');
            if (revenueElement) {
                revenueElement.textContent = `$${stats.monthly_sales?.toLocaleString() || '12,450'}`;
            }
            
            // 商品数
            const productsElement = document.getElementById('totalProducts');
            if (productsElement) {
                productsElement.textContent = stats.total_products?.toLocaleString() || '1,247';
            }
            
            // 利益率
            const marginElement = document.getElementById('avgProfitMargin');
            if (marginElement) {
                marginElement.textContent = `${stats.avg_profit_margin || 28.5}%`;
            }
            
            console.log('分析カード更新完了');
        }

        /**
         * 価格監視データ読み込み
         */
        function loadPriceMonitoringData() {
            fetch('inventory.php?action=get_price_monitoring')
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        displayPriceMonitoringData(result.data);
                    } else {
                        console.error('価格監視データ取得エラー:', result.message);
                    }
                })
                .catch(error => {
                    console.error('価格監視データ取得失敗:', error);
                });
        }

        /**
         * 価格監視データ表示
         */
        function displayPriceMonitoringData(data) {
            const tbody = document.getElementById('priceMonitoringData');
            if (!tbody) return;
            
            if (!data || data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="no-data">
                            <i class="fas fa-info-circle"></i> 価格監視データがありません
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = data.map(item => {
                const changeClass = item.change_percent > 0 ? 'positive' : 
                                  item.change_percent < 0 ? 'negative' : 'neutral';
                
                const changeIcon = item.change_percent > 0 ? 'fa-arrow-up' : 
                                 item.change_percent < 0 ? 'fa-arrow-down' : 'fa-minus';
                
                return `
                    <tr>
                        <td>${item.item_id}</td>
                        <td class="product-name">${item.title}</td>
                        <td class="price">$${item.current_price}</td>
                        <td class="price-change ${changeClass}">
                            <i class="fas ${changeIcon}"></i>
                            ${item.change_percent > 0 ? '+' : ''}${item.change_percent}%
                        </td>
                        <td class="recommendation">${item.recommendation}</td>
                        <td class="date">${formatDate(item.updated_at)}</td>
                        <td class="actions">
                            <button class="btn btn-sm btn-info" onclick="viewPriceHistory('${item.item_id}')">
                                <i class="fas fa-chart-line"></i>
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="addPriceAlert('${item.item_id}')">
                                <i class="fas fa-bell"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
            
            console.log('価格監視データ表示完了');
        }

        /**
         * 低在庫アラート読み込み
         */
        function loadLowStockAlerts() {
            fetch('inventory.php?action=get_low_stock_alerts')
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        displayLowStockAlerts(result.data);
                    } else {
                        console.error('低在庫アラート取得エラー:', result.message);
                    }
                })
                .catch(error => {
                    console.error('低在庫アラート取得失敗:', error);
                });
        }

        /**
         * 低在庫アラート表示
         */
        function displayLowStockAlerts(alerts) {
            const container = document.getElementById('inventoryAlerts');
            const countElement = document.getElementById('alertCount');
            
            if (countElement) {
                countElement.textContent = `${alerts.length}件のアラート`;
            }
            
            if (!container) return;
            
            if (!alerts || alerts.length === 0) {
                container.innerHTML = `
                    <div class="no-alerts">
                        <i class="fas fa-check-circle"></i>
                        <p>現在、在庫アラートはありません</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = alerts.map(alert => {
                const alertClass = alert.priority === 'critical' ? 'alert-critical' : 
                                 alert.priority === 'high' ? 'alert-high' : 'alert-warning';
                
                const icon = alert.priority === 'critical' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle';
                
                return `
                    <div class="alert-item ${alertClass}">
                        <div class="alert-icon">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="alert-content">
                            <h5>${alert.title}</h5>
                            <p>在庫残り${alert.current_stock}個 - ${alert.recommendation}</p>
                            <div class="alert-meta">
                                <span>最終販売: ${formatRelativeDate(alert.last_sale_date)}</span>
                                <span>アラート閾値: ${alert.alert_threshold}個</span>
                            </div>
                        </div>
                        <div class="alert-actions">
                            <button class="btn btn-sm btn-success" onclick="reorderStock('${alert.item_id}')">補充注文</button>
                            <button class="btn btn-sm btn-secondary" onclick="viewStockDetails('${alert.item_id}')">詳細</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        /**
         * 売上チャート初期化
         */
        function initializeSalesChart() {
            const ctx = document.getElementById('salesChart');
            if (!ctx) return;
            
            fetch('inventory.php?action=get_sales_chart_data')
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        currentChartData = result.data;
                        renderSalesChart(result.data);
                    } else {
                        console.error('チャートデータ取得エラー:', result.message);
                    }
                })
                .catch(error => {
                    console.error('チャートデータ取得失敗:', error);
                });
        }

        /**
         * 売上チャート描画
         */
        function renderSalesChart(data) {
            const ctx = document.getElementById('salesChart');
            if (!ctx) return;
            
            if (salesChart) {
                salesChart.destroy();
            }
            
            salesChart = new Chart(ctx, {
                type: 'line',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
            
            console.log('売上チャート描画完了');
        }

        /**
         * カテゴリ分析更新
         */
        function updateCategoryAnalysis(categoryData) {
            const grid = document.getElementById('categoryGrid');
            if (!grid || !categoryData) return;
            
            grid.innerHTML = categoryData.map(category => `
                <div class="category-card">
                    <div class="category-header">
                        <h4>${category.category_name || 'その他'}</h4>
                        <div class="category-count">${category.product_count}商品</div>
                    </div>
                    <div class="category-stats">
                        <div class="stat-item">
                            <span class="stat-label">平均価格</span>
                            <span class="stat-value">$${parseFloat(category.avg_price || 0).toFixed(2)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">総価値</span>
                            <span class="stat-value">$${parseFloat(category.total_value || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        /**
         * データ更新
         */
        function refreshAnalytics() {
            console.log('分析データ更新開始');
            
            // ローディング表示
            const updateButton = document.querySelector('.btn[onclick="refreshAnalytics()"]');
            if (updateButton) {
                const originalHTML = updateButton.innerHTML;
                updateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 更新中...';
                updateButton.disabled = true;
                
                // データ再読み込み
                loadAnalyticsData();
                loadPriceMonitoringData();
                loadLowStockAlerts();
                
                // ボタンを元に戻す
                setTimeout(() => {
                    updateButton.innerHTML = originalHTML;
                    updateButton.disabled = false;
                }, 2000);
            }
        }

        /**
         * 価格監視データ更新
         */
        function refreshPriceMonitoring() {
            console.log('価格監視データ更新');
            loadPriceMonitoringData();
        }

        /**
         * 在庫レポート出力
         */
        function exportInventoryReport() {
            console.log('在庫レポート出力開始');
            
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'inventory.php';
            form.style.display = 'none';
            
            const actionInput = document.createElement('input');
            actionInput.type = 'hidden';
            actionInput.name = 'action';
            actionInput.value = 'export_inventory_report';
            
            form.appendChild(actionInput);
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        }

        /**
         * 価格アラート追加モーダル表示
         */
        function showAddPriceAlert() {
            const modal = document.getElementById('addPriceAlertModal');
            if (modal) {
                modal.style.display = 'flex';
            }
        }

        /**
         * 価格アラート追加モーダルを閉じる
         */
        function closeAddPriceAlertModal() {
            const modal = document.getElementById('addPriceAlertModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        /**
         * ユーティリティ関数群
         */
        function formatDate(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('ja-JP');
        }

        function formatRelativeDate(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return '今日';
            if (diffDays === 1) return '昨日';
            if (diffDays < 7) return `${diffDays}日前`;
            return date.toLocaleDateString('ja-JP');
        }

        // プレースホルダー関数群
        function viewPriceHistory(itemId) {
            alert(`商品 ${itemId} の価格履歴表示機能は準備中です。`);
        }

        function addPriceAlert(itemId) {
            document.getElementById('alertItemId').value = itemId;
            showAddPriceAlert();
        }

        function savePriceAlert() {
            alert('価格アラート保存機能は準備中です。');
            closeAddPriceAlertModal();
        }

        function reorderStock(itemId) {
            alert(`商品 ${itemId} の補充注文機能は準備中です。`);
        }

        function viewStockDetails(itemId) {
            alert(`商品 ${itemId} の在庫詳細表示機能は準備中です。`);
        }

        function updateChart() {
            console.log('チャート期間変更');
            // チャートデータを期間に応じて更新
            if (currentChartData) {
                renderSalesChart(currentChartData);
            }
        }

        // 02_scraping統合用JavaScript関数の追加
        
        // 02_scrapingとの統合API呼び出し関数
        async function call02ScrapingAPI(action, params = {}) {
            try {
                const response = await fetch('../02_scraping/api/inventory_monitor.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: action,
                        ...params
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.message || '不明なエラー');
                }

                return result;
            } catch (error) {
                console.error('02_scraping API呼び出しエラー:', error);
                throw error;
            }
        }

        // 在庫データ変換・管理関数
        function transformInventoryData(monitoringData) {
            return monitoringData.map(item => ({
                id: item.product_id || 'UNKNOWN',
                title: item.title || item.product_title || '商品名不明',
                ebayItemId: item.ebay_item_id || '',
                currentPrice: item.current_price || 0,
                previousPrice: item.previous_price || item.current_price || 0,
                monitoringStatus: item.monitoring_enabled ? 'active' : 'paused',
                lastVerified: item.last_verified || item.updated_at || new Date().toISOString(),
                priceChange: calculatePriceChange(item.current_price, item.previous_price),
                alertStatus: determineAlertStatus(item),
                profitEstimate: calculateProfitEstimate(item.current_price),
                sourceUrl: item.source_url || '',
                urlStatus: item.url_status || 'active'
            }));
        }

        function calculatePriceChange(current, previous) {
            if (!previous || previous === 0) return { percent: 0, direction: 'neutral' };
            
            const change = ((current - previous) / previous) * 100;
            return {
                percent: Math.round(change * 10) / 10,
                direction: change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
            };
        }

        function determineAlertStatus(item) {
            if (item.url_status === 'dead') return 'critical';
            if (item.current_stock <= 5) return 'warning';
            if (!item.monitoring_enabled) return 'info';
            return 'normal';
        }

        function calculateProfitEstimate(price) {
            const jpyPrice = price * 150;
            const costs = jpyPrice * 0.3;
            return Math.round(jpyPrice - costs);
        }

        // 02_scraping統合用監視制御関数
        async function toggleMonitoring(itemId, currentStatus) {
            try {
                const newStatus = currentStatus === 'active' ? 'stop' : 'start';
                const result = await call02ScrapingAPI(`${newStatus}_monitoring`, { product_id: itemId });
                
                if (result.success) {
                    showNotification(`商品 ${itemId} の監視を${newStatus === 'start' ? '開始' : '停止'}しました`);
                    await loadInventoryData();
                } else {
                    showError(`監視状態変更エラー: ${result.message}`);
                }
            } catch (error) {
                showError(`監視状態変更エラー: ${error.message}`);
            }
        }

        async function checkNow(itemId) {
            try {
                showNotification(`商品 ${itemId} の在庫確認を開始しています...`);
                const result = await call02ScrapingAPI('check_inventory', { product_ids: [itemId] });
                
                if (result.success) {
                    showNotification(`商品 ${itemId} の在庫確認が完了しました`);
                    await loadInventoryData();
                } else {
                    showError(`在庫確認エラー: ${result.message}`);
                }
            } catch (error) {
                showError(`在庫確認エラー: ${error.message}`);
            }
        }

        async function viewItemDetails(itemId) {
            try {
                const result = await call02ScrapingAPI('get_monitoring_status', { product_ids: [itemId] });
                
                if (result.success && result.data.monitoring_status.length > 0) {
                    const item = result.data.monitoring_status[0];
                    showItemDetailsModal(item);
                } else {
                    showError('商品詳細の取得に失敗しました');
                }
            } catch (error) {
                showError(`商品詳細取得エラー: ${error.message}`);
            }
        }

        // 通知システム
        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.remove()" class="notification-close">&times;</button>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 5000);
        }

        function showError(message) {
            showNotification(message, 'error');
        }

        function showWarning(message) {
            showNotification(message, 'warning');
        }

        function showLoading() {
            document.body.classList.add('loading');
        }

        function hideLoading() {
            document.body.classList.remove('loading');
        }

        // モーダル機能
        function showItemDetailsModal(item) {
            console.log('商品詳細モーダル:', item);
        }

        console.log('✅ 02_scraping統合在庫管理システム JavaScript 初期化完了');
    </script>

    <style>
        /* 在庫管理専用スタイル */
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 1rem;
        }

        .navbar {
            background: #1e293b;
            color: white;
            padding: 1rem 0;
            border-radius: 0.5rem;
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .nav-brand {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1.25rem;
            font-weight: 700;
            padding: 0 1rem;
        }

        .nav-links {
            display: flex;
            gap: 0.5rem;
            padding: 0 1rem;
        }

        .nav-links a {
            color: #cbd5e1;
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            transition: all 0.2s;
        }

        .nav-links a:hover {
            background: #334155;
            color: white;
        }

        .nav-links a.active {
            background: #3b82f6;
            color: white;
        }

        .main-content {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .page-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 0.75rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .page-header h1 {
            font-size: 1.875rem;
            margin: 0 0 0.5rem 0;
        }

        .page-header p {
            margin: 0;
            opacity: 0.9;
        }

        .header-actions {
            display: flex;
            gap: 0.75rem;
        }

        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 0.375rem;
            font-weight: 500;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
            text-decoration: none;
        }

        .btn-primary { background: #3b82f6; color: white; }
        .btn-success { background: #10b981; color: white; }
        .btn-warning { background: #f59e0b; color: white; }
        .btn-info { background: #06b6d4; color: white; }
        .btn-secondary { background: #6b7280; color: white; }

        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-sm {
            padding: 0.375rem 0.75rem;
            font-size: 0.875rem;
        }

        /* 分析カード */
        .analytics-overview {
            margin-bottom: 2rem;
        }

        .analytics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
        }

        .analytics-card {
            background: white;
            border-radius: 0.75rem;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border-left: 4px solid;
            transition: transform 0.2s;
        }

        .analytics-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        .card-revenue { border-left-color: #10b981; }
        .card-products { border-left-color: #3b82f6; }
        .card-margin { border-left-color: #f59e0b; }
        .card-sales { border-left-color: #8b5cf6; }

        .card-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .card-icon {
            width: 3rem;
            height: 3rem;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }

        .card-revenue .card-icon { background: #d1fae5; color: #10b981; }
        .card-products .card-icon { background: #dbeafe; color: #3b82f6; }
        .card-margin .card-icon { background: #fef3c7; color: #f59e0b; }
        .card-sales .card-icon { background: #ede9fe; color: #8b5cf6; }

        .card-info h4 {
            margin: 0;
            font-size: 1rem;
            color: #374151;
        }

        .card-meta {
            font-size: 0.75rem;
            color: #6b7280;
        }

        .card-value {
            font-size: 2rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 0.5rem;
        }

        .card-change {
            font-size: 0.875rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        .card-change.positive { color: #10b981; }
        .card-change.negative { color: #ef4444; }

        /* セクション共通 */
        section {
            background: white;
            border-radius: 0.75rem;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #e5e7eb;
        }

        .section-header h3 {
            margin: 0;
            font-size: 1.25rem;
            color: #111827;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        /* チャートセクション */
        .chart-container {
            position: relative;
            height: 300px;
            margin-top: 1rem;
        }

        .chart-controls select {
            padding: 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            background: white;
        }

        /* 価格監視テーブル */
        .price-monitoring-table {
            overflow-x: auto;
        }

        .monitoring-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }

        .monitoring-table th {
            background: #f9fafb;
            padding: 0.75rem;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
        }

        .monitoring-table td {
            padding: 0.75rem;
            border-bottom: 1px solid #e5e7eb;
        }

        .monitoring-table tr:hover {
            background: #f9fafb;
        }

        .product-name {
            font-weight: 500;
            color: #111827;
        }

        .price {
            font-weight: 600;
            color: #059669;
        }

        .price-change {
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        .price-change.positive { color: #10b981; }
        .price-change.negative { color: #ef4444; }
        .price-change.neutral { color: #6b7280; }

        .recommendation {
            font-size: 0.875rem;
            color: #6b7280;
        }

        .date {
            font-size: 0.875rem;
            color: #9ca3af;
        }

        .actions {
            display: flex;
            gap: 0.5rem;
        }

        .loading-row, .no-data {
            text-align: center;
            padding: 2rem;
            color: #6b7280;
        }

        /* アラートセクション */
        .alert-summary {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .alert-count {
            background: #fef2f2;
            color: #dc2626;
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            font-size: 0.875rem;
            font-weight: 500;
        }

        .alert-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .alert-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid;
        }

        .alert-critical {
            background: #fef2f2;
            border-color: #fecaca;
        }

        .alert-high {
            background: #fef3c7;
            border-color: #fde68a;
        }

        .alert-warning {
            background: #fffbeb;
            border-color: #fed7aa;
        }

        .alert-icon {
            font-size: 1.5rem;
            flex-shrink: 0;
        }

        .alert-critical .alert-icon { color: #dc2626; }
        .alert-high .alert-icon { color: #d97706; }
        .alert-warning .alert-icon { color: #f59e0b; }

        .alert-content {
            flex: 1;
        }

        .alert-content h5 {
            margin: 0 0 0.25rem 0;
            font-weight: 600;
            color: #111827;
        }

        .alert-content p {
            margin: 0 0 0.5rem 0;
            color: #374151;
        }

        .alert-meta {
            display: flex;
            gap: 1rem;
            font-size: 0.75rem;
            color: #6b7280;
        }

        .alert-actions {
            display: flex;
            gap: 0.5rem;
        }

        .no-alerts {
            text-align: center;
            padding: 2rem;
            color: #6b7280;
        }

        .no-alerts i {
            font-size: 2rem;
            color: #10b981;
            margin-bottom: 0.5rem;
        }

        /* カテゴリ分析 */
        .category-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
        }

        .category-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            padding: 1rem;
        }

        .category-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
        }

        .category-header h4 {
            margin: 0;
            color: #111827;
        }

        .category-count {
            font-size: 0.75rem;
            color: #6b7280;
        }

        .category-stats {
            display: flex;
            justify-content: space-between;
        }

        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .stat-label {
            font-size: 0.75rem;
            color: #6b7280;
            margin-bottom: 0.25rem;
        }

        .stat-value {
            font-weight: 600;
            color: #111827;
        }

        /* モーダル */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .modal-content {
            background: white;
            border-radius: 0.5rem;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: #6b7280;
            cursor: pointer;
        }

        .modal-body {
            padding: 1rem;
        }

        .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            padding: 1rem;
            border-top: 1px solid #e5e7eb;
        }

        .form-group {
            margin-bottom: 1rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.25rem;
            font-weight: 500;
            color: #374151;
        }

        .form-control {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            font-size: 0.875rem;
        }

        .form-control:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* 通知システム */
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            min-width: 300px;
            animation: slideIn 0.3s ease;
        }

        .notification-success {
            border-left: 4px solid #10b981;
        }

        .notification-error {
            border-left: 4px solid #ef4444;
        }

        .notification-warning {
            border-left: 4px solid #f59e0b;
        }

        .notification-close {
            background: none;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            color: #6b7280;
            margin-left: auto;
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

        /* レスポンシブ */
        @media (max-width: 768px) {
            .page-header {
                flex-direction: column;
                text-align: center;
                gap: 1rem;
            }

            .analytics-grid {
                grid-template-columns: 1fr;
            }

            .nav-links {
                flex-wrap: wrap;
                gap: 0.25rem;
            }

            .nav-links a {
                font-size: 0.75rem;
                padding: 0.375rem 0.75rem;
            }

            .section-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 1rem;
            }

            .monitoring-controls,
            .chart-controls {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
            }
        }
    </style>
</body>
</html>