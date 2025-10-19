#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
mfcloud_service.py - マネーフォワードクラウド連携サービス
"""

import json
import time
import httpx
from datetime import datetime, date
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field

from utils.config import settings
from utils.logger import setup_logger, log_to_jsonl

# ロガー設定
logger = setup_logger()

class MFJournalEntry(BaseModel):
    """マネーフォワードクラウド仕訳データモデル"""
    entry_side: str = Field(..., description="借方/貸方（debit/credit）")
    account_item_id: str = Field(..., description="勘定科目ID")
    tax_code: Optional[str] = Field(None, description="税区分")
    amount: float = Field(..., description="金額")
    vat: Optional[float] = Field(None, description="消費税額")
    description: Optional[str] = Field(None, description="摘要")

class MFJournalRequest(BaseModel):
    """マネーフォワードクラウド仕訳リクエストモデル"""
    company_id: str = Field(..., description="事業所ID")
    journal_timestamp: str = Field(..., description="仕訳日時")
    journal_entries: List[MFJournalEntry] = Field(..., description="仕訳明細リスト")
    receipt_ids: Optional[List[str]] = Field(None, description="関連証憑ID")
    memo: Optional[str] = Field(None, description="メモ")

class MFJournalResponse(BaseModel):
    """マネーフォワードクラウド仕訳レスポンスモデル"""
    id: str = Field(..., description="仕訳ID")
    company_id: str = Field(..., description="事業所ID")
    journal_timestamp: str = Field(..., description="仕訳日時")
    journal_entries: List[Dict[str, Any]] = Field(..., description="仕訳明細リスト")
    receipt_ids: Optional[List[str]] = Field(None, description="関連証憑ID")
    memo: Optional[str] = Field(None, description="メモ")
    created_at: str = Field(..., description="作成日時")
    updated_at: str = Field(..., description="更新日時")

class MFAccountItem(BaseModel):
    """マネーフォワードクラウド勘定科目モデル"""
    id: str = Field(..., description="勘定科目ID")
    name: str = Field(..., description="勘定科目名")
    shortcut: Optional[str] = Field(None, description="ショートカット")
    default_tax_code: Optional[str] = Field(None, description="デフォルト税区分")
    categories: List[str] = Field(..., description="カテゴリ")

class MFCloudService:
    """マネーフォワードクラウド連携サービス"""
    
    def __init__(self):
        """初期化"""
        self.base_url = settings.MF_BASE_URL
        self.access_token = settings.MF_ACCESS_TOKEN
        self.account_items_cache = {}  # 勘定科目キャッシュ
        self.company_id = None  # 接続時に事業所IDを取得
    
    async def is_configured(self) -> bool:
        """設定が完了しているかどうかを確認
        
        Returns:
            設定完了フラグ
        """
        return bool(self.access_token)
    
    async def _request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """APIリクエストを実行
        
        Args:
            method: HTTPメソッド
            endpoint: APIエンドポイント
            data: リクエストデータ
            params: URLパラメータ
            
        Returns:
            レスポンスデータ
            
        Raises:
            Exception: API呼び出しエラー
        """
        if not self.is_configured():
            raise Exception("マネーフォワードクラウドAPIが設定されていません")
        
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers, params=params, timeout=30)
                elif method.upper() == "POST":
                    response = await client.post(url, headers=headers, json=data, timeout=30)
                elif method.upper() == "PUT":
                    response = await client.put(url, headers=headers, json=data, timeout=30)
                elif method.upper() == "DELETE":
                    response = await client.delete(url, headers=headers, timeout=30)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                if response.status_code >= 400:
                    error_data = {
                        "status_code": response.status_code,
                        "url": url,
                        "method": method,
                        "message": response.text
                    }
                    
                    # エラーログ記録
                    log_to_jsonl(
                        {
                            "type": "mf_cloud_api_error",
                            "error": error_data,
                            "timestamp": datetime.utcnow().isoformat()
                        },
                        settings.ERROR_LOG_FILE
                    )
                    
                    raise Exception(f"MF Cloud API Error: {response.status_code} - {response.text}")
                
                return response.json()
                
        except httpx.RequestError as e:
            error_data = {
                "url": url,
                "method": method,
                "message": str(e)
            }
            
            # エラーログ記録
            log_to_jsonl(
                {
                    "type": "mf_cloud_connection_error",
                    "error": error_data,
                    "timestamp": datetime.utcnow().isoformat()
                },
                settings.ERROR_LOG_FILE
            )
            
            raise Exception(f"MF Cloud Connection Error: {str(e)}")
    
    async def connect(self) -> bool:
        """マネーフォワードクラウドに接続し、基本情報を取得
        
        Returns:
            接続成功フラグ
        """
        try:
            # 事業所情報の取得
            companies = await self._request("GET", "/companies")
            
            if not companies or "companies" not in companies or not companies["companies"]:
                logger.error("マネーフォワードクラウド: 事業所情報が取得できませんでした")
                return False
            
            # 最初の事業所を使用
            self.company_id = companies["companies"][0]["id"]
            logger.info(f"マネーフォワードクラウド: 事業所ID {self.company_id} に接続しました")
            
            # 勘定科目情報の取得
            await self.refresh_account_items()
            
            return True
            
        except Exception as e:
            logger.error(f"マネーフォワードクラウド接続エラー: {e}")
            return False
    
    async def refresh_account_items(self) -> List[MFAccountItem]:
        """勘定科目情報を更新
        
        Returns:
            勘定科目リスト
        """
        try:
            account_items_response = await self._request(
                "GET", 
                f"/companies/{self.company_id}/account_items"
            )
            
            account_items = []
            for item in account_items_response.get("account_items", []):
                account_item = MFAccountItem(
                    id=item["id"],
                    name=item["name"],