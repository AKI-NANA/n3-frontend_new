# app/infrastructure/repositories/supplier_repository.py
"""
仕入先リポジトリ実装

このモジュールは仕入先データのデータベースアクセスを担当します
- 仕入先のCRUD操作
- 検索・フィルタリング
- 統計データ取得
- パフォーマンス指標計算
"""

from typing import List, Optional, Tuple, Dict, Any, Union
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_, or_, desc, asc, text, case, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
import logging

from app.domain.models.supplier import (
    Supplier, 
    SupplierActivity, 
    SupplierSyncHistory, 
    SupplierPerformanceMetrics,
    SupplierConfiguration,
    ActivityType
)
from app.infrastructure.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)

class SupplierRepository(BaseRepository[Supplier]):
    """仕入先リポジトリ実装"""

    def __init__(self, session: AsyncSession):
        """初期化"""
        super().__init__(session, Supplier)

    # ===== 基本CRUD操作 =====

    async def get_by_id_with_relations(self, supplier_id: int) -> Optional[Supplier]:
        """IDで仕入先をリレーション込みで取得"""
        try:
            query = select(Supplier).options(
                selectinload(Supplier.activities),
                selectinload(Supplier.sync_histories),
                selectinload(Supplier.products)
            ).where(Supplier.id == supplier_id)
            
            result = await self.session.execute(query)
            return result.scalars().first()
        except Exception as e:
            logger.error(f"仕入先詳細取得エラー: {str(e)}")
            raise

    async def get_by_name_and_channel(self, name: str, channel: str) -> Optional[Supplier]:
        """名前と販路で仕入先を取得"""
        try:
            query = select(Supplier).where(
                and_(
                    Supplier.name == name,
                    Supplier.channel == channel
                )
            )
            result = await self.session.execute(query)
            return result.scalars().first()
        except Exception as e:
            logger.error(f"仕入先名前・販路検索エラー: {str(e)}")
            raise

    async def get_by_code(self, code: str) -> Optional[Supplier]:
        """コードで仕入先を取得"""
        try:
            query = select(Supplier).where(Supplier.code == code)
            result = await self.session.execute(query)
            return result.scalars().first()
        except Exception as e:
            logger.error(f"仕入先コード検索エラー: {str(e)}")
            raise

    # ===== 検索・フィルタリング =====

    async def get_with_filters_and_search(
        self,
        filters: Optional[Dict[str, Any]] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        order_by = None
    ) -> Tuple[List[Supplier], int]:
        """フィルタと検索条件で仕入先を取得"""
        try:
            # ベースクエリ
            query = select(Supplier)
            count_query = select(func.count()).select_from(Supplier)
            
            # フィルタ条件を構築
            conditions = []
            
            if filters:
                if "channel" in filters:
                    conditions.append(Supplier.channel == filters["channel"])
                if "status" in filters:
                    conditions.append(Supplier.status == filters["status"])
                if "automation_enabled" in filters:
                    conditions.append(Supplier.automation_enabled == filters["automation_enabled"])
                if "has_products" in filters:
                    if filters["has_products"]:
                        conditions.append(Supplier.products_count > 0)
                    else:
                        conditions.append(Supplier.products_count == 0)
                if "min_amount" in filters:
                    conditions.append(Supplier.monthly_amount >= filters["min_amount"])
                if "max_amount" in filters:
                    conditions.append(Supplier.monthly_amount <= filters["max_amount"])
                if "created_after" in filters:
                    conditions.append(Supplier.created_at >= filters["created_after"])
                if "created_before" in filters:
                    conditions.append(Supplier.created_at <= filters["created_before"])

            # 検索条件
            if search:
                search_pattern = f"%{search}%"
                search_conditions = [
                    Supplier.name.ilike(search_pattern),
                    Supplier.code.ilike(search_pattern),
                    Supplier.notes.ilike(search_pattern),
                    Supplier.url.ilike(search_pattern)
                ]
                conditions.append(or_(*search_conditions))

            # 条件を適用
            if conditions:
                where_clause = and_(*conditions)
                query = query.where(where_clause)
                count_query = count_query.where(where_clause)

            # ソート
            if order_by is not None:
                query = query.order_by(order_by)
            else:
                query = query.order_by(desc(Supplier.created_at))

            # ページネーション
            query = query.offset(skip).limit(limit)

            # 実行
            result = await self.session.execute(query)
            suppliers = result.scalars().all()

            count_result = await self.session.execute(count_query)
            total = count_result.scalar()

            return suppliers, total

        except Exception as e:
            logger.error(f"仕入先フィルタ検索エラー: {str(e)}")
            raise

    async def search(self, query: str, limit: int = 10) -> List[Supplier]:
        """高速検索"""
        try:
            search_pattern = f"%{query}%"
            
            sql_query = select(Supplier).where(
                or_(
                    Supplier.name.ilike(search_pattern),
                    Supplier.code.ilike(search_pattern)
                )
            ).order_by(
                # 名前の完全一致を優先
                case(
                    (Supplier.name.ilike(query), 1),
                    (Supplier.code.ilike(query), 2),
                    else_=3
                )
            ).limit(limit)

            result = await self.session.execute(sql_query)
            return result.scalars().all()

        except Exception as e:
            logger.error(f"仕入先高速検索エラー: {str(e)}")
            raise

    # ===== 統計データ取得 =====

    async def count_all(self) -> int:
        """全仕入先数を取得"""
        try:
            query = select(func.count()).select_from(Supplier)
            result = await self.session.execute(query)
            return result.scalar()
        except Exception as e:
            logger.error(f"全仕入先数取得エラー: {str(e)}")
            raise

    async def count_by_status(self, status: str) -> int:
        """ステータス別仕入先数を取得"""
        try:
            query = select(func.count()).select_from(Supplier).where(Supplier.status == status)
            result = await self.session.execute(query)
            return result.scalar()
        except Exception as e:
            logger.error(f"ステータス別仕入先数取得エラー: {str(e)}")
            raise

    async def count_automated(self) -> int:
        """自動化有効仕入先数を取得"""
        try:
            query = select(func.count()).select_from(Supplier).where(Supplier.automation_enabled == True)
            result = await self.session.execute(query)
            return result.scalar()
        except Exception as e:
            logger.error(f"自動化仕入先数取得エラー: {str(e)}")
            raise

    async def get_monthly_amount(self, month_start: datetime) -> float:
        """指定月の総仕入額を取得"""
        try:
            month_end = month_start.replace(day=28) + timedelta(days=4)
            month_end = month_end - timedelta(days=month_end.day)
            
            query = select(func.sum(Supplier.monthly_amount)).select_from(Supplier).where(
                and_(
                    Supplier.created_at >= month_start,
                    Supplier.created_at <= month_end
                )
            )
            result = await self.session.execute(query)
            return result.scalar() or 0.0
        except Exception as e:
            logger.error(f"月間仕入額取得エラー: {str(e)}")
            raise

    async def get_channel_stats(self, channel: str) -> Dict[str, Any]:
        """販路別統計を取得"""
        try:
            # 基本統計
            stats_query = select(
                func.count().label('suppliers_count'),
                func.sum(Supplier.monthly_amount).label('monthly_amount'),
                func.avg(
                    case(
                        (Supplier.automation_enabled == True, 1.0),
                        else_=0.0
                    )
                ).label('automation_rate')
            ).select_from(Supplier).where(Supplier.channel == channel)

            result = await self.session.execute(stats_query)
            stats = result.first()

            return {
                'suppliers_count': stats.suppliers_count or 0,
                'monthly_amount': stats.monthly_amount or 0.0,
                'automation_rate': round((stats.automation_rate or 0.0) * 100, 1)
            }

        except Exception as e:
            logger.error(f"販路統計取得エラー: {str(e)}")
            raise

    async def get_historical_stats(self, target_month: datetime) -> Dict[str, Any]:
        """過去統計を取得"""
        try:
            month_end = target_month.replace(day=28) + timedelta(days=4)
            month_end = month_end - timedelta(days=month_end.day)

            # 指定月時点での統計（簡略化）
            stats = {
                'total_suppliers': await self.count_all(),
                'active_suppliers': await self.count_by_status('active'),
                'monthly_purchase': await self.get_monthly_amount(target_month),
                'automation_rate': 0.0
            }

            # 自動化率
            total = stats['total_suppliers']
            if total > 0:
                automated_count = await self.count_automated()
                stats['automation_rate'] = round((automated_count / total) * 100, 1)

            return stats

        except Exception as e:
            logger.error(f"過去統計取得エラー: {str(e)}")
            # エラー時はデフォルト値を返す
            return {
                'total_suppliers': 0,
                'active_suppliers': 0,
                'monthly_purchase': 0.0,
                'automation_rate': 0.0
            }

    # ===== アクティブ仕入先取得 =====

    async def get_active_suppliers(self) -> List[Supplier]:
        """アクティブな仕入先を取得"""
        try:
            query = select(Supplier).where(
                and_(
                    Supplier.status == 'active',
                    Supplier.automation_enabled == True
                )
            ).order_by(Supplier.name)

            result = await self.session.execute(query)
            return result.scalars().all()

        except Exception as e:
            logger.error(f"アクティブ仕入先取得エラー: {str(e)}")
            raise

    # ===== 同期関連 =====

    async def get_sync_statistics(self, supplier_id: int) -> Dict[str, Any]:
        """同期統計を取得"""
        try:
            # 最近30日の同期統計
            thirty_days_ago = datetime.now() - timedelta(days=30)

            stats_query = select(
                func.count().label('sync_count'),
                func.sum(
                    case((SupplierSyncHistory.success == True, 1), else_=0)
                ).label('success_count'),
                func.sum(
                    case((SupplierSyncHistory.success == False, 1), else_=0)
                ).label('error_count'),
                func.max(
                    case((SupplierSyncHistory.success == True, SupplierSyncHistory.end_time), else_=None)
                ).label('last_success'),
                func.max(
                    case((SupplierSyncHistory.success == False, SupplierSyncHistory.end_time), else_=None)
                ).label('last_error')
            ).select_from(SupplierSyncHistory).where(
                and_(
                    SupplierSyncHistory.supplier_id == supplier_id,
                    SupplierSyncHistory.start_time >= thirty_days_ago
                )
            )

            result = await self.session.execute(stats_query)
            stats = result.first()

            return {
                'sync_count': stats.sync_count or 0,
                'success_count': stats.success_count or 0,
                'error_count': stats.error_count or 0,
                'last_success': stats.last_success,
                'last_error': stats.last_error
            }

        except Exception as e:
            logger.error(f"同期統計取得エラー: {str(e)}")
            raise

    async def get_performance_stats(
        self, 
        supplier_id: int, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """パフォーマンス統計を取得"""
        try:
            # パフォーマンス指標テーブルから集計
            perf_query = select(
                func.sum(SupplierPerformanceMetrics.total_orders).label('total_orders'),
                func.sum(SupplierPerformanceMetrics.total_amount).label('total_amount'),
                func.avg(SupplierPerformanceMetrics.average_order_amount).label('average_order_amount'),
                func.avg(SupplierPerformanceMetrics.success_rate).label('success_rate'),
                func.avg(SupplierPerformanceMetrics.error_rate).label('error_rate'),
                func.sum(SupplierPerformanceMetrics.sync_count).label('sync_frequency'),
                func.avg(SupplierPerformanceMetrics.growth_rate).label('growth_rate'),
                func.avg(SupplierPerformanceMetrics.profit_margin).label('profit_margin')
            ).select_from(SupplierPerformanceMetrics).where(
                and_(
                    SupplierPerformanceMetrics.supplier_id == supplier_id,
                    SupplierPerformanceMetrics.metric_date >= start_date,
                    SupplierPerformanceMetrics.metric_date <= end_date
                )
            )

            result = await self.session.execute(perf_query)
            stats = result.first()

            return {
                'total_orders': stats.total_orders or 0,
                'total_amount': stats.total_amount or 0.0,
                'average_order_amount': stats.average_order_amount or 0.0,
                'success_rate': stats.success_rate or 0.0,
                'error_rate': stats.error_rate or 0.0,
                'sync_frequency': stats.sync_frequency or 0.0,
                'growth_rate': stats.growth_rate or 0.0,
                'profit_margin': stats.profit_margin or 0.0
            }

        except Exception as e:
            logger.error(f"パフォーマンス統計取得エラー: {str(e)}")
            # エラー時はデフォルト値を返す
            return {
                'total_orders': 0,
                'total_amount': 0.0,
                'average_order_amount': 0.0,
                'success_rate': 0.0,
                'error_rate': 0.0,
                'sync_frequency': 0.0,
                'growth_rate': 0.0,
                'profit_margin': 0.0
            }

    # ===== 活動履歴 =====

    async def get_recent_activities(self, limit: int = 10) -> List[SupplierActivity]:
        """最近の活動履歴を取得"""
        try:
            query = select(SupplierActivity).options(
                joinedload(SupplierActivity.supplier)
            ).order_by(desc(SupplierActivity.timestamp)).limit(limit)

            result = await self.session.execute(query)
            activities = result.scalars().all()

            # supplier_name を追加
            for activity in activities:
                if activity.supplier:
                    activity.supplier_name = activity.supplier.name
                else:
                    activity.supplier_name = "不明"

            return activities

        except Exception as e:
            logger.error(f"活動履歴取得エラー: {str(e)}")
            raise

    async def create_activity(
        self,
        activity_type: ActivityType,
        title: str,
        description: str,
        supplier_id: Optional[int] = None,
        icon: str = "fas fa-info",
        icon_type: str = "info",
        user_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> SupplierActivity:
        """活動履歴を作成"""
        try:
            activity = SupplierActivity(
                supplier_id=supplier_id,
                activity_type=activity_type.value,
                title=title,
                description=description,
                icon=icon,
                icon_type=icon_type,
                user_id=user_id,
                metadata=metadata
            )

            self.session.add(activity)
            await self.session.flush()
            await self.session.refresh(activity)

            return activity

        except Exception as e:
            logger.error(f"活動履歴作成エラー: {str(e)}")
            raise

    # ===== コード生成 =====

    async def get_max_code_number(self, prefix: str) -> int:
        """指定プレフィックスの最大コード番号を取得"""
        try:
            # SUP-{prefix}-XXX 形式のコードから最大番号を取得
            pattern = f"SUP-{prefix}-%"
            
            query = select(Supplier.code).where(Supplier.code.like(pattern))
            result = await self.session.execute(query)
            codes = result.scalars().all()

            max_number = 0
            for code in codes:
                try:
                    # SUP-AMZ-001 -> 001 -> 1
                    parts = code.split('-')
                    if len(parts) == 3:
                        number = int(parts[2])
                        max_number = max(max_number, number)
                except (ValueError, IndexError):
                    continue

            return max_number

        except Exception as e:
            logger.error(f"最大コード番号取得エラー: {str(e)}")
            return 0

    # ===== 一括操作 =====

    async def bulk_update(self, supplier_ids: List[int], update_data: Dict[str, Any]) -> int:
        """仕入先の一括更新"""
        try:
            # 更新データに更新日時を追加
            update_data['updated_at'] = datetime.now()

            # 一括更新実行
            from sqlalchemy import update
            query = update(Supplier).where(
                Supplier.id.in_(supplier_ids)
            ).values(**update_data)

            result = await self.session.execute(query)
            await self.session.commit()

            return result.rowcount

        except Exception as e:
            logger.error(f"一括更新エラー: {str(e)}")
            await self.session.rollback()
            raise

    # ===== 同期履歴管理 =====

    async def create_sync_history(
        self,
        supplier_id: int,
        sync_type: str,
        success: bool,
        processed_items: int = 0,
        error_count: int = 0,
        duration_seconds: Optional[float] = None,
        error_message: Optional[str] = None,
        result_summary: Optional[Dict[str, Any]] = None
    ) -> SupplierSyncHistory:
        """同期履歴を作成"""
        try:
            sync_history = SupplierSyncHistory(
                supplier_id=supplier_id,
                sync_type=sync_type,
                status="success" if success else "error",
                success=success,
                processed_items=processed_items,
                error_count=error_count,
                end_time=datetime.now(),
                duration_seconds=duration_seconds,
                error_message=error_message,
                result_summary=result_summary
            )

            self.session.add(sync_history)
            await self.session.flush()
            await self.session.refresh(sync_history)

            return sync_history

        except Exception as e:
            logger.error(f"同期履歴作成エラー: {str(e)}")
            raise

    # ===== 設定管理 =====

    async def get_configuration(self, supplier_id: int) -> Optional[SupplierConfiguration]:
        """仕入先設定を取得"""
        try:
            query = select(SupplierConfiguration).where(
                SupplierConfiguration.supplier_id == supplier_id
            )
            result = await self.session.execute(query)
            return result.scalars().first()

        except Exception as e:
            logger.error(f"仕入先設定取得エラー: {str(e)}")
            raise

    async def create_or_update_configuration(
        self, 
        supplier_id: int, 
        config_data: Dict[str, Any]
    ) -> SupplierConfiguration:
        """仕入先設定を作成または更新"""
        try:
            # 既存設定を確認
            existing_config = await self.get_configuration(supplier_id)

            if existing_config:
                # 更新
                for key, value in config_data.items():
                    if hasattr(existing_config, key):
                        setattr(existing_config, key, value)
                existing_config.updated_at = datetime.now()
                
                await self.session.flush()
                await self.session.refresh(existing_config)
                return existing_config
            else:
                # 新規作成
                config = SupplierConfiguration(
                    supplier_id=supplier_id,
                    **config_data
                )
                
                self.session.add(config)
                await self.session.flush()
                await self.session.refresh(config)
                return config

        except Exception as e:
            logger.error(f"仕入先設定作成・更新エラー: {str(e)}")
            raise