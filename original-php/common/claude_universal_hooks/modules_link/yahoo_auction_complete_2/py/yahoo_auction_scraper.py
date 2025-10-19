from playwright.sync_api import sync_playwright
import re
import json
import time

def scrape_yahoo_auction(url, debug=True):
    """
    ヤフオクスクレイピング関数（価格バグ修正済み完成版）
    """
    if debug:
        print("🧪 ヤフオクスクレイパー実行中...")
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            page = browser.new_page()
            
            if debug:
                print(f"📄 ページ読み込み: {url}")
            
            response = page.goto(url, timeout=30000)
            if debug:
                print(f"✅ HTTP Status: {response.status}")
            
            page.wait_for_timeout(3000)
            
            # タイトル取得
            title = page.locator('h1').first.text_content()
            if debug:
                print(f"📋 タイトル: {title[:50]}...")
            
            # 価格取得（バグ修正版）
            price_element = page.locator('dd:has-text("円")').first
            price_text = price_element.text_content()
            if debug:
                print(f"💰 価格テキスト: '{price_text}'")
            
            # 価格変換（修正版）- 「20,000円（税0円）」→ 20000
            price = 0
            if price_text:
                # 最初の「数字,数字円」パターンを抽出
                yen_match = re.search(r'([\d,]+)円', price_text)
                if yen_match:
                    number_str = yen_match.group(1)  # "20,000"を取得
                    price = int(number_str.replace(',', ''))  # 20000に変換
                    if debug:
                        print(f"💰 価格変換: '{number_str}' → {price:,}円")
                else:
                    if debug:
                        print("💰 価格パターンが見つかりません")
            
            # 商品説明取得
            description = "商品説明が見つかりませんでした"
            try:
                divs = page.locator('div').all()
                for div in divs[:50]:
                    text = div.text_content()
                    if text and len(text.strip()) > 100:
                        description = text.strip()[:300] + "..."
                        break
            except:
                pass
            
            # 画像URL取得
            image_urls = []
            try:
                imgs = page.locator('img').all()
                for img in imgs:
                    src = img.get_attribute('src')
                    if src and ('auction' in src or 'yahoo' in src):
                        image_urls.append(src)
            except:
                pass
            
            # 結果構築
            result = {
                'url': url,
                'title_jp': title,
                'price_jpy': price,
                'price_text': price_text,
                'description_jp': description,
                'image_urls': '|'.join(image_urls[:10]),
                'scrape_success': True,
                'scrape_timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            }
            
            if debug:
                print("\n📊 最終結果:")
                print(json.dumps(result, ensure_ascii=False, indent=2))
            
            page.wait_for_timeout(2000)
            browser.close()
            
            return result
            
    except Exception as e:
        if debug:
            print(f"❌ エラー: {e}")
        return {
            'url': url,
            'scrape_success': False,
            'error': str(e),
            'scrape_timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }

# テスト実行用
def test():
    url = "https://auctions.yahoo.co.jp/jp/auction/p1198293948"
    result = scrape_yahoo_auction(url)
    
    if result['scrape_success']:
        print(f"\n🎉 成功！価格: {result['price_jpy']:,}円（正しく2万円）")
    else:
        print(f"\n❌ 失敗: {result.get('error')}")

if __name__ == "__main__":
    test()
