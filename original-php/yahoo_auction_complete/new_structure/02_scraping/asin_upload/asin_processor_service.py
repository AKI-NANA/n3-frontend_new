"""
app/services/asin_processor_service.py - ASIN処理サービス
用途: ASIN・商品URLからの商品データ取得・処理・変換
修正対象: 新しいマーケットプレイス追加時、データ取得方式変更時
"""

import re
import asyncio
import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
from urllib.parse import urlparse, parse_qs
import aiohttp
from dataclasses import dataclass, asdict

from app.core.config import get_settings
from app.core.logging import get_logger
from app.infrastructure.external.amazon_api_client import AmazonAPIClient
from app.infrastructure.external.rakuten_api_client import RakutenAPIClient
from app.infrastructure.external.yahoo_api_client import YahooAPIClient
from app.infrastructure.cache.redis_cache import CacheManager
from app.domain.models.product import ProductModel
from app.services.product_creation_service import ProductCreationService

settings = get_settings()
logger = get_logger(__name__)

@dataclass
class ProductDataResult:
    """商品データ取得結果"""
    success: bool
    asin: Optional[str] = None
    title: Optional[str] = None
    price: Optional[int] = None
    currency: str = "JPY"
    description: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    images: List[str] = None
    availability: Optional[str] = None
    seller: Optional[str] = None
    marketplace: Optional[str] = None
    url: Optional[str] = None
    jan_code: Optional[str] = None
    model_number: Optional[str] = None
    dimensions: Optional[str] = None
    weight: Optional[float] = None
    features: List[str] = None
    reviews_count: Optional[int] = None
    rating: Optional[float] = None
    error_message: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        if self.images is None:
            self.images = []
        if self.features is None:
            self.features = []

class ASINProcessorService:
    """
    ASIN処理サービス
    
    説明: Amazon ASIN・各種マーケットプレイスURLから商品データを取得・処理
    主要機能: マルチマーケットプレイス対応、キャッシュ、エラーハンドリング
    修正対象: 新マーケットプレイス追加時、データ取得API変更時
    """
    
    def __init__(self):
        self.cache_manager = CacheManager()
        self.amazon_client = AmazonAPIClient()
        self.rakuten_client = RakutenAPIClient()
        self.yahoo_client = YahooAPIClient()
        self.product_creation_service = ProductCreationService()
        
        # サポートするマーケットプレイス
        self.marketplace_patterns = {
            'amazon': [
                r'amazon\.co\.jp',
                r'amazon\.com',
                r'amzn\.to',
                r'amzn\.asia'
            ],
            'rakuten': [
                r'rakuten\.co\.jp',
                r'item\.rakuten\.co\.jp'
            ],
            'yahoo': [
                r'shopping\.yahoo\.co\.jp',
                r'store\.shopping\.yahoo\.co\.jp'
            ],
            'mercari': [
                r'mercari\.com',
                r'jp\.mercari\.com'
            ],
            'ebay': [
                r'ebay\.com',
                r'ebay\.co\.jp'
            ]
        }
        
        # ASIN正規表現パターン
        self.asin_pattern = re.compile(r'^[B][0-9A-Z]{9}$')
        
        # URL内ASIN抽出パターン
        self.url_asin_patterns = [
            r'/dp/([B][0-9A-Z]{9})',
            r'/gp/product/([B][0-9A-Z]{9})',
            r'/product/([B][0-9A-Z]{9})',
            r'asin=([B][0-9A-Z]{9})',
            r'ASIN=([B][0-9A-Z]{9})'
        ]

    async def process_asin(self, asin: str) -> Dict[str, Any]:
        """
        ASIN処理
        
        説明: Amazon ASINから商品データを取得
        パラメータ: asin - Amazon ASIN（10文字）
        戻り値: 商品データ辞書
        """
        try:
            # ASIN検証
            if not self.validate_asin(asin):
                raise ValueError(f"無効なASIN形式: {asin}")
            
            # キャッシュ確認
            cache_key = f"asin_data:{asin}"
            cached_data = await self.cache_manager.get(cache_key)
            if cached_data:
                logger.debug(f"ASINキャッシュヒット: {asin}")
                return cached_data
            
            # Amazon API経由でデータ取得
            product_result = await self.fetch_amazon_product_data(asin)
            
            if product_result.success:
                # データ正規化
                normalized_data = self.normalize_product_data(product_result)
                
                # キャッシュ保存（1時間）
                await self.cache_manager.set(cache_key, normalized_data, ttl=3600)
                
                logger.info(f"ASIN処理成功: {asin} - {product_result.title}")
                return normalized_data
            else:
                raise Exception(product_result.error_message or "商品データ取得に失敗")
                
        except Exception as e:
            logger.error(f"ASIN処理エラー: {asin} - {str(e)}")
            raise Exception(f"ASIN処理失敗: {str(e)}")

    async def process_url(self, url: str) -> Dict[str, Any]:
        """
        URL処理
        
        説明: 商品URLから商品データを取得
        パラメータ: url - 商品URL
        戻り値: 商品データ辞書
        """
        try:
            # URL検証
            if not self.validate_url(url):
                raise ValueError(f"無効なURL形式: {url}")
            
            # マーケットプレイス判定
            marketplace = self.detect_marketplace(url)
            if not marketplace:
                raise ValueError(f"サポートされていないマーケットプレイス: {url}")
            
            # キャッシュ確認
            cache_key = f"url_data:{self.generate_url_hash(url)}"
            cached_data = await self.cache_manager.get(cache_key)
            if cached_data:
                logger.debug(f"URLキャッシュヒット: {url}")
                return cached_data
            
            # マーケットプレイス別処理
            if marketplace == 'amazon':
                product_result = await self.process_amazon_url(url)
            elif marketplace == 'rakuten':
                product_result = await self.process_rakuten_url(url)
            elif marketplace == 'yahoo':
                product_result = await self.process_yahoo_url(url)
            else:
                product_result = await self.process_generic_url(url)
            
            if product_result.success:
                # データ正規化
                normalized_data = self.normalize_product_data(product_result)
                
                # キャッシュ保存（1時間）
                await self.cache_manager.set(cache_key, normalized_data, ttl=3600)
                
                logger.info(f"URL処理成功: {marketplace} - {product_result.title}")
                return normalized_data
            else:
                raise Exception(product_result.error_message or "商品データ取得に失敗")
                
        except Exception as e:
            logger.error(f"URL処理エラー: {url} - {str(e)}")
            raise Exception(f"URL処理失敗: {str(e)}")

    def validate_asin(self, asin: str) -> bool:
        """ASIN形式検証"""
        return bool(self.asin_pattern.match(asin))

    def validate_url(self, url: str) -> bool:
        """URL形式検証"""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False

    def detect_marketplace(self, url: str) -> Optional[str]:
        """マーケットプレイス検出"""
        for marketplace, patterns in self.marketplace_patterns.items():
            for pattern in patterns:
                if re.search(pattern, url):
                    return marketplace
        return None

    def extract_asin_from_url(self, url: str) -> Optional[str]:
        """URLからASIN抽出"""
        for pattern in self.url_asin_patterns:
            match = re.search(pattern, url)
            if match:
                asin = match.group(1)
                if self.validate_asin(asin):
                    return asin
        return None

    def generate_url_hash(self, url: str) -> str:
        """URL用ハッシュ生成"""
        import hashlib
        return hashlib.md5(url.encode()).hexdigest()

    async def fetch_amazon_product_data(self, asin: str) -> ProductDataResult:
        """Amazon商品データ取得"""
        try:
            # Amazon APIクライアント使用
            api_result = await self.amazon_client.get_product_by_asin(asin)
            
            if api_result.get('success'):
                product_data = api_result.get('data', {})
                
                return ProductDataResult(
                    success=True,
                    asin=asin,
                    title=product_data.get('title'),
                    price=self.parse_price(product_data.get('price')),
                    description=product_data.get('description'),
                    brand=product_data.get('brand'),
                    category=product_data.get('category'),
                    images=product_data.get('images', []),
                    availability=product_data.get('availability'),
                    seller=product_data.get('seller'),
                    marketplace='amazon',
                    url=f"https://amazon.co.jp/dp/{asin}",
                    jan_code=product_data.get('jan_code'),
                    model_number=product_data.get('model_number'),
                    dimensions=product_data.get('dimensions'),
                    weight=product_data.get('weight'),
                    features=product_data.get('features', []),
                    reviews_count=product_data.get('reviews_count'),
                    rating=product_data.get('rating'),
                    raw_data=product_data
                )
            else:
                return ProductDataResult(
                    success=False,
                    error_message=api_result.get('error', 'Amazon API エラー')
                )
                
        except Exception as e:
            return ProductDataResult(
                success=False,
                error_message=f"Amazon API 呼び出しエラー: {str(e)}"
            )

    async def process_amazon_url(self, url: str) -> ProductDataResult:
        """Amazon URL処理"""
        # URLからASIN抽出
        asin = self.extract_asin_from_url(url)
        if asin:
            return await self.fetch_amazon_product_data(asin)
        else:
            return ProductDataResult(
                success=False,
                error_message="URLからASINを抽出できませんでした"
            )

    async def process_rakuten_url(self, url: str) -> ProductDataResult:
        """楽天URL処理"""
        try:
            # 楽天APIクライアント使用
            api_result = await self.rakuten_client.get_product_by_url(url)
            
            if api_result.get('success'):
                product_data = api_result.get('data', {})
                
                return ProductDataResult(
                    success=True,
                    title=product_data.get('title'),
                    price=self.parse_price(product_data.get('price')),
                    description=product_data.get('description'),
                    brand=product_data.get('brand'),
                    category=product_data.get('category'),
                    images=product_data.get('images', []),
                    marketplace='rakuten',
                    url=url,
                    jan_code=product_data.get('jan_code'),
                    raw_data=product_data
                )
            else:
                return ProductDataResult(
                    success=False,
                    error_message=api_result.get('error', '楽天 API エラー')
                )
                
        except Exception as e:
            return ProductDataResult(
                success=False,
                error_message=f"楽天 API 呼び出しエラー: {str(e)}"
            )

    async def process_yahoo_url(self, url: str) -> ProductDataResult:
        """Yahoo URL処理"""
        try:
            # Yahoo APIクライアント使用
            api_result = await self.yahoo_client.get_product_by_url(url)
            
            if api_result.get('success'):
                product_data = api_result.get('data', {})
                
                return ProductDataResult(
                    success=True,
                    title=product_data.get('title'),
                    price=self.parse_price(product_data.get('price')),
                    description=product_data.get('description'),
                    brand=product_data.get('brand'),
                    category=product_data.get('category'),
                    images=product_data.get('images', []),
                    marketplace='yahoo',
                    url=url,
                    jan_code=product_data.get('jan_code'),
                    raw_data=product_data
                )
            else:
                return ProductDataResult(
                    success=False,
                    error_message=api_result.get('error', 'Yahoo API エラー')
                )
                
        except Exception as e:
            return ProductDataResult(
                success=False,
                error_message=f"Yahoo API 呼び出しエラー: {str(e)}"
            )

    async def process_generic_url(self, url: str) -> ProductDataResult:
        """汎用URL処理（Webスクレイピング）"""
        try:
            # 基本的なWebスクレイピング
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        html_content = await response.text()
                        
                        # 基本的なメタデータ抽出
                        title = self.extract_title_from_html(html_content)
                        price_text = self.extract_price_from_html(html_content)
                        price = self.parse_price(price_text)
                        images = self.extract_images_from_html(html_content, url)
                        
                        marketplace = self.detect_marketplace(url)
                        
                        return ProductDataResult(
                            success=True,
                            title=title,
                            price=price,
                            images=images,
                            marketplace=marketplace or 'other',
                            url=url
                        )
                    else:
                        return ProductDataResult(
                            success=False,
                            error_message=f"HTTP エラー: {response.status}"
                        )
                        
        except Exception as e:
            return ProductDataResult(
                success=False,
                error_message=f"Web スクレイピングエラー: {str(e)}"
            )

    def extract_title_from_html(self, html: str) -> Optional[str]:
        """HTMLからタイトル抽出"""
        import re
        from html import unescape
        
        # <title>タグから抽出
        title_match = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
        if title_match:
            title = unescape(title_match.group(1)).strip()
            return title
        
        # og:titleから抽出
        og_title_match = re.search(r'<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if og_title_match:
            title = unescape(og_title_match.group(1)).strip()
            return title
        
        return None

    def extract_price_from_html(self, html: str) -> Optional[str]:
        """HTMLから価格抽出"""
        import re
        
        # 価格パターン（日本円）
        price_patterns = [
            r'¥[\d,]+',
            r'￥[\d,]+',
            r'[\d,]+円',
            r'price["\']?[^>]*>[\s]*¥?[\s]*(\d{1,3}(?:,\d{3})*)',
        ]
        
        for pattern in price_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            if matches:
                return matches[0]
        
        return None

    def extract_images_from_html(self, html: str, base_url: str) -> List[str]:
        """HTMLから画像URL抽出"""
        import re
        from urllib.parse import urljoin
        
        image_urls = []
        
        # img タグから抽出
        img_pattern = r'<img[^>]+src=["\']([^"\']+)["\']'
        matches = re.findall(img_pattern, html, re.IGNORECASE)
        
        for match in matches:
            # 相対URLを絶対URLに変換
            absolute_url = urljoin(base_url, match)
            
            # 商品画像っぽいものをフィルター
            if self.is_product_image(absolute_url):
                image_urls.append(absolute_url)
        
        return image_urls[:5]  # 最大5枚まで

    def is_product_image(self, url: str) -> bool:
        """商品画像判定"""
        # 商品画像らしいパターン
        product_patterns = [
            'product', 'item', 'goods', 'shop',
            'main', 'detail', 'large'
        ]
        
        # 除外パターン
        exclude_patterns = [
            'logo', 'banner', 'ad', 'icon',
            'thumb', 'small', 'mini'
        ]
        
        url_lower = url.lower()
        
        # 除外パターンにマッチする場合は除外
        if any(pattern in url_lower for pattern in exclude_patterns):
            return False
        
        # 商品パターンにマッチするか、画像サイズが適切
        return any(pattern in url_lower for pattern in product_patterns)

    def parse_price(self, price_text: Optional[str]) -> Optional[int]:
        """価格テキストを数値に変換"""
        if not price_text:
            return None
        
        try:
            # 数字以外を除去
            import re
            numbers_only = re.sub(r'[^\d]', '', str(price_text))
            if numbers_only:
                return int(numbers_only)
        except (ValueError, TypeError):
            pass
        
        return None

    def normalize_product_data(self, product_result: ProductDataResult) -> Dict[str, Any]:
        """商品データ正規化"""
        return {
            'success': product_result.success,
            'asin': product_result.asin,
            'title': product_result.title,
            'price': product_result.price,
            'price_formatted': f"¥{product_result.price:,}" if product_result.price else None,
            'currency': product_result.currency,
            'description': product_result.description,
            'brand': product_result.brand,
            'category': product_result.category,
            'images': product_result.images,
            'main_image': product_result.images[0] if product_result.images else None,
            'availability': product_result.availability,
            'seller': product_result.seller,
            'marketplace': product_result.marketplace,
            'url': product_result.url,
            'jan_code': product_result.jan_code,
            'model_number': product_result.model_number,
            'dimensions': product_result.dimensions,
            'weight': product_result.weight,
            'features': product_result.features,
            'reviews_count': product_result.reviews_count,
            'rating': product_result.rating,
            'processed_at': datetime.utcnow().isoformat(),
            'raw_data': product_result.raw_data
        }

    async def create_product_from_data(
        self, 
        product_data: Dict[str, Any], 
        user_id: int,
        keyword: Optional[str] = None,
        sku: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        商品データから商品エンティティ作成
        
        説明: 取得した商品データを使用してProductModelを作成
        パラメータ:
            product_data - 正規化済み商品データ
            user_id - 作成者ユーザーID
            keyword - 追加キーワード
            sku - 指定SKU
        戻り値: 作成された商品情報
        """
        try:
            # ProductCreationServiceを使用
            creation_result = await self.product_creation_service.create_from_external_data(
                external_data=product_data,
                user_id=user_id,
                custom_keyword=keyword,
                custom_sku=sku
            )
            
            if creation_result.get('success'):
                logger.info(f"商品作成成功: {creation_result.get('product_id')}")
                return creation_result
            else:
                raise Exception(creation_result.get('error', '商品作成に失敗'))
                
        except Exception as e:
            logger.error(f"商品作成エラー: {str(e)}")
            raise Exception(f"商品作成失敗: {str(e)}")

    async def batch_process_asins(
        self, 
        asin_list: List[str], 
        user_id: int,
        progress_callback: Optional[callable] = None
    ) -> List[Dict[str, Any]]:
        """
        ASIN一括処理
        
        説明: 複数ASINを効率的に並列処理
        パラメータ:
            asin_list - ASIN リスト
            user_id - ユーザーID
            progress_callback - 進捗コールバック関数
        戻り値: 処理結果リスト
        """
        results = []
        total_count = len(asin_list)
        
        # 並列処理（最大10件同時）
        semaphore = asyncio.Semaphore(10)
        
        async def process_single_asin(asin: str, index: int) -> Dict[str, Any]:
            async with semaphore:
                try:
                    product_data = await self.process_asin(asin)
                    
                    # 商品作成
                    creation_result = await self.create_product_from_data(
                        product_data, user_id
                    )
                    
                    result = {
                        'asin': asin,
                        'success': True,
                        'product_data': product_data,
                        'creation_result': creation_result
                    }
                    
                except Exception as e:
                    result = {
                        'asin': asin,
                        'success': False,
                        'error': str(e)
                    }
                
                # 進捗コールバック
                if progress_callback:
                    await progress_callback(index + 1, total_count, result)
                
                return result
        
        # 全ASIN並列処理
        tasks = [
            process_single_asin(asin, i) 
            for i, asin in enumerate(asin_list)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 例外を結果に変換
        final_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                final_results.append({
                    'asin': asin_list[i],
                    'success': False,
                    'error': str(result)
                })
            else:
                final_results.append(result)
        
        return final_results