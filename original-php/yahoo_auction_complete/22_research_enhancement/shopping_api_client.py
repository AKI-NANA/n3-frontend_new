# desktop-crawler/ebay_shopping_api.py
"""
eBay Shopping API クライアント
Finding APIで取得した商品の詳細情報を取得
"""

import requests
from typing import List, Dict, Optional
import time


class EbayShoppingClient:
    """eBay Shopping API クライアント"""
    
    def __init__(self, app_id: str):
        self.app_id = app_id
        self.base_url = "http://open.api.ebay.com/shopping"
        self.version = "967"
        self.site_id = "0"  # US
        
    def get_single_item(self, item_id: str) -> Optional[Dict]:
        """
        単一商品の詳細取得
        
        Args:
            item_id: eBay Item ID
            
        Returns:
            商品詳細データ
        """
        params = {
            'callname': 'GetSingleItem',
            'responseencoding': 'JSON',
            'appid': self.app_id,
            'siteid': self.site_id,
            'version': self.version,
            'ItemID': item_id,
            'IncludeSelector': 'Details,ItemSpecifics'
        }
        
        try:
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # エラーチェック
            if 'Errors' in data:
                print(f"Shopping API Error for {item_id}: {data['Errors']}")
                return None
            
            item = data.get('Item')
            if not item:
                return None
            
            return self._parse_item_details(item)
            
        except Exception as e:
            print(f"Failed to get item {item_id}: {e}")
            return None
    
    def get_multiple_items(self, item_ids: List[str]) -> List[Dict]:
        """
        複数商品の詳細を一括取得（最大20件）
        
        Args:
            item_ids: eBay Item IDのリスト（最大20件）
            
        Returns:
            商品詳細データのリスト
        """
        # 最大20件に制限
        item_ids = item_ids[:20]
        
        params = {
            'callname': 'GetMultipleItems',
            'responseencoding': 'JSON',
            'appid': self.app_id,
            'siteid': self.site_id,
            'version': self.version,
            'ItemID': ','.join(item_ids),
            'IncludeSelector': 'Details,ItemSpecifics'
        }
        
        try:
            response = requests.get(self.base_url, params=params, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            
            # エラーチェック
            if 'Errors' in data:
                print(f"Shopping API Error: {data['Errors']}")
                return []
            
            items = data.get('Item', [])
            
            # 単一アイテムの場合、リストに変換
            if isinstance(items, dict):
                items = [items]
            
            return [self._parse_item_details(item) for item in items if item]
            
        except Exception as e:
            print(f"Failed to get multiple items: {e}")
            return []
    
    def get_items_in_batches(
        self, 
        item_ids: List[str],
        batch_size: int = 20,
        delay: float = 0.5
    ) -> List[Dict]:
        """
        商品を複数バッチに分けて取得
        
        Args:
            item_ids: Item IDのリスト
            batch_size: バッチサイズ（デフォルト20）
            delay: バッチ間の待機時間（秒）
            
        Returns:
            全商品の詳細データリスト
        """
        all_items = []
        total_batches = (len(item_ids) + batch_size - 1) // batch_size
        
        print(f"Fetching {len(item_ids)} items in {total_batches} batches...")
        
        for i in range(0, len(item_ids), batch_size):
            batch = item_ids[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            
            print(f"  Batch {batch_num}/{total_batches}: {len(batch)} items")
            
            items = self.get_multiple_items(batch)
            all_items.extend(items)
            
            # レート制限対策
            if i + batch_size < len(item_ids):
                time.sleep(delay)
        
        print(f"Successfully fetched {len(all_items)} items")
        return all_items
    
    def _parse_item_details(self, item: Dict) -> Dict:
        """Shopping APIレスポンスをパース"""
        return {
            'ebay_item_id': item.get('ItemID'),
            
            # 人気度指標（重要！）
            'quantity_sold': int(item.get('QuantitySold', 0)),
            'watch_count': int(item.get('WatchCount', 0)),
            'hit_count': int(item.get('HitCount', 0)),
            
            # 在庫情報
            'quantity_available': int(item.get('Quantity', 0)),
            
            # 詳細情報
            'description': item.get('Description', ''),
            
            # 画像（複数）
            'picture_urls': item.get('PictureURL', []),
            
            # 商品仕様
            'item_specifics': self._parse_item_specifics(
                item.get('ItemSpecifics', {})
            ),
            
            # 返品ポリシー
            'return_policy': self._parse_return_policy(
                item.get('ReturnPolicy', {})
            ),
            
            # 配送情報
            'shipping_info': {
                'handling_time': item.get('HandlingTime', 0),
                'shipping_type': item.get('ShippingType', ''),
                'expedited_shipping': item.get('ExpeditedShipping', False)
            },
            
            # その他
            'listing_status': item.get('ListingStatus', ''),
            'time_left': item.get('TimeLeft', ''),
            'seller_business_type': item.get('SellerBusinessType', '')
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


# 使用例
if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    app_id = os.getenv('EBAY_APP_ID')
    client = EbayShoppingClient(app_id)
    
    # 単一アイテム取得テスト
    print("=== 単一アイテム取得 ===")
    item = client.get_single_item('123456789012')
    if item:
        print(f"販売数: {item['quantity_sold']}")
        print(f"ウォッチ数: {item['watch_count']}")
        print(f"閲覧数: {item['hit_count']}")
    
    # 複数アイテム取得テスト
    print("\n=== 複数アイテム取得 ===")
    item_ids = ['123456789012', '234567890123', '345678901234']
    items = client.get_multiple_items(item_ids)
    print(f"取得数: {len(items)}")
    
    for item in items:
        print(f"  - {item['ebay_item_id']}: 販売{item['quantity_sold']}個")
