<?php
/**
 * ステッププロセッサー基底クラス・具体実装
 * 各ツールとの統合連携処理
 */

require_once __DIR__ . '/../new_structure/03_approval/api/UnifiedLogger.php';

/**
 * 基底ステッププロセッサー
 */
abstract class BaseStepProcessor {
    protected $pdo;
    protected $logger;
    
    public function __construct($pdo, $logger) {
        $this->pdo = $pdo;
        $this->logger = $logger;
    }
    
    /**
     * ステップ処理（サブクラスで実装）
     */
    abstract public function process($workflowId, $stepConfig, $inputData);
    
    /**
     * HTTP API呼び出し
     */
    protected function callAPI($endpoint, $data = [], $method = 'POST') {
        $startTime = microtime(true);
        $baseUrl = 'http://localhost:8080';
        $url = $baseUrl . $endpoint;
        
        try {
            $curl = curl_init();
            
            $curlOptions = [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_SSL_VERIFYPEER => false,
            ];
            
            if ($method === 'POST') {
                $curlOptions[CURLOPT_POST] = true;
                $curlOptions[CURLOPT_POSTFIELDS] = json_encode($data);
                $curlOptions[CURLOPT_HTTPHEADER] = ['Content-Type: application/json'];
            } elseif ($method === 'GET' && !empty($data)) {
                $url .= '?' . http_build_query($data);
                $curlOptions[CURLOPT_URL] = $url;
            }
            
            curl_setopt_array($curl, $curlOptions);
            
            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $error = curl_error($curl);
            curl_close($curl);
            
            $executionTime = (microtime(true) - $startTime) * 1000;
            
            if ($error) {
                throw new Exception("cURL error: {$error}");
            }
            
            if ($httpCode >= 400) {
                throw new Exception("HTTP error: {$httpCode}");
            }
            
            $result = json_decode($response, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Invalid JSON response");
            }
            
            $this->logger->info('API call completed', [
                'endpoint' => $endpoint,
                'method' => $method,
                'http_code' => $httpCode,
                'execution_time' => $executionTime,
                'response_size' => strlen($response)
            ]);
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('API call failed', [
                'endpoint' => $endpoint,
                'method' => $method,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
}

/**
 * スクレイピングプロセッサー
 */
class ScrapingProcessor extends BaseStepProcessor {
    public function process($workflowId, $stepConfig, $inputData) {
        try {
            $yahooAuctionId = $inputData['yahoo_auction_id'] ?? null;
            if (!$yahooAuctionId) {
                throw new Exception('Yahoo Auction ID is required');
            }
            
            // 02_scraping API 呼び出し
            $result = $this->callAPI($stepConfig['endpoint'], [
                'action' => 'scrape_item',
                'auction_id' => $yahooAuctionId
            ]);
            
            if ($result['success']) {
                return [
                    'success' => true,
                    'data' => array_merge($inputData, [
                        'scraped_data' => $result['data'],
                        'title' => $result['data']['title'] ?? '',
                        'price_jpy' => $result['data']['current_price'] ?? 0,
                        'images' => $result['data']['images'] ?? [],
                        'description' => $result['data']['description'] ?? ''
                    ])
                ];
            } else {
                throw new Exception($result['message'] ?? 'Scraping failed');
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => $inputData
            ];
        }
    }
}

/**
 * フィルタリングプロセッサー
 */
class FilteringProcessor extends BaseStepProcessor {
    public function process($workflowId, $stepConfig, $inputData) {
        try {
            if (empty($inputData['scraped_data'])) {
                throw new Exception('Scraped data is required');
            }
            
            // 06_filters API 呼び出し
            $result = $this->callAPI($stepConfig['endpoint'], [
                'action' => 'filter_product',
                'product_data' => $inputData['scraped_data']
            ]);
            
            if ($result['success'] && $result['data']['passed']) {
                return [
                    'success' => true,
                    'data' => array_merge($inputData, [
                        'filter_result' => $result['data'],
                        'filter_passed' => true,
                        'filter_warnings' => $result['data']['warnings'] ?? []
                    ])
                ];
            } elseif ($result['success'] && !$result['data']['passed']) {
                throw new Exception('Product failed filtering: ' . implode(', ', $result['data']['reasons'] ?? []));
            } else {
                throw new Exception($result['message'] ?? 'Filtering failed');
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => $inputData
            ];
        }
    }
}

/**
 * 配送計算プロセッサー
 */
class ShippingProcessor extends BaseStepProcessor {
    public function process($workflowId, $stepConfig, $inputData) {
        try {
            if (empty($inputData['scraped_data'])) {
                throw new Exception('Product data is required for shipping calculation');
            }
            
            // 09_shipping API 呼び出し
            $result = $this->callAPI($stepConfig['endpoint'], [
                'action' => 'calculate_shipping',
                'product_data' => $inputData['scraped_data'],
                'destination_country' => 'US' // eBay向けなので米国
            ]);
            
            if ($result['success']) {
                return [
                    'success' => true,
                    'data' => array_merge($inputData, [
                        'shipping_data' => $result['data'],
                        'shipping_cost_usd' => $result['data']['shipping_cost_usd'] ?? 0,
                        'dimensions' => $result['data']['dimensions'] ?? null,
                        'weight' => $result['data']['weight'] ?? null
                    ])
                ];
            } else {
                throw new Exception($result['message'] ?? 'Shipping calculation failed');
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => $inputData
            ];
        }
    }
}

/**
 * カテゴリー選択プロセッサー
 */
class CategorizationProcessor extends BaseStepProcessor {
    public function process($workflowId, $stepConfig, $inputData) {
        try {
            if (empty($inputData['scraped_data'])) {
                throw new Exception('Product data is required for categorization');
            }
            
            // 11_category API 呼び出し
            $result = $this->callAPI($stepConfig['endpoint'], [
                'action' => 'categorize_product',
                'product_data' => $inputData['scraped_data'],
                'marketplace' => 'ebay'
            ]);
            
            if ($result['success']) {
                return [
                    'success' => true,
                    'data' => array_merge($inputData, [
                        'category_data' => $result['data'],
                        'ebay_category_id' => $result['data']['category_id'] ?? null,
                        'category_confidence' => $result['data']['confidence'] ?? 0
                    ])
                ];
            } else {
                throw new Exception($result['message'] ?? 'Categorization failed');
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => $inputData
            ];
        }
    }
}

/**
 * HTML生成プロセッサー
 */
class HtmlGenerationProcessor extends BaseStepProcessor {
    public function process($workflowId, $stepConfig, $inputData) {
        try {
            if (empty($inputData['scraped_data']) || empty($inputData['category_data'])) {
                throw new Exception('Product and category data are required');
            }
            
            // 12_html_editor API 呼び出し
            $result = $this->callAPI($stepConfig['endpoint'], [
                'action' => 'generate_html',
                'product_data' => $inputData['scraped_data'],
                'category_data' => $inputData['category_data'],
                'marketplace' => 'ebay'
            ]);
            
            if ($result['success']) {
                return [
                    'success' => true,
                    'data' => array_merge($inputData, [
                        'html_data' => $result['data'],
                        'ebay_description' => $result['data']['html_content'] ?? '',
                        'seo_title' => $result['data']['seo_title'] ?? $inputData['title']
                    ])
                ];
            } else {
                throw new Exception($result['message'] ?? 'HTML generation failed');
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => $inputData
            ];
        }
    }
}

/**
 * 編集プロセッサー
 */
class EditingProcessor extends BaseStepProcessor {
    public function process($workflowId, $stepConfig, $inputData) {
        try {
            // 07_editing は表示・確認用なので、データをそのまま通す
            // 実際の編集は手動で行われる
            return [
                'success' => true,
                'data' => array_merge($inputData, [
                    'editing_step_completed' => true,
                    'ready_for_approval' => true
                ])
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => $inputData
            ];
        }
    }
}

/**
 * 承認プロセッサー
 */
class ApprovalProcessor extends BaseStepProcessor {
    public function process($workflowId, $stepConfig, $inputData) {
        try {
            // 承認キューにデータを追加
            $sql = "
                INSERT INTO approval_queue (
                    workflow_id, product_id, title, price_jpy, current_price,
                    image_url, all_images, ai_confidence_score, status, deadline
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW() + INTERVAL '24 hours')
                RETURNING id
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $workflowId,
                $inputData['yahoo_auction_id'] ?? uniqid('prod_'),
                $inputData['title'] ?? 'Untitled Product',
                $inputData['price_jpy'] ?? 0,
                $inputData['price_jpy'] ?? 0,
                !empty($inputData['images']) ? $inputData['images'][0] : null,
                json_encode($inputData['images'] ?? []),
                $inputData['ai_confidence_score'] ?? 85 // デフォルト値
            ]);
            
            $approvalId = $stmt->fetchColumn();
            
            return [
                'success' => true,
                'data' => array_merge($inputData, [
                    'approval_id' => $approvalId,
                    'status' => 'waiting_approval',
                    'needs_manual_approval' => true
                ])
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => $inputData
            ];
        }
    }
}

/**
 * 出品プロセッサー
 */
class ListingProcessor extends BaseStepProcessor {
    public function process($workflowId, $stepConfig, $inputData) {
        try {
            if (empty($inputData['approval_id'])) {
                throw new Exception('Approval ID is required for listing');
            }
            
            // 出品キューにデータを追加
            $sql = "
                INSERT INTO listing_queue (
                    workflow_id, approval_id, product_id, marketplace,
                    title, description, price_usd, price_jpy, category_id,
                    images, status, priority
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)
                RETURNING id
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $workflowId,
                $inputData['approval_id'],
                $inputData['yahoo_auction_id'] ?? uniqid('prod_'),
                'ebay',
                $inputData['seo_title'] ?? $inputData['title'],
                $inputData['ebay_description'] ?? $inputData['description'],
                round(($inputData['price_jpy'] ?? 0) / 150, 2), // 簡易USD変換
                $inputData['price_jpy'] ?? 0,
                $inputData['ebay_category_id'] ?? '9355',
                json_encode($inputData['images'] ?? [])
            ]);
            
            $listingId = $stmt->fetchColumn();
            
            // 実際の出品処理を08_listing APIに委譲
            $listingResult = $this->callAPI('/new_structure/08_listing/api/listing.php', [
                'action' => 'start_listing',
                'listing_ids' => [$listingId],
                'test_mode' => true // 設定で制御
            ]);
            
            return [
                'success' => true,
                'data' => array_merge($inputData, [
                    'listing_id' => $listingId,
                    'listing_result' => $listingResult,
                    'status' => 'listed'
                ])
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => $inputData
            ];
        }
    }
}

/**
 * 在庫管理プロセッサー
 */
class InventoryProcessor extends BaseStepProcessor {
    public function process($workflowId, $stepConfig, $inputData) {
        try {
            if (empty($inputData['listing_id'])) {
                throw new Exception('Listing ID is required for inventory update');
            }
            
            // 10_zaiko API 呼び出し（実装時に有効化）
            $result = [
                'success' => true,
                'data' => [
                    'inventory_updated' => true,
                    'ebay_item_id' => $inputData['ebay_item_id'] ?? null
                ]
            ];
            
            return [
                'success' => true,
                'data' => array_merge($inputData, [
                    'inventory_updated' => true,
                    'workflow_completed' => true,
                    'final_status' => 'completed'
                ])
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => $inputData
            ];
        }
    }
}
