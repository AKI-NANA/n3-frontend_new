#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
orchestrator_service.py - オーケストレーターサービス

このモジュールは、複数のサービスを連携させて業務フローを実行するオーケストレーターを提供します。
取引データのインポートから仕訳生成、マネーフォワードクラウドへの送信までの一連のフローを統括します。
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union

from sqlalchemy.ext.asyncio import AsyncSession

from database.repositories import (
    get_transaction_repository,
    get_journal_entry_repository,
    get_rule_repository,
    get_activity_log_repository
)
from services.rule_service import RuleService
from services.ai_service import AIService
from services.mfcloud_service import MFCloudService
from services.sync_service import SyncService
from services.notification_service import NotificationService
from utils.logger import setup_logger, log_to_jsonl
from utils.config import settings

# ロガー設定
logger = setup_logger()

class OrchestratorService:
    """オーケストレーターサービス"""
    
    def __init__(self, session: AsyncSession):
        """初期化
        
        Args:
            session: SQLAlchemy非同期セッション
        """
        self.session = session
        
        # 各サービスの初期化
        self.rule_service = RuleService(session, None)  # AIサービスは後で設定
        self.ai_service = AIService()  # AIサービスの初期化
        self.mf_service = MFCloudService()
        self.notification_service = NotificationService()
        
        # ルールサービスにAIサービスを設定
        self.rule_service.ai_service = self.ai_service
        
        # 同期サービスの初期化（通知サービスを渡す）
        self.sync_service = SyncService(session, self.notification_service)
    
    async def process_transaction(
        self,
        transaction_id: str,
        use_ai: bool = True,
        rule_id: Optional[str] = None,
        user: Optional[str] = None
    ) -> Dict[str, Any]:
        """取引データを処理して仕訳データを生成
        
        Args:
            transaction_id: 取引データID
            use_ai: AI推論使用フラグ
            rule_id: 指定ルールID（指定しない場合は自動選択）
            user: 実行ユーザー名
            
        Returns:
            処理結果
                {
                    "status": "success" | "error",
                    "transaction_id": str,
                    "journal_id": Optional[str],
                    "rule_id": Optional[str],
                    "is_ai_generated": bool,
                    "message": str
                }
                
        Raises:
            ValueError: トランザクションが見つからない、または処理エラー
        """
        # リポジトリの取得
        transaction_repo = get_transaction_repository(self.session)
        activity_repo = get_activity_log_repository(self.session)
        
        # トランザクションの取得と検証
        transaction = await transaction_repo.get_by_id(transaction_id)
        if not transaction:
            raise ValueError(f"ID: {transaction_id} の取引データが見つかりません")
        
        # すでに処理済みの場合は警告を返す（リセットしない限り再処理不可）
        if transaction.is_processed:
            return {
                "status": "warning",
                "transaction_id": transaction_id,
                "journal_id": None,
                "rule_id": transaction.rule_id,
                "is_ai_generated": False,
                "message": "この取引データはすでに処理済みです"
            }
        
        try:
            # ルールサービスを使用して仕訳データを生成
            rule_result = await self.rule_service.apply_rule_to_transaction(
                transaction_id=transaction_id,
                rule_id=rule_id,
                use_ai=use_ai
            )
            
            # 処理結果の作成
            result = {
                "status": "success",
                "transaction_id": transaction_id,
                "journal_id": rule_result.get("journal_id"),
                "rule_id": rule_result.get("rule_id"),
                "is_ai_generated": rule_result.get("is_ai_generated", False),
                "message": "取引データの処理が完了しました"
            }
            
            # アクティビティログ記録
            await activity_repo.log_activity(
                activity_type="process_transaction",
                description=f"取引データ処理: {transaction.description}",
                user=user,
                data={
                    "transaction_id": transaction_id,
                    "rule_id": rule_result.get("rule_id"),
                    "is_ai_generated": rule_result.get("is_ai_generated", False),
                    "journal_id": rule_result.get("journal_id")
                }
            )
            
            return result
            
        except Exception as e:
            logger.error(f"取引データ処理エラー (ID={transaction_id}): {e}")
            
            # トランザクションのステータスを更新
            await transaction_repo.update(
                transaction_id,
                {
                    "processing_status": "error",
                    "error_message": str(e),
                    "updated_at": datetime.utcnow()
                }
            )
            
            # エラーログ記録
            log_to_jsonl(
                {
                    "type": "transaction_processing_error",
                    "transaction_id": transaction_id,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                },
                settings.ERROR_LOG_FILE
            )
            
            # アクティビティログ記録
            await activity_repo.log_activity(
                activity_type="transaction_error",
                description=f"取引データ処理エラー: {transaction.description}",
                user=user,
                data={
                    "transaction_id": transaction_id,
                    "error": str(e)
                }
            )
            
            raise ValueError(f"取引データの処理に失敗しました: {e}")
    
    async def reset_transaction(
        self,
        transaction_id: str,
        user: Optional[str] = None
    ) -> Dict[str, Any]:
        """取引データの処理状態をリセット
        
        Args:
            transaction_id: 取引データID
            user: 実行ユーザー名
            
        Returns:
            リセット結果
                {
                    "status": "success" | "error",
                    "transaction_id": str,
                    "deleted_journal_ids": List[str],
                    "message": str
                }
                
        Raises:
            ValueError: トランザクションが見つからない、またはリセットエラー
        """
        # リポジトリの取得
        transaction_repo = get_transaction_repository(self.session)
        journal_repo = get_journal_entry_repository(self.session)
        activity_repo = get_activity_log_repository(self.session)
        
        # トランザクションの取得と検証
        transaction = await transaction_repo.get_by_id(transaction_id)
        if not transaction:
            raise ValueError(f"ID: {transaction_id} の取引データが見つかりません")
        
        try:
            # 関連する仕訳データの取得
            journal_entries = await journal_repo.find_by_transaction_id(transaction_id)
            deleted_journal_ids = []
            
            # 仕訳データの削除
            for je in journal_entries:
                deleted = await journal_repo.delete(je.id)
                if deleted:
                    deleted_journal_ids.append(je.id)
            
            # トランザクションのステータスをリセット
            await transaction_repo.update(
                transaction_id,
                {
                    "is_processed": False,
                    "processing_status": "pending",
                    "processed_at": None,
                    "rule_id": None,
                    "error_message": None,
                    "updated_at": datetime.utcnow()
                }
            )
            
            # アクティビティログ記録
            await activity_repo.log_activity(
                activity_type="reset_transaction",
                description=f"取引データリセット: {transaction.description}",
                user=user,
                data={
                    "transaction_id": transaction_id,
                    "deleted_journal_ids": deleted_journal_ids
                }
            )
            
            return {
                "status": "success",
                "transaction_id": transaction_id,
                "deleted_journal_ids": deleted_journal_ids,
                "message": f"取引データのリセットが完了しました（{len(deleted_journal_ids)}件の仕訳を削除）"
            }
            
        except Exception as e:
            logger.error(f"取引データリセットエラー (ID={transaction_id}): {e}")
            
            # エラーログ記録
            log_to_jsonl(
                {
                    "type": "transaction_reset_error",
                    "transaction_id": transaction_id,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                },
                settings.ERROR_LOG_FILE
            )
            
            raise ValueError(f"取引データのリセットに失敗しました: {e}")
    
    async def batch_process_transactions(
        self,
        transaction_ids: Optional[List[str]] = None,
        use_ai: bool = True,
        max_count: int = 100,
        user: Optional[str] = None
    ) -> Dict[str, Any]:
        """複数の取引データを一括処理
        
        Args:
            transaction_ids: 対象トランザクションID（指定しない場合は未処理の全件）
            use_ai: AI推論使用フラグ
            max_count: 最大処理件数
            user: 実行ユーザー名
            
        Returns:
            処理結果
                {
                    "success_count": int,
                    "error_count": int,
                    "skipped_count": int,
                    "total_count": int,
                    "results": List[Dict[str, Any]]
                }
        """
        # リポジトリの取得
        transaction_repo = get_transaction_repository(self.session)
        activity_repo = get_activity_log_repository(self.session)
        
        # 対象トランザクションの取得
        if transaction_ids:
            transactions = await transaction_repo.find_by_ids(transaction_ids)
            # 指定されたIDの中で未処理のもののみを対象にする
            transactions = [tx for tx in transactions if not tx.is_processed]
        else:
            # 未処理のトランザクションを対象にする
            transactions = await transaction_repo.find_pending_transactions(max_count)
        
        # 結果の初期化
        results = {
            "success_count": 0,
            "error_count": 0,
            "skipped_count": 0,
            "total_count": len(transactions),
            "results": []
        }
        
        # 一括処理の実行
        for transaction in transactions:
            try:
                # 個別処理の実行
                result = await self.process_transaction(
                    transaction_id=transaction.id,
                    use_ai=use_ai,
                    user=user
                )
                
                # 成功の場合
                if result["status"] == "success":
                    results["success_count"] += 1
                    results["results"].append({
                        "transaction_id": transaction.id,
                        "status": "success",
                        "journal_id": result.get("journal_id"),
                        "rule_id": result.get("rule_id"),
                        "is_ai_generated": result.get("is_ai_generated", False)
                    })
                # 警告（スキップ）の場合
                elif result["status"] == "warning":
                    results["skipped_count"] += 1
                    results["results"].append({
                        "transaction_id": transaction.id,
                        "status": "skipped",
                        "message": result.get("message")
                    })
                
            except Exception as e:
                logger.error(f"一括処理エラー (ID={transaction.id}): {e}")
                results["error_count"] += 1
                results["results"].append({
                    "transaction_id": transaction.id,
                    "status": "error",
                    "error": str(e)
                })
        
        # アクティビティログ記録
        await activity_repo.log_activity(
            activity_type="batch_process",
            description=f"一括処理: 成功={results['success_count']}件, エラー={results['error_count']}件, スキップ={results['skipped_count']}件",
            user=user,
            data={
                "total_count": results["total_count"],
                "use_ai": use_ai,
                "success_count": results["success_count"],
                "error_count": results["error_count"],
                "skipped_count": results["skipped_count"]
            }
        )
        
        return results
    
    async def batch_sync_journals(
        self,
        journal_ids: Optional[List[str]] = None,
        max_count: int = 20,
        user: Optional[str] = None
    ) -> Dict[str, Any]:
        """複数の仕訳データを一括同期
        
        Args:
            journal_ids: 対象仕訳ID（指定しない場合は送信待ちの全件）
            max_count: 最大処理件数
            user: 実行ユーザー名
            
        Returns:
            同期結果
                {
                    "success_count": int,
                    "error_count": int,
                    "skipped_count": int,
                    "total_count": int,
                    "results": List[Dict[str, Any]]
                }
        """
        # 結果の初期化
        results = {
            "success_count": 0,
            "error_count": 0,
            "skipped_count": 0,
            "total_count": 0,
            "results": []
        }
        
        try:
            # SyncServiceを使用して一括同期を実行
            if journal_ids:
                # 指定されたIDの仕訳を同期
                sync_result = await self.sync_service.sync_specific_entries(journal_ids)
            else:
                # 送信待ちの仕訳を同期
                sync_result = await self.sync_service.sync_pending_entries(max_count)
            
            # 結果をフォーマット
            results.update({
                "success_count": sync_result.get("success_count", 0),
                "error_count": sync_result.get("error_count", 0),
                "skipped_count": sync_result.get("skipped_count", 0),
                "total_count": sync_result.get("total_count", 0),
                "results": sync_result.get("entries", [])
            })
            
            # アクティビティログ記録（SyncService内で記録されるため、ここでは不要）
            
            return results
            
        except Exception as e:
            logger.error(f"一括同期エラー: {e}")
            
            # エラーログ記録
            log_to_jsonl(
                {
                    "type": "batch_sync_error",
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                },
                settings.ERROR_LOG_FILE
            )
            
            # 基本情報のみを返す
            return {
                "success_count": 0,
                "error_count": 0,
                "skipped_count": 0,
                "total_count": 0,
                "results": [],
                "error": str(e)
            }
    
    async def batch_action(
        self,
        action: str,
        transaction_ids: List[str],
        user: Optional[str] = None
    ) -> Dict[str, Any]:
        """取引データに対する一括アクション実行
        
        Args:
            action: アクション名（"process", "mark_processed", "mark_pending", "delete"）
            transaction_ids: 対象トランザクションID
            user: 実行ユーザー名
            
        Returns:
            処理結果
                {
                    "action": str,
                    "success_count": int,
                    "error_count": int,
                    "total_count": int,
                    "results": List[Dict[str, Any]]
                }
                
        Raises:
            ValueError: 不正なアクション、または処理エラー
        """
        # リポジトリの取得
        transaction_repo = get_transaction_repository(self.session)
        activity_repo = get_activity_log_repository(self.session)
        
        # アクションの検証
        valid_actions = ["process", "mark_processed", "mark_pending", "delete"]
        if action not in valid_actions:
            raise ValueError(f"不正なアクション: {action}（有効値: {', '.join(valid_actions)}）")
        
        # 結果の初期化
        results = {
            "action": action,
            "success_count": 0,
            "error_count": 0,
            "total_count": len(transaction_ids),
            "results": []
        }
        
        # 一括アクションの実行
        for transaction_id in transaction_ids:
            try:
                # アクションに応じた処理
                if action == "process":
                    # 処理実行
                    process_result = await self.process_transaction(
                        transaction_id=transaction_id,
                        use_ai=True,
                        user=user
                    )
                    
                    if process_result["status"] == "success":
                        results["success_count"] += 1
                        results["results"].append({
                            "transaction_id": transaction_id,
                            "status": "success"
                        })
                    else:
                        results["error_count"] += 1
                        results["results"].append({
                            "transaction_id": transaction_id,
                            "status": "error",
                            "message": process_result.get("message")
                        })
                    
                elif action == "mark_processed":
                    # 処理済みとしてマーク
                    await transaction_repo.update(
                        transaction_id,
                        {
                            "is_processed": True,
                            "processing_status": "manual",
                            "processed_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow()
                        }
                    )
                    results["success_count"] += 1
                    results["results"].append({
                        "transaction_id": transaction_id,
                        "status": "success"
                    })
                    
                elif action == "mark_pending":
                    # 未処理としてマーク
                    await transaction_repo.update(
                        transaction_id,
                        {
                            "is_processed": False,
                            "processing_status": "pending",
                            "processed_at": None,
                            "updated_at": datetime.utcnow()
                        }
                    )
                    results["success_count"] += 1
                    results["results"].append({
                        "transaction_id": transaction_id,
                        "status": "success"
                    })
                    
                elif action == "delete":
                    # 削除
                    deleted = await transaction_repo.delete(transaction_id)
                    if deleted:
                        results["success_count"] += 1
                        results["results"].append({
                            "transaction_id": transaction_id,
                            "status": "success"
                        })
                    else:
                        results["error_count"] += 1
                        results["results"].append({
                            "transaction_id": transaction_id,
                            "status": "error",
                            "message": "削除に失敗しました"
                        })
                
            except Exception as e:
                logger.error(f"一括アクションエラー ({action}, ID={transaction_id}): {e}")
                results["error_count"] += 1
                results["results"].append({
                    "transaction_id": transaction_id,
                    "status": "error",
                    "error": str(e)
                })
        
        # アクティビティログ記録
        await activity_repo.log_activity(
            activity_type=f"batch_{action}",
            description=f"一括{action}: 成功={results['success_count']}件, エラー={results['error_count']}件",
            user=user,
            data={
                "action": action,
                "total_count": results["total_count"],
                "success_count": results["success_count"],
                "error_count": results["error_count"]
            }
        )
        
        return results
    
    async def schedule_daily_tasks(self) -> None:
        """日次タスクのスケジュール実行
        
        設定に基づいて以下のタスクを実行:
        1. 未処理トランザクションの自動処理
        2. 送信待ち仕訳データの同期
        """
        # 自動実行が無効の場合は何もしない
        if not settings.AUTO_EXECUTION_ENABLED:
            logger.info("自動実行は無効化されています")
            return
        
        logger.info("日次タスクを開始します")
        
        try:
            # 未処理トランザクションの一括処理
            if settings.AUTO_PROCESS_ENABLED:
                process_result = await self.batch_process_transactions(
                    max_count=settings.AUTO_PROCESS_MAX_COUNT,
                    use_ai=settings.AUTO_PROCESS_USE_AI,
                    user="system"
                )
                logger.info(f"自動処理結果: 成功={process_result['success_count']}件, エラー={process_result['error_count']}件")
            
            # 送信待ち仕訳データの同期
            if settings.AUTO_SYNC_ENABLED:
                sync_result = await self.batch_sync_journals(
                    max_count=settings.AUTO_SYNC_MAX_COUNT,
                    user="system"
                )
                logger.info(f"自動同期結果: 成功={sync_result['success_count']}件, エラー={sync_result['error_count']}件")
            
            # 重大なエラーがある場合は通知
            total_errors = (
                (process_result["error_count"] if 'process_result' in locals() else 0) +
                (sync_result["error_count"] if 'sync_result' in locals() else 0)
            )
            
            if total_errors > 0 and self.notification_service:
                await self.notification_service.send_notification(
                    title="日次タスク実行エラー",
                    message=f"日次タスク実行中に{total_errors}件のエラーが発生しました。ステータス画面でご確認ください。",
                    level="warning"
                )
            
        except Exception as e:
            logger.error(f"日次タスク実行エラー: {e}")
            
            # エラーログ記録
            log_to_jsonl(
                {
                    "type": "daily_tasks_error",
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                },
                settings.ERROR_LOG_FILE
            )
            
            # エラー通知
            if self.notification_service:
                await self.notification_service.send_notification(
                    title="日次タスク実行失敗",
                    message=f"日次タスクの実行に失敗しました: {e}",
                    level="error"
                )
    
    async def run_weekly_report(self) -> Dict[str, Any]:
        """週次レポートの生成と送信
        
        Returns:
            レポート結果
                {
                    "status": "success" | "error",
                    "period_start": str,
                    "period_end": str,
                    "transaction_count": int,
                    "journal_count": int,
                    "sync_count": int,
                    "error_count": int
                }
        """
        # リポジトリの取得
        transaction_repo = get_transaction_repository(self.session)
        journal_repo = get_journal_entry_repository(self.session)
        activity_repo = get_activity_log_repository(self.session)
        
        try:
            # 期間の計算（過去7日間）
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=7)
            
            # 期間内のトランザクション取得
            transactions = await transaction_repo.find_by_date_range(
                start_date=start_date.date(),
                end_date=end_date.date()
            )
            
            # 期間内の仕訳データ取得
            journals = await journal_repo.find_by_date_range(
                start_date=start_date.date(),
                end_date=end_date.date()
            )
            
            # 期間内のアクティビティログ取得
            activities = await activity_repo.find_by_date_range(
                start_date=start_date,
                end_date=end_date
            )
            
            # エラーの集計
            error_activities = [a for a in activities if "_error" in a.activity_type]
            
            # レポート結果の作成
            report = {
                "status": "success",
                "period_start": start_date.strftime("%Y-%m-%d"),
                "period_end": end_date.strftime("%Y-%m-%d"),
                "transaction_count": len(transactions),
                "transaction_processed": sum(1 for t in transactions if t.is_processed),
                "transaction_pending": sum(1 for t in transactions if not t.is_processed),
                "journal_count": len(journals),
                "journal_sent": sum(1 for j in journals if j.mf_status == "sent"),
                "journal_pending": sum(1 for j in journals if j.mf_status == "pending"),
                "journal_failed": sum(1 for j in journals if j.mf_status == "failed"),
                "activity_count": len(activities),
                "error_count": len(error_activities)
            }
            
            # レポート送信
            if self.notification_service:
                # レポートメッセージの作成
                message = f"""週次レポート ({report['period_start']} 〜 {report['period_end']})

📊 取引データ: {report['transaction_count']}件
 ✅ 処理済み: {report['transaction_processed']}件
 ⏳ 未処理: {report['transaction_pending']}件

📝 仕訳データ: {report['journal_count']}件
 ✅ 送信済み: {report['journal_sent']}件
 ⏳ 送信待ち: {report['journal_pending']}件
 ❌ 送信失敗: {report['journal_failed']}件

⚠️ エラー: {report['error_count']}件
"""
                
                await self.notification_service.send_notification(
                    title="週次レポート",
                    message=message,
                    level="info"
                )
            
            # アクティビティログ記録
            await activity_repo.log_activity(
                activity_type="weekly_report",
                description=f"週次レポート生成: {report['period_start']} 〜 {report['period_end']}",
                user="system",
                data=report
            )
            
            return report
            
        except Exception as e:
            logger.error(f"週次レポート生成エラー: {e}")
            
            # エラーログ記録
            log_to_jsonl(
                {
                    "type": "weekly_report_error",
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                },
                settings.ERROR_LOG_FILE
            )
            
            # エラー通知
            if self.notification_service:
                await self.notification_service.send_notification(
                    title="週次レポート生成失敗",
                    message=f"週次レポートの生成に失敗しました: {e}",
                    level="error"
                )
            
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def get_processing_stats(self) -> Dict[str, Any]:
        """処理統計情報を取得
        
        Returns:
            統計情報
                {
                    "total_transactions": int,
                    "processed_transactions": int,
                    "pending_transactions": int,
                    "error_transactions": int,
                    "total_journal_entries": int,
                    "pending_journal_entries": int,
                    "sent_journal_entries": int,
                    "failed_journal_entries": int,
                    "total_rules": int,
                    "active_rules": int
                }
        """
        # リポジトリの取得
        transaction_repo = get_transaction_repository(self.session)
        journal_repo = get_journal_entry_repository(self.session)
        rule_repo = get_rule_repository(self.session)
        
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
        
        return stats
    
    async def get_timeframe_stats(self, days: int = 30) -> Dict[str, Any]:
        """期間ごとの処理統計を取得
        
        Args:
            days: 集計期間（日数）
            
        Returns:
            期間ごとの処理統計
                {
                    "period": {
                        "start_date": str,
                        "end_date": str,
                        "days": int
                    },
                    "daily_stats": {
                        "YYYY-MM-DD": {
                            "transactions": int,
                            "processed_transactions": int,
                            "journal_entries": int,
                            "sent_journal_entries": int
                        },
                        ...
                    },
                    "total_stats": {
                        "total_transactions": int,
                        "total_processed_transactions": int,
                        "total_journal_entries": int,
                        "total_sent_journal_entries": int
                    }
                }
        """
        # リポジトリの取得
        transaction_repo = get_transaction_repository(self.session)
        journal_repo = get_journal_entry_repository(self.session)
        
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
        
        return result
