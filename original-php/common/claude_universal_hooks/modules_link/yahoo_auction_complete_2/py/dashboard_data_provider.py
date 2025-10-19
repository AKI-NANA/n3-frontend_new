# ファイル作成: dashboard_data_provider.py
# 目的: リアルタイムダッシュボード表示用データ提供

import json
import logging
from database_connector import DatabaseManager
from collections import defaultdict
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class DashboardDataProvider:
    def __init__(self):
        self.db_manager = DatabaseManager()

    def get_summary_data(self):
        """売上統計、在庫状況集計、利益分析データを生成"""
        total_listed = self.db_manager.execute_query("SELECT COUNT(*) FROM listings WHERE status = 'listed';", fetch=True)[0]['count']
        total_sold = self.db_manager.execute_query("SELECT COUNT(*) FROM listings WHERE status = 'sold';", fetch=True)[0]['count']
        total_profit = self.db_manager.execute_query("SELECT SUM(profit_usd) FROM sales_history;", fetch=True)[0]['sum']

        return {
            'total_listed_items': total_listed,
            'total_items_sold': total_sold,
            'total_profit_usd': round(total_profit, 2) if total_profit else 0
        }

    def get_inventory_status(self):
        """在庫状況の内訳をJSON API形式で提供"""
        sql = "SELECT status, COUNT(*) FROM listings GROUP BY status;"
        raw_data = self.db_manager.execute_query(sql, fetch=True)
        
        status_map = {item['status']: item['count'] for item in raw_data}
        return status_map

    def get_sales_trend_data(self):
        """日次売上トレンドデータを生成"""
        sql = """
        SELECT DATE(sold_at) as sale_date, COUNT(*) as daily_sales
        FROM sales_history
        WHERE sold_at >= NOW() - INTERVAL '30 day'
        GROUP BY sale_date
        ORDER BY sale_date;
        """
        sales_data = self.db_manager.execute_query(sql, fetch=True)
        return sales_data

    def get_account_performance(self):
        """アカウント別パフォーマンスデータを取得"""
        sql = """
        SELECT
            ebay_account_id,
            COUNT(*) as total_listings,
            SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as total_sold
        FROM listings
        GROUP BY ebay_account_id;
        """
        performance_data = self.db_manager.execute_query(sql, fetch=True)
        return performance_data