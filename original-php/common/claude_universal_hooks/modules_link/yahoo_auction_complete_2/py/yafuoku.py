# -*- coding: utf-8 -*-

"""
このスクリプトは、スクレイピングで取得した在庫データの推奨される構造を定義します。
この構造により、他のプログラムやデータベースへの連携がスムーズになります。
"""

# 単一の商品のデータ構造
# 辞書（dictionary）を使用して、キーと値のペアでデータを整理します。
# キーはデータの種類を、値は実際のデータを示します。
sample_product = {
    "sku": "ITEM-12345",  # SKU（在庫管理単位）はユニークなIDです
    "product_name": "多機能スマートウォッチ", # 商品名
    "price": 9800.0, # 価格（浮動小数点数）
    "stock_status": "in_stock", # 在庫状態（文字列）
    "last_updated": "2023-10-27T10:30:00Z" # 最終更新日時（ISO 8601形式の文字列が推奨）
}

# 複数の商品のデータをリストにまとめます。
# これがスクレイピングから返されるデータの一般的な形式です。
scraped_inventory_data = [
    {
        "sku": "GADGET-001",
        "product_name": "ワイヤレスイヤホンX",
        "price": 5500.0,
        "stock_status": "in_stock",
        "last_updated": "2023-10-27T10:35:10Z"
    },
    {
        "sku": "BOOK-789",
        "product_name": "Python入門ガイド",
        "price": 2800.0,
        "stock_status": "out_of_stock",
        "last_updated": "2023-10-27T10:36:22Z"
    },
    {
        "sku": "TOOL-555",
        "product_name": "電動ドライバーセット",
        "price": 12000.0,
        "stock_status": "in_stock",
        "last_updated": "2023-10-27T10:37:05Z"
    }
]

def process_inventory_data(data_list):
    """
    構造化されたデータを処理する例です。
    """
    print("--- 取得した在庫データの処理を開始します ---")
    for product in data_list:
        print(f"SKU: {product['sku']}")
        print(f"商品名: {product['product_name']}")
        print(f"価格: {product['price']} 円")
        print(f"在庫状態: {product['stock_status']}")
        print(f"最終更新: {product['last_updated']}")
        print("-" * 20)

    print("--- 処理が完了しました ---")

# スクリプトが直接実行された場合に処理を実行
if __name__ == "__main__":
    process_inventory_data(scraped_inventory_data)
