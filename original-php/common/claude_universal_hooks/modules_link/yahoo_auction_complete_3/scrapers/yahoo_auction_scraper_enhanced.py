#!/usr/bin/env python3
"""
Yahoo Auction スクレイピングツール - 修正版
モダンなWebスクレイピング技術を使用した安定版
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
import time
import random
from urllib.parse import urljoin, urlparse
import logging
from datetime import datetime
import sqlite3
import os

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YahooAuctionScraper:
    def __init__(self):
        self.session = requests.Session()
        
        # ユーザーエージェントを設定
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        
        self.database_path = 'yahoo_auction_scraped_data.db'
        self.init_database()
    
    def init_database(self):
        """データベース初期化"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS scraped_products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    auction_id TEXT UNIQUE,
                    title TEXT,
                    current_price TEXT,
                    buy_now_price TEXT,
                    shipping_cost TEXT,
                    end_time TEXT,
                    condition_text TEXT,
                    seller_name TEXT,
                    bid_count INTEGER,
                    watch_count INTEGER,
                    main_image_url TEXT,
                    additional_images TEXT,
                    description TEXT,
                    category TEXT,
                    source_url TEXT,
                    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("データベース初期化完了")
            
        except Exception as e:
            logger.error(f"データベース初期化エラー: {e}")
    
    def extract_auction_id(self, url):
        """URLからオークションIDを抽出"""
        try:
            if 'auctions.yahoo.co.jp' in url and '/auction/' in url:
                return url.split('/auction/')[-1].split('?')[0]
            return None
        except Exception as e:
            logger.error(f"オークションID抽出エラー: {e}")
            return None
    
    def scrape_auction_page(self, url):
        """単一のオークションページをスクレイピング"""
        try:
            logger.info(f"スクレイピング開始: {url}")
            
            # リクエスト送信
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # オークションID取得
            auction_id = self.extract_auction_id(url)
            if not auction_id:
                logger.warning(f"オークションIDを取得できませんでした: {url}")
                return None
            
            # データ抽出
            data = {
                'auction_id': auction_id,
                'source_url': url,
                'title': self.extract_title(soup),
                'current_price': self.extract_current_price(soup),
                'buy_now_price': self.extract_buy_now_price(soup),
                'shipping_cost': self.extract_shipping_cost(soup),
                'end_time': self.extract_end_time(soup),
                'condition_text': self.extract_condition(soup),
                'seller_name': self.extract_seller(soup),
                'bid_count': self.extract_bid_count(soup),
                'watch_count': self.extract_watch_count(soup),
                'main_image_url': self.extract_main_image(soup),
                'additional_images': self.extract_additional_images(soup),
                'description': self.extract_description(soup, url),
                'category': self.extract_category(soup)
            }
            
            logger.info(f"データ抽出完了: {data['title'][:50]}...")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"リクエストエラー: {e}")
            return None
        except Exception as e:
            logger.error(f"スクレイピングエラー: {e}")
            return None
    
    def extract_title(self, soup):
        """商品タイトル抽出"""
        try:
            selectors = [
                'h1.ProductTitle__text',
                'h1[data-testid="product-title"]',
                '.ProductTitle h1',
                'h1'
            ]
            
            for selector in selectors:
                element = soup.select_one(selector)
                if element:
                    return element.get_text(strip=True)
            
            return 'タイトル取得失敗'
        except Exception as e:
            logger.error(f"タイトル抽出エラー: {e}")
            return 'タイトル取得失敗'
    
    def extract_current_price(self, soup):
        """現在価格抽出"""
        try:
            selectors = [
                '.Price__value',
                '.ProductPrice__value',
                '[data-testid="current-price"]',
                '.price .value'
            ]
            
            for selector in selectors:
                element = soup.select_one(selector)
                if element:
                    return element.get_text(strip=True)
            
            return '価格不明'
        except Exception as e:
            logger.error(f"価格抽出エラー: {e}")
            return '価格不明'
    
    def extract_buy_now_price(self, soup):
        """即決価格抽出"""
        try:
            selectors = [
                '.ProductPrice__price--fixed .ProductPrice__value',
                '[data-testid="buy-now-price"]',
                '.buy-now-price .value'
            ]
            
            for selector in selectors:
                element = soup.select_one(selector)
                if element:
                    return element.get_text(strip=True)
            
            return '即決価格なし'
        except Exception as e:
            logger.error(f"即決価格抽出エラー: {e}")
            return '即決価格なし'
    
    def extract_shipping_cost(self, soup):
        """送料抽出"""
        try:
            selectors = [
                '.Shipping .Price__value',
                '[data-testid="shipping-cost"]',
                '.shipping-cost'
            ]
            
            for selector in selectors:
                element = soup.select_one(selector)
                if element:
                    return element.get_text(strip=True)
            
            return '送料不明'
        except Exception as e:
            logger.error(f"送料抽出エラー: {e}")
            return '送料不明'
    
    def extract_end_time(self, soup):
        """終了時間抽出"""
        try:
            selectors = [
                '.EndTime__value',
                '[data-testid="end-time"]',
                '.end-time'
            ]
            
            for selector in selectors:
                element = soup.select_one(selector)
                if element:
                    return element.get_text(strip=True)
            
            return '終了時間不明'
        except Exception as e:
            logger.error(f"終了時間抽出エラー: {e}")
            return '終了時間不明'
    
    def extract_condition(self, soup):
        """商品状態抽出"""
        try:
            selectors = [
                '.Condition__value',
                '[data-testid="condition"]',
                '.condition'
            ]
            
            for selector in selectors:
                element = soup.select_one(selector)
                if element:
                    return element.get_text(strip=True)
            
            return '状態不明'
        except Exception as e:
            logger.error(f"状態抽出エラー: {e}")
            return '状態不明'
    
    def extract_seller(self, soup):
        """出品者抽出"""
        try:
            selectors = [
                '.Seller__name',
                '[data-testid="seller-name"]',
                '.seller-name'
            ]
            
            for selector in selectors:
                element = soup.select_one(selector)
                if element:
                    return element.get_text(strip=True)
            
            return '出品者不明'
        except Exception as e:
            logger.error(f"出品者抽出エラー: {e}")
            return '出品者不明'
    
    def extract_bid_count(self, soup):
        """入札数抽出"""
        try:
            selectors = [
                '.BidCount__value',
                '[data-testid="bid-count"]',
                '.bid-count'
            ]
            
            for selector in selectors:
                element = soup.select_one(selector)
                if element:
                    text = element.get_text(strip=True)
                    # 数字のみ抽出
                    import re
                    numbers = re.findall(r'\d+', text)
                    return int(numbers[0]) if numbers else 0
            
            return 0
        except Exception as e:
            logger.error(f"入札数抽出エラー: {e}")
            return 0
    
    def extract_watch_count(self, soup):
        """ウォッチ数抽出"""
        try:
            selectors = [
                '.WatchCount__value',
                '[data-testid="watch-count"]',
                '.watch-count'
            ]
            
            for selector in selectors:
                element = soup.select_one(selector)
                if element:
                    text = element.get_text(strip=True)
                    # 数字のみ抽出
                    import re
                    numbers = re.findall(r'\d+', text)
                    return int(numbers[0]) if numbers else 0
            
            return 0
        except Exception as e:
            logger.error(f"ウォッチ数抽出エラー: {e}")
            return 0
    
    def extract_main_image(self, soup):
        """メイン画像URL抽出"""
        try:
            selectors = [
                '.ProductImage__main img',
                '.product-image img',
                '.main-image img',
                'img[alt*="商品"]',
                'img'
            ]
            
            for selector in selectors:
                element = soup.select_one(selector)
                if element and element.get('src'):
                    src = element.get('src')
                    if 'auctions.c.yimg.jp' in src or 'yahoo' in src:
                        return src
            
            return 'https://via.placeholder.com/300x300?text=No+Image'
        except Exception as e:
            logger.error(f"メイン画像抽出エラー: {e}")
            return 'https://via.placeholder.com/300x300?text=No+Image'
    
    def extract_additional_images(self, soup):
        """追加画像URL抽出"""
        try:
            images = []
            selectors = [
                '.ProductImage__thumbnail img',
                '.thumbnail img',
                '.additional-images img'
            ]
            
            for selector in selectors:
                elements = soup.select(selector)
                for element in elements:
                    src = element.get('src') or element.get('data-src')
                    if src and ('auctions.c.yimg.jp' in src or 'yahoo' in src):
                        images.append(src)
            
            return json.dumps(images[:10])  # 最大10枚
        except Exception as e:
            logger.error(f"追加画像抽出エラー: {e}")
            return json.dumps([])
    
    def extract_description(self, soup, url):
        """商品説明抽出"""
        try:
            # iframe内の説明を取得試行
            iframe = soup.select_one('iframe#description_iframe')
            if iframe and iframe.get('src'):
                try:
                    iframe_url = urljoin(url, iframe.get('src'))
                    iframe_response = self.session.get(iframe_url, timeout=15)
                    iframe_soup = BeautifulSoup(iframe_response.text, 'html.parser')
                    description = iframe_soup.get_text(strip=True)
                    if description and len(description) > 10:
                        return description[:2000]  # 2000文字まで
                except Exception as e:
                    logger.warning(f"iframe取得失敗: {e}")
            
            # 通常の説明文取得
            selectors = [
                '.ProductExplanation__body',
                '.product-explanation',
                '.description',
                '[data-testid="description"]'
            ]
            
            for selector in selectors:
                element = soup.select_one(selector)
                if element:
                    text = element.get_text(strip=True)
                    if text and len(text) > 10:
                        return text[:2000]  # 2000文字まで
            
            return '説明文を取得できませんでした'
        except Exception as e:
            logger.error(f"説明文抽出エラー: {e}")
            return '説明文を取得できませんでした'
    
    def extract_category(self, soup):
        """カテゴリ抽出"""
        try:
            selectors = [
                '.Breadcrumb a',
                '.breadcrumb a',
                '.category-path a',
                '[data-testid="breadcrumb"] a'
            ]
            
            categories = []
            for selector in selectors:
                elements = soup.select(selector)
                for element in elements:
                    text = element.get_text(strip=True)
                    if text and text not in ['ホーム', 'Yahoo!オークション']:
                        categories.append(text)
            
            return ' > '.join(categories[:3]) if categories else 'カテゴリ不明'
        except Exception as e:
            logger.error(f"カテゴリ抽出エラー: {e}")
            return 'カテゴリ不明'
    
    def save_to_database(self, data):
        """データベースに保存"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO scraped_products 
                (auction_id, title, current_price, buy_now_price, shipping_cost,
                 end_time, condition_text, seller_name, bid_count, watch_count,
                 main_image_url, additional_images, description, category, source_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['auction_id'], data['title'], data['current_price'],
                data['buy_now_price'], data['shipping_cost'], data['end_time'],
                data['condition_text'], data['seller_name'], data['bid_count'],
                data['watch_count'], data['main_image_url'], data['additional_images'],
                data['description'], data['category'], data['source_url']
            ))
            
            conn.commit()
            conn.close()
            logger.info(f"データベースに保存完了: {data['auction_id']}")
            
        except Exception as e:
            logger.error(f"データベース保存エラー: {e}")
    
    def scrape_multiple_urls(self, urls):
        """複数URLのスクレイピング"""
        results = []
        
        for i, url in enumerate(urls):
            try:
                logger.info(f"処理中 {i+1}/{len(urls)}: {url}")
                
                data = self.scrape_auction_page(url)
                if data:
                    self.save_to_database(data)
                    results.append(data)
                
                # レート制限対応
                if i < len(urls) - 1:
                    wait_time = random.uniform(2, 5)
                    logger.info(f"待機中: {wait_time:.1f}秒")
                    time.sleep(wait_time)
                
            except Exception as e:
                logger.error(f"URL処理エラー {url}: {e}")
                continue
        
        return results
    
    def export_to_csv(self, filename=None):
        """CSVエクスポート"""
        try:
            if not filename:
                filename = f'yahoo_auction_data_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            
            conn = sqlite3.connect(self.database_path)
            df = pd.read_sql_query("SELECT * FROM scraped_products ORDER BY scraped_at DESC", conn)
            conn.close()
            
            df.to_csv(filename, index=False, encoding='utf-8-sig')
            logger.info(f"CSVエクスポート完了: {filename}")
            return filename
            
        except Exception as e:
            logger.error(f"CSVエクスポートエラー: {e}")
            return None
    
    def generate_html_report(self, data_list, filename=None):
        """HTMLレポート生成"""
        try:
            if not filename:
                filename = f'yahoo_auction_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.html'
            
            html_content = '''
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction スクレイピング結果</title>
    <link href="https://cdn.tailwindcss.com/2.2.19/tailwind.min.css" rel="stylesheet">
    <style>
        body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; }
        .product-card { transition: all 0.3s ease; }
        .product-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
        .image-gallery img { border-radius: 8px; }
    </style>
</head>
<body class="bg-gray-50">
    <div class="container mx-auto p-6">
        <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">Yahoo Auction スクレイピング結果</h1>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-800">取得件数</h3>
                    <p class="text-2xl font-bold text-blue-600">{total_count}件</p>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-green-800">平均価格</h3>
                    <p class="text-2xl font-bold text-green-600">計算中</p>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-purple-800">取得日時</h3>
                    <p class="text-lg font-semibold text-purple-600">{timestamp}</p>
                </div>
            </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {product_cards}
        </div>
    </div>
</body>
</html>
            '''
            
            product_cards = ''
            for data in data_list:
                additional_images = json.loads(data.get('additional_images', '[]'))
                image_gallery = ''
                
                for img_url in additional_images[:6]:
                    image_gallery += f'<img src="{img_url}" alt="追加画像" class="w-16 h-16 object-cover rounded border">'
                
                product_cards += f'''
                <div class="product-card bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-start space-x-4">
                        <img src="{data.get('main_image_url', '')}" alt="商品画像" 
                             class="w-24 h-24 object-cover rounded-lg border">
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-gray-800 mb-2">{data.get('title', '')[:80]}...</h3>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="font-medium">現在価格:</span> <span class="text-red-600 font-bold">{data.get('current_price', '')}</span></div>
                                <div><span class="font-medium">即決価格:</span> <span class="text-green-600 font-bold">{data.get('buy_now_price', '')}</span></div>
                                <div><span class="font-medium">送料:</span> {data.get('shipping_cost', '')}</div>
                                <div><span class="font-medium">入札:</span> {data.get('bid_count', 0)}件</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <p class="text-sm text-gray-600 mb-2"><span class="font-medium">出品者:</span> {data.get('seller_name', '')}</p>
                        <p class="text-sm text-gray-600 mb-2"><span class="font-medium">状態:</span> {data.get('condition_text', '')}</p>
                        <p class="text-sm text-gray-600 mb-3"><span class="font-medium">カテゴリ:</span> {data.get('category', '')}</p>
                        
                        {f'<div class="image-gallery flex space-x-2 mb-3">{image_gallery}</div>' if image_gallery else ''}
                        
                        <div class="bg-gray-50 p-3 rounded">
                            <p class="text-xs text-gray-700">{data.get('description', '')[:200]}...</p>
                        </div>
                        
                        <div class="mt-3 flex justify-between items-center">
                            <span class="text-xs text-gray-500">ID: {data.get('auction_id', '')}</span>
                            <a href="{data.get('source_url', '')}" target="_blank" 
                               class="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600">
                                詳細を見る
                            </a>
                        </div>
                    </div>
                </div>
                '''
            
            final_html = html_content.format(
                total_count=len(data_list),
                timestamp=datetime.now().strftime('%Y年%m月%d日 %H:%M'),
                product_cards=product_cards
            )
            
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(final_html)
            
            logger.info(f"HTMLレポート生成完了: {filename}")
            return filename
            
        except Exception as e:
            logger.error(f"HTMLレポート生成エラー: {e}")
            return None

def main():
    """メイン実行関数"""
    scraper = YahooAuctionScraper()
    
    # スクレイピング対象URL（サンプル）
    sample_urls = [
        'https://auctions.yahoo.co.jp/jp/auction/w1190447053',
        'https://auctions.yahoo.co.jp/jp/auction/f1140003045',
        # 実際のURLに置き換えてください
    ]
    
    print("🚀 Yahoo Auction スクレイピング開始...")
    print(f"対象URL数: {len(sample_urls)}")
    
    # スクレイピング実行
    results = scraper.scrape_multiple_urls(sample_urls)
    
    if results:
        print(f"\n✅ スクレイピング完了: {len(results)}件")
        
        # CSVエクスポート
        csv_file = scraper.export_to_csv()
        if csv_file:
            print(f"📊 CSVファイル作成: {csv_file}")
        
        # HTMLレポート生成
        html_file = scraper.generate_html_report(results)
        if html_file:
            print(f"📄 HTMLレポート作成: {html_file}")
            print(f"🌐 ブラウザで {html_file} を開いて結果を確認してください")
    else:
        print("❌ スクレイピングに失敗しました")

if __name__ == "__main__":
    main()
