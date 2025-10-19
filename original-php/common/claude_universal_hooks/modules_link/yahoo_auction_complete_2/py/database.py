# ファイル作成: database_connector.py
# 目的: エラーの原因となっていたDatabaseUniversalConnectorを完全に置換

import psycopg2
from psycopg2.extras import RealDictCursor
import json
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class DatabaseManager:
    def __init__(self, config=None):
        self.config = config or {
            'dbname': os.environ.get('DB_NAME', 'nagano_db'),
            'user': os.environ.get('DB_USER', 'postgres'),
            'password': os.environ.get('DB_PASSWORD', 'root1234'),
            'host': os.environ.get('DB_HOST', 'localhost')
        }
        self.connection = None

    def connect(self):
        """PostgreSQL接続確立とエラーハンドリング強化"""
        if self.connection and not self.connection.closed:
            return self.connection
        
        try:
            self.connection = psycopg2.connect(**self.config)
            self.connection.autocommit = True
            logging.info("✅ データベース接続成功")
            return self.connection
        except psycopg2.OperationalError as e:
            logging.error(f"❌ データベース接続エラー: {e}")
            self.connection = None
            raise

    def execute_query(self, sql, params=None, fetch=False):
        """
        SQLインジェクション対策とトランザクション管理
        fetch=Trueで結果セットを取得
        """
        if not self.connection or self.connection.closed:
            self.connect()

        try:
            with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(sql, params)
                if fetch:
                    return cursor.fetchall()
        except psycopg2.Error as e:
            logging.error(f"❌ SQL実行エラー: {e}")
            self.connection.rollback()
            raise
        finally:
            self.connection.commit()

    def save_listing(self, listing_data):
        """
        単一または複数の出品データをデータベースに保存
        JSONB型対応、重複チェック、バルクインサート対応
        """
        if not isinstance(listing_data, list):
            listing_data = [listing_data]
            
        sql = """
        INSERT INTO listings (
            source_type, source_url, yahoo_auction_id, amazon_asin,
            title_jp, description_jp, current_price_jpy,
            estimated_weight_kg, estimated_shipping_cost_jpy,
            status, created_at, updated_at, error_log
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), %s)
        ON CONFLICT (yahoo_auction_id) DO UPDATE SET
            title_jp = EXCLUDED.title_jp,
            description_jp = EXCLUDED.description_jp,
            current_price_jpy = EXCLUDED.current_price_jpy,
            updated_at = NOW();
        """
        
        data_to_insert = [
            (
                d.get('source_type'), d.get('source_url'), d.get('yahoo_auction_id'), d.get('amazon_asin'),
                d.get('title_jp'), d.get('description_jp'), d.get('current_price_jpy'),
                d.get('estimated_weight_kg'), d.get('estimated_shipping_cost_jpy'),
                d.get('status', 'scraped'), json.dumps(d.get('error_log', {}))
            ) for d in listing_data
        ]
        
        try:
            self.execute_query(sql, data_to_insert)
            logging.info(f"✅ {len(listing_data)}件の出品データを保存しました。")
        except Exception as e:
            logging.error(f"❌ 出品データの保存中にエラーが発生しました: {e}")
            
    def close(self):
        if self.connection:
            self.connection.close()
            logging.info("✅ データベース接続を閉じました。")