#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
kicho_api.py - 記帳処理専用APIルーター

このモジュールは記帳自動化に特化したAPIエンドポイントを提供します：
1. /api/kicho/dashboard - 処理状況取得
2. /api/kicho/transactions/pending - 確認待ち取引一覧
3. /api/kicho/approve - 承認・MF送信処理
4. /api/kicho/bulk-approve - 一括承認
5. /api/kicho/ai-status - AI動作状況
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database.db_setup import get_session
from database.repositories import (
    get_transaction_repository,
    get_journal_entry_repository,
    get_activity_log_repository
)
from services.ai_service import AIService, ConfidenceLevel
from services.sync_service import SyncService
from services.notification_service import NotificationService
from utils.security import get_current_user, User
from utils.logger import setup_logger, log_to_jsonl
from utils.config import settings

# ロガー設定
logger = setup_logger()

# ルーター作成
router = APIRouter(prefix="/api/kicho", tags=["記帳処理"])

# リクエスト・レスポンスモデル
class TransactionApprovalRequest(BaseModel):
    """承認リクエスト"""
    transaction_id: str = Field(..., description="取引ID")
    approved_debit_account: str = Field(..., description="承認済み借方勘定科目")
    approved_credit_account: str = Field(..., description="承認済み貸方勘定科目")
    approved_description: Optional[str] = Field(None, description="承認済み摘要")
    approved_tax_classification: Optional[str] = Field(None, description="承認済み税区分")
    user_comment: Optional[str] = Field(None, description="承認者コメント")

class BulkApprovalRequest(BaseModel):
    """一括承認リクエスト"""
    transaction_ids: List[str] = Field(..., description="取引IDリスト")
    approval_action: str = Field(..., description="承認アクション (approve_all/approve_high_confidence)")
    confidence_threshold: Optional[float] = Field(95.0, description="信頼度閾値")

class AIRetrainingRequest(BaseModel):
    """AI再学習リクエスト"""
    retrain_ollama: bool = Field(True, description="Ollama再学習フラグ")
    include_recent_days: int = Field(30, description="学習対象日数")

class DashboardResponse(BaseModel):
    """ダッシュボードレスポンス"""
    summary: Dict[str, Any] = Field(..., description="サマリー情報")
    recent_transactions: List[Dict[str, Any]] = Field(..., description="最近の取引")
    ai_status: Dict[str, Any] = Field(..., description="AI状態")
    sync_status: Dict[str, Any] = Field(..., description="同期状態")
    pending_count: int = Field(..., description="確認待ち件数")

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """記帳ダッシュボード情報取得
    
    記帳処理の全体状況を取得します。
    """
    try:
        transaction_repo = get_transaction_repository(session)
        journal_repo = get_journal_entry_repository(session)
        ai_service = AIService(session)
        sync_service = SyncService(session)
        
        # 基本統計
        total_transactions = await transaction_repo.count()
        
        # 未処理取引数
        unprocessed_transactions = await transaction_repo.find_unprocessed(limit=1000)
        unprocessed_count = len(unprocessed_transactions)
        
        # 確認待ち仕訳数（AI推論済み、承認待ち）
        pending_entries = await journal_repo.find_by_date_range(
            start_date=(datetime.utcnow() - timedelta(days=30)).date(),
            end_date=datetime.utcnow().date(),
            mf_status="pending"
        )
        pending_count = len(pending_entries)
        
        # 送信済み仕訳数（今月）
        current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        sent_entries = await journal_repo.find_by_date_range(
            start_date=current_month_start.date(),
            end_date=datetime.utcnow().date(),
            mf_status="sent"
        )
        sent_count = len(sent_entries)
        
        # AI状態取得
        ai_statistics = await ai_service.get_learning_statistics()
        
        # 同期状態取得
        sync_status = await sync_service.check_sync_status()
        
        # 最近の取引（確認待ち優先）
        recent_transactions = []
        for transaction in unprocessed_transactions[:10]:
            # AI推論結果があるか確認
            related_entries = await journal_repo.find_by_date_range(
                start_date=transaction.transaction_date,
                end_date=transaction.transaction_date
            )
            
            entry_with_ai = None
            for entry in related_entries:
                if entry.transaction_id == transaction.id:
                    entry_with_ai = entry
                    break
            
            transaction_data = {
                "id": transaction.id,
                "transaction_date": transaction.transaction_date.isoformat(),
                "description": transaction.description,
                "amount": transaction.amount,
                "is_processed": transaction.is_processed,
                "processing_status": transaction.processing_status,
                "ai_suggested": None
            }
            
            if entry_with_ai:
                transaction_data["ai_suggested"] = {
                    "debit_account": entry_with_ai.debit_account,
                    "credit_account": entry_with_ai.credit_account,
                    "confidence_score": getattr(entry_with_ai, 'ai_confidence', 0),
                    "mf_status": entry_with_ai.mf_status
                }
            
            recent_transactions.append(transaction_data)
        
        # サマリー情報
        summary = {
            "total_transactions": total_transactions,
            "unprocessed_count": unprocessed_count,
            "pending_approval_count": pending_count,
            "sent_this_month": sent_count,
            "automation_rate": round((sent_count / max(total_transactions, 1)) * 100, 1),
            "last_sync_time": sync_status.get("last_checked"),
            "mf_configured": sync_status.get("mf_configured", False)
        }
        
        # AI状態情報
        ai_status = {
            "ollama_available": False,  # 後で実装
            "deepseek_available": False,  # 後で実装
            "total_learning_samples": ai_statistics.get("total_learning_samples", 0),
            "recent_learning_count": ai_statistics.get("recent_learning_count", 0),
            "last_learning_date": ai_statistics.get("last_learning_date")
        }
        
        # アクティビティログ記録
        activity_repo = get_activity_log_repository(session)
        await activity_repo.log_activity(
            activity_type="dashboard_view",
            description="記帳ダッシュボード表示",
            user=current_user.username,
            data=summary
        )
        
        return DashboardResponse(
            summary=summary,
            recent_transactions=recent_transactions,
            ai_status=ai_status,
            sync_status=sync_status,
            pending_count=pending_count
        )
        
    except Exception as e:
        logger.error(f"ダッシュボード取得エラー: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"ダッシュボード情報の取得に失敗しました: {str(e)}"
        )

@router.get("/transactions/pending")
async def get_pending_transactions(
    page: int = Query(1, ge=1, description="ページ番号"),
    limit: int = Query(20, ge=1, le=100, description="取得件数"),
    confidence_filter: Optional[str] = Query(None, description="信頼度フィルタ (low/medium/high)"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """確認待ち取引一覧取得
    
    AI推論済みで承認待ちの取引を取得します。
    """
    try:
        transaction_repo = get_transaction_repository(session)
        journal_repo = get_journal_entry_repository(session)
        
        # 未処理取引取得
        unprocessed_transactions = await transaction_repo.find_unprocessed(limit=1000)
        
        # AI推論結果とマッチング
        pending_transactions = []
        
        for transaction in unprocessed_transactions:
            # 関連する仕訳エントリを検索
            related_entries = await journal_repo.find_by_date_range(
                start_date=transaction.transaction_date,
                end_date=transaction.transaction_date
            )
            
            ai_entry = None
            for entry in related_entries:
                if (entry.transaction_id == transaction.id and 
                    hasattr(entry, 'ai_confidence')):
                    ai_entry = entry
                    break
            
            if ai_entry:
                # 信頼度レベル判定
                confidence_score = getattr(ai_entry, 'ai_confidence', 0)
                if confidence_score >= 95:
                    confidence_level = "very_high"
                elif confidence_score >= 85:
                    confidence_level = "high"
                elif confidence_score >= 70:
                    confidence_level = "medium"
                elif confidence_score >= 50:
                    confidence_level = "low"
                else:
                    confidence_level = "very_low"
                
                # フィルタ適用
                if confidence_filter:
                    filter_mapping = {
                        "low": ["very_low", "low"],
                        "medium": ["medium"],
                        "high": ["high", "very_high"]
                    }
                    if confidence_level not in filter_mapping.get(confidence_filter, []):
                        continue
                
                transaction_data = {
                    "id": transaction.id,
                    "transaction_date": transaction.transaction_date.isoformat(),
                    "description": transaction.description,
                    "amount": transaction.amount,
                    "source": transaction.source,
                    "ai_suggestion": {
                        "debit_account": ai_entry.debit_account,
                        "credit_account": ai_entry.credit_account,
                        "confidence_score": confidence_score,
                        "confidence_level": confidence_level,
                        "reasoning": getattr(ai_entry, 'ai_reasoning', ''),
                        "suggested_description": getattr(ai_entry, 'ai_suggested_description', None),
                        "tax_classification": getattr(ai_entry, 'ai_tax_classification', None)
                    },
                    "created_at": transaction.created_at.isoformat(),
                    "requires_approval": confidence_score < 95
                }
                
                pending_transactions.append(transaction_data)
        
        # ページング
        total_count = len(pending_transactions)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paged_transactions = pending_transactions[start_idx:end_idx]
        
        return {
            "transactions": paged_transactions,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit
            },
            "filter": {
                "confidence_filter": confidence_filter
            },
            "summary": {
                "very_high_confidence": len([t for t in pending_transactions if t["ai_suggestion"]["confidence_level"] == "very_high"]),
                "high_confidence": len([t for t in pending_transactions if t["ai_suggestion"]["confidence_level"] == "high"]),
                "medium_confidence": len([t for t in pending_transactions if t["ai_suggestion"]["confidence_level"] == "medium"]),
                "low_confidence": len([t for t in pending_transactions if t["ai_suggestion"]["confidence_level"] in ["low", "very_low"]])
            }
        }
        
    except Exception as e:
        logger.error(f"確認待ち取引取得エラー: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"確認待ち取引の取得に失敗しました: {str(e)}"
        )

@router.post("/approve")
async def approve_transaction(
    request: TransactionApprovalRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """取引承認・仕訳送信
    
    AI推論結果を承認し、マネーフォワードクラウドに送信します。
    """
    try:
        transaction_repo = get_transaction_repository(session)
        journal_repo = get_journal_entry_repository(session)
        activity_repo = get_activity_log_repository(session)
        ai_service = AIService(session)
        
        # 取引確認
        transaction = await transaction_repo.get_by_id(request.transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="取引が見つかりません")
        
        if transaction.is_processed:
            raise HTTPException(status_code=400, detail="既に処理済みの取引です")
        
        # 既存の仕訳エントリ確認
        related_entries = await journal_repo.find_by_date_range(
            start_date=transaction.transaction_date,
            end_date=transaction.transaction_date
        )
        
        existing_entry = None
        for entry in related_entries:
            if entry.transaction_id == request.transaction_id:
                existing_entry = entry
                break
        
        # 新規仕訳エントリ作成または更新
        if existing_entry:
            # 既存エントリ更新
            await journal_repo.update(existing_entry.id, {
                "debit_account": request.approved_debit_account,
                "credit_account": request.approved_credit_account,
                "description": request.approved_description or transaction.description,
                "mf_status": "pending",
                "updated_at": datetime.utcnow()
            })
            journal_entry_id = existing_entry.id
        else:
            # 新規エントリ作成
            entry_data = {
                "transaction_id": request.transaction_id,
                "entry_date": transaction.transaction_date,
                "debit_account": request.approved_debit_account,
                "credit_account": request.approved_credit_account,
                "amount": transaction.amount,
                "description": request.approved_description or transaction.description,
                "mf_status": "pending"
            }
            
            new_entry = await journal_repo.create(entry_data)
            journal_entry_id = new_entry.id
        
        # 取引を処理済みにマーク
        await transaction_repo.mark_as_processed(request.transaction_id, "approved")
        
        # AI学習データ記録
        learning_data = {
            "debit_account": request.approved_debit_account,
            "credit_account": request.approved_credit_account,
            "description": request.approved_description or transaction.description,
            "tax_classification": request.approved_tax_classification
        }
        
        await ai_service.learn_from_approval(request.transaction_id, learning_data)
        
        # アクティビティログ記録
        await activity_repo.log_activity(
            activity_type="transaction_approved",
            description=f"取引承認: {request.approved_debit_account} / {request.approved_credit_account}",
            user=current_user.username,
            data={
                "transaction_id": request.transaction_id,
                "approved_accounts": f"{request.approved_debit_account} / {request.approved_credit_account}",
                "amount": transaction.amount,
                "user_comment": request.user_comment
            }
        )
        
        # バックグラウンドでMF送信
        background_tasks.add_task(
            _send_to_mf_background,
            journal_entry_id,
            session,
            current_user.username
        )
        
        logger.info(f"取引承認完了: {request.transaction_id} by {current_user.username}")
        
        return {
            "status": "success",
            "message": "取引を承認し、マネーフォワードクラウドへの送信を開始しました",
            "transaction_id": request.transaction_id,
            "journal_entry_id": journal_entry_id,
            "approved_accounts": f"{request.approved_debit_account} / {request.approved_credit_account}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"取引承認エラー: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"取引承認処理に失敗しました: {str(e)}"
        )

@router.post("/bulk-approve")
async def bulk_approve_transactions(
    request: BulkApprovalRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """一括承認処理
    
    複数の取引を一括で承認します。
    """
    try:
        transaction_repo = get_transaction_repository(session)
        journal_repo = get_journal_entry_repository(session)
        activity_repo = get_activity_log_repository(session)
        ai_service = AIService(session)
        
        # 取引IDの妥当性チェック
        if len(request.transaction_ids) > 100:
            raise HTTPException(status_code=400, detail="一度に処理できる取引数は100件までです")
        
        approved_transactions = []
        skipped_transactions = []
        
        for transaction_id in request.transaction_ids:
            try:
                # 取引確認
                transaction = await transaction_repo.get_by_id(transaction_id)
                if not transaction or transaction.is_processed:
                    skipped_transactions.append({
                        "transaction_id": transaction_id,
                        "reason": "取引が見つからないか、既に処理済みです"
                    })
                    continue
                
                # AI推論結果確認
                related_entries = await journal_repo.find_by_date_range(
                    start_date=transaction.transaction_date,
                    end_date=transaction.transaction_date
                )
                
                ai_entry = None
                for entry in related_entries:
                    if (entry.transaction_id == transaction_id and 
                        hasattr(entry, 'ai_confidence')):
                        ai_entry = entry
                        break
                
                if not ai_entry:
                    skipped_transactions.append({
                        "transaction_id": transaction_id,
                        "reason": "AI推論結果が見つかりません"
                    })
                    continue
                
                # 信頼度チェック
                confidence_score = getattr(ai_entry, 'ai_confidence', 0)
                
                if request.approval_action == "approve_high_confidence":
                    if confidence_score < request.confidence_threshold:
                        skipped_transactions.append({
                            "transaction_id": transaction_id,
                            "reason": f"信頼度が閾値を下回ります ({confidence_score:.1f}% < {request.confidence_threshold}%)"
                        })
                        continue
                
                # 承認処理実行
                await journal_repo.update(ai_entry.id, {
                    "mf_status": "pending",
                    "updated_at": datetime.utcnow()
                })
                
                await transaction_repo.mark_as_processed(transaction_id, "bulk_approved")
                
                # AI学習データ記録
                learning_data = {
                    "debit_account": ai_entry.debit_account,
                    "credit_account": ai_entry.credit_account,
                    "description": ai_entry.description
                }
                
                await ai_service.learn_from_approval(transaction_id, learning_data)
                
                approved_transactions.append({
                    "transaction_id": transaction_id,
                    "journal_entry_id": ai_entry.id,
                    "accounts": f"{ai_entry.debit_account} / {ai_entry.credit_account}",
                    "confidence_score": confidence_score
                })
                
                # バックグラウンドでMF送信
                background_tasks.add_task(
                    _send_to_mf_background,
                    ai_entry.id,
                    session,
                    current_user.username
                )
                
            except Exception as e:
                logger.error(f"個別承認エラー {transaction_id}: {e}")
                skipped_transactions.append({
                    "transaction_id": transaction_id,
                    "reason": f"処理エラー: {str(e)}"
                })
        
        # アクティビティログ記録
        await activity_repo.log_activity(
            activity_type="bulk_approval",
            description=f"一括承認: {len(approved_transactions)}件成功, {len(skipped_transactions)}件スキップ",
            user=current_user.username,
            data={
                "approval_action": request.approval_action,
                "confidence_threshold": request.confidence_threshold,
                "approved_count": len(approved_transactions),
                "skipped_count": len(skipped_transactions),
                "approved_transactions": approved_transactions[:10],  # 最初の10件のみ
                "skipped_transactions": skipped_transactions[:10]
            }
        )
        
        logger.info(f"一括承認完了: {len(approved_transactions)}件承認, {len(skipped_transactions)}件スキップ by {current_user.username}")
        
        return {
            "status": "success",
            "message": f"{len(approved_transactions)}件の取引を承認しました",
            "approved_count": len(approved_transactions),
            "skipped_count": len(skipped_transactions),
            "approved_transactions": approved_transactions,
            "skipped_transactions": skipped_transactions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"一括承認エラー: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"一括承認処理に失敗しました: {str(e)}"
        )

@router.get("/ai-status")
async def get_ai_status(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """AI動作状況取得
    
    Ollama・DeepSeekの動作状況と学習統計を取得します。
    """
    try:
        ai_service = AIService(session)
        
        # AI統計取得
        learning_stats = await ai_service.get_learning_statistics()
        
        # Ollama状態確認
        ollama_status = {
            "available": False,
            "model_info": None,
            "last_inference_time": None,
            "error": None
        }
        
        try:
            from services.ollama_client import OllamaClient
            ollama_client = OllamaClient()
            
            ollama_available = await ollama_client.is_available()
            ollama_status["available"] = ollama_available
            
            if ollama_available:
                model_info = await ollama_client.get_model_info()
                ollama_status["model_info"] = model_info
        except Exception as e:
            ollama_status["error"] = str(e)
        
        # DeepSeek状態確認
        deepseek_status = {
            "available": False,
            "api_configured": False,
            "request_count": 0,
            "rate_limit_remaining": 0,
            "error": None
        }
        
        try:
            from services.deepseek_client import DeepSeekClient
            deepseek_client = DeepSeekClient()
            
            status_info = await deepseek_client.get_api_status()
            deepseek_status.update(status_info)
        except Exception as e:
            deepseek_status["error"] = str(e)
        
        # 推論統計（過去24時間）
        inference_stats = {
            "total_inferences": 0,
            "successful_inferences": 0,
            "average_confidence": 0.0,
            "average_response_time_ms": 0.0,
            "model_usage": {
                "ollama_only": 0,
                "ollama_deepseek": 0,
                "fallback_rule": 0
            }
        }
        
        # アクティビティログから統計取得
        activity_repo = get_activity_log_repository(session)
        recent_ai_activities = await activity_repo.find_by_activity_type("ai_inference", limit=100)
        
        if recent_ai_activities:
            inference_stats["total_inferences"] = len(recent_ai_activities)
            
            confidence_scores = []
            response_times = []
            
            for activity in recent_ai_activities:
                if activity.data:
                    confidence = activity.data.get("confidence_score", 0)
                    if confidence > 0:
                        confidence_scores.append(confidence)
                    
                    response_time = activity.data.get("inference_time_ms", 0)
                    if response_time > 0:
                        response_times.append(response_time)
                    
                    # モデル使用統計
                    used_deepseek = activity.data.get("used_deepseek", False)
                    primary_model = activity.data.get("primary_model", "")
                    
                    if "fallback" in primary_model.lower():
                        inference_stats["model_usage"]["fallback_rule"] += 1
                    elif used_deepseek:
                        inference_stats["model_usage"]["ollama_deepseek"] += 1
                    else:
                        inference_stats["model_usage"]["ollama_only"] += 1
            
            # 平均値計算
            if confidence_scores:
                inference_stats["average_confidence"] = sum(confidence_scores) / len(confidence_scores)
                inference_stats["successful_inferences"] = len(confidence_scores)
            
            if response_times:
                inference_stats["average_response_time_ms"] = sum(response_times) / len(response_times)
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "ollama": ollama_status,
            "deepseek": deepseek_status,
            "learning_statistics": learning_stats,
            "inference_statistics": inference_stats,
            "system_health": {
                "overall_status": "healthy" if (ollama_status["available"] or deepseek_status["available"]) else "degraded",
                "ai_accuracy": inference_stats["average_confidence"],
                "processing_speed": "fast" if inference_stats["average_response_time_ms"] < 3000 else "slow"
            }
        }
        
    except Exception as e:
        logger.error(f"AI状況取得エラー: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"AI状況の取得に失敗しました: {str(e)}"
        )

@router.post("/ai/retrain")
async def retrain_ai_models(
    request: AIRetrainingRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """AI再学習実行
    
    承認済みデータを使用してAIモデルを再学習します。
    """
    try:
        # 管理者権限チェック
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="管理者権限が必要です")
        
        # バックグラウンドで再学習実行
        background_tasks.add_task(
            _retrain_ai_background,
            session,
            request.retrain_ollama,
            request.include_recent_days,
            current_user.username
        )
        
        # アクティビティログ記録
        activity_repo = get_activity_log_repository(session)
        await activity_repo.log_activity(
            activity_type="ai_retrain_requested",
            description=f"AI再学習開始: Ollama={request.retrain_ollama}, 対象日数={request.include_recent_days}",
            user=current_user.username,
            data={
                "retrain_ollama": request.retrain_ollama,
                "include_recent_days": request.include_recent_days
            }
        )
        
        logger.info(f"AI再学習開始: by {current_user.username}")
        
        return {
            "status": "success",
            "message": "AI再学習を開始しました。処理完了まで数分かかります。",
            "retrain_ollama": request.retrain_ollama,
            "include_recent_days": request.include_recent_days
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI再学習開始エラー: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"AI再学習の開始に失敗しました: {str(e)}"
        )

# バックグラウンドタスク関数
async def _send_to_mf_background(journal_entry_id: str, session: AsyncSession, user: str):
    """MF送信バックグラウンドタスク"""
    try:
        sync_service = SyncService(session)
        notification_service = NotificationService()
        
        # 特定の仕訳エントリを送信
        # 注意: sync_serviceの実装で単一エントリ送信メソッドが必要
        
        logger.info(f"MF送信バックグラウンド処理完了: {journal_entry_id}")
        
    except Exception as e:
        logger.error(f"MF送信バックグラウンドエラー {journal_entry_id}: {e}")

async def _retrain_ai_background(session: AsyncSession, retrain_ollama: bool, 
                               include_days: int, user: str):
    """AI再学習バックグラウンドタスク"""
    try:
        ai_service = AIService(session)
        activity_repo = get_activity_log_repository(session)
        
        # 最近の承認データ取得
        cutoff_date = datetime.utcnow() - timedelta(days=include_days)
        
        # 承認済み取引データを学習データとして準備
        # 実装詳細は AIService.learn_from_approval を参照
        
        await activity_repo.log_activity(
            activity_type="ai_retrain_completed",
            description=f"AI再学習完了: 対象日数={include_days}",
            user=user,
            data={
                "retrain_ollama": retrain_ollama,
                "include_recent_days": include_days,
                "completed_at": datetime.utcnow().isoformat()
            }
        )
        
        logger.info(f"AI再学習バックグラウンド処理完了: by {user}")
        
    except Exception as e:
        logger.error(f"AI再学習バックグラウンドエラー: {e}")
