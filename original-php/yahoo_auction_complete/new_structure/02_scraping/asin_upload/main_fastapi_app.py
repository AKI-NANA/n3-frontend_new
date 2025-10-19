"""
app/main.py - FastAPI アプリケーション統合
用途: HTMLページ配信とAPI統合、静的ファイル配信
修正対象: 新機能追加時、ルーティング変更時
"""

from fastapi import FastAPI, Request, Depends
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
import logging

from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger
from app.core.exceptions import global_exception_handler, EmverzeException
from app.core.dependencies import get_current_user

# API ルーター インポート
from app.api.v1.endpoints import kanpeki_asin_upload_api

# 設定読み込み
settings = get_settings()
logger = get_logger(__name__)

# テンプレートエンジン設定
templates = Jinja2Templates(directory="templates")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    アプリケーションライフサイクル管理
    
    説明: 起動時・終了時の処理を定義
    """
    # 起動時処理
    logger.info("=== Emverze SaaS Application Starting ===")
    setup_logging()
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug Mode: {settings.DEBUG}")
    
    yield
    
    # 終了時処理
    logger.info("=== Emverze SaaS Application Shutting Down ===")

# FastAPIアプリケーション作成
app = FastAPI(
    title="Emverze SaaS",
    description="EC在庫・出品連携自動化システム",
    version="2.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# ミドルウェア設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# 例外ハンドラー登録
app.add_exception_handler(EmverzeException, global_exception_handler)

# 静的ファイル配信
app.mount("/static", StaticFiles(directory="static"), name="static")

# === HTML ページルーティング ===

@app.get("/", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    """
    ダッシュボードページ
    
    説明: メインダッシュボードページを配信
    """
    try:
        return templates.TemplateResponse(
            "dashboard/index.html", 
            {
                "request": request,
                "page_title": "ダッシュボード",
                "page_subtitle": "EC在庫・出品管理の概要",
                "current_page": "dashboard"
            }
        )
    except Exception as e:
        logger.error(f"ダッシュボードページエラー: {str(e)}")
        return templates.TemplateResponse(
            "errors/500.html",
            {"request": request, "error": "ページの読み込みに失敗しました"}
        )

@app.get("/asin-upload", response_class=HTMLResponse)
async def asin_upload_page(request: Request):
    """
    ASIN/商品URLアップロードページ
    
    説明: 静的HTMLをJinja2テンプレートとして配信
    """
    try:
        logger.info("ASINアップロードページアクセス")
        
        return templates.TemplateResponse(
            "asin_upload/upload_page.html",
            {
                "request": request,
                "page_title": "ASIN/商品URL アップロード",
                "page_subtitle": "Amazon ASIN、商品URL、またはCSVファイルをアップロードして商品データを一括取得",
                "current_page": "asin_upload",
                "api_base_url": "/api/v1/asin-upload",
                "websocket_url": f"ws://{request.url.hostname}:{request.url.port}/ws"
            }
        )
    except Exception as e:
        logger.error(f"ASINアップロードページエラー: {str(e)}")
        return templates.TemplateResponse(
            "errors/500.html",
            {"request": request, "error": "ページの読み込みに失敗しました"}
        )

@app.get("/inventory", response_class=HTMLResponse)
async def inventory_page(request: Request):
    """
    在庫管理ページ
    """
    try:
        return templates.TemplateResponse(
            "inventory/list.html",
            {
                "request": request,
                "page_title": "在庫管理",
                "page_subtitle": "商品在庫の監視・管理",
                "current_page": "inventory"
            }
        )
    except Exception as e:
        logger.error(f"在庫管理ページエラー: {str(e)}")
        return templates.TemplateResponse(
            "errors/500.html",
            {"request": request, "error": "ページの読み込みに失敗しました"}
        )

@app.get("/listings", response_class=HTMLResponse)
async def listings_page(request: Request):
    """
    出品管理ページ
    """
    try:
        return templates.TemplateResponse(
            "listings/list.html",
            {
                "request": request,
                "page_title": "出品管理",
                "page_subtitle": "マーケットプレイス出品の管理",
                "current_page": "listings"
            }
        )
    except Exception as e:
        logger.error(f"出品管理ページエラー: {str(e)}")
        return templates.TemplateResponse(
            "errors/500.html",
            {"request": request, "error": "ページの読み込みに失敗しました"}
        )

@app.get("/products", response_class=HTMLResponse)
async def products_page(request: Request):
    """
    商品管理ページ
    """
    try:
        return templates.TemplateResponse(
            "products/list.html",
            {
                "request": request,
                "page_title": "商品管理",
                "page_subtitle": "商品マスター情報の管理",
                "current_page": "products"
            }
        )
    except Exception as e:
        logger.error(f"商品管理ページエラー: {str(e)}")
        return templates.TemplateResponse(
            "errors/500.html",
            {"request": request, "error": "ページの読み込みに失敗しました"}
        )

@app.get("/analytics", response_class=HTMLResponse)
async def analytics_page(request: Request):
    """
    分析ページ
    """
    try:
        return templates.TemplateResponse(
            "analytics/dashboard.html",
            {
                "request": request,
                "page_title": "分析",
                "page_subtitle": "売上・在庫・出品データの分析",
                "current_page": "analytics"
            }
        )
    except Exception as e:
        logger.error(f"分析ページエラー: {str(e)}")
        return templates.TemplateResponse(
            "errors/500.html",
            {"request": request, "error": "ページの読み込みに失敗しました"}
        )

@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    """
    設定ページ
    """
    try:
        return templates.TemplateResponse(
            "settings/general.html",
            {
                "request": request,
                "page_title": "設定",
                "page_subtitle": "システム設定・API連携設定",
                "current_page": "settings"
            }
        )
    except Exception as e:
        logger.error(f"設定ページエラー: {str(e)}")
        return templates.TemplateResponse(
            "errors/500.html",
            {"request": request, "error": "ページの読み込みに失敗しました"}
        )

# === API ルーター統合 ===

# APIルーターグループ
api_v1 = FastAPI()

# ASIN アップロード API
api_v1.include_router(
    kanpeki_asin_upload_api.router,
    prefix="/asin-upload",
    tags=["ASIN Upload"]
)

# メインアプリにAPIルーター統合
app.mount("/api/v1", api_v1)

# === WebSocket ルーティング ===

from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio

class WebSocketManager:
    """
    WebSocket接続管理クラス
    """
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket, session_id: str):
        """WebSocket接続受け入れ"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket接続: {session_id}")
        
    def disconnect(self, session_id: str):
        """WebSocket接続切断"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket切断: {session_id}")
            
    async def send_progress(self, session_id: str, data: dict):
        """進捗データ送信"""
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_text(json.dumps(data))
            except Exception as e:
                logger.error(f"WebSocket送信エラー: {session_id} - {str(e)}")
                self.disconnect(session_id)

# WebSocket管理インスタンス
websocket_manager = WebSocketManager()

@app.websocket("/ws/asin-progress/{session_id}")
async def websocket_asin_progress(websocket: WebSocket, session_id: str):
    """
    ASIN処理進捗WebSocket
    
    説明: HTMLのupdateProgress()関数にリアルタイムデータを送信
    """
    await websocket_manager.connect(websocket, session_id)
    
    try:
        while True:
            # クライアントからのメッセージ受信（キープアライブ）
            data = await websocket.receive_text()
            
            # 進捗データ取得（実際はキャッシュから取得）
            progress_data = {
                "type": "progress_update",
                "session_id": session_id,
                "percentage": 0,
                "message": "接続中...",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await websocket_manager.send_progress(session_id, progress_data)
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(session_id)
    except Exception as e:
        logger.error(f"WebSocketエラー: {session_id} - {str(e)}")
        websocket_manager.disconnect(session_id)

# === ヘルスチェックエンドポイント ===

@app.get("/health")
async def health_check():
    """
    アプリケーションヘルスチェック
    """
    try:
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "2.0.0",
            "environment": settings.ENVIRONMENT
        }
    except Exception as e:
        logger.error(f"ヘルスチェックエラー: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# === エラーページ ===

@app.get("/404", response_class=HTMLResponse)
async def not_found_page(request: Request):
    """404エラーページ"""
    return templates.TemplateResponse(
        "errors/404.html",
        {"request": request, "page_title": "ページが見つかりません"}
    )

@app.get("/500", response_class=HTMLResponse)
async def server_error_page(request: Request):
    """500エラーページ"""
    return templates.TemplateResponse(
        "errors/500.html",
        {"request": request, "page_title": "サーバーエラー"}
    )

# === 開発用エンドポイント（DEBUG時のみ） ===

if settings.DEBUG:
    @app.get("/debug/routes")
    async def debug_routes():
        """
        ルート一覧表示（開発用）
        """
        routes = []
        for route in app.routes:
            if hasattr(route, 'methods') and hasattr(route, 'path'):
                routes.append({
                    "path": route.path,
                    "methods": list(route.methods),
                    "name": getattr(route, 'name', 'unknown')
                })
        return {"routes": routes}

# === アプリケーション起動時ログ ===

@app.on_event("startup")
async def startup_event():
    """
    アプリケーション起動時処理
    """
    logger.info("🚀 Emverze SaaS アプリケーション起動完了")
    logger.info(f"📍 アクセスURL: http://localhost:8000")
    logger.info(f"📄 API ドキュメント: http://localhost:8000/api/docs")
    logger.info(f"📊 ASINアップロード: http://localhost:8000/asin-upload")

@app.on_event("shutdown")
async def shutdown_event():
    """
    アプリケーション終了時処理
    """
    logger.info("⛔ Emverze SaaS アプリケーション終了")

# WebSocketマネージャーをグローバルに公開（他のモジュールから使用）
app.state.websocket_manager = websocket_manager

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
