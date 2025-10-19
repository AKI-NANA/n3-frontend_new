# desktop-crawler/ebay_search.py
"""
eBay Finding API Search Client
eBay商品検索とSupabaseへの保存を行う
"""

import requests
from typing import List, Dict, Optional
from datetime import datetime
import os
from supabase import create_client, Client
import json


class EbaySearchClient:
    """eBay Finding API クライアント"""
    
    def __init__(self):
        self.app_id = os.getenv('EBAY_APP_ID')
        self.base_url = "https://svcs.ebay.com/services/search/FindingService/v1"
        
        # Supabase接続
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        if not self.app_id:
            raise ValueError("EBAY_APP_ID must be set")
    
    def search_products(
        self,
        keywords: str,
        category_id: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        condition: Optional[str] = None,
        sort_order: str = "BestMatch",
        limit: int = 100
    ) -> List[Dict]:
        """
        eBay商品検索
        
        Args:
            keywords: 検索キーワード
            category_id: カテゴリID
            min_price: 最低価格
            max_price: 最高価格
            condition: 商品状態 (New, Used, Refurbished)
            sort_order: ソート順
            limit: 取得件数
            
        Returns:
            商品データのリスト
        """
        params = {
            'OPERATION-NAME': 'findItemsAdvanced',
            'SERVICE-VERSION': '1.0.0',
            'SECURITY-APPNAME': self.app_id,
            'RESPONSE-DATA-FORMAT': 'JSON',
            'REST-PAYLOAD': '',
            'keywords': keywords,
            'sortOrder': sort_order,
            'paginationInput.entriesPerPage': min(limit, 100)  # 最大100
        }
        
        # カテゴリフィルター
        if category_id:
            params['categoryId'] = category_id
        
        # 価格・状態フィルター
        filter_index = 0
        
        if min_price is not None:
            params[f'itemFilter({filter_index}).name'] = 'MinPrice'
            params[f'itemFilter({filter_index}).value'] = str(min_price)
            filter_index += 1
        
        if max_price is not None:
            params[f'itemFilter({filter_index}).name'] = 'MaxPrice'
            params[f'itemFilter({filter_index}).value'] = str(max_price)
            filter_index += 1
        
        if condition:
            params[f'itemFilter({filter_index}).name'] = 'Condition'
            params[f'itemFilter({filter_index}).value'] = condition
            filter_index += 1
        
        # ListingType: FixedPrice (Buy It Now)
        params[f'itemFilter({filter_index}).name'] = 'ListingType'
        params[f'itemFilter({filter_index}).value'] = 'FixedPrice'
        
        try:
            response = requests.get(self.base_url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            products = self._parse_response(data, keywords)
            
            # Supabaseに保存
            if products:
                self._save_to_supabase(products)
            
            return products
            
        except requests.exceptions.RequestException as e:
            print(f"eBay API request failed: {e}")
            raise
    
    def _parse_response(self, data: Dict, search_query: str) -> List[Dict]:
        """eBay APIレスポンスをパース"""
        products = []
        
        try:
            search_result = data.get('findItemsAdvancedResponse', [{}])[0]
            items = search_result.get('searchResult', [{}])[0].get('item', [])
            
            for item in items:
                try:
                    product = self._parse_item(item, search_query)
                    if product:
                        products.append(product)
                except Exception as e:
                    print(f"Failed to parse item: {e}")
                    continue
            
            print(f"Parsed {len(products)} products from eBay API")
            return products
            
        except Exception as e:
            print(f"Failed to parse eBay response: {e}")
            return []
    
    def _parse_item(self, item: Dict, search_query: str) -> Optional[Dict]:
        """個別商品データをパース"""
        try:
            # 基本情報
            ebay_item_id = self._get_value(item, 'itemId')
            title = self._get_value(item, 'title')
            
            if not ebay_item_id or not title:
                return None
            
            # カテゴリ情報
            primary_category = item.get('primaryCategory', [{}])[0]
            category_id = self._get_value(primary_category, 'categoryId')
            category_name = self._get_value(primary_category, 'categoryName')
            
            # 価格情報
            selling_status = item.get('sellingStatus', [{}])[0]
            current_price_data = selling_status.get('currentPrice', [{}])[0]
            current_price = float(current_price_data.get('__value__', 0))
            currency = current_price_data.get('@currencyId', 'USD')
            
            # 送料
            shipping_info = item.get('shippingInfo', [{}])[0]
            shipping_cost_data = shipping_info.get('shippingServiceCost', [{}])[0]
            shipping_cost = float(shipping_cost_data.get('__value__', 0))
            
            # 出品情報
            listing_info = item.get('listingInfo', [{}])[0]
            listing_type = self._get_value(listing_info, 'listingType')
            
            # 商品状態
            condition_data = item.get('condition', [{}])[0]
            condition = self._get_value(condition_data, 'conditionDisplayName')
            
            # セラー情報
            seller_info = item.get('sellerInfo', [{}])[0]
            seller_username = self._get_value(seller_info, 'sellerUserName')
            feedback_score = self._get_value(seller_info, 'feedbackScore', 0)
            positive_percentage = self._get_value(seller_info, 'positiveFeedbackPercent', 0)
            
            # その他
            seller_country = self._get_value(item, 'country')
            primary_image_url = self._get_value(item, 'galleryURL')
            item_url = self._get_value(item, 'viewItemURL')
            
            # 画像URL配列
            image_urls = [primary_image_url] if primary_image_url else []
            
            # 簡易的な利益率計算（後でAIで精緻化）
            profit_rate = self._estimate_profit_rate(current_price)
            estimated_japan_cost = current_price * (100 - profit_rate) / 100
            
            # リスクレベル判定
            risk_level, risk_score = self._calculate_risk(
                current_price, 
                seller_country,
                float(positive_percentage) if positive_percentage else 0
            )
            
            product = {
                'ebay_item_id': ebay_item_id,
                'title': title,
                'title_jp': None,  # 後で翻訳可能
                'category_id': category_id,
                'category_name': category_name,
                'current_price': current_price,
                'currency': currency,
                'shipping_cost': shipping_cost,
                'sold_quantity': 0,  # Finding APIでは取得不可
                'watch_count': 0,    # Finding APIでは取得不可
                'listing_type': listing_type,
                'condition': condition,
                'seller_username': seller_username,
                'seller_country': seller_country,
                'seller_feedback_score': int(feedback_score) if feedback_score else 0,
                'seller_positive_percentage': float(positive_percentage) if positive_percentage else 0,
                'primary_image_url': primary_image_url,
                'image_urls': image_urls,
                'item_url': item_url,
                'profit_rate': profit_rate,
                'estimated_japan_cost': estimated_japan_cost,
                'risk_level': risk_level,
                'risk_score': risk_score,
                'search_query': search_query,
                'search_date': datetime.now().isoformat(),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            return product
            
        except Exception as e:
            print(f"Error parsing item: {e}")
            return None
    
    def _get_value(self, data, key, default=None):
        """配列から値を安全に取得"""
        if isinstance(data, dict):
            value = data.get(key)
            if isinstance(value, list) and len(value) > 0:
                return value[0]
            return value if value is not None else default
        return default
    
    def _estimate_profit_rate(self, price: float) -> float:
        """簡易的な利益率推定"""
        if price < 20:
            return 15.0
        elif price < 50:
            return 20.0
        elif price < 100:
            return 25.0
        elif price < 300:
            return 22.0
        else:
            return 18.0
    
    def _calculate_risk(
        self, 
        price: float, 
        country: str, 
        positive_percentage: float
    ) -> tuple[str, int]:
        """リスクレベルとスコア計算"""
        risk_score = 0
        
        # 価格リスク
        if price > 500:
            risk_score += 30
        elif price > 200:
            risk_score += 20
        elif price > 100:
            risk_score += 10
        
        # 国リスク
        if country not in ['US', 'UK', 'DE', 'JP']:
            risk_score += 20
        
        # セラーリスク
        if positive_percentage < 95:
            risk_score += 30
        elif positive_percentage < 98:
            risk_score += 15
        
        # レベル判定
        if risk_score < 25:
            return 'low', risk_score
        elif risk_score < 50:
            return 'medium', risk_score
        else:
            return 'high', risk_score
    
    def _save_to_supabase(self, products: List[Dict]):
        """Supabaseに商品データを保存"""
        try:
            # upsert: 既存データは更新、新規は挿入
            response = self.supabase.table('research_ebay_products').upsert(
                products,
                on_conflict='ebay_item_id'
            ).execute()
            
            print(f"Saved {len(products)} products to Supabase")
            return response
            
        except Exception as e:
            print(f"Failed to save to Supabase: {e}")
            raise


# テスト用
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    client = EbaySearchClient()
    
    # テスト検索
    results = client.search_products(
        keywords="vintage camera",
        min_price=50,
        max_price=500,
        condition="Used",
        limit=20
    )
    
    print(f"\n検索結果: {len(results)}件")
    if results:
        print(f"最初の商品: {results[0]['title']}")
        print(f"価格: ${results[0]['current_price']}")
        print(f"利益率: {results[0]['profit_rate']}%")
