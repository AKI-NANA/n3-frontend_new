<?php
/**
 * NAGANO-3 仕入れ管理システム コントローラー
 * 
 * 機能: 受注ベース仕入れ候補管理・AI選定・利益計算・優先度管理
 * アーキテクチャ: modules層・受注管理システム連携
 * 連携: 在庫管理システム・AI分析・価格比較エンジン
 */

session_start();

class ShiireKanriManager {
    private $zaiko_manager;
    private $ai_recommendation_engine;
    private $price_comparison_api;
    private $rieki_calculator;
    
    public function __construct() {
        // 在庫管理システム連携
        require_once '../../../common/integrations/zaiko_kanri_integration.php';
        $this->zaiko_manager = new ZaikoKanriIntegration();
        
        // AI推奨システム連携
        require_once '../../../orchestrator/php/ai_recommendation_engine.php';
        $this->ai_recommendation_engine = new AIRecommendationEngine();
        
        // 価格比較API連携
        require_once '../../../orchestrator/php/price_comparison_api.php';
        $this->price_comparison_api = new PriceComparisonAPI();
        
        // 利益計算システム連携
        require_once '../rieki_bunseki/php/rieki_bunseki_controller.php';
        $this->rieki_calculator = new RiekiBunsekiManager();
    }
    
    /**
     * 仕入れ必要商品一覧取得
     */
    public function getShiireHitsuyoIchiran($filter_params = []) {
        try {
            // 受注データから仕入れ必要商品抽出
            $juchu_orders = $this->getActiveOrders($filter_params);
            
            $shiire_hitsuyou_items = [];
            
            foreach ($juchu_orders as $order) {
                $sku = $order['custom_label'];
                
                // 在庫状況確認
                $zaiko_jokyo = $this->zaiko_manager->getZaikoJokyo($sku);
                
                // 仕入れ必要性判定
                if ($this->isShiireHitsuyou($order, $zaiko_jokyo)) {
                    $shiire_item = $this->createShiireItem($order, $zaiko_jokyo);
                    $shiire_hitsuyou_items[] = $shiire_item;
                }
            }
            
            // 優先度でソート
            usort($shiire_hitsuyou_items, [$this, 'sortByYusenudo']);
            
            return [
                'status' => 'success',
                'data' => $shiire_hitsuyou_items,
                'total_count' => count($shiire_hitsuyou_items),
                'filter_applied' => $filter_params
            ];
            
        } catch (Exception $e) {
            error_log("Shiire Kanri Error: " . $e->getMessage());
            
            return [
                'status' => 'error',
                'error_message' => '仕入れデータの取得に失敗しました。',
                'data' => []
            ];
        }
    }
    
    /**
     * 仕入れアイテム作成
     */
    private function createShiireItem($order, $zaiko_jokyo) {
        $sku = $order['custom_label'];
        
        // 仕入れ候補取得
        $shiire_candidates = $this->getShiireCandidates($sku);
        
        // AI推奨候補選定
        $ai_recommended = $this->ai_recommendation_engine->selectBestCandidate($shiire_candidates, $order);
        
        // 利益計算実行
        $rieki_yosoku = $this->calculateExpectedProfit($order, $ai_recommended);
        
        // 優先度計算
        $yusenudo = $this->calculateYusenudo($order, $zaiko_jokyo, $rieki_yosoku);
        
        return [
            'shiire_item_id' => $this->generateShiireItemId($order['order_id'], $sku),
            
            // 受注情報
            'juchu_bangou' => $order['order_id'],
            'juchu_nichiji' => $order['created_date'],
            'hakko_kigen' => $order['shipping_deadline'],
            'shohin_title' => $order['item_title'],
            'shohin_gazo' => $order['item_image_url'],
            'custom_label' => $sku,
            'hanbai_kakaku' => $order['total_amount'],
            
            // 在庫情報
            'genzai_zaiko' => $zaiko_jokyo['current_stock'] ?? 0,
            'hitsuyou_suuryou' => $this->calculateHitsuyouSuuryou($order, $zaiko_jokyo),
            'zaiko_basho' => $zaiko_jokyo['storage_location'] ?? '',
            'saigo_shiire_bi' => $zaiko_jokyo['last_purchase_date'] ?? null,
            
            // 仕入れ候補情報
            'shiire_candidates' => $shiire_candidates,
            'ai_recommended' => $ai_recommended,
            'suisen_riyu' => $ai_recommended['recommendation_reason'] ?? '',
            
            // 利益予測
            'yosoku_genka' => $ai_recommended['estimated_cost'] ?? 0,
            'yosoku_rieki' => $rieki_yosoku['expected_profit'] ?? 0,
            'rieki_ritsu' => $rieki_yosoku['profit_rate'] ?? 0,
            
            // 優先度・ステータス
            'yusenudo_score' => $yusenudo['score'],
            'yusenudo_level' => $yusenudo['level'],
            'kinkyuu_flg' => $yusenudo['urgent'],
            'shiire_status' => $this->getShiireStatus($sku),
            'jikko_yotei_bi' => $this->calculateJikkoYoteiBi($order['shipping_deadline'])
        ];
    }
    
    /**
     * 仕入れ候補取得
     */
    public function getShiireCandidates($sku) {
        try {
            // 複数ソースから仕入れ候補取得
            $candidates = [];
            
            // Amazon候補
            $amazon_candidates = $this->price_comparison_api->searchAmazon($sku);
            foreach ($amazon_candidates as $candidate) {
                $candidates[] = [
                    'source' => 'Amazon',
                    'product_url' => $candidate['url'],
                    'asin' => $candidate['asin'],
                    'title' => $candidate['title'],
                    'price' => $candidate['price'],
                    'availability' => $candidate['availability'],
                    'prime_eligible' => $candidate['prime'] ?? false,
                    'rating' => $candidate['rating'] ?? 0,
                    'delivery_days' => $candidate['delivery_days'] ?? 3,
                    'ai_score' => $this->calculateCandidateScore($candidate, 'Amazon')
                ];
            }
            
            // 楽天候補
            $rakuten_candidates = $this->price_comparison_api->searchRakuten($sku);
            foreach ($rakuten_candidates as $candidate) {
                $candidates[] = [
                    'source' => '楽天',
                    'product_url' => $candidate['url'],
                    'shop_name' => $candidate['shop_name'],
                    'title' => $candidate['title'],
                    'price' => $candidate['price'],
                    'availability' => $candidate['availability'],
                    'rakuten_point' => $candidate['points'] ?? 0,
                    'delivery_days' => $candidate['delivery_days'] ?? 5,
                    'ai_score' => $this->calculateCandidateScore($candidate, 'Rakuten')
                ];
            }
            
            // Yahoo!ショッピング候補
            $yahoo_candidates = $this->price_comparison_api->searchYahoo($sku);
            foreach ($yahoo_candidates as $candidate) {
                $candidates[] = [
                    'source' => 'Yahoo!ショッピング',
                    'product_url' => $candidate['url'],
                    'shop_name' => $candidate['shop_name'],
                    'title' => $candidate['title'],
                    'price' => $candidate['price'],
                    'availability' => $candidate['availability'],
                    'yahoo_point' => $candidate['points'] ?? 0,
                    'delivery_days' => $candidate['delivery_days'] ?? 5,
                    'ai_score' => $this->calculateCandidateScore($candidate, 'Yahoo')
                ];
            }
            
            // 既存仕入れ先候補
            $existing_suppliers = $this->getExistingSuppliers($sku);
            foreach ($existing_suppliers as $supplier) {
                $candidates[] = [
                    'source' => '既存仕入れ先',
                    'supplier_name' => $supplier['name'],
                    'product_url' => $supplier['url'],
                    'title' => $supplier['title'],
                    'price' => $supplier['price'],
                    'availability' => $supplier['availability'],
                    'last_purchase_date' => $supplier['last_purchase'],
                    'reliability_score' => $supplier['reliability'],
                    'delivery_days' => $supplier['delivery_days'] ?? 7,
                    'ai_score' => $this->calculateCandidateScore($supplier, 'Existing')
                ];
            }
            
            // AIスコア順でソート
            usort($candidates, function($a, $b) {
                return $b['ai_score'] - $a['ai_score'];
            });
            
            return array_slice($candidates, 0, 10); // 上位10件まで
            
        } catch (Exception $e) {
            error_log("Shiire Candidates Error: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 候補スコア計算
     */
    private function calculateCandidateScore($candidate, $source) {
        $score = 0;
        
        // 価格スコア（安いほど高得点）
        $price_score = max(0, 100 - ($candidate['price'] / 100)); // 簡易計算
        $score += $price_score * 0.4;
        
        // 可用性スコア
        if ($candidate['availability'] === 'in_stock') {
            $score += 30;
        } elseif ($candidate['availability'] === 'limited') {
            $score += 15;
        }
        
        // 配送スコア（早いほど高得点）
        $delivery_score = max(0, 20 - ($candidate['delivery_days'] ?? 7));
        $score += $delivery_score;
        
        // ソース別ボーナス
        switch ($source) {
            case 'Amazon':
                if ($candidate['prime_eligible'] ?? false) {
                    $score += 15;
                }
                if (($candidate['rating'] ?? 0) >= 4.0) {
                    $score += 10;
                }
                break;
                
            case 'Existing':
                $score += ($candidate['reliability_score'] ?? 0) * 0.2;
                $score += 10; // 既存仕入れ先ボーナス
                break;
                
            case 'Rakuten':
            case 'Yahoo':
                if (($candidate['points'] ?? 0) > 0) {
                    $score += 5;
                }
                break;
        }
        
        return min(100, max(0, $score));
    }
    
    /**
     * 期待利益計算
     */
    private function calculateExpectedProfit($order, $recommended_candidate) {
        if (!$recommended_candidate) {
            return [
                'expected_profit' => 0,
                'profit_rate' => 0,
                'calculation_details' => []
            ];
        }
        
        $hanbai_kakaku = $order['total_amount'];
        $shiire_genka = $recommended_candidate['price'];
        
        // 手数料計算
        $ebay_tesuryo = $hanbai_kakaku * 0.1; // 10%と仮定
        $payment_tesuryo = $hanbai_kakaku * 0.035; // 3.5%と仮定
        
        // 送料計算（配送API連携）
        $estimated_shipping = $this->estimateShippingCost($order);
        
        // 利益計算
        $sousouryo = $hanbai_kakaku - $ebay_tesuryo - $payment_tesuryo;
        $expected_profit = $sousouryo - $shiire_genka - $estimated_shipping;
        $profit_rate = ($expected_profit / $hanbai_kakaku) * 100;
        
        return [
            'expected_profit' => $expected_profit,
            'profit_rate' => $profit_rate,
            'calculation_details' => [
                'hanbai_kakaku' => $hanbai_kakaku,
                'shiire_genka' => $shiire_genka,
                'ebay_tesuryo' => $ebay_tesuryo,
                'payment_tesuryo' => $payment_tesuryo,
                'estimated_shipping' => $estimated_shipping,
                'sousouryo' => $sousouryo
            ]
        ];
    }
    
    /**
     * 優先度計算
     */
    private function calculateYusenudo($order, $zaiko_jokyo, $rieki_yosoku) {
        $score = 0;
        $factors = [];
        
        // 発送期限による緊急度
        $days_until_deadline = ceil((strtotime($order['shipping_deadline']) - time()) / (60*60*24));
        if ($days_until_deadline <= 1) {
            $score += 50;
            $factors[] = '発送期限まで1日以内';
        } elseif ($days_until_deadline <= 3) {
            $score += 30;
            $factors[] = '発送期限まで3日以内';
        } elseif ($days_until_deadline <= 7) {
            $score += 15;
            $factors[] = '発送期限まで1週間以内';
        }
        
        // 在庫状況
        $current_stock = $zaiko_jokyo['current_stock'] ?? 0;
        if ($current_stock <= 0) {
            $score += 40;
            $factors[] = '在庫切れ';
        } elseif ($current_stock <= 2) {
            $score += 25;
            $factors[] = '在庫僅少';
        }
        
        // 利益率
        $profit_rate = $rieki_yosoku['profit_rate'] ?? 0;
        if ($profit_rate >= 30) {
            $score += 20;
            $factors[] = '高利益率商品';
        } elseif ($profit_rate >= 15) {
            $score += 10;
            $factors[] = '中利益率商品';
        } elseif ($profit_rate < 5) {
            $score -= 10;
            $factors[] = '低利益率商品';
        }
        
        // 受注金額
        $order_amount = $order['total_amount'];
        if ($order_amount >= 50000) {
            $score += 15;
            $factors[] = '高額受注';
        } elseif ($order_amount >= 20000) {
            $score += 8;
            $factors[] = '中額受注';
        }
        
        // レベル判定
        $level = 'low';
        $urgent = false;
        
        if ($score >= 70) {
            $level = 'critical';
            $urgent = true;
        } elseif ($score >= 50) {
            $level = 'high';
        } elseif ($score >= 30) {
            $level = 'medium';
        }
        
        return [
            'score' => $score,
            'level' => $level,
            'urgent' => $urgent,
            'factors' => $factors
        ];
    }
    
    /**
     * 仕入れ必要性判定
     */
    private function isShiireHitsuyou($order, $zaiko_jokyo) {
        $current_stock = $zaiko_jokyo['current_stock'] ?? 0;
        $reserved_stock = $zaiko_jokyo['reserved_stock'] ?? 0;
        $available_stock = $current_stock - $reserved_stock;
        
        // 在庫不足または期限が近い場合
        return $available_stock <= 1 || $this->isDeadlineUrgent($order['shipping_deadline']);
    }
    
    /**
     * 期限緊急判定
     */
    private function isDeadlineUrgent($deadline) {
        $days_left = ceil((strtotime($deadline) - time()) / (60*60*24));
        return $days_left <= 3;
    }
    
    /**
     * 必要数量計算
     */
    private function calculateHitsuyouSuuryou($order, $zaiko_jokyo) {
        $current_stock = $zaiko_jokyo['current_stock'] ?? 0;
        $reserved_stock = $zaiko_jokyo['reserved_stock'] ?? 0;
        $available_stock = $current_stock - $reserved_stock;
        
        $order_quantity = $order['quantity'] ?? 1;
        $safety_stock = 2; // 安全在庫
        
        return max(0, $order_quantity + $safety_stock - $available_stock);
    }
    
    /**
     * 実行予定日計算
     */
    private function calculateJikkoYoteiBi($deadline) {
        // 発送期限の3日前を実行予定日とする
        return date('Y-m-d', strtotime($deadline . ' -3 days'));
    }
    
    /**
     * 仕入れステータス取得
     */
    private function getShiireStatus($sku) {
        // 実装時に仕入れ管理テーブルから取得
        return 'pending'; // 仮の値
    }
    
    /**
     * 優先度ソート
     */
    private function sortByYusenudo($a, $b) {
        // 緊急フラグ優先
        if ($a['kinkyuu_flg'] !== $b['kinkyuu_flg']) {
            return $b['kinkyuu_flg'] - $a['kinkyuu_flg'];
        }
        
        // 優先度スコア順
        return $b['yusenudo_score'] - $a['yusenudo_score'];
    }
    
    /**
     * アクティブな受注取得
     */
    private function getActiveOrders($filter_params) {
        // 受注管理システムから未発送の受注データを取得
        require_once '../juchu_kanri/php/juchu_kanri_controller.php';
        $juchu_manager = new JuchuKanriManager();
        
        $all_orders = $juchu_manager->getJuchuIchiranData($filter_params);
        
        // 未発送のみフィルタ
        return array_filter($all_orders['data'], function($order) {
            return in_array($order['order_status'], ['awaiting_payment', 'payment_received']);
        });
    }
    
    /**
     * 既存仕入れ先取得
     */
    private function getExistingSuppliers($sku) {
        // 実装時に仕入れ先マスタから取得
        return []; // 仮の値
    }
    
    /**
     * 送料見積もり
     */
    private function estimateShippingCost($order) {
        // 配送API連携で実際の送料を計算
        return 800; // 仮の値
    }
    
    /**
     * 仕入れアイテムID生成
     */
    private function generateShiireItemId($order_id, $sku) {
        return 'SI-' . substr(md5($order_id . $sku), 0, 8);
    }
    
    /**
     * 受注別仕入れ情報取得
     */
    public function getShiireInfoByOrder($order_id) {
        // 受注IDに基づく仕入れ情報取得
        return [
            'status' => 'pending',
            'candidates_count' => 0,
            'estimated_cost' => 0
        ];
    }
}

// メイン処理ルーティング
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $shiire_manager = new ShiireKanriManager();
    
    $action = $_GET['action'] ?? 'index';
    
    switch ($action) {
        case 'index':
            // メイン画面表示
            $filter_params = [
                'yusenudo_filter' => $_GET['yusenudo'] ?? '',
                'status_filter' => $_GET['status'] ?? '',
                'date_from' => $_GET['date_from'] ?? '',
                'date_to' => $_GET['date_to'] ?? ''
            ];
            
            $shiire_data = $shiire_manager->getShiireHitsuyoIchiran($filter_params);
            
            // テンプレート読み込み
            include_once '../../../common/templates/header_template.php';
            include_once 'shiire_kanri_content.php';
            include_once '../../../common/templates/footer_template.php';
            break;
            
        case 'candidates':
            // 仕入れ候補取得API
            $sku = $_GET['sku'] ?? '';
            
            if (empty($sku)) {
                http_response_code(400);
                echo json_encode(['error' => 'SKUが指定されていません。']);
                exit;
            }
            
            try {
                $candidates = $shiire_manager->getShiireCandidates($sku);
                header('Content-Type: application/json');
                echo json_encode([
                    'status' => 'success',
                    'data' => $candidates
                ]);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;
            
        case 'api':
            // AJAX APIエンドポイント
            header('Content-Type: application/json');
            
            $api_action = $_GET['api_action'] ?? '';
            
            switch ($api_action) {
                case 'refresh':
                    $shiire_data = $shiire_manager->getShiireHitsuyoIchiran();
                    echo json_encode($shiire_data);
                    break;
                    
                default:
                    http_response_code(404);
                    echo json_encode(['error' => '無効なAPIアクションです。']);
            }
            break;
            
        default:
            http_response_code(404);
            include_once '../../../common/templates/404_template.php';
    }
}
?>