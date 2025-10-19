# app/api/v1/endpoints/suppliers.py
"""
仕入先管理API エンドポイント

このモジュールは仕入先管理ダッシュボード用のAPIエンドポイントを提供します
- 仕入先一覧・詳細取得
- 仕入先の作成・更新・削除
- 統計データの取得
- 同期処理
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Path, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import io
import csv
from datetime import datetime, timedelta

from app.core.dependencies import get_db
from app.domain.schemas.supplier import (
    SupplierResponse,
    SupplierCreate,
    SupplierUpdate,
    SupplierStats,
    ChannelStats,
    RecentActivity
)
from app.services.supplier_service import SupplierService
from app.api.utils.response import create_success_response, create_paginated_response

router = APIRouter()

# 依存性注入
def get_supplier_service(db: AsyncSession = Depends(get_db)):
    return SupplierService(db)

@router.get("/suppliers", response_model=Dict[str, Any])
async def get_suppliers(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(50, ge=1, le=100, description="1ページあたりの件数"),
    channel: Optional[str] = Query(None, description="販路フィルター"),
    status: Optional[str] = Query(None, description="状態フィルター"),
    search: Optional[str] = Query(None, description="検索キーワード"),
    sort_by: str = Query("name", description="ソートフィールド"),
    sort_desc: bool = Query(False, description="降順ソート"),
    supplier_service: SupplierService = Depends(get_supplier_service)
):
    """仕入先一覧を取得"""
    try:
        suppliers, total = await supplier_service.get_suppliers(
            page=page,
            per_page=per_page,
            channel=channel,
            status=status,
            search=search,
            sort_by=sort_by,
            sort_desc=sort_desc
        )
        
        return create_paginated_response(
            data=[supplier.dict() for supplier in suppliers],
            page=page,
            per_page=per_page,
            total=total
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"仕入先一覧取得エラー: {str(e)}")

@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: int = Path(..., description="仕入先ID"),
    supplier_service: SupplierService = Depends(get_supplier_service)
):
    """指定した仕入先の詳細を取得"""
    try:
        supplier = await supplier_service.get_supplier_by_id(supplier_id)
        if not supplier:
            raise HTTPException(status_code=404, detail="仕入先が見つかりません")
        
        return create_success_response(data=supplier.dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"仕入先詳細取得エラー: {str(e)}")

@router.post("/suppliers", response_model=SupplierResponse)
async def create_supplier(
    supplier_data: SupplierCreate,
    supplier_service: SupplierService = Depends(get_supplier_service)
):
    """新規仕入先を作成"""
    try:
        supplier = await supplier_service.create_supplier(supplier_data)
        return create_success_response(data=supplier.dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"仕入先作成エラー: {str(e)}")

@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_data: SupplierUpdate,
    supplier_id: int = Path(..., description="仕入先ID"),
    supplier_service: SupplierService = Depends(get_supplier_service)
):
    """仕入先情報を更新"""
    try:
        supplier = await supplier_service.update_supplier(supplier_id, supplier_data)
        if not supplier:
            raise HTTPException(status_code=404, detail="仕入先が見つかりません")
        
        return create_success_response(data=supplier.dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"仕入先更新エラー: {str(e)}")

@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(
    supplier_id: int = Path(..., description="仕入先ID"),
    supplier_service: SupplierService = Depends(get_supplier_service)
):
    """仕入先を削除"""
    try:
        success = await supplier_service.delete_supplier(supplier_id)
        if not success:
            raise HTTPException(status_code=404, detail="仕入先が見つかりません")
        
        return create_success_response(data={"message": "仕入先が正常に削除されました"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"仕入先削除エラー: {str(e)}")

@router.get("/suppliers/stats", response_model=SupplierStats)
async def get_supplier_stats(
    supplier_service: SupplierService = Depends(get_supplier_service)
):
    """仕入先統計データを取得"""
    try:
        stats = await supplier_service.get_dashboard_stats()
        return