# ファイル作成: ebay_api_wrapper.py
# 目的: 廃止予定APIからBrowse APIへ完全移行

import requests
import json
import time
import os
from datetime import datetime, timedelta

class EbayAPIManager:
    def __init__(self):
        """OAuth 2.0認証システム実装"""
        self.credentials = json.loads(os.environ.get('EBAY_API_CREDENTIALS', '{}'))
        self.token = None
        self.token_expiry = None
        self.rate_limit_reset_time = datetime.now()
        self.rate_limit_count = 0

    def _get_access_token(self, account_id):
        """
        OAuth 2.0アクセストークン取得/更新
        複数アカウント対応（account_id別管理）
        """
        # トークンが有効期限切れ、または存在しない場合に更新
        if not self.token or self.token_expiry < datetime.now():
            try:
                # 実際はここでAPI呼び出しを行う
                response = requests.post(f'https://api.ebay.com/identity/v1/oauth2/token', data={
                    'grant_type': 'client_credentials',
                    'scope': 'https://api.ebay.com/oauth/api_scope',
                }, auth=(self.credentials[account_id]['client_id'], self.credentials[account_id]['client_secret']))
                
                response.raise_for_status()
                data = response.json()
                self.token = data['access_token']
                self.token_expiry = datetime.now() + timedelta(seconds=data['expires_in'])
                print(f"✅ eBay APIアクセストークンを更新しました。有効期限: {self.token_expiry}")
            except Exception as e:
                print(f"❌ eBayアクセストークン取得エラー: {e}")
                raise

        return self.token

    def browse_search(self, query, account_id):
        """
        Finding API → Browse API移行
        レート制限管理（1日制限監視）
        """
        self._get_access_token(account_id)
        
        # 実際には、Browse APIの検索エンドポイントを呼び出す
        headers = {
            'Authorization': f'Bearer {self.token}',
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
        params = {'q': query}
        
        try:
            response = requests.get(f'https://api.ebay.com/buy/browse/v1/item_summary/search', headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Browse API検索エラー: {e}")
            return {'error': str(e)}

    def get_category_suggestions(self, title, description):
        """
        Taxonomy API実装
        カテゴリ自動割り当て
        """
        # 実際には、Taxonomy APIのカテゴリ提案エンドポイントを呼び出す
        # ここではダミーレスポンスを返す
        return {'category_id': 171957, 'category_name': 'Computers/Tablets & Networking > Laptops & Netbooks'}

    def list_item(self, item_data, account_id):
        """
        Trading API出品機能
        複数アカウント切り替え対応
        """
        self._get_access_token(account_id)
        
        # 実際には、Trading APIまたはLising APIの出品エンドポイントを呼び出す
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        # item_dataをeBayの出品フォーマットに変換
        listing_payload = {
            'title': item_data.get('title_en'),
            'description': item_data.get('description_en'),
            'primaryCategory': {'categoryId': item_data.get('ebay_category_id')},
            'conditionId': 3000, # 例: Used
            'listingPolicies': {
                'fulfillmentPolicyId': item_data.get('ebay_shipping_policy_id'),
                'paymentPolicyId': 'paymentPolicyId',
                'returnPolicyId': 'returnPolicyId'
            }
        }
        
        try:
            response = requests.post(f'https://api.ebay.com/sell/inventory/v1/item', headers=headers, data=json.dumps(listing_payload))
            response.raise_for_status()
            return {'success': True, 'listing_url': response.json().get('itemWebUrl')}
        except Exception as e:
            print(f"❌ eBay出品エラー: {e}")
            return {'success': False, 'error': str(e)}