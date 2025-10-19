import sqlite3
import pandas as pd

def view_data():
    """
    auctions.dbからデータを読み込み、表示する
    """
    try:
        # データベースに接続
        conn = sqlite3.connect("auctions.db")

        # SQLクエリを使ってテーブルのデータをすべて読み込む
        df = pd.read_sql_query("SELECT * FROM auctions", conn)

        # データベースの接続を閉じる
        conn.close()

        # データフレームを表示
        if not df.empty:
            print("✅ データベースに保存されているデータです：")
            print(df)
        else:
            print("❌ データベースにデータが見つかりませんでした。")

    except sqlite3.Error as e:
        print(f"❌ データベースエラーが発生しました: {e}")

if __name__ == "__main__":
    view_data()
