"""
modules/inventory/routes.py - ハイブリッド在庫管理APIルート
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from app.core.results import ExecutionResult
from app.core.exceptions import ResourceNotFoundError, ValidationError
from app.services.user_service import get_current_user
from app.domain.models.user import UserModel
from .services import InventoryService
from .schemas import (
    InventoryStatusResponse,
    InventoryAdjustmentRequest,
    InventoryFilterRequest,
    InventorySyncRequest,
    InventoryStatsResponse,
    HybridInventoryItem
)
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/inventory", tags=["inventory"])

def get_inventory_service() -> InventoryService:
    """在庫サービス取得"""
    return InventoryService()

@router.get("/", response_class=HTMLResponse)
async def inventory_dashboard(
    current_user: UserModel = Depends(get_current_user)
) -> HTMLResponse:
    """
    ハイブリッド在庫管理ダッシュボード表示
    """
    logger.info("Inventory dashboard accessed", extra={"user_id": current_user.id})
    
    # HTMLテンプレートを返す（後でテンプレートエンジンに置き換え）
    html_content = """
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Emverze SaaS - ハイブリッド在庫管理</title>
        <link href="/static/css/foundation.css" rel="stylesheet">
        <link href="/static/css/components.css" rel="stylesheet">
    </head>
    <body>
        <div id="inventory-dashboard">
            <h1>ハイブリッド在庫管理</h1>
            <div id="inventory-content">
                <!-- 動的コンテンツはJavaScriptで読み込み -->
            </div>
        </div>
        <script src="/static/js/inventory.js"></script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@router.get("/status", response_model=Dict[str, Any])
async def get_inventory_status(
    filters: InventoryFilterRequest = Depends(),
    current_user: UserModel = Depends(get_current_user),
    inventory_service: InventoryService = Depends(get_inventory_service)
) -> Dict[str, Any]:
    """
    在庫状況一覧取得
    """
    try:
        logger.info("Getting inventory status", extra={
            "user_id": current_user.id,
            "filters": filters.dict()
        })
        
        # 在庫状況取得
        result = await inventory_service.get_inventory_status(
            user_id=current_user.id,
            filters=filters
        )
        
        if result.is_failure():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result.error_message
            )
        
        return {
            "success": True,
            "data": result.data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get inventory status", extra={
            "user_id": current_user.id,
            "error": str(e)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="在庫状況の取得に失敗しました"
        )

@router.get("/stats", response_model=InventoryStatsResponse)
async def get_inventory_stats(
    current_user: UserModel = Depends(get_current_user),
    inventory_service: InventoryService = Depends(get_inventory_service)
) -> InventoryStatsResponse:
    """
    在庫統計情報取得
    """
    try:
        logger.info("Getting inventory stats", extra={"user_id": current_user.id})
        
        result = await inventory_service.get_inventory_stats(current_user.id)
        
        if result.is_failure():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result.error_message
            )
        
        return result.data
        
    except Exception as e:
        logger.error("Failed to get inventory stats", extra={
            "user_id": current_user.id,
            "error": str(e)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="在庫統計の取得に失敗しました"
        )

@router.get("/discrepancies", response_model=Dict[str, Any])
async def get_inventory_discrepancies(
    current_user: UserModel = Depends(get_current_user),
    inventory_service: InventoryService = Depends(get_inventory_service)
) -> Dict[str, Any]:
    """
    在庫差分取得
    """
    try:
        logger.info("Getting inventory discrepancies", extra={"user_id": current_user.id})
        
        result = await inventory_service.detect_inventory_discrepancies(current_user.id)
        
        if result.is_failure():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result.error_message
            )
        
        return {
            "success": True,
            "data": result.data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get inventory discrepancies", extra={
            "user_id": current_user.id,
            "error": str(e)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="在庫差分の取得に失敗しました"
        )

@router.post("/adjust", response_model=Dict[str, Any])
async def adjust_inventory(
    request: InventoryAdjustmentRequest,
    current_user: UserModel = Depends(get_current_user),
    inventory_service: InventoryService = Depends(get_inventory_service)
) -> Dict[str, Any]:
    """
    在庫調整
    """
    try:
        logger.info("Adjusting inventory", extra={
            "user_id": current_user.id,
            "sku": request.sku,
            "adjustment_type": request.adjustment_type
        })
        
        result = await inventory_service.adjust_inventory(
            user_id=current_user.id,
            request=request
        )
        
        if result.is_failure():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result.error_message
            )
        
        return {
            "success": True,
            "data": result.data,
            "message": "在庫調整が完了しました",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to adjust inventory", extra={
            "user_id": current_user.id,
            "sku": request.sku,
            "error": str(e)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="在庫調整に失敗しました"
        )

@router.post("/sync", response_model=Dict[str, Any])
async def sync_inventory(
    request: InventorySyncRequest,
    current_user: UserModel = Depends(get_current_user),
    inventory_service: InventoryService = Depends(get_inventory_service)
) -> Dict[str, Any]:
    """
    在庫同期
    """
    try:
        logger.info("Syncing inventory", extra={
            "user_id": current_user.id,
            "channels": request.channels,
            "sync_type": request.sync_type
        })
        
        result = await inventory_service.sync_inventory(
            user_id=current_user.id,
            request=request
        )
        
        if result.is_failure():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result.error_message
            )
        
        return {
            "success": True,
            "data": result.data,
            "message": "在庫同期が開始されました",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to sync inventory", extra={
            "user_id": current_user.id,
            "error": str(e)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="在庫同期に失敗しました"
        )

@router.post("/auto-adjust", response_model=Dict[str, Any])
async def auto_adjust_inventory(
    current_user: UserModel = Depends(get_current_user),
    inventory_service: InventoryService = Depends(get_inventory_service)
) -> Dict[str, Any]:
    """
    自動在庫調整
    """
    try:
        logger.info("Auto-adjusting inventory", extra={"user_id": current_user.id})
        
        result = await inventory_service.auto_adjust_inventory(current_user.id)
        
        if result.is_failure():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result.error_message
            )
        
        return {
            "success": True,
            "data": result.data,
            "message": "自動在庫調整が完了しました",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to auto-adjust inventory", extra={
            "user_id": current_user.id,
            "error": str(e)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="自動在庫調整に失敗しました"
        )

@router.get("/export", response_model=Dict[str, Any])
async def export_inventory(
    format: str = Query("csv", description="エクスポート形式"),
    filters: InventoryFilterRequest = Depends(),
    current_user: UserModel = Depends(get_current_user),
    inventory_service: InventoryService = Depends(get_inventory_service)
) -> Dict[str, Any]:
    """
    在庫データエクスポート
    """
    try:
        logger.info("Exporting inventory", extra={
            "user_id": current_user.id,
            "format": format,
            "filters": filters.dict()
        })
        
        result = await inventory_service.export_inventory(
            user_id=current_user.id,
            format=format,
            filters=filters
        )
        
        if result.is_failure():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result.error_message
            )
        
        return {
            "success": True,
            "data": result.data,
            "message": "在庫データのエクスポートが完了しました",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to export inventory", extra={
            "user_id": current_user.id,
            "format": format,
            "error": str(e)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="在庫データのエクスポートに失敗しました"
        )

@router.get("/{sku}/details", response_model=HybridInventoryItem)
async def get_inventory_details(
    sku: str,
    current_user: UserModel = Depends(get_current_user),
    inventory_service: InventoryService = Depends(get_inventory_service)
) -> HybridInventoryItem:
    """
    特定SKUの在庫詳細取得
    """
    try:
        logger.info("Getting inventory details", extra={
            "user_id": current_user.id,
            "sku": sku
        })
        
        result = await inventory_service.get_inventory_details(
            user_id=current_user.id,
            sku=sku
        )
        
        if result.is_failure():
            if "見つかりません" in result.error_message:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"SKU {sku} の在庫情報が見つかりません"
                )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result.error_message
            )
        
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get inventory details", extra={
            "user_id": current_user.id,
            "sku": sku,
            "error": str(e)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="在庫詳細の取得に失敗しました"
        )

@router.get("/health", response_model=Dict[str, Any])
async def inventory_health_check() -> Dict[str, Any]:
    """
    在庫システムヘルスチェック
    """
    return {
        "status": "healthy",
        "service": "inventory",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }