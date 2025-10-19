# apps/ai_generation/models.py
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import User
import uuid
import json


class ContentTemplate(models.Model):
    """コンテンツテンプレート"""
    CONTENT_TYPES = [
        ('blog_jp', '日本語ブログ'),
        ('blog_en', '英語ブログ'),
        ('blog_cn', '中国語ブログ'),
        ('blog_es', 'スペイン語ブログ'),
        ('youtube_script', 'YouTube台本'),
        ('youtube_shorts', 'YouTubeショート'),
        ('twitter_post', 'Twitter投稿'),
        ('twitter_thread', 'Twitterスレッド'),
        ('instagram_post', 'Instagram投稿'),
        ('instagram_story', 'Instagramストーリー'),
        ('tiktok_script', 'TikTok台本'),
        ('facebook_post', 'Facebook投稿'),
        ('linkedin_article', 'LinkedIn記事'),
        ('pinterest_description', 'Pinterest説明'),
        ('email_newsletter', 'メールニュースレター'),
    ]
    
    CATEGORY_CHOICES = [
        ('price_analysis', '価格分析'),
        ('card_review', 'カードレビュー'),
        ('market_trend', '市場トレンド'),
        ('investment_guide', '投資ガイド'),
        ('news_summary', 'ニュース要約'),
        ('tutorial', 'チュートリアル'),
        ('comparison', '比較記事'),
        ('prediction', '予測記事'),
        ('beginner_guide', '初心者ガイド'),
        ('expert_analysis', '専門家分析'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name="テンプレート名")
    content_type = models.CharField(max_length=30, choices=CONTENT_TYPES)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    
    # プロンプト設定
    system_prompt = models.TextField(verbose_name="システムプロンプト")
    user_prompt_template = models.TextField(verbose_name="ユーザープロンプトテンプレート")
    
    # AI設定
    max_tokens = models.IntegerField(default=3000, verbose_name="最大トークン数")
    temperature = models.FloatField(
        default=0.7,
        validators=[MinValueValidator(0.0), MaxValueValidator(2.0)],
        verbose_name="創造性"
    )
    top_p = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        verbose_name="多様性"
    )
    frequency_penalty = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(-2.0), MaxValueValidator(2.0)],
        verbose_name="繰り返し抑制"
    )
    presence_penalty = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(-2.0), MaxValueValidator(2.0)],
        verbose_name="新規性促進"
    )
    
    # ターゲット設定
    target_keywords = models.JSONField(default=list, verbose_name="対象キーワード")
    target_audience = models.CharField(max_length=100, blank=True, verbose_name="対象読者")
    tone_style = models.CharField(
        max_length=20,
        choices=[
            ('formal', '丁寧'),
            ('casual', 'カジュアル'),
            ('professional', 'プロフェッショナル'),
            ('friendly', 'フレンドリー'),
            ('expert', '専門的'),
            ('beginner', '初心者向け'),
        ],
        default='casual',
        verbose_name="文体"
    )
    
    # SEO設定
    seo_title_template = models.CharField(max_length=200, blank=True, verbose_name="SEOタイトルテンプレート")
    meta_description_template = models.CharField(max_length=300, blank=True, verbose_name="メタ説明テンプレート")
    focus_keyword_template = models.CharField(max_length=100, blank=True, verbose_name="フォーカスキーワードテンプレート")
    
    # 品質設定
    minimum_quality_score = models.FloatField(
        default=70.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="最低品質スコア"
    )
    auto_approve_threshold = models.FloatField(
        default=85.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="自動承認閾値"
    )
    
    # 使用統計
    usage_count = models.IntegerField(default=0, verbose_name="使用回数")
    success_rate = models.FloatField(default=0.0, verbose_name="成功率")
    average_quality = models.FloatField(default=0.0, verbose_name="平均品質")
    average_generation_time = models.FloatField(default=0.0, verbose_name="平均生成時間")
    
    # 状態管理
    is_active = models.BooleanField(default=True, verbose_name="有効")
    is_premium = models.BooleanField(default=False, verbose_name="プレミアム")
    version = models.CharField(max_length=10, default='1.0', verbose_name="バージョン")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        verbose_name = "コンテンツテンプレート"
        verbose_name_plural = "コンテンツテンプレート"
        indexes = [
            models.Index(fields=['content_type']),
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
            models.Index(fields=['success_rate']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.content_type})"
    
    def update_statistics(self, quality_score, generation_time, success=True):
        """統計を更新"""
        self.usage_count += 1
        if success:
            # 平均品質を更新
            if self.average_quality == 0:
                self.average_quality = quality_score
            else:
                self.average_quality = (self.average_quality + quality_score) / 2
            
            # 成功率を更新
            self.success_rate = ((self.success_rate * (self.usage_count - 1)) + 100) / self.usage_count
        else:
            self.success_rate = (self.success_rate * (self.usage_count - 1)) / self.usage_count
        
        # 平均生成時間を更新
        if self.average_generation_time == 0:
            self.average_generation_time = generation_time
        else:
            self.average_generation_time = (self.average_generation_time + generation_time) / 2
        
        self.save(update_fields=['usage_count', 'success_rate', 'average_quality', 'average_generation_time'])


class AIGeneratedContent(models.Model):
    """AI生成コンテンツ"""
    STATUS_CHOICES = [
        ('draft', '下書き'),
        ('generating', '生成中'),
        ('generated', '生成完了'),
        ('quality_check', '品質チェック中'),
        ('approved', '承認済み'),
        ('published', '投稿済み'),
        ('rejected', '却下'),
        ('error', 'エラー'),
        ('scheduled', 'スケジュール済み'),
    ]
    
    QUALITY_LEVELS = [
        ('excellent', '優秀'),
        ('good', '良好'),
        ('average', '平均'),
        ('poor', '低品質'),
        ('failed', '失敗'),
    ]
    
    PRIORITY_LEVELS = [
        ('high', '高'),
        ('normal', '通常'),
        ('low', '低'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(ContentTemplate, on_delete=models.CASCADE, related_name='generated_content')
    
    # コンテンツ情報
    title = models.CharField(max_length=500, verbose_name="タイトル")
    content = models.TextField(verbose_name="コンテンツ")
    excerpt = models.TextField(blank=True, verbose_name="抜粋")
    language = models.CharField(max_length=5, default='ja', verbose_name="言語")
    content_type = models.CharField(max_length=30, verbose_name="コンテンツタイプ")
    
    # SEO情報
    seo_title = models.CharField(max_length=200, blank=True, verbose_name="SEOタイトル")
    meta_description = models.CharField(max_length=300, blank=True, verbose_name="メタ説明")
    focus_keyword = models.CharField(max_length=100, blank=True, verbose_name="フォーカスキーワード")
    keywords = models.JSONField(default=list, verbose_name="キーワード")
    
    # ソースデータ
    source_cards = models.ManyToManyField('cards.PokemonCard', blank=True, related_name='generated_content')
    source_data = models.JSONField(default=dict, verbose_name="ソースデータ")
    input_prompt = models.TextField(blank=True, verbose_name="入力プロンプト")
    
    # 生成情報
    generated_at = models.DateTimeField(auto_now_add=True)
    generation_time = models.FloatField(default=0.0, verbose_name="生成時間（秒）")
    token_usage = models.IntegerField(default=0, verbose_name="使用トークン数")
    generation_cost = models.DecimalField(max_digits=8, decimal_places=6, null=True, blank=True, verbose_name="生成コスト（USD）")
    
    # 状態管理
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='normal')
    
    # 品質情報
    quality_score = models.FloatField(
        null=True, 
        blank=True, 
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="品質スコア"
    )
    quality_level = models.CharField(max_length=20, choices=QUALITY_LEVELS, null=True, blank=True)
    quality_issues = models.JSONField(default=list, verbose_name="品質問題")
    quality_suggestions = models.JSONField(default=list, verbose_name="改善提案")
    
    # スケジュール
    scheduled_publish = models.DateTimeField(null=True, blank=True, verbose_name="投稿予定日時")
    published_at = models.DateTimeField(null=True, blank=True, verbose_name="投稿日時")
    
    # 投稿情報
    published_urls = models.JSONField(default=list, verbose_name="投稿先URL")
    publishing_platforms = models.JSONField(default=list, verbose_name="投稿プラットフォーム")
    
    # パフォーマンス
    view_count = models.IntegerField(default=0, verbose_name="閲覧数")
    engagement_count = models.IntegerField(default=0, verbose_name="エンゲージメント数")
    click_count = models.IntegerField(default=0, verbose_name="クリック数")
    conversion_count = models.IntegerField(default=0, verbose_name="コンバージョン数")
    revenue_generated = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="生成収益")
    
    # 承認・レビュー
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_content')
    approved_at = models.DateTimeField(null=True, blank=True)
    reviewer_comments = models.TextField(blank=True, verbose_name="レビューコメント")
    revision_count = models.IntegerField(default=0, verbose_name="修正回数")
    
    # エラー情報
    error_message = models.TextField(blank=True, verbose_name="エラーメッセージ")
    error_details = models.JSONField(default=dict, verbose_name="エラー詳細")
    
    # メタデータ
    metadata = models.JSONField(default=dict, verbose_name="メタデータ")
    tags = models.JSONField(default=list, verbose_name="タグ")
    word_count = models.IntegerField(default=0, verbose_name="文字数")
    reading_time = models.IntegerField(default=0, verbose_name="読了時間（分）")
    
    # 作成者情報
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_content')
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "AI生成コンテンツ"
        verbose_name_plural = "AI生成コンテンツ"
        ordering = ['-generated_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['quality_level']),
            models.Index(fields=['scheduled_publish']),
            models.Index(fields=['content_type']),
            models.Index(fields=['language']),
            models.Index(fields=['quality_score']),
            models.Index(fields=['generated_at']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.content_type})"
    
    def save(self, *args, **kwargs):
        if not self.word_count and self.content:
            self.word_count = len(self.content.split())
            # 読了時間を計算（日本語: 400-600文字/分、英語: 200-250語/分）
            if self.language == 'ja':
                self.reading_time = max(1, self.word_count // 500)
            else:
                self.reading_time = max(1, len(self.content.split()) // 225)
        super().save(*args, **kwargs)
    
    def can_auto_approve(self):
        """自動承認可能かチェック"""
        if not self.quality_score or not self.template:
            return False
        return self.quality_score >= self.template.auto_approve_threshold
    
    def update_performance_metrics(self, views=0, engagements=0, clicks=0, conversions=0, revenue=0):
        """パフォーマンス指標を更新"""
        self.view_count += views
        self.engagement_count += engagements
        self.click_count += clicks
        self.conversion_count += conversions
        self.revenue_generated += revenue
        self.save(update_fields=[
            'view_count', 'engagement_count', 'click_count', 
            'conversion_count', 'revenue_generated'
        ])


class QualityCheck(models.Model):
    """品質チェック結果"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content = models.ForeignKey(AIGeneratedContent, on_delete=models.CASCADE, related_name='quality_checks')
    
    # 基本品質指標
    plagiarism_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="盗用スコア"
    )
    readability_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="可読性スコア"
    )
    seo_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="SEOスコア"
    )
    spam_risk_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="スパムリスクスコア"
    )
    ai_detection_risk = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="AI検知リスク"
    )
    
    # 詳細品質指標
    grammar_score = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="文法スコア"
    )
    coherence_score = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="一貫性スコア"
    )
    engagement_potential = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="エンゲージメント予測"
    )
    factual_accuracy = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="事実正確性"
    )
    
    # 総合評価
    overall_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        verbose_name="総合スコア"
    )
    passed = models.BooleanField(default=False, verbose_name="合格")
    
    # 詳細分析
    issues_found = models.JSONField(default=list, verbose_name="発見された問題")
    improvement_suggestions = models.JSONField(default=list, verbose_name="改善提案")
    keyword_density = models.JSONField(default=dict, verbose_name="キーワード密度")
    sentiment_analysis = models.JSONField(default=dict, verbose_name="感情分析")
    
    # チェック情報
    checked_at = models.DateTimeField(auto_now_add=True)
    check_duration = models.FloatField(default=0.0, verbose_name="チェック時間（秒）")
    checker_version = models.CharField(max_length=20, default='1.0', verbose_name="チェッカーバージョン")
    
    class Meta:
        verbose_name = "品質チェック"
        verbose_name_plural = "品質チェック"
        ordering = ['-checked_at']
        indexes = [
            models.Index(fields=['overall_score']),
            models.Index(fields=['passed']),
            models.Index(fields=['checked_at']),
        ]
    
    def __str__(self):
        return f"Quality Check - {self.content.title} ({self.overall_score})"
    
    def calculate_overall_score(self):
        """総合スコアを計算"""
        weights = {
            'plagiarism': 0.25,
            'readability': 0.20,
            'seo': 0.15,
            'spam_risk': 0.15,  # 逆スコア（低いほど良い）
            'ai_detection': 0.10,  # 逆スコア
            'grammar': 0.10,
            'coherence': 0.05,
        }
        
        # スパムリスクとAI検知リスクは逆スコア
        spam_adjusted = 100 - self.spam_risk_score
        ai_detection_adjusted = 100 - self.ai_detection_risk
        
        self.overall_score = (
            self.plagiarism_score * weights['plagiarism'] +
            self.readability_score * weights['readability'] +
            self.seo_score * weights['seo'] +
            spam_adjusted * weights['spam_risk'] +
            ai_detection_adjusted * weights['ai_detection'] +
            self.grammar_score * weights['grammar'] +
            self.coherence_score * weights['coherence']
        )
        
        # 合格判定
        self.passed = self.overall_score >= 70.0
        
        self.save(update_fields=['overall_score', 'passed'])
        return self.overall_score


# apps/publishing/models.py
class PublishingPlatform(models.Model):
    """投稿プラットフォーム"""
    PLATFORM_TYPES = [
        ('wordpress', 'WordPress'),
        ('youtube', 'YouTube'),
        ('twitter', 'Twitter/X'),
        ('instagram', 'Instagram'),
        ('tiktok', 'TikTok'),
        ('facebook', 'Facebook'),
        ('linkedin', 'LinkedIn'),
        ('pinterest', 'Pinterest'),
        ('reddit', 'Reddit'),
        ('medium', 'Medium'),
        ('note', 'note'),
        ('hatena', 'はてなブログ'),
        ('ameba', 'アメブロ'),
    ]
    
    CONNECTION_STATUS = [
        ('connected', '接続済み'),
        ('disconnected', '未接続'),
        ('error', 'エラー'),
        ('expired', '期限切れ'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="プラットフォーム名")
    platform_type = models.CharField(max_length=20, choices=PLATFORM_TYPES)
    api_endpoint = models.URLField(blank=True, verbose_name="APIエンドポイント")
    
    # 接続情報
    is_active = models.BooleanField(default=True, verbose_name="アクティブ")
    connection_status = models.CharField(max_length=20, choices=CONNECTION_STATUS, default='disconnected')
    last_connection_check = models.DateTimeField(null=True, blank=True)
    
    # 認証情報（暗号化保存推奨）
    credentials = models.JSONField(default=dict, verbose_name="認証情報")
    
    # 投稿設定
    settings = models.JSONField(default=dict, verbose_name="プラットフォーム設定")
    default_tags = models.JSONField(default=list, verbose_name="デフォルトタグ")
    default_category = models.CharField(max_length=100, blank=True, verbose_name="デフォルトカテゴリ")
    
    # 制限設定
    daily_limit = models.IntegerField(default=10, verbose_name="日次投稿制限")
    hourly_limit = models.IntegerField(default=2, verbose_name="時間投稿制限")
    current_daily_count = models.IntegerField(default=0)
    current_hourly_count = models.IntegerField(default=0)
    last_reset_date = models.DateField(auto_now_add=True)
    last_reset_hour = models.DateTimeField(auto_now_add=True)
    
    # 統計情報
    total_posts = models.IntegerField(default=0, verbose_name="総投稿数")
    successful_posts = models.IntegerField(default=0, verbose_name="成功投稿数")
    failed_posts = models.IntegerField(default=0, verbose_name="失敗投稿数")
    success_rate = models.FloatField(default=0.0, verbose_name="成功率")
    average_engagement = models.FloatField(default=0.0, verbose_name="平均エンゲージメント")
    
    # 収益情報
    estimated_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="推定収益")
    cost_per_post = models.DecimalField(max_digits=6, decimal_places=4, default=0, verbose_name="投稿あたりコスト")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "投稿プラットフォーム"
        verbose_name_plural = "投稿プラットフォーム"
        indexes = [
            models.Index(fields=['platform_type']),
            models.Index(fields=['is_active']),
            models.Index(fields=['connection_status']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.platform_type})"
    
    def can_post_now(self):
        """現在投稿可能かチェック"""
        now = timezone.now()
        
        # 日次制限チェック
        if now.date() != self.last_reset_date:
            self.current_daily_count = 0
            self.last_reset_date = now.date()
            self.save(update_fields=['current_daily_count', 'last_reset_date'])
        
        # 時間制限チェック
        if (now - self.last_reset_hour).total_seconds() >= 3600:
            self.current_hourly_count = 0
            self.last_reset_hour = now
            self.save(update_fields=['current_hourly_count', 'last_reset_hour'])
        
        return (
            self.is_active and 
            self.connection_status == 'connected' and
            self.current_daily_count < self.daily_limit and
            self.current_hourly_count < self.hourly_limit
        )
    
    def increment_post_count(self, success=True):
        """投稿数を増加"""
        self.current_daily_count += 1
        self.current_hourly_count += 1
        self.total_posts += 1
        
        if success:
            self.successful_posts += 1
        else:
            self.failed_posts += 1
        
        # 成功率を更新
        if self.total_posts > 0:
            self.success_rate = (self.successful_posts / self.total_posts) * 100
        
        self.save(update_fields=[
            'current_daily_count', 'current_hourly_count', 'total_posts',
            'successful_posts', 'failed_posts', 'success_rate'
        ])


class PublishedContent(models.Model):
    """投稿済みコンテンツ"""
    STATUS_CHOICES = [
        ('pending', '投稿待ち'),
        ('processing', '投稿中'),
        ('published', '投稿完了'),
        ('failed', '投稿失敗'),
        ('scheduled', 'スケジュール済み'),
        ('cancelled', 'キャンセル'),
        ('draft', '下書き保存'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ai_content = models.ForeignKey(
        'ai_generation.AIGeneratedContent', 
        on_delete=models.CASCADE, 
        related_name='publications'
    )
    platform = models.ForeignKey(PublishingPlatform, on_delete=models.CASCADE, related_name='published_content')
    
    # 投稿情報
    platform_post_id = models.CharField(max_length=200, blank=True, verbose_name="プラットフォーム投稿ID")
    published_url = models.URLField(blank=True, verbose_name="投稿URL")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # スケジュール
    scheduled_at = models.DateTimeField(null=True, blank=True, verbose_name="投稿予定時刻")
    published_at = models.DateTimeField(null=True, blank=True, verbose_name="実際の投稿時刻")
    
    # カスタマイズ内容
    custom_title = models.CharField(max_length=500, blank=True, verbose_name="カスタムタイトル")
    custom_content = models.TextField(blank=True, verbose_name="カスタムコンテンツ")
    custom_tags = models.JSONField(default=list, verbose_name="カスタムタグ")
    custom_settings = models.JSONField(default=dict, verbose_name="カスタム設定")
    
    # エラー情報
    error_message = models.TextField(blank=True, verbose_name="エラーメッセージ")
    error_code = models.CharField(max_length=50, blank=True, verbose_name="エラーコード")
    retry_count = models.IntegerField(default=0, verbose_name="リトライ回数")
    max_retries = models.IntegerField(default=3, verbose_name="最大リトライ回数")
    
    # API応答データ
    response_data = models.JSONField(default=dict, verbose_name="API応答データ")
    
    # パフォーマンスデータ
    performance_data = models.JSONField(default=dict, verbose_name="パフォーマンスデータ")
    
    # メタデータ
    publishing_cost = models.DecimalField(max_digits=6, decimal_places=4, default=0, verbose_name="投稿コスト")
    estimated_reach = models.IntegerField(default=0, verbose_name="推定リーチ")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "投稿済みコンテンツ"
        verbose_name_plural = "投稿済みコンテンツ"
        unique_together = ['ai_content', 'platform']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['scheduled_at']),
            models.Index(fields=['published_at']),
            models.Index(fields=['platform', 'status']),
        ]
    
    def __str__(self):
        return f"{self.ai_content.title} - {self.platform.name}"
    
    def can_retry(self):
        """リトライ可能かチェック"""
        return self.status == 'failed' and self.retry_count < self.max_retries
    
    def increment_retry(self):
        """リトライ回数を増加"""
        self.retry_count += 1
        self.save(update_fields=['retry_count'])


# apps/analytics/models.py
class AnalyticsData(models.Model):
    """分析データ"""
    DATA_TYPES = [
        ('content_performance', 'コンテンツパフォーマンス'),
        ('platform_performance', 'プラットフォームパフォーマンス'),
        ('revenue_tracking', '収益追跡'),
        ('user_behavior', 'ユーザー行動'),
        ('market_analysis', 'マーケット分析'),
        ('competitor_analysis', '競合分析'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    data_type = models.CharField(max_length=30, choices=DATA_TYPES)
    date = models.DateField(verbose_name="データ日付")
    
    # 関連オブジェクト
    content = models.ForeignKey(
        'ai_generation.AIGeneratedContent', 
        on_delete=models.CASCADE, 
        null=True, blank=True,
        related_name='analytics'
    )
    platform = models.ForeignKey(
        'publishing.PublishingPlatform',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='analytics'
    )
    
    # 分析データ
    metrics = models.JSONField(default=dict, verbose_name="指標データ")
    
    # 基本指標
    views = models.IntegerField(default=0, verbose_name="閲覧数")
    engagements = models.IntegerField(default=0, verbose_name="エンゲージメント")
    clicks = models.IntegerField(default=0, verbose_name="クリック数")
    conversions = models.IntegerField(default=0, verbose_name="コンバージョン")
    revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="収益")
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="コスト")
    
    # 計算指標
    engagement_rate = models.FloatField(default=0.0, verbose_name="エンゲージメント率")
    click_through_rate = models.FloatField(default=0.0, verbose_name="クリック率")
    conversion_rate = models.FloatField(default=0.0, verbose_name="コンバージョン率")
    roi = models.FloatField(default=0.0, verbose_name="ROI")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "分析データ"
        verbose_name_plural = "分析データ"
        unique_together = ['data_type', 'date', 'content', 'platform']
        indexes = [
            models.Index(fields=['data_type', 'date']),
            models.Index(fields=['date']),
            models.Index(fields=['revenue']),
            models.Index(fields=['roi']),
        ]
    
    def __str__(self):
        return f"{self.data_type} - {self.date}"
    
    def calculate_rates(self):
        """各種率を計算"""
        if self.views > 0:
            self.engagement_rate = (self.engagements / self.views) * 100
            self.click_through_rate = (self.clicks / self.views) * 100
        
        if self.clicks > 0:
            self.conversion_rate = (self.conversions / self.clicks) * 100
        
        if self.cost > 0:
            self.roi = ((self.revenue - self.cost) / self.cost) * 100
        
        self.save(update_fields=['engagement_rate', 'click_through_rate', 'conversion_rate', 'roi'])