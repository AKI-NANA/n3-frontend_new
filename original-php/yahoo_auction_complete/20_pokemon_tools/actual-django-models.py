# apps/cards/models.py
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import json

class PokemonSeries(models.Model):
    """ポケモンカードシリーズ"""
    name = models.CharField(max_length=200, verbose_name="シリーズ名")
    name_en = models.CharField(max_length=200, verbose_name="英語名")
    name_cn = models.CharField(max_length=200, blank=True, verbose_name="中国語名")
    name_es = models.CharField(max_length=200, blank=True, verbose_name="スペイン語名")
    release_date = models.DateField(verbose_name="発売日")
    is_active = models.BooleanField(default=True, verbose_name="アクティブ")
    official_url = models.URLField(blank=True, verbose_name="公式URL")
    set_code = models.CharField(max_length=20, unique=True, verbose_name="セットコード")
    total_cards = models.IntegerField(default=0, verbose_name="総カード数")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "ポケモンシリーズ"
        verbose_name_plural = "ポケモンシリーズ"
        ordering = ['-release_date']
    
    def __str__(self):
        return f"{self.name} ({self.set_code})"

class PokemonCard(models.Model):
    """ポケモンカード"""
    RARITY_CHOICES = [
        ('C', 'コモン'),
        ('U', 'アンコモン'),
        ('R', 'レア'),
        ('RR', 'ダブルレア'),
        ('RRR', 'トリプルレア'),
        ('SR', 'スーパーレア'),
        ('SSR', 'スペシャルスーパーレア'),
        ('UR', 'ウルトラレア'),
        ('HR', 'ハイパーレア'),
        ('CSR', 'キャラクタースーパーレア'),
        ('CHR', 'キャラクターレア'),
        ('SAR', 'スペシャルアートレア'),
        ('PROMO', 'プロモーション'),
    ]
    
    INVESTMENT_GRADE_CHOICES = [
        ('S', 'S級（最優先投資対象）'),
        ('A', 'A級（高投資価値）'),
        ('B', 'B級（中投資価値）'),
        ('C', 'C級（低投資価値）'),
        ('D', 'D級（投資非推奨）'),
    ]
    
    CARD_TYPE_CHOICES = [
        ('pokemon', 'ポケモン'),
        ('trainer', 'トレーナー'),
        ('energy', 'エネルギー'),
        ('special', 'スペシャル'),
    ]
    
    POKEMON_TYPE_CHOICES = [
        ('grass', '草'),
        ('fire', '炎'),
        ('water', '水'),
        ('lightning', '雷'),
        ('psychic', '超'),
        ('fighting', '闘'),
        ('darkness', '悪'),
        ('metal', '鋼'),
        ('fairy', '妖'),
        ('dragon', 'ドラゴン'),
        ('colorless', '無色'),
    ]
    
    # 基本情報
    card_id = models.CharField(max_length=50, unique=True, verbose_name="カードID")
    name_jp = models.CharField(max_length=200, verbose_name="日本語名")
    name_en = models.CharField(max_length=200, verbose_name="英語名")
    name_cn = models.CharField(max_length=200, blank=True, verbose_name="中国語名")
    name_es = models.CharField(max_length=200, blank=True, verbose_name="スペイン語名")
    card_number = models.CharField(max_length=50, verbose_name="カード番号")
    series = models.ForeignKey(PokemonSeries, on_delete=models.CASCADE, verbose_name="シリーズ")
    rarity = models.CharField(max_length=10, choices=RARITY_CHOICES, verbose_name="レアリティ")
    
    # カード詳細
    hp = models.IntegerField(null=True, blank=True, verbose_name="HP")
    card_type = models.CharField(max_length=20, choices=CARD_TYPE_CHOICES, verbose_name="カードタイプ")
    pokemon_type = models.CharField(max_length=20, choices=POKEMON_TYPE_CHOICES, blank=True, verbose_name="ポケモンタイプ")
    artist = models.CharField(max_length=100, blank=True, verbose_name="イラストレーター")
    flavor_text = models.TextField(blank=True, verbose_name="フレーバーテキスト")
    
    # 投資・人気度情報
    is_popular = models.BooleanField(default=False, verbose_name="人気カード")
    investment_grade = models.CharField(max_length=1, choices=INVESTMENT_GRADE_CHOICES, default='C', verbose_name="投資グレード")
    popularity_score = models.FloatField(default=0.0, validators=[MinValueValidator(0), MaxValueValidator(100)], verbose_name="人気度スコア")
    investment_potential = models.FloatField(default=0.0, validators=[MinValueValidator(0), MaxValueValidator(100)], verbose_name="投資潜在性")
    
    # 画像・メディア
    image_url = models.URLField(blank=True, verbose_name="画像URL")
    official_image = models.ImageField(upload_to='card_images/', blank=True, verbose_name="公式画像")
    thumbnail = models.ImageField(upload_to='card_thumbnails/', blank=True, verbose_name="サムネイル")
    
    # メタデータ
    abilities = models.JSONField(default=list, verbose_name="特性・技", blank=True)
    weaknesses = models.JSONField(default=list, verbose_name="弱点", blank=True)
    resistances = models.JSONField(default=list, verbose_name="抵抗力", blank=True)
    retreat_cost = models.IntegerField(null=True, blank=True, verbose_name="にげるコスト")
    regulation = models.CharField(max_length=10, blank=True, verbose_name="レギュレーション")
    
    # システム情報
    is_active = models.BooleanField(default=True, verbose_name="アクティブ")
    metadata = models.JSONField(default=dict, verbose_name="追加メタデータ")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "ポケモンカード"
        verbose_name_plural = "ポケモンカード"
        unique_together = ['series', 'card_number']
        indexes = [
            models.Index(fields=['card_id']),
            models.Index(fields=['name_jp']),
            models.Index(fields=['rarity']),
            models.Index(fields=['investment_grade']),
            models.Index(fields=['is_popular']),
            models.Index(fields=['series', 'card_number']),
        ]
    
    def __str__(self):
        return f"{self.name_jp} ({self.card_number})"
    
    def get_current_price(self):
        """現在の価格を取得"""
        latest_analysis = self.price_analysis.order_by('-analysis_date').first()
        return latest_analysis.current_price if latest_analysis else 0
    
    def get_price_change_24h(self):
        """24時間の価格変動率を取得"""
        latest_analysis = self.price_analysis.order_by('-analysis_date').first()
        return latest_analysis.change_24h if latest_analysis else 0
    
    def update_popularity_score(self):
        """人気度スコアを更新"""
        # 価格データ、検索頻度、SNS言及数などから算出
        recent_analysis = self.price_analysis.order_by('-analysis_date')[:30]
        if recent_analysis:
            avg_volume = sum(a.volume for a in recent_analysis) / len(recent_analysis)
            price_volatility = sum(abs(a.change_24h) for a in recent_analysis) / len(recent_analysis)
            self.popularity_score = min(100, avg_volume * 0.1 + price_volatility * 2)
            self.save()

# apps/price_tracking/models.py
from django.db import models
from django.utils import timezone
from decimal import Decimal
from apps.cards.models import PokemonCard

class PriceSource(models.Model):
    """価格収集元"""
    SOURCE_TYPE_CHOICES = [
        ('mercari', 'メルカリ'),
        ('yahoo_auction', 'ヤフオク'),
        ('tcgplayer', 'TCGPlayer'),
        ('cardmarket', 'Cardmarket'),
        ('pokemonprice', 'ポケモンプライス'),
        ('magi', 'magi'),
        ('buyee', 'Buyee'),
        ('official', '公式'),
    ]
    
    name = models.CharField(max_length=100, verbose_name="収集元名")
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES, verbose_name="ソースタイプ")
    base_url = models.URLField(verbose_name="ベースURL")
    is_active = models.BooleanField(default=True, verbose_name="アクティブ")
    priority = models.IntegerField(default=1, verbose_name="優先度")
    
    # スクレイピング設定
    scraping_config = models.JSONField(default=dict, verbose_name="スクレイピング設定")
    rate_limit_per_hour = models.IntegerField(default=100, verbose_name="時間当たりリクエスト制限")
    delay_between_requests = models.FloatField(default=1.0, verbose_name="リクエスト間隔（秒）")
    
    # 認証情報
    api_key = models.CharField(max_length=200, blank=True, verbose_name="APIキー")
    username = models.CharField(max_length=100, blank=True, verbose_name="ユーザー名")
    password = models.CharField(max_length=100, blank=True, verbose_name="パスワード")
    
    # 統計情報
    last_accessed = models.DateTimeField(null=True, blank=True, verbose_name="最終アクセス")
    total_requests = models.IntegerField(default=0, verbose_name="総リクエスト数")
    success_rate = models.FloatField(default=0.0, verbose_name="成功率")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "価格収集元"
        verbose_name_plural = "価格収集元"
    
    def __str__(self):
        return f"{self.name} ({self.source_type})"

class PriceData(models.Model):
    """価格データ"""
    CONDITION_CHOICES = [
        ('MINT', 'MINT'),
        ('NM', 'Near Mint'),
        ('EX', 'Excellent'),
        ('GD', 'Good'),
        ('LP', 'Lightly Played'),
        ('MP', 'Moderately Played'),
        ('HP', 'Heavily Played'),
        ('DMG', 'Damaged'),
    ]
    
    CURRENCY_CHOICES = [
        ('JPY', '日本円'),
        ('USD', '米ドル'),
        ('EUR', 'ユーロ'),
        ('CNY', '中国元'),
    ]
    
    card = models.ForeignKey(PokemonCard, on_delete=models.CASCADE, related_name='price_data')
    source = models.ForeignKey(PriceSource, on_delete=models.CASCADE)
    
    # 価格情報
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="価格")
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='JPY', verbose_name="通貨")
    condition = models.CharField(max_length=10, choices=CONDITION_CHOICES, default='NM', verbose_name="状態")
    
    # 出品情報
    listing_title = models.CharField(max_length=500, verbose_name="出品タイトル")
    listing_url = models.URLField(verbose_name="出品URL")
    seller_info = models.JSONField(default=dict, verbose_name="販売者情報")
    shipping_cost = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name="送料")
    
    # 取引情報
    is_sold = models.BooleanField(default=False, verbose_name="売却済み")
    sold_at = models.DateTimeField(null=True, blank=True, verbose_name="売却日時")
    bid_count = models.IntegerField(default=0, verbose_name="入札数")
    view_count = models.IntegerField(default=0, verbose_name="閲覧数")
    
    # システム情報
    collected_at = models.DateTimeField(auto_now_add=True, verbose_name="収集日時")
    is_valid = models.BooleanField(default=True, verbose_name="有効データ")
    validation_score = models.FloatField(default=1.0, verbose_name="検証スコア")
    raw_data = models.JSONField(default=dict, verbose_name="生データ")
    
    class Meta:
        indexes = [
            models.Index(fields=['card', 'collected_at']),
            models.Index(fields=['source', 'collected_at']),
            models.Index(fields=['price', 'condition']),
            models.Index(fields=['is_sold', 'collected_at']),
        ]
        verbose_name = "価格データ"
        verbose_name_plural = "価格データ"
    
    def __str__(self):
        return f"{self.card.name_jp} - {self.price}{self.currency} ({self.source.name})"

class PriceAnalysis(models.Model):
    """価格分析結果"""
    card = models.ForeignKey(PokemonCard, on_delete=models.CASCADE, related_name='price_analysis')
    analysis_date = models.DateField(default=timezone.now)
    
    # 基本統計
    current_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="現在価格")
    median_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="中央値価格")
    average_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="平均価格")
    min_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="最低価格")
    max_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="最高価格")
    
    # 変動率
    change_24h = models.FloatField(default=0.0, verbose_name="24時間変動率")
    change_7d = models.FloatField(default=0.0, verbose_name="7日間変動率")
    change_30d = models.FloatField(default=0.0, verbose_name="30日間変動率")
    change_90d = models.FloatField(default=0.0, verbose_name="90日間変動率")
    
    # 取引量・流動性
    volume = models.IntegerField(default=0, verbose_name="取引量")
    liquidity_score = models.FloatField(default=0.0, verbose_name="流動性スコア")
    market_cap = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name="市場総額")
    
    # 分析データ
    volatility = models.FloatField(default=0.0, verbose_name="ボラティリティ")
    trend_direction = models.CharField(max_length=10, default='neutral', verbose_name="トレンド方向")  # up, down, neutral
    support_level = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="サポートレベル")
    resistance_level = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="レジスタンスレベル")
    
    # 市場要因
    market_factors = models.JSONField(default=list, verbose_name="市場要因")
    news_sentiment = models.FloatField(default=0.0, verbose_name="ニュース感情分析")
    social_mentions = models.IntegerField(default=0, verbose_name="SNS言及数")
    
    # 予測
    prediction_7d = models.JSONField(default=dict, verbose_name="7日予測")
    prediction_30d = models.JSONField(default=dict, verbose_name="30日予測")
    prediction_90d = models.JSONField(default=dict, verbose_name="90日予測")
    confidence_score = models.FloatField(default=0.0, verbose_name="信頼度スコア")
    
    # 地域別価格
    jp_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="日本価格")
    us_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="米国価格")
    eu_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="欧州価格")
    cn_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="中国価格")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['card', 'analysis_date']
        indexes = [
            models.Index(fields=['analysis_date']),
            models.Index(fields=['current_price']),
            models.Index(fields=['change_24h']),
            models.Index(fields=['volume']),
        ]
        verbose_name = "価格分析"
        verbose_name_plural = "価格分析"
    
    def __str__(self):
        return f"{self.card.name_jp} - {self.analysis_date}"

class PriceAlert(models.Model):
    """価格アラート"""
    ALERT_TYPE_CHOICES = [
        ('price_above', '価格上昇'),
        ('price_below', '価格下落'),
        ('volume_spike', '取引量急増'),
        ('volatility_high', 'ボラティリティ高'),
        ('trend_change', 'トレンド変化'),
    ]
    
    card = models.ForeignKey(PokemonCard, on_delete=models.CASCADE, related_name='price_alerts')
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    threshold_value = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="閾値")
    is_active = models.BooleanField(default=True, verbose_name="アクティブ")
    
    # 通知設定
    email_notification = models.BooleanField(default=True, verbose_name="メール通知")
    webhook_url = models.URLField(blank=True, verbose_name="Webhook URL")
    
    # 実行履歴
    last_triggered = models.DateTimeField(null=True, blank=True, verbose_name="最終発動")
    trigger_count = models.IntegerField(default=0, verbose_name="発動回数")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "価格アラート"
        verbose_name_plural = "価格アラート"
    
    def __str__(self):
        return f"{self.card.name_jp} - {self.get_alert_type_display()}"