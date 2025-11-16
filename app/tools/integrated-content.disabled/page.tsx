'use client'

import requests
import json
import time

# --- 設定 ---
GEMINI_API_KEY = "" # 実際のAPIキーを設定
API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent"
HEADERS = {'Content-Type': 'application/json'}

# ----------------------------------------------------
# ユーティリティ関数: 指数バックオフ付きAPI呼び出し
# ----------------------------------------------------

def fetch_with_retry(payload, max_retries=5):
    """API呼び出しを指数バックオフでリトライする"""
    for i in range(max_retries):
        try:
            response = requests.post(f"{API_BASE_URL}?key={GEMINI_API_KEY}", 
                                     headers=HEADERS, 
                                     data=json.dumps(payload), 
                                     timeout=90)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            if i < max_retries - 1:
                delay = 2 ** i + 1  # 1s, 3s, 7s, 15s...
                print(f"APIエラー発生 (Status: {response.status_code if 'response' in locals() else 'N/A'}). リトライします({delay}秒後)...")
                time.sleep(delay)
            else:
                raise e

# ----------------------------------------------------
# メイン機能: 統合コンテンツ生成
# ----------------------------------------------------

def generate_integrated_content(topic: str, target_lang: str, persona: str, affiliate_product: str):
    """
    リアルタイム情報（Google Search）に基づき、ブログ記事とラジオ台本を同時に生成し、
    指定されたペルソナとマネタイズCTAを組み込む。
    """
    
    # 独自の視点や分析を指示するシステムプロンプト
    system_prompt = (
        f"あなたは{target_lang}の読者・リスナーを魅了するプロのコンテンツクリエイターです。"
        f"ペルソナ：{persona}。あなたは{topic}に関する最新情報を元に、ブログ記事とラジオ台本を生成します。"
        f"記事には必ず{affiliate_product}への自然なCTAを盛り込み、ラジオ台本は必ず「ホスト:」「ゲスト:」形式の会話形式で作成してください。"
        f"出力は厳密にJSON形式に従ってください。"
    )

    # ユーザーの要求（Google Searchをトリガー）
    user_query = f"最新のウェブ情報に基づき、以下のトピックについて、ブログ記事とラジオ台本を生成してください。トピック: 『{topic}』"
    
    # JSONスキーマ定義
    response_schema = {
        "type": "OBJECT",
        "properties": {
            "blog_title": {"type": "STRING", "description": "ブログ記事の魅力的なタイトル"},
            "blog_body": {"type": "STRING", "description": "ブログ記事の本文（アフィリエイトCTA含む、Markdown形式）"},
            "youtube_script": {"type": "STRING", "description": "ラジオ風動画用の台本（会話形式、ホスト: / ゲスト: のタグを使用）"},
            "social_caption": {"type": "STRING", "description": "SNSプロモーション用の短いキャプション"},
        },
        "required": ["blog_title", "blog_body", "youtube_script", "social_caption"]
    }

    payload = {
        "contents": [{ "parts": [{ "text": user_query }] }],
        "systemInstruction": { "parts": [{ "text": system_prompt }] },
        # Google Search groundingを有効にして、リアルタイム情報を取得
        "tools": [{ "google_search": {} }], 
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": response_schema
        }
    }

    print(f"トピック: '{topic}' の統合コンテンツを生成中...")
    
    try:
        result = fetch_with_retry(payload)
        json_string = result['candidates'][0]['content']['parts'][0]['text']
        content_data = json.loads(json_string)
        return content_data
        
    except Exception as e:
        print(f"コンテンツ生成中に致命的なエラーが発生しました: {e}")
        return None

# --- 実行例 ---
if __name__ == '__main__':
    # 大谷チャンネル（英語圏向け）を想定
    topic_en = "Shohei Ohtani's historic achievement of hitting 50 home runs and stealing 30 bases this season."
    
    # 経済ニュース（日本語ブログ向け）を想定
    topic_ja = "日本株が35,000円を突破。この円安局面における今後の戦略とは？"
    
    # 実行 1: 大谷チャンネル（英語）
    ohtani_content = generate_integrated_content(
        topic=topic_en,
        target_lang='en',
        persona='Enthusiastic American sports analyst',
        affiliate_product='Official MLB Merchandise Store Link'
    )

    if ohtani_content:
        print("\n=======================================================")
        print("✅ 大谷チャンネル (英語) コンテンツ生成結果")
        print("=======================================================")
        print(f"ブログタイトル: {ohtani_content['blog_title']}")
        print("\n--- ラジオ/YouTube台本 (TTSへ渡す) ---")
        print(ohtani_content['youtube_script'])
        print("\n--- SNSキャプション ---")
        print(ohtani_content['social_caption'])
        print("=======================================================")

    # 実行 2: 経済ブログ（日本語）
    # keizai_content = generate_integrated_content(
    #     topic=topic_ja,
    #     target_lang='ja',
    #     persona='冷静な金融アナリスト',
    #     affiliate_product='最新の投資セミナーの申込みリンク'
    # )

    # if keizai_content:
    #     print("\n=======================================================")
    #     print("✅ 経済ニュース (日本語) コンテンツ生成結果")
    #     print("=======================================================")
    #     print(f"ブログタイトル: {keizai_content['blog_title']}")
    #     print("\n--- ラジオ/YouTube台本 (TTSへ渡す) ---")
    #     print(keizai_content['youtube_script'])
    #     print("\n--- SNSキャプション ---")
    #     print(keizai_content['social_caption'])
    #     print("=======================================================")
