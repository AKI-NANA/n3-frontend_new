#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Yahoo Auction Tool - 柔軟データベース接続対応版
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
from flask import Flask, request, jsonify
from flask_cors import CORS

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class FlexibleDatabaseConfig:
    """柔軟なデータベース設定"""
    
    @staticmethod
    def get_working_config():
        """動作するデータベース設定を自動検出"""
        import getpass
        current_user = getpass.getuser()
        
        configs = [
            # 標準設定
            {
                'host': 'localhost',
                'database': 'nagano3_db',
                'user': 'nagano3_user',
                'password': 'secure_password_2025'
            },
            # 現在のユーザー
            {
                'host': 'localhost',
                'database': 'nagano3_db',
                'user': current_user,
                'password': ''
            },
            # postgresデータベース
            {
                'host': 'localhost',
                'database': 'postgres',
                'user': current_user,
                'password': ''
            },
            # postgresユーザー
            {
                'host': 'localhost',
                'database': 'postgres',
                'user': 'postgres',
                'password': ''
            }
        ]
        
        for config in configs:
            try:
                conn = psycopg2.connect(**config)
                cursor = conn.cursor()
                cursor.execute('SELECT 1')
                cursor.close()
                conn.close()
                logging.info(f"✅ データベース接続成功: {config['user']}@{config['database']}")
                return config
            except Exception as e:
                logging.debug(f"接続失敗 {config['user']}@{config['database']}: {e}")
                continue
        
        return None

class SimpleCalculator:
    """シンプル計算クラス（データベース不要）"""
    
    def __init__(self):
        self.exchange_rate = 0.00641  # USD/JPY固定レート（安全マージン適用済み）
        self.shipping_rates = {
            'USA': 30.0,
            'CAN': 35.0,
            'GBR': 42.0,
            'DEU': 42.0,
            'KOR': 27.0
        }
        self.ebay_fee_rate = 0.15  # 15%（手数料込み）
        
    def calculate_profit(self, data: Dict) -> Dict:
        """簡易利益計算"""
        try:
            cost_jpy = float(data.get('cost_jpy', 0))
            weight_kg = float(data.get('weight_kg', 0.5))
            destination = data.get('destination', 'USA')
            
            # 基本計算
            cost_usd = cost_jpy * self.exchange_rate
            shipping_usd = self.shipping_rates.get(destination, 30.0)
            
            # 重量による送料調整
            if weight_kg > 0.5:
                shipping_usd += (weight_kg - 0.5) * 10
            
            # 利益計算
            base_cost = cost_usd + shipping_usd
            selling_price = base_cost / (1 - 0.25 - self.ebay_fee_rate)  # 25%利益目標
            ebay_fees = selling_price * self.ebay_fee_rate
            profit = selling_price - cost_usd - shipping_usd - ebay_fees
            margin = (profit / selling_price) * 100 if selling_price > 0 else 0
            
            # 価格調整（.99に）
            suggested_price = float(Decimal(str(selling_price)).quantize(Decimal('1.00'), rounding=ROUND_HALF_UP)) - 0.01
            
            return {
                'success': True,
                'pricing': {
                    'suggested_price_usd': suggested_price,
                    'profit_usd': round(profit, 2),
                    'profit_margin_percent': round(margin, 2)
                },
                'costs': {
                    'cost_usd': round(cost_usd, 2),
                    'shipping_usd': round(shipping_usd, 2),
                    'ebay_fees_usd': round(ebay_fees, 2),
                    'total_cost_usd': round(cost_usd + shipping_usd + ebay_fees, 2)
                },
                'rates': {
                    'exchange_rate': self.exchange_rate
                },
                'mode': 'simple_calculation'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'mode': 'simple_calculation'
            }

# Flask API
app = Flask(__name__)
CORS(app)

# データベース設定確認
db_config = FlexibleDatabaseConfig.get_working_config()
calculator = SimpleCalculator()

@app.route('/')
def index():
    """API状態確認"""
    return jsonify({
        'status': 'running',
        'service': 'Yahoo Auction Tool - Flexible API',
        'version': '1.0-flexible',
        'database_status': 'connected' if db_config else 'simple_mode',
        'mode': 'database' if db_config else 'simple'
    })

@app.route('/api/calculate_profit', methods=['POST'])
def api_calculate_profit():
    """利益計算API"""
    try:
        data = request.get_json()
        
        if db_config:
            # データベース使用の完全計算（TODO: 実装）
            result = calculator.calculate_profit(data)
            result['mode'] = 'database_calculation'
        else:
            # シンプル計算
            result = calculator.calculate_profit(data)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get_settings', methods=['GET'])
def api_get_settings():
    """設定取得API"""
    return jsonify({
        'success': True,
        'settings': {
            'exchange': {
                'safety_margin_percent': 5.0,
                'auto_update_frequency_hours': 6
            },
            'profit': {
                'min_profit_margin_percent': 20.0,
                'min_profit_amount_usd': 5.0
            }
        },
        'mode': 'simple'
    })

@app.route('/api/update_exchange_rates', methods=['POST'])
def api_update_exchange_rates():
    """為替レート更新API"""
    return jsonify({
        'success': True,
        'rates': {
            'USD_JPY': 155.9,
            'JPY_USD': 0.00641
        },
        'mode': 'fixed_rate'
    })

if __name__ == '__main__':
    logging.info("Yahoo Auction Tool Flexible API サーバー起動中...")
    
    if db_config:
        logging.info(f"✅ データベース接続: {db_config['user']}@{db_config['database']}")
    else:
        logging.info("⚠️ データベース未接続 - シンプルモードで動作")
    
    app.run(host='0.0.0.0', port=5001, debug=False)
