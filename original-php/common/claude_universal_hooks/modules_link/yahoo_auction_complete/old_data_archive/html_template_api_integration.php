<?php
// HTMLテンプレートプロセッサーを読み込み
require_once __DIR__ . '/html_template_processor.php';

// 🆕 HTMLテンプレート管理API追加部分
// switch文のcaseに追加する内容

case 'get_html_templates':
    try {
        $processor = new HTMLTemplateProcessor();
        $category = $_GET['category'] ?? null;
        $templates = $processor->getTemplates($category);
        sendJsonResponse($templates, true, 'HTMLテンプレート取得成功');
    } catch (Exception $e) {
        sendJsonResponse([], false, 'HTMLテンプレート取得エラー: ' . $e->getMessage());
    }
    break;

case 'save_html_template':
    try {
        $processor = new HTMLTemplateProcessor();
        
        $templateData = [
            'template_name' => $_POST['template_name'] ?? '',
            'category' => $_POST['category'] ?? 'general',
            'display_name' => $_POST['display_name'] ?? $_POST['template_name'] ?? '',
            'description' => $_POST['description'] ?? '',
            'html_content' => $_POST['html_content'] ?? '',
            'css_styles' => $_POST['css_styles'] ?? '',
            'javascript_code' => $_POST['javascript_code'] ?? '',
            'placeholder_fields' => json_decode($_POST['placeholder_fields'] ?? '[]', true),
            'sample_data' => json_decode($_POST['sample_data'] ?? '{}', true),
            'created_by' => 'user'
        ];
        
        // バリデーション
        if (empty($templateData['template_name']) || empty($templateData['html_content'])) {
            sendJsonResponse(null, false, 'テンプレート名とHTMLコンテンツは必須です');
            break;
        }
        
        $result = $processor->saveTemplate($templateData);
        sendJsonResponse($result, $result['success'], $result['message'] ?? $result['error']);
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'HTMLテンプレート保存エラー: ' . $e->getMessage());
    }
    break;

case 'delete_html_template':
    try {
        $processor = new HTMLTemplateProcessor();
        $templateId = $_POST['template_id'] ?? 0;
        
        if (!$templateId) {
            sendJsonResponse(null, false, 'テンプレートIDが必要です');
            break;
        }
        
        $result = $processor->deleteTemplate($templateId);
        sendJsonResponse($result, $result['success'], $result['message'] ?? $result['error']);
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'HTMLテンプレート削除エラー: ' . $e->getMessage());
    }
    break;

case 'process_csv_with_html_template':
    try {
        if (!isset($_FILES['csvFile'])) {
            sendJsonResponse(null, false, 'CSVファイルが見つかりません');
            break;
        }
        
        $templateId = $_POST['template_id'] ?? 0;
        if (!$templateId) {
            sendJsonResponse(null, false, 'HTMLテンプレートIDが必要です');
            break;
        }
        
        // CSV読み込み
        $csvData = [];
        $tempFile = $_FILES['csvFile']['tmp_name'];
        $fileName = $_FILES['csvFile']['name'];
        
        if (($handle = fopen($tempFile, "r")) !== FALSE) {
            $headers = fgetcsv($handle);
            while (($row = fgetcsv($handle)) !== FALSE) {
                if (count($row) === count($headers)) {
                    $csvData[] = array_combine($headers, $row);
                }
            }
            fclose($handle);
        }
        
        if (empty($csvData)) {
            sendJsonResponse(null, false, 'CSVデータが読み込めませんでした');
            break;
        }
        
        // HTMLテンプレートとCSVデータを統合
        $processor = new HTMLTemplateProcessor();
        $options = [
            'csv_filename' => $fileName,
            'enhance_data' => $_POST['enhance_data'] ?? true
        ];
        
        $result = $processor->processCSVWithTemplate($csvData, $templateId, $options);
        sendJsonResponse($result, $result['success'], $result['message']);
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'CSV+HTMLテンプレート処理エラー: ' . $e->getMessage());
    }
    break;

case 'generate_csv_with_html':
    try {
        $processor = new HTMLTemplateProcessor();
        $templateId = $_POST['template_id'] ?? 0;
        $csvData = json_decode($_POST['csv_data'] ?? '[]', true);
        
        if (!$templateId || empty($csvData)) {
            sendJsonResponse(null, false, 'テンプレートIDとCSVデータが必要です');
            break;
        }
        
        // HTMLテンプレートとデータを統合
        $result = $processor->processCSVWithTemplate($csvData, $templateId, [
            'csv_filename' => 'generated_' . date('Ymd_His') . '.csv',
            'enhance_data' => true
        ]);
        
        if (!$result['success']) {
            sendJsonResponse($result, false, $result['error']);
            break;
        }
        
        // CSV出力用にデータを整形
        $outputData = [];
        foreach ($result['processed_items'] as $item) {
            if ($item['success']) {
                $outputData[] = $item['processed'];
            }
        }
        
        sendJsonResponse([
            'csv_data' => $outputData,
            'processing_stats' => [
                'total_items' => $result['total_items'],
                'success_count' => $result['success_count'],
                'error_count' => $result['error_count']
            ],
            'template_used' => $result['template_used']['display_name'] ?? 'Unknown Template'
        ], true, 'HTML統合CSV生成完了');
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'HTML統合CSV生成エラー: ' . $e->getMessage());
    }
    break;

case 'download_html_integrated_csv':
    try {
        $processor = new HTMLTemplateProcessor();
        $templateId = $_GET['template_id'] ?? 0;
        $csvType = $_GET['csv_type'] ?? 'all'; // all, scraped, custom
        
        if (!$templateId) {
            // エラー用CSV出力
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="error_' . date('Ymd_His') . '.csv"');
            echo "\xEF\xBB\xBF";
            echo "Error\n";
            echo "Template ID is required\n";
            exit;
        }
        
        // データソース選択
        $sourceData = [];
        switch ($csvType) {
            case 'scraped':
                $sourceData = getScrapedProductsData(1, 1000)['data'] ?? [];
                break;
            case 'all':
                $sourceData = getAllRecentProductsData(1, 1000)['data'] ?? [];
                break;
            default:
                // カスタムデータはPOSTで送信されることを想定
                $sourceData = json_decode($_POST['source_data'] ?? '[]', true);
        }
        
        if (empty($sourceData)) {
            // データなしCSV出力
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="no_data_' . date('Ymd_His') . '.csv"');
            echo "\xEF\xBB\xBF";
            echo "Action,Category,Title,Description,Quantity,BuyItNowPrice,ConditionID\n";
            echo 'Add,293,"No source data available","Please check data source",1,0.00,3000' . "\n";
            exit;
        }
        
        // HTMLテンプレート統合処理
        $result = $processor->processCSVWithTemplate($sourceData, $templateId, [
            'csv_filename' => 'html_integrated_' . date('Ymd_His') . '.csv',
            'enhance_data' => true
        ]);
        
        // 出力バッファクリア
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        // CSVヘッダー設定
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="ebay_html_integrated_' . date('Ymd_His') . '.csv"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        
        // UTF-8 BOM追加
        echo "\xEF\xBB\xBF";
        
        // CSVヘッダー行
        echo "Action,Category,Title,Description,Quantity,BuyItNowPrice,ConditionID,Location,PaymentProfile,ReturnProfile,ShippingProfile,PictureURL,UPC,Brand,ConditionDescription,SiteID,PostalCode,Currency,Format,Duration,Country\n";
        
        // データ行出力
        if ($result['success'] && !empty($result['processed_items'])) {
            foreach ($result['processed_items'] as $item) {
                if ($item['success']) {
                    $processedItem = $item['processed'];
                    
                    // CSVエスケープ処理
                    $csvRow = [
                        $processedItem['Action'] ?? 'Add',
                        $processedItem['Category'] ?? '293',
                        $processedItem['Title'] ?? 'Untitled Product',
                        $processedItem['Description'] ?? '', // ここにHTML統合された説明が入る
                        $processedItem['Quantity'] ?? '1',
                        $processedItem['BuyItNowPrice'] ?? '0.00',
                        $processedItem['ConditionID'] ?? '3000',
                        $processedItem['Location'] ?? 'Japan',
                        $processedItem['PaymentProfile'] ?? 'Standard Payment',
                        $processedItem['ReturnProfile'] ?? '30 Days Return',
                        $processedItem['ShippingProfile'] ?? 'Standard Shipping',
                        $processedItem['PictureURL'] ?? '',
                        $processedItem['UPC'] ?? '',
                        $processedItem['Brand'] ?? '',
                        $processedItem['ConditionDescription'] ?? '',
                        $processedItem['SiteID'] ?? '0',
                        $processedItem['PostalCode'] ?? '100-0001',
                        $processedItem['Currency'] ?? 'USD',
                        $processedItem['Format'] ?? 'FixedPriceItem',
                        $processedItem['Duration'] ?? 'GTC',
                        $processedItem['Country'] ?? 'JP'
                    ];
                    
                    // CSVエスケープして出力
                    $escapedRow = array_map(function($field) {
                        $field = str_replace(["\r\n", "\r", "\n"], ' ', $field);
                        if (strpos($field, ',') !== false || strpos($field, '"') !== false) {
                            return '"' . str_replace('"', '""', $field) . '"';
                        }
                        return $field;
                    }, $csvRow);
                    
                    echo implode(',', $escapedRow) . "\n";
                }
            }
        } else {
            // フォールバック行
            echo 'Add,293,"HTML Integration Failed","Template processing error",1,0.00,3000,Japan,"Standard Payment","30 Days Return","Standard Shipping",,,,"",0,100-0001,USD,FixedPriceItem,GTC,JP' . "\n";
        }
        
        exit;
        
    } catch (Exception $e) {
        // エラー時のCSV出力
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="html_csv_error_' . date('Ymd_His') . '.csv"');
        echo "\xEF\xBB\xBF";
        echo "Error,Message\n";
        echo '"HTML CSV Generation Error","' . str_replace('"', '""', $e->getMessage()) . '"' . "\n";
        exit;
    }
    break;

case 'get_template_usage_stats':
    try {
        $processor = new HTMLTemplateProcessor();
        $templateId = $_GET['template_id'] ?? null;
        $stats = $processor->getUsageStats($templateId);
        sendJsonResponse($stats, true, 'テンプレート使用統計取得成功');
    } catch (Exception $e) {
        sendJsonResponse([], false, 'テンプレート使用統計取得エラー: ' . $e->getMessage());
    }
    break;

// 🆕 CSVフィールドドキュメンテーション管理
case 'get_csv_fields_documentation':
    try {
        $pdo = getDatabaseConnection();
        $stmt = $pdo->query("SELECT * FROM csv_field_documentation WHERE is_active = TRUE ORDER BY sort_order, field_name");
        $fields = $stmt->fetchAll(PDO::FETCH_ASSOC);
        sendJsonResponse(['fields' => $fields], true, 'CSVフィールドドキュメント取得成功');
    } catch (Exception $e) {
        sendJsonResponse(['fields' => []], false, 'CSVフィールドドキュメント取得エラー: ' . $e->getMessage());
    }
    break;

case 'update_field_documentation':
    try {
        $pdo = getDatabaseConnection();
        $fieldName = $_POST['field_name'] ?? '';
        $data = json_decode($_POST['data'] ?? '{}', true);
        
        if (empty($fieldName)) {
            sendJsonResponse(null, false, 'フィールド名が必要です');
            break;
        }
        
        $sql = "UPDATE csv_field_documentation SET 
                display_name = COALESCE(?, display_name),
                description = COALESCE(?, description), 
                validation_rules = COALESCE(?, validation_rules),
                example_value = COALESCE(?, example_value),
                updated_at = NOW()
                WHERE field_name = ?";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            $data['display_name'] ?? null,
            $data['description'] ?? null,
            $data['validation_rules'] ?? null,
            $data['example_value'] ?? null,
            $fieldName
        ]);
        
        sendJsonResponse(['updated' => $result], $result, $result ? 'フィールドドキュメント更新完了' : 'フィールドドキュメント更新失敗');
    } catch (Exception $e) {
        sendJsonResponse(null, false, 'フィールドドキュメント更新エラー: ' . $e->getMessage());
    }
    break;

// 🚀 高機能出品システム（エラーハンドリング強化版）
case 'execute_ebay_listing_advanced':
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['csv_data'])) {
            sendJsonResponse(null, false, '出品データが見つかりません');
            break;
        }
        
        $csvData = $input['csv_data'];
        $options = $input['options'] ?? [];
        $templateId = $options['template_id'] ?? 0;
        
        // HTMLテンプレート統合処理
        if ($templateId > 0) {
            $processor = new HTMLTemplateProcessor();
            $templateResult = $processor->processCSVWithTemplate($csvData, $templateId, [
                'csv_filename' => 'listing_' . date('Ymd_His') . '.csv',
                'enhance_data' => true
            ]);
            
            if ($templateResult['success']) {
                // HTML統合済みデータを使用
                $csvData = [];
                foreach ($templateResult['processed_items'] as $item) {
                    if ($item['success']) {
                        $csvData[] = $item['processed'];
                    }
                }
            }
        }
        
        // エラー分離出品システム
        $results = [
            'total_items' => count($csvData),
            'success_count' => 0,
            'error_count' => 0,
            'validation_errors' => [],
            'success_items' => [],
            'failed_items' => []
        ];
        
        foreach ($csvData as $index => $item) {
            try {
                // 1️⃣ バリデーション
                $validation = validateItemForEbay($item, $index);
                
                if (!$validation['valid']) {
                    $results['validation_errors'][] = [
                        'index' => $index,
                        'item' => $item,
                        'error_message' => $validation['error'],
                        'error_type' => 'validation'
                    ];
                    continue;
                }
                
                // 2️⃣ 実際の出品処理（テスト版）
                $dryRun = $options['dry_run'] ?? true;
                $listingResult = simulateEbayListing($item, $dryRun);
                
                if ($listingResult['success']) {
                    $results['success_items'][] = [
                        'index' => $index,
                        'item' => $item,
                        'ebay_item_id' => $listingResult['item_id'],
                        'listing_url' => $listingResult['listing_url'],
                        'message' => $listingResult['message']
                    ];
                    $results['success_count']++;
                } else {
                    $results['failed_items'][] = [
                        'index' => $index,
                        'item' => $item,
                        'error_message' => $listingResult['error'],
                        'error_type' => 'api_error'
                    ];
                    $results['error_count']++;
                }
                
            } catch (Exception $e) {
                $results['failed_items'][] = [
                    'index' => $index,
                    'item' => $item,
                    'error_message' => $e->getMessage(),
                    'error_type' => 'exception'
                ];
                $results['error_count']++;
            }
            
            // レート制限
            if (isset($options['delay_between_items'])) {
                usleep($options['delay_between_items'] * 1000);
            }
        }
        
        $results['success'] = $results['success_count'] > 0;
        $results['message'] = sprintf(
            '処理完了: 成功%d件、バリデーションエラー%d件、API失敗%d件',
            $results['success_count'],
            count($results['validation_errors']),
            $results['error_count']
        );
        
        sendJsonResponse($results, true, $results['message']);
        
    } catch (Exception $e) {
        sendJsonResponse(null, false, '高機能出品処理エラー: ' . $e->getMessage());
    }
    break;

/**
 * eBay出品用バリデーション関数
 */
function validateItemForEbay($item, $index) {
    $errors = [];
    
    // 必須フィールドチェック
    $requiredFields = ['Title', 'BuyItNowPrice', 'Category'];
    foreach ($requiredFields as $field) {
        if (empty($item[$field])) {
            $errors[] = "必須フィールド不足: {$field}";
        }
    }
    
    // 価格チェック
    if (isset($item['BuyItNowPrice'])) {
        $price = floatval($item['BuyItNowPrice']);
        if ($price <= 0 || $price > 99999) {
            $errors[] = "無効な価格: {$price}";
        }
    }
    
    // タイトル長制限
    if (strlen($item['Title'] ?? '') > 255) {
        $errors[] = "タイトルが長すぎます（255文字制限）";
    }
    
    // 禁止キーワードチェック
    $bannedKeywords = ['偽物', 'コピー品', 'レプリカ', 'fake', 'replica'];
    $title = strtolower($item['Title'] ?? '');
    foreach ($bannedKeywords as $keyword) {
        if (strpos($title, strtolower($keyword)) !== false) {
            $errors[] = "禁止キーワード検出: {$keyword}";
        }
    }
    
    return [
        'valid' => empty($errors),
        'error' => empty($errors) ? null : implode('; ', $errors),
        'warnings' => []
    ];
}

/**
 * eBay出品シミュレーション
 */
function simulateEbayListing($item, $dryRun = true) {
    // テスト版実装
    $success = rand(1, 10) > 2; // 80%成功率
    
    if ($success) {
        return [
            'success' => true,
            'item_id' => $dryRun ? 'DRY_RUN_' . uniqid() : 'EBAY_' . uniqid(),
            'listing_url' => $dryRun ? 'https://simulation.test/item/' . uniqid() : 'https://www.ebay.com/itm/' . uniqid(),
            'message' => $dryRun ? 'テスト出品成功' : '実際の出品成功'
        ];
    } else {
        return [
            'success' => false,
            'error' => 'シミュレーションエラー: ' . (['Price too low', 'Category mismatch', 'Title format error'][rand(0, 2)])
        ];
    }
}
?>