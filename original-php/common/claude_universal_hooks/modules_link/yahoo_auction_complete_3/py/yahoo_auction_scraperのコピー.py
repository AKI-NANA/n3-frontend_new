import requests
import sqlite3
import re
import time
from bs4 import BeautifulSoup
import pandas as pd
import webbrowser

def scrape_item_details(item_url):
    """
    個別の商品ページから詳細情報をスクレイピングする
    """
    try:
        response = requests.get(item_url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        details = {}
        
        # 商品説明の取得
        description_tag = soup.find("div", class_="ProductExplanation__body")
        details["description"] = description_tag.get_text(strip=True) if description_tag else "N/A"
        
        # 商品画像の取得
        image_tag = soup.find("li", class_="ProductImage__thumbnailList")
        if image_tag and image_tag.img:
            details["image_url"] = image_tag.img["src"]
        else:
            details["image_url"] = "N/A"

        # 送料の取得
        shipping_tag = soup.find("dd", class_="Price__text")
        if shipping_tag:
            shipping_text = shipping_tag.get_text(strip=True).replace(",", "")
            # 送料の金額を抽出
            match = re.search(r"(\d+)", shipping_text)
            if match:
                details["shipping_fee"] = int(match.group(1))
            else:
                details["shipping_fee"] = 0
        else:
            details["shipping_fee"] = 0
        
        # 商品の状態の取得 (「商品の状態」をキーとして探す)
        status_tag = soup.find("dt", text="商品の状態")
        if status_tag and status_tag.find_next_sibling("dd"):
            details["item_status"] = status_tag.find_next_sibling("dd").get_text(strip=True)
        else:
            details["item_status"] = "N/A"
            
        # 出品者IDの取得
        seller_tag = soup.find("a", class_="Seller__name")
        details["seller_id"] = seller_tag.get_text(strip=True) if seller_tag else "N/A"

        return details
        
    except requests.exceptions.RequestException as e:
        print(f"❌ 商品詳細ページのリクエストエラー: {e}")
        return None

def scrape_yahoo_auctions(keyword, pages=1):
    base_url = "https://auctions.yahoo.co.jp/search/search"
    all_auctions = []

    for page in range(1, pages + 1):
        params = {
            "p": keyword,
            "page": page,
        }

        print(f"「{keyword}」でヤフオクを検索しています... (ページ {page}/{pages})")
        try:
            response = requests.get(base_url, params=params)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")

            auctions = soup.find_all("li", class_="Product")
            
            if not auctions:
                print("❌ データが見つかりませんでした。キーワードを変更して再度お試しください。")
                break
                
            for auction in auctions:
                # 商品名
                name_tag = auction.find("h3", class_="Product__title")
                name = name_tag.get_text(strip=True) if name_tag else "N/A"

                # 価格 (金額から非数字文字を削除)
                price_tag = auction.find("span", class_="Product__priceValue")
                price_text = price_tag.get_text(strip=True).replace(",", "") if price_tag else "0"
                price = int(re.sub(r"[^0-9]", "", price_text))

                # 残り時間
                time_tag = auction.find("div", class_="Product__time")
                remaining_time = time_tag.get_text(strip=True) if time_tag else "N/A"

                # URL
                url_tag = auction.find("a", class_="Product__link")
                url = url_tag["href"] if url_tag else "N/A"
                
                # 詳細情報の取得 (URLがN/Aでない場合のみ)
                item_details = {}
                if url != "N/A":
                    item_details = scrape_item_details(url)
                
                auction_data = {
                    "name": name,
                    "price": price,
                    "remaining_time": remaining_time,
                    "url": url,
                }
                if item_details:
                    auction_data.update(item_details)
                
                all_auctions.append(auction_data)
                
            time.sleep(2) # サーバーに負荷をかけないように待機

        except requests.exceptions.RequestException as e:
            print(f"❌ リクエストエラー: {e}")
            break
            
    return all_auctions

def save_to_database(auctions_data):
    conn = sqlite3.connect("auctions.db")
    df = pd.DataFrame(auctions_data)
    df.to_sql("auctions", conn, if_exists="replace", index=False)
    conn.close()
    print("✅ データをデータベースに保存しました。")

if __name__ == "__main__":
    keyword = input("ヤフオクで検索するキーワードを入力してください (例: カメラ): ")
    if not keyword:
        print("キーワードが入力されませんでした。")
    else:
        auctions = scrape_yahoo_auctions(keyword)
        if auctions:
            save_to_database(auctions)
