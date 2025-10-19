# apps/content_collection/models.py
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User

class ContentSource(models.Model):
    """コンテンツ収集元"""
    SOURCE_TYPES = [
        ('youtube', 'YouTube'),
        ('blog', 'ブログ'),
        ('news', 'ニュースサイト'),
        ('forum', 'フォーラム'),
        ('social', 'SNS'),
        ('official', '公式サイト'),
        ('marketplace', 'マーケットプレイス'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'アクティブ'),
        ('inactive', '非アクティブ'),
        ('error', 'エラー'),
        ('maintenance', 'メンテナンス'),
    ]
    
    name = models.CharField(max_length=200, verbose_name="収集元名")
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    url = models.URLField(verbose_name="URL")
    description = models.TextField(blank=True, verbose_name="説明")
    
    # 収集設定
    is_active = models.BooleanField(default=True)
    collection_config = models.JSONField(default=dict, verbose_name="収集設定")
    collection_interval_hours = models.IntegerField(default=6, verbose_name="収集間隔（時間）")
    max_items_per_collection = models.IntegerField(default=50, verbose_name="1回あたり最大収集数")
    
    # フィルタリング
    keywords = models.JSONField(default=list, verbose_name="キーワード")
    exclude_keywords = models.JSONField(default=list, verbose_name="除外キーワード")
    language_filter = models.CharField(max_length=10, default='ja', verbose_name="言語フィルター")
    
    # 認証・API設定
    api_key = models.CharField(max_length=200, blank=True, verbose_name="APIキー")
    api_secret = models.CharField(max_length=200, blank=True, verbose_name="APIシークレット")
    auth_token = models.TextField(blank=True, verbose_name="認証トークン")
    
    # 統計・ステータス
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    last_collected_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True, verbose_name="最終エラー")
    total_collected = models.IntegerField(default=0, verbose_name="総収集数")
    success_rate = models.FloatField(default=0.0, verbose_name="成功率")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "コンテンツ収集元"
        verbose_name_plural = "コンテンツ収集元"
    
    def __str__(self):
        return f"{self.name} ({self.source_type})"

class CollectedContent(models.Model):
    """収集されたコンテンツ"""
    CONTENT_TYPES = [
        ('article', '記事'),
        ('video', '動画'),
        ('post', '投稿'),
        ('comment', 'コメント'),
        ('review', 'レビュー'),
        ('news', 'ニュース'),
        ('tutorial', 'チュートリアル'),
        ('analysis', '分析'),
    ]
    
    STATUS_CHOICES = [
        ('new', '新規'),
        ('processing', '処理中'),
        ('processed', '処理済み'),
        ('error', 'エラー'),
        ('ignored', '無視'),
    ]
    
    source = models.ForeignKey(ContentSource, on_delete=models.CASCADE, related_name='collected_contents')
    
    # 基本情報
    title = models.CharField(max_length=500)
    content = models.TextField()
    summary = models.TextField(blank=True, verbose_name="要約")
    url = models.URLField()
    original_id = models.CharField(max_length=100, blank=True, verbose_name="元ID")
    
    # メタデータ
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES, default='article')
    language = models.CharField(max_length=10, default='ja', verbose_name="言語")
    author = models.CharField(max_length=200, blank=True, verbose_name="著者")
    published_at = models.DateTimeField(verbose_name="公開日時")
    collected_at = models.DateTimeField(auto_now_add=True, verbose_name="収集日時")
    
    # 分析データ
    keywords = models.JSONField(default=list, verbose_name="抽出キーワード")
    entities = models.JSONField(default=list, verbose_name="エンティティ")
    sentiment_score = models.FloatField(default=0.0, verbose_name="感情分析スコア")
    relevance_score = models.FloatField(default=0.0, verbose_name="関連度スコア")
    quality_score = models.FloatField(default=0.0, verbose_name="品質スコア")
    
    # 処理状況
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    is_processed = models.BooleanField(default=False)
    processing_errors = models.JSONField(default=list, verbose_name="処理エラー")
    
    # 統計情報
    view_count = models.IntegerField(default=0, verbose_name="閲覧数")
    like_count = models.IntegerField(default=0, verbose_name="いいね数")
    share_count = models.IntegerField(default=0, verbose_name="シェア数")
    comment_count = models.IntegerField(default=0, verbose_name="コメント数")
    
    # システム情報
    content_hash = models.CharField(max_length=64, unique=True, verbose_name="コンテンツハッシュ")
    extracted_data = models.JSONField(default=dict, verbose_name="抽出データ")
    
    class Meta:
        unique_together = ['source', 'url']
        indexes = [
            models.Index(fields=['collected_at']),
            models.Index(fields=['relevance_score']),
            models.Index(fields=['quality_score']),
            models.Index(fields=['status']),
            models.Index(fields=['content_hash']),
        ]
        verbose_name = "収集コンテンツ"
        verbose_name_plural = "収集コンテンツ"
    
    def __str__(self):
        return f"{self.title[:50]}..."

# apps/ai_generation/models.py
from django.db import models
from django.utils import timezone
from apps.cards.models import PokemonCard
from apps.content_collection.models import CollectedContent

class ContentTemplate(models.Model):
    """コンテンツテンプレート"""
    CONTENT_TYPES = [
        ('blog_jp', '日本語ブログ'),
        ('blog_en', '英語ブログ'),
        ('blog_cn', '中国語ブログ'),
        ('blog_es', 'スペイン語ブログ'),
        ('youtube_script', 'YouTube台本'),
        ('twitter_post', 'Twitter投稿'),
        ('instagram_post', 'Instagram投稿'),
        ('facebook_post', 'Facebook投稿'),
        ('tiktok_script', 'TikTok台本'),
        ('email_newsletter', 'メール配信'),
    ]
    
    name = models.CharField(max_length=200, verbose_name="テンプレート名")
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    description = models.TextField(blank=True, verbose_name="説明")
    
    # プロンプト設定
    system_prompt = models.TextField(verbose_name="システムプロンプト")
    user_prompt_template = models.TextField(verbose_name="ユーザープロンプトテンプレート")
    
    # AI設定
    ai_model = models.CharField(max_length=50, default='gpt-4', verbose_name="AIモデル")
    max_tokens = models.IntegerField(default=2000, verbose_name="最大トークン数")
    temperature = models.FloatField(default=0.7, verbose_name="Temperature")
    top_p = models.FloatField(default=1.0, verbose_name="Top P")
    frequency_penalty = models.FloatField(default=0.0, verbose_name="頻度ペナルティ")
    presence_penalty = models.FloatField(default=0.0, verbose_name="存在ペナルティ")
    
    # SEO・品質設定
    target_keywords = models.JSONField(default=list, verbose_name="対象キーワード")
    target_word_count = models.IntegerField(default=3000, verbose_name="目標文字数")
    quality_threshold = models.FloatField(default=0.7, verbose_name="品質閾値")
    seo_requirements = models.JSONField(default=dict, verbose_name="SEO要件")
    
    # 使用統計
    usage_count = models.IntegerField(default=0, verbose_name="使用回数")
    success_rate = models.FloatField(default=0.0, verbose_name="成功率")
    average_quality_score = models.FloatField(default=0.0, verbose_name="平均品質スコア")
    
    # 設定
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "コンテンツテンプレート"
        verbose_name_plural = "コンテンツテンプレート"
    
    def __str__(self):
        return f"{self.name} ({self.content_type})"

class GeneratedContent(models.Model):
    """生成されたコンテンツ"""
    STATUS_CHOICES = [
        ('draft', '下書き'),
        ('generating', '生成中'),
        ('generated', '生成完了'),
        ('review', 'レビュー中'),
        ('approved', '承認済み'),
        ('published', '公開済み'),
        ('rejected', '却下'),
        ('error', 'エラー'),
    ]
    
    PRIORITY_CHOICES = [
        (1, '低'),
        (2, '中'),
        (3, '高'),
        (4, '緊急'),
    ]
    
    # 基本情報
    title = models.CharField(max_length=500, verbose_name="タイトル")
    content = models.TextField(verbose_name="コンテンツ")
    summary = models.TextField(blank=True, verbose_name="要約")
    
    # 関連データ
    card = models.ForeignKey(PokemonCard, on_delete=models.CASCADE, null=True, blank=True, related_name='generated_contents')
    template = models.ForeignKey(ContentTemplate, on_delete=models.CASCADE, related_name='generated_contents')
    source_contents = models.ManyToManyField(CollectedContent, blank=True, verbose_name="元コンテンツ")
    
    # 生成設定
    generation_config = models.JSONField(default=dict, verbose_name="生成設定")
    source_data = models.JSONField(default=dict, verbose_name="ソースデータ")
    generation_prompt = models.TextField(blank=True, verbose_name="使用プロンプト")
    
    # ステータス・品質
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    priority = models.IntegerField(choices=PRIORITY_CHOICES, default=2, verbose_name="優先度")
    quality_score = models.FloatField(default=0.0, verbose_name="品質スコア")
    quality_details = models.JSONField(default=dict, verbose_name="品質詳細")
    
    # SEO・分析
    target_keywords = models.JSONField(default=list, verbose_name="対象キーワード")
    keyword_density = models.JSONField(default=dict, verbose_name="キーワード密度")
    readability_score = models.FloatField(default=0.0, verbose_name="可読性スコア")
    seo_score = models.FloatField(default=0.0, verbose_name="SEOスコア")
    
    # 公開・スケジュール
    scheduled_publish = models.DateTimeField(null=True, blank=True, verbose_name="公開予定日時")
    published_at = models.DateTimeField(null=True, blank=True, verbose_name="公開日時")
    published_urls = models.JSONField(default=list, verbose_name="公開URL")
    
    # 承認・レビュー
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_contents')
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name="レビュー日時")
    review_comments = models.TextField(blank=True, verbose_name="レビューコメント")
    approval_score = models.IntegerField(default=0, verbose_name="承認スコア")
    
    # パフォーマンス
    performance_data = models.JSONField(default=dict, verbose_name="パフォーマンスデータ")
    engagement_metrics = models.JSONField(default=dict, verbose_name="エンゲージメント指標")
    
    # システム情報
    generation_time = models.FloatField(default=0.0, verbose_name="生成時間（秒）")
    token_usage = models.JSONField(default=dict, verbose_name="トークン使用量")
    generation_cost = models.DecimalField(max_digits=8, decimal_places=4, default=0, verbose_name="生成コスト")
    error_details = models.JSONField(default=dict, verbose_name="エラー詳細")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    generated_at = models.DateTimeField(auto_now_add=True, verbose_name="生成日時")
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['quality_score']),
            models.Index(fields=['scheduled_publish']),
            models.Index(fields=['published_at']),
            models.Index(fields=['card']),
        ]
        verbose_name = "生成コンテンツ"
        verbose_name_plural = "生成コンテンツ"
    
    def __str__(self):
        return f"{self.title[:50]}... ({self.status})"

class ContentGenerationTask(models.Model):
    """コンテンツ生成タスク"""
    TASK_TYPES = [
        ('single', '単一生成'),
        ('batch', 'バッチ生成'),
        ('scheduled', 'スケジュール生成'),
        ('triggered', 'トリガー生成'),
    ]
    
    TASK_STATUS_CHOICES = [
        ('pending', '待機中'),
        ('running', '実行中'),
        ('completed', '完了'),
        ('failed', '失敗'),
        ('cancelled', 'キャンセル'),
        ('retrying', '再試行中'),
    ]
    
    task_id = models.CharField(max_length=100, unique=True, verbose_name="タスクID")
    task_type = models.CharField(max_length=20, choices=TASK_TYPES, default='single')
    status = models.CharField(max_length=20, choices=TASK_STATUS_CHOICES, default='pending')
    
    # 設定
    template = models.ForeignKey(ContentTemplate, on_delete=models.CASCADE)
    cards = models.ManyToManyField(PokemonCard, blank=True)
    generation_config = models.JSONField(default=dict, verbose_name="生成設定")
    
    # 進捗
    total_items = models.IntegerField(default=1, verbose_name="総アイテム数")
    completed_items = models.IntegerField(default=0, verbose_name="完了アイテム数")
    failed_items = models.IntegerField(default=0, verbose_name="失敗アイテム数")
    progress_percentage = models.FloatField(default=0.0, verbose_name="進捗率")
    
    # 結果
    generated_contents = models.ManyToManyField(GeneratedContent, blank=True)
    error_log = models.JSONField(default=list, verbose_name="エラーログ")
    
    # 時間
    started_at = models.DateTimeField(null=True, blank=True, verbose_name="開始時刻")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="完了時刻")
    estimated_completion = models.DateTimeField(null=True, blank=True, verbose_name="完了予定時刻")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "コンテンツ生成タスク"
        verbose_name_plural = "コンテンツ生成タスク"
    
    def __str__(self):
        return f"Task {self.task_id} ({self.status})"
    
    def update_progress(self):
        """進捗率を更新"""
        if self.total_items > 0:
            self.progress_percentage = (self.completed_items / self.total_items) * 100
            self.save()

class QualityCheck(models.Model):
    """品質チェック結果"""
    CHECK_TYPES = [
        ('plagiarism', '盗用チェック'),
        ('readability', '可読性'),
        ('seo', 'SEO最適化'),
        ('grammar', '文法チェック'),
        ('keyword_density', 'キーワード密度'),
        ('content_length', 'コンテンツ長'),
        ('duplicate', '重複チェック'),
        ('spam', 'スパム検出'),
        ('ai_detection', 'AI検出'),
    ]
    
    content = models.ForeignKey(GeneratedContent, on_delete=models.CASCADE, related_name='quality_checks')
    check_type = models.CharField(max_length=20, choices=CHECK_TYPES)
    
    # 結果
    score = models.FloatField(verbose_name="スコア")  # 0-1の範囲
    passed = models.BooleanField(verbose_name="合格")
    details = models.JSONField(default=dict, verbose_name="詳細結果")
    suggestions = models.JSONField(default=list, verbose_name="改善提案")
    
    # 設定
    threshold = models.FloatField(default=0.7, verbose_name="閾値")
    check_config = models.JSONField(default=dict, verbose_name="チェック設定")
    
    checked_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['content', 'check_type']
        verbose_name = "品質チェック"
        verbose_name_plural = "品質チェック"
    
    def __str__(self):
        return f"{self.content.title[:30]}... - {self.get_check_type_display()}: {self.score:.2f}"