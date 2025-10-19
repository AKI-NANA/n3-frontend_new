#!/bin/bash

# スクレイピングツール修正スクリプト
echo "🔧 Yahoo スクレイピングツール修正スクリプト"
echo "================================================"

# 現在のディレクトリ確認
echo "📍 現在のディレクトリ: $(pwd)"

# Python環境確認
echo "🐍 Python環境確認..."
python3 --version
pip3 --version

# 必要なパッケージをインストール
echo "📦 依存関係インストール中..."
pip3 install playwright==1.40.0
pip3 install psycopg2-binary==2.9.9
pip3 install pandas==2.1.4
pip3 install requests==2.31.0
pip3 install beautifulsoup4==4.12.2
pip3 install selenium==4.15.2

# Playwrightブラウザーインストール
echo "🌐 Playwrightブラウザーインストール中..."
playwright install

# PostgreSQL接続テスト用スクリプト作成
cat > ACTIVE_TOOLS/test_postgres_connection.py << 'EOF'
#!/usr/bin/env python3
import psycopg2
import sys

def test_connection():
    try:
        # 接続設定
        conn = psycopg2.connect(
            host='localhost',
            database='nagano3_db', 
            user='aritahiroaki',
            password='',
            port=5432
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        
        print("✅ PostgreSQL接続成功")
        print(f"📊 バージョン: {version[0]}")
        
        # テーブル存在確認
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'unified_scraped_ebay_products'
        """)
        
        if cursor.fetchone():
            print("✅ 統合テーブル確認済み")
        else:
            print("⚠️  統合テーブルが見つかりません")
            print("💡 データベースセットアップが必要です")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ PostgreSQL接続エラー: {e}")
        print("💡 PostgreSQLの起動状況とデータベース設定を確認してください")
        return False

if __name__ == "__main__":
    test_connection()
EOF

# テストスクリプトに実行権限付与
chmod +x ACTIVE_TOOLS/test_postgres_connection.py

# 簡易スクレイピングテスト用スクリプト作成
cat > ACTIVE_TOOLS/test_scraping_simple.py << 'EOF'
#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import time

def simple_test():
    """シンプルなスクレイピングテスト（Playwright不使用）"""
    print("🧪 シンプルスクレイピングテスト開始")
    
    try:
        # Yahoo Auctionsトップページにアクセス
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        
        response = requests.get('https://auctions.yahoo.co.jp/', headers=headers, timeout=10)
        
        if response.status_code == 200:
            print("✅ Yahoo Auctions接続成功")
            
            soup = BeautifulSoup(response.content, 'html.parser')
            title = soup.find('title')
            
            if title:
                print(f"📄 ページタイトル: {title.text}")
                print("✅ HTML解析成功")
            else:
                print("⚠️  タイトル取得失敗")
                
        else:
            print(f"❌ HTTP エラー: {response.status_code}")
            
    except Exception as e:
        print(f"❌ スクレイピングエラー: {e}")
        
    print("🧪 テスト完了")

if __name__ == "__main__":
    simple_test()
EOF

chmod +x ACTIVE_TOOLS/test_scraping_simple.py

echo ""
echo "🎯 修正完了！次のステップ:"
echo "1. PostgreSQL接続テスト:"
echo "   python3 ACTIVE_TOOLS/test_postgres_connection.py"
echo ""
echo "2. シンプルスクレイピングテスト:"
echo "   python3 ACTIVE_TOOLS/test_scraping_simple.py"
echo ""
echo "3. 統合ダッシュボードアクセス:"
echo "   http://localhost:8080/ACTIVE_TOOLS/main_dashboard.html"
echo ""
echo "✅ スクレイピングツール修正スクリプト実行完了"
