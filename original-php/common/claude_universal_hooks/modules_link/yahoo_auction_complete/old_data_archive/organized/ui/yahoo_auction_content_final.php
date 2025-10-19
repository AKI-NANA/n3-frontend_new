                            </div>
                        `;
                    }
                })
                .catch(error => {
                    console.error('検索エラー:', error);
                    resultsContainer.innerHTML = `
                        <div class="notification error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>検索処理中にエラーが発生しました: ${error.message}</span>
                        </div>
                    `;
                });
        }
        
        function displaySearchResults(results, query) {
            const resultsContainer = document.getElementById('searchResults');
            
            if (!Array.isArray(results) || results.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="notification info">
                        <i class="fas fa-search"></i>
                        <span>「${query}」に一致する商品が見つかりませんでした</span>
                    </div>
                `;
                return;
            }
            
            resultsContainer.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <h4>検索結果: ${results.length}件</h4>
                    <div class="search-summary" style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
                        「${query}」の検索結果を表示しています
                    </div>
                </div>
                <div class="search-results-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
                    ${results.map(item => `
                        <div class="search-result-item" style="background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; transition: transform 0.2s ease;">
                            <div style="padding: 1rem;">
                                <h5 style="margin-bottom: 0.5rem; color: var(--text-primary); font-size: 0.9rem; font-weight: 600; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                                    ${item.title || item.product_title || '商品名不明'}
                                </h5>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <span style="font-weight: 600; color: var(--color-success);">
                                        $${(item.price || item.current_price || 0).toFixed(2)}
                                    </span>
                                    <span style="font-size: 0.8rem; color: var(--text-muted);">
                                        ${item.category || item.category_name || 'カテゴリ不明'}
                                    </span>
                                </div>
                                <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.3; margin-bottom: 0.5rem; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                                    ${(item.description || item.item_description || '説明なし').substring(0, 100)}...
                                </p>
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                    <span class="status-badge" style="padding: 0.25rem 0.5rem; background: ${getStatusColor(item.status || 'unknown')}; color: white; border-radius: 0.25rem; font-size: 0.7rem; font-weight: 500;">
                                        ${item.status || '不明'}
                                    </span>
                                    ${item.source_platform ? `<span style="padding: 0.25rem 0.5rem; background: var(--bg-tertiary); color: var(--text-secondary); border-radius: 0.25rem; font-size: 0.7rem;">${item.source_platform}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 1rem; text-align: center; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px;">
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">
                        検索結果は統合データベースから取得されています
                    </p>
                </div>
            `;
        }
        
        function getStatusColor(status) {
            switch(status?.toLowerCase()) {
                case 'active': case '出品中': return '#10b981';
                case 'pending': case '承認待ち': return '#f59e0b';
                case 'sold': case '売り切れ': return '#6b7280';
                case 'draft': case '下書き': return '#8b5cf6';
                case 'error': case 'エラー': return '#ef4444';
                default: return '#64748b';
            }
        }

        // ページ読み込み完了時の初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Yahoo Auction Tool (完全タブシステム統合版) が読み込まれました');
            
            // ダッシュボード統計を更新
            updateDashboardStats();
            
            // 承認データを読み込み（遅延実行）
            setTimeout(() => {
                if (document.querySelector('#approval.active')) {
                    loadApprovalData();
                }
            }, 500);
            
            console.log('✅ 初期化完了');
        });
        
        console.log('📊 Yahoo Auction Tool スクリプト読み込み完了');
    </script>
</body>
</html>

<?php
/**
 * スクレイピング実行関数（実装強化版）
 * APIサーバーと連携してYahooオークションデータを取得
 */
function executeScrapingWithAPI($url, $api_url) {
    try {
        // バリデーション
        if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
            return [
                'success' => false, 
                'error' => '有効なURLを入力してください'
            ];
        }
        
        // Yahoo オークション URLかチェック
        if (strpos($url, 'auctions.yahoo.co.jp') === false) {
            return [
                'success' => false, 
                'error' => 'Yahoo オークションのURLを入力してください'
            ];
        }
        
        // APIサーバーにリクエスト送信
        $postData = json_encode([
            'url' => $url,
            'options' => [
                'deep_scraping' => true,
                'extract_images' => true,
                'calculate_shipping' => true,
                'currency_conversion' => true,
                'target_currency' => 'USD'
            ]
        ]);
        
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $api_url . '/api/scrape_yahoo_auction',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json'
            ],
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false
        ]);
        
        $response = curl_exec($curl);
        $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        
        if ($error) {
            throw new Exception("CURL エラー: $error");
        }
        
        if ($http_code !== 200) {
            throw new Exception("HTTP エラー $http_code: APIサーバーに接続できませんでした");
        }
        
        $result = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("JSON デコードエラー: " . json_last_error_msg());
        }
        
        if (!$result || !isset($result['success'])) {
            throw new Exception("APIサーバーからの応答が不正です");
        }
        
        if (!$result['success']) {
            throw new Exception($result['error'] ?? 'スクレイピング処理に失敗しました');
        }
        
        // データベースに保存
        if (isset($result['data']) && function_exists('saveScrapedData')) {
            try {
                saveScrapedData($result['data']);
            } catch (Exception $e) {
                error_log("データベース保存エラー: " . $e->getMessage());
                // スクレイピング自体は成功なので、警告として処理継続
                $result['warnings'][] = "データベース保存に失敗しました: " . $e->getMessage();
            }
        }
        
        return [
            'success' => true,
            'data' => $result['data'] ?? [],
            'message' => $result['message'] ?? 'スクレイピング成功',
            'warnings' => $result['warnings'] ?? []
        ];
        
    } catch (Exception $e) {
        error_log("スクレイピングエラー: " . $e->getMessage());
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * スクレイピングデータをデータベースに保存
 */
function saveScrapedData($data) {
    if (!function_exists('getDatabaseConnection')) {
        throw new Exception('データベース接続関数が見つかりません');
    }
    
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        throw new Exception('データベース接続に失敗しました');
    }
    
    // データが配列の場合は個別に処理
    if (isset($data['items']) && is_array($data['items'])) {
        $items = $data['items'];
    } else {
        $items = [$data];
    }
    
    $insertedCount = 0;
    $errors = [];
    
    foreach ($items as $item) {
        try {
            // 必要なフィールドのバリデーション
            if (empty($item['title']) || empty($item['url'])) {
                $errors[] = "必須フィールドが不足しています: " . json_encode($item);
                continue;
            }
            
            // 重複チェック
            $stmt = $pdo->prepare("SELECT id FROM yahoo_scraped_products WHERE source_url = ?");
            $stmt->execute([$item['url']]);
            
            if ($stmt->fetch()) {
                continue; // 既存データはスキップ
            }
            
            // データ挿入
            $sql = "INSERT INTO yahoo_scraped_products (
                title, price_jpy, description, category, condition_text,
                image_urls, seller_info, auction_end_time, source_url,
                scraped_at, raw_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $item['title'],
                floatval($item['price'] ?? 0),
                $item['description'] ?? '',
                $item['category'] ?? '',
                $item['condition'] ?? '',
                json_encode($item['images'] ?? []),
                json_encode($item['seller'] ?? []),
                $item['end_time'] ?? null,
                $item['url'],
                json_encode($item)
            ]);
            
            $insertedCount++;
            
        } catch (PDOException $e) {
            $errors[] = "データ挿入エラー: " . $e->getMessage();
        }
    }
    
    if (!empty($errors)) {
        error_log("スクレイピングデータ保存エラー: " . implode(", ", $errors));
    }
    
    return [
        'inserted_count' => $insertedCount,
        'errors' => $errors
    ];
}

// CSV関連の応答関数
function outputCSVResponse($response) {
    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}

// ダミーデータクリーンアップ関数
function cleanupDummyData() {
    try {
        if (!function_exists('getDatabaseConnection')) {
            return ['success' => false, 'error' => 'データベース接続関数が見つかりません'];
        }
        
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['success' => false, 'error' => 'データベース接続に失敗しました'];
        }
        
        // ダミーデータ削除クエリ実行
        $deletedCount = 0;
        
        // 1. テストデータ削除
        $stmt = $pdo->prepare("DELETE FROM yahoo_scraped_products WHERE title LIKE '%テスト%' OR title LIKE '%test%' OR title LIKE '%sample%'");
        $stmt->execute();
        $deletedCount += $stmt->rowCount();
        
        // 2. 古い一時データ削除 (7日以上前)
        $stmt = $pdo->prepare("DELETE FROM yahoo_scraped_products WHERE scraped_at < NOW() - INTERVAL '7 days' AND (description IS NULL OR description = '')");
        $stmt->execute();
        $deletedCount += $stmt->rowCount();
        
        return [
            'success' => true,
            'message' => "ダミーデータ {$deletedCount} 件を削除しました",
            'deleted_count' => $deletedCount
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

?>
