<?php
/**
 * Amazon データ編集UI
 * new_structure/16_amazon_integration/ui/amazon_editor_ui.php
 */

// エラー表示設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF トークン生成
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// 必要なクラスの読み込み（パス修正）
$requiredFiles = [
    'Database' => __DIR__ . '/../../shared/core/Database.php',
    'ApiResponse' => __DIR__ . '/../../shared/core/ApiResponse.php'
];

foreach ($requiredFiles as $className => $filePath) {
    if (file_exists($filePath)) {
        require_once $filePath;
    } else {
        // 代替クラス定義（ファイルが見つからない場合）
        if ($className === 'Database') {
            class Database {
                private $pdo;
                
                public function __construct() {
                    try {
                        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
                        $user = "postgres";
                        $password = "Kn240914";
                        
                        $this->pdo = new PDO($dsn, $user, $password);
                        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                    } catch (PDOException $e) {
                        throw new Exception("データベース接続エラー: " . $e->getMessage());
                    }
                }
                
                public function query($sql, $params = []) {
                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute($params);
                    return $stmt;
                }
                
                public function prepare($sql) {
                    return $this->pdo->prepare($sql);
                }
                
                public function exec($sql) {
                    return $this->pdo->exec($sql);
                }
                
                public function beginTransaction() {
                    return $this->pdo->beginTransaction();
                }
                
                public function commit() {
                    return $this->pdo->commit();
                }
                
                public function rollback() {
                    return $this->pdo->rollback();
                }
            }
        }
        
        if ($className === 'ApiResponse') {
            class ApiResponse {
                public static function success($data = null, $message = '') {
                    self::send(['success' => true, 'data' => $data, 'message' => $message]);
                }
                
                public static function error($message, $code = 500) {
                    self::send(['success' => false, 'error' => ['message' => $message, 'code' => $code]]);
                }
                
                private static function send($data) {
                    header('Content-Type: application/json; charset=utf-8');
                    echo json_encode($data, JSON_UNESCAPED_UNICODE);
                    exit;
                }
            }
        }
    }
}

try {
    $db = Database::getInstance();
} catch (Exception $e) {
    $dbError = $e->getMessage();
}

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amazon データ編集 - Yahoo Auction統合システム</title>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Chart.js for 価格変動グラフ -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    
    <!-- Amazon専用CSS -->
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f7fa; }
        
        .amazon-editor {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #ff9a56, #ff6b6b);
            color: white;
            padding: 2rem;
            border-radius: 15px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .tab-container {
            margin-bottom: 20px;
        }
        
        .tab-buttons {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            justify-content: center;
        }
        
        .tab-button {
            padding: 15px 25px;
            border: none;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            cursor: pointer;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .tab-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
        
        .tab-button.active {
            background: linear-gradient(135deg, #ff6b6b, #ff9a56);
            transform: translateY(-2px);
        }
        
        .tab-content {
            display: none;
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        
        .tab-content.active {
            display: block;
        }
        
        .search-controls {
            display: flex;
            gap: 15px;
            margin-bottom: 25px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .search-input {
            flex: 1;
            min-width: 300px;
            padding: 12px 15px;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        .search-input:focus {
            border-color: #667eea;
            outline: none;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .btn {
            padding: 12px 25px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, #5a6fd8, #6a4190);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
        
        .btn-secondary {
            background: linear-gradient(135deg, #a8edea, #fed6e3);
            color: #333;
        }
        
        .btn-secondary:hover {
            background: linear-gradient(135deg, #96e6e2, #fcc5d8);
            transform: translateY(-2px);
        }
        
        .btn-success {
            background: linear-gradient(135deg, #84fab0, #8fd3f4);
            color: white;
        }
        
        .btn-success:hover {
            background: linear-gradient(135deg, #7be8a3, #7fc8ed);
            transform: translateY(-2px);
        }
        
        .filter-controls {
            display: flex;
            gap: 20px;
            margin-bottom: 25px;
            align-items: center;
            flex-wrap: wrap;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        
        .filter-controls label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            cursor: pointer;
        }
        
        .filter-controls input[type="checkbox"] {
            width: 18px;
            height: 18px;
            accent-color: #667eea;
        }
        
        .filter-controls select {
            padding: 8px 12px;
            border: 2px solid #e1e5e9;
            border-radius: 6px;
            font-size: 14px;
            background: white;
        }
        
        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 25px;
            margin-top: 25px;
        }
        
        .product-card {
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        
        .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 35px rgba(0,0,0,0.15);
            border-color: #667eea;
        }
        
        .product-image {
            width: 100%;
            height: 220px;
            object-fit: cover;
            border-radius: 10px;
            margin-bottom: 15px;
        }
        
        .product-title {
            font-weight: 600;
            margin-bottom: 12px;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            color: #2c3e50;
            font-size: 16px;
        }
        
        .product-price {
            font-size: 20px;
            color: #e74c3c;
            font-weight: bold;
            margin-bottom: 12px;
        }
        
        .product-stock {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 12px;
            display: inline-block;
        }
        
        .stock-in {
            background: #d4edda;
            color: #155724;
        }
        
        .stock-out {
            background: #f8d7da;
            color: #721c24;
        }
        
        .stock-limited {
            background: #fff3cd;
            color: #856404;
        }
        
        .product-badges {
            display: flex;
            gap: 8px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        
        .priority-badge {
            background: linear-gradient(135deg, #ffecd2, #fcb69f);
            color: #8b4513;
            padding: 4px 10px;
            border-radius: 15px;
            font-size: 11px;
            font-weight: bold;
        }
        
        .fluctuation-count {
            background: linear-gradient(135deg, #a8edea, #fed6e3);
            color: #2c3e50;
            padding: 4px 10px;
            border-radius: 15px;
            font-size: 11px;
            font-weight: bold;
        }
        
        .product-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .product-actions .btn {
            flex: 1;
            justify-content: center;
            padding: 10px;
            font-size: 14px;
        }
        
        /* モーダルスタイル */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            backdrop-filter: blur(5px);
        }
        
        .modal-content {
            background-color: white;
            margin: 3% auto;
            padding: 0;
            border-radius: 15px;
            width: 90%;
            max-width: 900px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }
        
        .modal-header {
            padding: 25px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-radius: 15px 15px 0 0;
            position: relative;
        }
        
        .modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
        }
        
        .modal-close {
            position: absolute;
            right: 20px;
            top: 20px;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            color: white;
            opacity: 0.8;
            transition: opacity 0.3s;
        }
        
        .modal-close:hover {
            opacity: 1;
        }
        
        .modal-body {
            padding: 25px;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #7f8c8d;
            font-size: 18px;
        }
        
        .loading::before {
            content: '⏳';
            font-size: 24px;
            margin-right: 10px;
        }
        
        .error-message {
            background: linear-gradient(135deg, #ff9a9e, #fecfef);
            color: #721c24;
            padding: 20px;
            border-radius: 10px;
            margin: 15px 0;
            border-left: 4px solid #e74c3c;
        }
        
        .success-message {
            background: linear-gradient(135deg, #a8edea, #fed6e3);
            color: #155724;
            padding: 20px;
            border-radius: 10px;
            margin: 15px 0;
            border-left: 4px solid #27ae60;
        }
        
        .info-message {
            background: linear-gradient(135deg, #d299c2, #fef9d7);
            color: #004085;
            padding: 20px;
            border-radius: 10px;
            margin: 15px 0;
            border-left: 4px solid #3498db;
        }
        
        .pagination-controls {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 30px;
            flex-wrap: wrap;
        }
        
        .navigation-back {
            text-align: center;
            margin-top: 30px;
        }
        
        .navigation-back .btn {
            margin: 0 10px;
        }
        
        @media (max-width: 768px) {
            .amazon-editor {
                padding: 10px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .search-controls {
                flex-direction: column;
            }
            
            .search-input {
                min-width: auto;
            }
            
            .filter-controls {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .products-grid {
                grid-template-columns: 1fr;
            }
            
            .modal-content {
                width: 95%;
                margin: 5% auto;
            }
        }
    </style>
</head>
<body>
    <div class="amazon-editor">
        <div class="header">
            <h1><i class="fab fa-amazon"></i> Amazon データ編集システム</h1>
            <p>Amazon商品データの管理・編集・分析を行います</p>
        </div>
        
        <?php if (isset($dbError)): ?>
            <div class="error-message">
                <h3><i class="fas fa-exclamation-triangle"></i> データベース接続エラー</h3>
                <p><?php echo htmlspecialchars($dbError, ENT_QUOTES, 'UTF-8'); ?></p>
                <p>データベース接続設定を確認してください。</p>
            </div>
        <?php endif; ?>
        
        <!-- タブ切り替え -->
        <div class="tab-container">
            <div class="tab-buttons">
                <button class="tab-button active" data-tab="amazon">
                    <i class="fab fa-amazon"></i> Amazon データ
                </button>
                <button class="tab-button" data-tab="yahoo">
                    <i class="fas fa-yen-sign"></i> Yahoo! データ
                </button>
                <button class="tab-button" data-tab="cross-analysis">
                    <i class="fas fa-chart-bar"></i> 横断分析
                </button>
            </div>
            
            <!-- Amazon データタブ -->
            <div id="amazon-tab" class="tab-content active">
                <div class="search-controls">
                    <input type="text" id="amazonSearch" class="search-input" placeholder="ASIN、商品名、ブランドで検索...">
                    <button class="btn btn-primary" onclick="searchAmazonProducts()">
                        <i class="fas fa-search"></i> 検索
                    </button>
                    <button class="btn btn-success" onclick="showAddAsinModal()">
                        <i class="fas fa-plus"></i> ASIN追加
                    </button>
                    <button class="btn btn-secondary" onclick="refreshAmazonData()">
                        <i class="fas fa-sync"></i> 更新
                    </button>
                </div>
                
                <div class="filter-controls">
                    <label>
                        <input type="checkbox" id="highPriorityFilter"> 高優先度のみ
                    </label>
                    <label>
                        <input type="checkbox" id="stockOutFilter"> 在庫切れのみ
                    </label>
                    <select id="sortBy">
                        <option value="updated_at">更新日時順</option>
                        <option value="price_fluctuation_count">変動回数順</option>
                        <option value="current_price">価格順</option>
                        <option value="title">商品名順</option>
                    </select>
                </div>
                
                <div id="amazonProducts" class="products-grid">
                    <div class="loading">Amazon商品データを読み込み中...</div>
                </div>
                
                <div id="pagination" class="pagination-controls">
                    <!-- ページネーション -->
                </div>
            </div>
            
            <!-- Yahoo! データタブ -->
            <div id="yahoo-tab" class="tab-content">
                <div class="info-message">
                    <h3><i class="fas fa-info-circle"></i> Yahoo!データ連携</h3>
                    <p>既存のYahoo!オークションデータとの連携機能です。</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="../../02_scraping/scraping.php" class="btn btn-primary" target="_blank">
                        <i class="fas fa-external-link-alt"></i> Yahoo!スクレイピングシステム
                    </a>
                </div>
                
                <iframe src="../../02_scraping/scraping.php" 
                        width="100%" 
                        height="600px" 
                        style="border: none; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                </iframe>
            </div>
            
            <!-- 横断分析タブ -->
            <div id="cross-analysis-tab" class="tab-content">
                <h3><i class="fas fa-chart-bar"></i> Amazon×Yahoo! 横断分析</h3>
                <div id="crossAnalysisContent">
                    <div class="loading">分析データを読み込み中...</div>
                </div>
            </div>
        </div>
        
        <!-- ナビゲーション -->
        <div class="navigation-back">
            <a href="../index.php" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> メインページに戻る
            </a>
            <a href="../diagnostic_ui.php" class="btn btn-primary">
                <i class="fas fa-tools"></i> システム診断
            </a>
            <a href="../../02_scraping/scraping.php" class="btn btn-success">
                <i class="fas fa-spider"></i> Yahoo!スクレイピング
            </a>
        </div>
    </div>
    
    <!-- Amazon商品詳細モーダル -->
    <div id="amazonDetailModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <span class="modal-close">&times;</span>
                <h2 id="modalTitle">商品詳細</h2>
            </div>
            <div class="modal-body">
                <div id="modalContent">
                    <!-- 商品詳細内容 -->
                </div>
            </div>
        </div>
    </div>
    
    <!-- ASIN追加モーダル -->
    <div id="addAsinModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <span class="modal-close">&times;</span>
                <h2>ASIN追加</h2>
            </div>
            <div class="modal-body">
                <form id="addAsinForm">
                    <div style="margin-bottom: 20px;">
                        <label for="asinInput" style="display: block; margin-bottom: 8px; font-weight: 600;">
                            ASIN (複数の場合は改行で区切る):
                        </label>
                        <textarea id="asinInput" rows="5" 
                                  style="width: 100%; padding: 15px; border: 2px solid #e1e5e9; border-radius: 10px; font-size: 16px;" 
                                  placeholder="B07XXXXX01&#10;B08XXXXX02&#10;B09XXXXX03"></textarea>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="highPriorityCheck" style="width: 18px; height: 18px; accent-color: #667eea;"> 
                            高優先度として追加
                        </label>
                    </div>
                    <div style="display: flex; gap: 15px;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="fas fa-plus"></i> 追加
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal('addAsinModal')" style="flex: 1;">
                            <i class="fas fa-times"></i> キャンセル
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <!-- JavaScript -->
    <script>
        // グローバル変数
        let currentAmazonProducts = [];
        let currentPage = 1;
        let itemsPerPage = 12;
        let priceChart = null;
        
        // CSRF トークン
        const csrfToken = '<?php echo $_SESSION['csrf_token']; ?>';
        
        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            setupEventListeners();
            // データベース接続がある場合のみAmazon商品を読み込み
            <?php if (!isset($dbError)): ?>
            loadAmazonProducts();
            <?php endif; ?>
        });
        
        /**
         * イベントリスナー設定
         */
        function setupEventListeners() {
            // タブ切り替え
            document.querySelectorAll('.tab-button').forEach(button => {
                button.addEventListener('click', function() {
                    switchTab(this.dataset.tab);
                });
            });
            
            // 検索フィルター
            const highPriorityFilter = document.getElementById('highPriorityFilter');
            const stockOutFilter = document.getElementById('stockOutFilter');
            const sortBy = document.getElementById('sortBy');
            
            if (highPriorityFilter) highPriorityFilter.addEventListener('change', filterAmazonProducts);
            if (stockOutFilter) stockOutFilter.addEventListener('change', filterAmazonProducts);
            if (sortBy) sortBy.addEventListener('change', filterAmazonProducts);
            
            // 検索入力（デバウンス）
            let searchTimeout;
            const amazonSearch = document.getElementById('amazonSearch');
            if (amazonSearch) {
                amazonSearch.addEventListener('input', function() {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(searchAmazonProducts, 500);
                });
            }
            
            // ASIN追加フォーム
            const addAsinForm = document.getElementById('addAsinForm');
            if (addAsinForm) {
                addAsinForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    addAsins();
                });
            }
        }
        
        /**
         * タブ切り替え
         */
        function switchTab(tabName) {
            // ボタンのアクティブ状態更新
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
            
            // タブ内容表示
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            const targetTab = document.getElementById(`${tabName}-tab`);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            // タブ固有の処理
            if (tabName === 'cross-analysis') {
                loadCrossAnalysis();
            }
        }
        
        /**
         * Amazon商品データ読み込み
         */
        async function loadAmazonProducts(page = 1) {
            try {
                showLoading('amazonProducts');
                
                // テスト用のダミーデータを表示（API未実装時）
                setTimeout(() => {
                    displayTestAmazonProducts();
                }, 1000);
                
            } catch (error) {
                console.error('Amazon商品読み込みエラー:', error);
                showError('amazonProducts', 'データの読み込みに失敗しました');
            }
        }
        
        /**
         * テスト用Amazon商品表示
         */
        function displayTestAmazonProducts() {
            const testProducts = [
                {
                    asin: 'B08N5WRWNW',
                    title: 'Echo Dot (4th Gen) | Smart speaker with Alexa',
                    current_price: 49.99,
                    current_stock_status: 'InStock',
                    is_high_priority: true,
                    price_fluctuation_count: 3,
                    product_images: '{"primary":{"medium":"https://via.placeholder.com/300x200/4285f4/ffffff?text=Echo+Dot"}}'
                },
                {
                    asin: 'B07HZLHPKP',
                    title: 'Fire TV Stick 4K streaming device',
                    current_price: 39.99,
                    current_stock_status: 'InStock',
                    is_high_priority: false,
                    price_fluctuation_count: 1,
                    product_images: '{"primary":{"medium":"https://via.placeholder.com/300x200/ea4335/ffffff?text=Fire+TV"}}'
                },
                {
                    asin: 'B08KRV7S22',
                    title: 'Kindle Paperwhite (11th generation)',
                    current_price: 139.99,
                    current_stock_status: 'OutOfStock',
                    is_high_priority: false,
                    price_fluctuation_count: 0,
                    product_images: '{"primary":{"medium":"https://via.placeholder.com/300x200/34a853/ffffff?text=Kindle"}}'
                }
            ];
            
            displayAmazonProducts(testProducts);
            
            // テスト用のページネーション
            const testPagination = {
                current_page: 1,
                total_pages: 1,
                total_count: testProducts.length,
                has_next: false,
                has_prev: false
            };
            displayPagination(testPagination);
        }
        
        /**
         * Amazon商品表示
         */
        function displayAmazonProducts(products) {
            const container = document.getElementById('amazonProducts');
            
            if (!products || products.length === 0) {
                container.innerHTML = '<div class="loading">商品データがありません</div>';
                return;
            }
            
            const html = products.map(product => {
                const images = JSON.parse(product.product_images || '{}');
                const primaryImage = images.primary?.medium || images.primary?.large || 'https://via.placeholder.com/300x200/cccccc/666666?text=No+Image';
                
                const stockClass = product.current_stock_status === 'InStock' ? 'stock-in' : 
                                 product.current_stock_status === 'OutOfStock' ? 'stock-out' : 'stock-limited';
                
                const priorityBadge = product.is_high_priority ? '<span class="priority-badge"><i class="fas fa-star"></i> 高優先</span>' : '';
                const fluctuationBadge = product.price_fluctuation_count > 0 ? 
                    `<span class="fluctuation-count"><i class="fas fa-chart-line"></i> ${product.price_fluctuation_count}回変動</span>` : '';
                
                return `
                    <div class="product-card" data-asin="${product.asin}">
                        <img src="${primaryImage}" alt="${product.title}" class="product-image" 
                             onerror="this.src='https://via.placeholder.com/300x200/cccccc/666666?text=No+Image'">
                        <div class="product-title">${product.title || 'タイトルなし'}</div>
                        <div class="product-price">$${product.current_price || 'N/A'}</div>
                        <div class="product-stock ${stockClass}">
                            <i class="fas fa-${stockClass === 'stock-in' ? 'check-circle' : stockClass === 'stock-out' ? 'times-circle' : 'exclamation-circle'}"></i>
                            ${product.current_stock_status || 'Unknown'}
                        </div>
                        <div class="product-badges">
                            ${priorityBadge}
                            ${fluctuationBadge}
                        </div>
                        <div class="product-actions">
                            <button class="btn btn-primary" onclick="showAmazonDetail('${product.asin}')">
                                <i class="fas fa-eye"></i> 詳細
                            </button>
                            <button class="btn btn-secondary" onclick="togglePriority('${product.asin}', ${!product.is_high_priority})">
                                <i class="fas fa-${product.is_high_priority ? 'star' : 'star-o'}"></i>
                                ${product.is_high_priority ? '通常' : '優先'}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = html;
        }
        
        /**
         * 検索機能
         */
        function searchAmazonProducts() {
            showNotification('検索機能は実装中です', 'info');
        }
        
        /**
         * フィルタリング機能
         */
        function filterAmazonProducts() {
            showNotification('フィルタリング機能は実装中です', 'info');
        }
        
        /**
         * 商品詳細表示
         */
        function showAmazonDetail(asin) {
            showNotification(`商品詳細表示機能は実装中です (ASIN: ${asin})`, 'info');
        }
        
        /**
         * 優先度切り替え
         */
        function togglePriority(asin, newPriority) {
            showNotification(`優先度切り替え機能は実装中です (ASIN: ${asin})`, 'info');
        }
        
        /**
         * ASIN追加モーダル表示
         */
        function showAddAsinModal() {
            document.getElementById('addAsinModal').style.display = 'block';
            document.getElementById('asinInput').focus();
        }
        
        /**
         * ASIN追加実行
         */
        function addAsins() {
            const asinInput = document.getElementById('asinInput').value.trim();
            
            if (!asinInput) {
                showNotification('ASINを入力してください', 'error');
                return;
            }
            
            showNotification('ASIN追加機能は実装中です', 'info');
            closeModal('addAsinModal');
            document.getElementById('addAsinForm').reset();
        }
        
        /**
         * データ更新
         */
        function refreshAmazonData() {
            showNotification('データ更新機能は実装中です', 'info');
        }
        
        /**
         * 横断分析読み込み
         */
        function loadCrossAnalysis() {
            const container = document.getElementById('crossAnalysisContent');
            
            setTimeout(() => {
                container.innerHTML = `
                    <div class="info-message">
                        <h3><i class="fas fa-chart-bar"></i> 横断分析機能</h3>
                        <p>Amazon×Yahoo!オークションの横断分析機能は実装中です。</p>
                        <p>完成後は以下の分析が可能になります：</p>
                        <ul style="margin-left: 20px; margin-top: 10px;">
                            <li>価格比較分析</li>
                            <li>商品マッチング精度</li>
                            <li>市場トレンド分析</li>
                            <li>利益率計算</li>
                        </ul>
                    </div>
                `;
            }, 500);
        }
        
        /**
         * ページネーション表示
         */
        function displayPagination(pagination) {
            const container = document.getElementById('pagination');
            
            if (!pagination || pagination.total_pages <= 1) {
                container.innerHTML = '';
                return;
            }
            
            let html = '';
            
            // 前のページ
            if (pagination.has_prev) {
                html += `<button class="btn btn-secondary" onclick="loadAmazonProducts(${pagination.current_page - 1})">
                    <i class="fas fa-chevron-left"></i> 前
                </button>`;
            }
            
            // ページ番号
            const startPage = Math.max(1, pagination.current_page - 2);
            const endPage = Math.min(pagination.total_pages, pagination.current_page + 2);
            
            for (let i = startPage; i <= endPage; i++) {
                const activeClass = i === pagination.current_page ? 'btn-primary' : 'btn-secondary';
                html += `<button class="btn ${activeClass}" onclick="loadAmazonProducts(${i})">${i}</button>`;
            }
            
            // 次のページ
            if (pagination.has_next) {
                html += `<button class="btn btn-secondary" onclick="loadAmazonProducts(${pagination.current_page + 1})">
                    次 <i class="fas fa-chevron-right"></i>
                </button>`;
            }
            
            // 統計情報
            html += `<div style="margin-top: 15px; text-align: center; color: #7f8c8d; font-size: 14px;">
                ${pagination.current_page} / ${pagination.total_pages} ページ (総 ${pagination.total_count} 件)
            </div>`;
            
            container.innerHTML = html;
        }
        
        /**
         * モーダルクローズ
         */
        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }
        
        /**
         * ローディング表示
         */
        function showLoading(containerId) {
            document.getElementById(containerId).innerHTML = '<div class="loading">読み込み中...</div>';
        }
        
        /**
         * エラー表示
         */
        function showError(containerId, message) {
            document.getElementById(containerId).innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${message}</div>`;
        }
        
        /**
         * 通知表示
         */
        function showNotification(message, type = 'info') {
            // 既存の通知を削除
            const existingNotification = document.querySelector('.notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            // 新しい通知作成
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: 10px;
                color: white;
                font-weight: 600;
                z-index: 9999;
                max-width: 400px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                backdrop-filter: blur(10px);
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `;
            
            // タイプ別スタイル
            switch (type) {
                case 'success':
                    notification.style.background = 'linear-gradient(135deg, #84fab0, #8fd3f4)';
                    break;
                case 'error':
                    notification.style.background = 'linear-gradient(135deg, #ff9a9e, #fecfef)';
                    break;
                case 'warning':
                    notification.style.background = 'linear-gradient(135deg, #ffecd2, #fcb69f)';
                    notification.style.color = '#8b4513';
                    break;
                default:
                    notification.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
            }
            
            // アイコン追加
            const icon = type === 'success' ? 'check-circle' : 
                        type === 'error' ? 'exclamation-triangle' :
                        type === 'warning' ? 'exclamation-circle' : 'info-circle';
            
            notification.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
            document.body.appendChild(notification);
            
            // アニメーション表示
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 100);
            
            // 自動削除
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }, 5000);
        }
        
        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const visibleModals = document.querySelectorAll('.modal[style*="block"]');
                visibleModals.forEach(modal => {
                    modal.style.display = 'none';
                });
            }
        });
        
        // モーダル背景クリックで閉じる
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
            
            if (e.target.classList.contains('modal-close')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            }
        });
    </script>
</body>
</html>
