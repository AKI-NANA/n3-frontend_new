import requests
import json
import time

# --- 設定（実際の値に置き換えてください） ---
# Shopifyストアの接続情報
SHOPIFY_STORE_NAME = "your-store-name"  # 例: 'my-awesome-shop'
SHOPIFY_API_KEY = "" # 実際のAPIキーまたはトークン
SHOPIFY_BLOG_ID = "123456789" # 投稿先のブログID (例: 123456789)

# Gemini API情報 (環境変数などから取得を推奨)
GEMINI_API_KEY = "" # 実際のGemini APIキー

# --- ユーティリティ関数 ---

def get_product_data():
    """
    Shopify APIから特定の商品データを取得する処理をシミュレートします。
    実際にはここでShopify Admin APIを呼び出します。
    """
    print("--- 1. Shopifyから商品データを取得（シミュレーション） ---")
    
    # 実際の商品データを模した架空のデータ
    product_data = {
        "id": 87654321,
        "title": "究極のワイヤレスノイズキャンセリングヘッドホン Z-Pro",
        "handle": "z-pro-wireless-headphones",
        "product_type": "オーディオ機器",
        "tags": ["ノイズキャンセリング", "ワイヤレス", "高音質", "長時間バッテリー", "テレワーク"],
        "description": "最先端のノイズキャンセリング技術を搭載。1回の充電で60時間の連続再生が可能。人間工学に基づいた設計で長時間使用しても疲れない。深みのある低音とクリアな高音域を実現したプレミアムモデル。",
        "price": "39800",
        "vendor": "オーディオテック・ジャパン"
    }
    
    print(f"取得した商品: {product_data['title']}")
    return product_data

def generate_blog_content_with_gemini(product_data):
    """
    Gemini APIを使用してブログ記事のタイトルと本文を生成します。
    ここでは、JSON形式で結果を返すように構造化出力を利用します。
    """
    print("\n--- 2. Gemini APIでブログ記事コンテンツを生成 ---")
    
    # システムプロンプト：AIの役割と出力形式を定義
    system_prompt = (
        "あなたはプロのSEOライター兼商品紹介エキスパートです。"
        "提供された商品データに基づき、検索エンジンで上位表示されやすく、かつ読者の購買意欲を高める魅力的なブログ記事を作成してください。"
        "出力は必ずJSON形式で、以下のスキーマに従ってください。"
    )

    # ユーザープロンプト：具体的なタスクとデータ
    user_query = f"""
    以下のShopifyの商品データを使用して、SEOを意識したブログ記事を生成してください。
    
    ターゲットキーワード: 「ノイズキャンセリングヘッドホン おすすめ」「テレワーク 集中」
    読者ターゲット: 30代のビジネスパーソン、音楽愛好家
    記事のトーン: 信頼感のある、技術的な詳細も交えた情熱的なトーン。
    
    --- 商品データ ---
    商品名: {product_data['title']}
    商品の特徴: {product_data['description']}
    価格: {product_data['price']}円
    タグ: {', '.join(product_data['tags'])}
    """
    
    # APIのURLとキー
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={GEMINI_API_KEY}"
    
    # 構造化出力のためのJSONスキーマを定義
    response_schema = {
        "type": "OBJECT",
        "properties": {
            "title": { "type": "STRING", "description": "SEOに最適化されたブログ記事のタイトル（50文字以内）" },
            "body_html": { "type": "STRING", "description": "Shopifyのブログ本文（HTML形式）。小見出し、太字、リストタグ（ul/li）を適切に利用してください。本文は1000文字以上2000文字未満にしてください。" },
            "excerpt": { "type": "STRING", "description": "記事の抜粋、メタディスクリプションとして使用（150文字以内）" },
            "tags": { "type": "STRING", "description": "Shopifyブログ記事に設定するタグ。商品タグとターゲットキーワードを含むカンマ区切りの文字列" }
        },
        "required": ["title", "body_html", "excerpt", "tags"]
    }
    
    payload = {
        "contents": [{ "parts": [{ "text": user_query }] }],
        "systemInstruction": { "parts": [{ "text": system_prompt }] },
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": response_schema
        },
        # Google Search Groundingを使用して、最新のトレンドを反映させる
        "tools": [{ "google_search": {} }], 
    }

    try:
        response = requests.post(
            api_url, 
            headers={'Content-Type': 'application/json'}, 
            data=json.dumps(payload),
            timeout=30 # タイムアウト設定
        )
        response.raise_for_status() # HTTPエラーが発生した場合に例外を発生させる
        
        result = response.json()
        
        # 構造化JSONテキストの抽出とパース
        json_text = result['candidates'][0]['content']['parts'][0]['text']
        blog_content = json.loads(json_text)
        
        print(f"✅ 記事生成完了。タイトル: {blog_content['title']}")
        print(f"生成された本文の文字数: {len(blog_content['body_html'])}")
        return blog_content
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Gemini API呼び出しエラー: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ JSONパースエラー: {e}")
        print(f"受信したテキスト: {json_text}")
        return None

def create_shopify_article_payload(blog_content):
    """
    生成されたコンテンツをShopify Admin APIの要求形式にマッピングします。
    """
    print("\n--- 3. Shopify投稿用ペイロードを作成 ---")
    
    # Shopify Admin API (REST) のブログ記事作成エンドポイントのペイロード構造
    shopify_payload = {
        "article": {
            "title": blog_content['title'],
            "body_html": blog_content['body_html'],
            "author": "AIライター・太郎", # 記事の著者
            "tags": blog_content['tags'], # カンマ区切りのタグ
            "blog_id": SHOPIFY_BLOG_ID,
            "published": True, # すぐに公開
            "metafields": [
                {
                    "key": "meta_description",
                    "value": blog_content['excerpt'],
                    "type": "single_line_text_field",
                    "namespace": "seo"
                }
            ]
            # 実際のShopify連携では、画像（featured_image）の処理もここで行う必要があります。
        }
    }
    
    print("ペイロード構造の準備完了。")
    return shopify_payload

def post_article_to_shopify(shopify_payload):
    """
    Shopify APIへブログ記事を投稿する処理をシミュレートします。
    実際にはこの関数内でPOSTリクエストを送信します。
    """
    print("\n--- 4. Shopify Admin APIへ記事をPOST（シミュレーション） ---")
    
    if not SHOPIFY_API_KEY:
        print("🛑 エラー: SHOPIFY_API_KEYが設定されていません。投稿をスキップします。")
        return False
    
    # 実際のAPIエンドポイント
    # api_url = f"https://{SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2024-07/blogs/{SHOPIFY_BLOG_ID}/articles.json"
    
    # 実際のリクエスト処理（認証ヘッダーが必要です）
    # headers = {
    #     "X-Shopify-Access-Token": SHOPIFY_API_KEY,
    #     "Content-Type": "application/json"
    # }
    
    # try:
    #     response = requests.post(api_url, headers=headers, data=json.dumps(shopify_payload))
    #     response.raise_for_status()
    #     
    #     posted_article = response.json()
    #     print(f"🎉 記事投稿成功！Shopify記事ID: {posted_article['article']['id']}")
    #     return True
    # except requests.exceptions.RequestException as e:
    #     print(f"❌ Shopify API投稿エラー: {e}")
    #     print(f"応答ステータス: {response.status_code}, エラー内容: {response.text}")
    #     return False
    
    print("（APIキーが設定されていないため、投稿はスキップされましたが、以下のペイロードがShopifyへ送信されます）")
    print(json.dumps(shopify_payload, indent=2, ensure_ascii=False))
    print("シミュレーション完了。")
    return True


# --- メイン実行フロー ---

def run_auto_post_workflow():
    """
    自動投稿の一連のワークフローを実行します。
    """
    # 1. 商品データの取得
    product_data = get_product_data()
    if not product_data:
        print("ワークフロー中断: 商品データを取得できませんでした。")
        return

    # 2. AIによるブログコンテンツの生成
    if not GEMINI_API_KEY:
        print("\n🛑 エラー: GEMINI_API_KEYが設定されていません。AI生成をスキップします。")
        print("Gemini APIキーを設定してから再度実行してください。")
        return
        
    blog_content = generate_blog_content_with_gemini(product_data)
    if not blog_content:
        print("ワークフロー中断: AIによる記事生成に失敗しました。")
        return

    # 3. Shopify投稿用ペイロードの作成
    shopify_payload = create_shopify_article_payload(blog_content)

    # 4. Shopifyへの記事投稿（シミュレーション）
    post_article_to_shopify(shopify_payload)
    
    print("\n✅ 自動ブログ投稿ワークフローの実行を完了しました。")


# 実行
if __name__ == "__main__":
    run_auto_post_workflow()
