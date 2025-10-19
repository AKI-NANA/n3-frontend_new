"""
app/domain/models/asin_upload.py - ASINアップロードデータモデル
用途: ASINアップロード機能のデータベースエンティティ定義
修正対象: 新しいASIN処理要件追加時、バッチ処理仕様変更時
"""

from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

from app.domain.models.base import BaseEntity

class ASINUploadStatus(str, Enum):
    """ASINアップロードステータス"""
    PENDING = "pending"           # 処理待ち
    PROCESSING = "processing"     # 処理中
    VALIDATING = "validating"     # バリデーション中
    COMPLETED = "completed"       # 完了
    FAILED = "failed"            # 失敗
    CANCELLED = "cancelled"       # キャンセル

class ASINDataSource(str, Enum):
    """ASINデータソース"""
    MANUAL_UPLOAD = "manual_upload"     # 手動アップロード
    CSV_IMPORT = "csv_import"           # CSVインポート
    BULK_IMPORT = "bulk_import"         # 一括インポート
    API_SYNC = "api_sync"               # API同期
    SCHEDULED_TASK = "scheduled_task"   # スケジュールタスク

class ASINProcessingType(str, Enum):
    """ASIN処理タイプ"""
    CREATE_NEW = "create_new"           # 新規作成
    UPDATE_EXISTING = "update_existing" # 既存更新
    MERGE_DATA = "merge_data"           # データマージ
    VALIDATE_ONLY = "validate_only"     # バリデーションのみ

class ASINUploadModel(BaseEntity):
    """
    ASINアップロードモデル

    説明: ASINアップロード処理の管理とトラッキング
    主要機能: バッチ処理管理、進捗追跡、エラーハンドリング
    修正対象: 新しいASIN処理要件追加時
    """

    # === 基本情報 ===
    upload_id = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        comment="アップロード一意識別子"
    )

    batch_name = Column(
        String(255),
        nullable=False,
        comment="バッチ名（ユーザー指定）"
    )

    description = Column(
        Text,
        nullable=True,
        comment="アップロード説明"
    )

    # === ステータス管理 ===
    status = Column(
        String(20),
        default=ASINUploadStatus.PENDING,
        nullable=False,
        index=True,
        comment="処理ステータス"
    )

    data_source = Column(
        String(30),
        default=ASINDataSource.MANUAL_UPLOAD,
        nullable=False,
        comment="データソース種別"
    )

    processing_type = Column(
        String(30),
        default=ASINProcessingType.CREATE_NEW,
        nullable=False,
        comment="処理タイプ"
    )

    # === ファイル情報 ===
    original_filename = Column(
        String(255),
        nullable=True,
        comment="元ファイル名"
    )

    file_path = Column(
        String(500),
        nullable=True,
        comment="アップロードファイルパス"
    )

    file_size = Column(
        Integer,
        nullable=True,
        comment="ファイルサイズ（バイト）"
    )

    file_hash = Column(
        String(64),
        nullable=True,
        index=True,
        comment="ファイルハッシュ（SHA-256）"
    )

    # === 処理統計 ===
    total_records = Column(
        Integer,
        default=0,
        nullable=False,
        comment="総レコード数"
    )

    processed_records = Column(
        Integer,
        default=0,
        nullable=False,
        comment="処理済みレコード数"
    )

    successful_records = Column(
        Integer,
        default=0,
        nullable=False,
        comment="成功レコード数"
    )

    failed_records = Column(
        Integer,
        default=0,
        nullable=False,
        comment="失敗レコード数"
    )

    skipped_records = Column(
        Integer,
        default=0,
        nullable=False,
        comment="スキップレコード数"
    )

    # === 進捗管理 ===
    progress_percentage = Column(
        Float,
        default=0.0,
        nullable=False,
        comment="進捗率（0.0-100.0）"
    )

    current_step = Column(
        String(100),
        nullable=True,
        comment="現在の処理ステップ"
    )

    estimated_completion_time = Column(
        DateTime,
        nullable=True,
        comment="完了予定時刻"
    )

    # === 実行時間 ===
    started_at = Column(
        DateTime,
        nullable=True,
        comment="処理開始時刻"
    )

    completed_at = Column(
        DateTime,
        nullable=True,
        comment="処理完了時刻"
    )

    processing_duration = Column(
        Float,
        nullable=True,
        comment="処理時間（秒）"
    )

    # === エラー情報 ===
    error_message = Column(
        Text,
        nullable=True,
        comment="エラーメッセージ"
    )

    error_details = Column(
        JSON,
        nullable=True,
        comment="詳細エラー情報（JSON）"
    )

    validation_errors = Column(
        JSON,
        nullable=True,
        comment="バリデーションエラー（JSON）"
    )

    # === 設定・オプション ===
    processing_options = Column(
        JSON,
        nullable=True,
        comment="処理オプション（JSON）"
    )

    retry_count = Column(
        Integer,
        default=0,
        nullable=False,
        comment="リトライ回数"
    )

    max_retries = Column(
        Integer,
        default=3,
        nullable=False,
        comment="最大リトライ回数"
    )

    # === 実行者情報 ===
    uploaded_by = Column(
        String(100),
        nullable=True,
        comment="アップロード実行者"
    )

    executed_by = Column(
        String(100),
        nullable=True,
        comment="処理実行者（システム/ユーザー）"
    )

    # === 外部連携 ===
    external_job_id = Column(
        String(100),
        nullable=True,
        comment="外部ジョブID（Celery等）"
    )

    webhook_url = Column(
        String(500),
        nullable=True,
        comment="完了通知WebhookURL"
    )

    # === フラグ ===
    is_background_task = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="バックグラウンドタスクフラグ"
    )

    auto_start = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="自動開始フラグ"
    )

    send_notification = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="完了通知送信フラグ"
    )

    # === リレーションシップ ===
    asin_records = relationship(
        "ASINRecordModel",
        back_populates="upload_batch",
        cascade="all, delete-orphan",
        order_by="ASINRecordModel.record_index"
    )

    # 処理ログ（1:N）
    processing_logs = relationship(
        "ASINProcessingLogModel",
        back_populates="upload_batch",
        cascade="all, delete-orphan",
        order_by="ASINProcessingLogModel.created_at"
    )

    # === インデックス定義 ===
    __table_args__ = (
        Index("idx_asin_upload_status", "status", "created_at"),
        Index("idx_asin_upload_user", "uploaded_by", "created_at"),
        Index("idx_asin_upload_progress", "status", "progress_percentage"),
    )

    # === ビジネスメソッド ===

    def __init__(self, **kwargs):
        """初期化時にアップロードIDを自動生成"""
        if 'upload_id' not in kwargs:
            kwargs['upload_id'] = f"ASIN-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8]}"
        super().__init__(**kwargs)

    def calculate_progress(self) -> float:
        """
        進捗率計算

        説明: 処理済みレコード数から進捗率を計算
        戻り値: 進捗率（0.0-100.0）
        修正対象: 進捗計算ロジック変更時
        """
        if self.total_records == 0:
            return 0.0
        
        progress = (self.processed_records / self.total_records) * 100
        self.progress_percentage = min(100.0, max(0.0, progress))
        return self.progress_percentage

    def update_progress(self, current_record: int, current_step: str = "") -> None:
        """
        進捗更新

        説明: 現在の処理レコード数と進捗率を更新
        修正対象: 進捗更新ロジック変更時
        """
        self.processed_records = current_record
        if current_step:
            self.current_step = current_step
        
        self.calculate_progress()
        self.updated_at = datetime.utcnow()

    def start_processing(self, executed_by: str = "system") -> None:
        """
        処理開始

        説明: 処理開始時のステータス更新
        修正対象: 開始時の初期化処理変更時
        """
        self.status = ASINUploadStatus.PROCESSING
        self.started_at = datetime.utcnow()
        self.executed_by = executed_by
        self.current_step = "処理開始"
        self.updated_at = datetime.utcnow()

    def complete_processing(self, successful: int = None, failed: int = None) -> None:
        """
        処理完了

        説明: 処理完了時のステータスと統計更新
        修正対象: 完了時の処理変更時
        """
        self.status = ASINUploadStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.progress_percentage = 100.0
        self.current_step = "処理完了"
        
        if successful is not None:
            self.successful_records = successful
        if failed is not None:
            self.failed_records = failed
        
        # 処理時間計算
        if self.started_at:
            duration = (self.completed_at - self.started_at).total_seconds()
            self.processing_duration = duration
        
        self.updated_at = datetime.utcnow()

    def fail_processing(self, error_message: str, error_details: Dict[str, Any] = None) -> None:
        """
        処理失敗

        説明: 処理失敗時のエラー情報設定
        修正対象: エラー処理ロジック変更時
        """
        self.status = ASINUploadStatus.FAILED
        self.error_message = error_message
        self.error_details = error_details or {}
        self.completed_at = datetime.utcnow()
        
        # 処理時間計算
        if self.started_at:
            duration = (self.completed_at - self.started_at).total_seconds()
            self.processing_duration = duration
        
        self.updated_at = datetime.utcnow()

    def can_retry(self) -> bool:
        """
        リトライ可能性判定

        説明: 最大リトライ回数に達していないかチェック
        修正対象: リトライ条件変更時
        """
        return self.retry_count < self.max_retries and self.status == ASINUploadStatus.FAILED

    def increment_retry(self) -> None:
        """
        リトライ回数増加

        説明: リトライ実行時の回数増加
        修正不要: 自動処理
        """
        self.retry_count += 1
        self.status = ASINUploadStatus.PENDING
        self.error_message = None
        self.error_details = None
        self.updated_at = datetime.utcnow()

    def estimate_completion_time(self, records_per_second: float = 10.0) -> Optional[datetime]:
        """
        完了予定時刻推定

        説明: 処理速度から完了予定時刻を推定
        修正対象: 推定アルゴリズム変更時
        """
        if self.total_records == 0 or self.processed_records >= self.total_records:
            return None
        
        remaining_records = self.total_records - self.processed_records
        estimated_seconds = remaining_records / records_per_second
        
        self.estimated_completion_time = datetime.utcnow() + timedelta(seconds=estimated_seconds)
        return self.estimated_completion_time

    def get_processing_summary(self) -> Dict[str, Any]:
        """
        処理サマリ取得

        説明: 処理状況の概要情報を辞書形式で取得
        修正対象: サマリ項目追加時
        """
        return {
            "upload_id": self.upload_id,
            "batch_name": self.batch_name,
            "status": self.status,
            "progress_percentage": self.progress_percentage,
            "total_records": self.total_records,
            "processed_records": self.processed_records,
            "successful_records": self.successful_records,
            "failed_records": self.failed_records,
            "skipped_records": self.skipped_records,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "processing_duration": self.processing_duration,
            "current_step": self.current_step,
            "error_message": self.error_message,
            "retry_count": self.retry_count,
            "can_retry": self.can_retry()
        }

class ASINRecordModel(BaseEntity):
    """
    個別ASINレコードモデル

    説明: アップロードされた個別のASINデータを管理
    修正対象: ASINデータ項目追加時
    """

    # === 関連情報 ===
    upload_batch_id = Column(
        Integer,
        ForeignKey("asin_upload_model.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="アップロードバッチID"
    )

    record_index = Column(
        Integer,
        nullable=False,
        comment="レコード番号（ファイル内順序）"
    )

    # === ASINデータ ===
    asin_code = Column(
        String(20),
        nullable=False,
        index=True,
        comment="ASIN コード"
    )

    product_title = Column(
        Text,
        nullable=True,
        comment="商品タイトル"
    )

    brand = Column(
        String(100),
        nullable=True,
        comment="ブランド"
    )

    category = Column(
        String(100),
        nullable=True,
        comment="カテゴリ"
    )

    price = Column(
        Float,
        nullable=True,
        comment="価格"
    )

    availability = Column(
        String(50),
        nullable=True,
        comment="在庫状況"
    )

    # === 処理ステータス ===
    processing_status = Column(
        String(20),
        default="pending",
        nullable=False,
        comment="個別処理ステータス"
    )

    validation_result = Column(
        String(20),
        nullable=True,
        comment="バリデーション結果"
    )

    processing_result = Column(
        String(20),
        nullable=True,
        comment="処理結果"
    )

    # === エラー情報 ===
    error_message = Column(
        Text,
        nullable=True,
        comment="エラーメッセージ"
    )

    validation_errors = Column(
        JSON,
        nullable=True,
        comment="バリデーションエラー詳細"
    )

    # === 処理詳細 ===
    processed_at = Column(
        DateTime,
        nullable=True,
        comment="処理実行時刻"
    )

    processing_duration = Column(
        Float,
        nullable=True,
        comment="処理時間（秒）"
    )

    # === 生データ ===
    raw_data = Column(
        JSON,
        nullable=True,
        comment="元データ（JSON形式）"
    )

    processed_data = Column(
        JSON,
        nullable=True,
        comment="処理後データ（JSON形式）"
    )

    # === 外部連携 ===
    external_id = Column(
        String(100),
        nullable=True,
        comment="外部システムID"
    )

    sync_status = Column(
        String(20),
        nullable=True,
        comment="同期ステータス"
    )

    # === リレーションシップ ===
    upload_batch = relationship("ASINUploadModel", back_populates="asin_records")

    # === インデックス定義 ===
    __table_args__ = (
        Index("idx_asin_record_batch", "upload_batch_id", "record_index"),
        Index("idx_asin_record_asin", "asin_code"),
        Index("idx_asin_record_status", "processing_status", "validation_result"),
    )

class ASINProcessingLogModel(BaseEntity):
    """
    ASIN処理ログモデル

    説明: ASIN処理の詳細ログを記録
    修正対象: ログ項目追加時
    """

    # === 関連情報 ===
    upload_batch_id = Column(
        Integer,
        ForeignKey("asin_upload_model.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="アップロードバッチID"
    )

    # === ログ情報 ===
    log_level = Column(
        String(10),
        nullable=False,
        comment="ログレベル（DEBUG/INFO/WARN/ERROR）"
    )

    message = Column(
        Text,
        nullable=False,
        comment="ログメッセージ"
    )

    details = Column(
        JSON,
        nullable=True,
        comment="詳細情報（JSON）"
    )

    # === 実行コンテキスト ===
    step_name = Column(
        String(100),
        nullable=True,
        comment="処理ステップ名"
    )

    record_index = Column(
        Integer,
        nullable=True,
        comment="対象レコード番号"
    )

    execution_time = Column(
        Float,
        nullable=True,
        comment="実行時間（秒）"
    )

    # === リレーションシップ ===
    upload_batch = relationship("ASINUploadModel", back_populates="processing_logs")

    # === インデックス定義 ===
    __table_args__ = (
        Index("idx_asin_log_batch", "upload_batch_id", "created_at"),
        Index("idx_asin_log_level", "log_level", "created_at"),
    )

# === 使用例 ===

"""
# ASINアップロードの基本的な使用例:

# アップロードバッチ作成
upload_batch = ASINUploadModel(
    batch_name="2024年1月ASIN一括アップロード",
    description="新商品ASINの一括登録",
    data_source=ASINDataSource.CSV_IMPORT,
    processing_type=ASINProcessingType.CREATE_NEW,
    total_records=1000,
    uploaded_by="user123"
)

# 処理開始
upload_batch.start_processing("system")

# 進捗更新
upload_batch.update_progress(500, "データバリデーション中")

# 個別レコード作成
asin_record = ASINRecordModel(
    upload_batch_id=upload_batch.id,
    record_index=1,
    asin_code="B08N5WRWNW",
    product_title="Echo Dot (4th Gen)",
    brand="Amazon",
    price=4980.0
)

# 処理完了
upload_batch.complete_processing(successful=950, failed=50)

# 処理サマリ取得
summary = upload_batch.get_processing_summary()
"""