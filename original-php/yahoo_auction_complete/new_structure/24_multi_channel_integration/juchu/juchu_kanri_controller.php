<?php
/**
 * NAGANO-3 eBay受注管理システム メインコントローラー
 * 
 * 機能: eBay受注データ統合管理・フィルタリング・詳細表示制御
 * アーキテクチャ: 4コア4階層準拠・modules層業務ロジック
 * 連携: orchestrator/eBay API + common/テンプレート + modules/業務UI
 */

session_start();

class JuchuKanriManager {
    private $ebay_api_integration;
    private $shiire_manager;
    private $shukka_manager;
    private $rieki_calculator;
    private $user_settings;
    
    public function __construct() {
        // orchestrator層連携
        require_once '../../../orchestrator/php/ebay_api_integration.php';
        $this->ebay_api_integration = new EbayApiIntegration();
        
        // modules層連携
        require_once '../shiire_kanri/php/shiire_kanri_controller.php';
        require_once '../shukka_kanri/php/shukka_kanri_controller.php';
        require_once '../rieki_bunseki/php/rieki_bunseki_controller.php';
        
        $this->shiire_manager = new ShiireKanriManager();
        $this->shukka_manager = new ShukkaKanriManager();
        $this->rieki_calculator = new RiekiBunsekiManager();
        
        // ユーザー設定読み込み
        $this->user_settings = $this->loadUserSettings();
    }
    
    /**
     * メイン受注一覧データ取得
     */
    public function getJuchuIchiranData($filter_params = []) {
        try {
            // eBay API経由受注データ取得
            $ebay_orders = $this->ebay_api_integration->getOrderList($filter_params);
            
            // 各注文に対する追加情報統合
            $enhanced_orders = [];
            
            foreach ($ebay_orders as $order) {
                $enhanced_order = $this->enhanceOrderData($order);
                $enhanced_orders[] = $enhanced_order;
            }
            
            return [
                'status' => 'success',
                'data' => $enhanced_orders,
                'total_count' => count($enhanced_orders),
                'filter_applied' => $filter_params
            ];
            
        } catch (Exception $e) {
            // エラーフォールバック: キャッシュデータ使用
            error_log("eBay API Error: " . $e->getMessage());
            
            $cached_orders = $this->getCachedOrders();
            
            return [
                'status' => 'fallback',
                'data' => $cached_orders,
                'error_message' => 'eBay APIが一時的に利用できません。キャッシュデータを表示しています。',
                'cache_timestamp' => $this->getCacheTimestamp()
            ];
        }
    }
    
    /**
     * 受注データ拡張処理（仕入れ・出荷・利益情報統合）
     */
    private function enhanceOrderData($order) {
        // 仕入れ情報付加
        $shiire_info = $this->shiire_manager->getShiireInfoByOrder($order['order_id']);
        
        // 出荷情報付加
        $shukka_info = $this->shukka_manager->getShukkaInfoByOrder($order['order_id']);
        
        // 利益計算実行
        $rieki_info = $this->rieki_calculator->calculateOrderProfit($order, $shiire_info, $shukka_info);
        
        // AIスコア取得（存在する場合）
        $ai_score = $this->getAIScoreByOrder($order['order_id']);
        
        return [
            // 基本受注情報
            'renban' => $this->generateRenban($order['order_id']),
            'juchu_bangou' => $order['order_id'],
            'juchu_nichiji' => $order['created_date'],
            'hakko_kigen' => $order['shipping_deadline'],
            
            // 商品情報
            'shohin_gazo' => $order['item_image_url'],
            'shohin_title' => $order['item_title'],
            'custom_label' => $order['custom_label'] ?? $order['sku'],
            
            // 価格・利益情報
            'uriage_kakaku' => $order['total_amount'],
            'tesuryo_sashihiki_rieki' => $rieki_info['profit_after_fees'],
            'rieki_ritsu' => $rieki_info['profit_rate'],
            
            // 支払い情報
            'shiharai_bi' => $order['payment_date'],
            'shiharai_jotai' => $order['payment_status'],
            
            // ステータス情報
            'shukka_status' => $shukka_info['status'],
            'order_status' => $order['order_status'],
            
            // アカウント・モール識別
            'mall_account' => $order['account_identifier'],
            'sales_record_number' => $order['sales_record_number'],
            
            // AI・分析情報
            'ai_score' => $ai_score,
            'risk_level' => $this->calculateRiskLevel($order, $ai_score),
            
            // 連携情報
            'shiire_info' => $shiire_info,
            'shukka_info' => $shukka_info,
            'rieki_info' => $rieki_info,
            
            // 詳細リンク情報
            'ebay_detail_url' => $order['ebay_item_url'],
            'tracking_url' => $shukka_info['tracking_url'] ?? null
        ];
    }
    
    /**
     * フィルタリング実行
     */
    public function applyFilters($orders, $filters) {
        $filtered_orders = $orders;
        
        // アカウント別フィルター
        if (!empty($filters['account_filter'])) {
            $filtered_orders = array_filter($filtered_orders, function($order) use ($filters) {
                return $order['mall_account'] === $filters['account_filter'];
            });
        }
        
        // ステータス別フィルター
        if (!empty($filters['status_filter'])) {
            $filtered_orders = array_filter($filtered_orders, function($order) use ($filters) {
                return $order['order_status'] === $filters['status_filter'];
            });
        }
        
        // 日付範囲フィルター
        if (!empty($filters['date_from']) || !empty($filters['date_to'])) {
            $filtered_orders = array_filter($filtered_orders, function($order) use ($filters) {
                $order_date = strtotime($order['juchu_nichiji']);
                
                if (!empty($filters['date_from'])) {
                    if ($order_date < strtotime($filters['date_from'])) {
                        return false;
                    }
                }
                
                if (!empty($filters['date_to'])) {
                    if ($order_date > strtotime($filters['date_to'] . ' 23:59:59')) {
                        return false;
                    }
                }
                
                return true;
            });
        }
        
        // 支払い状況フィルター
        if (!empty($filters['payment_status'])) {
            $filtered_orders = array_filter($filtered_orders, function($order) use ($filters) {
                return $order['shiharai_jotai'] === $filters['payment_status'];
            });
        }
        
        // 出荷状況フィルター
        if (!empty($filters['shipping_status'])) {
            $filtered_orders = array_filter($filtered_orders, function($order) use ($filters) {
                return $order['shukka_status'] === $filters['shipping_status'];
            });
        }
        
        return array_values($filtered_orders); // 配列インデックス再構築
    }
    
    /**
     * 詳細モーダル用データ取得
     */
    public function getOrderDetailData($order_id) {
        try {
            // 基本受注情報取得
            $order_detail = $this->ebay_api_integration->getOrderDetail($order_id);
            
            // 拡張情報統合
            $enhanced_detail = $this->enhanceOrderData($order_detail);
            
            // 問い合わせ履歴取得（既存システム連携）
            $inquiry_history = $this->getInquiryHistory($order_id);
            
            // 配送追跡詳細
            $tracking_detail = $this->getTrackingDetail($order_id);
            
            return [
                'order_detail' => $enhanced_detail,
                'inquiry_history' => $inquiry_history,
                'tracking_detail' => $tracking_detail,
                'shiire_candidates' => $this->shiire_manager->getShiireCandidates($order_detail['custom_label']),
                'profit_breakdown' => $this->rieki_calculator->getProfitBreakdown($order_id)
            ];
            
        } catch (Exception $e) {
            error_log("Order Detail Error: " . $e->getMessage());
            throw new Exception("受注詳細情報の取得に失敗しました。");
        }
    }
    
    /**
     * 連番生成（オリジナル）
     */
    private function generateRenban($order_id) {
        // ハッシュベースの短縮連番生成
        return 'J' . str_pad(hexdec(substr(md5($order_id), 0, 6)) % 999999, 6, '0', STR_PAD_LEFT);
    }
    
    /**
     * リスクレベル計算
     */
    private function calculateRiskLevel($order, $ai_score) {
        $risk_factors = 0;
        
        // AIスコアによる判定
        if ($ai_score < 30) $risk_factors += 3;
        elseif ($ai_score < 50) $risk_factors += 2;
        elseif ($ai_score < 70) $risk_factors += 1;
        
        // 金額による判定
        if ($order['total_amount'] > 50000) $risk_factors += 1;
        if ($order['total_amount'] > 100000) $risk_factors += 2;
        
        // 配送先による判定
        $high_risk_countries = ['CN', 'RU', 'BR', 'IN'];
        if (in_array($order['shipping_country'], $high_risk_countries)) {
            $risk_factors += 2;
        }
        
        // 支払い方法による判定
        if ($order['payment_method'] === 'check' || $order['payment_method'] === 'money_order') {
            $risk_factors += 3;
        }
        
        // リスクレベル判定
        if ($risk_factors >= 6) return 'high';
        if ($risk_factors >= 3) return 'medium';
        return 'low';
    }
    
    /**
     * AIスコア取得
     */
    private function getAIScoreByOrder($order_id) {
        // AI分析システムとの連携（実装時に具体化）
        try {
            // AIスコアAPI呼び出し（プレースホルダー）
            return rand(10, 100); // 開発時は仮データ
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * キャッシュデータ取得（フォールバック用）
     */
    private function getCachedOrders() {
        $cache_file = '../../../cache/ebay_orders_cache.json';
        
        if (file_exists($cache_file)) {
            $cache_data = json_decode(file_get_contents($cache_file), true);
            return $cache_data['orders'] ?? [];
        }
        
        // キャッシュも存在しない場合はサンプルデータ
        return $this->getSampleOrderData();
    }
    
    /**
     * サンプルデータ生成（開発・デモ用）
     */
    private function getSampleOrderData() {
        return [
            [
                'order_id' => 'eBay-001-2025',
                'created_date' => '2025-06-10 14:30:00',
                'shipping_deadline' => '2025-06-17',
                'item_title' => 'Nintendo Switch Pro Controller',
                'item_image_url' => '/images/sample/nintendo-controller.jpg',
                'custom_label' => 'NSW-PRO-001',
                'total_amount' => 8500,
                'payment_date' => '2025-06-10 15:00:00',
                'payment_status' => 'completed',
                'order_status' => 'payment_received',
                'account_identifier' => 'eBay-JP-Main',
                'shipping_country' => 'US',
                'payment_method' => 'paypal'
            ],
            [
                'order_id' => 'eBay-002-2025',
                'created_date' => '2025-06-10 16:45:00',
                'shipping_deadline' => '2025-06-18',
                'item_title' => 'Sony WH-1000XM4 Headphones',
                'item_image_url' => '/images/sample/sony-headphones.jpg',
                'custom_label' => 'SONY-WH-004',
                'total_amount' => 35000,
                'payment_date' => null,
                'payment_status' => 'pending',
                'order_status' => 'awaiting_payment',
                'account_identifier' => 'eBay-US-Sub',
                'shipping_country' => 'CA',
                'payment_method' => 'credit_card'
            ]
        ];
    }
    
    /**
     * ユーザー設定読み込み
     */
    private function loadUserSettings() {
        return [
            'juchu_theme_color' => $_SESSION['juchu_theme_color'] ?? '#1e40af',
            'auto_refresh' => $_SESSION['juchu_auto_refresh'] ?? true,
            'refresh_interval' => $_SESSION['juchu_refresh_interval'] ?? 30000,
            'default_view' => $_SESSION['juchu_default_view'] ?? 'all',
            'items_per_page' => $_SESSION['juchu_items_per_page'] ?? 50
        ];
    }
    
    /**
     * キャッシュタイムスタンプ取得
     */
    private function getCacheTimestamp() {
        $cache_file = '../../../cache/ebay_orders_cache.json';
        
        if (file_exists($cache_file)) {
            return date('Y-m-d H:i:s', filemtime($cache_file));
        }
        
        return null;
    }
    
    /**
     * 問い合わせ履歴取得（既存システム連携）
     */
    private function getInquiryHistory($order_id) {
        // 問い合わせ管理システムとの連携（実装時に具体化）
        return [];
    }
    
    /**
     * 配送追跡詳細取得
     */
    private function getTrackingDetail($order_id) {
        // 配送追跡システムとの連携（実装時に具体化）
        return [];
    }
}

// メイン処理ルーティング
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $juchu_manager = new JuchuKanriManager();
    
    $action = $_GET['action'] ?? 'index';
    
    switch ($action) {
        case 'index':
            // メイン画面表示
            $filter_params = [
                'account_filter' => $_GET['account'] ?? '',
                'status_filter' => $_GET['status'] ?? '',
                'date_from' => $_GET['date_from'] ?? '',
                'date_to' => $_GET['date_to'] ?? '',
                'payment_status' => $_GET['payment_status'] ?? '',
                'shipping_status' => $_GET['shipping_status'] ?? ''
            ];
            
            $juchu_data = $juchu_manager->getJuchuIchiranData($filter_params);
            
            // フィルタリング適用
            if (array_filter($filter_params)) {
                $juchu_data['data'] = $juchu_manager->applyFilters($juchu_data['data'], $filter_params);
            }
            
            // common層テンプレート読み込み
            include_once '../../../common/templates/header_template.php';
            include_once 'juchu_kanri_content.php';
            include_once '../../../common/templates/footer_template.php';
            break;
            
        case 'detail':
            // 詳細モーダル用データ取得
            $order_id = $_GET['order_id'] ?? '';
            
            if (empty($order_id)) {
                http_response_code(400);
                echo json_encode(['error' => '受注番号が指定されていません。']);
                exit;
            }
            
            try {
                $detail_data = $juchu_manager->getOrderDetailData($order_id);
                header('Content-Type: application/json');
                echo json_encode($detail_data);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;
            
        case 'api':
            // AJAX API エンドポイント
            header('Content-Type: application/json');
            
            $api_action = $_GET['api_action'] ?? '';
            
            switch ($api_action) {
                case 'refresh':
                    $juchu_data = $juchu_manager->getJuchuIchiranData();
                    echo json_encode($juchu_data);
                    break;
                    
                case 'filter':
                    $filter_params = json_decode(file_get_contents('php://input'), true);
                    $juchu_data = $juchu_manager->getJuchuIchiranData($filter_params);
                    $filtered_data = $juchu_manager->applyFilters($juchu_data['data'], $filter_params);
                    
                    echo json_encode([
                        'status' => 'success',
                        'data' => $filtered_data,
                        'total_count' => count($filtered_data)
                    ]);
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