"""
app/routes/asin_upload_routes.py - ASIN/URLアップロードルート
用途: ASIN、商品URL、CSVファイルアップロードのAPI処理
修正対象: 新しいアップロード機能追加時、バリデーションルール変更時
"""

import asyncio
import logging
from typing import List, Optional, Dict, Any, Union
from fastapi import (
    APIRouter, Depends, HTTPException, status, UploadFile, File,
    Request, Form, BackgroundTasks
)
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, validator, Field
import pandas as pd
import io
import re
from datetime import datetime

from app.core.dependencies import (
    get_current_user, get_asin_upload_service, get_error_handler,
    get_pagination_params
)
from app.core.logging import get_logger
from app.core.exceptions import (
    ValidationException, BusinessLogicException, ExternalServiceException
)
from app.services.asin_upload_service import AsinUploadService
from app.domain.models.user import UserModel

# ログ設定
logger = get_logger(__name__)

# テンプレート設定
templates = Jinja2Templates(directory="templates")

# ルーター作成
router = APIRouter(
    prefix="/asin-upload",
    tags=["ASIN/URLアップロード"],
    dependencies=[Depends(get_current_user)]
)

# === リクエストモデル ===

class ManualInputRequest(BaseModel):
    """手動入力リクエストモデル"""
    
    asin: Optional[str] = Field(None, max_length=10, description="Amazon ASIN")
    url: Optional[str] = Field(None, max_length=2000, description="商品URL")
    keyword: Optional[str] = Field(None, max_length=255, description="検索キーワード")
    sku: Optional[str] = Field(None, max_length=100, description="SKU")
    
    @validator('asin')
    def validate_asin(cls, v):
        """ASIN形式検証"""
        if v and not re.match(r'^B[0-9A-Z]{9}$', v):
            raise ValueError('無効なASIN形式です。B+9文字の英数字である必要があります。')
        return v
    
    @validator('url')
    def validate_url(cls, v):
        """URL形式検証"""
        if v:
            url_pattern = re.compile(
                r'^https?://'  # http:// or https://
                r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
                r'localhost|'  # localhost...
                r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
                r'(?::\d+)?'  # optional port
                r'(?:/?|[/?]\S+)$', re.IGNORECASE)
            if not url_pattern.match(v):
                raise ValueError('無効なURL形式です。')
        return v
    
    @validator('*', pre=True)
    def validate_at_least_one(cls, v, values):
        """ASINまたはURLのいずれかが必須"""
        if not values.get('asin') and not values.get('url'):
            raise ValueError('ASINまたはURLのいずれかを入力してください。')
        return v

class BulkInputRequest(BaseModel):
    """一括入力リクエストモデル"""
    
    items: List[str] = Field(..., max_items=1000, description="ASIN/URLリスト")
    
    @validator('items')
    def validate_items(cls, v):
        """アイテムリスト検証"""
        if not v:
            raise ValueError('処理するアイテムが指定されていません。')
        
        # 空行除去
        filtered_items = [item.strip() for item in v if item.strip()]
        
        if len(filtered_items) > 1000:
            raise ValueError('一度に処理できるのは1,000行までです。')
        
        return filtered_items

class UploadResultItem(BaseModel):
    """アップロード結果項目モデル"""
    
    input: str = Field(..., description="入力値")
    type: str = Field(..., description="種別（ASIN/URL）")
    status: str = Field(..., description="処理ステータス")
    product_name: Optional[str] = Field(None, description="商品名")
    price: Optional[str] = Field(None, description="価格")
    details: Optional[str] = Field(None, description="詳細情報")
    asin: Optional[str] = Field(None, description="取得されたASIN")
    sku: Optional[str] = Field(None, description="SKU")
    keyword: Optional[str] = Field(None, description="キーワード")
    error_message: Optional[str] = Field(None, description="エラーメッセージ")

class UploadResponse(BaseModel):
    """アップロードレスポンスモデル"""
    
    success: bool = Field(..., description="処理成功フラグ")
    message: str = Field(..., description="処理メッセージ")
    data: List[UploadResultItem] = Field(default_factory=list, description="処理結果")
    summary: Dict[str, int] = Field(default_factory=dict, description="処理サマリー")

# === ページ表示ルート ===

@router.get("/", response_class=HTMLResponse, name="asin_upload.index")
async def show_upload_page(
    request: Request,
    current_user: UserModel = Depends(get_current_user)
):
    """
    ASIN/URLアップロードページ表示
    
    説明: アップロードフォームを含むメインページを表示
    """
    try:
        context = {
            "request": request,
            "user": current_user,
            "page_title": "ASIN/商品URLアップロード",
            "page_description": "Amazon ASIN、商品URL、CSVファイルをアップロードして商品データを一括取得"
        }
        
        logger.info(f"ASIN/URLアップロードページ表示: ユーザー={current_user.id}")
        
        return templates.TemplateResponse("asin_upload.html", context)
        
    except Exception as e:
        logger.error(f"ページ表示エラー: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ページの表示に失敗しました"
        )

# === CSV ファイルアップロードルート ===

@router.post("/csv", response_model=UploadResponse)
async def upload_csv_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
    upload_service: AsinUploadService = Depends(get_asin_upload_service),
    error_handler = Depends(get_error_handler)
):
    """
    CSVファイルアップロード処理
    
    説明: アップロードされたCSVファイルを解析し、商品データを取得
    """
    try:
        # ファイル形式チェック
        allowed_types = ['text/csv', 'application/vnd.ms-excel', 
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        allowed_extensions = ['.csv', '.xlsx', '.xls']
        
        if (file.content_type not in allowed_types and 
            not any(file.filename.lower().endswith(ext) for ext in allowed_extensions)):
            raise ValidationException(
                "サポートされていないファイル形式です。CSV、XLS、XLSXファイルのみ対応しています。"
            )
        
        # ファイルサイズチェック (10MB)
        file_content = await file.read()
        if len(file_content) > 10 * 1024 * 1024:
            raise ValidationException(
                "ファイルサイズが大きすぎます。10MB以下のファイルをアップロードしてください。"
            )
        
        # ファイル解析
        try:
            if file.filename.lower().endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_content), encoding='utf-8')
            else:
                df = pd.read_excel(io.BytesIO(file_content))
        except UnicodeDecodeError:
            # UTF-8で読めない場合はShift_JISで試行
            df = pd.read_csv(io.BytesIO(file_content), encoding='shift_jis')
        except Exception as e:
            raise ValidationException(f"ファイルの解析に失敗しました: {str(e)}")
        
        # データ検証
        if df.empty:
            raise ValidationException("空のファイルです。有効なデータを含むファイルをアップロードしてください。")
        
        if len(df) > 10000:
            raise ValidationException("データ行数が上限を超えています。10,000行以下のファイルをアップロードしてください。")
        
        # 必要な列の確認
        required_columns = ['ASIN', 'URL']
        available_columns = df.columns.tolist()
        
        if not any(col in available_columns for col in required_columns):
            raise ValidationException(
                f"必要な列が見つかりません。以下のいずれかの列が必要です: {', '.join(required_columns)}"
            )
        
        # データ処理
        logger.info(f"CSVファイル処理開始: ファイル={file.filename}, 行数={len(df)}, ユーザー={current_user.id}")
        
        # バックグラウンドタスクで非同期処理
        result = await upload_service.process_csv_data(
            df=df,
            user_id=current_user.id,
            filename=file.filename
        )
        
        logger.info(f"CSVファイル処理完了: 成功={result.summary.get('success', 0)}, エラー={result.summary.get('error', 0)}")
        
        return result
        
    except ValidationException as e:
        error_handler.handle_business_error(e, "CSVファイルアップロード")
    except Exception as e:
        error_handler.handle_system_error(e, "CSVファイルアップロード")

# === 手動入力ルート ===

@router.post("/manual", response_model=UploadResponse)
async def process_manual_input(
    request: ManualInputRequest,
    current_user: UserModel = Depends(get_current_user),
    upload_service: AsinUploadService = Depends(get_asin_upload_service),
    error_handler = Depends(get_error_handler)
):
    """
    手動入力処理
    
    説明: 手動で入力されたASINまたはURLから商品データを取得
    """
    try:
        logger.info(f"手動入力処理開始: ASIN={request.asin}, URL={request.url}, ユーザー={current_user.id}")
        
        result = await upload_service.process_manual_input(
            asin=request.asin,
            url=request.url,
            keyword=request.keyword,
            sku=request.sku,
            user_id=current_user.id
        )
        
        logger.info(f"手動入力処理完了: ステータス={result.data[0].status if result.data else 'unknown'}")
        
        return result
        
    except ValidationException as e:
        error_handler.handle_business_error(e, "手動入力処理")
    except Exception as e:
        error_handler.handle_system_error(e, "手動入力処理")

# === 一括入力ルート ===

@router.post("/bulk", response_model=UploadResponse)
async def process_bulk_input(
    request: BulkInputRequest,
    current_user: UserModel = Depends(get_current_user),
    upload_service: AsinUploadService = Depends(get_asin_upload_service),
    error_handler = Depends(get_error_handler)
):
    """
    一括入力処理
    
    説明: 複数のASINまたはURLを一括で処理
    """
    try:
        logger.info(f"一括入力処理開始: アイテム数={len(request.items)}, ユーザー={current_user.id}")
        
        result = await upload_service.process_bulk_input(
            items=request.items,
            user_id=current_user.id
        )
        
        logger.info(f"一括入力処理完了: 成功={result.summary.get('success', 0)}, エラー={result.summary.get('error', 0)}")
        
        return result
        
    except ValidationException as e:
        error_handler.handle_business_error(e, "一括入力処理")
    except Exception as e:
        error_handler.handle_system_error(e, "一括入力処理")

# === アップロード履歴ルート ===

@router.get("/history", response_model=Dict[str, Any])
async def get_upload_history(
    current_user: UserModel = Depends(get_current_user),
    pagination = Depends(get_pagination_params),
    upload_service: AsinUploadService = Depends(get_asin_upload_service),
    error_handler = Depends(get_error_handler)
):
    """
    アップロード履歴取得
    
    説明: ユーザーのアップロード履歴を取得
    """
    try:
        logger.info(f"アップロード履歴取得: ユーザー={current_user.id}, ページ={pagination.page}")
        
        history = await upload_service.get_upload_history(
            user_id=current_user.id,
            page=pagination.page,
            per_page=pagination.per_page
        )
        
        return {
            "success": True,
            "data": history,
            "pagination": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": len(history)
            }
        }
        
    except Exception as e:
        error_handler.handle_system_error(e, "アップロード履歴取得")

# === 統計情報ルート ===

@router.get("/stats", response_model=Dict[str, Any])
async def get_upload_stats(
    current_user: UserModel = Depends(get_current_user),
    upload_service: AsinUploadService = Depends(get_asin_upload_service),
    error_handler = Depends(get_error_handler)
):
    """
    アップロード統計取得
    
    説明: ユーザーのアップロード統計情報を取得
    """
    try:
        logger.info(f"アップロード統計取得: ユーザー={current_user.id}")
        
        stats = await upload_service.get_upload_statistics(user_id=current_user.id)
        
        return {
            "success": True,
            "data": stats
        }
        
    except Exception as e:
        error_handler.handle_system_error(e, "アップロード統計取得")

# === バリデーションルート ===

@router.post("/validate-asin")
async def validate_asin(
    asin: str = Form(...),
    current_user: UserModel = Depends(get_current_user),
    upload_service: AsinUploadService = Depends(get_asin_upload_service)
):
    """
    ASIN検証
    
    説明: ASINの形式と有効性を検証
    """
    try:
        is_valid = await upload_service.validate_asin(asin)
        
        return {
            "success": True,
            "valid": is_valid,
            "asin": asin
        }
        
    except Exception as e:
        return {
            "success": False,
            "valid": False,
            "error": str(e)
        }

@router.post("/validate-url")
async def validate_url(
    url: str = Form(...),
    current_user: UserModel = Depends(get_current_user),
    upload_service: AsinUploadService = Depends(get_asin_upload_service)
):
    """
    URL検証
    
    説明: 商品URLの形式と有効性を検証
    """
    try:
        is_valid = await upload_service.validate_url(url)
        
        return {
            "success": True,
            "valid": is_valid,
            "url": url
        }
        
    except Exception as e:
        return {
            "success": False,
            "valid": False,
            "error": str(e)
        }

# === エラーハンドラー ===

@router.exception_handler(ValidationException)
async def validation_exception_handler(request: Request, exc: ValidationException):
    """バリデーションエラーハンドラー"""
    logger.warning(f"バリデーションエラー: {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "message": exc.message,
            "error_code": "VALIDATION_ERROR"
        }
    )

@router.exception_handler(BusinessLogicException)
async def business_logic_exception_handler(request: Request, exc: BusinessLogicException):
    """ビジネスロジックエラーハンドラー"""
    logger.warning(f"ビジネスロジックエラー: {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": exc.message,
            "error_code": "BUSINESS_LOGIC_ERROR"
        }
    )

@router.exception_handler(ExternalServiceException)
async def external_service_exception_handler(request: Request, exc: ExternalServiceException):
    """外部サービスエラーハンドラー"""
    logger.error(f"外部サービスエラー: {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={
            "success": False,
            "message": "外部サービスとの通信に失敗しました",
            "error_code": "EXTERNAL_SERVICE_ERROR"
        }
    )
