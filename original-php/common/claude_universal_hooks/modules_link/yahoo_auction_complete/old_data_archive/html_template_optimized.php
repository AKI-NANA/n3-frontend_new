<?php
/**
 * HTMLテンプレート管理システム - 整理済み差し込み項目版
 * SKU除外、必要最小限の差し込み項目に特化
 */

// プレースホルダー置換システム（整理済み）
function getOptimizedPlaceholderReplacements($productData) {
    return [
        // 🎯 基本商品情報（必須）
        '{{TITLE}}'         => $productData['Title'] ?? 'Product Name',
        '{{CONDITION}}'     => $productData['ConditionDescription'] ?? 'Used',
        '{{BRAND}}'         => $productData['Brand'] ?? 'Unknown Brand',
        '{{PRICE}}'         => '$' . ($productData['BuyItNowPrice'] ?? '0.00'),
        
        // 🎯 HTML専用差し込み項目（整理済み）
        '{{RELEASE_DATE}}'  => $productData['ReleaseDate'] ?? '',
        '{{FREE_FORMAT_1}}' => $productData['FreeFormat1'] ?? 'Authentic Japanese Item',
        '{{FREE_FORMAT_2}}' => $productData['FreeFormat2'] ?? 'Fast shipping from Japan', 
        '{{FREE_FORMAT_3}}' => $productData['FreeFormat3'] ?? 'Carefully packaged',
        
        // 🎯 画像・メディア
        '{{MAIN_IMAGE}}'    => $productData['PictureURL'] ?? 'https://via.placeholder.com/400x300?text=Product+Image',
        
        // 🎯 システム情報
        '{{CURRENT_DATE}}'  => date('Y-m-d'),
        '{{YEAR}}'          => date('Y'),
        '{{SELLER_INFO}}'   => 'Professional Japanese seller since 2015',
        
        // 🎯 配送情報（固定テキスト）
        '{{SHIPPING_INFO}}' => 'Fast shipping from Japan with tracking number',
        '{{RETURN_POLICY}}' => '30-day money back guarantee'
    ];
}

/**
 * 最適化されたHTMLテンプレートプレビュー生成
 */
function generateOptimizedHTMLPreview($templateContent, $sampleType = 'electronics') {
    $sampleData = getOptimizedSampleData($sampleType);
    $replacements = getOptimizedPlaceholderReplacements($sampleData);
    
    return str_replace(array_keys($replacements), array_values($replacements), $templateContent);
}

/**
 * サンプルデータ生成（最適化版）
 */
function getOptimizedSampleData($type = 'electronics') {
    $samples = [
        'electronics' => [
            'Title' => 'Sony WH-1000XM4 Wireless Noise Cancelling Headphones',
            'ConditionDescription' => 'Used - Excellent condition',
            'Brand' => 'Sony', 
            'BuyItNowPrice' => '149.99',
            'ReleaseDate' => '2020/08/06',
            'FreeFormat1' => 'Premium audio technology',
            'FreeFormat2' => 'Industry-leading noise cancellation',
            'FreeFormat3' => '30-hour battery life',
            'PictureURL' => 'https://via.placeholder.com/400x300/000/fff?text=Sony+Headphones'
        ],
        'collectibles' => [
            'Title' => 'Limited Edition Anime Figure - Hatsune Miku Racing Ver.',
            'ConditionDescription' => 'New in box',
            'Brand' => 'Good Smile Company',
            'BuyItNowPrice' => '89.99',
            'ReleaseDate' => '2024/03/15',
            'FreeFormat1' => 'Limited production run',
            'FreeFormat2' => 'Authentic Japanese figure',
            'FreeFormat3' => 'Perfect for collectors',
            'PictureURL' => 'https://via.placeholder.com/400x300/39a/fff?text=Anime+Figure'
        ],
        'music' => [
            'Title' => 'ANISON Best Collection Vol.3 - Limited Edition CD',
            'ConditionDescription' => 'Like new',
            'Brand' => 'Various Artists',
            'BuyItNowPrice' => '24.99',
            'ReleaseDate' => '2023/12/20',
            'FreeFormat1' => 'Rare import CD',
            'FreeFormat2' => 'Features exclusive tracks',
            'FreeFormat3' => 'With bonus content',
            'PictureURL' => 'https://via.placeholder.com/400x300/f39/fff?text=CD+Album'
        ]
    ];
    
    return $samples[$type] ?? $samples['electronics'];
}

/**
 * デフォルトHTMLテンプレート（整理済み版）
 */
function getOptimizedDefaultTemplate() {
    return '
<div style="max-width: 700px; margin: 0 auto; font-family: Arial, sans-serif; background: #f8f9fa; padding: 20px; border-radius: 10px;">
    <!-- 商品タイトル -->
    <h1 style="color: #2c5aa0; text-align: center; border-bottom: 3px solid #2c5aa0; padding-bottom: 10px;">
        {{TITLE}}
    </h1>
    
    <!-- メイン画像 -->
    <div style="text-align: center; margin: 20px 0;">
        <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}" style="max-width: 400px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
    </div>
    
    <!-- 商品詳細 -->
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #2c5aa0; margin-bottom: 15px;">📋 Product Details</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
            <div><strong>Condition:</strong> {{CONDITION}}</div>
            <div><strong>Brand:</strong> {{BRAND}}</div>
        </div>
        
        <div style="margin-bottom: 15px;">
            <strong>Release Date (yyyy/mm/dd):</strong> {{RELEASE_DATE}}
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
            <strong>Note - Pre-Order (P/O):</strong><br>
            If title has "Pre-Order", we will ship out as soon as released. We want all buyers to understand there is possibility that the manufacturer will change contents, date and quantity for sale.
        </div>
    </div>
    
    <!-- 商品特徴 -->
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h3 style="color: #2c5aa0; margin-bottom: 15px;">✨ Product Features</h3>
        
        <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 6px;">
            {{FREE_FORMAT_1}}
        </div>
        
        <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 6px;">
            {{FREE_FORMAT_2}}
        </div>
        
        <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 6px;">
            {{FREE_FORMAT_3}}
        </div>
    </div>
    
    <!-- 配送情報 -->
    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
        <h3 style="color: #1976d2; margin-bottom: 10px;">🚚 Shipping Method & Tracking</h3>
        <p style="color: #d32f2f; font-weight: bold; font-size: 16px;">{{SHIPPING_INFO}}</p>
        <p style="margin: 10px 0;">
            We carefully package all items with bubble wrap and provide tracking information. 
            Estimated delivery time: 7-14 business days worldwide.
        </p>
    </div>
    
    <!-- 販売者情報 -->
    <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="color: #666; font-size: 14px;">
            {{SELLER_INFO}} | {{RETURN_POLICY}} | Listed on {{CURRENT_DATE}}
        </div>
    </div>
</div>';
}

/**
 * クイックテンプレート生成（整理済み版）
 */
function generateOptimizedQuickTemplate($type = 'default') {
    $templates = [
        'default' => [
            'name' => 'Optimized Default Template',
            'html' => getOptimizedDefaultTemplate(),
            'css' => ''
        ],
        'minimal' => [
            'name' => 'Minimal Clean Template',
            'html' => '
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px;">{{TITLE}}</h2>
    
    <div style="margin: 20px 0;">
        <div><strong>Condition:</strong> {{CONDITION}}</div>
        <div><strong>Brand:</strong> {{BRAND}}</div>
        <div><strong>Release Date:</strong> {{RELEASE_DATE}}</div>
    </div>
    
    <div style="margin: 15px 0;">{{FREE_FORMAT_1}}</div>
    <div style="margin: 15px 0;">{{FREE_FORMAT_2}}</div>
    <div style="margin: 15px 0;">{{FREE_FORMAT_3}}</div>
    
    <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <strong>Shipping:</strong> {{SHIPPING_INFO}}
    </div>
</div>',
            'css' => ''
        ],
        'premium' => [
            'name' => 'Premium Showcase Template', 
            'html' => '
<div style="max-width: 800px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; margin-bottom: 10px;">{{TITLE}}</h1>
        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px; display: inline-block;">
            <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}" style="max-width: 300px; border-radius: 8px;">
        </div>
    </div>
    
    <div style="background: rgba(255,255,255,0.1); padding: 25px; border-radius: 12px; margin: 20px 0;">
        <h2 style="margin-bottom: 20px; text-align: center;">🌟 Premium Product Details</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="text-align: center;"><strong>Condition</strong><br>{{CONDITION}}</div>
            <div style="text-align: center;"><strong>Brand</strong><br>{{BRAND}}</div>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
            <strong>Release Date:</strong> {{RELEASE_DATE}}
        </div>
        
        <div style="text-align: center; margin: 15px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
            {{FREE_FORMAT_1}}
        </div>
        <div style="text-align: center; margin: 15px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
            {{FREE_FORMAT_2}}
        </div>
        <div style="text-align: center; margin: 15px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
            {{FREE_FORMAT_3}}
        </div>
    </div>
    
    <div style="background: rgba(255,255,255,0.9); color: #333; padding: 20px; border-radius: 10px; text-align: center;">
        <h3 style="color: #667eea;">🚀 Express Shipping Available</h3>
        <p><strong>{{SHIPPING_INFO}}</strong></p>
        <div style="font-size: 14px; margin-top: 15px;">{{SELLER_INFO}}</div>
    </div>
</div>',
            'css' => ''
        ]
    ];
    
    return $templates[$type] ?? $templates['default'];
}
?>
