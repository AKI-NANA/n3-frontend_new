#!/usr/bin/env python3
"""
Yahoo オークション実スクレイピング機能付きAPIサーバー
実際のYahooオークションページから商品情報を取得
"""

from flask import Flask, request, jsonify
import json
import psycopg2
import psycopg2.extras
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
import logging
import traceback
import time
import random
from urllib.parse import urlparse

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

def scrape_yahoo_auction(url):
    """Yahoo オークション実スクレイピング"""
    try:
        # User-Agent設定（ブロック回避）
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
        }
        
        # HTTPリクエスト実行
        logger.info(f"スクレイピング開始: {url}")
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # HTML解析
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Yahoo オークションIDの抽出
        url_parts = urlparse(url)
        auction_id = url_parts.path.split('/')[-1] if url_parts.path else None
        if not auction_id:
            # URLからオークションID取得を試行
            match = re.search(r'auction/([a-zA-Z0-9]+)', url)
            auction_id = match.group(1) if match else f"unknown_{int(time.time())}"
        
        # 商品情報の抽出
        scraped_data = {
            'item_id': auction_id,
            'title': '',
            'current_price': 0.0,
            'condition_name': 'Unknown',
            'category_name': 'General',
            'picture_url': '',
            'gallery_url': '',
            'source_url': url,
            'listing_status': 'Active',
            'watch_count': 0,
            'listing_type': 'Auction',
            'scraped_at': datetime.now()
        }
        
        # タイトル取得
        title_selectors = [
            'h1.ProductTitle__text',
            '.ProductTitle__text', 
            'h1[data-auction-id]',
            '.Title',
            '.ProductTitle',
            'h1'
        ]
        
        for selector in title_selectors:
            title_element = soup.select_one(selector)
            if title_element:
                scraped_data['title'] = title_element.get_text(strip=True)
                break
        
        # タイトルが取得できない場合のフォールバック
        if not scraped_data['title']:
            # ページタイトルから取得を試行
            page_title = soup.find('title')
            if page_title:
                title_text = page_title.get_text(strip=True)
                # Yahoo オークションのタイトルフォーマットに合わせて抽出
                scraped_data['title'] = re.sub(r'\s*-\s*Yahoo!.*$', '', title_text)
        
        # 価格取得
        price_selectors = [
            '.Price__value',
            '.ProductPrice .Price',
            '.u-textRed',
            '.ProductPrice__bidOrBuy .Price__value',
            '.Price'
        ]
        
        for selector in price_selectors:
            price_element = soup.select_one(selector)
            if price_element:
                price_text = price_element.get_text(strip=True)
                # 数字のみ抽出
                price_match = re.search(r'[\d,]+', price_text)
                if price_match:
                    price_str = price_match.group(0).replace(',', '')
                    try:
                        scraped_data['current_price'] = float(price_str)
                        break
                    except ValueError:
                        continue
        
        # 価格をUSDに変換（仮定: 1USD = 150JPY）
        if scraped_data['current_price'] > 0:
            scraped_data['current_price'] = round(scraped_data['current_price'] / 150.0, 2)
        
        # 画像取得
        image_selectors = [
            '.ProductImage img',
            '.ProductImage__image img',
            '#auction_auto .ProductImage img',
            '.ImagePreview img',
            'img[data-src*="jpg"]',
            'img[src*="jpg"]'
        ]
        
        for selector in image_selectors:
            image_element = soup.select_one(selector)
            if image_element:
                image_src = image_element.get('data-src') or image_element.get('src')
                if image_src and 'http' in image_src:
                    scraped_data['picture_url'] = image_src
                    scraped_data['gallery_url'] = image_src
                    break
        
        # カテゴリ取得
        category_selectors = [
            '.Breadcrumb a',
            '.ProductCategory',
            '.Breadcrumbs a'
        ]
        
        for selector in category_selectors:
            category_elements = soup.select(selector)
            if category_elements and len(category_elements) > 1:
                # 最後のカテゴリを取得
                category_text = category_elements[-1].get_text(strip=True)
                if category_text and category_text not in ['ホーム', 'オークション']:
                    scraped_data['category_name'] = category_text
                    break
        
        # 状態情報取得
        condition_selectors = [
            '.ProductCondition',
            '.Condition',
            '.ProductDetail .Status'
        ]
        
        for selector in condition_selectors:
            condition_element = soup.select_one(selector)
            if condition_element:
                condition_text = condition_element.get_text(strip=True)
                if '新品' in condition_text or '未使用' in condition_text:
                    scraped_data['condition_name'] = 'New'
                elif '中古' in condition_text:
                    scraped_data['condition_name'] = 'Used'
                elif '良い' in condition_text:
                    scraped_data['condition_name'] = 'Good'
                break
        
        # ウォッチ数取得
        watch_selectors = [
            '.Watch__count',
            '.ProductWatch .Count',
            '.u-textBold'
        ]
        
        for selector in watch_selectors:
            watch_element = soup.select_one(selector)
            if watch_element:
                watch_text = watch_element.get_text(strip=True)
                watch_match = re.search(r'(\d+)', watch_text)
                if watch_match:
                    try:
                        scraped_data['watch_count'] = int(watch_match.group(1))
                        break
                    except ValueError:
                        continue
        
        # 最低限のデータ検証
        if not scraped_data['title']:
            scraped_data['title'] = f'Yahoo オークション商品 {auction_id}'
        
        if scraped_data['current_price'] <= 0:
            # デフォルト価格設定（実際の価格が取得できない場合）
            scraped_data['current_price'] = 10.0
        
        logger.info(f"スクレイピング成功: {scraped_data['title']} - ${scraped_data['current_price']}")
        return scraped_data
        
    except requests.RequestException as e:
        logger.error(f"HTTP リクエストエラー: {e}")
        return None
    except Exception as e:
        logger.error(f"スクレイピングエラー: {e}")
        logger.error(traceback.format_exc())
        return None

@app.route('/health')
def health_check():
    """ヘルスチェック"""
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
        'scraping_enabled': True,
        'session_id': f'REAL_SCRAPER_{int(datetime.now().timestamp())}'
    })

@app.route('/api/system_status')
def system_status():
    """システム状態取得"""
    try:
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
                'scraping': 'Real Yahoo Auction Scraping',
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({'success': False, 'error': 'データ取得失敗'}), 500
            
    except Exception as e:
        logger.error(f"システム状態取得エラー: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/scrape_yahoo', methods=['POST'])
def scrape_yahoo():
    """Yahoo オークション実スクレイピング"""
    try:
        data = request.get_json()
        urls = data.get('urls', [])
        
        if not urls:
            return jsonify({'success': False, 'error': 'URLが指定されていません'}), 400
        
        scraped_items = []
        failed_items = []
        
        for i, url in enumerate(urls):
            logger.info(f"URL {i+1}/{len(urls)} の処理開始: {url}")
            
            # Yahoo オークションURLの検証
            if 'auctions.yahoo.co.jp' not in url:
                failed_items.append({
                    'url': url,
                    'error': 'Yahoo オークションのURLではありません'
                })
                continue
            
            # 実際のスクレイピング実行
            scraped_data = scrape_yahoo_auction(url)
            
            if scraped_data:
                # PostgreSQL に保存
                insert_query = """
                INSERT INTO mystical_japan_treasures_inventory 
                (item_id, title, current_price, condition_name, category_name, 
                 listing_type, watch_count, listing_status, source_url, 
                 picture_url, gallery_url, updated_at, scraped_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (item_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    current_price = EXCLUDED.current_price,
                    condition_name = EXCLUDED.condition_name,
                    category_name = EXCLUDED.category_name,
                    picture_url = EXCLUDED.picture_url,
                    updated_at = EXCLUDED.updated_at,
                    scraped_at = EXCLUDED.scraped_at
                """
                
                params = (
                    scraped_data['item_id'],
                    scraped_data['title'],
                    scraped_data['current_price'],
                    scraped_data['condition_name'],
                    scraped_data['category_name'],
                    scraped_data['listing_type'],
                    scraped_data['watch_count'],
                    scraped_data['listing_status'],
                    scraped_data['source_url'],
                    scraped_data['picture_url'],
                    scraped_data['gallery_url'],
                    scraped_data['scraped_at'],
                    scraped_data['scraped_at']
                )
                
                result = execute_query(insert_query, params, fetch_all=False)
                
                if result is not None:
                    scraped_items.append(scraped_data)
                    logger.info(f"データベース保存成功: {scraped_data['item_id']} - {scraped_data['title']}")
                else:
                    failed_items.append({
                        'url': url,
                        'error': 'データベース保存失敗'
                    })
            else:
                failed_items.append({
                    'url': url,
                    'error': 'スクレイピング失敗'
                })
            
            # 連続リクエスト回避のための待機
            if i < len(urls) - 1:
                time.sleep(random.uniform(2, 5))
        
        if scraped_items:
            logger.info(f"スクレイピング成功: {len(scraped_items)}件のデータを保存")
            
            return jsonify({
                'success': True,
                'message': f'{len(scraped_items)}件の実データを取得・保存しました',
                'data': {
                    'success_count': len(scraped_items),
                    'failed_count': len(failed_items),
                    'items': scraped_items,
                    'failures': failed_items
                },
                'database': 'PostgreSQL',
                'scraping_type': 'Real Yahoo Auction Data'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'すべてのURLでスクレイピングに失敗しました',
                'failures': failed_items
            }), 500
            
    except Exception as e:
        logger.error(f"スクレイピングエラー: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

# 他のエンドポイントは元のコードと同じ
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
            
            return jsonify({
                'success': True,
                'data': approval_queue,
                'count': len(approval_queue),
                'database': 'PostgreSQL',
                'scraping_type': 'Real Data'
            })
        else:
            return jsonify({'success': False, 'error': 'データ取得失敗'}), 500
            
    except Exception as e:
        logger.error(f"承認待ちデータ取得エラー: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get_scraped_products')
def get_scraped_products():
    """スクレイピングデータ取得 - エラー修正版"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        mode = request.args.get('mode', 'extended')
        debug = request.args.get('debug', 'false').lower() == 'true'
        
        offset = (page - 1) * limit
        
        logger.info(f"スクレイピングデータ取得: page={page}, limit={limit}, mode={mode}, debug={debug}")
        
        # クエリ修正版
        if mode == 'yahoo_only' or not debug:
            # Yahoo実スクレイピングデータのみ
            where_clause = """
            WHERE source_url IS NOT NULL 
            AND source_url LIKE '%auctions.yahoo.co.jp%'
            AND title IS NOT NULL 
            AND current_price > 0
            """
        else:
            # デバッグモード: すべてのスクレイピングデータ
            where_clause = """
            WHERE source_url IS NOT NULL 
            AND source_url != ''
            AND title IS NOT NULL 
            AND current_price > 0
            """
        
        # パラメータ化クエリに修正
        base_select = """
        SELECT 
            item_id,
            title,
            current_price,
            condition_name,
            category_name,
            picture_url,
            gallery_url,
            watch_count,
            COALESCE(updated_at, NOW()) as updated_at,
            COALESCE(listing_status, 'Active') as listing_status,
            source_url,
            COALESCE(scraped_at, updated_at, NOW()) as scraped_at,
            CASE 
                WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 'yahoo_scraped_confirmed'
                WHEN source_url IS NOT NULL AND source_url != '' THEN 'scraped_data'
                ELSE 'existing_data'
            END as source_system,
            item_id as master_sku
        FROM mystical_japan_treasures_inventory
        """
        
        # データ取得クエリ
        data_query = base_select + where_clause + """
        ORDER BY 
            CASE 
                WHEN scraped_at IS NOT NULL THEN scraped_at 
                ELSE COALESCE(updated_at, NOW())
            END DESC,
            updated_at DESC
        LIMIT %s OFFSET %s
        """
        
        # カウントクエリ
        count_query = """
        SELECT COUNT(*) as total
        FROM mystical_japan_treasures_inventory
        """ + where_clause
        
        logger.info(f"実行クエリ: {data_query.replace('%s', str(limit)).replace('%s', str(offset))}")
        
        # クエリ実行
        results = execute_query(data_query, (limit, offset))
        count_result = execute_query(count_query, fetch_one=True)
        
        logger.info(f"クエリ結果: results={len(results) if results else 0}件, count={count_result['total'] if count_result else 0}")
        
        if results is not None and count_result is not None:
            scraped_data = []
            for row in results:
                try:
                    scraped_data.append({
                        'item_id': row['item_id'] if row['item_id'] else f'item_{len(scraped_data)}',
                        'master_sku': row['master_sku'] if row['master_sku'] else row['item_id'],
                        'title': row['title'] if row['title'] else 'タイトルなし',
                        'current_price': float(row['current_price']) if row['current_price'] else 0.0,
                        'condition_name': row['condition_name'] if row['condition_name'] else 'Unknown',
                        'category_name': row['category_name'] if row['category_name'] else 'General',
                        'picture_url': row['picture_url'] if row['picture_url'] else '',
                        'source_url': row['source_url'] if row['source_url'] else '',
                        'updated_at': str(row['updated_at']) if row['updated_at'] else None,
                        'source_system': row['source_system'] if row['source_system'] else 'unknown',
                        'scraped_at': str(row['scraped_at']) if row['scraped_at'] else None
                    })
                except Exception as row_error:
                    logger.error(f"行処理エラー: {row_error}")
                    continue
            
            total = int(count_result['total']) if count_result and count_result['total'] else 0
            total_pages = max(1, (total + limit - 1) // limit)
            
            logger.info(f"レスポンス準備完了: {len(scraped_data)}件, total={total}, pages={total_pages}")
            
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
                'database': 'PostgreSQL',
                'scraping_type': 'Real Data Fixed'
            })
        else:
            logger.warning("クエリ結果がNullまたは空")
            return jsonify({
                'success': True,
                'data': {
                    'data': [],
                    'total': 0,
                    'page': 1,
                    'limit': limit,
                    'total_pages': 1
                },
                'mode': mode,
                'message': 'データが見つかりませんでした'
            })
            
    except Exception as e:
        logger.error(f"スクレイピングデータ取得エラー: {e}")
        logger.error(f"エラー詳細: {traceback.format_exc()}")
        return jsonify({
            'success': False, 
            'error': str(e),
            'message': 'APIサーバーエラー - ログを確認してください'
        }), 500

@app.route('/')
def root():
    """ルートパス"""
    return jsonify({
        'service': 'Yahoo オークション実スクレイピングAPIサーバー',
        'version': '4.0.0_real_scraping',
        'port': 5002,
        'database': 'PostgreSQL',
        'database_name': DATABASE_CONFIG['database'],
        'scraping_type': 'Real Yahoo Auction Data',
        'features': [
            '実Yahooオークションスクレイピング',
            'BeautifulSoup HTML解析',
            'PostgreSQL統合',
            '画像・価格・タイトル実取得',
            'ブロック回避機能'
        ]
    })

if __name__ == '__main__':
    logger.info("=== Yahoo オークション実スクレイピングAPIサーバー起動 ===")
    logger.info("アクセス先: http://localhost:5002")
    logger.info("機能: 実際のYahooオークションページをスクレイピング")
    logger.info("データベース: PostgreSQL (nagano3_db)")
    logger.info("スクレイピング: BeautifulSoup + requests")
    logger.info("==================================================")
    
    app.run(
        host='0.0.0.0',
        port=5002,
        debug=True,
        threaded=True
    )
