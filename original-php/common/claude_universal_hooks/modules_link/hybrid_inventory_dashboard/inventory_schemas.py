"""
modules/inventory/schemas.py - ハイブリッド在庫管理スキーマ
"""
from pydantic import BaseModel, validator, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum

class InventoryType(str, Enum):
    """在庫タイプ"""
    PHYSICAL = "physical"
    VIRTUAL = "virtual"
    MIXED = "mixed"

class AdjustmentType(str, Enum):
    """調整タイプ"""
    MANUAL = "manual"
    SYNC_FROM_CHANNEL = "sync_from_channel"
    SAFETY_MARGIN = "safety_margin"

class SyncType(str, Enum):
    """同期タイプ"""
    FULL = "full"
    INCREMENTAL = "incremental"
    SPECIFIC_SKUS = "specific_skus"

class RiskLevel(int, Enum):
    """リスクレベル"""
    VERY_LOW = 1
    LOW = 2
    MEDIUM = 3
    HIGH = 4
    CRITICAL = 5

class ChannelInventory(BaseModel):
    """チャネル在庫情報"""
    channel: str = Field(..., description="チャネル名")
    quantity: int = Field(ge=0, description="在庫数量")
    last_sync: datetime = Field(..., description="最終同期日時")
    sync_status: str = Field(..., description="同期ステータス")
    error_message: Optional[str] = Field(None, description="エラーメッセージ")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class HybridInventoryItem(BaseModel):
    """ハイブリッド在庫アイテム"""
    sku: str = Field(..., description="SKU")
    name: str = Field(..., description="商品名")
    physical_stock: int = Field(ge=0, description="物理在庫数")
    virtual_stock: int = Field(ge=0, description="仮想在庫数")
    display_stock: int = Field(ge=0, description="表示在庫数")
    channel_inventories: List[ChannelInventory] = Field(default_factory=list, description="チャネル別在庫")
    risk_level: RiskLevel = Field(default=RiskLevel.VERY_LOW, description="リスクレベル")
    check_interval: timedelta = Field(default=timedelta(hours=12), description="チェック間隔")
    last_check: datetime = Field(default_factory=datetime.utcnow, description="最終チェック日時")
    safety_margin: int = Field(default=1, ge=0, description="安全マージン")
    category: Optional[str] = Field(None, description="カテゴリ")
    cost_price: Optional[Decimal] = Field(None, ge=0, description="仕入れ価格")
    selling_price: Optional[Decimal] = Field(None, ge=0, description="販売価格")
    supplier: Optional[str] = Field(None, description="仕入れ先")
    notes: Optional[str] = Field(None, description="備考")
    
    @validator('check_interval', pre=True)
    def validate_check_interval(cls, v):
        if isinstance(v, int):
            return timedelta(hours=v)
        return v
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            timedelta: lambda v: v.total_seconds(),
            Decimal: lambda v: float(v)
        }

class InventoryFilterRequest(BaseModel):
    """在庫フィルターリクエスト"""
    category: Optional[str] = Field(None, description="カテゴリフィルター")
    inventory_type: Optional[InventoryType] = Field(None, description="在庫タイプフィルター")
    risk_level: Optional[RiskLevel] = Field(None, description="リスクレベルフィルター")
    search: Optional[str] = Field(None, description="検索キーワード")
    page: int = Field(default=1, ge=1, description="ページ番号")
    page_size: int = Field(default=20, ge=1, le=100, description="ページサイズ")
    sort_by: Optional[str] = Field(default="sku", description="ソート項目")
    sort_order: Optional[str] = Field(default="asc", regex="^(asc|desc)$", description="ソート順序")
    min_stock: Optional[int] = Field(None, ge=0, description="最小在庫数")
    max_stock: Optional[int] = Field(None, ge=0, description="最大在庫数")
    supplier: Optional[str] = Field(None, description="仕入れ先フィルター")
    
    @validator('max_stock')
    def validate_stock_range(cls, v, values):
        if v is not None and 'min_stock' in values and values['min_stock'] is not None:
            if v < values['min_stock']:
                raise ValueError('最大在庫数は最小在庫数以上である必要があります')
        return v

class InventoryAdjustmentRequest(BaseModel):
    """在庫調整リクエスト"""
    sku: str = Field(..., description="SKU")
    adjustment_type: AdjustmentType = Field(..., description="調整タイプ")
    new_quantity: Optional[int] = Field(None, ge=0, description="新しい数量（手動調整時）")
    channel: Optional[str] = Field(None, description="対象チャネル（チャネル同期時）")
    safety_margin: Optional[int] = Field(None, ge=0, description="安全マージン（マージン調整時）")
    reason: Optional[str] = Field(None, description="調整理由")
    force: bool = Field(default=False, description="強制実行フラグ")
    
    @validator('new_quantity')
    def validate_manual_adjustment(cls, v, values):
        if values.get('adjustment_type') == AdjustmentType.MANUAL and v is None:
            raise ValueError('手動調整時は新しい数量の指定が必要です')
        return v
    
    @validator('channel')
    def validate_channel_sync(cls, v, values):
        if values.get('adjustment_type') == AdjustmentType.SYNC_FROM_CHANNEL and not v:
            raise ValueError('チャネル同期時はチャネルの指定が必要です')
        return v

class InventorySyncRequest(BaseModel):
    """在庫同期リクエスト"""
    channels: List[str] = Field(..., min_items=1, description="同期対象チャネル")
    sync_type: SyncType = Field(default=SyncType.INCREMENTAL, description="同期タイプ")
    specific_skus: Optional[List[str]] = Field(None, description="特定SKU同期時のSKUリスト")
    force_update: bool = Field(default=False, description="強制更新フラグ")
    dry_run: bool = Field(default=False, description="ドライランフラグ")
    
    @validator('specific_skus')
    def validate_specific_skus(cls, v, values):
        if values.get('sync_type') == SyncType.SPECIFIC_SKUS and (not v or len(v) == 0):
            raise ValueError('特定SKU同期時はSKUリストの指定が必要です')
        return v
    
    @validator('channels')
    def validate_channels(cls, v):
        valid_channels = {'shopify', 'ebay', 'amazon'}
        for channel in v:
            if channel not in valid_channels:
                raise ValueError(f'無効なチャネル: {channel}')
        return v

class InventoryDiscrepancy(BaseModel):
    """在庫差分情報"""
    sku: str = Field(..., description="SKU")
    product_name: str = Field(..., description="商品名")
    local_quantity: int = Field(..., description="ローカル在庫数")
    channel_quantities: Dict[str, int] = Field(default_factory=dict, description="チャネル別在庫数")
    max_difference: int = Field(..., description="最大差分")
    severity: RiskLevel = Field(..., description="重要度")
    auto_adjustable: bool = Field(default=False, description="自動調整可能フラグ")
    recommended_action: str = Field(..., description="推奨アクション")
    detected_at: datetime = Field(default_factory=datetime.utcnow, description="検出日時")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class InventoryStatsResponse(BaseModel):
    """在庫統計レスポンス"""
    total_products: int = Field(..., description="総商品数")
    physical_stock_products: int = Field(..., description="物理在庫商品数")
    virtual_stock_products: int = Field(..., description="仮想在庫商品数")
    out_of_stock_products: int = Field(..., description="在庫切れ商品数")
    low_stock_products: int = Field(..., description="低在庫商品数")
    total_value: float = Field(..., description="総在庫価値")
    average_risk_level: float = Field(..., description="平均リスクレベル")
    
    @validator('total_value', 'average_risk_level')
    def round_float_values(cls, v):
        return round(v, 2)

class InventoryStatusResponse(BaseModel):
    """在庫状況レスポンス"""
    inventory_items: List[HybridInventoryItem] = Field(..., description="在庫アイテムリスト")
    pagination: Dict[str, Any] = Field(..., description="ページネーション情報")
    summary: Dict[str, Any] = Field(..., description="サマリー情報")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="最終更新日時")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class InventoryExportRequest(BaseModel):
    """在庫エクスポートリクエスト"""
    format: str = Field(default="csv", regex="^(csv|json|xlsx)$", description="エクスポート形式")
    filters: Optional[InventoryFilterRequest] = Field(None, description="フィルター条件")
    include_channel_details: bool = Field(default=True, description="チャネル詳細を含むかどうか")
    include_history: bool = Field(default=False, description="履歴を含むかどうか")

class InventoryImportRequest(BaseModel):
    """在庫インポートリクエスト"""
    file_content: str = Field(..., description="ファイル内容（Base64エンコード）")
    format: str = Field(..., regex="^(csv|json|xlsx)$", description="ファイル形式")
    update_mode: str = Field(default="merge", regex="^(merge|replace|append)$", description="更新モード")
    validate_only: bool = Field(default=False, description="バリデーションのみ実行")
    
class InventoryAlert(BaseModel):
    """在庫アラート"""
    alert_id: str = Field(..., description="アラートID")
    sku: str = Field(..., description="SKU")
    product_name: str = Field(..., description="商品名")
    alert_type: str = Field(..., description="アラートタイプ")
    message: str = Field(..., description="アラートメッセージ")
    severity: RiskLevel = Field(..., description="重要度")
    triggered_at: datetime = Field(default_factory=datetime.utcnow, description="発生日時")
    acknowledged: bool = Field(default=False, description="確認済みフラグ")
    resolved: bool = Field(default=False, description="解決済みフラグ")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class InventorySettings(BaseModel):
    """在庫設定"""
    default_safety_margin: int = Field(default=1, ge=0, description="デフォルト安全マージン")
    auto_adjustment_enabled: bool = Field(default=False, description="自動調整有効フラグ")
    sync_interval_hours: int = Field(default=12, ge=1, le=168, description="同期間隔（時間）")
    low_stock_threshold: int = Field(default=5, ge=0, description="低在庫閾値")
    alert_enabled: bool = Field(default=True, description="アラート有効フラグ")
    email_notifications: bool = Field(default=True, description="メール通知有効フラグ")
    webhook_url: Optional[str] = Field(None, description="Webhook URL")

class InventoryRule(BaseModel):
    """在庫ルール"""
    rule_id: str = Field(..., description="ルールID")
    name: str = Field(..., description="ルール名")
    condition: Dict[str, Any] = Field(..., description="実行条件")
    action: Dict[str, Any] = Field(..., description="実行アクション")
    enabled: bool = Field(default=True, description="有効フラグ")
    priority: int = Field(default=1, ge=1, le=10, description="優先度")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="作成日時")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新日時")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class InventoryHistory(BaseModel):
    """在庫履歴"""
    history_id: str = Field(..., description="履歴ID")
    sku: str = Field(..., description="SKU")
    action: str = Field(..., description="アクション")
    old_quantity: Optional[int] = Field(None, description="変更前数量")
    new_quantity: Optional[int] = Field(None, description="変更後数量")
    channel: Optional[str] = Field(None, description="チャネル")
    user_id: str = Field(..., description="実行ユーザーID")
    reason: Optional[str] = Field(None, description="理由")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="実行日時")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }