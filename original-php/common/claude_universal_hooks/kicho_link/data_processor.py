#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
data_processor.py - MFクラウドデータ処理エンジン

このモジュールはデータ取得・AI処理の自動化エンジンを提供します：
1. MFクラウドから新規取引自動取得
2. AI推論適用・結果DB保存
3. 高信頼度取引の自動承認（95%以上）
4. エラー処理・リトライ機能
"""

import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession

from database.repositories import (
    get_transaction_repository,
    get_journal_entry_repository,
    get_activity_log_repository
)
from services.ai_service import AIService, ConfidenceLevel, DualAIResult
from services.mfcloud_service import MFCloudService
from services.sync_service import SyncService
from services.notification_service import NotificationService
from utils.logger import setup_logger, log_to_jsonl
from utils.config import settings

# ロガー設定
logger = setup_logger()

class ProcessingMode(Enum):
    """処理モード"""
    MANUAL = "manual"           # 手動実行
    SCHEDULED = "scheduled"     # 定期実行
    REAL_TIME = "real_time"     # リアルタイム
    BATCH = "batch"             # バッチ処理

@dataclass
class ProcessingConfig:
    """処理設定"""
    mode: ProcessingMode = ProcessingMode.SCHEDULED
    auto_approve_threshold: float = 95.0    # 自動承認閾値
    max_transactions_per_run: int = 100     # 1回の処理上限
    enable_notifications: bool = True       # 通知有効化
    retry_failed_items: bool = True         # 失敗項目リトライ
    learning_enabled: bool = True           # 学習機能有効化

@dataclass
class ProcessingResult:
    """処理結果"""
    total_processed: int = 0                # 総処理数
    new_transactions: int = 0               # 新規取引数
    ai_inferred: int = 0                    # AI推論実行数
    auto_approved: int = 0                  # 自動承認数
    manual_review_required: int = 0         # 手動確認要求数
    errors: int = 0                         # エラー数
    processing_time_seconds: float = 0.0    # 処理時間
    error_details: List[Dict[str, Any]] = None

    def __post_init__(self):
        if self.error_details is None:
            self.error_details = []

class DataProcessor:
    """データ処理エンジン"""
    
    def __init__(self, session: AsyncSession, config: Optional[ProcessingConfig] = None):
        """初期化
        
        Args:
            session: SQLAlchemy非同期セッション
            config: 処理設定
        """
        self.session = session
        self.config = config or ProcessingConfig()
        
        # サービス初期化
        self.ai_service = AIService(session)
        self.mfcloud_service = MFCloudService()
        self.sync_service = SyncService(session)
        self.notification_service = NotificationService() if self.config.enable_notifications else None
        
        # 処理統計
        self.processing_stats = {
            'total_runs': 0,
            'successful_runs': 0,
            'last_run_time': None,
            'average_processing_time': 0.0,
            'total_transactions_processed': 0
        }
    
    async def process_new_transactions(self) -> ProcessingResult:
        """新規取引処理メイン関数
        
        Returns:
            処理結果
        """
        start_time = datetime.utcnow()
        result = ProcessingResult()
        
        try:
            logger.info(f"新規取引処理開始 (モード: {self.config.mode.value})")
            
            # Step 1: MFクラウドから新規取引取得
            new_transactions = await self._fetch_new_transactions()
            result.new_transactions = len(new_transactions)
            
            if not new_transactions:
                logger.info("新規取引はありません")
                return result
            
            logger.info(f"新規取引 {result.new_transactions}件を処理開始")
            
            # Step 2: 各取引にAI推論適用
            for transaction in new_transactions[:self.config.max_transactions_per_run]:
                try:
                    await self._process_single_transaction(transaction, result)
                except Exception as e:
                    logger.error(f"個別取引処理エラー {transaction.get('id', 'unknown')}: {e}")
                    result.errors += 1
                    result.error_details.append({
                        'transaction_id': transaction.get('id', 'unknown'),
                        'error': str(e),
                        'timestamp': datetime.utcnow().isoformat()
                    })
            
            result.total_processed = result.new_transactions
            
            # Step 3: 高信頼度取引の自動承認・送信
            if result.ai_inferred > 0:
                auto_approval_result = await self._auto_approve_high_confidence()
                result.auto_approved = auto_approval_result.get('approved_count', 0)
            
            # Step 4: 処理結果の通知
            if self.notification_service and result.total_processed > 0:
                await self._send_processing_notification(result)
            
            # 処理時間計算
            result.processing_time_seconds = (datetime.utcnow() - start_time).total_seconds()
            
            # 統計更新
            self._update_processing_stats(result)
            
            # アクティビティログ記録
            await self._log_processing_activity(result)
            
            logger.info(f"新規取引処理完了: {result.total_processed}件処理, {result.auto_approved}件自動承認")
            
            return result
            
        except Exception as e:
            logger.error(f"新規取引処理エラー: {e}")
            result.errors += 1
            result.error_details.append({
                'stage': 'main_processing',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # エラーログ記録
            log_to_jsonl(
                {
                    "type": "data_processing_error",
                    "mode": self.config.mode.value,
                    "error": str(e),
                    "result": result.__dict__,
                    "timestamp": datetime.utcnow().isoformat()
                },
                settings.ERROR_LOG_FILE
            )
            
            return result
    
    async def _fetch_new_transactions(self) -> List[Dict[str, Any]]:
        """MFクラウドから新規取引取得"""
        try:
            # MFクラウド接続確認
            if not await self.mfcloud_service.connect():
                raise Exception("MFクラウドへの接続に失敗しました")
            
            # 最後の取得日時を確認
            transaction_repo = get_transaction_repository(self.session)
            
            # 過去3日間の取引を取得（重複チェック付き）
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=3)
            
            # MFクラウドから取引データ取得
            # 注意: MFCloudServiceに取引取得メソッドが必要
            mf_transactions = await self.mfcloud_service.get_transactions(
                start_date=start_date,
                end_date=end_date,
                limit=self.config.max_transactions_per_run
            )
            
            if not mf_transactions:
                return []
            
            # 既存取引との重複チェック
            new_transactions = []
            
            for mf_transaction in mf_transactions:
                # 重複チェック（摘要・金額・日付で判定）
                existing_transactions = await transaction_repo.find_by_date_range(
                    start_date=mf_transaction['transaction_date'],
                    end_date=mf_transaction['transaction_date']
                )
                
                is_duplicate = False
                for existing in existing_transactions:
                    if (existing.description == mf_transaction['description'] and
                        abs(existing.amount - mf_transaction['amount']) < 0.01):
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    new_transactions.append(mf_transaction)
            
            logger.info(f"MFクラウドから新規取引 {len(new_transactions)}件取得")
            return new_transactions
            
        except Exception as e:
            logger.error(f"新規取引取得エラー: {e}")
            raise
    
    async def _process_single_transaction(self, transaction_data: Dict[str, Any], 
                                        result: ProcessingResult) -> None:
        """単一取引の処理"""
        try:
            transaction_repo = get_transaction_repository(self.session)
            journal_repo = get_journal_entry_repository(self.session)
            
            # 取引データをDBに保存
            db_transaction_data = {
                'transaction_date': transaction_data['transaction_date'],
                'description': transaction_data['description'],
                'amount': transaction_data['amount'],
                'source': 'mf_cloud_auto',
                'original_data': transaction_data,
                'is_processed': False,
                'processing_status': 'ai_pending'
            }
            
            db_transaction = await transaction_repo.create(db_transaction_data)
            
            # AI推論実行
            ai_result = await self.ai_service.infer_journal_entry({
                'description': transaction_data['description'],
                'amount': transaction_data['amount'],
                'transaction_date': transaction_data['transaction_date'],
                'source': 'mf_cloud_auto'
            })
            
            result.ai_inferred += 1
            
            # 仕訳エントリ作成
            journal_entry_data = {
                'transaction_id': db_transaction.id,
                'entry_date': transaction_data['transaction_date'],
                'debit_account': ai_result.primary_result.debit_account,
                'credit_account': ai_result.primary_result.credit_account,
                'amount': transaction_data['amount'],
                'description': transaction_data['description'],
                'mf_status': 'pending'
            }
            
            # AI推論結果を追加フィールドとして保存
            journal_entry_data.update({
                'ai_confidence': ai_result.final_confidence,
                'ai_reasoning': ai_result.primary_result.reasoning,
                'ai_model_used': ai_result.primary_result.model_used,
                'ai_suggested_description': ai_result.primary_result.suggested_description,
                'ai_tax_classification': ai_result.primary_result.tax_classification
            })
            
            journal_entry = await journal_repo.create(journal_entry_data)
            
            # 手動確認が必要かどうか判定
            if ai_result.final_confidence < self.config.auto_approve_threshold:
                result.manual_review_required += 1
                
                # 取引状態を手動確認待ちに更新
                await transaction_repo.update(db_transaction.id, {
                    'processing_status': 'manual_review_required'
                })
            
            logger.debug(f"取引処理完了: {transaction_data['description'][:30]} (信頼度: {ai_result.final_confidence:.1f}%)")
            
        except Exception as e:
            logger.error(f"単一取引処理エラー: {e}")
            raise
    
    async def _auto_approve_high_confidence(self) -> Dict[str, Any]:
        """高信頼度取引の自動承認"""
        try:
            journal_repo = get_journal_entry_repository(self.session)
            transaction_repo = get_transaction_repository(self.session)
            
            # 高信頼度の未承認仕訳を取得
            high_confidence_entries = []
            
            # 過去1日の未処理仕訳を確認
            yesterday = datetime.utcnow().date() - timedelta(days=1)
            recent_entries = await journal_repo.find_by_date_range(
                start_date=yesterday,
                end_date=datetime.utcnow().date(),
                mf_status="pending"
            )
            
            for entry in recent_entries:
                confidence = getattr(entry, 'ai_confidence', 0)
                if confidence >= self.config.auto_approve_threshold:
                    high_confidence_entries.append(entry)
            
            if not high_confidence_entries:
                return {'approved_count': 0, 'message': '自動承認対象なし'}
            
            # 自動承認実行
            approved_count = 0
            
            for entry in high_confidence_entries:
                try:
                    # 関連取引を処理済みにマーク
                    await transaction_repo.mark_as_processed(
                        entry.transaction_id, 
                        "auto_approved"
                    )
                    
                    # MF送信用に状態更新
                    await journal_repo.update(entry.id, {
                        'mf_status': 'pending',
                        'updated_at': datetime.utcnow()
                    })
                    
                    # AI学習データ記録（自動承認された高信頼度データ）
                    if self.config.learning_enabled:
                        learning_data = {
                            'debit_account': entry.debit_account,
                            'credit_account': entry.credit_account,
                            'description': entry.description
                        }
                        await self.ai_service.learn_from_approval(
                            entry.transaction_id, learning_data
                        )
                    
                    approved_count += 1
                    
                except Exception as e:
                    logger.error(f"個別自動承認エラー {entry.id}: {e}")
            
            # 承認済み仕訳のMF送信
            if approved_count > 0:
                # バックグラウンドでMF送信実行
                asyncio.create_task(self._send_approved_to_mf_background())
            
            logger.info(f"高信頼度取引自動承認完了: {approved_count}件")
            
            return {
                'approved_count': approved_count,
                'threshold': self.config.auto_approve_threshold,
                'message': f'{approved_count}件の高信頼度取引を自動承認しました'
            }
            
        except Exception as e:
            logger.error(f"自動承認エラー: {e}")
            return {'approved_count': 0, 'error': str(e)}
    
    async def _send_approved_to_mf_background(self) -> None:
        """承認済み仕訳のMF送信（バックグラウンド）"""
        try:
            # SyncServiceを使用してMF送信
            sync_result = await self.sync_service.sync_pending_entries(limit=50)
            
            if sync_result['success_count'] > 0:
                logger.info(f"MF自動送信完了: {sync_result['success_count']}件")
                
                # 送信結果通知
                if self.notification_service:
                    await self.notification_service.send_notification(
                        title="自動処理完了",
                        message=f"高信頼度取引 {sync_result['success_count']}件をマネーフォワードクラウドに自動送信しました",
                        level="info"
                    )
            
        except Exception as e:
            logger.error(f"MF自動送信エラー: {e}")
            
            if self.notification_service:
                await self.notification_service.send_error_notification(
                    e, "自動MF送信処理"
                )
    
    async def _send_processing_notification(self, result: ProcessingResult) -> None:
        """処理結果通知送信"""
        try:
            if not self.notification_service:
                return
            
            # 通知レベル決定
            if result.errors > 0:
                level = "warning"
                title = "自動処理完了（エラーあり）"
            elif result.auto_approved > 0:
                level = "info"
                title = "自動処理完了"
            else:
                level = "info"
                title = "自動処理完了（確認待ちあり）"
            
            # メッセージ作成
            message_parts = [
                f"新規取引: {result.new_transactions}件",
                f"AI推論: {result.ai_inferred}件",
                f"自動承認: {result.auto_approved}件",
                f"手動確認要求: {result.manual_review_required}件"
            ]
            
            if result.errors > 0:
                message_parts.append(f"エラー: {result.errors}件")
            
            message = "\n".join(message_parts)
            
            await self.notification_service.send_notification(
                title=title,
                message=message,
                level=level,
                details={
                    'processing_time_seconds': result.processing_time_seconds,
                    'mode': self.config.mode.value,
                    'timestamp': datetime.utcnow().isoformat()
                }
            )
            
        except Exception as e:
            logger.error(f"処理結果通知エラー: {e}")
    
    async def _log_processing_activity(self, result: ProcessingResult) -> None:
        """処理アクティビティログ記録"""
        try:
            activity_repo = get_activity_log_repository(self.session)
            
            await activity_repo.log_activity(
                activity_type="auto_data_processing",
                description=f"自動データ処理完了: {result.total_processed}件処理",
                data={
                    'mode': self.config.mode.value,
                    'total_processed': result.total_processed,
                    'new_transactions': result.new_transactions,
                    'ai_inferred': result.ai_inferred,
                    'auto_approved': result.auto_approved,
                    'manual_review_required': result.manual_review_required,
                    'errors': result.errors,
                    'processing_time_seconds': result.processing_time_seconds,
                    'auto_approve_threshold': self.config.auto_approve_threshold
                }
            )
            
        except Exception as e:
            logger.error(f"アクティビティログ記録エラー: {e}")
    
    def _update_processing_stats(self, result: ProcessingResult) -> None:
        """処理統計更新"""
        self.processing_stats['total_runs'] += 1
        
        if result.errors == 0:
            self.processing_stats['successful_runs'] += 1
        
        self.processing_stats['last_run_time'] = datetime.utcnow()
        self.processing_stats['total_transactions_processed'] += result.total_processed
        
        # 平均処理時間更新
        if self.processing_stats['total_runs'] > 0:
            current_avg = self.processing_stats['average_processing_time']
            new_time = result.processing_time_seconds
            new_avg = ((current_avg * (self.processing_stats['total_runs'] - 1)) + new_time) / self.processing_stats['total_runs']
            self.processing_stats['average_processing_time'] = new_avg
    
    async def retry_failed_transactions(self) -> ProcessingResult:
        """失敗した取引の再処理
        
        Returns:
            再処理結果
        """
        try:
            if not self.config.retry_failed_items:
                return ProcessingResult()
            
            transaction_repo = get_transaction_repository(self.session)
            
            # 処理失敗した取引を取得
            failed_transactions = []
            
            # 過去24時間の処理失敗取引
            yesterday = datetime.utcnow() - timedelta(days=1)
            
            # processing_status が 'error' の取引を取得
            all_transactions = await transaction_repo.get_all()
            for transaction in all_transactions:
                if (transaction.processing_status == 'error' and
                    transaction.updated_at > yesterday and
                    not transaction.is_processed):
                    failed_transactions.append(transaction)
            
            if not failed_transactions:
                logger.info("再処理対象の失敗取引はありません")
                return ProcessingResult()
            
            logger.info(f"失敗取引 {len(failed_transactions)}件を再処理開始")
            
            result = ProcessingResult()
            result.total_processed = len(failed_transactions)
            
            # 各失敗取引を再処理
            for transaction in failed_transactions:
                try:
                    # 取引データを再構成
                    transaction_data = {
                        'description': transaction.description,
                        'amount': transaction.amount,
                        'transaction_date': transaction.transaction_date,
                        'source': 'retry'
                    }
                    
                    # AI推論再実行
                    ai_result = await self.ai_service.infer_journal_entry(transaction_data)
                    result.ai_inferred += 1
                    
                    # 仕訳エントリ更新または作成
                    journal_repo = get_journal_entry_repository(self.session)
                    
                    # 既存エントリ確認
                    related_entries = await journal_repo.find_by_date_range(
                        start_date=transaction.transaction_date,
                        end_date=transaction.transaction_date
                    )
                    
                    existing_entry = None
                    for entry in related_entries:
                        if entry.transaction_id == transaction.id:
                            existing_entry = entry
                            break
                    
                    if existing_entry:
                        # 既存エントリ更新
                        await journal_repo.update(existing_entry.id, {
                            'debit_account': ai_result.primary_result.debit_account,
                            'credit_account': ai_result.primary_result.credit_account,
                            'ai_confidence': ai_result.final_confidence,
                            'ai_reasoning': ai_result.primary_result.reasoning,
                            'mf_status': 'pending',
                            'updated_at': datetime.utcnow()
                        })
                    else:
                        # 新規エントリ作成
                        journal_entry_data = {
                            'transaction_id': transaction.id,
                            'entry_date': transaction.transaction_date,
                            'debit_account': ai_result.primary_result.debit_account,
                            'credit_account': ai_result.primary_result.credit_account,
                            'amount': transaction.amount,
                            'description': transaction.description,
                            'mf_status': 'pending',
                            'ai_confidence': ai_result.final_confidence,
                            'ai_reasoning': ai_result.primary_result.reasoning
                        }
                        await journal_repo.create(journal_entry_data)
                    
                    # 取引状態を正常に戻す
                    if ai_result.final_confidence >= self.config.auto_approve_threshold:
                        await transaction_repo.update(transaction.id, {
                            'processing_status': 'auto_approved',
                            'updated_at': datetime.utcnow()
                        })
                        result.auto_approved += 1
                    else:
                        await transaction_repo.update(transaction.id, {
                            'processing_status': 'manual_review_required',
                            'updated_at': datetime.utcnow()
                        })
                        result.manual_review_required += 1
                    
                    logger.debug(f"再処理成功: {transaction.description[:30]}")
                    
                except Exception as e:
                    logger.error(f"個別再処理エラー {transaction.id}: {e}")
                    result.errors += 1
                    result.error_details.append({
                        'transaction_id': transaction.id,
                        'error': str(e),
                        'stage': 'retry',
                        'timestamp': datetime.utcnow().isoformat()
                    })
            
            logger.info(f"失敗取引再処理完了: {result.ai_inferred}件再処理, {result.auto_approved}件自動承認")
            
            return result
            
        except Exception as e:
            logger.error(f"失敗取引再処理エラー: {e}")
            result = ProcessingResult()
            result.errors = 1
            result.error_details = [{
                'stage': 'retry_main',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }]
            return result
    
    async def get_processing_statistics(self) -> Dict[str, Any]:
        """処理統計情報取得
        
        Returns:
            統計情報辞書
        """
        try:
            transaction_repo = get_transaction_repository(self.session)
            journal_repo = get_journal_entry_repository(self.session)
            
            # 基本統計
            total_transactions = await transaction_repo.count()
            
            # 今日の処理統計
            today = datetime.utcnow().date()
            today_transactions = await transaction_repo.find_by_date_range(
                start_date=today,
                end_date=today
            )
            
            # 今週の統計
            week_start = today - timedelta(days=today.weekday())
            week_transactions = await transaction_repo.find_by_date_range(
                start_date=week_start,
                end_date=today
            )
            
            # AI推論統計
            ai_processed_count = len([t for t in week_transactions if t.processing_status in ['auto_approved', 'manual_review_required']])
            
            # 自動承認率計算
            auto_approved_count = len([t for t in week_transactions if t.processing_status == 'auto_approved'])
            automation_rate = (auto_approved_count / max(ai_processed_count, 1)) * 100
            
            # エラー率計算
            error_count = len([t for t in week_transactions if t.processing_status == 'error'])
            error_rate = (error_count / max(len(week_transactions), 1)) * 100
            
            return {
                'total_transactions': total_transactions,
                'today_processed': len(today_transactions),
                'week_processed': len(week_transactions),
                'ai_processed_this_week': ai_processed_count,
                'auto_approved_this_week': auto_approved_count,
                'automation_rate_percent': round(automation_rate, 1),
                'error_rate_percent': round(error_rate, 1),
                'processing_stats': self.processing_stats,
                'config': {
                    'mode': self.config.mode.value,
                    'auto_approve_threshold': self.config.auto_approve_threshold,
                    'max_transactions_per_run': self.config.max_transactions_per_run,
                    'learning_enabled': self.config.learning_enabled
                },
                'last_update': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"処理統計取得エラー: {e}")
            return {
                'error': str(e),
                'processing_stats': self.processing_stats,
                'last_update': datetime.utcnow().isoformat()
            }
    
    async def health_check(self) -> Dict[str, Any]:
        """ヘルスチェック実行
        
        Returns:
            ヘルスチェック結果
        """
        try:
            health_status = {
                'overall_status': 'healthy',
                'components': {},
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # MFクラウド接続チェック
            try:
                mf_connected = await self.mfcloud_service.connect()
                health_status['components']['mf_cloud'] = {
                    'status': 'healthy' if mf_connected else 'unhealthy',
                    'message': '接続成功' if mf_connected else '接続失敗'
                }
            except Exception as e:
                health_status['components']['mf_cloud'] = {
                    'status': 'unhealthy',
                    'message': f'接続エラー: {str(e)}'
                }
            
            # AI Service チェック
            try:
                ai_stats = await self.ai_service.get_learning_statistics()
                health_status['components']['ai_service'] = {
                    'status': 'healthy',
                    'message': f'学習サンプル数: {ai_stats.get("total_learning_samples", 0)}'
                }
            except Exception as e:
                health_status['components']['ai_service'] = {
                    'status': 'unhealthy',
                    'message': f'AIサービスエラー: {str(e)}'
                }
            
            # データベース接続チェック
            try:
                transaction_repo = get_transaction_repository(self.session)
                await transaction_repo.count()
                health_status['components']['database'] = {
                    'status': 'healthy',
                    'message': 'データベース接続正常'
                }
            except Exception as e:
                health_status['components']['database'] = {
                    'status': 'unhealthy',
                    'message': f'データベースエラー: {str(e)}'
                }
            
            # 全体ステータス判定
            unhealthy_components = [
                comp for comp in health_status['components'].values()
                if comp['status'] == 'unhealthy'
            ]
            
            if unhealthy_components:
                health_status['overall_status'] = 'degraded' if len(unhealthy_components) == 1 else 'unhealthy'
            
            return health_status
            
        except Exception as e:
            return {
                'overall_status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }