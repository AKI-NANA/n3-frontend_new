#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚢 送料計算ルール管理システム（MVP版）
フェーズ1: 簡易計算方式 - 重量ベース料金表
"""

import json
import sqlite3
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging

class ShippingRulesManager:
    """送料ルール管理クラス"""
    
    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self.db_path = self.data_dir / "shipping_rules.db"
        self.rules_json_path = self.data_dir / "shipping_rules.json"
        self.category_weights_path = self.data_dir / "category_weights.json"
        
        # データベース初期化
        self._init_database()
        
        # デフォルトルール設定
        self.default_rules = self._get_default_rules()
        self.default_category_weights = self._get_default_category_weights()
        
        # ルール読み込み
        self._load_rules()
    
    def _init_database(self):
        """データベース初期化"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # 送料ルールテーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS shipping_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    priority INTEGER NOT NULL,
                    weight_range TEXT NOT NULL,
                    weight_min REAL NOT NULL,
                    weight_max REAL NOT NULL,
                    destination TEXT NOT NULL,
                    economy_rate REAL NOT NULL,
                    standard_rate REAL NOT NULL,
                    express_rate REAL NOT NULL,
                    region_coefficient REAL DEFAULT 1.0,
                    enabled BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # カテゴリ重量推定テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS category_weights (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category_name TEXT NOT NULL UNIQUE,
                    average_weight REAL NOT NULL,
                    weight_variance REAL NOT NULL,
                    sample_count INTEGER DEFAULT 0,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 計算履歴テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS calculation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id TEXT,
                    category TEXT,
                    weight_kg REAL,
                    destination TEXT,
                    shipping_type TEXT,
                    calculated_rate REAL,
                    exchange_rate REAL,
                    profit_margin REAL,
                    final_price_usd REAL,
                    calculation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
    
    def _get_default_rules(self) -> List[Dict]:
        """デフォルト送料ルール"""
        return [
            {
                'priority': 1,
                'weight_range': '0-0.5kg',
                'weight_min': 0.0,
                'weight_max': 0.5,
                'destination': 'USA',
                'economy_rate': 8.50,
                'standard_rate': 15.00,
                'express_rate': 25.00,
                'region_coefficient': 1.0,
                'enabled': True
            },
            {
                'priority': 2,
                'weight_range': '0.5-1.0kg',
                'weight_min': 0.5,
                'weight_max': 1.0,
                'destination': 'USA',
                'economy_rate': 12.00,
                'standard_rate': 20.00,
                'express_rate': 35.00,
                'region_coefficient': 1.0,
                'enabled': True
            },
            {
                'priority': 3,
                'weight_range': '1.0-2.0kg',
                'weight_min': 1.0,
                'weight_max': 2.0,
                'destination': 'USA',
                'economy_rate': 18.00,
                'standard_rate': 30.00,
                'express_rate': 50.00,
                'region_coefficient': 1.0,
                'enabled': True
            },
            {
                'priority': 4,
                'weight_range': '2.0-5.0kg',
                'weight_min': 2.0,
                'weight_max': 5.0,
                'destination': 'USA',
                'economy_rate': 35.00,
                'standard_rate': 55.00,
                'express_rate': 80.00,
                'region_coefficient': 1.0,
                'enabled': True
            },
            # カナダ
            {
                'priority': 5,
                'weight_range': '0-0.5kg',
                'weight_min': 0.0,
                'weight_max': 0.5,
                'destination': 'Canada',
                'economy_rate': 9.50,
                'standard_rate': 18.00,
                'express_rate': 30.00,
                'region_coefficient': 1.15,
                'enabled': True
            },
            # ヨーロッパ
            {
                'priority': 6,
                'weight_range': '0-0.5kg',
                'weight_min': 0.0,
                'weight_max': 0.5,
                'destination': 'Europe',
                'economy_rate': 12.00,
                'standard_rate': 22.00,
                'express_rate': 40.00,
                'region_coefficient': 1.35,
                'enabled': True
            },
            # アジア
            {
                'priority': 7,
                'weight_range': '0-0.5kg',
                'weight_min': 0.0,
                'weight_max': 0.5,
                'destination': 'Asia',
                'economy_rate': 7.00,
                'standard_rate': 12.00,
                'express_rate': 20.00,
                'region_coefficient': 0.85,
                'enabled': True
            }
        ]
    
    def _get_default_category_weights(self) -> Dict[str, Dict]:
        """デフォルトカテゴリ重量設定"""
        return {
            'Electronics': {
                'average_weight': 0.5,
                'weight_variance': 0.2,
                'description': '電子機器・ガジェット類'
            },
            'Fashion': {
                'average_weight': 0.3,
                'weight_variance': 0.15,
                'description': 'アパレル・アクセサリー'
            },
            'Books': {
                'average_weight': 0.4,
                'weight_variance': 0.3,
                'description': '書籍・雑誌・メディア'
            },
            'Sports': {
                'average_weight': 1.2,
                'weight_variance': 0.8,
                'description': 'スポーツ・アウトドア用品'
            },
            'Toys': {
                'average_weight': 0.6,
                'weight_variance': 0.4,
                'description': 'おもちゃ・ホビー'
            },
            'Home': {
                'average_weight': 1.0,
                'weight_variance': 0.7,
                'description': 'ホーム・ガーデン用品'
            },
            'Beauty': {
                'average_weight': 0.2,
                'weight_variance': 0.1,
                'description': '美容・コスメ'
            },
            'Automotive': {
                'average_weight': 2.0,
                'weight_variance': 1.5,
                'description': '自動車・バイク用品'
            }
        }
    
    def _load_rules(self):
        """ルール読み込み"""
        # データベースが空の場合、デフォルトルールをロード
        if self._is_database_empty():
            self.reset_to_defaults()
    
    def _is_database_empty(self) -> bool:
        """データベースが空かチェック"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM shipping_rules")
            count = cursor.fetchone()[0]
            return count == 0
    
    def reset_to_defaults(self):
        """デフォルト設定にリセット"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # 既存データクリア
            cursor.execute("DELETE FROM shipping_rules")
            cursor.execute("DELETE FROM category_weights")
            
            # デフォルト送料ルール挿入
            for rule in self.default_rules:
                cursor.execute("""
                    INSERT INTO shipping_rules (
                        priority, weight_range, weight_min, weight_max, destination,
                        economy_rate, standard_rate, express_rate, region_coefficient, enabled
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    rule['priority'], rule['weight_range'], rule['weight_min'], rule['weight_max'],
                    rule['destination'], rule['economy_rate'], rule['standard_rate'],
                    rule['express_rate'], rule['region_coefficient'], rule['enabled']
                ))
            
            # デフォルトカテゴリ重量挿入
            for category, data in self.default_category_weights.items():
                cursor.execute("""
                    INSERT INTO category_weights (
                        category_name, average_weight, weight_variance
                    ) VALUES (?, ?, ?)
                """, (category, data['average_weight'], data['weight_variance']))
            
            conn.commit()
        
        logging.info("デフォルト設定にリセットしました")
    
    def get_shipping_rules(self) -> List[Dict]:
        """送料ルール取得"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM shipping_rules 
                ORDER BY priority, destination, weight_min
            """)
            
            columns = [description[0] for description in cursor.description]
            rules = []
            
            for row in cursor.fetchall():
                rule = dict(zip(columns, row))
                rules.append(rule)
            
            return rules
    
    def save_shipping_rule(self, rule_data: Dict) -> bool:
        """送料ルール保存"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if rule_data.get('id'):
                    # 既存ルール更新
                    cursor.execute("""
                        UPDATE shipping_rules SET
                            priority = ?, weight_range = ?, weight_min = ?, weight_max = ?,
                            destination = ?, economy_rate = ?, standard_rate = ?, express_rate = ?,
                            region_coefficient = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (
                        rule_data['priority'], rule_data['weight_range'],
                        rule_data['weight_min'], rule_data['weight_max'],
                        rule_data['destination'], rule_data['economy_rate'],
                        rule_data['standard_rate'], rule_data['express_rate'],
                        rule_data['region_coefficient'], rule_data['enabled'],
                        rule_data['id']
                    ))
                else:
                    # 新規ルール作成
                    cursor.execute("""
                        INSERT INTO shipping_rules (
                            priority, weight_range, weight_min, weight_max, destination,
                            economy_rate, standard_rate, express_rate, region_coefficient, enabled
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        rule_data['priority'], rule_data['weight_range'],
                        rule_data['weight_min'], rule_data['weight_max'],
                        rule_data['destination'], rule_data['economy_rate'],
                        rule_data['standard_rate'], rule_data['express_rate'],
                        rule_data['region_coefficient'], rule_data['enabled']
                    ))
                
                conn.commit()
                return True
                
        except Exception as e:
            logging.error(f"送料ルール保存エラー: {e}")
            return False
    
    def delete_shipping_rule(self, rule_id: int) -> bool:
        """送料ルール削除"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM shipping_rules WHERE id = ?", (rule_id,))
                conn.commit()
                return True
        except Exception as e:
            logging.error(f"送料ルール削除エラー: {e}")
            return False
    
    def get_category_weights(self) -> Dict[str, Dict]:
        """カテゴリ重量設定取得"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM category_weights ORDER BY category_name")
            
            weights = {}
            for row in cursor.fetchall():
                weights[row[1]] = {  # row[1] = category_name
                    'average_weight': row[2],
                    'weight_variance': row[3],
                    'sample_count': row[4],
                    'last_updated': row[5]
                }
            
            return weights
    
    def save_category_weight(self, category: str, average_weight: float, weight_variance: float) -> bool:
        """カテゴリ重量設定保存"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO category_weights 
                    (category_name, average_weight, weight_variance, last_updated)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                """, (category, average_weight, weight_variance))
                conn.commit()
                return True
        except Exception as e:
            logging.error(f"カテゴリ重量保存エラー: {e}")
            return False
    
    def estimate_weight_by_category(self, category: str) -> float:
        """カテゴリ別重量推定"""
        weights = self.get_category_weights()
        
        if category in weights:
            return weights[category]['average_weight']
        
        # 部分マッチ検索
        category_lower = category.lower()
        for cat, data in weights.items():
            if cat.lower() in category_lower or category_lower in cat.lower():
                return data['average_weight']
        
        # デフォルト重量
        return 0.5
    
    def calculate_shipping_cost(self, weight_kg: float, destination: str = 'USA', 
                               shipping_type: str = 'standard') -> Dict:
        """送料計算"""
        try:
            # 適用可能なルールを検索
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM shipping_rules 
                    WHERE destination = ? AND enabled = 1 
                      AND weight_min <= ? AND weight_max >= ?
                    ORDER BY priority LIMIT 1
                """, (destination, weight_kg, weight_kg))
                
                rule = cursor.fetchone()
                
                if not rule:
                    # フォールバック：最大重量範囲のルールを使用
                    cursor.execute("""
                        SELECT * FROM shipping_rules 
                        WHERE destination = ? AND enabled = 1
                        ORDER BY weight_max DESC LIMIT 1
                    """, (destination,))
                    rule = cursor.fetchone()
            
            if not rule:
                # デフォルトレート
                return {
                    'shipping_cost': 30.00,
                    'shipping_type': shipping_type,
                    'destination': destination,
                    'weight_kg': weight_kg,
                    'rule_applied': 'default',
                    'error': 'No matching rule found'
                }
            
            # 料金選択
            rate_map = {
                'economy': rule[6],    # economy_rate
                'standard': rule[7],   # standard_rate
                'express': rule[8]     # express_rate
            }
            
            base_rate = rate_map.get(shipping_type, rule[7])  # デフォルトはstandard
            region_coefficient = rule[9]  # region_coefficient
            
            final_cost = base_rate * region_coefficient
            
            return {
                'shipping_cost': round(final_cost, 2),
                'shipping_type': shipping_type,
                'destination': destination,
                'weight_kg': weight_kg,
                'base_rate': base_rate,
                'region_coefficient': region_coefficient,
                'weight_range': rule[2],  # weight_range
                'rule_applied': f'Rule {rule[1]}',  # priority
                'rule_id': rule[0]
            }
            
        except Exception as e:
            logging.error(f"送料計算エラー: {e}")
            return {
                'shipping_cost': 30.00,
                'error': str(e)
            }
    
    def calculate_final_price(self, cost_jpy: float, weight_kg: float, 
                              destination: str = 'USA', shipping_type: str = 'standard',
                              profit_margin: float = 0.25, exchange_rate: Optional[float] = None) -> Dict:
        """最終販売価格計算"""
        try:
            # 為替レート取得（デフォルト）
            if exchange_rate is None:
                exchange_rate = 148.5  # USD/JPY
            
            # 送料計算
            shipping_result = self.calculate_shipping_cost(weight_kg, destination, shipping_type)
            shipping_cost = shipping_result['shipping_cost']
            
            # 仕入れ価格をUSD変換
            cost_usd = cost_jpy / exchange_rate
            
            # 総コスト
            total_cost_usd = cost_usd + shipping_cost
            
            # 利益率考慮した販売価格
            sale_price_before = total_cost_usd / (1 - profit_margin)
            
            # 価格調整（x.99で終わる）
            sale_price_usd = int(sale_price_before) + 0.99
            
            # 実際の利益計算
            actual_profit = sale_price_usd - total_cost_usd
            actual_margin = actual_profit / sale_price_usd
            
            # 計算履歴保存
            self._save_calculation_history(
                weight_kg, destination, shipping_type, shipping_cost, 
                exchange_rate, actual_margin, sale_price_usd
            )
            
            return {
                'success': True,
                'cost_jpy': cost_jpy,
                'cost_usd': round(cost_usd, 2),
                'shipping_cost': shipping_cost,
                'total_cost_usd': round(total_cost_usd, 2),
                'sale_price_usd': sale_price_usd,
                'profit_usd': round(actual_profit, 2),
                'profit_margin_percent': round(actual_margin * 100, 1),
                'exchange_rate': exchange_rate,
                'shipping_details': shipping_result
            }
            
        except Exception as e:
            logging.error(f"最終価格計算エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _save_calculation_history(self, weight_kg: float, destination: str, 
                                  shipping_type: str, calculated_rate: float,
                                  exchange_rate: float, profit_margin: float, 
                                  final_price_usd: float):
        """計算履歴保存"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO calculation_history (
                        weight_kg, destination, shipping_type, calculated_rate,
                        exchange_rate, profit_margin, final_price_usd
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    weight_kg, destination, shipping_type, calculated_rate,
                    exchange_rate, profit_margin, final_price_usd
                ))
                conn.commit()
        except Exception as e:
            logging.error(f"計算履歴保存エラー: {e}")
    
    def get_calculation_stats(self) -> Dict:
        """計算統計取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # 基本統計
                cursor.execute("""
                    SELECT COUNT(*) as total_calculations,
                           AVG(final_price_usd) as avg_price,
                           AVG(profit_margin) as avg_margin,
                           AVG(calculated_rate) as avg_shipping
                    FROM calculation_history
                    WHERE calculation_timestamp >= datetime('now', '-30 days')
                """)
                
                stats = cursor.fetchone()
                
                # 人気の送り先
                cursor.execute("""
                    SELECT destination, COUNT(*) as count
                    FROM calculation_history
                    WHERE calculation_timestamp >= datetime('now', '-30 days')
                    GROUP BY destination
                    ORDER BY count DESC LIMIT 5
                """)
                
                popular_destinations = cursor.fetchall()
                
                return {
                    'total_calculations': stats[0] or 0,
                    'avg_price_usd': round(stats[1] or 0, 2),
                    'avg_margin_percent': round((stats[2] or 0) * 100, 1),
                    'avg_shipping_cost': round(stats[3] or 0, 2),
                    'popular_destinations': [
                        {'destination': dest, 'count': count} 
                        for dest, count in popular_destinations
                    ]
                }
                
        except Exception as e:
            logging.error(f"統計取得エラー: {e}")
            return {'error': str(e)}
    
    def export_rules_to_csv(self, output_path: Path) -> bool:
        """ルールをCSVエクスポート"""
        try:
            rules = self.get_shipping_rules()
            df = pd.DataFrame(rules)
            df.to_csv(output_path, index=False, encoding='utf-8')
            return True
        except Exception as e:
            logging.error(f"CSV エクスポートエラー: {e}")
            return False
    
    def import_rules_from_csv(self, csv_path: Path) -> bool:
        """CSVからルールインポート"""
        try:
            df = pd.read_csv(csv_path, encoding='utf-8')
            
            # 既存ルールクリア
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM shipping_rules")
                
                # 新ルール挿入
                for _, row in df.iterrows():
                    cursor.execute("""
                        INSERT INTO shipping_rules (
                            priority, weight_range, weight_min, weight_max, destination,
                            economy_rate, standard_rate, express_rate, region_coefficient, enabled
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        row['priority'], row['weight_range'], row['weight_min'], row['weight_max'],
                        row['destination'], row['economy_rate'], row['standard_rate'], 
                        row['express_rate'], row['region_coefficient'], row['enabled']
                    ))
                
                conn.commit()
            
            return True
        except Exception as e:
            logging.error(f"CSV インポートエラー: {e}")
            return False
