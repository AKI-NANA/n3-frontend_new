#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
data_service.py - データ処理サービス（統一APIレスポンス対応版）

✅ 修正内容:
- APIレスポンス形式を完全統一: {"status": "success/error", "message": "", "data": {}, "timestamp": ""}
- 統一例外クラス使用
- PostgreSQL対応
- ログ記録の標準化
- パフォーマンス最適化
- エラーハンドリング強化

このモジュールは、取引データのインポート、エクスポート、変換を担当します。
CSV形式の異なるデータセット間の変換や、トランザクションデータの一括処理を提供します。
"""

import csv
import io
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Union, BinaryIO, TextIO

import pandas as pd
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from database.repositories import (
    get_transaction_repository,
    get_journal_entry_repository,
    get_rule_repository,
    get_activity_log_repository
)
from services.csv_converter import CSVConverter
from core.exceptions import EmverzeException, ValidationException, BusinessLogicException
from utils.logger import setup_logger, log_to_jsonl
from utils.config import settings

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

class DataService:
    """データ処理サービス（統一版）"""
    
    def __init__(self, session: AsyncSession):
        """初期化
        
        Args:
            session: SQLAlchemy非同期セッション
        """
        try:
            self.session = session
            self.csv_converter = CSVConverter()
            
            # 一時ファイル保存ディレクトリ
            self.temp_dir = Path(getattr(settings, 'TEMP_DIR', './temp'))
            if not self.temp_dir.exists():
                self.temp_dir.mkdir(parents=True, exist_ok=True)
            
            logger.info("DataService初期化完了", {
                "temp_dir": str(self.temp_dir)
            })
            
        except Exception as e:
            logger.error("DataService初期化エラー", {
                "error": str(e)
            })
            raise EmverzeException(f"DataServiceの初期化に失敗しました: {e}")
    
    async def import_transactions_from_csv(
        self, 
        file: UploadFile,
        auto_process: bool = False,
        user: Optional[str] = None
    ) -> dict:
        """CSVファイルから取引データをインポート（統一APIレスポンス対応）
        
        Args:
            file: アップロードされたCSVファイル
            auto_process: 自動処理フラグ
            user: 実行ユーザー名
            
        Returns:
            統一APIレスポンス形式
        """
        temp_file_path = None
        
        try:
            # パラメータバリデーション
            if not file:
                return create_api_response(
                    "error",
                    "アップロードファイルが指定されていません",
                    {"error_type": "no_file"}
                )
            
            if not file.filename or not file.filename.endswith('.csv'):
                return create_api_response(
                    "error",
                    "CSVファイルを選択してください",
                    {"error_type": "invalid_file_type", "filename": file.filename}
                )
            
            # リポジトリの取得
            transaction_repo = get_transaction_repository(self.session)
            activity_repo = get_activity_log_repository(self.session)
            
            # 一時ファイルに保存
            temp_file_path = self.temp_dir / f"import_{uuid.uuid4()}.csv"
            
            with open(temp_file_path, "wb") as temp_file:
                content = await file.read()
                if len(content) == 0:
                    return create_api_response(
                        "error",
                        "空のファイルです",
                        {"error_type": "empty_file"}
                    )
                temp_file.write(content)
            
            # CSVフォーマットの検出
            csv_format = self.csv_converter.detect_csv_format(str(temp_file_path))
            logger.info(f"CSVフォーマット検出: {csv_format}")
            
            if not csv_format or csv_format == 'unknown':
                return create_api_response(
                    "error",
                    "サポートされていないCSVフォーマットです",
                    {"detected_format": csv_format}
                )
            
            # 標準化されたデータフレームに変換
            df = self.csv_converter.read_csv_to_dataframe(str(temp_file_path))
            
            if df.empty:
                return create_api_response(
                    "error",
                    "CSVファイルにデータが含まれていません",
                    {"row_count": 0}
                )
            
            logger.info(f"CSV読み込み完了: {len(df)}行")
            
            # データ正規化と変換
            success_count = 0
            error_count = 0
            duplicate_count = 0
            processed_count = 0
            transaction_ids = []
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # 取引データ正規化
                    transaction_data = self._normalize_transaction_row(row, user)
                    
                    # 重複チェック
                    existing_transaction = await transaction_repo.find_by_external_reference(
                        transaction_data.get("external_id") or transaction_data.get("description")
                    )
                    
                    if existing_transaction:
                        duplicate_count += 1
                        continue
                    
                    # 取引データ作成
                    created_transaction = await transaction_repo.create(transaction_data)
                    transaction_ids.append(created_transaction.id)
                    success_count += 1
                    
                    # 自動処理フラグが有効な場合
                    if auto_process:
                        # ここで自動処理ロジックを実行
                        # (ルール適用、AI推論など)
                        processed_count += 1
                    
                except ValidationException as e:
                    error_count += 1
                    errors.append({
                        "row": index + 1,
                        "error": str(e),
                        "data": row.to_dict()
                    })
                    
                except Exception as e:
                    error_count += 1
                    errors.append({
                        "row": index + 1,
                        "error": f"予期しないエラー: {str(e)}",
                        "data": row.to_dict()
                    })
            
            # セッションコミット
            await self.session.commit()
            
            # アクティビティログ記録
            await activity_repo.log_activity(
                activity_type="csv_import",
                description=f"CSV取引データインポート: 成功={success_count}件, エラー={error_count}件, 重複={duplicate_count}件",
                user=user,
                data={
                    "file_name": file.filename,
                    "csv_format": csv_format,
                    "total_rows": len(df),
                    "success_count": success_count,
                    "error_count": error_count,
                    "duplicate_count": duplicate_count,
                    "auto_process": auto_process
                }
            )
            
            # 結果判定
            total_count = len(df)
            if error_count == 0:
                status = "success"
                message = f"CSVインポートが完了しました。処理件数: {success_count}件"
            elif success_count > 0:
                status = "success"
                message = f"CSVインポートが部分的に完了しました。成功: {success_count}件、エラー: {error_count}件"
            else:
                status = "error"
                message = "CSVインポートに失敗しました。全ての行でエラーが発生しています"
            
            logger.info(f"CSV インポート完了: 成功={success_count}, エラー={error_count}, 重複={duplicate_count}")
            
            return create_api_response(
                status,
                message,
                {
                    "summary": {
                        "total_count": total_count,
                        "success_count": success_count,
                        "error_count": error_count,
                        "duplicate_count": duplicate_count,
                        "processed_count": processed_count
                    },
                    "transaction_ids": transaction_ids,
                    "csv_format": csv_format,
                    "file_name": file.filename,
                    "errors": errors[:10]  # 最初の10件のエラーのみ
                }
            )
            
        except EmverzeException as e:
            await self.session.rollback()
            logger.error("CSV インポートエラー", {
                "error": str(e),
                "file_name": file.filename if file else None
            })
            
            return create_api_response(
                "error",
                f"CSVインポート処理に失敗しました: {e}",
                {"error_category": e.category if hasattr(e, 'category') else 'unknown'}
            )
            
        except Exception as e:
            await self.session.rollback()
            logger.error("CSV インポート予期しないエラー", {
                "error": str(e),
                "file_name": file.filename if file else None
            })
            
            return create_api_response(
                "error",
                "予期しないエラーが発生しました",
                {"error_type": "unexpected_error"}
            )
            
        finally:
            # 一時ファイルの削除
            if temp_file_path and temp_file_path.exists():
                try:
                    temp_file_path.unlink()
                except Exception as e:
                    logger.warning(f"一時ファイル削除エラー: {e}")
    
    async def export_transactions_to_csv(
        self,
        filters: Optional[Dict[str, Any]] = None,
        target_format: str = "journal",
        user: Optional[str] = None
    ) -> dict:
        """取引データをCSV形式でエクスポート（統一APIレスポンス対応）
        
        Args:
            filters: フィルター条件
            target_format: 出力形式 ("journal", "mf_cloud")
            user: 実行ユーザー名
            
        Returns:
            統一APIレスポンス形式
        """
        try:
            # リポジトリ取得
            transaction_repo = get_transaction_repository(self.session)
            activity_repo = get_activity_log_repository(self.session)
            
            # フィルター適用でデータ取得
            transactions = await transaction_repo.find_all_with_filters(filters or {})
            
            if not transactions:
                return create_api_response(
                    "error",
                    "エクスポートする取引データが見つかりません",
                    {"filter_applied": filters, "result_count": 0}
                )
            
            # CSV変換
            csv_data = self._convert_transactions_to_csv(transactions, target_format)
            
            # ファイル名生成
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"transactions_{target_format}_{timestamp}.csv"
            
            # アクティビティログ記録
            await activity_repo.log_activity(
                activity_type="csv_export",
                description=f"取引データCSVエクスポート: {len(transactions)}件 ({target_format}形式)",
                user=user,
                data={
                    "export_format": target_format,
                    "transaction_count": len(transactions),
                    "filters": filters,
                    "filename": filename
                }
            )
            
            logger.info(f"CSV エクスポート完了: {len(transactions)}件 ({target_format}形式)")
            
            return create_api_response(
                "success",
                f"CSV エクスポートが完了しました。{len(transactions)}件のデータを出力しました",
                {
                    "filename": filename,
                    "csv_content": csv_data,
                    "export_format": target_format,
                    "transaction_count": len(transactions),
                    "file_size": len(csv_data.encode('utf-8'))
                }
            )
            
        except Exception as e:
            logger.error("CSV エクスポートエラー", {
                "error": str(e),
                "filters": filters,
                "target_format": target_format
            })
            
            return create_api_response(
                "error",
                f"CSV エクスポートに失敗しました: {e}",
                {"error_type": "export_error"}
            )
    
    async def import_rules_from_csv(
        self,
        file: UploadFile,
        creator: Optional[str] = None
    ) -> dict:
        """CSVファイルからルールデータをインポート（統一APIレスポンス対応）
        
        Args:
            file: アップロードされたCSVファイル
            creator: 作成者
            
        Returns:
            統一APIレスポンス形式
        """
        temp_file_path = None
        
        try:
            # パラメータバリデーション
            if not file or not file.filename or not file.filename.endswith('.csv'):
                return create_api_response(
                    "error",
                    "有効なCSVファイルを選択してください",
                    {"error_type": "invalid_file"}
                )
            
            # リポジトリ取得
            rule_repo = get_rule_repository(self.session)
            activity_repo = get_activity_log_repository(self.session)
            
            # 一時ファイル保存
            temp_file_path = self.temp_dir / f"rules_import_{uuid.uuid4()}.csv"
            
            with open(temp_file_path, "wb") as temp_file:
                content = await file.read()
                temp_file.write(content)
            
            # CSV読み込み
            df = pd.read_csv(temp_file_path, encoding='utf-8')
            
            if df.empty:
                return create_api_response(
                    "error",
                    "CSVファイルにデータが含まれていません",
                    {"row_count": 0}
                )
            
            # データ処理
            success_count = 0
            error_count = 0
            duplicate_count = 0
            rule_ids = []
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # ルールデータ正規化
                    rule_data = self._normalize_rule_row(row, creator)
                    
                    # 重複チェック
                    existing_rule = await rule_repo.find_by_keyword(rule_data["keyword"])
                    if existing_rule:
                        duplicate_count += 1
                        continue
                    
                    # ルール作成
                    created_rule = await rule_repo.create(rule_data)
                    rule_ids.append(created_rule.id)
                    success_count += 1
                    
                except ValidationException as e:
                    error_count += 1
                    errors.append({
                        "row": index + 1,
                        "error": str(e),
                        "data": row.to_dict()
                    })
                    
                except Exception as e:
                    error_count += 1
                    errors.append({
                        "row": index + 1,
                        "error": f"予期しないエラー: {str(e)}",
                        "data": row.to_dict()
                    })
            
            # セッションコミット
            await self.session.commit()
            
            # アクティビティログ記録
            await activity_repo.log_activity(
                activity_type="rules_import",
                description=f"ルールCSVインポート: 成功={success_count}件, エラー={error_count}件, 重複={duplicate_count}件",
                user=creator,
                data={
                    "file_name": file.filename,
                    "total_rows": len(df),
                    "success_count": success_count,
                    "error_count": error_count,
                    "duplicate_count": duplicate_count
                }
            )
            
            # 結果判定
            if error_count == 0:
                status = "success"
                message = f"ルールインポートが完了しました。処理件数: {success_count}件"
            elif success_count > 0:
                status = "success"  
                message = f"ルールインポートが部分的に完了しました。成功: {success_count}件、エラー: {error_count}件"
            else:
                status = "error"
                message = "ルールインポートに失敗しました"
            
            return create_api_response(
                status,
                message,
                {
                    "summary": {
                        "total_count": len(df),
                        "success_count": success_count,
                        "error_count": error_count,
                        "duplicate_count": duplicate_count
                    },
                    "rule_ids": rule_ids,
                    "file_name": file.filename,
                    "errors": errors[:10]
                }
            )
            
        except Exception as e:
            await self.session.rollback()
            logger.error("ルール インポートエラー", {
                "error": str(e),
                "file_name": file.filename if file else None
            })
            
            return create_api_response(
                "error",
                f"ルールインポート処理に失敗しました: {e}",
                {"error_type": "import_error"}
            )
            
        finally:
            if temp_file_path and temp_file_path.exists():
                try:
                    temp_file_path.unlink()
                except Exception as e:
                    logger.warning(f"一時ファイル削除エラー: {e}")
    
    async def convert_csv_format(
        self, 
        file: UploadFile,
        target_format: str = "mf_cloud"
    ) -> dict:
        """CSVファイルのフォーマットを変換（統一APIレスポンス対応）
        
        Args:
            file: アップロードされたCSVファイル
            target_format: 変換先形式（"journal" または "mf_cloud"）
            
        Returns:
            統一APIレスポンス形式
        """
        temp_file_path = None
        output_file_path = None
        
        try:
            # パラメータバリデーション
            if target_format not in ["journal", "mf_cloud"]:
                return create_api_response(
                    "error",
                    "サポートされていない変換形式です",
                    {"supported_formats": ["journal", "mf_cloud"], "requested_format": target_format}
                )
            
            # 一時ファイルに保存
            temp_file_path = self.temp_dir / f"convert_{uuid.uuid4()}.csv"
            output_file_path = self.temp_dir / f"converted_{uuid.uuid4()}.csv"
            
            with open(temp_file_path, "wb") as temp_file:
                content = await file.read()
                temp_file.write(content)
            
            # CSVフォーマットの検出
            csv_format = self.csv_converter.detect_csv_format(str(temp_file_path))
            
            if not csv_format or csv_format == 'unknown':
                return create_api_response(
                    "error",
                    "変換元のCSVフォーマットを識別できませんでした",
                    {"detected_format": csv_format}
                )
            
            # CSVファイルの変換
            self.csv_converter.convert_csv_file(
                str(temp_file_path),
                str(output_file_path),
                target_format
            )
            
            # 変換後のファイル読み込み
            with open(output_file_path, "r", encoding="utf-8") as f:
                csv_content = f.read()
            
            # ファイル名の生成
            original_name = file.filename or "unknown.csv"
            name_parts = original_name.rsplit(".", 1)
            converted_filename = f"{name_parts[0]}_{target_format}.csv"
            
            logger.info(f"CSV 変換完了: {csv_format} → {target_format}")
            
            return create_api_response(
                "success",
                f"CSVフォーマット変換が完了しました ({csv_format} → {target_format})",
                {
                    "original_filename": file.filename,
                    "converted_filename": converted_filename,
                    "source_format": csv_format,
                    "target_format": target_format,
                    "csv_content": csv_content,
                    "file_size": len(csv_content.encode('utf-8'))
                }
            )
            
        except Exception as e:
            logger.error("CSV 変換エラー", {
                "error": str(e),
                "file_name": file.filename if file else None,
                "target_format": target_format
            })
            
            return create_api_response(
                "error",
                f"CSV変換処理に失敗しました: {e}",
                {"error_type": "conversion_error"}
            )
            
        finally:
            # 一時ファイルの削除
            for path in [temp_file_path, output_file_path]:
                if path and path.exists():
                    try:
                        path.unlink()
                    except Exception as e:
                        logger.warning(f"一時ファイル削除エラー: {e}")
    
    async def create_backup(self, include_transactions: bool = True) -> dict:
        """データのバックアップを作成（統一APIレスポンス対応）
        
        Args:
            include_transactions: 取引データ含めるフラグ
            
        Returns:
            統一APIレスポンス形式
        """
        try:
            # リポジトリ取得
            rule_repo = get_rule_repository(self.session)
            transaction_repo = get_transaction_repository(self.session)
            journal_repo = get_journal_entry_repository(self.session)
            activity_repo = get_activity_log_repository(self.session)
            
            # バックアップデータ収集
            backup_data = {
                "backup_info": {
                    "created_at": datetime.utcnow().isoformat(),
                    "version": "1.0",
                    "include_transactions": include_transactions
                },
                "rules": [],
                "transactions": [],
                "journal_entries": []
            }
            
            # ルールデータ取得
            rules = await rule_repo.find_all()
            backup_data["rules"] = [rule.to_dict() for rule in rules]
            
            # 取引データ取得（フラグに応じて）
            if include_transactions:
                transactions = await transaction_repo.find_all()
                backup_data["transactions"] = [trans.to_dict() for trans in transactions]
                
                journal_entries = await journal_repo.find_all()
                backup_data["journal_entries"] = [entry.to_dict() for entry in journal_entries]
            
            # JSONバックアップ作成
            backup_json = json.dumps(backup_data, ensure_ascii=False, indent=2)
            backup_bytes = backup_json.encode('utf-8')
            
            # ファイル名生成
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"backup_{timestamp}.json"
            
            # アクティビティログ記録
            await activity_repo.log_activity(
                activity_type="create_backup",
                description=f"データバックアップ作成: ルール={len(backup_data['rules'])}件, 取引={len(backup_data['transactions'])}件",
                data={
                    "filename": filename,
                    "include_transactions": include_transactions,
                    "backup_size": len(backup_bytes)
                }
            )
            
            logger.info(f"バックアップ作成完了: {filename}")
            
            return create_api_response(
                "success",
                "データバックアップを作成しました",
                {
                    "filename": filename,
                    "backup_content": backup_json,
                    "backup_size": len(backup_bytes),
                    "summary": {
                        "rules_count": len(backup_data["rules"]),
                        "transactions_count": len(backup_data["transactions"]),
                        "journal_entries_count": len(backup_data["journal_entries"])
                    }
                }
            )
            
        except Exception as e:
            logger.error("バックアップ作成エラー", {
                "error": str(e),
                "include_transactions": include_transactions
            })
            
            return create_api_response(
                "error",
                f"バックアップ作成に失敗しました: {e}",
                {"error_type": "backup_error"}
            )
    
    # プライベートメソッド
    def _normalize_transaction_row(self, row: pd.Series, user: Optional[str] = None) -> Dict[str, Any]:
        """取引データ行を正規化"""
        try:
            # 必須項目チェック
            if pd.isna(row.get("transaction_date")) or pd.isna(row.get("amount")):
                raise ValidationException("取引日と金額は必須です")
            
            # 日付変換
            transaction_date = self.csv_converter.parse_date(row["transaction_date"])
            
            # 金額変換
            amount = float(row["amount"]) if not pd.isna(row["amount"]) else 0.0
            
            return {
                "external_id": str(row.get("id", uuid.uuid4())),
                "transaction_date": transaction_date,
                "amount": amount,
                "description": str(row.get("description", "")),
                "partner_name": str(row.get("partner_name", "")),
                "debit_account": str(row.get("debit_account", "")),
                "credit_account": str(row.get("credit_account", "")),
                "status": "pending",
                "imported_by": user,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
        except Exception as e:
            raise ValidationException(f"取引データの正規化に失敗しました: {e}")
    
    def _normalize_rule_row(self, row: pd.Series, creator: Optional[str] = None) -> Dict[str, Any]:
        """ルールデータ行を正規化"""
        try:
            # 必須項目の確認
            if pd.isna(row.get("keyword")) or pd.isna(row.get("debit")) or pd.isna(row.get("credit")):
                raise ValidationException("キーワード、借方、貸方は必須です")
            
            # 期間の処理
            period_start = None
            period_end = None
            
            if not pd.isna(row.get("period_start")):
                period_start = self.csv_converter.parse_date(row["period_start"])
            
            if not pd.isna(row.get("period_end")):
                period_end = self.csv_converter.parse_date(row["period_end"])
            
            # 優先度とヒット数の処理
            priority = int(row.get("priority", 0)) if not pd.isna(row.get("priority")) else 0
            hits = int(row.get("hits", 0)) if not pd.isna(row.get("hits")) else 0
            
            # 有効フラグの処理
            is_active = True
            if not pd.isna(row.get("is_active")):
                is_active_str = str(row["is_active"]).lower()
                is_active = is_active_str in ["true", "1", "yes", "y", "t"]
            
            return {
                "id": str(row.get("id", uuid.uuid4())),
                "keyword": str(row["keyword"]),
                "debit": str(row["debit"]),
                "credit": str(row["credit"]),
                "description": str(row.get("description", "")),
                "period_start": period_start,
                "period_end": period_end,
                "is_active": is_active,
                "priority": priority,
                "hits": hits,
                "creator": creator,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
        except Exception as e:
            raise ValidationException(f"ルールデータの正規化に失敗しました: {e}")
    
    def _convert_transactions_to_csv(self, transactions: List, target_format: str) -> str:
        """取引データをCSV形式に変換"""
        try:
            output = io.StringIO()
            
            if target_format == "journal":
                # 仕訳帳形式
                fieldnames = [
                    "取引番号", "取引日", "借方勘定科目", "借方補助科目", "借方金額(円)",
                    "貸方勘定科目", "貸方補助科目", "貸方金額(円)", "摘要", "メモ"
                ]
            else:  # mf_cloud
                # MFクラウド形式
                fieldnames = [
                    "取引No", "取引日", "借方勘定科目", "借方補助科目", "借方部門", "借方金額(円)",
                    "貸方勘定科目", "貸方補助科目", "貸方部門", "貸方金額(円)", "摘要", "仕訳メモ",
                    "決算整理仕訳", "タグ"
                ]
            
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            
            for transaction in transactions:
                if target_format == "journal":
                    row = {
                        "取引番号": transaction.external_id or transaction.id,
                        "取引日": transaction.transaction_date.strftime("%Y/%m/%d"),
                        "借方勘定科目": transaction.debit_account,
                        "借方補助科目": "",
                        "借方金額(円)": int(transaction.amount),
                        "貸方勘定科目": transaction.credit_account,
                        "貸方補助科目": "",
                        "貸方金額(円)": int(transaction.amount),
                        "摘要": transaction.description,
                        "メモ": ""
                    }
                else:  # mf_cloud
                    row = {
                        "取引No": transaction.external_id or transaction.id,
                        "取引日": transaction.transaction_date.strftime("%Y-%m-%d"),
                        "借方勘定科目": transaction.debit_account,
                        "借方補助科目": "",
                        "借方部門": "",
                        "借方金額(円)": int(transaction.amount),
                        "貸方勘定科目": transaction.credit_account,
                        "貸方補助科目": "",
                        "貸方部門": "",
                        "貸方金額(円)": int(transaction.amount),
                        "摘要": transaction.description,
                        "仕訳メモ": "",
                        "決算整理仕訳": "0",
                        "タグ": ""
                    }
                
                writer.writerow(row)
            
            return output.getvalue()
            
        except Exception as e:
            raise EmverzeException(f"CSV変換エラー: {e}")


# 統一インターフェース関数（後方互換性）
async def import_transactions_csv(session: AsyncSession, file: UploadFile, auto_process: bool = False, user: str = None) -> dict:
    """取引データCSVインポート（統一関数）"""
    service = DataService(session)
    return await service.import_transactions_from_csv(file, auto_process, user)

async def export_transactions_csv(session: AsyncSession, filters: dict = None, target_format: str = "journal", user: str = None) -> dict:
    """取引データCSVエクスポート（統一関数）"""
    service = DataService(session)
    return await service.export_transactions_to_csv(filters, target_format, user)

async def import_rules_csv(session: AsyncSession, file: UploadFile, creator: str = None) -> dict:
    """ルールCSVインポート（統一関数）"""
    service = DataService(session)
    return await service.import_rules_from_csv(file, creator)

async def convert_csv_format_file(session: AsyncSession, file: UploadFile, target_format: str = "mf_cloud") -> dict:
    """CSVフォーマット変換（統一関数）"""
    service = DataService(session)
    return await service.convert_csv_format(file, target_format)

async def create_data_backup(session: AsyncSession, include_transactions: bool = True) -> dict:
    """データバックアップ作成（統一関数）"""
    service = DataService(session)
    return await service.create_backup(include_transactions)
