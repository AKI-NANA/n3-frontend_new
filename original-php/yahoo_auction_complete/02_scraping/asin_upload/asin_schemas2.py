"""
app/domain/schemas/asin_schemas.py - ASINアップロード Pydanticスキーマ
用途: API リクエスト・レスポンスのデータ構造定義
修正対象: API仕様変更時、バリデーションルール変更時
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, validator, root_validator
from enum import Enum
import re

from app.domain.models.asin_upload import ASINUploadStatus, ASINDataSource, ASINProcessingType

# === 基本スキーマ ===

class ASINUploadStatusEnum(str, Enum):
    """ASINアップロードステータス（API用）"""
    PENDING = "pending"
    PROCESSING = "processing"
    VALIDATING = "validating"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ASINDataSourceEnum(str, Enum):
    """ASINデータソース（API用）"""
    MANUAL_UPLOAD = "manual_upload"
    CSV_IMPORT = "csv_import"
    BULK_IMPORT = "bulk_import"
    API_SYNC = "api_sync"
    SCHEDULED_TASK = "scheduled_task"

class ASINProcessingTypeEnum(str, Enum):
    """ASIN処理タイプ（API用）"""
    CREATE_NEW = "create_new"
    UPDATE_EXISTING = "update_existing"
    MERGE_DATA = "merge_data"
    VALIDATE_ONLY = "validate_only"

# === リクエストスキーマ ===

class ASINUploadCreateRequest(BaseModel):
    """
    ASINアップロード作成リクエスト

    説明: 新しいASINアップロードバッチを作成する際のリクエストデータ
    修正対象: 作成時の必須項目変更時
    """
    
    batch_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="バッチ名（必須）"
    )
    
    description: Optional[str] = Field(
        None,
        max_length=1000,
        description="アップロード説明"
    )
    
    data_source: ASINDataSourceEnum = Field(
        ASINDataSourceEnum.MANUAL_UPLOAD,
        description="データソース種別"
    )
    
    processing_type: ASINProcessingTypeEnum = Field(
        ASINProcessingTypeEnum.CREATE_NEW,
        description="処理タイプ"
    )
    
    processing_options: Optional[Dict[str, Any]] = Field(
        None,
        description="処理オプション"
    )
    
    auto_start: bool = Field(
        True,
        description="自動開始フラグ"
    )
    
    send_notification: bool = Field(
        True,
        description="完了通知送信フラグ"
    )
    
    webhook_url: Optional[str] = Field(
        None,
        max_length=500,
        description="完了通知WebhookURL"
    )

    @validator('batch_name')
    def validate_batch_name(cls, v):
        """バッチ名バリデーション"""
        if not v or not v.strip():
            raise ValueError('バッチ名は必須です')
        
        # 特殊文字チェック
        if re.search(r'[<>:"/\\|?*]', v):
            raise ValueError('バッチ名に使用できない文字が含まれています')
        
        return v.strip()

    @validator('webhook_url')
    def validate_webhook_url(cls, v):
        """WebhookURLバリデーション"""
        if v and not re.match(r'^https?://', v):
            raise ValueError('WebhookURLはhttp://またはhttps://で始まる必要があります')
        return v

class ASINRecordCreateRequest(BaseModel):
    """
    個別ASINレコード作成リクエスト

    説明: 個別のASINデータを登録する際のリクエストデータ
    修正対象: ASINデータ項目変更時
    """
    
    asin_code: str = Field(
        ...,
        min_length=10,
        max_length=10,
        description="ASIN コード（10文字）"
    )
    
    product_title: Optional[str] = Field(
        None,
        max_length=500,
        description="商品タイトル"
    )
    
    brand: Optional[str] = Field(
        None,
        max_length=100,
        description="ブランド"
    )
    
    category: Optional[str] = Field(
        None,
        max_length=100,
        description="カテゴリ"
    )
    
    price: Optional[float] = Field(
        None,
        ge=0.0,
        description="価格（0以上）"
    )
    
    availability: Optional[str] = Field(
        None,
        max_length=50,
        description="在庫状況"
    )
    
    raw_data: Optional[Dict[str, Any]] = Field(
        None,
        description="生データ（オプション）"
    )

    @validator('asin_code')
    def validate_asin_code(cls, v):
        """ASINコードバリデーション"""
        if not v:
            raise ValueError('ASINコードは必須です')
        
        # ASIN形式チェック（英数字10文字）
        if not re.match(r'^[A-Z0-9]{10}$', v.upper()):
            raise ValueError('ASINコードは英数字10文字である必要があります')
        
        return v.upper()

    @validator('price')
    def validate_price(cls, v):
        """価格バリデーション"""
        if v is not None and v < 0:
            raise ValueError('価格は0以上である必要があります')
        return v

class ASINBulkUploadRequest(BaseModel):
    """
    ASINバルクアップロードリクエスト

    説明: 複数のASINを一括アップロードする際のリクエストデータ
    修正対象: バルクアップロード仕様変更時
    """
    
    batch_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="バッチ名"
    )
    
    description: Optional[str] = Field(
        None,
        max_length=1000,
        description="説明"
    )
    
    processing_type: ASINProcessingTypeEnum = Field(
        ASINProcessingTypeEnum.CREATE_NEW,
        description="処理タイプ"
    )
    
    asin_records: List[ASINRecordCreateRequest] = Field(
        ...,
        min_items=1,
        max_items=1000,
        description="ASINレコードリスト（1-1000件）"
    )
    
    processing_options: Optional[Dict[str, Any]] = Field(
        None,
        description="処理オプション"
    )
    
    auto_start: bool = Field(
        True,
        description="自動開始フラグ"
    )

    @validator('asin_records')
    def validate_asin_records(cls, v):
        """ASINレコードリストバリデーション"""
        if not v:
            raise ValueError('ASINレコードは1件以上必要です')
        
        if len(v) > 1000:
            raise ValueError('ASINレコードは1000件以下である必要があります')
        
        # ASIN重複チェック
        asin_codes = [record.asin_code for record in v]
        if len(asin_codes) != len(set(asin_codes)):
            raise ValueError('重複するASINコードが含まれています')
        
        return v

class ASINUploadUpdateRequest(BaseModel):
    """
    ASINアップロード更新リクエスト

    説明: 既存のASINアップロードバッチを更新する際のリクエストデータ
    修正対象: 更新可能項目変更時
    """
    
    batch_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="バッチ名"
    )
    
    description: Optional[str] = Field(
        None,
        max_length=1000,
        description="説明"
    )
    
    processing_options: Optional[Dict[str, Any]] = Field(
        None,
        description="処理オプション"
    )
    
    send_notification: Optional[bool] = Field(
        None,
        description="完了通知送信フラグ"
    )
    
    webhook_url: Optional[str] = Field(
        None,
        max_length=500,
        description="WebhookURL"
    )

class ASINUploadActionRequest(BaseModel):
    """
    ASINアップロードアクションリクエスト

    説明: アップロードバッチに対するアクション実行リクエスト
    修正対象: 新しいアクション追加時
    """
    
    action: str = Field(
        ...,
        description="実行アクション（start/pause/resume/cancel/retry）"
    )
    
    parameters: Optional[Dict[str, Any]] = Field(
        None,
        description="アクションパラメータ"
    )

    @validator('action')
    def validate_action(cls, v):
        """アクションバリデーション"""
        valid_actions = ['start', 'pause', 'resume', 'cancel', 'retry']
        if v not in valid_actions:
            raise ValueError(f'無効なアクションです。有効な値: {", ".join(valid_actions)}')
        return v

# === レスポンススキーマ ===

class ASINRecordResponse(BaseModel):
    """
    個別ASINレコードレスポンス

    説明: 個別ASINレコードのAPI レスポンス形式
    修正対象: レスポンス項目変更時
    """
    
    id: int = Field(..., description="レコードID")
    record_index: int = Field(..., description="レコード番号")
    asin_code: str = Field(..., description="ASINコード")
    product_title: Optional[str] = Field(None, description="商品タイトル")
    brand: Optional[str] = Field(None, description="ブランド")
    category: Optional[str] = Field(None, description="カテゴリ")
    price: Optional[float] = Field(None, description="価格")
    availability: Optional[str] = Field(None, description="在庫状況")
    processing_status: str = Field(..., description="処理ステータス")
    validation_result: Optional[str] = Field(None, description="バリデーション結果")
    processing_result: Optional[str] = Field(None, description="処理結果")
    error_message: Optional[str] = Field(None, description="エラーメッセージ")
    processed_at: Optional[datetime] = Field(None, description="処理実行時刻")
    processing_duration: Optional[float] = Field(None, description="処理時間")
    
    class Config:
        from_attributes = True

class ASINUploadResponse(BaseModel):
    """
    ASINアップロードレスポンス

    説明: ASINアップロードバッチのAPI レスポンス形式
    修正対象: レスポンス項目変更時
    """
    
    id: int = Field(..., description="アップロードID")
    upload_id: str = Field(..., description="アップロード一意識別子")
    batch_name: str = Field(..., description="バッチ名")
    description: Optional[str] = Field(None, description="説明")
    status: ASINUploadStatusEnum = Field(..., description="処理ステータス")
    data_source: ASINDataSourceEnum = Field(..., description="データソース")
    processing_type: ASINProcessingTypeEnum = Field(..., description="処理タイプ")
    
    # 統計情報
    total_records: int = Field(..., description="総レコード数")
    processed_records: int = Field(..., description="処理済みレコード数")
    successful_records: int = Field(..., description="成功レコード数")
    failed_records: int = Field(..., description="失敗レコード数")
    skipped_records: int = Field(..., description="スキップレコード数")
    
    # 進捗情報
    progress_percentage: float = Field(..., description="進捗率")
    current_step: Optional[str] = Field(None, description="現在のステップ")
    estimated_completion_time: Optional[datetime] = Field(None, description="完了予定時刻")
    
    # 実行時間
    created_at: datetime = Field(..., description="作成日時")
    started_at: Optional[datetime] = Field(None, description="開始日時")
    completed_at: Optional[datetime] = Field(None, description="完了日時")
    processing_duration: Optional[float] = Field(None, description="処理時間")
    
    # エラー情報
    error_message: Optional[str] = Field(None, description="エラーメッセージ")
    retry_count: int = Field(..., description="リトライ回数")
    
    # 実行者情報
    uploaded_by: Optional[str] = Field(None, description="アップロード実行者")
    
    class Config:
        from_attributes = True

class ASINUploadDetailResponse(ASINUploadResponse):
    """
    ASINアップロード詳細レスポンス

    説明: ASINアップロードバッチの詳細情報レスポンス
    修正対象: 詳細項目変更時
    """
    
    # ファイル情報
    original_filename: Optional[str] = Field(None, description="元ファイル名")
    file_size: Optional[int] = Field(None, description="ファイルサイズ")
    
    # 設定情報
    processing_options: Optional[Dict[str, Any]] = Field(None, description="処理オプション")
    max_retries: int = Field(..., description="最大リトライ回数")
    auto_start: bool = Field(..., description="自動開始フラグ")
    send_notification: bool = Field(..., description="通知送信フラグ")
    
    # 詳細エラー情報
    error_details: Optional[Dict[str, Any]] = Field(None, description="詳細エラー情報")
    validation_errors: Optional[Dict[str, Any]] = Field(None, description="バリデーションエラー")
    
    # 関連レコード
    asin_records: List[ASINRecordResponse] = Field([], description="ASINレコードリスト")

class ASINUploadListResponse(BaseModel):
    """
    ASINアップロードリストレスポンス

    説明: ASINアップロードバッチのリスト表示用レスポンス
    修正対象: リスト表示項目変更時
    """
    
    uploads: List[ASINUploadResponse] = Field(..., description="アップロードリスト")
    total: int = Field(..., description="総件数")
    page: int = Field(..., description="現在のページ")
    per_page: int = Field(..., description="1ページあたりの件数")
    total_pages: int = Field(..., description="総ページ数")

class ASINUploadStatsResponse(BaseModel):
    """
    ASINアップロード統計レスポンス

    説明: ASINアップロードの統計情報レスポンス
    修正対象: 統計項目変更時
    """
    
    total_uploads: int = Field(..., description="総アップロード数")
    active_uploads: int = Field(..., description="実行中アップロード数")
    completed_uploads: int = Field(..., description="完了アップロード数")
    failed_uploads: int = Field(..., description="失敗アップロード数")
    total_records_processed: int = Field(..., description="総処理レコード数")
    average_processing_time: Optional[float] = Field(None, description="平均処理時間")
    success_rate: float = Field(..., description="成功率")

# === バリデーションスキーマ ===

class ASINValidationRequest(BaseModel):
    """
    ASINバリデーションリクエスト

    説明: ASINデータのバリデーション専用リクエスト
    修正対象: バリデーションルール変更時
    """
    
    asin_codes: List[str] = Field(
        ...,
        min_items=1,
        max_items=100,
        description="ASINコードリスト（1-100件）"
    )
    
    validation_options: Optional[Dict[str, Any]] = Field(
        None,
        description="バリデーションオプション"
    )

    @validator('asin_codes')
    def validate_asin_codes(cls, v):
        """ASINコードリストバリデーション"""
        if not v:
            raise ValueError('ASINコードは1件以上必要です')
        
        # 各ASINの形式チェック
        for asin in v:
            if not re.match(r'^[A-Z0-9]{10}$', asin.upper()):
                raise ValueError(f'無効なASINコード: {asin}')
        
        # 重複チェック
        if len(v) != len(set(v)):
            raise ValueError('重複するASINコードが含まれています')
        
        return [asin.upper() for asin in v]

class ASINValidationResponse(BaseModel):
    """
    ASINバリデーションレスポンス

    説明: ASINバリデーション結果のレスポンス
    修正対象: バリデーション結果項目変更時
    """
    
    asin_code: str = Field(..., description="ASINコード")
    is_valid: bool = Field(..., description="有効性")
    exists: Optional[bool] = Field(None, description="Amazon存在確認")
    product_info: Optional[Dict[str, Any]] = Field(None, description="商品情報")
    validation_errors: List[str] = Field([], description="バリデーションエラー")
    validation_warnings: List[str] = Field([], description="バリデーション警告")

# === エクスポートスキーマ ===

class ASINExportRequest(BaseModel):
    """
    ASINエクスポートリクエスト

    説明: ASINデータのエクスポート用リクエスト
    修正対象: エクスポート仕様変更時
    """
    
    upload_ids: Optional[List[str]] = Field(
        None,
        description="エクスポート対象アップロードID（指定しない場合は全て）"
    )
    
    status_filter: Optional[List[ASINUploadStatusEnum]] = Field(
        None,
        description="ステータスフィルター"
    )
    
    date_from: Optional[datetime] = Field(
        None,
        description="開始日時"
    )
    
    date_to: Optional[datetime] = Field(
        None,
        description="終了日時"
    )
    
    format: str = Field(
        "csv",
        description="出力形式（csv/excel/json）"
    )
    
    include_details: bool = Field(
        False,
        description="詳細情報含む"
    )

    @validator('format')
    def validate_format(cls, v):
        """フォーマットバリデーション"""
        valid_formats = ['csv', 'excel', 'json']
        if v not in valid_formats:
            raise ValueError(f'無効な出力形式です。有効な値: {", ".join(valid_formats)}')
        return v

    @root_validator
    def validate_date_range(cls, values):
        """日付範囲バリデーション"""
        date_from = values.get('date_from')
        date_to = values.get('date_to')
        
        if date_from and date_to and date_from > date_to:
            raise ValueError('開始日時は終了日時より前である必要があります')
        
        return values

# === 使用例 ===

"""
# ASINアップロードスキーマの基本的な使用例:

# バルクアップロードリクエスト作成
request_data = ASINBulkUploadRequest(
    batch_name="2024年1月新商品ASIN",
    description="新商品の一括登録",
    processing_type=ASINProcessingTypeEnum.CREATE_NEW,
    asin_records=[
        ASINRecordCreateRequest(
            asin_code="B08N5WRWNW",
            product_title="Echo Dot (4th Gen)",
            brand="Amazon",
            price=4980.0
        ),
        ASINRecordCreateRequest(
            asin_code="B08ZSWQWR5",
            product_title="Fire TV Stick 4K Max",
            brand="Amazon", 
            price=6980.0
        )
    ]
)

# バリデーション実行
validation_request = ASINValidationRequest(
    asin_codes=["B08N5WRWNW", "B08ZSWQWR5"],
    validation_options={"check_amazon_existence": True}
)

# エクスポートリクエスト作成
export_request = ASINExportRequest(
    status_filter=[ASINUploadStatusEnum.COMPLETED],
    format="csv",
    include_details=True
)
"""