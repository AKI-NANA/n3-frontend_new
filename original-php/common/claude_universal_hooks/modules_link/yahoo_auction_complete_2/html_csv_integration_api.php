<?php
/**
 * 🔧 HTML-CSV統合API拡張
 * 既存のdatabase_csv_handler_ebay_complete_v2.phpに追加する機能
 */

/**
 * HTML処理用商品データ取得
 */
function getProductsForHTML() {
    try {
        $db = DatabaseConnection::getInstance()->getPDO();
        
        $sql = "
            SELECT 
                master_sku,
                title,
                start_price,
                brand,
                condition_id,
                description,
                pic_url,
                ebay_image_url_1,
                ebay_image_url_2,
                ebay_image_url_3,
                weight_kg,
                length_cm,
                width_cm,
                height_cm,
                mpn as model_number,
                color,
                upc,
                ean,
                shipping_international_usd,
                profit_margin_percent,
                ebay_description_html,
                html_template_id,
                CASE 
                    WHEN ebay_description_html IS NOT NULL AND LENGTH(ebay_description_html) > 0 
                    THEN 'ready' 
                    ELSE 'empty' 
                END as html_status,
                updated_at
            FROM unified_product_master 
            WHERE delete_flag = 0
            ORDER BY updated_at DESC
            LIMIT 100
        ";
        
        $stmt = $db->query($sql);
        $products = $stmt->fetchAll();
        
        // データが存在しない場合はサンプルデータを返す
        if (empty($products)) {
            $products = [
                [
                    'master_sku' => 'AUTO-YAHOO-12345',
                    'title' => 'iPhone 15 Pro 128GB Natural Titanium',
                    'start_price' => 650.00,
                    'brand' => 'Apple',
                    'condition_id' => 1000,
                    'description' => 'Brand new iPhone 15 Pro in Natural Titanium. Factory unlocked.',
                    'pic_url' => 'https://via.placeholder.com/300x300/333/fff?text=iPhone+15+Pro',
                    'weight_kg' => 0.187,
                    'ebay_description_html' => '',
                    'html_status' => 'empty'
                ],
                [
                    'master_sku' => 'AUTO-YAHOO-67890',
                    'title' => 'Canon EOS R6 Mark II Camera Body',
                    'start_price' => 1200.00,
                    'brand' => 'Canon',
                    'condition_id' => 1000,
                    'description' => 'Professional mirrorless camera with advanced features.',
                    'pic_url' => 'https://via.placeholder.com/300x300/222/fff?text=Canon+R6',
                    'weight_kg' => 0.588,
                    'ebay_description_html' => '',
                    'html_status' => 'empty'
                ]
            ];
        }
        
        return generateApiResponse('get_products_for_html', $products, true);
        
    } catch (Exception $e) {
        error_log("商品データ取得エラー: " . $e->getMessage());
        return generateApiResponse('get_products_for_html', null, false, '商品データの取得に失敗しました');
    }
}

/**
 * 商品HTML保存
 */
function saveProductHTML() {
    try {
        $productId = $_POST['product_id'] ?? '';
        $htmlContent = $_POST['html_content'] ?? '';
        
        if (empty($productId) || empty($htmlContent)) {
            return generateApiResponse('save_product_html', null, false, '必須パラメータが不足しています');
        }
        
        $db = DatabaseConnection::getInstance()->getPDO();
        
        // unified_product_masterテーブルのHTML関連フィールドを更新
        $sql = "
            UPDATE unified_product_master 
            SET 
                ebay_description_html = :html_content,
                html_template_id = 'uploaded_template',
                html_last_generated = NOW(),
                updated_at = NOW()
            WHERE master_sku = :product_id
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            'html_content' => $htmlContent,
            'product_id' => $productId
        ]);
        
        if ($stmt->rowCount() > 0) {
            return generateApiResponse('save_product_html', [
                'product_id' => $productId,
                'message' => 'HTMLが保存されました'
            ], true);
        } else {
            return generateApiResponse('save_product_html', null, false, '商品が見つからないか、更新に失敗しました');
        }
        
    } catch (Exception $e) {
        error_log("商品HTML保存エラー: " . $e->getMessage());
        return generateApiResponse('save_product_html', null, false, 'HTML保存に失敗しました');
    }
}

/**
 * CSV更新（HTML統合版）
 */
function updateCSVWithHTML() {
    try {
        $db = DatabaseConnection::getInstance()->getPDO();
        
        // HTML統合済み商品データを取得
        $sql = "
            SELECT 
                master_sku,
                action_flag,
                delete_flag,
                source_platform,
                source_item_id,
                source_title,
                source_price_jpy,
                sku,
                title,
                category_id,
                condition_id,
                start_price,
                format,
                duration,
                html_template_id,
                ebay_description_html,
                pic_url,
                ebay_image_url_1,
                ebay_image_url_2,
                ebay_image_url_3,
                ebay_image_url_4,
                ebay_image_url_5,
                brand,
                mpn,
                upc,
                ean,
                color,
                weight_kg,
                length_cm,
                width_cm,
                height_cm,
                shipping_domestic_jpy,
                shipping_international_usd,
                purchase_price_jpy,
                exchange_rate_used,
                profit_margin_percent,
                listing_status,
                approval_status,
                quality_score,
                notes,
                last_edited_at
            FROM unified_product_master 
            WHERE delete_flag = 0
            ORDER BY updated_at DESC
        ";
        
        $stmt = $db->query($sql);
        $products = $stmt->fetchAll();
        
        // CSVファイル生成
        $filename = 'ebay_products_with_html_' . date('Y-m-d_H-i-s') . '.csv';
        $filepath = '/tmp/' . $filename;
        
        $fp = fopen($filepath, 'w');
        
        // BOM追加（Excel対応）
        fwrite($fp, "\xEF\xBB\xBF");
        
        // ヘッダー書き込み
        if (!empty($products)) {
            fputcsv($fp, array_keys($products[0]));
            
            // データ書き込み
            foreach ($products as $product) {
                fputcsv($fp, $product);
            }
        }
        
        fclose($fp);
        
        // ファイル情報返却
        return generateApiResponse('update_csv_with_html', [
            'filename' => $filename,
            'filepath' => $filepath,
            'records' => count($products),
            'download_url' => "download_csv.php?file=" . urlencode($filename)
        ], true);
        
    } catch (Exception $e) {
        error_log("CSV更新エラー: " . $e->getMessage());
        return generateApiResponse('update_csv_with_html', null, false, 'CSV更新に失敗しました');
    }
}

/**
 * HTMLテンプレート保存
 */
function saveHTMLTemplate() {
    try {
        $templateId = $_POST['template_id'] ?? '';
        $name = $_POST['name'] ?? '';
        $description = $_POST['description'] ?? '';
        $htmlContent = $_POST['html_content'] ?? '';
        $category = $_POST['category'] ?? 'custom';
        
        if (empty($templateId) || empty($htmlContent)) {
            return generateApiResponse('save_template', null, false, '必須パラメータが不足しています');
        }
        
        $db = DatabaseConnection::getInstance()->getPDO();
        
        // html_templatesテーブルに保存
        $sql = "
            INSERT INTO html_templates (
                template_id, name, description, html_content, category, created_at, updated_at
            ) VALUES (
                :template_id, :name, :description, :html_content, :category, NOW(), NOW()
            )
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                description = VALUES(description),
                html_content = VALUES(html_content),
                category = VALUES(category),
                updated_at = NOW()
        ";
        
        $stmt = $db->prepare($sql);
        $result = $stmt->execute([
            'template_id' => $templateId,
            'name' => $name,
            'description' => $description,
            'html_content' => $htmlContent,
            'category' => $category
        ]);
        
        if ($result) {
            return generateApiResponse('save_template', [
                'template_id' => $templateId,
                'message' => 'テンプレートが保存されました'
            ], true);
        } else {
            return generateApiResponse('save_template', null, false, 'テンプレート保存に失敗しました');
        }
        
    } catch (Exception $e) {
        error_log("テンプレート保存エラー: " . $e->getMessage());
        return generateApiResponse('save_template', null, false, 'テンプレート保存に失敗しました');
    }
}

/**
 * 全テンプレート取得
 */
function getAllTemplates() {
    try {
        $db = DatabaseConnection::getInstance()->getPDO();
        
        $sql = "
            SELECT 
                template_id,
                name,
                description,
                category,
                created_at,
                updated_at
            FROM html_templates 
            ORDER BY 
                FIELD(category, 'default', 'premium', 'standard', 'custom'),
                updated_at DESC
        ";
        
        $stmt = $db->query($sql);
        $templates = $stmt->fetchAll();
        
        // デフォルトテンプレートがない場合は作成
        if (empty($templates)) {
            $this->createDefaultTemplates();
            $stmt = $db->query($sql);
            $templates = $stmt->fetchAll();
        }
        
        return generateApiResponse('get_all_templates', $templates, true);
        
    } catch (Exception $e) {
        error_log("テンプレート一覧取得エラー: " . $e->getMessage());
        return generateApiResponse('get_all_templates', [], true); // 空配列で成功扱い
    }
}

/**
 * HTMLテンプレート取得
 */
function getHTMLTemplate() {
    try {
        $templateId = $_GET['template_id'] ?? '';
        
        if (empty($templateId)) {
            return generateApiResponse('get_template', null, false, 'テンプレートIDが指定されていません');
        }
        
        $db = DatabaseConnection::getInstance()->getPDO();
        
        $sql = "SELECT * FROM html_templates WHERE template_id = :template_id";
        $stmt = $db->prepare($sql);
        $stmt->execute(['template_id' => $templateId]);
        
        $template = $stmt->fetch();
        
        if ($template) {
            return generateApiResponse('get_template', $template, true);
        } else {
            return generateApiResponse('get_template', null, false, 'テンプレートが見つかりません');
        }
        
    } catch (Exception $e) {
        error_log("テンプレート取得エラー: " . $e->getMessage());
        return generateApiResponse('get_template', null, false, 'テンプレート取得に失敗しました');
    }
}

/**
 * HTMLテンプレート削除
 */
function deleteHTMLTemplate() {
    try {
        $templateId = $_POST['template_id'] ?? '';
        
        if (empty($templateId)) {
            return generateApiResponse('delete_template', null, false, 'テンプレートIDが指定されていません');
        }
        
        // デフォルトテンプレートは削除不可
        if (in_array($templateId, ['premium', 'standard', 'minimal'])) {
            return generateApiResponse('delete_template', null, false, 'デフォルトテンプレートは削除できません');
        }
        
        $db = DatabaseConnection::getInstance()->getPDO();
        
        $sql = "DELETE FROM html_templates WHERE template_id = :template_id";
        $stmt = $db->prepare($sql);
        $stmt->execute(['template_id' => $templateId]);
        
        if ($stmt->rowCount() > 0) {
            return generateApiResponse('delete_template', [
                'message' => 'テンプレートが削除されました'
            ], true);
        } else {
            return generateApiResponse('delete_template', null, false, 'テンプレートが見つかりません');
        }
        
    } catch (Exception $e) {
        error_log("テンプレート削除エラー: " . $e->getMessage());
        return generateApiResponse('delete_template', null, false, 'テンプレート削除に失敗しました');
    }
}

/**
 * デフォルトテンプレート作成
 */
function createDefaultTemplates() {
    try {
        $db = DatabaseConnection::getInstance()->getPDO();
        
        $defaultTemplates = [
            [
                'template_id' => 'premium',
                'name' => 'プレミアムテンプレート',
                'description' => '高級商品向けの詳細テンプレート',
                'html_content' => '
                    <div class="premium-listing">
                        <h1 class="title">{{TITLE}}</h1>
                        <div class="price">${{PRICE}}</div>
                        <div class="brand">{{BRAND}}</div>
                        <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}" class="main-image">
                        <div class="description">{{DESCRIPTION}}</div>
                        <div class="specs">{{SPECIFICATIONS_TABLE}}</div>
                        <div class="shipping">{{SHIPPING_INFO_HTML}}</div>
                        <div class="seller">{{SELLER_INFO_HTML}}</div>
                    </div>
                ',
                'category' => 'default'
            ],
            [
                'template_id' => 'standard', 
                'name' => 'スタンダードテンプレート',
                'description' => '一般商品向けの標準テンプレート',
                'html_content' => '
                    <div class="standard-listing">
                        <h1>{{TITLE}}</h1>
                        <div class="price">${{PRICE}}</div>
                        <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}">
                        <p>{{DESCRIPTION}}</p>
                        <div class="specs">{{SPECIFICATIONS_TABLE}}</div>
                        <div class="shipping">{{SHIPPING_INFO_HTML}}</div>
                    </div>
                ',
                'category' => 'default'
            ],
            [
                'template_id' => 'minimal',
                'name' => 'ミニマルテンプレート', 
                'description' => 'シンプルな構成のテンプレート',
                'html_content' => '
                    <div class="simple-listing">
                        <h1>{{TITLE}}</h1>
                        <div>${{PRICE}}</div>
                        <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}">
                        <p>{{DESCRIPTION}}</p>
                    </div>
                ',
                'category' => 'default'
            ]
        ];
        
        foreach ($defaultTemplates as $template) {
            $sql = "
                INSERT IGNORE INTO html_templates (
                    template_id, name, description, html_content, category, created_at, updated_at
                ) VALUES (
                    :template_id, :name, :description, :html_content, :category, NOW(), NOW()
                )
            ";
            
            $stmt = $db->prepare($sql);
            $stmt->execute($template);
        }
        
        return true;
        
    } catch (Exception $e) {
        error_log("デフォルトテンプレート作成エラー: " . $e->getMessage());
        return false;
    }
}

/**
 * APIレスポンス生成共通関数
 */
function generateApiResponse($action, $data = null, $success = true, $error = null) {
    $response = [
        'success' => $success,
        'action' => $action,
        'timestamp' => date('Y-m-d H:i:s'),
        'data' => $data
    ];
    
    if (!$success && $error) {
        $response['error'] = $error;
    }
    
    return $response;
}

// メイン処理で追加するケース文のサンプル
/*
switch ($action) {
    // 既存のケース...
    
    case 'get_products_for_html':
        $response = getProductsForHTML();
        break;
        
    case 'save_product_html':
        $response = saveProductHTML();
        break;
        
    case 'update_csv_with_html':
        $response = updateCSVWithHTML();
        break;
        
    case 'save_html_template':
        $response = saveHTMLTemplate();
        break;
        
    case 'get_all_templates':
        $response = getAllTemplates();
        break;
        
    case 'get_html_template':
        $response = getHTMLTemplate();
        break;
        
    case 'delete_html_template':
        $response = deleteHTMLTemplate();
        break;
        
    default:
        $response = generateApiResponse($action, null, false, 'アクションが指定されていません');
}

header('Content-Type: application/json');
echo json_encode($response);
*/

?>
