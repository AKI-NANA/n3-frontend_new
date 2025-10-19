"""
app/services/kanpeki_kanri_asin_service.py
ASIN/URL一括アップロードサービス - 完全実装版
用途: Amazon ASIN、各種ECサイトURLからの商品情報一括取得・登録の業務ロジック
修正対象: 新マーケットプレイス追加時、データ処理拡張時
"""

import re
import csv
import io
import asyncio
import logging
import aiohttp
from typing import List, Dict, Any, Optional, Union, Tuple
from datetime import datetime
from urllib.parse import urlparse, parse_qs
import json
from dataclasses import dataclass, asdict
import time
import hashlib

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.exceptions import ValidationException, BusinessLogicException
from app.infrastructure.cache.redis_cache import CacheManager
from app.infrastructure.external.marketplace_factory import MarketplaceFactory

settings = get_settings()
logger = get_logger(__name__)

# === データクラス定義 ===

@dataclass
class ASINInputType:
    """ASIN入力種別定数"""
    ASIN: str = "asin"
    AMAZON_URL: str = "amazon_url"
    MERCARI_URL: str = "mercari_url"
    YAHOO_URL: str = "yahoo_url"
    RAKUTEN_URL: str = "rakuten_url"
    UNKNOWN: str = "unknown"

@dataclass
class ParsedASINItem:
    """解析済みASIN/URLアイテム"""
    line_number: int
    original_input: str
    item_type: str
    extracted_value: Optional[str]
    marketplace: str
    errors: List[str]
    is_valid: bool
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換"""
        return asdict(self)

@dataclass
class ProcessedItem:
    """処理済みアイテム"""
    input: str
    item_type: str
    status: str  # success, error, warning
    product_name: Optional[str]
    price: Optional[int]
    marketplace: str
    error_message: Optional[str]
    extracted_data: Optional[Dict[str, Any]]
    processing_time: float
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換"""
        return asdict(self)

@dataclass
class ProcessingSummary:
    """処理サマリー"""
    total: int
    success: int
    error: int
    warning: int
    processing_time: float
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換"""
        return asdict(self)

class ASINUploadService:
    """
    ASIN/URLアップロードサービス
    
    説明: ASIN/URL解析・処理・データ取得の統合サービス
    主要機能: テキスト解析、CSV処理、一括データ取得、検証
    修正対象: 新マーケットプレイス追加時、処理ロジック拡張時
    """
    
    def __init__(self):
        """
        サービス初期化
        
        説明: 各種パターン・設定を初期化
        修正対象: 新しいパターン追加時
        """
        self.cache_manager = CacheManager()
        
        # 正規表現パターン定義
        self.patterns = {
            'asin': re.compile(r'\b[A-Z0-9]{10}\b'),
            'amazon_url': re.compile(r'https?://(?:www\.)?amazon\.co\.jp/(?:.*?/)?dp/([A-Z0-9]{10})'),
            'amazon_url_gp': re.compile(r'https?://(?:www\.)?amazon\.co\.jp/gp/product/([A-Z0-9]{10})'),
            'mercari_url': re.compile(r'https?://(?:www\.)?mercari\.com/jp/items/([a-zA-Z0-9]+)'),
            'yahoo_auction_url': re.compile(r'https?://auctions\.yahoo\.co\.jp/items/([a-zA-Z0-9]+)'),
            'rakuten_url': re.compile(r'https?://(?:item|product)\.rakuten\.co\.jp/[^/]+/([^/?]+)')
        }
        
        # マーケットプレイス設定
        self.marketplace_configs = {
            'amazon': {
                'name': 'Amazon',
                'supported_types': [ASINInputType.ASIN, ASINInputType.AMAZON_URL],
                'rate_limit': 1.0,  # 秒間リクエスト数
                'timeout': 30,
                'max_retries': 3
            },
            'mercari': {
                'name': 'メルカリ',
                'supported_types': [ASINInputType.MERCARI_URL],
                'rate_limit': 0.5,
                'timeout': 15,
                'max_retries': 2
            },
            'yahoo': {
                'name': 'ヤフオク',
                'supported_types': [ASINInputType.YAHOO_URL],
                'rate_limit': 0.5,
                'timeout': 15,
                'max_retries': 2
            },
            'rakuten': {
                'name': '楽天市場',
                'supported_types': [ASINInputType.RAKUTEN_URL],
                'rate_limit': 0.5,
                'timeout': 15,
                'max_retries': 2
            }
        }
        
        # 処理制限設定
        self.processing_limits = {
            'max_text_length': 10000,
            'max_items_per_request': 100,
            'max_file_size': 5 * 1024 * 1024,  # 5MB
            'max_csv_rows': 1000
        }
        
        logger.info("ASINアップロードサービス初期化完了")
    
    async def parse_input_text(self, input_text: str) -> List[ParsedASINItem]:
        """
        入力テキスト解析
        
        説明: 改行区切りのテキストからASIN/URLを抽出・解析
        パラメータ:
            input_text: 解析対象テキスト
        戻り値: 解析済みアイテムリスト
        修正対象: 新しいURL形式追加時
        """
        try:
            logger.info(f"テキスト解析開始: 入力長={len(input_text)}")
            
            # 入力長制限チェック
            if len(input_text) > self.processing_limits['max_text_length']:
                raise ValidationException(
                    f"入力テキストが長すぎます。{self.processing_limits['max_text_length']}文字以内で入力してください。"
                )
            
            # 行分割・空行除去
            lines = [line.strip() for line in input_text.split('\n') if line.strip()]
            
            if not lines:
                raise ValidationException("有効な入力データがありません")
            
            if len(lines) > self.processing_limits['max_items_per_request']:
                raise ValidationException(
                    f"一度に処理できるのは{self.processing_limits['max_items_per_request']}件までです"
                )
            
            parsed_items = []
            
            for line_number, line in enumerate(lines, 1):
                try:
                    item = await self._parse_single_input(line, line_number)
                    parsed_items.append(item)
                    
                except Exception as e:
                    # 個別エラーは記録して継続
                    error_item = ParsedASINItem(
                        line_number=line_number,
                        original_input=line,
                        item_type=ASINInputType.UNKNOWN,
                        extracted_value=None,
                        marketplace='unknown',
                        errors=[f"解析エラー: {str(e)}"],
                        is_valid=False
                    )
                    parsed_items.append(error_item)
                    logger.warning(f"行{line_number}解析エラー: {str(e)}")
            
            logger.info(f"テキスト解析完了: {len(parsed_items)}件解析")
            return parsed_items
            
        except Exception as e:
            logger.error(f"テキスト解析エラー: {str(e)}")
            raise
    
    async def _parse_single_input(self, input_str: str, line_number: int) -> ParsedASINItem:
        """
        単一入力解析
        
        説明: 1つの入力文字列を解析してアイテム情報を抽出
        パラメータ:
            input_str: 入力文字列
            line_number: 行番号
        戻り値: 解析済みアイテム
        修正対象: 新しいパターン追加時
        """
        input_str = input_str.strip()
        errors = []
        
        # 入力文字列の基本検証
        if len(input_str) > 500:  # URL最大長制限
            errors.append("入力が長すぎます（500文字以内）")
            return ParsedASINItem(
                line_number=line_number,
                original_input=input_str,
                item_type=ASINInputType.UNKNOWN,
                extracted_value=None,
                marketplace='unknown',
                errors=errors,
                is_valid=False
            )
        
        # Amazon ASIN チェック（単体）
        asin_match = self.patterns['asin'].search(input_str)
        if asin_match and len(input_str) <= 20:  # ASIN単体の場合
            return ParsedASINItem(
                line_number=line_number,
                original_input=input_str,
                item_type=ASINInputType.ASIN,
                extracted_value=asin_match.group(0),
                marketplace='amazon',
                errors=[],
                is_valid=True
            )
        
        # Amazon URL チェック
        amazon_match = self.patterns['amazon_url'].search(input_str)
        if not amazon_match:
            amazon_match = self.patterns['amazon_url_gp'].search(input_str)
        
        if amazon_match:
            return ParsedASINItem(
                line_number=line_number,
                original_input=input_str,
                item_type=ASINInputType.AMAZON_URL,
                extracted_value=amazon_match.group(1),
                marketplace='amazon',
                errors=[],
                is_valid=True
            )
        
        # メルカリURL チェック
        mercari_match = self.patterns['mercari_url'].search(input_str)
        if mercari_match:
            return ParsedASINItem(
                line_number=line_number,
                original_input=input_str,
                item_type=ASINInputType.MERCARI_URL,
                extracted_value=mercari_match.group(1),
                marketplace='mercari',
                errors=[],
                is_valid=True
            )
        
        # ヤフオクURL チェック
        yahoo_match = self.patterns['yahoo_auction_url'].search(input_str)
        if yahoo_match:
            return ParsedASINItem(
                line_number=line_number,
                original_input=input_str,
                item_type=ASINInputType.YAHOO_URL,
                extracted_value=yahoo_match.group(1),
                marketplace='yahoo',
                errors=[],
                is_valid=True
            )
        
        # 楽天URL チェック
        rakuten_match = self.patterns['rakuten_url'].search(input_str)
        if rakuten_match:
            return ParsedASINItem(
                line_number=line_number,
                original_input=input_str,
                item_type=ASINInputType.RAKUTEN_URL,
                extracted_value=rakuten_match.group(1),
                marketplace='rakuten',
                errors=[],
                is_valid=True
            )
        
        # 未対応形式
        errors.append("対応していない形式です")
        return ParsedASINItem(
            line_number=line_number,
            original_input=input_str,
            item_type=ASINInputType.UNKNOWN,
            extracted_value=None,
            marketplace='unknown',
            errors=errors,
            is_valid=False
        )
    
    async def parse_csv_file(self, file_content: bytes, filename: str, options: Dict[str, Any] = None) -> List[ParsedASINItem]:
        """
        CSVファイル解析
        
        説明: アップロードされたCSVファイルからASIN/URL情報を抽出
        パラメータ:
            file_content: ファイル内容（バイト）
            filename: ファイル名
            options: CSVオプション（has_header, column_index等）
        戻り値: 解析済みアイテムリスト
        修正対象: CSV形式拡張時
        """
        try:
            logger.info(f"CSVファイル解析開始: ファイル={filename}")
            
            # ファイルサイズチェック
            if len(file_content) > self.processing_limits['max_file_size']:
                raise ValidationException(
                    f"ファイルサイズが大きすぎます。{self.processing_limits['max_file_size'] // (1024*1024)}MB以内のファイルを選択してください。"
                )
            
            # 文字エンコーディング自動判定
            try:
                content_str = file_content.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    content_str = file_content.decode('shift-jis')
                except UnicodeDecodeError:
                    content_str = file_content.decode('cp932', errors='ignore')
                    logger.warning("文字エンコーディングの自動判定に失敗。一部文字が正しく読み込まれない可能性があります。")
            
            # CSVオプション設定
            options = options or {}
            has_header = options.get('has_header', True)
            column_index = options.get('column_index', 0)
            
            # CSV解析
            csv_reader = csv.reader(io.StringIO(content_str))
            rows = list(csv_reader)
            
            if not rows:
                raise ValidationException("CSVファイルが空です")
            
            # ヘッダー行をスキップ
            start_row = 1 if has_header else 0
            data_rows = rows[start_row:]
            
            if len(data_rows) > self.processing_limits['max_csv_rows']:
                raise ValidationException(
                    f"CSVファイルの行数が多すぎます。{self.processing_limits['max_csv_rows']}行以内のファイルを選択してください。"
                )
            
            parsed_items = []
            
            for row_number, row in enumerate(data_rows, start_row + 1):
                try:
                    # 指定列のデータを取得
                    if len(row) <= column_index:
                        error_item = ParsedASINItem(
                            line_number=row_number,
                            original_input=','.join(row),
                            item_type=ASINInputType.UNKNOWN,
                            extracted_value=None,
                            marketplace='unknown',
                            errors=[f"指定された列（{column_index + 1}列目）が存在しません"],
                            is_valid=False
                        )
                        parsed_items.append(error_item)
                        continue
                    
                    cell_value = row[column_index].strip()
                    if not cell_value:
                        continue  # 空セルはスキップ
                    
                    item = await self._parse_single_input(cell_value, row_number)
                    parsed_items.append(item)
                    
                except Exception as e:
                    error_item = ParsedASINItem(
                        line_number=row_number,
                        original_input=','.join(row) if row else '',
                        item_type=ASINInputType.UNKNOWN,
                        extracted_value=None,
                        marketplace='unknown',
                        errors=[f"行解析エラー: {str(e)}"],
                        is_valid=False
                    )
                    parsed_items.append(error_item)
                    logger.warning(f"CSV行{row_number}解析エラー: {str(e)}")
            
            logger.info(f"CSVファイル解析完了: {len(parsed_items)}件解析")
            return parsed_items
            
        except Exception as e:
            logger.error(f"CSVファイル解析エラー: {str(e)}")
            raise
    
    async def process_parsed_items(self, parsed_items: List[ParsedASINItem]) -> Tuple[List[ProcessedItem], ProcessingSummary]:
        """
        解析済みアイテムの処理
        
        説明: 解析済みASIN/URLアイテムから商品情報を取得
        パラメータ:
            parsed_items: 解析済みアイテムリスト
        戻り値: (処理済みアイテムリスト, 処理サマリー)
        修正対象: 新マーケットプレイス追加時、処理ロジック変更時
        """
        start_time = time.time()
        
        try:
            logger.info(f"商品情報取得開始: {len(parsed_items)}件")
            
            processed_items = []
            success_count = 0
            error_count = 0
            warning_count = 0
            
            # マーケットプレイス別にグループ化
            marketplace_groups = {}
            for item in parsed_items:
                if item.marketplace not in marketplace_groups:
                    marketplace_groups[item.marketplace] = []
                marketplace_groups[item.marketplace].append(item)
            
            # マーケットプレイス別に処理
            for marketplace, items in marketplace_groups.items():
                if marketplace == 'unknown':
                    # 無効なアイテムをエラーとして追加
                    for item in items:
                        processed_item = ProcessedItem(
                            input=item.original_input,
                            item_type=item.item_type,
                            status='error',
                            product_name=None,
                            price=None,
                            marketplace=marketplace,
                            error_message='; '.join(item.errors),
                            extracted_data=None,
                            processing_time=0.0
                        )
                        processed_items.append(processed_item)
                        error_count += 1
                    continue
                
                # 有効なアイテムを処理
                marketplace_results = await self._process_marketplace_items(marketplace, items)
                
                for result in marketplace_results:
                    processed_items.append(result)
                    if result.status == 'success':
                        success_count += 1
                    elif result.status == 'error':
                        error_count += 1
                    elif result.status == 'warning':
                        warning_count += 1
            
            processing_time = time.time() - start_time
            
            # サマリー作成
            summary = ProcessingSummary(
                total=len(parsed_items),
                success=success_count,
                error=error_count,
                warning=warning_count,
                processing_time=round(processing_time, 2)
            )
            
            logger.info(f"商品情報取得完了: 成功={success_count}, エラー={error_count}, 処理時間={processing_time:.2f