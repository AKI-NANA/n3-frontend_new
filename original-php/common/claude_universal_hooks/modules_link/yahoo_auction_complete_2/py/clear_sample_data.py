#!/usr/bin/env python3
"""
既存データベースのサンプルデータ削除スクリプト
"""

import sqlite3
import os

DATABASE_PATH = 'yahoo_ebay_workflow_enhanced.db'

def clear_sample_data():
    """サンプルデータをクリアして実際の取得データのみを残す"""
    
    if not os.path.exists(DATABASE_PATH):
        print("データベースファイルが見つかりません")
        return
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # サンプルデータ削除
    print("🗑️ サンプルデータを削除中...")
    
    # WORKING_とENHANCED_のサンプルデータを削除
    cursor.execute("DELETE FROM products_enhanced WHERE product_id LIKE 'WORKING_%'")
    working_deleted = cursor.rowcount
    
    cursor.execute("DELETE FROM products_enhanced WHERE product_id LIKE 'ENHANCED_%'")
    enhanced_deleted = cursor.rowcount
    
    # 実際に取得したデータの件数確認
    cursor.execute("SELECT COUNT(*) FROM products_enhanced")
    remaining_count = cursor.fetchone()[0]
    
    conn.commit()
    conn.close()
    
    print(f"✅ サンプルデータ削除完了:")
    print(f"   WORKING_データ: {working_deleted}件削除")
    print(f"   ENHANCED_データ: {enhanced_deleted}件削除")
    print(f"   残存データ: {remaining_count}件（実際の取得データ）")
    
    if remaining_count == 0:
        print("📝 現在データベースは空です。実際のスクレイピングでデータを取得してください。")
    
    return remaining_count

if __name__ == '__main__':
    clear_sample_data()
