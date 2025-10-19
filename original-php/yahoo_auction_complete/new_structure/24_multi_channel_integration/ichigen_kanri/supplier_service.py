# app/services/supplier_service.py
"""
仕入先管理サービス

このモジュールは仕入先管理に関するビジネスロジックを実装します
- 仕入先のCRUD操作
- 統計データの計算
- 同期処理の管理
- パフォーマンス分析
"""

from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.orm import selectinload
import asyncio
import logging

from app.domain.models.supplier import Supplier
from app.domain.models.product import Product
from app.domain.schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    SupplierStats,
    ChannelStats,
    RecentActivity,
    SupplierPerformance,
    SyncStatus,
    ActivityType
)
from app.infrastructure.repositories.supplier_repository import SupplierRepository
from app.infrastructure.repositories.product_repository import ProductRepository
from app.infrastructure.external.marketplace_factory import MarketplaceFactory
from app.core.exceptions import ValidationException, ResourceNotFoundException

logger = logging.getLogger(__name__)

class SupplierService:
    """仕入先管理サービス"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.supplier_repository = SupplierRepository(db)
        self.product_repository = ProductRepository(db)
        self.marketplace_factory = MarketplaceFactory()

    # ===== CRUD操作 =====

    async def get_suppliers(
        self,
        page: int = 1,
        per_page: int = 50,
        channel: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "name",
        sort_desc: bool = False
    ) -> Tuple[List[SupplierResponse], int]:
        """仕入先一覧を取得"""
        try:
            # フィルター条件を構築
            filters = {}
            if channel:
                filters["channel"] = channel
            if status:
                filters["status"] = status

            # ソート条件
            sort_column = getattr(Supplier, sort_by, Supplier.name)
            order = desc(sort_column) if sort_desc else asc(sort_column)

            # クエリ実行
            skip = (page - 1) * per_page
            suppliers, total = await self.supplier_repository.get_with_filters_and_search(
                filters=filters,
                search=search,
                skip=skip,
                limit=per_page,
                order_by=order
            )

            # レスポンス形式に変換
            supplier_responses = []
            for supplier in suppliers:
                supplier_data = SupplierResponse.from_orm(supplier)
                supplier_responses.append(supplier_data)

            return supplier_responses, total

        except Exception as e:
            logger.error(f"仕入先一覧取得エラー: {str(e)}")
            raise

    async def get_supplier_by_id(self, supplier_id: int) -> Optional[SupplierResponse]:
        """IDで仕入先を取得"""
        try:
            supplier = await self.supplier_repository.get_by_id(supplier_id)
            if not supplier:
                return None

            return SupplierResponse.from_orm(supplier)

        except Exception as e:
            logger.error(f"仕入先詳細取得エラー: {str(e)}")
            raise

    async def create_supplier(self, supplier_data: SupplierCreate) -> SupplierResponse:
        """新規仕入先を作成"""
        try:
            # 重複チェック
            existing = await self.supplier_repository.get_by_name_and_channel(
                supplier_data.name, supplier_data.channel
            )
            if existing:
                raise ValidationException("同じ名前と販路の仕入先が既に存在します")

            # 仕入先コード生成
            code = await self._generate_supplier_code(supplier_data.channel)

            # 新規仕入先作成
            supplier = Supplier(
                name=supplier_data.name,
                code=code,
                channel=supplier_data.channel,
                url=str(supplier_data.url) if supplier_data.url else None,
                automation_enabled=supplier_data.automation_enabled,
                notes=supplier_data.notes,
                status="active",
                products_count=0,
                monthly_amount=0.0
            )

            created_supplier = await self.supplier_repository.create(supplier)
            
            # 活動履歴を記録
            await self._record_activity(
                activity_type=ActivityType.SUPPLIER_ADDED,
                title=f"新規仕入先追加: {supplier_data.name}",
                description=f"{supplier_data.channel} の新規仕入先が追加されました",
                supplier_id=created_supplier.id
            )

            return SupplierResponse.from_orm(created_supplier)

        except ValidationException:
            raise
        except Exception as e:
            logger.error(f"仕入先作成エラー: {str(e)}")
            raise

    async def update_supplier(
        self, 
        supplier_id: int, 
        supplier_data: SupplierUpdate
    ) -> Optional[SupplierResponse]:
        """仕入先を更新"""
        try:
            # 既存仕入先取得
            supplier = await self.supplier_repository.get_by_id(supplier_id)
            if not supplier:
                return None

            # 更新データを適用
            update_dict = supplier_data.dict(exclude_unset=True)
            
            # URLを文字列に変換
            if "url" in update_dict and update_dict["url"]:
                update_dict["url"] = str(update_dict["url"])

            # 重複チェック（名前と販路の組み合わせ）
            if "name" in update_dict or "channel" in update_dict:
                new_name = update_dict.get("name", supplier.name)
                new_channel = update_dict.get("channel", supplier.channel)
                
                existing = await self.supplier_repository.get_by_name_and_channel(
                    new_name, new_channel
                )
                if existing and existing.id != supplier_id:
                    raise ValidationException("同じ名前と販路の仕入先が既に存在します")

            # 更新実行
            updated_supplier = await self.supplier_repository.update(supplier_id, update_dict)

            # 活動履歴を記録
            await self._record_activity(
                activity_type=ActivityType.SUPPLIER_UPDATED,
                title=f"仕入先更新: {updated_supplier.name}",
                description="仕入先情報が更新されました",
                supplier_id=supplier_id
            )

            return SupplierResponse.from_orm(updated_supplier)

        except ValidationException:
            raise
        except Exception as e:
            logger.error(f"仕入先更新エラー: {str(e)}")
            raise

    async def delete_supplier(self, supplier_id: int) -> bool:
        """仕入先を削除"""
        try:
            # 既存仕入先取得
            supplier = await self.supplier_repository.get_by_id(supplier_id)
            if not supplier:
                return False

            # 関連商品があるかチェック
            product_count = await self.product_repository.count_by_supplier(supplier_id)
            if product_count > 0:
                raise ValidationException("商品が登録されている仕入先は削除できません")

            # 削除実行
            success = await self.supplier_repository.delete(supplier_id)

            if success:
                # 活動履歴を記録
                await self._record_activity(
                    activity_type=ActivityType.SUPPLIER_DELETED,
                    title=f"仕入先削除: {supplier.name}",
                    description="仕入先が削除されました",
                    supplier_id=supplier_id
                )

            return success

        except ValidationException:
            raise
        except Exception as e:
            logger.error(f"仕入先削除エラー: {str(e)}")
            raise

    # ===== 統計データ取得 =====

    async def get_dashboard_stats(self) -> SupplierStats:
        """ダッシュボード統計を取得"""
        try:
            # 現在の統計
            total_suppliers = await self.supplier_repository.count_all()
            active_suppliers = await self.supplier_repository.count_by_status("active")
            
            # 今月の仕入額
            now = datetime.now()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            monthly_purchase = await self.supplier_repository.get_monthly_amount(month_start)
            
            # 自動化率
            automation_count = await self.supplier_repository.count_automated()
            automation_rate = (automation_count / total_suppliers * 100) if total_suppliers > 0 else 0

            # 前月比計算
            prev_month = (month_start - timedelta(days=1)).replace(day=1)
            prev_month_stats = await self._get_previous_month_stats(prev_month)

            changes = {
                "total_suppliers": total_suppliers - prev_month_stats["total_suppliers"],
                "active_suppliers": active_suppliers - prev_month_stats["active_suppliers"],
                "monthly_purchase": self._calculate_percentage_change(
                    monthly_purchase, prev_month_stats["monthly_purchase"]
                ),
                "automation_rate": automation_rate - prev_month_stats["automation_rate"]
            }

            return SupplierStats(
                total_suppliers=total_suppliers,
                active_suppliers=active_suppliers,
                monthly_purchase=monthly_purchase,
                automation_rate=round(automation_rate, 1),
                changes=changes
            )

        except Exception as e:
            logger.error(f"統計データ取得エラー: {str(e)}")
            raise

    async def get_channel_stats(self) -> List[ChannelStats]:
        """販路別統計を取得"""
        try:
            channels_data = [
                {
                    "name": "Amazon",
                    "code": "amazon",
                    "icon": "fab fa-amazon",
                    "status": "connected"
                },
                {
                    "name": "楽天市場", 
                    "code": "rakuten",
                    "icon": "fas fa-shopping-cart",
                    "status": "connected"
                },
                {
                    "name": "ヤフオク",
                    "code": "yahoo", 
                    "icon": "fas fa-gavel",
                    "status": "connected"
                },
                {
                    "name": "メルカリ",
                    "code": "mercari",
                    "icon": "fas fa-mobile-alt", 
                    "status": "connected"
                },
                {
                    "name": "その他",
                    "code": "others",
                    "icon": "fas fa-ellipsis-h",
                    "status": "connected"
                }
            ]

            channel_stats = []
            for channel_data in channels_data:
                # 販路別統計を取得
                stats = await self.supplier_repository.get_channel_stats(channel_data["code"])
                
                channel_stats.append(ChannelStats(
                    name=channel_data["name"],
                    code=channel_data["code"],
                    icon=channel_data["icon"],
                    status=channel_data["status"],
                    suppliers_count=stats.get("suppliers_count", 0),
                    monthly_amount=stats.get("monthly_amount", 0.0),
                    automation_rate=stats.get("automation_rate", 0.0)
                ))

            return channel_stats

        except Exception as e:
            logger.error(f"販路統計取得エラー: {str(e)}")
            raise

    async def get_recent_activities(self, limit: int = 10) -> List[RecentActivity]:
        """最近の活動履歴を取得"""
        try:
            activities = await self.supplier_repository.get_recent_activities(limit)
            
            activity_responses = []
            for activity in activities:
                activity_responses.append(RecentActivity(
                    id=activity.id,
                    type=activity.type,
                    title=activity.title,
                    description=activity.description,
                    supplier_id=activity.supplier_id,
                    supplier_name=activity.supplier_name,
                    icon=activity.icon,
                    icon_type=activity.icon_type,
                    timestamp=activity.timestamp
                ))

            return activity_responses

        except Exception as e:
            logger.error(f"活動履歴取得エラー: {str(e)}")
            raise

    # ===== 同期関連 =====

    async def sync_supplier(self, supplier_id: int) -> bool:
        """指定した仕入先を同期"""
        try:
            supplier = await self.supplier_repository.get_by_id(supplier_id)
            if not supplier:
                raise ResourceNotFoundException("仕入先が見つかりません")

            # マーケットプレイスコネクタを取得
            connector = self.marketplace_factory.get_connector(supplier.channel)

            try:
                # 同期処理実行
                sync_result = await connector.sync_supplier_data(supplier.id)
                
                # 同期結果を記録
                await self.supplier_repository.update(supplier_id, {
                    "last_sync": datetime.now(),
                    "status": "active",
                    "error_message": None
                })

                # 活動履歴を記録
                await self._record_activity(
                    activity_type=ActivityType.SYNC_SUCCESS,
                    title=f"{supplier.name} - 同期完了",
                    description=f"{sync_result.get('processed_items', 0)}件のデータが更新されました",
                    supplier_id=supplier_id
                )

                return True

            except Exception as sync_error:
                # 同期エラーを記録
                await self.supplier_repository.update(supplier_id, {
                    "last_sync": datetime.now(),
                    "status": "error", 
                    "error_message": str(sync_error)
                })

                # エラー活動履歴を記録
                await self._record_activity(
                    activity_type=ActivityType.SYNC_ERROR,
                    title=f"{supplier.name} - 同期エラー",
                    description=f"同期処理でエラーが発生しました: {str(sync_error)[:100]}",
                    supplier_id=supplier_id
                )

                return False

        except ResourceNotFoundException:
            raise
        except Exception as e:
            logger.error(f"仕入先同期エラー: {str(e)}")
            raise

    async def sync_all_suppliers(self) -> Dict[str, int]:
        """全仕入先を同期"""
        try:
            # アクティブな仕入先を取得
            active_suppliers = await self.supplier_repository.get_active_suppliers()
            
            results = {
                "total": len(active_suppliers),
                "success": 0,
                "failed": 0
            }

            # 並行処理で同期実行（最大5つまで）
            semaphore = asyncio.Semaphore(5)
            
            async def sync_with_semaphore(supplier):
                async with semaphore:
                    success = await self.sync_supplier(supplier.id)
                    if success:
                        results["success"] += 1
                    else:
                        results["failed"] += 1

            # 並行実行
            tasks = [sync_with_semaphore(supplier) for supplier in active_suppliers]
            await asyncio.gather(*tasks, return_exceptions=True)

            return results

        except Exception as e:
            logger.error(f"一括同期エラー: {str(e)}")
            raise

    async def get_sync_status(self, supplier_id: int) -> Optional[SyncStatus]:
        """仕入先の同期状態を取得"""
        try:
            supplier = await self.supplier_repository.get_by_id(supplier_id)
            if not supplier:
                return None

            # 同期統計を取得
            sync_stats = await self.supplier_repository.get_sync_statistics(supplier_id)

            return SyncStatus(
                supplier_id=supplier_id,
                is_syncing=False,  # 実際の実装では同期中フラグを管理
                last_sync=supplier.last_sync,
                last_success=sync_stats.get("last_success"),
                last_error=sync_stats.get("last_error"),
                error_message=supplier.error_message,
                sync_count=sync_stats.get("sync_count", 0),
                success_count=sync_stats.get("success_count", 0),
                error_count=sync_stats.get("error_count", 0)
            )

        except Exception as e:
            logger.error(f"同期状態取得エラー: {str(e)}")
            raise

    # ===== その他のメソッド =====

    async def toggle_automation(self, supplier_id: int) -> Optional[SupplierResponse]:
        """自動化設定を切り替え"""
        try:
            supplier = await self.supplier_repository.get_by_id(supplier_id)
            if not supplier:
                return None

            new_automation_state = not supplier.automation_enabled
            
            updated_supplier = await self.supplier_repository.update(supplier_id, {
                "automation_enabled": new_automation_state
            })

            # 活動履歴を記録
            activity_type = ActivityType.AUTOMATION_ENABLED if new_automation_state else ActivityType.AUTOMATION_DISABLED
            await self._record_activity(
                activity_type=activity_type,
                title=f"{supplier.name} - 自動化{'有効' if new_automation_state else '無効'}",
                description=f"自動化設定が{'有効' if new_automation_state else '無効'}になりました",
                supplier_id=supplier_id
            )

            return SupplierResponse.from_orm(updated_supplier)

        except Exception as e:
            logger.error(f"自動化設定エラー: {str(e)}")
            raise

    async def get_supplier_products(
        self, 
        supplier_id: int, 
        page: int = 1, 
        per_page: int = 20
    ) -> Tuple[List[Any], int]:
        """仕入先の商品一覧を取得"""
        try:
            skip = (page - 1) * per_page
            products, total = await self.product_repository.get_by_supplier(
                supplier_id=supplier_id,
                skip=skip,
                limit=per_page
            )

            return products, total

        except Exception as e:
            logger.error(f"仕入先商品取得エラー: {str(e)}")
            raise

    async def get_supplier_performance(
        self, 
        supplier_id: int, 
        period_days: int = 30
    ) -> Optional[SupplierPerformance]:
        """仕入先のパフォーマンス指標を取得"""
        try:
            supplier = await self.supplier_repository.get_by_id(supplier_id)
            if not supplier:
                return None

            end_date = datetime.now()
            start_date = end_date - timedelta(days=period_days)

            # パフォーマンス統計を取得
            performance_stats = await self.supplier_repository.get_performance_stats(
                supplier_id=supplier_id,
                start_date=start_date,
                end_date=end_date
            )

            return SupplierPerformance(
                supplier_id=supplier_id,
                period_start=start_date,
                period_end=end_date,
                **performance_stats
            )

        except Exception as e:
            logger.error(f"パフォーマンス取得エラー: {str(e)}")
            raise

    async def search_suppliers(self, query: str, limit: int = 10) -> List[SupplierResponse]:
        """仕入先の高速検索"""
        try:
            suppliers = await self.supplier_repository.search(query=query, limit=limit)
            
            return [SupplierResponse.from_orm(supplier) for supplier in suppliers]

        except Exception as e:
            logger.error(f"仕入先検索エラー: {str(e)}")
            raise

    async def bulk_update_suppliers(
        self, 
        supplier_ids: List[int], 
        update_data: Dict[str, Any]
    ) -> int:
        """仕入先の一括更新"""
        try:
            # URLを文字列に変換
            if "url" in update_data and update_data["url"]:
                update_data["url"] = str(update_data["url"])

            updated_count = await self.supplier_repository.bulk_update(
                supplier_ids=supplier_ids,
                update_data=update_data
            )

            # 活動履歴を記録
            await self._record_activity(
                activity_type=ActivityType.SUPPLIER_UPDATED,
                title=f"仕入先一括更新",
                description=f"{updated_count}件の仕入先が一括更新されました"
            )

            return updated_count

        except Exception as e:
            logger.error(f"一括更新エラー: {str(e)}")
            raise

    # ===== プライベートメソッド =====

    async def _generate_supplier_code(self, channel: str) -> str:
        """仕入先コードを生成"""
        channel_prefix = {
            "amazon": "AMZ",
            "rakuten": "RAK", 
            "yahoo": "YAH",
            "mercari": "MER",
            "others": "OTH"
        }.get(channel, "SUP")

        # 既存の最大番号を取得
        max_number = await self.supplier_repository.get_max_code_number(channel_prefix)
        next_number = max_number + 1

        return f"SUP-{channel_prefix}-{next_number:03d}"

    async def _record_activity(
        self,
        activity_type: ActivityType,
        title: str,
        description: str,
        supplier_id: Optional[int] = None
    ):
        """活動履歴を記録"""
        try:
            # 活動アイコンとタイプを決定
            icon_mapping = {
                ActivityType.SYNC_SUCCESS: ("fas fa-sync", "success"),
                ActivityType.SYNC_ERROR: ("fas fa-exclamation-triangle", "warning"),
                ActivityType.SUPPLIER_ADDED: ("fas fa-plus", "info"),
                ActivityType.SUPPLIER_UPDATED: ("fas fa-edit", "info"),
                ActivityType.SUPPLIER_DELETED: ("fas fa-trash", "error"),
                ActivityType.AUTOMATION_ENABLED: ("fas fa-robot", "success"),
                ActivityType.AUTOMATION_DISABLED: ("fas fa-robot", "warning")
            }

            icon, icon_type = icon_mapping.get(activity_type, ("fas fa-info", "info"))

            await self.supplier_repository.create_activity(
                activity_type=activity_type,
                title=title,
                description=description,
                supplier_id=supplier_id,
                icon=icon,
                icon_type=icon_type
            )

        except Exception as e:
            logger.error(f"活動履歴記録エラー: {str(e)}")
            # 活動履歴の記録エラーは処理を止めない

    async def _get_previous_month_stats(self, prev_month: datetime) -> Dict[str, Any]:
        """前月統計を取得"""
        try:
            return await self.supplier_repository.get_historical_stats(prev_month)
        except Exception:
            # エラー時はデフォルト値を返す
            return {
                "total_suppliers": 0,
                "active_suppliers": 0,
                "monthly_purchase": 0.0,
                "automation_rate": 0.0
            }

    def _calculate_percentage_change(self, current: float, previous: float) -> float:
        """パーセンテージ変化を計算"""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        
        return round(((current - previous) / previous) * 100, 1)