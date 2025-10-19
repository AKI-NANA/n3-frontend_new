#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
sync_service.py - データ同期サービス

このモジュールは記帳データの同期処理を担当し、以下の機能を提供します：
1. 仕訳データのマネーフォワードクラウドへの送信
2. 送信エラーの処理とリトライ
3. バッチ処理と定期実行のスケジューリング
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union

from sqlalchemy.ext.asyncio import AsyncSession

from database.repositories import (
    get_transaction_repository,
    get_journal_entry_repository,
    get_activity_log_repository
)
from services.mfcloud_service import MFCloudService
from services.notification_service import NotificationService
from utils.logger import setup_logger, log_to_jsonl
from utils.config import settings

# ロガー設定
logger = setup_logger()

class SyncService:
    """データ同期サービス"""
    
    def __init__(self, session: AsyncSession, notification_service: Optional[NotificationService] = None):
        """初期化
        
        Args:
            session: SQLAlchemy非同期セッション
            notification_service: 通知サービス（オプション）
        """
        self.session = session
        self.mf_service = MFCloudService()
        self.notification_service = notification_service
    
    async def sync_pending_entries(self, limit: int = 20) -> Dict[str, Any]:
        """送信待ちの仕訳データを同期
        
        Args:
            limit: 処理上限数
            
        Returns:
            同期結果
        """
        journal_repo = get_journal_entry_repository(self.session)
        activity_repo = get_activity_log_repository(self.session)
        
        # 送信待ちの仕訳データを取得
        pending_entries = await journal_repo.find_pending_entries(limit)
        
        if not pending_entries:
            logger.info("送信待ちの仕訳データはありません")
            return {
                "success_count": 0,
                "error_count": 0,
                "skipped_count": 0,
                "total_count": 0
            }
        
        logger.info(f"{len(pending_entries)}件の送信待ち仕訳データを処理します")
        
        # マネーフォワードクラウドへの接続
        try:
            connected = await self.mf_service.connect()
            if not connected:
                raise Exception("マネーフォワードクラウドへの接続に失敗しました")
        except Exception as e:
            logger.error(f"マネーフォワードクラウド接続エラー: {e}")
            
            # すべての仕訳データを一時的なエラー状態にマーク
            for entry in pending_entries:
                await journal_repo.update_mf_status(
                    entry.id,
                    status="error",
                    response=f"接続エラー: {str(e)}",
                    mf_entry_id=None
                )
            
            # アクティビティログ記録
            await activity_repo.log_activity(
                activity_type="sync_error",
                description=f"マネーフォワードクラウド接続エラー: {len(pending_entries)}件の処理を中断",
                data={"error": str(e)}
            )
            
            # エラー通知
            if self.notification_service:
                await self.notification_service.send_notification(
                    title="同期エラー",
                    message=f"マネーフォワードクラウドへの接続に失敗しました: {str(e)}",
                    level="error"
                )
            
            return {
                "success_count": 0,
                "error_count": len(pending_entries),
                "skipped_count": 0,
                "total_count": len(pending_entries),
                "error": str(e)
            }
        
        # 同期結果集計用
        results = {
            "success_count": 0,
            "error_count": 0,
            "skipped_count": 0,
            "total_count": len(pending_entries),
            "entries": []
        }
        
        # 仕訳データの送信
        for entry in pending_entries:
            try:
                # 仕訳データ送信
                journal_response = await self.mf_service.create_journal(
                    entry_date=entry.entry_date.date(),
                    debit_account=entry.debit_account,
                    credit_account=entry.credit_account,
                    amount=entry.amount,
                    description=entry.description
                )
                
                # 成功時の処理
                await journal_repo.update_mf_status(
                    entry.id,
                    status="sent",
                    response=f"送信成功: {journal_response.id}",
                    mf_entry_id=journal_response.id
                )
                
                results["success_count"] += 1
                results["entries"].append({
                    "id": entry.id,
                    "status": "success",
                    "mf_journal_id": journal_response.id
                })
                
                logger.info(f"仕訳データ送信成功: ID={entry.id}, MF_ID={journal_response.id}")
                
                # API負荷軽減のための待機
                await asyncio.sleep(0.5)
                
            except Exception as e:
                logger.error(f"仕訳データ送信エラー (ID={entry.id}): {e}")
                
                # エラー状態を更新
                await journal_repo.update_mf_status(
                    entry.id,
                    status="failed",
                    response=f"送信エラー: {str(e)}",
                    mf_entry_id=None
                )
                
                results["error_count"] += 1
                results["entries"].append({
                    "id": entry.id,
                    "status": "error",
                    "error": str(e)
                })
                
                # エラーログ記録
                log_to_jsonl(
                    {
                        "type": "journal_sync_error",
                        "journal_id": entry.id,
                        "error": str(e),
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    settings.ERROR_LOG_FILE
                )
        
        # アクティビティログ記録
        await activity_repo.log_activity(
            activity_type="sync_completed",
            description=f"仕訳データ同期完了: 成功={results['success_count']}件, 失敗={results['error_count']}件",
            data=results
        )
        
        # 結果通知
        if self.notification_service:
            if results["error_count"] > 0:
                # エラーがある場合
                await self.notification_service.send_notification(
                    title="同期完了（エラーあり）",
                    message=f"仕訳データ同期: {results['success_count']}件成功, {results['error_count']}件失敗",
                    level="warning"
                )
            elif results["success_count"] > 0:
                # 成功のみの場合
                await self.notification_service.send_notification(
                    title="同期完了",
                    message=f"仕訳データ同期: {results['success_count']}件の仕訳データを送信しました",
                    level="info"
                )
        
        return results
    
    async def retry_failed_entries(self, limit: int = 10) -> Dict[str, Any]:
        """送信失敗した仕訳データを再送信
        
        Args:
            limit: 処理上限数
            
        Returns:
            再送結果
        """
        journal_repo = get_journal_entry_repository(self.session)
        activity_repo = get_activity_log_repository(self.session)
        
        # 再送可能な仕訳データを取得
        retryable_entries = await journal_repo.find_retryable_entries(limit)
        
        if not retryable_entries:
            logger.info("再送可能な仕訳データはありません")
            return {
                "success_count": 0,
                "error_count": 0,
                "total_count": 0
            }
        
        logger.info(f"{len(retryable_entries)}件の仕訳データを再送します")
        
        # マネーフォワードクラウドへの接続
        try:
            connected = await self.mf_service.connect()
            if not connected:
                raise Exception("マネーフォワードクラウドへの接続に失敗しました")
        except Exception as e:
            logger.error(f"マネーフォワードクラウド接続エラー: {e}")
            
            # アクティビティログ記録
            await activity_repo.log_activity(
                activity_type="retry_error",
                description=f"再送処理でマネーフォワードクラウド接続エラー: {len(retryable_entries)}件の処理を中断",
                data={"error": str(e)}
            )
            
            return {
                "success_count": 0,
                "error_count": len(retryable_entries),
                "total_count": len(retryable_entries),
                "error": str(e)
            }
        
        # 再送結果集計用
        results = {
            "success_count": 0,
            "error_count": 0,
            "total_count": len(retryable_entries),
            "entries": []
        }
        
        # 仕訳データの再送
        for entry in retryable_entries:
            try:
                # ステータスを送信中に更新
                await journal_repo.update_mf_status(
                    entry.id,
                    status="sending",
                    response="再送中..."
                )
                
                # 仕訳データ送信
                journal_response = await self.mf_service.create_journal(
                    entry_date=entry.entry_date.date(),
                    debit_account=entry.debit_account,
                    credit_account=entry.credit_account,
                    amount=entry.amount,
                    description=entry.description
                )
                
                # 成功時の処理
                await journal_repo.update_mf_status(
                    entry.id,
                    status="sent",
                    response=f"再送信成功: {journal_response.id}",
                    mf_entry_id=journal_response.id
                )
                
                results["success_count"] += 1
                results["entries"].append({
                    "id": entry.id,
                    "status": "success",
                    "mf_journal_id": journal_response.id
                })
                
                logger.info(f"仕訳データ再送信成功: ID={entry.id}, MF_ID={journal_response.id}")
                
                # API負荷軽減のための待機
                await asyncio.sleep(0.5)
                
            except Exception as e:
                logger.error(f"仕訳データ再送信エラー (ID={entry.id}): {e}")
                
                # 再送回数をカウントして、一定回数以上で再送不可にする
                # （現在の実装では回数管理はしていないため、常に再送可能）
                
                # エラー状態を更新
                await journal_repo.update_mf_status(
                    entry.id,
                    status="failed",
                    response=f"再送信エラー: {str(e)}"
                )
                
                results["error_count"] += 1
                results["entries"].append({
                    "id": entry.id,
                    "status": "error",
                    "error": str(e)
                })
                
                # エラーログ記録
                log_to_jsonl(
                    {
                        "type": "journal_retry_error",
                        "journal_id": entry.id,
                        "error": str(e),
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    settings.ERROR_LOG_FILE
                )
        
        # アクティビティログ記録
        await activity_repo.log_activity(
            activity_type="retry_completed",
            description=f"仕訳データ再送完了: 成功={results['success_count']}件, 失敗={results['error_count']}件",
            data=results
        )
        
        # 結果通知
        if self.notification_service and (results["success_count"] > 0 or results["error_count"] > 0):
            await self.notification_service.send_notification(
                title="再送処理完了",
                message=f"仕訳データ再送: {results['success_count']}件成功, {results['error_count']}件失敗",
                level="info" if results["error_count"] == 0 else "warning"
            )
        
        return results
    
    async def schedule_sync(self, interval_seconds: int = 300, max_runs: Optional[int] = None) -> None:
        """定期的な同期処理をスケジュール
        
        Args:
            interval_seconds: 同期間隔（秒）
            max_runs: 最大実行回数（Noneの場合は無限）
        """
        runs = 0
        
        logger.info(f"定期同期を開始します（間隔: {interval_seconds}秒）")
        
        while max_runs is None or runs < max_runs:
            try:
                # 送信待ち仕訳データの同期
                sync_results = await self.sync_pending_entries()
                
                # 失敗した仕訳データの再送（一日に一回程度）
                if runs % (86400 // interval_seconds) == 0:  # 約24時間に一回
                    retry_results = await self.retry_failed_entries()
                
                # 実行回数をカウント
                runs += 1
                
                # 次回実行までスリープ
                await asyncio.sleep(interval_seconds)
                
            except Exception as e:
                logger.error(f"定期同期処理エラー: {e}")
                
                # エラーログ記録
                log_to_jsonl(
                    {
                        "type": "scheduled_sync_error",
                        "error": str(e),
                        "run_count": runs,
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    settings.ERROR_LOG_FILE
                )
                
                # エラーが発生しても続行
                await asyncio.sleep(interval_seconds)
        
        logger.info(f"定期同期を終了します（実行回数: {runs}）")
    
    async def check_sync_status(self) -> Dict[str, Any]:
        """同期状態を確認
        
        Returns:
            同期状態情報
        """
        journal_repo = get_journal_entry_repository(self.session)
        
        # 全仕訳データを取得
        all_entries = await journal_repo.get_all()
        
        # 状態ごとに集計
        status_counts = {}
        for entry in all_entries:
            status = entry.mf_status
            if status not in status_counts:
                status_counts[status] = 0
            status_counts[status] += 1
        
        # マネーフォワードクラウド接続状態を確認
        mf_configured = settings.is_mf_cloud_configured()
        
        # 送信待ち仕訳データ数
        pending_count = status_counts.get("pending", 0)
        
        # 送信失敗仕訳データ数
        failed_count = status_counts.get("failed", 0)
        
        # 送信済み仕訳データ数
        sent_count = status_counts.get("sent", 0)
        
        # 状態情報
        status_info = {
            "mf_configured": mf_configured,
            "total_entries": len(all_entries),
            "status_counts": status_counts,
            "pending_count": pending_count,
            "failed_count": failed_count,
            "sent_count": sent_count,
            "sync_required": pending_count > 0,
            "retry_required": failed_count > 0,
            "last_checked": datetime.utcnow().isoformat()
        }
        
        return status_info