#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
データベース診断・修正スクリプト
"""

import sqlite3
import json
import time
from pathlib import Path

def diagnose_and_fix_database():
    """データベースの診断と修正"""
    
    print("🔍 データベース診断開始...")
    
    base_dir = Path(__file__).parent
    data_dir = base_dir / "yahoo_ebay_data"
    shipping_dir = base_dir / "shipping_calculation"
    
    # ディレクトリ作成
    data_dir.mkdir(exist_ok=True)
    shipping_dir.mkdir(exist_ok=True)
    
    db_path = data_dir / "integrated_data.db"
    shipping_db_path = shipping_dir / "shipping_rules.db"
    
    results = {
        'main_db_status': 'unknown',
        'shipping_db_status': 'unknown',
        'sample_data_created': False,
        'shipping_data_created': False
    }
    
    # 1. メインデータベース診断・修正
    print("\n📊 メインデータベース診断...")
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # テーブル存在確認
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"既存テーブル: {[table[0] for table in tables]}")
        
        # products テーブル作成・確認
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title_jp TEXT,
                title_en TEXT,
                price_jpy REAL,
                price_usd REAL,
                source_url TEXT,
                image_url TEXT,
                description_jp TEXT,
                description_en TEXT,
                category_id TEXT,
                condition_text TEXT,
                weight_kg REAL,
                shipping_cost_usd REAL,
                profit_usd REAL,
                status TEXT DEFAULT 'scraped',
                scraped_at TEXT,
                updated_at TEXT
            )
        ''')
        
        # 送料計算履歴テーブル
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS shipping_calculations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                weight_kg REAL,
                destination TEXT,
                service_type TEXT,
                cost_usd REAL,
                calculated_at TEXT
            )
        ''')
        
        # データ確認
        cursor.execute('SELECT COUNT(*) FROM products')
        product_count = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM shipping_calculations')
        shipping_count = cursor.fetchone()[0]
        
        print(f"商品データ: {product_count}件")
        print(f"送料計算履歴: {shipping_count}件")
        
        # サンプルデータ投入（データが少ない場合）
        if product_count < 10:
            print("📦 サンプルデータ投入中...")
            sample_products = [
                ('任天堂 Switch 本体', 'Nintendo Switch Console', 35000, 235.5, 'https://auctions.yahoo.co.jp/sample1', '', 'ゲーム機本体です', '', '139973', 'used', 1.2, 25.0, 50.0, 'scraped', time.strftime('%Y-%m-%d %H:%M:%S'), ''),
                ('iPhone 14 Pro 128GB', 'iPhone 14 Pro 128GB', 120000, 808.1, 'https://auctions.yahoo.co.jp/sample2', '', 'スマートフォン', '', '58058', 'like-new', 0.2, 22.0, 80.0, 'calculated', time.strftime('%Y-%m-%d %H:%M:%S'), ''),
                ('ポケモンカード BOX', 'Pokemon Card Box', 8000, 53.9, 'https://auctions.yahoo.co.jp/sample3', '', 'トレーディングカード', '', '183454', 'new', 0.5, 18.0, 15.0, 'filtered', time.strftime('%Y-%m-%d %H:%M:%S'), ''),
                ('ソニー α7 III', 'Sony Alpha 7 III Camera', 180000, 1212.1, 'https://auctions.yahoo.co.jp/sample4', '', 'ミラーレスカメラ', '', '625', 'excellent', 1.8, 35.0, 150.0, 'ready', time.strftime('%Y-%m-%d %H:%M:%S'), ''),
                ('セイコー腕時計', 'Seiko Watch', 45000, 303.0, 'https://auctions.yahoo.co.jp/sample5', '', 'メンズ腕時計', '', '31387', 'good', 0.3, 20.0, 40.0, 'listed', time.strftime('%Y-%m-%d %H:%M:%S'), '')
            ]
            
            cursor.executemany('''
                INSERT INTO products (
                    title_jp, title_en, price_jpy, price_usd, source_url, image_url,
                    description_jp, description_en, category_id, condition_text,
                    weight_kg, shipping_cost_usd, profit_usd, status, scraped_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', sample_products)
            
            results['sample_data_created'] = True
            print(f"✅ {len(sample_products)}件のサンプルデータを投入しました")
        
        conn.commit()
        conn.close()
        results['main_db_status'] = 'ok'
        print("✅ メインデータベース: 正常")
        
    except Exception as e:
        print(f"❌ メインデータベースエラー: {e}")
        results['main_db_status'] = f'error: {e}'
    
    # 2. 送料データベース診断・修正
    print("\n🚛 送料データベース診断...")
    try:
        conn = sqlite3.connect(str(shipping_db_path))
        cursor = conn.cursor()
        
        # 送料テーブル作成
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS shipping_rates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                country_code TEXT,
                service_type TEXT,
                base_rate REAL,
                per_kg_rate REAL,
                max_weight_kg REAL,
                created_at TEXT
            )
        ''')
        
        # データ確認
        cursor.execute('SELECT COUNT(*) FROM shipping_rates')
        rate_count = cursor.fetchone()[0]
        
        print(f"送料レコード: {rate_count}件")
        
        # 送料データ投入（データが少ない場合）
        if rate_count < 10:
            print("📦 送料データ投入中...")
            shipping_rates = [
                ('USA', 'economy', 25.0, 8.0, 30.0, time.strftime('%Y-%m-%d %H:%M:%S')),
                ('USA', 'priority', 35.0, 10.0, 30.0, time.strftime('%Y-%m-%d %H:%M:%S')),
                ('USA', 'express', 45.0, 12.0, 30.0, time.strftime('%Y-%m-%d %H:%M:%S')),
                ('CAN', 'economy', 30.0, 8.0, 30.0, time.strftime('%Y-%m-%d %H:%M:%S')),
                ('CAN', 'priority', 40.0, 10.0, 30.0, time.strftime('%Y-%m-%d %H:%M:%S')),
                ('GBR', 'economy', 35.0, 8.0, 30.0, time.strftime('%Y-%m-%d %H:%M:%S')),
                ('GBR', 'priority', 45.0, 10.0, 30.0, time.strftime('%Y-%m-%d %H:%M:%S')),
                ('DEU', 'economy', 35.0, 8.0, 30.0, time.strftime('%Y-%m-%d %H:%M:%S')),
                ('AUS', 'economy', 40.0, 8.0, 30.0, time.strftime('%Y-%m-%d %H:%M:%S')),
                ('KOR', 'economy', 22.0, 8.0, 30.0, time.strftime('%Y-%m-%d %H:%M:%S'))
            ]
            
            cursor.executemany('''
                INSERT INTO shipping_rates (
                    country_code, service_type, base_rate, per_kg_rate, max_weight_kg, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', shipping_rates)
            
            results['shipping_data_created'] = True
            print(f"✅ {len(shipping_rates)}件の送料データを投入しました")
        
        conn.commit()
        conn.close()
        results['shipping_db_status'] = 'ok'
        print("✅ 送料データベース: 正常")
        
    except Exception as e:
        print(f"❌ 送料データベースエラー: {e}")
        results['shipping_db_status'] = f'error: {e}'
    
    # 結果出力
    print("\n" + "="*50)
    print("🎯 診断結果サマリー")
    print("="*50)
    print(f"メインDB: {results['main_db_status']}")
    print(f"送料DB: {results['shipping_db_status']}")
    print(f"サンプルデータ作成: {'✅' if results['sample_data_created'] else '⏸️'}")
    print(f"送料データ作成: {'✅' if results['shipping_data_created'] else '⏸️'}")
    
    if results['main_db_status'] == 'ok' and results['shipping_db_status'] == 'ok':
        print("\n🎉 データベース修復完了！")
        print("APIサーバーを再起動してください：")
        print("python3 integrated_api_server.py")
    else:
        print("\n⚠️ 一部エラーがあります。ログを確認してください。")
    
    # 設定ファイル出力
    config = {
        'database_path': str(db_path),
        'shipping_db_path': str(shipping_db_path),
        'last_check': time.strftime('%Y-%m-%d %H:%M:%S'),
        'status': results
    }
    
    config_path = base_dir / 'database_status.json'
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 設定ファイル作成: {config_path}")

if __name__ == '__main__':
    diagnose_and_fix_database()
