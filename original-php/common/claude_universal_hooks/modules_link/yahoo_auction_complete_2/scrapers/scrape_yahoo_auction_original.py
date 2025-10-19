import requests
from bs4 import BeautifulSoup
import pandas as pd
import json

def get_auction_data(url):
    """
    指定されたヤフオク商品ページのURLから詳細情報を取得する関数

    Args:
        url (str): ヤフオクの商品ページのURL

    Returns:
        dict: 取得した詳細情報を格納した辞書
    """
    try:
        response = requests.get(url)
        response.raise_for_status() # HTTPエラーが発生した場合に例外を発生させる
        soup = BeautifulSoup(response.text, 'html.parser')

        # 商品タイトル
        try:
            title = soup.find('h1', class_='ProductTitle__text').get_text(strip=True)
        except AttributeError:
            title = 'N/A'
        
        # 価格情報
        price = 'N/A'
        try:
            price_element = soup.find('dt', class_='Price__label').find_next_sibling('dd')
            price = price_element.find('span', class_='Price__value').get_text(strip=True)
            # 即決価格
            buy_it_now_price_element = soup.find('div', class_='ProductPrice__price--fixed')
            buy_it_now_price = buy_it_now_price_element.find('span', class_='ProductPrice__value').get_text(strip=True) if buy_it_now_price_element else 'N/A'
        except AttributeError:
            buy_it_now_price = 'N/A'

        # 送料
        shipping_cost = 'N/A'
        try:
            shipping_element = soup.find('dt', class_='Shipping__label').find_next_sibling('dd')
            shipping_cost = shipping_element.find('span', class_='Price__value').get_text(strip=True) if shipping_element else 'N/A'
        except AttributeError:
            pass

        # 商品画像URL
        image_urls = []
        try:
            # メイン画像
            main_image_element = soup.find('div', class_='ProductImage__main').find('img')
            if main_image_element and 'src' in main_image_element.attrs:
                image_urls.append(main_image_element['src'])
            
            # サブ画像（サムネイル）
            thumbnail_elements = soup.find_all('img', class_='ProductImage__thumbnail')
            for thumb in thumbnail_elements:
                if 'data-src' in thumb.attrs:
                    image_urls.append(thumb['data-src'])
                elif 'src' in thumb.attrs:
                    image_urls.append(thumb['src'])

        except AttributeError:
            pass

        # 商品説明
        description = 'N/A'
        try:
            # iframeの内容を取得
            iframe = soup.find('iframe', id='description_iframe')
            if iframe and 'src' in iframe.attrs:
                iframe_src = iframe['src']
                iframe_response = requests.get(iframe_src)
                iframe_soup = BeautifulSoup(iframe_response.text, 'html.parser')
                description = iframe_soup.get_text(strip=True)
            else:
                # iframeがない場合
                description = soup.find('div', class_='ProductExplanation__body').get_text(strip=True)
        except AttributeError:
            pass

        return {
            'title': title,
            'price': price,
            'buy_it_now_price': buy_it_now_price,
            'shipping_cost': shipping_cost,
            'description': description,
            'image_urls': json.dumps(image_urls), # リストをJSON文字列として保存
            'url': url
        }

    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL {url}: {e}")
        return None

# スクレイピング対象のURLリスト
# ここに取得したい商品ページのURLを追加してください
urls_to_scrape = [
    'https://auctions.yahoo.co.jp/jp/auction/w1190447053',
    'https://auctions.yahoo.co.jp/jp/auction/f1140003045', # 例として別のURLを追加
    'https://auctions.yahoo.co.jp/jp/auction/n1140000000' # 存在しないURLの例
]

# スクレイピングの実行
auction_data = []
for url in urls_to_scrape:
    data = get_auction_data(url)
    if data:
        auction_data.append(data)

# データフレームの作成
df = pd.DataFrame(auction_data)

# HTMLファイルの生成
html_output = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ヤフオク詳細データ</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f3f4f6;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 1rem;
        }
        h1 {
            color: #1f2937;
        }
        .card {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 2rem;
        }
        .image-gallery {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            margin-top: 1rem;
        }
        .image-gallery img {
            width: 150px;
            height: 150px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold text-center mb-8">ヤフオク詳細スクレイピング結果</h1>
        """

# データフレームの行ごとにカードを生成
for index, row in df.iterrows():
    # 画像URLをJSON文字列からリストに変換
    try:
        image_urls = json.loads(row['image_urls'])
    except json.JSONDecodeError:
        image_urls = []

    image_tags = ""
    for img_url in image_urls:
        image_tags += f'<img src="{img_url}" alt="商品画像" class="rounded-lg shadow-md hover:scale-105 transition-transform duration-300">'

    html_output += f"""
        <div class="card mb-8">
            <h2 class="text-2xl font-semibold mb-2">{row['title']}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 class="text-xl font-medium text-gray-700 mt-4 mb-2">価格情報</h3>
                    <p class="text-lg">現在価格: <span class="font-bold text-blue-600">{row['price']}</span></p>
                    <p class="text-lg">即決価格: <span class="font-bold text-green-600">{row['buy_it_now_price']}</span></p>
                    <p class="text-lg">送料: <span class="font-bold">{row['shipping_cost']}</span></p>
                    <p class="text-sm text-gray-500 mt-2">商品URL: <a href="{row['url']}" class="text-blue-500 hover:underline" target="_blank">{row['url']}</a></p>
                </div>
                <div>
                    <h3 class="text-xl font-medium text-gray-700 mt-4 mb-2">商品説明</h3>
                    <div class="bg-gray-100 p-4 rounded-lg overflow-y-auto max-h-60">
                        <p class="text-gray-800 whitespace-pre-wrap">{row['description']}</p>
                    </div>
                </div>
            </div>
            
            <h3 class="text-xl font-medium text-gray-700 mt-8 mb-2">商品画像</h3>
            <div class="image-gallery">
                {image_tags if image_tags else '<p class="text-gray-500">画像が見つかりませんでした。</p>'}
            </div>
        </div>
        """

html_output += """
    </div>
</body>
</html>
"""

# HTMLファイルを生成し、上書き保存
with open('auctions_data_detail.html', 'w', encoding='utf-8') as f:
    f.write(html_output)

print("✅ HTMLファイルが生成されました: auctions_data_detail.html")
print("✅ Pythonスクリプトの実行が完了しました。")
