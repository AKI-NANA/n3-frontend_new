from django.db import models
from django.utils import timezone
from django.urls import reverse
import uuid

from apps.cards.models import PokemonCard


class ContentTemplate(models.Model):
    """コンテンツテンプレート"""
    
    TEMPLATE_TYPE_CHOICES = [
        ('blog_analysis', 'ブログ - 相場分析'),
        ('blog_investment', 'ブログ - 投資ガイド'),
        ('blog_news', 'ブログ - ニュース解説'),
        ('youtube_analysis', 'YouTube - 価格分析'),
        ('youtube_review', 'YouTube - カードレビュー'),
        ('youtube_ranking', 'YouTube - ランキング'),
        ('social_alert', 'SNS - 価格アラート'),
        ('social_daily', 'SNS - 日次更新'),
    ]
    
    LANGUAGE_CHOICES = [
        ('ja', '日本語'),
        ('en', '英語'),
        ('zh', '中国語'),
        ('es', 'スペイン語'),
    ]
    
    template_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField('テンプレート名', max_length=100)
    template_type = models.CharField('テンプレートタイプ', max_length=20, choices=TEMPLATE_TYPE_CHOICES)
    language = models.CharField('言語', max_length=5, choices=LANGUAGE_CHOICES, default='ja')
    
    # テンプレートデータ (JSON)
    template_data = models.JSONField('テンプレートデータ', default=dict)
    
    # プロンプト設定
    system_prompt = models.TextField('システムプロンプト', blank=True)
    user_prompt_template = models.TextField('ユーザープロンプトテンプレート')
    
    # 生成設定
    max_tokens = models.PositiveIntegerField('最大トークン数', default=3000)
    temperature = models.DecimalField('Temperature', max_digits=3, decimal_places=2, default=0.7)
    target_keywords = models.JSONField('ターゲットキーワード', default=list)
    
    # メタデータ
    is_active = models.BooleanField('アクティブ', default=True)
    usage_count = models.PositiveIntegerField('使用回数', default=0)
    created_at = models.DateTimeField('作成日時', auto_now_add=True)
    updated_at = models.DateTimeField('更新日時', auto_now=True)
    
    class Meta:
        db_table = 'content_templates'
        verbose_name = 'コンテンツテンプレート'
        verbose_name_plural = 'コンテンツテンプレート'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['template_type', 'language']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_language_display()})"
    
    def increment_usage(self):
        """使用回数を増加"""
        self.usage_count += 1
        self.save(update_fields=['usage_count'])


class AIGeneratedContent(models.Model):
    """AI生成コンテンツ"""
    
    CONTENT_TYPE_CHOICES = [
        ('blog', 'ブログ記事'),
        ('youtube_script', 'YouTube台本'),
        ('social', 'SNS投稿'),
        ('email', 'メール'),
        ('report', 'レポート'),
    ]
    
    LANGUAGE_CHOICES = [
        ('ja', '日本語'),
        ('en', '英語'),
        ('zh', '中国語'),
        ('es', 'スペイン語'),
    ]
    
    GENERATION_STATUS_CHOICES = [
        ('queued', 'キュー待ち'),
        ('processing', '生成中'),
        ('completed', '生成完了'),
        ('failed', '生成失敗'),
        ('cancelled', 'キャンセル'),
    ]
    
    PUBLISH_STATUS_CHOICES = [
        ('draft', '下書き'),
        ('pending', '承認待ち'),
        ('approved', '承認済み'),
        ('published', '公開済み'),
        ('failed', '公開失敗'),
        ('archived', 'アーカイブ'),
    ]
    
    QUALITY_GRADE_CHOICES = [
        ('A', 'A級 (優秀)'),
        ('B', 'B級 (良好)'),
        ('C', 'C級 (普通)'),
        ('D', 'D級 (要改善)'),
    ]
    
    content_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    card = models.ForeignKey(PokemonCard, on_delete=models.CASCADE, related_name='ai_contents')
    
    # コンテンツ情報
    content_type = models.CharField('コンテンツタイプ', max_length=20, choices=CONTENT_TYPE_CHOICES)
    language = models.CharField('言語', max_length=5, choices=LANGUAGE_CHOICES, default='ja')
    title = models.CharField('タイトル', max_length=300)
    content = models.TextField('コンテンツ')
    
    # メタデータ (JSON)
    metadata = models.JSONField('メタデータ', default=dict)
    
    # テンプレート関連
    template = models.ForeignKey(ContentTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    template_version = models.CharField('テンプレートバージョン', max_length=20, blank=True)
    
    # 品質管理
    quality_score = models.DecimalField('品質スコア', max_digits=5, decimal_places=2, null=True, blank=True)
    quality_grade = models.CharField('品質グレード', max_length=1, choices=QUALITY_GRADE_CHOICES, blank=True)
    quality_details = models.JSONField('品質詳細', default=dict, blank=True)
    
    # 生成ステータス
    generation_status = models.CharField('生成ステータス', max_length=20, choices=GENERATION_STATUS_CHOICES, default='queued')
    publish_status = models.CharField('公開ステータス', max_length=20, choices=PUBLISH_STATUS_CHOICES, default='draft')
    
    # AI生成情報
    ai_model = models.CharField('AIモデル', max_length=50, default='gpt-4')
    tokens_used = models.PositiveIntegerField('使用トークン数', null=True, blank=True)
    generation_cost = models.DecimalField('生成コスト', max_digits=8, decimal_places=4, null=True, blank=True)
    
    # エラー情報
    error_message = models.TextField('エラーメッセージ', blank=True)
    retry_count = models.PositiveIntegerField('リトライ回数', default=0)
    
    # 承認フロー
    requires_approval = models.BooleanField('承認必要', default=True)
    approved_by = models.CharField('承認者', max_length=100, blank=True)
    approved_at = models.DateTimeField('承認日時', null=True, blank=True)
    approval_notes = models.TextField('承認メモ', blank=True)
    
    # タイムスタンプ
    created_at = models.DateTimeField('作成日時', auto_now_add=True)
    updated_at = models.DateTimeField('更新日時', auto_now=True)
    generated_at = models.DateTimeField('生成完了日時', null=True, blank=True)
    
    class Meta:
        db_table = 'ai_generated_content'
        verbose_name = 'AI生成コンテンツ'
        verbose_name_plural = 'AI生成コンテンツ'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['card', 'content_type']),
            models.Index(fields=['generation_status']),
            models.Index(fields=['publish_status']),
            models.Index(fields=['language']),
            models.Index(fields=['quality_grade']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.card.name_jp})"
    
    def get_absolute_url(self):
        return reverse('ai_content:detail', kwargs={'content_id': self.content_id})
    
    @property
    def word_count(self):
        """文字数を計算"""
        return len(self.content)
    
    @property
    def estimated_reading_time(self):
        """推定読了時間（分）"""
        # 日本語: 400文字/分, 英語: 200語/分で計算
        if self.language == 'ja':
            return max(1, self.word_count // 400)
        else:
            return max(1, len(self.content.split()) // 200)
    
    def mark_as_completed(self):
        """生成完了としてマーク"""
        self.generation_status = 'completed'
        self.generated_at = timezone.now()
        self.save(update_fields=['generation_status', 'generated_at'])
    
    def approve(self, approver_name, notes=''):
        """コンテンツを承認"""
        self.publish_status = 'approved'
        self.approved_by = approver_name
        self.approved_at = timezone.now()
        self.approval_notes = notes
        self.save(update_fields=['publish_status', 'approved_by', 'approved_at', 'approval_notes'])


class ContentGenerationTask(models.Model):
    """コンテンツ生成タスク管理"""
    
    TASK_STATUS_CHOICES = [
        ('pending', '待機中'),
        ('running', '実行中'),
        ('completed', '完了'),
        ('failed', '失敗'),
        ('cancelled', 'キャンセル'),
    ]
    
    PRIORITY_CHOICES = [
        (1, '低'),
        (2, '通常'),
        (3, '高'),
        (4, '緊急'),
    ]
    
    task_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    celery_task_id = models.CharField('CeleryタスクID', max_length=255, blank=True)
    
    # タスク詳細
    card = models.ForeignKey(PokemonCard, on_delete=models.CASCADE)
    content_type = models.CharField('コンテンツタイプ', max_length=20)
    language = models.CharField('言語', max_length=5, default='ja')
    template = models.ForeignKey(ContentTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    
    # 実行情報
    status = models.CharField('ステータス', max_length=20, choices=TASK_STATUS_CHOICES, default='pending')
    priority = models.IntegerField('優先度', choices=PRIORITY_CHOICES, default=2)
    
    # 結果
    generated_content = models.ForeignKey(AIGeneratedContent, on_delete=models.SET_NULL, null=True, blank=True)
    error_message = models.TextField('エラーメッセージ', blank=True)
    
    # 実行時間
    scheduled_at = models.DateTimeField('実行予定日時', null=True, blank=True)
    started_at = models.DateTimeField('開始日時', null=True, blank=True)
    completed_at = models.DateTimeField('完了日時', null=True, blank=True)
    
    # メタデータ
    created_at = models.DateTimeField('作成日時', auto_now_add=True)
    updated_at = models.DateTimeField('更新日時', auto_now=True)
    
    class Meta:
        db_table = 'content_generation_tasks'
        verbose_name = 'コンテンツ生成タスク'
        verbose_name_plural = 'コンテンツ生成タスク'
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['scheduled_at']),
            models.Index(fields=['card']),
        ]
    
    def __str__(self):
        return f"タスク: {self.card.name_jp} - {self.content_type} ({self.get_status_display()})"
    
    @property
    def execution_time(self):
        """実行時間を計算"""
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None
    
    def mark_as_running(self):
        """実行中としてマーク"""
        self.status = 'running'
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at'])
    
    def mark_as_completed(self, content=None):
        """完了としてマーク"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if content:
            self.generated_content = content
        self.save(update_fields=['status', 'completed_at', 'generated_content'])
    
    def mark_as_failed(self, error_message=''):
        """失敗としてマーク"""
        self.status = 'failed'
        self.error_message = error_message
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'error_message', 'completed_at'])


class ContentPerformanceMetrics(models.Model):
    """コンテンツパフォーマンス指標"""
    
    content = models.OneToOneField(AIGeneratedContent, on_delete=models.CASCADE, related_name='performance')
    
    # 基本指標
    views = models.PositiveIntegerField('ビュー数', default=0)
    unique_visitors = models.PositiveIntegerField('ユニークビジター', default=0)
    bounce_rate = models.DecimalField('直帰率', max_digits=5, decimal_places=2, default=0.00)
    avg_time_on_page = models.DurationField('平均滞在時間', null=True, blank=True)
    
    # エンゲージメント指標
    social_shares = models.PositiveIntegerField('SNSシェア数', default=0)
    comments = models.PositiveIntegerField('コメント数', default=0)
    likes = models.PositiveIntegerField('いいね数', default=0)
    
    # SEO指標
    search_impressions = models.PositiveIntegerField('検索表示回数', default=0)
    search_clicks = models.PositiveIntegerField('検索クリック数', default=0)
    average_position = models.DecimalField('平均検索順位', max_digits=5, decimal_places=2, null=True, blank=True)
    
    # 収益指標
    conversion_rate = models.DecimalField('コンバージョン率', max_digits=5, decimal_places=2, default=0.00)
    revenue = models.DecimalField('収益', max_digits=10, decimal_places=2, default=0.00)
    
    # 更新日時
    last_updated = models.DateTimeField('最終更新日時', auto_now=True)
    created_at = models.DateTimeField('作成日時', auto_now_add=True)
    
    class Meta:
        db_table = 'content_performance_metrics'
        verbose_name = 'コンテンツパフォーマンス'
        verbose_name_plural = 'コンテンツパフォーマンス'
    
    def __str__(self):
        return f"パフォーマンス: {self.content.title}"
    
    @property
    def ctr(self):
        """クリック率を計算"""
        if self.search_impressions > 0:
            return (self.search_clicks / self.search_impressions) * 100
        return 0.0
    
    @property
    def engagement_score(self):
        """エンゲージメントスコアを計算"""
        if self.views == 0:
            return 0.0
        
        # 重み付きスコア計算
        share_weight = 3.0
        comment_weight = 2.0
        like_weight = 1.0
        
        engagement = (
            (self.social_shares * share_weight) +
            (self.comments * comment_weight) +
            (self.likes * like_weight)
        ) / self.views * 100
        
        return min(100.0, engagement)


class ContentFeedback(models.Model):
    """コンテンツフィードバック"""
    
    FEEDBACK_TYPE_CHOICES = [
        ('quality', '品質評価'),
        ('accuracy', '正確性'),
        ('readability', '読みやすさ'),
        ('usefulness', '有用性'),
        ('general', '一般的なフィードバック'),
    ]
    
    RATING_CHOICES = [
        (1, '★☆☆☆☆'),
        (2, '★★☆☆☆'),
        (3, '★★★☆☆'),
        (4, '★★★★☆'),
        (5, '★★★★★'),
    ]
    
    feedback_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    content = models.ForeignKey(AIGeneratedContent, on_delete=models.CASCADE, related_name='feedbacks')
    
    # フィードバック詳細
    feedback_type = models.CharField('フィードバック種別', max_length=20, choices=FEEDBACK_TYPE_CHOICES)
    rating = models.IntegerField('評価', choices=RATING_CHOICES)
    comment = models.TextField('コメント', blank=True)
    
    # フィードバック提供者
    reviewer_name = models.CharField('レビュアー名', max_length=100, blank=True)
    reviewer_email = models.EmailField('レビュアーメール', blank=True)
    
    # メタデータ
    is_anonymous = models.BooleanField('匿名', default=True)
    is_processed = models.BooleanField('処理済み', default=False)
    created_at = models.DateTimeField('作成日時', auto_now_add=True)
    
    class Meta:
        db_table = 'content_feedback'
        verbose_name = 'コンテンツフィードバック'
        verbose_name_plural = 'コンテンツフィードバック'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['content', 'feedback_type']),
            models.Index(fields=['is_processed']),
        ]
    
    def __str__(self):
        return f"フィードバック: {self.content.title} - {self.get_rating_display()}"


class ContentOptimizationSuggestion(models.Model):
    """コンテンツ最適化提案"""
    
    SUGGESTION_TYPE_CHOICES = [
        ('seo', 'SEO最適化'),
        ('readability', '可読性向上'),
        ('engagement', 'エンゲージメント向上'),
        ('accuracy', '正確性改善'),
        ('structure', '構造改善'),
    ]
    
    STATUS_CHOICES = [
        ('pending', '未対応'),
        ('in_progress', '対応中'),
        ('completed', '完了'),
        ('rejected', '却下'),
    ]
    
    content = models.ForeignKey(AIGeneratedContent, on_delete=models.CASCADE, related_name='optimization_suggestions')
    
    # 提案詳細
    suggestion_type = models.CharField('提案種別', max_length=20, choices=SUGGESTION_TYPE_CHOICES)
    title = models.CharField('提案タイトル', max_length=200)
    description = models.TextField('提案内容')
    
    # 実装詳細
    current_text = models.TextField('現在のテキスト', blank=True)
    suggested_text = models.TextField('提案テキスト', blank=True)
    
    # 優先度・ステータス
    priority = models.IntegerField('優先度', choices=ContentGenerationTask.PRIORITY_CHOICES, default=2)
    status = models.CharField('ステータス', max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # 処理情報
    assigned_to = models.CharField('担当者', max_length=100, blank=True)
    processed_at = models.DateTimeField('処理日時', null=True, blank=True)
    processing_notes = models.TextField('処理メモ', blank=True)
    
    # メタデータ
    created_at = models.DateTimeField('作成日時', auto_now_add=True)
    updated_at = models.DateTimeField('更新日時', auto_now=True)
    
    class Meta:
        db_table = 'content_optimization_suggestions'
        verbose_name = 'コンテンツ最適化提案'
        verbose_name_plural = 'コンテンツ最適化提案'
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['content', 'suggestion_type']),
            models.Index(fields=['status', 'priority']),
        ]
    
    def __str__(self):
        return f"最適化提案: {self.title}"
    
    def mark_as_completed(self, processor_name, notes=''):
        """完了としてマーク"""
        self.status = 'completed'
        self.assigned_to = processor_name
        self.processed_at = timezone.now()
        self.processing_notes = notes
        self.save(update_fields=['status', 'assigned_to', 'processed_at', 'processing_notes'])