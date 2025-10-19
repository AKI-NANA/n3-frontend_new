"""
eBay Shopping API クライアント
desktop-crawler/ebay_shopping_api.py
"""

import aiohttp
import asyncio
from typing import List, Dict, Optional
import xml.etree.ElementTree as ET


class EbayShoppingClient:
    """eBay Shopping APIクライアント"""
    
    def __init__(self, app_id: str):
        self.app_id = app_id
        self.base_url = "http://open.api.ebay.com/shopping"
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def get_single_item(self, item_id: str) -> Optional[Dict]:
        """
        単一商品の詳細取得
        
        Args:
            item_id: eBay Item ID
            
        Returns:
            商品詳細データ
        """
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        params = {
            'callname': 'GetSingleItem',
            'responseencoding': 'JSON',
            'appid': self.app_id,
            'siteid': '0',  # US
            'version': '967',
            'ItemID': item_id,
            'IncludeSelector': 'Details,ItemSpecifics'
        }
        
        try:
            async with self.session.get(self.base_url, params=params, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if 'Item' in data:
                        return self._parse_item(data['Item'])
                    else:
                        print(f"⚠️  Item not found: {item_id}")
                        return None
                else:
                    print(f"❌ API Error {response.status}: {item_id}")
                    return None
                    
        except asyncio.TimeoutError:
            print(f"⏱️  Timeout: {item_id}")
            return None
        except Exception as e:
            print(f"❌ Error getting item {item_id}: {e}")
            return None
    
    async def get_multiple_items(self, item_ids: List[str]) -> List[Dict]:
        """
        複数商品を一括取得（最大20件）
        
        Args:
            item_ids: eBay Item IDリスト（最大20件）
            
        Returns:
            商品詳細データリスト
        """
        
        if not item_ids:
            return []
        
        # 最大20件に制限
        item_ids = item_ids[:20]
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        params = {
            'callname': 'GetMultipleItems',
            'responseencoding': 'JSON',
            'appid': self.app_id,
            'siteid': '0',
            'version': '967',
            'ItemID': ','.join(item_ids),
            'IncludeSelector': 'Details,ItemSpecifics'
        }
        
        try:
            async with self.session.get(self.base_url, params=params, timeout=15) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    items = data.get('Item', [])
                    
                    # 単一アイテムの場合リスト化
                    if isinstance(items, dict):
                        items = [items]
                    
                    return [self._parse_item(item) for item in items]
                else:
                    print(f"❌ API Error {response.status}")
                    return []
                    
        except asyncio.TimeoutError:
            print(f"⏱️  Timeout for batch request")
            return []
        except Exception as e:
            print(f"❌ Error getting multiple items: {e}")
            return []
    
    async def get_items_in_batches(
        self,
        item_ids: List[str],
        batch_size: int = 20
    ) -> List[Dict]:
        """
        大量の商品を20件ずつバッチ処理で取得
        
        Args:
            item_ids: eBay Item IDリスト
            batch_size: バッチサイズ（デフォルト20、最大20）
            
        Returns:
            全商品詳細データリスト
        """
        
        if batch_size > 20:
            batch_size = 20
        
        all_items = []
        total = len(item_ids)
        
        print(f"📦 Shopping API: {total}件を{batch_size}件ずつ取得開始...")
        
        for i in range(0, total, batch_size):
            batch = item_ids[i:i+batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total + batch_size - 1) // batch_size
            
            print(f"  バッチ {batch_num}/{total_batches} ({len(batch)}件)...", end=' ')
            
            items = await self.get_multiple_items(batch)
            all_items.extend(items)
            
            print(f"✅ {len(items)}件取得")
            
            # レート制限回避（0.5秒待機）
            if i + batch_size < total:
                await asyncio.sleep(0.5)
        
        print(f"🎉 Shopping API: 合計{len(all_items)}/{total}件取得完了")
        
        return all_items
    
    def _parse_item(self, item: Dict) -> Dict:
        """商品データをパース"""
        
        return {
            'ebay_item_id': item.get('ItemID'),
            
            # 🔥 人気度指標
            'quantity_sold': int(item.get('QuantitySold', 0)),
            'watch_count': int(item.get('WatchCount', 0)),
            'hit_count': int(item.get('HitCount', 0)),
            'quantity_available': int(item.get('Quantity', 0)),
            
            # 🔥 出品必須項目
            'description': item.get('Description', ''),
            'picture_urls': item.get('PictureURL', []),
            'item_specifics': self._parse_item_specifics(item.get('ItemSpecifics', {})),
            'return_policy': self._parse_return_policy(item.get('ReturnPolicy', {})),
            'shipping_info': self._parse_shipping_info(item.get('ShippingCostSummary', {})),
            
            # その他
            'listing_status': item.get('ListingStatus'),
            'time_left': item.get('TimeLeft'),
            'title': item.get('Title'),
            'current_price': float(item.get('CurrentPrice', {}).get('Value', 0)),
        }
    
    def _parse_item_specifics(self, specifics: Dict) -> Dict:
        """商品仕様をパース"""
        
        if not specifics:
            return {}
        
        name_value_list = specifics.get('NameValueList', [])
        
        # 単一要素の場合リスト化
        if isinstance(name_value_list, dict):
            name_value_list = [name_value_list]
        
        result = {}
        for item in name_value_list:
            name = item.get('Name', '')
            values = item.get('Value', [])
            
            # 値がリストでない場合リスト化
            if not isinstance(values, list):
                values = [values]
            
            result[name] = values
        
        return result
    
    def _parse_return_policy(self, policy: Dict) -> Dict:
        """返品ポリシーをパース"""
        
        if not policy:
            return {}
        
        return {
            'returns_accepted': policy.get('ReturnsAccepted', ''),
            'returns_within': policy.get('ReturnsWithin', ''),
            'refund_option': policy.get('Refund', ''),
            'shipping_cost_paid_by': policy.get('ShippingCostPaidBy', '')
        }
    
    def _parse_shipping_info(self, shipping: Dict) -> Dict:
        """配送情報をパース"""
        
        if not shipping:
            return {}
        
        return {
            'shipping_cost': float(shipping.get('ShippingServiceCost', {}).get('Value', 0)),
            'shipping_type': shipping.get('ShippingType', ''),
            'expedited_shipping': shipping.get('ExpeditedShipping', False)
        }


# 使用例
if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    async def test():
        app_id = os.getenv('EBAY_APP_ID')
        
        async with EbayShoppingClient(app_id) as client:
            # 単一アイテム取得テスト
            print("=== 単一アイテム取得 ===")
            item = await client.get_single_item('123456789012')
            if item:
                print(f"販売数: {item['quantity_sold']}")
                print(f"ウォッチ数: {item['watch_count']}")
                print(f"閲覧数: {item['hit_count']}")
            
            # 複数アイテム取得テスト
            print("\n=== 複数アイテム取得 ===")
            item_ids = ['123456789012', '234567890123', '345678901234']
            items = await client.get_multiple_items(item_ids)
            print(f"取得数: {len(items)}")
            
            for item in items:
                print(f"  - {item['ebay_item_id']}: 販売{item['quantity_sold']}個")
            
            # バッチ取得テスト
            print("\n=== バッチ取得 ===")
            many_ids = [f"TEST{i:09d}" for i in range(1, 51)]  # 50件
            all_items = await client.get_items_in_batches(many_ids, batch_size=20)
            print(f"最終取得数: {len(all_items)}")
    
    asyncio.run(test())
