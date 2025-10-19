import sqlite3
import pandas as pd
import webbrowser
import os

def display_data_as_html():
    db_file = 'database.db' # ファイル名を 'database.db' に修正
    conn = None
    try:
        # データベースに接続
        conn = sqlite3.connect(db_file)
        print("✅ データベースに接続しました。")

        # データベースからデータを読み込み、DataFrameに変換
        # pandasのread_sql_queryは、指定されたクエリから直接DataFrameを作成します
        df = pd.read_sql_query("SELECT * FROM users", conn)

        # DataFrameをHTMLに変換
        # to_html()メソッドを使用して、HTMLテーブルを生成します
        # justify='center'は列ヘッダーを中央揃えにします
        html_output = f"""
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <title>ユーザーデータ</title>
            <style>
                body {{ font-family: sans-serif; margin: 2rem; background-color: #f7f7f7; }}
                h1 {{ color: #333; text-align: center; }}
                table {{ width: 80%; margin: 2rem auto; border-collapse: collapse; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
                th {{ background-color: #4CAF50; color: white; }}
                tr:nth-child(even) {{ background-color: #f2f2f2; }}
                tr:hover {{ background-color: #ddd; }}
            </style>
        </head>
        <body>
            <h1>ユーザーデータ</h1>
            {df.to_html(index=False)}
        </body>
        </html>
        """

        # HTMLファイルを生成して保存
        html_file = 'users_data.html'
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_output)
        print(f"✅ '{html_file}' を生成しました。")

        # デフォルトのWebブラウザでHTMLファイルを開く
        webbrowser.open('file://' + os.path.realpath(html_file))
        print("✅ ブラウザでHTMLファイルを開きました。")

    except sqlite3.Error as e:
        print(f"❌ データベースエラー: {e}")
        # エラーメッセージからテーブルが見つからないことを確認
        if "no such table" in str(e):
            print("❌ データベースにテーブルが見つかりません。'create_and_insert_data.py' を実行してテーブルを作成してください。")
    except pd.io.sql.DatabaseError as e:
        print(f"❌ DataFrameエラー: {e}")
        print("❌ データベースのテーブルに問題があるか、データがありません。")
    finally:
        if conn:
            conn.close()
            print("✅ データベースへの接続を閉じました。")

if __name__ == '__main__':
    display_data_as_html()
