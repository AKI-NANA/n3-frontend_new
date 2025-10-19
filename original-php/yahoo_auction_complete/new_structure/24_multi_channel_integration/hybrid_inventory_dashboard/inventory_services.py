"""
modules/inventory/services.py - ハイブリッド在庫管理サービス
"""
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
import json

from app.services.base_service import UltimateBaseService
from app.core.results import ExecutionResult
from app.core.exceptions import ValidationError, ResourceNotFoundError, BusinessRuleViolation
from app.core.logging import get_logger
from app.infrastructure.external.shopify_client import ShopifyClient
from app.infrastructure.external.ebay_client import EBayClient
from app.infrastructure.external.amazon_client import AmazonClient
from .schemas import (
    InventoryFilterRequest,
    InventoryAdjustmentRequest,
    InventorySyncRequest,
    InventoryStatsResponse,
    HybridInventoryItem,
    InventoryDiscrepancy,
    ChannelInventory
)

logger = get_logger(__name__)

class InventoryService(UltimateBaseService):
    """ハイブリッド在庫管理サービス"""
    
    def __init__(self):
        super().__init__()
        self.shopify_client = ShopifyClient()
        self.ebay_client = EBayClient()
        self.amazon_client = AmazonClient()
        
    async def get_inventory_status(
        self, 
        user_id: str, 
        filters: InventoryFilterRequest
    ) -> ExecutionResult[Dict[str, Any]]:
        """
        在庫状況一覧取得
        """
        try:
            logger.info("Getting inventory status", extra={
                "user_id": user_id,
                "filters": filters.dict()
            })
            
            # 並行して各チャネルの在庫を取得
            tasks = [
                self._get_shopify_inventory(user_id, filters),
                self._get_ebay_inventory(user_id, filters),
                self._get_amazon_inventory(user_id, filters),
                self._get_local_inventory(user_id, filters)
            ]
            
            shopify_result, ebay_result, amazon_result, local_result = await asyncio.gather(
                *tasks, return_exceptions=True
            )
            
            # 結果をマージしてハイブリッド在庫リストを作成
            hybrid_inventory = await self._merge_inventory_data(
                shopify_result, ebay_result, amazon_result, local_result
            )
            
            # フィルター適用
            filtered_inventory = self._apply_filters(hybrid_inventory, filters)
            
            # ページネーション
            paginated_result = self._paginate_results(
                filtered_inventory, 
                filters.page, 
                filters.page_size
            )
            
            return ExecutionResult.success({
                "inventory_items": paginated_result["items"],
                "pagination": {
                    "page": filters.page,
                    "page_size": filters.page_size,
                    "total_items": paginated_result["total"],
                    "total_pages": paginated_result["pages"]
                },
                "summary": {
                    "total_products": len(hybrid_inventory),
                    "physical_stock_products": len([i for i in hybrid_inventory if i.physical_stock > 0]),
                    "virtual_stock_products": len([i for i in hybrid_inventory if i.virtual_stock > 0]),
                    "out_of_stock_products": len([i for i in hybrid_inventory if i.display_stock <= 0])
                }
            })
            
        except Exception as e:
            logger.error(f"Failed to get inventory status: {str(e)}")
            return ExecutionResult.failure(f"在庫状況の取得に失敗しました: {str(e)}")
    
    async def get_inventory_stats(self, user_id: str) -> ExecutionResult[InventoryStatsResponse]:
        """
        在庫統計情報取得
        """
        try:
            logger.info("Getting inventory stats", extra={"user_id": user_id})
            
            # 全在庫データを取得
            all_inventory = await self._get_all_inventory(user_id)
            
            # 統計計算
            stats = self._calculate_inventory_stats(all_inventory)
            
            return ExecutionResult.success(InventoryStatsResponse(**stats))
            
        except Exception as e:
            logger.error(f"Failed to get inventory stats: {str(e)}")
            return ExecutionResult.failure(f"在庫統計の取得に失敗しました: {str(e)}")
    
    async def detect_inventory_discrepancies(
        self, 
        user_id: str
    ) -> ExecutionResult[List[InventoryDiscrepancy]]:
        """
        在庫差分検出
        """
        try:
            logger.info("Detecting inventory discrepancies", extra={"user_id": user_id})
            
            # 各チャネルの在庫を取得
            shopify_inventory = await self._get_shopify_inventory(user_id)
            ebay_inventory = await self._get_ebay_inventory(user_id)
            amazon_inventory = await self._get_amazon_inventory(user_id)
            local_inventory = await self._get_local_inventory(user_id)
            
            # 差分検出
            discrepancies = []
            
            # 全SKUのセットを作成
            all_skus = set()
            for inv in [shopify_inventory, ebay_inventory, amazon_inventory, local_inventory]:
                if isinstance(inv, dict) and "items" in inv:
                    all_skus.update([item.sku for item in inv["items"]])
            
            # 各SKUについて差分をチェック
            for sku in all_skus:
                discrepancy = await self._check_sku_discrepancy(
                    sku, shopify_inventory, ebay_inventory, amazon_inventory, local_inventory
                )
                if discrepancy:
                    discrepancies.append(discrepancy)
            
            # 重要度順にソート
            discrepancies.sort(key=lambda x: x.severity, reverse=True)
            
            return ExecutionResult.success(discrepancies)
            
        except Exception as e:
            logger.error(f"Failed to detect inventory discrepancies: {str(e)}")
            return ExecutionResult.failure(f"在庫差分の検出に失敗しました: {str(e)}")
    
    async def adjust_inventory(
        self, 
        user_id: str, 
        request: InventoryAdjustmentRequest
    ) -> ExecutionResult[Dict[str, Any]]:
        """
        在庫調整
        """
        try:
            logger.info("Adjusting inventory", extra={
                "user_id": user_id,
                "sku": request.sku,
                "adjustment_type": request.adjustment_type
            })
            
            # バリデーション
            validation_result = self._validate_adjustment_request(request)
            if validation_result.is_failure():
                return validation_result
            
            # 調整タイプ別処理
            if request.adjustment_type == "manual":
                result = await self._manual_inventory_adjustment(user_id, request)
            elif request.adjustment_type == "sync_from_channel":
                result = await self._sync_from_channel_adjustment(user_id, request)
            elif request.adjustment_type == "safety_margin":
                result = await self._safety_margin_adjustment(user_id, request)
            else:
                return ExecutionResult.failure(f"無効な調整タイプ: {request.adjustment_type}")
            
            if result.is_success():
                # 調整ログを記録
                await self._log_inventory_adjustment(user_id, request, result.data)
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to adjust inventory: {str(e)}")
            return ExecutionResult.failure(f"在庫調整に失敗しました: {str(e)}")
    
    async def sync_inventory(
        self, 
        user_id: str, 
        request: InventorySyncRequest
    ) -> ExecutionResult[Dict[str, Any]]:
        """
        在庫同期
        """
        try:
            logger.info("Syncing inventory", extra={
                "user_id": user_id,
                "channels": request.channels,
                "sync_type": request.sync_type
            })
            
            sync_results = {}
            
            # チャネル別同期実行
            for channel in request.channels:
                if channel == "shopify":
                    result = await self._sync_shopify_inventory(user_id, request)
                elif channel == "ebay":
                    result = await self._sync_ebay_inventory(user_id, request)
                elif channel == "amazon":
                    result = await self._sync_amazon_inventory(user_id, request)
                else:
                    continue
                
                sync_results[channel] = result
            
            # 同期結果サマリー
            summary = self._create_sync_summary(sync_results)
            
            return ExecutionResult.success({
                "sync_results": sync_results,
                "summary": summary,
                "sync_id": f"sync_{user_id}_{int(datetime.utcnow().timestamp())}"
            })
            
        except Exception as e:
            logger.error(f"Failed to sync inventory: {str(e)}")
            return ExecutionResult.failure(f"在庫同期に失敗しました: {str(e)}")
    
    async def auto_adjust_inventory(self, user_id: str) -> ExecutionResult[Dict[str, Any]]:
        """
        自動在庫調整
        """
        try:
            logger.info("Auto-adjusting inventory", extra={"user_id": user_id})
            
            # 差分検出
            discrepancies_result = await self.detect_inventory_discrepancies(user_id)
            if discrepancies_result.is_failure():
                return discrepancies_result
            
            discrepancies = discrepancies_result.data
            adjusted_items = []
            failed_items = []
            
            # 重要度の高い差分から順に自動調整
            for discrepancy in discrepancies:
                if discrepancy.auto_adjustable:
                    adjustment_request = self._create_auto_adjustment_request(discrepancy)
                    result = await self.adjust_inventory(user_id, adjustment_request)
                    
                    if result.is_success():
                        adjusted_items.append({
                            "sku": discrepancy.sku,
                            "adjustment": result.data
                        })
                    else:
                        failed_items.append({
                            "sku": discrepancy.sku,
                            "error": result.error_message
                        })
            
            return ExecutionResult.success({
                "adjusted_items": adjusted_items,
                "failed_items": failed_items,
                "total_discrepancies": len(discrepancies),
                "adjusted_count": len(adjusted_items),
                "failed_count": len(failed_items)
            })
            
        except Exception as e:
            logger.error(f"Failed to auto-adjust inventory: {str(e)}")
            return ExecutionResult.failure(f"自動在庫調整に失敗しました: {str(e)}")
    
    async def export_inventory(
        self, 
        user_id: str, 
        format: str, 
        filters: InventoryFilterRequest
    ) -> ExecutionResult[Dict[str, Any]]:
        """
        在庫データエクスポート
        """
        try:
            logger.info("Exporting inventory", extra={
                "user_id": user_id,
                "format": format,
                "filters": filters.dict()
            })
            
            # 在庫データ取得
            inventory_result = await self.get_inventory_status(user_id, filters)
            if inventory_result.is_failure():
                return inventory_result
            
            inventory_data = inventory_result.data["inventory_items"]
            
            # フォーマット別エクスポート
            if format.lower() == "csv":
                export_data = await self._export_to_csv(inventory_data)
            elif format.lower() == "json":
                export_data = await self._export_to_json(inventory_data)
            elif format.lower() == "xlsx":
                export_data = await self._export_to_xlsx(inventory_data)
            else:
                return ExecutionResult.failure(f"サポートされていないフォーマット: {format}")
            
            return ExecutionResult.success({
                "export_data": export_data,
                "format": format,
                "item_count": len(inventory_data),
                "export_timestamp": datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Failed to export inventory: {str(e)}")
            return ExecutionResult.failure(f"在庫エクスポートに失敗しました: {str(e)}")
    
    async def get_inventory_details(
        self, 
        user_id: str, 
        sku: str
    ) -> ExecutionResult[HybridInventoryItem]:
        """
        特定SKUの在庫詳細取得
        """
        try:
            logger.info("Getting inventory details", extra={
                "user_id": user_id,
                "sku": sku
            })
            
            # 各チャネルから詳細情報を取得
            details = await self._get_sku_details_from_all_channels(user_id, sku)
            
            if not details:
                return ExecutionResult.failure(f"SKU {sku} の在庫情報が見つかりません")
            
            return ExecutionResult.success(details)
            
        except Exception as e:
            logger.error(f"Failed to get inventory details: {str(e)}")
            return ExecutionResult.failure(f"在庫詳細の取得に失敗しました: {str(e)}")
    
    # === プライベートメソッド ===
    
    async def _get_shopify_inventory(self, user_id: str, filters: Optional[InventoryFilterRequest] = None) -> Dict[str, Any]:
        """Shopify在庫取得"""
        try:
            return await self.shopify_client.get_inventory(user_id, filters)
        except Exception as e:
            logger.error(f"Failed to get Shopify inventory: {str(e)}")
            return {"items": [], "error": str(e)}
    
    async def _get_ebay_inventory(self, user_id: str, filters: Optional[InventoryFilterRequest] = None) -> Dict[str, Any]:
        """eBay在庫取得"""
        try:
            return await self.ebay_client.get_inventory(user_id, filters)
        except Exception as e:
            logger.error(f"Failed to get eBay inventory: {str(e)}")
            return {"items": [], "error": str(e)}
    
    async def _get_amazon_inventory(self, user_id: str, filters: Optional[InventoryFilterRequest] = None) -> Dict[str, Any]:
        """Amazon在庫取得"""
        try:
            return await self.amazon_client.get_inventory(user_id, filters)
        except Exception as e:
            logger.error(f"Failed to get Amazon inventory: {str(e)}")
            return {"items": [], "error": str(e)}
    
    async def _get_local_inventory(self, user_id: str, filters: Optional[InventoryFilterRequest] = None) -> Dict[str, Any]:
        """ローカル在庫取得"""
        try:
            # データベースからローカル在庫を取得
            # TODO: 実際のデータベース実装
            return {"items": [], "error": None}
        except Exception as e:
            logger.error(f"Failed to get local inventory: {str(e)}")
            return {"items": [], "error": str(e)}
    
    async def _merge_inventory_data(self, *inventory_results) -> List[HybridInventoryItem]:
        """在庫データをマージしてハイブリッド在庫リストを作成"""
        merged_data = {}
        
        for result in inventory_results:
            if isinstance(result, dict) and "items" in result and not result.get("error"):
                for item in result["items"]:
                    sku = item.get("sku") or item.get("id")
                    if sku not in merged_data:
                        merged_data[sku] = HybridInventoryItem(
                            sku=sku,
                            name=item.get("name", ""),
                            physical_stock=0,
                            virtual_stock=0,
                            display_stock=0,
                            channel_inventories=[],
                            risk_level=1,
                            check_interval=timedelta(hours=12),
                            last_check=datetime.utcnow(),
                            safety_margin=1
                        )
                    
                    # チャネル在庫情報を追加
                    channel_inventory = ChannelInventory(
                        channel=result.get("channel", "unknown"),
                        quantity=item.get("quantity", 0),
                        last_sync=datetime.utcnow(),
                        sync_status="success"
                    )
                    merged_data[sku].channel_inventories.append(channel_inventory)
        
        # 在庫数量を計算
        for item in merged_data.values():
            item.display_stock = self._calculate_display_stock(item)
            item.risk_level = self._calculate_risk_level(item)
        
        return list(merged_data.values())
    
    def _calculate_display_stock(self, item: HybridInventoryItem) -> int:
        """表示在庫数量計算"""
        # 物理在庫と仮想在庫の最小値を安全マージン分減らして表示
        min_stock = min(item.physical_stock, item.virtual_stock) if item.virtual_stock > 0 else item.physical_stock
        return max(0, min_stock - item.safety_margin)
    
    def _calculate_risk_level(self, item: HybridInventoryItem) -> int:
        """リスクレベル計算 (1-5)"""
        if item.display_stock <= 0:
            return 5  # 在庫切れ：最高リスク
        elif item.display_stock <= 2:
            return 4  # 低在庫：高リスク
        elif item.display_stock <= 5:
            return 3  # 中在庫：中リスク
        elif item.display_stock <= 10:
            return 2  # 十分在庫：低リスク
        else:
            return 1  # 豊富在庫：最低リスク
    
    def _apply_filters(self, inventory: List[HybridInventoryItem], filters: InventoryFilterRequest) -> List[HybridInventoryItem]:
        """フィルター適用"""
        filtered = inventory
        
        if filters.category:
            filtered = [item for item in filtered if filters.category.lower() in item.name.lower()]
        
        if filters.inventory_type:
            if filters.inventory_type == "physical":
                filtered = [item for item in filtered if item.physical_stock > 0]
            elif filters.inventory_type == "virtual":
                filtered = [item for item in filtered if item.virtual_stock > 0 and item.physical_stock == 0]
            elif filters.inventory_type == "mixed":
                filtered = [item for item in filtered if item.physical_stock > 0 and item.virtual_stock > 0]
        
        if filters.risk_level:
            filtered = [item for item in filtered if item.risk_level == filters.risk_level]
        
        if filters.search:
            search_term = filters.search.lower()
            filtered = [item for item in filtered if search_term in item.sku.lower() or search_term in item.name.lower()]
        
        return filtered
    
    def _paginate_results(self, items: List[HybridInventoryItem], page: int, page_size: int) -> Dict[str, Any]:
        """ページネーション"""
        total = len(items)
        start = (page - 1) * page_size
        end = start + page_size
        
        return {
            "items": items[start:end],
            "total": total,
            "pages": (total + page_size - 1) // page_size
        }
    
    def _calculate_inventory_stats(self, inventory: List[HybridInventoryItem]) -> Dict[str, Any]:
        """在庫統計計算"""
        total_products = len(inventory)
        physical_stock_products = len([i for i in inventory if i.physical_stock > 0])
        virtual_stock_products = len([i for i in inventory if i.virtual_stock > 0])
        out_of_stock_products = len([i for i in inventory if i.display_stock <= 0])
        low_stock_products = len([i for i in inventory if 0 < i.display_stock <= 5])
        
        total_value = sum([Decimal(str(getattr(i, 'value', 0))) for i in inventory])
        
        return {
            "total_products": total_products,
            "physical_stock_products": physical_stock_products,
            "virtual_stock_products": virtual_stock_products,
            "out_of_stock_products": out_of_stock_products,
            "low_stock_products": low_stock_products,
            "total_value": float(total_value),
            "average_risk_level": sum([i.risk_level for i in inventory]) / total_products if total_products > 0 else 0
        }
    
    def _validate_adjustment_request(self, request: InventoryAdjustmentRequest) -> ExecutionResult[bool]:
        """在庫調整リクエストバリデーション"""
        if not request.sku:
            return ExecutionResult.failure("SKUが指定されていません")
        
        if request.adjustment_type not in ["manual", "sync_from_channel", "safety_margin"]:
            return ExecutionResult.failure("無効な調整タイプです")
        
        if request.adjustment_type == "manual" and not hasattr(request, 'new_quantity'):
            return ExecutionResult.failure("手動調整には新しい数量の指定が必要です")
        
        return ExecutionResult.success(True)
    
    async def _manual_inventory_adjustment(self, user_id: str, request: InventoryAdjustmentRequest) -> ExecutionResult[Dict[str, Any]]:
        """手動在庫調整"""
        # TODO: 実装
        return ExecutionResult.success({"adjusted": True, "method": "manual"})
    
    async def _sync_from_channel_adjustment(self, user_id: str, request: InventoryAdjustmentRequest) -> ExecutionResult[Dict[str, Any]]:
        """チャネル同期調整"""
        # TODO: 実装
        return ExecutionResult.success({"adjusted": True, "method": "sync_from_channel"})
    
    async def _safety_margin_adjustment(self, user_id: str, request: InventoryAdjustmentRequest) -> ExecutionResult[Dict[str, Any]]:
        """安全マージン調整"""
        # TODO: 実装
        return ExecutionResult.success({"adjusted": True, "method": "safety_margin"})
    
    async def _log_inventory_adjustment(self, user_id: str, request: InventoryAdjustmentRequest, result: Dict[str, Any]) -> None:
        """在庫調整ログ記録"""
        # TODO: データベースにログを記録
        logger.info("Inventory adjustment logged", extra={
            "user_id": user_id,
            "sku": request.sku,
            "adjustment_type": request.adjustment_type,
            "result": result
        })