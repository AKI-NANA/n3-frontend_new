import sqlite3

def create_and_insert_data():
    """データベースに接続し、テーブルを作成してデータを挿入する"""
    conn = None
    try:
        # データベースに接続（ファイルが存在しない場合は新しく作成される）
        conn = sqlite3.connect('database.db')
        print("✅ データベースに接続しました。")
        cursor = conn.cursor()

        # テーブルを作成（もし既に存在する場合は何もしない）
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                age INTEGER,
                city TEXT
            )
        ''')
        print("✅ テーブルを作成しました。")

        # 挿入するデータのリスト
        users_data = [
            ('アキコ', 30, '東京'),
            ('マサト', 25, '大阪'),
            ('ユウキ', 35, '福岡'),
            ('エミ', 28, '名古屋'),
            ('ケンジ', 45, '札幌')
        ]

        # データをテーブルに挿入（IDは自動的に割り当てられる）
        cursor.executemany("INSERT INTO users (name, age, city) VALUES (?, ?, ?)", users_data)
        
        # 変更をコミット
        conn.commit()
        print("✅ データを挿入しました。")
        
    except sqlite3.Error as e:
        print(f"❌ データベースエラーが発生しました: {e}")
    finally:
        if conn:
            conn.close()
            print("✅ データベースへの接続を閉じました。")

if __name__ == "__main__":
    create_and_insert_data()
