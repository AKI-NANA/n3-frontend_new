<?php
/**
 * eBay画像URL診断ツール - PostgreSQL JSON対応版
 * JSON構文エラーを回避して安全にデータを取得
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// セキュリティヘッダー設定
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// 確認済み正しいDB設定
$config = [
    'host' => 'localhost',
    'dbname' => 'nagano3_db',
    'user' => 'postgres',
    'password' => '',
    'port' => '5432'
];

// データベース接続関数
function connectDatabase($config) {
    try {
        $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname={$config['dbname']}";
        $pdo = new PDO($dsn, $config['user'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 10
        ]);
        return $pdo;
    } catch (PDOException $e) {
        return ['error' => $e->getMessage()];
    }
}

// テーブル構造確認関数（JSON安全版）
function analyzeEbayTable($pdo) {
    try {
        // テーブル構造確認
        $columns = $pdo->query("
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'ebay_complete_api_data' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        ")->fetchAll();
        
        // 画像関連カラム特定
        $imageColumns = [];
        foreach ($columns as $col) {
            $colName = strtolower($col['column_name']);
            if (strpos($colName, 'picture') !== false || 
                strpos($colName, 'image') !== false || 
                strpos($colName, 'photo') !== false ||
                strpos($colName, 'gallery') !== false ||
                strpos($colName, 'url') !== false) {
                $imageColumns[] = $col['column_name'];
            }
        }
        
        // データ数確認
        $totalCount = $pdo->query("SELECT COUNT(*) FROM ebay_complete_api_data")->fetchColumn();
        
        // 画像URL有無確認（JSON安全版）
        $imageStats = [];
        foreach ($imageColumns as $col) {
            try {
                // PostgreSQL安全なNULLチェック
                $notNullCount = $pdo->query("
                    SELECT COUNT(*) FROM ebay_complete_api_data 
                    WHERE {$col} IS NOT NULL 
                    AND CAST({$col} AS TEXT) != '' 
                    AND CAST({$col} AS TEXT) != '[]' 
                    AND CAST({$col} AS TEXT) != 'null'
                    AND LENGTH(CAST({$col} AS TEXT)) > 2
                ")->fetchColumn();
                
                $imageStats[$col] = [
                    'total' => $totalCount,
                    'not_null' => $notNullCount,
                    'percentage' => $totalCount > 0 ? round(($notNullCount / $totalCount) * 100, 2) : 0
                ];
                
            } catch (Exception $e) {
                // このカラムでエラーが発生した場合はスキップ
                $imageStats[$col] = [
                    'total' => $totalCount,
                    'not_null' => 0,
                    'percentage' => 0,
                    'error' => $e->getMessage()
                ];
            }
        }
        
        return [
            'success' => true,
            'total_columns' => count($columns),
            'image_columns' => $imageColumns,
            'image_stats' => $imageStats,
            'total_records' => $totalCount,
            'all_columns' => array_column($columns, 'column_name')
        ];
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// サンプルデータ取得関数（エラー回避版）
function getSampleData($pdo, $limit = 10) {
    try {
        // まず基本的なデータを取得
        $stmt = $pdo->query("
            SELECT 
                ebay_item_id,
                title,
                CASE 
                    WHEN picture_urls IS NOT NULL THEN CAST(picture_urls AS TEXT)
                    ELSE NULL 
                END as picture_urls_text,
                CASE 
                    WHEN gallery_url IS NOT NULL THEN CAST(gallery_url AS TEXT)
                    ELSE NULL 
                END as gallery_url_text
            FROM ebay_complete_api_data 
            WHERE (
                picture_urls IS NOT NULL 
                OR gallery_url IS NOT NULL
                OR view_item_url IS NOT NULL
            )
            ORDER BY 
                CASE 
                    WHEN updated_at IS NOT NULL THEN updated_at 
                    WHEN created_at IS NOT NULL THEN created_at 
                    ELSE '1970-01-01'::timestamp
                END DESC 
            LIMIT {$limit}
        ");
        
        return $stmt->fetchAll();
        
    } catch (Exception $e) {
        // フォールバック：より単純なクエリ
        try {
            $stmt = $pdo->query("
                SELECT 
                    ebay_item_id,
                    title,
                    CAST(picture_urls AS TEXT) as picture_urls_text
                FROM ebay_complete_api_data 
                LIMIT {$limit}
            ");
            return $stmt->fetchAll();
        } catch (Exception $e2) {
            return [];
        }
    }
}

// 画像URL抽出関数（安全版）
function extractImageUrlSafe($data) {
    $candidates = [
        $data['picture_urls_text'] ?? null,
        $data['gallery_url_text'] ?? null,
        $data['view_item_url'] ?? null
    ];
    
    foreach ($candidates as $value) {
        if (empty($value) || $value === 'null') continue;
        
        // 直接URL
        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }
        
        // JSON配列の可能性
        if (is_string($value) && (strpos($value, '[') === 0 || strpos($value, '{') === 0)) {
            try {
                $decoded = json_decode($value, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && !empty($decoded)) {
                    foreach ($decoded as $item) {
                        if (is_string($item) && filter_var($item, FILTER_VALIDATE_URL)) {
                            return $item;
                        }
                    }
                }
            } catch (Exception $e) {
                // JSON解析失敗は無視
            }
        }
        
        // カンマ区切りURL
        if (is_string($value) && strpos($value, ',') !== false) {
            $urls = explode(',', $value);
            foreach ($urls as $url) {
                $url = trim($url);
                if (filter_var($url, FILTER_VALIDATE_URL)) {
                    return $url;
                }
            }
        }
        
        // 単純な文字列内URL検索
        if (is_string($value) && preg_match('/https?:\/\/[^\s]+/', $value, $matches)) {
            return $matches[0];
        }
    }
    
    return null;
}

// データベース接続・分析
$pdo = connectDatabase($config);
$analysisResult = null;
$sampleData = [];
$connectionError = '';

if (is_array($pdo) && isset($pdo['error'])) {
    $connectionError = $pdo['error'];
} else {
    $analysisResult = analyzeEbayTable($pdo);
    $sampleData = getSampleData($pdo, 20);
}

// CSRF トークン
session_start();
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBay画像URL表示 - PostgreSQL JSON対応版</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .header {
            text-align: center;
            margin-bottom: 2rem;
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            color: #1e293b;
            font-size: 2rem;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        
        .db-badge {
            background: #dcfce7;
            color: #166534;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.875rem;
            font-weight: 600;
        }
        
        .json-badge {
            background: #fef3c7;
            color: #92400e;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.875rem;
            font-weight: 600;
            margin-left: 0.5rem;
        }
        
        .analysis-section {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        
        .analysis-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        
        .stat-card {
            background: #f8fafc;
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            text-align: center;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            color: #64748b;
            font-size: 0.875rem;
        }
        
        .column-stats {
            margin-top: 1.5rem;
        }
        
        .stats-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            background: #f8fafc;
            border-radius: 6px;
            margin-bottom: 0.5rem;
            border-left: 3px solid #3b82f6;
        }
        
        .stats-error {
            border-left-color: #ef4444;
            background: #fef2f2;
            color: #991b1b;
        }
        
        .image-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1.5rem;
        }
        
        .image-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: transform 0.2s ease;
        }
        
        .image-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .image-container {
            position: relative;
            height: 250px;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        
        .image-container img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        
        .no-image {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #64748b;
            font-size: 0.875rem;
            text-align: center;
        }
        
        .no-image i {
            font-size: 4rem;
            margin-bottom: 1rem;
            opacity: 0.3;
        }
        
        .image-info {
            padding: 1.5rem;
        }
        
        .item-title {
            font-weight: 600;
            margin-bottom: 0.75rem;
            font-size: 0.875rem;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            color: #1e293b;
        }
        
        .item-id {
            color: #64748b;
            font-size: 0.75rem;
            margin-bottom: 0.75rem;
            font-family: monospace;
        }
        
        .url-info {
            font-size: 0.75rem;
            color: #64748b;
            word-break: break-all;
            background: #f8fafc;
            padding: 0.75rem;
            border-radius: 6px;
            border-left: 3px solid #3b82f6;
            margin-top: 0.75rem;
        }
        
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        
        .status-success {
            background: #dcfce7;
            color: #166534;
        }
        
        .status-error {
            background: #fef2f2;
            color: #991b1b;
        }
        
        .alert {
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 2rem;
        }
        
        .alert-error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
        }
        
        .alert-warning {
            background: #fffbeb;
            border: 1px solid #fed7aa;
            color: #92400e;
        }
        
        .alert-info {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            color: #0c4a6e;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .analysis-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .image-gallery {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                <i class="fas fa-images"></i>
                eBay画像URL表示ツール
                <span class="db-badge">nagano3_db</span>
                <span class="json-badge">JSON対応</span>
            </h1>
            <p>PostgreSQL JSONデータを安全に処理して画像を表示</p>
        </div>
        
        <?php if ($connectionError): ?>
            <div class="alert alert-error">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>接続エラー:</strong> <?= htmlspecialchars($connectionError, ENT_QUOTES, 'UTF-8') ?>
            </div>
        <?php else: ?>
            
            <!-- テーブル分析結果 -->
            <div class="analysis-section">
                <h2><i class="fas fa-analytics"></i> テーブル分析結果</h2>
                
                <?php if ($analysisResult && $analysisResult['success']): ?>
                    <div class="analysis-grid">
                        <div class="stat-card">
                            <div class="stat-value"><?= $analysisResult['total_records'] ?></div>
                            <div class="stat-label">総レコード数</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value"><?= $analysisResult['total_columns'] ?></div>
                            <div class="stat-label">総カラム数</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value"><?= count($analysisResult['image_columns']) ?></div>
                            <div class="stat-label">画像関連カラム</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value"><?= count($sampleData) ?></div>
                            <div class="stat-label">取得サンプル数</div>
                        </div>
                    </div>
                    
                    <?php if (!empty($analysisResult['image_stats'])): ?>
                        <div class="column-stats">
                            <h4>画像関連カラム統計:</h4>
                            <?php foreach ($analysisResult['image_stats'] as $col => $stats): ?>
                                <div class="stats-row <?= isset($stats['error']) ? 'stats-error' : '' ?>">
                                    <span><strong><?= htmlspecialchars($col, ENT_QUOTES, 'UTF-8') ?></strong></span>
                                    <?php if (isset($stats['error'])): ?>
                                        <span><i class="fas fa-exclamation-triangle"></i> エラー</span>
                                    <?php else: ?>
                                        <span><?= $stats['not_null'] ?>/<?= $stats['total'] ?> (<?= $stats['percentage'] ?>%)</span>
                                    <?php endif; ?>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                    
                <?php else: ?>
                    <div class="alert alert-error">
                        分析エラー: <?= htmlspecialchars($analysisResult['error'] ?? 'Unknown error', ENT_QUOTES, 'UTF-8') ?>
                    </div>
                <?php endif; ?>
            </div>
            
            <!-- 画像ギャラリー -->
            <?php if (!empty($sampleData)): ?>
                <div class="analysis-section">
                    <h2><i class="fas fa-image"></i> 画像サンプル表示 (<?= count($sampleData) ?>件)</h2>
                    
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i>
                        PostgreSQL JSONデータから安全に画像URLを抽出しています
                    </div>
                    
                    <div class="image-gallery">
                        <?php foreach ($sampleData as $item): ?>
                            <?php
                            $imageUrl = extractImageUrlSafe($item);
                            $hasValidUrl = $imageUrl !== null;
                            ?>
                            <div class="image-card">
                                <div class="image-container">
                                    <?php if ($hasValidUrl): ?>
                                        <img 
                                            src="<?= htmlspecialchars($imageUrl, ENT_QUOTES, 'UTF-8') ?>" 
                                            alt="商品画像"
                                            loading="lazy"
                                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                        >
                                        <div class="no-image" style="display:none;">
                                            <i class="fas fa-exclamation-triangle"></i>
                                            <span>画像読み込み<br>エラー</span>
                                        </div>
                                    <?php else: ?>
                                        <div class="no-image">
                                            <i class="fas fa-image"></i>
                                            <span>画像URL<br>未検出</span>
                                        </div>
                                    <?php endif; ?>
                                </div>
                                
                                <div class="image-info">
                                    <div class="item-title">
                                        <?= htmlspecialchars($item['title'] ?: 'タイトル未設定', ENT_QUOTES, 'UTF-8') ?>
                                    </div>
                                    
                                    <div class="item-id">
                                        ID: <?= htmlspecialchars($item['ebay_item_id'] ?: 'N/A', ENT_QUOTES, 'UTF-8') ?>
                                    </div>
                                    
                                    <div class="status-badge <?= $hasValidUrl ? 'status-success' : 'status-error' ?>">
                                        <i class="fas fa-<?= $hasValidUrl ? 'check' : 'times' ?>"></i>
                                        <?= $hasValidUrl ? '画像URL検出' : '画像URL未検出' ?>
                                    </div>
                                    
                                    <?php if ($hasValidUrl): ?>
                                        <div class="url-info">
                                            <strong>画像URL:</strong><br>
                                            <?= htmlspecialchars($imageUrl, ENT_QUOTES, 'UTF-8') ?>
                                        </div>
                                    <?php endif; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
                
            <?php else: ?>
                <div class="alert alert-warning">
                    <i class="fas fa-info-circle"></i>
                    画像データの取得に失敗しました。データベースの構造を確認してください。
                </div>
            <?php endif; ?>
            
        <?php endif; ?>
    </div>
    
    <script>
        // 画像読み込み統計
        document.addEventListener('DOMContentLoaded', function() {
            const images = document.querySelectorAll('.image-container img');
            let loadedCount = 0;
            let errorCount = 0;
            
            images.forEach(img => {
                if (img.complete) {
                    if (img.naturalWidth > 0) {
                        loadedCount++;
                    } else {
                        errorCount++;
                    }
                } else {
                    img.addEventListener('load', () => {
                        loadedCount++;
                        updateConsoleStats();
                    });
                    img.addEventListener('error', () => {
                        errorCount++;
                        updateConsoleStats();
                    });
                }
            });
            
            function updateConsoleStats() {
                console.log(`🖼️ 画像読み込み統計: 成功 ${loadedCount}件, エラー ${errorCount}件 (総 ${images.length}件)`);
            }
            
            updateConsoleStats();
            
            console.log('🚀 eBay画像URL表示ツール (PostgreSQL JSON対応版) 初期化完了');
            console.log(`📊 データベース: nagano3_db`);
            console.log(`📋 検出サンプル数: ${images.length}件`);
        });
    </script>
</body>
</html>
