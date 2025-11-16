import requests
import json
import time

# --- 設定（実際の値に置き換えてください） ---
GEMINI_API_KEY = "" # 実際のGemini APIキー

# 各SNSの接続情報 (シミュレーション用)
X_API_KEY = "YOUR_X_API_KEY"
INSTAGRAM_ACCESS_TOKEN = "YOUR_INSTAGRAM_ACCESS_TOKEN"

# --- 前回のブログ投稿後のデータを仮定 ---
# 実際には、このデータは前回の 'shopify_auto_post_simulator.py' から取得されます。
BLOG_ARTICLE_DATA = {
    "title": "【徹底レビュー】究極のワイヤレスノイズキャンセリングヘッドホン Z-Proで集中力を極限まで高める",
    "excerpt": "最先端のノイズキャンセリング技術を搭載したZ-Proヘッドホン。60時間の長時間再生と人間工学デザインで、ビジネスパーソンのテレワークを強力にサポート。詳細レビューはこちら。",
    "product_handle": "z-pro-wireless-headphones",
    "product_title": "究極のワイヤレスノイズキャンセリングヘッドホン Z-Pro",
    "price": "39800",
    "target_url": "https://your-store-name.myshopify.com/blogs/news/z-pro-wireless-headphones" # 投稿されたブログ記事のURL
}

# --- ユーティリティ関数 ---

def generate_sns_contents(blog_data):
    """
    Gemini APIを使用してXとInstagram用の投稿コンテンツを生成します。
    """
    print("--- 1. Gemini APIでSNSコンテンツを生成 ---")
    
    # システムプロンプト：AIの役割と出力形式を定義
    system_prompt = (
        "あなたはプロのソーシャルメディアマーケターです。提供されたブログ記事データに基づき、"
        "各SNSプラットフォームの特性（文字数、ハッシュタグ文化）に最適化された投稿文を生成してください。"
        "出力は必ずJSON形式で、以下のスキーマに従ってください。"
    )

    # ユーザープロンプト：具体的なタスクとデータ
    user_query = f"""
    以下のブログ記事のプロモーション投稿を生成してください。
    
    ターゲット: X (Twitter) と Instagram の両方
    投稿の目的: ブログ記事（商品）へのトラフィック誘導とエンゲージメントの獲得
    記事URL: {blog_data['target_url']}
    
    --- ブログ記事概要 ---
    記事タイトル: {blog_data['title']}
    記事抜粋: {blog_data['excerpt']}
    商品名: {blog_data['product_title']}
    価格: {blog_data['price']}円
    """
    
    # APIのURLとキー
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={GEMINI_API_KEY}"
    
    # 構造化出力のためのJSONスキーマを定義
    response_schema = {
        "type": "OBJECT",
        "properties": {
            "x_post": {
                "type": "OBJECT",
                "description": "X (Twitter) 向けの投稿内容",
                "properties": {
                    "text": { "type": "STRING", "description": "投稿文（URLとハッシュタグを含めて140文字以内に収めること）" },
                }
            },
            "instagram_post": {
                "type": "OBJECT",
                "description": "Instagram 向けの投稿内容",
                "properties": {
                    "caption": { "type": "STRING", "description": "キャプション（詳細な説明文と、最後にCTAとして「続きはプロフィールリンクから」を追記。絵文字を効果的に使用すること）" },
                    "hashtags": { "type": "ARRAY", "items": { "type": "STRING" }, "description": "Instagramで効果的なハッシュタグ（10〜15個）" }
                }
            }
        },
        "required": ["x_post", "instagram_post"]
    }
    
    payload = {
        "contents": [{ "parts": [{ "text": user_query }] }],
        "systemInstruction": { "parts": [{ "text": system_prompt }] },
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": response_schema
        },
    }

    try:
        response = requests.post(
            api_url, 
            headers={'Content-Type': 'application/json'}, 
            data=json.dumps(payload),
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        
        json_text = result['candidates'][0]['content']['parts'][0]['text']
        sns_contents = json.loads(json_text)
        
        print("✅ SNSコンテンツ生成完了。")
        return sns_contents
        
    except Exception as e:
        print(f"❌ API呼び出しまたはJSONパースエラー: {e}")
        return None

def simulate_sns_posting(sns_contents, blog_url):
    """
    各SNSのAPIへ投稿する処理をシミュレートします。
    """
    print("\n--- 2. 各SNSへの投稿をシミュレーション ---")
    
    # --- X (Twitter) への投稿シミュレーション ---
    x_text = sns_contents['x_post']['text'].replace(' ', '') + " " + blog_url
    
    x_payload = {
        "text": x_text
    }
    print("\n[X (Twitter) 投稿ペイロード]")
    print(f"投稿テキスト: {x_payload['text']}")
    # 実際には X API に POST リクエストを送信します。
    # print(f"POST {X_POST_URL} with payload: {json.dumps(x_payload)}")
    print("✅ X (Twitter) への投稿シミュレーション完了。")
    
    
    # --- Instagram への投稿シミュレーション ---
    # Instagramは通常、API経由で画像/動画も必須です。ここではテキストとキャプションのみをシミュレートします。
    caption_base = sns_contents['instagram_post']['caption']
    hashtags = " ".join([f"#{tag}" for tag in sns_contents['instagram_post']['hashtags']])
    
    instagram_caption = f"{caption_base}\n\n{hashtags}"

    instagram_payload = {
        "caption": instagram_caption,
        # 実際には "image_url" や "video_url" も必要です
    }
    
    print("\n[Instagram 投稿ペイロード]")
    print(f"キャプション:\n{instagram_caption}")
    # 実際には Instagram Graph API に POST リクエストを送信します。
    # print(f"POST {INSTAGRAM_POST_URL} with payload: {json.dumps(instagram_payload)}")
    print("✅ Instagram への投稿シミュレーション完了。")
    
    print("\n🔔 注意: 実際のSNS連携には、画像/動画生成（DALL-EやImagenなどの利用）と、各SNSの認証（OAuth/トークン）が必要です。")


# --- メイン実行フロー ---

def run_sns_workflow():
    """
    SNS自動投稿の一連のワークフローを実行します。
    """
    if not GEMINI_API_KEY:
        print("🛑 エラー: GEMINI_API_KEYが設定されていません。AI生成をスキップします。")
        return

    # 1. AIによるSNSコンテンツの生成
    sns_contents = generate_sns_contents(BLOG_ARTICLE_DATA)
    if not sns_contents:
        print("ワークフロー中断: AIによるSNSコンテンツ生成に失敗しました。")
        return

    # 2. 各SNSへの投稿をシミュレーション
    simulate_sns_posting(sns_contents, BLOG_ARTICLE_DATA['target_url'])
    
    print("\n✅ SNS自動投稿ワークフローの実行を完了しました。")


# 実行
if __name__ == "__main__":
    run_sns_workflow()
