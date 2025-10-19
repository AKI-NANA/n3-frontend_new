"""
app/infrastructure/external/amazon/amazon_scraper.py - Amazon商品情報スクレイピング
用途: Amazon商品ページから商品情報を安全に取得
修正対象: Amazon構造変更時、新データ項目追加時
"""

import asyncio
import aiohttp
import re
import json
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from urllib.parse import urlparse, urlencode, quote_plus
from bs4 import BeautifulSoup
from dataclasses import dataclass, asdict
import random
import time

from app.core.config import get_settings
from app.core.logging import get_logger
from app.infrastructure.http.base_client import BaseHTTPClient

settings = get_settings()
logger = get_logger(__name__)

# === データクラス定義 ===

@dataclass
class AmazonProductInfo:
    """Amazon商品情報"""
    asin: str
    title: Optional[str] = None
    price: Optional[float] = None
    currency: str = "JPY"
    availability: Optional[str] = None
    brand: Optional[str] = None
    image_url: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    description: Optional[str] = None
    features: List[str] = None
    category: Optional[str] = None
    rank: Optional[int] = None
    dimensions: Optional[str] = None
    weight: Optional[str] = None
    model_number: Optional[str] = None
    scraped_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.features is None:
            self.features = []
        if self.scraped_at is None:
            self.scraped_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換"""
        data = asdict(self)
        if self.scraped_at:
            data['scraped_at'] = self.scraped_at.isoformat()
        return data

@dataclass
class AmazonSearchResult:
    """Amazon検索結果"""
    asin: str
    title: str
    price: Optional[float] = None
    image_url: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    sponsored: bool = False
    url: Optional[str] = None

# === Amazon スクレイピングクラス ===

class AmazonScraper:
    """
    Amazon商品情報スクレイピングクラス
    
    説明: Amazonの商品ページから安全に情報を取得
    主要機能: ASIN検索、商品詳細取得、検索結果取得、レート制限対応
    修正対象: Amazon構造変更時、新セレクター追加時
    """
    
    def __init__(self):
        self.base_url = "https://www.amazon.co.jp"
        self.headers = {
            'User-Agent': self._get_random_user_agent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
        }
        
        # HTTP クライアント初期化
        self.http_client = BaseHTTPClient(
            base_url=self.base_url,
            timeout=30,
            max_retries=3,
            rate_limit_per_second=0.5  # 2秒間隔
        )
        
        # セレクター定義
        self.selectors = {
            'title': [
                '#productTitle',
                '.product-title',
                'h1.a-size-large'
            ],
            'price': [
                '.a-price-whole',
                '.a-offscreen',
                '.a-price .a-offscreen',
                '.pricePerUnit',
                '#corePrice_feature_div .a-price .a-offscreen'
            ],
            'availability': [
                '#availability span',
                '.availability-msg',
                '#outOfStock'
            ],
            'brand': [
                '#bylineInfo',
                '.po-brand .po-break-word',
                'tr:contains("ブランド") td',
                '[data-feature-name="brand"] .po-break-word'
            ],
            'image': [
                '#landingImage',
                '.imgTagWrapper img',
                '.a-dynamic-image'
            ],
            'rating': [
                '.reviewCountTextLinkedHistogram',
                '.a-icon-alt',
                '[data-hook="average-star-rating"] .a-icon-alt'
            ],
            'review_count': [
                '#acrCustomerReviewText',
                '.cr-widget-PagedList-title',
                '[data-hook="total-review-count"]'
            ],
            'description': [
                '#feature-bullets ul',
                '.feature .a-list-item',
                '#productDescription'
            ],
            'category': [
                '#wayfinding-breadcrumbs_feature_div',
                '.a-breadcrumb',
                '#nav-subnav'
            ]
        }
        
        # レート制限用
        self.last_request_time = 0
        self.min_request_interval = 2.0  # 最小リクエスト間隔（秒）
    
    def _get_random_user_agent(self) -> str:
        """ランダムUser-Agent取得"""
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.59'
        ]
        return random.choice(user_agents)
    
    async def _rate_limit_wait(self):
        """レート制限待機"""
        current_time = time.time()
        elapsed = current_time - self.last_request_time
        
        if elapsed < self.min_request_interval:
            wait_time = self.min_request_interval - elapsed
            await asyncio.sleep(wait_time)
        
        self.last_request_time = time.time()
    
    async def _fetch_page(self, url: str, **kwargs) -> Optional[str]:
        """ページ取得"""
        try:
            await self._rate_limit_wait()
            
            # ランダムヘッダー更新
            headers = {**self.headers, 'User-Agent': self._get_random_user_agent()}
            
            response = await self.http_client.get('', headers=headers, **kwargs)
            
            if isinstance(response, dict) and 'text' in response:
                return response['text']
            
            return None
            
        except Exception as e:
            logger.error(f"ページ取得エラー: {url}, {str(e)}")
            return None
    
    def extract_asin_from_url(self, url: str) -> Optional[str]:
        """
        URLからASIN抽出
        
        説明: Amazon URLからASINコードを抽出
        パラメータ: url - Amazon商品URL
        戻り値: ASIN文字列、抽出失敗時はNone
        """
        try:
            # ASIN パターン（10文字の英数字）
            asin_patterns = [
                r'/dp/([A-Z0-9]{10})',
                r'/gp/product/([A-Z0-9]{10})',
                r'asin=([A-Z0-9]{10})',
                r'/([A-Z0-9]{10})/',
                r'product/([A-Z0-9]{10})'
            ]
            
            for pattern in asin_patterns:
                match = re.search(pattern, url)
                if match:
                    asin = match.group(1)
                    # ASIN形式検証（10文字の英数字）
                    if len(asin) == 10 and asin.isalnum():
                        logger.debug(f"ASIN抽出成功: {asin} from {url}")
                        return asin
            
            logger.warning(f"ASIN抽出失敗: {url}")
            return None
            
        except Exception as e:
            logger.error(f"ASIN抽出エラー: {url}, {str(e)}")
            return None
    
    def _extract_text_by_selectors(self, soup: BeautifulSoup, selectors: List[str]) -> Optional[str]:
        """セレクターリストでテキスト抽出"""
        for selector in selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    text = element.get_text(strip=True)
                    if text:
                        return text
            except Exception:
                continue
        return None
    
    def _extract_price(self, soup: BeautifulSoup) -> Optional[float]:
        """価格抽出"""
        try:
            # 価格テキスト取得
            price_text = self._extract_text_by_selectors(soup, self.selectors['price'])
            
            if not price_text:
                return None
            
            # 価格数値抽出
            price_match = re.search(r'[\d,]+', price_text.replace(',', ''))
            if price_match:
                return float(price_match.group().replace(',', ''))
            
            return None
            
        except Exception as e:
            logger.debug(f"価格抽出エラー: {str(e)}")
            return None
    
    def _extract_rating(self, soup: BeautifulSoup) -> Optional[float]:
        """評価抽出"""
        try:
            rating_text = self._extract_text_by_selectors(soup, self.selectors['rating'])
            
            if not rating_text:
                return None
            
            # 評価数値抽出（例: "5つ星のうち4.2" -> 4.2）
            rating_match = re.search(r'(\d+\.?\d*)', rating_text)
            if rating_match:
                rating = float(rating_match.group(1))
                if 0 <= rating <= 5:
                    return rating
            
            return None
            
        except Exception as e:
            logger.debug(f"評価抽出エラー: {str(e)}")
            return None
    
    def _extract_review_count(self, soup: BeautifulSoup) -> Optional[int]:
        """レビュー数抽出"""
        try:
            review_text = self._extract_text_by_selectors(soup, self.selectors['review_count'])
            
            if not review_text:
                return None
            
            # レビュー数抽出（例: "1,234件のレビュー" -> 1234）
            review_match = re.search(r'([\d,]+)', review_text.replace(',', ''))
            if review_match:
                return int(review_match.group().replace(',', ''))
            
            return None
            
        except Exception as e:
            logger.debug(f"レビュー数抽出エラー: {str(e)}")
            return None
    
    def _extract_features(self, soup: BeautifulSoup) -> List[str]:
        """特徴・機能リスト抽出"""
        try:
            features = []
            
            # 商品の機能説明を取得
            feature_elements = soup.select('#feature-bullets li, .feature .a-list-item')
            
            for element in feature_elements:
                text = element.get_text(strip=True)
                if text and len(text) > 10:  # 短すぎるテキストは除外
                    features.append(text)
            
            return features[:10]  # 最大10個
            
        except Exception as e:
            logger.debug(f"特徴抽出エラー: {str(e)}")
            return []
    
    async def get_product_info(self, asin: str) -> Optional[AmazonProductInfo]:
        """
        ASIN商品情報取得
        
        説明: 指定されたASINの商品詳細情報を取得
        パラメータ: asin - Amazon商品識別子
        戻り値: AmazonProductInfo、取得失敗時はNone
        """
        try:
            logger.info(f"Amazon商品情報取得開始: {asin}")
            
            # 商品ページURL構築
            product_url = f"/dp/{asin}"
            
            # ページ取得
            html_content = await self._fetch_page(product_url)
            
            if not html_content:
                logger.warning(f"商品ページ取得失敗: {asin}")
                return None
            
            # HTMLパース
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # 商品情報抽出
            product_info = AmazonProductInfo(asin=asin)
            
            # タイトル
            product_info.title = self._extract_text_by_selectors(soup, self.selectors['title'])
            
            # 価格
            product_info.price = self._extract_price(soup)
            
            # 在庫状況
            product_info.availability = self._extract_text_by_selectors(soup, self.selectors['availability'])
            
            # ブランド
            product_info.brand = self._extract_text_by_selectors(soup, self.selectors['brand'])
            
            # 画像URL
            img_element = soup.select_one('#landingImage, .imgTagWrapper img')
            if img_element:
                product_info.image_url = img_element.get('src') or img_element.get('data-src')
            
            # 評価
            product_info.rating = self._extract_rating(soup)
            
            # レビュー数
            product_info.review_count = self._extract_review_count(soup)
            
            # 商品説明・特徴
            product_info.features = self._extract_features(soup)
            if product_info.features:
                product_info.description = ' '.join(product_info.features[:3])
            
            # カテゴリ
            product_info.category = self._extract_text_by_selectors(soup, self.selectors['category'])
            
            # 最低限の情報チェック
            if not product_info.title:
                logger.warning(f"商品タイトル取得失敗: {asin}")
                return None
            
            logger.info(f"Amazon商品情報取得成功: {asin} - {product_info.title}")
            return product_info
            
        except Exception as e:
            logger.error(f"Amazon商品情報取得エラー: {asin}, {str(e)}")
            return None
    
    async def search_products(self, keyword: str, limit: int = 20) -> List[AmazonSearchResult]:
        """
        商品検索
        
        説明: キーワードでAmazon商品を検索
        パラメータ:
            keyword: 検索キーワード
            limit: 最大取得件数
        戻り値: 検索結果リスト
        """
        try:
            logger.info(f"Amazon商品検索開始: {keyword}")
            
            # 検索URLパラメータ
            search_params = {
                'k': keyword,
                'ref': 'sr_pg_1'
            }
            
            search_url = f"/s?{urlencode(search_params)}"
            
            # 検索ページ取得
            html_content = await self._fetch_page(search_url)
            
            if not html_content:
                logger.warning(f"検索ページ取得失敗: {keyword}")
                return []
            
            # HTMLパース
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # 商品要素取得
            product_elements = soup.select('[data-component-type="s-search-result"]')
            
            results = []
            
            for element in product_elements[:limit]:
                try:
                    # ASIN取得
                    asin = element.get('data-asin')
                    if not asin:
                        continue
                    
                    # タイトル
                    title_element = element.select_one('h2 a span, .s-color-base')
                    title = title_element.get_text(strip=True) if title_element else ""
                    
                    if not title:
                        continue
                    
                    # 価格
                    price = None
                    price_element = element.select_one('.a-price-whole, .a-offscreen')
                    if price_element:
                        price_text = price_element.get_text(strip=True)
                        price_match = re.search(r'[\d,]+', price_text.replace(',', ''))
                        if price_match:
                            price = float(price_match.group().replace(',', ''))
                    
                    # 画像URL
                    image_url = None
                    img_element = element.select_one('img')
                    if img_element:
                        image_url = img_element.get('src') or img_element.get('data-src')
                    
                    # 評価
                    rating = None
                    rating_element = element.select_one('.a-icon-alt')
                    if rating_element:
                        rating_text = rating_element.get_text()
                        rating_match = re.search(r'(\d+\.?\d*)', rating_text)
                        if rating_match:
                            rating = float(rating_match.group(1))
                    
                    # レビュー数
                    review_count = None
                    review_element = element.select_one('.a-size-base')
                    if review_element:
                        review_text = review_element.get_text()
                        review_match = re.search(r'([\d,]+)', review_text.replace(',', ''))
                        if review_match:
                            review_count = int(review_match.group().replace(',', ''))
                    
                    # スポンサー判定
                    sponsored = bool(element.select_one('.s-sponsored-label-text'))
                    
                    # URL構築
                    url = f"{self.base_url}/dp/{asin}"
                    
                    result = AmazonSearchResult(
                        asin=asin,
                        title=title,
                        price=price,
                        image_url=image_url,
                        rating=rating,
                        review_count=review_count,
                        sponsored=sponsored,
                        url=url
                    )
                    
                    results.append(result)
                    
                except Exception as e:
                    logger.debug(f"検索結果要素解析エラー: {str(e)}")
                    continue
            
            logger.info(f"Amazon商品検索完了: {keyword}, {len(results)}件取得")
            return results
            
        except Exception as e:
            logger.error(f"Amazon商品検索エラー: {keyword}, {str(e)}")
            return []
    
    async def bulk_get_products(self, asins: List[str]) -> Dict[str, Optional[AmazonProductInfo]]:
        """
        一括商品情報取得
        
        説明: 複数ASINの商品情報を一括取得
        パラメータ: asins - ASINリスト
        戻り値: ASIN -> AmazonProductInfo の辞書
        """
        try:
            logger.info(f"Amazon一括商品情報取得開始: {len(asins)}件")
            
            results = {}
            
            for i, asin in enumerate(asins):
                try:
                    product_info = await self.get_product_info(asin)
                    results[asin] = product_info
                    
                    logger.debug(f"一括取得進捗: {i + 1}/{len(asins)}")
                    
                    # レート制限対応（より長い間隔）
                    await asyncio.sleep(3)
                    
                except Exception as e:
                    logger.error(f"一括取得個別エラー: {asin}, {str(e)}")
                    results[asin] = None
            
            logger.info(f"Amazon一括商品情報取得完了: {len(results)}件")
            return results
            
        except Exception as e:
            logger.error(f"Amazon一括商品情報取得エラー: {str(e)}")
            return {}

# === 使用例 ===

"""
# Amazon スクレイピングの使用例:

# 1. 単一商品情報取得
scraper = AmazonScraper()
product_info = await scraper.get_product_info("B08N5WRWNW")

if product_info:
    print(f"商品名: {product_info.title}")
    print(f"価格: {product_info.price_formatted}")
    print(f"評価: {product_info.rating}")

# 2. URL からASIN抽出
url = "https://www.amazon.co.jp/dp/B08N5WRWNW"
asin = scraper.extract_asin_from_url(url)
print(f"抽出されたASIN: {asin}")

# 3. 商品検索
search_results = await scraper.search_products("Echo Dot", limit=10)
for result in search_results:
    print(f"ASIN: {result.asin}, 商品名: {result.title}")

# 4. 一括取得
asins = ["B08N5WRWNW", "B07XJ8C8F5", "B084DWX1PV"]
bulk_results = await scraper.bulk_get_products(asins)

for asin, product_info in bulk_results.items():
    if product_info:
        print(f"{asin}: {product_info.title}")
    else:
        print(f"{asin}: 取得失敗")
"""