#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
core/exceptions.py - 統一例外クラス（完全版）

✅ 統一例外システム:
- 階層化された例外クラス
- 自動エラーコード生成
- 詳細情報管理
- ログ統合
- HTTPステータス自動マッピング

✅ 商用SaaS対応:
- ユーザーフレンドリーメッセージ
- 開発者向け詳細情報
- セキュリティ考慮
- 国際化対応準備
"""

import traceback
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from enum import Enum
from dataclasses import dataclass, field

class ErrorCategory(Enum):
    """エラーカテゴリ"""
    SYSTEM = "SYSTEM"              # システムエラー
    BUSINESS = "BUSINESS"          # ビジネスロジックエラー
    VALIDATION = "VALIDATION"      # バリデーションエラー
    AUTHENTICATION = "AUTH"        # 認証エラー
    AUTHORIZATION = "AUTHZ"        # 認可エラー
    EXTERNAL_API = "EXTERNAL_API"  # 外部API エラー
    DATABASE = "DATABASE"          # データベースエラー
    NETWORK = "NETWORK"            # ネットワークエラー
    CONFIGURATION = "CONFIG"       # 設定エラー
    RESOURCE = "RESOURCE"          # リソースエラー

class ErrorSeverity(Enum):
    """エラー重要度"""
    LOW = 1         # 軽微（ログのみ）
    MEDIUM = 2      # 中程度（ログ + 監視）
    HIGH = 3        # 高（ログ + 監視 + 通知）
    CRITICAL = 4    # 致命的（ログ + 監視 + 緊急通知）

@dataclass
class ErrorContext:
    """エラーコンテキスト情報"""
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    operation: Optional[str] = None
    resource_id: Optional[str] = None
    additional_data: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

class EmverzeBaseException(Exception):
    """Emverze基底例外クラス"""
    
    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        category: ErrorCategory = ErrorCategory.SYSTEM,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        details: Optional[Dict[str, Any]] = None,
        context: Optional[ErrorContext] = None,
        status_code: int = 500,
        user_message: Optional[str] = None,
        recoverable: bool = False,
        retry_after: Optional[int] = None
    ):
        """
        Args:
            message: 内部エラーメッセージ（開発者向け）
            error_code: エラーコード（自動生成可能）
            category: エラーカテゴリ
            severity: エラー重要度
            details: 詳細情報
            context: エラーコンテキスト
            status_code: HTTPステータスコード
            user_message: ユーザー向けメッセージ
            recoverable: 復旧可能フラグ
            retry_after: リトライ推奨秒数
        """
        super().__init__(message)
        
        self.message = message
        self.error_code = error_code or self._generate_error_code(category)
        self.category = category
        self.severity = severity
        self.details = details or {}
        self.context = context or ErrorContext()
        self.status_code = status_code
        self.user_message = user_message or self._generate_user_message()
        self.recoverable = recoverable
        self.retry_after = retry_after
        self.traceback_str = traceback.format_exc()
        
        # エラーメトリクス用
        self.occurred_at = datetime.utcnow()
        self.error_id = self._generate_error_id()
    
    def _generate_error_code(self, category: ErrorCategory) -> str:
        """エラーコード自動生成"""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        return f"{category.value}_{timestamp}_{id(self) % 10000:04d}"
    
    def _generate_user_message(self) -> str:
        """ユーザー向けメッセージ生成"""
        user_messages = {
            ErrorCategory.SYSTEM: "システムエラーが発生しました。しばらく時間をおいて再度お試しください。",
            ErrorCategory.BUSINESS: "処理を完了できませんでした。入力内容をご確認ください。",
            ErrorCategory.VALIDATION: "入力内容に誤りがあります。正しい形式で入力してください。",
            ErrorCategory.AUTHENTICATION: "認証に失敗しました。ログイン情報をご確認ください。",
            ErrorCategory.AUTHORIZATION: "この操作を実行する権限がありません。",
            ErrorCategory.EXTERNAL_API: "外部サービスとの連携でエラーが発生しました。",
            ErrorCategory.DATABASE: "データの処理中にエラーが発生しました。",
            ErrorCategory.NETWORK: "ネットワークエラーが発生しました。接続をご確認ください。",
            ErrorCategory.CONFIGURATION: "システム設定にエラーがあります。管理者にお問い合わせください。",
            ErrorCategory.RESOURCE: "リソースが不足しています。しばらく時間をおいて再度お試しください。"
        }
        return user_messages.get(self.category, "エラーが発生しました。")
    
    def _generate_error_id(self) -> str:
        """一意エラーID生成"""
        timestamp = self.occurred_at.strftime("%Y%m%d_%H%M%S_%f")
        return f"ERR_{self.category.value}_{timestamp}"
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換"""
        return {
            "error_id": self.error_id,
            "error_code": self.error_code,
            "message": self.message,
            "user_message": self.user_message,
            "category": self.category.value,
            "severity": self.severity.value,
            "status_code": self.status_code,
            "details": self.details,
            "context": {
                "user_id": self.context.user_id,
                "session_id": self.context.session_id,
                "request_id": self.context.request_id,
                "operation": self.context.operation,
                "resource_id": self.context.resource_id,
                "additional_data": self.context.additional_data,
                "timestamp": self.context.timestamp
            },
            "recoverable": self.recoverable,
            "retry_after": self.retry_after,
            "occurred_at": self.occurred_at.isoformat()
        }
    
    def to_log_dict(self) -> Dict[str, Any]:
        """ログ出力用辞書"""
        log_dict = self.to_dict()
        log_dict["traceback"] = self.traceback_str
        return log_dict

# ===========================================
# 🔧 システムエラー
# ===========================================

class EmverzeException(EmverzeBaseException):
    """汎用Emverzeエラー"""
    
    def __init__(self, message: str, **kwargs):
        super().__init__(
            message=message,
            category=ErrorCategory.SYSTEM,
            severity=ErrorSeverity.HIGH,
            **kwargs
        )

class ConfigurationException(EmverzeBaseException):
    """設定エラー"""
    
    def __init__(self, message: str, config_key: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if config_key:
            details['config_key'] = config_key
        
        super().__init__(
            message=message,
            category=ErrorCategory.CONFIGURATION,
            severity=ErrorSeverity.HIGH,
            status_code=500,
            details=details,
            **kwargs
        )

class ResourceException(EmverzeBaseException):
    """リソースエラー"""
    
    def __init__(self, message: str, resource_type: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if resource_type:
            details['resource_type'] = resource_type
        
        super().__init__(
            message=message,
            category=ErrorCategory.RESOURCE,
            severity=ErrorSeverity.MEDIUM,
            status_code=507,  # Insufficient Storage
            details=details,
            recoverable=True,
            retry_after=60,
            **kwargs
        )

# ===========================================
# 📝 ビジネスロジックエラー
# ===========================================

class BusinessLogicException(EmverzeBaseException):
    """ビジネスロジックエラー"""
    
    def __init__(self, message: str, business_rule: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if business_rule:
            details['business_rule'] = business_rule
        
        super().__init__(
            message=message,
            category=ErrorCategory.BUSINESS,
            severity=ErrorSeverity.MEDIUM,
            status_code=422,  # Unprocessable Entity
            details=details,
            **kwargs
        )

class DuplicateResourceException(BusinessLogicException):
    """重複リソースエラー"""
    
    def __init__(self, message: str, resource_name: str, conflicting_value: Any, **kwargs):
        details = kwargs.get('details', {})
        details.update({
            'resource_name': resource_name,
            'conflicting_value': str(conflicting_value),
            'conflict_type': 'duplicate'
        })
        
        super().__init__(
            message=message,
            status_code=409,  # Conflict
            details=details,
            user_message=f"{resource_name}は既に存在します",
            **kwargs
        )

class ResourceNotFoundException(BusinessLogicException):
    """リソース未発見エラー"""
    
    def __init__(self, message: str, resource_name: str, resource_id: Any, **kwargs):
        details = kwargs.get('details', {})
        details.update({
            'resource_name': resource_name,
            'resource_id': str(resource_id)
        })
        
        super().__init__(
            message=message,
            status_code=404,  # Not Found
            details=details,
            user_message=f"指定された{resource_name}が見つかりません",
            **kwargs
        )

class BusinessRuleViolationException(BusinessLogicException):
    """ビジネスルール違反エラー"""
    
    def __init__(self, message: str, rule_name: str, violated_constraint: str, **kwargs):
        details = kwargs.get('details', {})
        details.update({
            'rule_name': rule_name,
            'violated_constraint': violated_constraint
        })
        
        super().__init__(
            message=message,
            business_rule=rule_name,
            details=details,
            user_message=f"ビジネスルール「{rule_name}」に違反しています",
            **kwargs
        )

# ===========================================
# ✅ バリデーションエラー
# ===========================================

class ValidationException(EmverzeBaseException):
    """バリデーションエラー"""
    
    def __init__(
        self,
        message: str,
        field_errors: Optional[Dict[str, List[str]]] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if field_errors:
            details['field_errors'] = field_errors
        
        super().__init__(
            message=message,
            category=ErrorCategory.VALIDATION,
            severity=ErrorSeverity.LOW,
            status_code=400,  # Bad Request
            details=details,
            user_message="入力内容に誤りがあります",
            **kwargs
        )

class RequiredFieldException(ValidationException):
    """必須フィールドエラー"""
    
    def __init__(self, field_name: str, **kwargs):
        field_errors = {field_name: ["この項目は必須です"]}
        
        super().__init__(
            message=f"必須フィールドが未入力です: {field_name}",
            field_errors=field_errors,
            user_message=f"{field_name}は必須項目です",
            **kwargs
        )

class InvalidFormatException(ValidationException):
    """フォーマットエラー"""
    
    def __init__(self, field_name: str, expected_format: str, actual_value: Any, **kwargs):
        field_errors = {field_name: [f"正しい形式で入力してください（期待形式: {expected_format}）"]}
        
        details = kwargs.get('details', {})
        details.update({
            'field_name': field_name,
            'expected_format': expected_format,
            'actual_value': str(actual_value)
        })
        
        super().__init__(
            message=f"フォーマットエラー: {field_name} (期待: {expected_format}, 実際: {actual_value})",
            field_errors=field_errors,
            details=details,
            **kwargs
        )

class ValueRangeException(ValidationException):
    """値範囲エラー"""
    
    def __init__(
        self,
        field_name: str,
        value: Any,
        min_value: Optional[Any] = None,
        max_value: Optional[Any] = None,
        **kwargs
    ):
        if min_value is not None and max_value is not None:
            error_msg = f"{min_value}以上{max_value}以下で入力してください"
        elif min_value is not None:
            error_msg = f"{min_value}以上で入力してください"
        elif max_value is not None:
            error_msg = f"{max_value}以下で入力してください"
        else:
            error_msg = "値が範囲外です"
        
        field_errors = {field_name: [error_msg]}
        
        details = kwargs.get('details', {})
        details.update({
            'field_name': field_name,
            'value': str(value),
            'min_value': min_value,
            'max_value': max_value
        })
        
        super().__init__(
            message=f"値範囲エラー: {field_name} = {value} (範囲: {min_value}-{max_value})",
            field_errors=field_errors,
            details=details,
            **kwargs
        )

# ===========================================
# 🔐 認証・認可エラー
# ===========================================

class AuthenticationException(EmverzeBaseException):
    """認証エラー"""
    
    def __init__(self, message: str, auth_method: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if auth_method:
            details['auth_method'] = auth_method
        
        super().__init__(
            message=message,
            category=ErrorCategory.AUTHENTICATION,
            severity=ErrorSeverity.MEDIUM,
            status_code=401,  # Unauthorized
            details=details,
            user_message="認証に失敗しました",
            **kwargs
        )

class InvalidCredentialsException(AuthenticationException):
    """認証情報無効エラー"""
    
    def __init__(self, **kwargs):
        super().__init__(
            message="認証情報が無効です",
            user_message="ユーザー名またはパスワードが間違っています",
            **kwargs
        )

class TokenExpiredException(AuthenticationException):
    """トークン期限切れエラー"""
    
    def __init__(self, token_type: str = "access_token", **kwargs):
        details = kwargs.get('details', {})
        details['token_type'] = token_type
        
        super().__init__(
            message=f"{token_type}の有効期限が切れています",
            details=details,
            user_message="セッションの有効期限が切れています。再度ログインしてください",
            recoverable=True,
            **kwargs
        )

class AuthorizationException(EmverzeBaseException):
    """認可エラー"""
    
    def __init__(self, message: str, required_permission: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if required_permission:
            details['required_permission'] = required_permission
        
        super().__init__(
            message=message,
            category=ErrorCategory.AUTHORIZATION,
            severity=ErrorSeverity.MEDIUM,
            status_code=403,  # Forbidden
            details=details,
            user_message="この操作を実行する権限がありません",
            **kwargs
        )

class InsufficientPermissionException(AuthorizationException):
    """権限不足エラー"""
    
    def __init__(self, required_permission: str, user_permissions: List[str], **kwargs):
        details = kwargs.get('details', {})
        details.update({
            'required_permission': required_permission,
            'user_permissions': user_permissions
        })
        
        super().__init__(
            message=f"必要な権限がありません: {required_permission}",
            required_permission=required_permission,
            details=details,
            **kwargs
        )

# ===========================================
# 🌐 外部API・ネットワークエラー
# ===========================================

class ExternalApiException(EmverzeBaseException):
    """外部APIエラー"""
    
    def __init__(
        self,
        message: str,
        api_name: str,
        status_code: Optional[int] = None,
        response_data: Optional[Dict[str, Any]] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        details.update({
            'api_name': api_name,
            'api_status_code': status_code,
            'response_data': response_data
        })
        
        super().__init__(
            message=message,
            category=ErrorCategory.EXTERNAL_API,
            severity=ErrorSeverity.HIGH,
            status_code=502,  # Bad Gateway
            details=details,
            user_message=f"{api_name}との連携でエラーが発生しました",
            recoverable=True,
            retry_after=30,
            **kwargs
        )

class ApiTimeoutException(ExternalApiException):
    """API タイムアウトエラー"""
    
    def __init__(self, api_name: str, timeout_seconds: int, **kwargs):
        details = kwargs.get('details', {})
        details['timeout_seconds'] = timeout_seconds
        
        super().__init__(
            message=f"{api_name} APIがタイムアウトしました ({timeout_seconds}秒)",
            api_name=api_name,
            details=details,
            user_message=f"{api_name}への接続がタイムアウトしました",
            retry_after=60,
            **kwargs
        )

class ApiRateLimitException(ExternalApiException):
    """API レート制限エラー"""
    
    def __init__(self, api_name: str, retry_after: int, **kwargs):
        details = kwargs.get('details', {})
        details['rate_limit_retry_after'] = retry_after
        
        super().__init__(
            message=f"{api_name} APIのレート制限に達しました",
            api_name=api_name,
            status_code=429,  # Too Many Requests
            details=details,
            user_message=f"{api_name}のご利用が集中しています。しばらく時間をおいて再度お試しください",
            retry_after=retry_after,
            **kwargs
        )

class NetworkException(EmverzeBaseException):
    """ネットワークエラー"""
    
    def __init__(self, message: str, network_operation: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if network_operation:
            details['network_operation'] = network_operation
        
        super().__init__(
            message=message,
            category=ErrorCategory.NETWORK,
            severity=ErrorSeverity.HIGH,
            status_code=503,  # Service Unavailable
            details=details,
            user_message="ネットワークエラーが発生しました",
            recoverable=True,
            retry_after=30,
            **kwargs
        )

# ===========================================
# 🗄️ データベースエラー
# ===========================================

class DatabaseException(EmverzeBaseException):
    """データベースエラー"""
    
    def __init__(
        self,
        message: str,
        operation: Optional[str] = None,
        table_name: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if operation:
            details['operation'] = operation
        if table_name:
            details['table_name'] = table_name
        
        super().__init__(
            message=message,
            category=ErrorCategory.DATABASE,
            severity=ErrorSeverity.HIGH,
            status_code=500,
            details=details,
            user_message="データの処理中にエラーが発生しました",
            recoverable=True,
            retry_after=10,
            **kwargs
        )

class DatabaseConnectionException(DatabaseException):
    """データベース接続エラー"""
    
    def __init__(self, **kwargs):
        super().__init__(
            message="データベースへの接続に失敗しました",
            operation="connection",
            user_message="システムが一時的に利用できません。しばらく時間をおいて再度お試しください",
            severity=ErrorSeverity.CRITICAL,
            **kwargs
        )

class DatabaseTransactionException(DatabaseException):
    """データベーストランザクションエラー"""
    
    def __init__(self, operation: str, **kwargs):
        super().__init__(
            message=f"トランザクション{operation}に失敗しました",
            operation=f"transaction_{operation}",
            user_message="データの整合性を保つため、処理を中断しました",
            **kwargs
        )

class DatabaseConstraintException(DatabaseException):
    """データベース制約エラー"""
    
    def __init__(self, constraint_name: str, constraint_type: str, **kwargs):
        details = kwargs.get('details', {})
        details.update({
            'constraint_name': constraint_name,
            'constraint_type': constraint_type
        })
        
        super().__init__(
            message=f"データベース制約違反: {constraint_name} ({constraint_type})",
            operation="constraint_check",
            details=details,
            user_message="データの整合性に問題があります",
            **kwargs
        )

# ===========================================
# 🔧 ユーティリティ関数
# ===========================================

def create_error_context(
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    request_id: Optional[str] = None,
    operation: Optional[str] = None,
    resource_id: Optional[str] = None,
    **additional_data
) -> ErrorContext:
    """エラーコンテキスト作成ヘルパー"""
    return ErrorContext(
        user_id=user_id,
        session_id=session_id,
        request_id=request_id,
        operation=operation,
        resource_id=resource_id,
        additional_data=additional_data
    )

def handle_database_error(e: Exception, operation: str, table_name: Optional[str] = None) -> DatabaseException:
    """データベースエラーハンドリングヘルパー"""
    error_message = str(e).lower()
    
    if "connection" in error_message:
        return DatabaseConnectionException()
    elif "constraint" in error_message or "integrity" in error_message:
        return DatabaseConstraintException("integrity_constraint", "integrity")
    elif "timeout" in error_message:
        return DatabaseException(
            message=f"データベース操作がタイムアウトしました: {operation}",
            operation=operation,
            table_name=table_name,
            retry_after=30
        )
    else:
        return DatabaseException(
            message=f"データベースエラー: {str(e)}",
            operation=operation,
            table_name=table_name
        )

def handle_external_api_error(
    e: Exception,
    api_name: str,
    status_code: Optional[int] = None
) -> ExternalApiException:
    """外部APIエラーハンドリングヘルパー"""
    error_message = str(e).lower()
    
    if "timeout" in error_message:
        return ApiTimeoutException(api_name, 30)
    elif "rate limit" in error_message or status_code == 429:
        return ApiRateLimitException(api_name, 60)
    else:
        return ExternalApiException(
            message=f"{api_name} APIエラー: {str(e)}",
            api_name=api_name,
            status_code=status_code
        )

# ===========================================
# 📊 エラー報告・監視用
# ===========================================

class ErrorReporter:
    """エラー報告クラス"""
    
    @staticmethod
    def should_report(exception: EmverzeBaseException) -> bool:
        """エラー報告要否判定"""
        return exception.severity.value >= ErrorSeverity.HIGH.value
    
    @staticmethod
    def should_notify_immediately(exception: EmverzeBaseException) -> bool:
        """即座通知要否判定"""
        return exception.severity == ErrorSeverity.CRITICAL
    
    @staticmethod
    def get_notification_channel(exception: EmverzeBaseException) -> str:
        """通知チャンネル決定"""
        if exception.severity == ErrorSeverity.CRITICAL:
            return "urgent"
        elif exception.severity == ErrorSeverity.HIGH:
            return "high"
        else:
            return "normal"

# 後方互換性のためのエイリアス
SystemException = EmverzeException
UserException = BusinessLogicException
ApiException = ExternalApiException
