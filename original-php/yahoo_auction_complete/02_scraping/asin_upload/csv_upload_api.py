"""
app/api/v1/endpoints/csv_upload_api.py
CSVアップロードAPI - ナレッジ準拠完全版
用途: ASINリストCSVファイルの受信・検証・処理
修正対象: CSV形式追加時、バリデーションルール変更時
"""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pathlib import Path
import pandas as pd
import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.dependencies import get_db_session, get_current_user
from app.core.exceptions import ValidationException, BusinessLogicException
from app.services.csv_shori_service import CSVShoriService
from app.services.file_upload_service import FileUploadService
from app.domain.schemas.asin_schemas import (
    ASINUploadResponse,
    CSVUploadRequest, 
    CSVValidationResult,
    ASINProcessResult
)

settings = get_settings()
logger = get_logger(__name__)

router = APIRouter(
    prefix="/csv-upload", 
    tags=["CSV Upload"], 
    responses={404: {"description": "Not found"}}
)

class CSVUploadAPI:
    """
    CSVアップロードAPI制御クラス
    
    説明: CSVファイルのアップロード・検証・処理を統合管理
    主要機能: ファイル受信、形式検証、ASIN抽出、非同期処理
    修正対象: 新CSV形式追加時、処理ロジック変更時
    """
    
    def __init__(self):
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.allowed_extensions = ['.csv', '.xlsx', '.txt']
        self.max_rows = 10000  # 最大行数制限
        
    async def validate_csv_file(self, file: UploadFile) -> Dict[str, Any]:
        """
        CSVファイルバリデーション
        
        説明: アップロードファイルの基本検証
        戻り値: バリデーション結果
        修正対象: 検証ルール追加時
        """
        try:
            # ファイル存在チェック
            if not file or not file.filename:
                raise ValidationException("ファイルが選択されていません")
            
            # ファイル拡張子チェック
            file_ext = Path(file.filename).suffix.lower()
            if file_ext not in self.allowed_extensions:
                raise ValidationException(
                    f"サポートされていないファイル形式です: {file_ext}",
                    {"allowed_extensions": self.allowed_extensions}
                )
            
            # ファイルサイズチェック
            file_size = 0
            content = await file.read()
            file_size = len(content)
            
            if file_size > self.max_file_size:
                raise ValidationException(
                    f"ファイルサイズが上限を超えています: {file_size / 1024 / 1024:.1f}MB > {self.max_file_size / 1024 / 1024}MB"
                )
            
            # ファイルポインタを先頭に戻す
            await file.seek(0)
            
            return {
                "is_valid": True,
                "filename": file.filename,
                "file_size": file_size,
                "file_extension": file_ext,
                "content_type": file.content_type
            }
            
        except ValidationException:
            raise
        except Exception as e:
            logger.error(f"CSVファイルバリデーションエラー: {str(e)}")
            raise ValidationException(f"ファイル検証中にエラーが発生しました: {str(e)}")

@router.post("/upload", response_model=ASINUploadResponse)
async def upload_csv_file(
    file: UploadFile = File(..., description="CSVファイル"),
    upload_type: str = Form("csv", description="アップロード種別"),
    validate_only: bool = Form(False, description="検証のみ実行"),
    session: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    csv_service: CSVShoriService = Depends(lambda: CSVShoriService()),
    upload_service: FileUploadService = Depends(lambda: FileUploadService())
):
    """
    CSVファイルアップロード
    
    説明: CSVファイルを受信してASINリストを処理
    パラメータ:
        file: アップロードファイル
        upload_type: アップロード種別 (csv/excel/text)
        validate_only: True の場合は検証のみ実行
    戻り値: 処理結果とASINリスト
    """
    try:
        logger.info(f"CSVアップロード開始: ユーザー={current_user.id}, ファイル={file.filename}")
        
        # ファイルバリデーション
        api_controller = CSVUploadAPI()
        validation_result = await api_controller.validate_csv_file(file)
        
        if not validation_result["is_valid"]:
            raise ValidationException("ファイル検証に失敗しました")
        
        # 一時ファイル保存
        temp_file_path = await upload_service.save_temp_file(file)
        
        try:
            # CSV解析・ASIN抽出
            parse_result = await csv_service.parse_csv_file(
                temp_file_path,
                upload_type=upload_type,
                max_rows=api_controller.max_rows
            )
            
            # 検証のみの場合はここで終了
            if validate_only:
                return ASINUploadResponse(
                    success=True,
                    message="CSV検証が完了しました",
                    total_count=parse_result.total_rows,
                    valid_count=parse_result.valid_asin_count,
                    invalid_count=parse_result.invalid_asin_count,
                    asin_list=parse_result.valid_asins[:100],  # プレビュー用
                    validation_errors=parse_result.validation_errors,
                    file_info={
                        "filename": validation_result["filename"],
                        "file_size": validation_result["file_size"],
                        "rows_processed": parse_result.total_rows
                    }
                )
            
            # ASIN処理実行
            if parse_result.valid_asin_count > 0:
                process_result = await csv_service.process_asin_list(
                    parse_result.valid_asins,
                    user_id=current_user.id,
                    session=session
                )
                
                logger.info(f"ASIN処理完了: 成功={process_result.success_count}, 失敗={process_result.failure_count}")
                
                return ASINUploadResponse(
                    success=True,
                    message=f"CSVアップロードが完了しました。{process_result.success_count}件のASINを処理しました。",
                    total_count=parse_result.total_rows,
                    valid_count=parse_result.valid_asin_count,
                    invalid_count=parse_result.invalid_asin_count,
                    processed_count=process_result.success_count,
                    failed_count=process_result.failure_count,
                    asin_list=parse_result.valid_asins,
                    processing_errors=process_result.errors,
                    validation_errors=parse_result.validation_errors,
                    file_info={
                        "filename": validation_result["filename"],
                        "file_size": validation_result["file_size"],
                        "rows_processed": parse_result.total_rows
                    }
                )
            else:
                raise ValidationException("有効なASINが見つかりませんでした")
                
        finally:
            # 一時ファイル削除
            await upload_service.cleanup_temp_file(temp_file_path)
            
    except ValidationException as e:
        logger.warning(f"CSVアップロード検証エラー: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "VALIDATION_ERROR",
                "message": str(e),
                "details": getattr(e, 'details', {})
            }
        )
    except BusinessLogicException as e:
        logger.error(f"CSVアップロード業務エラー: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error_code": "BUSINESS_ERROR", 
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"CSVアップロード予期しないエラー: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_code": "INTERNAL_ERROR",
                "message": "CSVアップロード処理中にエラーが発生しました"
            }
        )

@router.post("/validate", response_model=CSVValidationResult)
async def validate_csv_content(
    file: UploadFile = File(..., description="検証対象CSVファイル"),
    upload_type: str = Form("csv", description="ファイル種別"),
    csv_service: CSVShoriService = Depends(lambda: CSVShoriService()),
    upload_service: FileUploadService = Depends(lambda: FileUploadService())
):
    """
    CSV内容検証のみ
    
    説明: ファイルを処理せず、内容の検証のみを実行
    用途: アップロード前のプレビュー・検証
    """
    try:
        # ファイルバリデーション
        api_controller = CSVUploadAPI()
        file_validation = await api_controller.validate_csv_file(file)
        
        # 一時保存・解析
        temp_file_path = await upload_service.save_temp_file(file)
        
        try:
            validation_result = await csv_service.validate_csv_content(
                temp_file_path,
                upload_type=upload_type,
                preview_rows=50  # プレビュー行数
            )
            
            return validation_result
            
        finally:
            await upload_service.cleanup_temp_file(temp_file_path)
            
    except Exception as e:
        logger.error(f"CSV検証エラー: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV検証に失敗しました: {str(e)}"
        )

@router.get("/formats", response_model=Dict[str, Any])
async def get_csv_formats():
    """
    サポートCSV形式情報取得
    
    説明: サポートしているCSV形式・列構成の情報を返す
    用途: フロントエンドでのフォーマット説明表示
    """
    return {
        "supported_formats": [
            {
                "name": "ASIN一覧CSV",
                "description": "ASIN値のみを含むシンプルな形式",
                "required_columns": ["ASIN"],
                "optional_columns": ["商品名", "価格", "カテゴリ"],
                "example_rows": [
                    "ASIN",
                    "B08N5WRWNW",
                    "B07FZ8S74R"
                ]
            },
            {
                "name": "商品情報付きCSV", 
                "description": "ASIN + 商品詳細情報を含む形式",
                "required_columns": ["ASIN", "商品名"],
                "optional_columns": ["価格", "カテゴリ", "メーカー", "説明"],
                "example_rows": [
                    "ASIN,商品名,価格",
                    "B08N5WRWNW,Echo Dot,5980",
                    "B07FZ8S74R,Fire TV Stick,4980"
                ]
            }
        ],
        "file_requirements": {
            "max_file_size": "10MB",
            "max_rows": 10000,
            "supported_extensions": [".csv", ".xlsx", ".txt"],
            "encoding": ["UTF-8", "Shift_JIS"]
        },
        "validation_rules": {
            "asin_format": "英数字10文字（B + 9文字）",
            "required_pattern": "^B[A-Z0-9]{9}$",
            "duplicate_handling": "重複ASINは自動除去",
            "error_limit": "100件まで詳細エラー表示"
        }
    }

@router.delete("/temp/{file_id}")
async def cleanup_temp_file(
    file_id: str,
    upload_service: FileUploadService = Depends(lambda: FileUploadService())
):
    """
    一時ファイル削除
    
    説明: アップロード処理で作成された一時ファイルを削除
    パラメータ: file_id - 一時ファイルID
    """
    try:
        await upload_service.cleanup_temp_file_by_id(file_id)
        return {"success": True, "message": "一時ファイルを削除しました"}
    except Exception as e:
        logger.error(f"一時ファイル削除エラー: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="一時ファイルの削除に失敗しました"
        )

# ルーター登録
def get_csv_upload_router() -> APIRouter:
    """CSV Upload APIルーター取得"""
    return router