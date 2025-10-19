"""
app/services/kanpeki_asin_queue_manager.py - 完璧ASINキュー管理サービス
用途: ASIN処理キューの管理・優先度制御・負荷分散サービス
修正対象: キュー戦略変更時、優先度アルゴリズム変更時、パフォーマンス改善時
"""

import asyncio
import json
import uuid
import logging
from typing import Dict, List, Optional, Any, Callable, Awaitable, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum, IntEnum
from abc import ABC, abstractmethod
import aioredis
from redis.exceptions import RedisError

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.kanpeki_asin_external_connector import APIProvider

settings = get_settings()
logger = get_logger(__name__)

class TaskPriority(IntEnum):
    """タスク優先度（数値が小さいほど高優先度）"""
    CRITICAL = 1    # 緊急処理
    HIGH = 2        # 高優先度
    NORMAL = 3      # 通常優先度
    LOW = 4         # 低優先度
    BACKGROUND = 5  # バックグラウンド処理

class TaskStatus(str, Enum):
    """タスクステータス"""
    PENDING = "pending"        # 待機中
    PROCESSING = "processing"  # 処理中
    COMPLETED = "completed"    # 完了
    FAILED = "failed"         # 失敗
    RETRY = "retry"           # リトライ待ち
    CANCELLED = "cancelled"   # キャンセル済み

class QueueType(str, Enum):
    """キュータイプ"""
    ASIN_SEARCH = "asin_search"           # ASIN検索
    KEYWORD_SEARCH = "keyword_search"     # キーワード検索
    BULK_IMPORT = "bulk_import"           # 一括インポート
    CACHE_REFRESH = "cache_refresh"       # キャッシュ更新
    DATA_SYNC = "data_sync"              # データ同期
    REPORT_GENERATION = "report_gen"      # レポート生成

@dataclass
class TaskData:
    """タスクデータ"""
    task_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    queue_type: QueueType = QueueType.ASIN_SEARCH
    priority: TaskPriority = TaskPriority.NORMAL
    payload: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    scheduled_at: Optional[datetime] = None
    retry_count: int = 0
    max_retries: int = 3
    timeout_seconds: int = 300
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class TaskResult:
    """タスク結果"""
    task_id: str
    status: TaskStatus
    result_data: Optional[Any] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time_seconds: Optional[float] = None
    worker_id: Optional[str] = None

class TaskHandler(ABC):
    """タスクハンドラー基底クラス"""
    
    @abstractmethod
    async def handle(self, task_data: TaskData) -> TaskResult:
        """タスク処理実装"""
        pass

class QueueStatistics:
    """キュー統計情報"""
    
    def __init__(self):
        self.total_tasks: int = 0
        self.pending_tasks: int = 0
        self.processing_tasks: int = 0
        self.completed_tasks: int = 0
        self.failed_tasks: int = 0
        self.average_processing_time: float = 0.0
        self.tasks_per_minute: float = 0.0
        self.queue_health_score: float = 100.0
        self.last_updated: datetime = datetime.utcnow()

class KanpekiAsinQueueManager:
    """
    完璧ASINキュー管理サービス
    
    説明: Redis-based分散タスクキュー管理システム
    主要機能: 優先度キュー、負荷分散、進捗監視、障害復旧
    修正対象: スケーリング戦略変更時、新キュータイプ追加時
    """

    def __init__(self):
        self.redis_client: Optional[aioredis.Redis] = None
        self.task_handlers: Dict[QueueType, TaskHandler] = {}
        self.worker_pool: Dict[str, asyncio.Task] = {}
        self.is_running: bool = False
        self.worker_id: str = f"worker_{uuid.uuid4().hex[:8]}"
        self.max_workers: int = 10
        self.heartbeat_interval: int = 30
        self.dead_letter_queue: str = "dlq:asin_tasks"
        
        # キュー名定義
        self.queue_names = {
            QueueType.ASIN_SEARCH: "queue:asin:search",
            QueueType.KEYWORD_SEARCH: "queue:asin:keyword",
            QueueType.BULK_IMPORT: "queue:asin:bulk",
            QueueType.CACHE_REFRESH: "queue:asin:cache",
            QueueType.DATA_SYNC: "queue:asin:sync",
            QueueType.REPORT_GENERATION: "queue:asin:report"
        }
        
        # 統計情報
        self.statistics: Dict[QueueType, QueueStatistics] = {
            queue_type: QueueStatistics() for queue_type in QueueType
        }

    async def initialize(self) -> bool:
        """
        キューマネージャー初期化
        
        説明: Redisコネクション確立、ワーカープール起動
        戻り値: 初期化成功の場合True
        修正対象: Redis設定変更時
        """
        try:
            # Redis接続
            self.redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20
            )
            
            # 接続テスト
            await self.redis_client.ping()
            logger.info(f"キューマネージャー初期化成功: Worker ID={self.worker_id}")
            
            # 既存の未処理タスクを復旧
            await self._recover_incomplete_tasks()
            
            return True

        except Exception as e:
            logger.error(f"キューマネージャー初期化失敗: {str(e)}")
            return False

    async def start_workers(self, num_workers: Optional[int] = None) -> None:
        """
        ワーカープール開始
        
        説明: 指定された数のワーカーを起動してタスク処理開始
        パラメータ: num_workers - ワーカー数（省略時はmax_workers）
        修正対象: ワーカー起動戦略変更時
        """
        if self.is_running:
            logger.warning("ワーカープールは既に実行中です")
            return

        worker_count = num_workers or self.max_workers
        logger.info(f"ワーカープール開始: {worker_count}ワーカー")
        
        self.is_running = True
        
        # ワーカータスク起動
        for i in range(worker_count):
            worker_name = f"{self.worker_id}_worker_{i}"
            task = asyncio.create_task(self._worker_loop(worker_name))
            self.worker_pool[worker_name] = task
        
        # ハートビート・統計タスク起動
        heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        stats_task = asyncio.create_task(self._statistics_loop())
        
        self.worker_pool["heartbeat"] = heartbeat_task
        self.worker_pool["statistics"] = stats_task
        
        logger.info(f"ワーカープール起動完了: {len(self.worker_pool)}タスク")

    async def stop_workers(self, graceful_timeout: int = 30) -> None:
        """
        ワーカープール停止
        
        説明: 全ワーカーを安全に停止
        パラメータ: graceful_timeout - グレースフル停止待機時間（秒）
        修正対象: 停止戦略変更時
        """
        if not self.is_running:
            logger.warning("ワーカープールは既に停止しています")
            return

        logger.info("ワーカープール停止開始...")
        self.is_running = False
        
        # 全タスクのキャンセル要求
        for task_name, task in self.worker_pool.items():
            if not task.done():
                task.cancel()
        
        # グレースフル停止待機
        try:
            await asyncio.wait_for(
                asyncio.gather(*self.worker_pool.values(), return_exceptions=True),
                timeout=graceful_timeout
            )
        except asyncio.TimeoutError:
            logger.warning(f"グレースフル停止タイムアウト: {graceful_timeout}秒")
        
        self.worker_pool.clear()
        logger.info("ワーカープール停止完了")

    async def enqueue_task(self, task_data: TaskData) -> bool:
        """
        タスクキュー追加
        
        説明: タスクを適切なキューに追加
        パラメータ: task_data - 追加するタスクデータ
        戻り値: 追加成功の場合True
        修正対象: キューイング戦略変更時
        """
        try:
            if not self.redis_client:
                raise RuntimeError("Redis クライアントが初期化されていません")

            queue_name = self.queue_names[task_data.queue_type]
            
            # タスクデータのシリアライゼーション
            task_json = json.dumps({
                **asdict(task_data),
                'created_at': task_data.created_at.isoformat(),
                'scheduled_at': task_data.scheduled_at.isoformat() if task_data.scheduled_at else None
            }, ensure_ascii=False)
            
            # 優先度付きキューに追加
            score = self._calculate_priority_score(task_data)
            await self.redis_client.zadd(queue_name, {task_json: score})
            
            # タスクメタデータ保存
            await self._save_task_metadata(task_data)
            
            # 統計更新
            self.statistics[task_data.queue_type].total_tasks += 1
            self.statistics[task_data.queue_type].pending_tasks += 1
            
            logger.info(f"タスクキュー追加: {task_data.task_id} -> {queue_name}")
            return True

        except Exception as e:
            logger.error(f"タスクキュー追加失敗: {str(e)}")
            return False

    async def enqueue_bulk_tasks(self, tasks: List[TaskData]) -> Dict[str, Any]:
        """
        一括タスクキュー追加
        
        説明: 複数タスクを効率的に一括追加
        パラメータ: tasks - 追加するタスクリスト
        戻り値: 追加結果統計
        修正対象: バッチ処理サイズ変更時
        """
        start_time = time.time()
        results = {
            "total": len(tasks),
            "successful": 0,
            "failed": 0,
            "errors": []
        }
        
        try:
            # キュータイプ別にグループ化
            task_groups = {}
            for task in tasks:
                queue_type = task.queue_type
                if queue_type not in task_groups:
                    task_groups[queue_type] = []
                task_groups[queue_type].append(task)
            
            # 並列処理でキューに追加
            semaphore = asyncio.Semaphore(5)  # 同時実行数制限
            
            async def add_task_group(queue_type: QueueType, group_tasks: List[TaskData]):
                async with semaphore:
                    for task in group_tasks:
                        success = await self.enqueue_task(task)
                        if success:
                            results["successful"] += 1
                        else:
                            results["failed"] += 1
                            results["errors"].append(f"Task {task.task_id} failed")
            
            # 全グループ並列実行
            await asyncio.gather(*[
                add_task_group(queue_type, group_tasks)
                for queue_type, group_tasks in task_groups.items()
            ])
            
            processing_time = time.time() - start_time
            logger.info(f"一括タスク追加完了: {results['successful']}/{results['total']} ({processing_time:.2f}秒)")
            
            return results

        except Exception as e:
            logger.error(f"一括タスク追加エラー: {str(e)}")
            results["errors"].append(str(e))
            return results

    async def get_task_status(self, task_id: str) -> Optional[TaskResult]:
        """
        タスクステータス取得
        
        説明: 指定タスクの現在のステータスを取得
        パラメータ: task_id - タスクID
        戻り値: タスク結果（存在しない場合はNone）
        修正対象: ステータス管理方式変更時
        """
        try:
            if not self.redis_client:
                return None

            # Redis からタスク結果取得
            result_key = f"task_result:{task_id}"
            result_data = await self.redis_client.hgetall(result_key)
            
            if not result_data:
                # 処理中タスクかチェック
                processing_key = f"task_processing:{task_id}"
                if await self.redis_client.exists(processing_key):
                    return TaskResult(
                        task_id=task_id,
                        status=TaskStatus.PROCESSING,
                        started_at=datetime.utcnow()
                    )
                return None
            
            # TaskResult オブジェクトに変換
            return TaskResult(
                task_id=result_data["task_id"],
                status=TaskStatus(result_data["status"]),
                result_data=json.loads(result_data.get("result_data", "null")),
                error_message=result_data.get("error_message"),
                error_code=result_data.get("error_code"),
                started_at=datetime.fromisoformat(result_data["started_at"]) if result_data.get("started_at") else None,
                completed_at=datetime.fromisoformat(result_data["completed_at"]) if result_data.get("completed_at") else None,
                processing_time_seconds=float(result_data["processing_time_seconds"]) if result_data.get("processing_time_seconds") else None,
                worker_id=result_data.get("worker_id")
            )

        except Exception as e:
            logger.error(f"タスクステータス取得エラー: {str(e)}")
            return None

    async def cancel_task(self, task_id: str) -> bool:
        """
        タスクキャンセル
        
        説明: 指定タスクをキャンセル
        パラメータ: task_id - キャンセルするタスクID
        戻り値: キャンセル成功の場合True
        修正対象: キャンセル戦略変更時
        """
        try:
            if not self.redis_client:
                return False

            # 処理中タスクの場合はキャンセルフラグ設定
            processing_key = f"task_processing:{task_id}"
            if await self.redis_client.exists(processing_key):
                cancel_key = f"task_cancel:{task_id}"
                await self.redis_client.setex(cancel_key, 300, "cancelled")
                logger.info(f"処理中タスクキャンセル要求: {task_id}")
                return True
            
            # 待機中タスクの場合は直接削除
            for queue_type in QueueType:
                queue_name = self.queue_names[queue_type]
                tasks = await self.redis_client.zrange(queue_name, 0, -1)
                
                for task_json in tasks:
                    task_data = json.loads(task_json)
                    if task_data.get("task_id") == task_id:
                        await self.redis_client.zrem(queue_name, task_json)
                        
                        # キャンセル結果保存
                        await self._save_task_result(TaskResult(
                            task_id=task_id,
                            status=TaskStatus.CANCELLED,
                            completed_at=datetime.utcnow()
                        ))
                        
                        logger.info(f"待機中タスクキャンセル: {task_id}")
                        return True
            
            logger.warning(f"キャンセル対象タスク未発見: {task_id}")
            return False

        except Exception as e:
            logger.error(f"タスクキャンセルエラー: {str(e)}")
            return False

    async def get_queue_statistics(self, queue_type: Optional[QueueType] = None) -> Dict[str, Any]:
        """
        キュー統計取得
        
        説明: キューの統計情報を取得
        パラメータ: queue_type - 特定キューの統計（省略時は全キュー）
        戻り値: 統計情報辞書
        修正対象: 統計項目追加時
        """
        try:
            if queue_type:
                stats = self.statistics[queue_type]
                queue_name = self.queue_names[queue_type]
                
                # リアルタイム統計更新
                if self.redis_client:
                    stats.pending_tasks = await self.redis_client.zcard(queue_name)
                    stats.processing_tasks = await self.redis_client.zcard(f"processing:{queue_name}")
                
                return {
                    "queue_type": queue_type.value,
                    "total_tasks": stats.total_tasks,
                    "pending_tasks": stats.pending_tasks,
                    "processing_tasks": stats.processing_tasks,
                    "completed_tasks": stats.completed_tasks,
                    "failed_tasks": stats.failed_tasks,
                    "average_processing_time": stats.average_processing_time,
                    "tasks_per_minute": stats.tasks_per_minute,
                    "queue_health_score": stats.queue_health_score,
                    "last_updated": stats.last_updated.isoformat()
                }
            
            # 全キュー統計
            all_stats = {}
            for qt in QueueType:
                stats = await self.get_queue_statistics(qt)
                all_stats[qt.value] = stats
            
            # 総合統計算出
            total_stats = {
                "total_tasks": sum(s["total_tasks"] for s in all_stats.values()),
                "pending_tasks": sum(s["pending_tasks"] for s in all_stats.values()),
                "processing_tasks": sum(s["processing_tasks"] for s in all_stats.values()),
                "completed_tasks": sum(s["completed_tasks"] for s in all_stats.values()),
                "failed_tasks": sum(s["failed_tasks"] for s in all_stats.values()),
                "queue_details": all_stats,
                "worker_count": len(self.worker_pool),
                "is_running": self.is_running
            }
            
            return total_stats

        except Exception as e:
            logger.error(f"キュー統計取得エラー: {str(e)}")
            return {}

    def register_handler(self, queue_type: QueueType, handler: TaskHandler) -> None:
        """
        タスクハンドラー登録
        
        説明: 特定キュータイプのハンドラーを登録
        パラメータ:
            queue_type - キュータイプ
            handler - ハンドラーインスタンス
        修正対象: ハンドラー管理方式変更時
        """
        self.task_handlers[queue_type] = handler
        logger.info(f"タスクハンドラー登録: {queue_type.value} -> {handler.__class__.__name__}")

    async def _worker_loop(self, worker_name: str) -> None:
        """
        ワーカーループ（内部メソッド）
        
        説明: 個別ワーカーのメインループ処理
        修正対象: ワーカー処理ロジック変更時
        """
        logger.info(f"ワーカー開始: {worker_name}")
        
        while self.is_running:
            try:
                # タスク取得・処理
                task_found = await self._process_next_task(worker_name)
                
                if not task_found:
                    # タスクがない場合は短時間待機
                    await asyncio.sleep(1)
                
            except asyncio.CancelledError:
                logger.info(f"ワーカーキャンセル: {worker_name}")
                break
            except Exception as e:
                logger.error(f"ワーカーエラー [{worker_name}]: {str(e)}")
                await asyncio.sleep(5)  # エラー時は長めに待機
        
        logger.info(f"ワーカー終了: {worker_name}")

    async def _process_next_task(self, worker_name: str) -> bool:
        """
        次のタスク処理（内部メソッド）
        
        説明: 最高優先度のタスクを取得して処理
        戻り値: タスクを処理した場合True
        修正対象: タスク選択戦略変更時
        """
        try:
            if not self.redis_client:
                return False

            # 優先度順でキューをチェック
            for queue_type in QueueType:
                queue_name = self.queue_names[queue_type]
                
                # 最高優先度タスク取得
                tasks = await self.redis_client.zrange(queue_name, 0, 0, withscores=True)
                
                if not tasks:
                    continue
                
                task_json, score = tasks[0]
                
                # Redisからタスクを削除（アトミック操作）
                removed = await self.redis_client.zrem(queue_name, task_json)
                if not removed:
                    continue  # 他のワーカーが取得済み
                
                # タスクデータ復元
                task_data_dict = json.loads(task_json)
                task_data = TaskData(
                    task_id=task_data_dict["task_id"],
                    queue_type=QueueType(task_data_dict["queue_type"]),
                    priority=TaskPriority(task_data_dict["priority"]),
                    payload=task_data_dict["payload"],
                    created_at=datetime.fromisoformat(task_data_dict["created_at"]),
                    scheduled_at=datetime.fromisoformat(task_data_dict["scheduled_at"]) if task_data_dict.get("scheduled_at") else None,
                    retry_count=task_data_dict["retry_count"],
                    max_retries=task_data_dict["max_retries"],
                    timeout_seconds=task_data_dict["timeout_seconds"],
                    tags=task_data_dict["tags"],
                    metadata=task_data_dict["metadata"]
                )
                
                # スケジュール時刻チェック
                if task_data.scheduled_at and task_data.scheduled_at > datetime.utcnow():
                    # 再度キューに戻す
                    await self.redis_client.zadd(queue_name, {task_json: score})
                    continue
                
                # タスク処理実行
                await self._execute_task(task_data, worker_name)
                return True
            
            return False

        except Exception as e:
            logger.error(f"タスク処理エラー [{worker_name}]: {str(e)}")
            return False

    async def _execute_task(self, task_data: TaskData, worker_name: str) -> None:
        """
        タスク実行（内部メソッド）
        
        説明: 実際のタスク処理を実行
        修正対象: タスク実行戦略変更時
        """
        start_time = time.time()
        task_id = task_data.task_id
        
        try:
            # 処理中フラグ設定
            processing_key = f"task_processing:{task_id}"
            await self.redis_client.setex(processing_key, task_data.timeout_seconds, worker_name)
            
            # キャンセルチェック
            cancel_key = f"task_cancel:{task_id}"
            if await self.redis_client.exists(cancel_key):
                logger.info(f"タスクキャンセル検出: {task_id}")
                result = TaskResult(
                    task_id=task_id,
                    status=TaskStatus.CANCELLED,
                    completed_at=datetime.utcnow(),
                    worker_id=worker_name
                )
                await self._save_task_result(result)
                return
            
            # ハンドラー取得
            handler = self.task_handlers.get(task_data.queue_type)
            if not handler:
                raise ValueError(f"ハンドラー未登録: {task_data.queue_type}")
            
            # タスク実行
            logger.info(f"タスク実行開始: {task_id} [{worker_name}]")
            
            # タイムアウト付きで実行
            result = await asyncio.wait_for(
                handler.handle(task_data),
                timeout=task_data.timeout_seconds
            )
            
            # 成功時の処理
            processing_time = time.time() - start_time
            result.started_at = datetime.utcnow() - timedelta(seconds=processing_time)
            result.completed_at = datetime.utcnow()
            result.processing_time_seconds = processing_time
            result.worker_id = worker_name
            
            await self._save_task_result(result)
            
            # 統計更新
            stats = self.statistics[task_data.queue_type]
            stats.completed_tasks += 1
            stats.pending_tasks = max(0, stats.pending_tasks - 1)
            
            logger.info(f"タスク実行成功: {task_id} ({processing_time:.2f}秒)")

        except asyncio.TimeoutError:
            # タイムアウト処理
            error_msg = f"タスクタイムアウト: {task_data.timeout_seconds}秒"
            await self._handle_task_failure(task_data, error_msg, "TIMEOUT", worker_name, start_time)
            
        except Exception as e:
            # エラー処理
            await self._handle_task_failure(task_data, str(e), "EXECUTION_ERROR", worker_name, start_time)
            
        finally:
            # 処理中フラグ削除
            processing_key = f"task_processing:{task_id}"
            await self.redis_client.delete(processing_key)

    async def _handle_task_failure(self, task_data: TaskData, error_msg: str, 
                                 error_code: str, worker_name: str, start_time: float) -> None:
        """
        タスク失敗処理（内部メソッド）
        
        説明: タスク失敗時のリトライ・DLQ送信処理
        修正対象: 失敗処理戦略変更時
        """
        processing_time = time.time() - start_time
        
        logger.error(f"タスク実行失敗: {task_data.task_id} - {error_msg}")
        
        # リトライ判定
        if task_data.retry_count < task_data.max_retries:
            # リトライキューに追加
            task_data.retry_count += 1
            retry_delay = min(60 * (2 ** task_data.retry_count), 3600)  # 指数バックオフ（最大1時間）
            task_data.scheduled_at = datetime.utcnow() + timedelta(seconds=retry_delay)
            
            await self.enqueue_task(task_data)
            logger.info(f"タスクリトライ予約: {task_data.task_id} (試行{task_data.retry_count}/{task_data.max_retries})")
            
        else:
            # 最大リトライ回数到達 → DLQ送信
            await self._send_to_dead_letter_queue(task_data, error_msg, error_code)
            
            # 失敗結果保存
            result = TaskResult(
                task_id=task_data.task_id,
                status=TaskStatus.FAILED,
                error_message=error_msg,
                error_code=error_code,
                started_at=datetime.utcnow() - timedelta(seconds=processing_time),
                completed_at=datetime.utcnow(),
                processing_time_seconds=processing_time,
                worker_id=worker_name
            )
            await self._save_task_result(result)
            
            # 統計更新
            stats = self.statistics[task_data.queue_type]
            stats.failed_tasks += 1
            stats.pending_tasks = max(0, stats.pending_tasks - 1)

    async def _calculate_priority_score(self, task_data: TaskData) -> float:
        """
        優先度スコア計算（内部メソッド）
        
        説明: タスクの実行順序を決定するスコアを計算
        修正対象: 優先度アルゴリズム変更時
        """
        # 基本スコア（小さいほど高優先度）
        base_score = task_data.priority.value * 1000
        
        # 作成時刻による調整（古いタスクほど高優先度）
        age_minutes = (datetime.utcnow() - task_data.created_at).total_seconds() / 60
        age_bonus = min(age_minutes, 1440)  # 最大24時間分
        
        # 最終スコア
        final_score = base_score - age_bonus
        
        return final_score

    async def _save_task_metadata(self, task_data: TaskData) -> None:
        """タスクメタデータ保存（内部メソッド）"""
        if not self.redis_client:
            return
            
        metadata_key = f"task_metadata:{task_data.task_id}"
        metadata = {
            "task_id": task_data.task_id,
            "queue_type": task_data.queue_type.value,
            "priority": task_data.priority.value,
            "created_at": task_data.created_at.isoformat(),
            "retry_count": task_data.retry_count,
            "max_retries": task_data.max_retries
        }
        
        await self.redis_client.hset(metadata_key, mapping=metadata)
        await self.redis_client.expire(metadata_key, 86400)  # 24時間で期限切れ

    async def _save_task_result(self, result: TaskResult) -> None:
        """タスク結果保存（内部メソッド）"""
        if not self.redis_client:
            return
            
        result_key = f"task_result:{result.task_id}"
        result_data = {
            "task_id": result.task_id,
            "status": result.status.value,
            "result_data": json.dumps(result.result_data, ensure_ascii=False, default=str),
            "error_message": result.error_message or "",
            "error_code": result.error_code or "",
            "started_at": result.started_at.isoformat() if result.started_at else "",
            "completed_at": result.completed_at.isoformat() if result.completed_at else "",
            "processing_time_seconds": str(result.processing_time_seconds or 0),
            "worker_id": result.worker_id or ""
        }
        
        await self.redis_client.hset(result_key, mapping=result_data)
        await self.redis_client.expire(result_key, 604800)  # 7日間保持

    async def _send_to_dead_letter_queue(self, task_data: TaskData, error_msg: str, error_code: str) -> None:
        """DLQタスク送信（内部メソッド）"""
        if not self.redis_client:
            return
            
        dlq_data = {
            "task_data": asdict(task_data),
            "final_error": error_msg,
            "error_code": error_code,
            "failed_at": datetime.utcnow().isoformat()
        }
        
        await self.redis_client.lpush(
            self.dead_letter_queue,
            json.dumps(dlq_data, ensure_ascii=False, default=str)
        )
        
        logger.warning(f"タスクDLQ送信: {task_data.task_id}")

    async def _recover_incomplete_tasks(self) -> None:
        """未完了タスク復旧（内部メソッド）"""
        if not self.redis_client:
            return
            
        try:
            # 処理中としてマークされたが完了していないタスクを検出
            processing_keys = await self.redis_client.keys("task_processing:*")
            
            for key in processing_keys:
                task_id = key.split(":")[-1]
                
                # 結果が存在するかチェック
                result_key = f"task_result:{task_id}"
                if not await self.redis_client.exists(result_key):
                    # 未完了タスクとして処理
                    await self.redis_client.delete(key)
                    logger.warning(f"未完了タスク復旧: {task_id}")
                    
        except Exception as e:
            logger.error(f"タスク復旧エラー: {str(e)}")

    async def _heartbeat_loop(self) -> None:
        """ハートビートループ（内部メソッド）"""
        while self.is_running:
            try:
                if self.redis_client:
                    heartbeat_key = f"worker_heartbeat:{self.worker_id}"
                    await self.redis_client.setex(heartbeat_key, self.heartbeat_interval * 2, datetime.utcnow().isoformat())
                
                await asyncio.sleep(self.heartbeat_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"ハートビートエラー: {str(e)}")
                await asyncio.sleep(5)

    async def _statistics_loop(self) -> None:
        """統計更新ループ（内部メソッド）"""
        while self.is_running:
            try:
                await self._update_statistics()
                await asyncio.sleep(60)  # 1分毎に更新
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"統計更新エラー: {str(e)}")
                await asyncio.sleep(10)

    async def _update_statistics(self) -> None:
        """統計情報更新（内部メソッド）"""
        if not self.redis_client:
            return
            
        try:
            for queue_type in QueueType:
                stats = self.statistics[queue_type]
                queue_name = self.queue_names[queue_type]
                
                # 待機中タスク数
                stats.pending_tasks = await self.redis_client.zcard(queue_name)
                
                # 処理中タスク数
                processing_pattern = f"task_processing:*"
                processing_keys = await self.redis_client.keys(processing_pattern)
                stats.processing_tasks = len(processing_keys)
                
                # ヘルススコア計算
                if stats.total_tasks > 0:
                    success_rate = stats.completed_tasks / stats.total_tasks
                    stats.queue_health_score = min(100.0, success_rate * 100)
                
                stats.last_updated = datetime.utcnow()
                
        except Exception as e:
            logger.error(f"統計更新エラー: {str(e)}")

# === タスクハンドラー実装例 ===

class ASINSearchTaskHandler(TaskHandler):
    """ASIN検索タスクハンドラー"""
    
    async def handle(self, task_data: TaskData) -> TaskResult:
        """ASIN検索タスク処理"""
        try:
            asin = task_data.payload.get("asin")
            if not asin:
                return TaskResult(
                    task_id=task_data.task_id,
                    status=TaskStatus.FAILED,
                    error_message="ASINが指定されていません",
                    error_code="INVALID_PAYLOAD"
                )
            
            # 実際のASIN検索処理をここに実装
            # from app.services.kanpeki_asin_external_connector import KanpekiAsinExternalConnector
            # connector = KanpekiAsinExternalConnector()
            # search_result = await connector.search_asin(asin)
            
            # 仮の成功結果
            search_result = {
                "asin": asin,
                "title": f"Sample Product for {asin}",
                "price": 1000,
                "availability": "Available"
            }
            
            return TaskResult(
                task_id=task_data.task_id,
                status=TaskStatus.COMPLETED,
                result_data=search_result
            )
            
        except Exception as e:
            return TaskResult(
                task_id=task_data.task_id,
                status=TaskStatus.FAILED,
                error_message=str(e),
                error_code="SEARCH_ERROR"
            )