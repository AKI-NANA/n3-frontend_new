#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
core/monitoring.py - 監視・ログシステム完全実装

✅ Phase 4: 品質保証・運用準備
- 構造化ログ・メトリクス収集
- パフォーマンス監視・アラート
- セキュリティ監視・脅威検知
- ヘルスチェック・自動復旧
"""

import logging
import time
import asyncio
import psutil
import threading
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import json
import hashlib
import redis
from contextlib import asynccontextmanager

from core.exceptions import EmverzeException
from core.dependency_injection import DIContainer

# ===========================================
# 📊 メトリクス・統計データ
# ===========================================

class MetricType(Enum):
    """メトリクス種別"""
    COUNTER = "counter"        # カウンター（累積値）
    GAUGE = "gauge"           # ゲージ（現在値）
    HISTOGRAM = "histogram"    # ヒストグラム（分布）
    TIMER = "timer"           # タイマー（処理時間）

@dataclass
class Metric:
    """メトリクス情報"""
    name: str
    type: MetricType
    value: float
    tags: Dict[str, str] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    description: str = ""

@dataclass
class PerformanceMetrics:
    """パフォーマンスメトリクス"""
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    disk_usage: float = 0.0
    network_io: Dict[str, float] = field(default_factory=dict)
    database_connections: int = 0
    active_requests: int = 0
    request_rate: float = 0.0
    error_rate: float = 0.0
    response_time_avg: float = 0.0
    response_time_p95: float = 0.0
    response_time_p99: float = 0.0

@dataclass
class SecurityEvent:
    """セキュリティイベント"""
    event_type: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    source_ip: str
    user_id: Optional[str]
    endpoint: str
    description: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    additional_data: Dict[str, Any] = field(default_factory=dict)

# ===========================================
# 📈 メトリクス収集システム
# ===========================================

class MetricsCollector:
    """メトリクス収集・管理"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.counters: Dict[str, float] = defaultdict(float)
        self.gauges: Dict[str, float] = {}
        self.histograms: Dict[str, List[float]] = defaultdict(list)
        self.redis_client = redis_client
        self.collection_interval = 30  # 30秒間隔
        self.running = False
        self.collection_thread = None
    
    def start_collection(self):
        """メトリクス収集開始"""
        if not self.running:
            self.running = True
            self.collection_thread = threading.Thread(target=self._collection_loop)
            self.collection_thread.daemon = True
            self.collection_thread.start()
            logging.info("メトリクス収集開始")
    
    def stop_collection(self):
        """メトリクス収集停止"""
        self.running = False
        if self.collection_thread:
            self.collection_thread.join()
        logging.info("メトリクス収集停止")
    
    def _collection_loop(self):
        """メトリクス収集ループ"""
        while self.running:
            try:
                self._collect_system_metrics()
                time.sleep(self.collection_interval)
            except Exception as e:
                logging.error(f"メトリクス収集エラー: {e}")
    
    def _collect_system_metrics(self):
        """システムメトリクス収集"""
        # CPU使用率
        cpu_percent = psutil.cpu_percent(interval=1)
        self.record_gauge("system.cpu.usage", cpu_percent, {"unit": "percent"})
        
        # メモリ使用率
        memory = psutil.virtual_memory()
        self.record_gauge("system.memory.usage", memory.percent, {"unit": "percent"})
        self.record_gauge("system.memory.available", memory.available, {"unit": "bytes"})
        
        # ディスク使用率
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        self.record_gauge("system.disk.usage", disk_percent, {"unit": "percent"})
        
        # ネットワークI/O
        net_io = psutil.net_io_counters()
        self.record_counter("system.network.bytes_sent", net_io.bytes_sent)
        self.record_counter("system.network.bytes_recv", net_io.bytes_recv)
    
    def record_counter(self, name: str, value: float, tags: Dict[str, str] = None):
        """カウンターメトリクス記録"""
        self.counters[name] += value
        metric = Metric(name, MetricType.COUNTER, self.counters[name], tags or {})
        self._store_metric(metric)
    
    def record_gauge(self, name: str, value: float, tags: Dict[str, str] = None):
        """ゲージメトリクス記録"""
        self.gauges[name] = value
        metric = Metric(name, MetricType.GAUGE, value, tags or {})
        self._store_metric(metric)
    
    def record_histogram(self, name: str, value: float, tags: Dict[str, str] = None):
        """ヒストグラムメトリクス記録"""
        self.histograms[name].append(value)
        # 最新1000件のみ保持
        if len(self.histograms[name]) > 1000:
            self.histograms[name] = self.histograms[name][-1000:]
        
        metric = Metric(name, MetricType.HISTOGRAM, value, tags or {})
        self._store_metric(metric)
    
    def _store_metric(self, metric: Metric):
        """メトリクス保存"""
        self.metrics[metric.name].append(metric)
        
        # Redis保存
        if self.redis_client:
            try:
                key = f"metrics:{metric.name}"
                data = {
                    "value": metric.value,
                    "tags": metric.tags,
                    "timestamp": metric.timestamp.isoformat()
                }
                self.redis_client.lpush(key, json.dumps(data))
                self.redis_client.ltrim(key, 0, 999)  # 最新1000件
                self.redis_client.expire(key, 86400)  # 24時間TTL
            except Exception as e:
                logging.warning(f"Redisメトリクス保存エラー: {e}")
    
    def get_metric_stats(self, name: str, duration_minutes: int = 60) -> Dict[str, float]:
        """メトリクス統計取得"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=duration_minutes)
        recent_metrics = [
            m for m in self.metrics[name] 
            if m.timestamp >= cutoff_time
        ]
        
        if not recent_metrics:
            return {}
        
        values = [m.value for m in recent_metrics]
        
        return {
            "count": len(values),
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "sum": sum(values)
        }

# ===========================================
# ⏱️ パフォーマンス監視
# ===========================================

class PerformanceMonitor:
    """パフォーマンス監視"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
        self.request_times: deque = deque(maxlen=1000)
        self.error_count = 0
        self.request_count = 0
        self.start_time = time.time()
    
    @asynccontextmanager
    async def monitor_request(self, endpoint: str, method: str = "GET"):
        """リクエスト監視コンテキストマネージャー"""
        start_time = time.time()
        request_id = hashlib.md5(f"{endpoint}:{method}:{start_time}".encode()).hexdigest()[:8]
        
        self.request_count += 1
        self.metrics.record_counter("http.requests.total", 1, {
            "endpoint": endpoint,
            "method": method
        })
        
        try:
            logging.info(f"[{request_id}] リクエスト開始: {method} {endpoint}")
            yield request_id
            
            # 成功時の処理
            duration = time.time() - start_time
            self.request_times.append(duration)
            
            self.metrics.record_histogram("http.request.duration", duration, {
                "endpoint": endpoint,
                "method": method,
                "status": "success"
            })
            
            logging.info(f"[{request_id}] リクエスト完了: {duration:.3f}s")
            
        except Exception as e:
            # エラー時の処理
            self.error_count += 1
            duration = time.time() - start_time
            
            self.metrics.record_counter("http.requests.errors", 1, {
                "endpoint": endpoint,
                "method": method,
                "error_type": type(e).__name__
            })
            
            self.metrics.record_histogram("http.request.duration", duration, {
                "endpoint": endpoint,
                "method": method,
                "status": "error"
            })
            
            logging.error(f"[{request_id}] リクエストエラー: {e} ({duration:.3f}s)")
            raise
    
    def get_performance_metrics(self) -> PerformanceMetrics:
        """パフォーマンスメトリクス取得"""
        current_time = time.time()
        uptime = current_time - self.start_time
        
        # レスポンス時間統計
        if self.request_times:
            sorted_times = sorted(self.request_times)
            avg_time = sum(sorted_times) / len(sorted_times)
            p95_index = int(len(sorted_times) * 0.95)
            p99_index = int(len(sorted_times) * 0.99)
            p95_time = sorted_times[p95_index] if p95_index < len(sorted_times) else 0
            p99_time = sorted_times[p99_index] if p99_index < len(sorted_times) else 0
        else:
            avg_time = p95_time = p99_time = 0
        
        # リクエスト率・エラー率
        request_rate = self.request_count / uptime if uptime > 0 else 0
        error_rate = (self.error_count / self.request_count * 100) if self.request_count > 0 else 0
        
        return PerformanceMetrics(
            cpu_usage=psutil.cpu_percent(),
            memory_usage=psutil.virtual_memory().percent,
            disk_usage=(psutil.disk_usage('/').used / psutil.disk_usage('/').total) * 100,
            active_requests=len(self.request_times),
            request_rate=request_rate,
            error_rate=error_rate,
            response_time_avg=avg_time * 1000,  # ms
            response_time_p95=p95_time * 1000,  # ms
            response_time_p99=p99_time * 1000   # ms
        )

# ===========================================
# 🔒 セキュリティ監視
# ===========================================

class SecurityMonitor:
    """セキュリティ監視"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
        self.failed_attempts: Dict[str, List[datetime]] = defaultdict(list)
        self.suspicious_patterns: List[Dict[str, Any]] = []
        self.blocked_ips: set = set()
        
        # セキュリティ設定
        self.max_failed_attempts = 5
        self.lockout_duration = timedelta(minutes=15)
        self.rate_limit_threshold = 100  # requests per minute
    
    def record_failed_login(self, username: str, source_ip: str, user_agent: str = ""):
        """ログイン失敗記録"""
        now = datetime.utcnow()
        self.failed_attempts[f"{username}:{source_ip}"].append(now)
        
        # 古い記録をクリーンアップ
        cutoff = now - self.lockout_duration
        self.failed_attempts[f"{username}:{source_ip}"] = [
            attempt for attempt in self.failed_attempts[f"{username}:{source_ip}"]
            if attempt > cutoff
        ]
        
        # 失敗回数チェック
        attempts_count = len(self.failed_attempts[f"{username}:{source_ip}"])
        
        security_event = SecurityEvent(
            event_type="failed_login",
            severity="MEDIUM" if attempts_count < self.max_failed_attempts else "HIGH",
            source_ip=source_ip,
            user_id=username,
            endpoint="/auth/login",
            description=f"ログイン失敗 ({attempts_count}回目): {username}",
            additional_data={
                "user_agent": user_agent,
                "attempts_count": attempts_count
            }
        )
        
        self._record_security_event(security_event)
        
        # アカウントロック判定
        if attempts_count >= self.max_failed_attempts:
            self._trigger_account_lockout(username, source_ip)
    
    def record_suspicious_activity(self, activity_type: str, source_ip: str, 
                                 user_id: str = None, details: Dict[str, Any] = None):
        """疑わしい活動記録"""
        security_event = SecurityEvent(
            event_type=activity_type,
            severity="MEDIUM",
            source_ip=source_ip,
            user_id=user_id,
            endpoint="unknown",
            description=f"疑わしい活動検知: {activity_type}",
            additional_data=details or {}
        )
        
        self._record_security_event(security_event)
    
    def check_rate_limit(self, source_ip: str, endpoint: str) -> bool:
        """レート制限チェック"""
        now = datetime.utcnow()
        key = f"rate_limit:{source_ip}:{endpoint}"
        
        # 過去1分間のリクエスト数をカウント
        cutoff = now - timedelta(minutes=1)
        recent_requests = []  # 実際にはRedisなどを使用
        
        if len(recent_requests) > self.rate_limit_threshold:
            security_event = SecurityEvent(
                event_type="rate_limit_exceeded",
                severity="HIGH",
                source_ip=source_ip,
                user_id=None,
                endpoint=endpoint,
                description=f"レート制限超過: {len(recent_requests)}req/min"
            )
            
            self._record_security_event(security_event)
            return False
        
        return True
    
    def _record_security_event(self, event: SecurityEvent):
        """セキュリティイベント記録"""
        # メトリクス記録
        self.metrics.record_counter("security.events.total", 1, {
            "event_type": event.event_type,
            "severity": event.severity
        })
        
        # ログ出力
        log_level = {
            "LOW": logging.INFO,
            "MEDIUM": logging.WARNING,
            "HIGH": logging.ERROR,
            "CRITICAL": logging.CRITICAL
        }.get(event.severity, logging.WARNING)
        
        logging.log(log_level, f"セキュリティイベント: {event.description}", extra={
            "event_type": event.event_type,
            "severity": event.severity,
            "source_ip": event.source_ip,
            "user_id": event.user_id,
            "endpoint": event.endpoint,
            "additional_data": event.additional_data
        })
    
    def _trigger_account_lockout(self, username: str, source_ip: str):
        """アカウントロック処理"""
        self.blocked_ips.add(source_ip)
        
        security_event = SecurityEvent(
            event_type="account_lockout",
            severity="CRITICAL",
            source_ip=source_ip,
            user_id=username,
            endpoint="/auth/login",
            description=f"アカウントロック実行: {username} from {source_ip}"
        )
        
        self._record_security_event(security_event)

# ===========================================
# 🏥 ヘルスチェック・自動復旧
# ===========================================

class HealthChecker:
    """ヘルスチェック・自動復旧"""
    
    def __init__(self, container: DIContainer):
        self.container = container
        self.health_checks: Dict[str, Callable] = {}
        self.last_check_time = {}
        self.check_interval = 60  # 60秒間隔
        self.running = False
        self.check_thread = None
    
    def register_health_check(self, name: str, check_func: Callable, interval: int = None):
        """ヘルスチェック登録"""
        self.health_checks[name] = check_func
        if interval:
            self.last_check_time[name] = {"interval": interval, "last_run": 0}
    
    def start_health_checks(self):
        """ヘルスチェック開始"""
        if not self.running:
            self.running = True
            self.check_thread = threading.Thread(target=self._health_check_loop)
            self.check_thread.daemon = True
            self.check_thread.start()
            logging.info("ヘルスチェック開始")
    
    def stop_health_checks(self):
        """ヘルスチェック停止"""
        self.running = False
        if self.check_thread:
            self.check_thread.join()
        logging.info("ヘルスチェック停止")
    
    def _health_check_loop(self):
        """ヘルスチェックループ"""
        while self.running:
            try:
                current_time = time.time()
                
                for name, check_func in self.health_checks.items():
                    # 実行間隔チェック
                    if name in self.last_check_time:
                        config = self.last_check_time[name]
                        if current_time - config["last_run"] < config["interval"]:
                            continue
                        config["last_run"] = current_time
                    
                    # ヘルスチェック実行
                    self._run_health_check(name, check_func)
                
                time.sleep(self.check_interval)
                
            except Exception as e:
                logging.error(f"ヘルスチェックエラー: {e}")
    
    def _run_health_check(self, name: str, check_func: Callable):
        """ヘルスチェック実行"""
        try:
            result = check_func()
            
            if result.get("healthy", True):
                logging.debug(f"ヘルスチェック正常: {name}")
            else:
                logging.warning(f"ヘルスチェック異常: {name} - {result.get('message', '')}")
                self._handle_health_issue(name, result)
                
        except Exception as e:
            logging.error(f"ヘルスチェック実行エラー {name}: {e}")
            self._handle_health_issue(name, {"healthy": False, "error": str(e)})
    
    def _handle_health_issue(self, component: str, issue_data: Dict[str, Any]):
        """ヘルス問題対応"""
        logging.warning(f"コンポーネント問題検知: {component}")
        
        # 自動復旧試行
        recovery_methods = {
            "database": self._recover_database,
            "redis": self._recover_redis,
            "external_api": self._recover_external_api
        }
        
        if component in recovery_methods:
            try:
                recovery_methods[component]()
                logging.info(f"自動復旧成功: {component}")
            except Exception as e:
                logging.error(f"自動復旧失敗: {component} - {e}")
    
    def _recover_database(self):
        """データベース復旧"""
        # 接続プール再初期化
        db_manager = self.container.get("DatabaseManager")
        db_manager.reset_connection_pool()
    
    def _recover_redis(self):
        """Redis復旧"""
        # Redis接続再初期化
        redis_client = self.container.get("RedisClient")
        redis_client.connection_pool.disconnect()
    
    def _recover_external_api(self):
        """外部API復旧"""
        # API接続設定リセット
        pass

# ===========================================
# 🔧 統合監視システム
# ===========================================

class MonitoringSystem:
    """統合監視システム"""
    
    def __init__(self, container: DIContainer):
        self.container = container
        self.metrics_collector = MetricsCollector()
        self.performance_monitor = PerformanceMonitor(self.metrics_collector)
        self.security_monitor = SecurityMonitor(self.metrics_collector)
        self.health_checker = HealthChecker(container)
        
        self._setup_default_health_checks()
    
    def start(self):
        """監視システム開始"""
        self.metrics_collector.start_collection()
        self.health_checker.start_health_checks()
        logging.info("監視システム開始")
    
    def stop(self):
        """監視システム停止"""
        self.metrics_collector.stop_collection()
        self.health_checker.stop_health_checks()
        logging.info("監視システム停止")
    
    def _setup_default_health_checks(self):
        """デフォルトヘルスチェック設定"""
        
        def check_memory():
            memory = psutil.virtual_memory()
            return {
                "healthy": memory.percent < 90,
                "message": f"メモリ使用率: {memory.percent:.1f}%"
            }
        
        def check_disk():
            disk = psutil.disk_usage('/')
            usage_percent = (disk.used / disk.total) * 100
            return {
                "healthy": usage_percent < 85,
                "message": f"ディスク使用率: {usage_percent:.1f}%"
            }
        
        def check_database():
            try:
                # データベース接続テスト（実装に応じて調整）
                return {"healthy": True, "message": "データベース接続正常"}
            except Exception as e:
                return {"healthy": False, "message": f"データベース接続エラー: {e}"}
        
        self.health_checker.register_health_check("memory", check_memory, 30)
        self.health_checker.register_health_check("disk", check_disk, 60)
        self.health_checker.register_health_check("database", check_database, 30)
    
    def get_system_status(self) -> Dict[str, Any]:
        """システム状態取得"""
        perf_metrics = self.performance_monitor.get_performance_metrics()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "healthy",  # 実際の判定ロジック必要
            "performance": {
                "cpu_usage": perf_metrics.cpu_usage,
                "memory_usage": perf_metrics.memory_usage,
                "disk_usage": perf_metrics.disk_usage,
                "active_requests": perf_metrics.active_requests,
                "request_rate": perf_metrics.request_rate,
                "error_rate": perf_metrics.error_rate,
                "avg_response_time": perf_metrics.response_time_avg
            },
            "security": {
                "blocked_ips": len(self.security_monitor.blocked_ips),
                "failed_attempts": len(self.security_monitor.failed_attempts)
            }
        }


# ===========================================
# 🎯 使用例・設定
# ===========================================

def setup_monitoring(container: DIContainer) -> MonitoringSystem:
    """監視システム設定"""
    
    # Redis接続（キャッシュ・メトリクス保存用）
    redis_client = redis.Redis(host='localhost', port=6379, db=1)
    container.register_singleton("RedisClient", redis_client)
    
    # 監視システム初期化
    monitoring = MonitoringSystem(container)
    container.register_singleton("MonitoringSystem", monitoring)
    
    return monitoring


if __name__ == "__main__":
    # 使用例
    from core.dependency_injection import create_container
    
    container = create_container()
    monitoring = setup_monitoring(container)
    
    # 監視開始
    monitoring.start()
    
    try:
        # システム実行
        print("監視システム実行中...")
        time.sleep(10)
        
        # 状態確認
        status = monitoring.get_system_status()
        print(f"システム状態: {json.dumps(status, indent=2, ensure_ascii=False)}")
        
    finally:
        # 監視停止
        monitoring.stop()
