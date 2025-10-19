# pokemon_content_system/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token

# API Routers
router = DefaultRouter()

# Cards app
from apps.cards.views import PokemonCardViewSet, PokemonSeriesViewSet
router.register(r'cards', PokemonCardViewSet)
router.register(r'series', PokemonSeriesViewSet)

# AI Generation app
from apps.ai_generation.views import (
    ContentTemplateViewSet, GeneratedContentViewSet, ContentGenerationViewSet
)
router.register(r'templates', ContentTemplateViewSet)
router.register(r'generated-content', GeneratedContentViewSet)
router.register(r'generation', ContentGenerationViewSet, basename='generation')

# Content Collection app
from apps.content_collection.views import ContentSourceViewSet, CollectedContentViewSet
router.register(r'content-sources', ContentSourceViewSet)
router.register(r'collected-content', CollectedContentViewSet)

# Publishing app
from apps.publishing.views import (
    PublishingPlatformViewSet, PublishedPostViewSet, PublishingScheduleViewSet
)
router.register(r'platforms', PublishingPlatformViewSet)
router.register(r'published-posts', PublishedPostViewSet)
router.register(r'schedules', PublishingScheduleViewSet)

# Analytics app
from apps.analytics.views import (
    ContentPerformanceViewSet, RevenueReportViewSet, SystemMetricsViewSet
)
router.register(r'performance', ContentPerformanceViewSet)
router.register(r'revenue', RevenueReportViewSet)
router.register(r'metrics', SystemMetricsViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API
    path('api/v1/', include(router.urls)),
    path('api/v1/auth/token/', obtain_auth_token),
    
    # Health Check
    path('api/v1/health/', include('apps.core.urls')),
    
    # Price Tracking
    path('api/v1/prices/', include('apps.price_tracking.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# apps/core/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.health_check, name='health_check'),
    path('database/', views.database_check, name='database_check'),
    path('cache/', views.cache_check, name='cache_check'),
    path('celery/', views.celery_check, name='celery_check'),
]

# apps/core/views.py
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
from celery import current_app
import redis
import time

def health_check(request):
    """アプリケーション全体のヘルスチェック"""
    return JsonResponse({
        'status': 'healthy',
        'timestamp': time.time(),
        'version': '1.0.0'
    })

def database_check(request):
    """データベース接続チェック"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({'database': 'healthy'})
    except Exception as e:
        return JsonResponse({'database': 'unhealthy', 'error': str(e)}, status=500)

def cache_check(request):
    """Redis/キャッシュ接続チェック"""
    try:
        cache.set('health_check', 'ok', 30)
        result = cache.get('health_check')
        if result == 'ok':
            return JsonResponse({'cache': 'healthy'})
        else:
            return JsonResponse({'cache': 'unhealthy'}, status=500)
    except Exception as e:
        return JsonResponse({'cache': 'unhealthy', 'error': str(e)}, status=500)

def celery_check(request):
    """Celery ワーカー接続チェック"""
    try:
        inspect = current_app.control.inspect()
        stats = inspect.stats()
        if stats:
            return JsonResponse({'celery': 'healthy', 'workers': len(stats)})
        else:
            return JsonResponse({'celery': 'no_workers'}, status=500)
    except Exception as e:
        return JsonResponse({'celery': 'unhealthy', 'error': str(e)}, status=500)

# apps/price_tracking/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'sources', views.PriceSourceViewSet)
router.register(r'data', views.PriceDataViewSet)
router.register(r'analysis', views.PriceAnalysisViewSet)
router.register(r'alerts', views.PriceAlertViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('scraping/start/', views.start_price_scraping, name='start_price_scraping'),
    path('analysis/generate/', views.generate_price_analysis, name='generate_price_analysis'),
]

# pokemon_content_system/settings.py
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# 環境変数読み込み
load_dotenv()

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent

# Security
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-me-in-production')
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Application definition
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
    'rest_framework.authtoken',
    'corsheaders',
    'django_extensions',
    'django_filters',
]

LOCAL_APPS = [
    'apps.core',
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
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'pokemon_content_system.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'pokemon_content_system.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'pokemon_content_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'password'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'charset': 'utf8',
        },
        'CONN_MAX_AGE': 60,
    }
}

# Cache (Redis)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://localhost:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Celery Configuration
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Tokyo'
CELERY_ENABLE_UTC = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30分
CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60  # 25分

# Celery Beat Schedule
CELERY_BEAT_SCHEDULE = {
    'collect-content-hourly': {
        'task': 'apps.content_collection.tasks.scheduled_content_collection',
        'schedule': 3600.0,  # 1時間毎
    },
    'analyze-prices-daily': {
        'task': 'apps.price_tracking.tasks.daily_price_analysis',
        'schedule': 86400.0,  # 1日毎
    },
    'generate-scheduled-content': {
        'task': 'apps.ai_generation.tasks.scheduled_content_generation',
        'schedule': 10800.0,  # 3時間毎
    },
    'update-performance-metrics': {
        'task': 'apps.analytics.tasks.update_performance_metrics',
        'schedule': 1800.0,  # 30分毎
    },
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'ja'
TIME_ZONE = 'Asia/Tokyo'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
}

# CORS settings
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://your-production-domain.com",
]

CORS_ALLOW_CREDENTIALS = True

# External API Keys
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')
YOUTUBE_CLIENT_ID = os.getenv('YOUTUBE_CLIENT_ID')
YOUTUBE_CLIENT_SECRET = os.getenv('YOUTUBE_CLIENT_SECRET')

# WordPress Integration
WORDPRESS_SITES = [
    {
        'name': os.getenv('WORDPRESS_SITE_NAME', 'メインサイト'),
        'url': os.getenv('WORDPRESS_URL'),
        'username': os.getenv('WORDPRESS_USERNAME'),
        'password': os.getenv('WORDPRESS_PASSWORD'),  # Application Password
    }
]

# Social Media API Keys
TWITTER_API_KEY = os.getenv('TWITTER_API_KEY')
TWITTER_API_SECRET = os.getenv('TWITTER_API_SECRET')
TWITTER_ACCESS_TOKEN = os.getenv('TWITTER_ACCESS_TOKEN')
TWITTER_ACCESS_TOKEN_SECRET = os.getenv('TWITTER_ACCESS_TOKEN_SECRET')

INSTAGRAM_ACCESS_TOKEN = os.getenv('INSTAGRAM_ACCESS_TOKEN')
FACEBOOK_ACCESS_TOKEN = os.getenv('FACEBOOK_ACCESS_TOKEN')

# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000

# Security Settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}

# Custom Settings
MAX_CONTENT_GENERATION_PER_HOUR = int(os.getenv('MAX_CONTENT_GENERATION_PER_HOUR', 50))
MAX_PRICE_COLLECTION_PER_HOUR = int(os.getenv('MAX_PRICE_COLLECTION_PER_HOUR', 1000))
CONTENT_QUALITY_THRESHOLD = float(os.getenv('CONTENT_QUALITY_THRESHOLD', 0.7))

# AWS S3 Settings (Optional)
if os.getenv('USE_S3') == 'True':
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'ap-northeast-1')
    
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'

# Development Tools
if DEBUG:
    INSTALLED_APPS.append('debug_toolbar')
    MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')
    
    INTERNAL_IPS = [
        '127.0.0.1',
        'localhost',
    ]

# Testing
if 'test' in sys.argv:
    DATABASES['default']['ENGINE'] = 'django.db.backends.sqlite3'
    DATABASES['default']['NAME'] = ':memory:'
    
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True

# pokemon_content_system/celery.py
import os
from celery import Celery

# Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pokemon_content_system.settings')

app = Celery('pokemon_content_system')

# Celery configuration
app.config_from_object('django.conf:settings', namespace='CELERY')

# Task discovery
app.autodiscover_tasks()

# Task routes
app.conf.task_routes = {
    'apps.ai_generation.tasks.*': {'queue': 'content_generation'},
    'apps.content_collection.tasks.*': {'queue': 'data_collection'},
    'apps.price_tracking.tasks.*': {'queue': 'price_tracking'},
    'apps.publishing.tasks.*': {'queue': 'publishing'},
    'apps.analytics.tasks.*': {'queue': 'analytics'},
}

# Priority queues
app.conf.task_default_queue = 'default'
app.conf.task_create_missing_queues = True

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

# pokemon_content_system/wsgi.py
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pokemon_content_system.settings')

application = get_wsgi_application()

# manage.py
#!/usr/bin/env python
import os
import sys

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pokemon_content_system.settings')
    
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    
    execute_from_command_line(sys.argv)