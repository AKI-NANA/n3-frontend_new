# ===================================
# アプリケーション: cards/views.py
# ===================================

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Avg
from .models import PokemonCard, PokemonSeries
from .serializers import PokemonCardSerializer, PokemonSeriesSerializer

class PokemonCardViewSet(viewsets.ModelViewSet):
    queryset = PokemonCard.objects.all()
    serializer_class = PokemonCardSerializer
    
    def get_queryset(self):
        queryset = PokemonCard.objects.all()
        
        # フィルタリング
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name_jp__icontains=search) |
                Q(name_en__icontains=search) |
                Q(card_number__icontains=search)
            )
        
        rarity = self.request.query_params.get('rarity')
        if rarity:
            queryset = queryset.filter(rarity=rarity)
            
        investment_grade = self.request.query_params.get('investment_grade')
        if investment_grade:
            queryset = queryset.filter(investment_grade=investment_grade)
            
        return queryset.order_by('-is_popular', 'name_jp')
    
    @action(detail=True, methods=['get'])
    def price_analysis(self, request, pk=None):
        """カードの価格分析データを取得"""
        card = self.get_object()
        analysis = card.price_analysis.order_by('-analysis_date').first()
        
        if not analysis:
            return Response({
                'message': '価格分析データがありません'
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'card_name': card.name_jp,
            'current_price': analysis.current_price,
            'median_price': analysis.median_price,
            'change_24h': analysis.change_24h,
            'change_7d': analysis.change_7d,
            'change_30d': analysis.change_30d,
            'volume': analysis.volume,
            'market_factors': analysis.market_factors,
            'prediction_30d': analysis.prediction_30d,
            'confidence_score': analysis.confidence_score,
        })
    
    @action(detail=False, methods=['get'])
    def popular_cards(self, request):
        """人気カード一覧を取得"""
        popular_cards = self.queryset.filter(is_popular=True)[:10]
        serializer = self.get_serializer(popular_cards, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def investment_recommendations(self, request):
        """投資推奨カード一覧"""
        recommendations = self.queryset.filter(
            investment_grade__in=['S', 'A']
        ).order_by('investment_grade', '-price_analysis__confidence_score')[:20]
        serializer = self.get_serializer(recommendations, many=True)
        return Response(serializer.data)

# ===================================
# アプリケーション: ai_generation/views.py
# ===================================

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ContentTemplate, GeneratedContent
from .serializers import ContentTemplateSerializer, GeneratedContentSerializer
from .tasks import generate_content_task, quality_check_task

class ContentGenerationViewSet(viewsets.ViewSet):
    """AIコンテンツ生成API"""
    
    @action(detail=False, methods=['post'])
    def generate_blog_article(self, request):
        """ブログ記事生成"""
        card_id = request.data.get('card_id')
        language = request.data.get('language', 'jp')
        template_id = request.data.get('template_id')
        
        if not card_id:
            return Response({
                'error': 'card_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 非同期タスクで生成開始
        task = generate_content_task.delay(
            card_id=card_id,
            content_type=f'blog_{language}',
            template_id=template_id
        )
        
        return Response({
            'task_id': task.id,
            'message': 'コンテンツ生成を開始しました',
            'estimated_time': '2-3分'
        })
    
    @action(detail=False, methods=['post'])
    def generate_youtube_script(self, request):
        """YouTube台本生成"""
        card_id = request.data.get('card_id')
        video_length = request.data.get('video_length', 10)  # 分
        
        task = generate_content_task.delay(
            card_id=card_id,
            content_type='youtube_script',
            extra_params={'video_length': video_length}
        )
        
        return Response({
            'task_id': task.id,
            'message': 'YouTube台本生成を開始しました'
        })
    
    @action(detail=False, methods=['post'])
    def generate_social_posts(self, request):
        """SNS投稿生成"""
        card_id = request.data.get('card_id')
        platforms = request.data.get('platforms', ['twitter', 'instagram'])
        
        tasks = []
        for platform in platforms:
            task = generate_content_task.delay(
                card_id=card_id,
                content_type=f'{platform}_post'
            )
            tasks.append({
                'platform': platform,
                'task_id': task.id
            })
        
        return Response({
            'tasks': tasks,
            'message': f'{len(platforms)}プラットフォーム向けコンテンツ生成を開始しました'
        })
    
    @action(detail=False, methods=['get'])
    def task_status(self, request):
        """タスク状況確認"""
        task_id = request.query_params.get('task_id')
        
        if not task_id:
            return Response({
                'error': 'task_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Celeryタスク状況確認
        from celery.result import AsyncResult
        result = AsyncResult(task_id)
        
        return Response({
            'task_id': task_id,
            'status': result.status,
            'result': result.result if result.ready() else None
        })

# ===================================
# Celeryタスク: ai_generation/tasks.py
# ===================================

from celery import shared_task
from django.conf import settings
import openai
import requests
import time
from .models import ContentTemplate, GeneratedContent
from apps.cards.models import PokemonCard
from apps.price_tracking.models import PriceAnalysis

openai.api_key = settings.OPENAI_API_KEY

@shared_task(bind=True, max_retries=3)
def generate_content_task(self, card_id, content_type='blog_jp', template_id=None, extra_params=None):
    """AIコンテンツ生成メインタスク"""
    try:
        # カード情報取得
        card = PokemonCard.objects.get(id=card_id)
        
        # テンプレート取得
        if template_id:
            template = ContentTemplate.objects.get(id=template_id)
        else:
            template = ContentTemplate.objects.filter(
                content_type=content_type,
                is_active=True
            ).first()
        
        if not template:
            raise ValueError(f"テンプレートが見つかりません: {content_type}")
        
        # 価格分析データ取得
        price_analysis = card.price_analysis.order_by('-analysis_date').first()
        
        # プロンプトデータ準備
        prompt_data = prepare_prompt_data(card, price_analysis, extra_params)
        
        # OpenAI API呼び出し
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": template.system_prompt},
                {"role": "user", "content": template.user_prompt_template.format(**prompt_data)}
            ],
            max_tokens=template.max_tokens,
            temperature=template.temperature
        )
        
        generated_text = response.choices[0].message.content
        
        # 品質チェック
        quality_result = quality_check_task.delay(generated_text, template.quality_threshold)
        quality_score = quality_result.get(timeout=30)
        
        # コンテンツ保存
        content = GeneratedContent.objects.create(
            card=card,
            template=template,
            title=extract_title_from_content(generated_text, content_type),
            content=generated_text,
            quality_score=quality_score['overall_score'],
            quality_details=quality_score,
            status='review' if quality_score['overall_score'] >= template.quality_threshold else 'draft'
        )
        
        return {
            'content_id': content.id,
            'title': content.title,
            'quality_score': quality_score['overall_score'],
            'status': content.status,
            'word_count': len(generated_text),
            'estimated_reading_time': len(generated_text) // 400  # 400文字/分で計算
        }
        
    except Exception as exc:
        # リトライ処理
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (2 ** self.request.retries), exc=exc)
        raise exc

@shared_task
def quality_check_task(content, threshold=0.7):
    """コンテンツ品質チェック"""
    checks = {
        'length_check': check_content_length(content),
        'readability_check': check_readability(content),
        'keyword_density_check': check_keyword_density(content),
        'duplicate_check': check_duplicate_content(content),
        'spam_check': check_spam_indicators(content)
    }
    
    # 総合スコア計算
    overall_score = sum(checks.values()) / len(checks)
    
    return {
        'overall_score': overall_score,
        'details': checks,
        'passed': overall_score >= threshold,
        'suggestions': generate_improvement_suggestions(checks)
    }

def prepare_prompt_data(card, price_analysis, extra_params=None):
    """プロンプト用データ準備"""
    data = {
        'card_name': card.name_jp,
        'card_name_en': card.name_en,
        'card_number': card.card_number,
        'series': card.series.name,
        'rarity': card.get_rarity_display(),
        'investment_grade': card.get_investment_grade_display(),
        'current_price': price_analysis.current_price if price_analysis else 0,
        'median_price': price_analysis.median_price if price_analysis else 0,
        'change_24h': price_analysis.change_24h if price_analysis else 0,
        'change_7d': price_analysis.change_7d if price_analysis else 0,
        'change_30d': price_analysis.change_30d if price_analysis else 0,
        'volume': price_analysis.volume if price_analysis else 0,
        'market_factors': price_analysis.market_factors if price_analysis else [],
    }
    
    if extra_params:
        data.update(extra_params)
    
    return data

def check_content_length(content):
    """文字数チェック"""
    length = len(content)
    if 2000 <= length <= 5000:
        return 1.0
    elif 1500 <= length < 2000 or 5000 < length <= 6000:
        return 0.8
    elif 1000 <= length < 1500 or 6000 < length <= 8000:
        return 0.6
    else:
        return 0.3

def check_readability(content):
    """可読性チェック"""
    # 簡易的な可読性チェック
    sentences = content.split('。')
    avg_sentence_length = sum(len(s) for s in sentences) / len(sentences) if sentences else 0
    
    if 20 <= avg_sentence_length <= 40:
        return 1.0
    elif 15 <= avg_sentence_length < 20 or 40 < avg_sentence_length <= 60:
        return 0.8
    else:
        return 0.5

def check_keyword_density(content):
    """キーワード密度チェック"""
    target_keywords = ['ポケカ', '相場', '投資', '価格', 'ポケモンカード']
    total_words = len(content)
    keyword_count = sum(content.count(keyword) for keyword in target_keywords)
    
    density = keyword_count / total_words * 100
    
    if 1.0 <= density <= 3.0:
        return 1.0
    elif 0.5 <= density < 1.0 or 3.0 < density <= 5.0:
        return 0.8
    else:
        return 0.4

def check_duplicate_content(content):
    """重複コンテンツチェック"""
    # 既存コンテンツとの類似度チェック（簡易版）
    existing_contents = GeneratedContent.objects.values_list('content', flat=True)[:100]
    
    for existing in existing_contents:
        similarity = calculate_similarity(content, existing)
        if similarity > 0.8:  # 80%以上の類似度
            return 0.2
        elif similarity > 0.6:  # 60%以上の類似度
            return 0.6
    
    return 1.0

def check_spam_indicators(content):
    """スパム指標チェック"""
    spam_indicators = [
        '今すぐ', '限定', '激安', '必見', '緊急',
        '!!' * 3, '？？' * 2
    ]
    
    spam_count = sum(content.count(indicator) for indicator in spam_indicators)
    total_chars = len(content)
    
    spam_ratio = spam_count / total_chars * 100 if total_chars > 0 else 0
    
    if spam_ratio < 0.5:
        return 1.0
    elif spam_ratio < 1.0:
        return 0.7
    else:
        return 0.3

def calculate_similarity(text1, text2):
    """簡易的な類似度計算"""
    words1 = set(text1.split())
    words2 = set(text2.split())
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    return len(intersection) / len(union)

def extract_title_from_content(content, content_type):
    """コンテンツからタイトル抽出"""
    lines = content.split('\n')
    
    # 最初の非空行をタイトルとして扱う
    for line in lines:
        line = line.strip()
        if line and not line.startswith('#'):
            # マークダウンのヘッダーを除去
            title = line.replace('#', '').strip()
            return title[:100]  # 100文字まで
    
    return f"生成コンテンツ - {content_type}"

def generate_improvement_suggestions(checks):
    """改善提案生成"""
    suggestions = []
    
    if checks['length_check'] < 0.8:
        suggestions.append("適切な文字数（2000-5000文字）に調整してください")
    
    if checks['readability_check'] < 0.8:
        suggestions.append("文章をより読みやすく、1文あたり20-40文字程度に調整してください")
    
    if checks['keyword_density_check'] < 0.8:
        suggestions.append("関連キーワードの使用頻度を調整してください（1-3%が適切）")
    
    if checks['duplicate_check'] < 0.8:
        suggestions.append("既存コンテンツとの重複を避け、よりオリジナルな内容にしてください")
    
    if checks['spam_check'] < 0.8:
        suggestions.append("過度な宣伝文句や感嘆符の使用を控えてください")
    
    return suggestions

# ===================================
# WordPress投稿タスク: publishing/tasks.py
# ===================================

@shared_task
def publish_to_wordpress_task(content_id, site_config):
    """WordPress自動投稿"""
    try:
        content = GeneratedContent.objects.get(id=content_id)
        
        # WordPress REST API設定
        wp_url = site_config['url']
        username = site_config['username']
        password = site_config['password']
        
        # 認証ヘッダー
        import base64
        credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
        headers = {
            'Authorization': f'Basic {credentials}',
            'Content-Type': 'application/json'
        }
        
        # 投稿データ準備
        post_data = {
            'title': content.title,
            'content': content.content,
            'status': 'draft',  # 最初は下書きとして保存
            'categories': [1],  # カテゴリID（事前に設定）
            'tags': extract_tags_from_content(content.content)
        }
        
        # WordPress投稿
        response = requests.post(
            f"{wp_url}/wp-json/wp/v2/posts",
            json=post_data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 201:
            wp_post_data = response.json()
            content.metadata['wordpress_post_id'] = wp_post_data['id']
            content.metadata['wordpress_url'] = wp_post_data['link']
            content.status = 'published'
            content.save()
            
            return {
                'success': True,
                'wordpress_post_id': wp_post_data['id'],
                'wordpress_url': wp_post_data['link']
            }
        else:
            raise Exception(f"WordPress投稿失敗: {response.status_code} - {response.text}")
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def extract_tags_from_content(content):
    """コンテンツからタグ抽出"""
    common_tags = [
        'ポケモンカード', 'ポケカ', '相場', '投資', '価格',
        'レア', 'ホロ', 'プロモ', 'PSA', 'BGS'
    ]
    
    found_tags = []
    for tag in common_tags:
        if tag in content:
            found_tags.append(tag)
    
    return found_tags[:10]  # 最大10個