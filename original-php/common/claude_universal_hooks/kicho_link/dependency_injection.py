#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
core/dependency_injection.py - 依存性注入基盤（完全版）

✅ エンタープライズレベルDI:
- 型安全な依存性注入
- ライフサイクル管理（Singleton, Transient, Scoped）
- 循環依存検出
- 条件付き登録
- ファクトリーパターン対応

✅ 商用SaaS対応:
- 非同期対応
- マルチテナント対応
- テスト用依存性オーバーライド
- パフォーマンス最適化
- 詳細ログ・監視
"""

import asyncio
import inspect
import threading
import uuid
from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum
from typing import (
    Any, TypeVar, Type, Dict, List, Optional, Callable, 
    Generic, Union, get_type_hints, get_origin, get_args
)
from datetime import datetime
from weakref import WeakValueDictionary

from core.exceptions import (
    ConfigurationException, 
    EmverzeException,
    create_error_context
)
from utils.logger import setup_logger

# ロガー設定
logger = setup_logger()

T = TypeVar('T')
Factory = Callable[..., T]
AsyncFactory = Callable[..., Any]  # Coroutine[Any, Any, T]

class ServiceLifetime(Enum):
    """サービスライフタイム"""
    SINGLETON = "singleton"     # アプリケーション全体で1つのインスタンス
    SCOPED = "scoped"          # スコープ（リクエスト）内で1つのインスタンス
    TRANSIENT = "transient"    # 毎回新しいインスタンス

class RegistrationStrategy(Enum):
    """登録戦略"""
    REPLACE = "replace"        # 既存登録を置き換え
    SKIP = "skip"             # 既存登録をスキップ
    ERROR = "error"           # 既存登録があればエラー

@dataclass
class ServiceRegistration:
    """サービス登録情報"""
    service_type: Type[T]
    implementation_type: Optional[Type[T]] = None
    factory: Optional[Factory[T]] = None
    async_factory: Optional[AsyncFactory[T]] = None
    instance: Optional[T] = None
    lifetime: ServiceLifetime = ServiceLifetime.TRANSIENT
    condition: Optional[Callable[[], bool]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    registered_at: datetime = field(default_factory=datetime.utcnow)
    dependencies: List[Type] = field(default_factory=list)

@dataclass
class ServiceScope:
    """サービススコープ"""
    scope_id: str
    instances: Dict[Type, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None

@dataclass
class DIContainerStats:
    """DIコンテナ統計情報"""
    total_registrations: int = 0
    resolution_count: int = 0
    cache_hits: int = 0
    active_scopes: int = 0
    singleton_count: int = 0
    memory_usage_mb: float = 0.0
    avg_resolution_time_ms: float = 0.0

class CircularDependencyException(ConfigurationException):
    """循環依存エラー"""
    
    def __init__(self, dependency_chain: List[Type]):
        chain_str = " -> ".join([t.__name__ for t in dependency_chain])
        super().__init__(
            f"循環依存が検出されました: {chain_str}",
            details={"dependency_chain": [t.__name__ for t in dependency_chain]}
        )

class ServiceNotRegisteredException(ConfigurationException):
    """サービス未登録エラー"""
    
    def __init__(self, service_type: Type):
        super().__init__(
            f"サービスが登録されていません: {service_type.__name__}",
            details={"service_type": service_type.__name__}
        )

class DIContainer:
    """依存性注入コンテナ（エンタープライズ版）"""
    
    def __init__(self, parent: Optional['DIContainer'] = None):
        """
        Args:
            parent: 親コンテナ（階層化DIコンテナ用）
        """
        self.parent = parent
        self.registrations: Dict[Type, ServiceRegistration] = {}
        self.singletons: Dict[Type, Any] = {}
        self.scopes: Dict[str, ServiceScope] = {}
        self.current_scope: Optional[ServiceScope] = None
        
        # スレッドローカルストレージ
        self.local = threading.local()
        
        # 循環依存検出用
        self.resolution_stack: List[Type] = []
        
        # パフォーマンス監視
        self.resolution_count = 0
        self.cache_hits = 0
        self.resolution_times: List[float] = []
        
        # 弱参照によるインスタンス追跡
        self.instance_tracker: WeakValueDictionary = WeakValueDictionary()
        
        # テスト用オーバーライド
        self.test_overrides: Dict[Type, Any] = {}
        
        logger.info("DIContainer初期化完了", {
            "container_id": id(self),
            "parent_id": id(parent) if parent else None
        })
    
    # ===========================================
    # 📝 サービス登録
    # ===========================================
    
    def register_singleton(
        self,
        service_type: Type[T],
        implementation_type: Optional[Type[T]] = None,
        factory: Optional[Factory[T]] = None,
        instance: Optional[T] = None,
        condition: Optional[Callable[[], bool]] = None,
        **metadata
    ) -> 'DIContainer':
        """シングルトンサービス登録"""
        return self._register_service(
            service_type=service_type,
            implementation_type=implementation_type,
            factory=factory,
            instance=instance,
            lifetime=ServiceLifetime.SINGLETON,
            condition=condition,
            metadata=metadata
        )
    
    def register_scoped(
        self,
        service_type: Type[T],
        implementation_type: Optional[Type[T]] = None,
        factory: Optional[Factory[T]] = None,
        condition: Optional[Callable[[], bool]] = None,
        **metadata
    ) -> 'DIContainer':
        """スコープサービス登録"""
        return self._register_service(
            service_type=service_type,
            implementation_type=implementation_type,
            factory=factory,
            lifetime=ServiceLifetime.SCOPED,
            condition=condition,
            metadata=metadata
        )
    
    def register_transient(
        self,
        service_type: Type[T],
        implementation_type: Optional[Type[T]] = None,
        factory: Optional[Factory[T]] = None,
        condition: Optional[Callable[[], bool]] = None,
        **metadata
    ) -> 'DIContainer':
        """トランジェントサービス登録"""
        return self._register_service(
            service_type=service_type,
            implementation_type=implementation_type,
            factory=factory,
            lifetime=ServiceLifetime.TRANSIENT,
            condition=condition,
            metadata=metadata
        )
    
    def register_async_factory(
        self,
        service_type: Type[T],
        async_factory: AsyncFactory[T],
        lifetime: ServiceLifetime = ServiceLifetime.TRANSIENT,
        condition: Optional[Callable[[], bool]] = None,
        **metadata
    ) -> 'DIContainer':
        """非同期ファクトリ登録"""
        return self._register_service(
            service_type=service_type,
            async_factory=async_factory,
            lifetime=lifetime,
            condition=condition,
            metadata=metadata
        )
    
    def _register_service(
        self,
        service_type: Type[T],
        implementation_type: Optional[Type[T]] = None,
        factory: Optional[Factory[T]] = None,
        async_factory: Optional[AsyncFactory[T]] = None,
        instance: Optional[T] = None,
        lifetime: ServiceLifetime = ServiceLifetime.TRANSIENT,
        condition: Optional[Callable[[], bool]] = None,
        strategy: RegistrationStrategy = RegistrationStrategy.REPLACE,
        metadata: Optional[Dict[str, Any]] = None
    ) -> 'DIContainer':
        """内部サービス登録メソッド"""
        
        # 登録チェック
        if service_type in self.registrations:
            if strategy == RegistrationStrategy.SKIP:
                return self
            elif strategy == RegistrationStrategy.ERROR:
                raise ConfigurationException(
                    f"サービス {service_type.__name__} は既に登録されています"
                )
        
        # バリデーション
        if sum(bool(x) for x in [implementation_type, factory, async_factory, instance]) != 1:
            raise ConfigurationException(
                "implementation_type, factory, async_factory, instance のいずれか1つを指定してください"
            )
        
        # 依存関係分析
        dependencies = self._analyze_dependencies(implementation_type or service_type)
        
        # 登録情報作成
        registration = ServiceRegistration(
            service_type=service_type,
            implementation_type=implementation_type,
            factory=factory,
            async_factory=async_factory,
            instance=instance,
            lifetime=lifetime,
            condition=condition,
            metadata=metadata or {},
            dependencies=dependencies
        )
        
        self.registrations[service_type] = registration
        
        # シングルトンインスタンスがある場合は保存
        if instance is not None and lifetime == ServiceLifetime.SINGLETON:
            self.singletons[service_type] = instance
        
        logger.debug(f"サービス登録完了: {service_type.__name__} ({lifetime.value})")
        
        return self
    
    def _analyze_dependencies(self, implementation_type: Type) -> List[Type]:
        """依存関係分析"""
        try:
            if not hasattr(implementation_type, '__init__'):
                return []
            
            # コンストラクタの型ヒント取得
            type_hints = get_type_hints(implementation_type.__init__)
            
            # 'self'を除外して依存関係を抽出
            dependencies = []
            for param_name, param_type in type_hints.items():
                if param_name == 'return':
                    continue
                
                # Optional型の場合は内部型を取得
                origin = get_origin(param_type)
                if origin is Union:
                    args = get_args(param_type)
                    if len(args) == 2 and type(None) in args:
                        param_type = args[0] if args[1] is type(None) else args[1]
                
                # クラス型のみを依存関係として認識
                if isinstance(param_type, type):
                    dependencies.append(param_type)
            
            return dependencies
            
        except Exception as e:
            logger.warning(f"依存関係分析エラー: {e}")
            return []
    
    # ===========================================
    # 🔧 サービス解決
    # ===========================================
    
    def get(self, service_type: Type[T]) -> T:
        """サービス解決"""
        start_time = datetime.utcnow()
        self.resolution_count += 1
        
        try:
            # テストオーバーライドチェック
            if service_type in self.test_overrides:
                return self.test_overrides[service_type]
            
            # 循環依存チェック
            if service_type in self.resolution_stack:
                chain = self.resolution_stack + [service_type]
                raise CircularDependencyException(chain)
            
            self.resolution_stack.append(service_type)
            
            try:
                result = self._resolve_service(service_type)
                
                # パフォーマンス記録
                resolution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                self.resolution_times.append(resolution_time)
                
                return result
            finally:
                self.resolution_stack.remove(service_type)
                
        except Exception as e:
            logger.error(f"サービス解決エラー: {service_type.__name__}", {
                "error": str(e),
                "resolution_stack": [t.__name__ for t in self.resolution_stack]
            })
            raise
    
    async def get_async(self, service_type: Type[T]) -> T:
        """非同期サービス解決"""
        start_time = datetime.utcnow()
        self.resolution_count += 1
        
        try:
            # テストオーバーライドチェック
            if service_type in self.test_overrides:
                return self.test_overrides[service_type]
            
            # 循環依存チェック
            if service_type in self.resolution_stack:
                chain = self.resolution_stack + [service_type]
                raise CircularDependencyException(chain)
            
            self.resolution_stack.append(service_type)
            
            try:
                result = await self._resolve_service_async(service_type)
                
                # パフォーマンス記録
                resolution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                self.resolution_times.append(resolution_time)
                
                return result
            finally:
                self.resolution_stack.remove(service_type)
                
        except Exception as e:
            logger.error(f"非同期サービス解決エラー: {service_type.__name__}", {
                "error": str(e),
                "resolution_stack": [t.__name__ for t in self.resolution_stack]
            })
            raise
    
    def _resolve_service(self, service_type: Type[T]) -> T:
        """サービス解決（内部）"""
        registration = self._get_registration(service_type)
        
        # 条件チェック
        if registration.condition and not registration.condition():
            raise ConfigurationException(
                f"サービス {service_type.__name__} の登録条件が満たされていません"
            )
        
        # ライフタイム別処理
        if registration.lifetime == ServiceLifetime.SINGLETON:
            return self._resolve_singleton(registration)
        elif registration.lifetime == ServiceLifetime.SCOPED:
            return self._resolve_scoped(registration)
        else:  # TRANSIENT
            return self._resolve_transient(registration)
    
    async def _resolve_service_async(self, service_type: Type[T]) -> T:
        """非同期サービス解決（内部）"""
        registration = self._get_registration(service_type)
        
        # 条件チェック
        if registration.condition and not registration.condition():
            raise ConfigurationException(
                f"サービス {service_type.__name__} の登録条件が満たされていません"
            )
        
        # 非同期ファクトリがある場合
        if registration.async_factory:
            if registration.lifetime == ServiceLifetime.SINGLETON:
                if service_type not in self.singletons:
                    self.singletons[service_type] = await registration.async_factory()
                return self.singletons[service_type]
            elif registration.lifetime == ServiceLifetime.SCOPED:
                scope = self._get_current_scope()
                if service_type not in scope.instances:
                    scope.instances[service_type] = await registration.async_factory()
                return scope.instances[service_type]
            else:  # TRANSIENT
                return await registration.async_factory()
        
        # 通常の解決フォールバック
        return self._resolve_service(service_type)
    
    def _resolve_singleton(self, registration: ServiceRegistration[T]) -> T:
        """シングルトン解決"""
        if registration.service_type in self.singletons:
            self.cache_hits += 1
            return self.singletons[registration.service_type]
        
        instance = self._create_instance(registration)
        self.singletons[registration.service_type] = instance
        self.instance_tracker[id(instance)] = instance
        
        return instance
    
    def _resolve_scoped(self, registration: ServiceRegistration[T]) -> T:
        """スコープ解決"""
        scope = self._get_current_scope()
        
        if registration.service_type in scope.instances:
            self.cache_hits += 1
            return scope.instances[registration.service_type]
        
        instance = self._create_instance(registration)
        scope.instances[registration.service_type] = instance
        
        return instance
    
    def _resolve_transient(self, registration: ServiceRegistration[T]) -> T:
        """トランジェント解決"""
        return self._create_instance(registration)
    
    def _create_instance(self, registration: ServiceRegistration[T]) -> T:
        """インスタンス作成"""
        if registration.instance is not None:
            return registration.instance
        
        if registration.factory is not None:
            return registration.factory()
        
        if registration.implementation_type is not None:
            return self._instantiate_type(registration.implementation_type)
        
        # サービス型自体をインスタンス化
        return self._instantiate_type(registration.service_type)
    
    def _instantiate_type(self, implementation_type: Type[T]) -> T:
        """型インスタンス化（依存性注入付き）"""
        try:
            # コンストラクタパラメータ解決
            if not hasattr(implementation_type, '__init__'):
                return implementation_type()
            
            sig = inspect.signature(implementation_type.__init__)
            type_hints = get_type_hints(implementation_type.__init__)
            
            kwargs = {}
            for param_name, param in sig.parameters.items():
                if param_name == 'self':
                    continue
                
                # 型ヒントから依存関係を解決
                if param_name in type_hints:
                    param_type = type_hints[param_name]
                    
                    # Optional型の処理
                    origin = get_origin(param_type)
                    if origin is Union:
                        args = get_args(param_type)
                        if len(args) == 2 and type(None) in args:
                            param_type = args[0] if args[1] is type(None) else args[1]
                            
                            # オプショナルな依存関係
                            try:
                                kwargs[param_name] = self.get(param_type)
                            except ServiceNotRegisteredException:
                                kwargs[param_name] = None
                            continue
                    
                    # 必須の依存関係
                    if isinstance(param_type, type):
                        kwargs[param_name] = self.get(param_type)
                elif param.default is not param.empty:
                    # デフォルト値がある場合はスキップ
                    continue
                else:
                    raise ConfigurationException(
                        f"型ヒントが見つかりません: {implementation_type.__name__}.{param_name}"
                    )
            
            return implementation_type(**kwargs)
            
        except Exception as e:
            logger.error(f"インスタンス化エラー: {implementation_type.__name__}", {
                "error": str(e)
            })
            raise ConfigurationException(
                f"インスタンス化に失敗しました: {implementation_type.__name__}: {str(e)}"
            )
    
    def _get_registration(self, service_type: Type[T]) -> ServiceRegistration[T]:
        """サービス登録情報取得"""
        # 現在のコンテナで検索
        if service_type in self.registrations:
            return self.registrations[service_type]
        
        # 親コンテナで検索（階層化DI）
        if self.parent:
            return self.parent._get_registration(service_type)
        
        # 見つからない場合
        raise ServiceNotRegisteredException(service_type)
    
    # ===========================================
    # 🔄 スコープ管理
    # ===========================================
    
    def create_scope(
        self, 
        scope_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> ServiceScope:
        """スコープ作成"""
        if scope_id is None:
            scope_id = str(uuid.uuid4())
        
        scope = ServiceScope(
            scope_id=scope_id,
            tenant_id=tenant_id,
            user_id=user_id
        )
        
        self.scopes[scope_id] = scope
        self.current_scope = scope
        
        logger.debug(f"スコープ作成: {scope_id}")
        return scope
    
    def dispose_scope(self, scope_id: str) -> None:
        """スコープ破棄"""
        if scope_id in self.scopes:
            scope = self.scopes[scope_id]
            
            # スコープ内インスタンスのクリーンアップ
            for instance in scope.instances.values():
                if hasattr(instance, 'dispose'):
                    try:
                        instance.dispose()
                    except Exception as e:
                        logger.warning(f"インスタンス破棄エラー: {e}")
            
            del self.scopes[scope_id]
            
            # 現在のスコープが削除された場合
            if self.current_scope and self.current_scope.scope_id == scope_id:
                self.current_scope = None
            
            logger.debug(f"スコープ破棄: {scope_id}")
    
    @asynccontextmanager
    async def scope_context(
        self,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        """スコープコンテキストマネージャー"""
        scope = self.create_scope(tenant_id=tenant_id, user_id=user_id)
        try:
            yield scope
        finally:
            self.dispose_scope(scope.scope_id)
    
    def _get_current_scope(self) -> ServiceScope:
        """現在のスコープ取得"""
        if self.current_scope is None:
            raise ConfigurationException("アクティブなスコープがありません")
        return self.current_scope
    
    # ===========================================
    # 🔍 サービス管理・検索
    # ===========================================
    
    def get_services(self, service_type: Type[T]) -> List[T]:
        """指定した型のすべてのサービス取得"""
        services = []
        
        # 現在のコンテナ
        for reg_type, registration in self.registrations.items():
            if issubclass(reg_type, service_type) or reg_type == service_type:
                try:
                    service = self.get(reg_type)
                    services.append(service)
                except Exception as e:
                    logger.warning(f"サービス取得失敗: {reg_type.__name__}: {e}")
        
        # 親コンテナ
        if self.parent:
            services.extend(self.parent.get_services(service_type))
        
        return services
    
    def is_registered(self, service_type: Type) -> bool:
        """サービス登録状況確認"""
        if service_type in self.registrations:
            return True
        
        if self.parent:
            return self.parent.is_registered(service_type)
        
        return False
    
    def remove(self, service_type: Type) -> bool:
        """サービス登録削除"""
        if service_type in self.registrations:
            del self.registrations[service_type]
            
            # シングルトンインスタンスも削除
            if service_type in self.singletons:
                del self.singletons[service_type]
            
            logger.debug(f"サービス登録削除: {service_type.__name__}")
            return True
        
        return False
    
    def clear(self) -> None:
        """全サービス登録削除"""
        self.registrations.clear()
        self.singletons.clear()
        
        # 全スコープ破棄
        for scope_id in list(self.scopes.keys()):
            self.dispose_scope(scope_id)
        
        self.test_overrides.clear()
        
        logger.info("DIContainer全削除")
    
    # ===========================================
    # 🧪 テスト用機能
    # ===========================================
    
    def create_child_container(self) -> 'DIContainer':
        """子コンテナ作成（テスト用）"""
        return DIContainer(parent=self)
    
    def override_service(self, service_type: Type[T], instance: T) -> None:
        """テスト用サービスオーバーライド"""
        self.test_overrides[service_type] = instance
        logger.debug(f"テストオーバーライド: {service_type.__name__}")
    
    def clear_overrides(self) -> None:
        """テストオーバーライド削除"""
        self.test_overrides.clear()
        logger.debug("テストオーバーライド全削除")
    
    # ===========================================
    # 📊 統計・監視
    # ===========================================
    
    def get_stats(self) -> DIContainerStats:
        """統計情報取得"""
        avg_resolution_time = (
            sum(self.resolution_times) / len(self.resolution_times)
            if self.resolution_times else 0.0
        )
        
        # メモリ使用量概算
        memory_usage = (
            len(self.singletons) * 0.1 +  # シングルトン概算
            len(self.scopes) * 0.05 +     # スコープ概算
            len(self.registrations) * 0.001  # 登録情報概算
        )
        
        return DIContainerStats(
            total_registrations=len(self.registrations),
            resolution_count=self.resolution_count,
            cache_hits=self.cache_hits,
            active_scopes=len(self.scopes),
            singleton_count=len(self.singletons),
            memory_usage_mb=memory_usage,
            avg_resolution_time_ms=avg_resolution_time
        )
    
    def health_check(self) -> Dict[str, Any]:
        """ヘルスチェック"""
        stats = self.get_stats()
        
        # パフォーマンス警告
        warnings = []
        if stats.avg_resolution_time_ms > 100:
            warnings.append("解決時間が長すぎます")
        
        if stats.active_scopes > 1000:
            warnings.append("アクティブスコープが多すぎます")
        
        if stats.memory_usage_mb > 100:
            warnings.append("メモリ使用量が多すぎます")
        
        return {
            "healthy": len(warnings) == 0,
            "warnings": warnings,
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    # ===========================================
    # 🎯 便利メソッド
    # ===========================================
    
    def configure_defaults(self) -> 'DIContainer':
        """デフォルト設定（よく使用されるサービス）"""
        from datetime import datetime
        import logging
        
        # ロガー登録
        self.register_singleton(
            logging.Logger,
            factory=lambda: logging.getLogger("emverze"),
            metadata={"description": "アプリケーションロガー"}
        )
        
        return self


# ===========================================
# 🏭 ファクトリー・ヘルパー
# ===========================================

def create_container() -> DIContainer:
    """標準DIコンテナ作成"""
    return DIContainer().configure_defaults()

def create_test_container() -> DIContainer:
    """テスト用DIコンテナ作成"""
    container = DIContainer()
    # テスト用設定は必要に応じて追加
    return container


# ===========================================
# 🎯 使用例・テンプレート
# ===========================================

if __name__ == "__main__":
    # 使用例
    
    # インターフェース定義
    class IRepository(ABC):
        @abstractmethod
        def get_data(self) -> str:
            pass
    
    class IService(ABC):
        @abstractmethod
        def process_data(self) -> str:
            pass
    
    # 実装クラス
    class DatabaseRepository(IRepository):
        def get_data(self) -> str:
            return "データベースからのデータ"
    
    class BusinessService(IService):
        def __init__(self, repository: IRepository):
            self.repository = repository
        
        def process_data(self) -> str:
            data = self.repository.get_data()
            return f"処理済み: {data}"
    
    # DIコンテナ設定
    container = create_container()
    
    # サービス登録
    container.register_singleton(IRepository, DatabaseRepository)
    container.register_transient(IService, BusinessService)
    
    # サービス使用
    service = container.get(IService)
    result = service.process_data()
    print(result)  # "処理済み: データベースからのデータ"
    
    # 統計確認
    stats = container.get_stats()
    print(f"解決回数: {stats.resolution_count}")
    print(f"キャッシュヒット: {stats.cache_hits}")
    
    # ヘルスチェック
    health = container.health_check()
    print(f"健全性: {health['healthy']}")
