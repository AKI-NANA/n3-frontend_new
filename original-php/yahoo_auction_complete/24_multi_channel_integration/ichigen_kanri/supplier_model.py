# app/domain/models/supplier.py
"""
仕入先エンティティモデル

このモジュールは仕入先管理のSQLAlchemyモデルを定義します
- 仕入先の基本情報
- 統計データ
- 活動履歴
- データベーステーブル定義
"""

from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from enum import Enum

from app.domain.models.base import Base

# ===== 列挙型定義 =====

class ChannelType(str, Enum):
    """販路タイプ"""
    AMAZON = "amazon"
    RAKUTEN = "rakuten"
    YAHOO = "yahoo"
    MERCARI = "mercari"
    OTHERS = "others"

class SupplierStatus(str, Enum):
    """仕入先ステータス"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    SUSPENDED = "suspended"

class ActivityType(str, Enum):
    """活動タイプ"""
    SYNC_SUCCESS = "sync_success"
    SYNC_ERROR = "sync_error"
    SUPPLIER_ADDED = "supplier_added"
    SUPPLIER_UPDATED = "supplier_updated"
    SUPPLIER_DELETED = "supplier_deleted"
    AUTOMATION_ENABLED = "automation_enabled"
    AUTOMATION_DISABLED = "automation_disabled"

# ===== メインモデル =====

class Supplier(Base):
    """
    仕入先エンティティ
    
    仕入先の基本情報と設定を管理するメインテーブル
    """
    __tablename__ = "suppliers"

    # 基本情報
    id = Column(Integer, primary_key=True, index=True, comment="仕入先ID")
    name = Column(String(255), nullable=False, comment="仕入先名")
    code = Column(String(50), unique=True, nullable=False, comment="仕入先コード")
    channel = Column(String(20), nullable=False, comment="販路")
    url = Column(String(500), nullable=True, comment="仕入先URL")
    
    # ステータス
    status = Column(String(20), default=SupplierStatus.ACTIVE.value, comment="ステータス")
    automation_enabled = Column(Boolean, default=True, comment="自動化有効フラグ")
    
    # 統計データ
    products_count = Column(Integer, default=0, comment="商品数")
    monthly_amount = Column(Float, default=0.0, comment="月間仕入額")
    
    # 同期情報
    last_sync = Column(DateTime, nullable=True, comment="最終同期日時")
    error_message = Column(Text, nullable=True, comment="エラーメッセージ")
    
    # メタデータ
    notes = Column(Text, nullable=True, comment="備考")
    settings = Column(JSON, nullable=True, comment="設定JSON")
    
    # タイムスタンプ
    created_at = Column(DateTime, default=func.now(), comment="作成日時")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新日時")

    # ===== リレーションシップ =====
    
    # 商品との関係（1対多）
    products = relationship("Product", back_populates="supplier", cascade="all, delete-orphan")
    
    # 活動履歴との関係（1対多）
    activities = relationship("SupplierActivity", back_populates="supplier", cascade="all, delete-orphan")
    
    # 同期履歴との関係（1対多）
    sync_histories = relationship("SupplierSyncHistory", back_populates="supplier", cascade="all, delete-orphan")

    # ===== インデックス =====
    __table_args__ = (
        Index('idx_supplier_channel_status', 'channel', 'status'),
        Index('idx_supplier_automation', 'automation_enabled'),
        Index('idx_supplier_last_sync', 'last_sync'),
        Index('idx_supplier_created_at', 'created_at'),
        {'comment': '仕入先マスタテーブル'}
    )

    # ===== メソッド =====
    
    def __repr__(self):
        return f"<Supplier(id={self.id}, name='{self.name}', channel='{self.channel}', status='{self.status}')>"

    def to_dict(self):
        """辞書形式に変換"""
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'channel': self.channel,
            'url': self.url,
            'status': self.status,
            'automation_enabled': self.automation_enabled,
            'products_count': self.products_count,
            'monthly_amount': self.monthly_amount,
            'last_sync': self.last_sync.isoformat() if self.last_sync else None,
            'error_message': self.error_message,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @property
    def is_active(self) -> bool:
        """アクティブかどうか"""
        return self.status == SupplierStatus.ACTIVE.value

    @property
    def has_error(self) -> bool:
        """エラー状態かどうか"""
        return self.status == SupplierStatus.ERROR.value or self.error_message is not None

    @property
    def channel_display_name(self) -> str:
        """販路の表示名"""
        channel_names = {
            ChannelType.AMAZON: "Amazon",
            ChannelType.RAKUTEN: "楽天市場",
            ChannelType.YAHOO: "ヤフオク",
            ChannelType.MERCARI: "メルカリ",
            ChannelType.OTHERS: "その他"
        }
        return channel_names.get(self.channel, self.channel)

# ===== 関連モデル =====

class SupplierActivity(Base):
    """
    仕入先活動履歴
    
    仕入先に関する活動・操作履歴を記録
    """
    __tablename__ = "supplier_activities"

    id = Column(Integer, primary_key=True, index=True, comment="活動ID")
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, comment="仕入先ID")
    
    # 活動情報
    activity_type = Column(String(50), nullable=False, comment="活動タイプ")
    title = Column(String(255), nullable=False, comment="活動タイトル")
    description = Column(Text, nullable=True, comment="活動説明")
    
    # 表示情報
    icon = Column(String(50), nullable=True, comment="アイコンクラス")
    icon_type = Column(String(20), nullable=True, comment="アイコンタイプ")
    
    # メタデータ
    metadata = Column(JSON, nullable=True, comment="活動メタデータ")
    
    # ユーザー情報
    user_id = Column(Integer, nullable=True, comment="実行ユーザーID")
    
    # タイムスタンプ
    timestamp = Column(DateTime, default=func.now(), comment="発生日時")

    # ===== リレーションシップ =====
    
    supplier = relationship("Supplier", back_populates="activities")

    # ===== インデックス =====
    __table_args__ = (
        Index('idx_supplier_activity_supplier_id', 'supplier_id'),
        Index('idx_supplier_activity_type', 'activity_type'),
        Index('idx_supplier_activity_timestamp', 'timestamp'),
        {'comment': '仕入先活動履歴テーブル'}
    )

    def __repr__(self):
        return f"<SupplierActivity(id={self.id}, supplier_id={self.supplier_id}, type='{self.activity_type}')>"

class SupplierSyncHistory(Base):
    """
    仕入先同期履歴
    
    仕入先の同期処理履歴を詳細に記録
    """
    __tablename__ = "supplier_sync_histories"

    id = Column(Integer, primary_key=True, index=True, comment="同期履歴ID")
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, comment="仕入先ID")
    
    # 同期情報
    sync_type = Column(String(50), nullable=False, comment="同期タイプ")
    status = Column(String(20), nullable=False, comment="同期ステータス")
    
    # 結果情報
    success = Column(Boolean, default=False, comment="成功フラグ")
    processed_items = Column(Integer, default=0, comment="処理件数")
    error_count = Column(Integer, default=0, comment="エラー件数")
    
    # 詳細情報
    start_time = Column(DateTime, default=func.now(), comment="開始日時")
    end_time = Column(DateTime, nullable=True, comment="終了日時")
    duration_seconds = Column(Float, nullable=True, comment="処理時間（秒）")
    
    # エラー情報
    error_message = Column(Text, nullable=True, comment="エラーメッセージ")
    error_details = Column(JSON, nullable=True, comment="エラー詳細")
    
    # 結果詳細
    result_summary = Column(JSON, nullable=True, comment="結果サマリー")

    # ===== リレーションシップ =====
    
    supplier = relationship("Supplier", back_populates="sync_histories")

    # ===== インデックス =====
    __table_args__ = (
        Index('idx_supplier_sync_supplier_id', 'supplier_id'),
        Index('idx_supplier_sync_status', 'status'),
        Index('idx_supplier_sync_start_time', 'start_time'),
        {'comment': '仕入先同期履歴テーブル'}
    )

    def __repr__(self):
        return f"<SupplierSyncHistory(id={self.id}, supplier_id={self.supplier_id}, status='{self.status}')>"

    @property
    def duration_display(self) -> str:
        """処理時間の表示形式"""
        if not self.duration_seconds:
            return "不明"
        
        if self.duration_seconds < 60:
            return f"{self.duration_seconds:.1f}秒"
        elif self.duration_seconds < 3600:
            minutes = int(self.duration_seconds // 60)
            seconds = int(self.duration_seconds % 60)
            return f"{minutes}分{seconds}秒"
        else:
            hours = int(self.duration_seconds // 3600)
            minutes = int((self.duration_seconds % 3600) // 60)
            return f"{hours}時間{minutes}分"

class SupplierPerformanceMetrics(Base):
    """
    仕入先パフォーマンス指標
    
    日次・月次の仕入先パフォーマンスデータを集計・保存
    """
    __tablename__ = "supplier_performance_metrics"

    id = Column(Integer, primary_key=True, index=True, comment="メトリクスID")
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, comment="仕入先ID")
    
    # 集計期間
    metric_date = Column(DateTime, nullable=False, comment="集計日")
    metric_type = Column(String(20), nullable=False, comment="集計タイプ(daily/monthly)")
    
    # 取引指標
    total_orders = Column(Integer, default=0, comment="総注文数")
    total_amount = Column(Float, default=0.0, comment="総取引額")
    average_order_amount = Column(Float, default=0.0, comment="平均注文額")
    
    # 品質指標
    success_rate = Column(Float, default=0.0, comment="成功率（%）")
    error_rate = Column(Float, default=0.0, comment="エラー率（%）")
    sync_count = Column(Integer, default=0, comment="同期回数")
    
    # 成長指標
    growth_rate = Column(Float, default=0.0, comment="成長率（%）")
    profit_margin = Column(Float, default=0.0, comment="利益率（%）")
    
    # メタデータ
    raw_data = Column(JSON, nullable=True, comment="生データJSON")
    
    # タイムスタンプ
    created_at = Column(DateTime, default=func.now(), comment="作成日時")

    # ===== リレーションシップ =====
    
    supplier = relationship("Supplier")

    # ===== インデックス =====
    __table_args__ = (
        Index('idx_supplier_metrics_supplier_date', 'supplier_id', 'metric_date'),
        Index('idx_supplier_metrics_type', 'metric_type'),
        Index('idx_supplier_metrics_date', 'metric_date'),
        {'comment': '仕入先パフォーマンス指標テーブル'}
    )

    def __repr__(self):
        return f"<SupplierPerformanceMetrics(id={self.id}, supplier_id={self.supplier_id}, date='{self.metric_date}')>"

# ===== 設定関連モデル =====

class SupplierConfiguration(Base):
    """
    仕入先設定
    
    仕入先ごとの詳細設定を管理
    """
    __tablename__ = "supplier_configurations"

    id = Column(Integer, primary_key=True, index=True, comment="設定ID")
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), unique=True, nullable=False, comment="仕入先ID")
    
    # 同期設定
    sync_interval_hours = Column(Integer, default=24, comment="同期間隔（時間）")
    auto_sync_enabled = Column(Boolean, default=True, comment="自動同期有効")
    
    # 商品設定
    auto_product_creation = Column(Boolean, default=True, comment="自動商品作成")
    price_update_enabled = Column(Boolean, default=True, comment="価格更新有効")
    inventory_sync_enabled = Column(Boolean, default=True, comment="在庫同期有効")
    
    # フィルター設定
    min_price = Column(Float, nullable=True, comment="最小価格")
    max_price = Column(Float, nullable=True, comment="最大価格")
    excluded_categories = Column(JSON, nullable=True, comment="除外カテゴリ")
    excluded_keywords = Column(JSON, nullable=True, comment="除外キーワード")
    
    # API設定
    api_credentials = Column(JSON, nullable=True, comment="API認証情報")
    rate_limit_per_hour = Column(Integer, default=1000, comment="時間あたりAPI制限")
    
    # 通知設定
    notification_enabled = Column(Boolean, default=True, comment="通知有効")
    notification_email = Column(String(255), nullable=True, comment="通知メール")
    error_notification_enabled = Column(Boolean, default=True, comment="エラー通知有効")
    
    # タイムスタンプ
    created_at = Column(DateTime, default=func.now(), comment="作成日時")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新日時")

    # ===== リレーションシップ =====
    
    supplier = relationship("Supplier")

    # ===== インデックス =====
    __table_args__ = (
        {'comment': '仕入先設定テーブル'}
    )

    def __repr__(self):
        return f"<SupplierConfiguration(id={self.id}, supplier_id={self.supplier_id})>"