#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔥 Yahoo スクレイピング + PostgreSQL統合システム（完全版）
統合データベース対応・eBay API連携準備・重複防止システム
"""

from playwright.sync_api import sync_playwright
import psycopg2
import psycopg2.extras
import pandas as pd
import re
import json
import time
import uuid
import hashlib
import os
from datetime import datetime
from pathlib import Path
from decimal import Decimal

class UnifiedScrapingSystem:
    def __init__(self, db_config=None):
        """統合スクレイピングシステム初期化"""
        
        # PostgreSQL接続設定
        self.db_config = db_config or {
            'host': 'localhost',
            'database': 'nagano3_db',
            'user': 'aritahiroaki',
            'password': '',
            'port': 5432
        }
        
        # セッション管理
        self.session_id = f"SCRAPE_{int(time.time())}"
        self.session_stats = {
            'total_urls': 0,
            'successful_scrapes': 0,
            'failed_scrapes': 0,
            'duplicates_skipped': 0,
            'errors': []
        }
        
        # データディレクトリ
        self.data_dir = Path("yahoo_ebay_data")
        self.data_dir.mkdir(exist_ok=True)
        
        print(f"✅ 統合スクレイピングシステム初期化完了")
        print(f"🔑 セッションID: {self.session_id}")
    
    def connect_db(self):
        """PostgreSQL接続"""
        try:
            conn = psycopg2.connect(**self.db_config)
            return conn
        except Exception as e:
            self.log_error(f"DB接続エラー: {e}")
            return None
    
    def log_error(self, message):
        """エラーログ記録"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        error_msg = f"[{timestamp}] ERROR: {message}"
        print(error_msg)
        
        self.session_stats['errors'].append({
            'timestamp': timestamp,
            'message': message
        })
        
        # ログファイルにも記録
        log_file = self.data_dir / f"error_log_{self.session_id}.txt"
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(error_msg + "\n")
    
    def log_success(self, message):
        """成功ログ記録"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        success_msg = f"[{timestamp}] SUCCESS: {message}"
        print(success_msg)
    
    def generate_duplicate_hash(self, title, price, image_url=""):
        """重複検出用ハッシュ生成"""
        # タイトル正規化
        normalized_title = re.sub(r'[\s\-_【】\[\]()（）]+', '', title.lower())
        
        # 価格範囲（10%の幅で重複判定）
        price_range = int(price / (price * 0.1 + 1)) if price > 0 else 0
        
        # 複合文字列作成
        composite = f"{normalized_title}_{price_range}_{image_url[:50]}"
        
        # ハッシュ生成
        return hashlib.md5(composite.encode()).hexdigest()
    
    def generate_title_hash(self, title):
        """タイトルハッシュ生成"""
        if not title:
            return ""
        normalized = re.sub(r'[\s\-_【】\[\]()（）]+', '', title.lower())
        return hashlib.md5(normalized.encode()).hexdigest()[:32]
    
    def check_duplicate(self, yahoo_url, title, price):
        """重複チェック"""
        conn = self.connect_db()
        if not conn:
            return False
        
        try:
            cursor = conn.cursor()
            
            # URL重複チェック
            cursor.execute(
                "SELECT product_id FROM unified_scraped_ebay_products WHERE yahoo_url = %s",
                (yahoo_url,)
            )
            
            if cursor.fetchone():
                self.log_success(f"重複スキップ（URL）: {yahoo_url}")
                self.session_stats['duplicates_skipped'] += 1
                return True
            
            # ハッシュ重複チェック
            duplicate_hash = self.generate_duplicate_hash(title, price)
            cursor.execute(
                "SELECT product_id FROM unified_scraped_ebay_products WHERE duplicate_detection_hash = %s",
                (duplicate_hash,)
            )
            
            if cursor.fetchone():
                self.log_success(f"重複スキップ（ハッシュ）: {title[:30]}...")
                self.session_stats['duplicates_skipped'] += 1
                return True
            
            return False
            
        except Exception as e:
            self.log_error(f"重複チェックエラー: {e}")
            return False
        finally:
            if conn:
                conn.close()
    
    def scrape_yahoo_auction(self, url, debug=True):
        """
        ヤフオクスクレイピング（統合DB対応版）
        """
        self.log_success(f"🧪 スクレイピング開始: {url}")
        self.session_stats['total_urls'] += 1
        
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=not debug)
                page = browser.new_page()
                
                # User-Agentを設定
                page.set_extra_http_headers({
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                })
                
                response = page.goto(url, timeout=30000)
                self.log_success(f"HTTP Status: {response.status}")
                
                # ページ読み込み待機
                page.wait_for_timeout(3000)
                
                # Yahoo商品ID抽出
                yahoo_auction_id = ""
                auction_id_match = re.search(r'/auction/([a-zA-Z0-9]+)', url)
                if auction_id_match:
                    yahoo_auction_id = auction_id_match.group(1)
                
                # タイトル取得
                title = self.extract_title(page)
                
                # 価格取得
                price = self.extract_price(page)
                
                # 重複チェック
                if self.check_duplicate(url, title, price):
                    return {'success': False, 'reason': 'duplicate'}
                
                # 説明取得
                description = self.extract_description(page)
                
                # 画像URL取得
                image_urls = self.extract_images(page)
                
                # カテゴリ取得
                category = self.extract_category(page)
                
                # 出品者情報取得
                seller_info = self.extract_seller_info(page)
                
                browser.close()
                
                # データ構築
                scraped_data = self.build_scraped_data(
                    url, yahoo_auction_id, title, description, 
                    price, image_urls, category, seller_info
                )
                
                # データベース保存
                if self.save_to_database(scraped_data):
                    self.session_stats['successful_scrapes'] += 1
                    self.log_success(f"✅ 保存成功: {title[:30]}... (¥{price:,})")
                    return {'success': True, 'data': scraped_data}
                else:
                    self.session_stats['failed_scrapes'] += 1
                    return {'success': False, 'reason': 'db_save_failed'}
                
        except Exception as e:
            self.log_error(f"スクレイピングエラー: {e}")
            self.session_stats['failed_scrapes'] += 1
            return {'success': False, 'reason': str(e)}
    
    def extract_title(self, page):
        """タイトル抽出"""
        title_selectors = [
            'h1',
            '.ProductTitle__text',
            '[data-cl-params*="title"]',
            '.p-item-title',
            '.ProductTitle'
        ]
        
        for selector in title_selectors:
            try:
                element = page.locator(selector).first
                if element.is_visible():
                    title = element.text_content().strip()
                    if title and len(title) > 5:
                        return title
            except:
                continue
        
        # フォールバック
        return page.title() or "タイトル取得失敗"
    
    def extract_price(self, page):
        """価格抽出"""
        price_selectors = [
            'dd:has-text("円")',
            '.Price--bid',
            '.ProductPrice dd',
            '[class*="price"]',
            '.Price'
        ]
        
        for selector in price_selectors:
            try:
                element = page.locator(selector).first
                if element.is_visible():
                    price_text = element.text_content().strip()
                    
                    # 価格変換
                    yen_match = re.search(r'([\d,]+)円', price_text)
                    if yen_match:
                        return int(yen_match.group(1).replace(',', ''))
            except:
                continue
        
        return 0
    
    def extract_description(self, page):
        """説明抽出"""
        desc_selectors = [
            '.ProductExplanation__commentArea',
            '.ProductDescription__body',
            '.auct-product-desc',
            '[data-cl-params*="desc"]'
        ]
        
        for selector in desc_selectors:
            try:
                element = page.locator(selector).first
                if element.is_visible():
                    desc_text = element.text_content().strip()
                    if desc_text and len(desc_text) > 30:
                        return desc_text[:2000]  # 2000文字制限
            except:
                continue
        
        return "商品説明が見つかりませんでした"
    
    def extract_images(self, page):
        """画像抽出"""
        img_selectors = [
            '.ProductImage img',
            '.ProductImage__image',
            '[class*="ProductImage"] img',
            'img[src*="auctions.c.yimg.jp"]'
        ]
        
        image_urls = []
        for selector in img_selectors:
            try:
                imgs = page.locator(selector).all()
                for img in imgs:
                    src = img.get_attribute('src')
                    if src and self.is_valid_image_url(src):
                        image_urls.append(src)
            except:
                continue
        
        # 重複削除と制限
        return list(dict.fromkeys(image_urls))[:12]
    
    def extract_category(self, page):
        """カテゴリ抽出"""
        category_selectors = [
            '.p-breadcrumbs a',
            '[class*="breadcrumb"] a',
            'nav a'
        ]
        
        for selector in category_selectors:
            try:
                elements = page.locator(selector).all()
                categories = []
                for el in elements:
                    text = el.text_content().strip()
                    if text and text not in ['ホーム', 'トップ', 'TOP', 'ヤフオク!']:
                        categories.append(text)
                
                if categories:
                    return " > ".join(categories[-4:])  # 最後の4つのカテゴリ
            except:
                continue
        
        return ""
    
    def extract_seller_info(self, page):
        """出品者情報抽出"""
        seller_selectors = [
            '[class*="seller"]',
            '[class*="user"]',
            '.SellerInfo'
        ]
        
        for selector in seller_selectors:
            try:
                element = page.locator(selector).first
                if element.is_visible():
                    seller_text = element.text_content().strip()
                    if seller_text and len(seller_text) > 3:
                        return seller_text[:200]
            except:
                continue
        
        return ""
    
    def is_valid_image_url(self, url):
        """有効な画像URLチェック"""
        if not url or not isinstance(url, str):
            return False
        
        # 無効パターン除外
        invalid_patterns = [
            'dsb.yahoo.co.jp', 'clear.gif', 'tracking', 'pixel', 
            'analytics', 'logo.png', 'icon', 'banner'
        ]
        
        for pattern in invalid_patterns:
            if pattern in url:
                return False
        
        # 有効パターン確認
        valid_patterns = [
            'auctions.c.yimg.jp', 'wing-auctions.c.yimg.jp',
            '.jpg', '.jpeg', '.png', '.gif', '.webp'
        ]
        
        return any(pattern in url for pattern in valid_patterns)
    
    def build_scraped_data(self, url, yahoo_auction_id, title, description, 
                          price, image_urls, category, seller_info):
        """スクレイピングデータ構築"""
        
        product_id = str(uuid.uuid4())[:12]  # 12文字のユニークID
        current_time = datetime.now()
        
        # ハッシュ生成
        title_hash = self.generate_title_hash(title)
        duplicate_hash = self.generate_duplicate_hash(
            title, price, image_urls[0] if image_urls else ""
        )
        
        return {
            # 基本識別
            'product_id': product_id,
            'unified_product_id': str(uuid.uuid4()),
            'scrape_timestamp': current_time,
            'yahoo_url': url,
            'yahoo_auction_id': yahoo_auction_id,
            
            # ハッシュシステム
            'title_hash': title_hash,
            'duplicate_detection_hash': duplicate_hash,
            
            # 日本語データ
            'title_jp': title,
            'description_jp': description,
            'price_jpy': price,
            'category_jp': category,
            'seller_info_jp': seller_info,
            
            # 画像情報
            'scraped_image_urls': '|'.join(image_urls) if image_urls else '',
            'scraped_image_count': len(image_urls),
            
            # ステータス
            'status': 'scraped',
            'stock_quantity': 1,
            'scrape_success': True,
            'ebay_list_success': False,
            
            # データソース管理
            'data_source_priority': 'scraped',
            'integration_status': 'scraped',
            'has_scraped_data': True,
            'has_ebay_api_data': False,
            'has_manual_data': False,
            
            # 同期フラグ
            'sync_to_tanaoroshi': True,
            'sync_to_ebay_system': False,
            'sync_to_yahoo_system': True
        }
    
    def save_to_database(self, data):
        """PostgreSQL保存"""
        conn = self.connect_db()
        if not conn:
            return False
        
        try:
            cursor = conn.cursor()
            
            # INSERT SQL
            insert_sql = """
            INSERT INTO unified_scraped_ebay_products (
                product_id, unified_product_id, scrape_timestamp, yahoo_url, yahoo_auction_id,
                title_hash, duplicate_detection_hash, 
                title_jp, description_jp, price_jpy, category_jp, seller_info_jp,
                scraped_image_urls, scraped_image_count,
                status, stock_quantity, scrape_success, ebay_list_success,
                data_source_priority, integration_status,
                has_scraped_data, has_ebay_api_data, has_manual_data,
                sync_to_tanaoroshi, sync_to_ebay_system, sync_to_yahoo_system
            ) VALUES (
                %(product_id)s, %(unified_product_id)s, %(scrape_timestamp)s, 
                %(yahoo_url)s, %(yahoo_auction_id)s,
                %(title_hash)s, %(duplicate_detection_hash)s,
                %(title_jp)s, %(description_jp)s, %(price_jpy)s, 
                %(category_jp)s, %(seller_info_jp)s,
                %(scraped_image_urls)s, %(scraped_image_count)s,
                %(status)s, %(stock_quantity)s, %(scrape_success)s, %(ebay_list_success)s,
                %(data_source_priority)s, %(integration_status)s,
                %(has_scraped_data)s, %(has_ebay_api_data)s, %(has_manual_data)s,
                %(sync_to_tanaoroshi)s, %(sync_to_ebay_system)s, %(sync_to_yahoo_system)s
            )
            """
            
            cursor.execute(insert_sql, data)
            conn.commit()
            
            return True
            
        except Exception as e:
            self.log_error(f"データベース保存エラー: {e}")
            if conn:
                conn.rollback()
            return False
        finally:
            if conn:
                conn.close()
    
    def log_editing_history(self, product_id, edit_type, reason=""):
        """編集履歴記録"""
        conn = self.connect_db()
        if not conn:
            return
        
        try:
            cursor = conn.cursor()
            
            history_data = {
                'product_id': product_id,
                'field_name': 'ebay_translation',
                'edit_type': edit_type,
                'edit_reason': reason,
                'edited_by': 'unified_scraping_system'
            }
            
            insert_sql = """
            INSERT INTO product_editing_history (
                product_id, field_name, edit_type, edit_reason, edited_by
            ) VALUES (
                %(product_id)s, %(field_name)s, %(edit_type)s, %(edit_reason)s, %(edited_by)s
            )
            """
            
            cursor.execute(insert_sql, history_data)
            conn.commit()
            
        except Exception as e:
            self.log_error(f"編集履歴記録エラー: {e}")
        finally:
            if conn:
                conn.close()
    
    def batch_scrape_urls(self, urls, max_concurrent=3):
        """複数URL一括スクレイピング"""
        self.log_success(f"🚀 一括スクレイピング開始: {len(urls)}件")
        
        results = []
        failed_urls = []
        
        for i, url in enumerate(urls):
            self.log_success(f"進行状況: {i+1}/{len(urls)} - {url}")
            
            result = self.scrape_yahoo_auction(url, debug=False)
            
            if result['success']:
                results.append(result['data'])
            else:
                failed_urls.append({
                    'url': url,
                    'reason': result.get('reason', 'unknown')
                })
            
            # 間隔調整（サーバー負荷軽減）
            time.sleep(2)
        
        # セッションログ保存
        self.save_session_log()
        
        # 結果サマリー
        self.log_success(f"✅ 一括スクレイピング完了:")
        self.log_success(f"  成功: {len(results)}件")
        self.log_success(f"  失敗: {len(failed_urls)}件")
        self.log_success(f"  重複スキップ: {self.session_stats['duplicates_skipped']}件")
        
        return {
            'successful_results': results,
            'failed_urls': failed_urls,
            'session_stats': self.session_stats
        }
    
    def save_session_log(self):
        """セッションログ保存"""
        conn = self.connect_db()
        if not conn:
            return False
        
        try:
            cursor = conn.cursor()
            
            session_data = {
                'session_id': self.session_id,
                'total_urls_processed': self.session_stats['total_urls'],
                'successful_scrapes': self.session_stats['successful_scrapes'],
                'failed_scrapes': self.session_stats['failed_scrapes'],
                'duplicate_urls_skipped': self.session_stats['duplicates_skipped'],
                'error_details': json.dumps(self.session_stats['errors'], ensure_ascii=False),
                'completed_at': datetime.now()
            }
            
            insert_sql = """
            INSERT INTO scraping_session_logs (
                session_id, total_urls_processed, successful_scrapes, 
                failed_scrapes, duplicate_urls_skipped, error_details, completed_at
            ) VALUES (
                %(session_id)s, %(total_urls_processed)s, %(successful_scrapes)s,
                %(failed_scrapes)s, %(duplicate_urls_skipped)s, %(error_details)s, %(completed_at)s
            )
            """
            
            cursor.execute(insert_sql, session_data)
            conn.commit()
            
            self.log_success("セッションログ保存完了")
            return True
            
        except Exception as e:
            self.log_error(f"セッションログ保存エラー: {e}")
            return False
        finally:
            if conn:
                conn.close()
    
    def get_scraped_products(self, status='scraped', limit=50):
        """スクレイピング済み商品取得"""
        conn = self.connect_db()
        if not conn:
            return []
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            query = """
            SELECT 
                product_id, title_jp, description_jp, price_jpy, 
                category_jp, scraped_image_urls, yahoo_url,
                scrape_timestamp, status
            FROM unified_scraped_ebay_products 
            WHERE status = %s 
            ORDER BY scrape_timestamp DESC 
            LIMIT %s
            """
            
            cursor.execute(query, (status, limit))
            products = cursor.fetchall()
            
            return [dict(product) for product in products]
            
        except Exception as e:
            self.log_error(f"商品取得エラー: {e}")
            return []
        finally:
            if conn:
                conn.close()
    
    def get_system_status(self):
        """システム状態取得"""
        conn = self.connect_db()
        if not conn:
            return {}
        
        try:
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # データ品質レポート取得
            cursor.execute("SELECT * FROM scraping_quality_report")
            quality_report = cursor.fetchone()
            
            # 統合状況取得
            cursor.execute("SELECT * FROM integration_status_summary")
            integration_status = cursor.fetchall()
            
            # 編集準備完了商品数
            cursor.execute("SELECT COUNT(*) as count FROM products_ready_for_editing")
            ready_for_editing = cursor.fetchone()
            
            # eBay出品準備完了商品数
            cursor.execute("SELECT COUNT(*) as count FROM products_ready_for_ebay")
            ready_for_ebay = cursor.fetchone()
            
            return {
                'quality_report': dict(quality_report) if quality_report else {},
                'integration_status': [dict(row) for row in integration_status],
                'ready_for_editing': ready_for_editing['count'] if ready_for_editing else 0,
                'ready_for_ebay': ready_for_ebay['count'] if ready_for_ebay else 0,
                'last_check': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.log_error(f"システム状態取得エラー: {e}")
            return {}
        finally:
            if conn:
                conn.close()

# ターミナルコマンドライン実行用
def main():
    """コマンドライン実行"""
    import sys
    
    if len(sys.argv) < 2:
        print("使用方法:")
        print("  python unified_scraping_system.py <URL>")
        print("  python unified_scraping_system.py batch <URL1> <URL2> <URL3>...")
        print("  python unified_scraping_system.py status")
        return
    
    scraper = UnifiedScrapingSystem()
    
    command = sys.argv[1]
    
    if command == 'status':
        # システム状態確認
        status = scraper.get_system_status()
        print(json.dumps(status, indent=2, ensure_ascii=False))
    
    elif command == 'batch':
        # 一括スクレイピング
        urls = sys.argv[2:]
        if not urls:
            print("❌ URLを指定してください")
            return
        
        results = scraper.batch_scrape_urls(urls)
        print(f"✅ 一括スクレイピング完了: {len(results['successful_results'])}件成功")
    
    else:
        # 単一URL スクレイピング
        url = sys.argv[1]
        result = scraper.scrape_yahoo_auction(url)
        
        if result['success']:
            print(f"✅ スクレイピング成功: {result['data']['title_jp']}")
        else:
            print(f"❌ スクレイピング失敗: {result['reason']}")

if __name__ == "__main__":
    main()
