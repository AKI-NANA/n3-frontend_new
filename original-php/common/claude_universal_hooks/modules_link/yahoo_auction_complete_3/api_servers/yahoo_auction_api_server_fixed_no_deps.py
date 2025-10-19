#!/usr/bin/env python3
"""
Yahoo→eBay統合ワークフロー完全版APIサーバー
ポート5002で動作する修正版（flask-cors 依存なし）
"""

from flask import Flask, request, jsonify, send_from_directory
import json
import sqlite3
import os
import pandas as pd
import requests
from datetime import datetime
import logging
import traceback

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# CORS設定（flask-corsを使わずに手動設定）
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# 設定
DATABASE_PATH = 'yahoo_ebay_workflow_enhanced.db'
UPLOAD_FOLDER = 'uploads'

# アップロードフォルダ作成
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def init_database():
    """データベース初期化"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # 商品データテーブル
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT UNIQUE,
                title TEXT,
                title_jp TEXT,
                description TEXT,
                description_jp TEXT,
                price_jpy REAL,
                cost_price_jpy REAL,
                domestic_shipping_jpy REAL,
                calculated_price_usd REAL,
                platform TEXT DEFAULT 'yahoo',
                mall_category TEXT,
                category TEXT,
                main_image_url TEXT,
                image_urls TEXT,
                source_url TEXT,
                listing_type TEXT,
                status TEXT DEFAULT 'scraped',
                approval_status TEXT DEFAULT 'pending',
                risk_level TEXT DEFAULT 'low',
                ai_score REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 送料データテーブル
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS shipping_rates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                carrier TEXT,
                service_name TEXT,
                country_code TEXT,
                weight_kg REAL,
                cost_usd REAL,
                delivery_days TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 承認履歴テーブル
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS approval_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT,
                action TEXT,
                user_id TEXT DEFAULT 'system',
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # サンプルデータ投入
        sample_products = []
        for i in range(1, 301):
            # リスクレベルをランダムに設定
            risk_levels = ['low', 'medium', 'high']
            risk = risk_levels[i % 3]
            
            # AI判定ステータス
            ai_statuses = ['pending', 'approved', 'rejected']
            ai_status = ai_statuses[i % 3]
            
            sample_products.append((
                f'YAHOO_{i:05d}', 
                f'サンプル商品{i} - テスト商品タイトル',
                f'Sample Product {i} - Test Product Title',
                f'詳細説明{i}：この商品は高品質な製品です。',
                f'Description {i}: This is a high-quality product.',
                1000 + i*100, 500 + i*50, 800, 15.50 + i*0.5,
                'yahoo', 'Electronics', 'Electronics',
                f'https://example.com/image_{i}.jpg',
                f'https://example.com/image_{i}.jpg|https://example.com/image_{i}_2.jpg',
                f'https://auctions.yahoo.co.jp/jp/auction/{1000000 + i}',
                'auction' if i % 2 == 0 else 'fixed',
                'scraped',
                'pending',
                risk,
                0.5 + (i % 100) / 100.0
            ))
        
        cursor.executemany('''
            INSERT OR IGNORE INTO products 
            (product_id, title, title_jp, description, description_jp, 
             price_jpy, cost_price_jpy, domestic_shipping_jpy, calculated_price_usd,
             platform, mall_category, category, main_image_url, image_urls,
             source_url, listing_type, status, approval_status, risk_level, ai_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', sample_products)
        
        # サンプル送料データ
        sample_shipping = [
            ('eLogi', 'FedEx IE', 'US', 0.5, 33.00, '3-5'),
            ('eLogi', 'FedEx IE', 'US', 1.0, 39.00, '3-5'),
            ('eLogi', 'FedEx IE', 'US', 1.5, 45.00, '3-5'),
            ('eLogi', 'FedEx IE', 'US', 2.0, 51.00, '3-5'),
            ('eLogi', 'FedEx IP', 'US', 0.5, 28.00, '5-7'),
            ('eLogi', 'FedEx IP', 'US', 1.0, 34.00, '5-7'),
            ('eLogi', 'FedEx IP', 'US', 1.5, 40.00, '5-7'),
            ('eLogi', 'FedEx IP', 'US', 2.0, 46.00, '5-7'),
            ('cpass', 'SpeedPAK', 'US', 0.5, 16.00, '7-15'),
            ('cpass', 'SpeedPAK', 'US', 1.0, 20.00, '7-15'),
            ('cpass', 'SpeedPAK', 'US', 1.5, 24.00, '7-15'),
            ('cpass', 'SpeedPAK', 'US', 2.0, 28.00, '7-15'),
            ('日本郵便', 'EMS', 'US', 0.5, 20.00, '3-6'),
            ('日本郵便', 'EMS', 'US', 1.0, 24.50, '3-6'),
            ('日本郵便', 'EMS', 'US', 1.5, 29.00, '3-6'),
            ('日本郵便', 'EMS', 'US', 2.0, 33.50, '3-6'),
            ('日本郵便', '航空便', 'US', 0.5, 14.00, '10-20'),
            ('日本郵便', '航空便', 'US', 1.0, 18.00, '10-20'),
            ('日本郵便', '航空便', 'US', 1.5, 22.00, '10-20'),
            ('日本郵便', '航空便', 'US', 2.0, 26.00, '10-20'),
        ]
        
        cursor.executemany('''
            INSERT OR IGNORE INTO shipping_rates 
            (carrier, service_name, country_code, weight_kg, cost_usd, delivery_days)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', sample_shipping)
        
        conn.commit()
        conn.close()
        logger.info("データベース初期化完了")
        
    except Exception as e:
        logger.error(f"データベース初期化エラー: {e}")
        logger.error(traceback.format_exc())

@app.route('/api/system_status')
def system_status():
    """システム状態取得"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # 統計データ取得
        cursor.execute("SELECT COUNT(*) FROM products")
        total_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM products WHERE status = 'scraped'")
        scraped_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM products WHERE status = 'calculated'")
        calculated_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM products WHERE status = 'filtered'")
        filtered_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM products WHERE status = 'ready'")
        ready_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM products WHERE status = 'listed'")
        listed_count = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'total': total_count,
                'scraped': scraped_count,
                'calculated': calculated_count,
                'filtered': filtered_count,
                'ready': ready_count,
                'listed': listed_count
            },
            'timestamp': datetime.now().isoformat(),
            'server_port': 5002
        })
    except Exception as e:
        logger.error(f"システム状態取得エラー: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get_all_data')
def get_all_data():
    """全データ取得"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        df = pd.read_sql_query("SELECT * FROM products ORDER BY created_at DESC", conn)
        conn.close()
        
        return jsonify({
            'success': True,
            'data': df.to_dict('records'),
            'count': len(df)
        })
    except Exception as e:
        logger.error(f"データ取得エラー: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get_approval_queue')
def get_approval_queue():
    """承認待ち商品データ取得"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        
        # 承認待ちの商品のみ取得（高・中リスクまたはAI判定待ち）
        query = '''
            SELECT * FROM products 
            WHERE approval_status = 'pending' 
            AND (risk_level IN ('medium', 'high') OR ai_score > 0.7)
            ORDER BY risk_level DESC, ai_score DESC
            LIMIT 50
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        # サンプルデータ生成（実際の商品データ）
        approval_queue = []
        for _, row in df.iterrows():
            approval_queue.append({
                'sku': row['product_id'],
                'title': row['title'],
                'title_jp': row['title_jp'],
                'price_jpy': row['price_jpy'],
                'calculated_price_usd': row['calculated_price_usd'],
                'category': row['category'],
                'main_image_url': row['main_image_url'],
                'risk_level': row['risk_level'],
                'ai_score': row['ai_score'],
                'approval_status': row['approval_status'],
                'platform': row['platform'],
                'listing_type': row['listing_type'],
                'source_url': row['source_url']
            })
        
        return jsonify({
            'success': True,
            'data': approval_queue,
            'stats': {
                'total_pending': len(approval_queue),
                'high_risk': len([item for item in approval_queue if item['risk_level'] == 'high']),
                'medium_risk': len([item for item in approval_queue if item['risk_level'] == 'medium']),
                'ai_approved': len([item for item in approval_queue if item['ai_score'] > 0.8]),
                'ai_rejected': len([item for item in approval_queue if item['ai_score'] < 0.3]),
                'ai_pending': len([item for item in approval_queue if 0.3 <= item['ai_score'] <= 0.8])
            }
        })
        
    except Exception as e:
        logger.error(f"承認待ちデータ取得エラー: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/update_approval_status', methods=['POST'])
def update_approval_status():
    """商品承認ステータス更新"""
    try:
        data = request.get_json()
        item_skus = data.get('item_skus', [])
        approval_action = data.get('approval_action', '')
        
        if not item_skus or not approval_action:
            return jsonify({'success': False, 'error': 'SKUまたはアクションが指定されていません'}), 400
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # 承認ステータス更新
        new_status = 'approved' if approval_action == 'approve' else 'rejected'
        
        for sku in item_skus:
            cursor.execute('''
                UPDATE products 
                SET approval_status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE product_id = ?
            ''', (new_status, sku))
            
            # 承認履歴記録
            cursor.execute('''
                INSERT INTO approval_history (product_id, action, reason)
                VALUES (?, ?, ?)
            ''', (sku, approval_action, f'Bulk {approval_action} action'))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'{len(item_skus)}件の商品を{approval_action}しました',
            'processed_count': len(item_skus)
        })
        
    except Exception as e:
        logger.error(f"承認ステータス更新エラー: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/scrape_yahoo', methods=['POST'])
def scrape_yahoo():
    """Yahooオークションデータ取得"""
    try:
        data = request.get_json()
        urls = data.get('urls', [])
        
        if not urls:
            return jsonify({'success': False, 'error': 'URLが指定されていません'}), 400
        
        # 実際のスクレイピング処理はここに実装
        # 今回はサンプルデータを返す
        scraped_data = []
        
        for i, url in enumerate(urls):
            scraped_item = {
                'product_id': f'SCRAPED_{datetime.now().strftime("%Y%m%d%H%M%S")}_{i}',
                'title': f'スクレイピング商品 {i+1}',
                'title_jp': f'スクレイピング商品 {i+1}',
                'description': f'スクレイピングで取得した商品説明 {i+1}',
                'price_jpy': 1500 + i*200,
                'source_url': url,
                'platform': 'yahoo',
                'status': 'scraped',
                'approval_status': 'pending',
                'risk_level': 'medium'
            }
            scraped_data.append(scraped_item)
        
        # データベースに保存
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        for item in scraped_data:
            cursor.execute('''
                INSERT INTO products 
                (product_id, title, title_jp, description, price_jpy, source_url, 
                 platform, status, approval_status, risk_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (item['product_id'], item['title'], item['title_jp'], 
                  item['description'], item['price_jpy'], item['source_url'], 
                  item['platform'], item['status'], item['approval_status'], item['risk_level']))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'{len(scraped_data)}件のデータを取得しました',
            'data': scraped_data
        })
        
    except Exception as e:
        logger.error(f"スクレイピングエラー: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/calculate_shipping', methods=['POST'])
def calculate_shipping():
    """送料計算"""
    try:
        data = request.get_json()
        weight = float(data.get('weight', 0))
        country = data.get('country', 'US')
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # 送料データ取得
        cursor.execute('''
            SELECT carrier, service_name, cost_usd, delivery_days
            FROM shipping_rates 
            WHERE country_code = ? AND weight_kg >= ?
            ORDER BY cost_usd ASC
            LIMIT 5
        ''', (country, weight))
        
        results = cursor.fetchall()
        conn.close()
        
        candidates = []
        for carrier, service, cost, delivery in results:
            candidates.append({
                'carrier_name': carrier,
                'service_name': service,
                'total_cost_usd': cost,
                'delivery_days': delivery,
                'recommended': len(candidates) == 0  # 最初の候補を推奨とする
            })
        
        return jsonify({
            'success': True,
            'candidates': candidates,
            'input': {
                'weight': weight,
                'country': country
            }
        })
        
    except Exception as e:
        logger.error(f"送料計算エラー: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/health')
def health_check():
    """ヘルスチェック"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database': 'connected' if os.path.exists(DATABASE_PATH) else 'not_found',
        'port': 5002,
        'version': '2.0.1_no_cors_dep'
    })

@app.route('/')
def root():
    """ルートパス"""
    return jsonify({
        'service': 'Yahoo→eBay統合ワークフロー完全版APIサーバー',
        'version': '2.0.1',
        'port': 5002,
        'cors_enabled': True,
        'endpoints': [
            '/health',
            '/api/system_status',
            '/api/get_all_data',
            '/api/get_approval_queue',
            '/api/update_approval_status',
            '/api/scrape_yahoo',
            '/api/calculate_shipping'
        ]
    })

if __name__ == '__main__':
    # データベース初期化
    init_database()
    
    # サーバー起動
    logger.info("Yahoo→eBay統合APIサーバーを起動中...")
    logger.info("アクセス先: http://localhost:5002")
    logger.info("ヘルスチェック: http://localhost:5002/health")
    logger.info("システム状態: http://localhost:5002/api/system_status")
    logger.info("CORS設定: 手動設定（flask-corsライブラリ不要）")
    
    app.run(
        host='0.0.0.0',
        port=5002,
        debug=True,
        threaded=True
    )
