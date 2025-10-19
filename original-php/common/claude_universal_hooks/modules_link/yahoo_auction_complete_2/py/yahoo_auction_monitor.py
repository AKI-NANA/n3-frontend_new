import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
from google.cloud import firestore
import time
import uuid

# Firestoreデータベースの初期化
db = firestore.Client()

def get_product_details_from_page(url):
    """
    個別商品ページから詳細情報を取得する。
    """
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # 商品名を取得
        title = soup.find('h1', class_='ProductTitle__text').text.strip() if soup.find('h1', class_='ProductTitle__text') else 'タイトルなし'
        
        # 価格を取得
        price_text = soup.find('dd', class_='ProductPrice__price').text.strip() if soup.find('dd', class_='ProductPrice__price') else '価格情報なし'
        price = int(re.sub(r'[^\d]', '', price_text)) if '円' in price_text else None
        
        # 入札者数を取得
        bids_text = soup.find('span', class_='ProductBid__bid').text.strip() if soup.find('span', class_='ProductBid__bid') else '入札者数情報なし'
        bids = int(re.sub(r'[^\d]', '', bids_text)) if '件' in bids_text else 0
        
        # 終了日時を取得
        end_time_element = soup.find('time', class_='ProductEndTime__time')
        end_time_str = end_time_element['datetime'] if end_time_element and 'datetime' in end_time_element.attrs else None
        end_time = datetime.fromisoformat(end_time_str) if end_time_str else None
        
        # 出品者情報を取得
        seller_element = soup.find('a', class_='Seller__body')
        seller_id = seller_element['href'].split('/')[-1] if seller_element and 'href' in seller_element.attrs else '出品者IDなし'
        
        # 商品の状態を取得
        condition_element = soup.find('div', class_='ProductCondition')
        condition = condition_element.find('span').text.strip() if condition_element and condition_element.find('span') else '状態不明'
        
        # 画像URLを取得
        image_element = soup.find('img', class_='ProductImage__image')
        image_url = image_element['src'] if image_element and 'src' in image_element.attrs else None

        return {
            'product_id': str(uuid.uuid4()),
            'title': title,
            'url': url,
            'price': price,
            'bids': bids,
            'end_time': end_time,
            'seller_id': seller_id,
            'condition': condition,
            'image_url': image_url,
            'scraped_at': datetime.now()
        }
    
    except requests.exceptions.RequestException as e:
        print(f"URLへの接続エラー: {e}")
        return None
    except Exception as e:
        print(f"データ解析エラー: {e}")
        return None

def scrape_search_results(query, limit=10):
    """
    検索キーワードから複数の商品情報を取得する。
    """
    search_url = f'https://auctions.yahoo.co.jp/search/search?p={query}'
    print(f"検索ページをスクレイピング中: {search_url}")
    
    try:
        response = requests.get(search_url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        product_urls = []
        for a_tag in soup.select('a.Product__itemLink')[:limit]:
            if 'href' in a_tag.attrs:
                product_urls.append(a_tag['href'])
        
        products = []
        for url in product_urls:
            print(f"個別ページをスクレイピング中: {url}")
            product_data = get_product_details_from_page(url)
            if product_data:
                products.append(product_data)
            time.sleep(1) # サーバーへの負荷を軽減
            
        return products
        
    except requests.exceptions.RequestException as e:
        print(f"検索ページへの接続エラー: {e}")
        return []

def save_to_firestore(products):
    """
    取得した商品データをFirestoreに保存する。
    """
    if not products:
        print("保存するデータがありません。")
        return

    collection_ref = db.collection('yahoo_auction_monitoring')
    for product in products:
        try:
            # Firestoreに直接保存可能な形式に変換
            product_data = {
                'product_id': product['product_id'],
                'title': product['title'],
                'url': product['url'],
                'price': product['price'],
                'bids': product['bids'],
                'end_time': product['end_time'],
                'seller_id': product['seller_id'],
                'condition': product['condition'],
                'image_url': product['image_url'],
                'scraped_at': product['scraped_at']
            }
            collection_ref.document(product_data['product_id']).set(product_data)
            print(f"✅ データをFirestoreに保存しました: {product['title']}")
        except Exception as e:
            print(f"Firestoreへの保存エラー: {e}")

def main():
    """
    メイン実行関数。
    """
    # 個別URLからデータを取得する場合
    individual_url = "https://auctions.yahoo.co.jp/jp/auction/w1190447053"
    products_from_url = get_product_details_from_page(individual_url)
    if products_from_url:
        save_to_firestore([products_from_url])

    # 検索キーワードからデータを取得する場合
    search_query = "デジタルカメラ"
    products_from_query = scrape_search_results(search_query, limit=5)
    if products_from_query:
        save_to_firestore(products_from_query)

if __name__ == "__main__":
    main()
