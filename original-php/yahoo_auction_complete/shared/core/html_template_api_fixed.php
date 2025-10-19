<?php
/**
 * HTMLテンプレート管理API（エラー修正専用版）
 * Yahoo Auction Tool - JSON エラー完全解決
 * 作成日: 2025-09-14
 */

// 🚨 完全エラー防止設定
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// 出力バッファ完全制御
while (ob_get_level()) {
    ob_end_clean();
}

// JSON専用ヘッダー設定
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

/**
 * 安全なJSON レスポンス送信
 */
function sendSafeJsonResponse($data, $success = true, $message = '') {
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'debug' => [
            'php_version' => PHP_VERSION,
            'error_fixed' => true
        ]
    ];
    
    $jsonOutput = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        // フォールバック JSON
        echo json_encode([
            'success' => false,
            'message' => 'JSON encoding error: ' . json_last_error_msg(),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        echo $jsonOutput;
    }
    
    exit;
}

// 🔧 データベース接続関数（エラー処理強化）
function getSafeDBConnection() {
    try {
        $host = 'localhost';
        $dbname = 'nagano3_db';
        $username = 'postgres';
        $password = '';
        
        $dsn = "pgsql:host={$host};dbname={$dbname}";
        $pdo = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        
        return $pdo;
    } catch (Exception $e) {
        error_log("DB接続エラー: " . $e->getMessage());
        return null;
    }
}

// アクション処理
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_POST['action'] ?? $_GET['action'] ?? '';

// デバッグログ
error_log("HTMLテンプレートAPI呼び出し: " . $action);

switch ($action) {
    case 'save_html_template':
        try {
            if (!$input || !isset($input['template_data'])) {
                sendSafeJsonResponse(null, false, 'テンプレートデータが見つかりません');
            }
            
            $templateData = $input['template_data'];
            
            // バリデーション
            if (empty($templateData['name']) || empty($templateData['html_content'])) {
                sendSafeJsonResponse(null, false, 'テンプレート名とHTML内容は必須です');
            }
            
            $pdo = getSafeDBConnection();
            if (!$pdo) {
                sendSafeJsonResponse(null, false, 'データベース接続エラー');
            }
            
            // テーブル存在確認・作成
            $createTableSQL = "
                CREATE TABLE IF NOT EXISTS product_html_templates (
                    template_id SERIAL PRIMARY KEY,
                    template_name VARCHAR(100) NOT NULL UNIQUE,
                    category VARCHAR(50) DEFAULT 'general',
                    template_description TEXT,
                    html_content TEXT NOT NULL,
                    css_styles TEXT,
                    placeholder_fields JSONB DEFAULT '[]'::jsonb,
                    usage_count INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_by VARCHAR(50) DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            ";
            
            try {
                $pdo->exec($createTableSQL);
            } catch (Exception $e) {
                error_log("テーブル作成エラー（無視可能）: " . $e->getMessage());
            }
            
            // プレースホルダー抽出
            $placeholders = [];
            if (preg_match_all('/\{\{([A-Z_]+)\}\}/', $templateData['html_content'], $matches)) {
                $placeholders = array_unique($matches[1]);
            }
            
            // テンプレート保存
            $sql = "
                INSERT INTO product_html_templates 
                (template_name, category, template_description, html_content, css_styles, placeholder_fields, created_by) 
                VALUES (:name, :category, :description, :html_content, :css_styles, :placeholders, :created_by)
                ON CONFLICT (template_name) 
                DO UPDATE SET 
                    template_description = EXCLUDED.template_description,
                    html_content = EXCLUDED.html_content,
                    css_styles = EXCLUDED.css_styles,
                    placeholder_fields = EXCLUDED.placeholder_fields,
                    updated_at = NOW()
            ";
            
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute([
                'name' => $templateData['name'],
                'category' => $templateData['category'] ?? 'general',
                'description' => $templateData['description'] ?? '',
                'html_content' => $templateData['html_content'],
                'css_styles' => $templateData['css_styles'] ?? '',
                'placeholders' => json_encode($placeholders),
                'created_by' => $templateData['created_by'] ?? 'user'
            ]);
            
            if ($result) {
                sendSafeJsonResponse([
                    'template_name' => $templateData['name'],
                    'placeholders_detected' => count($placeholders),
                    'placeholders' => $placeholders
                ], true, 'HTMLテンプレートを保存しました');
            } else {
                sendSafeJsonResponse(null, false, 'テンプレート保存に失敗しました');
            }
            
        } catch (Exception $e) {
            error_log("テンプレート保存エラー: " . $e->getMessage());
            sendSafeJsonResponse(null, false, 'テンプレート保存エラー: ' . $e->getMessage());
        }
        break;
        
    case 'get_saved_templates':
        try {
            $pdo = getSafeDBConnection();
            if (!$pdo) {
                sendSafeJsonResponse([], false, 'データベース接続エラー');
            }
            
            $sql = "
                SELECT 
                    template_id,
                    template_name,
                    category,
                    template_description,
                    placeholder_fields,
                    usage_count,
                    created_at,
                    updated_at
                FROM product_html_templates
                WHERE is_active = TRUE
                ORDER BY usage_count DESC, updated_at DESC
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $templates = $stmt->fetchAll();
            
            // placeholder_fields を配列に変換
            foreach ($templates as &$template) {
                $template['placeholder_fields'] = json_decode($template['placeholder_fields'] ?? '[]', true);
                $template['placeholder_count'] = count($template['placeholder_fields']);
            }
            
            sendSafeJsonResponse($templates, true, 'テンプレート一覧取得成功');
            
        } catch (Exception $e) {
            error_log("テンプレート一覧取得エラー: " . $e->getMessage());
            sendSafeJsonResponse([], false, 'テンプレート一覧取得エラー: ' . $e->getMessage());
        }
        break;
        
    case 'get_html_template':
        try {
            $templateId = $input['template_id'] ?? $_GET['template_id'] ?? null;
            
            if (!$templateId) {
                sendSafeJsonResponse(null, false, 'テンプレートIDが指定されていません');
            }
            
            $pdo = getSafeDBConnection();
            if (!$pdo) {
                sendSafeJsonResponse(null, false, 'データベース接続エラー');
            }
            
            $sql = "
                SELECT 
                    template_id,
                    template_name,
                    category,
                    template_description,
                    html_content,
                    css_styles,
                    placeholder_fields,
                    usage_count,
                    created_at,
                    updated_at
                FROM product_html_templates 
                WHERE template_id = :id AND is_active = TRUE
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['id' => $templateId]);
            $template = $stmt->fetch();
            
            if ($template) {
                $template['placeholder_fields'] = json_decode($template['placeholder_fields'] ?? '[]', true);
                sendSafeJsonResponse($template, true, 'テンプレート取得成功');
            } else {
                sendSafeJsonResponse(null, false, 'テンプレートが見つかりません');
            }
            
        } catch (Exception $e) {
            error_log("テンプレート取得エラー: " . $e->getMessage());
            sendSafeJsonResponse(null, false, 'テンプレート取得エラー: ' . $e->getMessage());
        }
        break;
        
    case 'delete_html_template':
        try {
            $templateId = $input['template_id'] ?? $_POST['template_id'] ?? null;
            
            if (!$templateId) {
                sendSafeJsonResponse(null, false, 'テンプレートIDが指定されていません');
            }
            
            $pdo = getSafeDBConnection();
            if (!$pdo) {
                sendSafeJsonResponse(null, false, 'データベース接続エラー');
            }
            
            // ソフトデリート
            $sql = "UPDATE product_html_templates SET is_active = FALSE, updated_at = NOW() WHERE template_id = :id";
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute(['id' => $templateId]);
            
            if ($result && $stmt->rowCount() > 0) {
                sendSafeJsonResponse(['deleted_id' => $templateId], true, 'テンプレートを削除しました');
            } else {
                sendSafeJsonResponse(null, false, 'テンプレートが見つかりませんでした');
            }
            
        } catch (Exception $e) {
            error_log("テンプレート削除エラー: " . $e->getMessage());
            sendSafeJsonResponse(null, false, 'テンプレート削除エラー: ' . $e->getMessage());
        }
        break;
        
    case 'generate_html_preview':
        try {
            $templateContent = $input['template_content'] ?? '';
            $sampleData = $input['sample_data'] ?? 'iphone';
            
            if (!$templateContent) {
                sendSafeJsonResponse(null, false, 'テンプレート内容が指定されていません');
            }
            
            // サンプルデータ
            $sampleProducts = [
                'iphone' => [
                    'Title' => 'iPhone 14 Pro - Space Black 128GB Unlocked',
                    'Brand' => 'Apple',
                    'current_price' => '899.99',
                    'description' => 'Excellent condition iPhone 14 Pro with all original accessories',
                    'condition_name' => 'Like New'
                ],
                'camera' => [
                    'Title' => 'Canon EOS R5 Mirrorless Camera Body',
                    'Brand' => 'Canon',
                    'current_price' => '3899.00',
                    'description' => 'Professional full-frame mirrorless camera with 45MP sensor',
                    'condition_name' => 'Excellent'
                ],
                'watch' => [
                    'Title' => 'Rolex Submariner Date Stainless Steel Watch',
                    'Brand' => 'Rolex',
                    'current_price' => '12500.00',
                    'description' => 'Luxury Swiss automatic diving watch in pristine condition',
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
                '{{FEATURE_2}}' => 'Fast international shipping from Japan',
                '{{FEATURE_3}}' => 'Professional customer support',
                '{{INCLUDED_ITEM_1}}' => $productData['Title'],
                '{{INCLUDED_ITEM_2}}' => 'Original packaging and accessories',
                '{{RETURN_POLICY}}' => '30-day money back guarantee',
                '{{SHIPPING_INFO}}' => 'Ships from Japan with tracking - 7-14 business days',
                '{{CURRENT_DATE}}' => date('Y-m-d'),
                '{{YEAR}}' => date('Y'),
                '{{LOCATION}}' => 'Japan',
                '{{SELLER_INFO}}' => 'Professional Japanese seller',
                '{{MAIN_IMAGE}}' => 'https://via.placeholder.com/400x300?text=' . urlencode($productData['Title']),
                '{{SPECIFICATIONS}}' => 'Detailed specifications available upon request',
                '{{SHIPPING_DAYS}}' => '7-14',
                '{{CURRENCY}}' => '$'
            ];
            
            $previewHTML = str_replace(array_keys($replacements), array_values($replacements), $templateContent);
            
            // CSS統合
            if (!empty($input['css_styles'])) {
                $previewHTML .= "\n<style>\n" . $input['css_styles'] . "\n</style>";
            }
            
            sendSafeJsonResponse([
                'html' => $previewHTML,
                'sample_data_used' => $sampleData,
                'placeholders_replaced' => count($replacements)
            ], true, 'プレビュー生成成功');
            
        } catch (Exception $e) {
            error_log("プレビュー生成エラー: " . $e->getMessage());
            sendSafeJsonResponse(null, false, 'プレビュー生成エラー: ' . $e->getMessage());
        }
        break;
        
    case 'generate_quick_template':
        try {
            $templateType = $input['type'] ?? $_GET['type'] ?? $_POST['type'] ?? 'basic';
            
            $templates = [
                'basic' => [
                    'name' => 'Basic Product Template',
                    'html' => '<div class="basic-product" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px;">
                        <h2 style="color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 10px;">{{TITLE}}</h2>
                        <div style="font-size: 24px; color: #e74c3c; font-weight: bold; margin: 15px 0;">${{PRICE}}</div>
                        <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}" style="max-width: 100%; height: auto;">
                        <p><strong>Brand:</strong> {{BRAND}}</p>
                        <p><strong>Condition:</strong> {{CONDITION}}</p>
                        <div style="margin: 15px 0;">{{DESCRIPTION}}</div>
                        <div style="background: #e8f4fd; padding: 10px; border-radius: 5px;">{{SHIPPING_INFO}}</div>
                        <div style="margin-top: 15px; font-weight: bold;">Return Policy: {{RETURN_POLICY}}</div>
                    </div>'
                ],
                'premium' => [
                    'name' => 'Premium Product Template',
                    'html' => '<div class="premium-product" style="max-width: 800px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="font-size: 28px; margin-bottom: 10px;">{{TITLE}}</h1>
                            <div style="background: gold; color: black; padding: 8px 20px; border-radius: 20px; display: inline-block; font-weight: bold;">Premium Quality</div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: center;">
                            <div>
                                <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}" style="width: 100%; border-radius: 10px;">
                            </div>
                            <div>
                                <div style="font-size: 32px; font-weight: bold; margin-bottom: 20px;">${{PRICE}}</div>
                                <ul style="list-style: none; padding: 0;">
                                    <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                                        <span style="position: absolute; left: 0; color: gold;">✓</span>{{FEATURE_1}}
                                    </li>
                                    <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                                        <span style="position: absolute; left: 0; color: gold;">✓</span>{{FEATURE_2}}
                                    </li>
                                    <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                                        <span style="position: absolute; left: 0; color: gold;">✓</span>{{FEATURE_3}}
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div style="text-align: center; margin-top: 30px; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 10px;">
                            <strong>{{RETURN_POLICY}} Guarantee - Premium Customer Service</strong>
                        </div>
                    </div>'
                ],
                'minimal' => [
                    'name' => 'Minimal Clean Template',
                    'html' => '<div class="minimal-product" style="font-family: \"Helvetica Neue\", sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: white; border: 1px solid #eee; border-radius: 8px;">
                        <h3 style="font-size: 24px; font-weight: 300; margin-bottom: 15px; color: #333;">{{TITLE}}</h3>
                        <div style="font-size: 28px; color: #333; margin: 20px 0; font-weight: 300;">${{PRICE}}</div>
                        <p style="line-height: 1.6; color: #666; margin: 20px 0;">{{DESCRIPTION}}</p>
                        <div style="color: #999; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <span style="margin-right: 20px;">{{BRAND}}</span> • <span>{{CONDITION}}</span>
                        </div>
                    </div>'
                ]
            ];
            
            $template = $templates[$templateType] ?? $templates['basic'];
            
            sendSafeJsonResponse($template, true, 'クイックテンプレート生成成功');
            
        } catch (Exception $e) {
            error_log("クイックテンプレート生成エラー: " . $e->getMessage());
            sendSafeJsonResponse(null, false, 'クイックテンプレート生成エラー: ' . $e->getMessage());
        }
        break;
        
    default:
        sendSafeJsonResponse(null, false, '不明なアクション: ' . $action);
        break;
}
