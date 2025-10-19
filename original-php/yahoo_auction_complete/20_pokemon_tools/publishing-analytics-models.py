# apps/publishing/models.py
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from apps.ai_generation.models import GeneratedContent

class PublishingPlatform(models.Model):
    """投稿プラットフォーム"""
    PLATFORM_TYPES = [
        ('wordpress', 'WordPress'),
        ('youtube', 'YouTube'),
        ('twitter', 'Twitter/X'),
        ('instagram', 'Instagram'),
        ('facebook', 'Facebook'),
        ('tiktok', 'TikTok'),
        ('linkedin', 'LinkedIn'),
        ('medium', 'Medium'),
        ('note', 'note'),
        ('qiita', 'Qiita'),
        ('hatena', 'はてなブログ'),
        ('ameblo', 'アメブロ'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'アクティブ'),
        ('inactive', '非アクティブ'),
        ('error', 'エラー'),
        ('maintenance', 'メンテナンス'),
        ('suspended', '停止中'),
    ]
    
    name = models.CharField(max_length=200, verbose_name="プラットフォーム名")
    platform_type = models.CharField(max_length=20, choices=PLATFORM_TYPES)
    base_url = models.URLField(verbose_name="ベースURL")
    description = models.TextField(blank=True, verbose_name="説明")
    
    # 認証設定
    api_key = models.CharField(max_length=500, blank=True, verbose_name="APIキー")
    api_secret = models.CharField(max_length=500, blank=True, verbose_name="APIシークレット")
    access_token = models.TextField(blank=True, verbose_name="アクセストークン")
    refresh_token = models.TextField(blank=True, verbose_name="リフレッシュトークン")
    username = models.CharField(max_length=100, blank=True, verbose_name="ユーザー名")
    password = models.CharField(max_length=200, blank=True, verbose_name="パスワード")
    
    # 投稿設定
    auto_publish = models.BooleanField(default=False, verbose_name="自動投稿")
    default_category = models.CharField(max_length=100, blank=True, verbose_name="デフォルトカテゴリ")
    default_tags = models.JSONField(default=list, verbose_name="デフォルトタグ")
    posting_schedule = models.JSONField(default=dict, verbose_name="投稿スケジュール")
    
    # 制限設定
    daily_post_limit = models.IntegerField(default=10, verbose_name="1日投稿制限")
    rate_limit_per_hour = models.IntegerField(default=5, verbose_name="時間当たり制限")
    min_interval_minutes = models.IntegerField(default=30, verbose_name="最小投稿間隔（分）")
    
    # ステータス・統計
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    last_post_at = models.DateTimeField(null=True, blank=True, verbose_name="最終投稿日時")
    total_posts = models.IntegerField(default=0, verbose_name="総投稿数")
    success_rate = models.FloatField(default=0.0, verbose_name="成功率")
    last_error = models.TextField(blank=True, verbose_name="最終エラー")
    
    # 設定
    is_active = models.BooleanField(default=True)
    platform_config = models.JSONField(default=dict, verbose_name="プラットフォーム設定")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "投稿プラットフォーム"
        verbose_name_plural = "投稿プラットフォーム"
    
    def __str__(self):
        return f"{self.name} ({self.platform_type})"

class PublishedPost(models.Model):
    """投稿済みコンテンツ"""
    STATUS_CHOICES = [
        ('draft', '下書き'),
        ('scheduled', 'スケジュール済み'),
        ('publishing', '投稿中'),
        ('published', '投稿済み'),
        ('failed', '失敗'),
        ('deleted', '削除済み'),
        ('updated', '更新済み'),
    ]
    
    content = models.ForeignKey(GeneratedContent, on_delete=models.CASCADE, related_name='published_posts')
    platform = models.ForeignKey(PublishingPlatform, on_delete=models.CASCADE, related_name='published_posts')
    
    # 投稿情報
    platform_post_id = models.CharField(max_length=200, verbose_name="プラットフォーム投稿ID")
    post_url = models.URLField(verbose_name="投稿URL")
    title = models.CharField(max_length=500, verbose_name="投稿タイトル")
    content_text = models.TextField(verbose_name="投稿内容")
    
    # メタデータ
    categories = models.JSONField(default=list, verbose_name="カテゴリ")
    tags = models.JSONField(default=list, verbose_name="タグ")
    featured_image_url = models.URLField(blank=True, verbose_name="アイキャッチ画像URL")
    
    # ステータス
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    scheduled_at = models.DateTimeField(null=True, blank=True, verbose_name="予定投稿日時")
    published_at = models.DateTimeField(null=True, blank=True, verbose_name="投稿日時")
    
    # 結果・エラー
    response_data = models.JSONField(default=dict, verbose_name="レスポンスデータ")
    error_message = models.TextField(blank=True, verbose_name="エラーメッセージ")
    retry_count = models.IntegerField(default=0, verbose_name="再試行回数")
    
    # パフォーマンス
    performance_data = models.JSONField(default=dict, verbose_name="パフォーマンスデータ")
    view_count = models.IntegerField(default=0, verbose_name="閲覧数")
    like_count = models.IntegerField(default=0, verbose_name="いいね数")
    share_count = models.IntegerField(default=0, verbose_name="シェア数")
    comment_count = models.IntegerField(default=0, verbose_name="コメント数")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['platform', 'platform_post_id']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['published_at']),
            models.Index(fields=['scheduled_at']),
        ]
        verbose_name = "投稿済みコンテンツ"
        verbose_name_plural = "投稿済みコンテンツ"
    
    def __str__(self):
        return f"{self.title[:50]}... on {self.platform.name}"

class PublishingSchedule(models.Model):
    """投稿スケジュール"""
    FREQUENCY_CHOICES = [
        ('once', '一回のみ'),
        ('daily', '毎日'),
        ('weekly', '毎週'),
        ('monthly', '毎月'),
        ('custom', 'カスタム'),
    ]
    
    name = models.CharField(max_length=200, verbose_name="スケジュール名")
    description = models.TextField(blank=True, verbose_name="説明")
    
    # スケジュール設定
    platform = models.ForeignKey(PublishingPlatform, on_delete=models.CASCADE, related_name='schedules')
    content_template = models.ForeignKey('ai_generation.ContentTemplate', on_delete=models.CASCADE)
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, default='daily')
    
    # 時間設定
    scheduled_time = models.TimeField(verbose_name="投稿時刻")
    timezone = models.CharField(max_length=50, default='Asia/Tokyo', verbose_name="タイムゾーン")
    days_of_week = models.JSONField(default=list, verbose_name="曜日指定")  # [0-6], 0=Monday
    days_of_month = models.JSONField(default=list, verbose_name="日付指定")  # [1-31]
    
    # 条件設定
    card_filters = models.JSONField(default=dict, verbose_name="カードフィルター")
    content_rules = models.JSONField(default=dict, verbose_name="コンテンツルール")
    
    # 制御
    is_active = models.BooleanField(default=True, verbose_name="アクティブ")
    start_date = models.DateField(verbose_name="開始日")
    end_date = models.DateField(null=True, blank=True, verbose_name="終了日")
    
    # 統計
    total_executions = models.IntegerField(default=0, verbose_name="総実行回数")
    successful_executions = models.IntegerField(default=0, verbose_name="成功実行回数")
    last_execution = models.DateTimeField(null=True, blank=True, verbose_name="最終実行日時")
    next_execution = models.DateTimeField(null=True, blank=True, verbose_name="次回実行日時")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "投稿スケジュール"
        verbose_name_plural = "投稿スケジュール"
    
    def __str__(self):
        return f"{self.name} - {self.platform.name}"

# apps/analytics/models.py
from django.db import models
from django.utils import timezone
from decimal import Decimal
from apps.cards.models import PokemonCard
from apps.ai_generation.models import GeneratedContent
from apps.publishing.models import PublishedPost

class ContentPerformance(models.Model):
    """コンテンツパフォーマンス"""
    content = models.OneToOneField(GeneratedContent, on_delete=models.CASCADE, related_name='performance')
    
    # 基本指標
    total_views = models.IntegerField(default=0, verbose_name="総閲覧数")
    unique_views = models.IntegerField(default=0, verbose_name="ユニーク閲覧数")
    total_engagement = models.IntegerField(default=0, verbose_name="総エンゲージメント")
    average_time_on_page = models.FloatField(default=0.0, verbose_name="平均滞在時間")
    
    # プラットフォーム別指標
    blog_views = models.IntegerField(default=0, verbose_name="ブログ閲覧数")
    youtube_views = models.IntegerField(default=0, verbose_name="YouTube再生数")
    social_engagements = models.IntegerField(default=0, verbose_name="SNSエンゲージメント")
    
    # 詳細指標
    likes = models.IntegerField(default=0, verbose_name="いいね数")
    shares = models.IntegerField(default=0, verbose_name="シェア数")
    comments = models.IntegerField(default=0, verbose_name="コメント数")
    saves = models.IntegerField(default=0, verbose_name="保存数")
    click_through_rate = models.FloatField(default=0.0, verbose_name="クリック率")
    conversion_rate = models.FloatField(default=0.0, verbose_name="コンバージョン率")
    revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="収益")
    
    date = models.DateField(verbose_name="日付")
    
    class Meta:
        unique_together = ['content_performance', 'source_type', 'date']
        verbose_name = "トラフィックソース"
        verbose_name_plural = "トラフィックソース"
    
    def __str__(self):
        return f"{self.source_name} - {self.sessions} sessions"

class RevenueReport(models.Model):
    """収益レポート"""
    REPORT_TYPES = [
        ('daily', '日別'),
        ('weekly', '週別'),
        ('monthly', '月別'),
        ('quarterly', '四半期別'),
        ('yearly', '年別'),
    ]
    
    report_type = models.CharField(max_length=10, choices=REPORT_TYPES)
    date = models.DateField(verbose_name="対象日")
    
    # 総収益
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="総収益")
    ad_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="広告収益")
    affiliate_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="アフィリエイト収益")
    subscription_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="サブスク収益")
    other_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="その他収益")
    
    # コスト
    content_generation_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="コンテンツ生成コスト")
    hosting_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="ホスティングコスト")
    marketing_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="マーケティングコスト")
    other_costs = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="その他コスト")
    
    # 利益
    gross_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="粗利益")
    net_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="純利益")
    profit_margin = models.FloatField(default=0.0, verbose_name="利益率")
    
    # KPI
    revenue_per_content = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="コンテンツ当たり収益")
    cost_per_content = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="コンテンツ当たりコスト")
    roi = models.FloatField(default=0.0, verbose_name="ROI")
    
    # 比較データ
    previous_period_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="前期収益")
    growth_rate = models.FloatField(default=0.0, verbose_name="成長率")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['report_type', 'date']
        verbose_name = "収益レポート"
        verbose_name_plural = "収益レポート"
    
    def __str__(self):
        return f"{self.get_report_type_display()} - {self.date} - ¥{self.total_revenue:,}"

class SystemMetrics(models.Model):
    """システム指標"""
    METRIC_TYPES = [
        ('content_generation', 'コンテンツ生成'),
        ('publishing', '投稿処理'),
        ('data_collection', 'データ収集'),
        ('performance', 'パフォーマンス'),
        ('error_rate', 'エラー率'),
        ('user_activity', 'ユーザー活動'),
    ]
    
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPES)
    date = models.DateField(verbose_name="日付")
    hour = models.IntegerField(null=True, blank=True, verbose_name="時間")
    
    # 基本指標
    total_count = models.IntegerField(default=0, verbose_name="総数")
    success_count = models.IntegerField(default=0, verbose_name="成功数")
    error_count = models.IntegerField(default=0, verbose_name="エラー数")
    success_rate = models.FloatField(default=0.0, verbose_name="成功率")
    
    # パフォーマンス指標
    average_processing_time = models.FloatField(default=0.0, verbose_name="平均処理時間")
    max_processing_time = models.FloatField(default=0.0, verbose_name="最大処理時間")
    min_processing_time = models.FloatField(default=0.0, verbose_name="最小処理時間")
    
    # リソース使用量
    cpu_usage = models.FloatField(default=0.0, verbose_name="CPU使用率")
    memory_usage = models.FloatField(default=0.0, verbose_name="メモリ使用率")
    storage_usage = models.FloatField(default=0.0, verbose_name="ストレージ使用率")
    
    # API使用量
    api_calls = models.IntegerField(default=0, verbose_name="API呼び出し数")
    api_cost = models.DecimalField(max_digits=8, decimal_places=4, default=0, verbose_name="APIコスト")
    
    # 詳細データ
    details = models.JSONField(default=dict, verbose_name="詳細データ")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['metric_type', 'date', 'hour']
        indexes = [
            models.Index(fields=['metric_type', 'date']),
            models.Index(fields=['date']),
        ]
        verbose_name = "システム指標"
        verbose_name_plural = "システム指標"
    
    def __str__(self):
        return f"{self.get_metric_type_display()} - {self.date}"

class UserBehavior(models.Model):
    """ユーザー行動分析"""
    session_id = models.CharField(max_length=100, verbose_name="セッションID")
    user_id = models.CharField(max_length=100, blank=True, verbose_name="ユーザーID")
    ip_address = models.GenericIPAddressField(verbose_name="IPアドレス")
    user_agent = models.TextField(verbose_name="ユーザーエージェント")
    
    # ページ情報
    page_url = models.URLField(verbose_name="ページURL")
    page_title = models.CharField(max_length=500, verbose_name="ページタイトル")
    content = models.ForeignKey(GeneratedContent, on_delete=models.SET_NULL, null=True, blank=True)
    
    # 行動データ
    time_on_page = models.IntegerField(default=0, verbose_name="滞在時間（秒）")
    scroll_depth = models.FloatField(default=0.0, verbose_name="スクロール深度")
    click_count = models.IntegerField(default=0, verbose_name="クリック数")
    
    # リファラー情報
    referrer_url = models.URLField(blank=True, verbose_name="リファラーURL")
    referrer_type = models.CharField(max_length=50, blank=True, verbose_name="リファラータイプ")
    utm_source = models.CharField(max_length=100, blank=True, verbose_name="UTMソース")
    utm_medium = models.CharField(max_length=100, blank=True, verbose_name="UTMメディア")
    utm_campaign = models.CharField(max_length=100, blank=True, verbose_name="UTMキャンペーン")
    
    # デバイス情報
    device_type = models.CharField(max_length=20, blank=True, verbose_name="デバイスタイプ")
    browser = models.CharField(max_length=50, blank=True, verbose_name="ブラウザ")
    os = models.CharField(max_length=50, blank=True, verbose_name="OS")
    
    # 地理情報
    country = models.CharField(max_length=50, blank=True, verbose_name="国")
    city = models.CharField(max_length=100, blank=True, verbose_name="都市")
    
    # イベント
    events = models.JSONField(default=list, verbose_name="イベント")
    conversions = models.JSONField(default=list, verbose_name="コンバージョン")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['session_id']),
            models.Index(fields=['user_id']),
            models.Index(fields=['created_at']),
            models.Index(fields=['content']),
        ]
        verbose_name = "ユーザー行動"
        verbose_name_plural = "ユーザー行動"
    
    def __str__(self):
        return f"Session {self.session_id[:8]}... - {self.page_title[:50]}..."

class CompetitorAnalysis(models.Model):
    """競合分析"""
    competitor_name = models.CharField(max_length=200, verbose_name="競合名")
    competitor_url = models.URLField(verbose_name="競合URL")
    analysis_date = models.DateField(verbose_name="分析日")
    
    # コンテンツ分析
    total_content_count = models.IntegerField(default=0, verbose_name="総コンテンツ数")
    weekly_content_count = models.IntegerField(default=0, verbose_name="週間コンテンツ数")
    content_quality_score = models.FloatField(default=0.0, verbose_name="コンテンツ品質スコア")
    
    # トラフィック分析
    estimated_monthly_traffic = models.IntegerField(default=0, verbose_name="推定月間トラフィック")
    traffic_growth_rate = models.FloatField(default=0.0, verbose_name="トラフィック成長率")
    
    # SEO分析
    domain_authority = models.IntegerField(default=0, verbose_name="ドメインオーソリティ")
    backlink_count = models.IntegerField(default=0, verbose_name="被リンク数")
    keyword_rankings = models.JSONField(default=dict, verbose_name="キーワードランキング")
    
    # ソーシャル分析
    social_followers = models.JSONField(default=dict, verbose_name="SNSフォロワー数")
    social_engagement = models.JSONField(default=dict, verbose_name="SNSエンゲージメント")
    
    # 技術分析
    technology_stack = models.JSONField(default=list, verbose_name="技術スタック")
    performance_score = models.FloatField(default=0.0, verbose_name="パフォーマンススコア")
    
    # 比較データ
    competitive_advantages = models.JSONField(default=list, verbose_name="競合優位性")
    improvement_opportunities = models.JSONField(default=list, verbose_name="改善機会")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['competitor_name', 'analysis_date']
        verbose_name = "競合分析"
        verbose_name_plural = "競合分析"
    
    def __str__(self):
        return f"{self.competitor_name} - {self.analysis_date}"_rate = models.FloatField(default=0.0, verbose_name="コンバージョン率")
    
    # 収益指標
    estimated_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="推定収益")
    ad_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="広告収益")
    affiliate_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="アフィリエイト収益")
    
    # SEO指標
    search_impressions = models.IntegerField(default=0, verbose_name="検索表示回数")
    search_clicks = models.IntegerField(default=0, verbose_name="検索クリック数")
    average_position = models.FloatField(default=0.0, verbose_name="平均掲載順位")
    organic_traffic = models.IntegerField(default=0, verbose_name="オーガニックトラフィック")
    
    # 時系列データ
    daily_metrics = models.JSONField(default=dict, verbose_name="日別指標")
    weekly_metrics = models.JSONField(default=dict, verbose_name="週別指標")
    monthly_metrics = models.JSONField(default=dict, verbose_name="月別指標")
    
    # 比較・ランキング
    performance_rank = models.IntegerField(default=0, verbose_name="パフォーマンスランク")
    category_rank = models.IntegerField(default=0, verbose_name="カテゴリ内ランク")
    improvement_score = models.FloatField(default=0.0, verbose_name="改善スコア")
    
    last_updated = models.DateTimeField(auto_now=True, verbose_name="最終更新")
    
    class Meta:
        verbose_name = "コンテンツパフォーマンス"
        verbose_name_plural = "コンテンツパフォーマンス"
    
    def __str__(self):
        return f"{self.content.title[:50]}... - Views: {self.total_views}"

class TrafficSource(models.Model):
    """トラフィックソース"""
    SOURCE_TYPES = [
        ('organic', 'オーガニック検索'),
        ('direct', 'ダイレクト'),
        ('social', 'ソーシャルメディア'),
        ('referral', 'リファラル'),
        ('email', 'メール'),
        ('paid', '有料広告'),
        ('youtube', 'YouTube'),
        ('twitter', 'Twitter'),
        ('instagram', 'Instagram'),
        ('facebook', 'Facebook'),
    ]
    
    content_performance = models.ForeignKey(ContentPerformance, on_delete=models.CASCADE, related_name='traffic_sources')
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    source_name = models.CharField(max_length=200, verbose_name="ソース名")
    
    # 指標
    sessions = models.IntegerField(default=0, verbose_name="セッション数")
    page_views = models.IntegerField(default=0, verbose_name="ページビュー")
    unique_users = models.IntegerField(default=0, verbose_name="ユニークユーザー")
    bounce_rate = models.FloatField(default=0.0, verbose_name="直帰率")
    conversion