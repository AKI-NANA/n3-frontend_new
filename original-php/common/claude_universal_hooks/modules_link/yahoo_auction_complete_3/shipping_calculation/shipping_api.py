#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
💰 送料・利益計算APIエンドポイント（MVP版）
PythonバックエンドAPI拡張 - 送料計算エディター機能
"""

from flask import Flask, request, jsonify
import requests
from pathlib import Path
import logging
from typing import Dict, List, Optional

# 送料管理システムのインポート
from shipping_calculation.shipping_rules_manager import ShippingRulesManager

class ShippingCalculationAPI:
    """送料計算API管理クラス"""
    
    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self.shipping_manager = ShippingRulesManager(self.data_dir / "shipping_calculation")
        
        # 外部API設定
        self.exchange_rate_cache = {'USD_JPY': 148.5, 'last_updated': None}
        self.ebay_fee_rates = {
            'basic_fee_percent': 10.0,
            'paypal_fee_percent': 3.49,
            'international_fee_percent': 1.5
        }
    
    def get_current_exchange_rate(self) -> float:
        """現在の為替レート取得"""
        try:
            # 為替レートAPI（無料版）
            response = requests.get(
                'https://api.exchangerate-api.com/v4/latest/USD',
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                rate = data['rates'].get('JPY', 148.5)
                self.exchange_rate_cache['USD_JPY'] = rate
                return rate
            else:
                return self.exchange_rate_cache['USD_JPY']
                
        except Exception as e:
            logging.warning(f"為替レート取得エラー: {e}")
            return self.exchange_rate_cache['USD_JPY']
    
    def calculate_ebay_fees(self, sale_price_usd: float) -> Dict[str, float]:
        """eBay手数料計算"""
        try:
            basic_fee = sale_price_usd * (self.ebay_fee_rates['basic_fee_percent'] / 100)
            paypal_fee = sale_price_usd * (self.ebay_fee_rates['paypal_fee_percent'] / 100)
            international_fee = sale_price_usd * (self.ebay_fee_rates['international_fee_percent'] / 100)
            
            total_fees = basic_fee + paypal_fee + international_fee
            
            return {
                'basic_fee': round(basic_fee, 2),
                'paypal_fee': round(paypal_fee, 2),
                'international_fee': round(international_fee, 2),
                'total_fees': round(total_fees, 2),
                'net_amount': round(sale_price_usd - total_fees, 2)
            }
        except Exception as e:
            logging.error(f"eBay手数料計算エラー: {e}")
            return {'error': str(e)}
    
    def comprehensive_calculation(self, request_data: Dict) -> Dict:
        """包括的価格計算"""
        try:
            # 入力データ抽出
            cost_jpy = float(request_data.get('cost_jpy', 0))
            category = request_data.get('category', 'Electronics')
            weight_kg = request_data.get('weight_kg')
            destination = request_data.get('destination', 'USA')
            shipping_type = request_data.get('shipping_type', 'standard')
            profit_margin = float(request_data.get('profit_margin', 0.25))
            
            # 重量推定（指定されていない場合）
            if weight_kg is None or weight_kg <= 0:
                weight_kg = self.shipping_manager.estimate_weight_by_category(category)
            else:
                weight_kg = float(weight_kg)
            
            # 現在の為替レート取得
            exchange_rate = self.get_current_exchange_rate()
            
            # 送料・価格計算
            price_result = self.shipping_manager.calculate_final_price(
                cost_jpy=cost_jpy,
                weight_kg=weight_kg,
                destination=destination,
                shipping_type=shipping_type,
                profit_margin=profit_margin,
                exchange_rate=exchange_rate
            )
            
            if not price_result.get('success'):
                return price_result
            
            # eBay手数料計算
            ebay_fees = self.calculate_ebay_fees(price_result['sale_price_usd'])
            
            # 最終利益計算（手数料考慮後）
            if 'error' not in ebay_fees:
                final_net_profit = ebay_fees['net_amount'] - price_result['total_cost_usd']
                final_profit_margin = final_net_profit / ebay_fees['net_amount'] if ebay_fees['net_amount'] > 0 else 0
                
                price_result.update({
                    'ebay_fees': ebay_fees,
                    'final_net_amount': ebay_fees['net_amount'],
                    'final_net_profit': round(final_net_profit, 2),
                    'final_profit_margin_percent': round(final_profit_margin * 100, 1)
                })
            
            # 推定重量情報追加
            price_result['weight_estimation'] = {
                'estimated_weight_kg': weight_kg,
                'category_used': category,
                'was_estimated': request_data.get('weight_kg') is None
            }
            
            return price_result
            
        except Exception as e:
            logging.error(f"包括的計算エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def batch_calculate(self, products_data: List[Dict]) -> List[Dict]:
        """バッチ計算（複数商品一括処理）"""
        results = []
        
        for product in products_data:
            try:
                result = self.comprehensive_calculation(product)
                result['product_id'] = product.get('product_id', '')
                result['title'] = product.get('title', '')
                results.append(result)
            except Exception as e:
                results.append({
                    'product_id': product.get('product_id', ''),
                    'success': False,
                    'error': str(e)
                })
        
        return results
    
    def test_calculation_accuracy(self) -> Dict:
        """計算精度テスト"""
        test_cases = [
            {
                'name': '軽量商品テスト',
                'cost_jpy': 1000,
                'weight_kg': 0.2,
                'category': 'Fashion',
                'destination': 'USA',
                'expected_range': {'min': 15, 'max': 25}
            },
            {
                'name': '中重量商品テスト',
                'cost_jpy': 5000,
                'weight_kg': 1.5,
                'category': 'Electronics',
                'destination': 'Europe',
                'expected_range': {'min': 50, 'max': 80}
            },
            {
                'name': '重量商品テスト',
                'cost_jpy': 10000,
                'weight_kg': 3.0,
                'category': 'Sports',
                'destination': 'Canada',
                'expected_range': {'min': 100, 'max': 150}
            }
        ]
        
        test_results = []
        
        for test_case in test_cases:
            result = self.comprehensive_calculation(test_case)
            
            if result.get('success'):
                final_price = result['sale_price_usd']
                expected_min = test_case['expected_range']['min']
                expected_max = test_case['expected_range']['max']
                
                in_range = expected_min <= final_price <= expected_max
                
                test_results.append({
                    'test_name': test_case['name'],
                    'calculated_price': final_price,
                    'expected_range': test_case['expected_range'],
                    'in_expected_range': in_range,
                    'result': 'PASS' if in_range else 'FAIL'
                })
            else:
                test_results.append({
                    'test_name': test_case['name'],
                    'result': 'ERROR',
                    'error': result.get('error')
                })
        
        return {
            'test_results': test_results,
            'pass_count': sum(1 for r in test_results if r.get('result') == 'PASS'),
            'total_tests': len(test_results)
        }

# Flask APIエンドポイント登録用関数
def register_shipping_calculation_routes(app: Flask, data_dir: Path):
    """送料計算APIルート登録"""
    
    shipping_api = ShippingCalculationAPI(data_dir)
    
    @app.route('/api/shipping/rules', methods=['GET'])
    def get_shipping_rules():
        """送料ルール一覧取得"""
        try:
            rules = shipping_api.shipping_manager.get_shipping_rules()
            return jsonify({
                'success': True,
                'data': rules,
                'count': len(rules)
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/shipping/rules', methods=['POST'])
    def save_shipping_rule():
        """送料ルール保存"""
        try:
            rule_data = request.get_json()
            success = shipping_api.shipping_manager.save_shipping_rule(rule_data)
            
            if success:
                return jsonify({
                    'success': True,
                    'message': 'ルールが保存されました'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'ルール保存に失敗しました'
                }), 400
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/shipping/rules/<int:rule_id>', methods=['DELETE'])
    def delete_shipping_rule(rule_id):
        """送料ルール削除"""
        try:
            success = shipping_api.shipping_manager.delete_shipping_rule(rule_id)
            
            if success:
                return jsonify({
                    'success': True,
                    'message': 'ルールが削除されました'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'ルール削除に失敗しました'
                }), 400
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/shipping/rules/reset', methods=['POST'])
    def reset_shipping_rules():
        """送料ルールをデフォルトにリセット"""
        try:
            shipping_api.shipping_manager.reset_to_defaults()
            return jsonify({
                'success': True,
                'message': 'デフォルト設定にリセットしました'
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/shipping/categories', methods=['GET'])
    def get_category_weights():
        """カテゴリ別重量設定取得"""
        try:
            weights = shipping_api.shipping_manager.get_category_weights()
            return jsonify({
                'success': True,
                'data': weights
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/shipping/categories', methods=['POST'])
    def save_category_weight():
        """カテゴリ重量設定保存"""
        try:
            data = request.get_json()
            success = shipping_api.shipping_manager.save_category_weight(
                data['category'],
                data['average_weight'],
                data['weight_variance']
            )
            
            if success:
                return jsonify({
                    'success': True,
                    'message': 'カテゴリ設定が保存されました'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'カテゴリ設定保存に失敗しました'
                }), 400
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/shipping/calculate', methods=['POST'])
    def calculate_shipping():
        """送料計算（単一商品）"""
        try:
            data = request.get_json()
            result = shipping_api.comprehensive_calculation(data)
            
            return jsonify({
                'success': result.get('success', True),
                'data': result
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/shipping/calculate/batch', methods=['POST'])
    def calculate_shipping_batch():
        """送料計算（バッチ処理）"""
        try:
            data = request.get_json()
            products = data.get('products', [])
            
            if not products:
                return jsonify({
                    'success': False,
                    'error': '商品データが空です'
                }), 400
            
            results = shipping_api.batch_calculate(products)
            
            success_count = sum(1 for r in results if r.get('success'))
            
            return jsonify({
                'success': True,
                'data': results,
                'summary': {
                    'total_products': len(products),
                    'success_count': success_count,
                    'failed_count': len(products) - success_count
                }
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/shipping/test', methods=['POST'])
    def test_calculation():
        """計算システムテスト"""
        try:
            test_results = shipping_api.test_calculation_accuracy()
            return jsonify({
                'success': True,
                'data': test_results
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/shipping/stats', methods=['GET'])
    def get_calculation_stats():
        """計算統計取得"""
        try:
            stats = shipping_api.shipping_manager.get_calculation_stats()
            
            # 為替レート情報追加
            current_rate = shipping_api.get_current_exchange_rate()
            stats['current_exchange_rate'] = current_rate
            
            return jsonify({
                'success': True,
                'data': stats
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/shipping/exchange_rate', methods=['GET'])
    def get_exchange_rate():
        """現在の為替レート取得"""
        try:
            rate = shipping_api.get_current_exchange_rate()
            return jsonify({
                'success': True,
                'data': {
                    'USD_JPY': rate,
                    'last_updated': 'now'
                }
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    # 設定管理エンドポイント
    @app.route('/api/shipping/config', methods=['GET'])
    def get_shipping_config():
        """送料設定取得"""
        try:
            return jsonify({
                'success': True,
                'data': {
                    'exchange_rate': shipping_api.exchange_rate_cache,
                    'ebay_fees': shipping_api.ebay_fee_rates,
                    'default_settings': {
                        'default_profit_margin': 0.25,
                        'default_destination': 'USA',
                        'default_shipping_type': 'standard'
                    }
                }
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/shipping/config', methods=['POST'])
    def update_shipping_config():
        """送料設定更新"""
        try:
            data = request.get_json()
            
            if 'ebay_fees' in data:
                shipping_api.ebay_fee_rates.update(data['ebay_fees'])
            
            return jsonify({
                'success': True,
                'message': '設定が更新されました'
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    return shipping_api
