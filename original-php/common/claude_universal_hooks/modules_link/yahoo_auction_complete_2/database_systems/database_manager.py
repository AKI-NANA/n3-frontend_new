#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🗂️ データベース管理モジュール
N3準拠 - ヤフオク/PayPayフリマ統合型在庫管理システム用
"""

import mysql.connector
from mysql.connector import pooling, Error
import json
import logging
import time
from typing import Dict, List, Optional, Union, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import os
import sys


@dataclass
class ProductListing:
    """商品リスティングデータクラス"""
    platform: str
    item_id: str
    title_original: str
    price_jpy: float = 0.0
    title_translated: str = ""
    description_original: str = ""
    description_translated: str = ""
    price_usd: float = None
    price_text: str = ""
    condition_jp: str = ""
    category_jp: str = ""
    image_urls: str = ""
    image_count: int = 0
    main_image_url: str = ""
    seller_info: Dict = None
    auction_info: Dict = None
    master_sku: str = ""
    
    def __post_init__(self):
        if self.seller_info is None:
            self.seller_info = {}
        if self.auction_info is None:
            self.auction_info = {}


class DatabaseManager:
    """データベース管理クラス"""
    
    def __init__(self, config_path: str = None):
        self.config = self._load_config(config_path)
        self.logger = self._setup_logger()
        self.connection_pool = None
        self._create_connection_pool()
    
    def _load_config(self, config_path: str) -> Dict:
        """データベース設定を読み込み"""
        default_config = {
            'host': 'localhost',
            'database': 'nagano3',
            'user': 'root',
            'password': '',
            'charset': 'utf8mb4',
            'pool_name': 'yahoo_auction_pool',
            'pool_size': 10,
            'pool_reset_session': True,
            'autocommit': True
        }
        
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    file_config = json.load(f)
                    default_config.update(file_config)
            except Exception as e:
                print(f"設定ファイル読み込み警告: {e}")
        
        # 環境変数からの上書き
        env_mapping = {
            'DB_HOST': 'host',
            'DB_NAME': 'database',
            'DB_USER': 'user',
            'DB_PASS': 'password'
        }
        
        for env_key, config_key in env_mapping.items():
            if os.getenv(env_key):
                default_config[config_key] = os.getenv(env_key)
        
        return default_config
    
    def _setup_logger(self) -> logging.Logger:
        """ログセットアップ"""
        logger = logging.getLogger('DatabaseManager')
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            logger.setLevel(logging.INFO)
        return logger
    
    def _create_connection_pool(self):
        """データベース接続プール作成"""
        try:
            pool_config = {
                'pool_name': self.config['pool_name'],
                'pool_size': self.config['pool_size'],
                'pool_reset_session': self.config['pool_reset_session'],
                'host': self.config['host'],
                'database': self.config['database'],
                'user': self.config['user'],
                'password': self.config['password'],
                'charset': self.config['charset'],
                'autocommit': self.config['autocommit']
            }
            
            self.connection_pool = mysql.connector.pooling.MySQLConnectionPool(**pool_config)
            self.logger.info("✅ データベース接続プール作成成功")
            
        except Error as e:
            self.logger.error(f"❌ データベース接続プール作成失敗: {e}")
            raise
    
    def get_connection(self):
        """データベース接続取得"""
        try:
            return self.connection_pool.get_connection()
        except Error as e:
            self.logger.error(f"データベース接続取得失敗: {e}")
            raise
    
    def execute_query(self, query: str, params: Tuple = None, fetch: bool = False) -> Union[List[Dict], bool]:
        """クエリ実行"""
        connection = None
        cursor = None
        
        try:
            connection = self.get_connection()
            cursor = connection.cursor(dictionary=True)
            
            cursor.execute(query, params or ())
            
            if fetch:
                results = cursor.fetchall()
                return results
            else:
                connection.commit()
                return True
                
        except Error as e:
            self.logger.error(f"クエリ実行エラー: {e}")
            if connection:
                connection.rollback()
            return False
            
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()
    
    def save_product_listing(self, product_data: Dict) -> Optional[int]:
        """商品リスティング保存"""
        try:
            # データ整形
            save_data = self._prepare_product_data(product_data)
            
            # INSERT ON DUPLICATE KEY UPDATE
            query = """
            INSERT INTO product_listings (
                platform, item_id, title_original, price_jpy, price_text,
                description_original, image_urls, image_count, main_image_url,
                seller_info, auction_info, scrape_status, last_scrape_at,
                scrape_attempts, created_by, updated_by
            ) VALUES (
                %(platform)s, %(item_id)s, %(title_original)s, %(price_jpy)s, %(price_text)s,
                %(description_original)s, %(image_urls)s, %(image_count)s, %(main_image_url)s,
                %(seller_info)s, %(auction_info)s, 'success', NOW(),
                1, 'scraper', 'scraper'
            )
            ON DUPLICATE KEY UPDATE
                title_original = VALUES(title_original),
                price_jpy = VALUES(price_jpy),
                price_text = VALUES(price_text),
                description_original = VALUES(description_original),
                image_urls = VALUES(image_urls),
                image_count = VALUES(image_count),
                main_image_url = VALUES(main_image_url),
                seller_info = VALUES(seller_info),
                auction_info = VALUES(auction_info),
                scrape_status = 'success',
                last_scrape_at = NOW(),
                scrape_attempts = scrape_attempts + 1,
                updated_by = 'scraper',
                updated_at = CURRENT_TIMESTAMP
            """
            
            connection = self.get_connection()
            cursor = connection.cursor()
            
            cursor.execute(query, save_data)
            connection.commit()
            
            # 商品IDを取得
            product_id = cursor.lastrowid or self._get_product_id(save_data['platform'], save_data['item_id'])
            
            cursor.close()
            connection.close()
            
            self.logger.info(f"✅ 商品保存成功: ID={product_id}, {save_data['title_original'][:50]}...")
            return product_id
            
        except Exception as e:
            self.logger.error(f"❌ 商品保存失敗: {e}")
            return None
    
    def _prepare_product_data(self, raw_data: Dict) -> Dict:
        """商品データの整形"""
        # 画像URL処理
        image_urls = raw_data.get('image_urls', [])
        if isinstance(image_urls, list):
            image_urls_str = '|'.join(image_urls)
            main_image = image_urls[0] if image_urls else ""
            image_count = len(image_urls)
        else:
            image_urls_str = str(image_urls) if image_urls else ""
            main_image = ""
            image_count = 0
        
        # JSON形式データ
        seller_info = raw_data.get('seller_info', {})
        auction_info = raw_data.get('auction_info', {})
        
        prepared_data = {
            'platform': raw_data.get('platform', 'yahoo_auction'),
            'item_id': raw_data.get('item_id', ''),
            'title_original': raw_data.get('title', '')[:1000],  # 長さ制限
            'price_jpy': float(raw_data.get('price_jpy', 0)),
            'price_text': raw_data.get('price_text', '')[:255],
            'description_original': raw_data.get('description', '')[:10000],  # 長さ制限
            'image_urls': image_urls_str,
            'image_count': image_count,
            'main_image_url': main_image[:500] if main_image else "",
            'seller_info': json.dumps(seller_info, ensure_ascii=False) if seller_info else None,
            'auction_info': json.dumps(auction_info, ensure_ascii=False) if auction_info else None
        }
        
        return prepared_data
    
    def _get_product_id(self, platform: str, item_id: str) -> Optional[int]:
        """プラットフォームとアイテムIDから商品IDを取得"""
        query = "SELECT id FROM product_listings WHERE platform = %s AND item_id = %s"
        results = self.execute_query(query, (platform, item_id), fetch=True)
        
        if results:
            return results[0]['id']
        return None
    
    def save_scraping_history(self, listing_id: int, scrape_data: Dict) -> bool:
        """スクレイピング履歴保存"""
        try:
            query = """
            INSERT INTO scraping_history (
                listing_id, url, platform, item_id, status, processing_time,
                data_extracted, error_message, user_agent, retry_count, scraped_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
            )
            """
            
            params = (
                listing_id,
                scrape_data.get('url', ''),
                scrape_data.get('platform', ''),
                scrape_data.get('item_id', ''),
                'success' if scrape_data.get('success', False) else 'failed',
                scrape_data.get('processing_time', 0),
                json.dumps(scrape_data.get('debug_info', {}), ensure_ascii=False),
                scrape_data.get('error_message', ''),
                'RobustScraper/1.0',
                scrape_data.get('retry_count', 0)
            )
            
            return self.execute_query(query, params)
            
        except Exception as e:
            self.logger.error(f"スクレイピング履歴保存失敗: {e}")
            return False
    
    def get_products(self, platform: str = None, limit: int = 100, offset: int = 0) -> List[Dict]:
        """商品リスト取得"""
        base_query = """
        SELECT 
            id, platform, item_id, title_original, price_jpy, price_usd,
            scrape_status, ebay_listing_status, inventory_status,
            created_at, updated_at
        FROM product_listings 
        WHERE deleted_at IS NULL
        """
        
        params = []
        if platform:
            base_query += " AND platform = %s"
            params.append(platform)
        
        base_query += " ORDER BY updated_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        results = self.execute_query(base_query, tuple(params), fetch=True)
        return results or []
    
    def get_product_by_id(self, product_id: int) -> Optional[Dict]:
        """商品詳細取得"""
        query = """
        SELECT * FROM product_listings 
        WHERE id = %s AND deleted_at IS NULL
        """
        
        results = self.execute_query(query, (product_id,), fetch=True)
        return results[0] if results else None
    
    def update_ebay_listing(self, product_id: int, ebay_data: Dict) -> bool:
        """eBay出品情報更新"""
        try:
            query = """
            UPDATE product_listings SET
                ebay_item_id = %s,
                ebay_listing_status = %s,
                ebay_listing_url = %s,
                ebay_price_usd = %s,
                ebay_listed_at = %s,
                updated_by = 'ebay_sync',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """
            
            params = (
                ebay_data.get('item_id', ''),
                ebay_data.get('status', 'draft'),
                ebay_data.get('listing_url', ''),
                ebay_data.get('price_usd', None),
                ebay_data.get('listed_at', None),
                product_id
            )
            
            return self.execute_query(query, params)
            
        except Exception as e:
            self.logger.error(f"eBay情報更新失敗: {e}")
            return False
    
    def get_products_for_ebay_listing(self, limit: int = 50) -> List[Dict]:
        """eBay出品対象商品取得"""
        query = """
        SELECT 
            id, platform, item_id, title_original, title_translated,
            description_original, description_translated,
            price_jpy, price_usd, image_urls, main_image_url,
            condition_jp, category_jp
        FROM product_listings 
        WHERE deleted_at IS NULL
        AND scrape_status = 'success'
        AND ebay_listing_status = 'not_listed'
        AND price_jpy > 0
        AND title_original != ''
        ORDER BY profitability_score DESC, created_at DESC
        LIMIT %s
        """
        
        results = self.execute_query(query, (limit,), fetch=True)
        return results or []
    
    def cleanup_old_data(self, days: int = 30) -> bool:
        """古いデータクリーンアップ"""
        try:
            # 古いスクレイピング履歴削除
            query1 = "DELETE FROM scraping_history WHERE scraped_at < DATE_SUB(NOW(), INTERVAL %s DAY)"
            self.execute_query(query1, (days,))
            
            self.logger.info(f"✅ {days}日前のデータクリーンアップ完了")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ データクリーンアップ失敗: {e}")
            return False
    
    def close(self):
        """接続プールクローズ"""
        if self.connection_pool:
            # 接続プールの明示的なクローズは通常不要
            # ガベージコレクションで自動的に処理される
            pass
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


# 便利な関数
def get_database_manager(config_path: str = None) -> DatabaseManager:
    """データベースマネージャー取得"""
    return DatabaseManager(config_path)


# 使用例・テスト用メイン関数
def main():
    """メイン実行関数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='データベース管理システム')
    parser.add_argument('--test', action='store_true', help='テスト実行')
    parser.add_argument('--cleanup', type=int, help='クリーンアップ（日数指定）')
    parser.add_argument('--config', help='設定ファイルパス')
    
    args = parser.parse_args()
    
    try:
        with get_database_manager(args.config) as db:
            if args.test:
                # テストデータ保存
                test_data = {
                    'platform': 'yahoo_auction',
                    'item_id': 'test_' + str(int(time.time())),
                    'title': 'テスト商品',
                    'price_jpy': 1000,
                    'description': 'テスト用商品説明',
                    'image_urls': ['https://example.com/image1.jpg'],
                    'seller_info': {'name': 'テスト出品者'}
                }
                
                product_id = db.save_product_listing(test_data)
                print(f"✅ テストデータ保存: ID={product_id}")
            
            elif args.cleanup:
                # データクリーンアップ
                success = db.cleanup_old_data(args.cleanup)
                print(f"{'✅' if success else '❌'} クリーンアップ: {args.cleanup}日前")
            
            else:
                # デフォルト: 最新商品表示
                products = db.get_products(limit=5)
                print(f"📦 最新商品 ({len(products)}件):")
                for product in products:
                    print(f"  - {product['title_original'][:50]}... (¥{product['price_jpy']:,.0f})")
    
    except Exception as e:
        print(f"❌ エラー: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
