'use client'


    """
    Gemini APIを使用して、テキストを高品質に翻訳・最適化する。
    
    Args:
        text (str): 翻訳・最適化する元のテキスト。
        source_lang (str): 元言語 ('ja' or 'en')。
        target_lang (str): ターゲット言語 ('ja' or 'en')。
        theme (str): コンテンツのテーマ (例: 'スポーツニュース', '経済分析')。
        
    Returns:
        str: 翻訳され、ターゲット市場向けに最適化されたテキスト。
    """
    
    # AIへの役割定義
    system_prompt = (
        f"あなたはプロの翻訳家であり、{target_lang}のターゲット読者に合わせたコンテンツクリエイターです。"
        f"以下の{source_lang}の{theme}に関するテキストを、文脈を完全に理解し、"
        "ネイティブが書いたように自然で魅力的な表現に翻訳・再構成してください。"
        "単なる直訳ではなく、ターゲット言語の文化と文体に合わせてください。"
    )

    # ユーザーへのタスク指示
    user_query = f"""
    --- タスク詳細 ---
    元言語: {source_lang}
    ターゲット言語: {target_lang}
    コンテンツテーマ: {theme}
    
    --- 元テキスト ---
    {text}
    """
    
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{ "parts": [{ "text": user_query }] }],
        "systemInstruction": { "parts": [{ "text": system_prompt }] },
    }

    try:
        response = requests.post(api_url, headers={'Content-Type': 'application/json'}, data=json.dumps(payload), timeout=60)
        response.raise_for_status()
        
        result = response.json()
        return result['candidates'][0]['content']['parts'][0]['text']
        
    except Exception as e:
        print(f"Error during AI translation: {e}")
        return f"TRANSLATION_ERROR: {text}"

# --- 実行例 (シミュレーション) ---
if __name__ == '__main__':
    # 大谷チャンネルのニュース元ネタ（日本語）を想定
    japanese_source = "大谷翔平選手は、昨日の試合で特大のホームランを放ちました。彼の打撃フォームは完全に修正され、昨年の不調を払拭しました。"
    
    # 英語コンテンツを生成 (マネタイズを優先しグローバル展開)
    english_output = translate_and_adapt(
        japanese_source, 
        source_lang='ja', 
        target_lang='en', 
        theme='Sports News Commentary'
    )
    
    print("\n--- 日本語原文 ---")
    print(japanese_source)
    print("\n--- 英語（最適化済み）---")
    print(english_output)
    
    # 英語記事を日本語ブログ用に最適化翻訳する場合
    english_article = "The US stock market is showing surprising resilience despite the inflation concerns, largely driven by the tech sector."
    japanese_blog_output = translate_and_adapt(
        english_article, 
        source_lang='en', 
        target_lang='ja', 
        theme='Economic Analysis Blog'
    )
    
    print("\n--- 英語原文 (経済) ---")
    print(english_article)
    print("\n--- 日本語（経済ブログ向け）---")
    print(japanese_blog_output)
