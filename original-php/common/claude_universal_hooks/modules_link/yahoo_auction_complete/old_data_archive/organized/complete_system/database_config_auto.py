#!/usr/bin/env python3
"""
自動データベース設定検出
"""

import os
import psycopg2

def get_database_config():
    """利用可能なデータベース設定を自動検出"""
    
    # 試行する設定パターン
    configs = [
        # 標準設定
        {
            'host': 'localhost',
            'database': 'nagano3_db',
            'user': 'nagano3_user',
            'password': 'secure_password_2025'
        },
        # 現在のユーザー名使用
        {
            'host': 'localhost',
            'database': 'nagano3_db',
            'user': 'aritahiroaki',
            'password': ''
        },
        # デフォルトPostgreSQL
        {
            'host': 'localhost',
            'database': 'postgres',
            'user': 'aritahiroaki',
            'password': ''
        },
        # postgresユーザー
        {
            'host': 'localhost',
            'database': 'postgres',
            'user': 'postgres',
            'password': ''
        }
    ]
    
    for config in configs:
        try:
            conn = psycopg2.connect(**config)
            cursor = conn.cursor()
            cursor.execute('SELECT 1')
            cursor.close()
            conn.close()
            print(f"✅ データベース接続成功: {config}")
            return config
        except Exception as e:
            print(f"❌ 接続失敗 {config['user']}@{config['database']}: {e}")
            continue
    
    return None

if __name__ == '__main__':
    config = get_database_config()
    if config:
        print("🎉 利用可能なデータベース設定を発見!")
        import json
        print(json.dumps(config, indent=2))
    else:
        print("❌ 利用可能なデータベース設定が見つかりません")
