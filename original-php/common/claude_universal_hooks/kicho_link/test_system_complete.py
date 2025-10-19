#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
tests/test_framework.py - 完全自動テストシステム

✅ Phase 4: 品質保証・運用準備
- pytest + asyncio 完全対応
- Router-Service-Repository 3層テスト
- DI対応テスト環境
- 商用品質保証システム
"""

import pytest
import asyncio
import pytest_asyncio
from typing import AsyncGenerator, Generator
from unittest.mock import Mock, AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient
from datetime import datetime
import uuid

# テスト用インポート
from core.dependency_injection import DIContainer, create_container
from core.database import DatabaseManager, Base
from core.exceptions import EmverzeException, BusinessLogicException
from core.security import SecurityManager
from api.main import app

# ===========================================
# 🔧 テスト基盤・設定
# ===========================================

class TestEnvironment:
    """テスト環境管理"""
    
    def __init__(self):
        self.test_db_url = "sqlite+aiosqlite:///:memory:"
        self.test_engine = None
        self.test_session_factory = None
        self.test_container = None
        
    async def setup(self):
        """テスト環境セットアップ"""
        # テスト用データベースエンジン
        self.test_engine = create_async_engine(
            self.test_db_url,
            echo=False,  # テスト時はSQL出力無効
            pool_pre_ping=True
        )
        
        # テスト用セッションファクトリ
        self.test_session_factory = sessionmaker(
            bind=self.test_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        # テーブル作成
        async with self.test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # テスト用DIコンテナ
        self.test_container = self._create_test_container()
        
    async def teardown(self):
        """テスト環境クリーンアップ"""
        if self.test_engine:
            await self.test_engine.dispose()
    
    def _create_test_container(self) -> DIContainer:
        """テスト用DIコンテナ作成"""
        container = DIContainer()
        
        # テスト用サービス登録
        container.register_singleton(
            SecurityManager,
            SecurityManager()
        )
        
        # モックサービス登録
        mock_notification = AsyncMock()
        container.register_singleton(
            "NotificationService",
            mock_notification
        )
        
        return container
    
    async def get_test_session(self) -> AsyncSession:
        """テスト用セッション取得"""
        async with self.test_session_factory() as session:
            yield session

# グローバルテスト環境
test_env = TestEnvironment()

# ===========================================
# 🔧 Pytest設定・フィクスチャ
# ===========================================

@pytest_asyncio.fixture(scope="session")
async def setup_test_environment():
    """セッション全体でのテスト環境セットアップ"""
    await test_env.setup()
    yield test_env
    await test_env.teardown()

@pytest_asyncio.fixture
async def db_session(setup_test_environment) -> AsyncGenerator[AsyncSession, None]:
    """テスト用データベースセッション"""
    async with test_env.test_session_factory() as session:
        # トランザクション開始
        transaction = await session.begin()
        
        try:
            yield session
        finally:
            # テスト後にロールバック
            await transaction.rollback()

@pytest_asyncio.fixture
async def test_client(setup_test_environment) -> AsyncGenerator[AsyncClient, None]:
    """テスト用HTTPクライアント"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest_asyncio.fixture
def test_container(setup_test_environment) -> DIContainer:
    """テスト用DIコンテナ"""
    # 新しい子コンテナを作成してテスト分離
    child_container = test_env.test_container.create_child_container()
    yield child_container
    child_container.clear_overrides()

@pytest.fixture
def mock_user():
    """テスト用ユーザーデータ"""
    return {
        "id": str(uuid.uuid4()),
        "username": "test_user",
        "email": "test@example.com",
        "is_active": True,
        "roles": ["user"],
        "permissions": ["read", "write"]
    }

# ===========================================
# 🧪 Repository層テスト
# ===========================================

class TestBaseRepository:
    """BaseRepositoryテスト"""
    
    @pytest_asyncio.fixture
    async def repository(self, db_session):
        """テスト用リポジトリ"""
        from repositories.base_repository import BaseRepository
        from models.inventory import InventoryItem
        
        return BaseRepository(InventoryItem, db_session)
    
    async def test_create_entity(self, repository):
        """エンティティ作成テスト"""
        # テストデータ
        test_data = {
            "name": "テスト商品",
            "sku": "TEST-001",
            "quantity": 100,
            "unit_price": 1000
        }
        
        # 作成実行
        result = await repository.create(test_data)
        
        # 検証
        assert result is not None
        assert result.name == "テスト商品"
        assert result.sku == "TEST-001"
        assert result.quantity == 100
    
    async def test_get_entity_by_id(self, repository):
        """ID指定取得テスト"""
        # テストデータ作成
        test_data = {
            "name": "取得テスト商品",
            "sku": "GET-001",
            "quantity": 50,
            "unit_price": 2000
        }
        created = await repository.create(test_data)
        
        # 取得実行
        result = await repository.get_by_id(created.id)
        
        # 検証
        assert result is not None
        assert result.id == created.id
        assert result.name == "取得テスト商品"
    
    async def test_update_entity(self, repository):
        """エンティティ更新テスト"""
        # テストデータ作成
        test_data = {
            "name": "更新前商品",
            "sku": "UPDATE-001",
            "quantity": 30,
            "unit_price": 1500
        }
        created = await repository.create(test_data)
        
        # 更新実行
        update_data = {"name": "更新後商品", "quantity": 25}
        result = await repository.update(created.id, update_data)
        
        # 検証
        assert result.name == "更新後商品"
        assert result.quantity == 25
        assert result.sku == "UPDATE-001"  # 更新されていない項目
    
    async def test_delete_entity(self, repository):
        """エンティティ削除テスト"""
        # テストデータ作成
        test_data = {
            "name": "削除テスト商品",
            "sku": "DELETE-001",
            "quantity": 10,
            "unit_price": 500
        }
        created = await repository.create(test_data)
        
        # 削除実行
        result = await repository.delete(created.id)
        
        # 検証
        assert result is True
        
        # 削除確認
        deleted_item = await repository.get_by_id(created.id)
        assert deleted_item is None
    
    async def test_list_with_filters(self, repository):
        """フィルター付きリスト取得テスト"""
        # テストデータ作成
        test_items = [
            {"name": "商品A", "sku": "A-001", "quantity": 100, "unit_price": 1000},
            {"name": "商品B", "sku": "B-001", "quantity": 50, "unit_price": 2000},
            {"name": "商品C", "sku": "C-001", "quantity": 200, "unit_price": 500}
        ]
        
        for item_data in test_items:
            await repository.create(item_data)
        
        # フィルター実行
        filters = {"quantity__gte": 100}  # quantity >= 100
        result = await repository.list(filters=filters)
        
        # 検証
        assert len(result) == 2  # 商品Aと商品C
        assert all(item.quantity >= 100 for item in result)

# ===========================================
# 🧪 Service層テスト
# ===========================================

class TestInventoryService:
    """InventoryServiceテスト"""
    
    @pytest_asyncio.fixture
    async def service(self, db_session, test_container):
        """テスト用サービス"""
        from services.inventory_service import InventoryService
        from repositories.inventory_repository import InventoryRepository
        
        # リポジトリをコンテナに登録
        repository = InventoryRepository(db_session)
        test_container.override_service(InventoryRepository, repository)
        
        # サービス取得
        service = test_container.get(InventoryService)
        return service
    
    async def test_create_inventory_item(self, service, mock_user):
        """在庫アイテム作成テスト"""
        # ユーザーコンテキスト設定
        service.set_user_context(
            user_id=mock_user["id"],
            roles=mock_user["roles"],
            permissions=mock_user["permissions"]
        )
        
        # テストデータ
        from schemas.inventory import InventoryItemCreate
        test_data = InventoryItemCreate(
            name="サービステスト商品",
            sku="SERVICE-001",
            quantity=75,
            unit_price=1200
        )
        
        # 作成実行
        result = await service.create_inventory_item(test_data)
        
        # 検証
        assert result["name"] == "サービステスト商品"
        assert result["sku"] == "SERVICE-001"
        assert result["quantity"] == 75
        assert "id" in result
    
    async def test_permission_check(self, service):
        """権限チェックテスト"""
        # 権限のないユーザーコンテキスト
        service.set_user_context(
            user_id="unauthorized_user",
            roles=["guest"],
            permissions=["read"]  # writeなし
        )
        
        # テストデータ
        from schemas.inventory import InventoryItemCreate
        test_data = InventoryItemCreate(
            name="権限テスト商品",
            sku="PERM-001",
            quantity=1,
            unit_price=1
        )
        
        # 権限エラーの確認
        with pytest.raises(BusinessLogicException) as exc_info:
            await service.create_inventory_item(test_data)
        
        assert "権限が不足" in str(exc_info.value)
    
    async def test_validation_error(self, service, mock_user):
        """バリデーションエラーテスト"""
        # ユーザーコンテキスト設定
        service.set_user_context(
            user_id=mock_user["id"],
            roles=mock_user["roles"],
            permissions=mock_user["permissions"]
        )
        
        # 無効なテストデータ
        from schemas.inventory import InventoryItemCreate
        invalid_data = InventoryItemCreate(
            name="",  # 空文字（無効）
            sku="INVALID-001",
            quantity=-1,  # 負の値（無効）
            unit_price=0  # ゼロ（無効）
        )
        
        # バリデーションエラーの確認
        with pytest.raises(BusinessLogicException) as exc_info:
            await service.create_inventory_item(invalid_data)
        
        assert "バリデーション" in str(exc_info.value)

# ===========================================
# 🧪 Router層（API）テスト
# ===========================================

class TestInventoryAPI:
    """Inventory APIテスト"""
    
    @pytest_asyncio.fixture
    async def auth_headers(self, test_client, mock_user):
        """認証ヘッダー取得"""
        # ログイン実行
        login_data = {
            "username": mock_user["username"],
            "password": "test_password"
        }
        
        # モックでログイン成功をシミュレート
        with patch('services.auth_service.AuthService.authenticate') as mock_auth:
            mock_auth.return_value = {
                "access_token": "test_token_123",
                "token_type": "bearer"
            }
            
            response = await test_client.post("/api/auth/login", json=login_data)
            
        token = response.json()["data"]["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    async def test_create_inventory_item_api(self, test_client, auth_headers):
        """在庫アイテム作成APIテスト"""
        # テストデータ
        test_data = {
            "name": "APIテスト商品",
            "sku": "API-001",
            "quantity": 88,
            "unit_price": 1800
        }
        
        # API呼び出し
        response = await test_client.post(
            "/api/inventory/items",
            json=test_data,
            headers=auth_headers
        )
        
        # レスポンス検証
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "在庫アイテムを作成しました" in data["message"]
        assert data["data"]["name"] == "APIテスト商品"
        assert "timestamp" in data
    
    async def test_get_inventory_item_api(self, test_client, auth_headers):
        """在庫アイテム取得APIテスト"""
        # 先にアイテム作成
        create_data = {
            "name": "取得APIテスト商品",
            "sku": "GET-API-001",
            "quantity": 45,
            "unit_price": 2200
        }
        
        create_response = await test_client.post(
            "/api/inventory/items",
            json=create_data,
            headers=auth_headers
        )
        
        item_id = create_response.json()["data"]["id"]
        
        # 取得API呼び出し
        response = await test_client.get(
            f"/api/inventory/items/{item_id}",
            headers=auth_headers
        )
        
        # レスポンス検証
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["id"] == item_id
        assert data["data"]["name"] == "取得APIテスト商品"
    
    async def test_unauthorized_access(self, test_client):
        """未認証アクセステスト"""
        # 認証ヘッダーなしでAPI呼び出し
        response = await test_client.get("/api/inventory/items/1")
        
        # 認証エラーの確認
        assert response.status_code == 401
        
        data = response.json()
        assert data["status"] == "error"
        assert "認証" in data["message"]
    
    async def test_api_error_response_format(self, test_client, auth_headers):
        """APIエラーレスポンス形式テスト"""
        # 存在しないアイテムにアクセス
        response = await test_client.get(
            "/api/inventory/items/99999",
            headers=auth_headers
        )
        
        # エラーレスポンス検証
        assert response.status_code == 404
        
        data = response.json()
        # 統一APIレスポンス形式の確認
        assert "status" in data
        assert "message" in data
        assert "data" in data
        assert "timestamp" in data
        assert data["status"] == "error"

# ===========================================
# 🧪 統合テスト
# ===========================================

class TestIntegration:
    """統合テスト"""
    
    async def test_full_crud_workflow(self, test_client, auth_headers):
        """完全なCRUD操作ワークフローテスト"""
        
        # 1. CREATE
        create_data = {
            "name": "統合テスト商品",
            "sku": "INTEGRATION-001",
            "quantity": 100,
            "unit_price": 3000
        }
        
        create_response = await test_client.post(
            "/api/inventory/items",
            json=create_data,
            headers=auth_headers
        )
        
        assert create_response.status_code == 200
        item_id = create_response.json()["data"]["id"]
        
        # 2. READ
        get_response = await test_client.get(
            f"/api/inventory/items/{item_id}",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        assert get_response.json()["data"]["name"] == "統合テスト商品"
        
        # 3. UPDATE
        update_data = {
            "name": "統合テスト商品（更新済み）",
            "quantity": 80
        }
        
        update_response = await test_client.put(
            f"/api/inventory/items/{item_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert update_response.status_code == 200
        assert update_response.json()["data"]["name"] == "統合テスト商品（更新済み）"
        assert update_response.json()["data"]["quantity"] == 80
        
        # 4. DELETE
        delete_response = await test_client.delete(
            f"/api/inventory/items/{item_id}",
            headers=auth_headers
        )
        
        assert delete_response.status_code == 204
        
        # 5. 削除確認
        get_deleted_response = await test_client.get(
            f"/api/inventory/items/{item_id}",
            headers=auth_headers
        )
        
        assert get_deleted_response.status_code == 404

# ===========================================
# 🧪 パフォーマンステスト
# ===========================================

class TestPerformance:
    """パフォーマンステスト"""
    
    async def test_bulk_operations_performance(self, test_client, auth_headers):
        """一括操作パフォーマンステスト"""
        import time
        
        start_time = time.time()
        
        # 100件の一括作成
        tasks = []
        for i in range(100):
            test_data = {
                "name": f"パフォーマンステスト商品_{i}",
                "sku": f"PERF-{i:03d}",
                "quantity": i + 1,
                "unit_price": (i + 1) * 100
            }
            
            tasks.append(
                test_client.post(
                    "/api/inventory/items",
                    json=test_data,
                    headers=auth_headers
                )
            )
        
        # 並行実行
        responses = await asyncio.gather(*tasks)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # パフォーマンス検証
        assert all(r.status_code == 200 for r in responses)
        assert execution_time < 10.0  # 10秒以内
        
        print(f"一括作成100件: {execution_time:.2f}秒")

# ===========================================
# 🔧 テスト実行・レポート
# ===========================================

class TestRunner:
    """テスト実行管理"""
    
    def __init__(self):
        self.test_results = {}
        self.coverage_data = {}
    
    async def run_all_tests(self):
        """全テスト実行"""
        test_suites = [
            "tests/test_repository.py",
            "tests/test_service.py",
            "tests/test_api.py",
            "tests/test_integration.py"
        ]
        
        for suite in test_suites:
            print(f"🧪 テスト実行中: {suite}")
            # pytest実行（実際の実装では subprocess使用）
            result = await self._run_pytest(suite)
            self.test_results[suite] = result
    
    async def _run_pytest(self, test_file: str) -> dict:
        """pytest実行"""
        # 実際の実装では subprocess.run を使用
        return {
            "passed": 0,
            "failed": 0,
            "coverage": 0.0,
            "duration": 0.0
        }
    
    def generate_report(self) -> str:
        """テストレポート生成"""
        total_passed = sum(r["passed"] for r in self.test_results.values())
        total_failed = sum(r["failed"] for r in self.test_results.values())
        
        report = f"""
🧪 テスト実行結果
==================
✅ 成功: {total_passed}件
❌ 失敗: {total_failed}件
📊 成功率: {total_passed/(total_passed+total_failed)*100:.1f}%

📋 詳細結果:
"""
        
        for suite, result in self.test_results.items():
            report += f"  {suite}: {result['passed']}件成功, {result['failed']}件失敗\n"
        
        return report


if __name__ == "__main__":
    # テスト実行例
    print("🧪 Phase 4: 完全自動テストシステム実行")
    
    # pytest設定での実行
    pytest.main([
        "tests/",
        "-v",
        "--asyncio-mode=auto",
        "--cov=program/",
        "--cov-report=html",
        "--cov-report=term-missing",
        "--html=reports/test_report.html"
    ])
