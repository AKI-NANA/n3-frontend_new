# apps/cards/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Avg, Count, Max, Min
from django.utils import timezone
from datetime import timedelta
from .models import PokemonCard, PokemonSeries
from .serializers import PokemonCardSerializer, PokemonSeriesSerializer, PokemonCardDetailSerializer
from apps.price_tracking.models import PriceAnalysis

class PokemonSeriesViewSet(viewsets.ModelViewSet):
    queryset = PokemonSeries.objects.filter(is_active=True)
    serializer_class = PokemonSeriesSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'name_en', 'set_code']
    ordering_fields = ['release_date', 'total_cards']
    ordering = ['-release_date']

class PokemonCardViewSet(viewsets.ModelViewSet):
    queryset = PokemonCard.objects.filter(is_active=True)
    serializer_class = PokemonCardSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name_jp', 'name_en', 'card_number']
    ordering_fields = ['popularity_score', 'investment_potential', 'created_at']
    ordering = ['-popularity_score']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PokemonCardDetailSerializer
        return PokemonCardSerializer
    
    def get_queryset(self):
        queryset = PokemonCard.objects.filter(is_active=True)
        
        # フィルタリング
        rarity = self.request.query_params.get('rarity')
        if rarity:
            queryset = queryset.filter(rarity=rarity)
            
        investment_grade = self.request.query_params.get('investment_grade')
        if investment_grade:
            queryset = queryset.filter(investment_grade=investment_grade)
            
        series_id = self.request.query_params.get('series')
        if series_id:
            queryset = queryset.filter(series_id=series_id)
        
        is_popular = self.request.query_params.get('popular')
        if is_popular == 'true':
            queryset = queryset.filter(is_popular=True)
            
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price or max_price:
            # 最新の価格分析データでフィルタ
            queryset = queryset.select_related().prefetch_related('price_analysis')
            if min_price:
                queryset = queryset.filter(price_analysis__current_price__gte=min_price)
            if max_price:
                queryset = queryset.filter(price_analysis__current_price__lte=max_price)
            
        return queryset.distinct()
    
    @action(detail=True, methods=['get'])
    def price_analysis(self, request, pk=None):
        """カードの価格分析データを取得"""
        card = self.get_object()
        analysis = card.price_analysis.order_by('-analysis_date').first()
        
        if not analysis:
            return Response({
                'message': '価格分析データがありません'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 30日間の価格推移データ
        price_history = card.price_analysis.filter(
            analysis_date__gte=timezone.now().date() - timedelta(days=30)
        ).order_by('analysis_date').values(
            'analysis_date', 'current_price', 'volume', 'change_24h'
        )
        
        return Response({
            'card_name': card.name_jp,
            'card_id': card.card_id,
            'current_analysis': {
                'current_price': analysis.current_price,
                'median_price': analysis.median_price,
                'change_24h': analysis.change_24h,
                'change_7d': analysis.change_7d,
                'change_30d': analysis.change_30d,
                'volume': analysis.volume,
                'market_factors': analysis.market_factors,
                'prediction_30d': analysis.prediction_30d,
                'confidence_score': analysis.confidence_score,
            },
            'price_history': list(price_history),
            'regional_prices': {
                'jp': analysis.jp_price,
                'us': analysis.us_price,
                'eu': analysis.eu_price,
                'cn': analysis.cn_price,
            }
        })
    
    @action(detail=False, methods=['get'])
    def popular_cards(self, request):
        """人気カード一覧を取得"""
        popular_cards = self.get_queryset().filter(
            is_popular=True
        ).order_by('-popularity_score')[:20]
        
        serializer = self.get_serializer(popular_cards, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def investment_recommendations(self, request):
        """投資推奨カード一覧"""
        recommendations = self.get_queryset().filter(
            investment_grade__in=['S', 'A']
        ).annotate(
            latest_confidence=Max('price_analysis__confidence_score')
        ).order_by('investment_grade', '-latest_confidence')[:30]
        
        serializer = self.get_serializer(recommendations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def trending_cards(self, request):
        """トレンドカード（価格変動上位）"""
        trending = self.get_queryset().select_related().annotate(
            latest_change=Max('price_analysis__change_24h')
        ).filter(
            latest_change__gt=5.0  # 5%以上の変動
        ).order_by('-latest_change')[:20]
        
        serializer = self.get_serializer(trending, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """統計情報"""
        queryset = self.get_queryset()
        
        stats = {
            'total_cards': queryset.count(),
            'popular_cards': queryset.filter(is_popular=True).count(),
            'investment_grade_distribution': dict(
                queryset.values('investment_grade').annotate(
                    count=Count('investment_grade')
                ).values_list('investment_grade', 'count')
            ),
            'rarity_distribution': dict(
                queryset.values('rarity').annotate(
                    count=Count('rarity')
                ).values_list('rarity', 'count')
            ),
            'series_count': queryset.values('series').distinct().count(),
        }
        
        return Response(stats)

# apps/ai_generation/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ContentTemplate, GeneratedContent, ContentGenerationTask
from .serializers import (
    ContentTemplateSerializer, GeneratedContentSerializer, 
    ContentGenerationTaskSerializer, ContentGenerationRequestSerializer
)
from .tasks import generate_content_task, quality_check_task
import uuid

class ContentTemplateViewSet(viewsets.ModelViewSet):
    queryset = ContentTemplate.objects.filter(is_active=True)
    serializer_class = ContentTemplateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        content_type = self.request.query_params.get('content_type')
        if content_type:
            queryset = queryset.filter(content_type=content_type)
        return queryset

class GeneratedContentViewSet(viewsets.ModelViewSet):
    queryset = GeneratedContent.objects.all()
    serializer_class = GeneratedContentSerializer
    permission_classes = [IsAuthenticated]
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        card_id = self.request.query_params.get('card_id')
        if card_id:
            queryset = queryset.filter(card_id=card_id)
            
        return queryset
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """コンテンツを承認"""
        content = self.get_object()
        content.status = 'approved'
        content.reviewed_by = request.user
        content.reviewed_at = timezone.now()
        content.review_comments = request.data.get('comments', '')
        content.approval_score = request.data.get('score', 5)
        content.save()
        
        return Response({'message': 'コンテンツが承認されました'})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """コンテンツを却下"""
        content = self.get_object()
        content.status = 'rejected'
        content.reviewed_by = request.user
        content.reviewed_at = timezone.now()
        content.review_comments = request.data.get('comments', '')
        content.save()
        
        return Response({'message': 'コンテンツが却下されました'})

class ContentGenerationViewSet(viewsets.ViewSet):
    """AIコンテンツ生成API"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def generate_blog_article(self, request):
        """ブログ記事生成"""
        serializer = ContentGenerationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        task_id = str(uuid.uuid4())
        
        # タスク作成
        task = ContentGenerationTask.objects.create(
            task_id=task_id,
            template_id=data['template_id'],
            task_type='single',
            generation_config=data
        )
        
        if data.get('card_id'):
            task.cards.add(data['card_id'])
        
        # 非同期タスクで生成開始
        generate_content_task.delay(
            task_id=task_id,
            card_id=data.get('card_id'),
            template_id=data['template_id'],
            language=data.get('language', 'jp'),
            extra_params=data.get('extra_params', {})
        )
        
        return Response({
            'task_id': task_id,
            'message': 'ブログ記事生成を開始しました',
            'estimated_time': '2-5分'
        })
    
    @action(detail=False, methods=['post'])
    def generate_youtube_script(self, request):
        """YouTube台本生成"""
        serializer = ContentGenerationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        task_id = str(uuid.uuid4())
        
        # YouTubeスクリプト用テンプレート取得
        template = ContentTemplate.objects.filter(
            content_type='youtube_script',
            is_active=True
        ).first()
        
        if not template:
            return Response({
                'error': 'YouTube台本テンプレートが見つかりません'
            }, status=status.HTTP_404_NOT_FOUND)
        
        task = ContentGenerationTask.objects.create(
            task_id=task_id,
            template=template,
            task_type='single',
            generation_config=data
        )
        
        if data.get('card_id'):
            task.cards.add(data['card_id'])
        
        generate_content_task.delay(
            task_id=task_id,
            card_id=data.get('card_id'),
            template_id=template.id,
            extra_params={
                'video_length': data.get('video_length', 10),
                'content_type': 'youtube_script'
            }
        )
        
        return Response({
            'task_id': task_id,
            'message': 'YouTube台本生成を開始しました',
            'estimated_time': '3-7分'
        })
    
    @action(detail=False, methods=['post'])
    def generate_social_posts(self, request):
        """SNS投稿生成"""
        serializer = ContentGenerationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        platforms = data.get('platforms', ['twitter', 'instagram'])
        tasks = []
        
        for platform in platforms:
            task_id = str(uuid.uuid4())
            
            # プラットフォーム用テンプレート取得
            template = ContentTemplate.objects.filter(
                content_type=f'{platform}_post',
                is_active=True
            ).first()
            
            if template:
                task = ContentGenerationTask.objects.create(
                    task_id=task_id,
                    template=template,
                    task_type='single',
                    generation_config=data
                )
                
                if data.get('card_id'):
                    task.cards.add(data['card_id'])
                
                generate_content_task.delay(
                    task_id=task_id,
                    card_id=data.get('card_id'),
                    template_id=template.id,
                    extra_params={'platform': platform}
                )
                
                tasks.append({
                    'platform': platform,
                    'task_id': task_id
                })
        
        return Response({
            'tasks': tasks,
            'message': f'{len(platforms)}プラットフォーム向けコンテンツ生成を開始しました'
        })
    
    @action(detail=False, methods=['post'])
    def generate_all_content(self, request):
        """全プラットフォーム一括生成"""
        serializer = ContentGenerationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        task_id = str(uuid.uuid4())
        
        # バッチタスク作成
        task = ContentGenerationTask.objects.create(
            task_id=task_id,
            task_type='batch',
            total_items=4,  # ブログ、YouTube、Twitter、Instagram
            generation_config=data
        )
        
        if data.get('card_id'):
            task.cards.add(data['card_id'])
        
        # 各プラットフォーム用のサブタスクを開始
        platforms = ['blog_jp', 'youtube_script', 'twitter_post', 'instagram_post']
        for platform in platforms:
            template = ContentTemplate.objects.filter(
                content_type=platform,
                is_active=True
            ).first()
            
            if template:
                generate_content_task.delay(
                    task_id=f"{task_id}_{platform}",
                    card_id=data.get('card_id'),
                    template_id=template.id,
                    parent_task_id=task_id
                )
        
        return Response({
            'task_id': task_id,
            'message': '全プラットフォーム向けコンテンツ一括生成を開始しました',
            'platforms': platforms,
            'estimated_time': '10-20分'
        })
    
    @action(detail=False, methods=['get'])
    def task_status(self, request):
        """タスク状況確認"""
        task_id = request.query_params.get('task_id')
        
        if not task_id:
            return Response({
                'error': 'task_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            task = ContentGenerationTask.objects.get(task_id=task_id)
            serializer = ContentGenerationTaskSerializer(task)
            return Response(serializer.data)
        except ContentGenerationTask.DoesNotExist:
            # Celeryタスクから直接ステータス確認
            from celery.result import AsyncResult
            result = AsyncResult(task_id)
            
            return Response({
                'task_id': task_id,
                'status': result.status,
                'result': result.result if result.ready() else None,
                'progress': 0 if not result.ready() else 100
            })

# apps/content_collection/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ContentSource, CollectedContent
from .serializers import ContentSourceSerializer, CollectedContentSerializer
from .tasks import collect_content_task, analyze_content_task

class ContentSourceViewSet(viewsets.ModelViewSet):
    queryset = ContentSource.objects.all()
    serializer_class = ContentSourceSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'])
    def collect_now(self, request, pk=None):
        """即座にコンテンツ収集を実行"""
        source = self.get_object()
        
        task = collect_content_task.delay(source.id)
        
        return Response({
            'message': f'{source.name}からのコンテンツ収集を開始しました',
            'task_id': task.id
        })
    
    @action(detail=False, methods=['post'])
    def collect_all(self, request):
        """全ソースからの一括収集"""
        active_sources = self.queryset.filter(is_active=True, status='active')
        tasks = []
        
        for source in active_sources:
            task = collect_content_task.delay(source.id)
            tasks.append({
                'source': source.name,
                'task_id': task.id
            })
        
        return Response({
            'message': f'{len(tasks)}ソースからの一括収集を開始しました',
            'tasks': tasks
        })

class CollectedContentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CollectedContent.objects.all()
    serializer_class = CollectedContentSerializer
    permission_classes = [IsAuthenticated]
    ordering = ['-collected_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        source_id = self.request.query_params.get('source')
        if source_id:
            queryset = queryset.filter(source_id=source_id)
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        min_relevance = self.request.query_params.get('min_relevance')
        if min_relevance:
            queryset = queryset.filter(relevance_score__gte=float(min_relevance))
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def use_for_generation(self, request, pk=None):
        """コンテンツを生成に活用"""
        content = self.get_object()
        
        # コンテンツ分析を実行
        analyze_content_task.delay(content.id)
        
        return Response({
            'message': 'コンテンツを分析し、生成に活用する準備を開始しました'
        })