# Shopee 7カ国対応 出品管理ツール
# プロジェクト構成とメイン機能

import asyncio
import httpx
import hashlib
import hmac
import time
import json
import pandas as pd
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
import redis
from celery import Celery
import logging

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('shopee_manager.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 国別設定
COUNTRY_CONFIGS = {
    'SG': {'currency': 'SGD', 'host': 'https://partner.shopeemobile.com', 'partner_id': 0, 'shop_id': 0},
    'MY': {'currency': 'MYR', 'host': 'https://partner.shopeemobile.com', 'partner_id': 0, 'shop_id': 0},
    'TH': {'currency': 'THB', 'host': 'https://partner.shopeemobile.com', 'partner_id': 0, 'shop_id': 0},
    'PH': {'currency': 'PHP', 'host': 'https://partner.shopeemobile.com', 'partner_id': 0, 'shop_id': 0},
    'ID': {'currency': 'IDR', 'host': 'https://partner.shopeemobile.com', 'partner_id': 0, 'shop_id': 0},
    'VN': {'currency': 'VND', 'host': 'https://partner.shopeemobile.com', 'partner_id': 0, 'shop_id': 0},
    'TW': {'currency': 'TWD', 'host': 'https://partner.shopeemobile.com', 'partner_id': 0, 'shop_id': 0}
}

# データベースモデル
Base = declarative_base()

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(100), unique=True, index=True)
    country = Column(String(2), index=True)
    product_name_ja = Column(String(500))
    product_name_en = Column(String(500))
    price = Column(Float)
    stock = Column(Integer)
    category_id = Column(Integer)
    shopee_item_id = Column(String(50))
    images = Column(Text)  # JSON文字列として保存
    status = Column(String(20), default="pending")  # pending, uploaded, error
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ShopeeAuth(Base):
    __tablename__ = "shopee_auth"
    
    id = Column(Integer, primary_key=True)
    country = Column(String(2), unique=True)
    access_token = Column(Text)
    refresh_token = Column(Text)
    expires_at = Column(DateTime)
    shop_id = Column(String(50))
    partner_id = Column(String(50))
    partner_key = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ApiLog(Base):
    __tablename__ = "api_logs"
    
    id = Column(Integer, primary_key=True)
    country = Column(String(2))
    endpoint = Column(String(200))
    method = Column(String(10))
    request_data = Column(Text)
    response_data = Column(Text)
    status_code = Column(Integer)
    error_message = Column(Text)
    execution_time = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

# Pydantic Models
class ProductData(BaseModel):
    sku: str
    country: str
    product_name_ja: str
    product_name_en: str
    price: float
    stock: int
    category_id: int
    image_urls: List[str]

class ProductUpdate(BaseModel):
    price: Optional[float] = None
    stock: Optional[int] = None
    product_name_ja: Optional[str] = None
    product_name_en: Optional[str] = None

# Shopee APIクライアント
class ShopeeAPIClient:
    def __init__(self, country: str, db: Session):
        self.country = country
        self.db = db
        self.config = COUNTRY_CONFIGS[country]
        self.base_url = self.config['host']
        self.auth_info = self._get_auth_info()
        
    def _get_auth_info(self) -> Optional[ShopeeAuth]:
        """データベースから認証情報を取得"""
        return self.db.query(ShopeeAuth).filter(ShopeeAuth.country == self.country).first()
    
    def _generate_signature(self, api_path: str, timestamp: int, access_token: str, shop_id: str) -> str:
        """Shopee API署名生成"""
        if not self.auth_info:
            raise ValueError(f"認証情報が見つかりません: {self.country}")
            
        base_string = f"{self.auth_info.partner_id}{api_path}{timestamp}{access_token}{shop_id}"
        signature = hmac.new(
            self.auth_info.partner_key.encode('utf-8'),
            base_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    async def _check_and_refresh_token(self):
        """トークンの有効期限をチェックし、必要に応じて更新"""
        if not self.auth_info:
            raise ValueError(f"認証情報が見つかりません: {self.country}")
            
        if datetime.utcnow() >= self.auth_info.expires_at - timedelta(minutes=10):
            logger.info(f"トークンを更新中: {self.country}")
            await self._refresh_access_token()
    
    async def _refresh_access_token(self):
        """アクセストークンの更新"""
        api_path = "/api/v2/auth/access_token/get"
        timestamp = int(time.time())
        
        signature = hmac.new(
            self.auth_info.partner_key.encode('utf-8'),
            f"{self.auth_info.partner_id}{api_path}{timestamp}".encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        payload = {
            "refresh_token": self.auth_info.refresh_token,
            "partner_id": int(self.auth_info.partner_id),
            "timestamp": timestamp,
            "sign": signature
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}{api_path}", json=payload)
            
        if response.status_code == 200:
            data = response.json()
            if data.get("error") == "":
                # トークン情報を更新
                self.auth_info.access_token = data["access_token"]
                self.auth_info.refresh_token = data["refresh_token"]
                self.auth_info.expires_at = datetime.utcnow() + timedelta(seconds=data["expire_in"])
                self.db.commit()
                logger.info(f"トークン更新完了: {self.country}")
            else:
                logger.error(f"トークン更新エラー: {data}")
                raise Exception(f"トークン更新失敗: {data}")
    
    async def _make_request(self, method: str, api_path: str, data: Dict = None) -> Dict:
        """Shopee APIリクエストの実行"""
        await self._check_and_refresh_token()
        
        timestamp = int(time.time())
        signature = self._generate_signature(
            api_path, timestamp, self.auth_info.access_token, self.auth_info.shop_id
        )
        
        headers = {"Content-Type": "application/json"}
        params = {
            "partner_id": int(self.auth_info.partner_id),
            "timestamp": timestamp,
            "access_token": self.auth_info.access_token,
            "shop_id": int(self.auth_info.shop_id),
            "sign": signature
        }
        
        url = f"{self.base_url}{api_path}"
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if method.upper() == "POST":
                    response = await client.post(url, params=params, json=data, headers=headers)
                else:
                    response = await client.get(url, params=params, headers=headers)
                
                execution_time = time.time() - start_time
                
                # APIログを記録
                log_entry = ApiLog(
                    country=self.country,
                    endpoint=api_path,
                    method=method,
                    request_data=json.dumps(data) if data else None,
                    response_data=response.text,
                    status_code=response.status_code,
                    execution_time=execution_time
                )
                
                if response.status_code != 200:
                    log_entry.error_message = f"HTTPエラー: {response.status_code}"
                
                self.db.add(log_entry)
                self.db.commit()
                
                response.raise_for_status()
                return response.json()
                
        except Exception as e:
            execution_time = time.time() - start_time
            log_entry = ApiLog(
                country=self.country,
                endpoint=api_path,
                method=method,
                request_data=json.dumps(data) if data else None,
                error_message=str(e),
                execution_time=execution_time
            )
            self.db.add(log_entry)
            self.db.commit()
            logger.error(f"API リクエストエラー: {e}")
            raise
    
    async def add_product(self, product_data: ProductData) -> Dict:
        """商品登録"""
        api_path = "/api/v2/product/add_item"
        
        payload = {
            "item_name": product_data.product_name_en,
            "description": f"<p>{product_data.product_name_ja}</p><p>{product_data.product_name_en}</p>",
            "item_sku": product_data.sku,
            "category_id": product_data.category_id,
            "price": product_data.price,
            "stock": product_data.stock,
            "item_status": "NORMAL",
            "dimension": {"package_length": 10, "package_width": 10, "package_height": 10},
            "weight": 0.1,
            "image": {"image_url_list": product_data.image_urls}
        }
        
        return await self._make_request("POST", api_path, payload)
    
    async def update_product(self, item_id: str, update_data: ProductUpdate) -> Dict:
        """商品更新"""
        api_path = "/api/v2/product/update_item"
        
        payload = {"item_id": int(item_id)}
        
        if update_data.price is not None:
            payload["price"] = update_data.price
        if update_data.stock is not None:
            payload["stock"] = update_data.stock
        if update_data.product_name_en is not None:
            payload["item_name"] = update_data.product_name_en
        if update_data.product_name_ja is not None:
            description = f"<p>{update_data.product_name_ja}</p>"
            if update_data.product_name_en:
                description += f"<p>{update_data.product_name_en}</p>"
            payload["description"] = description
        
        return await self._make_request("POST", api_path, payload)

# データベース接続設定
DATABASE_URL = "postgresql://username:password@localhost:5432/shopee_manager"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# FastAPI アプリケーション
app = FastAPI(title="Shopee 7カ国対応 出品管理ツール", version="1.0.0")

# Redis接続（レート制限用）
redis_client = redis.Redis(host='localhost', port=6379, db=0)

# Celery設定（バックグラウンドタスク）
celery_app = Celery(
    'shopee_manager',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

# レート制限デコレータ
def rate_limit(max_requests: int = 10, time_window: int = 1):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            key = f"rate_limit:{func.__name__}"
            current = redis_client.get(key)
            
            if current is None:
                redis_client.setex(key, time_window, 1)
                return await func(*args, **kwargs)
            elif int(current) < max_requests:
                redis_client.incr(key)
                return await func(*args, **kwargs)
            else:
                raise HTTPException(status_code=429, detail="レート制限に達しました")
                
        return wrapper
    return decorator

if __name__ == "__main__":
    # テーブル作成
    Base.metadata.create_all(bind=engine)
    logger.info("Shopee 7カ国対応出品管理ツール - 初期化完了")