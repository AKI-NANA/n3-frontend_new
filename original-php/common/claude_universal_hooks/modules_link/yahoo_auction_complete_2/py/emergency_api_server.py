#!/usr/bin/env python3
"""
緊急用 - Flask-CORSなし版 APIサーバー
"""

from flask import Flask, request, jsonify
import json
import sqlite3
import os
import pandas as pd
from datetime import datetime
import logging
import time
import io
import csv

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# CORS手動設定
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# 設定
DATABASE_PATH = 'yahoo_ebay_workflow_enhanced.db'

@app.route('/api/get_all_data')
def get_all_data():
    """全データ取得（緊急版）"""
    try:
        # データベース初期化
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # テーブル作成（存在しない場合）
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products_enhanced (
                id INTEGER PRIMARY KEY,
                product_id TEXT UNIQUE,
                title_jp TEXT,
                title_en TEXT,
                price_jpy REAL DEFAULT 1000,
                price_usd REAL DEFAULT 8.5,
                source_platform TEXT DEFAULT 'yahoo',
                status TEXT DEFAULT 'scraped',
                listing_type TEXT DEFAULT 'auction',
                category_jp TEXT DEFAULT 'その他',
                main_image_url TEXT DEFAULT 'https://via.placeholder.com/400x300',
                source_url TEXT DEFAULT 'https://auctions.yahoo.co.jp/',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # サンプルデータ挿入
        samples = [
            (f'EMERGENCY_{i:03d}', f'緊急修復商品{i}', f'Emergency Product {i}', 
             1000 + i*100, 8.0 + i*0.5, 'yahoo', 'scraped', 'auction', 
             'エレクトロニクス', 'https://via.placeholder.com/400x300', 
             f'https://auctions.yahoo.co.jp/{i}')
            for i in range(1, 26)
        ]
        
        cursor.executemany('''
            INSERT OR IGNORE INTO products_enhanced 
            (product_id, title_jp, title_en, price_jpy, price_usd, source_platform, 
             status, listing_type, category_jp, main_image_url, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', samples)
        
        # データ取得
        cursor.execute('SELECT * FROM products_enhanced ORDER BY id DESC LIMIT 50')
        columns = [description[0] for description in cursor.description]
        rows = cursor.fetchall()
        
        products = []
        for row in rows:
            product = dict(zip(columns, row))
            # フロントエンドが期待するフィールド名にマッピング
            product['platform'] = product.get('source_platform', 'yahoo')
            product['mall_category'] = product.get('category_jp', 'その他')
            product['calculated_price_usd'] = product.get('price_usd', 0)
            product['domestic_shipping_jpy'] = 800
            product['cost_price_jpy'] = int(product.get('price_jpy', 1000) * 0.6)
            products.append(product)
        
        conn.commit()
        conn.close()
        
        logger.info(f"✅ {len(products)}件のデータを返送")
        
        return jsonify({
            'success': True,
            'data': products,
            'total_count': len(products),
            'message': f'{len(products)}件のデータを取得しました（緊急修復版）'
        })
        
    except Exception as e:
        logger.error(f"❌ データ取得エラー: {e}")
        return jsonify({
            'success': False, 
            'error': str(e),
            'fallback_data': []
        }), 500

@app.route('/health')
def health_check():
    """ヘルスチェック"""
    return jsonify({
        'status': 'healthy',
        'version': 'emergency_no_cors',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/system_status')
def system_status():
    """システム状態"""
    return jsonify({
        'success': True,
        'stats': {
            'total': 25,
            'scraped': 25,
            'ready': 25,
            'listed': 0
        },
        'system_info': {
            'version': 'emergency',
            'cors': 'manual'
        }
    })

if __name__ == '__main__':
    logger.info("🚨 緊急用APIサーバー起動中...")
    logger.info("🌐 http://localhost:5001")
    
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=False,
        threaded=True
    )
