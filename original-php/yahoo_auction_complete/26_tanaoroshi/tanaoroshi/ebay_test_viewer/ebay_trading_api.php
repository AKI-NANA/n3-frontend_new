<?php
/**
 * eBay Trading API連携クラス
 * 実際のeBay出品停止・管理機能を提供
 * 
 * 🎯 機能:
 * - 出品停止 (EndItem)
 * - 出品情報取得 (GetItem)
 * - 出品一覧取得 (GetMyeBaySelling)
 * - エラーハンドリング
 */

require_once 'ebay_api_config.php';

class EbayTradingAPI {
    
    private $config;
    private $last_error;
    private $call_count = 0;
    
    /**
     * コンストラクタ
     */
    public function __construct() {
        $this->config = getEbayConfig();
        
        if (!validateEbayCredentials()) {
            throw new Exception('eBay API認証情報が設定されていません。ebay_api_config.phpを確認してください。');
        }
        
        logEbayAPI("EbayTradingAPI インスタンス作成");
    }
    
    /**
     * eBay出品を停止
     * 
     * @param string $item_id eBay商品ID
     * @param string $reason 停止理由
     * @return array 結果配列
     */
    public function endItem($item_id, $reason = 'OtherListingError') {
        logEbayAPI("出品停止要求: ID={$item_id}, Reason={$reason}");
        
        try {
            // XML リクエスト構築
            $xml = $this->buildEndItemXML($item_id, $reason);
            
            // API呼び出し
            $response = $this->makeAPICall('EndItem', $xml);
            
            // レスポンス解析
            $result = $this->parseEndItemResponse($response);
            
            if ($result['success']) {
                logEbayAPI("出品停止成功: {$item_id}", 'SUCCESS');
            } else {
                logEbayAPI("出品停止失敗: {$item_id} - " . $result['error'], 'ERROR');
            }
            
            return $result;
            
        } catch (Exception $e) {
            $error_msg = "出品停止エラー: " . $e->getMessage();
            logEbayAPI($error_msg, 'ERROR');
            
            return [
                'success' => false,
                'error' => $error_msg,
                'item_id' => $item_id
            ];
        }
    }
    
    /**
     * 出品情報を取得
     * 
     * @param string $item_id eBay商品ID
     * @return array 商品情報
     */
    public function getItem($item_id) {
        logEbayAPI("商品情報取得: ID={$item_id}");
        
        try {
            $xml = $this->buildGetItemXML($item_id);
            $response = $this->makeAPICall('GetItem', $xml);
            $result = $this->parseGetItemResponse($response);
            
            return $result;
            
        } catch (Exception $e) {
            logEbayAPI("商品情報取得エラー: " . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * EndItem XML リクエスト構築
     */
    private function buildEndItemXML($item_id, $reason) {
        $xml = '<?xml version="1.0" encoding="utf-8"?>
<EndItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
        <eBayAuthToken>' . htmlspecialchars($this->config['user_token']) . '</eBayAuthToken>
    </RequesterCredentials>
    <ItemID>' . htmlspecialchars($item_id) . '</ItemID>
    <EndingReason>' . htmlspecialchars($reason) . '</EndingReason>
    <ErrorLanguage>en_US</ErrorLanguage>
    <WarningLevel>High</WarningLevel>
</EndItemRequest>';
        
        return $xml;
    }
    
    /**
     * GetItem XML リクエスト構築
     */
    private function buildGetItemXML($item_id) {
        $xml = '<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
        <eBayAuthToken>' . htmlspecialchars($this->config['user_token']) . '</eBayAuthToken>
    </RequesterCredentials>
    <ItemID>' . htmlspecialchars($item_id) . '</ItemID>
    <DetailLevel>ReturnAll</DetailLevel>
    <ErrorLanguage>en_US</ErrorLanguage>
    <WarningLevel>High</WarningLevel>
</GetItemRequest>';
        
        return $xml;
    }
    
    /**
     * eBay API呼び出し実行
     */
    private function makeAPICall($call_name, $xml) {
        $this->call_count++;
        
        logEbayAPI("API呼び出し #{$this->call_count}: {$call_name}");
        
        // HTTPヘッダー設定
        $headers = [
            'X-EBAY-API-COMPATIBILITY-LEVEL: ' . $this->config['compatibility_level'],
            'X-EBAY-API-DEV-NAME: ' . $this->config['dev_id'],
            'X-EBAY-API-APP-NAME: ' . $this->config['app_id'], 
            'X-EBAY-API-CERT-NAME: ' . $this->config['cert_id'],
            'X-EBAY-API-CALL-NAME: ' . $call_name,
            'X-EBAY-API-SITEID: ' . $this->config['site_id'],
            'Content-Type: text/xml; charset=utf-8'
        ];
        
        // cURL設定
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->config['api_url'],
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_USERAGENT => 'CAIDS-eBay-API-Client/1.0'
        ]);
        
        // API実行
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        // エラーチェック
        if ($curl_error) {
            throw new Exception("cURL エラー: {$curl_error}");
        }
        
        if ($http_code !== 200) {
            throw new Exception("HTTP エラー: {$http_code}");
        }
        
        if (!$response) {
            throw new Exception("空のレスポンス");
        }
        
        logEbayAPI("API呼び出し成功 - レスポンスサイズ: " . strlen($response) . " bytes");
        
        return $response;
    }
    
    /**
     * EndItem レスポンス解析
     */
    private function parseEndItemResponse($response) {
        $xml = simplexml_load_string($response);
        
        if (!$xml) {
            throw new Exception("XMLパースエラー");
        }
        
        $ack = (string)$xml->Ack;
        
        if ($ack === 'Success') {
            return [
                'success' => true,
                'item_id' => (string)$xml->ItemID,
                'end_time' => (string)$xml->EndTime,
                'message' => '出品が正常に停止されました'
            ];
        } else {
            // エラー詳細取得
            $error_messages = [];
            if (isset($xml->Errors)) {
                foreach ($xml->Errors as $error) {
                    $error_messages[] = "[{$error->ErrorCode}] {$error->LongMessage}";
                }
            }
            
            return [
                'success' => false,
                'error' => implode('; ', $error_messages),
                'ack' => $ack,
                'raw_response' => $response
            ];
        }
    }
    
    /**
     * GetItem レスポンス解析
     */
    private function parseGetItemResponse($response) {
        $xml = simplexml_load_string($response);
        
        if (!$xml) {
            throw new Exception("XMLパースエラー");
        }
        
        $ack = (string)$xml->Ack;
        
        if ($ack === 'Success') {
            $item = $xml->Item;
            
            return [
                'success' => true,
                'item_id' => (string)$item->ItemID,
                'title' => (string)$item->Title,
                'listing_status' => (string)$item->SellingStatus->ListingStatus,
                'current_price' => (float)$item->SellingStatus->CurrentPrice,
                'quantity' => (int)$item->Quantity,
                'quantity_sold' => (int)$item->SellingStatus->QuantitySold,
                'start_time' => (string)$item->ListingDetails->StartTime,
                'end_time' => (string)$item->ListingDetails->EndTime,
                'watch_count' => (int)$item->ListingDetails->WatchCount,
                'view_item_url' => (string)$item->ListingDetails->ViewItemURL
            ];
        } else {
            $error_messages = [];
            if (isset($xml->Errors)) {
                foreach ($xml->Errors as $error) {
                    $error_messages[] = "[{$error->ErrorCode}] {$error->LongMessage}";
                }
            }
            
            return [
                'success' => false,
                'error' => implode('; ', $error_messages)
            ];
        }
    }
    
    /**
     * APIレート制限チェック
     */
    public function checkRateLimit() {
        // eBay APIは1日あたり5000回まで（通常アカウント）
        // 実装時はRedisやDBでレート制限を管理
        return true;
    }
    
    /**
     * 最後のエラーを取得
     */
    public function getLastError() {
        return $this->last_error;
    }
    
    /**
     * API呼び出し回数を取得
     */
    public function getCallCount() {
        return $this->call_count;
    }
}

// ユーティリティ関数
function createEbayAPI() {
    try {
        return new EbayTradingAPI();
    } catch (Exception $e) {
        logEbayAPI("EbayTradingAPI作成エラー: " . $e->getMessage(), 'ERROR');
        return null;
    }
}

logEbayAPI("EbayTradingAPIクラス読み込み完了");
?>