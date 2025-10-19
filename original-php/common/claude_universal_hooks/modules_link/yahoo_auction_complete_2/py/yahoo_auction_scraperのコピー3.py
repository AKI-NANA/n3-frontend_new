from playwright.sync_api import sync_playwright, TimeoutError
import re
import os

def scrape_auction_data(url):
    """
    指定されたヤフオクのURLから商品情報をスクレイピングします。
    """
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto(url, wait_until='domcontentloaded')

            title_jp = page.locator('.ProductTitle__text').text_content().strip()
            
            price_element = page.locator('.ProductPrice dd')
            if not price_element.is_visible():
                price_element = page.locator('.Price__value')
            
            price_text = price_element.text_content().replace('円', '').replace(',', '').strip()
            price_jpy = int(re.sub(r'[^0-9]', '', price_text))
            
            description_jp = page.locator('.ProductDescription__body').text_content().strip()
            
            image_elements = page.locator('.ProductImage__image')
            image_urls = '|'.join([img.get_attribute('src') for img in image_elements.all() if img.get_attribute('src')])
            
            condition_jp = page.locator('.ProductDetail__body').text_content().strip()
            
            item_id = url.split('/')[-1].split('?')[0]

            browser.close()

            return {
                'url': url,
                'title_jp': title_jp,
                'price_jpy': price_jpy,
                'description_jp': description_jp,
                'image_urls': image_urls,
                'item_id': item_id,
                'condition': condition_jp,
                'shipping_fee': '送料は別途計算'
            }
    except Exception as e:
        print(f"ヤフオクのスクレイピングエラー: {e}")
        return None

def scrape_paypay_fleamarket(url):
    """
    指定されたPayPayフリマのURLから商品情報をスクレイピングします。
    """
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto(url, wait_until='domcontentloaded', timeout=60000)

            title_element = page.locator('h1.ItemTitle__Component .cbMEDL')
            price_element = page.locator('.ItemPrice__Component .eZCKPx')
            description_element = page.locator('.ItemText__Text .iIPBqM')
            category_elements = page.locator('table.ItemTable__Component a')
            condition_element = page.locator('table.ItemTable__Component tr:nth-child(3) td')
            location_element = page.locator('table.ItemTable__Component tr:nth-child(6) td')
            product_id_element = page.locator('table.ItemTable__Component tr:nth-child(7) td')

            title_jp = title_element.text_content().strip() if title_element and title_element.is_visible() else "タイトルが見つかりません"
            
            price_str = price_element.text_content().replace('円', '').replace(',', '').strip() if price_element and price_element.is_visible() else "価格が見つかりません"
            price_jpy = int(price_str) if price_str.isdigit() else 0
            
            description_jp = description_element.text_content().strip() if description_element and description_element.is_visible() else "説明文が見つかりません"

            image_elements = page.locator('div.slick-track img.sc-9b33bf35-3.bDgrAu')
            image_urls = '|'.join([img.get_attribute('src') for img in image_elements.all() if img.get_attribute('src')])
            
            category_list = [el.text_content().strip() for el in category_elements.all() if el.text_content()]
            category_jp = " > ".join(category_list) if category_list else "カテゴリー情報なし"
            
            condition_jp = condition_element.text_content().strip() if condition_element and condition_element.is_visible() else "状態情報なし"
            
            location_jp = location_element.text_content().strip() if location_element and location_element.is_visible() else "発送元地域なし"
            
            product_id = product_id_element.text_content().strip() if product_id_element and product_id_element.is_visible() else "商品IDなし"

            browser.close()

            return {
                'url': url,
                'title_jp': title_jp,
                'price_jpy': price_jpy,
                'description_jp': description_jp,
                'image_urls': image_urls,
                'category': category_jp,
                'condition': condition_jp,
                'shipping_from': location_jp,
                'product_id': product_id
            }

    except Exception as e:
        print(f"PayPayフリマのスクレイピングエラー: {e}")
        return None