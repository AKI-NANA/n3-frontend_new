import requests
import json
import os
from typing import Optional

def get_ebay_category_by_api(title: str, description: str) -> Optional[str]:
    """
    eBay Taxonomy APIを利用して、商品名と説明文から最適なカテゴリIDを推論します。
    """
    
    # 環境変数からAPIキーを読み込む
    ebay_app_token = os.environ.get('EBAY_APP_TOKEN')
    if not ebay_app_token:
        print("❌ エラー: 環境変数 'EBAY_APP_TOKEN' が設定されていません。")
        return None

    url = "https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_category_suggestions"
    headers = {
        'Authorization': f'Bearer {ebay_app_token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # 商品名と説明文を組み合わせて検索クエリを作成
    query_text = f"{title} {description}"

    params = {'q': query_text}
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status() # HTTPエラーが発生した場合に例外を発生させる
        
        data = response.json()
        
        # 取得したデータから最も関連性の高いカテゴリIDを抽出
        if 'categorySuggestions' in data and data['categorySuggestions']:
            category_suggestion = data['categorySuggestions'][0]
            category_id = category_suggestion['categoryId']
            category_name = category_suggestion['categoryName']
            print(f"✅ APIが推奨するカテゴリ: {category_name} (ID: {category_id})")
            return category_id
            
    except requests.exceptions.RequestException as e:
        print(f"❌ eBay API呼び出し中にエラーが発生しました: {e}")
        return None
    
    return None

if __name__ == '__main__':
    # テスト実行用のコード
    test_title = "ポケモンカード リザードンVMAX"
    test_description = "コレクション用に保管しておりました。目立った傷はありません。"
    ebay_category = get_ebay_category_by_api(test_title, test_description)
    if ebay_category:
        print(f"取得したeBayカテゴリID: {ebay_category}")
    else:
        print("カテゴリIDを取得できませんでした。")