import sqlite3
import pandas as pd
import webbrowser

def generate_html_report():
    """
    auctions.dbからデータを読み込み、HTMLレポートとして出力する
    """
    try:
        # データベースに接続
        conn = sqlite3.connect("auctions.db")
        
        # SQLクエリを使ってテーブルのデータをすべて読み込む
        df = pd.read_sql_query("SELECT * FROM auctions", conn)
        
        # データベースの接続を閉じる
        conn.close()

        if df.empty:
            print("❌ データベースにデータが見つかりませんでした。")
            return
        
        # データフレームをHTMLテーブルに変換
        # Tailwind CSSのクラスを追加してテーブルをスタイリング
        html_table = df.to_html(classes="table-auto w-full text-left whitespace-no-wrap bg-white rounded-lg shadow overflow-hidden")
        
        # HTMLページの全体を構築
        html_content = f"""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ヤフオク スクレイピング結果</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {{
            background-color: #f3f4f6;
            font-family: 'Inter', sans-serif;
        }}
    </style>
</head>
<body class="p-6">
    <div class="max-w-7xl mx-auto p-4 bg-white rounded-lg shadow-xl">
        <h1 class="text-3xl font-bold mb-6 text-center text-gray-800">ヤフオク スクレイピング結果</h1>
        <div class="overflow-x-auto">
            {html_table}
        </div>
    </div>
</body>
</html>
"""
        
        # HTMLファイルに書き込み
        with open("auctions_data.html", "w", encoding="utf-8") as f:
            f.write(html_content)
        
        print("✅ HTMLファイルが生成されました: auctions_data.html")
        
        # ブラウザで自動的に開く
        webbrowser.open("auctions_data.html")

    except sqlite3.Error as e:
        print(f"❌ データベースエラーが発生しました: {e}")

if __name__ == "__main__":
    generate_html_report()
