#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
repositories.py - リポジトリパターンに基づくデータアクセスレイヤー
"""

import uuid
from abc import ABC, abstractmethod
from datetime import datetime, date
from typing import Dict, Generic, List, Optional, Type, TypeVar, Union, Any

from sqlalchemy import and_, select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from database.models import Rule, Transaction, JournalEntry, Correction, ActivityLog
from utils.logger import setup_logger

# ロガー設定
logger = setup_logger()

# ジェネリック型変数
T = TypeVar('T')
ID = TypeVar('ID')

class BaseRepository(Generic[T, ID], ABC):
    """リポジトリの基底クラス"""
    
    def __init__(self, session: AsyncSession, model_class: Type[T]):
        """初期化
        
        Args:
            session: SQLAlchemy非同期セッション
            model_class: モデルクラス
        """
        self.session = session
        self.model_class = model_class
    
    async def create(self, data: Dict[str, Any]) -> T:
        """レコード作成
        
        Args:
            data: レコードデータ
            
        Returns:
            作成されたモデルインスタンス
        """
        model = self.model_class(**data)
        self.session.add(model)
        await self.session.flush()
        return model
    
    async def get_by_id(self, id: ID) -> Optional[T]:
        """IDによるレコード取得
        
        Args:
            id: レコードID
            
        Returns:
            モデルインスタンス（存在しない場合はNone）
        """
        query = select(self.model_class).where(self.model_class.id == id)
        result = await self.session.execute(query)
        return result.scalars().first()
    
    async def get_all(self) -> List[T]:
        """全レコード取得
        
        Returns:
            全レコードのリスト
        """
        query = select(self.model_class)
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def update(self, id: ID, data: Dict[str, Any]) -> Optional[T]:
        """レコード更新
        
        Args:
            id: レコードID
            data: 更新データ
            
        Returns:
            更新されたモデルインスタンス（存在しない場合はNone）
        """
        model = await self.get_by_id(id)
        if model:
            for key, value in data.items():
                if hasattr(model, key):
                    setattr(model, key, value)
            await self.session.flush()
        return model
    
    async def delete(self, id: ID) -> bool:
        """レコード削除
        
        Args:
            id: レコードID
            
        Returns:
            削除成功フラグ
        """
        model = await self.get_by_id(id)
        if model:
            await self.session.delete(model)
            await self.session.flush()
            return True
        return False
    
    async def count(self) -> int:
        """レコード数取得
        
        Returns:
            レコード数
        """
        query = select(func.count()).select_from(self.model_class)
        result = await self.session.execute(query)
        return result.scalar()


class RuleRepository(BaseRepository[Rule, str]):
    """ルールリポジトリ"""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, Rule)
    
    async def find_by_keyword(self, keyword: str, active_only: bool = True) -> List[Rule]:
        """キーワードによるルール検索
        
        Args:
            keyword: 検索キーワード
            active_only: アクティブなルールのみ
            
        Returns:
            ルールのリスト
        """
        conditions = [Rule.keyword.ilike(f"%{keyword}%")]
        if active_only:
            conditions.append(Rule.is_active == True)
            
        query = select(Rule).where(and_(*conditions)).order_by(Rule.priority.desc())
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def find_applicable_rules(self, 
                                    description: str, 
                                    date: datetime,
                                    active_only: bool = True) -> List[Rule]:
        """適用可能なルールを検索
        
        Args:
            description: 摘要
            date: 日付
            active_only: アクティブなルールのみ
            
        Returns:
            ルールのリスト
        """
        conditions = []
        
        # 期間条件（開始日と終了日のチェック）
        date_conditions = []
        
        # 期間開始日が指定されていない、または指定日以前
        date_conditions.append(
            (Rule.period_start == None) | (Rule.period_start <= date)
        )
        
        # 期間終了日が指定されていない、または指定日以降
        date_conditions.append(
            (Rule.period_end == None) | (Rule.period_end >= date)
        )
        
        conditions.append(and_(*date_conditions))
        
        # アクティブ条件
        if active_only:
            conditions.append(Rule.is_active == True)
        
        # クエリ作成
        query = select(Rule).where(and_(*conditions)).order_by(Rule.priority.desc())
        result = await self.session.execute(query)
        rules = result.scalars().all()
        
        # 摘要によるフィルタリング（SQLiteの場合、LIKEクエリが複雑になるため、Pythonでフィルタリング）
        applicable_rules = []
        for rule in rules:
            if rule.keyword.lower() in description.lower():
                applicable_rules.append(rule)
        
        # 優先度でソート
        applicable_rules.sort(key=lambda x: (x.priority, len(x.keyword)), reverse=True)
        
        return applicable_rules
    
    async def update_hit_count(self, rule_id: str, increment: int = 1) -> None:
        """ルールのヒット数を更新
        
        Args:
            rule_id: ルールID
            increment: 増分
        """
        stmt = (
            update(Rule)
            .where(Rule.id == rule_id)
            .values(hits=Rule.hits + increment)
        )
        await self.session.execute(stmt)
        await self.session.flush()


class TransactionRepository(BaseRepository[Transaction, str]):
    """取引リポジトリ"""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, Transaction)
    
    async def find_by_date_range(self, 
                                start_date: date, 
                                end_date: date,
                                processed: Optional[bool] = None) -> List[Transaction]:
        """日付範囲による取引検索
        
        Args:
            start_date: 開始日
            end_date: 終了日
            processed: 処理済みフラグ（Noneの場合は全て）
            
        Returns:
            取引のリスト
        """
        conditions = [
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date
        ]
        
        if processed is not None:
            conditions.append(Transaction.is_processed == processed)
        
        query = select(Transaction).where(and_(*conditions)).order_by(Transaction.transaction_date)
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def find_unprocessed(self, limit: int = 100) -> List[Transaction]:
        """未処理の取引を検索
        
        Args:
            limit: 取得件数
            
        Returns:
            未処理取引のリスト
        """
        query = (
            select(Transaction)
            .where(Transaction.is_processed == False)
            .order_by(Transaction.transaction_date)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def mark_as_processed(self, transaction_id: str, status: str = "processed") -> None:
        """取引を処理済みとしてマーク
        
        Args:
            transaction_id: 取引ID
            status: 処理状態
        """
        stmt = (
            update(Transaction)
            .where(Transaction.id == transaction_id)
            .values(
                is_processed=True, 
                processing_status=status,
                updated_at=datetime.utcnow()
            )
        )
        await self.session.execute(stmt)
        await self.session.flush()


class JournalEntryRepository(BaseRepository[JournalEntry, str]):
    """仕訳データリポジトリ"""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, JournalEntry)
    
    async def find_by_date_range(self, 
                                start_date: date, 
                                end_date: date,
                                mf_status: Optional[str] = None) -> List[JournalEntry]:
        """日付範囲による仕訳データ検索
        
        Args:
            start_date: 開始日
            end_date: 終了日
            mf_status: MFクラウド連携状態（Noneの場合は全て）
            
        Returns:
            仕訳データのリスト
        """
        conditions = [
            JournalEntry.entry_date >= start_date,
            JournalEntry.entry_date <= end_date
        ]
        
        if mf_status:
            conditions.append(JournalEntry.mf_status == mf_status)
        
        query = select(JournalEntry).where(and_(*conditions)).order_by(JournalEntry.entry_date)
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def find_pending_entries(self, limit: int = 100) -> List[JournalEntry]:
        """送信待ちの仕訳データを検索
        
        Args:
            limit: 取得件数
            
        Returns:
            送信待ち仕訳データのリスト
        """
        query = (
            select(JournalEntry)
            .where(JournalEntry.mf_status == "pending")
            .order_by(JournalEntry.entry_date)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def find_retryable_entries(self, limit: int = 100) -> List[JournalEntry]:
        """再送可能な仕訳データを検索
        
        Args:
            limit: 取得件数
            
        Returns:
            再送可能仕訳データのリスト
        """
        query = (
            select(JournalEntry)
            .where(
                and_(
                    JournalEntry.mf_status == "failed",
                    JournalEntry.is_retryable == True
                )
            )
            .order_by(JournalEntry.entry_date)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def update_mf_status(self, 
                              entry_id: str, 
                              status: str, 
                              response: Optional[str] = None,
                              mf_entry_id: Optional[str] = None) -> None:
        """MFクラウド連携状態を更新
        
        Args:
            entry_id: 仕訳データID
            status: 連携状態
            response: レスポンス
            mf_entry_id: MFクラウド仕訳ID
        """
        update_values = {
            "mf_status": status,
            "updated_at": datetime.utcnow()
        }
        
        if response:
            update_values["mf_response"] = response
            
        if mf_entry_id:
            update_values["mf_entry_id"] = mf_entry_id
        
        stmt = (
            update(JournalEntry)
            .where(JournalEntry.id == entry_id)
            .values(**update_values)
        )
        await self.session.execute(stmt)
        await self.session.flush()


class CorrectionRepository(BaseRepository[Correction, str]):
    """修正履歴リポジトリ"""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, Correction)
    
    async def find_by_rule_id(self, rule_id: str) -> List[Correction]:
        """ルールIDによる修正履歴検索
        
        Args:
            rule_id: ルールID
            
        Returns:
            修正履歴のリスト
        """
        query = select(Correction).where(Correction.rule_id == rule_id).order_by(Correction.created_at.desc())
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def find_by_journal_entry_id(self, journal_entry_id: str) -> List[Correction]:
        """仕訳データIDによる修正履歴検索
        
        Args:
            journal_entry_id: 仕訳データID
            
        Returns:
            修正履歴のリスト
        """
        query = select(Correction).where(Correction.journal_entry_id == journal_entry_id).order_by(Correction.created_at.desc())
        result = await self.session.execute(query)
        return result.scalars().all()


class ActivityLogRepository(BaseRepository[ActivityLog, str]):
    """アクティビティログリポジトリ"""
    
    def __init__(self, session: AsyncSession):
        super().__init__(session, ActivityLog)
    
    async def find_by_activity_type(self, activity_type: str, limit: int = 100) -> List[ActivityLog]:
        """アクティビティタイプによるログ検索
        
        Args:
            activity_type: アクティビティタイプ
            limit: 取得件数
            
        Returns:
            アクティビティログのリスト
        """
        query = (
            select(ActivityLog)
            .where(ActivityLog.activity_type == activity_type)
            .order_by(ActivityLog.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def find_