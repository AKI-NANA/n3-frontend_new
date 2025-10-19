#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🇺🇸 USA基準送料内包計算システム
Gemini AI アドバイスに基づく実装
"""

import sqlite3
import logging
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from datetime import datetime

class USABaseShippingCalculator:
    """USA基準送料内包計算クラス"""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.price_tier_policies = {}
        self.usa_base_rates = {}
        
        self._load_policies()
        self._load_usa_base_rates()
    
    def _load_policies(self):
        """価格帯別ポリシー読み込み"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT tier_name, price_min, price_max, inclusion_strategy, partial_amount, enabled
                    FROM price_tier_policies WHERE enabled = 1
                    ORDER BY price_min
                """)
                
                for row in cursor.fetchall():
                    tier_name, price_min, price_max, strategy, partial_amount, enabled = row
                    self.price_tier_policies[tier_name] = {
                        'price_min': price_min,
                        'price_max': price_max,
                        'inclusion_strategy': strategy,
                        'partial_amount': partial_amount,
                        'enabled': enabled
                    }
                
                logging.info(f"価格帯ポリシー読み込み完了: {len(self.price_tier_policies)}件")
                
        except Exception as e:
            logging.error(f"価格帯ポリシー読み込みエラー: {e}")
    
    def _load_usa_base_rates(self):
        """USA基準送料読み込み"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT weight_min, weight_max, base_cost_usd, service_type
                    FROM usa_base_shipping
                    ORDER BY weight_min, service_type
                """)
                
                for row in cursor.fetchall():
                    weight_min, weight_max, base_cost, service_type = row
                    key = f"{weight_min}-{weight_max}-{service_type}"
                    self.usa_base_rates[key] = {
                        'weight_min': weight_min,
                        'weight_max': weight_max,
                        'base_cost_usd': base_cost,
                        'service_type': service_type
                    }
                
                logging.info(f"USA基準送料読み込み完了: {len(self.usa_base_rates)}件")
                
        except Exception as e:
            logging.error(f"USA基準送料読み込みエラー: {e}")
    
    def get_usa_base_shipping_cost(self, weight_kg: float, service_type: str = 'standard') -> float:
        """USA基準送料取得"""
        try:
            # 重量範囲に該当するレートを検索
            for key, rate_info in self.usa_base_rates.items():
                if (rate_info['weight_min'] <= weight_kg <= rate_info['weight_max'] and 
                    rate_info['service_type'] == service_type):
                    return rate_info['base_cost_usd']
            
            # 該当なしの場合、最大範囲のレートを使用
            max_weight_rates = [r for r in self.usa_base_rates.values() 
                              if r['service_type'] == service_type]
            if max_weight_rates:
                return max(max_weight_rates, key=lambda x: x['weight_max'])['base_cost_usd']
            
            # フォールバック
            return 30.0
            
        except Exception as e:
            logging.error(f"USA基準送料取得エラー: {e}")
            return 30.0
    
    def determine_price_tier(self, price_usd: float) -> Dict:
        """価格帯判定"""
        try:
            for tier_name, policy in self.price_tier_policies.items():
                if policy['price_min'] <= price_usd <= policy['price_max']:
                    return {
                        'tier_name': tier_name,
                        'policy': policy
                    }
            
            # デフォルト（低価格帯）
            return {
                'tier_name': '低価格帯',
                'policy': {
                    'inclusion_strategy': 'full',
                    'partial_amount': 0.0
                }
            }
            
        except Exception as e:
            logging.error(f"価格帯判定エラー: {e}")
            return {'tier_name': 'エラー', 'policy': {'inclusion_strategy': 'full', 'partial_amount': 0.0}}
    
    def calculate_usa_inclusion_price(self, base_cost_jpy: float, weight_kg: float, 
                                      exchange_rate: float, service_type: str = 'standard') -> Dict:
        """USA送料内包価格計算"""
        try:
            # USA基準送料取得
            usa_shipping_cost = self.get_usa_base_shipping_cost(weight_kg, service_type)
            
            # 基本価格をUSDに変換
            base_cost_usd = base_cost_jpy / exchange_rate
            
            # 送料内包前の価格
            pre_inclusion_price = base_cost_usd
            
            # 価格帯判定
            tier_info = self.determine_price_tier(pre_inclusion_price)
            policy = tier_info['policy']
            
            # 戦略別計算
            if policy['inclusion_strategy'] == 'full':
                # 送料全額内包
                final_price = base_cost_usd + usa_shipping_cost
                included_shipping = usa_shipping_cost
                separate_shipping = 0.0
                
            elif policy['inclusion_strategy'] == 'partial':
                # 送料一部内包
                partial_amount = policy['partial_amount']
                final_price = base_cost_usd + partial_amount
                included_shipping = partial_amount
                separate_shipping = usa_shipping_cost - partial_amount
                
            elif policy['inclusion_strategy'] == 'free':
                # 完全送料無料
                final_price = base_cost_usd
                included_shipping = 0.0
                separate_shipping = 0.0
                
            else:
                # デフォルト（全額内包）
                final_price = base_cost_usd + usa_shipping_cost
                included_shipping = usa_shipping_cost
                separate_shipping = 0.0
            
            return {
                'success': True,
                'base_cost_usd': base_cost_usd,
                'usa_shipping_cost': usa_shipping_cost,
                'price_tier': tier_info['tier_name'],
                'inclusion_strategy': policy['inclusion_strategy'],
                'final_price_usd': round(final_price, 2),
                'included_shipping': round(included_shipping, 2),
                'separate_shipping': round(separate_shipping, 2),
                'service_type': service_type
            }
            
        except Exception as e:
            logging.error(f"USA内包価格計算エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def calculate_regional_adjustment(self, usa_inclusion_result: Dict, target_region: str, 
                                      target_shipping_cost: float) -> Dict:
        """地域別差額調整計算"""
        try:
            if not usa_inclusion_result.get('success'):
                return {'success': False, 'error': 'USA内包結果が無効です'}
            
            usa_shipping = usa_inclusion_result['usa_shipping_cost']
            base_price = usa_inclusion_result['final_price_usd']
            
            # 地域差額計算
            shipping_difference = target_shipping_cost - usa_shipping
            
            # 調整後価格計算
            if shipping_difference > 0:
                # USA より高い地域：差額を送料として追加
                adjusted_price = base_price
                additional_shipping = shipping_difference
                total_cost = adjusted_price + additional_shipping
            else:
                # USA より安い地域：差額分を価格から割引
                price_discount = abs(shipping_difference)
                adjusted_price = max(base_price - price_discount, base_price * 0.9)  # 最低90%価格保持
                additional_shipping = 0.0
                total_cost = adjusted_price
            
            return {
                'success': True,
                'target_region': target_region,
                'usa_shipping_cost': usa_shipping,
                'target_shipping_cost': target_shipping_cost,
                'shipping_difference': round(shipping_difference, 2),
                'base_price': round(base_price, 2),
                'adjusted_price': round(adjusted_price, 2),
                'additional_shipping': round(additional_shipping, 2),
                'total_cost': round(total_cost, 2),
                'savings_vs_separate': round(usa_shipping + shipping_difference - additional_shipping, 2)
            }
            
        except Exception as e:
            logging.error(f"地域別調整計算エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_usa_base_rate(self, weight_min: float, weight_max: float, 
                            base_cost_usd: float, service_type: str = 'standard') -> bool:
        """USA基準送料更新"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO usa_base_shipping 
                    (weight_min, weight_max, base_cost_usd, service_type, last_updated)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (weight_min, weight_max, base_cost_usd, service_type))
                conn.commit()
                
                # キャッシュ更新
                self._load_usa_base_rates()
                
                logging.info(f"USA基準送料更新: {weight_min}-{weight_max}kg {service_type} ${base_cost_usd}")
                return True
                
        except Exception as e:
            logging.error(f"USA基準送料更新エラー: {e}")
            return False
    
    def bulk_update_usa_base_rates(self, rates_data: List[Dict]) -> Dict:
        """USA基準送料一括更新"""
        try:
            success_count = 0
            failed_count = 0
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                for rate in rates_data:
                    try:
                        cursor.execute("""
                            INSERT OR REPLACE INTO usa_base_shipping 
                            (weight_min, weight_max, base_cost_usd, service_type, last_updated)
                            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                        """, (
                            rate['weight_min'],
                            rate['weight_max'], 
                            rate['base_cost_usd'],
                            rate.get('service_type', 'standard')
                        ))
                        success_count += 1
                        
                    except Exception as e:
                        logging.error(f"個別更新エラー: {e}")
                        failed_count += 1
                
                conn.commit()
            
            # キャッシュ更新
            self._load_usa_base_rates()
            
            return {
                'success': True,
                'updated_count': success_count,
                'failed_count': failed_count,
                'total_processed': len(rates_data)
            }
            
        except Exception as e:
            logging.error(f"一括更新エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_calculation_example(self, sample_data: Dict) -> Dict:
        """計算例生成（テスト用）"""
        try:
            # サンプルデータでテスト計算
            result = self.calculate_usa_inclusion_price(
                base_cost_jpy=sample_data.get('cost_jpy', 3000),
                weight_kg=sample_data.get('weight_kg', 0.5),
                exchange_rate=sample_data.get('exchange_rate', 148.5),
                service_type=sample_data.get('service_type', 'standard')
            )
            
            if result['success']:
                # 地域別調整例
                regions_example = {}
                test_regions = {
                    'Canada': 22.0,
                    'Europe': 28.0,
                    'Asia': 16.0,
                    'Oceania': 32.0
                }
                
                for region, shipping_cost in test_regions.items():
                    regional_result = self.calculate_regional_adjustment(
                        result, region, shipping_cost
                    )
                    regions_example[region] = regional_result
                
                result['regional_examples'] = regions_example
            
            return result
            
        except Exception as e:
            logging.error(f"計算例生成エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
