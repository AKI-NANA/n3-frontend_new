            'results' => $results,
            'total_processed' => count($results),
            'success_count' => count(array_filter($results, function($r) { return $r['success']; })),
            'error_count' => count(array_filter($results, function($r) { return !$r['success']; }))
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'results' => []
        ];
    }
}

/**
 * デフォルトテンプレートをデータベースに初期化
 */
function initializeDefaultTemplates() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['success' => false, 'error' => 'データベース接続エラー'];
        }
        
        // テーブル作成
        $createTableSql = "
        CREATE TABLE IF NOT EXISTS product_html_templates (
            template_id SERIAL PRIMARY KEY,
            template_name VARCHAR(100) NOT NULL UNIQUE,
            category VARCHAR(50) DEFAULT 'General',
            html_content TEXT NOT NULL,
            css_styles TEXT,
            javascript_code TEXT,
            placeholder_fields JSONB,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        ";
        
        $pdo->exec($createTableSql);
        
        // 既存テンプレートチェック
        $checkSql = "SELECT COUNT(*) as count FROM product_html_templates";
        $checkResult = $pdo->query($checkSql)->fetch();
        
        if ($checkResult['count'] > 0) {
            return ['success' => true, 'message' => '既存テンプレートが存在します', 'action' => 'skipped'];
        }
        
        // デフォルトテンプレート群
        $templates = [
            [
                'template_name' => 'Japanese Premium Template',
                'category' => 'Electronics',
                'html_content' => '
                <div class="product-description-premium">
                    <div class="header-section">
                        <h2 class="product-title">{{PRODUCT_NAME}}</h2>
                        <div class="origin-badge">🇯🇵 Authentic from Japan</div>
                        <div class="price-display">{{PRICE}}</div>
                    </div>
                    
                    <div class="feature-grid">
                        <div class="feature-item">
                            <h4>🔥 Product Highlights</h4>
                            <ul>
                                <li>{{FEATURE_1}}</li>
                                <li>{{FEATURE_2}}</li>
                                <li>{{FEATURE_3}}</li>
                            </ul>
                        </div>
                        
                        <div class="feature-item">
                            <h4>📦 What You Get</h4>
                            <ul>
                                <li>{{INCLUDED_ITEM_1}}</li>
                                <li>{{INCLUDED_ITEM_2}}</li>
                                <li>Original packaging (if available)</li>
                            </ul>
                        </div>
                        
                        <div class="feature-item">
                            <h4>🛠️ Product Details</h4>
                            <table>
                                <tr><td>Condition:</td><td>{{CONDITION}}</td></tr>
                                <tr><td>Brand:</td><td>{{BRAND}}</td></tr>
                                <tr><td>Category:</td><td>{{CATEGORY}}</td></tr>
                                <tr><td>Origin:</td><td>{{SHIPPING_ORIGIN}}</td></tr>
                            </table>
                        </div>
                    </div>
                    
                    <div class="shipping-section">
                        <h4>🚚 International Shipping from Japan</h4>
                        <p>Fast and secure shipping worldwide. Tracking included.</p>
                        <div class="shipping-countries">
                            <span>🇺🇸 USA</span>
                            <span>🇨🇦 Canada</span>
                            <span>🇬🇧 UK</span>
                            <span>🇦🇺 Australia</span>
                            <span>🇩🇪 Germany</span>
                        </div>
                    </div>
                    
                    <div class="guarantee-section">
                        <h4>✅ Our Promise</h4>
                        <ul>
                            <li>🔍 Item exactly as described</li>
                            <li>📦 Secure packaging</li>
                            <li>🛡️ {{RETURN_POLICY}} return policy</li>
                            <li>⭐ 5-star customer service</li>
                        </ul>
                    </div>
                    
                    <div class="footer-section">
                        <p class="listing-date">Listed on {{CURRENT_DATE}} by {{SELLER_INFO}}</p>
                    </div>
                </div>',
                'css_styles' => '
                .product-description-premium {
                    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    border-radius: 15px;
                    padding: 30px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    line-height: 1.6;
                }
                .header-section {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #3498db;
                }
                .product-title {
                    font-size: 28px;
                    color: #2c3e50;
                    margin-bottom: 15px;
                    font-weight: 700;
                }
                .origin-badge {
                    background: linear-gradient(45deg, #e74c3c, #c0392b);
                    color: white;
                    padding: 10px 25px;
                    border-radius: 25px;
                    font-weight: 600;
                    display: inline-block;
                    margin-bottom: 15px;
                }
                .price-display {
                    font-size: 24px;
                    font-weight: 700;
                    color: #27ae60;
                    background: rgba(39, 174, 96, 0.1);
                    padding: 10px 20px;
                    border-radius: 10px;
                    display: inline-block;
                }
                .feature-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 25px;
                    margin-bottom: 30px;
                }
                .feature-item {
                    background: rgba(255,255,255,0.9);
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                }
                .feature-item h4 {
                    color: #2980b9;
                    font-size: 18px;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .feature-item ul {
                    list-style: none;
                    padding: 0;
                }
                .feature-item li {
                    padding: 8px 0;
                    border-bottom: 1px solid #ecf0f1;
                    position: relative;
                    padding-left: 25px;
                }
                .feature-item li:before {
                    content: "✓";
                    position: absolute;
                    left: 0;
                    color: #27ae60;
                    font-weight: bold;
                }
                .feature-item table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .feature-item td {
                    padding: 8px 0;
                    border-bottom: 1px solid #ecf0f1;
                }
                .feature-item td:first-child {
                    font-weight: 600;
                    color: #34495e;
                    width: 40%;
                }
                .shipping-section, .guarantee-section {
                    background: rgba(255,255,255,0.95);
                    padding: 25px;
                    border-radius: 12px;
                    margin: 20px 0;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.08);
                }
                .shipping-countries {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-top: 15px;
                }
                .shipping-countries span {
                    background: #3498db;
                    color: white;
                    padding: 8px 15px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 500;
                }
                .guarantee-section ul {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 10px;
                    list-style: none;
                    padding: 0;
                }
                .guarantee-section li {
                    background: #ecf8ff;
                    padding: 12px;
                    border-radius: 8px;
                    border-left: 4px solid #3498db;
                    font-weight: 500;
                }
                .footer-section {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                }
                .listing-date {
                    color: #7f8c8d;
                    font-size: 14px;
                    font-style: italic;
                }
                @media (max-width: 768px) {
                    .product-description-premium { padding: 20px; }
                    .feature-grid { grid-template-columns: 1fr; }
                    .shipping-countries { justify-content: center; }
                    .guarantee-section ul { grid-template-columns: 1fr; }
                }',
                'placeholder_fields' => json_encode([
                    "PRODUCT_NAME", "PRICE", "FEATURE_1", "FEATURE_2", "FEATURE_3", 
                    "INCLUDED_ITEM_1", "INCLUDED_ITEM_2", "CONDITION", "BRAND", 
                    "CATEGORY", "SHIPPING_ORIGIN", "RETURN_POLICY", "CURRENT_DATE", "SELLER_INFO"
                ])
            ],
            [
                'template_name' => 'Simple Clean Template',
                'category' => 'General',
                'html_content' => '
                <div class="simple-product-desc">
                    <div class="product-header">
                        <h3>{{PRODUCT_NAME}}</h3>
                        <div class="price-tag">{{PRICE}}</div>
                    </div>
                    
                    <div class="product-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <strong>Condition:</strong> {{CONDITION}}
                            </div>
                            <div class="detail-item">
                                <strong>Brand:</strong> {{BRAND}}
                            </div>
                            <div class="detail-item">
                                <strong>Category:</strong> {{CATEGORY}}
                            </div>
                            <div class="detail-item">
                                <strong>Currency:</strong> {{CURRENCY}}
                            </div>
                        </div>
                    </div>
                    
                    <div class="description-section">
                        <h4>Product Description</h4>
                        <p>{{DESCRIPTION}}</p>
                    </div>
                    
                    <div class="shipping-info">
                        <h4>🚚 Shipping Information</h4>
                        <p>Ships from {{SHIPPING_ORIGIN}} with tracking. Delivery time: {{SHIPPING_DAYS}} business days.</p>
                    </div>
                    
                    <div class="return-policy">
                        <h4>🔄 Return Policy</h4>
                        <p>{{RETURN_POLICY}} return policy. Item must be in original condition.</p>
                    </div>
                </div>',
                'css_styles' => '
                .simple-product-desc {
                    max-width: 700px;
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    padding: 25px;
                    background: #f9f9f9;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    margin: 0 auto;
                }
                .product-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #2c5aa0;
                }
                .simple-product-desc h3 {
                    color: #2c5aa0;
                    margin: 0;
                    font-size: 1.5rem;
                    flex: 1;
                }
                .price-tag {
                    background: #27ae60;
                    color: white;
                    padding: 8px 15px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 1.1rem;
                }
                .detail-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .detail-item {
                    background: white;
                    padding: 10px 15px;
                    border-radius: 5px;
                    border-left: 3px solid #2c5aa0;
                }
                .simple-product-desc h4 {
                    color: #2c5aa0;
                    margin: 25px 0 10px 0;
                    font-size: 1.2rem;
                }
                .description-section,
                .shipping-info, 
                .return-policy {
                    background: white;
                    padding: 20px;
                    margin: 15px 0;
                    border-radius: 8px;
                    border-left: 4px solid #2c5aa0;
                }
                .description-section p {
                    margin: 10px 0;
                    text-align: justify;
                }
                @media (max-width: 600px) {
                    .product-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 10px;
                    }
                    .detail-grid {
                        grid-template-columns: 1fr;
                    }
                }',
                'placeholder_fields' => json_encode([
                    "PRODUCT_NAME", "PRICE", "CONDITION", "BRAND", "CATEGORY", 
                    "CURRENCY", "DESCRIPTION", "SHIPPING_ORIGIN", "SHIPPING_DAYS", "RETURN_POLICY"
                ])
            ],
            [
                'template_name' => 'Collectibles Specialized',
                'category' => 'Collectibles',
                'html_content' => '
                <div class="collectibles-template">
                    <div class="collector-header">
                        <div class="authenticity-seal">🏆 AUTHENTIC COLLECTIBLE</div>
                        <h2>{{PRODUCT_NAME}}</h2>
                        <div class="rarity-badge">{{FEATURE_1}}</div>
                    </div>
                    
                    <div class="collectible-info">
                        <div class="info-card">
                            <h4>📋 Item Information</h4>
                            <ul>
                                <li><strong>Condition:</strong> {{CONDITION}}</li>
                                <li><strong>Brand/Series:</strong> {{BRAND}}</li>
                                <li><strong>Category:</strong> {{CATEGORY}}</li>
                                <li><strong>Price:</strong> {{PRICE}}</li>
                            </ul>
                        </div>
                        
                        <div class="info-card">
                            <h4>⭐ Collector Notes</h4>
                            <p>{{DESCRIPTION}}</p>
                            <p><strong>Special Features:</strong></p>
                            <ul>
                                <li>{{FEATURE_2}}</li>
                                <li>{{FEATURE_3}}</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="authenticity-guarantee">
                        <h4>🔒 Authenticity Guarantee</h4>
                        <p>This item is guaranteed authentic and sourced directly from Japan. All collectibles undergo verification before listing.</p>
                    </div>
                    
                    <div class="collector-shipping">
                        <h4>📦 Collector-Safe Shipping</h4>
                        <p>Special packaging for collectibles • Insured shipping • Tracking included • Ships from {{SHIPPING_ORIGIN}}</p>
                    </div>
                </div>',
                'css_styles' => '
                .collectibles-template {
                    max-width: 750px;
                    margin: 0 auto;
                    font-family: "Times New Roman", serif;
                    background: linear-gradient(135deg, #2d1b69 0%, #11052c 100%);
                    color: #f8f9fa;
                    padding: 30px;
                    border-radius: 15px;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.3);
                }
                .collector-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding: 25px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 12px;
                    border: 2px solid #ffd700;
                }
                .authenticity-seal {
                    background: linear-gradient(45deg, #ffd700, #ffed4e);
                    color: #2d1b69;
                    padding: 8px 20px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 0.9rem;
                    display: inline-block;
                    margin-bottom: 15px;
                }
                .collector-header h2 {
                    color: #ffd700;
                    font-size: 2rem;
                    margin: 15px 0;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                }
                .rarity-badge {
                    background: linear-gradient(45deg, #e74c3c, #c0392b);
                    padding: 6px 15px;
                    border-radius: 15px;
                    font-size: 0.85rem;
                    font-weight: 600;
                }
                .collectible-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 25px;
                    margin-bottom: 25px;
                }
                .info-card {
                    background: rgba(255,255,255,0.08);
                    padding: 20px;
                    border-radius: 10px;
                    border-left: 4px solid #ffd700;
                }
                .info-card h4 {
                    color: #ffd700;
                    margin-bottom: 15px;
                    font-size: 1.2rem;
                }
                .info-card ul {
                    list-style: none;
                    padding: 0;
                }
                .info-card li {
                    padding: 5px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .authenticity-guarantee,
                .collector-shipping {
                    background: rgba(39,174,96,0.2);
                    padding: 20px;
                    margin: 20px 0;
                    border-radius: 10px;
                    border: 1px solid #27ae60;
                }
                .authenticity-guarantee h4,
                .collector-shipping h4 {
                    color: #2ecc71;
                    margin-bottom: 10px;
                }
                @media (max-width: 768px) {
                    .collectible-info {
                        grid-template-columns: 1fr;
                    }
                    .collector-header h2 {
                        font-size: 1.5rem;
                    }
                }',
                'placeholder_fields' => json_encode([
                    "PRODUCT_NAME", "PRICE", "CONDITION", "BRAND", "CATEGORY", 
                    "DESCRIPTION", "FEATURE_1", "FEATURE_2", "FEATURE_3", "SHIPPING_ORIGIN"
                ])
            ]
        ];
        
        $insertedCount = 0;
        foreach ($templates as $template) {
            try {
                $sql = "
                INSERT INTO product_html_templates 
                (template_name, category, html_content, css_styles, placeholder_fields, is_active) 
                VALUES (?, ?, ?, ?, ?, TRUE)
                ";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $template['template_name'],
                    $template['category'],
                    $template['html_content'],
                    $template['css_styles'],
                    $template['placeholder_fields']
                ]);
                
                $insertedCount++;
            } catch (PDOException $e) {
                error_log("テンプレート挿入エラー: " . $e->getMessage());
            }
        }
        
        return [
            'success' => true,
            'message' => "{$insertedCount}個のデフォルトテンプレートを初期化しました",
            'inserted_count' => $insertedCount
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * テンプレートプレビュー生成
 */
function generateTemplatePreview($templateName, $sampleData = null) {
    try {
        $generator = new ProductHTMLGenerator();
        
        // サンプルデータがない場合はデフォルトを使用
        if (!$sampleData) {
            $sampleData = [
                'Title' => 'Sample Product - iPhone 14 Pro',
                'Brand' => 'Apple',
                'Description' => 'This is a sample product description for template preview purposes.',
                'BuyItNowPrice' => '999.99',
                'Category' => 'Electronics',
                'ConditionID' => '3000',
                'Currency' => 'USD'
            ];
        }
        
        $html = $generator->generateHTMLDescription($sampleData, $templateName);
        
        return [
            'success' => true,
            'html' => $html,
            'template_name' => $templateName,
            'sample_data' => $sampleData
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'template_name' => $templateName
        ];
    }
}

/**
 * テンプレート使用統計
 */
function getTemplateUsageStats() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['success' => false, 'error' => 'データベース接続エラー'];
        }
        
        $sql = "
        SELECT 
            template_name,
            category,
            is_active,
            created_at,
            updated_at,
            CASE 
                WHEN updated_at > NOW() - INTERVAL '7 days' THEN 'recent'
                WHEN updated_at > NOW() - INTERVAL '30 days' THEN 'active'
                ELSE 'old'
            END as usage_status
        FROM product_html_templates
        ORDER BY updated_at DESC;
        ";
        
        $stmt = $pdo->query($sql);
        $templates = $stmt->fetchAll();
        
        // 統計計算
        $stats = [
            'total_templates' => count($templates),
            'active_templates' => count(array_filter($templates, fn($t) => $t['is_active'])),
            'categories' => array_count_values(array_column($templates, 'category')),
            'recent_updates' => count(array_filter($templates, fn($t) => $t['usage_status'] === 'recent'))
        ];
        
        return [
            'success' => true,
            'templates' => $templates,
            'statistics' => $stats
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

// 初期化確認（オプション）
if (function_exists('getDatabaseConnection')) {
    $pdo = getDatabaseConnection();
    if ($pdo) {
        // テーブル存在確認
        $tableCheck = $pdo->query("SELECT to_regclass('public.product_html_templates') IS NOT NULL as exists")->fetch();
        if (!$tableCheck['exists']) {
            // 自動初期化
            $initResult = initializeDefaultTemplates();
            if ($initResult['success']) {
                error_log("HTMLテンプレートシステム: " . $initResult['message']);
            }
        }
    }
}

?>
