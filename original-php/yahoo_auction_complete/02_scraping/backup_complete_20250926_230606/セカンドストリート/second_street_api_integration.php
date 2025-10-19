<?php
/**
 * セカンドストリート系 API統合エンドポイント
 * 
 * 4つのセカンドストリート系サイトに対応
 * 1. www.2ndstreet.jp/buy (買取サイト)
 * 2. golf-kace.com (ゴルフ専門)
 * 3. ec.golf-kace.com (ゴルフEC)
 * 4. www.2ndstreet.jp/search (検索・一覧)
 * 
 * @version 1.0.0
 * @created 2025-09-25
 */

require_once __DIR__ . '/../../platforms/second_street/SecondStreetScraper.php';
require_once __DIR__ . '/../mercari_api_endpoints.php'; // 既存のAPI基盤を継承

/**
 * セカンドストリート系API拡張クラス
 */
class SecondStreetApiExtension extends ApiRouter {
    
    /**
     * セカンドストリート専用ルーティング処理
     */
    protected function handleSecondStreetRequests($method, $action, $id) {
        switch ($method) {
            case 'POST':
                switch ($action) {
                    case 'second_street':
                        $this->scrapeSecondStreetProduct();
                        break;
                    
                    case 'batch_second_street':
                        $this->scrapeSecondStreetBatch();
                        break;
                        
                    case 'search_scrape':
                        $this->scrapeSecondStreetSearch();
                        break;
                    
                    default:
                        ApiResponse::error('未知のセカンドストリートアクション', 404);
                }

/**
 * セカンドストリート専用Web UI統合
 */
?>

<script>
// セカンドストリート専用JavaScript拡張
class SecondStreetUIExtension {
    constructor() {
        this.initializeSecondStreetFeatures();
    }
    
    initializeSecondStreetFeatures() {
        // セカンドストリート専用の検索機能を追加
        this.addSearchFeature();
        this.addSiteAnalysisFeature();
        this.addBrandFilterFeature();
    }
    
    // 検索機能追加
    addSearchFeature() {
        const searchContainer = document.createElement('div');
        searchContainer.innerHTML = `
            <div class="second-street-search" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                <h4>🔍 セカンドストリート検索ページスクレイピング</h4>
                <div class="form-group">
                    <label for="searchUrl">検索ページURL</label>
                    <input type="url" id="searchUrl" placeholder="https://www.2ndstreet.jp/search?category=130001&shops[]=17284&page=1" style="width: 100%;">
                </div>
                <div style="display: flex; gap: 10px;">
                    <div class="form-group" style="flex: 1;">
                        <label for="maxPages">最大ページ数</label>
                        <select id="maxPages">
                            <option value="1">1ページ</option>
                            <option value="3" selected>3ページ</option>
                            <option value="5">5ページ</option>
                            <option value="10">10ページ</option>
                        </select>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>
                            <input type="checkbox" id="autoScrape" checked> 
                            商品も自動でスクレイピング
                        </label>
                    </div>
                </div>
                <button class="btn btn-success" onclick="secondStreetUI.scrapeSearchPage()">
                    🔍 検索ページをスクレイピング
                </button>
            </div>
        `;
        
        // メインコンテンツの最初のカードの後に挿入
        const firstCard = document.querySelector('.card');
        if (firstCard && firstCard.parentNode) {
            firstCard.parentNode.insertBefore(searchContainer, firstCard.nextSibling);
        }
    }
    
    // サイト分析機能追加
    addSiteAnalysisFeature() {
        const analysisContainer = document.createElement('div');
        analysisContainer.innerHTML = `
            <div class="second-street-analysis" style="margin-top: 20px;">
                <h4>📊 セカンドストリートサイト分析</h4>
                <div style="display: flex; gap: 10px;">
                    <button class="btn" onclick="secondStreetUI.loadSiteAnalysis()">
                        📈 サイト別分析
                    </button>
                    <button class="btn" onclick="secondStreetUI.loadCategoryBreakdown()">
                        🏷️ カテゴリ分析
                    </button>
                </div>
                <div id="analysisResults" style="margin-top: 15px;"></div>
            </div>
        `;
        
        // 在庫管理カードに追加
        const inventoryCard = document.querySelector('.card:nth-child(2)');
        if (inventoryCard) {
            inventoryCard.appendChild(analysisContainer);
        }
    }
    
    // ブランドフィルター機能追加
    addBrandFilterFeature() {
        const brandFilter = document.createElement('option');
        brandFilter.value = 'second_street';
        brandFilter.textContent = 'セカンドストリート';
        
        const platformFilter = document.getElementById('platformFilter');
        if (platformFilter) {
            platformFilter.appendChild(brandFilter);
        }
    }
    
    // 検索ページスクレイピング実行
    async scrapeSearchPage() {
        const searchUrl = document.getElementById('searchUrl').value.trim();
        const maxPages = parseInt(document.getElementById('maxPages').value);
        const autoScrape = document.getElementById('autoScrape').checked;
        
        if (!searchUrl) {
            alert('検索ページURLを入力してください');
            return;
        }
        
        showLoading();
        
        try {
            const response = await fetch('/api/second_street/search_scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    search_url: searchUrl,
                    max_pages: maxPages,
                    auto_scrape: autoScrape
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.displaySearchResults(result.data);
                if (result.data.scraping_result) {
                    loadStats();
                    loadInventory();
                }
            } else {
                displayError('検索スクレイピング失敗: ' + result.message);
            }
            
        } catch (error) {
            displayError('通信エラー: ' + error.message);
        } finally {
            hideLoading();
        }
    }
    
    // 検索結果表示
    displaySearchResults(data) {
        const html = `
            <div class="result-item success">
                <h3>🔍 検索スクレイピング完了</h3>
                <p>検索URL: ${data.search_url}</p>
                <p>スクレイピング页数: ${data.pages_scraped}页</p>
                <p>発見商品数: ${data.products_found}件</p>
                ${data.scraping_result ? `
                    <h4>自動スクレイピング結果:</h4>
                    <p>成功: ${data.scraping_result.success}件</p>
                    <p>失敗: ${data.scraping_result.errors}件</p>
                ` : ''}
                <details>
                    <summary>発見した商品URL一覧 (${data.product_urls.length}件)</summary>
                    <div style="max-height: 200px; overflow-y: auto; margin-top: 10px;">
                        ${data.product_urls.map(url => `<div style="font-size: 12px; margin: 2px 0;">${url}</div>`).join('')}
                    </div>
                </details>
            </div>
        `;
        
        const container = document.getElementById('resultContainer');
        container.innerHTML = html + container.innerHTML;
    }
    
    // サイト分析読み込み
    async loadSiteAnalysis() {
        showLoading();
        
        try {
            const response = await fetch('/api/second_street/site_analysis');
            const result = await response.json();
            
            if (result.success) {
                this.displaySiteAnalysis(result.data);
            } else {
                displayError('サイト分析の取得に失敗しました');
            }
            
        } catch (error) {
            displayError('通信エラー: ' + error.message);
        } finally {
            hideLoading();
        }
    }
    
    // サイト分析表示
    displaySiteAnalysis(data) {
        const analysisHtml = `
            <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 10px;">
                <h5>📈 サイト別分析結果</h5>
                ${data.site_analysis.map(site => `
                    <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 3px;">
                        <h6>${site.site_name}</h6>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; font-size: 12px;">
                            <div>商品数: ${site.product_count}</div>
                            <div>平均価格: ¥${Math.round(site.avg_price).toLocaleString()}</div>
                            <div>最高価格: ¥${Math.round(site.max_price).toLocaleString()}</div>
                            <div>成約率: ${site.success_rate}%</div>
                        </div>
                    </div>
                `).join('')}
                
                <div style="margin-top: 15px;">
                    <h6>💡 インサイト</h6>
                    <ul style="font-size: 13px;">
                        ${data.insights.map(insight => `<li>${insight}</li>`).join('')}
                    </ul>
                </div>
                
                <div style="margin-top: 15px;">
                    <h6>📋 推奨事項</h6>
                    <ul style="font-size: 13px;">
                        ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        document.getElementById('analysisResults').innerHTML = analysisHtml;
    }
    
    // カテゴリ分析読み込み
    async loadCategoryBreakdown() {
        showLoading();
        
        try {
            const response = await fetch('/api/second_street/category_breakdown');
            const result = await response.json();
            
            if (result.success) {
                this.displayCategoryBreakdown(result.data);
            } else {
                displayError('カテゴリ分析の取得に失敗しました');
            }
            
        } catch (error) {
            displayError('通信エラー: ' + error.message);
        } finally {
            hideLoading();
        }
    }
    
    // カテゴリ分析表示
    displayCategoryBreakdown(data) {
        const categoryHtml = `
            <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 10px;">
                <h5>🏷️ カテゴリ別分析結果</h5>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${data.category_summary.map(category => `
                        <div style="border: 1px solid #eee; padding: 8px; margin: 5px 0; border-radius: 3px;">
                            <div style="font-weight: bold;">${category.category}</div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; font-size: 11px; margin-top: 5px;">
                                <div>商品数: ${category.total_products}</div>
                                <div>平均: ¥${Math.round(category.avg_price).toLocaleString()}</div>
                                <div>サイト数: ${category.sites.length}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.getElementById('analysisResults').innerHTML = categoryHtml;
    }
}

// グローバルインスタンス作成
let secondStreetUI = null;

// ページ読み込み完了時にセカンドストリート機能を初期化
document.addEventListener('DOMContentLoaded', function() {
    // 既存の初期化に加えてセカンドストリート機能も追加
    if (window.location.pathname.includes('second_street') || document.title.includes('セカンドストリート')) {
        secondStreetUI = new SecondStreetUIExtension();
    }
});
</script>

<?php
?>
                break;
            
            case 'GET':
                switch ($action) {
                    case 'second_street_status':
                        $this->getSecondStreetStatus();
                        break;
                        
                    case 'site_analysis':
                        $this->getSecondStreetSiteAnalysis();
                        break;
                        
                    case 'category_breakdown':
                        $this->getCategoryBreakdown();
                        break;
                    
                    default:
                        ApiResponse::error('未サポートのGETアクション', 405);
                }
                break;
            
            default:
                ApiResponse::error('未サポートのHTTPメソッド', 405);
        }
    }
    
    /**
     * セカンドストリート商品スクレイピング
     */
    private function scrapeSecondStreetProduct() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['url'])) {
            ApiResponse::error('URLが必要です', 400);
        }
        
        $url = $input['url'];
        $expectedPrice = $input['expected_price'] ?? null;
        
        try {
            $scraper = new SecondStreetScraper($this->pdo);
            $result = $scraper->scrapeProduct($url);
            
            // 販売予定価格を設定
            if ($expectedPrice && $result['success']) {
                $this->updateExpectedPrice($result['product_id'], $expectedPrice);
                $result['data']['expected_selling_price'] = $expectedPrice;
            }
            
            // サイトタイプ情報を追加
            if ($result['success']) {
                $result['site_info'] = $this->getSiteInfo($result['site_type'] ?? 'main');
            }
            
            $this->logger->info("セカンドストリートスクレイピング完了: {$url}");
            ApiResponse::success($result);
            
        } catch (Exception $e) {
            $this->logger->error("セカンドストリートスクレイピングエラー: " . $e->getMessage());
            ApiResponse::error($e->getMessage(), 500);
        }
    }
    
    /**
     * セカンドストリート一括スクレイピング
     */
    private function scrapeSecondStreetBatch() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['urls']) || !is_array($input['urls'])) {
            ApiResponse::error('URLs配列が必要です', 400);
        }
        
        $urls = $input['urls'];
        
        if (count($urls) > 25) { // 中古品サイトなのでより制限的に
            ApiResponse::error('一度に処理できるのは最大25件です', 400);
        }
        
        try {
            $processor = new SecondStreetBatchProcessor($this->pdo);
            $result = $processor->processBatch($urls);
            
            $this->logger->info("セカンドストリート一括スクレイピング完了: " . count($urls) . "件");
            ApiResponse::success($result);
            
        } catch (Exception $e) {
            $this->logger->error("セカンドストリート一括スクレイピングエラー: " . $e->getMessage());
            ApiResponse::error($e->getMessage(), 500);
        }
    }
    
    /**
     * セカンドストリート検索ページスクレイピング
     */
    private function scrapeSecondStreetSearch() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['search_url'])) {
            ApiResponse::error('検索URLが必要です', 400);
        }
        
        $searchUrl = $input['search_url'];
        $maxPages = min((int)($input['max_pages'] ?? 3), 10); // 最大10ページ
        $autoScrape = $input['auto_scrape'] ?? false;
        
        try {
            $processor = new SecondStreetBatchProcessor($this->pdo);
            $productUrls = $processor->scrapeSearchPage($searchUrl, $maxPages);
            
            $result = [
                'search_url' => $searchUrl,
                'pages_scraped' => $maxPages,
                'products_found' => count($productUrls),
                'product_urls' => $productUrls
            ];
            
            // 自動で商品スクレイピングも実行
            if ($autoScrape && !empty($productUrls)) {
                $this->logger->info("自動商品スクレイピング開始: " . count($productUrls) . "件");
                $scrapingResult = $processor->processBatch(array_slice($productUrls, 0, 20)); // 最大20件
                $result['scraping_result'] = $scrapingResult;
            }
            
            $this->logger->info("セカンドストリート検索スクレイピング完了: " . count($productUrls) . "件発見");
            ApiResponse::success($result);
            
        } catch (Exception $e) {
            $this->logger->error("セカンドストリート検索スクレイピングエラー: " . $e->getMessage());
            ApiResponse::error($e->getMessage(), 500);
        }
    }
    
    /**
     * セカンドストリート状態取得
     */
    private function getSecondStreetStatus() {
        try {
            // セカンドストリート固有の統計
            $stmt = $this->pdo->query("
                SELECT 
                    COUNT(*) as total_products,
                    SUM(CASE WHEN url_status = 'active' THEN 1 ELSE 0 END) as active_products,
                    SUM(CASE WHEN url_status = 'sold' THEN 1 ELSE 0 END) as sold_products,
                    AVG(purchase_price) as avg_price,
                    MAX(purchase_price) as max_price,
                    MIN(purchase_price) as min_price,
                    COUNT(DISTINCT JSON_EXTRACT(additional_data, '$.site_type')) as site_types
                FROM supplier_products 
                WHERE platform = 'second_street'
            ");
            
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // サイト別統計
            $siteStmt = $this->pdo->query("
                SELECT 
                    JSON_EXTRACT(additional_data, '$.site_type') as site_type,
                    COUNT(*) as product_count,
                    AVG(purchase_price) as avg_price,
                    MAX(purchase_price) as max_price
                FROM supplier_products 
                WHERE platform = 'second_street'
                AND JSON_EXTRACT(additional_data, '$.site_type') IS NOT NULL
                GROUP BY JSON_EXTRACT(additional_data, '$.site_type')
            ");
            
            $siteStats = $siteStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // ブランド別統計
            $brandStmt = $this->pdo->query("
                SELECT 
                    JSON_EXTRACT(additional_data, '$.brand') as brand,
                    COUNT(*) as product_count,
                    AVG(purchase_price) as avg_price
                FROM supplier_products 
                WHERE platform = 'second_street'
                AND JSON_EXTRACT(additional_data, '$.brand') IS NOT NULL
                AND JSON_EXTRACT(additional_data, '$.brand') != ''
                GROUP BY JSON_EXTRACT(additional_data, '$.brand')
                ORDER BY product_count DESC
                LIMIT 10
            ");
            
            $brandStats = $brandStmt->fetchAll(PDO::FETCH_ASSOC);
            
            ApiResponse::success([
                'platform' => 'second_street',
                'overall_statistics' => $stats,
                'site_breakdown' => $siteStats,
                'top_brands' => $brandStats,
                'server_time' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            $this->logger->error("セカンドストリート状態取得エラー: " . $e->getMessage());
            ApiResponse::error('状態の取得に失敗しました', 500);
        }
    }
    
    /**
     * セカンドストリートサイト分析
     */
    private function getSecondStreetSiteAnalysis() {
        try {
            // 各サイトの特徴分析
            $analysisData = [];
            
            $siteTypes = ['main', 'golf_kace', 'golf_kace_ec'];
            
            foreach ($siteTypes as $siteType) {
                $stmt = $this->pdo->prepare("
                    SELECT 
                        COUNT(*) as product_count,
                        AVG(purchase_price) as avg_price,
                        MAX(purchase_price) as max_price,
                        MIN(purchase_price) as min_price,
                        COUNT(CASE WHEN url_status = 'active' THEN 1 END) as active_count,
                        COUNT(CASE WHEN url_status = 'sold' THEN 1 END) as sold_count,
                        COUNT(DISTINCT JSON_EXTRACT(additional_data, '$.category')) as category_count
                    FROM supplier_products 
                    WHERE platform = 'second_street' 
                    AND JSON_EXTRACT(additional_data, '$.site_type') = ?
                ");
                $stmt->execute([$siteType]);
                $siteData = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($siteData['product_count'] > 0) {
                    $siteData['site_type'] = $siteType;
                    $siteData['site_name'] = $this->getSiteInfo($siteType)['name'];
                    $siteData['success_rate'] = $siteData['active_count'] > 0 ? 
                        round($siteData['sold_count'] / ($siteData['sold_count'] + $siteData['active_count']) * 100, 1) : 0;
                    
                    $analysisData[] = $siteData;
                }
            }
            
            // インサイト生成
            $insights = $this->generateSecondStreetInsights($analysisData);
            
            ApiResponse::success([
                'site_analysis' => $analysisData,
                'insights' => $insights,
                'recommendations' => $this->generateRecommendations($analysisData)
            ]);
            
        } catch (Exception $e) {
            $this->logger->error("セカンドストリートサイト分析エラー: " . $e->getMessage());
            ApiResponse::error('サイト分析の取得に失敗しました', 500);
        }
    }
    
    /**
     * カテゴリ別分析
     */
    private function getCategoryBreakdown() {
        try {
            $stmt = $this->pdo->query("
                SELECT 
                    JSON_EXTRACT(additional_data, '$.category') as category,
                    JSON_EXTRACT(additional_data, '$.site_type') as site_type,
                    COUNT(*) as product_count,
                    AVG(purchase_price) as avg_price,
                    MAX(purchase_price) as max_price,
                    MIN(purchase_price) as min_price
                FROM supplier_products 
                WHERE platform = 'second_street'
                AND JSON_EXTRACT(additional_data, '$.category') IS NOT NULL
                AND JSON_EXTRACT(additional_data, '$.category') != 'その他'
                GROUP BY JSON_EXTRACT(additional_data, '$.category'), JSON_EXTRACT(additional_data, '$.site_type')
                ORDER BY product_count DESC
            ");
            
            $categoryData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // カテゴリごとのサマリー作成
            $categorySummary = [];
            foreach ($categoryData as $row) {
                $category = $row['category'];
                if (!isset($categorySummary[$category])) {
                    $categorySummary[$category] = [
                        'category' => $category,
                        'total_products' => 0,
                        'avg_price' => 0,
                        'sites' => []
                    ];
                }
                
                $categorySummary[$category]['total_products'] += $row['product_count'];
                $categorySummary[$category]['avg_price'] += $row['avg_price'];
                $categorySummary[$category]['sites'][] = [
                    'site_type' => $row['site_type'],
                    'product_count' => $row['product_count'],
                    'avg_price' => $row['avg_price']
                ];
            }
            
            // 平均価格を正しく計算
            foreach ($categorySummary as &$summary) {
                $totalPrice = 0;
                $totalCount = 0;
                foreach ($summary['sites'] as $site) {
                    $totalPrice += $site['avg_price'] * $site['product_count'];
                    $totalCount += $site['product_count'];
                }
                $summary['avg_price'] = $totalCount > 0 ? round($totalPrice / $totalCount, 2) : 0;
            }
            
            ApiResponse::success([
                'detailed_breakdown' => $categoryData,
                'category_summary' => array_values($categorySummary)
            ]);
            
        } catch (Exception $e) {
            $this->logger->error("カテゴリ分析エラー: " . $e->getMessage());
            ApiResponse::error('カテゴリ分析の取得に失敗しました', 500);
        }
    }
    
    /**
     * サイト情報取得
     */
    private function getSiteInfo($siteType) {
        $siteInfoMap = [
            'main' => [
                'name' => '2ndSTREET メイン',
                'description' => 'セカンドストリートのメインサイト（買取・一般商品）',
                'url' => 'https://www.2ndstreet.jp'
            ],
            'golf_kace' => [
                'name' => 'GOLF KACE',
                'description' => 'ゴルフ用品専門サイト',
                'url' => 'https://golf-kace.com'
            ],
            'golf_kace_ec' => [
                'name' => 'GOLF KACE EC',
                'description' => 'ゴルフ用品専門ECサイト',
                'url' => 'https://ec.golf-kace.com'
            ]
        ];
        
        return $siteInfoMap[$siteType] ?? $siteInfoMap['main'];
    }
    
    /**
     * セカンドストリートインサイト生成
     */
    private function generateSecondStreetInsights($analysisData) {
        $insights = [];
        
        if (count($analysisData) < 2) {
            return ['データが不足しているため、詳細な分析ができません'];
        }
        
        // 価格比較インサイト
        usort($analysisData, function($a, $b) {
            return $b['avg_price'] <=> $a['avg_price'];
        });
        
        $highest = $analysisData[0];
        $lowest = end($analysisData);
        
        $insights[] = "{$highest['site_name']}の平均価格が最も高い（¥" . number_format($highest['avg_price']) . "）";
        $insights[] = "{$lowest['site_name']}の平均価格が最も低い（¥" . number_format($lowest['avg_price']) . "）";
        
        // 商品数比較
        usort($analysisData, function($a, $b) {
            return $b['product_count'] <=> $a['product_count'];
        });
        
        $mostProducts = $analysisData[0];
        $insights[] = "{$mostProducts['site_name']}の登録商品数が最多（{$mostProducts['product_count']}件）";
        
        // 成約率分析
        $bestSuccess = null;
        $bestSuccessRate = 0;
        
        foreach ($analysisData as $site) {
            if ($site['success_rate'] > $bestSuccessRate) {
                $bestSuccess = $site;
                $bestSuccessRate = $site['success_rate'];
            }
        }
        
        if ($bestSuccess) {
            $insights[] = "{$bestSuccess['site_name']}の成約率が最も高い（{$bestSuccessRate}%）";
        }
        
        return $insights;
    }
    
    /**
     * 推奨事項生成
     */
    private function generateRecommendations($analysisData) {
        $recommendations = [];
        
        foreach ($analysisData as $site) {
            if ($site['avg_price'] > 50000) {
                $recommendations[] = "{$site['site_name']}は高単価商品が多いため、利益率重視の戦略が有効";
            }
            
            if ($site['success_rate'] > 50) {
                $recommendations[] = "{$site['site_name']}は成約率が高いため、積極的な仕入れを推奨";
            }
            
            if ($site['product_count'] < 10) {
                $recommendations[] = "{$site['site_name']}の商品数が少ないため、スクレイピング頻度を上げることを検討";
            }
        }
        
        // ゴルフ関連の推奨
        $golfSites = array_filter($analysisData, function($site) {
            return strpos($site['site_type'], 'golf') !== false;
        });
        
        if (!empty($golfSites)) {
            $recommendations[] = "ゴルフ用品の専門サイトがあるため、季節性を考慮した仕入れ戦略が重要";
        }
        
        return $recommendations;
    }
}

/**
 * セカンドストリート用API統合管理クラス
 */
class SecondStreetApiManager {
    private $apiExtension;
    
    public function __construct() {
        $this->apiExtension = new SecondStreetApiExtension();
    }
    
    /**
     * リクエスト処理
     */
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $pathParts = explode('/', trim($path, '/'));
        
        // セカンドストリート専用パスの処理
        if (count($pathParts) >= 3 && $pathParts[0] === 'api' && $pathParts[1] === 'second_street') {
            $action = $pathParts[2] ?? '';
            $id = $pathParts[3] ?? null;
            
            $this->apiExtension->handleSecondStreetRequests($method, $action, $id);
        } else {
            // 既存のAPIルーターに委譲
            $this->apiExtension->handleRequest();
        }
    }
}

// ルートファイル用の設定
if (!defined('API_ROUTER_INCLUDED')) {
    define('API_ROUTER_INCLUDED', true);
    
    // .htaccess リライトルール（参考）
    /*
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^api/second_street/(.*)$ /api_unified/second_street_api.php [QSA,L]
    */
    
    // 直接呼び出し時の処理
    try {
        $manager = new SecondStreetApiManager();
        $manager->handleRequest();
    } catch (Exception $e) {
        error_log('セカンドストリート API エラー: ' . $e->getMessage());
        ApiResponse::error('システムエラーが発生しました', 500);
    }
}