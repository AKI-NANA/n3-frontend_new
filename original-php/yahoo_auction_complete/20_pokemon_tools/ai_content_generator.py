import openai
import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from django.conf import settings
from django.utils import timezone
from apps.cards.models import PokemonCard, PriceData, MarketTrend

logger = logging.getLogger(__name__)

class AIContentGenerator:
    """AI コンテンツ生成クラス"""
    
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4"
        
    def generate_blog_article(self, card_data: Dict, language: str = 'ja') -> Dict:
        """ブログ記事の生成"""
        try:
            # データの準備
            formatted_data = self._format_card_data(card_data)
            prompt = self._get_blog_prompt(formatted_data, language)
            
            # OpenAI API 呼び出し
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._get_system_prompt('blog', language)},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=3000,
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            
            # メタデータの生成
            title = self._extract_title_from_content(content)
            meta_description = self._generate_meta_description(content)
            tags = self._generate_tags(card_data, language)
            
            return {
                'title': title,
                'content': content,
                'meta_description': meta_description,
                'tags': tags,
                'language': language,
                'word_count': len(content.split()),
                'generated_at': timezone.now()
            }
            
        except Exception as e:
            logger.error(f"ブログ記事生成エラー: {e}")
            raise
    
    def generate_youtube_script(self, card_data: Dict, duration_minutes: int = 10) -> Dict:
        """YouTube動画スクリプト生成"""
        try:
            formatted_data = self._format_card_data(card_data)
            prompt = self._get_youtube_script_prompt(formatted_data, duration_minutes)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._get_system_prompt('youtube_script', 'ja')},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=4000,
                temperature=0.8
            )
            
            script_content = response.choices[0].message.content
            
            # スクリプトの構造化
            structured_script = self._structure_youtube_script(script_content)
            
            return {
                'script': script_content,
                'structured_script': structured_script,
                'duration_minutes': duration_minutes,
                'video_title': self._generate_video_title(card_data),
                'description': self._generate_video_description(card_data),
                'tags': self._generate_video_tags(card_data),
                'generated_at': timezone.now()
            }
            
        except Exception as e:
            logger.error(f"YouTubeスクリプト生成エラー: {e}")
            raise
    
    def generate_social_posts(self, card_data: Dict) -> Dict:
        """SNS投稿生成"""
        try:
            formatted_data = self._format_card_data(card_data)
            
            # Twitter投稿生成
            twitter_post = self._generate_twitter_post(formatted_data)
            
            # Instagram投稿生成
            instagram_post = self._generate_instagram_post(formatted_data)
            
            return {
                'twitter': twitter_post,
                'instagram': instagram_post,
                'generated_at': timezone.now()
            }
            
        except Exception as e:
            logger.error(f"SNS投稿生成エラー: {e}")
            raise
    
    def _format_card_data(self, card_data: Dict) -> str:
        """カードデータの整形"""
        card_name = card_data.get('card_name', '')
        current_price = card_data.get('current_price', 0)
        price_change_24h = card_data.get('price_change_24h', 0)
        price_change_7d = card_data.get('price_change_7d', 0)
        investment_grade = card_data.get('investment_grade', 'C')
        market_factors = card_data.get('market_factors', [])
        
        formatted = f"""
== カード基本情報 ==
カード名: {card_name}
現在価格: ¥{current_price:,}
投資グレード: {investment_grade}級

== 価格動向 ==
24時間変動: {price_change_24h:+.1f}%
7日間変動: {price_change_7d:+.1f}%

== 市場要因 ==
{chr(10).join([f"- {factor}" for factor in market_factors])}

== 分析日時 ==
{datetime.now().strftime('%Y年%m月%d日 %H:%M')}
"""
        return formatted
    
    def _get_system_prompt(self, content_type: str, language: str) -> str:
        """システムプロンプトの生成"""
        prompts = {
            'blog': {
                'ja': """あなたは日本のポケモンカード投資・相場分析の専門家です。
以下の特徴で記事を作成してください：
- ポケカ投資初心者から中級者向け
- データに基づいた客観的分析
- 親しみやすい語調だが専門性も感じられる
- SEO最適化を意識したキーワード使用
- 読者の投資判断に役立つ実用的内容
- 3000文字程度の詳細な記事""",
                'en': """You are a Pokemon card investment and market analysis expert in Japan.
Create articles with these characteristics:
- For beginner to intermediate Pokemon card investors
- Objective analysis based on data
- Professional yet accessible tone
- SEO-optimized keyword usage
- Practical investment guidance
- Around 3000 words detailed article"""
            },
            'youtube_script': {
                'ja': """あなたはYouTube向けポケモンカード解説動画の台本作成専門家です。
以下の要件で台本を作成してください：
- 視聴者の関心を引く導入
- 時間軸付きの詳細構成
- 画面表示指示も含める
- エンゲージメントを高める工夫
- 親しみやすい語調
- 10分程度の動画用"""
            },
            'social': {
                'ja': """SNS投稿のエキスパートとして、エンゲージメントの高い投稿を作成してください。
- Twitter: 280文字以内、適切なハッシュタグ
- Instagram: 魅力的なキャプション、10-15個のハッシュタグ"""
            }
        }
        
        return prompts.get(content_type, {}).get(language, prompts[content_type]['ja'])
    
    def _get_blog_prompt(self, formatted_data: str, language: str) -> str:
        """ブログ用プロンプト生成"""
        if language == 'ja':
            return f"""
以下のポケモンカード価格データを基に、SEO最適化されたブログ記事を作成してください：

{formatted_data}

【記事要件】
- タイトル: クリックされやすいタイトル
- 構成: 1.導入 2.現状分析 3.価格要因 4.今後の予測 5.投資アドバイス 6.まとめ
- 文字数: 3000文字程度
- SEOキーワード: 「ポケカ 相場」「投資」「価格予測」を自然に含める
- CTA: 関連記事への誘導を含める
- 語調: 専門的だが親しみやすい

完全な記事をマークダウン形式で作成してください。
"""
        else:
            return f"""
Create an SEO-optimized blog article based on the following Pokemon card price data:

{formatted_data}

Requirements:
- Title: Click-worthy title
- Structure: 1.Introduction 2.Current Analysis 3.Price Factors 4.Future Prediction 5.Investment Advice 6.Conclusion
- Length: Around 3000 words
- SEO Keywords: Include "Pokemon card investment", "market analysis", "price prediction" naturally
- CTA: Include calls-to-action for related articles

Create a complete article in markdown format.
"""
    
    def _get_youtube_script_prompt(self, formatted_data: str, duration: int) -> str:
        """YouTubeスクリプト用プロンプト"""
        return f"""
以下のデータを基に、{duration}分のYouTube動画台本を作成してください：

{formatted_data}

【台本要件】
- 総時間: {duration}分（約{duration * 60}秒）
- 構成: 導入30秒、メイン解説{duration-2}分、まとめ・CTA90秒
- 時間軸指示: [00:30] のような形式で時間を明記
- 画面指示: 「画面：価格チャート表示」などの指示を含める
- エンゲージメント: 視聴者への質問、コメント促進
- 語調: YouTube視聴者向けの親しみやすい話し方

詳細な台本を作成してください。
"""
    
    def _generate_twitter_post(self, formatted_data: str) -> Dict:
        """Twitter投稿生成"""
        try:
            prompt = f"""
以下のデータからTwitter投稿を作成してください：

{formatted_data}

要件：
- 280文字以内
- エンゲージメントを促す内容
- 適切なハッシュタグ3-5個
- 数字データを効果的に使用
"""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._get_system_prompt('social', 'ja')},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.8
            )
            
            content = response.choices[0].message.content
            
            return {
                'content': content,
                'character_count': len(content),
                'platform': 'twitter'
            }
            
        except Exception as e:
            logger.error(f"Twitter投稿生成エラー: {e}")
            return {'content': '', 'character_count': 0, 'platform': 'twitter'}
    
    def _generate_instagram_post(self, formatted_data: str) -> Dict:
        """Instagram投稿生成"""
        try:
            prompt = f"""
以下のデータからInstagram投稿を作成してください：

{formatted_data}

要件：
- 魅力的なキャプション
- ハッシュタグ10-15個
- ストーリー風の語りかけ
- 視覚的な要素への言及
"""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._get_system_prompt('social', 'ja')},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.8
            )
            
            content = response.choices[0].message.content
            
            return {
                'content': content,
                'character_count': len(content),
                'platform': 'instagram'
            }
            
        except Exception as e:
            logger.error(f"Instagram投稿生成エラー: {e}")
            return {'content': '', 'character_count': 0, 'platform': 'instagram'}
    
    def _extract_title_from_content(self, content: str) -> str:
        """コンテンツからタイトルを抽出"""
        lines = content.split('\n')
        for line in lines[:5]:
            if line.strip().startswith('#'):
                return line.strip('#').strip()
        
        # フォールバック
        return "ポケモンカード相場分析レポート"
    
    def _generate_meta_description(self, content: str) -> str:
        """メタディスクリプション生成"""
        # 最初の段落から160文字程度を抽出
        paragraphs = content.split('\n\n')
        for paragraph in paragraphs:
            clean_text = paragraph.replace('#', '').strip()
            if len(clean_text) > 50:
                return clean_text[:157] + "..." if len(clean_text) > 160 else clean_text
        
        return "ポケモンカードの最新相場情報と投資分析をお届けします。"
    
    def _generate_tags(self, card_data: Dict, language: str) -> List[str]:
        """タグ生成"""
        if language == 'ja':
            base_tags = ['ポケカ', 'ポケモンカード', '相場', '投資', '価格']
            if card_data.get('card_name'):
                base_tags.append(card_data['card_name'])
            return base_tags
        else:
            base_tags = ['pokemon', 'trading-cards', 'investment', 'market-analysis']
            return base_tags
    
    def _generate_video_title(self, card_data: Dict) -> str:
        """動画タイトル生成"""
        card_name = card_data.get('card_name', 'ポケモンカード')
        change = card_data.get('price_change_24h', 0)
        
        if change > 10:
            return f"【急騰中】{card_name} 価格分析！今買うべき？投資判断を解説"
        elif change < -10:
            return f"【価格急落】{card_name} 暴落の真相と今後の見通し"
        else:
            return f"【相場分析】{card_name} 最新価格動向と投資戦略"
    
    def _generate_video_description(self, card_data: Dict) -> str:
        """動画説明文生成"""
        card_name = card_data.get('card_name', 'ポケモンカード')
        return f"""
{card_name}の最新相場分析動画です！

📊 この動画で分かること
・現在の価格動向
・価格変動の要因分析
・今後の予測と投資戦略
・買い時・売り時の判断ポイント

💰 現在価格: ¥{card_data.get('current_price', 0):,}
📈 24時間変動: {card_data.get('price_change_24h', 0):+.1f}%

🔔 チャンネル登録と高評価をお願いします！
📱 Twitter: @pokemoncard_jp
💬 コメント欄で質問お待ちしています

#ポケカ #投資 #相場分析
"""
    
    def _generate_video_tags(self, card_data: Dict) -> List[str]:
        """動画タグ生成"""
        tags = ['ポケカ', 'ポケモンカード', '投資', '相場', '価格分析', 'TCG']
        if card_data.get('card_name'):
            tags.append(card_data['card_name'])
        return tags
    
    def _structure_youtube_script(self, script: str) -> List[Dict]:
        """YouTubeスクリプトの構造化"""
        structured = []
        lines = script.split('\n')
        
        current_section = {
            'timestamp': '00:00',
            'content': '',
            'screen_notes': ''
        }
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # タイムスタンプ検出
            if '[' in line and ']' in line and ':' in line:
                if current_section['content']:
                    structured.append(current_section.copy())
                
                timestamp = line[line.find('[')+1:line.find(']')]
                current_section = {
                    'timestamp': timestamp,
                    'content': line[line.find(']')+1:].strip(),
                    'screen_notes': ''
                }
            elif line.startswith('画面：') or line.startswith('Screen:'):
                current_section['screen_notes'] = line
            else:
                current_section['content'] += line + ' '
        
        if current_section['content']:
            structured.append(current_section)
        
        return structured


class ContentQualityChecker:
    """コンテンツ品質チェッククラス"""
    
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def check_content_quality(self, content: str, content_type: str) -> Dict:
        """コンテンツの品質をチェック"""
        try:
            scores = {}
            
            # 基本品質チェック
            scores['readability'] = self._check_readability(content)
            scores['uniqueness'] = self._check_uniqueness(content)
            scores['seo_score'] = self._check_seo_optimization(content, content_type)
            scores['ai_detection_risk'] = self._check_ai_detection_risk(content)
            
            # 総合スコア計算
            overall_score = sum(scores.values()) / len(scores)
            
            # 改善提案生成
            suggestions = self._generate_improvement_suggestions(content, scores)
            
            return {
                'overall_score': overall_score,
                'detailed_scores': scores,
                'suggestions': suggestions,
                'quality_grade': self._get_quality_grade(overall_score),
                'checked_at': timezone.now()
            }
            
        except Exception as e:
            logger.error(f"品質チェックエラー: {e}")
            return {
                'overall_score': 50.0,
                'detailed_scores': {},
                'suggestions': [],
                'quality_grade': 'C'
            }
    
    def _check_readability(self, content: str) -> float:
        """可読性チェック"""
        # 簡易的な可読性スコア
        sentences = content.count('。') + content.count('.')
        words = len(content.split())
        
        if sentences == 0:
            return 50.0
        
        avg_sentence_length = words / sentences
        
        # 適切な文長は15-25語程度
        if 15 <= avg_sentence_length <= 25:
            return 90.0
        elif 10 <= avg_sentence_length <= 30:
            return 75.0
        else:
            return 60.0
    
    def _check_uniqueness(self, content: str) -> float:
        """独自性チェック（簡易版）"""
        # 実際の実装ではより高度な重複チェックが必要
        unique_words = len(set(content.split()))
        total_words = len(content.split())
        
        if total_words == 0:
            return 50.0
        
        uniqueness_ratio = unique_words / total_words
        return min(100.0, uniqueness_ratio * 120)  # スコア調整
    
    def _check_seo_optimization(self, content: str, content_type: str) -> float:
        """SEO最適化チェック"""
        score = 0.0
        content_lower = content.lower()
        
        # キーワード密度チェック
        target_keywords = ['ポケカ', 'ポケモンカード', '相場', '投資', '価格']
        keyword_count = sum(content_lower.count(keyword) for keyword in target_keywords)
        
        total_words = len(content.split())
        if total_words > 0:
            keyword_density = keyword_count / total_words
            if 0.01 <= keyword_density <= 0.03:  # 1-3%が理想
                score += 30.0
            else:
                score += 15.0
        
        # 見出し構造チェック（markdown）
        if content_type == 'blog':
            h1_count = content.count('# ')
            h2_count = content.count('## ')
            
            if h1_count == 1 and h2_count >= 3:
                score += 25.0
            elif h1_count >= 1 and h2_count >= 1:
                score += 15.0
        
        # メタ情報の存在
        if '。' in content and len(content) > 1000:
            score += 20.0
        
        # 内部リンクの可能性
        if '関連記事' in content or 'こちらも' in content:
            score += 25.0
        
        return min(100.0, score)
    
    def _check_ai_detection_risk(self, content: str) -> float:
        """AI検出リスクチェック"""
        # AI特有の表現パターンをチェック
        ai_phrases = [
            'として、', 'について、', 'に関して、',
            'することができます', 'と言えるでしょう',
            '重要なポイント', 'まとめると'
        ]
        
        ai_phrase_count = sum(content.count(phrase) for phrase in ai_phrases)
        total_sentences = content.count('。') + 1
        
        if total_sentences == 0:
            return 50.0
        
        ai_ratio = ai_phrase_count / total_sentences
        
        # AI感が低いほど高スコア
        if ai_ratio < 0.1:
            return 90.0
        elif ai_ratio < 0.2:
            return 70.0
        else:
            return 50.0
    
    def _generate_improvement_suggestions(self, content: str, scores: Dict) -> List[str]:
        """改善提案生成"""
        suggestions = []
        
        if scores.get('readability', 0) < 70:
            suggestions.append("文章の長さを調整し、読みやすさを向上させましょう")
        
        if scores.get('seo_score', 0) < 70:
            suggestions.append("SEOキーワードの使用頻度を最適化しましょう")
        
        if scores.get('ai_detection_risk', 0) < 70:
            suggestions.append("より自然な表現に変更し、AI感を減らしましょう")
        
        if scores.get('uniqueness', 0) < 70:
            suggestions.append("独自の視点や具体例を追加して独自性を高めましょう")
        
        return suggestions
    
    def _get_quality_grade(self, score: float) -> str:
        """品質グレード判定"""
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 70:
            return 'C'
        else:
            return 'D'