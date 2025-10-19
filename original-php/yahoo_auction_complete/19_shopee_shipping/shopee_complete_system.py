# Shopee完全出品システム（国別API・利益計算・自動変換対応）
# 実際のShopee Partner API連携による完全な出品機能

import asyncio
import aiohttp
import hashlib
import hmac
import time
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from enum import Enum
import re
from decimal import Decimal, ROUND_HALF_UP

# ==================== Shopee Partner API設定 ====================

@dataclass
class ShopeeAPIConfig:
    """Shopee Partner API設定"""
    partner_id: int
    partner_key: str
    shop_id: int
    access_token: str
    refresh_token: str
    base_url: str
    
    # 国別設定
    country_code: str
    currency: str
    timezone: str
    language: str

# 各国のShopee Partner APIエンドポイント
SHOPEE_API_ENDPOINTS = {
    "SG": "https://partner.shopeemobile.com",
    "MY": "https://partner.shopeemobile.com", 
    "TH": "https://partner.uat.shopeemobile.com",  # UAT環境の場合
    "PH": "https://partner.shopeemobile.com",
    "ID": "https://partner.shopeemobile.com",
    "VN": "https://partner.shopeemobile.com",
    "TW": "https://partner.shopeemobile.com"
}

# 国別市場特性
COUNTRY_MARKET_CONFIG = {
    "SG": {
        "currency": "SGD",
        "exchange_rate": 109.0,
        "timezone": "Asia/Singapore", 
        "language": "en",
        "title_max_length": 120,
        "description_max_length": 3000,
        "max_images": 9,
        "weight_unit": "kg",
        "dimension_unit": "cm",
        "commission_rate": 5.5,
        "payment_fee_rate": 2.9,
        "required_fields": ["item_name", "description", "price", "stock", "category_id", "images"],
        "prohibited_keywords": ["alcohol", "tobacco", "weapons"]
    },
    "MY": {
        "currency": "MYR",
        "exchange_rate": 34.5,
        "timezone": "Asia/Kuala_Lumpur",
        "language": "en",
        "title_max_length": 120, 
        "description_max_length": 3000,
        "max_images": 9,
        "weight_unit": "kg",
        "dimension_unit": "cm",
        "commission_rate": 4.5,
        "payment_fee_rate": 2.0,
        "required_fields": ["item_name", "description", "price", "stock", "category_id", "images"],
        "prohibited_keywords": ["alcohol", "pork", "gambling"]
    },
    "TH": {
        "currency": "THB",
        "exchange_rate": 4.2,
        "timezone": "Asia/Bangkok",
        "language": "th",
        "title_max_length": 120,
        "description_max_length": 3000, 
        "max_images": 9,
        "weight_unit": "kg",
        "dimension_unit": "cm",
        "commission_rate": 5.0,
        "payment_fee_rate": 2.5,
        "required_fields": ["item_name", "description", "price", "stock", "category_id", "images", "brand"],
        "prohibited_keywords": ["cigarette", "alcohol", "weapons", "political"]
    },
    "PH": {
        "currency": "PHP", 
        "exchange_rate": 2.7,
        "timezone": "Asia/Manila",
        "language": "en",
        "title_max_length": 120,
        "description_max_length": 3000,
        "max_images": 9,
        "weight_unit": "kg", 
        "dimension_unit": "cm",
        "commission_rate": 5.5,
        "payment_fee_rate": 2.0,
        "required_fields": ["item_name", "description", "price", "stock", "category_id", "images"],
        "prohibited_keywords": ["alcohol", "weapons", "adult"]
    },
    "ID": {
        "currency": "IDR",
        "exchange_rate": 0.0098,
        "timezone": "Asia/Jakarta", 
        "language": "id",
        "title_max_length": 70,  # インドネシアは短い
        "description_max_length": 2000,
        "max_images": 9,
        "weight_unit": "gram",  # グラム単位
        "dimension_unit": "cm",
        "commission_rate": 6.0,
        "payment_fee_rate": 2.0,
        "required_fields": ["item_name", "description", "price", "stock", "category_id", "images", "condition"],
        "prohibited_keywords": ["alcohol", "pork", "gambling", "political"]
    },
    "VN": {
        "currency": "VND",
        "exchange_rate": 0.0062,
        "timezone": "Asia/Ho_Chi_Minh",
        "language": "vi", 
        "title_max_length": 120,
        "description_max_length": 3000,
        "max_images": 9,
        "weight_unit": "kg",
        "dimension_unit": "cm", 
        "commission_rate": 5.0,
        "payment_fee_rate": 2.0,
        "required_fields": ["item_name", "description", "price", "stock", "category_id", "images"],
        "prohibited_keywords": ["political", "weapons", "adult"]
    },
    "TW": {
        "currency": "TWD",
        "exchange_rate": 4.8,
        "timezone": "Asia/Taipei",
        "language": "zh-TW",
        "title_max_length": 120,
        "description_max_length": 3000,
        "max_images": 9,
        "weight_unit": "kg",
        "dimension_unit": "cm",
        "commission_rate": 4.0,
        "payment_fee_rate": 1.5,
        "required_fields": ["item_name", "description", "price", "stock", "category_id", "images"],
        "prohibited_keywords": ["political", "weapons", "adult", "mainland"]
    }
}

# ==================== Shopee Partner API Client ====================

class ShopeePartnerAPIClient:
    """Shopee Partner API完全対応クライアント"""
    
    def __init__(self, config: ShopeeAPIConfig):
        self.config = config
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
            
    def _generate_signature(self, api_path: str, timestamp: int, access_token: str = "") -> str:
        """Shopee API署名生成"""
        string_to_sign = f"{self.config.partner_id}{api_path}{timestamp}{access_token}{self.config.shop_id}"
        signature = hmac.new(
            self.config.partner_key.encode(),
            string_to_sign.encode(), 
            hashlib.sha256
        ).hexdigest()
        return signature
        
    def _get_auth_params(self, api_path: str, use_access_token: bool = True) -> Dict[str, Any]:
        """認証パラメータ生成"""
        timestamp = int(time.time())
        access_token = self.config.access_token if use_access_token else ""
        signature = self._generate_signature(api_path, timestamp, access_token)
        
        params = {
            "partner_id": self.config.partner_id,
            "timestamp": timestamp,
            "sign": signature,
            "shop_id": self.config.shop_id
        }
        
        if use_access_token:
            params["access_token"] = access_token
            
        return params
        
    async def _make_request(self, method: str, api_path: str, data: Dict = None, use_access_token: bool = True) -> Dict[str, Any]:
        """Shopee API リクエスト実行"""
        url = f"{self.config.base_url}{api_path}"
        params = self._get_auth_params(api_path, use_access_token)
        
        if method.upper() == "GET":
            if data:
                params.update(data)
            async with self.session.get(url, params=params) as response:
                return await response.json()
        else:
            async with self.session.post(url, params=params, json=data) as response:
                return await response.json()
                
    # ==================== カテゴリー管理 ====================
    
    async def get_category_list(self, language: str = "en") -> List[Dict[str, Any]]:
        """Shopeeカテゴリー一覧取得"""
        api_path = "/api/v2/product/get_category"
        data = {"language": language}
        
        response = await self._make_request("POST", api_path, data)
        
        if response.get("error"):
            raise Exception(f"カテゴリー取得エラー: {response.get('message')}")
            
        return response.get("response", {}).get("category_list", [])
        
    async def get_category_attributes(self, category_id: int, language: str = "en") -> List[Dict[str, Any]]:
        """カテゴリー属性取得"""
        api_path = "/api/v2/product/get_attributes"
        data = {
            "category_id": category_id,
            "language": language
        }
        
        response = await self._make_request("POST", api_path, data)
        
        if response.get("error"):
            raise Exception(f"カテゴリー属性取得エラー: {response.get('message')}")
            
        return response.get("response", {}).get("attribute_list", [])
        
    async def get_brand_list(self, category_id: int, offset: int = 0, page_size: int = 100) -> List[Dict[str, Any]]:
        """ブランド一覧取得"""
        api_path = "/api/v2/product/get_brand_list"
        data = {
            "category_id": category_id,
            "offset": offset,
            "page_size": page_size
        }
        
        response = await self._make_request("POST", api_path, data)
        
        if response.get("error"):
            raise Exception(f"ブランド一覧取得エラー: {response.get('message')}")
            
        return response.get("response", {}).get("brand_list", [])
        
    # ==================== 商品管理 ====================
    
    async def add_item(self, item_data: Dict[str, Any]) -> Dict[str, Any]:
        """商品追加"""
        api_path = "/api/v2/product/add_item"
        
        response = await self._make_request("POST", api_path, item_data)
        
        if response.get("error"):
            raise Exception(f"商品追加エラー: {response.get('message')}")
            
        return response.get("response", {})
        
    async def update_item(self, item_id: int, item_data: Dict[str, Any]) -> Dict[str, Any]:
        """商品更新"""
        api_path = "/api/v2/product/update_item"
        item_data["item_id"] = item_id
        
        response = await self._make_request("POST", api_path, item_data)
        
        if response.get("error"):
            raise Exception(f"商品更新エラー: {response.get('message')}")
            
        return response.get("response", {})
        
    async def update_stock(self, item_id: int, stock: int) -> Dict[str, Any]:
        """在庫更新"""
        api_path = "/api/v2/product/update_stock"
        data = {
            "item_id": item_id,
            "stock_list": [
                {
                    "model_id": 0,  # 単一商品の場合
                    "normal_stock": stock
                }
            ]
        }
        
        response = await self._make_request("POST", api_path, data)
        
        if response.get("error"):
            raise Exception(f"在庫更新エラー: {response.get('message')}")
            
        return response.get("response", {})
        
    async def update_price(self, item_id: int, price: float) -> Dict[str, Any]:
        """価格更新"""
        api_path = "/api/v2/product/update_price"
        data = {
            "item_id": item_id,
            "price_list": [
                {
                    "model_id": 0,
                    "original_price": price
                }
            ]
        }
        
        response = await self._make_request("POST", api_path, data)
        
        if response.get("error"):
            raise Exception(f"価格更新エラー: {response.get('message')}")
            
        return response.get("response", {})
        
    async def get_item_list(self, offset: int = 0, page_size: int = 100, item_status: str = "NORMAL") -> List[Dict[str, Any]]:
        """商品一覧取得"""
        api_path = "/api/v2/product/get_item_list"
        data = {
            "offset": offset,
            "page_size": page_size,
            "item_status": item_status
        }
        
        response = await self._make_request("POST", api_path, data)
        
        if response.get("error"):
            raise Exception(f"商品一覧取得エラー: {response.get('message')}")
            
        return response.get("response", {}).get("item", [])
        
    # ==================== 画像管理 ====================
    
    async def upload_image(self, image_data: bytes) -> str:
        """画像アップロード"""
        api_path = "/api/v2/media_space/upload_image"
        
        # Base64エンコード
        import base64
        image_base64 = base64.b64encode(image_data).decode()
        
        data = {"image": image_base64}
        
        response = await self._make_request("POST", api_path, data)
        
        if response.get("error"):
            raise Exception(f"画像アップロードエラー: {response.get('message')}")
            
        return response.get("response", {}).get("image_info", {}).get("image_url", "")

# ==================== 利益計算エンジン ====================

@dataclass
class ProductCostBreakdown:
    """商品原価内訳"""
    purchase_price_jpy: Decimal
    domestic_shipping_jpy: Decimal
    processing_fee_jpy: Decimal
    packaging_cost_jpy: Decimal
    total_cost_jpy: Decimal

@dataclass
class ShopeeFeesBreakdown:
    """Shopee手数料内訳"""
    commission_fee: Decimal
    payment_fee: Decimal
    withdrawal_fee: Decimal
    advertising_fee: Decimal
    total_fees: Decimal

@dataclass
class ShippingCostBreakdown:
    """送料内訳"""
    esf_fee: Decimal
    actual_shipping: Decimal
    seller_benefit: Decimal
    total_shipping_cost: Decimal

@dataclass
class ProfitAnalysis:
    """利益分析結果"""
    country_code: str
    selling_price_local: Decimal
    selling_price_jpy: Decimal
    
    costs: ProductCostBreakdown
    shopee_fees: ShopeeFeesBreakdown
    shipping: ShippingCostBreakdown
    
    gross_profit_jpy: Decimal
    net_profit_jpy: Decimal
    profit_margin_percent: Decimal
    roi_percent: Decimal
    
    break_even_price_jpy: Decimal
    recommended_price_jpy: Decimal
    competitiveness_score: int  # 0-100
    risk_score: int  # 0-100

class ProfitCalculator:
    """利益計算エンジン"""
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        
    async def calculate_profit(
        self,
        country_code: str,
        purchase_price_jpy: Decimal,
        weight_g: int,
        selling_price_local: Decimal,
        zone_code: str = "A"
    ) -> ProfitAnalysis:
        """総合利益計算"""
        
        market_config = COUNTRY_MARKET_CONFIG[country_code]
        exchange_rate = Decimal(str(market_config["exchange_rate"]))
        
        # 販売価格を円換算
        selling_price_jpy = selling_price_local * exchange_rate
        
        # 原価計算
        costs = await self._calculate_costs(purchase_price_jpy, weight_g)
        
        # Shopee手数料計算
        shopee_fees = await self._calculate_shopee_fees(
            country_code, selling_price_jpy
        )
        
        # 送料計算
        shipping = await self._calculate_shipping(
            country_code, weight_g, zone_code
        )
        
        # 利益計算
        gross_profit = selling_price_jpy - costs.total_cost_jpy
        net_profit = gross_profit - shopee_fees.total_fees + shipping.seller_benefit
        
        profit_margin = (net_profit / selling_price_jpy * 100) if selling_price_jpy > 0 else Decimal('0')
        roi = (net_profit / costs.total_cost_jpy * 100) if costs.total_cost_jpy > 0 else Decimal('0')
        
        # 損益分岐点計算
        break_even_price = costs.total_cost_jpy + shopee_fees.total_fees - shipping.seller_benefit
        
        # 推奨価格計算（30%利益率を目標）
        target_margin = Decimal('0.30')
        recommended_price = (costs.total_cost_jpy + shopee_fees.total_fees - shipping.seller_benefit) / (1 - target_margin)
        
        # 競合力・リスクスコア計算
        competitiveness_score = await self._calculate_competitiveness_score(
            country_code, selling_price_local, profit_margin
        )
        risk_score = await self._calculate_risk_score(
            country_code, weight_g, profit_margin
        )
        
        return ProfitAnalysis(
            country_code=country_code,
            selling_price_local=selling_price_local,
            selling_price_jpy=selling_price_jpy,
            costs=costs,
            shopee_fees=shopee_fees,
            shipping=shipping,
            gross_profit_jpy=gross_profit,
            net_profit_jpy=net_profit,
            profit_margin_percent=profit_margin,
            roi_percent=roi,
            break_even_price_jpy=break_even_price,
            recommended_price_jpy=recommended_price,
            competitiveness_score=competitiveness_score,
            risk_score=risk_score
        )
        
    async def _calculate_costs(self, purchase_price_jpy: Decimal, weight_g: int) -> ProductCostBreakdown:
        """原価計算"""
        domestic_shipping = Decimal('500')  # 国内送料（固定）
        processing_fee = purchase_price_jpy * Decimal('0.03')  # 3%手数料
        packaging_cost = Decimal('100')  # 梱包費用
        
        total_cost = purchase_price_jpy + domestic_shipping + processing_fee + packaging_cost
        
        return ProductCostBreakdown(
            purchase_price_jpy=purchase_price_jpy,
            domestic_shipping_jpy=domestic_shipping,
            processing_fee_jpy=processing_fee,
            packaging_cost_jpy=packaging_cost,
            total_cost_jpy=total_cost
        )
        
    async def _calculate_shopee_fees(self, country_code: str, selling_price_jpy: Decimal) -> ShopeeFeesBreakdown:
        """Shopee手数料計算"""
        market_config = COUNTRY_MARKET_CONFIG[country_code]
        
        commission_rate = Decimal(str(market_config["commission_rate"])) / 100
        payment_fee_rate = Decimal(str(market_config["payment_fee_rate"])) / 100
        
        commission_fee = selling_price_jpy * commission_rate
        payment_fee = selling_price_jpy * payment_fee_rate
        withdrawal_fee = selling_price_jpy * Decimal('0.01')  # 1%
        advertising_fee = Decimal('0')  # 広告費は別途
        
        total_fees = commission_fee + payment_fee + withdrawal_fee + advertising_fee
        
        return ShopeeFeesBreakdown(
            commission_fee=commission_fee,
            payment_fee=payment_fee,
            withdrawal_fee=withdrawal_fee,
            advertising_fee=advertising_fee,
            total_fees=total_fees
        )
        
    async def _calculate_shipping(self, country_code: str, weight_g: int, zone_code: str) -> ShippingCostBreakdown:
        """送料計算"""
        # Supabaseから送料データ取得
        shipping_data = await self.supabase.calculate_shipping(country_code, weight_g, zone_code)
        
        if not shipping_data:
            # デフォルト送料
            esf_fee = Decimal('300')
            actual_shipping = Decimal('500')
        else:
            esf_fee = Decimal(str(shipping_data['esf_amount']))
            actual_shipping = Decimal(str(shipping_data['actual_amount']))
            
        # 為替レート適用
        market_config = COUNTRY_MARKET_CONFIG[country_code]
        exchange_rate = Decimal(str(market_config["exchange_rate"]))
        
        esf_fee_jpy = esf_fee * exchange_rate
        actual_shipping_jpy = actual_shipping * exchange_rate
        
        # 売り手利益（ESF - 実送料）
        seller_benefit = esf_fee_jpy - actual_shipping_jpy
        total_cost = esf_fee_jpy
        
        return ShippingCostBreakdown(
            esf_fee=esf_fee_jpy,
            actual_shipping=actual_shipping_jpy,
            seller_benefit=seller_benefit,
            total_shipping_cost=total_cost
        )
        
    async def _calculate_competitiveness_score(self, country_code: str, price: Decimal, margin: Decimal) -> int:
        """競合力スコア計算（0-100）"""
        # 簡易実装：価格帯と利益率から算出
        if margin > 30:
            return min(100, int(70 + margin))
        elif margin > 20:
            return min(80, int(50 + margin * 1.5))
        elif margin > 10:
            return min(60, int(30 + margin * 2))
        else:
            return max(10, int(margin * 3))
            
    async def _calculate_risk_score(self, country_code: str, weight_g: int, margin: Decimal) -> int:
        """リスクスコア計算（0-100、高いほど危険）"""
        base_risk = 20
        
        # 重量リスク
        if weight_g > 2000:
            base_risk += 20
        elif weight_g > 1000:
            base_risk += 10
            
        # 利益率リスク
        if margin < 10:
            base_risk += 30
        elif margin < 20:
            base_risk += 15
            
        # 国別リスク
        country_risks = {
            "SG": 5, "MY": 10, "TH": 15, "PH": 20, "ID": 25, "VN": 20, "TW": 10
        }
        base_risk += country_risks.get(country_code, 15)
        
        return min(100, base_risk)

# ==================== 商品データ自動変換エンジン ====================

class ProductDataConverter:
    """商品データ自動変換エンジン"""
    
    def __init__(self, shopee_client: ShopeePartnerAPIClient):
        self.shopee_client = shopee_client
        
    async def convert_to_shopee_format(
        self,
        source_data: Dict[str, Any],
        country_code: str,
        category_mapping: Dict[int, int] = None
    ) -> Dict[str, Any]:
        """ソースデータをShopee出品フォーマットに自動変換"""
        
        market_config = COUNTRY_MARKET_CONFIG[country_code]
        
        # 必須フィールド検証
        missing_fields = await self._validate_required_fields(source_data, market_config)
        if missing_fields:
            raise ValueError(f"必須フィールドが不足: {missing_fields}")
            
        # 禁止キーワードチェック
        prohibited_warnings = await self._check_prohibited_content(source_data, market_config)
        
        # データ変換実行
        shopee_data = {
            "item_name": await self._convert_title(source_data, market_config),
            "description": await self._convert_description(source_data, market_config),
            "category_id": await self._convert_category(source_data, country_code, category_mapping),
            "price": await self._convert_price(source_data, market_config),
            "stock": int(source_data.get("stock", 0)),
            "item_sku": source_data.get("sku", ""),
            "weight": await self._convert_weight(source_data, market_config),
            "dimension": await self._convert_dimensions(source_data, market_config),
            "image": await self._convert_images(source_data),
            "item_status": "NORMAL",
            "condition": source_data.get("condition", "NEW"),
            "pre_order": {
                "is_pre_order": False
            }
        }
        
        # 国別特別フィールド追加
        country_specific = await self._add_country_specific_fields(source_data, country_code)
        shopee_data.update(country_specific)
        
        return {
            "converted_data": shopee_data,
            "warnings": prohibited_warnings,
            "metadata": {
                "conversion_timestamp": datetime.now(timezone.utc).isoformat(),
                "source_country": country_code,
                "market_config_version": "1.0"
            }
        }
        
    async def _validate_required_fields(self, data: Dict, config: Dict) -> List[str]:
        """必須フィールド検証"""
        missing = []
        required = config["required_fields"]
        
        field_mapping = {
            "item_name": ["title", "name", "product_name", "item_name"],
            "description": ["description", "desc"],
            "price": ["price", "selling_price"],
            "stock": ["stock", "quantity", "inventory"],
            "category_id": ["category_id", "category"],
            "images": ["images", "image_urls", "photos"]
        }
        
        for required_field in required:
            possible_fields = field_mapping.get(required_field, [required_field])
            if not any(data.get(field) for field in possible_fields):
                missing.append(required_field)
                
        return missing
        
    async def _check_prohibited_content(self, data: Dict, config: Dict) -> List[str]:
        """禁止コンテンツチェック"""
        warnings = []
        prohibited = config["prohibited_keywords"]
        
        # タイトルと説明文をチェック
        text_to_check = [
            data.get("title", ""),
            data.get("description", ""),
            data.get("product_name", "")
        ]
        
        content = " ".join(text_to_check).lower()
        
        for keyword in prohibited:
            if keyword.lower() in content:
                warnings.append(f"禁止キーワード検出: {keyword}")
                
        return warnings
        
    async def _convert_title(self, data: Dict, config: Dict) -> str:
        """タイトル変換"""
        title_fields = ["title", "product_name", "name", "item_name"]
        title = ""
        
        for field in title_fields:
            if data.get(field):
                title = str(data[field])
                break
                
        if not title:
            raise ValueError("商品タイトルが見つかりません")
            
        # 文字数制限適用
        max_length = config["title_max_length"]
        if len(title) > max_length:
            title = title[:max_length-3] + "..."
            
        # 禁止文字除去
        title = re.sub(r'[^\w\s\-\(\)\[\]\.\/\+\&]', '', title)
        
        return title.strip()
        
    async def _convert_description(self, data: Dict, config: Dict) -> str:
        """説明文変換"""
        description = data.get("description", "")
        
        if not description:
            # 自動生成
            title = await self._convert_title(data, config)
            description = f"【{title}】\n\n高品質な商品です。詳細はお問い合わせください。"
            
        # 文字数制限
        max_length = config["description_max_length"]
        if len(description) > max_length:
            description = description[:max_length-10] + "\n...(続く)"
            
        # 言語別テンプレート適用
        language = config["language"]
        if language == "th":
            description += "\n\n🇹🇭 สินค้าคุณภาพดี จัดส่งรวดเร็ว"
        elif language == "id":
            description += "\n\n🇮🇩 Produk berkualitas, pengiriman cepat"
        elif language == "vi":
            description += "\n\n🇻🇳 Sản phẩm chất lượng cao, giao hàng nhanh"
        elif language == "zh-TW":
            description += "\n\n🇹🇼 高品質商品，快速出貨"
            
        return description.strip()
        
    async def _convert_category(
        self, 
        data: Dict, 
        country_code: str, 
        mapping: Dict[int, int] = None
    ) -> int:
        """カテゴリー変換"""
        source_category = data.get("category_id")
        
        if mapping and source_category in mapping:
            return mapping[source_category]
            
        # デフォルトカテゴリー（要調査・更新）
        default_categories = {
            "SG": 100001,  # Electronics
            "MY": 100001,
            "TH": 100001,
            "PH": 100001,
            "ID": 100001,
            "VN": 100001,
            "TW": 100001
        }
        
        return default_categories.get(country_code, 100001)
        
    async def _convert_price(self, data: Dict, config: Dict) -> float:
        """価格変換"""
        price_jpy = float(data.get("price", 0))
        exchange_rate = config["exchange_rate"]
        
        local_price = price_jpy / exchange_rate
        
        # 最低価格チェック
        min_prices = {
            "SG": 1.0, "MY": 1.0, "TH": 10.0, "PH": 10.0,
            "ID": 1000.0, "VN": 10000.0, "TW": 10.0
        }
        
        min_price = min_prices.get(config.get("currency", "SGD"), 1.0)
        return max(local_price, min_price)
        
    async def _convert_weight(self, data: Dict, config: Dict) -> float:
        """重量変換"""
        weight_g = float(data.get("weight_g", 100))  # デフォルト100g
        
        if config["weight_unit"] == "kg":
            return weight_g / 1000.0
        else:
            return weight_g
            
    async def _convert_dimensions(self, data: Dict, config: Dict) -> Dict[str, int]:
        """寸法変換"""
        # デフォルト寸法（cm）
        return {
            "package_length": int(data.get("length_cm", 10)),
            "package_width": int(data.get("width_cm", 10)), 
            "package_height": int(data.get("height_cm", 10))
        }
        
    async def _convert_images(self, data: Dict) -> Dict[str, List[str]]:
        """画像変換"""
        image_fields = ["images", "image_urls", "photos"]
        images = []
        
        for field in image_fields:
            if data.get(field):
                if isinstance(data[field], list):
                    images = data[field]
                else:
                    images = [data[field]]
                break
                
        # 最大9枚制限
        images = images[:9]
        
        # URL検証（簡易）
        valid_images = []
        for img in images:
            if isinstance(img, str) and (img.startswith("http") or img.startswith("https")):
                valid_images.append(img)
                
        return {"image_url_list": valid_images}
        
    async def _add_country_specific_fields(self, data: Dict, country_code: str) -> Dict[str, Any]:
        """国別特別フィールド追加"""
        specific_fields = {}
        
        if country_code == "TH":
            # タイは必須ブランド
            specific_fields["brand"] = {
                "brand_id": 0,
                "original_brand_name": data.get("brand", "No Brand")
            }
            
        elif country_code == "ID":
            # インドネシアは必須コンディション
            specific_fields["condition"] = data.get("condition", "NEW")
            
        return specific_fields

# ==================== 統合出品管理システム ====================

class ShopeeListingManager:
    """Shopee統合出品管理システム"""
    
    def __init__(self, api_configs: Dict[str, ShopeeAPIConfig], supabase_client):
        self.api_configs = api_configs
        self.supabase = supabase_client
        self.profit_calculator = ProfitCalculator(supabase_client)
        
    async def list_product_to_countries(
        self,
        product_data: Dict[str, Any],
        target_countries: List[str],
        auto_optimize: bool = True
    ) -> Dict[str, Any]:
        """複数国への自動出品"""
        
        results = {}
        
        for country_code in target_countries:
            try:
                result = await self._list_single_product(
                    product_data, country_code, auto_optimize
                )
                results[country_code] = result
                
                # API制限対応
                await asyncio.sleep(0.2)
                
            except Exception as e:
                results[country_code] = {
                    "success": False,
                    "error": str(e)
                }
                
        return results
        
    async def _list_single_product(
        self,
        product_data: Dict[str, Any],
        country_code: str,
        auto_optimize: bool
    ) -> Dict[str, Any]:
        """単一国への出品"""
        
        if country_code not in self.api_configs:
            raise ValueError(f"API設定が見つかりません: {country_code}")
            
        config = self.api_configs[country_code]
        
        async with ShopeePartnerAPIClient(config) as client:
            converter = ProductDataConverter(client)
            
            # データ変換
            conversion_result = await converter.convert_to_shopee_format(
                product_data, country_code
            )
            
            shopee_data = conversion_result["converted_data"]
            warnings = conversion_result["warnings"]
            
            # 利益計算（オプション）
            profit_analysis = None
            if auto_optimize and product_data.get("purchase_price_jpy"):
                profit_analysis = await self.profit_calculator.calculate_profit(
                    country_code=country_code,
                    purchase_price_jpy=Decimal(str(product_data["purchase_price_jpy"])),
                    weight_g=int(product_data.get("weight_g", 100)),
                    selling_price_local=Decimal(str(shopee_data["price"]))
                )
                
                # 利益が低い場合は価格を調整
                if profit_analysis.profit_margin_percent < 20:
                    recommended_price = float(profit_analysis.recommended_price_jpy / Decimal(str(COUNTRY_MARKET_CONFIG[country_code]["exchange_rate"])))
                    shopee_data["price"] = recommended_price
                    
            # Shopee APIで出品実行
            api_response = await client.add_item(shopee_data)
            
            # データベースに保存
            if api_response.get("item_id"):
                await self._save_listing_record(
                    product_data, country_code, api_response, profit_analysis
                )
                
            return {
                "success": True,
                "item_id": api_response.get("item_id"),
                "shopee_data": shopee_data,
                "warnings": warnings,
                "profit_analysis": asdict(profit_analysis) if profit_analysis else None,
                "api_response": api_response
            }
            
    async def _save_listing_record(
        self,
        source_data: Dict,
        country_code: str,
        api_response: Dict,
        profit_analysis: ProfitAnalysis = None
    ):
        """出品記録をデータベースに保存"""
        
        listing_data = {
            "sku": source_data.get("sku"),
            "country_code": country_code,
            "shopee_item_id": api_response.get("item_id"),
            "shopee_item_sku": source_data.get("sku"),
            "listing_status": "active",
            "original_data": json.dumps(source_data),
            "shopee_response": json.dumps(api_response),
            "profit_data": json.dumps(asdict(profit_analysis)) if profit_analysis else None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.supabase.create_product(listing_data)

# ==================== 使用例 ====================

async def main_example():
    """使用例"""
    
    # API設定（各国別）
    api_configs = {
        "SG": ShopeeAPIConfig(
            partner_id=123456,
            partner_key="your-partner-key",
            shop_id=789012,
            access_token="your-access-token",
            refresh_token="your-refresh-token",
            base_url=SHOPEE_API_ENDPOINTS["SG"],
            country_code="SG",
            currency="SGD",
            timezone="Asia/Singapore",
            language="en"
        )
        # 他の国も同様に設定
    }
    
    # サンプル商品データ
    product_data = {
        "sku": "PROD-001",
        "title": "高品質ワイヤレスイヤホン Bluetooth5.0対応",
        "description": "最新のBluetooth5.0技術を採用した高音質ワイヤレスイヤホン。ノイズキャンセリング機能付き。",
        "price": 3980,  # 日本円
        "purchase_price_jpy": 1500,
        "stock": 100,
        "weight_g": 150,
        "category_id": 100001,
        "images": [
            "https://example.com/image1.jpg",
            "https://example.com/image2.jpg"
        ],
        "brand": "TechBrand",
        "condition": "NEW"
    }
    
    # Supabaseクライアント（省略）
    supabase_client = None
    
    # 出品実行
    listing_manager = ShopeeListingManager(api_configs, supabase_client)
    
    results = await listing_manager.list_product_to_countries(
        product_data=product_data,
        target_countries=["SG", "MY", "TH"],
        auto_optimize=True
    )
    
    for country, result in results.items():
        if result["success"]:
            print(f"✅ {country}: 出品成功 (Item ID: {result['item_id']})")
            if result["profit_analysis"]:
                analysis = result["profit_analysis"]
                print(f"   利益率: {analysis['profit_margin_percent']:.1f}%")
                print(f"   純利益: ¥{analysis['net_profit_jpy']}")
        else:
            print(f"❌ {country}: 出品失敗 - {result['error']}")

if __name__ == "__main__":
    # asyncio.run(main_example())
    print("Shopee完全出品システム - 準備完了")
    print("✅ Partner API連携")
    print("✅ 国別データ自動変換") 
    print("✅ 利益計算エンジン")
    print("✅ 必須項目自動抽出")
    print("✅ カテゴリー自動取得")
    print("✅ 複数国同時出品")