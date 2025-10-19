# -*- coding: utf-8 -*-
"""
スクレイピングエンジン（Gemini作成版統合）
"""

import requests
from bs4 import BeautifulSoup
import time
import random
from urllib.parse import urlparse
import re

class MultiSiteScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        self.delay_range = (1, 3)  # リクエスト間隔（秒）
        
    def scrape_yahoo_auction(self, url):
        """
        ヤフオクスクレイピング機能
        """
        try:
            # リクエスト間隔調整
            time.sleep(random.uniform(*self.delay_range))
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 商品データ抽出
            product_data = {
                'source_type': 'yahoo',
                'source_url': url,
                'scrape_success': True,
                'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S')
            }
            
            # タイトル取得
            title_elem = soup.find('h1', class_='ProductTitle__text')
            if title_elem:
                product_data['title_jp'] = title_elem.get_text(strip=True)
            
            # 価格取得
            price_elem = soup.find('dd', class_='Price__value')
            if price_elem:
                price_text = price_elem.get_text(strip=True)
                price_match = re.search(r'([\d,]+)', price_text.replace(',', ''))
                if price_match:
                    product_data['current_price_jpy'] = float(price_match.group(1))
            
            # 説明文取得
            desc_elem = soup.find('div', class_='ProductExplanation__commentArea')
            if desc_elem:
                product_data['description_jp'] = desc_elem.get_text(strip=True)[:1000]  # 1000文字制限
            
            # 画像URL取得
            img_elem = soup.find('img', class_='ProductImage__inner')
            if img_elem and img_elem.get('src'):
                product_data['image_url'] = img_elem.get('src')
            
            # 商品状態
            condition_elem = soup.find('dd', class_='ProductDetail__description')
            if condition_elem:
                condition_text = condition_elem.get_text(strip=True)
                product_data['condition'] = self._parse_condition(condition_text)
            
            # カテゴリ情報
            breadcrumb = soup.find('nav', class_='Breadcrumb')
            if breadcrumb:
                categories = [a.get_text(strip=True) for a in breadcrumb.find_all('a')]
                product_data['yahoo_category'] = ' > '.join(categories)
            
            return product_data
            
        except requests.RequestException as e:
            print(f"ネットワークエラー: {e}")
            return {'scrape_success': False, 'error': f'ネットワークエラー: {e}'}
        except Exception as e:
            print(f"スクレイピングエラー: {e}")
            return {'scrape_success': False, 'error': f'スクレイピングエラー: {e}'}
    
    def scrape_amazon_product(self, asin_or_url):
        """
        Amazon商品スクレイピング（簡易版）
        """
        try:
            if asin_or_url.startswith('http'):
                url = asin_or_url
                # URLからASIN抽出
                asin_match = re.search(r'/([A-Z0-9]{10})/', url)
                asin = asin_match.group(1) if asin_match else ''
            else:
                asin = asin_or_url
                url = f"https://www.amazon.co.jp/dp/{asin}"
            
            time.sleep(random.uniform(*self.delay_range))
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            product_data = {
                'source_type': 'amazon',
                'source_url': url,
                'amazon_asin': asin,
                'scrape_success': True,
                'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S')
            }
            
            # タイトル取得
            title_elem = soup.find('span', {'id': 'productTitle'})
            if title_elem:
                product_data['title_jp'] = title_elem.get_text(strip=True)
            
            # 価格取得
            price_selectors = [
                '.a-price-whole',
                '.a-price .a-offscreen',
                '#priceblock_dealprice',
                '#priceblock_ourprice'
            ]
            
            for selector in price_selectors:
                price_elem = soup.select_one(selector)
                if price_elem:
                    price_text = price_elem.get_text(strip=True)
                    price_match = re.search(r'([\d,]+)', price_text.replace(',', ''))
                    if price_match:
                        product_data['current_price_jpy'] = float(price_match.group(1))
                        break
            
            # 在庫状況
            availability = soup.find('div', {'id': 'availability'})
            if availability:
                availability_text = availability.get_text(strip=True)
                product_data['is_available'] = '在庫あり' in availability_text or 'In Stock' in availability_text
            
            # 商品画像
            img_elem = soup.find('img', {'id': 'landingImage'})
            if img_elem and img_elem.get('src'):
                product_data['image_url'] = img_elem.get('src')
            
            return product_data
            
        except Exception as e:
            print(f"Amazonスクレイピングエラー: {e}")
            return {'scrape_success': False, 'error': f'Amazonスクレイピングエラー: {e}'}
    
    def monitor_inventory(self, url_list):
        """
        複数商品の在庫監視
        """
        results = []
        
        for url in url_list:
            try:
                parsed_url = urlparse(url)
                
                if 'yahoo' in parsed_url.netloc:
                    result = self.scrape_yahoo_auction(url)
                elif 'amazon' in parsed_url.netloc:
                    result = self.scrape_amazon_product(url)
                else:
                    result = {'scrape_success': False, 'error': 'サポートされていないサイト'}
                
                result['monitored_url'] = url
                results.append(result)
                
            except Exception as e:
                results.append({
                    'monitored_url': url,
                    'scrape_success': False,
                    'error': str(e)
                })
        
        return results
    
    def _parse_condition(self, condition_text):
        """
        商品状態テキストを標準化
        """
        condition_text = condition_text.lower()
        
        if '新品' in condition_text or 'new' in condition_text:
            return 'new'
        elif '美品' in condition_text or 'excellent' in condition_text:
            return 'excellent'
        elif '良い' in condition_text or 'good' in condition_text:
            return 'good'
        elif '可' in condition_text or 'fair' in condition_text:
            return 'fair'
        else:
            return 'used'
    
    def get_scraping_stats(self):
        """
        スクレイピング統計情報
        """
        return {
            'session_active': bool(self.session),
            'user_agent': self.session.headers.get('User-Agent', ''),
            'delay_range': self.delay_range
        }
