<?php
/**
 * HTMLテンプレート管理専用API
 * yahoo_auction_content.php から分離
 * 作成日: 2025-09-13
 */

// エラー表示を無効化（API専用）
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// 出力バッファクリア
while (ob_get_level()) {
    ob_end_clean();
}

// CORS設定
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// デバッグログ
error_log("=== HTMLテンプレートAPI開始 ===");
error_log("Request Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'none'));

// 必要ファイル読み込み
require_once __DIR__ . '/database_query_handler.php';
require_once __DIR__ . '/html_template_manager.php';

/**
 * 安全なJSONレスポンス送信
 */
function sendApiResponse($data, $success = true, $message = '') {
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    error_log("API Response: " . json_encode($response));
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // POSTリクエストのみ受け付け
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendApiResponse(null, false, 'POST方式のみサポート');
    }
    
    // JSON入力を解析
    $rawInput = file_get_contents('php://input');
    error_log("Raw Input: " . $rawInput);
    
    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendApiResponse(null, false, 'JSONデコードエラー: ' . json_last_error_msg());
    }
    
    $action = $input['action'] ?? '';
    error_log("Action: " . $action);
    
    switch ($action) {
        case 'save_html_template':
            error_log("HTMLテンプレート保存処理開始");
            
            if (!isset($input['template_data'])) {
                sendApiResponse(null, false, 'template_dataが見つかりません');
            }
            
            // 関数存在確認
            if (!function_exists('saveHTMLTemplate')) {
                sendApiResponse(null, false, 'saveHTMLTemplate関数が定義されていません');
            }
            
            $result = saveHTMLTemplate($input['template_data']);
            error_log("保存結果: " . print_r($result, true));
            
            if (!is_array($result)) {
                sendApiResponse(null, false, 'テンプレート保存関数のレスポンス形式エラー');
            }
            
            sendApiResponse($result, $result['success'], $result['message']);
            break;
            
        case 'get_saved_templates':
            error_log("保存済みテンプレート一覧取得");
            
            $category = $input['category'] ?? null;
            $activeOnly = ($input['active_only'] ?? 'true') === 'true';
            
            $result = getSavedHTMLTemplates($category, $activeOnly);
            sendApiResponse($result['templates'], $result['success'], $result['success'] ? 'テンプレート一覧取得成功' : $result['message']);
            break;
            
        case 'get_html_template':
            error_log("特定テンプレート取得");
            
            $templateId = $input['template_id'] ?? null;
            if (!$templateId) {
                sendApiResponse(null, false, 'テンプレートIDが指定されていません');
            }
            
            $result = getHTMLTemplate($templateId);
            sendApiResponse($result['template'] ?? null, $result['success'], $result['success'] ? 'テンプレート取得成功' : $result['message']);
            break;
            
        case 'delete_html_template':
            error_log("テンプレート削除");
            
            $templateId = $input['template_id'] ?? null;
            if (!$templateId) {
                sendApiResponse(null, false, 'テンプレートIDが指定されていません');
            }
            
            $result = deleteHTMLTemplate($templateId);
            sendApiResponse($result, $result['success'], $result['message']);
            break;
            
        case 'generate_html_preview':
            error_log("HTMLプレビュー生成");
            
            if (!isset($input['template_content'])) {
                sendApiResponse(null, false, 'テンプレート内容が指定されていません');
            }
            
            $templateContent = $input['template_content'];
            $sampleData = $input['sample_data'] ?? 'iphone';
            
            // サンプルデータ生成
            $sampleProducts = [
                'iphone' => [
                    'Title' => 'iPhone 14 Pro - Unlocked',
                    'Brand' => 'Apple',
                    'current_price' => '899.00',
                    'description' => 'Brand new iPhone 14 Pro in excellent condition',
                    'condition_name' => 'New'
                ],
                'camera' => [
                    'Title' => 'Canon EOS R5 Mirrorless Camera',
                    'Brand' => 'Canon',
                    'current_price' => '3899.00',
                    'description' => 'Professional camera with 45MP full-frame sensor',
                    'condition_name' => 'Used'
                ],
                'watch' => [
                    'Title' => 'Rolex Submariner Date 116610LN',
                    'Brand' => 'Rolex',
                    'current_price' => '12500.00',
                    'description' => 'Luxury Swiss watch in excellent condition',
                    'condition_name' => 'Very Good'
                ]
            ];
            
            $productData = $sampleProducts[$sampleData] ?? $sampleProducts['iphone'];
            
            // プレースホルダー置換
            $replacements = [
                '{{TITLE}}' => $productData['Title'],
                '{{BRAND}}' => $productData['Brand'],
                '{{PRICE}}' => $productData['current_price'],
                '{{DESCRIPTION}}' => $productData['description'],
                '{{CONDITION}}' => $productData['condition_name'],
                '{{FEATURE_1}}' => 'High quality authentic product',
                '{{FEATURE_2}}' => 'Fast international shipping',
                '{{FEATURE_3}}' => 'Professional seller support',
                '{{MAIN_IMAGE}}' => 'https://via.placeholder.com/400x300?text=Product+Image',
                '{{SPECIFICATIONS}}' => 'Detailed specifications available',
                '{{SHIPPING_INFO}}' => 'Ships from Japan with tracking',
                '{{RETURN_POLICY}}' => '30-day',
                '{{CURRENT_DATE}}' => date('Y-m-d'),
                '{{YEAR}}' => date('Y'),
                '{{LOCATION}}' => 'Japan'
            ];
            
            $previewHTML = str_replace(array_keys($replacements), array_values($replacements), $templateContent);
            
            // CSS統合
            if (!empty($input['css_styles'])) {
                $previewHTML .= "\n<style>\n" . $input['css_styles'] . "\n</style>";
            }
            
            sendApiResponse([
                'html' => $previewHTML,
                'sample_data_used' => $sampleData,
                'placeholders_replaced' => count($replacements)
            ], true, 'プレビュー生成成功');
            break;
            
        case 'generate_quick_template':
            error_log("クイックテンプレート生成");
            
            $templateType = $input['type'] ?? 'basic';
            $quickTemplate = generateQuickTemplate($templateType);
            
            sendApiResponse($quickTemplate, true, 'クイックテンプレート生成成功');
            break;
            
        default:
            sendApiResponse(null, false, '不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    error_log("API例外エラー: " . $e->getMessage());
    error_log("スタックトレース: " . $e->getTraceAsString());
    sendApiResponse(null, false, 'サーバーエラー: ' . $e->getMessage());
}
?>
