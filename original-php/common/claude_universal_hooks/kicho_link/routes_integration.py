#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
routes.py - CSV変換ルート設定

このモジュールは、CSV変換ツールのルーティングを設定します。
"""

from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from database.db_setup import get_session
from utils.security import get_current_user, User
from utils.logger import setup_logger
from database.repositories import get_activity_log_repository

# ロガー設定
logger = setup_logger()

# テンプレート設定
templates = Jinja2Templates(directory="templates")

# ルーター設定
router = APIRouter()

@router.get("/converter", response_class=HTMLResponse)
async def converter(
    request: Request,
    step: int = 1,
    file_id: str = None,
    preview_id: str = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """CSV変換ツールページ
    
    Args:
        request: リクエスト
        step: 現在のステップ（1:ファイル選択, 2:変換設定, 3:変換結果）
        file_id: アップロードされたファイルのパス
        preview_id: プレビューファイルのパス
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        HTML応答
    """
    # コンテキスト初期化
    context = {
        "request": request,
        "user": current_user,
        "step": step,
        "file_info": None,
        "preview_info": None,
        "error": None,
        "message": None,
        "app_name": "記帳自動化ツール"
    }
    
    # ステップ2の場合、ファイル情報を取得
    if step == 2 and file_id:
        try:
            # ファイル情報をセッションから取得
            # 実際の実装では、APIやデータベースからファイル情報を取得する
            # ここでは仮の実装としてダミーデータを返す
            context["file_info"] = {
                "file_name": file_id.split('/')[-1],
                "temp_file_path": file_id,
                "format": "journal",  # 例: journal または mf_cloud
                "row_count": 100,
                "column_count": 10,
                "headers": ["取引日", "借方勘定科目", "借方金額", "貸方勘定科目", "貸方金額", "摘要"],
                "preview_data": [
                    {
                        "取引日": "2025/05/01",
                        "借方勘定科目": "旅費交通費",
                        "借方金額": "5000",
                        "貸方勘定科目": "普通預金",
                        "貸方金額": "5000",
                        "摘要": "タクシー代"
                    },
                    {
                        "取引日": "2025/05/02",
                        "借方勘定科目": "消耗品費",
                        "借方金額": "3000",
                        "貸方勘定科目": "普通預金",
                        "貸方金額": "3000",
                        "摘要": "事務用品"
                    }
                ]
            }
        except Exception as e:
            logger.error(f"ファイル情報取得エラー: {e}")
            context["error"] = f"ファイル情報の取得に失敗しました: {str(e)}"
    
    # ステップ3の場合、プレビュー情報を取得
    if step == 3 and file_id and preview_id:
        try:
            # プレビュー情報をセッションから取得
            # 実際の実装では、APIやデータベースからプレビュー情報を取得する
            # ここでは仮の実装としてダミーデータを返す
            context["file_info"] = {
                "file_name": file_id.split('/')[-1],
                "temp_file_path": file_id,
                "format": "journal"
            }
            
            context["preview_info"] = {
                "preview_file_path": preview_id,
                "source_format": "journal",
                "target_format": "mf_cloud",
                "row_count": 100,
                "headers": ["取引No", "取引日", "借方勘定科目", "借方金額(円)", "貸方勘定科目", "貸方金額(円)", "摘要", "決算整理仕訳"],
                "preview_data": [
                    {
                        "取引No": "1",
                        "取引日": "2025/05/01",
                        "借方勘定科目": "旅費交通費",
                        "借方金額(円)": "5000",
                        "貸方勘定科目": "普通預金",
                        "貸方金額(円)": "5000",
                        "摘要": "タクシー代",
                        "決算整理仕訳": "0"
                    },
                    {
                        "取引No": "2",
                        "取引日": "2025/05/02",
                        "借方勘定科目": "消耗品費",
                        "借方金額(円)": "3000",
                        "貸方勘定科目": "普通預金",
                        "貸方金額(円)": "3000",
                        "摘要": "事務用品",
                        "決算整理仕訳": "0"
                    }
                ]
            }
        except Exception as e:
            logger.error(f"プレビュー情報取得エラー: {e}")
            context["error"] = f"プレビュー情報の取得に失敗しました: {str(e)}"
    
    # アクティビティログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="converter_view",
        description=f"CSV変換ツール表示 (ステップ{step})",
        user=current_user.username,
        data={
            "step": step,
            "file_id": file_id,
            "preview_id": preview_id
        }
    )
    
    return templates.TemplateResponse("converter.html", context)

def include_converter_routes(app):
    """CSV変換ツールルートをアプリケーションに登録
    
    Args:
        app: FastAPIアプリケーション
    """
    # APIルートの登録
    from api.converter_api import router as converter_api_router
    app.include_router(
        converter_api_router,
        prefix="/api/converter",
        tags=["converter"]
    )
    
    # ページルートの登録
    app.include_router(
        router,
        tags=["converter"]
    )
