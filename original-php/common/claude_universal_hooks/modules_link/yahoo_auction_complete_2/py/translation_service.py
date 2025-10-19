# ファイル作成: translation_service.py
# 目的: 無料範囲内での高品質翻訳

from google.cloud import translate_v2 as translate
import os
import hashlib
import json

# 環境変数から認証情報を取得
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'path/to/your/google-cloud-key.json'
# ※ 実際の運用では認証情報を適切に管理してください

class TranslationManager:
    def __init__(self):
        self.translate_client = translate.Client()
        self.cache_file = 'translation_cache.json'
        self.translation_cache = self._load_cache()

    def _load_cache(self):
        if os.path.exists(self.cache_file):
            with open(self.cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def _save_cache(self):
        with open(self.cache_file, 'w', encoding='utf-8') as f:
            json.dump(self.translation_cache, f, ensure_ascii=False, indent=4)

    def translate_product_info(self, title_jp, desc_jp):
        """
        既存翻訳チェック、翻訳実行、キャッシュ保存機能付き
        """
        # キャッシュキーを生成
        cache_key = hashlib.sha256((title_jp + desc_jp).encode('utf-8')).hexdigest()
        
        if cache_key in self.translation_cache:
            return self.translation_cache[cache_key]['title'], self.translation_cache[cache_key]['description']

        # 翻訳実行
        title_en = self._translate_text(title_jp)
        desc_en = self._translate_text(desc_jp)
        
        # 結果をキャッシュに保存
        self.translation_cache[cache_key] = {'title': title_en, 'description': desc_en}
        self._save_cache()
        
        return title_en, desc_en

    def _translate_text(self, text, target_lang='en'):
        if not text:
            return ""
        
        result = self.translate_client.translate(text, target_language=target_lang)
        return result['translatedText']

    def optimize_for_ebay(self, translated_text):
        """
        eBay向けSEO最適化
        """
        # 例: キーワードの追加、禁止キーワードの除去など
        optimized_text = translated_text.replace('【美品】', ' [Excellent Condition] ')
        return optimized_text