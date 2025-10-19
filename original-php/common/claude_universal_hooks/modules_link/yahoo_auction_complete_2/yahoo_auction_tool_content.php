<?php
/**
 * Yahoo Auction Tool - 完全修正版
 * データベース統合・商品承認システム・フィルター管理・在庫管理 統合版
 * 作成日: 2025-09-11
 * Phase3: 実用システム完成版
 */

// エラーレポート設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// データベースクエリハンドラー読み込み
require_once __DIR__ . '/database_query_handler.php';

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// ユーザーアクションの処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';
$response = null;

// JSONレスポンス用のヘッダー設定関数
function sendJsonResponse($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

switch ($action) {
    // 🆕 承認待ち商品データ取得（データベース統合版）
    case 'get_approval_queue':
        $filters = $_GET['filters'] ?? [];
        $data = getApprovalQueueData($filters);
        $response = generateApiResponse('get_approval_queue', $data, true);
        sendJsonResponse($response);
        break;
        
    // 🆕 商品検索（データベース統合版）
    case 'search_products':
        $query = $_GET['query'] ?? '';
        $filters = $_GET['filters'] ?? [];
        $data = searchProducts($query, $filters);
        $response = generateApiResponse('search_products', $data, true);
        sendJsonResponse($response);
        break;
        
    // 🆕 ダッシュボード統計取得
    case 'get_dashboard_stats':
        $data = getDashboardStats();
        $response = generateApiResponse('get_dashboard_stats', $data, true);
        sendJsonResponse($response);
        break;
        
    // 🆕 商品承認処理
    case 'approve_products':
        $skus = $_POST['skus'] ?? [];
        $decision = $_POST['decision'] ?? 'approve';
        $reviewer = $_POST['reviewer'] ?? 'system';
        
        if (empty($skus)) {
            $response = generateApiResponse('approve_products', [], false, 'SKUが指定されていません');
        } else {
            $count = approveProducts($skus, $decision, $reviewer);
            $response = generateApiResponse('approve_products', ['processed_count' => $count], true, "$count 件の商品を処理しました");
        }
        sendJsonResponse($response);
        break;
        
    // 🆕 新規商品登録
    case 'add_new_product':
        $productData = $_POST['product_data'] ?? [];
        if (empty($productData)) {
            $response = generateApiResponse('add_new_product', [], false, '商品データが不正です');
        } else {
            $result = addNewProduct($productData);
            $response = generateApiResponse('add_new_product', ['success' => $result], $result, 
                                          $result ? '商品を登録しました' : '商品登録に失敗しました');
        }
        sendJsonResponse($response);
        break;
        
    // 🆕 禁止キーワード管理
    case 'get_prohibited_keywords':
        $data = getProhibitedKeywords();
        $response = generateApiResponse('get_prohibited_keywords', $data, true);
        sendJsonResponse($response);
        break;
        
    case 'add_prohibited_keyword':
        $keyword = $_POST['keyword'] ?? '';
        $category = $_POST['category'] ?? '';
        $priority = $_POST['priority'] ?? 'medium';
        $status = $_POST['status'] ?? 'active';
        $description = $_POST['description'] ?? '';
        
        if (empty($keyword)) {
            $response = generateApiResponse('add_prohibited_keyword', [], false, 'キーワードが指定されていません');
        } else {
            $result = addProhibitedKeyword($keyword, $category, $priority, $status, $description);
            $response = generateApiResponse('add_prohibited_keyword', ['success' => $result], $result,
                                          $result ? 'キーワードを追加しました' : 'キーワード追加に失敗しました');
        }
        sendJsonResponse($response);
        break;
        
    case 'update_prohibited_keyword':
        $id = $_POST['id'] ?? 0;
        $data = $_POST['data'] ?? [];
        
        if (empty($id) || empty($data)) {
            $response = generateApiResponse('update_prohibited_keyword', [], false, 'パラメータが不正です');
        } else {
            $result = updateProhibitedKeyword($id, $data);
            $response = generateApiResponse('update_prohibited_keyword', ['success' => $result], $result,
                                          $result ? 'キーワードを更新しました' : 'キーワード更新に失敗しました');
        }
        sendJsonResponse($response);
        break;
        
    case 'delete_prohibited_keyword':
        $id = $_POST['id'] ?? 0;
        
        if (empty($id)) {
            $response = generateApiResponse('delete_prohibited_keyword', [], false, 'IDが指定されていません');
        } else {
            $result = deleteProhibitedKeyword($id);
            $response = generateApiResponse('delete_prohibited_keyword', ['success' => $result], $result,
                                          $result ? 'キーワードを削除しました' : 'キーワード削除に失敗しました');
        }
        sendJsonResponse($response);
        break;
        
    case 'check_title':
        $title = $_POST['title'] ?? '';
        
        if (empty($title)) {
            $response = generateApiResponse('check_title', [], false, 'タイトルが指定されていません');
        } else {
            $result = checkTitleForProhibitedKeywords($title);
            $response = generateApiResponse('check_title', $result, true);
        }
        sendJsonResponse($response);
        break;
        
    // 既存アクション（スクレイピング等）
    case 'scrape':
        $url = $_POST['url'] ?? '';
        if ($url) {
            // スクレイピング処理（モック）
            $response = generateApiResponse('scrape', ['url' => $url], true, 'スクレイピングを開始しました');
        } else {
            $response = generateApiResponse('scrape', [], false, 'URLが指定されていません');
        }
        sendJsonResponse($response);
        break;
        
    case 'process_edited':
        // CSV処理（モック）
        $response = generateApiResponse('process_edited', [], true, 'CSV処理を開始しました');
        sendJsonResponse($response);
        break;
        
    default:
        // 通常のページ表示
        break;
}

// ダッシュボード統計取得
$dashboard_stats = getDashboardStats();

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Yahoo→eBay統合ワークフロー完全版（Phase3完成版）</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="css/yahoo_auction_tool_content.css" rel="stylesheet">
</head>

<!-- ここからBODY部分を正しく読み込み -->
<?php 
// Body部分のHTMLを別ファイルから読み込み
$bodyContent = file_get_contents(__DIR__ . '/html/yahoo_auction_tool_body.html');
if ($bodyContent === false) {
    // ファイルが見つからない場合は基本のHTMLを表示
    echo '<body><div class="container"><h1>Yahoo Auction Tool</h1><p>システムを読み込み中...</p></div></body>';
} else {
    // 動的データを置換
    $replacements = [
        '{{TOTAL_RECORDS}}' => number_format($dashboard_stats['total_records'] ?? 0),
        '{{SCRAPED_COUNT}}' => number_format($dashboard_stats['scraped_count'] ?? 0),
        '{{CALCULATED_COUNT}}' => number_format($dashboard_stats['calculated_count'] ?? 0),
        '{{FILTERED_COUNT}}' => number_format($dashboard_stats['filtered_count'] ?? 0),
        '{{READY_COUNT}}' => number_format($dashboard_stats['ready_count'] ?? 0),
        '{{LISTED_COUNT}}' => number_format($dashboard_stats['listed_count'] ?? 0),
        '{{CSRF_TOKEN}}' => $_SESSION['csrf_token']
    ];
    
    foreach ($replacements as $search => $replace) {
        $bodyContent = str_replace($search, $replace, $bodyContent);
    }
    echo $bodyContent;
}
?>

<script>
// グローバル設定
const API_BASE_URL = window.location.pathname;
const CSRF_TOKEN = '<?= htmlspecialchars($_SESSION['csrf_token']); ?>';

// システム初期化時にダッシュボード統計を更新
document.addEventListener('DOMContentLoaded', function() {
    console.log('Yahoo Auction Tool Phase3 システム初期化開始');
    
    // ダッシュボード統計更新
    updateDashboardStats();
    
    // 商品承認タブが選択されている場合、自動で承認データ読み込み
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.dataset.tab === 'approval') {
        loadApprovalData();
    }
    
    console.log('Yahoo Auction Tool Phase3 システム初期化完了');
});

// ダッシュボード統計更新
function updateDashboardStats() {
    fetch(API_BASE_URL + '?action=get_dashboard_stats')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                const stats = data.data;
                
                // 統計値を更新
                document.getElementById('totalRecords').textContent = formatNumber(stats.total_records || 0);
                document.getElementById('scrapedCount').textContent = formatNumber(stats.scraped_count || 0);
                document.getElementById('calculatedCount').textContent = formatNumber(stats.calculated_count || 0);
                document.getElementById('filteredCount').textContent = formatNumber(stats.filtered_count || 0);
                document.getElementById('readyCount').textContent = formatNumber(stats.ready_count || 0);
                document.getElementById('listedCount').textContent = formatNumber(stats.listed_count || 0);
                
                console.log('ダッシュボード統計を更新しました', stats);
            }
        })
        .catch(error => {
            console.error('ダッシュボード統計更新エラー:', error);
        });
}

// 数値フォーマット関数
function formatNumber(num) {
    return new Intl.NumberFormat('ja-JP').format(num);
}

// ログ追加関数
function addLogEntry(level, message) {
    const logSection = document.getElementById('logSection');
    if (!logSection) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    
    logEntry.innerHTML = `
        <span class="log-timestamp">[${timestamp}]</span>
        <span class="log-level ${level}">${level.toUpperCase()}</span>
        <span>${message}</span>
    `;
    
    logSection.insertBefore(logEntry, logSection.firstChild);
    
    // ログが多くなりすぎないよう制限
    const entries = logSection.querySelectorAll('.log-entry');
    if (entries.length > 50) {
        entries[entries.length - 1].remove();
    }
}
</script>

<script src="js/yahoo_auction_tool_content.js"></script>

</html>
