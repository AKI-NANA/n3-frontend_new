# apps/cards/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid

class PokemonSeries(models.Model):
    """ポケモンカードシリーズモデル"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True, verbose_name="シリーズ名")
    name_en = models.CharField(max_length=200, blank=True, verbose_name="英語名")
    release_date = models.DateField(verbose_name="発売日")
    total_cards = models.PositiveIntegerField(default=0, verbose_name="総カード数")
    is_active = models.BooleanField(default=True, verbose_name="アクティブ")
    popularity_score = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="人気度"
    )
    investment_potential = models.CharField(
        max_length=10,
        choices=[('A', 'A級'), ('B', 'B級'), ('C', 'C級'), ('D', 'D級')],
        default='C', verbose_name="投資ポテンシャル"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pokemon_series'
        verbose_name = 'ポケモンシリーズ'
        verbose_name_plural = 'ポケモンシリーズ'
        ordering = ['-release_date']
    
    def __str__(self):
        return self.name

class PokemonCard(models.Model):
    """ポケモンカードモデル"""
    RARITY_CHOICES = [
        ('C', 'コモン'),
        ('U', 'アンコモン'),
        ('R', 'レア'),
        ('RR', 'ダブルレア'),
        ('RRR', 'トリプルレア'),
        ('SR', 'スーパーレア'),
        ('SSR', 'スペシャルスーパーレア'),
        ('HR', 'ハイパーレア'),
        ('UR', 'ウルトラレア'),
        ('PR', 'プロモ'),
        ('CHR', 'キャラクターレア'),
        ('CSR', 'キャラクタースーパーレア')
    ]
    
    INVESTMENT_GRADE_CHOICES = [
        ('S', 'S級（超高投資価値）'),
        ('A+', 'A+級（高投資価値）'),
        ('A', 'A級（中高投資価値）'),
        ('B+', 'B+級（中投資価値）'),
        ('B', 'B級（低中投資価値）'),
        ('C', 'C級（低投資価値）'),
        ('D', 'D級（投資非推奨）')
    ]
    
    TYPE_CHOICES = [
        ('grass', '草'),
        ('fire', '炎'),
        ('water', '水'),
        ('lightning', '雷'),
        ('psychic', 'エスパー'),
        ('fighting', '闘'),
        ('darkness', '悪'),
        ('metal', '鋼'),
        ('fairy', 'フェアリー'),
        ('dragon', 'ドラゴン'),
        ('colorless', '無色'),
        ('trainer', 'トレーナー'),
        ('energy', 'エネルギー')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    series = models.ForeignKey(PokemonSeries, on_delete=models.CASCADE, related_name='cards')
    name = models.CharField(max_length=200, verbose_name="カード名")
    name_en = models.CharField(max_length=200, blank=True, verbose_name="英語名")
    card_number = models.CharField(max_length=20, verbose_name="カード番号")
    rarity = models.CharField(max_length=5, choices=RARITY_CHOICES, verbose_name="レアリティ")
    pokemon_type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="タイプ")
    hp = models.PositiveIntegerField(null=True, blank=True, verbose_name="HP")
    attack_power = models.PositiveIntegerField(null=True, blank=True, verbose_name="攻撃力")
    weakness = models.CharField(max_length=20, blank=True, verbose_name="弱点")
    resistance = models.CharField(max_length=20, blank=True, verbose_name="抵抗力")
    retreat_cost = models.PositiveIntegerField(null=True, blank=True, verbose_name="にげるコスト")
    
    # 投資・価値関連
    investment_grade = models.CharField(
        max_length=5, choices=INVESTMENT_GRADE_CHOICES, 
        default='C', verbose_name="投資グレード"
    )
    is_popular = models.BooleanField(default=False, verbose_name="人気カード")
    popularity_score = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="人気度スコア"
    )
    view_count = models.PositiveIntegerField(default=0, verbose_name="閲覧数")
    search_count = models.PositiveIntegerField(default=0, verbose_name="検索数")
    
    # メタデータ
    description = models.TextField(blank=True, verbose_name="説明")
    artist = models.CharField(max_length=100, blank=True, verbose_name="イラストレーター")
    flavor_text = models.TextField(blank=True, verbose_name="フレーバーテキスト")
    
    # 画像
    image_url_official = models.URLField(blank=True, verbose_name="公式画像URL")
    image_url_high_res = models.URLField(blank=True, verbose_name="高解像度画像URL")
    image_s3_path = models.CharField(max_length=500, blank=True, verbose_name="S3画像パス")
    
    # システム情報
    data_source = models.CharField(max_length=50, default='manual', verbose_name="データソース")
    last_price_update = models.DateTimeField(null=True, blank=True, verbose_name="最終価格更新")
    is_monitored = models.BooleanField(default=True, verbose_name="価格監視対象")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pokemon_cards'
        verbose_name = 'ポケモンカード'
        verbose_name_plural = 'ポケモンカード'
        unique_together = ['series', 'card_number']
        ordering = ['-popularity_score', '-view_count']
        indexes = [
            models.Index(fields=['rarity', 'investment_grade']),
            models.Index(fields=['is_popular', 'popularity_score']),
            models.Index(fields=['last_price_update']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.card_number})"
    
    def get_latest_prices(self):
        """最新の価格情報を取得"""
        from apps.price_tracking.models import PriceData
        
        latest_prices = PriceData.objects.filter(
            card=self,
            collected_at__gte=timezone.now() - timezone.timedelta(days=7)
        ).aggregate(
            average_price=models.Avg('price'),
            min_price=models.Min('price'),
            max_price=models.Max('price'),
            median_price=models.Value(0, models.DecimalField())  # 後で中央値計算
        )
        
        return latest_prices or {'average_price': 0, 'min_price': 0, 'max_price': 0}
    
    def get_price_trend(self):
        """価格トレンドを取得"""
        from apps.price_tracking.models import PriceData
        
        now = timezone.now()
        current_week = PriceData.objects.filter(
            card=self,
            collected_at__gte=now - timezone.timedelta(days=7)
        ).aggregate(avg=models.Avg('price'))['avg'] or 0
        
        previous_week = PriceData.objects.filter(
            card=self,
            collected_at__range=[
                now - timezone.timedelta(days=14),
                now - timezone.timedelta(days=7)
            ]
        ).aggregate(avg=models.Avg('price'))['avg'] or 0
        
        if previous_week > 0:
            change_rate = ((current_week - previous_week) / previous_week) * 100
            if change_rate > 5:
                return 'up'
            elif change_rate < -5:
                return 'down'
            else:
                return 'stable'
        
        return 'unknown'
    
    def get_image_urls(self):
        """画像URLのリストを取得"""
        urls = []
        if self.image_url_official:
            urls.append(self.image_url_official)
        if self.image_url_high_res:
            urls.append(self.image_url_high_res)
        if self.image_s3_path:
            from django.conf import settings
            urls.append(f"{settings.S3_BASE_URL}/{self.image_s3_path}")
        return urls

# apps/price_tracking/models.py
class PriceSource(models.Model):
    """価格ソースモデル"""
    PLATFORM_CHOICES = [
        ('mercari', 'メルカリ'),
        ('yahoo_auction', 'ヤフオク'),
        ('amazon', 'Amazon'),
        ('rakuten', '楽天市場'),
        ('card_shop', 'カードショップ'),
        ('official', '公式'),
        ('other', 'その他')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name="ソース名")
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, verbose_name="プラットフォーム")
    base_url = models.URLField(verbose_name="ベースURL")
    is_active = models.BooleanField(default=True, verbose_name="アクティブ")
    reliability_score = models.IntegerField(
        default=50, validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="信頼性スコア"
    )
    collection_interval = models.PositiveIntegerField(default=360, verbose_name="収集間隔（分）")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'price_sources'
        verbose_name = '価格ソース'
        verbose_name_plural = '価格ソース'
    
    def __str__(self):
        return self.name

class PriceData(models.Model):
    """価格データモデル"""
    CONDITION_CHOICES = [
        ('mint', '美品'),
        ('near_mint', '準美品'),
        ('excellent', '良好'),
        ('good', '普通'),
        ('fair', '劣化'),
        ('poor', '破損'),
        ('unknown', '不明')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    card = models.ForeignKey(PokemonCard, on_delete=models.CASCADE, related_name='price_data')
    source = models.ForeignKey(PriceSource, on_delete=models.CASCADE, related_name='price_data')
    price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="価格")
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='unknown', verbose_name="状態")
    is_sold = models.BooleanField(default=False, verbose_name="売約済み")
    listing_title = models.CharField(max_length=500, blank=True, verbose_name="出品タイトル")
    listing_url = models.URLField(blank=True, verbose_name="出品URL")
    seller_rating = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True, verbose_name="出品者評価")
    
    # 統計用フィールド
    is_outlier = models.BooleanField(default=False, verbose_name="外れ値")
    confidence_score = models.IntegerField(
        default=50, validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="信頼度スコア"
    )
    
    collected_at = models.DateTimeField(auto_now_add=True, verbose_name="収集日時")
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="有効期限")
    
    class Meta:
        db_table = 'price_data'
        verbose_name = '価格データ'
        verbose_name_plural = '価格データ'
        indexes = [
            models.Index(fields=['card', 'collected_at']),
            models.Index(fields=['source', 'collected_at']),
            models.Index(fields=['is_sold', 'condition']),
        ]
        ordering = ['-collected_at']
    
    def __str__(self):
        return f"{self.card.name} - {self.price}円 ({self.source.name})"

class PriceAnalysis(models.Model):
    """価格分析モデル"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    card = models.ForeignKey(PokemonCard, on_delete=models.CASCADE, related_name='price_analyses')
    
    # 統計値
    average_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="平均価格")
    median_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="中央値価格")
    min_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="最低価格")
    max_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="最高価格")
    standard_deviation = models.DecimalField(max_digits=12, decimal_places=4, verbose_name="標準偏差")
    
    # トレンド分析
    price_trend = models.CharField(
        max_length=20,
        choices=[
            ('up_strong', '強い上昇'),
            ('up_moderate', '緩い上昇'),
            ('stable', '安定'),
            ('down_moderate', '緩い下降'),
            ('down_strong', '強い下降'),
            ('volatile', '不安定')
        ],
        default='stable', verbose_name="価格トレンド"
    )
    volatility_score = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="ボラティリティスコア"
    )
    
    # 予測
    predicted_price_30d = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="30日後予測価格"
    )
    predicted_price_90d = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="90日後予測価格"
    )
    prediction_confidence = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="予測信頼度"
    )
    
    # 分析期間
    analysis_start_date = models.DateTimeField(verbose_name="分析開始日")
    analysis_end_date = models.DateTimeField(verbose_name="分析終了日")
    sample_size = models.PositiveIntegerField(default=0, verbose_name="サンプル数")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'price_analyses'
        verbose_name = '価格分析'
        verbose_name_plural = '価格分析'
        ordering = ['-created_at']
        unique_together = ['card', 'analysis_start_date', 'analysis_end_date']
    
    def __str__(self):
        return f"{self.card.name} 価格分析 ({self.created_at.strftime('%Y-%m-%d')})"

# apps/ai_generation/models.py
class ContentTemplate(models.Model):
    """コンテンツテンプレートモデル"""
    CONTENT_TYPE_CHOICES = [
        ('blog_jp', '日本語ブログ記事'),
        ('blog_en', '英語ブログ記事'),
        ('blog_zh', '中国語ブログ記事'),
        ('youtube_script', 'YouTube動画台本'),
        ('social_post', 'SNS投稿'),
        ('email_newsletter', 'メールニュースレター'),
        ('product_review', '商品レビュー'),
        ('market_analysis', '市場分析レポート')
    ]
    
    LANGUAGE_CHOICES = [
        ('ja', '日本語'),
        ('en', '英語'),
        ('zh', '中国語'),
        ('es', 'スペイン語'),
        ('multi', '多言語')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True, verbose_name="テンプレート名")
    content_type = models.CharField(max_length=30, choices=CONTENT_TYPE_CHOICES, verbose_name="コンテンツタイプ")
    language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default='ja', verbose_name="言語")
    target_audience = models.CharField(max_length=200, verbose_name="ターゲット読者")
    writing_style = models.CharField(max_length=100, verbose_name="文体・トーン")
    
    # テンプレート内容
    system_prompt = models.TextField(verbose_name="システムプロンプト")
    user_prompt_template = models.TextField(verbose_name="ユーザープロンプトテンプレート")
    specific_instructions = models.TextField(blank=True, verbose_name="特別指示")
    context_data = models.JSONField(default=dict, blank=True, verbose_name="コンテキストデータ")
    sample_output = models.TextField(blank=True, verbose_name="サンプル出力")
    
    # 設定
    max_tokens = models.PositiveIntegerField(default=2000, verbose_name="最大トークン数")
    temperature = models.DecimalField(max_digits=3, decimal_places=2, default=0.7, verbose_name="Temperature")
    is_active = models.BooleanField(default=True, verbose_name="アクティブ")
    priority = models.IntegerField(default=5, verbose_name="優先度")
    
    # 統計
    usage_count = models.PositiveIntegerField(default=0, verbose_name="使用回数")
    success_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="成功率")
    average_quality_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="平均品質スコア")
    average_generation_time = models.DecimalField(max_digits=8, decimal_places=3, default=0, verbose_name="平均生成時間")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='content_templates', verbose_name="作成者"
    )
    
    class Meta:
        db_table = 'content_templates'
        verbose_name = 'コンテンツテンプレート'
        verbose_name_plural = 'コンテンツテンプレート'
        ordering = ['-priority', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.content_type})"
    
    def update_statistics(self, quality_score=None, generation_time=None, success=True):
        """統計情報を更新"""
        self.usage_count += 1
        
        if quality_score is not None and quality_score > 0:
            # 加重平均で品質スコアを更新
            total_score = (self.average_quality_score * (self.usage_count - 1)) + quality_score
            self.average_quality_score = total_score / self.usage_count
        
        if generation_time is not None:
            # 加重平均で生成時間を更新
            total_time = (self.average_generation_time * (self.usage_count - 1)) + Decimal(str(generation_time))
            self.average_generation_time = total_time / self.usage_count
        
        if success:
            success_count = (self.success_rate / 100) * (self.usage_count - 1) + 1
            self.success_rate = (success_count / self.usage_count) * 100
        
        self.save(update_fields=['usage_count', 'success_rate', 'average_quality_score', 'average_generation_time'])

class AIGeneratedContent(models.Model):
    """AI生成コンテンツモデル"""
    STATUS_CHOICES = [
        ('draft', '下書き'),
        ('generated', '生成済み'),
        ('reviewing', '審査中'),
        ('approved', '承認済み'),
        ('needs_review', '要確認'),
        ('rejected', '却下'),
        ('published', '公開済み'),
        ('error', 'エラー')
    ]
    
    PRIORITY_CHOICES = [
        ('low', '低'),
        ('normal', '通常'),
        ('high', '高'),
        ('urgent', '緊急')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(ContentTemplate, on_delete=models.CASCADE, related_name='generated_contents')
    
    # コンテンツ内容
    title = models.CharField(max_length=500, verbose_name="タイトル")
    content = models.TextField(verbose_name="本文")
    excerpt = models.TextField(blank=True, verbose_name="要約")
    language = models.CharField(max_length=10, default='ja', verbose_name="言語")
    content_type = models.CharField(max_length=30, verbose_name="コンテンツタイプ")
    
    # SEO
    seo_title = models.CharField(max_length=200, blank=True, verbose_name="SEOタイトル")
    meta_description = models.CharField(max_length=320, blank=True, verbose_name="メタディスクリプション")
    focus_keyword = models.CharField(max_length=100, blank=True, verbose_name="フォーカスキーワード")
    keywords = models.JSONField(default=list, blank=True, verbose_name="キーワード")
    
    # 関連データ
    source_cards = models.ManyToManyField(PokemonCard, blank=True, related_name='ai_contents')
    source_data = models.JSONField(default=dict, verbose_name="ソースデータ")
    
    # AI生成情報
    input_prompt = models.TextField(blank=True, verbose_name="入力プロンプト")
    generation_time = models.DecimalField(max_digits=8, decimal_places=3, default=0, verbose_name="生成時間")
    token_usage = models.PositiveIntegerField(default=0, verbose_name="トークン使用量")
    generation_cost = models.DecimalField(max_digits=8, decimal_places=4, default=0, verbose_name="生成コスト")
    
    # ステータス
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="ステータス")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal', verbose_name="優先度")
    quality_score = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="品質スコア"
    )
    
    # エラー情報
    error_message = models.TextField(blank=True, verbose_name="エラーメッセージ")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='ai_contents', verbose_name="作成者"
    )
    
    class Meta:
        db_table = 'ai_generated_contents'
        verbose_name = 'AI生成コンテンツ'
        verbose_name_plural = 'AI生成コンテンツ'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['content_type', 'language']),
            models.Index(fields=['quality_score']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.status})"

class QualityCheck(models.Model):
    """品質チェックモデル"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content = models.ForeignKey(AIGeneratedContent, on_delete=models.CASCADE, related_name='quality_checks')
    
    # 品質スコア
    overall_score = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="総合品質スコア"
    )
    readability_score = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="読みやすさスコア"
    )
    uniqueness_score = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="独自性スコア"
    )
    seo_score = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="SEOスコア"
    )
    factual_accuracy_score = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="事実正確性スコア"
    )
    
    # チェック結果詳細
    plagiarism_check_result = models.JSONField(default=dict, verbose_name="盗用チェック結果")
    suggestions = models.JSONField(default=list, verbose_name="改善提案")
    issues_found = models.JSONField(default=list, verbose_name="発見された問題")
    check_details = models.JSONField(default=dict, verbose_name="詳細チェック結果")
    
    checked_at = models.DateTimeField(auto_now_add=True, verbose_name="チェック実行日時")
    check_duration = models.DecimalField(max_digits=8, decimal_places=3, default=0, verbose_name="チェック時間")
    
    class Meta:
        db_table = 'quality_checks'
        verbose_name = '品質チェック'
        verbose_name_plural = '品質チェック'
        ordering = ['-checked_at']
    
    def __str__(self):
        return f"{self.content.title} - 品質チェック ({self.overall_score}点)"

# apps/publishing/models.py
class PublishingPlatform(models.Model):
    """公開プラットフォームモデル"""
    PLATFORM_TYPE_CHOICES = [
        ('wordpress', 'WordPress'),
        ('youtube', 'YouTube'),
        ('twitter', 'Twitter'),
        ('instagram', 'Instagram'),
        ('facebook', 'Facebook'),
        ('tiktok', 'TikTok'),
        ('linkedin', 'LinkedIn'),
        ('medium', 'Medium'),
        ('note', 'note'),
        ('hatena', 'はてなブログ'),
        ('custom', 'カスタム')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name="プラットフォーム名")
    platform_type = models.CharField(max_length=20, choices=PLATFORM_TYPE_CHOICES, verbose_name="プラットフォームタイプ")
    base_url = models.URLField(verbose_name="ベースURL")
    
    # 認証情報
    api_endpoint = models.URLField(blank=True, verbose_name="API エンドポイント")
    api_key = models.CharField(max_length=500, blank=True, verbose_name="API キー")
    api_secret = models.CharField(max_length=500, blank=True, verbose_name="API シークレット")
    access_token = models.TextField(blank=True, verbose_name="アクセストークン")
    refresh_token = models.TextField(blank=True, verbose_name="リフレッシュトークン")
    
    # 設定
    is_active = models.BooleanField(default=True, verbose_name="アクティブ")
    auto_publish = models.BooleanField(default=False, verbose_name="自動公開")
    publish_schedule = models.JSONField(default=dict, verbose_name="公開スケジュール設定")
    content_settings = models.JSONField(default=dict, verbose_name="コンテンツ設定")
    
    # 統計
    total_published = models.PositiveIntegerField(default=0, verbose_name="総公開数")
    success_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="成功率")
    last_publish_at = models.DateTimeField(null=True, blank=True, verbose_name="最終公開日時")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'publishing_platforms'
        verbose_name = '公開プラットフォーム'
        verbose_name_plural = '公開プラットフォーム'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.platform_type})"

class PublishedContent(models.Model):
    """公開コンテンツモデル"""
    STATUS_CHOICES = [
        ('pending', '公開待ち'),
        ('scheduled', 'スケジュール済み'),
        ('publishing', '公開中'),
        ('published', '公開済み'),
        ('failed', '公開失敗'),
        ('cancelled', 'キャンセル')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ai_content = models.ForeignKey(AIGeneratedContent, on_delete=models.CASCADE, related_name='publications')
    platform = models.ForeignKey(PublishingPlatform, on_delete=models.CASCADE, related_name='publications')
    
    # 公開情報
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="ステータス")
    published_url = models.URLField(blank=True, verbose_name="公開URL")
    platform_content_id = models.CharField(max_length=200, blank=True, verbose_name="プラットフォーム コンテンツID")
    
    # スケジュール
    scheduled_at = models.DateTimeField(null=True, blank=True, verbose_name="公開予定日時")
    published_at = models.DateTimeField(null=True, blank=True, verbose_name="実際の公開日時")
    
    # カスタマイズ
    custom_title = models.CharField(max_length=500, blank=True, verbose_name="カスタムタイトル")
    custom_content = models.TextField(blank=True, verbose_name="カスタムコンテンツ")
    custom_tags = models.JSONField(default=list, verbose_name="カスタムタグ")
    custom_settings = models.JSONField(default=dict, verbose_name="カスタム設定")
    
    # エラー情報
    error_message = models.TextField(blank=True, verbose_name="エラーメッセージ")
    retry_count = models.PositiveIntegerField(default=0, verbose_name="リトライ回数")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'published_contents'
        verbose_name = '公開コンテンツ'
        verbose_name_plural = '公開コンテンツ'
        ordering = ['-created_at']
        unique_together = ['ai_content', 'platform']
        indexes = [
            models.Index(fields=['status', 'scheduled_at']),
            models.Index(fields=['platform', 'published_at']),
        ]
    
    def __str__(self):
        return f"{self.ai_content.title} → {self.platform.name}"

# apps/content_collection/models.py
class ContentSource(models.Model):
    """コンテンツソースモデル"""
    SOURCE_TYPE_CHOICES = [
        ('youtube', 'YouTube'),
        ('blog', 'ブログ'),
        ('news', 'ニュースサイト'),
        ('forum', 'フォーラム'),
        ('social', 'SNS'),
        ('official', '公式サイト'),
        ('review', 'レビューサイト'),
        ('marketplace', 'マーケットプレイス'),
        ('other', 'その他')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True, verbose_name="ソース名")
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES, verbose_name="ソースタイプ")
    base_url = models.URLField(verbose_name="ベースURL")
    rss_url = models.URLField(blank=True, verbose_name="RSS URL")
    
    # 収集設定
    is_active = models.BooleanField(default=True, verbose_name="アクティブ")
    collection_interval = models.PositiveIntegerField(default=1440, verbose_name="収集間隔（分）")
    max_items_per_collection = models.PositiveIntegerField(default=50, verbose_name="1回あたりの最大収集数")
    
    # フィルタリング
    include_keywords = models.JSONField(default=list, verbose_name="含むキーワード")
    exclude_keywords = models.JSONField(default=list, verbose_name="除外キーワード")
    language_filter = models.CharField(max_length=10, default='ja', verbose_name="言語フィルタ")
    
    # 統計
    total_collected = models.PositiveIntegerField(default=0, verbose_name="総収集数")
    success_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="成功率")
    last_collection_at = models.DateTimeField(null=True, blank=True, verbose_name="最終収集日時")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'content_sources'
        verbose_name = 'コンテンツソース'
        verbose_name_plural = 'コンテンツソース'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.source_type})"

class CollectedContent(models.Model):
    """収集コンテンツモデル"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source = models.ForeignKey(ContentSource, on_delete=models.CASCADE, related_name='collected_contents')
    
    # コンテンツ情報
    title = models.CharField(max_length=500, verbose_name="タイトル")
    content = models.TextField(verbose_name="コンテンツ")
    excerpt = models.TextField(blank=True, verbose_name="要約")
    url = models.URLField(unique=True, verbose_name="URL")
    author = models.CharField(max_length=200, blank=True, verbose_name="作者")
    
    # メタデータ
    published_date = models.DateTimeField(null=True, blank=True, verbose_name="公開日")
    language = models.CharField(max_length=10, default='ja', verbose_name="言語")
    tags = models.JSONField(default=list, verbose_name="タグ")
    keywords = models.JSONField(default=list, verbose_name="キーワード")
    
    # 分析結果
    relevance_score = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="関連度スコア"
    )
    quality_score = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="品質スコア"
    )
    sentiment_score = models.DecimalField(
        max_digits=5, decimal_places=3, default=0, verbose_name="感情スコア"
    )
    
    # ステータス
    is_processed = models.BooleanField(default=False, verbose_name="処理済み")
    is_useful = models.BooleanField(default=False, verbose_name="有用")
    is_duplicate = models.BooleanField(default=False, verbose_name="重複")
    
    collected_at = models.DateTimeField(auto_now_add=True, verbose_name="収集日時")
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name="処理日時")
    
    class Meta:
        db_table = 'collected_contents'
        verbose_name = '収集コンテンツ'
        verbose_name_plural = '収集コンテンツ'
        ordering = ['-collected_at']
        indexes = [
            models.Index(fields=['source', 'collected_at']),
            models.Index(fields=['is_processed', 'is_useful']),
            models.Index(fields=['relevance_score']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.source.name})"

# apps/analytics/models.py
class AnalyticsData(models.Model):
    """分析データモデル"""
    METRIC_TYPE_CHOICES = [
        ('page_view', 'ページビュー'),
        ('unique_visitor', 'ユニークビジター'),
        ('bounce_rate', '直帰率'),
        ('session_duration', 'セッション時間'),
        ('conversion', 'コンバージョン'),
        ('engagement', 'エンゲージメント'),
        ('revenue', '収益'),
        ('click_through', 'クリック率'),
        ('social_share', 'ソーシャルシェア'),
        ('search_ranking', '検索順位')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content = models.ForeignKey(
        AIGeneratedContent, on_delete=models.CASCADE, 
        null=True, blank=True, related_name='analytics'
    )
    platform = models.ForeignKey(
        PublishingPlatform, on_delete=models.CASCADE, 
        null=True, blank=True, related_name='analytics'
    )
    
    # メトリクス
    metric_type = models.CharField(max_length=30, choices=METRIC_TYPE_CHOICES, verbose_name="メトリクスタイプ")
    metric_value = models.DecimalField(max_digits=15, decimal_places=4, verbose_name="メトリクス値")
    metric_date = models.DateField(verbose_name="メトリクス日付")
    
    # 追加データ
    additional_data = models.JSONField(default=dict, verbose_name="追加データ")
    
    recorded_at = models.DateTimeField(auto_now_add=True, verbose_name="記録日時")
    
    class Meta:
        db_table = 'analytics_data'
        verbose_name = '分析データ'
        verbose_name_plural = '分析データ'
        ordering = ['-metric_date', '-recorded_at']
        unique_together = ['content', 'platform', 'metric_type', 'metric_date']
        indexes = [
            models.Index(fields=['metric_type', 'metric_date']),
            models.Index(fields=['platform', 'metric_date']),
        ]
    
    def __str__(self):
        content_title = self.content.title[:50] if self.content else "Global"
        return f"{content_title} - {self.metric_type}: {self.metric_value}"

class PerformanceMetrics(models.Model):
    """パフォーマンス指標モデル"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 期間設定
    start_date = models.DateField(verbose_name="開始日")
    end_date = models.DateField(verbose_name="終了日")
    
    # コンテンツパフォーマンス
    total_contents_generated = models.PositiveIntegerField(default=0, verbose_name="総生成コンテンツ数")
    total_contents_published = models.PositiveIntegerField(default=0, verbose_name="総公開コンテンツ数")
    average_quality_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="平均品質スコア")
    average_generation_time = models.DecimalField(max_digits=8, decimal_places=3, default=0, verbose_name="平均生成時間")
    
    # エンゲージメント
    total_page_views = models.PositiveBigIntegerField(default=0, verbose_name="総ページビュー")
    total_unique_visitors = models.PositiveIntegerField(default=0, verbose_name="総ユニークビジター")
    average_session_duration = models.DecimalField(max_digits=8, decimal_places=2, default=0, verbose_name="平均セッション時間")
    total_social_shares = models.PositiveIntegerField(default=0, verbose_name="総ソーシャルシェア")
    
    # 収益
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name="総収益")
    total_costs = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name="総コスト")
    roi = models.DecimalField(max_digits=10, decimal_places=4, default=0, verbose_name="ROI")
    
    # その他の指標
    conversion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="コンバージョン率")
    bounce_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="直帰率")
    
    calculated_at = models.DateTimeField(auto_now_add=True, verbose_name="計算日時")
    
    class Meta:
        db_table = 'performance_metrics'
        verbose_name = 'パフォーマンス指標'
        verbose_name_plural = 'パフォーマンス指標'
        ordering = ['-start_date']
        unique_together = ['start_date', 'end_date']
    
    def __str__(self):
        return f"パフォーマンス指標 ({self.start_date} ~ {self.end_date})"
    