# app/domain/schemas/supplier.py
"""
仕入先管理用Pydanticスキーマ

このモジュールは仕入先管理に関連するリクエスト・レスポンススキーマを定義します
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl, validator
from enum import Enum

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

# ===== ベーススキーマ =====

class SupplierBase(BaseModel):
    """仕入先ベーススキーマ"""
    name: str = Field(..., min_length=1, max_length=255, description="仕入先名")
    channel: ChannelType = Field(..., description="販路")
    url: Optional[HttpUrl] = Field(None, description="仕入先URL")
    automation_enabled: bool = Field(True, description="自動化有効フラグ")
    notes: Optional[str] = Field(None, max_length=1000, description="備考")

    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('仕入先名は空にできません')
        return v.strip()

# ===== リクエストスキーマ =====

class SupplierCreate(SupplierBase):
    """仕入先作成リクエスト"""
    pass

class SupplierUpdate(BaseModel):
    """仕入先更新リクエスト"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="仕入先名")
    channel: Optional[ChannelType] = Field(None, description="販路")
    url: Optional[HttpUrl] = Field(None, description="仕入先URL")
    automation_enabled: Optional[bool] = Field(None, description="自動化有効フラグ")
    status: Optional[SupplierStatus] = Field(None, description="ステータス")
    notes: Optional[str] = Field(None, max_length=1000, description="備考")

    @validator('name')
    def validate_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError('仕入先名は空にできません')
        return v.strip() if v else v

# ===== レスポンススキーマ =====

class SupplierResponse(SupplierBase):
    """仕入先レスポンス"""
    id: int = Field(..., description="仕入先ID")
    code: str = Field(..., description="仕入先コード")
    status: SupplierStatus = Field(..., description="ステータス")
    products_count: int = Field(0, description="商品数")
    monthly_amount: float = Field(0, description="月間仕入額")
    last_sync: Optional[datetime] = Field(None, description="最終同期日時")
    error_message: Optional[str] = Field(None, description="エラーメッセージ")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class SupplierListResponse(BaseModel):
    """仕入先一覧レスポンス"""
    suppliers: List[SupplierResponse]
    total: int = Field(..., description="総件数")
    page: int = Field(..., description="現在のページ")
    per_page: int = Field(..., description="1ページあたりの件数")
    total_pages: int = Field(..., description="総ページ数")

# ===== 統計スキーマ =====

class SupplierStats(BaseModel):
    """仕入先統計"""
    total_suppliers: int = Field(..., description="総仕入先数")
    active_suppliers: int = Field(..., description="アクティブ仕入先数")
    monthly_purchase: float = Field(..., description="今月の仕入額")
    automation_rate: float = Field(..., description="自動化率（%）")
    changes: Dict[str, float] = Field(..., description="前月比変化")

class ChannelStats(BaseModel):
    """販路統計"""
    name: str = Field(..., description="販路名")
    code: ChannelType = Field(..., description="販路コード")
    icon: str = Field(..., description="アイコンクラス")
    status: str = Field(..., description="接続状態")
    suppliers_count: int = Field(..., description="仕入先数")
    monthly_amount: float = Field(..., description="月間仕入額")
    automation_rate: float = Field(..., description="自動化率（%）")

# ===== 活動履歴スキーマ =====

class RecentActivity(BaseModel):
    """最近の活動"""
    id: int = Field(..., description="活動ID")
    type: ActivityType = Field(..., description="活動タイプ")
    title: str = Field(..., description="活動タイトル")
    description: str = Field(..., description="活動説明")
    supplier_id: Optional[int] = Field(None, description="関連仕入先ID")
    supplier_name: Optional[str] = Field(None, description="関連仕入先名")
    icon: str = Field(..., description="アイコンクラス")
    icon_type: str = Field(..., description="アイコンタイプ")
    timestamp: datetime = Field(..., description="発生日時")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# ===== 商品関連スキーマ =====

class SupplierProduct(BaseModel):
    """仕入先商品"""
    id: int = Field(..., description="商品ID")
    sku: str = Field(..., description="SKU")
    name: str = Field(..., description="商品名")
    price: float = Field(..., description="価格")
    stock: int = Field(..., description="在庫数")
    status: str = Field(..., description="ステータス")
    last_updated: datetime = Field(..., description="最終更新日時")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# ===== パフォーマンススキーマ =====

class SupplierPerformance(BaseModel):
    """仕入先パフォーマンス"""
    supplier_id: int = Field(..., description="仕入先ID")
    period_start: datetime = Field(..., description="集計期間開始")
    period_end: datetime = Field(..., description="集計期間終了")
    
    # 取引指標
    total_orders: int = Field(..., description="総注文数")
    total_amount: float = Field(..., description="総取引額")
    average_order_amount: float = Field(..., description="平均注文額")
    
    # 品質指標
    success_rate: float = Field(..., description="成功率（%）")
    error_rate: float = Field(..., description="エラー率（%）")
    sync_frequency: float = Field(..., description="同期頻度（回/日）")
    
    # 成長指標
    growth_rate: float = Field(..., description="成長率（%）")
    profit_margin: float = Field(..., description="利益率（%）")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# ===== 同期関連スキーマ =====

class SyncStatus(BaseModel):
    """同期ステータス"""
    supplier_id: int = Field(..., description="仕入先ID")
    is_syncing: bool = Field(..., description="同期中フラグ")
    last_sync: Optional[datetime] = Field(None, description="最終同期日時")
    last_success: Optional[datetime] = Field(None, description="最終成功日時")
    last_error: Optional[datetime] = Field(None, description="最終エラー日時")
    error_message: Optional[str] = Field(None, description="エラーメッセージ")
    sync_count: int = Field(0, description="同期回数")
    success_count: int = Field(0, description="成功回数")
    error_count: int = Field(0, description="エラー回数")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class SyncRequest(BaseModel):
    """同期リクエスト"""
    force: bool = Field(False, description="強制同期フラグ")
    sync_products: bool = Field(True, description="商品同期フラグ")
    sync_inventory: bool = Field(True, description="在庫同期フラグ")
    sync_prices: bool = Field(True, description="価格同期フラグ")

class SyncResult(BaseModel):
    """同期結果"""
    supplier_id: int = Field(..., description="仕入先ID")
    success: bool = Field(..., description="成功フラグ")
    message: str = Field(..., description="結果メッセージ")
    processed_items: int = Field(0, description="処理件数")
    errors: List[str] = Field(default_factory=list, description="エラー一覧")
    duration_seconds: float = Field(..., description="処理時間（秒）")
    sync_timestamp: datetime = Field(..., description="同期実行日時")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# ===== バルク操作スキーマ =====

class BulkUpdateRequest(BaseModel):
    """一括更新リクエスト"""
    supplier_ids: List[int] = Field(..., description="更新対象仕入先ID一覧")
    update_data: Dict[str, Any] = Field(..., description="更新データ")

    @validator('supplier_ids')
    def validate_supplier_ids(cls, v):
        if not v:
            raise ValueError('更新対象の仕入先IDが指定されていません')
        if len(v) > 100:
            raise ValueError('一度に更新できる仕入先数は100件までです')
        return v

class BulkUpdateResult(BaseModel):
    """一括更新結果"""
    total_requested: int = Field(..., description="更新要求件数")
    success_count: int = Field(..., description="成功件数")
    error_count: int = Field(..., description="エラー件数")
    errors: List[Dict[str, Any]] = Field(default_factory=list, description="エラー詳細")

# ===== フィルター・検索スキーマ =====

class SupplierFilter(BaseModel):
    """仕入先フィルター"""
    channel: Optional[ChannelType] = Field(None, description="販路フィルター")
    status: Optional[SupplierStatus] = Field(None, description="ステータスフィルター")
    automation_enabled: Optional[bool] = Field(None, description="自動化フィルター")
    has_products: Optional[bool] = Field(None, description="商品ありフィルター")
    min_amount: Optional[float] = Field(None, description="最小取引額")
    max_amount: Optional[float] = Field(None, description="最大取引額")
    created_after: Optional[datetime] = Field(None, description="作成日時以降")
    created_before: Optional[datetime] = Field(None, description="作成日時以前")

class SupplierSearch(BaseModel):
    """仕入先検索"""
    query: str = Field(..., min_length=1, description="検索クエリ")
    fields: List[str] = Field(
        default=["name", "code", "notes"], 
        description="検索対象フィールド"
    )
    limit: int = Field(10, ge=1, le=50, description="最大取得件数")

# ===== 通知スキーマ =====

class NotificationData(BaseModel):
    """通知データ"""
    unread_count: int = Field(..., description="未読通知数")
    notifications: List[Dict[str, Any]] = Field(default_factory=list, description="通知一覧")

# ===== WebSocket関連スキーマ =====

class WebSocketMessage(BaseModel):
    """WebSocketメッセージ"""
    type: str = Field(..., description="メッセージタイプ")
    data: Dict[str, Any] = Field(..., description="メッセージデータ")
    timestamp: datetime = Field(default_factory=datetime.now, description="送信日時")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class SupplierUpdateEvent(BaseModel):
    """仕入先更新イベント"""
    supplier_id: int = Field(..., description="仕入先ID")
    event_type: str = Field(..., description="イベントタイプ")
    changes: Dict[str, Any] = Field(..., description="変更内容")
    timestamp: datetime = Field(default_factory=datetime.now, description="イベント発生日時")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }