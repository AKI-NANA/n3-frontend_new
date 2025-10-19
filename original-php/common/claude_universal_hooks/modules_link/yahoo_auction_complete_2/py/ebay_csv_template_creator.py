#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
eBay出品CSVサンプル・テンプレート作成システム
カテゴリ自動選出・編集ガイド付き
"""

import pandas as pd
from pathlib import Path
import json

# eBayカテゴリマッピング（主要カテゴリ）
EBAY_CATEGORIES = {
    # エレクトロニクス
    'electronics': {'id': 58058, 'name': 'Cell Phones & Accessories > Cell Phones & Smartphones'},
    'computer': {'id': 171957, 'name': 'Computers/Tablets & Networking > Laptops & Netbooks'},
    'camera': {'id': 625, 'name': 'Cameras & Photo > Digital Cameras'},
    'audio': {'id': 14969, 'name': 'Consumer Electronics > TV, Audio & Surveillance'},
    'game': {'id': 139973, 'name': 'Video Games & Consoles > Games'},
    
    # ファッション
    'fashion_men': {'id': 1059, 'name': "Men's Clothing"},
    'fashion_women': {'id': 15724, 'name': "Women's Clothing"},
    'shoes': {'id': 93427, 'name': 'Clothing, Shoes & Accessories > Men\'s Shoes'},
    'watch': {'id': 31387, 'name': 'Jewelry & Watches > Watches, Parts & Accessories'},
    
    # コレクティブル
    'pokemon': {'id': 183454, 'name': 'Collectibles > Animation Art & Merchandise > Japanese, Anime'},
    'manga': {'id': 63, 'name': 'Books & Magazines > Books'},
    'figure': {'id': 246, 'name': 'Collectibles > Animation Art & Merchandise'},
    
    # ホーム・ガーデン
    'home': {'id': 11700, 'name': 'Home & Garden'},
    'kitchen': {'id': 20625, 'name': 'Home & Garden > Kitchen, Dining & Bar'},
    
    # スポーツ
    'sports': {'id': 888, 'name': 'Sporting Goods'},
    
    # その他
    'other': {'id': 99, 'name': 'Everything Else'}
}

# コンディション定義
EBAY_CONDITIONS = {
    'new': {'id': 1000, 'name': 'New'},
    'new_other': {'id': 1500, 'name': 'New other (see details)'},
    'new_defects': {'id': 1750, 'name': 'New with defects'},
    'seller_refurbished': {'id': 2000, 'name': 'Seller refurbished'},
    'used': {'id': 3000, 'name': 'Used'},
    'for_parts': {'id': 7000, 'name': 'For parts or not working'}
}

def create_ebay_csv_template():
    """eBay出品用CSVテンプレート作成"""
    
    # サンプルデータ（実際の商品例）
    sample_data = [
        {
            'product_id': 'sample001',
            'scrape_timestamp': '2025-09-03 21:00:00',
            'yahoo_url': 'https://auctions.yahoo.co.jp/jp/auction/example1',
            'title_jp': 'ポケモンカード ピカチュウ プロモ 美品',
            'price_jpy': 5000,
            'description_jp': '美品のピカチュウプロモカードです。目立った傷や汚れはありません。',
            'image_urls': 'https://example.com/image1.jpg|https://example.com/image2.jpg',
            'seller_info': '',
            'category_jp': 'トレーディングカード > ポケモンカード',
            
            # ★ eBay出品用編集項目（これらを編集する）
            'title_en': 'Pokemon Card Pikachu Promo Mint Condition',
            'description_en': 'Beautiful Pikachu promotional card in mint condition. No visible scratches or stains. Perfect for collectors.',
            'ebay_category_id': 183454,
            'ebay_price_usd': 39.99,
            'shipping_cost_usd': 15.99,
            'condition': 'used',
            'condition_id': 3000,
            'best_offer': True,
            'auction_format': False,
            'listing_duration': 'GTC',  # Good Till Cancelled
            
            # 在庫・発送情報
            'stock_quantity': 1,
            'handling_time': 3,
            'return_accepted': True,
            'return_period': 30,
            
            # ステータス管理
            'status': 'scraped',
            'ebay_item_id': '',
            'last_stock_check': '',
            'scrape_success': True,
            'ebay_list_success': False,
            'errors': ''
        },
        {
            'product_id': 'sample002', 
            'scrape_timestamp': '2025-09-03 21:00:00',
            'yahoo_url': 'https://auctions.yahoo.co.jp/jp/auction/example2',
            'title_jp': 'Nintendo Switch 本体 中古',
            'price_jpy': 25000,
            'description_jp': 'Nintendo Switch本体です。動作良好。付属品完備。',
            'image_urls': 'https://example.com/switch1.jpg',
            'seller_info': '',
            'category_jp': 'ゲーム > Nintendo Switch',
            
            # eBay出品用編集項目
            'title_en': 'Nintendo Switch Console Used Good Condition',
            'description_en': 'Nintendo Switch console in good working condition. All accessories included.',
            'ebay_category_id': 139973,
            'ebay_price_usd': 189.99,
            'shipping_cost_usd': 28.99,
            'condition': 'used',
            'condition_id': 3000,
            'best_offer': True,
            'auction_format': False,
            'listing_duration': 'GTC',
            
            'stock_quantity': 1,
            'handling_time': 3,
            'return_accepted': True,
            'return_period': 30,
            
            'status': 'scraped',
            'ebay_item_id': '',
            'last_stock_check': '',
            'scrape_success': True,
            'ebay_list_success': False,
            'errors': ''
        }
    ]
    
    return pd.DataFrame(sample_data)

def auto_detect_category(title_jp, description_jp):
    """日本語タイトル・説明からeBayカテゴリを自動推定"""
    text = (title_jp + ' ' + description_jp).lower()
    
    # キーワードマッピング
    keyword_mappings = {
        'ポケモン|pokemon|ピカチュウ|カード': 'pokemon',
        'nintendo|switch|ゲーム|プレステ|ps4|ps5': 'game', 
        'スマホ|携帯|iphone|android|phone': 'electronics',
        'パソコン|pc|laptop|ノート': 'computer',
        'カメラ|camera|一眼|レンズ': 'camera',
        '時計|watch|腕時計|ロレックス': 'watch',
        'アニメ|フィギュア|figure|漫画|manga': 'figure',
        '服|シャツ|パンツ|ドレス|clothing': 'fashion_men',
        'スニーカー|靴|shoes|nike|adidas': 'shoes'
    }
    
    for keywords, category in keyword_mappings.items():
        if any(keyword in text for keyword in keywords.split('|')):
            return EBAY_CATEGORIES[category]
    
    return EBAY_CATEGORIES['other']  # デフォルト

def create_csv_editing_guide():
    """CSV編集ガイド作成"""
    
    guide = {
        'editing_instructions': {
            '1_title_en': '英語タイトル作成のコツ',
            'tips': [
                'ブランド名・商品名を最初に記載',
                'コンディションを明記 (New, Used, etc.)',
                'キーワードを効果的に使用',
                '80文字以内で簡潔に'
            ],
            'examples': {
                'NG': 'いい商品です',
                'OK': 'Nintendo Switch Console Bundle Complete Set Excellent Condition'
            }
        },
        
        '2_description_en': '商品説明作成のコツ',
        'description_tips': [
            'コンディションを詳細に説明',
            '付属品・欠品を明記',
            '発送・返品ポリシーを記載',
            'キーワードを自然に含める'
        ],
        
        '3_category_selection': 'eBayカテゴリ選択',
        'categories': EBAY_CATEGORIES,
        
        '4_pricing': '価格設定のコツ',
        'pricing_tips': [
            '類似商品の相場調査',
            '送料込みでの競争力確認',
            'Best Offer設定で柔軟性確保',
            '為替レート変動を考慮'
        ],
        
        '5_condition_codes': 'コンディション設定',
        'conditions': EBAY_CONDITIONS
    }
    
    return guide

def main():
    """メイン処理"""
    
    # データディレクトリ作成
    data_dir = Path('yahoo_ebay_data')
    data_dir.mkdir(exist_ok=True)
    
    # サンプルCSV作成
    sample_df = create_ebay_csv_template()
    sample_csv_path = data_dir / 'ebay_listing_sample.csv'
    sample_df.to_csv(sample_csv_path, index=False, encoding='utf-8')
    
    # 編集ガイド作成
    guide = create_csv_editing_guide()
    guide_path = data_dir / 'ebay_editing_guide.json'
    
    with open(guide_path, 'w', encoding='utf-8') as f:
        json.dump(guide, f, ensure_ascii=False, indent=2)
    
    print(f"✅ eBayサンプルCSV作成: {sample_csv_path}")
    print(f"✅ 編集ガイド作成: {guide_path}")
    
    return sample_csv_path, guide_path

if __name__ == '__main__':
    main()
