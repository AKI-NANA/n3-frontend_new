#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
notification_service.py - 統一通知サービス（完全版）

✅ 修正内容:
- 統一APIレスポンス形式対応: {"status": "success/error", "message": "", "data": {}, "timestamp": ""}
- 統一例外クラス使用
- 非同期処理最適化
- エラーハンドリング強化
- 通知履歴管理
- 複数チャンネル対応
- フォールバック機能

このモジュールは外部通知機能を提供し、
Chatwork、Slack、Email等の複数チャンネルに対応しています。
"""

import asyncio
import httpx
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum

from core.exceptions import EmverzeException, ValidationException
from utils.config import settings
from utils.logger import setup_logger, log_to_jsonl

# ロガー設定
logger = setup_logger()

def create_api_response(status: str, message: str = "", data: dict = None) -> dict:
    """統一APIレスポンス形式作成
    
    Args:
        status: "success" または "error"
        message: メッセージ
        data: データ（デフォルト: {}）
        
    Returns:
        統一形式のAPIレスポンス
    """
    return {
        "status": status,
        "message": message,
        "data": data if data is not None else {},
        "timestamp": datetime.utcnow().isoformat()
    }

class NotificationLevel(Enum):
    """通知レベル"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class NotificationChannel(Enum):
    """通知チャンネル"""
    CHATWORK = "chatwork"
    SLACK = "slack"
    EMAIL = "email"
    WEBHOOK = "webhook"

@dataclass
class NotificationConfig:
    """通知設定"""
    enabled: bool = True
    channels: List[NotificationChannel] = None
    rate_limit: int = 60  # 1時間あたりの最大通知数
    retry_count: int = 3
    retry_delay: int = 5  # 秒

@dataclass
class NotificationResult:
    """通知結果"""
    channel: NotificationChannel
    success: bool
    message: str
    response_data: Optional[dict] = None
    error: Optional[str] = None
    timestamp: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow().isoformat()

class NotificationService:
    """統一通知サービス（完全版）"""
    
    def __init__(self, config: Optional[NotificationConfig] = None):
        """初期化
        
        Args:
            config: 通知設定（オプション）
        """
        try:
            # 設定初期化
            self.config = config or NotificationConfig()
            
            # 基本設定
            self.app_name = getattr(settings, 'APP_NAME', 'Emverze SaaS')
            self.environment = getattr(settings, 'ENVIRONMENT', 'production')
            
            # Chatwork設定
            self.chatwork_api_key = getattr(settings, 'CHATWORK_API_KEY', None)
            self.chatwork_room_id = getattr(settings, 'CHATWORK_ROOM_ID', None)
            
            # Slack設定
            self.slack_webhook_url = getattr(settings, 'SLACK_WEBHOOK_URL', None)
            self.slack_token = getattr(settings, 'SLACK_TOKEN', None)
            
            # Email設定
            self.smtp_host = getattr(settings, 'SMTP_HOST', None)
            self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
            self.smtp_user = getattr(settings, 'SMTP_USER', None)
            self.smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
            
            # 内部状態
            self.notification_history = []
            self.rate_limit_counter = {}
            self.failed_notifications = []
            
            # HTTPクライアント設定
            self.http_timeout = 30
            self.http_retries = 3
            
            logger.info("NotificationService初期化完了", {
                "app_name": self.app_name,
                "environment": self.environment,
                "chatwork_configured": self.is_chatwork_configured(),
                "slack_configured": self.is_slack_configured()
            })
            
        except Exception as e:
            logger.error(f"NotificationService初期化エラー: {e}")
            raise EmverzeException(f"通知サービスの初期化に失敗しました: {e}")
    
    # ===========================================
    # 🔧 設定確認メソッド
    # ===========================================
    
    def is_chatwork_configured(self) -> bool:
        """Chatwork設定確認"""
        return bool(self.chatwork_api_key and self.chatwork_room_id)
    
    def is_slack_configured(self) -> bool:
        """Slack設定確認"""
        return bool(self.slack_webhook_url or self.slack_token)
    
    def is_email_configured(self) -> bool:
        """Email設定確認"""
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)
    
    def get_available_channels(self) -> List[NotificationChannel]:
        """利用可能な通知チャンネル取得"""
        channels = []
        
        if self.is_chatwork_configured():
            channels.append(NotificationChannel.CHATWORK)
        
        if self.is_slack_configured():
            channels.append(NotificationChannel.SLACK)
        
        if self.is_email_configured():
            channels.append(NotificationChannel.EMAIL)
        
        return channels
    
    # ===========================================
    # 📊 レート制限・履歴管理
    # ===========================================
    
    def check_rate_limit(self, channel: NotificationChannel) -> bool:
        """レート制限チェック"""
        current_hour = datetime.utcnow().strftime("%Y-%m-%d-%H")
        key = f"{channel.value}_{current_hour}"
        
        count = self.rate_limit_counter.get(key, 0)
        
        if count >= self.config.rate_limit:
            logger.warning(f"レート制限に達しました: {channel.value} ({count}/{self.config.rate_limit})")
            return False
        
        self.rate_limit_counter[key] = count + 1
        return True
    
    def add_to_history(self, result: NotificationResult):
        """通知履歴に追加"""
        self.notification_history.append(result)
        
        # 履歴サイズ制限（最新1000件のみ保持）
        if len(self.notification_history) > 1000:
            self.notification_history = self.notification_history[-1000:]
    
    # ===========================================
    # 🚀 メイン通知メソッド
    # ===========================================
    
    async def send_notification(
        self,
        title: str,
        message: str,
        level: Union[str, NotificationLevel] = NotificationLevel.INFO,
        details: Optional[Dict[str, Any]] = None,
        channels: Optional[List[NotificationChannel]] = None
    ) -> dict:
        """統一通知送信（統一APIレスポンス対応）
        
        Args:
            title: 通知タイトル
            message: 通知メッセージ
            level: 通知レベル
            details: 詳細情報（オプション）
            channels: 送信チャンネル（指定しない場合は全チャンネル）
            
        Returns:
            統一APIレスポンス形式
        """
        try:
            # パラメータバリデーション
            if not title or not message:
                return create_api_response(
                    "error",
                    "タイトルとメッセージは必須です",
                    {"error_type": "validation_error"}
                )
            
            # レベル正規化
            if isinstance(level, str):
                try:
                    level = NotificationLevel(level.lower())
                except ValueError:
                    level = NotificationLevel.INFO
            
            # チャンネル決定
            target_channels = channels or self.get_available_channels()
            
            if not target_channels:
                return create_api_response(
                    "error",
                    "利用可能な通知チャンネルがありません",
                    {"available_channels": []}
                )
            
            # 通知メッセージ構築
            formatted_message = self.format_notification_message(title, message, level, details)
            
            # 各チャンネルに並列送信
            results = await self.send_to_channels(formatted_message, target_channels, level)
            
            # 結果集計
            success_count = sum(1 for r in results if r.success)
            total_count = len(results)
            
            # 履歴に追加
            for result in results:
                self.add_to_history(result)
            
            if success_count == 0:
                return create_api_response(
                    "error",
                    "全ての通知チャンネルで送信に失敗しました",
                    {
                        "results": [self.result_to_dict(r) for r in results],
                        "success_count": success_count,
                        "total_count": total_count
                    }
                )
            elif success_count < total_count:
                return create_api_response(
                    "success",
                    f"一部のチャンネルで通知送信が完了しました ({success_count}/{total_count})",
                    {
                        "results": [self.result_to_dict(r) for r in results],
                        "success_count": success_count,
                        "total_count": total_count
                    }
                )
            else:
                return create_api_response(
                    "success",
                    f"全てのチャンネルで通知送信が完了しました ({success_count}/{total_count})",
                    {
                        "results": [self.result_to_dict(r) for r in results],
                        "success_count": success_count,
                        "total_count": total_count
                    }
                )
                
        except EmverzeException as e:
            logger.error(f"通知送信エラー: {e}")
            return create_api_response(
                "error",
                f"通知送信処理に失敗しました: {e}",
                {"error_category": e.category if hasattr(e, 'category') else 'notification_error'}
            )
            
        except Exception as e:
            logger.error(f"通知送信予期しないエラー: {e}")
            return create_api_response(
                "error",
                "予期しないエラーが発生しました",
                {"error_type": "unexpected_error"}
            )
    
    async def send_to_channels(
        self,
        message: str,
        channels: List[NotificationChannel],
        level: NotificationLevel
    ) -> List[NotificationResult]:
        """複数チャンネルに並列送信"""
        tasks = []
        
        for channel in channels:
            # レート制限チェック
            if not self.check_rate_limit(channel):
                result = NotificationResult(
                    channel=channel,
                    success=False,
                    message="レート制限に達しました",
                    error="rate_limit_exceeded"
                )
                tasks.append(asyncio.create_task(self.return_result(result)))
                continue
            
            # チャンネル別送信タスク作成
            if channel == NotificationChannel.CHATWORK:
                task = self.send_chatwork_notification(message, level)
            elif channel == NotificationChannel.SLACK:
                task = self.send_slack_notification(message, level)
            elif channel == NotificationChannel.EMAIL:
                task = self.send_email_notification(message, level)
            else:
                result = NotificationResult(
                    channel=channel,
                    success=False,
                    message="サポートされていないチャンネルです",
                    error="unsupported_channel"
                )
                task = self.return_result(result)
            
            tasks.append(asyncio.create_task(task))
        
        # 並列実行
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 例外を結果に変換
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                error_result = NotificationResult(
                    channel=channels[i] if i < len(channels) else NotificationChannel.CHATWORK,
                    success=False,
                    message="送信中にエラーが発生しました",
                    error=str(result)
                )
                processed_results.append(error_result)
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def return_result(self, result: NotificationResult) -> NotificationResult:
        """結果をそのまま返すヘルパー"""
        return result
    
    # ===========================================
    # 📱 Chatwork通知
    # ===========================================
    
    async def send_chatwork_notification(
        self,
        message: str,
        level: NotificationLevel
    ) -> NotificationResult:
        """Chatwork通知送信"""
        if not self.is_chatwork_configured():
            return NotificationResult(
                channel=NotificationChannel.CHATWORK,
                success=False,
                message="Chatwork設定が不完全です",
                error="configuration_missing"
            )
        
        try:
            url = f"https://api.chatwork.com/v2/rooms/{self.chatwork_room_id}/messages"
            headers = {
                "X-ChatWorkToken": self.chatwork_api_key,
                "Content-Type": "application/x-www-form-urlencoded"
            }
            data = {"body": message}
            
            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                response = await client.post(url, headers=headers, data=data)
                
                if response.status_code == 200:
                    response_data = response.json()
                    return NotificationResult(
                        channel=NotificationChannel.CHATWORK,
                        success=True,
                        message="Chatwork通知送信成功",
                        response_data=response_data
                    )
                else:
                    error_text = response.text
                    logger.error(f"Chatwork送信エラー: {response.status_code} - {error_text}")
                    
                    return NotificationResult(
                        channel=NotificationChannel.CHATWORK,
                        success=False,
                        message=f"Chatwork送信失敗: HTTP {response.status_code}",
                        error=error_text
                    )
                    
        except asyncio.TimeoutError:
            return NotificationResult(
                channel=NotificationChannel.CHATWORK,
                success=False,
                message="Chatwork送信タイムアウト",
                error="timeout"
            )
        except Exception as e:
            logger.error(f"Chatwork送信例外: {e}")
            return NotificationResult(
                channel=NotificationChannel.CHATWORK,
                success=False,
                message="Chatwork送信中にエラーが発生しました",
                error=str(e)
            )
    
    # ===========================================
    # 💬 Slack通知
    # ===========================================
    
    async def send_slack_notification(
        self,
        message: str,
        level: NotificationLevel
    ) -> NotificationResult:
        """Slack通知送信"""
        if not self.is_slack_configured():
            return NotificationResult(
                channel=NotificationChannel.SLACK,
                success=False,
                message="Slack設定が不完全です",
                error="configuration_missing"
            )
        
        try:
            # レベルに応じた色設定
            color_map = {
                NotificationLevel.INFO: "good",
                NotificationLevel.WARNING: "warning",
                NotificationLevel.ERROR: "danger",
                NotificationLevel.CRITICAL: "danger"
            }
            
            payload = {
                "text": f"[{self.app_name}] {level.value.upper()}",
                "attachments": [
                    {
                        "color": color_map.get(level, "good"),
                        "text": message,
                        "ts": int(datetime.utcnow().timestamp())
                    }
                ]
            }
            
            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                response = await client.post(
                    self.slack_webhook_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    return NotificationResult(
                        channel=NotificationChannel.SLACK,
                        success=True,
                        message="Slack通知送信成功"
                    )
                else:
                    error_text = response.text
                    logger.error(f"Slack送信エラー: {response.status_code} - {error_text}")
                    
                    return NotificationResult(
                        channel=NotificationChannel.SLACK,
                        success=False,
                        message=f"Slack送信失敗: HTTP {response.status_code}",
                        error=error_text
                    )
                    
        except Exception as e:
            logger.error(f"Slack送信例外: {e}")
            return NotificationResult(
                channel=NotificationChannel.SLACK,
                success=False,
                message="Slack送信中にエラーが発生しました",
                error=str(e)
            )
    
    # ===========================================
    # 📧 Email通知
    # ===========================================
    
    async def send_email_notification(
        self,
        message: str,
        level: NotificationLevel
    ) -> NotificationResult:
        """Email通知送信"""
        if not self.is_email_configured():
            return NotificationResult(
                channel=NotificationChannel.EMAIL,
                success=False,
                message="Email設定が不完全です",
                error="configuration_missing"
            )
        
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            # メール作成
            msg = MIMEMultipart()
            msg['From'] = self.smtp_user
            msg['To'] = getattr(settings, 'ADMIN_EMAIL', self.smtp_user)
            msg['Subject'] = f"[{self.app_name}] {level.value.upper()} 通知"
            
            msg.attach(MIMEText(message, 'plain', 'utf-8'))
            
            # SMTP送信
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            return NotificationResult(
                channel=NotificationChannel.EMAIL,
                success=True,
                message="Email通知送信成功"
            )
            
        except Exception as e:
            logger.error(f"Email送信例外: {e}")
            return NotificationResult(
                channel=NotificationChannel.EMAIL,
                success=False,
                message="Email送信中にエラーが発生しました",
                error=str(e)
            )
    
    # ===========================================
    # 🔧 ユーティリティメソッド
    # ===========================================
    
    def format_notification_message(
        self,
        title: str,
        message: str,
        level: NotificationLevel,
        details: Optional[Dict[str, Any]] = None
    ) -> str:
        """通知メッセージフォーマット"""
        # 環境情報付加
        env_prefix = f"[{self.environment.upper()}] " if self.environment != "production" else ""
        
        # レベル絵文字
        level_emoji = {
            NotificationLevel.INFO: "ℹ️",
            NotificationLevel.WARNING: "⚠️",
            NotificationLevel.ERROR: "❌",
            NotificationLevel.CRITICAL: "🚨"
        }
        
        # 基本メッセージ構築
        formatted_message = f"""{level_emoji.get(level, 'ℹ️')} {env_prefix}{title}

{message}

🕐 {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
🏢 {self.app_name}"""
        
        # 詳細情報追加
        if details:
            details_text = "\n".join([f"• {key}: {value}" for key, value in details.items()])
            formatted_message += f"\n\n📋 詳細情報:\n{details_text}"
        
        return formatted_message
    
    def result_to_dict(self, result: NotificationResult) -> dict:
        """NotificationResultを辞書に変換"""
        return {
            "channel": result.channel.value,
            "success": result.success,
            "message": result.message,
            "response_data": result.response_data,
            "error": result.error,
            "timestamp": result.timestamp
        }
    
    # ===========================================
    # 📊 便利メソッド
    # ===========================================
    
    async def send_error_notification(
        self,
        error: Exception,
        context: Optional[str] = None
    ) -> dict:
        """エラー通知送信（統一APIレスポンス対応）"""
        title = "システムエラーが発生しました"
        
        error_message = f"エラー: {str(error)}"
        if context:
            error_message += f"\nコンテキスト: {context}"
        
        details = {
            "エラータイプ": type(error).__name__,
            "発生時刻": datetime.utcnow().isoformat()
        }
        
        return await self.send_notification(
            title=title,
            message=error_message,
            level=NotificationLevel.ERROR,
            details=details
        )
    
    async def send_success_notification(
        self,
        title: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ) -> dict:
        """成功通知送信（統一APIレスポンス対応）"""
        return await self.send_notification(
            title=title,
            message=message,
            level=NotificationLevel.INFO,
            details=details
        )
    
    async def send_warning_notification(
        self,
        title: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ) -> dict:
        """警告通知送信（統一APIレスポンス対応）"""
        return await self.send_notification(
            title=title,
            message=message,
            level=NotificationLevel.WARNING,
            details=details
        )
    
    def get_notification_history(self, limit: int = 100) -> dict:
        """通知履歴取得（統一APIレスポンス対応）"""
        try:
            history = self.notification_history[-limit:] if limit > 0 else self.notification_history
            
            return create_api_response(
                "success",
                f"通知履歴を取得しました（最新{len(history)}件）",
                {
                    "history": [self.result_to_dict(r) for r in history],
                    "total_count": len(self.notification_history),
                    "returned_count": len(history)
                }
            )
            
        except Exception as e:
            return create_api_response(
                "error",
                f"通知履歴取得に失敗しました: {e}",
                {"error_type": "history_error"}
            )
    
    def get_status(self) -> dict:
        """サービス状況取得（統一APIレスポンス対応）"""
        try:
            available_channels = self.get_available_channels()
            
            status_data = {
                "service_status": "active",
                "available_channels": [c.value for c in available_channels],
                "total_notifications": len(self.notification_history),
                "configuration": {
                    "chatwork_configured": self.is_chatwork_configured(),
                    "slack_configured": self.is_slack_configured(),
                    "email_configured": self.is_email_configured()
                },
                "rate_limits": {
                    channel.value: self.config.rate_limit 
                    for channel in NotificationChannel
                }
            }
            
            return create_api_response(
                "success",
                "通知サービスの状況を取得しました",
                status_data
            )
            
        except Exception as e:
            return create_api_response(
                "error",
                f"サービス状況取得に失敗しました: {e}",
                {"error_type": "status_error"}
            )


# ===========================================
# 🎯 統一インターフェース関数
# ===========================================

# グローバルインスタンス（後方互換性）
_notification_service = None

def get_notification_service() -> NotificationService:
    """グローバル通知サービス取得"""
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service

async def send_notification(title: str, message: str, level: str = "info", details: dict = None) -> dict:
    """統一通知送信関数（後方互換性）"""
    service = get_notification_service()
    return await service.send_notification(title, message, level, details)

async def send_error_notification(error: Exception, context: str = None) -> dict:
    """エラー通知送信関数（後方互換性）"""
    service = get_notification_service()
    return await service.send_error_notification(error, context)

def get_notification_status() -> dict:
    """通知サービス状況取得関数（後方互換性）"""
    service = get_notification_service()
    return service.get_status()
