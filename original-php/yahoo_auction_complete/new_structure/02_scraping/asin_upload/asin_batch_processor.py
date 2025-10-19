"""
app/services/kanpeki_asin_batch_processor.py - 完璧ASINバッチ処理サービス
用途: 大量のASIN/URL処理を効率的に実行するバッチ処理専用サービス
修正対象: バッチサイズ調整時、並列処理数変更時、処理戦略変更時
"""

import asyncio
import logging
import time
from typing import List, Dict, Any, Optional, Callable, AsyncGenerator
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import uuid
from concurrent.futures import ThreadPoolExecutor
import aiohttp
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.exceptions import EmverzeException
from app.domain.models.base import BaseEntity

settings = get_settings()
logger = get_logger(__name__)

class BatchStatus(str, Enum):
    """バッチ処理ステータス"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"

class ProcessingPriority(str, Enum):
    """処理優先度"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class BatchItem:
    """バッチ処理アイテム"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    input_value: str = ""
    input_type: str = ""  # asin, url, keyword
    priority: ProcessingPriority = ProcessingPriority.NORMAL
    retry_count: int = 0
    max_retries: int = 3
    status: str = "pending"
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    processing_time: Optional[float] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

@dataclass
class BatchJob:
    """バッチジョブ"""
    job_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    job_name: str = ""
    items: List[BatchItem] = field(default_factory=list)
    status: BatchStatus = BatchStatus.PENDING
    total_items: int = 0
    processed_items: int = 0
    successful_items: int = 0
    failed_items: int = 0
    progress_percentage: float = 0.0
    estimated_completion: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_summary: Optional[str] = None
    
    def update_progress(self):
        """進捗更新"""
        if self.total_items > 0:
            self.progress_percentage = (self.processed_items / self.total_items) * 100
            
            # 完了時間予測
            if self.processed_items > 0 and self.started_at:
                elapsed = datetime.utcnow() - self.started_at
                avg_time_per_item = elapsed / self.processed_items
                remaining_items = self.total_items - self.processed_items
                self.estimated_completion = datetime.utcnow() + (avg_time_per_item * remaining_items)

class KanpekiAsinBatchProcessor:
    """
    完璧ASINバッチ処理クラス
    
    説明: 大量のASIN/URL処理を効率的かつ確実に実行
    主要機能: 並列処理、進捗追跡、エラーハンドリング、リトライ機能
    修正対象: 並列処理数調整時、バッチサイズ変更時
    """
    
    def __init__(
        self,
        session: AsyncSession,
        max_concurrent_jobs: int = 5,
        max_items_per_batch: int = 100,
        max_concurrent_items: int = 10,
        retry_delay: float = 1.0
    ):
        """
        バッチ処理初期化
        
        Args:
            session: データベースセッション
            max_concurrent_jobs: 同時実行可能ジョブ数
            max_items_per_batch: バッチあたり最大アイテム数
            max_concurrent_items: アイテム同時処理数
            retry_delay: リトライ間隔（秒）
        """
        self.session = session
        self.max_concurrent_jobs = max_concurrent_jobs
        self.max_items_per_batch = max_items_per_batch
        self.max_concurrent_items = max_concurrent_items
        self.retry_delay = retry_delay
        
        # 実行中ジョブ管理
        self.active_jobs: Dict[str, BatchJob] = {}
        self.job_tasks: Dict[str, asyncio.Task] = {}
        
        # 統計情報
        self.total_processed_items = 0
        self.total_successful_items = 0
        self.total_failed_items = 0
        
        # 外部API呼び出し制限（レート制限対応）
        self.api_semaphore = asyncio.Semaphore(10)
        self.last_api_call = {}
        self.min_api_interval = 0.1  # 100ms間隔
        
        logger.info(f"ASINバッチ処理初期化完了: 最大並列ジョブ数={max_concurrent_jobs}")

    async def create_batch_job(
        self,
        input_data: List[Dict[str, Any]],
        user_id: Optional[str] = None,
        job_name: Optional[str] = None,
        priority_mapping: Optional[Dict[str, ProcessingPriority]] = None
    ) -> BatchJob:
        """
        バッチジョブ作成
        
        Args:
            input_data: 入力データリスト
            user_id: ユーザーID
            job_name: ジョブ名
            priority_mapping: 優先度マッピング
            
        Returns:
            BatchJob: 作成されたバッチジョブ
            
        Raises:
            EmverzeException: ジョブ作成エラー
        """
        try:
            # 入力データ検証
            if not input_data:
                raise EmverzeException("入力データが空です", "EMPTY_INPUT_DATA")
            
            if len(input_data) > self.max_items_per_batch:
                raise EmverzeException(
                    f"アイテム数が上限を超えています: {len(input_data)} > {self.max_items_per_batch}",
                    "TOO_MANY_ITEMS"
                )
            
            # バッチアイテム作成
            batch_items = []
            for idx, item_data in enumerate(input_data):
                input_value = item_data.get('asin') or item_data.get('url') or item_data.get('keyword', '')
                input_type = self._detect_input_type(input_value)
                
                # 優先度決定
                priority = ProcessingPriority.NORMAL
                if priority_mapping and input_value in priority_mapping:
                    priority = priority_mapping[input_value]
                elif item_data.get('priority'):
                    priority = ProcessingPriority(item_data['priority'])
                
                batch_item = BatchItem(
                    input_value=input_value,
                    input_type=input_type,
                    priority=priority
                )
                batch_items.append(batch_item)
            
            # バッチジョブ作成
            batch_job = BatchJob(
                user_id=user_id,
                job_name=job_name or f"ASIN処理_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                items=batch_items,
                total_items=len(batch_items)
            )
            
            # 優先度順でソート
            batch_job.items.sort(key=lambda x: self._priority_weight(x.priority), reverse=True)
            
            logger.info(f"バッチジョブ作成: {batch_job.job_id}, アイテム数: {len(batch_items)}")
            return batch_job
            
        except Exception as e:
            logger.error(f"バッチジョブ作成エラー: {str(e)}")
            raise EmverzeException(f"バッチジョブ作成に失敗しました: {str(e)}", "JOB_CREATION_FAILED")

    async def submit_batch_job(self, batch_job: BatchJob) -> str:
        """
        バッチジョブ実行開始
        
        Args:
            batch_job: 実行するバッチジョブ
            
        Returns:
            str: ジョブID
            
        Raises:
            EmverzeException: ジョブ実行エラー
        """
        try:
            # 同時実行数チェック
            if len(self.active_jobs) >= self.max_concurrent_jobs:
                raise EmverzeException(
                    f"同時実行可能ジョブ数の上限に達しています: {self.max_concurrent_jobs}",
                    "TOO_MANY_CONCURRENT_JOBS"
                )
            
            # ジョブ状態更新
            batch_job.status = BatchStatus.PENDING
            batch_job.started_at = datetime.utcnow()
            
            # アクティブジョブに追加
            self.active_jobs[batch_job.job_id] = batch_job
            
            # 非同期タスクとして実行
            task = asyncio.create_task(self._process_batch_job(batch_job))
            self.job_tasks[batch_job.job_id] = task
            
            logger.info(f"バッチジョブ実行開始: {batch_job.job_id}")
            return batch_job.job_id
            
        except Exception as e:
            logger.error(f"バッチジョブ実行開始エラー: {str(e)}")
            raise EmverzeException(f"バッチジョブ実行開始に失敗しました: {str(e)}", "JOB_SUBMIT_FAILED")

    async def _process_batch_job(self, batch_job: BatchJob) -> None:
        """
        バッチジョブ処理実行（内部メソッド）
        
        Args:
            batch_job: 処理するバッチジョブ
        """
        try:
            batch_job.status = BatchStatus.RUNNING
            logger.info(f"バッチジョブ処理開始: {batch_job.job_id}")
            
            # セマフォでアイテム並列処理数制限
            semaphore = asyncio.Semaphore(self.max_concurrent_items)
            
            # 全アイテムを並列処理
            tasks = []
            for item in batch_job.items:
                task = asyncio.create_task(
                    self._process_batch_item_with_semaphore(semaphore, batch_job, item)
                )
                tasks.append(task)
            
            # 全タスク完了まで待機（進捗を追跡しながら）
            completed_tasks = 0
            while completed_tasks < len(tasks):
                done, pending = await asyncio.wait(tasks, timeout=1.0, return_when=asyncio.FIRST_COMPLETED)
                
                # 完了したタスクの処理
                for task in done:
                    completed_tasks += 1
                    batch_job.processed_items += 1
                    batch_job.update_progress()
                    
                    try:
                        await task
                    except Exception as e:
                        logger.error(f"アイテム処理エラー: {str(e)}")
                
                # 進捗ログ出力
                if batch_job.processed_items % 10 == 0 or completed_tasks == len(tasks):
                    logger.info(
                        f"バッチ進捗: {batch_job.job_id} - "
                        f"{batch_job.processed_items}/{batch_job.total_items} "
                        f"({batch_job.progress_percentage:.1f}%)"
                    )
                
                # 残りのタスクを更新
                tasks = list(pending)
            
            # 最終結果集計
            batch_job.successful_items = sum(1 for item in batch_job.items if item.status == "completed")
            batch_job.failed_items = sum(1 for item in batch_job.items if item.status == "failed")
            
            # ジョブ完了
            batch_job.status = BatchStatus.COMPLETED
            batch_job.completed_at = datetime.utcnow()
            
            # 統計更新
            self.total_processed_items += batch_job.processed_items
            self.total_successful_items += batch_job.successful_items
            self.total_failed_items += batch_job.failed_items
            
            logger.info(
                f"バッチジョブ完了: {batch_job.job_id} - "
                f"成功: {batch_job.successful_items}, 失敗: {batch_job.failed_items}"
            )
            
        except Exception as e:
            batch_job.status = BatchStatus.FAILED
            batch_job.error_summary = str(e)
            batch_job.completed_at = datetime.utcnow()
            logger.error(f"バッチジョブ処理エラー: {batch_job.job_id} - {str(e)}")
            
        finally:
            # クリーンアップ
            self.active_jobs.pop(batch_job.job_id, None)
            self.job_tasks.pop(batch_job.job_id, None)

    async def _process_batch_item_with_semaphore(
        self,
        semaphore: asyncio.Semaphore,
        batch_job: BatchJob,
        item: BatchItem
    ) -> None:
        """
        セマフォ付きアイテム処理
        
        Args:
            semaphore: 並列制御用セマフォ
            batch_job: バッチジョブ
            item: 処理するアイテム
        """
        async with semaphore:
            await self._process_batch_item(batch_job, item)

    async def _process_batch_item(self, batch_job: BatchJob, item: BatchItem) -> None:
        """
        個別アイテム処理
        
        Args:
            batch_job: バッチジョブ
            item: 処理するアイテム
        """
        start_time = time.time()
        item.started_at = datetime.utcnow()
        
        for attempt in range(item.max_retries + 1):
            try:
                # API呼び出し制限
                await self._respect_rate_limit(item.input_type)
                
                # 実際の処理実行
                result = await self._execute_item_processing(item)
                
                # 成功時の処理
                item.status = "completed"
                item.result = result
                item.completed_at = datetime.utcnow()
                item.processing_time = time.time() - start_time
                
                logger.debug(f"アイテム処理成功: {item.input_value}")
                break
                
            except Exception as e:
                item.retry_count = attempt + 1
                item.error_message = str(e)
                
                # 最大リトライ回数チェック
                if attempt >= item.max_retries:
                    item.status = "failed"
                    item.completed_at = datetime.utcnow()
                    item.processing_time = time.time() - start_time
                    logger.error(f"アイテム処理失敗（最大リトライ到達）: {item.input_value} - {str(e)}")
                    break
                else:
                    # リトライ待機
                    wait_time = self.retry_delay * (2 ** attempt)  # 指数バックオフ
                    await asyncio.sleep(wait_time)
                    logger.warning(f"アイテム処理リトライ: {item.input_value} (試行 {attempt + 2}/{item.max_retries + 1})")

    async def _execute_item_processing(self, item: BatchItem) -> Dict[str, Any]:
        """
        アイテム処理実行（実際のビジネスロジック）
        
        Args:
            item: 処理するアイテム
            
        Returns:
            Dict[str, Any]: 処理結果
            
        Raises:
            EmverzeException: 処理エラー
        """
        try:
            if item.input_type == "asin":
                return await self._process_asin(item.input_value)
            elif item.input_type == "url":
                return await self._process_url(item.input_value)
            elif item.input_type == "keyword":
                return await self._process_keyword(item.input_value)
            else:
                raise EmverzeException(f"サポートされていない入力タイプ: {item.input_type}", "UNSUPPORTED_INPUT_TYPE")
                
        except Exception as e:
            logger.error(f"アイテム処理実行エラー: {item.input_value} - {str(e)}")
            raise

    async def _process_asin(self, asin: str) -> Dict[str, Any]:
        """ASIN処理"""
        # 実際のASIN処理ロジック（Amazon API呼び出し等）
        await asyncio.sleep(0.1)  # API呼び出しシミュレート
        
        return {
            "type": "asin",
            "input_value": asin,
            "product_name": f"商品_{asin}",
            "price": "¥1,980",
            "availability": "在庫あり",
            "description": f"ASIN {asin} の商品情報",
            "images": [f"https://example.com/images/{asin}_1.jpg"],
            "processing_timestamp": datetime.utcnow().isoformat()
        }

    async def _process_url(self, url: str) -> Dict[str, Any]:
        """URL処理"""
        # 実際のURL処理ロジック（スクレイピング等）
        await asyncio.sleep(0.2)  # スクレイピングシミュレート
        
        return {
            "type": "url",
            "input_value": url,
            "product_name": "URLから取得した商品",
            "price": "¥2,480",
            "availability": "在庫あり",
            "description": f"URL {url} から取得した商品情報",
            "source_url": url,
            "processing_timestamp": datetime.utcnow().isoformat()
        }

    async def _process_keyword(self, keyword: str) -> Dict[str, Any]:
        """キーワード処理"""
        # 実際のキーワード検索処理
        await asyncio.sleep(0.15)  # 検索APIシミュレート
        
        return {
            "type": "keyword",
            "input_value": keyword,
            "search_results": [
                {
                    "product_name": f"{keyword}関連商品1",
                    "price": "¥1,580",
                    "asin": "B08EXAMPLE1"
                },
                {
                    "product_name": f"{keyword}関連商品2", 
                    "price": "¥2,180",
                    "asin": "B08EXAMPLE2"
                }
            ],
            "total_results": 2,
            "processing_timestamp": datetime.utcnow().isoformat()
        }

    async def _respect_rate_limit(self, api_type: str) -> None:
        """API レート制限対応"""
        current_time = time.time()
        last_call = self.last_api_call.get(api_type, 0)
        
        time_since_last = current_time - last_call
        if time_since_last < self.min_api_interval:
            wait_time = self.min_api_interval - time_since_last
            await asyncio.sleep(wait_time)
        
        self.last_api_call[api_type] = time.time()

    def _detect_input_type(self, input_value: str) -> str:
        """入力値タイプ自動検出"""
        if not input_value:
            return "unknown"
        
        # ASIN形式チェック
        if re.match(r'^[B][0-9A-Z]{9}$', input_value):
            return "asin"
        
        # URL形式チェック
        if input_value.startswith(('http://', 'https://')):
            return "url"
        
        # その他はキーワード扱い
        return "keyword"

    def _priority_weight(self, priority: ProcessingPriority) -> int:
        """優先度重み取得"""
        weights = {
            ProcessingPriority.CRITICAL: 4,
            ProcessingPriority.HIGH: 3,
            ProcessingPriority.NORMAL: 2,
            ProcessingPriority.LOW: 1
        }
        return weights.get(priority, 2)

    async def get_job_status(self, job_id: str) -> Optional[BatchJob]:
        """
        ジョブステータス取得
        
        Args:
            job_id: ジョブID
            
        Returns:
            Optional[BatchJob]: ジョブ情報（見つからない場合はNone）
        """
        return self.active_jobs.get(job_id)

    async def cancel_job(self, job_id: str) -> bool:
        """
        ジョブキャンセル
        
        Args:
            job_id: キャンセルするジョブID
            
        Returns:
            bool: キャンセル成功の場合True
        """
        try:
            if job_id in self.job_tasks:
                task = self.job_tasks[job_id]
                task.cancel()
                
                if job_id in self.active_jobs:
                    job = self.active_jobs[job_id]
                    job.status = BatchStatus.CANCELLED
                    job.completed_at = datetime.utcnow()
                
                logger.info(f"バッチジョブキャンセル: {job_id}")
                return True
                
        except Exception as e:
            logger.error(f"ジョブキャンセルエラー: {job_id} - {str(e)}")
            
        return False

    async def get_processing_statistics(self) -> Dict[str, Any]:
        """
        処理統計情報取得
        
        Returns:
            Dict[str, Any]: 統計情報
        """
        active_job_count = len(self.active_jobs)
        running_jobs = [job for job in self.active_jobs.values() if job.status == BatchStatus.RUNNING]
        
        return {
            "total_processed_items": self.total_processed_items,
            "total_successful_items": self.total_successful_items,
            "total_failed_items": self.total_failed_items,
            "success_rate": (self.total_successful_items / max(self.total_processed_items, 1)) * 100,
            "active_jobs": active_job_count,
            "running_jobs": len(running_jobs),
            "max_concurrent_jobs": self.max_concurrent_jobs,
            "max_items_per_batch": self.max_items_per_batch,
            "current_jobs": [
                {
                    "job_id": job.job_id,
                    "job_name": job.job_name,
                    "status": job.status.value,
                    "progress": job.progress_percentage,
                    "total_items": job.total_items,
                    "processed_items": job.processed_items,
                    "estimated_completion": job.estimated_completion.isoformat() if job.estimated_completion else None
                }
                for job in self.active_jobs.values()
            ]
        }

# === 使用例 ===

"""
# バッチ処理サービスの使用例

from app.services.kanpeki_asin_batch_processor import KanpekiAsinBatchProcessor

# バッチ処理サービス初期化
batch_processor = KanpekiAsinBatchProcessor(
    session=database_session,
    max_concurrent_jobs=3,
    max_items_per_batch=500,
    max_concurrent_items=15
)

# 処理データ準備
input_data = [
    {"asin": "B08N5WRWNW", "priority": "high"},
    {"url": "https://amazon.co.jp/dp/B09B8RRQT5"},
    {"keyword": "Echo Dot", "priority": "normal"},
    {"asin": "B08KGG8T8S"}
]

# バッチジョブ作成
batch_job = await batch_processor.create_batch_job(
    input_data=input_data,
    user_id="user123",
    job_name="商品情報一括取得_20240301"
)

# バッチジョブ実行
job_id = await batch_processor.submit_batch_job(batch_job)

# 進捗確認
while True:
    job_status = await batch_processor.get_job_status(job_id)
    if job_status and job_status.status in [BatchStatus.COMPLETED, BatchStatus.FAILED]:
        break
    
    print(f"進捗: {job_status.progress_percentage:.1f}%")
    await asyncio.sleep(2)

# 結果確認
final_job = await batch_processor.get_job_status(job_id)
print(f"処理完了: 成功={final_job.successful_items}, 失敗={final_job.failed_items}")

# 統計情報確認
stats = await batch_processor.get_processing_statistics()
print(f"全体成功率: {stats['success_rate']:.1f}%")
"""