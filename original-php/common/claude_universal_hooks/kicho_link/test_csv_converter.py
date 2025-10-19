#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
test_csv_converter.py - CSVコンバーターのテスト
"""

import os
import json
import tempfile
from datetime import datetime
from pathlib import Path

import pytest
import pandas as pd

from services.csv_converter import CSVConverter

# テスト用のサンプルCSVデータ
JOURNAL_CSV = """取引番号,取引日,借方勘定科目,借方補助科目,借方部門,借方取引先,借方税区分,借方インボイス,借方金額(円),貸方勘定科目,貸方補助科目,貸方部門,貸方取引先,貸方税区分,貸方インボイス,貸方金額(円),摘要,タグ,メモ
1001,2025/05/01,旅費交通費,,,,対象外,,1000,普通預金,,,,対象外,,1000,交通費精算（東京出張）,交通費,
1002,2025/05/02,会議費,,,,対象外,,3000,普通預金,,,,対象外,,3000,取引先との打ち合わせ費用,会議,"""

MF_CLOUD_CSV = """取引No,取引日,借方勘定科目,借方補助科目,借方部門,借方取引先,借方税区分,借方インボイス,借方金額(円),借方税額,貸方勘定科目,貸方補助科目,貸方部門,貸方取引先,貸方税区分,貸方インボイス,貸方金額(円),貸方税額,摘要,証憑,タグ,MF仕訳タイプ,決算整理仕訳,作成日,作成者,最終更新日,最終更新者
1001,2025/05/01,旅費交通費,,,,対象外,,1000,0,普通預金,,,,対象外,,1000,0,交通費精算（東京出張）,,交通費,通常,0,2025/05/01,admin,2025/05/01,admin
1002,2025/05/02,会議費,,,,対象外,,3000,0,普通預金,,,,対象外,,3000,0,取引先との打ち合わせ費用,,会議,通常,0,2025/05/02,admin,2025/05/02,admin"""

@pytest.fixture
def csv_converter():
    """CSVコンバーターのフィクスチャ"""
    return CSVConverter()

@pytest.fixture
def temp_journal_csv():
    """仕訳形式のCSVファイルを一時ファイルとして作成"""
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as f:
        f.write(JOURNAL_CSV)
    
    yield f.name
    
    # テスト後にファイルを削除
    if os.path.exists(f.name):
        os.unlink(f.name)

@pytest.fixture
def temp_mf_cloud_csv():
    """マネーフォワードクラウド形式のCSVファイルを一時ファイルとして作成"""
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as f:
        f.write(MF_CLOUD_CSV)
    
    yield f.name
    
    # テスト後にファイルを削除
    if os.path.exists(f.name):
        os.unlink(f.name)

def test_detect_csv_format(csv_converter, temp_journal_csv, temp_mf_cloud_csv):
    """CSVフォーマット検出のテスト"""
    # 仕訳形式の検出
    journal_format = csv_converter.detect_csv_format(temp_journal_csv)
    assert journal_format == "journal"
    
    # マネーフォワードクラウド形式の検出
    mf_format = csv_converter.detect_csv_format(temp_mf_cloud_csv)
    assert mf_format == "mf_cloud"

def test_read_csv_to_dataframe(csv_converter, temp_journal_csv):
    """CSVファイル読み込みのテスト"""
    df = csv_converter.read_csv_to_dataframe(temp_journal_csv)
    
    # DataFrameオブジェクトかどうか
    assert isinstance(df, pd.DataFrame)
    
    # 行数と列数
    assert len(df) == 2
    assert len(df.columns) > 0
    
    # 特定の列が存在するか
    assert "取引番号" in df.columns
    assert "取引日" in df.columns
    assert "借方勘定科目" in df.columns
    assert "貸方勘定科目" in df.columns

def test_convert_to_standard_format(csv_converter, temp_journal_csv, temp_mf_cloud_csv):
    """標準形式への変換テスト"""
    # 仕訳形式からの変換
    journal_df = csv_converter.read_csv_to_dataframe(temp_journal_csv)
    std_journal_df = csv_converter.convert_to_standard_format(journal_df)
    
    # 標準カラムが存在するか
    assert "transaction_id" in std_journal_df.columns
    assert "transaction_date" in std_journal_df.columns
    assert "debit_account" in std_journal_df.columns
    assert "credit_account" in std_journal_df.columns
    
    # データが正しく変換されているか
    assert std_journal_df["transaction_id"].iloc[0] == "1001"
    assert std_journal_df["debit_account"].iloc[0] == "旅費交通費"
    
    # マネーフォワードクラウド形式からの変換
    mf_df = csv_converter.read_csv_to_dataframe(temp_mf_cloud_csv)
    std_mf_df = csv_converter.convert_to_standard_format(mf_df)
    
    # 標準カラムが存在するか
    assert "transaction_id" in std_mf_df.columns
    assert "transaction_date" in std_mf_df.columns
    assert "debit_account" in std_mf_df.columns
    assert "credit_account" in std_mf_df.columns
    
    # データが正しく変換されているか
    assert std_mf_df["transaction_id"].iloc[0] == "1001"
    assert std_mf_df["debit_account"].iloc[0] == "旅費交通費"

def test_convert_to_mf_cloud_format(csv_converter, temp_journal_csv):
    """マネーフォワードクラウド形式への変換テスト"""
    # 仕訳形式→標準形式→マネーフォワードクラウド形式
    journal_df = csv_converter.read_csv_to_dataframe(temp_journal_csv)
    std_df = csv_converter.convert_to_standard_format(journal_df)
    mf_df = csv_converter.convert_to_mf_cloud_format(std_df)
    
    # MFクラウド固有のカラムが存在するか
    assert "取引No" in mf_df.columns
    assert "借方税額" in mf_df.columns
    assert "貸方税額" in mf_df.columns
    assert "MF仕訳タイプ" in mf_df.columns
    assert "決算整理仕訳" in mf_df.columns
    
    # デフォルト値が設定されているか
    assert "対象外" in mf_df["借方税区分"].values
    assert "対象外" in mf_df["貸方税区分"].values
    assert "0" in mf_df["決算整理仕訳"].values

def test_convert_to_journal_format(csv_converter, temp_mf_cloud_csv):
    """仕訳形式への変換テスト"""
    # マネーフォワードクラウド形式→標準形式→仕訳形式
    mf_df = csv_converter.read_csv_to_dataframe(temp_mf_cloud_csv)
    std_df = csv_converter.convert_to_standard_format(mf_df)
    journal_df = csv_converter.convert_to_journal_format(std_df)
    
    # 仕訳形式のカラムが存在するか
    assert "取引番号" in journal_df.columns
    assert "借方勘定科目" in journal_df.columns
    assert "貸方勘定科目" in journal_df.columns
    assert "摘要" in journal_df.columns
    
    # データが正しく変換されているか
    assert journal_df["取引番号"].iloc[0] == "1001"
    assert journal_df["借方勘定科目"].iloc[0] == "旅費交通費"
    assert journal_df["摘要"].iloc[0] == "交通費精算（東京出張）"

def test_convert_csv_file(csv_converter, temp_journal_csv, temp_mf_cloud_csv):
    """CSVファイル変換のテスト"""
    # 一時出力ファイル
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as output_file:
        output_path = output_file.name
    
    try:
        # 仕訳形式→マネーフォワードクラウド形式
        result_file = csv_converter.convert_csv_file(
            temp_journal_csv,
            output_path,
            "mf_cloud"
        )
        
        # 結果ファイルが存在するか
        assert os.path.exists(result_file)
        
        # 結果ファイルの内容確認
        result_df = pd.read_csv(result_file)
        assert "取引No" in result_df.columns
        assert "MF仕訳タイプ" in result_df.columns
        
        # ファイルを削除
        os.unlink(result_file)
        
        # マネーフォワードクラウド形式→仕訳形式
        result_file = csv_converter.convert_csv_file(
            temp_mf_cloud_csv,
            output_path,
            "journal"
        )
        
        # 結果ファイルが存在するか
        assert os.path.exists(result_file)
        
        # 結果ファイルの内容確認
        result_df = pd.read_csv(result_file)
        assert "取引番号" in result_df.columns
        assert "借方勘定科目" in result_df.columns
        
    finally:
        # テスト後にファイルを削除
        if os.path.exists(output_path):
            os.unlink(output_path)

def test_parse_date(csv_converter):
    """日付パース機能のテスト"""
    # 各種形式のテスト
    assert csv_converter.parse_date("2025/05/01") == datetime(2025, 5, 1)
    assert csv_converter.parse_date("2025-05-01") == datetime(2025, 5, 1)
    assert csv_converter.parse_date("2025年5月1日") == datetime(2025, 5, 1)
    assert csv_converter.parse_date("2025/05/01 12:34:56") == datetime(2025, 5, 1, 12, 34, 56)
    
    # 不正な形式ではエラー
    with pytest.raises(ValueError):
        csv_converter.parse_date("不正な日付")

def test_parse_amount(csv_converter):
    """金額パース機能のテスト"""
    # 各種形式のテスト
    assert csv_converter.parse_amount("1000") == 1000.0
    assert csv_converter.parse_amount("1,000") == 1000.0
    assert csv_converter.parse_amount("¥1,000") == 1000.0
    assert csv_converter.parse_amount("-1000") == -1000.0
    assert csv_converter.parse_amount("△1000") == -1000.0
    
    # 不正な形式ではエラー
    with pytest.raises(ValueError):
        csv_converter.parse_amount("不正な金額")
