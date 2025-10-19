#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🎯 ヤフオク→eBay完全ワークフローシステム（データ編集機能追加版）
問題解決：正確なデータ取得、画像URL修正、商品情報精度向上
"""

from playwright.sync_api import sync_playwright
import pandas as pd
import re
import json
import time
import uuid
import os
from datetime import datetime
from pathlib import Path
import requests

class CompleteYahooEbayWorkflow:
    def __init__(self, data_dir="yahoo_ebay_data"):
        """完全ワークフロー管理システム初期化"""
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        self.csv_path = self.data_dir / "scraped_products.csv"
        self.log_path = self.data_dir / "workflow_log.txt"
        
        # ログファイルが存在しない場合は作成
        if not self.log_path.exists():
            with open(self.log_path, 'w', encoding='utf-8') as f:
                f.write("--- ワークフローログ開始 ---\n")
        
        print(f"✅ ワークフロー初期化完了: {self.data_dir}")
    
    def log(self, message):
        """ログ記録"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] {message}\n"
        
        with open(self.log_path, 'a', encoding='utf-8') as f:
            f.write(log_entry)
        
        print(f"📝 {log_entry.strip()}")

    def scrape_yahoo_auction(self, url):
        """ヤフオクの商品情報をスクレイピング"""
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch()
                page = browser.new_page()
                page.goto(url, wait_until='domcontentloaded')

                title_jp = page.locator('.ProductTitle__text').text_content().strip()
                
                price_element = page.locator('.ProductPrice dd')
                if not price_element.is_visible():
                    price_element = page.locator('.Price__value')
                
                price_text = price_element.text_content().replace('円', '').replace(',', '').strip()
                price_jpy = int(re.sub(r'[^0-9]', '', price_text))
                
                description_jp = page.locator('.ProductDescription__body').text_content().strip()
                
                image_elements = page.locator('.ProductImage__image')
                image_urls = '|'.join([img.get_attribute('src') for img in image_elements.all() if img.get_attribute('src')])
                
                condition_jp = page.locator('.ProductDetail__body').text_content().strip()
                
                item_id = url.split('/')[-1].split('?')[0]

                browser.close()

                return {
                    'url': url,
                    'title_jp': title_jp,
                    'price_jpy': price_jpy,
                    'description_jp': description_jp,
                    'image_urls': image_urls,
                    'condition': condition_jp,
                    'item_id': item_id
                }
        except Exception as e:
            self.log(f"スクレイピングエラー: {e}")
            return None
    
    def get_all_products(self):
        """CSVファイルの全データを読み込み、リスト形式で返します。"""
        if not self.csv_path.exists():
            self.log("データファイルが見つかりません。新規作成します。")
            df = pd.DataFrame(columns=[
                'product_id', 'scrape_timestamp', 'yahoo_url', 'title_jp', 'price_jpy', 'description_jp', 'image_urls', 
                'seller_info', 'category_jp', 'title_en', 'description_en', 'ebay_category_id', 'ebay_price_usd', 
                'shipping_cost_usd', 'stock_quantity', 'status', 'ebay_item_id', 'last_stock_check', 
                'scrape_success', 'ebay_list_success', 'errors'
            ])
            df.to_csv(self.csv_path, index=False, encoding='utf-8')
            return []
        
        try:
            df = pd.read_csv(self.csv_path, encoding='utf-8')
            # 全てのNaN値を空文字列に変換
            df = df.fillna('')
            # product_idを文字列として扱う
            df['product_id'] = df['product_id'].astype(str)
            return df.to_dict('records')
        except Exception as e:
            self.log(f"CSV読み込みエラー: {e}")
            return []

    def save_products(self, products_data):
        """JSON形式の製品データをCSVファイルに保存・更新します。"""
        if not self.csv_path.exists():
            self.log("データファイルが見つかりません。")
            return False

        try:
            # 既存のCSVを読み込む
            df = pd.read_csv(self.csv_path, encoding='utf-8', dtype={'product_id': str})
            
            # 受け取ったデータをDataFrameに変換
            new_df = pd.DataFrame(products_data)
            new_df['product_id'] = new_df['product_id'].astype(str)
            
            # product_idをキーとして既存データとマージ・更新
            df.set_index('product_id', inplace=True)
            new_df.set_index('product_id', inplace=True)
            
            # 編集されたフィールドのみ更新
            for col in new_df.columns:
                df.update(new_df[col])
            
            # インデックスをリセットして保存
            df.reset_index(inplace=True)
            df.to_csv(self.csv_path, index=False, encoding='utf-8')
            self.log(f"✅ {len(products_data)}件のデータが保存されました。")
            return True
        except Exception as e:
            self.log(f"データ保存エラー: {e}")
            return False

    def get_workflow_status(self):
        """ワークフロー状態取得"""
        status = {
            'scraped': 0,
            'edited': 0,
            'listed': 0,
            'sold_out': 0,
            'error': 0,
            'total': 0
        }
        
        if self.csv_path.exists():
            try:
                df = pd.read_csv(self.csv_path, encoding='utf-8')
                status['total'] = len(df)
                
                for status_type in ['scraped', 'edited', 'listed', 'sold_out', 'error']:
                    status[status_type] = len(df[df.get('status', '') == status_type])
            except Exception as e:
                self.log(f"ステータス取得エラー: {e}")
        
        return status