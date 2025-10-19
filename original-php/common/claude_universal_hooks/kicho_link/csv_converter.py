#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
csv_converter.py - CSV形式変換ユーティリティ

このモジュールは、異なるCSV形式間の変換機能を提供します。
主に仕訳帳データとマネーフォワードクラウドインポート形式の相互変換を担当します。
"""

import csv
import io
import re
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple, Union, TextIO

import pandas as pd

from utils.logger import setup_logger

# ロガー設定
logger = setup_logger()

class CSVConverter:
    """CSV形式変換クラス"""
    
    # 基本的なカラムマッピング定義
    JOURNAL_COLUMNS = {
        "transaction_id": ["取引番号", "取引No", "取引ID", "番号"],
        "transaction_date": ["取引日", "日付", "取引日付", "Date"],
        "debit_account": ["借方勘定科目", "借方科目", "借方"],
        "debit_sub_account": ["借方補助科目", "借方補助"],
        "debit_department": ["借方部門", "借方部"],
        "debit_partner": ["借方取引先", "借方取"],
        "debit_tax_type": ["借方税区分", "借方税"],
        "debit_invoice": ["借方インボイス", "借方請求書"],
        "debit_amount": ["借方金額(円)", "借方金額", "借方金"],
        "debit_tax": ["借方税額", "借方消費税"],
        "credit_account": ["貸方勘定科目", "貸方科目", "貸方"],
        "credit_sub_account": ["貸方補助科目", "貸方補助"],
        "credit_department": ["貸方部門", "貸方部"],
        "credit_partner": ["貸方取引先", "貸方取"],
        "credit_tax_type": ["貸方税区分", "貸方税"],
        "credit_invoice": ["貸方インボイス", "貸方請求書"],
        "credit_amount": ["貸方金額(円)", "貸方金額", "貸方金"],
        "credit_tax": ["貸方税額", "貸方消費税"],
        "description": ["摘要", "内容", "説明", "Description"],
        "memo": ["メモ", "備考", "注記"],
        "tag": ["タグ", "タグ名"],
        "mf_status": ["MF状態", "MFステータス", "連携状態"]
    }
    
    # マネーフォワードクラウド固有のカラム
    MF_CLOUD_COLUMNS = {
        "mf_journal_type": ["MF仕訳タイプ", "仕訳タイプ"],
        "adjusting_entry": ["決算整理仕訳", "決算仕訳"],
        "receipt_status": ["証憑", "領収書"],
        "created_at": ["作成日", "作成日時"],
        "created_by": ["作成者"],
        "updated_at": ["最終更新日", "更新日時"],
        "updated_by": ["最終更新者", "更新者"]
    }
    
    def __init__(self):
        """初期化"""
        # 文字コード検出用マッピング（日本語文字コード対応）
        self.encoding_candidates = ['utf-8', 'utf-8-sig', 'cp932', 'shift_jis', 'euc_jp', 'iso2022_jp']
    
    def detect_encoding(self, file_path: str) -> str:
        """CSVファイルの文字コードを検出
        
        Args:
            file_path: CSVファイルパス
            
        Returns:
            検出した文字コード
            
        Raises:
            ValueError: 文字コードを検出できない場合
        """
        for encoding in self.encoding_candidates:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    f.read()
                return encoding
            except UnicodeDecodeError:
                continue
        
        raise ValueError(f"文字コードを検出できませんでした: {file_path}")
    
    def detect_column_mapping(self, headers: List[str]) -> Dict[str, str]:
        """CSVヘッダーから標準カラム名へのマッピングを検出
        
        Args:
            headers: CSVヘッダー行
            
        Returns:
            {標準カラム名: CSVヘッダー名} の辞書
        """
        mapping = {}
        
        # 全てのカラムマッピングをマージ
        all_columns = {**self.JOURNAL_COLUMNS, **self.MF_CLOUD_COLUMNS}
        
        # 各標準カラムについて、存在するヘッダーを探す
        for std_col, candidates in all_columns.items():
            for candidate in candidates:
                if candidate in headers:
                    mapping[std_col] = candidate
                    break
        
        return mapping
    
    def is_mf_cloud_format(self, headers: List[str]) -> bool:
        """マネーフォワードクラウド形式かどうかを判定
        
        Args:
            headers: CSVヘッダー行
            
        Returns:
            マネーフォワードクラウド形式の場合はTrue
        """
        # MFクラウド固有カラムの存在をチェック
        mf_specific_columns = 0
        for column_candidates in self.MF_CLOUD_COLUMNS.values():
            for candidate in column_candidates:
                if candidate in headers:
                    mf_specific_columns += 1
                    break
        
        # 一定数以上のMF固有カラムがあればMFクラウド形式と判定
        return mf_specific_columns >= 2
    
    def read_csv_to_dataframe(self, file_path: str) -> pd.DataFrame:
        """CSVファイルをDataFrameとして読み込み
        
        Args:
            file_path: CSVファイルパス
            
        Returns:
            読み込んだDataFrame
            
        Raises:
            ValueError: ファイル読み込みエラー
        """
        try:
            # 文字コード検出
            encoding = self.detect_encoding(file_path)
            
            # CSVファイル読み込み
            df = pd.read_csv(file_path, encoding=encoding)
            
            # カラム名の空白除去
            df.columns = [col.strip() if isinstance(col, str) else col for col in df.columns]
            
            return df
            
        except Exception as e:
            logger.error(f"CSVファイル読み込みエラー: {e}")
            raise ValueError(f"CSVファイルの読み込みに失敗しました: {e}")
    
    def convert_to_standard_format(self, df: pd.DataFrame) -> pd.DataFrame:
        """CSVデータを標準形式に変換
        
        Args:
            df: 入力DataFrame
            
        Returns:
            標準形式に変換したDataFrame
        """
        # カラムマッピングの検出
        mapping = self.detect_column_mapping(df.columns.tolist())
        
        # マッピングの逆引き辞書作成（標準カラム名 -> CSV上のカラム名）
        reverse_mapping = {std_col: csv_col for std_col, csv_col in mapping.items()}
        
        # 新しいDataFrameを作成
        std_df = pd.DataFrame()
        
        # 標準カラムごとに変換
        for std_col, csv_col in reverse_mapping.items():
            if csv_col in df.columns:
                std_df[std_col] = df[csv_col]
        
        return std_df
    
    def convert_to_mf_cloud_format(self, df: pd.DataFrame) -> pd.DataFrame:
        """標準形式からマネーフォワードクラウド形式に変換
        
        Args:
            df: 標準形式のDataFrame
            
        Returns:
            マネーフォワードクラウド形式のDataFrame
        """
        # MFクラウド形式のデータフレーム作成
        mf_df = pd.DataFrame()
        
        # 必須項目のマッピング
        required_columns = {
            "transaction_id": "取引No",
            "transaction_date": "取引日",
            "debit_account": "借方勘定科目",
            "debit_sub_account": "借方補助科目",
            "debit_department": "借方部門",
            "debit_partner": "借方取引先",
            "debit_tax_type": "借方税区分",
            "debit_invoice": "借方インボイス",
            "debit_amount": "借方金額(円)",
            "debit_tax": "借方税額",
            "credit_account": "貸方勘定科目",
            "credit_sub_account": "貸方補助科目",
            "credit_department": "貸方部門",
            "credit_partner": "貸方取引先",
            "credit_tax_type": "貸方税区分",
            "credit_invoice": "貸方インボイス",
            "credit_amount": "貸方金額(円)",
            "credit_tax": "貸方税額",
            "description": "摘要",
            "memo": "仕訳メモ",
            "tag": "タグ",
            "mf_journal_type": "MF仕訳タイプ",
            "adjusting_entry": "決算整理仕訳"
        }
        
        # カラムをマッピングしながらコピー
        for std_col, mf_col in required_columns.items():
            if std_col in df.columns:
                mf_df[mf_col] = df[std_col]
            else:
                # 必須項目が無い場合は空列を追加
                mf_df[mf_col] = ""
        
        # 日付形式の標準化
        if "取引日" in mf_df.columns:
            mf_df["取引日"] = pd.to_datetime(mf_df["取引日"], errors='coerce').dt.strftime('%Y/%m/%d')
        
        # デフォルト値の設定
        if "借方税区分" in mf_df.columns and mf_df["借方税区分"].isna().all():
            mf_df["借方税区分"] = "対象外"
            
        if "貸方税区分" in mf_df.columns and mf_df["貸方税区分"].isna().all():
            mf_df["貸方税区分"] = "対象外"
            
        if "決算整理仕訳" in mf_df.columns and mf_df["決算整理仕訳"].isna().all():
            mf_df["決算整理仕訳"] = "0"
        
        return mf_df
    
    def convert_to_journal_format(self, df: pd.DataFrame) -> pd.DataFrame:
        """標準形式から仕訳帳形式に変換
        
        Args:
            df: 標準形式のDataFrame
            
        Returns:
            仕訳帳形式のDataFrame
        """
        # 仕訳帳形式のデータフレーム作成
        journal_df = pd.DataFrame()
        
        # 必須項目のマッピング
        required_columns = {
            "transaction_id": "取引番号",
            "transaction_date": "取引日",
            "debit_account": "借方勘定科目",
            "debit_sub_account": "借方補助科目",
            "debit_department": "借方部門",
            "debit_partner": "借方取引先",
            "debit_tax_type": "借方税区分",
            "debit_invoice": "借方インボイス",
            "debit_amount": "借方金額(円)",
            "credit_account": "貸方勘定科目",
            "credit_sub_account": "貸方補助科目",
            "credit_department": "貸方部門",
            "credit_partner": "貸方取引先",
            "credit_tax_type": "貸方税区分",
            "credit_invoice": "貸方インボイス",
            "credit_amount": "貸方金額(円)",
            "description": "摘要",
            "tag": "タグ",
            "memo": "メモ",
            "mf_status": "MF状態"
        }
        
        # カラムをマッピングしながらコピー
        for std_col, journal_col in required_columns.items():
            if std_col in df.columns:
                journal_df[journal_col] = df[std_col]
            else:
                # 必須項目が無い場合は空列を追加
                journal_df[journal_col] = ""
        
        # 日付形式の標準化
        if "取引日" in journal_df.columns:
            journal_df["取引日"] = pd.to_datetime(journal_df["取引日"], errors='coerce').dt.strftime('%Y/%m/%d')
        
        return journal_df
    
    def convert_csv_file(
        self, 
        input_file: str, 
        output_file: str, 
        target_format: str = "mf_cloud"
    ) -> str:
        """CSVファイルを変換して保存
        
        Args:
            input_file: 入力CSVファイルパス
            output_file: 出力CSVファイルパス
            target_format: 変換先形式（"mf_cloud"または"journal"）
            
        Returns:
            出力ファイルパス
            
        Raises:
            ValueError: 変換エラー
        """
        try:
            # CSVファイル読み込み
            df = self.read_csv_to_dataframe(input_file)
            
            # 標準形式に変換
            std_df = self.convert_to_standard_format(df)
            
            # 指定された形式に変換
            if target_format == "mf_cloud":
                output_df = self.convert_to_mf_cloud_format(std_df)
            elif target_format == "journal":
                output_df = self.convert_to_journal_format(std_df)
            else:
                raise ValueError(f"未サポートの変換形式: {target_format}")
            
            # CSVファイルとして保存
            output_df.to_csv(output_file, index=False, encoding='utf-8-sig')
            
            logger.info(f"CSV変換完了: {input_file} -> {output_file} ({target_format}形式)")
            
            return output_file
            
        except Exception as e:
            logger.error(f"CSV変換エラー: {e}")
            raise ValueError(f"CSVファイルの変換に失敗しました: {e}")
    
    def convert_csv_content(
        self, 
        content: str, 
        target_format: str = "mf_cloud"
    ) -> str:
        """CSV文字列を変換して文字列として返す
        
        Args:
            content: 入力CSV文字列
            target_format: 変換先形式（"mf_cloud"または"journal"）
            
        Returns:
            変換後のCSV文字列
            
        Raises:
            ValueError: 変換エラー
        """
        try:
            # CSVデータをDataFrameに読み込み
            df = pd.read_csv(io.StringIO(content))
            
            # 標準形式に変換
            std_df = self.convert_to_standard_format(df)
            
            # 指定された形式に変換
            if target_format == "mf_cloud":
                output_df = self.convert_to_mf_cloud_format(std_df)
            elif target_format == "journal":
                output_df = self.convert_to_journal_format(std_df)
            else:
                raise ValueError(f"未サポートの変換形式: {target_format}")
            
            # 文字列として出力
            output = io.StringIO()
            output_df.to_csv(output, index=False, encoding='utf-8')
            
            logger.info(f"CSV文字列変換完了 ({target_format}形式)")
            
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"CSV文字列変換エラー: {e}")
            raise ValueError(f"CSV文字列の変換に失敗しました: {e}")

    def parse_date(self, date_str: str) -> datetime:
        """日付文字列をdatetimeオブジェクトに変換
        
        Args:
            date_str: 日付文字列
            
        Returns:
            datetime
            
        Raises:
            ValueError: 日付解析エラー
        """
        # 日付フォーマットのリスト
        date_formats = [
            "%Y/%m/%d",
            "%Y-%m-%d",
            "%Y年%m月%d日",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%Y/%m/%d %H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        # すべてのフォーマットで失敗した場合
        raise ValueError(f"日付形式が認識できません: {date_str}")
    
    def parse_amount(self, amount_str: str) -> float:
        """金額文字列を数値（float）に変換
        
        Args:
            amount_str: 金額文字列
            
        Returns:
            金額（float）
            
        Raises:
            ValueError: 金額解析エラー
        """
        # クリーニング
        cleaned = str(amount_str).replace(",", "").replace("¥", "").replace("\\", "").strip()
        
        # 符号の処理（"△" は負の数を表すこともある）
        if cleaned.startswith("△") or cleaned.startswith("-△"):
            cleaned = "-" + cleaned.replace("△", "").replace("-", "")
        
        # 数値に変換
        try:
            return float(cleaned)
        except ValueError:
            raise ValueError(f"金額の形式が正しくありません: {amount_str}")


# 直接実行された場合のテスト用
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("使用方法: python csv_converter.py 入力ファイル 出力ファイル [変換形式]")
        print("変換形式: mf_cloud (デフォルト) または journal")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    format_type = "mf_cloud"
    if len(sys.argv) > 3:
        format_type = sys.argv[3]
    
    converter = CSVConverter()
    try:
        result = converter.convert_csv_file(input_file, output_file, format_type)
        print(f"変換完了: {result}")
    except Exception as e:
        print(f"エラー: {e}")
        sys.exit(1)
