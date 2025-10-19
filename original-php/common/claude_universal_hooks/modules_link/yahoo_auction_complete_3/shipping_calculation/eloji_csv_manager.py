#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚛 eloji送料データCSV管理システム
CSVアップロード・検証・同期処理
"""

import pandas as pd
import sqlite3
import logging
import json
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from datetime import datetime
import hashlib

class ElojiShippingDataManager:
    """eloji送料データ管理クラス"""
    
    def __init__(self, db_path: Path, upload_dir: Path):
        self.db_path = db_path
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(exist_ok=True)
        
        # 期待するCSVフォーマット定義
        self.expected_csv_columns = {
            'destination_country': str,      # 発送先国
            'destination_region': str,       # 発送先地域
            'weight_min': float,            # 最小重量(kg)
            'weight_max': float,            # 最大重量(kg)
            'service_type': str,            # サービスタイプ
            'cost_usd': float,              # 送料(USD)
            'delivery_days_min': int,       # 最短配送日数
            'delivery_days_max': int,       # 最長配送日数
            'fuel_surcharge': float,        # 燃油サーチャージ
            'last_updated': str             # 更新日時
        }
        
        self._init_eloji_tables()
    
    def _init_eloji_tables(self):
        """eloji送料データテーブル初期化"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # eloji送料データテーブル
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS eloji_shipping_data (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        destination_country TEXT NOT NULL,
                        destination_region TEXT,
                        weight_min REAL NOT NULL,
                        weight_max REAL NOT NULL,
                        service_type TEXT NOT NULL,
                        cost_usd REAL NOT NULL,
                        delivery_days_min INTEGER,
                        delivery_days_max INTEGER,
                        fuel_surcharge REAL DEFAULT 0.0,
                        data_source TEXT DEFAULT 'eloji',
                        csv_file_hash TEXT,
                        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_updated TIMESTAMP,
                        UNIQUE(destination_country, destination_region, weight_min, weight_max, service_type)
                    )
                """)
                
                # CSV処理履歴テーブル
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS csv_processing_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        filename TEXT NOT NULL,
                        file_hash TEXT NOT NULL,
                        file_size INTEGER,
                        total_rows INTEGER,
                        valid_rows INTEGER,
                        invalid_rows INTEGER,
                        processing_status TEXT,
                        error_details TEXT,
                        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                conn.commit()
                logging.info("eloji送料データテーブル初期化完了")
                
        except Exception as e:
            logging.error(f"eloji送料データテーブル初期化エラー: {e}")
    
    def validate_csv_format(self, df: pd.DataFrame) -> Dict:
        """CSV形式検証"""
        validation_results = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'valid_rows': 0,
            'invalid_rows': 0
        }
        
        try:
            # 必須カラム存在チェック
            missing_columns = []
            for col in self.expected_csv_columns.keys():
                if col not in df.columns:
                    missing_columns.append(col)
            
            if missing_columns:
                validation_results['is_valid'] = False
                validation_results['errors'].append(f"必須カラム不足: {missing_columns}")
                return validation_results
            
            # データ型・値検証
            invalid_rows = []
            
            for index, row in df.iterrows():
                row_errors = []
                
                # 数値項目の検証
                try:
                    if pd.isna(row['weight_min']) or pd.isna(row['weight_max']):
                        row_errors.append("重量が空です")
                    elif float(row['weight_min']) < 0 or float(row['weight_max']) < 0:
                        row_errors.append("重量が負の値です")
                    elif float(row['weight_min']) >= float(row['weight_max']):
                        row_errors.append("最小重量 >= 最大重量です")
                except (ValueError, TypeError):
                    row_errors.append("重量の形式が無効です")
                
                try:
                    if pd.isna(row['cost_usd']) or float(row['cost_usd']) < 0:
                        row_errors.append("送料が無効です")
                except (ValueError, TypeError):
                    row_errors.append("送料の形式が無効です")
                
                # 文字列項目の検証
                if pd.isna(row['destination_country']) or not str(row['destination_country']).strip():
                    row_errors.append("発送先国が空です")
                
                if pd.isna(row['service_type']) or not str(row['service_type']).strip():
                    row_errors.append("サービスタイプが空です")
                
                if row_errors:
                    invalid_rows.append({
                        'row_number': index + 2,  # ヘッダー行考慮
                        'errors': row_errors
                    })
            
            validation_results['invalid_rows'] = len(invalid_rows)
            validation_results['valid_rows'] = len(df) - len(invalid_rows)
            
            if invalid_rows:
                validation_results['errors'].extend([
                    f"行{row['row_number']}: {', '.join(row['errors'])}" 
                    for row in invalid_rows[:10]  # 最初の10件のみ表示
                ])
                
                if len(invalid_rows) > 10:
                    validation_results['errors'].append(f"他 {len(invalid_rows) - 10} 件のエラー行")
            
            # 警告チェック
            if validation_results['invalid_rows'] > 0:
                validation_results['warnings'].append(
                    f"{validation_results['invalid_rows']}行にエラーがあります"
                )
            
            return validation_results
            
        except Exception as e:
            logging.error(f"CSV検証エラー: {e}")
            validation_results['is_valid'] = False
            validation_results['errors'].append(f"検証中エラー: {str(e)}")
            return validation_results
    
    def calculate_file_hash(self, file_path: Path) -> str:
        """ファイルハッシュ計算"""
        try:
            hasher = hashlib.md5()
            with open(file_path, 'rb') as f:
                buf = f.read()
                hasher.update(buf)
            return hasher.hexdigest()
        except Exception as e:
            logging.error(f"ファイルハッシュ計算エラー: {e}")
            return ""
    
    def process_csv_upload(self, file_path: Path, overwrite: bool = False) -> Dict:
        """CSVアップロード処理"""
        try:
            # ファイル存在確認
            if not file_path.exists():
                return {
                    'success': False,
                    'error': 'ファイルが見つかりません'
                }
            
            # ファイル情報取得
            file_hash = self.calculate_file_hash(file_path)
            file_size = file_path.stat().st_size
            
            # 重複チェック（overwriteがFalseの場合）
            if not overwrite:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT id, filename, processed_at 
                        FROM csv_processing_history 
                        WHERE file_hash = ? AND processing_status = 'success'
                    """, (file_hash,))
                    
                    existing = cursor.fetchone()
                    if existing:
                        return {
                            'success': False,
                            'error': f'同じファイルが既に処理済みです: {existing[1]} ({existing[2]})',
                            'duplicate': True
                        }
            
            # CSV読み込み
            try:
                df = pd.read_csv(file_path, encoding='utf-8')
            except UnicodeDecodeError:
                try:
                    df = pd.read_csv(file_path, encoding='shift-jis')
                except:
                    df = pd.read_csv(file_path, encoding='cp932')
            
            # バリデーション実行
            validation_result = self.validate_csv_format(df)
            
            # 処理履歴記録開始
            processing_id = self._record_processing_start(
                file_path.name, file_hash, file_size, len(df)
            )
            
            if not validation_result['is_valid']:
                # バリデーション失敗
                self._record_processing_result(
                    processing_id, 'validation_failed', 
                    0, len(df), validation_result['errors']
                )
                
                return {
                    'success': False,
                    'validation_result': validation_result,
                    'processing_id': processing_id
                }
            
            # データ更新処理
            update_result = self._update_shipping_data(df, file_hash)
            
            # 処理結果記録
            if update_result['success']:
                self._record_processing_result(
                    processing_id, 'success',
                    update_result['updated_count'], 
                    validation_result['invalid_rows']
                )
            else:
                self._record_processing_result(
                    processing_id, 'update_failed',
                    0, len(df), [update_result['error']]
                )
            
            return {
                'success': update_result['success'],
                'validation_result': validation_result,
                'update_result': update_result,
                'processing_id': processing_id
            }
            
        except Exception as e:
            logging.error(f"CSVアップロード処理エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _record_processing_start(self, filename: str, file_hash: str, 
                                file_size: int, total_rows: int) -> int:
        """処理開始記録"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO csv_processing_history 
                    (filename, file_hash, file_size, total_rows, processing_status)
                    VALUES (?, ?, ?, ?, 'processing')
                """, (filename, file_hash, file_size, total_rows))
                
                processing_id = cursor.lastrowid
                conn.commit()
                return processing_id
                
        except Exception as e:
            logging.error(f"処理開始記録エラー: {e}")
            return 0
    
    def _record_processing_result(self, processing_id: int, status: str, 
                                 valid_rows: int, invalid_rows: int, 
                                 errors: List[str] = None):
        """処理結果記録"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE csv_processing_history 
                    SET processing_status = ?, valid_rows = ?, invalid_rows = ?, 
                        error_details = ?
                    WHERE id = ?
                """, (
                    status, valid_rows, invalid_rows,
                    json.dumps(errors) if errors else None,
                    processing_id
                ))
                conn.commit()
                
        except Exception as e:
            logging.error(f"処理結果記録エラー: {e}")
    
    def _update_shipping_data(self, df: pd.DataFrame, file_hash: str) -> Dict:
        """送料データ更新"""
        try:
            updated_count = 0
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                for _, row in df.iterrows():
                    try:
                        # データクリーニング
                        destination_country = str(row['destination_country']).strip()
                        destination_region = str(row.get('destination_region', '')).strip()
                        weight_min = float(row['weight_min'])
                        weight_max = float(row['weight_max'])
                        service_type = str(row['service_type']).strip()
                        cost_usd = float(row['cost_usd'])
                        delivery_days_min = int(row.get('delivery_days_min', 0))
                        delivery_days_max = int(row.get('delivery_days_max', 0))
                        fuel_surcharge = float(row.get('fuel_surcharge', 0.0))
                        
                        # UPSERT実行
                        cursor.execute("""
                            INSERT OR REPLACE INTO eloji_shipping_data 
                            (destination_country, destination_region, weight_min, weight_max,
                             service_type, cost_usd, delivery_days_min, delivery_days_max,
                             fuel_surcharge, csv_file_hash, last_updated)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        """, (
                            destination_country, destination_region, weight_min, weight_max,
                            service_type, cost_usd, delivery_days_min, delivery_days_max,
                            fuel_surcharge, file_hash
                        ))
                        
                        updated_count += 1
                        
                    except Exception as e:
                        logging.warning(f"個別行更新エラー: {e}")
                        continue
                
                conn.commit()
            
            return {
                'success': True,
                'updated_count': updated_count
            }
            
        except Exception as e:
            logging.error(f"送料データ更新エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_processing_history(self, limit: int = 20) -> List[Dict]:
        """処理履歴取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT filename, file_hash, file_size, total_rows, valid_rows, 
                           invalid_rows, processing_status, processed_at
                    FROM csv_processing_history 
                    ORDER BY processed_at DESC LIMIT ?
                """, (limit,))
                
                history = []
                for row in cursor.fetchall():
                    history.append({
                        'filename': row[0],
                        'file_hash': row[1],
                        'file_size': row[2],
                        'total_rows': row[3],
                        'valid_rows': row[4],
                        'invalid_rows': row[5],
                        'status': row[6],
                        'processed_at': row[7]
                    })
                
                return history
                
        except Exception as e:
            logging.error(f"処理履歴取得エラー: {e}")
            return []
    
    def get_shipping_data(self, destination_country: str = None, 
                         service_type: str = None) -> List[Dict]:
        """送料データ取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                query = """
                    SELECT destination_country, destination_region, weight_min, weight_max,
                           service_type, cost_usd, delivery_days_min, delivery_days_max,
                           fuel_surcharge, last_updated
                    FROM eloji_shipping_data
                """
                params = []
                
                conditions = []
                if destination_country:
                    conditions.append("destination_country = ?")
                    params.append(destination_country)
                
                if service_type:
                    conditions.append("service_type = ?")
                    params.append(service_type)
                
                if conditions:
                    query += " WHERE " + " AND ".join(conditions)
                
                query += " ORDER BY destination_country, weight_min, service_type"
                
                cursor.execute(query, params)
                
                data = []
                for row in cursor.fetchall():
                    data.append({
                        'destination_country': row[0],
                        'destination_region': row[1],
                        'weight_min': row[2],
                        'weight_max': row[3],
                        'service_type': row[4],
                        'cost_usd': row[5],
                        'delivery_days_min': row[6],
                        'delivery_days_max': row[7],
                        'fuel_surcharge': row[8],
                        'last_updated': row[9]
                    })
                
                return data
                
        except Exception as e:
            logging.error(f"送料データ取得エラー: {e}")
            return []
