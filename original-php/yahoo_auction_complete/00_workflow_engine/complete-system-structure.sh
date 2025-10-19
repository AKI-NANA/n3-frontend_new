# Pokemon Content System - 完全版プロジェクト構造

pokemon_content_system/
├── README.md
├── .env.example
├── .gitignore
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── manage.py
├── Makefile
│
├── config/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   ├── production.py
│   │   └── testing.py
│   ├── urls.py
│   ├── wsgi.py
│   ├── asgi.py
│   └── celery.py
│
├── apps/
│   ├── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── permissions.py
│   │   └── utils.py
│   │
│   ├── cards/
│   │   ├── __init__.py
│   │   ├── models.py          # PokemonCard, PokemonSeries
│   │   ├── views.py           # CardViewSet, SeriesViewSet
│   │   ├── serializers.py     # API serializers
│   │   ├── urls.py
│   │   ├── admin.py
│   │   ├── tasks.py           # Card data collection
│   │   └── migrations/
│   │
│   ├── price_tracking/
│   │   ├── __init__.py
│   │   ├── models.py          # PriceData, PriceSource, PriceAnalysis
│   │   ├── views.py           # Price API views
│   │   ├── serializers.py
│   │   ├── tasks.py           # Price collection tasks
│   │   ├── scrapers/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── mercari.py
│   │   │   ├── yahoo_auction.py
│   │   │   └── amazon.py
│   │   ├── analyzers/
│   │   │   ├── __init__.py
│   │   │   ├── trend_analyzer.py
│   │   │   └── predictor.py
│   │   └── migrations/
│   │
│   ├── content_collection/
│   │   ├── __init__.py
│   │   ├── models.py          # ContentSource, CollectedContent
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── tasks.py           # Content collection tasks
│   │   ├── collectors/
│   │   │   ├── __init__.py
│   │   │   ├── youtube.py
│   │   │   ├── blog.py
│   │   │   └── social.py
│   │   └── migrations/
│   │
│   ├── ai_generation/
│   │   ├── __init__.py
│   │   ├── models.py          # AIGeneratedContent, ContentTemplate
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── tasks.py           # AI generation tasks
│   │   ├── content_generator.py  # OpenAI integration
│   │   ├── quality_checker.py    # Quality management
│   │   ├── templates/         # Content templates
│   │   │   ├── blog_jp.json
│   │   │   ├── blog_en.json
│   │   │   ├── youtube_script.json
│   │   │   └── social_posts.json
│   │   └── migrations/
│   │
│   ├── publishing/
│   │   ├── __init__.py
│   │   ├── models.py          # PublishingPlatform, PublishedContent
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── tasks.py           # Publishing tasks
│   │   ├── publishers/
│   │   │   ├── __init__.py
│   │   │   ├── wordpress.py
│   │   │   ├── youtube.py
│   │   │   ├── twitter.py
│   │   │   └── instagram.py
│   │   └── migrations/
│   │
│   └── analytics/
│       ├── __init__.py
│       ├── models.py          # AnalyticsData, PerformanceMetrics
│       ├── views.py
│       ├── serializers.py
│       ├── dashboard.py       # Dashboard data
│       ├── reports/
│       │   ├── __init__.py
│       │   ├── content_report.py
│       │   ├── revenue_report.py
│       │   └── performance_report.py
│       └── migrations/
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   │   ├── DashboardMain.tsx
│   │   │   │   ├── StatsCards.tsx
│   │   │   │   └── RecentActivity.tsx
│   │   │   ├── ContentGeneration/
│   │   │   │   ├── ContentGenerator.tsx
│   │   │   │   ├── TemplateSelector.tsx
│   │   │   │   └── GenerationProgress.tsx
│   │   │   ├── CardManagement/
│   │   │   │   ├── CardList.tsx
│   │   │   │   ├── CardDetail.tsx
│   │   │   │   └── PriceChart.tsx
│   │   │   ├── Publishing/
│   │   │   │   ├── PublishingQueue.tsx
│   │   │   │   ├── PlatformSettings.tsx
│   │   │   │   └── PublishingHistory.tsx
│   │   │   └── Analytics/
│   │   │       ├── AnalyticsDashboard.tsx
│   │   │       ├── ContentPerformance.tsx
│   │   │       └── RevenueTracking.tsx
│   │   ├── hooks/
│   │   │   ├── useApi.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── useLocalStorage.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── websocket.ts
│   │   │   └── utils.ts
│   │   ├── types/
│   │   │   ├── card.types.ts
│   │   │   ├── content.types.ts
│   │   │   └── analytics.types.ts
│   │   └── utils/
│   │       ├── formatters.ts
│   │       ├── validators.ts
│   │       └── constants.ts
│   ├── public/
│   └── build/
│
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
│
├── scripts/
│   ├── start-dev.sh
│   ├── start-prod.sh
│   ├── migrate.sh
│   ├── collect-static.sh
│   ├── backup-db.sh
│   ├── restore-db.sh
│   └── deploy.sh
│
├── nginx/
│   ├── nginx.conf
│   ├── default.conf
│   └── ssl/
│
├── fixtures/
│   ├── pokemon_series.json
│   ├── pokemon_cards.json
│   ├── content_templates.json
│   └── initial_users.json
│
├── tests/
│   ├── __init__.py
│   ├── test_cards/
│   ├── test_price_tracking/
│   ├── test_ai_generation/
│   ├── test_publishing/
│   └── test_analytics/
│
├── logs/
├── media/
├── staticfiles/
└── docs/
    ├── api_documentation.md
    ├── deployment_guide.md
    ├── user_manual.md
    └── development_guide.md