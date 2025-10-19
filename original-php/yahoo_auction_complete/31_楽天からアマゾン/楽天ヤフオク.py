# main_arbitrage_system.py
"""
楽天・ヤフオク → Amazon転売 完全自動化システム
- 分散スクレイピング
- ロボット判定回避
- 利益計算・分析
- 自動レポート生成
"""

import asyncio
import aiohttp
import json
import time
import random
import re
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import logging
from urllib.parse import urljoin, urlparse, parse_qs
import sqlite3
from contextlib import contextmanager
import schedule
import threading
from bs4 import BeautifulSoup
from difflib import SequenceMatcher
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from fake_useragent import UserAgent
import itertools

# ===============================
# 1. データモデル定義
# ===============================

class ProductStatus(Enum):
    PENDING = "pending"
    ANALYZED = "analyzed"
    PROFITABLE = "profitable"
    LISTED = "listed"
    ACTIVE = "active"
    INACTIVE = "inactive"
    SOLD = "sold"
    ERROR = "error"

class ProductCondition(Enum):
    NEW = "new"
    USED_LIKE_NEW = "used_like_new"
    USED_VERY_GOOD = "used_very_good"
    USED_GOOD = "used_good"
    USED_ACCEPTABLE = "used_acceptable"
    UNKNOWN = "unknown"

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class SourceProduct:
    id: Optional[int]
    source_type: str  # 'rakuten' or 'yahoo_auction'
    product_url: str
    jan_code: Optional[str]
    title: str
    price: float
    condition: ProductCondition
    brand: Optional[str]
    category: Optional[str]
    description: str
    image_urls: List[str]
    seller_name: str
    seller_rating: float
    is_store: bool
    review_count: int
    rating: float
    end_time: Optional[datetime]  # ヤフオク用
    bid_count: Optional[int]     # ヤフオク用
    instant_buy_price: Optional[float]  # ヤフオク用
    shipping_cost: float
    scraped_at: datetime
    status: ProductStatus = ProductStatus.PENDING

@dataclass
class AmazonProduct:
    asin: str
    title: str
    category: str
    current_price: float
    competitors: List[Dict]
    sales_rank: Optional[int]
    review_count: int
    rating: float
    dimensions: Dict
    weight: float
    brand: Optional[str]
    model: Optional[str]

@dataclass
class ProductMatch:
    source_product_id: int
    amazon_asin: str
    confidence: float
    match_method: str
    verified: bool = False

@dataclass
class ProfitAnalysis:
    source_cost: float
    amazon_revenue: float
    shipping_cost: float
    amazon_fees: float
    fba_fees: float
    other_costs: float
    total_cost: float
    profit: float
    profit_margin: float
    roi: float
    is_profitable: bool
    recommended_price: float
    priority_score: float

@dataclass
class SystemAlert:
    alert_type: str
    severity: AlertSeverity
    title: str
    message: str
    related_url: Optional[str]
    created_at: datetime

# ===============================
# 2. データベース管理
# ===============================

class DatabaseManager:
    def __init__(self, db_path: str = "arbitrage_system.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """データベース初期化"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # ソース商品テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS source_products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_type TEXT NOT NULL,
                    product_url TEXT UNIQUE NOT NULL,
                    jan_code TEXT,
                    title TEXT NOT NULL,
                    price REAL NOT NULL,
                    condition TEXT,
                    brand TEXT,
                    category TEXT,
                    description TEXT,
                    image_urls TEXT,
                    seller_name TEXT,
                    seller_rating REAL DEFAULT 0,
                    is_store BOOLEAN DEFAULT FALSE,
                    review_count INTEGER DEFAULT 0,
                    rating REAL DEFAULT 0,
                    end_time TIMESTAMP,
                    bid_count INTEGER,
                    instant_buy_price REAL,
                    shipping_cost REAL DEFAULT 0,
                    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'pending'
                )
            """)
            
            # Amazon商品情報テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS amazon_products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    asin TEXT UNIQUE NOT NULL,
                    title TEXT,
                    category TEXT,
                    current_price REAL,
                    competitors TEXT,
                    sales_rank INTEGER,
                    review_count INTEGER,
                    rating REAL,
                    dimensions TEXT,
                    weight REAL,
                    brand TEXT,
                    model TEXT,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 商品マッチングテーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS product_matches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_product_id INTEGER,
                    amazon_asin TEXT,
                    confidence REAL,
                    match_method TEXT,
                    verified BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (source_product_id) REFERENCES source_products(id)
                )
            """)
            
            # 利益分析テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS profit_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_product_id INTEGER,
                    amazon_asin TEXT,
                    source_cost REAL,
                    amazon_revenue REAL,
                    total_cost REAL,
                    profit REAL,
                    profit_margin REAL,
                    roi REAL,
                    is_profitable BOOLEAN,
                    recommended_price REAL,
                    priority_score REAL,
                    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (source_product_id) REFERENCES source_products(id)
                )
            """)
            
            # 収集履歴テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS collection_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    collection_date DATE,
                    source_type TEXT,
                    products_collected INTEGER,
                    products_analyzed INTEGER,
                    profitable_products INTEGER,
                    total_potential_profit REAL,
                    average_margin REAL,
                    collection_duration INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # アラートテーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_type TEXT,
                    severity TEXT,
                    title TEXT,
                    message TEXT,
                    related_url TEXT,
                    resolved BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP
                )
            """)
            
            # インデックス作成
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_source_jan ON source_products(jan_code)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_source_status ON source_products(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_amazon_asin ON amazon_products(asin)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_profit_profitable ON profit_analysis(is_profitable)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_collection_date ON collection_history(collection_date)")
            
            conn.commit()
    
    @contextmanager
    def get_connection(self):
        """データベース接続コンテキストマネージャ"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def save_source_product(self, product: SourceProduct) -> int:
        """ソース商品保存"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO source_products 
                (source_type, product_url, jan_code, title, price, condition, brand, 
                 category, description, image_urls, seller_name, seller_rating, is_store,
                 review_count, rating, end_time, bid_count, instant_buy_price, 
                 shipping_cost, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                product.source_type, product.product_url, product.jan_code, product.title,
                product.price, product.condition.value, product.brand, product.category,
                product.description, json.dumps(product.image_urls), product.seller_name,
                product.seller_rating, product.is_store, product.review_count, product.rating,
                product.end_time.isoformat() if product.end_time else None,
                product.bid_count, product.instant_buy_price, product.shipping_cost,
                product.status.value
            ))
            conn.commit()
            return cursor.lastrowid
    
    def save_amazon_product(self, amazon_product: AmazonProduct) -> int:
        """Amazon商品保存"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO amazon_products 
                (asin, title, category, current_price, competitors, sales_rank,
                 review_count, rating, dimensions, weight, brand, model)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                amazon_product.asin, amazon_product.title, amazon_product.category,
                amazon_product.current_price, json.dumps(amazon_product.competitors),
                amazon_product.sales_rank, amazon_product.review_count, amazon_product.rating,
                json.dumps(amazon_product.dimensions), amazon_product.weight,
                amazon_product.brand, amazon_product.model
            ))
            conn.commit()
            return cursor.lastrowid
    
    def save_profit_analysis(self, analysis: ProfitAnalysis, source_product_id: int, amazon_asin: str) -> int:
        """利益分析保存"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO profit_analysis 
                (source_product_id, amazon_asin, source_cost, amazon_revenue, total_cost,
                 profit, profit_margin, roi, is_profitable, recommended_price, priority_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                source_product_id, amazon_asin, analysis.source_cost, analysis.amazon_revenue,
                analysis.total_cost, analysis.profit, analysis.profit_margin, analysis.roi,
                analysis.is_profitable, analysis.recommended_price, analysis.priority_score
            ))
            conn.commit()
            return cursor.lastrowid
    
    def get_pending_products(self, limit: int = 100) -> List[SourceProduct]:
        """処理待ち商品取得"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM source_products 
                WHERE status = 'pending' 
                ORDER BY scraped_at DESC 
                LIMIT ?
            """, (limit,))
            
            products = []
            for row in cursor.fetchall():
                products.append(self._row_to_source_product(row))
            return products
    
    def get_profitable_products(self, limit: int = 50) -> List[Dict]:
        """利益商品取得"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT sp.*, pa.*, ap.title as amazon_title, ap.current_price as amazon_current_price
                FROM source_products sp
                JOIN profit_analysis pa ON sp.id = pa.source_product_id
                JOIN amazon_products ap ON pa.amazon_asin = ap.asin
                WHERE pa.is_profitable = 1
                ORDER BY pa.priority_score DESC, pa.profit DESC
                LIMIT ?
            """, (limit,))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def save_collection_summary(self, date: str, source_type: str, summary: Dict):
        """収集サマリ保存"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO collection_history 
                (collection_date, source_type, products_collected, products_analyzed,
                 profitable_products, total_potential_profit, average_margin, collection_duration)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                date, source_type, summary['products_collected'], summary['products_analyzed'],
                summary['profitable_products'], summary['total_potential_profit'],
                summary['average_margin'], summary['collection_duration']
            ))
            conn.commit()
    
    def _row_to_source_product(self, row) -> SourceProduct:
        """DBロウをSourceProductに変換"""
        return SourceProduct(
            id=row['id'],
            source_type=row['source_type'],
            product_url=row['product_url'],
            jan_code=row['jan_code'],
            title=row['title'],
            price=row['price'],
            condition=ProductCondition(row['condition']),
            brand=row['brand'],
            category=row['category'],
            description=row['description'],
            image_urls=json.loads(row['image_urls']) if row['image_urls'] else [],
            seller_name=row['seller_name'],
            seller_rating=row['seller_rating'],
            is_store=row['is_store'],
            review_count=row['review_count'],
            rating=row['rating'],
            end_time=datetime.fromisoformat(row['end_time']) if row['end_time'] else None,
            bid_count=row['bid_count'],
            instant_buy_price=row['instant_buy_price'],
            shipping_cost=row['shipping_cost'],
            scraped_at=datetime.fromisoformat(row['scraped_at']),
            status=ProductStatus(row['status'])
        )

# ===============================
# 3. 分散スクレイピングシステム
# ===============================

class AntiDetectionScraper:
    def __init__(self):
        self.ua = UserAgent()
        self.session_pool = []
        self.current_session_index = 0
        self.request_history = {}
        
        # 複数のUser-Agentパターン
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        
        # 時間帯別アクセス戦略
        self.time_based_delays = {
            'morning': (8, 12, 15, 25),    # 8-12時: 15-25秒間隔
            'afternoon': (12, 18, 10, 20), # 12-18時: 10-20秒間隔
            'evening': (18, 22, 8, 15),    # 18-22時: 8-15秒間隔
            'night': (22, 8, 20, 35)       # 22-8時: 20-35秒間隔
        }
        
        # サイト別設定
        self.site_configs = {
            'rakuten': {
                'base_delays': (12, 28),
                'max_requests_per_session': 15,
                'session_cooldown': 2100,  # 35分
                'retry_attempts': 3,
                'daily_limit': 200
            },
            'yahoo_auction': {
                'base_delays': (18, 35),
                'max_requests_per_session': 12,
                'session_cooldown': 2700,  # 45分
                'retry_attempts': 2,
                'daily_limit': 150
            }
        }
        
        self.logger = self._setup_logger()

    def _setup_logger(self):
        """ロガー設定"""
        logger = logging.getLogger('AntiDetectionScraper')
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.FileHandler('scraping.log', encoding='utf-8')
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger

    async def init_session_pool(self, pool_size: int = 4):
        """セッションプール初期化"""
        for i in range(pool_size):
            session = await self._create_stealth_session(i)
            self.session_pool.append({
                'session': session,
                'last_used': datetime.now() - timedelta(hours=1),
                'request_count': 0,
                'user_agent': random.choice(self.user_agents),
                'session_id': f"session_{i}",
                'created_at': datetime.now()
            })
        
        self.logger.info(f"セッションプール初期化完了: {pool_size}セッション")

    async def _create_stealth_session(self, session_id: int) -> aiohttp.ClientSession:
        """ステルスセッション作成"""
        connector = aiohttp.TCPConnector(
            limit=1,
            limit_per_host=1,
            ttl_dns_cache=300,
            use_dns_cache=True,
            keepalive_timeout=30,
            enable_cleanup_closed=True,
            force_close=True
        )
        
        # リアルなブラウザヘッダー設定
        headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'max-age=0',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'Connection': 'keep-alive',
            'DNT': '1'
        }
        
        timeout = aiohttp.ClientTimeout(total=60, connect=20)
        
        return aiohttp.ClientSession(
            headers=headers,
            connector=connector,
            timeout=timeout,
            cookie_jar=aiohttp.CookieJar()
        )

    def _get_optimal_session(self, site: str) -> Dict:
        """最適なセッション選択"""
        config = self.site_configs[site]
        available_sessions = []
        
        now = datetime.now()
        
        for session_data in self.session_pool:
            # セッションクールダウンチェック
            time_since_last_use = (now - session_data['last_used']).total_seconds()
            
            # リクエスト数制限チェック
            if (session_data['request_count'] < config['max_requests_per_session'] and
                time_since_last_use > 90):  # 最低90秒間隔
                available_sessions.append(session_data)
        
        if not available_sessions:
            # 全セッションが制限に達している場合、最も古いものを選択
            oldest_session = min(self.session_pool, key=lambda x: x['last_used'])
            # リセット
            oldest_session['request_count'] = 0
            oldest_session['user_agent'] = random.choice(self.user_agents)
            return oldest_session
        
        # ランダムに選択
        return random.choice(available_sessions)

    def _calculate_dynamic_delay(self, site: str) -> float:
        """動的遅延計算"""
        current_hour = datetime.now().hour
        base_min, base_max = self.site_configs[site]['base_delays']
        
        # 時間帯による調整
        for time_period, (start, end, min_delay, max_delay) in self.time_based_delays.items():
            if start <= current_hour < end or (start > end and (current_hour >= start or current_hour < end)):
                # 時間帯の遅延を基本遅延に加算
                total_min = base_min + min_delay
                total_max = base_max + max_delay
                break
        else:
            total_min, total_max = base_min, base_max
        
        # ランダムジッター追加
        base_delay = random.uniform(total_min, total_max)
        jitter = random.uniform(-0.2, 0.4) * base_delay
        
        # 最終調整
        final_delay = max(8.0, base_delay + jitter)
        
        # 重複アクセス回避（同一サイトの前回アクセスから最低間隔確保）
        last_access = self.request_history.get(site, datetime.now() - timedelta(minutes=1))
        min_interval = 15  # 同一サイトへの最低15秒間隔
        time_since_last = (datetime.now() - last_access).total_seconds()
        
        if time_since_last < min_interval:
            additional_wait = min_interval - time_since_last + random.uniform(2, 8)
            final_delay += additional_wait
        
        return final_delay

    async def safe_request(self, url: str, site: str, retries: int = None) -> Optional[str]:
        """安全なリクエスト実行"""
        if retries is None:
            retries = self.site_configs[site]['retry_attempts']
        
        # 日次制限チェック
        if not self._check_daily_limit(site):
            self.logger.warning(f"日次制限に到達: {site}")
            return None
        
        for attempt in range(retries + 1):
            try:
                # セッション選択
                session_data = self._get_optimal_session(site)
                session = session_data['session']
                
                # ヘッダー更新
                session.headers.update({
                    'User-Agent': session_data['user_agent'],
                    'Referer': self._get_realistic_referer(url, site)
                })
                
                # 動的遅延
                if session_data['request_count'] > 0 or site in self.request_history:
                    delay = self._calculate_dynamic_delay(site)
                    self.logger.info(f"遅延実行: {delay:.1f}秒 - {url}")
                    await asyncio.sleep(delay)
                
                # リクエスト実行
                self.logger.info(f"リクエスト開始: {url}")
                
                async with session.get(url) as response:
                    # セッション使用状況更新
                    session_data['last_used'] = datetime.now()
                    session_data['request_count'] += 1
                    self.request_history[site] = datetime.now()
                    
                    if response.status == 200:
                        content = await response.text()
                        
                        # ロボット検出チェック
                        if self._is_blocked_response(content):
                            self.logger.warning(f"ロボット検出された可能性: {url}")
                            if attempt < retries:
                                # 長時間待機後に再試行
                                wait_time = random.uniform(300, 600)  # 5-10分待機
                                self.logger.info(f"ブロック回避待機: {wait_time:.1f}秒")
                                await asyncio.sleep(wait_time)
                                # セッション更新
                                session_data['user_agent'] = random.choice(self.user_agents)
                                continue
                            return None
                        
                        self.logger.info(f"リクエスト成功: {url}")
                        return content
                    
                    elif response.status == 429:  # Too Many Requests
                        wait_time = random.uniform(600, 1200)  # 10-20分待機
                        self.logger.warning(f"レート制限検出。{wait_time:.1f}秒待機...")
                        await asyncio.sleep(wait_time)
                        continue
                    
                    elif response.status in [403, 406, 451]:  # Forbidden/Not Acceptable/Unavailable For Legal Reasons
                        self.logger.warning(f"アクセス拒否 ({response.status}): {url}")
                        if attempt < retries:
                            # User-Agent変更して長時間待機
                            session_data['user_agent'] = random.choice(self.user_agents)
                            wait_time = random.uniform(300, 600)
                            await asyncio.sleep(wait_time)
                            continue
                        return None
                    
                    elif response.status == 404:
                        self.logger.info(f"ページが見つかりません: {url}")
                        return None
                    
                    else:
                        self.logger.warning(f"HTTPエラー {response.status}: {url}")
                        if attempt < retries:
                            await asyncio.sleep(random.uniform(60, 120))
                            continue
                        return None
            
            except asyncio.TimeoutError:
                self.logger.warning(f"タイムアウト (試行{attempt + 1}): {url}")
                if attempt < retries:
                    await asyncio.sleep(random.uniform(60, 120))
                    continue
                return None
            
            except Exception as e:
                self.logger.error(f"リクエストエラー (試行{attempt + 1}): {str(e)} - {url}")
                if attempt < retries:
                    await asyncio.sleep(random.uniform(30, 90))
                    continue
                return None
        
        return None

    def _check_daily_limit(self, site: str) -> bool:
        """日次制限チェック"""
        today = datetime.now().date()
        key = f"{site}_{today}"
        
        if not hasattr(self, '_daily_counts'):
            self._daily_counts = {}
        
        current_count = self._daily_counts.get(key, 0)
        limit = self.site_configs[site]['daily_limit']
        
        if current_count >= limit:
            return False
        
        self._daily_counts[key] = current_count + 1
        return True

    def _get_realistic_referer(self, url: str, site: str) -> str:
        """リアルなReferer生成"""
        if site == 'rakuten':
            if 'search' in url:
                return 'https://search.rakuten.co.jp/'
            elif 'ranking' in url:
                return 'https://ranking.rakuten.co.jp/'
            elif 'item' in url:
                return 'https://search.rakuten.co.jp/search/mall/'
            else:
                return 'https://www.rakuten.co.jp/'
        
        elif site == 'yahoo_auction':
            if 'search' in url:
                return 'https://auctions.yahoo.co.jp/search/'
            elif 'category' in url:
                return 'https://auctions.yahoo.co.jp/category/'
            else:
                return 'https://auctions.yahoo.co.jp/'
        
        return url

    def _is_blocked_response(self, content: str) -> bool:
        """ブロック検出"""
        block_indicators = [
            'ロボットによるアクセス',
            'アクセスが制限',
            'bot detected',
            'robot detected',
            'captcha',
            'verification required',
            '不正なアクセス',
            'access denied',
            'forbidden',
            'セキュリティ',
            '認証が必要',
            'security check',
            'please verify',
            'suspicious activity',
            '一時的に制限',
            'temporarily restricted'
        ]
        
        content_lower = content.lower()
        return any(indicator.lower() in content_lower for indicator in block_indicators)

    async def close_all_sessions(self):
        """全セッションクローズ"""
        for session_data in self.session_pool:
            try:
                await session_data['session'].close()
            except Exception as e:
                self.logger.error(f"セッションクローズエラー: {str(e)}")
        
        self.session_pool.clear()
        self.logger.info("全セッションクローズ完了")

# ===============================
# 4. 楽天スクレイパー
# ===============================

class RakutenScraper:
    def __init__(self, scraper: AntiDetectionScraper):
        self.scraper = scraper
        self.logger = logging.getLogger('RakutenScraper')

    async def search_ranking_products(self, category_ids: List[str], max_pages: int = 3) -> List[Dict]:
        """楽天ランキング商品検索"""
        all_products = []
        
        for category_id in category_ids:
            self.logger.info(f"楽天カテゴリ検索開始: {category_id}")
            
            for page in range(1, max_pages + 1):
                try:
                    url = f"https://ranking.rakuten.co.jp/category/{category_id}/?page={page}"
                    html = await self.scraper.safe_request(url, 'rakuten')
                    
                    if html:
                        products = self.parse_ranking_page(html)
                        all_products.extend(products)
                        self.logger.info(f"カテゴリ{category_id} ページ{page}: {len(products)}商品取得")
                    else:
                        self.logger.warning(f"ページ取得失敗: {url}")
                        break
                
                except Exception as e:
                    self.logger.error(f"ランキング検索エラー: {str(e)}")
                    break
        
        return all_products

    def parse_ranking_page(self, html: str) -> List[Dict]:
        """ランキングページ解析"""
        soup = BeautifulSoup(html, 'html.parser')
        products = []
        
        # 商品要素を探す
        product_selectors = [
            'div[class*="dui-card"]',
            'div[class*="item"]',
            'div[class*="product"]',
            'li[class*="ranking"]'
        ]
        
        product_elements = []
        for selector in product_selectors:
            elements = soup.select(selector)
            if elements:
                product_elements = elements
                break
        
        for i, element in enumerate(product_elements[:50]):  # 上位50件まで
            try:
                product_data = self.extract_product_summary(element, i + 1)
                if product_data and product_data.get('product_url'):
                    products.append(product_data)
            except Exception as e:
                self.logger.warning(f"商品データ抽出エラー: {str(e)}")
                continue
        
        return products

    def extract_product_summary(self, element, ranking_position: int) -> Optional[Dict]:
        """商品概要情報抽出"""
        try:
            # 商品URL
            link_elem = element.find('a', href=True)
            if not link_elem:
                return None
            
            product_url = link_elem['href']
            if not product_url.startswith('http'):
                if product_url.startswith('//'):
                    product_url = 'https:' + product_url
                elif product_url.startswith('/'):
                    product_url = 'https://item.rakuten.co.jp' + product_url
            
            # 商品名
            title_selectors = [
                'h3', 'h4', '.item-name', '.product-name', 
                '[class*="title"]', '[class*="name"]'
            ]
            
            title = "商品名不明"
            for selector in title_selectors:
                title_elem = element.select_one(selector)
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    break
            
            # 価格
            price_selectors = [
                '.price', '[class*="price"]', '.cost', '[class*="cost"]'
            ]
            
            price = 0
            for selector in price_selectors:
                price_elem = element.select_one(selector)
                if price_elem:
                    price = self.extract_price_from_text(price_elem.get_text())
                    if price > 0:
                        break
            
            # 画像URL
            img_elem = element.find('img', src=True)
            image_url = img_elem['src'] if img_elem else None
            if image_url and image_url.startswith('//'):
                image_url = 'https:' + image_url
            
            # ショップ名
            shop_selectors = [
                '.shop-name', '[class*="shop"]', '[class*="store"]'
            ]
            
            shop_name = ""
            for selector in shop_selectors:
                shop_elem = element.select_one(selector)
                if shop_elem:
                    shop_name = shop_elem.get_text(strip=True)
                    break
            
            return {
                'product_url': product_url,
                'title': title,
                'price': price,
                'ranking_position': ranking_position,
                'image_urls': [image_url] if image_url else [],
                'shop_name': shop_name,
                'review_count': 0,
                'rating': 0.0
            }
        
        except Exception as e:
            self.logger.warning(f"商品概要抽出エラー: {str(e)}")
            return None

    async def get_product_details(self, product_url: str) -> Optional[Dict]:
        """商品詳細情報取得"""
        html = await self.scraper.safe_request(product_url, 'rakuten')
        if not html:
            return None
        
        return self.parse_product_details(html, product_url)

    def parse_product_details(self, html: str, product_url: str) -> Dict:
        """商品詳細解析"""
        soup = BeautifulSoup(html, 'html.parser')
        
        details = {
            'jan_code': self.extract_jan_code(soup),
            'brand': self.extract_brand(soup),
            'category': self.extract_category(soup),
            'description': self.extract_description(soup),
            'review_count': self.extract_review_count(soup),
            'rating': self.extract_rating(soup),
            'image_urls': self.extract_image_urls(soup),
            'seller_info': self.extract_seller_info(soup),
            'specifications': self.extract_specifications(soup)
        }
        
        return details

    def extract_jan_code(self, soup: BeautifulSoup) -> Optional[str]:
        """JANコード抽出"""
        jan_patterns = [
            'JAN', 'jan', 'ＪＡＮ', '商品コード', 'バーコード', 'EAN', 'ISBN'
        ]
        
        # 仕様表から検索
        for table in soup.find_all('table'):
            for row in table.find_all('tr'):
                cells = row.find_all(['td', 'th'])
                for i, cell in enumerate(cells):
                    cell_text = cell.get_text()
                    if any(pattern in cell_text for pattern in jan_patterns):
                        if i + 1 < len(cells):
                            jan_text = cells[i + 1].get_text()
                            # チェックディジット付き13桁または10桁のコード
                            jan_match = re.search(r'\b(\d{13}|\d{10})\b', jan_text)
                            if jan_match:
                                code = jan_match.group(1)
                                if self.validate_jan_code(code):
                                    return code
        
        # 通常のテキストから検索
        for pattern in jan_patterns:
            elements = soup.find_all(text=re.compile(pattern, re.IGNORECASE))
            for element in elements:
                parent_text = element.parent.get_text() if element.parent else element
                jan_match = re.search(r'\b(\d{13}|\d{10})\b', parent_text)
                if jan_match:
                    code = jan_match.group(1)
                    if self.validate_jan_code(code):
                        return code
        
        return None

    def validate_jan_code(self, code: str) -> bool:
        """JANコードバリデーション"""
        if len(code) == 13:
            # JAN-13チェックディジット検証
            check_sum = 0
            for i in range(12):
                weight = 1 if i % 2 == 0 else 3
                check_sum += int(code[i]) * weight
            
            check_digit = (10 - (check_sum % 10)) % 10
            return check_digit == int(code[12])
        
        elif len(code) == 10:
            # ISBN-10チェックディジット検証
            check_sum = 0
            for i in range(9):
                check_sum += int(code[i]) * (10 - i)
            
            check_digit = (11 - (check_sum % 11)) % 11
            expected = code[9]
            
            if check_digit == 10:
                return expected.upper() == 'X'
            else:
                return check_digit == int(expected)
        
        return False

    def extract_brand(self, soup: BeautifulSoup) -> Optional[str]:
        """ブランド名抽出"""
        brand_selectors = [
            '[class*="brand"]', '[class*="maker"]', '[class*="manufacturer"]',
            '.brand', '.maker', '.manufacturer'
        ]
        
        for selector in brand_selectors:
            brand_elem = soup.select_one(selector)
            if brand_elem:
                brand_text = brand_elem.get_text(strip=True)
                if brand_text and len(brand_text) < 100:
                    return brand_text
        
        # メタデータから抽出
        meta_brand = soup.find('meta', {'property': 'product:brand'})
        if meta_brand and meta_brand.get('content'):
            return meta_brand['content']
        
        return None

    def extract_category(self, soup: BeautifulSoup) -> Optional[str]:
        """カテゴリ抽出"""
        # パンくずリストから抽出
        breadcrumb_selectors = [
            '.breadcrumb', '[class*="breadcrumb"]', '.path', '[class*="path"]'
        ]
        
        for selector in breadcrumb_selectors:
            breadcrumb_elem = soup.select_one(selector)
            if breadcrumb_elem:
                categories = [link.get_text(strip=True) for link in breadcrumb_elem.find_all('a')]
                if len(categories) > 1:
                    return categories[-2]  # 最後から2番目のカテゴリ
        
        return None

    def extract_description(self, soup: BeautifulSoup) -> Optional[str]:
        """商品説明抽出"""
        desc_selectors = [
            '.item-desc', '.product-desc', '[class*="description"]',
            '.detail', '[class*="detail"]', '.spec', '[class*="spec"]'
        ]
        
        for selector in desc_selectors:
            desc_elem = soup.select_one(selector)
            if desc_elem:
                desc_text = desc_elem.get_text(strip=True)
                if desc_text and len(desc_text) > 20:
                    return desc_text[:2000]  # 最大2000文字
        
        return None

    def extract_review_count(self, soup: BeautifulSoup) -> int:
        """レビュー数抽出"""
        review_patterns = [
            r'(\d+)\s*件?のレビュー',
            r'レビュー\s*[:：]?\s*(\d+)',
            r'(\d+)\s*レビュー',
            r'(\d+)\s*件'
        ]
        
        for pattern in review_patterns:
            elements = soup.find_all(text=re.compile(pattern))
            for element in elements:
                match = re.search(pattern, element)
                if match:
                    return int(match.group(1))
        
        return 0

    def extract_rating(self, soup: BeautifulSoup) -> float:
        """評価抽出"""
        rating_patterns = [
            r'(\d+\.?\d*)\s*点',
            r'評価\s*[:：]?\s*(\d+\.?\d*)',
            r'★\s*(\d+\.?\d*)'
        ]
        
        for pattern in rating_patterns:
            elements = soup.find_all(text=re.compile(pattern))
            for element in elements:
                match = re.search(pattern, element)
                if match:
                    return float(match.group(1))
        
        # 星の数をカウント
        star_elements = soup.find_all(['span', 'div'], class_=re.compile(r'star.*full|rating.*full'))
        if star_elements:
            return len(star_elements)
        
        return 0.0

    def extract_image_urls(self, soup: BeautifulSoup) -> List[str]:
        """画像URL抽出"""
        image_urls = []
        
        # 商品画像を探す
        img_elements = soup.find_all('img', src=True)
        
        for img in img_elements:
            src = img['src']
            
            # 楽天の商品画像らしいURLを判定
            if any(keyword in src.lower() for keyword in ['cabinet', 'item', 'product', 'goods']):
                if src.startswith('//'):
                    src = 'https:' + src
                elif src.startswith('/'):
                    continue  # 相対パスはスキップ
                
                if src not in image_urls and 'thumbnail' not in src.lower():
                    image_urls.append(src)
        
        return image_urls[:10]  # 最大10枚

    def extract_seller_info(self, soup: BeautifulSoup) -> Dict:
        """販売者情報抽出"""
        seller_info = {
            'name': '',
            'rating': 0.0,
            'is_store': False
        }
        
        # ショップ名
        shop_selectors = [
            '.shop-name', '[class*="shop"]', '[class*="store"]', '.seller'
        ]
        
        for selector in shop_selectors:
            shop_elem = soup.select_one(selector)
            if shop_elem:
                seller_info['name'] = shop_elem.get_text(strip=True)
                break
        
        # ショップ評価
        rating_elem = soup.find(text=re.compile(r'\d+\s*%'))
        if rating_elem:
            rating_match = re.search(r'(\d+)', rating_elem)
            if rating_match:
                seller_info['rating'] = float(rating_match.group(1))
        
        # ストア判定
        store_indicators = soup.find_all(text=re.compile(r'ストア|store|STORE|公式'))
        seller_info['is_store'] = len(store_indicators) > 0
        
        return seller_info

    def extract_specifications(self, soup: BeautifulSoup) -> Dict:
        """仕様情報抽出"""
        specs = {}
        
        # 仕様表から抽出
        for table in soup.find_all('table'):
            for row in table.find_all('tr'):
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    key = cells[0].get_text(strip=True)
                    value = cells[1].get_text(strip=True)
                    if key and value:
                        specs[key] = value
        
        return specs

    def extract_price_from_text(self, text: str) -> float:
        """テキストから価格抽出"""
        # 数字とカンマのみを抽出
        price_text = re.sub(r'[^\d,]', '', text)
        price_text = price_text.replace(',', '')
        
        if price_text:
            try:
                return float(price_text)
            except ValueError:
                pass
        
        return 0.0

# ===============================
# 5. ヤフオクスクレイパー
# ===============================

class YahooAuctionScraper:
    def __init__(self, scraper: AntiDetectionScraper):
        self.scraper = scraper
        self.logger = logging.getLogger('YahooAuctionScraper')

    async def search_auctions(self, keywords: List[str], categories: List[str] = None) -> List[Dict]:
        """オークション検索"""
        all_products = []
        
        for keyword in keywords:
            self.logger.info(f"ヤフオク検索開始: {keyword}")
            
            try:
                # 検索URL構築
                search_params = {
                    'p': keyword,
                    'istatus': '1',  # 即決価格ありのみ
                    'mode': '2',     # 終了順
                    'min': '1000',   # 最低価格
                    'max': '50000'   # 最高価格
                }
                
                query_string = '&'.join([f"{k}={v}" for k, v in search_params.items()])
                url = f"https://auctions.yahoo.co.jp/search/search?{query_string}"
                
                html = await self.scraper.safe_request(url, 'yahoo_auction')
                
                if html:
                    products = self.parse_search_results(html)
                    all_products.extend(products)
                    self.logger.info(f"キーワード '{keyword}': {len(products)}商品取得")
                else:
                    self.logger.warning(f"検索失敗: {keyword}")
            
            except Exception as e:
                self.logger.error(f"オークション検索エラー: {str(e)}")
        
        return all_products

    def parse_search_results(self, html: str) -> List[Dict]:
        """検索結果解析"""
        soup = BeautifulSoup(html, 'html.parser')
        products = []
        
        # 商品リスト要素を探す
        product_selectors = [
            'div[class*="Product"]',
            'div[class*="item"]',
            'li[class*="Product"]',
            '.searchresultitem'
        ]
        
        product_elements = []
        for selector in product_selectors:
            elements = soup.select(selector)
            if elements:
                product_elements = elements
                break
        
        for element in product_elements[:50]:  # 最大50件
            try:
                product_data = self.extract_auction_summary(element)
                if product_data and product_data.get('auction_url'):
                    products.append(product_data)
            except Exception as e:
                self.logger.warning(f"オークションデータ抽出エラー: {str(e)}")
                continue
        
        return products

    def extract_auction_summary(self, element) -> Optional[Dict]:
        """オークション概要抽出"""
        try:
            # オークションURL
            link_elem = element.find('a', href=True)
            if not link_elem:
                return None
            
            href = link_elem['href']
            
            # オークションID抽出
            auction_id_match = re.search(r'/([a-z]\d+)(?:/|\?|$)', href)
            if not auction_id_match:
                return None
            
            auction_id = auction_id_match.group(1)
            auction_url = f"https://auctions.yahoo.co.jp/item/{auction_id}"
            
            # タイトル
            title_selectors = [
                'h3', 'h4', '[class*="title"]', '[class*="name"]'
            ]
            
            title = "商品名不明"
            for selector in title_selectors:
                title_elem = element.select_one(selector)
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    break
            
            # 即決価格
            price_selectors = [
                '[class*="price"]', '[class*="bid"]', '.u-fz16'
            ]
            
            current_price = 0
            instant_buy_price = None
            
            for selector in price_selectors:
                price_elem = element.select_one(selector)
                if price_elem:
                    price_text = price_elem.get_text()
                    if '即決' in price_text:
                        instant_buy_price = self.extract_price_from_text(price_text)
                    else:
                        current_price = self.extract_price_from_text(price_text)
            
            # 終了時間
            time_elem = element.find(text=re.compile(r'\d+日|\d+時間|\d+分'))
            end_time = self.parse_end_time(time_elem) if time_elem else None
            
            # 入札数
            bid_elem = element.find(text=re.compile(r'\d+\s*入札'))
            bid_count = 0
            if bid_elem:
                bid_match = re.search(r'(\d+)', bid_elem)
                if bid_match:
                    bid_count = int(bid_match.group(1))
            
            # 画像URL
            img_elem = element.find('img', src=True)
            image_url = img_elem['src'] if img_elem else None
            if image_url and image_url.startswith('//'):
                image_url = 'https:' + image_url
            
            return {
                'auction_id': auction_id,
                'auction_url': auction_url,
                'title': title,
                'current_price': current_price,
                'instant_buy_price': instant_buy_price,
                'end_time': end_time,
                'bid_count': bid_count,
                'image_urls': [image_url] if image_url else []
            }
        
        except Exception as e:
            self.logger.warning(f"オークション概要抽出エラー: {str(e)}")
            return None

    async def get_auction_details(self, auction_url: str) -> Optional[Dict]:
        """オークション詳細情報取得"""
        html = await self.scraper.safe_request(auction_url, 'yahoo_auction')
        if not html:
            return None
        
        return self.parse_auction_details(html, auction_url)

    def parse_auction_details(self, html: str, auction_url: str) -> Dict:
        """オークション詳細解析"""
        soup = BeautifulSoup(html, 'html.parser')
        
        details = {
            'jan_code': self.extract_jan_code(soup),
            'brand': self.extract_brand(soup),
            'condition': self.extract_condition(soup),
            'category': self.extract_category(soup),
            'description': self.extract_description(soup),
            'seller_info': self.extract_seller_info(soup),
            'shipping_info': self.extract_shipping_info(soup),
            'image_urls': self.extract_image_urls(soup)
        }
        
        return details

    def extract_jan_code(self, soup: BeautifulSoup) -> Optional[str]:
        """JANコード抽出"""
        jan_patterns = [
            'JAN', 'jan', 'ＪＡＮ', '商品コード', 'バーコード', 'EAN'
        ]
        
        # 商品情報テーブルから検索
        for table in soup.find_all('table'):
            for row in table.find_all('tr'):
                cells = row.find_all(['td', 'th'])
                for i, cell in enumerate(cells):
                    if any(pattern in cell.get_text() for pattern in jan_patterns):
                        if i + 1 < len(cells):
                            jan_text = cells[i + 1].get_text()
                            jan_match = re.search(r'\b(\d{13}|\d{10})\b', jan_text)
                            if jan_match:
                                code = jan_match.group(1)
                                if self.validate_jan_code(code):
                                    return code
        
        # 説明文から検索
        description_elem = soup.find('div', class_=re.compile(r'ProductExplanation'))
        if description_elem:
            desc_text = description_elem.get_text()
            for pattern in jan_patterns:
                if pattern in desc_text:
                    jan_match = re.search(rf'{pattern}[:\s]*(\d{{13}}|\d{{10}})', desc_text)
                    if jan_match:
                        code = jan_match.group(1)
                        if self.validate_jan_code(code):
                            return code
        
        return None

    def validate_jan_code(self, code: str) -> bool:
        """JANコードバリデーション（楽天と同じ）"""
        if len(code) == 13:
            check_sum = 0
            for i in range(12):
                weight = 1 if i % 2 == 0 else 3
                check_sum += int(code[i]) * weight
            
            check_digit = (10 - (check_sum % 10)) % 10
            return check_digit == int(code[12])
        
        elif len(code) == 10:
            check_sum = 0
            for i in range(9):
                check_sum += int(code[i]) * (10 - i)
            
            check_digit = (11 - (check_sum % 11)) % 11
            expected = code[9]
            
            if check_digit == 10:
                return expected.upper() == 'X'
            else:
                return check_digit == int(expected)
        
        return False

    def extract_brand(self, soup: BeautifulSoup) -> Optional[str]:
        """ブランド名抽出"""
        # 有名ブランド一覧でタイトルから抽出
        known_brands = [
            'Apple', 'Sony', 'Nintendo', 'Canon', 'Nikon', 'Panasonic',
            'Samsung', 'LG', 'Sharp', 'Toshiba', 'Fujitsu', 'NEC',
            'Microsoft', 'Google', 'Amazon', 'HP', 'Dell', 'Lenovo'
        ]
        
        title_elem = soup.find('h1')
        if title_elem:
            title_text = title_elem.get_text()
            for brand in known_brands:
                if brand.lower() in title_text.lower():
                    return brand
        
        return None

    def extract_condition(self, soup: BeautifulSoup) -> ProductCondition:
        """商品状態抽出"""
        # 商品状態表示から判定
        condition_elem = soup.find(text=re.compile(r'商品の状態|コンディション'))
        if condition_elem and condition_elem.parent:
            condition_text = condition_elem.parent.get_text().lower()
            
            if any(keyword in condition_text for keyword in ['新品', '未使用', '未開封']):
                return ProductCondition.NEW
            elif any(keyword in condition_text for keyword in ['ほぼ新品', '極美品']):
                return ProductCondition.USED_LIKE_NEW
            elif any(keyword in condition_text for keyword in ['美品', '良好']):
                return ProductCondition.USED_VERY_GOOD
            elif any(keyword in condition_text for keyword in ['中古', '使用感あり']):
                return ProductCondition.USED_GOOD
            elif any(keyword in condition_text for keyword in ['傷あり', 'ジャンク']):
                return ProductCondition.USED_ACCEPTABLE
        
        return ProductCondition.UNKNOWN

    def extract_category(self, soup: BeautifulSoup) -> Optional[str]:
        """カテゴリ抽出"""
        # パンくずリストから
        breadcrumb_elem = soup.find(['nav', 'div'], class_=re.compile(r'breadcrumb|path'))
        if breadcrumb_elem:
            categories = [link.get_text(strip=True) for link in breadcrumb_elem.find_all('a')]
            if len(categories) > 1:
                return categories[-2]  # 最後から2番目のカテゴリ
        
        return None

    def extract_description(self, soup: BeautifulSoup) -> Optional[str]:
        """商品説明抽出"""
        desc_selectors = [
            '.ProductExplanation', '.ItemExplanation', 
            '[class*="explanation"]', '[class*="description"]'
        ]
        
        for selector in desc_selectors:
            desc_elem = soup.select_one(selector)
            if desc_elem:
                return desc_elem.get_text(strip=True)[:2000]  # 最大2000文字
        
        return None

    def extract_seller_info(self, soup: BeautifulSoup) -> Dict:
        """出品者情報抽出"""
        seller_info = {'name': '', 'rating': 0.0, 'is_store': False}
        
        # 出品者名
        seller_elem = soup.find(['span', 'div'], class_=re.compile(r'seller|user'))
        if seller_elem:
            seller_info['name'] = seller_elem.get_text(strip=True)
        
        # 評価
        rating_elem = soup.find(text=re.compile(r'\d+\s*%'))
        if rating_elem:
            rating_match = re.search(r'(\d+)', rating_elem)
            if rating_match:
                seller_info['rating'] = float(rating_match.group(1))
        
        # ストア判定
        store_elem = soup.find(text=re.compile(r'ストア|store|STORE'))
        if store_elem:
            seller_info['is_store'] = True
        
        return seller_info

    def extract_shipping_info(self, soup: BeautifulSoup) -> Dict:
        """配送情報抽出"""
        shipping_info = {'cost': 0, 'method': ''}
        
        # 送料要素を探す
        shipping_elem = soup.find(text=re.compile(r'送料|配送料'))
        if shipping_elem and shipping_elem.parent:
            shipping_text = shipping_elem.parent.get_text()
            
            if '無料' in shipping_text or 'free' in shipping_text.lower():
                shipping_info['cost'] = 0
            else:
                price = self.extract_price_from_text(shipping_text)
                if price > 0:
                    shipping_info['cost'] = price
        
        return shipping_info

    def extract_image_urls(self, soup: BeautifulSoup) -> List[str]:
        """画像URL抽出"""
        image_urls = []
        
        # 商品画像を探す
        img_elements = soup.find_all('img', src=True)
        
        for img in img_elements:
            src = img['src']
            
            # ヤフオクの商品画像判定
            if 'auctions.c.yimg.jp' in src or 'auction' in src:
                if src not in image_urls:
                    image_urls.append(src)
        
        return image_urls[:10]  # 最大10枚

    def parse_end_time(self, time_text: str) -> Optional[datetime]:
        """終了時間解析"""
        if not time_text:
            return None
        
        try:
            # "3日後" 形式
            days_match = re.search(r'(\d+)日', time_text)
            if days_match:
                days = int(days_match.group(1))
                return datetime.now() + timedelta(days=days)
            
            # "5時間" 形式
            hours_match = re.search(r'(\d+)時間', time_text)
            if hours_match:
                hours = int(hours_match.group(1))
                return datetime.now() + timedelta(hours=hours)
            
            # "30分" 形式
            minutes_match = re.search(r'(\d+)分', time_text)
            if minutes_match:
                minutes = int(minutes_match.group(1))
                return datetime.now() + timedelta(minutes=minutes)
        
        except Exception:
            pass
        
        return datetime.now() + timedelta(days=7)  # デフォルト7日後

    def extract_price_from_text(self, text: str) -> float:
        """テキストから価格抽出"""
        price_text = re.sub(r'[^\d,]', '', text)
        price_text = price_text.replace(',', '')
        
        if price_text:
            try:
                return float(price_text)
            except ValueError:
                pass
        
        return 0.0

# ===============================
# 6. Amazon商品マッチングシステム
# ===============================

class AmazonProductMatcher:
    def __init__(self):
        self.confidence_threshold = 0.7
        self.logger = logging.getLogger('AmazonProductMatcher')
        
        # Amazon PA-API モック（実際の実装では本物のAPIを使用）
        self.amazon_api = AmazonPAAPIMock()

    async def find_amazon_matches(self, source_product: SourceProduct) -> List[ProductMatch]:
        """Amazon商品マッチング"""
        matches = []
        
        # 1. JANコード完全一致検索
        if source_product.jan_code:
            jan_matches = await self._search_by_jan_code(source_product)
            matches.extend(jan_matches)
        
        # 2. キーワード検索（JANコードで見つからない場合）
        if not matches or max([m.confidence for m in matches]) < 0.9:
            keyword_matches = await self._search_by_keywords(source_product)
            matches.extend(keyword_matches)
        
        # 3. 重複除去とスコアリング
        unique_matches = self._deduplicate_matches(matches)
        verified_matches = await self._verify_matches(unique_matches, source_product)
        
        return sorted(verified_matches, key=lambda x: x.confidence, reverse=True)

    async def _search_by_jan_code(self, source_product: SourceProduct) -> List[ProductMatch]:
        """JANコード検索"""
        try:
            results = await self.amazon_api.search_by_jan(source_product.jan_code)
            
            matches = []
            for item in results:
                # JANコード完全一致確認
                if item.get('jan_code') == source_product.jan_code:
                    matches.append(ProductMatch(
                        source_product_id=source_product.id,
                        amazon_asin=item['asin'],
                        confidence=0.95,
                        match_method='jan_exact',
                        verified=True
                    ))
            
            return matches
        
        except Exception as e:
            self.logger.error(f"JANコード検索エラー: {str(e)}")
            return []

    async def _search_by_keywords(self, source_product: SourceProduct) -> List[ProductMatch]:
        """キーワード検索"""
        try:
            keywords = self._generate_search_keywords(source_product)
            
            matches = []
            for keyword in keywords[:3]:  # 上位3つのキーワード
                results = await self.amazon_api.search_by_keyword(keyword)
                
                for item in results:
                    # タイトル類似度計算
                    similarity = self._calculate_title_similarity(
                        source_product.title, 
                        item.get('title', '')
                    )
                    
                    if similarity > self.confidence_threshold:
                        matches.append(ProductMatch(
                            source_product_id=source_product.id,
                            amazon_asin=item['asin'],
                            confidence=similarity,
                            match_method='keyword',
                            verified=False
                        ))
            
            return matches
        
        except Exception as e:
            self.logger.error(f"キーワード検索エラー: {str(e)}")
            return []

    def _generate_search_keywords(self, product: SourceProduct) -> List[str]:
        """検索キーワード生成"""
        keywords = []
        
        # ブランド名 + 主要キーワード
        if product.brand:
            main_words = self._extract_main_words(product.title)
            for word in main_words[:2]:
                keywords.append(f"{product.brand} {word}")
        
        # 主要キーワードのみ
        main_words = self._extract_main_words(product.title)
        keywords.extend(main_words[:3])
        
        # タイトル全体（短縮版）
        short_title = ' '.join(product.title.split()[:5])
        keywords.append(short_title)
        
        return keywords

    def _extract_main_words(self, title: str) -> List[str]:
        """主要キーワード抽出"""
        # 不要な文字を除去
        cleaned_title = re.sub(r'[（）()【】\[\]｜|]', ' ', title)
        cleaned_title = re.sub(r'[^\w\s]', ' ', cleaned_title)
        
        # 単語に分割
        words = cleaned_title.split()
        
        # ストップワード除去
        stop_words = {'の', 'に', 'を', 'は', 'が', 'で', 'と', 'から', 'まで', '用', '向け'}
        main_words = [word for word in words if word not in stop_words and len(word) > 1]
        
        return main_words

    def _calculate_title_similarity(self, title1: str, title2: str) -> float:
        """タイトル類似度計算"""
        # 前処理
        clean_title1 = self._clean_title_for_comparison(title1)
        clean_title2 = self._clean_title_for_comparison(title2)
        
        # 文字列類似度
        similarity = SequenceMatcher(None, clean_title1, clean_title2).ratio()
        
        # 重要キーワードの一致チェック
        words1 = set(clean_title1.split())
        words2 = set(clean_title2.split())
        
        if words1 and words2:
            keyword_match_ratio = len(words1 & words2) / len(words1 | words2)
            similarity = (similarity + keyword_match_ratio) / 2
        
        return similarity

    def _clean_title_for_comparison(self, title: str) -> str:
        """比較用タイトル前処理"""
        # カッコ内除去、記号除去、小文字化
        cleaned = re.sub(r'[（）()【】\[\]｜|]', ' ', title)
        cleaned = re.sub(r'[^\w\s]', ' ', cleaned)
        cleaned = ' '.join(cleaned.lower().split())
        return cleaned

    def _deduplicate_matches(self, matches: List[ProductMatch]) -> List[ProductMatch]:
        """重複除去"""
        seen_asins = set()
        unique_matches = []
        
        for match in sorted(matches, key=lambda x: x.confidence, reverse=True):
            if match.amazon_asin not in seen_asins:
                seen_asins.add(match.amazon_asin)
                unique_matches.append(match)
        
        return unique_matches

    async def _verify_matches(self, matches: List[ProductMatch], source_product: SourceProduct) -> List[ProductMatch]:
        """マッチング検証"""
        verified_matches = []
        
        for match in matches:
            try:
                # Amazon商品詳細取得
                amazon_product = await self.amazon_api.get_product_details(match.amazon_asin)
                
                # 価格妥当性確認
                if amazon_product and amazon_product.get('current_price', 0) > 0:
                    amazon_price = amazon_product['current_price']
                    source_price = source_product.price
                    
                    if source_price > 0:
                        price_ratio = amazon_price / source_price
                        
                        if 1.2 <= price_ratio <= 5.0:  # 1.2倍～5倍の範囲
                            match.confidence *= 1.1  # 信頼度向上
                        else:
                            match.confidence *= 0.8  # 信頼度低下
                
                verified_matches.append(match)
            
            except Exception as e:
                self.logger.warning(f"マッチング検証エラー: {match.amazon_asin} - {str(e)}")
                verified_matches.append(match)  # エラーでも含める
        
        return verified_matches

# ===============================
# 7. Amazon PA-API モック
# ===============================

class AmazonPAAPIMock:
    """Amazon PA-API モック実装"""
    
    def __init__(self):
        self.mock_products = self._initialize_mock_data()
        self.logger = logging.getLogger('AmazonPAAPIMock')

    def _initialize_mock_data(self):
        """モックデータ初期化"""
        return {
            'B01234567X': {
                'asin': 'B01234567X',
                'title': 'iPhone 15 Pro ケース MagSafe対応',
                'category': 'Electronics',
                'current_price': 2980,
                'competitors': [
                    {'seller_id': 'A123', 'price': 2980, 'condition': 'new'},
                    {'seller_id': 'A456', 'price': 3200, 'condition': 'new'},
                    {'seller_id': 'A789', 'price': 2750, 'condition': 'new'}
                ],
                'sales_rank': 15000,
                'review_count': 120,
                'rating': 4.2,
                'dimensions': {'length': 15, 'width': 8, 'height': 1},
                'weight': 50,
                'brand': 'Apple',
                'jan_code': '4549995354878'
            }
        }

    async def search_by_jan(self, jan_code: str) -> List[Dict]:
        """JANコード検索"""
        await asyncio.sleep(0.1)  # API遅延シミュレート
        
        results = []
        for asin, product in self.mock_products.items():
            if product.get('jan_code') == jan_code:
                results.append(product)
        
        # ランダムな追加結果生成
        if not results and len(jan_code) == 13:
            asin = f"B{jan_code[:9]}X"
            results.append({
                'asin': asin,
                'title': f'商品 {jan_code[:6]}',
                'jan_code': jan_code,
                'current_price': random.randint(1000, 5000)
            })
        
        return results

    async def search_by_keyword(self, keyword: str) -> List[Dict]:
        """キーワード検索"""
        await asyncio.sleep(0.1)
        
        results = []
        
        # キーワードベースのモック結果
        for i in range(random.randint(2, 5)):
            asin = f"B{abs(hash(keyword + str(i))) % 1000000000:09d}X"
            
            base_price = 1000 + (abs(hash(keyword)) % 10000)
            
            results.append({
                'asin': asin,
                'title': f'{keyword} 関連商品 {i+1}',
                'current_price': base_price + random.randint(-500, 1000),
                'category': self._determine_category_from_keyword(keyword)
            })
        
        return results

    async def get_product_details(self, asin: str) -> Dict:
        """商品詳細取得"""
        await asyncio.sleep(0.1)
        
        if asin in self.mock_products:
            return self.mock_products[asin].copy()
        
        # ランダムな商品詳細生成
        return {
            'asin': asin,
            'title': f'商品 {asin}',
            'category': random.choice(['Electronics', 'Home & Kitchen', 'Sports']),
            'current_price': random.randint(1000, 5000),
            'competitors': [
                {'price': random.randint(1000, 5000), 'condition': 'new'}
                for _ in range(random.randint(1, 5))
            ],
            'sales_rank': random.randint(10000, 500000),
            'review_count': random.randint(0, 100),
            'rating': random.uniform(3.0, 4.8),
            'dimensions': {'length': 20, 'width': 15, 'height': 5},
            'weight': random.randint(50, 500)
        }

    def _determine_category_from_keyword(self, keyword: str) -> str:
        """キーワードからカテゴリ判定"""
        if any(word in keyword.lower() for word in ['iphone', 'android', 'phone']):
            return 'Electronics'
        elif any(word in keyword.lower() for word in ['game', 'nintendo', 'playstation']):
            return 'Video Games'
        elif any(word in keyword.lower() for word in ['camera', 'lens', 'canon']):
            return 'Camera & Photo'
        else:
            return 'Electronics'

# ===============================
# 8. 利益計算システム
# ===============================

class ProfitCalculationEngine:
    def __init__(self):
        # Amazonカテゴリ別手数料
        self.amazon_fees = {
            'Electronics': 0.08,
            'Video Games': 0.15,
            'Camera & Photo': 0.08,
            'Sports & Outdoors': 0.15,
            'Home & Kitchen': 0.15,
            'Books': 0.15,
            'Beauty': 0.10,
            'default': 0.10
        }
        
        # FBA手数料（サイズ・重量別）
        self.fba_fees = {
            'small_standard': 318,     # 小型標準サイズ
            'large_standard': 434,     # 大型標準サイズ
            'small_oversize': 514,     # 小型大型サイズ
            'medium_oversize': 648,    # 中型大型サイズ
            'large_oversize': 972      # 大型大型サイズ
        }
        
        # その他コスト
        self.other_costs = {
            'shipping_to_fba': 500,        # FBA納品送料
            'packaging_cost': 100,         # 梱包コスト
            'storage_monthly': 50,         # 月間保管手数料
            'credit_card_fee': 0.024,      # クレジットカード手数料2.4%
            'inspection_cost': 200         # 検品コスト（中古品）
        }

    async def calculate_profit_margins(self, collected_data: Dict) -> List[Dict]:
        """収集データから利益率計算"""
        profitable_products = []
        
        # 楽天商品の処理
        for rakuten_product in collected_data.get('rakuten', []):
            if rakuten_product.get('price', 0) <= 0:
                continue
            
            amazon_matches = await self._find_amazon_matches_for_product(rakuten_product)
            
            for amazon_match in amazon_matches:
                profit_calc = self._calculate_detailed_profit(rakuten_product, amazon_match)
                
                if profit_calc.is_profitable:
                    profitable_products.append({
                        'source': 'rakuten',
                        'source_data': rakuten_product,
                        'amazon_data': amazon_match,
                        'profit_analysis': profit_calc,
                        'priority_score': profit_calc.priority_score
                    })
        
        # ヤフオク商品の処理
        for yahoo_product in collected_data.get('yahoo_auction', []):
            if yahoo_product.get('current_price', 0) <= 0:
                continue
            
            amazon_matches = await self._find_amazon_matches_for_product(yahoo_product)
            
            for amazon_match in amazon_matches:
                profit_calc = self._calculate_detailed_profit(yahoo_product, amazon_match)
                
                if profit_calc.is_profitable:
                    profitable_products.append({
                        'source': 'yahoo_auction',
                        'source_data': yahoo_product,
                        'amazon_data': amazon_match,
                        'profit_analysis': profit_calc,
                        'priority_score': profit_calc.priority_score
                    })
        
        # 利益率順にソート
        return sorted(profitable_products, key=lambda x: x['priority_score'], reverse=True)

    async def _find_amazon_matches_for_product(self, product_data: Dict) -> List[Dict]:
        """商品のAmazonマッチング"""
        matcher = AmazonProductMatcher()
        
        # 一時的なSourceProductオブジェクト作成
        temp_product = SourceProduct(
            id=None,
            source_type='temp',
            product_url=product_data.get('product_url', ''),
            jan_code=product_data.get('jan_code'),
            title=product_data.get('title', ''),
            price=product_data.get('price', 0),
            condition=ProductCondition.UNKNOWN,
            brand=product_data.get('brand'),
            category=product_data.get('category'),
            description=product_data.get('description', ''),
            image_urls=product_data.get('image_urls', []),
            seller_name=product_data.get('seller_name', ''),
            seller_rating=product_data.get('seller_rating', 0),
            is_store=product_data.get('is_store', False),
            review_count=product_data.get('review_count', 0),
            rating=product_data.get('rating', 0),
            end_time=product_data.get('end_time'),
            bid_count=product_data.get('bid_count'),
            instant_buy_price=product_data.get('instant_buy_price'),
            shipping_cost=product_data.get('shipping_cost', 0),
            scraped_at=datetime.now()
        )
        
        matches = await matcher.find_amazon_matches(temp_product)
        
        # マッチ結果をAmazon商品詳細に変換
        amazon_products = []
        for match in matches[:3]:  # 上位3件
            amazon_detail = await matcher.amazon_api.get_product_details(match.amazon_asin)
            if amazon_detail:
                amazon_products.append(amazon_detail)
        
        return amazon_products

    def _calculate_detailed_profit(self, source_product: Dict, amazon_product: Dict) -> ProfitAnalysis:
        """詳細利益計算"""
        
        # 1. 仕入れコスト計算
        source_price = source_product.get('price', 0)
        if 'instant_buy_price' in source_product and source_product['instant_buy_price']:
            source_price = source_product['instant_buy_price']  # ヤフオク即決価格優先
        
        shipping_cost = source_product.get('shipping_cost', 0)
        credit_card_fee = source_price * self.other_costs['credit_card_fee']
        
        total_acquisition_cost = source_price + shipping_cost + credit_card_fee
        
        # 2. Amazon販売価格
        amazon_price = amazon_product.get('current_price', 0)
        
        # 3. Amazon手数料計算
        category = amazon_product.get('category', 'default')
        referral_fee_rate = self.amazon_fees.get(category, self.amazon_fees['default'])
        referral_fee = amazon_price * referral_fee_rate
        
        # 4. FBA手数料計算
        fba_fee = self._calculate_fba_fee(amazon_product)
        
        # 5. その他コスト
        packaging_cost = self.other_costs['packaging_cost']
        shipping_to_fba = self.other_costs['shipping_to_fba']
        storage_cost = self.other_costs['storage_monthly']
        
        # 中古品の場合は検品コスト追加
        inspection_cost = 0
        if source_product.get('condition') != 'new':
            inspection_cost = self.other_costs['inspection_cost']
        
        other_total = packaging_cost + shipping_to_fba + storage_cost + inspection_cost
        
        # 6. 総コスト・利益計算
        total_cost = total_acquisition_cost + referral_fee + fba_fee + other_total
        profit = amazon_price - total_cost
        profit_margin = (profit / amazon_price * 100) if amazon_price > 0 else 0
        roi = (profit / total_acquisition_cost * 100) if total_acquisition_cost > 0 else 0
        
        # 7. 推奨価格計算（競合より50円安く）
        competitors = amazon_product.get('competitors', [])
        if competitors:
            competitor_prices = [comp['price'] for comp in competitors]
            min_competitor_price = min(competitor_prices)
            recommended_price = max(min_competitor_price - 50, total_cost * 1.25)  # 最低25%利益確保
        else:
            recommended_price = amazon_price
        
        # 8. 利益性判定
        is_profitable = (
            profit >= 1000 and          # 最低利益額1000円
            profit_margin >= 20 and     # 最低利益率20%
            amazon_price >= 2000        # 最低販売価格2000円
        )
        
        # 9. 優先度スコア計算
        priority_score = self._calculate_priority_score(
            profit, profit_margin, roi, amazon_product, source_product
        )
        
        return ProfitAnalysis(
            source_cost=total_acquisition_cost,
            amazon_revenue=amazon_price,
            shipping_cost=shipping_cost,
            amazon_fees=referral_fee,
            fba_fees=fba_fee,
            other_costs=other_total,
            total_cost=total_cost,
            profit=profit,
            profit_margin=profit_margin,
            roi=roi,
            is_profitable=is_profitable,
            recommended_price=recommended_price,
            priority_score=priority_score
        )

    def _calculate_fba_fee(self, amazon_product: Dict) -> float:
        """FBA手数料計算"""
        weight = amazon_product.get('weight', 0)
        dimensions = amazon_product.get('dimensions', {})
        
        # サイズ区分判定
        max_dimension = max(
            dimensions.get('length', 0),
            dimensions.get('width', 0),
            dimensions.get('height', 0)
        )
        
        if weight <= 250 and max_dimension <= 25:
            return self.fba_fees['small_standard']
        elif weight <= 2000 and max_dimension <= 45:
            return self.fba_fees['large_standard']
        elif weight <= 9000:
            return self.fba_fees['small_oversize']
        elif weight <= 27000:
            return self.fba_fees['medium_oversize']
        else:
            return self.fba_fees['large_oversize']

    def _calculate_priority_score(self, profit: float, profit_margin: float, roi: float,
                                 amazon_product: Dict, source_product: Dict) -> float:
        """優先度スコア計算"""
        score = 0
        
        # 利益額スコア (0-40点)
        if profit >= 5000:
            score += 40
        elif profit >= 3000:
            score += 30
        elif profit >= 1500:
            score += 20
        elif profit >= 1000:
            score += 10
        
        # 利益率スコア (0-30点)
        if profit_margin >= 40:
            score += 30
        elif profit_margin >= 30:
            score += 25
        elif profit_margin >= 20:
            score += 15
        elif profit_margin >= 15:
            score += 10
        
        # ROIスコア (0-20点)
        if roi >= 100:
            score += 20
        elif roi >= 70:
            score += 15
        elif roi >= 50:
            score += 10
        elif roi >= 30:
            score += 5
        
        # Amazon売上ランクスコア (0-10点)
        sales_rank = amazon_product.get('sales_rank', float('inf'))
        if sales_rank <= 10000:
            score += 10
        elif sales_rank <= 50000:
            score += 7
        elif sales_rank <= 100000:
            score += 5
        elif sales_rank <= 200000:
            score += 3
        
        return score

    async def generate_daily_report(self, profitable_products: List[Dict]) -> Dict:
        """日次レポート生成"""
        if not profitable_products:
            return {'message': '本日は利益商品が見つかりませんでした'}
        
        # 統計計算
        profits = [p['profit_analysis'].profit for p in profitable_products]
        margins = [p['profit_analysis'].profit_margin for p in profitable_products]
        
        # ソース別分析
        source_breakdown = {'rakuten': 0, 'yahoo_auction': 0}
        for product in profitable_products:
            source = product['source']
            if source in source_breakdown:
                source_breakdown[source] += 1
        
        # トップ商品分析
        top_products = profitable_products[:10]
        
        report = {
            'date': datetime.now().strftime('%Y-%m-%d'),
            'summary': {
                'total_products_found': len(profitable_products),
                'average_profit': sum(profits) / len(profits),
                'average_margin': sum(margins) / len(margins),
                'max_profit': max(profits),
                'min_profit': min(profits),
                'total_potential_profit': sum(profits),
                'source_breakdown': source_breakdown
            },
            'top_products': [
                {
                    'title': p['source_data']['title'][:80],
                    'source': p['source'],
                    'source_price': p['source_data'].get('price', 0),
                    'amazon_price': p['profit_analysis'].amazon_revenue,
                    'profit': p['profit_analysis'].profit,
                    'margin': p['profit_analysis'].profit_margin,
                    'priority_score': p['priority_score'],
                    'url': p['source_data'].get('product_url', '')
                }
                for p in top_products
            ],
            'recommendations': self._generate_recommendations(profitable_products)
        }
        
        return report

    def _generate_recommendations(self, profitable_products: List[Dict]) -> List[str]:
        """推奨アクション生成"""
        recommendations = []
        
        if not profitable_products:
            return ['本日は仕入れ推奨商品がありません']
        
        # 高利益商品の推奨
        high_profit = [p for p in profitable_products if p['profit_analysis'].profit >= 3000]
        if high_profit:
            recommendations.append(f"高利益商品{len(high_profit)}件を優先的に仕入れ検討")
        
        # 高利益率商品の推奨
        high_margin = [p for p in profitable_products if p['profit_analysis'].profit_margin >= 35]
        if high_margin:
            recommendations.append(f"高利益率商品{len(high_margin)}件の即時仕入れ推奨")
        
        # ソース別推奨
        source_counts = {}
        for product in profitable_products[:20]:  # 上位20件で分析
            source = product['source']
            source_counts[source] = source_counts.get(source, 0) + 1
        
        for source, count in source_counts.items():
            source_name = '楽天' if source == 'rakuten' else 'ヤフオク'
            recommendations.append(f"{source_name}から{count}件の仕入れ候補")
        
        # ROI分析
        high_roi = [p for p in profitable_products if p['profit_analysis'].roi >= 80]
        if high_roi:
            recommendations.append(f"高ROI商品{len(high_roi)}件でキャッシュフロー改善期待")
        
        return recommendations

# ===============================
# 9. 時間分散収集システム
# ===============================

class TimeDistributedCollector:
    def __init__(self, scraper: AntiDetectionScraper):
        self.scraper = scraper
        self.rakuten_scraper = RakutenScraper(scraper)
        self.yahoo_scraper = YahooAuctionScraper(scraper)
        self.profit_engine = ProfitCalculationEngine()
        self.logger = logging.getLogger('TimeDistributedCollector')

    async def execute_daily_collection(self, config: Dict) -> Dict:
        """日次収集実行"""
        start_time = datetime.now()
        self.logger.info("分散収集システム開始")
        
        try:
            # セッションプール初期化
            await self.scraper.init_session_pool(pool_size=3)
            
            # 楽天収集
            rakuten_data = await self._collect_rakuten_products(config.get('rakuten', {}))
            
            # ヤフオク収集
            yahoo_data = await self._collect_yahoo_products(config.get('yahoo_auction', {}))
            
            # 収集データ統合
            collected_data = {
                'rakuten': rakuten_data,
                'yahoo_auction': yahoo_data
            }
            
            # 利益分析
            profitable_products = await self.profit_engine.calculate_profit_margins(collected_data)
            
            # レポート生成
            daily_report = await self.profit_engine.generate_daily_report(profitable_products)
            
            # 実行時間計算
            duration = (datetime.now() - start_time).total_seconds()
            
            # 結果返却
            return {
                'success': True,
                'collected_data': collected_data,
                'profitable_products': profitable_products,
                'daily_report': daily_report,
                'execution_time': duration,
                'summary': {
                    'rakuten_products': len(rakuten_data),
                    'yahoo_products': len(yahoo_data),
                    'profitable_products': len(profitable_products),
                    'total_potential_profit': sum(p['profit_analysis'].profit for p in profitable_products)
                }
            }
        
        except Exception as e:
            self.logger.error(f"収集システムエラー: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'execution_time': (datetime.now() - start_time).total_seconds()
            }
        
        finally:
            # セッションクリーンアップ
            await self.scraper.close_all_sessions()

    async def _collect_rakuten_products(self, config: Dict) -> List[Dict]:
        """楽天商品収集"""
        self.logger.info("楽天商品収集開始")
        
        # カテゴリ別収集
        category_ids = config.get('category_ids', [
            '100026',  # パソコン・周辺機器
            '101070',  # スマートフォン・タブレット
            '100939',  # TV・オーディオ・カメラ
            '101205'   # ゲーム
        ])
        
        all_products = []
        
        try:
            # ランキング商品収集
            ranking_products = await self.rakuten_scraper.search_ranking_products(
                category_ids, max_pages=2
            )
            
            # 詳細情報取得（一部商品のみ）
            detail_products = []
            for product in ranking_products[:20]:  # 上位20商品の詳細取得
                try:
                    if product.get('product_url'):
                        details = await self.rakuten_scraper.get_product_details(product['product_url'])
                        if details:
                            product.update(details)
                        detail_products.append(product)
                        
                        # 間隔調整
                        await asyncio.sleep(random.uniform(3, 8))
                
                except Exception as e:
                    self.logger.warning(f"楽天商品詳細取得エラー: {str(e)}")
                    continue
            
            all_products.extend(detail_products)
            
        except Exception as e:
            self.logger.error(f"楽天収集エラー: {str(e)}")
        
        self.logger.info(f"楽天商品収集完了: {len(all_products)}商品")
        return all_products

    async def _collect_yahoo_products(self, config: Dict) -> List[Dict]:
        """ヤフオク商品収集"""
        self.logger.info("ヤフオク商品収集開始")
        
        # キーワード別収集
        keywords = config.get('keywords', [
            'iPhone',
            'Nintendo Switch',
            'PlayStation',
            'Canon',
            'MacBook'
        ])
        
        all_products = []
        
        try:
            # オークション検索
            auction_products = await self.yahoo_scraper.search_auctions(keywords)
            
            # 詳細情報取得（一部商品のみ）
            detail_products = []
            for product in auction_products[:15]:  # 上位15商品の詳細取得
                try:
                    if product.get('auction_url'):
                        details = await self.yahoo_scraper.get_auction_details(product['auction_url'])
                        if details:
                            product.update(details)
                        detail_products.append(product)
                        
                        # 間隔調整
                        await asyncio.sleep(random.uniform(5, 12))
                
                except Exception as e:
                    self.logger.warning(f"ヤフオク商品詳細取得エラー: {str(e)}")
                    continue
            
            all_products.extend(detail_products)
            
        except Exception as e:
            self.logger.error(f"ヤフオク収集エラー: {str(e)}")
        
        self.logger.info(f"ヤフオク商品収集完了: {len(all_products)}商品")
        return all_products

# ===============================
# 10. メインシステム統合
# ===============================

class ArbitrageMainSystem:
    def __init__(self, config: Dict = None):
        self.config = config or self._load_default_config()
        self.db = DatabaseManager(self.config.get('db_path', 'arbitrage_system.db'))
        self.scraper = AntiDetectionScraper()
        self.collector = TimeDistributedCollector(self.scraper)
        self.logger = self._setup_logger()

    def _load_default_config(self) -> Dict:
        """デフォルト設定読み込み"""
        return {
            'db_path': 'arbitrage_system.db',
            'collection_schedule': {
                'rakuten': {
                    'category_ids': ['100026', '101070', '100939', '101205'],
                    'max_pages': 2
                },
                'yahoo_auction': {
                    'keywords': ['iPhone', 'Nintendo Switch', 'PlayStation', 'Canon', 'MacBook'],
                    'max_products': 15
                }
            },
            'profit_thresholds': {
                'min_profit': 1000,
                'min_margin': 20,
                'min_price': 2000
            },
            'alerts': {
                'email_notifications': False,
                'log_level': 'INFO'
            }
        }

    def _setup_logger(self):
        """ロガー設定"""
        logger = logging.getLogger('ArbitrageMainSystem')
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            # ファイルハンドラ
            file_handler = logging.FileHandler('arbitrage_system.log', encoding='utf-8')
            file_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
            
            # コンソールハンドラ
            console_handler = logging.StreamHandler()
            console_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)
        
        return logger

    async def run_daily_collection(self) -> Dict:
        """日次収集実行"""
        self.logger.info("=" * 60)
        self.logger.info("楽天・ヤフオク → Amazon転売システム 開始")
        self.logger.info("=" * 60)
        
        try:
            # 収集実行
            results = await self.collector.execute_daily_collection(
                self.config['collection_schedule']
            )
            
            if results['success']:
                # データベース保存
                await self._save_results_to_db(results)
                
                # レポート出力
                self._output_report(results)
                
                self.logger.info("日次収集処理完了")
                self.logger.info(f"実行時間: {results['execution_time']:.1f}秒")
                self.logger.info(f"収集商品数: {results['summary']['rakuten_products'] + results['summary']['yahoo_products']}")
                self.logger.info(f"利益商品数: {results['summary']['profitable_products']}")
                self.logger.info(f"総利益予想: {results['summary']['total_potential_profit']:,.0f}円")
            
            else:
                self.logger.error(f"収集処理失敗: {results['error']}")
            
            return results
        
        except Exception as e:
            self.logger.error(f"システムエラー: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def _save_results_to_db(self, results: Dict):
        """結果をデータベースに保存"""
        try:
            # 収集サマリ保存
            today = datetime.now().strftime('%Y-%m-%d')
            
            for source_type in ['rakuten', 'yahoo_auction']:
                products = results['collected_data'][source_type]
                profitable_count = len([p for p in results['profitable_products'] if p['source'] == source_type])
                
                if profitable_count > 0:
                    avg_margin = sum(p['profit_analysis'].profit_margin for p in results['profitable_products'] if p['source'] == source_type) / profitable_count
                    total_profit = sum(p['profit_analysis'].profit for p in results['profitable_products'] if p['source'] == source_type)
                else:
                    avg_margin = 0
                    total_profit = 0
                
                summary = {
                    'products_collected': len(products),
                    'products_analyzed': len(products),
                    'profitable_products': profitable_count,
                    'total_potential_profit': total_profit,
                    'average_margin': avg_margin,
                    'collection_duration': results['execution_time']
                }
                
                self.db.save_collection_summary(today, source_type, summary)
            
            self.logger.info("データベース保存完了")
        
        except Exception as e:
            self.logger.error(f"データベース保存エラー: {str(e)}")

    def _output_report(self, results: Dict):
        """レポート出力"""
        try:
            report = results['daily_report']
            
            print("\n" + "=" * 80)
            print(f"📊 日次レポート - {report['date']}")
            print("=" * 80)
            
            print(f"\n📈 収集サマリ:")
            print(f"  総商品数: {report['summary']['total_products_found']}件")
            print(f"  平均利益: {report['summary']['average_profit']:,.0f}円")
            print(f"  平均利益率: {report['summary']['average_margin']:.1f}%")
            print(f"  最大利益: {report['summary']['max_profit']:,.0f}円")
            print(f"  総利益予想: {report['summary']['total_potential_profit']:,.0f}円")
            
            print(f"\n📦 仕入先別:")
            for source, count in report['summary']['source_breakdown'].items():
                source_name = '楽天' if source == 'rakuten' else 'ヤフオク'
                print(f"  {source_name}: {count}件")
            
            print(f"\n🏆 トップ5利益商品:")
            for i, product in enumerate(report['top_products'][:5], 1):
                print(f"  {i}. {product['title']}")
                print(f"     利益: {product['profit']:,.0f}円 ({product['margin']:.1f}%)")
                print(f"     仕入: {product['source_price']:,.0f}円 → 販売: {product['amazon_price']:,.0f}円")
                print(f"     ソース: {product['source']} | スコア: {product['priority_score']:.1f}")
                print()
            
            print(f"💡 推奨アクション:")
            for rec in report['recommendations']:
                print(f"  • {rec}")
            
            print("=" * 80)
            
        except Exception as e:
            self.logger.error(f"レポート出力エラー: {str(e)}")

    def get_system_status(self) -> Dict:
        """システム状態取得"""
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                
                # 今日の統計
                cursor.execute("""
                    SELECT 
                        SUM(products_collected) as total_collected,
                        SUM(profitable_products) as total_profitable,
                        AVG(average_margin) as avg_margin,
                        SUM(total_potential_profit) as total_profit
                    FROM collection_history 
                    WHERE collection_date = date('now')
                """)
                
                today_stats = cursor.fetchone()
                
                # 過去7日間の統計
                cursor.execute("""
                    SELECT 
                        AVG(products_collected) as avg_collected,
                        AVG(profitable_products) as avg_profitable,
                        AVG(average_margin) as avg_margin
                    FROM collection_history 
                    WHERE collection_date >= date('now', '-7 days')
                """)
                
                week_stats = cursor.fetchone()
                
                return {
                    'today': {
                        'collected': today_stats['total_collected'] or 0,
                        'profitable': today_stats['total_profitable'] or 0,
                        'avg_margin': today_stats['avg_margin'] or 0,
                        'total_profit': today_stats['total_profit'] or 0
                    },
                    'week_average': {
                        'collected': week_stats['avg_collected'] or 0,
                        'profitable': week_stats['avg_profitable'] or 0,
                        'avg_margin': week_stats['avg_margin'] or 0
                    },
                    'last_update': datetime.now().isoformat()
                }
        
        except Exception as e:
            self.logger.error(f"システム状態取得エラー: {str(e)}")
            return {'error': str(e)}

# ===============================
# 11. 実行エントリポイント
# ===============================

async def main():
    """メイン実行関数"""
    # システム初期化
    system = ArbitrageMainSystem()
    
    print("🚀 楽天・ヤフオク → Amazon転売システム")
    print("=" * 60)
    
    try:
        # 日次収集実行
        results = await system.run_daily_collection()
        
        if results['success']:
            print("\n✅ 処理完了! 詳細は上記レポートをご確認ください。")
        else:
            print(f"\n❌ 処理失敗: {results['error']}")
    
    except KeyboardInterrupt:
        print("\n⚠️ ユーザーによる中断")
    
    except Exception as e:
        print(f"\n💥 予期しないエラー: {str(e)}")
    
    finally:
        print("システム終了")

if __name__ == "__main__":
    # ログレベル設定
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # メイン実行
    asyncio.run(main())