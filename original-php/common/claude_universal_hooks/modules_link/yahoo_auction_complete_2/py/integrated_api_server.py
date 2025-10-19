#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 送料・利益計算エディター 統合APIサーバー（完成版）
既存のAPIサーバーに送料計算機能を統合
"""

from workflow_api_server import *
from shipping_calculation.shipping_api import register_shipping_calculation_routes
from pathlib import Path
import logging

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# データディレクトリ設定
CURRENT_DIR = Path(__file__).parent
DATA_DIR = CURRENT_DIR / "yahoo_ebay_data"

# 送料計算API統合
def create_integrated_app():
    """統合アプリケーション作成"""
    
    # 送料計算API登録
    shipping_api = register_shipping_calculation_routes(app, DATA_DIR)
    
    # 新しいエンドポイント - データベースとの統合
    @app.route('/api/products/calculate_all', methods=['POST'])
    def calculate_all_products():
        """全商品に送料計算適用"""
        try:
            # 既存商品データ取得
            if not workflow.csv_path.exists():
                return jsonify({
                    'success': False,
                    'error': '商品データが見つかりません'
                }), 400
            
            df = pd.read_csv(workflow.csv_path, encoding='utf-8')
            products = df.to_dict('records')
            
            # バッチ計算実行
            results = shipping_api.batch_calculate(products)
            
            # 結果をCSVに保存
            calculated_df = pd.DataFrame(results)
            calculated_csv_path = DATA_DIR / "calculated_products.csv"
            calculated_df.to_csv(calculated_csv_path, index=False, encoding='utf-8')
            
            success_count = sum(1 for r in results if r.get('success'))
            
            return jsonify({
                'success': True,
                'data': results,
                'summary': {
                    'total_products': len(products),
                    'calculated_count': success_count,
                    'failed_count': len(products) - success_count
                },
                'csv_saved': str(calculated_csv_path)
            })
            
        except Exception as e:
            logging.error(f"全商品計算エラー: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/products/update_pricing', methods=['POST'])
    def update_product_pricing():
        """商品価格更新"""
        try:
            data = request.get_json()
            product_id = data.get('product_id')
            pricing_data = data.get('pricing_data')
            
            if not product_id or not pricing_data:
                return jsonify({
                    'success': False,
                    'error': '商品IDまたは価格データが不足しています'
                }), 400
            
            # CSV読み込み
            if not workflow.csv_path.exists():
                return jsonify({
                    'success': False,
                    'error': '商品データファイルが見つかりません'
                }), 400
            
            df = pd.read_csv(workflow.csv_path, encoding='utf-8')
            
            # 商品データ更新
            mask = df['product_id'] == product_id
            if not mask.any():
                return jsonify({
                    'success': False,
                    'error': '指定された商品IDが見つかりません'
                }), 404
            
            # 価格データを更新
            for key, value in pricing_data.items():
                if key in df.columns:
                    df.loc[mask, key] = value
            
            # ステータス更新
            df.loc[mask, 'status'] = 'calculated'
            df.loc[mask, 'calculated_at'] = datetime.now().isoformat()
            
            # CSV保存
            df.to_csv(workflow.csv_path, index=False, encoding='utf-8')
            
            return jsonify({
                'success': True,
                'message': f'商品ID {product_id} の価格が更新されました'
            })
            
        except Exception as e:
            logging.error(f"商品価格更新エラー: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/dashboard/shipping_summary', methods=['GET'])
    def get_shipping_dashboard_summary():
        """送料計算ダッシュボードサマリー"""
        try:
            # 統計情報取得
            stats = shipping_api.shipping_manager.get_calculation_stats()
            
            # 現在の為替レート
            current_rate = shipping_api.get_current_exchange_rate()
            
            # 商品データ統計
            product_stats = {'total': 0, 'calculated': 0, 'pending': 0}
            
            if workflow.csv_path.exists():
                df = pd.read_csv(workflow.csv_path, encoding='utf-8')
                product_stats['total'] = len(df)
                product_stats['calculated'] = len(df[df['status'] == 'calculated'])
                product_stats['pending'] = len(df[df['status'] == 'scraped'])
            
            # 送料ルール統計
            rules = shipping_api.shipping_manager.get_shipping_rules()
            rule_stats = {
                'total_rules': len(rules),
                'enabled_rules': len([r for r in rules if r['enabled']]),
                'destinations': len(set(r['destination'] for r in rules))
            }
            
            return jsonify({
                'success': True,
                'data': {
                    'calculation_stats': stats,
                    'product_stats': product_stats,
                    'rule_stats': rule_stats,
                    'exchange_rate': {
                        'USD_JPY': current_rate,
                        'last_updated': 'now'
                    }
                }
            })
            
        except Exception as e:
            logging.error(f"ダッシュボードサマリーエラー: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    # システム状態取得の拡張
    @app.route('/system_status_extended')
    def system_status_extended():
        """拡張システム状態"""
        try:
            # 基本システム状態
            base_status = get_system_status()
            
            # 送料計算システム状態
            shipping_stats = shipping_api.shipping_manager.get_calculation_stats()
            
            # 統合状態
            extended_status = {
                'base_system': base_status,
                'shipping_calculation': {
                    'enabled': True,
                    'total_calculations': shipping_stats.get('total_calculations', 0),
                    'avg_shipping_cost': shipping_stats.get('avg_shipping_cost', 0),
                    'current_exchange_rate': shipping_api.get_current_exchange_rate()
                }
            }
            
            return jsonify({
                'success': True,
                'data': extended_status
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    return app

# システム開始関数の拡張
def start_integrated_system():
    """統合システム開始"""
    print("🚀 Yahoo→eBay統合ワークフロー + 送料計算エディター起動中...")
    
    # データディレクトリ作成
    DATA_DIR.mkdir(exist_ok=True)
    (DATA_DIR / "shipping_calculation").mkdir(exist_ok=True)
    
    # 統合アプリ作成
    integrated_app = create_integrated_app()
    
    # ポート検出
    port = find_free_port()
    
    print(f"🌐 メインURL: http://localhost:{port}")
    print("🎯 === 送料・利益計算エディター機能 ===")
    print("• 送料ルール管理")
    print("• カテゴリ別重量推定")
    print("• バッチ計算処理")
    print("• 為替連動価格計算")
    print("• eBay手数料自動計算")
    print("• 計算履歴・統計管理")
    print("📊 === 新APIエンドポイント ===")
    print("• /api/shipping/rules - 送料ルール管理")
    print("• /api/shipping/calculate - 単一商品計算")
    print("• /api/shipping/calculate/batch - バッチ計算")
    print("• /api/products/calculate_all - 全商品計算")
    print("• /api/dashboard/shipping_summary - ダッシュボード統計")
    
    # サーバー起動
    integrated_app.run(host='127.0.0.1', port=port, debug=True, use_reloader=False)

if __name__ == '__main__':
    start_integrated_system()
