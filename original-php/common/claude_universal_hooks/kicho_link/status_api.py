#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
status_api.py - システムステータスと統計情報のAPIエンドポイント
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from database.db_setup import get_session
from database.repositories import (
    get_rule_repository, 
    get_transaction_repository, 
    get_journal_entry_repository, 
    get_activity_log_repository
)
from utils.security import get_current_user, User, get_current_admin_user
from utils.logger import setup_logger, read_jsonl_logs
from utils.config import settings

# ロガー設定
logger = setup_logger()

# APIルーター
router = APIRouter()

# リクエスト/レスポンスモデル
class SystemStatus(BaseModel):
    """システムステータスモデル"""
    status: str = Field(..., description="システム全体のステータス")
    api_version: str = Field(..., description="APIバージョン")
    environment: str = Field(..., description="実行環境")
    timestamp: datetime = Field(..., description="ステータス取得時刻")
    database_connected: bool = Field(..., description="データベース接続状態")
    mf_cloud_configured: bool = Field(..., description="マネーフォワードクラウド連携設定状態")
    auto_execution_enabled: bool = Field(..., description="自動実行機能の有効状態")

class ProcessingStats(BaseModel):
    """処理統計情報モデル"""
    total_transactions: int = Field(..., description="全トランザクション数")
    processed_transactions: int = Field(..., description="処理済みトランザクション数")
    pending_transactions: int = Field(..., description="未処理トランザクション数")
    error_transactions: int = Field(..., description="エラーのあるトランザクション数")
    total_journal_entries: int = Field(..., description="全仕訳データ数")
    pending_journal_entries: int = Field(..., description="送信待ち仕訳データ数")
    sent_journal_entries: int = Field(..., description="送信済み仕訳データ数")
    failed_journal_entries: int = Field(..., description="送信失敗仕訳データ数")
    total_rules: int = Field(..., description="全ルール数")
    active_rules: int = Field(..., description="有効なルール数")

class ActivitySummary(BaseModel):
    """アクティビティ概要モデル"""
    timestamp: datetime = Field(..., description="タイムスタンプ")
    activity_type: str = Field(..., description="アクティビティタイプ")
    description: str = Field(..., description="説明")
    user: Optional[str] = Field(None, description="ユーザー")

class ErrorLogEntry(BaseModel):
    """エラーログエントリモデル"""
    timestamp: datetime = Field(..., description="タイムスタンプ")
    type: str = Field(..., description="エラータイプ")
    description: Optional[str] = Field(None, description="説明")
    details: Optional[Dict[str, Any]] = Field(None, description="詳細情報")

# エンドポイント: システムステータス取得
@router.get("/system", response_model=SystemStatus)
async def get_system_status(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """システム全体のステータス情報を取得
    
    Args:
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        システムステータス情報
    """
    try:
        # データベース接続テスト
        db_connected = True
        await session.execute("SELECT 1")
    except Exception as e:
        logger.error(f"データベース接続エラー: {e}")
        db_connected = False
    
    status_data = {
        "status": "healthy" if db_connected else "degraded",
        "api_version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow(),
        "database_connected": db_connected,
        "mf_cloud_configured": settings.is_mf_cloud_configured(),
        "auto_execution_enabled": settings.AUTO_EXECUTION_ENABLED
    }
    
    # ログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="system_status",
        description="システムステータス取得",
        user=current_user.username,
        data={"status": status_data["status"]}
    )
    
    return SystemStatus(**status_data)

# エンドポイント: 処理統計情報取得
@router.get("/stats", response_model=ProcessingStats)
async def get_processing_stats(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """処理統計情報を取得
    
    Args:
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        処理統計情報
    """
    # リポジトリの取得
    transaction_repo = get_transaction_repository(session)
    journal_repo = get_journal_entry_repository(session)
    rule_repo = get_rule_repository(session)
    
    # 全トランザクション取得
    all_transactions = await transaction_repo.get_all()
    
    # 処理状態ごとに集計
    processed_transactions = [tx for tx in all_transactions if tx.is_processed]
    pending_transactions = [tx for tx in all_transactions if not tx.is_processed]
    error_transactions = [tx for tx in all_transactions if tx.processing_status == "error"]
    
    # 全仕訳データ取得
    all_journal_entries = await journal_repo.get_all()
    
    # MFクラウド連携状態ごとに集計
    pending_journal_entries = [je for je in all_journal_entries if je.mf_status == "pending"]
    sent_journal_entries = [je for je in all_journal_entries if je.mf_status == "sent"]
    failed_journal_entries = [je for je in all_journal_entries if je.mf_status == "failed"]
    
    # 全ルール取得
    all_rules = await rule_repo.get_all()
    
    # 有効なルールの集計
    active_rules = [rule for rule in all_rules if rule.is_active]
    
    # 統計情報の作成
    stats = {
        "total_transactions": len(all_transactions),
        "processed_transactions": len(processed_transactions),
        "pending_transactions": len(pending_transactions),
        "error_transactions": len(error_transactions),
        "total_journal_entries": len(all_journal_entries),
        "pending_journal_entries": len(pending_journal_entries),
        "sent_journal_entries": len(sent_journal_entries),
        "failed_journal_entries": len(failed_journal_entries),
        "total_rules": len(all_rules),
        "active_rules": len(active_rules)
    }
    
    # ログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="processing_stats",
        description="処理統計情報取得",
        user=current_user.username,
        data=stats
    )
    
    return ProcessingStats(**stats)

# エンドポイント: 最近のアクティビティ取得
@router.get("/activities", response_model=List[ActivitySummary])
async def get_recent_activities(
    limit: int = Query(20, description="取得件数", ge=1, le=100),
    activity_type: Optional[str] = Query(None, description="アクティビティタイプでフィルタリング"),
    user: Optional[str] = Query(None, description="ユーザーでフィルタリング"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """最近のアクティビティログを取得
    
    Args:
        limit: 取得件数
        activity_type: アクティビティタイプ
        user: ユーザー名
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        アクティビティログ一覧
    """
    activity_repo = get_activity_log_repository(session)
    
    # ユーザーでフィルタリング
    if user:
        activities = await activity_repo.find_by_user(user, limit)
    # アクティビティタイプでフィルタリング
    elif activity_type:
        activities = await activity_repo.find_by_activity_type(activity_type, limit)
    # 全件取得（最新順）
    else:
        activities = await activity_repo.find_recent_activities(limit)
    
    # ActivitySummaryに変換
    activity_summaries = [
        ActivitySummary(
            timestamp=activity.created_at,
            activity_type=activity.activity_type,
            description=activity.description,
            user=activity.user
        )
        for activity in activities
    ]
    
    return activity_summaries

# エンドポイント: エラーログ取得
@router.get("/error_logs", response_model=List[ErrorLogEntry])
async def get_error_logs(
    limit: int = Query(20, description="取得件数", ge=1, le=100),
    current_user: User = Depends(get_current_admin_user)  # 管理者権限が必要
):
    """エラーログを取得
    
    Args:
        limit: 取得件数
        current_user: 現在のユーザー（管理者権限が必要）
        
    Returns:
        エラーログ一覧
    """
    # エラーログファイルからログを読み込み
    logs = read_jsonl_logs(settings.ERROR_LOG_FILE, limit)
    
    # ErrorLogEntryに変換
    error_log_entries = []
    for log in logs:
        # タイムスタンプの処理
        if "timestamp" in log:
            if isinstance(log["timestamp"], str):
                log["timestamp"] = datetime.fromisoformat(log["timestamp"].replace("Z", "+00:00"))
        else:
            log["timestamp"] = datetime.utcnow()
        
        # 詳細情報の整理
        details = {k: v for k, v in log.items() if k not in ["timestamp", "type", "description"]}
        
        error_log_entries.append(
            ErrorLogEntry(
                timestamp=log["timestamp"],
                type=log.get("type", "unknown"),
                description=log.get("description", log.get("error", "Unknown error")),
                details=details if details else None
            )
        )
    
    # ログ記録
    session = next(get_session())
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="error_logs",
        description=f"エラーログ取得（{len(error_log_entries)}件）",
        user=current_user.username,
        data={"limit": limit}
    )
    
    return error_log_entries

# エンドポイント: システム状態のリセット（テスト/開発用）
@router.post("/reset", status_code=status.HTTP_204_NO_CONTENT)
async def reset_system_state(
    reset_transactions: bool = Query(False, description="トランザクションをリセットするフラグ"),
    reset_journal_entries: bool = Query(False, description="仕訳データをリセットするフラグ"),
    reset_activities: bool = Query(False, description="アクティビティログをリセットするフラグ"),
    reset_rules: bool = Query(False, description="ルールをリセットするフラグ"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)  # 管理者権限が必要
):
    """システム状態をリセット（テスト/開発用）
    
    注意: この操作は取り消しできません。本番環境では使用しないでください。
    
    Args:
        reset_transactions: トランザクションをリセットするフラグ
        reset_journal_entries: 仕訳データをリセットするフラグ
        reset_activities: アクティビティログをリセットするフラグ
        reset_rules: ルールをリセットするフラグ
        session: データベースセッション
        current_user: 現在のユーザー（管理者権限が必要）
    """
    # 本番環境では使用不可
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="本番環境ではこの操作は許可されていません"
        )
    
    # リセット情報を記録
    reset_info = {
        "reset_transactions": reset_transactions,
        "reset_journal_entries": reset_journal_entries,
        "reset_activities": reset_activities,
        "reset_rules": reset_rules
    }
    
    # トランザクションリセット
    if reset_transactions:
        await session.execute("DELETE FROM transactions")
        await session.commit()
    
    # 仕訳データリセット
    if reset_journal_entries:
        await session.execute("DELETE FROM journal_entries")
        await session.commit()
    
    # アクティビティログリセット
    if reset_activities:
        await session.execute("DELETE FROM activity_logs")
        await session.commit()
    
    # ルールリセット
    if reset_rules:
        await session.execute("DELETE FROM rules")
        await session.commit()
    
    # ログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="system_reset",
        description="システム状態リセット",
        user=current_user.username,
        data=reset_info
    )
    
    return None

# エンドポイント: 期間ごとの処理統計
@router.get("/timeframe_stats", response_model=Dict[str, Any])
async def get_timeframe_stats(
    days: int = Query(30, description="集計期間（日）", ge=1, le=365),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """期間ごとの処理統計を取得
    
    Args:
        days: 集計期間（日数）
        session: データベースセッション
        current_user: 現在のユーザー
        
    Returns:
        期間ごとの処理統計
    """
    # リポジトリの取得
    transaction_repo = get_transaction_repository(session)
    journal_repo = get_journal_entry_repository(session)
    
    # 期間の計算
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # 期間内のトランザクション取得
    transactions = await transaction_repo.find_by_date_range(
        start_date=start_date.date(),
        end_date=end_date.date()
    )
    
    # 期間内の仕訳データ取得
    journal_entries = await journal_repo.find_by_date_range(
        start_date=start_date.date(),
        end_date=end_date.date()
    )
    
    # 日付ごとの集計
    daily_stats = {}
    
    # 日数分のデータを初期化
    for i in range(days):
        day = (end_date - timedelta(days=i)).date().isoformat()
        daily_stats[day] = {
            "transactions": 0,
            "processed_transactions": 0,
            "journal_entries": 0,
            "sent_journal_entries": 0
        }
    
    # トランザクション集計
    for tx in transactions:
        day = tx.transaction_date.date().isoformat()
        if day in daily_stats:
            daily_stats[day]["transactions"] += 1
            if tx.is_processed:
                daily_stats[day]["processed_transactions"] += 1
    
    # 仕訳データ集計
    for je in journal_entries:
        day = je.entry_date.date().isoformat()
        if day in daily_stats:
            daily_stats[day]["journal_entries"] += 1
            if je.mf_status == "sent":
                daily_stats[day]["sent_journal_entries"] += 1
    
    # 集計結果を日付順にソート
    sorted_stats = {
        k: daily_stats[k] 
        for k in sorted(daily_stats.keys())
    }
    
    # 累計統計
    total_stats = {
        "total_transactions": len(transactions),
        "total_processed_transactions": sum(1 for tx in transactions if tx.is_processed),
        "total_journal_entries": len(journal_entries),
        "total_sent_journal_entries": sum(1 for je in journal_entries if je.mf_status == "sent")
    }
    
    # 結果
    result = {
        "period": {
            "start_date": start_date.date().isoformat(),
            "end_date": end_date.date().isoformat(),
            "days": days
        },
        "daily_stats": sorted_stats,
        "total_stats": total_stats
    }
    
    # ログ記録
    activity_repo = get_activity_log_repository(session)
    await activity_repo.log_activity(
        activity_type="timeframe_stats",
        description=f"期間統計取得（{days}日間）",
        user=current_user.username,
        data={"days": days}
    )
    
    return result
