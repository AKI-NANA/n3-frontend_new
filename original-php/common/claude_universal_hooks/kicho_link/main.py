#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
main.py - FastAPIエントリーポイント（責務分離完全版）

✅ 責務分離原則:
- ルーティング登録のみ
- アプリケーション起動のみ
- ビジネスロジック完全排除
- ライフサイクル管理委譲

✅ 統一システム対応:
- 統一APIレスポンス形式
- 統一例外ハンドラー
- 統一CORS設定
- 統一ミドルウェア
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time
from datetime import datetime
from typing import Dict, Any

# 統一システムインポート
from core.lifecycle_manager import LifecycleManager
from core.exceptions import EmverzeException, ValidationException, BusinessLogicException
from core.responses import create_api_response, create_error_response
from core.security import SecurityManager
from core.database import DatabaseManager
from utils.logger import setup_logger
from utils.config import settings

# APIルーター統一インポート
from api.routers import (
    auth_router,
    health_router,
    data_router,
    notification_router
)
# 将来のモジュール用（Phase 4以降で追加）
# from api.routers import (
#     shohin_router,
#     zaiko_router,
#     juchu_router
# )

# ロガー設定
logger = setup_logger()

# ライフサイクル管理
lifecycle_manager = LifecycleManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションライフサイクル管理"""
    # 起動処理
    logger.info("🚀 Emverze SaaS アプリケーション起動開始")
    
    try:
        # ライフサイクルマネージャーによる初期化
        await lifecycle_manager.startup()
        logger.info("✅ アプリケーション初期化完了")
        
        yield  # アプリケーション実行
        
    except Exception as e:
        logger.error(f"❌ アプリケーション起動エラー: {e}")
        raise
    finally:
        # 終了処理
        logger.info("🔄 アプリケーション終了処理開始")
        try:
            await lifecycle_manager.shutdown()
            logger.info("✅ アプリケーション終了処理完了")
        except Exception as e:
            logger.error(f"❌ 終了処理エラー: {e}")

# FastAPIアプリケーション作成
app = FastAPI(
    title="Emverze SaaS API",
    description="商用SaaS統合APIシステム",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan
)

# ===========================================
# 🔒 セキュリティミドルウェア
# ===========================================

# 信頼ホスト制限
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS.split(",") if settings.ALLOWED_HOSTS else ["*"]
    )

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ===========================================
# 📊 リクエスト処理ミドルウェア
# ===========================================

@app.middleware("http")
async def request_processing_middleware(request: Request, call_next):
    """リクエスト処理統一ミドルウェア"""
    start_time = time.time()
    request_id = f"{int(time.time() * 1000)}"
    
    # リクエスト情報をログに記録
    logger.info(
        f"📥 Request: {request.method} {request.url}",
        extra={
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "client_ip": request.client.host if request.client else "unknown"
        }
    )
    
    # リクエストにIDを付与
    request.state.request_id = request_id
    request.state.start_time = start_time
    
    try:
        # 次の処理を実行
        response = await call_next(request)
        
        # 処理時間計算
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Request-ID"] = request_id
        
        # レスポンス情報をログに記録
        logger.info(
            f"📤 Response: {response.status_code} ({process_time:.3f}s)",
            extra={
                "request_id": request_id,
                "status_code": response.status_code,
                "process_time": process_time
            }
        )
        
        return response
        
    except Exception as e:
        # 処理時間計算
        process_time = time.time() - start_time
        
        # エラーログ記録
        logger.error(
            f"💥 Request Error: {str(e)} ({process_time:.3f}s)",
            extra={
                "request_id": request_id,
                "error": str(e),
                "process_time": process_time
            }
        )
        
        # 統一エラーレスポンス返却
        error_response = create_error_response(
            message="リクエスト処理中にエラーが発生しました",
            error_code="REQUEST_PROCESSING_ERROR"
        )
        
        return JSONResponse(
            status_code=500,
            content=error_response,
            headers={
                "X-Process-Time": str(process_time),
                "X-Request-ID": request_id
            }
        )

# ===========================================
# 🚨 統一例外ハンドラー
# ===========================================

@app.exception_handler(EmverzeException)
async def emverze_exception_handler(request: Request, exc: EmverzeException):
    """Emverze統一例外ハンドラー"""
    logger.error(
        f"Emverze Exception: {exc.message}",
        extra={
            "request_id": getattr(request.state, 'request_id', 'unknown'),
            "exception_type": exc.__class__.__name__,
            "category": exc.category,
            "details": exc.details
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            message=exc.message,
            error_code=exc.error_code,
            error_details=exc.details
        ),
        headers={
            "X-Request-ID": getattr(request.state, 'request_id', 'unknown')
        }
    )

@app.exception_handler(ValidationException)
async def validation_exception_handler(request: Request, exc: ValidationException):
    """バリデーション例外ハンドラー"""
    logger.warning(
        f"Validation Error: {exc.message}",
        extra={
            "request_id": getattr(request.state, 'request_id', 'unknown'),
            "validation_errors": exc.details
        }
    )
    
    return JSONResponse(
        status_code=400,
        content=create_error_response(
            message=exc.message,
            error_code="VALIDATION_ERROR",
            error_details=exc.details
        ),
        headers={
            "X-Request-ID": getattr(request.state, 'request_id', 'unknown')
        }
    )

@app.exception_handler(BusinessLogicException)
async def business_logic_exception_handler(request: Request, exc: BusinessLogicException):
    """ビジネスロジック例外ハンドラー"""
    logger.warning(
        f"Business Logic Error: {exc.message}",
        extra={
            "request_id": getattr(request.state, 'request_id', 'unknown'),
            "business_context": exc.details
        }
    )
    
    return JSONResponse(
        status_code=422,
        content=create_error_response(
            message=exc.message,
            error_code="BUSINESS_LOGIC_ERROR",
            error_details=exc.details
        ),
        headers={
            "X-Request-ID": getattr(request.state, 'request_id', 'unknown')
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP例外ハンドラー"""
    logger.warning(
        f"HTTP Exception: {exc.detail}",
        extra={
            "request_id": getattr(request.state, 'request_id', 'unknown'),
            "status_code": exc.status_code
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            message=exc.detail,
            error_code=f"HTTP_{exc.status_code}"
        ),
        headers={
            "X-Request-ID": getattr(request.state, 'request_id', 'unknown')
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """一般例外ハンドラー"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    logger.error(
        f"Unexpected Error: {str(exc)}",
        extra={
            "request_id": request_id,
            "exception_type": exc.__class__.__name__,
            "traceback": str(exc)
        },
        exc_info=True
    )
    
    # 本番環境では詳細なエラー情報を隠す
    if settings.ENVIRONMENT == "production":
        message = "内部サーバーエラーが発生しました"
        error_details = {"request_id": request_id}
    else:
        message = f"予期しないエラーが発生しました: {str(exc)}"
        error_details = {
            "request_id": request_id,
            "exception_type": exc.__class__.__name__,
            "traceback": str(exc)
        }
    
    return JSONResponse(
        status_code=500,
        content=create_error_response(
            message=message,
            error_code="INTERNAL_SERVER_ERROR",
            error_details=error_details
        ),
        headers={
            "X-Request-ID": request_id
        }
    )

# ===========================================
# 🛣️ ルーター登録（責務分離）
# ===========================================

# システム基盤ルーター
app.include_router(
    health_router.router,
    prefix="/api/health",
    tags=["System Health"]
)

# 認証ルーター
app.include_router(
    auth_router.router,
    prefix="/api/auth",
    tags=["Authentication"]
)

# データ処理ルーター
app.include_router(
    data_router.router,
    prefix="/api/data",
    tags=["Data Processing"]
)

# 通知ルーター
app.include_router(
    notification_router.router,
    prefix="/api/notifications",
    tags=["Notifications"]
)

# 将来のモジュール用ルーター（Phase 4以降で有効化）
# app.include_router(
#     shohin_router.router,
#     prefix="/api/shohin",
#     tags=["商品管理"]
# )
# 
# app.include_router(
#     zaiko_router.router,
#     prefix="/api/zaiko",
#     tags=["在庫管理"]
# )
# 
# app.include_router(
#     juchu_router.router,
#     prefix="/api/juchu",
#     tags=["受注管理"]
# )

# ===========================================
# 🏠 ルートエンドポイント
# ===========================================

@app.get("/", response_model=Dict[str, Any])
async def root():
    """ルートエンドポイント"""
    return create_api_response(
        "success",
        "Emverze SaaS API へようこそ",
        {
            "application": "Emverze SaaS",
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "api_docs": "/docs" if settings.ENVIRONMENT == "development" else None,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.get("/api", response_model=Dict[str, Any])
async def api_info():
    """API情報エンドポイント"""
    return create_api_response(
        "success",
        "Emverze SaaS API情報",
        {
            "api_version": "v1",
            "available_endpoints": [
                "/api/health",
                "/api/auth",
                "/api/data",
                "/api/notifications"
            ],
            "documentation": "/docs" if settings.ENVIRONMENT == "development" else "利用不可",
            "support": "support@emverze.com"
        }
    )

# ===========================================
# 🚀 アプリケーション起動
# ===========================================

if __name__ == "__main__":
    import uvicorn
    
    # 開発環境用の起動設定
    uvicorn.run(
        "main:app",
        host=settings.HOST or "0.0.0.0",
        port=settings.PORT or 8000,
        reload=settings.ENVIRONMENT == "development",
        access_log=True,
        log_level="info" if settings.ENVIRONMENT == "production" else "debug"
    )

# ===========================================
# 📝 アプリケーション情報
# ===========================================

"""
アプリケーション構成:

📁 責務分離構造:
├── main.py                    # ✅ ルーティング・起動のみ
├── core/
│   ├── lifecycle_manager.py   # ✅ ライフサイクル管理
│   ├── exceptions.py          # ✅ 統一例外クラス
│   ├── responses.py           # ✅ 統一レスポンス
│   ├── security.py           # ✅ セキュリティ管理
│   └── database.py           # ✅ データベース管理
├── api/routers/              # ✅ ルーター分離
├── services/                 # ✅ ビジネスロジック
├── repositories/             # ✅ データアクセス
└── utils/                    # ✅ ユーティリティ

🎯 設計原則:
- main.py にはビジネスロジックを含めない
- 全てのロジックは適切なレイヤーに分離
- 統一されたAPIレスポンス形式
- 包括的なエラーハンドリング
- ライフサイクル管理の委譲

🔧 実行方法:
開発環境: uvicorn main:app --reload
本番環境: uvicorn main:app --host 0.0.0.0 --port 8000

📊 モニタリング:
- リクエストID追跡
- 処理時間測定
- 統一ログ出力
- エラー分類・通知
"""