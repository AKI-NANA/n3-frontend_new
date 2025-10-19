#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
converter_api.py - CSV変換APIエンドポイント

このモジュールは、CSV変換機能のAPIエンドポイントを提供します。
仕訳帳データとマネーフォワードクラウドインポート形式の相互変換をサポートします。
"""

import os
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database.db_setup import get_session
from utils.security import get_current_user, User
from utils.logger import setup_logger, log_to_jsonl
from utils.config import settings
from services.csv_converter import CSVConverter  # 既存のCSVConverterを利用

# ロガー設定
logger = setup_logger()

# APIルーター
router = APIRouter()

# 一時ファイル保存ディレクトリ
TEMP_DIR = Path(settings.TEMP_DIR) if hasattr(settings, 'TEMP_DIR') else Path(tempfile.gettempdir()) / "csv_converter"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload", status_code=status.HTTP_200_OK)
async def upload_csv_file(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """CSVファイルをアップロードして形式を検出
    
    Args:
        file: アップロードされたCSVファイル
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        ファイル情報と検出結果
    """
    try:
        # ファイル形式チェック
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="アップロードできるのはCSVファイルのみです。"
            )
        
        # 一時ファイルとして保存
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        temp_file_path = TEMP_DIR / f"{current_user.username}_{timestamp}_{file.filename}"
        
        with open(temp_file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # CSVコンバーターのインスタンス化
        converter = CSVConverter()
        
        # ファイル形式検出
        detected_format = converter.detect_csv_format(str(temp_file_path))
        
        # ファイル読み込み（エンコーディング自動検出）
        try:
            df = converter.read_csv_to_dataframe(str(temp_file_path))
            row_count = len(df)
            column_count = len(df.columns)
            preview_data = df.head(10).to_dict('records')
            headers = df.columns.tolist()
        except Exception as e:
            logger.error(f"CSVファイル読み込みエラー: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"CSVファイルの読み込みに失敗しました: {str(e)}"
            )
        
        # アクティビティログ記録
        from database.repositories import get_activity_log_repository
        activity_repo = get_activity_log_repository(session)
        await activity_repo.log_activity(
            activity_type="csv_upload",
            description=f"CSVファイルのアップロード: {file.filename}",
            user=current_user.username,
            data={
                "file_name": file.filename,
                "format": detected_format,
                "row_count": row_count,
                "column_count": column_count
            }
        )
        
        # レスポンス
        return {
            "file_name": file.filename,
            "temp_file_path": str(temp_file_path),
            "format": detected_format,
            "row_count": row_count,
            "column_count": column_count,
            "headers": headers,
            "preview_data": preview_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSVファイルアップロードエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CSVファイルのアップロード処理に失敗しました: {str(e)}"
        )

@router.post("/preview", status_code=status.HTTP_200_OK)
async def preview_conversion(
    file_path: str = Form(...),
    target_format: str = Form(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """CSV変換のプレビューを生成
    
    Args:
        file_path: 一時保存されたCSVファイルパス
        target_format: 変換先フォーマット ("mf_cloud" または "journal")
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        変換プレビューデータ
    """
    try:
        # ファイルパスの検証
        temp_file_path = Path(file_path)
        if not temp_file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="指定されたファイルが見つかりません"
            )
        
        # ファイルの所有者チェック（ユーザー名がファイル名に含まれているか）
        if current_user.username not in temp_file_path.name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="このファイルにアクセスする権限がありません"
            )
        
        # 変換形式の検証
        if target_format not in ["mf_cloud", "journal"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="サポートされていない変換形式です"
            )
        
        # CSVコンバーターのインスタンス化
        converter = CSVConverter()
        
        # 元のCSV形式を検出
        source_format = converter.detect_csv_format(str(temp_file_path))
        
        # プレビュー用の一時出力ファイル
        preview_file_path = TEMP_DIR / f"preview_{temp_file_path.name}"
        
        # 変換実行
        converter.convert_csv_file(
            str(temp_file_path),
            str(preview_file_path),
            target_format
        )
        
        # 変換結果読み込み
        preview_df = converter.read_csv_to_dataframe(str(preview_file_path))
        preview_data = preview_df.head(10).to_dict('records')
        headers = preview_df.columns.tolist()
        row_count = len(preview_df)
        
        # アクティビティログ記録
        from database.repositories import get_activity_log_repository
        activity_repo = get_activity_log_repository(session)
        await activity_repo.log_activity(
            activity_type="csv_preview",
            description=f"CSV変換プレビュー生成: {temp_file_path.name} -> {target_format}",
            user=current_user.username,
            data={
                "source_format": source_format,
                "target_format": target_format,
                "row_count": row_count
            }
        )
        
        # レスポンス
        return {
            "file_name": temp_file_path.name,
            "preview_file_path": str(preview_file_path),
            "source_format": source_format,
            "target_format": target_format,
            "row_count": row_count,
            "headers": headers,
            "preview_data": preview_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSV変換プレビューエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CSV変換プレビューの生成に失敗しました: {str(e)}"
        )

@router.post("/download", status_code=status.HTTP_200_OK)
async def download_converted_csv(
    file_path: str = Form(...),
    target_format: str = Form(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """変換済みCSVファイルをダウンロード
    
    Args:
        file_path: 一時保存されたCSVファイルパス
        target_format: 変換先フォーマット ("mf_cloud" または "journal")
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        変換済みCSVファイル
    """
    try:
        # ファイルパスの検証
        temp_file_path = Path(file_path)
        if not temp_file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="指定されたファイルが見つかりません"
            )
        
        # ファイルの所有者チェック（ユーザー名がファイル名に含まれているか）
        if current_user.username not in temp_file_path.name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="このファイルにアクセスする権限がありません"
            )
        
        # 変換形式の検証
        if target_format not in ["mf_cloud", "journal"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="サポートされていない変換形式です"
            )
        
        # CSVコンバーターのインスタンス化
        converter = CSVConverter()
        
        # 元のCSV形式を検出
        source_format = converter.detect_csv_format(str(temp_file_path))
        
        # ダウンロード用の出力ファイル名
        original_name = temp_file_path.stem.split('_', 2)[-1]  # ユーザー名とタイムスタンプを除去
        format_suffix = "mf_cloud" if target_format == "mf_cloud" else "journal"
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        output_filename = f"{original_name}_{format_suffix}_{timestamp}.csv"
        output_file_path = TEMP_DIR / output_filename
        
        # 変換実行
        converter.convert_csv_file(
            str(temp_file_path),
            str(output_file_path),
            target_format
        )
        
        # アクティビティログ記録
        from database.repositories import get_activity_log_repository
        activity_repo = get_activity_log_repository(session)
        await activity_repo.log_activity(
            activity_type="csv_download",
            description=f"変換済みCSVダウンロード: {output_filename}",
            user=current_user.username,
            data={
                "source_format": source_format,
                "target_format": target_format,
                "source_file": temp_file_path.name,
                "output_file": output_filename
            }
        )
        
        # ファイルレスポンス
        return FileResponse(
            path=str(output_file_path),
            filename=output_filename,
            media_type="text/csv"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSV変換ダウンロードエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"変換済みCSVファイルの生成に失敗しました: {str(e)}"
        )

@router.post("/cleanup", status_code=status.HTTP_200_OK)
async def cleanup_temp_files(
    file_paths: List[str],
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """一時ファイルをクリーンアップ
    
    Args:
        file_paths: 削除する一時ファイルのパスリスト
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        クリーンアップ結果
    """
    try:
        deleted_files = []
        failed_files = []
        
        for file_path in file_paths:
            path = Path(file_path)
            
            # ファイルの所有者チェック（ユーザー名がファイル名に含まれているか）
            if current_user.username not in path.name:
                failed_files.append({"path": file_path, "reason": "権限がありません"})
                continue
            
            try:
                if path.exists():
                    path.unlink()
                    deleted_files.append(file_path)
                else:
                    failed_files.append({"path": file_path, "reason": "ファイルが存在しません"})
            except Exception as e:
                logger.error(f"ファイル削除エラー: {e}")
                failed_files.append({"path": file_path, "reason": str(e)})
        
        # アクティビティログ記録
        from database.repositories import get_activity_log_repository
        activity_repo = get_activity_log_repository(session)
        await activity_repo.log_activity(
            activity_type="csv_cleanup",
            description=f"一時ファイルのクリーンアップ: {len(deleted_files)}件削除, {len(failed_files)}件失敗",
            user=current_user.username,
            data={
                "deleted_count": len(deleted_files),
                "failed_count": len(failed_files)
            }
        )
        
        return {
            "success": True,
            "deleted_files": deleted_files,
            "failed_files": failed_files
        }
    
    except Exception as e:
        logger.error(f"一時ファイルクリーンアップエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"一時ファイルのクリーンアップに失敗しました: {str(e)}"
        )

@router.post("/batch", status_code=status.HTTP_200_OK)
async def batch_convert_files(
    files: List[UploadFile] = File(...),
    target_format: str = Form(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """複数のCSVファイルを一括変換
    
    Args:
        files: アップロードされたCSVファイルリスト
        target_format: 変換先フォーマット ("mf_cloud" または "journal")
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        一括変換結果
    """
    try:
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ファイルが選択されていません"
            )
        
        # 変換形式の検証
        if target_format not in ["mf_cloud", "journal"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="サポートされていない変換形式です"
            )
        
        # CSVコンバーターのインスタンス化
        converter = CSVConverter()
        
        # バッチ処理結果
        results = {
            "total": len(files),
            "success": 0,
            "failed": 0,
            "files": []
        }
        
        # バッチ処理用ディレクトリ
        batch_dir = TEMP_DIR / f"batch_{current_user.username}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        batch_dir.mkdir(exist_ok=True)
        
        # ファイルごとに処理
        for file in files:
            try:
                # ファイル形式チェック
                if not file.filename.endswith('.csv'):
                    raise ValueError("CSVファイルではありません")
                
                # 一時ファイルとして保存
                temp_file_path = batch_dir / file.filename
                
                with open(temp_file_path, "wb") as f:
                    content = await file.read()
                    f.write(content)
                
                # 元のCSV形式を検出
                source_format = converter.detect_csv_format(str(temp_file_path))
                
                # 出力ファイル名
                format_suffix = "mf_cloud" if target_format == "mf_cloud" else "journal"
                output_filename = f"{temp_file_path.stem}_{format_suffix}.csv"
                output_file_path = batch_dir / output_filename
                
                # 変換実行
                converter.convert_csv_file(
                    str(temp_file_path),
                    str(output_file_path),
                    target_format
                )
                
                results["success"] += 1
                results["files"].append({
                    "original_name": file.filename,
                    "output_name": output_filename,
                    "status": "success",
                    "source_format": source_format,
                    "output_path": str(output_file_path)
                })
                
            except Exception as e:
                logger.error(f"バッチ変換エラー ({file.filename}): {e}")
                results["failed"] += 1
                results["files"].append({
                    "original_name": file.filename,
                    "status": "failed",
                    "error": str(e)
                })
        
        # アクティビティログ記録
        from database.repositories import get_activity_log_repository
        activity_repo = get_activity_log_repository(session)
        await activity_repo.log_activity(
            activity_type="csv_batch_convert",
            description=f"CSVファイル一括変換: {results['success']}件成功, {results['failed']}件失敗",
            user=current_user.username,
            data={
                "target_format": target_format,
                "total": results["total"],
                "success": results["success"],
                "failed": results["failed"]
            }
        )
        
        # バッチ処理結果
        return results
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSV一括変換エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CSVファイルの一括変換に失敗しました: {str(e)}"
        )
