# Yahoo→eBay統合ワークフロー システム設定ファイル

# ===== データベース設定 =====
DATABASE_CONFIG = {
    # SQLite（開発・テスト環境）
    "sqlite": {
        "path": "yahoo_ebay_workflow_enhanced.db",
        "timeout": 30
    },
    
    # PostgreSQL（本格運用環境）
    "postgresql": {
        "host": "localhost",
        "database": "nagano3_db",
        "user": "aritahiroaki", 
        "password": "",
        "port": 5432,
        "timeout": 30
    }
}

# 現在使用中のデータベース
DATABASE_TYPE = "sqlite"  # "sqlite" または "postgresql"

# ===== APIサーバー設定 =====
API_CONFIG = {
    "host": "0.0.0.0",
    "port": 5001,
    "debug": True,
    "threaded": True,
    "max_requests_per_minute": 60,
    "cors_origins": ["http://localhost:8080", "http://localhost:3000"]
}

# ===== スクレイピング設定 =====
SCRAPING_CONFIG = {
    "playwright": {
        "headless": True,
        "timeout": 30000,
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "max_concurrent": 3
    },
    
    "rate_limiting": {
        "delay_between_requests": 2,
        "max_requests_per_hour": 100,
        "respect_robots_txt": True
    },
    
    "retry_policy": {
        "max_retries": 3,
        "backoff_factor": 2,
        "retry_statuses": [500, 502, 503, 504]
    }
}

# ===== eBay API設定 =====
EBAY_CONFIG = {
    "sandbox": {
        "enabled": True,
        "app_id": "YourSandboxAppID",
        "dev_id": "YourSandboxDevID", 
        "cert_id": "YourSandboxCertID",
        "user_token": "YourSandboxUserToken",
        "endpoint": "https://api.sandbox.ebay.com/ws/api/eBayAPI"
    },
    
    "production": {
        "enabled": False,
        "app_id": "YourProductionAppID",
        "dev_id": "YourProductionDevID",
        "cert_id": "YourProductionCertID", 
        "user_token": "YourProductionUserToken",
        "endpoint": "https://api.ebay.com/ws/api/eBayAPI"
    },
    
    "limits": {
        "daily_listing_limit": 5000,
        "api_calls_per_day": 5000,
        "max_retries": 3
    }
}

# ===== 送料計算設定 =====
SHIPPING_CONFIG = {
    "default_rates": {
        "fedex_ie": {"base": 33.0, "per_kg": 8.0, "delivery_days": "1-3"},
        "fedex_ip": {"base": 45.0, "per_kg": 12.0, "delivery_days": "1-2"},
        "cpass_speedpak": {"base": 16.0, "per_kg": 4.0, "delivery_days": "7-14"},
        "ems": {"base": 20.0, "per_kg": 6.0, "delivery_days": "3-7"},
        "air_mail": {"base": 12.0, "per_kg": 3.0, "delivery_days": "10-21"}
    },
    
    "country_adjustments": {
        "GB": 1.1, "DE": 1.1, "FR": 1.1,
        "AU": 1.05, "CA": 1.05,
        "US": 1.0
    },
    
    "exchange_rate": {
        "usd_jpy": 148.5,
        "auto_update": False,
        "api_source": "https://api.exchangerate-api.com/v4/latest/USD"
    }
}

# ===== 商品承認設定 =====
APPROVAL_CONFIG = {
    "ai_rules": {
        "auto_approve_threshold": 0.8,
        "auto_reject_threshold": 0.3,
        "require_human_review": True
    },
    
    "risk_categories": {
        "high_risk_keywords": [
            "ブランド品", "偽物", "コピー品", "レプリカ",
            "医薬品", "サプリメント", "危険物", "アダルト"
        ],
        "restricted_categories": [
            "医薬品・サプリメント", "危険物・化学品", 
            "武器・刃物類", "アダルト関連"
        ]
    },
    
    "notification_settings": {
        "email_alerts": False,
        "slack_webhook": "",
        "approval_timeout_hours": 24
    }
}

# ===== ログ設定 =====
LOGGING_CONFIG = {
    "level": "INFO",
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    "files": {
        "api_log": "logs/api_server.log",
        "scraping_log": "logs/scraping.log", 
        "error_log": "logs/errors.log"
    },
    "rotation": {
        "max_bytes": 10485760,  # 10MB
        "backup_count": 5
    }
}

# ===== セキュリティ設定 =====
SECURITY_CONFIG = {
    "csrf_protection": True,
    "session_timeout": 3600,  # 1時間
    "allowed_file_types": [".csv", ".xlsx", ".json"],
    "max_file_size": 10485760,  # 10MB
    "rate_limiting": {
        "enabled": True,
        "requests_per_minute": 60
    }
}

# ===== ファイルパス設定 =====
PATHS = {
    "uploads": "uploads/",
    "exports": "exports/",
    "logs": "logs/",
    "temp": "temp/", 
    "backups": "backups/"
}

# ===== 機能フラグ =====
FEATURE_FLAGS = {
    "enable_advanced_scraping": True,
    "enable_postgresql": False,
    "enable_ebay_api": False,
    "enable_auto_approval": False,
    "enable_real_time_updates": True,
    "enable_csv_export": True,
    "enable_shipping_calculation": True
}

# ===== 開発・デバッグ設定 =====
DEBUG_CONFIG = {
    "enable_debug_mode": True,
    "show_sql_queries": False,
    "enable_profiling": False,
    "mock_external_apis": True,
    "test_data_enabled": True
}
