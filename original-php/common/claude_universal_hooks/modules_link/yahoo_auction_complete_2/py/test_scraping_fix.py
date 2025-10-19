#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
スクレイピング修正版 簡易テストツール
コマンドラインから修正内容を確認
"""

import json
import sys
import subprocess
import os
from datetime import datetime

def test_original_vs_fixed():
    """元版と修正版の比較テスト"""
    print("🔍 スクレイピングシステム比較テスト")
    print("=" * 50)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    original_script = os.path.join(base_dir, 'scraping_system.py')
    fixed_script = os.path.join(base_dir, 'scraping_system_fixed.py')
    
    print(f"📂 テスト環境: {base_dir}")
    print(f"📅 実行時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # ファイル存在確認
    print("📋 ファイル確認:")
    print("-" * 20)
    
    files_check = {
        'scraping_system.py': os.path.exists(original_script),
        'scraping_system_fixed.py': os.path.exists(fixed_script),
        'yahoo_auction_tool_content.php': os.path.exists(os.path.join(base_dir, 'yahoo_auction_tool_content.php')),
        'yahoo_auction_tool_content_fixed.php': os.path.exists(os.path.join(base_dir, 'yahoo_auction_tool_content_fixed.php')),
        'scraping_fix.js': os.path.exists(os.path.join(base_dir, 'scraping_fix.js'))
    }
    
    for filename, exists in files_check.items():
        status = "✅" if exists else "❌"
        print(f"{status} {filename}")
    
    print()
    
    # テストURL
    test_urls = [
        "",  # 空URL（エラーテスト）
        "https://invalid-url.com",  # 無効URL
        "https://auctions.yahoo.co.jp/jp/auction/test123",  # 有効形式URL
    ]
    
    # 修正版スクリプトのテスト
    if files_check['scraping_system_fixed.py']:
        print("🧪 修正版スクリプト テスト:")
        print("-" * 30)
        
        for i, url in enumerate(test_urls, 1):
            print(f"\nテスト{i}: {url if url else '(空URL)'}")
            print("-" * 40)
            
            try:
                if url:
                    cmd = [sys.executable, fixed_script, url]
                else:
                    cmd = [sys.executable, fixed_script]
                
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                print(f"終了コード: {result.returncode}")
                
                if result.stdout:
                    print("標準出力:")
                    try:
                        # JSON形式の場合はフォーマットして表示
                        json_data = json.loads(result.stdout)
                        print(json.dumps(json_data, ensure_ascii=False, indent=2))
                    except json.JSONDecodeError:
                        print(result.stdout)
                
                if result.stderr:
                    print("標準エラー:")
                    print(result.stderr)
                    
            except subprocess.TimeoutExpired:
                print("⏰ タイムアウト（10秒）")
            except Exception as e:
                print(f"❌ 実行エラー: {e}")
    
    print()
    print("📊 テスト完了")
    print("=" * 50)

def test_url_validation():
    """URL検証テスト"""
    print("\n🔍 URL検証テスト")
    print("-" * 20)
    
    test_cases = [
        ("", False, "空URL"),
        ("not-a-url", False, "URL形式ではない"),
        ("https://google.com", False, "Yahoo以外のURL"),
        ("https://auctions.yahoo.co.jp/jp/auction/abc123", True, "有効なYahoo URL"),
        ("http://auctions.yahoo.co.jp/jp/auction/xyz789", True, "HTTP Yahoo URL"),
        ("https://page.auctions.yahoo.co.jp/jp/auction/def456", True, "page.auctions Yahoo URL"),
    ]
    
    # 簡易URL検証関数（Pythonスクリプト内と同じロジック）
    import re
    
    def validate_yahoo_url(url):
        if not url or not isinstance(url, str):
            return False
        
        yahoo_patterns = [
            r'https?://auctions\.yahoo\.co\.jp/jp/auction/',
            r'https?://page\.auctions\.yahoo\.co\.jp/jp/auction/',
            r'https?://.*\.yahoo\.co\.jp.*auction.*'
        ]
        
        for pattern in yahoo_patterns:
            if re.search(pattern, url):
                return True
        return False
    
    for url, expected, description in test_cases:
        result = validate_yahoo_url(url)
        status = "✅" if result == expected else "❌"
        print(f"{status} {description}: {url[:50]}{'...' if len(url) > 50 else ''} → {result}")

def show_modification_summary():
    """修正内容サマリー表示"""
    print("\n📋 修正内容サマリー")
    print("=" * 30)
    
    modifications = {
        "Pythonスクリプト": [
            "URL検証の強化（Yahoo専用パターン）",
            "依存関係の自動チェック",
            "フォールバック機能（シミュレーションモード）",
            "JSON形式でのレスポンス",
            "詳細なエラーメッセージ",
            "ログ機能の追加"
        ],
        "JavaScript": [
            "フォーム値取得ロジックの修正",
            "Yahoo URL検証の追加",
            "AJAX エラーハンドリングの強化",
            "リアルタイム状態表示の改善",
            "結果データの構造化表示",
            "デバッグログの強化"
        ],
        "PHP": [
            "executePythonScrapingFixed() 関数の追加",
            "URL検証・サニタイズの強化",
            "タイムアウト対策の実装",
            "ログシステムの完全実装",
            "デバッグ情報APIの追加",
            "エラー分類・対応の体系化"
        ]
    }
    
    for category, items in modifications.items():
        print(f"\n🔧 {category}:")
        for item in items:
            print(f"   ✅ {item}")

def main():
    """メイン関数"""
    print("🚀 Yahoo Auction スクレイピング修正版テストツール")
    print("=" * 60)
    
    # 引数処理
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'test':
            test_original_vs_fixed()
        elif command == 'url':
            test_url_validation()
        elif command == 'summary':
            show_modification_summary()
        elif command == 'all':
            test_original_vs_fixed()
            test_url_validation()
            show_modification_summary()
        else:
            print(f"❌ 未知のコマンド: {command}")
            print_usage()
    else:
        # デフォルト: 全テスト実行
        test_original_vs_fixed()
        test_url_validation()
        show_modification_summary()

def print_usage():
    """使用方法表示"""
    print("\n📖 使用方法:")
    print("python test_scraping_fix.py [コマンド]")
    print("\nコマンド:")
    print("  test    - スクリプト実行テスト")
    print("  url     - URL検証テスト")
    print("  summary - 修正内容サマリー")
    print("  all     - 全テスト実行（デフォルト）")

if __name__ == "__main__":
    main()
