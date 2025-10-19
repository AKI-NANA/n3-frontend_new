"""
modules/inventory/__init__.py - ハイブリッド在庫管理モジュール初期化
"""
from .routes import router as inventory_router
from .services import InventoryService
from .schemas import (
    HybridInventoryItem,
    InventoryFilterRequest,
    InventoryAdjustmentRequest,
    InventorySyncRequest,
    InventoryStatsResponse,
    InventoryDiscrepancy,
    ChannelInventory
)

__version__ = "1.0.0"
__author__ = "Emverze Development Team"
__description__ = "ハイブリッド在庫管理システム - Shopify、eBay、Amazon在庫の統一管理"

# エクスポート対象
__all__ = [
    "inventory_router",
    "InventoryService", 
    "HybridInventoryItem",
    "InventoryFilterRequest",
    "InventoryAdjustmentRequest", 
    "InventorySyncRequest",
    "InventoryStatsResponse",
    "InventoryDiscrepancy",
    "ChannelInventory"
]

# モジュール設定
INVENTORY_CONFIG = {
    "default_safety_margin": 1,
    "auto_sync_interval_hours": 12,
    "max_risk_level": 5,
    "supported_channels": ["shopify", "ebay", "amazon"],
    "default_page_size": 20,
    "max_page_size": 100
}

def get_inventory_config():
    """在庫管理設定取得"""
    return INVENTORY_CONFIG.copy()

def validate_channel(channel: str) -> bool:
    """チャネル名バリデーション"""
    return channel in INVENTORY_CONFIG["supported_channels"]