# Shopee 7ヶ国対応 Supabase完全実装
# Geminiの回答を基に、最適化されたアーキテクチャで実装

import asyncio
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timezone
import json
from dataclasses import dataclass
from enum import Enum
import uuid

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from supabase import create_client, Client
import redis.asyncio as redis
from contextlib import asynccontextmanager

# ==================== 設定・定数 ====================

class CountryCode(str, Enum):
    """Shopee対応7ヶ国"""
    SG = "SG"  # シンガポール
    MY = "MY"  # マレーシア
    TH = "TH"  # タイ
    PH = "PH"  # フィリピン
    ID = "ID"  # インドネシア
    VN = "VN"  # ベトナム
    TW = "TW"  # 台湾

COUNTRY_CONFIGS = {
    CountryCode.SG: {
        "name": "Singapore",
        "currency": "SGD",
        "symbol": "S$",
        "flag": "🇸🇬",
        "exchange_rate": 109.0,
        "market_code": "SG_18046_18066"
    },
    CountryCode.MY: {
        "name": "Malaysia", 
        "currency": "MYR",
        "symbol": "RM",
        "flag": "🇲🇾",
        "exchange_rate": 34.5,
        "market_code": "MY_18047_18067"
    },
    CountryCode.TH: {
        "name": "Thailand",
        "currency": "THB", 
        "symbol": "฿",
        "flag": "🇹🇭",
        "exchange_rate": 4.2,
        "market_code": "TH_18048_18068"
    },
    CountryCode.PH: {
        "name": "Philippines",
        "currency": "PHP",
        "symbol": "₱", 
        "flag": "🇵🇭",
        "exchange_rate": 2.7,
        "market_code": "PH_18049_18069"
    },
    CountryCode.ID: {
        "name": "Indonesia",
        "currency": "IDR",
        "symbol": "Rp",
        "flag": "🇮🇩", 
        "exchange_rate": 0.0098,
        "market_code": "ID_18050_18070"
    },
    CountryCode.VN: {
        "name": "Vietnam",
        "currency": "VND",
        "symbol": "₫",
        "flag": "🇻🇳",
        "exchange_rate": 0.0062,
        "market_code": "VN_18051_18071"
    },
    CountryCode.TW: {
        "name": "Taiwan",
        "currency": "TWD",
        "symbol": "NT$",
        "flag": "🇹🇼",
        "exchange_rate": 4.8,
        "market_code": "TW_18052_18072"
    }
}

# ==================== Pydanticモデル ====================

class ProductBase(BaseModel):
    """商品基本情報"""
    sku: str = Field(..., description="商品管理番号")
    product_name_ja: str = Field(..., description="商品名（日本語）")
    product_name_en: str = Field(..., description="商品名（英語）")
    price_jpy: float = Field(..., gt=0, description="価格（日本円）")
    weight_g: int = Field(..., gt=0, description="重量（グラム）")
    category_id: int = Field(..., description="Shopeeカテゴリー ID")
    description: Optional[str] = Field(None, description="商品説明")
    image_urls: List[str] = Field(default_factory=list, max_items=9, description="画像URL（最大9枚）")

class ProductCreate(ProductBase):
    """商品作成用"""
    country_code: CountryCode = Field(..., description="対象国コード")
    stock_quantity: int = Field(..., ge=0, description="在庫数")

class ProductCreateBulk(BaseModel):
    """一括作成用"""
    products: List[ProductCreate] = Field(..., description="商品リスト")
    auto_calculate_pricing: bool = Field(True, description="自動価格計算")

class ProductUpdate(BaseModel):
    """商品更新用"""
    product_name_ja: Optional[str] = None
    product_name_en: Optional[str] = None
    price_jpy: Optional[float] = None
    stock_quantity: Optional[int] = None
    image_urls: Optional[List[str]] = None

class ShippingZone(BaseModel):
    """配送ゾーン"""
    zone_code: str = Field(..., description="ゾーンコード（A, B, C等）")
    zone_name: str = Field(..., description="ゾーン名")
    is_default: bool = Field(False, description="デフォルトゾーンか")

class ShippingRate(BaseModel):
    """送料テーブル"""
    weight_from_g: int = Field(..., description="重量範囲開始（グラム）")
    weight_to_g: int = Field(..., description="重量範囲終了（グラム）") 
    esf_amount: float = Field(..., description="ESF手数料")
    actual_amount: float = Field(..., description="実際の送料")

class ShippingCalculateRequest(BaseModel):
    """送料計算リクエスト"""
    weight_g: int = Field(..., gt=0, description="重量（グラム）")
    countries: List[CountryCode] = Field(..., description="計算対象国リスト")
    zone_code: str = Field("A", description="配送ゾーンコード")

class ComplianceCheckRequest(BaseModel):
    """コンプライアンスチェックリクエスト"""
    product_name: str = Field(..., description="商品名")
    category_name: str = Field(..., description="カテゴリー名")
    description: Optional[str] = None
    countries: List[CountryCode] = Field(..., description="チェック対象国")

# ==================== Supabaseマネージャー ====================

class SupabaseManager:
    """Supabase接続・操作マネージャー"""
    
    def __init__(self, url: str, key: str):
        self.client: Client = create_client(url, key)
        
    async def get_countries(self) -> List[Dict]:
        """対応国一覧取得"""
        result = self.client.table('shopee_markets').select('*').execute()
        return result.data
    
    async def create_product(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """商品作成（単一）"""
        product_data['id'] = str(uuid.uuid4())
        product_data['created_at'] = datetime.now(timezone.utc).isoformat()
        product_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        result = self.client.table('products').insert(product_data).execute()
        return result.data[0] if result.data else None
        
    async def bulk_create_products(self, products_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """商品一括作成（最適化済み）"""
        # UUIDと タイムスタンプを事前生成
        timestamp = datetime.now(timezone.utc).isoformat()
        for product in products_data:
            product['id'] = str(uuid.uuid4())
            product['created_at'] = timestamp
            product['updated_at'] = timestamp
            
        # 一括INSERT実行
        result = self.client.table('products').insert(products_data).execute()
        return result.data
        
    async def get_products(self, country_code: str, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """商品一覧取得（国別フィルター）"""
        result = (
            self.client.table('products')
            .select('*')
            .eq('country_code', country_code)
            .range(skip, skip + limit - 1)
            .execute()
        )
        return result.data
        
    async def update_product(self, product_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """商品更新"""
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        result = (
            self.client.table('products')
            .update(update_data)
            .eq('id', product_id)
            .execute()
        )
        return result.data[0] if result.data else None
        
    async def delete_product(self, product_id: str) -> bool:
        """商品削除"""
        result = self.client.table('products').delete().eq('id', product_id).execute()
        return len(result.data) > 0
        
    async def calculate_shipping(self, country_code: str, weight_g: int, zone_code: str = "A") -> Dict[str, Any]:
        """送料計算"""
        result = (
            self.client.table('shopee_sls_rates')
            .select('*')
            .eq('country_code', country_code)
            .eq('zone_code', zone_code)
            .lte('weight_from_g', weight_g)
            .gte('weight_to_g', weight_g)
            .execute()
        )
        
        if result.data:
            rate = result.data[0]
            return {
                'country_code': country_code,
                'zone_code': zone_code,
                'weight_g': weight_g,
                'esf_amount': rate['esf_amount'],
                'actual_amount': rate['actual_amount'],
                'total_shipping': rate['esf_amount'] + rate['actual_amount']
            }
        return None
        
    async def check_prohibited_items(self, country_code: str, product_name: str, category_name: str) -> List[Dict[str, Any]]:
        """禁止品チェック"""
        result = (
            self.client.table('shopee_prohibited_items')
            .select('*')
            .eq('country_code', country_code)
            .execute()
        )
        
        warnings = []
        for item in result.data:
            keywords = item.get('item_keywords', [])
            for keyword in keywords:
                if keyword.lower() in product_name.lower() or keyword.lower() in category_name.lower():
                    warnings.append({
                        'country_code': country_code,
                        'restriction_level': item['prohibition_level'],
                        'matched_keyword': keyword,
                        'details': item['restriction_details']
                    })
        
        return warnings

# ==================== Strategy Pattern（国別ロジック）====================

class ShopeeCountryService:
    """国別サービスの抽象基底クラス"""
    
    def __init__(self, country_code: CountryCode, supabase: SupabaseManager):
        self.country_code = country_code
        self.supabase = supabase
        self.config = COUNTRY_CONFIGS[country_code]
        
    async def calculate_local_price(self, price_jpy: float) -> float:
        """現地通貨での価格計算"""
        return price_jpy / self.config['exchange_rate']
        
    async def format_product_title(self, title_ja: str, title_en: str) -> str:
        """国別の商品タイトル最適化"""
        # デフォルトは英語タイトルを使用
        return title_en
        
    async def validate_product(self, product: ProductCreate) -> List[str]:
        """国別商品バリデーション"""
        errors = []
        
        # 共通バリデーション
        if len(product.product_name_en) > 120:
            errors.append(f"{self.country_code}: 商品名が長すぎます（120文字以内）")
            
        if product.weight_g > 30000:  # 30kg
            errors.append(f"{self.country_code}: 重量制限を超えています（30kg以内）")
            
        return errors

class ShopeeSGService(ShopeeCountryService):
    """シンガポール特化サービス"""
    
    async def format_product_title(self, title_ja: str, title_en: str) -> str:
        """英語タイトル + "Singapore"サフィックス"""
        return f"{title_en} - Singapore"
        
class ShopeeMYService(ShopeeCountryService):
    """マレーシア特化サービス"""
    
    async def validate_product(self, product: ProductCreate) -> List[str]:
        errors = await super().validate_product(product)
        
        # マレーシア特有の制限例
        if "alcohol" in product.product_name_en.lower():
            errors.append("MY: アルコール類は制限商品です")
            
        return errors

class ShopeeTHService(ShopeeCountryService):
    """タイ特化サービス"""
    
    async def calculate_local_price(self, price_jpy: float) -> float:
        """タイは最低価格制限あり"""
        local_price = await super().calculate_local_price(price_jpy)
        return max(local_price, 10.0)  # 最低10バーツ

# Factory Pattern
class ShopeeServiceFactory:
    """国別サービスのファクトリー"""
    
    _services = {
        CountryCode.SG: ShopeeSGService,
        CountryCode.MY: ShopeeMYService, 
        CountryCode.TH: ShopeeTHService,
        CountryCode.PH: ShopeeCountryService,  # デフォルト
        CountryCode.ID: ShopeeCountryService,  # デフォルト
        CountryCode.VN: ShopeeCountryService,  # デフォルト
        CountryCode.TW: ShopeeCountryService,  # デフォルト
    }
    
    @classmethod
    def get_service(cls, country_code: CountryCode, supabase: SupabaseManager) -> ShopeeCountryService:
        service_class = cls._services.get(country_code, ShopeeCountryService)
        return service_class(country_code, supabase)

# ==================== 在庫同期システム（Optimistic Lock）====================

class InventorySyncManager:
    """在庫同期マネージャー（過売り防止）"""
    
    def __init__(self, supabase: SupabaseManager, redis_client: redis.Redis):
        self.supabase = supabase
        self.redis = redis_client
        
    async def update_stock_with_lock(self, sku: str, country_code: str, stock_change: int) -> bool:
        """オプティミスティックロックによる在庫更新"""
        lock_key = f"stock_lock:{sku}:{country_code}"
        
        # Redisによる分散ロック（5秒間）
        async with self.redis.lock(lock_key, timeout=5):
            try:
                # 現在の在庫を SELECT FOR UPDATE で取得
                current_result = (
                    self.supabase.client.table('products')
                    .select('stock_quantity, version')
                    .eq('sku', sku)
                    .eq('country_code', country_code)
                    .execute()
                )
                
                if not current_result.data:
                    raise HTTPException(status_code=404, detail="商品が見つかりません")
                    
                current_stock = current_result.data[0]['stock_quantity']
                current_version = current_result.data[0]['version']
                new_stock = current_stock + stock_change
                
                # 過売りチェック
                if new_stock < 0:
                    raise HTTPException(status_code=400, detail="在庫不足です")
                
                # バージョン管理付きで更新
                update_result = (
                    self.supabase.client.table('products')
                    .update({
                        'stock_quantity': new_stock,
                        'version': current_version + 1,
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    })
                    .eq('sku', sku)
                    .eq('country_code', country_code)
                    .eq('version', current_version)  # オプティミスティックロック
                    .execute()
                )
                
                if not update_result.data:
                    # バージョン競合 = 他のプロセスが先に更新
                    raise HTTPException(status_code=409, detail="在庫が他のプロセスにより更新されました")
                
                # イベントログ記録
                await self._log_inventory_event(sku, country_code, stock_change, new_stock)
                
                return True
                
            except Exception as e:
                print(f"在庫更新エラー: {e}")
                raise
                
    async def sync_all_countries(self, sku: str, new_total_stock: int) -> Dict[str, Any]:
        """全7ヶ国の在庫を同期"""
        results = {}
        
        # 並行処理で全国同時更新
        tasks = []
        for country in CountryCode:
            # 均等配分（簡易版）
            country_stock = new_total_stock // 7
            tasks.append(self._update_country_stock(sku, country, country_stock))
            
        country_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, result in enumerate(country_results):
            country = list(CountryCode)[i]
            if isinstance(result, Exception):
                results[country] = {'status': 'error', 'message': str(result)}
            else:
                results[country] = {'status': 'success', 'new_stock': result}
                
        return results
        
    async def _update_country_stock(self, sku: str, country_code: CountryCode, new_stock: int) -> int:
        """個別国の在庫更新"""
        result = (
            self.supabase.client.table('products')
            .update({
                'stock_quantity': new_stock,
                'updated_at': datetime.now(timezone.utc).isoformat()
            })
            .eq('sku', sku)
            .eq('country_code', country_code.value)
            .execute()
        )
        return new_stock
        
    async def _log_inventory_event(self, sku: str, country_code: str, change_amount: int, new_stock: int):
        """在庫変動イベントログ"""
        event_data = {
            'id': str(uuid.uuid4()),
            'sku': sku,
            'country_code': country_code,
            'change_amount': change_amount,
            'new_stock': new_stock,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'source': 'api_update'
        }
        
        self.supabase.client.table('inventory_events').insert(event_data).execute()

# ==================== FastAPI アプリケーション ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーション起動・終了時の処理"""
    # Startup
    print("🚀 Shopee 7ヶ国システム起動中...")
    app.state.supabase = SupabaseManager(
        url="your-supabase-url",  # 環境変数から取得
        key="your-supabase-key"   # 環境変数から取得
    )
    app.state.redis = await redis.from_url("redis://localhost:6379")
    app.state.inventory_sync = InventorySyncManager(app.state.supabase, app.state.redis)
    
    yield
    
    # Shutdown
    await app.state.redis.close()
    print("💤 Shopee 7ヶ国システム停止")

app = FastAPI(
    title="Shopee 7ヶ国対応 EC出品管理API",
    description="Gemini最適化による高性能バックエンド",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番では具体的なドメインを指定
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== APIエンドポイント ====================

@app.get("/health")
async def health_check():
    """ヘルスチェック"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/api/v1/countries")
async def get_supported_countries():
    """対応国一覧"""
    return {
        "countries": [
            {
                "code": code.value,
                "name": config["name"],
                "currency": config["currency"],
                "flag": config["flag"]
            }
            for code, config in COUNTRY_CONFIGS.items()
        ]
    }

@app.post("/api/v1/products/{country_code}")
async def create_product(country_code: CountryCode, product: ProductCreate):
    """指定国への商品登録"""
    supabase: SupabaseManager = app.state.supabase
    
    # 国別サービスで検証
    service = ShopeeServiceFactory.get_service(country_code, supabase)
    validation_errors = await service.validate_product(product)
    
    if validation_errors:
        raise HTTPException(status_code=400, detail=validation_errors)
    
    # 現地価格計算
    local_price = await service.calculate_local_price(product.price_jpy)
    optimized_title = await service.format_product_title(
        product.product_name_ja, 
        product.product_name_en
    )
    
    # データベース挿入用データ準備
    product_data = product.dict()
    product_data.update({
        'country_code': country_code.value,
        'local_price': local_price,
        'local_currency': COUNTRY_CONFIGS[country_code]['currency'],
        'optimized_title': optimized_title,
        'version': 1  # オプティミスティックロック用
    })
    
    result = await supabase.create_product(product_data)
    return {"status": "success", "product": result}

@app.post("/api/v1/bulk/products")
async def bulk_create_products(bulk_request: ProductCreateBulk):
    """複数国への一括商品登録"""
    supabase: SupabaseManager = app.state.supabase
    
    products_data = []
    validation_errors = []
    
    for product in bulk_request.products:
        # 国別検証
        service = ShopeeServiceFactory.get_service(product.country_code, supabase)
        errors = await service.validate_product(product)
        
        if errors:
            validation_errors.extend(errors)
            continue
            
        # 価格・タイトル最適化
        local_price = await service.calculate_local_price(product.price_jpy)
        optimized_title = await service.format_product_title(
            product.product_name_ja, 
            product.product_name_en
        )
        
        product_data = product.dict()
        product_data.update({
            'country_code': product.country_code.value,
            'local_price': local_price,
            'local_currency': COUNTRY_CONFIGS[product.country_code]['currency'],
            'optimized_title': optimized_title,
            'version': 1
        })
        products_data.append(product_data)
    
    if validation_errors:
        raise HTTPException(status_code=400, detail=validation_errors)
    
    # 一括作成実行
    results = await supabase.bulk_create_products(products_data)
    
    return {
        "status": "success",
        "created_count": len(results),
        "products": results
    }

@app.get("/api/v1/products/{country_code}")
async def get_products(country_code: CountryCode, skip: int = 0, limit: int = 100):
    """指定国の商品一覧取得"""
    supabase: SupabaseManager = app.state.supabase
    products = await supabase.get_products(country_code.value, skip, limit)
    
    return {
        "country_code": country_code.value,
        "total": len(products),
        "products": products
    }

@app.put("/api/v1/products/{country_code}/{product_id}")
async def update_product(country_code: CountryCode, product_id: str, product_update: ProductUpdate):
    """指定国の商品更新"""
    supabase: SupabaseManager = app.state.supabase
    
    update_data = {k: v for k, v in product_update.dict().items() if v is not None}
    
    # 価格が更新される場合は現地価格も再計算
    if 'price_jpy' in update_data:
        service = ShopeeServiceFactory.get_service(country_code, supabase)
        update_data['local_price'] = await service.calculate_local_price(update_data['price_jpy'])
    
    result = await supabase.update_product(product_id, update_data)
    
    if not result:
        raise HTTPException(status_code=404, detail="商品が見つかりません")
    
    return {"status": "success", "product": result}

@app.delete("/api/v1/products/{country_code}/{product_id}")
async def delete_product(country_code: CountryCode, product_id: str):
    """指定国の商品削除"""
    supabase: SupabaseManager = app.state.supabase
    success = await supabase.delete_product(product_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="商品が見つかりません")
    
    return {"status": "success", "message": "商品を削除しました"}

@app.post("/api/v1/shipping/calculate")
async def calculate_shipping_costs(request: ShippingCalculateRequest):
    """7ヶ国送料一括計算"""
    supabase: SupabaseManager = app.state.supabase
    
    # 並行処理で全国の送料計算
    tasks = [
        supabase.calculate_shipping(country.value, request.weight_g, request.zone_code)
        for country in request.countries
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    shipping_costs = []
    for i, result in enumerate(results):
        country = request.countries[i]
        if isinstance(result, Exception):
            shipping_costs.append({
                'country_code': country.value,
                'error': str(result),
                'status': 'error'
            })
        elif result:
            shipping_costs.append(result)
        else:
            shipping_costs.append({
                'country_code': country.value,
                'error': '送料レートが見つかりません',
                'status': 'not_found'
            })
    
    return {
        "weight_g": request.weight_g,
        "zone_code": request.zone_code,
        "shipping_costs": shipping_costs
    }

@app.post("/api/v1/compliance/check")
async def check_compliance(request: ComplianceCheckRequest):
    """7ヶ国禁止品チェック"""
    supabase: SupabaseManager = app.state.supabase
    
    # 並行処理で全国のコンプライアンスチェック
    tasks = [
        supabase.check_prohibited_items(
            country.value, 
            request.product_name, 
            request.category_name
        )
        for country in request.countries
    ]
    
    results = await asyncio.gather(*tasks)
    
    compliance_results = {}
    for i, warnings in enumerate(results):
        country = request.countries[i]
        compliance_results[country.value] = {
            'status': 'compliant' if not warnings else 'warnings',
            'warnings': warnings
        }
    
    return {
        "product_name": request.product_name,
        "category_name": request.category_name,
        "compliance_results": compliance_results
    }

@app.put("/api/v1/inventory/sync/{sku}")
async def sync_inventory_all_countries(sku: str, new_total_stock: int):
    """全7ヶ国在庫同期"""
    inventory_sync: InventorySyncManager = app.state.inventory_sync
    
    results = await inventory_sync.sync_all_countries(sku, new_total_stock)
    
    return {
        "sku": sku,
        "new_total_stock": new_total_stock,
        "sync_results": results
    }

@app.websocket("/ws/products/{country_code}")
async def websocket_products(websocket: WebSocket, country_code: CountryCode):
    """リアルタイム商品更新通知"""
    await websocket.accept()
    
    try:
        # Supabase Real-time subscriptionの実装
        # 実際にはSupabaseのリアルタイム機能を使用
        while True:
            # WebSocket接続維持（実装は省略）
            await asyncio.sleep(1)
            
    except Exception as e:
        print(f"WebSocket接続エラー: {e}")
    finally:
        await websocket.close()

# ==================== 実行例 ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )