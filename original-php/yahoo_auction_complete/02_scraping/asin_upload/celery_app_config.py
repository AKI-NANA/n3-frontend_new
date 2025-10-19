"""
app/tasks/celery_app.py - Celeryアプリケーション設定
用途: バックグラウンドタスクの実行基盤
修正対象: タスク設定変更時、Redis設定変更時
"""

import os
from celery import Celery
from celery.schedules import crontab
from kombu import Queue

from app.core.config import get_settings

settings = get_settings()

# === Celery アプリケーション初期化 ===

celery_app = Celery(
    "emverze_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        'app.tasks.asin_processing_tasks',
        'app.tasks.inventory_sync_tasks',
        'app.tasks.listing_update_tasks',
        'app.tasks.cleanup_tasks'
    ]
)

# === Celery 設定 ===

celery_app.conf.update(
    # タスク設定
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Tokyo',
    enable_utc=True,
    
    # 結果設定
    result_expires=3600,  # 1時間後に結果を削除
    result_backend_transport_options={
        'master_name': 'mymaster',
        'visibility_timeout': 3600,
    },
    
    # ワーカー設定
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    worker_disable_rate_limits=False,
    
    # タスクルーティング
    task_routes={
        'app.tasks.asin_processing_tasks.*': {'queue': 'asin_processing'},
        'app.tasks.inventory_sync_tasks.*': {'queue': 'inventory_sync'},
        'app.tasks.listing_update_tasks.*': {'queue': 'listing_update'},
        'app.tasks.cleanup_tasks.*': {'queue': 'cleanup'}
    },
    
    # キュー設定
    task_default_queue='default',
    task_queues=(
        Queue('default'),
        Queue('asin_processing', routing_key='asin_processing'),
        Queue('inventory_sync', routing_key='inventory_sync'),
        Queue('listing_update', routing_key='listing_update'),
        Queue('cleanup', routing_key='cleanup'),
        Queue('high_priority', routing_key='high_priority'),
    ),
    
    # 定期タスク設定
    beat_schedule={
        # 在庫同期（1時間毎）
        'inventory-sync-hourly': {
            'task': 'app.tasks.inventory_sync_tasks.sync_all_inventory',
            'schedule': crontab(minute=0),  # 毎時0分
            'options': {'queue': 'inventory_sync'}
        },
        
        # 出品更新（6時間毎）
        'listing-update-6hourly': {
            'task': 'app.tasks.listing_update_tasks.update_all_listings',
            'schedule': crontab(minute=0, hour='*/6'),  # 6時間毎
            'options': {'queue': 'listing_update'}
        },
        
        # 古いタスク結果削除（日次）
        'cleanup-old-results': {
            'task': 'app.tasks.cleanup_tasks.cleanup_old_task_results',
            'schedule': crontab(hour=2, minute=0),  # 毎日午前2時
            'options': {'queue': 'cleanup'}
        },
        
        # セッション期限切れ削除（日次）
        'cleanup-expired-sessions': {
            'task': 'app.tasks.cleanup_tasks.cleanup_expired_sessions',
            'schedule': crontab(hour=3, minute=0),  # 毎日午前3時
            'options': {'queue': 'cleanup'}
        }
    },
    
    # エラー処理
    task_reject_on_worker_lost=True,
    task_acks_late=True,
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # リトライ設定
    task_default_retry_delay=60,  # 60秒後にリトライ
    task_max_retries=3,
    
    # 監視設定
    worker_enable_remote_control=True,
    worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
)

# === タスク装飾子 ===

def priority_task(priority='normal'):
    """
    優先度付きタスク装飾子
    
    使用例:
    @priority_task('high')
    @celery_app.task
    def urgent_task():
        pass
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            queue = 'high_priority' if priority == 'high' else 'default'
            return func.apply_async(args, kwargs, queue=queue)
        return wrapper
    return decorator

# === 監視・統計関数 ===

def get_task_stats():
    """タスク統計情報取得"""
    inspect = celery_app.control.inspect()
    
    return {
        'active_tasks': inspect.active(),
        'scheduled_tasks': inspect.scheduled(),
        'reserved_tasks': inspect.reserved(),
        'registered_tasks': inspect.registered(),
        'stats': inspect.stats()
    }

def get_queue_length(queue_name='default'):
    """キュー長取得"""
    with celery_app.pool.acquire(block=True) as conn:
        return conn.default_channel.client.llen(queue_name)

# === クリーンアップタスク ===

@celery_app.task(bind=True)
def cleanup_old_task_results(self):
    """古いタスク結果削除"""
    try:
        # 1日以上古い結果を削除
        from datetime import datetime, timedelta
        cutoff_time = datetime.utcnow() - timedelta(days=1)
        
        # Redis から古いキーを削除
        # 実際の実装では Redis クライアントを使用
        
        return {"status": "completed", "cleaned_count": 0}
        
    except Exception as e:
        self.retry(exc=e, countdown=60, max_retries=3)

# === 起動設定 ===

if __name__ == '__main__':
    celery_app.start()

# === 使用例 ===

"""
# Celery ワーカー起動コマンド:

# 基本ワーカー起動
celery -A app.tasks.celery_app worker --loglevel=info

# 特定キューのワーカー起動
celery -A app.tasks.celery_app worker --loglevel=info --queues=asin_processing

# Beat（定期タスク）起動
celery -A app.tasks.celery_app beat --loglevel=info

# 監視ツール起動
celery -A app.tasks.celery_app flower

# タスク実行例:
from app.tasks.asin_processing_tasks import process_single_item_task

# 非同期実行
task_result = process_single_item_task.delay(asin="B08N5WRWNW")

# 結果取得
result = task_result.get()
"""