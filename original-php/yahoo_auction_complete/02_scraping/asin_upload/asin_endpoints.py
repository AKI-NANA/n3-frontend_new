"""
app/api/v1/endpoints/asin.py - ASIN統一エンドポイント
用途: ASINアップロード機能のREST APIエンドポイント
修正対象: 新しいAPI機能追加時、レスポンス仕様変更時
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import io
import csv

from app.core.dependencies import (
    get_db_session,
    get_current_user,
    get_error_handler,
    get_pagination_params,
    PaginationParams
)
from app.core.exceptions import (
    ValidationException,
    ResourceNotFoundError,
    BusinessLogicException
)
from app.domain.schemas.asin_schemas import (
    ASINUploadCreate,
    ASINUploadResponse,
    ASINUploadDetailResponse,
    ASINRecordResponse,
    ASINUploadListResponse,
    ASINProcessingLogResponse,
    ASINUploadProgressResponse,
    ASINUploadStatisticsResponse,
    ASINBatchProcessRequest
)
from app.services.asin_upload_service import ASINUploadService
from app.services.asin_processor_service import ASINProcessorService
from app.services.asin_validation_service import ASINValidationService
from app.infrastructure.repositories.asin_repository import (
    ASINUploadRepository,
    ASINRecordRepository,
    ASINProcessingLogRepository
)
from app.tasks.asin_tasks import process_asin_upload_batch

router = APIRouter(prefix="/asin", tags=["ASIN管理"])

# === アップロード関連エンドポイント ===

@router.post("/upload", response_model=ASINUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_asin_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="ASINデータCSVファイル"),
    data_source: str = Form(..., description="データソース (amazon/rakuten/manual)"),
    processing_type: str = Form(..., description="処理タイプ (validation_only/full_process)"),
    auto_start: bool = Form(True, description="自動処理開始フラグ"),
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    error_handler = Depends(get_error_handler)
):
    """
    ASINファイルアップロード
    
    説明: CSVファイルをアップロードしてASIN処理バッチを作成
    - ファイル形式: CSV (UTF-8エンコード推奨)
    - 最大ファイルサイズ: 10MB
    - 最大レコード数: 10,000件
    """
    try:
        # ファイルバリデーション
        if not file.filename.lower().endswith('.csv'):
            raise ValidationException("CSVファイルをアップロードしてください")
        
        if file.size > 10 * 1024 * 1024:  # 10MB
            raise ValidationException("ファイルサイズは10MB以下にしてください")
        
        # サービス初期化
        upload_repo = ASINUploadRepository(db)
        validation_service = ASINValidationService()
        upload_service = ASINUploadService(upload_repo, validation_service)
        
        # ファイル内容読み込み
        file_content = await file.read()
        
        # アップロードバッチ作成
        upload_request = ASINUploadCreate(
            filename=file.filename,
            data_source=data_source,
            processing_type=processing_type,
            auto_start=auto_start
        )
        
        upload_batch = await upload_service.create_upload_batch(
            upload_request,
            file_content,
            current_user.id
        )
        
        # 自動処理開始
        if auto_start:
            background_tasks.add_task(
                process_asin_upload_batch,
                upload_batch.upload_id
            )
        
        return ASINUploadResponse.from_orm(upload_batch)
        
    except ValidationException as e:
        error_handler.handle_business_error(e, "ASINファイルアップロード")
    except Exception as e:
        error_handler.handle_system_error(e, "ASINファイルアップロード")

@router.post("/upload/manual", response_model=ASINUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_manual_asin_list(
    request: ASINBatchProcessRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    error_handler = Depends(get_error_handler)
):
    """
    手動ASINリストアップロード
    
    説明: JSON形式でASINリストを直接アップロード
    - 最大件数: 1,000件
    - ASIN形式: B01XXXXXXX (10文字)
    """
    try:
        # リクエストバリデーション
        if len(request.asin_codes) > 1000:
            raise ValidationException("ASINリストは1,000件以下にしてください")
        
        # サービス初期化
        upload_repo = ASINUploadRepository(db)
        validation_service = ASINValidationService()
        upload_service = ASINUploadService(upload_repo, validation_service)
        
        # CSV形式に変換
        csv_content = "ASIN\n" + "\n".join(request.asin_codes)
        csv_bytes = csv_content.encode('utf-8')
        
        # アップロードバッチ作成
        upload_request = ASINUploadCreate(
            filename=f"manual_upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            data_source="manual",
            processing_type=request.processing_type,
            auto_start=request.auto_start
        )
        
        upload_batch = await upload_service.create_upload_batch(
            upload_request,
            csv_bytes,
            current_user.id
        )
        
        # 自動処理開始
        if request.auto_start:
            background_tasks.add_task(
                process_asin_upload_batch,
                upload_batch.upload_id
            )
        
        return ASINUploadResponse.from_orm(upload_batch)
        
    except ValidationException as e:
        error_handler.handle_business_error(e, "手動ASINリストアップロード")
    except Exception as e:
        error_handler.handle_system_error(e, "手動ASINリストアップロード")

# === 取得・検索エンドポイント ===

@router.get("/uploads", response_model=ASINUploadListResponse)
async def get_upload_list(
    status: Optional[str] = Query(None, description="ステータスフィルター"),
    data_source: Optional[str] = Query(None, description="データソースフィルター"),
    date_from: Optional[datetime] = Query(None, description="開始日時"),
    date_to: Optional[datetime] = Query(None, description="終了日時"),
    pagination: PaginationParams = Depends(get_pagination_params),
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    error_handler = Depends(get_error_handler)
):
    """
    アップロード履歴一覧取得
    
    説明: ASINアップロードバッチの一覧を取得
    - ページネーション対応
    - フィルタリング対応 (ステータス、データソース、日時範囲)
    """
    try:
        upload_repo = ASINUploadRepository(db)
        
        # 検索条件構築
        conditions = {"uploaded_by": current_user.id}
        if status:
            conditions["status"] = status
        if data_source:
            conditions["data_source"] = data_source
        
        # アップロードリスト取得
        uploads = await upload_repo.find_by_conditions(
            conditions,
            limit=pagination.per_page,
            offset=pagination.offset
        )
        
        # 総件数取得
        total_count = await upload_repo.count_by_conditions(conditions)
        
        # レスポンス作成
        upload_responses = [ASINUploadResponse.from_orm(upload) for upload in uploads]
        
        return ASINUploadListResponse(
            uploads=upload_responses,
            total_count=total_count,
            page=pagination.page,
            per_page=pagination.per_page,
            has_next=pagination.offset + pagination.per_page < total_count
        )
        
    except Exception as e:
        error_handler.handle_system_error(e, "アップロード履歴一覧取得")

@router.get("/uploads/{upload_id}", response_model=ASINUploadDetailResponse)
async def get_upload_detail(
    upload_id: str,
    include_records: bool = Query(False, description="レコード詳細を含める"),
    include_logs: bool = Query(False, description="処理ログを含める"),
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    error_handler = Depends(get_error_handler)
):
    """
    アップロード詳細取得
    
    説明: 指定されたアップロードバッチの詳細情報を取得
    - 関連レコードやログの取得可能
    """
    try:
        upload_repo = ASINUploadRepository(db)
        record_repo = ASINRecordRepository(db)
        log_repo = ASINProcessingLogRepository(db)
        
        # アップロードバッチ取得
        upload = await upload_repo.get_by_upload_id(upload_id)
        if not upload:
            raise ResourceNotFoundError("アップロードバッチが見つかりません")
        
        # 権限チェック
        if upload.uploaded_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="アクセス権限がありません"
            )
        
        upload_response = ASINUploadDetailResponse.from_orm(upload)
        
        # レコード詳細取得
        if include_records:
            records = await record_repo.find_by_upload_batch(upload.id, limit=100)
            upload_response.records = [ASINRecordResponse.from_orm(record) for record in records]
        
        # ログ取得
        if include_logs:
            logs = await log_repo.find_by_upload_batch(upload.id, limit=50)
            upload_response.processing_logs = [ASINProcessingLogResponse.from_orm(log) for log in logs]
        
        return upload_response
        
    except ResourceNotFoundError as e:
        error_handler.handle_not_found_error("アップロードバッチ", upload_id)
    except Exception as e:
        error_handler.handle_system_error(e, "アップロード詳細取得")

@router.get("/uploads/{upload_id}/progress", response_model=ASINUploadProgressResponse)
async def get_upload_progress(
    upload_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    error_handler = Depends(get_error_handler)
):
    """
    アップロード進捗取得
    
    説明: リアルタイムの処理進捗情報を取得
    - 処理率、現在のステップ、エラー情報等
    """
    try:
        upload_repo = ASINUploadRepository(db)
        
        upload = await upload_repo.get_by_upload_id(upload_id)
        if not upload:
            raise ResourceNotFoundError("アップロードバッチが見つかりません")
        
        # 権限チェック
        if upload.uploaded_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="アクセス権限がありません"
            )
        
        # 進捗率計算
        progress_percentage = 0.0
        if upload.total_records > 0:
            progress_percentage = (upload.processed_records / upload.total_records) * 100
        
        return ASINUploadProgressResponse(
            upload_id=upload.upload_id,
            status=upload.status,
            progress_percentage=round(progress_percentage, 2),
            total_records=upload.total_records,
            processed_records=upload.processed_records,
            successful_records=upload.successful_records,
            failed_records=upload.failed_records,
            current_step=upload.current_step,
            estimated_remaining_time=upload.estimated_completion,
            started_at=upload.processing_started_at,
            last_updated=upload.updated_at
        )
        
    except ResourceNotFoundError as e:
        error_handler.handle_not_found_error("アップロードバッチ", upload_id)
    except Exception as e:
        error_handler.handle_system_error(e, "アップロード進捗取得")

# === 制御エンドポイント ===

@router.post("/uploads/{upload_id}/start", response_model=Dict[str, str])
async def start_upload_processing(
    upload_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    error_handler = Depends(get_error_handler)
):
    """
    アップロード処理開始
    
    説明: 待機中のアップロードバッチの処理を開始
    """
    try:
        upload_repo = ASINUploadRepository(db)
        
        upload = await upload_repo.get_by_upload_id(upload_id)
        if not upload:
            raise ResourceNotFoundError("アップロードバッチが見つかりません")
        
        # 権限チェック
        if upload.uploaded_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="アクセス権限がありません"
            )
        
        # ステータスチェック
        if upload.status != "pending":
            raise BusinessLogicException("処理開始可能なステータスではありません")
        
        # バックグラウンド処理開始
        background_tasks.add_task(process_asin_upload_batch, upload_id)
        
        # ステータス更新
        await upload_repo.update(upload.id, {
            "status": "processing",
            "processing_started_at": datetime.utcnow()
        })
        
        return {"message": "処理を開始しました", "upload_id": upload_id}
        
    except (ResourceNotFoundError, BusinessLogicException) as e:
        error_handler.handle_business_error(e, "アップロード処理開始")
    except Exception as e:
        error_handler.handle_system_error(e, "アップロード処理開始")

@router.post("/uploads/{upload_id}/cancel", response_model=Dict[str, str])
async def cancel_upload_processing(
    upload_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    error_handler = Depends(get_error_handler)
):
    """
    アップロード処理キャンセル
    
    説明: 処理中のアップロードバッチをキャンセル
    """
    try:
        upload_repo = ASINUploadRepository(db)
        
        upload = await upload_repo.get_by_upload_id(upload_id)
        if not upload:
            raise ResourceNotFoundError("アップロードバッチが見つかりません")
        
        # 権限チェック
        if upload.uploaded_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="アクセス権限がありません"
            )
        
        # ステータスチェック
        if upload.status not in ["pending", "processing"]:
            raise BusinessLogicException("キャンセル可能なステータスではありません")
        
        # ステータス更新
        await upload_repo.update(upload.id, {
            "status": "cancelled",
            "processing_completed_at": datetime.utcnow(),
            "error_message": "ユーザーによってキャンセルされました"
        })
        
        return {"message": "処理をキャンセルしました", "upload_id": upload_id}
        
    except (ResourceNotFoundError, BusinessLogicException) as e:
        error_handler.handle_business_error(e, "アップロード処理キャンセル")
    except Exception as e:
        error_handler.handle_system_error(e, "アップロード処理キャンセル")

# === 統計・分析エンドポイント ===

@router.get("/statistics", response_model=ASINUploadStatisticsResponse)
async def get_upload_statistics(
    period_days: int = Query(30, description="統計期間（日数）"),
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    error_handler = Depends(get_error_handler)
):
    """
    アップロード統計取得
    
    説明: 指定期間のアップロード統計情報を取得
    - 成功率、処理時間、エラー傾向等
    """
    try:
        upload_repo = ASINUploadRepository(db)
        
        # 統計期間設定
        date_from = datetime.utcnow() - timedelta(days=period_days)
        
        # 統計情報取得
        statistics = await upload_repo.get_statistics(
            date_from=date_from,
            user_id=current_user.id
        )
        
        return ASINUploadStatisticsResponse(**statistics)
        
    except Exception as e:
        error_handler.handle_system_error(e, "アップロード統計取得")

@router.get("/uploads/{upload_id}/export", response_class=StreamingResponse)
async def export_upload_results(
    upload_id: str,
    format: str = Query("csv", description="エクスポート形式 (csv/json)"),
    include_errors: bool = Query(True, description="エラー情報を含める"),
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user),
    error_handler = Depends(get_error_handler)
):
    """
    アップロード結果エクスポート
    
    説明: アップロード結果をCSVまたはJSON形式でエクスポート
    """
    try:
        upload_repo = ASINUploadRepository(db)
        record_repo = ASINRecordRepository(db)
        
        upload = await upload_repo.get_by_upload_id(upload_id)
        if not upload:
            raise ResourceNotFoundError("アップロードバッチが見つかりません")
        
        # 権限チェック
        if upload.uploaded_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="アクセス権限がありません"
            )
        
        # レコード取得
        records = await record_repo.find_by_upload_batch(upload.id)
        
        if format.lower() == "csv":
            # CSV形式でエクスポート
            output = io.StringIO()
            writer = csv.writer(output)
            
            # ヘッダー
            headers = ["ASIN", "ステータス", "処理日時"]
            if include_errors:
                headers.append("エラーメッセージ")
            writer.writerow(headers)
            
            # データ行
            for record in records:
                row = [
                    record.asin_code,
                    record.processing_status,
                    record.processed_at.isoformat() if record.processed_at else ""
                ]
                if include_errors:
                    row.append(record.error_message or "")
                writer.writerow(row)
            
            output.seek(0)
            content = output.getvalue().encode('utf-8-sig')  # BOM付きUTF-8
            
            filename = f"asin_upload_results_{upload_id}.csv"
            headers = {
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "text/csv; charset=utf-8"
            }
            
            return StreamingResponse(
                io.BytesIO(content),
                media_type="text/csv",
                headers=headers
            )
        
        else:
            # JSON形式でエクスポート（未実装）
            raise BusinessLogicException("JSON形式は現在対応していません")
        
    except ResourceNotFoundError as e:
        error_handler.handle_not_found_error("アップロードバッチ", upload_id)
    except Exception as e:
        error_handler.handle_system_error(e, "アップロード結果エクスポート")

# === ヘルスチェック・システム情報 ===

@router.get("/health", response_model=Dict[str, str])
async def health_check():
    """
    ヘルスチェック
    
    説明: ASIN処理システムの稼働状況確認
    """
    return {
        "status": "healthy",
        "service": "asin_upload_api",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/system/info", response_model=Dict[str, Any])
async def get_system_info(
    db: AsyncSession = Depends(get_db_session),
    current_user = Depends(get_current_user)
):
    """
    システム情報取得
    
    説明: ASIN処理システムの設定情報や制限値を取得
    """
    return {
        "max_file_size_mb": 10,
        "max_records_per_upload": 10000,
        "max_manual_asin_count": 1000,
        "supported_data_sources": ["amazon", "rakuten", "manual"],
        "supported_processing_types": ["validation_only", "full_process"],
        "supported_export_formats": ["csv"],
        "current_user": {
            "id": current_user.id,
            "username": current_user.username
        }
    }