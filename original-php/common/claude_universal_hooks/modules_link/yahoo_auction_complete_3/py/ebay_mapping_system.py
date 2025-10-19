#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
eBay出品に必要な詳細設定・マッピング定義
"""

# eBayコンディションID詳細マッピング
EBAY_CONDITION_MAPPING = {
    'new': {'id': 1000, 'name': 'New'},
    'new_other': {'id': 1500, 'name': 'New other (see details)'},
    'new_defects': {'id': 1750, 'name': 'New with defects'},
    'manufacturer_refurbished': {'id': 2000, 'name': 'Manufacturer refurbished'},
    'seller_refurbished': {'id': 2500, 'name': 'Seller refurbished'},
    'used': {'id': 3000, 'name': 'Used'},
    'very_good': {'id': 4000, 'name': 'Very Good'},
    'good': {'id': 5000, 'name': 'Good'},
    'acceptable': {'id': 6000, 'name': 'Acceptable'},
    'for_parts': {'id': 7000, 'name': 'For parts or not working'}
}

# eBay配送サービス詳細
EBAY_SHIPPING_SERVICES = {
    'economy': {
        'service': 'OTHER_INTERNATIONAL',
        'name': 'Economy International Shipping',
        'description': 'Standard international shipping (7-21 business days)'
    },
    'standard': {
        'service': 'STANDARD_INTERNATIONAL', 
        'name': 'Standard International Shipping',
        'description': 'Expedited international shipping (5-10 business days)'
    },
    'express': {
        'service': 'EXPRESS_INTERNATIONAL',
        'name': 'Express International Shipping', 
        'description': 'Fast international shipping (3-7 business days)'
    }
}

# HTML説明文テンプレート（より詳細）
def create_advanced_ebay_description(product_data):
    """
    高度なHTML説明文生成
    """
    
    # 基本情報抽出
    title_en = product_data.get('title_en', '')
    description_en = product_data.get('description_en', '')
    description_jp = product_data.get('description_jp', '')
    condition = product_data.get('condition', 'used')
    brand = product_data.get('brand', '')
    model = product_data.get('model', '')
    weight_kg = product_data.get('weight_kg', 0)
    dimensions = product_data.get('dimensions_cm', '')
    
    # カテゴリ別スペック
    category_id = product_data.get('ebay_category_id', 99)
    specs = generate_category_specs(category_id, product_data)
    
    html_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            .ebay-description {{
                font-family: Arial, Helvetica, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                line-height: 1.6;
                color: #333;
            }}
            .header {{
                background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%);
                color: white;
                padding: 20px;
                border-radius: 10px 10px 0 0;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
                font-weight: bold;
            }}
            .content {{
                background: #f8f9fa;
                padding: 20px;
                border: 1px solid #dee2e6;
            }}
            .section {{
                background: white;
                margin: 15px 0;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .section h3 {{
                color: #2c5aa0;
                margin: 0 0 10px 0;
                font-size: 18px;
                border-bottom: 2px solid #2c5aa0;
                padding-bottom: 5px;
            }}
            .specs-table {{
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
            }}
            .specs-table th, .specs-table td {{
                padding: 8px 12px;
                border: 1px solid #dee2e6;
                text-align: left;
            }}
            .specs-table th {{
                background: #e9ecef;
                font-weight: bold;
            }}
            .condition-badge {{
                display: inline-block;
                background: #28a745;
                color: white;
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: bold;
            }}
            .shipping-info {{
                background: #e7f3ff;
                border: 2px solid #0066cc;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
            }}
            .guarantee {{
                background: #fff3cd;
                border: 2px solid #ffc107;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
            }}
            .footer {{
                background: #2c5aa0;
                color: white;
                padding: 15px;
                border-radius: 0 0 10px 10px;
                text-align: center;
                font-size: 12px;
            }}
        </style>
    </head>
    <body>
        <div class="ebay-description">
            <div class="header">
                <h1>{title_en}</h1>
                <p>Authentic Item from Japan 🇯🇵</p>
            </div>
            
            <div class="content">
                <div class="section">
                    <h3>📋 Item Description</h3>
                    <p>{description_en}</p>
                    {f'<p><em>Original Japanese Description:</em> {description_jp}</p>' if description_jp else ''}
                </div>
                
                <div class="section">
                    <h3>🏷️ Condition & Specifications</h3>
                    <div class="condition-badge">{condition.replace('_', ' ').title()}</div>
                    
                    <table class="specs-table">
                        <tr>
                            <th>Condition</th>
                            <td>{EBAY_CONDITION_MAPPING.get(condition, {}).get('name', condition.title())}</td>
                        </tr>
                        {f'<tr><th>Brand</th><td>{brand}</td></tr>' if brand else ''}
                        {f'<tr><th>Model</th><td>{model}</td></tr>' if model else ''}
                        {f'<tr><th>Weight</th><td>{weight_kg} kg</td></tr>' if weight_kg > 0 else ''}
                        {f'<tr><th>Dimensions</th><td>{dimensions} cm</td></tr>' if dimensions else ''}
                        {''.join([f'<tr><th>{k}</th><td>{v}</td></tr>' for k, v in specs.items()])}
                    </table>
                </div>
                
                <div class="shipping-info">
                    <h3>🚚 International Shipping from Japan</h3>
                    <ul>
                        <li><strong>Carrier:</strong> FedEx International</li>
                        <li><strong>Delivery:</strong> 7-14 business days worldwide</li>
                        <li><strong>Tracking:</strong> Full tracking number provided</li>
                        <li><strong>Insurance:</strong> Included for peace of mind</li>
                        <li><strong>Customs:</strong> Declared value and customs forms included</li>
                    </ul>
                </div>
                
                <div class="guarantee">
                    <h3>✅ Our Guarantee</h3>
                    <ul>
                        <li>🔍 <strong>Quality Check:</strong> Every item inspected before shipping</li>
                        <li>📦 <strong>Secure Packaging:</strong> Professional packaging for safe delivery</li>
                        <li>🎌 <strong>Authentic Japanese Items:</strong> Sourced directly from Japan</li>
                        <li>⭐ <strong>Customer Service:</strong> English support available</li>
                        <li>💯 <strong>Satisfaction:</strong> 99%+ positive feedback rating</li>
                    </ul>
                </div>
                
                <div class="section">
                    <h3>❓ FAQ</h3>
                    <p><strong>Q: Is this item authentic?</strong><br>
                    A: Yes, all items are authentic and sourced directly from Japan.</p>
                    
                    <p><strong>Q: What if there are customs fees?</strong><br>
                    A: Customs fees are buyer's responsibility and vary by country.</p>
                    
                    <p><strong>Q: Can you combine shipping?</strong><br>
                    A: Yes, contact us for combined shipping discounts on multiple items.</p>
                </div>
            </div>
            
            <div class="footer">
                Professional eBay seller • Fast international shipping • 99%+ positive feedback<br>
                Thank you for choosing our store! 🙏
            </div>
        </div>
    </body>
    </html>
    """
    
    return html_template

def generate_category_specs(category_id, product_data):
    """カテゴリ別仕様生成"""
    specs = {}
    
    if category_id == 183454:  # ポケモン・アニメグッズ
        specs.update({
            'Character': extract_character(product_data.get('title_jp', '') + product_data.get('title_en', '')),
            'Card Type': 'Trading Card',
            'Game': 'Pokémon TCG',
            'Language': 'Japanese'
        })
    elif category_id == 139973:  # ゲーム
        specs.update({
            'Platform': extract_platform(product_data.get('title_jp', '') + product_data.get('title_en', '')),
            'Genre': 'Video Games',
            'Region Code': 'Japan (NTSC-J)',
            'Language': 'Japanese'
        })
    elif category_id == 58058:  # 携帯・スマホ
        specs.update({
            'Operating System': extract_os(product_data.get('title_jp', '') + product_data.get('title_en', '')),
            'Network': 'Unlocked',
            'Storage Capacity': extract_storage(product_data.get('title_jp', '') + product_data.get('title_en', '')),
            'Screen Size': extract_screen_size(product_data.get('title_jp', '') + product_data.get('title_en', ''))
        })
    elif category_id == 625:  # カメラ
        specs.update({
            'Type': 'Digital Camera',
            'Megapixels': extract_megapixels(product_data.get('title_jp', '') + product_data.get('title_en', '')),
            'Brand': extract_camera_brand(product_data.get('title_jp', '') + product_data.get('title_en', ''))
        })
    
    # 空の値を削除
    return {k: v for k, v in specs.items() if v}

def extract_character(text):
    """キャラクター名抽出"""
    characters = ['ピカチュウ', 'pikachu', 'charizard', 'リザードン', 'eevee', 'イーブイ']
    for char in characters:
        if char.lower() in text.lower():
            return char.title()
    return ''

def extract_platform(text):
    """ゲームプラットフォーム抽出"""
    platforms = {
        'nintendo switch': 'Nintendo Switch',
        'switch': 'Nintendo Switch', 
        'ps4': 'PlayStation 4',
        'ps5': 'PlayStation 5',
        '3ds': 'Nintendo 3DS',
        'xbox': 'Xbox'
    }
    for key, value in platforms.items():
        if key in text.lower():
            return value
    return ''

def extract_os(text):
    """OS抽出"""
    if 'iphone' in text.lower() or 'ios' in text.lower():
        return 'iOS'
    elif 'android' in text.lower():
        return 'Android'
    return ''

def extract_storage(text):
    """ストレージ容量抽出"""
    import re
    storage_pattern = r'(\d+)(?:gb|tb)'
    match = re.search(storage_pattern, text.lower())
    if match:
        return f"{match.group(1)}{'GB' if 'gb' in match.group(0) else 'TB'}"
    return ''

def extract_screen_size(text):
    """画面サイズ抽出"""
    import re
    size_pattern = r'(\d+\.?\d*)"?\s?inch'
    match = re.search(size_pattern, text.lower())
    if match:
        return f'{match.group(1)}" '
    return ''

def extract_megapixels(text):
    """メガピクセル抽出"""
    import re
    mp_pattern = r'(\d+)(?:mp|メガピクセル|megapixel)'
    match = re.search(mp_pattern, text.lower())
    if match:
        return f"{match.group(1)}MP"
    return ''

def extract_camera_brand(text):
    """カメラブランド抽出"""
    brands = ['canon', 'nikon', 'sony', 'fujifilm', 'olympus', 'panasonic']
    for brand in brands:
        if brand in text.lower():
            return brand.title()
    return ''

# eBay出品データ完全マッピング関数
def create_ebay_listing_data(product_data):
    """
    CSV商品データからeBay API用データ作成
    """
    
    # 基本情報
    listing_data = {
        'Title': product_data.get('title_en', '')[:80],  # 80文字制限
        'Description': create_advanced_ebay_description(product_data),
        'PrimaryCategory': {
            'CategoryID': str(product_data.get('ebay_category_id', 99))
        },
        'StartPrice': {
            'currencyID': 'USD',
            'value': str(product_data.get('ebay_price_usd', 0))
        },
        'ConditionID': str(EBAY_CONDITION_MAPPING.get(
            product_data.get('condition', 'used'), 
            {'id': 3000}
        )['id']),
        'Country': 'JP',
        'Currency': 'USD',
        'DispatchTimeMax': '3',
        'ListingDuration': 'GTC',
        'ListingType': 'FixedPriceItem',
        'PaymentMethods': ['PayPal', 'CreditCard'],
        'PayPalEmailAddress': 'payments@yourstore.com',
        'ReturnPolicy': {
            'ReturnsAcceptedOption': 'ReturnsAccepted',
            'RefundOption': 'MoneyBack',
            'ReturnsWithinOption': 'Days_30',
            'ShippingCostPaidByOption': 'Buyer'
        }
    }
    
    # 配送設定
    shipping_cost = product_data.get('shipping_cost_usd', 30.00)
    listing_data['ShippingDetails'] = {
        'ShippingType': 'Flat',
        'ShippingServiceOptions': [{
            'ShippingServicePriority': '1',
            'ShippingService': 'OTHER_INTERNATIONAL',
            'ShippingServiceCost': {
                'currencyID': 'USD',
                'value': str(shipping_cost)
            },
            'ShippingServiceAdditionalCost': {
                'currencyID': 'USD', 
                'value': '0.00'
            }
        }],
        'GlobalShipping': 'false'
    }
    
    # 画像設定
    image_urls = product_data.get('image_urls', '')
    if image_urls:
        urls = [url.strip() for url in str(image_urls).split('|') if url.strip()]
        listing_data['PictureDetails'] = {
            'PictureURL': urls[:12]  # 最大12枚
        }
    
    # 商品特性
    specs = generate_category_specs(product_data.get('ebay_category_id', 99), product_data)
    if specs:
        item_specifics = []
        for name, value in specs.items():
            if value:
                item_specifics.append({
                    'Name': name,
                    'Value': [str(value)]
                })
        
        if item_specifics:
            listing_data['ItemSpecifics'] = {
                'NameValueList': item_specifics
            }
    
    # Best Offer設定
    if product_data.get('best_offer_enabled', True):
        listing_data['BestOfferDetails'] = {
            'BestOfferEnabled': 'true'
        }
    
    return listing_data

if __name__ == '__main__':
    # サンプル商品データでテスト
    sample_product = {
        'title_en': 'Nintendo Switch Console Bundle Complete Set Excellent Condition',
        'title_jp': 'Nintendo Switch 本体セット 美品',
        'description_en': 'Excellent condition Nintendo Switch console with all accessories included.',
        'description_jp': '美品のNintendo Switch本体です。付属品完備。',
        'ebay_category_id': 139973,
        'ebay_price_usd': 189.99,
        'shipping_cost_usd': 28.99,
        'condition': 'used',
        'weight_kg': 2.5,
        'dimensions_cm': '35x25x15',
        'brand': 'Nintendo',
        'model': 'HAD-001',
        'image_urls': 'https://example.com/img1.jpg|https://example.com/img2.jpg'
    }
    
    # eBay出品データ生成テスト
    ebay_data = create_ebay_listing_data(sample_product)
    
    print("🎯 eBay出品データ生成テスト")
    print("=" * 50)
    print(f"Title: {ebay_data['Title']}")
    print(f"CategoryID: {ebay_data['PrimaryCategory']['CategoryID']}")
    print(f"Price: ${ebay_data['StartPrice']['value']}")
    print(f"ConditionID: {ebay_data['ConditionID']}")
    print(f"Shipping: ${ebay_data['ShippingDetails']['ShippingServiceOptions'][0]['ShippingServiceCost']['value']}")
    print(f"HTML Description: {len(ebay_data['Description'])} characters")
    print("\n✅ eBay出品データ生成成功")
