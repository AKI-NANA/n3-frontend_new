import sqlite3
import pandas as pd
import webbrowser
import os

def display_auction_data():
    db_file = 'auctions.db'
    conn = None
    try:
        # データベースに接続
        conn = sqlite3.connect(db_file)
        print("✅ データベースに接続しました。")

        # データベースからデータを読み込み、DataFrameに変換
        df = pd.read_sql_query("SELECT * FROM auctions", conn)

        # DataFrameをHTMLに変換
        html_output = f"""
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <title>ヤフオク検索結果</title>
            <style>
                body {{ font-family: sans-serif; margin: 2rem; background-color: #f7f7f7; }}
                h1 {{ color: #333; text-align: center; }}
                table {{ width: 90%; margin: 2rem auto; border-collapse: collapse; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
                th {{ background-color: #f0c14b; color: white; }}
                tr:nth-child(even) {{ background-color: #f2f2f2; }}
                tr:hover {{ background-color: #ddd; }}
            </style>
        </head>
        <body>
            <h1>ヤフオク検索結果</h1>
            {df.to_html(index=False)}
        </body>
        </html>
        """

        # HTMLファイルを生成して保存
        html_file = 'auctions_data.html'
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_output)
        print(f"✅ '{html_file}' を生成しました。")

        # デフォルトのWebブラウザでHTMLファイルを開く
        webbrowser.open('file://' + os.path.realpath(html_file))
        print("✅ ブラウザでHTMLファイルを開きました。")

    except sqlite3.Error as e:
        print(f"❌ データベースエラー: {e}")
        if "no such table" in str(e):
            print("❌ データベースにテーブルが見つかりません。'yahoo_auction_scraper.py' を実行してデータを取得してください。")
    except pd.io.sql.DatabaseError as e:
        print(f"❌ DataFrameエラー: {e}")
        print("❌ データベースのテーブルに問題があるか、データがありません。")
    finally:
        if conn:
            conn.close()
            print("✅ データベースへの接続を閉じました。")

if __name__ == '__main__':
    display_auction_data()
