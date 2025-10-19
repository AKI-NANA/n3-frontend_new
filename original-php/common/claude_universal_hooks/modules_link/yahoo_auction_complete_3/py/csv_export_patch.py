#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV出力機能追加パッチ
既存のintegrated_api_server.pyにCSV出力機能を追加
"""

import sqlite3
import csv
import io
import time
from pathlib import Path

def add_csv_export_methods():
    """CSV出力メソッドをAPIクラスに追加"""
    
    # IntegratedYahooEbayAPIクラスに追加するメソッド
    csv_methods = '''
    def export_shipping_matrix_csv(self):
        """送料マトリックスCSV出力"""
        try:
            # CSVデータ作成
            output = io.StringIO()
            writer = csv.writer(output)
            
            # ヘッダー
            countries = ['USA', 'CAN', 'GBR', 'DEU', 'AUS', 'KOR', 'FRA', 'ITA', 'ESP']
            headers = ['重量(kg)'] + [f'{country}_Economy' for country in countries] + [f'{country}_Priority' for country in countries]
            writer.writerow(headers)
            
            # データ行
            weights = [0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0]
            for weight in weights:
                row = [f'{weight:.1f}']
                
                # Economy料金
                for country in countries:
                    base_rate = self.shipping_rates.get(country, {}).get('economy', 25.0)
                    cost = base_rate + (weight * 8)
                    row.append(f'{cost:.2f}')
                
                # Priority料金
                for country in countries:
                    base_rate = self.shipping_rates.get(country, {}).get('priority', 35.0)
                    cost = base_rate + (weight * 10)
                    row.append(f'{cost:.2f}')
                
                writer.writerow(row)
            
            csv_content = output.getvalue()
            output.close()
            
            return {
                'success': True,
                'csv_content': csv_content,
                'filename': f'shipping_matrix_{time.strftime("%Y%m%d_%H%M%S")}.csv',
                'rows': len(weights) + 1,  # データ行 + ヘッダー
                'note': '送料マトリックス - Economy/Priority料金'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def export_products_csv(self, limit=1000):
        """商品データCSV出力"""
        try:
            db_path = self.data_dir / "integrated_data.db"
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            # データ取得
            cursor.execute('''
                SELECT id, title_jp, title_en, price_jpy, price_usd, 
                       source_url, status, category_id, condition_text,
                       weight_kg, shipping_cost_usd, profit_usd,
                       scraped_at, updated_at
                FROM products 
                ORDER BY id DESC
                LIMIT ?
            ''', (limit,))
            
            rows = cursor.fetchall()
            
            # CSV作成
            output = io.StringIO()
            writer = csv.writer(output)
            
            # ヘッダー
            headers = [
                'ID', '商品名(日)', '商品名(英)', '価格(円)', '価格(USD)', 
                'URL', 'ステータス', 'カテゴリ', 'コンディション',
                '重量(kg)', '送料(USD)', '利益(USD)', 
                'スクレイピング日時', '更新日時'
            ]
            writer.writerow(headers)
            
            # データ行
            for row in rows:
                writer.writerow([
                    row[0],  # ID
                    row[1] or '',  # title_jp
                    row[2] or '',  # title_en
                    row[3] or 0,   # price_jpy
                    row[4] or 0,   # price_usd
                    row[5] or '',  # source_url
                    row[6] or '',  # status
                    row[7] or '',  # category_id
                    row[8] or '',  # condition_text
                    row[9] or 0,   # weight_kg
                    row[10] or 0,  # shipping_cost_usd
                    row[11] or 0,  # profit_usd
                    row[12] or '',  # scraped_at
                    row[13] or ''   # updated_at
                ])
            
            conn.close()
            
            csv_content = output.getvalue()
            output.close()
            
            return {
                'success': True,
                'csv_content': csv_content,
                'filename': f'products_export_{time.strftime("%Y%m%d_%H%M%S")}.csv',
                'rows': len(rows) + 1,
                'note': f'商品データ {len(rows)}件をエクスポート'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def export_shipping_calculations_csv(self):
        """送料計算履歴CSV出力"""
        try:
            db_path = self.data_dir / "integrated_data.db"
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT weight_kg, destination, service_type, cost_usd, calculated_at
                FROM shipping_calculations 
                ORDER BY calculated_at DESC
                LIMIT 1000
            ''')
            
            rows = cursor.fetchall()
            
            # CSV作成
            output = io.StringIO()
            writer = csv.writer(output)
            
            # ヘッダー
            headers = ['重量(kg)', '配送先', 'サービス', '送料(USD)', '計算日時']
            writer.writerow(headers)
            
            # データ行
            for row in rows:
                writer.writerow(row)
            
            conn.close()
            
            csv_content = output.getvalue()
            output.close()
            
            return {
                'success': True,
                'csv_content': csv_content,
                'filename': f'shipping_calculations_{time.strftime("%Y%m%d_%H%M%S")}.csv',
                'rows': len(rows) + 1,
                'note': f'送料計算履歴 {len(rows)}件をエクスポート'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    '''
    
    return csv_methods

def add_csv_endpoints():
    """CSV出力エンドポイントを追加"""
    
    csv_endpoints = '''
        elif path == '/export/shipping_matrix':
            response_data = self.api.export_shipping_matrix_csv()
            
        elif path == '/export/products':
            limit = int(query.get('limit', [1000])[0])
            response_data = self.api.export_products_csv(limit)
            
        elif path == '/export/shipping_calculations':
            response_data = self.api.export_shipping_calculations_csv()
            
        elif path.startswith('/download/'):
            # CSV直接ダウンロード
            export_type = path.split('/')[-1]
            self._handle_csv_download(export_type, query)
            return
    '''
    
    csv_download_handler = '''
    def _handle_csv_download(self, export_type, query):
        """CSV直接ダウンロード処理"""
        try:
            if export_type == 'shipping_matrix':
                result = self.api.export_shipping_matrix_csv()
            elif export_type == 'products':
                limit = int(query.get('limit', [1000])[0])
                result = self.api.export_products_csv(limit)
            elif export_type == 'shipping_calculations':
                result = self.api.export_shipping_calculations_csv()
            else:
                self.send_response(404)
                self.end_headers()
                return
            
            if result['success']:
                # CSVファイルとしてダウンロード
                self.send_response(200)
                self.send_header('Content-Type', 'text/csv; charset=utf-8')
                self.send_header('Content-Disposition', f'attachment; filename="{result["filename"]}"')
                self._send_cors_headers()
                self.end_headers()
                
                # UTF-8 BOM付きで出力（Excel対応）
                csv_data = '\\ufeff' + result['csv_content']
                self.wfile.write(csv_data.encode('utf-8'))
            else:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                
                error_data = json.dumps({'error': result['error']})
                self.wfile.write(error_data.encode('utf-8'))
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self._send_cors_headers()
            self.end_headers()
            
            error_data = json.dumps({'error': str(e)})
            self.wfile.write(error_data.encode('utf-8'))
    '''
    
    return csv_endpoints, csv_download_handler

if __name__ == '__main__':
    print("CSV出力機能パッチ作成完了")
    print("統合するには以下の手順を実行してください：")
    print("1. integrated_api_server.py をバックアップ")
    print("2. CSV出力メソッドを IntegratedYahooEbayAPI クラスに追加")
    print("3. CSV出力エンドポイントを IntegratedAPIHandler クラスに追加")
    print("4. サーバーを再起動")
