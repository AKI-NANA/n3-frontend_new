#!/usr/bin/env python3
"""
統合Yahooスクレイピングツール（第一階層版）
"""

import sys
import os
sys.path.append('/Users/aritahiroaki/NAGANO-3/N3-Development/yahoo_scraping_tools')

from yahoo_auction_scraper import scrape_auction_data, scrape_paypay_fleamarket
from multi_site_scraper import MultiSiteScraper
import sqlite3
import time
from datetime import datetime
import json

class YahooScrapingManager:
    def __init__(self, database_path='/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_tool/yahoo_ebay_workflow_enhanced.db'):
        self.database_path = database_path
        self.multi_scraper = MultiSiteScraper()
        
    def scrape_and_save(self, urls, use_playwright=True):
        """
        URLリストをスクレイピングしてデータベースに保存
        """
        results = []
        success_count = 0
        
        for url in urls:
            try:
                # URLの種類判定
                if 'auctions.yahoo.co.jp' in url:
                    if use_playwright:
                        # Playwright版（高精度）
                        data = scrape_auction_data(url)
                    else:
                        # BeautifulSoup版（軽量）
                        data = self.multi_scraper.scrape_yahoo_auction(url)
                elif 'paypayfleamarket.yahoo.co.jp' in url:
                    data = scrape_paypay_fleamarket(url)
                else:
                    data = None
                    print(f"未対応のURL: {url}")
                
                if data:
                    # データベースに保存
                    product_id = self.save_to_database(data, url)
                    data['product_id'] = product_id
                    results.append(data)
                    success_count += 1
                    print(f"✅ 成功: {data.get('title_jp', 'タイトル不明')}")
                else:
                    results.append({'url': url, 'error': 'スクレイピング失敗'})
                    print(f"❌ 失敗: {url}")
                
                # 1秒待機（サーバー負荷軽減）
                time.sleep(1)
                
            except Exception as e:
                print(f"エラー: {url} - {e}")
                results.append({'url': url, 'error': str(e)})
        
        return {
            'total_urls': len(urls),
            'success_count': success_count,
            'failed_count': len(urls) - success_count,
            'results': results
        }
    
    def save_to_database(self, data, source_url):
        """
        スクレイピングデータをデータベースに保存
        """
        conn = sqlite3.connect(self.database_path)
        cursor = conn.cursor()
        
        # 一意のproduct_id生成
        timestamp = int(time.time() * 1000)  # ミリ秒タイムスタンプ
        product_id = f"SCRAPED_{timestamp}"
        
        # データベースに挿入
        cursor.execute('''
            INSERT INTO products_enhanced 
            (product_id, title_jp, title_en, description_jp, price_jpy, 
             main_image_url, source_url, source_platform, condition_jp, 
             status, data_quality_score, scraped_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            product_id,
            data.get('title_jp', ''),
            self.translate_title(data.get('title_jp', '')),  # 簡易英訳
            data.get('description_jp', ''),
            data.get('price_jpy', 0),
            data.get('image_urls', '').split('|')[0] if data.get('image_urls') else '',
            source_url,
            'yahoo',
            data.get('condition', '中古'),
            'scraped',
            0.9,  # 実データなので品質スコア高め
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        
        conn.commit()
        conn.close()
        
        return product_id
    
    def translate_title(self, japanese_title):
        """
        簡易的な英訳（キーワードベース）
        """
        translation_map = {
            '新品': 'New',
            '中古': 'Used',
            '美品': 'Excellent',
            'iPhone': 'iPhone',
            'iPad': 'iPad',
            'MacBook': 'MacBook',
            'ゲーム': 'Game',
            'フィギュア': 'Figure',
            '本': 'Book',
            '時計': 'Watch',
            'カメラ': 'Camera',
            '車': 'Car',
            'バイク': 'Motorcycle'
        }
        
        english_title = japanese_title
        for jp, en in translation_map.items():
            english_title = english_title.replace(jp, en)
        
        return english_title[:100]  # 100文字制限

def main():
    """
    コマンドライン実行用メイン関数
    """
    if len(sys.argv) < 2:
        print("使用方法: python yahoo_scraping_manager.py <URL1> [URL2] [URL3] ...")
        print("例: python yahoo_scraping_manager.py https://auctions.yahoo.co.jp/jp/auction/example123")
        return
    
    urls = sys.argv[1:]
    manager = YahooScrapingManager()
    
    print(f"🚀 {len(urls)}件のURLをスクレイピング開始...")
    results = manager.scrape_and_save(urls)
    
    print("\n📊 スクレイピング結果:")
    print(f"   総数: {results['total_urls']}件")
    print(f"   成功: {results['success_count']}件")
    print(f"   失敗: {results['failed_count']}件")
    
    if results['success_count'] > 0:
        print("\n✅ データベースに保存されました！")
        print("   フロントエンドで「データ読込」ボタンを押して確認してください。")

if __name__ == '__main__':
    main()
