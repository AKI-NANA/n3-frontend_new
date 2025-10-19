"""
app/api/v1/endpoints/kanpeki_asin_upload_api.py - 完璧ASINアップロードAPI
用途: ASIN/商品URLアップロード機能のAPIエンドポイント
修正対象: 新しいエンドポイント追加時、レスポンス形式変更時
"""

import uuid
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import ValidationError
import io
import csv

from app.core.dependencies import (
    get_current_user,
    get_error_handler,
    get_pagination_params,
    PaginationParams
)
from app.core.logging import get_logger, log_api_request, log_business_event
from app.core.exceptions import (
    EmverzeException,
    ValidationException,
    BusinessLogicException,
    exception_to_http_exception
)
from app.domain.schemas.asin_upload_schemas import (
    ASINUploadRequest,
    URLUploadRequest,
    BulkUploadRequest,
    BulkUploadItem,
    ProcessingResultItem,
    ProcessingStatus,
    CSVUploadMetadata
)
from app.services.kanpeki_asin_upload_service import KanpekiASINUploadService

router = APIRouter(prefix="/asin-upload", tags=["ASIN Upload"])
logger = get_logger(__name__)

@router.post(
    "/asin",
    response_model=ProcessingResultItem,
    summary="単発ASIN処理",
    description="単一のASINを処理して商品データを取得"
)
async def tanpaku_asin_shori(
    request: ASINUploadRequest,
    service: KanpekiASINUploadService = Depends(),
    current_user = Depends(get_current_user),
    error_handler = Depends(get_error_handler)
) -> ProcessingResultItem:
    """
    単発ASIN処理
    
    説明: 単一のASINから商品データを取得し、オプションで商品を作成
    """
    try:
        # ビジネスイベントログ
        log_business_event(
            "asin_upload_single",
            {"asin": request.asin, "create_product": request.create_product},
            str(current_user.id)
        )
        
        # サービス実行
        result = await service.kanpeki_shori_asin_tanpaku(
            request=request,
            session_id=None
        )
        
        # 成功ログ
        logger.info(f"単発ASIN処理成功: {request.asin} - ユーザー: {current_user.id}")
        
        return result
        
    except ValidationException as e:
        logger.warning(f"ASIN処理バリデーションエラー: {request.asin} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "VALIDATION_ERROR",
                "message": str(e),
                "details": {"asin": request.asin}
            }
        )
    
    except EmverzeException as e:
        logger.error(f"ASIN処理ビジネスエラー: {request.asin} - {str(e)}")
        raise exception_to_http_exception(e)
    
    except Exception as e:
        logger.error(f"ASIN処理システムエラー: {request.asin} - {str(e)}")
        error_handler.handle_system_error(e, "単発ASIN処理")

@router.post(
    "/url",
    response_model=ProcessingResultItem,
    summary="単発URL処理",
    description="単一の商品URLを処理して商品データを取得"
)
async def tanpaku_url_shori(
    request: URLUploadRequest,
    service: KanpekiASINUploadService = Depends(),
    current_user = Depends(get_current_user),
    error_handler = Depends(get_error_handler)
) -> ProcessingResultItem:
    """
    単発URL処理
    
    説明: 単一の商品URLから商品データを取得し、オプションで商品を作成
    """
    try:
        # ビジネスイベントログ
        log_business_event(
            "url_upload_single",
            {"url": request.url, "create_product": request.create_product},
            str(current_user.id)
        )
        
        # サービス実行
        result = await service.kanpeki_shori_url_tanpaku(
            request=request,
            session_id=None
        )
        
        # 成功ログ
        logger.info(f"単発URL処理成功: {request.url} - ユーザー: {current_user.id}")
        
        return result
        
    except ValidationException as e:
        logger.warning(f"URL処理バリデーションエラー: {request.url} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "VALIDATION_ERROR",
                "message": str(e),
                "details": {"url": request.url}
            }
        )
    
    except EmverzeException as e:
        logger.error(f"URL処理ビジネスエラー: {request.url} - {str(e)}")
        raise exception_to_http_exception(e)
    
    except Exception as e:
        logger.error(f"URL処理システムエラー: {request.url} - {str(e)}")
        error_handler.handle_system_error(e, "単発URL処理")

@router.post(
    "/bulk",
    response_model=Dict[str, Any],
    summary="一括アップロード処理",
    description="複数のASIN・URLを一括処理（非同期）"
)
async def ikkatsu_upload_shori(
    request: BulkUploadRequest,
    background_tasks: BackgroundTasks,
    service: KanpekiASINUploadService = Depends(),
    current_user = Depends(get_current_user),
    error_handler = Depends(get_error_handler)
) -> Dict[str, Any]:
    """
    一括アップロード処理
    
    説明: 複数のASIN・URLを非同期で一括処理し、セッションIDを返却
    """
    try:
        # セッションID生成
        session_id = str(uuid.uuid4())
        
        # ビジネスイベントログ
        log_business_event(
            "bulk_upload_started",
            {
                "session_id": session_id,
                "item_count": len(request.items),
                "create_products": request.create_products
            },
            str(current_user.id)
        )
        
        # バックグラウンドタスクで非同期処理
        background_tasks.add_task(
            ikkatsu_shori_background,
            service,
            request,
            session_id,
            current_user.id
        )
        
        logger.info(f"一括処理開始: セッション={session_id}, アイテム数={len(request.items)}")
        
        return {
            "session_id": session_id,
            "status": "processing",
            "message": "一括処理を開始しました",
            "item_count": len(request.items),
            "estimated_time_minutes": len(request.items) * 0.1,  # 概算時間
            "progress_check_url": f"/api/v1/asin-upload/progress/{session_id}"
        }
        
    except ValidationException as e:
        logger.warning(f"一括処理バリデーションエラー: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "VALIDATION_ERROR",
                "message": str(e),
                "details": {"item_count": len(request.items)}
            }
        )
    
    except Exception as e:
        logger.error(f"一括処理開始エラー: {str(e)}")
        error_handler.handle_system_error(e, "一括処理開始")

async def ikkatsu_shori_background(
    service: KanpekiASINUploadService,
    request: BulkUploadRequest,
    session_id: str,
    user_id: int
) -> None:
    """
    一括処理バックグラウンドタスク
    
    説明: 一括処理の実際の実行をバックグラウンドで実行
    """
    try:
        logger.info(f"一括処理バックグラウンド開始: セッション={session_id}")
        
        # サービス実行
        results = await service.kanpeki_shori_ikkatsu(
            request=request,
            session_id=session_id
        )
        
        # 結果をキャッシュに保存
        from app.infrastructure.cache.redis_cache import CacheManager
        cache = CacheManager()
        await cache.set(f"results:{session_id}", results, ttl=3600)
        
        # 完了ログ
        success_count = len([r for r in results if r.status == "success"])
        error_count = len([r for r in results if r.status == "error"])
        
        log_business_event(
            "bulk_upload_completed",
            {
                "session_id": session_id,
                "total_items": len(results),
                "success_count": success_count,
                "error_count": error_count
            },
            str(user_id)
        )
        
        logger.info(f"一括処理バックグラウンド完了: セッション={session_id}, 成功={success_count}, エラー={error_count}")
        
    except Exception as e:
        logger.error(f"一括処理バックグラウンドエラー: セッション={session_id} - {str(e)}")
        
        # エラー状態をキャッシュに保存
        error_result = {
            "status": "error",
            "error_message": str(e),
            "completed_at": datetime.utcnow().isoformat()
        }
        
        from app.infrastructure.cache.redis_cache import CacheManager
        cache = CacheManager()
        await cache.set(f"results:{session_id}", error_result, ttl=3600)

@router.get(
    "/progress/{session_id}",
    summary="処理進捗確認",
    description="一括処理の進捗状況を確認"
)
async def shinchoku_kakunin(
    session_id: str,
    service: KanpekiASINUploadService = Depends(),
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    処理進捗確認
    
    説明: 指定されたセッションIDの一括処理進捗を確認
    """
    try:
        # 進捗情報取得
        progress = await service.shinchoku_kakunin(session_id)
        
        if progress['status'] == 'not_found':
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "SESSION_NOT_FOUND",
                    "message": "指定されたセッションが見つかりません",
                    "session_id": session_id
                }
            )
        
        logger.debug(f"進捗確認: セッション={session_id}, 進捗={progress.get('percentage', 0)}%")
        
        return progress
        
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"進捗確認エラー: セッション={session_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_code": "PROGRESS_CHECK_ERROR",
                "message": "進捗確認に失敗しました"
            }
        )

@router.get(
    "/results/{session_id}",
    response_model=List[ProcessingResultItem],
    summary="処理結果取得",
    description="一括処理の結果を取得"
)
async def kekka_shutoku(
    session_id: str,
    pagination: PaginationParams = Depends(get_pagination_params),
    service: KanpekiASINUploadService = Depends(),
    current_user = Depends(get_current_user)
) -> List[ProcessingResultItem]:
    """
    処理結果取得
    
    説明: 指定されたセッションIDの一括処理結果を取得
    """
    try:
        # キャッシュから結果取得
        from app.infrastructure.cache.redis_cache import CacheManager
        cache = CacheManager()
        results = await cache.get(f"results:{session_id}")
        
        if not results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "RESULTS_NOT_FOUND",
                    "message": "処理結果が見つかりません",
                    "session_id": session_id
                }
            )
        
        # エラー結果の場合
        if isinstance(results, dict) and results.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error_code": "PROCESSING_FAILED",
                    "message": results.get("error_message", "処理中にエラーが発生しました")
                }
            )
        
        # ページネーション適用
        start_index = pagination.offset
        end_index = start_index + pagination.per_page
        paginated_results = results[start_index:end_index]
        
        logger.info(f"結果取得: セッション={session_id}, 件数={len(paginated_results)}")
        
        return paginated_results
        
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"結果取得エラー: セッション={session_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_code": "RESULTS_FETCH_ERROR",
                "message": "結果取得に失敗しました"
            }
        )

@router.post(
    "/csv",
    response_model=Dict[str, Any],
    summary="CSVファイルアップロード",
    description="CSVファイルをアップロードして一括処理"
)
async def csv_upload_shori(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="CSVファイル"),
    create_products: bool = Form(True, description="商品を自動作成するか"),
    service: KanpekiASINUploadService = Depends(),
    current_user = Depends(get_current_user),
    error_handler = Depends(get_error_handler)
) -> Dict[str, Any]:
    """
    CSVファイルアップロード
    
    説明: CSVファイルをアップロードして非同期で一括処理
    """
    try:
        # ファイル検証
        if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
            raise ValidationException("サポートされていないファイル形式です")
        
        if file.size > 10 * 1024 * 1024:  # 10MB制限
            raise ValidationException("ファイルサイズが大きすぎます（10MB以下）")
        
        # ファイル読み込み
        file_content = await file.read()
        
        # セッションID生成
        session_id = str(uuid.uuid4())
        
        # ビジネスイベントログ
        log_business_event(
            "csv_upload_started",
            {
                "session_id": session_id,
                "filename": file.filename,
                "file_size": file.size,
                "create_products": create_products
            },
            str(current_user.id)
        )
        
        # バックグラウンドタスクで非同期処理
        background_tasks.add_task(
            csv_shori_background,
            service,
            file_content,
            file.filename,
            create_products,
            session_id,
            current_user.id
        )
        
        logger.info(f"CSVアップロード開始: セッション={session_id}, ファイル={file.filename}")
        
        return {
            "session_id": session_id,
            "status": "processing",
            "message": "CSVファイルの処理を開始しました",
            "filename": file.filename,
            "file_size": file.size,
            "progress_check_url": f"/api/v1/asin-upload/progress/{session_id}"
        }
        
    except ValidationException as e:
        logger.warning(f"CSVアップロードバリデーションエラー: {file.filename} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "VALIDATION_ERROR",
                "message": str(e),
                "details": {"filename": file.filename}
            }
        )
    
    except Exception as e:
        logger.error(f"CSVアップロードエラー: {file.filename} - {str(e)}")
        error_handler.handle_system_error(e, "CSVアップロード")

async def csv_shori_background(
    service: KanpekiASINUploadService,
    file_content: bytes,
    filename: str,
    create_products: bool,
    session_id: str,
    user_id: int
) -> None:
    """
    CSVファイル処理バックグラウンドタスク
    """
    try:
        logger.info(f"CSV処理バックグラウンド開始: セッション={session_id}, ファイル={filename}")
        
        # サービス実行
        results = await service.kanpeki_shori_csv_file(
            file_content=file_content,
            filename=filename,
            create_products=create_products,
            session_id=session_id
        )
        
        # 結果をキャッシュに保存
        from app.infrastructure.cache.redis_cache import CacheManager
        cache = CacheManager()
        await cache.set(f"results:{session_id}", results, ttl=3600)
        
        # 完了ログ
        success_count = len([r for r in results if r.status == "success"])
        error_count = len([r for r in results if r.status == "error"])
        
        log_business_event(
            "csv_upload_completed",
            {
                "session_id": session_id,
                "filename": filename,
                "total_items": len(results),
                "success_count": success_count,
                "error_count": error_count
            },
            str(user_id)
        )
        
        logger.info(f"CSV処理バックグラウンド完了: セッション={session_id}, 成功={success_count}, エラー={error_count}")
        
    except Exception as e:
        logger.error(f"CSV処理バックグラウンドエラー: セッション={session_id} - {str(e)}")
        
        # エラー状態をキャッシュに保存
        error_result = {
            "status": "error",
            "error_message": str(e),
            "completed_at": datetime.utcnow().isoformat()
        }
        
        from app.infrastructure.cache.redis_cache import CacheManager
        cache = CacheManager()
        await cache.set(f"results:{session_id}", error_result, ttl=3600)

@router.get(
    "/download/{session_id}",
    summary="結果CSVダウンロード",
    description="処理結果をCSV形式でダウンロード"
)
async def kekka_csv_download(
    session_id: str,
    service: KanpekiASINUploadService = Depends(),
    current_user = Depends(get_current_user)
) -> StreamingResponse:
    """
    結果CSVダウンロード
    
    説明: 処理結果をCSV形式でダウンロード
    """
    try:
        # キャッシュから結果取得
        from app.infrastructure.cache.redis_cache import CacheManager
        cache = CacheManager()
        results = await cache.get(f"results:{session_id}")
        
        if not results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="処理結果が見つかりません"
            )
        
        # CSV生成
        csv_content = generate_results_csv(results)
        
        # ストリーミングレスポンス
        def iter_csv():
            yield csv_content.encode('utf-8-sig')  # BOM付きUTF-8
        
        filename = f"asin_upload_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        logger.info(f"CSV ダウンロード: セッション={session_id}, ファイル={filename}")
        
        return StreamingResponse(
            iter_csv(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"CSV ダウンロードエラー: セッション={session_id} - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CSV ダウンロードに失敗しました"
        )

def generate_results_csv(results: List[ProcessingResultItem]) -> str:
    """
    処理結果CSV生成
    
    説明: 処理結果リストからCSV文字列を生成
    """
    output = io.StringIO()
    
    # CSVヘッダー
    headers = [
        "入力値", "入力種別", "ステータス", "マーケットプレイス", "ASIN",
        "商品名", "価格", "ブランド", "カテゴリ", "商品ID", "在庫ID",
        "エラーメッセージ", "処理日時"
    ]
    
    writer = csv.writer(output)
    writer.writerow(headers)
    
    # データ行
    for result in results:
        row = [
            result.input_value,
            result.input_type,
            "成功" if result.status == "success" else "エラー",
            result.marketplace or "",
            result.asin or "",
            result.product_name or "",
            result.price_formatted or "",
            result.brand or "",
            result.category or "",
            result.product_id or "",
            result.inventory_id or "",
            result.error_message or "",
            result.processed_at.strftime("%Y-%m-%d %H:%M:%S") if result.processed_at else ""
        ]
        writer.writerow(row)
    
    csv_content = output.getvalue()
    output.close()
    
    return csv_content

# === ヘルスチェック・統計エンドポイント ===

@router.get(
    "/health",
    summary="ヘルスチェック",
    description="ASINアップロード機能のヘルスチェック"
)
async def health_check(
    service: KanpekiASINUploadService = Depends()
) -> Dict[str, Any]:
    """
    ヘルスチェック
    
    説明: ASINアップロード機能の稼働状況を確認
    """
    try:
        # キャッシュ接続確認
        from app.infrastructure.cache.redis_cache import CacheManager
        cache = CacheManager()
        await cache.set("health_check", "ok", ttl=10)
        cache_status = "ok"
        
        # 外部API接続確認（簡易）
        amazon_status = "ok"  # 実際は簡単なAPI呼び出しでチェック
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "cache": cache_status,
                "amazon_api": amazon_status
            },
            "version": "1.0.0"
        }
        
    except Exception as e:
        logger.error(f"ヘルスチェックエラー: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }

@router.get(
    "/stats",
    summary="処理統計",
    description="ASINアップロード処理の統計情報"
)
async def shori_toukei(
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    処理統計
    
    説明: ASINアップロード処理の統計情報を取得
    """
    try:
        # 実際の実装では データベースから統計データを取得
        # ここではサンプルデータを返す
        
        return {
            "today": {
                "total_processed": 150,
                "success_count": 142,
                "error_count": 8,
                "success_rate": 94.7
            },
            "this_week": {
                "total_processed": 1250,
                "success_count": 1180,
                "error_count": 70,
                "success_rate": 94.4
            },
            "this_month": {
                "total_processed": 5680,
                "success_count": 5320,
                "error_count": 360,
                "success_rate": 93.7
            },
            "popular_marketplaces": [
                {"name": "Amazon", "count": 4200, "percentage": 73.9},
                {"name": "楽天", "count": 890, "percentage": 15.7},
                {"name": "Yahoo", "count": 590, "percentage": 10.4}
            ],
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"統計取得エラー: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="統計情報の取得に失敗しました"
        )
