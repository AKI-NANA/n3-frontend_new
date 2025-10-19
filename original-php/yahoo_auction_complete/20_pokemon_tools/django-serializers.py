# apps/cards/serializers.py
from rest_framework import serializers
from .models import PokemonCard, PokemonSeries
from apps.price_tracking.models import PriceAnalysis

class PokemonSeriesSerializer(serializers.ModelSerializer):
    total_cards_count = serializers.SerializerMethodField()
    popular_cards_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PokemonSeries
        fields = [
            'id', 'name', 'name_en', 'name_cn', 'name_es',
            'release_date', 'set_code', 'total_cards',
            'total_cards_count', 'popular_cards_count', 'official_url'
        ]
    
    def get_total_cards_count(self, obj):
        return obj.pokemoncard_set.count()
    
    def get_popular_cards_count(self, obj):
        return obj.pokemoncard_set.filter(is_popular=True).count()

class PriceAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceAnalysis
        fields = [
            'current_price', 'median_price', 'average_price',
            'min_price', 'max_price', 'change_24h', 'change_7d',
            'change_30d', 'volume', 'confidence_score', 'analysis_date'
        ]

class PokemonCardSerializer(serializers.ModelSerializer):
    series_name = serializers.CharField(source='series.name', read_only=True)
    rarity_display = serializers.CharField(source='get_rarity_display', read_only=True)
    investment_grade_display = serializers.CharField(source='get_investment_grade_display', read_only=True)
    current_price = serializers.SerializerMethodField()
    price_change_24h = serializers.SerializerMethodField()
    
    class Meta:
        model = PokemonCard
        fields = [
            'id', 'card_id', 'name_jp', 'name_en', 'card_number',
            'series', 'series_name', 'rarity', 'rarity_display',
            'investment_grade', 'investment_grade_display',
            'is_popular', 'popularity_score', 'investment_potential',
            'image_url', 'thumbnail', 'current_price', 'price_change_24h'
        ]
    
    def get_current_price(self, obj):
        latest_analysis = obj.price_analysis.order_by('-analysis_date').first()
        return float(latest_analysis.current_price) if latest_analysis else 0
    
    def get_price_change_24h(self, obj):
        latest_analysis = obj.price_analysis.order_by('-analysis_date').first()
        return latest_analysis.change_24h if latest_analysis else 0

class PokemonCardDetailSerializer(PokemonCardSerializer):
    series_detail = PokemonSeriesSerializer(source='series', read_only=True)
    latest_price_analysis = serializers.SerializerMethodField()
    generated_contents_count = serializers.SerializerMethodField()
    
    class Meta(PokemonCardSerializer.Meta):
        fields = PokemonCardSerializer.Meta.fields + [
            'name_cn', 'name_es', 'hp', 'card_type', 'pokemon_type',
            'artist', 'flavor_text', 'abilities', 'weaknesses',
            'resistances', 'retreat_cost', 'regulation',
            'series_detail', 'latest_price_analysis', 'metadata',
            'generated_contents_count', 'created_at', 'updated_at'
        ]
    
    def get_latest_price_analysis(self, obj):
        latest = obj.price_analysis.order_by('-analysis_date').first()
        return PriceAnalysisSerializer(latest).data if latest else None
    
    def get_generated_contents_count(self, obj):
        return obj.generated_contents.count()

# apps/ai_generation/serializers.py
from rest_framework import serializers
from .models import ContentTemplate, GeneratedContent, ContentGenerationTask, QualityCheck
from apps.cards.serializers import PokemonCardSerializer

class ContentTemplateSerializer(serializers.ModelSerializer):
    usage_stats = serializers.SerializerMethodField()
    
    class Meta:
        model = ContentTemplate
        fields = [
            'id', 'name', 'content_type', 'description',
            'system_prompt', 'user_prompt_template',
            'ai_model', 'max_tokens', 'temperature',
            'target_keywords', 'target_word_count',
            'quality_threshold', 'usage_count', 'success_rate',
            'average_quality_score', 'is_active', 'usage_stats'
        ]
    
    def get_usage_stats(self, obj):
        recent_contents = obj.generated_contents.filter(
            created_at__gte=timezone.now() - timedelta(days=30)
        )
        return {
            'recent_usage': recent_contents.count(),
            'recent_success_rate': recent_contents.filter(
                quality_score__gte=obj.quality_threshold
            ).count() / max(recent_contents.count(), 1) * 100
        }

class QualityCheckSerializer(serializers.ModelSerializer):
    check_type_display = serializers.CharField(source='get_check_type_display', read_only=True)
    
    class Meta:
        model = QualityCheck
        fields = [
            'check_type', 'check_type_display', 'score', 'passed',
            'details', 'suggestions', 'threshold', 'checked_at'
        ]

class GeneratedContentSerializer(serializers.ModelSerializer):
    card_detail = PokemonCardSerializer(source='card', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    quality_checks = QualityCheckSerializer(many=True, read_only=True)
    word_count = serializers.SerializerMethodField()
    reading_time = serializers.SerializerMethodField()
    
    class Meta:
        model = GeneratedContent
        fields = [
            'id', 'title', 'content', 'summary', 'card', 'card_detail',
            'template', 'template_name', 'status', 'status_display',
            'priority', 'quality_score', 'quality_details',
            'target_keywords', 'keyword_density', 'readability_score',
            'seo_score', 'scheduled_publish', 'published_at',
            'published_urls', 'reviewed_by', 'reviewed_at',
            'review_comments', 'approval_score', 'performance_data',
            'quality_checks', 'word_count', 'reading_time',
            'generation_time', 'token_usage', 'generation_cost',
            'created_at', 'updated_at'
        ]
    
    def get_word_count(self, obj):
        return len(obj.content)
    
    def get_reading_time(self, obj):
        # 400文字/分で計算
        return max(1, len(obj.content) // 400)

class ContentGenerationTaskSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    cards_detail = PokemonCardSerializer(source='cards', many=True, read_only=True)
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = ContentGenerationTask
        fields = [
            'task_id', 'task_type', 'task_type_display', 'status',
            'status_display', 'template', 'template_name',
            'cards', 'cards_detail', 'total_items', 'completed_items',
            'failed_items', 'progress_percentage', 'error_log',
            'started_at', 'completed_at', 'estimated_completion',
            'duration', 'created_at', 'updated_at'
        ]
    
    def get_duration(self, obj):
        if obj.started_at and obj.completed_at:
            return (obj.completed_at - obj.started_at).total_seconds()
        return None

class ContentGenerationRequestSerializer(serializers.Serializer):
    card_id = serializers.IntegerField(required=False)
    template_id = serializers.IntegerField(required=False)
    language = serializers.ChoiceField(
        choices=['jp', 'en', 'cn', 'es'],
        default='jp'
    )
    platforms = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=['twitter', 'instagram']
    )
    video_length = serializers.IntegerField(default=10, min_value=5, max_value=60)
    extra_params = serializers.DictField(required=False, default=dict)

# apps/content_collection/serializers.py
from rest_framework import serializers
from .models import ContentSource, CollectedContent

class ContentSourceSerializer(serializers.ModelSerializer):
    source_type_display = serializers.CharField(source='get_source_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    collection_stats = serializers.SerializerMethodField()
    
    class Meta:
        model = ContentSource
        fields = [
            'id', 'name', 'source_type', 'source_type_display',
            'url', 'description', 'is_active', 'status', 'status_display',
            'collection_interval_hours', 'max_items_per_collection',
            'keywords', 'exclude_keywords', 'language_filter',
            'last_collected_at', 'total_collected', 'success_rate',
            'collection_stats', 'created_at', 'updated_at'
        ]
    
    def get_collection_stats(self, obj):
        recent_contents = obj.collected_contents.filter(
            collected_at__gte=timezone.now() - timedelta(days=7)
        )
        return {
            'recent_collections': recent_contents.count(),
            'high_quality_content': recent_contents.filter(
                quality_score__gte=0.7
            ).count(),
            'processed_content': recent_contents.filter(
                is_processed=True
            ).count()
        }

class CollectedContentSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source='source.name', read_only=True)
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    content_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = CollectedContent
        fields = [
            'id', 'title', 'content_preview', 'summary', 'url',
            'source', 'source_name', 'content_type', 'content_type_display',
            'language', 'author', 'published_at', 'collected_at',
            'status', 'status_display', 'keywords', 'entities',
            'sentiment_score', 'relevance_score', 'quality_score',
            'view_count', 'like_count', 'share_count', 'comment_count'
        ]
    
    def get_content_preview(self, obj):
        return obj.content[:200] + '...' if len(obj.content) > 200 else obj.content

# apps/publishing/serializers.py
from rest_framework import serializers
from .models import PublishingPlatform, PublishedPost, PublishingSchedule
from apps.ai_generation.serializers import GeneratedContentSerializer

class PublishingPlatformSerializer(serializers.ModelSerializer):
    platform_type_display = serializers.CharField(source='get_platform_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    recent_posts_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PublishingPlatform
        fields = [
            'id', 'name', 'platform_type', 'platform_type_display',
            'base_url', 'description', 'auto_publish', 'status',
            'status_display', 'daily_post_limit', 'rate_limit_per_hour',
            'min_interval_minutes', 'last_post_at', 'total_posts',
            'success_rate', 'recent_posts_count', 'is_active'
        ]
        read_only_fields = ['last_post_at', 'total_posts', 'success_rate']
    
    def get_recent_posts_count(self, obj):
        return obj.published_posts.filter(
            published_at__gte=timezone.now() - timedelta(days=7)
        ).count()

class PublishedPostSerializer(serializers.ModelSerializer):
    content_detail = GeneratedContentSerializer(source='content', read_only=True)
    platform_name = serializers.CharField(source='platform.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    engagement_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = PublishedPost
        fields = [
            'id', 'content', 'content_detail', 'platform', 'platform_name',
            'platform_post_id', 'post_url', 'title', 'categories', 'tags',
            'featured_image_url', 'status', 'status_display',
            'scheduled_at', 'published_at', 'view_count', 'like_count',
            'share_count', 'comment_count', 'engagement_rate',
            'performance_data', 'error_message', 'retry_count'
        ]
    
    def get_engagement_rate(self, obj):
        if obj.view_count > 0:
            total_engagement = obj.like_count + obj.share_count + obj.comment_count
            return (total_engagement / obj.view_count) * 100
        return 0

class PublishingScheduleSerializer(serializers.ModelSerializer):
    platform_name = serializers.CharField(source='platform.name', read_only=True)
    template_name = serializers.CharField(source='content_template.name', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    
    class Meta:
        model = PublishingSchedule
        fields = [
            'id', 'name', 'description', 'platform', 'platform_name',
            'content_template', 'template_name', 'frequency',
            'frequency_display', 'scheduled_time', 'timezone',
            'days_of_week', 'days_of_month', 'card_filters',
            'content_rules', 'is_active', 'start_date', 'end_date',
            'total_executions', 'successful_executions',
            'last_execution', 'next_execution'
        ]

# apps/analytics/serializers.py
from rest_framework import serializers
from .models import ContentPerformance, TrafficSource, RevenueReport, SystemMetrics
from apps.ai_generation.serializers import GeneratedContentSerializer

class ContentPerformanceSerializer(serializers.ModelSerializer):
    content_title = serializers.CharField(source='content.title', read_only=True)
    engagement_rate = serializers.SerializerMethodField()
    revenue_per_view = serializers.SerializerMethodField()
    
    class Meta:
        model = ContentPerformance
        fields = [
            'id', 'content', 'content_title', 'total_views',
            'unique_views', 'total_engagement', 'average_time_on_page',
            'blog_views', 'youtube_views', 'social_engagements',
            'likes', 'shares', 'comments', 'saves',
            'click_through_rate', 'conversion_rate',
            'estimated_revenue', 'ad_revenue', 'affiliate_revenue',
            'search_impressions', 'search_clicks', 'average_position',
            'organic_traffic', 'performance_rank', 'category_rank',
            'improvement_score', 'engagement_rate', 'revenue_per_view',
            'last_updated'
        ]
    
    def get_engagement_rate(self, obj):
        if obj.total_views > 0:
            return (obj.total_engagement / obj.total_views) * 100
        return 0
    
    def get_revenue_per_view(self, obj):
        if obj.total_views > 0:
            return float(obj.estimated_revenue / obj.total_views)
        return 0

class TrafficSourceSerializer(serializers.ModelSerializer):
    source_type_display = serializers.CharField(source='get_source_type_display', read_only=True)
    
    class Meta:
        model = TrafficSource
        fields = [
            'source_type', 'source_type_display', 'source_name',
            'sessions', 'page_views', 'unique_users', 'bounce_rate',
            'conversion_rate', 'revenue', 'date'
        ]

class RevenueReportSerializer(serializers.ModelSerializer):
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    total_costs = serializers.SerializerMethodField()
    
    class Meta:
        model = RevenueReport
        fields = [
            'report_type', 'report_type_display', 'date',
            'total_revenue', 'ad_revenue', 'affiliate_revenue',
            'subscription_revenue', 'other_revenue',
            'content_generation_cost', 'hosting_cost',
            'marketing_cost', 'other_costs', 'total_costs',
            'gross_profit', 'net_profit', 'profit_margin',
            'revenue_per_content', 'cost_per_content', 'roi',
            'previous_period_revenue', 'growth_rate'
        ]
    
    def get_total_costs(self, obj):
        return float(
            obj.content_generation_cost + obj.hosting_cost +
            obj.marketing_cost + obj.other_costs
        )

class SystemMetricsSerializer(serializers.ModelSerializer):
    metric_type_display = serializers.CharField(source='get_metric_type_display', read_only=True)
    
    class Meta:
        model = SystemMetrics
        fields = [
            'metric_type', 'metric_type_display', 'date', 'hour',
            'total_count', 'success_count', 'error_count', 'success_rate',
            'average_processing_time', 'max_processing_time',
            'min_processing_time', 'cpu_usage', 'memory_usage',
            'storage_usage', 'api_calls', 'api_cost', 'details'
        ]