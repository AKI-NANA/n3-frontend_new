"""
app/infrastructure/repositories/asin_repository.py - ASINデータアクセス層
用途: ASINアップロード関連のデータベース操作を統一管理
修正対象: 新しいクエリパターン追加時、パフォーマンス最適化時
"""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, and_, or_, desc, asc
from sqlalchemy.orm import selectinload, joinedload

from app.infrastructure.repositories.base_repository import BaseRepository
from app.domain.models.asin_upload import (
    ASINUploadModel, 
    ASINRecordModel, 
    ASINProcessingLogModel,
    ASINUploadStatus,
    ASINDataSource,
    ASINProcessingType
)
from app.core.exceptions import RepositoryException, ResourceNotFoundError

class ASINUploadRepository(BaseRepository[ASINUploadModel]):
    """
    ASINアップロードリポジトリ

    説明: ASINアップロードバッチのデータアクセス機能
    主要機能: CRUD操作、進捗管理、統計情報取得
    修正対象: 新しいクエリ機能追加時
    """

    def __init__(self, session: AsyncSession):
        super().__init__(session, ASINUploadModel)

    async def get_by_upload_id(self, upload_id: str) -> Optional[ASINUploadModel]:
        """
        アップロードID検索

        説明: 一意識別子によるアップロードバッチ検索
        修正対象: 検索条件変更時
        """
        try:
            query = select(ASINUploadModel).where(
                and_(
                    ASINUploadModel.upload_id == upload_id,
                    ASINUploadModel.is_deleted == False
                )
            )
            
            result = await self.session.execute(query)
            upload = result.scalars().first()
            
            if upload:
                self.logger.debug(f"アップロードバッチ取得成功: {upload_id}")
            
            return upload
            
        except Exception as e:
            self.logger.error(f"アップロードID検索エラー: {str(e)}")
            raise RepositoryException(f"アップロードID検索に失敗しました: {str(e)}")

    async def get_with_records(
        self, 
        upload_id: str, 
        include_logs: bool = False
    ) -> Optional[ASINUploadModel]:
        """
        関連レコード込みアップロード取得

        説明: ASINレコードや処理ログも含めてアップロードバッチを取得
        修正対象: 含める関連データ変更時
        """
        try:
            query = select(ASINUploadModel).where(
                and_(
                    ASINUploadModel.upload_id == upload_id,
                    ASINUploadModel.is_deleted == False
                )
            )
            
            # 関連データの eager loading
            query = query.options(selectinload(ASINUploadModel.asin_records))
            
            if include_logs:
                query = query.options(selectinload(ASINUploadModel.processing_logs))
            
            result = await self.session.execute(query)
            upload = result.scalars().first()
            
            if upload:
                self.logger.debug(f"関連データ込みアップロード取得成功: {upload_id}")
            
            return upload
            
        except Exception as e:
            self.logger.error(f"関連データ込み取得エラー: {str(e)}")
            raise RepositoryException(f"関連データ込み取得に失敗しました: {str(e)}")

    async def find_by_status(
        self, 
        statuses: List[ASINUploadStatus],
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[ASINUploadModel]:
        """
        ステータス別検索

        説明: 指定されたステータスのアップロードバッチを検索
        修正対象: 検索条件追加時
        """
        try:
            query = select(ASINUploadModel).where(
                and_(
                    ASINUploadModel.status.in_([s.value for s in statuses]),
                    ASINUploadModel.is_deleted == False
                )
            ).order_by(desc(ASINUploadModel.created_at))
            
            if offset is not None:
                query = query.offset(offset)
            if limit is not None:
                query = query.limit(limit)
            
            result = await self.session.execute(query)
            uploads = result.scalars().all()
            
            self.logger.debug(f"ステータス別検索成功: {len(uploads)}件")
            return uploads
            
        except Exception as e:
            self.logger.error(f"ステータス別検索エラー: {str(e)}")
            raise RepositoryException(f"ステータス別検索に失敗しました: {str(e)}")

    async def find_by_user(
        self, 
        user_id: str,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[ASINUploadModel]:
        """
        ユーザー別検索

        説明: 指定されたユーザーのアップロードバッチを検索
        修正対象: ユーザー検索条件変更時
        """
        try:
            conditions = [
                ASINUploadModel.uploaded_by == user_id,
                ASINUploadModel.is_deleted == False
            ]
            
            if date_from:
                conditions.append(ASINUploadModel.created_at >= date_from)
            if date_to:
                conditions.append(ASINUploadModel.created_at <= date_to)
            
            query = select(ASINUploadModel).where(
                and_(*conditions)
            ).order_by(desc(ASINUploadModel.created_at))
            
            if offset is not None:
                query = query.offset(offset)
            if limit is not None:
                query = query.limit(limit)
            
            result = await self.session.execute(query)
            uploads = result.scalars().all()
            
            self.logger.debug(f"ユーザー別検索成功: {len(uploads)}件")
            return uploads
            
        except Exception as e:
            self.logger.error(f"ユーザー別検索エラー: {str(e)}")
            raise RepositoryException(f"ユーザー別検索に失敗しました: {str(e)}")

    async def find_stale_uploads(
        self, 
        stale_minutes: int = 60
    ) -> List[ASINUploadModel]:
        """
        停滞アップロード検索

        説明: 長時間処理中のままのアップロードバッチを検索
        修正対象: 停滞判定基準変更時
        """
        try:
            stale_time = datetime.utcnow() - timedelta(minutes=stale_minutes)
            
            query = select(ASINUploadModel).where(
                and_(
                    ASINUploadModel.status == ASINUploadStatus.PROCESSING,
                    ASINUploadModel.updated_at < stale_time,
                    ASINUploadModel.is_deleted == False
                )
            ).order_by(asc(ASINUploadModel.updated_at))
            
            result = await self.session.execute(query)
            uploads = result.scalars().all()
            
            self.logger.debug(f"停滞アップロード検索成功: {len(uploads)}件")
            return uploads
            
        except Exception as e:
            self.logger.error(f"停滞アップロード検索エラー: {str(e)}")
            raise RepositoryException(f"停滞アップロード検索に失敗しました: {str(e)}")

    async def update_progress(
        self, 
        upload_id: str, 
        processed_records: int,
        current_step: str = ""
    ) -> bool:
        """
        進捗更新

        説明: アップロードバッチの進捗情報を更新
        修正対象: 進捗更新項目変更時
        """
        try:
            update_data = {
                "processed_records": processed_records,
                "updated_at": datetime.utcnow()
            }
            
            if current_step:
                update_data["current_step"] = current_step
            
            query = (
                update(ASINUploadModel)
                .where(ASINUploadModel.upload_id == upload_id)
                .values(**update_data)
            )
            
            result = await self.session.execute(query)
            success = result.rowcount > 0
            
            if success:
                self.logger.debug(f"進捗更新成功: {upload_id}")
            
            return success
            
        except Exception as e:
            self.logger.error(f"進捗更新エラー: {str(e)}")
            raise RepositoryException(f"進捗更新に失敗しました: {str(e)}")

    async def get_statistics(
        self, 
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        統計情報取得

        説明: アップロードバッチの統計情報を取得
        修正対象: 統計項目追加時
        """
        try:
            conditions = [ASINUploadModel.is_deleted == False]
            
            if date_from:
                conditions.append(ASINUploadModel.created_at >= date_from)
            if date_to:
                conditions.append(ASINUploadModel.created_at <= date_to)
            if user_id:
                conditions.append(ASINUploadModel.uploaded_by == user_id)
            
            # 基本統計
            query = select(
                func.count().label('total_uploads'),
                func.count().filter(ASINUploadModel.status == ASINUploadStatus.PROCESSING).label('active_uploads'),
                func.count().filter(ASINUploadModel.status == ASINUploadStatus.COMPLETED).label('completed_uploads'),
                func.count().filter(ASINUploadModel.status == ASINUploadStatus.FAILED).label('failed_uploads'),
                func.sum(ASINUploadModel.total_records).label('total_records'),
                func.sum(ASINUploadModel.successful_records).label('successful_records'),
                func.avg(ASINUploadModel.processing_duration).label('avg_duration')
            ).where(and_(*conditions))
            
            result = await self.session.execute(query)
            stats = result.first()
            
            # 成功率計算
            total_records = stats.total_records or 0
            successful_records = stats.successful_records or 0
            success_rate = (successful_records / total_records * 100) if total_records > 0 else 0.0
            
            statistics = {
                "total_uploads": stats.total_uploads or 0,
                "active_uploads": stats.active_uploads or 0,
                "completed_uploads": stats.completed_uploads or 0,
                "failed_uploads": stats.failed_uploads or 0,
                "total_records_processed": total_records,
                "successful_records": successful_records,
                "average_processing_time": float(stats.avg_duration) if stats.avg_duration else 0.0,
                "success_rate": round(success_rate, 2)
            }
            
            self.logger.debug("統計情報取得成功")
            return statistics
            
        except Exception as e:
            self.logger.error(f"統計情報取得エラー: {str(e)}")
            raise RepositoryException(f"統計情報取得に失敗しました: {str(e)}")

class ASINRecordRepository(BaseRepository[ASINRecordModel]):
    """
    ASINレコードリポジトリ

    説明: 個別ASINレコードのデータアクセス機能
    主要機能: CRUD操作、バッチ処理、ステータス管理
    修正対象: 新しいレコード操作追加時
    """

    def __init__(self, session: AsyncSession):
        super().__init__(session, ASINRecordModel)

    async def find_by_upload_batch(
        self, 
        upload_batch_id: int,
        status_filter: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[ASINRecordModel]:
        """
        アップロードバッチ別レコード検索

        説明: 指定されたアップロードバッチのレコードを検索
        修正対象: 検索条件追加時
        """
        try:
            conditions = [
                ASINRecordModel.upload_batch_id == upload_batch_id,
                ASINRecordModel.is_deleted == False
            ]
            
            if status_filter:
                conditions.append(ASINRecordModel.processing_status == status_filter)
            
            query = select(ASINRecordModel).where(
                and_(*conditions)
            ).order_by(asc(ASINRecordModel.record_index))
            
            if offset is not None:
                query = query.offset(offset)
            if limit is not None:
                query = query.limit(limit)
            
            result = await self.session.execute(query)
            records = result.scalars().all()
            
            self.logger.debug(f"バッチ別レコード検索成功: {len(records)}件")
            return records
            
        except Exception as e:
            self.logger.error(f"バッチ別レコード検索エラー: {str(e)}")
            raise RepositoryException(f"バッチ別レコード検索に失敗しました: {str(e)}")

    async def find_by_asin_code(self, asin_code: str) -> List[ASINRecordModel]:
        """
        ASINコード検索

        説明: 指定されたASINコードのレコードを検索
        修正対象: ASIN検索条件変更時
        """
        try:
            query = select(ASINRecordModel).where(
                and_(
                    ASINRecordModel.asin_code == asin_code.upper(),
                    ASINRecordModel.is_deleted == False
                )
            ).order_by(desc(ASINRecordModel.created_at))
            
            result = await self.session.execute(query)
            records = result.scalars().all()
            
            self.logger.debug(f"ASINコード検索成功: {len(records)}件")
            return records
            
        except Exception as e:
            self.logger.error(f"ASINコード検索エラー: {str(e)}")
            raise RepositoryException(f"ASINコード検索に失敗しました: {str(e)}")

    async def bulk_create(self, records: List[ASINRecordModel]) -> List[ASINRecordModel]:
        """
        バルク作成

        説明: 複数のASINレコードを一括作成
        修正対象: バッチサイズ最適化時
        """
        try:
            if not records:
                return []

            # 作成日時等の自動設定
            now = datetime.utcnow()
            for record in records:
                record.created_at = now
                record.updated_at = now

            self.session.add_all(records)
            await self.session.flush()

            # IDを取得するために個別にrefresh
            for record in records:
                await self.session.refresh(record)

            self.logger.info(f"ASINレコードバルク作成成功: {len(records)}件")
            return records

        except Exception as e:
            self.logger.error(f"ASINレコードバルク作成失敗: {str(e)}")
            await self.session.rollback()
            raise RepositoryException(f"ASINレコードバルク作成に失敗しました: {str(e)}")

    async def bulk_update_status(
        self, 
        record_ids: List[int], 
        status: str,
        error_message: Optional[str] = None
    ) -> int:
        """
        バルクステータス更新

        説明: 複数レコードのステータスを一括更新
        修正対象: 更新項目追加時
        """
        try:
            update_data = {
                "processing_status": status,
                "updated_at": datetime.utcnow()
            }
            
            if error_message:
                update_data["error_message"] = error_message
            
            if status in ["completed", "failed"]:
                update_data["processed_at"] = datetime.utcnow()
            
            query = (
                update(ASINRecordModel)
                .where(ASINRecordModel.id.in_(record_ids))
                .values(**update_data)
            )
            
            result = await self.session.execute(query)
            updated_count = result.rowcount
            
            self.logger.debug(f"バルクステータス更新成功: {updated_count}件")
            return updated_count
            
        except Exception as e:
            self.logger.error(f"バルクステータス更新エラー: {str(e)}")
            raise RepositoryException(f"バルクステータス更新に失敗しました: {str(e)}")

    async def get_error_summary(
        self, 
        upload_batch_id: int
    ) -> Dict[str, int]:
        """
        エラーサマリー取得

        説明: アップロードバッチのエラー内容をサマリー化
        修正対象: エラー分類変更時
        """
        try:
            query = select(
                ASINRecordModel.error_message,
                func.count().label('count')
            ).where(
                and_(
                    ASINRecordModel.upload_batch_id == upload_batch_id,
                    ASINRecordModel.processing_status == "failed",
                    ASINRecordModel.error_message.isnot(None),
                    ASINRecordModel.is_deleted == False
                )
            ).group_by(ASINRecordModel.error_message)
            
            result = await self.session.execute(query)
            error_summary = {row.error_message: row.count for row in result}
            
            self.logger.debug(f"エラーサマリー取得成功: {len(error_summary)}種類")
            return error_summary
            
        except Exception as e:
            self.logger.error(f"エラーサマリー取得エラー: {str(e)}")
            raise RepositoryException(f"エラーサマリー取得に失敗しました: {str(e)}")

class ASINProcessingLogRepository(BaseRepository[ASINProcessingLogModel]):
    """
    ASIN処理ログリポジトリ

    説明: ASINアップロード処理のログ情報データアクセス
    主要機能: ログ記録、検索、分析
    修正対象: ログ分析機能追加時
    """

    def __init__(self, session: AsyncSession):
        super().__init__(session, ASINProcessingLogModel)

    async def create_log(
        self,
        upload_batch_id: int,
        log_level: str,
        message: str,
        step_name: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> ASINProcessingLogModel:
        """
        ログエントリ作成

        説明: 新しい処理ログエントリを作成
        修正対象: ログ項目追加時
        """
        try:
            log_entry = ASINProcessingLogModel(
                upload_batch_id=upload_batch_id,
                log_level=log_level,
                message=message,
                step_name=step_name,
                details=details or {}
            )
            
            result = await self.create(log_entry)
            self.logger.debug(f"処理ログ作成成功: {log_level} - {message}")
            return result
            
        except Exception as e:
            self.logger.error(f"処理ログ作成エラー: {str(e)}")
            raise RepositoryException(f"処理ログ作成に失敗しました: {str(e)}")

    async def find_by_upload_batch(
        self, 
        upload_batch_id: int,
        log_level: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[ASINProcessingLogModel]:
        """
        アップロードバッチ別ログ検索

        説明: 指定されたアップロードバッチのログを検索
        修正対象: ログ検索条件追加時
        """
        try:
            conditions = [
                ASINProcessingLogModel.upload_batch_id == upload_batch_id,
                ASINProcessingLogModel.is_deleted == False
            ]
            
            if log_level:
                conditions.append(ASINProcessingLogModel.log_level == log_level)
            
            query = select(ASINProcessingLogModel).where(
                and_(*conditions)
            ).order_by(desc(ASINProcessingLogModel.created_at))
            
            if limit is not None:
                query = query.limit(limit)
            
            result = await self.session.execute(query)
            logs = result.scalars().all()
            
            self.logger.debug(f"バッチ別ログ検索成功: {len(logs)}件")
            return logs
            
        except Exception as e:
            self.logger.error(f"バッチ別ログ検索エラー: {str(e)}")
            raise RepositoryException(f"バッチ別ログ検索に失敗しました: {str(e)}")

    async def get_error_logs(
        self, 
        upload_batch_id: int,
        limit: Optional[int] = 50
    ) -> List[ASINProcessingLogModel]:
        """
        エラーログ取得

        説明: 指定されたアップロードバッチのエラーログを取得
        修正対象: エラーログ取得条件変更時
        """
        try:
            query = select(ASINProcessingLogModel).where(
                and_(
                    ASINProcessingLogModel.upload_batch_id == upload_batch_id,
                    ASINProcessingLogModel.log_level == "ERROR",
                    ASINProcessingLogModel.is_deleted == False
                )
            ).order_by(desc(ASINProcessingLogModel.created_at))
            
            if limit is not None:
                query = query.limit(limit)
            
            result = await self.session.execute(query)
            error_logs = result.scalars().all()
            
            self.logger.debug(f"エラーログ取得成功: {len(error_logs)}件")
            return error_logs
            
        except Exception as e:
            self.logger.error(f"エラーログ取得エラー: {str(e)}")
            raise RepositoryException(f"エラーログ取得に失敗しました: {str(e)}")

    async def cleanup_old_logs(self, days_to_keep: int = 30) -> int:
        """
        古いログのクリーンアップ

        説明: 指定された日数より古いログを削除
        修正対象: クリーンアップ条件変更時
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            
            query = delete(ASINProcessingLogModel).where(
                ASINProcessingLogModel.created_at < cutoff_date
            )
            
            result = await self.session.execute(query)
            deleted_count = result.rowcount
            
            self.logger.info(f"古いログクリーンアップ完了: {deleted_count}件削除")
            return deleted_count
            
        except Exception as e:
            self.logger.error(f"ログクリーンアップエラー: {str(e)}")
            raise RepositoryException(f"ログクリーンアップに失敗しました: {str(e)}")

# === 使用例 ===

"""
# リポジトリの基本的な使用例:

# リポジトリインスタンス取得
upload_repo = ASINUploadRepository(session)
record_repo = ASINRecordRepository(session)
log_repo = ASINProcessingLogRepository(session)

# アップロードバッチ操作
upload_batch = await upload_repo.create(upload_entity)
batch_with_records = await upload_repo.get_with_records(upload_id, include_logs=True)
await upload_repo.update_progress(upload_id, processed_count, "商品データ取得中")

# レコード操作
records = await record_repo.find_by_upload_batch(batch_id)
await record_repo.bulk_update_status(record_ids, "completed")
error_summary = await record_repo.get_error_summary(batch_id)

# ログ操作
await log_repo.create_log(batch_id, "INFO", "処理開始", "validation")
error_logs = await log_repo.get_error_logs(batch_id)

# 統計情報
stats = await upload_repo.get_statistics(
    date_from=datetime.now() - timedelta(days=7),
    user_id="user123"
)
"""