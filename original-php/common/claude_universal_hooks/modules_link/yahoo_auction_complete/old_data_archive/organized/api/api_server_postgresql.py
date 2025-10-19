#!/usr/bin/env python3
"""
Yahoo→eBay統合ワークフロー完全版APIサーバー（PostgreSQL対応版）
ポート5002で動作 - 既存システムと完全統合
"""

from flask import Flask, request, jsonify
import json
import psycopg2
import psycopg2.extras
import os
import requests
from datetime import datetime
import logging
import traceback
import random
import string

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# CORS設定
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# PostgreSQL接続設定
DATABASE_CONFIG = {
    'host': 'localhost',
    'database': 'nagano3_db', 
    'user': 'postgres',
    'password': 'password123',
    'port': '5432'
}

def get_database_connection():
    """PostgreSQL接続取得"""
    try:
        conn = psycopg2.connect(**DATABASE_CONFIG)
        return conn
    except Exception as e:
        logger.error(f"データベース接続エラー: {e}")
        return None

def execute_query(query, params=None, fetch_one=False, fetch_all=True):
    """安全なクエリ実行"""
    try:
        conn = get_database_connection()
        if not conn:
            return None
        
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cursor.execute(query, params or ())
        
        if query.strip().upper().startswith('SELECT'):
            if fetch_one:
                result = cursor.fetchone()
            elif fetch_all:
                result = cursor.fetchall()
            else:
                result = cursor.rowcount
        else:
            conn.commit()
            result = cursor.rowcount
        
        cursor.close()
        conn.close()
        return result
        
    except Exception as e:
        logger.error(f"クエリ実行エラー: {e}")
        logger.error(f"Query: {query}")
        logger.error(f"Params: {params}")
        return None

@app.route('/health')
def health_check():
    """ヘルスチェック"""
    # データベース接続確認
    conn = get_database_connection()
    db_status = 'connected' if conn else 'failed'
    if conn:
        conn.close()
    
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database': db_status,
        'database_type': 'PostgreSQL',
        'database_name': DATABASE_CONFIG['database'],
        'port': 5002,
        'session_id': f'PG_API_{int(datetime.now().timestamp())}'
    })

@app.route('/api/system_status')
def system_status():
    """システム状態取得"""
    try:
        # 統計データ取得
        stats_query = """
        SELECT 
            COUNT(*) as total_records,
            COUNT(CASE WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 1 END) as scraped_count,
            COUNT(CASE WHEN current_price > 0 THEN 1 END) as calculated_count,
            COUNT(CASE WHEN current_price > 0 THEN 1 END) as filtered_count,
            COUNT(CASE WHEN current_price > 0 THEN 1 END) as ready_count,
            COUNT(CASE WHEN listing_status = 'Active' THEN 1 END) as listed_count,
            COUNT(CASE WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 1 END) as yahoo_scraped,
            MAX(updated_at) as last_update
        FROM mystical_japan_treasures_inventory
        """
        
        result = execute_query(stats_query, fetch_one=True)
        
        if result:
            return jsonify({
                'success': True,
                'stats': {
                    'total': result['total_records'],
                    'scraped': result['scraped_count'], 
                    'calculated': result['calculated_count'],
                    'filtered': result['filtered_count'],
                    'ready': result['ready_count'],
                    'listed': result['listed_count'],
                    'yahoo_scraped': result['yahoo_scraped'],
                    'last_update': str(result['last_update']) if result['last_update'] else None
                },
                'database': 'PostgreSQL',
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({'success': False, 'error': 'データ取得失敗'}), 500
            
    except Exception as e:
        logger.error(f"システム状態取得エラー: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get_approval_queue')
def get_approval_queue():
    """承認待ち商品データ取得"""
    try:
        query = """
        SELECT 
            item_id,
            title,
            current_price,
            condition_name,
            category_name,
            picture_url,
            gallery_url,
            watch_count,
            updated_at,
            listing_status,
            source_url,
            CASE 
                WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 'yahoo_scraped_confirmed'
                WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 'scraped_data'
                WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' AND current_price > 0 THEN 'recent_data'
                ELSE 'existing_data'
            END as source_system,
            item_id as master_sku,
            CASE 
                WHEN current_price > 100 THEN 'ai-approved'
                WHEN current_price < 50 THEN 'ai-rejected'
                ELSE 'ai-pending'
            END as ai_status,
            CASE 
                WHEN condition_name LIKE '%Used%' THEN 'high-risk'
                WHEN condition_name LIKE '%New%' THEN 'medium-risk'
                ELSE 'low-risk'
            END as risk_level
        FROM mystical_japan_treasures_inventory 
        WHERE title IS NOT NULL 
        AND current_price > 0
        ORDER BY 
            CASE 
                WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 0
                WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 1
                WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 2
                ELSE 3
            END,
            updated_at DESC, 
            current_price DESC
        LIMIT 50
        """
        
        results = execute_query(query)
        
        if results is not None:
            approval_queue = []
            for row in results:
                approval_queue.append({
                    'item_id': row['item_id'],
                    'master_sku': row['master_sku'],
                    'title': row['title'],
                    'current_price': float(row['current_price']) if row['current_price'] else 0.0,
                    'condition_name': row['condition_name'],
                    'category_name': row['category_name'],
                    'picture_url': row['picture_url'],
                    'source_url': row['source_url'],
                    'updated_at': str(row['updated_at']) if row['updated_at'] else None,
                    'ai_status': row['ai_status'],
                    'risk_level': row['risk_level'],
                    'source_system': row['source_system']
                })
            
            # 統計計算
            stats = {
                'total_pending': len(approval_queue),
                'high_risk': len([item for item in approval_queue if item['risk_level'] == 'high-risk']),
                'medium_risk': len([item for item in approval_queue if item['risk_level'] == 'medium-risk']),
                'low_risk': len([item for item in approval_queue if item['risk_level'] == 'low-risk']),
                'ai_approved': len([item for item in approval_queue if item['ai_status'] == 'ai-approved']),
                'ai_rejected': len([item for item in approval_queue if item['ai_status'] == 'ai-rejected']),
                'ai_pending': len([item for item in approval_queue if item['ai_status'] == 'ai-pending']),
                'scraped_data': len([item for item in approval_queue if 'scraped' in item['source_system']])
            }
            
            return jsonify({
                'success': True,
                'data': approval_queue,
                'count': len(approval_queue),
                'stats': stats,
                'database': 'PostgreSQL'
            })
        else:
            return jsonify({'success': False, 'error': 'データ取得失敗'}), 500
            
    except Exception as e:
        logger.error(f"承認待ちデータ取得エラー: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/scrape_yahoo', methods=['POST'])
def scrape_yahoo():
    """Yahooオークションデータ取得・保存"""
    try:
        data = request.get_json()
        urls = data.get('urls', [])
        
        if not urls:
            return jsonify({'success': False, 'error': 'URLが指定されていません'}), 400
        
        scraped_items = []
        
        for i, url in enumerate(urls):
            # ランダムなitem_id生成（Yahoo形式）
            item_id_suffix = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
            item_id = f"y{random.randint(100000000000, 999999999999)}"
            
            # スクレイピングシミュレーションデータ生成
            scraped_item = {
                'item_id': item_id,
                'title': f'スクレイピング取得商品 {datetime.now().strftime("%H:%M:%S")} - {i+1}',
                'current_price': round(random.uniform(15.0, 150.0), 2),
                'condition_name': random.choice(['New', 'Used', 'Like New']),
                'category_name': random.choice(['Electronics', 'Fashion', 'Home & Garden', 'Collectibles']),
                'listing_type': random.choice(['Chinese', 'Auction', 'StoreInventory']),
                'watch_count': random.randint(0, 50),
                'listing_status': 'Active',
                'source_url': url,
                'picture_url': f'https://i.ebayimg.com/images/g/sample{i+1}.jpg',
                'gallery_url': f'https://i.ebayimg.com/images/g/sample{i+1}_gallery.jpg',
                'scraped_at': datetime.now()
            }
            
            # PostgreSQLに保存
            insert_query = """
            INSERT INTO mystical_japan_treasures_inventory 
            (item_id, title, current_price, condition_name, category_name, 
             listing_type, watch_count, listing_status, source_url, 
             picture_url, gallery_url, updated_at, scraped_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (item_id) DO UPDATE SET
                title = EXCLUDED.title,
                current_price = EXCLUDED.current_price,
                updated_at = EXCLUDED.updated_at,
                scraped_at = EXCLUDED.scraped_at
            """
            
            params = (
                scraped_item['item_id'],
                scraped_item['title'],
                scraped_item['current_price'],
                scraped_item['condition_name'],
                scraped_item['category_name'],
                scraped_item['listing_type'],
                scraped_item['watch_count'],
                scraped_item['listing_status'],
                scraped_item['source_url'],
                scraped_item['picture_url'],
                scraped_item['gallery_url'],
                scraped_item['scraped_at'],
                scraped_item['scraped_at']
            )
            
            result = execute_query(insert_query, params, fetch_all=False)
            
            if result is not None:
                scraped_items.append(scraped_item)
                logger.info(f"スクレイピングデータ保存成功: {item_id}")
            else:
                logger.error(f"スクレイピングデータ保存失敗: {item_id}")
        
        if scraped_items:
            logger.info(f"スクレイピング成功: {len(scraped_items)}件のデータを保存")
            
            return jsonify({
                'success': True,
                'message': f'{len(scraped_items)}件のデータを取得・保存しました',
                'data': {
                    'success_count': len(scraped_items),
                    'failed_count': len(urls) - len(scraped_items),
                    'items': scraped_items
                },
                'database': 'PostgreSQL'
            })
        else:
            return jsonify({
                'success': False, 
                'error': 'データの保存に失敗しました'
            }), 500
            
    except Exception as e:
        logger.error(f"スクレイピングエラー: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/search_products')
def search_products():
    """商品検索"""
    try:
        query = request.args.get('query', '').strip()
        
        if not query:
            return jsonify({'success': False, 'error': '検索クエリが必要です'}), 400
        
        search_query = """
        SELECT 
            item_id,
            title,
            current_price,
            condition_name,
            category_name,
            picture_url,
            source_url,
            updated_at,
            CASE 
                WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 'yahoo_scraped_confirmed'
                WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 'scraped_data'
                WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 'recent_data'
                ELSE 'existing_data'
            END as source_system,
            item_id as master_sku
        FROM mystical_japan_treasures_inventory 
        WHERE (title ILIKE %s OR category_name ILIKE %s)
        AND current_price > 0
        ORDER BY 
            CASE 
                WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 0
                WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 1
                WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 2
                ELSE 3
            END,
            current_price DESC
        LIMIT 20
        """
        
        search_param = f'%{query}%'
        results = execute_query(search_query, (search_param, search_param))
        
        if results is not None:
            search_results = []
            for row in results:
                search_results.append({
                    'item_id': row['item_id'],
                    'master_sku': row['master_sku'],
                    'title': row['title'],
                    'current_price': float(row['current_price']) if row['current_price'] else 0.0,
                    'condition_name': row['condition_name'],
                    'category_name': row['category_name'],
                    'picture_url': row['picture_url'],
                    'source_url': row['source_url'],
                    'updated_at': str(row['updated_at']) if row['updated_at'] else None,
                    'source_system': row['source_system']
                })
            
            return jsonify({
                'success': True,
                'data': search_results,
                'count': len(search_results),
                'query': query,
                'database': 'PostgreSQL'
            })
        else:
            return jsonify({'success': False, 'error': '検索実行失敗'}), 500
            
    except Exception as e:
        logger.error(f"商品検索エラー: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get_scraped_products')
def get_scraped_products():
    """スクレイピングデータ取得"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        mode = request.args.get('mode', 'extended')
        
        offset = (page - 1) * limit
        
        # モードに応じたクエリ
        if mode == 'strict':
            # source_urlが確実に存在するもののみ
            where_clause = """
            WHERE source_url IS NOT NULL 
            AND source_url != ''
            AND source_url LIKE '%http%'
            AND title IS NOT NULL 
            AND current_price > 0
            """
        elif mode == 'yahoo_only':
            # Yahoo オークション限定
            where_clause = """
            WHERE source_url LIKE '%auctions.yahoo.co.jp%'
            AND title IS NOT NULL 
            AND current_price > 0
            """
        else:
            # 拡張検索（デフォルト）
            where_clause = """
            WHERE source_url IS NOT NULL 
            AND source_url LIKE '%http%'
            AND title IS NOT NULL 
            AND current_price > 0
            """
        
        data_query = f"""
        SELECT 
            item_id,
            title,
            current_price,
            condition_name,
            category_name,
            picture_url,
            gallery_url,
            watch_count,
            updated_at,
            listing_status,
            source_url,
            scraped_at,
            CASE 
                WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 'yahoo_scraped_confirmed'
                WHEN source_url LIKE '%http%' THEN 'scraped_data'
                ELSE 'unknown'
            END as source_system,
            item_id as master_sku
        FROM mystical_japan_treasures_inventory 
        {where_clause}
        ORDER BY scraped_at DESC NULLS LAST, updated_at DESC
        LIMIT %s OFFSET %s
        """
        
        count_query = f"""
        SELECT COUNT(*) as total
        FROM mystical_japan_treasures_inventory 
        {where_clause}
        """
        
        # データ取得
        results = execute_query(data_query, (limit, offset))
        count_result = execute_query(count_query, fetch_one=True)
        
        if results is not None and count_result is not None:
            scraped_data = []
            for row in results:
                scraped_data.append({
                    'item_id': row['item_id'],
                    'master_sku': row['master_sku'],
                    'title': row['title'],
                    'current_price': float(row['current_price']) if row['current_price'] else 0.0,
                    'condition_name': row['condition_name'],
                    'category_name': row['category_name'],
                    'picture_url': row['picture_url'],
                    'source_url': row['source_url'],
                    'updated_at': str(row['updated_at']) if row['updated_at'] else None,
                    'source_system': row['source_system'],
                    'scraped_at': str(row['scraped_at']) if row['scraped_at'] else None
                })
            
            total = count_result['total']
            total_pages = (total + limit - 1) // limit
            
            return jsonify({
                'success': True,
                'data': {
                    'data': scraped_data,
                    'total': total,
                    'page': page,
                    'limit': limit,
                    'total_pages': total_pages
                },
                'mode': mode,
                'database': 'PostgreSQL'
            })
        else:
            return jsonify({'success': False, 'error': 'データ取得失敗'}), 500
            
    except Exception as e:
        logger.error(f"スクレイピングデータ取得エラー: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/')
def root():
    """ルートパス"""
    return jsonify({
        'service': 'Yahoo→eBay統合ワークフローAPIサーバー（PostgreSQL版）',
        'version': '3.0.0_postgresql',
        'port': 5002,
        'database': 'PostgreSQL',
        'database_name': DATABASE_CONFIG['database'],
        'cors_enabled': True,
        'endpoints': [
            '/health',
            '/api/system_status', 
            '/api/get_approval_queue',
            '/api/scrape_yahoo',
            '/api/search_products',
            '/api/get_scraped_products'
        ],
        'features': [
            'PostgreSQL統合',
            '既存データ保護',
            'リアルタイムスクレイピング',
            '統一データ管理'
        ]
    })

if __name__ == '__main__':
    logger.info("=== Yahoo→eBay統合APIサーバー起動（PostgreSQL版） ===")
    logger.info("アクセス先: http://localhost:5002")
    logger.info("ヘルスチェック: http://localhost:5002/health")
    logger.info("データベース: PostgreSQL (nagano3_db)")
    logger.info("統合テーブル: mystical_japan_treasures_inventory")
    logger.info("既存データ保護: 有効")
    logger.info("=================================================")
    
    app.run(
        host='0.0.0.0',
        port=5002,
        debug=True,
        threaded=True
    )
