# プロジェクト構造とDjango基盤実装

# pokemon_content_system/settings.py
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# セキュリティ設定
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here')
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# アプリケーション設定
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'corsheaders',
    'celery',
    'django_extensions',
]

LOCAL_APPS = [
    'apps.cards',
    'apps.price_tracking',
    'apps.content_collection',
    'apps.ai_generation',
    'apps.publishing',
    'apps.analytics',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'pokemon_content_system.urls'

# データベース設定
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'pokemon_content_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'password'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Redis設定（Celery用）
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# Celery設定
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Tokyo'

# 外部API設定
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
YOUTUBE_CLIENT_ID = os.getenv('YOUTUBE_CLIENT_ID')
YOUTUBE_CLIENT_SECRET = os.getenv('YOUTUBE_CLIENT_SECRET')

# WordPress設定
WORDPRESS_SITES = [
    {
        'name': 'メインサイト',
        'url': os.getenv('WORDPRESS_URL'),
        'username': os.getenv('WORDPRESS_USERNAME'),
        'password': os.getenv('WORDPRESS_PASSWORD'),
    }
]

# REST Framework設定
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# CORS設定
CORS_ALLOW_ALL_ORIGINS = True  # 開発用
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React開発サーバー
    "http://127.0.0.1:3000",
]

# 静的ファイル設定
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# メディアファイル設定
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# ===================================
# アプリケーション: cards/models.py
# ===================================

from django.db import models
from django.utils import timezone

class PokemonSeries(models.Model):
    """ポケモンカードシリーズ"""
    name = models.CharField(max_length=200, verbose_name="シリーズ名")
    name_en = models.CharField(max_length=200, verbose_name="英語名")
    release_date = models.DateField(verbose_name="発売日")
    is_active = models.BooleanField(default=True, verbose_name="アクティブ")
    
    class Meta:
        verbose_name = "ポケモンシリーズ"
        verbose_name_plural = "ポケモンシリーズ"
    
    def __str__(self):
        return self.name

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
    ]
    
    INVESTMENT_GRADE_CHOICES = [
        ('S', 'S級（最優先投資対象）'),
        ('A', 'A級（高投資価値）'),
        ('B', 'B級（中投資価値）'),
        ('C', 'C級（低投資価値）'),
        ('D', 'D級（投資非推奨）'),
    ]
    
    name_jp = models.CharField(max_length=200, verbose_name="日本語名")
    name_en = models.CharField(max_length=200, verbose_name="英語名")
    name_cn = models.CharField(max_length=200, blank=True, verbose_name="中国語名")
    card_number = models.CharField(max_length=50, verbose_name="カード番号")
    series = models.ForeignKey(PokemonSeries, on_delete=models.CASCADE, verbose_name="シリーズ")
    rarity = models.CharField(max_length=10, choices=RARITY_CHOICES, verbose_name="レアリティ")
    hp = models.IntegerField(null=True, blank=True, verbose_name="HP")
    card_type = models.CharField(max_length=50, verbose_name="カードタイプ")
    pokemon_type = models.CharField(max_length=50, blank=True, verbose_name="ポケモンタイプ")
    is_popular = models.BooleanField(default=False, verbose_name="人気カード")
    investment_grade = models.CharField(max_length=1, choices=INVESTMENT_GRADE_CHOICES, verbose_name="投資グレード")
    image_url = models.URLField(blank=True, verbose_name="画像URL")
    official_image = models.ImageField(upload_to='card_images/', blank=True, verbose_name="公式画像")
    metadata = models.JSONField(default=dict, verbose_name="メタデータ")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "ポケモンカード"
        verbose_name_plural = "ポケモンカード"
        unique_together = ['series', 'card_number']
    
    def __str__(self):
        return f"{self.name_jp} ({self.card_number})"

# ===================================
# アプリケーション: price_tracking/models.py
# ===================================

class PriceSource(models.Model):
    """価格収集元"""
    name = models.CharField(max_length=100, verbose_name="収集元名")
    base_url = models.URLField(verbose_name="ベースURL")
    is_active = models.BooleanField(default=True, verbose_name="アクティブ")
    scraping_config = models.JSONField(default=dict, verbose_name="スクレイピング設定")
    rate_limit_per_hour = models.IntegerField(default=100, verbose_name="時間当たりリクエスト制限")
    
    def __str__(self):
        return self.name

class PriceData(models.Model):
    """価格データ"""
    card = models.ForeignKey(PokemonCard, on_delete=models.CASCADE, related_name='price_data')
    source = models.ForeignKey(PriceSource, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="価格")
    condition = models.CharField(max_length=50, default='NM', verbose_name="状態")
    seller_info = models.JSONField(default=dict, verbose_name="販売者情報")
    listing_url = models.URLField(verbose_name="出品URL")
    collected_at = models.DateTimeField(auto_now_add=True, verbose_name="収集日時")
    
    class Meta:
        indexes = [
            models.Index(fields=['card', 'collected_at']),
            models.Index(fields=['source', 'collected_at']),
        ]

class PriceAnalysis(models.Model):
    """価格分析結果"""
    card = models.ForeignKey(PokemonCard, on_delete=models.CASCADE, related_name='price_analysis')
    analysis_date = models.DateField(default=timezone.now)
    current_price = models.DecimalField(max_digits=10, decimal_places=2)
    median_price = models.DecimalField(max_digits=10, decimal_places=2)
    average_price = models.DecimalField(max_digits=10, decimal_places=2)
    min_price = models.DecimalField(max_digits=10, decimal_places=2)
    max_price = models.DecimalField(max_digits=10, decimal_places=2)
    change_24h = models.FloatField(default=0.0, verbose_name="24時間変動率")
    change_7d = models.FloatField(default=0.0, verbose_name="7日間変動率")
    change_30d = models.FloatField(default=0.0, verbose_name="30日間変動率")
    volume = models.IntegerField(default=0, verbose_name="取引量")
    market_factors = models.JSONField(default=list, verbose_name="市場要因")
    prediction_30d = models.JSONField(default=dict, verbose_name="30日予測")
    confidence_score = models.FloatField(default=0.0, verbose_name="信頼度スコア")
    
    class Meta:
        unique_together = ['card', 'analysis_date']

# ===================================
# アプリケーション: content_collection/models.py
# ===================================

class ContentSource(models.Model):
    """コンテンツ収集元"""
    SOURCE_TYPES = [
        ('youtube', 'YouTube'),
        ('blog', 'ブログ'),
        ('news', 'ニュースサイト'),
        ('forum', 'フォーラム'),
        ('social', 'SNS'),
    ]
    
    name = models.CharField(max_length=200, verbose_name="収集元名")
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    url = models.URLField(verbose_name="URL")
    is_active = models.BooleanField(default=True)
    collection_config = models.JSONField(default=dict, verbose_name="収集設定")
    collection_interval_hours = models.IntegerField(default=6, verbose_name="収集間隔（時間）")
    last_collected_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.source_type})"

class CollectedContent(models.Model):
    """収集されたコンテンツ"""
    source = models.ForeignKey(ContentSource, on_delete=models.CASCADE)
    title = models.CharField(max_length=500)
    content = models.TextField()
    url = models.URLField()
    published_at = models.DateTimeField()
    collected_at = models.DateTimeField(auto_now_add=True)
    keywords = models.JSONField(default=list)
    relevance_score = models.FloatField(default=0.0, verbose_name="関連度スコア")
    is_processed = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['source', 'url']

# ===================================
# アプリケーション: ai_generation/models.py
# ===================================

class ContentTemplate(models.Model):
    """コンテンツテンプレート"""
    CONTENT_TYPES = [
        ('blog_jp', '日本語ブログ'),
        ('blog_en', '英語ブログ'),
        ('blog_cn', '中国語ブログ'),
        ('youtube_script', 'YouTube台本'),
        ('twitter_post', 'Twitter投稿'),
        ('instagram_post', 'Instagram投稿'),
    ]
    
    name = models.CharField(max_length=200)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    system_prompt = models.TextField(verbose_name="システムプロンプト")
    user_prompt_template = models.TextField(verbose_name="ユーザープロンプトテンプレート")
    max_tokens = models.IntegerField(default=2000)
    temperature = models.FloatField(default=0.7)
    target_keywords = models.JSONField(default=list, verbose_name="対象キーワード")
    quality_threshold = models.FloatField(default=0.7, verbose_name="品質閾値")
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.name} ({self.content_type})"

class GeneratedContent(models.Model):
    """生成されたコンテンツ"""
    STATUS_CHOICES = [
        ('draft', '下書き'),
        ('review', 'レビュー中'),
        ('approved', '承認済み'),
        ('published', '公開済み'),
        ('rejected', '却下'),
    ]
    
    card = models.ForeignKey(PokemonCard, on_delete=models.CASCADE, null=True, blank=True)
    template = models.ForeignKey(ContentTemplate, on_delete=models.CASCADE)
    title = models.CharField(max_length=500)
    content = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    quality_score = models.FloatField(default=0.0)
    quality_details = models.JSONField(default=dict)
    generated_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    
    class Meta:
        ordering = ['-generated_at']

# ===================================
# URLルーティング: pokemon_content_system/urls.py
# ===================================

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include([
        path('cards/', include('apps.cards.urls')),
        path('prices/', include('apps.price_tracking.urls')),
        path('content/', include('apps.content_collection.urls')),
        path('ai/', include('apps.ai_generation.urls')),
        path('publishing/', include('apps.publishing.urls')),
        path('analytics/', include('apps.analytics.urls')),
    ])),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)