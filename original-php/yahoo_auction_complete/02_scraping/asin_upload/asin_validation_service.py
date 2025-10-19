"""
app/services/kanpeki_asin_validation_service.py - 完璧ASIN検証サービス
用途: ASIN/URL/キーワードの検証・正規化・品質チェック専用サービス
修正対象: 検証ルール追加時、対応サイト追加時、品質基準変更時
"""

import re
import logging
import asyncio
import aiohttp
from typing import Dict, List, Optional, Union, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum
from urllib.parse import urlparse, parse_qs, unquote
import tldextract
from datetime import datetime

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.exceptions import ValidationException, EmverzeException

settings = get_settings()
logger = get_logger(__name__)

class InputType(str, Enum):
    """入力タイプ"""
    ASIN = "asin"
    URL = "url"
    KEYWORD = "keyword"
    SKU = "sku"
    JAN_CODE = "jan_code"
    UNKNOWN = "unknown"

class ValidationSeverity(str, Enum):
    """検証重要度"""
    ERROR = "error"      # 処理不可
    WARNING = "warning"  # 処理可能だが要注意
    INFO = "info"       # 情報のみ
    SUCCESS = "success"  # 問題なし

class MarketplaceType(str, Enum):
    """対応マーケットプレイス"""
    AMAZON_JP = "amazon_jp"
    AMAZON_US = "amazon_us"
    AMAZON_UK = "amazon_uk"
    AMAZON_DE = "amazon_de"
    RAKUTEN = "rakuten"
    YAHOO_SHOPPING = "yahoo_shopping"
    MERCARI = "mercari"
    YAHOO_AUCTION = "yahoo_auction"
    EBAY = "ebay"
    SHOPIFY = "shopify"
    UNKNOWN = "unknown"

@dataclass
class ValidationRule:
    """検証ルール"""
    name: str
    description: str
    pattern: Optional[str] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    required_chars: Optional[Set[str]] = None
    forbidden_chars: Optional[Set[str]] = None
    custom_validator: Optional[callable] = None

@dataclass
class ValidationResult:
    """検証結果"""
    is_valid: bool = True
    input_type: InputType = InputType.UNKNOWN
    marketplace: MarketplaceType = MarketplaceType.UNKNOWN
    normalized_value: str = ""
    original_value: str = ""
    severity: ValidationSeverity = ValidationSeverity.SUCCESS
    messages: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    extracted_data: Dict[str, str] = field(default_factory=dict)
    confidence_score: float = 1.0
    processing_time: float = 0.0
    validated_at: datetime = field(default_factory=datetime.utcnow)

class KanpekiAsinValidationService:
    """
    完璧ASIN検証サービス
    
    説明: ASIN、URL、キーワードの包括的検証・正規化を実行
    主要機能: 入力タイプ自動判定、フォーマット検証、品質チェック、正規化
    修正対象: 新しいマーケットプレイス対応時、検証ルール追加時
    """
    
    def __init__(self):
        """検証サービス初期化"""
        self.validation_rules = self._setup_validation_rules()
        self.marketplace_patterns = self._setup_marketplace_patterns()
        self.url_cleanup_rules = self._setup_url_cleanup_rules()
        
        # 統計情報
        self.validation_stats = {
            "total_validations": 0,
            "successful_validations": 0,
            "failed_validations": 0,
            "by_input_type": {},
            "by_marketplace": {},
            "common_errors": {}
        }
        
        logger.info("ASIN検証サービス初期化完了")

    def _setup_validation_rules(self) -> Dict[InputType, List[ValidationRule]]:
        """検証ルール設定"""
        return {
            InputType.ASIN: [
                ValidationRule(
                    name="asin_format",
                    description="ASIN標準形式（B + 9文字の英数字）",
                    pattern=r"^[B][0-9A-Z]{9}$",
                    min_length=10,
                    max_length=10
                ),
                ValidationRule(
                    name="asin_prefix",
                    description="ASINプレフィックス（Bで開始）",
                    custom_validator=lambda x: x.startswith('B')
                ),
                ValidationRule(
                    name="asin_chars",
                    description="ASIN許可文字（英数字のみ）",
                    forbidden_chars={'-', '_', '.', '/', '\\', ' '}
                )
            ],
            
            InputType.URL: [
                ValidationRule(
                    name="url_format",
                    description="有効なURL形式",
                    pattern=r"^https?://[^\s/$.?#].[^\s]*$"
                ),
                ValidationRule(
                    name="url_length",
                    description="URL長制限",
                    min_length=10,
                    max_length=2000
                ),
                ValidationRule(
                    name="url_scheme",
                    description="HTTPスキーム必須",
                    custom_validator=lambda x: x.startswith(('http://', 'https://'))
                )
            ],
            
            InputType.KEYWORD: [
                ValidationRule(
                    name="keyword_length",
                    description="キーワード長制限",
                    min_length=1,
                    max_length=200
                ),
                ValidationRule(
                    name="keyword_chars",
                    description="キーワード文字制限",
                    forbidden_chars={'<', '>', '"', "'", '&', '\n', '\r', '\t'}
                )
            ],
            
            InputType.JAN_CODE: [
                ValidationRule(
                    name="jan_format",
                    description="JAN/EAN/UPCコード形式",
                    pattern=r"^[0-9]{8,14}$"
                ),
                ValidationRule(
                    name="jan_checksum",
                    description="JANチェックサム検証",
                    custom_validator=self._validate_jan_checksum
                )
            ]
        }

    def _setup_marketplace_patterns(self) -> Dict[MarketplaceType, Dict[str, str]]:
        """マーケットプレイス判定パターン"""
        return {
            MarketplaceType.AMAZON_JP: {
                "domain_pattern": r"amazon\.co\.jp",
                "url_patterns": [
                    r"/dp/([B][0-9A-Z]{9})",
                    r"/gp/product/([B][0-9A-Z]{9})",
                    r"amazon\.co\.jp/.*?/dp/([B][0-9A-Z]{9})"
                ]
            },
            MarketplaceType.AMAZON_US: {
                "domain_pattern": r"amazon\.com",
                "url_patterns": [
                    r"/dp/([B][0-9A-Z]{9})",
                    r"/gp/product/([B][0-9A-Z]{9})"
                ]
            },
            MarketplaceType.AMAZON_UK: {
                "domain_pattern": r"amazon\.co\.uk",
                "url_patterns": [
                    r"/dp/([B][0-9A-Z]{9})",
                    r"/gp/product/([B][0-9A-Z]{9})"
                ]
            },
            MarketplaceType.RAKUTEN: {
                "domain_pattern": r"rakuten\.co\.jp|item\.rakuten\.co\.jp",
                "url_patterns": [
                    r"item\.rakuten\.co\.jp/([^/]+/[^/]+)",
                    r"rakuten\.co\.jp/([^/]+/[^/]+)"
                ]
            },
            MarketplaceType.YAHOO_SHOPPING: {
                "domain_pattern": r"shopping\.yahoo\.co\.jp|store\.shopping\.yahoo\.co\.jp",
                "url_patterns": [
                    r"shopping\.yahoo\.co\.jp/search\?p=(.+)",
                    r"store\.shopping\.yahoo\.co\.jp/([^/]+/[^/]+)"
                ]
            },
            MarketplaceType.MERCARI: {
                "domain_pattern": r"mercari\.com|jp\.mercari\.com",
                "url_patterns": [
                    r"mercari\.com/jp/items/([a-zA-Z0-9]+)",
                    r"jp\.mercari\.com/item/([a-zA-Z0-9]+)"
                ]
            },
            MarketplaceType.EBAY: {
                "domain_pattern": r"ebay\.com|ebay\.co\.jp",
                "url_patterns": [
                    r"ebay\.com/itm/([0-9]+)",
                    r"ebay\.co\.jp/itm/([0-9]+)"
                ]
            }
        }

    def _setup_url_cleanup_rules(self) -> Dict[str, List[str]]:
        """URL正規化ルール"""
        return {
            "remove_params": [
                "ref", "ref_", "tag", "linkCode", "linkId", "creative", "creativeASIN",
                "camp", "campaign", "adid", "afftrack", "utm_source", "utm_medium",
                "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid",
                "_encoding", "qid", "sr", "keywords", "ie", "psc", "smid",
                "th", "psc", "pd_rd_i", "pd_rd_r", "pd_rd_w", "pd_rd_wg",
                "pf_rd_i", "pf_rd_m", "pf_rd_p", "pf_rd_r", "pf_rd_s", "pf_rd_t"
            ],
            "normalize_domains": {
                "www.amazon.co.jp": "amazon.co.jp",
                "www.amazon.com": "amazon.com",
                "smile.amazon.com": "amazon.com",
                "www.rakuten.co.jp": "rakuten.co.jp"
            }
        }

    async def validate_input(
        self,
        input_value: str,
        expected_type: Optional[InputType] = None,
        strict_mode: bool = False
    ) -> ValidationResult:
        """
        入力値総合検証
        
        Args:
            input_value: 検証する入力値
            expected_type: 期待する入力タイプ
            strict_mode: 厳格モード（警告もエラー扱い）
            
        Returns:
            ValidationResult: 検証結果
        """
        start_time = datetime.utcnow()
        result = ValidationResult(original_value=input_value)
        
        try:
            # 入力値前処理
            cleaned_input = self._preprocess_input(input_value)
            
            # 入力タイプ自動判定
            detected_type = self._detect_input_type(cleaned_input)
            result.input_type = expected_type or detected_type
            
            # 基本検証
            await self._validate_basic_format(result, cleaned_input)
            
            # タイプ別詳細検証
            if result.input_type == InputType.ASIN:
                await self._validate_asin(result, cleaned_input)
            elif result.input_type == InputType.URL:
                await self._validate_url(result, cleaned_input)
            elif result.input_type == InputType.KEYWORD:
                await self._validate_keyword(result, cleaned_input)
            elif result.input_type == InputType.JAN_CODE:
                await self._validate_jan_code(result, cleaned_input)
            
            # 品質スコア計算
            result.confidence_score = self._calculate_confidence_score(result)
            
            # 厳格モード処理
            if strict_mode and result.warnings:
                result.is_valid = False
                result.severity = ValidationSeverity.ERROR
                result.messages.extend([f"厳格モード: {w}" for w in result.warnings])
            
            # 統計更新
            self._update_validation_stats(result)
            
        except Exception as e:
            result.is_valid = False
            result.severity = ValidationSeverity.ERROR
            result.messages.append(f"検証エラー: {str(e)}")
            logger.error(f"入力検証エラー: {input_value} - {str(e)}")
        
        finally:
            result.processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        return result

    def _preprocess_input(self, input_value: str) -> str:
        """入力値前処理"""
        if not input_value:
            return ""
        
        # 空白文字除去
        cleaned = input_value.strip()
        
        # 制御文字除去
        cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', cleaned)
        
        # 複数の空白を単一に
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        return cleaned

    def _detect_input_type(self, input_value: str) -> InputType:
        """入力タイプ自動判定"""
        if not input_value:
            return InputType.UNKNOWN
        
        # ASIN判定（最も厳密）
        if re.match(r'^[B][0-9A-Z]{9}$', input_value):
            return InputType.ASIN
        
        # URL判定
        if input_value.startswith(('http://', 'https://')):
            return InputType.URL
        
        # JAN/EAN/UPCコード判定
        if re.match(r'^[0-9]{8,14}$', input_value):
            return InputType.JAN_CODE
        
        # SKU判定（英数字とハイフンアンダースコア）
        if re.match(r'^[A-Z0-9\-_]{3,50}$', input_value.upper()):
            return InputType.SKU
        
        # その他はキーワード扱い
        return InputType.KEYWORD

    async def _validate_basic_format(self, result: ValidationResult, input_value: str) -> None:
        """基本フォーマット検証"""
        # 空値チェック
        if not input_value:
            result.is_valid = False
            result.severity = ValidationSeverity.ERROR
            result.messages.append("入力値が空です")
            return
        
        # 長さチェック
        if len(input_value) > 2000:
            result.is_valid = False
            result.severity = ValidationSeverity.ERROR
            result.messages.append("入力値が長すぎます（2000文字以内）")
        
        # 危険文字チェック
        dangerous_chars = {'<', '>', '"', "'", '&', '\n', '\r', '\t', '\0'}
        found_dangerous = set(input_value) & dangerous_chars
        if found_dangerous:
            result.warnings.append(f"危険な文字が含まれています: {', '.join(found_dangerous)}")

    async def _validate_asin(self, result: ValidationResult, asin: str) -> None:
        """ASIN詳細検証"""
        # 基本フォーマット
        if not re.match(r'^[B][0-9A-Z]{9}$', asin):
            result.is_valid = False
            result.severity = ValidationSeverity.ERROR
            result.messages.append("ASIN形式が正しくありません（B + 9文字の英数字）")
            return
        
        # 正規化
        result.normalized_value = asin.upper()
        
        # 品質チェック
        if asin[1:].isdigit():
            result.warnings.append("数字のみのASINは稀です")
        
        # よくある間違いチェック
        if asin.count('0') > 5:
            result.warnings.append("0が多すぎるASINは疑わしいです")
        
        # 抽出データ設定
        result.extracted_data = {
            "asin": result.normalized_value,
            "prefix": asin[0],
            "suffix": asin[1:]
        }

    async def _validate_url(self, result: ValidationResult, url: str) -> None:
        """URL詳細検証"""
        try:
            parsed = urlparse(url)
            
            # 基本URL構造チェック
            if not parsed.scheme or not parsed.netloc:
                result.is_valid = False
                result.severity = ValidationSeverity.ERROR
                result.messages.append("無効なURL形式です")
                return
            
            # HTTPスキームチェック
            if parsed.scheme not in ('http', 'https'):
                result.warnings.append("HTTPまたはHTTPS以外のスキームです")
            
            # マーケットプレイス判定
            marketplace = self._detect_marketplace(url)
            result.marketplace = marketplace
            
            # URL正規化
            normalized_url = self._normalize_url(url)
            result.normalized_value = normalized_url
            
            # ASIN抽出（Amazon URL）
            if marketplace in [MarketplaceType.AMAZON_JP, MarketplaceType.AMAZON_US, MarketplaceType.AMAZON_UK]:
                extracted_asin = self._extract_asin_from_url(url)
                if extracted_asin:
                    result.extracted_data["asin"] = extracted_asin
                else:
                    result.warnings.append("Amazon URLからASINを抽出できませんでした")
            
            # URL品質チェック
            if len(url) > 1000:
                result.warnings.append("URLが非常に長いです")
            
            if '?' in url and len(url.split('?')[1]) > 500:
                result.warnings.append("URLパラメータが非常に多いです")
            
        except Exception as e:
            result.is_valid = False
            result.severity = ValidationSeverity.ERROR
            result.messages.append(f"URL解析エラー: {str(e)}")

    async def _validate_keyword(self, result: ValidationResult, keyword: str) -> None:
        """キーワード検証"""
        # 長さチェック
        if len(keyword) < 1:
            result.is_valid = False
            result.severity = ValidationSeverity.ERROR
            result.messages.append("キーワードが短すぎます")
            return
        
        if len(keyword) > 200:
            result.warnings.append("キーワードが長いです（200文字以内推奨）")
        
        # 正規化
        result.normalized_value = keyword.strip()
        
        # 品質チェック
        if keyword.isdigit():
            result.warnings.append("数字のみのキーワードです")
        
        if len(keyword.split()) > 20:
            result.warnings.append("キーワードの単語数が多すぎます")
        
        # 言語検出（日本語の場合）
        if re.search(r'[ひらがなカタカナ漢字]', keyword):
            result.extracted_data["language"] = "japanese"
        elif re.search(r'[a-zA-Z]', keyword):
            result.extracted_data["language"] = "english"

    async def _validate_jan_code(self, result: ValidationResult, jan_code: str) -> None:
        """JANコード検証"""
        # 数字のみチェック
        if not jan_code.isdigit():
            result.is_valid = False
            result.severity = ValidationSeverity.ERROR
            result.messages.append("JANコードは数字のみである必要があります")
            return
        
        # 長さチェック
        if len(jan_code) not in [8, 12, 13, 14]:
            result.is_valid = False
            result.severity = ValidationSeverity.ERROR
            result.messages.append("JANコードの桁数が正しくありません（8, 12, 13, 14桁）")
            return
        
        # チェックサム検証
        if not self._validate_jan_checksum(jan_code):
            result.warnings.append("JANコードのチェックサムが正しくない可能性があります")
        
        result.normalized_value = jan_code

    def _validate_jan_checksum(self, jan_code: str) -> bool:
        """JANコードチェックサム検証"""
        try:
            if len(jan_code) in [8, 12, 13, 14]:
                digits = [int(d) for d in jan_code[:-1]]
                check_digit = int(jan_code[-1])
                
                if len(jan_code) == 13:  # EAN-13
                    sum_odd = sum(digits[i] for i in range(0, len(digits), 2))
                    sum_even = sum(digits[i] for i in range(1, len(digits), 2))
                    calculated_check = (10 - ((sum_odd + sum_even * 3) % 10)) % 10
                else:  # その他
                    weighted_sum = sum(digits[i] * (3 if i % 2 else 1) for i in range(len(digits)))
                    calculated_check = (10 - (weighted_sum % 10)) % 10
                
                return check_digit == calculated_check
        except:
            pass
        return False

    def _detect_marketplace(self, url: str) -> MarketplaceType:
        """マーケットプレイス判定"""
        for marketplace, patterns in self.marketplace_patterns.items():
            if re.search(patterns["domain_pattern"], url, re.IGNORECASE):
                return marketplace
        return MarketplaceType.UNKNOWN

    def _normalize_url(self, url: str) -> str:
        """URL正規化"""
        try:
            parsed = urlparse(url)
            
            # ドメイン正規化
            domain = parsed.netloc.lower()
            for old_domain, new_domain in self.url_cleanup_rules["normalize_domains"].items():
                if domain == old_domain:
                    domain = new_domain
                    break
            
            # パラメータクリーンアップ
            query_params = parse_qs(parsed.query)
            cleaned_params = {}
            
            for param, values in query_params.items():
                if param not in self.url_cleanup_rules["remove_params"]:
                    cleaned_params[param] = values
            
            # URL再構築
            from urllib.parse import urlencode, urlunparse
            
            new_query = urlencode(cleaned_params, doseq=True) if cleaned_params else ""
            
            normalized = urlunparse((
                parsed.scheme,
                domain,
                parsed.path,
                parsed.params,
                new_query,
                ""  # fragment除去
            ))
            
            return normalized
            
        except Exception:
            return url

    def _extract_asin_from_url(self, url: str) -> Optional[str]:
        """Amazon URLからASIN抽出"""
        asin_patterns = [
            r'/dp/([B][0-9A-Z]{9})',
            r'/gp/product/([B][0-9A-Z]{9})',
            r'/product/([B][0-9A-Z]{9})',
            r'asin=([B][0-9A-Z]{9})',
            r'/([B][0-9A-Z]{9})(?:/|$)'
        ]
        
        for pattern in asin_patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None

    def _calculate_confidence_score(self, result: ValidationResult) -> float:
        """信頼度スコア計算"""
        score = 1.0
        
        # エラーで大幅減点
        if not result.is_valid:
            score -= 0.5
        
        # 警告で減点
        score -= len(result.warnings) * 0.1
        
        # タイプ別調整
        if result.input_type == InputType.ASIN and result.extracted_data.get("asin"):
            score += 0.1
        elif result.input_type == InputType.URL and result.marketplace != MarketplaceType.UNKNOWN:
            score += 0.1
        
        return max(0.0, min(1.0, score))

    def _update_validation_stats(self, result: ValidationResult) -> None:
        """統計情報更新"""
        self.validation_stats["total_validations"] += 1
        
        if result.is_valid:
            self.validation_stats["successful_validations"] += 1
        else:
            self.validation_stats["failed_validations"] += 1
        
        # タイプ別統計
        type_key = result.input_type.value
        if type_key not in self.validation_stats["by_input_type"]:
            self.validation_stats["by_input_type"][type_key] = 0
        self.validation_stats["by_input_type"][type_key] += 1
        
        # マーケットプレイス別統計
        marketplace_key = result.marketplace.value
        if marketplace_key not in self.validation_stats["by_marketplace"]:
            self.validation_stats["by_marketplace"][marketplace_key] = 0
        self.validation_stats["by_marketplace"][marketplace_key] += 1

    async def validate_batch(
        self,
        input_values: List[str],
        expected_types: Optional[List[InputType]] = None,
        strict_mode: bool = False
    ) -> List[ValidationResult]:
        """
        バッチ検証
        
        Args:
            input_values: 検証する入力値リスト
            expected_types: 期待する入力タイプリスト
            strict_mode: 厳格モード
            
        Returns:
            List[ValidationResult]: 検証結果リスト
        """
        results = []
        
        for i, input_value in enumerate(input_values):
            expected_type = expected_types[i] if expected_types and i < len(expected_types) else None
            result = await self.validate_input(input_value, expected_type, strict_mode)
            results.append(result)
        
        return results

    def get_validation_statistics(self) -> Dict[str, Any]:
        """検証統計情報取得"""
        total = self.validation_stats["total_validations"]
        success_rate = (self.validation_stats["successful_validations"] / max(total, 1)) * 100
        
        return {
            **self.validation_stats,
            "success_rate": success_rate,
            "last_updated": datetime.utcnow().isoformat()
        }

# === 使用例 ===

"""
# ASIN検証サービスの使用例

from app.services.kanpeki_asin_validation_service import KanpekiAsinValidationService

# 検証サービス初期化
validator = KanpekiAsinValidationService()

# 単一検証
result = await validator.validate_input("B08N5WRWNW")
print(f"有効: {result.is_valid}, タイプ: {result.input_type}, 信頼度: {result.confidence_score}")

# URL検証
url_result = await validator.validate_input("https://amazon.co.jp/dp/B08N5WRWNW?tag=example")
print(f"マーケットプレイス: {url_result.marketplace}")
print(f"正規化URL: {url_result.normalized_value}")
print(f"抽出ASIN: {url_result.extracted_data.get('asin')}")

# バッチ検証
batch_inputs = [
    "B08N5WRWNW",
    "https://amazon.co.jp/dp/B09B8RRQT5",
    "Echo Dot スマートスピーカー",
    "4901234567890"  # JANコード
]

batch_results = await validator.validate_batch(batch_inputs)
for i, result in enumerate(batch_results):
    print(f"{i+1}: {result.input_type} - {'OK' if result.is_valid else 'NG'}")

# 統計情報
stats = validator.get_validation_statistics()
print(f"成功率: {stats['success_rate']:.1f}%")
"""