import os

class Settings:
    # データベース設定
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/nagano3_db")
    
    # デバッグ設定
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
    
    # セキュリティ設定
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-development")
    
    # API設定
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", "8001"))
    
    # ログ設定
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

settings = Settings()
