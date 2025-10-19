#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🛡️ 為替レート安全マージン管理システム
リスク回避・動的マージン計算
"""

import sqlite3
import requests
import statistics
import logging
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from datetime import datetime, timedelta
import json

class ExchangeRateRiskManager:
    """為替レートリスク管理クラス"""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.api_endpoints = {
            'primary': 'https://api.exchangerate-api.com/v4/latest/USD',
            'backup': 'https://api.fixer.io/latest?base=USD',
            'free_backup': 'https://open.er-api.com/v6/latest/USD'
        }
        
        self._init_exchange_tables()
    
    def _init_exchange_tables(self):
        """為替レート管理テーブル初期化"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # 為替レート履歴テーブル
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS exchange_rate_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        currency_pair TEXT NOT NULL,
                        rate REAL NOT NULL,
                        source TEXT NOT NULL,
                        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX(currency_pair, fetched_at)
                    )
                """)
                
                # 安全マージン設定テーブル
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS safety_margin_config (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        currency_pair TEXT NOT NULL UNIQUE,
                        auto_margin_enabled BOOLEAN DEFAULT 1,
                        base_margin_percent REAL DEFAULT 2.0,
                        volatility_multiplier REAL DEFAULT 1.5,
                        max_margin_percent REAL DEFAULT 8.0,
                        min_margin_percent REAL DEFAULT 1.0,
                        manual_override_rate REAL,
                        manual_override_enabled BOOLEAN DEFAULT 0,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # デフォルト設定挿入
                cursor.execute("""
                    INSERT OR IGNORE INTO safety_margin_config 
                    (currency_pair, base_margin_percent, volatility_multiplier)
                    VALUES ('USD/JPY', 2.5, 1.5)
                """)
                
                conn.commit()
                logging.info("為替レート管理テーブル初期化完了")
                
        except Exception as e:
            logging.error(f"為替レート管理テーブル初期化エラー: {e}")
    
    def fetch_current_rate(self, currency_pair: str = 'USD/JPY') -> Dict:
        """現在の為替レート取得"""
        try:
            base_currency = currency_pair.split('/')[0]
            target_currency = currency_pair.split('/')[1]
            
            # プライマリAPIから取得
            for api_name, api_url in self.api_endpoints.items():
                try:
                    response = requests.get(api_url, timeout=10)
                    if response.status_code == 200:
                        data = response.json()
                        
                        if 'rates' in data and target_currency in data['rates']:
                            rate = data['rates'][target_currency]
                            
                            # データベースに記録
                            self._record_rate_history(currency_pair, rate, api_name)
                            
                            return {
                                'success': True,
                                'currency_pair': currency_pair,
                                'rate': rate,
                                'source': api_name,
                                'timestamp': datetime.now().isoformat()
                            }
                            
                except Exception as e:
                    logging.warning(f"{api_name} API エラー: {e}")
                    continue
            
            # 全API失敗時はキャッシュから取得
            cached_rate = self._get_cached_rate(currency_pair)
            if cached_rate:
                return {
                    'success': True,
                    'currency_pair': currency_pair,
                    'rate': cached_rate['rate'],
                    'source': f"cached_{cached_rate['source']}",
                    'timestamp': cached_rate['fetched_at'],
                    'warning': 'API接続失敗のためキャッシュデータを使用'
                }
            
            return {
                'success': False,
                'error': '全ての為替レートAPIが利用不可能です'
            }
            
        except Exception as e:
            logging.error(f"為替レート取得エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _record_rate_history(self, currency_pair: str, rate: float, source: str):
        """為替レート履歴記録"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO exchange_rate_history (currency_pair, rate, source)
                    VALUES (?, ?, ?)
                """, (currency_pair, rate, source))
                conn.commit()
                
        except Exception as e:
            logging.error(f"為替レート履歴記録エラー: {e}")
    
    def _get_cached_rate(self, currency_pair: str) -> Optional[Dict]:
        """キャッシュされた為替レート取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT rate, source, fetched_at 
                    FROM exchange_rate_history 
                    WHERE currency_pair = ? 
                    ORDER BY fetched_at DESC LIMIT 1
                """, (currency_pair,))
                
                result = cursor.fetchone()
                if result:
                    return {
                        'rate': result[0],
                        'source': result[1],
                        'fetched_at': result[2]
                    }
                
                return None
                
        except Exception as e:
            logging.error(f"キャッシュレート取得エラー: {e}")
            return None
    
    def calculate_volatility(self, currency_pair: str = 'USD/JPY', days: int = 30) -> Dict:
        """為替レート変動率計算"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # 過去N日間のレート取得
                start_date = (datetime.now() - timedelta(days=days)).isoformat()
                cursor.execute("""
                    SELECT rate, fetched_at 
                    FROM exchange_rate_history 
                    WHERE currency_pair = ? AND fetched_at >= ?
                    ORDER BY fetched_at ASC
                """, (currency_pair, start_date))
                
                rates_data = cursor.fetchall()
                
                if len(rates_data) < 5:
                    return {
                        'success': False,
                        'error': 'データ不足（最低5データポイント必要）'
                    }
                
                rates = [row[0] for row in rates_data]
                
                # 統計計算
                mean_rate = statistics.mean(rates)
                median_rate = statistics.median(rates)
                std_deviation = statistics.stdev(rates) if len(rates) > 1 else 0
                min_rate = min(rates)
                max_rate = max(rates)
                
                # 変動率計算
                volatility_percent = (std_deviation / mean_rate) * 100 if mean_rate > 0 else 0
                range_percent = ((max_rate - min_rate) / mean_rate) * 100 if mean_rate > 0 else 0
                
                # 日次変動率計算
                daily_changes = []
                for i in range(1, len(rates)):
                    change_percent = ((rates[i] - rates[i-1]) / rates[i-1]) * 100
                    daily_changes.append(abs(change_percent))
                
                avg_daily_change = statistics.mean(daily_changes) if daily_changes else 0
                
                return {
                    'success': True,
                    'currency_pair': currency_pair,
                    'analysis_period_days': days,
                    'data_points': len(rates),
                    'mean_rate': round(mean_rate, 4),
                    'median_rate': round(median_rate, 4),
                    'std_deviation': round(std_deviation, 4),
                    'min_rate': round(min_rate, 4),
                    'max_rate': round(max_rate, 4),
                    'volatility_percent': round(volatility_percent, 2),
                    'range_percent': round(range_percent, 2),
                    'avg_daily_change_percent': round(avg_daily_change, 2)
                }
                
        except Exception as e:
            logging.error(f"変動率計算エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_dynamic_margin(self, currency_pair: str = 'USD/JPY') -> Dict:
        """動的安全マージン計算"""
        try:
            # 設定取得
            config = self._get_margin_config(currency_pair)
            if not config:
                return {
                    'success': False,
                    'error': 'マージン設定が見つかりません'
                }
            
            # 手動オーバーライドが有効な場合
            if config.get('manual_override_enabled'):
                return {
                    'success': True,
                    'margin_type': 'manual_override',
                    'safety_margin_percent': config['manual_override_rate'],
                    'config_used': config
                }
            
            # 自動計算が無効な場合
            if not config.get('auto_margin_enabled'):
                return {
                    'success': True,
                    'margin_type': 'fixed',
                    'safety_margin_percent': config['base_margin_percent'],
                    'config_used': config
                }
            
            # 変動率取得
            volatility_result = self.calculate_volatility(currency_pair)
            if not volatility_result['success']:
                # 変動率取得失敗時はベースマージンを使用
                return {
                    'success': True,
                    'margin_type': 'base_fallback',
                    'safety_margin_percent': config['base_margin_percent'],
                    'warning': '変動率計算失敗のためベースマージン使用',
                    'config_used': config
                }
            
            # 動的マージン計算
            base_margin = config['base_margin_percent']
            volatility_factor = volatility_result['volatility_percent']
            multiplier = config['volatility_multiplier']
            
            # 計算式: ベースマージン + (変動率 × 倍率)
            dynamic_margin = base_margin + (volatility_factor * multiplier)
            
            # 上下限制限
            final_margin = max(
                config['min_margin_percent'],
                min(config['max_margin_percent'], dynamic_margin)
            )
            
            return {
                'success': True,
                'margin_type': 'dynamic',
                'safety_margin_percent': round(final_margin, 2),
                'calculation_details': {
                    'base_margin': base_margin,
                    'volatility_percent': volatility_factor,
                    'multiplier': multiplier,
                    'calculated_margin': round(dynamic_margin, 2),
                    'applied_limits': {
                        'min': config['min_margin_percent'],
                        'max': config['max_margin_percent']
                    }
                },
                'volatility_analysis': volatility_result,
                'config_used': config
            }
            
        except Exception as e:
            logging.error(f"動的マージン計算エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_margin_config(self, currency_pair: str) -> Optional[Dict]:
        """マージン設定取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT auto_margin_enabled, base_margin_percent, volatility_multiplier,
                           max_margin_percent, min_margin_percent, manual_override_rate,
                           manual_override_enabled
                    FROM safety_margin_config 
                    WHERE currency_pair = ?
                """, (currency_pair,))
                
                result = cursor.fetchone()
                if result:
                    return {
                        'auto_margin_enabled': bool(result[0]),
                        'base_margin_percent': result[1],
                        'volatility_multiplier': result[2],
                        'max_margin_percent': result[3],
                        'min_margin_percent': result[4],
                        'manual_override_rate': result[5],
                        'manual_override_enabled': bool(result[6])
                    }
                
                return None
                
        except Exception as e:
            logging.error(f"マージン設定取得エラー: {e}")
            return None
    
    def apply_safety_margin(self, base_rate: float, currency_pair: str = 'USD/JPY') -> Dict:
        """安全マージン適用"""
        try:
            # 動的マージン計算
            margin_result = self.calculate_dynamic_margin(currency_pair)
            
            if not margin_result['success']:
                return margin_result
            
            safety_margin_percent = margin_result['safety_margin_percent']
            
            # マージン適用
            # より保守的なレート = 基準レート × (1 - マージン率)
            safety_rate = base_rate * (1 - safety_margin_percent / 100)
            
            # 結果計算
            margin_amount = base_rate - safety_rate
            
            return {
                'success': True,
                'currency_pair': currency_pair,
                'base_rate': round(base_rate, 4),
                'safety_margin_percent': safety_margin_percent,
                'margin_amount': round(margin_amount, 4),
                'safety_rate': round(safety_rate, 4),
                'protection_buffer_jpy': round(margin_amount, 2),
                'margin_calculation': margin_result
            }
            
        except Exception as e:
            logging.error(f"安全マージン適用エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_margin_config(self, currency_pair: str, config_updates: Dict) -> bool:
        """マージン設定更新"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # 更新可能フィールド
                allowed_fields = [
                    'auto_margin_enabled', 'base_margin_percent', 'volatility_multiplier',
                    'max_margin_percent', 'min_margin_percent', 'manual_override_rate',
                    'manual_override_enabled'
                ]
                
                update_fields = []
                update_values = []
                
                for field, value in config_updates.items():
                    if field in allowed_fields:
                        update_fields.append(f"{field} = ?")
                        update_values.append(value)
                
                if not update_fields:
                    return False
                
                update_values.append(currency_pair)
                
                cursor.execute(f"""
                    UPDATE safety_margin_config 
                    SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE currency_pair = ?
                """, update_values)
                
                conn.commit()
                
                logging.info(f"マージン設定更新: {currency_pair} - {config_updates}")
                return True
                
        except Exception as e:
            logging.error(f"マージン設定更新エラー: {e}")
            return False
    
    def get_rate_with_margin(self, currency_pair: str = 'USD/JPY') -> Dict:
        """マージン適用済み為替レート取得"""
        try:
            # 現在レート取得
            current_rate_result = self.fetch_current_rate(currency_pair)
            
            if not current_rate_result['success']:
                return current_rate_result
            
            base_rate = current_rate_result['rate']
            
            # 安全マージン適用
            margin_result = self.apply_safety_margin(base_rate, currency_pair)
            
            if not margin_result['success']:
                return margin_result
            
            return {
                'success': True,
                'currency_pair': currency_pair,
                'base_rate_info': current_rate_result,
                'margin_applied_rate': margin_result['safety_rate'],
                'margin_details': margin_result,
                'recommendation': {
                    'use_rate': margin_result['safety_rate'],
                    'protection_amount': margin_result['protection_buffer_jpy'],
                    'risk_level': self._assess_risk_level(margin_result['safety_margin_percent'])
                }
            }
            
        except Exception as e:
            logging.error(f"マージン適用済みレート取得エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _assess_risk_level(self, margin_percent: float) -> str:
        """リスクレベル評価"""
        if margin_percent < 2.0:
            return 'low'
        elif margin_percent < 4.0:
            return 'medium'
        elif margin_percent < 6.0:
            return 'high'
        else:
            return 'very_high'
