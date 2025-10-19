#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Yahoo Auction Tool - 送料・利益計算システム完全版 APIサーバー
過去の全決定事項を反映した最終実装
"""

import os
import sys
import logging
import json
import requests
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import schedule
import threading
import time

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/complete_system/api.log'),
        logging.StreamHandler()
    ]
)

class YahooAuctionProfitCalculator:
    """
    Yahoo Auction Tool 送料・利益計算メインクラス
    """
    
    def __init__(self):
        self.db_config = {
            'host': 'localhost',
            'database': 'nagano3_db',
            'user': 'nagano3_user',
            'password': 'secure_password_2025'
        }
        self.exchange_rate_cache = {}
        self.settings_cache = {}
        self.load_settings()
        
    def get_db_connection(self):
        """データベース接続取得"""
        try:
            conn = psycopg2.connect(**self.db_config)
            return conn
        except Exception as e:
            logging.error(f"データベース接続エラー: {e}")
            raise
    
    def load_settings(self):
        """設定読み込み"""
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT setting_category, setting_key, setting_value, setting_type
                FROM user_settings_extended
                WHERE user_id = 'default_user'
            """)
            
            for row in cursor.fetchall():
                category = row['setting_category']
                key = row['setting_key']
                value = row['setting_value']
                
                if row['setting_type'] == 'number':
                    value = float(value)
                elif row['setting_type'] == 'boolean':
                    value = value.lower() == 'true'
                
                if category not in self.settings_cache:
                    self.settings_cache[category] = {}
                self.settings_cache[category][key] = value
            
            cursor.close()
            conn.close()
            logging.info("設定読み込み完了")
            
        except Exception as e:
            logging.error(f"設定読み込みエラー: {e}")
            # デフォルト設定
            self.settings_cache = {
                'exchange': {
                    'safety_margin_percent': 5.0,
                    'auto_update_frequency_hours': 6
                },
                'profit': {
                    'min_profit_margin_percent': 20.0,
                    'min_profit_amount_usd': 5.0
                },
                'shipping': {
                    'default_destination': 'USA',
                    'usa_baseline_enabled': True
                }
            }
    
    def update_exchange_rates(self):
        """為替レート更新（安全マージン適用）"""
        try:
            # 複数のAPIを試行
            apis = [
                {
                    'url': 'https://api.exchangerate-api.com/v4/latest/USD',
                    'source': 'ExchangeRate-API'
                },
                {
                    'url': 'https://api.fixer.io/latest?access_key=YOUR_API_KEY&base=USD',
                    'source': 'Fixer.io'
                }
            ]
            
            for api in apis:
                try:
                    response = requests.get(api['url'], timeout=10)
                    data = response.json()
                    
                    if 'rates' in data and 'JPY' in data['rates']:
                        raw_rate = float(data['rates']['JPY'])
                        safety_margin = self.settings_cache.get('exchange', {}).get('safety_margin_percent', 5.0)
                        
                        # 安全マージン適用
                        adjusted_rate = raw_rate * (1 + safety_margin / 100)
                        
                        # データベース保存
                        conn = self.get_db_connection()
                        cursor = conn.cursor()
                        
                        cursor.execute("""
                            INSERT INTO exchange_rates_extended 
                            (from_currency, to_currency, raw_rate, safety_margin_percent, adjusted_rate, source)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            ON CONFLICT (from_currency, to_currency)
                            DO UPDATE SET 
                                raw_rate = EXCLUDED.raw_rate,
                                adjusted_rate = EXCLUDED.adjusted_rate,
                                fetched_at = NOW()
                        """, ('USD', 'JPY', raw_rate, safety_margin, adjusted_rate, api['source']))
                        
                        # 逆レート
                        usd_rate = 1 / raw_rate
                        adjusted_usd_rate = usd_rate * (1 - safety_margin / 100)
                        
                        cursor.execute("""
                            INSERT INTO exchange_rates_extended 
                            (from_currency, to_currency, raw_rate, safety_margin_percent, adjusted_rate, source)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            ON CONFLICT (from_currency, to_currency)
                            DO UPDATE SET 
                                raw_rate = EXCLUDED.raw_rate,
                                adjusted_rate = EXCLUDED.adjusted_rate,
                                fetched_at = NOW()
                        """, ('JPY', 'USD', usd_rate, safety_margin, adjusted_usd_rate, api['source']))
                        
                        conn.commit()
                        cursor.close()
                        conn.close()
                        
                        self.exchange_rate_cache = {
                            'USD_JPY': adjusted_rate,
                            'JPY_USD': adjusted_usd_rate,
                            'last_updated': datetime.now(),
                            'source': api['source']
                        }
                        
                        logging.info(f"為替レート更新成功: USD/JPY = {adjusted_rate:.2f} (安全マージン{safety_margin}%適用)")
                        return True
                        
                except Exception as e:
                    logging.warning(f"{api['source']} API エラー: {e}")
                    continue
            
            # 全API失敗時はキャッシュまたはデフォルト値使用
            if not self.exchange_rate_cache:
                self.exchange_rate_cache = {
                    'USD_JPY': 156.0,  # 5%マージン適用済みデフォルト
                    'JPY_USD': 0.00641,
                    'last_updated': datetime.now(),
                    'source': 'default'
                }
            
            return False
            
        except Exception as e:
            logging.error(f"為替レート更新エラー: {e}")
            return False
    
    def get_current_exchange_rate(self, from_currency='JPY', to_currency='USD'):
        """現在の為替レート取得"""
        try:
            # キャッシュチェック（6時間以内なら使用）
            if self.exchange_rate_cache and 'last_updated' in self.exchange_rate_cache:
                if datetime.now() - self.exchange_rate_cache['last_updated'] < timedelta(hours=6):
                    return self.exchange_rate_cache.get(f'{from_currency}_{to_currency}', 0.00641)
            
            # データベースから最新レート取得
            conn = self.get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT adjusted_rate, fetched_at 
                FROM exchange_rates_extended 
                WHERE from_currency = %s AND to_currency = %s
                ORDER BY fetched_at DESC 
                LIMIT 1
            """, (from_currency, to_currency))
            
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if result and datetime.now() - result['fetched_at'] < timedelta(hours=24):
                return float(result['adjusted_rate'])
            else:
                # レート更新実行
                self.update_exchange_rates()
                return self.exchange_rate_cache.get(f'{from_currency}_{to_currency}', 0.00641)
                
        except Exception as e:
            logging.error(f"為替レート取得エラー: {e}")
            return 0.00641  # デフォルト値（安全マージン適用済み）
    
    def estimate_weight_by_category(self, ebay_category_id: str) -> float:
        """カテゴリー別重量推定"""
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT default_weight_kg, confidence_level
                FROM category_weight_estimation
                WHERE ebay_category_id = %s AND is_active = TRUE
            """, (ebay_category_id,))
            
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if result:
                return float(result['default_weight_kg'])
            else:
                # デフォルトカテゴリーの重量使用
                return 0.6  # 600g
                
        except Exception as e:
            logging.error(f"重量推定エラー: {e}")
            return 0.6
    
    def calculate_shipping_cost(self, weight_kg: float, destination: str = 'USA', service_code: str = 'ELOGI_FEDEX_IE') -> Dict:
        """送料計算（USA基準+地域差額）"""
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # USA基準送料取得
            cursor.execute("""
                SELECT sr.base_cost_usd, sr.usa_price_differential
                FROM shipping_rates sr
                JOIN shipping_services ss ON sr.service_id = ss.service_id
                WHERE ss.service_code = %s
                  AND sr.destination_country_code = %s
                  AND sr.weight_from_kg <= %s
                  AND sr.weight_to_kg >= %s
                  AND sr.is_active = TRUE
                ORDER BY sr.weight_from_kg DESC
                LIMIT 1
            """, (service_code, destination, weight_kg, weight_kg))
            
            result = cursor.fetchone()
            
            if not result:
                # デフォルト送料
                cursor.close()
                conn.close()
                return {
                    'base_cost_usd': 30.00,
                    'usa_differential': 0.00,
                    'total_cost_usd': 30.00,
                    'service_used': service_code,
                    'method': 'default'
                }
            
            base_cost = float(result['base_cost_usd'])
            usa_differential = float(result['usa_price_differential'] or 0.00)
            
            # 追加費用取得（燃油サーチャージ等）
            cursor.execute("""
                SELECT af.fee_name, af.cost_type, af.fixed_cost_usd, af.percentage_rate
                FROM additional_fees af
                JOIN shipping_services ss ON af.service_id = ss.service_id
                WHERE ss.service_code = %s
                  AND af.is_active = TRUE
                  AND (af.min_weight_kg IS NULL OR af.min_weight_kg <= %s)
                  AND (af.max_weight_kg IS NULL OR af.max_weight_kg >= %s)
            """, (service_code, weight_kg, weight_kg))
            
            additional_fees = cursor.fetchall()
            cursor.close()
            conn.close()
            
            # 追加費用計算
            total_additional = 0.0
            fee_breakdown = []
            
            for fee in additional_fees:
                if fee['cost_type'] == 'fixed':
                    fee_amount = float(fee['fixed_cost_usd'])
                elif fee['cost_type'] == 'percentage':
                    fee_amount = base_cost * float(fee['percentage_rate'])
                else:
                    fee_amount = 0.0
                
                total_additional += fee_amount
                fee_breakdown.append({
                    'name': fee['fee_name'],
                    'amount': round(fee_amount, 2),
                    'type': fee['cost_type']
                })
            
            total_cost = base_cost + total_additional
            
            return {
                'base_cost_usd': base_cost,
                'additional_fees': fee_breakdown,
                'total_additional_usd': round(total_additional, 2),
                'usa_differential': usa_differential,
                'total_cost_usd': round(total_cost, 2),
                'service_used': service_code,
                'destination': destination,
                'weight_kg': weight_kg
            }
            
        except Exception as e:
            logging.error(f"送料計算エラー: {e}")
            return {
                'base_cost_usd': 30.00,
                'total_cost_usd': 30.00,
                'error': str(e)
            }
    
    def get_ebay_fees(self, ebay_category_id: str, selling_price_usd: float) -> Dict:
        """eBay手数料計算"""
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT final_value_fee_percent, payment_fee_percent, payment_fee_fixed_usd, international_fee_percent
                FROM ebay_fees
                WHERE ebay_category_id = %s AND is_active = TRUE
                ORDER BY effective_from DESC
                LIMIT 1
            """, (ebay_category_id,))
            
            result = cursor.fetchone()
            
            if not result:
                # デフォルト手数料取得
                cursor.execute("""
                    SELECT final_value_fee_percent, payment_fee_percent, payment_fee_fixed_usd, international_fee_percent
                    FROM ebay_fees
                    WHERE ebay_category_id = 'default' AND is_active = TRUE
                """)
                result = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if not result:
                # ハードコードされたデフォルト
                result = {
                    'final_value_fee_percent': 10.35,
                    'payment_fee_percent': 2.90,
                    'payment_fee_fixed_usd': 0.30,
                    'international_fee_percent': 1.65
                }
            
            # 手数料計算
            final_value_fee = selling_price_usd * (float(result['final_value_fee_percent']) / 100)
            payment_fee = selling_price_usd * (float(result['payment_fee_percent']) / 100) + float(result['payment_fee_fixed_usd'])
            international_fee = selling_price_usd * (float(result['international_fee_percent']) / 100)
            
            total_fees = final_value_fee + payment_fee + international_fee
            
            return {
                'final_value_fee': round(final_value_fee, 2),
                'payment_fee': round(payment_fee, 2),
                'international_fee': round(international_fee, 2),
                'total_fees': round(total_fees, 2),
                'category_used': ebay_category_id
            }
            
        except Exception as e:
            logging.error(f"eBay手数料計算エラー: {e}")
            # デフォルト手数料（安全値）
            default_total = selling_price_usd * 0.15  # 15%
            return {
                'total_fees': round(default_total, 2),
                'error': str(e)
            }
    
    def calculate_comprehensive_profit(self, data: Dict) -> Dict:
        """包括的利益計算（メイン機能）"""
        try:
            # 入力データ抽出
            item_code = data.get('item_code')
            cost_jpy = float(data.get('cost_jpy', 0))
            weight_kg = data.get('weight_kg')
            ebay_category_id = data.get('ebay_category_id', 'default')
            destination = data.get('destination', 'USA')
            profit_margin_target = float(data.get('profit_margin_target', 25.0))
            
            # 重量推定（未指定時）
            if not weight_kg or weight_kg <= 0:
                weight_kg = self.estimate_weight_by_category(ebay_category_id)
            else:
                weight_kg = float(weight_kg)
            
            # 為替レート取得
            exchange_rate = self.get_current_exchange_rate()
            cost_usd = cost_jpy * exchange_rate
            
            # 送料計算
            shipping_result = self.calculate_shipping_cost(weight_kg, destination)
            shipping_cost_usd = shipping_result['total_cost_usd']
            
            # 基本コスト
            base_cost_usd = cost_usd + shipping_cost_usd
            
            # 目標利益率から販売価格逆算
            # 販売価格 = 基本コスト / (1 - 利益率 - 手数料率)
            # eBay手数料を15%と仮定して逆算
            estimated_fee_rate = 0.15
            target_margin_rate = profit_margin_target / 100
            
            estimated_selling_price = base_cost_usd / (1 - target_margin_rate - estimated_fee_rate)
            
            # eBay手数料正確計算
            ebay_fees_result = self.get_ebay_fees(ebay_category_id, estimated_selling_price)
            actual_fees_usd = ebay_fees_result['total_fees']
            
            # 最終利益計算
            total_cost_usd = base_cost_usd + actual_fees_usd
            profit_usd = estimated_selling_price - total_cost_usd
            profit_margin = (profit_usd / estimated_selling_price) * 100 if estimated_selling_price > 0 else 0
            
            # 心理的価格調整（.99に調整）
            if estimated_selling_price < 10:
                suggested_price = float(Decimal(str(estimated_selling_price)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)) - 0.01
            else:
                suggested_price = float(Decimal(str(estimated_selling_price)).quantize(Decimal('1.00'), rounding=ROUND_HALF_UP)) - 0.01
            
            # 調整後の利益再計算
            final_fees = self.get_ebay_fees(ebay_category_id, suggested_price)['total_fees']
            final_profit = suggested_price - cost_usd - shipping_cost_usd - final_fees
            final_margin = (final_profit / suggested_price) * 100 if suggested_price > 0 else 0
            
            # 計算履歴保存
            calculation_id = self.save_calculation_history({
                'item_code': item_code,
                'input_cost_jpy': cost_jpy,
                'input_weight_kg': weight_kg,
                'destination_country': destination,
                'exchange_rate_used': exchange_rate,
                'shipping_cost_usd': shipping_cost_usd,
                'ebay_fees_total_usd': final_fees,
                'total_cost_usd': cost_usd + shipping_cost_usd + final_fees,
                'selling_price_usd': suggested_price,
                'profit_usd': final_profit,
                'profit_margin_percent': final_margin,
                'cost_breakdown': {
                    'cost_usd': cost_usd,
                    'shipping': shipping_result,
                    'ebay_fees': ebay_fees_result
                }
            })
            
            return {
                'success': True,
                'calculation_id': calculation_id,
                'input': {
                    'cost_jpy': cost_jpy,
                    'weight_kg': weight_kg,
                    'destination': destination,
                    'ebay_category_id': ebay_category_id
                },
                'rates': {
                    'exchange_rate': exchange_rate,
                    'source': self.exchange_rate_cache.get('source', 'database')
                },
                'costs': {
                    'cost_jpy': cost_jpy,
                    'cost_usd': round(cost_usd, 2),
                    'shipping_usd': shipping_cost_usd,
                    'ebay_fees_usd': round(final_fees, 2),
                    'total_cost_usd': round(cost_usd + shipping_cost_usd + final_fees, 2)
                },
                'pricing': {
                    'calculated_price_usd': round(estimated_selling_price, 2),
                    'suggested_price_usd': suggested_price,
                    'profit_usd': round(final_profit, 2),
                    'profit_margin_percent': round(final_margin, 2)
                },
                'shipping_detail': shipping_result,
                'ebay_fees_detail': ebay_fees_result,
                'warnings': self.generate_warnings(final_margin, final_profit)
            }
            
        except Exception as e:
            logging.error(f"包括的利益計算エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_warnings(self, profit_margin: float, profit_amount: float) -> List[str]:
        """警告生成"""
        warnings = []
        
        min_margin = self.settings_cache.get('profit', {}).get('min_profit_margin_percent', 20.0)
        min_amount = self.settings_cache.get('profit', {}).get('min_profit_amount_usd', 5.0)
        
        if profit_margin < min_margin:
            warnings.append(f"利益率が目標値{min_margin}%を下回っています ({profit_margin:.1f}%)")
        
        if profit_amount < min_amount:
            warnings.append(f"利益額が目標値${min_amount}を下回っています (${profit_amount:.2f})")
        
        return warnings
    
    def save_calculation_history(self, data: Dict) -> int:
        """計算履歴保存"""
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO profit_calculation_history 
                (item_code, input_cost_jpy, input_weight_kg, destination_country,
                 exchange_rate_used, shipping_cost_usd, ebay_fees_total_usd,
                 total_cost_usd, selling_price_usd, profit_usd, profit_margin_percent,
                 cost_breakdown)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING calculation_id
            """, (
                data.get('item_code'),
                data.get('input_cost_jpy'),
                data.get('input_weight_kg'),
                data.get('destination_country'),
                data.get('exchange_rate_used'),
                data.get('shipping_cost_usd'),
                data.get('ebay_fees_total_usd'),
                data.get('total_cost_usd'),
                data.get('selling_price_usd'),
                data.get('profit_usd'),
                data.get('profit_margin_percent'),
                json.dumps(data.get('cost_breakdown'), default=str)
            ))
            
            calculation_id = cursor.fetchone()[0]
            conn.commit()
            cursor.close()
            conn.close()
            
            return calculation_id
            
        except Exception as e:
            logging.error(f"計算履歴保存エラー: {e}")
            return 0
    
    def batch_recalculate_all(self) -> Dict:
        """全商品一括再計算"""
        try:
            # バッチ処理開始ログ
            batch_id = self.start_batch_log('recalculate_all')
            
            conn = self.get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # 更新が必要な商品取得
            cursor.execute("""
                SELECT item_code, cost_jpy, weight_kg, ebay_category_id
                FROM item_master_extended
                WHERE last_update_at > COALESCE(last_calculation_at, '1970-01-01'::timestamp)
                   OR last_calculation_at IS NULL
            """)
            
            items = cursor.fetchall()
            total_items = len(items)
            processed = 0
            failed = 0
            
            for item in items:
                try:
                    # 各商品の利益計算
                    result = self.calculate_comprehensive_profit({
                        'item_code': item['item_code'],
                        'cost_jpy': item['cost_jpy'],
                        'weight_kg': item['weight_kg'],
                        'ebay_category_id': item['ebay_category_id']
                    })
                    
                    if result['success']:
                        # 商品マスター更新
                        cursor.execute("""
                            UPDATE item_master_extended
                            SET calculated_selling_price_usd = %s,
                                estimated_profit_usd = %s,
                                estimated_profit_margin_percent = %s,
                                usa_shipping_cost_usd = %s,
                                last_calculation_at = NOW()
                            WHERE item_code = %s
                        """, (
                            result['pricing']['suggested_price_usd'],
                            result['pricing']['profit_usd'],
                            result['pricing']['profit_margin_percent'],
                            result['shipping_detail']['total_cost_usd'],
                            item['item_code']
                        ))
                        processed += 1
                    else:
                        failed += 1
                        
                except Exception as e:
                    logging.error(f"商品{item['item_code']}の計算エラー: {e}")
                    failed += 1
            
            conn.commit()
            cursor.close()
            conn.close()
            
            # バッチ処理完了ログ
            self.complete_batch_log(batch_id, total_items, processed, failed)
            
            return {
                'success': True,
                'batch_id': batch_id,
                'total_items': total_items,
                'processed_items': processed,
                'failed_items': failed
            }
            
        except Exception as e:
            logging.error(f"一括再計算エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_batch_log(self, batch_type: str) -> int:
        """バッチ処理開始ログ"""
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO batch_processing_log (batch_type, status)
                VALUES (%s, 'running')
                RETURNING batch_id
            """, (batch_type,))
            
            batch_id = cursor.fetchone()[0]
            conn.commit()
            cursor.close()
            conn.close()
            
            return batch_id
            
        except Exception as e:
            logging.error(f"バッチログ開始エラー: {e}")
            return 0
    
    def complete_batch_log(self, batch_id: int, total: int, processed: int, failed: int):
        """バッチ処理完了ログ"""
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE batch_processing_log
                SET completed_at = NOW(),
                    status = 'completed',
                    total_items = %s,
                    processed_items = %s,
                    failed_items = %s
                WHERE batch_id = %s
            """, (total, processed, failed, batch_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            
        except Exception as e:
            logging.error(f"バッチログ完了エラー: {e}")

# Flask API サーバー
app = Flask(__name__)
CORS(app)

# グローバルインスタンス
calculator = YahooAuctionProfitCalculator()

@app.route('/')
def index():
    """APIサーバー状態確認"""
    return jsonify({
        'status': 'running',
        'service': 'Yahoo Auction Tool - Profit Calculator API',
        'version': '1.0',
        'endpoints': [
            '/api/calculate_profit',
            '/api/recalculate_all',
            '/api/update_exchange_rates',
            '/api/get_settings',
            '/api/update_settings',
            '/api/get_shipping_matrix'
        ]
    })

@app.route('/api/calculate_profit', methods=['POST'])
def api_calculate_profit():
    """利益計算API"""
    try:
        data = request.get_json()
        result = calculator.calculate_comprehensive_profit(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/recalculate_all', methods=['POST'])
def api_recalculate_all():
    """全商品一括再計算API"""
    try:
        result = calculator.batch_recalculate_all()
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/update_exchange_rates', methods=['POST'])
def api_update_exchange_rates():
    """為替レート更新API"""
    try:
        success = calculator.update_exchange_rates()
        return jsonify({
            'success': success,
            'rates': calculator.exchange_rate_cache
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get_settings', methods=['GET'])
def api_get_settings():
    """設定取得API"""
    try:
        return jsonify({
            'success': True,
            'settings': calculator.settings_cache
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/update_settings', methods=['POST'])
def api_update_settings():
    """設定更新API"""
    try:
        data = request.get_json()
        
        conn = calculator.get_db_connection()
        cursor = conn.cursor()
        
        for category, settings in data.items():
            for key, value in settings.items():
                cursor.execute("""
                    INSERT INTO user_settings_extended 
                    (setting_category, setting_key, setting_value, setting_type)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (user_id, setting_category, setting_key)
                    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
                """, (category, key, str(value), type(value).__name__))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # キャッシュ更新
        calculator.load_settings()
        
        return jsonify({'success': True, 'message': '設定を更新しました'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get_shipping_matrix', methods=['GET'])
def api_get_shipping_matrix():
    """送料マトリックス取得API"""
    try:
        conn = calculator.get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT 
                ss.carrier_name,
                ss.service_name,
                sr.destination_country_code,
                sr.weight_from_kg,
                sr.weight_to_kg,
                sr.base_cost_usd,
                sr.usa_price_differential
            FROM shipping_rates sr
            JOIN shipping_services ss ON sr.service_id = ss.service_id
            WHERE ss.is_active = TRUE AND sr.is_active = TRUE
            ORDER BY ss.carrier_name, ss.service_name, sr.destination_country_code, sr.weight_from_kg
        """)
        
        matrix_data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'matrix_data': [dict(row) for row in matrix_data]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def run_scheduler():
    """スケジューラー実行"""
    schedule.every(6).hours.do(calculator.update_exchange_rates)
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == '__main__':
    # 初期化
    logging.info("Yahoo Auction Tool API サーバー起動中...")
    
    # 為替レート初期取得
    calculator.update_exchange_rates()
    
    # スケジューラー開始
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    
    # APIサーバー起動
    app.run(host='0.0.0.0', port=5001, debug=False)
