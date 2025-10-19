#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
models.py - SQLAlchemyデータベースモデル
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional, Union

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.db_setup import Base

class Rule(Base):
    """記帳ルールモデル"""
    __tablename__ = "rules"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    keyword = Column(String, nullable=False, index=True, comment="検索キーワード")
    debit = Column(String, nullable=False, comment="借方勘定科目")
    credit = Column(String, nullable=False, comment="貸方勘定科目")
    description = Column(Text, nullable=True, comment="ルール説明")
    period_start = Column(DateTime, nullable=True, comment="適用開始日")
    period_end = Column(DateTime, nullable=True, comment="適用終了日")
    is_active = Column(Boolean, default=True, comment="有効フラグ")
    priority = Column(Integer, default=0, comment="優先度（大きいほど優先）")
    hits = Column(Integer, default=0, comment="マッチ数")
    creator = Column(String, nullable=True, comment="作成者")
    created_at = Column(DateTime, default=datetime.utcnow, comment="作成日時")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新日時")
    
    # 関連
    corrections = relationship("Correction", back_populates="rule", cascade="all, delete-orphan")

class Transaction(Base):
    """取引情報モデル"""
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    transaction_date = Column(DateTime, nullable=False, index=True, comment="取引日")
    description = Column(Text, nullable=False, comment="摘要")
    amount = Column(Float, nullable=False, comment="金額")
    source = Column(String, nullable=True, comment="データソース")
    original_data = Column(MutableDict.as_mutable(JSON), nullable=True, comment="元データ")
    is_processed = Column(Boolean, default=False, comment="処理済みフラグ")
    is_confirmed = Column(Boolean, default=False, comment="確認済みフラグ")
    processing_status = Column(String, default="pending", comment="処理状態")
    error_message = Column(Text, nullable=True, comment="エラーメッセージ")
    created_at = Column(DateTime, default=datetime.utcnow, comment="作成日時")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新日時")
    
    # 関連
    journal_entries = relationship("JournalEntry", back_populates="transaction", cascade="all, delete-orphan")

class JournalEntry(Base):
    """仕訳データモデル"""
    __tablename__ = "journal_entries"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=False, comment="取引ID")
    rule_id = Column(String, ForeignKey("rules.id"), nullable=True, comment="適用ルールID")
    entry_date = Column(DateTime, nullable=False, index=True, comment="仕訳日")
    debit_account = Column(String, nullable=False, comment="借方勘定科目")
    credit_account = Column(String, nullable=False, comment="貸方勘定科目")
    amount = Column(Float, nullable=False, comment="金額")
    description = Column(Text, nullable=True, comment="摘要")
    mf_status = Column(String, default="pending", comment="MFクラウド連携状態")
    mf_response = Column(Text, nullable=True, comment="MFクラウドレスポンス")
    mf_entry_id = Column(String, nullable=True, comment="MFクラウド仕訳ID")
    is_retryable = Column(Boolean, default=True, comment="再送可能フラグ")
    created_at = Column(DateTime, default=datetime.utcnow, comment="作成日時")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新日時")
    
    # 関連
    transaction = relationship("Transaction", back_populates="journal_entries")
    rule = relationship("Rule", backref="journal_entries")

class Correction(Base):
    """修正履歴モデル"""
    __tablename__ = "corrections"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    rule_id = Column(String, ForeignKey("rules.id"), nullable=True, comment="ルールID")
    journal_entry_id = Column(String, ForeignKey("journal_entries.id"), nullable=True, comment="仕訳ID")
    original_data = Column(MutableDict.as_mutable(JSON), nullable=False, comment="修正前データ")
    corrected_data = Column(MutableDict.as_mutable(JSON), nullable=False, comment="修正後データ")
    correction_type = Column(String, nullable=False, comment="修正タイプ")
    corrected_by = Column(String, nullable=True, comment="修正者")
    created_at = Column(DateTime, default=datetime.utcnow, comment="作成日時")
    
    # 関連
    rule = relationship("Rule", back_populates="corrections")
    journal_entry = relationship("JournalEntry", backref="corrections")

class ActivityLog(Base):
    """アクティビティログモデル"""
    __tablename__ = "activity_logs"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    activity_type = Column(String, nullable=False, index=True, comment="アクティビティタイプ")
    description = Column(Text, nullable=True, comment="説明")
    user = Column(String, nullable=True, comment="ユーザー")
    data = Column(MutableDict.as_mutable(JSON), nullable=True, comment="関連データ")
    created_at = Column(DateTime, default=datetime.utcnow, index=True, comment="作成日時")
