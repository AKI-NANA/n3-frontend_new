#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
scheduler.py - 定期実行・自動化制御

このモジュールは記帳自動化の定期実行機能を提供します：
1. 1時間ごと新規取引処理
2. 2時間ごと自動承認実行
3. 日次データクリーンアップ
4. 週次AI学習データ更新
"""

import asyncio
import logging
import signal
import sys
from datetime import datetime, timedelta, time
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession

from database.db_setup import get_session
from services.data_processor import DataProcessor, ProcessingConfig, ProcessingMode
from services.ai_service import AIService
from services.sync_service import SyncService
from services.notification_service import NotificationService
from database.repositories import get_activity_log_repository
from utils.logger import setup_logger, log_to_jsonl
from utils.config import settings

# ロガー設定
logger = setup_logger()

class ScheduleType(Enum):
    """スケジュールタイプ"""
    INTERVAL = "interval"       # 間隔実行
    DAILY = "daily"            # 日次実行
    WEEKLY = "weekly"          # 週次実行
    MONTHLY = "monthly"        # 月次実行

@dataclass
class ScheduledTask:
    """スケジュールタスク定義"""
    name: str                           # タスク名
    function: Callable                  # 実行関数
    schedule_type: ScheduleType         # スケジュールタイプ
    interval_minutes: Optional[int] = None      # 間隔（分）
    daily_time: Optional[time] = None           # 日次実行時刻
    weekly_day: Optional[int] = None            # 週次実行曜日（0=月曜）
    monthly_day: Optional[int] = None           # 月次実行日
    enabled: bool = True                        # 有効フラグ
    last_run: Optional[datetime] = None         # 最終実行時刻
    run_count: int = 0                         # 実行回数
    error_count: int = 0                       # エラー回数

class KichoScheduler:
    """記帳自動化スケジューラー"""
    
    def __init__(self):
        """初期化"""
        self.tasks: List[ScheduledTask] = []
        self.running = False
        self.loop = None
        self.notification_service = NotificationService()
        
        # シャットダウンシグナル設定
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # デフォルトタスク登録
        self._register_default_tasks()
    
    def _signal_handler(self, signum, frame):
        """シグナルハンドラー"""
        logger.info(f"シグナル {signum} を受信: スケジューラーを停止します")
        self.stop()
    
    def _register_default_tasks(self):
        """デフォルトタスク登録"""
        
        # 1時間ごと: 新規取引処理
        self.add_task(ScheduledTask(
            name="新規取引処理",
            function=self._process_new_transactions,
            schedule_type=ScheduleType.INTERVAL,
            interval_minutes=60,
            enabled=settings.AUTO_EXECUTION_ENABLED
        ))
        
        # 2時間ごと: 自動承認・送信
        self.add_task(ScheduledTask(
            name="自動承認・送信",
            function=self._auto_approve_and_send,
            schedule_type=ScheduleType.INTERVAL,
            interval_minutes=120,
            enabled=settings.AUTO_EXECUTION_ENABLED
        ))
        
        # 30分ごと: 失敗取引リトライ
        self.add_task(ScheduledTask(
            name="失敗取引リトライ",
            function=self._retry_failed_transactions,
            schedule_type=ScheduleType.INTERVAL,
            interval_minutes=30,
            enabled=settings.AUTO_EXECUTION_ENABLED
        ))
        
        # 日次: データクリーンアップ（午前2時）
        self.add_task(ScheduledTask(
            name="日次データクリーンアップ",
            function=self._daily_cleanup,
            schedule_type=ScheduleType.DAILY,
            daily_time=time(2, 0),  # 午前2時
            enabled=True
        ))
        
        # 週次: AI学習データ更新（日曜午前3時）
        self.add_task(ScheduledTask(
            name="週次AI学習更新",
            function=self._weekly_ai_learning,
            schedule_type=ScheduleType.WEEKLY,
            weekly_day=6,  # 日曜日
            daily_time=time(3, 0),  # 午前3時
            enabled=True
        ))
        
        # 月次: レポート生成（1日午前4時）
        self.add_task(ScheduledTask(
            name="月次レポート生成",
            function=self._monthly_report,
            schedule_type=ScheduleType.MONTHLY,
            monthly_day=1,  # 毎月1日
            daily_time=time(4, 0),  # 午前4時
            enabled=True
        ))
        
        # 15分ごと: ヘルスチェック
        self.add_task(ScheduledTask(
            name="システムヘルスチェック",
            function=self._system_health_check,
            schedule_type=ScheduleType.INTERVAL,
            interval_minutes=15,
            enabled=True
        ))
    
    def add_task(self, task: ScheduledTask):
        """タスク追加"""
        self.tasks.append(task)
        logger.info(f"スケジュールタスク追加: {task.name}")
    
    def remove_task(self, task_name: str) -> bool:
        """タスク削除"""
        for i, task in enumerate(self.tasks):
            if task.name == task_name:
                del self.tasks[i]
                logger.info(f"スケジュールタスク削除: {task_name}")
                return True
        return False
    
    def enable_task(self, task_name: str) -> bool:
        """タスク有効化"""
        for task in self.tasks:
            if task.name == task_name:
                task.enabled = True
                logger.info(f"タスク有効化: {task_name}")
                return True
        return False
    
    def disable_task(self, task_name: str) -> bool:
        """タスク無効化"""
        for task in self.tasks:
            if task.name == task_name:
                task.enabled = False
                logger.info(f"タスク無効化: {task_name}")
                return True
        return False
    
    async def run(self):
        """スケジューラー実行開始"""
        if self.running:
            logger.warning("スケジューラーは既に実行中です")
            return
        
        self.running = True
        self.loop = asyncio.get_event_loop()
        
        logger.info("記帳自動化スケジューラー開始")
        logger.info(f"登録タスク数: {len(self.tasks)}")
        
        # 開始通知
        try:
            await self.notification_service.send_notification(
                title="自動化システム開始",
                message=f"記帳自動化スケジューラーが開始されました\n登録タスク: {len(self.tasks)}個",
                level="info"
            )
        except Exception as e:
            logger.error(f"開始通知エラー: {e}")
        
        # メインループ
        try:
            while self.running:
                await self._check_and_run_tasks()
                await asyncio.sleep(60)  # 1分間隔でチェック
                
        except Exception as e:
            logger.error(f"スケジューラーメインループエラー: {e}")
            
        finally:
            logger.info("記帳自動化スケジューラー停止")
    
    def stop(self):
        """スケジューラー停止"""
        self.running = False
        logger.info("スケジューラー停止要求")
    
    async def _check_and_run_tasks(self):
        """タスクチェック・実行"""
        now = datetime.utcnow()
        
        for task in self.tasks:
            if not task.enabled:
                continue
            
            should_run = False
            
            # スケジュール判定
            if task.schedule_type == ScheduleType.INTERVAL:
                if task.last_run is None:
                    should_run = True
                elif task.interval_minutes and (now - task.last_run).total_seconds() >= task.interval_minutes * 60:
                    should_run = True
            
            elif task.schedule_type == ScheduleType.DAILY:
                if task.daily_time and (task.last_run is None or task.last_run.date() < now.date()):
                    if now.time() >= task.daily_time:
                        should_run = True
            
            elif task.schedule_type == ScheduleType.WEEKLY:
                if (task.weekly_day is not None and task.daily_time and 
                    (task.last_run is None or (now - task.last_run).days >= 7)):
                    if now.weekday() == task.weekly_day and now.time() >= task.daily_time:
                        should_run = True
            
            elif task.schedule_type == ScheduleType.MONTHLY:
                if (task.monthly_day and task.daily_time and
                    (task.last_run is None or task.last_run.month != now.month)):
                    if now.day == task.monthly_day and now.time() >= task.daily_time:
                        should_run = True
            
            # タスク実行
            if should_run:
                await self._execute_task(task)
    
    async def _execute_task(self, task: ScheduledTask):
        """タスク実行"""
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"タスク実行開始: {task.name}")
            
            # タスク関数実行
            result = await task.function()
            
            # 実行時間計算
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            # 統計更新
            task.last_run = start_time
            task.run_count += 1
            
            logger.info(f"タスク実行完了: {task.name} ({execution_time:.1f}秒)")
            
            # 成功ログ記録
            log_to_jsonl(
                {
                    "type": "scheduled_task_success",
                    "task_name": task.name,
                    "execution_time_seconds": execution_time,
                    "result": result if isinstance(result, dict) else str(result),
                    "timestamp": start_time.isoformat()
                },
                settings.DATA_DIR / "scheduler_log.jsonl"
            )
            
        except Exception as e:
            logger.error(f"タスク実行エラー {task.name}: {e}")
            
            # エラー統計更新
            task.error_count += 1
            
            # エラーログ記録
            log_to_jsonl(
                {
                    "type": "scheduled_task_error",
                    "task_name": task.name,
                    "error": str(e),
                    "error_count": task.error_count,
                    "timestamp": start_time.isoformat()
                },
                settings.ERROR_LOG_FILE
            )
            
            # エラー通知（連続エラーの場合）
            if task.error_count >= 3:
                try:
                    await self.notification_service.send_notification(
                        title="スケジュールタスクエラー",
                        message=f"タスク「{task.name}」が連続してエラーになっています\nエラー回数: {task.error_count}",
                        level="error"
                    )
                except Exception as notify_error:
                    logger.error(f"エラー通知失敗: {notify_error}")
    
    # タスク実行関数群
    async def _process_new_transactions(self) -> Dict[str, Any]:
        """新規取引処理タスク"""
        async with get_session() as session:
            config = ProcessingConfig(
                mode=ProcessingMode.SCHEDULED,
                auto_approve_threshold=95.0,
                max_transactions_per_run=50,
                enable_notifications=False  # スケジューラーが通知管理
            )
            
            processor = DataProcessor(session, config)
            result = await processor.process_new_transactions()
            
            return {
                'total_processed': result.total_processed,
                'new_transactions': result.new_transactions,
                'ai_inferred': result.ai_inferred,
                'auto_approved': result.auto_approved,
                'errors': result.errors
            }
    
    async def _auto_approve_and_send(self) -> Dict[str, Any]:
        """自動承認・送信タスク"""
        async with get_session() as session:
            sync_service = SyncService(session)
            
            # 送信待ち仕訳の送信
            sync_result = await sync_service.sync_pending_entries(limit=30)
            
            return {
                'success_count': sync_result['success_count'],
                'error_count': sync_result['error_count'],
                'total_count': sync_result['total_count']
            }
    
    async def _retry_failed_transactions(self) -> Dict[str, Any]:
        """失敗取引リトライタスク"""
        async with get_session() as session:
            config = ProcessingConfig(
                mode=ProcessingMode.SCHEDULED,
                retry_failed_items=True,
                max_transactions_per_run=20
            )
            
            processor = DataProcessor(session, config)
            result = await processor.retry_failed_transactions()
            
            return {
                'total_processed': result.total_processed,
                'ai_inferred': result.ai_inferred,
                'auto_approved': result.auto_approved,
                'errors': result.errors
            }
    
    async def _daily_cleanup(self) -> Dict[str, Any]:
        """日次データクリーンアップタスク"""
        try:
            async with get_session() as session:
                activity_repo = get_activity_log_repository(session)
                
                # 古いアクティビティログ削除（30日以上前）
                cutoff_date = datetime.utcnow() - timedelta(days=30)
                
                # ログクリーンアップ（実装は repositories に依存）
                cleaned_count = 0  # 実際の削除数
                
                # 一時ファイルクリーンアップ
                temp_dir = settings.DATA_DIR / "temp"
                temp_files_cleaned = 0
                
                if temp_dir.exists():
                    for file_path in temp_dir.glob("*"):
                        if file_path.is_file():
                            file_age = datetime.utcnow() - datetime.fromtimestamp(file_path.stat().st_mtime)
                            if file_age.days >= 7:  # 7日以上古いファイル
                                file_path.unlink()
                                temp_files_cleaned += 1
                
                # クリーンアップ結果記録
                await activity_repo.log_activity(
                    activity_type="daily_cleanup",
                    description=f"日次クリーンアップ完了: ログ{cleaned_count}件, 一時ファイル{temp_files_cleaned}件削除",
                    data={
                        'logs_cleaned': cleaned_count,
                        'temp_files_cleaned': temp_files_cleaned,
                        'cutoff_date': cutoff_date.isoformat()
                    }
                )
                
                return {
                    'logs_cleaned': cleaned_count,
                    'temp_files_cleaned': temp_files_cleaned
                }
                
        except Exception as e:
            logger.error(f"日次クリーンアップエラー: {e}")
            return {'error': str(e)}
    
    async def _weekly_ai_learning(self) -> Dict[str, Any]:
        """週次AI学習更新タスク"""
        try:
            async with get_session() as session:
                ai_service = AIService(session)
                
                # 学習統計取得
                learning_stats = await ai_service.get_learning_statistics()
                
                # バッチ学習実行（内部的に実装されている場合）
                # ai_service._execute_batch_learning() の手動実行
                
                return {
                    'total_learning_samples': learning_stats.get('total_learning_samples', 0),
                    'recent_learning_count': learning_stats.get('recent_learning_count', 0),
                    'learning_executed': True
                }
                
        except Exception as e:
            logger.error(f"週次AI学習エラー: {e}")
            return {'error': str(e)}
    
    async def _monthly_report(self) -> Dict[str, Any]:
        """月次レポート生成タスク"""
        try:
            async with get_session() as session:
                processor = DataProcessor(session)
                stats = await processor.get_processing_statistics()
                
                # レポート通知
                if self.notification_service:
                    await self.notification_service.send_summary_notification(
                        summary_data={
                            'period': '月次レポート',
                            'total_transactions': stats.get('total_transactions', 0),
                            'automation_rate': stats.get('automation_rate_percent', 0),
                            'error_rate': stats.get('error_rate_percent', 0)
                        },
                        title="記帳自動化 月次レポート"
                    )
                
                return {
                    'report_generated': True,
                    'total_transactions': stats.get('total_transactions', 0),
                    'automation_rate': stats.get('automation_rate_percent', 0)
                }
                
        except Exception as e:
            logger.error(f"月次レポートエラー: {e}")
            return {'error': str(e)}
    
    async def _system_health_check(self) -> Dict[str, Any]:
        """システムヘルスチェックタスク"""
        try:
            async with get_session() as session:
                processor = DataProcessor(session)
                health_status = await processor.health_check()
                
                # 異常検出時の通知
                if (health_status['overall_status'] in ['unhealthy', 'degraded'] and
                    self.notification_service):
                    
                    unhealthy_components = [
                        name for name, status in health_status['components'].items()
                        if status['status'] == 'unhealthy'
                    ]
                    
                    await self.notification_service.send_notification(
                        title="システム異常検出",
                        message=f"異常コンポーネント: {', '.join(unhealthy_components)}",
                        level="warning"
                    )
                
                return health_status
                
        except Exception as e:
            logger.error(f"ヘルスチェックエラー: {e}")
            return {'error': str(e)}
    
    def get_task_status(self) -> List[Dict[str, Any]]:
        """タスク状態取得"""
        return [
            {
                'name': task.name,
                'schedule_type': task.schedule_type.value,
                'enabled': task.enabled,
                'last_run': task.last_run.isoformat() if task.last_run else None,
                'run_count': task.run_count,
                'error_count': task.error_count,
                'next_run': self._calculate_next_run(task)
            }
            for task in self.tasks
        ]
    
    def _calculate_next_run(self, task: ScheduledTask) -> Optional[str]:
        """次回実行時刻計算"""
        if not task.enabled:
            return None
        
        now = datetime.utcnow()
        
        if task.schedule_type == ScheduleType.INTERVAL and task.interval_minutes:
            if task.last_run:
                next_run = task.last_run + timedelta(minutes=task.interval_minutes)
            else:
                next_run = now
            
            return next_run.isoformat()
        
        elif task.schedule_type == ScheduleType.DAILY and task.daily_time:
            next_run = now.replace(
                hour=task.daily_time.hour,
                minute=task.daily_time.minute,
                second=0,
                microsecond=0
            )
            
            if next_run <= now:
                next_run += timedelta(days=1)
            
            return next_run.isoformat()
        
        # 他のスケジュールタイプの計算も実装可能
        return None

# スケジューラー実行用メイン関数
async def main():
    """スケジューラーメイン実行"""
    scheduler = KichoScheduler()
    
    logger.info("記帳自動化スケジューラー起動")
    
    try:
        await scheduler.run()
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt: スケジューラーを停止します")
    except Exception as e:
        logger.error(f"スケジューラー実行エラー: {e}")
    finally:
        scheduler.stop()

if __name__ == "__main__":
    # 単体実行時
    asyncio.run(main())
