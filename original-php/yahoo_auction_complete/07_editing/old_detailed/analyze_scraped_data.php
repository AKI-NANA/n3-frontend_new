<?php
/**
 * スクレイピングデータ完全解析ツール
 * scraped_yahoo_dataの中身を詳細表示（スタイリッシュモーダル付き・DB構造対応版）
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// データベース接続
try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres";
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // 最新データのscraped_yahoo_dataを詳細解析
    $sql = "SELECT 
                id, 
                source_item_id, 
                active_title,
                price_jpy,
                active_image_url,
                scraped_yahoo_data 
            FROM yahoo_scraped_products 
            WHERE scraped_yahoo_data IS NOT NULL 
            ORDER BY id DESC 
            LIMIT 5";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (Exception $e) {
    $error_message = $e->getMessage();
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔍 スクレイピングデータ完全解析</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        /* ベーススタイル */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            color: white;
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        /* 成功バナー（editor_db_fixed.phpスタイル） */
        .success-banner {
            background: linear-gradient(135deg, #d4edda, #c3e6cb);
            color: #155724;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            box-shadow: 0 4px 12px rgba(21, 87, 36, 0.1);
            border: 1px solid #c3e6cb;
        }

        .success-banner i {
            font-size: 1.25rem;
        }

        .success-banner strong {
            font-weight: 600;
        }

        /* カード型デザイン */
        .product-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.2);
        }

        .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 30px 60px rgba(0,0,0,0.15);
        }

        .product-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }

        .product-title {
            font-size: 1.4rem;
            font-weight: 600;
            color: #2c3e50;
            flex: 1;
        }

        .product-id {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 500;
        }

        .product-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }

        .info-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 12px;
            border-left: 4px solid #667eea;
        }

        .info-label {
            font-weight: 600;
            color: #555;
            font-size: 0.9rem;
            margin-bottom: 5px;
        }

        .info-value {
            color: #2c3e50;
            font-size: 1rem;
        }

        /* 画像解析セクション */
        .image-analysis {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 15px;
            padding: 25px;
            margin: 25px 0;
        }

        .section-title {
            font-size: 1.3rem;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }

        .stat-item {
            background: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .stat-number {
            font-size: 2rem;
            font-weight: 700;
            color: #667eea;
            display: block;
        }

        .stat-label {
            color: #666;
            font-size: 0.9rem;
            margin-top: 5px;
        }

        /* 画像ギャラリー */
        .image-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }

        .image-item {
            position: relative;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .image-item:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        .image-item img {
            width: 100%;
            height: 150px;
            object-fit: cover;
            transition: transform 0.3s ease;
        }

        .image-item:hover img {
            transform: scale(1.05);
        }

        .image-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            color: white;
            padding: 10px;
            text-align: center;
            font-size: 0.8rem;
            font-weight: 500;
        }

        /* モーダル */
        .modal-overlay {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(5px);
        }

        .modal-content {
            position: relative;
            margin: 2% auto;
            width: 90%;
            max-width: 1000px;
            height: 96%;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .modal-header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-header h3 {
            font-size: 1.4rem;
            font-weight: 600;
        }

        .modal-close {
            background: none;
            border: none;
            color: white;
            font-size: 2rem;
            cursor: pointer;
            padding: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.3s ease;
        }

        .modal-close:hover {
            background: rgba(255,255,255,0.2);
        }

        .modal-body {
            padding: 30px;
            height: calc(100% - 80px);
            overflow-y: auto;
        }

        .modal-image-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }

        .modal-image-item {
            background: #f8f9fa;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .modal-image-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }

        .modal-image-info {
            padding: 15px;
            text-align: center;
        }

        .modal-image-number {
            font-weight: 600;
            color: #667eea;
            margin-bottom: 5px;
        }

        .modal-image-url {
            font-size: 0.8rem;
            color: #666;
            word-break: break-all;
        }

        /* JSON表示エリア */
        .json-structure {
            background: #1e1e1e;
            color: #d4d4d4;
            border-radius: 15px;
            padding: 25px;
            margin-top: 25px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }

        .json-title {
            color: #569cd6;
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 15px;
        }

        .json-content {
            max-height: 300px;
            overflow-y: auto;
            font-size: 0.9rem;
            line-height: 1.4;
        }

        .json-content::-webkit-scrollbar {
            width: 8px;
        }

        .json-content::-webkit-scrollbar-track {
            background: #2d2d2d;
            border-radius: 4px;
        }

        .json-content::-webkit-scrollbar-thumb {
            background: #555;
            border-radius: 4px;
        }

        /* エラー表示 */
        .error-container {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            color: #c53030;
        }

        .error-icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }

        /* レスポンシブ */
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .product-card {
                padding: 20px;
            }
            
            .product-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }
            
            .product-info {
                grid-template-columns: 1fr;
            }
            
            .modal-content {
                width: 95%;
                height: 98%;
                margin: 1% auto;
            }
            
            .modal-body {
                padding: 20px;
            }
        }

        /* アニメーション */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .product-card {
            animation: fadeInUp 0.6s ease-out;
        }

        .product-card:nth-child(even) {
            animation-delay: 0.1s;
        }

        .product-card:nth-child(odd) {
            animation-delay: 0.2s;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 スクレイピングデータ解析ツール</h1>
            <p>Yahoo Auctionデータの詳細構造解析（スタイリッシュモーダル版）</p>
        </div>

        <!-- 成功バナー -->
        <div class="success-banner">
            <i class="fas fa-check-circle"></i>
            <strong>✅ スクレイピングデータ解析システム - スタイリッシュモーダル版起動完了</strong>
            <span style="margin-left: auto; font-size: 0.9em;">画像表示問題解決・モーダル機能実装</span>
        </div>

        <?php if (isset($error_message)): ?>
            <div class="error-container">
                <div class="error-icon">❌</div>
                <h2>エラーが発生しました</h2>
                <p><?php echo htmlspecialchars($error_message); ?></p>
            </div>
        <?php else: ?>
            <?php foreach ($products as $index => $product): ?>
                <?php
                $yahoo_data = json_decode($product['scraped_yahoo_data'], true);
                
                // 画像データを様々なキーから探す
                $image_sources = [];
                
                // all_images
                if (isset($yahoo_data['all_images']) && is_array($yahoo_data['all_images'])) {
                    $image_sources['all_images'] = $yahoo_data['all_images'];
                }
                
                // validation_info.image.all_images (メインソース)
                if (isset($yahoo_data['validation_info']['image']['all_images']) && is_array($yahoo_data['validation_info']['image']['all_images'])) {
                    $image_sources['validation_info.image.all_images'] = $yahoo_data['validation_info']['image']['all_images'];
                }
                
                // その他の画像ソース
                if (isset($yahoo_data['images']) && is_array($yahoo_data['images'])) {
                    $image_sources['images'] = $yahoo_data['images'];
                }
                
                if (isset($yahoo_data['image_urls']) && is_array($yahoo_data['image_urls'])) {
                    $image_sources['image_urls'] = $yahoo_data['image_urls'];
                }
                
                // 全画像を統合（重複除去）
                $all_images = [];
                $main_source = '';
                $main_count = 0;
                
                foreach ($image_sources as $source_name => $images) {
                    if (count($images) > $main_count) {
                        $main_count = count($images);
                        $main_source = $source_name;
                    }
                    
                    foreach ($images as $img) {
                        if (!empty($img) && is_string($img) && (strpos($img, 'http') === 0 || strpos($img, '//') === 0)) {
                            $all_images[] = $img;
                        }
                    }
                }
                
                $all_images = array_unique($all_images);
                ?>
                
                <div class="product-card">
                    <div class="product-header">
                        <div class="product-title">
                            <?php echo htmlspecialchars($product['active_title'] ?: '(タイトルなし)'); ?>
                        </div>
                        <div class="product-id">
                            ID: <?php echo $product['id']; ?>
                        </div>
                    </div>

                    <div class="product-info">
                        <div class="info-item">
                            <div class="info-label">商品ID</div>
                            <div class="info-value"><?php echo htmlspecialchars($product['source_item_id']); ?></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">価格</div>
                            <div class="info-value">¥<?php echo number_format($product['price_jpy']); ?></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">メイン画像ソース</div>
                            <div class="info-value"><?php echo $main_source; ?></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">統合画像数</div>
                            <div class="info-value"><?php echo count($all_images); ?>枚</div>
                        </div>
                    </div>

                    <div class="image-analysis">
                        <div class="section-title">
                            🖼️ 画像データ解析
                        </div>

                        <div class="stats-grid">
                            <?php foreach ($image_sources as $source_name => $images): ?>
                                <div class="stat-item">
                                    <span class="stat-number"><?php echo count($images); ?></span>
                                    <div class="stat-label"><?php echo $source_name; ?></div>
                                </div>
                            <?php endforeach; ?>
                        </div>

                        <?php if (!empty($all_images)): ?>
                            <div class="image-gallery">
                                <?php foreach (array_slice($all_images, 0, 8) as $index => $img_url): ?>
                                    <div class="image-item" onclick="openModal('modal_<?php echo $product['id']; ?>')">
                                        <img src="<?php echo htmlspecialchars($img_url); ?>" 
                                             loading="lazy" 
                                             onerror="this.parentElement.style.display='none'">
                                        <div class="image-overlay">
                                            画像 <?php echo $index + 1; ?>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                                
                                <?php if (count($all_images) > 8): ?>
                                    <div class="image-item" onclick="openModal('modal_<?php echo $product['id']; ?>')" style="background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; cursor: pointer;">
                                        +<?php echo count($all_images) - 8; ?>枚<br>
                                        <small>クリックで全表示</small>
                                    </div>
                                <?php endif; ?>
                            </div>

                            <!-- モーダル -->
                            <div id="modal_<?php echo $product['id']; ?>" class="modal-overlay">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h3>🖼️ 全画像一覧 (<?php echo count($all_images); ?>枚)</h3>
                                        <button class="modal-close" onclick="closeModal('modal_<?php echo $product['id']; ?>')">&times;</button>
                                    </div>
                                    <div class="modal-body">
                                        <div class="modal-image-grid">
                                            <?php foreach ($all_images as $index => $img_url): ?>
                                                <div class="modal-image-item">
                                                    <img src="<?php echo htmlspecialchars($img_url); ?>" 
                                                         loading="lazy" 
                                                         alt="画像 <?php echo $index + 1; ?>">
                                                    <div class="modal-image-info">
                                                        <div class="modal-image-number">画像 <?php echo $index + 1; ?></div>
                                                        <div class="modal-image-url"><?php echo htmlspecialchars($img_url); ?></div>
                                                    </div>
                                                </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        <?php endif; ?>
                    </div>

                    <div class="json-structure">
                        <div class="json-title">📊 scraped_yahoo_data 構造解析</div>
                        <div class="json-content">
                            <pre><?php
                                function showKeys($data, $prefix = '') {
                                    if (is_array($data)) {
                                        foreach ($data as $key => $value) {
                                            $current_key = $prefix ? $prefix . '.' . $key : $key;
                                            if (is_array($value)) {
                                                echo htmlspecialchars($current_key) . " <span style='color: #ce9178;'>(配列: " . count($value) . "要素)</span>\n";
                                                if (count($value) < 10 && $prefix === '') {
                                                    showKeys($value, $current_key);
                                                }
                                            } elseif (is_object($value)) {
                                                echo htmlspecialchars($current_key) . " <span style='color: #9cdcfe;'>(オブジェクト)</span>\n";
                                            } else {
                                                $value_preview = is_string($value) ? substr($value, 0, 50) : $value;
                                                echo htmlspecialchars($current_key) . " = <span style='color: #ce9178;'>" . htmlspecialchars($value_preview) . "</span>\n";
                                            }
                                        }
                                    }
                                }
                                
                                showKeys($yahoo_data);
                            ?></pre>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>

    <script>
        function openModal(modalId) {
            document.getElementById(modalId).style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        // モーダル外クリックで閉じる
        window.onclick = function(event) {
            if (event.target.classList.contains('modal-overlay')) {
                event.target.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }

        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                const modals = document.querySelectorAll('.modal-overlay');
                modals.forEach(modal => {
                    if (modal.style.display === 'block') {
                        modal.style.display = 'none';
                        document.body.style.overflow = 'auto';
                    }
                });
            }
        });
    </script>
</body>
</html>