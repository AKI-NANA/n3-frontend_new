"""
app/schemas/asin_upload_schemas.py - ASINアップロード統合スキーマ
用途: HTMLフォームデータとAPI間の型安全な変換
修正対象: 新フィールド追加時、バリデーションルール変更時
"""

import re
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from pydantic import BaseModel, Field, validator, root_validator
from urllib.parse import urlparse
from enum import Enum

# === 列挙型定義 ===

class InputType(str, Enum):
    """入力種別"""
    ASIN = "ASIN"
    URL = "URL"
    KEYWORD = "KEYWORD"
    SKU = "SKU"

class ProcessingStatus(str, Enum):
    """処理ステータス"""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    ERROR = "error"
    COMPLETED = "completed"

class MarketplaceType(str, Enum):
    """マーケットプレイス種別"""
    AMAZON = "Amazon"
    RAKUTEN = "楽天"
    YAHOO = "Yahoo"
    MERCARI = "メルカリ"
    SHOPIFY = "Shopify"
    EBAY = "eBay"
    OTHER = "その他"

# === ベーススキーマ ===

class BaseASINSchema(BaseModel):
    """ASIN処理基底スキーマ"""
    
    class Config:
        # JSON形式でのシリアライゼーション設定
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
        # バリデーションエラー時のフィールド名表示
        validate_assignment = True
        # 未知のフィールドを無視
        extra = "ignore"

# === 入力スキーマ ===

class ASINInputSchema(BaseASINSchema):
    """
    手動ASIN入力スキーマ
    HTMLのprocessManualInput()関数に対応
    """
    asin: Optional[str] = Field(
        None, 
        description="Amazon ASIN",
        example="B08N5WRWNW",
        max_length=10
    )
    url: Optional[str] = Field(
        None, 
        description="商品URL",
        example="https://amazon.co.jp/dp/B08N5WRWNW",
        max_length=2000
    )
    keyword: Optional[str] = Field(
        None, 
        description="検索キーワード",
        example="Echo Dot スマートスピーカー",
        max_length=200
    )
    sku: Optional[str] = Field(
        None, 
        description="SKU",
        example="ECHO-DOT-001",
        max_length=50
    )
    create_product: bool = Field(
        True, 
        description="商品を自動作成するか"
    )

    @validator('asin')
    def validate_asin_format(cls, v):
        """ASIN形式検証"""
        if v:
            v = v.strip().upper()
            if not re.match(r'^[B][0-9A-Z]{9}$', v):
                raise ValueError('ASIN形式が無効です。B + 9文字の英数字で入力してください（例: B08N5WRWNW）')
        return v

    @validator('url')
    def validate_url_format(cls, v):
        """URL形式検証"""
        if v:
            v = v.strip()
            try:
                parsed = urlparse(v)
                if not parsed.scheme or not parsed.netloc:
                    raise ValueError('URL形式が無効です')
                if parsed.scheme not in ['http', 'https']:
                    raise ValueError('HTTPまたはHTTPSのURLを入力してください')
            except Exception:
                raise ValueError('有効なURLを入力してください')
        return v

    @validator('keyword')
    def validate_keyword(cls, v):
        """キーワード検証"""
        if v:
            v = v.strip()
            if len(v) < 2:
                raise ValueError('キーワードは2文字以上で入力してください')
        return v

    @validator('sku')
    def validate_sku_format(cls, v):
        """SKU形式検証"""
        if v:
            v = v.strip().upper()
            if not re.match(r'^[A-Z0-9\-_]{3,50}$', v):
                raise ValueError('SKUは英数字、ハイフン、アンダースコアのみ使用可能です（3-50文字）')
        return v

    @root_validator
    def validate_input_provided(cls, values):
        """いずれかの入力が必須"""
        asin = values.get('asin')
        url = values.get('url')
        keyword = values.get('keyword')
        
        if not any([asin, url, keyword]):
            raise ValueError('ASIN、URL、キーワードのいずれかは必須です')
        
        return values

class BulkPasteSchema(BaseASINSchema):
    """
    一括貼り付けスキーマ
    HTMLのprocessBulkInput()関数に対応
    """
    bulk_text: str = Field(
        ..., 
        description="改行区切りのASIN/URLリスト",
        example="B08N5WRWNW\nhttps://amazon.co.jp/dp/B09B8RRQT5\nB08KGG8T8S"
    )
    create_products: bool = Field(
        True, 
        description="商品を自動作成するか"
    )

    @validator('bulk_text')
    def validate_bulk_text_content(cls, v):
        """一括テキスト検証"""
        if not v or not v.strip():
            raise ValueError('入力テキストが空です')
        
        lines = [line.strip() for line in v.strip().split('\n') if line.strip()]
        
        if len(lines) == 0:
            raise ValueError('有効な行が見つかりません')
        
        if len(lines) > 1000:
            raise ValueError('一度に処理できるのは1,000行までです')
        
        # 各行の基本検証
        invalid_lines = []
        for i, line in enumerate(lines, 1):
            if len(line) > 2000:  # URL最大長
                invalid_lines.append(f"行{i}: 長すぎます")
            elif len(line) < 3:
                invalid_lines.append(f"行{i}: 短すぎます")
        
        if invalid_lines:
            raise ValueError(f"無効な行があります: {', '.join(invalid_lines[:5])}")
        
        return v

class CSVUploadSchema(BaseASINSchema):
    """
    CSVアップロードメタデータスキーマ
    HTMLのprocessCsvFile()関数に対応
    """
    create_products: bool = Field(
        True, 
        description="商品を自動作成するか"
    )
    file_encoding: str = Field(
        "utf-8", 
        description="ファイルエンコーディング"
    )
    delimiter: str = Field(
        ",", 
        description="区切り文字"
    )
    has_header: bool = Field(
        True, 
        description="ヘッダー行があるか"
    )

# === レスポンススキーマ ===

class ProcessingResultItem(BaseASINSchema):
    """
    処理結果アイテム
    HTMLのdisplayResults()関数で表示
    """
    input_value: str = Field(..., description="入力値")
    input_type: InputType = Field(..., description="入力種別")
    status: ProcessingStatus = Field(..., description="処理ステータス")
    
    # 成功時の情報
    marketplace: Optional[MarketplaceType] = Field(None, description="マーケットプレイス")
    asin: Optional[str] = Field(None, description="抽出されたASIN")
    product_name: Optional[str] = Field(None, description="商品名")
    price: Optional[int] = Field(None, description="価格（円）")
    price_formatted: Optional[str] = Field(None, description="フォーマット済み価格")
    brand: Optional[str] = Field(None, description="ブランド")
    category: Optional[str] = Field(None, description="カテゴリ")
    description: Optional[str] = Field(None, description="商品説明")
    image_url: Optional[str] = Field(None, description="画像URL")
    availability: Optional[str] = Field(None, description="在庫状況")
    rating: Optional[float] = Field(None, description="評価", ge=0, le=5)
    review_count: Optional[int] = Field(None, description="レビュー数", ge=0)
    
    # 作成されたリソース
    product_id: Optional[int] = Field(None, description="作成された商品ID")
    inventory_id: Optional[int] = Field(None, description="作成された在庫ID")
    
    # エラー情報
    error_message: Optional[str] = Field(None, description="エラーメッセージ")
    error_code: Optional[str] = Field(None, description="エラーコード")
    
    # メタデータ
    processed_at: Optional[datetime] = Field(None, description="処理日時")
    processing_time: Optional[float] = Field(None, description="処理時間（秒）")
    
    # 追加情報
    original_keyword: Optional[str] = Field(None, description="元のキーワード")
    original_sku: Optional[str] = Field(None, description="元のSKU")

class ProgressResponse(BaseASINSchema):
    """
    進捗レスポンス
    HTMLのupdateProgress()関数で使用
    """
    session_id: str = Field(..., description="セッションID")
    status: ProcessingStatus = Field(..., description="処理ステータス")
    
    # 進捗情報
    percentage: Optional[float] = Field(None, description="進捗率（0-100）", ge=0, le=100)
    message: Optional[str] = Field(None, description="進捗メッセージ")
    
    # アイテム情報
    total_items: Optional[int] = Field(None, description="総アイテム数", ge=0)
    processed_items: Optional[int] = Field(None, description="処理済みアイテム数", ge=0)
    success_count: Optional[int] = Field(None, description="成功件数", ge=0)
    error_count: Optional[int] = Field(None, description="エラー件数", ge=0)
    
    # 時間情報
    estimated_time_remaining: Optional[int] = Field(None, description="推定残り時間（秒）", ge=0)
    started_at: Optional[datetime] = Field(None, description="開始日時")
    updated_at: Optional[datetime] = Field(None, description="更新日時")
    
    # エラー情報
    error_message: Optional[str] = Field(None, description="エラーメッセージ")
    error_details: Optional[Dict[str, Any]] = Field(None, description="エラー詳細")

class UploadSessionResponse(BaseASINSchema):
    """
    アップロードセッション開始レスポンス
    """
    status: str = Field(..., description="レスポンスステータス")
    session_id: str = Field(..., description="セッションID")
    message: str = Field(..., description="メッセージ")
    total_items: int = Field(..., description="総アイテム数", ge=0)
    estimated_duration: Optional[int] = Field(None, description="推定処理時間（秒）")

class UploadResultsResponse(BaseASINSchema):
    """
    アップロード結果レスポンス
    HTMLのdisplayResults()関数で使用
    """
    status: str = Field(..., description="レスポンスステータス")
    session_id: str = Field(..., description="セッションID")
    
    # 結果データ
    results: List[ProcessingResultItem] = Field(..., description="処理結果リスト")
    
    # 統計情報
    total_items: int = Field(..., description="総アイテム数", ge=0)
    success_count: int = Field(..., description="成功件数", ge=0)
    error_count: int = Field(..., description="エラー件数", ge=0)
    
    # メタデータ
    processing_started_at: Optional[datetime] = Field(None, description="処理開始日時")
    processing_completed_at: Optional[datetime] = Field(None, description="処理完了日時")
    total_processing_time: Optional[float] = Field(None, description="総処理時間（秒）")

# === 内部処理用スキーマ ===

class ParsedBulkItem(BaseASINSchema):
    """解析済み一括アイテム"""
    line_number: int = Field(..., description="行番号")
    original_text: str = Field(..., description="元のテキスト")
    input_type: InputType = Field(..., description="判定された入力種別")
    parsed_value: str = Field(..., description="解析された値")
    is_valid: bool = Field(..., description="有効性")
    validation_errors: List[str] = Field(default_factory=list, description="バリデーションエラー")

class CSVRowData(BaseASINSchema):
    """CSV行データ"""
    row_number: int = Field(..., description="行番号")
    asin: Optional[str] = Field(None, description="ASIN")
    url: Optional[str] = Field(None, description="URL")
    keyword: Optional[str] = Field(None, description="キーワード")
    sku: Optional[str] = Field(None, description="SKU")
    additional_fields: Dict[str, Any] = Field(default_factory=dict, description="追加フィールド")

class SessionData(BaseASINSchema):
    """セッションデータ"""
    session_id: str = Field(..., description="セッションID")
    user_id: str = Field(..., description="ユーザーID")
    data: List[Dict[str, Any]] = Field(..., description="処理データ")
    create_products: bool = Field(..., description="商品作成フラグ")
    status: ProcessingStatus = Field(..., description="ステータス")
    total_items: int = Field(..., description="総アイテム数")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="作成日時")

# === エクスポート用スキーマ ===

class ExportRequest(BaseASINSchema):
    """エクスポートリクエスト"""
    session_id: str = Field(..., description="セッションID")
    format: str = Field("csv", description="エクスポート形式")
    include_errors: bool = Field(True, description="エラー行を含めるか")
    include_metadata: bool = Field(False, description="メタデータを含めるか")

class ExportColumn(BaseASINSchema):
    """エクスポート列定義"""
    name: str = Field(..., description="列名")
    display_name: str = Field(..., description="表示名")
    data_type: str = Field(..., description="データ型")
    required: bool = Field(False, description="必須フラグ")

# === バリデーション用ヘルパー ===

class ValidationHelper:
    """バリデーションヘルパークラス"""
    
    @staticmethod
    def extract_asin_from_url(url: str) -> Optional[str]:
        """URLからASINを抽出"""
        if not url:
            return None
        
        # Amazon URL パターン
        amazon_patterns = [
            r'/dp/([B][0-9A-Z]{9})',
            r'/gp/product/([B][0-9A-Z]{9})',
            r'asin=([B][0-9A-Z]{9})',
        ]
        
        for pattern in amazon_patterns:
            match = re.search(pattern, url, re.IGNORECASE)
            if match:
                return match.group(1).upper()
        
        return None
    
    @staticmethod
    def detect_input_type(input_text: str) -> InputType:
        """入力テキストの種別を判定"""
        if not input_text:
            return InputType.KEYWORD
        
        input_text = input_text.strip()
        
        # URL判定
        if input_text.startswith(('http://', 'https://')):
            return InputType.URL
        
        # ASIN判定
        if re.match(r'^[B][0-9A-Z]{9}$', input_text):
            return InputType.ASIN
        
        # SKU判定（英数字+記号のパターン）
        if re.match(r'^[A-Z0-9\-_]{3,50}$', input_text, re.IGNORECASE):
            return InputType.SKU
        
        # その他はキーワード
        return InputType.KEYWORD
    
    @staticmethod
    def detect_marketplace(url: str) -> MarketplaceType:
        """URLからマーケットプレイスを判定"""
        if not url:
            return MarketplaceType.OTHER
        
        url_lower = url.lower()
        
        if 'amazon' in url_lower:
            return MarketplaceType.AMAZON
        elif 'rakuten' in url_lower:
            return MarketplaceType.RAKUTEN
        elif 'yahoo' in url_lower:
            return MarketplaceType.YAHOO
        elif 'mercari' in url_lower:
            return MarketplaceType.MERCARI
        elif 'shopify' in url_lower:
            return MarketplaceType.SHOPIFY
        elif 'ebay' in url_lower:
            return MarketplaceType.EBAY
        else:
            return MarketplaceType.OTHER

# === 使用例 ===

"""
# APIエンドポイントでの使用例:

@router.post("/add-single")
async def add_single_item(asin_data: ASINInputSchema):
    # 自動バリデーション実行
    input_type = ValidationHelper.detect_input_type(asin_data.asin or asin_data.url)
    
    # 処理実行...
    
    result = ProcessingResultItem(
        input_value=asin_data.asin or asin_data.url,
        input_type=input_type,
        status=ProcessingStatus.SUCCESS,
        product_name="Echo Dot",
        price_formatted="¥5,980"
    )
    
    return UploadResultsResponse(
        status="success",
        session_id="test-123",
        results=[result],
        total_items=1,
        success_count=1,
        error_count=0
    )

# バリデーションエラーの例:
try:
    data = ASINInputSchema(asin="INVALID")
except ValidationError as e:
    print(e.errors())
    # [{'loc': ('asin',), 'msg': 'ASIN形式が無効です...', 'type': 'value_error'}]
"""