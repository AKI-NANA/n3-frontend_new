# -*- coding: utf-8 -*-

import requests
from bs4 import BeautifulSoup
import json
import re
import time
import math

# 消費税率（2025年8月現在）
# 適切な税率に変更してください
TAX_RATE = 0.10 

def scrape_auction_data(url: str, delay: int = 5) -> dict:
    """
    指定されたヤフオクのURLから商品詳細情報をスクレイピングする。
    より堅牢な価格取得ロジックと消費税計算を追加。

    Args:
        url (str): ヤフオクの商品ページのURL
        delay (int): アクセス間の待機時間（秒）

    Returns:
        dict: スクレイピングしたデータ。エラーの場合はNone。
    """
    try:
        print(f"アクセス中...{delay}秒待機します。")
        time.sleep(delay)
        
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # 1. pageData変数からデータを取得する
        title = '取得できませんでした'
        price = '価格を取得できませんでした'
        win_price = '落札価格を取得できませんでした'
        is_store = False
        
        page_data_script = soup.find('script', string=re.compile('pageData ='))
        if page_data_script:
            json_str = re.search(r'var pageData = (\{.*?\});', page_data_script.string, re.DOTALL)
            if json_str:
                try:
                    data = json.loads(json_str.group(1))
                    product_info = data.get('items', {})
                    title = product_info.get('productName', title)
                    price = product_info.get('price', price)
                    win_price = product_info.get('winPrice', win_price)
                    # ストア出品かどうかをチェック
                    if product_info.get('isStore') == '1':
                        is_store = True
                except json.JSONDecodeError as e:
                    print(f"JSONの解析中にエラーが発生しました: {e}")

        # 2. pageDataからの取得が失敗した場合、HTML要素から価格を探す
        if price == '価格を取得できませんでした' or price is None:
            price_element = soup.find('dd', class_='Price--bid')
            if price_element:
                price = price_element.get_text(strip=True)

        # 3. 消費税を計算する
        total_price = price
        tax = 0
        if is_store and isinstance(price, str) and price.isdigit():
            # priceが文字列であり、数字である場合のみ計算
            price_int = int(price)
            tax = math.floor(price_int * TAX_RATE)
            total_price = price_int + tax
            total_price = f"{total_price} (税込 {tax}円)"
        else:
            total_price = price

        # 画像URLと商品説明の取得
        image_url_meta = soup.find('meta', property='og:image')
        image_url = image_url_meta['content'] if image_url_meta else '画像URLを取得できませんでした'

        description_meta = soup.find('meta', property='og:description')
        description = description_meta['content'] if description_meta else '商品説明を取得できませんでした'
        
        # 商品詳細テーブルから各項目を取得
        details_table = soup.find('table', class_='ProductDetail__table')
        product_details = {}
        if details_table:
            rows = details_table.find_all('tr')
            for row in rows:
                header = row.find('th', class_='ProductDetail__tableHead')
                data = row.find('td', class_='ProductDetail__tableData')
                if header and data:
                    key = header.get_text(strip=True)
                    value = data.get_text(strip=True)
                    product_details[key] = value

        return {
            'title': title,
            'price': total_price,
            'image_url': image_url,
            'description': description,
            'details': product_details,
            'win_price': win_price
        }

    except requests.exceptions.RequestException as e:
        print(f"URLへのアクセス中にエラーが発生しました: {e}")
        return None
    except Exception as e:
        print(f"スクレイピング中に予期せぬエラーが発生しました: {e}")
        return None

def generate_html(data: dict):
    """
    スクレイピングしたデータをHTML形式に整形する
    """
    details_html = "".join([
        f"""
        <div class="mb-2">
            <span class="font-semibold text-gray-700">{key}:</span>
            <span class="text-gray-600">{value}</span>
        </div>
        """ for key, value in data['details'].items()
    ])

    price_html = ""
    if data['price'] != '価格を取得できませんでした':
        price_html = f"<p class='text-2xl text-red-600 font-bold mb-4'>価格: {data['price']}</p>"
    if data['win_price'] != '落札価格を取得できませんでした' and data['win_price'] is not None and data['win_price'] != data['price']:
        price_html += f"<p class='text-lg text-gray-700 font-medium mb-4'>落札価格: {data['win_price']}</p>"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{data['title']}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
            body {{ font-family: 'Inter', sans-serif; }}
        </style>
    </head>
    <body class="bg-gray-100 p-8">
        <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden md:flex">
            <!-- 商品画像 -->
            <div class="md:flex-shrink-0 p-4">
                <img src="{data['image_url']}" alt="商品画像" class="h-64 w-full object-cover rounded-lg md:h-full md:w-64">
            </div>

            <!-- 商品詳細 -->
            <div class="p-6 flex flex-col justify-center">
                <h1 class="text-3xl font-bold text-gray-800 mb-2">{data['title']}</h1>
                {price_html}
                <div class="mt-4">
                    <h2 class="text-xl font-semibold text-gray-700">商品説明</h2>
                    <p class="mt-2 text-gray-600 leading-relaxed whitespace-pre-wrap">{data['description']}</p>
                </div>
                <div class="mt-6">
                    <h2 class="text-xl font-semibold text-gray-700">追加情報</h2>
                    {details_html}
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    with open('auctions_data_final_plus.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    print("データが 'auctions_data_final_plus.html' として保存されました。")

if __name__ == '__main__':
    url = 'https://auctions.yahoo.co.jp/jp/auction/w1190447053'
    auction_data = scrape_auction_data(url)

    if auction_data:
        generate_html(auction_data)
