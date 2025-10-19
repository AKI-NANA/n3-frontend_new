# ヤフオク-Amazon転売システム 完全バックエンド実装

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

class ListingStrategy(Enum):
    EXISTING_ASIN = "existing_asin"  # 既存ASIN相乗り
    NEW_PRODUCT = "new_product"      # 新規商品登録

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class YahooAuctionProduct:
    id: Optional[int]
    auction_id: str
    title: str
    current_price: float
    end_time: datetime
    seller_name: str
    condition: ProductCondition
    category: Optional[str]
    brand: Optional[str]
    description: str
    image_urls: List[str]
    view_count: int
    bid_count: int
    instant_buy_price: Optional[float]
    shipping_cost: float
    seller_rating: float
    is_store: bool
    scraped_at: datetime
    status: ProductStatus = ProductStatus.PENDING

@dataclass
class AmazonProductInfo:
    asin: Optional[str]
    title: str
    category: str
    current_prices: Dict[str, float]  # condition -> price
    sales_rank: Optional[int]
    review_count: int
    rating: float
    dimensions: Dict
    weight: float
    brand: Optional[str]
    model: Optional[str]
    jan_code: Optional[str]
    exists_on_amazon: bool

@dataclass
class ProfitAnalysis:
    yahoo_cost: float
    amazon_revenue: float
    shipping_cost: float
    amazon_fees: float
    packaging_cost: float
    total_cost: float
    profit: float
    profit_margin: float
    is_profitable: bool
    recommended_condition: ProductCondition
    recommended_price: float
    listing_strategy: ListingStrategy

@dataclass
class AmazonListing:
    id: Optional[int]
    sku: str
    asin: Optional[str]  # 新規登録の場合はNone
    yahoo_product_id: int
    listing_strategy: ListingStrategy
    condition: ProductCondition
    current_price: float
    quantity: int
    status: ProductStatus
    profit_margin: float
    last_sync_at: Optional[datetime]

@dataclass
class SystemAlert:
    alert_type: str
    severity: AlertSeverity
    title: str
    message: str
    related_sku: Optional[str]
    related_asin: Optional[str]
    created_at: datetime

# ===============================
# 2. データベース管理
# ===============================

class DatabaseManager:
    def __init__(self, db_path: str = "yahoo_amazon_system.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """データベース初期化"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # ヤフオク商品テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS yahoo_products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    auction_id TEXT UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    current_price REAL NOT NULL,
                    end_time TIMESTAMP,
                    seller_name TEXT,
                    condition TEXT,
                    category TEXT,
                    brand TEXT,
                    description TEXT,
                    image_urls TEXT,
                    view_count INTEGER DEFAULT 0,
                    bid_count INTEGER DEFAULT 0,
                    instant_buy_price REAL,
                    shipping_cost REAL DEFAULT 0,
                    seller_rating REAL DEFAULT 0,
                    is_store BOOLEAN DEFAULT FALSE,
                    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'pending'
                )
            """)
            
            # Amazon商品情報テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS amazon_product_info (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    yahoo_product_id INTEGER,
                    asin TEXT,
                    title TEXT,
                    category TEXT,
                    current_prices TEXT,  -- JSON形式
                    sales_rank INTEGER,
                    review_count INTEGER,
                    rating REAL,
                    dimensions TEXT,  -- JSON形式
                    weight REAL,
                    brand TEXT,
                    model TEXT,
                    jan_code TEXT,
                    exists_on_amazon BOOLEAN,
                    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (yahoo_product_id) REFERENCES yahoo_products(id)
                )
            """)
            
            # 利益分析テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS profit_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    yahoo_product_id INTEGER,
                    yahoo_cost REAL,
                    amazon_revenue REAL,
                    shipping_cost REAL,
                    amazon_fees REAL,
                    packaging_cost REAL,
                    total_cost REAL,
                    profit REAL,
                    profit_margin REAL,
                    is_profitable BOOLEAN,
                    recommended_condition TEXT,
                    recommended_price REAL,
                    listing_strategy TEXT,
                    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (yahoo_product_id) REFERENCES yahoo_products(id)
                )
            """)
            
            # Amazon出品テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS amazon_listings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sku TEXT UNIQUE NOT NULL,
                    asin TEXT,
                    yahoo_product_id INTEGER,
                    listing_strategy TEXT,
                    condition TEXT,
                    current_price REAL,
                    quantity INTEGER DEFAULT 1,
                    status TEXT DEFAULT 'active',
                    profit_margin REAL,
                    last_sync_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (yahoo_product_id) REFERENCES yahoo_products(id)
                )
            """)
            
            # 新規商品登録テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS new_product_registrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sku TEXT UNIQUE NOT NULL,
                    yahoo_product_id INTEGER,
                    product_data TEXT,  -- JSON形式の商品データ
                    registration_status TEXT DEFAULT 'pending',
                    amazon_asin TEXT,  -- 登録後に取得
                    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    error_message TEXT,
                    FOREIGN KEY (yahoo_product_id) REFERENCES yahoo_products(id)
                )
            """)
            
            # 価格履歴テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS price_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    amazon_listing_id INTEGER,
                    old_price REAL,
                    new_price REAL,
                    change_reason TEXT,
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (amazon_listing_id) REFERENCES amazon_listings(id)
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
                    related_sku TEXT,
                    related_asin TEXT,
                    resolved BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP
                )
            """)
            
            # インデックス作成
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_yahoo_auction_id ON yahoo_products(auction_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_amazon_asin ON amazon_product_info(asin)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_listings_sku ON amazon_listings(sku)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_profit_analysis_profitable ON profit_analysis(is_profitable)")
            
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
    
    def save_yahoo_product(self, product: YahooAuctionProduct) -> int:
        """ヤフオク商品保存"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO yahoo_products 
                (auction_id, title, current_price, end_time, seller_name, condition,
                 category, brand, description, image_urls, view_count, bid_count,
                 instant_buy_price, shipping_cost, seller_rating, is_store, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                product.auction_id, product.title, product.current_price,
                product.end_time.isoformat(), product.seller_name, product.condition.value,
                product.category, product.brand, product.description,
                json.dumps(product.image_urls), product.view_count, product.bid_count,
                product.instant_buy_price, product.shipping_cost, product.seller_rating,
                product.is_store, product.status.value
            ))
            conn.commit()
            return cursor.lastrowid
    
    def save_amazon_product_info(self, yahoo_product_id: int, amazon_info: AmazonProductInfo) -> int:
        """Amazon商品情報保存"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO amazon_product_info
                (yahoo_product_id, asin, title, category, current_prices, sales_rank,
                 review_count, rating, dimensions, weight, brand, model, jan_code, exists_on_amazon)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                yahoo_product_id, amazon_info.asin, amazon_info.title,
                amazon_info.category, json.dumps(amazon_info.current_prices),
                amazon_info.sales_rank, amazon_info.review_count, amazon_info.rating,
                json.dumps(amazon_info.dimensions), amazon_info.weight,
                amazon_info.brand, amazon_info.model, amazon_info.jan_code,
                amazon_info.exists_on_amazon
            ))
            conn.commit()
            return cursor.lastrowid
    
    def save_profit_analysis(self, yahoo_product_id: int, analysis: ProfitAnalysis) -> int:
        """利益分析保存"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO profit_analysis
                (yahoo_product_id, yahoo_cost, amazon_revenue, shipping_cost,
                 amazon_fees, packaging_cost, total_cost, profit, profit_margin,
                 is_profitable, recommended_condition, recommended_price, listing_strategy)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                yahoo_product_id, analysis.yahoo_cost, analysis.amazon_revenue,
                analysis.shipping_cost, analysis.amazon_fees, analysis.packaging_cost,
                analysis.total_cost, analysis.profit, analysis.profit_margin,
                analysis.is_profitable, analysis.recommended_condition.value,
                analysis.recommended_price, analysis.listing_strategy.value
            ))
            conn.commit()
            return cursor.lastrowid
    
    def get_pending_products(self, limit: int = 100) -> List[YahooAuctionProduct]:
        """処理待ち商品取得"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM yahoo_products 
                WHERE status = 'pending' 
                ORDER BY end_time ASC, current_price DESC 
                LIMIT ?
            """, (limit,))
            
            products = []
            for row in cursor.fetchall():
                products.append(YahooAuctionProduct(
                    id=row['id'],
                    auction_id=row['auction_id'],
                    title=row['title'],
                    current_price=row['current_price'],
                    end_time=datetime.fromisoformat(row['end_time']),
                    seller_name=row['seller_name'],
                    condition=ProductCondition(row['condition']),
                    category=row['category'],
                    brand=row['brand'],
                    description=row['description'],
                    image_urls=json.loads(row['image_urls']) if row['image_urls'] else [],
                    view_count=row['view_count'],
                    bid_count=row['bid_count'],
                    instant_buy_price=row['instant_buy_price'],
                    shipping_cost=row['shipping_cost'],
                    seller_rating=row['seller_rating'],
                    is_store=row['is_store'],
                    scraped_at=datetime.fromisoformat(row['scraped_at']),
                    status=ProductStatus(row['status'])
                ))
            return products
    
    def get_profitable_products(self, limit: int = 50) -> List[Dict]:
        """利益商品取得"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT yp.*, pa.* 
                FROM yahoo_products yp
                JOIN profit_analysis pa ON yp.id = pa.yahoo_product_id
                WHERE pa.is_profitable = TRUE
                AND yp.status = 'analyzed'
                ORDER BY pa.profit_margin DESC, pa.profit DESC
                LIMIT ?
            """, (limit,))
            
            return [dict(row) for row in cursor.fetchall()]

# ===============================
# 3. ヤフオクスクレイピングシステム
# ===============================

class YahooAuctionScraper:
    def __init__(self):
        self.session = None
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
        }
        self.rate_limit_delay = 3  # ヤフオクは厳しめに設定
        self.logger = logging.getLogger(__name__)
    
    async def init_session(self):
        """セッション初期化"""
        if not self.session:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(
                headers=self.headers,
                timeout=timeout,
                connector=aiohttp.TCPConnector(limit=2, limit_per_host=1)
            )
    
    async def close_session(self):
        """セッション終了"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def search_products(self, category_id: str = None, keyword: str = None, 
                            min_price: int = 1000, max_price: int = 50000,
                            condition: str = "used", page: int = 1) -> List[Dict]:
        """商品検索"""
        await self.init_session()
        
        # 検索URL構築
        base_url = "https://auctions.yahoo.co.jp/search/search"
        params = {
            'p': keyword or '',
            'category': category_id or '',
            'min': min_price,
            'max': max_price,
            'istatus': '1',  # 即決価格ありのみ
            'mode': '2',     # 終了順
            'page': page
        }
        
        # 中古条件フィルタ
        if condition == "used":
            params['istatus'] = '1'
        
        try:
            await asyncio.sleep(random.uniform(2, self.rate_limit_delay))
            
            async with self.session.get(base_url, params=params) as response:
                if response.status == 200:
                    html = await response.text()
                    return self.parse_search_results(html)
                else:
                    self.logger.error(f"検索失敗: Status {response.status}")
                    return []
        
        except Exception as e:
            self.logger.error(f"検索エラー: {str(e)}")
            return []
    
    def parse_search_results(self, html: str) -> List[Dict]:
        """検索結果解析"""
        soup = BeautifulSoup(html, 'html.parser')
        products = []
        
        # 商品リスト要素を探す
        product_elements = soup.find_all('div', class_=re.compile(r'.*Product.*|.*item.*'))
        
        for element in product_elements:
            try:
                product_data = self.extract_product_summary(element)
                if product_data:
                    products.append(product_data)
            except Exception as e:
                self.logger.warning(f"商品データ抽出エラー: {str(e)}")
                continue
        
        return products[:50]  # 最大50件
    
    def extract_product_summary(self, element) -> Optional[Dict]:
        """商品概要抽出"""
        try:
            # オークションID
            link_elem = element.find('a', href=True)
            if not link_elem:
                return None
            
            href = link_elem['href']
            auction_id_match = re.search(r'/([a-z]\d+)(?:/|\?|$)', href)
            if not auction_id_match:
                return None
            auction_id = auction_id_match.group(1)
            
            # タイトル
            title_elem = element.find(['h3', 'h4', 'span'], class_=re.compile(r'.*title.*|.*name.*'))
            title = title_elem.get_text(strip=True) if title_elem else "商品名不明"
            
            # 即決価格
            price_elem = element.find(['span', 'div'], class_=re.compile(r'.*price.*|.*bid.*'))
            current_price = self.extract_price_from_text(price_elem.get_text() if price_elem else "0")
            
            # 終了時間
            time_elem = element.find(['span', 'div'], class_=re.compile(r'.*time.*|.*end.*'))
            end_time = self.parse_end_time(time_elem.get_text() if time_elem else "")
            
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
            
            return {
                'auction_id': auction_id,
                'title': title,
                'current_price': current_price,
                'end_time': end_time,
                'bid_count': bid_count,
                'image_urls': [image_url] if image_url else [],
                'condition': ProductCondition.UNKNOWN
            }
        
        except Exception as e:
            self.logger.warning(f"商品概要抽出エラー: {str(e)}")
            return None
    
    async def get_product_details(self, auction_id: str) -> Optional[Dict]:
        """商品詳細取得"""
        await self.init_session()
        
        url = f"https://auctions.yahoo.co.jp/item/{auction_id}"
        
        try:
            await asyncio.sleep(random.uniform(2, self.rate_limit_delay))
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    return self.parse_product_details(html, auction_id)
                else:
                    self.logger.error(f"商品詳細取得失敗: {auction_id}")
                    return None
        
        except Exception as e:
            self.logger.error(f"商品詳細取得エラー: {auction_id} - {str(e)}")
            return None
    
    def parse_product_details(self, html: str, auction_id: str) -> Dict:
        """商品詳細解析"""
        soup = BeautifulSoup(html, 'html.parser')
        
        # 基本情報
        title = self.extract_title(soup)
        description = self.extract_description(soup)
        condition = self.extract_condition(soup, description)
        category = self.extract_category(soup)
        brand = self.extract_brand(soup, title, description)
        
        # 価格情報
        current_price = self.extract_current_price(soup)
        instant_buy_price = self.extract_instant_buy_price(soup)
        shipping_cost = self.extract_shipping_cost(soup)
        
        # 出品者情報
        seller_info = self.extract_seller_info(soup)
        
        # その他情報
        view_count = self.extract_view_count(soup)
        bid_count = self.extract_bid_count(soup)
        end_time = self.extract_end_time(soup)
        
        # 画像URL
        image_urls = self.extract_image_urls(soup)
        
        return {
            'title': title,
            'description': description,
            'condition': condition,
            'category': category,
            'brand': brand,
            'current_price': current_price,
            'instant_buy_price': instant_buy_price,
            'shipping_cost': shipping_cost,
            'seller_name': seller_info.get('name', ''),
            'seller_rating': seller_info.get('rating', 0.0),
            'is_store': seller_info.get('is_store', False),
            'view_count': view_count,
            'bid_count': bid_count,
            'end_time': end_time,
            'image_urls': image_urls
        }
    
    def extract_title(self, soup: BeautifulSoup) -> str:
        """タイトル抽出"""
        title_elem = soup.find('h1', class_=re.compile(r'.*title.*|.*ProductTitle.*'))
        return title_elem.get_text(strip=True) if title_elem else "商品名不明"
    
    def extract_description(self, soup: BeautifulSoup) -> str:
        """商品説明抽出"""
        desc_selectors = [
            '.ProductExplanation', '.ItemExplanation', 
            '[class*="explanation"]', '[class*="description"]'
        ]
        
        for selector in desc_selectors:
            desc_elem = soup.select_one(selector)
            if desc_elem:
                return desc_elem.get_text(strip=True)[:2000]  # 最大2000文字
        
        return ""
    
    def extract_condition(self, soup: BeautifulSoup, description: str) -> ProductCondition:
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
        
        # 説明文から判定
        desc_lower = description.lower()
        if any(keyword in desc_lower for keyword in ['新品', '未使用', '未開封']):
            return ProductCondition.NEW
        elif any(keyword in desc_lower for keyword in ['美品', 'ほぼ新品']):
            return ProductCondition.USED_LIKE_NEW
        elif any(keyword in desc_lower for keyword in ['中古', '使用済み']):
            return ProductCondition.USED_GOOD
        
        return ProductCondition.UNKNOWN
    
    def extract_brand(self, soup: BeautifulSoup, title: str, description: str) -> Optional[str]:
        """ブランド抽出"""
        # 有名ブランド一覧
        known_brands = [
            'Apple', 'Sony', 'Nintendo', 'Canon', 'Nikon', 'Panasonic',
            'Samsung', 'LG', 'Sharp', 'Toshiba', 'Fujitsu', 'NEC',
            'Microsoft', 'Google', 'Amazon', 'HP', 'Dell', 'Lenovo'
        ]
        
        full_text = (title + ' ' + description).lower()
        
        for brand in known_brands:
            if brand.lower() in full_text:
                return brand
        
        return None
    
    def extract_current_price(self, soup: BeautifulSoup) -> float:
        """現在価格抽出"""
        price_selectors = [
            '.Price--current', '.Price__current', 
            '[class*="price"][class*="current"]'
        ]
        
        for selector in price_selectors:
            price_elem = soup.select_one(selector)
            if price_elem:
                return self.extract_price_from_text(price_elem.get_text())
        
        return 0.0
    
    def extract_instant_buy_price(self, soup: BeautifulSoup) -> Optional[float]:
        """即決価格抽出"""
        instant_price_elem = soup.find(text=re.compile(r'即決価格|即売価格'))
        if instant_price_elem and instant_price_elem.parent:
            parent = instant_price_elem.parent
            price_text = parent.get_text()
            price = self.extract_price_from_text(price_text)
            return price if price > 0 else None
        
        return None
    
    def extract_shipping_cost(self, soup: BeautifulSoup) -> float:
        """送料抽出"""
        shipping_elem = soup.find(text=re.compile(r'送料|配送料'))
        if shipping_elem and shipping_elem.parent:
            shipping_text = shipping_elem.parent.get_text()
            
            if '無料' in shipping_text or 'free' in shipping_text.lower():
                return 0.0
            
            price = self.extract_price_from_text(shipping_text)
            if price > 0:
                return price
        
        return 500.0  # デフォルト送料
    
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
    
    def extract_seller_info(self, soup: BeautifulSoup) -> Dict:
        """出品者情報抽出"""
        seller_info = {'name': '', 'rating': 0.0, 'is_store': False}
        
        # 出品者名
        seller_elem = soup.find(['span', 'div'], class_=re.compile(r'.*seller.*|.*user.*'))
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
    
    def extract_view_count(self, soup: BeautifulSoup) -> int:
        """アクセス数抽出"""
        view_elem = soup.find(text=re.compile(r'\d+\s*アクセス'))
        if view_elem:
            view_match = re.search(r'(\d+)', view_elem)
            if view_match:
                return int(view_match.group(1))
        
        return 0
    
    def extract_bid_count(self, soup: BeautifulSoup) -> int:
        """入札数抽出"""
        bid_elem = soup.find(text=re.compile(r'\d+\s*入札'))
        if bid_elem:
            bid_match = re.search(r'(\d+)', bid_elem)
            if bid_match:
                return int(bid_match.group(1))
        
        return 0
    
    def extract_end_time(self, soup: BeautifulSoup) -> datetime:
        """終了時間抽出"""
        time_elem = soup.find(['span', 'div'], class_=re.compile(r'.*time.*|.*end.*'))
        if time_elem:
            time_text = time_elem.get_text()
            return self.parse_end_time(time_text)
        
        return datetime.now() + timedelta(days=7)  # デフォルト7日後
    
    def parse_end_time(self, time_text: str) -> datetime:
        """終了時間解析"""
        try:
            # "12月25日 22時30分" 形式
            time_match = re.search(r'(\d+)月(\d+)日\s*(\d+)時(\d+)分', time_text)
            if time_match:
                month, day, hour, minute = map(int, time_match.groups())
                year = datetime.now().year
                return datetime(year, month, day, hour, minute)
            
            # "3日後" 形式
            days_match = re.search(r'(\d+)日後', time_text)
            if days_match:
                days = int(days_match.group(1))
                return datetime.now() + timedelta(days=days)
            
        except Exception:
            pass
        
        return datetime.now() + timedelta(days=7)
    
    def extract_category(self, soup: BeautifulSoup) -> Optional[str]:
        """カテゴリ抽出"""
        # パンくずリストから
        breadcrumb_elem = soup.find(['nav', 'div'], class_=re.compile(r'.*breadcrumb.*'))
        if breadcrumb_elem:
            categories = [link.get_text(strip=True) for link in breadcrumb_elem.find_all('a')]
            if len(categories) > 1:
                return categories[-1]  # 最下位カテゴリ
        
        return None
    
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

# ===============================
# 4. Amazon商品検索・分析システム
# ===============================

class AmazonProductAnalyzer:
    def __init__(self, amazon_api):
        self.amazon_api = amazon_api
        self.logger = logging.getLogger(__name__)
    
    async def analyze_product(self, yahoo_product: YahooAuctionProduct) -> AmazonProductInfo:
        """ヤフオク商品のAmazon分析"""
        
        # 1. Amazon商品検索
        search_results = await self._search_amazon_products(yahoo_product)
        
        if not search_results:
            # Amazon上に類似商品なし
            return AmazonProductInfo(
                asin=None,
                title=yahoo_product.title,
                category='Unknown',
                current_prices={},
                sales_rank=None,
                review_count=0,
                rating=0.0,
                dimensions={},
                weight=0.0,
                brand=yahoo_product.brand,
                model=None,
                jan_code=None,
                exists_on_amazon=False
            )
        
        # 2. 最適な商品を選択
        best_match = self._select_best_match(search_results, yahoo_product)
        
        # 3. 詳細情報取得
        product_details = await self._get_product_details(best_match['asin'])
        
        # 4. 価格情報取得
        price_info = await self._get_price_information(best_match['asin'])
        
        return AmazonProductInfo(
            asin=best_match['asin'],
            title=product_details.get('title', yahoo_product.title),
            category=product_details.get('category', 'Unknown'),
            current_prices=price_info,
            sales_rank=product_details.get('sales_rank'),
            review_count=product_details.get('review_count', 0),
            rating=product_details.get('rating', 0.0),
            dimensions=product_details.get('dimensions', {}),
            weight=product_details.get('weight', 0.0),
            brand=product_details.get('brand', yahoo_product.brand),
            model=product_details.get('model'),
            jan_code=product_details.get('jan_code'),
            exists_on_amazon=True
        )
    
    async def _search_amazon_products(self, yahoo_product: YahooAuctionProduct) -> List[Dict]:
        """Amazon商品検索"""
        search_results = []
        
        try:
            # 1. ブランド + 主要キーワード検索
            if yahoo_product.brand:
                main_keywords = self._extract_main_keywords(yahoo_product.title)
                for keyword in main_keywords[:2]:
                    search_query = f"{yahoo_product.brand} {keyword}"
                    results = await self.amazon_api.search_products(search_query)
                    search_results.extend(results)
            
            # 2. 商品名検索
            cleaned_title = self._clean_title_for_search(yahoo_product.title)
            results = await self.amazon_api.search_products(cleaned_title)
            search_results.extend(results)
            
            # 3. 重複除去
            unique_results = self._deduplicate_results(search_results)
            
            return unique_results[:10]  # 上位10件
        
        except Exception as e:
            self.logger.error(f"Amazon商品検索エラー: {str(e)}")
            return []
    
    def _extract_main_keywords(self, title: str) -> List[str]:
        """主要キーワード抽出"""
        # ストップワード
        stop_words = {
            'の', 'に', 'を', 'は', 'が', 'で', 'と', 'から', 'まで', '用', '向け',
            '中古', '美品', 'ジャンク', '動作確認済み', '付属品', 'セット'
        }
        
        # 英数字・カタカナ・ひらがな・漢字のみ抽出
        cleaned_title = re.sub(r'[^\w\s]', ' ', title)
        words = cleaned_title.split()
        
        # ストップワード除去 & 長さフィルタ
        keywords = [
            word for word in words 
            if word not in stop_words and len(word) >= 2
        ]
        
        return keywords[:5]  # 上位5つ
    
    def _clean_title_for_search(self, title: str) -> str:
        """検索用タイトルクリーニング"""
        # 不要な情報を除去
        title = re.sub(r'[（）()【】\[\]｜|]', ' ', title)
        title = re.sub(r'中古|美品|ジャンク|動作確認済み', '', title)
        title = re.sub(r'\s+', ' ', title).strip()
        
        return title[:50]  # 最大50文字
    
    def _select_best_match(self, search_results: List[Dict], yahoo_product: YahooAuctionProduct) -> Dict:
        """最適マッチ選択"""
        if not search_results:
            return None
        
        best_match = None
        best_score = 0
        
        for result in search_results:
            score = self._calculate_match_score(result, yahoo_product)
            if score > best_score:
                best_score = score
                best_match = result
        
        return best_match if best_score > 0.3 else search_results[0]  # 閾値未満なら最初の結果
    
    def _calculate_match_score(self, amazon_result: Dict, yahoo_product: YahooAuctionProduct) -> float:
        """マッチスコア計算"""
        score = 0.0
        
        # タイトル類似度 (60%)
        title_similarity = self._calculate_title_similarity(
            amazon_result.get('title', ''), yahoo_product.title
        )
        score += title_similarity * 0.6
        
        # ブランド一致 (20%)
        if (yahoo_product.brand and amazon_result.get('brand') and 
            yahoo_product.brand.lower() == amazon_result.get('brand', '').lower()):
            score += 0.2
        
        # 価格妥当性 (20%)
        amazon_price = amazon_result.get('price', 0)
        if amazon_price > 0 and yahoo_product.current_price > 0:
            price_ratio = min(amazon_price, yahoo_product.current_price) / max(amazon_price, yahoo_product.current_price)
            if price_ratio > 0.3:  # 価格差が3倍以内
                score += price_ratio * 0.2
        
        return score
    
    def _calculate_title_similarity(self, title1: str, title2: str) -> float:
        """タイトル類似度計算"""
        # 前処理
        clean_title1 = self._clean_title_for_comparison(title1)
        clean_title2 = self._clean_title_for_comparison(title2)
        
        # 文字列類似度
        return SequenceMatcher(None, clean_title1, clean_title2).ratio()
    
    def _clean_title_for_comparison(self, title: str) -> str:
        """比較用タイトルクリーニング"""
        title = re.sub(r'[（）()【】\[\]｜|]', ' ', title)
        title = re.sub(r'[^\w\s]', ' ', title)
        title = ' '.join(title.lower().split())
        return title
    
    def _deduplicate_results(self, results: List[Dict]) -> List[Dict]:
        """結果の重複除去"""
        seen_asins = set()
        unique_results = []
        
        for result in results:
            asin = result.get('asin')
            if asin and asin not in seen_asins:
                seen_asins.add(asin)
                unique_results.append(result)
        
        return unique_results
    
    async def _get_product_details(self, asin: str) -> Dict:
        """商品詳細取得"""
        try:
            return await self.amazon_api.get_product_details(asin)
        except Exception as e:
            self.logger.error(f"商品詳細取得エラー: {asin} - {str(e)}")
            return {}
    
    async def _get_price_information(self, asin: str) -> Dict[str, float]:
        """価格情報取得（コンディション別）"""
        try:
            offers = await self.amazon_api.get_offers(asin)
            
            price_info = {}
            for offer in offers:
                condition = offer.get('condition', 'unknown')
                price = offer.get('price', 0)
                
                if condition not in price_info or price < price_info[condition]:
                    price_info[condition] = price
            
            return price_info
        
        except Exception as e:
            self.logger.error(f"価格情報取得エラー: {asin} - {str(e)}")
            return {}

# ===============================
# 5. Amazon SP-API モック実装（拡張版）
# ===============================

class AmazonSPAPIMock:
    """Amazon SP-API モック実装（新規商品登録対応）"""
    
    def __init__(self, credentials: Dict):
        self.client_id = credentials.get('client_id')
        self.client_secret = credentials.get('client_secret')
        self.refresh_token = credentials.get('refresh_token')
        self.marketplace_id = 'A1VC38T7YXB528'  # 日本
        self.logger = logging.getLogger(__name__)
        
        # モックデータ
        self.mock_products = self._initialize_mock_data()
        self.pending_registrations = {}  # 新規商品登録待ち
    
    def _initialize_mock_data(self):
        """モックデータ初期化"""
        return {
            'B01234567X': {
                'asin': 'B01234567X',
                'title': 'iPhone 15 ケース',
                'category': 'Electronics',
                'brand': 'Apple',
                'model': 'iPhone15Case',
                'offers': {
                    'new': [2980, 3200, 2750],
                    'used_like_new': [2500, 2700],
                    'used_very_good': [2200, 2400],
                    'used_good': [1800, 2000],
                    'used_acceptable': [1500, 1600]
                },
                'sales_rank': 15000,
                'review_count': 120,
                'rating': 4.2,
                'dimensions': {'length': 15, 'width': 8, 'height': 1},
                'weight': 50
            }
        }
    
    async def search_products(self, keywords: str, marketplace_ids: List[str] = None) -> List[Dict]:
        """商品検索（モック）"""
        await asyncio.sleep(0.1)
        
        results = []
        
        # キーワードに基づくモック結果生成
        for i in range(random.randint(2, 5)):
            asin = f"B{abs(hash(keywords + str(i))) % 1000000000:09d}X"
            
            # 価格をキーワードベースで生成
            base_price = 1000 + (abs(hash(keywords)) % 10000)
            
            results.append({
                'asin': asin,
                'title': f'{keywords} 関連商品 {i+1}',
                'brand': self._extract_brand_from_keywords(keywords),
                'price': base_price + random.randint(-500, 1000),
                'category': self._determine_category_from_keywords(keywords)
            })
        
        return results
    
    def _extract_brand_from_keywords(self, keywords: str) -> Optional[str]:
        """キーワードからブランド抽出"""
        known_brands = ['Apple', 'Sony', 'Nintendo', 'Canon', 'Samsung']
        for brand in known_brands:
            if brand.lower() in keywords.lower():
                return brand
        return None
    
    def _determine_category_from_keywords(self, keywords: str) -> str:
        """キーワードからカテゴリ判定"""
        if any(word in keywords.lower() for word in ['iphone', 'android', 'phone']):
            return 'Electronics'
        elif any(word in keywords.lower() for word in ['game', 'nintendo', 'playstation']):
            return 'Video Games'
        elif any(word in keywords.lower() for word in ['camera', 'lens', 'canon']):
            return 'Camera & Photo'
        else:
            return 'Electronics'
    
    async def get_product_details(self, asin: str) -> Dict:
        """商品詳細取得（モック）"""
        await asyncio.sleep(0.1)
        
        if asin in self.mock_products:
            return self.mock_products[asin].copy()
        
        # ランダムな商品詳細生成
        return {
            'asin': asin,
            'title': f'商品 {asin}',
            'category': random.choice(['Electronics', 'Home & Kitchen', 'Sports']),
            'brand': random.choice(['Unknown', 'Generic', 'NoName']),
            'sales_rank': random.randint(10000, 500000),
            'review_count': random.randint(0, 100),
            'rating': random.uniform(3.0, 4.8),
            'dimensions': {'length': 20, 'width': 15, 'height': 5},
            'weight': random.randint(50, 500)
        }
    
    async def get_offers(self, asin: str) -> List[Dict]:
        """出品者・価格情報取得（モック）"""
        await asyncio.sleep(0.1)
        
        offers = []
        conditions = ['new', 'used_like_new', 'used_very_good', 'used_good', 'used_acceptable']
        
        for condition in conditions:
            # 各コンディションで複数の出品者を生成
            for _ in range(random.randint(1, 3)):
                base_price = random.randint(1000, 5000)
                # コンディションに応じて価格調整
                if condition == 'new':
                    price = base_price
                elif condition == 'used_like_new':
                    price = int(base_price * 0.85)
                elif condition == 'used_very_good':
                    price = int(base_price * 0.75)
                elif condition == 'used_good':
                    price = int(base_price * 0.65)
                else:  # used_acceptable
                    price = int(base_price * 0.55)
                
                offers.append({
                    'seller_id': f'SELLER_{random.randint(100, 999)}',
                    'condition': condition,
                    'price': price,
                    'shipping_cost': random.choice([0, 300, 500])
                })
        
        return offers
    
    async def create_listing_existing_asin(self, listing_data: Dict) -> Dict:
        """既存ASIN相乗り出品（モック）"""
        await asyncio.sleep(0.2)
        
        # 成功レスポンスモック
        return {
            'status': 'ACCEPTED',
            'submissionId': str(uuid.uuid4()),
            'sku': listing_data.get('sku'),
            'asin': listing_data.get('asin'),
            'issues': []
        }
    
    async def create_new_product(self, product_data: Dict) -> Dict:
        """新規商品登録（モック）"""
        await asyncio.sleep(1.0)  # 新規登録は時間がかかる
        
        sku = product_data.get('sku')
        
        # 新しいASIN生成
        new_asin = f"B{random.randint(100000000, 999999999):09d}X"
        
        # 登録成功をシミュレート（90%の確率で成功）
        if random.random() < 0.9:
            self.pending_registrations[sku] = {
                'status': 'PROCESSING',
                'asin': new_asin,
                'submitted_at': datetime.now()
            }
            
            return {
                'status': 'ACCEPTED',
                'submissionId': str(uuid.uuid4()),
                'sku': sku,
                'message': '新規商品登録を受け付けました。処理中です。'
            }
        else:
            return {
                'status': 'REJECTED',
                'sku': sku,
                'errors': [
                    {
                        'code': 'INVALID_PRODUCT_DATA',
                        'message': '商品データに不備があります'
                    }
                ]
            }
    
    async def check_registration_status(self, sku: str) -> Dict:
        """新規商品登録状況確認（モック）"""
        await asyncio.sleep(0.1)
        
        if sku not in self.pending_registrations:
            return {
                'status': 'NOT_FOUND',
                'sku': sku
            }
        
        registration = self.pending_registrations[sku]
        
        # 登録から5分経過で完了とする
        if datetime.now() - registration['submitted_at'] > timedelta(minutes=5):
            registration['status'] = 'COMPLETED'
            
            return {
                'status': 'COMPLETED',
                'sku': sku,
                'asin': registration['asin'],
                'message': '新規商品登録が完了しました'
            }
        else:
            return {
                'status': 'PROCESSING',
                'sku': sku,
                'message': '新規商品登録処理中です'
            }
    
    async def update_price_and_quantity(self, sku: str, price: float = None, quantity: int = None) -> Dict:
        """価格・在庫更新（モック）"""
        await asyncio.sleep(0.1)
        
        return {
            'status': 'ACCEPTED',
            'sku': sku,
            'updates': {
                'price': price,
                'quantity': quantity
            }
        }
    
    async def delete_listing(self, sku: str) -> Dict:
        """出品削除（モック）"""
        await asyncio.sleep(0.1)
        
        return {
            'status': 'ACCEPTED',
            'sku': sku,
            'message': 'Listing deleted successfully'
        }

# ===============================
# 6. 利益計算システム
# ===============================

class ProfitCalculator:
    def __init__(self):
        # Amazon手数料設定（カテゴリ別）
        self.amazon_fees = {
            'Electronics': 0.08,
            'Video Games': 0.15,
            'Camera & Photo': 0.08,
            'Sports & Outdoors': 0.15,
            'Home & Kitchen': 0.15,
            'Books': 0.15,
            'default': 0.10
        }
        
        # FBA手数料
        self.fba_fees = {
            'small_standard': 318,
            'large_standard': 434,
            'small_oversize': 514,
            'medium_oversize': 648,
            'large_oversize': 972
        }
        
        # その他コスト
        self.other_costs = {
            'packaging_cost': 100,      # 梱包コスト
            'inspection_cost': 200,     # 検品コスト（中古品）
            'storage_cost': 50,         # 一時保管コスト
            'credit_card_fee': 0.024    # クレジットカード手数料
        }
        
        # 新規商品登録の追加コスト
        self.new_product_costs = {
            'registration_fee': 500,    # 登録手数料相当
            'photography_cost': 1000,   # 撮影コスト
            'description_cost': 500     # 商品説明作成コスト
        }
    
    def calculate_profit(self, yahoo_product: YahooAuctionProduct, 
                        amazon_info: AmazonProductInfo) -> ProfitAnalysis:
        """利益分析計算"""
        
        # 購入価格決定（即決価格優先）
        purchase_price = yahoo_product.instant_buy_price or yahoo_product.current_price
        
        # Amazon販売戦略決定
        if amazon_info.exists_on_amazon:
            strategy = ListingStrategy.EXISTING_ASIN
            recommended_condition, recommended_price = self._determine_best_condition_and_price(
                yahoo_product, amazon_info
            )
        else:
            strategy = ListingStrategy.NEW_PRODUCT
            recommended_condition = yahoo_product.condition
            recommended_price = self._calculate_new_product_price(yahoo_product)
        
        # コスト計算
        yahoo_cost = purchase_price + yahoo_product.shipping_cost
        yahoo_cost += yahoo_cost * self.other_costs['credit_card_fee']  # カード手数料
        
        # Amazon手数料計算
        referral_fee = recommended_price * self.amazon_fees.get(
            amazon_info.category, self.amazon_fees['default']
        )
        
        # FBA手数料
        fba_fee = self._calculate_fba_fee(amazon_info.weight, amazon_info.dimensions)
        
        # その他コスト
        packaging_cost = self.other_costs['packaging_cost']
        inspection_cost = self.other_costs['inspection_cost'] if yahoo_product.condition != ProductCondition.NEW else 0
        storage_cost = self.other_costs['storage_cost']
        
        # 新規商品登録の場合の追加コスト
        additional_cost = 0
        if strategy == ListingStrategy.NEW_PRODUCT:
            additional_cost = (
                self.new_product_costs['registration_fee'] +
                self.new_product_costs['photography_cost'] +
                self.new_product_costs['description_cost']
            )
        
        # 総コスト
        total_cost = (
            yahoo_cost + referral_fee + fba_fee + packaging_cost + 
            inspection_cost + storage_cost + additional_cost
        )
        
        # 利益計算
        profit = recommended_price - total_cost
        profit_margin = (profit / recommended_price) * 100 if recommended_price > 0 else 0
        
        return ProfitAnalysis(
            yahoo_cost=yahoo_cost,
            amazon_revenue=recommended_price,
            shipping_cost=yahoo_product.shipping_cost,
            amazon_fees=referral_fee + fba_fee,
            packaging_cost=packaging_cost + inspection_cost + storage_cost + additional_cost,
            total_cost=total_cost,
            profit=profit,
            profit_margin=profit_margin,
            is_profitable=self._is_profitable(profit, profit_margin, recommended_price),
            recommended_condition=recommended_condition,
            recommended_price=recommended_price,
            listing_strategy=strategy
        )
    
    def _determine_best_condition_and_price(self, yahoo_product: YahooAuctionProduct, 
                                          amazon_info: AmazonProductInfo) -> Tuple[ProductCondition, float]:
        """最適なコンディションと価格決定"""
        
        # ヤフオク商品のコンディションに基づく候補
        condition_candidates = []
        
        if yahoo_product.condition == ProductCondition.NEW:
            condition_candidates = [ProductCondition.NEW, ProductCondition.USED_LIKE_NEW]
        elif yahoo_product.condition == ProductCondition.USED_LIKE_NEW:
            condition_candidates = [ProductCondition.USED_LIKE_NEW, ProductCondition.USED_VERY_GOOD]
        elif yahoo_product.condition == ProductCondition.USED_VERY_GOOD:
            condition_candidates = [ProductCondition.USED_VERY_GOOD, ProductCondition.USED_GOOD]
        elif yahoo_product.condition == ProductCondition.USED_GOOD:
            condition_candidates = [ProductCondition.USED_GOOD, ProductCondition.USED_ACCEPTABLE]
        else:
            condition_candidates = [ProductCondition.USED_ACCEPTABLE]
        
        # 各候補の期待利益を計算
        best_condition = yahoo_product.condition
        best_price = 0
        best_profit = -float('inf')
        
        for condition in condition_candidates:
            condition_key = condition.value
            
            if condition_key in amazon_info.current_prices:
                # 競合価格より少し安く設定
                competitor_price = amazon_info.current_prices[condition_key]
                our_price = competitor_price - 50  # 50円安く
                
                # 利益計算
                purchase_price = yahoo_product.instant_buy_price or yahoo_product.current_price
                estimated_profit = our_price - purchase_price - 1000  # 概算コスト1000円
                
                if estimated_profit > best_profit:
                    best_profit = estimated_profit
                    best_condition = condition
                    best_price = our_price
        
        # 価格が設定されなかった場合のフォールバック
        if best_price == 0:
            purchase_price = yahoo_product.instant_buy_price or yahoo_product.current_price
            best_price = purchase_price * 1.5  # 1.5倍で設定
        
        return best_condition, best_price
    
    def _calculate_new_product_price(self, yahoo_product: YahooAuctionProduct) -> float:
        """新規商品の販売価格計算"""
        purchase_price = yahoo_product.instant_buy_price or yahoo_product.current_price
        
        # 新規商品は高めに設定（競合がいないため）
        if yahoo_product.condition == ProductCondition.NEW:
            return purchase_price * 2.0  # 2倍
        else:
            return purchase_price * 1.8  # 1.8倍
    
    def _calculate_fba_fee(self, weight: float, dimensions: Dict) -> float:
        """FBA手数料計算"""
        # サイズ・重量に基づくFBA手数料
        if weight <= 250 and max(dimensions.get('length', 0), dimensions.get('width', 0), dimensions.get('height', 0)) <= 25:
            return self.fba_fees['small_standard']
        elif weight <= 2000:
            return self.fba_fees['large_standard']
        elif weight <= 9000:
            return self.fba_fees['small_oversize']
        elif weight <= 27000:
            return self.fba_fees['medium_oversize']
        else:
            return self.fba_fees['large_oversize']
    
    def _is_profitable(self, profit: float, profit_margin: float, price: float) -> bool:
        """利益判定"""
        return (
            profit >= 1000 and          # 最低利益額1000円
            profit_margin >= 20 and     # 最低利益率20%
            price >= 2000               # 最低販売価格2000円
        )

# ===============================
# 7. 商品フィルタリングシステム
# ===============================

class ProductFilter:
    def __init__(self):
        self.exclusion_criteria = {
            'banned_keywords': [
                'ジャンク', '故障', '破損', '部品取り', '動作不良',
                '液晶割れ', '画面割れ', 'バッテリー膨張', '水没',
                'コピー', '海賊版', '偽物', 'レプリカ'
            ],
            'banned_categories': [
                '自動車', 'バイク', '不動産', '生き物', 
                'アダルト', 'チケット', '金券'
            ],
            'banned_brands': [
                'ルイヴィトン', 'シャネル', 'エルメス', 'グッチ',
                'プラダ', 'ロレックス', 'オメガ'  # 偽物リスク
            ],
            'size_restrictions': {
                'max_weight': 20000,         # 最大重量20kg
                'max_dimension': 60          # 最大辺60cm
            }
        }
        
        self.priority_criteria = {
            'min_profit': 1000,             # 最低利益1000円
            'min_profit_margin': 20,        # 最低利益率20%
            'max_purchase_price': 30000,    # 最大購入価格3万円
            'min_seller_rating': 80,        # 最低出品者評価80%
            'max_shipping_cost': 1000       # 最大送料1000円
        }
    
    def should_purchase_product(self, yahoo_product: YahooAuctionProduct,
                               profit_analysis: ProfitAnalysis) -> Tuple[bool, str]:
        """購入可否判定"""
        
        # 1. 基本的な除外条件チェック
        is_excluded, reason = self._check_exclusion_criteria(yahoo_product)
        if is_excluded:
            return False, reason
        
        # 2. 利益基準チェック
        if not profit_analysis.is_profitable:
            return False, f"利益不足: 利益率{profit_analysis.profit_margin:.1f}%"
        
        # 3. 購入価格チェック
        purchase_price = yahoo_product.instant_buy_price or yahoo_product.current_price
        if purchase_price > self.priority_criteria['max_purchase_price']:
            return False, f"購入価格高額: {purchase_price}円"
        
        # 4. 出品者評価チェック
        if (yahoo_product.seller_rating > 0 and 
            yahoo_product.seller_rating < self.priority_criteria['min_seller_rating']):
            return False, f"出品者評価低: {yahoo_product.seller_rating}%"
        
        # 5. 送料チェック
        if yahoo_product.shipping_cost > self.priority_criteria['max_shipping_cost']:
            return False, f"送料高額: {yahoo_product.shipping_cost}円"
        
        return True, "購入推奨"
    
    def _check_exclusion_criteria(self, yahoo_product: YahooAuctionProduct) -> Tuple[bool, str]:
        """除外条件チェック"""
        
        # キーワードチェック
        title_desc = (yahoo_product.title + ' ' + yahoo_product.description).lower()
        for keyword in self.exclusion_criteria['banned_keywords']:
            if keyword in title_desc:
                return True, f"禁止キーワード: {keyword}"
        
        # カテゴリチェック
        if yahoo_product.category:
            for banned_cat in self.exclusion_criteria['banned_categories']:
                if banned_cat in yahoo_product.category:
                    return True, f"禁止カテゴリ: {banned_cat}"
        
        # ブランドチェック
        if yahoo_product.brand:
            for banned_brand in self.exclusion_criteria['banned_brands']:
                if banned_brand.lower() in yahoo_product.brand.lower():
                    return True, f"禁止ブランド: {banned_brand}"
        
        return False, ""
    
    def calculate_priority_score(self, yahoo_product: YahooAuctionProduct,
                               profit_analysis: ProfitAnalysis) -> float:
        """優先度スコア計算"""
        score = 0.0
        
        # 利益率スコア (0-40点)
        if profit_analysis.profit_margin >= 50:
            score += 40
        elif profit_analysis.profit_margin >= 30:
            score += 30
        elif profit_analysis.profit_margin >= 20:
            score += 20
        
        # 利益額スコア (0-25点)
        if profit_analysis.profit >= 5000:
            score += 25
        elif profit_analysis.profit >= 3000:
            score += 20
        elif profit_analysis.profit >= 1000:
            score += 15
        
        # 出品者信頼度スコア (0-15点)
        if yahoo_product.is_store:
            score += 15  # ストア出品は信頼度高
        elif yahoo_product.seller_rating >= 95:
            score += 12
        elif yahoo_product.seller_rating >= 90:
            score += 8
        elif yahoo_product.seller_rating >= 80:
            score += 5
        
        # 商品状態スコア (0-10点)
        if yahoo_product.condition == ProductCondition.NEW:
            score += 10
        elif yahoo_product.condition == ProductCondition.USED_LIKE_NEW:
            score += 8
        elif yahoo_product.condition == ProductCondition.USED_VERY_GOOD:
            score += 6
        elif yahoo_product.condition == ProductCondition.USED_GOOD:
            score += 4
        
        # 終了時間スコア (0-10点)
        time_to_end = yahoo_product.end_time - datetime.now()
        if time_to_end.total_seconds() <= 3600:  # 1時間以内
            score += 10  # 緊急度高
        elif time_to_end.total_seconds() <= 86400:  # 24時間以内
            score += 7
        elif time_to_end.total_seconds() <= 259200:  # 3日以内
            score += 5
        
        return score

# ===============================
# 8. Amazon出品管理システム
# ===============================

class AmazonListingManager:
    def __init__(self, amazon_api: AmazonSPAPIMock, db: DatabaseManager):
        self.amazon_api = amazon_api
        self.db = db
        self.logger = logging.getLogger(__name__)
    
    async def create_listing(self, yahoo_product: YahooAuctionProduct,
                           amazon_info: AmazonProductInfo, 
                           profit_analysis: ProfitAnalysis) -> Dict:
        """出品作成"""
        
        # SKU生成
        sku = f"YAH-{yahoo_product.auction_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        if profit_analysis.listing_strategy == ListingStrategy.EXISTING_ASIN:
            # 既存ASIN相乗り出品
            return await self._create_existing_asin_listing(
                sku, yahoo_product, amazon_info, profit_analysis
            )
        else:
            # 新規商品登録
            return await self._create_new_product_listing(
                sku, yahoo_product, amazon_info, profit_analysis
            )
    
    async def _create_existing_asin_listing(self, sku: str, yahoo_product: YahooAuctionProduct,
                                          amazon_info: AmazonProductInfo, 
                                          profit_analysis: ProfitAnalysis) -> Dict:
        """既存ASIN相乗り出品"""
        
        listing_data = {
            'sku': sku,
            'asin': amazon_info.asin,
            'condition': profit_analysis.recommended_condition.value,
            'price': profit_analysis.recommended_price,
            'quantity': 1,
            'condition_note': self._generate_condition_note(yahoo_product),
            'fulfillment_channel': 'AMAZON_NA'  # FBA
        }
        
        try:
            response = await self.amazon_api.create_listing_existing_asin(listing_data)
            
            if response.get('status') == 'ACCEPTED':
                # データベースに保存
                listing = AmazonListing(
                    id=None,
                    sku=sku,
                    asin=amazon_info.asin,
                    yahoo_product_id=yahoo_product.id,
                    listing_strategy=ListingStrategy.EXISTING_ASIN,
                    condition=profit_analysis.recommended_condition,
                    current_price=profit_analysis.recommended_price,
                    quantity=1,
                    status=ProductStatus.ACTIVE,
                    profit_margin=profit_analysis.profit_margin,
                    last_sync_at=datetime.now()
                )
                
                listing_id = self._save_listing_to_db(listing)
                
                self.logger.info(f"相乗り出品成功: SKU={sku}, ASIN={amazon_info.asin}")
                
                return {
                    'success': True,
                    'strategy': 'existing_asin',
                    'sku': sku,
                    'asin': amazon_info.asin,
                    'listing_id': listing_id
                }
            else:
                self.logger.error(f"相乗り出品失敗: {response}")
                return {'success': False, 'error': response}
        
        except Exception as e:
            self.logger.error(f"相乗り出品エラー: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def _create_new_product_listing(self, sku: str, yahoo_product: YahooAuctionProduct,
                                        amazon_info: AmazonProductInfo,
                                        profit_analysis: ProfitAnalysis) -> Dict:
        """新規商品登録"""
        
        # 新規商品データ構築
        product_data = {
            'sku': sku,
            'product_type': self._determine_product_type(amazon_info.category),
            'attributes': {
                'item_name': yahoo_product.title,
                'brand_name': yahoo_product.brand or 'ノーブランド',
                'manufacturer': yahoo_product.brand or 'ノーブランド',
                'condition_type': profit_analysis.recommended_condition.value,
                'item_description': self._generate_product_description(yahoo_product),
                'main_product_image_url': yahoo_product.image_urls[0] if yahoo_product.image_urls else '',
                'other_product_image_urls': yahoo_product.image_urls[1:6],  # 最大5枚追加
                'color_name': self._extract_color(yahoo_product.title),
                'size_name': self._extract_size(yahoo_product.title),
                'target_audience_keywords': self._generate_keywords(yahoo_product),
                'search_terms': self._generate_search_terms(yahoo_product)
            },
            'offer': {
                'condition': profit_analysis.recommended_condition.value,
                'price': profit_analysis.recommended_price,
                'quantity': 1,
                'fulfillment_channel': 'AMAZON_NA'
            }
        }
        
        try:
            response = await self.amazon_api.create_new_product(product_data)
            
            if response.get('status') == 'ACCEPTED':
                # 新規商品登録をデータベースに記録
                self._save_new_product_registration(sku, yahoo_product.id, product_data)
                
                self.logger.info(f"新規商品登録受付: SKU={sku}")
                
                return {
                    'success': True,
                    'strategy': 'new_product',
                    'sku': sku,
                    'status': 'processing',
                    'message': '新規商品登録を受け付けました'
                }
            else:
                self.logger.error(f"新規商品登録失敗: {response}")
                return {'success': False, 'error': response}
        
        except Exception as e:
            self.logger.error(f"新規商品登録エラー: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _generate_condition_note(self, yahoo_product: YahooAuctionProduct) -> str:
        """コンディション説明生成"""
        notes = []
        
        if yahoo_product.condition == ProductCondition.NEW:
            notes.append("新品未使用品です。")
        elif yahoo_product.condition == ProductCondition.USED_LIKE_NEW:
            notes.append("使用感はほとんどなく、非常に良好な状態です。")
        elif yahoo_product.condition == ProductCondition.USED_VERY_GOOD:
            notes.append("わずかな使用感はありますが、良好な状態です。")
        elif yahoo_product.condition == ProductCondition.USED_GOOD:
            notes.append("使用感はありますが、機能に問題はありません。")
        
        # 出品者情報
        if yahoo_product.is_store:
            notes.append("ストア出品品です。")
        
        # 評価情報
        if yahoo_product.seller_rating > 95:
            notes.append("評価の高い出品者からの購入品です。")
        
        return " ".join(notes)
    
    def _generate_product_description(self, yahoo_product: YahooAuctionProduct) -> str:
        """商品説明生成"""
        description_parts = []
        
        # 基本情報
        description_parts.append(f"商品名: {yahoo_product.title}")
        
        if yahoo_product.brand:
            description_parts.append(f"ブランド: {yahoo_product.brand}")
        
        if yahoo_product.category:
            description_parts.append(f"カテゴリ: {yahoo_product.category}")
        
        # 商品状態
        condition_desc = {
            ProductCondition.NEW: "新品未使用",
            ProductCondition.USED_LIKE_NEW: "ほぼ新品",
            ProductCondition.USED_VERY_GOOD: "非常に良い",
            ProductCondition.USED_GOOD: "良い",
            ProductCondition.USED_ACCEPTABLE: "可"
        }
        description_parts.append(f"コンディション: {condition_desc.get(yahoo_product.condition, '不明')}")
        
        # 元の説明文（要約）
        if yahoo_product.description:
            cleaned_desc = re.sub(r'[^\w\s]', ' ', yahoo_product.description)
            cleaned_desc = ' '.join(cleaned_desc.split())
            if len(cleaned_desc) > 200:
                cleaned_desc = cleaned_desc[:200] + "..."
            description_parts.append(f"詳細: {cleaned_desc}")
        
        # 注意事項
        description_parts.append("※中古品のため、商品の状態について気になる点がございましたらお気軽にお問い合わせください。")
        
        return "\n".join(description_parts)
    
    def _determine_product_type(self, category: str) -> str:
        """商品タイプ決定"""
        category_mapping = {
            'Electronics': 'CONSUMER_ELECTRONICS',
            'Video Games': 'VIDEO_GAMES',
            'Camera & Photo': 'CAMERA_VIDEO',
            'Sports & Outdoors': 'SPORTING_GOODS',
            'Home & Kitchen': 'HOME',
            'Books': 'BOOKS_1998'
        }
        
        return category_mapping.get(category, 'CONSUMER_ELECTRONICS')
    
    def _extract_color(self, title: str) -> Optional[str]:
        """タイトルから色抽出"""
        colors = [
            'ブラック', 'ホワイト', 'レッド', 'ブルー', 'グリーン',
            'イエロー', 'ピンク', 'パープル', 'オレンジ', 'グレー',
            '黒', '白', '赤', '青', '緑', '黄', 'ピンク', '紫'
        ]
        
        title_lower = title.lower()
        for color in colors:
            if color.lower() in title_lower:
                return color
        
        return None
    
    def _extract_size(self, title: str) -> Optional[str]:
        """タイトルからサイズ抽出"""
        size_patterns = [
            r'(\d+\.?\d*)(cm|mm|inch|インチ)',
            r'(S|M|L|XL|XXL)サイズ',
            r'(\d+)\s*(GB|TB)'
        ]
        
        for pattern in size_patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                return match.group(0)
        
        return None
    
    def _generate_keywords(self, yahoo_product: YahooAuctionProduct) -> List[str]:
        """キーワード生成"""
        keywords = []
        
        if yahoo_product.brand:
            keywords.append(yahoo_product.brand)
        
        if yahoo_product.category:
            keywords.append(yahoo_product.category)
        
        # タイトルから重要キーワード抽出
        title_words = re.findall(r'\w+', yahoo_product.title)
        important_words = [
            word for word in title_words 
            if len(word) >= 3 and word not in ['中古', '美品', 'ジャンク']
        ]
        keywords.extend(important_words[:5])
        
        return keywords[:10]  # 最大10個
    
    def _generate_search_terms(self, yahoo_product: YahooAuctionProduct) -> str:
        """検索キーワード生成"""
        keywords = self._generate_keywords(yahoo_product)
        return " ".join(keywords)
    
    def _save_listing_to_db(self, listing: AmazonListing) -> int:
        """出品情報をデータベースに保存"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO amazon_listings
                (sku, asin, yahoo_product_id, listing_strategy, condition,
                 current_price, quantity, status, profit_margin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                listing.sku, listing.asin, listing.yahoo_product_id,
                listing.listing_strategy.value, listing.condition.value,
                listing.current_price, listing.quantity, listing.status.value,
                listing.profit_margin
            ))
            conn.commit()
            return cursor.lastrowid
    
    def _save_new_product_registration(self, sku: str, yahoo_product_id: int, product_data: Dict):
        """新規商品登録をデータベースに保存"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO new_product_registrations
                (sku, yahoo_product_id, product_data, registration_status)
                VALUES (?, ?, ?, ?)
            """, (
                sku, yahoo_product_id, json.dumps(product_data), 'pending'
            ))
            conn.commit()
    
    async def check_registration_status(self, sku: str) -> Dict:
        """新規商品登録状況確認"""
        try:
            response = await self.amazon_api.check_registration_status(sku)
            
            if response.get('status') == 'COMPLETED':
                # 登録完了 - ASINを取得してリスティング作成
                asin = response.get('asin')
                
                if asin:
                    # データベース更新
                    with self.db.get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE new_product_registrations 
                            SET registration_status = 'completed', amazon_asin = ?, completed_at = CURRENT_TIMESTAMP
                            WHERE sku = ?
                        """, (asin, sku))
                        conn.commit()
                    
                    self.logger.info(f"新規商品登録完了: SKU={sku}, ASIN={asin}")
            
            return response
        
        except Exception as e:
            self.logger.error(f"登録状況確認エラー: {sku} - {str(e)}")
            return {'status': 'ERROR', 'error': str(e)}
    
    async def update_price_and_quantity(self, sku: str, price: float = None, quantity: int = None) -> Dict:
        """価格・在庫更新"""
        try:
            response = await self.amazon_api.update_price_and_quantity(sku, price, quantity)
            
            if response.get('status') == 'ACCEPTED':
                # データベース更新
                with self.db.get_connection() as conn:
                    cursor = conn.cursor()
                    
                    updates = []
                    params = []
                    
                    if price is not None:
                        updates.append("current_price = ?")
                        params.append(price)
                    
                    if quantity is not None:
                        updates.append("quantity = ?")
                        params.append(quantity)
                    
                    if updates:
                        updates.append("updated_at = CURRENT_TIMESTAMP")
                        params.append(sku)
                        
                        cursor.execute(f"""
                            UPDATE amazon_listings 
                            SET {', '.join(updates)}
                            WHERE sku = ?
                        """, params)
                        conn.commit()
                
                self.logger.info(f"価格・在庫更新成功: SKU={sku}")
                
            return response
        
        except Exception as e:
            self.logger.error(f"価格・在庫更新エラー: {sku} - {str(e)}")
            return {'success': False, 'error': str(e)}

# ===============================
# 9. 在庫・価格監視システム
# ===============================

class InventoryPriceManager:
    def __init__(self, db: DatabaseManager, amazon_api: AmazonSPAPIMock, listing_manager: AmazonListingManager):
        self.db = db
        self.amazon_api = amazon_api
        self.listing_manager = listing_manager
        self.logger = logging.getLogger(__name__)
    
    async def monitor_all_listings(self) -> Dict:
        """全出品監視"""
        results = {
            'total_checked': 0,
            'price_updates': 0,
            'quantity_updates': 0,
            'errors': 0,
            'details': []
        }
        
        # アクティブな出品取得
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM amazon_listings 
                WHERE status = 'active'
                ORDER BY updated_at ASC
            """)
            
            listings = cursor.fetchall()
        
        for listing in listings:
            try:
                result = await self._monitor_single_listing(dict(listing))
                results['details'].append(result)
                results['total_checked'] += 1
                
                if result.get('price_updated'):
                    results['price_updates'] += 1
                
                if result.get('quantity_updated'):
                    results['quantity_updates'] += 1
                
                # API制限対応
                await asyncio.sleep(1)
                
            except Exception as e:
                results['errors'] += 1
                results['details'].append({
                    'sku': listing['sku'],
                    'success': False,
                    'error': str(e)
                })
                self.logger.error(f"出品監視エラー: {listing['sku']} - {str(e)}")
        
        return results
    
    async def _monitor_single_listing(self, listing: Dict) -> Dict:
        """単一出品監視"""
        sku = listing['sku']
        asin = listing['asin']
        current_price = listing['current_price']
        
        result = {
            'sku': sku,
            'success': True,
            'price_updated': False,
            'quantity_updated': False,
            'actions': []
        }
        
        try:
            # 競合価格取得
            offers = await self.amazon_api.get_offers(asin)
            
            if not offers:
                return result
            
            # 同じコンディションの競合価格取得
            condition = listing['condition']
            competitor_prices = [
                offer['price'] for offer in offers
                if offer['condition'] == condition and offer['seller_id'] != 'OUR_SELLER_ID'
            ]
            
            if competitor_prices:
                # 価格調整判定
                min_competitor_price = min(competitor_prices)
                new_price = self._calculate_competitive_price(current_price, min_competitor_price, listing)
                
                if abs(new_price - current_price) >= 100:  # 100円以上の差
                    # 価格更新
                    update_result = await self.listing_manager.update_price_and_quantity(sku, new_price)
                    
                    if update_result.get('status') == 'ACCEPTED':
                        result['price_updated'] = True
                        result['actions'].append(f"価格更新: {current_price}円 → {new_price}円")
                        self._log_price_change(listing['id'], current_price, new_price, '競合価格対応')
            
            # 在庫確認（売り切れチェック）
            # 実際の運用では、ヤフオクの落札状況をチェック
            yahoo_product_id = listing['yahoo_product_id']
            is_sold = await self._check_yahoo_product_sold(yahoo_product_id)
            
            if is_sold and listing['quantity'] > 0:
                # 在庫を0に更新
                update_result = await self.listing_manager.update_price_and_quantity(sku, quantity=0)
                
                if update_result.get('status') == 'ACCEPTED':
                    result['quantity_updated'] = True
                    result['actions'].append("在庫更新: 1 → 0 (ヤフオク落札済み)")
        
        except Exception as e:
            result['success'] = False
            result['error'] = str(e)
        
        return result
    
    def _calculate_competitive_price(self, current_price: float, competitor_price: float, listing: Dict) -> float:
        """競合対応価格計算"""
        profit_margin = listing.get('profit_margin', 0)
        
        # 最低価格（利益確保）
        # 簡易計算: 現在価格から利益率を逆算
        min_price = current_price * (1 - profit_margin / 100) * 1.2  # 20%マージン確保
        
        if competitor_price >= current_price:
            # 競合より安いか同価格 → 価格据え置きまたは微増
            return min(current_price + 100, competitor_price - 1)
        else:
            # 競合より高い → 価格調整検討
            target_price = competitor_price - 50  # 50円安く設定
            
            # 最低価格を下回る場合は調整しない
            if target_price < min_price:
                return current_price
            
            return max(target_price, min_price)
    
    async def _check_yahoo_product_sold(self, yahoo_product_id: int) -> bool:
        """ヤフオク商品の落札確認（モック）"""
        # 実際の実装では、ヤフオクページを確認して落札済みかチェック
        # ここではランダムに5%の確率で落札済みとする
        await asyncio.sleep(0.1)
        return random.random() < 0.05
    
    def _log_price_change(self, listing_id: int, old_price: float, new_price: float, reason: str):
        """価格変更ログ"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO price_history (amazon_listing_id, old_price, new_price, change_reason)
                VALUES (?, ?, ?, ?)
            """, (listing_id, old_price, new_price, reason))
            conn.commit()

# ===============================
# 10. アラート・監視システム
# ===============================

class AlertSystem:
    def __init__(self, db: DatabaseManager):
        self.db = db
        self.logger = logging.getLogger(__name__)
        
        self.alert_thresholds = {
            'profit_margin_drop': 15,       # 利益率15%以下でアラート
            'high_competition': 5,          # 競合5社以上でアラート
            'price_drop_percentage': 15,    # 15%以上の価格下落でアラート
            'auction_ending_soon': 3600,    # 1時間以内終了でアラート
            'high_priority_score': 80       # 優先度スコア80以上でアラート
        }
    
    def check_all_alerts(self) -> List[SystemAlert]:
        """全アラート確認"""
        alerts = []
        
        # 1. 利益率低下アラート
        alerts.extend(self._check_low_profit_margins())
        
        # 2. 高競合アラート
        alerts.extend(self._check_high_competition())
        
        # 3. 価格急落アラート
        alerts.extend(self._check_price_drops())
        
        # 4. オークション終了間近アラート
        alerts.extend(self._check_ending_auctions())
        
        # 5. 高優先度商品アラート
        alerts.extend(self._check_high_priority_products())
        
        # アラートをデータベースに保存
        for alert in alerts:
            self.db.save_alert(alert)
        
        return alerts
    
    def _check_low_profit_margins(self) -> List[SystemAlert]:
        """低利益率アラート"""
        alerts = []
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT al.sku, al.current_price, al.profit_margin, al.asin
                FROM amazon_listings al
                WHERE al.status = 'active'
                AND al.profit_margin < ?
            """, (self.alert_thresholds['profit_margin_drop'],))
            
            for row in cursor.fetchall():
                alerts.append(SystemAlert(
                    alert_type='low_profit_margin',
                    severity=AlertSeverity.WARNING,
                    title='利益率低下警告',
                    message=f"SKU {row['sku']} の利益率が{row['profit_margin']:.1f}%に低下しました。",
                    related_sku=row['sku'],
                    related_asin=row['asin'],
                    created_at=datetime.now()
                ))
        
        return alerts
    
    def _check_high_competition(self) -> List[SystemAlert]:
        """高競合アラート"""
        alerts = []
        
        # 実装簡略化のため、ランダムにアラート生成
        if random.random() < 0.1:  # 10%の確率
            alerts.append(SystemAlert(
                alert_type='high_competition',
                severity=AlertSeverity.INFO,
                title='競合増加通知',
                message="一部商品で競合出品者が増加しています。価格調整を検討してください。",
                related_sku=None,
                related_asin=None,
                created_at=datetime.now()
            ))
        
        return alerts
    
    def _check_price_drops(self) -> List[SystemAlert]:
        """価格急落アラート"""
        alerts = []
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT al.sku, al.asin, al.current_price, ph.old_price
                FROM amazon_listings al
                JOIN price_history ph ON al.id = ph.amazon_listing_id
                WHERE ph.changed_at > datetime('now', '-24 hours')
                AND (ph.old_price - ph.new_price) / ph.old_price > ?
            """, (self.alert_thresholds['price_drop_percentage'] / 100,))
            
            for row in cursor.fetchall():
                drop_percentage = ((row['old_price'] - row['current_price']) / row['old_price']) * 100
                
                alerts.append(SystemAlert(
                    alert_type='price_drop',
                    severity=AlertSeverity.WARNING,
                    title='価格急落警告',
                    message=f"SKU {row['sku']} の価格が{drop_percentage:.1f}%下落しました。",
                    related_sku=row['sku'],
                    related_asin=row['asin'],
                    created_at=datetime.now()
                ))
        
        return alerts
    
    def _check_ending_auctions(self) -> List[SystemAlert]:
        """オークション終了間近アラート"""
        alerts = []
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT yp.auction_id, yp.title, yp.current_price, yp.end_time,
                       pa.profit, pa.profit_margin
                FROM yahoo_products yp
                LEFT JOIN profit_analysis pa ON yp.id = pa.yahoo_product_id
                WHERE yp.status = 'analyzed'
                AND yp.end_time BETWEEN datetime('now') AND datetime('now', '+1 hour')
                AND (pa.is_profitable = 1 OR pa.is_profitable IS NULL)
                ORDER BY yp.end_time ASC
            """)
            
            for row in cursor.fetchall():
                time_left = datetime.fromisoformat(row['end_time']) - datetime.now()
                minutes_left = int(time_left.total_seconds() / 60)
                
                alerts.append(SystemAlert(
                    alert_type='auction_ending',
                    severity=AlertSeverity.INFO,
                    title='オークション終了間近',
                    message=f"利益商品 {row['title']} があと{minutes_left}分で終了します。現在価格: {row['current_price']}円",
                    related_sku=None,
                    related_asin=None,
                    created_at=datetime.now()
                ))
        
        return alerts
    
    def _check_high_priority_products(self) -> List[SystemAlert]:
        """高優先度商品アラート"""
        alerts = []
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT yp.auction_id, yp.title, yp.current_price,
                       pa.profit, pa.profit_margin
                FROM yahoo_products yp
                JOIN profit_analysis pa ON yp.id = pa.yahoo_product_id
                WHERE yp.status = 'analyzed'
                AND pa.is_profitable = 1
                AND pa.profit_margin > 40
                AND pa.profit > 3000
                ORDER BY pa.profit_margin DESC
                LIMIT 5
            """)
            
            high_priority_count = len(cursor.fetchall())
            
            if high_priority_count > 0:
                alerts.append(SystemAlert(
                    alert_type='high_priority_products',
                    severity=AlertSeverity.INFO,
                    title='高利益商品発見',
                    message=f"{high_priority_count}件の高利益商品を発見しました。早期の出品を検討してください。",
                    related_sku=None,
                    related_asin=None,
                    created_at=datetime.now()
                ))
        
        return alerts
    
    def send_alert_notifications(self, alerts: List[SystemAlert]):
        """アラート通知送信"""
        if not alerts:
            return
        
        # 重要度別にフィルタリング
        critical_alerts = [a for a in alerts if a.severity in [AlertSeverity.ERROR, AlertSeverity.CRITICAL]]
        warning_alerts = [a for a in alerts if a.severity == AlertSeverity.WARNING]
        
        # クリティカルアラートは即座にメール送信
        if critical_alerts:
            self._send_email_alerts(critical_alerts)
        
        # 警告アラートは1時間に1回まで
        if warning_alerts and self._should_send_warning_alerts():
            self._send_email_alerts(warning_alerts)
        
        # 全てのアラートをログ出力
        for alert in alerts:
            self.logger.warning(f"アラート: {alert.title} - {alert.message}")
    
    def _should_send_warning_alerts(self) -> bool:
        """警告アラート送信判定"""
        # 1時間以内に警告メールを送信済みかチェック
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM alerts 
                WHERE severity = 'warning' 
                AND created_at > datetime('now', '-1 hour')
            """)
            recent_warnings = cursor.fetchone()[0]
            
            return recent_warnings < 5  # 1時間に最大5件まで
    
    def _send_email_alerts(self, alerts: List[SystemAlert]):
        """メールアラート送信"""
        try:
            # メール設定（実際の設定に変更してください）
            smtp_server = 'smtp.gmail.com'
            smtp_port = 587
            sender_email = 'system@example.com'
            sender_password = 'password'
            recipient_email = 'admin@example.com'
            
            # メール作成
            msg = MimeMultipart()
            msg['From'] = sender_email
            msg['To'] = recipient_email
            msg['Subject'] = f"ヤフオク-Amazonシステム アラート通知 ({len(alerts)}件)"
            
            # メール本文作成
            body = "ヤフオク-Amazonシステムでアラートが発生しました:\n\n"
            for alert in alerts:
                body += f"【{alert.severity.value.upper()}】{alert.title}\n"
                body += f"内容: {alert.message}\n"
                body += f"時刻: {alert.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            
            msg.attach(MimeText(body, 'plain', 'utf-8'))
            
            # メール送信
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
            server.quit()
            
            self.logger.info(f"アラートメール送信完了: {len(alerts)}件")
        
        except Exception as e:
            self.logger.error(f"メール送信エラー: {str(e)}")

# ===============================
# 11. メインシステム統合クラス
# ===============================

class YahooAmazonSystem:
    def __init__(self, config: Dict):
        # ログ設定
        self._setup_logging()
        
        # コンポーネント初期化
        self.db = DatabaseManager(config.get('db_path', 'yahoo_amazon_system.db'))
        self.yahoo_scraper = YahooAuctionScraper()
        self.amazon_api = AmazonSPAPIMock(config.get('amazon_credentials', {}))
        self.product_analyzer = AmazonProductAnalyzer(self.amazon_api)
        self.profit_calculator = ProfitCalculator()
        self.product_filter = ProductFilter()
        self.listing_manager = AmazonListingManager(self.amazon_api, self.db)
        self.inventory_manager = InventoryPriceManager(self.db, self.amazon_api, self.listing_manager)
        self.alert_system = AlertSystem(self.db)
        
        # 設定
        self.config = config
        self.is_running = False
        self.logger = logging.getLogger(__name__)
    
    def _setup_logging(self):
        """ログ設定"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('yahoo_amazon_system.log', encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
    
    async def start_system(self):
        """システム開始"""
        self.logger.info("ヤフオク-Amazonシステム開始")
        self.is_running = True
        
        # スケジュール設定
        self._setup_schedule()
        
        # メインループ
        while self.is_running:
            try:
                await asyncio.sleep(60)  # 1分間隔
                schedule.run_pending()
            except KeyboardInterrupt:
                self.logger.info("システム停止要求を受信")
                break
            except Exception as e:
                self.logger.error(f"メインループエラー: {str(e)}")
                await asyncio.sleep(5)
        
        await self.stop_system()
    
    def _setup_schedule(self):
        """スケジュール設定"""
        # ヤフオク商品検索（1時間ごと）
        schedule.every().hour.do(self._run_async, self.search_yahoo_products())
        
        # 商品分析（30分ごと）
        schedule.every(30).minutes.do(self._run_async, self.analyze_products())
        
        # 出品処理（1時間ごと）
        schedule.every().hour.do(self._run_async, self.process_listings())
        
        # 価格・在庫監視（30分ごと）
        schedule.every(30).minutes.do(self._run_async, self.monitor_listings())
        
        # 新規商品登録状況確認（10分ごと）
        schedule.every(10).minutes.do(self._run_async, self.check_registration_status())
        
        # アラート確認（15分ごと）
        schedule.every(15).minutes.do(self._run_async, self.check_alerts())
    
    def _run_async(self, coro):
        """非同期関数を同期実行"""
        def run():
            asyncio.create_task(coro)
        return run
    
    async def search_yahoo_products(self):
        """ヤフオク商品検索"""
        self.logger.info("ヤフオク商品検索開始")
        
        try:
            # 検索条件設定
            search_configs = [
                {'keyword': 'iPhone', 'min_price': 5000, 'max_price': 50000},
                {'keyword': 'iPad', 'min_price': 10000, 'max_price': 80000},
                {'keyword': 'MacBook', 'min_price': 20000, 'max_price': 200000},
                {'keyword': 'Nintendo Switch', 'min_price': 15000, 'max_price': 40000},
                {'keyword': 'PlayStation', 'min_price': 10000, 'max_price': 60000},
                {'keyword': 'Canon', 'min_price': 5000, 'max_price': 100000},
                {'keyword': 'Sony', 'min_price': 5000, 'max_price': 100000}
            ]
            
            total_products = 0
            
            for config in search_configs:
                # 検索実行
                search_results = await self.yahoo_scraper.search_products(**config)
                
                for result in search_results:
                    # 詳細情報取得
                    details = await self.yahoo_scraper.get_product_details(result['auction_id'])
                    if details:
                        result.update(details)
                    
                    # 商品オブジェクト作成
                    yahoo_product = YahooAuctionProduct(
                        id=None,
                        auction_id=result['auction_id'],
                        title=result.get('title', ''),
                        current_price=result.get('current_price', 0),
                        end_time=result.get('end_time', datetime.now() + timedelta(days=7)),
                        seller_name=result.get('seller_name', ''),
                        condition=result.get('condition', ProductCondition.UNKNOWN),
                        category=result.get('category'),
                        brand=result.get('brand'),
                        description=result.get('description', ''),
                        image_urls=result.get('image_urls', []),
                        view_count=result.get('view_count', 0),
                        bid_count=result.get('bid_count', 0),
                        instant_buy_price=result.get('instant_buy_price'),
                        shipping_cost=result.get('shipping_cost', 0),
                        seller_rating=result.get('seller_rating', 0),
                        is_store=result.get('is_store', False),
                        scraped_at=datetime.now(),
                        status=ProductStatus.PENDING
                    )
                    
                    # データベース保存
                    self.db.save_yahoo_product(yahoo_product)
                    total_products += 1
                
                # レート制限
                await asyncio.sleep(5)
            
            self.logger.info(f"ヤフオク商品検索完了: {total_products}商品")
        
        except Exception as e:
            self.logger.error(f"ヤフオク商品検索エラー: {str(e)}")
        
        finally:
            await self.yahoo_scraper.close_session()
    
    async def analyze_products(self):
        """商品分析処理"""
        self.logger.info("商品分析開始")
        
        try:
            pending_products = self.db.get_pending_products(20)  # 20商品ずつ処理
            
            analyzed_count = 0
            
            for product in pending_products:
                try:
                    # Amazon商品分析
                    amazon_info = await self.product_analyzer.analyze_product(product)
                    
                    # Amazon商品情報保存
                    self.db.save_amazon_product_info(product.id, amazon_info)
                    
                    # 利益分析
                    profit_analysis = self.profit_calculator.calculate_profit(product, amazon_info)
                    
                    # 利益分析保存
                    self.db.save_profit_analysis(product.id, profit_analysis)
                    
                    # 商品ステータス更新
                    new_status = ProductStatus.PROFITABLE if profit_analysis.is_profitable else ProductStatus.ANALYZED
                    
                    with self.db.get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute(
                            "UPDATE yahoo_products SET status = ? WHERE id = ?",
                            (new_status.value, product.id)
                        )
                        conn.commit()
                    
                    analyzed_count += 1
                    self.logger.info(f"分析完了: {product.title} - 利益率{profit_analysis.profit_margin:.1f}%")
                    
                    # API制限対応
                    await asyncio.sleep(2)
                
                except Exception as e:
                    self.logger.error(f"商品分析エラー: {product.id} - {str(e)}")
                    continue
            
            self.logger.info(f"商品分析完了: {analyzed_count}件")
        
        except Exception as e:
            self.logger.error(f"商品分析処理エラー: {str(e)}")
    
    async def process_listings(self):
        """出品処理"""
        self.logger.info("出品処理開始")
        
        try:
            profitable_products = self.db.get_profitable_products(10)  # 10商品ずつ処理
            
            listing_count = 0
            
            for product_data in profitable_products:
                try:
                    # ヤフオク商品オブジェクト再構築
                    yahoo_product = YahooAuctionProduct(
                        id=product_data['id'],
                        auction_id=product_data['auction_id'],
                        title=product_data['title'],
                        current_price=product_data['current_price'],
                        end_time=datetime.fromisoformat(product_data['end_time']),
                        seller_name=product_data['seller_name'],
                        condition=ProductCondition(product_data['condition']),
                        category=product_data['category'],
                        brand=product_data['brand'],
                        description=product_data['description'],
                        image_urls=json.loads(product_data['image_urls']) if product_data['image_urls'] else [],
                        view_count=product_data['view_count'],
                        bid_count=product_data['bid_count'],
                        instant_buy_price=product_data['instant_buy_price'],
                        shipping_cost=product_data['shipping_cost'],
                        seller_rating=product_data['seller_rating'],
                        is_store=product_data['is_store'],
                        scraped_at=datetime.fromisoformat(product_data['scraped_at']),
                        status=ProductStatus(product_data['status'])
                    )
                    
                    # Amazon情報取得
                    with self.db.get_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            SELECT * FROM amazon_product_info WHERE yahoo_product_id = ?
                        """, (yahoo_product.id,))
                        amazon_row = cursor.fetchone()
                    
                    if not amazon_row:
                        continue
                    
                    amazon_info = AmazonProductInfo(
                        asin=amazon_row['asin'],
                        title=amazon_row['title'],
                        category=amazon_row['category'],
                        current_prices=json.loads(amazon_row['current_prices']),
                        sales_rank=amazon_row['sales_rank'],
                        review_count=amazon_row['review_count'],
                        rating=amazon_row['rating'],
                        dimensions=json.loads(amazon_row['dimensions']),
                        weight=amazon_row['weight'],
                        brand=amazon_row['brand'],
                        model=amazon_row['model'],
                        jan_code=amazon_row['jan_code'],
                        exists_on_amazon=amazon_row['exists_on_amazon']
                    )
                    
                    # 利益分析取得
                    profit_analysis = ProfitAnalysis(
                        yahoo_cost=product_data['yahoo_cost'],
                        amazon_revenue=product_data['amazon_revenue'],
                        shipping_cost=product_data['shipping_cost'],
                        amazon_fees=product_data['amazon_fees'],
                        packaging_cost=product_data['packaging_cost'],
                        total_cost=product_data['total_cost'],
                        profit=product_data['profit'],
                        profit_margin=product_data['profit_margin'],
                        is_profitable=product_data['is_profitable'],
                        recommended_condition=ProductCondition(product_data['recommended_condition']),
                        recommended_price=product_data['recommended_price'],
                        listing_strategy=ListingStrategy(product_data['listing_strategy'])
                    )
                    
                    # 出品可否判定
                    should_list, reason = self.product_filter.should_purchase_product(yahoo_product, profit_analysis)
                    
                    if should_list:
                        # 出品作成
                        result = await self.listing_manager.create_listing(
                            yahoo_product, amazon_info, profit_analysis
                        )
                        
                        if result['success']:
                            listing_count += 1
                            
                            # 商品ステータス更新
                            with self.db.get_connection() as conn:
                                cursor = conn.cursor()
                                cursor.execute(
                                    "UPDATE yahoo_products SET status = ? WHERE id = ?",
                                    (ProductStatus.LISTED.value, yahoo_product.id)
                                )
                                conn.commit()
                            
                            self.logger.info(f"出品成功: {yahoo_product.title} - {result['strategy']}")
                        else:
                            self.logger.error(f"出品失敗: {yahoo_product.title} - {result['error']}")
                    else:
                        self.logger.info(f"出品見送り: {yahoo_product.title} - {reason}")
                    
                    # API制限対応
                    await asyncio.sleep(3)
                
                except Exception as e:
                    self.logger.error(f"出品処理エラー: {product_data['id']} - {str(e)}")
                    continue
            
            self.logger.info(f"出品処理完了: {listing_count}件")
        
        except Exception as e:
            self.logger.error(f"出品処理エラー: {str(e)}")
    
    async def monitor_listings(self):
        """価格・在庫監視"""
        self.logger.info("価格・在庫監視開始")
        
        try:
            result = await self.inventory_manager.monitor_all_listings()
            self.logger.info(f"監視完了: {result['price_updates']}件の価格更新, {result['quantity_updates']}件の在庫更新")
        
        except Exception as e:
            self.logger.error(f"価格・在庫監視エラー: {str(e)}")
    
    async def check_registration_status(self):
        """新規商品登録状況確認"""
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT sku FROM new_product_registrations 
                    WHERE registration_status = 'pending'
                """)
                
                pending_skus = [row['sku'] for row in cursor.fetchall()]
            
            for sku in pending_skus:
                await self.listing_manager.check_registration_status(sku)
                await asyncio.sleep(1)
        
        except Exception as e:
            self.logger.error(f"登録状況確認エラー: {str(e)}")
    
    async def check_alerts(self):
        """アラート確認"""
        try:
            alerts = self.alert_system.check_all_alerts()
            
            if alerts:
                self.alert_system.send_alert_notifications(alerts)
                self.logger.info(f"アラート確認完了: {len(alerts)}件")
        
        except Exception as e:
            self.logger.error(f"アラート確認エラー: {str(e)}")
    
    async def stop_system(self):
        """システム停止"""
        self.logger.info("システム停止中...")
        self.is_running = False
        await self.yahoo_scraper.close_session()
        self.logger.info("システム停止完了")
    
    # ===============================
    # API エンドポイント（Web UI連携用）
    # ===============================
    
    def get_system_status(self) -> Dict:
        """システム状態取得"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # 商品統計
            cursor.execute("SELECT COUNT(*) FROM yahoo_products")
            total_products = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM yahoo_products WHERE status = 'pending'")
            pending_products = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM yahoo_products WHERE status = 'profitable'")
            profitable_products = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM amazon_listings WHERE status = 'active'")
            active_listings = cursor.fetchone()[0]
            
            # 今日の実績
            cursor.execute("""
                SELECT COUNT(*) FROM yahoo_products 
                WHERE date(scraped_at) = date('now')
            """)
            today_scraped = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT COUNT(*) FROM amazon_listings 
                WHERE date(created_at) = date('now')
            """)
            today_listed = cursor.fetchone()[0]
            
            # 利益統計
            cursor.execute("""
                SELECT AVG(profit), AVG(profit_margin) FROM profit_analysis 
                WHERE is_profitable = 1
            """)
            profit_stats = cursor.fetchone()
            avg_profit = profit_stats[0] or 0
            avg_margin = profit_stats[1] or 0
            
            # アラート数
            cursor.execute("SELECT COUNT(*) FROM alerts WHERE resolved = 0")
            unresolved_alerts = cursor.fetchone()[0]
        
        return {
            'system_running': self.is_running,
            'total_products': total_products,
            'pending_products': pending_products,
            'profitable_products': profitable_products,
            'active_listings': active_listings,
            'today_scraped': today_scraped,
            'today_listed': today_listed,
            'avg_profit': round(avg_profit, 0),
            'avg_margin': round(avg_margin, 1),
            'unresolved_alerts': unresolved_alerts,
            'last_update': datetime.now().isoformat()
        }
    
    def get_profitable_products(self, limit: int = 20) -> List[Dict]:
        """利益商品取得"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT yp.auction_id, yp.title, yp.current_price, yp.end_time,
                       yp.seller_rating, yp.condition, yp.brand,
                       pa.profit, pa.profit_margin, pa.recommended_price,
                       pa.listing_strategy
                FROM yahoo_products yp
                JOIN profit_analysis pa ON yp.id = pa.yahoo_product_id
                WHERE pa.is_profitable = 1
                AND yp.status IN ('profitable', 'analyzed')
                ORDER BY pa.profit_margin DESC, pa.profit DESC
                LIMIT ?
            """, (limit,))
            
            products = []
            for row in cursor.fetchall():
                time_to_end = datetime.fromisoformat(row['end_time']) - datetime.now()
                hours_left = max(0, int(time_to_end.total_seconds() / 3600))
                
                products.append({
                    'auction_id': row['auction_id'],
                    'title': row['title'],
                    'current_price': row['current_price'],
                    'profit': row['profit'],
                    'profit_margin': row['profit_margin'],
                    'recommended_price': row['recommended_price'],
                    'seller_rating': row['seller_rating'],
                    'condition': row['condition'],
                    'brand': row['brand'],
                    'hours_left': hours_left,
                    'listing_strategy': row['listing_strategy'],
                    'priority_score': self.product_filter.calculate_priority_score(
                        YahooAuctionProduct(
                            id=None, auction_id=row['auction_id'], title=row['title'],
                            current_price=row['current_price'], end_time=datetime.fromisoformat(row['end_time']),
                            seller_name='', condition=ProductCondition(row['condition']),
                            category=None, brand=row['brand'], description='',
                            image_urls=[], view_count=0, bid_count=0, instant_buy_price=None,
                            shipping_cost=0, seller_rating=row['seller_rating'], is_store=False,
                            scraped_at=datetime.now()
                        ),
                        ProfitAnalysis(
                            yahoo_cost=0, amazon_revenue=0, shipping_cost=0, amazon_fees=0,
                            packaging_cost=0, total_cost=0, profit=row['profit'],
                            profit_margin=row['profit_margin'], is_profitable=True,
                            recommended_condition=ProductCondition(row['condition']),
                            recommended_price=row['recommended_price'],
                            listing_strategy=ListingStrategy(row['listing_strategy'])
                        )
                    )
                })
            
            return products
    
    def get_recent_listings(self, limit: int = 20) -> List[Dict]:
        """最近の出品取得"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT al.sku, al.asin, al.current_price, al.profit_margin,
                       al.quantity, al.status, al.created_at, al.listing_strategy,
                       al.condition, yp.title, yp.current_price as yahoo_price,
                       yp.auction_id
                FROM amazon_listings al
                JOIN yahoo_products yp ON al.yahoo_product_id = yp.id
                ORDER BY al.created_at DESC
                LIMIT ?
            """, (limit,))
            
            listings = []
            for row in cursor.fetchall():
                listings.append({
                    'sku': row['sku'],
                    'asin': row['asin'],
                    'auction_id': row['auction_id'],
                    'title': row['title'],
                    'yahoo_price': row['yahoo_price'],
                    'amazon_price': row['current_price'],
                    'profit_margin': row['profit_margin'],
                    'quantity': row['quantity'],
                    'status': row['status'],
                    'condition': row['condition'],
                    'listing_strategy': row['listing_strategy'],
                    'created_at': row['created_at']
                })
            
            return listings
    
    def get_alerts(self, resolved: bool = False, limit: int = 50) -> List[Dict]:
        """アラート取得"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT alert_type, severity, title, message, 
                       related_sku, related_asin, created_at, resolved
                FROM alerts
                WHERE resolved = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (resolved, limit))
            
            alerts = []
            for row in cursor.fetchall():
                alerts.append({
                    'alert_type': row['alert_type'],
                    'severity': row['severity'],
                    'title': row['title'],
                    'message': row['message'],
                    'related_sku': row['related_sku'],
                    'related_asin': row['related_asin'],
                    'created_at': row['created_at'],
                    'resolved': row['resolved']
                })
            
            return alerts
    
    def get_profit_summary(self) -> Dict:
        """利益サマリー取得"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # 総利益統計
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_analyzed,
                    COUNT(CASE WHEN is_profitable = 1 THEN 1 END) as profitable_count,
                    AVG(CASE WHEN is_profitable = 1 THEN profit END) as avg_profit,
                    AVG(CASE WHEN is_profitable = 1 THEN profit_margin END) as avg_margin,
                    SUM(CASE WHEN is_profitable = 1 THEN profit END) as total_potential_profit
                FROM profit_analysis
            """)
            
            summary = dict(cursor.fetchone())
            
            # 戦略別統計
            cursor.execute("""
                SELECT 
                    listing_strategy,
                    COUNT(*) as count,
                    AVG(profit) as avg_profit,
                    AVG(profit_margin) as avg_margin
                FROM profit_analysis
                WHERE is_profitable = 1
                GROUP BY listing_strategy
            """)
            
            strategy_stats = {}
            for row in cursor.fetchall():
                strategy_stats[row['listing_strategy']] = {
                    'count': row['count'],
                    'avg_profit': round(row['avg_profit'] or 0, 0),
                    'avg_margin': round(row['avg_margin'] or 0, 1)
                }
            
            # カテゴリ別統計
            cursor.execute("""
                SELECT 
                    yp.category,
                    COUNT(*) as count,
                    AVG(pa.profit) as avg_profit,
                    AVG(pa.profit_margin) as avg_margin
                FROM profit_analysis pa
                JOIN yahoo_products yp ON pa.yahoo_product_id = yp.id
                WHERE pa.is_profitable = 1 AND yp.category IS NOT NULL
                GROUP BY yp.category
                ORDER BY AVG(pa.profit) DESC
                LIMIT 5
            """)
            
            category_stats = []
            for row in cursor.fetchall():
                category_stats.append({
                    'category': row['category'],
                    'count': row['count'],
                    'avg_profit': round(row['avg_profit'] or 0, 0),
                    'avg_margin': round(row['avg_margin'] or 0, 1)
                })
            
            return {
                'total_analyzed': summary['total_analyzed'],
                'profitable_count': summary['profitable_count'],
                'profitability_rate': round((summary['profitable_count'] / max(summary['total_analyzed'], 1)) * 100, 1),
                'avg_profit': round(summary['avg_profit'] or 0, 0),
                'avg_margin': round(summary['avg_margin'] or 0, 1),
                'total_potential_profit': round(summary['total_potential_profit'] or 0, 0),
                'strategy_breakdown': strategy_stats,
                'top_categories': category_stats
            }
    
    # ===============================
    # 手動操作用メソッド
    # ===============================
    
    async def manual_product_analysis(self, auction_id: str) -> Dict:
        """手動商品分析"""
        try:
            # ヤフオク商品詳細取得
            details = await self.yahoo_scraper.get_product_details(auction_id)
            if not details:
                return {'success': False, 'error': '商品詳細取得失敗'}
            
            # 商品オブジェクト作成
            yahoo_product = YahooAuctionProduct(
                id=None,
                auction_id=auction_id,
                title=details.get('title', ''),
                current_price=details.get('current_price', 0),
                end_time=details.get('end_time', datetime.now() + timedelta(days=7)),
                seller_name=details.get('seller_name', ''),
                condition=details.get('condition', ProductCondition.UNKNOWN),
                category=details.get('category'),
                brand=details.get('brand'),
                description=details.get('description', ''),
                image_urls=details.get('image_urls', []),
                view_count=details.get('view_count', 0),
                bid_count=details.get('bid_count', 0),
                instant_buy_price=details.get('instant_buy_price'),
                shipping_cost=details.get('shipping_cost', 0),
                seller_rating=details.get('seller_rating', 0),
                is_store=details.get('is_store', False),
                scraped_at=datetime.now(),
                status=ProductStatus.PENDING
            )
            
            # Amazon分析
            amazon_info = await self.product_analyzer.analyze_product(yahoo_product)
            
            # 利益計算
            profit_analysis = self.profit_calculator.calculate_profit(yahoo_product, amazon_info)
            
            # 購入推奨判定
            should_purchase, reason = self.product_filter.should_purchase_product(yahoo_product, profit_analysis)
            
            return {
                'success': True,
                'yahoo_product': {
                    'auction_id': yahoo_product.auction_id,
                    'title': yahoo_product.title,
                    'current_price': yahoo_product.current_price,
                    'instant_buy_price': yahoo_product.instant_buy_price,
                    'condition': yahoo_product.condition.value,
                    'seller_rating': yahoo_product.seller_rating,
                    'shipping_cost': yahoo_product.shipping_cost,
                    'end_time': yahoo_product.end_time.isoformat()
                },
                'amazon_info': {
                    'exists_on_amazon': amazon_info.exists_on_amazon,
                    'asin': amazon_info.asin,
                    'category': amazon_info.category,
                    'current_prices': amazon_info.current_prices
                },
                'profit_analysis': {
                    'total_cost': profit_analysis.total_cost,
                    'recommended_price': profit_analysis.recommended_price,
                    'profit': profit_analysis.profit,
                    'profit_margin': profit_analysis.profit_margin,
                    'is_profitable': profit_analysis.is_profitable,
                    'listing_strategy': profit_analysis.listing_strategy.value
                },
                'recommendation': {
                    'should_purchase': should_purchase,
                    'reason': reason,
                    'priority_score': self.product_filter.calculate_priority_score(yahoo_product, profit_analysis)
                }
            }
        
        except Exception as e:
            self.logger.error(f"手動分析エラー: {auction_id} - {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def manual_listing_creation(self, auction_id: str) -> Dict:
        """手動出品作成"""
        try:
            # データベースから商品情報取得
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT yp.*, pa.*, api.asin, api.exists_on_amazon
                    FROM yahoo_products yp
                    LEFT JOIN profit_analysis pa ON yp.id = pa.yahoo_product_id
                    LEFT JOIN amazon_product_info api ON yp.id = api.yahoo_product_id
                    WHERE yp.auction_id = ?
                """, (auction_id,))
                
                row = cursor.fetchone()
                
                if not row:
                    return {'success': False, 'error': '商品が見つかりません'}
                
                # 商品オブジェクト再構築
                yahoo_product = YahooAuctionProduct(
                    id=row['id'],
                    auction_id=row['auction_id'],
                    title=row['title'],
                    current_price=row['current_price'],
                    end_time=datetime.fromisoformat(row['end_time']),
                    seller_name=row['seller_name'],
                    condition=ProductCondition(row['condition']),
                    category=row['category'],
                    brand=row['brand'],
                    description=row['description'],
                    image_urls=json.loads(row['image_urls']) if row['image_urls'] else [],
                    view_count=row['view_count'],
                    bid_count=row['bid_count'],
                    instant_buy_price=row['instant_buy_price'],
                    shipping_cost=row['shipping_cost'],
                    seller_rating=row['seller_rating'],
                    is_store=row['is_store'],
                    scraped_at=datetime.fromisoformat(row['scraped_at']),
                    status=ProductStatus(row['status'])
                )
                
                # Amazon情報・利益分析が必要
                if not row['profit']:
                    return {'success': False, 'error': '利益分析が完了していません'}
                
                # Amazon商品情報取得
                cursor.execute("SELECT * FROM amazon_product_info WHERE yahoo_product_id = ?", (row['id'],))
                amazon_row = cursor.fetchone()
                
                if not amazon_row:
                    return {'success': False, 'error': 'Amazon商品情報がありません'}
                
                amazon_info = AmazonProductInfo(
                    asin=amazon_row['asin'],
                    title=amazon_row['title'],
                    category=amazon_row['category'],
                    current_prices=json.loads(amazon_row['current_prices']),
                    sales_rank=amazon_row['sales_rank'],
                    review_count=amazon_row['review_count'],
                    rating=amazon_row['rating'],
                    dimensions=json.loads(amazon_row['dimensions']),
                    weight=amazon_row['weight'],
                    brand=amazon_row['brand'],
                    model=amazon_row['model'],
                    jan_code=amazon_row['jan_code'],
                    exists_on_amazon=amazon_row['exists_on_amazon']
                )
                
                profit_analysis = ProfitAnalysis(
                    yahoo_cost=row['yahoo_cost'],
                    amazon_revenue=row['amazon_revenue'],
                    shipping_cost=row['shipping_cost'],
                    amazon_fees=row['amazon_fees'],
                    packaging_cost=row['packaging_cost'],
                    total_cost=row['total_cost'],
                    profit=row['profit'],
                    profit_margin=row['profit_margin'],
                    is_profitable=row['is_profitable'],
                    recommended_condition=ProductCondition(row['recommended_condition']),
                    recommended_price=row['recommended_price'],
                    listing_strategy=ListingStrategy(row['listing_strategy'])
                )
                
                # 出品作成
                result = await self.listing_manager.create_listing(yahoo_product, amazon_info, profit_analysis)
                
                if result['success']:
                    # ステータス更新
                    cursor.execute(
                        "UPDATE yahoo_products SET status = ? WHERE auction_id = ?",
                        (ProductStatus.LISTED.value, auction_id)
                    )
                    conn.commit()
                
                return result
        
        except Exception as e:
            self.logger.error(f"手動出品エラー: {auction_id} - {str(e)}")
            return {'success': False, 'error': str(e)}

# ===============================
# 12. REST API エンドポイント（FastAPI）
# ===============================

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

class SearchRequest(BaseModel):
    keyword: str
    min_price: Optional[int] = 1000
    max_price: Optional[int] = 50000
    category: Optional[str] = None

class AnalysisRequest(BaseModel):
    auction_id: str

class ListingRequest(BaseModel):
    auction_id: str

def create_api_app(yahoo_amazon_system: YahooAmazonSystem) -> FastAPI:
    """FastAPI アプリケーション作成"""
    
    app = FastAPI(
        title="ヤフオク-Amazon転売システム API",
        description="ヤフオク商品のリサーチとAmazon自動出品システム",
        version="1.0.0"
    )
    
    # CORS設定
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 本番環境では適切に設定
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # ===============================
    # システム状態 API
    # ===============================
    
    @app.get("/api/status")
    async def get_system_status():
        """システム状態取得"""
        try:
            return yahoo_amazon_system.get_system_status()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/profit-summary")
    async def get_profit_summary():
        """利益サマリー取得"""
        try:
            return yahoo_amazon_system.get_profit_summary()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # ===============================
    # 商品検索・分析 API
    # ===============================
    
    @app.post("/api/search")
    async def search_products(request: SearchRequest, background_tasks: BackgroundTasks):
        """ヤフオク商品検索"""
        try:
            # バックグラウンドで検索実行
            background_tasks.add_task(
                yahoo_amazon_system.yahoo_scraper.search_products,
                keyword=request.keyword,
                min_price=request.min_price,
                max_price=request.max_price,
                category_id=request.category
            )
            
            return {
                "message": "検索を開始しました",
                "keyword": request.keyword,
                "status": "processing"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/analyze")
    async def analyze_product(request: AnalysisRequest):
        """商品分析"""
        try:
            result = await yahoo_amazon_system.manual_product_analysis(request.auction_id)
            
            if not result['success']:
                raise HTTPException(status_code=400, detail=result['error'])
            
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/profitable-products")
    async def get_profitable_products(limit: int = 20):
        """利益商品一覧取得"""
        try:
            return yahoo_amazon_system.get_profitable_products(limit)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # ===============================
    # 出品管理 API
    # ===============================
    
    @app.post("/api/create-listing")
    async def create_listing(request: ListingRequest):
        """出品作成"""
        try:
            result = await yahoo_amazon_system.manual_listing_creation(request.auction_id)
            
            if not result['success']:
                raise HTTPException(status_code=400, detail=result['error'])
            
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/listings")
    async def get_recent_listings(limit: int = 20):
        """最近の出品取得"""
        try:
            return yahoo_amazon_system.get_recent_listings(limit)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.put("/api/listings/{sku}/price")
    async def update_listing_price(sku: str, price: float):
        """出品価格更新"""
        try:
            result = await yahoo_amazon_system.listing_manager.update_price_and_quantity(sku, price=price)
            
            if not result.get('status') == 'ACCEPTED':
                raise HTTPException(status_code=400, detail=result.get('error', '更新失敗'))
            
            return {"message": "価格更新完了", "sku": sku, "new_price": price}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.put("/api/listings/{sku}/quantity")
    async def update_listing_quantity(sku: str, quantity: int):
        """出品在庫更新"""
        try:
            result = await yahoo_amazon_system.listing_manager.update_price_and_quantity(sku, quantity=quantity)
            
            if not result.get('status') == 'ACCEPTED':
                raise HTTPException(status_code=400, detail=result.get('error', '更新失敗'))
            
            return {"message": "在庫更新完了", "sku": sku, "new_quantity": quantity}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.delete("/api/listings/{sku}")
    async def delete_listing(sku: str):
        """出品削除"""
        try:
            result = await yahoo_amazon_system.amazon_api.delete_listing(sku)
            
            if not result.get('status') == 'ACCEPTED':
                raise HTTPException(status_code=400, detail=result.get('error', '削除失敗'))
            
            return {"message": "出品削除完了", "sku": sku}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # ===============================
    # 監視・アラート API
    # ===============================
    
    @app.get("/api/alerts")
    async def get_alerts(resolved: bool = False, limit: int = 50):
        """アラート取得"""
        try:
            return yahoo_amazon_system.get_alerts(resolved, limit)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.put("/api/alerts/{alert_id}/resolve")
    async def resolve_alert(alert_id: int):
        """アラート解決"""
        try:
            with yahoo_amazon_system.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE alerts 
                    SET resolved = 1, resolved_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                """, (alert_id,))
                conn.commit()
            
            return {"message": "アラートを解決しました", "alert_id": alert_id}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # ===============================
    # システム操作 API
    # ===============================
    
    @app.post("/api/system/start")
    async def start_system(background_tasks: BackgroundTasks):
        """システム開始"""
        try:
            if not yahoo_amazon_system.is_running:
                background_tasks.add_task(yahoo_amazon_system.start_system)
                return {"message": "システムを開始しました"}
            else:
                return {"message": "システムは既に稼働中です"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/system/stop")
    async def stop_system():
        """システム停止"""
        try:
            if yahoo_amazon_system.is_running:
                await yahoo_amazon_system.stop_system()
                return {"message": "システムを停止しました"}
            else:
                return {"message": "システムは既に停止しています"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/system/manual-tasks/{task_name}")
    async def run_manual_task(task_name: str, background_tasks: BackgroundTasks):
        """手動タスク実行"""
        try:
            task_map = {
                "search": yahoo_amazon_system.search_yahoo_products,
                "analyze": yahoo_amazon_system.analyze_products,
                "list": yahoo_amazon_system.process_listings,
                "monitor": yahoo_amazon_system.monitor_listings,
                "alerts": yahoo_amazon_system.check_alerts
            }
            
            if task_name not in task_map:
                raise HTTPException(status_code=400, detail="無効なタスク名")
            
            background_tasks.add_task(task_map[task_name])
            return {"message": f"タスク '{task_name}' を開始しました"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # ===============================
    # レポート API
    # ===============================
    
    @app.get("/api/reports/daily")
    async def get_daily_report():
        """日次レポート取得"""
        try:
            with yahoo_amazon_system.db.get_connection() as conn:
                cursor = conn.cursor()
                
                # 今日の統計
                cursor.execute("""
                    SELECT 
                        COUNT(*) as scraped_count,
                        COUNT(CASE WHEN status != 'pending' THEN 1 END) as analyzed_count,
                        COUNT(CASE WHEN status = 'profitable' THEN 1 END) as profitable_count
                    FROM yahoo_products 
                    WHERE date(scraped_at) = date('now')
                """)
                daily_stats = dict(cursor.fetchone())
                
                # 今日の出品
                cursor.execute("""
                    SELECT 
                        COUNT(*) as listings_created,
                        AVG(profit_margin) as avg_margin,
                        SUM(current_price) as total_revenue_potential
                    FROM amazon_listings 
                    WHERE date(created_at) = date('now')
                """)
                listing_stats = dict(cursor.fetchone())
                
                # 今日のアラート
                cursor.execute("""
                    SELECT severity, COUNT(*) as count
                    FROM alerts 
                    WHERE date(created_at) = date('now')
                    GROUP BY severity
                """)
                alert_stats = {row['severity']: row['count'] for row in cursor.fetchall()}
                
                return {
                    "date": datetime.now().strftime('%Y-%m-%d'),
                    "scraped_products": daily_stats['scraped_count'],
                    "analyzed_products": daily_stats['analyzed_count'],
                    "profitable_products": daily_stats['profitable_count'],
                    "profitability_rate": round((daily_stats['profitable_count'] / max(daily_stats['analyzed_count'], 1)) * 100, 1),
                    "listings_created": listing_stats['listings_created'],
                    "avg_profit_margin": round(listing_stats['avg_margin'] or 0, 1),
                    "potential_revenue": round(listing_stats['total_revenue_potential'] or 0, 0),
                    "alerts": alert_stats
                }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/reports/performance")
    async def get_performance_report():
        """パフォーマンスレポート取得"""
        try:
            with yahoo_amazon_system.db.get_connection() as conn:
                cursor = conn.cursor()
                
                # 過去7日間の統計
                cursor.execute("""
                    SELECT 
                        date(scraped_at) as date,
                        COUNT(*) as scraped,
                        COUNT(CASE WHEN status != 'pending' THEN 1 END) as analyzed,
                        COUNT(CASE WHEN status = 'profitable' THEN 1 END) as profitable
                    FROM yahoo_products 
                    WHERE scraped_at >= date('now', '-7 days')
                    GROUP BY date(scraped_at)
                    ORDER BY date
                """)
                
                daily_performance = []
                for row in cursor.fetchall():
                    daily_performance.append({
                        "date": row['date'],
                        "scraped": row['scraped'],
                        "analyzed": row['analyzed'],
                        "profitable": row['profitable'],
                        "profitability_rate": round((row['profitable'] / max(row['analyzed'], 1)) * 100, 1)
                    })
                
                # ブランド別パフォーマンス
                cursor.execute("""
                    SELECT 
                        yp.brand,
                        COUNT(*) as total,
                        COUNT(CASE WHEN pa.is_profitable = 1 THEN 1 END) as profitable,
                        AVG(CASE WHEN pa.is_profitable = 1 THEN pa.profit_margin END) as avg_margin
                    FROM yahoo_products yp
                    LEFT JOIN profit_analysis pa ON yp.id = pa.yahoo_product_id
                    WHERE yp.brand IS NOT NULL AND yp.scraped_at >= date('now', '-30 days')
                    GROUP BY yp.brand
                    HAVING COUNT(*) >= 5
                    ORDER BY profitable DESC
                    LIMIT 10
                """)
                
                brand_performance = []
                for row in cursor.fetchall():
                    brand_performance.append({
                        "brand": row['brand'],
                        "total_products": row['total'],
                        "profitable_products": row['profitable'],
                        "profitability_rate": round((row['profitable'] / row['total']) * 100, 1),
                        "avg_margin": round(row['avg_margin'] or 0, 1)
                    })
                
                return {
                    "period": "過去7日間",
                    "daily_performance": daily_performance,
                    "brand_performance": brand_performance
                }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # ===============================
    # 設定管理 API
    # ===============================
    
    @app.get("/api/config/filters")
    async def get_filter_config():
        """フィルタ設定取得"""
        try:
            return {
                "exclusion_criteria": yahoo_amazon_system.product_filter.exclusion_criteria,
                "priority_criteria": yahoo_amazon_system.product_filter.priority_criteria
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.put("/api/config/filters")
    async def update_filter_config(config: dict):
        """フィルタ設定更新"""
        try:
            if "exclusion_criteria" in config:
                yahoo_amazon_system.product_filter.exclusion_criteria.update(config["exclusion_criteria"])
            
            if "priority_criteria" in config:
                yahoo_amazon_system.product_filter.priority_criteria.update(config["priority_criteria"])
            
            return {"message": "フィルタ設定を更新しました"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/config/amazon")
    async def get_amazon_config():
        """Amazon設定取得"""
        try:
            return {
                "marketplace_id": yahoo_amazon_system.amazon_api.marketplace_id,
                "has_credentials": bool(yahoo_amazon_system.amazon_api.client_id),
                "fee_rates": yahoo_amazon_system.profit_calculator.amazon_fees,
                "fba_fees": yahoo_amazon_system.profit_calculator.fba_fees
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    return app

# ===============================
# 13. CLI インターフェース
# ===============================

import click

@click.group()
def cli():
    """ヤフオク-Amazon転売システム CLI"""
    pass

@cli.command()
@click.option('--config', default='config.json', help='設定ファイルパス')
def start(config):
    """システム開始"""
    try:
        config_data = load_config(config)
        system = YahooAmazonSystem(config_data)
        
        click.echo("ヤフオク-Amazonシステムを開始します...")
        asyncio.run(system.start_system())
    except Exception as e:
        click.echo(f"エラー: {str(e)}")

@cli.command()
@click.option('--keyword', required=True, help='検索キーワード')
@click.option('--min-price', default=1000, help='最低価格')
@click.option('--max-price', default=50000, help='最高価格')
def search(keyword, min_price, max_price):
    """ヤフオク商品検索"""
    async def run_search():
        try:
            config_data = load_config()
            system = YahooAmazonSystem(config_data)
            
            click.echo(f"'{keyword}'を検索中...")
            
            results = await system.yahoo_scraper.search_products(
                keyword=keyword,
                min_price=min_price,
                max_price=max_price
            )
            
            click.echo(f"{len(results)}件の商品が見つかりました")
            
            for result in results[:10]:  # 上位10件表示
                click.echo(f"- {result.get('title', 'N/A')} ({result.get('current_price', 0)}円)")
            
        except Exception as e:
            click.echo(f"エラー: {str(e)}")
        finally:
            await system.yahoo_scraper.close_session()
    
    asyncio.run(run_search())

@cli.command()
@click.argument('auction_id')
def analyze(auction_id):
    """商品分析"""
    async def run_analysis():
        try:
            config_data = load_config()
            system = YahooAmazonSystem(config_data)
            
            click.echo(f"オークションID '{auction_id}' を分析中...")
            
            result = await system.manual_product_analysis(auction_id)
            
            if result['success']:
                yahoo = result['yahoo_product']
                amazon = result['amazon_info']
                profit = result['profit_analysis']
                rec = result['recommendation']
                
                click.echo("\n=== 分析結果 ===")
                click.echo(f"商品名: {yahoo['title']}")
                click.echo(f"現在価格: {yahoo['current_price']}円")
                click.echo(f"即決価格: {yahoo.get('instant_buy_price', 'なし')}円")
                click.echo(f"コンディション: {yahoo['condition']}")
                click.echo(f"Amazon存在: {'あり' if amazon['exists_on_amazon'] else 'なし'}")
                click.echo(f"ASIN: {amazon.get('asin', 'N/A')}")
                click.echo(f"推奨販売価格: {profit['recommended_price']}円")
                click.echo(f"予想利益: {profit['profit']}円")
                click.echo(f"利益率: {profit['profit_margin']:.1f}%")
                click.echo(f"出品戦略: {profit['listing_strategy']}")
                click.echo(f"購入推奨: {'はい' if rec['should_purchase'] else 'いいえ'}")
                click.echo(f"理由: {rec['reason']}")
                click.echo(f"優先度スコア: {rec['priority_score']:.1f}")
            else:
                click.echo(f"分析失敗: {result['error']}")
        
        except Exception as e:
            click.echo(f"エラー: {str(e)}")
        finally:
            await system.yahoo_scraper.close_session()
    
    asyncio.run(run_analysis())

@cli.command()
@click.option('--port', default=8000, help='ポート番号')
@click.option('--host', default='127.0.0.1', help='ホストアドレス')
def api(port, host):
    """API サーバー起動"""
    try:
        config_data = load_config()
        system = YahooAmazonSystem(config_data)
        app = create_api_app(system)
        
        click.echo(f"API サーバーを起動中... http://{host}:{port}")
        uvicorn.run(app, host=host, port=port)
    except Exception as e:
        click.echo(f"エラー: {str(e)}")

@cli.command()
def status():
    """システム状態確認"""
    try:
        config_data = load_config()
        system = YahooAmazonSystem(config_data)
        status = system.get_system_status()
        
        click.echo("=== システム状態 ===")
        click.echo(f"稼働状況: {'稼働中' if status['system_running'] else '停止中'}")
        click.echo(f"総商品数: {status['total_products']}")
        click.echo(f"処理待ち: {status['pending_products']}")
        click.echo(f"利益商品: {status['profitable_products']}")
        click.echo(f"出品中: {status['active_listings']}")
        click.echo(f"今日の取得: {status['today_scraped']}")
        click.echo(f"今日の出品: {status['today_listed']}")
        click.echo(f"平均利益: {status['avg_profit']}円")
        click.echo(f"平均利益率: {status['avg_margin']}%")
        click.echo(f"未解決アラート: {status['unresolved_alerts']}")
    except Exception as e:
        click.echo(f"エラー: {str(e)}")

# ===============================
# 14. 設定とメイン実行
# ===============================

def load_config(config_path: str = "config.json") -> Dict:
    """設定読み込み"""
    default_config = {
        'db_path': 'yahoo_amazon_system.db',
        'amazon_credentials': {
            'client_id': 'your_amazon_client_id',
            'client_secret': 'your_amazon_client_secret',
            'refresh_token': 'your_amazon_refresh_token'
        },
        'email_config': {
            'smtp_server': 'smtp.gmail.com',
            'smtp_port': 587,
            'sender_email': 'system@example.com',
            'sender_password': 'your_email_password',
            'recipient_email': 'admin@example.com'
        },
        'scraping_config': {
            'rate_limit_delay': 3,
            'max_concurrent_requests': 2,
            'retry_attempts': 3
        },
        'business_config': {
            'min_profit_margin': 20,
            'min_profit_amount': 1000,
            'max_purchase_price': 30000,
            'max_listings_per_day': 20
        }
    }
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            user_config = json.load(f)
            default_config.update(user_config)
    except FileNotFoundError:
        # 設定ファイルが存在しない場合はデフォルト設定で作成
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=2, ensure_ascii=False)
        print(f"設定ファイル '{config_path}' を作成しました。必要に応じて編集してください。")
    
    return default_config

async def main():
    """メイン実行関数"""
    print("ヤフオク-Amazon転売システム")
    print("=" * 50)
    
    # 設定読み込み
    config = load_config()
    
    # システム初期化
    system = YahooAmazonSystem(config)
    
    try:
        # システム開始
        await system.start_system()
    
    except KeyboardInterrupt:
        print("\nシステム停止要求を受信しました")
    
    except Exception as e:
        print(f"システムエラー: {str(e)}")
    
    finally:
        await system.stop_system()
        print("システムを停止しました")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # CLI モード
        cli()
    else:
        # 通常実行モード
        asyncio.run(main())