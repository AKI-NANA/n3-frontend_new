# -*- coding: utf-8 -*-
"""
翻訳サービス（Gemini作成版統合）
"""

import hashlib
import json
import os
import requests
from datetime import datetime

class TranslationManager:
    def __init__(self):
        self.cache_file = 'translation_cache.json'
        self.translation_cache = self._load_cache()
        self.api_key = os.environ.get('GOOGLE_TRANSLATE_API_KEY', '')
        
    def _load_cache(self):
        """翻訳キャッシュ読み込み"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"キャッシュ読み込みエラー: {e}")
        return {}

    def _save_cache(self):
        """翻訳キャッシュ保存"""
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.translation_cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"キャッシュ保存エラー: {e}")

    def translate_product_info(self, title_jp, desc_jp):
        """
        商品情報翻訳（キャッシュ機能付き）
        """
        if not title_jp and not desc_jp:
            return '', ''
            
        # キャッシュキー生成
        cache_key = hashlib.sha256((str(title_jp) + str(desc_jp)).encode('utf-8')).hexdigest()
        
        # キャッシュ確認
        if cache_key in self.translation_cache:
            cached = self.translation_cache[cache_key]
            return cached.get('title', ''), cached.get('description', '')

        # 翻訳実行
        title_en = self._translate_text(title_jp) if title_jp else ''
        desc_en = self._translate_text(desc_jp) if desc_jp else ''
        
        # eBay向け最適化
        title_en = self.optimize_for_ebay(title_en)
        desc_en = self.optimize_for_ebay(desc_en)
        
        # キャッシュ保存
        self.translation_cache[cache_key] = {
            'title': title_en,
            'description': desc_en,
            'original_title': title_jp,
            'original_description': desc_jp,
            'created_at': datetime.now().isoformat()
        }
        self._save_cache()
        
        return title_en, desc_en

    def _translate_text(self, text, target_lang='en'):
        """
        Google Translate API使用（無料枠対応）
        """
        if not text or not text.strip():
            return ""
            
        # モック翻訳（実際はGoogle Translate APIを使用）
        if not self.api_key:
            return self._mock_translation(text)
            
        try:
            url = "https://translation.googleapis.com/language/translate/v2"
            params = {
                'key': self.api_key,
                'q': text,
                'target': target_lang,
                'source': 'ja'
            }
            
            response = requests.post(url, params=params, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            return result['data']['translations'][0]['translatedText']
            
        except Exception as e:
            print(f"翻訳APIエラー: {e}")
            return self._mock_translation(text)
    
    def _mock_translation(self, text):
        """
        モック翻訳（APIキーない場合の代替）
        """
        # 簡易的な翻訳ルール
        translation_map = {
            '美品': 'Excellent Condition',
            '新品': 'Brand New',
            '中古': 'Used',
            '送料無料': 'Free Shipping',
            'ポケモンカード': 'Pokemon Card',
            'ゲーム': 'Game',
            'フィギュア': 'Figure',
            'アニメ': 'Anime',
            'マンガ': 'Manga',
            '本': 'Book',
            '限定': 'Limited Edition',
            'レア': 'Rare'
        }
        
        result = text
        for jp, en in translation_map.items():
            result = result.replace(jp, en)
            
        # 基本的な変換
        if len(result) == len(text):  # 変換されてない場合
            result = f"[JP] {text}"
            
        return result

    def optimize_for_ebay(self, translated_text):
        """
        eBay向けSEO最適化
        """
        if not translated_text:
            return translated_text
            
        # 禁止キーワード除去
        prohibited_keywords = ['replica', 'copy', 'fake', 'bootleg']
        optimized_text = translated_text
        
        for keyword in prohibited_keywords:
            optimized_text = optimized_text.replace(keyword, '').replace(keyword.upper(), '')
        
        # eBay向けキーワード最適化
        optimizations = {
            '【': '[',
            '】': ']',
            '！': '!',
            '？': '?',
            '・': ' ',
        }
        
        for jp_char, en_char in optimizations.items():
            optimized_text = optimized_text.replace(jp_char, en_char)
        
        # 余分なスペース除去
        optimized_text = ' '.join(optimized_text.split())
        
        return optimized_text

    def get_cache_stats(self):
        """キャッシュ統計情報"""
        return {
            'total_cached': len(self.translation_cache),
            'cache_file_exists': os.path.exists(self.cache_file),
            'api_key_configured': bool(self.api_key)
        }
