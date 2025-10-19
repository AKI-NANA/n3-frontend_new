# ファイル作成: category_classifier.py
# 目的: eBay最適カテゴリ自動選択

import requests
import os

class CategoryClassifier:
    def __init__(self):
        # eBay APIの認証情報を取得
        self.ebay_api_token = os.environ.get('EBAY_API_TOKEN')

    def suggest_category(self, title_en, description_en):
        """
        eBay Taxonomy APIを使用して、最適なカテゴリを自動選択
        """
        headers = {
            'Authorization': f'Bearer {self.ebay_api_token}',
            'Content-Type': 'application/json',
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
        
        # APIリクエストのペイロード
        payload = {
            'query': title_en,
            'leaf_category_id': '171957', # デフォルトカテゴリ
            'text': description_en
        }

        try:
            response = requests.post('https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_category_suggestions', headers=headers, json=payload)
            response.raise_for_status()
            
            suggestions = response.json().get('categorySuggestions', [])
            if suggestions:
                best_suggestion = suggestions[0]['category']
                return {
                    'category_id': best_suggestion['categoryId'],
                    'category_name': best_suggestion['categoryName'],
                    'confidence_score': suggestions[0]['relevance']
                }
            
            return {'error': '最適なカテゴリが見つかりませんでした。'}
        except Exception as e:
            return {'error': str(e)}