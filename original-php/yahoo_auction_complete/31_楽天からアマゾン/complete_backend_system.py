# 楽天-Amazon相乗り出品システム 完全バックエンド実装

import asyncio
import aiohttp
import json
import time
import random
import re
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import logging
from urllib.parse import urljoin, urlparse
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
    MATCHED = "matched"
    LISTED = "listed"
    ACTIVE = "active"
    INACTIVE = "inactive"
    OUT_OF_STOCK = "out_of_stock"
    ERROR = "error"

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class RakutenProduct:
    id: Optional[int]
    product_url: str
    jan_code: Optional[str]
    title: str
    price: float
    brand: Optional[str]
    category: Optional[str]
    ranking_position: Optional[int]
    review_count: int
    rating: float
    image_urls: List[str]
    description: Optional[str]
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

@dataclass
class ProductMatch:
    rakuten_product_id: int
    amazon_asin: str
    confidence: float
    match_method: str
    verified: bool = False

@dataclass
class AmazonListing:
    id: Optional[int]
    sku: str
    asin: str
    rakuten_product_id: int
    current_price: float
    min_profitable_price: float
    quantity: int
    status: ProductStatus
    profit_margin: float
    last_sync_at: Optional[datetime]

@dataclass
class ProfitCalculation:
    rakuten_cost: float
    amazon_revenue: float
    referral_fee: float
    fba_fee: float
    other_cost: float
    total_cost: float
    profit: float
    profit_margin: float
    is_profitable: bool

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
    def __init__(self, db_path: str = "rakuten_amazon_system.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """データベース初期化"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 楽天商品テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS rakuten_products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_url TEXT UNIQUE NOT NULL,
                    jan_code TEXT,
                    title TEXT NOT NULL,
                    price REAL NOT NULL,
                    brand TEXT,
                    category TEXT,
                    ranking_position INTEGER,
                    review_count INTEGER DEFAULT 0,
                    rating REAL DEFAULT 0,
                    image_urls TEXT,
                    description TEXT,
                    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'pending'
                )
            """)
            
            # 商品マッチングテーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS product_matches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    rakuten_product_id INTEGER,
                    amazon_asin TEXT,
                    confidence REAL,
                    match_method TEXT,
                    verified BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (rakuten_product_id) REFERENCES rakuten_products(id)
                )
            """)
            
            # Amazon出品テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS amazon_listings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sku TEXT UNIQUE NOT NULL,
                    asin TEXT NOT NULL,
                    rakuten_product_id INTEGER,
                    current_price REAL,
                    min_profitable_price REAL,
                    quantity INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'active',
                    profit_margin REAL,
                    last_sync_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (rakuten_product_id) REFERENCES rakuten_products(id)
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
            
            # 在庫履歴テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS inventory_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    amazon_listing_id INTEGER,
                    old_quantity INTEGER,
                    new_quantity INTEGER,
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
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_rakuten_jan ON rakuten_products(jan_code)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_matches_asin ON product_matches(amazon_asin)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_listings_sku ON amazon_listings(sku)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_listings_asin ON amazon_listings(asin)")
            
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
    
    def save_rakuten_product(self, product: RakutenProduct) -> int:
        """楽天商品保存"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO rakuten_products 
                (product_url, jan_code, title, price, brand, category, ranking_position, 
                 review_count, rating, image_urls, description, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                product.product_url, product.jan_code, product.title, product.price,
                product.brand, product.category, product.ranking_position,
                product.review_count, product.rating, json.dumps(product.image_urls),
                product.description, product.status.value
            ))
            conn.commit()
            return cursor.lastrowid
    
    def get_pending_products(self, limit: int = 100) -> List[RakutenProduct]:
        """処理待ち商品取得"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM rakuten_products 
                WHERE status = 'pending' 
                ORDER BY ranking_position ASC, scraped_at DESC 
                LIMIT ?
            """, (limit,))
            
            products = []
            for row in cursor.fetchall():
                products.append(RakutenProduct(
                    id=row['id'],
                    product_url=row['product_url'],
                    jan_code=row['jan_code'],
                    title=row['title'],
                    price=row['price'],
                    brand=row['brand'],
                    category=row['category'],
                    ranking_position=row['ranking_position'],
                    review_count=row['review_count'],
                    rating=row['rating'],
                    image_urls=json.loads(row['image_urls']) if row['image_urls'] else [],
                    description=row['description'],
                    scraped_at=datetime.fromisoformat(row['scraped_at']),
                    status=ProductStatus(row['status'])
                ))
            return products
    
    def save_product_match(self, match: ProductMatch) -> int:
        """商品マッチング保存"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO product_matches 
                (rakuten_product_id, amazon_asin, confidence, match_method, verified)
                VALUES (?, ?, ?, ?, ?)
            """, (
                match.rakuten_product_id, match.amazon_asin, match.confidence,
                match.match_method, match.verified
            ))
            conn.commit()
            return cursor.lastrowid
    
    def save_amazon_listing(self, listing: AmazonListing) -> int:
        """Amazon出品保存"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO amazon_listings 
                (sku, asin, rakuten_product_id, current_price, min_profitable_price,
                 quantity, status, profit_margin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                listing.sku, listing.asin, listing.rakuten_product_id,
                listing.current_price, listing.min_profitable_price,
                listing.quantity, listing.status.value, listing.profit_margin
            ))
            conn.commit()
            return cursor.lastrowid
    
    def get_active_listings(self) -> List[AmazonListing]:
        """アクティブな出品取得"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM amazon_listings 
                WHERE status IN ('active', 'out_of_stock')
                ORDER BY created_at DESC
            """)
            
            listings = []
            for row in cursor.fetchall():
                listings.append(AmazonListing(
                    id=row['id'],
                    sku=row['sku'],
                    asin=row['asin'],
                    rakuten_product_id=row['rakuten_product_id'],
                    current_price=row['current_price'],
                    min_profitable_price=row['min_profitable_price'],
                    quantity=row['quantity'],
                    status=ProductStatus(row['status']),
                    profit_margin=row['profit_margin'],
                    last_sync_at=datetime.fromisoformat(row['last_sync_at']) if row['last_sync_at'] else None
                ))
            return listings
    
    def update_listing_price_quantity(self, sku: str, price: float = None, quantity: int = None):
        """出品価格・在庫更新"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            if price is not None and quantity is not None:
                cursor.execute("""
                    UPDATE amazon_listings 
                    SET current_price = ?, quantity = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE sku = ?
                """, (price, quantity, sku))
            elif price is not None:
                cursor.execute("""
                    UPDATE amazon_listings 
                    SET current_price = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE sku = ?
                """, (price, sku))
            elif quantity is not None:
                cursor.execute("""
                    UPDATE amazon_listings 
                    SET quantity = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE sku = ?
                """, (quantity, sku))
            
            conn.commit()
    
    def save_alert(self, alert: SystemAlert):
        """アラート保存"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO alerts 
                (alert_type, severity, title, message, related_sku, related_asin)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                alert.alert_type, alert.severity.value, alert.title,
                alert.message, alert.related_sku, alert.related_asin
            ))
            conn.commit()

# ===============================
# 3. 楽天スクレイピングシステム
# ===============================

class RakutenScraper:
    def __init__(self):
        self.session = None
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        self.rate_limit_delay = 2
        self.logger = logging.getLogger(__name__)
    
    async def init_session(self):
        """セッション初期化"""
        if not self.session:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(
                headers=self.headers,
                timeout=timeout,
                connector=aiohttp.TCPConnector(limit=3, limit_per_host=1)
            )
    
    async def close_session(self):
        """セッション終了"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def scrape_ranking_page(self, category_id: str, page: int = 1) -> List[Dict]:
        """ランキングページスクレイピング"""
        await self.init_session()
        
        url = f"https://ranking.rakuten.co.jp/category/{category_id}/?page={page}"
        
        try:
            # レート制限
            await asyncio.sleep(random.uniform(1, self.rate_limit_delay))
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    return self.parse_ranking_page(html)
                else:
                    self.logger.error(f"ランキングページ取得失敗: {url} - Status: {response.status}")
                    return []
        
        except Exception as e:
            self.logger.error(f"スクレイピングエラー: {url} - {str(e)}")
            return []
    
    def parse_ranking_page(self, html: str) -> List[Dict]:
        """ランキングページ解析"""
        soup = BeautifulSoup(html, 'html.parser')
        products = []
        
        # 商品リスト要素を探す
        product_elements = soup.find_all(['div', 'li'], class_=re.compile(r'.*item.*|.*product.*|.*ranking.*'))
        
        for i, element in enumerate(product_elements[:50]):  # 上位50件まで
            try:
                product_data = self.extract_product_summary(element, i + 1)
                if product_data:
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
            
            # 絶対URLに変換
            if product_url.startswith('//'):
                product_url = 'https:' + product_url
            elif product_url.startswith('/'):
                product_url = 'https://ranking.rakuten.co.jp' + product_url
            
            # 商品名
            title_elem = element.find(['h2', 'h3', 'h4', 'span', 'div'], 
                                    class_=re.compile(r'.*title.*|.*name.*|.*product.*'))
            title = title_elem.get_text(strip=True) if title_elem else "商品名不明"
            
            # 価格
            price_elem = element.find(['span', 'div', 'p'], 
                                    class_=re.compile(r'.*price.*|.*cost.*|.*yen.*'))
            price = self.extract_price_from_text(price_elem.get_text() if price_elem else "0")
            
            # 画像URL
            img_elem = element.find('img', src=True)
            image_url = img_elem['src'] if img_elem else None
            if image_url and image_url.startswith('//'):
                image_url = 'https:' + image_url
            
            return {
                'product_url': product_url,
                'title': title,
                'price': price,
                'ranking_position': ranking_position,
                'image_urls': [image_url] if image_url else [],
                'review_count': 0,
                'rating': 0.0
            }
        
        except Exception as e:
            self.logger.warning(f"商品概要抽出エラー: {str(e)}")
            return None
    
    async def get_product_details(self, product_url: str) -> Optional[Dict]:
        """商品詳細情報取得"""
        await self.init_session()
        
        try:
            await asyncio.sleep(random.uniform(1, self.rate_limit_delay))
            
            async with self.session.get(product_url) as response:
                if response.status == 200:
                    html = await response.text()
                    return self.parse_product_details(html, product_url)
                else:
                    self.logger.error(f"商品詳細取得失敗: {product_url}")
                    return None
        
        except Exception as e:
            self.logger.error(f"商品詳細取得エラー: {product_url} - {str(e)}")
            return None
    
    def parse_product_details(self, html: str, product_url: str) -> Dict:
        """商品詳細解析"""
        soup = BeautifulSoup(html, 'html.parser')
        
        # JANコード抽出
        jan_code = self.extract_jan_code(soup)
        
        # ブランド名抽出
        brand = self.extract_brand(soup)
        
        # カテゴリ抽出
        category = self.extract_category(soup)
        
        # 商品説明抽出
        description = self.extract_description(soup)
        
        # レビュー情報抽出
        review_count = self.extract_review_count(soup)
        rating = self.extract_rating(soup)
        
        # 画像URL抽出
        image_urls = self.extract_image_urls(soup)
        
        return {
            'jan_code': jan_code,
            'brand': brand,
            'category': category,
            'description': description,
            'review_count': review_count,
            'rating': rating,
            'image_urls': image_urls
        }
    
    def extract_jan_code(self, soup: BeautifulSoup) -> Optional[str]:
        """JANコード抽出"""
        # 商品仕様表から検索
        jan_patterns = ['JAN', 'jan', 'ＪＡＮ', '商品コード', 'バーコード', 'EAN']
        
        for pattern in jan_patterns:
            # テーブルから検索
            for table in soup.find_all('table'):
                for row in table.find_all('tr'):
                    cells = row.find_all(['td', 'th'])
                    for i, cell in enumerate(cells):
                        if pattern in cell.get_text():
                            if i + 1 < len(cells):
                                jan_text = cells[i + 1].get_text()
                                jan_match = re.search(r'\d{13}', jan_text)
                                if jan_match:
                                    return jan_match.group()
            
            # 通常のテキストから検索
            for text in soup.find_all(text=re.compile(pattern)):
                if text.parent:
                    parent_text = text.parent.get_text()
                    jan_match = re.search(r'\d{13}', parent_text)
                    if jan_match:
                        return jan_match.group()
        
        return None
    
    def extract_brand(self, soup: BeautifulSoup) -> Optional[str]:
        """ブランド名抽出"""
        # ブランド情報を探す
        brand_selectors = [
            '[class*="brand"]', '[class*="maker"]', '[class*="manufacturer"]',
            '.brand', '.maker', '.manufacturer'
        ]
        
        for selector in brand_selectors:
            brand_elem = soup.select_one(selector)
            if brand_elem:
                brand_text = brand_elem.get_text(strip=True)
                if brand_text and len(brand_text) < 50:
                    return brand_text
        
        return None
    
    def extract_category(self, soup: BeautifulSoup) -> Optional[str]:
        """カテゴリ抽出"""
        # パンくずリストから抽出
        breadcrumb_elem = soup.find(['nav', 'div'], class_=re.compile(r'.*breadcrumb.*|.*path.*'))
        if breadcrumb_elem:
            categories = [link.get_text(strip=True) for link in breadcrumb_elem.find_all('a')]
            if len(categories) > 1:
                return categories[-2]  # 最後から2番目のカテゴリ
        
        return None
    
    def extract_description(self, soup: BeautifulSoup) -> Optional[str]:
        """商品説明抽出"""
        desc_selectors = [
            '[class*="description"]', '[class*="detail"]', '[class*="spec"]',
            '.description', '.detail', '.spec'
        ]
        
        for selector in desc_selectors:
            desc_elem = soup.select_one(selector)
            if desc_elem:
                desc_text = desc_elem.get_text(strip=True)
                if desc_text and len(desc_text) > 20:
                    return desc_text[:1000]  # 最大1000文字
        
        return None
    
    def extract_review_count(self, soup: BeautifulSoup) -> int:
        """レビュー数抽出"""
        review_patterns = [r'(\d+)\s*件?のレビュー', r'レビュー\s*[：:]?\s*(\d+)', r'(\d+)\s*レビュー']
        
        for pattern in review_patterns:
            for text in soup.find_all(text=re.compile(pattern)):
                match = re.search(pattern, text)
                if match:
                    return int(match.group(1))
        
        return 0
    
    def extract_rating(self, soup: BeautifulSoup) -> float:
        """評価抽出"""
        rating_patterns = [r'(\d+\.?\d*)\s*点', r'評価\s*[：:]?\s*(\d+\.?\d*)']
        
        for pattern in rating_patterns:
            for text in soup.find_all(text=re.compile(pattern)):
                match = re.search(pattern, text)
                if match:
                    return float(match.group(1))
        
        return 0.0
    
    def extract_image_urls(self, soup: BeautifulSoup) -> List[str]:
        """画像URL抽出"""
        image_urls = []
        
        # 商品画像を探す
        img_elements = soup.find_all('img', src=True)
        
        for img in img_elements:
            src = img['src']
            
            # 商品画像らしいURLを判定
            if any(keyword in src.lower() for keyword in ['product', 'item', 'goods', 'image']):
                if src.startswith('//'):
                    src = 'https:' + src
                elif src.startswith('/'):
                    continue  # 相対パスはスキップ
                
                if src not in image_urls:
                    image_urls.append(src)
        
        return image_urls[:5]  # 最大5枚
    
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
    
    async def check_stock_availability(self, product_url: str) -> Dict:
        """在庫確認"""
        try:
            await self.init_session()
            
            async with self.session.get(product_url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # 在庫状況確認
                    page_text = soup.get_text().lower()
                    
                    out_of_stock_indicators = [
                        '在庫切れ', '品切れ', '売り切れ', '取り寄せ', '入荷待ち',
                        'out of stock', 'sold out'
                    ]
                    
                    in_stock_indicators = [
                        '在庫あり', '即納', '通常配送', '在庫○', '◎'
                    ]
                    
                    # 在庫切れ判定
                    if any(indicator in page_text for indicator in out_of_stock_indicators):
                        return {'available': False, 'quantity': 0}
                    
                    # 在庫あり判定
                    if any(indicator in page_text for indicator in in_stock_indicators):
                        return {'available': True, 'quantity': 5}
                    
                    # 判定不可の場合は在庫ありとして扱う
                    return {'available': True, 'quantity': 3}
        
        except Exception as e:
            self.logger.error(f"在庫確認エラー: {product_url} - {str(e)}")
            return {'available': False, 'quantity': 0}

# ===============================
# 4. Amazon SP-API モック実装
# ===============================

class AmazonSPAPIMock:
    """Amazon SP-API モック実装"""
    
    def __init__(self, credentials: Dict):
        self.client_id = credentials.get('client_id')
        self.client_secret = credentials.get('client_secret')
        self.refresh_token = credentials.get('refresh_token')
        self.marketplace_id = 'A1VC38T7YXB528'  # 日本
        self.logger = logging.getLogger(__name__)
        
        # モックデータ
        self.mock_products = self._initialize_mock_data()
    
    def _initialize_mock_data(self):
        """モックデータ初期化"""
        return {
            'B01234567X': {
                'asin': 'B01234567X',
                'title': 'iPhone 15 Pro ケース',
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
                'weight': 50
            }
        }
    
    async def search_catalog_items(self, keywords: str, marketplace_ids: List[str] = None) -> Dict:
        """商品カタログ検索（モック）"""
        await asyncio.sleep(0.1)  # API遅延シミュレート
        
        # JANコード検索の場合
        if keywords.isdigit() and len(keywords) == 13:
            return self._mock_jan_search_result(keywords)
        
        # キーワード検索の場合
        return self._mock_keyword_search_result(keywords)
    
    def _mock_jan_search_result(self, jan_code: str) -> Dict:
        """JANコード検索結果モック"""
        # JANコードに基づいてASIN生成
        asin = f"B{jan_code[:9]}X"
        
        return {
            'items': [
                {
                    'asin': asin,
                    'title': f'商品 {jan_code[:6]}',
                    'identifiers': {'ean': jan_code},
                    'summaries': [{'marketplaceId': self.marketplace_id}]
                }
            ]
        }
    
    def _mock_keyword_search_result(self, keywords: str) -> Dict:
        """キーワード検索結果モック"""
        # キーワードベースのモック結果
        mock_results = []
        
        for i in range(3):  # 3件の結果を返す
            asin = f"B{abs(hash(keywords + str(i))) % 1000000000:09d}X"
            mock_results.append({
                'asin': asin,
                'title': f'{keywords} 関連商品 {i+1}',
                'summaries': [{'marketplaceId': self.marketplace_id}]
            })
        
        return {'items': mock_results}
    
    async def get_competitive_pricing(self, asin: str) -> Dict:
        """競合価格取得（モック）"""
        await asyncio.sleep(0.1)
        
        if asin in self.mock_products:
            return {
                'offers': self.mock_products[asin]['competitors'],
                'asin': asin
            }
        
        # ランダムな競合価格生成
        base_price = random.randint(1000, 5000)
        competitors = []
        
        for i in range(random.randint(2, 5)):
            price_variation = random.randint(-500, 500)
            competitors.append({
                'seller_id': f'A{random.randint(100, 999)}',
                'price': max(base_price + price_variation, 500),
                'condition': 'new'
            })
        
        return {'offers': competitors, 'asin': asin}
    
    async def create_listing(self, listing_data: Dict) -> Dict:
        """出品作成（モック）"""
        await asyncio.sleep(0.2)
        
        # 成功レスポンスモック
        return {
            'status': 'ACCEPTED',
            'submissionId': str(uuid.uuid4()),
            'sku': listing_data.get('sku'),
            'issues': []
        }
    
    async def update_price_and_quantity(self, sku: str, price: float = None, quantity: int = None) -> Dict:
        """価格・在庫更新（モック）"""
        await asyncio.sleep(0.1)
        
        self.logger.info(f"価格・在庫更新: SKU={sku}, Price={price}, Quantity={quantity}")
        
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
# 5. 商品マッチングシステム
# ===============================

class ProductMatcher:
    def __init__(self, amazon_api: AmazonSPAPIMock):
        self.amazon_api = amazon_api
        self.confidence_threshold = 0.7
        self.logger = logging.getLogger(__name__)
    
    async def find_amazon_matches(self, rakuten_product: RakutenProduct) -> List[ProductMatch]:
        """Amazon商品マッチング"""
        matches = []
        
        # 1. JANコード完全一致検索
        if rakuten_product.jan_code:
            jan_matches = await self._search_by_jan_code(rakuten_product)
            matches.extend(jan_matches)
        
        # 2. キーワード検索（JANコードで見つからない場合）
        if not matches or max([m.confidence for m in matches]) < 0.9:
            keyword_matches = await self._search_by_keywords(rakuten_product)
            matches.extend(keyword_matches)
        
        # 3. 重複除去とスコアリング
        unique_matches = self._deduplicate_matches(matches)
        verified_matches = await self._verify_matches(unique_matches, rakuten_product)
        
        return sorted(verified_matches, key=lambda x: x.confidence, reverse=True)
    
    async def _search_by_jan_code(self, rakuten_product: RakutenProduct) -> List[ProductMatch]:
        """JANコード検索"""
        try:
            response = await self.amazon_api.search_catalog_items(
                keywords=rakuten_product.jan_code,
                marketplace_ids=[self.amazon_api.marketplace_id]
            )
            
            matches = []
            for item in response.get('items', []):
                # JANコード完全一致確認
                item_ean = item.get('identifiers', {}).get('ean')
                if item_ean == rakuten_product.jan_code:
                    matches.append(ProductMatch(
                        rakuten_product_id=rakuten_product.id,
                        amazon_asin=item['asin'],
                        confidence=0.95,
                        match_method='jan_exact',
                        verified=True
                    ))
            
            return matches
        
        except Exception as e:
            self.logger.error(f"JANコード検索エラー: {str(e)}")
            return []
    
    async def _search_by_keywords(self, rakuten_product: RakutenProduct) -> List[ProductMatch]:
        """キーワード検索"""
        try:
            # 検索キーワード生成
            keywords = self._generate_search_keywords(rakuten_product)
            
            matches = []
            for keyword in keywords[:3]:  # 上位3つのキーワード
                response = await self.amazon_api.search_catalog_items(
                    keywords=keyword,
                    marketplace_ids=[self.amazon_api.marketplace_id]
                )
                
                for item in response.get('items', []):
                    # タイトル類似度計算
                    similarity = self._calculate_title_similarity(
                        rakuten_product.title, 
                        item.get('title', '')
                    )
                    
                    if similarity > self.confidence_threshold:
                        matches.append(ProductMatch(
                            rakuten_product_id=rakuten_product.id,
                            amazon_asin=item['asin'],
                            confidence=similarity,
                            match_method='keyword',
                            verified=False
                        ))
            
            return matches
        
        except Exception as e:
            self.logger.error(f"キーワード検索エラー: {str(e)}")
            return []
    
    def _generate_search_keywords(self, product: RakutenProduct) -> List[str]:
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
    
    async def _verify_matches(self, matches: List[ProductMatch], rakuten_product: RakutenProduct) -> List[ProductMatch]:
        """マッチング検証"""
        verified_matches = []
        
        for match in matches:
            try:
                # Amazon商品詳細取得
                competitive_data = await self.amazon_api.get_competitive_pricing(match.amazon_asin)
                
                # 価格妥当性確認
                if competitive_data.get('offers'):
                    amazon_prices = [offer['price'] for offer in competitive_data['offers']]
                    avg_amazon_price = sum(amazon_prices) / len(amazon_prices)
                    
                    # 価格差が妥当範囲内かチェック
                    price_ratio = avg_amazon_price / rakuten_product.price if rakuten_product.price > 0 else 0
                    
                    if 0.5 <= price_ratio <= 3.0:  # 0.5倍〜3倍の範囲
                        match.confidence *= 1.1  # 信頼度向上
                    else:
                        match.confidence *= 0.8  # 信頼度低下
                
                verified_matches.append(match)
            
            except Exception as e:
                self.logger.warning(f"マッチング検証エラー: {match.amazon_asin} - {str(e)}")
                verified_matches.append(match)  # エラーでも含める
        
        return verified_matches

# ===============================
# 6. 利益計算システム
# ===============================

class ProfitCalculator:
    def __init__(self):
        # Amazon手数料設定
        self.amazon_fees = {
            'Electronics': 0.08,           # 家電 8%
            'Beauty': 0.10,                # 美容 10%
            'Sports': 0.10,                # スポーツ 10%
            'Home': 0.15,                  # ホーム 15%
            'Books': 0.15,                 # 本 15%
            'default': 0.10                # デフォルト 10%
        }
        
        # その他コスト
        self.other_costs = {
            'rakuten_purchase_fee': 0.01,  # 楽天購入手数料1%
            'shipping_to_fba': 300,        # FBA納品送料
            'packaging_cost': 50,          # 梱包コスト
            'credit_card_fee': 0.02        # クレジットカード手数料2%
        }
        
        # FBA手数料（サイズ・重量別）
        self.fba_fees = {
            'small_standard': 318,         # 小型標準サイズ
            'large_standard': 434,         # 大型標準サイズ
            'small_oversize': 514,         # 小型大型サイズ
            'medium_oversize': 648,        # 中型大型サイズ
            'large_oversize': 972          # 大型大型サイズ
        }
    
    def calculate_profit(self, rakuten_price: float, amazon_price: float, 
                        category: str = 'default', size_tier: str = 'small_standard') -> ProfitCalculation:
        """詳細利益計算"""
        
        # 1. 楽天での購入コスト
        rakuten_cost = rakuten_price * (1 + self.other_costs['rakuten_purchase_fee'])
        rakuten_cost += rakuten_price * self.other_costs['credit_card_fee']
        
        # 2. Amazon販売手数料
        referral_fee_rate = self.amazon_fees.get(category, self.amazon_fees['default'])
        referral_fee = amazon_price * referral_fee_rate
        
        # 3. FBA手数料
        fba_fee = self.fba_fees.get(size_tier, self.fba_fees['small_standard'])
        
        # 4. その他コスト
        other_cost = (
            self.other_costs['shipping_to_fba'] +
            self.other_costs['packaging_cost']
        )
        
        # 5. 総コスト計算
        total_cost = rakuten_cost + referral_fee + fba_fee + other_cost
        
        # 6. 利益・利益率計算
        profit = amazon_price - total_cost
        profit_margin = (profit / amazon_price) * 100 if amazon_price > 0 else 0
        
        return ProfitCalculation(
            rakuten_cost=rakuten_cost,
            amazon_revenue=amazon_price,
            referral_fee=referral_fee,
            fba_fee=fba_fee,
            other_cost=other_cost,
            total_cost=total_cost,
            profit=profit,
            profit_margin=profit_margin,
            is_profitable=self._is_profitable(profit, profit_margin, amazon_price)
        )
    
    def _is_profitable(self, profit: float, profit_margin: float, amazon_price: float) -> bool:
        """利益判定"""
        return (
            profit >= 500 and              # 最低利益額500円
            profit_margin >= 15 and        # 最低利益率15%
            amazon_price >= 1000           # 最低販売価格1000円
        )
    
    def calculate_optimal_price(self, rakuten_price: float, competitive_prices: List[float], 
                               category: str = 'default', target_margin: float = 20) -> float:
        """最適価格計算"""
        if not competitive_prices:
            # 競合価格がない場合は楽天価格の1.3倍
            return rakuten_price * 1.3
        
        # 競合の最安値
        min_competitor_price = min(competitive_prices)
        
        # コスト逆算による最低価格
        min_required_price = self._calculate_minimum_price(rakuten_price, category, target_margin)
        
        # 価格戦略決定
        if min_competitor_price > min_required_price:
            # 競合より少し安く設定
            optimal_price = min_competitor_price - 1
        else:
            # 最低価格で設定
            optimal_price = min_required_price
        
        return max(optimal_price, min_required_price)
    
    def _calculate_minimum_price(self, rakuten_price: float, category: str, target_margin: float) -> float:
        """最低販売価格計算"""
        referral_fee_rate = self.amazon_fees.get(category, self.amazon_fees['default'])
        
        # 固定コスト
        fixed_costs = (
            rakuten_price * (1 + self.other_costs['rakuten_purchase_fee'] + self.other_costs['credit_card_fee']) +
            self.fba_fees['small_standard'] +
            self.other_costs['shipping_to_fba'] +
            self.other_costs['packaging_cost']
        )
        
        # 目標利益率から逆算
        margin_multiplier = 1 - referral_fee_rate - (target_margin / 100)
        
        if margin_multiplier <= 0:
            return float('inf')  # 利益確保不可能
        
        return fixed_costs / margin_multiplier

# ===============================
# 7. 商品フィルタリングシステム
# ===============================

class ProductFilter:
    def __init__(self):
        self.exclusion_criteria = {
            'banned_categories': [
                'Health & Personal Care',
                'Grocery & Gourmet Food',
                'Baby',
                'Pet Supplies',
                'Beauty'  # 薬事法関連
            ],
            'banned_keywords': [
                '医薬品', '薬', 'サプリメント', '健康食品', 
                'コンタクト', 'コンタクトレンズ',
                'タバコ', 'アルコール', '酒'
            ],
            'banned_brands': [
                'Apple', 'Sony', 'Nintendo', 'Canon', 'Nikon',
                'Louis Vuitton', 'Gucci', 'Hermes', 'Chanel'
            ],
            'size_restrictions': {
                'max_weight': 9000,         # 最大重量9kg
                'max_dimension': 45         # 最大辺45cm
            }
        }
        
        self.priority_criteria = {
            'min_sales_rank': 100000,       # 売上ランキング10万位以内
            'min_review_count': 5,          # レビュー数5件以上
            'min_rating': 3.5,              # 評価3.5以上
            'max_competitors': 8,           # 競合セラー8社以下
            'min_price': 1000,              # 最低価格1000円
            'max_price': 50000              # 最高価格5万円
        }
    
    def should_list_product(self, rakuten_product: RakutenProduct, 
                           amazon_data: Dict, profit_calc: ProfitCalculation) -> tuple[bool, str]:
        """出品可否判定"""
        
        # 1. 基本的な除外条件チェック
        is_excluded, reason = self._check_exclusion_criteria(rakuten_product, amazon_data)
        if is_excluded:
            return False, reason
        
        # 2. 利益基準チェック
        if not profit_calc.is_profitable:
            return False, f"利益不足: 利益率{profit_calc.profit_margin:.1f}%"
        
        # 3. 価格帯チェック
        if (rakuten_product.price < self.priority_criteria['min_price'] or 
            rakuten_product.price > self.priority_criteria['max_price']):
            return False, f"価格帯外: {rakuten_product.price}円"
        
        # 4. 競合状況チェック
        competitor_count = len(amazon_data.get('competitors', []))
        if competitor_count > self.priority_criteria['max_competitors']:
            return False, f"競合過多: {competitor_count}社"
        
        # 5. 市場性チェック
        sales_rank = amazon_data.get('sales_rank', float('inf'))
        if sales_rank > self.priority_criteria['min_sales_rank']:
            return False, f"売上ランキング低位: {sales_rank}位"
        
        return True, "出品推奨"
    
    def _check_exclusion_criteria(self, rakuten_product: RakutenProduct, amazon_data: Dict) -> tuple[bool, str]:
        """除外条件チェック"""
        
        # カテゴリチェック
        category = amazon_data.get('category', '')
        if any(banned in category for banned in self.exclusion_criteria['banned_categories']):
            return True, f"禁止カテゴリ: {category}"
        
        # キーワードチェック
        title_lower = rakuten_product.title.lower()
        for keyword in self.exclusion_criteria['banned_keywords']:
            if keyword in title_lower:
                return True, f"禁止キーワード: {keyword}"
        
        # ブランドチェック
        if (rakuten_product.brand and 
            rakuten_product.brand in self.exclusion_criteria['banned_brands']):
            return True, f"禁止ブランド: {rakuten_product.brand}"
        
        # サイズチェック
        dimensions = amazon_data.get('dimensions', {})
        weight = amazon_data.get('weight', 0)
        
        if weight > self.exclusion_criteria['size_restrictions']['max_weight']:
            return True, f"重量超過: {weight}g"
        
        max_dim = max(
            dimensions.get('length', 0),
            dimensions.get('width', 0),
            dimensions.get('height', 0)
        )
        
        if max_dim > self.exclusion_criteria['size_restrictions']['max_dimension']:
            return True, f"サイズ超過: {max_dim}cm"
        
        return False, ""
    
    def calculate_priority_score(self, rakuten_product: RakutenProduct, 
                                amazon_data: Dict, profit_calc: ProfitCalculation) -> float:
        """優先度スコア計算"""
        score = 0.0
        
        # 利益率スコア (0-40点)
        if profit_calc.profit_margin >= 30:
            score += 40
        elif profit_calc.profit_margin >= 20:
            score += 30
        elif profit_calc.profit_margin >= 15:
            score += 20
        
        # 売上ランキングスコア (0-25点)
        sales_rank = amazon_data.get('sales_rank', float('inf'))
        if sales_rank <= 10000:
            score += 25
        elif sales_rank <= 50000:
            score += 15
        elif sales_rank <= 100000:
            score += 10
        
        # レビュー数スコア (0-15点)
        review_count = amazon_data.get('review_count', 0)
        if review_count >= 100:
            score += 15
        elif review_count >= 50:
            score += 10
        elif review_count >= 10:
            score += 5
        
        # 評価スコア (0-10点)
        rating = amazon_data.get('rating', 0)
        if rating >= 4.5:
            score += 10
        elif rating >= 4.0:
            score += 7
        elif rating >= 3.5:
            score += 5
        
        # 競合数スコア (0-10点)
        competitor_count = len(amazon_data.get('competitors', []))
        if competitor_count <= 3:
            score += 10
        elif competitor_count <= 5:
            score += 7
        elif competitor_count <= 8:
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
    
    async def create_listing(self, rakuten_product: RakutenProduct, 
                           amazon_asin: str, optimal_price: float) -> Dict:
        """新規出品作成"""
        
        # SKU生成
        sku = f"RKT-{rakuten_product.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # 出品データ構築
        listing_data = {
            'sku': sku,
            'asin': amazon_asin,
            'productType': 'PRODUCT',
            'requirements': {
                'asin': amazon_asin
            },
            'attributes': {
                'condition_type': 'new_new',
                'fulfillment_availability': [{
                    'fulfillment_channel_code': 'AMAZON_NA',
                    'quantity': 3,  # 初期在庫3個
                    'lead_time_to_ship_max_days': 2
                }],
                'purchasable_offer': [{
                    'currency': 'JPY',
                    'our_price': optimal_price
                }]
            }
        }
        
        try:
            # Amazon API呼び出し
            response = await self.amazon_api.create_listing(listing_data)
            
            if response.get('status') == 'ACCEPTED':
                # データベースに保存
                listing = AmazonListing(
                    id=None,
                    sku=sku,
                    asin=amazon_asin,
                    rakuten_product_id=rakuten_product.id,
                    current_price=optimal_price,
                    min_profitable_price=optimal_price * 0.9,  # 10%の値下げ余地
                    quantity=3,
                    status=ProductStatus.ACTIVE,
                    profit_margin=0.0,  # 後で計算
                    last_sync_at=datetime.now()
                )
                
                listing_id = self.db.save_amazon_listing(listing)
                
                self.logger.info(f"出品成功: SKU={sku}, ASIN={amazon_asin}, Price={optimal_price}")
                
                return {
                    'success': True,
                    'sku': sku,
                    'listing_id': listing_id,
                    'response': response
                }
            else:
                self.logger.error(f"出品失敗: {response}")
                return {'success': False, 'error': response}
        
        except Exception as e:
            self.logger.error(f"出品作成エラー: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def update_price_and_quantity(self, sku: str, new_price: float = None, 
                                       new_quantity: int = None) -> Dict:
        """価格・在庫更新"""
        try:
            response = await self.amazon_api.update_price_and_quantity(sku, new_price, new_quantity)
            
            if response.get('status') == 'ACCEPTED':
                # データベース更新
                self.db.update_listing_price_quantity(sku, new_price, new_quantity)
                
                self.logger.info(f"更新成功: SKU={sku}, Price={new_price}, Quantity={new_quantity}")
                
                return {'success': True, 'response': response}
            else:
                return {'success': False, 'error': response}
        
        except Exception as e:
            self.logger.error(f"更新エラー: SKU={sku} - {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def delete_listing(self, sku: str) -> Dict:
        """出品削除"""
        try:
            response = await self.amazon_api.delete_listing(sku)
            
            if response.get('status') == 'ACCEPTED':
                self.logger.info(f"削除成功: SKU={sku}")
                return {'success': True, 'response': response}
            else:
                return {'success': False, 'error': response}
        
        except Exception as e:
            self.logger.error(f"削除エラー: SKU={sku} - {str(e)}")
            return {'success': False, 'error': str(e)}

# ===============================
# 9. 在庫管理・監視システム
# ===============================

class InventoryManager:
    def __init__(self, db: DatabaseManager, rakuten_scraper: RakutenScraper, 
                 amazon_api: AmazonSPAPIMock, listing_manager: AmazonListingManager):
        self.db = db
        self.rakuten_scraper = rakuten_scraper
        self.amazon_api = amazon_api
        self.listing_manager = listing_manager
        self.logger = logging.getLogger(__name__)
    
    async def sync_all_inventory(self) -> Dict:
        """全在庫同期"""
        active_listings = self.db.get_active_listings()
        
        results = {
            'total_processed': 0,
            'successful_syncs': 0,
            'errors': 0,
            'details': []
        }
        
        for listing in active_listings:
            try:
                result = await self._sync_single_listing(listing)
                results['details'].append(result)
                results['total_processed'] += 1