from playwright.sync_api import sync_playwright
import re
import json
import time
from typing import Dict

class YahooAuctionScraper:
    """N3統合版ヤフオクスクレイパー"""
    
    def __init__(self, debug_mode=True):
        self.debug_mode = debug_mode
        
    def _log_debug(self, message: str):
        if self.debug_mode:
            print(f"[DEBUG] {message}")
    
    def _extract_price(self, price_text: str) -> int:
        """価格テキストから数値を抽出"""
        if not price_text:
            return 0
        
        # 「20,000円（税0円）」→ 20000
        yen_match = re.search(r'([\d,]+)円', price_text)
        if yen_match:
            return int(yen_match.group(1).replace(',', ''))
        return 0
    
    def scrape(self, url: str) -> Dict:
        """メインのスクレイピング関数"""
        self._log_debug(f"🚀 スクレイピング開始: {url}")
        
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=False)
                page = browser.new_page()
                
                # ページ読み込み
                response = page.goto(url, timeout=30000)
                if response.status != 200:
                    return {'scrape_success': False, 'error': f'HTTP {response.status}'}
                
                page.wait_for_timeout(3000)
                
                # データ取得
                result = {
                    'scrape_success': True,
                    'url': url,
                    'scrape_timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
                }
                
                # タイトル
                try:
                    title = page.locator('h1').first.text_content().strip()
                    result['title_jp'] = title
                    self._log_debug(f"✅ タイトル: {title[:50]}...")
                except Exception as e:
                    result['title_jp'] = f"取得失敗: {e}"
                
                # 価格
                try:
                    price_text = page.locator('dd:has-text("円")').first.text_content()
                    result['price_jpy'] = self._extract_price(price_text)
                    result['price_text'] = price_text
                    self._log_debug(f"✅ 価格: {result['price_jpy']:,}円")
                except Exception as e:
                    result['price_jpy'] = 0
                    result['price_text'] = f"取得失敗: {e}"
                
                # 説明（簡易版）
                try:
                    divs = page.locator('div').all()
                    result['description_jp'] = "説明が見つかりませんでした"
                    for div in divs[:30]:
                        text = div.text_content()
                        if text and len(text.strip()) > 100:
                            result['description_jp'] = text.strip()[:300]
                            break
                except Exception as e:
                    result['description_jp'] = f"取得失敗: {e}"
                
                # 画像
                try:
                    images = []
                    imgs = page.locator('img').all()
                    for img in imgs:
                        src = img.get_attribute('src')
                        if src and ('auction' in src or 'yahoo' in src):
                            images.append(src)
                    result['image_urls'] = '|'.join(images[:10])
                    self._log_debug(f"✅ 画像: {len(images)}個")
                except Exception as e:
                    result['image_urls'] = ""
                    self._log_debug(f"❌ 画像取得エラー: {e}")
                
                # 商品状態
                try:
                    condition_keywords = ['新品', '中古', '傷や汚れあり', '未使用']
                    result['condition'] = "状態不明"
                    
                    for keyword in condition_keywords:
                        if page.locator(f'*:has-text("{keyword}")').count() > 0:
                            result['condition'] = keyword
                            break
                except Exception:
                    result['condition'] = "状態不明"
                
                # 商品ID抽出
                result['item_id'] = url.split('/')[-1].split('?')[0]
                
                self._log_debug("⏸️ 結果確認のため3秒表示...")
                page.wait_for_timeout(3000)
                
                browser.close()
                
                # 結果ログ出力
                self._log_debug("📊 取得結果:")
                self._log_debug(f"  タイトル: {result.get('title_jp', 'N/A')[:50]}...")
                self._log_debug(f"  価格: {result.get('price_jpy', 0):,}円")
                self._log_debug(f"  説明: {result.get('description_jp', 'N/A')[:50]}...")
                self._log_debug(f"  画像: {len(result.get('image_urls', '').split('|'))}個")
                
                return result
                
        except Exception as e:
            self._log_debug(f"❌ 致命的エラー: {e}")
            return {
                'scrape_success': False,
                'error': str(e),
                'url': url,
                'scrape_timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            }

def scrape_yahoo_auction(url, debug=True):
    """
    N3システムから呼び出される関数
    """
    scraper = YahooAuctionScraper(debug_mode=debug)
    return scraper.scrape(url)

def test_scraper():
    """テスト実行用"""
    print("=" * 60)
    print("🧪 N3統合版ヤフオクスクレイパー テスト")
    print("=" * 60)
    
    test_url = "https://auctions.yahoo.co.jp/jp/auction/p1198293948"
    result = scrape_yahoo_auction(test_url)
    
    print("\n" + "=" * 60)
    print("📊 最終結果")
    print("=" * 60)
    
    if result and result.get('scrape_success'):
        print("✅ スクレイピング成功!")
        print(f"📋 タイトル: {result['title_jp']}")
        print(f"💰 価格: {result['price_jpy']:,}円")
        print(f"📝 説明: {result['description_jp'][:100]}...")
        print(f"🖼️ 画像: {len(result['image_urls'].split('|')) if result['image_urls'] else 0}個")
        print(f"🏷️ 状態: {result['condition']}")
        print(f"🆔 商品ID: {result['item_id']}")
        
        # JSON出力
        print(f"\n📄 JSON出力:")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    else:
        print("❌ スクレイピング失敗")
        if result:
            print(f"エラー: {result.get('error', '不明なエラー')}")

if __name__ == "__main__":
    test_scraper()
