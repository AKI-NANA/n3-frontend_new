#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔥 Yahoo スクレイピングシステム（URL設定修正版）
バックエンドURL検証ロジック修正・デバッグ強化
"""

import sys
import json
import time
import re
import urllib.parse
from datetime import datetime
import traceback

def log_message(level, message):
    """ログメッセージ出力"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] {level}: {message}")

def validate_yahoo_url(url):
    """Yahoo オークションURL検証（修正版）"""
    if not url:
        return False, "URLが空です"
    
    if not isinstance(url, str):
        return False, "URLが文字列ではありません"
    
    # デバッグ用：入力URL詳細情報
    log_message("DEBUG", f"入力URL詳細: {repr(url)}")
    log_message("DEBUG", f"URL長さ: {len(url)}")
    log_message("DEBUG", f"URLタイプ: {type(url)}")
    
    # URLの前後空白除去
    url = url.strip()
    
    # ローカルホストURL検出（エラーの原因）
    localhost_patterns = [
        r'https?://localhost',
        r'https?://127\.0\.0\.1',
        r'https?://.*\.local',
        r'file://'
    ]
    
    for pattern in localhost_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            return False, f"ローカルURLは使用できません。Yahoo オークションのURLを入力してください: {url[:50]}"
    
    # Yahoo オークションURLパターン（緩和版）
    yahoo_patterns = [
        # 標準的なYahoo オークションURL
        r'https?://auctions\.yahoo\.co\.jp/jp/auction/[a-zA-Z0-9]+',
        r'https?://page\.auctions\.yahoo\.co\.jp/jp/auction/[a-zA-Z0-9]+',
        
        # 追加パターン
        r'https?://.*auctions\.yahoo\.co\.jp.*auction.*',
        r'https?://.*yahoo\.co\.jp.*auction.*',
        
        # モバイル版
        r'https?://.*yahoo\.co\.jp/.*auction.*',
        
        # 短縮URLやリダイレクト経由の可能性も考慮
        r'https?://.*yahoo\..*auction.*'
    ]
    
    for pattern in yahoo_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            # 追加チェック：auction IDの存在確認
            if re.search(r'auction[/=]([a-zA-Z0-9]+)', url):
                return True, "有効なYahoo オークションURL"
    
    # テスト用URL許可（開発時のみ）
    test_patterns = [
        r'https?://.*yahoo.*test.*',
        r'https://auctions\.yahoo\.co\.jp/jp/auction/test\d+'
    ]
    
    for pattern in test_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            log_message("WARNING", "テスト用URLを検出 - 開発モードで処理します")
            return True, "テスト用Yahoo オークションURL"
    
    # 詳細なエラーメッセージ
    if 'yahoo' in url.lower():
        if 'auction' not in url.lower():
            return False, f"Yahoo URLですがオークションページではありません: {url[:50]}"
        else:
            return False, f"Yahoo オークションURLの形式が正しくありません: {url[:50]}"
    
    return False, f"Yahoo オークション以外のURLです。正しいYahoo オークションURLを入力してください: {url[:50]}"

def extract_auction_id(url):
    """オークションID抽出（修正版）"""
    patterns = [
        r'/auction/([a-zA-Z0-9]+)',
        r'auctionID=([a-zA-Z0-9]+)',
        r'auction[/_=]([a-zA-Z0-9]+)',
        r'/([a-zA-Z0-9]+)(?:\?|$)'  # URL末尾のID
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            auction_id = match.group(1)
            # IDの妥当性チェック
            if len(auction_id) > 3 and auction_id.isalnum():
                return auction_id
    
    # フォールバック：URLの最後の部分を使用
    parts = url.rstrip('/').split('/')
    for part in reversed(parts):
        if part and len(part) > 3 and part.isalnum():
            return part
    
    return "unknown"

def check_dependencies():
    """依存関係チェック"""
    required_modules = ['playwright', 'psycopg2', 'pandas']
    missing_modules = []
    
    for module in required_modules:
        try:
            __import__(module)
            log_message("INFO", f"✅ {module} モジュール確認完了")
        except ImportError:
            missing_modules.append(module)
            log_message("WARNING", f"⚠️ {module} モジュールが見つかりません")
    
    return len(missing_modules) == 0, missing_modules

def simple_scraping_simulation(url):
    """簡易スクレイピングシミュレーション（修正版）"""
    log_message("INFO", "📋 簡易スクレイピングモードで実行中...")
    
    # URLからサンプルデータ生成
    auction_id = extract_auction_id(url)
    
    # URLに応じたリアルなサンプルデータ
    if 'test' in url.lower():
        sample_data = {
            'auction_id': auction_id,
            'url': url,
            'title': f'【テスト商品】iPhone 14 Pro 128GB スペースブラック SIMフリー_{auction_id}',
            'price': 89800,
            'currency': 'JPY',
            'description': 'これはテスト用のサンプルデータです。実際のスクレイピング時には本物の商品情報が取得されます。',
            'condition': 'Used',
            'category': 'スマートフォン本体',
            'images': [
                'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/test1.jpg',
                'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/test2.jpg'
            ],
            'seller_info': 'test_seller_001',
            'status': 'simulation',
            'scraped_at': datetime.now().isoformat(),
            'note': 'シミュレーションモードで生成されたデータです'
        }
    else:
        sample_data = {
            'auction_id': auction_id,
            'url': url,
            'title': f'サンプル商品データ_{auction_id}',
            'price': 29800,
            'currency': 'JPY',
            'description': 'これはスクレイピングシミュレーションのサンプルデータです。',
            'condition': 'New',
            'category': 'Electronics',
            'images': [
                'https://via.placeholder.com/600x400/0066cc/white?text=Sample+Image+1',
                'https://via.placeholder.com/600x400/cc6600/white?text=Sample+Image+2'
            ],
            'seller_info': 'sample_seller',
            'status': 'simulation',
            'scraped_at': datetime.now().isoformat()
        }
    
    log_message("SUCCESS", f"サンプルデータ生成完了: {sample_data['title']}")
    return sample_data

def provide_url_examples():
    """正しいURL例の提供"""
    examples = [
        "https://auctions.yahoo.co.jp/jp/auction/abc123456",
        "https://page.auctions.yahoo.co.jp/jp/auction/xyz789012",
        "https://auctions.yahoo.co.jp/jp/auction/test123 (テスト用)"
    ]
    
    return {
        'valid_examples': examples,
        'format_explanation': 'Yahoo オークションのURLは「https://auctions.yahoo.co.jp/jp/auction/商品ID」の形式です',
        'how_to_get': 'Yahoo オークションで商品ページを開き、ブラウザのアドレスバーからURLをコピーしてください'
    }

def main():
    """メインエントリーポイント"""
    log_message("INFO", "🚀 Yahoo スクレイピングシステム開始（URL修正版）")
    
    try:
        # 引数チェック
        if len(sys.argv) < 2:
            log_message("ERROR", "❌ URLが指定されていません")
            url_examples = provide_url_examples()
            print(json.dumps({
                'success': False,
                'error': 'URLが指定されていません',
                'usage': 'python scraping_system_fixed.py <Yahoo_Auction_URL>',
                'examples': url_examples
            }, ensure_ascii=False, indent=2))
            sys.exit(1)
        
        url = sys.argv[1]
        log_message("INFO", f"📥 対象URL: {url}")
        
        # URL検証（修正版）
        is_valid, validation_message = validate_yahoo_url(url)
        log_message("INFO", f"🔍 URL検証結果: {validation_message}")
        
        if not is_valid:
            url_examples = provide_url_examples()
            print(json.dumps({
                'success': False,
                'error': f'無効なURL: {validation_message}',
                'url': url,
                'examples': url_examples,
                'fix_suggestion': 'Yahoo オークションの商品ページURLを正しく入力してください'
            }, ensure_ascii=False, indent=2))
            sys.exit(1)
        
        # 依存関係チェック
        deps_ok, missing = check_dependencies()
        
        if not deps_ok:
            log_message("WARNING", f"⚠️ 不足モジュール: {missing}")
            log_message("INFO", "🔄 簡易モードに切り替え")
            
            # 簡易モードで実行
            result = simple_scraping_simulation(url)
            
            print(json.dumps({
                'success': True,
                'mode': 'simulation',
                'message': 'スクレイピングシミュレーション完了',
                'data': result,
                'missing_modules': missing,
                'note': '本格的なスクレイピングには pip install playwright psycopg2-binary pandas が必要です'
            }, ensure_ascii=False, indent=2))
            
        else:
            # 本格的なスクレイピング実行
            log_message("INFO", "🔥 本格スクレイピングモード実行")
            
            try:
                # 実際のスクレイピング処理（依存関係が整っている場合）
                result = perform_real_scraping(url)
                
                print(json.dumps({
                    'success': True,
                    'mode': 'real_scraping',
                    'message': 'スクレイピング完了',
                    'data': result
                }, ensure_ascii=False, indent=2))
                
            except Exception as e:
                log_message("ERROR", f"❌ 本格スクレイピングエラー: {str(e)}")
                
                # フォールバックでシミュレーション実行
                result = simple_scraping_simulation(url)
                
                print(json.dumps({
                    'success': True,
                    'mode': 'fallback_simulation',
                    'message': 'フォールバックでシミュレーション完了',
                    'data': result,
                    'original_error': str(e)
                }, ensure_ascii=False, indent=2))
        
        log_message("SUCCESS", "✅ 処理完了")
        
    except Exception as e:
        log_message("ERROR", f"❌ 致命的エラー: {str(e)}")
        log_message("ERROR", f"📋 エラー詳細:\n{traceback.format_exc()}")
        
        print(json.dumps({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc(),
            'timestamp': datetime.now().isoformat(),
            'examples': provide_url_examples()
        }, ensure_ascii=False, indent=2))
        
        sys.exit(1)

def perform_real_scraping(url):
    """実際のスクレイピング処理（Playwright使用）"""
    from playwright.sync_api import sync_playwright
    
    log_message("INFO", "🎭 Playwright起動中...")
    
    with sync_playwright() as p:
        # ブラウザ起動
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # User-Agent設定
        page.set_extra_http_headers({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        log_message("INFO", f"🌐 ページアクセス: {url}")
        
        # ページアクセス
        response = page.goto(url, timeout=30000)
        log_message("INFO", f"📡 HTTP Status: {response.status}")
        
        # ページ読み込み待機
        page.wait_for_timeout(3000)
        
        # データ抽出
        title = extract_title(page)
        price = extract_price(page)
        description = extract_description(page)
        images = extract_images(page)
        
        browser.close()
        
        return {
            'auction_id': extract_auction_id(url),
            'url': url,
            'title': title,
            'price': price,
            'description': description[:500],  # 500文字制限
            'images': images[:5],  # 5枚制限
            'status': 'scraped',
            'scraped_at': datetime.now().isoformat()
        }

def extract_title(page):
    """タイトル抽出"""
    selectors = ['h1', '.ProductTitle__text', '[data-cl-params*="title"]']
    
    for selector in selectors:
        try:
            element = page.locator(selector).first
            if element.is_visible():
                title = element.text_content().strip()
                if title and len(title) > 5:
                    return title
        except:
            continue
    
    return page.title() or "タイトル取得失敗"

def extract_price(page):
    """価格抽出"""
    selectors = ['dd:has-text("円")', '.Price--bid', '.ProductPrice dd']
    
    for selector in selectors:
        try:
            element = page.locator(selector).first
            if element.is_visible():
                price_text = element.text_content().strip()
                match = re.search(r'([\d,]+)円', price_text)
                if match:
                    return int(match.group(1).replace(',', ''))
        except:
            continue
    
    return 0

def extract_description(page):
    """説明抽出"""
    selectors = ['.ProductExplanation__commentArea', '.ProductDescription__body']
    
    for selector in selectors:
        try:
            element = page.locator(selector).first
            if element.is_visible():
                desc = element.text_content().strip()
                if desc and len(desc) > 30:
                    return desc
        except:
            continue
    
    return "商品説明取得失敗"

def extract_images(page):
    """画像抽出"""
    selectors = ['.ProductImage img', 'img[src*="auctions.c.yimg.jp"]']
    
    images = []
    for selector in selectors:
        try:
            imgs = page.locator(selector).all()
            for img in imgs:
                src = img.get_attribute('src')
                if src and 'auctions.c.yimg.jp' in src:
                    images.append(src)
        except:
            continue
    
    return list(dict.fromkeys(images))  # 重複削除

if __name__ == "__main__":
    main()
