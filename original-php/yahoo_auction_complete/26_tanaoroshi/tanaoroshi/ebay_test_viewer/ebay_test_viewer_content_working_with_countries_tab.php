<?php
/**
 * eBayテストビューアー - 無限ループ完全修正版
 * 全JavaScript無効化・サーバーサイド描画のみ
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// データベース接続・データ取得
require_once __DIR__ . '/../../hooks/1_essential/database_universal_connector.php';

try {
    $connector = new DatabaseUniversalConnector();
    
    // 実際のカラム確認
    $columnStmt = $connector->pdo->prepare("
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'ebay_complete_api_data' 
        AND table_schema = 'public'
    ");
    $columnStmt->execute();
    $availableColumns = $columnStmt->fetchAll(PDO::FETCH_COLUMN);
    
    // データ取得
    $dataStmt = $connector->pdo->prepare("
        SELECT 
            ebay_item_id,
            title,
            CASE 
                WHEN picture_urls IS NOT NULL THEN CAST(picture_urls AS TEXT)
                ELSE NULL 
            END as picture_urls
        FROM ebay_complete_api_data 
        WHERE picture_urls IS NOT NULL 
        AND CAST(picture_urls AS TEXT) != '' 
        AND CAST(picture_urls AS TEXT) != '[]'
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 20
    ");
    $dataStmt->execute();
    $ebayData = $dataStmt->fetchAll();
    
    // 統計
    $statsStmt = $connector->pdo->prepare("
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN picture_urls IS NOT NULL AND CAST(picture_urls AS TEXT) != '' THEN 1 END) as with_images
        FROM ebay_complete_api_data
    ");
    $statsStmt->execute();
    $stats = $statsStmt->fetch();
    
} catch (Exception $e) {
    $ebayData = [];
    $stats = ['total' => 0, 'with_images' => 0];
    $error = $e->getMessage();
}

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBay画像表示 - 無限ループ修正版</title>
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
        }
        
        .no-js-badge {
            background: #dcfce7;
            color: #166534;
            padding: 0.5rem 1rem;
            border-radius: 12px;
            font-size: 0.875rem;
            font-weight: 600;
            display: inline-block;
            margin-top: 1rem;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
        
        .gallery {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .gallery h2 {
            color: #1e293b;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .image-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        
        .image-card {
            background: #f8fafc;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            transition: transform 0.2s ease;
        }
        
        .image-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .image-container {
            height: 250px;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
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
        }
        
        .no-image i {
            font-size: 3rem;
            margin-bottom: 0.5rem;
            opacity: 0.3;
        }
        
        .image-info {
            padding: 1rem;
        }
        
        .item-title {
            font-weight: 600;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
            line-height: 1.4;
            color: #1e293b;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .item-id {
            color: #64748b;
            font-size: 0.75rem;
            font-family: monospace;
        }
        
        .error-message {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            margin: 2rem 0;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .stats {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .image-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <h1><i class="fas fa-images"></i> eBay画像表示</h1>
            <p>eBay APIから取得した商品画像（サーバーサイド描画）</p>
            <div class="no-js-badge">JavaScript無効・無限ループ修正版</div>
        </div>
        
        <?php if (isset($error)): ?>
            <!-- エラー表示 -->
            <div class="error-message">
                <h3>データベースエラー</h3>
                <p><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
            </div>
        <?php else: ?>
            <!-- 統計情報 -->
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value"><?= $stats['total'] ?></div>
                    <div class="stat-label">総商品数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value"><?= $stats['with_images'] ?></div>
                    <div class="stat-label">画像付き商品</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value"><?= count($ebayData) ?></div>
                    <div class="stat-label">表示中</div>
                </div>
            </div>
            
            <!-- 画像ギャラリー -->
            <div class="gallery">
                <h2><i class="fas fa-image"></i> eBay商品画像 (<?= count($ebayData) ?>件)</h2>
                
                <?php if (empty($ebayData)): ?>
                    <p>表示する画像データがありません。</p>
                <?php else: ?>
                    <div class="image-grid">
                        <?php foreach ($ebayData as $item): ?>
                            <?php
                            // 画像URL抽出
                            $imageUrl = null;
                            if (!empty($item['picture_urls'])) {
                                $urlText = $item['picture_urls'];
                                
                                // JSON配列の処理
                                if (strpos($urlText, '[') === 0) {
                                    $decoded = json_decode($urlText, true);
                                    if (is_array($decoded) && !empty($decoded) && filter_var($decoded[0], FILTER_VALIDATE_URL)) {
                                        $imageUrl = $decoded[0];
                                    }
                                }
                                // 直接URL
                                elseif (filter_var($urlText, FILTER_VALIDATE_URL)) {
                                    $imageUrl = $urlText;
                                }
                            }
                            ?>
                            <div class="image-card">
                                <div class="image-container">
                                    <?php if ($imageUrl): ?>
                                        <img src="<?= htmlspecialchars($imageUrl, ENT_QUOTES, 'UTF-8') ?>" 
                                             alt="商品画像" 
                                             loading="lazy">
                                    <?php else: ?>
                                        <div class="no-image">
                                            <i class="fas fa-image"></i>
                                            <span>画像なし</span>
                                        </div>
                                    <?php endif; ?>
                                </div>
                                
                                <div class="image-info">
                                    <div class="item-title">
                                        <?= htmlspecialchars($item['title'] ?: 'タイトルなし', ENT_QUOTES, 'UTF-8') ?>
                                    </div>
                                    <div class="item-id">
                                        ID: <?= htmlspecialchars($item['ebay_item_id'] ?: 'N/A', ENT_QUOTES, 'UTF-8') ?>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
